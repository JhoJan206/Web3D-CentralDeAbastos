import * as THREE from 'three';

// Caja con UV en metros (para texturas con repeat = 1/tile)
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // orden de caras: px, nx, py, ny, pz, nz (4 vértices cada una)
  const dims = [
    [d, h], [d, h],
    [w, d], [w, d],
    [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
    }
  }
  return g;
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0, opts) {
  const m = mesh(boxGeo(w, h, d), mat, opts);
  m.position.set(x, y + h / 2, z);
  return m;
}

// Polígono plano en el suelo a partir de puntos [x, z]
export function flatShape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

export function roundedRectShape(x0, z0, x1, z1, r) {
  const s = new THREE.Shape();
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
  const az = Math.min(z0, z1), bz = Math.max(z0, z1);
  r = Math.min(r, (bx - ax) / 2, (bz - az) / 2);
  // en coords de shape: y = -z
  const y0 = -bz, y1 = -az;
  s.moveTo(ax + r, y0);
  s.lineTo(bx - r, y0);
  s.quadraticCurveTo(bx, y0, bx, y0 + r);
  s.lineTo(bx, y1 - r);
  s.quadraticCurveTo(bx, y1, bx - r, y1);
  s.lineTo(ax + r, y1);
  s.quadraticCurveTo(ax, y1, ax, y1 - r);
  s.lineTo(ax, y0 + r);
  s.quadraticCurveTo(ax, y0, ax + r, y0);
  return s;
}

export function flatMesh(shape, mat, y = 0, curveSegments = 8) {
  const g = new THREE.ShapeGeometry(shape, curveSegments);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

// Losa con espesor (extrusión) – para bordillos y zonas verdes elevadas
export function slabMesh(shape, mat, h, y = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  m.castShadow = false;
  return m;
}

// Lote de cajas instanciadas con color por instancia
const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class Batch {
  constructor(material, geometry = unitBox) {
    this.material = material;
    this.geometry = geometry;
    this.items = [];
  }
  // x,y(base),z, ancho(x), alto(y), fondo(z), color, rotY
  add(x, y, z, sx, sy, sz, color = 0xffffff, ry = 0, rx = 0, rz = 0) {
    this.items.push([x, y, z, sx, sy, sz, color, ry, rx, rz]);
    return this;
  }
  build({ cast = true, receive = true } = {}) {
    const n = this.items.length;
    const im = new THREE.InstancedMesh(this.geometry, this.material, Math.max(n, 1));
    im.count = n;
    this.items.forEach(([x, y, z, sx, sy, sz, color, ry, rx, rz], i) => {
      _e.set(rx, ry, rz);
      _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
      im.setMatrixAt(i, _m);
      im.setColorAt(i, _c.set(color));
    });
    im.castShadow = cast;
    im.receiveShadow = receive;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  }
}

// Generador pseudoaleatorio determinista
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const pick = (r, arr) => arr[(r() * arr.length) | 0];
