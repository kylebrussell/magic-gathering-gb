// Save data (localStorage). One slot, like a cartridge battery save.

import { CARDS } from './data/cards.js';
import { expandDeck } from './data/decks.js';

const KEY = 'mtg-gb-save-v1';

export function newSave(name) {
  return {
    version: 1,
    name: name || 'ADVENTURER',
    collection: {}, // non-basic card id -> count owned
    decks: [],
    activeDeck: 0,
    medals: [],
    beaten: {},
    gold: 100,
    flags: {},
    location: 'academy',
    stats: { wins: 0, losses: 0, packs: 0 },
    settings: { music: true, sfx: true, textSpeed: 2, quickDuels: false },
    recent: {}, // card ids received since the deck editor was last used
    started: Date.now(),
    playTime: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return null;
    if (!s.recent) s.recent = {};
    if (s.settings.quickDuels === undefined) s.settings.quickDuels = false;
    // drop unknown cards (database changes)
    for (const id of Object.keys(s.collection)) if (!CARDS[id]) delete s.collection[id];
    for (const d of s.decks) for (const id of Object.keys(d.cards)) if (!CARDS[id]) delete d.cards[id];
    return s;
  } catch {
    return null;
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function eraseSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function addCards(save, ids) {
  const fresh = [];
  for (const id of ids) {
    if (CARDS[id].basic) continue;
    if (!save.collection[id]) fresh.push(id);
    save.collection[id] = (save.collection[id] || 0) + 1;
    if (save.recent) save.recent[id] = true;
  }
  return fresh;
}

export function owned(save, id) {
  if (CARDS[id].basic) return Infinity;
  return save.collection[id] || 0;
}

export function deckCount(cards) {
  return Object.values(cards).reduce((a, b) => a + b, 0);
}

export function activeDeckList(save) {
  const d = save.decks[save.activeDeck] || save.decks[0];
  return d ? expandDeck(d.cards) : [];
}

// Is the deck legal? Returns null or a message.
export function deckProblem(save, cards) {
  const n = deckCount(cards);
  if (n !== 60) return `A DECK NEEDS EXACTLY 60 CARDS. (${n})`;
  for (const [id, c] of Object.entries(cards)) {
    if (!CARDS[id].basic && c > 4) return `NO MORE THAN 4 OF ${CARDS[id].name.toUpperCase()}.`;
    if (c > owned(save, id)) return `YOU ONLY OWN ${owned(save, id)} ${CARDS[id].name.toUpperCase()}.`;
  }
  return null;
}
