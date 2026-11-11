// Aparcamientos reales del juego (puntos de aparición de coches, v-cargens)
// parking.csv: id;x;y;node;models   (node = cruce de la red más cercano)
import { loadText, parseCSV } from "./csv.js";

export async function loadParking(path) {
  const rows = parseCSV(await loadText(path));
  const parking = new Map();
  for (const r of rows) {
    parking.set(r.id, {
      id: r.id,
      x: parseFloat(r.x),
      y: parseFloat(r.y),
      node: parseInt(r.node),
    });
  }
  console.log("Aparcamientos cargados:", parking.size);
  return parking;
}
