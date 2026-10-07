# Magic: The Gathering GB

A playable Game Boy Color–style *Magic: The Gathering* adventure, built from the concept video
["What if there was a Magic: The Gathering Game Boy game?"](https://www.youtube.com/watch?v=_LNjREjnUwQ)
(dBXY collective, originally posted to r/magicTCG) and structured like *Pokémon Trading Card Game* for the Game Boy.

It runs in the browser at the Game Boy's native 160×144 resolution, has no dependencies, and needs no build step.

## Play

```bash
npm run dev
```

Then open <http://localhost:8080>.

| Button | Keyboard | Use |
| --- | --- | --- |
| D-pad | Arrow keys / WASD | Move, choose |
| A | Z, J or Space | OK, talk, cast |
| B | X, K, Esc or Backspace | Back, cancel |
| START | Enter | Menu |
| SELECT | Shift or Tab | Card info (deck builder) |

Gamepads work, and the on-screen buttons work with mouse or touch.

## The game

- **Duels follow the video**: opponent intro, versus screen, deck cut, dice roll for who plays first, drawing 7, mulligans, the board with its stat columns and d20 life counters, the hand list with art preview, card check screens, "YOUR TURN" banners, the phase strip, pop-up cards for each play, the Pokémon-style spell screen, and the VICTORY / DEFEAT result.
- **Real Magic rules** (early-era): the stack and priority, instants in response, combat with first strike, trample, flying/reach, landwalk, protection, regeneration, auras, Control Magic, X spells, upkeep and end-step triggers, discarding to seven, and decking.
- **About 158 cards** from Limited Edition, Arabian Nights, Antiquities, Legends, The Dark and Portal, each with procedurally drawn four-color pixel art.
- **An island to explore**: Tolarian Academy, six color clubs (Forest, Mountain, Island, Plains, Swamp, Artifact) with members and a master, a Card Shop, and the Planeswalker Summit with three Grand Masters and your rival.
- **Progression**: pick a starter deck, win booster packs and gold, earn the six club medals, and build up to 3 decks (60 cards, at most 4 copies, basic lands free). The game saves to the browser's local storage.
- A tutorial in the first practice duel, a How to Play guide on the START menu, and chiptune music and sound effects.

## Project layout

```
index.html, style.css   handheld shell around the canvas
src/engine/             rules engine (pure data, runs in Node), AI, narration
src/data/               cards, decks, booster sets, world/NPCs
src/gfx/                palette, pixel font, sprites, procedural card art, portraits, tiles
src/scenes/             duel, board, card screens, title, overworld, menus
src/game.js             progression: conversations, duels, rewards, saving
src/core.js, ui.js      60 Hz loop, input, async scene stack, text box and menus
test/                   rules, AI and world tests (node --test)
tools/                  simulators and the headless playtest harness
```

## Development

```bash
npm test                              # rules, AI and world tests
npm run sim -- 200                    # 200 AI-vs-AI games across all decks
node tools/balance.mjs 10             # starter decks vs every opponent
node tools/watch.mjs mountain_rage mana_ramp 7   # narrate one AI game
node tools/harness.mjs                # headless Chrome + HTTP control API
```

Debug URLs: `?duel=<deck>&deck=<deck>&fast=1` starts a quick duel, `&auto=6` lets the AI play both sides at 6× speed, and `&setup=hand:fireball;bf:mountain*5;opp:grizzly_bears` sets up a board.

## Credits

This is an unofficial, non-commercial fan project. *Magic: The Gathering* and its card names are trademarks of Wizards of the Coast. Card art, portraits, music and code here are original. The idea and the duel UI come from the dBXY collective's concept video, and the game's structure from *Pokémon Trading Card Game* (Hudson Soft / Nintendo, 1998).
