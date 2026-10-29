/* ============================================================================
   AIO-32 B1 · เทมเพลตภาพแชร์ 1200×630 (og:image) — ตัวสร้าง + ตัวเรนเดอร์
   Visual-Designer · 23 ต.ค. 2026

   รัน:  node design/v2/share-cards.mjs              → HTML + JPEG ครบ 13 ใบ
         node design/v2/share-cards.mjs --html       → สร้าง HTML อย่างเดียว (ไม่เปิด chrome)
         node design/v2/share-cards.mjs durian       → เรนเดอร์เฉพาะไฟล์ที่ชื่อมีคำนั้น
         node design/v2/share-cards.mjs --sheet      → เพิ่มแผ่นรวมทั้งชุด design/v2/share-sheet.jpg (ไว้ส่งตรวจ)
         SHARE_PORT=9401 node design/v2/share-cards.mjs   → เปลี่ยนพอร์ต CDP ถ้าชนกับ run อื่น

   ของที่เขียนออก  (2 ที่เท่านั้น)
     design/v2/share-src/<ชื่อ>.html   ต้นฉบับ HTML/CSS — เปิดดูในเบราว์เซอร์ได้ตรง ๆ
     assets/share/<ชื่อ>.jpg           ไฟล์ที่ build/seo.mjs:32-40 (shareSlot) ไปหยิบ

   ชื่อไฟล์บังคับตาม build/seo.mjs:24-25 — default + series-<slug> ครบ 12 slug = 13 ใบ
   ยังไม่ทำรายตอน (ep-<slug>-<n>) เพราะชื่อตอนจริงยังไม่มี — ชื่อใน data.js
   ตั้งแต่ตอน 2 เป็นข้อความหมุนซ้ำจากชุดเดียวกัน (ตอน 2 มีแค่ 7 แบบใน 12 เรื่อง
   ขณะที่ตอน 1 ต่างกันครบ 12) เอามาขึ้นภาพแชร์ไม่ได้ — shareSlot
   จะถอยจาก ep-… มาใช้ series-… ให้เองโดยไม่เตือน (build/seo.mjs:48)

   ข้อห้ามบนภาพ (AIO-32 AC-6): ห้ามยอดวิว ห้ามดาว/คะแนน ห้ามคำว่า mockup
   → สคริปต์นี้ไม่ import `views` จาก lib.mjs และมีด่านตรวจข้อความที่ท้ายไฟล์
   สีทุกค่าที่มองเห็นมาจาก design/v2/tokens.css (--accent:#F5C451) ไม่มีการตั้งสีใหม่
   ความโปร่งที่ต้องใช้เฉพาะงานนี้เขียนด้วย color-mix() บน token เดิม ไม่ใช่ค่า rgba ใหม่
   (`#000` ที่เหลืออยู่ค่าเดียวอยู่ใน mask-image — เป็นค่าความทึบของ mask ไม่ใช่สีที่เห็น)
   ยกเว้นคู่สี c1/c2 ของแต่ละเรื่องที่มาจาก assets/data.js (ใช้เป็นแสงพื้นหลัง)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR, ROOT, D, genreLabel } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = Number(process.env.SHARE_PORT || 9351);
const W = 1200, H = 630;                 /* ขนาดบังคับของ og:image */
const MAX_BYTES = 300 * 1024;            /* AC-7 · ไฟล์ละ ≤ 300 KB */
const QUALITY = [88, 84, 80, 74, 68, 60];/* บันไดคุณภาพ — หยิบใบแรกที่ไม่เกินลิมิต */

const args = process.argv.slice(2);
const htmlOnly = args.includes('--html');
const filter = args.find(a => !a.startsWith('--')) || '';

const SRC = path.join(DIR, 'share-src');
const OUT = path.join(ROOT, 'assets/share');

/* ---------------------------------------------------------------------------
   ถ้อยคำทางการ — อ่านจาก build/seo.mjs:17 ตรง ๆ ไม่คัดลอกมาเขียนซ้ำ
   (อ่านอย่างเดียว ไม่แก้ไฟล์ใน build/) ถ้าวันหลังลูกค้าเปลี่ยนถ้อยคำที่นั่น
   สคริปต์นี้จะเปลี่ยนตามทันที หรือหยุดทำงานถ้าหาไม่เจอ — ไม่ปล่อยให้ภาพเพี้ยนเงียบ ๆ
   --------------------------------------------------------------------------- */
const SEO_FILE = path.join(ROOT, 'build/seo.mjs');
const FREE_LINE = (() => {
  const m = fs.readFileSync(SEO_FILE, 'utf8').match(/export const FREE_LINE\s*=\s*'([^']+)'/);
  if (!m) throw new Error('หา FREE_LINE ใน build/seo.mjs ไม่เจอ — หยุดก่อน อย่าเดาถ้อยคำเอง');
  return m[1];
})();

/* slug ที่โจทย์ AIO-32 AC-2 สั่งให้ครบ — เทียบกับ assets/data.js ทุกครั้งที่รัน */
const REQUIRED = [
  'durian-revenge', 'ceo-cold', 'mirror-bride', 'ayutthaya-love', 'billion-widow',
  'one-night-bangkok', 'seedless-longan', 'house-13', 'villainess-reborn',
  'undercover-tycoon', 'heir-returns', 'mangosteen-heart',
];
const have = new Set(D.series.map(s => s.slug));
const missing = REQUIRED.filter(s => !have.has(s));
if (missing.length) throw new Error(`assets/data.js ไม่มี slug: ${missing.join(', ')}`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/></svg>';

/* ============================ CSS ของการ์ดแชร์ ============================
   คอมโพเนนต์เฉพาะงานนี้ ไม่พึ่ง v2.css (ซึ่งเป็นสไตล์หน้าจอมือถือ/เดสก์ท็อป)
   แต่ใช้ token จาก tokens.css ทุกค่า                                       */
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
body{font-family:var(--body);color:var(--fg);-webkit-font-smoothing:antialiased}

.card{position:relative;width:${W}px;height:${H}px;overflow:hidden;
  background:var(--bg);isolation:isolate}

/* แสงพื้นหลัง: คู่สีของเรื่องเอง (assets/data.js) ไล่จางลงพื้นเวที */
.wash{position:absolute;inset:0;
  background:
    radial-gradient(1100px 760px at 78% 16%, var(--c2) 0%, transparent 62%),
    radial-gradient(760px 620px at 96% 92%, var(--c1) 0%, transparent 66%);
  opacity:.5}
/* ม่าน: ริ้วทองจาง ๆ ไล่หายไปทางซ้าย — ลายเดียวกับหัวข้อ/ขีดทองในเว็บ */
.curtain{position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 8%, transparent) 0 2px, transparent 2px 26px);
  mask-image:linear-gradient(90deg, transparent 0 34%, #000 100%);
  -webkit-mask-image:linear-gradient(90deg, transparent 0 34%, #000 100%)}
.vig{position:absolute;inset:0;
  background:linear-gradient(90deg, var(--bg) 0 30%,
    color-mix(in srgb, var(--bg) 72%, transparent) 52%,
    color-mix(in srgb, var(--bg) 18%, transparent) 100%)}
/* ขีดทองบนสุด + กรอบเส้นผมรอบใบ */
.top{position:absolute;left:0;right:0;top:0;height:6px;
  background:linear-gradient(90deg,var(--gold-3),var(--gold-2) 38%,var(--gold-1) 62%,var(--gold-2))}
.frame{position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--accent-line)}

.in{position:absolute;inset:0;padding:54px 56px 52px;display:flex;align-items:center;gap:44px}
.col{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:0}

/* โลโก้ — ตรงกับ .logo ใน v2.css:47-51 แต่สเกลใหญ่ขึ้นสำหรับ 1200px */
.logo{display:flex;align-items:center;gap:10px;line-height:1}
.logo .mark{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none;
  background:linear-gradient(160deg,var(--gold-1),var(--gold-2) 55%,var(--gold-3));
  color:var(--on-accent);box-shadow:var(--e-accent)}
.logo .mark svg{width:22px;height:22px;margin-left:2px}
.logo b{font-family:var(--display);font-weight:600;font-size:34px;letter-spacing:-.4px;color:var(--fg)}
.logo i{font-style:normal;font-family:var(--display);font-weight:600;font-size:19px;
  padding:6px 9px;border-radius:9px;margin-left:1px;
  background:linear-gradient(160deg,var(--gold-1),var(--gold-2) 55%,var(--gold-3));
  color:var(--on-accent);box-shadow:var(--e-accent)}

h1{font-family:var(--display);font-weight:600;color:var(--fg);letter-spacing:-.5px;
  margin-top:30px;text-wrap:balance}
.hook{font-size:25px;line-height:1.5;color:var(--fg-2);margin-top:18px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}
.meta span{font-size:18px;line-height:1.4;padding:7px 14px;border-radius:var(--r-pill);
  background:var(--surface-2);color:var(--chip-fg);border:1px solid var(--line-2)}
.meta span.ai{background:linear-gradient(160deg,var(--gold-1),var(--gold-2) 55%,var(--gold-3));
  color:var(--on-accent);font-weight:600;border-color:transparent}

/* แถบถ้อยคำทางการ — ข้อความหลักของภาพ อ่านออกแม้ย่อเป็นรูปย่อใน LINE */
.free{display:inline-flex;align-items:center;gap:11px;align-self:flex-start;margin-top:30px;
  background:var(--accent);color:var(--on-accent);border-radius:var(--r-pill);
  padding:14px 26px 14px 20px;box-shadow:var(--e-accent);
  font-size:25px;font-weight:600;line-height:1.2;white-space:nowrap}
.free svg{width:26px;height:26px;flex:none}

/* ปก 2:3 — ขนาดเท่าไฟล์ต้นฉบับย่อลง (1024×1536 → 348×522) ไม่ครอป */
.art{position:relative;width:348px;height:522px;flex:none;border-radius:var(--r-lg);
  overflow:hidden;box-shadow:var(--e3), 0 0 0 1px var(--accent-line);
  background:linear-gradient(165deg,var(--c2) 0%,var(--c1) 58%,var(--bg) 100%)}
.art img{width:100%;height:100%;object-fit:cover;display:block}
.art .edge{position:absolute;inset:0;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent);
  border-radius:var(--r-lg)}
.art .glow{position:absolute;inset:0;
  background:linear-gradient(200deg, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 42%)}

/* ---- default.jpg: หน้าแม่ ---- */
.hero{text-align:left}
.hero .logo{gap:14px}
.hero .logo .mark{width:62px;height:62px;border-radius:18px}
.hero .logo .mark svg{width:34px;height:34px}
.hero .logo b{font-size:62px}
.hero .logo i{font-size:30px;padding:9px 13px;border-radius:13px}
.hero h2{font-family:var(--display);font-weight:600;font-size:38px;line-height:1.3;
  letter-spacing:-.4px;margin-top:26px;color:var(--fg)}
.hero .sub{font-size:23px;line-height:1.5;color:var(--fg-2);margin-top:14px}
.fan{position:absolute;right:46px;top:0;bottom:0;width:470px;display:flex;align-items:center;
  justify-content:flex-end}
.fan .p{width:190px;height:285px;border-radius:var(--r-md);overflow:hidden;flex:none;
  box-shadow:var(--e3), 0 0 0 1px var(--accent-line);margin-left:-50px;
  background:linear-gradient(165deg,var(--c2) 0%,var(--c1) 58%,var(--bg) 100%)}
.fan .p img{width:100%;height:100%;object-fit:cover;display:block}
.fan .p:nth-child(1){transform:rotate(-6deg) translateY(-78px)}
.fan .p:nth-child(2){transform:rotate(-2deg) translateY(-26px)}
.fan .p:nth-child(3){transform:rotate(2deg) translateY(26px)}
.fan .p:nth-child(4){transform:rotate(6deg) translateY(78px)}
`;

/* ============================ โครง HTML ============================ */
function page({ name, title, cls = '', vars = '', body }) {
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<title>${esc(title)} · ภาพแชร์ 1200×630 (${name}.jpg)</title>
<link rel="stylesheet" href="../tokens.css">
<style>${CSS}</style>
</head><body>
<div class="card ${cls}" style="${vars}">
  <div class="wash"></div><div class="curtain"></div><div class="vig"></div>
${body}
  <div class="top"></div><div class="frame"></div>
</div>
<script>
/* ย่อขนาดตัวอักษรหัวเรื่องให้พอดีกรอบ — ชื่อเรื่องยาวสุดในคลังคือ 25 ตัวอักษร
   ทำในหน้าเพราะต้องวัดความสูงจริงหลังฟอนต์ไทยโหลดเสร็จ (เรนเดอร์เดิมทุกครั้ง) */
(async () => {
  const h = document.querySelector('h1');
  if (h) {
    try { await document.fonts.ready; } catch (e) { /* ไม่มี FontFaceSet ก็ข้าม */ }
    let px = Number(h.dataset.size);
    h.style.fontSize = px + 'px';
    h.style.lineHeight = '1.14';
    while (h.scrollHeight > Number(h.dataset.max) && px > 34) {
      px -= 2;
      h.style.fontSize = px + 'px';
    }
  }
  document.documentElement.dataset.fit = 'done';
})();
</script>
</body></html>
`;
}

/* ---- การ์ดรายเรื่อง ---- */
function seriesCard(s) {
  const n = s.title.length;
  const size = n <= 10 ? 72 : n <= 16 ? 62 : n <= 22 ? 54 : 48;
  return page({
    name: `series-${s.slug}`,
    title: s.title,
    vars: `--c1:${s.c1};--c2:${s.c2}`,
    body: `  <div class="in">
    <div class="col">
      <span class="logo"><span class="mark">${PLAY}</span><i lang="en">AI</i><b lang="en">Lakorn</b></span>
      <h1 data-size="${size}" data-max="170">${esc(s.title)}</h1>
      <p class="hook">${esc(s.hook)}</p>
      <div class="meta"><span class="ai">สร้างด้วย AI</span><span>${esc(s.genres.map(genreLabel)[0])}</span><span>${s.eps} ตอน</span></div>
      <span class="free">${PLAY}${esc(FREE_LINE)}</span>
    </div>
    <div class="art">
      <img src="../../../assets/covers/${s.slug}.webp" alt="">
      <div class="glow"></div><div class="edge"></div>
    </div>
  </div>`,
  });
}

/* ---- default.jpg · หน้าแม่ทุกหน้า ----
   ตัวเลขทุกตัวนับจาก assets/data.js ตอนรัน ไม่ฝังค่าไว้ในไฟล์ */
function defaultCard() {
  const eps = D.series.reduce((a, s) => a + s.eps, 0);
  const fan = ['ceo-cold', 'durian-revenge', 'villainess-reborn', 'house-13']
    .map(slug => D.series.find(s => s.slug === slug));
  return page({
    name: 'default',
    title: 'AiLakorn',
    cls: 'hero',
    vars: `--c1:${fan[0].c1};--c2:${fan[0].c2}`,
    body: `  <div class="fan">${fan.map(s => `
    <span class="p" style="--c1:${s.c1};--c2:${s.c2}"><img src="../../../assets/covers/${s.slug}.webp" alt=""></span>`).join('')}
  </div>
  <div class="in">
    <div class="col">
      <span class="logo"><span class="mark">${PLAY}</span><i lang="en">AI</i><b lang="en">Lakorn</b></span>
      <h2>ละครสั้นแนวตั้ง ดูจบในมือถือ</h2>
      <p class="sub">${D.series.length} เรื่อง · ${eps} ตอน · ตอนละไม่เกิน 3 นาที</p>
      <span class="free">${PLAY}${esc(FREE_LINE)}</span>
    </div>
  </div>`,
  });
}

/* ---- แผ่นรวม (--sheet) · ไว้ส่งให้ตรวจทั้งชุดในภาพเดียว
   ออกที่ design/v2/share-sheet.jpg ไม่ใช่ assets/share/ เพราะไม่ใช่ไฟล์ที่เว็บใช้ ---- */
const SHEET_W = 1616, SHEET_H = 1104;
function sheetCard(names) {
  const tile = n => `
    <figure><img src="../../../assets/share/${n}.jpg" alt=""><figcaption>${n}.jpg</figcaption></figure>`;
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<title>ภาพแชร์ 1200×630 ทั้งชุด · AiLakorn</title>
<link rel="stylesheet" href="../tokens.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${SHEET_W}px;height:${SHEET_H}px;overflow:hidden;background:var(--bg);
  font-family:var(--body);color:var(--fg)}
.pad{padding:22px 24px}
h1{font-family:var(--display);font-weight:600;font-size:24px;margin-bottom:4px}
.note{font-size:15px;color:var(--muted);margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(4,380px);gap:14px 16px}
figure{width:380px}
figure img{width:380px;height:199.5px;display:block;border-radius:8px;
  border:1px solid var(--line-2)}
figcaption{font-size:13px;color:var(--dim);margin-top:5px;font-variant-numeric:tabular-nums}
</style>
</head><body><div class="pad">
<h1>ภาพแชร์ 1200×630 (og:image) — ${names.length} ใบ</h1>
<p class="note">assets/share/ · สร้างด้วย node design/v2/share-cards.mjs · ย่อจากไฟล์จริงเพื่อดูทั้งชุดในภาพเดียว</p>
<div class="grid">${names.map(tile).join('')}</div>
</div></body></html>
`;
}

/* ============================ 1. เขียน HTML ============================ */
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const CARDS = [
  { name: 'default', html: defaultCard() },
  ...D.series.map(s => ({ name: `series-${s.slug}`, html: seriesCard(s) })),
];

/* ด่านข้อความ (AC-6) — ห้ามยอดวิว / ดาว / คำว่า mockup หลุดลงภาพ
   ตรวจที่ HTML ก่อนเรนเดอร์ เพราะภาพที่ออกมามีแค่สิ่งที่อยู่ใน HTML นี้ */
const BANNED = [
  [/ยอดวิว|[\d.]+\s*(?:M|ล้าน)\s*วิว|\bviews?\b/i, 'ยอดวิว'],
  [/[★☆]|\brating\b|คะแนน\s*[\d.]/i, 'ดาว/คะแนน'],
  [/mockup|ม็อกอัพ/i, 'คำว่า mockup'],
  [/เหรียญ|สมัครสมาชิก|เข้าสู่ระบบ|ล็อกอิน/i, 'ชั้นเงิน/บัญชี'],
];
for (const c of CARDS) {
  /* ตัด <script>, คอมเมนต์ และถ้อยคำทางการออกก่อน แล้วค่อยตรวจ —
     FREE_LINE เองมีคำว่า "สมัครสมาชิก" อยู่ในประโยคปฏิเสธ ซึ่งเป็นคำที่อนุมัติแล้ว */
  const vis = c.html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(FREE_LINE).join('');
  for (const [re, what] of BANNED) {
    const hit = vis.match(re);
    if (hit) throw new Error(`${c.name}.html มี${what} ("${hit[0]}") — AIO-32 AC-6 ห้าม`);
  }
  if (!c.html.includes(FREE_LINE)) throw new Error(`${c.name}.html ไม่มีถ้อยคำทางการ`);
  c.w = W; c.h = H; c.cap = MAX_BYTES; c.out = path.join(OUT, `${c.name}.jpg`);
  fs.writeFileSync(path.join(SRC, `${c.name}.html`), c.html);
}
console.log(`HTML ${CARDS.length} ไฟล์ → design/v2/share-src/`);

const shots = CARDS.filter(c => !filter || c.name.includes(filter));
if (args.includes('--sheet')) {
  /* แผ่นรวมเป็นของสำหรับตรวจงาน ไม่ใช่ภาพแชร์ — ไม่ต้องมีถ้อยคำทางการและไม่เข้าลิมิต 300 KB */
  fs.writeFileSync(path.join(SRC, 'sheet.html'), sheetCard(CARDS.map(c => c.name)));
  shots.push({
    name: 'sheet', w: SHEET_W, h: SHEET_H, cap: 4 * 1024 * 1024,
    out: path.join(DIR, 'share-sheet.jpg'),
  });
}
if (htmlOnly) {
  console.log('--html: ข้ามการเรนเดอร์');
  process.exit(0);
}

/* ============================ 2. เรนเดอร์ JPEG ============================
   ต่อ chrome ผ่าน CDP แล้วบังคับ viewport 1200×630 @1x ด้วย
   Emulation.setDeviceMetricsOverride — เหตุผลเดียวกับ design/v2/shoot.mjs:1-4
   (headless chrome บังคับความกว้างหน้าต่างขั้นต่ำ 500px ถ้าใช้ --window-size) */
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
  throw new Error(`เชื่อมต่อ chrome ที่พอร์ต ${PORT} ไม่ได้ — ถ้าพอร์ตชน ตั้ง SHARE_PORT=<อื่น>`);
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
let n = 0, fail = 0;
const report = [];
for (const c of shots) {
  try {
    /* viewport ของใบนั้นเป๊ะ ๆ · ภาพแชร์ 1200×630 @1x (แผ่นรวมใช้ขนาดของตัวเอง) */
    await send('Emulation.setDeviceMetricsOverride', {
      width: c.w, height: c.h, deviceScaleFactor: 1, mobile: false,
      screenWidth: c.w, screenHeight: c.h,
    });
    await send('Page.navigate', { url: `file://${path.join(SRC, `${c.name}.html`)}` });
    /* รอ: โหลดเสร็จ + ฟอนต์ไทยพร้อม + ปกถอดรหัสเสร็จ + สคริปต์ย่อหัวเรื่องทำงานจบ */
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `(document.readyState==='complete') && (document.fonts.status==='loaded')
          && [...document.images].every(im=>im.complete && im.naturalWidth>0)
          && (document.documentElement.dataset.fit==='done' || !document.querySelector('h1[data-size]'))`,
        returnByValue: true,
      });
      if (r.result && r.result.value === true) { ready = true; break; }
      await sleep(80);
    }
    if (!ready) throw new Error('หน้าไม่พร้อมภายในเวลา (ฟอนต์หรือปกโหลดไม่ขึ้น)');
    await sleep(160); /* เผื่อ layout/paint รอบสุดท้าย */

    let buf = null, used = 0;
    for (const q of QUALITY) {
      const { data } = await send('Page.captureScreenshot', {
        format: 'jpeg', quality: q,
        clip: { x: 0, y: 0, width: c.w, height: c.h, scale: 1 }, captureBeyondViewport: false,
      });
      buf = Buffer.from(data, 'base64'); used = q;
      if (buf.length <= c.cap) break;
    }
    if (buf.length > c.cap) throw new Error(`ย่อแล้วยังเกินลิมิต ${(c.cap / 1024).toFixed(0)} KB (${buf.length} B)`);
    fs.writeFileSync(c.out, buf);
    n++;
    report.push(`${path.basename(c.out).padEnd(30)} ${c.w}×${c.h}  q${used}  ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    fail++;
    console.log(`เรนเดอร์ไม่สำเร็จ: ${c.name} — ${e.message}`);
  }
}

ws.close();
chrome.kill('SIGTERM');
console.log(report.map(r => '  ' + r).join('\n'));
console.log(`เสร็จ: ${n} ใบ · ล้มเหลว ${fail} ใบ → assets/share/`);
process.exit(fail ? 1 : 0);
