// Duel board renderer: the top 160x96 of the screen, laid out like the
// video — stats columns in opposite corners, life dice top/bottom centre,
// lands in the other corners, creatures around the Planeswalker watermark.

import { C } from '../gfx/palette.js';
import { drawText, drawTextRight, drawTextCenter, drawTextOutline } from '../gfx/font.js';
import { icon, miniCard, watermark, lifeDie } from '../gfx/sprites.js';
import { cardDef, stats } from '../engine/game.js';
import { cardColor } from '../data/cards.js';
import { fill } from '../gfx/draw.js';

const CENTER_X0 = 44;
const CENTER_X1 = 116;

export function isLandId(id) {
  return cardDef(id).type.includes('Land');
}

// Compute positions of everything selectable on the board.
export function layoutBoard(g, snap, human) {
  const slots = [];
  const sides = [human, 1 - human];
  for (const p of sides) {
    const bottom = p === human;
    const perms = snap.bf.filter(([iid, ctl, , att]) => ctl === p && !isLandId(g.cards[iid].id) && !(att != null && cardDef(g.cards[iid].id).aura));
    const creatures = perms.filter(([iid]) => cardDef(g.cards[iid].id).type.includes('Creature'));
    const others = perms.filter(([iid]) => !cardDef(g.cards[iid].id).type.includes('Creature'));
    const ordered = [...creatures, ...others];
    const perRow = ordered.length > 12 ? Math.ceil(ordered.length / 2) : 6;
    const rowsY = bottom ? [64, 52] : [20, 32];
    for (let row = 0; row * perRow < ordered.length; row++) {
      const items = ordered.slice(row * perRow, row * perRow + perRow);
      const pitch = Math.min(11, Math.floor((CENTER_X1 - CENTER_X0) / Math.max(1, items.length)));
      const total = pitch * (items.length - 1) + 10;
      let x = Math.round((CENTER_X0 + CENTER_X1) / 2 - total / 2);
      for (const [iid, , tapped] of items) {
        const w = tapped ? 10 : 8;
        const h = tapped ? 8 : 10;
        const y = (rowsY[Math.min(row, 1)] ?? rowsY[1]) + (tapped ? 1 : 0);
        slots.push({ kind: 'perm', iid, p, x: x + (tapped ? 0 : 1), y, w, h, tapped: !!tapped, land: false });
        x += pitch;
      }
    }
    // lands
    const lands = snap.bf.filter(([iid, ctl]) => ctl === p && isLandId(g.cards[iid].id));
    const lx0 = bottom ? 10 : 112;
    const ly = bottom ? 85 : 2;
    const width = bottom ? 46 : 46;
    const pitch = lands.length ? Math.min(7, Math.floor((width - 6) / Math.max(1, lands.length - 1 || 1))) : 7;
    lands.forEach(([iid, , tapped], i) => {
      slots.push({ kind: 'perm', iid, p, x: lx0 + i * pitch, y: ly, w: 6, h: 8, tapped: !!tapped, land: true });
    });
    // player (life die) slot
    slots.push({ kind: 'player', p, x: 72, y: bottom ? 79 : 1, w: 16, h: 16 });
    // graveyard icon (browsable from the battlefield menu)
    slots.push({ kind: 'grave', p, x: bottom ? 122 : 2, y: bottom ? 72 : 14, w: 8, h: 9 });
  }
  return slots;
}

function landMini(colorKey, tapped) {
  return miniCard(colorKey, false, { kind: 'land', dim: tapped });
}

function statRow(ctx, name, n, x, y, right) {
  ctx.drawImage(icon(name), x, y);
  drawText(ctx, '×', x + 11, y + 1, C.ink);
  drawTextRight(ctx, String(n), right, y + 1, C.ink);
}

// opts: { cursor: slot, marks: Map(iid -> 'attack'|'block'|'target'|'select'),
//         floats: [{x,y,text,color}], hidden: Set(iid), flash: iid, blink }
export function drawBoard(ctx, g, snap, human, slots, opts = {}) {
  fill(ctx, C.bg, 0, 0, 160, 96);
  const opp = 1 - human;
  ctx.drawImage(watermark(), 67, 27);

  // opponent stats (top-left)
  statRow(ctx, 'hand', snap.hand[opp], 1, 2, 38);
  statRow(ctx, 'grave', snap.gy[opp], 2, 14, 38);
  statRow(ctx, 'library', snap.lib[opp], 0, 26, 38);
  statRow(ctx, 'exile', snap.ex[opp], 1, 38, 38);
  // human stats (bottom-right)
  statRow(ctx, 'exile', snap.ex[human], 121, 48, 158);
  statRow(ctx, 'library', snap.lib[human], 120, 60, 158);
  statRow(ctx, 'grave', snap.gy[human], 122, 72, 158);
  statRow(ctx, 'hand', snap.hand[human], 121, 84, 158);

  // land symbols
  ctx.drawImage(icon('land', { e: C.grey }), 103, 3);
  ctx.drawImage(icon('land', { e: C.grey }), 1, 86);

  // life dice
  for (const p of [human, opp]) {
    const y = p === human ? 79 : 1;
    ctx.drawImage(lifeDie(), 72, y);
    const life = opts.lifeOverride ? opts.lifeOverride[p] : snap.life[p];
    drawTextCenter(ctx, String(life), 80, y + 5, life <= 5 ? C.red : C.dark);
  }

  // blocks: draw a line from blocker to attacker
  if (snap.combat) {
    for (const [b, a] of snap.combat.blocks) {
      const sb = slots.find((s) => s.iid === b);
      const sa = slots.find((s) => s.iid === a);
      if (!sb || !sa) continue;
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sb.x + sb.w / 2 + 0.5, sb.y + sb.h / 2);
      ctx.lineTo(sa.x + sa.w / 2 + 0.5, sa.y + sa.h / 2);
      ctx.stroke();
    }
  }

  const attacking = new Set(snap.combat ? snap.combat.attackers : []);
  for (const s of slots) {
    if (s.kind !== 'perm') continue;
    if (opts.hidden && opts.hidden.has(s.iid)) continue;
    if (opts.flash === s.iid && opts.blink) continue;
    const d = cardDef(g.cards[s.iid].id);
    const ck = cardColor(d);
    let dy = 0;
    if (attacking.has(s.iid)) dy = s.p === human ? -3 : 3;
    if (s.land) {
      ctx.drawImage(landMini(ck, s.tapped), s.x, s.y);
    } else {
      const creature = d.type.includes('Creature');
      const kind = creature ? null : 'other';
      let flying = false;
      let sick = false;
      if (creature) {
        const st = stats(g, s.iid);
        flying = st.kw.has('flying');
        // hatch your own summoning-sick creatures (the opponent's can still block)
        sick = s.p === human && g.cards[s.iid].sick && !st.kw.has('haste');
      }
      ctx.drawImage(miniCard(ck, s.tapped, { kind, flying, sick }), s.x, s.y + dy);
      // aura marker
      const enchanted = snap.bf.some(([, , , att]) => att === s.iid);
      if (enchanted) {
        ctx.fillStyle = C.yellow;
        ctx.fillRect(s.x + s.w - 2, s.y + dy, 2, 2);
      }
    }
    const mark = opts.marks && opts.marks.get(s.iid);
    if (mark) {
      const blink = Math.floor((opts.frame || 0) / 12) % 2 === 0;
      if (mark === 'attack') ctx.drawImage(icon('arrowUp', { o: C.red }), s.x + s.w / 2 - 2, s.y + dy - 5);
      if (mark === 'block' && blink) ctx.drawImage(icon('arrowDown', { o: C.blueDark }), s.x + s.w / 2 - 2, s.y - 5);
      if (mark === 'target' && blink) {
        ctx.strokeStyle = C.red;
        ctx.strokeRect(s.x - 1.5, s.y + dy - 1.5, s.w + 3, s.h + 3);
      }
    }
  }

  // cursor ▲ under the selected slot
  if (opts.cursor && Math.floor((opts.frame || 0) / 16) % 2 === 0) {
    const s = opts.cursor;
    const cx = Math.round(s.x + s.w / 2 - 2);
    const cy = s.kind === 'player' ? s.y + s.h + 1 : s.y + s.h + 2;
    ctx.drawImage(icon('arrowUp'), cx, Math.min(cy, 92));
  }

  for (const f of opts.floats || []) {
    drawTextOutline(ctx, f.text, Math.round(f.x), Math.round(f.y), f.color || C.red, C.white);
  }
}

// Directional cursor movement between slots.
export function moveCursor(slots, cur, dir) {
  if (!cur) return slots[0] || null;
  const cx = cur.x + cur.w / 2;
  const cy = cur.y + cur.h / 2;
  let best = null;
  let bestScore = Infinity;
  for (const s of slots) {
    if (s === cur) continue;
    const dx = s.x + s.w / 2 - cx;
    const dy = s.y + s.h / 2 - cy;
    let primary;
    let secondary;
    if (dir === 'left') [primary, secondary] = [-dx, dy];
    if (dir === 'right') [primary, secondary] = [dx, dy];
    if (dir === 'up') [primary, secondary] = [-dy, dx];
    if (dir === 'down') [primary, secondary] = [dy, dx];
    if (primary <= 0) continue;
    const score = primary + Math.abs(secondary) * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best || cur;
}
