// =====================================================================
//  Utilidades comunes de rutas: una ruta es una lista de THREE.Vector3
//  con longitudes acumuladas para moverse a velocidad constante
// =====================================================================

export function buildRoute(points) {
  const cumulative = [0];
  for (let k = 1; k < points.length; k++)
    cumulative.push(cumulative[k - 1] + points[k].distanceTo(points[k - 1]));
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

// Posición en la ruta para t entre 0 y 1.
// Si se pasa "dir", también devuelve ahí la dirección del tramo actual
export function positionOnRoute(route, t, target, dir) {
  const goal = t * route.length;
  let k = 1;
  while (k < route.cumulative.length - 1 && route.cumulative[k] < goal) k++;
  const segment = route.cumulative[k] - route.cumulative[k - 1] || 1;
  const u = (goal - route.cumulative[k - 1]) / segment;
  if (dir) dir.subVectors(route.points[k], route.points[k - 1]);
  return target.copy(route.points[k - 1]).lerp(route.points[k], u);
}
