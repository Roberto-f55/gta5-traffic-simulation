// =====================================================================
//  Paso de coordenadas del juego (metros) a coordenadas del plano 3D
//  La Z de cada punto es la altura del terreno en ese sitio + un margen
// =====================================================================
import * as THREE from "three";
import { MAP_BOUNDS, TERRAIN } from "./config.js";

// Tamaño del plano del mapa; se fija cuando se carga la textura
let planeWidth = 1;
let planeHeight = 1;
// Altura del terreno en metros para unas coordenadas del juego (0 = sin relieve)
let terrainHeight = () => 0;

export function setPlaneSize(width, height) {
  planeWidth = width;
  planeHeight = height;
}

export function setTerrainHeight(fn) {
  terrainHeight = fn;
}

// Dados los límites de un rango, mapea un valor a otro rango (como en los ejemplos)
export function Map2Range(val, vmin, vmax, dmin, dmax) {
  const t = 1 - (vmax - val) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

// Metros del juego -> unidades de three.js (en vertical, con la exageración)
export function metersToUnits(m) {
  const { minY, maxY } = MAP_BOUNDS;
  return (m * planeHeight) / (maxY - minY) * TERRAIN.exaggeration;
}

// Altura del suelo en unidades de three.js
export function groundZ(x, y) {
  return metersToUnits(terrainHeight(x, y));
}

// "lift" es cuánto se separa el punto del suelo (en unidades de three.js)
export function gameToPlane(x, y, lift = 0) {
  const { minX, maxX, minY, maxY } = MAP_BOUNDS;
  return new THREE.Vector3(
    Map2Range(x, minX, maxX, -planeWidth / 2, planeWidth / 2),
    Map2Range(y, minY, maxY, -planeHeight / 2, planeHeight / 2),
    groundZ(x, y) + lift
  );
}
