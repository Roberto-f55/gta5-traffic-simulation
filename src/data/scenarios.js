// Lista de escenarios (scenarios/index.json): nombre, descripción, días,
// fecha de inicio, velocidad recomendada y archivos de cada día
import { loadText } from "./csv.js";

export async function loadScenarioIndex(folder) {
  const list = JSON.parse(await loadText(folder + "index.json"));
  for (const sc of list) {
    const [y, m, d] = sc.startDate.split("-").map(Number);
    sc.start = new Date(y, m - 1, d);
    sc.dayPaths = sc.files.map((f) => folder + sc.id + "/" + f);
  }
  console.log("Escenarios:", list.map((s) => s.name).join(", "));
  return list;
}
