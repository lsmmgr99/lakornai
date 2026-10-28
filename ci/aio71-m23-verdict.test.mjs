/* เทสต์ของ **เกณฑ์ตัดสิน** ของมิวเทชัน M23 — ไม่ใช่ของกฎ V19
   รัน: node --test ci/*.test.mjs

   ทำไมต้องมีไฟล์นี้: รีวิวรอบที่ห้าโจมตีตัวเทสต์ ไม่ใช่ตัวโค้ด และ **ทำได้สำเร็จ** —
     · Reviewer-Codex R7: แทน build ของ "แปดเคสลบ" ด้วย `throw new Error('unrelated failure')`
       ⇒ M23 ยังรายงาน 11/11 และออก 0 ทั้งที่ไม่มีทิศใดเห็นกฎ V19 เลย
     · Reviewer-Claude ก7: เติมทิศที่ renderer พังเลย (ไม่เกี่ยวกับ V19) ⇒ ได้ 12/12
   ต้นเหตุเดียวกัน: เกณฑ์เดิมอ่านแต่ exit code (`status === 0 ? 'ผ่าน' : 'ล้ม'`) ⇒ "build ล้ม"
   ถูกนับเป็น "กฎจับได้" · ตอนนี้เกณฑ์อ่าน **ป้ายของกฎ** แล้วแยกสี่สภาพ และ "ล้มด้วยเหตุอื่น"
   ไม่ตรงกับ `want` ของทิศใดเลย ⇒ มิวเทชันของ R7 แดง

   ป้ายที่เกณฑ์อ่าน มาจาก build/build.mjs ส่วน 4.8ข จริง ๆ (ข้อความปฏิเสธ · บรรทัด `✓ กฎ V19:`
   · ข้อความ "ตัดสินกฎ V19 ไม่ได้") ⇒ ถ้าใครแก้ถ้อยคำในกฎโดยไม่แก้ที่นี่ เทสต์ "ป้ายทั้งสาม
   ยังอยู่ในซอร์สของกฎ" ข้างล่างจะแดง ไม่ใช่เงียบ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict } from './aio71-m23.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REFUSE = '✗ feed/index.html: ไม่มีกล่องสื่อสองชั้นตามกฎ AIO-59 (`.player.full` > `.mwin` > `.clip` '
  + 'เป็นลูกโดยตรงต่อกัน) ขณะที่คลังมีเรื่องแนวนอนแล้ว 1 เรื่อง: x (y)';
const ACCEPT = '✓ กฎ V19: feed/index.html มีกล่องสื่อสองชั้นตาม AIO-59 · คลังมีเรื่องแนวนอน 1 เรื่อง';
const CANT = '✗ feed/index.html: ตัดสินกฎ V19 ไม่ได้ — มาร์กอัปของหน้านี้อยู่นอกไวยากรณ์ที่ build/html-tree.mjs โมเดล';

test('ล้มด้วยเหตุอื่น (กฎไม่ได้รันเลย) ไม่นับเป็น "ปฏิเสธ" — มิวเทชันของ Reviewer-Codex R7', () => {
  const v = verdict({ status: 1, out: 'unrelated failure: V19 never ran\n' });
  assert.equal(v.got, 'ล้มด้วยเหตุอื่น');
  assert.notEqual(v.got, 'ปฏิเสธ', 'ความล้มที่ไม่มีป้ายของกฎ ห้ามเท่ากับการจับของกฎ');
  /* ทุกทิศของ CASES ใช้ want สี่ค่านี้ ⇒ "ล้มด้วยเหตุอื่น" ไม่ตรงกับทิศใดเลย = แดงทุกทิศ */
  for (const want of ['ปฏิเสธ', 'รับ', 'ตัดสินไม่ได้', 'ไม่ทำงาน']) assert.notEqual(v.got, want);
});

test('renderer พังก่อนถึงกฎ (exit 1 ไม่มีป้าย) ⇒ "ล้มด้วยเหตุอื่น" — มิวเทชันของ Reviewer-Claude ก7', () => {
  const out = 'file:///tmp/x/build/pages-discovery.mjs:120\n  ReferenceError: nope is not defined\n';
  assert.equal(verdict({ status: 1, out }).got, 'ล้มด้วยเหตุอื่น');
});

test('สี่สภาพที่ถูกต้องถูกแยกออกจากกัน และบันทึกป้ายที่อ่านรู้เรื่อง', () => {
  assert.equal(verdict({ status: 1, out: REFUSE }).got, 'ปฏิเสธ');
  assert.match(verdict({ status: 1, out: REFUSE }).mark, /กล่องสื่อสองชั้น/);
  assert.equal(verdict({ status: 0, out: `✓ สร้าง 464 หน้า\n${ACCEPT}` }).got, 'รับ');
  assert.equal(verdict({ status: 1, out: CANT }).got, 'ตัดสินไม่ได้');
  assert.equal(verdict({ status: 0, out: '✓ สร้าง 464 หน้า\n' }).got, 'ไม่ทำงาน');
});

test('ป้ายที่ขัดกับสถานะออก = "ไม่สอดคล้อง" ไม่ใช่เดาให้ฝ่ายใดฝ่ายหนึ่ง', () => {
  /* กฎพิมพ์ว่าปฏิเสธแต่ build ออก 0 = ด่านที่พิมพ์แล้วไม่ล้ม (รอยที่เคยมีในรีโปนี้: push เข้า
     `errors` ที่ถูกเทไปแล้ว) ⇒ ต้องไม่ถูกนับเป็น 'ปฏิเสธ' */
  assert.equal(verdict({ status: 0, out: REFUSE }).got, 'ไม่สอดคล้อง');
  assert.equal(verdict({ status: 1, out: ACCEPT }).got, 'ไม่สอดคล้อง');
  assert.equal(verdict({ status: 0, out: CANT }).got, 'ไม่สอดคล้อง');
});

test('ป้ายทั้งสามที่เกณฑ์อ่าน ยังอยู่ในซอร์สของกฎ V19 จริง', () => {
  const src = fs.readFileSync(path.join(ROOT, 'build/build.mjs'), 'utf8');
  for (const mark of ['กล่องสื่อสองชั้นตามกฎ AIO-59', '✓ กฎ V19:', 'ตัดสินกฎ V19 ไม่ได้']) {
    assert.ok(src.includes(mark),
      `build/build.mjs ต้องยังพิมพ์ป้าย "${mark}" — ถ้าแก้ถ้อยคำของกฎ ให้แก้เกณฑ์ของ M23 ด้วย`);
  }
});

test('ทิศที่ M23 วัด ครอบทั้งสี่สภาพ และไม่มีทิศใดคาดหวังสภาพที่เป็นไปไม่ได้', async () => {
  const { CASES } = await import('./aio71-m23.mjs');
  const wants = new Set(CASES.map(c => c.want));
  for (const need of ['ปฏิเสธ', 'รับ', 'ตัดสินไม่ได้', 'ไม่ทำงาน']) {
    assert.ok(wants.has(need), `ชุดทิศของ M23 ต้องมีทิศที่คาดหวัง "${need}"`);
  }
  for (const c of CASES) {
    assert.ok(['ปฏิเสธ', 'รับ', 'ตัดสินไม่ได้', 'ไม่ทำงาน'].includes(c.want),
      `ทิศ "${c.id}" ตั้ง want เป็นค่าที่เกณฑ์ไม่มีวันคืน (${c.want})`);
  }
});
