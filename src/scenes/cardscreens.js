// Card detail ("CHECK") screen and the scrolling card list used for hands,
// discards, library searches and the deck builder.

import { C } from '../gfx/palette.js';
import { frame, fill, rectOutline, typeLabel } from '../gfx/draw.js';
import { drawText, drawTextRight, drawTextCenter, wrap, manaSymbols, measure } from '../gfx/font.js';
import { icon, typeIcon } from '../gfx/sprites.js';
import { cardArt } from '../gfx/art.js';
import { cardColor, KEYWORD_SHORT, SET_NAMES, RARITY_NAMES } from '../data/cards.js';
import { TextBox } from '../ui.js';
import { sfx } from '../audio.js';

export function costText(d) {
  return manaSymbols(d.cost);
}

function typeLine(d) {
  const t = d.type.toUpperCase();
  return d.sub ? `${t} - ${d.sub.toUpperCase()}` : t;
}

export class CardDetail {
  // list: array of card defs (or { def, live }) to browse with left/right
  constructor(list, index = 0) {
    this.list = list.map((x) => (x.def ? x : { def: x }));
    this.index = index;
    this.scroll = 0;
  }

  get cur() {
    return this.list[this.index];
  }

  async run(app) {
    for (;;) {
      const b = await app.press(['a', 'b', 'left', 'right', 'up', 'down', 'start']);
      if (b === 'a' || b === 'b' || b === 'start') {
        sfx('back');
        return;
      }
      if (b === 'left' && this.index > 0) {
        this.index--;
        this.scroll = 0;
        sfx('cursor');
      }
      if (b === 'right' && this.index < this.list.length - 1) {
        this.index++;
        this.scroll = 0;
        sfx('cursor');
      }
      if (b === 'down') this.scroll++;
      if (b === 'up') this.scroll = Math.max(0, this.scroll - 1);
    }
  }

  draw(ctx, app) {
    const { def: d, live } = this.cur;
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 144);
    const ck = cardColor(d);
    ctx.drawImage(typeIcon(d, ck), 7, 7);
    drawText(ctx, d.name.toUpperCase(), 21, 9, C.ink);
    const cost = costText(d);
    if (cost) drawTextRight(ctx, cost, 153, 9, C.ink);
    // art
    fill(ctx, C.ink, 47, 21, 66, 50);
    ctx.drawImage(cardArt(d), 48, 22);
    // keywords on the left
    const kws = [...(live ? live.kw : d.kw || [])].filter((k) => KEYWORD_SHORT[k]);
    kws.slice(0, 5).forEach((k, i) => drawText(ctx, KEYWORD_SHORT[k] + '.', 8, 24 + i * 9, C.ink));
    // rarity + set on the right
    drawText(ctx, '★', 119, 24, d.rarity === 'R' ? C.orange : d.rarity === 'U' ? C.greyDark : C.grey);
    drawText(ctx, d.rarity, 127, 24, C.ink);
    drawText(ctx, d.set, 119, 34, C.greyDark);
    // type line
    drawTextCenter(ctx, typeLine(d), 80, 74, C.ink);
    // rules text
    const textLines = [];
    if (d.text) textLines.push(...wrap(d.text, 140));
    if (!d.text && d.type.includes('Creature')) textLines.push('');
    const maxLines = 5;
    const start = Math.min(this.scroll, Math.max(0, textLines.length - maxLines));
    this.scroll = start;
    textLines.slice(start, start + maxLines).forEach((l, i) => drawText(ctx, l, 10, 86 + i * 9, C.ink));
    if (start + maxLines < textLines.length) ctx.drawImage(icon('arrowDown'), 146, 128);
    if (start > 0) ctx.drawImage(icon('arrowUp'), 146, 84);
    if (d.type.includes('Creature')) {
      const p = live ? live.power : d.power;
      const t = live ? live.toughness : d.toughness;
      const s = d.pt && !live ? '*/*' : `${p}/${t}`;
      drawTextRight(ctx, `PT ${s}`, 152, 132, C.ink);
    }
    if (this.list.length > 1) {
      drawText(ctx, `${this.index + 1}/${this.list.length}`, 8, 132, C.greyDark);
      if (this.index > 0) ctx.drawImage(icon('arrowLeft'), 2, 44);
      if (this.index < this.list.length - 1) ctx.drawImage(icon('arrowRight'), 155, 44);
    }
  }
}

// Generic card list.
//   items: [{ def, right?: string, dim?: bool, tag?: string }]
//   actions(item, i): array of submenu labels (or null for none)
//   handle(item, label, i, list): async → value to return, or undefined to stay
export class CardList {
  constructor(opts) {
    this.title = opts.title || '';
    this.items = opts.items;
    this.prompt = opts.prompt || 'SELECT A CARD';
    this.actions = opts.actions || (() => ['CHECK', 'BACK']);
    this.handle = opts.handle || (async () => undefined);
    this.cancel = opts.cancel !== false;
    this.cur = opts.start || 0;
    this.top = 0;
    this.rows = 5;
    this.box = null;
    this.onMove = opts.onMove || null;
    this.headerRight = opts.headerRight || null;
    this.extraKeys = opts.extraKeys || null; // async (button, item, i) → result|undefined
    this.emptyText = opts.emptyText || 'NO CARDS.';
  }

  async run(app) {
    this.box = new TextBox(app);
    this.box.rect = { x: 0, y: 96, w: 96, h: 48 };
    this.box.show(this.prompt);
    for (;;) {
      this.box.show(this.prompt);
      const keys = ['up', 'down', 'a', 'b', 'start', 'left', 'right', 'select'];
      const b = await app.press(keys);
      const n = this.items.length;
      if (b === 'up' && this.cur > 0) {
        this.cur--;
        sfx('cursor');
      } else if (b === 'down' && this.cur < n - 1) {
        this.cur++;
        sfx('cursor');
      } else if (b === 'left' && n) {
        this.cur = Math.max(0, this.cur - this.rows);
        sfx('cursor');
      } else if (b === 'right' && n) {
        this.cur = Math.min(n - 1, this.cur + this.rows);
        sfx('cursor');
      } else if ((b === 'b' || b === 'start') && this.cancel) {
        sfx('back');
        return null;
      } else if (b === 'a' && n) {
        sfx('select');
        const item = this.items[this.cur];
        const acts = this.actions(item, this.cur);
        if (!acts || !acts.length) {
          const r = await this.handle(item, null, this.cur, this);
          if (r !== undefined) return r;
          continue;
        }
        const choice = await this.box.choose(acts.map((a) => (typeof a === 'string' ? { label: a } : a)), { cols: 2, colWidth: 38 });
        if (choice < 0) continue;
        const label = typeof acts[choice] === 'string' ? acts[choice] : acts[choice].label;
        if (label === 'BACK') continue;
        if (label === 'CHECK') {
          await app.run(new CardDetail(this.items.map((it) => ({ def: it.def, live: it.live })), this.cur));
          continue;
        }
        const r = await this.handle(item, label, this.cur, this);
        if (r !== undefined) return r;
      } else if (this.extraKeys && n) {
        const r = await this.extraKeys(b, this.items[this.cur], this.cur, this);
        if (r !== undefined) return r;
      }
      if (this.cur < this.top) this.top = this.cur;
      if (this.cur >= this.top + this.rows) this.top = this.cur - this.rows + 1;
      if (this.onMove) this.onMove(this.items[this.cur], this.cur);
    }
  }

  draw(ctx, app) {
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 96);
    drawText(ctx, this.title.toUpperCase(), 8, 6, C.ink);
    const n = this.items.length;
    const hr = this.headerRight ? this.headerRight() : n ? `${this.cur + 1}/ ${n}` : '';
    drawTextRight(ctx, hr, 152, 6, C.ink);
    if (this.cur < this.top) this.top = this.cur;
    if (this.cur >= this.top + this.rows) this.top = this.cur - this.rows + 1;
    if (!n) drawText(ctx, this.emptyText, 20, 40, C.greyDark);
    for (let i = 0; i < this.rows; i++) {
      const idx = this.top + i;
      if (idx >= n) break;
      const it = this.items[idx];
      const y = 17 + i * 15;
      const d = it.def;
      if (it.unknown) {
        fill(ctx, C.ink, 13, y - 2, 11, 11);
        fill(ctx, C.grey, 14, y - 1, 9, 9);
        drawText(ctx, '?', 17, y, C.bg);
      } else ctx.drawImage(typeIcon(d, cardColor(d)), 13, y - 2);
      const name = (it.label || d.name).toUpperCase();
      const color = it.dim ? C.grey : C.ink;
      let x = 27;
      const maxW = this.items.some((x) => x.right) ? 92 : 120;
      let shown = name;
      while (measure(shown) > maxW && shown.length > 3) shown = shown.slice(0, -1);
      x += drawText(ctx, shown, x, y, color) + 3;
      const cost = costText(d);
      if (cost && !it.hideCost && x + 8 * (cost.match(/\{/g) || []).length < 150 - (it.right ? measure(it.right) + 4 : 0)) drawText(ctx, cost, x, y, color);
      if (it.right) drawTextRight(ctx, it.right, 152, y, it.dim ? C.grey : C.ink);
      if (it.tag) drawText(ctx, it.tag, 5, y, C.red);
      if (idx === this.cur && (!this.box || this.box.mode !== 'menu' || Math.floor(app.frameCount / 16) % 2 === 0)) ctx.drawImage(icon('cursor'), 6, y);
    }
    if (this.top + this.rows < n) ctx.drawImage(icon('arrowDown'), 145, 88);
    if (this.top > 0) ctx.drawImage(icon('arrowUp'), 145, 13);
    if (this.box) this.box.draw(ctx);
    const it = this.items[this.cur];
    fill(ctx, C.bg, 96, 96, 64, 48);
    if (it && it.unknown) {
      fill(ctx, C.grey, 96, 96, 64, 48);
      drawTextCenter(ctx, '?', 128, 116, C.bg);
    } else if (it) ctx.drawImage(cardArt(it.def), 96, 96);
  }
}

export function rarityName(r) {
  return RARITY_NAMES[r] || '';
}
export function setName(s) {
  return SET_NAMES[s] || s;
}
export { typeLabel, rectOutline };
