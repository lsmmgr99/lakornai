/* ด่านเทียบ **พฤติกรรม** ของตัวเลือกไฟล์ปกสองท่อ (ADR-001 §13.1 D5 · §13.5)
   รัน: node --test ci/*.test.mjs

   ปกไหลผ่านสองท่อที่ไม่มีอะไรเชื่อมกันเลย:
     ฝั่ง build      `coverSlot()` ใน build/seo.mjs (ESM บน node)
     ฝั่งเบราว์เซอร์ `coverSlot()` ใน build/app.src.js (IIFE ที่ build คัดลอกเป็น assets/app.js)
   การรวมเป็นสำเนาเดียวต้องพา bundler เข้ามา ซึ่งจ่ายแพงกว่าที่ได้ ⇒ สัญญาข้อนี้บังคับว่า
   **ความซ้ำต้องมาพร้อมด่านที่เทียบมัน** · build/build.mjs เทียบ "ค่าคงที่และชุดชื่อทรง"
   อยู่แล้วทุก build (ด่านนั้นถูกและเร็ว) ส่วนไฟล์นี้เทียบ **ผลลัพธ์จริงทั้งเมทริกซ์** ซึ่งจับสิ่งที่
   ด่านค่าคงที่จับไม่ได้: กฎถอยกลับที่หลุดจากกัน (เช่น ฝั่งหนึ่งถอยไปใช้ปก 2:3 เมื่อไม่มี
   `coverWide` แต่อีกฝั่งยังชี้ไปที่ไฟล์ที่ไม่มี)

   วิธี: ตัดตัวบทของ `url` / `cover` / `coverSlot` + สองบรรทัดค่าคงที่ออกจาก build/app.src.js
   แล้วประเมินใน node ด้วย `new Function` (ROOT = '' เท่ากับหน้าที่ราก) · ไม่ต้องมี bundler และ
   ไม่ต้องมี test hook ในโค้ดที่ส่งขึ้นเว็บ
   ⚠️ ถ้าโครงของไฟล์นั้นเปลี่ยนจนตัดไม่ได้ เทสต์นี้ **ล้ม** โดยเจตนา — ให้ย้ายจุดตัดให้ตรง
      ไม่ใช่ลบเทสต์ออก (ด่านที่เงียบเมื่ออ่านของไม่ออกคือด่านที่ไม่มีอยู่) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverSlot, COVER_SHAPES, COVER_W, COVER_H } from '../build/seo.mjs';
import { COVER_WIDE_W, COVER_WIDE_H } from '../build/content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'build/app.src.js'), 'utf8');

/* ตัดตัวบทของฟังก์ชันด้วยการนับปีกกา ไม่ใช่ regex ที่เดาว่าฟังก์ชันจบที่บรรทัดไหน */
function fnSource(name) {
  const head = `function ${name}(`;
  const i = src.indexOf(head);
  assert.ok(i >= 0, `หา ${head} ใน build/app.src.js ไม่เจอ — ย้ายจุดตัด ไม่ใช่ลบเทสต์`);
  let j = src.indexOf('{', i), depth = 0;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
  }
  throw new Error(`ตัดตัวบทของ ${name} ไม่จบ`);
}
const constLine = re => {
  const m = re.exec(src);
  assert.ok(m, `หาบรรทัดค่าคงที่ (${re.source}) ไม่เจอ`);
  return m[0];
};
const browserSlot = new Function('ROOT', [
  constLine(/var POSTER_W = \d+, POSTER_H = \d+;/),
  constLine(/var WIDE_W = \d+, WIDE_H = \d+;/),
  fnSource('url'), fnSource('cover'), fnSource('coverSlot'),
  'return coverSlot;',
].join('\n'))('');

const strip = p => String(p).replace(/^\//, '');
const SERIES_FIXTURE = (orientation, wide) => ({
  slug: 'fixture-story',
  cover: 'assets/covers/fixture-story.webp',
  coverWide: wide ? 'assets/covers-wide/fixture-story.webp' : null,
  orientation,
});

test('ทั้งสองท่อให้ไฟล์และขนาดเดียวกันครบทั้งเมทริกซ์ (ทิศ × มีภาพกว้าง × ทรงที่ขอ)', () => {
  let n = 0;
  for (const orientation of ['vertical', 'horizontal']) {
    for (const wide of [false, true]) {
      for (const shape of COVER_SHAPES) {
        const s = SERIES_FIXTURE(orientation, wide);
        const a = coverSlot(s, shape);
        const b = browserSlot(s, shape);
        const at = `orientation=${orientation} · coverWide=${wide ? 'มี' : 'ไม่มี'} · shape=${shape}`;
        assert.equal(strip(b.src), strip(a.url), `ไฟล์ที่เลือกต่างกัน (${at})`);
        assert.equal(b.w, a.w, `width ต่างกัน (${at})`);
        assert.equal(b.h, a.h, `height ต่างกัน (${at})`);
        n++;
      }
    }
  }
  assert.equal(n, 12, 'เมทริกซ์ต้องมี 12 เคส — ถ้าชุดชื่อทรงเปลี่ยน ให้แก้เลขนี้พร้อม ADR §13.5');
});

test('กฎถอยกลับตรงกัน: ไม่มี coverWide ⇒ ทั้งสองท่อได้ปก 2:3 ขนาดของปก', () => {
  for (const shape of ['wide', 'auto']) {
    const s = SERIES_FIXTURE('horizontal', false);
    const a = coverSlot(s, shape);
    const b = browserSlot(s, shape);
    assert.equal(strip(a.url), s.cover);
    assert.equal(strip(b.src), s.cover);
    assert.deepEqual([a.w, a.h], [COVER_W, COVER_H]);
    assert.deepEqual([b.w, b.h], [COVER_W, COVER_H]);
    assert.equal(a.wide, false, 'ฝั่ง build ต้องบอกว่าถอยกลับแล้ว เพื่อให้ฮีโร่ตัด <source> ออกทั้งก้อน');
  }
});

test('มี coverWide + ช่องกว้าง ⇒ ทั้งสองท่อได้ไฟล์กว้างพร้อมขนาดของไฟล์กว้าง', () => {
  const s = SERIES_FIXTURE('horizontal', true);
  for (const shape of ['wide', 'auto']) {
    assert.deepEqual([coverSlot(s, shape).w, coverSlot(s, shape).h], [COVER_WIDE_W, COVER_WIDE_H]);
    assert.deepEqual([browserSlot(s, shape).w, browserSlot(s, shape).h], [COVER_WIDE_W, COVER_WIDE_H]);
  }
  /* ช่อง 2:3 ต้องได้ปก 2:3 เสมอ ไม่ว่าเรื่องจะเป็นทิศไหน — ไฟล์ 11:5 ในกรอบ 2:3 ถูกครอป
     ข้างมหาศาล ซึ่งแย่กว่าใช้ปกตรง ๆ (เหตุผลที่ §13.5 ตั้งค่าตั้งต้นเป็น poster) */
  assert.equal(strip(coverSlot(s, 'poster').url), s.cover);
  assert.equal(strip(browserSlot(s, 'poster').src), s.cover);
});

test('ความไม่สมมาตรที่ยังมีอยู่ และที่ที่ด่านของมันอยู่', () => {
  /* ฝั่ง build ล้มเมื่อชื่อทรงสะกดผิด ส่วนฝั่งเบราว์เซอร์ตกไปใช้ปก 2:3 เงียบ ๆ (เบราว์เซอร์ทำให้
     build แดงไม่ได้ และข้อความ error ภาษาไทยในไฟล์นั้นจะไปชนด่านถ้อยคำของ tools/check-ac.mjs)
     ⇒ บันทึกความต่างนี้เป็นเทสต์ เพื่อให้คนอ่านรอบหน้ารู้ว่ามันเป็นของที่ตั้งใจ และรู้ว่า
     ตัวที่กันการสะกดผิดจริงคือด่านใน build/build.mjs ส่วน 4.9 ไม่ใช่ท่อนี้ */
  const s = SERIES_FIXTURE('vertical', true);
  assert.throws(() => coverSlot(s, 'auot'), /ไม่อยู่ในชุดที่สัญญารู้จัก/);
  assert.equal(strip(browserSlot(s, 'auot').src), s.cover);
  /* และ 'auto' กับวัตถุที่ไม่มีทิศต้องล้มฝั่ง build — ห้ามเดา (§13.2 D1 · กฎ V14) */
  assert.throws(() => coverSlot({ ...s, orientation: undefined }, 'auto'), /ไม่มี orientation/);
});
