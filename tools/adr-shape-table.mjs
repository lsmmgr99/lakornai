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

/* ---------- โทเคนไนเซอร์เล็ก ๆ ของ JS — จุดเดียวที่ไฟล์นี้ตัดสินว่า "ตัวไหนเป็นโค้ด" ----------
   เดินทีละตัวอักษรด้วยสแต็กของโหมด ไม่ใช่ regex สี่ชั้น · สี่รอยที่รูปแบบเดิมเปิดไว้ และรีวิว
   วัดได้ทุกข้อ:
     · `const q = "\`";` (backtick เดี่ยวในสตริง) ทำให้ regex ของเทมเพลตจับคู่ข้ามโค้ดจริง
       แล้ว **กลืนจุดเรียกที่อยู่ระหว่างนั้นทิ้ง** ⇒ ด่านกวาดไฟล์ใหม่เงียบ (รอบที่สี่ · ปิดแล้ว)
     · `` `<img src="${coverSlot(s,'wide').src}">` `` ถูกลบทั้งก้อนรวม `${...}` ⇒ **จุดเรียกจริง**
       ที่อยู่ในนิพจน์แทรกหายไปจากสายตาของด่าน (รอบที่สี่ · ปิดแล้ว)
     · **regex ที่อยู่หลังคีย์เวิร์ด** (`return /["']/;` · `if (x) /["']/.test(y);`) ถูกอ่านเป็น
       การหาร แล้ว quote ตัวแรกข้างในเปิดสตริงที่ไม่มีวันปิด ⇒ **กลืนไฟล์ที่เหลือทั้งไฟล์**
       และตัวนับได้ 0 แบบเงียบ ๆ (รอบที่ห้า · Reviewer-Codex R2 · Reviewer-Claude ก8)
       ⇒ ของเดิมดู "ตัวอักษรก่อนหน้า" ซึ่งไม่พอ: ต้องรู้ **โทเคน** ก่อนหน้า (คีย์เวิร์ด? `)` ของ
       `if`? ตัวแปร?) ตามแบบที่ tokenizer ของ JS ใช้
     · การนับและการอ่านอาร์กิวเมนต์ของ `coverSlot()` ใช้ซอร์สที่ถอดไม่เท่ากัน ⇒ **ข้อความใน
       สตริงสวมรอยเป็นจุดเรียกตามสัญญา** และ `coverSlot?.(` หลุดทั้งคู่ (Reviewer-Codex R3)
       ⇒ ที่นี่คืน "รายการจุดเรียก" ที่มาจากการเดินครั้งเดียว พร้อมอาร์กิวเมนต์ของมัน

   ผลที่คืน: `code` = ซอร์สที่ **ความยาวเท่าเดิม** โดยเนื้อของคอมเมนต์/สตริง/regex กลายเป็น
   ช่องว่าง (ดัชนีจึงตรงกับซอร์สจริง) · `calls` = จุดเรียกทุกจุดที่อยู่ในโค้ด พร้อม
   `{ name, optional, args, fn, isDefinition }` โดย `fn` = ชื่อฟังก์ชันที่ห่อจุดเรียกนั้นอยู่
   (ใช้ผูก "ท่อ" กับ "ที่วาง" ให้แคบกว่าระดับไฟล์) */
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete',
  'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const CONTROL_WORD = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
const NOT_A_CALLEE = new Set([...CONTROL_WORD, 'function', 'return', 'typeof', 'new', 'delete',
  'void', 'throw', 'case', 'do', 'else', 'yield', 'await', 'in', 'of', 'instanceof', 'super',
  'import', 'set', 'get']);
const OPS = ['...', '===', '!==', '**=', '&&=', '||=', '??=', '==', '!=', '<=', '>=', '=>', '&&',
  '||', '??', '?.', '++', '--', '**', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '<<', '>>'];

export function scanJs(src) {
  const mask = src.split('');
  const blank = (a, b) => {
    for (let k = a; k < b && k < src.length; k++) if (src[k] !== '\n') mask[k] = ' ';
  };
  const calls = [];
  const frames = [{ kind: 'code' }];
  /* สแต็กของวงเล็บ: จำว่า `(` ตัวนี้เป็นของ `if`/`for`/… (⇒ `/` หลัง `)` เปิด regex ได้)
     และชื่อที่อยู่ก่อน `(` (⇒ ใช้ตั้งชื่อ scope ของ method shorthand / ตัวนิยาม) */
  const parens = [];
  const scopes = [];                 /* { name } — ปีกกาทุกตัวนับเป็นหนึ่งชั้น */
  let prev = { kind: 'start', word: '' };
  let pendingFn = null;              /* ชื่อหลังคำว่า `function` (อาจเป็น '' = anonymous) */
  let expectFnName = false;
  let assignName = null;             /* ชื่อตัวแปรที่เพิ่งถูก `=` (ใช้กับ arrow function) */
  let lastParenName = null;          /* ชื่อที่อยู่ก่อนวงเล็บที่ปิดล่าสุด */
  let afterArrow = false;
  const regexAllowed = () => {
    switch (prev.kind) {
      case 'start': return true;
      case 'word': return REGEX_AFTER_WORD.has(prev.word);
      case 'num': case 'str': case 'regex': case 'bracket': return false;
      case 'paren': return prev.control === true;
      case 'brace': return true;                 /* `}` ของบล็อก (ประมาณ) */
      default: return prev.word !== '++' && prev.word !== '--';
    }
  };

  let i = 0;
  while (i < src.length) {
    const f = frames[frames.length - 1];
    const c = src[i];
    if (f.kind === 'tmpl') {
      if (c === '\\') { blank(i, i + 2); i += 2; continue; }
      if (c === '`') { blank(i, i + 1); frames.pop(); prev = { kind: 'str', word: '`' }; i++; continue; }
      if (c === '$' && src[i + 1] === '{') {
        blank(i, i + 2);
        /* จำจำนวนชั้นปีกกาที่เปิดอยู่ตอนเข้า `${` ⇒ `}` ที่ปิดนิพจน์แทรกคือตัวที่ทำให้
           ชั้นกลับมาเท่าเดิม (ไม่ใช่ `}` ตัวแรกที่เจอ ซึ่งอาจเป็นปีกกาของบล็อกข้างใน) */
        frames.push({ kind: 'code', interp: true, baseScopes: scopes.length });
        prev = { kind: 'punct', word: '(' };
        i += 2;
        continue;
      }
      blank(i, i + 1);
      i++;
      continue;
    }
    /* ช่องว่างไม่ใช่โทเคน — ถ้าปล่อยให้มันทับ `prev` คำตอบของ "โทเคนก่อนหน้าคืออะไร" จะเป็น
       ช่องว่างตลอด แล้วทั้ง regex-vs-หาร และการจำชื่อตัวแปรหลัง `=` พังเงียบ ๆ */
    if (/\s/.test(c)) { i++; continue; }
    /* คอมเมนต์ — ไม่เปลี่ยนโทเคนก่อนหน้า (regex หลังคอมเมนต์ยังรู้ว่าตามหลังอะไร) */
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? src.length : e + 2;
      blank(i, end); i = end; continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? src.length : e;
      blank(i, end); i = end; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      blank(i, j + 1);
      i = j + 1;
      prev = { kind: 'str', word: c };
      continue;
    }
    if (c === '`') {
      /* เทมเพลตที่ถูกตั้งชื่อด้วย `const <ชื่อ> = \`…\`` เป็น **บล็อกที่สัญญาอ้างด้วยชื่อ** ได้
         (§13.5 อ้าง "บล็อก `feedBlock`" ซึ่งเป็น const ที่ถือมาร์กอัป ไม่ใช่ฟังก์ชัน)
         ⇒ จดชื่อไว้กับเฟรม เพื่อให้จุดเรียกข้างในนิพจน์แทรกสาวกลับถึงชื่อนั้นได้ */
      blank(i, i + 1);
      frames.push({ kind: 'tmpl', name: assignName });
      i++;
      continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, inClass = false, closed = false;
      for (; j < src.length; j++) {
        const d = src[j];
        if (d === '\\') { j++; continue; }
        if (d === '\n') break;                       /* ขึ้นบรรทัดใหม่ = ไม่ใช่ regex */
        if (inClass) { if (d === ']') inClass = false; continue; }
        if (d === '[') { inClass = true; continue; }
        if (d === '/') { closed = true; break; }
      }
      if (closed) {
        blank(i, j + 1);
        i = j + 1;
        prev = { kind: 'regex', word: '/' };
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (expectFnName) { pendingFn = word; expectFnName = false; }
      else if (word === 'function') { expectFnName = true; pendingFn = ''; }
      i = j;
      prev = { kind: 'word', word };
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w.]/.test(src[j])) j++;
      i = j;
      prev = { kind: 'num', word: '' };
      continue;
    }
    if (c === '(') {
      /* ชื่อที่อยู่ก่อน `(` — อ่านจาก mask (⇒ ข้อความในสตริงไม่มีวันเป็นชื่อฟังก์ชัน)
         รองรับ `name?.(` ตามสเปก optional call ซึ่ง regex ของเดิมมองไม่เห็น (R3 ข้อ 3) */
      let k = i - 1;
      const skipWs = () => { while (k >= 0 && /\s/.test(mask[k])) k--; };
      skipWs();
      let optional = false;
      if (k >= 1 && mask[k] === '.' && mask[k - 1] === '?') { optional = true; k -= 2; skipWs(); }
      let name = '';
      if (k >= 0 && /[\w$]/.test(mask[k])) {
        let s = k;
        while (s >= 0 && /[\w$]/.test(mask[s])) s--;
        name = src.slice(s + 1, k + 1);
        /* `obj.method(` ⇒ ชื่อคือ `method` · ตัวนิยามคือรูป `function name(` */
        let b = s;
        while (b >= 0 && /\s/.test(mask[b])) b--;
        const beforeWord = (() => {
          if (b < 0) return '';
          if (!/[\w$]/.test(mask[b])) return mask[b];
          let t = b;
          while (t >= 0 && /[\w$]/.test(mask[t])) t--;
          return src.slice(t + 1, b + 1);
        })();
        if (/^[A-Za-z_$][\w$]*$/.test(name) && !NOT_A_CALLEE.has(name)) {
          calls.push({
            name, optional, open: i, index: s + 1,
            definedWith: beforeWord,
            fn: [...scopes].reverse().find(x => x.name)?.name || null,
            /* ชื่อของ **ทุกชั้น** ที่ห่อจุดเรียกนี้ (ฟังก์ชัน · เทมเพลตที่ตั้งชื่อ) ⇒ สัญญาอ้าง
               ชั้นไหนก็สาวกลับได้ · ชั้นในสุดมักเป็นชื่อ callback (`map`/`slice`) ซึ่งไม่ใช่ชื่อ
               ที่สัญญาอ้าง ⇒ การผูกต้องใช้ทั้งโซ่ ไม่ใช่ชั้นในสุด (วัดแล้วก่อนเขียนกฎ) */
            fnChain: [...new Set([
              ...frames.filter(x => x.kind === 'tmpl' && x.name).map(x => x.name),
              ...scopes.filter(x => x.name).map(x => x.name),
            ])],
          });
        }
      }
      parens.push({ control: prev.kind === 'word' && CONTROL_WORD.has(prev.word), name });
      lastParenName = name || null;
      i++;
      prev = { kind: 'punct', word: '(' };
      continue;
    }
    if (c === ')') {
      const p = parens.pop();
      lastParenName = (p && p.name) || null;
      i++;
      prev = { kind: 'paren', word: ')', control: !!(p && p.control) };
      continue;
    }
    if (c === '[') { parens.push({ control: false, name: '' }); i++; prev = { kind: 'punct', word: '[' }; continue; }
    if (c === ']') { parens.pop(); i++; prev = { kind: 'bracket', word: ']' }; continue; }
    if (c === '{') {
      const name = pendingFn || (afterArrow ? (assignName || lastParenName) : lastParenName) || null;
      scopes.push({ name });
      pendingFn = null;
      afterArrow = false;
      i++;
      prev = { kind: 'punct', word: '{' };
      continue;
    }
    if (c === '}') {
      if (f.interp && scopes.length === f.baseScopes) {
        blank(i, i + 1); frames.pop(); i++; prev = { kind: 'str', word: '}' };
        continue;
      }
      if (scopes.length) scopes.pop();
      i++;
      prev = { kind: 'brace', word: '}' };
      continue;
    }
    /* ตัวดำเนินการหลายตัวอักษร — ต้องอ่านเป็นโทเคนเดียว ไม่งั้น `=>` กลายเป็น `=` แล้ว `>` */
    const op = OPS.find(o => src.startsWith(o, i));
    if (op) {
      if (op === '=>') afterArrow = true;
      i += op.length;
      prev = { kind: 'punct', word: op };
      continue;
    }
    if (c === '=') { if (prev.kind === 'word') assignName = prev.word; i++; prev = { kind: 'punct', word: '=' }; continue; }
    /* `ชื่อ:` ของอ็อบเจกต์ก็ตั้งชื่อให้ของที่ตามมาได้ — §13.5 อ้าง "จุดเรียกใน `hasPart`"
       ซึ่งเป็นคีย์ของ JSON-LD ไม่ใช่ฟังก์ชัน (ternary/label ก็มาทางนี้ ⇒ ชื่อที่ได้อาจไม่ใช่
       สัญลักษณ์จริง · ไม่เป็นไร เพราะชื่อถูกใช้แค่ตอน "สัญญาอ้างชื่อนี้ไหม" ไม่ได้ใช้ตัดสินเอง) */
    if (c === ':') { if (prev.kind === 'word') assignName = prev.word; i++; prev = { kind: 'punct', word: ':' }; continue; }
    if (c === ';' || c === ',') { afterArrow = false; i++; prev = { kind: 'punct', word: c }; continue; }
    i++;
    prev = { kind: 'punct', word: c };
    continue;
  }

  /* อาร์กิวเมนต์ของแต่ละจุดเรียก — หาปลายวงเล็บจาก `code` (วงเล็บในสตริงถูกลบไปแล้ว)
     ⇒ การนับจุดเรียกและการอ่าน "ทรงที่ขอ" มาจาก **ชุดเดียวกัน** ตามที่ R3 สั่ง */
  const code = mask.join('');
  for (const call of calls) {
    const parts = [];
    let depth = 0, start = call.open + 1, end = -1;
    for (let k = call.open; k < code.length; k++) {
      const d = code[k];
      if (d === '(' || d === '[' || d === '{') depth++;
      else if (d === ')' || d === ']' || d === '}') {
        depth--;
        if (depth === 0) { parts.push(src.slice(start, k)); end = k; break; }
      } else if (d === ',' && depth === 1) { parts.push(src.slice(start, k)); start = k + 1; }
    }
    call.close = end;
    call.args = end < 0 ? [] : parts.map(s => s.trim()).filter((s, n) => !(n === 0 && !s));
    call.isDefinition = call.definedWith === 'function';
    if (!call.isDefinition && end >= 0) {
      /* method shorthand ของอ็อบเจกต์ (`{ coverImg(s) {} }`) ก็เป็นตัวนิยาม ไม่ใช่จุดเรียก —
         ของเดิมกันแต่ `function\s` ด้วย lookbehind ความยาวคงที่ ⇒ `function  name(` (สองช่องว่าง)
         และรูป shorthand นับเป็นจุดเรียก (Reviewer-Claude ก8 ท่อนท้าย) */
      let k = end + 1;
      while (k < code.length && /\s/.test(code[k])) k++;
      if (code[k] === '{' && ['{', ',', ';', ''].includes(call.definedWith)) call.isDefinition = true;
    }
  }
  return { code, calls };
}

/* ถอดคอมเมนต์ + สตริงออกจากซอร์ส (คงความยาวเดิม) — ยังคงชื่อเดิมไว้เพราะเป็นของที่ด่านอื่น
   และเทสต์เรียกใช้ · เนื้อของ `${...}` ยังเป็นโค้ด */
export const stripCommentsAndStrings = src => scanJs(src).code;

/* จุดเรียกจริงของฟังก์ชันชื่อ `name` (ไม่รวมตัวนิยาม) */
export const callSitesIn = (src, name) =>
  scanJs(src).calls.filter(c => c.name === name && !c.isDefinition);

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
   หนึ่งช่องมีได้หลาย selector — แถวที่เขียนอย่างนั้นใน §13.5 วันนี้คือแถวการ์ดตอนถัดไป/
   การ์ดจบเรื่อง ที่ตั้งชื่อ `.nextup .thumb` กับ `.endcard .ec-next .thumb` ไว้ในช่องเดียวกัน
   (ตัวอย่างเดิมของคอมเมนต์นี้คือแถวถุงรวมของรายการแจ้งเตือน/คลัง ซึ่ง AIO-77 แตกเป็นแถว
   ต่อที่วางไปแล้ว ⇒ แถวนั้นไม่มีอยู่อีก · และไม่เขียนจำนวนกำกับไว้ เพราะรูปของตารางเปลี่ยนได้
   ทุกใบงาน — ที่นี่อ้างด้วยชื่อ selector ซึ่งเป็นของที่ตัวแกะอ่านเองได้)

   ⚠️ ของเดิมคัดด้วย regex เส้นเดียวแล้ว **ทิ้งโทเคนที่อ่านไม่ออกอย่างเงียบ ๆ** ⇒ `>` และ
   attribute selector (ซึ่งสัญญาไม่ได้ห้าม และ §10.1 ของ UX ใช้อยู่จริง) หลุดออกจากการเทียบ
   ทั้งสองทางโดยไม่มีใครรู้ (Reviewer-Codex R5 · Reviewer-Claude P2) ⇒ ตอนนี้แยกเป็นสามกอง:
     · ไม่เหมือน selector เลย (`poster()` · `build/ui.mjs:99` · `:495` · `--ar-poster`) ⇒ ข้าม เงียบได้
     · เหมือน selector และแกะออก ⇒ ใช้เทียบ
     · **เหมือน selector แต่แกะไม่ออก ⇒ เป็นข้อตกของเอกสาร** ไม่ใช่ของที่หายไปเฉย ๆ */
const COMPOUND_RE = /^(?:[a-zA-Z][-\w]*)?(?:[.#][-\w]+|\[[^\]]+\]|::?[-\w]+(?:\([^)]*\))?)+$|^[a-zA-Z][-\w]*$/;
/* "เหมือน selector" = ขึ้นต้นด้วย `.` `#` `[` **หรือ** ชื่อแท็ก HTML ที่ตามด้วย `.`/`#`/`[`/`:`
   (`span.clip` · `div.newslot` · `a[href]`) — ของเดิมตัดสินจากตัวอักษรตัวแรกเท่านั้น ⇒ โทเคนรูป
   `tag.class` **ไม่เข้ากองไหนเลย**: ไม่ใช่ selector และไม่ใช่ "แกะไม่ออก" ⇒ เติมลงแถวที่มี
   selector อื่นอยู่แล้วก็เขียวทั้งแผง (Reviewer-Claude ก5 · Reviewer-Codex R5 วัดตรงกัน)
   คอมเมนต์เดิมของบรรทัดนี้อ้างว่าเคสนั้นจะตกที่ข้อ "ทุกแถวต้องมี selector" — จริงเฉพาะเมื่อ
   มันเป็นโทเคนเดียวของแถว ⇒ คำอ้างนั้นถูกถอนแล้ว

   ชุดชื่อแท็กตั้งไว้ **ด้วยรายชื่อ** ไม่ใช่ "คำอะไรก็ได้ที่ตามด้วยจุด" เพราะช่องเดียวกันมีโทเคน
   อย่าง `s.slug` (ชื่อตัวแปรในซอร์ส) ซึ่งถ้าถูกอ่านเป็น selector จะกลายเป็นข้อแดงของเอกสารที่
   ไม่ใช่ความผิดของเอกสาร · ตัวอักษรเดี่ยวที่เป็นทั้งชื่อแท็กและชื่อตัวแปรยอดนิยม (`a` `b` `i`
   `p` `q` `s` `u`) **ไม่อยู่ในชุด** ⇒ ถ้าวันหน้าสัญญาต้องการ `s.foo` เป็น selector จริง ให้เขียน
   `*.foo` หรือเพิ่มชื่อเข้าชุดนี้พร้อมเคส ไม่ใช่ปล่อยให้เครื่องเดา */
const TAG_NAMES = new Set(['a', 'abbr', 'article', 'aside', 'button', 'canvas', 'caption', 'code',
  'div', 'dd', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'iframe', 'img', 'input', 'label', 'li', 'main',
  'math', 'nav', 'ol', 'option', 'output', 'picture', 'pre', 'section', 'select', 'small', 'source',
  'span', 'strong', 'summary', 'svg', 'table', 'tbody', 'td', 'textarea', 'th', 'thead', 'time',
  'tr', 'ul', 'video']);
const AMBIGUOUS_TAG = new Set(['a', 'b', 'i', 'p', 'q', 's', 'u']);
const looksLikeSelector = raw => {
  if (/^[.#[]/.test(raw)) return true;
  const m = raw.match(/^([a-zA-Z][-\w]*)[.#[:]/);
  return !!m && TAG_NAMES.has(m[1].toLowerCase()) && !AMBIGUOUS_TAG.has(m[1].toLowerCase());
};
/* แยกโทเคนของ selector ที่ **ไม่ตัดช่องว่างข้างใน `[...]` / `(...)`** — ของเดิม split ด้วย
   `\s+` ตรง ๆ ⇒ `[title="a b"]` และ `:not(.b .c)` ซึ่งเป็น CSS ที่ถูกต้องถูกตัดสินว่าแกะไม่ออก
   แล้วลามเป็นข้ออีกสองข้อที่ชี้ผิดเรื่อง (Reviewer-Claude ก5 ทิศกลับ · Reviewer-Codex R5) */
export function splitSelector(raw) {
  const parts = [];
  let cur = '', depth = 0;
  for (let k = 0; k < raw.length; k++) {
    const ch = raw[k];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (depth === 0 && /\s/.test(ch)) { if (cur) { parts.push(cur); cur = ''; } continue; }
    if (depth === 0 && '>+~'.includes(ch)) { if (cur) { parts.push(cur); cur = ''; } parts.push(ch); continue; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  return { parts, balanced: depth === 0 };
}
export function selectorTokens(cell) {
  const selectors = [], unreadable = [];
  for (const m of cell.matchAll(/`([^`]+)`/g)) {
    const raw = m[1].trim();
    if (!looksLikeSelector(raw)) continue;
    const { parts, balanced } = splitSelector(raw);
    /* คอมบิเนเตอร์ต้องมี compound คั่นทั้งสองข้าง (`.x > > .y` = อ่านไม่ออก ไม่ใช่อ่านได้) */
    const shape = parts.length > 0 && balanced
      && !/^[>+~]$/.test(parts[0]) && !/^[>+~]$/.test(parts[parts.length - 1])
      && !parts.some((p, k) => /^[>+~]$/.test(p) && /^[>+~]$/.test(parts[k + 1] || ''));
    const ok = shape && parts.every(p => /^[>+~]$/.test(p) || COMPOUND_RE.test(p))
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

/* ---------- สัญลักษณ์ที่แถวอ้าง (ฟังก์ชัน/บล็อกที่ถือจุดเรียกของที่วางนั้น) ----------
   §13.5 อ้างที่วางด้วยชื่อสัญลักษณ์อยู่แล้วในหลายแถว ("จุดเรียก `coverAttrs()` ใน `contCardHtml()`"
   · "บล็อก `feedBlock` ของ …" · "จุดเรียก … ใน `hasPart` ของ …") และเอกสารเขียนเหตุผลไว้เองว่า
   ทำไม (เลขบรรทัดเน่า) ⇒ **ชื่อสัญลักษณ์เป็นของที่ผูกได้โดยไม่ต้องใช้เลขบรรทัด** ซึ่งเป็นสิ่งที่
   รีวิวทั้งสองฝั่งขอ: ผูกแถวกับ "ที่วาง/renderer หรือ callsite ที่แยกแถวได้จริง" ไม่ใช่กับ
   "ไฟล์นี้มีคลาสนี้อยู่ที่ไหนก็ได้" (Reviewer-Claude ก4 · Reviewer-Codex R4)

   สองรูป และเหตุที่แยก:
     · `ชื่อ()` — ชัดเจนว่าอ้างฟังก์ชัน ⇒ **ผูกพัน**: ถ้าสาวไม่ถึงจุดเรียกในไฟล์ที่แถวอ้าง = แดง
     · `ชื่อ` เปล่า — กำกวม (ช่องเดียวกันมี `ImageObject` · `contentUrl` ซึ่งเป็นคำบรรยาย)
       ⇒ นับเป็นการอ้างเฉพาะเมื่อ **สาวถึงของจริงได้** · สาวไม่ถึง = ถือเป็นคำบรรยาย ไม่ใช่ข้อแดง
   ชื่อของท่อเองไม่ใช่สัญลักษณ์ของที่วาง (ทุกแถวเขียน `coverImg()`/`coverAttrs()`/`coverSlot(…)`) */
const PIPE_NAMES = ['coverImg', 'coverAttrs', 'coverSlot'];
export function symbolClaims(cell) {
  const out = [];
  for (const m of cell.matchAll(/`([^`]+)`/g)) {
    const raw = m[1].trim();
    const hit = raw.match(/^([A-Za-z_$][\w$]*)(\(\))?$/);
    /* ชื่อทรง (`poster`/`wide`/`auto`) เป็นค่าของสัญญา ไม่ใช่สัญลักษณ์ — **ยกเว้นรูปที่มีวงเล็บ**
       (`poster()` คือฟังก์ชันที่สร้างกล่อง `.card .poster` ของ build/ui.mjs จริง ๆ) */
    if (!hit || PIPE_NAMES.includes(hit[1]) || (SHAPES.includes(hit[1]) && !hit[2])) continue;
    out.push({ name: hit[1], strict: !!hit[2] });
  }
  return out;
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
    const symbols = symbolClaims(`${r[0]} ${r[2] || ''}`);
    for (const u of unreadable) {
      docProblems.push(`§13.5 แถว "${placement}" (${where} #${i + 1}): โทเคน \`${u}\` เขียนในรูป `
        + `selector แต่ตัวแกะอ่านไม่ออก ⇒ ถ้ามันคือ selector ให้แก้ตัวแกะให้รองรับ `
        + `ถ้าไม่ใช่ให้เอา backtick ออก — ห้ามปล่อยให้มันหายไปจากการเทียบเงียบ ๆ`);
    }
    return {
      placement,
      selectors,
      symbols,
      shape: shapeIn(r[1], `${where} #${i + 1}`),
      files: filesIn(r[2] || ''),
      markers: markersIn(r[2] || ''),
      where: `${where} #${i + 1}`,
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
      symbols: symbolClaims(`${r[0]} ${cell}`),
      where,
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
  /* ---------- ยอดรวมของสัญญา ⇄ จำนวน **มาร์กเกอร์เลขบรรทัด** ของตารางที่วาง ----------
     ⚠️ ข้อนี้เป็น **เครื่องเตือนความจำ ไม่ใช่เฉลยผูกพัน** และทั้งสองฝั่งรีวิวค้านการใช้มันเป็น
     คำตอบถาวร — ด้วยเหตุผลที่วัดได้ ไม่ใช่ความเห็น (Reviewer-Claude ก3 · Reviewer-Codex R6):
       · มันนับ `:\d+` ซึ่งเป็นช่องที่ **กฎการแกะข้อ 2 ประกาศเองว่าไม่ผูกพัน** ⇒ ถ้า CTO ถอด
         เลขบรรทัดออกตามที่รีวิวเสนอ ด่านนี้แดงที่เอกสารที่ถูกต้องกว่าเดิม (11 ≠ 12)
       · rebalance ได้ด้วยการพิมพ์ `:NNN` หนึ่งตัว ⇒ ลบแถวที่วางได้เงียบ ๆ อยู่ดี (วัดแล้ว)
     ⇒ ข้อความของข้อนี้ต้องบอกว่ามันนับอะไรจริง ๆ (ไม่ใช่ "จุดเรียก") และ **รอยที่มันตั้งใจปิด
     ถูกปิดด้วยกลไกอื่นแล้ว**: การผูกแถว↔สัญลักษณ์ใน callsiteProblems (ทิศ ค) ซึ่งไม่ใช้เลข
     บรรทัดเลย · ของที่ยังเหลือคือแถวที่สัญญาไม่ได้ตั้งชื่อสัญลักษณ์ให้ ⇒ รายงานเป็นช่องว่างที่
     มีชื่อ (`gaps` ข้างล่าง) ไม่ใช่เขียวเงียบ */
  const rowMarkers = buildRows.reduce((n, r) => n + r.markers, 0);
  if (declaredTotal != null && rowMarkers !== declaredTotal) {
    docProblems.push(`§13.5: แถว "รวม" ประกาศ ${declaredTotal} จุดเรียก แต่ตารางที่วางฝั่ง build `
      + `มี **มาร์กเกอร์เลขบรรทัด** รวม ${rowMarkers} ตัว (${buildRows.length} แถว · แถวที่ไม่มีเลข `
      + `บรรทัดนับเป็น 1) — ข้อนี้เป็นเครื่องเตือนความจำที่นับช่องที่สัญญาประกาศว่า **ไม่ผูกพัน** `
      + `⇒ ถ้าเอกสารถอดเลขบรรทัดออกตามที่รีวิวทั้งสองฝั่งเสนอ ให้สัญญาประกาศ "จำนวนจุดเรียก" `
      + `หรือ "ชื่อสัญลักษณ์" เป็นช่องของแถว แล้วด่านจะผูกกับช่องนั้น (ขอไว้ที่ AIO-71) — `
      + `ห้ามแก้ด้วยการถอดด่านนี้ออก และห้ามแก้ด้วยการเติมมาร์กเกอร์ให้ยอดกลับมาเท่ากัน`);
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
     `coverSlot(` ⇒ ความไม่สมมาตรเดิมไม่มีเหตุผลรองรับ
     นับจาก **รายการจุดเรียกของโทเคนไนเซอร์** ไม่ใช่ regex บนข้อความที่ถอดแล้ว ⇒ `function  name(`
     (ช่องว่างสองตัว) และ method shorthand ไม่ถูกนับเป็นจุดเรียกอีก (Reviewer-Claude ก8) */
  return callSitesIn(src, name).length;
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

  /* ---------- (ค) แถว ⇄ **สัญลักษณ์** ที่แถวนั้นอ้าง (ผูกต่อแถว ไม่ใช่ต่อไฟล์) ----------
     ทิศ (ก) ข้างบนถามแค่ "ไฟล์นี้ render คลาสนี้ไหม" ซึ่งเป็นคำถามที่หลายไฟล์ตอบใช่พร้อมกัน
     (`.th` อยู่ 3 ไฟล์ · `.gtile`/`.player`/`.poster` อยู่ 2 ไฟล์ต่อคลาส) ⇒ ย้ายช่องไฟล์ของแถว
     ไปอีกไฟล์ที่ render คลาสเดียวกันแล้วด่านเงียบ 6 จาก 19 แถว (Reviewer-Claude ก4 วัดด้วยแถว
     `.ep-row .th` · Reviewer-Codex R4 วัดด้วยแถว "อันดับ 4–10") ⇒ ที่นี่ผูกด้วยสัญลักษณ์ที่
     **เอกสารตั้งชื่อไว้เอง** และสาวผ่านโซ่ของขอบเขตในซอร์สจริง (ไม่ใช่เลขบรรทัด):
       · `ชื่อ()` ที่สาวไม่ถึงจุดเรียกในไฟล์ที่แถวอ้าง = แดง (ย้ายไฟล์แล้วสัญลักษณ์ไม่ตามไป)
       · สัญลักษณ์เดียวถูกอ้างโดยแถวมากกว่าจำนวนจุดเรียกที่มันห่ออยู่ = แดง (สองที่วางชี้
         จุดเรียกเดียวกัน = แถวหนึ่งแถวหายไปหรือชี้ผิด) ⇒ นี่คือการผูก "ที่วางหนึ่งที่ = แถวหนึ่ง
         แถว" ที่ §13.5 ล็อกไว้ โดยไม่ต้องพึ่งมาร์กเกอร์เลขบรรทัด */
  const claims = new Map();                 /* `${file}|${symbol}` → จำนวนแถวที่อ้าง */
  const hostsOf = new Map();                /* `${file}|${symbol}` → จำนวนจุดเรียกที่สาวถึง */
  const callsCache = new Map();
  const placementCalls = f => {
    if (callsCache.has(f)) return callsCache.get(f);
    let list = [];
    try {
      list = scanJs(read(f)).calls.filter(c => !c.isDefinition && PIPE_NAMES.includes(c.name)
        /* `coverSlot()` ที่ถูกเรียกจาก **ข้างในท่อ** ไม่ใช่ที่วาง (ui.mjs → coverImg ·
           app.src.js → coverAttrs) ⇒ ไม่นับเป็นเจ้าภาพของแถวใด */
        && !(c.name === 'coverSlot' && c.fnChain.some(x => x === 'coverImg' || x === 'coverAttrs')));
    } catch { list = []; }
    callsCache.set(f, list);
    return list;
  };
  for (const { row, files: rowFiles } of hostRows) {
    for (const sym of row.symbols || []) {
      const hosts = rowFiles.reduce((n, f) =>
        n + placementCalls(f).filter(c => c.fnChain.includes(sym.name)).length, 0);
      if (!hosts) {
        if (sym.strict) {
          out.push(`§13.5 แถว "${row.placement}": อ้างจุดเรียกใน \`${sym.name}()\` ของ `
            + `${rowFiles.join(' · ')} แต่สาวไม่ถึงจุดเรียกตัวเลือกภาพในสัญลักษณ์นั้นเลย `
            + `⇒ ที่วางย้ายฟังก์ชัน/ย้ายไฟล์แล้วแต่แถวยังชี้ที่เดิม (ชื่อสัญลักษณ์เป็นช่องที่ `
            + `เอกสารเลือกใช้แทนเลขบรรทัดเอง ⇒ มันต้องผูกพัน)`);
        }
        continue;                          /* ชื่อเปล่าที่สาวไม่ถึง = ถือเป็นคำบรรยาย */
      }
      for (const f of rowFiles) {
        const n = placementCalls(f).filter(c => c.fnChain.includes(sym.name)).length;
        if (!n) continue;
        const k = `${f}|${sym.name}`;
        claims.set(k, (claims.get(k) || 0) + 1);
        hostsOf.set(k, n);
      }
    }
  }
  for (const [k, claimed] of claims) {
    const hosts = hostsOf.get(k) || 0;
    if (claimed > hosts) {
      const [f, sym] = k.split('|');
      out.push(`${f}: §13.5 มี ${claimed} แถวที่อ้างจุดเรียกใน \`${sym}\` แต่ไฟล์นั้นมีจุดเรียก `
        + `ตัวเลือกภาพในสัญลักษณ์นั้น ${hosts} จุด ⇒ สองที่วางชี้จุดเรียกเดียวกัน `
        + `(ที่วางหนึ่งที่ = แถวหนึ่งแถว ตามที่ §13.5 ล็อกไว้) — แถวใดแถวหนึ่งชี้ผิดสัญลักษณ์`);
    }
  }

  /* ---------- (ข) **คู่ (ไฟล์, ชื่อท่อ)** ที่มีจุดเรียกแต่สัญญาไม่ได้ประกาศจำนวน ----------
     หัวข้อ "จำนวนจุดเรียกต่อไฟล์" มีไว้ปิดภัย "ย้ายจุดเรียกข้ามไฟล์แล้วยอดรวมเท่าเดิม" แต่ของเดิม
     ยกเว้นเป็น **ไฟล์** (`listed`) ขณะที่เทียบจำนวนเป็น **คู่** (coverImg ให้ไฟล์ใน perFile ·
     coverAttrs ให้ app.src.js เท่านั้น) ⇒ เหลือช่องว่าง 5 ช่องที่ไม่มีใครวัด: 4 ไฟล์ของฝั่ง
     build × `coverAttrs(` และ app.src.js × `coverImg(` (Reviewer-Claude ก6 วัดสองเคสว่าเขียว)
     ⇒ ที่นี่วนเป็นคู่ตรง ๆ: ทุกคู่ที่มีจุดเรียกต้องมีจำนวนที่สัญญาประกาศ และต้องเท่ากัน
     ⚠️ ไม่ยกเว้น SLOT_PIPE_OWNERS ที่นี่ — นั่นเป็นรายการของท่อ `coverSlot()` ไม่ใช่ของสองท่อนี้
        (ถ้ายกเว้น การเติม `coverImg(` ลง build/seo.mjs จะยังเขียว ซึ่งเป็นเคสที่รีวิวรอบที่สี่
        วัดแล้ว) · ตัวนิยามไม่ถูกนับอยู่แล้วที่ countCallsIn */
  const BUILD_PIPES = ['coverImg', 'coverAttrs'];
  const declaredPairs = new Map();
  for (const [f, n] of Object.entries(adr.perFile)) declaredPairs.set(`${f}|coverImg`, n);
  declaredPairs.set(`${APP_REL}|coverAttrs`, adr.appCallsites);
  const openFailed = new Set();
  for (const f of files) {
    for (const pipe of BUILD_PIPES) {
      let got;
      try { got = count(f, pipe); }
      catch { openFailed.add(f); continue; }
      const k = `${f}|${pipe}`;
      if (!declaredPairs.has(k)) {
        if (got > 0) {
          out.push(`${f}: มีจุดเรียก ${pipe}() ${got} จุด แต่ §13.5 ไม่ได้ประกาศจำนวนของคู่ `
            + `(${f}, ${pipe}) ไว้ที่ไหนเลย ⇒ ที่วางย้ายมาอยู่ไฟล์/ท่อใหม่โดยยอดรวมเท่าเดิมได้ `
            + `ซึ่งเป็นภัยที่หัวข้อ "จำนวนจุดเรียกต่อไฟล์" เขียนเองว่ามีไว้ปิด `
            + `(เพิ่มแถว/เพิ่มเลข = งานของ CTO · ห้ามถอดไฟล์ออกจากรายการกวาด)`);
        }
        continue;
      }
      const want = declaredPairs.get(k);
      if (got !== want) {
        out.push(`${f}: §13.5 ประกาศจุดเรียก ${pipe}() ${want} จุด แต่นับในซอร์สได้ ${got} `
          + `⇒ เพิ่ม/ย้ายที่วางต้องแก้ทั้งตาราง §13.5 และ SHAPE_MAP · ห้ามแก้เลขในด่านอย่างเดียว`);
      }
      declaredPairs.delete(k);
    }
  }
  /* คู่ที่สัญญาประกาศแต่ไม่ได้ถูกกวาดเลย (ไฟล์หาย/ชื่อผิดในเอกสาร) ต้องเป็นข้อตกที่อ่านรู้เรื่อง
     ไม่ใช่ ENOENT ที่ซ่อนข้ออื่นทั้งหมดไว้ข้างหลัง — ชื่อไฟล์เป็นช่องที่ผูกพัน */
  for (const [k] of declaredPairs) {
    const [f, pipe] = k.split('|');
    let why = 'ไม่อยู่ในรายการกวาด';
    if (openFailed.has(f)) why = 'เปิดไม่ได้';
    else {
      /* ไฟล์ที่สัญญาอ้างแต่ไม่ได้อยู่ในรายการกวาด: ลองอ่านเองเพื่อแยกสองเหตุให้ชัด —
         "เอกสารพิมพ์ชื่อไฟล์ผิด" กับ "รายการกวาดแคบเกินไป" ⇒ ข้อความต้องชี้เหตุที่ถูก
         ไม่ใช่เหตุที่เดา (ชื่อไฟล์เป็นช่องที่ผูกพัน ⇒ พิมพ์ผิดก็ต้องแดงด้วยข้อความที่อ่านรู้เรื่อง) */
      try { read(f); }
      catch (e) { why = `อ่านไฟล์ไม่ได้ — ${e.message}`; }
    }
    out.push(`${f}: §13.5 ประกาศจำนวนจุดเรียก ${pipe}() ของไฟล์นี้ แต่ไฟล์นี้${why} `
      + `⇒ ชื่อไฟล์ในเอกสารไม่ตรงกับของจริง หรือรายการกวาดแคบเกินไป`);
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
  return out;
}

/* ---------- ช่องว่างที่รู้ตัว: จุดเรียกที่ **ไม่มีแถวใดอ้างด้วยสัญลักษณ์** ----------
   ทิศ (ค) ของ callsiteProblems ผูกแถวกับจุดเรียกได้เฉพาะแถวที่เอกสารตั้งชื่อสัญลักษณ์ไว้
   (วันนี้: ทุกแถวของตารางฝั่งเบราว์เซอร์และตาราง `coverSlot()` + 2 แถวของฝั่ง build)
   ⇒ แถวที่เหลือยังผูกได้แค่ระดับไฟล์ · ฟังก์ชันนี้คืนรายชื่อจุดเรียกที่ยังไม่มีแถวอ้างถึง
   เพื่อให้ด่านรายงานมันเป็น **ช่องที่ยังไม่ได้วัด** (ไม่ใช่ผ่าน) และเพื่อให้คำขอต่อ CTO
   มีรายชื่อที่แน่นอน ไม่ใช่คำว่า "บางแถว" (Reviewer-Claude ก3/ก4 · Reviewer-Codex R4/R6) */
export function unclaimedCallsites(adr, read, files) {
  const named = new Set();
  for (const r of [...adr.buildRows, ...adr.appRows, ...adr.slotRows]) {
    for (const s of r.symbols || []) named.add(s.name);
  }
  const out = [];
  for (const f of files) {
    let calls = [];
    try {
      calls = scanJs(read(f)).calls.filter(c => !c.isDefinition && PIPE_NAMES.includes(c.name)
        && !(c.name === 'coverSlot' && c.fnChain.some(x => x === 'coverImg' || x === 'coverAttrs')));
    } catch { continue; }
    for (const c of calls) {
      if (!c.fnChain.some(x => named.has(x))) {
        out.push(`${f}: จุดเรียก ${c.name}() ในขอบเขต ${c.fnChain.length ? c.fnChain.join(' › ') : '(ระดับไฟล์)'}`);
      }
    }
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
/* เจ้าของ "ท่อ" ของ `coverSlot()` — **ผูกกับฟังก์ชัน ไม่ใช่กับไฟล์**
   ของเดิมยกเว้นทั้งไฟล์ ⇒ เติม `export const rogue = s => coverSlot(s,'wide');` ลง build/ui.mjs
   แล้วด่านเงียบ ทั้งที่มันคือที่วางใหม่ที่ไม่มีแถวในสัญญา (Reviewer-Codex R3 ข้อ 4)
   ⇒ ยกเว้นเฉพาะจุดเรียกที่อยู่ **ข้างในฟังก์ชันของท่อ** ตามรายการนี้ · และรายการต้องไม่ค้าง:
   ไฟล์ที่ไม่มีตัวนิยามของฟังก์ชันท่อเหล่านั้นแล้ว = ใบอนุญาตที่หมดอายุ ⇒ แดง */
export const SLOT_PIPE_OWNERS = [
  { file: 'build/seo.mjs', fns: ['coverSlot'] },          /* ตัวนิยามของท่อเอง */
  { file: 'build/ui.mjs', fns: ['coverImg'] },            /* ท่อฝั่ง build เรียกตัวเลือกไฟล์ข้างใน */
  { file: 'build/app.src.js', fns: ['coverSlot', 'coverAttrs'] },   /* สำเนาฝั่งเบราว์เซอร์ */
];
export const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/* ทรงที่จุดเรียกขอ — อ่านจาก **อาร์กิวเมนต์ที่โทเคนไนเซอร์ตัดมา** ไม่ใช่ regex บนข้อความ
   ⇒ สตริงที่เขียนเลียนแบบจุดเรียก (`const msg = "coverSlot(s, 'poster')";`) ไม่มีวันสวมรอย
   และจุดเรียกจริงที่ส่งทรงเป็นตัวแปรไม่มีวันถูกนับเป็นทรงคงที่ (Reviewer-Codex R3 ข้อ 1–2) */
const argShape = arg => {
  const m = (arg || '').trim().match(/^['"](poster|wide|auto)['"]$/);
  return m ? m[1] : null;
};
export const slotCalls = src => scanJs(src).calls
  .filter(c => c.name === 'coverSlot' && !c.isDefinition)
  .map(c => ({ ...c, shape: argShape(c.args[1]) }));

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
    const calls = slotCalls(src);
    const shapes = calls.map(c => c.shape).filter(Boolean);
    if (!shapes.includes(row.callShape)) {
      out.push(`${row.file}: §13.5 ประกาศที่วาง "${row.placement}" ที่เรียก `
        + `coverSlot(…, '${row.callShape}') ในไฟล์นี้ แต่หาจุดเรียกนั้นไม่เจอในซอร์ส `
        + `(นับจากจุดเรียกจริง ไม่ใช่ข้อความ · ที่เจอ: ${shapes.length ? shapes.join(' · ') : 'ไม่มีเลย'}) `
        + `⇒ ที่วางย้ายไฟล์/เปลี่ยนทรงแล้วแต่ตารางยังไม่ขยับตาม`);
    }
    /* แถวของตารางนี้อ้างสัญลักษณ์ไว้ทุกแถว (`hasPart` · `show()`) ⇒ ผูกให้แคบกว่าระดับไฟล์ */
    for (const sym of row.symbols || []) {
      const hosts = calls.filter(c => c.fnChain.includes(sym.name)).length;
      if (!hosts && sym.strict) {
        out.push(`${row.file}: §13.5 แถว "${row.placement}" อ้างจุดเรียก coverSlot() ใน `
          + `\`${sym.name}()\` แต่ไม่มีจุดเรียกในสัญลักษณ์นั้นในไฟล์นี้`);
      }
    }
  }
  /* ---------- ทิศ (ข) · นับ **จุดเรียก** ไม่ใช่อนุญาตทั้งไฟล์/ทั้งโมดูล ----------
     ไฟล์ที่ไม่ใช่ท่อ: จำนวนจุดเรียกต่อ (ไฟล์, ทรง) ต้องเท่ากับที่สัญญาประกาศ · จุดเรียกที่อยู่
     ข้างในฟังก์ชันของท่อถูกยกเว้น (ท่อ ไม่ใช่ที่วาง) และจุดเรียกอื่นในไฟล์เดียวกัน **ไม่ถูก
     ยกเว้นตามไฟล์อีกแล้ว** */
  const owners = new Map(SLOT_PIPE_OWNERS.map(o => [o.file, o.fns]));
  const declared = new Map();                 /* `${file}|${shape}` → จำนวนแถว */
  for (const r of adr.slotRows) {
    const k = `${r.file}|${r.callShape}`;
    declared.set(k, (declared.get(k) || 0) + 1);
  }
  const seen = new Set();
  for (const f of files) {
    let src;
    try { src = read(f); } catch { continue; }
    const pipeFns = owners.get(f);
    const all = slotCalls(src);
    if (pipeFns) {
      /* รายการยกเว้นค้างไม่ได้: ไฟล์ที่ไม่มีตัวนิยามของฟังก์ชันท่อแล้ว = ท่อย้ายไปที่อื่น */
      const defined = scanJs(src).calls.filter(c => c.isDefinition && pipeFns.includes(c.name));
      if (!defined.length) {
        out.push(`${f}: อยู่ในรายการ "เจ้าของท่อ coverSlot()" ของ tools/adr-shape-table.mjs `
          + `โดยอ้างฟังก์ชัน ${pipeFns.map(n => `${n}()`).join(' · ')} แต่ไฟล์นี้ไม่มีตัวนิยามของ`
          + `ฟังก์ชันเหล่านั้นแล้ว ⇒ รายการยกเว้นค้างอยู่หลังจากท่อย้ายไปที่อื่น`);
      }
    }
    /* จุดเรียกที่ **ไม่ได้อยู่ในท่อ** ของไฟล์นี้ = ที่วาง ⇒ ต้องมีแถวในสัญญา */
    const placements = all.filter(c => !(pipeFns && c.fnChain.some(x => pipeFns.includes(x))));
    const shaped = placements.map(c => c.shape).filter(Boolean);
    for (const shape of new Set([...shaped, ...[...declared.keys()]
      .filter(k => k.startsWith(`${f}|`)).map(k => k.split('|')[1])])) {
      const got = shaped.filter(s => s === shape).length;
      const want = declared.get(`${f}|${shape}`) || 0;
      seen.add(`${f}|${shape}`);
      if (got !== want) {
        out.push(`${f}: มีจุดเรียก coverSlot(…, '${shape}') ที่เป็น **ที่วาง** ${got} จุด `
          + `แต่ตาราง "${H_SLOT}" ของ §13.5 ประกาศ ${want} แถวสำหรับคู่นี้ ⇒ ที่วางที่ขอ URL `
          + `เปล่า ๆ ก็ต้องประกาศทรงในสัญญา (เพิ่ม/ลบแถว = งานของ CTO · `
          + `ห้ามถอดไฟล์ออกจากรายการกวาด · จุดเรียกข้างในท่อไม่นับ)`);
      }
    }
    /* จุดเรียกที่อ่านทรงไม่ออก (ส่งทรงมาเป็นตัวแปร) และไม่ได้อยู่ในท่อ = ที่วางที่สัญญา
       ไม่มีทางประกาศทรงให้ได้ ⇒ ต้องแดง ไม่ใช่ข้ามเพราะ regex จับไม่ได้ */
    const unreadable = placements.filter(c => !c.shape);
    if (unreadable.length) {
      out.push(`${f}: มีจุดเรียก coverSlot() ที่ไม่ได้ส่งชื่อทรงเป็นค่าคงที่ (${unreadable.length} จุด`
        + `${unreadable.some(c => c.optional) ? ' · รวมรูป `coverSlot?.(`' : ''}) `
        + `และไม่ได้อยู่ในฟังก์ชันของท่อ ⇒ สัญญาประกาศทรงของที่วางนั้นไม่ได้ `
        + `· ที่วางต้องขอทรงตรง ๆ ('poster'/'wide'/'auto') ไม่ใช่ส่งต่อตัวแปร`);
    }
  }
  for (const [k, want] of declared) {
    if (!seen.has(k)) {
      const [f, shape] = k.split('|');
      out.push(`${f}: §13.5 ประกาศ ${want} แถวของ coverSlot(…, '${shape}') ในไฟล์นี้ `
        + `แต่ไฟล์นี้ไม่อยู่ในรายการกวาด หรือเปิดไม่ได้`);
    }
  }
  return out;
}
