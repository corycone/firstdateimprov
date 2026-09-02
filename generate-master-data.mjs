// Generator: rebuild master-data.csv from "First Date Improv Stats.xlsx"
// Strategy (Option A - merge):
//  - Parse the Shows sheet block-by-block (two shows per row block: cols 0-9 and 10-19).
//  - Each block's header row maps player initials -> column, so player columns are read per-block.
//  - For shows already present in the existing CSV, keep ShowDate/SceneTitle/Players/Initiations,
//    overwrite the numeric player scores per scene (matched by ShowTitle+Scene).
//  - For new shows, append rows with scores; derive Players from scores>0; infer ShowDate on a
//    biweekly-Thursday cadence continuing from the last known dated show; leave SceneTitle/Initiations blank.
//
// Players (final set incl. new): Cory, Teresa, Jesa, Brendan, Jay, Sean, Lisa, Zach, Brooke, Mindy, Taylor
// Run: node generate-master-data.mjs

import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const XLSX_PATH = './src/assets/First Date Improv Stats.xlsx';
const CSV_PATH = './src/assets/master-data.csv';
const OUT_PATH = './src/assets/master-data.csv';

// Initials -> full player name
const INITIALS = {
  CC: 'Cory', TP: 'Teresa', JM: 'Jesa', BM: 'Brendan', JH: 'Jay',
  SK: 'Sean', LT: 'Lisa', ZM: 'Zach', BT: 'Brooke', MK: 'Mindy', TM: 'Taylor',
};

// Column order for output CSV (score columns)
const PLAYER_ORDER = ['Cory', 'Teresa', 'Jesa', 'Brendan', 'Jay', 'Sean', 'Lisa', 'Zach', 'Brooke', 'Mindy', 'Taylor'];

const HEADER = ['ShowDate', 'ShowTitle', 'Scene', 'SceneTitle', 'Players', ...PLAYER_ORDER, 'Initiations'];

// ---- CSV parsing (quote-aware) ----
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function csvField(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---- Normalize scene label (numeric 4->D, 5->E used in older blocks) ----
function normalizeScene(raw) {
  const s = String(raw ?? '').trim();
  if (s === '4') return 'D';
  if (s === '5') return 'E';
  return s;
}

// ---- Parse the Shows sheet into { SHOWTITLE: { order, scenes: [{scene, scores:{name:val}}] } } ----
function parseShowsSheet(rows) {
  const shows = {};
  const blockTitleRows = [];
  rows.forEach((r, i) => {
    const L = String(r?.[0] ?? '');
    const R = String(r?.[10] ?? '');
    if (L.startsWith('"') || R.startsWith('"')) blockTitleRows.push(i);
  });

  const stopLabels = new Set(['TOTAL', 'AVG', 'INITIATIONS', 'LEGEND']);

  const parseBlock = (headerRow, colStart, startRow) => {
    const header = rows[headerRow];
    const title = String(header[colStart] ?? '').replace(/"/g, '').trim();
    if (!title || title.toLowerCase() === 'legend') return;

    // Map columns -> player name using initials in the header
    const colPlayers = []; // [{col, name}]
    for (let c = colStart + 1; c < colStart + 9; c++) {
      const init = String(header[c] ?? '').trim();
      if (!init) continue;
      const name = INITIALS[init];
      if (name) colPlayers.push({ col: c, name });
    }

    const scenes = [];
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      const first = String(row[colStart] ?? '').trim();
      // Blank first cell -> end of this block's scene list (next section/blank)
      if (!first) break;
      const upper = first.toUpperCase().replace(/\s+/g, '');
      if (stopLabels.has(upper) || upper.startsWith('AVG')) break;

      const scene = normalizeScene(first);
      const scores = {};
      for (const { col, name } of colPlayers) {
        const v = row[col];
        if (v !== undefined && v !== null && v !== '') {
          const num = parseFloat(v);
          if (!isNaN(num)) scores[name] = num;
        }
      }
      scenes.push({ scene, scores });
    }

    shows[title.toUpperCase()] = { title, scenes };
  };

  for (const hr of blockTitleRows) {
    parseBlock(hr, 0, hr + 1);   // left block
    parseBlock(hr, 10, hr + 1);  // right block
  }
  return shows;
}

// Fuzzy-match an existing CSV show title (upper) to an xlsx show key (upper),
// handling xlsx truncation like "SUPERCALIFRAG...".
function findXlsxKey(existingUpper, xlsxShows) {
  if (xlsxShows[existingUpper]) return existingUpper;
  for (const key of Object.keys(xlsxShows)) {
    const stripped = key.replace(/\.+$/, ''); // remove trailing dots
    if (stripped.length >= 5 && existingUpper.startsWith(stripped)) return key;
    if (key.length >= 5 && stripped.length >= 5 && stripped.startsWith(existingUpper)) return key;
  }
  return null;
}

// ---- Derive Players string from scores ----
function playersFromScores(scores) {
  return PLAYER_ORDER.filter(p => (scores[p] ?? 0) > 0).join('+');
}

// ---- Biweekly-Thursday date inference ----
function parseDate(str) {
  const [m, d, y] = str.split('/').map(Number);
  return new Date(y, m - 1, d);
}
function fmtDate(dt) {
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
}

// ================= MAIN =================
const wb = XLSX.read(readFileSync(XLSX_PATH), { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Shows'], { header: 1, blankrows: true });
const xlsxShows = parseShowsSheet(rows);

// Read existing CSV, preserve metadata
const csvText = readFileSync(CSV_PATH, 'utf-8');
const lines = csvText.trim().split(/\r?\n/);
const oldHeader = parseCSVLine(lines[0]);
const idx = (name) => oldHeader.indexOf(name);
const iDate = idx('ShowDate'), iTitle = idx('ShowTitle'), iScene = idx('Scene'),
  iSceneTitle = idx('SceneTitle'), iPlayers = idx('Players'), iInit = idx('Initiations');

// Existing rows grouped by show (in original order), keyed by scene for score merge
const existingOrder = []; // show titles (upper) in order of first appearance
const existingByShow = {}; // upper -> { date, title, rows: [...] }
// Old CSV score columns (original 8 players; new players didn't exist yet)
const OLD_PLAYER_COLS = ['Cory', 'Teresa', 'Jesa', 'Brendan', 'Jay', 'Sean', 'Lisa', 'Zach'];
const oldScoreIdx = OLD_PLAYER_COLS.map(p => idx(p));
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const c = parseCSVLine(lines[i]);
  const titleUpper = (c[iTitle] || '').toUpperCase();
  if (!existingByShow[titleUpper]) {
    existingByShow[titleUpper] = { date: c[iDate] || '', title: c[iTitle] || '', rows: [] };
    existingOrder.push(titleUpper);
  }
  // Original scores mapped into the new PLAYER_ORDER (new players -> '0')
  const oldScores = {};
  OLD_PLAYER_COLS.forEach((p, k) => { oldScores[p] = c[oldScoreIdx[k]] || '0'; });
  const origScores = PLAYER_ORDER.map(p => oldScores[p] ?? '0');
  existingByShow[titleUpper].rows.push({
    scene: c[iScene] || '',
    sceneTitle: c[iSceneTitle] || '',
    players: c[iPlayers] || '',
    initiations: c[iInit] || '',
    origScores,
  });
}

// xlsx show order (as blocks are laid out) for appending new shows
const xlsxOrder = [];
{
  const seen = new Set();
  const blockTitleRows = [];
  rows.forEach((r, i) => {
    const L = String(r?.[0] ?? ''); const R = String(r?.[10] ?? '');
    if (L.startsWith('"') || R.startsWith('"')) blockTitleRows.push(i);
  });
  for (const hr of blockTitleRows) {
    for (const cs of [0, 10]) {
      const t = String(rows[hr][cs] ?? '').replace(/"/g, '').trim();
      if (t && t.toLowerCase() !== 'legend' && !seen.has(t.toUpperCase())) {
        seen.add(t.toUpperCase());
        xlsxOrder.push(t.toUpperCase());
      }
    }
  }
}

// Build output rows
const outRows = [];
const warnings = [];
const matchedXlsxKeys = new Set(); // xlsx keys consumed by existing-show merges

// 1) Existing shows: preserve metadata (date/scene/sceneTitle/players/initiations),
//    refresh scores by POSITIONAL scene match against the xlsx block.
for (const showUpper of existingOrder) {
  const ex = existingByShow[showUpper];
  const xlsxKey = findXlsxKey(showUpper, xlsxShows);
  if (!xlsxKey) {
    warnings.push(`Existing show not found in xlsx: ${showUpper} (kept existing scores)`);
  } else {
    matchedXlsxKeys.add(xlsxKey);
    const xScenes = xlsxShows[xlsxKey].scenes;
    if (xScenes.length !== ex.rows.length) {
      warnings.push(`Scene count differs for ${showUpper}: CSV=${ex.rows.length} xlsx=${xScenes.length} (matched positionally)`);
    }
  }
  ex.rows.forEach((r, pos) => {
    let scores = {};
    if (xlsxKey) {
      const xs = xlsxShows[xlsxKey].scenes[pos];
      if (xs) scores = xs.scores;
    }
    // If no xlsx scores for this position, keep existing? xlsx is source of truth for scores,
    // so absence means zeroed. But if the show wasn't in xlsx at all, retain original scores.
    let scoreCells;
    if (!xlsxKey) {
      // retain original numeric scores from the old CSV row
      scoreCells = r.origScores;
    } else {
      scoreCells = PLAYER_ORDER.map(p => {
        const v = scores[p];
        return (v === undefined || v === 0) ? '0' : String(v);
      });
    }
    outRows.push([ex.date, ex.title, r.scene, r.sceneTitle, r.players, ...scoreCells, r.initiations]);
  });
  // If the xlsx has MORE scenes than the CSV for this show, append the extras
  // (new scenes not yet in the hand-authored CSV) with derived Players, blank title/initiations.
  if (xlsxKey) {
    const xScenes = xlsxShows[xlsxKey].scenes;
    for (let pos = ex.rows.length; pos < xScenes.length; pos++) {
      const xs = xScenes[pos];
      const scoreCells = PLAYER_ORDER.map(p => {
        const v = xs.scores[p];
        return (v === undefined || v === 0) ? '0' : String(v);
      });
      outRows.push([ex.date, ex.title, xs.scene, '', playersFromScores(xs.scores), ...scoreCells, '']);
      warnings.push(`Appended extra xlsx scene for ${showUpper}: "${xs.scene}" (no CSV metadata yet)`);
    }
  }
}

// 2) New shows: append with inferred dates
// Find last dated existing show date
let lastDate = null;
for (const showUpper of existingOrder) {
  const d = existingByShow[showUpper].date;
  if (d) { const dt = parseDate(d); if (!lastDate || dt > lastDate) lastDate = dt; }
}

const newShows = xlsxOrder.filter(s => !existingByShow[s] && !matchedXlsxKeys.has(s));
let cursor = lastDate ? new Date(lastDate) : null;
for (const showUpper of newShows) {
  if (cursor) cursor = new Date(cursor.getTime() + 14 * 24 * 3600 * 1000);
  const dateStr = cursor ? fmtDate(cursor) : '';
  const show = xlsxShows[showUpper];
  for (const sc of show.scenes) {
    const players = playersFromScores(sc.scores);
    const scoreCells = PLAYER_ORDER.map(p => {
      const v = sc.scores[p];
      return (v === undefined || v === 0) ? '0' : String(v);
    });
    outRows.push([dateStr, show.title, sc.scene, '', players, ...scoreCells, '']);
  }
}

// Write CSV
const outLines = [HEADER.join(',')];
for (const row of outRows) outLines.push(row.map(csvField).join(','));
writeFileSync(OUT_PATH, outLines.join('\n') + '\n');

console.log(`Wrote ${outRows.length} scene rows across ${existingOrder.length + newShows.length} shows.`);
console.log(`Existing shows merged: ${existingOrder.length}`);
console.log(`New shows appended: ${newShows.length} -> ${newShows.join(', ')}`);
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log('  - ' + w));
}
