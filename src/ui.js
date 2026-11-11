// =====================================================================
//  Interfaz HTML: fecha arriba + panel con escenario, modo, velocidad
//  y líneas de las rutas (los textos que ve el usuario, en español)
// =====================================================================

const PANEL_STYLE = {
  position: "absolute",
  color: "#fff",
  fontFamily: "Monospace",
  backgroundColor: "rgba(0,0,0,0.65)",
  zIndex: "1",
};

// Callbacks: onScenario(id), onMode(mode), onSpeed(value), onLines(bool), onWireframe(bool)
// Devuelve funciones para actualizar la interfaz desde fuera
export function createUI({ scenarios, onScenario, onMode, onSpeed, onLines, onWireframe }) {
  const info = document.createElement("div");
  Object.assign(info.style, PANEL_STYLE, {
    top: "20px",
    width: "100%",
    textAlign: "center",
    fontWeight: "bold",
  });
  document.body.appendChild(info);

  const panel = document.createElement("div");
  Object.assign(panel.style, PANEL_STYLE, { top: "60px", left: "20px", padding: "8px", maxWidth: "320px" });
  panel.innerHTML = `
    <label>Escenario: <select id="scenario">
      ${scenarios.map((s) => `<option value="${s.id}">${s.name} (${s.days} días)</option>`).join("")}
    </select></label>
    <div id="description" style="font-size:11px;opacity:0.8;margin:6px 0 10px"></div>
    <label>Ver: <select id="mode">
      <option value="all">Todo</option>
      <option value="car">Coches</option>
      <option value="plane">Aviones</option>
      <option value="boat">Barcos</option>
    </select></label><br><br>
    <label>Velocidad: <input id="speed" type="range" min="0.05" max="2" step="0.05"></label><br><br>
    <label><input id="lines" type="checkbox" checked> Mostrar rutas</label><br>
    <label><input id="wireframe" type="checkbox"> Ver malla del terreno</label>`;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector("#" + id);
  $("scenario").addEventListener("change", (e) => onScenario(e.target.value));
  $("mode").addEventListener("change", (e) => onMode(e.target.value));
  $("speed").addEventListener("input", (e) => onSpeed(parseFloat(e.target.value)));
  $("lines").addEventListener("change", (e) => onLines(e.target.checked));
  $("wireframe").addEventListener("change", (e) => onWireframe(e.target.checked));

  return {
    setInfo: (text) => (info.innerHTML = text),
    setScenario: (scenario) => {
      $("scenario").value = scenario.id;
      $("description").textContent = scenario.description;
    },
    setSpeed: (value) => ($("speed").value = value),
  };
}
