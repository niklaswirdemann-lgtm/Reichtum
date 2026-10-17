import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { easeInOut, smoothstep, clamp, lerp } from './util.js';

// Tour-Route als geschlossene CatmullRom-Kurve (x/z), Höhe kommt aus dem Gelände.
// Grobe Topologie wie in echt: Start Dörper Weg → Deich → Hafen Norddeich (westlich)
// → Felder → Altstadt Norden (südöstlich) → zurück.
const POINTS_2D = [
  [0, 6], [0, -8], [-3, -20], [-10, -31], [-22, -39.5], [-45, -40], [-72, -40],
  [-92, -46], [-106, -57], [-124, -61], [-141, -58], [-150, -48], [-151, -40],
  [-148, -29], [-138, -12], [-122, 14], [-98, 42], [-70, 72], [-50, 118], [-22, 162],
  [12, 192], [38, 212], [60, 222], [84, 214], [100, 190], [100, 150], [86, 100],
  [70, 52], [56, 20], [34, 11.5], [14, 10.5],
];

// Stationen: Position auf der Route (nächster Kurvenpunkt), Blickziel und Kameraabstand/-höhe
export const STATION_DEFS = [
  { near: [0, 4], look: [4, 1.5, 28], side: 1, dist: 8.5, h: 3.4 },          // 1 Start: Laden zwischen Ocean Wave & Abenteuergolf
  { near: [-45, -40], look: [-40, 0, -160], side: 1, dist: 10, h: 4.6 },     // 2 Deich: Blick aufs Watt
  { near: [-124, -61], look: [-120, 4, -90], side: -1, dist: 13, h: 6.5 },   // 3 Hafen: Blick auf die Fähre
  { near: [-98, 42], look: [-128, 0, 48], side: -1, dist: 9.5, h: 4 },       // 4 Felder: Kühe auf der Weide
  { near: [60, 222], look: [86, 8, 258], side: 1, dist: 14, h: 8.5 },          // 5 Altstadt: Marktplatz, Kirche, Mühle
  { near: [16, 10.7], look: [10, 1.5, 30], side: 1, dist: 9, h: 3.6 },       // 6 Zurück am Laden
];

export function createRoute() {
  const curve = new THREE.CatmullRomCurve3(
    POINTS_2D.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'centripetal',
    0.5,
  );
  curve.arcLengthDivisions = 2000;
  const length = curve.getLength();

  const tmp = new THREE.Vector3();
  // Punkt bei u (beliebig, wird in [0,1) gewickelt) inkl. Geländehöhe
  const pointAt = (u, target = new THREE.Vector3()) => {
    const w = ((u % 1) + 1) % 1;
    curve.getPointAt(w, target);
    target.y = heightAt(target.x, target.z);
    return target;
  };
  const tangentAt = (u, target = new THREE.Vector3()) => {
    const e = 0.0015;
    pointAt(u + e, target);
    pointAt(u - e, tmp);
    return target.sub(tmp).normalize();
  };

  // u-Wert, der einer x/z-Position am nächsten liegt
  const nearestU = ([x, z]) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < 2000; i++) {
      const u = i / 2000;
      curve.getPointAt(u, tmp);
      const d = (tmp.x - x) ** 2 + (tmp.z - z) ** 2;
      if (d < bestD) { bestD = d; best = u; }
    }
    return best;
  };

  // Stationen entlang der Fahrt (u steigt monoton, letzte Station nach einer vollen Runde kurz vor dem Start)
  const u0 = nearestU(STATION_DEFS[0].near);
  const stations = STATION_DEFS.map((s, i) => {
    let u = nearestU(s.near);
    while (u < u0 - 1e-6 || (i > 0 && u <= u0)) u += 1;
    return { ...s, u, look: new THREE.Vector3(...s.look) };
  });

  return { curve, length, pointAt, tangentAt, stations };
}

// Scroll-Fortschritt p ∈ [0,1] → Routenparameter u, mit Haltephasen an den Stationen.
export function createTimeline(stations) {
  const HERO = 0.045;   // Hero-Text am Anfang
  const HOLD = 0.06;    // Haltephase je Station
  const n = stations.length;
  const travelTotal = 1 - HERO - HOLD * n;
  const dists = [];
  for (let i = 1; i < n; i++) dists.push(stations[i].u - stations[i - 1].u);
  const sum = dists.reduce((a, b) => a + b, 0);

  const holds = [];
  let p = HERO;
  for (let i = 0; i < n; i++) {
    holds.push({ start: p, end: p + HOLD });
    p += HOLD;
    if (i < n - 1) p += (dists[i] / sum) * travelTotal;
  }

  function uAt(progress) {
    const x = clamp(progress);
    if (x <= holds[0].end) return stations[0].u;
    for (let i = 1; i < n; i++) {
      if (x < holds[i].start) {
        const a = holds[i - 1].end, b = holds[i].start;
        return lerp(stations[i - 1].u, stations[i].u, easeInOut((x - a) / (b - a)));
      }
      if (x <= holds[i].end) return stations[i].u;
    }
    return stations[n - 1].u;
  }

  // Wie stark „hält“ die Kamera an Station i (0..1) – für Blickwechsel & Panels
  function stationWeight(progress, i) {
    const h = holds[i];
    const fade = 0.03;
    const inW = i === 0 ? 1 : smoothstep(h.start - fade, h.start, progress);
    const outW = i === n - 1 ? 1 : 1 - smoothstep(h.end, h.end + fade, progress);
    return inW * outW;
  }

  function panelOpacity(progress, i) {
    const h = holds[i];
    const fadeIn = i === 0 ? smoothstep(HERO - 0.012, h.start + 0.004, progress) : smoothstep(h.start - 0.018, h.start + 0.004, progress);
    const fadeOut = i === n - 1 ? 1 : 1 - smoothstep(h.end - 0.004, h.end + 0.016, progress);
    return fadeIn * fadeOut;
  }

  const heroOpacity = (progress) => 1 - smoothstep(HERO * 0.25, HERO * 0.9, progress);

  return { uAt, stationWeight, panelOpacity, heroOpacity, holds };
}

// Schnelle Abstandsabfrage (x/z) zur Route über ein Raster
export function createRouteField(route) {
  const cell = 12;
  const map = new Map();
  const p = new THREE.Vector3();
  const n = Math.ceil(route.length / 2);
  for (let i = 0; i < n; i++) {
    route.pointAt(i / n, p);
    const k = `${Math.floor(p.x / cell)}:${Math.floor(p.z / cell)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p.x, p.z);
  }
  return (x, z) => {
    let best = Infinity;
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const arr = map.get(`${cx + i}:${cz + j}`);
      if (!arr) continue;
      for (let k = 0; k < arr.length; k += 2) best = Math.min(best, (arr[k] - x) ** 2 + (arr[k + 1] - z) ** 2);
    }
    return Math.sqrt(best);
  };
}
