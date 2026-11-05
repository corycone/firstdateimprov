import { useState } from 'react';
import MasterDataParser from './MasterDataParser';
import SeasonPoster from './SeasonPoster';
import { setPalette, ACTIVE_PALETTE, PALETTE_NAMES } from './palette';
import './App.css';

function App() {
  // The Season Poster is the whole experience — no nav bar eating space.
  // A tiny floating "Stats" link (bottom corner, overlaid) is the escape hatch
  // back to the old dashboard so it isn't lost.
  const [view, setView] = useState('poster');

  // Live palette toggle (compare color sets in context). Cycling swaps the
  // shared PLAYER_COLORS in place; bumping paletteKey forces the tree to
  // re-render so every color re-reads. Geometry (useMemo) is unaffected —
  // colors are read at render time, not baked into the memoized paths.
  const [paletteName, setPaletteName] = useState(ACTIVE_PALETTE);
  const cyclePalette = () => {
    const i = PALETTE_NAMES.indexOf(paletteName);
    const next = PALETTE_NAMES[(i + 1) % PALETTE_NAMES.length];
    setPalette(next);
    setPaletteName(next);
  };

  if (view === 'stats') {
    return (
      <div className="app-shell">
        <MasterDataParser />
        <button
          type="button"
          className="app-corner-link"
          onClick={() => setView('poster')}
        >
          ← Poster
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* key on the palette so a toggle re-renders the whole viz tree */}
      <SeasonPoster key={paletteName} />
      <button
        type="button"
        className="app-corner-link app-corner-link--palette"
        onClick={cyclePalette}
        title="Toggle color palette"
      >
        palette: {paletteName}
      </button>
      <button
        type="button"
        className="app-corner-link"
        onClick={() => setView('stats')}
      >
        Stats
      </button>
    </div>
  );
}

export default App;
