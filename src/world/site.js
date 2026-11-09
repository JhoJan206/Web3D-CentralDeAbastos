import * as THREE from 'three';
import { MAT } from './materials.js';
import { Batch, flatShape, flatMesh, roundedRectShape, slabMesh, boxGeo, mesh, rng } from './utils.js';
import { SITE, HIGHWAY, ENTRANCES, PARKING, SERVICE_ZONES, SERVICE_Z, backEdgeZ } from '../data/layout.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function terrainHeight(x, z) {
  // Ladera detrás del predio
  const d = backEdgeZ(Math.max(-400, Math.min(400, x))) - z;
  let h = smooth(6, 110, d) * 34;
  h += smooth(6, 60, d) * (Math.sin(x * 0.05) * 2.5 + Math.cos(x * 0.031 + z * 0.04) * 3);
  // Lomas lejanas
  const r = Math.hypot(x * 0.8, z);
  h += smooth(320, 650, r) * (25 + Math.sin(x * 0.01) * 10);
  // Cerca de la autopista y del predio: plano
  if (z > -120 && z < 170 && Math.abs(x) < 240) h *= smooth(-120, -150, z);
  return h;
}

export function buildSite(scene) {
  const group = new THREE.Group();
  group.name = 'site';
  const labels = [];
  const r = rng(7);

  // ---------- Terreno general con ladera ----------
  const S = 1800, N = 180;
  const tg = new THREE.PlaneGeometry(S, S, N, N);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.pos || tg.attributes.position;
  const uv = tg.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z) - 0.15);
    uv.setXY(i, x, -z);
  }
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, MAT.terrain);
  terrain.receiveShadow = true;
  terrain.name = 'terrain';
  group.add(terrain);

  // ---------- Franja verde del predio (como el borde de la maqueta) ----------
  group.add(flatMesh(flatShape(SITE), MAT.grass, 0.0));

  // ---------- Patio pavimentado ----------
  const yard = [[-151, 99], [154, 99], [154, -142.5], [-143, -119.5]];
  group.add(flatMesh(flatShape(yard), MAT.asphalt, 0.03));

  // Bordillo del patio
  const curbs = new Batch(MAT.curb);
  edgeLoop(yard, (x, z, len, ry) => curbs.add(x, 0, z, len, 0.18, 0.3, 0xc9c6bd, ry));

  // ---------- Autopista Girón – Bucaramanga ----------
  const L = 1800;
  const hw = (z0, z1, mat, y) => {
    const m = mesh(boxGeo(L, 0.1, z1 - z0), mat, { cast: false });
    m.position.set(0, y, (z0 + z1) / 2);
    group.add(m);
  };
  // anden / berma frontal
  hw(105, 113, MAT.concrete, -0.02);
  hw(HIGHWAY.near.z0, HIGHWAY.near.z1, MAT.asphalt, 0.0);
  hw(HIGHWAY.far.z0, HIGHWAY.far.z1, MAT.asphalt, 0.0);
  const med = mesh(boxGeo(L, 0.35, HIGHWAY.median.z1 - HIGHWAY.median.z0), MAT.grass, { cast: false });
  med.position.set(0, 0.12, (HIGHWAY.median.z0 + HIGHWAY.median.z1) / 2);
  group.add(med);
  hw(146, 152, MAT.concrete, -0.02);

  const paint = new Batch(MAT.paint);
  const W = 0xf2f2ee, Y = 0xe8b923;
  for (const cw of [HIGHWAY.near, HIGHWAY.far]) {
    // bordes continuos
    paint.add(0, 0.06, cw.z0 + 0.6, L, 0.02, 0.18, W);
    paint.add(0, 0.06, cw.z1 - 0.6, L, 0.02, 0.18, cw === HIGHWAY.near ? Y : Y);
    const lw = (cw.z1 - cw.z0 - 1.2) / 3;
    for (let k = 1; k < 3; k++) {
      const z = cw.z0 + 0.6 + lw * k;
      for (let x = -L / 2; x < L / 2; x += 12) paint.add(x, 0.06, z, 4.5, 0.02, 0.15, W);
    }
  }
  labels.push({ text: 'Autopista Girón – Bucaramanga', pos: [-40, 1, 130], cls: 'road' });
  labels.push({ text: '◀ Girón', pos: [-230, 1, 139], cls: 'road small' });
  labels.push({ text: 'Bucaramanga ▶', pos: [230, 1, 120], cls: 'road small' });

  // ---------- Accesos ----------
  for (const e of ENTRANCES) {
    const s = roundedRectShape(e.x - e.width / 2, 96, e.x + e.width / 2, 113.2, 1);
    group.add(flatMesh(s, MAT.asphalt, 0.05));
    // isla central con talanquera
    group.add(slabMesh(roundedRectShape(e.x - 0.8, 100, e.x + 0.8, 109, 0.8), MAT.curb, 0.25, 0.05));
    const gh = mesh(boxGeo(3.2, 3, 3.2), MAT.wall);
    gh.position.set(e.x + e.width / 2 + 3, 1.5, 103);
    group.add(gh);
    const ghr = mesh(boxGeo(4.4, 0.25, 4.4), MAT.door);
    ghr.position.set(e.x + e.width / 2 + 3, 3.1, 103);
    group.add(ghr);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd8382b, roughness: 0.5 });
    for (const sgn of [-1, 1]) {
      const b = mesh(boxGeo(e.width / 2 - 1.5, 0.12, 0.12), barrierMat);
      b.position.set(e.x + sgn * (e.width / 4 + 0.2), 1.1, 101 + (sgn > 0 ? 6 : 0));
      group.add(b);
    }
    // flechas de sentido
    paint.add(e.x - e.width / 4, 0.08, 106, 0.4, 0.02, 3, W);
    paint.add(e.x + e.width / 4, 0.08, 104, 0.4, 0.02, 3, W);
    labels.push({ text: e.label, pos: [e.x, 4, 108], cls: 'gate' });
  }

  // ---------- Vías internas: eje demarcado ----------
  const dashX = (x0, x1, z) => { for (let x = x0; x < x1; x += 9) paint.add(x, 0.07, z, 4, 0.02, 0.15, Y); };
  const dashZ = (z0, z1, x) => { for (let z = z0; z < z1; z += 9) paint.add(x, 0.07, z, 0.15, 0.02, 4, Y); };
  dashX(-140, 150, 55);
  dashX(-128, 150, -104);
  dashZ(-104, 55, 149);
  dashZ(-95, 55, -144);

  // ---------- Parqueadero de visitantes ----------
  const V = PARKING.visitors;
  const carSpots = [];
  const stallRow = (x0, x1, z, depth, facing) => {
    for (let x = x0; x <= x1; x += 2.6) {
      paint.add(x, 0.07, z + (facing * depth) / 2, 0.12, 0.02, depth, W);
      if (x + 2.6 <= x1) carSpots.push([x + 1.3, z + (facing * depth) / 2, facing]);
    }
    paint.add((x0 + x1) / 2, 0.07, z + facing * depth, x1 - x0, 0.02, 0.12, W);
  };
  stallRow(V.x0 + 2, V.x1 - 2, 59, 5, 1);
  stallRow(V.x0 + 2, V.x1 - 2, 76, 5, -1);
  stallRow(V.x0 + 2, V.x1 - 2, 76, 5, 1);
  stallRow(V.x0 + 2, V.x1 - 2, 98, 5, -1);
  // islas verdes con árboles en el parqueadero
  const islands = [];
  for (let x = V.x0 + 14; x < V.x1 - 6; x += 26) {
    const s = roundedRectShape(x - 1.3, 71, x + 1.3, 81, 1.2);
    group.add(slabMesh(s, MAT.grass, 0.2, 0.04));
    islands.push([x, 76]);
  }
  labels.push({ text: 'Parqueadero de visitantes y público', pos: [(V.x0 + V.x1) / 2, 3, 86], cls: 'zone' });

  // ---------- Parqueadero de camiones en espera ----------
  const T = PARKING.trucks;
  const truckSpots = [];
  for (let x = T.x0; x <= T.x1; x += 4.6) {
    paint.add(x, 0.07, T.z0 + 9, 0.15, 0.02, 18, W);
    if (x + 4.6 <= T.x1) truckSpots.push([x + 2.3, T.z0 + 9]);
  }
  paint.add((T.x0 + T.x1) / 2, 0.07, T.z0, T.x1 - T.x0, 0.02, 0.15, W);
  labels.push({ text: 'Parqueadero de camiones en espera', pos: [(T.x0 + T.x1) / 2, 3, 90], cls: 'zone' });

  // ---------- Zonas verdes ----------
  const greens = [
    [-151, 99, -40, 104.5],
    [-12, 99, 114, 104.5],
    [134, 99, 154, 104.5],
    [-36, 56, -1, 62],
    [109, 58, 154, 96],
  ];
  greens.forEach(([a, b, c, d]) => group.add(slabMesh(roundedRectShape(a, b, c, d, 2.5), MAT.grass, 0.2, 0.04)));
  // pasillo verde entre P3 y Administrativo
  group.add(slabMesh(roundedRectShape(68, -40, 74, 20, 2), MAT.grass, 0.2, 0.04));

  // ---------- Cerramiento perimetral ----------
  const fence = new Batch(MAT.generic);
  const posts = new Batch(MAT.metal);
  const gaps = ENTRANCES.map((e) => [e.x - e.width / 2 - 0.5, e.x + e.width / 2 + 7]);
  edgeLoop(SITE, (x, z, len, ry, a, b) => {
    const n = Math.ceil(len / 3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t;
      if (Math.abs(pz - 105) < 0.5 && gaps.some(([g0, g1]) => px > g0 && px < g1)) continue;
      fence.add(px, 0, pz, len / n + 0.02, 0.5, 0.25, 0xb9b5ab, ry);
      fence.add(px, 0.5, pz, len / n + 0.02, 1.7, 0.04, 0x3d4a3f, ry);
      posts.add(px - Math.cos(ry) * (len / n) / 2, 0, pz + Math.sin(ry) * (len / n) / 2, 0.1, 2.3, 0.1, 0x6f7a72);
    }
  });
  const fenceMesh = fence.build({ cast: true });
  group.add(fenceMesh);
  group.add(posts.build());
  labels.push({ text: 'Ladera y aislamiento ambiental', pos: [-10, 18, -175], cls: 'zone' });

  // ---------- Zona de servicios (fondo) ----------
  buildServices(group, labels);

  // ---------- Postes de iluminación ----------
  const poles = new Batch(MAT.metal);
  const heads = new Batch(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.35, roughness: 0.4 }));
  const pole = (x, z, ry = 0) => {
    poles.add(x, 0, z, 0.25, 10, 0.25, 0x8a9096);
    poles.add(x + Math.cos(ry) * 1.2, 9.8, z - Math.sin(ry) * 1.2, 2.6, 0.18, 0.18, 0x8a9096, ry);
    heads.add(x + Math.cos(ry) * 2.3, 9.55, z - Math.sin(ry) * 2.3, 0.9, 0.25, 0.5, 0xffffff, ry);
  };
  for (let x = -140; x <= 150; x += 30) pole(x, 52.5, Math.PI / 2 + Math.PI);
  for (let x = -120; x <= 150; x += 30) pole(x, -107, Math.PI / 2);
  for (let z = -90; z <= 40; z += 30) { pole(-146.5, z, 0); pole(151.5, z, Math.PI); }
  for (let x = -140; x <= -40; x += 26) pole(x + 13, 76, Math.PI / 2);
  for (let x = -700; x <= 700; x += 40) pole(x, 129.5, x % 80 === 0 ? Math.PI / 2 : -Math.PI / 2);
  group.add(poles.build());
  group.add(heads.build({ cast: false }));

  group.add(curbs.build({ cast: false }));
  group.add(paint.build({ cast: false }));

  // ---------- Árboles ----------
  const trees = [];
  const addTree = (x, z, s = 1) => trees.push([x, z, s * (0.8 + r() * 0.5)]);
  for (let x = -150; x < 154; x += 7) {
    if (gaps.some(([g0, g1]) => x > g0 - 3 && x < g1 + 1)) continue;
    addTree(x + r() * 2, 102 + r(), 0.9);
  }
  // borde izquierdo
  for (let t = 0.05; t < 0.95; t += 0.045) addTree(-160 + 10 * t - 0 + 4 + r(), 105 - 230 * t, 1);
  for (let z = -140; z < 95; z += 8) addTree(157 + r(), z, 0.9);
  islands.forEach(([x, z]) => { addTree(x, z - 3, 0.8); addTree(x, z + 3, 0.8); });
  for (let z = -36; z < 18; z += 7) addTree(71, z, 0.7);
  // ladera
  for (let i = 0; i < 900; i++) {
    const x = -500 + r() * 1000;
    const z = backEdgeZ(Math.max(-400, Math.min(400, x))) - 8 - r() * 220;
    addTree(x, z, 1.1 + r() * 0.6);
  }
  // otro lado de la autopista
  for (let i = 0; i < 380; i++) {
    const x = -700 + r() * 1400;
    const z = 160 + r() * 350;
    if (r() < 0.6) addTree(x, z, 1.1);
  }
  // laterales
  for (let i = 0; i < 260; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (175 + r() * 300);
    const z = -150 + r() * 250;
    addTree(x, z, 1.1);
  }
  group.add(buildTrees(trees));

  scene.add(group);
  return { group, labels, carSpots, truckSpots };
}

function edgeLoop(points, fn) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ry = Math.atan2(-dz, dx);
    fn((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len, ry, a, b);
  }
}

function buildTrees(list) {
  const g = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6).translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1).translate(0, 0, 0);
  const trunks = new Batch(MAT.bark, trunkGeo);
  const crowns = new Batch(MAT.foliage, crownGeo);
  const greens = [0x3f6b2a, 0x4d7a2f, 0x35602a, 0x5b8a36, 0x456f2c, 0x2f5525];
  const r = rng(99);
  for (const [x, z, s] of list) {
    const y = terrainHeight(x, z) - 0.2;
    const h = 3.2 * s;
    trunks.add(x, y, z, s, h, s, 0x5b4330);
    const cr = 2.6 * s;
    crowns.add(x, y + h + cr * 0.55, z, cr * (0.9 + r() * 0.3), cr * (0.8 + r() * 0.3), cr * (0.9 + r() * 0.3), greens[(r() * greens.length) | 0], r() * 6);
  }
  g.add(trunks.build());
  g.add(crowns.build());
  return g;
}

function buildServices(group, labels) {
  const z0 = SERVICE_Z.z0, z1 = SERVICE_Z.z1, zc = (z0 + z1) / 2, zd = z1 - z0;
  const b = new Batch(MAT.generic);
  const m = new Batch(MAT.metal);
  const pad = (x0, x1) => {
    const s = roundedRectShape(x0, z0, x1, z1, 1.5);
    group.add(slabMesh(s, MAT.concrete, 0.15, 0.04));
  };

  for (const zn of SERVICE_ZONES) {
    pad(zn.x0, zn.x1);
    labels.push({ text: zn.label, pos: [(zn.x0 + zn.x1) / 2, 8, zc], cls: 'zone small' });
  }

  // Subestación
  {
    const zn = SERVICE_ZONES[0];
    for (let i = 0; i < 3; i++) {
      b.add(zn.x0 + 7 + i * 7, 0.2, zc - 2, 3.5, 2.8, 2.6, 0x6f7f6a);
      m.add(zn.x0 + 7 + i * 7, 3.0, zc - 2, 0.25, 1.4, 0.25, 0x9aa0a6);
    }
    b.add(zn.x1 - 9, 0.2, zc + 1, 12, 2.9, 2.6, 0xe4e2dc); // planta de emergencia (contenedor)
    b.add(zn.x1 - 9, 3.1, zc + 1, 1, 1.2, 1, 0x555a5f);
    // malla
    const fx0 = zn.x0 + 2, fx1 = zn.x0 + 26;
    b.add((fx0 + fx1) / 2, 0.2, z0 + 1.5, fx1 - fx0, 2.2, 0.06, 0x58625a);
    b.add((fx0 + fx1) / 2, 0.2, z1 - 4, fx1 - fx0, 2.2, 0.06, 0x58625a);
  }

  // Paneles solares
  {
    const zn = SERVICE_ZONES[1];
    for (let k = 0; k < 4; k++) {
      const z = z0 + 2.5 + k * 3.9;
      const len = zn.x1 - zn.x0 - 4;
      const p = mesh(boxGeo(len, 0.08, 2.6), MAT.solar);
      p.position.set((zn.x0 + zn.x1) / 2, 1.5, z);
      p.rotation.x = -0.32;
      group.add(p);
      for (let x = zn.x0 + 3; x < zn.x1 - 2; x += 6) m.add(x, 0.2, z, 0.12, 1.3, 0.12, 0x9aa0a6);
    }
  }

  // Residuos y compostaje
  {
    const zn = SERVICE_ZONES[2];
    // pilas de compostaje en bahías
    for (let i = 0; i < 6; i++) {
      const x = zn.x0 + 5 + i * 6.5;
      b.add(x - 3, 0.2, zc - 2, 0.35, 1.8, 10, 0xb5b1a7);
      b.add(x, 0.2, zc - 6.9, 6.3, 1.8, 0.35, 0xb5b1a7);
      b.add(x, 0.2, zc - 2, 5.2, 1.1 + (i % 3) * 0.25, 8.5, [0x5a4128, 0x6b4f2f, 0x4b3621][i % 3]);
    }
    b.add(zn.x0 + 5 + 6 * 6.5 - 3, 0.2, zc - 2, 0.35, 1.8, 10, 0xb5b1a7);
    // cubierta liviana sobre el compostaje
    const roof = mesh(boxGeo(40, 0.15, 13), MAT.roof);
    roof.position.set(zn.x0 + 21.5, 6, zc - 2);
    roof.rotation.x = 0.06;
    group.add(roof);
    for (let x = zn.x0 + 2; x <= zn.x0 + 41; x += 8) {
      m.add(x, 0.2, zc - 8, 0.25, 5.6, 0.25, 0x8a9096);
      m.add(x, 0.2, zc + 4, 0.25, 6.2, 0.25, 0x8a9096);
    }
    // contenedores de separación
    const cols = [0x2e7d32, 0x1565c0, 0x9e9e9e, 0x2e7d32, 0x1565c0, 0xf9a825, 0x6d4c41];
    cols.forEach((c, i) => b.add(zn.x1 - 20 + (i % 4) * 4.8, 0.2, zc + (i < 4 ? -5 : 3), 3.8, 1.6, 2.2, c));
  }

  // Tanques
  {
    const zn = SERVICE_ZONES[3];
    const tankGeo = new THREE.CylinderGeometry(5.5, 5.5, 9, 32).translate(0, 4.5, 0);
    const domeGeo = new THREE.SphereGeometry(5.5, 32, 8, 0, Math.PI * 2, 0, Math.PI / 6).translate(0, 9 - 4.76, 0);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xc7d3da, roughness: 0.35, metalness: 0.55 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x3d6f9a, roughness: 0.4, metalness: 0.4 });
    [[zn.x0 + 10, zc], [zn.x0 + 24, zc]].forEach(([x, z], i) => {
      const t = mesh(tankGeo, i ? tankMat : blue);
      t.position.set(x, 0.2, z);
      group.add(t);
      const d = mesh(domeGeo, i ? tankMat : blue);
      d.position.set(x, 0.2, z);
      group.add(d);
      m.add(x + 5.4, 0.2, z, 0.3, 9.6, 0.6, 0x7a8086); // escalera
    });
    b.add(zn.x1 - 8, 0.2, zc, 9, 3.4, 7, 0xe8e6e0); // cuarto de bombas
    b.add(zn.x1 - 8, 3.6, zc, 9.6, 0.3, 7.6, 0x6e7479);
    m.add((zn.x0 + zn.x1) / 2 - 4, 1.2, zc + 6.5, 30, 0.35, 0.35, 0xc0392b); // red contra incendio
  }

  group.add(b.build());
  group.add(m.build());
}
