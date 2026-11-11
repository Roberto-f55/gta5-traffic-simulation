// =====================================================================
//  Modelos 3D de los vehículos (en vez de las "bolas" de script_25)
//  Todos se construyen mirando hacia +X y con Z hacia arriba,
//  así luego basta con girarlos según la dirección de la ruta.
// =====================================================================
import * as THREE from "three";
import { COLORS, VEHICLE_SCALE } from "../config.js";

// Materiales compartidos (Lambert para que se note el volumen con la luz)
const materials = {
  car: new THREE.MeshLambertMaterial({ color: COLORS.car }),
  plane: new THREE.MeshLambertMaterial({ color: COLORS.plane }),
  boat: new THREE.MeshLambertMaterial({ color: COLORS.boat }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  glass: new THREE.MeshLambertMaterial({ color: 0x88ccff }),
  black: new THREE.MeshLambertMaterial({ color: 0x111111 }),
};

// Geometrías compartidas (se crean una sola vez para todos los vehículos)
const geometries = {
  // Coche
  body: new THREE.BoxGeometry(0.05, 0.024, 0.01),
  cabin: new THREE.BoxGeometry(0.024, 0.02, 0.009),
  wheel: new THREE.CylinderGeometry(0.006, 0.006, 0.004, 10), // eje en Y = lateral
  // Avión
  fuselage: new THREE.CylinderGeometry(0.006, 0.004, 0.06, 10),
  nose: new THREE.ConeGeometry(0.006, 0.012, 10),
  wing: new THREE.BoxGeometry(0.016, 0.07, 0.002),
  tailplane: new THREE.BoxGeometry(0.008, 0.026, 0.002),
  fin: new THREE.BoxGeometry(0.01, 0.002, 0.014),
  // Barco
  hull: createHullGeometry(),
  bridge: new THREE.BoxGeometry(0.016, 0.014, 0.01),
  funnel: new THREE.CylinderGeometry(0.003, 0.003, 0.008, 8),
};

// Casco del barco: silueta con proa en punta, extruida hacia arriba
function createHullGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.03, -0.011);
  s.lineTo(0.015, -0.011);
  s.lineTo(0.035, 0);
  s.lineTo(0.015, 0.011);
  s.lineTo(-0.03, 0.011);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
  g.translate(0, 0, -0.004); // centrado en altura
  return g;
}

function part(geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

function createCar() {
  const g = new THREE.Group();
  g.add(part(geometries.body, materials.car, 0, 0, 0));
  g.add(part(geometries.cabin, materials.glass, -0.004, 0, 0.009));
  for (const [x, y] of [[0.016, 0.013], [0.016, -0.013], [-0.016, 0.013], [-0.016, -0.013]])
    g.add(part(geometries.wheel, materials.black, x, y, -0.005));
  return g;
}

function createPlane() {
  const g = new THREE.Group();
  const fuselage = part(geometries.fuselage, materials.plane, 0, 0, 0);
  fuselage.rotation.z = -Math.PI / 2; // cilindro tumbado a lo largo de X (punta fina detrás)
  g.add(fuselage);
  const nose = part(geometries.nose, materials.white, 0.036, 0, 0);
  nose.rotation.z = -Math.PI / 2; // cono apuntando a +X
  g.add(nose);
  g.add(part(geometries.wing, materials.white, 0.004, 0, 0));
  g.add(part(geometries.tailplane, materials.white, -0.026, 0, 0));
  g.add(part(geometries.fin, materials.plane, -0.026, 0, 0.008));
  return g;
}

function createBoat() {
  const g = new THREE.Group();
  g.add(part(geometries.hull, materials.boat, 0, 0, 0));
  g.add(part(geometries.bridge, materials.white, -0.01, 0, 0.009));
  const funnel = part(geometries.funnel, materials.black, -0.02, 0, 0.012);
  funnel.rotation.x = Math.PI / 2; // cilindro de pie (eje Z)
  g.add(funnel);
  return g;
}

const FACTORIES = { car: createCar, plane: createPlane, boat: createBoat };

// ---------------------------------------------------------------------
//  Flota: todos los vehículos de un tipo dibujados con InstancedMesh.
//  Cada pieza del modelo (carrocería, ruedas, alas...) es UNA sola malla
//  con N copias, así que da igual tener 4 coches o 400: son las mismas
//  llamadas de dibujo.
// ---------------------------------------------------------------------
export class VehicleFleet {
  constructor(scene, type, capacity = 64) {
    this.scene = scene;
    this.count = 0;
    // Piezas del modelo: geometría, material y posición relativa al vehículo
    const model = FACTORIES[type]();
    model.updateMatrixWorld(true);
    this.parts = model.children.map((mesh) => ({
      geometry: mesh.geometry,
      material: mesh.material,
      local: mesh.matrix.clone(),
      instanced: null,
    }));
    this.helper = new THREE.Object3D(); // para calcular la posición y el giro
    this.matrix = new THREE.Matrix4();
    this.allocate(capacity);
  }

  // Crea (o vuelve a crear, más grandes) las mallas instanciadas
  allocate(capacity) {
    this.capacity = capacity;
    for (const part of this.parts) {
      if (part.instanced) {
        this.scene.remove(part.instanced);
        part.instanced.dispose();
      }
      const im = new THREE.InstancedMesh(part.geometry, part.material, capacity);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false; // las copias están por todo el mapa
      im.count = 0;
      this.scene.add(im);
      part.instanced = im;
    }
  }

  // Empieza un fotograma nuevo: aún no hay ningún vehículo colocado
  begin() {
    this.count = 0;
  }

  // Coloca el siguiente vehículo en "position" mirando hacia "dir"
  add(position, dir) {
    if (this.count >= this.capacity) this.allocate(this.capacity * 2);
    this.helper.position.copy(position);
    orient(this.helper, dir);
    this.helper.scale.setScalar(VEHICLE_SCALE);
    this.helper.updateMatrix();
    for (const part of this.parts) {
      this.matrix.multiplyMatrices(this.helper.matrix, part.local);
      part.instanced.setMatrixAt(this.count, this.matrix);
    }
    this.count++;
  }

  // Termina el fotograma: solo se dibujan los vehículos colocados
  end() {
    for (const part of this.parts) {
      part.instanced.count = this.count;
      part.instanced.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    for (const part of this.parts) {
      this.scene.remove(part.instanced);
      part.instanced.dispose();
    }
  }
}

// Orienta el modelo según la dirección del tramo (rumbo + cabeceo)
export function orient(model, dir) {
  if (dir.lengthSq() < 1e-12) return; // tramo de longitud 0: deja el giro anterior
  const horizontal = Math.hypot(dir.x, dir.y);
  model.rotation.set(0, -Math.atan2(dir.z, horizontal), Math.atan2(dir.y, dir.x), "ZYX");
}
