// Ruta de un coche: camino más corto por la red de carreteras real
import { gameToPlane } from "../coordinates.js";
import { buildRoute } from "./route.js";
import { astar } from "./astar.js";

export function carRoute(graph, a, b) {
  const path = astar(graph, a.node, b.node);
  const points = [[a.x, a.y]];
  if (path) {
    points.push(graph.nodes[a.node]);
    for (const { edge, dir } of path) {
      const [na, nb, , , inner] = graph.edges[edge];
      const segment = [];
      for (let k = 0; k < inner.length; k += 2) segment.push([inner[k], inner[k + 1]]);
      if (dir === -1) segment.reverse();
      points.push(...segment, graph.nodes[dir === 1 ? nb : na]);
    }
  }
  points.push([b.x, b.y]);
  return buildRoute(densify(points, STEP).map(([x, y]) => gameToPlane(x, y, LIFT)));
}

// Altura sobre el suelo de coches y líneas, y distancia máxima entre puntos (metros)
const LIFT = 0.01;
const STEP = 40;

// Añade puntos intermedios en los tramos largos: si una recta cruza una
// colina y solo tenemos sus extremos, la línea iría por dentro del terreno
function densify(points, step) {
  const out = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const [x0, y0] = points[k - 1];
    const [x1, y1] = points[k];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step);
    for (let i = 1; i < n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    out.push(points[k]);
  }
  return out;
}
