// Small pixel-art icons, authored as character grids.

import { C, CARD_COLORS } from './palette.js';

const cache = new Map();

export function sprite(rows, pal) {
  const key = rows.join('/') + JSON.stringify(pal);
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}

const INK = { o: C.ink, w: C.white, r: C.orange, g: C.green, d: C.dark, e: '#c8c0a8', c: C.cream, R: C.orange };

export const ICONS = {
  hand: [
    '...o.o....',
    '..owowo...',
    '..owowo.o.',
    '..owowowo.',
    'o.owowowo.',
    'owowwwwwo.',
    '.owwwwwwo.',
    '..owwwwo..',
    '...oooo...',
  ],
  grave: [
    '..oooo..',
    '.oeeeeo.',
    'oeeeeeeo',
    'oeooooeo',
    'oeeeeeeo',
    'oeoooeeo',
    'oeeeeeeo',
    'oeeeeeeo',
    'oooooooo',
  ],
  library: [
    '.oooooooo.',
    'oRRRRRRRRo',
    'oRwwwwwwRo',
    'oRwwwwwwRo',
    'oRRRRRRRRo',
    'oggggggggo',
    'oooooooooo',
    'oggggggggo',
    'oooooooooo',
  ],
  exile: [
    '...o.....',
    '...oo..o.',
    'o..ooooo.',
    'ooooo.oo.',
    '.oo...oo.',
    '.oo.ooooo',
    '.ooooo..o',
    '.o..oo...',
    '.....o...',
  ],
  land: [
    '...e...',
    '..eee..',
    '..eee..',
    '.eeeee.',
    '.eeeee.',
    'eeeeeee',
    'eeeeeee',
  ],
  phaseUntap: ['..ooo..', '.o...o.', 'o......', 'o...ooo', 'o....o.', '.o...o.', '..ooo..'],
  phaseMain: ['.ooooo.', '.o...o.', '.o.o.o.', '.o...o.', '.o.o.o.', '.o...o.', '.ooooo.'],
  phaseCombat: ['......o', '.....o.', '....o..', 'o..o...', '.oo....', '.oo....', 'o..o...'],
  phaseEnd: ['..ooo..', '.o...o.', 'o.o.o.o', 'o..o..o', 'o.o.o.o', '.o...o.', '..ooo..'],
  arrowDown: ['ooooo', '.ooo.', '..o..'],
  arrowUp: ['..o..', '.ooo.', 'ooooo'],
  arrowRight: ['o..', 'oo.', 'ooo', 'oo.', 'o..'],
  arrowLeft: ['..o', '.oo', 'ooo', '.oo', '..o'],
  cursor: ['o...', 'oo..', 'o.o.', 'o..o', 'o.o.', 'oo..', 'o...'],
  cursorFilled: ['o...', 'oo..', 'ooo.', 'oooo', 'ooo.', 'oo..', 'o...'],
  medal: ['.ooooo.', 'o.www.o', 'owwwwwo', 'owwrwwo', 'owwwwwo', 'o.www.o', '.ooooo.'],
  pack: [
    'oooooooooo',
    'orrrrrrrro',
    'orwwwwwwro',
    'orwoowwwro',
    'orwwoowwro',
    'orwwwoowro',
    'orwwwwwwro',
    'orwwwwwwro',
    'orrrrrrrro',
    'oooooooooo',
  ],
};

export function icon(name, pal = INK) {
  return sprite(ICONS[name], pal);
}

// Glyphs drawn inside the 11x11 type icons used in hand lists.
const TYPE_GLYPHS = {
  bolt: ['.....oo..', '....oo...', '...oo....', '..ooooo..', '....oo...', '...oo....', '..oo.....', '.oo......', '.........'],
  claw: ['...o..o..', '..o..o..o', '..o..o..o', '.o..o..o.', '.o..o..o.', 'o..o..o..', 'o..o..o..', '.........', '.........'],
  swirl: ['..oooo...', '.o....o..', 'o..oo..o.', 'o.o..o.o.', 'o.o.o..o.', 'o..o..o..', '.o...o...', '..ooo....', '.........'],
  sparkle: ['....o....', '....o....', '...ooo...', 'ooooooooo', '...ooo...', '....o....', '....o....', '.........', '.........'],
  gear: ['...ooo...', '.o.ooo.o.', '..ooooo..', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo', '..ooooo..', '.o.ooo.o.', '...ooo...'],
  mountain: ['.........', '....o....', '...ooo...', '..ooooo..', '..oooooo.', '.oooooooo', 'ooooooooo', 'ooooooooo', '.........'],
  tree: ['....o....', '...ooo...', '..ooooo..', '...ooo...', '..ooooo..', '.ooooooo.', '....o....', '....o....', '.........'],
  wave: ['.........', '.oo...oo.', 'o..o.o..o', '....o....', '.oo...oo.', 'o..o.o..o', '....o....', '.........', '.........'],
  skull: ['..ooooo..', '.ooooooo.', '.o..o..o.', '.o..o..o.', '.ooooooo.', '..o.o.o..', '..ooooo..', '.........', '.........'],
  sun: ['....o....', '.o.....o.', '...ooo...', '..ooooo..', 'o.ooooo.o', '..ooooo..', '...ooo...', '.o.....o.', '....o....'],
  dual: ['.........', '..o...o..', '.ooo.ooo.', '.ooo.ooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.........', '.........'],
  shield: ['.ooooooo.', '.o.....o.', '.o.ooo.o.', '.o.ooo.o.', '.o.ooo.o.', '..o.o.o..', '...o.o...', '....o....', '.........'],
};

const LAND_GLYPH = { Mountain: 'mountain', Forest: 'tree', Island: 'wave', Swamp: 'skull', Plains: 'sun' };

export function typeGlyph(d) {
  if (d.type.includes('Land')) {
    const subs = (d.sub || '').split(' ').filter(Boolean);
    if (subs.length === 1) return LAND_GLYPH[subs[0]];
    return 'dual';
  }
  if (d.type.includes('Creature')) return 'claw';
  if (d.type === 'Instant') return 'bolt';
  if (d.type === 'Sorcery') return 'swirl';
  if (d.type.includes('Enchantment')) return d.aura || d.control ? 'shield' : 'sparkle';
  if (d.type.includes('Artifact')) return 'gear';
  return 'sparkle';
}

export function typeIcon(d, colorKey) {
  const land = d.type.includes('Land');
  const cc = CARD_COLORS[colorKey] || CARD_COLORS.A;
  const bg = land ? '#a8a088' : cc.main;
  const fg = land ? C.ink : colorKey === 'W' || colorKey === 'M' ? cc.dark : C.white;
  const glyph = TYPE_GLYPHS[typeGlyph(d)];
  const rows = ['ooooooooooo'];
  for (let y = 0; y < 9; y++) rows.push('o' + glyph[y].replace(/o/g, 'f').replace(/\./g, 'b') + 'o');
  rows.push('ooooooooooo');
  return sprite(rows, { o: C.ink, b: bg, f: fg });
}

// Little card shown on the battlefield. tapped = landscape.
export function miniCard(colorKey, tapped, opts = {}) {
  const cc = CARD_COLORS[colorKey] || CARD_COLORS.A;
  const w = tapped ? 10 : 8;
  const h = tapped ? 8 : 10;
  const key = `mini|${colorKey}|${tapped}|${opts.dim ? 1 : 0}|${opts.kind || ''}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = C.ink;
  x.fillRect(0, 0, w, h);
  x.fillStyle = opts.dim ? cc.dark : cc.main;
  x.fillRect(1, 1, w - 2, h - 2);
  x.fillStyle = C.white;
  if (opts.kind === 'land') {
    x.fillStyle = opts.dim ? cc.main : cc.light;
    x.fillRect(2, 2, w - 4, h - 4);
  } else if (opts.kind === 'other') {
    x.fillRect(w / 2 - 1, 2, 2, h - 4);
    x.fillRect(2, h / 2 - 1, w - 4, 2);
  } else {
    x.fillRect(2, 2, w - 4, h - 4);
    x.fillStyle = cc.dark;
    if (tapped) x.fillRect(3, 3, 1, h - 6);
    else x.fillRect(3, 3, 1, h - 6);
  }
  cache.set(key, c);
  return c;
}

// The grey Planeswalker symbol in the middle of the board.
export function watermark() {
  const key = 'watermark';
  let c = cache.get(key);
  if (c) return c;
  const w = 27;
  const h = 40;
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = C.grey;
  // five spikes rising from a body that narrows to a point
  const spikes = [
    [3, 14],
    [7, 8],
    [13, 0],
    [19, 8],
    [23, 14],
  ];
  for (const [sx, top] of spikes) {
    for (let y = top; y < 24; y++) {
      const half = Math.min(2, Math.floor((y - top) / 4));
      x.fillRect(sx - half, y, half * 2 + 1, 1);
    }
  }
  for (let y = 4; y < 24; y += 1) {
    if (y > 10) {
      x.fillRect(10, y, 7, 1);
    }
  }
  for (let y = 22; y < h; y++) {
    const t = (y - 22) / (h - 22);
    const half = Math.round(13 * (1 - t) * (1 - t * 0.3));
    x.fillRect(13 - half, y, half * 2 + 1, 1);
  }
  // Notches between spikes
  x.clearRect(5, 18, 1, 6);
  x.clearRect(21, 18, 1, 6);
  cache.set(key, c);
  return c;
}

// Hexagonal d20 used for life totals.
export function lifeDie() {
  const rows = [
    '.....oooooo.....',
    '....o.e..e.o....',
    '...o..e..e..o...',
    '..o...eeee...o..',
    '.o...e....e...o.',
    'o...e......e...o',
    'o..e........e..o',
    'o.e..........e.o',
    'oe............eo',
    'o..............o',
    'o..............o',
    '.o............o.',
    '..o..........o..',
    '...o........o...',
    '....o......o....',
    '.....oooooo.....',
  ];
  const fill = rows.map((r) => {
    // fill the inside with a light colour
    const first = r.indexOf('o');
    const last = r.lastIndexOf('o');
    return r
      .split('')
      .map((ch, i) => (ch === '.' && i > first && i < last ? 'f' : ch))
      .join('');
  });
  return sprite(fill, { o: '#787058', e: '#c8c0a0', f: '#ece6cc' });
}

export function die(n, color = C.orange) {
  const pips = {
    1: [[5, 5]],
    2: [[3, 3], [7, 7]],
    3: [[3, 3], [5, 5], [7, 7]],
    4: [[3, 3], [7, 3], [3, 7], [7, 7]],
    5: [[3, 3], [7, 3], [5, 5], [3, 7], [7, 7]],
    6: [[3, 3], [7, 3], [3, 5], [7, 5], [3, 7], [7, 7]],
  }[n];
  const key = `die|${n}|${color}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const x = c.getContext('2d');
  x.fillStyle = C.ink;
  x.fillRect(1, 0, 10, 12);
  x.fillRect(0, 1, 12, 10);
  x.fillStyle = color;
  x.fillRect(1, 1, 10, 9);
  x.fillStyle = C.orangeDark;
  x.fillRect(1, 10, 10, 1);
  x.fillStyle = C.ink;
  for (const [px, py] of pips) x.fillRect(px, py, 2, 2);
  cache.set(key, c);
  return c;
}

// Face-down card used in the deck-cut animation.
export function cardBack() {
  return sprite(
    ['oooooooo', 'orrrrrro', 'orwwwwro', 'orwoowro', 'orwoowro', 'orwwwwro', 'orrrrrro', 'oggggggo', 'oooooooo'],
    INK,
  );
}
