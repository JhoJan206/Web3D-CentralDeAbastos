import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import './style.css';

import { initMaterials } from './world/materials.js';
import { setAnisotropy } from './world/textures.js';
import { buildSite } from './world/site.js';
import { buildBuilding } from './world/building.js';
import { buildProps } from './world/props.js';
import { BUILDINGS } from './data/layout.js';
import { initInfoPanel, renderCard } from './ui/panel.js';

// ---------------------------------------------------------------- Renderer
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 1, 5000);

// ---------------------------------------------------------------- Cielo, sol y entorno
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 42), THREE.MathUtils.degToRad(215));
const sky = new Sky();
sky.scale.setScalar(10000);
const su = sky.material.uniforms;
su.turbidity.value = 4;
su.rayleigh.value = 1.2;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.8;
su.sunPosition.value.copy(sun);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
{
  const envScene = new THREE.Scene();
  const s2 = new Sky();
  s2.scale.setScalar(1000);
  Object.keys(su).forEach((k) => s2.material.uniforms[k].value = su[k].value);
  envScene.add(s2);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x55603f }));
  ground.position.y = -5;
  envScene.add(ground);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
}
scene.environmentIntensity = 0.55;
scene.fog = new THREE.Fog(0xb9c9d4, 700, 2600);

const hemi = new THREE.HemisphereLight(0xdfeaf5, 0x5a6b43, 0.9);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff1dc, 4.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(4096, 4096);
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.6;
scene.add(sunLight, sunLight.target);

function aimShadow(center, radius) {
  sunLight.position.copy(center).addScaledVector(sun, 450);
  sunLight.target.position.copy(center);
  const c = sunLight.shadow.camera;
  c.left = c.bottom = -radius;
  c.right = c.top = radius;
  c.near = 50;
  c.far = 1000;
  c.updateProjectionMatrix();
  sunLight.shadow.normalBias = radius > 120 ? 0.6 : 0.15;
}
const SITE_CENTER = new THREE.Vector3(0, 0, -10);
aimShadow(SITE_CENTER, 210);

// ---------------------------------------------------------------- Mundo
initMaterials();
const site = buildSite(scene);
const buildings = BUILDINGS.map((b) => buildBuilding(b, scene));
const props = buildProps(scene, site, buildings);
const byId = Object.fromEntries(buildings.map((b) => [b.data.id, b]));

// ---------------------------------------------------------------- Etiquetas
const zoneLabels = new THREE.Group();
scene.add(zoneLabels);
for (const l of site.labels) {
  const el = document.createElement('div');
  el.className = 'zlabel ' + (l.cls || '');
  el.textContent = l.text;
  const o = new CSS2DObject(el);
  o.position.set(...l.pos);
  zoneLabels.add(o);
}

for (const b of buildings) {
  const el = document.createElement('div');
  el.className = 'blabel';
  el.innerHTML = `<div class="box"><b>${b.data.name}</b><span>${b.data.subtitle}</span></div><div class="stem"></div><div class="dot" style="background:${b.data.accent}"></div>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); focus(b); });
  el.addEventListener('pointerenter', () => setHover(b));
  el.addEventListener('pointerleave', () => setHover(null));
  const o = new CSS2DObject(el);
  o.center.set(0.5, 1);
  if (b.data.id === 'admin') el.querySelector('.stem').style.height = '54px';
  o.position.set(b.data.cx, b.data.ridge + 1, b.data.cz);
  scene.add(o);
  b.label = o;

  const ig = new THREE.Group();
  ig.visible = false;
  for (const l of b.interiorLabels) {
    const e2 = document.createElement('div');
    e2.className = 'ilabel';
    e2.textContent = l.text;
    const lo = new CSS2DObject(e2);
    lo.position.set(...l.pos);
    ig.add(lo);
  }
  scene.add(ig);
  b.ilabels = ig;
}

// ---------------------------------------------------------------- Controles de cámara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = false;
controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
controls.minDistance = 25;
controls.maxDistance = 1100;
controls.zoomSpeed = 1.1;
controls.rotateSpeed = 0.7;
controls.panSpeed = 1.0;
controls.listenToKeyEvents(window);
controls.keyPanSpeed = 25;

let infoWasOpen = false;
const VIEWS = {
  overview: { pos: new THREE.Vector3(-90, 300, 400), target: new THREE.Vector3(5, 0, -5) },
  top: { pos: new THREE.Vector3(5, 560, -4.9), target: new THREE.Vector3(5, 0, -5) },
};
function fitView(v) {
  // en pantallas angostas se aleja la cámara
  const a = camera.aspect;
  const k = a < 1 ? 1.9 / a ** 0.6 : a < 1.4 ? 1.25 : 1;
  const dir = v.pos.clone().sub(v.target).multiplyScalar(k);
  const target = v.target.clone();
  // con el panel de datos abierto, el conjunto se corre hacia la derecha
  const panelOpen = document.getElementById('info').classList.contains('open') || infoWasOpen;
  if (panelOpen && window.innerWidth > 820) {
    const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    target.addScaledVector(right, -0.13 * dir.length());
  }
  return { pos: target.clone().add(dir), target };
}
{
  const v = fitView(VIEWS.overview);
  camera.position.copy(v.pos).add(new THREE.Vector3(-120, 220, 160));
  controls.target.copy(v.target);
}

// Animación de cámara
let tween = null;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function flyTo(pos, target, dur = 1.5, done) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur, done };
  controls.enabled = false;
}
function stepTween(dt) {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const e = ease(tween.t);
  // arco suave: se eleva un poco a mitad del recorrido
  const lift = Math.sin(Math.PI * e) * Math.min(80, tween.p0.distanceTo(tween.p1) * 0.15);
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  camera.position.y += lift;
  controls.target.lerpVectors(tween.t0, tween.t1, e);
  if (tween.t >= 1) {
    const d = tween.done;
    tween = null;
    controls.enabled = true;
    d && d();
  }
}

// ---------------------------------------------------------------- Selección
let focused = null;
let hovered = null;
let roofsOff = false;
const tooltip = document.getElementById('tooltip');

function setHover(b) {
  if (hovered === b) return;
  if (hovered) hovered.wallMat.emissive.setHex(0x000000);
  hovered = b;
  if (b && b !== focused) {
    b.wallMat.emissive.set(b.data.accent);
    b.wallMat.emissiveIntensity = 0.18;
  }
  renderer.domElement.style.cursor = b ? 'pointer' : '';
  tooltip.style.opacity = b && b !== focused ? 1 : 0;
  if (b) tooltip.textContent = `${b.data.name} · ${b.data.subtitle} — clic para entrar`;
}

function focus(b) {
  if (!b) return;
  setHover(null);
  const prev = focused;
  if (prev && prev !== b && !roofsOff) prev.roofTarget = 0;
  if (prev) { prev.label.visible = true; prev.ilabels.visible = false; }
  focused = b;
  b.roofTarget = 1;
  b.label.visible = false;
  zoneLabels.visible = false;

  const { cx, cz, w, d, eave } = b.data;
  const center = new THREE.Vector3(cx, eave * 0.15, cz);
  const radius = Math.hypot(w, d) / 2;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const fov = Math.min(vfov, hfov);
  const panelPad = window.innerWidth > 820 ? 1.18 : 1.05;
  const dist = (radius / Math.sin(fov / 2)) * 0.95 * panelPad + 10;
  // conserva el azimut actual; inclinación ~ 40° desde la vertical
  const off = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(off);
  sph.radius = dist;
  sph.phi = THREE.MathUtils.degToRad(40);
  const pos = center.clone().add(new THREE.Vector3().setFromSpherical(sph));
  // desplaza el objetivo para compensar la ficha lateral derecha
  const shiftTarget = center.clone();
  if (window.innerWidth > 820) {
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    shiftTarget.addScaledVector(right, radius * 0.28);
    pos.addScaledVector(right, radius * 0.28);
  }

  aimShadow(new THREE.Vector3(cx, 0, cz), radius + 40);
  controls.enablePan = false;
  controls.minDistance = radius * 0.35;
  controls.maxDistance = dist * 2.2;
  flyTo(pos, shiftTarget, prev ? 1.3 : 1.6, () => {
    if (focused === b) b.ilabels.visible = true;
  });
  if (!prev && window.innerWidth > 820) {
    infoWasOpen = document.getElementById('info').classList.contains('open');
    info.setOpen(false);
  }
  renderCard(b, { onBack: unfocus, onRoof: () => { b.roofTarget = b.roofTarget > 0.5 ? 0 : 1; } });
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.id === b.data.id));
}

function unfocus() {
  if (!focused) return;
  const b = focused;
  focused = null;
  if (!roofsOff) b.roofTarget = 0;
  b.label.visible = true;
  b.ilabels.visible = false;
  zoneLabels.visible = true;
  renderCard(null);
  if (infoWasOpen) info.setOpen(true);
  infoWasOpen = false;
  aimShadow(SITE_CENTER, 210);
  controls.enablePan = true;
  controls.minDistance = 25;
  controls.maxDistance = 1100;
  const v = fitView(VIEWS.overview);
  flyTo(v.pos, v.target, 1.5);
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
}

// Raycasting
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hits = buildings.map((b) => b.hit);
function pickAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const h = raycaster.intersectObjects(hits, false)[0];
  return h ? byId[h.object.userData.buildingId] : null;
}
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || down.b !== 0) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const b = pickAt(e);
  if (b && b !== focused) focus(b);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  tooltip.style.left = e.clientX + 14 + 'px';
  tooltip.style.top = e.clientY + 14 + 'px';
  if (e.buttons) return;
  setHover(pickAt(e));
});
renderer.domElement.addEventListener('pointerleave', () => setHover(null));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') unfocus(); });

// ---------------------------------------------------------------- UI
const info = initInfoPanel();
const chips = document.querySelector('#toolbar .chips');
chips.innerHTML = buildings.map((b) => `<button class="chip" data-id="${b.data.id}" title="${b.data.name} – ${b.data.subtitle}"><i style="background:${b.data.accent}"></i>${b.data.short}</button>`).join('');
chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) focus(byId[c.dataset.id]); });

document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
  if (focused) unfocus();
  const v = fitView(VIEWS[btn.dataset.view]);
  flyTo(v.pos, v.target, 1.4);
}));
document.querySelector('[data-toggle="labels"]').addEventListener('click', (e) => {
  const on = document.body.classList.toggle('hide-labels');
  e.currentTarget.setAttribute('aria-pressed', String(!on));
});
document.querySelector('[data-toggle="roofs"]').addEventListener('click', (e) => {
  roofsOff = !roofsOff;
  e.currentTarget.setAttribute('aria-pressed', String(roofsOff));
  for (const b of buildings) if (b !== focused) b.roofTarget = roofsOff ? 1 : 0;
});

// ---------------------------------------------------------------- Cubiertas
function updateRoof(b, dt) {
  const before = b.roofT;
  const speed = 1 / 1.1;
  if (b.roofT < b.roofTarget) b.roofT = Math.min(b.roofTarget, b.roofT + dt * speed);
  else if (b.roofT > b.roofTarget) b.roofT = Math.max(b.roofTarget, b.roofT - dt * speed * 1.4);
  if (b.roofT === before && b._applied) return;
  b._applied = true;
  const t = b.roofT;
  const e = ease(t);
  b.roof.position.y = e * 26;
  b.roof.rotation.x = e * 0.04;
  const op = 1 - THREE.MathUtils.smoothstep(t, 0.25, 0.95);
  for (const m of b.roofMats) {
    const base = m.userData.baseOpacity ?? (m.userData.baseOpacity = m.opacity);
    m.opacity = base * op;
    const tr = t > 0 || base < 1;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    m.depthWrite = t < 0.05;
  }
  b.roof.visible = t < 0.999;
  b.roof.traverse((o) => { if (o.isMesh) o.castShadow = t < 0.35; });
  b.interior.visible = t > 0.02;
}

// ---------------------------------------------------------------- Bucle
const clock = new THREE.Clock();
const tmin = new THREE.Vector3(-300, 0, -260), tmax = new THREE.Vector3(300, 60, 260);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepTween(dt);
  controls.update();
  if (!focused && !tween) controls.target.clamp(tmin, tmax);
  for (const b of buildings) updateRoof(b, dt);
  props.update(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
loop();
requestAnimationFrame(() => {
  document.getElementById('loader').classList.add('done');
  const v = fitView(VIEWS.overview);
  flyTo(v.pos, v.target, 2.4);
});

// acceso para depuración
window.__cda = { scene, camera, controls, buildings, focus, unfocus, renderer };
