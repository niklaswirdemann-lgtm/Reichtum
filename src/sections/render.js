// Build-Zeit-Rendering der Inhaltssektionen aus config.js (läuft in Node via vite.config.js).
import { company, offers, prices, priceNotes, steps, reviews, team, faq, stations } from '../config.js';
import { icon } from './icons.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const mailtoHref = (subject) =>
  `mailto:${company.email}?subject=${encodeURIComponent(subject)}`;

const heading = (kicker, title, id) => `
  <p class="kicker">${esc(kicker)}</p>
  <h2 class="section-title" id="${id}" data-reveal>${esc(title)}</h2>`;

function renderStationPanels() {
  return stations
    .map(
      (s, i) => `
    <article class="station-panel" data-station="${i}" aria-labelledby="station-${s.id}">
      <p class="station-panel__kicker">${esc(s.kicker)}</p>
      <h3 class="station-panel__title" id="station-${s.id}">${esc(s.title)}</h3>
      <p class="station-panel__text">${esc(s.text)}</p>
      ${
        i === stations.length - 1
          ? `<a class="btn btn--primary btn--magnetic" href="#kontakt" data-offer="thementour">Jetzt Tour buchen ${icon('arrow')}</a>`
          : ''
      }
    </article>`,
    )
    .join('');
}

function renderStationDots() {
  return stations
    .map((s, i) => `<li class="tour-progress__dot" data-dot="${i}"><span class="visually-hidden">${esc(s.kicker)}</span></li>`)
    .join('');
}

function renderStaticTour() {
  return `
    <ol class="tour-static__list">
      ${stations
        .map(
          (s, i) => `
        <li class="tour-static__item">
          <span class="tour-static__num" aria-hidden="true">${i + 1}</span>
          <div>
            <p class="station-panel__kicker">${esc(s.kicker)}</p>
            <h3 class="tour-static__title">${esc(s.title)}</h3>
            <p>${esc(s.text)}</p>
          </div>
        </li>`,
        )
        .join('')}
    </ol>
    <a class="btn btn--primary" href="#kontakt" data-offer="thementour">Jetzt Tour buchen ${icon('arrow')}</a>`;
}

function renderOffers() {
  return `
  <div class="container">
    ${heading('Angebote', 'Was ihr bei uns erleben könnt', 'angebote-title')}
    <ul class="offer-grid" role="list">
      ${offers
        .map(
          (o) => `
        <li class="offer-card" data-reveal-card>
          <span class="offer-card__icon" aria-hidden="true">${icon(o.icon)}</span>
          <h3 class="offer-card__title">${esc(o.title)}</h3>
          <p class="offer-card__text">${esc(o.text)}</p>
          <p class="offer-card__meta">${esc(o.meta)}</p>
          <a class="offer-card__link" href="#kontakt" data-offer="${o.id}">Anfragen <span class="visually-hidden">: ${esc(o.title)}</span>${icon('arrow')}</a>
        </li>`,
        )
        .join('')}
    </ul>
  </div>`;
}

function renderPrices() {
  return `
  <div class="container container--narrow">
    ${heading('Preise', 'Ehrliche Preise, keine Überraschungen', 'preise-title')}
    <p class="badge-provisional" role="note"><strong>Vorläufig:</strong> Platzhalterpreise, aktuelle Preise bitte telefonisch erfragen.</p>
    <div class="table-wrap">
      <table class="price-table">
        <caption class="visually-hidden">Preise Segway-Verleih (vorläufig)</caption>
        <thead><tr><th scope="col">Angebot</th><th scope="col">Preis</th><th scope="col">Hinweis</th></tr></thead>
        <tbody>
          ${prices.map((p) => `<tr><th scope="row">${esc(p.item)}</th><td class="price-table__price">${esc(p.price)}</td><td>${esc(p.note)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <ul class="price-notes" role="list">
      ${priceNotes.map((n) => `<li>${icon('check')}<span>${esc(n)}</span></li>`).join('')}
    </ul>
  </div>`;
}

function renderSteps() {
  return `
  <div class="container">
    ${heading('So läuft’s ab', 'In drei Schritten auf die Tour', 'ablauf-title')}
    <div class="steps-wrap">
    <span class="steps__line" aria-hidden="true"><span class="steps__line-fill"></span></span>
    <ol class="steps" role="list">
      ${steps
        .map(
          (s, i) => `
        <li class="step" data-step>
          <span class="step__num" aria-hidden="true">${i + 1}</span>
          <h3 class="step__title">${esc(s.title)}</h3>
          <p class="step__text">${esc(s.text)}</p>
        </li>`,
        )
        .join('')}
    </ol>
    </div>
  </div>`;
}

function renderReviews() {
  // HINWEIS: Platzhalter-Bewertungen. Vor dem Livegang durch echte, belegbare Gästestimmen ersetzen
  // (rechtlich: keine erfundenen Bewertungen veröffentlichen!).
  return `
  <div class="container">
    ${heading('Gästestimmen', 'Was unsere Gäste sagen', 'bewertungen-title')}
    <p class="badge-provisional" role="note"><strong>Platzhalter:</strong> Beispieltexte, werden durch echte Bewertungen ersetzt.</p>
    <div class="carousel" data-carousel>
      <ul class="carousel__track" role="list" tabindex="0" aria-label="Bewertungen, horizontal scrollbar">
        ${reviews
          .map(
            (r) => `
          <li class="review">
            <p class="review__stars" aria-label="${r.stars} von 5 Sternen">${'★'.repeat(r.stars)}</p>
            <blockquote class="review__text"><p>„${esc(r.text)}“</p></blockquote>
            <p class="review__name">${esc(r.name)}</p>
          </li>`,
          )
          .join('')}
      </ul>
      <div class="carousel__controls">
        <button class="icon-btn" type="button" data-carousel-prev aria-label="Vorherige Bewertung">${icon('arrowLeft')}</button>
        <button class="icon-btn" type="button" data-carousel-next aria-label="Nächste Bewertung">${icon('arrow')}</button>
      </div>
    </div>
  </div>`;
}

function renderTeam() {
  return `
  <div class="container">
    ${heading('Team', `Seit ${company.foundingYear} für euch am Deich`, 'team-title')}
    <ul class="team-grid" role="list">
      ${team
        .map(
          (t) => `
        <li class="team-card">
          <!-- PLATZHALTER: hier <img src="/team/name.webp" alt="Foto von …" width="400" height="500" loading="lazy"> einsetzen -->
          <div class="team-card__photo" role="img" aria-label="Platzhalter für Teamfoto">${icon('user')}</div>
          <h3 class="team-card__name">${esc(t.name)}</h3>
          <p class="team-card__role">${esc(t.role)}</p>
        </li>`,
        )
        .join('')}
    </ul>
  </div>`;
}

function renderFaq() {
  return `
  <div class="container container--narrow">
    ${heading('FAQ', 'Häufige Fragen', 'faq-title')}
    <div class="faq">
      ${faq
        .map(
          (f) => `
        <details class="faq__item">
          <summary class="faq__q"><span>${esc(f.q)}</span>${icon('plus')}</summary>
          <div class="faq__a"><p>${esc(f.a)}</p></div>
        </details>`,
        )
        .join('')}
    </div>
  </div>`;
}

function renderContact() {
  const { lat, lon } = company.geo;
  const d = 0.008;
  const bbox = [lon - d * 1.6, lat - d, lon + d * 1.6, lat + d].map((n) => n.toFixed(5)).join('%2C');
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik&amp;marker=${lat}%2C${lon}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=16/${lat}/${lon}`;
  return `
  <div class="container">
    ${heading('Kontakt', 'Tour anfragen', 'kontakt-title')}
    <div class="contact">
      <div class="contact__info">
        <address class="contact__address">
          <strong>${esc(company.name)}</strong><br>
          ${esc(company.street)}<br>
          ${esc(company.zip)} ${esc(company.city)}
        </address>
        <ul class="contact__list" role="list">
          <li>${icon('phone')}<a href="tel:${esc(company.phoneIntl)}">${esc(company.phone)}</a></li>
          <li>${icon('mail')}<a href="mailto:${esc(company.email)}">${esc(company.email)}</a></li>
          <li>${icon('clock')}<span>${esc(company.openingHours)}</span></li>
        </ul>
        <div class="map" data-map data-src="${osmEmbed}">
          <div class="map__consent">
            <p>Die Karte wird von OpenStreetMap geladen. Dabei wird deine IP-Adresse an die OpenStreetMap Foundation übertragen.</p>
            <button class="btn btn--ghost" type="button" data-map-load>Karte laden</button>
            <a class="map__link" href="${osmLink}" target="_blank" rel="noopener">Auf OpenStreetMap öffnen</a>
          </div>
        </div>
      </div>
      <form class="contact__form" data-contact-form novalidate>
        <p class="form-hint">Das Formular öffnet euer E-Mail-Programm mit einer vorausgefüllten Nachricht. Es werden keine Daten auf dieser Website gespeichert.</p>
        <div class="field">
          <label for="f-offer">Angebot</label>
          <select id="f-offer" name="offer">
            ${offers.map((o) => `<option value="${o.id}">${esc(o.title)}</option>`).join('')}
            <option value="sonstiges">Sonstiges</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="f-name">Name <span aria-hidden="true">*</span></label>
            <input id="f-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="f-persons">Personen</label>
            <input id="f-persons" name="persons" type="number" min="1" max="50" value="2" inputmode="numeric">
          </div>
        </div>
        <div class="field">
          <label for="f-date">Wunschtermin</label>
          <input id="f-date" name="date" type="date">
        </div>
        <div class="field">
          <label for="f-msg">Nachricht</label>
          <textarea id="f-msg" name="message" rows="4"></textarea>
        </div>
        <p class="form-error" data-form-error role="alert" hidden>Bitte gib deinen Namen an.</p>
        <button class="btn btn--primary btn--magnetic" type="submit">E-Mail-Anfrage erstellen ${icon('arrow')}</button>
      </form>
    </div>
  </div>`;
}

export function renderAll() {
  return {
    'station-panels': renderStationPanels(),
    'station-dots': renderStationDots(),
    'tour-static': renderStaticTour(),
    offers: renderOffers(),
    prices: renderPrices(),
    steps: renderSteps(),
    reviews: renderReviews(),
    team: renderTeam(),
    faq: renderFaq(),
    contact: renderContact(),
    'icon-arrow': icon('arrow'),
    'icon-segway': icon('segway'),
  };
}

export function jsonLd() {
  const c = company;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    additionalType: 'https://schema.org/LocalBusiness',
    name: c.name,
    description: c.claim,
    url: c.siteUrl,
    email: c.email,
    telephone: c.phoneIntl,
    foundingDate: String(c.foundingYear),
    priceRange: c.priceRange,
    image: `${c.siteUrl.replace(/\/$/, '')}/og-image.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.street,
      postalCode: c.zip,
      addressLocality: c.city,
      addressRegion: c.region,
      addressCountry: c.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lon },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: c.openingHoursSchema.days, opens: c.openingHoursSchema.opens, closes: c.openingHoursSchema.closes },
    ],
    makesOffer: offers.map((o) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: o.title, description: o.text } })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
