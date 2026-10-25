/* ============================================================================
   AIO-59 · ด่านตรวจกฎการวางฟีดเมื่อเรื่องเป็นวิดีโอแนวนอน
   UX-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/check-aio59.mjs

   ด่านนี้ตรวจ "กฎ" ไม่ใช่ "ความสวย" — ทุกข้อวัดจากเว็บจริงที่เสิร์ฟในเครื่อง × 7 ขนาดจอ
   โดยแพตช์หน้าฟีดให้เป็นเรื่องแนวนอนด้วยวิธีเดียวกับตัววัดและตัวถ่ายภาพ (design/v2/aio59-lib.mjs)

   เส้นแบ่ง: ด่านนี้ไม่รัน build/build.mjs และไม่เขียนอะไรนอก design/v2/
   ⇒ รันพร้อมกับ run อื่นที่กำลังแก้ build/ ได้โดยไม่ชนกัน
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './lib.mjs';
import {
  VIEWPORTS, MEASURE, POSTER_SRC, WIDE_SRC,
  serveRepo, openChrome, patchScript, readProposalCss,
} from './aio59-lib.mjs';

const CSS_FILE = path.join(DIR, 'aio59-feed-wide.css');
const DOC = path.join(DIR, 'AIO-59-FEED-ORIENTATION.md');
const JSON_OUT = path.join(DIR, 'aio59-measured.json');
const SHOTS = path.join(DIR, 'shots');
const SHOTS_JPEG = path.join(DIR, 'shots-jpeg');

/* ภาพที่ลูกค้าต้องได้ดู — สี่ใบแรกคือชุดขั้นต่ำที่ใบงานสั่ง */
const FRAMES = [
  'aio59-390x844-tall', 'aio59-390x844-wide',
  'aio59-1440x900-tall', 'aio59-1440x900-wide',
  'aio59-390x844-crop', 'aio59-1440x900-crop',
  'aio59-390x844-plate', 'aio59-1440x900-plate',
  'aio59-768x1024-wide', 'aio59-1366x768-wide',
];

let fail = 0, pass = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}${detail ? ' — ' + detail : ''}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ====================== 1. ของที่ส่งมอบมีครบ ====================== */
console.log('\n1. ของที่ส่งมอบ');
ok(fs.existsSync(CSS_FILE), 'มีบล็อก CSS ที่ส่งให้ Dev (aio59-feed-wide.css)');
ok(fs.existsSync(DOC), 'มีเอกสารกฎ (AIO-59-FEED-ORIENTATION.md)');
if (fs.existsSync(DOC)) {
  const md = fs.readFileSync(DOC, 'utf8');
  ok(/<!-- MEASURED:BEGIN -->[\s\S]*ตาราง 1[\s\S]*<!-- MEASURED:END -->/.test(md),
    'เอกสารมีบล็อกตัวเลขที่ตัววัดเขียนลงไปจริง');
  for (const f of ['aio59-390x844-wide', 'aio59-1440x900-wide'])
    ok(md.includes(f), `เอกสารอ้างถึงภาพ ${f}`);
}
ok(fs.existsSync(JSON_OUT), 'มีตัวเลขดิบ (aio59-measured.json)');
for (const f of FRAMES) ok(fs.existsSync(path.join(SHOTS, `${f}.png`)), `มีภาพต้นฉบับ ${f}.png`);
/* เด็ค JPEG ไม่ได้ถูกคอมมิต (design/v2/shots-jpeg อยู่ใน .gitignore เหมือนของ AIO-56)
   ⇒ ตรวจเป็นข้อมูล ไม่ใช่เงื่อนไขผ่าน/ตก · ถ้ายังไม่มี ให้รัน aio59-frames.mjs
   แต่ถ้ามีแล้วต้องไม่เกินเพดาน attachment 10 MB ซึ่งเป็นข้อจำกัดจริงของบอร์ด */
const jpegs = FRAMES.map(f => path.join(SHOTS_JPEG, `${f}.jpg`)).filter(p => fs.existsSync(p));
const deck = jpegs.reduce((n, p) => n + fs.statSync(p).size, 0);
if (jpegs.length === FRAMES.length) {
  ok(deck < 10 * 1024 * 1024, `เด็ค JPEG รวม ${(deck / 1024 / 1024).toFixed(2)} MB ไม่เกิน 10 MB`);
} else {
  console.log(`  – เด็ค JPEG มี ${jpegs.length}/${FRAMES.length} ใบ (ไม่ถูกคอมมิตโดยตั้งใจ`
    + ` · สร้างใหม่ด้วย node design/v2/aio59-frames.mjs)`);
}

/* ====================== 2–7. กฎการวาง วัดจากเว็บจริง ====================== */
const css = readProposalCss();
const srv = await serveRepo();
const br = await openChrome();
const results = [];
try {
  for (const vp of VIEWPORTS) {
    await br.viewport(vp);
    await br.goto(`${srv.base}/feed/`);
    const before = await br.evaluate(MEASURE);
    await br.evaluate(patchScript(css, { src: POSTER_SRC, poster: true }));
    await br.settle();
    const after = await br.evaluate(MEASURE);
    /* R5 ต้องการค่าของ --feed-h ที่เบราว์เซอร์คำนวณจริง ⇒ วัดจากกล่องโพรบที่สูงเท่าตัวแปรนั้น
       (getComputedStyle ของ custom property คืนข้อความ `calc(...)` ที่ยังไม่ถูกคำนวณ) */
    const feedH = await br.evaluate(`(() => {
      const box = document.querySelector('.player.full');
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;left:0;top:0;width:1px;visibility:hidden;height:var(--feed-h)';
      box.appendChild(p);
      const h = p.getBoundingClientRect().height;
      p.remove();
      return +h.toFixed(1);
    })()`);
    results.push({ vp, before, after, feedH });
  }
} finally {
  br.close();
  srv.stop();
}

const FURNITURE = ['frame', 'ptop', 'pos', 'pstack', 'ptext', 'bar', 'side'];
const BTN_KEYS = ['topBtns', 'sideBtns', 'arrows', 'cta'];
const btns = m => BTN_KEYS.flatMap(k => (m[k] || []).map(r => ({ k, r })));

console.log('\n2. R1 · เครื่องเรือนไม่ขยับเมื่อสลับทิศ (ฟีดเป็นกล่องใบเดียวที่สลับเนื้อหา)');
for (const { vp, before, after } of results) {
  const moved = FURNITURE.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const bMoved = BTN_KEYS.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  ok(moved.length === 0 && bMoved.length === 0,
    `${vp.label}: กรอบเครื่องเรือนและปุ่มทุกชิ้นเท่าเดิมทุกค่า`, [...moved, ...bMoved].join(', '));
}

console.log('\n3. R2 · กล่องสื่อเป็นทรงคลิป 16:9 และไม่ล้นกรอบ');
for (const { vp, after } of results) {
  const c = after.clip;
  ok(!!c, `${vp.label}: มีกล่องสื่อ`);
  if (!c) continue;
  ok(near(c.w / c.h, 16 / 9, 16 / 9 * 0.005), `${vp.label}: สัดส่วน ${(c.w / c.h).toFixed(4)} = 16:9 (±0.5%)`);
  ok(c.w <= after.frame.w + 0.5 && c.left >= after.frame.left - 0.5 && c.right <= after.frame.right + 0.5,
    `${vp.label}: กล่องสื่อไม่ล้นกรอบด้านกว้าง`);
  ok(near((c.left + c.right) / 2, (after.frame.left + after.frame.right) / 2, 0.6),
    `${vp.label}: กล่องสื่ออยู่กึ่งกลางแนวนอน`);
}

console.log('\n4. R3 · ภาพไม่ถูกแคปชัน/ตัวนับทับ และแคปชันสูงไม่เกินครึ่งกรอบ');
for (const { vp, after } of results) {
  ok(after.clip.bottom <= after.pstack.top - 1,
    `${vp.label}: ขอบล่างภาพ ${after.clip.bottom} อยู่เหนือหัวแคปชัน ${after.pstack.top}`);
  ok(after.clip.top >= after.ptop.bottom + 8,
    `${vp.label}: ขอบบนภาพห่างแถบตัวนับ ${(after.clip.top - after.ptop.bottom).toFixed(1)}px (≥8)`);
  ok(after.pstack.h * 2 <= after.frame.h,
    `${vp.label}: แคปชัน ${after.pstack.h}px ≤ ครึ่งกรอบ ${(after.frame.h / 2).toFixed(1)}px`);
}

console.log('\n5. R4 · ขอบล่างของภาพตกกลางคู่ลูกศรพอดี และไม่ผ่ากลางปุ่มใด');
for (const { vp, after } of results) {
  const mid = after.frame.top + after.frame.h / 2;
  ok(near(after.clip.bottom, mid, 1),
    `${vp.label}: ขอบล่างภาพ ${after.clip.bottom} = กึ่งกลางกรอบ ${mid.toFixed(1)} (±1px)`);
  const cut = btns(after).filter(({ r }) => after.clip.bottom > r.top + 0.5 && after.clip.bottom < r.bottom - 0.5);
  ok(cut.length === 0, `${vp.label}: ไม่มีปุ่มถูกขอบภาพผ่ากลาง`, cut.map(c => c.k).join(', '));
}

console.log('\n6. R5 · ค่า --feed-h ต้องเท่าความสูงกรอบจริง (กันนิพจน์ที่ซ้ำกันสองที่เลื่อนออกจากกัน)');
for (const { vp, after, feedH } of results) {
  ok(near(feedH, after.frame.h, 1),
    `${vp.label}: --feed-h = ${feedH}px · กรอบจริง ${after.frame.h}px`);
}

console.log('\n7. R6 · ปุ่มทุกชิ้นอยู่เหนือฟอลด์และไม่มุดใต้ของที่ลอยทับ');
for (const { vp, after } of results) {
  const topEdge = after.headerFixed === 'sticky' && after.header ? after.header.bottom : 0;
  const botEdge = after.nav && after.nav.h > 0 ? after.nav.top : after.vh;
  const list = btns(after);
  const bad = list.filter(({ r }) => r.top < topEdge - 0.5 || r.bottom > botEdge + 0.5
    || r.left < -0.5 || r.right > after.vw + 0.5);
  ok(bad.length === 0 && list.length === 9,
    `${vp.label}: ปุ่ม ${list.length}/9 ชิ้นอยู่ในกรอบจอทั้งหมด`, bad.map(b => b.k).join(', '));
}

/* ====================== 8. ข้อสังเกตข้ามทีม (ไม่นับเป็นผลด่าน) ====================== */
/* กฎ M2 ของเอกสารนี้: กล่อง 16:9 แสดงกลางไฟล์ 11:5 อยู่ 80.8% ⇒ ของสำคัญต้องอยู่ในกรอบนั้น
   แผ่นกว้างของ AIO-56 เว้นครึ่งซ้ายเป็นพื้นเบลอไว้ให้ตัวหนังสือของฮีโร่ "โดยตั้งใจ"
   (AIO-56-SHAPE-MAP.md §4) ⇒ วันนี้ฟีดจึงถอยไปใช้ปก 2:3 ตามกฎ M2 · ไม่ใช่บั๊กของใคร
   แต่เป็นข้อที่ต้องรู้ก่อนเอาแผ่นกว้างมาใส่ช่องนี้ · พิมพ์ไว้ให้เห็น ไม่ตั้งเป็นเงื่อนไขผ่าน/ตก
   เพราะไฟล์ชุดนั้นเป็นของ Visual ไม่ใช่ของใบงานนี้ */
console.log('\n8. ข้อสังเกต (ไม่นับผล): ทำไมกล่องสื่อถึงยังไม่ใช้แผ่นกว้าง 11:5');
console.log(`   กล่อง 16:9 ตัดเอากลางไฟล์ 11:5 ไว้ 80.8% (ขอบข้างละ 9.6%)`);
console.log(`   ย่านคมของแผ่นวันนี้อยู่ที่ 0.55–0.91 ของความกว้าง ⇒ ซ้ายราว 44% ของกล่องเป็นพื้นเบลอ`);
console.log(`   ⇒ กฎ M2 ให้ถอยไปใช้ ${POSTER_SRC} · เทียบภาพได้ที่ shots/aio59-*-plate.png (${WIDE_SRC})`);

console.log(`\nสรุป: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
