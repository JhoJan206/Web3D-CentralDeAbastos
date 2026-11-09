import * as THREE from 'three';
import { MAT } from './materials.js';
import { Batch, rng, pick } from './utils.js';

const F = 0.45; // piso interior

const FRUIT = [0xc62828, 0xef6c00, 0xfbc02d, 0x7cb342, 0x558b2f, 0x6a1b9a, 0x8d6e63, 0xd84315, 0xf9a825, 0x2e7d32, 0xad1457];
const CLOTHES = [0x1e88e5, 0xe53935, 0xfdd835, 0x43a047, 0xffffff, 0x37474f, 0xff7043, 0x8e24aa, 0x00897b, 0x5d4037];
const WOOD = 0xb08d57;

const personGeo = new THREE.CapsuleGeometry(0.24, 1.15, 3, 8).translate(0, 0.82, 0);
const headGeo = new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.72, 0);
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16).translate(0, 0.5, 0);

class Ctx {
  constructor(data, seed) {
    this.data = data;
    this.r = rng(seed);
    this.g = new THREE.Group();
    this.box = new Batch(MAT.generic);
    this.metal = new Batch(MAT.metal);
    this.plastic = new Batch(MAT.plastic);
    this.glass = new Batch(MAT.vitrina);
    this.paint = new Batch(MAT.paint);
    this.people = new Batch(MAT.plastic, personGeo);
    this.heads = new Batch(MAT.generic, headGeo);
    this.cyl = new Batch(MAT.generic, cylGeo);
    this.labels = [];
    this.stats = {};
  }
  // una sola etiqueta por texto dentro de cada edificio
  label(text, x, z, y = 6) {
    if (this.labels.some((l) => l.text === text)) return;
    this.labels.push({ text, pos: [this.data.cx + x, y, this.data.cz + z] });
  }
  person(x, z) {
    const sc = 0.9 + this.r() * 0.2;
    this.people.add(x, F, z, 1, sc, 1, pick(this.r, CLOTHES));
    this.heads.add(x, F + (sc - 1) * 1.64, z, 1, 1, 1, pick(this.r, [0x8d5524, 0xc68642, 0xe0ac69, 0x6b4423]));
  }
  crowd(n, x0, x1, z0, z1, avoid) {
    let k = 0, tries = 0;
    while (k < n && tries < n * 20) {
      tries++;
      const x = x0 + this.r() * (x1 - x0), z = z0 + this.r() * (z1 - z0);
      if (avoid && avoid(x, z)) continue;
      this.person(x, z);
      k++;
    }
  }
  wall(x, z, sx, sz, h = 3.2, color = 0xe9e7e1) { this.box.add(x, F, z, sx, h, sz, color); }
  // pared con vano de puerta centrado (orientada en X o en Z)
  wallDoor(x, z, len, axis, door = 1.2, h = 3.2, color = 0xe9e7e1) {
    const seg = (len - door) / 2;
    if (axis === 'x') {
      this.wall(x - door / 2 - seg / 2, z, seg, 0.15, h, color);
      this.wall(x + door / 2 + seg / 2, z, seg, 0.15, h, color);
    } else {
      this.wall(x, z - door / 2 - seg / 2, 0.15, seg, h, color);
      this.wall(x, z + door / 2 + seg / 2, 0.15, seg, h, color);
    }
  }
  pallet(x, z, ry = 0, y = F) {
    this.box.add(x, y, z, 1.2, 0.15, 1.0, WOOD, ry);
    return y + 0.15;
  }
  goodsStack(x, z, y, kind) {
    const r = this.r;
    const h = 0.6 + r() * 0.9;
    let c;
    if (kind === 'sacks') c = pick(r, [0xd7c9a7, 0xcbb994, 0xe3d7bb, 0xbfae8a]);
    else if (kind === 'film') c = pick(r, [0xdfe9ef, 0xcfdde6, 0xe8eef2]);
    else if (kind === 'dairy') c = pick(r, [0xffffff, 0xfff3c4, 0x90caf9, 0xf5f5f5]);
    else if (kind === 'meat') c = pick(r, [0xb71c1c, 0xc62828, 0xe57373, 0xf5f5f5]);
    else c = pick(r, [0xa1887f, 0xbcaaa4, 0xd7ccc8, 0xc62828, 0x1565c0, 0xf9a825, 0x2e7d32]);
    this.box.add(x, y, z, 1.1, h, 0.95, c);
  }
  forklift(x, z, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    this.box.add(x, F + 0.15, z, 1.2, 1.1, 2.2, 0xf2b705, ry);
    this.box.add(x - s * 0.2, F + 1.25, z - c * 0.2, 1.1, 1.1, 1.0, 0x222222, ry);
    this.metal.add(x + s * 1.2, F, z + c * 1.2, 1.0, 2.6, 0.12, 0x333333, ry);
    this.box.add(x + s * 1.5, F + 0.1, z + c * 1.5, 0.9, 0.08, 1.0, 0x333333, ry);
  }
  // estantería tipo rack a lo largo de Z
  rack(x, z0, z1, levels = 4, kind = 'mixed', depth = 1.1) {
    const bay = 2.8;
    for (let z = z0; z <= z1 + 0.01; z += bay) {
      for (const dx of [-depth / 2, depth / 2]) this.metal.add(x + dx, F, z, 0.09, levels * 1.6 + 0.4, 0.09, 0xe65100);
    }
    for (let l = 0; l < levels; l++) {
      const y = F + 0.2 + l * 1.6;
      for (const dx of [-depth / 2, depth / 2]) this.metal.add(x + dx, y, (z0 + z1) / 2, 0.08, 0.12, z1 - z0, 0x1565c0);
      for (let z = z0 + bay / 2; z < z1; z += bay) {
        for (const off of [-0.65, 0.65]) {
          if (this.r() < 0.18) continue;
          const yy = this.pallet(x, z + off, Math.PI / 2, y + 0.12);
          this.goodsStack(x, z + off, yy, kind);
        }
      }
    }
  }
  build() {
    const g = this.g;
    g.add(this.box.build());
    g.add(this.metal.build());
    g.add(this.plastic.build());
    g.add(this.cyl.build());
    g.add(this.paint.build({ cast: false }));
    g.add(this.people.build());
    g.add(this.heads.build());
    const gl = this.glass.build({ cast: false });
    gl.renderOrder = 2;
    g.add(gl);
    return { group: g, labels: this.labels, stats: this.stats };
  }
}

export function buildInterior(data) {
  const fn = { p1: frutas, p2: carnes, p3: granos, admin: administrativo, p4: institucional, sub: subestacion, rec: reciclaje, com: compostaje, tan: tanques }[data.id];
  const c = new Ctx(data, data.id.charCodeAt(data.id.length - 1) * 31 + 7);
  fn(c, data);
  return c.build();
}

// ---------------- Pabellón 1: Frutas y Verduras ----------------
function frutas(c, { w, d }) {
  const M = 5.8, H = 3.4, WALL = 0xe9e5dc;
  const SIGNS = [0x2e7d32, 0xf57c00, 0xc62828, 0x1565c0, 0x6a1b9a, 0x00897b, 0xf9a825];
  let locales = 0;
  // contenido de un local: estantería al fondo, mostrador al frente (hacia el pasillo), letrero y vendedor
  // fx: frente del local (x de la fachada), dir: +1/-1 hacia el pasillo, depth: fondo, zc: centro, len: ancho
  const local = (fx, dir, depth, zc, len) => {
    const r = c.r;
    const back = fx - dir * depth;
    // estantería con producto contra el fondo
    const sx = back + dir * 0.55;
    c.box.add(sx, F, zc, 0.8, 2.1, len - 1.2, 0x8d6e63);
    for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) {
      c.box.add(sx, F + 0.35 + l * 0.6, zc - (len - 2) / 2 + 0.4 + k * ((len - 2.4) / 3), 0.6, 0.32, 0.9, pick(r, FRUIT));
    }
    // canastillas apiladas a un costado
    for (let k = 0; k < 3; k++) c.box.add(back + dir * 1.8, F, zc + len / 2 - 0.8, 0.6, 0.3 * (1 + ((r() * 4) | 0)), 0.45, pick(r, [0x2e7d32, 0x1565c0, 0xc62828, 0x6d4c41]));
    // mostrador de atención al cliente (con paso para el vendedor)
    const cx = fx - dir * 0.5;
    c.box.add(cx, F, zc - 0.6, 0.7, 1.0, len - 2.2, 0xb59a7a);
    for (let k = 0; k < 3; k++) c.box.add(cx, F + 1.0, zc - 0.6 - (len - 3.4) / 2 + k * ((len - 3.4) / 2), 0.55, 0.22, 0.9, pick(r, FRUIT));
    c.metal.add(cx, F + 1.0, zc + (len - 2.2) / 2 - 1.2, 0.4, 0.15, 0.4, 0xb0bec5); // báscula
    // fachada: aviso y caja de la cortina enrollable
    const col = pick(r, SIGNS);
    c.box.add(fx - dir * 0.05, F + H - 0.7, zc, 0.12, 0.6, len - 0.2, col);
    c.metal.add(fx - dir * 0.25, F + H - 1.0, zc, 0.35, 0.3, len - 0.3, 0x9aa0a6);
    c.person(fx - dir * 1.4, zc + 0.6);
    locales++;
  };

  // --- islas de 2 × 2 locales con muros ---
  const islandW = M * 2;
  const xs = [-(2 + M), -(2 + islandW + 3 + M), 2 + M, 2 + islandW + 3 + M];
  const zs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) zs.push(s * (5 + M + k * (islandW + 4.5)));
  for (const ix of xs) for (const iz of zs) {
    c.wall(ix, iz, 0.15, islandW, H, WALL); // muro medianero
    for (const dz of [-M, 0, M]) c.wall(ix, iz + dz, islandW, 0.15, H, WALL); // muros divisorios
    for (const dir of [-1, 1]) for (const dz of [-M / 2, M / 2]) local(ix + dir * M, dir, M, iz + dz, M);
  }
  // --- locales perimetrales contra los muros largos (dejando libre la puerta lateral del centro) ---
  const PD = 5;
  for (const s of [-1, 1]) {
    const fx = s * (w / 2 - 0.2 - PD);
    for (let z = -d / 2 + 6 + M / 2; z < d / 2 - 6; z += M) {
      if (Math.abs(z) < 4.5) continue;
      c.wall(s * (w / 2 - 0.2 - PD / 2), z - M / 2, PD, 0.15, H, WALL);
      c.wall(s * (w / 2 - 0.2 - PD / 2), z + M / 2, PD, 0.15, H, WALL);
      local(fx, -s, PD, z, M);
    }
  }

  // pasillos demarcados
  for (const s of [-1, 1]) {
    c.paint.add(s * 2, F + 0.01, 0, 0.15, 0.01, d - 14, 0xf2d24b);
    c.paint.add(0, F + 0.01, s * 3.5, w - 14, 0.01, 0.15, 0xf2d24b);
  }
  // recepción de mercancía junto a los muelles traseros (a 6 m del muro para no tapar las puertas)
  for (let k = 0; k < 12; k++) {
    const x = (k % 6 < 3 ? -1 : 1) * (6 + (k % 3) * 8), z = -d / 2 + 7 + ((k / 6) | 0) * 2.4;
    const y = c.pallet(x, z);
    for (let j = 0; j < 4; j++) c.box.add(x - 0.3 + (j % 2) * 0.6, y + ((j / 2) | 0) * 0.32, z, 0.55, 0.3, 0.9, pick(c.r, FRUIT));
  }
  c.forklift(-3, -d / 2 + 10, 0.4);

  // compradores (menos densidad), solo en pasillos
  const ax = (v) => Math.abs(v);
  c.crowd(80, -w / 2 + 7, w / 2 - 7, -d / 2 + 12, d / 2 - 3, (x, z) => !(ax(x) < 1.8 || ax(z) < 3 || (ax(x) > 14 && ax(x) < 16.2) || (ax(x) > 28.8 && ax(x) < 31.7) || (ax(z) > 17 && ax(z) < 20.6) || (ax(z) > 33.2 && ax(z) < 36.7) || ax(z) > 50));

  c.stats.puestos = locales;
  c.label('Locales comerciales', -15.8, -10, 5);
  c.label('Pasillo central', 0, 25, 3);
  c.label('Recepción de mercancía', 0, -d / 2 + 8, 4);
}

// ---------------- Pabellón 2: Carne y Lácteos ----------------
function carnes(c, { w, d }) {
  // Cámaras de refrigeración al fondo
  // pasillo de 4,6 m junto al muro trasero: los muelles y el portón abren hacia él, no contra las cámaras
  const z0 = -d / 2 + 5, z1 = -d / 2 + 22;
  const n = 5;
  const cw = (w - 1) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.5 + cw * (i + 0.5);
    const dairy = i >= 3;
    c.box.add(x - cw / 2, F, (z0 + z1) / 2, 0.25, 5, z1 - z0, 0xf4f6f8);
    // frente con puerta
    c.box.add(x - cw / 4 - 0.8, F, z1, cw / 2 - 1.6, 5, 0.25, 0xf4f6f8);
    c.box.add(x + cw / 4 + 0.8, F, z1, cw / 2 - 1.6, 5, 0.25, 0xf4f6f8);
    c.box.add(x, F + 3.4, z1, 3.2, 1.6, 0.25, 0xf4f6f8);
    c.box.add(x, F, z1 + 0.1, 3.0, 3.4, 0.12, 0x1e5aa8);
    // evaporadores
    c.metal.add(x, F + 3.6, z0 + 1.0, 3.0, 0.8, 0.9, 0xb0bec5);
    c.metal.add(x - cw / 4, F + 3.6, z0 + 1.0, 1.4, 0.8, 0.9, 0xb0bec5);
    // contenido
    if (dairy) {
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) {
        const px = x - cw / 2 + 2.2 + r * ((cw - 4) / 2), pz = z0 + 2.8 + k * 3.1;
        const y = c.pallet(px, pz);
        c.goodsStack(px, pz, y, 'dairy');
      }
    } else {
      // rieles con canales colgadas
      for (let r = 0; r < 3; r++) {
        const rx = x - cw / 2 + 2.5 + r * ((cw - 5) / 2);
        c.metal.add(rx, F + 3.4, (z0 + z1) / 2 - 1, 0.12, 0.12, z1 - z0 - 6, 0x90a4ae);
        for (let z = z0 + 3; z < z1 - 4; z += 1.1) c.box.add(rx, F + 1.2, z, 0.55, 2.1, 0.35, pick(c.r, [0xa83232, 0xb94141, 0x9c2a2a, 0xd9a1a1]));
      }
    }
  }
  c.stats.camaras = n;

  // Vitrinas refrigeradas en dos bandas
  let locales = 0;
  const M = 5.8;
  for (const row of [-1, 1]) {
    const zc = row < 0 ? -7 : 9;
    for (let x = -w / 2 + 3 + M / 2; x < w / 2 - 3; x += M) {
      if (Math.abs(x) < 3.5) continue;
      const face = row; // frente del local
      c.wall(x, zc - face * 2.8, M, 0.15, 2.8, 0xe3e6e8);
      c.wall(x - M / 2, zc, 0.15, 5.6, 2.8, 0xe3e6e8);
      // vitrina
      c.box.add(x, F, zc + face * 2.0, M - 1, 0.85, 1.1, 0xeceff1);
      const meat = (locales + (row > 0 ? 1 : 0)) % 2 === 0;
      for (let k = 0; k < 6; k++) c.box.add(x - 2 + k * 0.8, F + 0.85, zc + face * 2.0, 0.6, 0.12, 0.8, meat ? pick(c.r, [0xc62828, 0xe57373, 0xad1457]) : pick(c.r, [0xfff8e1, 0xffecb3, 0xffffff, 0xffe082]));
      c.glass.add(x, F + 0.97, zc + face * 2.0, M - 1, 0.55, 1.1, 0xbfe6f2);
      c.metal.add(x, F, zc - face * 1.6, M - 1.2, 1.9, 0.7, 0xcfd8dc); // nevera vertical
      c.box.add(x, F + 2.8, zc + face * 2.6, M - 0.6, 0.45, 0.1, meat ? 0xc62828 : 0x1565c0);
      locales++;
    }
  }
  c.stats.locales = locales;

  // Zonas de pre-alistamiento al frente
  const zp0 = d / 2 - 22, zp1 = d / 2 - 1;
  c.wallDoor(-w / 4 - 2, zp0, w / 2 - 4, 'x', 3);
  c.wall(-4, (zp0 + zp1) / 2, 0.15, zp1 - zp0, 3.2);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) {
    const x = -w / 2 + 6 + r * 8.5, z = zp0 + 6 + k * 8;
    c.metal.add(x, F, z, 6, 0.95, 1.4, 0xc0c6cc);
    for (const s of [-1, 1]) c.person(x + (c.r() - 0.5) * 3, z + s * 1.2);
  }
  // segunda zona con cuartos pequeños (según plano)
  c.wallDoor(w / 4 + 2, zp0, w / 2 - 4, 'x', 3);
  c.wall(4, (zp0 + zp1) / 2, 0.15, zp1 - zp0, 3.2);
  c.wallDoor(w / 4 + 2, zp0 + 9, w / 2 - 4, 'x', 2);
  c.wall(w / 4 + 2, zp0 + 4.5, 0.15, 9, 3.2);
  for (let k = 0; k < 5; k++) {
    const x = 9 + k * 4.6, z = zp1 - 9;
    const y = c.pallet(x, z);
    c.goodsStack(x, z, y, k % 2 ? 'meat' : 'dairy');
  }
  for (let k = 0; k < 2; k++) c.metal.add(12 + k * 10, F, zp0 + 4.5, 5, 0.95, 1.3, 0xc0c6cc);
  c.forklift(-1, zp0 - 3, Math.PI / 2);

  // pasillos
  c.paint.add(0, F + 0.01, 1, w - 6, 0.01, 0.15, 0xf2d24b);
  c.label('Cámaras de refrigeración', 0, (z0 + z1) / 2, 6.5);
  c.label('Pasillo de muelles', 0, -d / 2 + 2.5, 3);
  c.crowd(55, -w / 2 + 3, w / 2 - 3, -d / 2 + 24, zp0 - 1, (x, z) => !((z > -29 && z < -11) || (z > 13 && z < zp0 - 1) || (z > -3.5 && z < 5.5)));

  c.label('Vitrinas refrigeradas', -18, 1, 4.5);
  c.label('Zona de pre-alistamiento', -w / 4 - 2, (zp0 + zp1) / 2, 4.5);
  c.label('Pre-alistamiento y empaque', w / 4 + 2, (zp0 + zp1) / 2 + 3, 4.5);
}

// ---------------- Pabellón 3: Granos y Abarrotes ----------------
function granos(c, { w, d }) {
  // los racks arrancan a 7 m del muro trasero (frente a muelles) y los de muro paran antes de la puerta lateral
  const zr0 = -d / 2 + 7, zr1 = 6;
  c.rack(-w / 2 + 1.5, zr0, -3, 4, 'sacks');
  c.rack(-6.2, zr0, zr1, 4, 'mixed');
  c.rack(-5.0 + 0.1, zr0, zr1, 4, 'sacks');
  c.rack(5.0 - 0.1, zr0, zr1, 4, 'mixed');
  c.rack(6.2, zr0, zr1, 4, 'sacks');
  c.rack(w / 2 - 1.5, zr0, -3, 4, 'mixed');
  c.paint.add(-2.6, F + 0.01, (zr0 + zr1) / 2, 0.15, 0.01, zr1 - zr0, 0xf2d24b);
  c.paint.add(2.6, F + 0.01, (zr0 + zr1) / 2, 0.15, 0.01, zr1 - zr0, 0xf2d24b);
  c.forklift(0, -20, 0);
  c.forklift(-11, -5, Math.PI);
  c.forklift(11, -32, 0);
  c.stats.racks = 6;

  // Bodegas comerciales de abarrotes al frente
  let bodegas = 0;
  const M = 5.8;
  for (const s of [-1, 1]) {
    for (let z = zr1 + 4 + M / 2; z < d / 2 - 8; z += M) {
      const x = s * (w / 2 - 5);
      c.wall(x, z - M / 2, 10, 0.15, 3.2);
      c.wall(s * (w / 2 - 10), z - 1.6, 0.15, M - 3.0, 3.2);
      // estantería y bultos
      c.box.add(s * (w / 2 - 1.2), F, z, 1.2, 2.4, M - 1, 0x8d6e63);
      for (let k = 0; k < 5; k++) c.box.add(s * (w / 2 - 1.2), F + 0.4 + k * 0.45, z, 1.0, 0.3, M - 1.5, pick(c.r, [0xc62828, 0x1565c0, 0xf9a825, 0x2e7d32, 0xffffff, 0xff7043]));
      for (let k = 0; k < 4; k++) {
        const px = s * (w / 2 - 4.5) + (k % 2) * 1.3 * -s, pz = z - 1.3 + ((k / 2) | 0) * 1.4;
        const y = c.pallet(px, pz);
        c.goodsStack(px, pz, y, 'sacks');
      }
      c.box.add(s * (w / 2 - 8.2), F, z + 1.2, 0.7, 1.0, 2.4, 0x6d4c41); // mostrador
      c.box.add(s * (w / 2 - 9.9), F + 2.7, z + 1.4, 0.1, 0.5, 2.6, pick(c.r, [0xf57c00, 0x2e7d32, 0x1565c0]));
      bodegas++;
    }
  }
  c.stats.bodegas = bodegas;
  c.crowd(22, -9, 9, zr1 + 2, d / 2 - 3);
  c.crowd(5, -2, 2, zr0, zr1);
  c.label('Estanterías tipo rack', -12, -20, 8);
  c.label('Pasillo de montacargas', 0, -10, 3);
  c.label('Bodegas de abarrotes', 0, 30, 4.5);
}

// ---------------- Edificio Administrativo y Servicios ----------------
function administrativo(c, { w, d }) {
  const L = [-w / 2 + 0.4, -1.4], R = [1.4, w / 2 - 0.4];
  const rooms = [
    ['Gerencia', L, -40.6, -31, 'office1'],
    ['Área bancaria', L, -31, -16, 'bank'],
    ['Administración', L, -16, -1, 'open'],
    ['Control de calidad', L, -1, 11, 'lab'],
    ['Sala de reuniones', R, -40.6, -31, 'meeting'],
    ['Caja', R, -31, -21, 'cashier'],
    ['Atención al cliente', R, -21, -6, 'service'],
    ['Recepción', R, -6, 4, 'reception'],
    ['Baños', R, 4, 10, 'wc'],
    ['Baños', R, 10, 16, 'wc'],
    ['Sala de reuniones', R, 16, 25, 'meeting'],
  ];
  const DESK = 0x8d6e63, CHAIR = 0x263238;
  const desk = (x, z, ry = 0) => {
    c.box.add(x, F, z, 1.5, 0.75, 0.75, DESK, ry);
    c.box.add(x, F, z + (ry ? 0 : 0.75), 0.5, 0.5, 0.5, CHAIR, ry);
    c.box.add(x, F + 0.75, z - 0.2, 0.5, 0.35, 0.05, 0x111111, ry);
  };
  for (const [name, [x0, x1], z0, z1, kind] of rooms) {
    const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, rw = x1 - x0, rd = z1 - z0;
    // muros: hacia el corredor con puerta y divisiones
    const corridorX = x0 < 0 ? x1 : x0;
    c.wallDoor(corridorX, zc, rd, 'z', 1.1);
    c.wall(xc, z0, rw, 0.15);
    c.wall(xc, z1, rw, 0.15);
    // tono de piso por recinto
    c.paint.add(xc, F + 0.005, zc, rw - 0.2, 0.01, rd - 0.2, kind === 'wc' ? 0xd7e3ea : kind === 'lab' ? 0xe8f0f0 : 0xd8cbb5);
    if (kind === 'office1') { desk(xc, zc - 1); c.box.add(xc, F, zc + 2.4, 3, 0.45, 0.9, 0x5d4037); c.box.add(x0 + 0.8, F, zc, 0.6, 1.8, 3, 0x795548); }
    if (kind === 'meeting') {
      c.box.add(xc, F, zc, 2.2, 0.75, rd - 4, 0x6d4c41);
      for (let z = zc - (rd - 5) / 2; z <= zc + (rd - 5) / 2; z += 1.2) { c.box.add(xc - 1.5, F, z, 0.5, 0.5, 0.5, CHAIR); c.box.add(xc + 1.5, F, z, 0.5, 0.5, 0.5, CHAIR); c.person(xc + (c.r() > 0.5 ? 1.5 : -1.5), z); }
    }
    if (kind === 'bank') {
      c.box.add(xc, F, z0 + 2, rw - 1.5, 1.1, 0.7, 0x37474f);
      c.glass.add(xc, F + 1.1, z0 + 2, rw - 1.5, 0.9, 0.08, 0xbfe6f2);
      for (let k = 0; k < 3; k++) { c.box.add(x0 + 1.5 + k * 2.2, F, z0 + 0.9, 0.5, 0.5, 0.5, CHAIR); c.person(x0 + 1.5 + k * 2.2, z0 + 3.4 + k * 1.2); }
      for (let k = 0; k < 2; k++) c.box.add(x0 + 0.5, F, z1 - 3 + k * 1.5, 0.8, 1.9, 0.9, 0x1565c0); // cajeros automáticos
      for (let k = 0; k < 5; k++) c.box.add(xc + 1, F, z1 - 6 + k * 0.9, 1.6, 0.45, 0.5, 0x546e7a);
    }
    if (kind === 'open') for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { desk(x0 + 2 + r * 3.6, z0 + 2 + k * 3.3); if (c.r() > 0.3) c.person(x0 + 2 + r * 3.6, z0 + 2.9 + k * 3.3); }
    if (kind === 'lab') {
      c.box.add(x0 + 0.9, F, zc, 1.0, 0.9, rd - 2, 0xeceff1);
      c.box.add(xc + 1, F, zc, 1.4, 0.9, rd - 5, 0xeceff1);
      for (let k = 0; k < 6; k++) c.box.add(x0 + 0.9, F + 0.9, z0 + 1.6 + k * 1.5, 0.4, 0.4, 0.4, pick(c.r, FRUIT));
      c.metal.add(x1 - 0.6, F, z0 + 1.2, 0.8, 1.9, 1.6, 0xb0bec5);
      c.person(xc, zc); c.person(xc + 2, zc + 2);
    }
    if (kind === 'cashier') {
      c.box.add(xc, F, z0 + 3.5, rw - 1.5, 1.1, 0.7, 0x37474f);
      for (let k = 0; k < 3; k++) { c.box.add(x0 + 1.6 + k * 2.2, F, z0 + 2.4, 0.5, 0.5, 0.5, CHAIR); c.person(x0 + 1.6 + k * 2.2, z0 + 5.5); }
      c.metal.add(x1 - 0.8, F, z0 + 0.8, 0.9, 1.4, 0.9, 0x455a64); // caja fuerte
    }
    if (kind === 'service') {
      for (let k = 0; k < 3; k++) { desk(xc, z0 + 2.5 + k * 4.2, 0); c.person(xc, z0 + 4.4 + k * 4.2); }
      c.box.add(x1 - 0.8, F, zc, 0.6, 0.45, rd - 3, 0x546e7a);
    }
    if (kind === 'reception') {
      c.box.add(xc - 0.5, F, zc, 1.0, 1.1, rd - 4, 0xd7ccc8);
      c.box.add(xc - 0.5, F + 1.1, zc, 1.2, 0.06, rd - 3.6, 0x5d4037);
      c.person(xc - 1.7, zc); c.person(xc + 1.6, zc - 1);
      c.cyl.add(x1 - 0.7, F, z0 + 0.8, 0.7, 0.6, 0.7, 0x6d4c41); c.cyl.add(x1 - 0.7, F + 0.6, z0 + 0.8, 1.1, 1.3, 1.1, 0x2e7d32);
    }
    if (kind === 'wc') {
      for (let k = 0; k < 3; k++) {
        c.wall(x1 - 1.6, z0 + 1.5 + k * 1.6 + 0.8, 3.0, 0.08, 2.1, 0xcfd8dc);
        c.plastic.add(x1 - 0.7, F, z0 + 1.5 + k * 1.6, 0.45, 0.45, 0.65, 0xffffff);
      }
      c.box.add(x0 + 0.5, F, zc, 0.6, 0.85, rd - 2, 0xeceff1);
      for (let k = 0; k < 3; k++) c.plastic.add(x0 + 0.5, F + 0.85, zc - 1.5 + k * 1.5, 0.45, 0.12, 0.4, 0xffffff);
    }
    c.label(name, xc, zc, 3.8);
  }
  // Vestíbulo de acceso (frente a la puerta principal de la fachada oeste)
  c.wall(-w / 4 - 0.5, 11, w / 2 - 1.8, 0.15);
  c.paint.add(-w / 4 - 0.5, F + 0.005, 18.5, w / 2 - 2, 0.01, 13, 0xd9d4cb);
  for (const z of [14.5, 22.5]) c.box.add(-5.5, F, z, 1.6, 0.45, 0.6, 0x546e7a);
  c.cyl.add(-2.4, F, 13, 0.7, 0.6, 0.7, 0x6d4c41); c.cyl.add(-2.4, F + 0.6, 13, 1.1, 1.3, 1.1, 0x2e7d32);
  c.person(-6, 18); c.person(-3.5, 20);
  c.label('Vestíbulo', -5, 18.5, 3.5);
  // Cafetería / restaurante al frente
  const zc0 = 26, zc1 = d / 2 - 0.4;
  c.wall(0, zc0, w - 0.8, 0.15);
  c.paint.add(0, F + 0.005, (zc0 + zc1) / 2, w - 1, 0.01, zc1 - zc0 - 0.4, 0xc9b79c);
  c.box.add(-w / 2 + 1.2, F, (zc0 + zc1) / 2, 1.2, 1.0, zc1 - zc0 - 4, 0x6d4c41);
  c.metal.add(-w / 2 + 0.6, F, (zc0 + zc1) / 2, 0.6, 2.0, zc1 - zc0 - 5, 0xb0bec5);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    const x = -3 + r * 4.2, z = zc0 + 2.5 + k * 3.3;
    c.cyl.add(x, F, z, 1.1, 0.75, 1.1, 0xf5f5f5);
    for (const [dx, dz] of [[-0.9, 0], [0.9, 0], [0, -0.9], [0, 0.9]]) c.box.add(x + dx, F, z + dz, 0.4, 0.45, 0.4, 0xd84315);
    if (c.r() > 0.4) c.person(x + 0.9, z);
  }
  c.label('Restaurante / cafetería', 2, (zc0 + zc1) / 2, 3.8);
  // corredor central
  c.paint.add(0, F + 0.005, -8, 2.6, 0.01, 65, 0xeeeeee);
  c.crowd(7, -0.9, 0.9, -38, 24);
  c.stats.recintos = rooms.length + 1;
}

// ---------------- Pabellón 4: Suministro Institucional ----------------
function institucional(c, { w, d }) {
  const zr0 = -d / 2 + 7, zr1 = -2;
  c.rack(-w / 2 + 1.2, zr0, zr1, 4, 'mixed');
  c.rack(-5.6, zr0, zr1, 4, 'sacks');
  c.rack(-4.4, zr0, zr1, 4, 'mixed');
  c.rack(4.4, zr0, zr1, 4, 'film');
  c.rack(5.6, zr0, zr1, 4, 'mixed');
  c.rack(w / 2 - 1.2, zr0, zr1, 4, 'sacks');
  // Carriles de pedidos consolidados
  const lanes = ['Colegios', 'Hospitales', 'Comedores', 'Hogares ICBF', 'Fuerza Pública'];
  const lw = (w - 4) / lanes.length;
  lanes.forEach((name, i) => {
    const x = -w / 2 + 2 + lw * (i + 0.5);
    c.paint.add(x - lw / 2, F + 0.01, 14, 0.15, 0.01, 18, 0xf2d24b);
    for (let k = 0; k < 5; k++) {
      if (c.r() < 0.2) continue;
      const z = 7 + k * 3.2;
      const y = c.pallet(x, z);
      c.goodsStack(x, z, y, 'film');
      c.box.add(x, y + 1.4, z + 0.48, 0.4, 0.3, 0.02, 0xffffff);
    }
  });
  c.paint.add(w / 2 - 2, F + 0.01, 14, 0.15, 0.01, 18, 0xf2d24b);
  // mesas de picking
  for (let k = 0; k < 3; k++) {
    c.metal.add(-9 + k * 9, F, 1.8, 5, 0.95, 1.2, 0xc0c6cc);
    c.person(-9 + k * 9 - 1, 3); c.person(-9 + k * 9 + 1.5, 0.6);
  }
  c.forklift(0, -14, 0);
  c.forklift(-8, 26, Math.PI);
  c.crowd(8, -10, 10, 24, 33);
  c.stats.carriles = lanes.length;
  c.label('Almacenamiento en racks', 0, -20, 8);
  c.label('Zona de picking', 0, 2, 3.5);
  c.label('Pedidos consolidados', 0, 15, 4);
  c.label('Despacho institucional', 0, 31, 3);
}

// ---------------- Servicios ----------------
function subestacion(c, { w, d }) {
  // transformadores con radiadores y aisladores
  for (let i = 0; i < 2; i++) {
    const x = -3.2 + i * 6.4, z = -d / 2 + 4;
    c.box.add(x, F, z, 3.2, 2.6, 2.2, 0x6f7f6a);
    for (let k = -2; k <= 2; k++) c.box.add(x + k * 0.6, F + 0.3, z + 1.25, 0.08, 1.9, 0.3, 0x5f6d5a);
    for (let k = -1; k <= 1; k++) c.cyl.add(x + k * 0.9, F + 2.6, z, 0.22, 0.9, 0.22, 0x8d6e63);
  }
  // celdas de media tensión contra el muro izquierdo
  for (let k = 0; k < 5; k++) c.metal.add(-w / 2 + 1, F, -1 + k * 1.1, 0.9, 2.2, 1.0, 0x90a4ae);
  // tableros en la esquina del fondo
  for (let k = 0; k < 2; k++) c.metal.add(w / 2 - 0.8, F, -d / 2 + 1.5 + k * 1.3, 0.6, 2.0, 1.1, 0xb0bec5);
  // planta de emergencia contra el muro derecho (la puerta del frente queda libre)
  c.box.add(w / 2 - 1.7, F, 3, 2.2, 2.3, 7, 0xf2b705);
  c.box.add(w / 2 - 1.7, F + 2.3, 5.2, 0.5, 1.2, 0.5, 0x37474f);
  c.paint.add(0, F + 0.01, 0.5, w - 3, 0.01, 0.15, 0xf2d24b);
  c.person(-2, 1.5);
  c.stats.transformadores = 2;
  c.label('Transformadores', 0, -d / 2 + 4, 4);
  c.label('Planta de emergencia', w / 2 - 2, 3, 3.5);
}

function reciclaje(c, { w, d }) {
  // banda de separación con operarios
  c.metal.add(-4, F, -1, 22, 0.9, 1.2, 0x78909c);
  c.box.add(-4, F + 0.9, -1, 22, 0.08, 1.0, 0x263238);
  for (let k = 0; k < 14; k++) c.box.add(-14 + k * 1.5 + c.r() * 0.6, F + 0.98, -1 + (c.r() - 0.5) * 0.6, 0.5, 0.25, 0.4, pick(c.r, [0x8d6e63, 0x42a5f5, 0xeceff1, 0x66bb6a, 0xffca28]));
  c.metal.add(-16, F, -1, 3, 2.6, 2.4, 0x546e7a); // tolva de alimentación
  for (let k = 0; k < 7; k++) { c.person(-12 + k * 2.8, 0.3); if (k % 2) c.person(-12 + k * 2.8, -2.4); }
  // contenedores por material contra el muro del fondo
  const cols = [[0x1565c0, 'Plástico'], [0x6d4c41, 'Cartón'], [0x2e7d32, 'Vidrio'], [0x9e9e9e, 'Metales'], [0xf9a825, 'Papel'], [0x37474f, 'Rechazo']];
  cols.forEach(([col], i) => c.box.add(-w / 2 + 3.5 + i * 4.6, F, -d / 2 + 2.2, 3.6, 1.7, 2.6, col));
  // compactadora y pacas
  c.box.add(w / 2 - 5, F, -d / 2 + 3, 4, 2.6, 2.4, 0x1e5aa8);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
    c.box.add(w / 2 - 8 + i * 1.3, F + k * 1.05, 2 + j * 1.6, 1.15, 1.0, 1.4, pick(c.r, [0xa1887f, 0x8d6e63, 0x90caf9, 0xcfd8dc]));
  }
  c.forklift(w / 2 - 6, 6, -Math.PI / 2);
  c.stats.contenedores = cols.length;
  c.label('Banda de separación', -4, -1, 4);
  c.label('Contenedores por material', -w / 2 + 14, -d / 2 + 2, 4);
  c.label('Compactadora y pacas', w / 2 - 6, 1, 4);
}

function compostaje(c, { w, d }) {
  const n = 6, bw = (w - 6) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 1 + bw * (i + 0.5);
    c.box.add(x - bw / 2, F, -d / 2 + 6.5, 0.35, 1.8, 12, 0xb5b1a7);
    c.box.add(x, F + 0.0, -d / 2 + 6.5, bw - 0.8, 0.9 + (i % 3) * 0.35, 10.5, [0x5a4128, 0x6b4f2f, 0x4b3621][i % 3]);
    c.box.add(x, F + 1.0 + (i % 3) * 0.35, -d / 2 + 6.5, bw - 1.8, 0.5, 8, [0x4e3a24, 0x5d4430, 0x3f2d1c][i % 3]);
  }
  c.box.add(-w / 2 + 1 + bw * n, F, -d / 2 + 6.5, 0.35, 1.8, 12, 0xb5b1a7);
  // compost maduro, tamiz y bultos
  c.box.add(w / 2 - 4, F, -2, 4, 1.2, 6, 0x3e2b1b);
  c.metal.add(w / 2 - 4, F, 4, 3, 2.2, 2, 0x8d969e);
  for (let k = 0; k < 6; k++) { const y = c.pallet(w / 2 - 9 + (k % 3) * 1.4, 5 + ((k / 3) | 0) * 1.2); c.box.add(w / 2 - 9 + (k % 3) * 1.4, y, 5 + ((k / 3) | 0) * 1.2, 1.1, 0.7, 0.9, 0x2e7d32); }
  c.forklift(-6, 5, Math.PI / 2);
  c.person(-2, 4); c.person(8, 2);
  c.stats.bahias = n;
  c.label('Bahías de compostaje', -6, -d / 2 + 6, 3.5);
  c.label('Compost maduro y empaque', w / 2 - 6, 2, 3.5);
}

function tanques(c, { w, d }) {
  const tank = (x, col, label) => {
    c.cyl.add(x, F, -1, 10, 8.5, 10, col);
    c.cyl.add(x, F + 8.5, -1, 9.2, 0.5, 9.2, 0xdfe6ea);
    c.metal.add(x + 5.1, F, -1, 0.3, 9.2, 0.6, 0x7a8086);
    c.label(label, x, -1, 11);
  };
  tank(-11, 0x3d6f9a, 'Agua potable');
  tank(1, 0xb0413e, 'Red contra incendios');
  c.box.add(w / 2 - 5, F, -2, 6, 3.2, 7, 0xe8e6e0);
  c.box.add(w / 2 - 5, F + 3.2, -2, 6.6, 0.3, 7.6, 0x6e7479);
  c.metal.add(-4, F + 1, -7.6, 22, 0.35, 0.35, 0x1e5aa8);
  c.metal.add(2, F + 1.6, -8.4, 22, 0.35, 0.35, 0xc0392b);
  c.stats.tanques = 2;
  c.label('Cuarto de bombas', w / 2 - 5, -2, 5);
}
