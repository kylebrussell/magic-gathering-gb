import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/engine/index.js';
import * as E from '../src/engine/game.js';
import { STARTERS, DECKS, expandDeck } from '../src/data/decks.js';
import { CARDS } from '../src/data/cards.js';
import { LESSON_DECKS, LESSON_OPP, lessonTop, lessonSteps, plannedAction } from '../src/data/lesson.js';
import { RECIPES, recipeUnlocked, recipeMissing, cardSources } from '../src/data/recipes.js';
import { newSave } from '../src/save.js';

test('every starter has a lesson whose cards are in the starter deck', () => {
  for (const key of Object.keys(STARTERS)) {
    const top = lessonTop(key);
    assert.ok(top && top.length >= 9, key);
    const counts = {};
    for (const id of top) counts[id] = (counts[id] || 0) + 1;
    for (const [id, n] of Object.entries(counts)) assert.ok((STARTERS[key].cards[id] || 0) >= n, `${key} needs ${n} ${id}`);
    assert.ok(lessonSteps(key).length > 10, `${key} steps`);
  }
  const counts = {};
  for (const id of LESSON_OPP.top) counts[id] = (counts[id] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) assert.ok((DECKS.practice.cards[id] || 0) >= n, `practice deck needs ${n} ${id}`);
});

test('stacked openings put the listed cards on top, and forced first player still rolls dice', () => {
  const g = E.newGame({ seed: 7, first: 0, players: [{ name: 'A', deck: expandDeck(STARTERS.mountain_rage.cards), top: lessonTop('mountain_rage') }, { name: 'B', deck: expandDeck(DECKS.practice.cards), top: LESSON_OPP.top }] });
  assert.equal(g.first, 0);
  assert.ok(g.dice.length >= 1);
  const [a, b] = g.dice[g.dice.length - 1];
  assert.ok(a > b);
  assert.deepEqual(g.players[0].hand.map((iid) => g.cards[iid].id), lessonTop('mountain_rage').slice(0, 7));
  assert.deepEqual(g.players[1].hand.map((iid) => g.cards[iid].id), LESSON_OPP.top.slice(0, 7));
});

// Play the whole lesson through the engine, as the UI would, for each starter.
for (const key of Object.keys(STARTERS)) {
  test(`the ${key} lesson plays out as scripted`, () => {
    const L = LESSON_DECKS[key];
    const g = E.newGame({ seed: 99, first: 0, players: [{ name: 'A', deck: expandDeck(STARTERS[key].cards), top: lessonTop(key) }, { name: 'B', deck: expandDeck(DECKS.practice.cards), top: LESSON_OPP.top }] });
    const steps = lessonSteps(key);
    let i = 0;
    const inHand = (id) => g.players[0].hand.find((iid) => g.cards[iid].id === id);
    const onBf = (p, id) => g.battlefield.find((iid) => g.cards[iid].controller === p && g.cards[iid].id === id);
    const matches = (st, pend) => {
      if (g.turn !== st.turn) return false;
      const mainEmpty = pend.type === 'priority' && g.active === 0 && E.isMain(g.step) && g.stack.length === 0;
      if (st.when === 'main') return mainEmpty;
      if (st.when === 'attackers') return pend.type === 'attackers';
      if (st.when === 'blockers') return pend.type === 'blockers';
      if (st.when === 'respond') return pend.type === 'priority' && g.active !== 0 && g.step === 'attackers';
      return false;
    };
    let guard = 0;
    let skipTurn = -1;
    while (!g.over && i < steps.length && ++guard < 500) {
      const pend = g.pending;
      if (pend.player === 1) {
        const a = plannedAction(g, 1, LESSON_OPP, pend);
        assert.ok(a, `turn ${g.turn}: Jhoira has a plan`);
        E.act(g, a);
        continue;
      }
      const st = steps[i];
      if (matches(st, pend)) {
        i++;
        if (st.type === 'free') break;
        if (st.type === 'play') {
          const iid = inHand(st.id);
          assert.ok(iid && E.canPlayLand(g, 0, iid), `turn ${g.turn}: can play ${st.id}`);
          E.act(g, { type: 'play', iid });
        } else if (st.type === 'cast') {
          const iid = inHand(st.id);
          assert.ok(iid && E.canCast(g, 0, iid), `turn ${g.turn}: can cast ${st.id}`);
          const targets = st.target ? [{ c: onBf(1, st.target) }] : [];
          if (st.target) assert.ok(targets[0].c, `turn ${g.turn}: ${st.target} is there to target`);
          E.act(g, { type: 'cast', iid, targets, x: 0 });
        } else if (st.type === 'end') {
          if (g.step === 'main1') skipTurn = g.turn;
          E.act(g, { type: 'pass' });
        } else if (st.type === 'combat') {
          E.act(g, { type: 'pass' });
        } else if (st.type === 'attack') {
          const attackers = st.ids.map((id) => onBf(0, id));
          assert.ok(attackers.every((iid) => iid && E.canAttack(g, iid)), `turn ${g.turn}: attackers can attack`);
          E.act(g, { type: 'attack', attackers });
        } else if (st.type === 'block') {
          const blocks = st.blocks.map(([b, a]) => [onBf(0, b), onBf(1, a)]);
          assert.ok(blocks.every(([b, a]) => b && a && E.canBlock(g, b, a)), `turn ${g.turn}: block is legal`);
          E.act(g, { type: 'block', blocks });
        }
        continue;
      }
      // nothing to teach here: the UI lets it happen
      if (pend.type === 'mulligan') E.act(g, { type: 'keep' });
      else if (pend.type === 'priority') E.act(g, { type: 'pass' });
      else if (pend.type === 'attackers') {
        assert.equal(skipTurn, g.turn, `turn ${g.turn}: unexpected attack decision`);
        E.act(g, { type: 'attack', attackers: [] });
      } else if (pend.type === 'blockers') E.act(g, { type: 'block', blocks: [] });
      else assert.fail(`unexpected decision ${pend.type} on turn ${g.turn}`);
    }
    assert.equal(i, steps.length, `${key}: all steps were reached`);
    assert.equal(g.turn, 7);
    assert.ok(!g.over);
    // the second creature blocked the elves and lived; the elves died; the bears are gone
    assert.ok(onBf(0, L.creature2), 'creature 2 survived its block');
    assert.ok(!onBf(1, 'llanowar_elves'), 'the elves died');
    assert.ok(!onBf(1, 'grizzly_bears'), 'the bears were dealt with');
    assert.equal(g.players[0].life, 20, 'the player took no damage');
    assert.equal(g.players[1].life, 20 - CARDS[L.creature1].power, 'the first attack connected');
  });
}

test('recipes are legal 60-card lists with real ids and sensible unlocks', () => {
  const s = newSave('T');
  for (const r of RECIPES) {
    let n = 0;
    for (const [id, c] of Object.entries(r.cards)) {
      assert.ok(CARDS[id], `${r.id}: ${id}`);
      assert.ok(CARDS[id].basic || c <= 4, `${r.id}: too many ${id}`);
      n += c;
    }
    assert.equal(n, 60, r.id);
    for (const id of Object.keys(r.cards)) if (!CARDS[id].basic) assert.ok(cardSources(id).length, `${r.id}: ${id} can be obtained`);
  }
  const starters = RECIPES.filter((r) => !r.unlock);
  assert.equal(starters.length, 3);
  assert.ok(starters.every((r) => recipeUnlocked(r, s)));
  const elves = RECIPES.find((r) => r.id === 'elf_warband');
  assert.ok(!recipeUnlocked(elves, s));
  s.medals.push('G');
  assert.ok(recipeUnlocked(elves, s));
  assert.ok(recipeMissing(elves, s).length > 0);
  const masters = RECIPES.find((r) => r.id === 'mana_ramp');
  assert.ok(!recipeUnlocked(masters, s));
  s.medals = ['G', 'R', 'U', 'W', 'B', 'A'];
  assert.ok(recipeUnlocked(masters, s));
});
