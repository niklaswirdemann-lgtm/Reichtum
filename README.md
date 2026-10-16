# Montageservice Jörg de Vries – begehbare 3D-Website

Statische Website mit einer 3D-Werkstatt (Vite + Three.js). Beim Scrollen fährt die Kamera von Station zu Station:
Haustür, Sektionaltor, Terrassendach mit Lichterkette, Markise – am Ende Übersicht von oben.

## Entwickeln
```bash
npm install
npm run dev      # lokaler Server
npm run build    # fertige Seite in dist/
npm run preview  # dist/ lokal ansehen
```

## Veröffentlichen
- **GitHub Pages:** Unter *Settings → Pages → Source* „GitHub Actions“ wählen. Der Workflow
  `.github/workflows/deploy.yml` baut und veröffentlicht bei jedem Push automatisch.
- **Anderer Hoster:** `npm run build` ausführen und den Ordner `dist/` hochladen (relative Pfade, läuft in jedem Unterordner).

## Aufbau
- `index.html` – alle Inhalte (funktioniert auch ohne WebGL, dann mit Bauplan-Hintergrund)
- `src/main.js` – Öffnungsstatus, Tag/Nacht-Schalter, Infokarte, Intro-Steuerung, Fallback
- `src/scene.js` – Renderer, Kamerafahrt, Intro, Maßlinien, Antippen der Modelle
- `src/models.js` – Modelle aus einfachen Geometrien (kein GLTF)
- `src/time.js` – Uhrzeit Europe/Berlin, Öffnungszeiten, Sonnenauf-/untergang für Hage
- `public/img/` – die zwei Referenzfotos
- `archiv/einseitig.html` – die vorherige Einzeldatei-Version

## Noch offen
Im Impressum/Datenschutz stehen Platzhalter `[bitte ergänzen]`: Handwerksrolle-Nr., USt-IdNr. und der Hosting-Anbieter.
Schriften sind lokal eingebunden (keine Verbindung zu Google), es gibt kein CDN.
