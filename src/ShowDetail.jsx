// ShowDetail — the per-show "expand" panel.
//
// Mounted by SeasonStory when phase === 'showDetail' (opened by the ⤢ Expand
// button in the mandala's center readout, which only appears while a show is
// LOCKED). Mirrors PlayerProfile's conventions: a full-screen dark backdrop +
// panel, a header (title + sub line + ✕ close), and close wired three ways —
// the ✕ button, the Escape key, and a click-away on the backdrop.
//
// Layout + geometry + stats mirror the approved mock (mocks/gen-showdetail.mjs):
//   LEFT  — the locked show's wedge "unrolled" into a FULL-CIRCLE radial. Each
//           scene (ordered by SCENE_ORDER inner->outer) becomes a concentric
//           ring, and within each ring the participants split the full 360°
//           proportional to weight. A faint concentric grid, scene-code labels
//           up the left, and a center hub showing the scene count.
//   RIGHT — three data-derived headline stats (scenes / on stage / stage time),
//           the backbone-derived "opened the most scenes", and per-player
//           stage-time bars from shows.json totals (sorted desc).
//
// MORPH DECISION: rather than wiring a second single-coordinate-space overlay
// like MorphLayer, the "unroll" is a SELF-CONTAINED animated radial inside this
// panel. The whole radial <g> transitions in (the panel scales/fades in while
// each ring sweeps open from 0 opacity + a slight scale) so it reads as the
// wedge growing/opening into the big full-circle radial. This keeps the morph
// decoupled from the live mandala and reverses automatically on unmount/close.
// prefers-reduced-motion snaps it (see ShowDetail.css).
import { useEffect, useMemo, useRef, useState } from 'react';
import { arc as d3arc } from 'd3-shape';
import { sum as d3sum } from 'd3-array';
import { PLAYER_COLORS, PLAYER_ORDER, INK_TOKENS, SERIF } from './palette';
import { showScenes, sceneTypeLabel } from './mandalaGeometry';
import scenes from './assets/data/scenes.json';
import shows from './assets/data/shows.json';
import './ShowDetail.css';

const TOTAL_SHOWS = shows.length; // derived — never hardcode 26
const AMBER = '#ff9e45';

// Unrolled-radial geometry (mirrors the mock's left panel).
const INNER = 48; // smaller hub -> thicker rings
const OUTER = 250;
// The drawing is centered at (0,0). The viewBox must contain the full circle
// (radius OUTER) PLUS a left gutter for the scene labels and a little padding.
const LABEL_GUTTER = 90; // width of the left label column, outside the circle
const PAD = 12;
const VB = {
  x: -(OUTER + LABEL_GUTTER),
  y: -(OUTER + PAD),
  w: OUTER + LABEL_GUTTER + OUTER + PAD, // left gutter+circle on left, circle+pad on right
  h: (OUTER + PAD) * 2,
};
// Labels live in the gutter, left-aligned just inside the viewBox's left edge.
const LABEL_X = -(OUTER + LABEL_GUTTER) + 6;

// Players with the greatest summed weight in this show's opening slot (codes
// starting with "1A"). Derived from the BACKBONE (scenes.json), NOT the
// unreliable shows.json initiations field.
function openedMostScenes(showTitle) {
  const byPlayer = {};
  scenes
    .filter((s) => s.showTitle === showTitle && /^1A/.test(s.sceneCode))
    .forEach((s) => {
      byPlayer[s.player] = (byPlayer[s.player] || 0) + s.weight;
    });
  const vals = Object.values(byPlayer);
  if (!vals.length) return [];
  const maxW = Math.max(...vals);
  if (maxW <= 0) return [];
  return PLAYER_ORDER.filter((p) => byPlayer[p] === maxW);
}

function ShowDetail({ show, onClose }) {
  // `show` is the mandala's showMeta: { showTitle, showIdx, rosterSize, ... }.
  const title = show.showTitle;
  const showRecord = useMemo(
    () => shows.find((s) => s.showTitle === title) || { totals: {}, roster: [] },
    [title]
  );

  // Escape closes (same as PlayerProfile).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Scene highlight: hover previews, click LOCKS (persists until re-clicked or
  // another ring is clicked). Effective active ring = locked, else hovered.
  const [hoverRing, setHoverRing] = useState(null); // ring index or null
  const [lockedRing, setLockedRing] = useState(null); // ring index or null
  const [tooltip, setTooltip] = useState(null); // { x, y, ring }
  const bodyRef = useRef(null);
  const activeRing = lockedRing ?? hoverRing;

  // Per-scene rings for the unrolled radial (ordered by SCENE_ORDER).
  const rings = useMemo(() => {
    const scns = showScenes(title); // [{ code, type, parts:[{player,weight}] }]
    const n = scns.length || 1;
    const bandH = (OUTER - INNER) / n;
    const arcGen = d3arc();
    return scns.map((sc, si) => {
      const r0 = INNER + si * bandH + 1;
      const r1 = INNER + (si + 1) * bandH - 1;
      const tot = d3sum(sc.parts, (p) => p.weight) || 1;
      let acc = 0;
      const wedges = sc.parts.map((p) => {
        const start = acc;
        const end = acc + 2 * Math.PI * (p.weight / tot);
        acc = end;
        return {
          player: p.player,
          d: arcGen({ innerRadius: r0, outerRadius: r1, startAngle: start, endAngle: end }),
        };
      });
      // Cast ordered by canonical player order, with weights for the tooltip.
      const cast = sc.parts
        .slice()
        .sort((a, b) => PLAYER_ORDER.indexOf(a.player) - PLAYER_ORDER.indexOf(b.player))
        .map((p) => ({ player: p.player, weight: p.weight }));
      // Evenly-spaced label row (top -> bottom of the ring area), independent of
      // ring radius so labels never overlap on shows with many scenes. Inner
      // ring at the bottom, outer ring at the top (matches the visual stack).
      const labelY = OUTER - (si + 0.5) * ((2 * OUTER) / n);
      return { code: sc.code, type: sc.type, rMid: (r0 + r1) / 2, labelY, wedges, cast };
    });
  }, [title]);

  const moveTooltip = (evt, ri) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top, ring: ri });
  };
  const enterRing = (evt, ri) => {
    setHoverRing(ri);
    moveTooltip(evt, ri);
  };
  const leaveRing = () => {
    setHoverRing(null);
    setTooltip(null);
  };
  // Click toggles a locked scene highlight (click again or another to change).
  const toggleLockRing = (ri) =>
    setLockedRing((prev) => (prev === ri ? null : ri));

  const gridRadii = useMemo(
    () => [0, 1, 2, 3].map((k) => INNER + (OUTER - INNER) * (k / 3)),
    []
  );

  // Headline stats — all derived from data (no hardcoded counts). Weight is
  // NOT a timeline, so there's no "stage time" stat here.
  const sceneCount = rings.length;
  const onStage = (showRecord.roster || []).length;

  const openers = openedMostScenes(title);

  // Per-player SCENE COUNT for this show (how many of the show's scenes each
  // player appeared in) — a count, not a weighted/time measure. Sorted desc.
  const sceneCountByPlayer = useMemo(() => {
    const m = {};
    rings.forEach((ring) => {
      ring.cast.forEach((c) => {
        m[c.player] = (m[c.player] || 0) + 1;
      });
    });
    return m;
  }, [rings]);
  const barEntries = PLAYER_ORDER.filter((p) => sceneCountByPlayer[p] != null)
    .map((p) => [p, sceneCountByPlayer[p]])
    .sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(1, ...barEntries.map(([, v]) => v));

  return (
    <div className="showdetail-backdrop" role="presentation" onClick={onClose}>
      <div
        className="showdetail-panel"
        role="dialog"
        aria-label={`${title} show detail`}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <header className="showdetail-header">
          <div>
            <h2 className="showdetail-title" style={{ fontFamily: SERIF }}>
              {title}
            </h2>
            <p className="showdetail-kicker">
              SHOW {showRecord.showIndex ?? '·'} OF {TOTAL_SHOWS} · FIRST DATE 2025–26
            </p>
          </div>
          <button
            type="button"
            className="showdetail-close"
            onClick={onClose}
            aria-label="Close show detail"
          >
            ✕ close
          </button>
        </header>

        {/* ===== Body: unrolled radial (left) + stats (right) ===== */}
        <div className="showdetail-body" ref={bodyRef}>
          <div className="showdetail-radial">
            <svg
              className="showdetail-radial-svg"
              viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
              role="img"
              aria-label={`${title}: ${sceneCount} scenes unrolled into concentric rings, each split by participant weight.`}
            >
              <g>
                {/* faint concentric grid */}
                {gridRadii.map((r, i) => (
                  <circle
                    key={`grid-${i}`}
                    cx={0}
                    cy={0}
                    r={r}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.05}
                  />
                ))}

                {/* one full-circle ring per scene, split by participant weight.
                    Ring-level hover: the hovered scene stays lit, the rest dim,
                    and a cursor tooltip lists the cast. */}
                {rings.map((ring, ri) => {
                  const dimmed = activeRing !== null && activeRing !== ri;
                  const isActive = activeRing === ri;
                  const isLocked = lockedRing === ri;
                  return (
                    <g
                      key={ring.code}
                      className={`showdetail-ring${dimmed ? ' is-dimmed' : ''}${
                        isActive ? ' is-active' : ''
                      }${isLocked ? ' is-locked' : ''}`}
                      style={{ '--ring-i': ri }}
                      onMouseEnter={(e) => enterRing(e, ri)}
                      onMouseMove={(e) => moveTooltip(e, ri)}
                      onMouseLeave={leaveRing}
                      onClick={() => toggleLockRing(ri)}
                    >
                      {ring.wedges.map((w, wi) => (
                        <path
                          key={`${ring.code}-${w.player}-${wi}`}
                          d={w.d}
                          fill={PLAYER_COLORS[w.player]}
                          fillOpacity={0.9}
                          stroke={INK_TOKENS.bg}
                          strokeWidth={0.5}
                        />
                      ))}
                      {/* scene-code label — evenly spaced down the left column
                          (anchored near the viewBox's left margin edge). */}
                      <text
                        className="showdetail-ring-label"
                        x={LABEL_X}
                        y={-ring.labelY + 6}
                        textAnchor="start"
                      >
                        {ring.code}
                      </text>
                    </g>
                  );
                })}

                {/* center hub: scene count */}
                <text className="showdetail-hub-num" x={0} y={4} textAnchor="middle">
                  {sceneCount}
                </text>
                <text className="showdetail-hub-label" x={0} y={24} textAnchor="middle">
                  scenes
                </text>
              </g>
            </svg>
            <p className="showdetail-radial-caption">
              each ring a scene · split by who was in it (weight)
            </p>
          </div>

          <div className="showdetail-stats">
            {activeRing !== null && rings[activeRing] ? (
              /* SCENE VIEW — previews/locks on the active ring. The right column
                 swaps to this scene's code + human-readable type + its cast in
                 color with per-player share. Fades in via .showdetail-scene. */
              (() => {
                const ring = rings[activeRing];
                const castTotal = d3sum(ring.cast, (c) => c.weight) || 1;
                return (
                  <div className="showdetail-scene" key={ring.code}>
                    <p className="showdetail-section-label">SCENE</p>
                    <p className="showdetail-scene-code">
                      {ring.code} · {sceneTypeLabel(ring.type)}
                    </p>
                    <p className="showdetail-section-label">CAST</p>
                    <div className="showdetail-scene-cast">
                      {ring.cast.map((c) => (
                        <div key={c.player} className="showdetail-scene-castrow">
                          <span
                            className="showdetail-tip-swatch"
                            style={{ background: PLAYER_COLORS[c.player] }}
                          />
                          <span
                            className="showdetail-scene-castname"
                            style={{ color: PLAYER_COLORS[c.player] }}
                          >
                            {c.player}
                          </span>
                          <span className="showdetail-scene-castshare">
                            {Math.round((c.weight / castTotal) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="showdetail-scene" key="whole-show">
                {/* headline stats row — weight isn't a timeline, so no "stage time" */}
                <div className="showdetail-headline">
                  <div className="showdetail-stat">
                    <span className="showdetail-stat-num">{sceneCount}</span>
                    <span className="showdetail-stat-label">SCENES</span>
                  </div>
                  <div className="showdetail-stat">
                    <span className="showdetail-stat-num">{onStage}</span>
                    <span className="showdetail-stat-label">ON STAGE</span>
                  </div>
                </div>

                {openers.length > 0 && (
                  <p className="showdetail-openers" style={{ color: AMBER }}>
                    opened the most scenes: {openers.join(', ')}
                  </p>
                )}

                {/* per-player SCENE COUNT this show (not time) */}
                <p className="showdetail-section-label">SCENES THIS SHOW</p>
                <div className="showdetail-bars">
                  {barEntries.map(([player, val]) => (
                    <div key={player} className="showdetail-bar-row">
                      <span className="showdetail-bar-name">{player}</span>
                      <span className="showdetail-bar-track">
                        <span
                          className="showdetail-bar-fill"
                          style={{
                            width: `${(val / maxBar) * 100}%`,
                            background: PLAYER_COLORS[player],
                          }}
                        />
                      </span>
                      <span className="showdetail-bar-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scene hover tooltip: code + type + the cast (names in color). */}
          {tooltip && rings[tooltip.ring] && (
            <div
              className="showdetail-tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
              role="status"
            >
              <div className="showdetail-tip-title">
                {rings[tooltip.ring].code} · {sceneTypeLabel(rings[tooltip.ring].type)}
              </div>
              <div className="showdetail-tip-cast">
                {rings[tooltip.ring].cast.map((c) => (
                  <span key={c.player} className="showdetail-tip-name">
                    <span
                      className="showdetail-tip-swatch"
                      style={{ background: PLAYER_COLORS[c.player] }}
                    />
                    {c.player}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShowDetail;
