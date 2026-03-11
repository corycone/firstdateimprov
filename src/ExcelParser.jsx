import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Timeline from './Timeline';

function ExcelParser() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sceneMetadata, setSceneMetadata] = useState(null);

  useEffect(() => {
    const parseExcel = async () => {
      try {
        // Load scene metadata CSV
        const metadataResponse = await fetch('/src/assets/sets/scene-metadata.csv');
        const metadataText = await metadataResponse.text();
        const metadata = parseSceneMetadata(metadataText);
        setSceneMetadata(metadata);
        
        // Import the xlsx file
        const response = await fetch('/src/assets/First Date Improv Stats.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse the workbook
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the "First Date" sheet
        const sheetName = 'First Date';
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error(`Sheet "${sheetName}" not found`);
        }
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Parse the structured data
        const parsedData = parseImprovData(jsonData, metadata);
        
        setData(parsedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error('Error parsing Excel:', err);
      }
    };

    parseExcel();
  }, []);

  const parseSceneMetadata = (csvText) => {
    const lines = csvText.trim().split('\n');
    const metadata = {};
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV line (handle commas in quoted fields)
      const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 5) continue;
      
      const dateStr = parts[0].replace(/"/g, '').trim();
      const title = parts[1].replace(/"/g, '').trim();
      const scene = parts[2].replace(/"/g, '').trim();
      const sceneTitle = parts[3].replace(/"/g, '').trim();
      const players = parts[4].replace(/"/g, '').trim();
      
      // Parse date to extract M/D format (strip year if present)
      let date = dateStr;
      if (dateStr.includes('/')) {
        const dateParts = dateStr.split('/');
        // If format is M/D/YYYY, convert to M/D
        if (dateParts.length === 3) {
          date = `${dateParts[0]}/${dateParts[1]}`;
        }
      }
      
      // Create lookup key with normalized values (uppercase, no extra spaces)
      const normalizedDate = date.toUpperCase();
      const normalizedTitle = title.toUpperCase();
      const normalizedScene = scene.toUpperCase();
      const key = `${normalizedDate}-${normalizedTitle}-${normalizedScene}`;
      
      metadata[key] = {
        date,
        title,
        scene,
        sceneTitle,
        players: players ? players.split('+').map(p => p.trim()) : []
      };
    }
    
    console.log('📊 Loaded scene metadata:', Object.keys(metadata).length, 'entries');
    console.log('📋 Sample metadata keys:', Object.keys(metadata).slice(0, 5));
    
    return metadata;
  };

  const parseImprovData = (rawData, metadata = {}) => {
    const games = [];
    const legend = {
      1: 'Started Scene/game',
      1: 'Joined 2-person scene',
      0.5: 'Walk-on',
      0.25: 'Group Game Joiner'
    };
    
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
    
    // Helper to convert date string to sortable Date object
    const parseShowDate = (dateStr) => {
      if (!dateStr) return null;
      const [month, day] = dateStr.split('/').map(Number);
      // Nov (11) and Dec (12) are 2025, Jan (1) forward are 2026
      const year = (month >= 11) ? 2025 : 2026;
      return new Date(year, month - 1, day);
    };
    
    let currentGame = null;
    
    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      if (!row || row.length === 0) continue;
      
      const firstCell = String(row[0] || '').trim();
      
      // Skip Legend rows
      if (firstCell === 'Legend' || firstCell.toLowerCase().includes('legend')) {
        continue;
      }
      
      // Check if this is a game title row (starts with a quoted game name)
      if (firstCell.startsWith('"') && firstCell.endsWith('"')) {
        // Save previous game if exists
        if (currentGame) {
          console.log(`✅ Saved game: ${currentGame.name}`);
          games.push(currentGame);
        }
        
        // Start new game
        const gameName = firstCell.replace(/"/g, '');
        
        console.log(`🎮 Found potential game: "${gameName}"`);
        
        // Skip if this is "Legend"
        if (gameName.toLowerCase() === 'legend') {
          console.log(`⏭️ Skipping Legend`);
          currentGame = null;
          continue;
        }
        
        // Try to find date from metadata by matching game title
        let gameDate = null;
        if (metadata) {
          const normalizedGameName = gameName.toUpperCase().trim();
          console.log(`🔍 Looking for date for game: "${gameName}" (normalized: "${normalizedGameName}")`);
          
          // Look through metadata to find a matching title
          for (const [key, value] of Object.entries(metadata)) {
            const normalizedMetadataTitle = value.title.toUpperCase();
            // Check for exact match or if one is a substring of the other (for truncated names)
            // Special handling for very long names that get truncated with "..."
            const isSubstringMatch = normalizedMetadataTitle.startsWith(normalizedGameName.replace('...', '')) ||
                                    normalizedGameName.replace('...', '').startsWith(normalizedMetadataTitle.substring(0, 10));
            
            if (normalizedMetadataTitle === normalizedGameName || 
                normalizedMetadataTitle.startsWith(normalizedGameName) ||
                normalizedGameName.startsWith(normalizedMetadataTitle) ||
                isSubstringMatch) {
              gameDate = value.date;
              console.log(`📅 Found date for "${gameName}" from metadata: ${gameDate} (matched with "${value.title}")`);
              break;
            }
          }
        }
        
        if (!gameDate) {
          console.log(`⚠️ No date found in metadata for "${gameName}"`);
        }
        
        // Only take players until we hit another quoted string or empty cells
        const players = [];
        for (let j = 1; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (!cell || cell.startsWith('"')) break;
          players.push({
            initials: cell,
            name: playerNames[cell] || cell
          });
        }
        
        currentGame = {
          name: gameName,
          players: players,
          scores: {},
          totals: {},
          initiations: {},
          date: gameDate, // Store the date from metadata
          metadata: {} // Will store scene metadata
        };
        continue;
      }
      
      // Skip if no current game (we're in legend or between games)
      if (!currentGame) continue;
      
      // Check for TOTAL row
      if (firstCell === 'TOTAL') {
        row.slice(1).forEach((score, idx) => {
          if (score !== undefined && score !== '') {
            const player = currentGame.players[idx];
            if (player) {
              currentGame.totals[player.name] = parseFloat(score) || 0;
            }
          }
        });
        continue;
      }
      
      // Check for Initiations row
      if (firstCell === 'Initiations') {
        row.slice(1).forEach((count, idx) => {
          if (count !== undefined && count !== '') {
            const player = currentGame.players[idx];
            if (player) {
              currentGame.initiations[player.name] = parseInt(count) || 0;
            }
          }
        });
        continue;
      }
      
      // Skip avg rows
      if (firstCell.startsWith('avg')) {
        continue;
      }
      
      // Regular score row
      if (firstCell) {
        const sceneType = firstCell;
        const scores = {};
        
        row.slice(1).forEach((score, idx) => {
          if (score !== undefined && score !== '') {
            const player = currentGame.players[idx];
            if (player) {
              const scoreValue = parseFloat(score) || 0;
              scores[player.name] = {
                value: scoreValue,
                role: getRoleFromScore(scoreValue)
              };
            }
          }
        });
        
        if (Object.keys(scores).length > 0) {
          if (!currentGame.scores[sceneType]) {
            currentGame.scores[sceneType] = [];
          }
          
          // Try to find metadata for this scene
          let sceneMetadataEntry = null;
          if (currentGame.date && metadata) {
            // Normalize the lookup key (uppercase, trim spaces)
            const normalizedDate = currentGame.date.toUpperCase().trim();
            const normalizedTitle = currentGame.name.toUpperCase().trim();
            const normalizedScene = sceneType.toUpperCase().trim();
            const metadataKey = `${normalizedDate}-${normalizedTitle}-${normalizedScene}`;
            sceneMetadataEntry = metadata[metadataKey];
            
            if (sceneMetadataEntry) {
              console.log(`✅ Matched scene: ${metadataKey}`);
            } else {
              console.log(`❌ No match for: ${metadataKey}`);
            }
          } else if (!currentGame.date) {
            console.log(`⚠️ No date for game "${currentGame.name}", scene "${sceneType}"`);
          }
          
          currentGame.scores[sceneType].push({
            scores,
            sceneTitle: sceneMetadataEntry?.sceneTitle || null,
            players: sceneMetadataEntry?.players || []
          });
        }
      }
    }
    
    // Add the last game
    if (currentGame) {
      games.push(currentGame);
    }
    
    // Sort games chronologically by date
    games.sort((a, b) => {
      const dateA = parseShowDate(a.date);
      const dateB = parseShowDate(b.date);
      
      // Put shows without dates at the end
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA - dateB;
    });
    
    console.log(`🎭 Total games parsed: ${games.length}`);
    console.log('📋 Game names:', games.map(g => `${g.name} (${g.date || 'no date'})`));
    
    return { games, legend, playerNames };
  };
  
  const getRoleFromScore = (score) => {
    if (score === 1) return 'Started Scene/game or Joined 2-person scene';
    if (score === 0.5) return 'Walk-on';
    if (score === 0.25) return 'Group Game Joiner';
    if (score === 0.3 || score === 0.33) return 'Group participation';
    return 'Other';
  };

  if (loading) return <div>Loading Excel data...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return <Timeline data={data} />;
}

export default ExcelParser;
