// Start menu, deck builder, album, boosters, shop, medals, name entry,
// starter choice, options and credits.

import { C, CARD_COLORS } from '../gfx/palette.js';
import { fill, frame, popupCard, typeLabel, banner } from '../gfx/draw.js';
import { drawText, drawTextRight, drawTextCenter, drawTextOutline, measure, wrap, manaSymbols } from '../gfx/font.js';
import { icon, typeIcon, medalSprite } from '../gfx/sprites.js';
import { cardArt } from '../gfx/art.js';
import { portrait } from '../gfx/portraits.js';
import { CARDS, cardColor } from '../data/cards.js';
import { STARTERS, deckSize } from '../data/decks.js';
import { PACKS, openPack } from '../data/sets.js';
import { MEDALS } from '../data/world.js';
import { manaValue } from '../engine/mana.js';
import { TextBox } from '../ui.js';
import { CardDetail, CardList } from './cardscreens.js';
import { addCards, owned, deckCount, deckProblem, writeSave } from '../save.js';
import { playMusic, sfx, audioSettings } from '../audio.js';

// ---------------------------------------------------------------------------
// Start menu (overlay)

export class StartMenu {
  constructor(options) {
    this.overlay = true;
    this.options = options;
  }
  async run(app) {
    this.box = new TextBox(app);
    const h = this.options.length * 12 + 16;
    this.box.rect = { x: 88, y: 0, w: 72, h };
    sfx('select');
    const i = await this.box.choose(this.options, { cols: 1 });
    return i < 0 ? null : this.options[i];
  }
  draw(ctx) {
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Status

export class StatusScene {
  constructor(save) {
    this.save = save;
  }
  async run(app) {
    await app.press(['a', 'b', 'start']);
    sfx('back');
  }
  draw(ctx, app) {
    const s = this.save;
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 144);
    ctx.drawImage(portrait('adventurer'), 8, 8);
    drawText(ctx, s.name, 62, 10, C.ink);
    drawText(ctx, `GOLD   ${s.gold}`, 62, 22, C.ink);
    drawText(ctx, `WINS   ${s.stats.wins}`, 62, 32, C.ink);
    drawText(ctx, `LOSSES ${s.stats.losses}`, 62, 42, C.ink);
    const kinds = Object.keys(s.collection).length;
    const total = Object.values(CARDS).filter((d) => !d.basic).length;
    drawText(ctx, `CARDS  ${kinds}/${total}`, 62, 52, C.ink);
    const mins = Math.floor((s.playTime || 0) / 60);
    drawText(ctx, `TIME   ${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, 8, 62, C.ink);
    drawText(ctx, 'MEDALS', 8, 78, C.ink);
    MEDALS.forEach((m, i) => {
      const x = 12 + i * 24;
      const got = s.medals.includes(m.id);
      if (got) ctx.drawImage(medalSprite(m.color, m.id), x - 4, 86);
      else {
        ctx.strokeStyle = C.grey;
        ctx.beginPath();
        ctx.arc(x + 8.5, 102.5, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    if (s.flags.champion) drawTextCenter(ctx, '★ PLANESWALKER ★', 80, 124, C.orange);
  }
}

// ---------------------------------------------------------------------------
// How to play

const HELP_PAGES = [
  ['CONTROLS', 'D-PAD  MOVE AND CHOOSE', 'A      OK, TALK, CAST', 'B      BACK, CANCEL', 'START  MENU', 'SELECT CARD INFO', '', 'KEYBOARD: ARROWS, Z=A,', 'X=B, ENTER=START,', 'SHIFT=SELECT'],
  ['THE GOAL', 'EACH PLAYER STARTS WITH', '20 LIFE. BRING YOUR', "OPPONENT'S LIFE TO 0 TO", 'WIN THE DUEL.', '', 'IF YOU MUST DRAW FROM AN', 'EMPTY LIBRARY, YOU LOSE.'],
  ['YOUR TURN', 'BEGINNING: UNTAP, DRAW', 'MAIN 1: PLAY A LAND AND', '  CAST SPELLS', 'COMBAT: ATTACK WITH', '  YOUR CREATURES', 'MAIN 2: CAST MORE SPELLS', 'END: DISCARD DOWN TO 7'],
  ['MANA', 'LANDS TAP FOR MANA OF', 'THEIR COLOR: {W}{U}{B}{R}{G}.', 'A COST LIKE {2}{R} NEEDS', 'ONE RED AND TWO MORE OF', 'ANY KIND. YOUR LANDS ARE', 'TAPPED FOR YOU WHEN YOU', 'CAST. ONE LAND PER TURN.'],
  ['CREATURES', 'PT 2/3 = POWER 2,', 'TOUGHNESS 3. DAMAGE EQUAL', 'TO TOUGHNESS DESTROYS IT.', 'NEW CREATURES CAN\'T', 'ATTACK RIGHT AWAY.', 'UNTAPPED CREATURES CAN', 'BLOCK ATTACKERS.'],
  ['KEYWORDS', 'FLY: ONLY FLYERS OR REACH', '  CAN BLOCK IT', '1ST: FIRST STRIKE', 'TRM: TRAMPLE', 'HST: HASTE', 'VIG: VIGILANCE', 'DEF: DEFENDER, CAN\'T ATTACK'],
  ['SPELLS', 'SORCERIES: ONLY IN YOUR', '  MAIN PHASE.', 'INSTANTS: ANY TIME YOU', '  CAN RESPOND.', 'ENCHANTMENTS, ARTIFACTS', 'AND CREATURES STAY ON', 'THE BATTLEFIELD.'],
  ['DECKS', 'A DECK IS EXACTLY 60', 'CARDS. NO MORE THAN 4', 'COPIES OF A CARD. BASIC', 'LANDS ARE FREE.', 'WIN DUELS FOR BOOSTER', 'PACKS AND BUILD BETTER', 'DECKS FROM THE MENU.'],
];

export class HelpScene {
  constructor() {
    this.page = 0;
  }
  async run(app) {
    for (;;) {
      const b = await app.press(['left', 'right', 'a', 'b', 'start']);
      if (b === 'left' && this.page > 0) {
        this.page--;
        sfx('cursor');
      } else if ((b === 'right' || b === 'a') && this.page < HELP_PAGES.length - 1) {
        this.page++;
        sfx('cursor');
      } else if (b === 'b' || b === 'start' || b === 'a') {
        sfx('back');
        return;
      }
    }
  }
  draw(ctx) {
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 144);
    const [title, ...lines] = HELP_PAGES[this.page];
    drawText(ctx, title, 10, 10, C.orange);
    drawTextRight(ctx, `${this.page + 1}/${HELP_PAGES.length}`, 150, 10, C.greyDark);
    lines.forEach((l, i) => drawText(ctx, l, 10, 26 + i * 12, C.ink));
    if (this.page > 0) ctx.drawImage(icon('arrowLeft'), 4, 130);
    if (this.page < HELP_PAGES.length - 1) ctx.drawImage(icon('arrowRight'), 153, 130);
  }
}

// ---------------------------------------------------------------------------
// Options

export class OptionsScene {
  constructor(save) {
    this.save = save;
  }
  async run(app) {
    this.box = new TextBox(app);
    this.box.rect = { x: 0, y: 0, w: 160, h: 144 };
    const st = this.save.settings;
    let cur = 0;
    for (;;) {
      const speeds = ['SLOW', 'NORMAL', 'FAST'];
      const sp = st.textSpeed >= 4 ? 2 : st.textSpeed >= 2 ? 1 : 0;
      const opts = [`MUSIC: ${st.music ? 'ON' : 'OFF'}`, `SOUND: ${st.sfx ? 'ON' : 'OFF'}`, `TEXT: ${speeds[sp]}`, 'DONE'];
      const i = await this.box.choose(opts, { cols: 1, start: cur, prompt: 'OPTIONS' });
      cur = Math.max(0, i);
      if (i === 0) st.music = !st.music;
      else if (i === 1) st.sfx = !st.sfx;
      else if (i === 2) st.textSpeed = [1, 2, 4][(sp + 1) % 3];
      else return;
      audioSettings({ music: st.music, sfx: st.sfx });
    }
  }
  draw(ctx) {
    fill(ctx, C.bg);
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Name entry

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-.!? '.split('');
const NAME_ROWS = [LETTERS.slice(0, 9), LETTERS.slice(9, 18), LETTERS.slice(18, 27), LETTERS.slice(27), ['DEL', 'END']];

export class NameEntry {
  constructor(prompt, initial = '', max = 10) {
    this.prompt = prompt;
    this.name = initial;
    this.max = max;
    this.r = 4;
    this.c = 1;
  }
  async run(app) {
    for (;;) {
      const b = await app.press(['up', 'down', 'left', 'right', 'a', 'b', 'start']);
      const row = NAME_ROWS[this.r];
      if (b === 'left') this.c = (this.c + row.length - 1) % row.length;
      if (b === 'right') this.c = (this.c + 1) % row.length;
      if (b === 'up' || b === 'down') {
        const x = this.colX(this.r, this.c);
        this.r = (this.r + (b === 'up' ? NAME_ROWS.length - 1 : 1)) % NAME_ROWS.length;
        // keep the cursor roughly in the same column
        let best = 0;
        NAME_ROWS[this.r].forEach((_, i) => {
          if (Math.abs(this.colX(this.r, i) - x) < Math.abs(this.colX(this.r, best) - x)) best = i;
        });
        this.c = best;
      }
      if (['left', 'right', 'up', 'down'].includes(b)) sfx('cursor');
      if (b === 'b') {
        this.name = this.name.slice(0, -1);
        sfx('back');
      }
      if (b === 'start') {
        this.r = 4;
        this.c = 1;
        sfx('cursor');
      }
      if (b === 'a') {
        const it = NAME_ROWS[this.r][this.c];
        if (it === 'END') {
          if (this.name.trim()) {
            sfx('select');
            return this.name.trim();
          }
          sfx('error');
        } else if (it === 'DEL') {
          this.name = this.name.slice(0, -1);
          sfx('back');
        } else if (this.name.length < this.max) {
          this.name += it;
          sfx('blip');
        } else sfx('error');
      }
    }
  }
  colX(r, c) {
    return r === 4 ? 30 + c * 60 : 12 + c * 16;
  }
  draw(ctx) {
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 144);
    drawText(ctx, this.prompt, 10, 10, C.ink);
    for (let i = 0; i < this.max; i++) {
      const ch = this.name[i] || '';
      drawText(ctx, ch, 12 + i * 9, 30, C.ink);
      ctx.fillStyle = C.ink;
      ctx.fillRect(11 + i * 9, 39, 6, 1);
    }
    NAME_ROWS.forEach((row, r) => {
      row.forEach((it, c) => {
        const x = this.colX(r, c);
        const y = 56 + r * 15;
        drawText(ctx, it === ' ' ? '_' : it, x + 7, y, C.ink);
        if (r === this.r && c === this.c) ctx.drawImage(icon('cursor'), x, y);
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Booster pack opening

function drawPack(ctx, cx, cy, set, t = 0) {
  const p = PACKS[set];
  const w = 52;
  const h = 70;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  fill(ctx, C.ink, x, y + 2, w, h - 4);
  fill(ctx, p.color, x + 1, y + 3, w - 2, h - 6);
  // crimped edges
  for (let i = 0; i < w; i += 3) {
    fill(ctx, C.ink, x + i, y, 2, 3);
    fill(ctx, '#d0d0d0', x + i, y + 1, 2, 2);
    fill(ctx, C.ink, x + i, y + h - 3, 2, 3);
    fill(ctx, '#d0d0d0', x + i, y + h - 3, 2, 2);
  }
  // foil sheen
  const sx = x + ((t * 2) % (w + 30)) - 15;
  ctx.globalAlpha = 0.35;
  fill(ctx, '#ffffff', Math.max(x + 1, sx), y + 3, Math.min(6, x + w - 1 - Math.max(x + 1, sx)), h - 6);
  ctx.globalAlpha = 1;
  fill(ctx, C.ink, x + 4, y + 12, w - 8, 14);
  fill(ctx, '#f8b030', x + 5, y + 13, w - 10, 12);
  drawTextCenter(ctx, 'MAGIC', cx, y + 16, '#601000');
  drawTextCenter(ctx, p.short, cx, y + 34, C.white);
  drawTextCenter(ctx, 'BOOSTER', cx, y + 46, C.white);
  drawTextCenter(ctx, '8 CARDS', cx, y + 56, C.white);
}

// Open packs and add them to the collection right away (so nothing is lost if
// the game is closed mid-ceremony). Returns [{ set, ids, fresh: [bool] }].
export function openPacks(save, sets) {
  return sets.map((set) => {
    const ids = openPack(set);
    const fresh = ids.map((id) => addCards(save, [id]).length > 0);
    save.stats.packs++;
    return { set, ids, fresh };
  });
}

export class BoosterScene {
  // packs: result of openPacks()
  constructor(save, packs) {
    this.save = save;
    this.packs = packs;
    this.mode = 'pack';
    this.set = packs[0]?.set;
    this.t = 0;
    this.card = null;
    this.isNew = false;
  }
  update() {
    this.t++;
  }
  async run(app) {
    this.box = new TextBox(app);
    this.box.speed = this.save.settings.textSpeed;
    for (const pack of this.packs) {
      this.set = pack.set;
      this.mode = 'pack';
      this.card = null;
      playMusic('pack');
      const nm = PACKS[pack.set].name;
      await this.box.say(`YOU GOT ${/^[AEIOU]/.test(nm) ? 'AN' : 'A'} ${nm} BOOSTER PACK!`, { wait: true });
      sfx('card');
      for (let i = 0; i < pack.ids.length; i++) {
        const id = pack.ids[i];
        const fresh = pack.fresh[i];
        this.mode = 'card';
        this.card = CARDS[id];
        this.isNew = fresh;
        sfx(fresh ? 'coin' : 'card');
        await this.box.say(`${CARDS[id].name.toUpperCase()}${fresh ? ' (NEW!)' : ''}`, { wait: true, speed: 4 });
      }
      this.mode = 'list';
      this.list = pack.ids;
      await this.box.say('THE CARDS WERE ADDED TO YOUR COLLECTION.', { wait: true });
    }
  }
  draw(ctx, app) {
    fill(ctx, C.bg);
    if (this.mode === 'pack') drawPack(ctx, 80, 48, this.set, this.t);
    if (this.mode === 'card' && this.card) {
      popupCard(ctx, 80, 48, typeLabel(this.card), cardArt(this.card));
      if (this.isNew && Math.floor(this.t / 15) % 2 === 0) drawTextOutline(ctx, 'NEW!', 126, 10, C.yellow, C.ink);
      const rar = this.card.rarity;
      drawText(ctx, rar === 'R' ? '★ RARE' : rar === 'U' ? 'UNCOMMON' : 'COMMON', 116, 86, rar === 'R' ? C.orange : C.greyDark);
    }
    if (this.mode === 'list' && this.list) {
      frame(ctx, 0, 0, 160, 96);
      this.list.forEach((id, i) => {
        const d = CARDS[id];
        const y = 6 + i * 11;
        ctx.drawImage(typeIcon(d, cardColor(d)), 6, y - 2);
        drawText(ctx, d.name.toUpperCase(), 20, y, C.ink);
        drawTextRight(ctx, d.rarity, 152, y, d.rarity === 'R' ? C.orange : C.greyDark);
      });
    }
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Medal ceremony

export class MedalScene {
  constructor(medalId) {
    this.medal = MEDALS.find((m) => m.id === medalId);
    this.t = 0;
  }
  update() {
    this.t++;
  }
  async run(app) {
    this.box = new TextBox(app);
    playMusic('victory');
    sfx('coin');
    await this.box.say(`YOU RECEIVED THE ${this.medal.name}!`, { wait: true });
  }
  draw(ctx) {
    fill(ctx, C.bg);
    ctx.drawImage(medalSprite(this.medal.color, this.medal.id, 2), 56, 14);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.t / 30;
      const r = 36 + Math.sin(this.t / 10 + i) * 3;
      drawText(ctx, '+', 78 + Math.cos(a) * r, 44 + Math.sin(a) * r * 0.8, i % 2 ? C.orange : C.yellow);
    }
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Card shop

export class ShopScene {
  constructor(save) {
    this.save = save;
  }
  async run(app) {
    this.box = new TextBox(app);
    this.box.speed = this.save.settings.textSpeed;
    await this.box.say('WELCOME! WHAT WOULD YOU LIKE TO BUY?', { hold: 10 });
    const sets = Object.keys(PACKS);
    let cur = 0;
    for (;;) {
      this.cursorSet = sets[cur];
      const opts = [...sets.map((s) => `${PACKS[s].short} ${PACKS[s].price}G`), 'LEAVE'];
      this.box.rect = { x: 0, y: 0, w: 96, h: opts.length * 12 + 16 };
      const i = await this.box.choose(opts, { cols: 1, start: cur, onMove: (k) => (this.cursorSet = sets[k] || null) });
      this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
      if (i < 0 || i === sets.length) {
        await this.box.say('COME BACK ANYTIME!', { hold: 20 });
        return;
      }
      cur = i;
      const set = sets[i];
      const price = PACKS[set].price;
      if (this.save.gold < price) {
        sfx('error');
        await this.box.say("YOU DON'T HAVE ENOUGH GOLD.", { wait: true });
        continue;
      }
      const ok = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: `BUY ${PACKS[set].name} FOR ${price}G?` });
      if (ok !== 0) continue;
      this.save.gold -= price;
      sfx('coin');
      const opened = openPacks(this.save, [set]);
      writeSave(this.save);
      await app.run(new BoosterScene(this.save, opened));
      playMusic('club');
    }
  }
  draw(ctx, app) {
    fill(ctx, C.bg);
    if (this.cursorSet) drawPack(ctx, 128, 46, this.cursorSet, app.frameCount);
    frame(ctx, 100, 2, 58, 16);
    drawTextRight(ctx, `${this.save.gold}G`, 150, 7, C.ink);
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Starter choice

export class StarterScene {
  constructor() {
    this.keys = Object.keys(STARTERS);
    this.cur = 0;
    this.feature = { mountain_rage: ['raging_goblin', 'kird_ape', 'lightning_bolt'], tidal_knights: ['mesa_pegasus', 'phantom_monster', 'unsummon'], dark_swamp: ['scathe_zombies', 'bog_imp', 'terror'] };
  }
  async run(app) {
    this.box = new TextBox(app);
    for (;;) {
      const opts = this.keys.map((k) => STARTERS[k].name.toUpperCase());
      this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
      const i = await this.box.choose(opts, { cols: 1, start: this.cur, cancel: false, onMove: (k) => (this.cur = k) });
      this.cur = i;
      const k = this.keys[i];
      await this.box.say(STARTERS[k].blurb, { wait: true });
      const ok = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: `TAKE ${STARTERS[k].name.toUpperCase()}?` });
      if (ok === 0) return k;
    }
  }
  draw(ctx, app) {
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 96);
    const k = this.keys[this.cur];
    drawTextCenter(ctx, 'CHOOSE A STARTER DECK', 80, 6, C.ink);
    const feat = this.feature[k];
    feat.forEach((id, i) => {
      const d = CARDS[id];
      const x = 6 + i * 50;
      fill(ctx, C.ink, x - 1, 17, 50, 38);
      ctx.drawImage(cardArt(d), 8, 6, 48, 36, x, 18, 48, 36);
    });
    const cols = STARTERS[k].colors;
    drawText(ctx, cols.map((c) => `{${c}}`).join(''), 8, 62, C.ink);
    wrap(STARTERS[k].blurb, 140).slice(0, 2).forEach((l, i) => drawText(ctx, l, 8, 74 + i * 9, C.ink));
    this.box.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// Deck management

export class DeckSlots {
  constructor(save) {
    this.save = save;
  }
  async run(app) {
    this.box = new TextBox(app);
    let cur = this.save.activeDeck || 0;
    for (;;) {
      const s = this.save;
      while (s.decks.length < 3) s.decks.push({ name: `DECK ${s.decks.length + 1}`, cards: {} });
      const opts = s.decks.map((d, i) => `${i === s.activeDeck ? '★' : ' '}${d.name.toUpperCase().slice(0, 14)}`);
      this.box.rect = { x: 0, y: 0, w: 160, h: 96 };
      const i = await this.box.choose(opts, { cols: 1, start: cur, prompt: 'YOUR DECKS', onMove: (k) => (this.cur = k) });
      this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
      if (i < 0) return;
      cur = i;
      const deck = s.decks[i];
      const problem = deckProblem(s, deck.cards);
      const act = await this.box.choose(['EDIT', 'USE', 'RENAME', 'CLEAR'], { cols: 2, prompt: deck.name.toUpperCase() });
      if (act === 0) {
        await app.run(new DeckEditor(s, deck));
      } else if (act === 1) {
        if (problem) {
          sfx('error');
          await this.box.say(problem, { wait: true });
        } else {
          s.activeDeck = i;
          sfx('select');
          await this.box.say(`YOU WILL DUEL WITH ${deck.name.toUpperCase()}.`, { wait: true });
        }
      } else if (act === 2) {
        const name = await app.run(new NameEntry('DECK NAME?', deck.name.toUpperCase().slice(0, 12), 12));
        deck.name = name;
      } else if (act === 3) {
        if (i === s.activeDeck) {
          sfx('error');
          await this.box.say("YOU CAN'T CLEAR THE DECK YOU'RE USING.", { wait: true });
        } else if ((await this.box.choose(['YES', 'NO'], { cols: 2, prompt: 'REMOVE ALL CARDS?', start: 1 })) === 0) deck.cards = {};
      }
    }
  }
  draw(ctx) {
    fill(ctx, C.bg);
    this.box.draw(ctx);
    const s = this.save;
    s.decks.forEach((d, i) => {
      const n = deckCount(d.cards);
      drawTextRight(ctx, `${n}/60`, 150, 24 + i * 12, n === 60 ? C.ink : C.red);
    });
  }
}

const TABS = ['ALL', 'W', 'U', 'B', 'R', 'G', 'ART', 'LAND'];

function sortKey(d) {
  const order = { W: 0, U: 1, B: 2, R: 3, G: 4, M: 5, A: 6, L: 7 };
  const ck = cardColor(d);
  const land = d.type.includes('Land');
  return [land ? 9 : order[ck] ?? 8, land ? 0 : manaValue(d.cost), d.name];
}

export class DeckEditor {
  constructor(save, deck) {
    this.save = save;
    this.deck = deck;
    this.cards = { ...deck.cards };
    this.tab = 0;
    this.cur = 0;
    this.top = 0;
    this.rows = 5;
    this.refresh();
  }

  refresh() {
    const t = TABS[this.tab];
    const ids = Object.keys(CARDS).filter((id) => {
      const d = CARDS[id];
      if (!d.basic && !this.save.collection[id] && !this.cards[id]) return false;
      const ck = cardColor(d);
      const land = d.type.includes('Land');
      if (t === 'ALL') return true;
      if (t === 'LAND') return land;
      if (land) return false;
      if (t === 'ART') return ck === 'A';
      return d.cost.includes(t);
    });
    ids.sort((a, b) => {
      const ka = sortKey(CARDS[a]);
      const kb = sortKey(CARDS[b]);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
      return 0;
    });
    this.ids = ids;
    this.cur = Math.min(this.cur, Math.max(0, ids.length - 1));
  }

  async run(app) {
    this.app = app;
    this.box = new TextBox(app);
    this.box.rect = { x: 0, y: 96, w: 96, h: 48 };
    this.message = null;
    for (;;) {
      const b = await app.press(['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']);
      const n = this.ids.length;
      this.message = null;
      if (b === 'up' && this.cur > 0) {
        this.cur--;
        sfx('cursor');
      } else if (b === 'down' && this.cur < n - 1) {
        this.cur++;
        sfx('cursor');
      } else if (b === 'left' || b === 'right') {
        this.tab = (this.tab + (b === 'left' ? TABS.length - 1 : 1)) % TABS.length;
        this.cur = 0;
        this.top = 0;
        this.refresh();
        sfx('cursor');
      } else if (b === 'a' && n) {
        const id = this.ids[this.cur];
        const have = this.cards[id] || 0;
        const d = CARDS[id];
        if (!d.basic && have >= 4) {
          sfx('error');
          this.message = 'MAX 4 COPIES';
        } else if (have >= owned(this.save, id)) {
          sfx('error');
          this.message = 'NO MORE COPIES';
        } else {
          this.cards[id] = have + 1;
          sfx('blip');
        }
      } else if (b === 'b' && n) {
        const id = this.ids[this.cur];
        if (this.cards[id]) {
          this.cards[id]--;
          if (!this.cards[id]) delete this.cards[id];
          sfx('back');
        } else {
          // B on a card you don't have in the deck = leave
          if (await this.finish()) return;
        }
      } else if (b === 'b') {
        if (await this.finish()) return;
      } else if (b === 'select' && n) {
        await app.run(new CardDetail(this.ids.map((id) => CARDS[id]), this.cur));
      } else if (b === 'start') {
        if (await this.finish()) return;
      }
      if (this.cur < this.top) this.top = this.cur;
      if (this.cur >= this.top + this.rows) this.top = this.cur - this.rows + 1;
    }
  }

  async finish() {
    const choice = await this.box.choose(['SAVE', 'QUIT', 'BACK'], { cols: 2, colWidth: 40 });
    this.box.clear();
    if (choice === 0) {
      this.deck.cards = { ...this.cards };
      const problem = deckProblem(this.save, this.cards);
      if (problem) {
        this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
        await this.box.say(`SAVED, BUT ${problem}`, { wait: true });
        this.box.rect = { x: 0, y: 96, w: 96, h: 48 };
      }
      return true;
    }
    if (choice === 1) return true;
    return false;
  }

  draw(ctx, app) {
    fill(ctx, C.bg);
    frame(ctx, 0, 0, 160, 96);
    // tabs
    let tx = 6;
    TABS.forEach((t, i) => {
      const label = t.length === 1 ? `{${t}}` : t;
      const w = t.length === 1 ? 8 : measure(t);
      if (i === this.tab) {
        fill(ctx, C.ink, tx - 1, 4, w + 2, 9);
        if (t.length > 1) drawText(ctx, t, tx, 5, C.white);
        else drawText(ctx, label, tx, 5);
      } else drawText(ctx, label, tx, 5, C.greyDark);
      tx += w + 4;
    });
    const n = deckCount(this.cards);
    drawTextRight(ctx, `${n}/60`, 153, 5, n === 60 ? C.green : n > 60 ? C.red : C.ink);
    for (let i = 0; i < this.rows; i++) {
      const idx = this.top + i;
      if (idx >= this.ids.length) break;
      const id = this.ids[idx];
      const d = CARDS[id];
      const y = 18 + i * 15;
      ctx.drawImage(typeIcon(d, cardColor(d)), 13, y - 2);
      let name = d.name.toUpperCase();
      while (measure(name) > 84) name = name.slice(0, -1);
      drawText(ctx, name, 27, y, C.ink);
      const inDeck = this.cards[id] || 0;
      const have = d.basic ? '·' : String(owned(this.save, id));
      drawTextRight(ctx, `${inDeck}/${d.basic ? '-' : have}`, 152, y, inDeck ? C.ink : C.greyDark);
      if (idx === this.cur) ctx.drawImage(icon('cursor'), 6, y);
    }
    if (this.top + this.rows < this.ids.length) ctx.drawImage(icon('arrowDown'), 145, 89);
    if (this.top > 0) ctx.drawImage(icon('arrowUp'), 145, 13);
    if (this.box.mode) this.box.draw(ctx);
    else {
      frame(ctx, 0, 96, 96, 48);
      if (this.message) drawText(ctx, this.message, 8, 108, C.red);
      else {
        drawText(ctx, 'A:ADD  B:DEL', 8, 106, C.ink);
        drawText(ctx, 'SEL:CHECK', 8, 116, C.ink);
        drawText(ctx, 'START:DONE', 8, 126, C.ink);
      }
    }
    const id = this.ids[this.cur];
    fill(ctx, C.bg, 96, 96, 64, 48);
    if (id) ctx.drawImage(cardArt(CARDS[id]), 96, 96);
  }
}

// ---------------------------------------------------------------------------
// Album

export class AlbumScene {
  constructor(save) {
    this.save = save;
  }
  async run(app) {
    const all = Object.values(CARDS).filter((d) => !d.basic);
    const setOrder = ['LEA', 'ARN', 'ATQ', 'LEG', 'DRK', 'POR'];
    all.sort((a, b) => setOrder.indexOf(a.set) - setOrder.indexOf(b.set) || sortKey(a)[0] - sortKey(b)[0] || a.name.localeCompare(b.name));
    const have = all.filter((d) => this.save.collection[d.id]).length;
    const items = all.map((d) => {
      const n = this.save.collection[d.id] || 0;
      return n ? { def: d, right: `×${n}`, tag: null } : { def: d, label: '??????', right: d.set, dim: true, unknown: true, hideCost: true };
    });
    await app.run(
      new CardList({
        title: `ALBUM ${have}/${all.length}`,
        headerRight: () => '',
        items,
        prompt: 'YOUR CARDS',
        actions: (it) => (it.unknown ? null : ['CHECK', 'BACK']),
        handle: async () => undefined,
      }),
    );
  }
  draw(ctx) {
    fill(ctx, C.bg);
  }
}

// ---------------------------------------------------------------------------
// Credits

export class CreditsScene {
  constructor(name) {
    this.name = name;
    this.y = 150;
    this.lines = [
      'CONGRATULATIONS!',
      '',
      `${name} IS THE`,
      'NEW PLANESWALKER',
      'OF DOMINARIA!',
      '',
      '',
      'MAGIC: THE GATHERING GB',
      '',
      'A FAN-MADE TRIBUTE',
      'INSPIRED BY THE VIDEO',
      '"WHAT IF THERE WAS A',
      'MAGIC: THE GATHERING',
      'GAME BOY GAME?"',
      'BY THE DBXY COLLECTIVE',
      '',
      'AND BY POKEMON TRADING',
      'CARD GAME FOR GAME BOY',
      '',
      'MAGIC: THE GATHERING',
      'IS A TRADEMARK OF',
      'WIZARDS OF THE COAST.',
      'THIS IS AN UNOFFICIAL',
      'NON-COMMERCIAL FAN GAME.',
      '',
      '',
      'THE BATTLE CONTINUES...',
    ];
  }
  async run(app) {
    playMusic('title');
    const end = -this.lines.length * 12 - 20;
    while (this.y > end) {
      await app.frame();
      this.y -= app.input.isDown('a') ? 1.5 : 0.35;
    }
    this.done = true;
    await app.press(['a', 'start']);
  }
  draw(ctx) {
    fill(ctx, C.bg);
    if (this.done) {
      banner(ctx, 'THANKS FOR\nPLAYING!', 80, 60);
      return;
    }
    this.lines.forEach((l, i) => {
      const y = Math.round(this.y + i * 12);
      if (y > -8 && y < 144) drawTextCenter(ctx, l, 80, y, i < 5 ? C.orange : C.ink);
    });
  }
}
