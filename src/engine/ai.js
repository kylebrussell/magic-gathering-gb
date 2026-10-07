// Computer opponent.
//
// Strategy: enumerate candidate actions, play each one out on a clone of the
// game (assuming the opponent just passes), and score the resulting position.
// Combat decisions simulate the whole combat with a quick predicted response.

import * as E from './game.js';
import { parseCost, manaValue, COLORS } from './mana.js';
import { nextRandom } from './rng.js';

const KW_BONUS = {
  flying: 0.8,
  firstStrike: 0.6,
  trample: 0.3,
  vigilance: 0.3,
  haste: 0.1,
  reach: 0.3,
  islandwalk: 0.4,
  swampwalk: 0.4,
  forestwalk: 0.4,
  mountainwalk: 0.4,
  plainswalk: 0.4,
  proW: 0.4,
  proU: 0.4,
  proB: 0.4,
  proR: 0.4,
  proG: 0.4,
  noWalls: 0.1,
};

function lifeScore(l) {
  if (l <= 0) return -100;
  return 8 * Math.log(l + 1);
}

export function creatureValue(g, iid) {
  const s = E.stats(g, iid, { ignoreTemp: true });
  const d = E.def(g, iid);
  const p = Math.max(0, s.power);
  const t = Math.max(0, s.toughness);
  if (t <= 0) return 0;
  let v = 1 + p * 1.0 + t * 0.55;
  if (s.kw.has('defender')) v -= p * 0.7 + 0.5;
  for (const k of s.kw) {
    const b = KW_BONUS[k];
    if (b) v += b * (k === 'flying' || k === 'firstStrike' || k === 'trample' ? 1 + p * 0.3 : 1);
  }
  for (const ab of d.abilities || []) {
    if (ab.ai === 'ping') v += 2;
    else if (ab.ai === 'regen') v += 1;
    else if (ab.ai === 'pump') v += 0.8;
    else if (!ab.manaAbility) v += 1;
  }
  if (d.mana) v += 0.8;
  if (d.lord) v += 1;
  if (d.onUpkeep && /damage to you/i.test(d.text)) v -= 0.6;
  if (d.onEndStep && d.id === 'ball_lightning') v = 0.5;
  return v;
}

function permanentValue(g, iid) {
  const d = E.def(g, iid);
  if (d.type.includes('Creature')) return creatureValue(g, iid);
  if (d.type.includes('Land')) {
    const m = d.mana;
    let v = 1.1;
    if (m && (m.colors === 'any' || m.colors.length > 1)) v += 0.2;
    return v;
  }
  if (d.aura || d.control) return 0.2;
  return d.ai?.value ?? 1.2;
}

export function evaluate(g, me) {
  const you = E.opp(me);
  // Grade wins and losses by margin so "lose by less" still guides blocking.
  if (g.over) {
    if (g.winner === me) return 10000 - 10 * Math.max(-20, g.players[you].life);
    if (g.winner === -1) return -5000;
    return -10000 + 10 * Math.max(-20, g.players[me].life);
  }
  let v = lifeScore(g.players[me].life) - lifeScore(g.players[you].life);
  for (const iid of g.battlefield) {
    const val = permanentValue(g, iid);
    v += g.cards[iid].controller === me ? val : -val;
  }
  v += 1.2 * (g.players[me].hand.length - g.players[you].hand.length);
  const lib = g.players[me].library.length;
  if (lib < 5) v -= (5 - lib) * 2;
  return v;
}

// ---------------------------------------------------------------------------
// Simulation helpers

function tryAct(s, a) {
  try {
    E.act(s, a);
    return true;
  } catch {
    return false;
  }
}

function runStack(s) {
  for (let i = 0; i < 60 && !s.over && s.stack.length && s.pending?.type === 'priority'; i++) {
    if (!tryAct(s, { type: 'pass' })) break;
  }
}

const COMBAT_STEPS = new Set(['attackers', 'blockers', 'damage']);

function runCombat(s) {
  for (let i = 0; i < 120 && !s.over; i++) {
    const p = s.pending;
    if (!p || !COMBAT_STEPS.has(s.step)) break;
    if (p.type === 'priority') tryAct(s, { type: 'pass' });
    else if (p.type === 'blockers') tryAct(s, { type: 'block', blocks: quickBlocks(s, p.player) });
    else break;
  }
}

function settle(s) {
  runStack(s);
  if (!s.over && s.combat && COMBAT_STEPS.has(s.step)) runCombat(s);
}

// Damage the opponent could swing back with next turn, minus what our
// untapped creatures can soak by blocking.
function crackbackDanger(g, me) {
  const you = E.opp(me);
  const theirs = E.creaturesOf(g, you)
    .filter((c) => !E.hasKw(g, c, 'defender'))
    .map((c) => Math.max(0, E.stats(g, c, { ignoreTemp: true }).power))
    .sort((a, b) => b - a);
  const blockers = E.creaturesOf(g, me).filter((c) => !g.cards[c].tapped || E.hasKw(g, c, 'vigilance')).length;
  const unblocked = theirs.slice(blockers);
  return unblocked.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Blocking

function wouldKill(g, src, dst, extraDamage = 0) {
  const ps = E.stats(g, src);
  if (ps.power <= 0) return false;
  if (E.isProtectedFrom(g, dst, src)) return false;
  return ps.power + extraDamage + g.cards[dst].damage >= E.toughness(g, dst);
}

// Fast heuristic blocks, used inside simulations and by easy opponents.
export function quickBlocks(g, me) {
  const atk = [...E.attackers(g)].sort((a, b) => E.power(g, b) - E.power(g, a));
  const free = new Set(E.creaturesOf(g, me).filter((b) => !g.cards[b].tapped));
  const blocks = [];
  let incoming = atk.reduce((n, a) => n + Math.max(0, E.power(g, a)), 0);
  const life = g.players[me].life;
  for (const a of atk) {
    const cands = [...free].filter((b) => E.canBlock(g, b, a));
    if (!cands.length) continue;
    const aFS = E.hasKw(g, a, 'firstStrike');
    const score = (b) => {
      const bFS = E.hasKw(g, b, 'firstStrike');
      const kills = wouldKill(g, b, a) && !(aFS && !bFS && wouldKill(g, a, b));
      const dies = wouldKill(g, a, b) && !(bFS && !aFS && wouldKill(g, b, a));
      if (kills && !dies) return 3;
      if (!dies) return 2;
      if (kills && creatureValue(g, a) >= creatureValue(g, b) - 0.5) return 1;
      return 0;
    };
    cands.sort((x, y) => score(y) - score(x) || creatureValue(g, x) - creatureValue(g, y));
    const best = cands[0];
    const sc = score(best);
    const pw = Math.max(0, E.power(g, a));
    // treat "nearly dead" as dead: keep a small cushion when racing
    const lethal = incoming >= life - 2;
    if (sc >= 1 || (lethal && pw > 0) || (sc === 2 && pw > 0)) {
      blocks.push([best, a]);
      free.delete(best);
      incoming -= pw;
    }
  }
  return blocks;
}

function simulateBlocks(g, me, blocks) {
  const s = E.clone(g);
  if (!tryAct(s, { type: 'block', blocks })) return -Infinity;
  runCombat(s);
  let v = evaluate(s, me);
  if (!s.over) {
    // being left in range of the next attack is worse than a lost creature
    const danger = crackbackDanger(s, me);
    const life = s.players[me].life;
    if (danger >= life) v -= 30;
    else if (danger >= life - 3) v -= 3;
  }
  return v;
}

function chooseBlocks(g, me, skill) {
  if (skill < 0.6 || nextRandom(g) > skill + 0.15) return quickBlocks(g, me);
  const atk = [...E.attackers(g)].sort((a, b) => E.power(g, b) - E.power(g, a));
  let blocks = [];
  let best = simulateBlocks(g, me, blocks);
  const used = new Set();
  for (const a of atk) {
    let choice = null;
    for (const b of E.creaturesOf(g, me)) {
      if (used.has(b) || !E.canBlock(g, b, a)) continue;
      const v = simulateBlocks(g, me, [...blocks, [b, a]]);
      if (v > best + 0.05) {
        best = v;
        choice = b;
      }
    }
    if (choice != null) {
      blocks = [...blocks, [choice, a]];
      used.add(choice);
    }
  }
  // Gang-block a big attacker if a second blocker turns a loss into a kill.
  for (const a of atk) {
    if (!blocks.some(([, x]) => x === a)) continue;
    for (const b of E.creaturesOf(g, me)) {
      if (used.has(b) || !E.canBlock(g, b, a)) continue;
      const v = simulateBlocks(g, me, [...blocks, [b, a]]);
      if (v > best + 0.3) {
        best = v;
        blocks = [...blocks, [b, a]];
        used.add(b);
      }
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Attacking

function chooseAttackers(g, me, skill) {
  const able = g.battlefield.filter((iid) => E.canAttack(g, iid));
  if (!able.length) return [];
  const score = (set) => {
    const s = E.clone(g);
    if (!tryAct(s, { type: 'attack', attackers: set })) return -Infinity;
    runCombat(s);
    let v = evaluate(s, me);
    if (!s.over) {
      const danger = crackbackDanger(s, me);
      const life = s.players[me].life;
      if (danger >= life) v -= 40;
      else if (danger >= life - 3) v -= 4;
    }
    return v;
  };
  let bestSet = [];
  let best = score([]);
  if (able.length <= 6) {
    for (let mask = 1; mask < 1 << able.length; mask++) {
      const set = able.filter((_, i) => mask & (1 << i));
      const v = score(set);
      if (v > best + 0.01) {
        best = v;
        bestSet = set;
      }
    }
  } else {
    // Greedy: add attackers one at a time while it helps.
    let cur = [];
    let improved = true;
    while (improved) {
      improved = false;
      for (const iid of able) {
        if (cur.includes(iid)) continue;
        const v = score([...cur, iid]);
        if (v > best + 0.01) {
          best = v;
          bestSet = [...cur, iid];
          improved = true;
        }
      }
      cur = bestSet;
    }
  }
  const slip = nextRandom(g);
  if (slip < (1 - skill) * 0.5) {
    // Sloppy opponents sometimes just send everyone, or hold back.
    return slip < (1 - skill) * 0.25 ? able : able.filter((iid) => E.power(g, iid) >= 3);
  }
  return bestSet;
}

// ---------------------------------------------------------------------------
// Main-phase / instant-speed choices

function landScore(g, me, land) {
  const d = E.def(g, land);
  const produced = d.mana?.colors === 'any' ? COLORS : d.mana?.colors || [];
  const have = new Set();
  for (const l of E.landsOf(g, me)) {
    const m = E.def(g, l).mana;
    for (const c of m?.colors === 'any' ? COLORS : m?.colors || []) have.add(c);
  }
  let score = 0;
  for (const iid of g.players[me].hand) {
    const cost = parseCost(E.def(g, iid).cost);
    for (const c of COLORS) {
      if (cost[c] && produced.includes(c)) score += have.has(c) ? 1 : 3;
    }
  }
  if (d.mana?.pain) score -= 1;
  if (produced.length > 1) score += 0.5;
  return score;
}

function targetCombos(g, specs, ctx) {
  let combos = [[]];
  for (const spec of specs) {
    const opts = E.legalTargets(g, spec, ctx);
    const next = [];
    for (const c of combos) for (const t of opts) next.push([...c, t]);
    combos = next;
    if (combos.length > 60) combos = combos.slice(0, 60);
  }
  return combos;
}

function bestTutorPick(g, me) {
  const lands = E.landsOf(g, me).length;
  let best = null;
  let bestV = -1;
  for (const iid of g.players[me].library) {
    const d = E.def(g, iid);
    if (d.type.includes('Land')) continue;
    const mv = manaValue(d.cost);
    let v = mv + (d.rarity === 'R' ? 2 : d.rarity === 'U' ? 1 : 0);
    if (mv > lands + 1) v -= 4;
    if (v > bestV) {
      bestV = v;
      best = iid;
    }
  }
  return best ?? g.players[me].library[0] ?? null;
}

function castCandidates(g, me) {
  const out = [];
  for (const iid of E.castableCards(g, me)) {
    const d = E.def(g, iid);
    if (d.ai?.ritual) continue; // handled separately
    const ctx = { src: iid, controller: me };
    const combos = targetCombos(g, E.spellSpecs(d), ctx);
    const hasX = parseCost(d.cost).X > 0;
    const xs = hasX ? range(1, E.maxX(g, me, d.cost)) : [0];
    const pick = d.needsPick ? bestTutorPick(g, me) : undefined;
    for (const targets of combos) {
      for (const x of xs) out.push({ type: 'cast', iid, targets, x, pick });
    }
  }
  return out;
}

function abilityCandidates(g, me, endOfOppTurn) {
  const out = [];
  for (const { iid, index } of E.activatable(g, me)) {
    const ab = E.abilityList(g, iid)[index];
    if (ab.manaAbility) continue;
    const ctx = { src: iid, controller: me };
    for (const targets of targetCombos(g, ab.targets || [], ctx)) {
      // Pinging a player is best done at the end of the opponent's turn.
      if (ab.ai === 'ping' && targets[0]?.p !== undefined && !endOfOppTurn) continue;
      if (ab.ai === 'draw' && !endOfOppTurn) continue;
      if (ab.ai === 'mill' && !endOfOppTurn) continue;
      out.push({ type: 'activate', iid, index, targets });
    }
  }
  return out;
}

function range(a, b) {
  const r = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}

function scoreAction(g, me, a) {
  const s = E.clone(g);
  if (!tryAct(s, a)) return -Infinity;
  settle(s);
  return evaluate(s, me);
}

// Would casting Dark Ritual let us cast something good we otherwise can't?
function ritualPlan(g, me) {
  const rituals = E.castableCards(g, me).filter((iid) => E.def(g, iid).ai?.ritual);
  if (!rituals.length) return null;
  const s = E.clone(g);
  if (!tryAct(s, { type: 'cast', iid: rituals[0], targets: [] })) return null;
  runStack(s);
  const before = new Set(E.castableCards(g, me));
  const unlocked = E.castableCards(s, me).filter((iid) => !before.has(iid) && !E.def(s, iid).ai?.ritual);
  if (!unlocked.length) return null;
  const base = evaluate(s, me);
  for (const a of castCandidates(s, me)) {
    if (!unlocked.includes(a.iid)) continue;
    if (scoreAction(s, me, a) > base + 1.5) return { type: 'cast', iid: rituals[0], targets: [] };
  }
  return null;
}

function choosePriority(g, me, skill) {
  const myMain = g.active === me && E.isMain(g.step) && g.stack.length === 0;

  if (myMain) {
    const lands = E.playableLands(g, me);
    if (lands.length) {
      lands.sort((a, b) => landScore(g, me, b) - landScore(g, me, a));
      return { type: 'play', iid: lands[0] };
    }
  }

  const castable = E.castableCards(g, me);
  const abilities = E.activatable(g, me).filter(({ iid, index }) => !E.abilityList(g, iid)[index].manaAbility);
  if (!castable.length && !abilities.length) return { type: 'pass' };

  const endOfOppTurn = g.active !== me && g.step === 'end' && g.stack.length === 0;
  const candidates = [...castCandidates(g, me), ...abilityCandidates(g, me, endOfOppTurn || (g.active === me && g.step === 'main2'))];

  const ritual = myMain ? ritualPlan(g, me) : null;
  if (ritual) return ritual;
  if (!candidates.length) return { type: 'pass' };

  const base = scoreAction(g, me, { type: 'pass' });
  const passScore = settledScore(g, me);
  const baseline = Math.max(base === -Infinity ? passScore : base, passScore);

  let best = null;
  let bestV = baseline + 0.25;
  const scored = [];
  for (const a of candidates.slice(0, 250)) {
    const v = scoreAction(g, me, a);
    scored.push([v, a]);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  if (best && nextRandom(g) < (1 - skill) * 0.6) {
    // Weaker players sometimes pick a merely-decent play, or miss it entirely.
    const ok = scored.filter(([v]) => v > baseline + 0.25);
    if (ok.length && nextRandom(g) < 0.7) best = ok[Math.floor(nextRandom(g) * ok.length)][1];
    else if (g.stack.length || !E.isMain(g.step)) best = null;
  }
  return best || { type: 'pass' };
}

// Score of the position if we do nothing and the stack resolves.
function settledScore(g, me) {
  const s = E.clone(g);
  settle(s);
  return evaluate(s, me);
}

function chooseMulligan(g, me) {
  const hand = g.players[me].hand;
  const lands = hand.filter((iid) => E.isLand(g, iid)).length;
  const n = hand.length;
  if (n <= 5) return { type: 'keep' };
  if (n === 7 && (lands < 2 || lands > 5)) return { type: 'mulligan' };
  if (n === 6 && (lands < 1 || lands > 5)) return { type: 'mulligan' };
  return { type: 'keep' };
}

function chooseDiscard(g, me, count) {
  const hand = [...g.players[me].hand];
  const lands = E.landsOf(g, me).length + hand.filter((i) => E.isLand(g, i)).length;
  const value = (iid) => {
    const d = E.def(g, iid);
    if (d.type.includes('Land')) return lands > 6 ? 0 : 3;
    const mv = manaValue(d.cost);
    return 2 + (d.rarity === 'R' ? 1 : 0) - Math.max(0, mv - lands) * 0.5;
  };
  hand.sort((a, b) => value(a) - value(b));
  return { type: 'discard', iids: hand.slice(0, count) };
}

// Public entry point. `skill` 0..1 (1 = strongest).
export function decide(g, opts = {}) {
  const pend = g.pending;
  if (!pend) return null;
  const me = pend.player;
  const skill = opts.skill ?? 1;
  switch (pend.type) {
    case 'mulligan':
      return chooseMulligan(g, me);
    case 'priority':
      return choosePriority(g, me, skill);
    case 'attackers':
      return { type: 'attack', attackers: chooseAttackers(g, me, skill) };
    case 'blockers':
      return { type: 'block', blocks: chooseBlocks(g, me, skill) };
    case 'discard':
      return chooseDiscard(g, me, pend.count);
  }
  return { type: 'pass' };
}

// Used by the UI to suggest blocks/attacks or auto-play in tests.
export { chooseAttackers, chooseBlocks };
