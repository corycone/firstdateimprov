import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './Stats.css';

function Stats({ data, onBack }) {
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [excelInitiations, setExcelInitiations] = useState(null);
  const [selectedPairing, setSelectedPairing] = useState(null);
  const [pairingScenes, setPairingScenes] = useState([]);

  useEffect(() => {
    // Load initiation data from Excel
    const loadExcelInitiations = async () => {
      try {
        const response = await fetch('/src/assets/First Date Improv Stats.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets['First Date'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const initiations = parseExcelInitiations(jsonData);
        setExcelInitiations(initiations);
      } catch (err) {
        console.error('Error loading Excel initiations:', err);
      }
    };

    loadExcelInitiations();
  }, []);

  const parseExcelInitiations = (excelData) => {
    const playerNames = {
      'CC': 'Cory',
      'TP': 'Teresa',
      'JM': 'Jesa',
      'BM': 'Brendan',
      'JH': 'Jay',
      'SK': 'Sean',
      'LT': 'Lisa',
      'ZM': 'Zach'
    };

    const initiationsByShow = {};
    let currentGame = null;
    let currentPlayers = [];
    let currentDate = null;

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim();

      // Game title row
      if (firstCell.startsWith('"') && firstCell.endsWith('"')) {
        const gameName = firstCell.replace(/"/g, '');
        if (gameName.toLowerCase() === 'legend') continue;

        currentGame = gameName;
        currentPlayers = [];
        
        for (let j = 1; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (!cell || cell.startsWith('"')) break;
          currentPlayers.push(playerNames[cell] || cell);
        }

        // Try to find date from data.games with case-insensitive matching
        const matchedGame = data?.games?.find(g => 
          g.name.toUpperCase() === gameName.toUpperCase()
        );
        currentDate = matchedGame?.date || 'Unknown';

        initiationsByShow[currentGame] = {
          date: currentDate,
          initiations: {}
        };
        continue;
      }

      if (!currentGame) continue;

      // Initiations row
      if (firstCell === 'Initiations') {
        row.slice(1).forEach((count, idx) => {
          if (count !== undefined && count !== '' && currentPlayers[idx]) {
            const player = currentPlayers[idx];
            const initiationCount = parseInt(count) || 0;
            if (initiationCount > 0) {
              initiationsByShow[currentGame].initiations[player] = initiationCount;
            }
          }
        });
        continue;
      }
    }

    console.log('📊 Loaded Excel initiations:', initiationsByShow);
    return initiationsByShow;
  };

  const statsData = useMemo(() => {
    if (!data || !data.games || !excelInitiations) return null;

    // Calculate initiations by player from Excel data
    const initiationsByPlayer = {};
    const initiationsByShowDate = [];

    // Process each show from Excel data
    Object.entries(excelInitiations).forEach(([showName, showData]) => {
      const showInitiations = {};

      Object.entries(showData.initiations).forEach(([player, count]) => {
        if (!initiationsByPlayer[player]) {
          initiationsByPlayer[player] = {
            '1A': 0, '1B': 0, '1C': 0, 'D': 0,
            '2A': 0, '2B': 0, '2C': 0, 'E': 0, '3rd': 0,
            total: 0
          };
        }
        
        initiationsByPlayer[player].total += count;
        showInitiations[player] = count;
      });

      initiationsByShowDate.push({
        date: showData.date || 'Unknown',
        show: showName,
        ...showInitiations
      });
    });

    // Calculate additional stats from master data
    const playerStats = {};
    const playerPairings = {};
    const pairingDetails = {}; // Track which scenes each pair performed together
    const sceneWords = {};
    
    data.games.forEach(game => {
      Object.entries(game.scores).forEach(([sceneType, sceneInstances]) => {
        sceneInstances.forEach(scene => {
          const playersInScene = Object.keys(scene.scores);
          
          // Track player stats
          Object.entries(scene.scores).forEach(([player, scoreData]) => {
            if (!playerStats[player]) {
              playerStats[player] = {
                totalScore: 0,
                sceneCount: 0,
                walkOns: 0,
                sceneTypes: {}
              };
            }
            
            playerStats[player].totalScore += scoreData.value;
            playerStats[player].sceneCount++;
            
            if (scoreData.value === 0.5) {
              playerStats[player].walkOns++;
            }
            
            if (!playerStats[player].sceneTypes[sceneType]) {
              playerStats[player].sceneTypes[sceneType] = 0;
            }
            playerStats[player].sceneTypes[sceneType]++;
          });
          
          // Track player pairings and their scenes
          for (let i = 0; i < playersInScene.length; i++) {
            for (let j = i + 1; j < playersInScene.length; j++) {
              const pair = [playersInScene[i], playersInScene[j]].sort().join('-');
              playerPairings[pair] = (playerPairings[pair] || 0) + 1;
              
              // Store scene details for this pairing
              if (!pairingDetails[pair]) {
                pairingDetails[pair] = [];
              }
              pairingDetails[pair].push({
                show: game.name,
                date: game.date,
                sceneType: sceneType,
                sceneTitle: scene.sceneTitle || 'Untitled',
                players: playersInScene,
                scores: scene.scores
              });
            }
          }
          
          // Extract words from scene titles
          if (scene.sceneTitle) {
            const words = scene.sceneTitle.split(/\s+/).filter(w => w.length > 3);
            words.forEach(word => {
              const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
              if (cleanWord.length > 3) {
                sceneWords[cleanWord] = (sceneWords[cleanWord] || 0) + 1;
              }
            });
          }
        });
      });
    });

    // Calculate averages
    const averageScores = {};
    Object.entries(playerStats).forEach(([player, stats]) => {
      averageScores[player] = stats.sceneCount > 0 ? stats.totalScore / stats.sceneCount : 0;
    });

    // If no players found, return null
    if (Object.keys(initiationsByPlayer).length === 0) {
      return null;
    }

    return { 
      initiationsByPlayer, 
      initiationsByShowDate,
      playerStats,
      averageScores,
      playerPairings,
      pairingDetails,
      sceneWords
    };
  }, [data, excelInitiations]);

  if (!statsData) {
    return (
      <div className="stats-container">
        <div className="stats-header">
          <button className="back-button" onClick={onBack}>← Back</button>
          <h1 className="stats-title">STATS</h1>
        </div>
        <div className="stats-content">
          <div style={{ color: '#7BB3E0', textAlign: 'center', padding: '40px' }}>
            No initiation data available
          </div>
        </div>
      </div>
    );
  }

  const players = Object.keys(statsData.initiationsByPlayer).sort();
  const maxTotal = Math.max(...Object.values(statsData.initiationsByPlayer).map(p => p.total));

  // Determine which player should be highlighted (selected takes priority over hovered)
  const highlightedPlayer = selectedPlayer || hoveredPlayer;

  const handlePlayerClick = (player) => {
    // Toggle selection: if already selected, deselect; otherwise select
    setSelectedPlayer(selectedPlayer === player ? null : player);
  };

  const handlePairingClick = (player1, player2) => {
    const pair = [player1, player2].sort().join('-');
    const scenes = statsData.pairingDetails[pair] || [];
    setSelectedPairing({ player1, player2, pair });
    setPairingScenes(scenes);
  };

  const closeModal = () => {
    setSelectedPairing(null);
    setPairingScenes([]);
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1 className="stats-title">STATS</h1>
      </div>

      <div className="stats-content">
        <div className="charts-row">
          {/* Bar Chart - Initiations by Person */}
          <div className="chart-section">
            <h2 className="chart-title">Initiations by Person</h2>
            <div className="bar-chart">
            {players.map(player => {
              const playerData = statsData.initiationsByPlayer[player];
              const percentage = (playerData.total / maxTotal) * 100;
              
              return (
                <div key={player} className="bar-group">
                  <div className="bar-label">{player}</div>
                  <div className="bar-wrapper">
                    <div 
                      className="bar" 
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="bar-value">{playerData.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Line Chart - Initiations by Show Date */}
        <div className="chart-section">
          <h2 className="chart-title">Initiations Over Time</h2>
          <div className="line-chart">
            <div className="line-chart-legend">
              {players.map((player, idx) => (
                <div 
                  key={player} 
                  className={`legend-item ${selectedPlayer === player ? 'selected' : ''}`}
                  data-player-index={idx}
                  onMouseEnter={() => setHoveredPlayer(player)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  onClick={() => handlePlayerClick(player)}
                  style={{ 
                    opacity: highlightedPlayer && highlightedPlayer !== player ? 0.3 : 1,
                    cursor: 'pointer'
                  }}
                >
                  <div className="legend-color"></div>
                  <span>{player}</span>
                </div>
              ))}
            </div>
            <div className="line-chart-canvas">
              <svg viewBox="0 0 800 300" className="line-chart-svg">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <line
                    key={i}
                    x1="50"
                    y1={50 + i * 40}
                    x2="750"
                    y2={50 + i * 40}
                    stroke="rgba(91, 155, 213, 0.2)"
                    strokeWidth="1"
                  />
                ))}
                
                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                  const value = 6 - i;
                  return (
                    <text
                      key={i}
                      x="35"
                      y={50 + i * 33.33 + 5}
                      fill="#7BB3E0"
                      fontSize="12"
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  );
                })}
                
                {/* Lines for each player */}
                {players.map((player, playerIdx) => {
                  const points = statsData.initiationsByShowDate.map((show, idx) => {
                    const x = 50 + (idx * (700 / (statsData.initiationsByShowDate.length - 1)));
                    const value = show[player] || 0;
                    const y = 250 - (value * 30); // Scale: 30px per initiation
                    return `${x},${y}`;
                  }).join(' ');

                  const colors = ['#5B9BD5', '#7BB3E0', '#4A90C8', '#A0D0F0', '#6BA5D8', '#8FC5E8', '#3A7FB8', '#9DD5F0'];
                  const color = colors[playerIdx % colors.length];
                  const isSubdued = highlightedPlayer && highlightedPlayer !== player;

                  return (
                    <polyline
                      key={player}
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSubdued ? "2" : "3"}
                      opacity={isSubdued ? 0.2 : 1}
                      style={{ 
                        filter: isSubdued ? 'none' : `drop-shadow(0 0 5px ${color})`,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  );
                })}

                {/* Data points */}
                {players.map((player, playerIdx) => {
                  const colors = ['#5B9BD5', '#7BB3E0', '#4A90C8', '#A0D0F0', '#6BA5D8', '#8FC5E8', '#3A7FB8', '#9DD5F0'];
                  const color = colors[playerIdx % colors.length];
                  const isSubdued = highlightedPlayer && highlightedPlayer !== player;

                  return statsData.initiationsByShowDate.map((show, idx) => {
                    const x = 50 + (idx * (700 / (statsData.initiationsByShowDate.length - 1)));
                    const value = show[player] || 0;
                    const y = 250 - (value * 30);

                    return (
                      <circle
                        key={`${player}-${idx}`}
                        cx={x}
                        cy={y}
                        r={isSubdued ? "3" : "4"}
                        fill={color}
                        opacity={isSubdued ? 0.2 : 1}
                        style={{ 
                          filter: isSubdued ? 'none' : `drop-shadow(0 0 3px ${color})`,
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  });
                })}

                {/* X-axis labels */}
                {statsData.initiationsByShowDate.map((show, idx) => {
                  const x = 50 + (idx * (700 / (statsData.initiationsByShowDate.length - 1)));
                  return (
                    <text
                      key={idx}
                      x={x}
                      y="280"
                      fill="#7BB3E0"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {show.date}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
        </div>

        {/* Second row of charts */}
        <div className="charts-row">
          {/* Scene Type Preferences */}
          <div className="chart-section">
            <h2 className="chart-title">Scene Type Preferences</h2>
            <p className="chart-description">Distribution of scene types each player appears in most often</p>
            <div className="scene-type-grid">
              {(() => {
                // Calculate global max across all players for consistent scaling
                let globalMax = 0;
                players.forEach(player => {
                  const sceneTypes = statsData.playerStats[player]?.sceneTypes || {};
                  const playerMax = Math.max(...Object.values(sceneTypes), 0);
                  if (playerMax > globalMax) globalMax = playerMax;
                });
                
                const maxBarHeight = 100; // pixels
                
                return players.map(player => {
                  const sceneTypes = statsData.playerStats[player]?.sceneTypes || {};
                  
                  return (
                    <div key={player} className="scene-type-player">
                      <div className="scene-type-player-name">{player}</div>
                      <div className="scene-type-bars">
                        {['1A', '1B', '1C', 'D', '2A', '2B', '2C', 'E', '3A', '3B', '3C'].map(type => {
                          const count = sceneTypes[type] || 0;
                          const height = globalMax > 0 ? (count / globalMax) * maxBarHeight : 0;
                          return (
                            <div key={type} className="scene-type-bar-wrapper" title={`${type}: ${count} scenes`}>
                              <div 
                                className="scene-type-bar"
                                style={{ height: `${height}px` }}
                              />
                              <div className="scene-type-label">{type}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Player Pairings Heatmap */}
          <div className="chart-section">
            <h2 className="chart-title">Player Pairings Heatmap</h2>
            <p className="chart-description">Number of scenes each pair of players performed together. Click any cell to see all shows for that pairing.</p>
            <div className="heatmap">
              <div className="heatmap-table">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      {players.map(player => (
                        <th key={player}>{player}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player1, i) => (
                      <tr key={player1}>
                        <td className="heatmap-row-label">{player1}</td>
                        {players.map((player2, j) => {
                          if (i === j) {
                            return <td key={player2} className="heatmap-cell diagonal">—</td>;
                          }
                          const pair = [player1, player2].sort().join('-');
                          const count = statsData.playerPairings[pair] || 0;
                          const maxPairing = Math.max(...Object.values(statsData.playerPairings));
                          const intensity = count / maxPairing;
                          
                          return (
                            <td 
                              key={player2} 
                              className="heatmap-cell"
                              style={{ 
                                background: `rgba(91, 155, 213, ${intensity * 0.9})`,
                                boxShadow: intensity > 0.5 ? `0 0 10px rgba(91, 155, 213, ${intensity})` : 'none'
                              }}
                              title={`${player1} + ${player2}: ${count} scenes`}
                              onClick={() => count > 0 && handlePairingClick(player1, player2)}
                            >
                              {count > 0 ? count : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Third row - Walk-on Rate (full width) */}
        <div className="chart-section">
          <h2 className="chart-title">Walk-on Rate</h2>
          <p className="chart-description">Percentage of scenes where a player briefly joined (0.5 score) vs. being a main character</p>
          <div className="bar-chart">
            {Object.entries(statsData.playerStats)
              .map(([player, stats]) => ({
                player,
                rate: stats.sceneCount > 0 ? (stats.walkOns / stats.sceneCount) * 100 : 0
              }))
              .sort((a, b) => b.rate - a.rate)
              .map(({ player, rate }) => {
                return (
                  <div key={player} className="bar-group">
                    <div className="bar-label">{player}</div>
                    <div className="bar-wrapper">
                      <div 
                        className="bar" 
                        style={{ width: `${rate}%`, background: 'linear-gradient(to right, #5B9BD5, #A0D0F0)' }}
                      >
                        <span className="bar-value">{rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Pairing Scenes Modal */}
      {selectedPairing && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedPairing.player1} + {selectedPairing.player2}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">{pairingScenes.length} scenes together</p>
              <div className="scenes-list">
                {pairingScenes.map((scene, idx) => (
                  <div key={idx} className="scene-item">
                    <div className="scene-item-header">
                      <span className="scene-item-type">{scene.sceneType}</span>
                      <span className="scene-item-show">{scene.show}</span>
                      <span className="scene-item-date">{scene.date}</span>
                    </div>
                    <div className="scene-item-title">{scene.sceneTitle}</div>
                    <div className="scene-item-players">
                      {scene.players.map(player => (
                        <span 
                          key={player} 
                          className={`scene-item-player ${
                            player === selectedPairing.player1 || player === selectedPairing.player2 
                              ? 'highlighted' 
                              : ''
                          }`}
                        >
                          {player} ({scene.scores[player]?.value || 0})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;
