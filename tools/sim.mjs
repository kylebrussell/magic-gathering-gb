// AI-vs-AI harness: plays many games to shake out engine bugs and check balance.
//   node tools/sim.mjs [games] [deckA] [deckB]
import '../src/engine/index.js';
import * as E from '../src/engine/game.js';
import { decide } from '../src/engine/ai.js';
import { DECKS, STARTERS, expandDeck, deckSize } from '../src/data/decks.js';

const all = { ...STARTERS, ...DECKS };
for (const [k, d] of Object.entries(all)) {
  const n = deckSize(d.cards);
  if (n !== 60) console.log(`deck ${k} has ${n} cards`);
}

const games = Number(process.argv[2] || 20);
const names = Object.keys(all);
let wins = {}, played = {}, turns = 0, errors = 0;
const t0 = Date.now();
for (let i = 0; i < games; i++) {
  const a = process.argv[3] || names[i % names.length];
  const b = process.argv[4] || names[(i * 7 + 3) % names.length];
  const g = E.newGame({ seed: 1000 + i, players: [{ name: 'A', deck: expandDeck(all[a].cards) }, { name: 'B', deck: expandDeck(all[b].cards) }] });
  E.advance(g);
  let steps = 0;
  try {
    while (!g.over && steps < 5000) {
      const action = decide(g, { skill: 1 });
      E.act(g, action);
      g.log = [];
      steps++;
      if (g.turn > 80) break;
    }
  } catch (e) {
    errors++;
    console.log(`game ${i} ${a} vs ${b} turn ${g.turn} step ${g.step}:`, e.stack.split('\n').slice(0, 4).join(' | '));
    continue;
  }
  turns += g.turn;
  played[a] = (played[a] || 0) + 1;
  played[b] = (played[b] || 0) + 1;
  if (g.winner === 0) wins[a] = (wins[a] || 0) + 1;
  if (g.winner === 1) wins[b] = (wins[b] || 0) + 1;
  if (!g.over) console.log(`game ${i} ${a} vs ${b} did not finish (turn ${g.turn})`);
}
console.log(`${games} games, ${errors} errors, avg ${(turns / games).toFixed(1)} turns, ${((Date.now() - t0) / games).toFixed(0)} ms/game`);
for (const k of Object.keys(played).sort((x, y) => (wins[y] || 0) / played[y] - (wins[x] || 0) / played[x]))
  console.log(`  ${k.padEnd(18)} ${wins[k] || 0}/${played[k]}`);
