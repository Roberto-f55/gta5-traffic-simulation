// =====================================================================
//  Simulación de un escenario: reloj + viajes + vehículos en la escena
//  (equivalente a actualizarFecha + filtraparadasActivas de script_25)
//
//  - Los días del escenario se cargan según avanza el reloj (el actual
//    y el siguiente), así un mes entero no se descarga de golpe.
//  - Los viajes esperan ordenados por hora de salida en "pending" y pasan
//    a "active" al salir; al llegar se descartan. Así en cada fotograma
//    solo se miran los viajes en marcha, no todos los del escenario.
//  - Las rutas de coche se calculan con un tiempo máximo por fotograma,
//    adelantando las de los coches que van a salir pronto.
// =====================================================================
import * as THREE from "three";
import { START_MINUTE, ROUTE_TIME_BUDGET_MS, ROUTE_LOOKAHEAD_MINUTES } from "./config.js";
import { loadTrips } from "./data/trips.js";
import { positionOnRoute } from "./routes/route.js";
import { carRoute } from "./routes/car.js";
import { planeRoute } from "./routes/plane.js";
import { boatRoute } from "./routes/boat.js";
import { VehicleFleet } from "./vehicles/models.js";

const MINUTE = 60000;
const TYPES = ["car", "plane", "boat"];

export class Simulation {
  constructor(scene, scenario, places, parking, graph) {
    this.scene = scene;
    this.scenario = scenario;
    this.places = places;
    this.parking = parking;
    this.graph = graph;

    this.minutes = START_MINUTE;
    this.totalMinutes = scenario.days * 24 * 60;
    this.now = this.dateAt(this.minutes);
    this.finished = false;

    this.pending = []; // viajes cargados que aún no han salido (ordenados por salida)
    this.next = 0; // primer viaje de "pending" que aún no ha salido
    this.active = []; // viajes en marcha
    this.days = []; // estado de carga de cada día: undefined | "loading" | "loaded"

    this.fleets = Object.fromEntries(TYPES.map((t) => [t, new VehicleFleet(scene, t)]));
    this.lines = null;
    this.linesDirty = true;
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.pos = new THREE.Vector3();
    this.dir = new THREE.Vector3();

    this.ensureDays();
  }

  dateAt(minutes) {
    return new Date(this.scenario.start.getTime() + minutes * MINUTE);
  }

  get dayIndex() {
    return Math.floor(this.minutes / (24 * 60));
  }

  // ¿Está cargado el día en el que estamos? Si no, el reloj espera
  get loading() {
    return this.days[this.dayIndex] !== "loaded";
  }

  // Carga el día actual y el siguiente (en orden, para que "pending" siga ordenado)
  ensureDays() {
    const want = Math.min(this.dayIndex + 1, this.scenario.days - 1);
    for (let d = 0; d <= want; d++) {
      if (this.days[d]) continue;
      if (d > 0 && this.days[d - 1] !== "loaded") return; // espera al anterior
      this.days[d] = "loading";
      loadTrips(this.scenario.dayPaths[d], this.places, this.parking)
        .then((trips) => {
          // Aviones y barcos: pocos, su ruta se calcula al cargar el día
          for (const t of trips) {
            if (t.type === "plane") t.route = planeRoute(t.origin, t.destination);
            else if (t.type === "boat") t.route = boatRoute(t.origin, t.destination);
          }
          this.pending.push(...trips);
          this.days[d] = "loaded";
          console.log(`${this.scenario.name}: día ${d + 1} cargado (${trips.length} viajes)`);
          this.ensureDays();
        })
        .catch((e) => console.error("Error al cargar el día", d + 1, e));
      return;
    }
  }

  advanceClock(minutes) {
    if (this.loading || this.finished) return;
    this.minutes = Math.min(this.minutes + minutes, this.totalMinutes);
    this.now = this.dateAt(this.minutes);
    if (this.minutes >= this.totalMinutes) this.finished = true;
    this.ensureDays();
  }

  // Actualiza viajes y vehículos. Devuelve cuántos vehículos hay de cada tipo
  update(mode, showLines) {
    const now = this.now;

    // 1. Salen los viajes cuya hora ha llegado
    while (this.next < this.pending.length && this.pending[this.next].start <= now) {
      this.active.push(this.pending[this.next++]);
      this.linesDirty = true;
    }
    // De vez en cuando se descarta lo ya procesado de "pending" (libera memoria)
    if (this.next > 20000) {
      this.pending = this.pending.slice(this.next);
      this.next = 0;
    }

    // 2. Se retiran los que han llegado (y se libera la ruta del coche)
    const before = this.active.length;
    this.active = this.active.filter((t) => {
      if (t.end >= now) return true;
      if (t.type === "car") t.route = null;
      return false;
    });
    if (this.active.length !== before) this.linesDirty = true;

    // 3. Rutas de coche pendientes, con tiempo limitado
    this.computeRoutes();

    // 4. Coloca los vehículos visibles
    const counts = { car: 0, plane: 0, boat: 0 };
    for (const t of TYPES) this.fleets[t].begin();
    for (const trip of this.active) {
      if (!trip.route) continue; // coche cuya ruta aún no está lista
      if (mode !== "all" && trip.type !== mode) continue;
      const duration = Math.max(trip.end - trip.start, MINUTE);
      const progress = Math.min(1, Math.max(0, (now - trip.start) / duration));
      positionOnRoute(trip.route, progress, this.pos, this.dir);
      this.fleets[trip.type].add(this.pos, this.dir);
      counts[trip.type]++;
    }
    for (const t of TYPES) this.fleets[t].end();

    // 5. Líneas de las rutas (solo se rehacen si algo ha cambiado)
    if (mode !== this.linesMode || showLines !== this.linesShown) this.linesDirty = true;
    if (this.linesDirty) this.drawLines(mode, showLines);

    return counts;
  }

  // Calcula rutas de coche hasta agotar el tiempo del fotograma:
  // primero las de coches ya en marcha y luego las de los que salen pronto
  computeRoutes() {
    const t0 = performance.now();
    const outOfTime = () => performance.now() - t0 > ROUTE_TIME_BUDGET_MS;

    for (const trip of this.active) {
      if (trip.type !== "car" || trip.route) continue;
      if (outOfTime()) return;
      trip.route = carRoute(this.graph, trip.origin, trip.destination);
      this.linesDirty = true;
    }

    const horizon = this.now.getTime() + ROUTE_LOOKAHEAD_MINUTES * MINUTE;
    for (let i = this.next; i < this.pending.length; i++) {
      const trip = this.pending[i];
      if (trip.start.getTime() > horizon) break;
      if (trip.type !== "car" || trip.route) continue;
      if (outOfTime()) return;
      trip.route = carRoute(this.graph, trip.origin, trip.destination);
    }
  }

  drawLines(mode, showLines) {
    this.linesDirty = false;
    this.linesMode = mode;
    this.linesShown = showLines;
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
      this.lines = null;
    }
    if (!showLines) return;

    // Cuenta primero cuántos segmentos hay para reservar el array de una vez
    let segments = 0;
    for (const trip of this.active)
      if (trip.route && (mode === "all" || trip.type === mode)) segments += trip.route.points.length - 1;

    const positions = new Float32Array(segments * 6);
    let i = 0;
    for (const trip of this.active) {
      if (!trip.route || (mode !== "all" && trip.type !== mode)) continue;
      const pts = trip.route.points;
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        positions[i++] = a.x; positions[i++] = a.y; positions[i++] = a.z;
        positions[i++] = b.x; positions[i++] = b.y; positions[i++] = b.z;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.lines = new THREE.LineSegments(geometry, this.lineMaterial);
    this.scene.add(this.lines);
  }

  // Quita de la escena todo lo de esta simulación (al cambiar de escenario)
  dispose() {
    for (const t of TYPES) this.fleets[t].dispose();
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
    }
    this.lineMaterial.dispose();
    this.pending = [];
    this.active = [];
  }
}
