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

   ขอบเขตที่ไฟล์นี้ **ไม่** รับประกัน (เขียนไว้เพื่อไม่ให้ถูกยืมไปใช้เกินตัว): มันไม่ใช่ HTML parser
   ตามสเปก · ไม่ทำ foster-parenting ของตาราง · ไม่ทำ "adoption agency" ของแท็กจัดรูป ⇒ ใช้ถาม
   **ความเป็นลูกโดยตรงของกล่องที่มีคลาส** ในหน้าที่ build สร้างเองเท่านั้น (ซึ่งเป็นมาร์กอัปที่เรา
   เขียนเอง ไม่ใช่ HTML จากอินเทอร์เน็ต) · เทสต์ถาวรของมันอยู่ที่ ci/feed-media-window.test.mjs */

/* แท็กที่ไม่มีลูก (HTML spec · void elements) */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* แท็กที่เนื้อข้างในเป็น **ข้อความ** ไม่ใช่มาร์กอัป ⇒ ข้ามไปจนถึงแท็กปิดของมันแบบตัวอักษร
   `noscript` อยู่ในชุดนี้เพราะหน้าของเราเป็นหน้าที่ JS ทำงาน (ฟีดทั้งหน้าเป็น JS) ⇒ ในเบราว์เซอร์
   จริงเนื้อของมันเป็นข้อความ ไม่ใช่อิลิเมนต์ · (ถ้าวัดด้วย `DOMParser` จะได้คนละคำตอบ เพราะที่นั่น
   สคริปต์ปิด — เราวัดหน้าที่ผู้ชมเห็น ไม่ใช่หน้าที่ parser เห็น) */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes', 'noscript']);

/* เนื้อของ `<template>` ไม่อยู่ใน DOM ที่ render ⇒ อยู่ในต้นไม้ แต่ถูกกันออกจากการค้นหา */
const INERT = new Set(['template']);

/* แท็กปิดโดยปริยาย — เท่าที่มาร์กอัปของเราใช้จริง (HTML spec "optional end tags")
   ถ้าไม่มีตารางนี้ `<p>` ที่ไม่ปิดจะค้างบนสแต็กแล้วดันชั้นปู่เพี้ยน = แดงผิด */
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const IMPLIED = [
  { open: new Set(['li']), closes: new Set(['li']) },
  { open: new Set(['dt', 'dd']), closes: new Set(['dt', 'dd']) },
  { open: new Set(['option']), closes: new Set(['option', 'optgroup']) },
  { open: new Set(['td', 'th']), closes: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']) },
  { open: new Set(['tr']), closes: new Set(['tr', 'tbody', 'tfoot', 'thead']) },
  { open: new Set(['thead', 'tbody', 'tfoot']), closes: new Set(['tbody', 'tfoot', 'thead']) },
];

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
    if (!attrs.has(key)) attrs.set(key, value);   /* HTML: แอตทริบิวต์ซ้ำ ตัวแรกชนะ */
  }
  return attrs;
}

const classesOf = attrs => new Set((attrs.get('class') || '').trim().split(/\s+/).filter(Boolean));

/* คืนรากของต้นไม้ · แต่ละโหนด = { tag, attrs, cls, children, parent, inert } */
export function parseHtml(html) {
  const root = { tag: '#root', attrs: new Map(), cls: new Set(), children: [], parent: null, inert: false };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    /* คอมเมนต์ · doctype · CDATA — ไม่ใช่อิลิเมนต์ และต้องถูกข้ามแบบ "หาปลายของมันเอง"
       ไม่ใช่ลบด้วย regex ทั้งไฟล์ก่อน (ลำดับการลบที่สลับกันกินมาร์กอัปจริงทิ้งได้ · ข 2) */
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end < 0 ? html.length : end + 3;
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
        if (stack[k].tag === tag) { stack.length = k; break; }
      }
      continue;
    }
    /* ปิดโดยปริยายก่อนเปิดตัวใหม่ */
    while (stack.length > 1) {
      const t = top().tag;
      if (t === 'p' && CLOSES_P.has(tag)) { stack.pop(); continue; }
      const rule = IMPLIED.find(r => r.open.has(t));
      if (rule && rule.closes.has(tag)) { stack.pop(); continue; }
      break;
    }
    const attrs = parseAttrs(m[3]);
    const parent = top();
    const node = {
      tag, attrs, cls: classesOf(attrs), children: [], parent,
      inert: parent.inert || INERT.has(tag),
    };
    parent.children.push(node);
    if (VOID.has(tag)) continue;
    /* เนื้อที่เป็นข้อความล้วน: ข้ามถึงแท็กปิดของมันเอง ⇒ อะไรที่อยู่ข้างในไม่เคยเป็นอิลิเมนต์
       (`<script>` ที่มี `<!--` ในสตริงจึงไม่กินมาร์กอัปจริงที่อยู่ถัดไป) */
    if (RAW_TEXT.has(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = html.slice(i);
      const hit = close.exec(rest);
      i = hit ? i + hit.index + hit[0].length : html.length;
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
