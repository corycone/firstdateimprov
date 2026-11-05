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
import { PLAYER_COLORS, PLAYER_ORDER, INK_TOKENS, SERIF } from './palette';
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

function SceneChord({ active }) {
  const [hoverPlayer, setHoverPlayer] = useState(null);
  const [lockedPlayer, setLockedPlayer] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, player }
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
      setHoverPlayer(null);
      setLockedPlayer(null);
      setTooltip(null);
    }
  }

  const activePlayer = lockedPlayer ?? hoverPlayer;

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

  const iso = activePlayer == null ? null : IDX[activePlayer];

  const moveTooltip = (evt, name) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top, player: name });
  };
  const enterPlayer = (evt, name) => {
    if (active) setHoverPlayer(name);
    moveTooltip(evt, name);
  };
  const leavePlayer = () => {
    setHoverPlayer(null);
    setTooltip(null);
  };
  const toggleLock = (name) =>
    setLockedPlayer((prev) => (prev === name ? null : name));

  // Top scene partners for the tooltip: that player's matrix row -> partners
  // with a shared count > 0, sorted desc, top 5.
  const partnersFor = (name) => {
    const row = matrix[IDX[name]];
    return PLAYER_ORDER.map((p, i) => ({ partner: p, count: row[i] }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  return (
    <div className={`scene-chord${active ? ' is-active' : ''}`} ref={wrapRef}>
      <svg
        className="scene-chord-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Scene partners chord diagram: players around a ring, ribbons showing how often each pair shared a scene."
      >
        <g transform={`translate(${CX},${CY})`}>
          {/* ribbons — colored by the "other" end when isolating, else source */}
          {chords.map((ch, i) => {
            const a = ch.source.index;
            const b = ch.target.index;
            const involved = iso == null || a === iso || b === iso;
            const colorIdx = iso == null ? a : a === iso ? b : a;
            const c = PLAYER_COLORS[PLAYER_ORDER[colorIdx]];
            const op = iso == null ? 0.45 : involved ? 0.7 : 0.05;
            return (
              <path
                key={`ribbon-${i}`}
                d={ribbonGen(ch)}
                fill={c}
                fillOpacity={op}
                stroke={c}
                strokeOpacity={op * 0.6}
                strokeWidth={0.3}
              />
            );
          })}

          {/* group arcs + rim labels */}
          {chords.groups.map((g) => {
            const name = PLAYER_ORDER[g.index];
            const dim = iso != null && g.index !== iso;
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
                onMouseEnter={(e) => enterPlayer(e, name)}
                onMouseMove={(e) => moveTooltip(e, name)}
                onMouseLeave={leavePlayer}
                onClick={() => toggleLock(name)}
              >
                <path
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

          {/* center title */}
          <text
            className="scene-chord-center"
            x={0}
            y={-6}
            textAnchor="middle"
            fill={INK_TOKENS.ink}
            style={{ fontFamily: SERIF }}
          >
            {activePlayer ? activePlayer : 'SCENE PARTNERS'}
          </text>
          <text
            className="scene-chord-sub"
            x={0}
            y={18}
            textAnchor="middle"
            fill={INK_TOKENS.muted}
            style={{ fontFamily: SERIF }}
          >
            {activePlayer
              ? 'who they shared scenes with'
              : 'who shared the stage, and how often'}
          </text>
        </g>
      </svg>

      {/* cursor-following tooltip: the hovered player's top scene partners */}
      {tooltip && (
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
    </div>
  );
}

export default SceneChord;
