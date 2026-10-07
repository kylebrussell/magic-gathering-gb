import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/engine/index.js';
import { NPCS, LOCATIONS, PATHS, MEDALS, npcsIn } from '../src/data/world.js';
import { DECKS, STARTERS, expandDeck } from '../src/data/decks.js';
import { PORTRAITS } from '../src/gfx/portraits.js';
import { PACKS, openPack } from '../src/data/sets.js';
import { CARDS } from '../src/data/cards.js';
import { newSave, addCards, deckProblem } from '../src/save.js';

test('every duelist has a valid deck, portrait and prize', () => {
  for (const [id, n] of Object.entries(NPCS)) {
    assert.ok(PORTRAITS[n.portrait], `${id} portrait`);
    if (!n.deck) continue;
    assert.ok(DECKS[n.deck], `${id} deck ${n.deck}`);
    for (const set of n.prize.packs) assert.ok(PACKS[set], `${id} pack ${set}`);
    for (const c of n.prize.cards || []) assert.ok(CARDS[c], `${id} card ${c}`);
    assert.ok(n.intro && n.win && n.lose, `${id} lines`);
  }
});

test('map graph connects every location', () => {
  const seen = new Set(['academy']);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of PATHS) {
      if (seen.has(a) && !seen.has(b)) (seen.add(b), (grew = true));
      if (seen.has(b) && !seen.has(a)) (seen.add(a), (grew = true));
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(LOCATIONS).sort());
});

test('each club medal has a master', () => {
  for (const m of MEDALS) assert.ok(Object.values(NPCS).some((n) => n.medal === m.id), m.id);
});

test('masters require their members; summit unlocks with six medals', () => {
  const s = newSave('T');
  assert.ok(NPCS.nissa.requires(s));
  s.beaten.elm = 1;
  s.beaten.bo = 1;
  assert.equal(NPCS.nissa.requires(s), null);
  assert.ok(npcsIn('summit', s).includes('gatekeeper'));
  assert.ok(!npcsIn('summit', s).includes('urza'));
  s.medals = MEDALS.map((m) => m.id);
  assert.ok(!npcsIn('summit', s).includes('gatekeeper'));
  assert.ok(npcsIn('summit', s).includes('urza'));
  assert.ok(NPCS.mishra.requires(s));
  s.flags.grand = 1;
  assert.equal(NPCS.mishra.requires(s), null);
  assert.ok(!npcsIn('summit', s).includes('rival3'));
  s.flags.grand = 3;
  assert.ok(npcsIn('summit', s).includes('rival3'));
});

test('room layouts are 10x9 and NPCs stand on open floor', () => {
  for (const [id, loc] of Object.entries(LOCATIONS)) {
    assert.equal(loc.room.length, 9, id);
    for (const row of loc.room) assert.equal(row.length, 10, id);
    for (const n of loc.npcs) {
      const [x, y] = NPCS[n].pos;
      assert.ok('.rmD'.includes(loc.room[y][x]), `${n} stands on ${loc.room[y][x]}`);
    }
  }
});

test('booster packs have 8 non-basic cards', () => {
  for (const set of Object.keys(PACKS)) {
    for (let i = 0; i < 20; i++) {
      const p = openPack(set);
      assert.equal(p.length, 8);
      for (const id of p) assert.ok(CARDS[id] && !CARDS[id].basic, `${set}: ${id}`);
    }
  }
});

test('starter decks are legal once received', () => {
  for (const st of Object.values(STARTERS)) {
    const s = newSave('T');
    addCards(s, expandDeck(st.cards));
    assert.equal(deckProblem(s, st.cards), null);
  }
  const s = newSave('T');
  assert.match(deckProblem(s, { plains: 59 }), /60/);
  addCards(s, ['lightning_bolt']);
  assert.match(deckProblem(s, { mountain: 58, lightning_bolt: 2 }), /ONLY OWN/);
});
