// Gelände-Höhenfunktion: Ostfriesland ist flach – nur Deich, Watt und Hafenkaje haben Höhe.
// Koordinaten in Metern: +x = Osten, -z = Norden (Richtung Nordsee).

export const DIKE = { z: -40, crest: 3, innerSlope: 12, outerSlope: 12, height: 5 };
export const QUAY = { x0: -160, x1: -95, z0: -70, z1: -50, y: 1.3 };
export const WATER_Y = -0.45;

export function dikeHeight(z) {
  const { z: dz, crest, innerSlope, outerSlope, height } = DIKE;
  const innerEdge = dz + crest; // landseitige Krone
  const outerEdge = dz - crest; // seeseitige Krone
  if (z >= innerEdge + innerSlope) return 0;
  if (z >= innerEdge) return height * (1 - (z - innerEdge) / innerSlope);
  if (z >= outerEdge) return height;
  if (z >= outerEdge - outerSlope) return height * (1 - (outerEdge - z) / outerSlope);
  return 0;
}

// Watt: hinter dem Deich fällt der Boden sanft unter den Wasserspiegel
function wattHeight(z) {
  const start = DIKE.z - DIKE.crest - DIKE.outerSlope; // Deichfuß seeseitig
  if (z >= start) return 0;
  const d = start - z;
  return Math.max(-2.2, -0.15 - d * 0.03);
}

// Boden ohne Kaje
export const baseHeight = (z) => (isSeaward(z) ? wattHeight(z) : dikeHeight(z));

export function heightAt(x, z) {
  let h = baseHeight(z);
  if (x > QUAY.x0 && x < QUAY.x1 && z > QUAY.z0 && z < QUAY.z1) h = Math.max(h, QUAY.y);
  return h;
}

export const isSeaward = (z) => z < DIKE.z - DIKE.crest - DIKE.outerSlope;
