import * as THREE from 'three';
import { createRoute, createTimeline } from './route.js';
import { buildWorld } from './world.js';
import { buildNature } from './nature.js';
import { createSky } from './sky.js';
import { createSegway } from './segway.js';
import { clamp, lerp, nextFrame, yieldToMain } from './util.js';

// Der scroll-gesteuerte 3D-Durchgang.
// setProgress(p) setzt das Ziel (0..1); die Szene folgt weich (gedämpft), auch rückwärts.

export async function createTour({ canvas, quality, onLoadProgress = () => {}, onFrame = () => {}, onDowngrade = () => {}, watchdog = true }) {
  const high = quality === 'high';
  const DEBUG = new URLSearchParams(location.search).has('debug');
  let tMark = performance.now();
  const mark = (label) => { if (DEBUG) { const n = performance.now(); console.log(`[3D] ${label}: ${Math.round(n - tMark)} ms`); tMark = n; } };
  const report = async (v) => { mark(`bis ${Math.round(v * 100)} %`); onLoadProgress(v); await nextFrame(); tMark = performance.now(); };

  await report(0.05);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let maxDpr = high ? 2 : 1.5;
  const applySize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Hochformat: etwas weiter Blickwinkel, damit Segway und Umgebung passen
    camera.fov = camera.aspect < 0.8 ? 62 : 50;
    camera.updateProjectionMatrix();
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 2400);
  applySize();

  await report(0.12);
  const route = createRoute();
  const timeline = createTimeline(route.stations);
  const sky = createSky(scene, quality);

  await report(0.25);
  const world = await buildWorld(scene, route, quality);
  await report(0.55);
  const nature = await buildNature(scene, route, quality);
  await report(0.75);
  const segway = createSegway(high);
  scene.add(segway.root);

  // Startzustand einmal setzen und Shader vorkompilieren (vermeidet Ruckler beim ersten Scrollen)
  const state = {
    target: 0, p: 0, u: route.stations[0].u, lastU: route.stations[0].u,
    lean: 0, pitch: 0, first: true,
  };
  const pos = new THREE.Vector3(), tan = new THREE.Vector3(), ahead = new THREE.Vector3(), tanB = new THREE.Vector3();
  const chaseDir = new THREE.Vector3(), lookDir = new THREE.Vector3(), dir = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), sideV = new THREE.Vector3();
  const portrait = () => camera.aspect < 0.8;

  function step(dt, time) {
    // Gedämpft zum Scroll-Ziel – butterweich, auch bei ruckeligem Scroll-Input
    const k = 1 - Math.exp(-dt * 7);
    state.p += (state.target - state.p) * k;
    if (Math.abs(state.target - state.p) < 1e-5) state.p = state.target;
    const p = state.p;
    const u = timeline.uAt(p);

    route.pointAt(u, pos);
    route.tangentAt(u, tan);
    const du = u - state.lastU;
    const dist = du * route.length;
    state.lastU = u;

    // Segway ausrichten
    segway.root.position.copy(pos);
    ahead.copy(pos).add(tan);
    segway.root.lookAt(ahead.x, pos.y + tan.y, ahead.z);

    // Kurvenneigung: Krümmung × Geschwindigkeit
    route.tangentAt(u + 0.004, tanB);
    const turn = Math.atan2(tan.x * tanB.z - tan.z * tanB.x, tan.x * tanB.x + tan.z * tanB.z); // + = rechts
    const speed = dt > 0 ? Math.abs(dist) / dt : 0;
    const sf = clamp(speed / 6);
    const leanTarget = clamp(turn * 6 * sf * Math.sign(du || 1), -0.32, 0.32);
    state.lean = lerp(state.lean, leanTarget, 1 - Math.exp(-dt * 6));
    const pitchTarget = clamp(du * route.length * 0.05, -0.12, 0.12) + sf * 0.06;
    state.pitch = lerp(state.pitch, pitchTarget, 1 - Math.exp(-dt * 5));
    segway.update(dist, state.lean, state.pitch);

    // Kamera: hinter dem Segway (Verfolger) – an Stationen dreht sie sich zum Blickziel
    let w = 0, wi = 0;
    for (let i = 0; i < route.stations.length; i++) {
      const sw = timeline.stationWeight(p, i);
      if (sw > w) { w = sw; wi = i; }
    }
    chaseDir.set(tan.x, 0, tan.z).normalize();
    const st = route.stations[wi];
    lookDir.set(st.look.x - pos.x, 0, st.look.z - pos.z).normalize();
    dir.copy(chaseDir).lerp(lookDir, w * w * (3 - 2 * w)).normalize();
    const pf = portrait() ? 1.25 : 1;
    const ws = w * w * (3 - 2 * w);
    // Kamera kreist um das Segway (Winkel/Abstand/Höhe werden geglättet, nicht die Position):
    // so folgt sie exakt und kann bei großen Schwenks nie durch Fahrer:in fahren.
    const yawTarget = Math.atan2(dir.x, dir.z);
    const back = lerp(7.2, st.dist, ws) * pf;
    const height = lerp(2.7, st.h, ws);
    const sideOff = ws * 1.6 * st.side;
    const lookAhead = 6 + ws * 10;
    const lookY = 1.3 + ws * (st.look.y - pos.y) * 0.25;
    if (state.first) Object.assign(state, { yaw: yawTarget, back, height, sideOff, lookAhead, lookY, first: false });
    const ck = 1 - Math.exp(-dt * 5);
    let dyaw = yawTarget - state.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    state.yaw += dyaw * ck;
    state.back = lerp(state.back, back, ck);
    state.height = lerp(state.height, height, ck);
    state.sideOff = lerp(state.sideOff, sideOff, ck);
    state.lookAhead = lerp(state.lookAhead, lookAhead, ck);
    state.lookY = lerp(state.lookY, lookY, ck);
    dir.set(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    sideV.crossVectors(dir, UP).multiplyScalar(state.sideOff);
    camera.position.copy(pos).addScaledVector(dir, -state.back).add(sideV);
    camera.position.y = pos.y + state.height;
    desiredLook.copy(pos).addScaledVector(dir, state.lookAhead);
    desiredLook.y = pos.y + state.lookY;
    camera.lookAt(desiredLook);

    // Tageszeit, Wasser, Animationen
    const tod = sky.set(p, pos, world.water);
    sky.dome.position.copy(camera.position);
    nature.clouds.material.color.copy(tod.cloud);
    nature.clouds.material.emissive.copy(tod.cloud);
    world.update(time);
    nature.update(time);

    onFrame(p, timeline);
  }

  step(0.016, 0);
  await report(0.88);
  // Shader vorkompilieren: Auf echten GPUs parallel und ohne den Main-Thread zu blockieren
  // (KHR_parallel_shader_compile), sonst synchron.
  await renderer.compileAsync(scene, camera);
  mark('compile');
  renderer.render(scene, camera);
  mark('erstes Rendern');
  await report(1);

  // --- Render-Loop mit Pausieren, wenn unsichtbar ---
  const timer = new THREE.Timer();
  timer.connect(document);
  let running = false, visible = true, docVisible = !document.hidden;
  let frames = 0, acc = 0, downgraded = false, slowStreak = 0;

  let settled = 0, skip = false, pending = 0;
  function frame() {
    timer.update();
    const rawDt = timer.getDelta();
    // Ruhemodus: Wenn nicht gescrollt wird, nur jedes zweite Frame rendern (Wellen & Möwen laufen weiter, spart Akku)
    settled = Math.abs(state.target - state.p) < 1e-4 ? settled + rawDt : 0;
    const idle = settled > 1.2;
    skip = idle ? !skip : false;
    pending += rawDt;
    if (skip) return;
    const dt = Math.min(pending, 0.1);
    pending = 0;
    step(dt, timer.getElapsed());
    renderer.render(scene, camera);
    if (idle) { frames = 0; acc = 0; return; } // im Ruhemodus nicht messen
    // Performance-Wächter: bei dauerhaft < ~30 fps eine Stufe herunterschalten
    frames++; acc += rawDt;
    if (watchdog && acc > 2) {
      const fps = frames / acc;
      frames = 0; acc = 0;
      if (fps < (downgraded ? 18 : 32)) slowStreak++; else slowStreak = 0;
      if (slowStreak >= (downgraded ? 3 : 2)) {
        slowStreak = 0;
        if (!downgraded) {
          downgraded = true;
          renderer.shadowMap.enabled = false;
          sky.sun.castShadow = false;
          scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
          maxDpr = 1;
          applySize();
        } else {
          onDowngrade();
        }
      }
    }
  }
  const update = () => {
    const should = visible && docVisible;
    if (should && !running) { timer.update(); renderer.setAnimationLoop(frame); running = true; }
    if (!should && running) { renderer.setAnimationLoop(null); running = false; }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { rootMargin: '100px' });
  io.observe(canvas);
  const onVis = () => { docVisible = !document.hidden; update(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => applySize());
  ro.observe(canvas);

  return {
    setProgress(v) { state.target = clamp(v); },
    jump(v) { state.target = state.p = clamp(v); },
    start() { update(); },
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose();
    },
    stations: route.stations,
    timeline,
    debug: () => ({ p: state.p, target: state.target, u: timeline.uAt(state.p), cam: camera.position.toArray().map((v) => +v.toFixed(1)), seg: segway.root.position.toArray().map((v) => +v.toFixed(1)) }),
  };
}
