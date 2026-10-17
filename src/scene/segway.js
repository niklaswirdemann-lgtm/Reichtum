import * as THREE from 'three';
import { box, cyl, ico, merge, paint, place } from './util.js';

// Stilisiertes Segway i2 mit Fahrer:in. Vorwärts = +z (für Object3D.lookAt).
// Aufbau: root (Position/Richtung) → lean (Kurvenneigung um z, Nicken um x) → Körper
//         Räder separat, damit sie sich drehen können.

export function createSegway(shadow) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const root = new THREE.Group();
  const lean = new THREE.Group();
  root.add(lean);

  const WHEEL_R = 0.42;
  const body = merge([
    // Plattform & Kotflügel
    box(0.56, 0.12, 0.44, '#2c3238', { y: 0.3 }),
    box(0.1, 0.12, 0.6, '#3a4148', { x: -0.33, y: 0.78 }),
    box(0.1, 0.12, 0.6, '#3a4148', { x: 0.33, y: 0.78 }),
    box(0.14, 0.04, 0.5, '#2fd8c4', { x: -0.33, y: 0.86 }),
    box(0.14, 0.04, 0.5, '#2fd8c4', { x: 0.33, y: 0.86 }),
    // Lenkstange (LeanSteer)
    cyl(0.045, 0.05, 1.02, 6, '#15181b', { y: 0.4, z: 0.05, rx: 0.06 }),
    box(0.62, 0.07, 0.07, '#15181b', { y: 1.42, z: 0.12 }),
    box(0.1, 0.09, 0.09, '#2fd8c4', { x: -0.31, y: 1.42, z: 0.12 }),
    box(0.1, 0.09, 0.09, '#2fd8c4', { x: 0.31, y: 1.42, z: 0.12 }),
    // Fahrer:in – Beine
    box(0.17, 0.82, 0.2, '#2e4766', { x: -0.12, y: 0.38, z: -0.02 }),
    box(0.17, 0.82, 0.2, '#2e4766', { x: 0.12, y: 0.38, z: -0.02 }),
    box(0.2, 0.08, 0.3, '#1e2226', { x: -0.12, y: 0.36, z: 0.03 }),
    box(0.2, 0.08, 0.3, '#1e2226', { x: 0.12, y: 0.36, z: 0.03 }),
    // Oberkörper (Jacke in Akzentfarbe) leicht nach vorn geneigt
    box(0.46, 0.62, 0.28, '#24b5a5', { y: 1.18, z: -0.02, rx: 0.08 }),
    box(0.48, 0.12, 0.3, '#1d8f83', { y: 1.18, z: -0.02 }),
    // Arme zur Lenkstange
    box(0.11, 0.11, 0.48, '#24b5a5', { x: -0.27, y: 1.58, z: 0.0, rx: 0.55 }),
    box(0.11, 0.11, 0.48, '#24b5a5', { x: 0.27, y: 1.58, z: 0.0, rx: 0.55 }),
    box(0.1, 0.1, 0.12, '#e3b48f', { x: -0.29, y: 1.39, z: 0.14 }),
    box(0.1, 0.1, 0.12, '#e3b48f', { x: 0.29, y: 1.39, z: 0.14 }),
    // Kopf + Helm
    box(0.12, 0.08, 0.12, '#e3b48f', { y: 1.8 }),
    ico(0.15, '#e3b48f', { y: 1.99, z: 0.01 }),
    place(paint(new THREE.SphereGeometry(0.175, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f3f5f5'), { y: 2.02, z: -0.01 }),
    box(0.24, 0.035, 0.08, '#2fd8c4', { y: 2.06, z: 0.13 }),
  ]);
  const bodyMesh = new THREE.Mesh(body, mat);
  bodyMesh.castShadow = shadow;
  lean.add(bodyMesh);

  const wheelGeo = merge([
    cyl(WHEEL_R, WHEEL_R, 0.2, 16, '#1b1f24', { rz: Math.PI / 2, x: 0.1 }),
    cyl(0.25, 0.25, 0.22, 10, '#8a9399', { rz: Math.PI / 2, x: 0.11 }),
    box(0.23, 0.08, 0.36, '#c5cdd1', {}).translate(0, -0.04, 0),
  ]);
  // Rad-Achse liegt auf x; Pivot in die Mitte
  wheelGeo.translate(-0.1, 0, 0);
  const wheels = [-0.33, 0.33].map((x) => {
    const w = new THREE.Mesh(wheelGeo, mat);
    w.position.set(x, WHEEL_R, 0);
    w.castShadow = shadow;
    lean.add(w);
    return w;
  });

  // Weicher Kontaktschatten, auch ohne Shadow-Map (Mobile)
  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.09;
  root.add(blob);

  let spin = 0;
  return {
    root,
    // speed in m/s (signed), leanAngle in rad
    update(distanceDelta, leanAngle, pitch) {
      spin += distanceDelta / WHEEL_R;
      for (const w of wheels) w.rotation.x = spin;
      lean.rotation.z = leanAngle;
      lean.rotation.x = pitch;
    },
  };
}
