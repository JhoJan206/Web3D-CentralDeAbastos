import * as THREE from 'three';
import { MAT } from './materials.js';
import { Batch, rng, pick, boxGeo } from './utils.js';
import { HIGHWAY } from '../data/layout.js';

const CAR_COLORS = [0xf5f5f5, 0xd32f2f, 0x212121, 0x9e9e9e, 0x1565c0, 0xfbc02d, 0xbdbdbd, 0x37474f, 0x0d47a1, 0xff7043, 0x2e7d32, 0xeeeeee];
const BLACK = 0x1a1a1a, GLASS = 0x1b2730;

// Especificaciones locales: eje X = hacia adelante
const HEAD = 0xfff4d6, TAIL = 0xd32020, TRIM = 0x2b2f33;
const lights = (xf, xr, y, zo, w = 0.35) => [
  [xf, y, zo, 0.06, 0.16, w, HEAD, 'light'], [xf, y, -zo, 0.06, 0.16, w, HEAD, 'light'],
  [xr, y, zo, 0.06, 0.16, w, TAIL, 'light'], [xr, y, -zo, 0.06, 0.16, w, TAIL, 'light'],
];
const SPEC = {
  car: (c) => [
    [0, 0.32, 0, 4.4, 0.55, 1.84, c], // carrocería
    [0.15, 0.87, 0, 2.5, 0.12, 1.76, c], // cintura
    [-0.25, 0.99, 0, 2.2, 0.48, 1.62, GLASS, 'glass'], // cabina
    [-0.3, 1.47, 0, 1.9, 0.08, 1.56, c], // techo
    [2.18, 0.3, 0, 0.12, 0.28, 1.86, TRIM], [-2.18, 0.3, 0, 0.12, 0.28, 1.86, TRIM], // parachoques
    ...lights(2.23, -2.23, 0.62, 0.62),
    ...wheels([1.35, -1.35], 0.86, 0.68),
  ],
  taxi: () => SPEC.car(0xf6c40f),
  truck: (c, box = 0xf2f2f2) => [
    [0, 0.5, 0, 8.2, 0.35, 1.2, 0x333333],
    [3.1, 0.62, 0, 1.9, 2.3, 2.3, c],
    [4.06, 1.75, 0, 0.06, 0.85, 2.0, GLASS, 'glass'],
    [3.1, 1.75, 1.16, 1.0, 0.6, 0.04, GLASS, 'glass'], [3.1, 1.75, -1.16, 1.0, 0.6, 0.04, GLASS, 'glass'],
    [4.1, 0.45, 0, 0.12, 0.35, 2.3, TRIM],
    [-1.0, 0.95, 0, 6.0, 2.8, 2.45, box],
    ...lights(4.13, -4.03, 0.75, 0.9),
    ...wheels([3.2, -2.2, -3.2], 1.05, 0.95),
  ],
  mula: (c, box = 0xeeeeee) => [
    [0, 0.55, 0, 16, 0.35, 1.2, 0x333333],
    [6.7, 0.65, 0, 2.4, 2.85, 2.5, c],
    [7.92, 2.0, 0, 0.06, 0.9, 2.2, GLASS, 'glass'],
    [6.7, 2.0, 1.26, 1.2, 0.7, 0.04, GLASS, 'glass'], [6.7, 2.0, -1.26, 1.2, 0.7, 0.04, GLASS, 'glass'],
    [6.6, 3.5, 0, 1.9, 0.55, 2.4, c], // deflector
    [7.98, 0.45, 0, 0.12, 0.4, 2.5, TRIM],
    [5.2, 0.9, 0, 0.6, 0.6, 2.2, 0x9aa0a6], // tanque de combustible
    [-1.6, 1.25, 0, 13.6, 2.9, 2.55, box],
    [-1.6, 4.13, 0, 13.6, 0.06, 2.6, 0xd9dcdf], // tapa del furgón
    ...lights(8.0, -8.42, 0.75, 1.0),
    ...wheels([6.9, 4.8, -5.0, -6.3, -7.6], 1.1, 1.0),
  ],
};
function wheels(xs, zo, dia = 0.8) {
  const out = [];
  for (const x of xs) for (const s of [-1, 1]) out.push([x, 0, s * zo, dia, dia, 0.3, BLACK, 'wheel']);
  return out;
}
// rueda: cilindro con el eje en Z local, apoyado en el piso
const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateX(Math.PI / 2).translate(0, 0.5, 0);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

export class VehicleBatch {
  constructor() {
    this.body = new Batch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.3 }));
    this.glass = new Batch(MAT.glass);
    this.wheel = new Batch(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 }), wheelGeo);
    this.light = new Batch(lightMat);
  }
  add(type, x, z, ry, ...args) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const [lx, ly, lz, sx, sy, sz, col, kind] of SPEC[type](...args)) {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      const b = kind === 'glass' ? this.glass : kind === 'wheel' ? this.wheel : kind === 'light' ? this.light : this.body;
      b.add(wx, ly, wz, sx, sy, sz, col, ry);
    }
  }
  build(group) {
    group.add(this.body.build());
    group.add(this.glass.build({ cast: false }));
    group.add(this.wheel.build());
    group.add(this.light.build({ cast: false }));
  }
}

const geoCache = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const matCache = new Map();
const paintMat = (col, kind) => {
  const key = col + ':' + kind;
  if (!matCache.has(key)) {
    matCache.set(key, kind === 'light' ? new THREE.MeshBasicMaterial({ color: col })
      : kind === 'wheel' ? new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.3 }));
  }
  return matCache.get(key);
};
function vehicleMesh(type, ...args) {
  const g = new THREE.Group();
  for (const [lx, ly, lz, sx, sy, sz, col, kind] of SPEC[type](...args)) {
    const m = new THREE.Mesh(kind === 'wheel' ? wheelGeo : geoCache, kind === 'glass' ? MAT.glass : paintMat(col, kind));
    m.position.set(lx, ly, lz);
    m.scale.set(sx, sy, sz);
    m.castShadow = kind !== 'light';
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
  for (const [x, z, ry] of site.carSpots) {
    if (r() < 0.32) continue;
    vb.add(r() < 0.08 ? 'taxi' : 'car', x, z, ry + (r() - 0.5) * 0.05, pick(r, CAR_COLORS));
  }
  // Tractomulas y camiones en espera
  site.truckSpots.forEach(([x, z, ry]) => {
    if (r() < 0.3) return;
    if (r() < 0.6) vb.add('mula', x, z, ry, pick(r, [0xc62828, 0x1565c0, 0xf2f2f2, 0x2e7d32, 0xf9a825]), pick(r, [0xeeeeee, 0xdddddd, 0x90a4ae, 0xffffff]));
    else vb.add('truck', x, z, ry, pick(r, [0xf2f2f2, 0x1565c0, 0xef6c00]), pick(r, [0xffffff, 0xe0e0e0]));
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
  vb.add('car', -60, -77.5, 0, 0x1565c0);
  vb.add('truck', 40, 79, Math.PI, 0xf2f2f2, 0xffffff);
  vb.add('car', 149, 10, Math.PI / 2, 0xd32f2f);
  vb.add('mula', -48.4, 40, -Math.PI / 2, 0x1565c0, 0xeeeeee); // subiendo por la vía P1 – P2
  vb.add('truck', 23.9, -30, Math.PI / 2, 0xef6c00, 0xffffff); // vía P2 – P3
  vb.build(group);

  // Tráfico en la autopista (marco local de la vía: x = a lo largo, z = perpendicular)
  const hw = site.highway;
  const traffic = [];
  for (const cw of [HIGHWAY.near, HIGHWAY.far]) {
    for (let lane = 0; lane < 2; lane++) {
      const v = cw.v0 + 0.3 + HIGHWAY.lane * (lane + 0.5);
      const heavy = cw.dir > 0 ? lane === 0 : lane === 1; // carril lento junto a la berma
      const n = 6 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const t = r();
        const type = heavy ? (t < 0.45 ? 'mula' : t < 0.8 ? 'truck' : 'car') : t < 0.1 ? 'taxi' : t < 0.9 ? 'car' : 'truck';
        const m = vehicleMesh(type, pick(r, CAR_COLORS), pick(r, [0xffffff, 0xeeeeee, 0xcfd8dc]));
        m.rotation.y = cw.dir > 0 ? 0 : Math.PI;
        m.position.set(-800 + ((k + 0.2 + r() * 0.6) * 1600) / n, 0.05, v);
        const speed = (type === 'mula' ? 15 : type === 'truck' ? 17 : 22 + r() * 6) * cw.dir;
        traffic.push({ m, speed });
        hw.add(m);
      }
    }
  }
  // vehículos usando el carril auxiliar para entrar a la central
  const auxV = (HIGHWAY.aux.v0 + HIGHWAY.near.v0) / 2;
  const m1 = vehicleMesh('mula', 0xc62828, 0xeeeeee);
  m1.position.set(62, 0.05, auxV);
  const m2 = vehicleMesh('car', 0xf5f5f5);
  m2.position.set(-78, 0.05, auxV);
  hw.add(m1, m2);

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
