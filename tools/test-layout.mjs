/* ด่านเลย์เอาต์ฮีโร่หน้าแรก + ด่านกันบั๊กตระกูล "inline แต่ตั้ง height" — AIO-37
   รัน:  node tools/test-layout.mjs
         SKIP_BUILD=1 node tools/test-layout.mjs       (ตรวจไฟล์ที่มีอยู่ตามสภาพ ไม่ build ใหม่)
         ONLY=hero node tools/test-layout.mjs          (เฉพาะส่วน 1 · ONLY=sweep = เฉพาะส่วน 2)
         STRICT=1 node tools/test-layout.mjs           (นับข้อ "รอมติ" เป็นตก — ดูหมายเหตุท้ายไฟล์)
         LAY_PORT=4299 LAY_CDP=9499 node tools/test-layout.mjs   (ตั้งพอร์ตทับเมื่อรันขนานกับ run อื่น)

   ทำไมต้องใช้เบราว์เซอร์จริง: บั๊กที่ด่านนี้กันคือ "ค่าถูกตั้งแต่ไม่ถูกใช้" — `<span>` เป็น inline
   non-replaced ซึ่ง CSS height / aspect-ratio ไม่มีผล · getComputedStyle ยังรายงาน
   "height: 480px" ตามที่เขียนไว้ ขณะที่กล่องจริงสูง 1872px ตามสัดส่วนไฟล์ปก (1024×1536)
   → grep CSS ไม่เห็น · อ่าน computed style ไม่เห็น · เห็นได้ทางเดียวคือเทียบกับ
   getBoundingClientRect() ของหน้าที่ render จริง

   สามส่วน:
   0) self-test ของตัวกวาดเอง — วาง fixture ที่ต้องจับ (span ตั้ง height/width/aspect-ratio ·
      object ที่แสดง fallback · ตัวที่ซ่อนด้วย [hidden]) และที่ต้องไม่จับ (span เปล่า ·
      display:block · img · object ที่โหลดทรัพยากรได้) แล้วบังคับว่าผลต้องตรงเป๊ะ
   1) เรขาคณิตฮีโร่หน้าแรกที่ 5 ขนาดจอ (AIO-37 เกณฑ์ข้อ 1–4)
      อ้างอิงกับ "ม็อกอัพที่ลูกค้าอนุมัติ" (design/v2/home.html) โดยวัดม็อกอัพสด ๆ ที่ขนาดจอเดียวกัน
      ไม่ฝังเลข 440/480 ไว้ในด่าน — เลขที่อนุมัติอยู่ในม็อกอัพ ด่านแค่บังคับว่าเว็บจริงต้องตรงกับมัน
      (มีกรอบ MOCKUP_HERO กันฐานอ้างอิงเลื่อนเงียบ ๆ)
   2) กวาด "ทุกหน้าที่ส่งมอบ" หา element ที่ computed display:inline แต่มี height / width /
      aspect-ratio ≠ auto — กันตระกูลบั๊กนี้ทั้งตระกูล ไม่ใช่เฉพาะ .hero .bg (เกณฑ์ข้อ 5)
      ไม่รับรายชื่อหน้ามาจากใคร: สแกนไฟล์ .html ที่ส่งมอบเองทั้งหมด หน้าใหม่วันหน้าจะถูกกวาดเอง
      ขอบเขตที่ตรวจได้จริง: สภาพหน้าตอนโหลด + แผงที่ซ่อนด้วย [hidden] (ด่านเปิดให้ก่อนกวาด)
      · UI ที่ขึ้นจากสถานะใน localStorage (เช่น .cont/.nextup/.endcard ที่ต้องมีประวัติดูก่อน)
      ยังไม่ถูกกวาด — รายงานจึงพิมพ์จำนวน "element ที่เป็น inline และกฎนี้ตรวจได้จริง" กำกับไว้
      ไม่ใช่จำนวน element ทั้งหน้า

   มิวเทชันเทสต์ (ทำซ้ำได้): เปลี่ยน `<div class="bg">` ที่ build/pages-discovery.mjs:40 กลับเป็น
   `<span>` แล้วรัน `node tools/test-layout.mjs` → ต้องตกทั้งส่วน 1 (ฮีโร่ 1872px) และส่วน 2 (6 จุด)

   หมายเหตุ "รอมติ": ที่ 1366×768 ม็อกอัพที่อนุมัติเองก็ได้ขอบล่างฮีโร่ 86.1% ของจอ และแถวถัดไป
   โผล่ 56px — เกณฑ์ข้อ 1 (≤85%) และข้อ 2 (≥80px) ที่ขนาดจอนั้นจึงทำไม่ได้โดยไม่แก้ "แบบ"
   ซึ่งใบงานห้ามไว้ ("ห้ามเปลี่ยนความสูงฮีโร่ให้ต่างจากแบบที่อนุมัติ") · ด่านนี้จึงแยกเป็น
   "รอมติ" พร้อมเลขของม็อกอัพกำกับทุกครั้ง ไม่กลืนหายและไม่ตีเป็นผ่าน · ถ้า CEO สั่งให้ยึด
   ตัวเลขในใบงานเหนือแบบ ให้รันด้วย STRICT=1 (หรือแก้ค่าตั้งต้นของ STRICT) แล้วด่านจะแดง */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-lay-'));
const ONLY = process.env.ONLY || '';
/* STRICT=0 ต้องหมายถึง "ปิด" — `!!process.env.STRICT` เปิดโหมดให้ทุกค่าที่ไม่ใช่สตริงว่าง
   ซึ่งขัดกับ README ที่เขียน STRICT=1 (AIO-39) */
const STRICT = /^(1|true|yes|on)$/i.test(process.env.STRICT || '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ONLY ที่สะกดผิดเคยรันทั้งสองส่วนเงียบ ๆ ทั้งที่คนสั่งคิดว่ารันส่วนเดียว — ล้มทันทีดีกว่า */
if (!['', 'hero', 'sweep'].includes(ONLY)) {
  console.error(`✗ ONLY=${ONLY} ไม่รู้จัก — ใช้ได้เฉพาะ hero | sweep (หรือไม่ตั้งเลย = ทั้งสองส่วน)`);
  process.exit(1);
}

const HOME = '/';
const MOCKUP = '/design/v2/home.html';   /* ม็อกอัพที่ลูกค้าอนุมัติ — อ่านอย่างเดียว ไม่แก้ */

/* เกณฑ์รับของ AIO-37 */
const MAX_HERO = 520;            /* ข้อ 1 · ความสูงฮีโร่ */
const MAX_BOTTOM_RATIO = 0.85;   /* ข้อ 1 · ขอบล่างฮีโร่เทียบความสูงจอ */
const MIN_NEXT_VISIBLE = 80;     /* ข้อ 2 · แถวถัดไปต้องโผล่ในจอแรก */
const MOBILE_HERO = [500, 580];  /* ข้อ 3 · มือถือต้องไม่ถดถอย */
const HERO_SLIDES = 3;           /* ข้อ 4 · ใบงานระบุ "ทั้ง 3 สไลด์" — ม็อกอัพมีใบเดียว เทียบไม่ได้ */
/* กรอบความสมเหตุสมผลของ "ฐานอ้างอิง" เอง: ม็อกอัพที่อนุมัติสูง 440/480px (เดสก์ท็อป) และ 537px (มือถือ)
   ถ้าใครแก้ design/v2 แล้วฐานของด่านเลื่อนตามไปเงียบ ๆ ข้อนี้จะแดง (AIO-39 R4) */
const MOCKUP_HERO = [400, 560];
const MIN_PAGES = 480;           /* ส่วน 2 · พื้นจำนวนหน้าที่ส่งมอบ กันกรณีกวาด 0 หน้าแล้วเขียว */
/* ส่วนต่างที่ยอมได้เมื่อเทียบกับม็อกอัพ: เว็บจริงมีแถบจุดคารูเซล (.dots) ที่ม็อกอัพไม่มี
   ทำให้แถวถัดไปเลื่อนลง 2px · เผื่อไว้ 4px กันการปัดเศษ ไม่ใช่เผื่อให้ความสูงฮีโร่ขยับได้ */
const DOTS_SLACK = 4;

const DESKTOP = [
  { w: 1440, h: 900 }, { w: 1366, h: 768 }, { w: 1920, h: 1080 }, { w: 820, h: 1180 },
];
const MOBILE = { w: 390, h: 844 };
/* ส่วนกวาดใช้สองขนาดจอ เพราะกฎ height/aspect-ratio ของ .hero .bg อยู่คนละฝั่ง media query:
   ≥720px ใช้ height · ต่ำกว่านั้นใช้ aspect-ratio — กวาดขนาดเดียวจะเห็นบั๊กแค่ครึ่งเดียว */
const SWEEP_VIEWPORTS = [{ w: 1440, h: 900 }, { w: 390, h: 844 }];

if (!fs.existsSync(path.join(ROOT, 'design/v2/home.html'))) {
  console.error('✗ ไม่พบ design/v2/home.html — ด่านนี้ใช้ม็อกอัพที่อนุมัติเป็นค่าอ้างอิง');
  process.exit(1);
}
if (!process.env.SKIP_BUILD) {
  const r = spawnSync('node', ['build/build.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('✗ build/build.mjs ล้ม — วัดไฟล์ที่ส่งมอบต่อไม่ได้\n' + (r.stderr || r.stdout));
    process.exit(1);
  }
}

/* ---------- 1. พอร์ต ----------
   run อื่นใน workspace เดียวกันอาจถือพอร์ตอยู่ (หรือมี chrome ค้างจาก timeout) · ขอ OS เลือกให้ */
async function freePort(envName) {
  if (process.env[envName]) return +process.env[envName];
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
const PORT = await freePort('LAY_PORT');
const CDP = await freePort('LAY_CDP');
const BASE = `http://127.0.0.1:${PORT}`;

/* ---------- 2. รายชื่อหน้าที่ส่งมอบ ----------
   design/ เป็นไฟล์เสนอแบบของ Visual ไม่ใช่เว็บที่ส่งมอบ · build/ tools/ ci/ ไม่มีหน้าให้เบราว์เซอร์เปิด
   .paperclip-repositories เป็นสำเนารีโปของ runtime ไม่ใช่ของที่ส่งมอบ */
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'ci', 'docs',
  '.paperclip-repositories', '.claude']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
}
const PAGES = walk(ROOT)
  .map(f => '/' + path.relative(ROOT, f).replace(/index\.html$/, ''))
  .sort((a, b) => a.localeCompare(b));

/* ---------- 3. เบราว์เซอร์ ---------- */
const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  '--hide-scrollbars', `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP}`,
  '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });

function cleanup(code) {
  try { server.kill('SIGTERM'); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ chrome ไม่ได้');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
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
await send('Page.enable'); await send('Runtime.enable');

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js error');
  return r.result.value;
}
const viewport = ({ w, h }) =>
  send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 720 });
const settle = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');

/* รอให้หน้านิ่งก่อนวัด: ฟอนต์โหลดเสร็จ (ไม่อย่างนั้นความสูงข้อความขยับ)
   รูป lazy ที่อยู่นอกจอไม่ต้องรอตรงนี้ — ส่วนฮีโร่บังคับโหลดเองใน HERO_PREP */
async function go(p) {
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 150; i++) {
    try {
      if (await evaluate(`document.readyState === 'complete' && document.fonts.status === 'loaded'
        && [...document.images].every(im => im.complete || im.loading === 'lazy')`)) {
        await settle();
        return;
      }
    } catch { /* ระหว่างสลับเอกสาร */ }
    await sleep(60);
  }
  throw new Error('โหลดหน้าไม่เสร็จ: ' + p);
}

let pass = 0, fail = 0;
const pendingCalls = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
/* ข้อที่เว็บจริง "ตรงกับแบบที่อนุมัติแล้ว แต่ยังไม่ถึงตัวเลขในใบงาน" — แบบเองก็ไม่ถึง
   จึงไม่ใช่ผลของการแก้รอบนี้ และแก้ต่อไม่ได้โดยไม่แตะแบบ · ต้องมีมติก่อน */
function pendingCheck(name, detail) {
  pendingCalls.push(name + (detail ? ' — ' + detail : ''));
  if (STRICT) { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''} [STRICT]`); }
  else console.log(`  ⚠ รอมติ · ${name}${detail ? ' — ' + detail : ''}`);
}

/* ---------- 4. ตัวตรวจเรขาคณิตฮีโร่ ----------
   ใช้ตัวเดียวกันทั้งกับหน้าแรกของเว็บจริงและกับม็อกอัพที่อนุมัติ (ม็อกอัพมีฮีโร่ 1 สไลด์ ไม่มี .dots)
   ไม่ผูกกับ id ของแถวถัดไป: หา section ถัดจาก section ของฮีโร่ แล้วอ่านหัวข้อของมันมารายงานด้วย
   ถ้าลำดับหน้าถูกสลับวันหน้า ด่านจะบอกว่าแถวถัดไปกลายเป็นอะไร ไม่ใช่เงียบแล้วผ่าน */
const HERO_PREP = `(async function () {
  /* สไลด์ 2–3 เป็น loading=lazy และอยู่นอกจอ → ไม่โหลดเอง · บังคับโหลดให้ครบก่อนวัด
     เพื่อให้เกณฑ์ข้อ 4 (object-fit:cover ทำงาน) ตรวจได้จริงทั้ง 3 สไลด์
     เก็บค่า loading เดิมไว้ก่อนทับ เพราะการทับทำให้ด่านมองไม่เห็น regression ที่เปลี่ยน
     สไลด์ 2–3 เป็น eager (เสีย LCP/แบนด์วิดท์) — ค่าเดิมถูก assert ใน HERO_PROBE (AIO-39) */
  var imgs = [].slice.call(document.querySelectorAll('.hero img'));
  imgs.forEach(function (im) {
    im.dataset.layLoading = im.getAttribute('loading') || '';
    im.loading = 'eager';
  });
  await Promise.all(imgs.map(function (im) { return im.decode().catch(function () { return null; }); }));
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  return imgs.length;
})()`;

const HERO_PROBE = `(function () {
  var heroes = [].slice.call(document.querySelectorAll('.hero'));
  if (!heroes.length) return { error: 'ไม่พบ .hero ในหน้า' };
  var sec = heroes[0].closest('section');
  var next = sec ? sec.nextElementSibling : null;
  var vh = window.innerHeight;
  var nr = next ? next.getBoundingClientRect() : null;
  var root = getComputedStyle(document.documentElement);
  /* แถบลอยที่ปักขอบล่างจอ (มือถือมี nav.bottom · เดสก์ท็อปซ่อนไว้) ทับเนื้อหาที่นับว่า
     "เห็นในจอแรก" → หาขอบบนของมันมาหักก่อน ไม่งั้นตัวเลขโผล่ Npx สูงกว่าที่ตาเห็นจริง (AIO-41 ข้อ B) */
  var coverTop = vh;
  var fixedBars = [];
  var everything = document.querySelectorAll('body *');
  for (var k = 0; k < everything.length; k++) {
    var fs = getComputedStyle(everything[k]);
    if (fs.position !== 'fixed' || fs.display === 'none' || fs.visibility === 'hidden') continue;
    if (parseFloat(fs.opacity) === 0) continue;
    var fr = everything[k].getBoundingClientRect();
    if (fr.width <= 0 || fr.height <= 0) continue;
    if (fr.bottom < vh - 1 || fr.top <= vh / 2) continue;   /* เอาเฉพาะแถบที่ปักขอบล่าง */
    fixedBars.push((everything[k].tagName.toLowerCase()) + '@y' + Math.round(fr.top));
    if (fr.top < coverTop) coverTop = fr.top;
  }
  return {
    vw: window.innerWidth, vh: vh,
    dots: document.querySelectorAll('.dots [role="tab"]').length,
    coverTop: Math.round(coverTop), fixedBars: fixedBars,
    mq720: matchMedia('(min-width:720px)').matches,
    mq960: matchMedia('(min-width:960px)').matches,
    arPoster: root.getPropertyValue('--ar-poster').trim(),
    heroes: heroes.map(function (h) {
      var r = h.getBoundingClientRect();
      var bg = h.querySelector('.bg');
      var br = bg ? bg.getBoundingClientRect() : null;
      var bs = bg ? getComputedStyle(bg) : null;
      var img = bg ? bg.querySelector('img') : null;
      var ir = img ? img.getBoundingClientRect() : null;
      var is = img ? getComputedStyle(img) : null;
      return {
        id: h.id || '(ไม่มี id)',
        top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
        bg: bg ? {
          tag: bg.tagName.toLowerCase(), display: bs.display,
          cssHeight: bs.height, cssAspect: bs.aspectRatio,
          width: Math.round(br.width), height: Math.round(br.height),
        } : null,
        img: img ? {
          objectFit: is.objectFit,
          width: Math.round(ir.width), height: Math.round(ir.height),
          natural: img.naturalWidth + '×' + img.naturalHeight,
          loaded: img.complete && img.naturalWidth > 0,
          /* ค่า loading ที่หน้าส่งมอบจริงประกาศไว้ ก่อนที่ HERO_PREP จะทับเป็น eager */
          loadingAttr: img.dataset.layLoading === undefined
            ? (img.getAttribute('loading') || '') : img.dataset.layLoading,
          /* กล่องรูปต้องเท่ากล่อง .bg พอดี — ถ้าล้นออกไปคือ .bg ไม่ได้คุมความสูงจริง */
          fillsBg: br ? (Math.abs(ir.width - br.width) <= 1 && Math.abs(ir.height - br.height) <= 1) : false,
        } : null,
      };
    }),
    next: next ? {
      tag: next.tagName.toLowerCase(), id: next.id || '',
      heading: ((next.querySelector('h1,h2,h3') || {}).textContent || '').trim(),
      top: Math.round(nr.top), bottom: Math.round(nr.bottom),
      visible: Math.round(Math.max(0, Math.min(nr.bottom, vh) - Math.max(nr.top, 0))),
      /* ที่ตาเห็นจริง — หักแถบลอยที่ปักขอบล่างออกแล้ว */
      visibleNet: Math.round(Math.max(0, Math.min(nr.bottom, coverTop) - Math.max(nr.top, 0))),
    } : null,
    docHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

/* ---------- 5. ตัวกวาดบั๊กตระกูล "inline แต่ตั้ง height/width/aspect-ratio" ----------
   ยกเว้น replaced / embedded element: height · width · aspect-ratio "มีผลจริง" กับพวกนี้แม้เป็น inline
   (<img> ทุกตัวในเว็บนี้ประกาศ width/height ตามไฟล์จริงเพื่อกัน CLS → computed aspect-ratio
   = "auto 1024 / 1536" ถ้านับด้วยจะได้เสียงรบกวนหลายร้อยตัวแล้วกลบตัวจริง)
   <object> แยกตามสถานะ ไม่ใช่ตามชื่อแท็ก: ตัวที่โหลดทรัพยากรไม่ได้จะแสดง fallback content
   แล้วกลายเป็น non-replaced เหมือน <span> — ค่าที่ตั้งไว้ถูกเมินเหมือนกัน (AIO-40) */
const SWEEP_PREP = `(function () {
  /* แผงที่ JS เปิดตอนใช้งาน ([hidden]{display:none} ใน assets/site.css) ไม่มีทางถูกตรวจถ้าไม่เปิด
     เพราะ display:none ตกเงื่อนไข display:inline ทุกตัว → ถอด hidden ก่อนกวาด (AIO-39 R3)
     หน้านี้ถูกทิ้งหลังวัด จึงไม่ต้องใส่คืน · ไม่ได้แก้ไฟล์ที่ส่งมอบ แก้แต่ DOM ในหน่วยความจำ */
  var h = document.querySelectorAll('[hidden]');
  for (var i = 0; i < h.length; i++) h[i].removeAttribute('hidden');
  return h.length;
})()`;

const SWEEP_PROBE = `(function () {
  var REPLACED = { IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1, IFRAME: 1, EMBED: 1, OBJECT: 1,
    MATH: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, BUTTON: 1, PROGRESS: 1, METER: 1 };
  function objectReplaced(el, cs) {
    /* ลูกที่ยัง render อยู่ = เบราว์เซอร์กำลังแสดง fallback content → ไม่ใช่ replaced */
    for (var k = 0; k < el.children.length; k++)
      if (el.children[k].getClientRects().length > 0) return false;
    /* มีเอกสารฝังอยู่ (html/svg) = replaced · cross-origin โยน exception ก็แปลว่ามีเอกสารจริง */
    try { if (el.contentDocument || el.contentWindow) return true; } catch (e) { return true; }
    /* เหลือกรณีฝังรูป/สื่อที่ไม่มีเอกสาร: ถ้าความสูงที่ประกาศ "ถูกใช้จริง" ก็เป็น replaced จริง
       ถ้ากล่องจริงไม่ตรงกับที่ประกาศ คืออาการ "ค่าถูกตั้งแต่ไม่ถูกใช้" แบบเดียวกับ span */
    var h = parseFloat(cs.height);
    if (!isFinite(h)) return false;
    return Math.abs(el.getBoundingClientRect().height - h) <= 1;
  }
  function tagOf(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) return s + '#' + el.id;
    var c = typeof el.className === 'string' ? el.className.trim() : '';
    return c ? s + '.' + c.split(/\\s+/).join('.') : s;
  }
  function where(el) {
    var p = el.parentElement;
    return (p ? tagOf(p).split('.')[0] + ' > ' : '') + tagOf(el);
  }
  var hits = [], scanned = 0, inline = 0;
  var all = document.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    /* <svg> กับลูกของมันเป็น SVG layout ไม่ใช่ CSS box — height/aspect-ratio คนละกติกา */
    if (el.namespaceURI && el.namespaceURI.indexOf('/svg') >= 0) continue;
    scanned++;
    var cs = getComputedStyle(el);
    if (REPLACED[el.tagName] && (el.tagName !== 'OBJECT' || objectReplaced(el, cs))) continue;
    if (cs.display !== 'inline') continue;
    /* นับเฉพาะตัวที่กฎนี้ "ตรวจได้จริง" — display:none / block / flex item ไม่เข้าข่ายบั๊กนี้
       ตัวเลขนี้จึงเป็นความครอบคลุมจริงของด่าน ไม่ใช่จำนวน element ทั้งหน้า (AIO-39 R3) */
    inline++;
    if (cs.height === 'auto' && cs.width === 'auto' && cs.aspectRatio === 'auto') continue;
    var r = el.getBoundingClientRect();
    hits.push({
      where: where(el), height: cs.height, width: cs.width, aspectRatio: cs.aspectRatio,
      rect: Math.round(r.height), rectW: Math.round(r.width),
    });
  }
  return { scanned: scanned, inline: inline, hits: hits };
})()`;

/* ---------- 5.1 self-test ของตัวกวาดเอง ----------
   ตัวกวาดคือ "เครื่องวัด" ของด่านนี้ ถ้ามันตาบอดด่านจะเขียวแบบไร้ความหมาย
   fixture นี้วางเคสที่ต้องจับและเคสที่ต้องไม่จับไว้ในหน้าเปล่า แล้วบังคับว่าผลต้องตรงเป๊ะ
   ครอบคลุมสิ่งที่รีวิวสองฝั่งเสนอ: width (AIO-39 R2) · object ที่แสดง fallback (AIO-40)
   · แผง [hidden] ที่ต้องถูกเปิดก่อนกวาด (AIO-39 R3) */
const PROBE_FIXTURE = `(async function () {
  document.body.innerHTML = '';
  var SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  var html = ''
    + '<span id="f-height" style="height:200px">x</span>'
    + '<span id="f-width" style="width:300px">x</span>'
    + '<span id="f-aspect" style="aspect-ratio:1/1">x</span>'
    + '<span id="f-clean">x</span>'
    + '<span id="f-block" style="display:block;height:200px">x</span>'
    + '<object id="f-obj-fallback" style="display:inline;height:200px"><span>fallback</span></object>'
    + '<div hidden><span id="f-hidden" style="height:200px">x</span></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  var img = document.createElement('img');
  img.id = 'f-img'; img.style.cssText = 'display:inline;height:200px'; img.src = SVG;
  document.body.appendChild(img);
  var obj = document.createElement('object');
  obj.id = 'f-obj-ok'; obj.style.cssText = 'display:inline;height:200px';
  var loaded = new Promise(function (res) { obj.onload = res; obj.onerror = res; setTimeout(res, 2000); });
  obj.data = SVG;
  document.body.appendChild(obj);
  await loaded;
  await img.decode().catch(function () { return null; });
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  return true;
})()`;
/* ต้องถูกจับให้ครบและห้ามจับเกินจากนี้ */
const PROBE_MUST_HIT = ['span#f-height', 'span#f-width', 'span#f-aspect',
  'object#f-obj-fallback', 'span#f-hidden'];

async function measureHero(url, vp) {
  await viewport(vp);
  await go(url);
  await evaluate(HERO_PREP);
  return evaluate(HERO_PROBE);
}

try {
  console.log(`AIO-37 · ด่านเลย์เอาต์ฮีโร่ + ด่านกัน "inline แต่ตั้ง height" ที่ ${BASE}`);

  /* ===== ส่วน 0 · self-test ของตัวกวาด (ใช้เวลา ~1 วินาที) =====
     ตัวกวาดคือเครื่องวัดของส่วน 2 · ถ้ามันตาบอด ส่วน 2 จะเขียวแบบไร้ความหมาย 504 หน้า */
  if (ONLY !== 'hero') {
    console.log('\nส่วน 0 · self-test ตัวกวาด — fixture ที่ต้องจับและที่ต้องไม่จับ');
    await viewport(SWEEP_VIEWPORTS[0]);
    await go(HOME);
    await evaluate(PROBE_FIXTURE);
    await evaluate(SWEEP_PREP);
    const sr = await evaluate(SWEEP_PROBE);
    const got = sr.hits.map(h => h.where.split('> ').pop()).filter(w => w.includes('#f-')).sort();
    const want = [...PROBE_MUST_HIT].sort();
    const missed = want.filter(w => !got.includes(w));
    const extra = got.filter(w => !want.includes(w));
    for (const h of sr.hits.filter(x => x.where.includes('#f-'))) {
      console.log(`    จับได้: ${h.where.split('> ').pop()} · height:${h.height} · width:${h.width}`
        + ` · aspect-ratio:${h.aspectRatio} · กล่องจริง ${h.rectW}×${h.rect}px`);
    }
    check(`ตัวกวาดจับ fixture ที่ต้องจับครบ ${want.length} เคส`
      + ' (height · width · aspect-ratio · object ที่แสดง fallback · ตัวที่ซ่อนด้วย [hidden])',
      missed.length === 0, `ไม่จับ: ${missed.join(' ') || '-'}`);
    check('ตัวกวาดไม่จับเคสที่ถูกต้อง (span เปล่า · display:block · img · object ที่โหลดได้)',
      extra.length === 0, `จับเกิน: ${extra.join(' ') || '-'}`);
  }

  /* ===== ส่วน 1 · เรขาคณิตฮีโร่หน้าแรก (เกณฑ์ข้อ 1–4) ===== */
  if (ONLY !== 'sweep') {
    console.log(`\nส่วน 1 · ฮีโร่หน้าแรก — สูง ≤ ${MAX_HERO}px · ขอบล่าง ≤ ${MAX_BOTTOM_RATIO * 100}% ของจอ`
      + ` · แถวถัดไปโผล่ ≥ ${MIN_NEXT_VISIBLE}px · เทียบกับม็อกอัพที่อนุมัติ ${MOCKUP}`);

    for (const vp of [...DESKTOP, MOBILE]) {
      const isMobile = vp.w === MOBILE.w && vp.h === MOBILE.h;
      const ref = await measureHero(MOCKUP, vp);          /* แบบที่อนุมัติ */
      const got = await measureHero(HOME, vp);            /* เว็บที่ส่งมอบ */
      console.log(`\n  ${vp.w}×${vp.h}${isMobile ? ' (มือถือ)' : ''}`);
      if (ref.error || got.error) {
        check(`${vp.w}×${vp.h} · วัดฮีโร่ได้ทั้งม็อกอัพและเว็บจริง`, false,
          `ม็อกอัพ: ${ref.error || 'ok'} · เว็บจริง: ${got.error || 'ok'}`);
        continue;
      }
      const h0 = got.heroes[0], r0 = ref.heroes[0];
      const limit = Math.round(vp.h * MAX_BOTTOM_RATIO);
      /* เงื่อนไขเข้าข่าย "รอมติ" ได้: เว็บจริงต้องตรงกับแบบแล้วจริง ๆ ทั้งความสูง "และตำแหน่ง"
         ของทุกสไลด์ ไม่อย่างนั้น regression (ฮีโร่ 1872px หรือสไลด์ที่ถูกดันลงมา)
         จะหลุดไปอยู่กองรอมติทั้งที่เป็นของเสียเต็มตัว — ข้อที่ไม่เข้าข่ายต้องเป็น ✗ เสมอ
         ข้อ posParity ปิดช่องที่ AIO-40 พิสูจน์: เดิมทางเข้ารอมติดูแต่ขอบล่างของสไลด์แรก */
      const heightParity = got.heroes.every(h => Math.abs(h.height - r0.height) <= 1);
      const posParity = got.heroes.every(h => Math.abs(h.bottom - r0.bottom) <= DOTS_SLACK);
      console.log(`    แบบที่อนุมัติ : ${r0.bg.tag}/${r0.bg.display} · ฮีโร่ ${r0.height}px`
        + ` · ขอบล่าง y=${r0.bottom} (${(r0.bottom / vp.h * 100).toFixed(1)}%)`
        + ` · แถวถัดไป y=${ref.next ? ref.next.top : '-'} เห็น ${ref.next ? ref.next.visible : '-'}px`
        + (ref.next && ref.next.visibleNet !== ref.next.visible ? ` (หักแถบลอย ${ref.next.visibleNet}px)` : ''));
      console.log(`    เว็บที่ส่งมอบ : ${h0.bg.tag}/${h0.bg.display} · ฮีโร่ ${got.heroes.map(h => h.height).join('/')}px`
        + ` · ขอบล่าง y=${got.heroes.map(h => h.bottom).join('/')} (${(h0.bottom / vp.h * 100).toFixed(1)}%)`
        + ` · แถวถัดไป y=${got.next ? got.next.top : '-'} เห็น ${got.next ? got.next.visible : '-'}px`
        + (got.next && got.next.visibleNet !== got.next.visible ? ` (หักแถบลอย ${got.next.visibleNet}px)` : '')
        + ` · หน้าสูง ${got.docHeight}px`);
      if (got.fixedBars.length) console.log(`    แถบลอยที่ปักขอบล่าง: ${got.fixedBars.join(' ')} · ขอบบนที่ y=${got.coverTop}`);

      /* (ก) ตัวบั๊กเอง — .bg ต้องเป็น block ทุกสไลด์ ไม่ใช่ inline */
      check(`${vp.w}×${vp.h} · .hero .bg เป็น block ทุก ${got.heroes.length} สไลด์ (ไม่ใช่ inline)`,
        got.heroes.every(h => h.bg && h.bg.display !== 'inline'),
        got.heroes.map(h => `${h.id}:<${h.bg ? h.bg.tag : '?'}>=${h.bg ? h.bg.display : 'ไม่มี .bg'}`).join(' '));

      /* (ข) จำนวนสไลด์ — ทุกข้อข้างล่างใช้ every() ซึ่งเป็นจริงเสมอถ้าสไลด์หาย
         (regression ที่ทำ TOP10.slice(0,3) เหลือสไลด์เดียวจะเขียวทั้งแผง) · ม็อกอัพเทียบไม่ได้
         เพราะมีฮีโร่ใบเดียว จึง assert กับจำนวนที่ใบงานกำหนดไว้ตรง ๆ (AIO-39 R1) */
      check(`${vp.w}×${vp.h} · ฮีโร่มี ${HERO_SLIDES} สไลด์ และจุดคารูเซลเท่าจำนวนสไลด์`,
        got.heroes.length === HERO_SLIDES && got.dots === HERO_SLIDES,
        `สไลด์ ${got.heroes.length} ใบ · จุด ${got.dots} จุด`);

      /* (ค) ฐานอ้างอิงต้องยังเป็นแบบที่อนุมัติ — ด่านนี้ไม่ฝังเลข 440/480 ไว้ แต่วัดม็อกอัพสด
         ผลพลอยได้คือใครแก้ design/v2 แล้ว regenerate จะย้ายฐานของด่านไปด้วย (check-mockup.mjs
         ตรวจแค่ว่าสร้างซ้ำได้เหมือนเดิม ไม่ได้ตรวจว่าเลขยังเท่าที่อนุมัติ) · กรอบนี้กันการขยับฐาน
         เงียบ ๆ โดยไม่ต้องฝังเลขเป๊ะ (AIO-39 R4) */
      check(`${vp.w}×${vp.h} · ม็อกอัพอ้างอิงอยู่ในกรอบที่อนุมัติ ${MOCKUP_HERO[0]}–${MOCKUP_HERO[1]}px (ได้ ${r0.height}px)`,
        r0.height >= MOCKUP_HERO[0] && r0.height <= MOCKUP_HERO[1],
        `ม็อกอัพ ${MOCKUP} สูง ${r0.height}px — ถ้าแบบเปลี่ยนจริง ต้องแก้กรอบนี้พร้อมมติ ไม่ใช่ปล่อยให้ฐานเลื่อน`);

      /* (ง) ค่าที่อนุมัติ "มีผลจริง" — ความสูงกล่องจริงต้องเท่าที่ CSS ประกาศ และเท่าม็อกอัพ
         นี่คือข้อที่จับบั๊กนี้ตรงจุด: ก่อนแก้ cssHeight=480px แต่กล่องจริง 1872px
         ยังมีค่าทับกับข้อถัดไปอยู่บ้าง (สำหรับกล่องที่ height มีผล computed = used value)
         แต่จับเพิ่มได้สองอย่างที่ข้ออื่นจับไม่ได้: display:contents และ display:none */
      check(`${vp.w}×${vp.h} · ความสูงกล่องจริงของ .bg เท่ากับที่ CSS ประกาศ (${h0.bg.cssHeight})`,
        got.heroes.every(h => h.bg && (h.bg.cssHeight === 'auto'
          || Math.abs(parseFloat(h.bg.cssHeight) - h.bg.height) <= 1)),
        got.heroes.map(h => `${h.id}: CSS ${h.bg.cssHeight} vs กล่องจริง ${h.bg.height}px`).join(' · '));
      check(`${vp.w}×${vp.h} · ฮีโร่สูงเท่าม็อกอัพที่อนุมัติ (${r0.height}px)`,
        heightParity,
        got.heroes.map(h => `${h.id}=${h.height}px`).join(' ') + ` · แบบ ${r0.height}px`);

      /* (จ) ตำแหน่งของ "ทุกสไลด์" ต้องตรงกับแบบ ไม่ใช่แค่สไลด์แรก
         AIO-40 พิสูจน์ด้วย translateY(200px) บน #hero-2: ที่จอสูงพอ ขอบล่างยังไม่เกินเพดาน 85%
         จึงเขียวทั้งแผงทั้งที่สไลด์ 2 หลุดจากแบบไป 200px — ข้อนี้ทำให้แดงทุกขนาดจอ */
      check(`${vp.w}×${vp.h} · ขอบล่างฮีโร่ทุกสไลด์ตรงกับแบบ (y=${r0.bottom} ±${DOTS_SLACK}px)`,
        posParity,
        got.heroes.map(h => `${h.id}=y${h.bottom}`).join(' ') + ` · แบบ y=${r0.bottom}`);

      /* (ฉ) ลำดับการโหลดปก — HERO_PREP ทับ loading เป็น eager ก่อนวัด ถ้าไม่ assert ค่าเดิมไว้
         regression ที่ทำให้สไลด์ 2–3 เป็น eager (เสีย LCP/แบนด์วิดท์) จะมองไม่เห็นเลย (AIO-39) */
      if (got.heroes.length > 1) {
        const la = got.heroes.map(h => (h.img ? h.img.loadingAttr || '(ไม่ระบุ)' : 'ไม่มีรูป'));
        check(`${vp.w}×${vp.h} · ปกสไลด์แรกโหลดทันที สไลด์ที่เหลือเป็น lazy (${la.join('/')})`,
          la[0] !== 'lazy' && la.slice(1).every(x => x === 'lazy'), la.join('/'));
      }

      if (isMobile) {
        /* ข้อ 3 · มือถือต้องไม่ถดถอย — ความสูงอยู่ในช่วงเดิม และยังเป็นสัดส่วนปกนิ่ง */
        const hs = got.heroes.map(h => h.height);
        check(`${vp.w}×${vp.h} · ฮีโร่สูง ${MOBILE_HERO[0]}–${MOBILE_HERO[1]}px (ได้ ${hs.join('/')})`,
          hs.every(x => x >= MOBILE_HERO[0] && x <= MOBILE_HERO[1]), hs.join('/'));
        const [arW, arH] = (got.arPoster || '2/3').split('/').map(Number);
        const want = arW / arH;
        const ratios = got.heroes.map(h => h.bg.width / h.bg.height);
        check(`${vp.w}×${vp.h} · ปกยังเป็นสัดส่วน --ar-poster (${got.arPoster}) ทุกสไลด์`,
          ratios.every(g => Math.abs(g - want) < 0.02),
          ratios.map(g => g.toFixed(3)).join('/') + ` · ต้องได้ ~${want.toFixed(3)}`);
      } else {
        /* ข้อ 1 */
        check(`${vp.w}×${vp.h} · ฮีโร่สูง ≤ ${MAX_HERO}px ทุกสไลด์`,
          got.heroes.every(h => h.height <= MAX_HERO),
          got.heroes.map(h => `${h.id}=${h.height}px`).join(' '));
        const okBottom = got.heroes.every(h => h.bottom <= limit);
        const refOkBottom = r0.bottom <= limit;
        if (okBottom) {
          check(`${vp.w}×${vp.h} · ขอบล่างฮีโร่ y=${h0.bottom} ≤ ${limit} (${MAX_BOTTOM_RATIO * 100}% ของจอ)`, true);
        } else if (!refOkBottom && heightParity && posParity) {
          /* แบบที่อนุมัติเองก็เกินเพดานนี้ที่ขนาดจอนี้ → ไม่ใช่ regression ของรอบนี้ */
          pendingCheck(`${vp.w}×${vp.h} · ขอบล่างฮีโร่ y=${h0.bottom} > ${limit} (เกณฑ์ข้อ 1)`,
            `ม็อกอัพที่อนุมัติได้ y=${r0.bottom} (${(r0.bottom / vp.h * 100).toFixed(1)}%) เท่ากัน`
            + ` · ลดลงอีกไม่ได้โดยไม่แก้ความสูงฮีโร่/ระยะเหนือฮีโร่ในแบบ`);
        } else {
          check(`${vp.w}×${vp.h} · ขอบล่างฮีโร่ y=${h0.bottom} ≤ ${limit} (${MAX_BOTTOM_RATIO * 100}% ของจอ)`,
            false, got.heroes.map(h => `${h.id}=y${h.bottom}`).join(' ') + ` · แบบได้ y=${r0.bottom}`);
        }
      }

      /* ข้อ 2 · แถวถัดจากฮีโร่ต้องโผล่ให้เห็นในจอแรก
         (ใบงานกำหนดข้อนี้กับ 4 ขนาดจอเดสก์ท็อป/แท็บเล็ต · มือถืออยู่ใต้ข้อ 3 "ไม่ถดถอย") */
      if (!got.next) {
        check(`${vp.w}×${vp.h} · มี section ถัดจากฮีโร่`, false, 'ไม่มี element ถัดไป');
      } else {
        check(`${vp.w}×${vp.h} · แถวถัดจากฮีโร่คือ "ดูต่อจากที่ค้างไว้" (${got.next.tag}#${got.next.id})`,
          got.next.heading.includes('ดูต่อจากที่ค้างไว้'), `หัวข้อที่เจอ: "${got.next.heading}"`);
        /* ใช้ตัวเลขที่หักแถบลอยที่ปักขอบล่างแล้ว (visibleNet) ทั้งสองฝั่ง — วัดด้วยไม้บรรทัดเดียวกัน
           เดสก์ท็อป/แท็บเล็ตไม่มีแถบลอย ค่าจึงเท่ากับเดิม · มือถือเท่ากันทั้งเว็บจริงและม็อกอัพ
           เพราะทั้งคู่มี nav.bottom (AIO-41 ข้อ B: ตัวเลขดิบสูงกว่าที่ตาเห็นจริง) */
        const gotVis = got.next.visibleNet, refVis = ref.next.visibleNet;
        /* ไม่ถดถอยจากแบบ: ใช้ได้ทุกขนาดจอรวมมือถือ */
        check(`${vp.w}×${vp.h} · แถวถัดไปโผล่ไม่น้อยกว่าม็อกอัพ (${gotVis}px vs ${refVis}px)`,
          gotVis >= refVis - DOTS_SLACK, `เว็บจริง ${gotVis}px · แบบ ${refVis}px`);
        const faithful = heightParity && posParity && gotVis >= refVis - DOTS_SLACK;
        if (!isMobile) {
          if (gotVis >= MIN_NEXT_VISIBLE) {
            check(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ${gotVis}px ≥ ${MIN_NEXT_VISIBLE}px`, true);
          } else if (faithful && refVis < MIN_NEXT_VISIBLE) {
            pendingCheck(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ${gotVis}px < ${MIN_NEXT_VISIBLE}px (เกณฑ์ข้อ 2)`,
              `ม็อกอัพที่อนุมัติได้ ${refVis}px ที่ขนาดจอเดียวกัน`
              + ` · เพิ่มได้ต่อเมื่อลดความสูงฮีโร่หรือระยะเหนือฮีโร่ในแบบ`);
          } else {
            check(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ≥ ${MIN_NEXT_VISIBLE}px`, false,
              `เห็น ${gotVis}px · เริ่มที่ y=${got.next.top} จอสูง ${got.vh} · แบบได้ ${refVis}px`);
          }
        }
      }

      /* ข้อ 4 · ปกยังคมและไม่ยืดบิด ทั้ง 3 สไลด์ */
      check(`${vp.w}×${vp.h} · ปกทุกสไลด์โหลดจริง · object-fit:cover · กล่องรูปเท่ากล่อง .bg พอดี`,
        got.heroes.every(h => h.img && h.img.loaded && h.img.objectFit === 'cover' && h.img.fillsBg),
        got.heroes.map(h => h.img
          ? `${h.id}: ${h.img.objectFit} · ไฟล์ ${h.img.natural}${h.img.loaded ? '' : ' (ยังไม่โหลด)'}`
            + ` · รูป ${h.img.width}×${h.img.height} กล่อง ${h.bg.width}×${h.bg.height}`
          : `${h.id}: ไม่มีรูป`).join(' · '));
    }
  }

  /* ===== ส่วน 2 · กวาดทุกหน้าที่ส่งมอบหาบั๊กตระกูลเดียวกัน (เกณฑ์ข้อ 5) ===== */
  if (ONLY !== 'hero') {
    console.log(`\nส่วน 2 · กวาด ${PAGES.length} หน้าที่ส่งมอบ × ${SWEEP_VIEWPORTS.length} ขนาดจอ`
      + ' หา element ที่ display:inline แต่ตั้ง height/width/aspect-ratio');
    /* ส่วนกวาดจะไร้ความหมายถ้าไม่เจอหน้า: probes === PAGES.length * 2 เป็นจริงเมื่อ 0 === 0
       → ตั้งพื้นจำนวนหน้าไว้ ถ้าโครงไฟล์ย้ายที่หรือลืม build ด่านต้องแดง ไม่ใช่เขียวแบบว่างเปล่า */
    check(`พบหน้าที่ส่งมอบอย่างน้อย ${MIN_PAGES} หน้า (เจอ ${PAGES.length})`,
      PAGES.length >= MIN_PAGES, `เจอ ${PAGES.length} หน้า — ลืม build หรือโครงไฟล์ย้ายที่?`);
    const offenders = [];
    let scanned = 0, inline = 0, unhidden = 0, probes = 0;
    const t0 = Date.now();
    for (let i = 0; i < PAGES.length; i++) {
      const p = PAGES[i];
      let navigated = false;
      for (const vp of SWEEP_VIEWPORTS) {
        await viewport(vp);
        /* นำทางครั้งเดียวต่อหน้า แล้วเปลี่ยนขนาดจอทับ — media query ประเมินใหม่ทันทีโดยไม่ต้องโหลดซ้ำ
           (โหลดซ้ำทุกหน้าเพื่อกวาด 2 ขนาดใช้เวลาเท่าตัวโดยไม่ได้อะไรเพิ่ม)
           ข้อจำกัดที่ต้องรู้: ถ้าวันหน้ามี JS ที่คำนวณเลย์เอาต์ตอนโหลดครั้งเดียวและไม่ฟัง resize
           ค่าที่วัดขนาดที่สองจะเป็นค่าค้างจากขนาดแรกเงียบ ๆ · วันนี้ assets/app.js ไม่มีโค้ดแบบนั้น
           ถ้าเพิ่มเข้ามาต้องเปลี่ยนมาโหลดใหม่ต่อขนาดจอ (AIO-39/AIO-40) */
        if (!navigated) { await go(p); navigated = true; unhidden += await evaluate(SWEEP_PREP); }
        else await settle();
        const r = await evaluate(SWEEP_PROBE);
        scanned += r.scanned; inline += r.inline; probes++;
        for (const h of r.hits) offenders.push({ page: p, vp: `${vp.w}×${vp.h}`, ...h });
      }
      if ((i + 1) % 100 === 0 || i === PAGES.length - 1) {
        console.log(`    … ${i + 1}/${PAGES.length} หน้า · สแกน ${scanned} element`
          + ` · เป็น inline ที่กฎนี้ตรวจได้จริง ${inline} ตัว`
          + ` · พบปัญหา ${offenders.length} จุด · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }
    check(`กวาดครบทุกหน้าที่ส่งมอบ (${probes} การวัด = ${PAGES.length} หน้า × ${SWEEP_VIEWPORTS.length} ขนาดจอ)`,
      probes === PAGES.length * SWEEP_VIEWPORTS.length, `วัดได้ ${probes}`);
    if (offenders.length) {
      console.log('');
      /* รายงานทีละจุดพร้อมหลักฐานว่าค่าถูกเมิน: computed height ≠ ความสูงกล่องจริง */
      for (const o of offenders.slice(0, 40)) {
        console.log(`  ✗ ${o.page} @${o.vp} · ${o.where} · display:inline`
          + ` · height:${o.height} · width:${o.width} · aspect-ratio:${o.aspectRatio}`
          + ` · กล่องจริง ${o.rectW}×${o.rect}px`);
      }
      if (offenders.length > 40) console.log(`  … อีก ${offenders.length - 40} จุด`);
      const pages = [...new Set(offenders.map(o => o.page))];
      check(`ไม่มี element ที่ display:inline แต่ตั้ง height/width/aspect-ratio`
        + ` (พบ ${offenders.length} จุด ใน ${pages.length} หน้า)`, false, pages.slice(0, 8).join(' '));
    } else {
      check(`ไม่มี element ที่ display:inline แต่ตั้ง height/width/aspect-ratio`
        + ` ใน ${PAGES.length} หน้า (สแกน ${scanned} element · เป็น inline ที่ตรวจได้จริง ${inline} ตัว`
        + ` · เปิดแผง [hidden] ก่อนกวาด ${unhidden} จุด)`, true);
    }
  }

  if (pendingCalls.length) {
    console.log(`\nรอมติ ${pendingCalls.length} ข้อ — เว็บจริงตรงกับแบบที่อนุมัติแล้ว แต่ยังไม่ถึงตัวเลขในใบงาน`
      + ' และแก้ต่อไม่ได้โดยไม่แตะ "แบบ" ซึ่งใบงานห้ามไว้:');
    for (const p of pendingCalls) console.log(`  ⚠ ${p}`);
  }
  console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}${pendingCalls.length ? ` · รอมติ ${pendingCalls.length}` : ''}`);
  cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  cleanup(1);
}
