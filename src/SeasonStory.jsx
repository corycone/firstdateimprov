// SeasonStory — the scrollytelling container for the First Date season page.
//
// SINGLE-SVG-COORDINATE-SYSTEM DECISION:
//   Scene 1 is the live <Mandala> (kept MOUNTED across every phase — never
//   unmounted/remounted — so its hover/lock/center-readout state survives).
//   On top of it sits <MorphLayer>, an overlay SVG using the SAME viewBox and
//   the SAME translate(CX,CY) group as the mandala, rendering the 1043 squares
//   ONCE. The morph and the small-multiples both live in that one transform
//   space: each square's START transform is identity (its native arc position,
//   pixel-on-top of the real segment) and its END transform carries it to the
//   centroid of its player+slot wedge in the 4-col grid. The transforms are
//   computed once per layout (useMemo in MorphLayer) and CSS eases the class
//   toggle, so there is NO per-frame React re-render of the 1043 nodes — React
//   only flips a single `phase` state and one className.
//
// Phase state machine: 'mandala' | 'smallMultiples' | 'profile'.
//   - An IntersectionObserver sentinel (NOT scroll-position math, NO scroll
//     library) flips mandala <-> smallMultiples when a 1px div enters/leaves
//     the viewport. Scrolling up cleanly reverses the morph.
//   - Clicking a fingerprint sets phase='profile' + profilePlayer (the actual
//     PlayerProfile is FEAT-003; here it's a placeholder so the build stays
//     green).
import { useEffect, useRef, useState } from 'react';
import Mandala from './Mandala';
import MorphLayer from './MorphLayer';
import Fingerprint from './Fingerprint';
import PlayerProfile from './PlayerProfile';
import { PLAYER_COLORS, PLAYER_ORDER } from './palette';
import './SeasonStory.css';

function SeasonStory() {
  // Phase drives everything downstream (morph class, center fade, grid reveal).
  const [phase, setPhase] = useState('mandala');
  const [profilePlayer, setProfilePlayer] = useState(null);

  // Shared hover/lock state for the mandala + legend (lifted from SeasonPoster).
  const [hoverPlayer, setHoverPlayer] = useState(null);
  const [lockedPlayer, setLockedPlayer] = useState(null);

  const sentinelRef = useRef(null);

  const toggleLockPlayer = (name) =>
    setLockedPlayer((prev) => (prev === name ? null : name));

  const activePlayer = lockedPlayer || hoverPlayer;

  // IntersectionObserver sentinel: when the 1px marker below Scene 1 scrolls
  // into view we are "past the mandala" -> small multiples; when it leaves
  // (scroll back up) we return to the mandala. No raw scroll math.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPhase((prev) => {
          if (prev === 'profile') return prev; // profile is explicit open/close
          return entry.isIntersecting ? 'smallMultiples' : 'mandala';
        });
      },
      { root: null, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const openProfile = (name) => {
    setProfilePlayer(name);
    setPhase('profile');
  };
  const closeProfile = () => {
    setProfilePlayer(null);
    // Return to the small-multiples state the morph handed off to.
    setPhase('smallMultiples');
  };

  const morphActive = phase === 'smallMultiples' || phase === 'profile';

  return (
    <div className={`story story--${phase}`}>
      {/* ===== Scene 1: legend + live mandala (always mounted) ===== */}
      <section className="story-scene1">
        <section className="poster-legend" aria-label="Team legend">
          {PLAYER_ORDER.map((name) => (
            <button
              key={name}
              type="button"
              className={`poster-legend-item${lockedPlayer === name ? ' is-locked' : ''}`}
              style={{ opacity: activePlayer && activePlayer !== name ? 0.35 : 1 }}
              onMouseEnter={() => setHoverPlayer(name)}
              onMouseLeave={() => setHoverPlayer(null)}
              onFocus={() => setHoverPlayer(name)}
              onBlur={() => setHoverPlayer(null)}
              onClick={() => toggleLockPlayer(name)}
            >
              <span
                className="poster-legend-swatch"
                style={{ background: PLAYER_COLORS[name] }}
              />
              <span className="poster-legend-name">{name}</span>
            </button>
          ))}
        </section>

        <section className="poster-centerpiece story-stage">
          <Mandala
            hoverPlayer={hoverPlayer}
            onHoverPlayer={setHoverPlayer}
            lockedPlayer={lockedPlayer}
            onLockPlayer={setLockedPlayer}
            centerFaded={morphActive}
          />
          {/* Morph overlay shares the mandala's coordinate space. */}
          <MorphLayer active={morphActive} />
        </section>
      </section>

      {/* 1px sentinel: entering the viewport = past the mandala. */}
      <div ref={sentinelRef} className="story-sentinel" aria-hidden="true" />

      {/* ===== Scene 2: small-multiples END grid ===== */}
      <section
        className="story-grid-scene"
        aria-hidden={phase === 'mandala'}
      >
        <header className="story-grid-head">
          <h2 className="story-grid-title">THE ENSEMBLE, ONE BY ONE</h2>
          <p className="story-grid-sub">
            each square from the mandala, regrouped into a fingerprint of how
            every player took the stage
          </p>
          <p className="story-grid-prompt">SELECT A PLAYER TO SEE THEIR PROFILE</p>
        </header>

        <div className="story-grid">
          {PLAYER_ORDER.map((name, i) => (
            <Fingerprint
              key={name}
              name={name}
              R={78}
              labels={i === 0}
              showName
              onClick={openProfile}
            />
          ))}
        </div>
      </section>

      {/* ===== Scene 3: player profile ===== */}
      {phase === 'profile' && profilePlayer && (
        <PlayerProfile name={profilePlayer} onClose={closeProfile} />
      )}
    </div>
  );
}

export default SeasonStory;
