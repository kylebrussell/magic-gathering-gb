// Turns engine events into the short sentences shown in the duel text box,
// in the style of the video ("ADVENTURER PLAYS A LAND (MOUNTAIN).").

import { cardDef } from './game.js';

const STEP_NAMES = {
  upkeep: 'BEGINNING PHASE.',
  main1: 'MAIN PHASE 1.',
  attackers: 'COMBAT PHASE.',
  main2: 'MAIN PHASE 2.',
  end: 'ENDING PHASE.',
};

export function cardName(g, iid) {
  return cardDef(g.cards[iid].id).name.toUpperCase();
}

export function targetName(g, t) {
  if (!t) return '';
  if (t.p !== undefined) return g.players[t.p].name.toUpperCase();
  if (t.s !== undefined) {
    const item = g.stack.find((s) => s.id === t.s);
    return item ? cardName(g, item.src) : 'A SPELL';
  }
  return cardName(g, t.c);
}

// Returns text for an event, or null if the event isn't narrated.
export function narrate(g, ev) {
  const P = (p) => g.players[p].name.toUpperCase();
  switch (ev.t) {
    case 'turn':
      return `${P(ev.p)}'S TURN.`;
    case 'draw':
      return null; // batched by the duel screen ("DRAWS 1 CARD.")
    case 'playLand':
      return `${P(ev.p)} PLAYS A LAND (${cardName(g, ev.iid)}).`;
    case 'cast': {
      const name = cardName(g, ev.iid);
      if (ev.targets && ev.targets.length) return `${P(ev.p)} CASTS ${name} ON ${targetName(g, ev.targets[0])}.`;
      return `${P(ev.p)} CASTS ${name}${ev.x ? ` (X=${ev.x})` : ''}.`;
    }
    case 'activate': {
      const name = cardName(g, ev.iid);
      const def = cardDef(g.cards[ev.iid].id);
      const ab = def.abilities?.[ev.index];
      if (ab?.manaAbility) return null;
      if (ev.targets && ev.targets.length) return `${P(ev.p)} USES ${name} ON ${targetName(g, ev.targets[0])}.`;
      return `${P(ev.p)} USES ${name}.`;
    }
    case 'damage':
      if (ev.combat) return null;
      return `${ev.src != null ? cardName(g, ev.src) : 'IT'} DEALS ${ev.amount} DAMAGE TO ${targetName(g, ev.target)}.`;
    case 'prevent':
      return `DAMAGE TO ${targetName(g, ev.target)} WAS PREVENTED.`;
    case 'destroy':
    case 'dies':
      return `${cardName(g, ev.iid)} WAS DESTROYED.`;
    case 'sacrifice':
      return `${cardName(g, ev.iid)} WAS SACRIFICED.`;
    case 'exile':
      return `${cardName(g, ev.iid)} WAS EXILED.`;
    case 'bounce':
      return `${cardName(g, ev.iid)} RETURNED TO HAND.`;
    case 'regenerate':
      return `${cardName(g, ev.iid)} REGENERATED!`;
    case 'countered':
      return `${cardName(g, ev.src)} WAS COUNTERED.`;
    case 'fizzle':
      return `${cardName(g, ev.iid)} HAS NO LEGAL TARGET.`;
    case 'life':
      return ev.delta > 0 ? `${P(ev.p)} GAINS ${ev.delta} LIFE.` : `${P(ev.p)} LOSES ${-ev.delta} LIFE.`;
    case 'discard':
      return `${P(ev.p)} DISCARDS ${cardName(g, ev.iid)}.`;
    case 'mill':
      return `${P(ev.p)} MILLS ${ev.n} CARDS.`;
    case 'tutor':
      return `${P(ev.p)} SEARCHES THEIR LIBRARY.`;
    case 'extraTurn':
      return `${P(ev.p)} WILL TAKE AN EXTRA TURN!`;
    case 'control':
      return `${P(ev.p)} GAINS CONTROL OF ${cardName(g, ev.iid)}.`;
    case 'fog':
      return 'ALL COMBAT DAMAGE WAS PREVENTED.';
    case 'mulligan':
      return `${P(ev.p)} TAKES A MULLIGAN (${ev.size} CARDS).`;
    case 'keep':
      return `${P(ev.p)} KEEPS ${ev.size} CARDS.`;
    case 'emptyDraw':
      return `${P(ev.p)} HAS NO CARDS LEFT TO DRAW!`;
    case 'mana':
      return null;
    case 'step':
      return STEP_NAMES[ev.step] || null;
    case 'gameOver':
      return null;
    default:
      return null;
  }
}

export function stepLabel(step) {
  return STEP_NAMES[step] || '';
}
