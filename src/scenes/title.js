// Title screen.

import { C } from '../gfx/palette.js';
import { fill, frame } from '../gfx/draw.js';
import { drawText, drawTextCenter, drawTextOutline } from '../gfx/font.js';
import { watermark } from '../gfx/sprites.js';
import { cardArt } from '../gfx/art.js';
import { CARDS } from '../data/cards.js';
import { TextBox } from '../ui.js';
import { playMusic, sfx } from '../audio.js';

// Chunky 5x7 letters for the logo, drawn at 2x.
const LOGO = {
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
};

function drawLogo(ctx, cx, y, t) {
  const word = 'MAGIC';
  const s = 3;
  const lw = 5 * s + s;
  const x0 = Math.round(cx - (word.length * lw - s) / 2);
  // shadow + outline + face, with a sheen sweeping across
  for (const pass of ['shadow', 'outline', 'face']) {
    [...word].forEach((ch, i) => {
      const rows = LOGO[ch];
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) {
          if (row[rx] !== '#') continue;
          const px = x0 + i * lw + rx * s;
          const py = y + ry * s;
          if (pass === 'shadow') {
            ctx.fillStyle = '#601000';
            ctx.fillRect(px + 2, py + 2, s, s);
          } else if (pass === 'outline') {
            ctx.fillStyle = '#200000';
            ctx.fillRect(px - 1, py - 1, s + 2, s + 2);
          } else {
            const sheen = Math.abs(((px - (t % 200)) % 200) - 0) < 6;
            ctx.fillStyle = sheen ? '#fff8d0' : ry < 3 ? '#f8b030' : ry < 5 ? '#f07818' : '#d84810';
            ctx.fillRect(px, py, s, s);
          }
        }
      });
    });
  }
}

export class TitleScene {
  constructor(canContinue) {
    this.manualFade = true;
    this.canContinue = canContinue;
    this.t = 0;
    this.stage = 'press';
    this.fan = ['shivan_dragon', 'serra_angel', 'lightning_bolt', 'birds_of_paradise', 'black_lotus'].map((id) => CARDS[id]);
  }

  update() {
    this.t++;
  }

  async run(app) {
    this.box = new TextBox(app);
    playMusic('title');
    await app.fadeIn(16);
    await app.press(['start', 'a']);
    sfx('select');
    this.stage = 'menu';
    const opts = this.canContinue ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];
    this.box.rect = { x: 40, y: 104, w: 80, h: opts.length * 12 + 16 };
    for (;;) {
      const i = await this.box.choose(opts, { cols: 1, cancel: true });
      if (i < 0) {
        this.stage = 'press';
        await app.press(['start', 'a']);
        this.stage = 'menu';
        continue;
      }
      const pick = opts[i];
      if (pick === 'NEW GAME' && this.canContinue) {
        this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
        const ok = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: 'ERASE YOUR SAVED GAME?', start: 1 });
        this.box.rect = { x: 40, y: 104, w: 80, h: opts.length * 12 + 16 };
        if (ok !== 0) continue;
      }
      await app.fadeOut(16);
      return pick === 'CONTINUE' ? 'continue' : 'new';
    }
  }

  draw(ctx, app) {
    fill(ctx, C.bg);
    // big faint watermark
    const wm = watermark();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(wm, 0, 0, wm.width, wm.height, 53, 2, wm.width * 2, wm.height * 2);
    ctx.globalAlpha = 1;
    drawLogo(ctx, 80, 12, this.t);
    drawTextCenter(ctx, 'THE GATHERING', 80, 38, C.dark);
    // a fan of cards
    this.fan.forEach((d, i) => {
      const x = 8 + i * 30;
      const y = 52 + Math.abs(i - 2) * 4 + Math.round(Math.sin((this.t + i * 20) / 30) * 1.5);
      ctx.fillStyle = C.ink;
      ctx.fillRect(x - 1, y - 1, 26, 34);
      ctx.fillStyle = '#e8e4d4';
      ctx.fillRect(x, y, 24, 32);
      ctx.drawImage(cardArt(d), 20, 8, 24, 24, x + 1, y + 1, 22, 22);
      ctx.fillStyle = '#585848';
      ctx.fillRect(x + 1, y + 25, 22, 5);
    });
    if (this.stage === 'press') {
      if (Math.floor(this.t / 30) % 2 === 0) drawTextCenter(ctx, 'PRESS START', 80, 108, C.ink);
      drawTextCenter(ctx, 'A FAN-MADE TRIBUTE', 80, 126, C.greyDark);
      drawTextCenter(ctx, 'TO THE 1993 CARD GAME', 80, 135, C.greyDark);
    } else {
      this.box.draw(ctx);
    }
  }
}
