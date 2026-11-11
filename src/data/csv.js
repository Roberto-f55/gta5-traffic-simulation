// =====================================================================
//  Lectura genérica de archivos de texto y CSV
// =====================================================================

export function loadText(path) {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(path + ": " + response.statusText);
    return response.text();
  });
}

// Convierte un CSV (separador ;) en una lista de objetos usando la cabecera:
// "id;name\n1;LSIA"  ->  [{ id: "1", name: "LSIA" }]
export function parseCSV(text, sep = ";") {
  const rows = text.trim().split("\n");
  const header = rows[0].trim().split(sep);
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].trim().split(sep);
    if (cols.length < header.length) continue; // fila vacía o incompleta
    const obj = {};
    header.forEach((field, k) => (obj[field] = cols[k]));
    result.push(obj);
  }
  return result;
}
