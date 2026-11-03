// MorphLayer — the single-coordinate-space morph between the Season Mandala
// and the small-multiples fingerprints.
//
// SINGLE-SVG-COORDINATE-SYSTEM DECISION (shared with SeasonStory):
//   The mandala draws its 1043 arc segments centered at the origin and then
//   places them inside <g transform="translate(CX,CY)"> within the viewBox
//   `VB_X VB_Y VB_W VB_H`. This overlay SVG uses the EXACT same viewBox and the
//   same translate(CX,CY) group, so an arc's START position here sits pixel-on
//   top of the real mandala segment. The END position is a transform that
//   carries each square to the centroid of its player+slot wedge in the 4-col
//   small-multiples grid (also expressed in this one transform space). Because
//   START and END transforms are computed ONCE (useMemo) and the tween is done
//   purely in CSS (a class toggle on the animating <g> + per-path transition),
//   there is NO per-frame React re-render of the 1043 nodes — React only flips
//   one className when the phase changes.
//
// "Aggregate morph": squares of the same player+slot all fly to the same wedge
// centroid and fade toward a shared opacity, so each of the 11 fingerprints
// visibly gathers itself out of the mandala.
import { useMemo } from 'react';
import { PLAYER_COLORS, PLAYER_ORDER } from './palette';
import {
  buildGeometry,
  CX,
  CY,
  VB_X,
  VB_Y,
  VB_W,
  VB_H,
} from './mandalaGeometry';
import { SLOTS, slotKey, makeRadiusScale } from './fingerprintGeometry';
import './MorphLayer.css';

// --- small-multiples grid layout, mirrored from mocks/gen-scrolly.mjs ---
// The mock lays the grid out in its own 1500-wide canvas; we re-express the
// SAME cell centers inside the mandala's origin-centered coordinate space (the
// coordinates are relative to the translate(CX,CY) group, i.e. origin = CX,CY).
const GRID_COLS = 4;
const GRID_R = 78; // fingerprint outer radius in the grid (matches the mock + Fingerprint R)
const CELL_W = 340; // mock cell width
const CELL_H = 230; // mock cell height
// Center the 11 cells (ceil(11/4)=3 rows) horizontally/vertically about origin.
const GRID_W = GRID_COLS * CELL_W;
const GRID_ROWS = Math.ceil(PLAYER_ORDER.length / GRID_COLS);
const GRID_H = GRID_ROWS * CELL_H;

// Cell center (origin-relative) for player index i.
function gridCellCenter(i) {
  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS);
  // left edge of grid relative to origin, plus half a cell to hit the center.
  const x = -GRID_W / 2 + col * CELL_W + CELL_W / 2;
  const y = -GRID_H / 2 + row * CELL_H + CELL_H / 2;
  return { x, y };
}

// Centroid of a slot wedge inside a fingerprint centered at (gx, gy).
// Mirrors fingerprintGeometry: aStep=2PI/9, wedge i spans [i*aStep, (i+1)*aStep]
// from innerRadius R*0.1 to rScale(value); the convergence target is the wedge
// mid-angle at the mid-radius.
function slotWedgeCentroid(gx, gy, slotIndex, value, rScale, R) {
  const aStep = (2 * Math.PI) / SLOTS.length;
  const mid = slotIndex * aStep + aStep / 2;
  const rInner = R * 0.1;
  const rOuter = rScale(value);
  const rMid = (rInner + rOuter) / 2;
  return {
    x: gx + Math.sin(mid) * rMid,
    y: gy - Math.cos(mid) * rMid,
  };
}

// Approximate a d3 arc segment's centroid from its `d` string by averaging the
// command ENDPOINT coordinates (the corners of the wedge). We parse per-command
// so the radii / flags buried inside the `A` arc commands don't skew the
// average — only real endpoints count. For these thin wedges the corner average
// is plenty accurate to pick the point each square flies TO.
function pathCentroid(d) {
  const pts = [];
  // Split into commands: a letter followed by its numeric args.
  const cmds = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
  for (const cmd of cmds) {
    const type = cmd[0];
    const nums = (cmd.slice(1).match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).map(
      parseFloat
    );
    if (type === 'M' || type === 'L') {
      // absolute moveto / lineto: x,y (possibly repeated for polylines)
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    } else if (type === 'A') {
      // elliptical arc: rx ry xrot large sweep x y — endpoint is the last pair.
      for (let i = 0; i + 6 < nums.length + 1; i += 7) {
        if (i + 6 < nums.length) pts.push([nums[i + 5], nums[i + 6]]);
      }
    }
  }
  if (!pts.length) return { x: 0, y: 0 };
  const sx = pts.reduce((a, p) => a + p[0], 0);
  const sy = pts.reduce((a, p) => a + p[1], 0);
  return { x: sx / pts.length, y: sy / pts.length };
}

function MorphLayer({ active }) {
  const { segments } = useMemo(() => buildGeometry(), []);

  // Per-square layout table, computed ONCE. Each entry carries the END
  // transform (translate + scale) that moves the square's centroid onto its
  // fingerprint wedge centroid. START is identity (native arc position).
  const layout = useMemo(() => {
    const rScale = makeRadiusScale(GRID_R);
    const playerIndex = Object.fromEntries(PLAYER_ORDER.map((p, i) => [p, i]));
    // Per-player, per-slot aggregate value (drives the wedge radius / target).
    const bySlotValue = {};
    for (const seg of segments) {
      const k = slotKey(seg.sceneCode);
      bySlotValue[seg.player] = bySlotValue[seg.player] || {};
      bySlotValue[seg.player][k] = (bySlotValue[seg.player][k] || 0) + seg.weight;
    }

    return segments.map((seg, idx) => {
      const pi = playerIndex[seg.player] ?? 0;
      const { x: gx, y: gy } = gridCellCenter(pi);
      const slot = slotKey(seg.sceneCode);
      const slotIndex = Math.max(0, SLOTS.indexOf(slot));
      const value = bySlotValue[seg.player]?.[slot] || 0;
      // Work in ABSOLUTE view-box coordinates so the per-path CSS transform is
      // fully self-contained (transform-box:view-box + transform-origin:0 0),
      // independent of any parent <g> transform. The mandala's segments live in
      // an origin-centered space then shifted by translate(CX,CY); we bake that
      // same (CX,CY) shift into every transform here.
      const targetAbs = slotWedgeCentroid(gx + CX, gy + CY, slotIndex, value, rScale, GRID_R);
      const start = pathCentroid(seg.d); // origin-centered (matches `d`)
      // START (identity phase): shift the origin-centered `d` onto the mandala.
      const startTransform = `translate(${CX}px, ${CY}px)`;
      // Shrink each square as it converges so the stacked squares read as one
      // clean wedge rather than a pile of full-size arcs.
      const scale = 0.14;
      // A CSS `scale(s)` about the view-box origin maps a point P -> P*s, so the
      // accompanying translate T must solve  T + start*s = targetAbs.
      const dx = targetAbs.x - start.x * scale;
      const dy = targetAbs.y - start.y * scale;
      const endTransform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale})`;
      // Gentle stagger spread across the set so the gather reads as motion.
      const delay = (idx % 60) * 2; // 0–118ms, repeating
      return { startTransform, endTransform, delay };
    });
  }, [segments]);

  return (
    <svg
      className={`morph-svg${active ? ' is-active' : ''}`}
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      aria-hidden="true"
    >
      <g className="morph-group">
        {segments.map((seg, i) => (
          <path
            key={seg.id}
            className="morph-seg"
            d={seg.d}
            fill={PLAYER_COLORS[seg.player]}
            style={{
              // CSS drives the tween; React only sets these static per-square
              // values once. START/END transforms are absolute (view-box) so
              // they don't depend on a parent <g>. When .is-active toggles on
              // the parent svg the transform eases from START to --end-transform.
              '--start-transform': layout[i].startTransform,
              '--end-transform': layout[i].endTransform,
              transitionDelay: `${layout[i].delay}ms`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

export default MorphLayer;
