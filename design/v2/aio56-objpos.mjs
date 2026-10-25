/* ============================================================================
   AIO-56 · วัด `object-position` ของช่องที่จะได้ไฟล์กว้าง 11:5 — ตอบ CTO (AIO-58)
   Visual-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/aio56-objpos.mjs
         AIO56_TREE=/tmp/aio56-pin node design/v2/aio56-objpos.mjs   → วัดทรีที่ปักไว้
         AIO56_PORT=9404 node design/v2/aio56-objpos.mjs             → เปลี่ยนพอร์ต CDP

   คำถามที่สคริปต์นี้ตอบ (ไม่ใช่ด้วยเลขคณิตบนกระดาษ — ด้วยค่าที่เบราว์เซอร์ให้มา)
     CTO เขียนใน ADR-001 §13.5 ว่า "ไฟล์ 11:5 (2.2) ในกรอบ 1.778 ที่ object-fit:cover
     ถูกครอปด้านกว้างเท่านั้น ⇒ องค์ประกอบแนวตั้งของ object-position ไม่มีผล
     ⇒ ค่าคงที่ตัวเดียวถูกทั้งสองทิศ"
     ข้อนั้นเป็นเรื่องของ **ช่องการ์ด "ดูต่อ"** (กรอบ 1.778) — สคริปต์นี้ตรวจทั้งสองช่อง
     เพราะ **กรอบฮีโร่ไม่ใช่ 1.778** มันไหลถึง ~2.9 ซึ่งกว้างกว่าไฟล์ (2.2)
     ⇒ ที่ฮีโร่ ไฟล์ถูกครอป **ด้านสูง** และองค์ประกอบแนวตั้งกลับมามีผลเต็มตัว

   วิธีวัด: อ่านของจริงจากหน้าเว็บทุกค่า — getBoundingClientRect ของกล่อง ·
   naturalWidth/Height ของไฟล์ที่โหลดสำเร็จ · getComputedStyle().objectPosition ที่
   resolve แล้ว — แล้วคำนวณ "กรอบของไฟล์ที่รอดเข้ามาในกล่อง" เป็นพิกัดพิกเซลของไฟล์
   เทียบกับกรอบปลอดภัย SAFE ของตัวสร้าง (design/v2/covers-wide.mjs ค่า SAFE)

   สามสภาพต่อหนึ่งจอ
     today  ปก 2:3 + CSS วันนี้                    (เว็บวันนี้)
     wide22 ไฟล์กว้าง 11:5 + CSS วันนี้ไม่แตะ      (ผลถ้าใส่ไฟล์กว้างแล้วไม่แก้ object-position)
     wide50 ไฟล์กว้าง 11:5 + object-position 50% 50% (สิ่งที่ม็อกอัพ "หลัง" ของ AIO-56 ถ่ายไว้)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { DIR, ROOT as REPO } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = Number(process.env.AIO56_PORT || 9404);
/* ทรีที่วัด: ตั้งต้นเป็นเวิร์กสเปซ แต่เวิร์กสเปซนี้ถูก run อื่นแก้อยู่ตลอด
   ⇒ รายงานใช้ทรีที่ปักด้วย `git archive <sha>` เพื่อให้เลขซ้ำได้ (AIO56_TREE) */
const TREE = process.env.AIO56_TREE || REPO;
const HOME = path.join(TREE, 'index.html');
/* ไฟล์กว้างยังไม่ได้ย้ายเข้า assets/ (ยังรอลูกค้าอนุมัติ) ⇒ ชี้ที่ design/v2/wide-out/ */
const WIDE_REL = 'design/v2/wide-out/';
/* กรอบปลอดภัยของตัวสร้าง — ถ้าตัวสร้างเปลี่ยนค่า ด่านนี้ต้องเปลี่ยนตาม ไม่ใช่พิมพ์มือซ้ำ */
const SAFE = Number(
  /const SAFE = ([\d.]+)/.exec(fs.readFileSync(path.join(DIR, 'covers-wide.mjs'), 'utf8'))[1]);

/* ฮีโร่: กวาดช่วงสัดส่วนทั้งช่วง ไม่ใช่แค่จอที่ CEO วัด
   1920/1440 = กล่องกว้างสุด · 1366×768 = จุดที่เพดาน 56vh กัด (ar สูงสุด) · 768 = ar ต่ำสุด */
const HERO_VPS = [
  { tag: '1920x1080', w: 1920, h: 1080, dpr: 1, mobile: false },
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false },
  { tag: '1366x768', w: 1366, h: 768, dpr: 1.5, mobile: false },
  { tag: '768x1024', w: 768, h: 1024, dpr: 1.5, mobile: false },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true },
];
/* การ์ด "ดูต่อ" — ช่องที่คำของ CTO พูดถึงตรง ๆ · กรอบ --ar-cont ไม่มีตัวแปรต่อจอ
   แต่ "ไม่มีตัวแปรในไฟล์โทเคน" ≠ "วัดได้ 1.778 ทุกจอ" ⇒ วัดสองจอ ไม่ใช่เชื่อโทเคน */
const CONT_VPS = [
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true },
];
/* แถบรีลในไทล์ฟีด — ADR-001 §13.5 ผูกค่าของช่องนี้ไว้กับคำตัดสินของ AIO-59
   วัดด้วยเพราะ "ถ้ากรอบคงเป็นแนวตั้ง ค่าที่ถูกคือ poster" ตั้งอยู่บนสมมติฐานว่ากรอบเป็นแนวตั้ง
   ซึ่ง AIO-56 §5 วัดแล้วว่าไม่จริงที่จอใหญ่ ⇒ ต้องมีเลขของทั้งสองไฟล์ในกรอบจริง */
const REEL_VPS = [
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true },
];
const SEED_CONT = JSON.stringify({
  'durian-revenge': { ep: 2, sec: 60, dur: 120, ts: 1761000000000 },
  'ceo-cold': { ep: 2, sec: 60, dur: 120, ts: 1760999940000 },
});

if (!fs.existsSync(HOME)) throw new Error(`ไม่พบ ${HOME} — ตั้ง AIO56_TREE ให้ชี้รากเว็บ`);
if (!fs.existsSync(path.join(TREE, WIDE_REL))) throw new Error(`ไม่พบ ${WIDE_REL} ในทรี ${TREE}`);

/* ---------------------------------------------------------------------------
   วัด: คืน "กรอบของไฟล์ที่รอดเข้ามาในกล่อง" เป็นพิกเซลของไฟล์ + สัดส่วนที่ถูกตัดทุกด้าน
   สูตร object-fit:cover ตามสเปก CSS — ค่าทุกตัวมาจากหน้าเว็บ ไม่มีค่าสมมติ
   object-position เป็น % ⇒ จุด P% ของไฟล์ทับจุด P% ของกล่อง ⇒ offset = f·(box − rendered)
   object-position เป็น px ⇒ offset = ค่า px นั้นตรง ๆ (รองรับไว้เผื่อใครเปลี่ยนหน่วย)
   --------------------------------------------------------------------------- */
const measure = sel => `(() => {
  const box = document.querySelector(${JSON.stringify(sel)});
  const img = box && box.querySelector('img');
  if (!box || !img) return null;
  if (!img.complete || !img.naturalWidth) return { pending: true };
  const b = box.getBoundingClientRect();
  const cs = getComputedStyle(img);
  const bw = b.width, bh = b.height, iw = img.naturalWidth, ih = img.naturalHeight;
  const parts = cs.objectPosition.trim().split(/\\s+/);
  const axis = (tok, boxLen, renLen) => {
    if (tok.endsWith('%')) { const f = parseFloat(tok) / 100; return { off: f * (boxLen - renLen), f }; }
    return { off: parseFloat(tok), f: null };   /* px */
  };
  const scale = Math.max(bw / iw, bh / ih);        /* cover = ครอบให้เต็มทั้งสองแกน */
  const rw = iw * scale, rh = ih * scale;
  const ax = axis(parts[0], bw, rw), ay = axis(parts[1] ?? parts[0], bh, rh);
  /* กรอบไฟล์ที่มองเห็น (พิกเซลของไฟล์) */
  const sx = Math.max(0, -ax.off) / scale, sy = Math.max(0, -ay.off) / scale;
  const sw = Math.min(iw - sx, bw / scale), sh = Math.min(ih - sy, bh / scale);
  return {
    objectFit: cs.objectFit, op: cs.objectPosition,
    box: [+bw.toFixed(1), +bh.toFixed(1)], arBox: +(bw / bh).toFixed(3),
    nat: [iw, ih], arImg: +(iw / ih).toFixed(3),
    src: (img.currentSrc || img.src).replace(/^.*\\//, ''),
    vis: [Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh)],
    cut: {                                          /* สัดส่วนของไฟล์ที่ถูกตัดต่อด้าน (%) */
      top: +(sy / ih * 100).toFixed(2), bottom: +((ih - sy - sh) / ih * 100).toFixed(2),
      left: +(sx / iw * 100).toFixed(2), right: +((iw - sx - sw) / iw * 100).toFixed(2),
    },
    cutPx: { top: Math.round(sy), bottom: Math.round(ih - sy - sh),
             left: Math.round(sx), right: Math.round(iw - sx - sw) },
    attrWH: [img.getAttribute('width'), img.getAttribute('height')],
  };
})()`;

/* แพตช์: ใส่ไฟล์กว้างของเรื่องเดียวกัน โดย **ไม่แตะ object-position**
   (ต่างจาก design/v2/aio56-frames.mjs ที่แพตช์ทั้งสองอย่างพร้อมกัน — ที่นี่ต้องแยกตัวแปร
    ให้ได้ ไม่งั้นวัดไม่ได้ว่าผลมาจากไฟล์หรือมาจากค่า object-position) */
const swapWide = sel => `(() => {
  let changed = 0;
  for (const img of document.querySelectorAll(${JSON.stringify(sel)} + ' img')) {
    const m = (img.getAttribute('src') || img.src || '').match(/covers\\/([a-z0-9-]+)\\.webp$/);
    if (!m) continue;
    img.removeAttribute('width'); img.removeAttribute('height');
    img.removeAttribute('srcset');
    const p = img.closest('picture');
    if (p) for (const s of p.querySelectorAll('source')) s.remove();
    img.src = ${JSON.stringify(WIDE_REL)} + m[1] + '.webp';
    changed++;
  }
  return { changed };
})()`;
const force50 = sel => `(() => {
  let n = 0;
  for (const img of document.querySelectorAll(${JSON.stringify(sel)} + ' img')) { img.style.objectPosition = '50% 50%'; n++; }
  return { changed: n };
})()`;

/* ---------------------------------------------------------------------------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dbus', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', 'about:blank',
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      /* ตอบ /json/new ได้ ≠ chrome ของรันเรา ⇒ ผูกกับ pid ที่เราเพิ่ง spawn เท่านั้น */
      if (j.webSocketDebuggerUrl && !chrome.killed) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error(`เชื่อมต่อ chrome ที่พอร์ต ${PORT} ไม่ได้ — ถ้าพอร์ตชน ตั้ง AIO56_PORT=<อื่น>`);
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
const evalJs = async expression =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try{localStorage.setItem('lakorn.cont',${JSON.stringify(SEED_CONT)})}catch(e){}`,
});

const rows = [];
const problems = [];

for (const { kind, sel, vps, scroll } of [
  { kind: 'hero', sel: '.hero .bg', vps: HERO_VPS },
  { kind: 'cont', sel: '.cont .thumb', vps: CONT_VPS },
  { kind: 'reel', sel: '.btile .reelstrip span', vps: REEL_VPS, scroll: true },
]) {
  for (const vp of vps) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: vp.mobile,
      screenWidth: vp.w, screenHeight: vp.h,
    });
    await send('Page.navigate', { url: `file://${HOME}` });
    const ready = async () => {
      for (let i = 0; i < 150; i++) {
        const ok = await evalJs(`(() => {
          const im = document.querySelector(${JSON.stringify(sel)} + ' img');
          return document.readyState==='complete' && document.fonts.status==='loaded'
            && !!im && im.complete && im.naturalWidth>0;
        })()`);
        if (ok === true) return true;
        await sleep(80);
      }
      return false;
    };
    /* ภาพ lazy ที่อยู่นอกกรอบจอไม่มีวัน complete ⇒ ต้องเลื่อนไปหาก่อนรอ ไม่ใช่รอให้หมดเวลา */
    if (scroll) {
      for (let i = 0; i < 100; i++) {
        const ok = await evalJs(`(() => {
          if (document.readyState !== 'complete') return false;
          const el = document.querySelector(${JSON.stringify(sel)});
          if (!el) return false;
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          return true;
        })()`);
        if (ok === true) break;
        await sleep(80);
      }
      await sleep(200);
    }
    if (!await ready()) throw new Error(`${kind} ${vp.tag}: หน้าไม่พร้อม (ไม่เจอ ${sel} img ที่โหลดเสร็จ)`);

    const take = async state => {
      const m = await evalJs(measure(sel));
      if (!m) throw new Error(`${kind} ${vp.tag} ${state}: หา ${sel} ไม่เจอ`);
      if (m.pending) throw new Error(`${kind} ${vp.tag} ${state}: ภาพยังโหลดไม่เสร็จตอนวัด`);
      rows.push({ kind, tag: vp.tag, state, ...m });
      return m;
    };
    const today = await take('today');

    const sw = await evalJs(swapWide(sel));
    if (!sw.changed) throw new Error(`${kind} ${vp.tag}: สลับไฟล์กว้างไม่โดนสักใบ — มาร์กอัปเปลี่ยนไปแล้ว`);
    if (!await ready()) throw new Error(`${kind} ${vp.tag}: ไฟล์กว้างโหลดไม่ขึ้น`);
    const w22 = await take('wide22');
    if (w22.nat[0] !== 2640) problems.push(`${kind} ${vp.tag}: ไฟล์ที่โหลดได้ไม่ใช่ 2640×1200 (ได้ ${w22.nat.join('×')})`);

    await evalJs(force50(sel));
    await sleep(60);
    const w50 = await take('wide50');
    rows[rows.length - 1].pairedWith = today.src;
  }
}

ws.close();
chrome.kill('SIGTERM');

/* ---------------- ตารางตัวเลข ---------------- */
let sha = '(ไม่ทราบ)';
try { sha = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* ข้าม */ }
const safePct = +(SAFE * 100).toFixed(1);

console.log(`\nทรีที่วัด: ${TREE}${TREE === REPO ? ' (เวิร์กสเปซสด)' : ` (ปักไว้)`} · HEAD ของ repo = ${sha}`);
console.log(`กรอบปลอดภัยของตัวสร้าง: เว้นขอบด้านละ ${safePct}% ทั้งสองแกน (design/v2/covers-wide.mjs ค่า SAFE)\n`);

const pad = (s, w) => String(s).padEnd(w);
console.log(pad('ช่อง', 6) + pad('จอ', 11) + pad('สภาพ', 8) + pad('กล่อง', 13) + pad('ar', 7)
  + pad('ไฟล์', 12) + pad('object-position', 17)
  + pad('ตัดบน', 8) + pad('ตัดล่าง', 9) + pad('ตัดซ้าย', 9) + 'ตัดขวา');
for (const r of rows) {
  console.log(pad(r.kind, 6) + pad(r.tag, 11) + pad(r.state, 8)
    + pad(`${r.box[0]}×${r.box[1]}`, 13) + pad(r.arBox, 7)
    + pad(r.nat.join('×'), 12) + pad(r.op, 17)
    + pad(`${r.cut.top}%`, 8) + pad(`${r.cut.bottom}%`, 9)
    + pad(`${r.cut.left}%`, 9) + `${r.cut.right}%`);
}

/* ---------------- ข้อสรุปที่ตรวจได้ ---------------- */
console.log('\n— กรอบปลอดภัยถูกกินหรือไม่ (เฉพาะสภาพที่ใช้ไฟล์กว้าง) —');
const over = [];
for (const r of rows.filter(x => x.state !== 'today')) {
  const worst = Object.entries(r.cut).filter(([, v]) => v > safePct);
  const tag = `${r.kind} ${r.tag} ${r.state}`;
  if (!worst.length) { console.log(`  ✓ ${pad(tag, 26)} ไม่มีด้านไหนตัดเกิน ${safePct}%`); continue; }
  /* แกนของแต่ละด้านต่างกัน: บน/ล่าง คิดจาก **ความสูง** ไฟล์ · ซ้าย/ขวา คิดจาก **ความกว้าง**
     (ใช้ตัวเดียวทั้งสี่ด้านคือวิธีพิมพ์เลขผิดโดยที่ตารางยังดูสมเหตุสมผล) */
  const axisPx = k => (k === 'top' || k === 'bottom' ? r.nat[1] : r.nat[0]);
  const txt = worst.map(([k, v]) => `${k} ${v}% (เกิน ${(v - safePct).toFixed(2)} จุด = ${Math.round((v - safePct) / 100 * axisPx(k))} px ของไฟล์)`).join(' · ');
  console.log(`  ✗ ${pad(tag, 26)} ${txt}`);
  over.push({ tag, txt });
}

console.log('\n— องค์ประกอบแนวตั้งของ object-position มีผลที่ช่องไหน —');
for (const kind of ['hero', 'cont', 'reel']) {
  for (const tag of [...new Set(rows.filter(r => r.kind === kind).map(r => r.tag))]) {
    const a = rows.find(r => r.kind === kind && r.tag === tag && r.state === 'wide22');
    const b = rows.find(r => r.kind === kind && r.tag === tag && r.state === 'wide50');
    const same = JSON.stringify(a.vis) === JSON.stringify(b.vis);
    console.log(`  ${pad(kind, 6)}${pad(tag, 11)}${same ? 'ไม่มีผล — 22% กับ 50% ให้กรอบไฟล์เดียวกันเป๊ะ' : `มีผล — กรอบไฟล์ขยับ ${Math.abs(a.vis[1] - b.vis[1])} px แนวตั้ง (ar กล่อง ${a.arBox} > ar ไฟล์ ${a.arImg})`}`);
  }
}

/* ---------------------------------------------------------------------------
   ด่านของ "ข้ออ้าง" ไม่ใช่ด่านของเว็บ
   สองข้ออ้างข้างล่างเป็นเหตุผลที่เขียนลง ADR-001 §13.5/§13.6 — ถ้าวันหน้าเลย์เอาต์
   หรือค่า SAFE เปลี่ยนจนข้ออ้างไม่จริง สคริปต์ต้องแตกเสียงดัง ไม่ใช่พิมพ์ตารางสวย ๆ ต่อไป
   --------------------------------------------------------------------------- */
const claims = [];
/* ข้ออ้าง 1 (ของ CTO ใน §13.5): ที่ `.cont .thumb` องค์ประกอบแนวตั้งไม่มีผล */
for (const tag of CONT_VPS.map(v => v.tag)) {
  const a = rows.find(r => r.kind === 'cont' && r.tag === tag && r.state === 'wide22');
  const b = rows.find(r => r.kind === 'cont' && r.tag === tag && r.state === 'wide50');
  if (JSON.stringify(a.vis) !== JSON.stringify(b.vis)) {
    claims.push(`ข้ออ้าง 1 ไม่จริงแล้วที่ cont ${tag}: 22% กับ 50% ให้กรอบไฟล์ต่างกัน ⇒ ADR §13.5 ย่อหน้า object-position ต้องอ่านใหม่`);
  }
  if (a.cut.top || a.cut.bottom) {
    claims.push(`ข้ออ้าง 1 ไม่จริงแล้วที่ cont ${tag}: ไฟล์กว้างถูกตัดด้านสูง (บน ${a.cut.top}% ล่าง ${a.cut.bottom}%) ⇒ ไม่ใช่ "ครอปด้านกว้างเท่านั้น"`);
  }
}
/* ข้ออ้าง 2 (ของผม): ที่ฮีโร่ มีจออย่างน้อยหนึ่งจอที่ค่า 22% กินกรอบปลอดภัยแต่ 50% ไม่กิน
   ⇒ นี่คือเหตุผลเดียวที่ขอให้ §13.6 เขียนค่า object-position ของฮีโร่ไว้
   ถ้าข้อนี้เลิกจริง (เช่น UX เปลี่ยนความสูงกล่อง) คำขอนั้นหมดอายุและต้องถอน */
const heroBad = HERO_VPS.filter(v => !v.mobile).filter(v => {
  const a = rows.find(r => r.kind === 'hero' && r.tag === v.tag && r.state === 'wide22');
  const b = rows.find(r => r.kind === 'hero' && r.tag === v.tag && r.state === 'wide50');
  const eats = m => Object.values(m.cut).some(x => x > safePct);
  return eats(a) && !eats(b);
});
if (!heroBad.length) {
  claims.push('ข้ออ้าง 2 ไม่จริงแล้ว: ไม่มีจอเดสก์ท็อปไหนที่ 22% กินกรอบปลอดภัยแล้ว 50% ไม่กิน ⇒ คำขอให้ §13.6 ล็อก 50% 50% หมดอายุ');
} else {
  console.log(`\n✓ ข้ออ้าง 2 ยังจริง: ${heroBad.map(v => v.tag).join(' · ')} คือจอที่ค่า 22% กินกรอบปลอดภัยแต่ 50% ไม่กิน`);
}

if (claims.length) { console.log('\n✗ ' + claims.join('\n✗ ')); problems.push(...claims); }
if (problems.length) { console.log('\n✗ ' + problems.length + ' ข้อที่ต้องแก้'); process.exit(1); }
console.log(`\nวัดครบ ${rows.length} สภาพ · ${over.length ? `พบ ${over.length} สภาพที่กินกรอบปลอดภัย (ดูรายการข้างบน)` : 'ไม่มีสภาพใดกินกรอบปลอดภัย'}`);
fs.writeFileSync(path.join(DIR, 'aio56-objpos.json'),
  JSON.stringify({ at: '2026-10-25', sha, tree: TREE, safe: SAFE, rows }, null, 2) + '\n');
console.log(`ตารางดิบ → design/v2/aio56-objpos.json`);
