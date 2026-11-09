import * as THREE from 'three';
import { asphaltTex, concreteTex, grassTex, terrainTex, roofTex, wallTex, floorTex, solarTex } from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

export const MAT = {};

// Capas del suelo: todas las superficies planas casi coplanares (patio, vías, andenes, pintura)
// usan polygonOffset para que no parpadeen al verlas desde lejos (vista cenital).
const layerCache = new Map();
export function layer(mat, k) {
  const key = mat.uuid + ':' + k;
  if (!layerCache.has(key)) {
    const m = mat.clone();
    m.polygonOffset = true;
    m.polygonOffsetFactor = -k;
    m.polygonOffsetUnits = -k * 4;
    layerCache.set(key, m);
  }
  return layerCache.get(key);
}
export const LAYER = { yard: 1, lot: 2, road: 3, connector: 4, apron: 5, island: 6, paint: 8 };

export function initMaterials() {
  Object.assign(MAT, {
    asphalt: std({ map: asphaltTex(), roughness: 0.95, metalness: 0 }),
    concrete: std({ map: concreteTex(), roughness: 0.9 }),
    floor: std({ map: floorTex(), roughness: 0.55, metalness: 0.02 }),
    grass: std({ map: grassTex(), roughness: 1 }),
    terrain: std({ map: terrainTex(), roughness: 1 }),
    wall: std({ map: wallTex(), roughness: 0.75, color: 0xffffff }),
    plinth: std({ color: 0x9c9a94, roughness: 0.9 }),
    roof: std({ map: roofTex(), roughness: 0.46, metalness: 0.6, color: 0xf2f4f6, envMapIntensity: 0.9 }),
    skylight: std({ color: 0xeef6fa, roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.62, emissive: 0x9fb4be, emissiveIntensity: 0.18, depthWrite: false }),
    glass: std({ color: 0x22313b, roughness: 0.06, metalness: 0.7, envMapIntensity: 1.6 }),
    door: std({ color: 0x5d646b, roughness: 0.55, metalness: 0.5 }),
    paint: std({ color: 0xffffff, roughness: 0.8 }), // líneas de demarcación (color por instancia)
    generic: std({ color: 0xffffff, roughness: 0.7, metalness: 0.05 }), // lotes con color por instancia
    metal: std({ color: 0xffffff, roughness: 0.35, metalness: 0.75 }),
    plastic: std({ color: 0xffffff, roughness: 0.45, metalness: 0.0 }),
    foliage: std({ color: 0xffffff, roughness: 0.95, flatShading: true }),
    bark: std({ color: 0x5b4330, roughness: 1 }),
    water: std({ color: 0x3a6f86, roughness: 0.1, metalness: 0.3 }),
    solar: std({ map: solarTex(), roughness: 0.2, metalness: 0.7 }),
    curb: std({ color: 0xc9c6bd, roughness: 0.85 }),
    vitrina: std({ color: 0xbfe6f2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 }),
  });
  return MAT;
}
