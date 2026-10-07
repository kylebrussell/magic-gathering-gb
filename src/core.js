// App shell: fixed 60 Hz loop, input, and an async scene stack.
//
// Scenes are objects with draw(ctx) and an async run(app). Menus and
// cutscenes are written as straight-line async code using app.press(),
// app.wait() etc., which resolve on future frames.

export const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'a',
  KeyJ: 'a',
  Space: 'a',
  KeyX: 'b',
  KeyK: 'b',
  Escape: 'b',
  Backspace: 'b',
  Enter: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
  Tab: 'select',
};

const REPEAT_DELAY = 16;
const REPEAT_RATE = 5;

export class Input {
  constructor() {
    this.down = new Set();
    this.prevDown = new Set();
    this.pressed = new Set();
    this.held = {};
    this.virtual = new Set();
    window.addEventListener('keydown', (e) => {
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      this.down.add(b);
    });
    window.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (b) this.down.delete(b);
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  setVirtual(b, on) {
    if (on) this.virtual.add(b);
    else this.virtual.delete(b);
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const out = new Set();
    for (const p of pads) {
      if (!p) continue;
      const btn = (i) => p.buttons[i] && p.buttons[i].pressed;
      if (btn(12) || p.axes[1] < -0.5) out.add('up');
      if (btn(13) || p.axes[1] > 0.5) out.add('down');
      if (btn(14) || p.axes[0] < -0.5) out.add('left');
      if (btn(15) || p.axes[0] > 0.5) out.add('right');
      if (btn(0)) out.add('a');
      if (btn(1)) out.add('b');
      if (btn(9)) out.add('start');
      if (btn(8)) out.add('select');
    }
    return out;
  }

  update() {
    const now = new Set([...this.down, ...this.virtual, ...this.pollGamepad()]);
    this.pressed.clear();
    for (const b of BUTTONS) {
      if (now.has(b)) {
        this.held[b] = (this.held[b] || 0) + 1;
        const h = this.held[b];
        const dir = b === 'up' || b === 'down' || b === 'left' || b === 'right';
        if (h === 1 || (dir && h > REPEAT_DELAY && (h - REPEAT_DELAY) % REPEAT_RATE === 0)) this.pressed.add(b);
      } else {
        this.held[b] = 0;
      }
    }
  }

  isDown(b) {
    return (this.held[b] || 0) > 0;
  }
}

export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input();
    this.stack = [];
    this.frameWaiters = [];
    this.pressWaiters = [];
    this.frameCount = 0;
    this.fadeLevel = 0;
    this.fadeColor = null;
    this.acc = 0;
    this.last = performance.now();
    this.listeners = [];
    this.speed = 1;
  }

  start() {
    // One logic step per animation frame at most: async scene code resumes in
    // microtasks after each tick, so batching steps would skip its frames.
    const tick = (t) => {
      this.acc = Math.min(this.acc + (t - this.last), 1000 / 30);
      this.last = t;
      if (this.acc >= 1000 / 60 - 1) {
        this.acc -= 1000 / 60;
        if (this.acc < 0) this.acc = 0;
        this.update();
        this.draw();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  update() {
    this.frameCount++;
    this.input.update();
    for (const l of this.listeners) l(this);
    // resolve button waiters first (one press per waiter per frame)
    if (this.input.pressed.size && this.pressWaiters.length) {
      const waiters = this.pressWaiters;
      this.pressWaiters = [];
      for (const w of waiters) {
        const hit = [...this.input.pressed].find((b) => !w.filter || w.filter.includes(b));
        if (hit) w.resolve(hit);
        else this.pressWaiters.push(w);
      }
    }
    const waiters = this.frameWaiters;
    this.frameWaiters = [];
    for (const w of waiters) w();
    const top = this.top();
    if (top && top.update) top.update(this);
  }

  draw() {
    const ctx = this.ctx;
    // draw from the last opaque scene upwards
    let from = this.stack.length - 1;
    while (from > 0 && this.stack[from].overlay) from--;
    for (let i = Math.max(0, from); i < this.stack.length; i++) this.stack[i].draw(ctx, this);
    if (this.fadeLevel > 0) {
      ctx.globalAlpha = Math.min(1, this.fadeLevel / 4);
      ctx.fillStyle = this.fadeColor || '#e0d8b8';
      ctx.fillRect(0, 0, 160, 144);
      ctx.globalAlpha = 1;
    }
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  frame() {
    return new Promise((r) => this.frameWaiters.push(r));
  }

  async wait(n) {
    n = Math.ceil(n / this.speed);
    for (let i = 0; i < n; i++) await this.frame();
  }

  // Wait n frames; return early (true) if one of `buttons` is pressed.
  async waitOrPress(n, buttons = ['a', 'b']) {
    n = Math.ceil(n / this.speed);
    for (let i = 0; i < n; i++) {
      await this.frame();
      if (buttons.some((b) => this.input.pressed.has(b))) return true;
    }
    return false;
  }

  press(filter) {
    return new Promise((resolve) => this.pressWaiters.push({ filter, resolve }));
  }

  // Push a scene, run it to completion, pop it, return its result.
  async run(scene) {
    this.stack.push(scene);
    try {
      return await scene.run(this);
    } finally {
      const i = this.stack.lastIndexOf(scene);
      if (i >= 0) this.stack.splice(i, 1);
    }
  }

  async fadeOut(frames = 16, color) {
    this.fadeColor = color || null;
    for (let i = 0; i <= 4; i++) {
      this.fadeLevel = i;
      await this.wait(frames / 4);
    }
  }

  async fadeIn(frames = 16) {
    for (let i = 4; i >= 0; i--) {
      this.fadeLevel = i;
      await this.wait(frames / 4);
    }
    this.fadeColor = null;
  }
}
