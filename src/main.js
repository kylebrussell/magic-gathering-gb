import { App } from './core.js';
import './engine/index.js';
import { initAudio } from './audio.js';
import { DECKS, STARTERS, expandDeck } from './data/decks.js';
import { DuelScene } from './scenes/duel.js';

const canvas = document.getElementById('screen');
const device = document.getElementById('device');
const app = new App(canvas);
window.app = app;

// Integer-scale the screen to fit the window.
function fit() {
  const small = window.innerWidth <= 560;
  const reserveH = small ? 230 : 300;
  const reserveW = small ? 40 : 160;
  const s = Math.max(1, Math.min(Math.floor((window.innerWidth - reserveW) / 160), Math.floor((window.innerHeight - reserveH) / 144)));
  device.style.setProperty('--scale', String(Math.min(s, 5)));
}
window.addEventListener('resize', fit);
fit();

// On-screen buttons.
for (const el of document.querySelectorAll('[data-b]')) {
  const b = el.dataset.b;
  const on = (e) => {
    e.preventDefault();
    initAudio();
    el.classList.add('on');
    app.input.setVirtual(b, true);
  };
  const off = () => {
    el.classList.remove('on');
    app.input.setVirtual(b, false);
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
window.addEventListener('keydown', initAudio);
window.addEventListener('pointerdown', initAudio);

app.start();

const params = new URLSearchParams(location.search);

async function quickDuel() {
  if (params.has('auto')) app.speed = Number(params.get('auto')) || 4;
  const all = { ...STARTERS, ...DECKS };
  const keys = Object.keys(all);
  const pickDeck = (k) => (k === 'random' ? all[keys[Math.floor(Math.random() * keys.length)]] : all[k]);
  const first = params.has('first') ? Number(params.get('first')) : undefined;
  for (;;) {
    const mine = pickDeck(params.get('deck') || 'mountain_rage');
    const theirs = pickDeck(params.get('duel')) || DECKS.mana_ramp;
    await app.run(
      new DuelScene({
        seed: params.get('seed') ? Number(params.get('seed')) : undefined,
        skipIntro: params.has('fast'),
        autoHuman: params.has('auto'),
        setup: params.get('setup') || null,
        first,
        textSpeed: params.has('auto') ? 99 : 2,
        player: { name: 'Adventurer', portrait: 'adventurer', deck: expandDeck(mine.cards) },
        opponent: { name: 'Nissa', fullName: 'Nissa Revane', portrait: 'nissa', deckName: theirs.name, deck: expandDeck(theirs.cards), skill: 0.9 },
      }),
    );
  }
}

async function boot() {
  if (params.get('duel')) return quickDuel();
  const { runGame } = await import('./game.js');
  return runGame(app);
}

boot().catch((e) => {
  console.error(e);
  const ctx = app.ctx;
  ctx.fillStyle = '#e0d8b8';
  ctx.fillRect(0, 0, 160, 144);
  ctx.fillStyle = '#000';
  ctx.font = '8px monospace';
  ctx.fillText('ERROR: ' + e.message, 4, 70);
});
