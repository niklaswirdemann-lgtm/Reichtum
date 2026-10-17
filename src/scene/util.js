import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Deterministischer Zufall: gleiche Welt bei jedem Laden
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _c = new THREE.Color();

// Färbt alle Vertices einer Geometrie einheitlich (Low-Poly: Farbe über Vertex-Colors statt vieler Materialien)
export function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  _c.set(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

// Positioniert eine Geometrie (Translation, Rotation in Rad, Skalierung)
export function place(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  geo.applyMatrix4(_m);
  return geo;
}

// Box mit Unterkante auf y (praktisch für Gebäude)
export function box(w, h, d, color, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return place(paint(g, color), o);
}

export function cyl(rt, rb, h, seg, color, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(0, h / 2, 0);
  return place(paint(g, color), o);
}

export function cone(r, h, seg, color, o = {}) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(0, h / 2, 0);
  return place(paint(g, color), o);
}

export function ico(r, color, o = {}, detail = 0) {
  return place(paint(new THREE.IcosahedronGeometry(r, detail), color), o);
}

// Satteldach als Prisma (Grundfläche w x d, First entlang z), Unterkante bei y=0
export function gableRoof(w, h, d, color, o = {}) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return place(paint(g, color), o);
}

export function merge(list) {
  const geos = list.flat().filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of geos) {
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(key)) g.deleteAttribute(key);
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

// Gibt dem Browser zwischen Bauschritten Luft (keine langen Main-Thread-Blockaden)
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Kurze Pause zwischen Bauschritten (ohne auf den nächsten Frame zu warten, wo verfügbar)
export const yieldToMain = () =>
  globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0));
