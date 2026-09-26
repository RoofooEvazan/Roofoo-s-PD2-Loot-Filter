// Takes the Filter Builder screenshots used in the README (screenshots/Builder*.png).
//
//   node --experimental-websocket tools/site/screenshots.mjs [url]
//
// url defaults to the live site. To shoot a local copy, run `python -m http.server 8765` in the repo
// and pass http://localhost:8765/docs/. Needs Chrome or Edge; set BROWSER=path\to\chrome.exe if it
// isn't found. Node 20 needs --experimental-websocket (Node 22+ has WebSocket built in).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_ = process.argv[2] || 'https://roofooevazan.github.io/Roofoo-s-PD2-Loot-Filter/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'screenshots');
const PORT = 9335;
const WIDTH = 1400, HEIGHT = 1000;

const candidates = [
  process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const BROWSER = candidates.find(p => fs.existsSync(p));
if (!BROWSER) { console.error('No Chrome/Edge found. Set BROWSER=path/to/chrome'); process.exit(1); }
if (typeof WebSocket === 'undefined') { console.error('Run with: node --experimental-websocket tools/site/screenshots.mjs'); process.exit(1); }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-shots-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const cleanup = code => { try { browser.kill(); } catch {} setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 500); };
setTimeout(() => { console.error('Timed out.'); cleanup(1); }, 180000);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 60 && !targets.some(t => t.type === 'page'); i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { /* still starting */ }
  await sleep(250);
}
const page = targets.find(t => t.type === 'page');
if (!page) { console.error(`${BROWSER} didn't start in headless mode. Try another browser with BROWSER=...`); cleanup(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async js => {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{${WAIT}${js}})()`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result.result.value;
};
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('saved', path.relative(process.cwd(), file), fs.statSync(file).size, 'bytes');
};
// helpers available inside page scripts
const WAIT = `const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const w=async(sel,ms=60000)=>{const t=Date.now();while(!document.querySelector(sel)&&Date.now()-t<ms)await pause(150);};
  const hideCard=()=>{const t=document.getElementById('tip'); if(t) t.hidden=true;};`;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ });
await sleep(4000);
// start from Roofoo's defaults, not whatever an earlier run saved
await run(`localStorage.clear(); location.reload();`).catch(() => {});
await sleep(4500);
await run(`await w('#tabs [data-tab="items"]');`);

// 1) Colors & sounds
await run(`window.scrollTo(0,0);`);
await sleep(500);
await shot('BuilderColorsSounds.png');

// 2) Items: Unique items > Helms, Shako's options open and its item card showing
await run(`
  document.querySelector('[data-tab="items"]').click(); await pause(500);
  const sec=document.querySelector('.isec[data-sec="UNI"]'); sec.open=true; await pause(500);
  sec.querySelector('.igrp[data-grp="UNI|Helms"]').open=true; await pause(500);
  document.querySelector('.irow[data-row="UNI:uap"] [data-act="opts"]').click(); await pause(400);
  const row=document.querySelector('.irow[data-row="UNI:uap"]');
  window.scrollTo(0, row.getBoundingClientRect().top + scrollY - 330); await pause(300);
  row.querySelector('b.item-link').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));`);
await sleep(600);
await shot('BuilderItems.png');

// 3) Overview & review: FL8 Swords, with The Grandfather's item card
await run(`
  hideCard();
  document.querySelector('[data-tab="report"]').click(); await w('.rp-intro');
  const d=document.querySelector('details[data-group="Swords"]'); d.open=true; await pause(400);
  const c=[...d.querySelectorAll('.rp-chip')].find(c=>c.textContent.includes('Grandfather'));
  window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 260); await pause(300);
  c.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));`);
await sleep(600);
await shot('BuilderOverview.png');

// 4) Test an item: Harlequin Crest on every filter level
await run(`
  hideCard();
  document.querySelector('[data-tab="test"]').click(); await pause(400);
  const P=document.getElementById('panel-test'); const i=P.querySelector('[data-picker-input="test"]');
  i.value='harlequin'; i.dispatchEvent(new Event('input',{bubbles:true})); await pause(200);
  P.querySelector('.picker-results button').click(); await w('.res'); window.scrollTo(0,0);`);
await sleep(700);
await shot('BuilderTestItem.png');

// 5) Save & install
await run(`document.querySelector('[data-tab="save"]').click(); await pause(600); window.scrollTo(0,0);`);
await sleep(600);
await shot('BuilderSaveInstall.png');

ws.close();
cleanup(0);
