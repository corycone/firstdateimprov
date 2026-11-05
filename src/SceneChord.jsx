// SceneChord — the "Scene Partners" chord chapter (3rd scroll stop).
//
// Players sit around a ring; each ribbon is how often a pair shared a scene.
// Geometry/styling mirror the approved mock (mocks/gen-chord.mjs): a symmetric
// co-appearance matrix fed to d3.chord, partner-colored ribbons, serif rim
// labels, and a center title. All layout is computed in useMemo and rendered as
// JSX <path>/<text> — React owns hover/lock, never D3 DOM mutation.
//
// Hover isolates a player (their ribbons bright, others faint) and shows a
// cursor-following tooltip of their top scene partners; click locks that
// isolate until re-clicked or another name is chosen. Colors come only from
// palette.js. Visibility + crossfade are gated by .is-active in SceneChord.css.
import { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PLAYER_COLORS, PLAYER_ORDER, INK_TOKENS } from './palette';
import scenes from './assets/data/scenes.json';
import './SceneChord.css';

// Ring geometry (mirrors the mock: square viewBox, big centered ring).
const W = 1100;
const H = 1100;
const CX = W / 2;
const CY = H / 2;
const R = 430;

const N = PLAYER_ORDER.length;
const IDX = Object.fromEntries(PLAYER_ORDER.map((n, i) => [n, i]));

// A focus is either a player (whole-arc isolate) or a single pair (one ribbon).
//   { kind: 'player', i }  |  { kind: 'pair', a, b }
const samefocus = (x, y) =>
  x && y && x.kind === y.kind &&
  (x.kind === 'player' ? x.i === y.i : (x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a));

function SceneChord({ active, legendHoverPlayer = null, legendLockedPlayer = null }) {
  const [hoverFocus, setHoverFocus] = useState(null); // transient
  const [lockedFocus, setLockedFocus] = useState(null); // persists on click
  const [tooltip, setTooltip] = useState(null); // { x, y, player }
  // Bumped on each LOCK so the selected element re-fires a brief pulse (changing
  // the React key restarts the CSS animation even when re-selecting).
  const [pulseKey, setPulseKey] = useState(0);
  const pulse = () => setPulseKey((k) => k + 1);
  const wrapRef = useRef(null);

  // The chord is never unmounted (only `active` toggles with the phase), so
  // reset its transient isolate/lock/tooltip the moment the chapter leaves —
  // otherwise scrolling away and back re-enters with a stale locked player
  // instead of the neutral "SCENE PARTNERS" resting state. This uses React's
  // supported "adjust state while rendering on prop change" pattern (a render
  // that detects active:true->false clears the state and re-renders), which
  // avoids a setState-in-effect cascade.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setHoverFocus(null);
      setLockedFocus(null);
      setTooltip(null);
    }
  }

  // A legend name (from the top filters) maps to a player focus on the chord.
  const legendFocus = (name) =>
    name != null && IDX[name] != null ? { kind: 'player', i: IDX[name] } : null;

  // Effective focus priority: the chord's own click-lock > a legend lock >
  // the chord's own hover > a legend hover. So the top filters drive the chord
  // (hover/lock a name => isolate that player's ribbons), while direct chord
  // interaction takes precedence when present.
  const focus =
    lockedFocus ??
    legendFocus(legendLockedPlayer) ??
    hoverFocus ??
    legendFocus(legendHoverPlayer);

  // Symmetric co-appearance matrix — exactly as mocks/gen-chord.mjs. Group by
  // (showTitle|sceneCode); every co-present pair (a<b) adds min(weight) to both
  // matrix[ia][ib] and matrix[ib][ia], indexed by PLAYER_ORDER.
  const matrix = useMemo(() => {
    const m = Array.from({ length: N }, () => new Array(N).fill(0));
    const groups = d3.group(scenes, (s) => s.showTitle + '|' + s.sceneCode);
    for (const [, rs] of groups) {
      for (let a = 0; a < rs.length; a++) {
        for (let b = a + 1; b < rs.length; b++) {
          const ia = IDX[rs[a].player];
          const ib = IDX[rs[b].player];
          const w = Math.min(rs[a].weight, rs[b].weight);
          m[ia][ib] += w;
          m[ib][ia] += w;
        }
      }
    }
    return m;
  }, []);

  // Chord layout + generators (mirror the mock's padAngle/sort/radii).
  const { chords, arcGen, ribbonGen } = useMemo(() => {
    const layout = d3
      .chord()
      .padAngle(0.035)
      .sortSubgroups(d3.descending)(matrix);
    return {
      chords: layout,
      arcGen: d3.arc().innerRadius(R).outerRadius(R + 20),
      ribbonGen: d3.ribbon().radius(R - 2),
    };
  }, [matrix]);

  // Per-ribbon linear gradients, oriented from the source arc center to the
  // target arc center, blending the two players' colors (technique from Nadieh
  // Bremer's gradient-chord tutorial). Coords are in the translated g's user
  // space (center = 0,0), so gradientUnits must be userSpaceOnUse.
  const gradients = useMemo(() => {
    const rr = R - 2;
    const ctr = (a0, a1) => (a1 - a0) / 2 + a0 - Math.PI / 2; // d3 angles start at top
    return chords.map((ch) => {
      const s = ctr(ch.source.startAngle, ch.source.endAngle);
      const t = ctr(ch.target.startAngle, ch.target.endAngle);
      return {
        id: `chordGrad-${ch.source.index}-${ch.target.index}`,
        x1: Math.cos(s) * rr,
        y1: Math.sin(s) * rr,
        x2: Math.cos(t) * rr,
        y2: Math.sin(t) * rr,
        c1: PLAYER_COLORS[PLAYER_ORDER[ch.source.index]],
        c2: PLAYER_COLORS[PLAYER_ORDER[ch.target.index]],
      };
    });
  }, [chords]);

  // Whether a given ribbon (pair a-b) is emphasized under the current focus:
  //  - player focus: any ribbon touching that player
  //  - pair focus: only that exact ribbon
  //  - no focus: all emphasized
  const ribbonInvolved = (a, b) => {
    if (!focus) return true;
    if (focus.kind === 'player') return a === focus.i || b === focus.i;
    return (a === focus.a && b === focus.b) || (a === focus.b && b === focus.a);
  };
  // Is this element part of the currently LOCKED selection (for the pulse)?
  const ribbonLocked = (a, b) => {
    if (!lockedFocus) return false;
    if (lockedFocus.kind === 'player') return a === lockedFocus.i || b === lockedFocus.i;
    return (a === lockedFocus.a && b === lockedFocus.b) || (a === lockedFocus.b && b === lockedFocus.a);
  };
  const arcLocked = (i) =>
    lockedFocus != null && lockedFocus.kind === 'player' && i === lockedFocus.i;

  const arcDimmed = (i) => {
    if (!focus) return false;
    if (focus.kind === 'player') return i !== focus.i;
    return i !== focus.a && i !== focus.b; // pair: both endpoints stay lit
  };

  // Tooltip payload is either a player ({ player }) or a pair ({ pair:[a,b] }).
  const moveTooltipAt = (evt, payload) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top, ...payload });
  };

  // --- arc (player) handlers ---
  const enterPlayer = (evt, i) => {
    if (active) setHoverFocus({ kind: 'player', i });
    moveTooltipAt(evt, { player: PLAYER_ORDER[i] });
  };
  const leavePlayer = () => {
    setHoverFocus(null);
    setTooltip(null);
  };
  const toggleLockPlayer = (i) =>
    setLockedFocus((prev) => {
      const next = samefocus(prev, { kind: 'player', i }) ? null : { kind: 'player', i };
      if (next) pulse(); // pulse only when selecting on, not when clearing
      return next;
    });

  // --- ribbon (pair) handlers ---
  const enterRibbon = (a, b) => {
    if (active) setHoverFocus({ kind: 'pair', a, b });
  };
  const leaveRibbon = () => setHoverFocus(null);
  const toggleLockRibbon = (a, b) =>
    setLockedFocus((prev) => {
      const next = samefocus(prev, { kind: 'pair', a, b }) ? null : { kind: 'pair', a, b };
      if (next) pulse();
      return next;
    });

  // Scene partners for a player index: matrix row -> partners with count > 0,
  // sorted desc. `limit` caps the list (the tooltip uses 5; the side panel all).
  const partnersForIdx = (i, limit = Infinity) => {
    const row = matrix[i];
    return PLAYER_ORDER.map((p, j) => ({ partner: p, count: row[j] }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };
  const partnersFor = (name) => partnersForIdx(IDX[name], 5);

  // Fixed number formatting for the fractional (min-weight) shared counts.
  const fmtCount = (n) => +n.toFixed(2);

  // Click on empty space (not an arc/ribbon, which stopPropagation) clears the
  // locked selection.
  const clearLock = () => setLockedFocus(null);

  return (
    <div className={`scene-chord${active ? ' is-active' : ''}`} ref={wrapRef}>
      <svg
        className="scene-chord-svg"
        viewBox={`0 0 ${W} ${H}`}
        onClick={clearLock}
        role="img"
        aria-label="Scene partners chord diagram: players around a ring, ribbons showing how often each pair shared a scene."
      >
        <g transform={`translate(${CX},${CY})`}>
          {/* one linear gradient per ribbon, source-color -> target-color,
              oriented along the chord (userSpaceOnUse in this group's coords) */}
          <defs>
            {gradients.map((g) => (
              <linearGradient
                key={g.id}
                id={g.id}
                gradientUnits="userSpaceOnUse"
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
              >
                <stop offset="0%" stopColor={g.c1} />
                <stop offset="100%" stopColor={g.c2} />
              </linearGradient>
            ))}
          </defs>

          {/* ribbons — each filled with a source->target color GRADIENT
              (see gradient defs below). Hover/click a single ribbon to isolate
              that pair. */}
          {chords.map((ch, i) => {
            const a = ch.source.index;
            const b = ch.target.index;
            const involved = ribbonInvolved(a, b);
            const op = !focus ? 0.55 : involved ? 0.85 : 0.04;
            const locked = ribbonLocked(a, b);
            return (
              <path
                key={`ribbon-${i}${locked ? `-pulse${pulseKey}` : ''}`}
                className={`scene-chord-ribbon${locked ? ' is-pulse' : ''}`}
                d={ribbonGen(ch)}
                fill={`url(#chordGrad-${a}-${b})`}
                fillOpacity={op}
                stroke="none"
                onMouseEnter={() => enterRibbon(a, b)}
                onMouseMove={(e) => moveTooltipAt(e, { pair: [a, b] })}
                onMouseLeave={leaveRibbon}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLockRibbon(a, b);
                }}
              />
            );
          })}

          {/* group arcs + rim labels */}
          {chords.groups.map((g) => {
            const name = PLAYER_ORDER[g.index];
            const dim = arcDimmed(g.index);
            const mid = (g.startAngle + g.endAngle) / 2;
            const lr = R + 34;
            const lx = Math.sin(mid) * lr;
            const ly = -Math.cos(mid) * lr;
            const deg = (mid * 180) / Math.PI;
            const flip = deg > 180;
            const rot = flip ? deg + 90 : deg - 90;
            return (
              <g
                key={`arc-${name}`}
                className="scene-chord-group"
                onMouseEnter={(e) => enterPlayer(e, g.index)}
                onMouseMove={(e) => moveTooltipAt(e, { player: name })}
                onMouseLeave={leavePlayer}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLockPlayer(g.index);
                }}
              >
                <path
                  key={arcLocked(g.index) ? `arc-pulse-${pulseKey}` : 'arc'}
                  className={arcLocked(g.index) ? 'scene-chord-arc is-pulse' : 'scene-chord-arc'}
                  d={arcGen(g)}
                  fill={PLAYER_COLORS[name]}
                  fillOpacity={dim ? 0.3 : 1}
                />
                <text
                  className="scene-chord-label"
                  x={lx}
                  y={ly}
                  fill={dim ? INK_TOKENS.muted : INK_TOKENS.ink}
                  textAnchor={flip ? 'end' : 'start'}
                  transform={`rotate(${rot} ${lx} ${ly})`}
                >
                  {name}
                </text>
              </g>
            );
          })}

        </g>
      </svg>

      {/* cursor-following tooltip: the hovered player's top scene partners */}
      {tooltip && tooltip.pair && (
        <div
          className="scene-chord-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="status"
        >
          <div className="scene-chord-tip-pair">
            <span className="scene-chord-tip-name">
              <span
                className="scene-chord-tip-swatch"
                style={{ background: PLAYER_COLORS[PLAYER_ORDER[tooltip.pair[0]]] }}
              />
              {PLAYER_ORDER[tooltip.pair[0]]}
            </span>
            <span className="scene-chord-tip-amp">+</span>
            <span className="scene-chord-tip-name">
              <span
                className="scene-chord-tip-swatch"
                style={{ background: PLAYER_COLORS[PLAYER_ORDER[tooltip.pair[1]]] }}
              />
              {PLAYER_ORDER[tooltip.pair[1]]}
            </span>
          </div>
          <div className="scene-chord-tip-sub">
            {(+matrix[tooltip.pair[0]][tooltip.pair[1]].toFixed(2))} shared scenes
          </div>
        </div>
      )}

      {tooltip && tooltip.player && (
        <div
          className="scene-chord-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="status"
        >
          <div className="scene-chord-tip-title">{tooltip.player}</div>
          <div className="scene-chord-tip-list">
            {partnersFor(tooltip.player).map((d) => (
              <span key={d.partner} className="scene-chord-tip-name">
                <span
                  className="scene-chord-tip-swatch"
                  style={{ background: PLAYER_COLORS[d.partner] }}
                />
                {d.partner}
                <span className="scene-chord-tip-count">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Persistent selection panel (right side): reflects the current focus —
          a player's full partner list, a selected pair's shared count, or a
          neutral prompt. Driven by the same `focus` the legend/arcs/ribbons set,
          so legend selection populates it too. */}
      <aside className="scene-chord-panel">
        {focus && focus.kind === 'player' ? (
          <>
            <div
              className="scene-chord-panel-name"
              style={{ color: PLAYER_COLORS[PLAYER_ORDER[focus.i]] }}
            >
              {PLAYER_ORDER[focus.i]}
            </div>
            <div className="scene-chord-panel-label">SCENE PARTNERS</div>
            <ul className="scene-chord-panel-list">
              {partnersForIdx(focus.i).map((d) => (
                <li key={d.partner} className="scene-chord-panel-row">
                  <span
                    className="scene-chord-tip-swatch"
                    style={{ background: PLAYER_COLORS[d.partner] }}
                  />
                  <span className="scene-chord-panel-partner">{d.partner}</span>
                  <span className="scene-chord-panel-count">{fmtCount(d.count)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : focus && focus.kind === 'pair' ? (
          <>
            <div className="scene-chord-panel-label">SCENE PARTNERS</div>
            <div className="scene-chord-panel-pair">
              <span
                className="scene-chord-panel-partner"
                style={{ color: PLAYER_COLORS[PLAYER_ORDER[focus.a]] }}
              >
                {PLAYER_ORDER[focus.a]}
              </span>
              <span className="scene-chord-panel-plus">+</span>
              <span
                className="scene-chord-panel-partner"
                style={{ color: PLAYER_COLORS[PLAYER_ORDER[focus.b]] }}
              >
                {PLAYER_ORDER[focus.b]}
              </span>
            </div>
            <div className="scene-chord-panel-big">
              {fmtCount(matrix[focus.a][focus.b])}
            </div>
            <div className="scene-chord-panel-sub">shared scenes</div>
          </>
        ) : (
          <div className="scene-chord-panel-hint">
            Hover or select a name to see their scene partners.
          </div>
        )}
      </aside>
    </div>
  );
}

export default SceneChord;
