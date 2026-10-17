// HTML-Ebene über dem 3D-Canvas: Hero, Stations-Panels, Fortschrittspunkte.
// Wird pro Frame mit dem geglätteten Fortschritt aktualisiert (synchron zur Kamera).
export function initTourOverlay(tourEl) {
  const hero = tourEl.querySelector('[data-hero]');
  const panels = [...tourEl.querySelectorAll('[data-station]')];
  const dots = [...tourEl.querySelectorAll('[data-dot]')];
  const last = { hero: -1, panels: panels.map(() => -1), current: -1 };

  function setPanel(el, i, o) {
    if (Math.abs(o - last.panels[i]) < 0.002) return;
    last.panels[i] = o;
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    const on = o > 0.01;
    el.style.visibility = on ? 'visible' : 'hidden';
    el.classList.toggle('is-active', o > 0.6);
  }

  return {
    update(p, timeline) {
      const h = timeline.heroOpacity(p);
      if (Math.abs(h - last.hero) > 0.002) {
        last.hero = h;
        hero.style.opacity = h.toFixed(3);
        hero.style.transform = `translateY(${(-(1 - h) * 40).toFixed(1)}px)`;
        hero.style.visibility = h > 0.01 ? 'visible' : 'hidden';
      }
      let current = 0;
      panels.forEach((el, i) => {
        setPanel(el, i, timeline.panelOpacity(p, i));
        if (p >= timeline.holds[i].start - 0.02) current = i;
      });
      if (current !== last.current) {
        last.current = current;
        dots.forEach((d, i) => {
          d.classList.toggle('is-passed', i < current);
          d.classList.toggle('is-current', i === current);
        });
      }
    },
  };
}
