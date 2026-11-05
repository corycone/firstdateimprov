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
import PlayerProfile from './PlayerProfile';
import SceneChord from './SceneChord';
import ShowDetail from './ShowDetail';
import { PLAYER_COLORS, PLAYER_ORDER } from './palette';
import './SeasonStory.css';

// Scroll-track sections. Each title lives in the LEFT column and is the thing
// that actually scrolls (the viz stays pinned), giving visual scroll feedback.
// The next section's title rides up to the same anchor position as the last
// one leaves. The phase flips inside section 2 (see the sentinel below).
const SECTIONS = [
  {
    kicker: 'BALTIMORE IMPROV GROUP · CONSERVATORY HAROLD TEAM · 2025–26',
    title: 'First Date',
    blurb:
      'This graphic breaks down our entire season by player, beat, and scene. ' +
      'Filter by selecting a show or a player from the names up top. ' +
      'Selecting a show highlights it and reveals an Expand button for its full ' +
      'detail. Use the Export image button to save any view.',
  },
  {
    kicker: 'THE ENSEMBLE',
    title: 'The Players',
    blurb: "Click a player's chart to see their season profile.",
  },
  {
    kicker: 'WHO SHARED THE STAGE',
    title: 'Scene Partners',
    blurb: 'Hover a name to trace their scene partners.',
  },
];

function SeasonStory() {
  // Phase drives everything downstream (morph class, center fade, grid reveal).
  const [phase, setPhase] = useState('mandala');
  const [profilePlayer, setProfilePlayer] = useState(null);
  // The show (mandala showMeta) whose detail panel is open, when
  // phase === 'showDetail'. Resolved from the Expand click in the mandala.
  const [selectedShow, setSelectedShow] = useState(null);

  // Shared hover/lock state for the mandala + legend (lifted from SeasonPoster).
  const [hoverPlayer, setHoverPlayer] = useState(null);
  const [lockedPlayer, setLockedPlayer] = useState(null);

  const sentinelRef = useRef(null);
  const sentinel2Ref = useRef(null);
  const titleRefs = useRef([]);

  const toggleLockPlayer = (name) =>
    setLockedPlayer((prev) => (prev === name ? null : name));

  const activePlayer = lockedPlayer || hoverPlayer;

  // IntersectionObserver sentinel: when the 1px marker below Scene 1 scrolls
  // Scroll past the sentinel (to the viewport center) -> small multiples; scroll
  // back above it -> mandala. Position-latched so it never flickers.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    // Latch on POSITION via a scroll listener (robust where a thin-band
    // IntersectionObserver flickered — passing the trigger entered then exited
    // the band and sprang the morph back). The phase is 'smallMultiples' once
    // the sentinel has scrolled to/above the viewport center, and STAYS there
    // until it scrolls back below. rAF-throttled.
    let ticking = false;
    const evaluate = () => {
      ticking = false;
      const vh = window.innerHeight;
      const center = vh / 2;
      // Fade each left-column title by its distance from the anchor (viewport
      // vertical center): fully visible at the anchor, gone ~55% of a screen
      // away, so titles ease in as they rise and out as they leave.
      titleRefs.current.forEach((t) => {
        if (!t) return;
        const r = t.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - center) / (vh * 0.55);
        t.style.opacity = String(Math.max(0, Math.min(1, 1 - dist)));
      });
      // 3-stop position latch driven by two sentinels: past the first ->
      // smallMultiples, past the second -> sceneChord, else mandala.
      const el2 = sentinel2Ref.current;
      const past1 = el.getBoundingClientRect().top <= center;
      const past2 = el2 && el2.getBoundingClientRect().top <= center;
      const next = past2 ? 'sceneChord' : past1 ? 'smallMultiples' : 'mandala';
      setPhase((prev) => {
        // profile + showDetail are explicit open/close overlays — scroll never
        // flips them; they return to their prior phase via their own close.
        if (prev === 'profile' || prev === 'showDetail') return prev;
        return next;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(evaluate);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    evaluate(); // set initial phase on mount
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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

  // Expand a locked show into its detail panel. Reachable only from the plain
  // mandala (the Expand button lives in the locked-show center readout).
  const openShowDetail = (showMeta) => {
    setSelectedShow(showMeta);
    setPhase('showDetail');
  };
  // Close returns to the plain mandala. The mandala owns its own lockedShow
  // state (never unmounted), so the show stays selected underneath — the least
  // surprising behavior: closing the detail drops you back where you opened it.
  const closeShowDetail = () => {
    setSelectedShow(null);
    setPhase('mandala');
  };

  const morphActive = phase === 'smallMultiples' || phase === 'profile';
  // The legend is hidden only in the small-multiples/profile chapter; it fades
  // back in for the sceneChord chapter (and the plain mandala).
  const legendHidden = phase === 'smallMultiples' || phase === 'profile';

  return (
    <div className={`story story--${phase}`}>
      {/* ===== PINNED VIZ LAYER — fixed, full-viewport, centered. Never scrolls.
          The mandala + morph live here and are always centered on screen; the
          scroll track below drives the phase while this stays put. ===== */}
      <div className="story-viz" aria-hidden={false}>
        <section
          className={`poster-legend${legendHidden ? ' is-hidden' : ''}`}
          aria-label="Team legend"
          aria-hidden={legendHidden}
        >
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

        <section className="story-stage">
          <Mandala
            hoverPlayer={hoverPlayer}
            onHoverPlayer={setHoverPlayer}
            lockedPlayer={lockedPlayer}
            onLockPlayer={setLockedPlayer}
            centerFaded={morphActive}
            onExpandShow={openShowDetail}
          />
          {/* Morph overlay shares the mandala's coordinate space. */}
          <MorphLayer active={morphActive} onSelectPlayer={openProfile} />
          {/* Scene-partner chord — centered like the mandala, only visible and
              interactive in the sceneChord phase. */}
          <SceneChord active={phase === 'sceneChord'} />
        </section>

        {/* Scroll hint — bottom-left so it doesn't overlap the ring. Fades out
            once the morph begins. */}
        <div className={`story-scrollhint${morphActive ? ' is-hidden' : ''}`} aria-hidden="true">
          <span>scroll</span>
          <span className="story-scrollhint-arrow">↓</span>
        </div>
      </div>

      {/* ===== SCROLL TRACK — the only thing that scrolls. One full-screen
          section per chapter, each with its title in the left column. The
          titles scroll up into the same anchor spot while the viz stays pinned.
          The track overlays the viz but ignores pointer events. ===== */}
      <div className="story-track">
        {SECTIONS.map((s, i) => (
          <section className="story-panel" key={s.title}>
            {/* Trigger line, ~30% into section 2: crossing the viewport center
                (as that title rises toward its anchor) fires the morph. */}
            {i === 1 && <div ref={sentinelRef} className="story-sentinel" />}
            {i === 2 && <div ref={sentinel2Ref} className="story-sentinel" />}
            <div
              className="story-title"
              ref={(el) => {
                titleRefs.current[i] = el;
              }}
            >
              <span className="story-title-rule" aria-hidden="true" />
              <p className="story-title-kicker">{s.kicker}</p>
              <h2 className="story-title-text">{s.title}</h2>
              <p className="story-title-blurb">{s.blurb}</p>
            </div>
          </section>
        ))}
      </div>

      {/* Player profile overlay. */}
      {phase === 'profile' && profilePlayer && (
        <PlayerProfile name={profilePlayer} onClose={closeProfile} />
      )}

      {/* Show detail overlay (opened by the mandala's ⤢ Expand button). */}
      {phase === 'showDetail' && selectedShow && (
        <ShowDetail show={selectedShow} onClose={closeShowDetail} />
      )}
    </div>
  );
}

export default SeasonStory;
