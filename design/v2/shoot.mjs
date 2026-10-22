/* เรนเดอร์ภาพทุกหน้าจอผ่าน Chrome DevTools Protocol
   เหตุผลที่ไม่ใช้ --screenshot ตรง ๆ: headless chrome บังคับความกว้างหน้าต่างขั้นต่ำ 500px
   ทำให้ --window-size=390 ได้เลย์เอาต์ 500px แล้วครอป ซึ่งไม่ใช่ภาพมือถือจริง
   CDP + Emulation.setDeviceMetricsOverride ให้ viewport ตรงตามที่ขอเป๊ะ

   รัน: node design/v2/shoot.mjs [filter]      (จาก root ของ repo) */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 9333;
const OUT = path.join(DIR, 'shots');
const filter = process.argv[2] || '';
const shots = JSON.parse(fs.readFileSync(path.join(DIR, 'shots.json'), 'utf8'))
  .filter(s => !filter || s.out.includes(filter));

fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dbus', '--hide-scrollbars',
  '--disable-lcd-text', '--force-color-profile=srgb', '--font-render-hinting=none',
  `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', 'about:blank',
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ chrome ไม่ได้');
}

const url = await wsUrl();
const ws = new WebSocket(url);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');

let n = 0, fail = 0;
for (const s of shots) {
  const target = `file://${path.resolve(DIR, s.file)}`;
  try {
    await send('Emulation.setDeviceMetricsOverride', {
      width: s.w, height: s.h, deviceScaleFactor: s.dpr, mobile: s.mobile,
      screenWidth: s.w, screenHeight: s.h,
    });
    await send('Page.navigate', { url: target });
    // รอให้โหลดเสร็จ + ฟอนต์พร้อม + รูปปกถอดรหัสเสร็จ
    for (let i = 0; i < 80; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `(document.readyState==='complete') &&
          (document.fonts.status==='loaded') &&
          [...document.images].every(im=>im.complete)`,
        returnByValue: true, awaitPromise: false,
      });
      if (r.result && r.result.value === true) break;
      await sleep(80);
    }
    await sleep(140); // เผื่อ layout/paint รอบสุดท้าย

    if (s.full) {
      const r = await send('Runtime.evaluate', {
        expression: 'Math.min(document.documentElement.scrollHeight, 20000)', returnByValue: true,
      });
      const h = Math.ceil(r.result.value);
      await send('Emulation.setDeviceMetricsOverride', {
        width: s.w, height: h, deviceScaleFactor: s.dpr, mobile: s.mobile,
        screenWidth: s.w, screenHeight: h,
      });
      await sleep(260);
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: false });
    fs.writeFileSync(path.join(OUT, s.out), Buffer.from(data, 'base64'));
    n++;
    process.stdout.write(`\r[${n}/${shots.length}] ${s.out}`.padEnd(78));
  } catch (e) {
    fail++;
    console.log(`\nเรนเดอร์ไม่สำเร็จ: ${s.out} — ${e.message}`);
  }
}

console.log(`\nเสร็จ: ${n} ใบ · ล้มเหลว ${fail} ใบ · โฟลเดอร์ ${OUT}`);
ws.close();
chrome.kill('SIGTERM');
process.exit(fail ? 1 : 0);
