// WebGL workshop: scroll drives the camera from station to station, each station animates its model.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials, buildStations, buildIntroWindow, AC } from './models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
const smooth = (a, b, x) => ease(clamp01((x - a) / (b - a)));

// station layout: model position, side the model sits on (+1 right), camera distance, look height, depth centre
const LAYOUT = [
  { pos: V(3.2, 0, -6), side: 1, dist: 5.6, ly: 1.2, zc: 0.2 },
  { pos: V(-3.6, 0, -16), side: -1, dist: 6.6, ly: 1.25, zc: 0 },
  { pos: V(3.8, 0, -27), side: 1, dist: 6.4, ly: 1.5, zc: 1.6 },
  { pos: V(-3.6, 0, -38), side: -1, dist: 6.4, ly: 1.5, zc: 1.3 },
];
const STATIONS = 6; // 0 hero, 1–4 models, 5 top view

function floorMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uAc: { value: AC.clone() }, uBase: { value: new THREE.Color(0x06080b) }, uInt: { value: 1 }, uFocus: { value: new THREE.Vector3(0, 0, 0) },
    }]),
    vertexShader: /* glsl */`
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <fog_pars_fragment>
      uniform vec3 uAc; uniform vec3 uBase; uniform float uInt; uniform vec3 uFocus; varying vec3 vW;
      float grid(vec2 p, float s, float w){ vec2 q = p / s; vec2 g = abs(fract(q - .5) - .5) / fwidth(q); return 1. - min(min(g.x, g.y) / w, 1.); }
      void main(){
        vec2 p = vW.xz;
        float minor = grid(p, .5, 1.), major = grid(p, 2.5, 1.4);
        float d = length(p - uFocus.xy);
        float halo = uFocus.z * smoothstep(5.5, 0., d);
        float ring = uFocus.z * (1. - smoothstep(0., .06, abs(d - 3.6))) ;
        vec3 col = uBase + uAc * (minor * .07 + major * .26) * uInt * (1. + halo * 1.6) + uAc * ring * .35 + uAc * halo * .05;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

function labelSprite(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '500 34px "IBM Plex Mono", ui-monospace, monospace';
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 28;
  c.width = w; c.height = 52; g.font = font;
  g.fillStyle = 'rgba(5,7,10,.72)'; g.fillRect(0, 0, w, 52);
  g.strokeStyle = 'rgba(138,212,255,.5)'; g.strokeRect(1, 1, w - 2, 50);
  g.fillStyle = '#8AD4FF'; g.textBaseline = 'middle'; g.fillText(text, 14, 27);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0, toneMapped: false }));
  const h = 0.24; s.scale.set((h * w) / 52, h, 1); s.renderOrder = 10; return s;
}

// blueprint dimension lines around a model, drawn progressively
function makeDims(defs, parent) {
  const items = defs.map(([a, b, label]) => {
    const A = V(...a), B = V(...b), dir = B.clone().sub(A).normalize();
    const n = Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : Math.abs(dir.x) > 0.9 ? V(0, 0, 1) : V(1, 0, 0);
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(18); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: AC, transparent: true, opacity: 0, depthTest: false, toneMapped: false });
    const line = new THREE.LineSegments(geo, mat); line.renderOrder = 9; line.frustumCulled = false; parent.add(line);
    const lbl = labelSprite('MODELL · ' + label);
    lbl.position.copy(A).add(B).multiplyScalar(0.5).addScaledVector(Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0), Math.abs(dir.y) > 0.9 ? 0.32 * Math.sign(A.x || 1) : 0.16);
    parent.add(lbl);
    return { A, B, n, pos, geo, mat, lbl };
  });
  let k = 0;
  return {
    update(target, dt) {
      k += (target - k) * Math.min(1, dt * 3);
      for (const it of items) {
        const e = it.A.clone().lerp(it.B, ease(clamp01(k * 1.15)));
        const t = 0.1 * clamp01(k * 3), q = it.pos;
        q.set([it.A.x, it.A.y, it.A.z, e.x, e.y, e.z,
          it.A.x - it.n.x * t, it.A.y - it.n.y * t, it.A.z - it.n.z * t, it.A.x + it.n.x * t, it.A.y + it.n.y * t, it.A.z + it.n.z * t,
          e.x - it.n.x * t, e.y - it.n.y * t, e.z - it.n.z * t, e.x + it.n.x * t, e.y + it.n.y * t, e.z + it.n.z * t]);
        it.geo.attributes.position.needsUpdate = true;
        it.mat.opacity = 0.9 * clamp01(k * 2); it.lbl.material.opacity = clamp01(k * 1.6 - 0.6);
      }
    },
  };
}

export async function start(ui) {
  const canvas = document.getElementById('gl');
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x05070a, 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 140);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x0b0d10, 0.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xdfeaff, 1.2); sun.position.set(6, 12, 8); scene.add(sun);

  // floor + workshop steel frame (2 instanced draw calls)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 72), floorMaterial());
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -30); scene.add(floor);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 1 }));
  outside.rotation.x = -Math.PI / 2; outside.position.set(0, 0, 21); scene.add(outside);
  const M = makeMaterials();
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const cols = []; for (let z = 3; z >= -45; z -= 6) for (const x of [-9, 9]) cols.push([x, 3.5, z, 0.32, 7, 0.32]);
  const beams = []; for (let z = 3; z >= -45; z -= 6) beams.push([0, 7, z, 18.3, 0.36, 0.22]); for (const x of [-9, 9]) beams.push([x, 7, -21, 0.22, 0.36, 48]);
  const [, beamMesh] = [[cols, M.anth], [beams, M.dark]].map(([list, mat]) => {
    const im = new THREE.InstancedMesh(BOX, mat, list.length), m4 = new THREE.Matrix4();
    list.forEach(([x, y, z, w, h, d], i) => im.setMatrixAt(i, m4.compose(V(x, y, z), new THREE.Quaternion(), V(w, h, d))));
    scene.add(im); return im;
  });

  // intro wall + window, stations
  const win = buildIntroWindow(M); win.group.position.set(0, 0, 6); scene.add(win.group);
  const st = buildStations(M);
  try { await Promise.race([document.fonts.load('500 34px "IBM Plex Mono"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* label falls back to monospace */ }
  st.forEach((m, i) => {
    const L = LAYOUT[i]; m.group.position.copy(L.pos); scene.add(m.group);
    m.group.traverse((o) => { o.userData.key = m.key; });
    m.dimsCtl = makeDims(m.dims, m.group);
    m.L = L;
  });
  const byKey = Object.fromEntries(st.map((m, i) => [m.key, i]));

  // ---- camera poses ----
  let portrait = false;
  const poses = [];
  function buildPoses() {
    poses.length = 0;
    poses.push(portrait ? { p: V(0, 1.8, 3.4), l: V(0.6, 0.8, -8) } : { p: V(0.6, 1.7, 2.8), l: V(1.4, 1.3, -8) });
    for (const L of LAYOUT) {
      const c = L.pos.clone(); c.z += L.zc;
      poses.push(portrait
        ? { p: V(c.x - L.side * 0.3, 2.4, c.z + L.dist * 1.55), l: V(c.x - L.side * 0.15, L.ly - 1.25, c.z) }
        : { p: V(c.x - L.side * 2.1, 1.75, c.z + L.dist), l: V(c.x - L.side * 1.75, L.ly, c.z) });
    }
    poses.push(portrait ? { p: V(0.01, 44, -20.5), l: V(0, 0, -23.2) } : { p: V(-42, 36, -25), l: V(2, 0, -37) });
  }
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; portrait = camera.aspect < 0.85;
    camera.fov = portrait ? 60 : 42; camera.updateProjectionMatrix();
    buildPoses(); measure();
  }

  // ---- scroll → station ----
  const secs = [...document.querySelectorAll('[data-st]')];
  let anchors = [];
  function measure() {
    anchors = secs.map((s, i) => (i === 0 ? 0 : s.offsetTop + s.offsetHeight / 2 - innerHeight / 2));
  }
  function stationFromScroll() {
    const y = scrollY;
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }

  // ---- state ----
  const rm = ui.reduced;
  let fogBase = 0.045, s = 0, night = false, focusKey = null, focusScroll = 0, introT = 1, introOn = false;
  const camPos = V(0, 1.55, 15), camLook = V(0, 1.5, 0), tgtPos = V(), tgtLook = V();
  const par = { x: 0, y: 0, ex: 0, ey: 0 };

  function poseAt(sv, outP, outL) {
    const i = Math.min(STATIONS - 2, Math.floor(sv)), f = smooth(0.12, 0.88, sv - i);
    outP.copy(poses[i].p).lerp(poses[i + 1].p, f); outL.copy(poses[i].l).lerp(poses[i + 1].l, f);
    if (i < STATIONS - 2) outP.y += Math.sin(f * Math.PI) * 0.5;
  }

  function setNight(n) {
    night = n;
    const bg = n ? 0x05070a : 0x1a2532;
    scene.background.set(bg); scene.fog.color.set(bg); fogBase = n ? 0.045 : 0.032;
    hemi.intensity = n ? 0.22 : 1.5; sun.intensity = n ? 0.25 : 2.4;
    scene.environmentIntensity = n ? 0.35 : 1.25;
    floor.material.uniforms.uInt.value = n ? 1.25 : 0.7;
    floor.material.uniforms.uBase.value.set(n ? 0x06080b : 0x111a24);
    renderer.toneMappingExposure = n ? 1.05 : 1.0;
  }

  // ---- focus (tap on model) ----
  function focus(key, from) {
    const i = byKey[key]; if (i === undefined) return;
    focusKey = key; focusScroll = scrollY;
    const target = anchors[i + 1];
    if (Math.abs(scrollY - target) > innerHeight * 0.6) { scrollTo({ top: target, behavior: rm ? 'auto' : 'smooth' }); focusScroll = target; }
    ui.showCard(st[i].info, from);
  }
  function unfocus() { if (!focusKey) return; focusKey = null; ui.hideCard(); }
  function focusPose(i, outP, outL) {
    const m = st[i], L = m.L, c = L.pos.clone(); c.z += L.zc; c.y = m.size.h * 0.5;
    if (portrait) { outL.set(c.x, c.y - 0.75, c.z); outP.set(c.x, c.y + 0.4, c.z + L.dist * 0.95); } else { outL.set(c.x + 0.9, c.y, c.z); outP.set(c.x + 0.9, c.y + 0.4, c.z + L.dist * 0.88); }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), roots = st.map((m) => m.group);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(roots, true).find((h) => h.object.userData.key && h.object.isMesh);
    return hit ? hit.object.userData.key : null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || introOn) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (d > 8 || dt > 600) return;
    const k = pick(e); if (k) focus(k); else unfocus();
  });
  if (!mobile) {
    let pend = null;
    canvas.addEventListener('pointermove', (e) => { pend = e; });
    addEventListener('mousemove', (e) => { par.x = e.clientX / innerWidth - 0.5; par.y = e.clientY / innerHeight - 0.5; }, { passive: true });
    setInterval(() => { if (pend && !introOn) { canvas.classList.toggle('hov', !!pick(pend)); pend = null; } }, 90);
  }
  addEventListener('scroll', () => { if (focusKey && Math.abs(scrollY - focusScroll) > 140) unfocus(); }, { passive: true });

  // ---- intro flight ----
  const INTRO = 4.6;
  function introPose(t, outP, outL) {
    const p0 = poses[0];
    if (t < 0.5) {
      const k = ease(t / 0.5); outP.set(0, 1.55, 15 - 7.6 * k); outL.set(0, 1.5, 0);
    } else {
      const k = ease((t - 0.5) / 0.5), a = V(0, 1.55, 7.4), b = V(0, 1.5, 4.2), c = p0.p;
      outP.copy(a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(b, 2 * (1 - k) * k).addScaledVector(c, k * k);
      outL.set(0, 1.5, -4).lerp(p0.l, k);
    }
  }
  function endIntro() { if (!introOn) return; introOn = false; introT = 1; win.open(1); ui.introDone(); }

  // ---- loop ----
  resize();
  addEventListener('resize', resize);
  addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  const timer = new THREE.Timer(); timer.connect(document);
  let introStart = 0;
  let hudLast = -1;

  function frame() {
    timer.update(); const dt = Math.min(0.1, timer.getDelta()), t = timer.getElapsed();
    const target = stationFromScroll();
    s = rm ? target : s + (target - s) * Math.min(1, dt * 3.5);

    if (introOn) {
      introT = Math.min(1, (performance.now() - introStart) / 1000 / INTRO);
      introPose(introT, camPos, camLook); win.open(smooth(0.28, 0.62, introT));
      ui.introProgress(introT);
      if (introT >= 1) endIntro();
    } else {
      const fi = focusKey ? byKey[focusKey] : -1;
      if (fi >= 0) focusPose(fi, tgtPos, tgtLook); else poseAt(s, tgtPos, tgtLook);
      if (!rm && !mobile) { par.ex += (par.x - par.ex) * Math.min(1, dt * 2); par.ey += (par.y - par.ey) * Math.min(1, dt * 2); tgtPos.x += par.ex * 0.35; tgtPos.y -= par.ey * 0.2; tgtLook.x += par.ex * 0.12; }
      const k = rm ? 1 : 1 - Math.exp(-dt * 4.5);
      camPos.lerp(tgtPos, k); camLook.lerp(tgtLook, k);
    }
    camera.position.copy(camPos); camera.lookAt(camLook);
    beamMesh.visible = camPos.y < 6.6;
    scene.fog.density = fogBase / (1 + Math.max(0, camPos.y - 3) * 0.13);

    // models & dims
    const active = Math.round(s);
    st.forEach((m, i) => {
      const p = clamp01((s - (i + 1 - 0.85)) / 0.85);
      m.update(focusKey === m.key ? Math.max(p, 1) : p, rm ? 0 : t, night);
      m.dimsCtl.update(!introOn && (active === i + 1 || focusKey === m.key) && Math.abs(s - (i + 1)) < 0.4 ? 1 : 0, dt);
    });
    const fu = floor.material.uniforms.uFocus.value;
    const ai = active >= 1 && active <= 4 ? active - 1 : -1;
    if (ai >= 0) { const L = LAYOUT[ai]; fu.x += (L.pos.x - fu.x) * Math.min(1, dt * 3); fu.y += (L.pos.z + L.zc - fu.y) * Math.min(1, dt * 3); }
    fu.z += ((ai >= 0 ? 1 : 0) - fu.z) * Math.min(1, dt * 2.5);

    if (active !== hudLast) { hudLast = active; ui.station(active, STATIONS); }
    ui.progress(s / (STATIONS - 1));
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); renderer.setAnimationLoop(null); ui.fallback(); });

  return {
    setNight,
    focus, unfocus,
    playIntro() {
      introOn = true; introT = 0; introStart = performance.now(); win.open(0);
      introPose(0, camPos, camLook);
    },
    skipIntro() { if (introOn) { introT = 1; introPose(1, camPos, camLook); endIntro(); } },
    get introOn() { return introOn; },
  };
}
