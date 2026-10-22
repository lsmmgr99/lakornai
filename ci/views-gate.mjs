/* ด่าน V12–V13 ของ ADR-001 §6.4 + §12.3 — ตรวจ "ผลผลิตของ build" ไม่ใช่ไฟล์ข้อมูล
   เจ้าของด่าน: DevOps (AIO-30) · กฎ V12/V13 ตามเอกสารเป็นของ Dev-Claude ที่จะใส่ใน build/build.mjs ด้วย
   ด่านนี้คือรอบที่ "เป็นตัวตัดสิน" ตาม §9.2 จึงอยู่นอก build/ เพื่อให้ตัดสินของที่ build เขียนลงดิสก์จริง

   รัน:  node ci/views-gate.mjs [root]        (ต้องรันหลัง node build/build.mjs)
   ผิดข้อใดข้อหนึ่ง = exit 1 = ไม่มี artifact ออกไป */
import fs from 'node:fs';
import path from 'node:path';
import { siteFiles } from './site-files.mjs';

/* V13 — ถ้อยคำที่อ้างว่ามีการวัดผู้ชม (§12.3 ระบุชุดคำขั้นต่ำไว้ ใช้ตามนั้น)
   สิ่งที่ §12.3 บอกชัดว่า "ไม่ได้ห้าม": URL /popular · คำว่า "ยอดนิยม" ที่เป็นป้ายเมนูหรือหัวข้อหมวด ·
   การจัดลำดับหรือการโชว์เลขอันดับ 1–10 — จึงจับเป็น "วลี" ไม่ใช่คำโดด */
export const CLAIM_PATTERNS = [
  [/ยอดนิยมสัปดาห์นี้/, 'อ้างว่าอันดับมาจากการวัดในสัปดาห์นี้'],
  [/ยอดนิยม[^<\n]{0,20}สัปดาห์/, 'อ้างว่าอันดับยอดนิยมผูกกับสัปดาห์'],
  [/TOP\s*10\s*สัปดาห์นี้/i, 'อ้างว่า TOP 10 เป็นของสัปดาห์นี้'],
  [/คนดูมากที่สุด/, 'อ้างว่ามีการวัดจำนวนคนดู'],
  [/อันดับจากยอดวิว/, 'อ้างว่าอันดับมาจากยอดวิว'],
  [/most\s*watched/i, 'อ้างว่ามีการวัดจำนวนคนดู (อังกฤษ)'],
  [/trending/i, 'อ้างว่ามีสัญญาณความนิยมที่วัดได้'],
];

/* หน่วยย่อที่ใช้กับยอดวิว — ใช้ตัดสินว่าตัวเลขข้างหน้าคำว่า "วิว" คือยอดวิวจริง */
const VIEW_UNIT = String.raw`(?:ล้าน|พัน|แสน|หมื่น|[KkMm])`;
const NUMBER_BEFORE = new RegExp(String.raw`\d[\d.,]*\s*${VIEW_UNIT}?\s*$`);
const NUMBER_WITH_UNIT = new RegExp(String.raw`\d[\d.,]*\s*${VIEW_UNIT}\s*(?:วิว|views)`, 'i');

/* แทนมาร์กอัปด้วยช่องว่างความยาวเท่ากัน เพื่อให้ index → เลขบรรทัดยังตรงกับไฟล์จริง
   (ถ้าใช้ strip ธรรมดา เลขบรรทัดที่รายงานจะเพี้ยนและตรวจซ้ำไม่ได้) */
function maskMarkup(html) {
  const blank = (m) => ' '.repeat(m.length);
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const squeeze = (s) => s.replace(/\s+/g, ' ').trim();

/* เก็บชิ้นข้อความที่ V13 ต้องคุม: <title> · meta description/og · JSON-LD · หัวเรื่องและข้อความนำ
   แต่ละชิ้นเก็บ index ในไฟล์ต้นฉบับไว้ เพื่อรายงาน file:line ได้ */
function claimScopes(html) {
  const out = [];
  const push = (scope, value, index) => { if (value && value.trim()) out.push({ scope, value, index }); };

  for (const m of html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)) push('<title>', m[1], m.index + m[0].indexOf(m[1]));

  for (const m of html.matchAll(/<meta\b[^>]*?\b(?:name|property)="(description|og:title|og:description)"[^>]*?\bcontent="([^"]*)"/gi)) {
    push(`meta ${m[1]}`, m[2], m.index + m[0].lastIndexOf(m[2]));
  }
  /* เผื่อลำดับ attribute สลับ (content มาก่อน name) */
  for (const m of html.matchAll(/<meta\b[^>]*?\bcontent="([^"]*)"[^>]*?\b(?:name|property)="(description|og:title|og:description)"/gi)) {
    push(`meta ${m[2]}`, m[1], m.index + m[0].indexOf(m[1]));
  }

  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    push('JSON-LD', m[1], m.index + m[0].indexOf(m[1]));
  }

  /* ข้อความนำบนหน้า: หัวเรื่อง h1/h2 · หัว/คำโปรยของบล็อก page-head · คำโปรย .sub ของการ์ดนำทาง */
  for (const m of html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)) push('หัวเรื่อง', maskMarkup(m[1]), m.index);
  for (const m of html.matchAll(/<div class="page-head"[^>]*>([\s\S]*?)<\/div>/gi)) push('ข้อความนำ page-head', maskMarkup(m[1]), m.index);
  for (const m of html.matchAll(/<span class="sub"[^>]*>([\s\S]*?)<\/span>/gi)) push('คำโปรย .sub', maskMarkup(m[1]), m.index);

  return out;
}

/* ตรวจไฟล์ HTML หนึ่งไฟล์ · คืนรายการข้อผิดพลาด (ว่าง = ผ่าน)
   แยกเป็นฟังก์ชันบริสุทธิ์เพื่อให้ ci/views-gate.test.mjs ทดสอบได้ตรง ๆ */
export function scanHtml({ file, html, viewsSource }) {
  if (viewsSource !== 'none') return [];
  const findings = [];
  const add = (rule, index, what, quote) =>
    findings.push({ rule, file, line: lineOf(html, index), what, quote: squeeze(quote).slice(0, 90) });

  /* ---------- V12 — ตัวเลขยอดวิว และป้าย "วิว" กำพร้า ---------- */
  const text = maskMarkup(html);
  for (const m of text.matchAll(/วิว|views/gi)) {
    const before = text.slice(Math.max(0, m.index - 14), m.index);
    /* "ยอดวิว" / "preview" คือคำในประโยค ไม่ใช่ป้ายยอดวิว — ตัดออกด้วยการดูอักษรที่ติดกันข้างหน้า */
    if (/[฀-๿A-Za-z]$/.test(before)) continue;
    const context = text.slice(Math.max(0, m.index - 24), m.index + 24);
    if (NUMBER_BEFORE.test(before)) add('V12(ก)', m.index, 'ตัวเลขยอดวิวใน HTML ที่ส่งออก ขณะ viewsSource="none"', context);
    else add('V12(ข)', m.index, 'ป้าย "วิว" ที่ไม่มีตัวเลขนำหน้า (ป้ายกำพร้า §12.2 C1)', context);
  }

  /* ตัวเลข+หน่วยย่อ ในที่ที่ maskMarkup มองไม่เห็น (meta content / JSON-LD) */
  const scopes = claimScopes(html);
  for (const s of scopes) {
    const m = s.value.match(NUMBER_WITH_UNIT);
    if (m) add('V12(ก)', s.index, `ตัวเลขยอดวิวใน ${s.scope}`, m[0]);
  }

  /* ---------- V13 — ถ้อยคำอ้างว่ามีการวัดผู้ชม ---------- */
  for (const s of scopes) {
    /* วลีต้องห้ามหลายข้อทับช่วงเดียวกันได้ (เช่น "ยอดนิยมสัปดาห์นี้" เข้าสองแบบ)
       รายงานจุดละครั้งเพื่อให้จำนวนที่ขึ้นเท่ากับจำนวนที่ต้องแก้จริง */
    const claimed = [];
    for (const [re, why] of CLAIM_PATTERNS) {
      const m = s.value.match(re);
      if (!m) continue;
      const [from, to] = [m.index, m.index + m[0].length];
      if (claimed.some(([a, b]) => from < b && a < to)) continue;
      claimed.push([from, to]);
      add('V13', s.index, `${s.scope}: ${why}`, m[0]);
    }
  }

  return findings;
}

/* ---------- CLI ---------- */
function main(root) {
  const contentPath = path.join(root, 'content.json');
  if (!fs.existsSync(contentPath)) {
    console.error(`✗ ไม่พบ ${contentPath} — ด่าน V12–V13 ต้องรู้ค่า meta.viewsSource ของไฟล์ที่ใช้ build รอบนั้น`);
    process.exit(1);
  }
  const viewsSource = JSON.parse(fs.readFileSync(contentPath, 'utf8'))?.meta?.viewsSource;
  if (!['none', 'analytics'].includes(viewsSource)) {
    console.error(`✗ meta.viewsSource = ${JSON.stringify(viewsSource)} ไม่ใช่ค่าที่สัญญารู้จัก (V10)`);
    process.exit(1);
  }

  const files = siteFiles(root, { ext: '.html' });
  if (!files.length) {
    console.error('✗ ไม่พบไฟล์ HTML ที่ส่งออกเลย — ยังไม่ได้รัน node build/build.mjs ?');
    process.exit(1);
  }

  const findings = [];
  for (const file of files) {
    findings.push(...scanHtml({ file, html: fs.readFileSync(path.join(root, file), 'utf8'), viewsSource }));
  }

  if (viewsSource === 'analytics') {
    console.log(`✓ V12–V13 ไม่บังคับ: meta.viewsSource = "analytics" (ตรวจ ${files.length} ไฟล์ ไม่มีกฎให้บังคับ)`);
    return;
  }

  if (!findings.length) {
    console.log(`✓ V12–V13 ผ่าน (${files.length} ไฟล์ · viewsSource = "none")`);
    return;
  }

  /* สรุปแบบจัดกลุ่ม: เลขบรรทัดครบทุกข้อให้ตรวจซ้ำได้ แต่ไม่ท่วมจอตอนหลุดเป็นร้อยจุด */
  const byRule = new Map();
  for (const f of findings) {
    const key = `${f.rule} · ${f.what}`;
    if (!byRule.has(key)) byRule.set(key, []);
    byRule.get(key).push(f);
  }
  console.error(`✗ V12–V13 ไม่ผ่าน ${findings.length} จุด ใน ${new Set(findings.map(f => f.file)).size} ไฟล์ (viewsSource = "none")`);
  for (const [key, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`\n  ${key} — ${list.length} จุด`);
    for (const f of list.slice(0, 8)) console.error(`    ${f.file}:${f.line}  “${f.quote}”`);
    if (list.length > 8) console.error(`    … และอีก ${list.length - 8} จุด`);
  }
  console.error('\n  กฎนี้บังคับโดย ADR-001 §6.4 (V12–V13) และ §12.3 — ผิด = build ล้ม ไม่มี artifact ออกไป');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main(path.resolve(process.argv[2] || '.'));
