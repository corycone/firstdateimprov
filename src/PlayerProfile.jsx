// PlayerProfile — the per-player profile panel (FEAT-003).
//
// Mounted by SeasonStory when phase === 'profile'. Mirrors the approved layout
// in mocks/scrolly-profile.png: a dark panel (#15162b) bordered in the player's
// color, a header (name + kicker + ✕ close), a headline stat row from
// players.json, a large labelled <Fingerprint>, three horizontal-bar slot
// breakdowns (initiations / walk-ons / full joins) that share ONE max across
// all three summaries so bar lengths are comparable, and a labelled season-arc
// strip over shows.json.
//
// Everything player-specific is drawn in PLAYER_COLORS[name]. Close is wired
// three ways: the ✕ button, the Escape key, and a click-away on the backdrop —
// all call onClose, which SeasonStory uses to return to the small-multiples
// grid. The enter/exit animation is CSS-driven (fade + scale), consistent with
// FEAT-002's phase-class approach, and snaps under prefers-reduced-motion.
import { useEffect } from 'react';
import Fingerprint from './Fingerprint';
import { PLAYER_COLORS, INK_TOKENS, SERIF } from './palette';
import {
  SLOTS,
  SLOT_LABEL,
  fingerprintWedges,
  hubR,
  ringR,
} from './fingerprintGeometry';
import { formatShowDate } from './mandalaGeometry';
import { buildProfileSVG, downloadSVGasPNG } from './exportPoster';
import players from './assets/data/players.json';
import shows from './assets/data/shows.json';
import scenes from './assets/data/scenes.json';
import initSum from './assets/data/initiations.summary.json';
import woSum from './assets/data/walkons.summary.json';
import fjSum from './assets/data/fulljoins.summary.json';
import './PlayerProfile.css';

const PLAYER_STATS = Object.fromEntries(players.map((p) => [p.name, p]));

// Per-player count of scene appearances (one scenes.json record = one player in
// one scene), for the "scenes per show" stat.
const SCENES_BY_PLAYER = scenes.reduce((acc, s) => {
  acc[s.player] = (acc[s.player] || 0) + 1;
  return acc;
}, {});

// Per-player, per-show scene count: SCENES_BY_PLAYER_SHOW[player][showTitle] =
// how many scenes that player was in that show. Drives the season-arc graph.
const SCENES_BY_PLAYER_SHOW = scenes.reduce((acc, s) => {
  (acc[s.player] ||= {})[s.showTitle] = (acc[s.player]?.[s.showTitle] || 0) + 1;
  return acc;
}, {});

// Largest single-show scene count for any player — shared y-scale so every
// player's season-arc bars are comparable in height.
const MAX_SCENES_IN_A_SHOW = Math.max(
  1,
  ...Object.values(SCENES_BY_PLAYER_SHOW).flatMap((byShow) => Object.values(byShow))
);

// shows.json sorted by showIndex ascending, null showIndex last (mirror the mock).
const SHOWS_SORTED = shows
  .slice()
  .sort((a, b) => (a.showIndex ?? 999) - (b.showIndex ?? 999));

// A single summary row ([slot, value]) for a player, in canonical slot order.
function slotRow(sum, name) {
  const rec = sum.find((r) => r.player === name) || {};
  return SLOTS.map((s) => [s, rec[s] ?? 0]);
}

function PlayerProfile({ name, onClose }) {
  const color = PLAYER_COLORS[name];
  const p = PLAYER_STATS[name] || { name };

  // Escape closes the profile; clean the listener up on unmount.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Scenes per show: this player's total scene-appearances divided by the
  // number of shows they were in. Derived from the data (showsAppeared is the
  // count of shows; totalScenes summed from the three slot summaries would
  // double-count, so use the backbone scene count per player instead).
  const scenesPerShow =
    p.showsAppeared > 0 ? (SCENES_BY_PLAYER[name] || 0) / p.showsAppeared : 0;

  // Headline stats (number over label). "Joined Initiator" = walked out as a
  // scene partner to someone else's initiation (formerly the confusing "Full
  // Joins"). The underlying data key stays `fulljoins`.
  const stats = [
    ['shows', p.showsAppeared],
    ['scenes/show', scenesPerShow.toFixed(1)],
    ['initiations', p.totalInitiations],
    ['walk-ons', p.totalWalkons],
    ['joined initiator', p.totalFullJoins],
    ['hosts', p.hosts],
    ['words', p.gets],
  ];

  // The three slot breakdowns share ONE max for comparable bar lengths.
  const initRow = slotRow(initSum, name);
  const woRow = slotRow(woSum, name);
  const fjRow = slotRow(fjSum, name);
  const maxAll = Math.max(
    1,
    ...[initRow, woRow, fjRow].flatMap((row) => row.map(([, v]) => v))
  );

  const breakdowns = [
    ['INITIATIONS', initRow],
    ['WALK-ONS', woRow],
    ['JOINED INITIATOR', fjRow],
  ];

  // Export the full profile as a PNG (composed SVG -> canvas; see exportPoster).
  const handleExport = async () => {
    const R = 150;
    const fpWedges = fingerprintWedges(name, R, { excludeThirds: true });
    const arc = SHOWS_SORTED.map((show) => ({
      date: formatShowDate(show.date),
      count: SCENES_BY_PLAYER_SHOW[name]?.[show.showTitle] || 0,
    }));
    const svg = buildProfileSVG({
      name,
      color,
      stats: stats.map(([label, val]) => [label, val]),
      fpWedges: fpWedges.map((w) => ({
        d: w.d,
        label: SLOT_LABEL[w.slot] ?? w.slot,
        labelX: w.labelX,
        labelY: w.labelY,
      })),
      fpHub: hubR(R),
      fpRing: ringR(R),
      breakdowns: breakdowns.map(([title, row]) => [
        title,
        row.map(([slot, val]) => [SLOT_LABEL[slot] ?? slot, val]),
      ]),
      maxBar: maxAll,
      arc,
      maxArc: MAX_SCENES_IN_A_SHOW,
      tokens: { bg: INK_TOKENS.bg, ink: INK_TOKENS.ink, muted: INK_TOKENS.muted },
    });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await downloadSVGasPNG(svg, {
      width: 1400,
      height: 900,
      scale: 2,
      filename: `first-date-${slug}.png`,
      bg: INK_TOKENS.bg,
    });
  };

  return (
    <div
      className="profile-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="profile-panel"
        role="dialog"
        aria-label={`${name} profile`}
        aria-modal="true"
        style={{ '--player-color': color }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <header className="profile-header">
          <div>
            <h2
              className="profile-name"
              style={{ color, fontFamily: SERIF }}
            >
              {name}
            </h2>
            <p className="profile-kicker">FIRST DATE · 2025–26 SEASON</p>
          </div>
          <div className="profile-header-actions">
            <button
              type="button"
              className="profile-export"
              onClick={handleExport}
            >
              ⤓ Save image
            </button>
            <button
              type="button"
              className="profile-close"
              onClick={onClose}
              aria-label="Close profile"
            >
              ✕ close
            </button>
          </div>
        </header>

        {/* ===== Headline stat row ===== */}
        <div className="profile-stats">
          {stats.map(([label, val]) => (
            <div key={label} className="profile-stat">
              <span className="profile-stat-num">{val}</span>
              <span className="profile-stat-label">{label.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* ===== Body: fingerprint (left) + breakdowns / season arc (right) ===== */}
        <div className="profile-body">
          <div className="profile-fingerprint">
            <p className="profile-section-label">
              SCENE FINGERPRINT (by scene slot, excl. 3rd beats)
            </p>
            <Fingerprint name={name} R={150} labels excludeThirds />
          </div>

          <div className="profile-breakdowns">
            {breakdowns.map(([label, row]) => (
              <div key={label} className="profile-bars">
                <p className="profile-section-label">{label}</p>
                {row.map(([slot, val]) => (
                  <div key={slot} className="profile-bar-row">
                    <span className="profile-bar-slot">{SLOT_LABEL[slot]}</span>
                    <span className="profile-bar-track">
                      <span
                        className="profile-bar-fill"
                        style={{
                          width: `${(val / maxAll) * 100}%`,
                          background: color,
                        }}
                      />
                    </span>
                    <span className="profile-bar-val">{val}</span>
                  </div>
                ))}
              </div>
            ))}

            {/* ===== Season arc: scenes per show across the season ===== */}
            <div className="profile-arc">
              <p className="profile-section-label">SCENES PER SHOW (across the season)</p>
              <div className="profile-arc-chart">
                {SHOWS_SORTED.map((show, i) => {
                  const count = SCENES_BY_PLAYER_SHOW[name]?.[show.showTitle] || 0;
                  const pct = (count / MAX_SCENES_IN_A_SHOW) * 100;
                  return (
                    <div
                      key={show.showIndex ?? `null-${i}`}
                      className="profile-arc-col"
                      title={`${show.showTitle} (${formatShowDate(show.date)}): ${count} scene${count === 1 ? '' : 's'}`}
                    >
                      {/* bar grows from the baseline; the count label rides
                          just above the bar's top so it tracks the bar height */}
                      <span className="profile-arc-bar-track">
                        <span
                          className="profile-arc-bar"
                          style={{
                            height: `${pct}%`,
                            background: count > 0 ? color : '#2a2b44',
                          }}
                        >
                          {count > 0 && (
                            <span className="profile-arc-count">{count}</span>
                          )}
                        </span>
                      </span>
                      {/* x-axis = show date */}
                      <span className="profile-arc-date">{formatShowDate(show.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;
