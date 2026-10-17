import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { company, offers } from '../config.js';

// Interaktionen der Inhaltssektionen: Navigation, Text-Reveals, Karten, Ablauf, Karussell,
// Karte (2-Klick), mailto-Formular, magnetische Buttons.
export function initUI({ lenis, reducedMotion }) {
  initHeader(lenis);
  initAnchors(lenis);
  initCarousel();
  initMap();
  initForm();
  if (!reducedMotion) {
    initReveals();
    initMagnetic();
  }
}

function initHeader(lenis) {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
}

function initAnchors(lenis) {
  const select = document.querySelector('#f-offer');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (a.dataset.offer && select) select.value = a.dataset.offer;
    const focusTarget = id === '#kontakt' && a.dataset.offer ? document.querySelector('#f-name') : target;
    const done = () => {
      if (focusTarget !== document.body) {
        if (!focusTarget.hasAttribute('tabindex') && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(focusTarget.tagName)) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
      history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
    };
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: id === '#top' ? 0 : -72, duration: 1.4, onComplete: done });
    else { if (id === '#top') window.scrollTo(0, 0); else target.scrollIntoView(); done(); }
  });
}

function splitWords(el) {
  if (el.dataset.split) return [];
  el.dataset.split = '1';
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w) => `<span class="word" aria-hidden="true"><span>${w.replace(/</g, '&lt;')}</span></span>`).join(' ');
  return [...el.querySelectorAll('.word > span')];
}

function initReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  ScrollTrigger.batch('[data-reveal-card]', {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
  // Ablauf: Linie füllt sich beim Scrollen, Schritte erscheinen nacheinander
  const steps = document.querySelector('.steps-wrap');
  if (steps) {
    const vertical = matchMedia('(max-width: 760px)').matches;
    gsap.to('.steps__line-fill', {
      [vertical ? 'scaleY' : 'scaleX']: 1, ease: 'none',
      scrollTrigger: { trigger: steps, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
    });
    gsap.to('[data-step]', {
      opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.18,
      scrollTrigger: { trigger: steps, start: 'top 75%', once: true },
    });
  }
}

function initMagnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.btn--magnetic').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      btn.style.setProperty('--mx', `${(x * 0.22).toFixed(1)}px`);
      btn.style.setProperty('--my', `${(y * 0.3).toFixed(1)}px`);
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });
}

function initCarousel() {
  document.querySelectorAll('[data-carousel]').forEach((c) => {
    const track = c.querySelector('.carousel__track');
    const prev = c.querySelector('[data-carousel-prev]');
    const next = c.querySelector('[data-carousel-next]');
    const stepSize = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    const sync = () => {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -stepSize(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: stepSize(), behavior: 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    // Lenis soll horizontales Scrollen im Karussell nicht abfangen
    track.setAttribute('data-lenis-prevent-wheel', '');
    sync();
    window.addEventListener('resize', sync);
  });
}

function initMap() {
  const map = document.querySelector('[data-map]');
  const btn = map?.querySelector('[data-map-load]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = map.dataset.src;
    iframe.title = `Karte: ${company.name}, ${company.street}, ${company.city}`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    map.querySelector('.map__consent').remove();
    map.append(iframe);
  });
}

function initForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const error = form.querySelector('[data-form-error]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const nameInput = form.querySelector('#f-name');
    if (!name) {
      error.hidden = false;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }
    error.hidden = true;
    nameInput.removeAttribute('aria-invalid');
    const offer = offers.find((o) => o.id === data.get('offer'));
    const offerTitle = offer ? offer.title : 'Allgemeine Anfrage';
    const date = data.get('date') ? new Date(`${data.get('date')}T12:00`).toLocaleDateString('de-DE') : 'flexibel';
    const subject = `Anfrage: ${offerTitle}`;
    const body = [
      'Moin SegTeam Norden,',
      '',
      `ich interessiere mich für: ${offerTitle}`,
      `Wunschtermin: ${date}`,
      `Personen: ${data.get('persons') || '-'}`,
      '',
      String(data.get('message') || '').trim(),
      '',
      'Viele Grüße',
      name,
    ].join('\n');
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
