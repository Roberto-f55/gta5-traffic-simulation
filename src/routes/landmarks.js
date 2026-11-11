// =====================================================================
//  Puntos de referencia ("landmarks") para acelerar A*  (algoritmo ALT)
//
//  Se eligen K nodos repartidos por los bordes de la red y se calcula la
//  distancia de cada uno a todos los nodos (un Dijkstra por landmark).
//  Por la desigualdad triangular, para cualquier landmark L:
//      distancia(n, destino) >= |d(L, destino) - d(L, n)|
//  Eso da una estimación mucho mejor que la línea recta, así que A*
//  explora muchos menos nodos y la ruta sigue siendo la óptima.
// =====================================================================
import { MinHeap } from "./minHeap.js";

function dijkstraFrom(graph, source) {
  const N = graph.nodes.length;
  const dist = new Float64Array(N).fill(Infinity);
  dist[source] = 0;
  const open = new MinHeap();
  open.push(0, source);
  while (open.size > 0) {
    const [d, u] = open.pop();
    if (d > dist[u]) continue;
    for (const { to, cost } of graph.neighbors[u]) {
      const nd = d + cost;
      if (nd < dist[to]) {
        dist[to] = nd;
        open.push(nd, to);
      }
    }
  }
  return dist;
}

// Devuelve { K, dist } con dist[n * K + k] = distancia del landmark k al nodo n
export function computeLandmarks(graph, K) {
  const N = graph.nodes.length;
  const perLandmark = [];
  const minDist = new Float64Array(N).fill(Infinity);

  // Primer landmark: el nodo más lejano a uno cualquiera; los siguientes,
  // el nodo más lejano a todos los ya elegidos (quedan repartidos por los bordes)
  const d0 = dijkstraFrom(graph, 0);
  let next = farthest(d0);
  for (let k = 0; k < K; k++) {
    const d = dijkstraFrom(graph, next);
    perLandmark.push(d);
    for (let i = 0; i < N; i++) if (d[i] < minDist[i]) minDist[i] = d[i];
    next = farthest(minDist);
  }

  const dist = new Float64Array(N * K);
  for (let n = 0; n < N; n++) for (let k = 0; k < K; k++) dist[n * K + k] = perLandmark[k][n];
  return { K, dist };
}

function farthest(dist) {
  let best = 0;
  for (let i = 0; i < dist.length; i++)
    if (dist[i] < Infinity && dist[i] > (dist[best] < Infinity ? dist[best] : -1)) best = i;
  return best;
}
