/* smoke test — เปิดทุกชนิดหน้าในเบราว์เซอร์จริง เช็ก error ใน console
   และเช็กว่ารูปปกโหลดได้จริงทุกใบ · เก็บภาพตัวอย่างไว้ที่ tools/shots/
   รัน:  node tools/smoke.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 4189, CDP = 9445;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'tools/shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', '/'],
  ['series', '/series/ceo-cold/'],
  ['watch', '/watch/ceo-cold/ep-12/'],
  ['library', '/library/?tab=continue'],
  ['genre', '/genre/revenge/'],
  ['tag', '/tag/inheritance/'],
  ['search', '/search/'],
  ['feed', '/feed/'],
  ['popular', '/popular/'],
  ['new', '/new/'],
  ['schedule', '/schedule/'],
  ['az', '/az/'],
  ['browse', '/browse/'],
  ['about', '/about/'],
  ['contact', '/contact/'],
  ['help', '/help/'],
  ['legal', '/legal/privacy/'],
  ['behind', '/behind-the-ai/'],
  ['settings', '/settings/'],
  ['notifications', '/notifications/'],
  ['welcome', '/welcome/'],
  ['404', '/404/'],
  ['offline', '/offline/'],
  ['cast', '/cast/%E0%B8%81%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%A2%E0%B8%B2%E0%B8%A7/'],
];

const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus', '--hide-scrollbars',
  `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });
const stop = c => { try { server.kill('SIGTERM'); } catch {} try { chrome.kill('SIGTERM'); } catch {} process.exit(c); };

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ chrome ไม่ได้');
}
const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
let logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    logs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    logs.push('LOG ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  }
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

let bad = 0;
for (const [name, p] of PAGES) {
  logs = [];
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 100; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `document.readyState==='complete' && document.fonts.status==='loaded'
        && [...document.images].filter(i=>{var r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(im=>im.complete)`,
      returnByValue: true,
    });
    if (r.result.value === true) break;
    await sleep(70);
  }
  await sleep(200);
  const info = (await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      h1: (document.querySelector('h1')||{}).textContent||'',
      imgs: document.images.length,
      broken: [...document.images].filter(i=>{
        var r=i.getBoundingClientRect();
        var inView = r.top < innerHeight && r.bottom > 0 && r.width > 0;
        return inView && i.complete && !i.naturalWidth;   /* lazy ที่ยังไม่เข้าจอไม่นับว่าเสีย */
      }).map(i=>i.getAttribute('src')),
      links: document.querySelectorAll('a[href]').length,
      css: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() === '#F5C451'
    })`, returnByValue: true,
  })).result.value;
  const j = JSON.parse(info);
  const problems = [];
  if (!j.h1.trim()) problems.push('h1 ว่าง');
  if (j.broken.length) problems.push('รูปเสีย ' + j.broken.slice(0, 2).join(','));
  if (!j.css) problems.push('CSS ไม่ติด');
  if (logs.length) problems.push(logs.slice(0, 2).join(' | '));
  if (problems.length) { bad++; console.log(`✗ ${name.padEnd(14)} ${p}\n    ${problems.join('\n    ')}`); }
  else console.log(`✓ ${name.padEnd(14)} ${p}  (h1="${j.h1.trim().slice(0, 36)}" · img ${j.imgs} · link ${j.links})`);

  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
  fs.writeFileSync(path.join(OUT, `m-${name}.jpg`), Buffer.from(data, 'base64'));
}

console.log(bad ? `\n✗ มีปัญหา ${bad} หน้า` : `\n✓ ผ่านทั้ง ${PAGES.length} ชนิดหน้า · ภาพอยู่ที่ tools/shots/`);
stop(bad ? 1 : 0);
