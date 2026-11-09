import * as THREE from 'three';

// Texturas procedurales (sin descargas). Todas usan UV en metros + repeat = 1/tamaño de tile.

let anisotropy = 8;
export const setAnisotropy = (a) => (anisotropy = a);

function canvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(c, tile, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = anisotropy;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(ctx, size, count, colors, rMin = 0.5, rMax = 1.6) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const r = rMin + Math.random() * (rMax - rMin);
    ctx.fillRect(Math.random() * size, Math.random() * size, r, r);
  }
}

const cache = {};
const memo = (k, f) => cache[k] || (cache[k] = f());

export const asphaltTex = () =>
  memo('asphalt', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#4a4d50';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 26000, ['#3c3f42', '#55585b', '#5f6265', '#434548', '#6a6d70']);
    // manchas suaves
    for (let i = 0; i < 14; i++) {
      const g = x.createRadialGradient(Math.random() * 512, Math.random() * 512, 0, 0, 0, 0);
      x.globalAlpha = 0.06;
      x.fillStyle = Math.random() > 0.5 ? '#2c2e30' : '#6b6e70';
      x.beginPath();
      x.arc(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 70, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    return toTexture(c, 10);
  });

export const concreteTex = () =>
  memo('concrete', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#b9b6ae';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 20000, ['#aeaba3', '#c4c1b9', '#a6a39b', '#bdbab2'], 0.6, 2);
    for (let i = 0; i < 10; i++) {
      x.globalAlpha = 0.05;
      x.fillStyle = Math.random() > 0.5 ? '#8f8c85' : '#d2cfc7';
      x.beginPath();
      x.arc(Math.random() * 512, Math.random() * 512, 40 + Math.random() * 80, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    // juntas de losa (tile = 6 m)
    x.strokeStyle = 'rgba(80,78,72,0.55)';
    x.lineWidth = 3;
    x.strokeRect(0, 0, 512, 512);
    return toTexture(c, 6);
  });

export const floorTex = () =>
  memo('floor', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#c9c7c0';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 9000, ['#c1bfb8', '#d1cfc8', '#bcbab3'], 0.5, 1.5);
    x.strokeStyle = 'rgba(90,90,90,0.35)';
    x.lineWidth = 2;
    x.strokeRect(0, 0, 512, 512);
    return toTexture(c, 4);
  });

export const grassTex = () =>
  memo('grass', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#5a8238';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 40000, ['#4f7a30', '#6a9944', '#577f35', '#73a04a', '#45702a', '#7da552'], 0.8, 2.4);
    for (let i = 0; i < 20; i++) {
      x.globalAlpha = 0.07;
      x.fillStyle = Math.random() > 0.5 ? '#3d6324' : '#8cb35a';
      x.beginPath();
      x.arc(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 90, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    return toTexture(c, 8);
  });

export const terrainTex = () =>
  memo('terrain', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#5b6d3c';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 30000, ['#52643a', '#677845', '#4a5c32', '#7a7f4a', '#6c6c41', '#8a8556'], 1, 3);
    for (let i = 0; i < 30; i++) {
      x.globalAlpha = 0.08;
      x.fillStyle = ['#3f5a28', '#8a9255', '#7a6b45'][i % 3];
      x.beginPath();
      x.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 100, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    return toTexture(c, 40);
  });

// Lámina trapezoidal: nervios cada ~0.25 de tile
export const roofTex = () =>
  memo('roof', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#aab3bb';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 32) {
      const g = x.createLinearGradient(0, i, 0, i + 32);
      g.addColorStop(0, '#9aa3ab');
      g.addColorStop(0.2, '#c3cbd2');
      g.addColorStop(0.35, '#b2bac1');
      g.addColorStop(0.5, '#a7b0b8');
      g.addColorStop(1, '#9ea7af');
      x.fillStyle = g;
      x.fillRect(0, i, 256, 32);
    }
    noise(x, 256, 1500, ['rgba(120,128,135,0.4)', 'rgba(210,215,220,0.3)'], 0.5, 1.5);
    return toTexture(c, 2);
  });

export const wallTex = () =>
  memo('wall', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#eceae4';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 64) {
      x.fillStyle = 'rgba(160,158,150,0.35)';
      x.fillRect(i, 0, 2, 256);
      x.fillStyle = 'rgba(255,255,255,0.5)';
      x.fillRect(i + 2, 0, 2, 256);
    }
    noise(x, 256, 2500, ['rgba(200,198,190,0.4)', 'rgba(255,255,255,0.4)'], 0.5, 1.5);
    return toTexture(c, 4);
  });

export const solarTex = () =>
  memo('solar', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#16233d';
    x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#7f8ea8';
    x.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
    }
    const t = toTexture(c, 1);
    t.repeat.set(1, 1);
    return t;
  });
