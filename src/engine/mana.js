// Mana costs and automatic payment.
//
// Costs are compact strings in the style of the card's printed cost:
//   "2RR"  -> two generic + two red
//   "XR"   -> X generic + one red
//   "UU", "0", ""  etc.

export const COLORS = ['W', 'U', 'B', 'R', 'G'];
export const COLOR_NAMES = { W: 'WHITE', U: 'BLUE', B: 'BLACK', R: 'RED', G: 'GREEN', C: 'COLORLESS' };

const parseCache = new Map();

export function parseCost(str) {
  str = str || '';
  if (parseCache.has(str)) return parseCache.get(str);
  const cost = { generic: 0, W: 0, U: 0, B: 0, R: 0, G: 0, X: 0 };
  const m = str.match(/^\d+/);
  if (m) cost.generic = parseInt(m[0], 10);
  for (const ch of str.slice(m ? m[0].length : 0)) {
    if (ch in cost) cost[ch]++;
  }
  Object.freeze(cost);
  parseCache.set(str, cost);
  return cost;
}

export function manaValue(str) {
  const c = parseCost(str);
  return c.generic + c.W + c.U + c.B + c.R + c.G;
}

export function costColors(str) {
  const c = parseCost(str);
  return COLORS.filter((k) => c[k] > 0);
}

// Concrete cost after choosing X.
export function withX(str, x) {
  const c = parseCost(str);
  return { ...c, generic: c.generic + c.X * (x || 0), X: 0 };
}

export function emptyPool() {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function poolTotal(pool) {
  return pool.W + pool.U + pool.B + pool.R + pool.G + pool.C;
}

// Plan how to pay `cost` (a parsed cost object with X already applied) using
// mana already in `pool` plus untapped `sources`.
//
// sources: [{ iid, produces: ['R'] | ['W','U','B','R','G'] | ['C'], amount, rank }]
//   rank: lower is preferred to tap (lands 0, artifacts 1, creatures 2)
// opts.keep: { color: weight } — colors the payer would like to keep open, so
//   generic costs prefer sources that do not produce them.
//
// Returns { pool: {...spent from pool}, taps: [{ iid, color, amount, used }] } or null.
// `amount - used` is surplus mana that floats in the pool.
export function planPayment(pool, sources, cost, opts = {}) {
  const need = { W: cost.W, U: cost.U, B: cost.B, R: cost.R, G: cost.G };
  let generic = cost.generic;
  const left = { ...pool };
  const spent = emptyPool();

  for (const c of COLORS) {
    const take = Math.min(left[c], need[c]);
    left[c] -= take;
    spent[c] += take;
    need[c] -= take;
  }

  const units = [];
  for (const c of COLORS) for (let i = 0; i < need[c]; i++) units.push(c);
  // Scarcest colours first so the search fails fast.
  const supply = (c) => sources.filter((s) => s.produces.includes(c)).length;
  units.sort((a, b) => supply(a) - supply(b));

  const keep = opts.keep || {};
  const flexibility = (s) => (s.produces.length === 5 ? 6 : s.produces.length);
  const ordered = [...sources].sort(
    (a, b) => a.rank - b.rank || flexibility(a) - flexibility(b) || (a.amount || 1) - (b.amount || 1),
  );

  const used = new Set();
  const taps = [];
  const assign = (i) => {
    if (i === units.length) return true;
    const color = units[i];
    for (const s of ordered) {
      if (used.has(s.iid) || !s.produces.includes(color)) continue;
      used.add(s.iid);
      taps.push({ iid: s.iid, color, amount: s.amount || 1, used: 1 });
      if (assign(i + 1)) return true;
      used.delete(s.iid);
      taps.pop();
    }
    return false;
  };
  if (!assign(0)) return null;

  // Extra mana produced by multi-mana colored sources (rare) is credited back.
  for (const t of taps) {
    if (t.amount > 1) {
      const use = Math.min(t.amount - 1, generic);
      t.used += use;
      generic -= use;
    }
  }

  // Generic: pool first, then the least valuable sources.
  for (const c of [...COLORS, 'C']) {
    const take = Math.min(left[c], generic);
    left[c] -= take;
    spent[c] += take;
    generic -= take;
  }
  if (generic > 0) {
    const genericScore = (s) => {
      let score = s.rank * 10;
      if (s.produces.length === 1 && s.produces[0] === 'C') score -= 5;
      for (const c of s.produces) score += keep[c] || 0;
      if (s.produces.length >= 2) score += s.produces.length; // keep flexible sources
      return score;
    };
    const rest = ordered.filter((s) => !used.has(s.iid)).sort((a, b) => genericScore(a) - genericScore(b));
    for (const s of rest) {
      if (generic <= 0) break;
      used.add(s.iid);
      const use = Math.min(s.amount || 1, generic);
      taps.push({ iid: s.iid, color: s.produces[0], amount: s.amount || 1, used: use });
      generic -= use;
    }
    if (generic > 0) return null;
  }
  return { pool: spent, taps };
}

// Total mana that could be produced (used by the AI for quick estimates).
export function potentialMana(pool, sources) {
  return poolTotal(pool) + sources.reduce((n, s) => n + (s.amount || 1), 0);
}
