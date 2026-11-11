// Ruta de un avión: arco que despega, sube y aterriza.
// Sale y llega a la altura del terreno de cada aeropuerto y nunca
// pasa por debajo del relieve (las montañas del norte son altas).
import * as THREE from "three";
import { buildRoute } from "./route.js";
import { groundZ } from "../coordinates.js";

const CLEARANCE = 0.06; // separación mínima con el suelo durante el vuelo

export function planeRoute(a, b) {
  const points = [];
  const n = 40;
  const dist = Math.hypot(b.mx - a.mx, b.my - a.my);
  const maxHeight = Math.min(0.6, 0.15 + dist * 0.15);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const arc = maxHeight * Math.sin(Math.PI * u);
    const base = a.mz + (b.mz - a.mz) * u + 0.02; // de la pista de salida a la de llegada
    // Coordenadas del juego de este punto, para mirar la altura del suelo debajo
    const ground = groundZ(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    const safe = i === 0 || i === n ? base : Math.max(base + arc, ground + CLEARANCE);
    points.push(new THREE.Vector3(a.mx + (b.mx - a.mx) * u, a.my + (b.my - a.my) * u, safe));
  }
  return buildRoute(points);
}
