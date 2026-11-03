import { useState } from 'react';
import MasterDataParser from './MasterDataParser';
import SeasonPoster from './SeasonPoster';
import './App.css';

function App() {
  // The Season Poster is the whole experience — no nav bar eating space.
  // A tiny floating "Stats" link (bottom corner, overlaid) is the escape hatch
  // back to the old dashboard so it isn't lost.
  const [view, setView] = useState('poster');

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
      <SeasonPoster />
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
