// Deck recipes for the Deck Grimoire, in the spirit of the Auto Deck Machine.
// The three starters are always available; each club medal unlocks the deck
// lists of that club's members, all six medals unlock the masters' decks, and
// the Planeswalker title unlocks the grand masters' and the rival's decks.

import { STARTERS, DECKS } from './decks.js';
import { CARDS } from './cards.js';
import { LOCATIONS, NPCS, MEDALS } from './world.js';
import { PACKS } from './sets.js';

const R = (id, name, cards, unlock, blurb) => ({ id, name, cards, unlock, blurb });

export const RECIPES = [
  R('mountain_rage', STARTERS.mountain_rage.name, STARTERS.mountain_rage.cards, null, STARTERS.mountain_rage.blurb),
  R('tidal_knights', STARTERS.tidal_knights.name, STARTERS.tidal_knights.cards, null, STARTERS.tidal_knights.blurb),
  R('dark_swamp', STARTERS.dark_swamp.name, STARTERS.dark_swamp.cards, null, STARTERS.dark_swamp.blurb),

  R('elf_warband', 'Elf Warband', DECKS.elf_warband.cards, { medal: 'G' }, "Ranger Elm's fast elves and pump spells."),
  R('big_wurms', 'Big Wurms', DECKS.big_wurms.cards, { medal: 'G' }, "Big Bo's ramp into huge wurms."),
  R('goblin_gang', 'Goblin Gang', DECKS.goblin_gang.cards, { medal: 'R' }, "Rocco's goblin swarm with a Goblin King."),
  R('burn_baby_burn', 'Burn Baby Burn', DECKS.burn_baby_burn.cards, { medal: 'R' }, "Pyro Pete's burn: bolts, hammers, fireballs."),
  R('merfolk_tide', 'Merfolk Tide', DECKS.merfolk_tide.cards, { medal: 'U' }, "Sailor Finn's merfolk and tempo tricks."),
  R('sky_patrol', 'Sky Patrol', DECKS.sky_patrol.cards, { medal: 'U' }, "Captain Lin's all-flying air force."),
  R('holy_order', 'Holy Order', DECKS.holy_order.cards, { medal: 'W' }, "Sister Ada's small white army under Crusade."),
  R('pegasus_wing', 'Pegasus Wing', DECKS.pegasus_wing.cards, { medal: 'W' }, "Sir Bertram's flyers, healers and angels."),
  R('graveyard_shift', 'Graveyard Shift', DECKS.graveyard_shift.cards, { medal: 'B' }, "Mort's regenerating skeletons and rats."),
  R('night_terrors', 'Night Terrors', DECKS.night_terrors.cards, { medal: 'B' }, "Lady Nyx's specters, terrors and nightmares."),
  R('clockwork', 'Clockwork', DECKS.clockwork.cards, { medal: 'A' }, "Tinker Tess's artifact creatures with red and white support."),

  R('mana_ramp', 'Mana Ramp Deck', DECKS.mana_ramp.cards, { medals: 6 }, "Nissa's deck: mana creatures into djinn and wurms."),
  R('dragons_fire', "Dragon's Fire", DECKS.dragons_fire.cards, { medals: 6 }, "Chandra's deck: burn, elementals and Shivan Dragon."),
  R('mind_games', 'Mind Games', DECKS.mind_games.cards, { medals: 6 }, "Jace's deck: counterspells, control and big flyers."),
  R('knights_crusade', "Knight's Crusade", DECKS.knights_crusade.cards, { medals: 6 }, "Gideon's deck: knights, angels and Wrath of God."),
  R('necromancy', 'Necromancy', DECKS.necromancy.cards, { medals: 6 }, "Liliana's deck: tutors, assassins and vampires."),
  R('workshop', "Mishra's Workshop", DECKS.workshop.cards, { medals: 6 }, "Karn's deck: juggernauts, tomes and counterspells."),

  R('urza', 'Tolarian Order', DECKS.urza.cards, { champion: true }, "Urza's deck."),
  R('mishra', 'Brothers War', DECKS.mishra.cards, { champion: true }, "Mishra's deck."),
  R('bolas', 'Elder Dragon', DECKS.bolas.cards, { champion: true }, "Nicol Bolas's deck."),
  R('rival_3', 'Rival Deck III', DECKS.rival_3.cards, { champion: true }, "Rhys's final deck."),
];

export function recipeUnlocked(recipe, save) {
  const u = recipe.unlock;
  if (!u) return true;
  if (u.medal) return save.medals.includes(u.medal);
  if (u.medals) return save.medals.length >= u.medals;
  if (u.champion) return !!save.flags.champion;
  return false;
}

// What's needed to unlock it, for the list.
export function recipeLockText(recipe) {
  const u = recipe.unlock;
  if (!u) return '';
  if (u.medal) return MEDALS.find((m) => m.id === u.medal).name;
  if (u.medals) return 'ALL SIX MEDALS';
  if (u.champion) return 'PLANESWALKER TITLE';
  return '';
}

// Cards the player still lacks for a recipe: [{ id, need, have }].
export function recipeMissing(recipe, save) {
  const out = [];
  for (const [id, n] of Object.entries(recipe.cards)) {
    const d = CARDS[id];
    if (!d || d.basic) continue;
    const have = save.collection[id] || 0;
    if (have < n) out.push({ id, need: n, have });
  }
  return out;
}

// Where a card can be obtained: packs of its set (and who hands them out),
// or a master's gift.
export function cardSources(id) {
  const d = CARDS[id];
  const out = [];
  const gifts = Object.values(NPCS).filter((n) => n.prize && n.prize.cards && n.prize.cards.includes(id));
  for (const n of gifts) out.push(`A GIFT FROM ${n.name}`);
  const set = d.set;
  if (PACKS[set]) {
    const clubs = Object.values(LOCATIONS).filter((l) => l.packSet === set && l.medal).map((l) => l.name.replace(' CLUB', ''));
    const where = clubs.length ? `${clubs.join('/')} CLUB` : 'THE SUMMIT';
    out.push(`${PACKS[set].name} PACKS (${where} OR THE SHOP)`);
  }
  return out;
}
