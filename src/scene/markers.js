// =====================================================================
//  Elementos fijos sobre el mapa: lugares y nube de aparcamientos
// =====================================================================
import * as THREE from "three";
import { COLORS } from "../config.js";
import { gameToPlane } from "../coordinates.js";

// Qué tipos de lugar se ven en cada modo
const PLACES_BY_MODE = {
  all: ["airport", "port"],
  car: [],
  plane: ["airport"],
  boat: ["port"],
};

export function createPlaceMarkers(scene, places) {
  const geometry = new THREE.SphereGeometry(0.035, 12, 12);
  return places.map((place) => {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: COLORS[place.type] }));
    m.position.set(place.mx, place.my, place.mz + 0.01);
    m.userData = { type: place.type, name: place.name };
    scene.add(m);
    return m;
  });
}

// Todos los aparcamientos como una sola nube de puntos (barata de dibujar)
export function createParkingCloud(scene, parking) {
  const pos = [];
  for (const { x, y } of parking.values()) {
    const v = gameToPlane(x, y, 0.005);
    pos.push(v.x, v.y, v.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x333333, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.35 })
  );
  scene.add(cloud);
  return cloud;
}

// Muestra solo los marcadores relacionados con el modo elegido
export function applyMode(mode, markers, parkingCloud) {
  for (const m of markers) m.visible = PLACES_BY_MODE[mode].includes(m.userData.type);
  if (parkingCloud) parkingCloud.visible = mode === "all" || mode === "car";
}
