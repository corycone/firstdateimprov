// Transforms "First Date Improv Stats_complete.xlsx" into tidy CSV + JSON datasets
// for D3 visualizations. Run: node transform-stats.mjs
//
// Outputs (to src/assets/data/):
//   scenes.(json|csv)       - backbone: one row per player-per-scene-per-show (from "Shows")
//   shows.(json|csv)        - one row per show (index, title, roster, totals)
//   initiations.(json|csv)  - tidy: player x scene-slot counts (from "Initiations")
//   walkons.(json|csv)      - tidy: player x scene-slot counts (from "Walk-ons")
//   fulljoins.(json|csv)    - tidy: player x scene-slot counts (from "Full Joins")
//   hosting.(json|csv)      - chronological host / word-getter log (from "HostingWords")
//   players.(json|csv)      - roster + initials map + per-player rollups

import XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC = 'src/assets/First Date Improv Stats_complete_fixed.xlsx';
const OUT = 'src/assets/data';
mkdirSync(OUT, { recursive: true });

const wb = XLSX.readFile(SRC);
const aoa = (name) =>
  XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

// ---- initials -> first name map ----
const INITIALS = {
  CC: 'Cory', TP: 'Teresa', JM: 'Jesa', BM: 'Brendan', JH: 'Jay',
  SK: 'Sean', LT: 'Lisa', ZM: 'Zach', BT: 'Brooke', MK: 'Mindy', TM: 'Taylor',
};
const PLAYER_ORDER = ['Cory','Teresa','Jesa','Brendan','Sean','Brooke','Mindy','Taylor','Lisa','Zach','Jay'];

// Scene code -> type, per the Legend in the Shows tab.
// 1A = started scene/game, 1B = joined 2-person scene, 1C = walk-on,
// D/E (and bare even/odd numbers in early shows) = group game joiner, 2x/3x = later scenes.
// Early shows coded the two group games as numbers: the one after round 1 (e.g. "4")
// sits where "D" sits; the one after round 2 (e.g. "5") sits where "E" sits.
function sceneType(code) {
  const c = String(code).trim();
  if (/^1A/.test(c)) return 'opening';
  if (/^1B/.test(c)) return 'join-2person';
  if (/^1C/.test(c)) return 'walk-on';
  if (/^2/.test(c)) return 'second-round';
  if (/^3/.test(c)) return 'third-round';
  if (/^[DE]$/.test(c) || /^\d+$/.test(c)) return 'group-game';
  return 'other';
}
// Which "round" a scene belongs to, for grouping.
// A bare number is a group game: odd (D-position) -> round 1, even (E-position) -> round 2
// matching the D/E positions used in later shows.
function sceneRound(code) {
  const c = String(code).trim();
  if (/^1/.test(c)) return 1;
  if (/^D$/.test(c)) return 1;
  if (/^2/.test(c)) return 2;
  if (/^E$/.test(c)) return 2;
  if (/^3/.test(c)) return 3;
  if (/^\d+$/.test(c)) return Number(c) % 2 === 0 ? 1 : 2; // 4->R1(D), 5->R2(E)
  return null;
}

const isInitial = (s) => typeof s === 'string' && /^[A-Z]{2}$/.test(s);
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

// ============================================================
// 1) SHOWS  -> scenes[] (tidy) + shows[] (per-show meta)
// ============================================================
function parseShows() {
  const rows = aoa('Shows');
  const scenes = [];
  const shows = [];
  const KEYWORDS = new Set(['TOTAL', 'avg', 'Initiations', 'Legend']);
  // Map placeholder/working titles in the sheet to their real show names.
  const SHOW_TITLE_FIXES = { '10/15 Show': 'Sand' };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (const base of [0, 10]) {
      const title = row[base];
      // Collect initials header for this block.
      const header = [];
      for (let c = base + 1; c <= base + 8; c++) {
        if (isInitial(row[c])) header.push({ col: c, name: INITIALS[row[c]] || row[c], init: row[c] });
      }
      // A header row is identified primarily by having >=4 player initials in
      // the adjacent cells (a scene-code row like "1A" never does). Most show
      // titles are quoted ("Footbath") but some are not (e.g. "10/15 Show"),
      // so we no longer require the leading quote — we just exclude the known
      // keyword / summary rows and bare scene codes.
      const titleStr = typeof title === 'string' ? title.trim() : '';
      const isKeyword =
        KEYWORDS.has(titleStr) || titleStr === 'Full Joins' || titleStr === 'Walkons';
      const isSceneCode = /^[0-9]+[A-Z]?(\/[A-Z0-9]+)?$|^[DE]$/.test(titleStr);
      const looksLikeHeader =
        titleStr.length > 0 && !isKeyword && !isSceneCode && header.length >= 4;
      if (!looksLikeHeader) continue;

      const rawTitle = titleStr.replace(/^"|"$/g, '').trim();
      // Normalize placeholder titles to their real show name.
      const showTitle = SHOW_TITLE_FIXES[rawTitle] || rawTitle;
      // index number sits one row above the title in the same column
      const idxCell = rows[r - 1] ? rows[r - 1][base] : '';
      const showIndex = isNum(idxCell) ? idxCell : null;

      const perPlayerTotal = {};
      const perPlayerInit = {};
      header.forEach((h) => { perPlayerTotal[h.name] = 0; perPlayerInit[h.name] = 0; });

      // Walk scene rows until TOTAL.
      let rr = r + 1;
      for (; rr < rows.length; rr++) {
        const srow = rows[rr];
        const key = srow[base];
        if (key === 'TOTAL') break;
        if (key === 'avg' || key === '') continue;
        if (key === 'Initiations') {
          header.forEach((h) => {
            const v = srow[h.col];
            if (isNum(v)) perPlayerInit[h.name] = v;
          });
          continue;
        }
        // regular scene row
        const code = String(key).trim();
        for (const h of header) {
          const v = srow[h.col];
          if (isNum(v) && v > 0) {
            scenes.push({
              showIndex,
              showTitle,
              sceneCode: code,
              sceneType: sceneType(code),
              round: sceneRound(code),
              player: h.name,
              weight: v,
            });
            perPlayerTotal[h.name] += v;
          }
        }
      }

      shows.push({
        showIndex,
        showTitle,
        roster: header.map((h) => h.name),
        totals: perPlayerTotal,
        initiations: perPlayerInit,
      });
    }
  }

  // sort shows by index where available
  shows.sort((a, b) => (a.showIndex ?? 1e9) - (b.showIndex ?? 1e9));
  return { scenes, shows };
}

// ============================================================
// 2) MATRIX TABS: Initiations / Walk-ons / Full Joins  -> tidy
// ============================================================
function parseMatrix(sheet, slotCols) {
  // slotCols: array of {label, col} describing which columns are scene-slot counts
  const rows = aoa(sheet);
  const header = rows[0];
  const tidy = [];
  const summary = [];

  for (let r = 1; r < rows.length; r++) {
    const name = rows[r][0];
    if (typeof name !== 'string') continue;
    if (!PLAYER_ORDER.includes(name)) continue; // skip "Total", date notes, blanks

    const rec = { player: name };
    for (const [label, col] of slotCols) {
      const v = rows[r][col];
      const n = isNum(v) ? v : 0;
      rec[label] = n;
      tidy.push({ player: name, slot: label, count: n });
    }
    summary.push(rec);
  }
  summary.sort((a, b) => PLAYER_ORDER.indexOf(a.player) - PLAYER_ORDER.indexOf(b.player));
  return { tidy, summary, header };
}

// Column maps (0-indexed) from the inspected layouts.
const INIT_SLOTS = [
  ['1A',1],['1B',2],['1C',3],['D',4],['2A',5],['2B',6],['2C',7],['E',8],['3s',9],
];
const WO_SLOTS = [
  ['1A',1],['1B',2],['1C',3],['2A',4],['2B',5],['2C',6],['3s',7],
];
const FJ_SLOTS = WO_SLOTS;

// ============================================================
// 3) HOSTINGWORDS -> chronological log + summary
// ============================================================
function excelDateToISO(serial) {
  if (!isNum(serial)) return null;
  // Excel serial (1900 date system). 25569 = days between 1899-12-30 and 1970-01-01.
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}
function cleanHost(raw) {
  if (typeof raw !== 'string') return { name: null, guest: false, note: null };
  const s = raw.trim();
  const guest = /^\{.*\}$/.test(s);
  let name = s.replace(/[{}]/g, '').trim();
  let note = null;
  const paren = name.match(/\((.*?)\)/);
  if (paren) { note = paren[1]; name = name.replace(/\(.*?\)/, '').trim(); }
  return { name, guest, note };
}
function parseHosting() {
  const rows = aoa('HostingWords');
  const log = [];
  const summary = [];
  // log: cols A(date) B(host) C(hostCount) D(wordGetter) E(getCount)
  for (let r = 1; r < rows.length; r++) {
    const dateSerial = rows[r][0];
    if (!isNum(dateSerial)) continue;
    const host = cleanHost(rows[r][1]);
    const wordRaw = rows[r][3];
    const word = typeof wordRaw === 'string' ? wordRaw.trim() : '';
    log.push({
      date: excelDateToISO(dateSerial),
      host: host.name,
      hostGuest: host.guest,
      hostNote: host.note,
      wordGetter: word === '?' || word === '' ? null : word,
    });
  }
  // summary: cols G(name) H(hosts) I(gets)  -> indexes 6,7,8
  for (let r = 1; r < rows.length; r++) {
    const name = rows[r][6];
    if (typeof name !== 'string' || !PLAYER_ORDER.includes(name)) continue;
    summary.push({
      player: name,
      hosts: isNum(rows[r][7]) ? rows[r][7] : 0,
      gets: isNum(rows[r][8]) ? rows[r][8] : 0,
    });
  }
  summary.sort((a, b) => PLAYER_ORDER.indexOf(a.player) - PLAYER_ORDER.indexOf(b.player));
  return { log, summary };
}

// ============================================================
// CSV helper
// ============================================================
function toCSV(records, columns) {
  const cols = columns || Object.keys(records[0] || {});
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const rec of records) lines.push(cols.map((c) => esc(rec[c])).join(','));
  return lines.join('\n') + '\n';
}
function write(name, records, columns) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(records, null, 2));
  writeFileSync(join(OUT, `${name}.csv`), toCSV(records, columns));
  console.log(`wrote ${name}: ${records.length} rows`);
}

// ============================================================
// RUN
// ============================================================
const { scenes, shows } = parseShows();
write('scenes', scenes, ['showIndex','showTitle','sceneCode','sceneType','round','player','weight']);

// flatten shows for CSV (totals/initiations are nested objects -> expand per player not ideal;
// store roster as pipe-joined and keep totals in JSON only; CSV gets a compact view)
const showsFlat = shows.map((s) => ({
  showIndex: s.showIndex,
  showTitle: s.showTitle,
  rosterSize: s.roster.length,
  roster: s.roster.join('|'),
  showTotal: Object.values(s.totals).reduce((a, b) => a + b, 0),
}));
writeFileSync(join(OUT, 'shows.json'), JSON.stringify(shows, null, 2));
writeFileSync(join(OUT, 'shows.csv'), toCSV(showsFlat, ['showIndex','showTitle','rosterSize','roster','showTotal']));
console.log(`wrote shows: ${shows.length} rows`);

const init = parseMatrix('Initiations', INIT_SLOTS);
write('initiations', init.tidy, ['player','slot','count']);
writeFileSync(join(OUT, 'initiations.summary.json'), JSON.stringify(init.summary, null, 2));

const wo = parseMatrix('Walk-ons', WO_SLOTS);
write('walkons', wo.tidy, ['player','slot','count']);
writeFileSync(join(OUT, 'walkons.summary.json'), JSON.stringify(wo.summary, null, 2));

const fj = parseMatrix('Full Joins', FJ_SLOTS);
write('fulljoins', fj.tidy, ['player','slot','count']);
writeFileSync(join(OUT, 'fulljoins.summary.json'), JSON.stringify(fj.summary, null, 2));

const hosting = parseHosting();
write('hosting', hosting.log, ['date','host','hostGuest','hostNote','wordGetter']);
writeFileSync(join(OUT, 'hosting.summary.json'), JSON.stringify(hosting.summary, null, 2));

// ============================================================
// players.json : roster + initials map + rollups derived from scenes
// ============================================================
const bySlotCount = (tidy) => {
  const m = {};
  for (const t of tidy) m[t.player] = (m[t.player] || 0) + t.count;
  return m;
};
const initTot = bySlotCount(init.tidy);
const woTot = bySlotCount(wo.tidy);
const fjTot = bySlotCount(fj.tidy);
const hostMap = Object.fromEntries(hosting.summary.map((h) => [h.player, h]));

// shows appeared in (from scenes backbone)
const showsAppeared = {};
for (const s of scenes) {
  showsAppeared[s.player] = showsAppeared[s.player] || new Set();
  showsAppeared[s.player].add(s.showTitle + '#' + s.showIndex);
}

const initialByName = Object.fromEntries(Object.entries(INITIALS).map(([i, n]) => [n, i]));
const players = PLAYER_ORDER.map((name) => ({
  name,
  initials: initialByName[name] || null,
  showsAppeared: showsAppeared[name] ? showsAppeared[name].size : 0,
  totalInitiations: initTot[name] || 0,
  totalWalkons: woTot[name] || 0,
  totalFullJoins: fjTot[name] || 0,
  hosts: hostMap[name] ? hostMap[name].hosts : 0,
  gets: hostMap[name] ? hostMap[name].gets : 0,
}));
write('players', players, ['name','initials','showsAppeared','totalInitiations','totalWalkons','totalFullJoins','hosts','gets']);

console.log('\nDone. Output in', OUT);
