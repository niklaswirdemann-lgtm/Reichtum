// Procedural models built from boxes/planes with shared geometry and materials (few draw calls, no GLTF).
// Every model faces +z (towards the camera path) and exposes update(p, t, night) where p ∈ [0,1]
// is the scroll-driven animation progress of its station.
import * as THREE from 'three';

export const AC = new THREE.Color('#8AD4FF');
export const WARM = new THREE.Color('#FFC27A');
const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
const span = (p, a, b) => ease(clamp01((p - a) / (b - a)));

export function makeMaterials() {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 1, roughness: 0.3 }),
    anth: new THREE.MeshStandardMaterial({ color: 0x353b42, metalness: 0.75, roughness: 0.42 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d2228, metalness: 0.85, roughness: 0.5 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x15191e, metalness: 0.1, roughness: 0.92 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xa9cfe6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }),
    deck: new THREE.MeshStandardMaterial({ color: 0x2a2520, metalness: 0, roughness: 0.85 }),
  };
}

function texGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = texGlow();

function warmMat() { return new THREE.MeshBasicMaterial({ color: WARM.clone(), toneMapped: false }); }
function setWarm(mat, k) { mat.color.copy(WARM).multiplyScalar(k); }
function spill(w, d, parent, x, z) {
  const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: GLOW, color: WARM, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x, 0.012, z); parent.add(m); return m;
}
function glowSprite(size, parent, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: WARM, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
}
function box(parent, mat, w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m;
}
// wall with a rectangular opening, opening centred at x=0, bottom at oy
function wallWithOpening(parent, mat, W, H, ow, oh, oy, t = 0.25) {
  const side = (W - ow) / 2;
  box(parent, mat, side, H, t, -(ow / 2 + side / 2), H / 2, 0);
  box(parent, mat, side, H, t, ow / 2 + side / 2, H / 2, 0);
  box(parent, mat, ow, H - oy - oh, t, 0, oy + oh + (H - oy - oh) / 2, 0);
  if (oy > 0) box(parent, mat, ow, oy, t, 0, oy / 2, 0);
}
function frame(parent, mat, ow, oh, oy, f = 0.07, d = 0.3) {
  box(parent, mat, f, oh, d, -ow / 2 + f / 2, oy + oh / 2, 0);
  box(parent, mat, f, oh, d, ow / 2 - f / 2, oy + oh / 2, 0);
  box(parent, mat, ow, f, d, 0, oy + oh - f / 2, 0);
  if (oy > 0) box(parent, mat, ow, f, d, 0, oy + f / 2, 0);
}
// interior "room" behind an opening, lit warm from inside
function roomTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 40, 4, 64, 64, 96);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.45, '#8a7a66'); r.addColorStop(1, '#1a1612');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const ROOM = roomTex();
function room(parent, w, h, d, z0) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, map: ROOM, side: THREE.BackSide, toneMapped: false });
  const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(0, h / 2, z0 - d / 2); parent.add(m);
  return mat;
}
function bar(mesh, a, b, th) {
  const d = b.clone().sub(a), L = d.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(th, th, L);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
}

/* ---------------- Intro: steel window in a dark wall ---------------- */
export function buildIntroWindow(M) {
  const g = new THREE.Group();
  const ow = 1.7, oh = 1.9, oy = 0.6;
  wallWithOpening(g, M.wall, 26, 7, ow, oh, oy, 0.35);
  frame(g, M.steel, ow, oh, oy, 0.08, 0.38);
  const sash = (dir) => {
    const piv = new THREE.Group(); piv.position.set(dir * -(ow / 2 - 0.08), oy + 0.08, -0.05); g.add(piv);
    const w = ow / 2 - 0.08, h = oh - 0.16, sx = dir * w / 2;
    box(piv, M.steel, 0.05, h, 0.06, dir * 0.025, h / 2, 0); box(piv, M.steel, 0.05, h, 0.06, dir * (w - 0.025), h / 2, 0);
    box(piv, M.steel, w, 0.05, 0.06, sx, 0.025, 0); box(piv, M.steel, w, 0.05, 0.06, sx, h - 0.025, 0);
    for (let i = 1; i < 4; i++) box(piv, M.steel, w, 0.02, 0.03, sx, (h * i) / 4, 0);
    box(piv, M.steel, 0.02, h, 0.03, sx, h / 2, 0);
    const gl = new THREE.Mesh(PLANE, M.glass); gl.scale.set(w, h, 1); gl.position.set(sx, h / 2, 0); piv.add(gl);
    return piv;
  };
  const L = sash(1), R = sash(-1);
  return { group: g, open(k) { L.rotation.y = k * 1.75; R.rotation.y = -k * 1.75; } };
}

/* ---------------- Haustür: opens, warm light falls out ---------------- */
function buildDoor(M) {
  const g = new THREE.Group();
  const ow = 1.1, oh = 2.15;
  wallWithOpening(g, M.wall, 4.6, 3.2, ow, oh, 0);
  frame(g, M.anth, ow, oh, 0, 0.07, 0.3);
  const inside = room(g, 2.2, 2.6, 2.4, -0.13);
  const piv = new THREE.Group(); piv.position.set(-ow / 2 + 0.07, 0, -0.02); g.add(piv);
  const lw = ow - 0.14, lh = oh - 0.07;
  box(piv, M.anth, lw, lh, 0.07, lw / 2, lh / 2, 0);
  const panes = [];
  for (let i = 0; i < 3; i++) {
    const pm = warmMat(); panes.push(pm);
    const p = new THREE.Mesh(PLANE, pm); p.scale.set(0.16, 0.42, 1); p.position.set(lw / 2, 0.55 + i * 0.55, 0.037); piv.add(p);
  }
  box(piv, M.steel, 0.03, 0.5, 0.04, lw - 0.12, 1.05, 0.07);
  // wall lamp
  const lampMat = warmMat(); box(g, M.dark, 0.14, 0.24, 0.12, 0.95, 2.35, 0.18);
  const lamp = new THREE.Mesh(PLANE, lampMat); lamp.scale.set(0.1, 0.16, 1); lamp.position.set(0.95, 2.35, 0.245); g.add(lamp);
  const lampGlow = glowSprite(1.1, g, 0.95, 2.35, 0.3);
  const sp = spill(2.4, 3.6, g, 0, 1.6);
  const light = new THREE.PointLight(WARM, 0, 7, 1.6); light.position.set(0, 1.6, -0.6); g.add(light);
  return {
    key: 'tuer', group: g, size: { w: ow, h: oh },
    info: { t: 'Haustür', x: 'Türen gehören zu unseren elf Leistungen – vom Aufmaß vor Ort bis zur fertigen Montage. Dazu kommen automatische Türen, Bauelemente und die Wartung.', e: 'Detail · Türen' },
    dims: [[[-ow / 2, 0.02, 0.45], [ow / 2, 0.02, 0.45], 'B 1,10'], [[ow / 2 + 0.35, 0, 0.2], [ow / 2 + 0.35, oh, 0.2], 'H 2,15']],
    update(p, t, night) {
      const o = span(p, 0.1, 0.9);
      piv.rotation.y = o * 1.45;
      const k = o * (night ? 1 : 0.7);
      inside.color.copy(WARM).multiplyScalar(0.25 + 0.9 * k);
      panes.forEach((m) => setWarm(m, (night ? 0.9 : 0.15) + 0.6 * k));
      sp.material.opacity = 0.9 * k; light.intensity = 9 * k;
      setWarm(lampMat, night ? 1.4 : 0.12); lampGlow.material.opacity = night ? 0.55 : 0;
    },
  };
}

/* ---------------- Sektionaltor: rises lamella by lamella ---------------- */
function buildGate(M) {
  const g = new THREE.Group();
  const W = 2.6, H = 2.2, N = 6, h = H / N, R = 0.38;
  wallWithOpening(g, M.wall, 5.8, 3.4, W, H, 0);
  frame(g, M.anth, W, H, 0, 0.06, 0.3);
  const inside = room(g, W + 0.6, 3, 3.6, -0.13);
  const tz = -0.22;
  const track = (x) => {
    box(g, M.steel, 0.04, H, 0.06, x, H / 2, tz);
    box(g, M.steel, 0.04, 0.06, H + 0.4, x, H + R, tz - R - (H + 0.4) / 2);
  };
  track(-W / 2 + 0.04); track(W / 2 - 0.04);
  const lam = [];
  const lamMat = new THREE.MeshStandardMaterial({ color: 0x3d444c, metalness: 0.7, roughness: 0.38 });
  for (let i = 0; i < N; i++) {
    const m = new THREE.Group(); g.add(m);
    box(m, lamMat, W - 0.1, h * 0.97, 0.045, 0, 0, 0);
    box(m, M.dark, W - 0.1, 0.012, 0.05, 0, h * 0.18, 0.003);
    if (i === 0) box(m, M.steel, 0.4, 0.035, 0.04, 0, -h * 0.15, 0.04);
    lam.push(m);
  }
  const sp = spill(3.4, 3.6, g, 0, 1.6);
  const light = new THREE.PointLight(WARM, 0, 8, 1.6); light.position.set(0, 2.2, -1.4); g.add(light);
  const qa = Math.PI / 2 * R;
  return {
    key: 'tor', group: g, size: { w: W, h: H },
    info: { t: 'Sektionaltor', x: 'Garagentore gehören zu unseren Leistungen – montiert, eingestellt und auf Wunsch regelmäßig gewartet. Auch Reparaturen übernehmen wir.', e: 'Detail · Garagentore' },
    dims: [[[-W / 2, 0.02, 0.45], [W / 2, 0.02, 0.45], 'B 2,60'], [[-W / 2 - 0.4, 0, 0.2], [-W / 2 - 0.4, H, 0.2], 'H 2,20']],
    update(p, t, night) {
      const o = span(p, 0.05, 0.95) * 0.93;
      for (let i = 0; i < N; i++) {
        const u = i * h + h / 2 + o * H;
        let y, z, rx;
        if (u <= H) { y = u; z = 0; rx = 0; } else if (u <= H + qa) { const a = (u - H) / R; y = H + R * Math.sin(a); z = -(R - R * Math.cos(a)); rx = -a; } else { y = H + R; z = -(R + (u - H - qa)); rx = -Math.PI / 2; }
        lam[i].position.set(0, y, z + tz + 0.02); lam[i].rotation.x = rx;
      }
      const k = o * (night ? 1 : 0.6);
      inside.color.copy(WARM).multiplyScalar(0.15 + 0.7 * k);
      sp.material.opacity = 0.7 * k; light.intensity = 8 * k;
    },
  };
}

/* ---------------- Terrassendach with string lights ---------------- */
function buildRoof(M) {
  const g = new THREE.Group();
  const W = 4.4, D = 3.0, hf = 2.3, hw = 2.85;
  box(g, M.wall, 6, 3.6, 0.25, 0, 1.8, -0.15);
  // glass sliding door in the house wall (reference to the photo)
  box(g, M.dark, 2.2, 2.2, 0.06, 0, 1.1, -0.01);
  const winMat = warmMat(); const win = new THREE.Mesh(PLANE, winMat); win.scale.set(2.05, 2.05, 1); win.position.set(0, 1.1, 0.025); g.add(win);
  box(g, M.dark, 0.04, 2.1, 0.03, 0, 1.1, 0.04);
  const deck = new THREE.Mesh(PLANE, M.deck); deck.rotation.x = -Math.PI / 2; deck.scale.set(W + 0.4, D + 0.3, 1); deck.position.set(0, 0.01, D / 2 + 0.05); g.add(deck);
  for (const x of [-W / 2, W / 2]) box(g, M.anth, 0.11, hf, 0.11, x, hf / 2, D);
  box(g, M.anth, W + 0.25, 0.2, 0.16, 0, hf + 0.02, D);
  box(g, M.anth, W + 0.25, 0.16, 0.12, 0, hw, 0.06);
  const slope = Math.atan2(hw - hf, D), rl = Math.hypot(hw - hf, D);
  for (let i = 0; i <= 4; i++) {
    const r = box(g, M.anth, 0.07, 0.12, rl, -W / 2 + (W * i) / 4, (hf + hw) / 2 + 0.06, D / 2);
    r.rotation.x = -slope;
  }
  const gl = new THREE.Mesh(PLANE, M.glass); gl.scale.set(W, rl, 1); gl.rotation.x = -Math.PI / 2 - slope; gl.position.set(0, (hf + hw) / 2 + 0.13, D / 2); g.add(gl);
  // string lights: two sagging strands under the roof
  const N = 15, bulbs = [];
  for (const z of [0.9, 2.2]) {
    const yTop = hf + (hw - hf) * (1 - z / D) - 0.02;
    for (let i = 0; i < N; i++) { const s = i / (N - 1), x = -W / 2 + 0.15 + s * (W - 0.3); bulbs.push(new THREE.Vector3(x, yTop - 0.05 - Math.sin(s * Math.PI) * 0.32, z)); }
  }
  const cable = new THREE.BufferGeometry().setFromPoints(bulbs.slice(0, N));
  g.add(new THREE.Line(cable, new THREE.LineBasicMaterial({ color: 0x111111 })));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bulbs.slice(N)), new THREE.LineBasicMaterial({ color: 0x111111 })));
  const bm = new THREE.MeshBasicMaterial({ toneMapped: false });
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), bm, bulbs.length);
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  bulbs.forEach((b, i) => { mtx.setPosition(b); inst.setMatrixAt(i, mtx); inst.setColorAt(i, col.set(0x222222)); });
  g.add(inst);
  const pg = new THREE.BufferGeometry().setFromPoints(bulbs);
  const pc = new Float32Array(bulbs.length * 3); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: GLOW, size: 0.55, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(pts);
  const sp = spill(W + 0.6, D + 1.2, g, 0, D / 2 + 0.2);
  const light = new THREE.PointLight(WARM, 0, 7, 1.5); light.position.set(0, 2.0, 1.6); g.add(light);
  const order = bulbs.map((_, i) => i).sort((a, b) => bulbs[a].x - bulbs[b].x);
  const rank = new Array(bulbs.length); order.forEach((idx, r) => { rank[idx] = r / bulbs.length; });
  return {
    key: 'dach', group: g, size: { w: W, h: hf },
    info: { t: 'Terrassenüberdachung', x: 'Terrassenüberdachungen und Glasanbauten montieren wir passend zum Haus – die Fotos daneben zeigen zwei echte Arbeiten aus der Region.', e: 'Detail · Terrassenüberdachungen' },
    dims: [[[-W / 2, 0.02, D + 0.5], [W / 2, 0.02, D + 0.5], 'B 4,40'], [[W / 2 + 0.45, 0, D], [W / 2 + 0.45, hf, D], 'H 2,30']],
    update(p, t, night) {
      const on = span(p, 0.2, 0.95);
      const k = night ? 1 : 0.55;
      let lit = 0;
      for (let i = 0; i < bulbs.length; i++) {
        const v = clamp01((on - rank[i]) * 8) * (night ? 0.9 + 0.1 * Math.sin(t * 3 + i * 1.7) : 1);
        lit += v;
        col.copy(WARM).multiplyScalar(0.12 + 1.6 * v * k);
        inst.setColorAt(i, col);
        pc[i * 3] = WARM.r * v * 0.9 * k; pc[i * 3 + 1] = WARM.g * v * 0.9 * k; pc[i * 3 + 2] = WARM.b * v * 0.9 * k;
      }
      inst.instanceColor.needsUpdate = true; pg.attributes.color.needsUpdate = true;
      const f = lit / bulbs.length;
      sp.material.opacity = 0.65 * f * k; light.intensity = 7 * f * k;
      setWarm(winMat, night ? 0.55 : 0.06);
    },
  };
}

/* ---------------- Markise: extends ---------------- */
function fabricTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 8;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#c9d2da' : '#3a4d61'; g.fillRect(i * 32, 0, 32, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.5, 1); return t;
}
function buildAwning(M) {
  const g = new THREE.Group();
  const W = 3.6, L = 2.6, y0 = 2.55, slope = 0.26;
  box(g, M.wall, 6, 3.6, 0.25, 0, 1.8, -0.15);
  box(g, M.dark, 1.4, 1.2, 0.06, 0, 1.3, -0.01);
  const winMat = warmMat(); const win = new THREE.Mesh(PLANE, winMat); win.scale.set(1.28, 1.08, 1); win.position.set(0, 1.3, 0.025); g.add(win);
  box(g, M.anth, W + 0.2, 0.2, 0.24, 0, y0 + 0.05, 0.12);
  const ledMat = warmMat(); const led = new THREE.Mesh(PLANE, ledMat); led.scale.set(W, 0.025, 1); led.rotation.x = Math.PI / 2; led.position.set(0, y0 - 0.055, 0.2); g.add(led);
  const fabMat = new THREE.MeshStandardMaterial({ map: fabricTex(), roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const fab = new THREE.Mesh(PLANE, fabMat); g.add(fab);
  const val = new THREE.Mesh(PLANE, fabMat); g.add(val);
  const front = box(g, M.anth, W + 0.1, 0.09, 0.09);
  const arms = [];
  for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) arms.push({ x, a: box(g, M.steel, 1, 1, 1), b: box(g, M.steel, 1, 1, 1) });
  const sp = spill(W + 0.6, L + 0.6, g, 0, L / 2 + 0.2);
  const lgt = new THREE.PointLight(WARM, 0, 6, 1.6); lgt.position.set(0, y0 - 0.3, 0.7); g.add(lgt);
  const A = L / 2 + 0.03, sh = new THREE.Vector3(), hd = new THREE.Vector3(), el = new THREE.Vector3(), tmp = new THREE.Vector3();
  return {
    key: 'markise', group: g, size: { w: W, h: y0 },
    info: { t: 'Markise', x: 'Markisen montieren wir sicher an der Hauswand – passend für Terrasse und Balkon. Auch Wartung und Reparatur gehören dazu.', e: 'Detail · Markisen' },
    dims: [[[-W / 2, 0.02, L + 0.55], [W / 2, 0.02, L + 0.55], 'B 3,60'], [[W / 2 + 0.4, 0.02, 0.15], [W / 2 + 0.4, 0.02, L + 0.15], 'AUSFALL 2,60']],
    update(p, t, night) {
      const e = 0.04 + 0.96 * span(p, 0.05, 0.95);
      const len = L * e, zf = 0.2 + Math.cos(slope) * len, yf = y0 - 0.05 - Math.sin(slope) * len;
      fab.scale.set(W, Math.max(0.01, len), 1);
      fab.position.set(0, (y0 - 0.05 + yf) / 2, (0.2 + zf) / 2);
      fab.rotation.set(-Math.PI / 2 + slope, 0, 0);
      fabMat.map.repeat.set(1.5, 1);
      front.position.set(0, yf, zf);
      val.scale.set(W, 0.22, 1); val.position.set(0, yf - 0.15, zf + 0.05);
      for (const a of arms) {
        sh.set(a.x, y0 - 0.12, 0.16); hd.set(a.x, yf - 0.03, zf - 0.03);
        const d = sh.distanceTo(hd), hh = Math.sqrt(Math.max(0, A * A - (d / 2) * (d / 2)));
        el.copy(sh).add(hd).multiplyScalar(0.5); tmp.set(-Math.sign(a.x) * hh, 0, 0); el.add(tmp);
        bar(a.a, sh, el, 0.05); bar(a.b, el, hd, 0.05);
      }
      const k = night ? 1 : 0.25;
      setWarm(ledMat, 0.15 + 1.6 * k * e); sp.material.opacity = 0.55 * k * e; lgt.intensity = 5 * k * e;
      setWarm(winMat, night ? 0.5 : 0.05);
    },
  };
}

export function buildStations(M) {
  return [buildDoor(M), buildGate(M), buildRoof(M), buildAwning(M)];
}
