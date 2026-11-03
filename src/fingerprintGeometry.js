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

const A_STEP = (2 * Math.PI) / SLOTS.length;

// Radius scale for a fingerprint of outer radius R.
export function makeRadiusScale(R) {
  return scaleSqrt().domain([0, globalMax]).range([R * 0.12, R]);
}

// Build the 9 slot wedges (plus labels) for a player at outer radius R.
export function fingerprintWedges(name, R) {
  const data = byPlayerSlot[name] || {};
  const rScale = makeRadiusScale(R);
  const arcGen = arc();
  const lr = R + 14;
  return SLOTS.map((slot, i) => {
    const a0 = i * A_STEP + 0.03;
    const a1 = (i + 1) * A_STEP - 0.03;
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
