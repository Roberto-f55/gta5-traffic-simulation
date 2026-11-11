// Ruta de un barco: rodea la isla por un anillo marítimo (sentido más corto)
import { gameToPlane } from "../coordinates.js";
import { buildRoute } from "./route.js";

// Puntos en mar abierto alrededor de la isla (coordenadas del juego)
const SEA_RING = [
  [-2613, -1914], [-3578, 17], [-3836, 1948], [-3385, 3493],
  [-2355, 4780], [-1325, 6260], [-424, 7097], [1378, 7000],
  [3630, 6260], [4531, 4522], [4531, 1948], [3695, -627],
  [2794, -2557], [1506, -3780], [-553, -3780], [-2484, -3265],
];

// Puertos metidos en canales: puntos para salir a mar abierto
const HARBOR_EXITS = {
  "Puerto Del Sol": [[-900, -1600], [-1000, -1700], [-1100, -1800], [-1200, -1900], [-1350, -1980]],
};

export function boatRoute(a, b) {
  const exitA = HARBOR_EXITS[a.name] || [];
  const exitB = (HARBOR_EXITS[b.name] || []).slice().reverse();
  const endA = exitA.length ? exitA[exitA.length - 1] : [a.x, a.y];
  const endB = exitB.length ? exitB[0] : [b.x, b.y];

  const i = nearestRingIndex(endA);
  const j = nearestRingIndex(endB);
  const n = SEA_RING.length;

  const clockwise = [];
  for (let k = i; ; k = (k + 1) % n) { clockwise.push(k); if (k === j) break; }
  const counterclockwise = [];
  for (let k = i; ; k = (k - 1 + n) % n) { counterclockwise.push(k); if (k === j) break; }

  const build = (indices) => [
    [a.x, a.y],
    ...exitA,
    ...indices.map((k) => SEA_RING[k]),
    ...exitB,
    [b.x, b.y],
  ];
  const r1 = build(clockwise);
  const r2 = build(counterclockwise);
  const best = pathLength(r1) < pathLength(r2) ? r1 : r2;

  return buildRoute(best.map(([x, y]) => gameToPlane(x, y, 0.02)));
}

function nearestRingIndex([x, y]) {
  let best = 0;
  let dmin = Infinity;
  SEA_RING.forEach(([rx, ry], k) => {
    const d = Math.hypot(rx - x, ry - y);
    if (d < dmin) { dmin = d; best = k; }
  });
  return best;
}

function pathLength(pts) {
  let L = 0;
  for (let k = 1; k < pts.length; k++)
    L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return L;
}
