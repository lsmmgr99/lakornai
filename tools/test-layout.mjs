/* ด่านเลย์เอาต์ฮีโร่ + ด่านกันบั๊กตระกูล "inline แต่ตั้ง height" + ด่านฟอลด์ A/B/C
   + ด่านวัดทรงทุกที่วาง — AIO-37 · AIO-54 · AIO-57
   รัน:  node tools/test-layout.mjs
         SKIP_BUILD=1 node tools/test-layout.mjs       (ตรวจไฟล์ที่มีอยู่ตามสภาพ ไม่ build ใหม่)
         ONLY=hero node tools/test-layout.mjs          (hero=ส่วน 1 · sweep=ส่วน 0+2 · fold=ส่วน 3+4
                                                        · bento=ส่วน 5 · shape=ส่วน 6)
         FOLD_SEEDED=1 node tools/test-layout.mjs      (บังคับเกณฑ์ฟอลด์กับสภาพ "ผู้ใช้ที่กลับมา" ด้วย
                                                        — ดูเหตุที่ยังไม่เปิดเป็นค่าตั้งต้นที่ FOLD_SEEDED)
         LAY_PORT=4299 LAY_CDP=9499 LAY_PORT_WIDE=4300 node tools/test-layout.mjs
                                                       (ตั้งพอร์ตทับเมื่อรันขนานกับ run อื่น ·
                                                        ส่วน 6 ใช้พอร์ตที่สองสำหรับต้นไม้ชั่วคราว)
         LAY_STACK=1 node tools/test-layout.mjs        (พิมพ์ stack ตอนด่านล้มเอง ไม่ใช่ตอนเคสตก)

   ทำไมต้องใช้เบราว์เซอร์จริง: บั๊กที่ด่านนี้กันคือ "ค่าถูกตั้งแต่ไม่ถูกใช้" — `<span>` เป็น inline
   non-replaced ซึ่ง CSS height / aspect-ratio ไม่มีผล · getComputedStyle ยังรายงาน
   "height: 480px" ตามที่เขียนไว้ ขณะที่กล่องจริงสูง 1872px ตามสัดส่วนไฟล์ปก (1024×1536)
   → grep CSS ไม่เห็น · อ่าน computed style ไม่เห็น · เห็นได้ทางเดียวคือเทียบกับ
   getBoundingClientRect() ของหน้าที่ render จริง

   เจ็ดส่วน:
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

   5) ไทล์ "เลือกตามแนว" แนวตั้ง 2:3 แถวเดียว ปกไม่ซ้ำ (AIO-54 เฟส 2)
   6) ทรงของ **ทุกที่วาง** ในแผนที่ของ ADR-001 §13.5 + AIO-56 × 7 ขนาดจอ × **สองสถานะ**
      (ไม่มีไฟล์ภาพกว้าง = เส้นถอยกลับ · มีไฟล์ภาพกว้างครบ + เรื่องแนวนอน 1 เรื่อง)
      รายละเอียดเกณฑ์ S1–S7 อยู่ที่บล็อก SHAPE_TOL/SHAPE_MAP ข้างล่าง

   มิวเทชันเทสต์ (ทำซ้ำได้ ทุกข้อรันแล้วและต้องแดงจริง):
   M1 เปลี่ยน `<div class="bg">` ของฮีโร่ใน build/pages-discovery.mjs กลับเป็น `<span>`
      → ตกส่วน 1 (ฮีโร่ 1872px) และส่วน 2 (6 จุด)
   M2 ถอด `.cont .thumb{display:block}` ใน build/site-extra.css ออก
      → ตกส่วน 2 รอบซีด (`.cont .thumb` กล่องจริง 300×507 ขณะ aspect-ratio ประกาศ 16/9)
        และตกส่วน 3 รอบซีด (A2 ที่ 1440×900 ตกเพราะการ์ดใบแรกสูงเกินจอ)
   M3 คืนพฤติกรรมเดิมที่ซ่อน #contSec ใน build/app.src.js (ถอดสองบรรทัดออก)
      → ตกส่วน 3 รอบผู้ใช้ใหม่ (A2 หน้าแรก: เห็นการ์ดเรื่องจริง 0 ใบ) และตกข้อ F1 โดยตรง
   ---- ส่วน 6 (AIO-57) · วัดแล้วทั้งหมด แต่ละข้อรันในสำเนาแยกของรีโป ----
   M4 ถอด `wideMedia: HERO_WIDE_MEDIA` ออกจากฮีโร่ = บังคับให้ฮีโร่ใช้ปก 2:3 ทั้งที่มีภาพกว้าง
      → ตก 4 ข้อ (ส่วน 6ข): ไฟล์ของทรง 'wide' · ฮีโร่ @720px · <picture> ทั้งสองความกว้าง
   M5 คอมเมนต์กฎ `.player[data-orientation=horizontal]` ทิ้ง = เพลเยอร์ 9:16 ตายตัวให้เรื่องแนวนอน
      → ตก 1 ข้อ: "เพลเยอร์หน้าตอน (เรื่องแนวนอน)" ประกาศ 9/16 แต่ต้องได้ --ar-stage-h
      ⚠️ ข้อนี้ **เคยเขียว** ตอนด่านไปแต่หน้าตอนของเรื่องแนวตั้ง — เหตุที่แผนที่ต้องมีสองรายการ
         สำหรับ `.player` และต้องหยิบเรื่องจากคลังของสถานะนั้นด้วย `atFor`
   M6 เปลี่ยน `.cont .thumb` จาก 'auto' กลับเป็น 'poster' → ตก "ไฟล์ที่โหลดคือไฟล์ของทรง 'auto'"
      ⚠️ ข้อนี้ก็ **เคยเขียว** ตอนรอบซีดมีแต่สองเรื่องแรกของคลัง (แนวตั้งทั้งคู่) — เหตุที่
         สภาพ 'shape' ต้องซีดเรื่องท้ายคลังเพิ่ม (ดู SHAPE_SEED_SLUGS) · รูเดียวกับ M5
   M7 ฝัง `width="1024" height="1536"` กลับที่การ์ด "ดูต่อ" → **build ล้มที่กฎ V18** ก่อนถึงด่าน
      (ด่านรายงานเป็นข้อตก "build ต้นไม้ชั่วคราวผ่าน") — สองชั้นจับข้อนี้ ไม่ใช่ชั้นเดียว
   M8 **เพิ่ม**ตัวกรองทิศกลับเข้าฟีดฝั่งเบราว์เซอร์ = ขัด D8 ฉบับกลับทาง (มติลูกค้า)
      → ตก 3 ข้อ: V17 ก (ขาด mangosteen-heart · ซ้ำ durian-revenge) · วงไม่ปิด · V17 ข (N=11 ≠ 12)
   M9 ถอด `.hero .bg picture{display:block}` → ตก 2 ข้อ (picture display=inline ทั้งสองความกว้าง)
   M10 ไม่เขียนทิศลงกล่องตอนสลับเรื่องในฟีด (`box.dataset.orientation`)
      → ตก V17 ค ครึ่งข้อมูล: กล่องบอก vertical แต่ข้อมูลบอก horizontal
   M11 เลือกไฟล์ครั้งเดียวแทนเลือกใหม่ทุกครั้งที่สลับเรื่อง (`coverSlot(s,'poster')` ใน `show()`)
      → ตก "ภาพในเพลเยอร์ฟีดได้ไฟล์ของทรง 'auto' ทุกก้าว"
   M12 ตั้ง `V17C_BOX_PENDING_AIO59 = false` ทั้งที่ `.mwin`/`.clip` ยังไม่มีในเว็บจริง
      → ตก V17 ค ครึ่งทรง ("ไม่มี .clip ที่: <slug>") · ข้อนี้พิสูจน์ว่าสวิตช์ที่ปิดไว้
        **ต่ออยู่กับด่านจริง** ไม่ใช่ค่าที่ตั้งแล้วไม่มีผล — ยามกันการใช้สวิตช์เป็นที่ซ่อนงาน */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* TOP10 เรียงด้วย `eps` (RANK_BASIS) ไม่ใช่ด้วยทิศ ⇒ TOP10[0] เท่ากันทั้งสองสถานะ
   จึงใช้เป็นค่าอ้างอิงของ "เรื่องแรกที่ฟีดเปิด" ได้ทั้งรีโปจริงและต้นไม้ชั่วคราว */
import { D, SERIES, TOP10, U, epSecs, COVER_WIDE_W, COVER_WIDE_H } from '../build/content.mjs';
import { imageSize } from '../build/imgsize.mjs';
import { HERO_WIDE_BP } from '../build/pages-discovery.mjs';
import { siteFiles } from '../ci/site-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-lay-'));
const ONLY = process.env.ONLY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ONLY ที่สะกดผิดเคยรันทุกส่วนเงียบ ๆ ทั้งที่คนสั่งคิดว่ารันส่วนเดียว — ล้มทันทีดีกว่า */
if (!['', 'hero', 'sweep', 'fold', 'bento', 'shape'].includes(ONLY)) {
  console.error(`✗ ONLY=${ONLY} ไม่รู้จัก — ใช้ได้เฉพาะ hero | sweep | fold | bento | shape (หรือไม่ตั้งเลย = ทุกส่วน)`);
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

/* ---------- ส่วน 6 · ด่านวัด "ทรงของทุกที่วาง" (AIO-57 · ADR-001 §13) ----------
   ประวัติที่ทำให้ด่านนี้ต้องมี: AIO-37 (ฮีโร่ `span` ทำให้ height ถูกเมิน) และ AIO-53/54
   (ไทล์แบน) — **ทั้งสองรอบลูกค้าเป็นคนจับได้ก่อนทีม** และด่าน 252 เคสของ UX ก็ไม่เห็น
   เพราะมันวัด "จอแรกเห็นอะไร" ไม่ได้วัดความถูกต้องของ "ทรง"

   ส่วนนี้วัดสี่อย่างต่อหนึ่งที่วาง ต่อหนึ่งขนาดจอ:
     S1 กล่องที่ render จริงตรงกับทรงที่ "ที่วางนั้นประกาศไว้" (±2%) — คือบั๊ก AIO-37/53/54
        ทรงที่ประกาศอ่านจาก computed aspect-ratio ของกล่อง (หรือจาก height/width ที่เป็น px)
        ไม่ฝังเลขไว้ในด่าน · กล่องที่ "ไม่ประกาศทรงเลย" ถูกบันทึกเป็น ℹ ไม่ใช่ ✓ (ดู SHAPE_MAX_UNDECLARED)
     S2 ไฟล์ที่เบราว์เซอร์โหลดจริง = ไฟล์ที่ทรงนั้นควรได้ (ADR-001 §13.5 poster/wide/auto)
        รู้ว่า "ควรได้" จากข้อมูลของ build นั้น ไม่ใช่รายชื่อเรื่องที่เขียนมือ
     S3 แอตทริบิวต์ width/height ของ <img> = ขนาดจริงของไฟล์นั้นบนดิสก์ (อ่านด้วย build/imgsize.mjs)
        ข้อนี้คือข้อที่จับ "ค่าคงที่ 1024×1536 ที่ฝังไว้ 8 จุด" (กฎ V18) และจับ V15 ถ้าไฟล์ขนาดเพี้ยน
        — ไม่มีเลขขนาดภาพอยู่ในด่านนี้แม้ตัวเดียว
     S4 naturalWidth/Height ของรูปที่โหลดแล้ว = ขนาดเดียวกัน (แอตทริบิวต์ไม่ได้โกหกไบต์จริง)
   บวกสามข้อที่ผูกกับทรงโดยเฉพาะ:
     S5 ฮีโร่: ที่ 719px เบราว์เซอร์ต้องเลือกไฟล์ปก 2:3 · ที่ 720px ต้องเลือกไฟล์กว้าง
        (วัดของจริง ไม่ใช่เทียบสตริง media กับ CSS — เบราว์เซอร์เป็นคนเลือก ADR §13.6)
     S6 กล่องเพลเยอร์มาจาก `orientation` ของเรื่องที่ขึ้นจริง ไม่ใช่โทเคนตายตัว (§13.7 D7)
     S7 ฟีดไม่มีเรื่องแนวนอนเลย ทั้งใน HTML ที่ส่งออกและตอนกดลูกศรถัดไปจนครบวง (กฎ V17)

   **สองสถานะ ไม่ใช่สถานะเดียว** — ทั้งหมดข้างบนรันสองรอบ:
     ก) สถานะถอยกลับ = รีโปตามสภาพ (ยังไม่มีไฟล์ภาพกว้าง · ทุกเรื่องแนวตั้ง)
     ข) สถานะมีของจริง = ต้นไม้ชั่วคราวใน /tmp ที่ด่านสร้างเอง: ภาพกว้าง 2640×1200 ครบทุกเรื่อง
        + เรื่องสุดท้ายถูกตั้งเป็น `horizontal` แล้ว build ใหม่ที่นั่น
        ⇒ เส้นทางที่วันนี้ไม่มีใครเดินผ่าน (ฮีโร่ `<picture>` · `.cont` ทรงกว้าง · เพลเยอร์ 16:9
          · ฟีดตัดเรื่องออก) ถูกวัดของจริงทุกรอบ ไม่ใช่รอให้มีไฟล์จริงก่อนจึงรู้ว่าพัง
        ⚠️ ต้นไม้ชั่วคราวเป็นสำเนา — ด่านนี้ **ไม่แก้ไฟล์ในรีโปแม้ไฟล์เดียว** (workspace แชร์กับ run อื่น) */
const SHAPE_TOL = 0.02;          /* ±2% ตามใบงาน — เกณฑ์เดียวกับ BENTO_AR_TOL */
/* กล่องที่ไม่ประกาศ aspect-ratio ที่ขนาดจอใดเลย จับด้วย S1 ไม่ได้โดยหลักการ (ไม่มีอะไรให้เทียบ)
   ยามกันการปิดปากด่าน: ถ้ามีมากกว่านี้ แปลว่ามีคนย้ายที่วางเข้าช่องนี้แทนที่จะแก้ของ
   วันนี้มีสามช่อง และทั้งสามมีเหตุผลที่เขียนไว้ที่ตัวมันเองใน SHAPE_MAP:
     `.pickgrid .gtile`        — Visual ตัดสินว่าเป็นแถบนอน เขียนกำกับไว้ในกฎเอง
     `.btile .reelstrip span`  — flex:1 ความสูงตรึง 200px ⇒ ทรงเปลี่ยนตามจอ (1.103 ที่ 1440
                                 · 0.520 ที่ 390) Visual เจอเองและบันทึกไว้ใน AIO-56 §5
     `.player.full`            — ตั้งใจเต็มจอ (aspect-ratio:auto + height) ตามเกณฑ์ประเภท C
   หมายเหตุ: ฮีโร่ **ไม่** อยู่ในรายการนี้ เพราะมันประกาศ --ar-poster ที่ <720px
   (ที่ ≥720px ความสูงเป็นของ UX ตามเพดาน 56vh ของ AIO-38 · ADR §13.10 ข้อ 3) */
const SHAPE_MAX_UNDECLARED = 3;
const SHAPE_WIDE_DIR = 'assets/covers-wide';

/* ---------- V17 ข้อ ค ครึ่งหลัง: ทรงของกล่องสื่อในฟีดเมื่อเรื่องเป็นแนวนอน ----------
   สามค่าข้างล่าง **ไม่ใช่ของ Dev** — UX-Designer ตอบมาให้ตรง ๆ ใน AIO-59 §10.1–§10.3
   (ADR-001 §13.10 ข้อ 7 ล็อกว่ากฎกรอบและอิลิเมนต์ของกล่องสื่อเป็นของ UX ไม่ใช่ของสัญญา)

     §10.1 อิลิเมนต์ = `.player.full[data-orientation=horizontal] > .mwin > .clip`
           `.mwin` คือ "หน้าต่าง" (พื้นที่ที่กล่องมีสิทธิ์อยู่) · `.clip` คือ **กล่องสื่อ**
           ⇒ ต้องวัด `.clip` ไม่ใช่ `.mwin` · เคสแนวตั้งไม่มีสองชั้นนี้ (กล่องสื่อ = `.player.full` เอง)
     §10.1 UX สั่งไว้ชัดว่า **"ถ้าแนวนอนแล้วไม่เจอ `.clip` = ตก" ไม่ใช่ "ไม่เจอ = ข้าม"**
           ไม่งั้นวันที่ Dev ลืมสร้างสองชั้น ด่านจะเขียวทั้งที่หน้าพัง
     §10.2 สัดส่วน = 16/9 จากโทเคน `--ar-stage-h` ของ Visual · **ไม่ต้องแก้เลขใน V17**
           (ด่าน R2 ของ UX แคบกว่า ±0.5% และอยู่ในช่วง ±2% ของสัญญาทั้งช่วง)
     §10.3 ค่ามาจาก `orientation` ในข้อมูลเท่านั้น · `--clip-ar` ไม่อยู่ใต้ `@media` ใดเลย */
const FEED_BOX_AR = 16 / 9;
const FEED_CLIP_SEL = '.player.full[data-orientation=horizontal] > .mwin > .clip';
/* ❗ ช่องโหว่ที่ประกาศไว้ตรง ๆ ไม่ใช่ที่ลืม — และตอนนี้เหลือเหตุเดียว
   กฎกรอบของ AIO-59 **มาแล้ว** (ค่าทั้งสามข้างบนคือของเขา) แต่ DOM สองชั้น `.mwin`/`.clip`
   ยังไม่ได้ถูกสร้างลงเว็บจริง เพราะ **แบบของ AIO-59 ยังรอลูกค้าอนุมัติ** (ใบงานนั้นชื่อ
   "...+ ม็อกอัพกรอบจอเดียวให้ลูกค้าอนุมัติ" และยัง in_progress) · วินัยของโปรเจกต์นี้คือ
   ลูกค้าอนุมัติภาพก่อน Dev จึงลงมือ ⇒ ผมยังไม่สร้างสองชั้นนั้น และยังบังคับข้อนี้ไม่ได้
   ⇒ ด่าน **วัดและพิมพ์ของจริงทุกรอบ** แต่ยังไม่ทำให้แดง
   ⇒ วันที่ลูกค้าอนุมัติแบบ: สร้าง `.mwin`/`.clip` ที่ `buildFeed()` + ย้าย CSS ของ UX เข้า
     แล้วตั้งค่านี้เป็น `false` — ข้อนี้กลายเป็นด่านจริงทันทีโดยไม่ต้องเขียนโค้ดเพิ่ม
   ราคาวันนี้ = ศูนย์ (0 เรื่องแนวนอนในรีโป · เจอเฉพาะในสถานะ ข ที่ด่านสร้างขึ้นเอง)
   **ห้ามใช้ค่านี้ปิดข้ออื่น** — ครึ่งข้อมูลของข้อ ค (ทิศบนกล่องตรงกับข้อมูลทุกก้าว) บังคับอยู่ */
const V17C_BOX_PENDING_AIO59 = true;

/* ---------- แผนที่ที่วาง ----------
   ยกมาจากตารางที่วางของ ADR-001 §13.5 (ฝั่ง build 12 จุด + ฝั่งเบราว์เซอร์) และจากแผนที่
   ของ AIO-56 §1 ซึ่งวัดกล่องทุกช่องไว้แล้ว · `shape` คือ "ทรงที่ที่วางนี้ขอ" ตามสัญญา
   `at` = หน้าที่ต้องไปวัด (เอา URL มาจากตาราง U ของเว็บจริง ไม่พิมพ์พาธซ้ำ)
   `mode` = สภาพ localStorage ที่ทำให้ที่วางนั้น "มีตัวตน" — ที่วางที่ render เฉพาะเมื่อมี
   ข้อมูลในเครื่อง (`.cont` `.lib-list` `.notif`) ถ้าไม่ซีดก่อนวัด ด่านมองไม่เห็นโดยโครงสร้าง
   ซึ่งเป็นรูที่เปิดจริงใน AIO-38 F3 · `drive` = ขั้นตอนขับแอปให้ที่วางนั้นโผล่ (การ์ดจบตอน/จบเรื่อง)
   `declared:false` = กล่องไม่ประกาศทรง (ดู SHAPE_MAX_UNDECLARED) */
const LAST_SERIES = SERIES[SERIES.length - 1];
const SHORT_SERIES = SERIES.reduce((a, b) => (b.eps < a.eps ? b : a));
const SHAPE_MAP = [
  { key: 'ฮีโร่หน้าแรก', sel: '.hero .bg', at: U.home, shape: 'poster', wideAtBp: true },
  { key: 'ปกในการ์ด', sel: '.card .poster', at: U.home, shape: 'poster' },
  { key: 'ไทล์เลือกตามแนว (หน้าแรก)', sel: '.genre-bento .gtile', at: U.home, shape: 'poster' },
  { key: 'ไทล์เลือกตามแนว (/browse/)', sel: '.genre-bento .gtile', at: U.browse, shape: 'poster' },
  /* declared:false ไม่ใช่การผ่อนด่าน แต่เป็นคำตัดสินของ Visual ที่เขียนกำกับไว้ในกฎเอง:
     คอมเมนต์เหนือกฎ `.gtile` ตัวฐานใน design/v2/v2.css บอกตรง ๆ ว่าช่อง onboarding
     "เป็นตัวเลือกในฟอร์ม ไม่ใช่ปกในคลัง ⇒ รูปทรงแนวตั้งผูกไว้กับ .genre-bento เท่านั้น"
     ⇒ ช่องนี้เป็นแถบนอนโดยเจตนา · ด่านยังบังคับ S2/S3/S4 กับมันเต็มรูปแบบ */
  { key: 'ไทล์เลือกแนวหน้าต้อนรับ', sel: '.pickgrid .gtile', at: U.welcome, shape: 'poster', declared: false },
  { key: 'แถวตอน', sel: '.ep-row .th', at: U.newEp, shape: 'poster' },
  /* declared:false เพราะกล่องนี้ไม่มี aspect-ratio เลย (flex:1 + ความสูงตรึง 200px) ⇒ ทรง
     เปลี่ยนตามจอโดยไม่มีใครตั้งใจ · Visual วัดเองและบันทึกเป็นข้อค้างไว้ใน AIO-56 §5
     เป็นของ Visual ไม่ใช่ของ AIO-57 — ที่นี่แค่ไม่กล่าวอ้างว่าตรวจแล้วผ่าน */
  /* 'poster' ตามข้อตัดสินของ UX ใน AIO-59 §10.5 (กรอบนี้แทน "จอของฟีด" ซึ่งเป็นแนวตั้งเสมอ)
     declared:false เพราะกล่องไม่มี aspect-ratio เลย (flex:1 + ความสูงตรึง 200px) ⇒ ทรงเปลี่ยน
     ตามจอโดยไม่มีใครตั้งใจ · Visual วัดเองและบันทึกไว้ใน AIO-56 §5 — เป็นของ Visual */
  { key: 'แถบรีลในไทล์ฟีด', sel: '.btile .reelstrip span', at: U.home, shape: 'poster', declared: false },
  { key: 'ดัชนีทุกเรื่อง', sel: '.flatlist .th2', at: U.az, shape: 'poster' },
  /* เพลเยอร์ต้องวัด **สองเรื่อง** ไม่ใช่เรื่องเดียว — นี่คือรูที่มิวเทชัน M5 เปิดให้เห็น:
     ถ้าด่านไปแต่หน้าตอนของเรื่องแนวตั้ง การคืนกฎ "เพลเยอร์ 9:16 ตายตัว" จะเขียวทั้งแผง
     เพราะ 9:16 ถูกต้องสำหรับเรื่องแนวตั้งอยู่แล้ว · `atFor` หยิบเรื่องจากคลังของสถานะนั้น
     ไม่ใช่ชื่อเรื่องที่เขียนไว้ในด่าน (เพิ่มเรื่องที่ 13 แล้วยังถูกเอง) */
  { key: 'เพลเยอร์หน้าตอน (เรื่องแนวตั้ง)', sel: '.player', shape: 'auto', player: true,
    atFor: st => { const s = Object.values(st.by).find(x => x.orientation === 'vertical'); return s ? U.watch(s.slug, 1) : null; } },
  { key: 'เพลเยอร์หน้าตอน (เรื่องแนวนอน)', sel: '.player', shape: 'auto', player: true, needs: 'horizontal',
    atFor: st => { const s = Object.values(st.by).find(x => x.orientation === 'horizontal'); return s ? U.watch(s.slug, 1) : null; } },
  /* 'auto' ไม่ใช่ 'poster' ตาม D8 ฉบับกลับทาง: ช่องนี้มีกรณีกว้างจริงตั้งแต่เรื่องแนวนอนเรื่องแรก
     declared:false เพราะกล่องตั้งใจเต็มจอ (aspect-ratio:auto + height) ⇒ ทรงของกล่องสื่อ
     เมื่อเรื่องเป็นแนวนอนเป็นของ AIO-59 · ด่าน V17 ข้อ ค ข้างล่างเป็นที่ที่บังคับข้อนั้น */
  { key: 'เพลเยอร์ฟีด', sel: '.player.full', at: U.feed, shape: 'auto', player: true, declared: false },
  /* ช่องนี้ **เคยเป็น 'wide'** และเปลี่ยนเป็น 'auto' โดยคำตัดสินของ CTO ตามข้อเสนอของ Visual
     (AIO-56 §4.2 → AIO-58 · ADR-001 §13.5) · กรอบของการ์ดยัง 16/9 เปลี่ยนเฉพาะไฟล์ที่ได้ */
  { key: 'การ์ดดูต่อ (หน้าแรก)', sel: '.cont .thumb', at: U.home, shape: 'auto', mode: 'shape' },
  /* คลังมีสองผิวที่สลับกันด้วย media query: `.lib-list` (มือถือ) และ `.lib-grid` (≥720px)
     ทั้งคู่ถูก assets/app.js สร้างจาก localStorage ⇒ ถ้าวัดแค่ผิวเดียว อีกผิวไม่มีด่านเลย */
  { key: 'รายการในคลัง (มือถือ)', sel: '.lib-list .controw .th', at: U.library, shape: 'poster', mode: 'shape' },
  { key: 'การ์ดในคลัง (เดสก์ท็อป)', sel: '.lib-grid .libcard .poster', at: U.library, shape: 'poster', mode: 'shape' },
  { key: 'รายการแจ้งเตือน', sel: '.notif .th', at: U.notifications, shape: 'poster', mode: 'shape' },
  { key: 'การ์ดตอนถัดไป', sel: '.nextup .thumb', at: U.watch(SHORT_SERIES.slug, 1), shape: 'poster', mode: 'shape', drive: 'finish' },
  { key: 'การ์ดจบเรื่อง', sel: '.endcard .ec-next .thumb', at: U.watch(SHORT_SERIES.slug, SHORT_SERIES.eps), shape: 'poster', mode: 'shape', drive: 'finish' },
];

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
/* สภาพที่ 3 สำหรับส่วน 6: ที่วางบางช่องต้องมีของอย่างอื่นในเครื่องด้วย ไม่ใช่แค่ `lakorn.cont`
     follows → `.notif .th` (หน้าแจ้งเตือนวาดจากรายการติดตาม)
     set.autoplay:false → การ์ด "ตอนถัดไป" ต้องไม่นับถอยหลังแล้วพาหน้าเปลี่ยนไปกลางการวัด

   ⚠️ **ต้องซีดเรื่องท้ายคลังเพิ่มด้วย ไม่ใช่สองเรื่องแรกเหมือนรอบซีดของส่วน 2/3**
      เรื่องที่สถานะ ข ตั้งเป็น `horizontal` คือ **เรื่องท้ายคลัง** ⇒ ถ้าซีดแค่สองเรื่องแรก
      (ซึ่งเป็นแนวตั้งทั้งคู่) การ์ด "ดูต่อ" จะไม่มีเรื่องแนวนอนเลย แล้วมิวเทชัน M6
      ("เปลี่ยน `.cont .thumb` จาก auto กลับเป็น poster") **เขียวทั้งแผง** — วัดแล้ว
      นี่คือรูเดียวกับ M5 ที่เพลเยอร์: ด่านต้องเห็นของทั้งสองทิศ ไม่ใช่ทิศเดียว
      (ไม่แก้ `SEED_CONT`/`SEED_ENTRIES` เพราะส่วน 2/3 ตรึงจำนวนการ์ดไว้ตามเกณฑ์ของ AIO-54) */
const SHAPE_SEED_SLUGS = [...new Set([...SEED_ENTRIES.map(e => e[0]), SERIES[SERIES.length - 1].slug])];
const SHAPE_CONT = Object.fromEntries(SHAPE_SEED_SLUGS.map((slug, i) => {
  const s = SERIES.find(x => x.slug === slug);
  const ep = Math.min(2, s.eps);
  const dur = epSecs(s.episodes[ep - 1][1]);
  return [slug, { ep, sec: Math.round(dur / 2), dur, ts: 1761000000000 - i * 60000 }];
}));
const SHAPE_SET = { autoplay: false, sound: false, subs: true, notify: true };
const SHAPE_SCRIPT = `try{
  localStorage.setItem('lakorn.cont',${JSON.stringify(JSON.stringify(SHAPE_CONT))});
  localStorage.setItem('lakorn.follows',${JSON.stringify(JSON.stringify(SHAPE_SEED_SLUGS))});
  localStorage.setItem('lakorn.set',${JSON.stringify(JSON.stringify(SHAPE_SET))});
}catch(e){}`;

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

/* ส่วน 6 เปิดเซิร์ฟเวอร์ตัวที่สองบนต้นไม้ชั่วคราว — ต้องถูกเก็บทุกทางออก รวมทางที่โยน exception
   (ถ้าหลุด จะเหลือ node ค้างถือพอร์ตแล้วการรันครั้งถัดไปแดงแบบสุ่ม — บทเรียน AIO-45) */
let wideServer = null, wideDir = null;
function cleanup(code) {
  try { server.kill('SIGTERM'); } catch {}
  try { if (wideServer) wideServer.kill('SIGTERM'); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  try { if (wideDir) fs.rmSync(wideDir, { recursive: true, force: true }); } catch {}
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
async function goAt(base, p) {
  await send('Page.navigate', { url: base + p });
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
  throw new Error('โหลดหน้าไม่เสร็จ: ' + base + p);
}
const go = p => goAt(BASE, p);

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
  const src = mode === 'seeded' ? SEED_SCRIPT : mode === 'shape' ? SHAPE_SCRIPT : UNSEED_SCRIPT;
  const r = await send('Page.addScriptToEvaluateOnNewDocument', { source: src });
  storageScript = r.identifier;
  storageMode = mode;
}
const MODE_LABEL = {
  new: 'ผู้ใช้ใหม่ (localStorage ว่าง)',
  seeded: `ผู้ใช้ที่กลับมา (ซีด lakorn.cont ${SEED_ENTRIES.length} เรื่อง)`,
  shape: `ผู้ใช้ที่กลับมา ${SHAPE_SEED_SLUGS.length} เรื่อง (รวมเรื่องท้ายคลัง = เรื่องแนวนอนในสถานะ ข) + ติดตามชุดเดียวกัน + ปิดเล่นอัตโนมัติ`,
};

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

/* ---------- 5.1.5 โพรบของส่วน 6 (ทรงของที่วาง) ----------
   วัด "กล่องที่ render จริง" เทียบกับ "ทรงที่กล่องนั้นประกาศ" และ "ไฟล์ที่เบราว์เซอร์โหลดจริง"
   `currentSrc` ไม่ใช่ `src`: กับ <picture> สองค่านี้ต่างกัน และค่าที่ตาเห็นคือ currentSrc */
const SHAPE_PREP = sel => `(async function () {
  var els = [].slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  /* รูป lazy ที่อยู่นอกจอไม่มีวัน complete ในกรอบจอเดียว ⇒ naturalWidth = 0 แล้ว S3/S4
     จะเทียบกับศูนย์และเขียวแบบไร้ความหมาย · บังคับโหลดเฉพาะรูปของที่วางที่กำลังวัด */
  var imgs = [];
  els.forEach(function (el) {
    var im = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (im) { im.loading = 'eager'; imgs.push(im); }
  });
  await Promise.all(imgs.map(function (im) {
    if (im.complete && im.naturalWidth) return null;
    return new Promise(function (r) { im.addEventListener('load', r); im.addEventListener('error', r); setTimeout(r, 4000); });
  }));
  await Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () { return null; }) : null; }));
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  return imgs.length;
})()`;

const SHAPE_PROBE = sel => `(function () {
  var els = [].slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  var cssVar = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  return {
    n: els.length,
    tokens: { poster: cssVar('--ar-poster'), reel: cssVar('--ar-reel'), cont: cssVar('--ar-cont'), stageH: cssVar('--ar-stage-h') },
    items: els.slice(0, 8).map(function (el) {
      var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      var im = el.tagName === 'IMG' ? el : el.querySelector('img');
      var pic = im && im.parentElement && im.parentElement.tagName === 'PICTURE' ? im.parentElement : null;
      var abs = function (u) { try { return new URL(u, location.href).pathname; } catch (e) { return u || ''; } };
      return {
        w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        ar: r.height > 0 ? +(r.width / r.height).toFixed(4) : null,
        /* ที่วางบางช่องถูกซ่อนด้วย media query โดยตั้งใจ (.lib-list ที่ >=720px สลับไป .lib-grid)
           กล่องที่ไม่ถูก render ไม่มีทรงให้วัด แต่ computed aspect-ratio ยังรายงานค่าเดิมอยู่
           ⇒ ถ้าไม่แยกออก ด่านจะฟ้อง 0x0 ว่าเป็นบั๊ก ซึ่งชี้ผิดทาง · ตัวนับอยู่ฝั่งผู้เรียก
           (ห้ามใช้ backtick ในคอมเมนต์ของบล็อกนี้ — มันปิด template literal ของฝั่ง node) */
        rendered: cs.display !== 'none' && el.getClientRects().length > 0,
        display: cs.display, cssAr: cs.aspectRatio, cssH: cs.height, cssW: cs.width,
        orientation: el.getAttribute('data-orientation')
          || (el.closest('[data-orientation]') ? el.closest('[data-orientation]').getAttribute('data-orientation') : null),
        img: im ? {
          attrW: im.getAttribute('width'), attrH: im.getAttribute('height'),
          natW: im.naturalWidth, natH: im.naturalHeight,
          path: abs(im.currentSrc || im.src), fit: getComputedStyle(im).objectFit,
          wrapDisplay: pic ? getComputedStyle(pic).display : null,
        } : null,
        /* <source> มีแอตทริบิวต์ width/height ของตัวเอง และเบราว์เซอร์ใช้ค่าของ "ตัวที่ถูกเลือก"
           ไม่ใช่ของ <img> ⇒ ด่านต้องเทียบขนาดกับตัวที่ประกาศจริง ไม่ใช่กับ <img> เสมอ */
        sources: pic ? [].slice.call(pic.querySelectorAll('source')).map(function (s) {
          return {
            media: s.getAttribute('media'), path: abs((s.getAttribute('srcset') || '').split(/\\s+/)[0]),
            attrW: s.getAttribute('width'), attrH: s.getAttribute('height'),
          };
        }) : null,
      };
    }),
  };
})()`;

/* ขับแอปให้การ์ด "ตอนถัดไป"/"จบเรื่อง" โผล่ — สูตรเดียวกับ tools/test-continue.mjs
   (กดปลายแถบเวลาแล้วกดเล่น ปล่อยให้เดินจนจบ) ไม่ใช่การเรียกฟังก์ชันภายในของแอป
   ซึ่งจะทำให้ด่านเขียวได้แม้เส้นทางที่ผู้ชมเดินจริงพัง */
const FINISH_SCRIPT = `(function(){
  var b = document.getElementById('barWrap'); if (!b) return 'ไม่พบ #barWrap';
  var r = b.getBoundingClientRect();
  b.dispatchEvent(new MouseEvent('click', { clientX: r.right - 1, clientY: r.top + 2, bubbles: true }));
  var p = document.getElementById('playBtn'); if (!p) return 'ไม่พบ #playBtn';
  p.click();
  return 'ok';
})()`;

/* ฟีด: เดินครบวงด้วย **ปุ่มของจริง** (ไม่เรียกฟังก์ชันภายในของแอป) แล้วรายงานทุก slug ที่
   ผ่านตา · ทิศที่กล่องประกาศในแต่ละก้าว · ตัวนับที่หน้าแสดง · และกล่องสื่อที่วัดได้ (กฎ V17)
   เดิน `n` ครั้งจากจุดเริ่ม ⇒ ได้ n+1 รายการ: n รายการแรกต้องไม่ซ้ำและครบคลัง
   รายการที่ n+1 ต้องวนกลับมาเท่ารายการแรก (พิสูจน์ว่าวงปิดพอดี ไม่ใช่ลิสต์สั้นกว่าคลัง) */
const FEED_WALK = n => `(async function () {
  var box = document.getElementById('feedPlayer');
  if (!box) return { empty: true, text: (document.querySelector('#main') || {}).textContent || '' };
  var next = document.getElementById('feedNext');
  var step = function () {
    var im = box.querySelector('img');
    var r = im ? im.getBoundingClientRect() : box.getBoundingClientRect();
    var cs = getComputedStyle(box);
    return {
      slug: box.dataset.slug, orientation: box.dataset.orientation,
      pos: (document.getElementById('feedPos') || {}).textContent || '',
      /* "กล่องสื่อ" ตามคำตอบของ UX (AIO-59 §10.1) = .mwin > .clip ของกรอบแนวนอน
         วัดตัวนั้นถ้ามี · ถ้าไม่มี (วันนี้ยังไม่มี เพราะแบบรอลูกค้าอนุมัติ) รายงาน null
         แล้วให้ฝั่ง node ตัดสินตามกฎ "ไม่เจอ = ตก" ของ UX — ที่นี่ไม่ตัดสินแทน
         box* ข้างล่างคือรูปที่เต็มกล่อง .player.full = สภาพของวันนี้ เก็บไว้รายงานของจริง
         (ห้ามใช้ backtick ในคอมเมนต์ของบล็อกนี้ — มันปิด template literal ของฝั่ง node) */
      clip: (function () {
        var c = document.querySelector(${JSON.stringify(FEED_CLIP_SEL)});
        if (!c) return null;
        var cr = c.getBoundingClientRect();
        return {
          ar: cr.height > 0 ? +(cr.width / cr.height).toFixed(4) : null,
          w: Math.round(cr.width), h: Math.round(cr.height),
          declaredAr: getComputedStyle(c).aspectRatio,
        };
      })(),
      boxAr: r.height > 0 ? +(r.width / r.height).toFixed(4) : null,
      boxW: Math.round(r.width), boxH: Math.round(r.height),
      declaredAr: cs.aspectRatio,
      file: im ? (im.currentSrc || im.src).split('/').slice(-2).join('/') : null,
    };
  };
  var steps = [step()];
  for (var i = 0; i < ${n}; i++) {
    next.click();
    await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    steps.push(step());
  }
  return { empty: false, steps: steps };
})()`;

/* ---------- 5.1.6 ต้นไม้ชั่วคราว "สถานะมีภาพกว้างจริง" ----------
   ทำไมต้องเป็นสำเนาใน /tmp ไม่ใช่แก้รีโปแล้วคืน: workspace นี้แชร์กับ run อื่นที่ขยับ HEAD
   ได้กลางงาน ⇒ ถ้าด่านแก้ `content.json` แล้วตายกลางทาง สถานะ fixture จะติดไปกับ commit
   ของคนอื่น · สำเนาตัดโฟลเดอร์ design/ ออก (81 MB ส่วนใหญ่เป็นภาพ) แล้วใส่คืนเฉพาะสามอย่าง
   ที่ build/build.mjs อ่าน: tokens.css · v2.css · fonts/ */
function copyTree(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip(e.name)) continue;
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) copyTree(a, b, skip);
    else if (e.isFile()) fs.copyFileSync(a, b);
  }
}

/* ไฟล์ fixture ขนาด 2640×1200 ให้ chrome เป็นคนเข้ารหัสผ่าน canvas.toDataURL('image/webp')
   — เครื่องนี้ไม่มีเครื่องมือทำภาพ และด่านต้องเขียวได้บน checkout สะอาด จึงไม่ยืมไฟล์ของ
   AIO-56 ที่อยู่ใน design/v2/wide-out/ (ของ Visual · ยังไม่ผ่านการอนุมัติ · และ untracked) */
async function makeWideFixture(w, h) {
  const b64 = await evaluate(`(function(){
    var c = document.createElement('canvas'); c.width = ${w}; c.height = ${h};
    var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, ${w}, ${h});
    gr.addColorStop(0, '#2a2733'); gr.addColorStop(1, '#f5c451');
    g.fillStyle = gr; g.fillRect(0, 0, ${w}, ${h});
    g.fillStyle = '#09080c'; g.fillRect(${Math.round(w * 0.4)}, ${Math.round(h * 0.3)}, ${Math.round(w * 0.2)}, ${Math.round(h * 0.4)});
    var u = c.toDataURL('image/webp', 0.7);
    return u.indexOf('data:image/webp') === 0 ? u.split(',')[1] : null;
  })()`);
  if (!b64) throw new Error('chrome เข้ารหัส image/webp ไม่ได้ — ด่านสถานะ "มีภาพกว้าง" สร้าง fixture ไม่ได้');
  return Buffer.from(b64, 'base64');
}

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

  /* ===== ส่วน 6 · ทรงของทุกที่วาง × ทุกขนาดจอ × สองสถานะ (AIO-57 · ADR-001 §13) ===== */
  if (ONLY === '' || ONLY === 'shape') {
    /* --- ตัวช่วยอ่าน "ทรงที่ประกาศ" และ "ไฟล์ที่ควรได้" --- */
    const parseAr = v => {
      if (!v || v === 'auto') return null;
      const p = String(v).split('/').map(x => parseFloat(x));
      if (p.length === 2 && p[0] > 0 && p[1] > 0) return p[0] / p[1];
      if (p.length === 1 && p[0] > 0) return p[0];
      return null;
    };
    const COVER_RE = /^\/assets\/covers(-wide)?\/([a-z0-9][a-z0-9._-]*)\.(webp|png|jpg|jpeg)$/;
    const slugOf = p => { const m = COVER_RE.exec(String(p || '')); return m ? m[2] : null; };
    /* ไฟล์ที่ทรงนั้น "ควรได้" — กฎเดียวกับ build/seo.mjs coverSlot() และ build/app.src.js
       คิดจากข้อมูลของ build ที่กำลังวัด ไม่ใช่รายชื่อเรื่องที่เขียนไว้ในด่าน */
    const wantPath = (slug, shape, by) => {
      const s = by[slug];
      if (!s) return null;
      const wide = shape === 'wide' || (shape === 'auto' && s.orientation === 'horizontal');
      return wide && s.coverWide ? s.coverWide : (s.cover || `assets/covers/${slug}.webp`);
    };
    const byOf = ser => Object.fromEntries(ser.map(s => [s.slug, s]));

    /* --- สถานะ ก) รีโปตามสภาพ · สถานะ ข) ต้นไม้ชั่วคราวที่มีภาพกว้างครบ + เรื่องแนวนอน 1 เรื่อง --- */
    const states = [{
      label: 'ก · ถอยกลับ (ไม่มีไฟล์ภาพกว้างเลย)',
      base: BASE, root: ROOT, by: byOf(SERIES),
    }];

    wideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-wide-'));
    {
      const keepDesign = ['tokens.css', 'v2.css', 'fonts'];
      copyTree(ROOT, wideDir, n => n === '.git' || n === 'node_modules' || n === 'design');
      for (const f of keepDesign) {
        const a = path.join(ROOT, 'design/v2', f), b = path.join(wideDir, 'design/v2', f);
        if (fs.statSync(a).isDirectory()) copyTree(a, b, () => false);
        else { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
      }
      const fixture = await makeWideFixture(COVER_WIDE_W, COVER_WIDE_H);
      check(`fixture ภาพกว้างที่ด่านสร้างเองผ่านกฎ V15 (${COVER_WIDE_W}×${COVER_WIDE_H} · ${Math.round(fixture.length / 1024)} KB)`,
        fixture.length <= 300 * 1024, `${fixture.length} ไบต์ — เพดานสัญญา 300 KB`);
      fs.mkdirSync(path.join(wideDir, SHAPE_WIDE_DIR), { recursive: true });
      const cj = JSON.parse(fs.readFileSync(path.join(wideDir, 'content.json'), 'utf8'));
      for (const s of cj.series) {
        fs.writeFileSync(path.join(wideDir, SHAPE_WIDE_DIR, `${s.slug}.webp`), fixture);
        s.coverWide = `${SHAPE_WIDE_DIR}/${s.slug}.webp`;
      }
      /* เรื่องสุดท้ายเป็นแนวนอน — ต้องไม่ใช่เรื่องที่ฮีโร่หรือฟีดหยิบเป็นใบแรก ไม่งั้นจะวัด
         "ฟีดตัดเรื่องออก" กับ "ฮีโร่เลือกไฟล์" ปนกัน · เลือกตัวท้ายของคลังด้วยเหตุนี้ */
      cj.series[cj.series.length - 1].orientation = 'horizontal';
      fs.writeFileSync(path.join(wideDir, 'content.json'), JSON.stringify(cj, null, 2) + '\n');
      const rb = spawnSync('node', ['build/build.mjs'], { cwd: wideDir, encoding: 'utf8' });
      check('build ต้นไม้ชั่วคราว "มีภาพกว้าง + เรื่องแนวนอน 1 เรื่อง" ผ่าน (กฎ V14–V16 ไม่ล้ม)',
        rb.status === 0, (rb.stderr || rb.stdout || '').slice(-600));
      if (rb.status === 0) {
        const widePort = await freePort('LAY_PORT_WIDE');
        wideServer = spawn(process.execPath, [path.join(wideDir, 'tools/serve.mjs'), String(widePort)], { stdio: 'ignore' });
        const wideBase = `http://127.0.0.1:${widePort}`;
        for (let i = 0; i < 80; i++) {
          try { const r = await fetch(wideBase + '/'); if (r.ok) break; } catch { /* ยังไม่ขึ้น */ }
          await sleep(100);
        }
        states.push({
          label: `ข · มีภาพกว้างครบ ${cj.series.length} เรื่อง + แนวนอน 1 เรื่อง (${cj.series[cj.series.length - 1].slug})`,
          base: wideBase, root: wideDir,
          by: byOf(cj.series.map(s => ({ slug: s.slug, cover: s.cover, coverWide: s.coverWide, orientation: s.orientation }))),
        });
      }
    }

    for (const st of states) {
      const verticals = Object.values(st.by).filter(s => s.orientation === 'vertical');
      const horizontals = Object.values(st.by).filter(s => s.orientation === 'horizontal');
      console.log(`\nส่วน 6${st === states[0] ? 'ก' : 'ข'} · ทรงของ ${SHAPE_MAP.length} ที่วาง × ${FOLD_VIEWPORTS.length} ขนาดจอ`
        + ` · สถานะ: ${st.label}`);
      console.log(`    คลังของสถานะนี้: แนวตั้ง ${verticals.length} · แนวนอน ${horizontals.length}`
        + ` · ประกาศ coverWide ${Object.values(st.by).filter(s => s.coverWide).length}`);
      let undeclared = 0;

      for (const pl of SHAPE_MAP) {
        /* ที่วางที่ผูกกับ "ต้องมีเรื่องแนวนอนอยู่ในคลัง" ข้ามได้เฉพาะเมื่อคลังนั้นไม่มีจริง
           และการข้ามต้องถูกยืนยันด้วย check ไม่ใช่ `continue` เงียบ ๆ — ไม่งั้นวันที่
           `atFor` คืน null เพราะบั๊ก ด่านจะเขียวทั้งที่ไม่ได้วัดอะไรเลย */
        const at = pl.atFor ? pl.atFor(st) : pl.at;
        if (!at) {
          check(`${pl.key} (${pl.sel}) · ข้ามได้เพราะคลังของสถานะนี้ไม่มีเรื่อง${pl.needs === 'horizontal' ? 'แนวนอน' : 'ที่ต้องการ'}เลย`,
            pl.needs === 'horizontal' && horizontals.length === 0,
            `needs=${pl.needs} · แนวนอนในคลัง ${horizontals.length} เรื่อง — atFor คืน null ทั้งที่ควรหาเจอ`);
          continue;
        }
        await setStorageMode(pl.mode || 'new');
        const bad = { box: [], inline: [], file: [], attr: [], nat: [], none: [], empty: [] };
        let seen = 0, hiddenAt = [], declaredSome = false;
        for (const vp of FOLD_VIEWPORTS) {
          await viewport(vp);
          await goAt(st.base, at);             /* นำทางใหม่ทุกขนาดจอ: ที่วางบางช่องมาจาก JS */
          if (pl.drive === 'finish') {
            const r = await evaluate(FINISH_SCRIPT);
            if (r !== 'ok') { bad.empty.push(`${vp.w}: ${r}`); continue; }
            await sleep(1600);
          }
          await evaluate(SHAPE_PREP(pl.sel));
          const res = await evaluate(SHAPE_PROBE(pl.sel));
          const vpAt = `${vp.w}×${vp.h}`;
          if (!res.n) { bad.empty.push(vpAt); continue; }
          if (res.items.every(it => !it.rendered)) { hiddenAt.push(vpAt); continue; }
          seen += res.items.filter(it => it.rendered).length;
          /* ทรงที่ "ที่วางนี้" ขอ · ฮีโร่เป็นที่วางเดียวที่ขอสองทรงในที่เดียว ⇒ ทรงที่คาดหวัง
             เปลี่ยนตามขนาดจอตามเบรกพอยต์ของจริง (ADR-001 §13.6) ไม่ใช่ค่าเดียวทุกจอ */
          const shape = pl.wideAtBp && vp.w >= HERO_WIDE_BP ? 'wide' : pl.shape;
          for (const it of res.items) {
            if (!it.rendered) continue;
            /* S1a · ตระกูลบั๊ก AIO-37: ชั้นกลางที่เป็น inline ทำให้ height/aspect-ratio ถูกเมิน
               ขณะที่ computed style ยังรายงานค่าเดิม ⇒ มองเห็นได้ทางเดียวคือเทียบกล่องจริง */
            if (it.display === 'inline') bad.inline.push(`${vpAt} display:inline`);
            /* S1b · กล่องจริงต้องตรงกับ "สัดส่วนที่ประกาศ" ±2%
               ความซื่อสัตย์ของเกณฑ์: "ทรง" คือ aspect-ratio เท่านั้น · ความสูงเป็น px เพียว ๆ
               ไม่ใช่การประกาศทรง และเทียบกับกล่องจริงแล้วจะจริงเสมอสำหรับกล่อง block
               (computed height = used value) ⇒ ถ้านับเป็น ✓ จะได้ความมั่นใจปลอม
               ช่องที่ไม่ประกาศสัดส่วนเลยจึงเข้าถัง `none` แล้วถูกคุมด้วย SHAPE_MAX_UNDECLARED
               ส่วนบั๊กของช่องที่ตั้งความสูงไว้แต่ค่าไม่ถูกใช้ ถูกจับที่ S1a (display:inline)
               ซึ่งเป็นสาเหตุเดียวที่เคยเกิดจริงในรีโปนี้ (AIO-37 · AIO-38 F3) */
            const dAr = parseAr(it.cssAr);
            if (dAr) {
              declaredSome = true;
              if (it.ar == null || Math.abs(it.ar - dAr) > SHAPE_TOL * dAr) {
                bad.box.push(`${vpAt} ประกาศ ${it.cssAr}=${dAr.toFixed(3)} แต่กล่องจริง ${it.w}×${it.h}=${it.ar}`);
              }
            } else {
              bad.none.push(`${vpAt} ${it.w}×${it.h}=${it.ar} (cssH=${it.cssH})`);
            }
            if (!it.img) { bad.empty.push(`${vpAt} ไม่มี <img> ในกล่อง`); continue; }
            /* S2 · ไฟล์ที่เบราว์เซอร์โหลดจริง = ไฟล์ที่ทรงนี้ควรได้ */
            const slug = slugOf(it.img.path);
            const want = slug ? wantPath(slug, shape, st.by) : null;
            if (!want) { bad.file.push(`${vpAt} path ที่โหลด "${it.img.path}" แมปกลับเป็นเรื่องในคลังไม่ได้`); continue; }
            if (it.img.path !== '/' + want.replace(/^\//, '')) {
              bad.file.push(`${vpAt} ทรง '${shape}' ควรได้ /${want} แต่โหลด ${it.img.path}`);
            }
            /* S3/S4 · ขนาดที่ประกาศต้องตรงกับขนาดไฟล์ "ที่โหลดจริง" บนดิสก์ — ไม่มีเลขในด่าน
               เทียบกับไฟล์ที่โหลด ไม่ใช่ไฟล์ที่ควรโหลด เพื่อให้ S3 ไม่พลอยแดงตาม S2
               และผู้ประกาศขนาดคือ <source> ที่ถูกเลือก ถ้ามี ไม่ใช่ <img> เสมอ */
            const decl = (it.sources || []).find(x => x.path === it.img.path) || it.img;
            const dim = imageSize(path.join(st.root, it.img.path.replace(/^\//, '')));
            if (!dim) { bad.attr.push(`${vpAt} อ่านขนาด ${it.img.path} จากดิสก์ไม่ออก`); continue; }
            if (+decl.attrW !== dim.w || +decl.attrH !== dim.h) {
              bad.attr.push(`${vpAt} ประกาศ width="${decl.attrW}" height="${decl.attrH}" `
                + `แต่ไฟล์จริง ${dim.w}×${dim.h} (${it.img.path})`);
            }
            if (it.img.natW !== dim.w || it.img.natH !== dim.h) {
              bad.nat.push(`${vpAt} natural ${it.img.natW}×${it.img.natH} vs ไฟล์ ${dim.w}×${dim.h}`);
            }
            /* S6 · กล่องเพลเยอร์มาจาก orientation ของเรื่องที่ขึ้นจริง ไม่ใช่โทเคนตายตัว */
            if (pl.player && dAr) {
              const o = it.orientation;
              const tok = o === 'horizontal' ? res.tokens.stageH : res.tokens.reel;
              const wantAr = parseAr(tok);
              if (!wantAr) {
                bad.box.push(`${vpAt} ไม่มีโทเคนสัดส่วนสำหรับ orientation=${o}`);
              } else if (Math.abs(dAr - wantAr) > SHAPE_TOL * wantAr) {
                bad.box.push(`${vpAt} orientation=${o} ควรได้ ${tok}=${wantAr.toFixed(3)} แต่กล่องประกาศ ${it.cssAr}`);
              }
            }
          }
        }
        const atp = `${pl.key} (${pl.sel} @ ${at})`;
        /* ซ่อนทุกขนาดจอ = ด่านมองไม่เห็นที่วางนี้โดยโครงสร้าง ⇒ ต้องแดง ไม่ใช่ข้ามเงียบ ๆ
           (รูนี้เปิดจริงใน AIO-38 F3: ด่าน 232,570 element ไม่เห็น `.cont .thumb` เลย) */
        check(`${atp} · มีตัวตนให้วัด (${seen} กล่อง`
          + `${hiddenAt.length ? ` · ซ่อนตามแบบที่ ${hiddenAt.join(',')}` : ''})`,
          bad.empty.length === 0 && seen > 0,
          bad.empty.slice(0, 4).join(' · ') || 'ไม่พบ element ที่ selector นี้ที่ขนาดจอใดเลย — '
            + 'ที่วางย้ายที่ หรือสภาพ localStorage ไม่ถูก');
        check(`${atp} · ไม่มีกล่องที่ display:inline (ตระกูลบั๊ก AIO-37)`,
          bad.inline.length === 0, bad.inline.slice(0, 3).join(' · '));
        check(`${atp} · กล่องจริงตรงกับทรงที่ประกาศ ±${SHAPE_TOL * 100}%`,
          bad.box.length === 0, bad.box.slice(0, 4).join(' · '));
        check(`${atp} · ไฟล์ที่โหลดคือไฟล์ของทรง '${pl.shape}'`,
          bad.file.length === 0, bad.file.slice(0, 4).join(' · '));
        check(`${atp} · <img width/height> = ขนาดไฟล์จริงบนดิสก์ (กฎ V15/V18)`,
          bad.attr.length === 0, bad.attr.slice(0, 4).join(' · '));
        check(`${atp} · ไบต์ที่โหลดมีขนาดตามที่ประกาศ (naturalWidth/Height)`,
          bad.nat.length === 0, bad.nat.slice(0, 4).join(' · '));
        if (bad.none.length) {
          console.log(`  ℹ ${atp} · กล่องไม่ประกาศสัดส่วนที่ ${bad.none.length} เคส ⇒ S1 เทียบไม่ได้ `
            + `(ของจริงที่วัดได้: ${bad.none.slice(0, 2).join(' · ')})`);
        }
        /* ข้อนี้คือบั๊ก AIO-53 ตรง ๆ: ไทล์ "เลือกตามแนว" ไม่ได้ประกาศ 2:3 ไว้เลย จึงแบนตามจอ
           และเพราะมันไม่ประกาศ ด่านที่เทียบ "ประกาศ vs ของจริง" ก็ไม่มีอะไรให้เทียบ
           ⇒ ที่วางทุกช่องต้องประกาศสัดส่วนที่อย่างน้อยหนึ่งขนาดจอ เว้นช่องที่ประกาศข้อยกเว้น
           ไว้ในแผนที่พร้อมเหตุผล (วันนี้สองช่อง: แถบรีล และเพลเยอร์ฟีดที่ตั้งใจเต็มจอ) */
        if (!declaredSome) undeclared++;
        check(`${atp} · ประกาศสัดส่วนไว้อย่างน้อยหนึ่งขนาดจอ${pl.declared === false ? ' (หรือเป็นข้อยกเว้นที่ประกาศไว้)' : ''}`,
          declaredSome || pl.declared === false,
          'ไม่มี aspect-ratio ที่ขนาดจอใดเลย — นี่คืออาการของบั๊ก AIO-53 (ไทล์แบนตามจอ) · '
          + 'แก้ CSS ให้ประกาศทรง หรือถ้าช่องนี้ไม่มีทรงจริง ใส่ declared:false ใน SHAPE_MAP พร้อมเหตุผล');
      }
      check(`ช่องที่ไม่ประกาศสัดส่วนเลย ไม่เกิน ${SHAPE_MAX_UNDECLARED} ช่อง (เจอ ${undeclared})`,
        undeclared <= SHAPE_MAX_UNDECLARED,
        'ยามกันการย้ายที่วางเข้าช่อง declared:false เพื่อให้ด่านเงียบ แทนที่จะแก้ของ');

      /* --- S5 · ฮีโร่: เบราว์เซอร์ต้องเลือกไฟล์ตามเบรกพอยต์ของจริง ไม่ใช่ตามสตริงที่เขียนไว้ --- */
      await setStorageMode('new');
      for (const w of [HERO_WIDE_BP - 1, HERO_WIDE_BP]) {
        await viewport({ w, h: 900 });
        await goAt(st.base, U.home);
        await evaluate(SHAPE_PREP('.hero .bg'));
        const r = await evaluate(SHAPE_PROBE('.hero .bg'));
        const it = (r.items || [])[0];
        if (!it || !it.img) { check(`ฮีโร่ @${w}px · วัดได้`, false, 'ไม่พบ .hero .bg img'); continue; }
        const slug = slugOf(it.img.path);
        const s = slug ? st.by[slug] : null;
        const wide = w >= HERO_WIDE_BP && s && s.coverWide;
        const want = '/' + (wide ? s.coverWide : (s ? s.cover : '')).replace(/^\//, '');
        check(`ฮีโร่ @${w}px · เบราว์เซอร์เลือก${wide ? 'ไฟล์กว้าง' : 'ปก 2:3'} (${want})`,
          it.img.path === want,
          `โหลด ${it.img.path} · <source> = ${(it.sources || []).map(x => `${x.media}→${x.path}`).join(' ') || 'ไม่มี'}`);
        /* ไม่มีภาพกว้าง ⇒ ต้องไม่มี <picture>/<source> เลย ไม่ใช่ <picture> ที่ว่าง:
           สัญญา §13.6 บอกว่าผลลัพธ์ต้องเป็น "HTML เดิมเป๊ะ" ไม่ใช่ HTML ที่คล้ายเดิม */
        const hasWideFile = Object.values(st.by).some(x => x.coverWide);
        check(`ฮีโร่ @${w}px · ${hasWideFile ? 'มี <source media> พร้อม <picture> ที่เป็น block' : 'ไม่มี <picture> เลย (ถอยกลับเป็น HTML เดิม)'}`,
          hasWideFile
            ? (it.sources || []).length === 1 && it.sources[0].media === `(min-width:${HERO_WIDE_BP}px)` && it.img.wrapDisplay === 'block'
            : it.sources === null,
          `sources=${JSON.stringify(it.sources)} · picture display=${it.img.wrapDisplay}`);
      }

      /* --- กฎ V17 (กลับขั้วแล้วโดยมติลูกค้า 25 ต.ค. 2026 · AIO-58) ---
         ล้มเมื่อฟีด **ขาด** เรื่อง ไม่ใช่เมื่อฟีดมีเรื่องแนวนอน
         วัดด้วย mobile emulation จริง (`viewport()` ตั้ง mobile:true เมื่อกว้าง <720px) —
         ไม่งั้นสกรอลล์บาร์เดสก์ท็อปกิน 15px แล้วเลขไม่ตรงกับที่ลูกค้าวัดเอง */
      const allSlugs = Object.keys(st.by);
      const feedHtml = await (await fetch(st.base + U.feed)).text();
      /* ข (ครึ่งแรก) · ตัวนับใน HTML ที่ส่งออกต้องเป็นจำนวนเรื่อง **ทั้งคลัง** */
      check(`V17 ข · /feed/ HTML ที่ส่งออกบอก "เรื่องที่ 1 จาก ${allSlugs.length}" (= series.length)`,
        new RegExp(`เรื่องที่ 1 จาก ${allSlugs.length}(?![0-9])`).test(feedHtml),
        (/เรื่องที่ 1 จาก [0-9]+/.exec(feedHtml) || ['ไม่พบตัวนับในหน้า'])[0]);
      /* เรื่องแรกที่ฟีดเปิดต้องเป็น TOP10[0] ตรง ๆ ไม่ว่าทิศไหน — การดันเรื่องแนวนอนไปท้าย
         คือตัวกรองที่ปลอมตัวมา · ด่านจึงตรวจว่า HTML ไม่ได้เลือกเรื่องแรกด้วยทิศ */
      const firstSlug = (/id="feedPlayer" data-slug="([^"]+)"/.exec(feedHtml) || [])[1];
      check(`V17 ก · /feed/ เรื่องแรกไม่ได้ถูกเลือกด้วยทิศ (${firstSlug} · ${firstSlug && st.by[firstSlug] ? st.by[firstSlug].orientation : '?'})`,
        !!(firstSlug && st.by[firstSlug]) && firstSlug === TOP10[0].slug,
        `ควรเป็น ${TOP10[0].slug} (TOP10[0]) แต่ได้ ${firstSlug} — ถ้าต่างกันเพราะทิศ นี่คือตัวกรองที่ปลอมตัวมา`);

      await viewport(MOBILE);
      await goAt(st.base, U.feed);
      const walk = await evaluate(FEED_WALK(allSlugs.length));
      if (walk.empty) {
        check('V17 · /feed/ มีเพลเยอร์ให้วัด', false, 'ไม่พบ #feedPlayer — ฟีดว่างทั้งที่คลังไม่ว่าง');
      } else {
        const cycle = walk.steps.slice(0, allSlugs.length);
        const seen = cycle.map(x => x.slug);
        const missing = allSlugs.filter(k => !seen.includes(k));
        const dup = seen.filter((k, i) => seen.indexOf(k) !== i);
        /* ก (ครบ) · เซตที่เลื่อนผ่านต้องเท่ากับเซต slug ทั้งหมดใน content.json */
        check(`V17 ก · กด #feedNext ครบ ${allSlugs.length} ครั้ง เจอทุกเรื่องในคลังไม่ขาดไม่ซ้ำ`,
          missing.length === 0 && dup.length === 0,
          `ขาด: ${missing.join(' ') || '-'} · ซ้ำก่อนครบรอบ: ${[...new Set(dup)].join(' ') || '-'}`
          + ` — ขาดหรือซ้ำ = มีตัวกรองทิศหรือลิสต์สั้นกว่าคลัง`);
        check(`V17 ก · วงปิดพอดี (ก้าวที่ ${allSlugs.length + 1} วนกลับมาที่ ${seen[0]})`,
          walk.steps[allSlugs.length].slug === seen[0],
          `ได้ ${walk.steps[allSlugs.length].slug}`);
        /* ข (ครึ่งหลัง) · ตัวนับฝั่งเบราว์เซอร์ต้องได้ N เดียวกันทุกก้าว */
        const badPos = walk.steps.filter(x => !new RegExp(`จาก ${allSlugs.length}$`).test(x.pos.trim()));
        check(`V17 ข · #feedPos บอก N = ${allSlugs.length} เหมือนฝั่ง build ทุกก้าวที่สลับเรื่อง`,
          badPos.length === 0, badPos.slice(0, 3).map(x => `${x.slug}: "${x.pos}"`).join(' · '));
        /* ค (ทรงตรงกับทิศ) · ครึ่งข้อมูล: ค่าทิศบนกล่องต้องตรงกับ orientation ของ slug ทุกก้าว
           นี่คือรอยที่ D8 ฉบับแรกปิดบังไว้ — ตอนฟีดมีแต่แนวตั้ง กล่องไม่เคยต้องเปลี่ยนรูป */
        const badOrient = walk.steps.filter(x => !st.by[x.slug] || x.orientation !== st.by[x.slug].orientation);
        check(`V17 ค · ทิศบน #feedPlayer ตรงกับ orientation ของ data-slug ทุกก้าว (${walk.steps.length} ก้าว)`,
          badOrient.length === 0,
          badPos.length === 0 && badOrient.length
            ? badOrient.slice(0, 3).map(x => `${x.slug}: กล่องบอก ${x.orientation} แต่ข้อมูลบอก ${st.by[x.slug] && st.by[x.slug].orientation}`).join(' · ')
            : '');
        /* §13.5 แถว "ภาพในเพลเยอร์ฟีดตอนเลื่อนเรื่อง" · ทรง `auto` ต้องถูกเลือกใหม่ **ทุกครั้ง
           ที่สลับเรื่อง** ไม่ใช่ครั้งเดียวตอน build — ไม่งั้นเรื่องเดียวกันได้ไฟล์คนละใบระหว่าง
           "เปิดหน้ามาเจอ" กับ "ปัดมาเจอ" · เทียบสองส่วนท้ายของพาธเพราะโพรบคืนมาแค่นั้น */
        const badFile = walk.steps.filter(x => {
          const want = wantPath(x.slug, 'auto', st.by);
          return !want || x.file !== want.split('/').slice(-2).join('/');
        });
        check(`V17 · ภาพในเพลเยอร์ฟีดได้ไฟล์ของทรง 'auto' ทุกก้าวที่สลับเรื่อง`,
          badFile.length === 0,
          badFile.slice(0, 3).map(x => `${x.slug} (${st.by[x.slug] && st.by[x.slug].orientation}): `
            + `โหลด ${x.file} แต่ควรได้ ${(wantPath(x.slug, 'auto', st.by) || '?').split('/').slice(-2).join('/')}`).join(' · '));
        /* ค (ครึ่งทรง) · เมื่อทิศเป็น horizontal กล่องสื่อต้องวัดได้ 16/9 ±2%
           ⚠️ อิลิเมนต์ที่เป็น "กล่องสื่อ" และกฎกรอบของมันเป็นของ AIO-59 ซึ่งยังไม่ลงมา
              จึงยังบังคับข้อนี้ไม่ได้ — แต่ **ไม่ซ่อน**: พิมพ์ของจริงที่วัดได้ทุกรอบ และผูกไว้กับ
              ค่าคงที่ที่ต้องมีคนมาพลิกด้วยมือ ⇒ วันที่ AIO-59 ลง ให้ตั้งเป็น false แล้วข้อนี้
              กลายเป็นด่านจริงทันทีโดยไม่ต้องเขียนโค้ดเพิ่ม (ADR-001 §13.10 ข้อ 7) */
        const horiz = walk.steps.filter(x => x.orientation === 'horizontal');
        if (horiz.length) {
          const lo = FEED_BOX_AR * (1 - SHAPE_TOL), hi = FEED_BOX_AR * (1 + SHAPE_TOL);
          /* กฎของ UX (AIO-59 §10.1): **ไม่เจอ `.clip` = ตก** ไม่ใช่ "ไม่เจอ = ข้าม"
             ไม่งั้นวันที่ลืมสร้างสองชั้น ด่านจะเขียวทั้งที่หน้าพัง — เขียนตามที่เขาสั่ง */
          const noClip = horiz.filter(x => !x.clip);
          const off = horiz.filter(x => x.clip && (x.clip.ar == null || x.clip.ar < lo || x.clip.ar > hi));
          console.log(`  ℹ V17 ค (ครึ่งทรง) · เรื่องแนวนอน ${horiz.length} ก้าว · `
            + `กล่องสื่อตามกฎ AIO-59 "${FEED_CLIP_SEL}" ${noClip.length ? `ยังไม่มีในเว็บจริง ${noClip.length}/${horiz.length} ก้าว` : 'เจอครบ'}`
            + ` · สภาพวันนี้: ` + horiz.slice(0, 2).map(x => `${x.slug} กรอบ ${x.boxW}×${x.boxH}=${x.boxAr}`
              + (x.clip ? ` · .clip ${x.clip.w}×${x.clip.h}=${x.clip.ar}` : ' · ไม่มี .clip')
              + ` · ไฟล์ ${x.file}`).join(' · ')
            + ` · ต้องได้ ${FEED_BOX_AR.toFixed(4)} ±${SHAPE_TOL * 100}%`);
          check(`V17 ค (ครึ่งทรง) · เรื่องแนวนอนมีกล่องสื่อ "${FEED_CLIP_SEL}" และได้ `
            + `${FEED_BOX_AR.toFixed(3)} ±${SHAPE_TOL * 100}%`
            + `${V17C_BOX_PENDING_AIO59 ? ' — ยังไม่บังคับ: แบบของ AIO-59 รอลูกค้าอนุมัติ' : ''}`,
            (noClip.length === 0 && off.length === 0) || V17C_BOX_PENDING_AIO59,
            (noClip.length ? `ไม่มี .clip ที่: ${noClip.map(x => x.slug).join(' ')} · ` : '')
            + (off.length ? `สัดส่วนเพี้ยน: ${off.map(x => `${x.slug}=${x.clip.ar}`).join(' ')} · ` : '')
            + 'เมื่อลูกค้าอนุมัติแบบ AIO-59: สร้าง .mwin/.clip ที่ buildFeed() + ย้าย CSS ของ UX เข้า '
            + 'แล้วตั้ง V17C_BOX_PENDING_AIO59 = false');
        }
      }
      /* แถบรีล: 3 slug ต้องมีจริงในคลัง และ **ห้ามถูกเลือกด้วยทิศ** (D8 ฉบับกลับทาง)
         เหตุผลเดิม ("ตัวอย่างห้ามโฆษณาเรื่องที่คลิกเข้าไปแล้วไม่เจอ") ตายไปกับ D8 ฉบับแรก */
      await viewport(FOLD_VIEWPORTS[1]);
      await goAt(st.base, U.home);
      await evaluate(SHAPE_PREP('.btile .reelstrip span'));
      const reel = await evaluate(SHAPE_PROBE('.btile .reelstrip span'));
      const reelSlugs = (reel.items || []).map(x => slugOf(x.img && x.img.path));
      check(`แถบรีลในไทล์ฟีด · ทั้ง ${reelSlugs.length} ใบเป็นเรื่องที่มีจริงในคลัง (${reelSlugs.join(',')})`,
        reelSlugs.length === 3 && reelSlugs.every(k => k && st.by[k]),
        reelSlugs.filter(k => !k || !st.by[k]).join(' ') || 'จำนวนไม่ครบ 3 ใบ');
    }
    await setStorageMode('new');
  }

  console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
  cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  if (process.env.LAY_STACK) console.error(e.stack);
  cleanup(1);
}
