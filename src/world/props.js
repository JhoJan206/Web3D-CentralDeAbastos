import * as THREE from 'three';
import { MAT } from './materials.js';
import { Batch, rng, pick, boxGeo } from './utils.js';
import { HIGHWAY } from '../data/layout.js';

const CAR_COLORS = [0xf5f5f5, 0xd32f2f, 0x212121, 0x9e9e9e, 0x1565c0, 0xfbc02d, 0xbdbdbd, 0x37474f, 0x0d47a1, 0xff7043, 0x2e7d32, 0xeeeeee];
const BLACK = 0x1a1a1a, GLASS = 0x1b2730;

// Especificaciones locales: eje X = hacia adelante
const SPEC = {
  car: (c) => [
    [0, 0.3, 0, 4.4, 0.75, 1.85, c],
    [-0.3, 1.05, 0, 2.3, 0.6, 1.65, GLASS, 'glass'],
    [-0.3, 1.64, 0, 2.0, 0.08, 1.6, c],
    ...wheels([1.4, -1.4], 0.85),
  ],
  taxi: () => SPEC.car(0xf6c40f),
  truck: (c, box = 0xf2f2f2) => [
    [0, 0.5, 0, 8.2, 0.35, 1.2, 0x333333],
    [3.1, 0.6, 0, 1.9, 2.3, 2.3, c],
    [4.06, 1.75, 0, 0.06, 0.85, 2.0, GLASS, 'glass'],
    [-1.0, 0.95, 0, 6.0, 2.8, 2.45, box],
    ...wheels([3.2, -2.2, -3.2], 1.05),
  ],
  mula: (c, box = 0xeeeeee) => [
    [0, 0.55, 0, 16, 0.35, 1.2, 0x333333],
    [6.7, 0.6, 0, 2.4, 2.9, 2.5, c],
    [7.92, 2.0, 0, 0.06, 0.9, 2.2, GLASS, 'glass'],
    [6.7, 3.5, 0, 1.8, 0.6, 2.4, c],
    [-1.6, 1.25, 0, 13.6, 2.9, 2.55, box],
    ...wheels([6.9, 4.8, -5.0, -6.3, -7.6], 1.1),
  ],
};
function wheels(xs, zo) {
  const out = [];
  for (const x of xs) for (const s of [-1, 1]) out.push([x, 0, s * zo, 0.8, 0.8, 0.3, BLACK]);
  return out;
}

export class VehicleBatch {
  constructor() {
    this.body = new Batch(MAT.plastic);
    this.glass = new Batch(MAT.glass);
  }
  add(type, x, z, ry, ...args) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const [lx, ly, lz, sx, sy, sz, col, kind] of SPEC[type](...args)) {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      (kind === 'glass' ? this.glass : this.body).add(wx, ly, wz, sx, sy, sz, col, ry);
    }
  }
  build(group) {
    group.add(this.body.build());
    group.add(this.glass.build({ cast: false }));
  }
}

const geoCache = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const matCache = new Map();
const paintMat = (col) => {
  if (!matCache.has(col)) matCache.set(col, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 }));
  return matCache.get(col);
};
function vehicleMesh(type, ...args) {
  const g = new THREE.Group();
  for (const [lx, ly, lz, sx, sy, sz, col, kind] of SPEC[type](...args)) {
    const m = new THREE.Mesh(geoCache, kind === 'glass' ? MAT.glass : paintMat(col));
    m.position.set(lx, ly, lz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

export function buildProps(scene, site, buildings) {
  const group = new THREE.Group();
  group.name = 'props';
  const r = rng(42);
  const vb = new VehicleBatch();

  // Carros en el parqueadero de visitantes
  for (const [x, z, facing] of site.carSpots) {
    if (r() < 0.32) continue;
    const ry = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    vb.add(r() < 0.08 ? 'taxi' : 'car', x, z, ry + (r() - 0.5) * 0.05, pick(r, CAR_COLORS));
  }
  // Tractomulas y camiones en espera
  site.truckSpots.forEach(([x, z], i) => {
    if (r() < 0.4) return;
    const ry = Math.PI / 2;
    if (r() < 0.6) vb.add('mula', x, z, ry, pick(r, [0xc62828, 0x1565c0, 0xf2f2f2, 0x2e7d32, 0xf9a825]), pick(r, [0xeeeeee, 0xdddddd, 0x90a4ae, 0xffffff]));
    else vb.add('truck', x, z - 3, ry, pick(r, [0xf2f2f2, 0x1565c0, 0xef6c00]), pick(r, [0xffffff, 0xe0e0e0]));
  });
  // Camiones en los muelles
  for (const b of buildings) {
    for (const dk of b.docks) {
      if (r() < 0.35) continue;
      const big = b.data.id === 'p2' || r() < 0.3;
      const half = big ? 8.4 : 4.2;
      const zc = dk.z + dk.sign * (half + 0.4 + (big ? 0 : 0.2));
      const ry = dk.sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      const ox = big ? 1.6 : 1.0; // la caja va detrás del centro
      if (big) vb.add('mula', dk.x, zc + dk.sign * ox, ry, pick(r, [0xf2f2f2, 0x1565c0, 0xc62828]), b.data.id === 'p2' ? 0xf5f7fa : pick(r, [0xeeeeee, 0x90a4ae]));
      else vb.add('truck', dk.x, zc + dk.sign * ox, ry, pick(r, [0xf2f2f2, 0x2e7d32, 0xef6c00, 0x1565c0]), 0xffffff);
    }
  }
  // Carros sobre la vía perimetral
  vb.add('car', -60, -104 + 1.8, 0, 0x1565c0);
  vb.add('truck', 30, 53, Math.PI, 0xf2f2f2, 0xffffff);
  vb.add('car', 147, 10, Math.PI / 2, 0xd32f2f);
  vb.build(group);

  // Tráfico en la autopista
  const traffic = [];
  for (const cw of [HIGHWAY.near, HIGHWAY.far]) {
    const lw = (cw.z1 - cw.z0 - 1.2) / 3;
    for (let lane = 0; lane < 3; lane++) {
      const z = cw.z0 + 0.6 + lw * (lane + 0.5);
      const n = 5 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const t = r();
        const type = lane === 0 && cw.dir < 0 ? (t < 0.5 ? 'mula' : 'truck') : lane === 2 && cw.dir > 0 ? (t < 0.5 ? 'mula' : 'truck') : t < 0.1 ? 'taxi' : t < 0.82 ? 'car' : 'truck';
        const m = vehicleMesh(type, pick(r, CAR_COLORS), pick(r, [0xffffff, 0xeeeeee, 0xcfd8dc]));
        m.rotation.y = cw.dir > 0 ? 0 : Math.PI;
        m.position.set(-800 + ((k + 0.2 + r() * 0.6) * 1600) / n, 0.05, z);
        const speed = (type === 'mula' ? 15 : type === 'truck' ? 17 : 22 + r() * 6) * cw.dir;
        traffic.push({ m, speed });
        group.add(m);
      }
    }
  }

  scene.add(group);
  return {
    group,
    update(dt) {
      for (const v of traffic) {
        v.m.position.x += v.speed * dt;
        if (v.m.position.x > 820) v.m.position.x -= 1640;
        if (v.m.position.x < -820) v.m.position.x += 1640;
      }
    },
  };
}
