/* ============================================================================
   AIO-56 · ภาพกว้างต่อเรื่อง ("coverWide") — ตัวสร้าง + ตัวเรนเดอร์
   Visual-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/covers-wide.mjs            → HTML + WebP ครบ 13 ใบ
         node design/v2/covers-wide.mjs --html     → สร้าง HTML อย่างเดียว (ไม่เปิด chrome)
         node design/v2/covers-wide.mjs durian     → เรนเดอร์เฉพาะไฟล์ที่ชื่อมีคำนั้น
         node design/v2/covers-wide.mjs --sheet    → เพิ่มแผ่นรวม design/v2/wide-sheet.jpg (ไว้ส่งตรวจ)
         WIDE_PORT=9402 node design/v2/covers-wide.mjs   → เปลี่ยนพอร์ต CDP ถ้าชนกับ run อื่น

   ของที่เขียนออก (2 ที่เท่านั้น — ทั้งคู่อยู่ใต้ design/v2/)
     design/v2/wide-src/<slug>.html    ต้นฉบับ HTML/CSS — เปิดดูในเบราว์เซอร์ได้ตรง ๆ
     design/v2/wide-out/<slug>.webp    ภาพที่จะส่งมอบ

   ⚠️ ที่พักชั่วคราว ไม่ใช่ปลายทาง — ปลายทางจริงอยู่ใน assets/ ซึ่ง "ห้ามแตะ" ในใบงานนี้
   และแบบแผนชื่อไฟล์ยังรอ ADR ของ AIO-55 ล็อก (ข้อเสนอของ CTO คือฟิลด์ `coverWide`)
   เมื่อ ADR ล็อกแล้ว เปลี่ยนค่า OUTDIR/EXT ที่เดียวข้างล่างนี้แล้วรันใหม่ — ภาพไม่เปลี่ยน

   ทำไมไม่ใช่ "ปกเดิมที่ถูกยืด/ถูกครอป"
     ปก 1024×1536 (2:3) ถูกกล่องฮีโร่เดสก์ท็อปครอบจนเหลือแถบกลาง 23–26% ของความสูงภาพ
     (วัดเองที่ assets/site.css `.hero .bg` — ตาราง AIO-56-SHAPE-MAP.md §1)
     แผ่นนี้เอา "ปกทั้งใบ ไม่ครอปเลย" มาวางเป็นตัวเอกในกรอบกว้าง แล้วต่อความกว้างที่เหลือ
     ด้วยสนามบรรยากาศที่เบลอมาจากปกใบเดียวกัน ⇒ 100% ของงานศิลป์ยังอยู่ในภาพ

   สัดส่วนและกรอบปลอดภัย — เหตุผลเต็มอยู่ใน design/v2/AIO-56-SHAPE-MAP.md §2
     กล่องฮีโร่ของเว็บจริงไม่มีสัดส่วนเดียว มันไหลจาก 1.670 (จอ 768) ถึง 2.902 (1366×768)
     แผ่นจึงวาดที่ 11:5 = 2.2 ซึ่งเป็นค่าที่ "ขาดทุนมากสุด" ต่ำที่สุดตลอดช่วงนั้น (≤24.2%)
     แล้วบังคับให้ของสำคัญทุกชิ้นอยู่ในกรอบกลาง SAFE (เว้นขอบด้านละ 12.1%)
     ⇒ ทุกจอที่วัดได้ เห็นกรอบ SAFE ครบ 100%

   ข้อห้ามบนภาพ (ใบงาน AIO-56 ข้อ 3): ห้ามยอดวิว ห้ามดาว/คะแนน ห้ามคำว่า mockup
   → แผ่นนี้ "ไม่มีตัวอักษรเลยแม้ตัวเดียว" โดยตั้งใจ เพราะฮีโร่วาดชื่อเรื่อง/ปุ่มทับด้านซ้ายอยู่แล้ว
     (`.hero .body` ใน assets/site.css) ตัวอักษรที่เผาลงภาพจะซ้อนกับของจริงและย่อไม่ได้
     มีด่านตรวจที่ท้ายไฟล์บังคับว่า HTML ต้องไม่มีข้อความที่มองเห็นได้

   สีทุกค่ามาจาก design/v2/tokens.css (--accent:#F5C451 ไม่ขยับ) ความโปร่งเฉพาะงานนี้
   เขียนด้วย color-mix() บนโทเคนเดิม ไม่ตั้งสีใหม่ ยกเว้นคู่สี c1/c2 ของแต่ละเรื่อง
   ที่มาจาก assets/data.js (ใช้เป็นแสงพื้นหลัง — แบบเดียวกับ design/v2/share-cards.mjs)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR, ROOT, D } from './lib.mjs';

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = Number(process.env.WIDE_PORT || 9352);

/* ---- ขนาด ----
   วาดที่ CSS 1320×600 แล้วถ่ายด้วย deviceScaleFactor 2 ⇒ ไฟล์ 2640×1200
   1320/600 = 2.2 พอดี (11:5)
   2640 ต้อง ≥ 2496 = 1248 (ความกว้างกล่องฮีโร่สูงสุดที่วัดได้) × DPR 2 ⇒ ไม่มีการขยายภาพ
   1200 ต้อง ≥ 960  = 480  (ความสูงกล่องฮีโร่สูงสุดที่วัดได้) × DPR 2 ⇒ เช่นกัน */
const CSS_W = 1320, CSS_H = 600, DPR = 2;
const W = CSS_W * DPR, H = CSS_H * DPR;
const AR = CSS_W / CSS_H;
const MAX_BYTES = 300 * 1024;              /* ใบงานข้อ 3 · ไฟล์ละ ≤ 300 KB */
const QUALITY = [86, 82, 78, 72, 66, 58];  /* บันไดคุณภาพ — หยิบใบแรกที่ไม่เกินลิมิต */

/* กรอบปลอดภัย: เว้นขอบด้านละ 12.1% ของทั้งสองแกน (ที่มาของเลขอยู่ใน SHAPE-MAP §2.3) */
const SAFE = 0.121;

/* ---- พาโนรามาสะท้อน ----
   PANW = ความกว้างของปก 2:3 เมื่อวางสูงเต็มแผ่น (600 × 2/3 = 400)
   PANN = จำนวนชุดในแถว ต้องเป็นเลขคี่ (จะได้มีชุด "กลาง" จริง) และกว้างพอคลุมทั้งแผ่น
          แม้ชุดกลางจะถูกเลื่อนไปอยู่ที่ FOCAL_X: ต้องการอย่างน้อย
          2 × max(FOCAL_X, 1−FOCAL_X) × CSS_W / PANW = 2 × .73 × 1320 / 400 = 4.82 ⇒ 5
   FOCAL_X = ตำแหน่งศูนย์กลางของชุดกลาง (สัดส่วนของความกว้างแผ่น) */
const PANW = Math.round(CSS_H * 2 / 3);
const PANN = 5;
const FOCAL_X = 0.73;
if (PANN % 2 === 0) throw new Error('PANN ต้องเป็นเลขคี่ ไม่งั้นไม่มีชุดกลาง');
if (PANW * PANN < 2 * Math.max(FOCAL_X, 1 - FOCAL_X) * CSS_W) {
  throw new Error(`แถวพาโนรามากว้างไม่พอคลุมแผ่น (${PANW * PANN}px) — เพิ่ม PANN`);
}

/* ---- ปลายทาง (ชั่วคราว) ----
   เปลี่ยน 2 บรรทัดนี้เมื่อ ADR ของ AIO-55 ล็อกแบบแผนชื่อ แล้วรันใหม่
   ห้ามชี้ไปที่ assets/ ในใบงานนี้ — Dev เป็นเจ้าของพาธนั้น */
const OUTDIR = path.join(DIR, 'wide-out');
const EXT = 'webp';

const args = process.argv.slice(2);
const htmlOnly = args.includes('--html');
const filter = args.find(a => !a.startsWith('--')) || '';
const SRC = path.join(DIR, 'wide-src');

/* slug ที่ต้องครบ — เทียบกับ assets/data.js ทุกครั้งที่รัน ไม่ฝังรายชื่อไว้ตาย */
const SERIES = D.series;
if (SERIES.length !== 12) {
  throw new Error(`assets/data.js มี ${SERIES.length} เรื่อง — ใบงานสั่ง 12 เรื่อง + default = 13 ใบ`);
}

/* ปกต้นทาง: อ่านจาก assets/covers/ (อ่านอย่างเดียว) ด้วยพาธสัมพัทธ์จาก wide-src/ */
const coverUrl = slug => `../../../assets/covers/${slug}.webp`;
for (const s of SERIES) {
  const p = path.join(ROOT, 'assets/covers', `${s.slug}.webp`);
  if (!fs.existsSync(p)) throw new Error(`ไม่พบปกต้นทาง ${p} — หยุดก่อน อย่าปล่อยแผ่นเปล่า`);
}

/* ============================ CSS ของแผ่นภาพกว้าง ============================
   วิธีต่อความกว้าง: "พาโนรามาสะท้อน" (mirrored panorama) — ไม่ใช่ปกแปะบนพื้นเบลอ

   ปก 2:3 ถูกวางสูงเต็มแผ่น ⇒ กว้าง ${PANW} px แล้ว "พับกระจก" ซ้ำไปทางซ้ายและขวาจนเต็ม ${CSS_W} px
   ชุดคู่ถูกกลับซ้าย-ขวา (scaleX(-1)) ⇒ ทุกรอยต่อเป็นภาพสะท้อนของตัวเอง ⇒ ต่อเนื่องสนิท
   ไม่มีเส้นตัด ไม่มีขอบสี่เหลี่ยม ภาพจึงอ่านได้ว่าเป็น "ฉากกว้างฉากเดียว" ไม่ใช่คอลลาจ

   วางสองชั้นจากแถวเดียวกันนี้ เรียงกันพอดีทุกพิกเซล:
     .pan.wings  ทั้งแถว เบลอ+หรี่แสง = ฉากที่ไหลออกไปสองข้าง (ระยะไกล)
     .pan.sharp  แถวเดียวกัน คมชัด แต่ถูก mask ให้เห็นเฉพาะชุดกลาง และไล่จางที่ขอบ
                 ⇒ ชุดกลางคือ "ปกทั้งใบที่ 2:3 ไม่ครอปแม้พิกเซลเดียว" และมันละลายเข้ากับเงาสะท้อน
                 ของตัวมันเอง ไม่มีขอบให้เห็น
   ชุดกลางถูกจัดให้ศูนย์กลางอยู่ที่ x=${(FOCAL_X * 100).toFixed(0)}% เพราะพื้นที่ที่ตัวอักษรของฮีโร่ไม่ทับ
   คือ x 52%–100% ของกล่อง (วัดจาก .hero .body ของเว็บจริง: กล่อง 1248 กว้าง · body กิน 0–599)
   ------------------------------------------------------------------------------
   วิกเนตต์ซ้ายจงใจทำ "บาง" (ทึบสุด 22%) เพราะฮีโร่ของเว็บจริงมีม่านมืดของตัวเองอยู่แล้ว
   (`.hero .bg::after` ใน assets/site.css ไล่จาก rgba(9,8,12,.96)) เผาม่านเข้มลงไฟล์
   จะได้ซ้ายดำสองชั้น และถ้า Dev แก้ไล่สีวันหลัง ภาพจะมืดเกินโดยไม่มีใครรู้ */
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${CSS_W}px;height:${CSS_H}px;overflow:hidden;background:var(--bg)}
body{-webkit-font-smoothing:antialiased}

.plate{position:relative;width:${CSS_W}px;height:${CSS_H}px;overflow:hidden;
  background:var(--bg);isolation:isolate}
.plate img{display:block}

/* ---- แถวพาโนรามาสะท้อน · ชั้นเดียวกันถูกใช้ซ้ำสองครั้ง (.wings / .sharp) ---- */
.pan{position:absolute;top:0;height:100%;width:${PANW * PANN}px;
  left:calc(${(FOCAL_X * 100).toFixed(4)}% - ${PANW * PANN / 2}px);display:flex}
.pan span{width:${PANW}px;height:100%;flex:none;overflow:hidden}
.pan span img{width:100%;height:100%;object-fit:cover;object-position:50% 50%}
.pan span:nth-child(even) img{transform:scaleX(-1)}

.pan.wings{filter:blur(24px) saturate(1.18) brightness(.70)}
/* ชุดกลางของแถวคือชุดที่ ${(PANN + 1) / 2} ⇒ กินช่วง ${(100 * (PANN - 1) / 2 / PANN).toFixed(1)}%–${(100 * (PANN + 1) / 2 / PANN).toFixed(1)}% ของความกว้างแถว
   ไล่จางออกไปด้านละ ~6.5% ของแถว (≈ ${Math.round(PANW * PANN * 0.065)} px) ⇒ รอยต่อนุ่มจนตาไม่จับ */
.pan.sharp{
  mask-image:linear-gradient(90deg,transparent 0 35.5%,#000 42% 58%,transparent 64.5% 100%);
  -webkit-mask-image:linear-gradient(90deg,transparent 0 35.5%,#000 42% 58%,transparent 64.5% 100%)}

/* ---- แสงคู่สีของเรื่องเอง (assets/data.js) ---- */
.wash{position:absolute;inset:0;
  background:
    radial-gradient(900px 640px at 72% 18%, var(--c2) 0%, transparent 64%),
    radial-gradient(760px 600px at 14% 88%, var(--c1) 0%, transparent 68%);
  opacity:.38}

/* ---- ริ้วม่านทอง — ลายเดียวกับ design/v2/share-cards.mjs ---- */
.curtain{position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 7%, transparent) 0 2px, transparent 2px 28px);
  mask-image:linear-gradient(90deg, transparent 0 30%, #000 100%);
  -webkit-mask-image:linear-gradient(90deg, transparent 0 30%, #000 100%)}

/* ---- แสงขอบทองจากขวา: ผูกแผ่นเข้ากับลุคม่านทองโดยไม่เติมสีใหม่ ---- */
.rim{position:absolute;inset:0;
  background:radial-gradient(58% 120% at 104% 34%,
    color-mix(in srgb, var(--accent) 17%, transparent) 0%,
    color-mix(in srgb, var(--accent) 5%, transparent) 38%,
    transparent 72%)}

/* ---- วิกเนตต์ซ้ายบาง ๆ (ดูหมายเหตุหัวบล็อก CSS) + ขอบล่างจมลงพื้นเวที ---- */
.vig{position:absolute;inset:0;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--bg) 22%, transparent) 0 12%,
      color-mix(in srgb, var(--bg) 8%, transparent) 44%, transparent 70%),
    linear-gradient(0deg, color-mix(in srgb, var(--bg) 38%, transparent) 0 3%, transparent 22%)}

/* ---- default: พัดปก 4 ใบ (ไม่มีตัวอักษร) ---- */
.fan{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  display:flex;align-items:center;justify-content:center}
.fan .p{width:246px;height:369px;border-radius:var(--r-lg);overflow:hidden;flex:none;
  box-shadow:var(--e3), 0 0 0 1px var(--accent-line);margin-left:-54px}
.fan .p:first-child{margin-left:0}
.fan .p img{width:100%;height:100%;object-fit:cover}
.fan .p:nth-child(1){transform:rotate(-7deg) translateY(-30px) scale(.9)}
.fan .p:nth-child(2){transform:rotate(-2.5deg) translateY(-10px) scale(.97)}
.fan .p:nth-child(3){transform:rotate(2.5deg) translateY(10px) scale(.97)}
.fan .p:nth-child(4){transform:rotate(7deg) translateY(30px) scale(.9)}
`;

/* ============================ โครง HTML ============================ */
function plate({ name, cls = '', vars, body }) {
  /* <title> คือข้อความเดียวในไฟล์ และมันไม่ถูกเรนเดอร์ลงภาพ — ด่านข้างล่างยกเว้นให้เฉพาะ tag นี้ */
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<title>${name}.${EXT} — ${W}x${H}</title>
<link rel="stylesheet" href="../tokens.css">
<style>${CSS}</style>
</head><body>
<div class="plate ${cls}" style="${vars}">
${body}
</div>
</body></html>
`;
}

/* แถวพาโนรามา PANN ชุดจากปกใบเดียว — ใช้ทั้งชั้น wings และ sharp จึงต้องสร้างเหมือนกันเป๊ะ */
const pan = u => Array.from({ length: PANN }, () => `<span><img src="${u}" alt=""></span>`).join('');

function seriesPlate(s) {
  const u = coverUrl(s.slug);
  return plate({
    name: s.slug,
    vars: `--c1:${s.c1};--c2:${s.c2}`,
    body: `  <div class="pan wings">${pan(u)}</div>
  <div class="wash"></div>
  <div class="curtain"></div>
  <div class="pan sharp">${pan(u)}</div>
  <div class="rim"></div>
  <div class="vig"></div>`,
  });
}

/* default — แผ่นกลางของแบรนด์ สำหรับที่วางกว้างที่ไม่ผูกกับเรื่องใดเรื่องหนึ่ง
   เลือกปก 4 ใบจาก assets/data.js ด้วยลำดับในข้อมูล ไม่ใช่รายชื่อที่เขียนมือ
   (ชุดเดียวกับที่ design/v2/share-cards.mjs ใช้ในภาพแชร์ default — ดูหมายเหตุใต้ FAN) */
const FAN = ['ceo-cold', 'durian-revenge', 'villainess-reborn', 'house-13']
  .map(slug => {
    const s = SERIES.find(x => x.slug === slug);
    if (!s) throw new Error(`default: assets/data.js ไม่มี ${slug} แล้ว — แก้รายชื่อ FAN`);
    return s;
  });

function defaultPlate() {
  return plate({
    name: 'default',
    cls: 'brand',
    vars: `--c1:${FAN[0].c1};--c2:${FAN[0].c2}`,
    body: `  <div class="pan wings">${pan(coverUrl(FAN[1].slug))}</div>
  <div class="wash"></div>
  <div class="curtain"></div>
  <div class="fan">${FAN.map(s => `
    <span class="p"><img src="${coverUrl(s.slug)}" alt=""></span>`).join('')}
  </div>
  <div class="rim"></div>
  <div class="vig"></div>`,
  });
}

/* ---- แผ่นรวม (--sheet) · ไว้ส่งตรวจทั้งชุดในภาพเดียว
   ออกที่ design/v2/wide-sheet.jpg ไม่ใช่ wide-out/ เพราะไม่ใช่ของที่จะส่งมอบ ---- */
const SHEET_W = 1640, SHEET_H = 1486;   /* 5 แถว × 3 ใบ = 15 ช่อง พอสำหรับ 13 ใบ */
function sheetPage(names) {
  const tile = n => `
    <figure><img src="../wide-out/${n}.${EXT}" alt=""><figcaption>${n}.${EXT}</figcaption></figure>`;
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<title>ภาพกว้าง ${AR.toFixed(1)}:1 ทั้งชุด · AiLakorn</title>
<link rel="stylesheet" href="../tokens.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${SHEET_W}px;height:${SHEET_H}px;overflow:hidden;background:var(--bg);
  font-family:var(--body);color:var(--fg)}
.pad{padding:20px 22px}
h1{font-family:var(--display);font-weight:600;font-size:23px;margin-bottom:4px}
.note{font-size:14px;color:var(--muted);margin-bottom:14px;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(3,520px);gap:12px 14px}
figure{width:520px}
figure img{width:520px;height:${(520 / AR).toFixed(1)}px;display:block;border-radius:8px;
  border:1px solid var(--line-2)}
figcaption{font-size:12.5px;color:var(--dim);margin-top:4px}
</style>
</head><body><div class="pad">
<h1>ภาพกว้าง ${W}×${H} (11:5) — ${names.length} ใบ</h1>
<p class="note">design/v2/wide-out/ · สร้างด้วย node design/v2/covers-wide.mjs · ย่อจากไฟล์จริงเพื่อดูทั้งชุดในภาพเดียว<br>
ยังไม่ใช่ปลายทาง — พาธและชื่อไฟล์จริงรอ ADR ของ AIO-55 ล็อก</p>
<div class="grid">${names.map(tile).join('')}</div>
</div></body></html>
`;
}

/* ============================ 1. เขียน HTML ============================ */
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const PLATES = [
  { name: 'default', html: defaultPlate() },
  ...SERIES.map(s => ({ name: s.slug, html: seriesPlate(s) })),
];

/* ---- ด่านข้อความ ----
   ใบงานห้ามยอดวิว / ดาว / คำว่า mockup บนภาพ · แผ่นนี้เลือกทางที่แรงกว่า:
   ห้ามมี "ข้อความที่มองเห็นได้" เลย ตรวจโดยถอด tag ทั้งหมดแล้วต้องไม่เหลืออักขระที่ไม่ใช่ช่องว่าง
   (<title> กับ <style> ไม่ถูกวาดลงภาพ จึงถอดทิ้งก่อนตรวจ) */
for (const p of PLATES) {
  const visible = p.html
    .replace(/<head>[\s\S]*?<\/head>/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  if (visible) throw new Error(`${p.name}.html มีข้อความที่จะถูกวาดลงภาพ ("${visible.slice(0, 40)}") — แผ่นภาพกว้างต้องไม่มีตัวอักษร`);
  p.out = path.join(OUTDIR, `${p.name}.${EXT}`);
  fs.writeFileSync(path.join(SRC, `${p.name}.html`), p.html);
}
console.log(`HTML ${PLATES.length} ไฟล์ → design/v2/wide-src/`);

const shots = PLATES.filter(p => !filter || p.name.includes(filter))
  .map(p => ({ ...p, w: CSS_W, h: CSS_H, dpr: DPR, cap: MAX_BYTES, fmt: EXT }));

if (args.includes('--sheet')) {
  fs.writeFileSync(path.join(SRC, 'sheet.html'), sheetPage(PLATES.map(p => p.name)));
  shots.push({
    name: 'sheet', w: SHEET_W, h: SHEET_H, dpr: 1, cap: 4 * 1024 * 1024, fmt: 'jpeg',
    out: path.join(DIR, 'wide-sheet.jpg'),
  });
}
if (htmlOnly) {
  console.log('--html: ข้ามการเรนเดอร์');
  process.exit(0);
}

/* ============================ 2. เรนเดอร์ ============================
   ต่อ chrome ผ่าน CDP + Emulation.setDeviceMetricsOverride เหตุผลเดียวกับ design/v2/shoot.mjs
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
  throw new Error(`เชื่อมต่อ chrome ที่พอร์ต ${PORT} ไม่ได้ — ถ้าพอร์ตชน ตั้ง WIDE_PORT=<อื่น>`);
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: c.w, height: c.h, deviceScaleFactor: c.dpr, mobile: false,
      screenWidth: c.w, screenHeight: c.h,
    });
    await send('Page.navigate', { url: `file://${path.join(SRC, `${c.name}.html`)}` });
    /* รอ: โหลดเสร็จ + ปกถอดรหัสเสร็จจริง (naturalWidth>0 ไม่ใช่แค่ complete)
       แผ่นนี้ไม่มีตัวอักษร จึงไม่ต้องรอ document.fonts */
    let ready = false;
    for (let i = 0; i < 120; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `(document.readyState==='complete')
          && [...document.images].every(im=>im.complete && im.naturalWidth>0)`,
        returnByValue: true,
      });
      if (r.result && r.result.value === true) { ready = true; break; }
      await sleep(80);
    }
    if (!ready) throw new Error('หน้าไม่พร้อมภายในเวลา (ปกโหลดไม่ขึ้น)');
    await sleep(220); /* เผื่อ filter:blur ชั้นหนาวาดเสร็จ */

    let buf = null, used = 0;
    for (const q of QUALITY) {
      const { data } = await send('Page.captureScreenshot', {
        format: c.fmt, quality: q,
        /* scale:1 — การขยายเป็นหน้าที่ของ deviceScaleFactor อย่างเดียว
           ถ้าใส่ scale:dpr ด้วย ภาพจะใหญ่เป็น dpr² (เคยได้ 5280×2400 แทน 2640×1200) */
        clip: { x: 0, y: 0, width: c.w, height: c.h, scale: 1 },
        captureBeyondViewport: false,
      });
      buf = Buffer.from(data, 'base64'); used = q;
      if (buf.length <= c.cap) break;
    }
    if (buf.length > c.cap) throw new Error(`ย่อแล้วยังเกินลิมิต ${(c.cap / 1024).toFixed(0)} KB (${buf.length} B)`);
    fs.writeFileSync(c.out, buf);
    n++;
    report.push(`${path.basename(c.out).padEnd(28)} ${c.w * c.dpr}×${c.h * c.dpr}  q${used}  ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    fail++;
    console.log(`เรนเดอร์ไม่สำเร็จ: ${c.name} — ${e.message}`);
  }
}

ws.close();
chrome.kill('SIGTERM');
console.log(report.map(r => '  ' + r).join('\n'));
console.log(`เสร็จ: ${n} ใบ · ล้มเหลว ${fail} ใบ → ${path.relative(ROOT, OUTDIR)}/`);
console.log(`กรอบปลอดภัย: เว้นขอบด้านละ ${(SAFE * 100).toFixed(1)}% ⇒ กลางแผ่น ${(W * (1 - 2 * SAFE)).toFixed(0)}×${(H * (1 - 2 * SAFE)).toFixed(0)} px`);
process.exit(fail ? 1 : 0);
