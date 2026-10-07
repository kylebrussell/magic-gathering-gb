// Subjects painted on top of card-art scenes. Each function draws in tones
// (0 = darkest/outline, 3 = lightest) on a 64x48 layer; the compositor adds a
// dark outline around everything drawn here.

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Builders

function wings(d, x, y, s, kind, t) {
  if (kind === 'bat') {
    for (const dir of [-1, 1]) {
      d.poly([[x, y], [x + dir * 22 * s, y - 12 * s], [x + dir * 18 * s, y - 2 * s], [x + dir * 14 * s, y + 2 * s], [x + dir * 9 * s, y + 4 * s], [x + dir * 4 * s, y + 6 * s]], t);
      d.line(x, y, x + dir * 22 * s, y - 12 * s, 0, 1.2);
    }
    return;
  }
  for (const dir of [-1, 1]) {
    d.poly([[x + dir * 2 * s, y], [x + dir * 12 * s, y - 16 * s], [x + dir * 20 * s, y - 14 * s], [x + dir * 18 * s, y - 4 * s], [x + dir * 12 * s, y + 6 * s], [x + dir * 4 * s, y + 8 * s]], t);
    for (let i = 1; i <= 3; i++) d.line(x + dir * (4 + i * 3) * s, y + (6 - i * 2) * s, x + dir * (10 + i * 3) * s, y - (10 - i * 2) * s, t - 1, 1.2);
  }
}

function weapon(d, kind, hx, hy, s) {
  switch (kind) {
    case 'sword':
      d.line(hx, hy, hx + 3 * s, hy - 14 * s, 3, 2 * s);
      d.line(hx - 3 * s, hy - 1 * s, hx + 3 * s, hy + 1 * s, 0, 1.6);
      break;
    case 'staff':
      d.line(hx, hy + 14 * s, hx + 1 * s, hy - 12 * s, 1, 1.8 * s);
      d.circ(hx + 1 * s, hy - 13 * s, 2.5 * s, 3);
      break;
    case 'spear':
      d.line(hx - 1 * s, hy + 12 * s, hx + 4 * s, hy - 16 * s, 1, 1.6 * s);
      d.poly([[hx + 4 * s, hy - 21 * s], [hx + 6 * s, hy - 15 * s], [hx + 2 * s, hy - 16 * s]], 3);
      break;
    case 'axe':
      d.line(hx, hy + 6 * s, hx + 2 * s, hy - 12 * s, 1, 1.8 * s);
      d.path(`M${hx + 2 * s} ${hy - 13 * s} Q${hx + 10 * s} ${hy - 12 * s} ${hx + 9 * s} ${hy - 4 * s} L${hx + 2 * s} ${hy - 7 * s} Z`, 3);
      break;
    case 'dagger':
      d.line(hx, hy, hx + 4 * s, hy - 6 * s, 3, 1.6 * s);
      break;
    case 'bow':
      d.arc(hx + 2 * s, hy, 9 * s, -PI / 2.2, PI / 2.2, 1, 1.6 * s);
      d.line(hx + 2 * s + Math.cos(-PI / 2.2) * 9 * s, hy - 8.8 * s, hx + 2 * s + Math.cos(PI / 2.2) * 9 * s, hy + 8.8 * s, 3, 1);
      break;
    case 'mace':
      d.line(hx, hy, hx + 2 * s, hy - 10 * s, 1, 1.8 * s);
      d.circ(hx + 2 * s, hy - 11 * s, 3 * s, 2);
      break;
    case 'trident':
      d.line(hx, hy + 10 * s, hx + 2 * s, hy - 14 * s, 1, 1.6 * s);
      for (const off of [-3, 0, 3]) d.line(hx + 2 * s + off * s, hy - 14 * s, hx + 2 * s + off * s, hy - 19 * s, 3, 1.6);
      d.line(hx - 1 * s, hy - 14 * s, hx + 5 * s, hy - 14 * s, 3, 1.6);
      break;
    case 'torch':
      d.line(hx, hy, hx + 1 * s, hy - 8 * s, 1, 1.8 * s);
      d.ell(hx + 1 * s, hy - 11 * s, 2.5 * s, 4 * s, 3);
      break;
  }
}

function humanoid(d, o = {}) {
  const x = o.x ?? 32;
  const base = o.y ?? 46;
  const s = (o.h ?? 34) / 34;
  const body = o.body ?? 1;
  const skin = o.skin ?? 3;
  const legs = o.legs ?? body;
  const hr = (o.headR ?? 4.5) * s;
  const top = base - 34 * s;
  const hy = top + hr + (o.hunch ? 3 * s : 0);
  const hx = x + (o.hunch ? 3 * s : 0);
  const sw = (o.bulk ? 8.5 : 6) * s;
  const ny = hy + hr - 0.5;
  const hipY = base - 13 * s;
  if (o.wings) wings(d, x, ny + 3 * s, s, o.wings, o.wingTone ?? 3);
  if (o.cape != null) d.poly([[x - sw, ny + 1], [x + sw, ny + 1], [x + sw + 5 * s, base], [x - sw - 5 * s, base]], o.cape);
  if (o.tail === 'fish') {
    d.path(`M${x - 5 * s} ${hipY} Q${x - 6 * s} ${base - 2 * s} ${x + 4 * s} ${base - 1 * s} L${x + 12 * s} ${base - 6 * s} L${x + 12 * s} ${base + 1 * s} L${x + 5 * s} ${base + 1 * s} Q${x + 6 * s} ${hipY + 4 * s} ${x + 5 * s} ${hipY} Z`, o.tailTone ?? 2);
    for (let i = 0; i < 4; i++) d.px(x - 2 * s + i * 2 * s, hipY + 4 * s + i * s, 1);
  } else if (o.robe) {
    d.poly([[x - sw, ny + 2], [x + sw, ny + 2], [x + sw + 4 * s, base], [x - sw - 4 * s, base]], body);
    d.line(x, ny + 6 * s, x, base - 1, o.robeLine ?? 2, 1.2);
  } else if (!o.noLegs) {
    d.rect(x - 4.5 * s, hipY, 3.5 * s, base - hipY, legs);
    d.rect(x + 1 * s, hipY, 3.5 * s, base - hipY, legs);
    d.rect(x - 5.5 * s, base - 2 * s, 4.5 * s, 2 * s, o.boots ?? 0.4);
    d.rect(x + 1 * s, base - 2 * s, 4.5 * s, 2 * s, o.boots ?? 0.4);
  }
  d.poly([[x - sw, ny + 1], [x + sw, ny + 1], [x + sw * 0.8, hipY + 1], [x - sw * 0.8, hipY + 1]], body);
  if (o.chest != null) d.poly([[x - sw * 0.6, ny + 3], [x + sw * 0.6, ny + 3], [x, hipY - 2]], o.chest);
  if (o.belt) d.rect(x - sw * 0.8, hipY - 1, sw * 1.6, 1.6, 0.3);
  const armT = o.arm ?? body;
  const aw = (o.bulk ? 4 : 3) * s;
  // left arm (hangs, or holds shield)
  const lhx = x - sw - 2 * s;
  const lhy = o.shield ? ny + 9 * s : hipY + 1;
  d.line(x - sw + 0.5, ny + 2, lhx, lhy, armT, aw);
  // right arm: raised with weapon, else hanging
  const raised = o.weapon && !o.lowWeapon;
  const rhx = raised ? x + sw + 5 * s : x + sw + 2 * s;
  const rhy = raised ? ny - 3 * s : hipY + 1;
  d.line(x + sw - 0.5, ny + 2, rhx, rhy, armT, aw);
  if (o.claws) {
    for (const [cx, cy] of [[lhx, lhy], [rhx, rhy]]) for (let i = -1; i <= 1; i++) d.line(cx, cy, cx + i * 2 * s, cy + 3 * s, 3, 1.2);
  } else {
    d.circ(lhx, lhy, 1.6 * s, skin);
    d.circ(rhx, rhy, 1.6 * s, skin);
  }
  if (o.weapon) weapon(d, o.weapon, rhx, rhy, s);
  if (o.shield) {
    const sx = x - sw - 3 * s;
    const sy = ny + 4 * s;
    d.path(`M${sx - 5 * s} ${sy} L${sx + 5 * s} ${sy} L${sx + 5 * s} ${sy + 6 * s} Q${sx} ${sy + 13 * s} ${sx - 5 * s} ${sy + 6 * s} Z`, o.shield);
    d.line(sx, sy + 1 * s, sx, sy + 9 * s, o.shield > 1.5 ? 1 : 3, 1.4);
    d.line(sx - 4 * s, sy + 4 * s, sx + 4 * s, sy + 4 * s, o.shield > 1.5 ? 1 : 3, 1.4);
  }
  // ears go behind the head
  if (o.ears === 'elf') {
    d.poly([[hx - hr + 1, hy], [hx - hr - 5 * s, hy - 3 * s], [hx - hr + 1, hy + 2 * s]], skin);
    d.poly([[hx + hr - 1, hy], [hx + hr + 5 * s, hy - 3 * s], [hx + hr - 1, hy + 2 * s]], skin);
  } else if (o.ears === 'goblin') {
    d.poly([[hx - hr + 1, hy - 1], [hx - hr - 7 * s, hy - 5 * s], [hx - hr + 1, hy + 3 * s]], skin);
    d.poly([[hx + hr - 1, hy - 1], [hx + hr + 7 * s, hy - 5 * s], [hx + hr - 1, hy + 3 * s]], skin);
  }
  if (o.horns) {
    d.path(`M${hx - 3 * s} ${hy - hr + 1} Q${hx - 9 * s} ${hy - hr - 2 * s} ${hx - 8 * s} ${hy - hr - 8 * s} Q${hx - 6 * s} ${hy - hr - 2 * s} ${hx - 1 * s} ${hy - hr + 2} Z`, o.horns);
    d.path(`M${hx + 3 * s} ${hy - hr + 1} Q${hx + 9 * s} ${hy - hr - 2 * s} ${hx + 8 * s} ${hy - hr - 8 * s} Q${hx + 6 * s} ${hy - hr - 2 * s} ${hx + 1 * s} ${hy - hr + 2} Z`, o.horns);
  }
  if (o.hood != null) {
    d.circ(hx, hy - 0.5, hr + 1.5 * s, o.hood);
    d.poly([[hx - hr - 1.5 * s, hy], [hx + hr + 1.5 * s, hy], [hx + sw, ny + 4 * s], [hx - sw, ny + 4 * s]], o.hood);
    d.ell(hx, hy + 1, hr * 0.6, hr * 0.8, 0);
    if (o.eyes != null) {
      d.px(hx - 1.5 * s, hy + 0.5, o.eyes);
      d.px(hx + 1.5 * s, hy + 0.5, o.eyes);
    }
    return;
  }
  if (o.skull) {
    d.circ(hx, hy, hr, 3);
    d.rect(hx - hr * 0.6, hy + hr * 0.4, hr * 1.2, hr * 0.8, 3);
    d.circ(hx - 1.6 * s, hy, 1.3 * s, 0);
    d.circ(hx + 1.6 * s, hy, 1.3 * s, 0);
    d.rect(hx - 1.5 * s, hy + hr * 0.8, 3 * s, 1, 0);
  } else {
    d.circ(hx, hy, hr, skin);
    if (o.snout) d.ell(hx + hr * 0.6, hy + 1.2 * s, hr * 0.7, hr * 0.5, skin);
    d.px(hx - 1.5 * s, hy - 0.5, o.eyeTone ?? 0);
    d.px(hx + 1.5 * s, hy - 0.5, o.eyeTone ?? 0);
    if (o.grin) d.line(hx - 2 * s, hy + 2 * s, hx + 2 * s, hy + 2 * s, 0, 1);
    if (o.nose === 'long') d.poly([[hx, hy], [hx + 5 * s, hy + 2 * s], [hx, hy + 2 * s]], skin);
  }
  if (o.beard != null) d.poly([[hx - hr + 1, hy + 1], [hx + hr - 1, hy + 1], [hx, hy + hr + 6 * s]], o.beard);
  if (o.hair != null) d.path(`M${hx - hr - 0.5} ${hy + 3 * s} Q${hx - hr - 1} ${hy - hr - 1} ${hx} ${hy - hr - 1.5} Q${hx + hr + 1} ${hy - hr - 1} ${hx + hr + 0.5} ${hy + 3 * s} L${hx + hr - 1} ${hy - 1} L${hx - hr + 1} ${hy - 1} Z`, o.hair);
  if (o.longHair != null) {
    d.path(`M${hx - hr - 1} ${hy + 9 * s} Q${hx - hr - 2} ${hy - hr - 1} ${hx} ${hy - hr - 1.5} Q${hx + hr + 2} ${hy - hr - 1} ${hx + hr + 1} ${hy + 9 * s} L${hx + hr - 1} ${hy - 1} L${hx - hr + 1} ${hy - 1} Z`, o.longHair);
  }
  if (o.helmet != null) {
    d.path(`M${hx - hr - 0.8} ${hy + 1} Q${hx} ${hy - hr * 2.2} ${hx + hr + 0.8} ${hy + 1} Z`, o.helmet);
    d.rect(hx - hr, hy - 0.5, hr * 2, 1.4, o.helmet);
    if (o.visor) {
      d.circ(hx, hy + 1, hr, o.helmet);
      d.rect(hx - hr * 0.7, hy, hr * 1.4, 1.2, 0);
    }
    if (o.plume != null) d.path(`M${hx} ${hy - hr - 1} Q${hx - 8 * s} ${hy - hr - 6 * s} ${hx - 10 * s} ${hy + 2 * s} Q${hx - 5 * s} ${hy - hr - 2 * s} ${hx} ${hy - hr + 1} Z`, o.plume);
  }
  if (o.hat === 'wizard') d.poly([[hx - hr - 3 * s, hy - 1], [hx + hr + 3 * s, hy - 1], [hx + 2 * s, hy - hr - 11 * s]], o.hatTone ?? body);
  if (o.hat === 'cap') d.path(`M${hx - hr} ${hy - 1} Q${hx} ${hy - hr * 2} ${hx + hr} ${hy - 1} L${hx + hr + 4 * s} ${hy} Z`, o.hatTone ?? 2);
  if (o.crown != null) d.poly([[hx - hr, hy - hr + 2], [hx - hr, hy - hr - 3 * s], [hx - hr / 2, hy - hr - 1], [hx, hy - hr - 4 * s], [hx + hr / 2, hy - hr - 1], [hx + hr, hy - hr - 3 * s], [hx + hr, hy - hr + 2]], o.crown);
  if (o.halo) d.arc(hx, hy - hr - 2 * s, hr * 0.9, 0, PI * 2, 3, 1.5);
}

function quad(d, o = {}) {
  const x = o.x ?? 30;
  const base = o.y ?? 44;
  const L = o.len ?? 30;
  const H = o.ht ?? 18;
  const t = o.tone ?? 2;
  const top = base - H;
  const bh = H * 0.5;
  const lw = o.legW ?? 3;
  const legTop = top + bh * 0.5;
  const legX = [x - L / 2 + 3, x - L / 2 + 7, x + L / 2 - 8, x + L / 2 - 4];
  legX.forEach((lx, i) => d.rect(lx - lw / 2 + (o.stride && i % 2 ? 1 : 0), legTop, lw, base - legTop, i === 1 || i === 3 ? t - 0.7 : t));
  if (o.tail) d.path(`M${x - L / 2 + 1} ${top + 3} Q${x - L / 2 - 8} ${top} ${x - L / 2 - 6} ${top + 10}`, t);
  if (o.tail) d.stroke(`M${x - L / 2 + 1} ${top + 3} Q${x - L / 2 - 8} ${top} ${x - L / 2 - 6} ${top + 10}`, t, 2);
  d.ell(x, top + bh / 2 + 1, L / 2, bh / 2 + 1, t);
  if (o.belly != null) d.ell(x + 1, top + bh * 0.8, L / 2.6, bh / 4, o.belly);
  if (o.wings) {
    d.poly([[x - 4, top + 2], [x - 14, top - 16], [x + 2, top - 10], [x + 6, top + 2]], 3);
    for (let i = 0; i < 3; i++) d.line(x - 3 + i * 3, top + 1, x - 12 + i * 4, top - 13 + i * 2, 2, 1.2);
  }
  const hx = x + L / 2 + (o.headDx ?? 2);
  const hy = top + (o.headDy ?? -2);
  const neck = o.neck ?? 0;
  if (neck) d.poly([[x + L / 2 - 6, top + 2], [x + L / 2 - 1, top + bh], [hx + 2, hy + 3], [hx - 2, hy - 1]], t);
  const head = o.head || 'cat';
  if (head === 'cat' || head === 'wolf' || head === 'bear' || head === 'rat') {
    const hr = o.headR ?? 5;
    d.circ(hx, hy, hr, t);
    const snout = head === 'wolf' || head === 'rat' ? 6 : head === 'bear' ? 3.5 : 3;
    d.ell(hx + hr * 0.7, hy + 1.5, snout, 2.5, t);
    d.px(hx + hr * 0.7 + snout - 1, hy + 0.5, 0);
    d.px(hx + 1, hy - 1.5, 0);
    if (head === 'wolf' || head === 'cat' || head === 'rat') {
      d.poly([[hx - 3, hy - 3], [hx - 1, hy - hr - 4], [hx + 1, hy - 3]], t);
      d.poly([[hx + 1, hy - 3], [hx + 3, hy - hr - 3], [hx + 4, hy - 2]], t);
    } else {
      d.circ(hx - 2, hy - hr + 1, 2, t);
    }
    if (head === 'rat') d.stroke(`M${x - L / 2} ${top + bh / 2} q-6 -2 -10 4`, t, 1.4);
  }
  if (head === 'horse') {
    d.poly([[x + L / 2 - 6, top + 3], [x + L / 2 - 2, top + bh], [hx + 1, hy + 3], [hx - 3, hy - 4]], t);
    d.ell(hx + 3, hy + 1, 6, 3.2, t, 0.5);
    d.poly([[hx - 2, hy - 3], [hx - 1, hy - 8], [hx + 1, hy - 3]], t);
    d.px(hx + 2, hy - 0.5, 0);
    if (o.mane != null) d.path(`M${hx - 3} ${hy - 4} Q${x + L / 2 - 10} ${top - 2} ${x + L / 2 - 8} ${top + 5} L${x + L / 2 - 4} ${top + 2} Z`, o.mane);
    if (o.horn) d.poly([[hx + 2, hy - 2], [hx + 9, hy - 12], [hx + 4, hy - 1]], 3);
  }
}

function birdShape(d, x, y, span, t, o = {}) {
  const s = span / 30;
  d.poly([[x - 2 * s, y], [x - 15 * s, y - (o.up ? 10 : 4) * s], [x - 12 * s, y + 1 * s], [x - 6 * s, y + 3 * s]], t);
  d.poly([[x + 2 * s, y], [x + 15 * s, y - (o.up ? 10 : 4) * s], [x + 12 * s, y + 1 * s], [x + 6 * s, y + 3 * s]], t);
  d.ell(x, y + 1 * s, 4 * s, 3 * s, t);
  d.circ(x + 3 * s, y - 2 * s, 2.4 * s, t);
  d.poly([[x + 5 * s, y - 2.5 * s], [x + 8 * s, y - 1.5 * s], [x + 5 * s, y - 0.5 * s]], o.beak ?? 3);
  d.poly([[x - 3 * s, y + 2 * s], [x - 9 * s, y + 7 * s], [x - 4 * s, y + 4 * s]], t);
  d.px(x + 3.5 * s, y - 2.5 * s, 0);
}

function bolt(d, pts, t = 3, w = 3) {
  for (let i = 1; i < pts.length; i++) d.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], t, w);
}

function flame(d, x, y, w, h, t) {
  d.path(`M${x - w} ${y} Q${x - w} ${y - h * 0.5} ${x - w * 0.3} ${y - h * 0.6} Q${x - w * 0.5} ${y - h * 0.9} ${x} ${y - h} Q${x + w * 0.1} ${y - h * 0.7} ${x + w * 0.5} ${y - h * 0.75} Q${x + w} ${y - h * 0.4} ${x + w} ${y} Z`, t);
}

function sparkles(d, r, n, t = 3) {
  for (let i = 0; i < n; i++) {
    const x = 6 + r() * 52;
    const y = 4 + r() * 40;
    d.line(x - 2, y, x + 2, y, t, 1);
    d.line(x, y - 2, x, y + 2, t, 1);
  }
}

function serpentBody(d, x0, y0, len, amp, thick, t, phase = 0) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push([x0 + u * len, y0 + Math.sin(u * PI * 2 + phase) * amp]);
  }
  for (let i = 1; i < pts.length; i++) {
    const w = thick * (0.4 + 0.6 * Math.sin((i / pts.length) * PI * 0.9 + 0.2));
    d.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], t, w);
  }
  return pts[pts.length - 1];
}

function gearShape(d, x, y, r, t, teeth = 8) {
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * PI * 2;
    d.circ(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.28, t);
  }
  d.circ(x, y, r, t);
  d.circ(x, y, r * 0.35, t - 1.5);
}

function dragonShape(d, o = {}) {
  const x = o.x ?? 30;
  const y = o.y ?? 30;
  const s = o.s ?? 1;
  const t = o.tone ?? 1;
  // wings
  d.poly([[x - 2 * s, y - 4 * s], [x - 16 * s, y - 22 * s], [x - 12 * s, y - 10 * s], [x - 22 * s, y - 12 * s], [x - 12 * s, y - 2 * s], [x - 18 * s, y + 2 * s], [x - 4 * s, y + 4 * s]], o.wing ?? 2);
  d.poly([[x + 4 * s, y - 4 * s], [x + 10 * s, y - 24 * s], [x + 12 * s, y - 12 * s], [x + 22 * s, y - 16 * s], [x + 14 * s, y - 4 * s]], o.wing ?? 2);
  // tail
  d.stroke(`M${x - 6 * s} ${y + 6 * s} Q${x - 20 * s} ${y + 14 * s} ${x - 28 * s} ${y + 6 * s}`, t, 3 * s);
  d.poly([[x - 28 * s, y + 6 * s], [x - 31 * s, y + 2 * s], [x - 30 * s, y + 9 * s]], t);
  // body
  d.ell(x, y + 4 * s, 10 * s, 6 * s, t, -0.3);
  d.ell(x + 1 * s, y + 6 * s, 6 * s, 3 * s, o.belly ?? 3, -0.3);
  // legs
  d.line(x - 5 * s, y + 8 * s, x - 7 * s, y + 15 * s, t, 3 * s);
  d.line(x + 5 * s, y + 8 * s, x + 6 * s, y + 15 * s, t, 3 * s);
  // neck and head
  d.stroke(`M${x + 6 * s} ${y} Q${x + 12 * s} ${y - 10 * s} ${x + 18 * s} ${y - 12 * s}`, t, 4 * s);
  d.ell(x + 21 * s, y - 12 * s, 5 * s, 3 * s, t, 0.2);
  d.poly([[x + 18 * s, y - 15 * s], [x + 15 * s, y - 20 * s], [x + 20 * s, y - 15 * s]], t);
  d.px(x + 22 * s, y - 13 * s, 3);
  if (o.fire) {
    d.poly([[x + 26 * s, y - 11 * s], [x + 40 * s, y - 16 * s], [x + 44 * s, y - 8 * s], [x + 26 * s, y - 9 * s]], 3);
    d.poly([[x + 27 * s, y - 10.5 * s], [x + 36 * s, y - 13 * s], [x + 38 * s, y - 9 * s]], 2);
  }
}

function elementalBlob(d, r, x, y, w, h, t, lumpTone) {
  d.ell(x, y, w, h, t);
  for (let i = 0; i < 10; i++) {
    const a = r() * PI * 2;
    d.circ(x + Math.cos(a) * w * 0.8, y + Math.sin(a) * h * 0.8, 3 + r() * 3, t);
  }
  for (let i = 0; i < 6; i++) d.circ(x - w / 2 + r() * w, y - h / 2 + r() * h, 1.5 + r() * 2, lumpTone);
}

// ---------------------------------------------------------------------------

export const SUBJECTS = {
  // ------------------------------------------------------------- White
  lion(d) {
    quad(d, { x: 28, y: 44, len: 30, ht: 18, tone: 2, head: 'cat', headR: 5, tail: true, belly: 3 });
    d.circ(45, 25, 8, 1);
    d.circ(46, 26, 5, 2);
    d.ell(50, 28, 3, 2.5, 2);
    d.px(47, 24, 0);
    d.px(52, 27, 0);
  },
  knight(d, r, a) {
    humanoid(d, { body: a.dark ? 0.6 : 2.4, skin: 2.6, legs: a.dark ? 0.6 : 2, helmet: a.dark ? 0.8 : 3, visor: true, plume: a.dark ? 1.4 : 1.6, weapon: 'sword', shield: a.dark ? 1.6 : 3, cape: a.dark ? 1.4 : 1.6, belt: true });
  },
  angel(d) {
    humanoid(d, { y: 46, h: 30, body: 3, skin: 3, robe: true, robeLine: 2, longHair: 2, halo: true, wings: 'angel', wingTone: 3, weapon: 'sword' });
  },
  pegasus(d) {
    quad(d, { x: 28, y: 42, len: 28, ht: 18, tone: 3, head: 'horse', mane: 2, tail: true, wings: true, stride: true });
  },
  unicorn(d) {
    quad(d, { x: 28, y: 44, len: 30, ht: 20, tone: 3, head: 'horse', mane: 2, horn: true, tail: true });
  },
  swords(d) {
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 8;
      const tilt = (i - 3) * 0.8;
      d.line(x, 44, x + tilt, 10, 3, 2.2);
      d.line(x - 3, 38, x + 3, 38, 1, 1.6);
      d.line(x, 38, x, 46, 0.6, 1.6);
    }
  },
  paladin(d) {
    humanoid(d, { body: 2.6, skin: 2.6, legs: 2, helmet: 2.8, visor: false, weapon: 'mace', shield: 1.4, cape: 1, chest: 3, belt: true });
  },
  healer(d) {
    humanoid(d, { body: 3, skin: 2.6, robe: true, hood: 2.6, eyes: 3, weapon: 'staff', lowWeapon: true });
    d.glow(44, 22, 10, 3, 1);
  },
  priest(d) {
    humanoid(d, { body: 2.8, skin: 2.6, robe: true, hair: 1, weapon: 'staff', chest: 1.5 });
  },
  wolf(d) {
    quad(d, { x: 28, y: 44, len: 30, ht: 16, tone: 2.6, head: 'wolf', headR: 4.5, tail: true, belly: 3, stride: true });
  },
  spirit(d, r) {
    d.path('M20 40 Q16 22 28 12 Q32 8 36 12 Q48 22 44 40 Q38 34 32 42 Q26 34 20 40 Z', 3);
    wings(d, 32, 22, 0.8, 'angel', 2);
    d.circ(32, 16, 4, 3);
    d.px(30, 16, 0);
    d.px(34, 16, 0);
    bolt(d, [[50, 4], [46, 12], [52, 14], [46, 24]], 3, 2);
  },
  rider(d) {
    quad(d, { x: 30, y: 46, len: 30, ht: 16, tone: 1.4, head: 'horse', mane: 0.6, tail: true, stride: true });
    humanoid(d, { x: 28, y: 32, h: 20, body: 2.6, skin: 2.6, noLegs: true, hood: 3, eyes: 0, weapon: 'spear' });
  },
  soldier(d) {
    humanoid(d, { body: 2, skin: 2.6, legs: 1.4, helmet: 2.4, weapon: 'spear', shield: 2.8, belt: true });
  },
  plow(d) {
    d.line(8, 40, 50, 14, 3, 3);
    d.poly([[46, 10], [56, 6], [54, 18]], 3);
    d.line(14, 30, 22, 38, 1, 2.4);
    d.path('M8 40 Q20 46 38 44 L36 40 Q22 42 12 37 Z', 2);
  },
  salve(d) {
    d.path('M24 18 L40 18 L44 40 Q32 46 20 40 Z', 3);
    d.rect(26, 12, 12, 7, 2);
    d.rect(29, 26, 6, 10, 1);
    d.rect(26, 29, 12, 4, 1);
  },
  chalice(d) {
    d.path('M18 10 L46 10 Q46 26 34 28 L34 36 L42 40 L22 40 L30 36 L30 28 Q18 26 18 10 Z', 3);
    d.rect(20, 12, 24, 3, 2);
    d.glow(32, 6, 12, 3, 0.9);
  },
  aura_holy(d, r) {
    humanoid(d, { body: 2, skin: 3, legs: 1.4, hair: 1, weapon: 'sword', belt: true });
    d.arc(32, 26, 18, 0, PI * 2, 3, 1.5);
    sparkles(d, r, 4);
  },
  shatter_white(d, r) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2;
      const x = 32 + Math.cos(a) * (8 + r() * 10);
      const y = 24 + Math.sin(a) * (6 + r() * 8);
      d.poly([[x, y], [x + 4, y + 2], [x + 1, y + 5]], 3);
    }
    d.circ(32, 24, 5, 3);
  },
  wrath(d) {
    for (let i = 0; i < 7; i++) d.poly([[28 + i, 0], [36 + i, 0], [12 + i * 7, 48], [6 + i * 7, 48]], 3);
    d.path('M0 44 L64 44 L64 48 L0 48 Z', 0.6);
  },
  banner(d) {
    d.line(18, 46, 18, 6, 1, 2);
    d.path('M19 8 L52 10 L46 18 L52 26 L19 26 Z', 3);
    d.path('M30 12 L36 12 L36 15 L39 15 L39 20 L36 20 L36 24 L30 24 L30 20 L27 20 L27 15 L30 15 Z', 1.4);
  },
  army(d) {
    for (let i = 0; i < 5; i++) humanoid(d, { x: 8 + i * 12, y: 46 - (i % 2) * 4, h: 22, body: 2.4, skin: 2.6, legs: 1.2, hood: 3, eyes: 3, weapon: 'spear' });
  },
  armageddon(d, r) {
    d.circ(32, 16, 10, 3);
    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 11;
      flame(d, x, 48, 6, 14 + r() * 10, 2);
    }
    for (let i = 0; i < 5; i++) d.poly([[10 + i * 12, 30], [14 + i * 12, 22], [18 + i * 12, 30]], 0.4);
  },
  moat(d) {
    d.rect(14, 10, 36, 26, 2.4);
    for (let x = 14; x < 50; x += 6) d.rect(x, 6, 4, 4, 2.4);
    d.rect(28, 24, 8, 12, 0.6);
    d.path('M0 36 L64 36 L64 44 L0 44 Z', 1.2);
    for (let x = 2; x < 64; x += 8) d.line(x, 40, x + 4, 40, 2.8, 1);
  },

  // ------------------------------------------------------------- Blue
  merfolk(d) {
    humanoid(d, { body: 2, skin: 2.6, tail: 'fish', tailTone: 2, longHair: 1, weapon: 'trident', ears: 'elf' });
  },
  merlord(d) {
    humanoid(d, { body: 2.6, skin: 2.6, tail: 'fish', tailTone: 2, longHair: 1, crown: 3, weapon: 'trident', ears: 'elf', cape: 1 });
  },
  flyingman(d) {
    humanoid(d, { y: 42, h: 26, body: 2, skin: 3, wings: 'angel', wingTone: 3, hair: 1, belt: true });
  },
  crow(d) {
    birdShape(d, 30, 22, 46, 1, { up: true, beak: 2 });
  },
  pirate(d) {
    humanoid(d, { body: 1.4, skin: 2.8, legs: 2, hat: 'cap', hatTone: 0.6, weapon: 'sword', belt: true, wings: 'angel', wingTone: 3 });
  },
  wizard(d) {
    humanoid(d, { body: 1.2, skin: 3, robe: true, hat: 'wizard', hatTone: 1.2, beard: 3, weapon: 'staff' });
    d.glow(46, 8, 8, 3, 1);
  },
  tortoise(d) {
    d.path('M8 40 Q12 18 32 16 Q52 18 56 40 Z', 2);
    for (const [x, y] of [[22, 28], [32, 24], [42, 28], [27, 35], [37, 35]]) d.circ(x, y, 3.2, 1.4);
    d.ell(58, 36, 5, 4, 2.6);
    d.px(59, 35, 0);
    for (const x of [14, 26, 40, 50]) d.rect(x - 2, 38, 5, 6, 2.6);
  },
  phantom(d) {
    d.path('M14 44 Q10 26 20 14 Q32 2 44 14 Q54 26 50 44 Q46 38 42 44 Q38 38 34 44 Q30 38 26 44 Q22 38 18 44 Z', 3);
    d.ell(26, 20, 3, 4, 0);
    d.ell(38, 20, 3, 4, 0);
    d.ell(32, 30, 4, 3, 0);
    d.line(14, 26, 4, 18, 3, 3);
    d.line(50, 26, 60, 18, 3, 3);
  },
  wind(d) {
    for (let i = 0; i < 4; i++) {
      d.stroke(`M6 ${10 + i * 9} Q24 ${2 + i * 9} 38 ${10 + i * 9} T58 ${8 + i * 9}`, 3, 3);
      d.stroke(`M52 ${8 + i * 9} q6 -4 4 -6`, 3, 2);
    }
  },
  djinn(d, r, a) {
    const t = a.dark ? 0.6 : a.green ? 1.4 : 2;
    d.path(`M28 46 Q20 40 30 34 Q40 30 34 24 L40 22 Q48 30 36 38 Q30 44 40 46 Z`, t + 0.5);
    humanoid(d, { y: 30, h: 26, body: t, skin: t + 0.8, noLegs: true, bulk: true, hair: 0.4, eyeTone: 3 });
    d.line(24, 20, 14, 10, t, 4);
    d.line(40, 20, 50, 10, t, 4);
    d.circ(14, 9, 2.5, t + 0.8);
    d.circ(50, 9, 2.5, t + 0.8);
    d.rect(29, 6, 6, 2, 3);
  },
  air_elemental(d, r) {
    d.path('M16 46 Q8 30 18 20 Q20 6 32 6 Q44 6 46 20 Q56 30 48 46 Q40 38 32 46 Q24 38 16 46 Z', 3);
    d.stroke('M20 30 Q32 22 44 30', 2, 2);
    d.stroke('M22 38 Q32 32 42 38', 2, 2);
    d.ell(26, 16, 3, 2, 1);
    d.ell(38, 16, 3, 2, 1);
  },
  water_elemental(d, r) {
    d.path('M10 46 Q14 30 20 26 Q16 14 26 8 Q34 4 40 10 Q48 16 44 26 Q52 32 54 46 Z', 2);
    d.stroke('M18 34 Q26 30 30 36 T44 34', 3, 2);
    d.stroke('M22 40 Q30 36 34 42 T48 40', 3, 2);
    d.ell(28, 16, 2.5, 2, 3);
    d.ell(38, 16, 2.5, 2, 3);
    d.line(20, 26, 8, 16, 2, 4);
    d.line(44, 26, 56, 16, 2, 4);
  },
  serpent(d) {
    const end = serpentBody(d, 2, 34, 50, 7, 7, 2, 0.5);
    d.ell(end[0] + 4, end[1] - 6, 6, 4, 2, -0.6);
    d.poly([[end[0] + 6, end[1] - 4], [end[0] + 12, end[1] - 1], [end[0] + 8, end[1] - 7]], 3);
    d.px(end[0] + 4, end[1] - 8, 0);
    for (let x = 8; x < 50; x += 6) d.poly([[x, 30], [x + 2, 25], [x + 4, 30]], 1);
  },
  counter(d) {
    d.circ(32, 24, 16, 2);
    d.circ(32, 24, 12, 3);
    d.line(22, 14, 42, 34, 0.6, 4);
    d.path('M14 30 Q8 20 16 14 L22 20 Z', 2.6);
    d.path('M50 30 Q56 20 48 14 L42 20 Z', 2.6);
  },
  drain(d) {
    for (let i = 0; i < 4; i++) d.arc(32, 24, 6 + i * 5, i, i + 4, 3 - i * 0.4, 2);
    d.circ(32, 24, 4, 0.5);
  },
  scroll(d) {
    d.rect(14, 12, 36, 24, 3);
    d.ell(14, 24, 4, 13, 2);
    d.ell(50, 24, 4, 13, 2);
    for (let y = 16; y < 34; y += 4) d.line(20, y, 44, y, 1.4, 1);
  },
  clock(d) {
    d.circ(32, 24, 17, 3);
    d.arc(32, 24, 17, 0, PI * 2, 1, 2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      d.px(32 + Math.cos(a) * 14, 24 + Math.sin(a) * 14, 0);
    }
    d.line(32, 24, 32, 12, 0.5, 2);
    d.line(32, 24, 41, 28, 0.5, 2);
  },
  brain(d) {
    d.ell(32, 22, 18, 13, 3);
    d.stroke('M20 16 Q26 12 30 18 T40 16 T46 22', 1.6, 1.6);
    d.stroke('M18 26 Q24 22 28 28 T38 26 T48 28', 1.6, 1.6);
    d.line(32, 10, 32, 34, 1.6, 1.4);
    for (let i = 0; i < 5; i++) d.line(22 + i * 5, 36, 18 + i * 7, 46, 2.4, 2);
  },
  vanish(d, r) {
    humanoid(d, { body: 2.6, skin: 3, legs: 2.6, hair: 2 });
    for (let i = 0; i < 20; i++) d.px(36 + r() * 24, 8 + r() * 36, 3);
  },
  mindblast(d) {
    humanoid(d, { y: 46, body: 1, skin: 3, hair: 0.6 });
    for (let i = 0; i < 3; i++) d.arc(32, 16, 8 + i * 6, PI * 1.1, PI * 1.9, 3, 2);
  },
  jump(d) {
    humanoid(d, { y: 36, h: 28, body: 2, skin: 3, hair: 1, weapon: 'spear' });
    d.line(20, 44, 44, 44, 1, 2);
  },
  wings(d) {
    wings(d, 32, 28, 1.3, 'angel', 3);
    d.circ(32, 28, 3, 2);
  },
  puppet(d) {
    humanoid(d, { y: 46, h: 28, body: 2, skin: 3, hair: 1 });
    d.rect(10, 4, 44, 3, 1);
    for (const [x1, x2, y2] of [[18, 22, 30], [32, 32, 16], [46, 42, 30]]) d.line(x1, 6, x2, y2, 3, 1);
  },

  // ------------------------------------------------------------- Black
  ritual(d, r) {
    d.circ(32, 30, 14, 1);
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * PI * 2 - PI / 2;
      const a2 = ((i + 2) / 5) * PI * 2 - PI / 2;
      d.line(32 + Math.cos(a1) * 13, 30 + Math.sin(a1) * 9, 32 + Math.cos(a2) * 13, 30 + Math.sin(a2) * 9, 3, 1.4);
    }
    for (const x of [12, 52]) {
      d.rect(x - 2, 30, 4, 12, 3);
      flame(d, x, 30, 2.5, 7, 3);
    }
    d.ell(32, 12, 10, 7, 0.4);
    d.circ(28, 11, 1.5, 3);
    d.circ(36, 11, 1.5, 3);
  },
  rat(d) {
    quad(d, { x: 28, y: 42, len: 26, ht: 12, tone: 1.4, head: 'rat', headR: 4, legW: 2, belly: 2.2 });
  },
  wisp(d) {
    d.glow(32, 22, 18, 3, 1);
    d.circ(32, 22, 7, 3);
    d.path('M26 24 Q22 36 30 44 Q30 34 34 28 Z', 3);
  },
  skeleton(d) {
    humanoid(d, { body: 3, skin: 3, legs: 3, skull: true, weapon: 'sword', arm: 3 });
    for (let y = 24; y < 32; y += 2) d.line(28, y, 36, y, 0.6, 1);
  },
  imp(d) {
    humanoid(d, { y: 40, h: 22, body: 1, skin: 1.6, wings: 'bat', wingTone: 0.8, ears: 'goblin', horns: 0.6, grin: true, claws: true });
  },
  zombie(d) {
    humanoid(d, { body: 1, skin: 2, legs: 0.8, hunch: true, hair: 0.4, claws: true, eyeTone: 3 });
    d.rect(26, 26, 3, 3, 0.4);
  },
  shade(d) {
    d.path('M20 46 Q18 24 32 10 Q46 24 44 46 Q38 40 32 46 Q26 40 20 46 Z', 2.6);
    d.ell(28, 20, 2, 3, 0);
    d.ell(36, 20, 2, 3, 0);
    for (let i = 0; i < 5; i++) d.px(10 + i * 11, 6 + (i % 3) * 8, 3);
  },
  assassin(d) {
    humanoid(d, { body: 0.6, skin: 2.6, legs: 0.4, hood: 0.8, eyes: 3, weapon: 'dagger', cape: 0.4 });
  },
  specter(d) {
    quad(d, { x: 26, y: 46, len: 26, ht: 14, tone: 0.8, head: 'horse', mane: 0.3, tail: true });
    humanoid(d, { x: 26, y: 34, h: 22, body: 1.4, skin: 2, noLegs: true, hood: 1, eyes: 3, wings: 'bat', wingTone: 1 });
  },
  oldman(d) {
    humanoid(d, { body: 0.8, skin: 2.6, robe: true, hunch: true, hair: 3, beard: 3, weapon: 'staff', lowWeapon: true });
  },
  wraith(d) {
    d.path('M18 46 Q14 28 24 18 L40 18 Q50 28 46 46 Q40 38 36 46 Q32 38 28 46 Q24 38 18 46 Z', 1);
    d.circ(32, 14, 7, 1);
    d.ell(32, 15, 4, 5, 0);
    d.px(30, 14, 3);
    d.px(34, 14, 3);
    d.line(22, 24, 10, 32, 1, 3);
    d.line(42, 24, 54, 32, 1, 3);
  },
  vampire(d) {
    humanoid(d, { body: 0.6, skin: 3, legs: 0.4, cape: 0.3, hair: 0.2, wings: 'bat', wingTone: 0.8, chest: 2 });
    d.px(30, 13, 3);
    d.px(34, 13, 3);
  },
  nightmare(d) {
    quad(d, { x: 30, y: 44, len: 32, ht: 20, tone: 0.8, head: 'horse', mane: 3, tail: true, stride: true });
    for (const x of [16, 26, 34, 44]) flame(d, x, 46, 3, 6, 3);
    d.px(49, 20, 3);
  },
  skull(d) {
    d.circ(32, 20, 14, 3);
    d.rect(23, 28, 18, 10, 3);
    d.ell(26, 20, 4, 5, 0);
    d.ell(38, 20, 4, 5, 0);
    d.poly([[32, 26], [30, 30], [34, 30]], 0);
    for (let x = 25; x < 40; x += 3) d.rect(x, 34, 1, 4, 0);
  },
  deathhand(d) {
    d.path('M20 46 L22 26 L18 12 L22 11 L26 22 L26 8 L30 8 L31 22 L33 6 L37 7 L36 22 L40 10 L44 12 L40 26 L46 22 L48 25 L40 36 L38 46 Z', 2.6);
    d.glow(32, 10, 14, 1, 0.6);
  },
  pit(d) {
    d.ell(32, 30, 24, 10, 0.2);
    d.ell(32, 28, 20, 7, 0);
    for (let i = 0; i < 8; i++) d.poly([[8 + i * 7, 24], [11 + i * 7, 18], [14 + i * 7, 24]], 1.4);
  },
  aura_dark(d, r) {
    humanoid(d, { body: 0.8, skin: 2.4, legs: 0.6, bulk: true, horns: 2, eyeTone: 3, claws: true });
    d.arc(32, 26, 19, 0, PI * 2, 1, 2);
  },
  twist(d) {
    for (let i = 0; i < 40; i++) {
      const a = i * 0.45;
      const rr = 2 + i * 0.5;
      d.circ(32 + Math.cos(a) * rr, 24 + Math.sin(a) * rr * 0.8, 1.6, 3 - i * 0.05);
    }
  },
  demon(d) {
    humanoid(d, { y: 48, h: 40, body: 0.8, skin: 1.4, bulk: true, horns: 2.4, wings: 'bat', wingTone: 0.6, claws: true, eyeTone: 3, grin: true });
  },
  raisehand(d) {
    d.path('M10 40 L54 40 L54 48 L10 48 Z', 0.6);
    d.path('M24 40 L26 26 L22 16 L26 15 L29 24 L29 12 L32 12 L33 24 L35 11 L38 12 L37 24 L41 16 L44 18 L39 30 L38 40 Z', 3);
    d.path('M44 40 L44 24 Q48 18 52 24 L52 40 Z', 1.6);
  },

  // ------------------------------------------------------------- Red
  goblin(d) {
    humanoid(d, { y: 46, h: 28, body: 1, skin: 2, legs: 0.6, ears: 'goblin', nose: 'long', grin: true, weapon: 'dagger', hunch: true, belt: true });
  },
  goblin_hero(d) {
    humanoid(d, { y: 46, h: 30, body: 2.4, skin: 2, legs: 1, ears: 'goblin', nose: 'long', helmet: 1.4, weapon: 'axe', shield: 1.6 });
  },
  goblin_king(d) {
    humanoid(d, { y: 46, h: 30, body: 1, skin: 2, legs: 0.6, ears: 'goblin', nose: 'long', crown: 3, cape: 2.4, weapon: 'mace', grin: true });
  },
  ape(d) {
    humanoid(d, { y: 46, h: 30, body: 1.4, skin: 2.4, legs: 1.4, bulk: true, hunch: true, hair: 1, snout: true, arm: 1.4 });
  },
  balloon(d) {
    d.circ(32, 14, 12, 2);
    d.arc(32, 14, 12, PI * 0.1, PI * 0.9, 1, 1.5);
    d.line(24, 22, 26, 32, 1, 1);
    d.line(40, 22, 38, 32, 1, 1);
    d.rect(24, 32, 16, 8, 1);
    for (const x of [27, 33]) {
      d.circ(x + 1, 30, 2.5, 2.6);
      d.poly([[x - 2, 30], [x - 4, 26], [x, 29]], 2.6);
    }
  },
  ogre(d) {
    humanoid(d, { y: 47, h: 38, body: 1.6, skin: 2.2, legs: 1, bulk: true, hair: 0.6, weapon: 'mace', belt: true, grin: true });
  },
  troll(d) {
    humanoid(d, { y: 47, h: 36, body: 1.4, skin: 1.8, legs: 1.2, bulk: true, hunch: true, longHair: 0.6, nose: 'long', claws: true });
  },
  minotaur(d) {
    humanoid(d, { y: 47, h: 36, body: 1.4, skin: 1.6, legs: 1, bulk: true, horns: 3, snout: true, weapon: 'axe', belt: true });
  },
  stonewall(d) {
    for (let y = 6; y < 46; y += 7) {
      for (let x = (y / 7) % 2 ? -4 : 0; x < 64; x += 10) {
        d.rect(x + 1, y + 1, 8, 5, 2.2);
        d.rect(x + 1, y + 1, 8, 1, 2.8);
      }
    }
  },
  cannon(d) {
    d.ell(28, 36, 16, 6, 1);
    d.line(20, 32, 50, 20, 1.4, 8);
    d.circ(52, 19, 3, 0);
    d.circ(18, 40, 6, 2);
    d.circ(38, 40, 6, 2);
    d.circ(18, 40, 2, 0.6);
    d.circ(38, 40, 2, 0.6);
    humanoid(d, { x: 10, y: 46, h: 20, body: 1.6, skin: 2, ears: 'goblin', hunch: true });
  },
  whelp(d) {
    dragonShape(d, { x: 26, y: 26, s: 0.85, tone: 1.4, wing: 2.4, belly: 3 });
  },
  dragon(d) {
    dragonShape(d, { x: 24, y: 26, s: 1, tone: 0.8, wing: 1.8, belly: 2.6, fire: true });
  },
  ball(d) {
    d.glow(32, 24, 22, 3, 1);
    d.circ(32, 24, 10, 3);
    bolt(d, [[32, 24], [44, 16], [48, 22], [58, 12]], 3, 1.8);
    bolt(d, [[32, 24], [18, 32], [14, 26], [4, 36]], 3, 1.8);
    bolt(d, [[32, 24], [26, 10], [32, 6], [28, 0]], 3, 1.8);
  },
  giant(d) {
    humanoid(d, { y: 48, h: 44, body: 1.6, skin: 2.6, legs: 1, bulk: true, beard: 1, hair: 1, weapon: 'mace', belt: true });
  },
  earth_elemental(d, r) {
    elementalBlob(d, r, 32, 26, 14, 14, 1.4, 2.2);
    d.line(20, 24, 8, 36, 1.4, 6);
    d.line(44, 24, 56, 36, 1.4, 6);
    d.rect(22, 38, 7, 10, 1.4);
    d.rect(35, 38, 7, 10, 1.4);
    d.rect(26, 18, 3, 2, 3);
    d.rect(35, 18, 3, 2, 3);
  },
  fire_elemental(d) {
    flame(d, 32, 48, 18, 46, 2);
    flame(d, 32, 46, 11, 32, 3);
    d.ell(28, 20, 2, 3, 0.5);
    d.ell(36, 20, 2, 3, 0.5);
    d.line(18, 26, 6, 14, 2, 5);
    d.line(46, 26, 58, 14, 2, 5);
  },
  bolt(d) {
    // the video's Lightning Bolt: a forked bolt striking a figure
    bolt(d, [[24, 0], [20, 10], [27, 15], [22, 26], [30, 32], [26, 46]], 3, 4);
    bolt(d, [[27, 15], [38, 20], [36, 26], [44, 34]], 3, 2.5);
    bolt(d, [[22, 26], [12, 30], [10, 38]], 3, 2);
    humanoid(d, { x: 52, y: 46, h: 20, body: 1, skin: 3, hair: 0.6 });
  },
  chain(d) {
    bolt(d, [[4, 10], [16, 20], [12, 26], [26, 30], [24, 36], [40, 34], [38, 40], [60, 44]], 3, 3);
    for (const [x, y] of [[16, 20], [26, 30], [40, 34]]) d.circ(x, y, 3, 3);
  },
  hammer(d) {
    d.line(14, 42, 40, 16, 1, 3);
    d.poly([[34, 6], [52, 22], [44, 30], [26, 14]], 2);
    d.poly([[36, 9], [49, 22], [46, 25], [32, 12]], 3);
  },
  axe(d) {
    d.line(20, 46, 36, 6, 1, 3);
    d.path('M34 4 Q56 2 54 22 L40 18 Q38 10 34 12 Z', 3);
    d.path('M37 11 Q44 8 46 14', 2);
    humanoid(d, { x: 14, y: 46, h: 22, body: 1, skin: 2.4, legs: 0.6, hair: 0.4 });
  },
  fireball(d) {
    d.glow(36, 22, 22, 3, 1);
    d.circ(38, 20, 10, 3);
    d.path('M30 26 Q12 34 2 46 Q20 40 28 36 Q16 46 12 48 Q30 42 36 30 Z', 2);
    d.circ(38, 20, 5, 2.4);
  },
  disintegrate(d, r) {
    humanoid(d, { body: 2, skin: 3, legs: 2, hair: 1 });
    for (let i = 0; i < 30; i++) {
      const x = 32 + r() * 28;
      const y = 6 + r() * 38;
      d.rect(x, y, 2, 2, 3);
    }
  },
  quake(d) {
    d.path('M0 30 L64 30 L64 48 L0 48 Z', 1.4);
    d.stroke('M0 34 L10 38 L18 33 L26 40 L34 35 L42 41 L52 34 L64 38', 0, 2);
    d.stroke('M26 40 L28 48', 0, 2);
    d.stroke('M42 41 L40 48', 0, 2);
    for (let i = 0; i < 6; i++) d.rect(6 + i * 10, 20 + (i % 2) * 4, 4, 4, 2);
  },
  shatter(d, r) {
    d.circ(32, 24, 4, 3);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 + r();
      const x = 32 + Math.cos(a) * (10 + r() * 12);
      const y = 24 + Math.sin(a) * (8 + r() * 10);
      d.poly([[x, y], [x + 3 + r() * 3, y + 1], [x + 1, y + 4 + r() * 2]], 2 + r());
    }
  },
  rocks(d, r) {
    for (let i = 0; i < 9; i++) {
      const x = 6 + r() * 52;
      const y = 4 + r() * 30;
      d.ell(x, y, 3 + r() * 3, 3 + r() * 2, 1.4);
      d.line(x + 3, y - 3, x + 9, y - 10, 2.6, 1.4);
    }
  },

  // ------------------------------------------------------------- Green
  elf(d) {
    humanoid(d, { body: 1.6, skin: 3, legs: 1, ears: 'elf', longHair: 2.6, weapon: 'staff', lowWeapon: true, belt: true, hood: undefined });
    d.glow(44, 20, 8, 3, 0.8);
  },
  bird(d) {
    // the video's Birds of Paradise: a white bird gliding over the sea
    birdShape(d, 34, 26, 40, 3, { beak: 2 });
    d.poly([[22, 30], [12, 36], [20, 32]], 3);
  },
  faerie(d) {
    humanoid(d, { y: 40, h: 22, body: 2, skin: 3, legs: 2, hair: 1, wings: 'angel', wingTone: 3 });
    d.glow(32, 22, 16, 3, 0.5);
  },
  dryad(d) {
    humanoid(d, { body: 2, skin: 3, robe: true, longHair: 1, ears: 'elf' });
    for (let i = 0; i < 5; i++) d.circ(22 + i * 5, 10 + (i % 2) * 2, 2.5, 2.6);
  },
  woodwall(d) {
    for (let x = 4; x < 64; x += 8) {
      d.rect(x, 8, 7, 40, 2);
      d.poly([[x, 8], [x + 3.5, 2], [x + 7, 8]], 2);
      d.line(x + 2, 12, x + 2, 44, 1.2, 1);
    }
    d.rect(0, 18, 64, 3, 1);
    d.rect(0, 34, 64, 3, 1);
  },
  bear(d) {
    quad(d, { x: 28, y: 44, len: 32, ht: 22, tone: 1.4, head: 'bear', headR: 6, legW: 5, belly: 2 });
  },
  archer(d) {
    humanoid(d, { body: 1.6, skin: 3, legs: 1, ears: 'elf', hood: 1, eyes: 3, weapon: 'bow', lowWeapon: false });
  },
  bees(d, r) {
    for (let i = 0; i < 6; i++) {
      const x = 10 + r() * 44;
      const y = 8 + r() * 30;
      d.ell(x, y, 4, 2.6, 3);
      d.rect(x - 1, y - 2.5, 1.2, 5, 0);
      d.rect(x + 1.5, y - 2.5, 1.2, 5, 0);
      d.ell(x - 1, y - 4, 2.5, 1.5, 2.4);
    }
  },
  spider(d) {
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const sx = 32 + dir * 4;
        const sy = 24 + i * 2;
        d.stroke(`M${sx} ${sy} Q${sx + dir * 14} ${sy - 12 + i * 3} ${sx + dir * 22} ${sy + 14 + i * 2}`, 0.8, 1.8);
      }
    }
    d.ell(32, 30, 9, 8, 0.8);
    d.ell(32, 21, 5, 4, 1.4);
    d.px(30, 20, 3);
    d.px(34, 20, 3);
    d.line(32, 0, 32, 17, 3, 1);
  },
  mammoth(d) {
    quad(d, { x: 28, y: 44, len: 34, ht: 26, tone: 1.4, head: 'none', legW: 6, belly: 2 });
    d.circ(46, 20, 9, 1.4);
    d.stroke('M52 24 Q60 34 54 44', 1.4, 4);
    d.stroke('M48 26 Q58 30 60 22', 3, 2);
    d.px(48, 17, 0);
    d.path('M10 18 Q20 10 36 14', 1);
  },
  treefolk(d) {
    d.rect(24, 16, 16, 32, 1);
    d.line(28, 18, 28, 46, 0.4, 1);
    d.line(36, 20, 36, 46, 0.4, 1);
    for (let i = 0; i < 8; i++) d.circ(18 + (i % 4) * 9, 8 + Math.floor(i / 4) * 7, 7, 2);
    d.line(24, 22, 10, 30, 1, 4);
    d.line(40, 22, 54, 30, 1, 4);
    d.rect(28, 24, 2, 3, 3);
    d.rect(34, 24, 2, 3, 3);
  },
  wurm(d) {
    const end = serpentBody(d, 0, 34, 50, 6, 12, 1.4, 1.2);
    d.ell(end[0] + 2, end[1] - 4, 8, 7, 1.4);
    d.ell(end[0] + 6, end[1] - 2, 4, 4, 0);
    for (let i = 0; i < 5; i++) d.poly([[end[0] + 4 + i, end[1] - 6 + i * 2], [end[0] + 7 + i, end[1] - 4 + i * 2], [end[0] + 4 + i, end[1] - 3 + i * 2]], 3);
    for (let x = 6; x < 46; x += 5) d.line(x, 30, x + 2, 38, 2.4, 1);
  },
  force(d, r) {
    d.path('M12 48 Q8 26 20 16 Q26 4 36 6 Q50 8 52 22 Q60 34 54 48 Z', 1);
    for (let i = 0; i < 10; i++) d.circ(14 + r() * 36, 6 + r() * 16, 3 + r() * 3, 2);
    d.ell(26, 26, 3, 2, 3);
    d.ell(40, 26, 3, 2, 3);
    d.line(14, 30, 2, 20, 1, 6);
    d.line(52, 30, 62, 18, 1, 6);
  },
  growth(d) {
    humanoid(d, { y: 47, h: 38, body: 1.6, skin: 3, legs: 1, bulk: true, hair: 1, arm: 3 });
    for (const [x, y] of [[10, 10], [54, 10], [8, 30], [56, 30]]) {
      d.line(x, y, x + (x < 32 ? 4 : -4), y + 4, 3, 2);
      d.line(x, y, x + (x < 32 ? 4 : -4), y - 2, 3, 2);
    }
  },
  berserk(d) {
    humanoid(d, { y: 47, h: 38, body: 0.8, skin: 3, legs: 0.6, bulk: true, longHair: 0.4, weapon: 'axe', grin: true });
    d.ell(32, 12, 3, 1.5, 0);
  },
  mist(d) {
    for (let i = 0; i < 6; i++) d.ell(10 + i * 9, 18 + (i % 2) * 10, 12, 5, 3);
  },
  stream(d) {
    d.stroke('M4 0 Q20 14 12 24 T30 40 T44 48', 3, 7);
    d.stroke('M4 0 Q20 14 12 24 T30 40 T44 48', 2, 3);
    for (const [x, y] of [[40, 12], [50, 20], [46, 30]]) d.circ(x, y, 2.5, 3);
  },
  tornado(d) {
    for (let i = 0; i < 8; i++) {
      const y = 4 + i * 5.5;
      const w = 22 - i * 2.4;
      d.ell(32 + Math.sin(i) * 3, y, w, 2.6, 3 - (i % 2) * 0.8);
    }
    d.line(34, 44, 30, 48, 3, 2);
  },
  calm(d) {
    d.circ(32, 20, 12, 3);
    for (let i = 0; i < 3; i++) d.ell(32, 34 + i * 4, 26 - i * 5, 1.5, 2.6);
    d.path('M24 18 Q32 26 40 18', 1);
  },

  // ------------------------------------------------------------- Artifacts
  lotus(d) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      d.ell(32 + Math.cos(a) * 9, 26 + Math.sin(a) * 6, 8, 4, 0.6, a);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.3;
      d.ell(32 + Math.cos(a) * 5, 24 + Math.sin(a) * 3, 6, 3, 1.4, a);
    }
    d.circ(32, 23, 4, 2.6);
    d.path('M0 40 Q32 34 64 40 L64 48 L0 48 Z', 1.2);
  },
  ring(d) {
    d.ell(32, 26, 18, 12, 3);
    d.ell(32, 26, 12, 7, 0.4);
    d.ell(32, 22, 18, 3, 2);
    d.glow(32, 26, 26, 3, 0.4);
    d.circ(32, 14, 4, 2);
  },
  gem(d) {
    d.poly([[32, 6], [48, 18], [42, 40], [22, 40], [16, 18]], 2);
    d.poly([[32, 6], [40, 18], [32, 40], [24, 18]], 3);
    d.poly([[16, 18], [24, 18], [22, 40]], 1);
    d.line(16, 18, 48, 18, 1, 1);
    d.line(10, 42, 54, 42, 0.6, 3);
  },
  stone(d) {
    d.ell(32, 30, 18, 12, 1.4);
    d.ell(28, 26, 8, 5, 2.4);
    d.glow(32, 26, 10, 3, 0.6);
  },
  thopter(d) {
    d.ell(32, 26, 10, 5, 2);
    d.circ(42, 24, 4, 2);
    d.poly([[24, 24], [6, 10], [10, 22]], 3);
    d.poly([[30, 22], [20, 6], [34, 20]], 3);
    d.line(6, 10, 26, 24, 1, 1.2);
    d.line(22, 26, 12, 34, 1, 2);
    d.px(43, 23, 0);
  },
  engine(d) {
    dragonShape(d, { x: 24, y: 28, s: 0.9, tone: 1.4, wing: 2, belly: 2 });
    gearShape(d, 22, 32, 4, 2.6);
  },
  statue(d) {
    humanoid(d, { body: 2, skin: 2, legs: 2, arm: 2, bulk: true, hair: 2 });
    d.rect(16, 44, 32, 4, 1);
  },
  juggernaut(d) {
    d.path('M6 40 Q4 16 30 12 L50 14 Q58 24 58 40 Z', 1.4);
    for (let x = 12; x < 56; x += 7) d.poly([[x, 14], [x + 3, 4], [x + 6, 14]], 2.6);
    d.circ(52, 26, 4, 3);
    d.px(53, 25, 0);
    d.rect(4, 40, 56, 6, 0.6);
    for (let x = 8; x < 60; x += 6) d.circ(x, 43, 2, 1.8);
  },
  golem(d) {
    humanoid(d, { y: 48, h: 42, body: 0.8, skin: 1.4, legs: 0.6, bulk: true, arm: 0.8, eyeTone: 3 });
    for (const [x, y] of [[28, 22], [36, 28], [30, 34]]) d.line(x, y, x + 3, y + 2, 2.4, 1);
  },
  minecart(d) {
    d.poly([[12, 22], [52, 22], [48, 40], [16, 40]], 1.4);
    for (let i = 0; i < 5; i++) d.circ(18 + i * 7, 20, 4, 2.4);
    d.circ(20, 42, 4, 0.6);
    d.circ(44, 42, 4, 0.6);
    for (let i = 0; i < 3; i++) d.arc(32, 8, 4 + i * 3, PI * 1.2, PI * 1.8, 3, 1.4);
  },
  ankh(d) {
    d.ell(32, 14, 7, 9, 2.6);
    d.ell(32, 14, 3, 5, 0.2);
    d.rect(29, 22, 6, 24, 2.6);
    d.rect(18, 22, 28, 5, 2.6);
  },
  icy(d) {
    d.rect(20, 30, 24, 14, 1.4);
    d.poly([[22, 30], [32, 6], [42, 30]], 2.6);
    d.poly([[28, 30], [32, 14], [36, 30]], 3);
    for (const x of [14, 50]) d.poly([[x - 4, 44], [x, 30], [x + 4, 44]], 3);
  },
  rod(d) {
    d.line(12, 44, 48, 8, 1.4, 4);
    d.circ(50, 6, 5, 3);
    d.glow(50, 6, 10, 3, 0.8);
    for (let i = 0; i < 3; i++) d.line(16 + i * 8, 38 - i * 8, 20 + i * 8, 40 - i * 8, 2.6, 1.4);
  },
  tome(d) {
    d.poly([[10, 18], [32, 12], [54, 18], [54, 40], [32, 34], [10, 40]], 3);
    d.line(32, 12, 32, 34, 1, 1.6);
    for (let y = 20; y < 34; y += 4) {
      d.line(14, y + 1, 28, y - 2, 1.6, 1);
      d.line(36, y - 2, 50, y + 1, 1.6, 1);
    }
    d.glow(32, 12, 10, 3, 0.7);
  },
  millstone(d) {
    d.ell(32, 30, 22, 10, 1.6);
    d.ell(32, 26, 22, 10, 2.4);
    d.ell(32, 26, 4, 2, 0.4);
    d.line(32, 26, 32, 8, 1, 3);
  },
  carpet(d) {
    d.path('M6 26 Q20 18 32 26 T58 22 L58 32 Q44 38 32 32 T6 36 Z', 2);
    d.stroke('M8 30 Q20 24 32 30 T56 26', 3, 1.4);
    humanoid(d, { x: 32, y: 28, h: 18, body: 1, skin: 3, noLegs: true, hood: 2.6, eyes: 0 });
  },
  city(d) {
    for (const [x, w, h] of [[8, 8, 18], [18, 10, 26], [30, 8, 32], [40, 10, 22], [52, 8, 16]]) {
      d.rect(x, 44 - h, w, h, 2.6);
      d.ell(x + w / 2, 44 - h, w / 2, 3, 3);
      d.poly([[x + w / 2 - 1, 44 - h - 2], [x + w / 2, 44 - h - 8], [x + w / 2 + 1, 44 - h - 2]], 3);
    }
  },
};
