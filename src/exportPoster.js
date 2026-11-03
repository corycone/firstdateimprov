// Build a self-contained poster SVG of the mandala in its current filtered
// state (including the center readout as real SVG text), then rasterize it to a
// PNG download. Kept dependency-free: serialize SVG -> <img> -> <canvas> -> blob.

import { PLAYER_COLORS } from './palette.js';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Center readout as SVG <text>, mirroring the HTML .mc-* layout, centered on
// (cx, cy). `sel` describes the active filter. Returns an SVG string.
function centerSVG(sel, cx, cy, ink, muted, amber) {
  const t = (y, size, fill, weight, text, spacing = 0, anchor = 'middle') =>
    `<text x="${cx}" y="${cy + y}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${
      spacing ? ` letter-spacing="${spacing}"` : ''
    }>${esc(text)}</text>`;

  // a row of number-over-label stats centered on cx
  const statsRow = (stats, y) => {
    const gap = 92;
    const totalW = (stats.length - 1) * gap;
    const startX = cx - totalW / 2;
    return stats
      .map(([label, val], i) => {
        const x = startX + i * gap;
        return (
          `<text x="${x}" y="${y}" fill="${ink}" font-size="30" font-weight="bold" text-anchor="middle">${esc(
            val ?? 0
          )}</text>` +
          `<text x="${x}" y="${y + 22}" fill="${muted}" font-size="13" letter-spacing="1.5" text-anchor="middle">${esc(
            String(label).toUpperCase()
          )}</text>`
        );
      })
      .join('');
  };

  if (sel.kind === 'segment') {
    const s = sel.data;
    return [
      t(-26, 15, muted, 'normal', s.showTitle.toUpperCase(), 2.5),
      t(2, 20, muted, 'normal', `${s.sceneCode} · ${s.sceneTypeLabel}`),
      t(40, 40, PLAYER_COLORS[s.player] || ink, 'bold', s.player),
    ].join('');
  }

  if (sel.kind === 'player') {
    const p = sel.data;
    return [
      t(-30, 40, PLAYER_COLORS[p.name] || ink, 'bold', p.name),
      statsRow(
        [
          ['shows', p.showsAppeared],
          ['init', p.totalInitiations],
          ['walk', p.totalWalkons],
          ['joins', p.totalFullJoins],
        ],
        cy + 14
      ),
      statsRow(
        [
          ['hosts', p.hosts],
          ['words', p.gets],
        ],
        cy + 62
      ),
    ].join('');
  }

  if (sel.kind === 'show') {
    const m = sel.data;
    return [
      t(-44, 14, muted, 'normal', 'SHOW', 3),
      t(-10, 34, ink, 'bold', m.showTitle),
      statsRow(
        [
          ['scenes', m.sceneCount],
          ['on stage', m.rosterSize],
        ],
        cy + 30
      ),
      m.inits?.length
        ? t(76, 15, muted, 'normal', `initiated by ${m.inits.join(', ')}`)
        : '',
    ].join('');
  }

  // default identity — counts come from the caller (derived from data)
  const d = sel.data || {};
  return [
    t(-40, 34, ink, 'bold', 'FIRST DATE', 2),
    t(-10, 13, amber, 'normal', 'BALTIMORE IMPROV GROUP', 2.5),
    t(8, 12, muted, 'normal', 'CONSERVATORY · 2025–26', 2.5),
    statsRow(
      [
        ['shows', d.shows ?? 0],
        ['scenes', d.scenes ?? 0],
        ['players', d.players ?? 0],
      ],
      cy + 48
    ),
  ].join('');
}

// Compose the full export SVG string.
// geo: { segments, showMeta, groupBands, gridRadii }
// view: { W,H,CX,CY,INNER_R,OUTER_R, VB_X,VB_Y,VB_W,VB_H }
// opacityOf(seg) -> number ; groupOpacityOf(gb) -> number ; labelDimOf(meta)->opacity
// sel: center selection descriptor ; tokens: { bg, ink, muted, amber }
export function buildExportSVG({ geo, view, opacityOf, groupOpacityOf, labelOpacityOf, sel, tokens }) {
  const { segments, showMeta, groupBands, gridRadii } = geo;
  const { CX, CY, VB_X, VB_Y, VB_W, VB_H } = view;
  const { bg, ink, muted, amber } = tokens;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}" font-family="Georgia, 'Times New Roman', serif">`;
  s += `<rect x="${VB_X}" y="${VB_Y}" width="${VB_W}" height="${VB_H}" fill="${bg}"/>`;

  // grid
  for (const r of gridRadii) {
    s += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>`;
  }

  // segments
  s += `<g transform="translate(${CX},${CY})">`;
  for (const seg of segments) {
    s += `<path d="${seg.d}" fill="${PLAYER_COLORS[seg.player]}" fill-opacity="${opacityOf(
      seg
    ).toFixed(3)}" stroke="${bg}" stroke-width="0.4"/>`;
  }
  s += `</g>`;

  // group bands
  s += `<g transform="translate(${CX},${CY})">`;
  for (const gb of groupBands) {
    s += `<path d="${gb.d}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-opacity="0.55" opacity="${groupOpacityOf(
      gb
    ).toFixed(3)}"/>`;
  }
  s += `</g>`;

  // rim labels
  for (const m of showMeta) {
    s += `<text x="${m.lx.toFixed(1)}" y="${m.ly.toFixed(1)}" fill="${ink}" font-size="18" font-weight="600" text-anchor="${
      m.anchor
    }" transform="rotate(${m.rot.toFixed(1)} ${m.lx.toFixed(1)} ${m.ly.toFixed(1)})" fill-opacity="${labelOpacityOf(
      m
    ).toFixed(3)}">${esc(m.showTitle)}</text>`;
  }

  // center readout
  s += centerSVG(sel, CX, CY, ink, muted, amber);

  s += `</svg>`;
  return s;
}

// Rasterize an SVG string to a PNG blob at `scale` device pixels, then download.
export async function downloadSVGasPNG(svgString, { width, height, scale = 2, filename = 'first-date-poster.png', bg = '#0f1020' }) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
