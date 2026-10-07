// Overworld graphics: 16x16 character sprites, room tiles, map buildings.

import { C } from './palette.js';

const CHAR_BASE = {
  down: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohssssssho...',
    '...osesssseso...',
    '...ossssssssо...'.replace('о', 'o'),
    '....osssssso....',
    '....occcccco....',
    '...occcccccco...',
    '..osccccccccso..',
    '...occcccccco...',
    '....oddddddo....',
    '....odd..ddo....',
    '....ooo..ooo....',
  ],
  up: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '....ohhhhhho....',
    '....occcccco....',
    '...occcccccco...',
    '..osccccccccso..',
    '...occcccccco...',
    '....oddddddo....',
    '....odd..ddo....',
    '....ooo..ooo....',
  ],
  left: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...osshhhhhho...',
    '...oeshhhhhho...',
    '...ossssshhho...',
    '....osssssso....',
    '.....occcco.....',
    '....occcccco....',
    '....osccccco....',
    '....occcccco....',
    '.....oddddo.....',
    '.....oddddo.....',
    '.....oooooo.....',
  ],
};

function walkFrame(rows, dir, which) {
  const r = [...rows];
  if (dir === 'left') {
    if (which === 1) {
      r[14] = '....odd.oddo....';
      r[15] = '....ooo.ooo.....';
    }
    return r;
  }
  if (which === 1) {
    r[14] = '....odd..ooo....';
    r[15] = '....ooo.........';
  } else if (which === 2) {
    r[14] = '....ooo..ddo....';
    r[15] = '.........ooo....';
  }
  return r;
}

const spriteCache = new Map();

// dir: down/up/left/right, frame 0..3 (walk cycle)
export function charSprite(pal, dir, frame = 0) {
  const key = JSON.stringify(pal) + dir + frame;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const baseDir = dir === 'right' ? 'left' : dir;
  const which = frame % 2 === 0 ? 0 : frame === 1 ? 1 : 2;
  const rows = walkFrame(CHAR_BASE[baseDir], baseDir, which);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const x = c.getContext('2d');
  const colors = { o: '#101010', h: pal.h, s: pal.s, c: pal.c, d: pal.d, e: pal.eyes || '#101010' };
  rows.forEach((row, y) => {
    for (let i = 0; i < 16; i++) {
      const col = colors[row[i]];
      if (!col) continue;
      x.fillStyle = col;
      const px = dir === 'right' ? 15 - i : i;
      x.fillRect(px, y, 1, 1);
    }
  });
  spriteCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------------------
// Room tiles

const tileCache = new Map();

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

export function tile(ch, pal, tx, ty) {
  const variant = ch === '.' || ch === 'r' ? (tx + ty) % 2 : 0;
  const key = ch + variant + JSON.stringify(pal);
  if (tileCache.has(key)) return tileCache.get(key);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const x = c.getContext('2d');
  const R = (col, a, b, w, h) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  const floor = () => {
    R(variant ? pal.floor2 : pal.floor, 0, 0, 16, 16);
    R(shade(pal.floor, 0.92), 0, 15, 16, 1);
    R(shade(pal.floor, 0.92), 15, 0, 1, 16);
  };
  const wallTop = () => {
    R(pal.wall, 0, 0, 16, 16);
    R(shade(pal.wall, 1.15), 0, 0, 16, 2);
    for (let i = 0; i < 16; i += 4) R(shade(pal.wall, 0.9), i, 4, 1, 12);
  };
  switch (ch) {
    case '.':
    case 'D':
      floor();
      if (ch === 'D') {
        R('#806040', 1, 6, 14, 10);
        R('#a08058', 2, 7, 12, 8);
        for (let i = 3; i < 14; i += 2) R('#806040', i, 8, 1, 6);
      }
      break;
    case 'r':
      R(pal.banner, 0, 0, 16, 16);
      R(shade(pal.banner, 0.8), 0, 0, 16, 1);
      R(shade(pal.banner, 1.25), 2, 2, 12, 12);
      R(pal.banner, 4, 4, 8, 8);
      R(shade(pal.banner, 1.25), 6, 6, 4, 4);
      break;
    case 'm':
      R('#a01818', 0, 0, 16, 16);
      R('#e0b020', 1, 0, 1, 16);
      R('#e0b020', 14, 0, 1, 16);
      R('#c02020', 3, 0, 10, 16);
      break;
    case '#':
      wallTop();
      R(pal.trim, 0, 12, 16, 4);
      R(shade(pal.trim, 1.3), 0, 12, 16, 1);
      break;
    case 'w':
      wallTop();
      R('#203048', 2, 2, 12, 10);
      R('#88c8f0', 3, 3, 10, 8);
      R('#d0f0ff', 4, 4, 3, 2);
      R('#203048', 7, 3, 1, 8);
      R('#203048', 3, 7, 10, 1);
      R(pal.trim, 0, 12, 16, 4);
      break;
    case 'b':
      wallTop();
      R('#202020', 3, 1, 10, 12);
      R(pal.banner, 4, 1, 8, 11);
      R(shade(pal.banner, 1.3), 6, 4, 4, 4);
      R(pal.banner, 4, 12, 3, 2);
      R(pal.banner, 9, 12, 3, 2);
      R(pal.trim, 0, 14, 16, 2);
      break;
    case 's':
      wallTop();
      R('#503010', 1, 1, 14, 13);
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 6; i++) R(['#c03030', '#3050c0', '#30a040', '#d0a020', '#8040a0', '#e0e0d0'][(i + row * 2) % 6], 2 + i * 2, 2 + row * 4, 2, 3);
        R('#301800', 1, 5 + row * 4, 14, 1);
      }
      R(pal.trim, 0, 14, 16, 2);
      break;
    case 'T':
      floor();
      R('#101010', 0, 3, 16, 11);
      R('#7a4a20', 1, 4, 14, 9);
      R('#287838', 2, 5, 12, 6);
      R('#f0f0e0', 4, 6, 3, 4);
      R('#f0f0e0', 9, 7, 3, 4);
      R('#50300c', 1, 13, 2, 3);
      R('#50300c', 13, 13, 2, 3);
      break;
    case 'p':
      floor();
      R('#101010', 4, 10, 8, 6);
      R('#b05020', 5, 10, 6, 5);
      R('#101010', 3, 1, 10, 10);
      R('#208828', 4, 2, 8, 8);
      R('#50c050', 5, 3, 3, 3);
      R('#105810', 9, 6, 2, 3);
      break;
    case 'x':
      floor();
      R('#101010', 3, 0, 10, 16);
      R('#d0c8e0', 4, 0, 8, 16);
      R('#a098b8', 9, 0, 3, 16);
      R('#f0f0f8', 5, 0, 1, 16);
      break;
    case 'c':
      floor();
      R('#101010', 0, 2, 16, 13);
      R('#9a6a38', 0, 3, 16, 4);
      R('#7a4a20', 0, 7, 16, 7);
      R('#c89858', 0, 3, 16, 1);
      break;
    case 'k':
      floor();
      R('#101010', 3, 2, 10, 13);
      R('#7a4a20', 4, 3, 8, 11);
      R('#f0e8d0', 5, 4, 6, 4);
      R('#c03030', 7, 4, 1, 4);
      R('#50300c', 4, 12, 8, 2);
      break;
    default:
      floor();
  }
  tileCache.set(key, c);
  return c;
}

export const SOLID = new Set(['#', 'w', 'b', 's', 'T', 'p', 'x', 'c', 'k']);

// Map building icon (16x16).
export function building(color, kind = 'club') {
  const key = 'bld' + color + kind;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const x = c.getContext('2d');
  const R = (col, a, b, w, h) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  if (kind === 'summit') {
    R('#101010', 2, 3, 12, 13);
    R('#e8e0f0', 3, 4, 10, 11);
    R('#c0a020', 3, 4, 10, 2);
    R('#101010', 6, 10, 4, 5);
    R('#101010', 7, 0, 2, 4);
    R('#c0a020', 7, 0, 2, 2);
    R('#9888b8', 4, 7, 2, 2);
    R('#9888b8', 10, 7, 2, 2);
  } else {
    // roof
    x.fillStyle = '#101010';
    x.beginPath();
    x.moveTo(0, 8);
    x.lineTo(8, 1);
    x.lineTo(16, 8);
    x.fill();
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(2, 8);
    x.lineTo(8, 3);
    x.lineTo(14, 8);
    x.fill();
    R('#101010', 2, 8, 12, 8);
    R(kind === 'shop' ? '#f0d8a0' : '#f0ecd8', 3, 8, 10, 7);
    R('#101010', 6, 10, 4, 6);
    R('#805020', 7, 11, 2, 4);
    R('#5080c0', 4, 10, 2, 2);
    R('#5080c0', 10, 10, 2, 2);
  }
  tileCache.set(key, c);
  return c;
}
