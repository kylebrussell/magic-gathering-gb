// Tiny Game Boy-flavoured chiptune engine: two pulse channels, a triangle
// "wave" channel and noise. Music is written as note strings:
//   "c5 e5 g5 c6:2 r g4:3/2"   note+octave, optional :length in beats
//   (fractions allowed), r = rest. "|" is ignored (bar lines).

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
const waves = {};
let noiseBuffer = null;
let current = null;
let settings = { music: true, sfx: true };

export function audioSettings(s) {
  settings = { ...settings, ...s };
  if (musicGain) musicGain.gain.value = settings.music ? 0.5 : 0;
  if (sfxGain) sfxGain.gain.value = settings.sfx ? 0.6 : 0;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.connect(master);
  sfxGain.connect(master);
  audioSettings(settings);
  for (const duty of [0.125, 0.25, 0.5]) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)) * 1;
    waves[duty] = ctx.createPeriodicWave(real, imag);
  }
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let lfsr = 1;
  for (let i = 0; i < data.length; i++) {
    const bit = (lfsr ^ (lfsr >> 1)) & 1;
    lfsr = (lfsr >> 1) | (bit << 14);
    data[i] = lfsr & 1 ? 1 : -1;
  }
  if (pendingSong) playMusic(pendingSong);
}

const NOTE = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };
function freq(name) {
  const m = name.match(/^([a-g]#?)(\d)$/);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function parse(str) {
  const out = [];
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [n, len = '1'] = tok.split(':');
    const [a, b] = len.split('/');
    out.push({ f: n === 'r' ? 0 : freq(n), beats: Number(a) / (b ? Number(b) : 1) });
  }
  return out;
}

function tone(dest, type, f, t0, dur, vol, opts = {}) {
  if (!ctx || !f) return;
  const g = ctx.createGain();
  g.connect(dest);
  let src;
  if (type === 'noise') {
    src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.playbackRate.value = f / 1000;
  } else {
    src = ctx.createOscillator();
    if (type === 'tri') src.type = 'triangle';
    else src.setPeriodicWave(waves[type] || waves[0.5]);
    src.frequency.setValueAtTime(f, t0);
    if (opts.slide) src.frequency.exponentialRampToValueAtTime(Math.max(20, f * opts.slide), t0 + dur);
  }
  const atk = 0.005;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + atk);
  const decay = opts.decay ?? 0.8;
  g.gain.setValueAtTime(vol, t0 + atk);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * (1 - decay) + 0.0001), t0 + dur * 0.95);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(g);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ---------------------------------------------------------------------------
// Music

const SONGS = {
  title: {
    bpm: 132,
    ch: [
      { type: 0.25, vol: 0.32, notes: 'e5:1/2 e5:1/2 e5:1/2 c5:1/2 e5 g5 r g4 r | c5:3/2 g4:3/2 e4:3/2 a4 b4 a#4:1/2 a4 | g4:2/3 e5:2/3 g5:2/3 a5 f5:1/2 g5 e5 c5:1/2 d5:1/2 b4:3/2' },
      { type: 0.5, vol: 0.18, notes: 'c5:1/2 c5:1/2 c5:1/2 g4:1/2 c5 e5 r e4 r | e4:3/2 c4:3/2 g3:3/2 c4 d4 c#4:1/2 c4 | c4:2/3 c5:2/3 e5:2/3 f5 d5:1/2 e5 c5 a4:1/2 b4:1/2 g4:3/2' },
      { type: 'tri', vol: 0.35, notes: 'c3 c3 c3 g2 c3 g2 r g2 | c3:3/2 g2:3/2 e2:3/2 f2 g2 f#2:1/2 f2 | e2:2/3 c3:2/3 e3:2/3 f3 d3:1/2 e3 c3 a2:1/2 b2:1/2 g2:3/2' },
    ],
  },
  map: {
    bpm: 120,
    ch: [
      { type: 0.25, vol: 0.28, notes: 'g4:1/2 c5:1/2 e5 d5:1/2 c5:1/2 d5 e5:1/2 g5:1/2 c6 b5:1/2 a5:1/2 g5:2 | a5:1/2 g5:1/2 f5 e5:1/2 d5:1/2 e5 c5:1/2 d5:1/2 e5 d5:1/2 b4:1/2 c5:2' },
      { type: 0.5, vol: 0.14, notes: 'e4 g4 g4 b4 c5 e5 d5 b4 | c5 b4 a4 g4 a4 c5 b4 g4' },
      { type: 'tri', vol: 0.32, notes: 'c3:1/2 g3:1/2 c3:1/2 g3:1/2 g2:1/2 d3:1/2 g2:1/2 d3:1/2 c3:1/2 g3:1/2 a2:1/2 e3:1/2 f2:1/2 c3:1/2 g2:1/2 d3:1/2 | f2:1/2 c3:1/2 c3:1/2 g3:1/2 a2:1/2 e3:1/2 e2:1/2 b2:1/2 f2:1/2 c3:1/2 g2:1/2 d3:1/2 c3:1/2 g3:1/2 c3:1' },
    ],
  },
  club: {
    bpm: 104,
    ch: [
      { type: 0.125, vol: 0.26, notes: 'e5:1/2 g5:1/2 a5 g5:1/2 e5:1/2 d5 c5:1/2 d5:1/2 e5:2 r | d5:1/2 e5:1/2 f5 e5:1/2 d5:1/2 c5 a4:1/2 b4:1/2 c5:2 r' },
      { type: 0.5, vol: 0.12, notes: 'c4:1/2 e4:1/2 g4:1/2 e4:1/2 c4:1/2 e4:1/2 g4:1/2 e4:1/2 a3:1/2 c4:1/2 e4:1/2 c4:1/2 a3:1/2 c4:1/2 e4:1/2 c4:1/2 | f3:1/2 a3:1/2 c4:1/2 a3:1/2 g3:1/2 b3:1/2 d4:1/2 b3:1/2 c4:1/2 e4:1/2 g4:1/2 e4:1/2 c4:1/2 e4:1/2 g4:1/2 e4:1/2' },
      { type: 'tri', vol: 0.3, notes: 'c3:2 a2:2 | f2 g2 c3:2' },
    ],
  },
  duel: {
    bpm: 152,
    ch: [
      { type: 0.25, vol: 0.28, notes: 'a4:1/2 a4:1/2 e5 a4:1/2 a4:1/2 f5 e5:1/2 d5:1/2 c5 b4 | a4:1/2 a4:1/2 e5 a4:1/2 a4:1/2 g5 f5:1/2 e5:1/2 d5 e5 | f5:1/2 f5:1/2 c6 f5:1/2 e5:1/2 d5 c5:1/2 b4:1/2 c5 a4 | b4:1/2 c5:1/2 d5 e5:1/2 f5:1/2 g#5 a5:2' },
      { type: 0.5, vol: 0.13, notes: 'e4:1/2 a4:1/2 c5:1/2 a4:1/2 e4:1/2 a4:1/2 c5:1/2 a4:1/2 f4:1/2 a4:1/2 d5:1/2 a4:1/2 e4:1/2 g#4:1/2 b4:1/2 g#4:1/2 | e4:1/2 a4:1/2 c5:1/2 a4:1/2 e4:1/2 a4:1/2 c5:1/2 a4:1/2 g4:1/2 b4:1/2 d5:1/2 b4:1/2 g#4:1/2 b4:1/2 e5:1/2 b4:1/2 | f4:1/2 a4:1/2 c5:1/2 a4:1/2 f4:1/2 a4:1/2 c5:1/2 a4:1/2 e4:1/2 a4:1/2 c5:1/2 a4:1/2 d4:1/2 f4:1/2 a4:1/2 f4:1/2 | e4:1/2 g#4:1/2 b4:1/2 g#4:1/2 e4:1/2 g#4:1/2 b4:1/2 d5:1/2 c5 b4 a4:2' },
      { type: 'tri', vol: 0.34, notes: 'a2:1/2 a3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2 d3:1/2 d4:1/2 d3:1/2 d4:1/2 e3:1/2 e4:1/2 e3:1/2 e4:1/2 | a2:1/2 a3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2 g2:1/2 g3:1/2 g2:1/2 g3:1/2 e2:1/2 e3:1/2 e2:1/2 e3:1/2 | f2:1/2 f3:1/2 f2:1/2 f3:1/2 f2:1/2 f3:1/2 f2:1/2 f3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2 d2:1/2 d3:1/2 d2:1/2 d3:1/2 | e2:1/2 e3:1/2 e2:1/2 e3:1/2 e2:1/2 e3:1/2 e2:1/2 e3:1/2 a2 e2 a2:2' },
      { type: 'noise', vol: 0.06, notes: 'c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2 c6:1/2 c4:1/2' },
    ],
  },
  boss: {
    bpm: 160,
    ch: [
      { type: 0.25, vol: 0.28, notes: 'd5:1/2 d5:1/2 a5 d5:1/2 d5:1/2 a#5 a5:1/2 g5:1/2 f5 e5 | d5:1/2 d5:1/2 a5 d5:1/2 d5:1/2 c6 a#5:1/2 a5:1/2 g5 a5 | a#5:1/2 a#5:1/2 f6 a#5:1/2 a5:1/2 g5 f5:1/2 e5:1/2 f5 d5 | e5:1/2 f5:1/2 g5 a5:1/2 a#5:1/2 c#6 d6:2' },
      { type: 0.125, vol: 0.14, notes: 'a4:1/2 d5:1/2 f5:1/2 d5:1/2 a4:1/2 d5:1/2 f5:1/2 d5:1/2 a#4:1/2 d5:1/2 g5:1/2 d5:1/2 a4:1/2 c#5:1/2 e5:1/2 c#5:1/2' },
      { type: 'tri', vol: 0.34, notes: 'd2:1/2 d3:1/2 d2:1/2 d3:1/2 d2:1/2 d3:1/2 d2:1/2 d3:1/2 g2:1/2 g3:1/2 g2:1/2 g3:1/2 a2:1/2 a3:1/2 a2:1/2 a3:1/2' },
      { type: 'noise', vol: 0.07, notes: 'c6:1/2 c4:1/4 c4:1/4 c6:1/2 c4:1/2 c6:1/2 c4:1/4 c4:1/4 c6:1/2 c4:1/2' },
    ],
  },
  victory: {
    bpm: 140,
    once: true,
    ch: [
      { type: 0.25, vol: 0.3, notes: 'c5:1/3 e5:1/3 g5:1/3 c6:3/2 a5:1/2 b5:1/2 c6:3' },
      { type: 0.5, vol: 0.16, notes: 'e4:1/3 g4:1/3 c5:1/3 e5:3/2 f5:1/2 f5:1/2 e5:3' },
      { type: 'tri', vol: 0.3, notes: 'c3:1 c3:3/2 f2:1/2 g2:1/2 c3:3' },
    ],
  },
  defeat: {
    bpm: 90,
    once: true,
    ch: [
      { type: 0.25, vol: 0.28, notes: 'e5 d#5 d5 c#5:3' },
      { type: 'tri', vol: 0.3, notes: 'a2 g#2 g2 f#2:3' },
    ],
  },
  pack: {
    bpm: 150,
    once: true,
    ch: [
      { type: 0.25, vol: 0.28, notes: 'g4:1/4 c5:1/4 e5:1/4 g5:1/4 c6:2' },
      { type: 'tri', vol: 0.3, notes: 'c3:1/2 g3:1/2 c4:2' },
    ],
  },
};

let pendingSong = null;
let timer = null;

export function playMusic(name) {
  pendingSong = name;
  if (!ctx) return;
  if (current && current.name === name && !SONGS[name]?.once) return;
  stopMusic();
  const song = SONGS[name];
  if (!song) return;
  const beat = 60 / song.bpm;
  const chans = song.ch.map((c) => ({ ...c, seq: parse(c.notes), i: 0, t: ctx.currentTime + 0.05 }));
  current = { name, chans, done: false };
  const cur = current;
  timer = setInterval(() => {
    if (current !== cur) return;
    const horizon = ctx.currentTime + 0.25;
    let allDone = true;
    for (const ch of chans) {
      while (ch.t < horizon) {
        if (ch.i >= ch.seq.length) {
          if (song.once) break;
          ch.i = 0;
        }
        const n = ch.seq[ch.i++];
        const dur = n.beats * beat;
        if (n.f) tone(musicGain, ch.type, n.f, ch.t, dur * 0.92, ch.vol, { decay: ch.type === 'tri' ? 0.2 : 0.6 });
        ch.t += dur;
      }
      if (ch.i < ch.seq.length) allDone = false;
    }
    if (song.once && allDone) {
      clearInterval(timer);
      timer = null;
    }
  }, 50);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
}

// ---------------------------------------------------------------------------
// Sound effects

const SFX = {
  cursor: (t) => tone(sfxGain, 0.5, 1760, t, 0.03, 0.18),
  blip: (t) => tone(sfxGain, 0.5, 1320, t, 0.04, 0.15),
  select: (t) => {
    tone(sfxGain, 0.5, 1046, t, 0.05, 0.2);
    tone(sfxGain, 0.5, 1568, t + 0.05, 0.07, 0.2);
  },
  back: (t) => {
    tone(sfxGain, 0.5, 784, t, 0.05, 0.18);
    tone(sfxGain, 0.5, 523, t + 0.05, 0.07, 0.18);
  },
  error: (t) => tone(sfxGain, 0.125, 110, t, 0.15, 0.25),
  card: (t) => tone(sfxGain, 'noise', 3000, t, 0.08, 0.25, { decay: 0.95 }),
  draw: (t) => tone(sfxGain, 'noise', 5000, t, 0.05, 0.15),
  land: (t) => {
    tone(sfxGain, 'tri', 110, t, 0.12, 0.45, { slide: 0.5 });
    tone(sfxGain, 'noise', 800, t, 0.08, 0.2);
  },
  cast: (t) => {
    for (let i = 0; i < 4; i++) tone(sfxGain, 0.25, 523 * Math.pow(1.26, i), t + i * 0.04, 0.06, 0.18);
  },
  damage: (t) => {
    tone(sfxGain, 'noise', 1500, t, 0.25, 0.35, { decay: 0.99 });
    tone(sfxGain, 0.5, 220, t, 0.2, 0.2, { slide: 0.3 });
  },
  bolt: (t) => {
    tone(sfxGain, 'noise', 8000, t, 0.35, 0.4, { decay: 0.99 });
    tone(sfxGain, 0.125, 1800, t, 0.3, 0.15, { slide: 0.1 });
  },
  heal: (t) => {
    for (let i = 0; i < 5; i++) tone(sfxGain, 0.25, 784 * Math.pow(1.122, i * 2), t + i * 0.05, 0.08, 0.16);
  },
  attack: (t) => tone(sfxGain, 0.5, 300, t, 0.2, 0.25, { slide: 3 }),
  destroy: (t) => {
    tone(sfxGain, 'noise', 600, t, 0.4, 0.35, { decay: 0.99 });
    tone(sfxGain, 'tri', 160, t, 0.35, 0.3, { slide: 0.25 });
  },
  dice: (t) => {
    for (let i = 0; i < 6; i++) tone(sfxGain, 'noise', 4000 + i * 300, t + i * 0.05, 0.03, 0.2);
  },
  turn: (t) => {
    tone(sfxGain, 0.25, 659, t, 0.08, 0.2);
    tone(sfxGain, 0.25, 988, t + 0.08, 0.14, 0.2);
  },
  shuffle: (t) => {
    for (let i = 0; i < 8; i++) tone(sfxGain, 'noise', 2500, t + i * 0.04, 0.03, 0.15);
  },
  step: (t) => tone(sfxGain, 'noise', 700, t, 0.03, 0.08),
  door: (t) => {
    tone(sfxGain, 0.5, 392, t, 0.06, 0.18);
    tone(sfxGain, 0.5, 523, t + 0.06, 0.08, 0.18);
  },
  coin: (t) => {
    tone(sfxGain, 0.5, 988, t, 0.06, 0.2);
    tone(sfxGain, 0.5, 1319, t + 0.06, 0.2, 0.2);
  },
};

export function sfx(name) {
  if (!ctx || !settings.sfx) return;
  const fn = SFX[name];
  if (fn) fn(ctx.currentTime + 0.005);
}
