"""
Genera los escenarios de viajes simulados en assets/data/scenarios/.

Solo usa los datos que ya están en assets/data:
  - road_graph.json  (red de carreteras real, sacada de nodes.json)
  - parking.csv      (aparcamientos reales, v-cargens)
  - places.csv       (aeropuertos y puertos)

Para cada viaje en coche calcula la ruta más corta por carretera (Dijkstra)
y su duración con una velocidad aleatoria. Los aviones van en línea recta
y los barcos rodean la isla (la misma lógica que src/routes/boat.js).

Uso:  python tools/generate_scenarios.py      (necesita numpy y scipy)
"""
import csv, json, math, random, datetime as dt
from collections import defaultdict
from pathlib import Path
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"
OUT = DATA / "scenarios"

# ---------------------------------------------------------------------------
# Escenarios
# ---------------------------------------------------------------------------
# Actividad por hora (0-23): cuánto tráfico sale en cada hora del día
NORMAL = [1, .5, .3, .3, .5, 1.5, 4, 8, 9, 6, 5, 5, 6, 6, 5, 5, 6, 8, 9, 7, 5, 4, 3, 2]
EVAC_OUT = [.5, .3, .3, .5, 1, 3, 6, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1.5, 1, 1, .5]
EVAC_BACK = [.3, .2, .2, .2, .3, .5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 6, 4, 3, 2, 1]

LS_PORTS = ["Puerto Del Sol", "Port of Los Santos", "Del Perro Pier"]
NORTH_PORTS = ["Paleto Cove", "Paleto Bay Pier", "Chumash"]
LSIA = ["Los Santos International Airport"]
OTHER_AIRPORTS = ["Sandy Shores Airfield", "Fort Zancudo", "McKenzie Field"]

SCENARIOS = [
    {
        "id": "normal-month",
        "name": "Mes normal",
        "description": "Un mes de tráfico cotidiano: 10.000 coches al día, con horas punta por la mañana y por la tarde.",
        "start": dt.datetime(2013, 9, 17),
        "speed": 0.25,
        "days": [dict(cars=10000, planes=36, boats=45, hours=NORMAL, mode="normal")] * 30,
    },
    {
        "id": "heavy-traffic",
        "name": "Tráfico intenso",
        "description": "Tres días con el triple de coches y muchos más vuelos y barcos.",
        "start": dt.datetime(2013, 12, 20),
        "speed": 0.15,
        "days": [dict(cars=30000, planes=150, boats=120, hours=NORMAL, mode="normal")] * 3,
    },
    {
        "id": "evacuation",
        "name": "Evacuación de Los Santos",
        "description": "Día 1: todo el mundo huye de Los Santos hacia el norte por carretera, aire y mar. "
                       "Día 2: vuelta a casa. Atascos (coches más lentos) el primer día.",
        "start": dt.datetime(2013, 10, 31),
        "speed": 0.1,
        "days": [
            dict(cars=15000, planes=300, boats=120, hours=EVAC_OUT, mode="evacuate"),
            dict(cars=15000, planes=300, boats=120, hours=EVAC_BACK, mode="return"),
        ],
    },
]

# ---------------------------------------------------------------------------
# Datos
# ---------------------------------------------------------------------------
graph = json.loads((DATA / "road_graph.json").read_text())
N = len(graph["nodes"]) // 2
NODES = np.array(graph["nodes"], dtype=float).reshape(N, 2)
EDGES = graph["edges"]
rows = [e[0] for e in EDGES] + [e[1] for e in EDGES]
cols = [e[1] for e in EDGES] + [e[0] for e in EDGES]
G = csr_matrix(([e[2] for e in EDGES] * 2, (rows, cols)), shape=(N, N))
EDGE_LEN = {}
for a, b, _, length, _ in EDGES:
    EDGE_LEN[(a, b)] = EDGE_LEN[(b, a)] = length

with open(DATA / "parking.csv", encoding="utf-8") as f:
    PARKING = [dict(id=r["id"], x=float(r["x"]), y=float(r["y"]), node=int(r["node"]))
               for r in csv.DictReader(f, delimiter=";")]
PXY = np.array([[p["x"], p["y"]] for p in PARKING])

with open(DATA / "places.csv", encoding="utf-8") as f:
    PLACES = {r["name"]: (float(r["x"]), float(r["y"])) for r in csv.DictReader(f, delimiter=";")}
AIRPORTS = [n for n in PLACES if n in LSIA + OTHER_AIRPORTS]
PORTS = [n for n in PLACES if n in LS_PORTS + NORTH_PORTS]

# Zonas para la evacuación (coordenadas del juego)
SOUTH = [i for i, p in enumerate(PARKING) if p["y"] < 500]    # Los Santos
NORTH = [i for i, p in enumerate(PARKING) if p["y"] > 2500]   # Sandy Shores, Grapeseed, Paleto...

# ---------------------------------------------------------------------------
# Barcos: misma lógica que src/routes/boat.js
# ---------------------------------------------------------------------------
SEA_RING = [(-2613, -1914), (-3578, 17), (-3836, 1948), (-3385, 3493), (-2355, 4780), (-1325, 6260),
            (-424, 7097), (1378, 7000), (3630, 6260), (4531, 4522), (4531, 1948), (3695, -627),
            (2794, -2557), (1506, -3780), (-553, -3780), (-2484, -3265)]
HARBOR_EXITS = {"Puerto Del Sol": [(-900, -1600), (-1000, -1700), (-1100, -1800), (-1200, -1900), (-1350, -1980)]}


def path_len(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def boat_length(a, b):
    ea, eb = HARBOR_EXITS.get(a, []), HARBOR_EXITS.get(b, [])[::-1]
    pa, pb = PLACES[a], PLACES[b]
    near = lambda p: min(range(len(SEA_RING)), key=lambda k: math.dist(p, SEA_RING[k]))
    i, j, n = near(ea[-1] if ea else pa), near(eb[0] if eb else pb), len(SEA_RING)
    cw = [(i + k) % n for k in range((j - i) % n + 1)]
    ccw = [(i - k) % n for k in range((i - j) % n + 1)]
    return min(path_len([pa] + ea + [SEA_RING[k] for k in idx] + eb + [pb]) for idx in (cw, ccw))


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------
def random_time(day_start, hours):
    h = random.choices(range(24), weights=hours)[0]
    return day_start + dt.timedelta(hours=h, minutes=random.uniform(0, 59.99))


def pick_car_pair(mode):
    if mode == "evacuate":
        return random.choice(SOUTH), random.choice(NORTH)
    if mode == "return":
        return random.choice(NORTH), random.choice(SOUTH)
    # Normal: origen al azar y destino cercano con más probabilidad
    o = random.randrange(len(PARKING))
    d = np.hypot(*(PXY - PXY[o]).T)
    w = np.exp(-d / 2500)
    w[d < 300] = 0
    return o, int(np.random.choice(len(PARKING), p=w / w.sum()))


def pick_pair(mode, south, north, everything):
    if mode == "evacuate":
        return random.choice(south), random.choice(north)
    if mode == "return":
        return random.choice(north), random.choice(south)
    return tuple(random.sample(everything, 2))


def car_lengths(trips):
    """Longitud real por carretera de cada viaje (un Dijkstra por origen)."""
    by_origin = defaultdict(list)
    for t in trips:
        by_origin[PARKING[t["o"]]["node"]].append(t)
    for src, group in by_origin.items():
        _, pred = dijkstra(G, indices=src, return_predecessors=True)
        for t in group:
            u, length = PARKING[t["d"]]["node"], 0.0
            while u != src and u >= 0:
                length += EDGE_LEN[(pred[u], u)]
                u = pred[u]
            if u < 0:
                t["len"] = None  # sin camino
                continue
            po, pd = PARKING[t["o"]], PARKING[t["d"]]
            length += math.dist((po["x"], po["y"]), NODES[src]) + math.dist((pd["x"], pd["y"]), NODES[pd["node"]])
            t["len"] = length


def generate(sc):
    folder = OUT / sc["id"]
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("day*.csv"):
        old.unlink()
    files, total = [], 0
    for k, day in enumerate(sc["days"]):
        day_start = sc["start"] + dt.timedelta(days=k)
        mode = day["mode"]
        rows = []

        cars = []
        for _ in range(day["cars"]):
            o, d = pick_car_pair(mode)
            cars.append(dict(o=o, d=d, t0=random_time(day_start, day["hours"])))
        car_lengths(cars)
        slow = mode == "evacuate"  # atascos
        for t in cars:
            if t["len"] is None:
                continue
            speed = random.uniform(20, 40) if slow else random.uniform(40, 70)  # km/h
            rows.append((t["t0"], t["len"] / 1000 / speed * 60, PARKING[t["o"]]["id"], PARKING[t["d"]]["id"], "car"))

        for _ in range(day["planes"]):
            a, b = pick_pair(mode, LSIA, OTHER_AIRPORTS, AIRPORTS)
            minutes = math.dist(PLACES[a], PLACES[b]) / 1000 / random.uniform(180, 260) * 60 + random.uniform(2, 5)
            rows.append((random_time(day_start, day["hours"]), minutes, a, b, "plane"))

        for _ in range(day["boats"]):
            a, b = pick_pair(mode, LS_PORTS, NORTH_PORTS, PORTS)
            minutes = boat_length(a, b) / 1000 / random.uniform(25, 45) * 60
            rows.append((random_time(day_start, day["hours"]), minutes, a, b, "boat"))

        rows.sort()
        name = f"day{k + 1:02d}.csv"
        fmt = lambda t: t.strftime("%d/%m/%Y %H:%M")
        with open(folder / name, "w", encoding="utf-8", newline="") as f:
            f.write("Start;End;Minutes;Origin;Destination;Type\n")
            for t0, m, a, b, tp in rows:
                f.write(f"{fmt(t0)};{fmt(t0 + dt.timedelta(minutes=m))};{m:.2f};{a};{b};{tp}\n")
        files.append(name)
        total += len(rows)
        print(f"  {sc['id']}/{name}: {len(rows)} viajes")
    return dict(id=sc["id"], name=sc["name"], description=sc["description"],
                startDate=sc["start"].strftime("%Y-%m-%d"), days=len(files),
                speed=sc["speed"], files=files, trips=total)


if __name__ == "__main__":
    random.seed(2013)
    np.random.seed(2013)
    index = []
    for sc in SCENARIOS:
        print("Generando", sc["name"])
        index.append(generate(sc))
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Escenarios guardados en", OUT)
