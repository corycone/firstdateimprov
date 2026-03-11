import { useState } from 'react';
import './Timeline.css';
import Stats from './Stats';

function Timeline({ data }) {
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [highlightedPlayer, setHighlightedPlayer] = useState(null);
  const [showScrollArrow, setShowScrollArrow] = useState(false);

  const handleScroll = (e) => {
    const element = e.target;
    const canScrollMore = element.scrollWidth > element.clientWidth && 
                          element.scrollLeft < (element.scrollWidth - element.clientWidth - 10);
    setShowScrollArrow(canScrollMore);
  };

  const checkScrollable = (element) => {
    if (element) {
      const canScroll = element.scrollWidth > element.clientWidth;
      setShowScrollArrow(canScroll);
    }
  };

  if (!data || !data.games) return null;

  const toggleScene = (sceneId) => {
    // Only one scene can be selected at a time
    if (selectedScene === sceneId) {
      setSelectedScene(null);
    } else {
      setSelectedScene(sceneId);
    }
  };

  const handleShowClick = (game) => {
    setSelectedShow(game);
    setSelectedScene(null);
  };

  const handleBack = () => {
    setSelectedShow(null);
    setSelectedScene(null);
  };

  const handleNextShow = () => {
    const currentIndex = data.games.findIndex(g => g.name === selectedShow.name);
    if (currentIndex < data.games.length - 1) {
      setSelectedShow(data.games[currentIndex + 1]);
      setSelectedScene(null);
      setHighlightedPlayer(null);
    }
  };

  const handlePrevShow = () => {
    const currentIndex = data.games.findIndex(g => g.name === selectedShow.name);
    if (currentIndex > 0) {
      setSelectedShow(data.games[currentIndex - 1]);
      setSelectedScene(null);
      setHighlightedPlayer(null);
    }
  };

  const handleStatsClick = () => {
    setShowStats(true);
  };

  const handleStatsBack = () => {
    setShowStats(false);
  };

  // Show stats view
  if (showStats) {
    return <Stats data={data} onBack={handleStatsBack} />;
  }

  // Main timeline view
  if (!selectedShow) {
    return (
      <div className="timeline-container">
        <div className="timeline-header">
          <div className="team-info">
            <h1 className="team-name">First Date!</h1>
            <p className="team-subtitle">Harold Team at Baltimore Improv Group</p>
          </div>
        </div>
        <button className="stats-button" onClick={handleStatsClick}>
          STATS
        </button>
        <div className="instruction-text">
          Click a show to see details
        </div>
        <div className="shows-grid-container">
          <div className="shows-grid">
            {data.games.map((game, idx) => (
              <div 
                key={idx} 
                className="show-card"
                onClick={() => handleShowClick(game)}
              >
                <div className="show-card-title">{game.name}</div>
                {game.date && <div className="show-card-date">{game.date}</div>}
                <div className="show-card-players">
                  {game.players.map((p, i) => (
                    <span key={i} className="show-card-player">{p.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show detail view with scenes timeline
  const scenes = Object.entries(selectedShow.scores).map(([sceneType, sceneInstances]) => ({
    sceneType,
    instance: sceneInstances[0] // Take first instance
  }));

  // Group scenes hierarchically
  const sceneGroups = {
    round1: scenes.filter(s => ['1A', '1B', '1C'].includes(s.sceneType)),
    d: scenes.filter(s => s.sceneType === 'D'),
    round2: scenes.filter(s => ['2A', '2B', '2C'].includes(s.sceneType)),
    e: scenes.filter(s => s.sceneType === 'E'),
    round3: scenes.filter(s => ['3A', '3B', '3C', '3D'].includes(s.sceneType))
  };

  // Get current show index for navigation
  const currentShowIndex = data.games.findIndex(g => g.name === selectedShow.name);
  const hasPrevShow = currentShowIndex > 0;
  const hasNextShow = currentShowIndex < data.games.length - 1;

  // Get all unique players from the show
  console.log('Selected show:', selectedShow.name, 'Players:', selectedShow.players);
  const allPlayers = selectedShow.players.map(p => p.name);
  console.log('All players array:', allPlayers);
  
  // Get players for the selected scene
  const selectedSceneData = selectedScene ? 
    scenes.find(s => selectedScene === `${selectedShow.name}-${s.sceneType}`) : null;
  
  // Handle "All" keyword in player lists
  let activePlayers = selectedSceneData?.instance.players || [];
  if (activePlayers.includes('All')) {
    // Replace "All" with all players from the show
    activePlayers = [...new Set([...activePlayers.filter(p => p !== 'All'), ...allPlayers])];
  }

  return (
    <div className="timeline-container show-detail-view">
      {/* Header with show info and back button */}
      <div className="show-header-compact">
        <button className="back-button" onClick={handleBack}>← Back</button>
        <div className="show-info">
          <h1 className="show-title-compact">{selectedShow.name}</h1>
          {selectedShow.date && <div className="show-date-compact">{selectedShow.date}</div>}
        </div>
        <div className="show-navigation">
          <button 
            className="nav-button" 
            onClick={handlePrevShow}
            disabled={!hasPrevShow}
          >
            ← Prev
          </button>
          <button 
            className="nav-button" 
            onClick={handleNextShow}
            disabled={!hasNextShow}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Backline - All players */}
      <div className="backline">
        <div className="backline-label">BACKLINE</div>
        <div className="backline-players">
          {allPlayers.map((player, idx) => (
            <div 
              key={idx} 
              className={`player-card ${activePlayers.includes(player) ? 'on-stage' : ''} ${highlightedPlayer === player ? 'highlighted' : ''}`}
              onMouseEnter={() => setHighlightedPlayer(player)}
              onMouseLeave={() => setHighlightedPlayer(null)}
              onClick={() => setHighlightedPlayer(highlightedPlayer === player ? null : player)}
            >
              {player}
            </div>
          ))}
        </div>
      </div>

      {/* Main content area with scenes and stage side by side */}
      <div className="show-content">
        {/* Scenes Timeline - Hierarchical */}
        <div className="scenes-timeline-wrapper">
          <div className="scenes-timeline-label">SCENES</div>
          <div className="scenes-hierarchy">
          {/* Round 1 */}
          {sceneGroups.round1.length > 0 && (
            <div className="scene-row">
              {sceneGroups.round1.map((scene, idx) => {
                const sceneId = `${selectedShow.name}-${scene.sceneType}`;
                const isSelected = selectedScene === sceneId;
                const hasTitle = scene.instance.sceneTitle;
                const hasHighlightedPlayer = highlightedPlayer && scene.instance.players.includes(highlightedPlayer);

                return (
                  <div 
                    key={idx} 
                    className={`scene-card ${isSelected ? 'selected' : ''} ${hasTitle ? 'has-metadata' : ''} ${hasHighlightedPlayer ? 'player-highlighted' : ''}`}
                    onClick={() => toggleScene(sceneId)}
                  >
                    <div className="scene-card-type">{scene.sceneType}</div>
                    {hasTitle && <div className="scene-card-title">{scene.instance.sceneTitle}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connector to D */}
          {sceneGroups.d.length > 0 && sceneGroups.round1.length > 0 && (
            <div className="scene-connector"></div>
          )}

          {/* D */}
          {sceneGroups.d.length > 0 && (
            <div className="scene-row">
              {sceneGroups.d.map((scene, idx) => {
                const sceneId = `${selectedShow.name}-${scene.sceneType}`;
                const isSelected = selectedScene === sceneId;
                const hasTitle = scene.instance.sceneTitle;
                const hasHighlightedPlayer = highlightedPlayer && scene.instance.players.includes(highlightedPlayer);

                return (
                  <div 
                    key={idx} 
                    className={`scene-card ${isSelected ? 'selected' : ''} ${hasTitle ? 'has-metadata' : ''} ${hasHighlightedPlayer ? 'player-highlighted' : ''}`}
                    onClick={() => toggleScene(sceneId)}
                  >
                    <div className="scene-card-type">{scene.sceneType}</div>
                    {hasTitle && <div className="scene-card-title">{scene.instance.sceneTitle}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connector to Round 2 */}
          {sceneGroups.round2.length > 0 && sceneGroups.d.length > 0 && (
            <div className="scene-connector"></div>
          )}

          {/* Round 2 */}
          {sceneGroups.round2.length > 0 && (
            <div className="scene-row">
              {sceneGroups.round2.map((scene, idx) => {
                const sceneId = `${selectedShow.name}-${scene.sceneType}`;
                const isSelected = selectedScene === sceneId;
                const hasTitle = scene.instance.sceneTitle;
                const hasHighlightedPlayer = highlightedPlayer && scene.instance.players.includes(highlightedPlayer);

                return (
                  <div 
                    key={idx} 
                    className={`scene-card ${isSelected ? 'selected' : ''} ${hasTitle ? 'has-metadata' : ''} ${hasHighlightedPlayer ? 'player-highlighted' : ''}`}
                    onClick={() => toggleScene(sceneId)}
                  >
                    <div className="scene-card-type">{scene.sceneType}</div>
                    {hasTitle && <div className="scene-card-title">{scene.instance.sceneTitle}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connector to E */}
          {sceneGroups.e.length > 0 && sceneGroups.round2.length > 0 && (
            <div className="scene-connector"></div>
          )}

          {/* E */}
          {sceneGroups.e.length > 0 && (
            <div className="scene-row">
              {sceneGroups.e.map((scene, idx) => {
                const sceneId = `${selectedShow.name}-${scene.sceneType}`;
                const isSelected = selectedScene === sceneId;
                const hasTitle = scene.instance.sceneTitle;
                const hasHighlightedPlayer = highlightedPlayer && scene.instance.players.includes(highlightedPlayer);

                return (
                  <div 
                    key={idx} 
                    className={`scene-card ${isSelected ? 'selected' : ''} ${hasTitle ? 'has-metadata' : ''} ${hasHighlightedPlayer ? 'player-highlighted' : ''}`}
                    onClick={() => toggleScene(sceneId)}
                  >
                    <div className="scene-card-type">{scene.sceneType}</div>
                    {hasTitle && <div className="scene-card-title">{scene.instance.sceneTitle}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connector to Round 3 */}
          {sceneGroups.round3.length > 0 && sceneGroups.e.length > 0 && (
            <div className="scene-connector"></div>
          )}

          {/* Round 3 */}
          {sceneGroups.round3.length > 0 && (
            <div className="scene-row">
              {sceneGroups.round3.map((scene, idx) => {
                const sceneId = `${selectedShow.name}-${scene.sceneType}`;
                const isSelected = selectedScene === sceneId;
                const hasTitle = scene.instance.sceneTitle;
                const hasHighlightedPlayer = highlightedPlayer && scene.instance.players.includes(highlightedPlayer);

                return (
                  <div 
                    key={idx} 
                    className={`scene-card ${isSelected ? 'selected' : ''} ${hasTitle ? 'has-metadata' : ''} ${hasHighlightedPlayer ? 'player-highlighted' : ''}`}
                    onClick={() => toggleScene(sceneId)}
                  >
                    <div className="scene-card-type">{scene.sceneType}</div>
                    {hasTitle && <div className="scene-card-title">{scene.instance.sceneTitle}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stage Area - Right side */}
      <div className="stage-area">
        <div className="stage-label">STAGE</div>
        <div className="stage-content">
          <div className="stage-players">
            {activePlayers.length > 0 ? (
              activePlayers.map((player, idx) => (
                <div key={idx} className="player-card-stage">
                  {player}
                </div>
              ))
            ) : (
              <div className="stage-empty">Select a scene to see players on stage</div>
            )}
          </div>
          
          {/* Scene details */}
          {selectedSceneData && (
            <div className="scene-info">
              <div className="scene-info-title">
                {selectedSceneData.instance.sceneTitle || '(Untitled Scene)'}
              </div>
              <div className="scene-scores">
                {Object.entries(selectedSceneData.instance.scores).map(([player, data]) => (
                  <span key={player} className="score-item">
                    {player}: {data.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default Timeline;
