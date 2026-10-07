// Headless playtest harness. Launches Chrome with the game, then exposes a
// tiny HTTP API so a test script (or a person with curl) can drive it:
//
//   node tools/harness.mjs [url]            (default http://localhost:8080/)
//   curl 'localhost:9400/press?b=a&n=1'     press A once
//   curl 'localhost:9400/wait?f=60'         wait 60 frames
//   curl 'localhost:9400/shot?name=foo'     save a 4x screenshot of the canvas
//   curl -d 'app.frameCount' localhost:9400/eval
//   curl 'localhost:9400/goto?url=...'

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const API = Number(process.env.HARNESS_PORT || 9400);
const OUT = process.env.SHOT_DIR || join(tmpdir(), 'mtg-gb-shots');
mkdirSync(OUT, { recursive: true });
const startUrl = process.argv[2] || 'http://localhost:8080/';

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--window-size=800,900',
  '--autoplay-policy=no-user-gesture-required',
  '--mute-audio',
  `--user-data-dir=${join(tmpdir(), 'mtg-gb-chrome')}`,
  'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());
process.on('SIGINT', () => process.exit());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const consoleLines = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    consoleLines.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    consoleLines.push('[exception] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  }
});
function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return r.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: startUrl });
await sleep(1500);

// frames are counted by the game loop
async function waitFrames(n) {
  const start = await evaluate('app.frameCount');
  for (;;) {
    const f = await evaluate('app.frameCount');
    if (typeof f !== 'number' || f - start >= n) return f;
    await sleep(Math.max(5, Math.min(100, ((n - (f - start)) * 1000) / 60)));
  }
}

async function press(b, hold = 3) {
  await evaluate(`app.input.setVirtual(${JSON.stringify(b)}, true)`);
  await waitFrames(hold);
  await evaluate(`app.input.setVirtual(${JSON.stringify(b)}, false)`);
  await waitFrames(2);
}

async function shot(name, scale = 4) {
  const data = await evaluate(`(() => { const c = document.createElement('canvas'); c.width = 160 * ${scale}; c.height = 144 * ${scale}; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(app.canvas, 0, 0, c.width, c.height); return c.toDataURL('image/png'); })()`);
  const file = join(OUT, `${name}.png`);
  writeFileSync(file, Buffer.from(String(data).split(',')[1], 'base64'));
  return file;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  let body = '';
  for await (const chunk of req) body += chunk;
  let out;
  try {
    switch (url.pathname) {
      case '/press':
        for (let i = 0; i < Number(q.n || 1); i++) {
          await press(q.b, Number(q.hold || 3));
          if (q.gap) await waitFrames(Number(q.gap));
        }
        out = await evaluate('app.frameCount');
        break;
      case '/seq': {
        // e.g. /seq?s=a,a,down,a,w30,shot:foo
        const files = [];
        for (const step of (q.s || '').split(',')) {
          if (!step) continue;
          if (step.startsWith('w')) await waitFrames(Number(step.slice(1)));
          else if (step.startsWith('shot:')) files.push(await shot(step.slice(5)));
          else await press(step);
          await waitFrames(Number(q.gap || 4));
        }
        out = files.length ? files : await evaluate('app.frameCount');
        break;
      }
      case '/wait':
        out = await waitFrames(Number(q.f || 60));
        break;
      case '/shot':
        out = await shot(q.name || 'shot', Number(q.scale || 4));
        break;
      case '/eval':
        out = await evaluate(body || q.js);
        break;
      case '/goto':
        await send('Page.navigate', { url: q.url });
        await sleep(1500);
        out = 'ok';
        break;
      case '/console':
        out = consoleLines.splice(0);
        break;
      default:
        out = 'unknown';
    }
  } catch (e) {
    out = { error: String(e) };
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out) + '\n');
}).listen(API, () => console.log(`harness on :${API}, shots in ${OUT}`));
