// 48x48 character portraits drawn with the card-art pipeline.

import { drawer, rng } from './art.js';

const PS = 48;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// Palettes: [outline, dark, mid(background), light]
const PAL = {
  red: ['#100000', '#b81000', '#f01000', '#f8d8b8'],
  green: ['#001000', '#205010', '#4a9a20', '#e8f0c8'],
  blue: ['#000820', '#0848a0', '#1890e8', '#d8f0f8'],
  purple: ['#100010', '#502070', '#8840b0', '#f0d8f8'],
  gold: ['#181000', '#806010', '#d0a020', '#f8f0d0'],
  grey: ['#080808', '#504c48', '#908878', '#ece8dc'],
  black: ['#000000', '#302838', '#605070', '#d8d0e0'],
  teal: ['#001010', '#105860', '#20a0a0', '#e0f8f0'],
  orange: ['#180800', '#a04000', '#e87810', '#f8e8c8'],
  brown: ['#100800', '#583818', '#a07038', '#f0e0c0'],
};

function bust(d, o) {
  const cx = 24;
  const body = o.body ?? 1;
  const skin = o.skin ?? 3;
  // shoulders
  d.ell(cx, 52, 22, 16, body);
  if (o.collar != null) d.poly([[cx - 8, 38], [cx + 8, 38], [cx, 48]], o.collar);
  if (o.armor) {
    d.ell(cx - 14, 42, 8, 6, 2.6);
    d.ell(cx + 14, 42, 8, 6, 2.6);
  }
  if (o.cape != null) {
    d.poly([[cx - 22, 48], [cx - 14, 36], [cx - 10, 48]], o.cape);
    d.poly([[cx + 22, 48], [cx + 14, 36], [cx + 10, 48]], o.cape);
  }
  // neck
  d.rect(cx - 4, 28, 8, 9, o.hood != null ? 0 : skin - 0.6);
  // back hair
  if (o.hair === 'long') d.path(`M${cx - 13} 40 Q${cx - 15} 6 ${cx} 6 Q${cx + 15} 6 ${cx + 13} 40 Z`, o.hairTone ?? 1);
  if (o.hair === 'fiery') {
    for (let i = 0; i < 7; i++) {
      const x = cx - 15 + i * 5;
      d.poly([[x - 3, 22], [x + (i - 3) * 1.5, 2 + Math.abs(i - 3) * 3], [x + 3, 22]], o.hairTone ?? 2.6);
    }
  }
  // ears
  if (o.ears === 'elf') {
    d.poly([[cx - 9, 20], [cx - 20, 12], [cx - 9, 25]], skin);
    d.poly([[cx + 9, 20], [cx + 20, 12], [cx + 9, 25]], skin);
    d.line(cx - 10, 21, cx - 16, 15, skin - 1, 1);
    d.line(cx + 10, 21, cx + 16, 15, skin - 1, 1);
  }
  if (o.horns != null) {
    d.path(`M${cx - 6} 10 Q${cx - 20} 6 ${cx - 18} -6 Q${cx - 12} 4 ${cx - 2} 8 Z`, o.horns);
    d.path(`M${cx + 6} 10 Q${cx + 20} 6 ${cx + 18} -6 Q${cx + 12} 4 ${cx + 2} 8 Z`, o.horns);
  }
  // head
  if (o.hood != null) {
    d.path(`M${cx - 16} 44 Q${cx - 16} 2 ${cx} 2 Q${cx + 16} 2 ${cx + 16} 44 Z`, o.hood);
    d.path(`M${cx - 13} 40 Q${cx - 12} 8 ${cx} 6 Q${cx + 12} 8 ${cx + 13} 40 Z`, o.hoodInner ?? o.hood - 0.5);
    d.ell(cx, 22, 8, 11, 0);
    if (o.eyes === 'glow') {
      d.rect(cx - 5, 19, 3, 2, 3);
      d.rect(cx + 2, 19, 3, 2, 3);
    }
    // highlight folds like the video's red cloak
    d.stroke(`M${cx - 12} 30 Q${cx - 10} 16 ${cx - 6} 9`, o.hood + 0.8, 1.4);
    d.stroke(`M${cx + 12} 30 Q${cx + 11} 18 ${cx + 8} 10`, o.hood - 0.6, 1.4);
    return;
  }
  if (o.dragon) {
    d.path(`M${cx - 12} 34 Q${cx - 14} 8 ${cx} 6 Q${cx + 14} 8 ${cx + 12} 34 Q${cx} 44 ${cx - 12} 34 Z`, skin);
    d.poly([[cx - 6, 18], [cx - 2, 20], [cx - 6, 21]], 3);
    d.poly([[cx + 6, 18], [cx + 2, 20], [cx + 6, 21]], 3);
    d.line(cx - 4, 32, cx + 4, 32, 0, 1.4);
    for (let i = -2; i <= 2; i++) d.line(cx + i * 3, 33, cx + i * 3, 36, 3, 1);
    d.circ(cx, 12, 3, 3);
    return;
  }
  d.ell(cx, 21, 9.5, 12, skin);
  if (o.metal) {
    d.stroke(`M${cx - 9} 18 L${cx + 9} 18`, 1.4, 1);
    d.stroke(`M${cx} 9 L${cx} 30`, 2, 1);
  }
  // eyes
  const ey = 20;
  if (o.glasses) {
    d.arc(cx - 4, ey, 3, 0, Math.PI * 2, 0, 1);
    d.arc(cx + 4, ey, 3, 0, Math.PI * 2, 0, 1);
    d.line(cx - 1, ey, cx + 1, ey, 0, 1);
  }
  d.rect(cx - 5, ey, 2, 2, o.eyeTone ?? 0);
  d.rect(cx + 3, ey, 2, 2, o.eyeTone ?? 0);
  if (!o.noBrows) {
    d.line(cx - 6, ey - 2.5, cx - 2, ey - 2, o.browTone ?? 0.6, 1);
    d.line(cx + 2, ey - 2, cx + 6, ey - 2.5, o.browTone ?? 0.6, 1);
  }
  d.line(cx, ey + 3, cx - 1, ey + 6, skin - 1, 1);
  d.line(cx - 2.5, ey + 9, cx + 2.5, ey + 9, o.smile ? 0.6 : 1, 1);
  if (o.beard != null) d.path(`M${cx - 9.5} 22 Q${cx - 8} 40 ${cx} 42 Q${cx + 8} 40 ${cx + 9.5} 22 Q${cx + 6} 30 ${cx} 30 Q${cx - 6} 30 ${cx - 9.5} 22 Z`, o.beard);
  if (o.mustache != null) d.path(`M${cx - 6} 28 Q${cx} 25 ${cx + 6} 28 L${cx} 27 Z`, o.mustache);
  // hair / hats
  const ht = o.hairTone ?? 1;
  if (o.hair === 'short' || o.hair === 'long') d.path(`M${cx - 10} 20 Q${cx - 11} 7 ${cx} 7 Q${cx + 11} 7 ${cx + 10} 20 Q${cx + 6} 11 ${cx} 12 Q${cx - 6} 11 ${cx - 10} 20 Z`, ht);
  if (o.hair === 'spiky') {
    for (let i = 0; i < 6; i++) d.poly([[cx - 11 + i * 4, 14], [cx - 13 + i * 5, 1 + (i % 2) * 3], [cx - 7 + i * 4, 13]], ht);
    d.path(`M${cx - 10} 18 Q${cx} 6 ${cx + 10} 18 L${cx + 10} 12 Q${cx} 4 ${cx - 10} 12 Z`, ht);
  }
  if (o.hair === 'pony') {
    d.path(`M${cx - 10} 20 Q${cx - 11} 7 ${cx} 7 Q${cx + 11} 7 ${cx + 10} 20 Q${cx + 6} 11 ${cx} 12 Q${cx - 6} 11 ${cx - 10} 20 Z`, ht);
    d.path(`M${cx + 8} 10 Q${cx + 20} 14 ${cx + 16} 34 Q${cx + 13} 20 ${cx + 8} 16 Z`, ht);
  }
  if (o.hair === 'fiery') d.path(`M${cx - 10} 18 Q${cx} 4 ${cx + 10} 18 Q${cx} 11 ${cx - 10} 18 Z`, ht);
  if (o.hair === 'bald') d.arc(cx, 21, 9.5, Math.PI * 1.15, Math.PI * 1.45, 3, 1.4);
  if (o.cap != null) {
    d.path(`M${cx - 11} 15 Q${cx - 10} 3 ${cx} 3 Q${cx + 10} 3 ${cx + 11} 15 Z`, o.cap);
    d.path(`M${cx - 12} 15 L${cx + 12} 15 L${cx + 13} 17 L${cx - 13} 17 Z`, o.cap - 0.8);
    if (o.capSymbol) {
      d.poly([[cx, 6], [cx - 3, 12], [cx, 10], [cx + 3, 12]], 0);
      d.line(cx - 4, 8, cx + 4, 8, 0, 1);
    }
  }
  if (o.helmet != null) {
    d.path(`M${cx - 11} 22 Q${cx - 12} 2 ${cx} 2 Q${cx + 12} 2 ${cx + 11} 22 L${cx + 9} 22 Q${cx + 8} 12 ${cx} 12 Q${cx - 8} 12 ${cx - 9} 22 Z`, o.helmet);
    d.line(cx, 2, cx, 12, o.helmet + 0.8, 1.2);
  }
  if (o.crown != null) d.poly([[cx - 9, 11], [cx - 9, 4], [cx - 5, 8], [cx, 2], [cx + 5, 8], [cx + 9, 4], [cx + 9, 11]], o.crown);
  if (o.circlet != null) {
    d.rect(cx - 10, 11, 20, 2, o.circlet);
    d.circ(cx, 12, 2, 3);
  }
  if (o.turban != null) {
    d.ell(cx, 9, 12, 7, o.turban);
    d.stroke(`M${cx - 10} 10 Q${cx} 4 ${cx + 10} 10`, o.turban - 0.8, 1);
    d.circ(cx, 8, 2, 3);
  }
  if (o.wizardHat != null) d.poly([[cx - 14, 12], [cx + 14, 12], [cx + 4, -8]], o.wizardHat);
  if (o.headpiece != null) {
    d.poly([[cx - 10, 10], [cx - 14, 0], [cx - 6, 8]], o.headpiece);
    d.poly([[cx + 10, 10], [cx + 14, 0], [cx + 6, 8]], o.headpiece);
    d.rect(cx - 9, 9, 18, 2, o.headpiece);
  }
}

export const PORTRAITS = {
  adventurer: { pal: 'red', bg: 2, hood: 1.4, hoodInner: 0.9, body: 1.4 },
  barrin: { pal: 'blue', bg: 2, body: 1, skin: 3, hair: 'bald', beard: 3, wizardHat: 1 },
  rival: { pal: 'purple', bg: 2, body: 0.8, skin: 3, hair: 'spiky', hairTone: 0.6, smile: true, collar: 3 },
  nissa: { pal: 'green', bg: 2, body: 1, skin: 3, ears: 'elf', cap: 2.6, capSymbol: true, hair: 'long', hairTone: 1 },
  chandra: { pal: 'red', bg: 2, body: 1, skin: 3, hair: 'fiery', hairTone: 3, collar: 1.4 },
  jace: { pal: 'blue', bg: 2, hood: 1, hoodInner: 0.6, eyes: 'glow', body: 1 },
  gideon: { pal: 'gold', bg: 2, body: 2.6, skin: 3, hair: 'short', hairTone: 0.6, armor: true },
  liliana: { pal: 'purple', bg: 2, body: 0.6, skin: 3, hair: 'long', hairTone: 0.4, headpiece: 1.4, collar: 0.4 },
  karn: { pal: 'grey', bg: 2, body: 1.4, skin: 2.8, hair: 'bald', metal: true, noBrows: true },
  urza: { pal: 'blue', bg: 2, body: 3, skin: 3, hair: 'short', hairTone: 3, beard: 3, circlet: 1.4, cape: 1 },
  mishra: { pal: 'orange', bg: 2, body: 1, skin: 3, beard: 0.6, turban: 3, mustache: 0.6 },
  bolas: { pal: 'purple', bg: 2, body: 1, skin: 1.6, horns: 2.6, dragon: true },
  // club members
  kid_cap: { pal: 'teal', bg: 2, body: 1, skin: 3, cap: 1, hair: 'short', hairTone: 0.6, smile: true },
  girl_pony: { pal: 'orange', bg: 2, body: 1, skin: 3, hair: 'pony', hairTone: 0.8, smile: true },
  glasses: { pal: 'blue', bg: 2, body: 1.4, skin: 3, hair: 'short', hairTone: 0.4, glasses: true },
  old_man: { pal: 'brown', bg: 2, body: 1, skin: 3, hair: 'bald', mustache: 3, beard: 3 },
  knight_m: { pal: 'gold', bg: 2, body: 2.6, skin: 3, helmet: 1.4, armor: true },
  goth: { pal: 'black', bg: 2, body: 0.6, skin: 3, hair: 'long', hairTone: 0.2, collar: 3 },
  wild: { pal: 'green', bg: 2, body: 1, skin: 3, hair: 'spiky', hairTone: 1, ears: 'elf' },
  smith: { pal: 'grey', bg: 2, body: 1, skin: 2.8, hair: 'short', hairTone: 0.4, beard: 0.6, glasses: true },
  hothead: { pal: 'red', bg: 2, body: 1, skin: 3, hair: 'spiky', hairTone: 1, smile: true },
  sailor: { pal: 'teal', bg: 2, body: 3, skin: 3, cap: 3, hair: 'short', hairTone: 1, collar: 1 },
  nun: { pal: 'gold', bg: 2, body: 3, skin: 3, hood: 3, hoodInner: 2.4, body2: 3 },
  ghoul: { pal: 'black', bg: 2, body: 0.6, hood: 0.6, hoodInner: 0.3, eyes: 'glow' },
};

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const cache = new Map();

export function portrait(name) {
  if (cache.has(name)) return cache.get(name);
  const spec = PORTRAITS[name] || PORTRAITS.adventurer;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = PS;
    c.height = PS;
    return c;
  };
  const sc = mk();
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  bust(drawer(sctx), spec);
  const sd = sctx.getImageData(0, 0, PS, PS).data;
  const out = mk();
  const octx = out.getContext('2d');
  const img = octx.createImageData(PS, PS);
  const pal = PAL[spec.pal].map(hexToRgb);
  const mask = (i) => sd[i * 4 + 3] >= 128;
  for (let y = 0; y < PS; y++) {
    for (let x = 0; x < PS; x++) {
      const i = y * PS + x;
      let tone;
      if (mask(i)) {
        tone = Math.max(0, Math.min(3, Math.floor((sd[i * 4] / 255) * 3 + BAYER[(y & 3) * 4 + (x & 3)])));
      } else {
        const edge = (x > 0 && mask(i - 1)) || (x < PS - 1 && mask(i + 1)) || (y > 0 && mask(i - PS)) || (y < PS - 1 && mask(i + PS));
        tone = edge ? 0 : spec.bg;
      }
      img.data.set([...pal[tone], 255], i * 4);
    }
  }
  octx.putImageData(img, 0, 0);
  cache.set(name, out);
  return out;
}

export function portraitColor(name) {
  const spec = PORTRAITS[name] || PORTRAITS.adventurer;
  return PAL[spec.pal][2];
}

export { rng };
