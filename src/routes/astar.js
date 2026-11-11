// =====================================================================
//  A* con landmarks (ALT): camino de coste mínimo en la red de carreteras
//
//  El coste de cada tramo es su longitud ajustada (autopista más barata,
//  pista de tierra más cara). La heurística es la mayor de:
//    - la línea recta por 0.8 (el factor más barato, autopista)
//    - las cotas de los landmarks (ver landmarks.js)
//  Ambas nunca sobreestiman, así que la ruta encontrada es la óptima.
// =====================================================================
import { MinHeap } from "./minHeap.js";

// Arrays reutilizables entre búsquedas (más rápidos que Map)
let buffers = null;
function getBuffers(N) {
  if (!buffers || buffers.N !== N) {
    buffers = {
      N,
      stamp: 0,
      seen: new Int32Array(N), // búsqueda en la que se visitó el nodo
      cost: new Float64Array(N),
      prev: new Int32Array(N),
      prevEdge: new Int32Array(N),
      prevDir: new Int8Array(N),
    };
  }
  return buffers;
}

// Devuelve la lista de tramos { edge, dir } o null si no hay camino
export function astar(graph, start, goal) {
  if (start === goal) return [];
  const { nodes, neighbors, landmarks } = graph;
  const b = getBuffers(nodes.length);
  const stamp = ++b.stamp;

  const [gx, gy] = nodes[goal];
  const K = landmarks ? landmarks.K : 0;
  const LD = landmarks ? landmarks.dist : null;
  const goalLD = new Float64Array(K);
  for (let k = 0; k < K; k++) goalLD[k] = LD[goal * K + k];

  const h = (n) => {
    let best = 0.8 * Math.hypot(nodes[n][0] - gx, nodes[n][1] - gy);
    const base = n * K;
    for (let k = 0; k < K; k++) {
      const v = Math.abs(goalLD[k] - LD[base + k]);
      if (v > best) best = v;
    }
    return best;
  };

  b.seen[start] = stamp;
  b.cost[start] = 0;
  const open = new MinHeap();
  open.push(h(start), start);

  while (open.size > 0) {
    const [, u] = open.pop();
    if (u === goal) {
      const path = [];
      for (let n = goal; n !== start; n = b.prev[n]) path.push({ edge: b.prevEdge[n], dir: b.prevDir[n] });
      return path.reverse();
    }
    const cu = b.cost[u];
    for (const { to, cost, edge, dir } of neighbors[u]) {
      const next = cu + cost;
      if (b.seen[to] !== stamp || next < b.cost[to]) {
        b.seen[to] = stamp;
        b.cost[to] = next;
        b.prev[to] = u;
        b.prevEdge[to] = edge;
        b.prevDir[to] = dir;
        open.push(next + h(to), to);
      }
    }
  }
  return null;
}
