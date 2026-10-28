/* เทสต์ถาวรของ **ท่อนโครงสร้าง** ที่กฎ V19 ใช้ตัดสิน (ADR-001 §13.9 · AIO-59 §10.1)
   รัน: node --test ci/*.test.mjs

   ทำไมต้องมีไฟล์นี้: รอบ AIO-71 เขียนไว้ว่ามิวเทชัน M23 วัด V19 "ห้าทิศ" แต่ **ไม่มีชุดเทสต์
   ถาวร** — ทิศที่วัดคือการ build ต้นไม้ชั่วคราวด้วยมือ ซึ่งพิสูจน์ได้แค่ "มี/ไม่มีสองชั้น" ไม่ได้
   พิสูจน์ว่าตัวตัดสินรับ/ปฏิเสธมาร์กอัปแต่ละชนิดถูกต้อง (Reviewer-Codex R6 ท่อนสอง) ⇒ ของเดิม
   ตอบผิด **9 จาก 14 เคส** ที่วัดในรีวิวรอบที่สี่ โดยที่ M23 ทั้งห้าทิศยังเขียว

   เฉลยของแต่ละเคสคือ **สิ่งที่เบราว์เซอร์เห็น** ไม่ใช่สิ่งที่ regex เห็น: ตัวอย่างที่ Reviewer-Codex
   วัดด้วย Chrome (`querySelector('.player.full > .mwin > .clip')`) ถูกยกมาเป็นเคสตรง ๆ ทุกข้อ
   ข้อเดียวที่จงใจไม่ตรงกับ `DOMParser` คือ `<noscript>` — ที่นั่นสคริปต์ปิด เนื้อจึงกลายเป็น
   อิลิเมนต์จริง · หน้าฟีดของเราเป็นหน้าที่ JS ทำงาน ⇒ เฉลยที่ถูกคือ "เนื้อเป็นข้อความ" */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml, findDirectChain, findByClasses, parseAttrs, decodeRefs } from '../build/html-tree.mjs';
import { CHROME_CASES, CHAIN } from './html-tree-cases.mjs';

/* ตัวตัดสินตัวเดียวกับที่ build/build.mjs ส่วน 4.8ข เรียก — import ของจริง ไม่ใช่สำเนา */
const V19 = html => !!findDirectChain(parseHtml(html), [['player', 'full'], ['mwin'], ['clip']]);
const OK = '<div class="player full"><div class="mwin"><div class="clip"></div></div></div>';

/* ---------- ก · โครงที่อยู่ใน DOM จริง ⇒ ต้องรับ ---------- */
const ACCEPT = [
  ['ซ้อนกันจริงสามชั้น', OK],
  ["class ใช้ single quote", "<div class='player full'><div class='mwin'><div class='clip'></div></div></div>"],
  /* ค่าที่ไม่ใส่ quote เขียนได้คลาสเดียว (มีช่องว่าง = จบค่า) ⇒ เคสนี้วัดสองชั้นล่าง
     ซึ่งเป็นรูปที่ minifier ย่อได้จริงโดยไม่เปลี่ยนความหมายของ DOM (Reviewer-Codex R2) */
  ['class ไม่ใส่ quote ที่ชั้นกลางและใบ',
    '<div class="player full" data-i=0><div class=mwin><div class=clip></div></div></div>'],
  ['แท็กตัวใหญ่', '<DIV CLASS="player full"><DIV CLASS="mwin"><DIV CLASS="clip"></DIV></DIV></DIV>'],
  ['คลาสสลับลำดับ', '<div class="full player"><div class="mwin"><div class="clip"></div></div></div>'],
  ['ใบเป็น void element', '<div class="player full"><div class="mwin"><img class="clip"></div></div>'],
  ['คลาสเกินในแต่ละชั้น', '<section class="player full x"><div class="y mwin"><span class="clip z"></span></div></section>'],
  ['`<p>` ที่ไม่ปิดคั่นกลาง (HTML ปิดให้เอง · Reviewer-Claude ข 3)',
    '<div class="player full"><p>คำโฆษณา<div class="mwin"><div class="clip"></div></div></div>'],
  ['`<script>` ที่มี `<!--` ในสตริง แล้วมีคอมเมนต์จริงตามหลัง (Reviewer-Claude ข 2)',
    `<script>var a="<!--";</script>${OK}<!-- ปิดท้าย -->`],
  ['มีคอมเมนต์คั่นระหว่างชั้น', '<div class="player full"><!-- ก --><div class="mwin"><!-- ข --><div class="clip"></div></div></div>'],
  ['`>` ในค่าแอตทริบิวต์ของกล่องเอง', '<div class="player full" title="a>b"><div class="mwin"><div class="clip"></div></div></div>'],
  ['โครงจริงอยู่หลัง `<template>` ที่มีโครงปลอม',
    `<template><div class="player full"><div class="mwin"></div></div></template>${OK}`],
];

/* ---------- ข · ของที่ไม่ได้อยู่ใน DOM จริง ⇒ ต้องปฏิเสธ ---------- */
const REJECT = [
  ['ไม่มีอะไรเลย', '<div class="player full"></div>'],
  ['พี่น้องกัน ไม่ซ้อน', '<div class="player full"><div class="mwin"></div><div class="clip"></div></div>'],
  ['สองคลาสบนกล่องเดียว', '<div class="player full"><div class="mwin clip"></div></div>'],
  ['มีชั้นเกินคั่นระหว่าง player กับ mwin',
    '<div class="player full"><div class="pad"><div class="mwin"><div class="clip"></div></div></div></div>'],
  ['ปู่ไม่มีคลาส full', '<div class="player"><div class="mwin"><div class="clip"></div></div></div>'],
  ['อยู่ในคอมเมนต์ HTML', `<!-- ${OK} -->`],
  ['อยู่ในสตริงของ `<script>`', `<script>var h="${OK.replace(/"/g, "'")}";</script>`],
  ['อยู่ใน `<template>` (Reviewer-Codex R1)', `<template>${OK}</template>`],
  ['อยู่ใน `<template>` ซ้อนสองชั้น', `<template><template>${OK}</template></template>`],
  ['อยู่ใน `<textarea>` (Reviewer-Codex R1)', `<textarea>${OK}</textarea>`],
  ['อยู่ใน `<noscript>` (หน้าฟีดเป็นหน้าที่ JS ทำงาน)', `<noscript>${OK}</noscript>`],
  ['อยู่ใน `<style>`', `<style>${OK}</style>`],
  ['คลาสเป็นข้อความในค่าแอตทริบิวต์ (Reviewer-Codex R1)',
    `<div title=' class="player full"'><div class="mwin"><div class="clip"></div></div></div>`],
  ['`<div/>` ไม่ปิดกล่องใน HTML ⇒ มีพ่อคั่นจริง (Reviewer-Codex R1)',
    '<div class="player full"><div class="mwin"><div/><div class="clip"></div></div></div>'],
];

test('V19 รับโครงที่อยู่ใน DOM จริงทุกรูป', () => {
  for (const [name, html] of ACCEPT) assert.equal(V19(html), true, `ต้องรับ: ${name}`);
});

test('V19 ปฏิเสธโครงที่ไม่ได้อยู่ใน DOM จริงทุกรูป', () => {
  for (const [name, html] of REJECT) assert.equal(V19(html), false, `ต้องปฏิเสธ: ${name}`);
});

/* ---------- ข2 · เฉลยที่วัดจาก Chrome จริง ----------
   รีวิวรอบที่ห้าวัดเคสใหม่แล้วพบว่าตัวแกะตอบผิด 5 รูป และ **หนึ่งรูปตอบผิดบนไฟล์ที่ส่งมอบ
   วันนี้แล้ว** (`<svg><path …/>` ของ feed/index.html) ⇒ เฉลยทั้งชุดถูกย้ายไปอยู่ที่
   ci/html-tree-cases.mjs ซึ่งบันทึกเลขที่ **Chrome** ตอบ และ ci/html-tree-oracle.mjs
   ยิงซ้ำเข้า Chrome จริงเพื่อกันเลขนั้นเน่า (ที่นี่ไม่ต้องมีเบราว์เซอร์ ⇒ รันทุกครั้ง) */
test(`ตัวแกะตอบตรงกับ Chrome ทุกเคสที่วัดไว้ (${CHROME_CASES.length} เคส)`, () => {
  for (const c of CHROME_CASES) {
    const got = findDirectChain(parseHtml(c.html), CHAIN) ? 1 : 0;
    assert.equal(got, c.chain, `ต้องตอบ ${c.chain} เท่าที่ Chrome ตอบ: ${c.name}`);
  }
});

test('โครงที่อยู่นอกขอบเขตของตัวแกะ ถูกบันทึกเป็น caveat ไม่ใช่ตอบเงียบ ๆ', () => {
  for (const c of CHROME_CASES) {
    assert.equal(parseHtml(c.html).caveats.length > 0, c.caveat,
      `caveat ของเคสนี้ต้องเป็น ${c.caveat}: ${c.name}`);
  }
  /* caveat ต้องมีข้อความที่อ่านรู้เรื่อง ไม่ใช่ธงเปล่า — คนที่เจอข้อแดงของ V19 ต้องรู้ว่า
     "ตัดสินไม่ได้เพราะอะไร" ไม่ใช่แค่ "ตัดสินไม่ได้" */
  const sample = parseHtml('<div class="player full"><table class="mwin"><div class="clip"></div></table></div>');
  assert.match(sample.caveats.join(' '), /foster parenting/);
});

/* ---------- ค · ตัวอ่านแอตทริบิวต์ (ข้อความของกฎอ่าน `data-orientation` จากกล่องจริง) ---------- */
test('ตัวอ่านแอตทริบิวต์รับทั้งสามรูปของ HTML และไม่ข้ามขอบเขตค่า', () => {
  assert.equal(parseAttrs(' class="a b" data-orientation="horizontal"').get('data-orientation'), 'horizontal');
  assert.equal(parseAttrs(" data-orientation='vertical'").get('data-orientation'), 'vertical');
  assert.equal(parseAttrs(' data-orientation=horizontal hidden').get('data-orientation'), 'horizontal');
  assert.equal(parseAttrs(' data-orientation=horizontal hidden').has('hidden'), true);
  /* คำว่า class ที่อยู่ **ในค่า** ของแอตทริบิวต์อื่น ต้องไม่ถูกอ่านเป็นแอตทริบิวต์ */
  assert.equal(parseAttrs(` title=' class="player full"'`).has('class'), false);
  assert.equal(parseAttrs(' title="a>b" class="x"').get('class'), 'x');
});

test('อ่าน data-orientation ของกล่องสื่อฟีดจาก HTML ที่ส่งออกได้', () => {
  const box = findByClasses(parseHtml('<main><div class="player full" id="feedPlayer" data-orientation="vertical">'
    + '<img class="poster"></div></main>'), ['player', 'full']);
  assert.ok(box, 'ต้องหากล่อง .player.full เจอ');
  assert.equal(box.attrs.get('data-orientation'), 'vertical');
  assert.equal(box.attrs.get('id'), 'feedPlayer');
});

/* ---------- ง · ของจริงในรีโปวันนี้: ฟีดเป็นแนวตั้ง ⇒ ไม่มีสองชั้น และนั่นถูกตาม §10.1 ---------- */
test('feed/index.html ที่ส่งออกวันนี้: กล่องสื่อประกาศทิศ และยังไม่มีสองชั้น (AIO-62 ยังไม่ลง)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const f = path.join(ROOT, 'feed/index.html');
  if (!fs.existsSync(f)) return;                 /* ยังไม่เคย build ในต้นไม้นี้ */
  const doc = parseHtml(fs.readFileSync(f, 'utf8'));
  const box = findByClasses(doc, ['player', 'full']);
  assert.ok(box, 'feed/index.html ต้องมีกล่อง .player.full (§13.7 D7)');
  assert.match(box.attrs.get('data-orientation') || '', /^(vertical|horizontal)$/,
    'กล่องสื่อของฟีดต้องประกาศ data-orientation จากข้อมูล (§13.7 D7 ข้อ 1)');
  /* ของที่กันไม่ให้ "ตัวแกะอยู่ในขอบเขต" เป็นคำสัญญาในคอมเมนต์: HTML ที่ renderer ส่งมอบ
     ต้องอยู่ในไวยากรณ์ที่โมเดลนี้รองรับจริง ⇒ ถ้าวันหน้ามีใครพ่น `<table>` คร่อมกล่องสื่อ
     หรือปล่อยแท็กจัดรูปค้าง ด่านนี้แดง **ก่อน** ที่ข้อมูลแนวนอนจะมาถึง (ไม่ต้องรอ V19
     ซึ่งวันนี้ไม่ทำงานเลยเพราะคลังเป็นแนวตั้ง 12/12) · วัดแล้ววันนี้: 632 ไฟล์ caveats = 0 */
  assert.deepEqual(doc.caveats, [],
    'feed/index.html ต้องอยู่ในไวยากรณ์ที่ build/html-tree.mjs โมเดล (caveats ต้องว่าง)');
});

test('ตัวถอด character reference ของค่าแอตทริบิวต์: ตัวเลข ถอด · ชื่อที่ไม่รู้จัก คงไว้ตามตัว', () => {
  assert.equal(decodeRefs('mw&#105;n'), 'mwin');
  assert.equal(decodeRefs('mw&#x69;n'), 'mwin');
  assert.equal(decodeRefs('a&amp;b'), 'a&b');
  assert.equal(decodeRefs('cl&iuml;p'), 'cl&iuml;p');      /* ไม่รู้จัก ⇒ คงไว้ + เป็น caveat */
  assert.equal(parseAttrs(' class="mw&#105;n"').get('class'), 'mwin');
});
