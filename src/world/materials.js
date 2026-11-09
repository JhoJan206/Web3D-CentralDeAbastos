import * as THREE from 'three';
import { asphaltTex, concreteTex, grassTex, terrainTex, roofTex, wallTex, floorTex, solarTex } from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

export const MAT = {};

export function initMaterials() {
  Object.assign(MAT, {
    asphalt: std({ map: asphaltTex(), roughness: 0.95, metalness: 0 }),
    concrete: std({ map: concreteTex(), roughness: 0.9 }),
    floor: std({ map: floorTex(), roughness: 0.55, metalness: 0.02 }),
    grass: std({ map: grassTex(), roughness: 1 }),
    terrain: std({ map: terrainTex(), roughness: 1 }),
    wall: std({ map: wallTex(), roughness: 0.75, color: 0xffffff }),
    plinth: std({ color: 0x9c9a94, roughness: 0.9 }),
    roof: std({ map: roofTex(), roughness: 0.38, metalness: 0.65, color: 0xffffff, envMapIntensity: 1.0 }),
    skylight: std({ color: 0xe8f2f7, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.88, emissive: 0x889aa3, emissiveIntensity: 0.15 }),
    glass: std({ color: 0x1b2730, roughness: 0.12, metalness: 0.6, envMapIntensity: 1.3 }),
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
