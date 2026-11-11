// Booster packs. Basic lands are free and unlimited in the deck builder, so
// packs never contain them.

import { CARDS } from './cards.js';

export const PACKS = {
  LEA: { name: 'LIMITED EDITION', short: 'LIMITED', price: 120, color: '#d01818', blurb: 'THE ORIGINAL SET. EVERY COLOR, DUAL LANDS, AND THE MOST RARES.', sample: ['serra_angel', 'shivan_dragon', 'counterspell'] },
  ARN: { name: 'ARABIAN NIGHTS', short: 'ARABIAN', price: 100, color: '#a05010', blurb: 'DESERT DJINN, EFREET AND CITY OF BRASS. SMALL SET, MIXED WITH LIMITED.', sample: ['erhnam_djinn', 'serendib_efreet', 'city_of_brass'] },
  ATQ: { name: 'ANTIQUITIES', short: 'ANTIQ.', price: 100, color: '#606060', blurb: 'ARTIFACTS FOR ANY DECK: GOLEMS, TOMES AND STRIP MINE. MIXED WITH LIMITED.', sample: ['juggernaut', 'strip_mine', 'ornithopter'] },
  LEG: { name: 'LEGENDS', short: 'LEGENDS', price: 100, color: '#7030a0', blurb: 'BLUE TRICKS AND BIG FLYERS, PLUS MOAT AND MANA DRAIN. MIXED WITH LIMITED.', sample: ['mana_drain', 'moat', 'chain_lightning'] },
  DRK: { name: 'THE DARK', short: 'THE DARK', price: 100, color: '#303050', blurb: 'BLACK AND RED: SPECTERS, BALL LIGHTNING AND BOG RATS. MIXED WITH LIMITED.', sample: ['ball_lightning', 'hypnotic_specter', 'uncle_istvan'] },
  POR: { name: 'PORTAL', short: 'PORTAL', price: 80, color: '#2070c0', blurb: 'SIMPLE CREATURES AND SORCERIES FOR BEGINNERS. CHEAP AND SOLID.', sample: ['raging_goblin', 'volcanic_hammer', 'storm_crow'] },
};

function pool(set, rarity) {
  return Object.values(CARDS).filter((d) => d.set === set && d.rarity === rarity && !d.basic);
}

function pick(list, rnd) {
  return list[Math.floor(rnd() * list.length)];
}

// 8 cards: 1 rare, 2 uncommons, 5 commons. Small expansions borrow from
// Limited Edition to fill their slots.
export function openPack(set, rnd = Math.random) {
  const out = [];
  const slot = (rarity, preferSet) => {
    let list = pool(preferSet, rarity);
    if (!list.length) list = pool('LEA', rarity);
    out.push(pick(list, rnd).id);
  };
  const mixed = set !== 'LEA';
  // the rare slot is occasionally upgraded... or downgraded, like real packs
  const r = rnd();
  slot(r < 0.75 ? 'R' : 'U', set);
  slot('U', set);
  slot('U', mixed && rnd() < 0.4 ? 'LEA' : set);
  for (let i = 0; i < 5; i++) slot('C', mixed && i >= 3 ? 'LEA' : set);
  return out;
}

export function setCards(set) {
  return Object.values(CARDS).filter((d) => d.set === set && !d.basic);
}
