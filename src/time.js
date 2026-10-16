// Berlin wall-clock time, opening hours and a simple sunrise/sunset estimate for Hage.

const TZ = 'Europe/Berlin';
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function berlinNow(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: WD[p.weekday], y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, m: +p.minute };
}

// minutes since midnight: [open, close] per weekday (0 = Sunday)
const HOURS = { 1: [420, 960], 2: [420, 960], 3: [420, 960], 4: [420, 960], 5: [420, 720] };
const DAYNAME = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function openStatus(date = new Date()) {
  const t = berlinNow(date);
  const now = t.h * 60 + t.m;
  const today = HOURS[t.day];
  if (today && now >= today[0] && now < today[1]) {
    return { open: true, text: `Jetzt geöffnet · bis ${hhmm(today[1])} Uhr`, day: t.day };
  }
  for (let i = 0; i < 8; i++) {
    const d = (t.day + i) % 7;
    const h = HOURS[d];
    if (!h || (i === 0 && now >= h[0])) continue;
    const when = i === 0 ? 'heute' : i === 1 ? 'morgen' : DAYNAME[d];
    return { open: false, text: `Geschlossen · öffnet ${when} ${hhmm(h[0])} Uhr`, day: t.day };
  }
  return { open: false, text: 'Geschlossen', day: t.day };
}

// Sunrise/sunset for Hage (53.60 N, 7.29 E), standard sunrise equation, result in Berlin local minutes.
const LAT = 53.6, LON = 7.29;
export function isNight(date = new Date()) {
  const t = berlinNow(date);
  const start = Date.UTC(t.y, 0, 0);
  const doy = Math.floor((Date.UTC(t.y, t.mo - 1, t.d) - start) / 864e5);
  const rad = Math.PI / 180;
  const g = (2 * Math.PI / 365) * (doy - 1);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const cosH = (Math.cos(90.833 * rad) - Math.sin(LAT * rad) * Math.sin(decl)) / (Math.cos(LAT * rad) * Math.cos(decl));
  const ha = Math.acos(Math.min(1, Math.max(-1, cosH))) / rad;
  const noonUtc = 720 - 4 * LON - eqt;
  // Berlin offset in minutes for this date
  const utcNow = date.getUTCHours() * 60 + date.getUTCMinutes();
  let off = (t.h * 60 + t.m) - utcNow;
  if (off < -720) off += 1440; if (off > 720) off -= 1440;
  const rise = noonUtc - 4 * ha + off, set = noonUtc + 4 * ha + off;
  const now = t.h * 60 + t.m;
  return now < rise || now > set;
}
