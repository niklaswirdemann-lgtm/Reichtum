import * as THREE from 'three';
import { box, cyl, cone, ico, gableRoof, merge, paint, place, rng, yieldToMain } from './util.js';
import { dikeHeight, baseHeight, QUAY, WATER_Y, heightAt } from './terrain.js';
import { createWater } from './water.js';
import { createRouteField } from './route.js';

// Statische Welt: Boden, Deich, Watt, Wege, Gebäude & Wahrzeichen.
// Fast alles Statische wird zu wenigen Meshes mit Vertex-Colors zusammengeführt (wenige Draw-Calls).

const COL = {
  grass: '#6f9a4f', grassLight: '#8db35c', grassDark: '#557f3f', rape: '#c9c45a', field: '#9a9a55',
  dike: '#86ad5a', mud: '#8a8a7c', mudWet: '#6f7470', sand: '#d8c9a4',
  path: '#8f7d6d', road: '#5d6066', concrete: '#9a9a96', cobble: '#a59a8c',
  white: '#ece7dc', brick: '#9c4a38', brickDark: '#7b3a2c', roofDark: '#3a3d44', roofRed: '#8a3a2a',
  wood: '#6b4a32', glass: '#5d8ea8', teal: '#2fb8a8', darkGreen: '#2f4a3a',
};

// Altstadt Norden (südlich, weiter weg vom Start)
export const TOWN = {
  plaza: { x: 60, z: 224 },
  teemuseum: { x: 80, z: 252 },
  church: { x: 46, z: 282 },
  bell: { x: 26, z: 274 },
  waterTower: { x: 10, z: 252 },
  mill: { x: 108, z: 258 },
};
const TEEMUSEUM_RY = 0.62; // Fassade zum Marktplatz
const LANDMARKS = [
  { ...TOWN.plaza, r: 26 }, { ...TOWN.teemuseum, r: 11 }, { ...TOWN.church, r: 20 }, { ...TOWN.bell, r: 7 },
  { ...TOWN.waterTower, r: 8 }, { ...TOWN.mill, r: 11 }, { x: -34, z: 30, r: 24 }, { x: 10, z: 30, r: 9 }, { x: 36, z: 27, r: 17 },
];

// Boden wie heightAt, aber ohne Kaje (die ist ein eigener Block)
const groundHeight = (x, z) => baseHeight(z);

function buildGround(quality) {
  const size = 1600;
  const segX = quality === 'high' ? 200 : 110;
  // z-Reihen: grob, aber im Deichbereich dicht (sonst wird der Deich eckig)
  const zs = [];
  for (let z = -800; z <= 800; ) {
    zs.push(z);
    const fine = z > -64 && z < -20;
    z += fine ? 1.5 : quality === 'high' ? 8 : 14;
  }
  const xs = [];
  for (let i = 0; i <= segX; i++) xs.push(-size / 2 + (size * i) / segX);

  const pos = [], col = [], idx = [];
  const c = new THREE.Color(), tmp = new THREE.Color();
  const r = rng(7);
  const patch = new Map();
  const patchColor = (x, z) => {
    const key = `${Math.floor((x + 13) / 46)}:${Math.floor((z + 7) / 34)}`;
    if (!patch.has(key)) {
      const v = r();
      patch.set(key, v < 0.62 ? COL.grass : v < 0.8 ? COL.grassLight : v < 0.9 ? COL.grassDark : v < 0.96 ? COL.field : COL.rape);
    }
    return patch.get(key);
  };

  for (const z of zs) {
    for (const x of xs) {
      const h = groundHeight(x, z);
      pos.push(x, h, z);
      const dh = dikeHeight(z);
      if (h < -0.05) {
        c.set(COL.mud).lerp(tmp.set(COL.mudWet), Math.min(1, -h / 1.2));
      } else if (dh > 0.01) {
        c.set(COL.dike).lerp(tmp.set(COL.grassLight), dh / 5 * 0.4);
      } else {
        c.set(patchColor(x, z));
        // Deichfuß seeseitig: schmaler Sandstreifen
        if (z < -54 && z > -58) c.set(COL.sand);
      }
      c.offsetHSL(0, 0, (r() - 0.5) * 0.03);
      col.push(c.r, c.g, c.b);
    }
  }
  const w = xs.length;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i, b = a + 1, d = a + w, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Weg als Band entlang der Route
export function buildPath(route, width = 3.2) {
  const n = Math.ceil(route.length / 1.2);
  const pos = [], col = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color(COL.path), edge = new THREE.Color('#b8a898');
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    route.pointAt(u, p);
    route.tangentAt(u, t);
    side.crossVectors(t, up).normalize();
    for (const s of [-1, -0.82, 0.82, 1]) {
      const x = p.x + side.x * s * width / 2, z = p.z + side.z * s * width / 2;
      pos.push(x, Math.max(heightAt(x, z), p.y) + 0.13, z);
      const cc = Math.abs(s) === 1 ? edge : c;
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const a = i * 4 + k, b = a + 1, d = a + 4, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function flat(w, d, color, o) {
  return box(w, 0.06, d, color, o);
}

// Bootsrumpf (Draufsicht mit spitzem Bug), extrudiert nach oben
function hull(len, beam, height, color, o) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, -beam / 2);
  s.lineTo(len / 2 - beam * 0.9, -beam / 2);
  s.quadraticCurveTo(len / 2, -beam * 0.15, len / 2, 0);
  s.quadraticCurveTo(len / 2, beam * 0.15, len / 2 - beam * 0.9, beam / 2);
  s.lineTo(-len / 2, beam / 2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  return place(paint(g, color), o);
}

function ferry() {
  // Fähre Richtung Norderney/Juist (stilisiert)
  return merge([
    hull(62, 14, 4.2, '#1d3f6e', { y: -1.5 }),
    hull(61, 13.4, 1.4, '#f2f2ee', { y: 2.7 }),
    box(40, 3, 12.2, '#f4f4f0', { x: -6, y: 4.1 }),
    box(40.2, 0.9, 12.4, '#24323d', { x: -6, y: 5.3 }),
    box(26, 2.6, 11, '#f4f4f0', { x: -8, y: 7.1 }),
    box(26.2, 0.8, 11.2, '#24323d', { x: -8, y: 8.1 }),
    box(9, 2.4, 9, '#f4f4f0', { x: 2, y: 9.7 }),
    box(9.2, 0.7, 9.2, '#24323d', { x: 2, y: 10.6 }),
    cyl(1.4, 1.7, 5, 10, '#1d3f6e', { x: -16, y: 9.7 }),
    box(1, 4, 1, '#d23b2f', { x: -16, y: 14.6, sx: 2.9, sy: 0.25, sz: 2.9 }),
  ]);
}

function cutter(hullColor) {
  // Krabbenkutter mit Auslegern
  return merge([
    hull(17, 5, 2.6, hullColor, { y: -1.2 }),
    box(4, 2.4, 3.4, '#f1ede4', { x: -3, y: 1.4 }),
    box(4.4, 0.4, 3.8, '#2f3a44', { x: -3, y: 3.8 }),
    cyl(0.12, 0.16, 9, 6, '#3a3330', { x: 1.5, y: 1.4 }),
    cyl(0.08, 0.1, 9, 5, '#3a3330', { x: 1.5, y: 3.4, rx: 0.9 }),
    cyl(0.08, 0.1, 9, 5, '#3a3330', { x: 1.5, y: 3.4, rx: -0.9 }),
    box(0.5, 0.5, 0.5, '#e8b23a', { x: 4.6, y: 1.4 }),
  ]);
}

function windmillBody() {
  // Galerieholländer: Backstein-Sockel, Galerie, achteckiger Reetturm, weiße Kappe
  return merge([
    cyl(6.2, 7, 7, 8, COL.brick, {}),
    cyl(8, 8, 0.4, 8, '#5a4636', { y: 7 }),
    cyl(3.2, 5.6, 12, 8, '#3d4a3f', { y: 7.4 }),
    cone(3.6, 3.2, 8, '#f0eee8', { y: 19.2 }),
    box(1.2, 2.2, 0.4, '#3a2a1e', { x: 0, y: 0, z: 6.6 }),
  ]);
}

function sails() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    parts.push(box(0.5, 9.5, 0.25, '#f2efe6', { rz: a }));
    parts.push(box(1.9, 7.5, 0.12, '#d9d2c2', { rz: a, x: Math.cos(a + Math.PI / 2) * 0, y: 0 }));
  }
  parts.push(cyl(0.6, 0.6, 1.4, 8, '#2a2a2a', { rx: Math.PI / 2, z: -0.7 }));
  const g = merge(parts);
  g.translate(0, 0, 0.6);
  return g;
}

function turbineBody() {
  return merge([cyl(0.9, 1.8, 46, 10, '#eef0f0', {}), box(2.2, 2.2, 5.5, '#eef0f0', { y: 45.5, z: -0.6 })]);
}

function rotor() {
  const parts = [ico(0.9, '#eef0f0', {})];
  for (let i = 0; i < 3; i++) {
    const b = box(1.3, 22, 0.35, '#f4f6f6', { y: 0.5 });
    b.rotateZ((i * Math.PI * 2) / 3);
    parts.push(b);
  }
  return merge(parts);
}

// Schild mit Text als CanvasTexture
function sign(text, { w = 6, h = 1.4, bg = '#07131f', fg = '#2fd8c4', font = 700 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.font = `${font} ${Math.round(c.height * 0.5)}px 'Space Grotesk Variable', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

// Kleiner Segway ohne Fahrer (geparkt am Laden)
function parkedSegway(o) {
  return [
    cyl(0.42, 0.42, 0.18, 10, '#1b1f24', { ...o, x: o.x - 0.32, y: 0.42, rz: Math.PI / 2 }),
    cyl(0.42, 0.42, 0.18, 10, '#1b1f24', { ...o, x: o.x + 0.32, y: 0.42, rz: Math.PI / 2 }),
    box(0.5, 0.12, 0.4, '#2c3238', { ...o, y: 0.34 }),
    cyl(0.04, 0.04, 1.05, 5, '#15181b', { ...o, y: 0.42 }),
    box(0.62, 0.06, 0.06, '#2fd8c4', { ...o, y: 1.45 }),
  ];
}

function startArea() {
  const parts = [];
  // Dörper Weg (Ost-West)
  parts.push(flat(300, 7.5, COL.road, { y: 0.02, z: 12 }));
  parts.push(flat(300, 0.25, '#d9d5cc', { y: 0.05, z: 8.4 }), flat(300, 0.25, '#d9d5cc', { y: 0.05, z: 15.6 }));
  // Platz vor dem Laden
  parts.push(flat(26, 14, '#8c8a86', { x: 6, y: 0.03, z: 25 }));
  // SegTeam-Laden
  parts.push(box(9, 3.4, 6, COL.white, { x: 10, z: 30 }));
  parts.push(box(9.6, 0.35, 6.6, COL.teal, { x: 10, y: 3.4, z: 30 }));
  parts.push(box(2.6, 2.3, 0.12, '#2a3a46', { x: 8, z: 26.95 }));
  parts.push(box(2.2, 1.4, 0.12, '#41606f', { x: 12.4, y: 1, z: 26.95 }));
  for (let i = 0; i < 4; i++) parts.push(...parkedSegway({ x: 2 + i * 1.4, z: 24.5, y: 0 }));
  // Ocean Wave (westlich): Halle mit Wellendach
  parts.push(box(36, 6, 22, COL.glass, { x: -34, z: 30 }));
  const roof = new THREE.CylinderGeometry(12, 12, 38, 18, 1, false, 0, Math.PI);
  parts.push(place(paint(roof, '#dce9ea'), { x: -34, y: 6, z: 30, rz: Math.PI / 2, sy: 1, sx: 0.55 }));
  parts.push(box(37, 0.6, 23, '#e6efef', { x: -34, y: 5.7, z: 30 }));
  // Abenteuergolf (östlich)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) parts.push(flat(5.2, 2.2, i % 2 ? '#3f9a55' : '#4aa862', { x: 22 + i * 6, y: 0.04, z: 22 + j * 5 }));
  }
  // Mini-Leuchtturm, Piratenschiff, Felsen
  for (let k = 0; k < 5; k++) parts.push(cyl(0.7 - k * 0.07, 0.75 - k * 0.07, 0.8, 10, k % 2 ? '#f2f2ee' : '#d23b2f', { x: 46, y: k * 0.8, z: 30 }));
  parts.push(cone(0.6, 0.8, 10, '#2b2b2b', { x: 46, y: 4, z: 30 }));
  parts.push(hull(6, 2.2, 1.3, '#6b4a32', { x: 30, y: 0, z: 34, ry: 0.4 }));
  parts.push(cyl(0.08, 0.08, 4, 5, '#3a2a1e', { x: 30, y: 1, z: 34 }));
  parts.push(box(2, 1.6, 0.05, '#f2efe6', { x: 30, y: 2.4, z: 34 }));
  parts.push(ico(1.4, '#8f8a80', { x: 36, y: 0.5, z: 20 }), ico(1, '#9a958a', { x: 38, y: 0.4, z: 21 }));
  return parts;
}

function harbor() {
  const parts = [];
  // Kaje aus Beton
  const w = QUAY.x1 - QUAY.x0, d = QUAY.z1 - QUAY.z0;
  parts.push(box(w, QUAY.y + 3, d, COL.concrete, { x: (QUAY.x0 + QUAY.x1) / 2, y: -3, z: (QUAY.z0 + QUAY.z1) / 2 }));
  parts.push(box(w, 0.35, 0.6, '#d8c24a', { x: (QUAY.x0 + QUAY.x1) / 2, y: QUAY.y, z: QUAY.z0 + 0.4 }));
  for (let x = QUAY.x0 + 4; x < QUAY.x1; x += 7) parts.push(cyl(0.3, 0.35, 0.7, 8, '#2a2d31', { x, y: QUAY.y, z: QUAY.z0 + 1.4 }));
  // Terminal
  parts.push(box(12, 6, 8, COL.white, { x: -150, y: QUAY.y, z: -65 }));
  parts.push(box(12.6, 0.5, 8.6, '#1d3f6e', { x: -150, y: QUAY.y + 6, z: -65 }));
  parts.push(box(0.1, 1.6, 6, '#33505f', { x: -143.95, y: QUAY.y + 2.6, z: -65 }));
  // Molen aus Steinen
  const r = rng(11);
  const mole = (x0, z0, x1, z1) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      parts.push(ico(1.4 + r() * 0.9, r() > 0.5 ? '#77756e' : '#8a877e', { x: x0 + (x1 - x0) * t + (r() - 0.5), y: WATER_Y + 0.2, z: z0 + (z1 - z0) * t + (r() - 0.5), sy: 0.7 }));
    }
  };
  mole(-162, -70, -170, -122);
  mole(-170, -122, -150, -128);
  mole(-93, -70, -84, -118);
  // Dalben
  for (let x = -146; x < -95; x += 12) parts.push(cyl(0.35, 0.35, 5, 6, '#4a3a2c', { x, y: WATER_Y - 1, z: -96 }));
  return parts;
}

function townLandmarks() {
  const parts = [];
  const { plaza: C, teemuseum: T, church: K, bell: B, waterTower: W } = TOWN;
  // Marktplatz (Pflaster)
  parts.push(place(paint(new THREE.CylinderGeometry(25, 25, 0.08, 28), COL.cobble), { x: C.x, y: 0.03, z: C.z }));
  parts.push(place(paint(new THREE.CylinderGeometry(3, 3.4, 0.9, 12), '#8a8580'), { x: C.x - 6, y: 0, z: C.z + 8 }));
  // Teemuseum (Backstein, weiße Fensterrahmen), Fassade nach Norden zum Platz
  parts.push(merge([
    box(16, 7, 10, COL.brick),
    gableRoof(10.6, 5, 16.6, COL.roofRed, { y: 7, ry: Math.PI / 2 }),
    box(16.2, 0.6, 10.2, '#efe9dc', { y: 6.6 }),
    ...[0, 1, 2, 3].map((i) => box(1.4, 2, 0.15, '#efe9dc', { x: -5.4 + i * 3.6, y: 2.2, z: -5.05 })),
    box(1.8, 2.6, 0.15, '#3a2a1e', { z: -5.05 }),
  ]).rotateY(TEEMUSEUM_RY).translate(T.x, 0, T.z));
  // Ludgerikirche mit freistehendem Glockenturm
  parts.push(box(12, 11, 34, COL.brickDark, { x: K.x, z: K.z }));
  parts.push(gableRoof(12.6, 8, 34.6, COL.roofDark, { x: K.x, y: 11, z: K.z }));
  parts.push(box(8, 20, 8, COL.brickDark, { x: B.x, z: B.z }));
  parts.push(cone(6.5, 10, 4, COL.roofDark, { x: B.x, y: 20, z: B.z, ry: Math.PI / 4 }));
  // Wasserturm
  parts.push(cyl(3.2, 3.8, 24, 12, COL.brick, { x: W.x, z: W.z }));
  parts.push(cyl(5.6, 4.4, 7, 12, '#a85540', { x: W.x, y: 24, z: W.z }));
  parts.push(cone(6, 4, 12, '#3f5a52', { x: W.x, y: 31, z: W.z }));
  return parts;
}

// Häuser (instanziert: Wände + Dächer getrennt, damit beide eigene Farbtöne bekommen)
function houseGeometries() {
  const walls = merge([
    box(1, 1, 1, '#ffffff'),
    // Fensterbänder (dunkel, leicht vorstehend)
    box(0.7, 0.18, 1.02, '#202830', { y: 0.55 }),
    box(1.02, 0.18, 0.5, '#202830', { y: 0.55 }),
  ]);
  const roof = gableRoof(1.08, 0.7, 1.08, '#ffffff', { y: 1 });
  return { walls, roof };
}

function housePlacements(route) {
  const r = rng(23);
  const dist = createRouteField(route);
  const stationPts = route.stations.map((st) => route.pointAt(st.u));
  const list = [];
  // Häuser halten Abstand zur Route und zu den Stationen (dort schwenkt die Kamera)
  const add = (x, z, w, h, d, ry, kind = 'town') => {
    const half = Math.max(w, d) / 2;
    if (dist(x, z) < half + 6) return;
    if (stationPts.some((p) => Math.hypot(p.x - x, p.z - z) < half + 20)) return;
    if (LANDMARKS.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + half)) return;
    list.push({ x, z, w, h, d, ry, kind });
  };
  const C = TOWN.plaza;
  // Ring um den Marktplatz
  for (let a = 0; a < Math.PI * 2; a += 0.25) {
    const x = C.x + Math.cos(a) * 32, z = C.z + Math.sin(a) * 32;
    add(x, z, 6 + r() * 3, 6 + r() * 4, 9 + r() * 3, -a + Math.PI / 2);
  }
  // Altstadt-Straßen rund um den Platz
  for (let i = 0; i < 110; i++) {
    const x = -30 + r() * 200, z = 175 + r() * 160;
    add(x, z, 6 + r() * 4, 5 + r() * 4, 8 + r() * 4, Math.round(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.2);
  }
  // Gulfhöfe (große Bauernhöfe) in den Feldern
  const farms = [[-175, 75, 0.2], [-30, 48, 1.3], [130, 10, 0.5], [-100, 160, 0.1], [170, -5, 1.6], [-230, -5, 0.9], [140, 90, 0.3], [-40, 260, 0.6]];
  for (const [x, z, ry] of farms) {
    add(x, z, 14, 6, 26, ry, 'farm');
    add(x + Math.cos(ry) * 12, z - Math.sin(ry) * 12, 8, 4.5, 9, ry, 'farm');
  }
  // Ferienhäuser in Norddeich
  for (let i = 0; i < 26; i++) {
    const x = -130 + r() * 260, z = 38 + r() * 40;
    add(x, z, 7 + r() * 2, 4.5 + r() * 1.5, 9, (r() > 0.5 ? 0 : Math.PI / 2), 'holiday');
  }
  return list;
}

export async function buildWorld(scene, route, quality) {
  const isHigh = quality === 'high';
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const flatMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  // Boden
  const ground = new THREE.Mesh(buildGround(quality), mat);
  ground.receiveShadow = isHigh;
  scene.add(ground);
  await yieldToMain();

  // Weg
  const path = new THREE.Mesh(buildPath(route), mat);
  path.receiveShadow = isHigh;
  scene.add(path);

  // Wasser (Nordsee + Priele)
  const water = createWater(quality);
  scene.add(water.mesh);
  await yieldToMain();

  // Gräben zwischen den Feldern
  const ditches = merge([
    flat(1.4, 160, '#3e5966', { x: -112, y: -0.03, z: 60 }),
    flat(1.4, 120, '#3e5966', { x: -40, y: -0.03, z: 20 + 90 }),
    flat(220, 1.4, '#3e5966', { x: -60, y: -0.03, z: 150 }),
    flat(1.4, 140, '#3e5966', { x: 120, y: -0.03, z: 40 }),
    flat(180, 1.4, '#3e5966', { x: -150, y: -0.03, z: -14 }),
  ]);

  // Inseln am Horizont (Norderney / Juist, sehr stilisiert): Strand + Dünenkuppen + Leuchtturm
  const islandParts = [];
  const ir = rng(3);
  const island = (cx, cz, len, lighthouse) => {
    islandParts.push(place(paint(new THREE.CylinderGeometry(1, 1, 1, 20), '#d1c8aa'), { x: cx, y: WATER_Y - 0.6, z: cz, sx: len / 2, sy: 2.4, sz: 20 }));
    const n = Math.round(len / 22);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      const hgt = (1 - Math.abs(t) * 1.6) * (6 + ir() * 5);
      if (hgt < 1.5) continue;
      islandParts.push(ico(1, ir() > 0.5 ? '#6f7f62' : '#7d8c6a', { x: cx + t * len * 0.9, y: WATER_Y + 0.4, z: cz + (ir() - 0.5) * 6, sx: 16 + ir() * 10, sy: hgt, sz: 9 }));
    }
    if (lighthouse) {
      islandParts.push(cyl(2.2, 3, 26, 8, '#8a4a3a', { x: cx + len * 0.15, y: WATER_Y + 3, z: cz }));
      islandParts.push(cyl(2.6, 2.6, 3, 8, '#f0eee8', { x: cx + len * 0.15, y: WATER_Y + 29, z: cz }));
    }
  };
  island(-200, -430, 420, true);
  island(300, -470, 480, false);
  const islands = merge(islandParts);

  const statics = new THREE.Mesh(merge([startArea(), harbor(), townLandmarks(), ditches, islands, windmillBody().translate(TOWN.mill.x, 0, TOWN.mill.z)]), flatMat);
  statics.castShadow = isHigh;
  statics.receiveShadow = isHigh;
  scene.add(statics);
  await yieldToMain();

  // Schilder
  const shop = sign('SegTeam Norden', { w: 7.5, h: 1.3 });
  shop.position.set(10, 4.5, 26.9);
  shop.rotation.y = Math.PI;
  const tea = sign('Teemuseum', { w: 7, h: 1.4, bg: '#efe9dc', fg: '#5a2a1e' });
  // Fassade zeigt Richtung Marktplatz (Nordwesten)
  tea.position.set(TOWN.teemuseum.x - Math.sin(TEEMUSEUM_RY) * 5.15, 4.9, TOWN.teemuseum.z - Math.cos(TEEMUSEUM_RY) * 5.15);
  tea.rotation.y = Math.PI + TEEMUSEUM_RY;
  const ferrySign = sign('Fähre · Inseln', { w: 7, h: 1.2, bg: '#1d3f6e', fg: '#ffffff' });
  ferrySign.position.set(-143.9, QUAY.y + 4.7, -65);
  ferrySign.rotation.y = Math.PI / 2;
  scene.add(shop, tea, ferrySign);

  // Häuser
  const { walls, roof } = houseGeometries();
  const placements = housePlacements(route);
  const wallMesh = new THREE.InstancedMesh(walls, flatMat, placements.length);
  const roofMesh = new THREE.InstancedMesh(roof, flatMat, placements.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const c = new THREE.Color();
  const r = rng(5);
  const wallTones = ['#9c4a38', '#a5533e', '#8e4232', '#b05c45', '#ece7dc', '#e2dccf', '#9c4a38'];
  const roofTones = ['#8a3a2a', '#3a3d44', '#7a3426', '#4a4d55', '#8a3a2a'];
  placements.forEach((h, i) => {
    q.setFromEuler(e.set(0, h.ry, 0));
    m.compose(p.set(h.x, 0, h.z), q, s.set(h.w, h.h, h.d));
    wallMesh.setMatrixAt(i, m);
    roofMesh.setMatrixAt(i, m);
    const wallHex = h.kind === 'holiday' ? (r() > 0.4 ? '#ece7dc' : '#a5533e') : wallTones[Math.floor(r() * wallTones.length)];
    wallMesh.setColorAt(i, c.set(wallHex));
    roofMesh.setColorAt(i, c.set(h.kind === 'farm' ? '#4a4d55' : roofTones[Math.floor(r() * roofTones.length)]));
  });
  for (const mesh of [wallMesh, roofMesh]) {
    mesh.castShadow = isHigh;
    mesh.receiveShadow = isHigh;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  await yieldToMain();

  // Bewegte Teile
  const animated = [];
  const sailMesh = new THREE.Mesh(sails(), flatMat);
  sailMesh.position.set(TOWN.mill.x - 1.4, 21.5, TOWN.mill.z - 4);
  sailMesh.rotation.y = 0.35;
  sailMesh.castShadow = isHigh;
  scene.add(sailMesh);
  animated.push((t) => { sailMesh.rotation.z = t * 0.6; });

  const turbinePos = [[-260, 120], [-210, 210], [190, 30], [250, -8], [280, 170], [-330, 40], [330, 80], [-120, 260]];
  const tb = turbineBody(), rt = rotor();
  const turbines = new THREE.InstancedMesh(tb, flatMat, turbinePos.length);
  const rotors = [];
  turbinePos.forEach(([x, z], i) => {
    m.makeTranslation(x, 0, z);
    turbines.setMatrixAt(i, m);
    const rm = new THREE.Mesh(rt, flatMat);
    rm.position.set(x, 45.5 + 1.1, z + 2.4);
    rm.userData.speed = 0.7 + (i % 3) * 0.12;
    rm.userData.phase = i * 1.3;
    scene.add(rm);
    rotors.push(rm);
  });
  scene.add(turbines);
  animated.push((t) => rotors.forEach((rm) => { rm.rotation.z = t * rm.userData.speed + rm.userData.phase; }));

  // Schiffe (schaukeln leicht)
  const boats = [];
  const addBoat = (geo, x, z, ry, amp) => {
    const b = new THREE.Mesh(geo, flatMat);
    b.position.set(x, WATER_Y, z);
    b.rotation.y = ry;
    b.userData = { amp, phase: x * 0.13 };
    b.castShadow = isHigh;
    scene.add(b);
    boats.push(b);
  };
  addBoat(ferry(), -122, -86, 0, 0.12);
  const cg1 = cutter('#2f5f8f'), cg2 = cutter('#a3352b');
  addBoat(cg1, -100, -78, 2.9, 0.25);
  addBoat(cg2, -144, -80, 0.3, 0.25);
  addBoat(cg1, -156, -102, 1.4, 0.3);
  animated.push((t) => boats.forEach((b) => {
    b.position.y = WATER_Y + Math.sin(t * 1.1 + b.userData.phase) * b.userData.amp;
    b.rotation.z = Math.sin(t * 0.9 + b.userData.phase) * b.userData.amp * 0.12;
  }));

  return {
    water,
    update(t) {
      water.update(t);
      for (const f of animated) f(t);
    },
  };
}
