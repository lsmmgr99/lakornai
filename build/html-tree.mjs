/* ตัวแกะโครง HTML เท่าที่ด่านของ build ต้องใช้ — "อิลิเมนต์ที่อยู่ใน DOM จริงของหน้า"
   ไม่ใช่ "ข้อความที่หน้าตาเหมือนแท็ก" (ADR-001 กฎ V19 · AIO-59 §10.1)

   ทำไมถึงต้องมีไฟล์นี้ ไม่ใช่ regex สามบรรทัดในกฎ: รีวิวรอบที่สี่วัดของเดิมแล้วพบว่ามันตอบผิด
   **ทั้งสองทิศ** (Reviewer-Codex R1/R2 · Reviewer-Claude ข 2–3 · ผมทำซ้ำได้ทุกเคส) —
     · เขียวผิด: โครงที่เขียนไว้ใน `<template>` / `<textarea>` / `<noscript>` / `<style>`
       และคลาสที่เป็น **ข้อความในค่าแอตทริบิวต์** (`title=' class="player full"'`)
       ⇒ build ผ่าน แต่ `document.querySelector('.player.full > .mwin > .clip')` ในเบราว์เซอร์ได้ 0 ใบ
     · แดงผิด: `class=mwin` ที่ไม่ใส่ quote (HTML ถูกต้อง เบราว์เซอร์ได้ 1 ใบ) · `<p>` ที่ไม่ปิด
       คั่นกลาง (HTML ปิดให้เองโดยปริยาย) · `<script>` ที่มีคำว่า `<!--` อยู่ในสตริง
   ด่านที่เขียวผิดคือด่านที่ไม่มีอยู่ · ด่านที่แดงผิดคือด่านที่สอนให้คนผ่อนด่าน ⇒ ทั้งสองทิศต้องแก้
   ที่ตัวแกะ ไม่ใช่ที่เกณฑ์

   **รีวิวรอบที่ห้าวัดต่อแล้วเจออีกหกรูป (Reviewer-Claude ก2 · Reviewer-Codex R1)** — ห้ารูปแรก
   ตอบผิด และรูปแรกตอบผิด **บนไฟล์ที่ส่งมอบวันนี้แล้ว** (`feed/index.html` มี `<path …/>` 19 ใบ):
     · foreign content (`<svg>`/`<math>`): `/>` **ปิดอิลิเมนต์จริง** และแท็ก HTML อย่าง `div`/`span`
       **เด้งออกจาก svg** (breakout) ⇒ ของเดิมดันทุกอย่างหลัง `<path/>` ลงเป็นลูกหลาน
     · `<iframe>` · `<plaintext>` — เนื้อเป็น **ข้อความ** ไม่ใช่อิลิเมนต์
     · `<!-->` / `<!--->` (คอมเมนต์ที่จบแบบ abrupt) และ `--!>` (ปลายคอมเมนต์อีกรูป)
     · character reference ในค่าแอตทริบิวต์ (`class="mw&#105;n"` = `class="mwin"`)
     · foster parenting ของตาราง (`<table>` คั่นกลาง ⇒ กล่องย้ายไปอยู่ **ก่อน** ตาราง)
     · `<p>` ที่ไม่ปิดโดยมี `<em>` ค้างอยู่ — การปิด `p` ไม่ได้เกิดเฉพาะเมื่อ `p` อยู่บนสุดของสแต็ก
       (กฎจริงคือ "มี `p` อยู่ใน button scope") · รูปเดียวกันกับ `<li>` ที่ไม่ปิด
   **เฉลยของทั้ง 30 เคสในชุดเทสต์มาจาก Chrome จริง** (`--dump-dom` + `querySelectorAll` ที่
   `ci/html-tree-cases.mjs` · สคริปต์วัดซ้ำได้ที่ `ci/html-tree-oracle.mjs`) ไม่ใช่จากสเปกที่ผมอ่านเอง

   ขอบเขตที่ไฟล์นี้ **ไม่** รับประกัน — และวิธีที่มันไม่เงียบเมื่อเจอของนอกขอบเขต:
   มันไม่ใช่ HTML parser ตามสเปก · ไม่ทำ "adoption agency" · ไม่ทำ reconstruct ของ active
   formatting elements · ไม่รู้จัก named character reference นอกชุดเล็ก ๆ ข้างล่าง · โมเดล
   foster parenting และ breakout แบบประมาณ ⇒ ทุกครั้งที่เจอรูปพวกนี้ มันบันทึกลง `root.caveats`
   ("ตัดสินไม่ได้" ไม่ใช่ "ตัดสินว่าไม่มี") และผู้เรียกต้อง **ล้มเสียงดัง** ไม่ใช่เขียวเงียบ ๆ —
   `build/build.mjs` กฎ V19 ทำอย่างนั้น และ `ci/feed-media-window.test.mjs` บังคับว่า HTML ที่
   renderer ส่งมอบวันนี้ต้องอยู่ในขอบเขตที่โมเดลนี้รองรับ (caveats = ศูนย์) ทุก build */

/* แท็กที่ไม่มีลูก (HTML spec · void elements) — ใช้เฉพาะใน namespace ของ HTML
   (ใน foreign content ไม่มี void element มีแต่ `/>` ที่ปิดตัวเอง) */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* แท็กที่เนื้อข้างในเป็น **ข้อความ** ไม่ใช่มาร์กอัป ⇒ ข้ามไปจนถึงแท็กปิดของมันแบบตัวอักษร
   `noscript` อยู่ในชุดนี้เพราะหน้าของเราเป็นหน้าที่ JS ทำงาน (ฟีดทั้งหน้าเป็น JS) ⇒ ในเบราว์เซอร์
   จริงเนื้อของมันเป็นข้อความ ไม่ใช่อิลิเมนต์ · (ถ้าวัดด้วย `DOMParser` จะได้คนละคำตอบ เพราะที่นั่น
   สคริปต์ปิด — เราวัดหน้าที่ผู้ชมเห็น ไม่ใช่หน้าที่ parser เห็น)
   `iframe` อยู่ในชุดนี้ตามสเปก ("in body": start tag `iframe` ⇒ generic raw text) — ของเดิมเก็บ
   `xmp`/`noembed`/`noframes` ไว้ครบแต่ขาดตัวนี้ตัวเดียว ⇒ โครงที่เขียนไว้ใน fallback content
   ของ `<iframe>` ถูกนับเป็นของจริง ทั้งที่เบราว์เซอร์เห็นเป็นข้อความ (Reviewer-Claude ก2-2) */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes',
  'noscript', 'iframe']);

/* `<plaintext>` ไม่มีแท็กปิด — ทุกอย่างหลังจากนั้นเป็นข้อความจนจบเอกสาร (Reviewer-Codex R1) */
const PLAINTEXT = 'plaintext';

/* เนื้อของ `<template>` ไม่อยู่ใน DOM ที่ render ⇒ อยู่ในต้นไม้ แต่ถูกกันออกจากการค้นหา */
const INERT = new Set(['template']);

/* แท็กจัดรูป — ถ้าตัวใดถูกปิดโดยปริยาย เบราว์เซอร์จะ **สร้างมันขึ้นใหม่** ในกล่องถัดไป
   (reconstruct active formatting elements) ซึ่งไฟล์นี้ไม่ได้โมเดล ⇒ บันทึกเป็น caveat */
const FORMATTING = new Set(['a', 'b', 'big', 'code', 'em', 'font', 'i', 'nobr', 's', 'small',
  'strike', 'strong', 'tt', 'u']);

/* ขอบของ "scope" ตามสเปก — ใช้ตอบคำถาม "มี `p` อยู่ใน button scope ไหม" ซึ่งเป็นกฎจริงของ
   การปิด `p` โดยปริยาย (ของเดิมดูแต่ยอดสแต็ก ⇒ `<p><em>x<div>` ตอบผิด · Reviewer-Codex R1) */
const SCOPE_EDGE = new Set(['applet', 'caption', 'html', 'table', 'td', 'th', 'marquee', 'object',
  'template', 'mi', 'mo', 'mn', 'ms', 'mtext', 'annotation-xml', 'foreignobject', 'desc', 'title']);
const BUTTON_EDGE = new Set(['button']);
const LIST_EDGE = new Set(['ol', 'ul']);

/* แท็กที่เปิดแล้วปิด `<p>` ที่ค้างอยู่ (HTML spec "optional end tags") */
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
/* แท็กปิดโดยปริยายที่ดูยอดสแต็กก็พอ (ตาราง/รายการเลือก) */
const IMPLIED = [
  { open: new Set(['option']), closes: new Set(['option', 'optgroup']) },
  { open: new Set(['td', 'th']), closes: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']) },
  { open: new Set(['tr']), closes: new Set(['tr', 'tbody', 'tfoot', 'thead']) },
  { open: new Set(['thead', 'tbody', 'tfoot']), closes: new Set(['tbody', 'tfoot', 'thead']) },
];

/* ---------- foreign content (svg · math) ---------- */
/* จุดที่เนื้อข้างในกลับเป็น HTML (integration point) */
const SVG_INT = new Set(['foreignobject', 'desc', 'title']);
const MATH_INT = new Set(['mi', 'mo', 'mn', 'ms', 'mtext']);
/* แท็ก HTML ที่เจอใน foreign content แล้ว **เด้งออก** จนพ้น svg/math ก่อนถูกวาง */
const BREAKOUT = new Set(['b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div',
  'dl', 'dt', 'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i', 'img', 'li',
  'listing', 'menu', 'meta', 'nobr', 'ol', 'p', 'pre', 'ruby', 's', 'small', 'span', 'strong',
  'strike', 'sub', 'sup', 'table', 'tt', 'u', 'ul', 'var', 'font']);

/* ---------- ตาราง: foster parenting ---------- */
const TABLE_CTX = new Set(['table', 'tbody', 'tfoot', 'thead', 'tr']);
const TABLE_OK = new Set(['caption', 'colgroup', 'col', 'tbody', 'tfoot', 'thead', 'tr', 'td',
  'th', 'style', 'script', 'template', 'form', 'input']);

/* ---------- character reference ในค่าแอตทริบิวต์ ---------- */
/* ชุด named ตั้งไว้เล็กโดยเจตนา: ชุดเต็มมี 2231 ชื่อ ซึ่งเป็นตารางที่ต้องซิงก์กับสเปก ⇒ ชื่อที่
   ไม่รู้จักถูกปล่อยไว้ตามตัวอักษร **และบันทึกเป็น caveat ถ้ามันอยู่ในค่า `class`** (ซึ่งเป็นช่อง
   เดียวที่กฎ V19 อ่าน) ⇒ ตอบผิดเงียบไม่ได้ (Reviewer-Codex R1 เคส entity) */
const NAMED_REF = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const REF_RE = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
export function decodeRefs(value) {
  return value.replace(REF_RE, (full, body) => {
    if (body[0] === '#') {
      const n = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return full;
      try { return String.fromCodePoint(n); } catch { return full; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_REF, body) ? NAMED_REF[body] : full;
  });
}

/* แอตทริบิวต์: `name` · `name=value` · `name="value"` · `name='value'` — ทั้งสามรูปถูกต้องตาม
   HTML เท่ากัน ⇒ ตัวอ่านที่รับแต่รูปที่มี quote จะปฏิเสธมาร์กอัปที่ถูกต้อง (R2)
   รับ `raw` = ทุกอย่างหลังชื่อแท็กจนก่อน `>` ⇒ ข้อความใน **ค่า** ของแอตทริบิวต์อื่นไม่มีวัน
   ถูกอ่านเป็นแอตทริบิวต์ เพราะตัวอ่านเดินทีละโทเคนและกิน quote ทั้งก้อน (R1 เคส `title=`) */
export function parseAttrs(raw) {
  const attrs = new Map();
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /[\s/]/.test(raw[i])) i++;
    if (i >= raw.length) break;
    let name = '';
    while (i < raw.length && !/[\s/=>]/.test(raw[i])) name += raw[i++];
    if (!name) { i++; continue; }
    while (i < raw.length && /\s/.test(raw[i])) i++;
    let value = '';
    if (raw[i] === '=') {
      i++;
      while (i < raw.length && /\s/.test(raw[i])) i++;
      const q = raw[i];
      if (q === '"' || q === "'") {
        i++;
        while (i < raw.length && raw[i] !== q) value += raw[i++];
        i++;
      } else {
        while (i < raw.length && !/[\s>]/.test(raw[i])) value += raw[i++];
      }
    }
    const key = name.toLowerCase();
    /* เบราว์เซอร์ถอด character reference ในค่าแอตทริบิวต์ ⇒ ด่านที่ไม่ถอดจะปฏิเสธคลาสที่
       เบราว์เซอร์เห็นว่าตรง (Reviewer-Codex R1) */
    if (!attrs.has(key)) attrs.set(key, decodeRefs(value));   /* HTML: แอตทริบิวต์ซ้ำ ตัวแรกชนะ */
  }
  return attrs;
}

const classesOf = attrs => new Set((attrs.get('class') || '').trim().split(/\s+/).filter(Boolean));

/* `/>` แบบที่ปิดอิลิเมนต์จริง (ใน foreign content) — ต้องเป็น `/` ที่ยืนเดี่ยวท้ายแท็ก
   `<path d=a/>` **ไม่ใช่** (ตามสเปก `/` เป็นส่วนของค่าที่ไม่ใส่ quote) */
const selfClosed = raw => /(?:^|[\s"'])\/\s*$/.test(raw);

/* คืนรากของต้นไม้ · แต่ละโหนด = { tag, ns, attrs, cls, children, parent, inert }
   `root.caveats` = รายการ "ของนอกขอบเขตที่โมเดลนี้รองรับ" ⇒ ผู้เรียกต้องถือว่า **ตัดสินไม่ได้** */
export function parseHtml(html) {
  const root = {
    tag: '#root', ns: 'html', attrs: new Map(), cls: new Set(),
    children: [], parent: null, inert: false, caveats: [],
  };
  const caveats = root.caveats;
  const note = msg => { if (!caveats.includes(msg)) caveats.push(msg); };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const isInt = n => (n.ns === 'svg' && SVG_INT.has(n.tag)) || (n.ns === 'math' && MATH_INT.has(n.tag));
  /* "อยู่ใน foreign content" = ยอดสแต็กเป็น svg/math และไม่ใช่ integration point */
  const inForeign = () => top().ns !== 'html' && !isInt(top());
  /* ปิดสแต็กลงถึง index k (รวม k) · ถ้าของที่ถูกปิด **โดยปริยาย** (ชั้นที่อยู่เหนือ k) มีแท็ก
     จัดรูป = นอกขอบเขต · ตัวที่ index k เองคือตัวที่ถูกปิดตรง ๆ (`</b>` ปิด `<b>` ของตัวเอง
     หรือ `p`/`li` ที่กฎ "optional end tag" สั่งปิด) ⇒ ไม่ใช่ caveat ไม่ว่ากรณีใด */
  const popTo = (k, why) => {
    for (let x = stack.length - 1; x > k; x--) {
      if (FORMATTING.has(stack[x].tag)) {
        note(`<${stack[x].tag}> ที่ไม่ได้ปิดเองถูกปิดโดยปริยาย (${why}) ⇒ เบราว์เซอร์จะสร้างมัน`
          + ` ขึ้นใหม่ในกล่องถัดไป (reconstruct active formatting elements) ซึ่งตัวแกะนี้ไม่ได้โมเดล`);
      }
    }
    stack.length = k;
  };
  /* มีแท็กนี้อยู่ใน scope ไหม — คืน index บนสแต็ก หรือ -1 */
  const inScope = (tag, extraEdge) => {
    for (let k = stack.length - 1; k > 0; k--) {
      if (stack[k].tag === tag) return k;
      if (SCOPE_EDGE.has(stack[k].tag) || (extraEdge && extraEdge.has(stack[k].tag))) return -1;
    }
    return -1;
  };

  const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    /* คอมเมนต์ · doctype · CDATA — ไม่ใช่อิลิเมนต์ และต้องถูกข้ามแบบ "หาปลายของมันเอง"
       ไม่ใช่ลบด้วย regex ทั้งไฟล์ก่อน (ลำดับการลบที่สลับกันกินมาร์กอัปจริงทิ้งได้ · ข 2)
       ปลายของคอมเมนต์มีสี่รูปตามสเปก ไม่ใช่รูปเดียว: `-->` · `--!>` · และรูป **abrupt**
       `<!-->` / `<!--->` ที่จบทันที ⇒ ของเดิมหา `-->` จาก lt+4 แล้วไปกินมาร์กอัปจริงที่อยู่
       ถัดไปทั้งก้อน (Reviewer-Claude ก2-3 · Reviewer-Codex R1) */
    if (html.startsWith('<!--', lt)) {
      const p = lt + 4;
      let end;
      if (html[p] === '>') end = p + 1;
      else if (html[p] === '-' && html[p + 1] === '>') end = p + 2;
      else {
        const a = html.indexOf('-->', p);
        const b = html.indexOf('--!>', p);
        if (a < 0 && b < 0) end = html.length;
        else if (a >= 0 && (b < 0 || a <= b)) end = a + 3;
        else end = b + 4;
      }
      i = end;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt);
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    TAG_RE.lastIndex = lt;
    const m = TAG_RE.exec(html);
    if (!m || m.index !== lt) { i = lt + 1; continue; }
    i = TAG_RE.lastIndex;
    const tag = m[2].toLowerCase();
    if (m[1]) {
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === tag) {
          if (k < stack.length - 1 && FORMATTING.has(tag)) {
            note(`</${tag}> ปิดแท็กจัดรูปที่ไม่ได้อยู่บนสุดของสแต็ก ⇒ เข้าเขต "adoption agency"`
              + ` ของสเปก ซึ่งตัวแกะนี้ไม่ได้โมเดล`);
          }
          popTo(k, `</${tag}>`);
          break;
        }
      }
      continue;
    }

    /* ---------- foreign content: breakout ก่อนทุกอย่าง ---------- */
    if (inForeign() && BREAKOUT.has(tag)) {
      note(`<${tag}> อยู่ใน foreign content (svg/math) ⇒ เบราว์เซอร์เด้งมันออกมานอก svg/math`
        + ` ก่อนวาง (breakout) · ตัวแกะนี้โมเดลแบบประมาณ`);
      while (stack.length > 1 && inForeign()) stack.pop();
    }

    const foreign = inForeign();
    /* namespace ของโหนดใหม่ */
    const ns = foreign ? top().ns : (tag === 'svg' ? 'svg' : (tag === 'math' ? 'math' : 'html'));

    /* ---------- แท็กปิดโดยปริยาย (HTML เท่านั้น) ---------- */
    if (!foreign) {
      if (CLOSES_P.has(tag)) {
        const k = inScope('p', BUTTON_EDGE);
        if (k > 0) popTo(k, `<${tag}> เปิดขณะที่ <p> ยังค้าง`);
      }
      if (tag === 'li') {
        const k = inScope('li', LIST_EDGE);
        if (k > 0) popTo(k, '<li> เปิดขณะที่ <li> ยังค้าง');
      }
      if (tag === 'dd' || tag === 'dt') {
        for (const t of ['dd', 'dt']) {
          const k = inScope(t, LIST_EDGE);
          if (k > 0) { popTo(k, `<${tag}> เปิดขณะที่ <${t}> ยังค้าง`); break; }
        }
      }
      while (stack.length > 1) {
        const rule = IMPLIED.find(r => r.open.has(top().tag));
        if (rule && rule.closes.has(tag)) { stack.pop(); continue; }
        break;
      }
    }

    const attrs = parseAttrs(m[3]);
    const cls = classesOf(attrs);
    for (const c of cls) {
      if (c.includes('&')) {
        note(`ค่า class มี character reference ที่ชุด named ของตัวแกะไม่รู้จัก ("${c}")`
          + ` ⇒ เบราว์เซอร์จะถอดเป็นอักขระ แต่ตัวแกะนี้อ่านเป็นตัวอักษรตามตัว`);
      }
    }

    /* ---------- วางโหนด (ตารางอาจย้ายที่วางให้ · foster parenting) ---------- */
    let parent = top();
    if (!foreign && TABLE_CTX.has(parent.tag) && !TABLE_OK.has(tag)) {
      /* ของที่ไม่ใช่ของตาราง ถูกย้ายไปวาง **ก่อน** `<table>` ที่ใกล้ที่สุด ไม่ใช่วางข้างใน
         ⇒ `<table>` ที่คั่นกลางทำให้โซ่ **ติด** (เบราว์เซอร์ได้ 1) และ `<table class="mwin">`
         ทำให้โซ่ **ขาด** (เบราว์เซอร์ได้ 0) — ของเดิมตอบผิดทั้งสองทิศ (Reviewer-Claude ก2-4) */
      let t = stack.length - 1;
      while (t > 0 && stack[t].tag !== 'table') t--;
      if (t > 0) {
        note('foster parenting ของตาราง (ของที่ไม่ใช่ของตารางถูกย้ายไปไว้ก่อน <table>)'
          + ' ⇒ ตัวแกะนี้โมเดลแบบประมาณ');
        const table = stack[t];
        parent = table.parent;
        const node = {
          tag, ns, attrs, cls, children: [], parent,
          inert: parent.inert || INERT.has(tag),
        };
        parent.children.splice(parent.children.indexOf(table), 0, node);
        if (!(ns === 'html' && VOID.has(tag)) && !(ns !== 'html' && selfClosed(m[3]))) stack.push(node);
        continue;
      }
    }

    const node = {
      tag, ns, attrs, cls, children: [], parent,
      inert: parent.inert || INERT.has(tag),
    };
    parent.children.push(node);

    /* `/>` ปิดอิลิเมนต์จริงใน foreign content — และกับ `<svg/>`/`<math/>` ที่เขียนใน HTML ด้วย
       (สเปก: self-closing flag ของ foreign element ถูก "acknowledge") ⇒ ของเดิมดันทุกอย่างหลัง
       `<path …/>` ลงเป็นลูกหลาน ซึ่งตอบผิดบน feed/index.html วันนี้แล้ว (Reviewer-Claude ก2-1) */
    if (ns !== 'html' && selfClosed(m[3])) continue;
    if (ns === 'html' && VOID.has(tag)) continue;
    /* เนื้อที่เป็นข้อความล้วน: ข้ามถึงแท็กปิดของมันเอง ⇒ อะไรที่อยู่ข้างในไม่เคยเป็นอิลิเมนต์
       (`<script>` ที่มี `<!--` ในสตริงจึงไม่กินมาร์กอัปจริงที่อยู่ถัดไป) */
    if (ns === 'html' && tag === PLAINTEXT) { i = html.length; continue; }
    if (ns === 'html' && RAW_TEXT.has(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'i');
      const hit = close.exec(html.slice(i));
      if (!hit) {
        note(`<${tag}> ที่ไม่มีแท็กปิด ⇒ เนื้อที่เหลือทั้งเอกสารเป็นข้อความของมัน`);
        i = html.length;
      } else {
        i = i + hit.index + hit[0].length;
      }
      continue;
    }
    stack.push(node);
  }
  return root;
}

/* เดินทุกโหนดที่ **อยู่ใน DOM ที่ render** (ข้ามใต้ `<template>`) */
export function* walkLive(node) {
  for (const c of node.children) {
    if (c.inert) continue;
    yield c;
    yield* walkLive(c);
  }
}

/* มีโซ่ "ลูกโดยตรง" ที่คลาสครบตามที่ขอไหม — chain[0] คือปู่ chain[n-1] คือใบ
   เทียบด้วยคลาส ไม่ใช่ชื่อแท็ก (selector ของ §10.1 ไม่ผูกกับชื่อแท็ก) */
export function findDirectChain(root, chain) {
  const has = (n, want) => want.every(c => n.cls.has(c));
  for (const leaf of walkLive(root)) {
    let n = leaf, ok = true;
    for (let k = chain.length - 1; k >= 0; k--) {
      if (!n || !has(n, chain[k])) { ok = false; break; }
      n = n.parent;
    }
    if (ok) return leaf;
  }
  return null;
}

/* อิลิเมนต์แรกที่คลาสครบ — ใช้หาอกล่องสื่อของฟีดเพื่ออ่าน `data-orientation` ของมัน */
export function findByClasses(root, want) {
  for (const n of walkLive(root)) if (want.every(c => n.cls.has(c))) return n;
  return null;
}
