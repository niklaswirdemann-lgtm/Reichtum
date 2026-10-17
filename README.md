# SegTeam Norden – Website

Statische Website für den Segway-, E-Mobil- und Hilfsmittelverleih in Norden-Norddeich.
Herzstück ist ein scroll-gesteuerter 3D-Durchgang (Three.js): Beim Scrollen fährt ein Segway eine Tour
vom Dörper Weg über den Deich, zum Hafen, durch die Felder in die Altstadt Norden und zurück.

- Vite + Vanilla JS, Three.js, GSAP + ScrollTrigger, Lenis
- Kein Backend, keine Tracker, keine Cookies, Schriften lokal (DSGVO)
- Alle Inhalte stehen beim Build statisch im HTML (SEO), Firmendaten zentral in `src/config.js`

## Starten

```bash
npm install
npm run dev       # Entwicklungsserver: http://localhost:5173
npm run build     # Produktions-Build nach dist/
npm run preview   # Build lokal ansehen: http://localhost:4173
```

Benötigt Node.js 20.19+ oder 22.12+.

## Deploy

**Netlify (empfohlen):** Repo bei Netlify verbinden („Add new site → Import from Git“). Build-Einstellungen
kommen automatisch aus `netlify.toml` (`npm run build`, Ordner `dist`). Jeder Push veröffentlicht neu.

**Suchmaschinen:** Solange `publish.indexable` in `src/config.js` auf `false` steht, ist die Seite für
Google gesperrt (`noindex` + `robots.txt`). Erst auf `true` stellen, wenn Platzhalter ersetzt und Domain steht.

**Eigener Webspace:** `npm run build` erzeugt den Ordner `dist/`. Dessen **Inhalt** per FTP/SFTP auf den Webspace laden – fertig.
Alle Pfade sind relativ, die Seite funktioniert also auch in einem Unterordner.
`robots.txt` und `sitemap.xml` werden automatisch mit der Domain aus `config.js` erzeugt.

## Hilfreiche URL-Parameter (zum Testen)

| Parameter | Wirkung |
|---|---|
| `?akzent=tuerkis` / `seegras` / `priel` | Akzentfarbe live vergleichen (Standard in `config.js` → `theme.accent`) |
| `?qualitaet=high` / `low` / `static` | 3D-Stufe erzwingen (Desktop / Mobile / illustrierte Version) |
| `?debug` | Ladezeiten der 3D-Bauschritte in der Konsole, Performance-Wächter aus |

## Struktur

```
index.html, impressum.html, datenschutz.html   Seiten (mit {{platzhaltern}} aus config.js)
vite.config.js                                 Build-Plugin: setzt Inhalte & JSON-LD ins HTML, erzeugt robots/sitemap
public/                                        favicon.svg, og-image.jpg (Teilen-Vorschau, aus der 3D-Szene gerendert)
src/config.js                                  ALLE Firmendaten, Angebote, Preise, FAQ, Stationstexte
src/main.js                                    Einstieg: Lenis, Gerätestufe, Loader, 3D-Start
src/quality.js                                 Erkennung high / low / static
src/sections/render.js                         HTML der Sektionen (läuft beim Build)
src/sections/ui.js                             Navigation, Reveals, Karussell, Karte, Formular, magnetische Buttons
src/sections/tour-overlay.js                   Hero, Stations-Panels und Fortschrittspunkte über dem Canvas
src/scene/index.js                             Renderer, Kamera, Render-Loop (pausiert unsichtbar)
src/scene/route.js                             Tour-Route (CatmullRom), Stationen, Scroll→Route-Zeitachse
src/scene/terrain.js                           Höhen: Deich, Watt, Hafenkaje
src/scene/world.js                             Boden, Wege, Gebäude, Hafen, Altstadt, Windräder, Schiffe
src/scene/nature.js                            Instanziert: Bäume, Gras, Schafe, Kühe, Wolken, Möwen
src/scene/water.js / sky.js / segway.js        Nordsee-Shader, Himmel & Tageszeit, Segway mit Fahrer:in
src/styles/main.css                            Design-Tokens, Layout, Akzent-Varianten
```

## 3D-Durchgang: Stationen anpassen

- Route: `POINTS_2D` in `src/scene/route.js` (x = Osten, z = Süden, in Metern)
- Stationen: `STATION_DEFS` (Haltepunkt, Blickziel, Kameraabstand/-höhe), Texte in `config.js → stations`
- Tageszeit: Keyframes in `src/scene/sky.js` (Sommer: Aufgang NO, Untergang NW)
- Leistung: Mobile/schwache Geräte bekommen automatisch weniger Objekte und keine Schatten.
  Fällt die Bildrate dauerhaft unter ~30 fps, werden Schatten und Auflösung reduziert. Unter ~18 fps
  wird auf die illustrierte Version umgeschaltet. Bei „Bewegung reduzieren“ (Betriebssystem) gibt es immer
  die illustrierte Version.

## ⚠️ Platzhalter – vor dem Livegang ersetzen

**Firmendaten (`src/config.js`)**
- [ ] E-Mail prüfen: `kontakt@` oder `info@segteam-norden.de`?
- [ ] Telefonnummer prüfen (`phone` **und** `phoneIntl`)
- [ ] Inhaber/Ansprechpartner (`owner`)
- [ ] Domain (`siteUrl`) – wirkt auf Canonical, Open Graph, JSON-LD, Sitemap
- [ ] Koordinaten (`geo`) für Karte & Schema genau setzen
- [ ] Öffnungszeiten / Saison (`openingHours`, `openingHoursSchema`)

**Inhalte (`src/config.js`)**
- [ ] Preise (aktuell vorläufige Platzhalter; der Hinweis „Vorläufig“ steht in `render.js → renderPrices`, entfernen sobald final)
- [ ] Bewertungen: **echte** Gästestimmen eintragen und den Platzhalter-Hinweis in `render.js → renderReviews` entfernen
- [ ] Team: Namen/Rollen, Fotos in `render.js → renderTeam` einsetzen (Kommentar zeigt das `<img>`-Muster)
- [ ] FAQ-Antworten prüfen (Mindestalter, Gewichtsgrenzen, Wetter-Regel)
- [ ] Wattmobil: Details der Kooperation mit der Seehundstation bestätigen
- [ ] Angebotstexte/Metadaten (Dauer, Mindestalter) prüfen

**Rechtliches**
- [ ] `impressum.html`: alle `[PRÜFEN: …]`-Stellen (Rechtsform, USt-ID, Verantwortlicher, Streitbeilegung)
- [ ] `datenschutz.html`: Webhoster eintragen, Text rechtlich prüfen lassen
- [ ] Platzhalter-Hinweise auf beiden Seiten entfernen

**Optional**
- [ ] `public/og-image.jpg` durch ein echtes Foto ersetzen (1200 × 630 px)
- [ ] Akzentfarbe festlegen (`theme.accent`)
- [ ] Zum Livegang: `publish.indexable: true` setzen

## Lighthouse

Gemessen mit Lighthouse 12 in einer Cloud-Umgebung **ohne Grafikkarte** (Software-Rendering „SwiftShader“):

| Variante | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Desktop mit 3D | 62 | 100 | 100 | 100 |
| Mobile mit 3D | 64 | 100 | 100 | 100 |
| Desktop statisch (`?qualitaet=static`) | 100 | 100 | 100 | 100 |

LCP 0,7 s, CLS ≈ 0. Der Performance-Wert mit 3D wird durch die Total Blocking Time gedrückt: Ohne GPU
laufen WebGL-Kontext und Shader-Kompilierung auf der CPU. Auf echter Hardware kompiliert Chrome die Shader
parallel (`compileAsync`), der Wert sollte deutlich höher liegen. Bitte lokal in Chrome nachmessen
(DevTools → Lighthouse, Modus Desktop).
