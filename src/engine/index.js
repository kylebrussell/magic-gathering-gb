// Engine entry point: wires the card database into the rules engine.
import { setCardDB } from './game.js';
import { CARDS } from '../data/cards.js';

setCardDB(CARDS);

export * from './game.js';
export { CARDS } from '../data/cards.js';
