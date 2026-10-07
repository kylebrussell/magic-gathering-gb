// World map and walkable rooms.

import { C } from '../gfx/palette.js';
import { fill, frame } from '../gfx/draw.js';
import { drawText, drawTextCenter } from '../gfx/font.js';
import { charSprite, tile, building, SOLID } from '../gfx/tiles.js';
import { portrait } from '../gfx/portraits.js';
import { icon, medalSprite } from '../gfx/sprites.js';
import { LOCATIONS, PATHS, NPCS, CLUB_COLORS, MEDALS, SPR, npcsIn } from '../data/world.js';
import { TextBox } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { rng } from '../gfx/art.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------------------------------------------------------------------------
// World map

let mapCanvas = null;

function islandRadius(a) {
  return 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2) + 0.03 * Math.sin(a * 13);
}

function drawMapBackground() {
  if (mapCanvas) return mapCanvas;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 144;
  const x = c.getContext('2d');
  const r = rng('dominaria');
  // sea
  for (let y = 0; y < 144; y++) {
    for (let i = 0; i < 160; i++) {
      x.fillStyle = (i + y) % 4 === 0 || (i * 3 + y * 5) % 17 === 0 ? '#3080d0' : '#2068b8';
      x.fillRect(i, y, 1, 1);
    }
  }
  for (let k = 0; k < 40; k++) {
    const wx = Math.floor(r() * 156);
    const wy = Math.floor(r() * 140);
    x.fillStyle = '#a0d0f8';
    x.fillRect(wx, wy, 3, 1);
    x.fillRect(wx + 1, wy - 1, 1, 1);
  }
  // island
  const cx = 80;
  const cy = 60;
  const inside = (px, py, shrink = 0) => {
    const dx = (px - cx) / (72 - shrink);
    const dy = (py - cy) / (54 - shrink);
    const a = Math.atan2(dy, dx);
    return dx * dx + dy * dy < islandRadius(a) ** 2;
  };
  for (let y = 0; y < 144; y++) {
    for (let i = 0; i < 160; i++) {
      if (!inside(i, y)) continue;
      const coast = !inside(i, y, 3);
      let col = coast ? '#f0d890' : (i + y) % 2 ? '#58b040' : '#50a838';
      // regions
      if (!coast) {
        const near = (ex, ey, rx, ry) => ((i - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 + 0.15 * Math.sin(i * 0.7 + y * 0.5) < 1;
        if (near(32, 26, 30, 20)) col = (i + y) % 2 ? '#c8c050' : '#d0c858'; // plains
        if (near(136, 64, 24, 22)) col = (i + y) % 3 ? '#486040' : '#405838'; // swamp
        if (near(126, 100, 28, 16)) col = (i + y) % 2 ? '#a0a088' : '#989880'; // wastes
      }
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
  // small islet for the island club
  x.fillStyle = '#f0d890';
  x.beginPath();
  x.ellipse(24, 108, 16, 10, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#58b040';
  x.beginPath();
  x.ellipse(24, 108, 13, 7, 0, 0, Math.PI * 2);
  x.fill();
  // forest trees
  const tree = (tx, ty) => {
    x.fillStyle = '#103810';
    x.fillRect(tx + 1, ty, 3, 1);
    x.fillRect(tx, ty + 1, 5, 3);
    x.fillStyle = '#207828';
    x.fillRect(tx + 1, ty + 1, 3, 2);
    x.fillStyle = '#603818';
    x.fillRect(tx + 2, ty + 4, 1, 2);
  };
  for (let k = 0; k < 26; k++) tree(8 + r() * 34, 46 + r() * 32);
  // mountains
  const peak = (px, py, h, snow) => {
    x.fillStyle = '#583820';
    x.beginPath();
    x.moveTo(px - h, py);
    x.lineTo(px, py - h);
    x.lineTo(px + h, py);
    x.fill();
    x.fillStyle = '#987050';
    x.beginPath();
    x.moveTo(px - h + 2, py);
    x.lineTo(px, py - h + 1);
    x.lineTo(px, py);
    x.fill();
    if (snow) {
      x.fillStyle = '#f8f8f8';
      x.beginPath();
      x.moveTo(px - 3, py - h + 3);
      x.lineTo(px, py - h);
      x.lineTo(px + 3, py - h + 3);
      x.fill();
    }
  };
  for (const [px, py, h] of [[112, 30, 9], [146, 30, 7], [118, 42, 7], [142, 42, 6], [104, 18, 6]]) peak(px, py, h, false);
  peak(80, 34, 14, true);
  peak(66, 36, 9, true);
  peak(94, 36, 9, true);
  // swamp pools
  for (let k = 0; k < 10; k++) {
    x.fillStyle = '#284838';
    x.fillRect(118 + r() * 30, 52 + r() * 26, 4, 2);
  }
  // paths
  for (const [a, b] of PATHS) {
    const [ax, ay] = LOCATIONS[a].map;
    const [bx, by] = LOCATIONS[b].map;
    const steps = Math.hypot(bx - ax, by - ay) / 3;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const px = Math.round(ax + (bx - ax) * t);
      const py = Math.round(ay + (by - ay) * t);
      x.fillStyle = '#f8e8b8';
      x.fillRect(px, py, 2, 2);
      x.fillStyle = '#a08050';
      x.fillRect(px + 1, py + 1, 1, 1);
    }
  }
  mapCanvas = c;
  return c;
}

function neighbors(node) {
  const out = [];
  for (const [a, b] of PATHS) {
    if (a === node) out.push(b);
    if (b === node) out.push(a);
  }
  return out;
}

export class MapScene {
  constructor(game) {
    this.manualFade = true;
    this.game = game;
    this.save = game.save;
    this.node = this.save.mapNode || 'academy';
    this.pos = [...LOCATIONS[this.node].map];
    this.walking = false;
    this.dir = 'down';
    this.frameN = 0;
  }

  async run(app) {
    this.app = app;
    this.box = new TextBox(app);
    playMusic('map');
    await app.fadeIn(12);
    // ignore a direction still held from walking out of a room
    while (['up', 'down', 'left', 'right'].some((b) => app.input.isDown(b))) await app.frame();
    for (;;) {
      const b = await app.press(['up', 'down', 'left', 'right', 'a', 'start', 'select']);
      if (b === 'a') {
        sfx('door');
        this.save.mapNode = this.node;
        await app.fadeOut(12);
        return this.node;
      }
      if (b === 'start' || b === 'select') {
        const r = await this.game.startMenu(this);
        if (r === 'title') return 'title';
        continue;
      }
      const [dx, dy] = DIRS[b];
      let best = null;
      let bestDot = 0.45;
      const [x0, y0] = LOCATIONS[this.node].map;
      for (const n of neighbors(this.node)) {
        const [x1, y1] = LOCATIONS[n].map;
        const len = Math.hypot(x1 - x0, y1 - y0);
        const dot = ((x1 - x0) * dx + (y1 - y0) * dy) / len;
        if (dot > bestDot) {
          bestDot = dot;
          best = n;
        }
      }
      if (!best) continue;
      this.dir = b;
      await this.walkTo(best);
    }
  }

  async walkTo(n) {
    const [x0, y0] = LOCATIONS[this.node].map;
    const [x1, y1] = LOCATIONS[n].map;
    const steps = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0) / 1.5));
    this.walking = true;
    this.dir = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? (x1 > x0 ? 'right' : 'left') : y1 > y0 ? 'down' : 'up';
    for (let i = 1; i <= steps; i++) {
      this.pos = [x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps];
      this.frameN = Math.floor(i / 4) % 4;
      if (i % 8 === 0) sfx('step');
      await this.app.frame();
    }
    this.node = n;
    this.save.mapNode = n;
    this.walking = false;
    this.frameN = 0;
  }

  draw(ctx, app) {
    ctx.drawImage(drawMapBackground(), 0, 0);
    for (const [id, loc] of Object.entries(LOCATIONS)) {
      const [x, y] = loc.map;
      const color = CLUB_COLORS[id].banner;
      ctx.drawImage(building(color, id === 'summit' ? 'summit' : id === 'shop' ? 'shop' : 'club'), x - 8, y - 12);
      if (loc.medal && this.save.medals.includes(loc.medal)) {
        const m = MEDALS.find((mm) => mm.id === loc.medal);
        ctx.drawImage(medalSprite(m.color, m.id), 0, 0, 24, 28, x + 3, y - 18, 12, 14);
      }
    }
    const [px, py] = this.pos;
    ctx.drawImage(charSprite(SPR.player, this.dir, this.walking ? this.frameN : 0), Math.round(px - 8), Math.round(py - 10));
    // location label
    frame(ctx, 0, 120, 160, 24);
    const name = this.walking ? '' : LOCATIONS[this.node].name;
    drawTextCenter(ctx, name, 80, 129, C.ink);
    if (!this.walking && Math.floor(app.frameCount / 30) % 2 === 0) ctx.drawImage(icon('arrowRight'), 148, 130);
  }
}

// ---------------------------------------------------------------------------
// Rooms

export class RoomScene {
  constructor(game, locId) {
    this.manualFade = true;
    this.game = game;
    this.save = game.save;
    this.locId = locId;
    this.loc = LOCATIONS[locId];
    this.pal = CLUB_COLORS[locId];
    const [ex, ey] = this.loc.entry;
    this.player = { x: ex, y: ey, dir: 'up', ox: 0, oy: 0, frame: 0 };
    this.talking = null;
    this.portrait = null;
  }

  refreshNpcs() {
    this.npcs = npcsIn(this.locId, this.save).map((id) => {
      const n = NPCS[id];
      return { id, x: n.pos[0], y: n.pos[1], dir: n.face, def: n };
    });
  }

  solidAt(x, y) {
    if (x < 0 || x > 9 || y < 0 || y > 8) return true;
    if (SOLID.has(this.loc.room[y][x])) return true;
    return this.npcs.some((n) => n.x === x && n.y === y);
  }

  async run(app) {
    this.app = app;
    this.box = new TextBox(app);
    this.refreshNpcs();
    playMusic(this.loc.music || 'club');
    await app.fadeIn(12);
    if (this.game.onEnterRoom) await this.game.onEnterRoom(this);
    for (;;) {
      await app.frame();
      const inp = app.input;
      if (inp.pressed.has('start') || inp.pressed.has('select')) {
        const r = await this.game.startMenu(this);
        if (r === 'title') return 'title';
        continue;
      }
      if (inp.pressed.has('a')) {
        await this.interact();
        continue;
      }
      for (const dir of ['up', 'down', 'left', 'right']) {
        if (!inp.isDown(dir)) continue;
        const r = await this.step(dir);
        if (r === 'exit') {
          sfx('door');
          await app.fadeOut(12);
          return 'exit';
        }
        break;
      }
    }
  }

  async step(dir) {
    const p = this.player;
    p.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (dir === 'down' && ny > 8 && this.loc.room[p.y][p.x] === 'D') return 'exit';
    if (this.solidAt(nx, ny)) {
      await this.app.wait(1);
      return null;
    }
    for (let i = 1; i <= 8; i++) {
      p.ox = dx * i * 2;
      p.oy = dy * i * 2;
      p.frame = i < 5 ? 1 : 2;
      if (p.walkToggle) p.frame = i < 5 ? 3 : 0;
      await this.app.frame();
    }
    p.walkToggle = !p.walkToggle;
    p.x = nx;
    p.y = ny;
    p.ox = 0;
    p.oy = 0;
    p.frame = 0;
    return null;
  }

  async interact() {
    const p = this.player;
    const [dx, dy] = DIRS[p.dir];
    const tx = p.x + dx;
    const ty = p.y + dy;
    let npc = this.npcs.find((n) => n.x === tx && n.y === ty);
    // talk across a shop counter
    if (!npc && this.loc.room[ty]?.[tx] === 'c') npc = this.npcs.find((n) => n.x === tx + dx && n.y === ty + dy);
    if (npc) {
      npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir];
      await this.game.talk(this, npc);
      this.refreshNpcs();
      return;
    }
    const t = this.loc.room[ty]?.[tx];
    if (t === 'k') {
      await this.say(['THE DECK GRIMOIRE. BUILD AND EDIT YOUR DECKS HERE.'], null);
      await this.game.deckMenu(this);
    } else if (t === 's') {
      await this.say(['SHELVES FULL OF OLD CARD BINDERS. ALPHA, BETA, UNLIMITED...'], null);
    } else if (t === 'T') {
      await this.say(['A DUELING TABLE. SOMEONE LEFT A FEW LANDS ON IT.'], null);
    } else if (t === 'w') {
      await this.say(['THE ISLAND OF DOMINARIA STRETCHES OUT BEYOND THE WINDOW.'], null);
    } else if (t === 'b') {
      await this.say([`THE BANNER OF THE ${this.loc.name}.`], null);
    }
  }

  // Show dialog lines with an optional speaker.
  async say(lines, npc) {
    this.box.label = npc ? npc.def.name : null;
    this.portrait = npc && npc.def.portrait ? npc.def.portrait : null;
    for (const l of lines) await this.box.say(l, { wait: true });
    this.box.clear();
    this.box.label = null;
    this.portrait = null;
  }

  async ask(question, npc, options = ['YES', 'NO'], start = 0) {
    this.box.label = npc ? npc.def.name : null;
    this.portrait = npc && npc.def.portrait ? npc.def.portrait : null;
    const i = await this.box.choose(options, { cols: options.length > 2 ? 3 : 2, prompt: question, colWidth: options.length > 2 ? 46 : 60, start });
    this.box.clear();
    this.box.label = null;
    this.portrait = null;
    return i;
  }

  draw(ctx, app) {
    const room = this.loc.room;
    for (let y = 0; y < 9; y++) for (let x = 0; x < 10; x++) ctx.drawImage(tile(room[y][x], this.pal, x, y), x * 16, y * 16);
    const actors = [...this.npcs.map((n) => ({ x: n.x * 16, y: n.y * 16, spr: charSprite(n.def.sprite, n.dir, 0) }))];
    const p = this.player;
    actors.push({ x: p.x * 16 + p.ox, y: p.y * 16 + p.oy, spr: charSprite(SPR.player, p.dir, p.frame) });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) ctx.drawImage(a.spr, Math.round(a.x), Math.round(a.y) - 2);
    if (this.box.mode) {
      this.box.draw(ctx);
      if (this.portrait) {
        frame(ctx, 104, 40, 56, 56);
        ctx.drawImage(portrait(this.portrait), 108, 44);
      }
    }
  }
}
