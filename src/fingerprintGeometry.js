// Radial fingerprint geometry — mirrors the LOCKED math in
// mocks/gen-scrolly.mjs so the small-multiples grid and the player profile
// draw identical wedges. For each slot, a wedge whose radius encodes the
// player's weighted participation in that slot.
import { arc } from 'd3-shape';
import { max } from 'd3-array';
import { scaleSqrt } from 'd3-scale';
import { PLAYER_ORDER } from './palette';
import scenes from './assets/data/scenes.json';

// Slots in canonical radial order.
export const SLOTS = ['1A', '1B', '1C', 'D', '2A', '2B', '2C', 'E', '3s'];

// Display label per slot (group games D/E collapse to "GG", third round to "3rd").
export const SLOT_LABEL = {
  '1A': '1A',
  '1B': '1B',
  '1C': '1C',
  D: 'GG',
  '2A': '2A',
  '2B': '2B',
  '2C': '2C',
  E: 'GG',
  '3s': '3rd',
};

// Collapse a raw scene code to its fingerprint slot key.
export function slotKey(code) {
  const c = String(code).trim();
  if (c === '4') return 'D';
  if (c === '5') return 'E';
  if (/^3/.test(c)) return '3s';
  return c;
}

// Per-player weighted participation by slot (from the backbone).
export const byPlayerSlot = (() => {
  const out = {};
  for (const s of scenes) {
    const k = slotKey(s.sceneCode);
    out[s.player] = out[s.player] || {};
    out[s.player][k] = (out[s.player][k] || 0) + s.weight;
  }
  return out;
})();

// Largest single-slot value across all players (shared radius domain).
export const globalMax = max(PLAYER_ORDER, (p) =>
  max(SLOTS, (sl) => byPlayerSlot[p]?.[sl] || 0)
);

// Slots excluding the third-round beats. Third-round scenes (3*) have a very
// different structure (long tag runs, group-heavy) that skews the fingerprint,
// so the player profile opts to leave them out.
export const SLOTS_NO_THIRDS = SLOTS.filter((s) => s !== '3s');

// Largest single-slot value across all players, over the non-thirds slots only
// (so excluding 3s still uses the full radius range rather than shrinking every
// wedge against a 3s-inflated domain).
export const globalMaxNoThirds = max(PLAYER_ORDER, (p) =>
  max(SLOTS_NO_THIRDS, (sl) => byPlayerSlot[p]?.[sl] || 0)
);

// Radius scale for a fingerprint of outer radius R. `excludeThirds` swaps the
// domain max to the non-thirds max so the remaining wedges fill the radius.
export function makeRadiusScale(R, excludeThirds = false) {
  const domainMax = excludeThirds ? globalMaxNoThirds : globalMax;
  return scaleSqrt().domain([0, domainMax]).range([R * 0.12, R]);
}

// Build the slot wedges (plus labels) for a player at outer radius R.
// When excludeThirds is true the "3s" slot is dropped and the remaining slots
// re-space evenly around the full circle.
export function fingerprintWedges(name, R, { excludeThirds = false } = {}) {
  const data = byPlayerSlot[name] || {};
  const slots = excludeThirds ? SLOTS_NO_THIRDS : SLOTS;
  const aStep = (2 * Math.PI) / slots.length;
  const rScale = makeRadiusScale(R, excludeThirds);
  const arcGen = arc();
  const lr = R + 14;
  return slots.map((slot, i) => {
    const a0 = i * aStep + 0.03;
    const a1 = (i + 1) * aStep - 0.03;
    const value = data[slot] || 0;
    const d = arcGen({
      innerRadius: R * 0.1,
      outerRadius: rScale(value),
      startAngle: a0,
      endAngle: a1,
    });
    const mid = (a0 + a1) / 2;
    return {
      slot,
      value,
      d,
      labelX: Math.sin(mid) * lr,
      labelY: -Math.cos(mid) * lr,
      label: SLOT_LABEL[slot],
    };
  });
}

// Center hub radius and outer ring radius for a fingerprint of outer radius R.
export function hubR(R) {
  return R * 0.1;
}
export function ringR(R) {
  return R;
}
