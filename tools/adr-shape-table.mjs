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

/* แถวที่ **ไม่ใช่กล่องที่ render** จึงไม่มี selector ได้โดยชอบ — ประกาศด้วยชื่อ ไม่ใช่ปล่อยว่าง
   (ดูเหตุผลที่จุดใช้ใน parseShapeTables · สัญญายังไม่ได้ล็อกคำนิยามนี้ ⇒ ขอ CTO ไว้แล้ว) */
export const NON_RENDER_ROWS = ['ภาพในเพลเยอร์ฟีดตอนเลื่อนเรื่อง'];

/* ---------- ตัวช่วยระดับตัวอักษร ---------- */
const stripEmphasis = s => s.replace(/\*\*/g, '').replace(/`/g, '').trim();

/* ---------- ถอดคอมเมนต์และ "ข้อความ" ออกจากซอร์ส JS ----------
   เดินทีละตัวอักษรด้วยสแต็กของโหมด ไม่ใช่ regex สี่ชั้น · สองรอยที่รูปแบบ regex เปิดไว้และ
   รีวิวรอบที่สี่วัดได้ทั้งคู่:
     · `const q = "\`";` (backtick เดี่ยวในสตริง) ทำให้ regex ของเทมเพลตจับคู่ข้ามโค้ดจริง
       แล้ว **กลืนจุดเรียกที่อยู่ระหว่างนั้นทิ้ง** ⇒ ด่านกวาดไฟล์ใหม่เงียบ (Reviewer-Claude ข 5)
     · `` `<img src="${coverSlot(s,'wide').src}">` `` ถูกลบทั้งก้อนรวม `${...}` ⇒ **จุดเรียกจริง**
       ที่อยู่ในนิพจน์แทรกหายไปจากสายตาของด่าน ทั้งที่มันคือรูปที่ renderer ใช้จริงทุกไฟล์
       (Reviewer-Codex R4) ⇒ เนื้อของ `${...}` ต้องถูกเก็บไว้เป็น **โค้ด** และซ้อนกันได้ไม่จำกัดชั้น
   กับดักที่ต้องรับมือด้วยเพราะมันอยู่ในไฟล์จริง: literal ของ regex (`/['"`]/`) ⇒ ถ้าอ่านเป็นตัว
   เปิดสตริง สแต็กจะเลื่อนทั้งไฟล์ · ตัดสินด้วยตัวอักษรที่ไม่ใช่ช่องว่างตัวก่อนหน้า ตามแบบที่
   tokenizer ของ JS ใช้ (ตำแหน่งที่ "คาดว่าเป็นนิพจน์" เท่านั้นที่ `/` เปิด regex ได้) */
const RE_ALLOWED_BEFORE = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', undefined]);
export function stripCommentsAndStrings(src) {
  let out = '';
  /* frame: { kind:'code'|'tmpl', depth } — `depth` คือวงเล็บปีกกาที่เปิดอยู่ในเฟรมโค้ดนั้น */
  const stack = [{ kind: 'code', depth: 0 }];
  const lastCode = () => {
    for (let k = out.length - 1; k >= 0; k--) if (!/\s/.test(out[k])) return out[k];
    return undefined;
  };
  let i = 0;
  while (i < src.length) {
    const f = stack[stack.length - 1];
    const c = src[i];
    if (f.kind === 'tmpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push({ kind: 'code', depth: 0 }); i += 2; out += ' '; continue; }
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; out += ' '; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += c + c;
      i = j + 1;
      continue;
    }
    if (c === '`') { stack.push({ kind: 'tmpl' }); out += '``'; i++; continue; }
    if (c === '/' && RE_ALLOWED_BEFORE.has(lastCode())) {
      /* literal ของ regex: ข้ามถึง `/` ที่ไม่ได้ถูก escape และไม่ได้อยู่ในคลาส [...] */
      let j = i + 1, inClass = false, closed = false;
      for (; j < src.length; j++) {
        const d = src[j];
        if (d === '\\') { j++; continue; }
        if (d === '\n') break;                       /* ขึ้นบรรทัดใหม่ = ไม่ใช่ regex */
        if (inClass) { if (d === ']') inClass = false; continue; }
        if (d === '[') { inClass = true; continue; }
        if (d === '/') { closed = true; break; }
      }
      if (closed) { out += ' '; i = j + 1; continue; }
    }
    if (c === '{') f.depth++;
    else if (c === '}') {
      if (f.depth === 0 && stack.length > 1) { stack.pop(); i++; out += ' '; continue; }
      f.depth--;
    }
    out += c;
    i++;
  }
  return out;
}

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

/* selector ในช่อง "ที่วาง" — โทเคนใน backtick ที่เป็นรูป CSS
   หนึ่งช่องมีได้หลาย selector (แถว "รายการแจ้งเตือน · คลัง · รายการแบน" มีสาม)

   ⚠️ ของเดิมคัดด้วย regex เส้นเดียวแล้ว **ทิ้งโทเคนที่อ่านไม่ออกอย่างเงียบ ๆ** ⇒ `>` และ
   attribute selector (ซึ่งสัญญาไม่ได้ห้าม และ §10.1 ของ UX ใช้อยู่จริง) หลุดออกจากการเทียบ
   ทั้งสองทางโดยไม่มีใครรู้ (Reviewer-Codex R5 · Reviewer-Claude P2) ⇒ ตอนนี้แยกเป็นสามกอง:
     · ไม่เหมือน selector เลย (`poster()` · `build/ui.mjs:99` · `:495` · `--ar-poster`) ⇒ ข้าม เงียบได้
     · เหมือน selector และแกะออก ⇒ ใช้เทียบ
     · **เหมือน selector แต่แกะไม่ออก ⇒ เป็นข้อตกของเอกสาร** ไม่ใช่ของที่หายไปเฉย ๆ */
const COMPOUND_RE = /^(?:[a-zA-Z][-\w]*)?(?:[.#][-\w]+|\[[^\]]+\]|::?[-\w]+(?:\([^)]*\))?)*$/;
/* "เหมือน selector" = ขึ้นต้นด้วย `.` `#` หรือ `[` — ทุกแถวของสัญญาวันนี้เขียนรูปนี้ทั้งหมด
   (ตั้งไว้แคบโดยเจตนา: โทเคนอย่าง `s.slug` หรือ `ImageObject` ในช่องเดียวกันต้องไม่กลาย
   เป็น "selector ที่แกะไม่ออก" ซึ่งจะเป็นข้อแดงของเอกสารที่ไม่ใช่ความผิดของเอกสาร ·
   ถ้าวันหน้าสัญญาเขียน `span.cls` แถวนั้นจะไม่มี selector เลย ⇒ ตกที่ข้อ "ทุกแถวที่วางต้องมี
   selector" ข้างล่าง ไม่ใช่หลุดเงียบ) */
const LOOKS_LIKE_SEL = /^[.#[]/;
export function selectorTokens(cell) {
  const selectors = [], unreadable = [];
  for (const m of cell.matchAll(/`([^`]+)`/g)) {
    const raw = m[1].trim();
    if (!LOOKS_LIKE_SEL.test(raw)) continue;
    const parts = raw.split(/\s*([>+~])\s*|\s+/).filter(Boolean);
    const ok = parts.length > 0 && parts.every(p => /^[>+~]$/.test(p) || COMPOUND_RE.test(p))
      && /[.#[]/.test(raw);
    (ok ? selectors : unreadable).push(raw);
  }
  return { selectors, unreadable };
}
export const selectorsIn = cell => selectorTokens(cell).selectors;

/* คลาสของ "กล่องที่ถือภาพ" = compound สุดท้ายของ selector ที่มีคลาส (ข้าม `span` ท้าย
   ของ `.btile .reelstrip span` ไปใช้ `.reelstrip`) · ใช้ผูกแถวกับไฟล์ที่สัญญาบอกว่า render มัน */
export function hostClasses(sel) {
  const parts = sel.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  for (let k = parts.length - 1; k >= 0; k--) {
    const cls = [...parts[k].matchAll(/\.([-\w]+)/g)].map(x => x[1]);
    if (cls.length) return cls;
  }
  return [];
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

  /* จำนวนจุดเรียกที่ **แถวเดียว** ประกาศ: ช่องไฟล์เขียนที่ตั้งของทุกจุดไว้ (`:489` · `:495`)
     ⇒ นับ *จำนวน* ที่ตั้ง ไม่ใช่เทียบค่าของมัน (กฎการแกะข้อ 2 ห้ามเทียบค่า ไม่ได้ห้ามนับ)
     แถวที่อ้างด้วยชื่อสัญลักษณ์ (บล็อก/ฟังก์ชัน) นับเป็น 1 ⇒ ใช้เทียบกับแถว "รวม" ของสัญญา
     ซึ่งเขียนเงื่อนไขนี้ไว้เองว่า "ต้องเท่ากับจำนวนแถวที่ตารางฝั่ง build ประกาศ (แถว
     'ตารางออกตอน' นับ 2)" — เฉลยอยู่ในสัญญาแล้ว ของเดิมแค่ไม่หยิบไปใช้ (Reviewer-Claude P2) */
  const markersIn = cell => Math.max(1, (cell.match(/:\d+/g) || []).length);

  const rowOf = (r, i, where) => {
    const { selectors, unreadable } = selectorTokens(r[0]);
    const placement = stripEmphasis(r[0]);
    for (const u of unreadable) {
      docProblems.push(`§13.5 แถว "${placement}" (${where} #${i + 1}): โทเคน \`${u}\` เขียนในรูป `
        + `selector แต่ตัวแกะอ่านไม่ออก ⇒ ถ้ามันคือ selector ให้แก้ตัวแกะให้รองรับ `
        + `ถ้าไม่ใช่ให้เอา backtick ออก — ห้ามปล่อยให้มันหายไปจากการเทียบเงียบ ๆ`);
    }
    return {
      placement,
      selectors,
      shape: shapeIn(r[1], `${where} #${i + 1}`),
      files: filesIn(r[2] || ''),
      callsites: markersIn(r[2] || ''),
    };
  };

  const buildLines = sectionOf(md, H_BUILD);
  const buildRows = tableRows(buildLines, H_BUILD).map((r, i) => rowOf(r, i, H_BUILD));

  const appLines = sectionOf(md, H_APP);
  const appRows = tableRows(appLines, H_APP).map((r, i) => rowOf(r, i, H_APP));

  /* ทุกแถว "ที่วาง" ต้องมี selector อย่างน้อยหนึ่งตัว ยกเว้นแถวที่ **ไม่ใช่กล่องที่ render**
     ซึ่งต้องถูกยกเว้น **โดยเขียนชื่อไว้ตรง ๆ** ไม่ใช่โดยการที่ช่องว่างแล้วเครื่องเดาเอง
     (ข้อนี้ผมเขียนไว้เองใน AIO-71 ว่าต้องมี แล้วไม่ได้ลง · ทั้งสองฝั่งรีวิวจับได้)
     ⚠️ สัญญายังไม่ได้ประกาศว่าแถวแบบนี้คืออะไร (Reviewer-Claude ค3 — ขอให้ CTO ล็อก)
        ⇒ รายการข้างล่างคือสิ่งที่ **ด่าน** รู้ และถ้ามันไม่ตรงกับเอกสารอีกต่อไป มันจะแดงเอง
        ทั้งสองทิศ: แถวใหม่ที่ไม่มี selector = แดง · ชื่อในรายการที่ไม่ตรงแถวไหนแล้ว = แดง */
  const used = new Set();
  for (const row of [...buildRows, ...appRows]) {
    if (row.selectors.length) continue;
    const hit = NON_RENDER_ROWS.find(x => row.placement.includes(x));
    if (hit) { used.add(hit); continue; }
    docProblems.push(`§13.5 แถว "${row.placement}" ไม่มี selector ให้เทียบเลย ⇒ ที่วางนั้นไม่ถูกวัด `
      + `· ถ้าเป็นกล่องที่ render จริง ให้เติม selector ในช่อง "ที่วาง" (งานของ CTO) `
      + `· ถ้าไม่ใช่กล่อง ให้ประกาศยกเว้นด้วยชื่อใน NON_RENDER_ROWS ของ tools/adr-shape-table.mjs`);
  }
  for (const x of NON_RENDER_ROWS) {
    if (!used.has(x)) {
      docProblems.push(`รายการยกเว้น "${x}" ของ tools/adr-shape-table.mjs ไม่ตรงกับแถวใดใน §13.5 `
        + `ที่ไม่มี selector แล้ว ⇒ เอกสารขยับแล้วแต่รายการยกเว้นยังอยู่ (รายการยกเว้นที่ค้าง `
        + `คือใบอนุญาตที่ไม่มีใครขอ)`);
    }
  }

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
  /* ยอดรวมของสัญญา ⇄ **จำนวนจุดเรียกที่ตารางที่วางประกาศ** — ปิดรอย "ลบแถวที่วางได้เงียบ ๆ
     เมื่อ selector ซ้ำกับแถวอื่น" (ทิศ ก ของ shapeMapProblems คีย์ด้วย selector ไม่ใช่แถว
     ⇒ ลบแถว `.ep-row .th` แถวใดแถวหนึ่งทิ้งแล้วไม่มีอะไรรู้สึก · Reviewer-Claude P2) */
  const rowCallsites = buildRows.reduce((n, r) => n + r.callsites, 0);
  if (declaredTotal != null && rowCallsites !== declaredTotal) {
    docProblems.push(`§13.5: แถว "รวม" ประกาศ ${declaredTotal} จุดเรียก แต่ตารางที่วางฝั่ง build `
      + `ประกาศที่ตั้งรวม ${rowCallsites} จุด (${buildRows.length} แถว) — สองที่ในเอกสารไม่ตรงกัน `
      + `⇒ สาเหตุที่พบบ่อยคือ **ลบ/เพิ่มแถวที่วางแล้วไม่แก้ยอดรวม** · ถ้าเอกสารถอดเลขบรรทัดออก `
      + `ตามที่รีวิวเสนอ ให้สัญญาประกาศ "จำนวนจุดเรียก" เป็นช่องของแถวแทนการนับที่ตั้ง `
      + `(ขอไว้ที่ AIO-71) — ห้ามแก้ด้วยการถอดด่านนี้ออก`);
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
  /* ถอด **สตริงด้วย** ไม่ใช่แค่คอมเมนต์: `const msg = "coverImg(";` ทำให้เลขรายไฟล์เท่าเดิมได้
     ทั้งที่จุดเรียกจริงถูกลบไปแล้ว (Reviewer-Claude ข 1) · สัญญาเตือนภัยชนิดนี้ไว้เองสำหรับ
     `coverSlot(` ⇒ ความไม่สมมาตรเดิมไม่มีเหตุผลรองรับ */
  return (stripCommentsAndStrings(src).match(new RegExp(`(?<!function\\s)\\b${name}\\s*\\(`, 'g')) || []).length;
}

/* ---------- เลขรายไฟล์ของสัญญา ⇄ จำนวนจุดเรียกในซอร์สจริง (กฎการแกะข้อ 1) ----------
   `count(rel, name)` = ตัวนับของผู้เรียก (ควรเป็น `countCallsIn` ข้างบนห่อด้วยตัวอ่านไฟล์) */
export const APP_REL = 'build/app.src.js';

/* คลาสนี้ถูก render **ในไฟล์นี้** ไหม — มองหาคลาสในบริบท `class=…` ของมาร์กอัปที่ไฟล์นั้นพ่น
   (ไม่ใช่ "มีคำนี้อยู่ที่ไหนก็ได้ในไฟล์" ซึ่งจะเขียวให้กับไฟล์ที่แค่พูดถึงมัน) */
const rendersClass = (src, cls) =>
  new RegExp(`class\\s*=\\s*["'\`][^"'\`]{0,200}\\b${cls}\\b`).test(stripComments(src));

export function callsiteProblems(adr, count, read, files) {
  const out = [];
  if (typeof read !== 'function' || !Array.isArray(files)) {
    throw new Error('callsiteProblems ต้องได้ทั้ง read() และรายชื่อไฟล์ที่ต้องกวาด — '
      + 'สองข้อนั้นคือทิศ (ข) ของด่านนี้ (ไฟล์ที่มีจุดเรียกแต่ไม่มีแถว) ⇒ เรียกแบบไม่ส่งมา '
      + 'คือการปิดครึ่งหนึ่งของด่านเงียบ ๆ');
  }

  /* ---------- (ก) แถว ⇄ ไฟล์ที่แถวนั้นอ้าง (กฎการแกะข้อ 1: **ชื่อไฟล์** เป็นช่องที่ผูกพัน) ----------
     ของเดิมเทียบแต่ "ชุดไฟล์" กับ "เลขรายไฟล์" ⇒ ย้ายชื่อไฟล์ของแถวหนึ่งไปเป็นไฟล์อื่นที่อยู่ใน
     ตารางแล้ว ด่านไม่รู้สึกเลย (Reviewer-Codex R3 · วัดด้วยแถว `.card .poster` → pages-watch)
     ⇒ ผูกด้วยของที่วัดได้และไม่ใช่เลขบรรทัด: ไฟล์ที่แถวอ้าง ต้อง render คลาสของกล่องที่ถือภาพ */
  const hostRows = [
    ...adr.buildRows.map(r => ({ row: r, files: r.files })),
    /* ตารางฝั่งเบราว์เซอร์ประกาศไฟล์ไว้ที่หัวตารางของมันเอง (`build/app.src.js` = `assets/app.js`)
       ⇒ ช่องที่สามของแถวเป็นที่ตั้ง ไม่ใช่ชื่อไฟล์ */
    ...adr.appRows.map(r => ({ row: r, files: r.files.length ? r.files : [APP_REL] })),
  ];
  for (const { row, files: rowFiles } of hostRows) {
    const src = new Map();
    for (const f of rowFiles) {
      try { src.set(f, read(f)); }
      catch (e) { out.push(`${f}: §13.5 แถว "${row.placement}" อ้างไฟล์นี้ แต่อ่านไฟล์ไม่ได้ — ${e.message}`); }
    }
    const hostedBy = sel => [...src.entries()]
      .filter(([, s]) => hostClasses(sel).length && hostClasses(sel).every(c => rendersClass(s, c)))
      .map(([f]) => f);
    for (const sel of row.selectors) {
      if (!src.size) continue;
      if (!hostedBy(sel).length) {
        out.push(`§13.5 แถว "${row.placement}": \`${sel}\` ไม่ถูก render ในไฟล์ที่แถวนี้อ้าง `
          + `(${rowFiles.join(' · ')}) — หาคลาส ${hostClasses(sel).map(c => `"${c}"`).join('+')} `
          + `ในบริบท class= ของไฟล์นั้นไม่เจอ ⇒ ที่วางย้ายไฟล์แล้วแต่ตารางยังชี้ที่เดิม `
          + `หรือ selector ในแถวไม่ใช่ของจริง`);
      }
    }
    for (const f of rowFiles) {
      if (!src.has(f) || !row.selectors.length) continue;
      if (!row.selectors.some(sel => hostedBy(sel).includes(f))) {
        out.push(`${f}: §13.5 แถว "${row.placement}" อ้างไฟล์นี้ แต่ไฟล์นี้ไม่ render selector ใด `
          + `ของแถวเลย (${row.selectors.join(' · ')}) ⇒ ชื่อไฟล์ในแถวไม่ตรงกับของจริง`);
      }
    }
  }

  /* ---------- (ข) ไฟล์ที่ **มีจุดเรียกแต่ไม่มีแถว** ----------
     หัวข้อ "จำนวนจุดเรียกต่อไฟล์" มีไว้ปิดภัย "ย้ายจุดเรียกข้ามไฟล์แล้วยอดรวมเท่าเดิม" แต่ของเดิม
     วนแต่ไฟล์ที่สัญญาลิสต์ ⇒ ย้าย **ออกไปไฟล์ที่ไม่ได้ลิสต์** ไม่ถูกวัดเลย (Reviewer-Claude P2)
     ⇒ กวาดแบบเดียวกับที่ทิศ (ข) ของ slotProblems ทำอยู่แล้ว · เจ้าของท่อ (ตัวนิยาม) ไม่นับ */
  /* ⚠️ ที่นี่ **ไม่** ยกเว้น SLOT_PIPE_OWNERS — นั่นเป็นรายการของท่อ `coverSlot()` ไม่ใช่ของ
     `coverImg()`/`coverAttrs()` · ถ้ายกเว้นมันด้วย การเติม `coverImg(` ลง build/seo.mjs
     (เคสที่ทั้งสองฝั่งรีวิววัดแล้วว่าเขียว) จะยังเขียวอยู่ · ตัวนิยามของสองฟังก์ชันนี้ไม่ถูกนับ
     อยู่แล้วที่ countCallsIn ⇒ ไม่ต้องมีรายการยกเว้นเพิ่ม */
  const listed = new Set([...Object.keys(adr.perFile), APP_REL]);
  for (const f of files) {
    if (listed.has(f)) continue;
    let n = 0;
    try { n = count(f, 'coverImg') + count(f, 'coverAttrs'); }
    catch { continue; }                     /* ไฟล์ในรายการกวาดที่เปิดไม่ได้ ไม่ใช่เรื่องของข้อนี้ */
    if (n > 0) {
      out.push(`${f}: มีจุดเรียกตัวเลือกภาพ ${n} จุด แต่ไม่มีแถวในหัวข้อ "จำนวนจุดเรียกต่อไฟล์" `
        + `ของ §13.5 ⇒ ที่วางย้ายมาอยู่ไฟล์ใหม่โดยยอดรวมเท่าเดิมได้ ซึ่งเป็นภัยที่หัวข้อนั้น `
        + `เขียนเองว่ามีไว้ปิด (เพิ่มแถว = งานของ CTO · ห้ามถอดไฟล์ออกจากรายการกวาด)`);
    }
  }
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
  /* ---------- ทิศ (ข) · นับ **จุดเรียก** ไม่ใช่อนุญาตทั้งไฟล์ ----------
     ของเดิมใส่ไฟล์ของทุกแถวไว้ใน allowlist ⇒ เติมจุดเรียกใหม่ลงไฟล์ที่มีแถวอยู่แล้วก็เขียว
     ทั้งที่มันคือที่วางใหม่ที่ไม่มีแถว (Reviewer-Codex R4 เคส new-slot-same-file)
     ⇒ ไฟล์ที่ไม่ใช่เจ้าของท่อ: **จำนวนจุดเรียกต่อ (ไฟล์, ทรง) ต้องเท่ากับที่สัญญาประกาศ**
     เจ้าของท่อเรียกตัวเลือกไฟล์จากข้างใน (ท่อ ไม่ใช่ที่วาง) ⇒ นับไม่ได้ จึงยกเว้นด้วยชื่อ
     และ **รายการยกเว้นต้องไม่ค้าง**: เจ้าของท่อที่ไม่มีจุดเรียกเลย = รายการที่หมดอายุ */
  const owners = new Set(SLOT_PIPE_OWNERS);
  const declared = new Map();                 /* `${file}|${shape}` → จำนวนแถว */
  for (const r of adr.slotRows) {
    const k = `${r.file}|${r.callShape}`;
    declared.set(k, (declared.get(k) || 0) + 1);
  }
  const seen = new Map();
  for (const f of files) {
    let src;
    try { src = read(f); } catch { continue; }
    const bare = stripCommentsAndStrings(src);
    const total = (bare.match(/\bcoverSlot\s*\(/g) || []).length;
    const shaped = [...stripComments(src).matchAll(/\bcoverSlot\s*\(\s*\w+\s*,\s*'(poster|wide|auto)'\s*\)/g)]
      .map(m => m[1]);
    const anyCall = total > 0;
    if (owners.has(f)) {
      if (!anyCall) {
        out.push(`${f}: อยู่ในรายการ "เจ้าของท่อ coverSlot()" ของ tools/adr-shape-table.mjs `
          + `แต่ไม่มีจุดเรียกเลย ⇒ รายการยกเว้นค้างอยู่หลังจากท่อย้ายไปที่อื่นแล้ว`);
      }
      continue;
    }
    for (const shape of new Set(shaped)) {
      const got = shaped.filter(s => s === shape).length;
      const want = declared.get(`${f}|${shape}`) || 0;
      seen.set(`${f}|${shape}`, got);
      if (got !== want) {
        out.push(`${f}: มีจุดเรียก coverSlot(…, '${shape}') ${got} จุด แต่ตาราง "${H_SLOT}" `
          + `ของ §13.5 ประกาศ ${want} แถวสำหรับคู่นี้ ⇒ ที่วางที่ขอ URL เปล่า ๆ ก็ต้องประกาศทรง `
          + `ในสัญญา (เพิ่ม/ลบแถว = งานของ CTO · ห้ามถอดไฟล์ออกจากรายการกวาด)`);
      }
    }
    /* จุดเรียกที่อ่านทรงไม่ออก (ส่งทรงมาเป็นตัวแปร) ในไฟล์ที่ไม่ใช่เจ้าของท่อ = ที่วางที่สัญญา
       ไม่มีทางประกาศทรงให้ได้ ⇒ ต้องแดง ไม่ใช่ข้ามเพราะ regex จับไม่ได้ */
    if (anyCall && total > shaped.length) {
      out.push(`${f}: มีจุดเรียก coverSlot() ที่ไม่ได้ส่งชื่อทรงเป็นค่าคงที่ (${total - shaped.length} จุด) `
        + `และไฟล์นี้ไม่ใช่เจ้าของท่อ ⇒ สัญญาประกาศทรงของที่วางนั้นไม่ได้ `
        + `· ที่วางต้องขอทรงตรง ๆ ('poster'/'wide'/'auto') ไม่ใช่ส่งต่อตัวแปร`);
    }
  }
  for (const [k, want] of declared) {
    if (!seen.has(k) && !owners.has(k.split('|')[0])) {
      const [f, shape] = k.split('|');
      out.push(`${f}: §13.5 ประกาศ ${want} แถวของ coverSlot(…, '${shape}') ในไฟล์นี้ `
        + `แต่ไฟล์นี้ไม่อยู่ในรายการกวาด หรือไม่มีจุดเรียกชนิดนั้นเลย`);
    }
  }
  return out;
}
