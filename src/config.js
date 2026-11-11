// =====================================================================
//  Configuración: todos los "números mágicos" del proyecto en un sitio
// =====================================================================

// Rutas de los archivos (relativas a index.html)
export const FILES = {
  map: "assets/img/gta5_atlas_2048.jpg",
  heightmap: "assets/img/gta5_heightmap_1024.png", // mapa de alturas en grises, mismo encuadre que el atlas
  places: "assets/data/places.csv",
  parking: "assets/data/parking.csv",
  roadGraph: "assets/data/road_graph.json",
  scenarios: "assets/data/scenarios/", // index.json + una carpeta por escenario
};

// Límites del mapa en coordenadas del juego (metros).
// Calibrados con nodes.json sobre gta5_atlas_2048.jpg
// (equivalen a minlon/maxlon/minlat/maxlat de los ejemplos)
export const MAP_BOUNDS = { minX: -5702, maxX: 6733, minY: -4051, maxY: 8384 };

// Alto del plano del mapa en unidades de three.js
export const MAP_SCALE = 5;

// Relieve (como script_21_terreno, pero con el mapa de alturas de GTA V)
export const TERRAIN = {
  maxHeight: 672.7, // metros que corresponden al blanco (255) del mapa de alturas
  exaggeration: 2, // multiplica las alturas para que el relieve se aprecie mejor
  segments: 512, // divisiones del plano en cada eje (más = más detalle y más triángulos)
};

export const COLORS = {
  car: 0xff3b30,
  plane: 0xffcc00,
  boat: 0x0050ff,
  airport: 0xff9800,
  port: 0x00bcd4,
};

// Tiempo simulado
// (la fecha de inicio y la velocidad recomendada vienen de cada escenario)
export const START_MINUTE = 360; // la simulación empieza a las 6:00 del primer día

// Rendimiento
export const ROUTE_TIME_BUDGET_MS = 6; // ms por fotograma dedicados a calcular rutas de coche
export const ROUTE_LOOKAHEAD_MINUTES = 20; // se adelantan las rutas de los coches que salen pronto
export const LANDMARKS = 16; // puntos de referencia para acelerar A* (algoritmo ALT)

// Tamaño de los modelos 3D de los vehículos
export const VEHICLE_SCALE = 1;
