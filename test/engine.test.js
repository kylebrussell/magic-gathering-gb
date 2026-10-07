import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/engine/index.js';
import * as E from '../src/engine/game.js';
import { decide } from '../src/engine/ai.js';
import { planPayment, parseCost } from '../src/engine/mana.js';
import { DECKS, STARTERS, expandDeck, deckSize } from '../src/data/decks.js';
import { CARDS } from '../src/data/cards.js';

// Build a game already in player 0's first main phase with the given cards.
function setup({ me = {}, them = {}, active = 0 } = {}) {
  const filler = Array(20).fill('plains');
  const g = E.newGame({ seed: 42, first: active, players: [{ name: 'Me', deck: filler }, { name: 'Them', deck: filler }] });
  // throw away the opening hands
  for (const p of [0, 1]) for (const iid of [...g.players[p].hand]) E.moveCard(g, iid, 'library');
  const ids = {};
  const make = (p, id, zone) => {
    const iid = g.nextId++;
    g.cards[iid] = { iid, id, owner: p, controller: p, zone: 'library', tapped: false, sick: true, damage: 0, counters: 0, mods: [], attachedTo: null, regen: 0, prevent: 0, damagedBy: [], controlSource: null, activations: 0, noRegen: false };
    g.players[p].library.unshift(iid);
    E.moveCard(g, iid, zone, { controller: p });
    if (zone === 'battlefield') g.cards[iid].sick = false;
    (ids[id] ||= []).push(iid);
    return iid;
  };
  [me, them].forEach((side, p) => {
    for (const id of side.battlefield || []) make(p, id, 'battlefield');
    for (const id of side.hand || []) make(p, id, 'hand');
  });
  g.players[0].decided = g.players[1].decided = true;
  g.turn = 2;
  g.active = active;
  g.step = 'main1';
  g.entered = true;
  g.priority = active;
  g.passes = 0;
  g.pending = { type: 'priority', player: active };
  g.log = [];
  const one = (id, n = 0) => ids[id][n];
  return { g, ids, one };
}

const passUntil = (g, pred, max = 50) => {
  for (let i = 0; i < max && !pred(g); i++) E.act(g, { type: 'pass' });
};

test('every deck has exactly 60 cards of known ids', () => {
  for (const [k, d] of Object.entries({ ...STARTERS, ...DECKS })) {
    assert.equal(deckSize(d.cards), 60, k);
    for (const id of Object.keys(d.cards)) assert.ok(CARDS[id], `${k}: ${id}`);
  }
});

test('mana payment prefers exact colors and keeps flexible sources', () => {
  const sources = [
    { iid: 1, produces: ['R'], amount: 1, rank: 0 },
    { iid: 2, produces: ['R', 'G'], amount: 1, rank: 0 },
    { iid: 3, produces: ['G'], amount: 1, rank: 0 },
  ];
  const plan = planPayment({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, sources, parseCost('1R'));
  assert.deepEqual(plan.taps.map((t) => t.iid).sort(), [1, 3]);
  assert.equal(planPayment({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, sources, parseCost('RRRR')), null);
});

test('Lightning Bolt kills a 2/2 and the land taps', () => {
  const { g, one } = setup({ me: { battlefield: ['mountain'], hand: ['lightning_bolt'] }, them: { battlefield: ['grizzly_bears'] } });
  const bolt = one('lightning_bolt');
  E.act(g, { type: 'cast', iid: bolt, targets: [{ c: one('grizzly_bears') }] });
  assert.equal(g.cards[one('mountain')].tapped, true);
  assert.equal(g.pending.player, 1, 'opponent gets priority');
  E.act(g, { type: 'pass' });
  assert.equal(g.cards[one('grizzly_bears')].zone, 'graveyard');
  assert.equal(g.cards[bolt].zone, 'graveyard');
});

test('Counterspell counters a spell', () => {
  const { g, one } = setup({ me: { battlefield: ['mountain'], hand: ['lightning_bolt'] }, them: { battlefield: ['island', 'island'], hand: ['counterspell'] } });
  E.act(g, { type: 'cast', iid: one('lightning_bolt'), targets: [{ p: 1 }] });
  const spellId = g.stack[0].id;
  E.act(g, { type: 'cast', iid: one('counterspell'), targets: [{ s: spellId }] });
  passUntil(g, (s) => s.stack.length === 0);
  assert.equal(g.players[1].life, 20);
  assert.equal(g.cards[one('lightning_bolt')].zone, 'graveyard');
});

test('summoning sickness and haste', () => {
  const { g, one } = setup({ me: { battlefield: ['mountain', 'mountain'], hand: ['raging_goblin', 'mons_goblin_raiders'] } });
  E.act(g, { type: 'cast', iid: one('raging_goblin'), targets: [] });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'cast', iid: one('mons_goblin_raiders'), targets: [] });
  E.act(g, { type: 'pass' });
  assert.equal(E.canAttack(g, one('raging_goblin')), true);
  assert.equal(E.canAttack(g, one('mons_goblin_raiders')), false);
});

test('flying can only be blocked by flying or reach', () => {
  const { g, one } = setup({ me: { battlefield: ['mesa_pegasus'] }, them: { battlefield: ['grizzly_bears', 'giant_spider'] } });
  E.act(g, { type: 'pass' }); // to combat
  assert.equal(g.pending.type, 'attackers');
  E.act(g, { type: 'attack', attackers: [one('mesa_pegasus')] });
  assert.equal(E.canBlock(g, one('grizzly_bears'), one('mesa_pegasus')), false);
  assert.equal(E.canBlock(g, one('giant_spider'), one('mesa_pegasus')), true);
});

test('first strike kills before the blocker strikes back', () => {
  const { g, one } = setup({ me: { battlefield: ['white_knight'] }, them: { battlefield: ['grizzly_bears'] } });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'attack', attackers: [one('white_knight')] });
  passUntil(g, (s) => s.pending.type === 'blockers');
  E.act(g, { type: 'block', blocks: [[one('grizzly_bears'), one('white_knight')]] });
  passUntil(g, (s) => s.step === 'main2');
  assert.equal(g.cards[one('grizzly_bears')].zone, 'graveyard');
  assert.equal(g.cards[one('white_knight')].damage, 0);
});

test('trample assigns excess damage to the player', () => {
  const { g, one } = setup({ me: { battlefield: ['war_mammoth'] }, them: { battlefield: ['wall_of_wood'] } });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'attack', attackers: [one('war_mammoth')] });
  passUntil(g, (s) => s.pending.type === 'blockers');
  E.act(g, { type: 'block', blocks: [[one('wall_of_wood'), one('war_mammoth')]] });
  passUntil(g, (s) => s.step === 'main2');
  assert.equal(g.cards[one('wall_of_wood')].zone, 'graveyard');
  assert.equal(g.players[1].life, 20); // 3 power, wall has 3 toughness: nothing left over
});

test('regeneration saves a creature from lethal damage', () => {
  const { g, one } = setup({ me: { battlefield: ['mountain'], hand: ['lightning_bolt'] }, them: { battlefield: ['drudge_skeletons', 'swamp'] } });
  E.act(g, { type: 'cast', iid: one('lightning_bolt'), targets: [{ c: one('drudge_skeletons') }] });
  E.act(g, { type: 'activate', iid: one('drudge_skeletons'), index: 0, targets: [] });
  passUntil(g, (s) => s.stack.length === 0);
  assert.equal(g.cards[one('drudge_skeletons')].zone, 'battlefield');
  assert.equal(g.cards[one('drudge_skeletons')].tapped, true);
});

test('Terror cannot be regenerated and cannot target black creatures', () => {
  const { g, one } = setup({ me: { battlefield: ['swamp', 'swamp'], hand: ['terror'] }, them: { battlefield: ['uthden_troll', 'scathe_zombies'] } });
  const targets = E.legalTargets(g, CARDS.terror.spell.targets[0], { src: one('terror'), controller: 0 });
  assert.deepEqual(targets.map((t) => t.c), [one('uthden_troll')]);
});

test('protection from black stops black removal targeting', () => {
  const { g, one } = setup({ me: { battlefield: ['swamp', 'swamp', 'swamp'], hand: ['hand_of_death'] }, them: { battlefield: ['white_knight'] } });
  assert.equal(E.canCast(g, 0, one('hand_of_death')), false);
});

test('lords and anthems modify power and toughness', () => {
  const { g, one } = setup({ me: { battlefield: ['goblin_king', 'raging_goblin', 'crusade', 'savannah_lions'] } });
  assert.deepEqual([E.power(g, one('raging_goblin')), E.toughness(g, one('raging_goblin'))], [2, 2]);
  assert.ok(E.hasKw(g, one('raging_goblin'), 'mountainwalk'));
  assert.equal(E.power(g, one('goblin_king')), 2, 'lord does not pump itself');
  assert.deepEqual([E.power(g, one('savannah_lions')), E.toughness(g, one('savannah_lions'))], [3, 2]);
});

test('Kird Ape grows with a Forest', () => {
  const { g, one } = setup({ me: { battlefield: ['kird_ape'] } });
  assert.equal(E.power(g, one('kird_ape')), 1);
  const { g: g2, one: one2 } = setup({ me: { battlefield: ['kird_ape', 'forest'] } });
  assert.deepEqual([E.power(g2, one2('kird_ape')), E.toughness(g2, one2('kird_ape'))], [2, 3]);
});

test('Control Magic steals and Disenchant returns the creature', () => {
  const { g, one } = setup({
    me: { battlefield: ['island', 'island', 'island', 'island'], hand: ['control_magic'] },
    them: { battlefield: ['serra_angel', 'plains', 'plains'], hand: ['disenchant'] },
  });
  E.act(g, { type: 'cast', iid: one('control_magic'), targets: [{ c: one('serra_angel') }] });
  E.act(g, { type: 'pass' });
  assert.equal(g.cards[one('serra_angel')].controller, 0);
  // their turn: disenchant it
  g.active = 1;
  g.pending = { type: 'priority', player: 1 };
  g.priority = 1;
  E.act(g, { type: 'cast', iid: one('disenchant'), targets: [{ c: one('control_magic') }] });
  E.act(g, { type: 'pass' });
  assert.equal(g.cards[one('serra_angel')].controller, 1);
});

test('X spells: Fireball deals X damage', () => {
  const { g, one } = setup({ me: { battlefield: ['mountain', 'mountain', 'mountain', 'mountain', 'mountain'], hand: ['fireball'] } });
  assert.equal(E.maxX(g, 0, 'XR'), 4);
  E.act(g, { type: 'cast', iid: one('fireball'), targets: [{ p: 1 }], x: 4 });
  E.act(g, { type: 'pass' });
  assert.equal(g.players[1].life, 16);
});

test('Sol Ring floats its extra mana', () => {
  const { g, one } = setup({ me: { battlefield: ['sol_ring'], hand: ['ornithopter', 'grizzly_bears'] } });
  E.act(g, { type: 'cast', iid: one('ornithopter'), targets: [] });
  assert.equal(g.cards[one('sol_ring')].tapped, false, 'free spell does not tap');
  E.act(g, { type: 'pass' });
  const { g: g2, one: one2 } = setup({ me: { battlefield: ['sol_ring', 'forest'], hand: ['jump', 'gray_ogre'] } });
  // 1-mana generic portion: Sol Ring pays 1, floats 1
  assert.equal(E.canCast(g2, 0, one2('gray_ogre')), false, 'gray ogre needs red');
});

test('Sengir Vampire grows when a creature it damaged dies', () => {
  const { g, one } = setup({ me: { battlefield: ['sengir_vampire'] }, them: { battlefield: ['giant_spider'] } });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'attack', attackers: [one('sengir_vampire')] });
  passUntil(g, (s) => s.pending.type === 'blockers');
  E.act(g, { type: 'block', blocks: [[one('giant_spider'), one('sengir_vampire')]] });
  passUntil(g, (s) => s.step === 'main2');
  assert.equal(g.cards[one('giant_spider')].zone, 'graveyard');
  assert.equal(g.cards[one('sengir_vampire')].counters, 1);
});

test('Fog prevents combat damage', () => {
  const { g, one } = setup({ me: { battlefield: ['craw_wurm'] }, them: { battlefield: ['forest'], hand: ['fog'] } });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'attack', attackers: [one('craw_wurm')] });
  E.act(g, { type: 'pass' });
  E.act(g, { type: 'cast', iid: one('fog'), targets: [] });
  passUntil(g, (s) => s.step === 'main2');
  assert.equal(g.players[1].life, 20);
});

test('Time Walk grants an extra turn', () => {
  const { g, one } = setup({ me: { battlefield: ['island', 'island'], hand: ['time_walk'] } });
  E.act(g, { type: 'cast', iid: one('time_walk'), targets: [] });
  E.act(g, { type: 'pass' });
  const turn = g.turn;
  passUntil(g, (s) => s.turn > turn, 30);
  assert.equal(g.active, 0);
});

test('discard down to seven at cleanup', () => {
  const { g } = setup({ me: { hand: Array(9).fill('plains') } });
  passUntil(g, (s) => s.pending.type !== 'priority' || s.step === 'cleanup', 30);
  assert.equal(g.pending.type, 'discard');
  assert.equal(g.pending.count, 2);
  E.act(g, { type: 'discard', iids: g.players[0].hand.slice(0, 2) });
  assert.equal(g.players[0].hand.length, 7);
});

test('drawing from an empty library loses the game', () => {
  const { g } = setup();
  g.players[1].library = [];
  passUntil(g, (s) => s.over, 40);
  assert.equal(g.winner, 0);
  assert.equal(g.reason, 'deck');
});

test('AI never makes an illegal move over a set of full games', () => {
  const decks = Object.values({ ...STARTERS, ...DECKS });
  for (let i = 0; i < 6; i++) {
    const g = E.newGame({ seed: 77 + i, players: [{ name: 'A', deck: expandDeck(decks[i * 3 % decks.length].cards) }, { name: 'B', deck: expandDeck(decks[(i * 5 + 1) % decks.length].cards) }] });
    let n = 0;
    while (!g.over && n++ < 3000 && g.turn < 70) {
      E.act(g, decide(g));
      g.log = [];
    }
    assert.ok(g.over || g.turn >= 70);
  }
});
