/* ============================================================================
   AIO-56 ข้อ 1 · วัด "ที่วางทุกช่องของเว็บจริง" แล้วพิมพ์ตารางเป็น Markdown
   Visual-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/aio56-map.mjs            → ตาราง Markdown ออกทาง stdout
         node design/v2/aio56-map.mjs --write    → เขียนทับส่วนตารางใน AIO-56-SHAPE-MAP.md
         AIO56_PORT=9404 node design/v2/aio56-map.mjs

   ทำไมต้องวัด ไม่ใช่ grep CSS
     1) หลายช่องถูกวาดโดย assets/app.js จาก localStorage ⇒ DOM ตั้งต้นไม่มีเลย (`.cont`)
     2) `.hero .bg` ไม่มีสัดส่วนคงที่ — มันเป็นฟังก์ชันของความกว้างคอนเทนเนอร์กับ 56vh
        ⇒ อ่านจาก CSS ได้แค่ "min(480px,56vh)" ซึ่งตอบคำถามลูกค้าไม่ได้
     3) กฎท้ายไฟล์ของ assets/site.css ทับกฎแรกได้ ⇒ สรุปจาก grep กฎแรก = รายงานบั๊กผี

   ตัวเลข "เห็นกี่ %" คำนวณจากสูตร object-fit:cover
     กล่องกว้างกว่าไฟล์ ⇒ ตัดความสูง เหลือ arไฟล์/arกล่อง
     กล่องแคบกว่าไฟล์ ⇒ ตัดความกว้าง เหลือ arกล่อง/arไฟล์
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = Number(process.env.AIO56_PORT || 9355);
const AR_COVER = 1024 / 1536;     /* ปกวันนี้ · assets/covers/<slug>.webp */
const AR_WIDE = 2640 / 1200;      /* ภาพกว้างที่เสนอ · ADR-001 §13.4 */

/* ช่องที่ต้องวัด — หน้าไหน · selector อะไร · เรียกว่าอะไรในภาษาลูกค้า */
const SPOTS = [
  ['ฮีโร่หน้าแรก', '.hero .bg', 'index.html'],
  ['ปกในการ์ด', '.poster', 'index.html'],
  ['การ์ด "ดูต่อ"', '.cont .thumb', 'index.html'],
  ['ไทล์ "เลือกตามแนว"', '.genre-bento .gtile', 'index.html'],
  ['แถวตอน', '.ep-row .th', 'index.html'],
  ['แถบรีลในไทล์ฟีด', '.reelstrip span', 'index.html'],
  ['ดัชนีทุกเรื่อง', '.flatlist .th2', 'az/index.html'],
  ['รายการในคลัง', '.lib-list .controw .th', 'library/index.html'],
  ['เพลเยอร์หน้าตอน', '.player', 'watch/durian-revenge/ep-2/index.html'],
  ['เพลเยอร์ฟีด', '.player', 'feed/index.html'],
];

const VPS = [
  { tag: '1440×900', w: 1440, h: 900, mobile: false },
  { tag: '390×844', w: 390, h: 844, mobile: true },
];

const SEED_CONT = JSON.stringify({
  'durian-revenge': { ep: 2, sec: 60, dur: 120, ts: 1761000000000 },
  'ceo-cold': { ep: 2, sec: 60, dur: 120, ts: 1760999940000 },
});

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
  throw new Error(`เชื่อมต่อ chrome ที่พอร์ต ${PORT} ไม่ได้ — ถ้าพอร์ตชน ตั้ง AIO56_PORT=<อื่น>`);
}

const ws = new WebSocket(await wsUrl());
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
/* ซีดก่อนสคริปต์ของหน้าทุกครั้งที่นำทาง — ไม่งั้น `.cont` ไม่มีใน DOM เลยและตารางจะมีรูโหว่ */
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try{localStorage.setItem('lakorn.cont',${JSON.stringify(SEED_CONT)})}catch(e){}`,
});

const result = new Map();   /* key = selector|page  →  { [vp.tag]: {...} } */

for (const vp of VPS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile,
    screenWidth: vp.w, screenHeight: vp.h,
  });
  for (const page of [...new Set(SPOTS.map(s => s[2]))]) {
    const file = path.join(ROOT, page);
    if (!fs.existsSync(file)) throw new Error(`ไม่พบ ${file}`);
    await send('Page.navigate', { url: `file://${file}` });
    for (let i = 0; i < 100; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `document.readyState==='complete' && document.fonts.status==='loaded'`,
        returnByValue: true,
      });
      if (r.result.value === true) break;
      await sleep(80);
    }
    await sleep(260);   /* เผื่อ assets/app.js เติมของจาก localStorage เสร็จ */

    const sels = SPOTS.filter(s => s[2] === page).map(s => s[1]);
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const out = {};
        for (const sel of ${JSON.stringify(sels)}) {
          const el = document.querySelector(sel);
          if (!el) { out[sel] = null; continue; }
          const b = el.getBoundingClientRect();
          const im = el.tagName === 'IMG' ? el : el.querySelector('img');
          out[sel] = {
            w: +b.width.toFixed(1), h: +b.height.toFixed(1),
            n: document.querySelectorAll(sel).length,
            op: im ? getComputedStyle(im).objectPosition : null,
          };
        }
        return out;
      })()`, returnByValue: true,
    });
    for (const [sel, v] of Object.entries(r.result.value)) {
      const key = `${sel}|${page}`;
      if (!result.has(key)) result.set(key, {});
      result.get(key)[vp.tag] = v;
    }
  }
}

ws.close();
chrome.kill('SIGTERM');

/* ---------------- พิมพ์ตาราง ---------------- */
const vis = (arBox, arImg) => (arBox > arImg ? arImg / arBox : arBox / arImg);
const axis = (arBox, arImg) => (arBox > arImg ? 'ตัดสูง' : arBox < arImg ? 'ตัดกว้าง' : 'ไม่ตัด');
const pct = x => `${(x * 100).toFixed(1)}%`;

const lines = [];
lines.push('| ที่วาง | selector | กล่องที่ 1440×900 | ar | กล่องที่ 390×844 | ar | object-position | เห็นปก 2:3 กี่ % | ถ้าใช้ภาพ 11:5 |');
lines.push('|---|---|---|---|---|---|---|---|---|');
for (const [name, sel, page] of SPOTS) {
  const v = result.get(`${sel}|${page}`);
  const d = v['1440×900'], m = v['390×844'];
  if (!d && !m) { lines.push(`| ${name} | \`${sel}\` | *วัดไม่ได้* | | | | | | |`); continue; }
  const box = x => (x && x.w > 0 ? `${x.w}×${x.h}` : '—');
  const ar = x => (x && x.h > 0 ? (x.w / x.h).toFixed(3) : '—');
  /* ใช้กล่องที่กว้างที่สุดของสองจอเป็นตัวแทนในการคำนวณ % (เป็นกรณีที่ครอปหนักที่สุด) */
  const ref = [d, m].filter(x => x && x.h > 0).sort((a, b) => (b.w / b.h) - (a.w / a.h))[0];
  const arRef = ref.w / ref.h;
  const now = `${pct(vis(arRef, AR_COVER))} (${axis(arRef, AR_COVER)})`;
  const next = `${pct(vis(arRef, AR_WIDE))} (${axis(arRef, AR_WIDE)})`;
  lines.push(`| ${name} | \`${sel}\` | ${box(d)} | ${ar(d)} | ${box(m)} | ${ar(m)} | ${(d || m).op || '—'} | ${now} | ${next} |`);
}

const out = lines.join('\n');
console.log(out);
console.log(`\n<!-- วัดจากเว็บจริงด้วย node design/v2/aio56-map.mjs · ปก 2:3 = ${AR_COVER.toFixed(3)} · ภาพกว้าง 11:5 = ${AR_WIDE.toFixed(1)} -->`);

if (process.argv.includes('--write')) {
  const doc = path.join(DIR, 'AIO-56-SHAPE-MAP.md');
  const src = fs.readFileSync(doc, 'utf8');
  const BEGIN = '<!-- MEASURED:BEGIN -->', END = '<!-- MEASURED:END -->';
  if (!src.includes(BEGIN) || !src.includes(END)) {
    throw new Error(`ไม่พบเครื่องหมาย ${BEGIN}/${END} ใน AIO-56-SHAPE-MAP.md`);
  }
  const next = src.slice(0, src.indexOf(BEGIN) + BEGIN.length) + '\n' + out + '\n' + src.slice(src.indexOf(END));
  fs.writeFileSync(doc, next);
  console.log('\nเขียนตารางลง design/v2/AIO-56-SHAPE-MAP.md แล้ว');
}
