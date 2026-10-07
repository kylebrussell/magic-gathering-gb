// Procedural 64x48 card art in four-tone Game Boy Color style.
//
// Each card's art spec is { scene, subj, pal?, ... }. A scene paints a
// grayscale background that gets Bayer-dithered; the subject is painted on a
// separate layer, outlined in the darkest tone, and composited on top. The
// result is mapped through a four-colour palette.

import { ART_PALETTES } from './palette.js';
import { cardColor } from '../data/cards.js';
import { SUBJECTS } from './subjects.js';

export const AW = 64;
export const AH = 48;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const LAND_PAL = { plains: 'gold', island: 'sea', swamp: 'swamp', mountain: 'fire', forest: 'forest' };

export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (Math.imul(s, 31) + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Drawing helper working in "tones": 0 (darkest) .. 3 (lightest).
export function drawer(ctx) {
  const g = (t) => {
    const v = Math.round(Math.max(0, Math.min(3, t)) * 85);
    return `rgb(${v},${v},${v})`;
  };
  const d = {
    ctx,
    g,
    rect(x, y, w, h, t) {
      ctx.fillStyle = g(t);
      ctx.fillRect(x, y, w, h);
    },
    px(x, y, t) {
      ctx.fillStyle = g(t);
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    },
    circ(x, y, r, t) {
      ctx.fillStyle = g(t);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
    },
    ell(x, y, rx, ry, t, rot = 0) {
      ctx.fillStyle = g(t);
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
      ctx.fill();
    },
    poly(pts, t) {
      ctx.fillStyle = g(t);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    },
    path(str, t) {
      ctx.fillStyle = g(t);
      ctx.fill(new Path2D(str));
    },
    stroke(str, t, w = 1) {
      ctx.strokeStyle = g(t);
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(str));
    },
    line(x1, y1, x2, y2, t, w = 1) {
      ctx.strokeStyle = g(t);
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
    arc(x, y, r, a0, a1, t, w = 1) {
      ctx.strokeStyle = g(t);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(x, y, r, a0, a1);
      ctx.stroke();
    },
    vgrad(y0, y1, t0, t1, x = 0, w = AW) {
      const gr = ctx.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, g(t0));
      gr.addColorStop(1, g(t1));
      ctx.fillStyle = gr;
      ctx.fillRect(x, y0, w, y1 - y0);
    },
    rgrad(x, y, r0, r1, t0, t1) {
      const gr = ctx.createRadialGradient(x, y, r0, x, y, r1);
      gr.addColorStop(0, g(t0));
      gr.addColorStop(1, g(t1));
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, AW, AH);
    },
    glow(x, y, r, t, alpha = 1) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = Math.round(t * 85);
      gr.addColorStop(0, `rgba(${v},${v},${v},${alpha})`);
      gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    },
    alpha(a, fn) {
      const old = ctx.globalAlpha;
      ctx.globalAlpha = a;
      fn();
      ctx.globalAlpha = old;
    },
    at(tx, ty, fn, sx = 1, sy = sx, rot = 0) {
      ctx.save();
      ctx.translate(tx, ty);
      if (rot) ctx.rotate(rot);
      ctx.scale(sx, sy);
      fn();
      ctx.restore();
    },
    // Fill everything below a height function y = f(x).
    ridge(f, t, from = 0, to = AW) {
      ctx.fillStyle = g(t);
      ctx.beginPath();
      ctx.moveTo(from, AH);
      for (let x = from; x <= to; x++) ctx.lineTo(x, f(x));
      ctx.lineTo(to, AH);
      ctx.closePath();
      ctx.fill();
    },
  };
  return d;
}

// ---------------------------------------------------------------------------
// Backgrounds

function jag(r, base, amp, step = 4) {
  const pts = [];
  for (let x = -step; x <= AW + step; x += step) pts.push([x, base - r() * amp]);
  return (x) => {
    const i = Math.floor((x + step) / step);
    const a = pts[Math.max(0, i)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = (x - a[0]) / step;
    return a[1] + (b[1] - a[1]) * t;
  };
}

function smooth(r, base, amp, waves = 3) {
  const ph = [r() * 6, r() * 6, r() * 6];
  return (x) => base - amp * (0.5 + 0.25 * Math.sin(x / (10 + waves) + ph[0]) + 0.15 * Math.sin(x / 5.3 + ph[1]) + 0.1 * Math.sin(x / 2.7 + ph[2]));
}

const SCENES = {
  plains(d, r) {
    d.vgrad(0, 30, 3, 2.3);
    d.glow(46, 11, 12, 3, 0.9);
    d.circ(46, 11, 5, 3);
    d.ridge(smooth(r, 31, 5), 1.7);
    d.ridge(smooth(r, 35, 3), 2.2);
    for (let y = 37; y < AH; y += 3) d.rect(0, y, AW, 1, 1.8);
    for (let i = 0; i < 9; i++) {
      const x = r() * AW;
      const y = 36 + r() * 12;
      d.line(x, y, x - 1, y - 3, 1.2);
      d.line(x + 1, y, x + 2, y - 2, 1.2);
    }
  },
  island(d, r) {
    d.vgrad(0, 26, 3, 2.4);
    for (let i = 0; i < 3; i++) d.ell(10 + r() * 44, 6 + r() * 10, 7 + r() * 4, 2, 3);
    d.vgrad(26, AH, 2, 1.2);
    d.path('M4 27 C10 14 18 10 24 12 C30 9 36 16 44 27 Z', 0.9);
    d.path('M40 27 C46 21 52 21 58 27 Z', 1.4);
    for (let y = 29; y < AH; y += 3) for (let x = (y * 7) % 9; x < AW; x += 9 + (y % 4)) d.rect(x, y, 4, 1, 2.9);
  },
  swamp(d, r) {
    d.vgrad(0, AH, 1.4, 0.6);
    d.alpha(0.6, () => {
      d.rect(0, 22, AW, 3, 2.2);
      d.rect(0, 30, AW, 2, 2);
    });
    d.ridge(smooth(r, 36, 4), 0.5);
    for (let y = 40; y < AH; y += 2) for (let x = (y * 5) % 11; x < AW; x += 11) d.rect(x, y, 3, 1, 1.4);
    for (const tx of [6, 54, 26]) {
      const h = 20 + r() * 12;
      d.poly([[tx - 2, 44], [tx + 2, 44], [tx + 1, 44 - h], [tx - 1, 44 - h]], 0);
      for (let i = 0; i < 4; i++) {
        const by = 44 - h * (0.4 + r() * 0.5);
        const dir = r() < 0.5 ? -1 : 1;
        d.line(tx, by, tx + dir * (5 + r() * 6), by - 3 - r() * 4, 0);
      }
    }
  },
  mountain(d, r) {
    // cream and orange sky bands like the video's Mountain
    for (let y = 0; y < 24; y++) d.rect(0, y, AW, 1, y % 5 < 2 ? 2.5 : 3 - y / 30);
    const far = jag(r, 22, 10, 5);
    d.ridge(far, 1.2);
    d.ridge((x) => far(x) + 2, 1);
    for (let x = 0; x < AW; x++) if (r() < 0.6) d.px(x, far(x), 2);
    const near = jag(r, 34, 10, 6);
    d.ridge(near, 0);
    for (let x = 0; x < AW; x += 1) {
      const y = near(x);
      d.px(x, y, 1);
      if (r() < 0.5) d.px(x, y + 1, 2);
      if (r() < 0.25) d.line(x, y + 2, x - 2, y + 6, 1);
    }
  },
  forest(d, r) {
    d.vgrad(0, AH, 2.8, 2.2);
    for (let i = 0; i < 14; i++) {
      const x = r() * AW;
      const w = 1 + r() * 2;
      d.rect(x, 0, w, AH, 1.6);
    }
    for (let i = 0; i < 9; i++) {
      const x = r() * 70 - 4;
      const w = 2 + r() * 5;
      d.poly([[x, 0], [x + w, 0], [x + w + 1, AH], [x - 1, AH]], 0);
      d.rect(x + 1, 6 + r() * 30, 1, 3, 1);
    }
    for (let x = 0; x < AW; x += 2) d.rect(x, 0, 2, 2 + r() * 5, 0.6);
    d.rect(0, 44, AW, 4, 0.8);
  },
  sky(d, r) {
    d.vgrad(0, AH, 3, 1.9);
    for (let i = 0; i < 4; i++) {
      const x = r() * AW;
      const y = 8 + r() * 34;
      d.ell(x, y, 8 + r() * 6, 3, 3);
      d.ell(x + 4, y - 2, 5, 3, 3);
      d.rect(x - 8, y + 2, 16, 1, 2.5);
    }
  },
  sea(d, r) {
    d.vgrad(0, 18, 3, 2.5);
    d.vgrad(18, AH, 2, 0.9);
    for (let y = 20; y < AH; y += 3) {
      const ph = r() * 10;
      for (let x = 0; x < AW; x++) if (Math.sin(x / 3 + ph + y) > 0.6) d.px(x, y + Math.round(Math.sin(x / 4 + ph)), 2.8);
    }
  },
  paradise(d, r) {
    for (let y = 0; y < 14; y++) for (let x = (y % 2) * 2; x < AW; x += 4) d.px(x, y, 2.6);
    d.vgrad(0, 14, 3, 2.8);
    for (let y = 0; y < 14; y += 2) for (let x = (y % 4); x < AW; x += 4) d.px(x, y, 2.4);
    d.rect(0, 14, AW, 2, 3);
    d.vgrad(16, AH, 2.2, 1.6);
    d.path('M8 30 C14 20 22 18 28 22 C36 18 46 22 56 32 L8 32 Z', 1);
    d.path('M24 22 L28 12 L33 12 L36 21 Z', 0.4);
    for (let i = 0; i < 6; i++) d.circ(29 + r() * 4, 10 - i * 2, 2 + i * 0.4, 0);
    for (let y = 34; y < AH; y += 3) for (let x = (y * 3) % 7; x < AW; x += 7) d.rect(x, y, 3, 1, 2.8);
  },
  night(d, r) {
    d.vgrad(0, AH, 0.4, 1.3);
    for (let i = 0; i < 22; i++) d.px(r() * AW, r() * 30, 2.6 + r() * 0.4);
    d.circ(50, 10, 6, 3);
    d.circ(47, 8, 5, 0.6);
    d.ridge(smooth(r, 42, 6), 0.2);
  },
  fire(d, r) {
    d.vgrad(0, AH, 0.6, 2.6);
    for (let i = 0; i < 16; i++) {
      const x = r() * AW;
      const h = 10 + r() * 26;
      const w = 4 + r() * 6;
      d.path(`M${x - w} ${AH} Q${x - w / 2} ${AH - h / 2} ${x} ${AH - h} Q${x + w / 2} ${AH - h / 2} ${x + w} ${AH} Z`, 1.8 + r() * 1.2);
    }
  },
  storm(d, r) {
    d.vgrad(0, AH, 1.2, 2.4);
    for (let i = 0; i < 8; i++) d.ell(r() * AW, r() * 16, 10 + r() * 8, 4 + r() * 3, 0.6 + r() * 0.5);
    for (let i = 0; i < 26; i++) {
      const x = r() * AW;
      const y = 14 + r() * 30;
      d.line(x, y, x - 2, y + 4, 2.4);
    }
  },
  cave(d, r) {
    d.rect(0, 0, AW, AH, 0.4);
    d.glow(32, 22, 26, 2.6, 1);
    d.ell(32, 24, 18, 16, 2);
    d.ell(32, 25, 14, 13, 2.6);
    for (let i = 0; i < 30; i++) d.px(r() * AW, r() * AH, 1);
    d.ridge(smooth(r, 42, 3), 0.8);
  },
  castle(d, r) {
    d.vgrad(0, AH, 3, 2.2);
    const base = 34;
    d.rect(6, base - 10, 52, 12, 1.2);
    for (const [x, h] of [[6, 22], [24, 28], [44, 20], [54, 24]]) {
      d.rect(x, base - h, 8, h, 1);
      for (let cx = x; cx < x + 8; cx += 3) d.rect(cx, base - h - 2, 2, 2, 1);
      d.rect(x + 3, base - h + 5, 2, 3, 0.4);
    }
    for (let cx = 6; cx < 58; cx += 4) d.rect(cx, base - 12, 2, 2, 1.2);
    d.rect(0, base, AW, AH - base, 1.8);
    for (let y = base + 3; y < AH; y += 3) d.rect(0, y, AW, 1, 1.5);
  },
  desert(d, r) {
    d.vgrad(0, 30, 3, 2.4);
    d.circ(14, 10, 7, 3);
    d.glow(14, 10, 14, 3, 0.8);
    d.ridge(smooth(r, 30, 6), 2);
    d.ridge(smooth(r, 37, 5), 1.6);
    d.ridge(smooth(r, 43, 4), 2.2);
  },
  void(d, r) {
    d.rgrad(32, 22, 2, 40, 2.8, 0.6);
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2;
      const dist = 12 + r() * 24;
      d.px(32 + Math.cos(a) * dist, 22 + Math.sin(a) * dist * 0.8, 3);
    }
  },
  field(d, r) {
    d.vgrad(0, 30, 3, 2.5);
    d.ell(14, 8, 8, 2, 3);
    d.ridge(smooth(r, 30, 3), 1.9);
    for (let y = 32; y < AH; y += 2) d.rect(0, y, AW, 1, 1.6 + ((y / 2) % 2) * 0.4);
  },
  temple(d, r) {
    d.rect(0, 0, AW, AH, 1.4);
    d.glow(32, 18, 30, 2.6, 0.8);
    for (const x of [4, 18, 40, 54]) {
      d.rect(x, 4, 6, 40, 2.6);
      d.rect(x + 4, 4, 2, 40, 2);
      d.rect(x - 1, 2, 8, 3, 2.9);
      d.rect(x - 1, 42, 8, 3, 2.2);
    }
    d.rect(0, 0, AW, 2, 2.2);
    d.rect(0, 44, AW, 4, 1.8);
  },
  dungeon(d, r) {
    d.rect(0, 0, AW, AH, 1.1);
    for (let y = 0; y < AH; y += 5) {
      d.rect(0, y, AW, 1, 0.5);
      for (let x = (y / 5) % 2 ? 0 : 5; x < AW; x += 10) d.rect(x, y, 1, 5, 0.5);
    }
    d.glow(10, 14, 16, 2.6, 0.7);
    d.glow(54, 14, 16, 2.6, 0.7);
    d.rect(0, 42, AW, 6, 0.6);
  },
  grave(d, r) {
    d.vgrad(0, AH, 0.8, 1.4);
    d.circ(52, 9, 5, 2.8);
    d.ridge(smooth(r, 36, 3), 0.5);
    for (const [x, h] of [[6, 10], [18, 8], [46, 11], [58, 7]]) {
      d.path(`M${x - 3} ${38} L${x - 3} ${38 - h + 3} Q${x} ${38 - h - 1} ${x + 3} ${38 - h + 3} L${x + 3} 38 Z`, 1.8);
      d.rect(x - 1, 38 - h + 4, 2, 1, 0.8);
    }
  },
  wood(d, r) {
    d.vgrad(0, AH, 2.2, 1.4);
    for (let i = 0; i < 40; i++) d.ell(r() * AW, r() * 22, 4 + r() * 4, 3 + r() * 2, 0.6 + r() * 1.2);
    for (let i = 0; i < 5; i++) {
      const x = r() * AW;
      d.rect(x, 14, 3 + r() * 3, 34, 0.3);
    }
    d.rect(0, 42, AW, 6, 0.9);
  },
  snow(d, r) {
    d.vgrad(0, 32, 2.6, 3);
    for (let i = 0; i < 6; i++) {
      const x = r() * AW;
      d.poly([[x, 18 + r() * 6], [x - 5, 32], [x + 5, 32]], 1.2);
    }
    d.ridge(smooth(r, 33, 4), 3);
    d.alpha(0.5, () => d.ridge(smooth(r, 40, 3), 2.3));
    for (let i = 0; i < 24; i++) d.px(r() * AW, r() * AH, 3);
  },
  ruins(d, r) {
    d.vgrad(0, AH, 2.8, 2);
    for (const [x, h] of [[6, 26], [20, 14], [44, 30], [56, 18]]) {
      d.rect(x, 40 - h, 6, h, 1.4);
      d.rect(x + 4, 40 - h, 2, h, 1);
      d.poly([[x, 40 - h], [x + 6, 40 - h], [x + 4, 40 - h - 3], [x + 2, 40 - h - 1]], 1.4);
    }
    d.rect(0, 40, AW, 8, 1.6);
    for (let i = 0; i < 8; i++) d.rect(r() * AW, 40 + r() * 6, 3, 2, 1);
  },
  workshop(d, r) {
    d.rect(0, 0, AW, AH, 1);
    const gear = (x, y, rad, t) => {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        d.circ(x + Math.cos(a) * rad, y + Math.sin(a) * rad, 2, t);
      }
      d.circ(x, y, rad, t);
      d.circ(x, y, rad / 3, 0.6);
    };
    gear(12, 12, 9, 1.6);
    gear(52, 30, 11, 1.5);
    gear(26, 40, 6, 1.7);
    d.rect(0, 44, AW, 4, 0.5);
  },
  mine(d, r) {
    d.rect(0, 0, AW, AH, 0.3);
    d.glow(32, 24, 16, 1.6, 1);
    d.rect(4, 4, 6, 44, 1.6);
    d.rect(54, 4, 6, 44, 1.6);
    d.rect(4, 2, 56, 6, 1.8);
    d.line(14, AH, 30, 26, 1.4, 1);
    d.line(50, AH, 34, 26, 1.4, 1);
    for (let y = 30; y < AH; y += 4) d.line(30 - (y - 26) * 0.8, y, 34 + (y - 26) * 0.8, y, 1.2);
  },
  fog(d, r) {
    d.rect(0, 0, AW, AH, 2.5);
    for (let y = 0; y < AH; y += 4) d.alpha(0.7, () => d.rect(0, y, AW, 2, y % 8 ? 2.9 : 2.2));
  },
};

// ---------------------------------------------------------------------------
// Compositing

function quantizeTone(gray, x, y) {
  const t = (gray / 255) * 3;
  return Math.max(0, Math.min(3, Math.floor(t + BAYER[(y & 3) * 4 + (x & 3)])));
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function layer() {
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx, d: drawer(ctx) };
}

// Paint scene + subject and return tone indices (Uint8Array, 0..3).
function renderTones(spec, seed) {
  const r = rng(seed);
  const bg = layer();
  const scene = SCENES[spec.scene] || SCENES.void;
  scene(bg.d, r, spec);
  const subj = layer();
  const fn = spec.subj && SUBJECTS[spec.subj];
  if (fn) fn(subj.d, r, spec);
  const bd = bg.ctx.getImageData(0, 0, AW, AH).data;
  const sd = subj.ctx.getImageData(0, 0, AW, AH).data;
  const tones = new Uint8Array(AW * AH);
  const mask = new Uint8Array(AW * AH);
  for (let i = 0; i < AW * AH; i++) mask[i] = sd[i * 4 + 3] >= 128 ? 1 : 0;
  for (let y = 0; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      const i = y * AW + x;
      if (mask[i]) {
        tones[i] = quantizeTone(sd[i * 4], x, y);
      } else {
        const edge = !spec.noOutline && ((x > 0 && mask[i - 1]) || (x < AW - 1 && mask[i + 1]) || (y > 0 && mask[i - AW]) || (y < AH - 1 && mask[i + AW]));
        tones[i] = edge ? 0 : quantizeTone(bd[i * 4], x, y);
      }
    }
  }
  return tones;
}

function paletteFor(d) {
  const a = d.art;
  if (a.pal) return ART_PALETTES[a.pal];
  if (d.type.includes('Land') && LAND_PAL[a.scene]) return ART_PALETTES[LAND_PAL[a.scene]];
  if (a.subj === 'gem' && a.gem) return ART_PALETTES[{ W: 'gold', U: 'sea', B: 'purple', R: 'fire', G: 'forest' }[a.gem]];
  return ART_PALETTES[cardColor(d)] || ART_PALETTES.A;
}

const artCache = new Map();

export function cardArt(d) {
  let c = artCache.get(d.id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(AW, AH);
  const a = d.art;
  if (a.scene === 'dual') {
    const ta = renderTones({ scene: a.a }, d.id + 'a');
    const tb = renderTones({ scene: a.b }, d.id + 'b');
    const pa = ART_PALETTES[LAND_PAL[a.a]].map(hexToRgb);
    const pb = ART_PALETTES[LAND_PAL[a.b]].map(hexToRgb);
    for (let y = 0; y < AH; y++) {
      for (let x = 0; x < AW; x++) {
        const i = y * AW + x;
        const diag = x + y * 0.6 - 46;
        const useA = diag < 0;
        const col = Math.abs(diag) < 1 ? [0, 0, 0] : useA ? pa[ta[i]] : pb[tb[i]];
        img.data.set([...col, 255], i * 4);
      }
    }
  } else {
    const tones = renderTones(a, d.id);
    const pal = paletteFor(d).map(hexToRgb);
    for (let i = 0; i < AW * AH; i++) img.data.set([...pal[tones[i]], 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  artCache.set(d.id, c);
  return c;
}

// Render an arbitrary spec with a named palette (used for portraits / scenery).
export function renderSpec(spec, palName, seed = 'x', w = AW, h = AH) {
  const tones = renderTones(spec, seed);
  const pal = ART_PALETTES[palName].map(hexToRgb);
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(AW, AH);
  for (let i = 0; i < AW * AH; i++) img.data.set([...pal[tones[i]], 255], i * 4);
  ctx.putImageData(img, 0, 0);
  if (w === AW && h === AH) return c;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(c, Math.round((w - AW) / 2), Math.round((h - AH) / 2));
  return out;
}

export { SCENES };
