// Red de carreteras reducida a partir de nodes.json (road_graph.json)
//   nodes: [x0, y0, x1, y1, ...]
//   edges: [a, b, coste, longitud, [x, y, x, y, ...puntos intermedios]]
import { loadText } from "./csv.js";
import { computeLandmarks } from "../routes/landmarks.js";
import { LANDMARKS } from "../config.js";

export async function loadGraph(path) {
  const g = JSON.parse(await loadText(path));

  const nodes = [];
  for (let i = 0; i < g.nodes.length; i += 2) nodes.push([g.nodes[i], g.nodes[i + 1]]);

  // Lista de adyacencia: neighbors[i] = [{ to, cost, edge, dir }]
  // dir = 1 si se recorre el tramo de a a b, -1 si de b a a
  const neighbors = nodes.map(() => []);
  g.edges.forEach(([a, b, cost], k) => {
    neighbors[a].push({ to: b, cost, edge: k, dir: 1 });
    neighbors[b].push({ to: a, cost, edge: k, dir: -1 });
  });

  const graph = { nodes, edges: g.edges, neighbors };

  // Precálculo para que A* vaya mucho más rápido (unos 100 ms, una sola vez)
  const t0 = performance.now();
  graph.landmarks = computeLandmarks(graph, LANDMARKS);
  console.log("Grafo cargado:", nodes.length, "nodos,", g.edges.length, "tramos;",
    LANDMARKS, "landmarks en", Math.round(performance.now() - t0), "ms");
  return graph;
}
