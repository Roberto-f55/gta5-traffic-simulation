// =====================================================================
//  Terreno en 3D a partir del mapa de alturas de GTA V
//
//  Es la misma idea que script_21_terreno.js: un plano con muchas
//  divisiones y una imagen en grises donde blanco = alto y negro = bajo.
//  La diferencia es que aquí las alturas se aplican desde JavaScript
//  (moviendo los vértices) en lugar de con material.displacementMap:
//    - así el resto del código puede preguntar la altura de cualquier
//      punto (para poner coches, barcos y aviones sobre el terreno)
//    - y se pueden recalcular las normales, para que la luz marque
//      las laderas (con displacementMap el relieve solo se ve de perfil)
// =====================================================================
import * as THREE from "three";
import { MAP_BOUNDS, TERRAIN } from "../config.js";
import { metersToUnits } from "../coordinates.js";

// Carga la imagen y devuelve una función altura(x, y) en metros del juego
export function loadHeightmap(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Se dibuja en un canvas para poder leer el valor de cada píxel
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data; // RGBA
      resolve(createSampler(pixels, img.width, img.height));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function createSampler(pixels, w, h) {
  const { minX, maxX, minY, maxY } = MAP_BOUNDS;
  const gray = (px, py) => pixels[(py * w + px) * 4]; // canal rojo (es una imagen en grises)

  // Interpolación bilineal entre los 4 píxeles vecinos (sin escalones)
  return (x, y) => {
    const fx = ((x - minX) / (maxX - minX)) * w - 0.5;
    const fy = ((maxY - y) / (maxY - minY)) * h - 0.5;
    const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx)));
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const tx = Math.min(1, Math.max(0, fx - x0));
    const ty = Math.min(1, Math.max(0, fy - y0));
    const top = gray(x0, y0) * (1 - tx) + gray(x1, y0) * tx;
    const bottom = gray(x0, y1) * (1 - tx) + gray(x1, y1) * tx;
    return ((top * (1 - ty) + bottom * ty) / 255) * TERRAIN.maxHeight;
  };
}

// Crea la malla del terreno: plano subdividido con la altura en cada vértice
export function createTerrain(scene, texture, width, height, heightAt) {
  const geometry = new THREE.PlaneGeometry(width, height, TERRAIN.segments, TERRAIN.segments);
  const pos = geometry.attributes.position;
  const { minX, maxX, minY, maxY } = MAP_BOUNDS;
  for (let i = 0; i < pos.count; i++) {
    // Vértice del plano (-width/2..width/2) -> coordenadas del juego
    const gx = minX + (pos.getX(i) / width + 0.5) * (maxX - minX);
    const gy = minY + (pos.getY(i) / height + 0.5) * (maxY - minY);
    pos.setZ(i, metersToUnits(heightAt(gx, gy)));
  }
  geometry.computeVertexNormals(); // para que la luz marque las pendientes

  const material = new THREE.MeshLambertMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
}
