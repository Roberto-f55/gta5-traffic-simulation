// =====================================================================
//  Tráfico simulado en el mapa de GTA V (coches, aviones y barcos)
//  Punto de entrada: crea la escena, carga los datos y arranca el bucle
// =====================================================================
import { FILES } from "./config.js";
import { createScene, loadMap } from "./scene/setup.js";
import { createPlaceMarkers, createParkingCloud, applyMode } from "./scene/markers.js";
import { createUI } from "./ui.js";
import { loadPlaces } from "./data/places.js";
import { loadParking } from "./data/parking.js";
import { loadGraph } from "./data/graph.js";
import { loadScenarioIndex } from "./data/scenarios.js";
import { Simulation } from "./simulation.js";

const state = { mode: "all", speed: 0.25, showLines: true };
let terrain = null; // malla del terreno
let data = null; // { places, parking, graph, scenarios }
let markers = [];
let parkingCloud = null;
let simulation = null;
let ui = null;

const { scene, camera, renderer, controls } = createScene();

animate();
init().catch((error) => console.error("Error al cargar datos:", error));

// El mapa va primero: hace falta su tamaño para colocar todo lo demás
async function init() {
  terrain = await loadMap(scene, FILES.map, FILES.heightmap);

  const places = await loadPlaces(FILES.places);
  markers = createPlaceMarkers(scene, places);

  const parking = await loadParking(FILES.parking);
  parkingCloud = createParkingCloud(scene, parking);

  const graph = await loadGraph(FILES.roadGraph);
  const scenarios = await loadScenarioIndex(FILES.scenarios);
  data = { places, parking, graph, scenarios };

  ui = createUI({
    scenarios,
    onScenario: (id) => startScenario(id),
    onMode: (mode) => {
      state.mode = mode;
      applyMode(mode, markers, parkingCloud);
    },
    onSpeed: (speed) => (state.speed = speed),
    onLines: (show) => (state.showLines = show),
    // Ver los triángulos del terreno, como el wireframe de script_21
    onWireframe: (on) => (terrain.material.wireframe = on),
  });

  applyMode(state.mode, markers, parkingCloud);
  startScenario(scenarios[0].id);
}

function startScenario(id) {
  const scenario = data.scenarios.find((s) => s.id === id);
  if (simulation) simulation.dispose();
  simulation = new Simulation(scene, scenario, data.places, data.parking, data.graph);

  // Cada escenario trae su velocidad recomendada
  state.speed = scenario.speed;
  ui.setSpeed(scenario.speed);
  ui.setScenario(scenario);
}

// Texto superior: fecha simulada + día + vehículos en marcha
const DATE_FORMAT = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };

function animate() {
  requestAnimationFrame(animate);

  if (simulation) {
    // Al terminar el escenario vuelve a empezar
    if (simulation.finished) startScenario(simulation.scenario.id);

    simulation.advanceClock(state.speed);
    const c = simulation.update(state.mode, state.showLines);
    const day = `Día ${Math.min(simulation.dayIndex + 1, simulation.scenario.days)}/${simulation.scenario.days}`;
    ui.setInfo(
      simulation.now.toLocaleString("es-ES", DATE_FORMAT) +
        ` · ${day}` +
        (simulation.loading ? " · cargando datos..." : "") +
        ` · 🚗 ${c.car} · ✈️ ${c.plane} · 🚤 ${c.boat}`
    );
  }

  controls.update();
  renderer.render(scene, camera);
}
