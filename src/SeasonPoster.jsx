// SeasonPoster is now a thin shell around the scrollytelling container. The
// legend + <Mandala> wiring and the hover/lock state it used to own have moved
// into SeasonStory, which also holds the phase state machine and the morph.
import SeasonStory from './SeasonStory';
import './SeasonPoster.css';

function SeasonPoster() {
  return (
    <div className="poster">
      <SeasonStory />
    </div>
  );
}

export default SeasonPoster;
