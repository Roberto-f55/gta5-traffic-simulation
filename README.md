# Tráfico simulado en GTA V con Three.js

Visualización 3D interactiva del mapa completo de **Grand Theft Auto V** desarrollada con **Three.js**. Sobre el mapa del juego, con relieve, se simula la circulación de **coches, aviones y barcos** a lo largo de varios días, con **tres escenarios** de tráfico seleccionables desde la interfaz.

Los coches parten de aparcamientos reales del juego y circulan por su red de carreteras real siguiendo la ruta más corta. Los aviones vuelan entre aeropuertos y los barcos navegan entre puertos rodeando la isla.

- **Autor:** Roberto Rodríguez Guillén
- **Demo (CodeSandbox):** https://codesandbox.io/p/sandbox/ptrpjs-phlrmd
- **Vídeo de captura:** https://youtu.be/8Sb5f9hz0aI

---

## 1. Descripción del trabajo realizado

### Idea

El proyecto visualiza datos geográficos abiertos sobre un mapa. En lugar de una ciudad real, se utiliza la geografía de **Los Santos y Blaine County**, el mundo de GTA V. La comunidad de este juego lleva años extrayendo y publicando sus datos en repositorios abiertos: mapas, red de carreteras, puntos de aparición de vehículos y alturas del terreno.

La visualización combina tres elementos: un **mapa** como textura sobre un terreno en relieve, unos **lugares** con coordenadas (aeropuertos, puertos y aparcamientos) y unos **viajes** con hora de salida, hora de llegada, origen y destino, que se reproducen en el tiempo.

### Datos: qué es real y qué es simulado

| Dato | Contenido | Origen |
|---|---|---|
| **Mapa atlas** | Mapa del juego en estilo atlas (el del menú de pausa) | **Real.** Teselas de CreepPork/GTAV-Maps, unidas en una sola imagen de 2048 × 2048 |
| **Red de carreteras** | 67.454 nodos con posición, altura, conexiones, carriles y tipo de vía (autopista, tierra, cruce...) | **Real.** `nodes.json` de DurtyFree/gta-v-data-dumps, extraído de los archivos del juego |
| **Aparcamientos** | 9.657 puntos donde el juego hace aparecer coches | **Real.** root-cause/v-cargens |
| **Mapa de alturas** | Imagen en grises del relieve de la isla | **Real.** meshiest/heightmap2brs (licencia MIT) |
| **Aeropuertos y puertos** | 4 aeropuertos y 6 puertos | Lugares reales del juego, con coordenadas situadas a mano y comprobadas sobre el mapa |
| **Viajes** | Hora de salida y llegada, origen, destino y tipo de vehículo | **Simulados** (ver "Escenarios") |

GTA V no dispone de un registro de tráfico real: lo que la comunidad ha recopilado son los **caminos y ubicaciones**, no los viajes. Por eso el **escenario** (mapa, carreteras, aparcamientos y relieve) es real y la **actividad** que circula por él es simulada. Aun así, la simulación se apoya en esos datos reales: cada coche va de un aparcamiento real a otro por la red de carreteras real, y la duración del viaje se obtiene de la longitud real de su ruta.

### Preparación de los datos

Los datos originales no estaban listos para usarse en el navegador. Se prepararon con Python en varios pasos:

- **Calibración del mapa.** Las coordenadas del juego son X/Y en metros, no latitud/longitud, y la imagen del atlas no incluye coordenadas. Los límites del mapa se calcularon buscando la escala y el desplazamiento con los que más nodos de carretera caen sobre carreteras de la imagen: el 65 % de los nodos, frente a un 7 % si se colocaran al azar.
- **Red de carreteras reducida.** Los 147 MB de `nodes.json` se transformaron en un grafo de 13.111 nodos y 17.793 tramos. Solo se conservan los cruces y los aparcamientos, y los puntos intermedios de cada tramo se guardan como una línea simplificada.
- **Aparcamientos.** De los 9.984 puntos de aparición se conservaron los 9.657 situados a menos de 40 m de una carretera. Cada uno queda enlazado con su nodo más cercano.
- **Mapa de alturas.** Tampoco incluía coordenadas. Se situó buscando la posición y escala en la que sus grises coinciden con la altura real de los nodos de carretera (correlación de 0,988 y error típico de unos 5 m), y se recortó al mismo encuadre que el atlas. El negro corresponde al mar y el blanco a 673 m.

### Escenarios

| Escenario | Días | Tráfico diario | Descripción |
|---|---|---|---|
| **Mes normal** | 22 | 10.000 coches, 36 aviones, 45 barcos | Tráfico cotidiano con horas punta por la mañana y por la tarde |
| **Tráfico intenso** | 3 | 30.000 coches, 150 aviones, 120 barcos | El triple de actividad |
| **Evacuación de Los Santos** | 2 | 15.000 coches, 300 aviones, 120 barcos | Día 1: la población abandona la ciudad hacia el norte, con atascos (coches más lentos). Día 2: regreso |

Los viajes se generan con `tools/generate_scenarios.py` a partir de los datos reales del propio proyecto:

- Las salidas se reparten a lo largo del día según una curva de actividad con horas punta.
- En los escenarios normales, el destino de cada coche se elige con más probabilidad cerca de su origen, ya que la mayoría de los trayectos son locales.
- Para cada viaje en coche se calcula la ruta más corta por carretera (Dijkstra). Su duración se obtiene de esa longitud y de una velocidad aleatoria: entre 40 y 70 km/h, o entre 20 y 40 km/h en la evacuación.
- Los aviones van en línea recta a 180-260 km/h, más unos minutos de despegue y aterrizaje. Los barcos rodean la isla a 25-45 km/h.

Cada escenario guarda un CSV por día (`Start;End;Minutes;Origin;Destination;Type`). En el navegador solo se descarga el día en curso y el siguiente, de modo que el escenario completo nunca se carga de golpe.

### Contenido de la escena

| Elemento | Detalle |
|---|---|
| **Terreno** | Plano subdividido en 512 × 512 con la textura del atlas y la altura de cada vértice tomada del mapa de alturas (exagerada ×2 para que se aprecie). Usa `MeshLambertMaterial` para que la luz marque las laderas. |
| **Aeropuertos y puertos** | Esferas naranjas (aeropuertos) y cian (puertos) sobre el terreno. |
| **Aparcamientos** | Los 9.657 puntos, como una única nube de puntos (`THREE.Points`) tenue. |
| **Coches** | Modelo construido con primitivas (carrocería, cabina y cuatro ruedas) que sigue la carretera y se inclina en las cuestas. |
| **Aviones** | Modelo con fuselaje, morro, alas y cola. Vuelan en arco, despegan y aterrizan a la altura de cada aeropuerto y nunca pasan por debajo de las montañas. |
| **Barcos** | Casco con proa en punta (`ExtrudeGeometry`), puente y chimenea. Navegan por una ruta marítima alrededor de la isla y salen de Puerto Del Sol por su canal. |
| **Rutas** | Líneas negras semitransparentes con el recorrido completo de cada vehículo en marcha. Se pueden ocultar. |

Todos los vehículos se orientan según la dirección de su tramo de ruta, tanto en rumbo como en inclinación.

### Terreno en 3D

El terreno es un plano con muchas divisiones y una imagen en grises que actúa como mapa de alturas: el blanco es alto y el negro, bajo. Las alturas se aplican **desde JavaScript, desplazando los vértices**, en lugar de con `material.displacementMap`, por dos motivos:

- El resto del código necesita conocer la altura de cualquier punto para colocar coches, barcos, aviones, marcadores y líneas sobre el terreno. Con `displacementMap` esa altura solo existe en la tarjeta gráfica.
- Permite recalcular las normales (`computeVertexNormals`) para que la luz marque las pendientes. Con `displacementMap` el relieve solo se aprecia de perfil o en modo malla.

La casilla **"Ver malla del terreno"** activa `wireframe` para mostrar los triángulos.

### Rutas de los coches: A* con landmarks

Las rutas de coche se calculan en el navegador en el momento en que el coche arranca, con **A\***, una variante de Dijkstra que explora primero en dirección al destino. Para soportar cientos de coches a la vez se emplea la técnica **ALT (landmarks)**:

- Al cargar, se eligen 16 nodos repartidos por los bordes de la red y se calcula su distancia a todos los demás, en unos 100 ms.
- Por la desigualdad triangular, esas distancias proporcionan una estimación mucho mejor de lo que falta hasta el destino.

Las rutas que cruzan la isla pasan de 8 ms a 1 ms y siguen siendo óptimas: se comprobó en 300 rutas comparando su coste con el de un A* convencional. El coste de cada tramo es su longitud ajustada: las autopistas cuentan como más baratas y las pistas de tierra como más caras, de forma similar a como elegiría un conductor.

### Rendimiento

En el escenario de evacuación llega a haber **unos 400 coches a la vez**. Para mantener la fluidez:

- **`InstancedMesh`.** Cada pieza de los vehículos (carrocería, ruedas, alas...) es una sola malla con una copia por vehículo, por lo que 400 coches cuestan lo mismo de dibujar que 4.
- **Viajes pendientes y activos.** Los viajes esperan ordenados por hora de salida y pasan a una lista de activos al salir. En cada fotograma solo se procesan los que están en marcha, no las decenas de miles del día.
- **Tiempo limitado para rutas.** Cada fotograma dedica como máximo 6 ms a calcular rutas y adelanta las de los coches que salen en los próximos minutos.
- **Líneas solo cuando cambian.** Las líneas de las rutas solo se redibujan cuando cambia el conjunto de viajes activos.

### Iluminación

- **Luz ambiental**, para que ninguna zona quede negra.
- **Luz direccional ("sol")**, que marca las laderas del terreno y el volumen de los vehículos.
- El terreno y los vehículos usan `MeshLambertMaterial`, que reacciona a la luz. Los marcadores, la nube de aparcamientos y las líneas no dependen de las luces.
- En las versiones de three.js anteriores a la r155 las luces usan un modo antiguo en el que la misma intensidad ilumina unas tres veces más. El código lo detecta y lo desactiva para que la escena se vea igual con cualquier versión; CodeSandbox, por ejemplo, usa la 0.152.

### Controles

| Acción | Cómo |
|---|---|
| Rotar la vista | Arrastrar con el botón izquierdo |
| Zoom | Rueda del ratón |
| Desplazar la vista | Arrastrar con el botón derecho |
| Elegir escenario | Selector **Escenario** (al cambiarlo se aplica su velocidad recomendada) |
| Filtrar vehículos | Selector **Ver**: Todo / Coches / Aviones / Barcos |
| Velocidad de la simulación | Barra **Velocidad** (minutos simulados por fotograma) |
| Mostrar u ocultar los recorridos | Casilla **Mostrar rutas** |
| Ver los triángulos del terreno | Casilla **Ver malla del terreno** |

En la parte superior se muestran la fecha y la hora simuladas, el día del escenario y el número de coches, aviones y barcos en marcha. Al terminar el escenario, la simulación vuelve a empezar.

### Estructura del proyecto

El código (carpetas, archivos, variables y funciones) está en inglés; los comentarios, este README y los textos de la interfaz, en español.

```
index.html                  # Página; carga three.js (importmap) y src/main.js
assets/
├── img/
│   ├── gta5_atlas_2048.jpg       # Mapa atlas
│   └── gta5_heightmap_1024.png   # Mapa de alturas
└── data/
    ├── places.csv                # Aeropuertos y puertos
    ├── parking.csv               # Aparcamientos reales
    ├── road_graph.json           # Red de carreteras reducida
    └── scenarios/
        ├── index.json            # Lista de escenarios
        ├── normal-month/         # day01.csv ... day22.csv
        ├── heavy-traffic/        # day01.csv ... day03.csv
        └── evacuation/           # day01.csv, day02.csv
src/
├── main.js                 # Punto de entrada: escena, carga de datos y bucle
├── config.js               # Constantes: rutas de archivos, límites, colores, relieve, rendimiento
├── coordinates.js          # Coordenadas del juego -> coordenadas 3D (Map2Range + altura del suelo)
├── simulation.js           # Reloj, carga de días, viajes activos, vehículos y líneas
├── ui.js                   # Panel HTML (escenario, modo, velocidad, rutas, malla)
├── data/                   # Lectura de cada archivo de datos (CSV genérico, lugares, aparcamientos,
│                           #   grafo, viajes, escenarios)
├── routes/                 # Rutas: coche (A* + landmarks), avión, barco y utilidades
├── scene/                  # Escena, cámara, luces, terreno y marcadores
└── vehicles/               # Modelos 3D y flota con InstancedMesh
tools/
└── generate_scenarios.py   # Genera los escenarios de viajes
sandbox.config.json         # Configuración para CodeSandbox
```

### Arquitectura

El código está dividido en módulos para separar responsabilidades:

- **`config.js`** reúne todos los parámetros. Para cambiar los colores, la exageración del relieve, la hora de inicio o las rutas de los archivos basta con editar este archivo.
- **`data/`** solo lee archivos y devuelve objetos; no dibuja nada. `parseCSV()` convierte cualquier CSV en objetos a partir de su cabecera.
- **`scene/`** solo dibuja: escena, terreno y marcadores.
- **`routes/`** calcula las rutas, con un archivo por tipo de vehículo.
- **`vehicles/`** construye los modelos y los dibuja en bloque.
- **`Simulation`** une todo lo anterior: avanza el reloj, carga los días, decide qué viajes están activos y coloca los vehículos.
- **`main.js`** crea la escena, carga los datos en orden (primero el mapa, porque su tamaño es necesario para colocar todo lo demás), conecta la interfaz y ejecuta el bucle de animación.

---

## 2. Fuentes utilizadas

### Datos
- **Mapa atlas:** CreepPork/GTAV-Maps — https://github.com/CreepPork/GTAV-Maps
- **Red de carreteras (`nodes.json`):** DurtyFree/gta-v-data-dumps — https://github.com/DurtyFree/gta-v-data-dumps
- **Puntos de aparición de coches:** root-cause/v-cargens — https://github.com/root-cause/v-cargens
- **Mapa de alturas:** meshiest/heightmap2brs (licencia MIT) — https://github.com/meshiest/heightmap2brs
- Los datos de GTA V pertenecen a Rockstar Games; los repositorios anteriores son recopilaciones de la comunidad.

### Librerías
- **Three.js** — https://threejs.org/ (incluido `OrbitControls` de `examples/jsm`), cargado desde jsDelivr mediante un `importmap`.
- **Python** con **NumPy** y **SciPy** para la preparación de los datos y la generación de los escenarios.

### Documentación consultada
- Documentación de Three.js: https://threejs.org/docs/
- Ejemplos de terrenos y mapas de la asignatura de Informática Gráfica (ULPGC): https://codesandbox.io/p/sandbox/ig-s8-49qnzw
- Algoritmo ALT (A* con landmarks): Goldberg y Harrelson, *Computing the Shortest Path: A\* Search Meets Graph Theory* (2005).
- Uso de la IA (Claude, de Anthropic) como asistente en la preparación y calibración de los datos, la generación de los escenarios, creación de modelos de vehículos y simulación : https://claude.ai/share/16aadf2d-35e0-4a05-af38-854ede4745e3

---

## 3. Vídeo de ejecución

https://www.youtube.com/watch?v=8Sb5f9hz0aI — captura del proyecto en funcionamiento, con los distintos escenarios, el filtro por tipo de vehículo y el relieve del terreno.

---

## 4. Cómo ejecutarlo

**En CodeSandbox:** abrir el enlace de la demo. El archivo `sandbox.config.json` desactiva la protección contra bucles infinitos de CodeSandbox, necesaria porque el terreno tiene más de 260.000 vértices y CodeSandbox interrumpe los bucles de más de 100.000 iteraciones.



**Regenerar los escenarios** (opcional): `python tools/generate_scenarios.py` (requiere `numpy` y `scipy`). Para crear un escenario nuevo basta con añadirlo a la lista `SCENARIOS` del script.

---

## 5. Posibles mejoras

- Usar las rutas marítimas del propio juego (los nodos marcados como "sobre el agua" en `nodes.json`) en lugar de la ruta alrededor de la isla.
- Dar a cada coche el color o la forma del modelo que el juego hace aparecer en su aparcamiento (`parking.csv` incluye esa información).
- Mapa de calor con las calles más transitadas de cada escenario.
- Añadir otros tipos de tráfico: trenes y peatones.
