/* เทสต์ของ **ตัวแกะตาราง §13.5** และของการเทียบสองทางกับ `SHAPE_MAP`
   รัน: node --test ci/*.test.mjs   (คำสั่งเดียวกับที่ ci/README.md §"ทดสอบตัวด่านเอง" บันทึกไว้)

   ทำไมต้องอยู่ที่นี่ ไม่ใช่อยู่แต่ใน tools/test-layout.mjs: ด่านนั้นต้องมีเบราว์เซอร์ + เซิร์ฟเวอร์
   และใช้เวลาเป็นสิบนาที ⇒ มิวเทชันของ "เฉลยมาจากสัญญาจริงไหม" จะถูกวัดนานเกินกว่าจะวัดบ่อย
   ไฟล์นี้วัดท่อนที่ไม่ต้องมีเบราว์เซอร์เลย: การแกะเอกสาร · การเทียบสองทาง · การนับจุดเรียก
   และ **หยิบ `SHAPE_MAP` ตัวจริงออกมาจาก tools/test-layout.mjs** (ตัดด้วยการนับวงเล็บ แบบ
   เดียวกับที่ ci/cover-slot.test.mjs ตัดฟังก์ชันจาก build/app.src.js) ⇒ ไม่ใช่สำเนาที่สามอีกใบ

   ⚠️ ถ้าโครงของไฟล์นั้นเปลี่ยนจนตัดไม่ได้ เทสต์นี้ **ล้ม** โดยเจตนา — ให้ย้ายจุดตัดให้ตรง
      ไม่ใช่ลบเทสต์ออก (ด่านที่เงียบเมื่ออ่านของไม่ออกคือด่านที่ไม่มีอยู่) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERIES, U } from '../build/content.mjs';
import {
  ADR_REL, DUAL, parseShapeTables, shapeMapProblems, callsiteProblems, slotProblems,
  countCallsIn, selectorsIn, stripCommentsAndStrings,
} from '../tools/adr-shape-table.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MD = read(ADR_REL);
const ADR = parseShapeTables(MD);
const count = (rel, name) => countCallsIn(read(rel), name);
/* รายการไฟล์ที่ต้องกวาด = ของจริงในโฟลเดอร์ ไม่ใช่รายชื่อที่พิมพ์ไว้ที่นี่ (ไฟล์ใหม่ต้องเข้า
   การกวาดเองโดยไม่มีใครต้องจำ) · ชุดเดียวกับที่ tools/test-layout.mjs ใช้ */
const SCAN = [...fs.readdirSync(path.join(ROOT, 'build'))
  .filter(n => n.endsWith('.mjs')).map(n => `build/${n}`), 'build/app.src.js'];
const callsites = (adr, c = count, r = read, files = SCAN) => callsiteProblems(adr, c, r, files);

/* ---------- `SHAPE_MAP` ตัวจริงจาก tools/test-layout.mjs ----------
   ตัดตั้งแต่ `const LAST_SERIES` (สองค่าที่แผนที่ใช้) ถึงท้ายอาเรย์ แล้วประเมินด้วย new Function
   โดยส่ง `SERIES`/`U` ของจริงเข้าไป ⇒ ได้วัตถุชุดเดียวกับที่ด่านใช้ ไม่ใช่สำเนาที่พิมพ์ไว้ที่นี่ */
function realShapeMap() {
  const src = read('tools/test-layout.mjs');
  const i = src.indexOf('const LAST_SERIES');
  assert.ok(i >= 0, 'หา const LAST_SERIES ใน tools/test-layout.mjs ไม่เจอ — ย้ายจุดตัด ไม่ใช่ลบเทสต์');
  const j = src.indexOf('const SHAPE_MAP = [', i);
  assert.ok(j >= 0, 'หา const SHAPE_MAP = [ ไม่เจอ — ย้ายจุดตัด ไม่ใช่ลบเทสต์');
  let depth = 0, end = -1;
  for (let k = src.indexOf('[', j); k < src.length; k++) {
    if (src[k] === '[') depth++;
    else if (src[k] === ']' && --depth === 0) { end = k + 1; break; }
  }
  assert.ok(end > 0, 'ตัดอาเรย์ SHAPE_MAP ไม่จบ — ย้ายจุดตัด ไม่ใช่ลบเทสต์');
  const body = src.slice(i, end) + '; return SHAPE_MAP;';
  return new Function('SERIES', 'U', body)(SERIES, U);
}
const SHAPE_MAP = realShapeMap();

/* ================= 1. ตัวแกะอ่านเอกสารจริงออก ================= */
test('แกะตาราง §13.5 จากเอกสารจริงได้ครบทุกตาราง', () => {
  assert.ok(ADR.buildRows.length >= 10, `ตารางฝั่ง build มี ${ADR.buildRows.length} แถว`);
  assert.ok(ADR.appRows.length >= 3, `ตารางฝั่งเบราว์เซอร์มี ${ADR.appRows.length} แถว`);
  assert.ok(ADR.slotRows.length >= 2, `ตาราง coverSlot() มี ${ADR.slotRows.length} แถว`);
  assert.deepEqual(ADR.docProblems, [], 'เอกสารต้องไม่ขัดกันเอง');
  /* ทุกแถวของตารางฝั่ง build ต้องชี้ไฟล์ และทุกไฟล์ต้องมีจริงบนดิสก์ (ชื่อไฟล์ = ช่องที่ผูกพัน) */
  for (const r of ADR.buildRows) {
    assert.ok(r.files.length >= 1, `แถว "${r.placement}" ไม่ได้ชี้ไฟล์ใดเลย`);
    for (const f of r.files) assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} ไม่มีจริง`);
  }
});

test('เลขรายไฟล์ของสัญญาตรงกับจำนวนจุดเรียกในซอร์สจริง', () => {
  assert.deepEqual(callsites(ADR), []);
});

test('ที่วางที่เรียก coverSlot() ตรง ๆ ตรงกับรายการใน §13.5', () => {
  const scanned = [...fs.readdirSync(path.join(ROOT, 'build'))
    .filter(n => n.endsWith('.mjs')).map(n => `build/${n}`), 'build/app.src.js'];
  assert.deepEqual(slotProblems(ADR, read, scanned), []);
});

/* ❗ ข้อนี้ **แดงอยู่วันนี้ และแดงถูกต้อง** — ของที่แดงคือ *เอกสาร* ไม่ใช่ด่านหรือโค้ด:
   §13.5 ตารางฝั่งเบราว์เซอร์ไม่มี selector ของผิวคลังเดสก์ท็อป `.lib-grid .libcard .poster`
   (แถว "รายการแจ้งเตือน · คลัง · รายการแบน" นับ 5 จุดเรียก แต่ตั้งชื่อไว้ 3 selector และหนึ่งใน
   สามคือ `.flatlist .th2` ซึ่ง build/app.src.js ไม่ได้ render เลย) ⇒ รายงานไปที่ CTO ใน AIO-71
   เพราะการเพิ่มแถวในสัญญาเป็นของ CTO ไม่ใช่ของ Dev
   ⚠️ ห้ามทำให้ข้อนี้เขียวด้วยการถอดรายการออกจาก SHAPE_MAP หรือใส่ allowlist ในตัวเทียบ —
      ผิวนั้นมีอยู่จริงบนเว็บ (`libCardHtml()` ใน `.lib-grid` ของ build/app.src.js) และถอด
      รายการออกคือการเลิกวัดที่วางจริงหนึ่งที่ ซึ่งแย่กว่าการมีข้อแดงที่ชี้ของจริง */
test('SHAPE_MAP ของ tools/test-layout.mjs ตรงกับตาราง §13.5 สองทาง', () => {
  assert.ok(SHAPE_MAP.length >= 15, `หยิบแผนที่ได้ ${SHAPE_MAP.length} รายการ`);
  assert.deepEqual(shapeMapProblems(ADR, SHAPE_MAP), []);
});

/* ================= 2. เลขบรรทัดไม่ผูกพัน (กฎการแกะข้อ 2) =================
   ของจริงเคลื่อนไปแล้ว 13 จาก 14 จุดที่คอมมิต f5796a8 ⇒ ด่านที่เทียบเลขบรรทัดจะแดงด้วย
   ความผิดของ **เอกสาร** · ข้อนี้พิสูจน์ว่าตัวแกะไม่สนใจเลขบรรทัดจริง ไม่ใช่แค่เขียนไว้ว่าไม่สน */
test('เลื่อนเลขบรรทัดทุกตัวในเอกสาร ⇒ ไม่มีข้อตกเพิ่มแม้ข้อเดียว', () => {
  const moved = MD.replace(/(`build\/[\w.-]+\.mjs):(\d+)`/g, (_, f, n) => `${f}:${Number(n) + 777}\``)
    .replace(/`:(\d+)`/g, (_, n) => `\`:${Number(n) + 777}\``);
  assert.notEqual(moved, MD, 'เอกสารต้องมีเลขบรรทัดให้เลื่อน ไม่งั้นข้อนี้ไม่ได้วัดอะไร');
  const after = parseShapeTables(moved);
  assert.deepEqual(after.perFile, ADR.perFile);
  assert.deepEqual(shapeMapProblems(after, SHAPE_MAP), shapeMapProblems(ADR, SHAPE_MAP));
  assert.deepEqual(callsites(after), callsites(ADR));
});

/* ================= 3. มิวเทชัน: แก้สองฝั่งพร้อมกันก็ยังแดง =================
   รอยที่ปิด: `SHAPE_MAP` เคยเป็นเฉลยของตัวเอง ⇒ มิวเทชันที่แก้ทั้ง renderer และแผนที่พร้อมกัน
   เขียวทั้งแผง (Reviewer-Claude · AIO-66 P2-3) · ตอนนี้สัญญาเป็นฝั่งที่สาม ⇒ ต้องแดง */
const mapWith = (sel, patch) => SHAPE_MAP.map(p => (p.sel === sel ? { ...p, ...patch } : p));

test('มิวเทชัน M22 · เปลี่ยนทรงที่ renderer + แผนที่พร้อมกัน ⇒ ยังแดงเพราะ §13.5 ไม่ขยับ', () => {
  const problems = shapeMapProblems(ADR, mapWith('.ep-row .th', { shape: 'wide' }));
  assert.ok(problems.length >= 1, 'แก้แผนที่ฝ่ายเดียวแล้วด่านต้องแดง');
  assert.ok(problems.join(' ').includes('.ep-row .th'), problems.join(' · '));
});

test('หนึ่งแถวจับหลายรายการ: รายการเดียวที่ต่างค่าก็ล้ม (กฎการแกะข้อ 3ก)', () => {
  /* `.ep-row .th` มีสามรายการ (/new/ · /popular/ · /schedule/) — แก้ใบเดียวต้องแดง
     นี่คือรอยที่มิวเทชัน M13 เปิดให้เห็น: รายการที่ไปแต่ /new/ ไม่เคยเปิดอีกสองหน้าเลย */
  const hit = SHAPE_MAP.filter(p => p.sel === '.ep-row .th');
  assert.ok(hit.length >= 3, `.ep-row .th ควรมีหลายรายการ (มี ${hit.length})`);
  let changed = false;
  const one = SHAPE_MAP.map(p => {
    if (!changed && p.sel === '.ep-row .th' && p.at === U.schedule) { changed = true; return { ...p, shape: 'auto' }; }
    return p;
  });
  assert.ok(changed, 'ไม่พบรายการของ /schedule/ ให้มิวเทชัน');
  assert.ok(shapeMapProblems(ADR, one).length >= 1);
});

test('ถอดรายการออกจากแผนที่ ⇒ แดง (ที่วางของสัญญาไม่ถูกวัด)', () => {
  const without = SHAPE_MAP.filter(p => p.sel !== '.notif .th');
  const problems = shapeMapProblems(ADR, without);
  assert.ok(problems.some(x => x.includes('.notif .th')), problems.join(' · '));
});

test('เพิ่มรายการที่ไม่มีแถวในสัญญา ⇒ แดง (กฎการแกะข้อ 3ข)', () => {
  const extra = [...SHAPE_MAP, { key: 'ที่วางที่ไม่มีในสัญญา', sel: '.brandnew .thumb', at: U.home, shape: 'poster' }];
  const problems = shapeMapProblems(ADR, extra);
  assert.ok(problems.some(x => x.includes('.brandnew .thumb')), problems.join(' · '));
});

test('ฮีโร่ "สองทรง" = shape:poster + wideAtBp:true ห้ามเทียบสตริง (กฎการแกะข้อ 4)', () => {
  const hero = SHAPE_MAP.find(p => p.sel === '.hero .bg');
  assert.equal(hero.shape, 'poster');
  assert.equal(hero.wideAtBp, true);
  /* ของจริงต้องเขียว แต่ทั้งสองครึ่งของการเข้ารหัสต้องล้มได้ */
  assert.ok(shapeMapProblems(ADR, mapWith('.hero .bg', { wideAtBp: false })).some(x => x.includes('.hero .bg')));
  assert.ok(shapeMapProblems(ADR, mapWith('.hero .bg', { shape: 'wide' })).some(x => x.includes('.hero .bg')));
  /* และสตริง "สองทรง" ในแผนที่ไม่ใช่ทางผ่าน */
  assert.ok(shapeMapProblems(ADR, mapWith('.hero .bg', { shape: DUAL, wideAtBp: true })).length >= 1);
});

/* ================= 4. มิวเทชันฝั่งเอกสาร ================= */
const mdWith = (from, to) => {
  assert.ok(MD.includes(from), `เอกสารจริงไม่มีข้อความ ${JSON.stringify(from)} — ย้ายจุดมิวเทชัน`);
  return MD.replace(from, to);
};

test('แก้ทรงในเอกสารฝ่ายเดียว ⇒ แดง (สัญญากับแผนที่ไม่ตรงกัน)', () => {
  const mutated = parseShapeTables(mdWith('| แถวตอน `.ep-row .th` 64px | `poster` |', '| แถวตอน `.ep-row .th` 64px | `auto` |'));
  const problems = shapeMapProblems(mutated, SHAPE_MAP);
  assert.ok(problems.some(x => x.includes('.ep-row .th')), problems.join(' · '));
});

test('แก้เลขรายไฟล์ในเอกสารฝ่ายเดียว ⇒ แดง', () => {
  const mutated = parseShapeTables(mdWith('| `build/pages-watch.mjs` | **1** |', '| `build/pages-watch.mjs` | **2** |'));
  const problems = callsites(mutated);
  assert.ok(problems.some(x => x.includes('build/pages-watch.mjs')), problems.join(' · '));
});

test('ผลรวมในเอกสารไม่ตรงกับแถวรายไฟล์ ⇒ รายงานเป็นข้อตก ไม่ใช่ crash', () => {
  const mutated = parseShapeTables(mdWith('| **รวม** | **12**', '| **รวม** | **13**'));
  assert.ok(mutated.docProblems.some(x => x.includes('13')), mutated.docProblems.join(' · '));
});

test('ชุดไฟล์ของสองที่ในสัญญาไม่ตรงกัน ⇒ แดง · และไฟล์ที่ไม่มีจริงต้องแดงด้วยข้อความที่อ่านรู้เรื่อง', () => {
  const mutated = parseShapeTables(mdWith('| `build/pages-watch.mjs` | **1** |', '| `build/pages-seo.mjs` | **1** |'));
  const problems = callsites(mutated);
  /* `build/pages-watch.mjs` ยังมีแถวที่วางแต่ไม่มีเลข · `build/pages-seo.mjs` มีเลขแต่ไม่มีแถว
     และเปิดไฟล์ไม่ได้ ⇒ ต้องได้ข้อตกทั้งสองทิศ ไม่ใช่ ENOENT ที่ทำให้ข้ออื่นไม่ถูกวัด */
  assert.ok(problems.some(x => x.includes('build/pages-watch.mjs')), problems.join(' · '));
  assert.ok(problems.some(x => x.includes('build/pages-seo.mjs') && x.includes('ไม่มีแถวที่วาง')), problems.join(' · '));
  assert.ok(problems.some(x => x.includes('build/pages-seo.mjs') && x.includes('อ่านไฟล์ไม่ได้')), problems.join(' · '));
});

test('แถว coverSlot() ชี้ไฟล์ที่ไม่มีจุดเรียกนั้น ⇒ แดง', () => {
  const fake = { ...ADR, slotRows: [{ ...ADR.slotRows[0], file: 'build/ui.mjs' }] };
  const problems = slotProblems(fake, read, []);
  assert.ok(problems.some(x => x.includes('build/ui.mjs')), problems.join(' · '));
});

test('ไฟล์ใหม่เรียก coverSlot() โดยไม่มีแถวในสัญญา ⇒ แดง · และสตริงไม่นับเป็นจุดเรียก', () => {
  const stub = rel => (rel === 'build/newcomer.mjs' ? "const x = coverSlot(s, 'poster');\n"
    : rel === 'build/stringy.mjs' ? "throw new Error(`coverSlot(${s.slug}) ล้ม`);\n"
      : rel === 'build/commenty.mjs' ? '/* ที่นี่เคยเรียก coverSlot(s) */\n'
        : read(rel));
  const problems = slotProblems(ADR, stub, ['build/newcomer.mjs', 'build/stringy.mjs', 'build/commenty.mjs']);
  assert.deepEqual(problems.filter(x => x.includes('stringy')), [], 'คำใน template string ไม่ใช่จุดเรียก');
  assert.deepEqual(problems.filter(x => x.includes('commenty')), [], 'คำในคอมเมนต์ไม่ใช่จุดเรียก');
  assert.ok(problems.some(x => x.includes('build/newcomer.mjs')), problems.join(' · '));
});

/* ================= 5. ตัวแกะต้องล้มเสียงดัง ไม่ใช่เงียบแล้วเขียว ================= */
test('หัวข้อของตารางหายไป ⇒ throw ไม่ใช่คืนตารางว่าง', () => {
  assert.throws(() => parseShapeTables(MD.replace('#### ตารางที่วาง — ฝั่ง build', '#### (ย้ายไปที่อื่นแล้ว)')),
    /ไม่พบหัวข้อ/);
});

test('ค่าในช่อง "ขอทรง" ที่ไม่ใช่สามค่าของสัญญา ⇒ throw', () => {
  assert.throws(() => parseShapeTables(mdWith('| แถวตอน `.ep-row .th` 64px | `poster` |', '| แถวตอน `.ep-row .th` 64px | `ปก` |')),
    /อ่านเป็นทรงไม่ได้/);
});

test('ตัวหยิบ selector ไม่หยิบของที่ไม่ใช่ selector', () => {
  assert.deepEqual(selectorsIn('ปกในการ์ดทุกแบบ `.card .poster` (กล่องที่ `poster()` สร้าง)'), ['.card .poster']);
  assert.deepEqual(selectorsIn('ไฟล์ `build/ui.mjs:99` · `:128` · โทเคน `--ar-poster`'), []);
  assert.deepEqual(selectorsIn('`.btile .reelstrip span`'), ['.btile .reelstrip span']);
});

test('ตัวนับจุดเรียกไม่นับคอมเมนต์และไม่นับตัวนิยาม', () => {
  const src = 'function coverImg(a) {}\n/* coverImg( ในคอมเมนต์ */\n// coverImg(\nx = coverImg(1);\ny = coverImg(2);\n';
  assert.equal(countCallsIn(src, 'coverImg'), 2);
});

/* ================= 6. คำตัดสินรีวิวรอบที่สี่ (AIO-72 · AIO-73) =================
   ทุกข้อในส่วนนี้คือรอยที่ **ทั้งสองฝั่งรีวิววัดแล้วว่าด่านเขียวทั้งที่ควรแดง** ⇒ แต่ละข้อถือ
   มิวเทชันของตัวเองไว้ถาวร · และข้อที่อ้างว่า "แดง" ต้องพิสูจน์ว่าแดง **ด้วยข้อใหม่** ไม่ใช่
   เพราะมีข้อเดิมค้างอยู่ (รอยที่ Reviewer-Codex R6 จับได้: `problems.length >= 1` เขียวได้
   แม้ตัวตรวจไม่แตะของที่มิวเทชันแก้ เพราะ baseline มีข้อค้างอยู่แล้วหนึ่งข้อ) */
const BASE_SHAPE = shapeMapProblems(ADR, SHAPE_MAP);
const BASE_CALLSITE = callsites(ADR);
const added = (after, before) => after.filter(x => !before.includes(x));

test('R6 · ข้อที่อ้างว่าแดง ต้องแดงด้วย "ข้อใหม่" ไม่ใช่ด้วยข้อที่ค้างอยู่', () => {
  /* ฐานต้องสะอาดหรือไม่สะอาดก็ได้ — ที่บังคับคือทุกมิวเทชันข้างล่างต้องเพิ่มข้อใหม่ที่ชี้
     ของที่มันแก้จริง ๆ · ข้อนี้คือตัวที่ทำให้ `>= 1` ใช้ไม่ได้อีก */
  const oneOfThree = SHAPE_MAP.map(p => (p.sel === '.ep-row .th' && p.at === U.schedule
    ? { ...p, shape: 'auto' } : p));
  const delta = added(shapeMapProblems(ADR, oneOfThree), BASE_SHAPE);
  assert.ok(delta.length >= 1, 'แก้รายการของ /schedule/ แล้วต้องมีข้อ **ใหม่**');
  assert.ok(delta.every(x => x.includes('.ep-row .th')), delta.join(' · '));
  const key = SHAPE_MAP.find(p => p.sel === '.ep-row .th' && p.at === U.schedule).key;
  assert.ok(delta.some(x => x.includes(key)), `ข้อใหม่ต้องชี้รายการที่ถูกแก้ ("${key}") · ${delta.join(' · ')}`);

  const heroStr = mapWith('.hero .bg', { shape: DUAL, wideAtBp: true });
  const d2 = added(shapeMapProblems(ADR, heroStr), BASE_SHAPE);
  assert.ok(d2.some(x => x.includes('.hero .bg')), d2.join(' · '));
});

/* ---------- R5 + P2 · selector ที่อ่านไม่ออกต้องไม่หายเงียบ ---------- */
test('R5 · โทเคนที่เขียนเป็น selector แต่แกะไม่ออก ⇒ เป็นข้อตกของเอกสาร ไม่ใช่หายเงียบ', () => {
  const mutated = parseShapeTables(mdWith('| ดัชนีทุกเรื่อง `.flatlist .th2` 34px |',
    '| ดัชนีทุกเรื่อง `.flatlist .th2` 34px · `.new..broken` |'));
  assert.ok(mutated.docProblems.some(x => x.includes('.new..broken')), mutated.docProblems.join(' · '));
});

test('R5 · selector ที่มี `>` และ attribute selector ต้องแกะได้ ไม่ใช่ถูกทิ้ง', () => {
  assert.deepEqual(selectorsIn('`.player.full[data-orientation=horizontal] > .mwin > .clip`'),
    ['.player.full[data-orientation=horizontal] > .mwin > .clip']);
  assert.deepEqual(selectorsIn('ไทล์ใหม่ `.new > .surface`'), ['.new > .surface']);
  /* และของที่ไม่ใช่ selector ยังต้องไม่ถูกหยิบ (ไม่ใช่แลกความเงียบด้านหนึ่งกับความจุ้นอีกด้าน) */
  assert.deepEqual(selectorsIn('`poster()` `coverImg()` `build/ui.mjs:99` `:128` `--ar-poster` `s.slug`'), []);
});

test('P2 · แถวที่วางที่ไม่มี selector เลย ⇒ แดง ยกเว้นแถวที่ประกาศยกเว้นไว้ด้วยชื่อ', () => {
  const mutated = parseShapeTables(mdWith('| ดัชนีทุกเรื่อง `.flatlist .th2` 34px |',
    '| ดัชนีทุกเรื่อง (ไม่บอก selector) 34px |'));
  assert.ok(mutated.docProblems.some(x => x.includes('ดัชนีทุกเรื่อง') && x.includes('ไม่มี selector')),
    mutated.docProblems.join(' · '));
  /* แถวที่ยกเว้นไว้จริงต้องไม่ทำให้เอกสารแดงวันนี้ */
  assert.deepEqual(ADR.docProblems, []);
});

test('P2 · รายการยกเว้นที่ค้าง (ไม่ตรงแถวใดแล้ว) ⇒ แดง', () => {
  /* แถวที่ยกเว้นไว้มีสองแถวที่ขึ้นต้นเหมือนกัน (ตาราง coverSlot() กับตารางฝั่งเบราว์เซอร์)
     ⇒ ต้องมิวเทชัน **แถวของตารางฝั่งเบราว์เซอร์** ซึ่งเป็นแถวที่ถูกตรวจ selector */
  const row = [...MD.matchAll(/^\| ภาพในเพลเยอร์ฟีดตอนเลื่อนเรื่อง .*$/gm)].map(m => m[0]);
  assert.equal(row.length, 2, 'โครงของเอกสารเปลี่ยน — ย้ายจุดมิวเทชัน ไม่ใช่ลบเทสต์');
  const mutated = parseShapeTables(MD.replace(row[1],
    row[1].replace('ภาพในเพลเยอร์ฟีดตอนเลื่อนเรื่อง', 'ภาพในเพลเยอร์ฟีด `.player.full` (เปลี่ยนชื่อแถว)')));
  assert.ok(mutated.docProblems.some(x => x.includes('รายการยกเว้น')), mutated.docProblems.join(' · '));
});

/* ---------- R3 · ชื่อไฟล์ของแถวต้องถูกผูกกับของจริง ไม่ใช่แค่ "มีชื่อนี้ในตารางเลข" ---------- */
test('R3 · ย้ายชื่อไฟล์ของแถวไปเป็นไฟล์อื่นที่อยู่ในตารางแล้ว ⇒ ยังแดง', () => {
  const mutated = parseShapeTables(mdWith('| ปกในการ์ดทุกแบบ `.card .poster` (กล่องที่ `poster()` สร้าง) | `poster` | `build/ui.mjs:99`',
    '| ปกในการ์ดทุกแบบ `.card .poster` (กล่องที่ `poster()` สร้าง) | `poster` | `build/pages-watch.mjs:99`'));
  const delta = added(callsites(mutated), BASE_CALLSITE);
  assert.ok(delta.some(x => x.includes('.card .poster') || x.includes('pages-watch')), delta.join(' · '));
});

/* ---------- P2 · ไฟล์ที่มีจุดเรียกแต่ไม่มีแถว (ทิศที่เคยไม่มีเลย) ---------- */
test('P2 · เติมจุดเรียก coverImg() ลงไฟล์ที่สัญญาไม่ได้ลิสต์ ⇒ แดง', () => {
  const FAKE = 'build/zz-newcomer.mjs';
  const stubRead = rel => (rel === FAKE ? 'export const x = coverImg(s, "poster");\n' : read(rel));
  const stubCount = (rel, name) => countCallsIn(stubRead(rel), name);
  const delta = added(callsites(ADR, stubCount, stubRead, [...SCAN, FAKE]), BASE_CALLSITE);
  assert.ok(delta.some(x => x.includes(FAKE)), delta.join(' · '));
});

/* ---------- P2 · ลบแถวที่วางทิ้งเมื่อ selector ซ้ำกับแถวอื่น ---------- */
test('P2 · ลบแถวที่วางออกจากตารางฝั่ง build ⇒ แดง แม้ selector นั้นยังมีแถวอื่น', () => {
  const row = [...MD.matchAll(/^\| อันดับ 4–10 .*$/gm)].map(m => m[0])[0];
  assert.ok(row, 'ไม่พบแถว "อันดับ 4–10" ให้ลบ — ย้ายจุดมิวเทชัน ไม่ใช่ลบเทสต์');
  const mutated = parseShapeTables(MD.replace(row + '\n', ''));
  assert.ok(mutated.docProblems.some(x => x.includes('แถว "รวม"')), mutated.docProblems.join(' · '));
  /* และทิศ selector ยังเขียวอยู่จริง ⇒ ถ้าไม่มีข้อนี้ การลบแถวจะเงียบทั้งแผง */
  assert.deepEqual(added(shapeMapProblems(mutated, SHAPE_MAP), BASE_SHAPE), []);
});

/* ---------- R4 · coverSlot: นับจุดเรียก ไม่ใช่อนุญาตทั้งไฟล์ ---------- */
test('R4 · เติมจุดเรียก coverSlot() ใหม่ในไฟล์ที่มีแถวอยู่แล้ว ⇒ แดง', () => {
  const stub = rel => (rel === 'build/pages-content.mjs'
    ? read(rel) + "\nconst added = coverSlot(s, 'wide');\n" : read(rel));
  const problems = slotProblems(ADR, stub, SCAN);
  assert.ok(problems.some(x => x.includes('pages-content') && x.includes('wide')), problems.join(' · '));
});

test('R4 · จุดเรียกที่อยู่ในนิพจน์แทรกของ template literal ก็ต้องเห็น', () => {
  const FAKE = 'build/zz-template.mjs';
  const stub = rel => (rel === FAKE
    ? 'export const html = s => `<img src="${coverSlot(s, \'wide\').src}">`;\n' : read(rel));
  const problems = slotProblems(ADR, stub, [...SCAN, FAKE]);
  assert.ok(problems.some(x => x.includes(FAKE)), problems.join(' · '));
});

test('R4 · เจ้าของท่อที่ไม่มีจุดเรียกเลย = รายการยกเว้นที่ค้าง ⇒ แดง', () => {
  const stub = rel => (rel === 'build/ui.mjs' ? 'export const nothing = 1;\n' : read(rel));
  const problems = slotProblems(ADR, stub, SCAN);
  assert.ok(problems.some(x => x.includes('build/ui.mjs') && x.includes('เจ้าของท่อ')), problems.join(' · '));
});

test('R4 · จุดเรียกที่ส่งทรงเป็นตัวแปรในไฟล์ที่ไม่ใช่เจ้าของท่อ ⇒ แดง', () => {
  const FAKE = 'build/zz-varshape.mjs';
  const stub = rel => (rel === FAKE ? 'export const f = (s, k) => coverSlot(s, k);\n' : read(rel));
  const problems = slotProblems(ADR, stub, [...SCAN, FAKE]);
  assert.ok(problems.some(x => x.includes(FAKE) && x.includes('ค่าคงที่')), problems.join(' · '));
});

/* ---------- P3 · ตัวนับและตัวถอดสตริง ---------- */
test('P3 · ตัวนับจุดเรียกไม่นับคำที่อยู่ในสตริง (ลบของจริงแล้วเติมสตริงให้เลขเท่าเดิม = ต้องจับได้)', () => {
  assert.equal(countCallsIn('const msg = "coverImg(";\nx = coverImg(1);\n', 'coverImg'), 1);
  assert.equal(countCallsIn("const msg = 'coverImg(';\n", 'coverImg'), 0);
  assert.equal(countCallsIn('const msg = `coverImg(`;\n', 'coverImg'), 0);
  /* แต่จุดเรียกจริงในนิพจน์แทรกยังต้องนับ */
  assert.equal(countCallsIn('const h = `<i>${coverImg(s)}</i>`;\n', 'coverImg'), 1);
});

test('P3 · backtick เดี่ยวในสตริงต้องไม่กลืนโค้ดที่อยู่ถัดไป', () => {
  const src = 'const q = "`";\nconst a = coverSlot(s, \'poster\');\nconst r = /[\'"`]/;\nconst b = coverImg(s);\n';
  const bare = stripCommentsAndStrings(src);
  assert.match(bare, /coverSlot\s*\(/);
  assert.match(bare, /coverImg\s*\(/);
  assert.equal(countCallsIn(src, 'coverImg'), 1);
});

test('P3 · นิพจน์แทรกซ้อนหลายชั้นยังถูกเก็บไว้เป็นโค้ด', () => {
  const src = 'const h = `a${ `b${ coverImg(s) }c` }d`;\n';
  assert.match(stripCommentsAndStrings(src), /coverImg\s*\(/);
  assert.equal(countCallsIn(src, 'coverImg'), 1);
});
