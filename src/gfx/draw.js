// Shared UI drawing: window frames, menus, banners, cards.

import { C, CARD_COLORS } from './palette.js';
import { drawText, drawTextCenter, drawTextShadow, measure, wrap, LINE_HEIGHT } from './font.js';
import { icon } from './sprites.js';

export const W = 160;
export const H = 144;

export function fill(ctx, color, x = 0, y = 0, w = W, h = H) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function hline(ctx, x, y, w, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 1);
}

export function vline(ctx, x, y, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, h);
}

export function rectOutline(ctx, x, y, w, h, color) {
  hline(ctx, x, y, w, color);
  hline(ctx, x, y + h - 1, w, color);
  vline(ctx, x, y, h, color);
  vline(ctx, x + w - 1, y, h, color);
}

// The orange double-line window frame from the video's text boxes.
export function frame(ctx, x, y, w, h, opts = {}) {
  const outer = opts.outer || C.dark;
  const mid = opts.mid || C.orange;
  ctx.fillStyle = opts.bg || C.bg;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // outer line with clipped corners
  hline(ctx, x + 2, y, w - 4, outer);
  hline(ctx, x + 2, y + h - 1, w - 4, outer);
  vline(ctx, x, y + 2, h - 4, outer);
  vline(ctx, x + w - 1, y + 2, h - 4, outer);
  ctx.fillStyle = outer;
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1);
  ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  // orange band
  ctx.fillStyle = mid;
  ctx.fillRect(x + 2, y + 1, w - 4, 2);
  ctx.fillRect(x + 2, y + h - 3, w - 4, 2);
  ctx.fillRect(x + 1, y + 2, 2, h - 4);
  ctx.fillRect(x + w - 3, y + 2, 2, h - 4);
  // inner line
  rectOutline(ctx, x + 3, y + 3, w - 6, h - 6, outer);
}

// Plain thin box (used for list panels).
export function thinBox(ctx, x, y, w, h, bg = C.bg) {
  fill(ctx, bg, x, y, w, h);
  rectOutline(ctx, x, y, w, h, C.dark);
}

// Bevelled banner ("MULLIGAN...", "YOUR TURN").
export function banner(ctx, text, cx, cy, opts = {}) {
  const lines = String(text).split('\n');
  const w = Math.max(...lines.map((l) => measure(l))) + 16;
  const h = lines.length * 9 + 9;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  const face = opts.face || C.banner;
  fill(ctx, C.ink, x + 1, y, w - 2, h);
  fill(ctx, C.ink, x, y + 1, w, h - 2);
  fill(ctx, face, x + 1, y + 1, w - 2, h - 2);
  fill(ctx, opts.light || C.bannerLight, x + 2, y + 2, w - 4, 1);
  fill(ctx, opts.shade || '#888060', x + 2, y + h - 3, w - 4, 1);
  lines.forEach((l, i) => {
    const tx = Math.round(cx - measure(l) / 2);
    drawTextShadow(ctx, l, tx, y + 5 + i * 9, opts.color || C.dark, opts.shadow || C.cream);
  });
}

// Lay out menu options in columns. Returns positions for hit testing.
export function menuLayout(options, x, y, cols = 2, colWidth = 60, rowHeight = 10) {
  return options.map((o, i) => ({ x: x + (i % cols) * colWidth, y: y + Math.floor(i / cols) * rowHeight, label: typeof o === 'string' ? o : o.label, disabled: o.disabled }));
}

export function drawMenu(ctx, layout, cursor, blink = true) {
  layout.forEach((item, i) => {
    const color = item.disabled ? C.grey : C.ink;
    drawText(ctx, item.label, item.x + 7, item.y, color);
    if (i === cursor && blink) ctx.drawImage(icon('cursor'), item.x, item.y);
  });
}

// Text box body: up to `lines` lines of wrapped text.
export function textLines(ctx, text, x, y, width, maxLines = 2, color = C.ink) {
  const lines = wrap(text, width).slice(0, maxLines);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * (LINE_HEIGHT + 4), color));
  return lines.length;
}

// Popup card shown when a card is played ("CREATURE" / "LAND" / "INSTANT").
export function popupCard(ctx, cx, cy, typeLabel, art, opts = {}) {
  const w = 74;
  const h = 90;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  fill(ctx, C.ink, x + 1, y, w - 2, h);
  fill(ctx, C.ink, x, y + 1, w, h - 2);
  fill(ctx, '#c8c0a8', x + 1, y + 1, w - 2, h - 2);
  fill(ctx, '#e8e4d4', x + 3, y + 3, w - 6, h - 6);
  rectOutline(ctx, x + 3, y + 3, w - 6, h - 6, '#888070');
  // type banner
  fill(ctx, C.ink, x + 4, y + 5, w - 8, 12);
  fill(ctx, '#585848', x + 5, y + 6, w - 10, 10);
  fill(ctx, '#787868', x + 5, y + 6, w - 10, 1);
  drawTextShadow(ctx, typeLabel, x + 7, y + 8, C.white, C.ink);
  if (art) {
    fill(ctx, C.ink, x + 4, y + 19, 66, 50);
    ctx.drawImage(art, x + 5, y + 20);
  }
  if (opts.footer) drawTextCenter(ctx, opts.footer, cx, y + h - 14, C.ink);
}

export function typeLabel(d) {
  if (d.type.includes('Land')) return 'LAND';
  if (d.type.includes('Creature')) return d.type.includes('Artifact') ? 'ARTIFACT' : 'CREATURE';
  if (d.type.includes('Enchantment')) return 'ENCHANT';
  if (d.type.includes('Artifact')) return 'ARTIFACT';
  return d.type.toUpperCase();
}

export function colorFrame(ctx, x, y, w, h, colorKey) {
  const cc = CARD_COLORS[colorKey] || CARD_COLORS.A;
  fill(ctx, C.ink, x, y, w, h);
  fill(ctx, cc.main, x + 1, y + 1, w - 2, h - 2);
}

// Fade the whole screen towards the background colour (GB-style, 0..4).
export function fade(ctx, level, color = C.bg) {
  if (level <= 0) return;
  ctx.globalAlpha = Math.min(1, level / 4);
  fill(ctx, color);
  ctx.globalAlpha = 1;
}
