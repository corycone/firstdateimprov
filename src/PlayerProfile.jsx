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
import { SLOTS, SLOT_LABEL } from './fingerprintGeometry';
import players from './assets/data/players.json';
import shows from './assets/data/shows.json';
import initSum from './assets/data/initiations.summary.json';
import woSum from './assets/data/walkons.summary.json';
import fjSum from './assets/data/fulljoins.summary.json';
import './PlayerProfile.css';

const PLAYER_STATS = Object.fromEntries(players.map((p) => [p.name, p]));

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

  // Headline stats (number over label), mirroring the mock.
  const stats = [
    ['shows', p.showsAppeared],
    ['initiations', p.totalInitiations],
    ['walk-ons', p.totalWalkons],
    ['full joins', p.totalFullJoins],
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
    ['FULL JOINS', fjRow],
  ];

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
          <button
            type="button"
            className="profile-close"
            onClick={onClose}
            aria-label="Close profile"
          >
            ✕ close
          </button>
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
              PARTICIPATION FINGERPRINT (by scene slot, excl. 3rd beats)
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

            {/* ===== Season-arc strip ===== */}
            <div className="profile-arc">
              <p className="profile-section-label">SEASON ARC (shows appeared)</p>
              <div className="profile-arc-strip">
                {SHOWS_SORTED.map((show, i) => {
                  const inIt = (show.roster || []).includes(name);
                  return (
                    <span
                      key={show.showIndex ?? `null-${i}`}
                      className="profile-arc-cell"
                      title={show.showTitle}
                      style={{
                        background: inIt ? color : '#2a2b44',
                        opacity: inIt ? 0.95 : 0.6,
                      }}
                    />
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
