/* ============================================================================
   AIO-56 ข้อ 4 · ม็อกอัพ "กรอบจอเดียว" คู่ ก่อน/หลัง สำหรับให้ลูกค้าอนุมัติ
   Visual-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/aio56-frames.mjs
         AIO56_PORT=9403 node design/v2/aio56-frames.mjs   → เปลี่ยนพอร์ต CDP ถ้าชนกับ run อื่น

   ของที่เขียนออก
     design/v2/shots/aio56-<ขนาด>-<before|after>.png   ต้นฉบับ
     design/v2/shots-jpeg/aio56-<ขนาด>-<before|after>.jpg   เด็คเบาสำหรับแนบบนบอร์ด

   -------------------------------------------------------------------------
   ทำไมต้องถ่ายจากเว็บจริง ไม่ใช่จากม็อกอัพใน design/v2/
     หน้าแรกของเว็บจริงมีฮีโร่เป็น "คาร์เซล 3 เรื่อง" (.hero-track) ซึ่งเป็นของที่ Dev
     เพิ่มใน build/site-extra.css — ม็อกอัพ design/v2/home.html ยังเป็นฮีโร่ใบเดียว
     ภาพ "ก่อน" ที่ถ่ายจากม็อกอัพจึงไม่ใช่สิ่งที่ลูกค้าเห็น และนั่นคือวิธีที่บั๊กหลุดรอบก่อน

   แล้ว "หลัง" ทำยังไงโดยไม่แตะ assets/ (ซึ่งใบงานห้าม)
     แก้ที่ DOM ในเบราว์เซอร์ตอนถ่ายเท่านั้น (PATCH ข้างล่าง) ไม่มีไฟล์ไหนถูกเขียนทับ
     แพตช์นี้คือสิ่งที่เสนอให้ Dev ทำจริงด้วย <picture> — ผลลัพธ์ที่ viewport หนึ่ง ๆ เท่ากัน
     (รูปแบบ <picture> ที่เสนอ อยู่ใน design/v2/AIO-56-SHAPE-MAP.md §3)

   ทุกใบเป็น "กรอบจอเดียว" — ไม่มี captureBeyondViewport ไม่มีการยืด viewport ตามความสูงหน้า
   และไม่เลื่อนหน้าเลย เพราะฮีโร่อยู่ในจอแรกของทุกขนาดที่ถ่าย (ด่านข้างล่างบังคับข้อนี้)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = Number(process.env.AIO56_PORT || 9353);
const OUT_PNG = path.join(DIR, 'shots');
const OUT_JPG = path.join(DIR, 'shots-jpeg');
const HOME = path.join(ROOT, 'index.html');
const WIDE = path.join(DIR, 'wide-out');

/* ขนาดจอ — สามขนาดแรกคือที่ใบงานสั่ง · ขนาดที่สี่เพิ่มเองเพราะเป็น "ขอบล่าง" ของช่วงสัดส่วน
   กล่องฮีโร่ (ar 1.670 ที่จอ 768) ซึ่งเป็นจุดที่ภาพกว้าง 11:5 ถูกครอบด้านข้างมากที่สุด
   ⇒ ถ้ากรอบปลอดภัยถูกต้อง ตัวเอกต้องยังอยู่ครบในใบนี้ */
const VIEWPORTS = [
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false },
  { tag: '1366x768', w: 1366, h: 768, dpr: 1.5, mobile: false },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true },
  { tag: '768x1024', w: 768, h: 1024, dpr: 1.5, mobile: false },
];

/* ฉากที่สอง: การ์ด "ดูต่อ" (`.cont .thumb` — กรอบ 16:9 เดียวในเว็บ)
   ใบงานถามตรง ๆ ว่าการ์ดนี้ควรเป็น 16:9 ต่อไปไหม ⇒ ต้องมีภาพให้ลูกค้าตัดสิน ไม่ใช่คำบรรยาย
   การ์ดนี้ถูกวาดโดย assets/app.js จาก localStorage ⇒ ถ้าไม่ซีดค่า DOM ตั้งต้นไม่มีการ์ดเลย */
const CONT_VIEWPORTS = [
  { tag: 'cont-1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false },
  { tag: 'cont-390x844', w: 390, h: 844, dpr: 2, mobile: true },
];
/* รูปข้อมูลของ lakorn.cont ประกาศไว้ที่หัว build/app.src.js: { slug: {ep,sec,dur,ts} }
   เลือกสองเรื่องแรกของคลัง ดูไปครึ่งตอน — เกณฑ์เดียวกับที่ tools/test-layout.mjs ใช้ซีด */
const SEED_CONT = JSON.stringify({
  'durian-revenge': { ep: 2, sec: 60, dur: 120, ts: 1761000000000 },
  'ceo-cold': { ep: 2, sec: 60, dur: 120, ts: 1760999940000 },
});

if (!fs.existsSync(HOME)) throw new Error(`ไม่พบ ${HOME}`);
const missing = fs.existsSync(WIDE) ? [] : ['(ทั้งโฟลเดอร์)'];
if (missing.length) throw new Error('ยังไม่มี design/v2/wide-out/ — รัน node design/v2/covers-wide.mjs ก่อน');

/* ---------------------------------------------------------------------------
   PATCH = สิ่งที่เสนอ เขียนเป็นสคริปต์ที่รันในหน้าเว็บตอนถ่ายใบ "หลัง"
   สองอย่างเท่านั้น และทั้งคู่มีผลเฉพาะเดสก์ท็อป:
     1. เปลี่ยนไฟล์ภาพของ .hero .bg img จากปก 2:3 เป็นภาพกว้าง 11:5 ของเรื่องเดียวกัน
     2. object-position จาก "50% 22%" เป็น "50% 50%"
        ค่า 22% มีไว้ดึงหน้าตัวละครขึ้นมาจากปกแนวตั้งที่สูง — ภาพกว้างวางตัวเอกไว้กลางเฟรม
        โดยการออกแบบอยู่แล้ว ถ้าไม่เปลี่ยน เฟรมจะเอียงขึ้นบนและตัดส่วนล่างของฉากทิ้ง
   เงื่อนไข ≥768px ตรงกับ media query ที่ assets/site.css ใช้สลับฮีโร่เป็นกล่องความสูงตายตัว
   --------------------------------------------------------------------------- */
const PATCH = `(() => {
  if (!window.matchMedia('(min-width:768px)').matches) return { changed: 0, reason: 'มือถือ — ไม่แตะ' };
  let changed = 0;
  for (const img of document.querySelectorAll('.hero .bg img')) {
    const m = (img.getAttribute('src') || '').match(/covers\\/([a-z0-9-]+)\\.webp$/);
    if (!m) continue;
    img.removeAttribute('width'); img.removeAttribute('height');
    img.src = 'design/v2/wide-out/' + m[1] + '.webp';
    img.style.objectPosition = '50% 50%';
    changed++;
  }
  return { changed };
})()`;

/* แพตช์ของการ์ด "ดูต่อ" — เหตุผลเดียวกับฮีโร่ แต่ไม่มีเงื่อนไขขนาดจอ
   เพราะ `.cont .thumb` เป็นกรอบ 16:9 ทั้งบนมือถือและเดสก์ท็อป (วัดได้ 1.778 ทั้งสองขนาด)
   width/height ที่ assets/app.js ฝังไว้เป็น 1024×1536 ต้องถอดออกด้วย ไม่งั้นมันโกหกเบราว์เซอร์
   เรื่องขนาดไฟล์ใหม่ (ประเด็นเดียวกับกฎ V18 ของ ADR-001 §13.5) */
const PATCH_CONT = `(() => {
  let changed = 0;
  for (const img of document.querySelectorAll('.cont .thumb img')) {
    const m = (img.getAttribute('src') || '').match(/covers\\/([a-z0-9-]+)\\.webp$/);
    if (!m) continue;
    img.removeAttribute('width'); img.removeAttribute('height');
    img.src = 'design/v2/wide-out/' + m[1] + '.webp';
    img.style.objectPosition = '50% 50%';
    changed++;
  }
  return { changed };
})()`;

/* วัดกล่องภาพ + สัดส่วนไฟล์ที่ใส่จริง แล้วคำนวณว่า "เห็นภาพกี่ %"
   สูตร object-fit:cover — กล่องกว้างกว่าไฟล์ ⇒ ตัดความสูง · กล่องแคบกว่าไฟล์ ⇒ ตัดความกว้าง */
const measure = sel => `(() => {
  const bg = document.querySelector(${JSON.stringify(sel)});
  const img = bg && bg.querySelector('img');
  if (!bg || !img) return null;
  const b = bg.getBoundingClientRect();
  const hdr = document.querySelector('header.top');
  const rb = Math.round(b.bottom);
  const arBox = b.width / b.height;
  const arImg = img.naturalWidth / img.naturalHeight;
  const visH = arBox > arImg ? arImg / arBox : 1;
  const visW = arBox < arImg ? arBox / arImg : 1;
  return {
    box: [+b.width.toFixed(1), +b.height.toFixed(1)], arBox: +arBox.toFixed(3),
    nat: [img.naturalWidth, img.naturalHeight], arImg: +arImg.toFixed(3),
    visH: +(visH * 100).toFixed(1), visW: +(visW * 100).toFixed(1),
    src: img.getAttribute('src'),
    op: getComputedStyle(img).objectPosition,
    bottom: rb, vh: window.innerHeight,
    inFirstScreen: rb <= window.innerHeight,
    headerH: hdr ? Math.round(hdr.getBoundingClientRect().height) : 0,
  };
})()`;

/* ---------------------------------------------------------------------------- */
fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(OUT_JPG, { recursive: true });

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

const rows = [];
const problems = [];
let n = 0;

/* ซีด localStorage ก่อนสคริปต์ของหน้าทุกครั้งที่นำทาง — ใช้เฉพาะฉาก "ดูต่อ"
   (เขียนครั้งเดียวแล้วหวังว่าจะอยู่ยาวคือทางที่พังเงียบ ถ้ามีหน้าไหนล้างคลัง) */
let seedId = null;
const seedOn = async () => {
  if (seedId) return;
  const r = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try{localStorage.setItem('lakorn.cont',${JSON.stringify(SEED_CONT)})}catch(e){}`,
  });
  seedId = r.identifier;
};

const JOBS = [
  ...VIEWPORTS.map(vp => ({ vp, kind: 'hero', sel: '.hero .bg', patch: PATCH })),
  ...CONT_VIEWPORTS.map(vp => ({ vp, kind: 'cont', sel: '.cont .thumb', patch: PATCH_CONT })),
];

for (const job of JOBS) {
  const { vp, kind, sel } = job;
  if (kind === 'cont') await seedOn();
  for (const mode of ['before', 'after']) {
    const name = `aio56-${vp.tag}-${mode}`;
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: vp.mobile,
      screenWidth: vp.w, screenHeight: vp.h,
    });
    await send('Page.navigate', { url: `file://${HOME}` });
    /* พร้อม = โหลดจบ + ฟอนต์ไทยพร้อม + ภาพ "ใบแรกของช่องที่กำลังวัด" ถอดรหัสเสร็จ
       เงื่อนไขจำกัดที่ใบแรกโดยตั้งใจ: ฮีโร่เป็นคาร์เซล 3 ใบ อีกสองใบอยู่นอกกรอบและเป็น lazy
       ⇒ img.complete ของมันเป็น false ค้างตลอดในกรอบจอเดียว (รอจนหมดเวลาแล้วก็ยังไม่จริง)
       ใบที่ปรากฏในภาพคือใบแรกใบเดียว ซึ่งเป็นใบที่ต้องพร้อมจริง ๆ ก่อนกดชัตเตอร์ */
    const ready = async () => {
      for (let i = 0; i < 120; i++) {
        const r = await send('Runtime.evaluate', {
          expression: `(() => {
            const im = document.querySelector(${JSON.stringify(sel)} + ' img');
            return document.readyState==='complete' && document.fonts.status==='loaded'
              && !!im && im.complete && im.naturalWidth>0;
          })()`,
          returnByValue: true,
        });
        if (r.result && r.result.value === true) return true;
        await sleep(80);
      }
      return false;
    };
    if (!await ready()) throw new Error(`${name}: หน้าไม่พร้อมภายในเวลา (หา ${sel} img ที่โหลดเสร็จไม่เจอ)`);

    if (mode === 'after') {
      const p = await send('Runtime.evaluate', { expression: job.patch, returnByValue: true });
      const changed = p.result.value.changed;
      if (kind === 'hero' && !vp.mobile && changed === 0) throw new Error(`${name}: แพตช์ไม่โดนฮีโร่สักใบ — มาร์กอัปเปลี่ยนไปแล้ว`);
      if (kind === 'hero' && vp.mobile && changed !== 0) throw new Error(`${name}: แพตช์ไปโดนมือถือ ทั้งที่ต้องไม่แตะ`);
      if (kind === 'cont' && changed === 0) throw new Error(`${name}: แพตช์ไม่โดนการ์ดดูต่อสักใบ — ซีด localStorage ไม่ติด?`);
      if (!await ready()) throw new Error(`${name}: ภาพกว้างโหลดไม่ขึ้น`);
    }

    /* ฉาก "ดูต่อ" อยู่ใต้ฮีโร่ ⇒ ต้องเลื่อนไปหา แต่ยังเป็นกรอบจอเดียวขนาดเดิม
       (ไม่ยืด viewport ไม่ใช่ captureBeyondViewport) · หัวเว็บเป็น sticky จึงหักความสูงออกเอง */
    if (kind === 'cont') {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.querySelector('.cont');
          if (!el) throw new Error('ไม่พบ .cont');
          /* เลื่อนให้ "หัวข้อของ section" ไปอยู่ใต้หัวเว็บ ไม่ใช่จัดการ์ดกลางจอ —
             จัดกลางจอกับของสูง 240px ทำให้ครึ่งบนเป็นก้นฮีโร่เปล่า ๆ ซึ่งตัดสินอะไรไม่ได้ */
          const sec = el.closest('section') || el;
          const hdr = document.querySelector('header.top');
          const pad = (hdr ? hdr.getBoundingClientRect().height : 0) + 16;
          const top = sec.getBoundingClientRect().top + window.scrollY - pad;
          window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
          return true;
        })()`, returnByValue: true,
      });
      await sleep(260);
    }
    await sleep(200);

    const m = (await send('Runtime.evaluate', { expression: measure(sel), returnByValue: true })).result.value;
    if (!m) throw new Error(`${name}: หา ${sel} ไม่เจอ`);
    rows.push({ tag: vp.tag, mode, ...m });

    /* ฮีโร่ต้องอยู่ในจอแรกจริง ไม่ต้องเลื่อน — ใบของ "ดูต่อ" เลื่อนแล้วจึงไม่เข้าเกณฑ์นี้ */
    if (kind === 'hero' && !m.inFirstScreen) {
      problems.push(`${name}: ฮีโร่ล้นจอแรก (ขอบล่าง ${m.bottom} > ${m.vh}) — ภาพนี้ตัดสินจอแรกไม่ได้`);
    }

    /* ไม่ส่ง clip โดยตั้งใจ: พิกัดของ clip เป็น "พิกัดหน้า" ไม่ใช่ "พิกัดจอ"
       ⇒ ใบที่เลื่อนหน้าแล้ว clip{y:0} จะไปครอบยอดเอกสารแทนที่จะเป็นสิ่งที่ตาเห็น
       (หัวเว็บ sticky โผล่กลางภาพ) · ไม่มี clip + captureBeyondViewport:false
       = กรอบจอเดียวตามที่เห็นจริง ขนาด vp × dpr */
    const shot = async (format, quality) => (await send('Page.captureScreenshot', {
      format, ...(quality ? { quality } : {}),
      captureBeyondViewport: false,
    })).data;

    fs.writeFileSync(path.join(OUT_PNG, `${name}.png`), Buffer.from(await shot('png'), 'base64'));
    fs.writeFileSync(path.join(OUT_JPG, `${name}.jpg`), Buffer.from(await shot('jpeg', 82), 'base64'));
    n++;
  }
}

ws.close();
chrome.kill('SIGTERM');

/* ---------------- ตารางตัวเลข (ของที่เอาไปใส่รายงาน — ไม่พิมพ์มือ) ---------------- */
let sha = '(ไม่ทราบ)';
try { sha = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* ไม่ใช่ git ก็ข้าม */ }

console.log(`\nถ่ายจากเว็บจริงที่คอมมิต ${sha} · ${n} ใบ → design/v2/shots/ + shots-jpeg/\n`);
const pad = (s, w) => String(s).padEnd(w);
console.log(pad('จอ', 16) + pad('ใบ', 8) + pad('กล่องภาพ', 16) + pad('ar กล่อง', 10)
  + pad('ไฟล์', 12) + pad('ar ไฟล์', 9) + pad('เห็นสูง', 9) + pad('เห็นกว้าง', 10) + 'object-position');
for (const r of rows) {
  console.log(pad(r.tag, 16) + pad(r.mode, 8) + pad(`${r.box[0]}×${r.box[1]}`, 16) + pad(r.arBox, 10)
    + pad(`${r.nat[0]}×${r.nat[1]}`, 12) + pad(r.arImg, 9) + pad(`${r.visH}%`, 9) + pad(`${r.visW}%`, 10) + r.op);
}

if (problems.length) {
  console.log('\n✗ ' + problems.join('\n✗ '));
  process.exit(1);
}
console.log('\n✓ ทุกใบเป็นกรอบจอเดียว และฮีโร่อยู่ในจอแรกทุกขนาด');
