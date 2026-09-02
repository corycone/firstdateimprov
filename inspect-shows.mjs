import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const wb = XLSX.read(readFileSync('./src/assets/First Date Improv Stats.xlsx'), { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Shows'], { header: 1, blankrows: true });

const INITIALS = { CC:'Cory',TP:'Teresa',JM:'Jesa',BM:'Brendan',JH:'Jay',SK:'Sean',LT:'Lisa',ZM:'Zach',BT:'Brooke',MK:'Mindy',TM:'Taylor' };
const stop = new Set(['TOTAL','AVG','INITIATIONS','LEGEND']);

function normalizeScene(raw){const s=String(raw??'').trim(); if(s==='4')return 'D'; if(s==='5')return 'E'; return s;}

function parseShowsSheet(rows){
  const shows={}; const titleRows=[];
  rows.forEach((r,i)=>{const L=String(r?.[0]??'');const R=String(r?.[10]??''); if(L.startsWith('"')||R.startsWith('"'))titleRows.push(i);});
  const parseBlock=(hr,cs)=>{
    const header=rows[hr]; const title=String(header[cs]??'').replace(/"/g,'').trim();
    if(!title||title.toLowerCase()==='legend')return;
    const scenes=[];
    for(let i=hr+1;i<rows.length;i++){const row=rows[i]||[];const first=String(row[cs]??'').trim();
      if(!first)break; const up=first.toUpperCase().replace(/\s+/g,''); if(stop.has(up)||up.startsWith('AVG'))break;
      scenes.push(normalizeScene(first));}
    shows[title.toUpperCase()]={title,scenes};
  };
  for(const hr of titleRows){parseBlock(hr,0);parseBlock(hr,10);}
  return shows;
}
const shows=parseShowsSheet(rows);
for(const [k,v] of Object.entries(shows)) console.log(`${v.title} (${v.scenes.length}): ${v.scenes.join(', ')}`);
