// Zentrale Firmendaten & Inhalte.
// Alles, was mit "PRÜFEN" markiert ist, muss vor dem Livegang mit echten Daten ersetzt werden.
// Diese Datei wird beim Build gelesen (Texte landen statisch im HTML = gut für SEO)
// und zur Laufzeit importiert (Formular, Buttons).

export const company = {
  name: 'SegTeam Norden',
  claim: 'Segway-, E-Mobil- & Hilfsmittelverleih an der Nordsee',
  street: 'Dörper Weg 23',
  zip: '26506',
  city: 'Norden-Norddeich',
  region: 'Niedersachsen',
  country: 'DE',
  // PRÜFEN – es ist auch info@segteam-norden.de im Umlauf
  email: 'kontakt@segteam-norden.de',
  // PRÜFEN – ältere Quellen nennen andere Nummern
  phone: '0160 664 18 61',
  phoneIntl: '+491606641861',
  openingHours: 'täglich 10–18 Uhr (in der Urlaubssaison)',
  // Für das LocalBusiness-Schema: Mo–So 10–18 Uhr
  openingHoursSchema: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '10:00', closes: '18:00' },
  foundingYear: 2010,
  owner: 'PRÜFEN – Inhaber/Ansprechpartner',
  // PRÜFEN – Koordinaten des Standorts (aktuell ungefähr Dörper Weg, Norddeich)
  geo: { lat: 53.6219, lon: 7.156 },
  // PRÜFEN – endgültige Domain
  siteUrl: 'https://www.segteam-norden.de',
  priceRange: '€€',
};

// Suchmaschinen: erst auf true stellen, wenn alle Platzhalter ersetzt sind und die echte Domain steht.
// Solange false: <meta name="robots" content="noindex"> + robots.txt sperrt alles.
export const publish = { indexable: false };

// Akzentfarbe: 'tuerkis' (Standard), 'seegras' oder 'priel'.
// Zum Vergleichen im Browser: ?akzent=seegras an die URL hängen.
export const theme = { accent: 'tuerkis' };

export const offers = [
  {
    id: 'thementour',
    title: 'Geführte Segway-Thementouren',
    text: 'Deich, Hafen, Altstadt: Mit Guide auf dem Segway durch Norddeich und Norden. Inklusive Einweisung und Sicherheitstraining.',
    meta: 'ca. 1–2 Std. · ab 15 Jahren',
    icon: 'route',
  },
  {
    id: 'verleih',
    title: 'Segway-Verleih',
    text: 'Segway i2 auf eigene Faust: bis 20 km/h, leise und elektrisch. Nach kurzer Einweisung geht es selbstständig los.',
    meta: 'Modell i2 · bis 20 km/h',
    icon: 'segway',
  },
  {
    id: 'gruppe',
    title: 'Gruppen- & Familienfahrten',
    text: 'Geburtstag, Betriebsausflug oder Familienurlaub: Wir stellen die Tour für eure Gruppe zusammen.',
    meta: 'ab 4 Personen',
    icon: 'group',
  },
  {
    id: 'emobil',
    title: 'E-Mobil-Touren',
    text: 'Mit dem E-Mobil gemütlich an der Küste entlang. Ideal für alle, die es entspannt mögen.',
    meta: 'leise · emissionsfrei',
    icon: 'bolt',
  },
  {
    id: 'wattmobil',
    title: 'Wattmobil',
    // PRÜFEN – Details der Kooperation mit der Seehundstation
    text: 'Barrierefrei ins Watt: Mit dem Wattmobil erleben auch Menschen mit eingeschränkter Mobilität das Weltnaturerbe. In Kooperation mit der Seehundstation.',
    meta: 'barrierefrei',
    icon: 'wave',
  },
  {
    id: 'hilfsmittel',
    title: 'Hilfsmittelverleih',
    text: 'E-Scooter, Seniorenscooter, Rollstühle und Rollatoren für den Urlaub, mit Bring- und Abholservice zur Unterkunft.',
    meta: 'Bring- & Abholservice',
    icon: 'wheelchair',
  },
];

// VORLÄUFIGE Platzhalterpreise – PRÜFEN
export const prices = [
  { item: 'Segway, 1 Stunde', price: '25 €', note: 'pro Person' },
  { item: 'Segway, 2 Stunden', price: '37 €', note: 'pro Person' },
  { item: 'Gruppe (4 Personen), 1 Stunde ohne Guide', price: '90 €', note: 'gesamt' },
];
export const priceNotes = [
  '15 % Rabatt mit der OstfrieslandCard',
  'Hilfsmittel & Wattmobil: Preise auf Anfrage',
];

export const steps = [
  { title: 'Einweisung', text: 'Wir erklären das Segway in Ruhe. Helm auf, Fragen gerne.' },
  { title: 'Sicherheitstraining', text: 'Auf dem Übungsplatz: anfahren, bremsen, lenken, bis es sich sicher anfühlt.' },
  { title: 'Tour', text: 'Raus an Deich, Hafen und Felder. Mit Guide oder auf eigene Faust.' },
];

// PLATZHALTER – im Stil echter Gästestimmen, durch echte Bewertungen ersetzen!
export const reviews = [
  { name: 'Platzhalter: Anke, Dortmund', text: 'Nach fünf Minuten fühlte sich das Segway ganz natürlich an. Die Tour über den Deich bei Sonnenuntergang war das Highlight unseres Urlaubs.', stars: 5 },
  { name: 'Platzhalter: Familie K., Köln', text: 'Super geduldige Einweisung, auch unsere 16-jährige Tochter war sofort sicher unterwegs. Gerne wieder!', stars: 5 },
  { name: 'Platzhalter: Jürgen, Hannover', text: 'Der Seniorenscooter wurde pünktlich zur Ferienwohnung gebracht. Unkompliziert und sehr freundlich.', stars: 5 },
  { name: 'Platzhalter: Mia & Tom, Hamburg', text: 'Hafen, Kühe, Altstadt: in zwei Stunden mehr gesehen als sonst in zwei Tagen. Absolute Empfehlung.', stars: 5 },
];

// PLATZHALTER – Namen, Rollen und Fotos ergänzen
export const team = [
  { name: 'Name folgt', role: 'Inhaber & Guide' },
  { name: 'Name folgt', role: 'Guide & Technik' },
  { name: 'Name folgt', role: 'Hilfsmittel & Service' },
];

// PRÜFEN – Antworten mit echten Regeln abgleichen
export const faq = [
  { q: 'Ab welchem Alter darf man Segway fahren?', a: 'Segways sind Elektrokleinstfahrzeuge. Fahren darf man ab 14 Jahren, bei unseren Touren gilt ein Mindestalter von 15 Jahren. Das Mindestgewicht liegt bei ca. 45 kg, das Höchstgewicht bei ca. 117 kg.' },
  { q: 'Brauche ich einen Führerschein?', a: 'Nein, für Segways (Elektrokleinstfahrzeuge) ist kein Führerschein nötig. Vor jeder Fahrt gibt es eine Einweisung und ein Sicherheitstraining.' },
  { q: 'Was passiert bei schlechtem Wetter?', a: 'Bei leichtem Nieselregen fahren wir – Nordsee eben. Bei Sturm, Gewitter oder Starkregen verschieben wir die Tour kostenlos oder ihr bekommt euer Geld zurück.' },
  { q: 'Ist das Angebot barrierefrei?', a: 'Mit dem Wattmobil und unseren E-Mobilen sind Ausflüge auch mit eingeschränkter Mobilität möglich. Rollstühle, Rollatoren und Seniorenscooter verleihen wir mit Bring- und Abholservice. Sprecht uns an, wir finden eine Lösung.' },
  { q: 'Muss ich vorher buchen?', a: 'In der Hauptsaison empfehlen wir eine Reservierung per Telefon oder E-Mail. Spontan vorbeikommen klappt oft trotzdem.' },
];

// Stationen des 3D-Durchgangs (Texte der Panels)
export const stations = [
  { id: 'start', kicker: 'Station 1 · Dörper Weg', title: 'Kurze Einweisung, dann geht’s los', text: 'Unser Startpunkt liegt zwischen Ocean Wave und Abenteuergolf. Helm auf, kurz üben, und schon rollt ihr lautlos los.' },
  { id: 'deich', kicker: 'Station 2 · Auf dem Deich', title: 'Wattenmeer bis zum Horizont', text: 'Oben auf dem Deich öffnet sich der Blick: Weltnaturerbe Wattenmeer, Nordseewind, und am Horizont die Inseln.' },
  { id: 'hafen', kicker: 'Station 3 · Hafen Norddeich', title: 'Fähren, Kutter, Möwen', text: 'Hier legen die Fähren nach Norderney und Juist ab. Krabbenkutter, Möwengeschrei und echte Hafenluft.' },
  { id: 'felder', kicker: 'Station 4 · Ostfriesisches Land', title: 'Kühe, Schafe, Schäfchenwolken', text: 'Durch grüne Weiden und an Gräben entlang. Weiter Himmel, wie ihn nur Ostfriesland hat.' },
  { id: 'altstadt', kicker: 'Station 5 · Altstadt Norden', title: 'Marktplatz, Tee & Windmühle', text: 'Teemuseum, historischer Marktplatz, Windmühle und Wasserturm: Norden ist eine der ältesten Städte Ostfrieslands.' },
  { id: 'ziel', kicker: 'Station 6 · Zurück am Start', title: 'Lust bekommen?', text: 'Die echte Tour ist noch schöner. Sucht euch einen Termin aus, wir freuen uns auf euch.' },
];
