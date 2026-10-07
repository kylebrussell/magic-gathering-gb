// Narrates one AI-vs-AI game:  node tools/watch.mjs deckA deckB [seed]
import '../src/engine/index.js';
import * as E from '../src/engine/game.js';
import { decide } from '../src/engine/ai.js';
import { narrate } from '../src/engine/narrate.js';
import { DECKS, STARTERS, expandDeck } from '../src/data/decks.js';

const all = { ...STARTERS, ...DECKS };
const [a = 'mountain_rage', b = 'mana_ramp', seed = '7'] = process.argv.slice(2);
const g = E.newGame({ seed: Number(seed), players: [{ name: 'Adventurer', deck: expandDeck(all[a].cards) }, { name: 'Nissa', deck: expandDeck(all[b].cards) }] });
const board = () => [0, 1].map((p) => {
  const pl = g.players[p];
  const perms = g.battlefield.filter((i) => g.cards[i].controller === p && !E.isLand(g, i)).map((i) => {
    const s = E.isCreature(g, i) ? E.stats(g, i) : null;
    return E.def(g, i).name + (s ? ` ${s.power}/${s.toughness}` : '') + (g.cards[i].tapped ? '(T)' : '');
  });
  return `  ${pl.name}: life ${pl.life}, hand [${pl.hand.map((i) => E.def(g, i).name).join(",")}], lands ${E.landsOf(g, p).length}, lib ${pl.library.length} | ${perms.join(', ')}`;
}).join('\n');
E.advance(g);
for (const ev of E.drainLog(g)) { const t = narrate(g, ev); if (t) console.log(t); }
let n = 0;
while (!g.over && n++ < 3000 && g.turn < 60) {
  const pend = g.pending;
  const action = decide(g);
  if (action.type !== 'pass') console.log(`    [${g.players[pend.player].name} ${pend.type}] ${JSON.stringify(action)}`);
  E.act(g, action);
  for (const ev of E.drainLog(g)) {
    if (ev.t === 'turn') console.log(board());
    if (ev.t === 'attack') console.log(`ATTACK: ${ev.attackers.map((i) => E.def(g, i).name).join(', ')}`);
    if (ev.t === 'block') console.log(`BLOCKS: ${ev.blocks.map(([x, y]) => E.def(g, x).name + '->' + E.def(g, y).name).join(', ') || 'none'}`);
    if (ev.t === 'combatDamage') console.log('COMBAT: ' + ev.assignments.map(([s, t, n]) => `${E.def(g, s).name}→${t.p !== undefined ? g.players[t.p].name : E.def(g, t.c).name}:${n}`).join(', '));
    const t = narrate(g, ev);
    if (t && ev.t !== 'step') console.log(t);
  }
}
console.log(board());
console.log('WINNER', g.winner, g.reason);
