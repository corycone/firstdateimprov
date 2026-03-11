// Script to extract initiation data from Excel and update master-data.csv
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

async function updateInitiations() {
  // Read the Excel file
  const excelBuffer = readFileSync('./src/assets/First Date Improv Stats.xlsx');
  const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
  const worksheet = workbook.Sheets['First Date'];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

  // Parse Excel to extract initiations by show and scene
  const initiationsByShow = {};
  let currentGame = null;
  let currentPlayers = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
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

      initiationsByShow[currentGame] = {};
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
            initiationsByShow[currentGame][player] = initiationCount;
          }
        }
      });
      continue;
    }
  }

  console.log('Extracted initiations from Excel:');
  console.log(JSON.stringify(initiationsByShow, null, 2));

  // Read master-data.csv
  const csvText = readFileSync('./src/assets/master-data.csv', 'utf-8');
  const lines = csvText.trim().split('\n');
  
  // Parse CSV with proper quote handling
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
  const titleIdx = headers.indexOf('ShowTitle');
  
  // Add InitiatedBy column if it doesn't exist
  let initiatedByIdx = headers.indexOf('InitiatedBy');
  if (initiatedByIdx === -1) {
    headers.push('InitiatedBy');
    initiatedByIdx = headers.length - 1;
  }

  const updatedLines = [headers.join(',')];

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const showTitle = cells[titleIdx];
    
    // For now, leave InitiatedBy empty - we need scene-level data
    if (cells.length < headers.length) {
      cells.push(''); // Add empty InitiatedBy column
    }
    
    updatedLines.push(cells.join(','));
  }

  // Write updated CSV
  writeFileSync('./src/assets/master-data-updated.csv', updatedLines.join('\n'));
  
  console.log('\nUpdated CSV written to master-data-updated.csv');
  console.log('\nNote: The Excel file has show-level initiation totals, but the CSV needs scene-level data.');
  console.log('You need to manually determine which scene each initiation belongs to.');
}

updateInitiations().catch(console.error);
