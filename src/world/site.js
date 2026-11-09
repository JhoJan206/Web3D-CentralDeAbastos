import * as THREE from 'three';
import { MAT, layer, LAYER } from './materials.js';
import { Batch, flatShape, flatMesh, roundedRectShape, slabMesh, boxGeo, mesh, rng } from './utils.js';
import {
  SITE, FRONT, toUV, fromUV, backEdgeZ, HIGHWAY, ENTRANCES, ROADS, PARKING, BUILDINGS,
} from '../data/layout.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function terrainHeight(x, z) {
  // Ladera y aislamiento ambiental detrás del predio
  const d = backEdgeZ(clamp(x, -500, 500)) - z;
  let h = smooth(4, 120, d) * 30;
  h += smooth(4, 60, d) * (Math.sin(x * 0.05) * 2.2 + Math.cos(x * 0.031 + z * 0.04) * 2.8);
  // Lomas lejanas (planas a lo largo de la autopista)
  const [, v] = toUV(x, z);
  const r = Math.hypot(x * 0.8, z);
  h += smooth(330, 700, r) * (22 + Math.sin(x * 0.01) * 10) * smooth(50, 150, Math.abs(v - 12));
  return h;
}

function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function edgeLoop(points, fn) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    fn((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len, Math.atan2(-dz, dx), a, b, i);
  }
}

const W = 0xf2f2ee, Y = 0xe8b923;
const GRASS_LAYER = 12;
let GRASS;
const paintMesh = (batch) => {
  const m = batch.build({ cast: false });
  m.material = layer(MAT.paint, LAYER.paint);
  return m;
};

// Contorno del patio pavimentado: sigue el borde exterior de la vía perimetral, con esquinas redondeadas
function yardShape() {
  const { left, back, right, radius: R } = ROADS;
  const xl = left.x - left.width / 2, xr = right.x + right.width / 2, zb = back.z - back.width / 2;
  const s = new THREE.Shape();
  const P = (x, z) => [x, -z];
  s.moveTo(...P(xl, 112.5));
  s.lineTo(...P(xl, zb + R));
  s.quadraticCurveTo(...P(xl, zb), ...P(xl + R, zb));
  s.lineTo(...P(xr - R, zb));
  s.quadraticCurveTo(...P(xr, zb), ...P(xr, zb + R));
  s.lineTo(...P(xr, 80.5));
  s.closePath();
  return s;
}
const YARD_SHAPE = yardShape();
const YARD = YARD_SHAPE.getPoints(8).map((p) => [p.x, -p.y]);

// Eje de la vía perimetral: anillo cerrado alrededor de toda la central
// (izquierda → fondo → derecha → frente, pasando delante del P1 entre el pabellón y el parqueadero de visitantes)
function ringPath() {
  const { left, back, right, front, radius: R, radiusFront: Rf, radiusFrontLeft: Rl } = ROADS;
  const p = new THREE.Path();
  p.moveTo(left.x, front.z - Rl);
  p.lineTo(left.x, back.z + R);
  p.quadraticCurveTo(left.x, back.z, left.x + R, back.z);
  p.lineTo(right.x - R, back.z);
  p.quadraticCurveTo(right.x, back.z, right.x, back.z + R);
  p.lineTo(right.x, front.z - Rf);
  p.quadraticCurveTo(right.x, front.z, right.x - Rf, front.z);
  p.lineTo(left.x + Rl, front.z);
  p.quadraticCurveTo(left.x, front.z, left.x, front.z - Rl);
  return p;
}

// Cinta de vía sobre una lista de puntos [x, z]
function ribbon(pts, width, mat, y) {
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    const nx = -tz, nz = tx;
    if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (const sgn of [-1, 1]) {
      pos.push(pts[i][0] + nx * sgn * width / 2, y, pts[i][1] + nz * sgn * width / 2);
      uv.push(acc, sgn * width / 2);
    }
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

// Trazos discontinuos a lo largo de una polilínea
function dashAlong(batch, pts, color, dash = 4, gap = 5) {
  let acc = 0, next = gap / 2;
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const l = Math.hypot(x1 - x0, z1 - z0);
    while (next < acc + l) {
      const t = (next - acc) / l;
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      batch.add(x0 + (x1 - x0) * t, 0.07, z0 + (z1 - z0) * t, dash, 0.02, 0.15, color, ry);
      next += dash + gap;
    }
    acc += l;
  }
}
const sampleLine = (x0, z0, x1, z1, step = 2) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
  return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
};

export function buildSite(scene) {
  GRASS = layer(MAT.grass, GRASS_LAYER);
  const group = new THREE.Group();
  group.name = 'site';
  const labels = [];
  const r = rng(7);

  // ---------- Terreno general ----------
  const S = 1800, N = 180;
  const tg = new THREE.PlaneGeometry(S, S, N, N);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, uv = tg.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z) - 0.15);
    uv.setXY(i, x, -z);
  }
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, MAT.terrain);
  terrain.receiveShadow = true;
  group.add(terrain);

  // ---------- Predio y patio pavimentado ----------
  group.add(flatMesh(flatShape(SITE), MAT.grass, 0.0));
  // patio en concreto (como el plano) y vías en asfalto encima
  const yardMesh = new THREE.Mesh(new THREE.ShapeGeometry(YARD_SHAPE, 12).rotateX(-Math.PI / 2), layer(MAT.concrete, LAYER.yard));
  yardMesh.position.y = 0.03;
  yardMesh.receiveShadow = true;
  group.add(yardMesh);
  const curbs = new Batch(MAT.curb);
  edgeLoop(YARD, (x, z, len, ry) => curbs.add(x, 0, z, len + 0.05, 0.18, 0.3, 0xc9c6bd, ry));

  const paint = new Batch(MAT.paint);

  // ---------- Vía perimetral continua y vías internas ----------
  const { back, front, left, right, p1p2, p2p3 } = ROADS;
  const ring = ringPath().getSpacedPoints(260).map((p) => [p.x, p.y]);
  group.add(ribbon(ring, back.width, layer(MAT.asphalt, LAYER.road), 0.045));
  dashAlong(paint, ring, Y);
  for (const sgn of [-1, 1]) {
    // bordes blancos continuos del anillo
    const off = ring.map((p, i) => {
      const a = ring[Math.max(0, i - 1)], b = ring[Math.min(ring.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [p[0] - ((b[1] - a[1]) / l) * sgn * (back.width / 2 - 0.4), p[1] + ((b[0] - a[0]) / l) * sgn * (back.width / 2 - 0.4)];
    });
    group.add(ribbon(off, 0.15, layer(MAT.paint, LAYER.paint), 0.06));
  }
  const [cgx, cgz] = fromUV(ENTRANCES[1].u, -8);
  const connectors = [
    sampleLine(p1p2.x, back.z, p1p2.x, p1p2.z1),
    sampleLine(p2p3.x, back.z, p2p3.x, front.z),
    sampleLine(cgx, front.z, cgx, cgz), // acceso desde la entrada de carga
  ];
  connectors.forEach((pts, i) => {
    group.add(ribbon(pts, i === 2 ? 12 : p1p2.width, layer(MAT.asphalt, LAYER.connector), 0.047));
    dashAlong(paint, pts.slice(3, -3), Y);
  });
  // pasos peatonales donde las vías entre pabellones cruzan el anillo
  for (const rd of [p1p2, p2p3]) for (const zc of [back.z + 8, front.z - 8]) for (let k = -3; k <= 3; k++) paint.add(rd.x + k * 1.1, 0.07, zc, 0.55, 0.02, 3.2, W);
  labels.push({ text: 'Vía perimetral de servicio', pos: [-40, 2, back.z], cls: 'zone small' });
  labels.push({ text: 'Vía perimetral de servicio', pos: [60, 2, front.z], cls: 'zone small' });
  labels.push({ text: 'Vía P1 – P2', pos: [p1p2.x, 2, -20], cls: 'zone small' });
  labels.push({ text: 'Vía P2 – P3', pos: [p2p3.x, 2, -20], cls: 'zone small' });

  // ---------- Autopista Girón – Bucaramanga (en diagonal, como en el plano) ----------
  const hw = new THREE.Group();
  hw.name = 'highway';
  hw.position.set(FRONT.ox, 0, FRONT.oz);
  hw.rotation.y = FRONT.angle;
  group.add(hw);
  const L = 1800;
  const strip = (v0, v1, mat, y, h = 0.1) => {
    const m = mesh(boxGeo(L, h, v1 - v0), mat, { cast: false });
    m.position.set(0, y, (v0 + v1) / 2);
    hw.add(m);
  };
  const { near, far, median, aux, lane } = HIGHWAY;
  strip(-0.6, near.v0, MAT.concrete, -0.06); // berma / andén lado predio (queda bajo el carril auxiliar)
  strip(near.v0, near.v1, MAT.asphalt, 0.0);
  strip(far.v0, far.v1, MAT.asphalt, 0.0);
  const med = mesh(boxGeo(L, 0.35, median.v1 - median.v0), MAT.grass, { cast: false });
  med.position.set(0, 0.12, (median.v0 + median.v1) / 2);
  hw.add(med);
  strip(far.v1, far.v1 + 4, MAT.concrete, -0.03);

  // carril adicional frente a los accesos (con transiciones de entrada y salida)
  const auxShape = flatShape([
    [aux.u0 - aux.taper, near.v0], [aux.u0, aux.v0], [aux.u1, aux.v0], [aux.u1 + aux.taper, near.v0],
  ]);
  const auxMesh = flatMesh(auxShape, layer(MAT.asphalt, LAYER.lot), 0.058);
  auxMesh.renderOrder = 1;
  hw.add(auxMesh);

  const hp = new Batch(MAT.paint);
  const line = (u0, u1, v, c = W, wdt = 0.18) => hp.add((u0 + u1) / 2, 0.06, v, u1 - u0, 0.02, wdt, c);
  const dashed = (u0, u1, v, c = W, dash = 4.5, gap = 7.5) => { for (let u = u0; u < u1 - dash; u += dash + gap) hp.add(u + dash / 2, 0.06, v, dash, 0.02, 0.15, c); };
  const seg = (u0, v0, u1, v1, c = W) => {
    const du = u1 - u0, dv = v1 - v0;
    hp.add((u0 + u1) / 2, 0.06, (v0 + v1) / 2, Math.hypot(du, dv), 0.02, 0.18, c, Math.atan2(-dv, du));
  };
  // calzada cercana (hacia Bucaramanga): 2 carriles, 3 frente a la central
  line(-L / 2, aux.u0 - aux.taper, near.v0 + 0.3);
  line(aux.u1 + aux.taper, L / 2, near.v0 + 0.3);
  dashed(aux.u0 - aux.taper, aux.u1 + aux.taper, near.v0 + 0.15, W, 3, 3);
  line(aux.u0, aux.u1, aux.v0 + 0.3);
  seg(aux.u0 - aux.taper, near.v0 + 0.3, aux.u0, aux.v0 + 0.3);
  seg(aux.u1, aux.v0 + 0.3, aux.u1 + aux.taper, near.v0 + 0.3);
  dashed(-L / 2, L / 2, near.v0 + 0.3 + lane);
  line(-L / 2, L / 2, near.v1 - 0.3, Y);
  // calzada lejana (hacia Girón): siempre 2 carriles
  line(-L / 2, L / 2, far.v0 + 0.3, Y);
  dashed(-L / 2, L / 2, far.v0 + 0.3 + lane);
  line(-L / 2, L / 2, far.v1 - 0.3);

  // accesos
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd8382b, roughness: 0.5 });
  for (const e of ENTRANCES) {
    hw.add(flatMesh(roundedRectShape(e.u - e.width / 2, -10, e.u + e.width / 2, aux.v0 + 0.2, 1), layer(MAT.asphalt, LAYER.connector), 0.055));
    hw.add(slabMesh(roundedRectShape(e.u - 0.8, -8, e.u + 0.8, -1, 0.8), layer(MAT.curb, LAYER.island), 0.25, 0.05));
    const gh = mesh(boxGeo(3.2, 3, 3.2), MAT.wall);
    gh.position.set(e.u + e.width / 2 + 3, 1.5, -5);
    hw.add(gh);
    const ghr = mesh(boxGeo(4.4, 0.25, 4.4), MAT.door);
    ghr.position.set(e.u + e.width / 2 + 3, 3.1, -5);
    hw.add(ghr);
    for (const sg of [-1, 1]) {
      const b = mesh(boxGeo(e.width / 2 - 1.5, 0.12, 0.12), barrierMat);
      b.position.set(e.u + sg * (e.width / 4 + 0.2), 1.1, sg > 0 ? -2 : -7);
      hw.add(b);
    }
    hp.add(e.u - e.width / 4, 0.08, -4, 0.4, 0.02, 3, W);
    hp.add(e.u + e.width / 4, 0.08, -4, 0.4, 0.02, 3, W);
    const [lx, lz] = fromUV(e.u, -3);
    labels.push({ text: e.label, pos: [lx, 4, lz], cls: 'gate' });
  }
  hw.add(paintMesh(hp));

  const lbl = (text, u, v, cls) => { const [x, z] = fromUV(u, v); labels.push({ text, pos: [x, 1, z], cls }); };
  lbl('Autopista Girón – Bucaramanga', -10, (median.v0 + median.v1) / 2, 'road');
  lbl('Bucaramanga ▶', 250, (near.v0 + near.v1) / 2, 'road small');
  lbl('◀ Girón', -250, (far.v0 + far.v1) / 2, 'road small');

  // ---------- Parqueadero de visitantes y público (frente al Pabellón 1) ----------
  // Como el plano y la maqueta: fila de cupos pegada al frente del P1 (entre jardineras), la vía perimetral
  // atravesando el parqueadero, cupos a lo largo del lindero y una columna continua sobre el costado izquierdo.
  const V = PARKING.visitors;
  const P1 = BUILDINGS[0];
  const p1Front = P1.cz + P1.d / 2, P1L = P1.cx - P1.w / 2, P1R = P1.cx + P1.w / 2, P1X = P1.cx;
  const roadEdge = ROADS.front.z + ROADS.front.width / 2; // borde sur de la vía perimetral frontal
  const lim = (x) => 120.3 - (33 / 320) * (x + 158) - 6.2; // borde interior del lindero frontal
  const lotMat = layer(MAT.asphalt, LAYER.lot);
  group.add(flatMesh(flatShape([[V.x0, p1Front], [V.x1, p1Front], [V.x1, lim(V.x1)], [V.x0, lim(V.x0)]]), lotMat, 0.045));
  const carSpots = [];
  const D = 5, SW = 2.6;
  // fila pegada al P1, entre las jardineras de las esquinas y las de la puerta
  for (const [x0, x1] of [[P1L + 3.1, P1X - 8.9], [P1X + 8.9, P1R - 3.1]]) {
    const n = Math.floor((x1 - x0) / SW);
    for (let i = 0; i <= n; i++) paint.add(x0 + i * SW, 0.07, p1Front + 0.4 + D / 2, 0.12, 0.02, D, W);
    for (let i = 0; i < n; i++) carSpots.push([x0 + i * SW + SW / 2, p1Front + 0.4 + D / 2, Math.PI / 2]);
    paint.add(x0 + (n * SW) / 2, 0.07, p1Front + 0.4 + D, n * SW, 0.02, 0.12, W);
  }
  // columna continua sobre el costado izquierdo (junto al cerramiento), desde la mitad del P1 hasta el lindero
  const colX = -146, zTop = 6, zBot = lim(colX) - 6;
  group.add(flatMesh(flatShape([[colX - 3, zTop - 2], [colX + 3, zTop - 2], [colX + 3, zBot + 1], [colX - 3, zBot + 1]]), lotMat, 0.045));
  for (let z = zTop; z + SW <= zBot; z += SW) {
    paint.add(colX, 0.07, z, D + 0.4, 0.02, 0.12, W);
    carSpots.push([colX, z + SW / 2, Math.PI]);
  }
  paint.add(colX + D / 2 + 0.2, 0.07, (zTop + zBot) / 2, 0.12, 0.02, zBot - zTop, W);
  // fila a lo largo del lindero (paralela a la autopista)
  const vp = new Batch(MAT.paint);
  const vA = -11.4, vB = -6.4;
  const uA = toUV(colX + 5, lim(colX + 5))[0], uB = toUV(V.x1 - 9, lim(V.x1 - 9))[0];
  for (let u = uA; u + SW <= uB; u += SW) {
    vp.add(u, 0.07, (vA + vB) / 2, 0.12, 0.02, D, W);
    carSpots.push([...fromUV(u + SW / 2, (vA + vB) / 2), FRONT.angle - Math.PI / 2]);
  }
  vp.add((uA + uB) / 2, 0.07, vA, uB - uA, 0.02, 0.12, W);
  hw.add(paintMesh(vp));
  // isla verde redondeada junto a la entrada general (lado del parqueadero)
  hw.add(slabMesh(roundedRectShape(ENTRANCES[0].u - ENTRANCES[0].width / 2 - 4.5, vA - 0.5, ENTRANCES[0].u - ENTRANCES[0].width / 2 - 0.6, -2, 2), GRASS, 0.2, 0.05));
  // isla verde a la derecha de la entrada de carga (plano)
  hw.add(slabMesh(roundedRectShape(ENTRANCES[1].u + ENTRANCES[1].width / 2 + 0.6, -11, ENTRANCES[1].u + ENTRANCES[1].width / 2 + 10, -1.5, 2.5), GRASS, 0.2, 0.05));
  // paso peatonal desde el acceso del P1 cruzando la vía perimetral
  for (let k = -2; k <= 2; k++) paint.add(P1X + k * 1.1, 0.07, ROADS.front.z, 0.55, 0.02, ROADS.front.width - 1.2, W);
  // flechas de circulación
  for (const [x, ry] of [[-120, 0], [-75, Math.PI]]) {
    paint.add(x, 0.07, roadEdge + 6, 3.5, 0.02, 0.35, W, ry);
    paint.add(x + (ry ? -1.6 : 1.6), 0.07, roadEdge + 6, 0.8, 0.02, 1.1, W, ry);
  }
  const islands = [];
  labels.push({ text: 'Parqueadero de visitantes y público', pos: [-100, 3, roadEdge + 9], cls: 'zone' });

  // ---------- Parqueadero de camiones en espera ----------
  // Bahía paralela a la autopista, abierta hacia la vía perimetral (sin franja verde), como el plano.
  const T = PARKING.trucks;
  const truckSpots = [];
  {
    // pavimento continuo desde la vía de la entrada general hasta el extremo de la bahía
    const x0 = ROADS.p1p2.x + ROADS.p1p2.width / 2 - 0.3;
    const [dx, dz] = fromUV(ENTRANCES[0].u + ENTRANCES[0].width / 2, T.v1), [cx, cz] = fromUV(T.u1, T.v1);
    group.add(flatMesh(flatShape([[x0, roadEdge - 0.3], [cx, roadEdge - 0.3], [cx, cz], [dx, dz], [x0, dz]]), layer(MAT.asphalt, LAYER.lot), 0.045));
  }
  const tp = new Batch(MAT.paint);
  tp.add((T.u0 + T.u1) / 2, 0.07, T.v0, T.u1 - T.u0 - 4, 0.02, 0.15, W);
  for (let u = T.u0 + 6; u + 18 <= T.u1 - 2; u += 19) {
    truckSpots.push([...fromUV(u + 9, (T.v0 + T.v1) / 2), FRONT.angle]);
    tp.add(u - 0.5, 0.07, (T.v0 + T.v1) / 2, 0.15, 0.02, T.v1 - T.v0 - 1, W);
  }
  for (const u of [T.u0 + 2.5]) { // flecha de sentido →
    tp.add(u, 0.07, T.v0 - 3, 3.5, 0.02, 0.35, W);
    tp.add(u + 1.6, 0.07, T.v0 - 3, 0.8, 0.02, 1.1, W);
  }
  hw.add(paintMesh(tp));
  // islas redondeadas solo en los extremos (junto a las entradas)
  hw.add(slabMesh(roundedRectShape(T.u0 - 6, T.v0, T.u0 - 0.8, -2, 2), GRASS, 0.2, 0.05));
  hw.add(slabMesh(roundedRectShape(T.u1 + 0.8, T.v0, T.u1 + 6, -2, 2), GRASS, 0.2, 0.05));
  {
    const [lx, lz] = fromUV((T.u0 + T.u1) / 2 - 15, T.v0 - 4);
    labels.push({ text: 'Parqueadero de camiones en espera', pos: [lx, 3, lz], cls: 'zone' });
  }

  // ---------- Zonas verdes según plano ----------
  // (según la maqueta: jardín grande detrás del Administrativo hasta el costado del P4, jardín al frente,
  //  y franjas junto a los muelles del P4)
  const greens = [
    [78.5, -74, 101.4, -38.6, 4], // detrás del Administrativo
    [76.8, 44.8, 99.8, 60, 3], // frente del Administrativo
    [127, -66.5, 134, -54.3, 2], // P4: costado de los muelles traseros
    [127, 20.1, 134, 31, 2], // P4: costado de los muelles frontales
  ];
  greens.forEach(([a, b, c, d, rr]) => group.add(slabMesh(roundedRectShape(a, b, c, d, rr), GRASS, 0.2, 0.04)));
  // vía peatonal entre el Pabellón 3 y el Administrativo (sin zona verde)
  group.add(slabMesh(roundedRectShape(74.2, -74.5, 78.6, 72.5, 0.6), layer(MAT.concrete, LAYER.island), 0.12, 0.04));
  for (const zc of [-71, 69.5]) for (let k = -1; k <= 1; k++) paint.add(76.4 + k * 1.2, 0.07, zc + (zc < 0 ? -9 : 9), 0.6, 0.02, 8.4, W);
  labels.push({ text: 'Vía peatonal', pos: [76.4, 2, 10], cls: 'zone small' });

  // Báscula camionera junto a la entrada de carga
  const scale = mesh(boxGeo(18, 0.3, 3.6), MAT.metal);
  scale.position.set(112, 0.15, 66);
  group.add(scale);
  const booth = mesh(boxGeo(3, 2.8, 2.6), MAT.wall);
  booth.position.set(124, 1.4, 66);
  group.add(booth);
  labels.push({ text: 'Báscula camionera', pos: [112, 3, 66], cls: 'zone small' });

  // ---------- Cerramiento perimetral ----------
  const fence = new Batch(MAT.generic);
  const posts = new Batch(MAT.metal);
  edgeLoop(SITE, (x, z, len, ry, a, b, idx) => {
    const n = Math.ceil(len / 3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t;
      if (idx === 0) {
        const [u] = toUV(px, pz);
        if (ENTRANCES.some((e) => u > e.u - e.width / 2 - 1 && u < e.u + e.width / 2 + 6)) continue;
      }
      fence.add(px, 0, pz, len / n + 0.02, 0.5, 0.25, 0xb9b5ab, ry);
      fence.add(px, 0.5, pz, len / n + 0.02, 1.7, 0.04, 0x3d4a3f, ry);
      posts.add(px - (Math.cos(ry) * (len / n)) / 2, 0, pz + (Math.sin(ry) * (len / n)) / 2, 0.1, 2.3, 0.1, 0x6f7a72);
    }
  });
  group.add(fence.build());
  group.add(posts.build());
  labels.push({ text: 'Ladera y aislamiento ambiental', pos: [-70, 10, -122], cls: 'zone' });


  // ---------- Iluminación ----------
  const poles = new Batch(MAT.metal);
  const heads = new Batch(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.35, roughness: 0.4 }));
  const pole = (x, z, ry = 0) => {
    poles.add(x, 0, z, 0.25, 10, 0.25, 0x8a9096);
    poles.add(x + Math.cos(ry) * 1.2, 9.8, z - Math.sin(ry) * 1.2, 2.6, 0.18, 0.18, 0x8a9096, ry);
    heads.add(x + Math.cos(ry) * 2.3, 9.55, z - Math.sin(ry) * 2.3, 0.9, 0.25, 0.5, 0xffffff, ry);
  };
  for (let x = -125; x <= 150; x += 32) pole(x, back.z - 6, Math.PI / 2);
  for (let x = -38; x <= 150; x += 32) pole(x, front.z - 7.5, Math.PI / 2);
  for (const x of [-135, -104, -70]) pole(x, front.z + 18, Math.PI / 2);
  for (const rd of [p1p2, p2p3]) for (let z = -60; z <= 60; z += 30) pole(rd.x + 4.6, z, Math.PI);
  for (let z = -50; z <= 60; z += 30) { pole(left.x - 6.5, z, 0); pole(right.x + 6.5, z, Math.PI); }
  islands.forEach(([x, z]) => pole(x, z, Math.PI / 2));
  for (let u = -700; u <= 700; u += 40) {
    const [x, z] = fromUV(u, (median.v0 + median.v1) / 2);
    pole(x, z, FRONT.angle + (u % 80 === 0 ? Math.PI / 2 : -Math.PI / 2));
  }
  group.add(poles.build());
  group.add(heads.build({ cast: false }));
  group.add(curbs.build({ cast: false }));
  group.add(paintMesh(paint));

  // ---------- Árboles: menos densos y repartidos por todo el terreno ----------
  const trees = [];
  const addTree = (x, z, s = 1) => trees.push([x, z, s * (0.8 + r() * 0.5)]);
  const grown = SITE.map(([x, z]) => [2 + (x - 2) * 1.03, -10 + (z + 10) * 1.04]);
  const STEP = 30;
  for (let gx = -760; gx <= 760; gx += STEP) {
    for (let gz = -760; gz <= 760; gz += STEP) {
      const x = gx + (r() - 0.5) * STEP * 0.9, z = gz + (r() - 0.5) * STEP * 0.9;
      if (insidePoly(x, z, grown)) continue;
      const [, v] = toUV(x, z);
      if (v > -4 && v < 34) continue; // corredor de la autopista
      const patch = 0.55 + 0.45 * Math.sin(x * 0.012 + Math.cos(z * 0.014) * 2.2);
      const ladera = backEdgeZ(clamp(x, -500, 500)) - z > 0 ? 0.15 : 0;
      if (r() < 0.2 * patch + ladera) addTree(x, z, 1.05 + r() * 0.4);
    }
  }
  // hilera perimetral espaciada, entre el cerramiento y el patio
  edgeLoop(SITE, (x, z, len, ry, a, b, idx) => {
    const n = Math.floor(len / 14);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      let px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t;
      const dx = 2 - px, dz = -10 - pz, dl = Math.hypot(dx, dz);
      px += (dx / dl) * 3.2; pz += (dz / dl) * 3.2;
      if (idx === 0) {
        const [u] = toUV(px, pz);
        if (ENTRANCES.some((e) => Math.abs(u - e.u) < e.width / 2 + 8)) continue;
      }
      if (insidePoly(px, pz, YARD)) continue;
      if (pz < -86 && px > 15) continue; // zona de servicios
      addTree(px, pz, 0.85);
    }
  });
  islands.forEach(([x, z]) => { addTree(x, z - 3, 0.75); addTree(x, z + 3, 0.75); });
  for (let x = 82; x <= 97; x += 7.5) { addTree(x, 55, 0.6); addTree(x, -62, 0.7); }
  group.add(buildTrees(trees));

  scene.add(group);
  return { group, labels, carSpots, truckSpots, highway: hw };
}

function buildTrees(list) {
  const g = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6).translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunks = new Batch(MAT.bark, trunkGeo);
  const crowns = new Batch(MAT.foliage, crownGeo);
  const greens = [0x3f6b2a, 0x4d7a2f, 0x35602a, 0x5b8a36, 0x456f2c, 0x2f5525, 0x6b8a3a];
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
