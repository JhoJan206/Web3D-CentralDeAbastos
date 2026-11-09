import * as THREE from 'three';
import { MAT } from './materials.js';
import { Batch, boxGeo, mesh, roundedRectShape, flatMesh, slabMesh } from './utils.js';
import { buildInterior } from './interiors.js';

export const FLOOR = 0.45; // cota de piso terminado interior

export function buildBuilding(data, scene) {
  const { w, d, eave, ridge, type } = data;
  const g = new THREE.Group();
  g.name = data.id;
  g.position.set(data.cx, 0, data.cz);

  const wallMat = MAT.wall.clone();
  const roofMat = MAT.roof.clone();
  const skyMat = MAT.skylight.clone();
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x8d969e, roughness: 0.5, metalness: 0.6 });
  const roofMats = [roofMat, skyMat, trussMat];

  const glass = new Batch(MAT.glass);
  const dark = new Batch(MAT.door);
  const paint = new Batch(MAT.paint);
  const misc = new Batch(MAT.generic);

  // ---------- Plataforma de concreto alrededor (andenes y patios de maniobra) ----------
  const dockF = data.docks.front > 0 ? 14 : 4;
  const dockB = data.docks.back > 0 ? 14 : 4;
  const front = data.publicFront ? 10 : dockF;
  const apron = roundedRectShape(-w / 2 - 4, -d / 2 - dockB, w / 2 + 4, d / 2 + front, 2);
  g.add(flatMesh(apron, MAT.concrete, 0.06));

  // Zonas verdes laterales junto a los muelles (como en la maqueta)
  const greenPatch = (side, sign) => {
    const n = data.docks[side];
    if (!n) return;
    const span = dockSpan(n, w);
    const zEdge = sign * (d / 2);
    const z0 = zEdge + sign * 1.5, z1 = zEdge + sign * 12;
    if (w / 2 - span > 5) {
      g.add(slabMesh(roundedRectShape(span + 1.5, z0, w / 2 + 3.5, z1, 2.2), MAT.grass, 0.22, 0.07));
      g.add(slabMesh(roundedRectShape(-w / 2 - 3.5, z0, -span - 1.5, z1, 2.2), MAT.grass, 0.22, 0.07));
    }
  };
  greenPatch('front', 1);
  greenPatch('back', -1);
  if (data.publicFront) {
    g.add(slabMesh(roundedRectShape(-w / 2 - 3, d / 2 + 2, -8, d / 2 + 9, 2.5), MAT.grass, 0.22, 0.07));
    g.add(slabMesh(roundedRectShape(8, d / 2 + 2, w / 2 + 3, d / 2 + 9, 2.5), MAT.grass, 0.22, 0.07));
  }

  // ---------- Base blanca (zócalo de la maqueta) + piso ----------
  const base = mesh(boxGeo(w + 1.6, FLOOR - 0.05, d + 1.6), MAT.plinth);
  base.position.y = (FLOOR - 0.05) / 2;
  g.add(base);
  const floor = mesh(boxGeo(w - 0.6, 0.06, d - 0.6), MAT.floor, { cast: false });
  floor.position.set(0, FLOOR - 0.02, 0);
  g.add(floor);

  // ---------- Muros ----------
  const t = 0.4;
  const walls = new THREE.Group();
  if (type === 'gable') {
    for (const s of [-1, 1]) {
      const wl = mesh(boxGeo(t, eave, d), wallMat);
      wl.position.set(s * (w / 2 - t / 2), eave / 2, 0);
      walls.add(wl);
      // zócalo de concreto
      const pl = mesh(boxGeo(t + 0.12, 1.2, d), MAT.plinth);
      pl.position.set(s * (w / 2 - t / 2), 0.6, 0);
      walls.add(pl);
    }
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2, eave);
    shape.lineTo(0, ridge);
    shape.lineTo(-w / 2, eave);
    shape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    for (const s of [-1, 1]) {
      const gw = mesh(gGeo, wallMat);
      gw.position.set(0, 0, s > 0 ? d / 2 - t : -d / 2);
      walls.add(gw);
      const pl = mesh(boxGeo(w, 1.2, t + 0.12), MAT.plinth);
      pl.position.set(0, 0.6, s * (d / 2 - t / 2));
      walls.add(pl);
      // celosía de ventilación en el hastial
      for (let k = -2; k <= 2; k++) dark.add(k * 1.6, eave + 0.8, s * (d / 2 + 0.03), 1.1, 1.6 - Math.abs(k) * 0.25, 0.08, 0x3a4046);
    }
  } else {
    const H = eave + 1.0; // con antepecho
    for (const s of [-1, 1]) {
      const wl = mesh(boxGeo(t, H, d), wallMat);
      wl.position.set(s * (w / 2 - t / 2), H / 2, 0);
      walls.add(wl);
      const we = mesh(boxGeo(w, H, t), wallMat);
      we.position.set(0, H / 2, s * (d / 2 - t / 2));
      walls.add(we);
    }
  }
  g.add(walls);

  // ---------- Ventanas (franja de vanos oscuros como en la maqueta) ----------
  if (type === 'gable') {
    const wy = eave - 3.4;
    for (let z = -d / 2 + 5; z <= d / 2 - 5; z += 7.5) {
      for (const s of [-1, 1]) glass.add(s * (w / 2 + 0.03), wy, z, 0.1, 1.5, 5.2, 0x1b2730);
    }
    // puertas laterales peatonales
    for (const s of [-1, 1]) dark.add(s * (w / 2 + 0.04), FLOOR, 0, 0.1, 3, 2.4, 0x4e555c);
  } else {
    for (const y of [1.4, 5.4]) {
      for (let z = -d / 2 + 3; z <= d / 2 - 3; z += 3.6) {
        for (const s of [-1, 1]) glass.add(s * (w / 2 + 0.03), y, z, 0.1, 1.7, 2.8, 0x1b2730);
      }
      for (let x = -w / 2 + 3; x <= w / 2 - 3; x += 3.6) {
        for (const s of [-1, 1]) glass.add(x, y, s * (d / 2 + 0.03), 2.8, 1.7, 0.1, 0x1b2730);
      }
    }
    // acceso principal en fachada oeste con marquesina
    glass.add(-w / 2 - 0.05, FLOOR, 8, 0.12, 3.2, 6, 0x24333d);
    misc.add(-w / 2 - 2, 3.9, 8, 4, 0.25, 9, 0xdedcd6);
    // banda entre pisos
    for (const s of [-1, 1]) {
      misc.add(s * (w / 2 + 0.05), 4.0, 0, 0.12, 0.5, d, 0xb9b6ae);
      misc.add(0, 4.0, s * (d / 2 + 0.05), w, 0.5, 0.12, 0xb9b6ae);
    }
  }

  // ---------- Portones y muelles en los hastiales ----------
  const docks = [];
  for (const [side, sign] of [['front', 1], ['back', -1]]) {
    const n = data.docks[side];
    const zf = sign * (d / 2 + 0.04);
    if (type === 'gable') {
      // portón central
      dark.add(0, FLOOR, zf, 6, 5.6, 0.12, 0x59616a);
      dark.add(0, FLOOR + 5.6, zf, 6.6, 0.3, 0.16, 0x3a4046);
    }
    if (data.publicFront && side === 'front') {
      glass.add(0, FLOOR, zf + sign * 0.03, 10, 4, 0.1, 0x24333d);
      misc.add(0, 5.2, zf + sign * 3, 16, 0.3, 6, 0xdedcd6); // marquesina
      for (const x of [-7.5, 7.5]) misc.add(x, 0, zf + sign * 5.5, 0.3, 5.2, 0.3, 0x9aa0a6);
      // franjas peatonales
      for (let x = -6; x <= 6; x += 1.2) paint.add(x, 0.09, d / 2 + 16, 0.6, 0.02, 5, 0xf2f2ee);
      continue;
    }
    if (!n) continue;
    const xs = dockXs(n, w);
    for (const x of xs) {
      dark.add(x, 1.2, zf, 3.0, 3.2, 0.12, 0x6d757d); // puerta seccional
      misc.add(x, 1.2, zf + sign * 0.15, 3.4, 0.25, 0.3, 0x1d1f21); // abrigo
      misc.add(x - 1.45, 0.2, zf + sign * 0.2, 0.3, 0.6, 0.3, 0x1d1f21); // topes
      misc.add(x + 1.45, 0.2, zf + sign * 0.2, 0.3, 0.6, 0.3, 0x1d1f21);
      docks.push({ x: data.cx + x, z: data.cz + sign * (d / 2), sign });
    }
    // anden elevado
    const span = dockSpan(n, w);
    misc.add(0, 0, sign * (d / 2 + 1.0), span * 2 + 3, 1.2, 2, 0xb1aea6);
    // marquesina de muelles
    misc.add(0, 5.6, sign * (d / 2 + 2.6), span * 2 + 4, 0.25, 5.2, 0xd5d8db);
    // líneas de guía
    for (const x of xs) {
      paint.add(x - 1.9, 0.09, sign * (d / 2 + 2 + 6), 0.15, 0.02, 12, 0xf2d24b);
      paint.add(x + 1.9, 0.09, sign * (d / 2 + 2 + 6), 0.15, 0.02, 12, 0xf2d24b);
    }
  }

  // ---------- Cubierta (grupo removible) ----------
  const roof = new THREE.Group();
  roof.name = 'roof';
  const ov = 1.2;
  if (type === 'gable') {
    const rise = ridge - eave;
    const a = Math.atan2(rise, w / 2);
    const L = (w / 2 + ov) / Math.cos(a);
    const th = 0.22;
    for (const s of [-1, 1]) {
      const p = mesh(boxGeo(L, th, d + ov * 2), roofMat);
      p.position.set(s * Math.cos(a) * (L / 2), ridge - Math.sin(a) * (L / 2) + th / 2, 0);
      p.rotation.z = -s * a;
      roof.add(p);
      // claraboya translúcida a lo largo de la cumbrera
      const sw = Math.max(3, w * 0.13);
      const sk = mesh(boxGeo(sw, 0.12, d * 0.62), skyMat, { cast: false });
      sk.position.set(s * Math.cos(a) * (sw / 2 + 0.5), ridge - Math.sin(a) * (sw / 2 + 0.5) + th + 0.06, 0);
      sk.rotation.z = -s * a;
      roof.add(sk);
    }
    const cap = mesh(boxGeo(1.0, 0.35, d + ov * 2), roofMat);
    cap.position.set(0, ridge + 0.15, 0);
    roof.add(cap);
    // cerchas metálicas (se levantan con la cubierta)
    const tr = new Batch(trussMat);
    for (let z = -d / 2 + 6; z <= d / 2 - 6; z += 8) {
      tr.add(0, eave - 0.6, z, w - 1, 0.35, 0.3, 0x8d969e);
      for (const s of [-1, 1]) {
        tr.add(s * w / 4, eave + rise / 2 - 0.4, z, Math.hypot(w / 2, rise), 0.4, 0.3, 0x8d969e, 0, 0, -s * a);
      }
      tr.add(0, eave - 0.6, z, 0.25, rise + 0.4, 0.25, 0x8d969e);
    }
    const trm = tr.build();
    roof.add(trm);
  } else {
    const H = eave;
    const slab = mesh(boxGeo(w - 0.8, 0.35, d - 0.8), roofMat);
    slab.position.set(0, H, 0);
    roof.add(slab);
    const sk = mesh(boxGeo(5, 0.6, 5), skyMat);
    sk.position.set(0, H + 0.5, -d * 0.1);
    roof.add(sk);
    const units = new Batch(trussMat);
    for (let k = 0; k < 4; k++) units.add(0, H + 0.35, -d / 2 + 10 + k * 16, 3.2, 1.6, 2.2, 0x9aa1a8);
    roof.add(units.build());
    // losa de entrepiso (se retira junto con la cubierta para ver el primer piso)
    const mid = mesh(boxGeo(w - 0.8, 0.3, d - 0.8), trussMat);
    mid.position.set(0, 4.0, 0);
    roof.add(mid);
  }
  roof.traverse((o) => { if (o.isMesh) o.userData.roofPart = true; });
  g.add(roof);

  g.add(glass.build({ cast: false }));
  g.add(dark.build({ cast: false }));
  g.add(misc.build());
  g.add(paint.build({ cast: false }));

  // ---------- Interior ----------
  const interior = buildInterior(data);
  interior.group.visible = false;
  g.add(interior.group);

  // ---------- Volumen para selección ----------
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w + 2, ridge + 1, d + 2), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, (ridge + 1) / 2, 0);
  hit.userData.buildingId = data.id;
  g.add(hit);

  scene.add(g);

  const bbox = new THREE.Box3(
    new THREE.Vector3(data.cx - w / 2, 0, data.cz - d / 2),
    new THREE.Vector3(data.cx + w / 2, ridge, data.cz + d / 2),
  );

  return {
    data,
    group: g,
    roof,
    roofMats,
    wallMat,
    interior: interior.group,
    interiorLabels: interior.labels,
    stats: interior.stats,
    hit,
    bbox,
    docks,
    roofT: 0,
    roofTarget: 0,
  };
}

function dockXs(n, w) {
  const xs = [];
  const left = Math.ceil(n / 2), right = n - left;
  const step = 4.6;
  for (let i = 0; i < left; i++) xs.push(-(5.6 + i * step));
  for (let i = 0; i < right; i++) xs.push(5.6 + i * step);
  return xs.filter((x) => Math.abs(x) < w / 2 - 2);
}

function dockSpan(n, w) {
  const xs = dockXs(n, w);
  return Math.max(...xs.map(Math.abs)) + 2.2;
}
