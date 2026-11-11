// The teaching duel: Jhoira's first practice duel is scripted so the player
// learns one action at a time with known cards. Both opening hands and the
// first few draws are stacked (see `top` in engine newGame), Jhoira follows a
// turn plan instead of the AI, and the player is guided through:
//
//   turn 1  play a land, cast a creature, end the turn
//   turn 3  play a land, cast a bigger creature, attack with the first one
//   turn 4  block Jhoira's attacker
//   turn 5  play a land and keep mana open
//   turn 6  respond to Jhoira's attack with an instant
//
// After that the duel continues unrestricted.

import * as E from '../engine/game.js';

// Per-starter cards. Every id must be in that starter deck in the counts used.
export const LESSON_DECKS = {
  mountain_rage: {
    land1: 'mountain', creature1: 'mons_goblin_raiders',
    land2: 'forest', creature2: 'grizzly_bears',
    land3: 'mountain', instant: 'lightning_bolt',
    // the rest of the opening hand and the first draws (turns 3, 5, 7)
    extra: ['kird_ape'], draws: ['forest', 'hill_giant', 'mountain'],
    how: { creature2: 'FOREST MAKES {G} AND MOUNTAIN MAKES {R}. GRIZZLY BEARS COSTS {1}{G}: ONE GREEN AND ONE OF ANY COLOR.', instant: 'LIGHTNING BOLT DEALS 3 DAMAGE TO ANY TARGET. AIM IT AT THE BEARS.' },
  },
  tidal_knights: {
    land1: 'plains', creature1: 'savannah_lions',
    land2: 'island', creature2: 'storm_crow',
    land3: 'island', instant: 'unsummon',
    extra: ['pearled_unicorn'], draws: ['plains', 'phantom_monster', 'island'],
    how: { creature2: 'ISLAND MAKES {U} AND PLAINS MAKES {W}. STORM CROW COSTS {1}{U}: ONE BLUE AND ONE OF ANY COLOR. IT FLIES!', instant: 'UNSUMMON RETURNS A CREATURE TO ITS OWNER\'S HAND. AIM IT AT THE BEARS.' },
  },
  dark_swamp: {
    land1: 'swamp', creature1: 'muck_rats',
    land2: 'mountain', ritual: 'dark_ritual', creature2: 'scathe_zombies',
    land3: 'swamp', instant: 'terror',
    extra: [], draws: ['swamp', 'hill_giant', 'mountain'],
    how: {
      ritual: 'DARK RITUAL IS AN INSTANT THAT MAKES {B}{B}{B} FROM ONE SWAMP. CAST IT FIRST. THE MANA STAYS IN YOUR POOL UNTIL THE PHASE ENDS.',
      creature2: 'NOW CAST SCATHE ZOMBIES FOR {2}{B} WITH THE MANA FROM DARK RITUAL. YOUR MOUNTAIN STAYS UNTAPPED.',
      instant: 'TERROR DESTROYS A NONBLACK CREATURE. AIM IT AT THE BEARS.',
    },
  },
};

// Jhoira's stacked practice deck and her plan. The ids come from the
// practice deck in decks.js.
export const LESSON_OPP = {
  top: ['forest', 'llanowar_elves', 'plains', 'grizzly_bears', 'plains', 'pearled_unicorn', 'healing_salve', 'forest', 'giant_growth', 'plains'],
  // turn → what she does. Lands and spells are played when legal; attacks
  // list card ids; blocks is a list of [blockerId, attackerId] pairs.
  plan: {
    2: { play: 'forest', cast: ['llanowar_elves'], attack: [], block: [] },
    3: { block: [] },
    4: { play: 'plains', attack: ['llanowar_elves'], cast: ['grizzly_bears'], block: [] },
    5: { block: [] },
    6: { play: 'forest', attack: ['grizzly_bears'], cast: ['pearled_unicorn'], block: [] },
  },
  lastTurn: 6,
};

// Ordered opening for the human: 7 cards in hand, then draws.
export function lessonTop(starter) {
  const L = LESSON_DECKS[starter];
  if (!L) return null;
  return [L.land1, L.creature1, L.land2, ...(L.ritual ? [L.ritual] : []), L.creature2, L.land3, L.instant, ...L.extra, ...L.draws];
}

const N = (id) => id.replace(/_/g, ' ').toUpperCase().replace("MONS S", "MONS'S");

// The guided steps, in order. Each has:
//   when: the decision it applies to — 'main' (your main phase, empty stack),
//         'attackers', 'blockers' or 'respond' (priority on Jhoira's turn)
//   type: play | cast | end | combat | attack | block
//   id / ids / target: the card(s) involved
//   text: shown once when the step begins; nag: shown when you do something else
export function lessonSteps(starter) {
  const L = LESSON_DECKS[starter];
  if (!L) return [];
  const land1 = N(L.land1);
  const c1 = N(L.creature1);
  const c2 = N(L.creature2);
  const land2 = N(L.land2);
  const land3 = N(L.land3);
  const inst = N(L.instant);
  const steps = [
    { turn: 1, when: 'main', type: 'play', id: L.land1,
      text: [`WELCOME TO YOUR FIRST DUEL, LET'S TAKE IT ONE STEP AT A TIME.`, `FIRST, PLAY A LAND. CHOOSE HAND, PICK ${land1}, THEN CHOOSE PLAY.`],
      nag: `FIRST, PLAY ${land1} FROM YOUR HAND.` },
    { turn: 1, when: 'main', type: 'cast', id: L.creature1,
      text: [`LANDS MAKE MANA, AND MANA PAYS FOR SPELLS. YOU MAY PLAY ONE LAND EACH TURN.`, `NOW CAST A CREATURE. CHOOSE HAND, PICK ${c1}, THEN CHOOSE CAST. YOUR LAND IS TAPPED FOR YOU.`],
      nag: `NOW CAST ${c1}. CHOOSE HAND, THEN CAST.` },
    { turn: 1, when: 'main', type: 'end', text: [`${c1} IS ON THE BATTLEFIELD. IT JUST ARRIVED, SO IT CAN'T ATTACK YET.`, 'CHOOSE END TURN. IT WILL BE READY NEXT TURN.'], nag: 'CHOOSE END TURN.' },
    { turn: 3, when: 'main', type: 'play', id: L.land2,
      text: [`YOU DREW A CARD, AND YOUR LAND UNTAPPED. JHOIRA HAS A CREATURE TOO.`, `PLAY ${land2} NOW. TWO LANDS MEAN TWO MANA.`],
      nag: `PLAY ${land2} FROM YOUR HAND.` },
  ];
  if (L.ritual) steps.push({ turn: 3, when: 'main', type: 'cast', id: L.ritual, text: [L.how.ritual], nag: `CAST ${N(L.ritual)} FIRST.` });
  steps.push(
    { turn: 3, when: 'main', type: 'cast', id: L.creature2, text: [L.how.creature2, `CAST ${c2} FROM YOUR HAND.`], nag: `CAST ${c2}. CHOOSE HAND, THEN CAST.` },
    { turn: 3, when: 'main', type: 'combat', text: [`${c1} HAS BEEN HERE SINCE LAST TURN, SO IT CAN ATTACK. ${c2} IS STILL SUMMONING SICK.`, 'CHOOSE TO COMBAT.'], nag: 'CHOOSE TO COMBAT TO ATTACK.' },
    { turn: 3, when: 'attackers', type: 'attack', ids: [L.creature1],
      text: [`CHOOSE DECLARE ATT., PRESS A ON ${c1}, THEN PRESS B AND CONFIRM THE ATTACK.`],
      nag: `DECLARE ${c1} AS AN ATTACKER.` },
    { turn: 3, when: 'main', type: 'end', text: [`JHOIRA DIDN'T BLOCK, SO ${c1} HIT HER FOR ITS POWER. ATTACKERS TAP, SO IT CAN'T BLOCK UNTIL IT UNTAPS.`, 'THIS IS MAIN PHASE 2. YOU COULD STILL CAST SPELLS HERE. CHOOSE END TURN.'], nag: 'CHOOSE END TURN.' },
    { turn: 4, when: 'blockers', type: 'block', blocks: [[L.creature2, 'llanowar_elves']],
      text: [`JHOIRA ATTACKS WITH LLANOWAR ELVES! UNTAPPED CREATURES CAN BLOCK, EVEN NEW ONES.`, `PRESS A ON ${c2} TO BLOCK, THEN PRESS B AND CONFIRM. THE ELVES ONLY DEAL 1 DAMAGE.`],
      nag: `BLOCK WITH ${c2}.` },
    { turn: 5, when: 'main', type: 'play', id: L.land3, text: [`${c2} TOOK 1 DAMAGE BUT SURVIVED, AND THE ELVES DIED. DAMAGE WEARS OFF AT THE END OF EACH TURN.`, `PLAY ${land3}.`], nag: `PLAY ${land3}.` },
    { turn: 5, when: 'main', type: 'end',
      text: [`JHOIRA NOW HAS GRIZZLY BEARS. YOUR ${inst} IS AN INSTANT: YOU CAN CAST IT ON HER TURN, IF YOUR LANDS ARE UNTAPPED.`, "SO DON'T SPEND YOUR MANA. CHOOSE END TURN AND WAIT FOR HER ATTACK."],
      nag: 'KEEP YOUR MANA OPEN THIS TURN. CHOOSE END TURN.' },
    { turn: 6, when: 'respond', type: 'cast', id: L.instant, target: 'grizzly_bears',
      text: [`JHOIRA ATTACKS WITH GRIZZLY BEARS! YOU MAY RESPOND BEFORE BLOCKS.`, L.how.instant, `CHOOSE HAND, PICK ${inst}, CHOOSE CAST, THEN AIM AT THE BEARS.`],
      nag: `CAST ${inst} ON THE GRIZZLY BEARS.` },
    { turn: 7, when: 'main', type: 'free', text: ["THAT'S EVERYTHING I CAN TEACH YOU. FROM HERE THE DUEL IS YOURS!", 'PRESS SELECT ON A CARD TO READ IT, AND USE THE BATTLEFIELD TO LOOK AROUND. GOOD LUCK!'] },
  );
  return steps;
}

// Jhoira's action for a pending decision while the lesson plan is running.
// Returns null once the plan is over (the AI takes it from there).
export function plannedAction(g, p, L, pend) {
  if (g.turn > L.lastTurn) return null;
  if (pend.type === 'mulligan') return { type: 'keep' };
  const plan = L.plan[g.turn] || {};
  if (pend.type === 'blockers') return { type: 'block', blocks: [] };
  if (pend.type === 'attackers') {
    const ids = plan.attack || [];
    const attackers = g.battlefield.filter((iid) => g.cards[iid].controller === p && ids.includes(g.cards[iid].id) && E.canAttack(g, iid));
    return { type: 'attack', attackers };
  }
  if (pend.type === 'priority') {
    const mine = g.active === p && E.isMain(g.step) && g.stack.length === 0;
    if (mine) {
      const hand = g.players[p].hand;
      const inHand = (id) => hand.find((iid) => g.cards[iid].id === id);
      const land = plan.play && inHand(plan.play);
      if (land && E.canPlayLand(g, p, land)) return { type: 'play', iid: land };
      for (const id of plan.cast || []) {
        const iid = inHand(id);
        if (iid && E.canCast(g, p, iid) && !E.spellSpecs(E.def(g, iid)).length) return { type: 'cast', iid, targets: [], x: 0 };
      }
    }
    return { type: 'pass' };
  }
  return null;
}
