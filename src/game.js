// Game controller: title → new game / continue → world loop. Handles
// conversations, duels, rewards and saving.

import { TitleScene } from './scenes/title.js';
import { MapScene, RoomScene } from './scenes/overworld.js';
import { DuelScene } from './scenes/duel.js';
import { StartMenu, StatusScene, HelpScene, OptionsScene, NameEntry, BoosterScene, MedalScene, ShopScene, StarterScene, DeckSlots, AlbumScene, CreditsScene } from './scenes/menus.js';
import { newSave, loadSave, writeSave, hasSave, eraseSave, addCards, activeDeckList, deckProblem } from './save.js';
import { DECKS, STARTERS, expandDeck } from './data/decks.js';
import { NPCS, LOCATIONS } from './data/world.js';
import { CARDS } from './data/cards.js';
import { C } from './gfx/palette.js';
import { fill, popupCard, typeLabel } from './gfx/draw.js';
import { cardArt } from './gfx/art.js';
import { TextBox } from './ui.js';
import { audioSettings, playMusic, sfx } from './audio.js';

class GiftScene {
  constructor(ids, from) {
    this.ids = ids;
    this.from = from;
  }
  async run(app) {
    this.box = new TextBox(app);
    for (const id of this.ids) {
      this.card = CARDS[id];
      sfx('coin');
      await this.box.say(`YOU RECEIVED ${this.card.name.toUpperCase()}!`, { wait: true });
    }
  }
  draw(ctx) {
    fill(ctx, C.bg);
    if (this.card) popupCard(ctx, 80, 48, typeLabel(this.card), cardArt(this.card));
    this.box.draw(ctx);
  }
}

export class Game {
  constructor(app, save) {
    this.app = app;
    this.save = save;
    audioSettings({ music: save.settings.music, sfx: save.settings.sfx });
    this.tick = () => {
      this.save.playTime = (this.save.playTime || 0) + 1 / 60;
    };
    app.listeners.push(this.tick);
  }

  dispose() {
    const i = this.app.listeners.indexOf(this.tick);
    if (i >= 0) this.app.listeners.splice(i, 1);
  }

  persist() {
    writeSave(this.save);
  }

  async play() {
    const s = this.save;
    if (s.inRoom === undefined) s.inRoom = true;
    for (;;) {
      if (s.inRoom) {
        const r = await this.app.run(new RoomScene(this, s.location));
        if (r === 'title') return 'title';
        s.inRoom = false;
        s.mapNode = s.location;
      } else {
        const node = await this.app.run(new MapScene(this));
        if (node === 'title') return 'title';
        s.location = node;
        s.inRoom = true;
      }
      this.persist();
    }
  }

  // ---------------------------------------------------------------- scripts
  async onEnterRoom(room) {
    const s = this.save;
    if (room.locId === 'academy' && !s.flags.intro) {
      const barrin = room.npcs.find((n) => n.id === 'barrin');
      await room.say(
        [
          `WELCOME TO TOLARIAN ACADEMY, ${s.name}!`,
          "I'M BARRIN, MASTER WIZARD OF THIS ACADEMY.",
          'ON THIS ISLAND, DUELISTS BATTLE WITH MAGIC CARDS. SIX CLUB MASTERS EACH GUARD A MEDAL.',
          'COLLECT ALL SIX, AND YOU MAY CHALLENGE THE GRAND MASTERS AT THE PLANESWALKER SUMMIT.',
          'BUT FIRST, YOU NEED A DECK. LET ME GIVE YOU ONE.',
        ],
        barrin,
      );
      await this.chooseStarter(room, barrin);
      s.flags.intro = true;
      this.persist();
    }
  }

  async chooseStarter(room, npc) {
    const s = this.save;
    if (s.flags.starter) return;
    const key = await this.app.run(new StarterScene());
    const deck = STARTERS[key];
    addCards(s, expandDeck(deck.cards));
    s.decks = [{ name: deck.name.toUpperCase(), cards: { ...deck.cards } }];
    s.activeDeck = 0;
    s.flags.starter = key;
    playMusic('club');
    await room.say(
      [
        `YOU RECEIVED THE ${deck.name.toUpperCase()} DECK!`,
        'JHOIRA, MY APPRENTICE, WILL GIVE YOU A PRACTICE DUEL. TALK TO HER.',
        'PRESS START ANY TIME TO EDIT YOUR DECKS, VIEW YOUR ALBUM OR SAVE.',
        'WHEN YOU ARE READY, LEAVE BY THE DOOR TO EXPLORE THE ISLAND. GOOD LUCK!',
      ],
      npc,
    );
    this.persist();
  }

  // ---------------------------------------------------------------- menus
  async startMenu(scene) {
    const app = this.app;
    for (;;) {
      const pick = await app.run(new StartMenu(['DECKS', 'ALBUM', 'STATUS', 'HELP', 'OPTIONS', 'SAVE', 'TITLE']));
      if (!pick) return null;
      if (pick === 'DECKS') await app.run(new DeckSlots(this.save));
      else if (pick === 'ALBUM') await app.run(new AlbumScene(this.save));
      else if (pick === 'STATUS') await app.run(new StatusScene(this.save));
      else if (pick === 'HELP') await app.run(new HelpScene());
      else if (pick === 'OPTIONS') await app.run(new OptionsScene(this.save));
      else if (pick === 'SAVE') {
        this.persist();
        sfx('coin');
        if (scene.box) await scene.box.say('GAME SAVED.', { hold: 40 });
        return null;
      } else if (pick === 'TITLE') {
        if (scene.box) {
          const i = await scene.box.choose(['YES', 'NO'], { cols: 2, prompt: 'SAVE AND RETURN TO TITLE?', start: 1 });
          scene.box.clear();
          if (i !== 0) continue;
        }
        this.persist();
        await app.fadeOut(12);
        return 'title';
      }
    }
  }

  async deckMenu() {
    await this.app.run(new DeckSlots(this.save));
  }

  // ---------------------------------------------------------------- conversations
  async talk(room, npc) {
    const app = this.app;
    const s = this.save;
    const d = npc.def;
    if (d.talk) {
      const t = d.talk(s);
      if (t.script === 'chooseStarter') return this.chooseStarter(room, npc);
      if (t.script === 'shop') {
        await app.run(new ShopScene(s));
        return;
      }
      return room.say(t.lines, npc);
    }
    if (d.requires) {
      const msg = d.requires(s);
      if (msg) return room.say([msg], npc);
    }
    const first = !s.beaten[npc.id];
    if (first) await room.say(d.intro, npc);
    const ok = await room.ask(first ? 'ACCEPT THE DUEL?' : 'A REMATCH? DUEL AGAIN?', npc);
    if (ok !== 0) return room.say(['COME BACK WHEN YOU ARE READY.'], npc);
    const problem = deckProblem(s, (s.decks[s.activeDeck] || { cards: {} }).cards);
    if (problem) return room.say(["YOUR DECK ISN'T READY.", problem, 'PRESS START AND CHOOSE DECKS TO FIX IT.'], null);
    const result = await this.duel(npc);
    playMusic(LOCATIONS[room.locId].music || 'club');
    await app.fadeIn(12);
    if (result.won) {
      await room.say(d.win, npc);
      await this.reward(room, npc, first);
    } else {
      s.stats.losses++;
      await room.say(d.lose, npc);
      if (d.grand && !s.flags.champion) s.flags.grand = 0;
    }
    this.persist();
  }

  async duel(npc) {
    const s = this.save;
    const d = npc.def;
    await this.app.fadeOut(12);
    const res = await this.app.run(
      new DuelScene({
        player: { name: s.name, portrait: 'adventurer', deck: activeDeckList(s) },
        opponent: {
          name: d.name,
          fullName: d.fullName || d.name,
          portrait: d.portrait,
          deckName: d.deckName,
          deck: expandDeck(DECKS[d.deck].cards),
          skill: d.skill,
          music: d.music,
        },
        textSpeed: s.settings.textSpeed,
        tutorial: npc.id === 'jhoira' && !s.beaten.jhoira,
      }),
    );
    return res;
  }

  async reward(room, npc, first) {
    const app = this.app;
    const s = this.save;
    const d = npc.def;
    s.stats.wins++;
    s.beaten[npc.id] = (s.beaten[npc.id] || 0) + 1;
    const prize = first ? d.prize : d.rematch || { packs: d.prize.packs.slice(0, 1), gold: Math.round((d.prize.gold || 30) / 3) };
    if (prize.gold) {
      s.gold += prize.gold;
      sfx('coin');
      await room.say([`YOU RECEIVED ${prize.gold} GOLD!`], null);
    }
    if (first && d.medal && !s.medals.includes(d.medal)) {
      s.medals.push(d.medal);
      await app.fadeOut(8);
      await app.run(new MedalScene(d.medal));
    }
    if (first && prize.cards) {
      addCards(s, prize.cards);
      await app.run(new GiftScene(prize.cards));
    }
    if (prize.packs && prize.packs.length) await app.run(new BoosterScene(s, prize.packs));
    playMusic(LOCATIONS[room.locId].music || 'club');
    if (d.grand) {
      s.flags.grand = Math.max(s.flags.grand || 0, d.grand);
      if (d.grand === 4 && !s.flags.champion) {
        s.flags.champion = true;
        s.flags.grand = 3;
        this.persist();
        await app.fadeOut(16);
        await app.run(new CreditsScene(s.name));
        playMusic('boss');
      }
    }
    if (s.medals.length === 6 && !s.flags.sixMedals) {
      s.flags.sixMedals = true;
      await room.say(['YOU HAVE ALL SIX MEDALS!', 'THE GATE TO THE PLANESWALKER SUMMIT IS NOW OPEN.'], null);
    }
    this.persist();
    room.refreshNpcs();
    await app.fadeIn(8);
  }
}

export async function runGame(app) {
  for (;;) {
    const choice = await app.run(new TitleScene(hasSave()));
    let save = choice === 'continue' ? loadSave() : null;
    if (!save) {
      eraseSave();
      save = newSave();
      const name = await app.run(new NameEntry('WHAT IS YOUR NAME?', 'ADVENTURER'));
      save.name = name.toUpperCase();
      save.location = 'academy';
      save.inRoom = true;
      await app.fadeOut(12);
    }
    const game = new Game(app, save);
    try {
      await game.play();
    } finally {
      game.dispose();
    }
  }
}
