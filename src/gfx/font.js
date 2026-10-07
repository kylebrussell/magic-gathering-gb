// Condensed 7px-tall pixel font in the style of the video's text box, with
// inline mana symbols written as {R}, {2}, {T} etc.

import { MANA_COLORS } from './palette.js';

const G = {
  A: ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  B: ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'],
  C: ['.##.', '#..#', '#...', '#...', '#...', '#..#', '.##.'],
  D: ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '#...', '###.', '#...', '#...', '####'],
  F: ['####', '#...', '#...', '###.', '#...', '#...', '#...'],
  G: ['.##.', '#..#', '#...', '#.##', '#..#', '#..#', '.###'],
  H: ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..##', '...#', '...#', '...#', '#..#', '#..#', '.##.'],
  K: ['#..#', '#..#', '#.#.', '##..', '#.#.', '#..#', '#..#'],
  L: ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#..#', '##.#', '##.#', '#.##', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '#..#', '###.', '#...', '#...', '#...'],
  Q: ['.##.', '#..#', '#..#', '#..#', '#..#', '#.#.', '.#.#'],
  R: ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'],
  S: ['.##.', '#..#', '#...', '.##.', '...#', '#..#', '.##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.'],
  U: ['#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['####', '...#', '..#.', '.#..', '#...', '#...', '####'],
  0: ['.##.', '#..#', '#.##', '##.#', '#..#', '#..#', '.##.'],
  1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  2: ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  3: ['.##.', '#..#', '...#', '.##.', '...#', '#..#', '.##.'],
  4: ['..#.', '.##.', '#.#.', '#.#.', '####', '..#.', '..#.'],
  5: ['####', '#...', '###.', '...#', '...#', '#..#', '.##.'],
  6: ['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'],
  7: ['####', '...#', '..#.', '..#.', '.#..', '.#..', '.#..'],
  8: ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'],
  9: ['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  ';': ['..', '..', '.#', '..', '..', '.#', '#.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '+': ['...', '...', '.#.', '###', '.#.', '...', '...'],
  '/': ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
  '[': ['##', '#.', '#.', '#.', '#.', '#.', '##'],
  ']': ['##', '.#', '.#', '.#', '.#', '.#', '##'],
  '=': ['...', '...', '###', '...', '###', '...', '...'],
  '*': ['..#..', '..#..', '#####', '.###.', '.#.#.', '#...#', '.....'],
  '%': ['#..#', '#..#', '..#.', '.#..', '#...', '#..#', '#..#'],
  '&': ['.#..', '#.#.', '.#..', '#.#.', '#..#', '#.#.', '.#.#'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '_': ['....', '....', '....', '....', '....', '....', '####'],
  '>': ['#...', '##..', '###.', '####', '###.', '##..', '#...'], // filled cursor
  '<': ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  '\u25b2': ['.....', '.....', '..#..', '.###.', '#####', '.....', '.....'], // ▲
  '\u25bc': ['.....', '.....', '#####', '.###.', '..#..', '.....', '.....'], // ▼
  '~': ['#...', '##..', '#.#.', '#..#', '#.#.', '##..', '#...'], // hollow cursor (video ▷)
  '×': ['...', '...', '#.#', '.#.', '#.#', '...', '...'], // ×
  '♥': ['.....', '##.##', '#####', '#####', '.###.', '..#..', '.....'], // heart
  '★': ['..#..', '..#..', '#####', '.###.', '.#.#.', '#...#', '.....'], // star
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

// 3x5 digits used inside mana circles.
const D3 = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '..#', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  T: ['##.', '..#', '#.#', '.##', '###'],
};

// 7x7 mana symbols: o = outline, f = fill, i = inner ink.
const RING = ['..ooo..', '.offfo.', 'offfffo', 'offfffo', 'offfffo', '.offfo.', '..ooo..'];
const SYMBOL_INNER = {
  W: ['..ooo..', '.ofifo.', 'ofiiifo', 'oiiiiio', 'ofiiifo', '.ofifo.', '..ooo..'],
  U: ['..ooo..', '.ofifo.', 'offiffo', 'ofiiifo', 'ofiiifo', '.ofifo.', '..ooo..'],
  B: ['..ooo..', '.oiiio.', 'oiiiiio', 'oififio', 'ofiiifo', '.ofifo.', '..ooo..'],
  R: ['..ooo..', '.ofifo.', 'offiifo', 'ofiiffo', 'ofiiifo', '.oiiio.', '..ooo..'],
  G: ['..ooo..', '.ofifo.', 'ofiiifo', 'oiiiiio', 'offiffo', '.ofifo.', '..ooo..'],
};

const HEIGHT = 7;
export const LINE_HEIGHT = 8;

function glyphFor(ch) {
  return G[ch.toUpperCase()] || G[ch] || G['?'];
}

const atlasCache = new Map();

function glyphCanvas(ch, color) {
  const key = ch + '|' + color;
  let c = atlasCache.get(key);
  if (c) return c;
  const rows = glyphFor(ch);
  c = document.createElement('canvas');
  c.width = Math.max(1, rows[0].length);
  c.height = HEIGHT;
  const x = c.getContext('2d');
  x.fillStyle = color;
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') x.fillRect(i, y, 1, 1);
  });
  atlasCache.set(key, c);
  return c;
}

function symbolCanvas(sym) {
  const key = '{' + sym + '}';
  let c = atlasCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 7;
  c.height = 7;
  const x = c.getContext('2d');
  let rows;
  let col;
  if (SYMBOL_INNER[sym]) {
    rows = SYMBOL_INNER[sym];
    col = MANA_COLORS[sym];
  } else {
    col = MANA_COLORS.C;
    rows = RING.map((r) => r.split(''));
    const d = D3[sym] || D3[sym.slice(-1)] || D3[0];
    d.forEach((row, y) => {
      for (let i = 0; i < 3; i++) if (row[i] === '#') rows[y + 1][i + 2] = 'i';
    });
    rows = rows.map((r) => r.join(''));
  }
  rows.forEach((row, y) => {
    for (let i = 0; i < 7; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      x.fillStyle = ch === 'o' ? '#000000' : ch === 'f' ? col.fill : col.ink;
      x.fillRect(i, y, 1, 1);
    }
  });
  atlasCache.set(key, c);
  return c;
}

// Split text into tokens: plain characters and {SYM} symbols.
function tokens(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') {
      const j = str.indexOf('}', i);
      if (j > i) {
        out.push({ sym: str.slice(i + 1, j) });
        i = j;
        continue;
      }
    }
    out.push({ ch: ch === '’' ? "'" : ch });
  }
  return out;
}

function tokenWidth(t) {
  if (t.sym) return 8;
  return glyphFor(t.ch)[0].length + 1;
}

export function measure(str) {
  let w = 0;
  for (const t of tokens(String(str))) w += tokenWidth(t);
  return Math.max(0, w - 1);
}

export function drawText(ctx, str, x, y, color = '#000000') {
  let cx = Math.round(x);
  y = Math.round(y);
  for (const t of tokens(String(str))) {
    if (t.sym) {
      ctx.drawImage(symbolCanvas(t.sym), cx, y);
      cx += 8;
    } else {
      const c = glyphCanvas(t.ch, color);
      ctx.drawImage(c, cx, y);
      cx += c.width + 1;
    }
  }
  return cx - x;
}

export function drawTextRight(ctx, str, right, y, color) {
  return drawText(ctx, str, right - measure(str), y, color);
}

export function drawTextCenter(ctx, str, cx, y, color) {
  return drawText(ctx, str, Math.round(cx - measure(str) / 2), y, color);
}

// Text with a 1px shadow/outline, for banners and titles.
export function drawTextShadow(ctx, str, x, y, color, shadow) {
  drawText(ctx, str, x + 1, y + 1, shadow);
  drawText(ctx, str, x, y, color);
}

export function drawTextOutline(ctx, str, x, y, color, outline) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) drawText(ctx, str, x + dx, y + dy, outline);
  drawText(ctx, str, x, y, color);
}

// Word-wrap to a pixel width. Explicit "\n" forces a break.
export function wrap(str, width) {
  const lines = [];
  for (const para of String(str).toUpperCase().split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (measure(next) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Number of visible "characters" in a string (a symbol counts as one), used by
// the typewriter effect.
export function visibleLength(str) {
  return tokens(str).length;
}

export function sliceVisible(str, n) {
  let out = '';
  let count = 0;
  for (let i = 0; i < str.length && count < n; i++) {
    if (str[i] === '{') {
      const j = str.indexOf('}', i);
      if (j > i) {
        out += str.slice(i, j + 1);
        i = j;
        count++;
        continue;
      }
    }
    out += str[i];
    count++;
  }
  return out;
}

export function manaSymbols(cost) {
  if (!cost) return '';
  const m = cost.match(/^\d+/);
  let out = m ? `{${m[0]}}` : '';
  for (const ch of cost.slice(m ? m[0].length : 0)) out += `{${ch}}`;
  return out;
}
