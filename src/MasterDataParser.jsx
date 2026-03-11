import { useState, useEffect } from 'react';
import Timeline from './Timeline';

function MasterDataParser() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/src/assets/master-data.csv');
      const csvText = await response.text();
      const parsedData = parseMasterData(csvText);
      setData(parsedData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error parsing master data:', err);
    }
  };

  const parseMasterData = (csvText) => {
    const lines = csvText.trim().split('\n');
    
    // Parse CSV line handling quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);
    
    // Find column indices
    const dateIdx = headers.indexOf('ShowDate');
    const titleIdx = headers.indexOf('ShowTitle');
    const sceneIdx = headers.indexOf('Scene');
    const sceneTitleIdx = headers.indexOf('SceneTitle');
    const playersIdx = headers.indexOf('Players');
    const initiationsIdx = headers.indexOf('Initiations');
    
    console.log('Column indices:', { dateIdx, titleIdx, sceneIdx, sceneTitleIdx, playersIdx, initiationsIdx });
    
    // Player columns
    const playerColumns = ['Cory', 'Teresa', 'Jesa', 'Brendan', 'Jay', 'Sean', 'Lisa', 'Zach'];
    const playerIndices = playerColumns.map(name => headers.indexOf(name));
    
    const showsMap = {};
    
    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const cells = parseCSVLine(line);
      
      const showDate = cells[dateIdx];
      const showTitle = cells[titleIdx];
      const scene = cells[sceneIdx];
      const sceneTitle = cells[sceneTitleIdx];
      const players = cells[playersIdx];
      const initiations = cells[initiationsIdx];
      
      // Create show key
      const showKey = `${showDate}-${showTitle}`;
      
      if (!showsMap[showKey]) {
        showsMap[showKey] = {
          name: showTitle,
          date: showDate,
          players: [],
          scores: {},
          totals: {},
          initiations: {}
        };
      }
      
      const show = showsMap[showKey];
      
      // Parse scores for this scene
      const sceneScores = {};
      playerColumns.forEach((playerName, idx) => {
        const scoreValue = parseFloat(cells[playerIndices[idx]]);
        if (!isNaN(scoreValue) && scoreValue > 0) {
          sceneScores[playerName] = {
            value: scoreValue,
            role: getRoleFromScore(scoreValue)
          };
          
          // Add to totals
          if (!show.totals[playerName]) {
            show.totals[playerName] = 0;
          }
          show.totals[playerName] += scoreValue;
        }
      });
      
      // Add scene to show
      if (!show.scores[scene]) {
        show.scores[scene] = [];
      }
      
      show.scores[scene].push({
        scores: sceneScores,
        sceneTitle: sceneTitle || null,
        players: Object.keys(sceneScores) // Always derive from scores
      });
      
      // Parse initiations - use the totals from the show
      // Don't parse from CSV, we'll use Excel data instead
      // (keeping this for reference but not using it)
    }
    
    // Convert to array and add player list
    const games = Object.values(showsMap).map(show => {
      // Get unique players from totals
      const playerNames = Object.keys(show.totals);
      show.players = playerNames.map(name => ({
        initials: getInitials(name),
        name: name
      }));
      
      return show;
    });
    
    // Sort by date
    games.sort((a, b) => {
      const dateA = parseShowDate(a.date);
      const dateB = parseShowDate(b.date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });
    
    console.log(`🎭 Loaded ${games.length} shows from master data`);
    console.log('Shows:', games.map(g => `${g.name} (${g.date}) - ${g.players.length} players`));
    
    return { games, playerNames: playerColumns };
  };
  
  const parseShowDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
    return null;
  };
  
  const getRoleFromScore = (score) => {
    if (score === 1) return 'Started Scene/game or Joined 2-person scene';
    if (score === 0.5) return 'Walk-on';
    if (score === 0.25) return 'Group Game Joiner';
    if (score === 0.3 || score === 0.33) return 'Group participation';
    return 'Other';
  };
  
  const getInitials = (name) => {
    const initialsMap = {
      'Cory': 'CC',
      'Teresa': 'TP',
      'Jesa': 'JM',
      'Brendan': 'BM',
      'Jay': 'JH',
      'Sean': 'SK',
      'Lisa': 'LT',
      'Zach': 'ZM'
    };
    return initialsMap[name] || name.substring(0, 2).toUpperCase();
  };

  if (loading) return <div style={{ color: '#00ff41', padding: '20px' }}>Loading data...</div>;
  if (error) return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;

  return <Timeline data={data} />;
}

export default MasterDataParser;
