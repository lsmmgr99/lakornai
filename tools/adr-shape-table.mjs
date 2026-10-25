/* ตัวแกะ "ตารางที่วาง" ของ ADR-001 §13.5 ด้วยเครื่อง — เฉลยของด่านทรงต้องมาจากสัญญา
   ไม่ใช่จากสำเนามือที่อยู่ในด่านเอง (ADR-001 §13.9 ย่อหน้า "ด่านที่ไม่ใช่กฎ V แต่ต้องมี — ข้อที่สอง")

   รอยที่ไฟล์นี้ปิด: `SHAPE_MAP` กับ `SHAPE_CALLSITES_BUILD` ใน tools/test-layout.mjs เป็น
   **สำเนามือ**ของตาราง §13.5 ⇒ มิวเทชันที่แก้ทั้ง renderer และสำเนามือพร้อมกันจึงเขียว
   (Reviewer-Claude · AIO-66 P2-3) — รูปแบบเดียวกับบทเรียน "ค่าที่คาดหวังห้ามมาจากสิ่งที่
   กำลังถูกทดสอบ" ที่รีโปนี้จ่ายมาแล้ว · เมื่อเฉลยมาจากไฟล์ ADR การแก้สองฝั่งพร้อมกันยังแดง
   เพราะฝั่งที่สามไม่ได้ขยับตาม

   ช่องที่ผูกพันและไม่ผูกพัน **ไม่ใช่การตัดสินใจของไฟล์นี้** — ADR §13.5 หัวข้อ
   "กฎการแกะตารางนี้ด้วยเครื่อง" ล็อกไว้ 5 ข้อ (เพิ่มโดย AIO-71 · คอมมิต 3d00f40):
     ข้อ 1  ผูกพัน: selector ในช่อง "ที่วาง" · ค่าในช่อง "ขอทรง" · **ชื่อไฟล์** ในช่องที่สาม
            · และเลขในหัวข้อ "จำนวนจุดเรียกต่อไฟล์"
     ข้อ 2  **เลขบรรทัดไม่ผูกพัน** (ของจริงเคลื่อนไปแล้ว 13 จาก 14 จุดที่คอมมิต f5796a8)
            ⇒ ไฟล์นี้ตัดเลขบรรทัดออกตั้งแต่ตอนแกะ และไม่มีที่ไหนเทียบมันเลย
     ข้อ 3  หนึ่งแถวจับได้หลายรายการใน `SHAPE_MAP` ⇒ **ห้ามเทียบจำนวนแถว** ให้เทียบสองทาง
     ข้อ 4  "สองทรง" ของฮีโร่เข้ารหัสเป็น `shape:'poster'` + `wideAtBp:true` ห้ามเทียบสตริง
     ข้อ 5  `declared`/`identity`/`max`/`atFor`/`at`/`needs`/`mode`/`player`/`autoCoveredBy`
            เป็นของด่าน ไม่ใช่ของสัญญา ⇒ ไฟล์นี้ไม่แตะฟิลด์พวกนั้นเลย

   ⚠️ ด่านที่เงียบเมื่ออ่านเอกสารไม่ออก คือด่านที่ไม่มีอยู่ ⇒ ทุกจุดที่แกะไม่ได้ `throw`
      ไม่ใช่คืนค่าว่างแล้วเขียว · ถ้า CTO เปลี่ยนรูปของตาราง ให้ย้ายจุดแกะให้ตรง ไม่ใช่ถอดด่านออก
   ⚠️ ไฟล์นี้ไม่มีผลข้างเคียงและไม่อ่านดิสก์เอง (รับ `read`/`count` เข้ามา) เพื่อให้
      ci/adr-shape-table.test.mjs ทดสอบมิวเทชันด้วยเอกสารปลอมได้ โดยไม่ต้องแก้ของจริงในรีโป */

export const ADR_REL = 'docs/adr/001-backend-architecture.md';

/* หัวข้อของตารางที่ต้องแกะ · อ้างด้วย **ข้อความของหัวข้อ** ไม่ใช่เลขบรรทัด — เลขบรรทัดใน
   เอกสารของ CTO เลื่อนทุกครั้งที่ §13 ถูกแก้ (สองครั้งในสองวัน: AIO-58 แล้ว AIO-70) */
const H_BUILD = 'ตารางที่วาง — ฝั่ง build';
const H_PERFILE = 'จำนวนจุดเรียกต่อไฟล์';
const H_SLOT = 'ตารางที่วาง — จุดเรียก `coverSlot()` ตรง ๆ';
const H_APP = 'ตารางที่วาง — ฝั่งเบราว์เซอร์';

/* ทรงสามค่าของสัญญา + รหัสภายในของ "สองทรง" (ฮีโร่ · §13.6) */
export const SHAPES = ['poster', 'wide', 'auto'];
export const DUAL = 'สองทรง';

/* ---------- ตัวช่วยระดับตัวอักษร ---------- */
const stripEmphasis = s => s.replace(/\*\*/g, '').replace(/`/g, '').trim();

/* เนื้อของหัวข้อหนึ่ง = บรรทัดหลังหัวข้อนั้น จนถึงหัวข้อถัดไป (ระดับใดก็ได้) */
function sectionOf(md, heading) {
  const lines = md.split('\n');
  const i = lines.findIndex(l => /^#{2,6}\s/.test(l) && l.includes(heading));
  if (i < 0) {
    throw new Error(`แกะ ${ADR_REL} ไม่ได้: ไม่พบหัวข้อที่มีข้อความ "${heading}" `
      + `— ถ้าสัญญาเปลี่ยนรูปของตาราง ให้ย้ายจุดแกะในตัวแกะให้ตรง ไม่ใช่ถอดด่านออก`);
  }
  const j = lines.findIndex((l, k) => k > i && /^#{2,6}\s/.test(l));
  return lines.slice(i + 1, j < 0 ? lines.length : j);
}

/* แถวของตาราง markdown · ตัดหัวตารางและเส้นคั่นออก คืนเป็นอาเรย์ของช่อง */
function tableRows(lines, heading) {
  const rows = lines
    .filter(l => l.trim().startsWith('|'))
    .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
  const body = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
  if (body.length < 2) {
    throw new Error(`แกะ ${ADR_REL} ไม่ได้: หัวข้อ "${heading}" ไม่มีตารางที่อ่านได้ `
      + `(พบ ${body.length} แถว) — ย้ายจุดแกะให้ตรง ไม่ใช่ถอดด่านออก`);
  }
  return body.slice(1);                     /* แถวแรกคือหัวตาราง */
}

/* selector ในช่อง "ที่วาง" — เอาเฉพาะโทเคนใน backtick ที่เป็นรูป CSS จริง
   (ขึ้นต้นด้วย `.` หรือ `#` แล้วต่อด้วยคลาส/ไอดี/ชื่อแท็กคั่นด้วยช่องว่าง)
   ⇒ `poster()` `coverImg()` `build/ui.mjs:99` `--ar-poster` `:495` ไม่ถูกหยิบมาเป็น selector
   หนึ่งช่องมีได้หลาย selector (แถว "รายการแจ้งเตือน · คลัง · รายการแบน" มีสาม) */
const SEL_RE = /^[.#][-\w.]+(?:\s+[.#]?[-\w.]+)*$/;
export function selectorsIn(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map(m => m[1].trim()).filter(s => SEL_RE.test(s));
}

/* ค่าในช่อง "ขอทรง" — `poster` | `wide` | `auto` | สองทรง (ฮีโร่)
   ช่องนี้มีถ้อยคำอื่นปนได้ (เช่น "**`poster`** · และ **ห้ามกรอง slug ด้วยทิศ**") */
function shapeIn(cell, where) {
  const flat = stripEmphasis(cell);
  if (flat.includes(DUAL)) return DUAL;
  const m = flat.match(/\b(poster|wide|auto)\b/);
  if (!m) {
    throw new Error(`แกะ ${ADR_REL} ไม่ได้: ช่อง "ขอทรง" ของแถว ${where} อ่านเป็นทรงไม่ได้ `
      + `→ ${JSON.stringify(cell)} (ต้องเป็น ${SHAPES.join(' | ')} หรือ "${DUAL}")`);
  }
  return m[1];
}

/* ชื่อไฟล์ในช่องที่สาม · **ตัดเลขบรรทัดออกตั้งแต่ตอนนี้** (กฎการแกะข้อ 2) */
const FILE_RE = /\bbuild\/[\w.-]+\.(?:mjs|js)\b/g;
function filesIn(cell) {
  return [...new Set((cell.match(FILE_RE) || []))];
}

/* ---------- ตัวแกะหลัก ---------- */
export function parseShapeTables(md) {
  const docProblems = [];

  const buildLines = sectionOf(md, H_BUILD);
  const buildRows = tableRows(buildLines, H_BUILD).map((r, i) => ({
    placement: stripEmphasis(r[0]),
    selectors: selectorsIn(r[0]),
    shape: shapeIn(r[1], `${H_BUILD} #${i + 1}`),
    files: filesIn(r[2] || ''),
  }));

  const appLines = sectionOf(md, H_APP);
  const appRows = tableRows(appLines, H_APP).map((r, i) => ({
    placement: stripEmphasis(r[0]),
    selectors: selectorsIn(r[0]),
    shape: shapeIn(r[1], `${H_APP} #${i + 1}`),
    files: filesIn(r[2] || ''),
  }));

  /* ตาราง `coverSlot()` ประกาศ **รายการชื่อ** ไม่ใช่จำนวน — สัญญาเขียนเหตุผลไว้เองว่าทำไม
     (`coverSlot(` นับไม่สะอาด: อยู่ในสตริง error ของ build/seo.mjs สองที่ และถูกเรียกข้างใน
     ตัวเลือกไฟล์เอง ⇒ ตัวนับที่ถอดแต่คอมเมนต์ได้ 7 ทั้งที่ที่วางจริงมี 2) */
  const slotLines = sectionOf(md, H_SLOT);
  const slotRows = tableRows(slotLines, H_SLOT).map((r, i) => {
    const where = `${H_SLOT} #${i + 1}`;
    const cell = r[2] || '';
    const call = cell.match(/coverSlot\(\s*\w+\s*,\s*'(poster|wide|auto)'\s*\)/);
    if (!call) {
      throw new Error(`แกะ ${ADR_REL} ไม่ได้: แถว ${where} ไม่ได้ประกาศจุดเรียก `
        + `\`coverSlot(<เรื่อง>, '<ทรง>')\` ในช่องไฟล์ → ${JSON.stringify(cell)}`);
    }
    const files = filesIn(cell);
    if (files.length !== 1) {
      throw new Error(`แกะ ${ADR_REL} ไม่ได้: แถว ${where} ต้องชี้ไฟล์เดียว แต่พบ ${files.length} `
        + `(${files.join(' · ')}) — ที่วางหนึ่งที่อยู่ในไฟล์เดียว`);
    }
    return {
      placement: stripEmphasis(r[0]),
      shape: shapeIn(r[1], where),
      file: files[0],
      callShape: call[1],
    };
  });

  /* ---------- หัวข้อ "จำนวนจุดเรียกต่อไฟล์" ---------- */
  const perFileLines = sectionOf(md, H_PERFILE);
  const perFile = {};
  let declaredTotal = null;
  for (const r of tableRows(perFileLines, H_PERFILE)) {
    const num = (stripEmphasis(r[1] || '').match(/\d+/) || [])[0];
    const file = filesIn(r[0] || '')[0];
    if (/รวม/.test(stripEmphasis(r[0] || '')) && !file) {
      declaredTotal = num == null ? null : Number(num);
      continue;
    }
    if (!file || num == null) {
      throw new Error(`แกะ ${ADR_REL} ไม่ได้: แถวของหัวข้อ "${H_PERFILE}" อ่านไม่ออก `
        + `→ ${JSON.stringify(r.join(' | '))}`);
    }
    perFile[file] = Number(num);
  }
  if (!Object.keys(perFile).length || declaredTotal == null) {
    throw new Error(`แกะ ${ADR_REL} ไม่ได้: หัวข้อ "${H_PERFILE}" ต้องมีทั้งแถวรายไฟล์และแถว "รวม"`);
  }
  const sum = Object.values(perFile).reduce((a, b) => a + b, 0);
  if (sum !== declaredTotal) {
    /* ไม่ throw — นี่คือความไม่ตรงกัน **ในเอกสาร** ซึ่งด่านต้องรายงานเป็นข้อตก ไม่ใช่ crash
       ที่ซ่อนข้ออื่นทั้งหมดไว้ข้างหลัง */
    docProblems.push(`§13.5 หัวข้อ "${H_PERFILE}": ผลรวมรายไฟล์ = ${sum} `
      + `แต่แถว "รวม" ประกาศ ${declaredTotal} — เอกสารไม่ตรงกับตัวเอง`);
  }

  /* จำนวนจุดเรียกฝั่งเบราว์เซอร์อยู่ในย่อหน้า ไม่ใช่ในตาราง ⇒ ยึดกับชื่อฟังก์ชันเป็นหลัก */
  const appM = perFileLines.join('\n').match(/`coverAttrs\(\)`[^*\n]*\*\*(\d+)\s*จุด\*\*/);
  if (!appM) {
    throw new Error(`แกะ ${ADR_REL} ไม่ได้: หัวข้อ "${H_PERFILE}" ไม่ได้ประกาศจำนวนจุดเรียก `
      + `\`coverAttrs()\` ฝั่งเบราว์เซอร์เป็นตัวเลขหนา`);
  }

  return {
    buildRows, appRows, slotRows,
    perFile, declaredTotal, appCallsites: Number(appM[1]),
    docProblems,
  };
}

/* ---------- เทียบสองทาง: ตาราง ⇄ SHAPE_MAP (กฎการแกะข้อ 3 + ข้อ 4) ----------
   (ก) ทุก selector ในตารางต้องมีใน `SHAPE_MAP` อย่างน้อยหนึ่งรายการ และ **ทุก** รายการของ
       selector นั้นต้องประกาศทรงเท่ากับช่อง "ขอทรง" — รายการใดต่างค่า = ล้ม
   (ข) ทุกรายการใน `SHAPE_MAP` ต้องสาวกลับถึงแถวในตารางได้ · สาวกลับไม่ได้ = ล้ม
       เพราะนั่นคือที่วางที่ไม่มีในสัญญา
   ห้ามเทียบ **จำนวนแถว** กับจำนวนรายการ: หนึ่งแถวจับได้หลายรายการ (selector เดียวกันหลายหน้า
   · `.player` แยกตามทิศ) ⇒ การเท่ากันของสองจำนวนนี้ไม่ใช่ข้อเท็จจริงของสัญญา */
export function shapeMapProblems(adr, shapeMap) {
  const out = [];
  /* ตารางของสัญญา → selector → ทรง (รวมสองตาราง เพราะที่วางฝั่ง build และฝั่งเบราว์เซอร์
     อยู่ในแผนที่เดียวกัน) · selector เดียวกันประกาศคนละทรงในสองแถว = สัญญาขัดกันเอง */
  const want = new Map();
  for (const row of [...adr.buildRows, ...adr.appRows]) {
    for (const sel of row.selectors) {
      const prev = want.get(sel);
      if (prev && prev.shape !== row.shape) {
        out.push(`§13.5 ประกาศทรงของ \`${sel}\` ขัดกันเองสองแถว: `
          + `"${prev.placement}" = ${prev.shape} · "${row.placement}" = ${row.shape}`);
        continue;
      }
      if (!prev) want.set(sel, { shape: row.shape, placement: row.placement });
    }
  }
  if (!want.size) {
    out.push(`§13.5 แกะ selector ไม่ได้แม้ตัวเดียว — ด่านนี้วัดอะไรไม่ได้ `
      + `⇒ แก้ตัวแกะให้ตรงกับรูปของตาราง ไม่ใช่ปล่อยให้มันเขียวเปล่า ๆ`);
    return out;
  }

  /* (ก) */
  for (const [sel, row] of want) {
    const hits = shapeMap.filter(p => p.sel === sel);
    if (!hits.length) {
      out.push(`สัญญามีที่วาง "${row.placement}" (\`${sel}\` ขอทรง ${row.shape}) `
        + `แต่ SHAPE_MAP ไม่มีรายการของ selector นี้เลย ⇒ ที่วางนั้นไม่ถูกวัด`);
      continue;
    }
    for (const p of hits) {
      /* กฎข้อ 4: "สองทรง" ไม่ใช่สตริงในแผนที่ แต่เป็นคู่ poster + wideAtBp */
      const ok = row.shape === DUAL
        ? (p.shape === 'poster' && p.wideAtBp === true)
        : p.shape === row.shape;
      if (!ok) {
        out.push(`ทรงไม่ตรงกับสัญญาที่ \`${sel}\` (รายการ "${p.key}"): §13.5 ว่า `
          + `${row.shape === DUAL ? `${DUAL} (= shape:'poster' + wideAtBp:true)` : row.shape}`
          + ` แต่แผนที่ประกาศ shape:'${p.shape}'`
          + `${row.shape === DUAL ? ` · wideAtBp=${JSON.stringify(p.wideAtBp)}` : ''}`);
      }
    }
  }

  /* (ข) */
  for (const p of shapeMap) {
    if (!want.has(p.sel)) {
      out.push(`SHAPE_MAP มีรายการ "${p.key}" (\`${p.sel}\`) ที่สาวกลับถึงแถวใน §13.5 ไม่ได้ `
        + `⇒ เป็นที่วางที่ไม่มีในสัญญา: ให้เพิ่มแถวในตาราง §13.5 (งานของ CTO) `
        + `หรือถอดที่วางนั้นออกจากเว็บ — ห้ามถอดรายการออกจากแผนที่เพื่อให้ด่านเขียว`);
    }
  }
  return out;
}

/* ---------- ตัวนับจุดเรียกในซอร์ส ----------
   อยู่ที่นี่เพราะมันคือ "วิธีนับของสัญญา" ไม่ใช่ของด่านใดด่านหนึ่ง ⇒ tools/test-layout.mjs กับ
   ci/adr-shape-table.test.mjs ต้องนับด้วยตัวเดียวกัน ไม่ใช่สองสำเนาที่ดริฟต์กันได้
   ถอดคอมเมนต์ **ทั้งสองแบบ** และไม่นับตัวนิยาม — คอมเมนต์บรรทัดเดียวที่เขียนชื่อฟังก์ชันไว้
   ทำให้ตัวนับเพี้ยนมาแล้ว (AIO-66 P3-2) */
export function countCallsIn(src, name) {
  return (stripComments(src).match(new RegExp(`(?<!function\\s)\\b${name}\\s*\\(`, 'g')) || []).length;
}

/* ---------- เลขรายไฟล์ของสัญญา ⇄ จำนวนจุดเรียกในซอร์สจริง (กฎการแกะข้อ 1) ----------
   `count(rel, name)` = ตัวนับของผู้เรียก (ควรเป็น `countCallsIn` ข้างบนห่อด้วยตัวอ่านไฟล์) */
export function callsiteProblems(adr, count) {
  const out = [];
  /* ชุดไฟล์ของสองที่ในสัญญาต้องเป็นชุดเดียวกัน — ถ้าที่วางย้ายไฟล์แล้วแก้แต่ตารางที่วาง
     (หรือแก้แต่ตารางเลขรายไฟล์) ด่านจะเห็นเลขของไฟล์ที่ไม่มีที่วาง และที่วางที่ไม่มีเลข */
  const rowFiles = new Set(adr.buildRows.flatMap(r => r.files));
  const numFiles = new Set(Object.keys(adr.perFile));
  for (const f of rowFiles) {
    if (!numFiles.has(f)) {
      out.push(`${f}: มีที่วางในตารางฝั่ง build ของ §13.5 แต่ไม่มีแถวในหัวข้อ "จำนวนจุดเรียกต่อไฟล์"`);
    }
  }
  for (const f of numFiles) {
    if (!rowFiles.has(f)) {
      out.push(`${f}: มีเลขในหัวข้อ "จำนวนจุดเรียกต่อไฟล์" แต่ไม่มีแถวที่วางใดใน §13.5 ชี้มาที่ไฟล์นี้`);
    }
  }
  for (const [file, want] of Object.entries(adr.perFile)) {
    /* ไฟล์ที่สัญญาอ้างแต่เปิดไม่ได้ ต้องเป็น **ข้อตกที่อ่านรู้เรื่อง** ไม่ใช่ ENOENT ที่ซ่อนข้ออื่น
       ทั้งหมดไว้ข้างหลัง (ชื่อไฟล์เป็นช่องที่ผูกพัน ⇒ พิมพ์ผิดในเอกสารก็ต้องแดงด้วยข้อความที่ถูก) */
    let got;
    try { got = count(file, 'coverImg'); }
    catch (e) {
      out.push(`${file}: §13.5 อ้างไฟล์นี้ในหัวข้อ "จำนวนจุดเรียกต่อไฟล์" แต่อ่านไฟล์ไม่ได้ — ${e.message}`);
      continue;
    }
    if (got !== want) {
      out.push(`${file}: §13.5 ประกาศจุดเรียก coverImg() ${want} จุด แต่นับในซอร์สได้ ${got} `
        + `⇒ เพิ่ม/ย้ายที่วางต้องแก้ทั้งตาราง §13.5 และ SHAPE_MAP · ห้ามแก้เลขในด่านอย่างเดียว`);
    }
  }
  const gotApp = count('build/app.src.js', 'coverAttrs');
  if (gotApp !== adr.appCallsites) {
    out.push(`build/app.src.js: §13.5 ประกาศจุดเรียก coverAttrs() ${adr.appCallsites} จุด `
      + `แต่นับได้ ${gotApp} ⇒ ท่อเบราว์เซอร์คือท่อที่ด่านซึ่งอ่าน HTML มองไม่เห็น (§13.1)`);
  }
  return out;
}

/* ---------- รายการที่วางของ `coverSlot()` ⇄ ซอร์สจริง ----------
   เทียบ **รายการ** ไม่ใช่จำนวน ตามที่สัญญาสั่ง · สองทาง:
     (ก) ทุกแถวที่สัญญาประกาศ ต้องมีจุดเรียกจริงในไฟล์ที่ระบุ ด้วยทรงที่ระบุ
     (ข) ไฟล์ที่มีจุดเรียก `coverSlot(` ต้องเป็นไฟล์ในรายการของสัญญา หรือเป็น **เจ้าของท่อ**
         (ตัวนิยาม/ตัวเลือกไฟล์) ⇒ ไฟล์ใหม่ที่เรียกตัวเลือกไฟล์ตรง ๆ โดยไม่มีแถวในสัญญา = ล้ม
   `read(rel)` คืนซอร์สของไฟล์ · `files` = รายชื่อไฟล์ที่ต้องกวาดในข้อ (ข)
   สองข้อนี้ถอดคอมเมนต์ไม่เท่ากันโดยเจตนา:
     ข้อ (ก) ถอด **คอมเมนต์** แล้วอ่านชื่อทรงจากอาร์กิวเมนต์จริง ⇒ ถอดสตริงด้วยไม่ได้
             เพราะชื่อทรงเองเป็นสตริง (`coverSlot(s, 'poster')`)
     ข้อ (ข) ถอด **คอมเมนต์ + สตริง** เพราะที่นี่สนใจแค่ "มีจุดเรียกไหม" และสัญญาเตือนไว้เองว่า
             build/seo.mjs มีคำว่า `coverSlot(` อยู่ในสตริงข้อความ error สองที่ */
export const SLOT_PIPE_OWNERS = ['build/seo.mjs', 'build/ui.mjs', 'build/app.src.js'];
export const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
export const stripCommentsAndStrings = src => stripComments(src)
  .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, '``')
  .replace(/'(?:\\.|[^'\\])*'/g, "''")
  .replace(/"(?:\\.|[^"\\])*"/g, '""');
export function slotProblems(adr, read, files) {
  const out = [];
  for (const row of adr.slotRows) {
    if (row.shape !== row.callShape) {
      out.push(`§13.5 แถว "${row.placement}": ช่อง "ขอทรง" = ${row.shape} `
        + `แต่จุดเรียกที่เขียนกำกับคือ coverSlot(…, '${row.callShape}') — เอกสารไม่ตรงกับตัวเอง`);
    }
    let src;
    try { src = read(row.file); }
    catch (e) {
      out.push(`${row.file}: §13.5 แถว "${row.placement}" อ้างไฟล์นี้ แต่อ่านไฟล์ไม่ได้ — ${e.message}`);
      continue;
    }
    const shapes = [...stripComments(src)
      .matchAll(/coverSlot\(\s*\w+\s*,\s*'(poster|wide|auto)'\s*\)/g)].map(m => m[1]);
    if (!shapes.includes(row.callShape)) {
      out.push(`${row.file}: §13.5 ประกาศที่วาง "${row.placement}" ที่เรียก `
        + `coverSlot(…, '${row.callShape}') ในไฟล์นี้ แต่หาจุดเรียกนั้นไม่เจอในซอร์ส `
        + `(ถอดคอมเมนต์ออกแล้ว · ที่เจอ: ${shapes.length ? shapes.join(' · ') : 'ไม่มีเลย'}) `
        + `⇒ ที่วางย้ายไฟล์/เปลี่ยนทรงแล้วแต่ตารางยังไม่ขยับตาม`);
    }
  }
  const allowed = new Set([...adr.slotRows.map(r => r.file), ...SLOT_PIPE_OWNERS]);
  for (const f of files) {
    if (allowed.has(f)) continue;
    if (/\bcoverSlot\s*\(/.test(stripCommentsAndStrings(read(f)))) {
      out.push(`${f}: มีจุดเรียก coverSlot() แต่ไม่มีแถวในตาราง "${H_SLOT}" ของ §13.5 `
        + `⇒ ที่วางที่ขอ URL เปล่า ๆ ก็ต้องประกาศทรงในสัญญา (เพิ่มแถว = งานของ CTO)`);
    }
  }
  return out;
}
