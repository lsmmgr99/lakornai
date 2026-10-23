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

   สองส่วน:
   1) เรขาคณิตฮีโร่หน้าแรกที่ 5 ขนาดจอ (AIO-37 เกณฑ์ข้อ 1–4)
      อ้างอิงกับ "ม็อกอัพที่ลูกค้าอนุมัติ" (design/v2/home.html) โดยวัดม็อกอัพสด ๆ ที่ขนาดจอเดียวกัน
      ไม่ฝังเลข 440/480 ไว้ในด่าน — เลขที่อนุมัติอยู่ในม็อกอัพ ด่านแค่บังคับว่าเว็บจริงต้องตรงกับมัน
   2) กวาด "ทุกหน้าที่ส่งมอบ" หา element ที่ computed display:inline แต่มี height ≠ auto
      หรือ aspect-ratio ≠ auto — กันทั้งตระกูลบั๊ก ไม่ใช่เฉพาะ .hero .bg (เกณฑ์ข้อ 5)
      ไม่รับรายชื่อหน้ามาจากใคร: สแกนไฟล์ .html ที่ส่งมอบเองทั้งหมด หน้าใหม่วันหน้าจะถูกกวาดเอง

   มิวเทชันเทสต์ (ทำซ้ำได้): เปลี่ยน `<div class="bg">` ที่ build/pages-discovery.mjs:38 กลับเป็น
   `<span>` แล้วรัน `node tools/test-layout.mjs` → ต้องตกทั้งส่วน 1 (ฮีโร่ 1872px) และส่วน 2 (3 จุด)

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
const STRICT = !!process.env.STRICT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HOME = '/';
const MOCKUP = '/design/v2/home.html';   /* ม็อกอัพที่ลูกค้าอนุมัติ — อ่านอย่างเดียว ไม่แก้ */

/* เกณฑ์รับของ AIO-37 */
const MAX_HERO = 520;            /* ข้อ 1 · ความสูงฮีโร่ */
const MAX_BOTTOM_RATIO = 0.85;   /* ข้อ 1 · ขอบล่างฮีโร่เทียบความสูงจอ */
const MIN_NEXT_VISIBLE = 80;     /* ข้อ 2 · แถวถัดไปต้องโผล่ในจอแรก */
const MOBILE_HERO = [500, 580];  /* ข้อ 3 · มือถือต้องไม่ถดถอย */
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
     เพื่อให้เกณฑ์ข้อ 4 (object-fit:cover ทำงาน) ตรวจได้จริงทั้ง 3 สไลด์ */
  var imgs = [].slice.call(document.querySelectorAll('.hero img'));
  imgs.forEach(function (im) { im.loading = 'eager'; });
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
  return {
    vw: window.innerWidth, vh: vh,
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
    } : null,
    docHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

/* ---------- 5. ตัวกวาดบั๊กตระกูล "inline แต่ตั้ง height" ----------
   ยกเว้น replaced / embedded element: height กับ aspect-ratio "มีผลจริง" กับพวกนี้แม้เป็น inline
   (<img> ทุกตัวในเว็บนี้ประกาศ width/height ตามไฟล์จริงเพื่อกัน CLS → computed aspect-ratio
   = "auto 1024 / 1536" ถ้านับด้วยจะได้เสียงรบกวนหลายร้อยตัวแล้วกลบตัวจริง) */
const SWEEP_PROBE = `(function () {
  var REPLACED = { IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1, IFRAME: 1, EMBED: 1, OBJECT: 1,
    MATH: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, BUTTON: 1, PROGRESS: 1, METER: 1 };
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
  var hits = [], n = 0;
  var all = document.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (REPLACED[el.tagName]) continue;
    /* <svg> กับลูกของมันเป็น SVG layout ไม่ใช่ CSS box — height/aspect-ratio คนละกติกา */
    if (el.namespaceURI && el.namespaceURI.indexOf('/svg') >= 0) continue;
    n++;
    var cs = getComputedStyle(el);
    if (cs.display !== 'inline') continue;
    if (cs.height === 'auto' && cs.aspectRatio === 'auto') continue;
    hits.push({
      where: where(el), height: cs.height, aspectRatio: cs.aspectRatio,
      rect: Math.round(el.getBoundingClientRect().height),
    });
  }
  return { checked: n, hits: hits };
})()`;

async function measureHero(url, vp) {
  await viewport(vp);
  await go(url);
  await evaluate(HERO_PREP);
  return evaluate(HERO_PROBE);
}

try {
  console.log(`AIO-37 · ด่านเลย์เอาต์ฮีโร่ + ด่านกัน "inline แต่ตั้ง height" ที่ ${BASE}`);

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
      console.log(`    แบบที่อนุมัติ : ${r0.bg.tag}/${r0.bg.display} · ฮีโร่ ${r0.height}px`
        + ` · ขอบล่าง y=${r0.bottom} (${(r0.bottom / vp.h * 100).toFixed(1)}%)`
        + ` · แถวถัดไป y=${ref.next ? ref.next.top : '-'} เห็น ${ref.next ? ref.next.visible : '-'}px`);
      console.log(`    เว็บที่ส่งมอบ : ${h0.bg.tag}/${h0.bg.display} · ฮีโร่ ${got.heroes.map(h => h.height).join('/')}px`
        + ` · ขอบล่าง y=${h0.bottom} (${(h0.bottom / vp.h * 100).toFixed(1)}%)`
        + ` · แถวถัดไป y=${got.next ? got.next.top : '-'} เห็น ${got.next ? got.next.visible : '-'}px`
        + ` · หน้าสูง ${got.docHeight}px`);

      /* (ก) ตัวบั๊กเอง — .bg ต้องเป็น block ทุกสไลด์ ไม่ใช่ inline */
      check(`${vp.w}×${vp.h} · .hero .bg เป็น block ทุก ${got.heroes.length} สไลด์ (ไม่ใช่ inline)`,
        got.heroes.every(h => h.bg && h.bg.display !== 'inline'),
        got.heroes.map(h => `${h.id}:<${h.bg ? h.bg.tag : '?'}>=${h.bg ? h.bg.display : 'ไม่มี .bg'}`).join(' '));

      /* (ข) ค่าที่อนุมัติ "มีผลจริง" — ความสูงกล่องจริงต้องเท่าที่ CSS ประกาศ และเท่าม็อกอัพ
         นี่คือข้อที่จับบั๊กนี้ตรงจุด: ก่อนแก้ cssHeight=480px แต่กล่องจริง 1872px */
      check(`${vp.w}×${vp.h} · ความสูงกล่องจริงของ .bg เท่ากับที่ CSS ประกาศ (${h0.bg.cssHeight})`,
        got.heroes.every(h => h.bg && (h.bg.cssHeight === 'auto'
          || Math.abs(parseFloat(h.bg.cssHeight) - h.bg.height) <= 1)),
        got.heroes.map(h => `${h.id}: CSS ${h.bg.cssHeight} vs กล่องจริง ${h.bg.height}px`).join(' · '));
      check(`${vp.w}×${vp.h} · ฮีโร่สูงเท่าม็อกอัพที่อนุมัติ (${r0.height}px)`,
        got.heroes.every(h => Math.abs(h.height - r0.height) <= 1),
        got.heroes.map(h => `${h.id}=${h.height}px`).join(' ') + ` · แบบ ${r0.height}px`);

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
        } else if (!refOkBottom && h0.bottom <= r0.bottom + DOTS_SLACK) {
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
        /* ไม่ถดถอยจากแบบ: ใช้ได้ทุกขนาดจอรวมมือถือ */
        check(`${vp.w}×${vp.h} · แถวถัดไปโผล่ไม่น้อยกว่าม็อกอัพ (${got.next.visible}px vs ${ref.next.visible}px)`,
          got.next.visible >= ref.next.visible - DOTS_SLACK,
          `เว็บจริง ${got.next.visible}px · แบบ ${ref.next.visible}px`);
        if (!isMobile) {
          if (got.next.visible >= MIN_NEXT_VISIBLE) {
            check(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ${got.next.visible}px ≥ ${MIN_NEXT_VISIBLE}px`, true);
          } else if (ref.next.visible < MIN_NEXT_VISIBLE) {
            pendingCheck(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ${got.next.visible}px < ${MIN_NEXT_VISIBLE}px (เกณฑ์ข้อ 2)`,
              `ม็อกอัพที่อนุมัติได้ ${ref.next.visible}px ที่ขนาดจอเดียวกัน`
              + ` · เพิ่มได้ต่อเมื่อลดความสูงฮีโร่หรือระยะเหนือฮีโร่ในแบบ`);
          } else {
            check(`${vp.w}×${vp.h} · แถวถัดไปเห็นในจอแรก ≥ ${MIN_NEXT_VISIBLE}px`, false,
              `เห็น ${got.next.visible}px · เริ่มที่ y=${got.next.top} จอสูง ${got.vh} · แบบได้ ${ref.next.visible}px`);
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
      + ' หา element ที่ display:inline แต่ตั้ง height/aspect-ratio');
    const offenders = [];
    let elements = 0, probes = 0;
    const t0 = Date.now();
    for (let i = 0; i < PAGES.length; i++) {
      const p = PAGES[i];
      let navigated = false;
      for (const vp of SWEEP_VIEWPORTS) {
        await viewport(vp);
        /* นำทางครั้งเดียวต่อหน้า แล้วเปลี่ยนขนาดจอทับ — media query ประเมินใหม่ทันทีโดยไม่ต้องโหลดซ้ำ
           (โหลดซ้ำทุกหน้าเพื่อกวาด 2 ขนาดใช้เวลาเท่าตัวโดยไม่ได้อะไรเพิ่ม) */
        if (!navigated) { await go(p); navigated = true; }
        else await settle();
        const r = await evaluate(SWEEP_PROBE);
        elements += r.checked; probes++;
        for (const h of r.hits) offenders.push({ page: p, vp: `${vp.w}×${vp.h}`, ...h });
      }
      if ((i + 1) % 100 === 0 || i === PAGES.length - 1) {
        console.log(`    … ${i + 1}/${PAGES.length} หน้า · ${elements} element · `
          + `พบปัญหา ${offenders.length} จุด · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }
    check(`กวาดครบทุกหน้าที่ส่งมอบ (${probes} การวัด = ${PAGES.length} หน้า × ${SWEEP_VIEWPORTS.length} ขนาดจอ)`,
      probes === PAGES.length * SWEEP_VIEWPORTS.length, `วัดได้ ${probes}`);
    if (offenders.length) {
      console.log('');
      /* รายงานทีละจุดพร้อมหลักฐานว่าค่าถูกเมิน: computed height ≠ ความสูงกล่องจริง */
      for (const o of offenders.slice(0, 40)) {
        console.log(`  ✗ ${o.page} @${o.vp} · ${o.where} · display:inline`
          + ` · height:${o.height} · aspect-ratio:${o.aspectRatio} · กล่องจริงสูง ${o.rect}px`);
      }
      if (offenders.length > 40) console.log(`  … อีก ${offenders.length - 40} จุด`);
      const pages = [...new Set(offenders.map(o => o.page))];
      check(`ไม่มี element ที่ display:inline แต่ตั้ง height/aspect-ratio`
        + ` (พบ ${offenders.length} จุด ใน ${pages.length} หน้า)`, false, pages.slice(0, 8).join(' '));
    } else {
      check(`ไม่มี element ที่ display:inline แต่ตั้ง height/aspect-ratio`
        + ` ใน ${PAGES.length} หน้า (ตรวจ ${elements} element)`, true);
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
