// Magic rules engine.
//
// The whole game is a plain-data object (`g`) so it can be structuredClone'd
// for AI lookahead. The engine advances until some player must make a
// decision, which is exposed as `g.pending`:
//
//   { type: 'mulligan',  player }
//   { type: 'priority',  player }          cast / activate / play land / pass
//   { type: 'attackers', player }
//   { type: 'blockers',  player }
//   { type: 'discard',   player, count }
//
// The UI (or AI) answers with `act(g, action)`. Everything that happens is
// appended to `g.log` as events for the presentation layer to animate.

import { parseCost, withX, emptyPool, planPayment, costColors, manaValue, COLORS } from './mana.js';
import { shuffle, randInt } from './rng.js';

let DB = {};
export function setCardDB(db) {
  DB = db;
}
export function cardDef(id) {
  return DB[id];
}
export function allCardIds() {
  return Object.keys(DB);
}

export const opp = (p) => 1 - p;
export const def = (g, iid) => DB[g.cards[iid].id];
export const isMain = (step) => step === 'main1' || step === 'main2';

const STEP_ORDER = ['untap', 'upkeep', 'draw', 'main1', 'attackers', 'blockers', 'damage', 'main2', 'end', 'cleanup'];
export const HAND_SIZE = 7;

// When g.record is set (the UI's game), every event carries a compact board
// snapshot so the presentation layer can show the board as it was at that
// moment while narrating events one by one.
export function snapshot(g) {
  const count = (zone) => g.players.map((pl) => pl[zone].length);
  return {
    bf: g.battlefield.map((iid) => {
      const c = g.cards[iid];
      return [iid, c.controller, c.tapped ? 1 : 0, c.attachedTo];
    }),
    life: g.players.map((pl) => pl.life),
    hand: count('hand'),
    lib: count('library'),
    gy: count('graveyard'),
    ex: count('exile'),
    combat: g.combat ? { attackers: [...g.combat.attackers], blocks: g.combat.blocks.map((b) => [...b]) } : null,
    step: g.step,
    active: g.active,
  };
}

function log(g, ev) {
  if (g.record) ev.snap = snapshot(g);
  g.log.push(ev);
}

// ---------------------------------------------------------------------------
// Setup

export function newGame({ players, seed = 1, startingLife = 20, first = null }) {
  const g = {
    rng: seed >>> 0,
    turn: 0,
    active: 0,
    step: 'setup',
    entered: true,
    priority: 0,
    passes: 0,
    stack: [],
    nextStackId: 1,
    combat: null,
    players: [],
    cards: {},
    nextId: 1,
    battlefield: [],
    pending: null,
    over: false,
    winner: -1,
    reason: '',
    log: [],
    fog: false,
    extraTurns: [],
    dice: [],
    first: 0,
  };
  players.forEach((pl, p) => {
    const player = {
      name: pl.name,
      life: startingLife,
      library: [],
      hand: [],
      graveyard: [],
      exile: [],
      pool: emptyPool(),
      landsPlayed: 0,
      drewFromEmpty: false,
      conceded: false,
      mulligans: 0,
      decided: false,
      prevent: 0,
      bonusMana: 0,
    };
    g.players.push(player);
    for (const id of pl.deck) {
      if (!DB[id]) throw new Error(`Unknown card id: ${id}`);
      const iid = g.nextId++;
      g.cards[iid] = newCardState(iid, id, p);
      player.library.push(iid);
    }
    shuffle(g, player.library);
    // A scripted opening (the teaching duel): put these card ids on top, in
    // order, so the opening hand and the first draws are known.
    if (pl.top && pl.top.length) {
      const rest = [...player.library];
      const top = [];
      for (const id of pl.top) {
        const i = rest.findIndex((iid) => g.cards[iid].id === id);
        if (i < 0) throw new Error(`Deck has no spare ${id} to stack on top`);
        top.push(rest.splice(i, 1)[0]);
      }
      player.library = [...top, ...rest];
    }
  });

  // "WHO PLAYS FIRST?" — both roll a d6, reroll ties. When the first player
  // is dictated, still roll dice that agree with it, for the intro animation.
  for (;;) {
    const a = 1 + randInt(g, 6);
    const b = 1 + randInt(g, 6);
    g.dice.push([a, b]);
    if (a === b) continue;
    const winner = a > b ? 0 : 1;
    if (first == null || first === winner) {
      first = winner;
      break;
    }
    g.dice.pop();
  }
  g.first = first;
  g.active = first;
  log(g, { t: 'dice', rolls: g.dice, first });

  for (let p = 0; p < 2; p++) draw(g, p, HAND_SIZE);
  g.pending = { type: 'mulligan', player: first };
  return g;
}

function newCardState(iid, id, owner) {
  return {
    iid,
    id,
    owner,
    controller: owner,
    zone: 'library',
    tapped: false,
    sick: true,
    damage: 0,
    counters: 0,
    mods: [],
    attachedTo: null,
    regen: 0,
    prevent: 0,
    damagedBy: [],
    controlSource: null,
    activations: 0,
    noRegen: false,
  };
}

// ---------------------------------------------------------------------------
// Characteristics

export function typeOf(g, iid) {
  return def(g, iid).type;
}
export const isCreature = (g, iid) => def(g, iid).type.includes('Creature');
export const isLand = (g, iid) => def(g, iid).type.includes('Land');
export const isArtifact = (g, iid) => def(g, iid).type.includes('Artifact');
export const isEnchantment = (g, iid) => def(g, iid).type.includes('Enchantment');
export const hasSub = (g, iid, sub) => (def(g, iid).sub || '').split(' ').includes(sub);

export function colorsOf(g, iid) {
  const d = def(g, iid);
  if (d.colors) return d.colors;
  if (d.type.includes('Land')) return [];
  return costColors(d.cost);
}
export const hasColor = (g, iid, c) => colorsOf(g, iid).includes(c);

export function stats(g, iid, opts = {}) {
  const c = g.cards[iid];
  const d = DB[c.id];
  let power = d.power ?? 0;
  let toughness = d.toughness ?? 0;
  const kw = new Set(d.kw || []);
  if (d.pt) [power, toughness] = d.pt(g, iid);
  const add = (b) => {
    if (!b) return;
    power += b.p || 0;
    toughness += b.t || 0;
    if (b.kw) for (const k of b.kw) kw.add(k);
  };
  if (d.selfBoost) add(d.selfBoost(g, iid));
  power += c.counters;
  toughness += c.counters;
  if (!opts.ignoreTemp) for (const m of c.mods) add(m);
  if (c.zone === 'battlefield') {
    for (const oid of g.battlefield) {
      const o = g.cards[oid];
      const od = DB[o.id];
      if (od.aura && o.attachedTo === iid) add(od.aura);
      if (od.lord && oid !== iid) add(od.lord(g, oid, iid));
      if (od.anthem) add(od.anthem(g, oid, iid));
    }
  }
  return { power, toughness, kw };
}
export const hasKw = (g, iid, k) => stats(g, iid).kw.has(k);
export const power = (g, iid) => stats(g, iid).power;
export const toughness = (g, iid) => stats(g, iid).toughness;

export function isProtectedFrom(g, iid, srcIid) {
  if (srcIid == null) return false;
  const kw = stats(g, iid).kw;
  return colorsOf(g, srcIid).some((col) => kw.has('pro' + col));
}

export function controls(g, p, pred) {
  return g.battlefield.filter((iid) => g.cards[iid].controller === p && pred(iid));
}
export function controlsLandType(g, p, sub) {
  return g.battlefield.some((iid) => g.cards[iid].controller === p && isLand(g, iid) && hasSub(g, iid, sub));
}
export function creaturesOf(g, p) {
  return controls(g, p, (iid) => isCreature(g, iid));
}
export function landsOf(g, p) {
  return controls(g, p, (iid) => isLand(g, iid));
}

// ---------------------------------------------------------------------------
// Zones

function zoneArray(g, c, zone) {
  if (zone === 'battlefield') return g.battlefield;
  if (zone === 'stack') return null;
  return g.players[c.owner][zone];
}

export function moveCard(g, iid, to, opts = {}) {
  const c = g.cards[iid];
  const d = DB[c.id];
  const from = c.zone;
  const wasCreature = from === 'battlefield' && d.type.includes('Creature');
  const prevController = c.controller;
  const snapshot = { damagedBy: [...c.damagedBy], controller: prevController };
  const arr = zoneArray(g, c, from);
  if (arr) {
    const i = arr.indexOf(iid);
    if (i >= 0) arr.splice(i, 1);
  }
  if (from === 'battlefield') {
    removeFromCombat(g, iid);
    // An aura that stole a creature gives it back.
    if (d.control) {
      const t = c.attachedTo != null ? g.cards[c.attachedTo] : null;
      if (t && t.zone === 'battlefield' && t.controlSource === iid) {
        t.controller = t.owner;
        t.controlSource = null;
        t.sick = true;
      }
    }
  }
  if (from === 'battlefield' || to !== 'battlefield') {
    c.tapped = false;
    c.damage = 0;
    c.counters = 0;
    c.mods = [];
    c.attachedTo = null;
    c.regen = 0;
    c.prevent = 0;
    c.damagedBy = [];
    c.controlSource = null;
    c.activations = 0;
    c.noRegen = false;
    c.controller = c.owner;
  }
  c.zone = to;
  if (to === 'battlefield') {
    c.controller = opts.controller ?? c.controller;
    c.sick = true;
    g.battlefield.push(iid);
  } else if (to === 'library') {
    const lib = g.players[c.owner].library;
    if (opts.bottom) lib.push(iid);
    else lib.unshift(iid);
  } else if (to !== 'stack') {
    g.players[c.owner][to].push(iid);
  }
  if (from !== to) log(g, { t: 'zone', iid, from, to, controller: prevController });

  if (wasCreature && to === 'graveyard') {
    for (const oid of [...g.battlefield]) {
      const od = DB[g.cards[oid].id];
      if (od.onOtherDies) od.onOtherDies(g, oid, iid, snapshot);
    }
  }
  if (from === 'battlefield' && d.onLeave) d.onLeave(g, iid, prevController);
  return c;
}

export function draw(g, p, n = 1) {
  const pl = g.players[p];
  for (let i = 0; i < n; i++) {
    if (pl.library.length === 0) {
      pl.drewFromEmpty = true;
      log(g, { t: 'emptyDraw', p });
      return;
    }
    const iid = pl.library[0];
    moveCard(g, iid, 'hand');
    log(g, { t: 'draw', p, iid });
  }
}

export function discard(g, iid) {
  const p = g.cards[iid].owner;
  moveCard(g, iid, 'graveyard');
  log(g, { t: 'discard', p, iid });
}

export function discardRandom(g, p, n = 1) {
  for (let i = 0; i < n; i++) {
    const hand = g.players[p].hand;
    if (!hand.length) return;
    discard(g, hand[randInt(g, hand.length)]);
  }
}

export function mill(g, p, n) {
  for (let i = 0; i < n; i++) {
    const lib = g.players[p].library;
    if (!lib.length) return;
    moveCard(g, lib[0], 'graveyard');
  }
  log(g, { t: 'mill', p, n });
}

// ---------------------------------------------------------------------------
// Effects used by cards

export function gainLife(g, p, n) {
  if (n <= 0) return;
  g.players[p].life += n;
  log(g, { t: 'life', p, delta: n });
}

export function loseLife(g, p, n) {
  if (n <= 0) return;
  g.players[p].life -= n;
  log(g, { t: 'life', p, delta: -n });
}

// target: { p } for a player, { c: iid } for a permanent.
export function dealDamage(g, src, target, amount, opts = {}) {
  if (amount <= 0 || !target) return 0;
  if (target.p !== undefined) {
    const pl = g.players[target.p];
    const prevented = Math.min(pl.prevent, amount);
    pl.prevent -= prevented;
    amount -= prevented;
    if (amount <= 0) {
      log(g, { t: 'prevent', src, target });
      return 0;
    }
    pl.life -= amount;
    log(g, { t: 'damage', src, target, amount, combat: !!opts.combat });
    const sc = src != null ? g.cards[src] : null;
    if (sc && sc.zone === 'battlefield') {
      const sd = DB[sc.id];
      if (sd.onDamagePlayer) sd.onDamagePlayer(g, src, target.p, amount, !!opts.combat);
    }
    return amount;
  }
  const iid = target.c;
  const c = g.cards[iid];
  if (!c || c.zone !== 'battlefield' || !isCreature(g, iid)) return 0;
  const d = DB[c.id];
  if (isProtectedFrom(g, iid, src) || (d.immuneToCreatures && src != null && isCreature(g, src))) {
    log(g, { t: 'prevent', src, target });
    return 0;
  }
  const prevented = Math.min(c.prevent, amount);
  c.prevent -= prevented;
  amount -= prevented;
  if (amount <= 0) {
    log(g, { t: 'prevent', src, target });
    return 0;
  }
  c.damage += amount;
  if (src != null && !c.damagedBy.includes(src)) c.damagedBy.push(src);
  log(g, { t: 'damage', src, target, amount, combat: !!opts.combat });
  return amount;
}

export function destroy(g, iid, opts = {}) {
  const c = g.cards[iid];
  if (!c || c.zone !== 'battlefield') return false;
  if (!opts.noRegen && !c.noRegen && c.regen > 0 && isCreature(g, iid)) {
    c.regen--;
    c.tapped = true;
    c.damage = 0;
    removeFromCombat(g, iid);
    log(g, { t: 'regenerate', iid });
    return false;
  }
  log(g, { t: 'destroy', iid });
  moveCard(g, iid, 'graveyard');
  return true;
}

export function sacrifice(g, iid) {
  const c = g.cards[iid];
  if (!c || c.zone !== 'battlefield') return;
  log(g, { t: 'sacrifice', iid });
  moveCard(g, iid, 'graveyard');
}

export function exile(g, iid) {
  log(g, { t: 'exile', iid });
  moveCard(g, iid, 'exile');
}

export function bounce(g, iid) {
  log(g, { t: 'bounce', iid });
  moveCard(g, iid, 'hand');
}

export function tap(g, iid) {
  g.cards[iid].tapped = true;
  log(g, { t: 'tap', iid });
}

export function untap(g, iid) {
  g.cards[iid].tapped = false;
}

export function addMod(g, iid, mod) {
  const c = g.cards[iid];
  if (c.zone !== 'battlefield') return;
  c.mods.push(mod);
  log(g, { t: 'mod', iid, mod });
}

export function addCounters(g, iid, n) {
  g.cards[iid].counters += n;
  log(g, { t: 'counter', iid, n });
}

export function regenerate(g, iid) {
  const c = g.cards[iid];
  if (c.zone !== 'battlefield') return;
  c.regen++;
  log(g, { t: 'regenShield', iid });
}

export function preventDamage(g, target, n) {
  if (target.p !== undefined) g.players[target.p].prevent += n;
  else g.cards[target.c].prevent += n;
  log(g, { t: 'preventShield', target, n });
}

export function addMana(g, p, color, n = 1) {
  g.players[p].pool[color] += n;
  log(g, { t: 'mana', p, color, n });
}

export function extraTurn(g, p) {
  g.extraTurns.push(p);
  log(g, { t: 'extraTurn', p });
}

export function gainControl(g, iid, p, source) {
  const c = g.cards[iid];
  if (c.controller === p) return;
  removeFromCombat(g, iid);
  c.controller = p;
  c.controlSource = source;
  c.sick = true;
  log(g, { t: 'control', iid, p });
}

export function counterStackItem(g, stackId) {
  const i = g.stack.findIndex((s) => s.id === stackId);
  if (i < 0) return false;
  const [item] = g.stack.splice(i, 1);
  log(g, { t: 'countered', src: item.src, kind: item.kind });
  if (item.kind === 'spell') moveCard(g, item.src, 'graveyard');
  return item;
}

export function searchLibraryToHand(g, p, iid) {
  const lib = g.players[p].library;
  if (iid != null && lib.includes(iid)) {
    moveCard(g, iid, 'hand');
    log(g, { t: 'tutor', p, iid });
  }
  shuffle(g, lib);
}

// ---------------------------------------------------------------------------
// Targeting

export const isPlayerTarget = (t) => t && t.p !== undefined;

function permanentMatches(g, iid, kind) {
  switch (kind) {
    case 'creature':
    case 'any':
      return isCreature(g, iid);
    case 'permanent':
      return true;
    case 'artifact':
      return isArtifact(g, iid);
    case 'enchantment':
      return isEnchantment(g, iid);
    case 'artEnch':
      return isArtifact(g, iid) || isEnchantment(g, iid);
    case 'land':
      return isLand(g, iid);
    case 'nonland':
      return !isLand(g, iid);
    case 'tappable':
      return isArtifact(g, iid) || isCreature(g, iid) || isLand(g, iid);
    default:
      return false;
  }
}

// ctx: { src, controller } — src is the card whose spell/ability is targeting.
export function legalTargets(g, spec, ctx) {
  const out = [];
  const ok = (t) => !spec.filter || spec.filter(g, t, ctx);
  if (spec.kind === 'player' || spec.kind === 'any') {
    for (let p = 0; p < 2; p++) {
      const t = { p };
      if (ok(t)) out.push(t);
    }
  }
  if (spec.kind === 'spell') {
    for (const item of g.stack) {
      if (item.src === ctx.src) continue;
      const t = { s: item.id };
      if (item.kind === 'spell' && ok(t)) out.push(t);
    }
    return out;
  }
  if (spec.kind === 'gyCreature') {
    for (const iid of g.players[ctx.controller].graveyard) {
      const t = { c: iid };
      if (isCreature(g, iid) && ok(t)) out.push(t);
    }
    return out;
  }
  if (spec.kind !== 'player') {
    for (const iid of g.battlefield) {
      if (!permanentMatches(g, iid, spec.kind)) continue;
      if (isCreature(g, iid) && isProtectedFrom(g, iid, ctx.src)) continue;
      if (hasKw(g, iid, 'shroud')) continue;
      const t = { c: iid };
      if (ok(t)) out.push(t);
    }
  }
  return out;
}

export function sameTarget(a, b) {
  if (!a || !b) return false;
  if (a.p !== undefined) return a.p === b.p;
  if (a.s !== undefined) return a.s === b.s;
  return a.c === b.c;
}

export function targetStillLegal(g, spec, ctx, t) {
  if (!t) return false;
  if (t.s !== undefined) return g.stack.some((s) => s.id === t.s);
  if (t.c !== undefined) {
    const c = g.cards[t.c];
    const zone = spec.kind === 'gyCreature' ? 'graveyard' : 'battlefield';
    if (!c || c.zone !== zone) return false;
  }
  return legalTargets(g, spec, ctx).some((x) => sameTarget(x, t));
}

// Returns the i-th target if it is still legal on resolution, else null.
export function tgt(g, ctx, i = 0) {
  const spec = ctx.specs?.[i];
  const t = ctx.targets?.[i];
  if (!spec || !t) return null;
  return targetStillLegal(g, spec, ctx, t) ? t : null;
}

// ---------------------------------------------------------------------------
// Mana sources and payment

export function manaAbilityOf(g, iid) {
  const d = def(g, iid);
  return d.mana || null;
}

export function manaSources(g, p, opts = {}) {
  const out = [];
  for (const iid of g.battlefield) {
    const c = g.cards[iid];
    if (c.controller !== p || c.tapped) continue;
    if (opts.exclude && opts.exclude.includes(iid)) continue;
    const m = manaAbilityOf(g, iid);
    if (!m) continue;
    if (m.sac && !opts.includeSac) continue;
    const creature = isCreature(g, iid);
    if (creature && c.sick && !hasKw(g, iid, 'haste')) continue;
    let rank = isLand(g, iid) ? 0 : creature ? 2 : 1;
    if (m.pain) rank = 3;
    out.push({
      iid,
      produces: m.colors === 'any' ? [...COLORS] : m.colors,
      amount: m.amount || 1,
      rank,
    });
  }
  return out;
}

function colorsWanted(g, p) {
  const keep = {};
  for (const iid of g.players[p].hand) {
    const cost = parseCost(def(g, iid).cost);
    for (const c of COLORS) if (cost[c]) keep[c] = (keep[c] || 0) + cost[c];
  }
  return keep;
}

export function canPay(g, p, cost, opts = {}) {
  const c = typeof cost === 'string' ? parseCost(cost) : cost;
  return !!planPayment(g.players[p].pool, manaSources(g, p, opts), c);
}

export function pay(g, p, cost, opts = {}) {
  const c = typeof cost === 'string' ? parseCost(cost) : cost;
  const pl = g.players[p];
  const plan = planPayment(pl.pool, manaSources(g, p, opts), c, { keep: colorsWanted(g, p) });
  if (!plan) return false;
  for (const k of Object.keys(plan.pool)) pl.pool[k] -= plan.pool[k];
  for (const t of plan.taps) {
    const card = g.cards[t.iid];
    card.tapped = true;
    log(g, { t: 'tapMana', iid: t.iid, color: t.color });
    const m = manaAbilityOf(g, t.iid);
    // Multi-mana sources (Sol Ring) float whatever the payment didn't use.
    if (t.amount > t.used) pl.pool[m.colors === 'any' ? t.color : m.colors[0]] += t.amount - t.used;
    if (m.pain) dealDamage(g, t.iid, { p }, m.pain);
  }
  return true;
}

// Largest X payable for a cost with X in it.
export function maxX(g, p, costStr, opts = {}) {
  const base = parseCost(costStr);
  if (!base.X) return 0;
  let x = 0;
  while (x < 30 && canPay(g, p, withX(costStr, x + 1), opts)) x++;
  return x;
}

// ---------------------------------------------------------------------------
// Casting and activating

export function spellSpecs(d) {
  if (d.aura || d.control) return [d.enchant || { kind: 'creature' }];
  return d.spell?.targets || [];
}

export function canCastTiming(g, p, iid) {
  const d = def(g, iid);
  if (!g.pending || g.pending.type !== 'priority' || g.pending.player !== p) return false;
  if (d.type.includes('Land')) return false;
  const instant = d.type.includes('Instant');
  if (instant) return true;
  return g.active === p && isMain(g.step) && g.stack.length === 0;
}

export function canPlayLand(g, p, iid) {
  const d = def(g, iid);
  if (!d.type.includes('Land')) return false;
  if (!g.pending || g.pending.type !== 'priority' || g.pending.player !== p) return false;
  return g.active === p && isMain(g.step) && g.stack.length === 0 && g.players[p].landsPlayed < 1;
}

// Is there at least one legal way to cast this card right now?
export function canCast(g, p, iid) {
  const c = g.cards[iid];
  if (c.zone !== 'hand' || c.owner !== p) return false;
  const d = DB[c.id];
  if (!canCastTiming(g, p, iid)) return false;
  if (d.canCast && !d.canCast(g, p, iid)) return false;
  const cost = parseCost(d.cost);
  const minX = cost.X ? d.minX ?? 1 : 0;
  if (!canPay(g, p, withX(d.cost, minX))) return false;
  const ctx = { src: iid, controller: p };
  return spellSpecs(d).every((spec) => legalTargets(g, spec, ctx).length > 0);
}

export function abilityList(g, iid) {
  return def(g, iid).abilities || [];
}

export function canActivate(g, p, iid, index) {
  const c = g.cards[iid];
  if (c.zone !== 'battlefield' || c.controller !== p) return false;
  if (!g.pending || g.pending.type !== 'priority' || g.pending.player !== p) return false;
  const ab = abilityList(g, iid)[index];
  if (!ab) return false;
  if (ab.sorcery && !(g.active === p && isMain(g.step) && g.stack.length === 0)) return false;
  if (ab.tap) {
    if (c.tapped) return false;
    if (isCreature(g, iid) && c.sick && !hasKw(g, iid, 'haste')) return false;
  }
  if (ab.condition && !ab.condition(g, iid)) return false;
  const exclude = ab.tap ? [iid] : [];
  if (!canPay(g, p, withX(ab.cost || '', ab.cost?.includes('X') ? 1 : 0), { exclude })) return false;
  const ctx = { src: iid, controller: p };
  return (ab.targets || []).every((spec) => legalTargets(g, spec, ctx).length > 0);
}

function validTargets(g, specs, targets, ctx) {
  if ((targets || []).length !== specs.length) return false;
  return specs.every((spec, i) => legalTargets(g, spec, ctx).some((t) => sameTarget(t, targets[i])));
}

function giveOppPriority(g, p) {
  g.passes = 1;
  g.priority = opp(p);
  g.pending = { type: 'priority', player: g.priority };
}

function doCast(g, p, a) {
  const iid = a.iid;
  if (!canCast(g, p, iid)) throw new Error('Cannot cast that now');
  const d = def(g, iid);
  const specs = spellSpecs(d);
  const ctx = { src: iid, controller: p };
  if (!validTargets(g, specs, a.targets, ctx)) throw new Error('Illegal targets');
  const x = parseCost(d.cost).X ? Math.max(d.minX ?? 1, a.x | 0) : 0;
  if (!pay(g, p, withX(d.cost, x))) throw new Error('Cannot pay');
  const hand = g.players[p].hand;
  hand.splice(hand.indexOf(iid), 1);
  g.cards[iid].zone = 'stack';
  const item = { id: g.nextStackId++, kind: 'spell', src: iid, controller: p, targets: a.targets || [], x, pick: a.pick ?? null, color: a.color ?? null };
  g.stack.push(item);
  log(g, { t: 'cast', p, iid, targets: item.targets, x, stackId: item.id });
  giveOppPriority(g, p);
}

function doActivate(g, p, a) {
  const { iid, index } = a;
  if (!canActivate(g, p, iid, index)) throw new Error('Cannot activate');
  const ab = abilityList(g, iid)[index];
  const ctx = { src: iid, controller: p };
  const specs = ab.targets || [];
  if (!validTargets(g, specs, a.targets, ctx)) throw new Error('Illegal targets');
  const hasX = (ab.cost || '').includes('X');
  const x = hasX ? Math.max(1, a.x | 0) : 0;
  if (!pay(g, p, withX(ab.cost || '', x), { exclude: ab.tap ? [iid] : [] })) throw new Error('Cannot pay');
  const c = g.cards[iid];
  if (ab.tap) c.tapped = true;
  c.activations++;
  if (ab.life) loseLife(g, p, ab.life);
  log(g, { t: 'activate', p, iid, index, targets: a.targets || [] });
  if (ab.sac) sacrifice(g, iid);
  if (ab.manaAbility) {
    ab.effect(g, { src: iid, controller: p, targets: [], x, color: a.color, specs: [] });
    checkSBA(g);
    if (!g.over) g.pending = { type: 'priority', player: p };
    return;
  }
  const item = { id: g.nextStackId++, kind: 'ability', src: iid, index, controller: p, targets: a.targets || [], x, cardId: c.id, color: a.color ?? null };
  g.stack.push(item);
  giveOppPriority(g, p);
}

function doPlayLand(g, p, a) {
  if (!canPlayLand(g, p, a.iid)) throw new Error('Cannot play land');
  g.players[p].landsPlayed++;
  moveCard(g, a.iid, 'battlefield', { controller: p });
  log(g, { t: 'playLand', p, iid: a.iid });
  for (const oid of [...g.battlefield]) {
    const od = def(g, oid);
    if (od.onLandEnters) od.onLandEnters(g, oid, a.iid);
  }
  checkSBA(g);
  if (!g.over) g.pending = { type: 'priority', player: p };
}

function resolveTop(g) {
  const item = g.stack.pop();
  const c = g.cards[item.src];
  const d = item.kind === 'spell' ? DB[c.id] : DB[item.cardId];
  if (item.kind === 'spell') {
    const specs = spellSpecs(d);
    const ctx = { src: item.src, controller: item.controller, targets: item.targets, x: item.x, pick: item.pick, color: item.color, specs, item };
    if (specs.length && !specs.some((spec, i) => targetStillLegal(g, spec, ctx, item.targets[i]))) {
      log(g, { t: 'fizzle', iid: item.src });
      moveCard(g, item.src, 'graveyard');
      return;
    }
    log(g, { t: 'resolve', iid: item.src, targets: item.targets });
    if (d.type.includes('Instant') || d.type.includes('Sorcery')) {
      d.spell.resolve(g, ctx);
      if (g.cards[item.src].zone === 'stack') moveCard(g, item.src, 'graveyard');
    } else {
      moveCard(g, item.src, 'battlefield', { controller: item.controller });
      if (d.aura || d.control) {
        c.attachedTo = item.targets[0].c;
        if (d.control) gainControl(g, c.attachedTo, item.controller, item.src);
      }
      if (d.onEnter) d.onEnter(g, item.src);
    }
  } else {
    const ab = d.abilities[item.index];
    const specs = ab.targets || [];
    const ctx = { src: item.src, controller: item.controller, targets: item.targets, x: item.x, color: item.color, specs, item };
    if (specs.length && !specs.some((spec, i) => targetStillLegal(g, spec, ctx, item.targets[i]))) {
      log(g, { t: 'fizzle', iid: item.src, ability: true });
      return;
    }
    log(g, { t: 'resolveAbility', iid: item.src, index: item.index, targets: item.targets });
    ab.effect(g, ctx);
  }
}

// ---------------------------------------------------------------------------
// State-based actions

export function checkSBA(g) {
  if (g.over) return;
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;
    for (const iid of [...g.battlefield]) {
      const c = g.cards[iid];
      if (c.zone !== 'battlefield') continue;
      const d = DB[c.id];
      if (d.type.includes('Creature')) {
        const s = stats(g, iid);
        if (s.toughness <= 0) {
          log(g, { t: 'dies', iid });
          moveCard(g, iid, 'graveyard');
          changed = true;
          continue;
        }
        if (c.damage >= s.toughness && c.damage > 0) {
          if (destroy(g, iid)) changed = true;
          continue;
        }
      }
      if (d.aura || d.control) {
        const t = c.attachedTo;
        const tc = t != null ? g.cards[t] : null;
        const spec = d.enchant || { kind: 'creature' };
        if (!tc || tc.zone !== 'battlefield' || !permanentMatches(g, t, spec.kind)) {
          moveCard(g, iid, 'graveyard');
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  const lost = g.players.map((pl) => pl.life <= 0 || pl.drewFromEmpty || pl.conceded);
  if (lost[0] || lost[1]) {
    g.over = true;
    g.winner = lost[0] && lost[1] ? -1 : lost[0] ? 1 : 0;
    const loser = lost[0] ? 0 : 1;
    const pl = g.players[loser];
    g.reason = pl.conceded ? 'concede' : pl.drewFromEmpty ? 'deck' : 'life';
    g.pending = null;
    log(g, { t: 'gameOver', winner: g.winner, reason: g.reason });
  }
}

// ---------------------------------------------------------------------------
// Combat

export function canAttack(g, iid) {
  const c = g.cards[iid];
  if (c.zone !== 'battlefield' || c.controller !== g.active || !isCreature(g, iid)) return false;
  if (c.tapped) return false;
  const s = stats(g, iid);
  if (c.sick && !s.kw.has('haste')) return false;
  if (s.kw.has('defender')) return false;
  const d = def(g, iid);
  if (d.canAttack && !d.canAttack(g, iid)) return false;
  for (const oid of g.battlefield) {
    const od = def(g, oid);
    if (od.attackRestriction && !od.attackRestriction(g, oid, iid)) return false;
  }
  return true;
}

export function mustAttack(g, iid) {
  return canAttack(g, iid) && hasKw(g, iid, 'attacksEachTurn');
}

const WALKS = { islandwalk: 'Island', swampwalk: 'Swamp', forestwalk: 'Forest', mountainwalk: 'Mountain', plainswalk: 'Plains' };

export function canBlock(g, blocker, attacker) {
  const b = g.cards[blocker];
  if (b.zone !== 'battlefield' || !isCreature(g, blocker) || b.tapped) return false;
  if (b.controller === g.cards[attacker].controller) return false;
  const bs = stats(g, blocker);
  const as = stats(g, attacker);
  if (bs.kw.has('cantBlock')) return false;
  if (as.kw.has('unblockable')) return false;
  if (as.kw.has('flying') && !bs.kw.has('flying') && !bs.kw.has('reach')) return false;
  if (bs.kw.has('blocksOnlyFliers') && !as.kw.has('flying')) return false;
  if (as.kw.has('noWalls') && hasSub(g, blocker, 'Wall')) return false;
  for (const [k, land] of Object.entries(WALKS)) {
    if (as.kw.has(k) && controlsLandType(g, b.controller, land)) return false;
  }
  if (colorsOf(g, blocker).some((col) => as.kw.has('pro' + col))) return false;
  return true;
}

export function attackers(g) {
  return g.combat ? g.combat.attackers : [];
}

export function blockersOf(g, attacker) {
  if (!g.combat) return [];
  return g.combat.blocks.filter(([, a]) => a === attacker).map(([b]) => b);
}

export function isBlocked(g, attacker) {
  return !!g.combat && g.combat.blocked.includes(attacker);
}

function removeFromCombat(g, iid) {
  const cb = g.combat;
  if (!cb) return;
  cb.attackers = cb.attackers.filter((a) => a !== iid);
  cb.blocks = cb.blocks.filter(([b, a]) => b !== iid && a !== iid);
}

function declareAttackers(g, p, list) {
  list = [...new Set(list || [])];
  for (const iid of list) if (!canAttack(g, iid)) throw new Error('Illegal attacker');
  for (const iid of g.battlefield) {
    if (mustAttack(g, iid) && !list.includes(iid)) list.push(iid);
  }
  g.combat = { attackers: list, blocks: [], blocked: [], defender: opp(p) };
  for (const iid of list) {
    if (!hasKw(g, iid, 'vigilance')) g.cards[iid].tapped = true;
  }
  log(g, { t: 'attack', p, attackers: [...list] });
  for (const iid of list) {
    const d = def(g, iid);
    if (d.onAttack) d.onAttack(g, iid);
  }
  checkSBA(g);
}

function declareBlockers(g, p, blocks) {
  const used = new Set();
  const clean = [];
  for (const [b, a] of blocks || []) {
    if (used.has(b)) throw new Error('Creature already blocking');
    if (!g.combat.attackers.includes(a)) throw new Error('Not attacking');
    if (!canBlock(g, b, a)) throw new Error('Illegal block');
    used.add(b);
    clean.push([b, a]);
  }
  g.combat.blocks = clean;
  g.combat.blocked = [...new Set(clean.map(([, a]) => a))];
  log(g, { t: 'block', p, blocks: clean.map((x) => [...x]) });
  for (const [b, a] of clean) {
    const d = def(g, b);
    if (d.onBlock) d.onBlock(g, b, a);
  }
}

function combatParticipants(g) {
  const cb = g.combat;
  return [...cb.attackers, ...cb.blocks.map(([b]) => b)];
}

function combatDamageStep(g, firstStrikeStep, anyFirstStrike) {
  const cb = g.combat;
  const deals = (iid) => {
    if (!anyFirstStrike) return true;
    const fs = hasKw(g, iid, 'firstStrike');
    return firstStrikeStep ? fs : !fs;
  };
  const assignments = [];
  for (const a of cb.attackers) {
    if (g.cards[a].zone !== 'battlefield' || !deals(a)) continue;
    const s = stats(g, a);
    let remaining = s.power;
    if (remaining <= 0) continue;
    const trample = s.kw.has('trample');
    if (!cb.blocked.includes(a)) {
      assignments.push([a, { p: cb.defender }, remaining]);
      continue;
    }
    const blockers = blockersOf(g, a).filter((b) => g.cards[b].zone === 'battlefield');
    if (!blockers.length) {
      if (trample) assignments.push([a, { p: cb.defender }, remaining]);
      continue;
    }
    blockers.forEach((b, i) => {
      if (remaining <= 0) return;
      const lethal = Math.max(0, toughness(g, b) - g.cards[b].damage);
      const last = i === blockers.length - 1;
      const amt = last && !trample ? remaining : Math.min(remaining, Math.max(lethal, 0));
      if (amt > 0) assignments.push([a, { c: b }, amt]);
      remaining -= amt;
    });
    if (remaining > 0 && trample) assignments.push([a, { p: cb.defender }, remaining]);
  }
  for (const [b, a] of cb.blocks) {
    if (g.cards[b].zone !== 'battlefield' || g.cards[a].zone !== 'battlefield' || !deals(b)) continue;
    const pw = power(g, b);
    if (pw > 0) assignments.push([b, { c: a }, pw]);
  }
  if (g.fog) {
    if (assignments.length) log(g, { t: 'fog' });
    return;
  }
  log(g, { t: 'combatDamage', firstStrike: firstStrikeStep, assignments: assignments.map(([s, t, n]) => [s, t, n]) });
  for (const [src, target, n] of assignments) dealDamage(g, src, target, n, { combat: true });
}

function resolveCombatDamage(g) {
  const anyFS = combatParticipants(g).some((iid) => g.cards[iid].zone === 'battlefield' && hasKw(g, iid, 'firstStrike'));
  if (anyFS) {
    combatDamageStep(g, true, true);
    checkSBA(g);
    if (g.over) return;
    combatDamageStep(g, false, true);
  } else {
    combatDamageStep(g, false, false);
  }
  checkSBA(g);
}

// ---------------------------------------------------------------------------
// Turn structure

function openPriority(g) {
  g.priority = g.active;
  g.passes = 0;
  g.pending = { type: 'priority', player: g.active };
}

function nextStep(g) {
  const i = STEP_ORDER.indexOf(g.step);
  if (g.step === 'cleanup') {
    beginTurn(g);
    return;
  }
  g.step = STEP_ORDER[i + 1];
  g.entered = false;
}

function emptyPools(g) {
  for (const pl of g.players) pl.pool = emptyPool();
}

function beginTurn(g) {
  g.active = g.extraTurns.length ? g.extraTurns.pop() : g.turn === 0 ? g.first : opp(g.active);
  g.turn++;
  g.players[g.active].landsPlayed = 0;
  g.fog = false;
  g.combat = null;
  for (const iid of Object.keys(g.cards)) {
    const c = g.cards[iid];
    c.damagedBy = [];
    c.activations = 0;
  }
  log(g, { t: 'turn', p: g.active, turn: g.turn });
  g.step = 'untap';
  g.entered = false;
}

function permanentsOf(g, p) {
  return g.battlefield.filter((iid) => g.cards[iid].controller === p);
}

function enterStep(g) {
  g.entered = true;
  emptyPools(g);
  g.passes = 0;
  const ap = g.active;
  log(g, { t: 'step', step: g.step, p: ap });
  switch (g.step) {
    case 'untap':
      for (const iid of permanentsOf(g, ap)) {
        const c = g.cards[iid];
        c.sick = false;
        if (!def(g, iid).noUntap) c.tapped = false;
      }
      nextStep(g);
      return;
    case 'upkeep':
      for (const iid of permanentsOf(g, ap)) {
        const d = def(g, iid);
        if (d.onUpkeep && g.cards[iid].zone === 'battlefield') d.onUpkeep(g, iid);
      }
      checkSBA(g);
      nextStep(g);
      return;
    case 'draw':
      if (!(g.turn === 1 && ap === g.first)) {
        draw(g, ap, 1);
        for (const iid of g.battlefield) {
          const d = def(g, iid);
          if (d.onDrawStep && !g.cards[iid].tapped) d.onDrawStep(g, iid, ap);
        }
      }
      checkSBA(g);
      nextStep(g);
      return;
    case 'main1':
    case 'main2': {
      const pl = g.players[ap];
      if (g.step === 'main1' && pl.bonusMana) {
        pl.pool.C += pl.bonusMana;
        log(g, { t: 'mana', p: ap, color: 'C', n: pl.bonusMana });
        pl.bonusMana = 0;
      }
      openPriority(g);
      return;
    }
    case 'attackers': {
      const able = g.battlefield.filter((iid) => canAttack(g, iid));
      if (!able.length) {
        g.step = 'main2';
        g.entered = false;
        return;
      }
      g.pending = { type: 'attackers', player: ap };
      return;
    }
    case 'blockers': {
      const cb = g.combat;
      if (!cb || !cb.attackers.length) {
        g.step = 'main2';
        g.entered = false;
        return;
      }
      const def_ = cb.defender;
      const anyBlock = creaturesOf(g, def_).some((b) => cb.attackers.some((a) => canBlock(g, b, a)));
      if (anyBlock) {
        g.pending = { type: 'blockers', player: def_ };
      } else {
        declareBlockers(g, def_, []);
        openPriority(g);
      }
      return;
    }
    case 'damage':
      if (g.combat && g.combat.attackers.length) resolveCombatDamage(g);
      if (g.over) return;
      g.combat = null;
      log(g, { t: 'endCombat' });
      nextStep(g);
      return;
    case 'end':
      for (const iid of [...g.battlefield]) {
        const d = def(g, iid);
        if (d.onEndStep && g.cards[iid].zone === 'battlefield') d.onEndStep(g, iid);
      }
      checkSBA(g);
      if (g.over) return;
      openPriority(g);
      return;
    case 'cleanup': {
      const pl = g.players[ap];
      if (pl.hand.length > HAND_SIZE) {
        g.pending = { type: 'discard', player: ap, count: pl.hand.length - HAND_SIZE };
        return;
      }
      finishCleanup(g);
      return;
    }
  }
}

function finishCleanup(g) {
  for (const iid of g.battlefield) {
    const c = g.cards[iid];
    c.damage = 0;
    // "Until end of turn" effects end; longer ones (turns > 0) count down.
    c.mods = c.mods.filter((m) => m.turns > 0).map((m) => ({ ...m, turns: m.turns - 1 }));
    c.regen = 0;
    c.prevent = 0;
    c.noRegen = false;
  }
  for (const pl of g.players) pl.prevent = 0;
  log(g, { t: 'endTurn', p: g.active });
  nextStep(g);
}

// Run the game forward until someone has to decide something.
export function advance(g) {
  let guard = 0;
  while (!g.over && !g.pending) {
    if (++guard > 1000) throw new Error('Engine stalled at step ' + g.step);
    if (!g.entered) enterStep(g);
    else nextStep(g);
  }
  return g;
}

function handlePass(g, p) {
  g.passes++;
  if (g.stack.length) {
    if (g.passes >= 2) {
      resolveTop(g);
      checkSBA(g);
      if (g.over) return;
      openPriority(g);
    } else {
      g.priority = opp(p);
      g.pending = { type: 'priority', player: g.priority };
    }
    return;
  }
  const needed = isMain(g.step) ? 1 : 2;
  if (g.passes >= needed) {
    g.pending = null;
    nextStep(g);
  } else {
    g.priority = opp(p);
    g.pending = { type: 'priority', player: g.priority };
  }
}

export function concede(g, p) {
  g.players[p].conceded = true;
  checkSBA(g);
}

export function act(g, a) {
  if (g.over) return g;
  if (a.type === 'concede') {
    concede(g, a.player ?? g.pending?.player ?? 0);
    return g;
  }
  const pend = g.pending;
  if (!pend) throw new Error('No decision pending');
  const p = pend.player;
  switch (pend.type) {
    case 'mulligan': {
      const pl = g.players[p];
      if (a.type === 'mulligan' && pl.hand.length > 1) {
        pl.mulligans++;
        for (const iid of [...pl.hand]) moveCard(g, iid, 'library');
        shuffle(g, pl.library);
        draw(g, p, HAND_SIZE - pl.mulligans);
        log(g, { t: 'mulligan', p, size: pl.hand.length });
        return g; // same player decides again
      }
      pl.decided = true;
      log(g, { t: 'keep', p, size: pl.hand.length });
      const other = opp(p);
      if (!g.players[other].decided) {
        g.pending = { type: 'mulligan', player: other };
        return g;
      }
      g.pending = null;
      g.step = 'cleanup';
      beginTurn(g);
      return advance(g);
    }
    case 'priority':
      if (a.type === 'pass') handlePass(g, p);
      else if (a.type === 'play') doPlayLand(g, p, a);
      else if (a.type === 'cast') doCast(g, p, a);
      else if (a.type === 'activate') doActivate(g, p, a);
      else throw new Error('Bad action for priority: ' + a.type);
      return advance(g);
    case 'attackers':
      if (a.type !== 'attack') throw new Error('Expected attack');
      g.pending = null;
      declareAttackers(g, p, a.attackers);
      if (g.over) return g;
      if (!g.combat.attackers.length) {
        g.combat = null;
        g.step = 'main2';
        g.entered = false;
        return advance(g);
      }
      openPriority(g);
      return advance(g);
    case 'blockers':
      if (a.type !== 'block') throw new Error('Expected block');
      g.pending = null;
      declareBlockers(g, p, a.blocks);
      openPriority(g);
      return advance(g);
    case 'discard': {
      const ids = a.iids || [];
      if (ids.length !== pend.count) throw new Error('Discard ' + pend.count);
      for (const iid of ids) if (g.cards[iid].zone !== 'hand' || g.cards[iid].owner !== p) throw new Error('Not in hand');
      for (const iid of ids) discard(g, iid);
      g.pending = null;
      finishCleanup(g);
      return advance(g);
    }
  }
  throw new Error('Unhandled pending ' + pend.type);
}

// ---------------------------------------------------------------------------
// Queries for UI and AI

export function playableLands(g, p) {
  return g.players[p].hand.filter((iid) => canPlayLand(g, p, iid));
}

export function castableCards(g, p) {
  return g.players[p].hand.filter((iid) => canCast(g, p, iid));
}

export function activatable(g, p) {
  const out = [];
  for (const iid of g.battlefield) {
    abilityList(g, iid).forEach((ab, index) => {
      if (canActivate(g, p, iid, index)) out.push({ iid, index });
    });
  }
  return out;
}

// Anything the player could do at instant speed right now (for auto-pass).
export function hasInstantAction(g, p) {
  if (!g.pending || g.pending.type !== 'priority' || g.pending.player !== p) return false;
  if (castableCards(g, p).length) return true;
  return activatable(g, p).some(({ iid, index }) => !abilityList(g, iid)[index].manaAbility);
}

export function manaValueOf(g, iid) {
  return manaValue(def(g, iid).cost);
}

export function clone(g) {
  const log_ = g.log;
  g.log = [];
  const c = structuredClone(g);
  g.log = log_;
  c.record = false;
  return c;
}

export function drainLog(g) {
  const out = g.log;
  g.log = [];
  return out;
}

export function stackItemCard(g, item) {
  return item.kind === 'spell' ? g.cards[item.src].id : item.cardId;
}
