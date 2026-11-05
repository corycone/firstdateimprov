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
// "Mini-mandala morph": each player's fingerprint IS the whole mandala scaled
// down and filtered to that player's squares, with every square kept in its
// ORIGINAL wedge/ring position. So a square's END transform is just: scale the
// whole mandala space down by s and translate it to the player's grid cell.
// Each square flies to the exact same relative spot it occupied in the big ring
// — the big radial literally splits into 11 smaller ghost-rings, one per player.
import { useMemo, useState } from 'react';
import { PLAYER_COLORS, PLAYER_ORDER } from './palette';
import {
  buildGeometry,
  CX,
  CY,
  OUTER_R,
  VB_X,
  VB_Y,
  VB_W,
  VB_H,
} from './mandalaGeometry';
import './MorphLayer.css';

// --- small-multiples grid layout ---
// Cell centers are expressed in the mandala's ABSOLUTE view-box coordinates
// (origin at the viewBox 0,0 = the mandala center is at CX,CY). Each player's
// mini-mandala is the full ring scaled by MINI_SCALE and centered in its cell.
const GRID_COLS = 4;
const MINI_R = 125; // outer radius of each mini-mandala in the grid
const MINI_SCALE = MINI_R / OUTER_R; // shrink factor applied to the whole ring
const CELL_W = 340; // horizontal footprint per mini (room for gaps)
const CELL_H = 380; // vertical footprint per mini (spreads the 3 rows down the square)
const GRID_ROWS = Math.ceil(PLAYER_ORDER.length / GRID_COLS);
const GRID_W = GRID_COLS * CELL_W;
const GRID_H = GRID_ROWS * CELL_H;

// Absolute cell center for player index i. The grid is centered on the mandala
// center (CX,CY) within the viewBox; the mandala box is centered in the
// viewport by CSS (.story-stage), so the landed minis sit centered on screen.
function gridCellCenter(i) {
  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS);
  const x = CX - GRID_W / 2 + col * CELL_W + CELL_W / 2;
  const y = CY - GRID_H / 2 + row * CELL_H + CELL_H / 2;
  return { x, y };
}

// `holdOnExit`: when the overlay goes inactive while this is true, the squares
// hold their mini positions and the overlay just fades out (used when handing
// off to the chord). When false, inactivity reverse-morphs the squares back to
// the mandala ring (used on scroll UP to the mandala).
function MorphLayer({ active, onSelectPlayer, holdOnExit = false }) {
  const { segments } = useMemo(() => buildGeometry(), []);
  // Which mini is hovered (only meaningful once landed). Drives the grow +
  // fade-others hover treatment.
  const [hoverPlayer, setHoverPlayer] = useState(null);

  // Per-square layout, computed ONCE. START is the native mandala position
  // (origin-centered `d` shifted onto the mandala center). END scales the whole
  // mandala space by MINI_SCALE and lands the (scaled) mandala center on the
  // player's grid-cell center — so every square keeps its exact wedge/ring spot
  // inside a shrunken copy of the ring. Positions are preserved; only this
  // player's squares exist in that mini, so the mini reads as a filtered ring.
  const layout = useMemo(() => {
    const playerIndex = Object.fromEntries(PLAYER_ORDER.map((p, i) => [p, i]));
    return segments.map((seg, idx) => {
      const pi = playerIndex[seg.player] ?? 0;
      const { x: cx, y: cy } = gridCellCenter(pi);
      // Use full affine matrices so the transform is ORIGIN-INDEPENDENT — this
      // avoids all transform-box / transform-origin ambiguity (the previous
      // translate+scale was being resolved about the wrong origin, smearing the
      // squares). matrix(a,b,c,d,e,f) maps P -> (a*Px + c*Py + e, b*Px + d*Py + f).
      // `d` is origin-centered (mandala center = 0,0).
      //   START: identity scale, translate by (CX,CY) -> lands on the mandala.
      const startTransform = `matrix(1,0,0,1,${CX},${CY})`;
      //   END: scale by MINI_SCALE, translate so the (scaled) mandala center
      //        lands on the player's cell center. P -> (s*Px + cx, s*Py + cy).
      const s = MINI_SCALE;
      const endTransform = `matrix(${s.toFixed(5)},0,0,${s.toFixed(5)},${cx.toFixed(2)},${cy.toFixed(2)})`;
      // Gentle stagger so the split reads as motion, not a snap.
      const delay = (idx % 60) * 2; // 0–118ms, repeating
      return { startTransform, endTransform, delay };
    });
  }, [segments]);

  // Thin concentric axis circles for a mini, at its grid-cell center. Drawn at
  // the same radii the mandala's own grid uses, scaled into the mini.
  const AXIS_FRACTIONS = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      className={`morph-svg${active ? ' is-active' : ''}${holdOnExit ? ' hold-on-exit' : ''}`}
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      aria-hidden="true"
    >
      {/* One group per player: its axis circles + squares + label + hit area,
          so a single hover transform can gently scale the WHOLE mini about its
          center. The per-square morph transforms live on .morph-seg; this
          wrapper's hover scale composes on top of them. */}
      {PLAYER_ORDER.map((name, pi) => {
        const { x, y } = gridCellCenter(pi);
        const isHover = hoverPlayer === name;
        return (
          <g
            key={name}
            className={`morph-mini${active ? ' is-active' : ''}${
              isHover ? ' is-hover' : ''
            }${hoverPlayer && !isHover ? ' is-faded' : ''}`}
            style={{ '--mini-x': `${x}px`, '--mini-y': `${y}px` }}
          >
            {/* thin axis circles (only meaningful once landed as minis) */}
            {active &&
              AXIS_FRACTIONS.map((f) => (
                <circle
                  key={`axis-${name}-${f}`}
                  className="morph-axis"
                  cx={x}
                  cy={y}
                  r={MINI_R * f}
                />
              ))}

            {/* this player's squares */}
            {segments.map((seg, i) =>
              seg.player === name ? (
                <path
                  key={seg.id}
                  className="morph-seg"
                  d={seg.d}
                  fill={PLAYER_COLORS[seg.player]}
                  style={{
                    '--start-transform': layout[i].startTransform,
                    '--end-transform': layout[i].endTransform,
                    transitionDelay: `${layout[i].delay}ms`,
                  }}
                />
              ) : null
            )}

            {/* label + hit area */}
            <text
              className="morph-label"
              x={x}
              y={y + MINI_R + 26}
              textAnchor="middle"
            >
              {name}
            </text>
            <circle
              className="morph-hit"
              cx={x}
              cy={y}
              r={MINI_R}
              fill="transparent"
              onMouseEnter={() => active && setHoverPlayer(name)}
              onMouseLeave={() => active && setHoverPlayer(null)}
              onClick={() => active && onSelectPlayer?.(name)}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default MorphLayer;
