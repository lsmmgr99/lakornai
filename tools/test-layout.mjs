/* ด่านเลย์เอาต์ฮีโร่ + ด่านกันบั๊กตระกูล "inline แต่ตั้ง height" + ด่านฟอลด์ A/B/C — AIO-37 · AIO-54
   รัน:  node tools/test-layout.mjs
         SKIP_BUILD=1 node tools/test-layout.mjs       (ตรวจไฟล์ที่มีอยู่ตามสภาพ ไม่ build ใหม่)
         ONLY=hero node tools/test-layout.mjs          (hero=ส่วน 1 · sweep=ส่วน 0+2 · fold=ส่วน 3+4 · bento=ส่วน 5)
         FOLD_SEEDED=1 node tools/test-layout.mjs      (บังคับเกณฑ์ฟอลด์กับสภาพ "ผู้ใช้ที่กลับมา" ด้วย
                                                        — ดูเหตุที่ยังไม่เปิดเป็นค่าตั้งต้นที่ FOLD_SEEDED)
         LAY_PORT=4299 LAY_CDP=9499 node tools/test-layout.mjs   (ตั้งพอร์ตทับเมื่อรันขนานกับ run อื่น)

   ทำไมต้องใช้เบราว์เซอร์จริง: บั๊กที่ด่านนี้กันคือ "ค่าถูกตั้งแต่ไม่ถูกใช้" — `<span>` เป็น inline
   non-replaced ซึ่ง CSS height / aspect-ratio ไม่มีผล · getComputedStyle ยังรายงาน
   "height: 480px" ตามที่เขียนไว้ ขณะที่กล่องจริงสูง 1872px ตามสัดส่วนไฟล์ปก (1024×1536)
   → grep CSS ไม่เห็น · อ่าน computed style ไม่เห็น · เห็นได้ทางเดียวคือเทียบกับ
   getBoundingClientRect() ของหน้าที่ render จริง

   สี่ส่วน:
   0) self-test ของตัวกวาดเอง — วาง fixture ที่ต้องจับ (span ตั้ง height/width/aspect-ratio ·
      object ที่แสดง fallback · ตัวที่ซ่อนด้วย [hidden]) และที่ต้องไม่จับ (span เปล่า ·
      display:block · img · object ที่โหลดทรัพยากรได้) แล้วบังคับว่าผลต้องตรงเป๊ะ
   1) เรขาคณิตฮีโร่หน้าแรกที่ 5 ขนาดจอ (AIO-37 เกณฑ์ข้อ 1 · 3 · 4)
      อ้างอิงกับ "ม็อกอัพที่ลูกค้าอนุมัติ" (design/v2/home.html) โดยวัดม็อกอัพสด ๆ ที่ขนาดจอเดียวกัน
      ไม่ฝังเลข 440/480 ไว้ในด่าน — เลขที่อนุมัติอยู่ในม็อกอัพ ด่านแค่บังคับว่าเว็บจริงต้องตรงกับมัน
      (มีกรอบ MOCKUP_HERO กันฐานอ้างอิงเลื่อนเงียบ ๆ)
      เพดาน "ขอบล่างฮีโร่ ≤85% ของจอ" และ "แถวถัดไปโผล่ ≥80px" ย้ายไปอยู่ส่วน 3 แล้ว —
      เกณฑ์ชั่วคราวสองข้อนั้นผ่านได้ทั้งที่ผู้ใช้เห็นการ์ดเรื่อง 0 ใบ (UX พิสูจน์ไว้ใน AIO-38
      ที่ 1920×1080: ฮีโร่จบ 63% · แถวถัดไปโผล่ 366px · การ์ดเรื่องที่เห็น 0 ใบ) · ส่วน 3
      ครอบทั้งเว็บ 7 ขนาดจอ ไม่ใช่หน้าแรก 5 ขนาดจอ จึงกว้างและแน่นกว่าของที่ถอดออก
   2) กวาด "ทุกหน้าที่ส่งมอบ" หา element ที่ computed display:inline แต่มี height / width /
      aspect-ratio ≠ auto — กันตระกูลบั๊กนี้ทั้งตระกูล ไม่ใช่เฉพาะ .hero .bg (เกณฑ์ข้อ 5)
      ไม่รับรายชื่อหน้ามาจากใคร: สแกนไฟล์ .html ที่ส่งมอบเองทั้งหมด หน้าใหม่วันหน้าจะถูกกวาดเอง
      กวาด "สองรอบ" ต่อขนาดจอ (AIO-54): รอบผู้ใช้ใหม่ (localStorage ว่าง) และรอบผู้ใช้ที่กลับมา
      (ซีด lakorn.cont ก่อนสคริปต์ของหน้าทำงาน) — รอบเดียวแบบเดิมมองไม่เห็นทุกอย่างที่ JS สร้าง
      จาก localStorage เลย (.cont · .controw · การ์ดในคลัง) ซึ่งเป็นเหตุที่บั๊ก F3 (`.cont .thumb`
      สูง 300×507 แทน 300×169) หลุดด่าน 232,570 element ไปได้ทั้งที่เป็นบั๊กตระกูลเดียวกับ span.bg
   3) เกณฑ์ฟอลด์ A/B/C ของ UX (AIO-38 · CEO อนุมัติใน AIO-54) ทุกหน้าที่ส่งมอบ × 7 ขนาดจอ
      ที่ UX ใช้วัด 252 เคส · โพรบยกมาจาก gate.js ที่ UX แนบไว้ ไม่ได้คิดเกณฑ์ใหม่
        A (หน้าเลือกเรื่อง: ไม่มี .player/.two-col)
          A1 ขอบล่างบล็อกนำ (.hero-sec/.page-head/.intro/.sys/.search-head) ≤ 85% ของความสูงจอ
          A2 เห็น "การ์ดเรื่องจริง" ≥1 ใบ โผล่ ≥80px — ไม่นับหัวข้อ section ไม่นับกล่องสถานะว่าง
             ไม่นับปุ่มในบล็อกนำ (การ์ดที่อยู่ในบล็อกนำถูกตัดออกด้วย leadEl.contains)
        B (หน้าดูเรื่อง/ดูตอน: มี .player หรือ .two-col)
          B1 คอมโพเนนต์หลักสูงไม่เกิน (ความสูงจอ − header) → ใช้ได้ทั้งชิ้นโดยไม่ต้องเลื่อน
          B2 ปุ่มหลัก (เริ่มดู/ดูต่อ/ตอนถัดไป) อยู่ในจอแรก
        C (หน้าหนึ่งจอเต็มโดยตั้งใจ: มี .feed-desktop/.stage คือ /feed/) ยกเว้น A และ B1 · ยังต้องผ่าน B2
      ข้อยกเว้นสองข้อที่ประกาศไว้ตรง ๆ ในโค้ด (ไม่ใช่รายชื่อหน้าที่เขียนมือ):
        (1) ประเภท C — /feed/ ตั้งใจให้เต็มจอ (build/site-extra.css:139 `.feed-desktop` สูง 100vh − 58px)
        (2) หน้าที่ไม่มีข้อมูลจริงให้แสดงเลยและโชว์สถานะว่างที่ออกแบบไว้ (คลังของผู้ใช้ใหม่)
      ยามกันข้อยกเว้นบานปลาย: ถ้าหน้าที่ถูกยกเว้นเยอะกว่าเพดาน หรือหน้าที่ถูกวัดด้วย A1/A2
      น้อยกว่าพื้น ด่านจะแดง — ไม่ให้ "ยกเว้นทั้งเว็บแล้วเขียว" เป็นทางออกที่ทำได้เงียบ ๆ
      ส่วนนี้วัดสองสภาพเหมือนส่วน 2: ผู้ใช้ใหม่ทุกหน้า + ผู้ใช้ที่กลับมาเฉพาะหน้าที่ HTML
      ที่ส่งมอบมี UI จาก localStorage จริง (#contRail / #libPanel — หามาจากไฟล์ ไม่ได้เขียนรายชื่อ)

   มิวเทชันเทสต์ (ทำซ้ำได้ ทุกข้อรันแล้วและต้องแดงจริง):
   M1 เปลี่ยน `<div class="bg">` ที่ build/pages-discovery.mjs:53 กลับเป็น `<span>`
      → ตกส่วน 1 (ฮีโร่ 1872px) และส่วน 2 (6 จุด)
   M2 ถอด `.cont .thumb{display:block}` ที่ build/site-extra.css:47 ออก
      → ตกส่วน 2 รอบซีด (`.cont .thumb` กล่องจริง 300×507 ขณะ aspect-ratio ประกาศ 16/9)
        และตกส่วน 3 รอบซีด (A2 ที่ 1440×900 ตกเพราะการ์ดใบแรกสูงเกินจอ)
   M3 คืนพฤติกรรมเดิมที่ build/app.src.js:335-337 (ถอดสองบรรทัดที่ซ่อน #contSec ออก)
      → ตกส่วน 3 รอบผู้ใช้ใหม่ (A2 หน้าแรก: เห็นการ์ดเรื่องจริง 0 ใบ) และตกข้อ F1 โดยตรง */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D, SERIES, U, epSecs } from '../build/content.mjs';
import { siteFiles } from '../ci/site-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-lay-'));
const ONLY = process.env.ONLY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ONLY ที่สะกดผิดเคยรันทุกส่วนเงียบ ๆ ทั้งที่คนสั่งคิดว่ารันส่วนเดียว — ล้มทันทีดีกว่า */
if (!['', 'hero', 'sweep', 'fold', 'bento'].includes(ONLY)) {
  console.error(`✗ ONLY=${ONLY} ไม่รู้จัก — ใช้ได้เฉพาะ hero | sweep | fold | bento (หรือไม่ตั้งเลย = ทุกส่วน)`);
  process.exit(1);
}

const HOME = '/';
const OFFLINE = '/offline/';             /* ใช้แถว "ดูต่อ" ตัวเดียวกับหน้าแรก (AIO-38 F3 โผล่ที่นี่ด้วย) */
const MOCKUP = '/design/v2/home.html';   /* ม็อกอัพที่ลูกค้าอนุมัติ — อ่านอย่างเดียว ไม่แก้ */

/* เกณฑ์รับของ AIO-37 */
const MAX_HERO = 520;            /* ข้อ 1 · ความสูงฮีโร่ */
/* ข้อ 3 · กรอบความสมเหตุสมผลของฮีโร่บนมือถือ — ไม่ใช่ค่าที่อนุมัติ (ค่าที่อนุมัติอยู่ในม็อกอัพ
   และถูกบังคับด้วย heightParity ±1px) · เดิมตั้ง 500–580 ตามแบบ rev.1 ที่ให้ 537px
   AIO-38 F4 ให้เพดาน 56vh เพื่อให้จอเตี้ยไม่ถูกฮีโร่กิน และ Visual ลงแล้วใน AIO-53
   (กฎ `.hero .bg` ใน design/v2/v2.css — อ้างด้วย selector เพราะเลขบรรทัดของไฟล์ Visual เลื่อน)
   ⇒ ที่ 390×844 แบบเองได้ 473px = 56% ของจอ "ดีขึ้น ไม่ถดถอย"
   ตามที่ UX วัดไว้ · กรอบนี้จึงขยับลงมารับค่าที่อนุมัติใหม่ แต่ยังกันฮีโร่ยุบ/บานได้อยู่
   (เพดานเดิม 580 ไม่ขยับ) · ของจริงที่กันการถดถอยคือ A1 ในส่วน 3 + parity กับม็อกอัพ */
const MOBILE_HERO = [440, 580];
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

/* ---------- เกณฑ์ฟอลด์ A/B/C (AIO-38 · UX เป็นเจ้าของเกณฑ์) ---------- */
/* 7 ขนาดจอชุดเดียวกับที่ UX ใช้วัด 252 เคส — เรียงจากกว้างไปแคบ */
const FOLD_VIEWPORTS = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1366, h: 768 }, { w: 1280, h: 800 },
  { w: 820, h: 1180 }, { w: 768, h: 1024 }, { w: 390, h: 844 },
];
/* A1 · ขอบล่างบล็อกนำเทียบความสูงจอ · UX วัดของจริงแล้วยืนยันเลขเดิม:
   82% แถวถัดไปอ่านออก · 89% อ่านไม่ออก · 85% คือเส้นแบ่งที่ตรงกับของจริง */
const LEAD_MAX_RATIO = 0.85;
/* A2 · การ์ดปก 2:3 ที่รางแคบสุดบนเดสก์ท็อป (200px) สูง 300px → 80px = เห็นหัวการ์ดราว 1/4
   พอให้รู้ว่าข้างล่างมีของ · UX วัดของจริงที่ 1366×768 ได้ 104px แล้วอ่านออกชัดเจน */
const MIN_CARD_VISIBLE = 80;
/* ยามกันข้อยกเว้นบานปลาย — วัดจากของจริงวันนี้ (ยกเว้น 3 หน้า · วัดด้วย A1/A2 เกิน 70 หน้า)
   ตั้งพื้น/เพดานไว้หลวม ๆ พอให้โครงหน้าโตได้ แต่ถ้าใครทำให้ทั้งเว็บกลายเป็น "ยกเว้น" ด่านจะแดง */
const FOLD_MAX_EXEMPT = 12;      /* จำนวนหน้าที่เข้าข้อยกเว้นได้สูงสุด (นับหน้า ไม่นับเคส) */
const FOLD_MIN_TYPE_A = 40;      /* หน้าที่ต้องถูกวัดด้วย A1/A2 จริงอย่างน้อยเท่านี้ */
const FOLD_MIN_TYPE_B = 400;     /* หน้าที่ต้องถูกวัดด้วย B1/B2 จริงอย่างน้อยเท่านี้ (series+watch) */

/* ---------- สภาพที่เกณฑ์ฟอลด์ถูกบังคับ ----------
   ใบงาน AIO-54 สั่ง "รอบซีด" ไว้กับ *ส่วนกวาด* (ส่วน 2ข) ซึ่งอยู่ในด่านเสมอ ไม่มีสวิตช์ปิด
   และ UX นิยาม+วัดเกณฑ์ A/B/C ทั้ง 252 เคสในสภาพของหน้าที่ส่งมอบ = ผู้ใช้ใหม่
   ⇒ ส่วน 3 บังคับเกณฑ์ในสภาพเดียวกับที่เกณฑ์ถูกวัดมา

   ผมวัดสภาพ "ผู้ใช้ที่กลับมา" ให้แล้ว และ A2 ฟ้องของจริง 3 เคสบนหน้าแรก (AIO-54 รายงานรอบนี้):
     1366×768 · การ์ด .cont ใบแรกเริ่ม y=724 สูง 222px ⇒ โผล่ 44px (เกณฑ์ ≥80px)
     1280×800 · เริ่ม y=742 ⇒ โผล่ 58px
     390×844  · เริ่ม y=782 สูง 183px ⇒ โผล่ 62px
   นี่คือกรณี "เกณฑ์ฟ้องของจริง" ที่ใบงานสั่งให้ส่งกลับไปให้ CEO ตัดสิน ไม่ใช่ให้ผ่อนเกณฑ์
   จึงไม่ซ่อนและไม่แปลงเป็นข้อ "รอมติ" (ซึ่งใบงานสั่งเลิกใช้) — เปิดดูเองได้ทันที:
     FOLD_SEEDED=1 ONLY=fold node tools/test-layout.mjs
   ถ้า UX รับสภาพนี้เข้าเกณฑ์ ให้เปลี่ยนค่าตั้งต้นข้างล่างเป็น ['new','seeded']
   แล้วงานแก้จะอยู่ที่ระยะเหนือการ์ด/ความสูงหัวข้อ section ซึ่งเป็นของ UX/Visual ไม่ใช่ของ Dev */
const FOLD_SEEDED = /^(1|true|yes|on)$/i.test(process.env.FOLD_SEEDED || '');
const FOLD_MODES = FOLD_SEEDED ? ['new', 'seeded'] : ['new'];

/* ---------- ไทล์ "เลือกตามแนว" (AIO-54 เฟส 2) ----------
   สองหน้าที่ลูกค้าชี้เอง: หน้าแรก และ /browse/ ซึ่งเมนูเรียกว่า "หมวด"
   เอา URL มาจากตาราง U ของเว็บจริง ไม่พิมพ์พาธซ้ำไว้ที่นี่ (ย้ายหน้าแล้วด่านตามไปเอง) */
const BENTO_PAGES = [U.home, U.browse];
const BENTO_AR_TOL = 0.02;       /* ±2% ตามใบงาน */
const BENTO_ROW_MIN_W = 960;     /* ที่ ≥960px ต้องอยู่แถวเดียวและสูงเท่ากันทุกใบ */

/* ---------- ค่าที่ซีดลง localStorage เพื่อวัดสภาพ "ผู้ใช้ที่กลับมา" ----------
   คำนวณจากคลังของ build นี้ ไม่ใช่รายชื่อเรื่องที่เขียนมือ — เพิ่มเรื่องที่ 13 แล้วยังถูก
   รูปข้อมูลคือสัญญา lakorn.cont ที่หัวไฟล์ build/app.src.js ประกาศไว้: { slug: {ep,sec,dur,ts} }
   สองเรื่องแรกของคลัง · ตอนที่ 2 (หรือตอนสุดท้ายถ้าเรื่องมีตอนเดียว) · ดูไปครึ่งตอน
   เพื่อให้ `pct` อยู่กลาง ๆ ไม่ใช่ 0% หรือ 100% ที่อาจเข้าเส้นทางพิเศษ */
const SEED_ENTRIES = SERIES.slice(0, 2).map((s, i) => {
  const ep = Math.min(2, s.eps);
  const dur = epSecs(s.episodes[ep - 1][1]);
  return [s.slug, { ep, sec: Math.round(dur / 2), dur, ts: 1761000000000 - i * 60000 }];
});
const SEED_CONT = Object.fromEntries(SEED_ENTRIES);
/* ซีดด้วย Page.addScriptToEvaluateOnNewDocument = เขียนก่อนสคริปต์ของหน้าทุกครั้งที่นำทาง
   (เขียนครั้งเดียวแล้วหวังว่าค่าจะอยู่ยาวคือทางที่พังเงียบ ถ้าวันหน้ามีหน้าไหนล้างคลัง)
   ด่านไม่เชื่อว่าซีดติด: ส่วน 2 และ 3 บังคับให้นับการ์ด .cont ได้เท่าจำนวนที่ซีดจริง */
const SEED_SCRIPT = `try{localStorage.setItem('lakorn.cont',${JSON.stringify(JSON.stringify(SEED_CONT))})}catch(e){}`;
const UNSEED_SCRIPT = `try{localStorage.removeItem('lakorn.cont')}catch(e){}`;

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
const FILES = walk(ROOT).sort((a, b) => a.localeCompare(b));
const urlOf = f => '/' + path.relative(ROOT, f).replace(/index\.html$/, '');
const PAGES = FILES.map(urlOf);
/* หน้าที่ HTML ที่ส่งมอบ "มีที่ให้ JS เติมของจาก localStorage" — หามาจากไฟล์ ไม่ใช่รายชื่อที่เขียนมือ
   เครื่องหมายคือ id ที่ assets/app.js มองหา (#contRail = แถวดูต่อ · #libPanel = คลังของฉัน)
   วันหน้ามีหน้าใหม่ที่ใช้ id เดิม ด่านจะหยิบเข้ารอบซีดเองโดยไม่ต้องมาแก้ที่นี่ */
const STORAGE_UI_MARK = /id="(?:contRail|libPanel)"/;
const HAS_STORAGE_UI = new Set(FILES
  .filter(f => STORAGE_UI_MARK.test(fs.readFileSync(f, 'utf8')))
  .map(urlOf));

/* ---------- ขอบเขตของเกณฑ์ฟอลด์: "หน้าของผู้ชม" ----------
   เกณฑ์ A/B/C เป็นเกณฑ์ประสบการณ์ผู้ชม ⇒ ใช้กับหน้าที่ส่งขึ้นให้ผู้ชมจริง
   ไม่เอารายชื่อจากที่นี่ แต่ถามด่านเผยแพร่ซึ่งเป็นเจ้าของคำว่า "ชุดที่ส่งขึ้น" อยู่แล้ว
   (ci/site-files.mjs:8-11 ตัด admin/ build/ ci/ design/ docs/ tools/ ออกจากชุดที่ส่งขึ้น
    ตั้งแต่ AIO-30/AIO-36) ⇒ `/admin/` ซึ่งเป็นแผงของทีม ไม่ใช่หน้าผู้ชม จึงไม่เข้าเกณฑ์นี้
   สองด่านจึงใช้นิยามเดียวกัน แก้ที่เดียวแล้วตรงกันทั้งคู่ — ไม่ใช่รายชื่อข้อยกเว้นที่เขียนมือ
   หมายเหตุ: ส่วน 2 (กวาดบั๊ก inline) ยังกวาด /admin/ ด้วยตามเดิม — บั๊ก CSS เป็นบั๊กทุกที่
   แต่ "จอแรกต้องมีการ์ดเรื่อง" ใช้กับแผงกรอกข้อมูลของทีมไม่ได้ */
const PUBLISHED = new Set(siteFiles(ROOT, { ext: '.html' })
  .map(rel => '/' + rel.replace(/index\.html$/, '')));
const FOLD_PAGES = PAGES.filter(p => PUBLISHED.has(p));

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
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------- สภาพ localStorage ของผู้ชม ----------
   'new'    = ผู้ใช้ใหม่ (ไม่มีเรื่องค้าง) — สภาพของผู้ชมทุกคนที่มาครั้งแรก
   'seeded' = ผู้ใช้ที่กลับมา (มีเรื่องค้าง) — สภาพที่ด่านเดิมมองไม่เห็นเลย (AIO-38 F3)
   ลงทะเบียนเป็นสคริปต์ "ก่อนเอกสารใหม่ทุกฉบับ" ไม่ใช่เขียนครั้งเดียว: เขียนครั้งเดียวแล้ว
   นำทางต่ออีก 500 หน้าคือการเชื่อว่าไม่มีหน้าไหนแก้คลังเลย ซึ่งพิสูจน์ไม่ได้จากที่นี่ */
let storageScript = null;
let storageMode = null;
async function setStorageMode(mode) {
  if (storageScript) {
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: storageScript });
    storageScript = null;
  }
  const r = await send('Page.addScriptToEvaluateOnNewDocument',
    { source: mode === 'seeded' ? SEED_SCRIPT : UNSEED_SCRIPT });
  storageScript = r.identifier;
  storageMode = mode;
}
const MODE_LABEL = { new: 'ผู้ใช้ใหม่ (localStorage ว่าง)', seeded: `ผู้ใช้ที่กลับมา (ซีด lakorn.cont ${SEED_ENTRIES.length} เรื่อง)` };

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

/* ---------- 5.2 โพรบเกณฑ์ฟอลด์ A/B/C ----------
   ยกมาจาก gate.js ที่ UX แนบไว้ใน AIO-38 (โพรบตัวเดียวกับที่เขาใช้วัดทั้ง 252 เคส)
   ส่วนที่เติมเข้ามาคือรายละเอียดสำหรับข้อความแดง: การ์ดที่โผล่มากที่สุดคือใบไหนและกี่ px
   ไม่อย่างนั้นด่านจะบอกแค่ว่า "A2 ตก" แล้วคนอ่านต้องไปวัดเองใหม่ทั้งหน้า
   วัดในกรอบ viewport เดียว ห้าม scroll ห้ามวัดแบบ full-page (full-page คือสิ่งที่ซ่อน
   ปัญหานี้ไว้ตลอดเด็คม็อกอัพ 82 ใบ) · และห้ามถอด [hidden] ก่อนวัด ต่างจากส่วน 2:
   แผงที่ซ่อนอยู่คือของที่ผู้ใช้ "ยังไม่เห็น" การนับมันเข้าจอแรกคือการโกงตัวเอง */
const FOLD_PROBE = `(function () {
  var vh = innerHeight, vw = innerWidth;
  var rect = function (el) { return el.getBoundingClientRect(); };
  var vis = function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    var b = rect(el); return b.width > 0 && b.height > 0;
  };
  var shown = function (el) { var b = rect(el); return Math.min(b.bottom, vh) - Math.max(b.top, 0); };
  var main = document.querySelector('main') || document.body;
  var q = function (s) { return main.querySelector(s); };
  var all = function (s) { return [].slice.call(main.querySelectorAll(s)).filter(vis); };
  var desc = function (el) {
    return el ? el.tagName.toLowerCase() + '.'
      + String(el.className || '').split(/\\s+/).slice(0, 2).join('.') : null;
  };

  var hdr = document.querySelector('header');
  var hdrH = hdr && vis(hdr) ? Math.round(rect(hdr).height) : 0;
  var budget = vh - hdrH;

  /* จำแนกประเภทหน้าแบบโครงสร้าง (ไม่พึ่ง data-page เพราะหลายหน้าไม่มี) */
  var typeC = !!q('.feed-desktop, .stage');
  var typeB = !typeC && !!q('.player, .two-col');
  var type = typeC ? 'C' : typeB ? 'B' : 'A';

  /* การ์ดเรื่องจริง — ไม่รวมหัวข้อ section ไม่รวมปุ่มนำทาง ไม่รวมกล่องสถานะว่าง */
  var CARDS = ['.card', '.libcard', '.cont', '.controw', '.rankcard', '.ep', '.gtile', '.btile',
    '.ep-row', '.flatlist > a', '.list > a', '.list.two > *', '.az-row', '.castone',
    '.faq', '.acc', '.prose p', '.field', '.rowlist .rl'].join(',');
  var cards = all(CARDS);

  /* A1 · บล็อกนำ = ฮีโร่ หรือ page-head/intro (ไม่ใช่ wrapper ของทั้งหน้า) */
  var leadEl = q('.hero-sec') || q('.page-head') || q('.intro') || q('.sys') || q('.search-head');
  var lead = leadEl && vis(leadEl) ? {
    s: desc(leadEl), bottom: Math.round(rect(leadEl).bottom + scrollY),
    pct: +(100 * (rect(leadEl).bottom + scrollY) / vh).toFixed(0),
  } : null;
  var outside = cards.filter(function (el) { return !leadEl || !leadEl.contains(el); });
  var usable = outside.filter(function (el) {
    return shown(el) >= Math.min(${MIN_CARD_VISIBLE}, rect(el).height - 1);
  });
  /* ใบที่โผล่มากที่สุด — ใช้เขียนข้อความแดงให้ชี้จุดได้ ไม่ต้องให้คนไปวัดเองใหม่ */
  var best = null;
  outside.forEach(function (el) {
    var v = Math.round(shown(el));
    if (!best || v > best.shown) best = { s: desc(el), shown: v, h: Math.round(rect(el).height), top: Math.round(rect(el).top) };
  });

  /* B1 · คอมโพเนนต์หลักที่ต้องใช้ได้ทั้งชิ้นโดยไม่เลื่อน */
  var MAIN_COMP = '.player, .hero, .sd-cover, .endcard, .nextup, .auth-card';
  var tooTall = all(MAIN_COMP).map(function (el) {
    return { s: desc(el), h: Math.round(rect(el).height) };
  }).filter(function (x) { return x.h > budget; });

  /* B2 · ปุ่มหลักของหน้า */
  var ctaEl = q('[data-resume], .btn-main, .ep-nav .btn, .player .bigplay, .btn.btn-accent');
  var cta = ctaEl && vis(ctaEl) ? {
    s: desc(ctaEl), top: Math.round(rect(ctaEl).top + scrollY),
    inFold: rect(ctaEl).top < vh && rect(ctaEl).bottom > 0,
  } : null;

  /* ข้อยกเว้น (2): ไม่มีข้อมูลจริงให้แสดงเลย + โชว์สถานะว่างที่ออกแบบไว้ */
  var emptyShown = all('.empty, .sys').length;
  var legitimatelyEmpty = emptyShown > 0 && cards.length === 0;

  var A1 = type !== 'A' || legitimatelyEmpty || !lead || lead.pct <= ${LEAD_MAX_RATIO * 100};
  var A2 = type !== 'A' || legitimatelyEmpty || usable.length >= 1;
  var B1 = type === 'C' || tooTall.length === 0;
  /* ปุ่มหลักต้องอยู่ในจอแรกเฉพาะหน้าดูเรื่อง/ดูตอน (B) และหน้าเต็มจอ (C) ตามที่ CEO สั่งใน AIO-54
     หน้าบทความ/หน้าเลือกเรื่อง (A) CTA อยู่ล่างได้ — gate.js ของ UX เขียนไว้อย่างนั้นด้วย */
  var B2 = type === 'A' || !cta || cta.inFold;

  return {
    vw: vw, vh: vh, hdrH: hdrH, budget: budget, type: type, lead: lead,
    nCards: cards.length, nOutside: outside.length, nUsable: usable.length, best: best,
    tooTall: tooTall, cta: cta, emptyShown: emptyShown, legitimatelyEmpty: legitimatelyEmpty,
    A1: A1, A2: A2, B1: B1, B2: B2, pass: A1 && A2 && B1 && B2,
  };
})()`;

/* ---------- 5.3 โพรบแถว "ดูต่อ" (ข้อ F1 + F3 ของ AIO-38) ----------
   สองข้อนี้ต้องมีด่านที่ชี้ตรงจุด ไม่ใช่ฝากไว้กับผลรวมของเกณฑ์ฟอลด์:
   F1 ซ่อน #contSec เมื่อไม่มีเรื่องค้าง · F3 `.cont .thumb` ต้องเป็น block และได้สัดส่วน --ar-cont */
const CONT_PROBE = `(function () {
  var sec = document.querySelector('#contSec');
  var cs = [].slice.call(document.querySelectorAll('.cont'));
  var root = getComputedStyle(document.documentElement);
  var one = cs[0] || null;
  var th = one ? one.querySelector('.thumb') : null;
  var m = one ? one.querySelector('.m') : null;
  var box = function (el) {
    var r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), ar: +(r.width / r.height).toFixed(3) };
  };
  return {
    arCont: root.getPropertyValue('--ar-cont').trim(),
    sec: sec ? { hidden: sec.hasAttribute('hidden'), display: getComputedStyle(sec).display,
      h: Math.round(sec.getBoundingClientRect().height) } : null,
    nCont: cs.length,
    thumb: th ? Object.assign({ display: getComputedStyle(th).display,
      cssAspect: getComputedStyle(th).aspectRatio }, box(th)) : null,
    meta: m ? { display: getComputedStyle(m).display, marginTop: getComputedStyle(m).marginTop,
      h: Math.round(m.getBoundingClientRect().height) } : null,
  };
})()`;

/* ---------- 5.4 โพรบไทล์ "เลือกตามแนว" (AIO-54 เฟส 2) ----------
   ลูกค้าแจ้งเอง 24 ต.ค. 2026: "ในหน้าแรก เลือกตามแนว กับ หน้าหมวด ไม่ใช่แนวตั้ง"
   วัดสามเรื่องที่ตาคนเห็น: สัดส่วนกล่อง · อยู่แถวเดียวและสูงเท่ากัน · ปกไม่ซ้ำ
   สัดส่วนที่ต้องได้อ่านจาก --ar-poster ของหน้า ไม่ฝังเลข 2/3 ไว้ในด่าน */
const BENTO_PROBE = `(function () {
  var box = document.querySelector('.genre-bento');
  if (!box) return { error: 'ไม่พบ .genre-bento' };
  var root = getComputedStyle(document.documentElement);
  var tiles = [].slice.call(box.querySelectorAll('.gtile')).map(function (el) {
    var r = el.getBoundingClientRect();
    var im = el.querySelector('img');
    return {
      w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
      ar: +(r.width / r.height).toFixed(4),
      label: (el.querySelector('span') || {}).textContent || '',
      src: im ? im.getAttribute('src').split('/').pop() : null,
    };
  });
  return { arPoster: root.getPropertyValue('--ar-poster').trim(), tiles: tiles };
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
    /* ตัวที่ซ่อนอยู่เองต้องถูกเปิดก่อนจึงจะตรวจได้: computed display ของมันคือ none ตรง ๆ
       (ต่างจากลูกของ ancestor ที่ซ่อน ซึ่ง getComputedStyle ยังคืน inline อยู่แล้ว
       → fixture แบบ <div hidden><span ...> ผ่านได้แม้ถอดขั้นตอนเปิดแผงออก วัดแล้ว) */
    + '<span id="f-hidden" hidden style="height:200px">x</span>';
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
  console.log(`AIO-37 + AIO-54 · ด่านเลย์เอาต์ฮีโร่ · ด่านกัน "inline แต่ตั้ง height" · ด่านฟอลด์ A/B/C ที่ ${BASE}`);
  /* ตั้งสภาพคลังให้ชัดก่อนนำทางครั้งแรก — "โปรไฟล์ใหม่จึงคลังว่างอยู่แล้ว" เป็นข้อสันนิษฐาน
     ที่พังทันทีที่ใครเพิ่มขั้นตอนก่อนหน้านี้ · ส่วน 1 ต้องวัดในสภาพผู้ใช้ใหม่เสมอ */
  await setStorageMode('new');

  /* ===== ส่วน 0 · self-test ของตัวกวาด (ใช้เวลา ~1 วินาที) =====
     ตัวกวาดคือเครื่องวัดของส่วน 2 · ถ้ามันตาบอด ส่วน 2 จะเขียวแบบไร้ความหมาย 504 หน้า */
  if (ONLY === '' || ONLY === 'sweep') {
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
  if (ONLY === '' || ONLY === 'hero') {
    console.log(`\nส่วน 1 · ฮีโร่หน้าแรก — สูง ≤ ${MAX_HERO}px · ตรงกับม็อกอัพที่อนุมัติ ${MOCKUP}`
      + ' ทั้งความสูงและตำแหน่งทุกสไลด์ (เพดานฟอลด์ ≤85% อยู่ส่วน 3 เกณฑ์ A1)');

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
      /* ความสูง "และตำแหน่ง" ของทุกสไลด์ต้องตรงกับแบบ — ไม่ใช่แค่สไลด์แรก
         (AIO-40 พิสูจน์ว่าดูแต่สไลด์แรกแล้ว regression ของสไลด์ 2 หลุดได้) */
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
        /* ข้อ 1 · เพดานความสูงฮีโร่ (เพดาน "ขอบล่าง ≤85% ของจอ" ย้ายไปส่วน 3 แล้ว —
           ที่นั่นวัดทุกหน้าทุกขนาดจอด้วยเกณฑ์ A1 เดียวกัน ไม่ใช่หน้าแรกอย่างเดียว) */
        check(`${vp.w}×${vp.h} · ฮีโร่สูง ≤ ${MAX_HERO}px ทุกสไลด์`,
          got.heroes.every(h => h.height <= MAX_HERO),
          got.heroes.map(h => `${h.id}=${h.height}px`).join(' '));
      }

      /* ลำดับหน้ายังเป็นลำดับที่อนุมัติ — section ถัดจากฮีโร่คือแถว "ดูต่อจากที่ค้างไว้"
         วัดจาก DOM ไม่ใช่จากพิกเซล เพราะหลัง AIO-38 F1 section นี้ถูกซ่อนเมื่อไม่มีเรื่องค้าง
         (สภาพของผู้ชมที่มาครั้งแรกทุกคน) · "โผล่ให้เห็นกี่ px" เป็นงานของเกณฑ์ A2 ในส่วน 3
         ซึ่งนับเฉพาะการ์ดเรื่องจริง — ของเดิมนับหัวข้อ section กับกล่องสถานะว่างด้วย
         จึงเขียวได้ทั้งที่ผู้ใช้เห็นการ์ดเรื่อง 0 ใบ (AIO-38 หลักฐานที่ 1920×1080) */
      if (!got.next) {
        check(`${vp.w}×${vp.h} · มี section ถัดจากฮีโร่`, false, 'ไม่มี element ถัดไป');
      } else {
        check(`${vp.w}×${vp.h} · แถวถัดจากฮีโร่คือ "ดูต่อจากที่ค้างไว้" (${got.next.tag}#${got.next.id})`,
          got.next.heading.includes('ดูต่อจากที่ค้างไว้'), `หัวข้อที่เจอ: "${got.next.heading}"`);
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

  /* ===== ส่วน 2 · กวาดทุกหน้าที่ส่งมอบหาบั๊กตระกูลเดียวกัน (เกณฑ์ข้อ 5) =====
     สองรอบ: ผู้ใช้ใหม่ + ผู้ใช้ที่กลับมา · รอบที่สองคือสิ่งที่ปิดจุดบอดของ AIO-38 F3 */
  if (ONLY === '' || ONLY === 'sweep') {
    /* ส่วนกวาดจะไร้ความหมายถ้าไม่เจอหน้า: probes === PAGES.length * 2 เป็นจริงเมื่อ 0 === 0
       → ตั้งพื้นจำนวนหน้าไว้ ถ้าโครงไฟล์ย้ายที่หรือลืม build ด่านต้องแดง ไม่ใช่เขียวแบบว่างเปล่า */
    check(`พบหน้าที่ส่งมอบอย่างน้อย ${MIN_PAGES} หน้า (เจอ ${PAGES.length})`,
      PAGES.length >= MIN_PAGES, `เจอ ${PAGES.length} หน้า — ลืม build หรือโครงไฟล์ย้ายที่?`);

    for (const mode of ['new', 'seeded']) {
      await setStorageMode(mode);
      console.log(`\nส่วน 2${mode === 'new' ? 'ก' : 'ข'} · กวาด ${PAGES.length} หน้าที่ส่งมอบ`
        + ` × ${SWEEP_VIEWPORTS.length} ขนาดจอ · สภาพ: ${MODE_LABEL[mode]}`
        + ' — หา element ที่ display:inline แต่ตั้ง height/width/aspect-ratio');
      const offenders = [];
      let scanned = 0, inline = 0, unhidden = 0, probes = 0, seedSeen = 0, seedPages = 0;
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
          if (!navigated) {
            await go(p); navigated = true;
            /* นับการ์ดที่ขึ้นจากคลังก่อนถอด [hidden] — หลักฐานว่า "ซีดติด" ไม่ใช่เชื่อว่าติด */
            const n = await evaluate(`document.querySelectorAll('.cont,.controw').length`);
            if (n > 0) { seedSeen += n; seedPages++; }
            unhidden += await evaluate(SWEEP_PREP);
          } else await settle();
          const r = await evaluate(SWEEP_PROBE);
          scanned += r.scanned; inline += r.inline; probes++;
          for (const h of r.hits) offenders.push({ page: p, vp: `${vp.w}×${vp.h}`, ...h });
        }
        if ((i + 1) % 100 === 0 || i === PAGES.length - 1) {
          console.log(`    … ${i + 1}/${PAGES.length} หน้า · สแกน ${scanned} element`
            + ` · เป็น inline ที่กฎนี้ตรวจได้จริง ${inline} ตัว`
            + ` · การ์ดจากคลัง ${seedSeen} ใบใน ${seedPages} หน้า`
            + ` · พบปัญหา ${offenders.length} จุด · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
      }
      check(`[${mode}] กวาดครบทุกหน้าที่ส่งมอบ (${probes} การวัด = ${PAGES.length} หน้า × ${SWEEP_VIEWPORTS.length} ขนาดจอ)`,
        probes === PAGES.length * SWEEP_VIEWPORTS.length, `วัดได้ ${probes}`);
      /* ยามของรอบซีดเอง: ถ้าซีดไม่ติด (คีย์เปลี่ยนชื่อ · รูปข้อมูลเปลี่ยน · สคริปต์ไม่ถูกฉีด)
         รอบนี้จะกวาดหน้าเดียวกับรอบแรกแล้วเขียวแบบไร้ความหมาย — ซึ่งคือบั๊กที่กำลังแก้อยู่นี่เอง */
      if (mode === 'seeded') {
        check(`[seeded] การ์ดจาก lakorn.cont ขึ้นจริงก่อนกวาด (เจอ ${seedSeen} ใบใน ${seedPages} หน้า)`,
          seedPages >= 2 && seedSeen >= SEED_ENTRIES.length * 2,
          `ซีด ${SEED_ENTRIES.length} เรื่อง (${SEED_ENTRIES.map(([k]) => k).join(' ')})`
          + ` แต่เจอการ์ด ${seedSeen} ใบใน ${seedPages} หน้า — ซีดไม่ติด ด่านรอบนี้จะตาบอด`);
      } else {
        check(`[new] ผู้ใช้ใหม่ไม่มีการ์ดจากคลังเลย (เจอ ${seedSeen} ใบ)`, seedSeen === 0,
          `เจอ ${seedSeen} ใบใน ${seedPages} หน้า — สภาพ "ผู้ใช้ใหม่" ไม่สะอาด`);
      }
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
        check(`[${mode}] ไม่มี element ที่ display:inline แต่ตั้ง height/width/aspect-ratio`
          + ` (พบ ${offenders.length} จุด ใน ${pages.length} หน้า)`, false, pages.slice(0, 8).join(' '));
      } else {
        check(`[${mode}] ไม่มี element ที่ display:inline แต่ตั้ง height/width/aspect-ratio`
          + ` ใน ${PAGES.length} หน้า (สแกน ${scanned} element · เป็น inline ที่ตรวจได้จริง ${inline} ตัว`
          + ` · เปิดแผง [hidden] ก่อนกวาด ${unhidden} จุด)`, true);
      }
    }
  }

  /* ===== ส่วน 3 · เกณฑ์ฟอลด์ A/B/C ของ UX (AIO-38 · CEO รับเข้าด่านใน AIO-54) ===== */
  if (ONLY === '' || ONLY === 'fold') {
    for (const mode of FOLD_MODES) {
      /* รอบซีดวัดเฉพาะหน้าที่ HTML ที่ส่งมอบ "มีที่ให้ JS เติมของจากคลัง" จริง
         หามาจากไฟล์ที่ส่งมอบ ไม่ใช่รายชื่อหน้าที่เขียนมือ — หน้าใหม่วันหน้าจะถูกจับเอง */
      const pages = mode === 'new' ? FOLD_PAGES : FOLD_PAGES.filter(p => HAS_STORAGE_UI.has(p));
      await setStorageMode(mode);
      console.log(`\nส่วน 3${mode === 'new' ? 'ก' : 'ข'} · เกณฑ์ฟอลด์ A/B/C ของ UX`
        + ` · ${pages.length} หน้า × ${FOLD_VIEWPORTS.length} ขนาดจอ = ${pages.length * FOLD_VIEWPORTS.length} เคส`
        + ` · สภาพ: ${MODE_LABEL[mode]}`);
      console.log(`    A1 ขอบล่างบล็อกนำ ≤ ${LEAD_MAX_RATIO * 100}% ของจอ`
        + ` · A2 เห็นการ์ดเรื่องจริง ≥1 ใบ โผล่ ≥ ${MIN_CARD_VISIBLE}px`
        + ' · B1 คอมโพเนนต์หลัก ≤ (จอ − header) · B2 ปุ่มหลักอยู่ในจอแรก');
      if (mode === 'seeded') {
        check(`[seeded] พบหน้าที่มี UI จาก localStorage ในไฟล์ที่ส่งมอบ (เจอ ${pages.length} หน้า)`,
          pages.length >= 3, `เจอ ${pages.length} หน้า: ${[...HAS_STORAGE_UI].join(' ')}`);
      }
      const bad = [];
      const byType = { A: new Set(), B: new Set(), C: new Set() };
      const exempt = new Map();     /* หน้า → เหตุที่ถูกยกเว้น */
      let cases = 0;
      const t0 = Date.now();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        let navigated = false;
        for (const vp of FOLD_VIEWPORTS) {
          await viewport(vp);
          if (!navigated) { await go(p); navigated = true; } else await settle();
          const r = await evaluate(FOLD_PROBE);
          cases++;
          byType[r.type].add(p);
          if (r.type === 'C') exempt.set(p, 'ประเภท C — หน้าเต็มจอโดยตั้งใจ (/feed/) ยกเว้น A1/A2/B1');
          else if (r.legitimatelyEmpty) exempt.set(p, `ไม่มีข้อมูลจริงให้แสดงและโชว์สถานะว่างที่ออกแบบไว้ (${r.emptyShown} กล่อง) ยกเว้น A1/A2`);
          if (!r.pass) {
            bad.push({ page: p, vp: `${vp.w}×${vp.h}`, r });
          }
        }
        if ((i + 1) % 100 === 0 || i === pages.length - 1) {
          console.log(`    … ${i + 1}/${pages.length} หน้า · ${cases} เคส`
            + ` · A ${byType.A.size} หน้า · B ${byType.B.size} · C ${byType.C.size}`
            + ` · ยกเว้น ${exempt.size} หน้า · ตก ${bad.length} เคส · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
      }
      check(`[${mode}] วัดครบทุกเคส (${cases} = ${pages.length} หน้า × ${FOLD_VIEWPORTS.length} ขนาดจอ)`,
        cases === pages.length * FOLD_VIEWPORTS.length, `วัดได้ ${cases}`);

      if (bad.length) {
        console.log('');
        /* พิมพ์เคสที่ตกพร้อมตัวเลขที่ทำให้ตก — คนอ่านต้องไม่ต้องไปวัดเองใหม่ */
        for (const b of bad.slice(0, 30)) {
          const r = b.r, why = [];
          if (!r.A1) why.push(`A1 บล็อกนำ ${r.lead.s} จบที่ y=${r.lead.bottom} = ${r.lead.pct}% ของจอ ${r.vh}px (เพดาน ${LEAD_MAX_RATIO * 100}%)`);
          if (!r.A2) why.push(`A2 การ์ดเรื่องจริงที่เห็น 0 ใบ (มีการ์ดนอกบล็อกนำ ${r.nOutside} ใบ`
            + `${r.best ? ` · ใบที่โผล่มากสุด ${r.best.s} โผล่ ${r.best.shown}px จากสูง ${r.best.h}px เริ่ม y=${r.best.top}` : ''}`
            + ` · เกณฑ์ ≥ ${MIN_CARD_VISIBLE}px)`);
          if (!r.B1) why.push(`B1 ${r.tooTall.map(x => `${x.s} สูง ${x.h}px`).join(' · ')} > งบ ${r.budget}px (จอ ${r.vh} − header ${r.hdrH})`);
          if (!r.B2) why.push(`B2 ปุ่มหลัก ${r.cta.s} อยู่ที่ y=${r.cta.top} หลุดจอแรก (จอ ${r.vh}px)`);
          console.log(`  ✗ ${b.page} @${b.vp} · ประเภท ${r.type} · ${why.join(' | ')}`);
        }
        if (bad.length > 30) console.log(`  … อีก ${bad.length - 30} เคส`);
        const byPage = [...new Set(bad.map(b => b.page))];
        check(`[${mode}] ทุกหน้าผ่านเกณฑ์ฟอลด์ A/B/C (ตก ${bad.length} เคส ใน ${byPage.length} หน้า)`,
          false, byPage.slice(0, 6).join(' ') + (byPage.length > 6 ? ' …' : ''));
      } else {
        check(`[${mode}] ทุกหน้าผ่านเกณฑ์ฟอลด์ A/B/C ครบ ${cases} เคส`
          + ` (A ${byType.A.size} หน้า · B ${byType.B.size} หน้า · C ${byType.C.size} หน้า`
          + ` · ยกเว้นตามที่ประกาศไว้ ${exempt.size} หน้า)`, true);
      }
      for (const [p, why] of exempt) console.log(`    ยกเว้น: ${p} — ${why}`);

      /* ยามกันทางออกง่าย: "ยกเว้นทั้งเว็บแล้วเขียว" ต้องทำไม่ได้เงียบ ๆ
         และต้องมีหน้าที่ถูกวัดด้วย A1/A2 และ B1/B2 จริงอย่างละเป็นกอง ไม่ใช่หน้าสองหน้า */
      if (mode === 'new') {
        check(`ข้อยกเว้นไม่เกิน ${FOLD_MAX_EXEMPT} หน้า (ใช้ ${exempt.size} หน้า)`,
          exempt.size <= FOLD_MAX_EXEMPT, [...exempt.keys()].join(' '));
        check(`หน้าที่ถูกวัดด้วยเกณฑ์ A (หน้าเลือกเรื่อง) ≥ ${FOLD_MIN_TYPE_A} หน้า (ได้ ${byType.A.size})`,
          byType.A.size >= FOLD_MIN_TYPE_A, `ได้ ${byType.A.size} หน้า`);
        check(`หน้าที่ถูกวัดด้วยเกณฑ์ B (หน้าดูเรื่อง/ดูตอน) ≥ ${FOLD_MIN_TYPE_B} หน้า (ได้ ${byType.B.size})`,
          byType.B.size >= FOLD_MIN_TYPE_B, `ได้ ${byType.B.size} หน้า`);
      }
    }

    /* ===== ส่วน 4 · F1 + F3 ของ AIO-38 แบบชี้ตรงจุด =====
       สองข้อนี้มีด่านเฉพาะ เพราะผลรวมของเกณฑ์ฟอลด์บอกแค่ "ตก/ผ่าน" ไม่ได้บอกว่าแถว "ดูต่อ"
       ยังทำงานถูกอยู่ไหม · F1 วัดสองสภาพที่ขัดกันเอง: ว่างต้องซ่อน · มีของต้องโชว์ */
    console.log('\nส่วน 4 · แถว "ดูต่อจากที่ค้างไว้" — F1 (ซ่อนเมื่อว่าง) และ F3 (สัดส่วนการ์ด)');
    for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
      await viewport(vp);

      await setStorageMode('new');
      await go(HOME);
      const dry = await evaluate(CONT_PROBE);
      check(`${vp.w}×${vp.h} · ผู้ใช้ใหม่: #contSec ถูกซ่อนทั้ง section (F1)`,
        !!dry.sec && dry.sec.hidden && dry.sec.display === 'none' && dry.sec.h === 0,
        dry.sec ? `hidden=${dry.sec.hidden} display=${dry.sec.display} สูง ${dry.sec.h}px`
          + ' — กล่องสถานะว่างกินพื้นที่ใต้ฮีโร่จนจอแรกเหลือการ์ดเรื่อง 0 ใบ' : 'ไม่พบ #contSec');
      check(`${vp.w}×${vp.h} · ผู้ใช้ใหม่: ไม่มีการ์ด .cont บนหน้าแรก (${dry.nCont} ใบ)`,
        dry.nCont === 0, `เจอ ${dry.nCont} ใบ`);

      await setStorageMode('seeded');
      for (const p of [HOME, OFFLINE]) {
        await go(p);
        const wet = await evaluate(CONT_PROBE);
        check(`${vp.w}×${vp.h} ${p} · ผู้ใช้ที่กลับมา: การ์ด .cont ครบ ${SEED_ENTRIES.length} ใบ`,
          wet.nCont === SEED_ENTRIES.length, `เจอ ${wet.nCont} ใบ`);
        if (p === HOME) {
          check(`${vp.w}×${vp.h} · ผู้ใช้ที่กลับมา: #contSec กลับมาแสดง (ไม่ค้างซ่อน)`,
            !!wet.sec && !wet.sec.hidden && wet.sec.h > 0,
            wet.sec ? `hidden=${wet.sec.hidden} สูง ${wet.sec.h}px` : 'ไม่พบ #contSec');
        }
        if (!wet.thumb) { check(`${vp.w}×${vp.h} ${p} · มี .cont .thumb ให้วัด`, false, 'ไม่พบ'); continue; }
        /* F3 · กล่องจริงต้องได้สัดส่วนที่โทเคนประกาศ ไม่ใช่สัดส่วนไฟล์ปก 1024×1536 (0.667)
           วัดจาก --ar-cont ของหน้า ไม่ฝังเลข 16/9 ไว้ในด่าน */
        const [aw, ah] = (wet.arCont || '16/9').split('/').map(Number);
        const want = aw / ah;
        check(`${vp.w}×${vp.h} ${p} · .cont .thumb เป็น block และได้สัดส่วน --ar-cont (${wet.arCont})`,
          wet.thumb.display === 'block' && Math.abs(wet.thumb.ar - want) < 0.02 * want,
          `display:${wet.thumb.display} · aspect-ratio ที่ประกาศ ${wet.thumb.cssAspect}`
          + ` · กล่องจริง ${wet.thumb.w}×${wet.thumb.h}px (ar ${wet.thumb.ar}) · ต้องได้ ~${want.toFixed(3)}`);
        check(`${vp.w}×${vp.h} ${p} · .cont .m เป็น block (margin-top ${wet.meta.marginTop} มีผลจริง)`,
          wet.meta.display === 'block',
          `display:${wet.meta.display} — inline ทำให้ margin ในแนวตั้งถูกเมินทั้งค่า`);
      }
    }
    await setStorageMode('new');
  }

  /* ===== ส่วน 5 · ไทล์ "เลือกตามแนว" แนวตั้ง 2:3 (AIO-54 เฟส 2) ===== */
  if (ONLY === '' || ONLY === 'bento') {
    await setStorageMode('new');
    console.log(`\nส่วน 5 · ไทล์ "เลือกตามแนว" ที่ ${BENTO_PAGES.join(' และ ')}`
      + ` × ${FOLD_VIEWPORTS.length} ขนาดจอ — สัดส่วน 2:3 ±${BENTO_AR_TOL * 100}%`
      + ` · ที่ ≥${BENTO_ROW_MIN_W}px อยู่แถวเดียวสูงเท่ากัน · ปกไม่ซ้ำกันเลยทั้ง ${D.genres.length} ใบ`);
    for (const p of BENTO_PAGES) {
      let navigated = false;
      for (const vp of FOLD_VIEWPORTS) {
        await viewport(vp);
        if (!navigated) { await go(p); navigated = true; } else await settle();
        const r = await evaluate(BENTO_PROBE);
        if (r.error) { check(`${p} @${vp.w}×${vp.h} · มีไทล์ให้วัด`, false, r.error); continue; }
        const t = r.tiles;
        const at = `${p} @${vp.w}×${vp.h}`;
        /* จำนวนไทล์ต้องเท่าจำนวนแนวในข้อมูล — ถ้าหายไปใบหนึ่ง every() ข้างล่างจะจริงเงียบ ๆ */
        check(`${at} · มีไทล์ครบ ${D.genres.length} ใบเท่าจำนวนแนวในคลัง`,
          t.length === D.genres.length, `เจอ ${t.length} ใบ`);
        if (!t.length) continue;
        const [aw, ah] = (r.arPoster || '2/3').split('/').map(Number);
        const want = aw / ah;
        check(`${at} · ทุกใบสัดส่วน --ar-poster (${r.arPoster} = ${want.toFixed(3)}) ±${BENTO_AR_TOL * 100}%`,
          t.every(x => Math.abs(x.ar - want) <= BENTO_AR_TOL * want),
          t.map(x => `${x.w}×${x.h}=${x.ar}`).join(' · '));
        /* ปกซ้ำ: เทียบชื่อไฟล์ปก ไม่ใช่เทียบชื่อเรื่อง — ที่ตาเห็นคือไฟล์ */
        const srcs = t.map(x => x.src);
        const dup = srcs.filter((s, i) => srcs.indexOf(s) !== i);
        check(`${at} · ปกของไทล์ไม่ซ้ำกันเลย (${new Set(srcs).size}/${t.length} ใบไม่ซ้ำ)`,
          new Set(srcs).size === t.length && srcs.every(Boolean),
          `ซ้ำ: ${[...new Set(dup)].join(' ') || '-'} · ทั้งชุด: ${srcs.join(' ')}`);
        if (vp.w >= BENTO_ROW_MIN_W) {
          const tops = [...new Set(t.map(x => x.top))];
          check(`${at} · อยู่แถวเดียวทั้ง ${t.length} ใบ`, tops.length === 1,
            `ขอบบนที่เจอ: ${tops.join(' / ')} — ใบที่ตกแถวสอง: `
            + t.filter(x => x.top !== t[0].top).map(x => `${x.label.trim()}@y${x.top}`).join(' '));
          const hs = [...new Set(t.map(x => x.h))];
          check(`${at} · สูงเท่ากันทุกใบ (${hs.join('/')}px)`, hs.length === 1,
            t.map(x => `${x.label.trim()}=${x.w}×${x.h}`).join(' · '));
        }
      }
    }
  }

  console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
  cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  cleanup(1);
}
