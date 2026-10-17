import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { detectQuality } from './quality.js';
import { initUI } from './sections/ui.js';
import { initTourOverlay } from './sections/tour-overlay.js';
import { theme } from './config.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
if (!root.dataset.accent && theme.accent !== 'tuerkis') root.dataset.accent = theme.accent;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const quality = detectQuality();

// --- Smooth Scrolling (nur wenn Bewegung erlaubt) ---
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

initUI({ lenis, reducedMotion });

const loader = document.querySelector('[data-loader]');
const fill = document.querySelector('[data-loader-fill]');
const rider = document.querySelector('[data-loader-rider]');
const pct = document.querySelector('[data-loader-pct]');
const setLoad = (v) => {
  const n = Math.round(v * 100);
  fill.style.transform = `scaleX(${v})`;
  rider.style.left = `${n}%`;
  pct.textContent = String(n);
};
const finishLoader = () => {
  loader.classList.add('is-done');
  loader.setAttribute('aria-hidden', 'true');
};

function goStatic() {
  root.classList.add('is-static');
  const tourEl = document.querySelector('[data-tour]');
  tourEl.style.height = '';
  finishLoader();
  ScrollTrigger.refresh();
}

async function startTour() {
  const tourEl = document.querySelector('[data-tour]');
  const canvas = document.querySelector('[data-canvas]');
  const overlay = initTourOverlay(tourEl);
  // Tour-Länge: auf Mobile etwas kürzer
  tourEl.style.height = quality === 'high' ? '1100vh' : '900vh';

  // Sicherheitsnetz: Wenn der Aufbau hängt, nicht ewig den Loader zeigen
  const timeout = setTimeout(() => { if (!loader.classList.contains('is-done')) goStatic(); }, 20000);
  try {
    const { createTour } = await import('./scene/index.js');
    const tour = await createTour({
      canvas,
      quality,
      onLoadProgress: setLoad,
      onFrame: (p, timeline) => overlay.update(p, timeline),
      watchdog: !new URLSearchParams(location.search).has('debug'),
      onDowngrade: () => {
        tour.dispose();
        goStatic();
        document.querySelector('[data-tour-static]').scrollIntoView();
      },
    });
    clearTimeout(timeout);
    ScrollTrigger.create({
      trigger: tourEl,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => tour.setProgress(self.progress),
      onRefresh: (self) => tour.setProgress(self.progress),
    });
    tour.start();
    if (new URLSearchParams(location.search).has('debug')) window.__tour = tour;
    finishLoader();
    ScrollTrigger.refresh();
  } catch (err) {
    clearTimeout(timeout);
    console.warn('3D-Tour nicht verfügbar, zeige statische Version.', err);
    goStatic();
  }
}

if (quality === 'static') goStatic();
else {
  // 3D erst aufbauen, wenn der Browser nach dem ersten Paint Luft hat
  const go = () => startTour();
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 });
  else setTimeout(go, 50);
}
