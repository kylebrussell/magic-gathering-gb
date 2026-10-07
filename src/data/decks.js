// Preconstructed decks: the three starters the player chooses from, and every
// opponent's deck. Counts must add up to 60.

export const STARTERS = {
  mountain_rage: {
    name: 'Mountain Rage',
    blurb: 'Red and green. Fast goblins, big beasts and burn.',
    colors: ['R', 'G'],
    cards: {
      mountain: 12, forest: 12,
      raging_goblin: 3, mons_goblin_raiders: 2, kird_ape: 3, llanowar_elves: 3, shanodin_dryads: 2,
      grizzly_bears: 3, gray_ogre: 2, hurloon_minotaur: 2, war_mammoth: 2, hill_giant: 2, giant_spider: 1, craw_wurm: 1,
      lightning_bolt: 2, volcanic_hammer: 2, lava_axe: 2, giant_growth: 2, monstrous_growth: 1, stone_rain: 1,
    },
  },
  tidal_knights: {
    name: 'Tidal Knights',
    blurb: 'White and blue. Flyers, knights and tricks.',
    colors: ['W', 'U'],
    cards: {
      plains: 12, island: 12,
      savannah_lions: 2, pikemen: 2, tundra_wolves: 2, mesa_pegasus: 3, pearled_unicorn: 3, ardent_militia: 2,
      merfolk_of_the_pearl_trident: 3, storm_crow: 3, flying_men: 2, cloud_pirates: 1, giant_tortoise: 2, phantom_monster: 2,
      air_elemental: 1, wall_of_air: 1,
      healing_salve: 1, unsummon: 2, jump: 1, holy_strength: 2, sacred_nectar: 1,
    },
  },
  dark_swamp: {
    name: 'Dark Swamp',
    blurb: 'Black and red. Undead hordes and dark magic.',
    colors: ['B', 'R'],
    cards: {
      swamp: 14, mountain: 10,
      muck_rats: 3, bog_rats: 1, bog_imp: 3, drudge_skeletons: 2, scathe_zombies: 3, frozen_shade: 2, bog_wraith: 2,
      mons_goblin_raiders: 2, gray_ogre: 2, goblin_hero: 2, hill_giant: 2,
      dark_ritual: 2, hand_of_death: 2, terror: 1, unholy_strength: 2, raise_dead: 1,
      volcanic_hammer: 2, lightning_bolt: 1, chain_lightning: 1,
    },
  },
};

export const DECKS = {
  // Tolarian Academy — practice
  practice: {
    name: 'Practice Deck',
    cards: {
      plains: 12, forest: 12,
      savannah_lions: 3, pikemen: 3, pearled_unicorn: 4, mesa_pegasus: 3, grizzly_bears: 4, scryb_sprites: 3,
      war_mammoth: 3, ironroot_treefolk: 3, wall_of_wood: 2, giant_growth: 3, healing_salve: 2, stream_of_life: 1, giant_spider: 2,
    },
  },

  // Forest Club
  elf_warband: {
    name: 'Elf Warband',
    cards: {
      forest: 24,
      llanowar_elves: 4, scryb_sprites: 4, shanodin_dryads: 4, grizzly_bears: 4, elvish_archers: 2, wall_of_wood: 2,
      giant_spider: 3, war_mammoth: 3, ironroot_treefolk: 2, giant_growth: 4, monstrous_growth: 2, fog: 2,
    },
  },
  big_wurms: {
    name: 'Big Wurms',
    cards: {
      forest: 25,
      llanowar_elves: 4, wall_of_wood: 3, grizzly_bears: 3, giant_spider: 3, war_mammoth: 3, ironroot_treefolk: 3,
      spined_wurm: 3, craw_wurm: 4, stream_of_life: 2, giant_growth: 3, monstrous_growth: 2, tranquility: 1, hurricane: 1,
    },
  },
  mana_ramp: {
    name: 'Mana Ramp Deck',
    cards: {
      forest: 22, taiga: 1, savannah: 1,
      birds_of_paradise: 4, llanowar_elves: 4, killer_bees: 3, elvish_archers: 2, grizzly_bears: 2, giant_spider: 2, erhnam_djinn: 4,
      craw_wurm: 3, force_of_nature: 2, spined_wurm: 1,
      giant_growth: 3, berserk: 2, hurricane: 1, desert_twister: 2, monstrous_growth: 1,
    },
  },

  // Mountain Club
  goblin_gang: {
    name: 'Goblin Gang',
    cards: {
      mountain: 23,
      raging_goblin: 4, mons_goblin_raiders: 4, goblin_balloon_brigade: 3, goblin_hero: 4, goblin_king: 2, gray_ogre: 3,
      hurloon_minotaur: 3, hill_giant: 3, lightning_bolt: 3, volcanic_hammer: 3, stone_rain: 2, lava_axe: 3,
    },
  },
  burn_baby_burn: {
    name: 'Burn Baby Burn',
    cards: {
      mountain: 24,
      raging_goblin: 3, mons_goblin_raiders: 3, orcish_artillery: 2, wall_of_stone: 2, hurloon_minotaur: 3,
      hill_giant: 2, lightning_bolt: 4, chain_lightning: 4, volcanic_hammer: 4, fireball: 3, lava_axe: 3, disintegrate: 2, shatter: 1,
    },
  },
  dragons_fire: {
    name: "Dragon's Fire",
    cards: {
      mountain: 22, badlands: 1, plateau: 1,
      mons_goblin_raiders: 3, uthden_troll: 3, hurloon_minotaur: 3, orcish_artillery: 2, dragon_whelp: 3, earth_elemental: 2,
      fire_elemental: 2, shivan_dragon: 2, ball_lightning: 2, wall_of_stone: 1,
      lightning_bolt: 4, chain_lightning: 2, fireball: 3, earthquake: 1, stone_rain: 2, disintegrate: 1,
    },
  },

  // Island Club
  merfolk_tide: {
    name: 'Merfolk Tide',
    cards: {
      island: 24,
      merfolk_of_the_pearl_trident: 4, lord_of_atlantis: 1, giant_tortoise: 3, flying_men: 3, storm_crow: 3, cloud_pirates: 3,
      phantom_monster: 2, water_elemental: 2, sea_serpent: 3, unsummon: 4, jump: 2, flight: 3, psionic_blast: 1, wall_of_air: 2,
    },
  },
  sky_patrol: {
    name: 'Sky Patrol',
    cards: {
      island: 24,
      flying_men: 4, storm_crow: 4, cloud_pirates: 3, wall_of_air: 2, phantom_monster: 3, air_elemental: 2, serendib_efreet: 1,
      unsummon: 3, counterspell: 1, jump: 2, flight: 2, psionic_blast: 1, giant_tortoise: 3, merfolk_of_the_pearl_trident: 3, water_elemental: 2,
    },
  },
  mind_games: {
    name: 'Mind Games',
    cards: {
      island: 22, tundra: 1, volcanic_island: 1,
      prodigal_sorcerer: 3, giant_tortoise: 3, merfolk_of_the_pearl_trident: 2, phantom_monster: 3, serendib_efreet: 2, air_elemental: 2, mahamoti_djinn: 2, wall_of_air: 2,
      counterspell: 2, mana_drain: 1, unsummon: 3, psionic_blast: 2, control_magic: 1, ancestral_recall: 1, braingeyser: 1, time_walk: 1, flight: 2, storm_crow: 3,
    },
  },

  // Plains Club
  holy_order: {
    name: 'Holy Order',
    cards: {
      plains: 23,
      savannah_lions: 4, tundra_wolves: 4, pikemen: 4, pearled_unicorn: 4, samite_healer: 2, moorish_cavalry: 3, ardent_militia: 3,
      crusade: 2, holy_strength: 3, healing_salve: 2, sacred_nectar: 2, swords_to_plowshares: 2, army_of_allah: 2,
    },
  },
  pegasus_wing: {
    name: 'Pegasus Wing',
    cards: {
      plains: 24,
      mesa_pegasus: 4, savannah_lions: 3, thunder_spirit: 2, wall_of_swords: 2, pearled_unicorn: 3, ardent_militia: 2, serra_angel: 2,
      samite_healer: 2, holy_strength: 3, righteousness: 2, swords_to_plowshares: 2, disenchant: 2, healing_salve: 2, tundra_wolves: 3, sacred_nectar: 2,
    },
  },
  knights_crusade: {
    name: "Knight's Crusade",
    cards: {
      plains: 22, savannah: 1, plateau: 1,
      savannah_lions: 3, white_knight: 3, tundra_wolves: 2, pearled_unicorn: 2, thunder_spirit: 2, northern_paladin: 2, moorish_cavalry: 3, serra_angel: 3,
      samite_healer: 1, crusade: 2, holy_strength: 2, swords_to_plowshares: 2, righteousness: 2, disenchant: 2, army_of_allah: 2, wrath_of_god: 1, moat: 1, healing_salve: 1,
    },
  },

  // Swamp Club
  graveyard_shift: {
    name: 'Graveyard Shift',
    cards: {
      swamp: 24,
      muck_rats: 4, drudge_skeletons: 4, scathe_zombies: 4, frozen_shade: 3, bog_rats: 3, bog_wraith: 3, will_o_the_wisp: 2,
      dark_ritual: 3, raise_dead: 3, unholy_strength: 3, hand_of_death: 2, terror: 2,
    },
  },
  night_terrors: {
    name: 'Night Terrors',
    cards: {
      swamp: 24,
      bog_imp: 4, hypnotic_specter: 3, bog_wraith: 3, frozen_shade: 2, scathe_zombies: 4, uncle_istvan: 2, nightmare: 2,
      dark_ritual: 3, terror: 3, hand_of_death: 3, sinkhole: 2, mind_twist: 1, unholy_strength: 2, raise_dead: 2,
    },
  },
  necromancy: {
    name: 'Necromancy',
    cards: {
      swamp: 22, bayou: 1, scrubland: 1,
      will_o_the_wisp: 2, drudge_skeletons: 2, black_knight: 3, royal_assassin: 2, hypnotic_specter: 4, sengir_vampire: 3, juzam_djinn: 2, nightmare: 2,
      dark_ritual: 4, terror: 4, sinkhole: 2, mind_twist: 1, demonic_tutor: 2, raise_dead: 1, hand_of_death: 2,
    },
  },

  // Artifact Club
  clockwork: {
    name: 'Clockwork',
    cards: {
      mountain: 12, plains: 11,
      ornithopter: 4, dragon_engine: 4, clay_statue: 4, obsianus_golem: 3, juggernaut: 2, rod_of_ruin: 2, flying_carpet: 1,
      pikemen: 3, gray_ogre: 3, hill_giant: 2, lightning_bolt: 2, healing_salve: 2, fellwar_stone: 3, shatter: 2,
    },
  },
  workshop: {
    name: "Mishra's Workshop",
    cards: {
      island: 11, mountain: 11, volcanic_island: 1, strip_mine: 1,
      ornithopter: 2, dragon_engine: 3, clay_statue: 3, juggernaut: 4, obsianus_golem: 2, sol_ring: 1, fellwar_stone: 1,
      icy_manipulator: 2, rod_of_ruin: 1, jayemdae_tome: 1, prodigal_sorcerer: 3, orcish_artillery: 2,
      counterspell: 3, lightning_bolt: 4, unsummon: 2, shatter: 1, air_elemental: 1,
    },
  },

  // Grand Arena
  urza: {
    name: 'Tolarian Order',
    cards: {
      plains: 9, island: 9, tundra: 3, strip_mine: 1, mox_pearl: 1, mox_sapphire: 1,
      sol_ring: 1, juggernaut: 3, icy_manipulator: 2, serra_angel: 3, mahamoti_djinn: 2, white_knight: 2, prodigal_sorcerer: 3,
      wall_of_air: 1, counterspell: 4, swords_to_plowshares: 4, wrath_of_god: 2, control_magic: 2, ancestral_recall: 1,
      time_walk: 1, disenchant: 2, jayemdae_tome: 1, phantom_monster: 1, air_elemental: 1,
    },
  },
  mishra: {
    name: 'Brothers War',
    cards: {
      swamp: 9, mountain: 9, badlands: 3, strip_mine: 1, mox_jet: 1, mox_ruby: 1,
      juzam_djinn: 3, ball_lightning: 2, juggernaut: 3, hypnotic_specter: 4, black_knight: 2, sengir_vampire: 3,
      orcish_artillery: 1, dark_ritual: 2, lightning_bolt: 4, chain_lightning: 2, terror: 3, fireball: 2,
      sinkhole: 2, demonic_tutor: 1, mind_twist: 1, royal_assassin: 1,
    },
  },
  bolas: {
    name: 'Elder Dragon',
    cards: {
      island: 6, swamp: 6, mountain: 6, underground_sea: 2, badlands: 2, volcanic_island: 2, city_of_brass: 1,
      shivan_dragon: 3, sengir_vampire: 3, mahamoti_djinn: 2, dragon_whelp: 2, royal_assassin: 2, prodigal_sorcerer: 2,
      lightning_bolt: 4, counterspell: 3, terror: 3, fireball: 2, control_magic: 2, psionic_blast: 2, dark_ritual: 2,
      demonic_tutor: 1, sol_ring: 1, mox_ruby: 1,
    },
  },

  // Rival — gets stronger each time you meet.
  rival_1: {
    name: 'Rival Deck',
    cards: {
      mountain: 12, island: 12,
      mons_goblin_raiders: 3, raging_goblin: 3, merfolk_of_the_pearl_trident: 3, storm_crow: 3, gray_ogre: 3, hurloon_minotaur: 2,
      phantom_monster: 2, hill_giant: 3, flying_men: 2, lightning_bolt: 2, volcanic_hammer: 2, unsummon: 3, jump: 1, lava_axe: 2, giant_tortoise: 2,
    },
  },
  rival_2: {
    name: 'Rival Deck II',
    cards: {
      mountain: 11, island: 11, volcanic_island: 2,
      raging_goblin: 3, prodigal_sorcerer: 3, goblin_balloon_brigade: 2, storm_crow: 3, hurloon_minotaur: 3, phantom_monster: 3,
      dragon_whelp: 2, air_elemental: 2, fire_elemental: 1, lightning_bolt: 4, chain_lightning: 2, counterspell: 2, unsummon: 3, fireball: 2, psionic_blast: 1,
    },
  },
  rival_3: {
    name: 'Rival Deck III',
    cards: {
      mountain: 10, island: 10, volcanic_island: 3, city_of_brass: 1,
      prodigal_sorcerer: 3, orcish_artillery: 2, phantom_monster: 2, serendib_efreet: 3, dragon_whelp: 2, air_elemental: 2, mahamoti_djinn: 2,
      shivan_dragon: 2, ball_lightning: 2, lightning_bolt: 4, chain_lightning: 3, counterspell: 4, mana_drain: 1, fireball: 2,
      control_magic: 1, sol_ring: 1,
    },
  },
};

export function expandDeck(cards) {
  const out = [];
  for (const [id, n] of Object.entries(cards)) for (let i = 0; i < n; i++) out.push(id);
  return out;
}

export function deckSize(cards) {
  return Object.values(cards).reduce((a, b) => a + b, 0);
}
