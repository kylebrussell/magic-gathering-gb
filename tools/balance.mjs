// Round-robin: each starter deck vs every opponent deck, AI on both sides.
//   node tools/balance.mjs [games-per-pair]
import '../src/engine/index.js';
import * as E from '../src/engine/game.js';
import { decide } from '../src/engine/ai.js';
import { DECKS, STARTERS, expandDeck } from '../src/data/decks.js';
import { NPCS } from '../src/data/world.js';

const n = Number(process.argv[2] || 6);
const opponents = Object.values(NPCS).filter((x) => x.deck).map((x) => ({ name: x.name, deck: x.deck, skill: x.skill }));
const rows = [];
for (const o of opponents) {
  const row = [o.name.padEnd(12), o.deck.padEnd(16)];
  for (const [sk, st] of Object.entries(STARTERS)) {
    let wins = 0;
    for (let i = 0; i < n; i++) {
      const g = E.newGame({ seed: 500 + i * 13, players: [{ name: 'P', deck: expandDeck(st.cards) }, { name: 'O', deck: expandDeck(DECKS[o.deck].cards) }] });
      let k = 0;
      while (!g.over && k++ < 4000 && g.turn < 80) {
        const skill = g.pending.player === 0 ? 0.8 : o.skill;
        E.act(g, decide(g, { skill }));
        g.log = [];
      }
      if (g.winner === 0) wins++;
    }
    row.push(`${sk.slice(0, 8)} ${String(Math.round((wins / n) * 100)).padStart(3)}%`);
  }
  rows.push(row.join('  '));
  console.log(rows[rows.length - 1]);
}
