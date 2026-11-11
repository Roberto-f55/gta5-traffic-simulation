// Un día de viajes simulados (scenarios/<id>/dayNN.csv):
//   Start;End;Minutes;Origin;Destination;Type
//   car         -> Origin/Destination son ids de aparcamiento (P1234)
//   plane/boat  -> Origin/Destination son nombres de lugares
import { loadText, parseCSV } from "./csv.js";

export async function loadTrips(path, places, parking) {
  const rows = parseCSV(await loadText(path));

  const norm = (s) => s.trim().toLowerCase();
  const placeByName = new Map(places.map((p) => [norm(p.name), p]));

  const trips = [];
  for (const r of rows) {
    const type = r.Type;
    const find = type === "car" ? (id) => parking.get(id.trim()) : (name) => placeByName.get(norm(name));
    const origin = find(r.Origin);
    const destination = find(r.Destination);
    if (!origin || !destination) continue;

    trips.push({
      start: parseDate(r.Start),
      end: parseDate(r.End),
      origin,
      destination,
      type,
      route: null, // se calcula después (ver simulation.js)
    });
  }
  return trips;
}

// DD/MM/YYYY HH:mm -> Date
function parseDate(str) {
  const [date, time] = str.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}
