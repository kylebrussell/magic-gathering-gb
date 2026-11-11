// Text box + menu widget shared by every scene.

import { C } from './gfx/palette.js';
import { frame } from './gfx/draw.js';
import { drawText, wrap, sliceVisible, visibleLength, measure } from './gfx/font.js';
import { icon } from './gfx/sprites.js';
import { sfx } from './audio.js';

export const TEXT_SPEED = { slow: 1, normal: 2, fast: 4 };

// Default typing speed for every new TextBox (set from the save's options).
export const TEXT = { speed: 2 };
export function setTextSpeed(n) {
  TEXT.speed = n || 2;
}

export class TextBox {
  constructor(app) {
    this.app = app;
    this.mode = null; // 'msg' | 'menu' | 'custom'
    this.lines = [];
    this.shown = 0;
    this.arrow = false;
    this.menu = null;
    this._speed = null; // null = follow the TEXT setting
    this.custom = null;
    this.rect = { x: 0, y: 96, w: 160, h: 48 };
    this.label = null; // little title in the top border ("ADVENTURER")
  }

  // Typing speed: the global option unless this box was given its own.
  get speed() {
    return this._speed ?? TEXT.speed;
  }
  set speed(v) {
    this._speed = v;
  }

  clear() {
    this.mode = null;
    this.lines = [];
    this.menu = null;
    this.custom = null;
    this.arrow = false;
  }

  textWidth() {
    return this.rect.w - 16;
  }

  // Print text with the typewriter effect.
  //  opts.wait: wait for A/B at the end (shows ▼)
  //  opts.hold: frames to hold when not waiting
  async say(text, opts = {}) {
    const app = this.app;
    const pages = [];
    const lines = wrap(text, this.textWidth());
    const per = opts.lines || 2;
    for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
    for (let p = 0; p < pages.length; p++) {
      this.mode = 'msg';
      this.lines = pages[p];
      this.shown = 0;
      this.arrow = false;
      const total = this.lines.reduce((n, l) => n + visibleLength(l), 0);
      while (this.shown < total) {
        await app.frame();
        if (app.input.pressed.has('a') || app.input.pressed.has('b')) this.shown = total;
        else this.shown += opts.speed ?? this.speed;
      }
      const last = p === pages.length - 1;
      if (opts.wait) {
        this.arrow = true;
        await app.press(['a', 'b']);
        sfx('blip');
        this.arrow = false;
      } else if (!last) {
        await app.waitOrPress(Math.max(30, opts.hold ?? 30));
      } else if (opts.hold !== 0) {
        await app.waitOrPress(opts.hold ?? 30);
      }
    }
  }

  // Show text immediately (no typing, no wait).
  show(text) {
    this.mode = 'msg';
    this.lines = wrap(text, this.textWidth()).slice(0, 2);
    this.shown = 9999;
    this.arrow = false;
  }

  // Grid menu. options: strings or { label, disabled }.
  // Returns the chosen index, or -1 on B (if cancel allowed).
  async choose(options, opts = {}) {
    const app = this.app;
    const cols = opts.cols ?? 2;
    const items = options.map((o) => (typeof o === 'string' ? { label: o } : o));
    let cur = opts.start ?? items.findIndex((o) => !o.disabled);
    if (cur < 0) cur = 0;
    this.mode = 'menu';
    this.menu = { items, cols, cur, prompt: opts.prompt || null, colWidth: opts.colWidth };
    const onMove = opts.onMove || (() => {});
    onMove(cur);
    for (;;) {
      const b = await app.press(['up', 'down', 'left', 'right', 'a', 'b', 'start']);
      const n = items.length;
      let next = cur;
      if (b === 'left' && cur % cols > 0) next = cur - 1;
      if (b === 'right' && cur % cols < cols - 1 && cur + 1 < n) next = cur + 1;
      if (b === 'up' && cur - cols >= 0) next = cur - cols;
      if (b === 'down' && cur + cols < n) next = cur + cols;
      if (next !== cur) {
        cur = next;
        this.menu.cur = cur;
        sfx('cursor');
        onMove(cur);
      }
      if (b === 'a') {
        if (items[cur].disabled) {
          sfx('error');
          if (opts.onDisabled) {
            // explain why, then put the menu back
            const saved = this.menu;
            await opts.onDisabled(items[cur], cur);
            this.mode = 'menu';
            this.menu = saved;
          }
          continue;
        }
        sfx('select');
        this.menu.cur = cur;
        return cur;
      }
      if ((b === 'b' || b === 'start') && opts.cancel !== false) {
        sfx('back');
        return -1;
      }
    }
  }

  draw(ctx, opts = {}) {
    const { x, y, w, h } = this.rect;
    frame(ctx, x, y, w, h);
    if (this.label) {
      ctx.fillStyle = C.bg;
      const lw = this.label.length * 5 + 6;
      ctx.fillRect(x + 8, y, lw, 4);
      drawText(ctx, this.label, x + 11, y - 2, C.ink);
    }
    const tx = x + 8;
    const ty = y + 12;
    if (this.mode === 'msg') {
      let left = this.shown;
      this.lines.forEach((l, i) => {
        const n = visibleLength(l);
        const part = left >= n ? l : sliceVisible(l, Math.max(0, left));
        left -= n;
        drawText(ctx, part, tx, ty + i * 12, C.ink);
      });
      if (this.arrow && Math.floor(this.app.frameCount / 20) % 2 === 0) ctx.drawImage(icon('arrowDown'), x + w - 14, y + h - 10);
    } else if (this.mode === 'menu' && this.menu) {
      const m = this.menu;
      let oy = ty;
      if (m.prompt) {
        let p = m.prompt.toUpperCase();
        if (measure(p) > w - 16) {
          while (measure(p + '..') > w - 16 && p.length > 4) p = p.slice(0, -1);
          p += '..';
        }
        drawText(ctx, p, tx, oy, C.ink);
        oy += 12;
      }
      const colW = m.colWidth ?? Math.floor((w - 16) / m.cols);
      m.items.forEach((it, i) => {
        const ix = tx + (i % m.cols) * colW;
        const iy = oy + Math.floor(i / m.cols) * 12;
        drawText(ctx, it.label.toUpperCase(), ix + 7, iy, it.disabled ? C.grey : C.ink);
        if (i === m.cur) ctx.drawImage(icon('cursor'), ix, iy);
      });
    } else if (this.mode === 'custom' && this.custom) {
      this.custom(ctx, x, y, w, h);
    }
  }
}
