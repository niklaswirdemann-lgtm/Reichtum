document.getElementById('year').textContent = new Date().getFullYear();

const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

// Kontaktformular: öffnet das E-Mail-Programm mit vorausgefüllter Nachricht.
// Für den Live-Betrieb durch einen Formular-Dienst (z. B. Formspree) oder ein eigenes Backend ersetzen.
const form = document.getElementById('contact-form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(form);
  const body = `Name: ${d.get('name')}\nKontakt: ${d.get('kontakt')}\nLeistung: ${d.get('leistung')}\n\n${d.get('nachricht')}`;
  const to = form.getAttribute('action').replace('mailto:', '');
  window.location.href = `mailto:${to}?subject=${encodeURIComponent('Montage-Anfrage: ' + d.get('leistung'))}&body=${encodeURIComponent(body)}`;
  document.getElementById('form-status').textContent = 'Danke! Ihr E-Mail-Programm wurde geöffnet.';
});
