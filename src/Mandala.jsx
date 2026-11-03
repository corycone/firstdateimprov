import { useMemo, useState, useRef } from 'react';
import { PLAYER_COLORS, INK_TOKENS } from './palette';
import { buildExportSVG, downloadSVGasPNG } from './exportPoster';
import {
  buildGeometry,
  sceneTypeLabel,
  CX,
  CY,
  INNER_R,
  VB_X,
  VB_Y,
  VB_W,
  VB_H,
} from './mandalaGeometry';
import scenes from './assets/data/scenes.json';
import players from './assets/data/players.json';
import './Mandala.css';

// Quick lookups for the center readout.
const PLAYER_STATS = Object.fromEntries(players.map((p) => [p.name, p]));
const SCENE_COUNT_BY_SHOW = scenes.reduce((acc, s) => {
  acc[s.showTitle] = (acc[s.showTitle] || 0) + 1;
  return acc;
}, {});

const DIM_OPACITY = 0.18;

// Top initiators for a show summary: players tied for the highest count.
function topInitiators(initiations) {
  const entries = Object.entries(initiations).filter(([, c]) => c > 0);
  if (!entries.length) return [];
  const maxC = Math.max(...entries.map(([, c]) => c));
  return entries.filter(([, c]) => c === maxC).map(([name]) => name);
}

function Mandala({ hoverPlayer, onHoverPlayer, lockedPlayer, onLockPlayer }) {
  // Transient hover preview state (D3 only computes geometry; React drives UI).
  const [hoverSegment, setHoverSegment] = useState(null); // segment object
  const [hoverShow, setHoverShow] = useState(null); // showMeta object
  const [tooltip, setTooltip] = useState(null); // { x, y, content }
  // Locked selections: persist until cleared by clicking away / re-clicking.
  // A locked segment or show lives here; a locked player is lifted to the
  // parent (SeasonPoster) so the legend can reflect/drive it too.
  const [lockedSegment, setLockedSegment] = useState(null);
  const [lockedShow, setLockedShow] = useState(null);
  const wrapRef = useRef(null);

  const { segments, showMeta, groupBands, gridRadii } = useMemo(() => buildGeometry(), []);

  // A lock fully owns the highlight: once anything is locked, hover no longer
  // changes what's emphasized (hover still shows a tooltip for inspection).
  // With nothing locked, hover drives a transient preview.
  // Precedence among the active dimension (most specific first):
  // segment > player > show.
  const isLocked = Boolean(lockedSegment || lockedPlayer || lockedShow);
  const effSegment = isLocked ? lockedSegment : hoverSegment;
  const effPlayer = isLocked ? lockedPlayer : hoverPlayer;
  const effShow = isLocked ? lockedShow : hoverShow;
  const hasFocus = Boolean(effSegment || effPlayer || effShow);

  const segmentOpacity = (seg) => {
    if (!hasFocus) return 0.9;
    if (effSegment) {
      // the focused segment pops full; its wedge-mates stay lit as context;
      // everything in other shows dims.
      if (seg.id === effSegment.id) return 1;
      return seg.showIdx === effSegment.showIdx ? 0.9 : DIM_OPACITY;
    }
    if (effPlayer) return seg.player === effPlayer ? 1 : DIM_OPACITY;
    if (effShow) return seg.showIdx === effShow.showIdx ? 1 : DIM_OPACITY;
    return 0.9;
  };

  const groupBandOpacity = (gb) =>
    hasFocus && effShow && effShow.showIdx !== gb.showIdx ? 0.12 : 0.5;

  const labelOpacity = (meta) =>
    effShow && effShow.showIdx !== meta.showIdx ? DIM_OPACITY : 1;

  // Describe the current center selection for the export composer.
  const centerSelection = () => {
    if (effSegment) {
      return {
        kind: 'segment',
        data: {
          showTitle: effSegment.showTitle,
          sceneCode: effSegment.sceneCode,
          sceneTypeLabel: sceneTypeLabel(effSegment.sceneType),
          player: effSegment.player,
        },
      };
    }
    if (effPlayer) {
      return { kind: 'player', data: PLAYER_STATS[effPlayer] || { name: effPlayer } };
    }
    if (effShow) {
      return {
        kind: 'show',
        data: {
          showTitle: effShow.showTitle,
          sceneCount: SCENE_COUNT_BY_SHOW[effShow.showTitle] || 0,
          rosterSize: effShow.rosterSize,
          inits: topInitiators(effShow.initiations),
        },
      };
    }
    return { kind: 'default' };
  };

  // Build a filename reflecting the current filter.
  const exportFilename = () => {
    const sel = centerSelection();
    const slug = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (sel.kind === 'player') return `first-date-${slug(sel.data.name)}.png`;
    if (sel.kind === 'show') return `first-date-show-${slug(sel.data.showTitle)}.png`;
    if (sel.kind === 'segment') return `first-date-${slug(sel.data.showTitle)}-${slug(sel.data.sceneCode)}.png`;
    return 'first-date-season.png';
  };

  const handleExport = async () => {
    const svg = buildExportSVG({
      geo: { segments, showMeta, groupBands, gridRadii },
      view: { CX, CY, VB_X, VB_Y, VB_W, VB_H },
      opacityOf: segmentOpacity,
      groupOpacityOf: groupBandOpacity,
      labelOpacityOf: labelOpacity,
      sel: centerSelection(),
      tokens: { bg: INK_TOKENS.bg, ink: INK_TOKENS.ink, muted: INK_TOKENS.muted, amber: '#ff9e45' },
    });
    await downloadSVGasPNG(svg, {
      width: VB_W,
      height: VB_H,
      scale: 2,
      filename: exportFilename(),
      bg: INK_TOKENS.bg,
    });
  };

  const moveTooltip = (evt, content) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top, content });
  };

  const handleSegmentEnter = (seg, evt) => {
    setHoverSegment(seg);
    // keep the whole wedge lit as context while a segment pops
    setHoverShow((prev) => (prev?.showIdx === seg.showIdx ? prev : showMeta[seg.showIdx]));
    moveTooltip(evt, (
      <>
        <div className="mandala-tip-title">{seg.showTitle}</div>
        <div className="mandala-tip-row">
          {seg.sceneCode} — {sceneTypeLabel(seg.sceneType)}
        </div>
        <div className="mandala-tip-row">
          <span className="mandala-tip-swatch" style={{ background: PLAYER_COLORS[seg.player] }} />
          {seg.player}
        </div>
      </>
    ));
  };

  const handleShowEnter = (meta, evt) => {
    setHoverShow(meta);
    const inits = topInitiators(meta.initiations);
    moveTooltip(evt, (
      <>
        <div className="mandala-tip-title">{meta.showTitle}</div>
        {inits.length > 0 && (
          <div className="mandala-tip-row">
            initiated by {inits.join(', ')}
          </div>
        )}
      </>
    ));
  };

  // Clear only the transient hover preview (called on mouse-out). Locked
  // selections persist.
  const clearHover = () => {
    setHoverSegment(null);
    setHoverShow(null);
    setTooltip(null);
    onHoverPlayer?.(null);
  };

  // Clear every locked selection (click-away / Escape / center click).
  const clearLocks = () => {
    setLockedSegment(null);
    setLockedShow(null);
    onLockPlayer?.(null);
  };

  // Click to toggle a locked segment. Locking a segment clears other lock kinds.
  const toggleLockSegment = (seg) => {
    const same = lockedSegment && lockedSegment.id === seg.id;
    setLockedShow(null);
    onLockPlayer?.(null);
    setLockedSegment(same ? null : seg);
  };

  // Click to toggle a locked show.
  const toggleLockShow = (meta) => {
    const same = lockedShow && lockedShow.showIdx === meta.showIdx;
    setLockedSegment(null);
    onLockPlayer?.(null);
    setLockedShow(same ? null : meta);
  };

  // ---- center readout content, by effective selection ----
  function renderCenter() {
    // segment > player > show > default
    if (effSegment) {
      const seg = effSegment;
      return (
        <div className="mc mc-segment">
          <div className="mc-eyebrow">{seg.showTitle}</div>
          <div className="mc-kicker">
            {seg.sceneCode} · {sceneTypeLabel(seg.sceneType)}
          </div>
          <div className="mc-name" style={{ color: PLAYER_COLORS[seg.player] }}>
            {seg.player}
          </div>
        </div>
      );
    }

    if (effPlayer) {
      const p = PLAYER_STATS[effPlayer] || {};
      const stats = [
        ['shows', p.showsAppeared],
        ['initiations', p.totalInitiations],
        ['walk-ons', p.totalWalkons],
        ['full joins', p.totalFullJoins],
        ['hosts', p.hosts],
        ['words', p.gets],
      ];
      return (
        <div className="mc mc-player">
          <div className="mc-name" style={{ color: PLAYER_COLORS[effPlayer] }}>
            {effPlayer}
          </div>
          <dl className="mc-stats">
            {stats.map(([label, val]) => (
              <div className="mc-stat" key={label}>
                <dd className="mc-stat-num">{val ?? 0}</dd>
                <dt className="mc-stat-label">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      );
    }

    if (effShow) {
      const meta = effShow;
      const inits = topInitiators(meta.initiations);
      const sceneCount = SCENE_COUNT_BY_SHOW[meta.showTitle] || 0;
      return (
        <div className="mc mc-show">
          <div className="mc-eyebrow">SHOW</div>
          <div className="mc-name mc-name-show">{meta.showTitle}</div>
          <dl className="mc-stats">
            <div className="mc-stat">
              <dd className="mc-stat-num">{sceneCount}</dd>
              <dt className="mc-stat-label">scenes</dt>
            </div>
            <div className="mc-stat">
              <dd className="mc-stat-num">{meta.rosterSize}</dd>
              <dt className="mc-stat-label">on stage</dt>
            </div>
          </dl>
          {inits.length > 0 && (
            <div className="mc-foot">initiated by {inits.join(', ')}</div>
          )}
        </div>
      );
    }

    // default — team identity + season KPIs
    return (
      <div className="mc mc-default">
        <div className="mc-title">FIRST DATE</div>
        <div className="mc-sub">BALTIMORE IMPROV GROUP</div>
        <div className="mc-sub mc-sub-dim">CONSERVATORY · 2025–26</div>
        <dl className="mc-stats mc-stats-kpi">
          <div className="mc-stat">
            <dd className="mc-stat-num">25</dd>
            <dt className="mc-stat-label">shows</dt>
          </div>
          <div className="mc-stat">
            <dd className="mc-stat-num">1043</dd>
            <dt className="mc-stat-label">scenes</dt>
          </div>
          <div className="mc-stat">
            <dd className="mc-stat-num">11</dd>
            <dt className="mc-stat-label">players</dt>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="mandala-wrap" ref={wrapRef} onMouseLeave={clearHover}>
      <svg
        className="mandala-svg"
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Season mandala: 25 wedges, one per show; each ring band is a scene colored by player."
      >
        {/* faint concentric grid */}
        {gridRadii.map((r, i) => (
          <circle
            key={`grid-${i}`}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.05}
          />
        ))}

        {/* click-away target: clears locks when clicking empty space / hole */}
        <rect
          x={VB_X}
          y={VB_Y}
          width={VB_W}
          height={VB_H}
          fill="transparent"
          onClick={clearLocks}
        />

        {/* invisible per-show hit wedges (behind segments) so hovering the
            vicinity of a show highlights the whole wedge */}
        <g transform={`translate(${CX},${CY})`}>
          {showMeta.map((meta) => (
            <path
              key={`hit-${meta.showIdx}`}
              d={meta.hitD}
              fill="transparent"
              className="mandala-hit"
              onMouseEnter={(e) => handleShowEnter(meta, e)}
              onMouseMove={(e) => handleShowEnter(meta, e)}
              onMouseLeave={() => {
                setHoverShow(null);
                setTooltip(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleLockShow(meta);
              }}
            />
          ))}
        </g>

        {/* scene segments */}
        <g transform={`translate(${CX},${CY})`}>
          {segments.map((seg) => (
            <path
              key={seg.id}
              d={seg.d}
              fill={PLAYER_COLORS[seg.player]}
              stroke={INK_TOKENS.bg}
              strokeWidth={0.4}
              className="mandala-seg"
              style={{ fillOpacity: segmentOpacity(seg) }}
              onMouseEnter={(e) => {
                handleSegmentEnter(seg, e);
                onHoverPlayer?.(seg.player);
              }}
              onMouseMove={(e) => handleSegmentEnter(seg, e)}
              onMouseLeave={() => {
                setHoverSegment(null);
                setTooltip(null);
                onHoverPlayer?.(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleLockSegment(seg);
              }}
            />
          ))}
        </g>

        {/* subtle beat-group outlines (round 1 · group game 1 · round 2 ·
            group game 2 · third beats). Non-interactive overlay. */}
        <g transform={`translate(${CX},${CY})`} className="mandala-groups">
          {groupBands.map((gb) => (
            <path
              key={gb.id}
              d={gb.d}
              className="mandala-group-band"
              style={{ opacity: groupBandOpacity(gb) }}
            />
          ))}
        </g>

        {/* rim labels */}
        {showMeta.map((meta) => (
          <text
            key={`label-${meta.showIdx}`}
            x={meta.lx}
            y={meta.ly}
            fill={INK_TOKENS.ink}
            fontSize={18}
            textAnchor={meta.anchor}
            transform={`rotate(${meta.rot.toFixed(1)} ${meta.lx.toFixed(1)} ${meta.ly.toFixed(1)})`}
            className={`mandala-rim-label${
              effShow && effShow.showIdx === meta.showIdx ? ' is-locked' : ''
            }`}
            style={{ fillOpacity: labelOpacity(meta) }}
            onMouseEnter={(e) => handleShowEnter(meta, e)}
            onMouseLeave={() => {
              setHoverShow(null);
              setTooltip(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleLockShow(meta);
            }}
          >
            {meta.showTitle}
          </text>
        ))}

      </svg>

      {/* Live center readout, positioned over the hole. Content reflects the
          effective selection (locked, else hovered); default shows the team
          identity + season KPIs. */}
      <div
        className="mandala-center"
        style={{
          width: `${(INNER_R * 2 * 100) / VB_W}%`,
          height: `${(INNER_R * 2 * 100) / VB_H}%`,
        }}
      >
        {renderCenter()}
      </div>

      <button type="button" className="mandala-export" onClick={handleExport}>
        ⤓ Export poster
      </button>

      {tooltip && tooltip.content && (
        <div
          className="mandala-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="status"
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export default Mandala;
