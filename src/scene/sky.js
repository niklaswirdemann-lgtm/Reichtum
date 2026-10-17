import * as THREE from 'three';
import { clamp, lerp } from './util.js';

// Himmel-Kuppel mit Verlauf + Sonne, Licht und Nebel abhängig von der „Tageszeit“ (= Tour-Fortschritt).
const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // immer ganz hinten
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, h), 0.8)) : mix(uHorizon, uBottom, smoothstep(0.0, -0.2, h));
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.12);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Keyframes: Morgen → Mittag → goldene Stunde.
// Sommer an der Nordsee: Sonnenaufgang im Nordosten, Untergang im Nordwesten.
const KEYS = [
  { p: 0.0, elev: 16, azim: 62, top: '#74a5d8', horizon: '#f6e3d3', bottom: '#d3c6ba', sun: '#ffe0bf', sunI: 2.3, hemiSky: '#cbdcf0', hemiGround: '#6e7856', hemiI: 1.55, fog: '#e4e2df', water: '#c4d3de', cloud: '#fff1ea' },
  { p: 0.45, elev: 54, azim: 170, top: '#3c7fcf', horizon: '#cfe3f1', bottom: '#b9c9cf', sun: '#fff6e8', sunI: 2.8, hemiSky: '#cfe3f6', hemiGround: '#6c7a52', hemiI: 1.5, fog: '#cfe0ea', water: '#b5d2e6', cloud: '#ffffff' },
  { p: 0.78, elev: 22, azim: 268, top: '#4a78b4', horizon: '#f6d7b0', bottom: '#c9b49a', sun: '#ffd29a', sunI: 2.6, hemiSky: '#e0d2c4', hemiGround: '#6f6a48', hemiI: 1.6, fog: '#e8d6bf', water: '#d6c7b4', cloud: '#fff2e0' },
  { p: 1.0, elev: 7, azim: 300, top: '#3f5f94', horizon: '#ffb168', bottom: '#b88f72', sun: '#ffa457', sunI: 2.5, hemiSky: '#f2c8a6', hemiGround: '#5e5240', hemiI: 1.35, fog: '#efc49c', water: '#f0b98a', cloud: '#ffd3ad' },
];
const COLOR_KEYS = ['top', 'horizon', 'bottom', 'sun', 'hemiSky', 'hemiGround', 'fog', 'water', 'cloud'];
const parsed = KEYS.map((k) => ({ ...k, ...Object.fromEntries(COLOR_KEYS.map((c) => [c, new THREE.Color(k[c])])) }));

export function createSky(scene, quality) {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() },
    uSunColor: { value: new THREE.Color() },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, side: THREE.BackSide, depthWrite: false }),
  );
  dome.scale.setScalar(1800);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

  const hemi = new THREE.HemisphereLight('#ffffff', '#555555', 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  scene.add(sun, sun.target);
  if (quality === 'high') {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 1; s.far = 400;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
  }

  scene.fog = new THREE.Fog('#dddddd', 90, 820);
  const state = { cloud: new THREE.Color(), water: new THREE.Color(), sunDir: new THREE.Vector3() };

  function set(progress, focus, water) {
    const p = clamp(progress);
    let i = 0;
    while (i < parsed.length - 2 && p > parsed[i + 1].p) i++;
    const a = parsed[i], b = parsed[i + 1];
    const t = clamp((p - a.p) / (b.p - a.p));
    const k = t * t * (3 - 2 * t);
    const mix = (key, target) => target.copy(a[key]).lerp(b[key], k);

    const elev = THREE.MathUtils.degToRad(lerp(a.elev, b.elev, k));
    const azim = THREE.MathUtils.degToRad(lerp(a.azim, b.azim, k));
    // Azimut: 90° = Osten (+x), 180° = Süden (+z), 270° = Westen (-x)
    state.sunDir.set(Math.sin(azim) * Math.cos(elev), Math.sin(elev), -Math.cos(azim) * Math.cos(elev)).normalize();

    mix('top', uniforms.uTop.value);
    mix('horizon', uniforms.uHorizon.value);
    mix('bottom', uniforms.uBottom.value);
    mix('sun', uniforms.uSunColor.value);
    uniforms.uSunDir.value.copy(state.sunDir);

    mix('sun', sun.color);
    sun.intensity = lerp(a.sunI, b.sunI, k);
    mix('hemiSky', hemi.color);
    mix('hemiGround', hemi.groundColor);
    hemi.intensity = lerp(a.hemiI, b.hemiI, k);
    mix('fog', scene.fog.color);
    mix('cloud', state.cloud);
    mix('water', state.water);

    // Sonne folgt dem Fokus (Segway), damit die Schattenkarte scharf bleibt
    sun.position.copy(focus).addScaledVector(state.sunDir, 160);
    sun.target.position.copy(focus);

    if (water) {
      water.uniforms.uSky.value.copy(state.water);
      water.uniforms.uSunDir.value.copy(state.sunDir);
      water.uniforms.uSunColor.value.copy(sun.color);
    }
    return state;
  }

  return { set, dome, sun, hemi };
}
