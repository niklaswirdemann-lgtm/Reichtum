// Entscheidet, wie viel 3D das Gerät bekommt:
//   'high'   – volle Szene mit Schatten (Desktop/Laptop)
//   'low'    – vereinfachte Szene ohne Schatten (Mobile/Tablet)
//   'static' – illustrierte Version (reduzierte Bewegung, schwache Geräte, kein WebGL)
// Zum Testen per URL erzwingen: ?qualitaet=high|low|static

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function detectQuality() {
  const forced = new URLSearchParams(location.search).get('qualitaet');
  if (['high', 'low', 'static'].includes(forced)) return forced;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  if (!hasWebGL()) return 'static';
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return 'static';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (cores <= 2 || mem <= 2) return 'static';

  const mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  return mobile || cores <= 4 ? 'low' : 'high';
}
