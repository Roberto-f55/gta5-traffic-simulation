// Aeropuertos y puertos (places.csv): id;name;type;x;y
import { loadText, parseCSV } from "./csv.js";
import { gameToPlane } from "../coordinates.js";

export async function loadPlaces(path) {
  const rows = parseCSV(await loadText(path));
  const places = rows.map((r) => {
    const x = parseFloat(r.x);
    const y = parseFloat(r.y);
    const p = gameToPlane(x, y); // posición sobre el terreno (como latmap/longmap + altura)
    return { id: r.id, name: r.name, type: r.type, x, y, mx: p.x, my: p.y, mz: p.z };
  });
  console.log("Lugares cargados:", places.length);
  return places;
}
