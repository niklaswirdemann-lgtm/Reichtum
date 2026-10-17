import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import { openStatus, isNight } from './time.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

/* ---- live opening status ---- */
function updateStatus() {
  const s = openStatus();
  for (const el of $$('[data-status]')) { el.classList.toggle('on', s.open); el.querySelector('span').textContent = s.text; }
  for (const tr of $$('.hrs tr[data-d]')) tr.classList.toggle('today', tr.dataset.d.split(',').map(Number).includes(s.day));
}
updateStatus();

/* ---- request form: builds a WhatsApp / e-mail message, nothing is sent by the site ---- */
const fq = $('#fq');
if (fq) {
  const val = (n) => fq.elements[n].value.trim();
  fq.addEventListener('submit', (e) => {
    e.preventDefault();
    const ls = $$('input[name=l]:checked', fq).map((x) => x.value);
    if (!ls.length && !val('msg')) { $('#fqs').textContent = 'Bitte mindestens eine Leistung ankreuzen oder eine Nachricht schreiben.'; return; }
    const subject = 'Anfrage' + (ls.length ? ': ' + ls.join(', ') : '') + (val('ort') ? ' in ' + val('ort') : '');
    const body = ['Hallo Herr de Vries,', '', val('msg') || 'ich interessiere mich für Ihre Leistungen und bitte um Rückmeldung.', '',
      'Leistung: ' + (ls.join(', ') || '-'), 'Ort: ' + (val('ort') || '-'), 'Rückruf unter: ' + (val('tel') || '-'), '', 'Viele Grüße', val('name')].join('\n');
    if (e.submitter && e.submitter.dataset.via === 'mail') location.href = 'mailto:joerg.de.vries@ewetel.net?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    else window.open('https://wa.me/49493176265?text=' + encodeURIComponent(subject + '\n\n' + body), '_blank', 'noopener');
    $('#fqs').textContent = 'Ihre Nachricht ist vorbereitet – bitte in WhatsApp bzw. Ihrem E-Mail-Programm noch absenden.';
  });
}
setInterval(updateStatus, 30000);
$('#yr').textContent = new Date().getFullYear();

/* ---- copy phone number ---- */
for (const b of $$('[data-copy]')) {
  b.addEventListener('click', async () => {
    const txt = b.dataset.copy, label = b.textContent;
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: txt }); ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    }
    b.textContent = ok ? 'Kopiert ✓' : txt; b.classList.toggle('ok', ok);
    setTimeout(() => { b.textContent = label; b.classList.remove('ok'); }, 2000);
  });
}

/* ---- nav highlight ---- */
const navLinks = $$('header nav a');
const io = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) navLinks.forEach((a) => a.toggleAttribute('aria-current', a.hash === '#' + e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => io.observe(s));

/* ---- WebGL or fallback ---- */
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}
function fallback() { root.classList.remove('pre'); root.classList.add('no3d'); document.body.classList.remove('lock'); $('#intro').hidden = true; }

const tip = $('#tip');
function showTip(text, ms = 4500) { tip.textContent = text; tip.classList.add('on'); setTimeout(() => tip.classList.remove('on'), ms); }

if (!hasWebGL()) {
  fallback();
} else {
  init().catch((err) => { console.error(err); fallback(); });
}

async function init() {
  const { start } = await import('./scene.js');
  const card = $('#card');
  let lastFocus = null;
  const hl = $('#hl'), hn = $('#hn'), hb = $('#hb');
  const NAMES = ['Start', 'Haustür', 'Sektionaltor', 'Terrassendach', 'Markise', 'Übersicht'];

  const ui = {
    reduced,
    showCard(info, from) {
      lastFocus = from || document.activeElement;
      $('#ce').textContent = info.e; $('#ct').textContent = info.t; $('#cx').textContent = info.x;
      $('#cm').textContent = 'Modell · Darstellung, keine echten Maße';
      card.hidden = false; requestAnimationFrame(() => card.classList.add('on'));
      $('#cc').focus({ preventScroll: true });
    },
    hideCard() {
      card.classList.remove('on'); setTimeout(() => { if (!card.classList.contains('on')) card.hidden = true; }, 450);
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); lastFocus = null;
    },
    station(i, n) { hn.textContent = String(i + 1).padStart(2, '0'); hl.textContent = NAMES[i] || ''; },
    progress(p) { hb.style.setProperty('--p', p.toFixed(3)); },
    introProgress(t) { $('#intro').classList.toggle('fade', t > 0.42); },
    introDone() {
      $('#intro').hidden = true; document.body.classList.remove('lock'); root.classList.remove('pre');
      if (!store.get('tipSeen')) { showTip('Tipp: Die Modelle lassen sich antippen'); store.set('tipSeen', '1'); }
    },
    fallback,
  };

  const api = await start(ui);

  /* day / night: auto by Berlin time + sunrise/sunset in Hage, or forced */
  const dn = $('#dn'); dn.hidden = false;
  const MODES = ['auto', 'tag', 'nacht'], LABEL = { auto: 'Auto', tag: 'Tag', nacht: 'Nacht' };
  let mode = MODES.includes(store.get('dn')) ? store.get('dn') : 'auto';
  const applyMode = () => {
    const n = mode === 'nacht' || (mode === 'auto' && isNight());
    api.setNight(n);
    dn.textContent = LABEL[mode] + (mode === 'auto' ? (n ? ' · Nacht' : ' · Tag') : '');
    dn.dataset.m = mode; dn.setAttribute('aria-label', `Tag-/Nachtmodus: ${LABEL[mode]}${mode === 'auto' ? `, gerade ${n ? 'Nacht' : 'Tag'}` : ''}. Klicken zum Wechseln.`);
  };
  dn.addEventListener('click', () => { mode = MODES[(MODES.indexOf(mode) + 1) % 3]; store.set('dn', mode); applyMode(); });
  applyMode(); setInterval(applyMode, 60000);

  /* model buttons + card */
  for (const b of $$('.mdl')) b.addEventListener('click', () => api.focus(b.dataset.model, b));
  $('#cc').addEventListener('click', () => api.unfocus());

  /* intro */
  const intro = $('#intro');
  const skip = () => api.skipIntro();
  $('#skip').addEventListener('click', skip);
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (api.introOn) skip(); else api.unfocus();
  });
  if (!reduced && !location.hash) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    intro.hidden = false; document.body.classList.add('lock');
    api.playIntro();
    $('#skip').focus({ preventScroll: true });
  } else root.classList.remove('pre');
}
