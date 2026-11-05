// Shared mandala geometry. Extracted verbatim from Mandala.jsx so both the
// Mandala component and the scrolly code draw from one geometry source.
import { arc as d3arc } from 'd3-shape';
import { sum as d3sum, max as d3max, groups as d3groups } from 'd3-array';
import { PLAYER_ORDER } from './palette';
import scenes from './assets/data/scenes.json';
import shows from './assets/data/shows.json';

// --- geometry constants (match mocks/gen-mocks.mjs mockRadial) ---
export const W = 1100;
export const H = 1100;
export const CX = W / 2;
export const CY = H / 2;
export const INNER_R = 190; // larger hole hosts the live center readout
export const OUTER_R = 520;
export const PAD_A = 0.012; // gap between wedges
export const RING_GAP = 2;
// Snug margin so the drawing fills its square (the art was shrinking inside a
// huge transparent border before). Just enough to clear the rim labels.
export const LABEL_R = OUTER_R + 14; // where rim labels begin
export const MARGIN = 118; // room for the longest label + a little breathing space
export const VB_X = -MARGIN;
export const VB_Y = -MARGIN;
export const VB_W = W + MARGIN * 2;
export const VB_H = H + MARGIN * 2;

// Scene stack order within a wedge (matches the mock).
export const SCENE_ORDER = ['1A', '1B', '1C', 'D', '4', '2A', '2B', '2C', 'E', '5', '3A', '3B', '3C'];
export function sceneSortKey(code) {
  const i = SCENE_ORDER.indexOf(code);
  return i === -1 ? 50 + code.charCodeAt(0) : i;
}

// Beat grouping — which structural beat a scene code belongs to. Subtle rings
// are drawn at the boundaries between these groups:
//   round-1 (1A/1B/1C) · group-game-1 (D or "4") · round-2 (2A/2B/2C) ·
//   group-game-2 (E or "5") · third-beats (3*)
export function sceneGroup(code) {
  const c = String(code).trim();
  if (/^1/.test(c)) return 'r1';
  if (c === 'D' || c === '4') return 'gg1';
  if (/^2/.test(c)) return 'r2';
  if (c === 'E' || c === '5') return 'gg2';
  if (/^3/.test(c)) return 'r3';
  return 'other';
}

// Human-readable scene type label (e.g. "2B — second round").
export const SCENE_TYPE_LABELS = {
  opening: 'opening',
  'join-2person': 'two-person join',
  'walk-on': 'walk-on',
  'second-round': 'second round',
  'third-round': 'third round',
  'group-game': 'group game',
  other: 'other',
};
export function sceneTypeLabel(type) {
  return SCENE_TYPE_LABELS[type] || type;
}

// Format an ISO yyyy-mm-dd show date as "M/D" for the rim label. Parse from
// parts (not new Date(str), which interprets ISO as UTC and can shift a day).
export function formatShowDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return `${Number(m[2])}/${Number(m[3])}`;
}

// Build per-show -> ordered scenes -> participants (ported from the mock).
export function showScenes(title) {
  const rows = scenes.filter((s) => s.showTitle === title);
  const byCode = d3groups(rows, (r) => r.sceneCode).sort(
    (a, b) => sceneSortKey(a[0]) - sceneSortKey(b[0])
  );
  return byCode.map(([code, rs]) => ({
    code,
    round: rs[0].round,
    type: rs[0].sceneType,
    parts: rs
      .slice()
      .sort((a, b) => PLAYER_ORDER.indexOf(a.player) - PLAYER_ORDER.indexOf(b.player)),
    total: d3sum(rs, (r) => r.weight),
  }));
}

// Precompute all segment geometry once (data is static).
// One <path> segment per scenes.json record => 1043 segments total.
export function buildGeometry() {
  // chronological order; null showIndex (Exotic) goes last.
  const showList = shows.slice().sort((a, b) => (a.showIndex ?? 999) - (b.showIndex ?? 999));
  const n = showList.length;
  const aStep = (2 * Math.PI) / n;
  const maxScenes = d3max(showList, (s) => showScenes(s.showTitle).length);
  const bandH = (OUTER_R - INNER_R) / maxScenes;
  const arcGen = d3arc();

  const segments = [];
  const showMeta = [];
  const groupBands = []; // subtle ring outline per beat-group, per wedge

  const bandArc = d3arc();

  showList.forEach((show, i) => {
    const a0 = i * aStep + PAD_A;
    const a1 = (i + 1) * aStep - PAD_A;
    const scns = showScenes(show.showTitle);
    let showTotal = 0;

    // track beat-group spans (contiguous runs of the same group) to outline them
    let runGroup = null;
    let runStartIdx = 0;

    const flushRun = (startIdx, endIdx, group) => {
      if (group == null) return;
      const gr0 = INNER_R + startIdx * bandH + RING_GAP / 2;
      const gr1 = INNER_R + endIdx * bandH - RING_GAP / 2;
      groupBands.push({
        id: `grp-${i}-${group}-${startIdx}`,
        showIdx: i,
        group,
        d: bandArc({ innerRadius: gr0, outerRadius: gr1, startAngle: a0, endAngle: a1 }),
      });
    };

    scns.forEach((sc, si) => {
      const g = sceneGroup(sc.code);
      if (g !== runGroup) {
        if (runGroup !== null) flushRun(runStartIdx, si, runGroup);
        runGroup = g;
        runStartIdx = si;
      }

      const r0 = INNER_R + si * bandH + RING_GAP / 2;
      const r1 = INNER_R + (si + 1) * bandH - RING_GAP / 2;
      const tot = d3sum(sc.parts, (p) => p.weight) || 1;
      let acc = a0;
      sc.parts.forEach((p) => {
        const frac = p.weight / tot;
        const b0 = acc;
        const b1 = acc + (a1 - a0) * frac;
        acc = b1;
        showTotal += p.weight;
        segments.push({
          id: `${i}-${sc.code}-${p.player}-${segments.length}`,
          d: arcGen({ innerRadius: r0, outerRadius: r1, startAngle: b0, endAngle: b1 }),
          player: p.player,
          showTitle: show.showTitle,
          showIdx: i,
          sceneCode: sc.code,
          sceneType: sc.type,
          weight: p.weight,
        });
      });
    });
    // flush the final run in this wedge
    flushRun(runStartIdx, scns.length, runGroup);

    // rim label geometry (tangential rotation, from the mock).
    const mid = (a0 + a1) / 2;
    const lr = LABEL_R;
    const lx = CX + Math.sin(mid) * lr;
    const ly = CY - Math.cos(mid) * lr;
    const deg = (mid * 180) / Math.PI;
    const flip = deg > 180;
    const rot = flip ? deg + 90 : deg - 90;

    // Invisible "hit wedge" covering the show's full angular slice (no padding
    // gap) from the inner hole out past the rim labels, so hovering anywhere in
    // a show's vicinity — including the gaps and empty space beyond its rings —
    // highlights the whole show.
    const hitD = arcGen({
      innerRadius: INNER_R,
      outerRadius: OUTER_R + MARGIN,
      startAngle: i * aStep,
      endAngle: (i + 1) * aStep,
    });

    showMeta.push({
      showTitle: show.showTitle,
      showIdx: i,
      lx,
      ly,
      rot,
      anchor: flip ? 'end' : 'start',
      initiations: show.initiations || {},
      total: showTotal,
      rosterSize: Array.isArray(show.roster) ? show.roster.length : 0,
      date: show.date || null,
      dateLabel: formatShowDate(show.date),
      hitD,
    });
  });

  // concentric grid radii
  const gridRadii = [];
  for (let k = 0; k <= 4; k++) {
    gridRadii.push(INNER_R + (OUTER_R - INNER_R) * (k / 4));
  }

  return { segments, showMeta, groupBands, gridRadii, showCount: n };
}
