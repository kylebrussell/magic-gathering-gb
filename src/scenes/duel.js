// The duel: intro (portrait, versus, deck cut, dice, draw 7, mulligan), the
// turn loop driven by the rules engine, event presentation and the human
// player's menus — all modelled on the concept video.

import * as E from '../engine/game.js';
import { decide } from '../engine/ai.js';
import { narrate, cardName, targetName } from '../engine/narrate.js';
import { parseCost, manaValue } from '../engine/mana.js';
import { C } from '../gfx/palette.js';
import { fill, banner, popupCard, typeLabel } from '../gfx/draw.js';
import { drawText, drawTextRight, drawTextCenter, drawTextOutline, manaSymbols, measure } from '../gfx/font.js';
import { icon, die, cardBack, lifeDie } from '../gfx/sprites.js';
import { cardArt } from '../gfx/art.js';
import { portrait } from '../gfx/portraits.js';
import { TextBox } from '../ui.js';
import { CardList, CardDetail } from './cardscreens.js';
import { layoutBoard, drawBoard, moveCursor } from './board.js';
import { playMusic, sfx } from '../audio.js';

const PHASES = [
  { step: 'upkeep', icon: 'phaseUntap', label: 'BEGINNING PHASE.' },
  { step: 'main1', icon: 'phaseMain', label: 'MAIN PHASE 1.' },
  { step: 'attackers', icon: 'phaseCombat', label: 'COMBAT PHASE.' },
  { step: 'main2', icon: 'phaseMain', label: 'MAIN PHASE 2.' },
  { step: 'end', icon: 'phaseEnd', label: 'ENDING PHASE.' },
];

const EFFECT_EVENTS = new Set(['damage', 'destroy', 'dies', 'mod', 'life', 'bounce', 'exile', 'countered', 'regenerate', 'prevent', 'regenShield', 'preventShield', 'tap', 'control', 'draw', 'discard', 'mill', 'counter', 'zone', 'tutor', 'mana', 'extraTurn', 'sacrifice', 'emptyDraw', 'tapMana']);

// Dev/test hook: "hand:fireball,counterspell;bf:mountain*5,prodigal_sorcerer;opp:grizzly_bears"
// puts cards straight into the human's hand / battlefield or the opponent's battlefield.
function applySetup(g, setup) {
  const make = (p, id, zone) => {
    const iid = g.nextId++;
    g.cards[iid] = { iid, id, owner: p, controller: p, zone: 'library', tapped: false, sick: false, damage: 0, counters: 0, mods: [], attachedTo: null, regen: 0, prevent: 0, damagedBy: [], controlSource: null, activations: 0, noRegen: false };
    g.players[p].library.push(iid);
    E.moveCard(g, iid, zone, { controller: p });
    g.cards[iid].sick = false;
  };
  for (const part of setup.split(';')) {
    const [where, list] = part.split(':');
    for (const item of (list || '').split(',').filter(Boolean)) {
      const [id, n = 1] = item.split('*');
      for (let i = 0; i < Number(n); i++) {
        if (where === 'hand') make(0, id, 'hand');
        if (where === 'bf') make(0, id, 'battlefield');
        if (where === 'opp') make(1, id, 'battlefield');
        if (where === 'opphand') make(1, id, 'hand');
      }
    }
  }
  g.log = g.log.filter((e) => e.t !== 'zone');
}

export class DuelScene {
  constructor(opts) {
    this.manualFade = true;
    this.opts = opts;
    this.human = 0;
    this.mode = 'blank';
    this.bannerText = null;
    this.floats = [];
    this.marks = new Map();
    this.cursor = null;
    this.flash = null;
    this.popup = null;
    this.battle = null;
    this.versus = null;
    this.hoverArt = null;
    this.autoPassAll = false;
  }

  get g() {
    return this.game;
  }

  // ------------------------------------------------------------------ run
  async run(app) {
    this.app = app;
    const { player, opponent, seed } = this.opts;
    this.box = new TextBox(app);
    this.box.speed = this.opts.textSpeed || 2;
    this.game = E.newGame({
      seed: seed ?? (Math.random() * 2 ** 32) >>> 0,
      first: this.opts.first ?? null,
      players: [
        { name: player.name, deck: player.deck },
        { name: opponent.name, deck: opponent.deck },
      ],
    });
    this.game.record = true;
    if (this.opts.setup) applySetup(this.game, this.opts.setup);
    this.snap = E.snapshot(this.game);
    // hide the opening hands until the draw animation
    this.introCounts = { hand: [0, 0], lib: [player.deck.length, opponent.deck.length] };
    playMusic(opponent.music || 'duel');
    await this.intro();
    await this.loop();
    return await this.outro();
  }

  pname(p) {
    return this.g.players[p].name.toUpperCase();
  }

  // ------------------------------------------------------------------ intro
  async intro() {
    const app = this.app;
    const { opponent } = this.opts;
    if (this.opts.skipIntro) {
      this.introCounts = null;
      this.mode = 'blank';
      await app.fadeIn(4);
      return;
    }
    this.mode = 'portrait';
    await app.fadeIn(12);
    await this.box.say(`${opponent.fullName || opponent.name}\n${opponent.deckName || ''}`.toUpperCase(), { hold: 70, speed: 99 });
    await app.fadeOut(12);
    this.box.clear();
    this.mode = 'versus';
    this.versus = { cards: [], counts: false, dice: null, dim: null };
    await app.fadeIn(12);
    // cut each other's decks
    sfx('shuffle');
    const cut = this.box.say("EACH PLAYER WILL CUT THE OPPONENT'S DECK.", { hold: 10 });
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      this.versus.cards = [
        { x: 30 + t * 60, y: 64 - t * 30 },
        { x: 104 - t * 60, y: 20 + t * 30 },
        { x: 34 + Math.sin(t * Math.PI) * 50, y: 60 - Math.sin(t * Math.PI) * 20 },
      ];
      await app.frame();
    }
    this.versus.cards = [];
    await cut;
    // who plays first
    this.mode = 'dice';
    const rolls = this.g.dice;
    await this.box.say('WHO PLAYS FIRST?', { hold: 0 });
    for (const [a, b] of rolls) {
      sfx('dice');
      for (let i = 0; i < 36; i++) {
        this.versus.dice = [1 + ((i * 7 + 3) % 6), 1 + ((i * 5 + 1) % 6)];
        await app.wait(2);
        if (i % 6 === 0) sfx('dice');
      }
      this.versus.dice = [a, b];
      await app.wait(30);
      if (a === b) await this.box.say("IT'S A TIE! ROLL AGAIN.", { hold: 30 });
    }
    const first = this.g.first;
    this.versus.dim = 1 - first;
    for (let i = 0; i < 4; i++) {
      this.versus.blink = i % 2 === 0;
      await app.wait(10);
    }
    this.versus.blink = false;
    await this.box.say(`${this.pname(first)} WILL PLAY FIRST.`, { hold: 40 });
    // draw 7
    this.mode = 'versus';
    this.versus.counts = true;
    this.versus.dice = null;
    this.versus.dim = null;
    const draw = this.box.say('EACH PLAYER WILL DRAW 7 CARDS.', { hold: 20 });
    for (let n = 1; n <= 7; n++) {
      sfx('draw');
      for (let p = 0; p < 2; p++) {
        this.introCounts.hand[p] = n;
        this.introCounts.lib[p]--;
      }
      await app.wait(8);
    }
    await draw;
    this.introCounts = null;
    // mulligans
    this.mode = 'blank';
    this.bannerText = 'MULLIGAN...';
    sfx('turn');
    await this.box.say('PLAYERS DECIDE WHETHER TO KEEP THEIR OPENING HAND.', { hold: 30 });
    this.bannerText = null;
  }

  // ------------------------------------------------------------------ loop
  async loop() {
    const g = this.g;
    let guard = 0;
    for (;;) {
      await this.present(E.drainLog(g));
      if (g.over) break;
      const pend = g.pending;
      if (!pend) break;
      if (++guard > 20000) break;
      if (pend.player === this.human) {
        let action;
        try {
          action = await this.humanDecision(pend);
        } catch (e) {
          console.error(e);
          action = { type: 'pass' };
        }
        if (action.type === 'concede') {
          E.concede(g, this.human);
          continue;
        }
        try {
          E.act(g, action);
        } catch (e) {
          console.warn('Illegal action', action, e);
          await this.box.say("YOU CAN'T DO THAT NOW.", { hold: 40 });
        }
      } else {
        const action = await this.aiDecision(pend);
        try {
          E.act(g, action);
        } catch (e) {
          console.error('AI made an illegal move', action, e);
          E.act(g, pend.type === 'priority' ? { type: 'pass' } : pend.type === 'attackers' ? { type: 'attack', attackers: [] } : pend.type === 'blockers' ? { type: 'block', blocks: [] } : { type: 'keep' });
        }
      }
    }
  }

  async aiDecision(pend) {
    const g = this.g;
    const skill = this.opts.opponent.skill ?? 0.8;
    const thinking = (pend.type === 'priority' && g.active !== this.human && E.isMain(g.step) && g.stack.length === 0) || pend.type === 'attackers' || pend.type === 'blockers';
    const action = decide(g, { skill });
    if (thinking && action.type !== 'pass' && !(pend.type === 'attackers' && !action.attackers?.length) && !(pend.type === 'blockers' && !action.blocks?.length)) {
      this.mode = 'board';
      const name = this.pname(1 - this.human);
      for (let i = 0; i < 3; i++) {
        this.box.show(`${name} IS THINKING${'.'.repeat(i + 1)}`);
        await this.app.wait(10);
      }
    }
    return action;
  }

  // ------------------------------------------------------------------ presentation
  async say(text, opts = {}) {
    await this.box.say(text, { hold: 36, ...opts });
  }

  slotFor(iid, snap = this.snap) {
    return layoutBoard(this.g, snap, this.human).find((s) => s.iid === iid);
  }

  playerSlot(p) {
    return layoutBoard(this.g, this.snap, this.human).find((s) => s.kind === 'player' && s.p === p);
  }

  addFloat(target, text, color) {
    let x;
    let y;
    if (target.p !== undefined) {
      const s = this.playerSlot(target.p);
      x = s.x + 16;
      y = s.y - 2;
    } else {
      const s = this.slotFor(target.c);
      if (!s) return;
      x = s.x + s.w;
      y = s.y - 4;
    }
    const f = { x, y, text, color, life: 50 };
    this.floats.push(f);
  }

  update() {
    for (const f of this.floats) {
      f.life--;
      if (f.life > 30) f.y -= 0.15;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  async tickFloats(frames) {
    await this.app.wait(frames);
  }

  async blinkCard(iid, times = 4) {
    this.flash = iid;
    for (let i = 0; i < times * 2; i++) {
      this.blink = i % 2 === 0;
      await this.app.wait(5);
    }
    this.flash = null;
    this.blink = false;
  }

  async showPopup(iid, text, sound) {
    const d = E.def(this.g, iid);
    this.popup = { def: d, label: typeLabel(d) };
    this.mode = 'popup';
    if (sound) sfx(sound);
    await this.say(text);
    this.popup = null;
    this.mode = 'board';
  }

  async present(events) {
    const g = this.g;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.snap) this.snap = ev.snap;
      switch (ev.t) {
        case 'turn': {
          this.mode = 'blank';
          this.box.clear();
          this.marks.clear();
          sfx('turn');
          this.bannerText = ev.p === this.human ? 'YOUR\nTURN' : "OPPONENT'S\nTURN";
          this.bannerFace = ev.p === this.human ? null : '#c8c040';
          await this.app.waitOrPress(50);
          this.bannerText = null;
          this.bannerFace = null;
          this.mode = 'board';
          await this.say(`${this.pname(ev.p)}'S TURN.`, { hold: 20 });
          break;
        }
        case 'step': {
          const ph = PHASES.findIndex((p) => p.step === ev.step);
          if (ph < 0) break;
          // skip the combat strip when nobody can attack
          if (ev.step === 'attackers' && events[i + 1]?.t === 'step' && events[i + 1].step === 'main2') break;
          this.mode = 'board';
          this.phase = ph;
          this.box.mode = 'custom';
          this.box.custom = (ctx, x, y) => this.drawPhaseStrip(ctx, x, y);
          await this.app.waitOrPress(ev.p === this.human ? 22 : 18);
          this.box.clear();
          break;
        }
        case 'draw': {
          let n = 1;
          while (events[i + 1]?.t === 'draw' && events[i + 1].p === ev.p) {
            i++;
            n++;
            if (events[i].snap) this.snap = events[i].snap;
          }
          if (g.turn === 0) break; // opening hands / mulligans
          sfx('draw');
          this.mode = 'board';
          await this.say(`${this.pname(ev.p)} DRAWS ${n} CARD${n > 1 ? 'S' : ''}.`, { hold: 20 });
          if (ev.p === this.human && n === 1) await this.showPopup(ev.iid, `YOU DREW ${cardName(g, ev.iid)}.`);
          break;
        }
        case 'playLand':
          await this.showPopup(ev.iid, narrate(g, ev), 'land');
          break;
        case 'cast':
          await this.showPopup(ev.iid, narrate(g, ev), 'cast');
          break;
        case 'activate': {
          const t = narrate(g, ev);
          if (!t) break;
          this.mode = 'board';
          sfx('cast');
          await this.say(t);
          break;
        }
        case 'resolve':
        case 'resolveAbility': {
          const d = E.def(g, ev.iid);
          const isSpell = ev.t === 'resolve' && (d.type === 'Instant' || d.type === 'Sorcery');
          if ((isSpell || ev.t === 'resolveAbility') && ev.targets && ev.targets.length && ev.targets[0].s === undefined) {
            // collect the effect events that follow and play them on the battle screen
            const effects = [];
            while (i + 1 < events.length && EFFECT_EVENTS.has(events[i + 1].t)) effects.push(events[++i]);
            await this.battleSequence(ev, effects);
          }
          break;
        }
        case 'damage': {
          const t = narrate(g, ev);
          this.mode = 'board';
          sfx('damage');
          this.addFloat(ev.target, `-${ev.amount}`, C.red);
          if (t) await Promise.all([this.say(t, { hold: 24 }), this.tickFloats(40)]);
          else await this.tickFloats(30);
          break;
        }
        case 'life': {
          this.mode = 'board';
          if (ev.delta > 0) sfx('heal');
          this.addFloat({ p: ev.p }, `${ev.delta > 0 ? '+' : ''}${ev.delta}`, ev.delta > 0 ? C.green : C.red);
          await Promise.all([this.say(narrate(g, ev), { hold: 24 }), this.tickFloats(36)]);
          break;
        }
        case 'destroy':
        case 'dies':
        case 'sacrifice':
        case 'exile':
        case 'bounce': {
          this.mode = 'board';
          sfx('destroy');
          await this.blinkCard(ev.iid, 3);
          await this.say(narrate(g, ev), { hold: 24 });
          break;
        }
        case 'attack': {
          if (!ev.attackers.length) break;
          this.mode = 'board';
          sfx('attack');
          const names = ev.attackers.map((a) => cardName(g, a));
          const text = names.length === 1 ? `${this.pname(ev.p)} ATTACKS WITH ${names[0]}!` : `${this.pname(ev.p)} ATTACKS WITH ${names.length} CREATURES!`;
          await this.say(text, { hold: 30 });
          break;
        }
        case 'block': {
          this.mode = 'board';
          if (!ev.blocks.length) {
            await this.say('NO BLOCKERS!', { hold: 24 });
          } else {
            for (const [b, a] of ev.blocks) await this.say(`${cardName(g, b)} BLOCKS ${cardName(g, a)}.`, { hold: 20 });
          }
          break;
        }
        case 'combatDamage': {
          this.mode = 'board';
          if (!ev.assignments.length) break;
          sfx('damage');
          for (const [, target, n] of ev.assignments) this.addFloat(target, `-${n}`, C.red);
          // show the pre-damage life while the numbers float, then update
          const after = ev.snap;
          await this.tickFloats(45);
          this.snap = after;
          const toPlayer = ev.assignments.filter(([, t]) => t.p !== undefined);
          if (toPlayer.length) {
            const total = toPlayer.reduce((n, [, , a]) => n + a, 0);
            await this.say(`${this.pname(toPlayer[0][1].p)} TAKES ${total} DAMAGE.`, { hold: 20 });
          }
          break;
        }
        case 'gameOver':
          break;
        case 'keep':
        case 'mulligan':
          this.mode = 'blank';
          await this.say(narrate(g, ev), { hold: 24 });
          break;
        case 'mod': {
          const m = ev.mod;
          if (m.p || m.t) {
            this.mode = 'board';
            await this.say(`${cardName(g, ev.iid)} GETS ${m.p >= 0 ? '+' : ''}${m.p || 0}/${m.t >= 0 ? '+' : ''}${m.t || 0}.`, { hold: 18 });
          } else if (m.kw) {
            this.mode = 'board';
            await this.say(`${cardName(g, ev.iid)} GAINS ${m.kw[0].toUpperCase()}.`, { hold: 18 });
          }
          break;
        }
        case 'regenShield':
          await this.say(`${cardName(g, ev.iid)} WILL REGENERATE.`, { hold: 18 });
          break;
        case 'counter':
          await this.say(`${cardName(g, ev.iid)} GETS A +1/+1 COUNTER.`, { hold: 18 });
          break;
        default: {
          const t = narrate(g, ev);
          if (t && ev.t !== 'step') {
            if (this.mode !== 'battle') this.mode = 'board';
            await this.say(t, { hold: 24 });
          }
        }
      }
    }
    if (this.mode === 'blank' || this.mode === 'popup' || this.mode === 'battle') this.mode = 'board';
  }

  // Pokémon-style spell screen: source bottom-left, target top-right.
  async battleSequence(ev, effects) {
    const g = this.g;
    const t = ev.targets[0];
    const src = ev.iid;
    const srcDef = E.def(g, src);
    const tgt = t.p !== undefined ? { player: t.p } : { def: E.def(g, t.c), iid: t.c };
    this.battle = { srcDef, tgt, shake: 0, flash: false, hidden: false, sparkle: 0 };
    this.mode = 'battle';
    sfx('cast');
    await this.app.wait(24);
    for (const fx of effects) {
      if (fx.snap) this.snap = fx.snap;
      const text = narrate(g, fx);
      if (fx.t === 'damage') {
        sfx(srcDef.id.includes('bolt') || srcDef.id.includes('lightning') ? 'bolt' : 'damage');
        for (let i = 0; i < 24; i++) {
          this.battle.shake = i < 18 ? (i % 4 < 2 ? 2 : -2) : 0;
          this.battle.flash = i < 12 && i % 4 < 2;
          await this.app.frame();
        }
        this.battle.shake = 0;
        this.battle.flash = false;
        if (text) await this.say(text, { hold: 30 });
      } else if (fx.t === 'destroy' || fx.t === 'dies' || fx.t === 'exile' || fx.t === 'bounce' || fx.t === 'sacrifice') {
        sfx('destroy');
        for (let i = 0; i < 8; i++) {
          this.battle.hidden = i % 2 === 0;
          await this.app.wait(4);
        }
        this.battle.hidden = true;
        if (text) await this.say(text, { hold: 30 });
      } else if (fx.t === 'mod' || fx.t === 'life' || fx.t === 'regenShield' || fx.t === 'preventShield') {
        sfx('heal');
        for (let i = 0; i < 30; i++) {
          this.battle.sparkle = i;
          await this.app.frame();
        }
        this.battle.sparkle = 0;
        let msg = text;
        if (fx.t === 'mod') {
          const m = fx.mod;
          msg = m.p || m.t ? `${cardName(g, fx.iid)} GETS ${m.p >= 0 ? '+' : ''}${m.p || 0}/${m.t >= 0 ? '+' : ''}${m.t || 0}.` : `${cardName(g, fx.iid)} GAINS ${(m.kw || ['POWER'])[0].toUpperCase()}.`;
        }
        if (fx.t === 'regenShield') msg = `${cardName(g, fx.iid)} WILL REGENERATE.`;
        if (fx.t === 'preventShield') msg = `DAMAGE TO ${targetName(g, fx.target)} WILL BE PREVENTED.`;
        if (msg) await this.say(msg, { hold: 30 });
      } else if (text && fx.t !== 'zone' && fx.t !== 'tapMana' && fx.t !== 'mana') {
        await this.say(text, { hold: 30 });
      }
    }
    if (!effects.length) await this.app.wait(20);
    this.battle = null;
    this.mode = 'board';
  }

  drawPhaseStrip(ctx, x, y) {
    const sx = x + 12;
    const sy = y + 9;
    ctx.fillStyle = C.ink;
    ctx.fillRect(sx + 3, sy + 3, 4 * 26, 1);
    PHASES.forEach((p, i) => {
      const px = sx + i * 26;
      const cur = i === this.phase;
      ctx.fillStyle = cur ? C.ink : C.bg;
      ctx.fillRect(px - 2, sy - 2, 11, 11);
      ctx.drawImage(icon(p.icon, cur ? { o: C.white } : { o: C.ink }), px, sy);
    });
    drawText(ctx, PHASES[this.phase].label, x + 8, y + 28, C.ink);
  }

  // ------------------------------------------------------------------ human decisions
  shouldStop(pend) {
    const g = this.g;
    const me = this.human;
    if (g.active === me && E.isMain(g.step) && g.stack.length === 0) return true;
    if (this.autoPassAll) return false;
    if (!E.hasInstantAction(g, me)) return false;
    if (g.stack.length) return g.stack[g.stack.length - 1].controller !== me;
    if (g.active === me) return g.step === 'blockers';
    return g.step === 'attackers' || g.step === 'blockers' || g.step === 'end';
  }

  // One-time tips for the tutorial duel.
  async tip(key, text) {
    if (!this.opts.tutorial) return;
    this.tipsShown = this.tipsShown || new Set();
    if (this.tipsShown.has(key)) return;
    this.tipsShown.add(key);
    this.box.label = 'TIP';
    await this.box.say(text, { wait: true });
    this.box.label = null;
    this.box.clear();
  }

  async humanDecision(pend) {
    const g = this.g;
    this.mode = 'board';
    if (this.opts.autoHuman || globalThis.MTG_AUTO) return decide(g, { skill: 1 });
    if (pend.type === 'priority' && g.active === this.human && E.isMain(g.step) && g.stack.length === 0) {
      await this.tip('main', 'CHOOSE HAND TO SEE YOUR CARDS. YOU MAY PLAY ONE LAND EACH TURN. LANDS MAKE MANA, AND MANA PAYS FOR SPELLS. YOUR LANDS ARE TAPPED AUTOMATICALLY WHEN YOU CAST.');
      if (E.creaturesOf(g, this.human).length) await this.tip('battlefield', 'CHOOSE BATTLEFIELD TO LOOK AT EVERY CARD IN PLAY. MOVE THE CURSOR AND PRESS A TO CHECK A CARD.');
    }
    if (pend.type === 'attackers') await this.tip('attack', 'COMBAT! CHOOSE DECLARE ATT., PICK YOUR ATTACKERS WITH A, THEN PRESS B. CREATURES CAN\'T ATTACK ON THE TURN THEY ARRIVE UNLESS THEY HAVE HASTE.');
    if (pend.type === 'blockers') await this.tip('block', 'YOU ARE BEING ATTACKED! PICK ONE OF YOUR UNTAPPED CREATURES, CHOOSE BLOCK, THEN THE ATTACKER TO STOP. UNBLOCKED ATTACKERS HIT YOUR LIFE.');
    if (pend.type === 'priority' && this.shouldStop(pend) && !(g.active === this.human && E.isMain(g.step))) await this.tip('respond', 'YOU HAVE AN INSTANT OR ABILITY YOU CAN USE RIGHT NOW. CHOOSE HAND TO CAST IT, OR PASS TO LET THINGS HAPPEN.');
    switch (pend.type) {
      case 'mulligan':
        return this.mulliganMenu();
      case 'priority':
        if (!this.shouldStop(pend)) return { type: 'pass' };
        if (g.active === this.human && E.isMain(g.step) && g.stack.length === 0) return this.mainMenu();
        return this.respondMenu();
      case 'attackers':
        return this.attackMenu();
      case 'blockers':
        return this.blockMenu();
      case 'discard':
        return this.discardMenu(pend.count);
    }
    return { type: 'pass' };
  }

  async mulliganMenu() {
    const g = this.g;
    this.mode = 'blank';
    for (;;) {
      const size = g.players[this.human].hand.length;
      const opts = ['KEEP', size > 1 ? 'MULLIGAN' : { label: 'MULLIGAN', disabled: true }, 'REVIEW'];
      const i = await this.box.choose(opts, { cols: 3, prompt: `KEEP YOUR OPENING HAND? (${size})`, colWidth: 46, cancel: false });
      if (i === 0) return { type: 'keep' };
      if (i === 1) return { type: 'mulligan' };
      await this.handList({ readOnly: true });
    }
  }

  handItems(readOnly) {
    const g = this.g;
    return g.players[this.human].hand.map((iid) => {
      const d = E.def(g, iid);
      const playable = !readOnly && (d.type.includes('Land') ? E.canPlayLand(g, this.human, iid) : E.canCast(g, this.human, iid));
      return { def: d, iid, playable };
    });
  }

  // Returns an action, or null if the player backed out.
  async handList({ readOnly = false } = {}) {
    let start = 0;
    for (;;) {
      const items = this.handItems(readOnly);
      const list = new CardList({
        title: `${this.pname(this.human)}'S HAND`,
        items,
        start: Math.min(start, Math.max(0, items.length - 1)),
        prompt: readOnly ? 'REVIEW YOUR HAND' : 'SELECT A CARD',
        actions: (it) => {
          if (readOnly) return ['CHECK', 'BACK'];
          const verb = it.def.type.includes('Land') ? 'PLAY' : 'CAST';
          return ['CHECK', 'BACK', { label: verb, disabled: !it.playable }];
        },
        handle: async (it, label, idx) => {
          start = idx;
          if (label === 'PLAY') return { type: 'play', iid: it.iid };
          if (label === 'CAST') return { cast: it.iid };
          return undefined;
        },
      });
      const r = await this.app.run(list);
      this.mode = 'board';
      if (!r || !r.cast) return r;
      // close the list so the board is visible while choosing targets
      const action = await this.castFlow(r.cast);
      if (action) return action;
    }
  }

  async mainMenu() {
    for (;;) {
      this.mode = 'board';
      const g = this.g;
      const step = g.step;
      const i = await this.box.choose(['HAND', 'BATTLEFIELD', step === 'main1' ? 'NEXT PHASE' : 'END TURN', 'CONCEDE'], { cols: 2, cancel: false });
      if (i === 0) {
        const a = await this.handList();
        if (a) return a;
      } else if (i === 1) {
        const a = await this.battlefieldMenu();
        if (a) return a;
      } else if (i === 2) {
        return { type: 'pass' };
      } else if (i === 3) {
        if (await this.confirm('REALLY CONCEDE THE DUEL?')) return { type: 'concede' };
      }
    }
  }

  async respondMenu() {
    const g = this.g;
    let prompt = 'RESPOND?';
    if (g.stack.length) prompt = `RESPOND TO ${cardName(g, g.stack[g.stack.length - 1].src)}?`;
    else if (g.step === 'attackers') prompt = 'ATTACKERS DECLARED.';
    else if (g.step === 'blockers') prompt = 'BLOCKERS DECLARED.';
    else if (g.step === 'end') prompt = 'END OF TURN.';
    for (;;) {
      this.mode = 'board';
      const i = await this.box.choose(['HAND', 'BATTLE', 'PASS'], { cols: 3, prompt, colWidth: 46, cancel: false });
      if (i === 0) {
        const a = await this.handList();
        if (a) return a;
      } else if (i === 1) {
        const a = await this.battlefieldMenu();
        if (a) return a;
      } else return { type: 'pass' };
    }
  }

  async confirm(question) {
    const i = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: question, start: 1 });
    return i === 0;
  }

  // Generic board cursor. candidates: slots. Returns slot or null.
  async boardCursor({ candidates, prompt, start, onPick }) {
    const app = this.app;
    if (!candidates.length) return null;
    let cur = start && candidates.includes(start) ? start : candidates[0];
    this.mode = 'board';
    this.box.rect = { x: 0, y: 96, w: 96, h: 48 };
    const refresh = () => {
      this.cursor = cur;
      const name = this.slotName(cur);
      this.box.mode = 'msg';
      this.box.lines = [prompt, name];
      this.box.shown = 999;
      this.hoverArt = this.slotArt(cur);
    };
    try {
      refresh();
      for (;;) {
        const b = await app.press(['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']);
        if (['up', 'down', 'left', 'right'].includes(b)) {
          const next = moveCursor(candidates, cur, b);
          if (next !== cur) {
            cur = next;
            sfx('cursor');
          }
          refresh();
        } else if (b === 'a') {
          sfx('select');
          const r = await onPick(cur);
          if (r !== undefined) return r;
          // refresh candidates positions (board may not change)
          refresh();
        } else if (b === 'b' || b === 'start') {
          sfx('back');
          return null;
        }
      }
    } finally {
      this.cursor = null;
      this.hoverArt = null;
      this.box.rect = { x: 0, y: 96, w: 160, h: 48 };
      this.box.clear();
    }
  }

  slotName(s) {
    if (!s) return '';
    const g = this.g;
    if (s.kind === 'player') return `${this.pname(s.p)} (${g.players[s.p].life})`;
    const d = E.def(g, s.iid);
    let n = d.name.toUpperCase();
    if (E.isCreature(g, s.iid) && g.cards[s.iid].zone === 'battlefield') {
      const st = E.stats(g, s.iid);
      n += ` ${st.power}/${st.toughness}`;
    }
    return n;
  }

  slotArt(s) {
    if (!s) return null;
    if (s.kind === 'player') return { portrait: s.p === this.human ? this.opts.player.portrait : this.opts.opponent.portrait };
    return { art: cardArt(E.def(this.g, s.iid)) };
  }

  liveCard(iid) {
    const g = this.g;
    const d = E.def(g, iid);
    const live = E.isCreature(g, iid) && g.cards[iid].zone === 'battlefield' ? E.stats(g, iid) : null;
    return { def: d, live };
  }

  async battlefieldMenu() {
    const g = this.g;
    const slots = layoutBoard(g, this.snap, this.human).filter((s) => s.kind === 'perm');
    if (!slots.length) {
      await this.say('THE BATTLEFIELD IS EMPTY.', { hold: 30 });
      return null;
    }
    const mine = slots.filter((s) => s.p === this.human);
    return this.boardCursor({
      candidates: slots,
      start: mine[0],
      prompt: 'BATTLEFIELD',
      onPick: async (slot) => {
        const abilities = E.abilityList(g, slot.iid)
          .map((ab, index) => ({ ab, index }))
          .filter(({ index }) => slot.p === this.human && E.canActivate(g, this.human, slot.iid, index));
        const opts = ['CHECK', 'BACK'];
        if (slot.p === this.human && E.abilityList(g, slot.iid).length) opts.push({ label: 'USE', disabled: !abilities.length });
        const i = await this.box.choose(opts, { cols: 2, colWidth: 38, start: abilities.length ? 2 : 0 });
        if (i === 0) {
          await this.app.run(new CardDetail([this.liveCard(slot.iid)]));
        } else if (i === 2) {
          const a = await this.abilityFlow(slot.iid, abilities);
          if (a) return a;
        }
        return undefined;
      },
    });
  }

  async abilityFlow(iid, abilities) {
    let pick = abilities[0];
    if (abilities.length > 1) {
      const i = await this.box.choose(abilities.map(({ ab }) => ab.text.replace(/\{[^}]*\}[:,]?\s*/g, '').slice(0, 18)), { cols: 1 });
      if (i < 0) return null;
      pick = abilities[i];
    }
    const { ab, index } = pick;
    const ctx = { src: iid, controller: this.human };
    const targets = [];
    for (const spec of ab.targets || []) {
      const t = await this.chooseTarget(spec, ctx);
      if (!t) return null;
      targets.push(t);
    }
    let color;
    if (ab.chooseColor) {
      const ci = await this.box.choose(['WHITE', 'BLUE', 'BLACK', 'RED', 'GREEN'], { cols: 3, colWidth: 46, prompt: 'CHOOSE A COLOR' });
      if (ci < 0) return null;
      color = 'WUBRG'[ci];
    }
    return { type: 'activate', iid, index, targets, color };
  }

  async castFlow(iid) {
    const g = this.g;
    const d = E.def(g, iid);
    const specs = E.spellSpecs(d);
    const ctx = { src: iid, controller: this.human };
    const targets = [];
    for (const spec of specs) {
      const t = await this.chooseTarget(spec, ctx, d);
      if (!t) return null;
      targets.push(t);
    }
    let x = 0;
    if (parseCost(d.cost).X) {
      const max = E.maxX(g, this.human, d.cost);
      // suggest just enough to kill a targeted creature
      const t = targets[0];
      let start = max;
      if (t && t.c !== undefined && E.isCreature(g, t.c)) start = Math.max(1, Math.min(max, E.toughness(g, t.c) - g.cards[t.c].damage));
      x = await this.chooseX(max, start);
      if (!x) return null;
    }
    let pick;
    if (d.needsPick) {
      pick = await this.pickFromLibrary();
      if (pick == null) return null;
    }
    return { type: 'cast', iid, targets, x, pick };
  }

  async chooseTarget(spec, ctx, srcDef) {
    const g = this.g;
    const legal = E.legalTargets(g, spec, ctx);
    if (!legal.length) return null;
    if (spec.kind === 'spell') {
      const items = legal.map((t) => {
        const item = g.stack.find((s) => s.id === t.s);
        return { def: E.def(g, item.src), t };
      });
      const r = await this.app.run(
        new CardList({
          title: 'CHOOSE A SPELL',
          items,
          prompt: 'CHOOSE 1 TARGET.',
          actions: () => ['CHECK', 'BACK', 'TARGET'],
          handle: async (it, label) => (label === 'TARGET' ? it.t : undefined),
        }),
      );
      return r;
    }
    if (spec.kind === 'gyCreature') {
      const items = legal.map((t) => ({ def: E.def(g, t.c), t }));
      return this.app.run(
        new CardList({
          title: 'YOUR GRAVEYARD',
          items,
          prompt: 'CHOOSE 1 TARGET.',
          actions: () => ['CHECK', 'BACK', 'TARGET'],
          handle: async (it, label) => (label === 'TARGET' ? it.t : undefined),
        }),
      );
    }
    const slots = layoutBoard(g, this.snap, this.human);
    const candidates = slots.filter((s) => legal.some((t) => (t.p !== undefined ? s.kind === 'player' && s.p === t.p : s.kind === 'perm' && s.iid === t.c)));
    // default: an opponent's thing for harmful spells
    const theirs = candidates.find((s) => s.p !== this.human);
    return this.boardCursor({
      candidates,
      start: theirs,
      prompt: 'CHOOSE 1 TARGET.',
      onPick: async (slot) => {
        const i = await this.box.choose(['CHECK', 'BACK', 'TARGET'], { cols: 2, colWidth: 38, start: 2 });
        if (i === 0) {
          if (slot.kind === 'perm') await this.app.run(new CardDetail([this.liveCard(slot.iid)]));
          return undefined;
        }
        if (i === 2) return slot.kind === 'player' ? { p: slot.p } : { c: slot.iid };
        return undefined;
      },
    });
  }

  async chooseX(max, start = max) {
    const app = this.app;
    if (max < 1) return 0;
    let x = start;
    this.box.mode = 'custom';
    this.box.custom = (ctx, bx, by) => {
      drawText(ctx, 'CHOOSE X:', bx + 8, by + 12, C.ink);
      ctx.drawImage(icon('arrowLeft'), bx + 60, by + 13);
      drawTextCenter(ctx, String(x), bx + 72, by + 12, C.ink);
      ctx.drawImage(icon('arrowRight'), bx + 82, by + 13);
      drawText(ctx, `MAX ${max}  A:OK B:BACK`, bx + 8, by + 26, C.greyDark);
    };
    try {
      for (;;) {
        const b = await app.press(['left', 'right', 'up', 'down', 'a', 'b']);
        if ((b === 'left' || b === 'down') && x > 1) {
          x--;
          sfx('cursor');
        }
        if ((b === 'right' || b === 'up') && x < max) {
          x++;
          sfx('cursor');
        }
        if (b === 'a') {
          sfx('select');
          return x;
        }
        if (b === 'b') {
          sfx('back');
          return 0;
        }
      }
    } finally {
      this.box.clear();
    }
  }

  async pickFromLibrary() {
    const g = this.g;
    const lib = [...g.players[this.human].library];
    const items = lib.map((iid) => ({ def: E.def(g, iid), iid })).sort((a, b) => a.def.name.localeCompare(b.def.name));
    return this.app.run(
      new CardList({
        title: 'YOUR LIBRARY',
        items,
        prompt: 'CHOOSE A CARD',
        actions: () => ['CHECK', 'BACK', 'TAKE'],
        handle: async (it, label) => (label === 'TAKE' ? it.iid : undefined),
      }),
    );
  }

  async attackMenu() {
    const g = this.g;
    for (;;) {
      this.mode = 'board';
      const i = await this.box.choose(['HAND', 'BATTLEFIELD', 'DECLARE ATT.', 'CONCEDE'], { cols: 2, cancel: false, start: 2 });
      if (i === 0) await this.handList({ readOnly: true });
      else if (i === 1) await this.battlefieldMenu();
      else if (i === 3) {
        if (await this.confirm('REALLY CONCEDE THE DUEL?')) return { type: 'concede' };
      } else {
        const chosen = await this.declareAttackers();
        if (chosen) return { type: 'attack', attackers: chosen };
      }
    }
  }

  async declareAttackers() {
    const g = this.g;
    const slots = layoutBoard(g, this.snap, this.human);
    const able = slots.filter((s) => s.kind === 'perm' && E.canAttack(g, s.iid));
    const chosen = new Set(able.filter((s) => E.mustAttack(g, s.iid)).map((s) => s.iid));
    const sync = () => {
      this.marks.clear();
      for (const iid of chosen) this.marks.set(iid, 'attack');
    };
    sync();
    const r = await this.boardCursor({
      candidates: able,
      prompt: 'DECLARE ATTACKERS',
      onPick: async (slot) => {
        const on = chosen.has(slot.iid);
        const i = await this.box.choose(['CHECK', 'BACK', on ? 'CANCEL' : 'ATTACK!'], { cols: 2, colWidth: 38, start: 2 });
        if (i === 0) await this.app.run(new CardDetail([this.liveCard(slot.iid)]));
        if (i === 2) {
          if (on && !E.mustAttack(g, slot.iid)) chosen.delete(slot.iid);
          else chosen.add(slot.iid);
          sync();
        }
        return undefined;
      },
    });
    // B finishes the declaration
    this.marks.clear();
    if (r === null) {
      if (!chosen.size) {
        const i = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: 'ATTACK WITH NOTHING?' });
        if (i !== 0) return null;
      }
      return [...chosen];
    }
    return [...chosen];
  }

  async blockMenu() {
    const g = this.g;
    const attackers = g.combat.attackers;
    const slots = layoutBoard(g, this.snap, this.human);
    const mine = slots.filter((s) => s.kind === 'perm' && s.p === this.human && attackers.some((a) => E.canBlock(g, s.iid, a)));
    const blocks = new Map(); // blocker -> attacker
    const sync = () => {
      this.marks.clear();
      for (const a of attackers) this.marks.set(a, 'target');
      for (const b of blocks.keys()) this.marks.set(b, 'block');
      this.snap = { ...this.snap, combat: { attackers: [...attackers], blocks: [...blocks.entries()] } };
    };
    sync();
    await this.say(`${this.pname(1 - this.human)} IS ATTACKING! DECLARE BLOCKERS. PRESS B WHEN DONE.`, { hold: 10 });
    for (;;) {
      await this.boardCursor({
        candidates: mine,
        prompt: 'DECLARE BLOCKERS',
        onPick: async (slot) => {
          const on = blocks.has(slot.iid);
          const i = await this.box.choose(['CHECK', 'BACK', on ? 'UNBLOCK' : 'BLOCK'], { cols: 2, colWidth: 38, start: 2 });
          if (i === 0) await this.app.run(new CardDetail([this.liveCard(slot.iid)]));
          if (i === 2) {
            if (on) blocks.delete(slot.iid);
            else {
              const options = slots.filter((s) => s.kind === 'perm' && attackers.includes(s.iid) && E.canBlock(g, slot.iid, s.iid));
              let target = options[0];
              if (options.length > 1) {
                target = await this.boardCursor({
                  candidates: options,
                  prompt: 'BLOCK WHICH ONE?',
                  onPick: async (s) => s,
                });
              }
              if (target) blocks.set(slot.iid, target.iid);
            }
            sync();
          }
          return undefined;
        },
      });
      const i = await this.box.choose(['YES', 'NO'], { cols: 2, prompt: blocks.size ? 'CONFIRM BLOCKS?' : 'DON\'T BLOCK?' });
      if (i === 0) break;
    }
    this.marks.clear();
    return { type: 'block', blocks: [...blocks.entries()] };
  }

  async discardMenu(count) {
    const g = this.g;
    const picked = new Set();
    for (;;) {
      const items = g.players[this.human].hand.map((iid) => ({ def: E.def(g, iid), iid, tag: picked.has(iid) ? '×' : null }));
      await this.app.run(
        new CardList({
          title: `DISCARD ${count} CARD${count > 1 ? 'S' : ''}`,
          items,
          prompt: `CHOOSE ${count - picked.size} MORE`,
          cancel: false,
          actions: (it) => ['CHECK', 'BACK', picked.has(it.iid) ? 'KEEP' : 'DISCARD'],
          handle: async (it, label, idx, list) => {
            if (label === 'DISCARD') picked.add(it.iid);
            if (label === 'KEEP') picked.delete(it.iid);
            list.items.forEach((x) => (x.tag = picked.has(x.iid) ? '×' : null));
            list.prompt = `CHOOSE ${Math.max(0, count - picked.size)} MORE`;
            if (picked.size === count) return true;
            return undefined;
          },
        }),
      );
      if (picked.size === count) return { type: 'discard', iids: [...picked] };
    }
  }

  // ------------------------------------------------------------------ outro
  async outro() {
    const g = this.g;
    const app = this.app;
    await this.present(E.drainLog(g));
    this.mode = 'blank';
    this.box.clear();
    this.bannerText = 'DECISION...';
    await app.wait(60);
    this.bannerText = null;
    const won = g.winner === this.human;
    playMusic(won ? 'victory' : 'defeat');
    this.mode = 'result';
    this.versus = { counts: true, result: won };
    const opp = this.pname(1 - this.human);
    let reason = '';
    if (g.reason === 'deck') reason = won ? ` ${opp} RAN OUT OF CARDS.` : ' YOU RAN OUT OF CARDS.';
    if (g.reason === 'concede') reason = won ? ` ${opp} CONCEDED.` : '';
    await this.box.say(won ? `YOU WON THE DUEL WITH ${opp}!${reason}` : g.winner === -1 ? 'THE DUEL IS A DRAW.' : `YOU LOST THE DUEL WITH ${opp}...${reason}`, { wait: true });
    await app.fadeOut(16);
    return { won, conceded: g.reason === 'concede' && !won, turns: g.turn };
  }

  // ------------------------------------------------------------------ drawing
  draw(ctx, app) {
    fill(ctx, C.bg);
    const g = this.g;
    if (!g) return;
    switch (this.mode) {
      case 'portrait':
        ctx.drawImage(portrait(this.opts.opponent.portrait), 56, 24);
        break;
      case 'versus':
      case 'result':
        this.drawVersus(ctx, app);
        break;
      case 'dice':
        this.drawDice(ctx, app);
        break;
      case 'board': {
        const slots = layoutBoard(g, this.snap, this.human);
        drawBoard(ctx, g, this.snap, this.human, slots, {
          cursor: this.cursor ? slots.find((s) => s.kind === this.cursor.kind && s.iid === this.cursor.iid && s.p === this.cursor.p) || this.cursor : null,
          marks: this.marks,
          floats: this.floats,
          flash: this.flash,
          blink: this.blink,
          frame: app.frameCount,
        });
        break;
      }
      case 'popup':
        if (this.popup) popupCard(ctx, 80, 48, this.popup.label, cardArt(this.popup.def));
        break;
      case 'battle':
        this.drawBattle(ctx, app);
        break;
    }
    if (this.mode !== 'portrait' || this.box.mode) this.box.draw(ctx);
    if (this.hoverArt && this.box.rect.w < 160) {
      fill(ctx, C.bg, 96, 96, 64, 48);
      if (this.hoverArt.art) ctx.drawImage(this.hoverArt.art, 96, 96);
      if (this.hoverArt.portrait) ctx.drawImage(portrait(this.hoverArt.portrait), 104, 96);
    }
    if (this.bannerText) banner(ctx, this.bannerText, 80, 44, this.bannerFace ? { face: this.bannerFace, light: '#e8e070', shade: '#888020', color: '#204000', shadow: '#f0f0a0' } : {});
  }

  counts(p) {
    if (this.introCounts) return { hand: this.introCounts.hand[p], lib: this.introCounts.lib[p] };
    return { hand: this.snap.hand[p], lib: this.snap.lib[p] };
  }

  drawCounters(ctx, p, x, y) {
    const c = this.counts(p);
    ctx.drawImage(icon('hand'), x, y);
    drawText(ctx, '×', x + 11, y + 1, C.ink);
    drawTextRight(ctx, String(c.hand), x + 24, y + 1, C.ink);
    ctx.drawImage(icon('library'), x + 30, y);
    drawText(ctx, '×', x + 41, y + 1, C.ink);
    drawTextRight(ctx, String(c.lib), x + 56, y + 1, C.ink);
  }

  drawVersusLine(ctx) {
    ctx.fillStyle = C.green;
    ctx.fillRect(0, 34, 100, 2);
    ctx.fillRect(98, 34, 2, 24);
    ctx.fillRect(98, 56, 62, 2);
    ctx.fillStyle = C.greenLight;
    ctx.fillRect(0, 36, 98, 1);
    ctx.fillRect(100, 58, 60, 1);
  }

  drawVersus(ctx, app) {
    const opp = 1 - this.human;
    const v = this.versus || {};
    this.drawVersusLine(ctx);
    drawTextRight(ctx, this.pname(opp).split(' ')[0], 158, 0, C.ink);
    ctx.drawImage(portrait(this.opts.opponent.portrait), 110, 8);
    ctx.drawImage(portrait(this.opts.player.portrait), 0, 38);
    drawText(ctx, this.pname(this.human), 1, 87, C.ink);
    if (v.counts) {
      this.drawCounters(ctx, opp, 44, 18);
      this.drawCounters(ctx, this.human, 54, 78);
    }
    if (this.mode === 'result') {
      ctx.drawImage(lifeDie(), 56, 58);
      drawTextCenter(ctx, String(this.snap.life[this.human]), 64, 63, C.dark);
      ctx.drawImage(lifeDie(), 78, 39);
      drawTextCenter(ctx, String(this.snap.life[opp]), 86, 44, C.dark);
      const show = Math.floor(app.frameCount / 30) % 2 === 0;
      if (show) {
        const win = v.result;
        drawTextOutline(ctx, win ? 'VICTORY' : 'DEFEAT', 2, 66, win ? C.yellow : C.purple, C.ink);
        drawTextOutline(ctx, win ? 'DEFEAT' : 'VICTORY', 112, 32, win ? C.purple : C.yellow, C.ink);
      }
    }
    for (const c of v.cards || []) ctx.drawImage(cardBack(), Math.round(c.x), Math.round(c.y));
  }

  drawDice(ctx, app) {
    const v = this.versus || {};
    const first = this.g.first;
    const pp = this.opts.player.portrait;
    const op = this.opts.opponent.portrait;
    const dimHuman = v.dim === this.human && !v.blink;
    const dimOpp = v.dim === 1 - this.human && !v.blink;
    ctx.globalAlpha = dimHuman ? 0.35 : 1;
    ctx.drawImage(portrait(pp), 2, 24);
    ctx.globalAlpha = dimOpp ? 0.35 : 1;
    ctx.drawImage(portrait(op), 110, 24);
    ctx.globalAlpha = 1;
    if (v.dice) {
      ctx.drawImage(die(v.dice[this.human]), 60, 42);
      ctx.drawImage(die(v.dice[1 - this.human]), 86, 42);
    }
    void first;
  }

  drawBattle(ctx, app) {
    const b = this.battle;
    if (!b) return;
    const g = this.g;
    const t = b.tgt;
    // target, top-right
    const tName = t.player !== undefined ? this.pname(t.player) : t.def.name.toUpperCase();
    drawTextRight(ctx, tName, 158, 0, C.ink);
    const tx = 96 + b.shake;
    if (!b.hidden) {
      if (t.player !== undefined) {
        ctx.drawImage(portrait(t.player === this.human ? this.opts.player.portrait : this.opts.opponent.portrait), tx + 8, 8);
      } else {
        ctx.drawImage(cardArt(t.def), tx, 8);
      }
      if (b.flash) {
        ctx.fillStyle = C.white;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(tx, 8, 64, 48);
        ctx.globalAlpha = 1;
      }
      if (b.sparkle) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + b.sparkle / 8;
          const r = 10 + (b.sparkle % 15);
          drawText(ctx, '+', 128 + Math.cos(a) * r, 30 + Math.sin(a) * r * 0.7, C.white);
        }
      }
    }
    if (t.def) {
      drawText(ctx, `MC ${manaSymbols(t.def.cost) || '-'}`, 4, 4, C.ink);
      if (t.iid && t.def.type.includes('Creature') && g.cards[t.iid].zone === 'battlefield') {
        const s = E.stats(g, t.iid);
        drawText(ctx, `PT ${s.power}/${s.toughness}`, 4, 14, C.ink);
      } else if (t.def.type.includes('Creature')) {
        drawText(ctx, `PT ${t.def.power}/${t.def.toughness}`, 4, 14, C.ink);
      }
    } else {
      drawText(ctx, `LIFE ${this.snap.life[t.player]}`, 4, 4, C.ink);
    }
    // HUD line
    ctx.fillStyle = C.green;
    ctx.fillRect(0, 34, 92, 2);
    ctx.fillRect(90, 34, 2, 26);
    ctx.fillRect(90, 58, 70, 2);
    // source, bottom-left
    ctx.drawImage(cardArt(b.srcDef), 0, 38);
    drawText(ctx, b.srcDef.name.toUpperCase(), 2, 88, C.ink);
    drawText(ctx, `MC ${manaSymbols(b.srcDef.cost) || '-'}`, 68, 70, C.ink);
  }
}
