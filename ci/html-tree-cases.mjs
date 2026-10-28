/* ชุดเคสของ `build/html-tree.mjs` ที่ **เฉลยมาจาก Chrome จริง** ไม่ใช่จากสเปกที่ผมอ่านเอง
   และไม่ใช่จากตัวแกะที่กำลังถูกทดสอบ (บทเรียนของรีโปนี้: ค่าที่คาดหวังห้ามมาจากสิ่งที่
   กำลังถูกทดสอบ)

   วิธีที่เลขในไฟล์นี้เกิดขึ้น และวิธีวัดซ้ำ:
     node ci/html-tree-oracle.mjs          # ยิงทุกเคสเข้า Chrome แล้วเทียบกับเลขในไฟล์นี้
   สคริปต์นั้นเปิดหน้าด้วย Chrome ของ playwright แบบ `--dump-dom` โดยฝังตัววัดไว้ใน `<head>`
   ที่อ่าน `document.querySelectorAll('.player.full > .mwin > .clip').length` **หลังหน้าโหลดจบ**
   ⇒ เคสที่เนื้อหากลายเป็นข้อความ (`<plaintext>`) ก็ยังวัดได้ เพราะตัววัดอยู่ก่อนเนื้อ

   ช่อง `caveat` = "โครงนี้อยู่นอกขอบเขตที่ตัวแกะโมเดล" ⇒ `root.caveats` ต้องไม่ว่าง และ
   กฎ V19 ต้อง **ล้มเสียงดังว่าตัดสินไม่ได้** ไม่ใช่ตอบ true/false เงียบ ๆ · เคสที่ `caveat`
   เป็นจริงยัง **ต้องตอบตรงกับ Chrome** ด้วย (ตอบถูกแล้วยังเตือนว่าไม่รับประกัน ไม่ใช่ตอบผิด)

   ที่มาของเคส: 14 เคสแรกมาจากรีวิวรอบที่สี่ (ที่ตัวตัดสินเดิมตอบผิด 9 ข้อ) · เคส foreign
   content / `<iframe>` / `<plaintext>` / `<!-->` / `--!>` / entity / foster parenting /
   `<p>`–`<li>` ที่ไม่ปิด มาจากรีวิวรอบที่ห้า (Reviewer-Claude ก2 · Reviewer-Codex R1) */

const OK = '<div class="player full"><div class="mwin"><div class="clip"></div></div></div>';

export const CHAIN = [['player', 'full'], ['mwin'], ['clip']];

/* chain = จำนวนโซ่ `.player.full > .mwin > .clip` ที่ **Chrome** เห็น (0 หรือ 1) */
export const CHROME_CASES = [
  { name: 'ซ้อนกันจริงสามชั้น', html: OK, chain: 1, caveat: false },
  {
    name: 'svg ที่ปิดตัวเองคั่นกลาง (`/>` ปิดจริงใน foreign content)',
    html: '<div class="player full"><svg class="mwin"/><div class="clip"></div></div>',
    chain: 0, caveat: false,
  },
  {
    name: 'svg ครอบ `g` แล้วมี `div` ข้างใน (div เด้งออกจาก svg)',
    html: '<svg class="player full"><g class="mwin"><div class="clip"></div></g></svg>',
    chain: 0, caveat: true,
  },
  {
    name: 'โครงจริงอยู่หลัง `<svg>` ที่มี `<circle/>`/`<path/>` — รูปที่ feed/index.html ใช้วันนี้',
    html: '<svg class="ico"><circle r="1"/><path d="M0 0"/></svg>' + OK,
    chain: 1, caveat: false,
  },
  { name: '`<iframe>` ครอบ (fallback content เป็นข้อความ)', html: `<iframe>${OK}</iframe>`, chain: 0, caveat: false },
  { name: '`<plaintext>` นำหน้า (ที่เหลือเป็นข้อความจนจบเอกสาร)', html: `<plaintext>${OK}`, chain: 0, caveat: false },
  {
    name: '`<table>` คั่นกลาง ⇒ กล่องถูกย้ายไปไว้ก่อนตาราง (foster parenting) โซ่จึง **ติด**',
    html: '<div class="player full"><table><div class="mwin"><div class="clip"></div></div></table></div>',
    chain: 1, caveat: true,
  },
  {
    name: '`<table class="mwin">` ⇒ ลูกถูกย้ายออกไปก่อนตาราง โซ่จึง **ขาด**',
    html: '<div class="player full"><table class="mwin"><div class="clip"></div></table></div>',
    chain: 0, caveat: true,
  },
  {
    name: '`<table class="player full">` ⇒ สองชั้นล่างถูกย้ายออกไปเป็นพี่น้องของตาราง',
    html: '<table class="player full"><div class="mwin"><div class="clip"></div></div></table>',
    chain: 0, caveat: true,
  },
  { name: '`<!-->` (คอมเมนต์จบแบบ abrupt) นำหน้าโครงจริง', html: `<!-->${OK}`, chain: 1, caveat: false },
  { name: '`<!--->` นำหน้าโครงจริง', html: `<!--->${OK}`, chain: 1, caveat: false },
  { name: 'คอมเมนต์ที่ปิดด้วย `--!>`', html: `<!-- x --!>${OK}`, chain: 1, caveat: false },
  {
    name: 'character reference ในค่า class (`mw&#105;n` = `mwin`)',
    html: '<div class="player full"><div class="mw&#105;n"><div class="clip"></div></div></div>',
    chain: 1, caveat: false,
  },
  {
    name: 'named reference ที่ตัวแกะไม่รู้จักในค่า class (`cl&iuml;p`) ⇒ ไม่ใช่ `clip` ทั้งสองฝ่าย',
    html: '<div class="player full"><div class="mwin"><div class="cl&iuml;p"></div></div></div>',
    chain: 0, caveat: true,
  },
  {
    name: '`<p>` ที่ไม่ปิด โดยมี `<em>` ค้างอยู่ (p ถูกปิดแม้ไม่ได้อยู่บนสุดของสแต็ก)',
    html: '<div class="player full"><p><em>x<div class="mwin"><div class="clip"></div></div></div>',
    chain: 1, caveat: true,
  },
  {
    name: '`<p>` ที่ไม่ปิด โดยมีแท็กจัดรูปค้างสองชั้น',
    html: '<div class="player full"><p><em><b>x<div class="mwin"><div class="clip"></div></div></div>',
    chain: 1, caveat: true,
  },
  {
    name: '`<li>` ที่ไม่ปิด ⇒ `<li>` ตัวใหม่ปิดทั้ง `div` ที่ค้างอยู่ข้างใน',
    html: '<ul><li><div class="player full"><li><div class="mwin"><div class="clip"></div></div></div></ul>',
    chain: 0, caveat: false,
  },
  { name: 'อยู่ใน `<template>`', html: `<template>${OK}</template>`, chain: 0, caveat: false },
  { name: 'อยู่ใน `<noscript>` (หน้าฟีดเป็นหน้าที่ JS ทำงาน)', html: `<noscript>${OK}</noscript>`, chain: 0, caveat: false },
  { name: 'อยู่ใน `<textarea>`', html: `<textarea>${OK}</textarea>`, chain: 0, caveat: false },
  { name: 'อยู่ใน `<title>`', html: `<title>${OK}</title>`, chain: 0, caveat: false },
  { name: 'อยู่ใน `<xmp>`', html: `<xmp>${OK}</xmp>`, chain: 0, caveat: false },
  {
    name: 'คลาสเป็นข้อความในค่าแอตทริบิวต์',
    html: `<div title=' class="player full"'><div class="mwin"><div class="clip"></div></div></div>`,
    chain: 0, caveat: false,
  },
  {
    name: '`<div/>` ไม่ปิดกล่องใน HTML ⇒ `.clip` ยังเป็นลูกของ `.mwin`',
    html: '<div class="player full"><div class="mwin"/><div class="clip"></div></div>',
    chain: 1, caveat: false,
  },
  {
    name: '`class=mwin` ไม่ใส่ quote (HTML ถูกต้อง)',
    html: '<div class="player full"><div class=mwin><div class=clip></div></div></div>',
    chain: 1, caveat: false,
  },
  {
    name: '`<foreignObject>` ของ svg คั่น ⇒ `.mwin` ไม่ได้เป็นลูกโดยตรงของ `.player.full`',
    html: '<svg class="player full"><foreignObject><div class="mwin"><div class="clip"></div></div></foreignObject></svg>',
    chain: 0, caveat: false,
  },
  {
    name: 'MathML `<mi>` เป็น text integration point ⇒ `div` ข้างในเป็น HTML จริง',
    html: '<math class="player full"><mi class="mwin"><div class="clip"></div></mi></math>',
    chain: 1, caveat: false,
  },
  {
    name: '`<span>` ใน svg เด้งออกจาก svg (breakout) ⇒ โซ่ขาด',
    html: '<svg class="player full"><g class="mwin"><span class="clip"></span></g></svg>',
    chain: 0, caveat: true,
  },
  { name: '`<script>` ที่มี `<!--` ในสตริง แล้วมีโครงจริงตามหลัง', html: `<script>var s="<!--";</script>${OK}`, chain: 1, caveat: false },
  {
    name: 'พี่น้องกัน ไม่ซ้อน',
    html: '<div class="player full"><div class="mwin"></div><div class="clip"></div></div>',
    chain: 0, caveat: false,
  },
];
