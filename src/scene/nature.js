import * as THREE from 'three';
import { box, cyl, cone, ico, merge, paint, place, rng, yieldToMain } from './util.js';
import { dikeHeight, heightAt, isSeaward } from './terrain.js';
import { createRouteField } from './route.js';
import { TOWN } from './world.js';

// Instanzierte Natur: Gras, Bäume, Schafe, Kühe, Schäfchenwolken, Möwen.
// Ein Draw-Call pro Typ – egal wie viele Exemplare.

// Bereiche ohne Bewuchs (Gebäude, Plätze, Hafen)
const BLOCKED = [
  { x: -34, z: 30, r: 26 }, { x: 10, z: 30, r: 12 }, { x: 8, z: 19, r: 13 }, { x: 36, z: 27, r: 18 },
  { ...TOWN.plaza, r: 27 }, { ...TOWN.teemuseum, r: 13 }, { ...TOWN.church, r: 24 }, { ...TOWN.bell, r: 8 },
  { ...TOWN.waterTower, r: 8 }, { ...TOWN.mill, r: 11 }, { x: -146, z: -64, r: 10 },
];
const blocked = (x, z) => BLOCKED.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < b.r * b.r) || (z > 7 && z < 17 && Math.abs(x) < 150);

const dummy = new THREE.Object3D();

function instanced(geo, mat, items, { shadow = false, tint } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const c = new THREE.Color();
  items.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    dummy.scale.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (tint) mesh.setColorAt(i, c.set(tint(it, i)));
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  mesh.computeBoundingSphere();
  return mesh;
}

function sheepGeo() {
  return merge([
    place(paint(new THREE.IcosahedronGeometry(0.62, 0), '#f1eee6'), { y: 0.82, sx: 1.25, sy: 0.85, sz: 0.85 }),
    box(0.3, 0.32, 0.36, '#2a2826', { x: 0.82, y: 0.78 }),
    box(0.1, 0.12, 0.08, '#2a2826', { x: 0.78, y: 1.02, z: 0.2 }),
    box(0.1, 0.12, 0.08, '#2a2826', { x: 0.78, y: 1.02, z: -0.2 }),
    ...[[-0.4, -0.25], [-0.4, 0.25], [0.4, -0.25], [0.4, 0.25]].map(([x, z]) => box(0.12, 0.5, 0.12, '#2a2826', { x, z })),
  ]);
}

function cowGeo() {
  return merge([
    box(2.0, 0.95, 0.95, '#f2f0ea', { y: 0.75 }),
    box(0.7, 0.98, 0.97, '#1e1e1e', { x: -0.3, y: 0.74 }),
    box(0.45, 0.5, 0.99, '#1e1e1e', { x: 0.55, y: 1.15 }),
    box(0.55, 0.55, 0.55, '#f2f0ea', { x: 1.2, y: 1.2 }),
    box(0.3, 0.3, 0.5, '#e7b7a8', { x: 1.47, y: 1.08 }),
    box(0.14, 0.12, 0.16, '#d9d2c2', { x: 1.16, y: 1.5, z: 0.25 }),
    box(0.14, 0.12, 0.16, '#d9d2c2', { x: 1.16, y: 1.5, z: -0.25 }),
    box(0.3, 0.16, 0.3, '#e7b7a8', { x: 0.4, y: 0.16 + 0.12 }),
    ...[[-0.75, -0.32], [-0.75, 0.32], [0.75, -0.32], [0.75, 0.32]].map(([x, z]) => box(0.18, 0.75, 0.18, '#2a2826', { x, z })),
  ]);
}

function treeGeo(kind) {
  if (kind === 'round') {
    return merge([
      cyl(0.22, 0.3, 2.6, 6, '#6b4a32'),
      ico(2.2, '#5f8c3f', { y: 3.8, sy: 1.1 }),
      ico(1.5, '#6c9a46', { y: 5.0, x: 0.6, z: 0.3 }),
    ]);
  }
  return merge([cyl(0.18, 0.24, 1.6, 6, '#5e4330'), cone(1.7, 6, 7, '#40683a', { y: 1.2 })]);
}

function grassGeo() {
  return merge([
    cone(0.16, 0.7, 3, '#7aa652', { x: 0 }),
    cone(0.13, 0.55, 3, '#86b25a', { x: 0.18, z: 0.1, rz: -0.3 }),
    cone(0.12, 0.5, 3, '#6a9846', { x: -0.16, z: -0.08, rz: 0.3 }),
  ]);
}

function gullGeo() {
  // Körper + zwei angewinkelte Flügel (V-Form)
  const wingL = new THREE.BufferGeometry();
  wingL.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.18, -0.95, 0.28, 0], 3));
  const wingR = new THREE.BufferGeometry();
  wingR.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.18, 0.95, 0.28, 0], 3));
  for (const w of [wingL, wingR]) w.computeVertexNormals();
  return merge([
    paint(wingL, '#f4f4f2'), paint(wingR, '#f4f4f2'),
    place(paint(new THREE.IcosahedronGeometry(0.16, 0), '#ffffff'), { sz: 2.4 }),
    box(0.05, 0.05, 0.14, '#e8b23a', { z: 0.42, y: -0.02 }),
  ]);
}

export async function buildNature(scene, route, quality) {
  const high = quality === 'high';
  const r = rng(42);
  const dist = createRouteField(route);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const sideMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.45 });
  const free = (x, z, minRoute) => !blocked(x, z) && dist(x, z) > minRoute && !isSeaward(z);
  const animated = [];

  // --- Bäume: Baumreihen an Wegen + Gruppen ---
  const round = [], conic = [];
  const plant = (x, z, kind = r() > 0.25 ? 'round' : 'conic') => {
    if (!free(x, z, 5) || dikeHeight(z) > 0) return;
    (kind === 'round' ? round : conic).push({ x, y: 0, z, s: 0.8 + r() * 0.6, ry: r() * 6.28 });
  };
  const nRows = high ? 1 : 0.5;
  // Reihe am Dörper Weg
  for (let x = -150; x < 150; x += 9 / nRows) { plant(x + r() * 2, 18.5); plant(x + r() * 2, 5.5); }
  // Wallhecken/Baumreihen zwischen den Feldern
  const rows = [[-200, -10, 200, -10], [-112, 0, -112, 160], [-40, 120, 140, 120], [120, -20, 120, 120], [-220, 100, -40, 100], [-60, 200, 200, 210]];
  for (const [x0, z0, x1, z1] of rows) {
    const n = Math.round((Math.hypot(x1 - x0, z1 - z0) / 8) * nRows);
    for (let i = 0; i < n; i++) plant(x0 + ((x1 - x0) * i) / n + (r() - 0.5) * 2, z0 + ((z1 - z0) * i) / n + (r() - 0.5) * 2);
  }
  // Gruppen um Höfe und Stadt
  const groves = [[-175, 75], [-30, 48], [130, 10], [-100, 160], [140, 230], [-20, 230], [-160, 30], [150, 70], [40, 75], [60, 140]];
  for (const [gx, gz] of groves) for (let i = 0; i < (high ? 14 : 7); i++) plant(gx + (r() - 0.5) * 36, gz + (r() - 0.5) * 36);
  // Linden am Marktplatz
  for (let a = 0; a < Math.PI * 2; a += 0.6) {
    const x = TOWN.plaza.x + Math.cos(a) * 21, z = TOWN.plaza.z + Math.sin(a) * 21;
    if (dist(x, z) < 5) continue;
    round.push({ x, y: 0, z, s: 0.75, ry: a });
  }
  scene.add(instanced(treeGeo('round'), mat, round, { shadow: high, tint: () => `hsl(${95 + r() * 25}, ${35 + r() * 15}%, ${70 + r() * 25}%)` }));
  scene.add(instanced(treeGeo('conic'), mat, conic, { shadow: high }));
  await yieldToMain();

  // --- Gras-Büschel ---
  const grass = [];
  const grassCount = high ? 7000 : 1800;
  for (let i = 0; i < grassCount * 3 && grass.length < grassCount; i++) {
    // Mehr Büschel nahe der Route (da sieht man sie)
    const near = r() < 0.7;
    const u = r();
    const p = route.pointAt(u);
    const x = near ? p.x + (r() - 0.5) * 60 : (r() - 0.5) * 700;
    const z = near ? p.z + (r() - 0.5) * 60 : -50 + r() * 450;
    if (!free(x, z, 2.4)) continue;
    grass.push({ x, y: heightAt(x, z) - 0.05, z, s: 0.7 + r() * 0.9, ry: r() * 6.28 });
  }
  scene.add(instanced(grassGeo(), mat, grass));
  await yieldToMain();

  // --- Schafe (vor allem auf dem Deich) ---
  const sheep = [];
  const sheepCount = high ? 140 : 50;
  for (let i = 0; i < sheepCount * 4 && sheep.length < sheepCount; i++) {
    const onDike = r() < 0.75;
    const x = onDike ? -320 + r() * 560 : -150 + r() * 130;
    const z = onDike ? (r() < 0.6 ? -26 - r() * 10 : -44 - r() * 9) : 70 + r() * 70;
    if (!free(x, z, 4)) continue;
    const y = heightAt(x, z);
    // Am Hang leicht mitgeneigt
    const slope = onDike ? (z > -40 ? 0.4 : -0.4) : 0;
    sheep.push({ x, y, z, ry: r() * 6.28, rx: slope * (r() > 0.5 ? 0.6 : 0.4), s: 0.9 + r() * 0.25 });
  }
  scene.add(instanced(sheepGeo(), mat, sheep, { shadow: high }));

  // --- Kühe auf den Weiden an Station 4 ---
  const cows = [];
  const cowCount = high ? 48 : 18;
  const pastures = [[-125, 45, 26, 30], [-70, 35, 22, 18], [-150, 110, 30, 30], [-30, 70, 18, 14]];
  for (let i = 0; i < cowCount * 4 && cows.length < cowCount; i++) {
    const [px, pz, w, d] = pastures[i % pastures.length];
    const x = px + (r() - 0.5) * w * 2, z = pz + (r() - 0.5) * d * 2;
    if (!free(x, z, 7)) continue;
    cows.push({ x, y: 0, z, ry: r() * 6.28, s: 1 + r() * 0.15 });
  }
  scene.add(instanced(cowGeo(), mat, cows, { shadow: high }));
  await yieldToMain();

  // --- Weidezäune um die Kuhweide an der Route ---
  const posts = [];
  for (const [px, pz, w, d] of pastures.slice(0, 2)) {
    for (let a = 0; a < 1; a += 1 / 40) {
      const ang = a * Math.PI * 2;
      const x = px + Math.cos(ang) * w * 1.15, z = pz + Math.sin(ang) * d * 1.15;
      if (dist(x, z) < 3) continue;
      posts.push({ x, y: 0, z, ry: ang });
    }
  }
  scene.add(instanced(box(0.12, 1.1, 0.12, '#7a6048'), mat, posts));

  // --- Schäfchenwolken ---
  const puffs = [];
  const clusters = high ? 80 : 36;
  for (let c = 0; c < clusters; c++) {
    const cx = -900 + r() * 1800, cz = -1000 + r() * 1500, cy = 85 + r() * 50;
    const k = 4 + Math.floor(r() * 6);
    const size = 7 + r() * 9;
    for (let i = 0; i < k; i++) {
      puffs.push({ x: cx + (r() - 0.5) * size * 3, y: cy + r() * size * 0.35, z: cz + (r() - 0.5) * size * 1.6, sx: size * (0.8 + r() * 0.6), sy: size * (0.45 + r() * 0.25), sz: size * (0.8 + r() * 0.5), ry: r() * 6.28 });
    }
  }
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.38, flatShading: true, fog: false });
  const clouds = instanced(new THREE.IcosahedronGeometry(1, 1), cloudMat, puffs);
  clouds.frustumCulled = false;
  scene.add(clouds);
  await yieldToMain();
  animated.push((t) => { clouds.position.x = (t * 1.6) % 400; });

  // --- Möwen über dem Hafen und dem Deich ---
  const gullCount = high ? 34 : 14;
  const gulls = new THREE.InstancedMesh(gullGeo(), sideMat, gullCount);
  const gullData = Array.from({ length: gullCount }, (_, i) => {
    const harbor = i < gullCount * 0.7;
    return {
      cx: harbor ? -122 + (r() - 0.5) * 50 : -60 + (r() - 0.5) * 120,
      cz: harbor ? -75 + (r() - 0.5) * 30 : -48 + (r() - 0.5) * 20,
      y: harbor ? 9 + r() * 14 : 10 + r() * 10,
      rad: 8 + r() * 22,
      speed: (0.25 + r() * 0.3) * (r() > 0.5 ? 1 : -1),
      phase: r() * 6.28,
      flap: 5 + r() * 4,
    };
  });
  gulls.frustumCulled = false;
  scene.add(gulls);
  animated.push((t) => {
    gullData.forEach((g, i) => {
      const a = g.phase + t * g.speed;
      dummy.position.set(g.cx + Math.cos(a) * g.rad, g.y + Math.sin(t * 0.7 + g.phase) * 1.2, g.cz + Math.sin(a) * g.rad);
      // Flugrichtung = Tangente des Kreises
      dummy.rotation.set(0, -a + (g.speed > 0 ? 0 : Math.PI), Math.sin(a) * 0.15 * Math.sign(g.speed));
      const f = Math.sin(t * g.flap + g.phase);
      dummy.scale.set(1.6, 1.6 * (0.35 + 0.95 * Math.max(f, -0.6)), 1.6);
      dummy.updateMatrix();
      gulls.setMatrixAt(i, dummy.matrix);
    });
    gulls.instanceMatrix.needsUpdate = true;
  });

  return {
    clouds,
    update(t) { for (const f of animated) f(t); },
  };
}
