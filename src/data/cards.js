// Card database. Each entry is the card's rules plus an art description
// consumed by src/gfx/art.js.
//
// Text uses {W}{U}{B}{R}{G}{X}{T} and {1}..{9} for mana/tap symbols.
// Sets: LEA (Limited Edition), ARN (Arabian Nights), ATQ (Antiquities),
//       LEG (Legends), DRK (The Dark), POR (Portal).

import {
  dealDamage, destroy, exile, bounce, gainLife, loseLife, draw, addMod, addCounters, regenerate,
  preventDamage, addMana, extraTurn, counterStackItem, searchLibraryToHand, discardRandom, mill,
  sacrifice, tap, tgt, stats, power, isCreature, isLand, isArtifact, isEnchantment, hasColor,
  hasSub, hasKw, controlsLandType, landsOf, creaturesOf, opp, pay, canPay, moveCard, def,
} from '../engine/game.js';
import { manaValue } from '../engine/mana.js';

const ANY = { kind: 'any' };
const CREATURE = { kind: 'creature' };
const PLAYER = { kind: 'player' };
const OPPONENT = { kind: 'player', filter: (g, t, ctx) => t.p !== ctx.controller };

const cardOf = (g, t) => t && t.c;

function L(name, sub, colors, extra = {}) {
  return { name, type: 'Land', sub, cost: '', mana: { colors }, rarity: 'C', set: 'LEA', ...extra };
}
function C(name, cost, sub, p, t, extra = {}) {
  return { name, type: 'Creature', sub, cost, power: p, toughness: t, ...extra };
}
const pump = (cost, p, t, text) => ({
  cost,
  text: text || `{${cost}}: +${p}/+${t} until end of turn.`,
  effect: (g, ctx) => addMod(g, ctx.src, { p, t }),
  ai: 'pump',
});
const regen = (cost) => ({
  cost,
  text: `{${cost.split('').join('}{')}}: Regenerate this creature.`,
  effect: (g, ctx) => regenerate(g, ctx.src),
  ai: 'regen',
});
const burn = (n) => (g, ctx) => {
  const t = tgt(g, ctx, 0);
  if (t) dealDamage(g, ctx.src, t, n);
};
const upkeepPing = (n) => (g, iid) => dealDamage(g, iid, { p: g.cards[iid].controller }, n);

const BASIC_ART = {
  Plains: { scene: 'plains' },
  Island: { scene: 'island' },
  Swamp: { scene: 'swamp' },
  Mountain: { scene: 'mountain' },
  Forest: { scene: 'forest' },
};

export const CARDS = {
  // ---------------------------------------------------------------- Lands
  plains: L('Plains', 'Plains', ['W'], { basic: true, text: '{T}: Add {W}.', art: BASIC_ART.Plains }),
  island: L('Island', 'Island', ['U'], { basic: true, text: '{T}: Add {U}.', art: BASIC_ART.Island }),
  swamp: L('Swamp', 'Swamp', ['B'], { basic: true, text: '{T}: Add {B}.', art: BASIC_ART.Swamp }),
  mountain: L('Mountain', 'Mountain', ['R'], { basic: true, text: '{T}: Add {R}.', art: BASIC_ART.Mountain }),
  forest: L('Forest', 'Forest', ['G'], { basic: true, text: '{T}: Add {G}.', art: BASIC_ART.Forest }),

  tundra: L('Tundra', 'Plains Island', ['W', 'U'], { rarity: 'R', text: '{T}: Add {W} or {U}.', art: { scene: 'dual', a: 'plains', b: 'island' } }),
  underground_sea: L('Underground Sea', 'Island Swamp', ['U', 'B'], { rarity: 'R', text: '{T}: Add {U} or {B}.', art: { scene: 'dual', a: 'island', b: 'swamp' } }),
  badlands: L('Badlands', 'Swamp Mountain', ['B', 'R'], { rarity: 'R', text: '{T}: Add {B} or {R}.', art: { scene: 'dual', a: 'swamp', b: 'mountain' } }),
  taiga: L('Taiga', 'Mountain Forest', ['R', 'G'], { rarity: 'R', text: '{T}: Add {R} or {G}.', art: { scene: 'dual', a: 'mountain', b: 'forest' } }),
  savannah: L('Savannah', 'Forest Plains', ['G', 'W'], { rarity: 'R', text: '{T}: Add {G} or {W}.', art: { scene: 'dual', a: 'forest', b: 'plains' } }),
  scrubland: L('Scrubland', 'Plains Swamp', ['W', 'B'], { rarity: 'R', text: '{T}: Add {W} or {B}.', art: { scene: 'dual', a: 'plains', b: 'swamp' } }),
  volcanic_island: L('Volcanic Island', 'Island Mountain', ['U', 'R'], { rarity: 'R', text: '{T}: Add {U} or {R}.', art: { scene: 'dual', a: 'island', b: 'mountain' } }),
  bayou: L('Bayou', 'Swamp Forest', ['B', 'G'], { rarity: 'R', text: '{T}: Add {B} or {G}.', art: { scene: 'dual', a: 'swamp', b: 'forest' } }),
  plateau: L('Plateau', 'Mountain Plains', ['R', 'W'], { rarity: 'R', text: '{T}: Add {R} or {W}.', art: { scene: 'dual', a: 'mountain', b: 'plains' } }),
  tropical_island: L('Tropical Island', 'Forest Island', ['G', 'U'], { rarity: 'R', text: '{T}: Add {G} or {U}.', art: { scene: 'dual', a: 'forest', b: 'island' } }),

  city_of_brass: L('City of Brass', '', 'any', {
    set: 'ARN', rarity: 'U', mana: { colors: 'any', pain: 1 },
    text: '{T}: Add one mana of any color. City of Brass deals 1 damage to you.',
    art: { scene: 'desert', subj: 'city' },
  }),
  strip_mine: L('Strip Mine', '', ['C'], {
    set: 'ATQ', rarity: 'U',
    text: '{T}: Add {1}. {T}, Sacrifice Strip Mine: Destroy target land.',
    abilities: [{
      tap: true, sac: true, targets: [{ kind: 'land' }], text: '{T}, Sacrifice: Destroy target land.',
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); },
    }],
    art: { scene: 'mine' },
  }),

  // ---------------------------------------------------------------- White
  savannah_lions: C('Savannah Lions', 'W', 'Cat', 2, 1, { set: 'LEA', rarity: 'R', art: { scene: 'plains', subj: 'lion' } }),
  white_knight: C('White Knight', 'WW', 'Human Knight', 2, 2, {
    set: 'LEA', rarity: 'U', kw: ['firstStrike', 'proB'], text: 'First strike, protection from black.',
    art: { scene: 'castle', subj: 'knight', light: true },
  }),
  serra_angel: C('Serra Angel', '3WW', 'Angel', 4, 4, {
    set: 'LEA', rarity: 'U', kw: ['flying', 'vigilance'], text: 'Flying, vigilance.', art: { scene: 'sky', subj: 'angel' },
  }),
  mesa_pegasus: C('Mesa Pegasus', '1W', 'Pegasus', 1, 1, { set: 'LEA', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'sky', subj: 'pegasus' } }),
  pearled_unicorn: C('Pearled Unicorn', '2W', 'Unicorn', 2, 2, { set: 'LEA', rarity: 'C', art: { scene: 'field', subj: 'unicorn' } }),
  wall_of_swords: C('Wall of Swords', '3W', 'Wall', 3, 5, {
    set: 'LEA', rarity: 'U', kw: ['defender', 'flying'], text: 'Defender, flying.', art: { scene: 'sky', subj: 'swords' },
  }),
  northern_paladin: C('Northern Paladin', '2WW', 'Human Knight', 3, 3, {
    set: 'LEA', rarity: 'R',
    abilities: [{
      cost: 'WW', tap: true, text: '{W}{W}, {T}: Destroy target black permanent.',
      targets: [{ kind: 'permanent', filter: (g, t) => hasColor(g, t.c, 'B') }],
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); },
    }],
    art: { scene: 'snow', subj: 'paladin' },
  }),
  samite_healer: C('Samite Healer', '1W', 'Human Cleric', 1, 1, {
    set: 'LEA', rarity: 'C',
    abilities: [{
      tap: true, text: '{T}: Prevent the next 1 damage to any target this turn.', targets: [ANY],
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) preventDamage(g, t, 1); }, ai: 'prevent',
    }],
    art: { scene: 'temple', subj: 'healer' },
  }),
  tundra_wolves: C('Tundra Wolves', 'W', 'Wolf', 1, 1, { set: 'LEG', rarity: 'C', kw: ['firstStrike'], text: 'First strike.', art: { scene: 'snow', subj: 'wolf' } }),
  thunder_spirit: C('Thunder Spirit', '1WW', 'Elemental Spirit', 2, 2, {
    set: 'LEG', rarity: 'R', kw: ['flying', 'firstStrike'], text: 'Flying, first strike.', art: { scene: 'storm', subj: 'spirit' },
  }),
  moorish_cavalry: C('Moorish Cavalry', '2WW', 'Human Knight', 3, 3, { set: 'ARN', rarity: 'C', kw: ['trample'], text: 'Trample.', art: { scene: 'desert', subj: 'rider' } }),
  exorcist: C('Exorcist', '1WW', 'Human Cleric', 1, 1, {
    set: 'DRK', rarity: 'R',
    abilities: [{
      cost: '1W', tap: true, text: '{1}{W}, {T}: Destroy target black creature.',
      targets: [{ kind: 'creature', filter: (g, t) => hasColor(g, t.c, 'B') }],
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); },
    }],
    art: { scene: 'temple', subj: 'priest' },
  }),
  pikemen: C('Pikemen', '1W', 'Human Soldier', 1, 1, { set: 'DRK', rarity: 'C', kw: ['firstStrike'], text: 'First strike.', art: { scene: 'field', subj: 'soldier' } }),
  ardent_militia: C('Ardent Militia', '4W', 'Human Soldier', 2, 5, { set: 'POR', rarity: 'U', kw: ['vigilance'], text: 'Vigilance.', art: { scene: 'castle', subj: 'soldier' } }),

  swords_to_plowshares: {
    name: 'Swords to Plowshares', type: 'Instant', cost: 'W', set: 'LEA', rarity: 'U',
    text: 'Exile target creature. Its controller gains life equal to its power.',
    spell: {
      targets: [CREATURE],
      resolve: (g, ctx) => {
        const t = tgt(g, ctx);
        if (!t) return;
        const pw = Math.max(0, power(g, t.c));
        const who = g.cards[t.c].controller;
        exile(g, t.c);
        gainLife(g, who, pw);
      },
    },
    art: { scene: 'field', subj: 'plow' },
  },
  healing_salve: {
    name: 'Healing Salve', type: 'Instant', cost: 'W', set: 'LEA', rarity: 'C', text: 'Target player gains 3 life.',
    spell: { targets: [PLAYER], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) gainLife(g, t.p, 3); } },
    art: { scene: 'temple', subj: 'salve' },
  },
  sacred_nectar: {
    name: 'Sacred Nectar', type: 'Sorcery', cost: '1W', set: 'POR', rarity: 'C', text: 'You gain 4 life.',
    spell: { targets: [], resolve: (g, ctx) => gainLife(g, ctx.controller, 4) },
    art: { scene: 'sky', subj: 'chalice' },
  },
  holy_strength: {
    name: 'Holy Strength', type: 'Enchantment', sub: 'Aura', cost: 'W', set: 'LEA', rarity: 'C',
    text: 'Enchant creature. Enchanted creature gets +1/+2.', aura: { p: 1, t: 2 },
    art: { scene: 'temple', subj: 'aura_holy' },
  },
  disenchant: {
    name: 'Disenchant', type: 'Instant', cost: '1W', set: 'LEA', rarity: 'C', text: 'Destroy target artifact or enchantment.',
    spell: { targets: [{ kind: 'artEnch' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); } },
    art: { scene: 'void', subj: 'shatter_white' },
  },
  wrath_of_god: {
    name: 'Wrath of God', type: 'Sorcery', cost: '2WW', set: 'LEA', rarity: 'R',
    text: "Destroy all creatures. They can't be regenerated.",
    spell: {
      targets: [],
      resolve: (g) => { for (const iid of g.battlefield.filter((i) => isCreature(g, i))) destroy(g, iid, { noRegen: true }); },
    },
    art: { scene: 'storm', subj: 'wrath' },
  },
  crusade: {
    name: 'Crusade', type: 'Enchantment', cost: 'WW', set: 'LEA', rarity: 'R', text: 'White creatures get +1/+1.',
    anthem: (g, src, iid) => (isCreature(g, iid) && hasColor(g, iid, 'W') ? { p: 1, t: 1 } : null),
    art: { scene: 'field', subj: 'banner' }, ai: { value: 2 },
  },
  righteousness: {
    name: 'Righteousness', type: 'Instant', cost: 'W', set: 'LEA', rarity: 'R', text: 'Target blocking creature gets +7/+7 until end of turn.',
    spell: {
      targets: [{ kind: 'creature', filter: (g, t) => !!g.combat && g.combat.blocks.some(([b]) => b === t.c) }],
      resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) addMod(g, t.c, { p: 7, t: 7 }); },
    },
    art: { scene: 'temple', subj: 'aura_holy' },
  },
  army_of_allah: {
    name: 'Army of Allah', type: 'Instant', cost: '1WW', set: 'ARN', rarity: 'C', text: 'Attacking creatures you control get +2/+0 until end of turn.',
    canCast: (g) => !!g.combat && g.combat.attackers.length > 0,
    spell: {
      targets: [],
      resolve: (g, ctx) => {
        for (const a of g.combat ? g.combat.attackers : []) if (g.cards[a].controller === ctx.controller) addMod(g, a, { p: 2, t: 0 });
      },
    },
    art: { scene: 'desert', subj: 'army' },
  },
  armageddon: {
    name: 'Armageddon', type: 'Sorcery', cost: '3W', set: 'LEA', rarity: 'R', text: 'Destroy all lands.',
    spell: { targets: [], resolve: (g) => { for (const iid of g.battlefield.filter((i) => isLand(g, i))) destroy(g, iid); } },
    art: { scene: 'fire', subj: 'armageddon' },
  },
  moat: {
    name: 'Moat', type: 'Enchantment', cost: '2WW', set: 'LEG', rarity: 'R', text: "Creatures without flying can't attack.",
    attackRestriction: (g, src, iid) => hasKw(g, iid, 'flying'),
    art: { scene: 'castle', subj: 'moat' }, ai: { value: 2 },
  },

  // ---------------------------------------------------------------- Blue
  merfolk_of_the_pearl_trident: C('Merfolk of the Pearl Trident', 'U', 'Merfolk', 1, 1, { set: 'LEA', rarity: 'C', art: { scene: 'sea', subj: 'merfolk' } }),
  flying_men: C('Flying Men', 'U', 'Human', 1, 1, { set: 'ARN', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'sky', subj: 'flyingman' } }),
  storm_crow: C('Storm Crow', '1U', 'Bird', 1, 2, { set: 'POR', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'storm', subj: 'crow' } }),
  cloud_pirates: C('Cloud Pirates', 'U', 'Human Pirate', 1, 1, {
    set: 'POR', rarity: 'C', kw: ['flying', 'blocksOnlyFliers'], text: 'Flying. Can block only creatures with flying.', art: { scene: 'sky', subj: 'pirate' },
  }),
  prodigal_sorcerer: C('Prodigal Sorcerer', '2U', 'Human Wizard', 1, 1, {
    set: 'LEA', rarity: 'C',
    abilities: [{ tap: true, text: '{T}: Deals 1 damage to any target.', targets: [ANY], effect: burn(1), ai: 'ping' }],
    art: { scene: 'night', subj: 'wizard' },
  }),
  giant_tortoise: C('Giant Tortoise', '1U', 'Turtle', 1, 1, {
    set: 'LEA', rarity: 'C', text: 'Giant Tortoise gets +0/+3 as long as it is untapped.',
    selfBoost: (g, iid) => (g.cards[iid].tapped ? null : { t: 3 }),
    art: { scene: 'sea', subj: 'tortoise' },
  }),
  phantom_monster: C('Phantom Monster', '3U', 'Illusion', 3, 3, { set: 'LEA', rarity: 'U', kw: ['flying'], text: 'Flying.', art: { scene: 'night', subj: 'phantom' } }),
  wall_of_air: C('Wall of Air', '1UU', 'Wall', 1, 5, { set: 'LEA', rarity: 'U', kw: ['defender', 'flying'], text: 'Defender, flying.', art: { scene: 'sky', subj: 'wind' } }),
  lord_of_atlantis: C('Lord of Atlantis', 'UU', 'Merfolk', 2, 2, {
    set: 'LEA', rarity: 'R', text: 'Other Merfolk get +1/+1 and have islandwalk.',
    lord: (g, src, iid) => (isCreature(g, iid) && hasSub(g, iid, 'Merfolk') ? { p: 1, t: 1, kw: ['islandwalk'] } : null),
    art: { scene: 'sea', subj: 'merlord' },
  }),
  serendib_efreet: C('Serendib Efreet', '2U', 'Efreet', 3, 4, {
    set: 'ARN', rarity: 'R', kw: ['flying'], text: 'Flying. At the beginning of your upkeep, Serendib Efreet deals 1 damage to you.',
    onUpkeep: upkeepPing(1), art: { scene: 'desert', subj: 'djinn' },
  }),
  air_elemental: C('Air Elemental', '3UU', 'Elemental', 4, 4, { set: 'LEA', rarity: 'U', kw: ['flying'], text: 'Flying.', art: { scene: 'sky', subj: 'air_elemental' } }),
  water_elemental: C('Water Elemental', '3UU', 'Elemental', 5, 4, { set: 'LEA', rarity: 'U', art: { scene: 'sea', subj: 'water_elemental' } }),
  mahamoti_djinn: C('Mahamoti Djinn', '4UU', 'Djinn', 5, 6, { set: 'LEA', rarity: 'R', kw: ['flying'], text: 'Flying.', art: { scene: 'night', subj: 'djinn' } }),
  sea_serpent: C('Sea Serpent', '5U', 'Serpent', 5, 5, {
    set: 'LEA', rarity: 'C', text: "Sea Serpent can't attack unless defending player controls an Island.",
    canAttack: (g, iid) => controlsLandType(g, opp(g.cards[iid].controller), 'Island'),
    art: { scene: 'sea', subj: 'serpent' },
  }),

  counterspell: {
    name: 'Counterspell', type: 'Instant', cost: 'UU', set: 'LEA', rarity: 'U', text: 'Counter target spell.',
    spell: { targets: [{ kind: 'spell' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) counterStackItem(g, t.s); } },
    art: { scene: 'void', subj: 'counter' },
  },
  mana_drain: {
    name: 'Mana Drain', type: 'Instant', cost: 'UU', set: 'LEG', rarity: 'U',
    text: "Counter target spell. At the beginning of your next main phase, add {1} for each mana in that spell's cost.",
    spell: {
      targets: [{ kind: 'spell' }],
      resolve: (g, ctx) => {
        const t = tgt(g, ctx);
        if (!t) return;
        const item = counterStackItem(g, t.s);
        if (item) g.players[ctx.controller].bonusMana += manaValue(def(g, item.src).cost) + (item.x || 0);
      },
    },
    art: { scene: 'void', subj: 'drain' },
  },
  ancestral_recall: {
    name: 'Ancestral Recall', type: 'Instant', cost: 'U', set: 'LEA', rarity: 'R', text: 'Target player draws three cards.',
    spell: { targets: [PLAYER], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) draw(g, t.p, 3); } },
    art: { scene: 'void', subj: 'scroll' },
  },
  time_walk: {
    name: 'Time Walk', type: 'Sorcery', cost: '1U', set: 'LEA', rarity: 'R', text: 'Take an extra turn after this one.',
    spell: { targets: [], resolve: (g, ctx) => extraTurn(g, ctx.controller) },
    art: { scene: 'void', subj: 'clock' },
  },
  braingeyser: {
    name: 'Braingeyser', type: 'Sorcery', cost: 'XUU', set: 'LEA', rarity: 'R', text: 'Target player draws X cards.',
    spell: { targets: [PLAYER], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) draw(g, t.p, ctx.x); } },
    art: { scene: 'void', subj: 'brain' },
  },
  unsummon: {
    name: 'Unsummon', type: 'Instant', cost: 'U', set: 'LEA', rarity: 'C', text: "Return target creature to its owner's hand.",
    spell: { targets: [CREATURE], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) bounce(g, t.c); } },
    art: { scene: 'void', subj: 'vanish' },
  },
  psionic_blast: {
    name: 'Psionic Blast', type: 'Instant', cost: '2U', set: 'LEA', rarity: 'U', text: 'Psionic Blast deals 4 damage to any target and 2 damage to you.',
    spell: {
      targets: [ANY],
      resolve: (g, ctx) => {
        const t = tgt(g, ctx);
        if (!t) return;
        dealDamage(g, ctx.src, t, 4);
        dealDamage(g, ctx.src, { p: ctx.controller }, 2);
      },
    },
    art: { scene: 'void', subj: 'mindblast' },
  },
  jump: {
    name: 'Jump', type: 'Instant', cost: 'U', set: 'LEA', rarity: 'C', text: 'Target creature gains flying until end of turn.',
    spell: { targets: [CREATURE], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) addMod(g, t.c, { kw: ['flying'] }); } },
    art: { scene: 'sky', subj: 'jump' },
  },
  flight: {
    name: 'Flight', type: 'Enchantment', sub: 'Aura', cost: 'U', set: 'LEA', rarity: 'C', text: 'Enchant creature. Enchanted creature has flying.',
    aura: { kw: ['flying'] }, art: { scene: 'sky', subj: 'wings' },
  },
  control_magic: {
    name: 'Control Magic', type: 'Enchantment', sub: 'Aura', cost: '2UU', set: 'LEA', rarity: 'U',
    text: 'Enchant creature. You control enchanted creature.', control: true,
    art: { scene: 'void', subj: 'puppet' },
  },

  // ---------------------------------------------------------------- Black
  dark_ritual: {
    name: 'Dark Ritual', type: 'Instant', cost: 'B', set: 'LEA', rarity: 'C', text: 'Add {B}{B}{B}.',
    spell: { targets: [], resolve: (g, ctx) => addMana(g, ctx.controller, 'B', 3) },
    art: { scene: 'dungeon', subj: 'ritual' }, ai: { ritual: true },
  },
  muck_rats: C('Muck Rats', 'B', 'Rat', 1, 1, { set: 'POR', rarity: 'C', art: { scene: 'swamp', subj: 'rat' } }),
  bog_rats: C('Bog Rats', 'B', 'Rat', 1, 1, {
    set: 'DRK', rarity: 'C', kw: ['noWalls'], text: "Bog Rats can't be blocked by Walls.", art: { scene: 'swamp', subj: 'rat' },
  }),
  will_o_the_wisp: C("Will-o'-the-Wisp", 'B', 'Spirit', 0, 1, {
    set: 'LEA', rarity: 'R', kw: ['flying'], text: 'Flying. {B}: Regenerate this creature.', abilities: [regen('B')],
    art: { scene: 'swamp', subj: 'wisp' },
  }),
  drudge_skeletons: C('Drudge Skeletons', '1B', 'Skeleton', 1, 1, {
    set: 'LEA', rarity: 'C', text: '{B}: Regenerate Drudge Skeletons.', abilities: [regen('B')], art: { scene: 'grave', subj: 'skeleton' },
  }),
  bog_imp: C('Bog Imp', '1B', 'Imp', 1, 1, { set: 'POR', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'swamp', subj: 'imp' } }),
  scathe_zombies: C('Scathe Zombies', '2B', 'Zombie', 2, 2, { set: 'LEA', rarity: 'C', art: { scene: 'grave', subj: 'zombie' } }),
  frozen_shade: C('Frozen Shade', '2B', 'Shade', 0, 1, {
    set: 'LEA', rarity: 'C', abilities: [pump('B', 1, 1, '{B}: +1/+1 until end of turn.')], art: { scene: 'snow', subj: 'shade' },
  }),
  black_knight: C('Black Knight', 'BB', 'Human Knight', 2, 2, {
    set: 'LEA', rarity: 'U', kw: ['firstStrike', 'proW'], text: 'First strike, protection from white.',
    art: { scene: 'castle', subj: 'knight', dark: true },
  }),
  royal_assassin: C('Royal Assassin', '1BB', 'Human Assassin', 1, 1, {
    set: 'LEA', rarity: 'R',
    abilities: [{
      tap: true, text: '{T}: Destroy target tapped creature.',
      targets: [{ kind: 'creature', filter: (g, t) => g.cards[t.c].tapped }],
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); },
    }],
    art: { scene: 'night', subj: 'assassin' },
  }),
  hypnotic_specter: C('Hypnotic Specter', '1BB', 'Specter', 2, 2, {
    set: 'LEA', rarity: 'U', kw: ['flying'],
    text: 'Flying. Whenever Hypnotic Specter deals damage to an opponent, that player discards a card at random.',
    onDamagePlayer: (g, iid, p) => { if (p !== g.cards[iid].controller) discardRandom(g, p, 1); },
    art: { scene: 'night', subj: 'specter' },
  }),
  uncle_istvan: C('Uncle Istvan', '1BBB', 'Human', 1, 3, {
    set: 'DRK', rarity: 'U', immuneToCreatures: true, text: 'Prevent all damage that would be dealt to Uncle Istvan by creatures.',
    art: { scene: 'dungeon', subj: 'oldman' },
  }),
  bog_wraith: C('Bog Wraith', '3B', 'Wraith', 3, 3, { set: 'LEA', rarity: 'U', kw: ['swampwalk'], text: 'Swampwalk.', art: { scene: 'swamp', subj: 'wraith' } }),
  juzam_djinn: C('Juzam Djinn', '2BB', 'Djinn', 5, 5, {
    set: 'ARN', rarity: 'R', text: 'At the beginning of your upkeep, Juzam Djinn deals 1 damage to you.',
    onUpkeep: upkeepPing(1), art: { scene: 'desert', subj: 'djinn', dark: true },
  }),
  sengir_vampire: C('Sengir Vampire', '3BB', 'Vampire', 4, 4, {
    set: 'LEA', rarity: 'U', kw: ['flying'],
    text: 'Flying. Whenever a creature dealt damage by Sengir Vampire this turn dies, put a +1/+1 counter on Sengir Vampire.',
    onOtherDies: (g, self, dead, snap) => { if (snap.damagedBy.includes(self) && g.cards[self].zone === 'battlefield') addCounters(g, self, 1); },
    art: { scene: 'night', subj: 'vampire' },
  }),
  nightmare: C('Nightmare', '5B', 'Nightmare Horse', 0, 0, {
    set: 'LEA', rarity: 'R', kw: ['flying'],
    text: "Flying. Nightmare's power and toughness are each equal to the number of Swamps you control.",
    pt: (g, iid) => {
      const n = landsOf(g, g.cards[iid].controller).filter((l) => hasSub(g, l, 'Swamp')).length;
      return [n, n];
    },
    art: { scene: 'fire', subj: 'nightmare' },
  }),

  terror: {
    name: 'Terror', type: 'Instant', cost: '1B', set: 'LEA', rarity: 'C',
    text: "Destroy target nonartifact, nonblack creature. It can't be regenerated.",
    spell: {
      targets: [{ kind: 'creature', filter: (g, t) => !isArtifact(g, t.c) && !hasColor(g, t.c, 'B') }],
      resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c, { noRegen: true }); },
    },
    art: { scene: 'night', subj: 'skull' },
  },
  hand_of_death: {
    name: 'Hand of Death', type: 'Sorcery', cost: '2B', set: 'POR', rarity: 'C', text: 'Destroy target nonblack creature.',
    spell: {
      targets: [{ kind: 'creature', filter: (g, t) => !hasColor(g, t.c, 'B') }],
      resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); },
    },
    art: { scene: 'night', subj: 'deathhand' },
  },
  sinkhole: {
    name: 'Sinkhole', type: 'Sorcery', cost: 'BB', set: 'LEA', rarity: 'C', text: 'Destroy target land.',
    spell: { targets: [{ kind: 'land' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); } },
    art: { scene: 'swamp', subj: 'pit' },
  },
  unholy_strength: {
    name: 'Unholy Strength', type: 'Enchantment', sub: 'Aura', cost: 'B', set: 'LEA', rarity: 'C',
    text: 'Enchant creature. Enchanted creature gets +2/+1.', aura: { p: 2, t: 1 }, art: { scene: 'dungeon', subj: 'aura_dark' },
  },
  mind_twist: {
    name: 'Mind Twist', type: 'Sorcery', cost: 'XB', set: 'LEA', rarity: 'R', text: 'Target player discards X cards at random.',
    spell: { targets: [PLAYER], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) discardRandom(g, t.p, ctx.x); } },
    art: { scene: 'void', subj: 'twist' },
  },
  demonic_tutor: {
    name: 'Demonic Tutor', type: 'Sorcery', cost: '1B', set: 'LEA', rarity: 'U',
    text: 'Search your library for a card, put that card into your hand, then shuffle.', needsPick: true,
    spell: { targets: [], resolve: (g, ctx) => searchLibraryToHand(g, ctx.controller, ctx.pick) },
    art: { scene: 'fire', subj: 'demon' },
  },
  raise_dead: {
    name: 'Raise Dead', type: 'Sorcery', cost: 'B', set: 'LEA', rarity: 'C', text: 'Return target creature card from your graveyard to your hand.',
    spell: {
      targets: [{ kind: 'gyCreature' }],
      resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) moveCard(g, t.c, 'hand'); },
    },
    art: { scene: 'grave', subj: 'raisehand' },
  },

  // ---------------------------------------------------------------- Red
  raging_goblin: C('Raging Goblin', 'R', 'Goblin Berserker', 1, 1, { set: 'POR', rarity: 'C', kw: ['haste'], text: 'Haste.', art: { scene: 'fire', subj: 'goblin' } }),
  mons_goblin_raiders: C("Mons's Goblin Raiders", 'R', 'Goblin', 1, 1, { set: 'LEA', rarity: 'C', art: { scene: 'mountain', subj: 'goblin' } }),
  kird_ape: C('Kird Ape', 'R', 'Ape', 1, 1, {
    set: 'ARN', rarity: 'C', text: 'Kird Ape gets +1/+2 as long as you control a Forest.',
    selfBoost: (g, iid) => (controlsLandType(g, g.cards[iid].controller, 'Forest') ? { p: 1, t: 2 } : null),
    art: { scene: 'forest', subj: 'ape' },
  }),
  goblin_balloon_brigade: C('Goblin Balloon Brigade', 'R', 'Goblin Warrior', 1, 1, {
    set: 'LEA', rarity: 'U',
    abilities: [{ cost: 'R', text: '{R}: Gains flying until end of turn.', effect: (g, ctx) => addMod(g, ctx.src, { kw: ['flying'] }), ai: 'evasion' }],
    art: { scene: 'sky', subj: 'balloon' },
  }),
  gray_ogre: C('Gray Ogre', '2R', 'Ogre', 2, 2, { set: 'LEA', rarity: 'C', art: { scene: 'mountain', subj: 'ogre' } }),
  goblin_hero: C('Goblin Hero', '2R', 'Goblin', 2, 2, { set: 'DRK', rarity: 'C', art: { scene: 'cave', subj: 'goblin_hero' } }),
  uthden_troll: C('Uthden Troll', '2R', 'Troll', 2, 2, { set: 'LEA', rarity: 'U', text: '{R}: Regenerate Uthden Troll.', abilities: [regen('R')], art: { scene: 'cave', subj: 'troll' } }),
  hurloon_minotaur: C('Hurloon Minotaur', '1RR', 'Minotaur', 2, 3, { set: 'LEA', rarity: 'C', art: { scene: 'mountain', subj: 'minotaur' } }),
  wall_of_stone: C('Wall of Stone', '1RR', 'Wall', 0, 8, { set: 'LEA', rarity: 'U', kw: ['defender'], text: 'Defender.', art: { scene: 'mountain', subj: 'stonewall' } }),
  orcish_artillery: C('Orcish Artillery', '1RR', 'Orc Warrior', 1, 3, {
    set: 'LEA', rarity: 'U',
    abilities: [{
      tap: true, text: '{T}: Deals 2 damage to any target and 3 damage to you.', targets: [ANY], ai: 'ping',
      effect: (g, ctx) => {
        const t = tgt(g, ctx);
        if (!t) return;
        dealDamage(g, ctx.src, t, 2);
        dealDamage(g, ctx.src, { p: ctx.controller }, 3);
      },
    }],
    art: { scene: 'castle', subj: 'cannon' },
  }),
  goblin_king: C('Goblin King', '1RR', 'Goblin', 2, 2, {
    set: 'LEA', rarity: 'R', text: 'Other Goblins get +1/+1 and have mountainwalk.',
    lord: (g, src, iid) => (isCreature(g, iid) && hasSub(g, iid, 'Goblin') ? { p: 1, t: 1, kw: ['mountainwalk'] } : null),
    art: { scene: 'cave', subj: 'goblin_king' },
  }),
  dragon_whelp: C('Dragon Whelp', '2RR', 'Dragon', 2, 3, {
    set: 'LEA', rarity: 'U', kw: ['flying'],
    text: 'Flying. {R}: +1/+0 until end of turn. If this was activated four or more times this turn, sacrifice it at the beginning of the end step.',
    abilities: [pump('R', 1, 0, '{R}: +1/+0 until end of turn.')],
    onEndStep: (g, iid) => { if (g.cards[iid].activations >= 4) sacrifice(g, iid); },
    art: { scene: 'mountain', subj: 'whelp' },
  }),
  ball_lightning: C('Ball Lightning', 'RRR', 'Elemental', 6, 1, {
    set: 'DRK', rarity: 'R', kw: ['trample', 'haste'], text: 'Trample, haste. At the beginning of the end step, sacrifice Ball Lightning.',
    onEndStep: (g, iid) => sacrifice(g, iid), art: { scene: 'storm', subj: 'ball' },
  }),
  hill_giant: C('Hill Giant', '3R', 'Giant', 3, 3, { set: 'LEA', rarity: 'C', art: { scene: 'mountain', subj: 'giant' } }),
  earth_elemental: C('Earth Elemental', '3RR', 'Elemental', 4, 5, { set: 'LEA', rarity: 'U', art: { scene: 'cave', subj: 'earth_elemental' } }),
  fire_elemental: C('Fire Elemental', '3RR', 'Elemental', 5, 4, { set: 'LEA', rarity: 'U', art: { scene: 'fire', subj: 'fire_elemental' } }),
  shivan_dragon: C('Shivan Dragon', '4RR', 'Dragon', 5, 5, {
    set: 'LEA', rarity: 'R', kw: ['flying'], text: 'Flying. {R}: +1/+0 until end of turn.',
    abilities: [pump('R', 1, 0, '{R}: +1/+0 until end of turn.')], art: { scene: 'mountain', subj: 'dragon' },
  }),

  lightning_bolt: {
    name: 'Lightning Bolt', type: 'Instant', cost: 'R', set: 'LEA', rarity: 'C', text: 'Lightning Bolt deals 3 damage to any target.',
    spell: { targets: [ANY], resolve: burn(3) }, art: { scene: 'storm', subj: 'bolt' },
  },
  chain_lightning: {
    name: 'Chain Lightning', type: 'Sorcery', cost: 'R', set: 'LEG', rarity: 'C', text: 'Chain Lightning deals 3 damage to any target.',
    spell: { targets: [ANY], resolve: burn(3) }, art: { scene: 'storm', subj: 'chain' },
  },
  volcanic_hammer: {
    name: 'Volcanic Hammer', type: 'Sorcery', cost: '1R', set: 'POR', rarity: 'C', text: 'Volcanic Hammer deals 3 damage to any target.',
    spell: { targets: [ANY], resolve: burn(3) }, art: { scene: 'fire', subj: 'hammer' },
  },
  lava_axe: {
    name: 'Lava Axe', type: 'Sorcery', cost: '4R', set: 'POR', rarity: 'C', text: 'Lava Axe deals 5 damage to target player.',
    spell: { targets: [PLAYER], resolve: burn(5) }, art: { scene: 'mountain', subj: 'axe' },
  },
  fireball: {
    name: 'Fireball', type: 'Sorcery', cost: 'XR', set: 'LEA', rarity: 'C', text: 'Fireball deals X damage to any target.',
    spell: { targets: [ANY], resolve: (g, ctx) => burn(ctx.x)(g, ctx) }, art: { scene: 'fire', subj: 'fireball' },
  },
  disintegrate: {
    name: 'Disintegrate', type: 'Sorcery', cost: 'XR', set: 'LEA', rarity: 'C',
    text: "Disintegrate deals X damage to any target. If it's a creature, it can't be regenerated this turn.",
    spell: {
      targets: [ANY],
      resolve: (g, ctx) => {
        const t = tgt(g, ctx);
        if (!t) return;
        if (t.c !== undefined) g.cards[t.c].noRegen = true;
        dealDamage(g, ctx.src, t, ctx.x);
      },
    },
    art: { scene: 'void', subj: 'disintegrate' },
  },
  earthquake: {
    name: 'Earthquake', type: 'Sorcery', cost: 'XR', set: 'LEA', rarity: 'R',
    text: 'Earthquake deals X damage to each creature without flying and each player.',
    spell: {
      targets: [],
      resolve: (g, ctx) => {
        for (const iid of g.battlefield.filter((i) => isCreature(g, i) && !hasKw(g, i, 'flying'))) dealDamage(g, ctx.src, { c: iid }, ctx.x);
        for (let p = 0; p < 2; p++) dealDamage(g, ctx.src, { p }, ctx.x);
      },
    },
    art: { scene: 'cave', subj: 'quake' },
  },
  shatter: {
    name: 'Shatter', type: 'Instant', cost: '1R', set: 'LEA', rarity: 'C', text: 'Destroy target artifact.',
    spell: { targets: [{ kind: 'artifact' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); } },
    art: { scene: 'void', subj: 'shatter' },
  },
  stone_rain: {
    name: 'Stone Rain', type: 'Sorcery', cost: '2R', set: 'LEA', rarity: 'C', text: 'Destroy target land.',
    spell: { targets: [{ kind: 'land' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); } },
    art: { scene: 'mountain', subj: 'rocks' },
  },

  // ---------------------------------------------------------------- Green
  llanowar_elves: C('Llanowar Elves', 'G', 'Elf Druid', 1, 1, {
    set: 'LEA', rarity: 'C', mana: { colors: ['G'] }, text: '{T}: Add {G}.', art: { scene: 'forest', subj: 'elf' },
  }),
  birds_of_paradise: C('Birds of Paradise', 'G', 'Bird', 0, 1, {
    set: 'LEA', rarity: 'R', kw: ['flying'], mana: { colors: 'any' }, text: 'Flying. {T}: Add one mana of any color.',
    art: { scene: 'paradise', subj: 'bird' },
  }),
  scryb_sprites: C('Scryb Sprites', 'G', 'Faerie', 1, 1, { set: 'LEA', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'wood', subj: 'faerie' } }),
  shanodin_dryads: C('Shanodin Dryads', 'G', 'Nymph Dryad', 1, 1, { set: 'LEA', rarity: 'C', kw: ['forestwalk'], text: 'Forestwalk.', art: { scene: 'forest', subj: 'dryad' } }),
  wall_of_wood: C('Wall of Wood', 'G', 'Wall', 0, 3, { set: 'LEA', rarity: 'C', kw: ['defender'], text: 'Defender.', art: { scene: 'wood', subj: 'woodwall' } }),
  grizzly_bears: C('Grizzly Bears', '1G', 'Bear', 2, 2, { set: 'LEA', rarity: 'C', art: { scene: 'forest', subj: 'bear' } }),
  elvish_archers: C('Elvish Archers', '1G', 'Elf Archer', 2, 1, { set: 'LEA', rarity: 'R', kw: ['firstStrike'], text: 'First strike.', art: { scene: 'wood', subj: 'archer' } }),
  killer_bees: C('Killer Bees', '1GG', 'Insect', 0, 1, {
    set: 'LEG', rarity: 'U', kw: ['flying'], text: 'Flying. {G}: +1/+1 until end of turn.',
    abilities: [pump('G', 1, 1, '{G}: +1/+1 until end of turn.')], art: { scene: 'wood', subj: 'bees' },
  }),
  giant_spider: C('Giant Spider', '3G', 'Spider', 2, 4, { set: 'LEA', rarity: 'C', kw: ['reach'], text: 'Reach.', art: { scene: 'wood', subj: 'spider' } }),
  war_mammoth: C('War Mammoth', '3G', 'Elephant', 3, 3, { set: 'LEA', rarity: 'C', kw: ['trample'], text: 'Trample.', art: { scene: 'snow', subj: 'mammoth' } }),
  erhnam_djinn: C('Erhnam Djinn', '3G', 'Djinn', 4, 5, {
    set: 'ARN', rarity: 'U',
    text: 'At the beginning of your upkeep, a non-Wall creature an opponent controls gains forestwalk until your next upkeep.',
    onUpkeep: (g, iid) => {
      const foes = creaturesOf(g, opp(g.cards[iid].controller)).filter((c) => !hasSub(g, c, 'Wall'));
      if (foes.length) addMod(g, foes[0], { kw: ['forestwalk'], turns: 1 });
    },
    art: { scene: 'forest', subj: 'djinn', green: true },
  }),
  ironroot_treefolk: C('Ironroot Treefolk', '4G', 'Treefolk', 3, 5, { set: 'LEA', rarity: 'C', art: { scene: 'forest', subj: 'treefolk' } }),
  spined_wurm: C('Spined Wurm', '4G', 'Wurm', 5, 4, { set: 'POR', rarity: 'C', art: { scene: 'field', subj: 'wurm' } }),
  craw_wurm: C('Craw Wurm', '4GG', 'Wurm', 6, 4, { set: 'LEA', rarity: 'C', art: { scene: 'forest', subj: 'wurm' } }),
  force_of_nature: C('Force of Nature', '2GGGG', 'Elemental', 8, 8, {
    set: 'LEA', rarity: 'R', kw: ['trample'],
    text: 'Trample. At the beginning of your upkeep, Force of Nature deals 8 damage to you unless you pay {G}{G}{G}{G}.',
    onUpkeep: (g, iid) => {
      const p = g.cards[iid].controller;
      if (canPay(g, p, 'GGGG')) pay(g, p, 'GGGG');
      else dealDamage(g, iid, { p }, 8);
    },
    art: { scene: 'forest', subj: 'force' },
  }),

  giant_growth: {
    name: 'Giant Growth', type: 'Instant', cost: 'G', set: 'LEA', rarity: 'C', text: 'Target creature gets +3/+3 until end of turn.',
    spell: { targets: [CREATURE], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) addMod(g, t.c, { p: 3, t: 3 }); } },
    art: { scene: 'forest', subj: 'growth' },
  },
  monstrous_growth: {
    name: 'Monstrous Growth', type: 'Sorcery', cost: '1G', set: 'POR', rarity: 'C', text: 'Target creature gets +4/+4 until end of turn.',
    spell: { targets: [CREATURE], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) addMod(g, t.c, { p: 4, t: 4 }); } },
    art: { scene: 'wood', subj: 'growth' },
  },
  berserk: {
    name: 'Berserk', type: 'Instant', cost: 'G', set: 'LEA', rarity: 'U',
    text: "Target creature gains trample and gets +X/+0 until end of turn, where X is its power.",
    spell: {
      targets: [CREATURE],
      resolve: (g, ctx) => {
        const t = tgt(g, ctx);
        if (t) addMod(g, t.c, { p: Math.max(0, power(g, t.c)), kw: ['trample'] });
      },
    },
    art: { scene: 'fire', subj: 'berserk' },
  },
  fog: {
    name: 'Fog', type: 'Instant', cost: 'G', set: 'LEA', rarity: 'C', text: 'Prevent all combat damage that would be dealt this turn.',
    spell: { targets: [], resolve: (g) => { g.fog = true; } }, art: { scene: 'fog', subj: 'mist' },
  },
  stream_of_life: {
    name: 'Stream of Life', type: 'Sorcery', cost: 'XG', set: 'LEA', rarity: 'C', text: 'Target player gains X life.',
    spell: { targets: [PLAYER], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) gainLife(g, t.p, ctx.x); } },
    art: { scene: 'forest', subj: 'stream' },
  },
  hurricane: {
    name: 'Hurricane', type: 'Sorcery', cost: 'XG', set: 'LEA', rarity: 'U',
    text: 'Hurricane deals X damage to each creature with flying and each player.',
    spell: {
      targets: [],
      resolve: (g, ctx) => {
        for (const iid of g.battlefield.filter((i) => isCreature(g, i) && hasKw(g, i, 'flying'))) dealDamage(g, ctx.src, { c: iid }, ctx.x);
        for (let p = 0; p < 2; p++) dealDamage(g, ctx.src, { p }, ctx.x);
      },
    },
    art: { scene: 'storm', subj: 'tornado' },
  },
  tranquility: {
    name: 'Tranquility', type: 'Sorcery', cost: '2G', set: 'LEA', rarity: 'C', text: 'Destroy all enchantments.',
    spell: { targets: [], resolve: (g) => { for (const iid of g.battlefield.filter((i) => isEnchantment(g, i))) destroy(g, iid); } },
    art: { scene: 'wood', subj: 'calm' },
  },
  desert_twister: {
    name: 'Desert Twister', type: 'Sorcery', cost: '4GG', set: 'ARN', rarity: 'U', text: 'Destroy target permanent.',
    spell: { targets: [{ kind: 'permanent' }], resolve: (g, ctx) => { const t = tgt(g, ctx); if (t) destroy(g, t.c); } },
    art: { scene: 'desert', subj: 'tornado' },
  },

  // ---------------------------------------------------------------- Artifacts
  black_lotus: {
    name: 'Black Lotus', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R',
    text: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
    abilities: [{
      tap: true, sac: true, manaAbility: true, chooseColor: true, text: '{T}, Sacrifice: Add three mana of any one color.',
      effect: (g, ctx) => addMana(g, ctx.controller, ctx.color || 'C', 3),
    }],
    art: { scene: 'void', subj: 'lotus' }, ai: { value: 1 },
  },
  sol_ring: {
    name: 'Sol Ring', type: 'Artifact', cost: '1', set: 'LEA', rarity: 'U', text: '{T}: Add {2}.', mana: { colors: ['C'], amount: 2 },
    art: { scene: 'void', subj: 'ring' }, ai: { value: 3 },
  },
  mox_pearl: { name: 'Mox Pearl', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R', text: '{T}: Add {W}.', mana: { colors: ['W'] }, art: { scene: 'void', subj: 'gem', gem: 'W' }, ai: { value: 1.5 } },
  mox_sapphire: { name: 'Mox Sapphire', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R', text: '{T}: Add {U}.', mana: { colors: ['U'] }, art: { scene: 'void', subj: 'gem', gem: 'U' }, ai: { value: 1.5 } },
  mox_jet: { name: 'Mox Jet', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R', text: '{T}: Add {B}.', mana: { colors: ['B'] }, art: { scene: 'void', subj: 'gem', gem: 'B' }, ai: { value: 1.5 } },
  mox_ruby: { name: 'Mox Ruby', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R', text: '{T}: Add {R}.', mana: { colors: ['R'] }, art: { scene: 'void', subj: 'gem', gem: 'R' }, ai: { value: 1.5 } },
  mox_emerald: { name: 'Mox Emerald', type: 'Artifact', cost: '0', set: 'LEA', rarity: 'R', text: '{T}: Add {G}.', mana: { colors: ['G'] }, art: { scene: 'void', subj: 'gem', gem: 'G' }, ai: { value: 1.5 } },
  fellwar_stone: {
    name: 'Fellwar Stone', type: 'Artifact', cost: '2', set: 'DRK', rarity: 'U', text: '{T}: Add one mana of any color.', mana: { colors: 'any' },
    art: { scene: 'cave', subj: 'stone' }, ai: { value: 1.5 },
  },
  ornithopter: { ...C('Ornithopter', '0', 'Thopter', 0, 2, { set: 'ATQ', rarity: 'C', kw: ['flying'], text: 'Flying.', art: { scene: 'sky', subj: 'thopter' } }), type: 'Artifact Creature' },
  dragon_engine: {
    ...C('Dragon Engine', '3', 'Construct', 1, 3, { set: 'ATQ', rarity: 'C', abilities: [pump('2', 1, 0, '{2}: +1/+0 until end of turn.')], art: { scene: 'workshop', subj: 'engine' } }),
    type: 'Artifact Creature',
  },
  clay_statue: {
    ...C('Clay Statue', '4', 'Golem', 3, 1, { set: 'ATQ', rarity: 'C', text: '{2}: Regenerate Clay Statue.', abilities: [regen('2')], art: { scene: 'workshop', subj: 'statue' } }),
    type: 'Artifact Creature',
  },
  juggernaut: {
    ...C('Juggernaut', '4', 'Juggernaut', 5, 3, {
      set: 'LEA', rarity: 'U', kw: ['attacksEachTurn', 'noWalls'], text: "Juggernaut attacks each combat if able. It can't be blocked by Walls.",
      art: { scene: 'ruins', subj: 'juggernaut' },
    }),
    type: 'Artifact Creature',
  },
  obsianus_golem: { ...C('Obsianus Golem', '6', 'Golem', 4, 6, { set: 'LEA', rarity: 'U', art: { scene: 'ruins', subj: 'golem' } }), type: 'Artifact Creature' },
  howling_mine: {
    name: 'Howling Mine', type: 'Artifact', cost: '2', set: 'LEA', rarity: 'R',
    text: "At the beginning of each player's draw step, if Howling Mine is untapped, that player draws an additional card.",
    onDrawStep: (g, iid, p) => draw(g, p, 1), art: { scene: 'mine', subj: 'minecart' }, ai: { value: 0.5 },
  },
  ankh_of_mishra: {
    name: 'Ankh of Mishra', type: 'Artifact', cost: '2', set: 'LEA', rarity: 'R',
    text: 'Whenever a land enters the battlefield, Ankh of Mishra deals 2 damage to that land\'s controller.',
    onLandEnters: (g, iid, land) => dealDamage(g, iid, { p: g.cards[land].controller }, 2),
    art: { scene: 'desert', subj: 'ankh' }, ai: { value: 1 },
  },
  icy_manipulator: {
    name: 'Icy Manipulator', type: 'Artifact', cost: '4', set: 'LEA', rarity: 'U',
    text: '{1}, {T}: Tap target artifact, creature, or land.',
    abilities: [{
      cost: '1', tap: true, text: '{1}, {T}: Tap target artifact, creature, or land.', targets: [{ kind: 'tappable', filter: (g, t) => !g.cards[t.c].tapped }],
      effect: (g, ctx) => { const t = tgt(g, ctx); if (t) tap(g, t.c); }, ai: 'tapper',
    }],
    art: { scene: 'snow', subj: 'icy' }, ai: { value: 2.5 },
  },
  rod_of_ruin: {
    name: 'Rod of Ruin', type: 'Artifact', cost: '4', set: 'LEA', rarity: 'U', text: '{3}, {T}: Rod of Ruin deals 1 damage to any target.',
    abilities: [{ cost: '3', tap: true, text: '{3}, {T}: Deals 1 damage to any target.', targets: [ANY], effect: burn(1), ai: 'ping' }],
    art: { scene: 'void', subj: 'rod' }, ai: { value: 2 },
  },
  jayemdae_tome: {
    name: 'Jayemdae Tome', type: 'Artifact', cost: '4', set: 'LEA', rarity: 'R', text: '{4}, {T}: Draw a card.',
    abilities: [{ cost: '4', tap: true, text: '{4}, {T}: Draw a card.', effect: (g, ctx) => draw(g, ctx.controller, 1), ai: 'draw' }],
    art: { scene: 'dungeon', subj: 'tome' }, ai: { value: 2.5 },
  },
  millstone: {
    name: 'Millstone', type: 'Artifact', cost: '2', set: 'ATQ', rarity: 'R', text: '{2}, {T}: Target player mills two cards.',
    abilities: [{ cost: '2', tap: true, text: '{2}, {T}: Target player mills two cards.', targets: [PLAYER], effect: (g, ctx) => { const t = tgt(g, ctx); if (t) mill(g, t.p, 2); }, ai: 'mill' }],
    art: { scene: 'field', subj: 'millstone' }, ai: { value: 1.5 },
  },
  flying_carpet: {
    name: 'Flying Carpet', type: 'Artifact', cost: '4', set: 'ARN', rarity: 'R', text: '{2}, {T}: Target creature gains flying until end of turn.',
    abilities: [{ cost: '2', tap: true, text: '{2}, {T}: Target creature gains flying until end of turn.', targets: [CREATURE], effect: (g, ctx) => { const t = tgt(g, ctx); if (t) addMod(g, t.c, { kw: ['flying'] }); }, ai: 'evasion' }],
    art: { scene: 'desert', subj: 'carpet' }, ai: { value: 1.5 },
  },
};

// Fill in defaults and ids.
for (const [id, d] of Object.entries(CARDS)) {
  d.id = id;
  d.kw = d.kw || [];
  if (d.text == null) d.text = '';
  if (!d.rarity) d.rarity = 'C';
  d.art = d.art || { scene: 'void' };
}

export const RARITY_NAMES = { C: 'COMMON', U: 'UNCOMMON', R: 'RARE' };
export const SET_NAMES = {
  LEA: 'LIMITED EDITION',
  ARN: 'ARABIAN NIGHTS',
  ATQ: 'ANTIQUITIES',
  LEG: 'LEGENDS',
  DRK: 'THE DARK',
  POR: 'PORTAL',
};

export const KEYWORD_LABELS = {
  flying: 'FLYING',
  reach: 'REACH',
  firstStrike: 'FIRST STRIKE',
  trample: 'TRAMPLE',
  haste: 'HASTE',
  vigilance: 'VIGILANCE',
  defender: 'DEFENDER',
  islandwalk: 'ISLANDWALK',
  swampwalk: 'SWAMPWALK',
  forestwalk: 'FORESTWALK',
  mountainwalk: 'MOUNTAINWALK',
  plainswalk: 'PLAINSWALK',
  proW: 'PRO WHITE',
  proU: 'PRO BLUE',
  proB: 'PRO BLACK',
  proR: 'PRO RED',
  proG: 'PRO GREEN',
};

// Short tags shown on the card detail screen ("HST." in the video).
export const KEYWORD_SHORT = {
  flying: 'FLY',
  reach: 'RCH',
  firstStrike: '1ST',
  trample: 'TRM',
  haste: 'HST',
  vigilance: 'VIG',
  defender: 'DEF',
  islandwalk: 'ISW',
  swampwalk: 'SWW',
  forestwalk: 'FRW',
  mountainwalk: 'MTW',
  plainswalk: 'PLW',
  proW: 'P-W',
  proU: 'P-U',
  proB: 'P-B',
  proR: 'P-R',
  proG: 'P-G',
};

export function cardColor(d) {
  if (d.type.includes('Land')) {
    if (d.basic) return { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' }[d.sub];
    return 'L';
  }
  const cols = ['W', 'U', 'B', 'R', 'G'].filter((c) => (d.cost || '').includes(c));
  if (cols.length > 1) return 'M';
  if (cols.length === 1) return cols[0];
  return 'A';
}
