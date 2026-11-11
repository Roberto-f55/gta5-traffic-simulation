// =====================================================================
//  Escena, cámara, renderer, controles, luces y plano del mapa
// =====================================================================
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MAP_SCALE } from "../config.js";
import { setPlaneSize, setTerrainHeight } from "../coordinates.js";
import { loadHeightmap, createTerrain } from "./terrain.js";

export function createScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );
  camera.position.set(0, -4.5, 4.5); // en diagonal, para que se vea el relieve

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // En three.js anteriores a la r155 las luces usan un modo antiguo ("legacy")
  // en el que la misma intensidad ilumina unas 3 veces más y todo sale quemado.
  // Se desactiva para que se vea igual en cualquier versión (en las nuevas ya no existe).
  if (Number(THREE.REVISION) < 155) renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);

  // Luces: la ambiental ilumina todo por igual y la direccional ("sol")
  // marca las laderas del terreno y el volumen de los vehículos
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, -2, 4);
  scene.add(sun);

  return { scene, camera, renderer, controls };
}

// Carga la textura y el mapa de alturas y crea el terreno, manteniendo
// la relación de aspecto de la textura. Devuelve la malla del terreno.
export async function loadMap(scene, textureUrl, heightmapUrl) {
  const [texture, heightAt] = await Promise.all([
    new THREE.TextureLoader().loadAsync(textureUrl).catch(() => {
      throw new Error("No se pudo cargar " + textureUrl);
    }),
    loadHeightmap(heightmapUrl),
  ]);
  texture.colorSpace = THREE.SRGBColorSpace; // colores reales (si no, se ve "lavado")

  const height = MAP_SCALE;
  const width = height * (texture.image.width / texture.image.height);
  setPlaneSize(width, height);
  setTerrainHeight(heightAt); // a partir de aquí gameToPlane pone los puntos sobre el suelo

  return createTerrain(scene, texture, width, height, heightAt);
}