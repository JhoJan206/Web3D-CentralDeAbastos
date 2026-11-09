import * as THREE from 'three';
import { MAT, layer, LAYER } from './materials.js';
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
  const glassMat = MAT.glass.clone();
  const roofMats = [roofMat, skyMat, trussMat, glassMat];

  const glass = new Batch(MAT.glass);
  const dark = new Batch(MAT.door);
  const paint = new Batch(MAT.paint);
  const misc = new Batch(MAT.generic);

  // ---------- Plataforma de concreto alrededor (andenes y patios de maniobra) ----------
  const dockF = data.docks.front > 0 ? 14 : 4;
  const dockB = data.docks.back > 0 ? 14 : 4;
  const front = data.publicFront ? 1.2 : dockF;
  // andén lateral angosto: entre pabellones pasan vías vehiculares (plano)
  const apron = roundedRectShape(-w / 2 - 1.2, -d / 2 - dockB, w / 2 + 1.2, d / 2 + front, 1.2);
  if (type !== 'service') g.add(flatMesh(apron, layer(MAT.concrete, LAYER.apron), 0.06));

  // Zonas verdes laterales junto a los muelles (como en la maqueta)
  const greenPatch = (side, sign) => {
    const n = data.docks[side];
    if (!n) return;
    const span = dockSpan(n, w);
    const zEdge = sign * (d / 2);
    const z0 = zEdge + sign * 1.5, z1 = zEdge + sign * 12;
    if (w / 2 - span > 5) {
      g.add(slabMesh(roundedRectShape(span + 1.5, z0, w / 2 + 0.8, z1, 2.2), layer(MAT.grass, 12), 0.22, 0.07));
      g.add(slabMesh(roundedRectShape(-w / 2 - 0.8, z0, -span - 1.5, z1, 2.2), layer(MAT.grass, 12), 0.22, 0.07));
    }
  };
  greenPatch('front', 1);
  greenPatch('back', -1);
  if (data.publicFront) {
    // plazoleta de acceso y jardineras del frente (como las de la maqueta: esquinas y a lado y lado de la puerta)
    g.add(flatMesh(roundedRectShape(-5.8, d / 2, 5.8, d / 2 + 7.4, 0.8), layer(MAT.concrete, LAYER.apron), 0.06));
    for (const [a, b] of [[-w / 2 + 0.2, -w / 2 + 2.8], [-8.6, -6], [6, 8.6], [w / 2 - 2.8, w / 2 - 0.2]]) {
      g.add(slabMesh(roundedRectShape(a, d / 2 + 0.4, b, d / 2 + 7.4, 1.2), layer(MAT.grass, 12), 0.22, 0.07));
    }
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
  } else if (type === 'service') {
    // patio/recinto con muros perimetrales y portón hacia la vía perimetral (+z)
    const H = eave;
    for (const s of [-1, 1]) {
      const wl = mesh(boxGeo(t, H, d), wallMat);
      wl.position.set(s * (w / 2 - t / 2), H / 2, 0);
      walls.add(wl);
    }
    const wb = mesh(boxGeo(w, H, t), wallMat);
    wb.position.set(0, H / 2, -d / 2 + t / 2);
    walls.add(wb);
    const G = data.gate || 6;
    const seg = (w - G) / 2;
    for (const s of [-1, 1]) {
      const wf = mesh(boxGeo(seg, H, t), wallMat);
      wf.position.set(s * (G / 2 + seg / 2), H / 2, d / 2 - t / 2);
      walls.add(wf);
    }
    // coronación de los muros
    misc.add(0, H, -d / 2 + t / 2, w + 0.2, 0.15, t + 0.2, 0xcfcac0);
    for (const s of [-1, 1]) {
      misc.add(s * (w / 2 - t / 2), H, 0, t + 0.2, 0.15, d + 0.2, 0xcfcac0);
      misc.add(s * (G / 2 + seg / 2), H, d / 2 - t / 2, seg + 0.2, 0.15, t + 0.2, 0xcfcac0);
      misc.add(s * (G / 2 + 0.2), 0, d / 2 - t / 2, 0.45, H + 0.4, 0.45, 0x9aa0a6); // columnas del portón
    }
    if (data.roofed) {
      // puerta metálica de doble hoja y rejillas de ventilación
      dark.add(0, FLOOR, d / 2 + 0.04, G - 0.2, H - 1.2, 0.12, 0x59616a);
      for (const s of [-1, 1]) for (let z = -d / 2 + 3; z <= d / 2 - 3; z += 3.5) dark.add(s * (w / 2 + 0.03), H - 1.8, z, 0.1, 0.9, 2, 0x3a4046);
    } else {
      // portón corredizo abierto, recogido contra el muro
      dark.add(G / 2 + G / 4, 0.2, d / 2 + 0.35, G / 2, Math.min(2.6, H - 0.4), 0.1, 0x4e555c);
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
  } else if (type === 'flat') {
    // un solo piso: una franja de ventanas
    const y = 1.3;
    for (let z = -d / 2 + 3; z <= d / 2 - 3; z += 3.6) {
      for (const s of [-1, 1]) glass.add(s * (w / 2 + 0.03), y, z, 0.1, 2.0, 2.8, 0x1b2730);
    }
    for (let x = -w / 2 + 3; x <= w / 2 - 3; x += 3.6) {
      for (const s of [-1, 1]) glass.add(x, y, s * (d / 2 + 0.03), 2.8, 2.0, 0.1, 0x1b2730);
    }
    // acceso principal sobre la vía peatonal (fachada oeste) con marquesina
    glass.add(-w / 2 - 0.05, FLOOR, 8, 0.12, 2.9, 6, 0x24333d);
    misc.add(-w / 2 - 1.6, 3.6, 8, 3.2, 0.25, 9, 0xdedcd6);
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
      misc.add(0, 5.2, zf + sign * 3, 11.4, 0.3, 6, 0xdedcd6); // marquesina
      for (const x of [-5.2, 5.2]) misc.add(x, 0, zf + sign * 5.5, 0.3, 5.2, 0.3, 0x9aa0a6);
      // franjas peatonales
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
    // cada faldón se arma en piezas dejando el hueco del tragaluz, para ver el interior a través de él
    const sw = Math.max(3, w * 0.13); // ancho del tragaluz medido sobre la pendiente
    const r0 = 0.5, r1 = 0.5 + sw, Ls = d * 0.62, Dz = d + ov * 2;
    const piece = (s, ra, rb, za, zb, mat, thick, cast = true) => {
      const rc = (ra + rb) / 2;
      const p = mesh(boxGeo(rb - ra, thick, zb - za), mat, { cast });
      p.position.set(s * Math.cos(a) * rc, ridge - Math.sin(a) * rc + th / 2, (za + zb) / 2);
      p.rotation.z = -s * a;
      roof.add(p);
      return p;
    };
    for (const s of [-1, 1]) {
      piece(s, 0, r0, -Dz / 2, Dz / 2, roofMat, th);
      piece(s, r1, L, -Dz / 2, Dz / 2, roofMat, th);
      piece(s, r0, r1, -Dz / 2, -Ls / 2, roofMat, th);
      piece(s, r0, r1, Ls / 2, Dz / 2, roofMat, th);
      // tragaluz translúcido a lo largo de la cumbrera (la franja clara de la maqueta)
      piece(s, r0, r1, -Ls / 2, Ls / 2, skyMat, 0.1, false);
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
  } else if (type === 'flat' || data.roofed) {
    const H = eave;
    const W2 = w - 0.8, D2 = d - 0.8;
    const slabPiece = (x0, x1, z0, z1) => {
      const sp = mesh(boxGeo(x1 - x0, 0.35, z1 - z0), roofMat);
      sp.position.set((x0 + x1) / 2, H, (z0 + z1) / 2);
      roof.add(sp);
    };
    if (type === 'flat') {
      // losa con el hueco del tragaluz (cuadro claro de la maqueta), translúcido
      const zc = -d * 0.1, hs = 2.5;
      slabPiece(-W2 / 2, W2 / 2, -D2 / 2, zc - hs);
      slabPiece(-W2 / 2, W2 / 2, zc + hs, D2 / 2);
      slabPiece(-W2 / 2, -hs, zc - hs, zc + hs);
      slabPiece(hs, W2 / 2, zc - hs, zc + hs);
      const sk = mesh(boxGeo(hs * 2, 0.12, hs * 2), skyMat, { cast: false });
      sk.position.set(0, H + 0.12, zc);
      roof.add(sk);
      const units = new Batch(trussMat);
      for (let k = 0; k < 4; k++) units.add(0, H + 0.35, -d / 2 + 10 + k * 16 + (k >= 2 ? 6 : 0), 3.2, 1.6, 2.2, 0x9aa1a8);
      roof.add(units.build());
    } else {
      slabPiece(-W2 / 2, W2 / 2, -D2 / 2, D2 / 2);
      const units = new Batch(trussMat);
      units.add(-w / 4, H + 0.35, 0, 1.6, 0.9, 1.6, 0x9aa1a8);
      units.add(w / 4, H + 0.35, 0, 1.6, 0.9, 1.6, 0x9aa1a8);
      roof.add(units.build());
    }
  }
  roof.traverse((o) => { if (o.isMesh) o.userData.roofPart = true; });
  g.add(roof);

  // ventanas, puertas y portones también por la cara interior de los muros (visibles al quitar el techo)
  const mirrorInside = (batch) => {
    const extra = [];
    for (const [x, y, z, sx, sy, sz, col, ry] of batch.items) {
      if (sx <= 0.16 && Math.abs(Math.abs(x) - w / 2) < 0.25) extra.push([Math.sign(x) * (w / 2 - t - 0.05), y, z, sx, sy, sz, col, ry, 0, 0]);
      else if (sz <= 0.17 && Math.abs(Math.abs(z) - d / 2) < 0.25) extra.push([x, y, Math.sign(z) * (d / 2 - t - 0.05), sx, sy, sz, col, ry, 0, 0]);
    }
    batch.items.push(...extra);
  };
  mirrorInside(glass);
  mirrorInside(dark);
  g.add(glass.build({ cast: false }));
  g.add(dark.build({ cast: false }));
  g.add(misc.build());
  const pm = paint.build({ cast: false });
  pm.material = layer(MAT.paint, LAYER.paint);
  g.add(pm);

  // ---------- Interior ----------
  const interior = buildInterior(data);
  interior.group.visible = false;
  g.add(interior.group);

  // ---------- Volumen para selección ----------
  const hh = type === 'service' ? Math.max(ridge, 10) : ridge;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w + 2, hh + 1, d + 2), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, (hh + 1) / 2, 0);
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
