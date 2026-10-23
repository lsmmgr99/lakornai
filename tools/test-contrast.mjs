/* วัดคอนทราสต์ของ placeholder "ทุกช่องกรอกในเว็บที่ส่งมอบ" ด้วยเบราว์เซอร์จริง — AIO-34 บั๊ก 4
   รัน:  node tools/test-contrast.mjs
         SKIP_BUILD=1 node tools/test-contrast.mjs     (ตรวจไฟล์ที่มีอยู่ตามสภาพ)
   ค่าตั้งต้นขอพอร์ตว่างจาก OS เอง · ตั้งทับได้ด้วย PH_PORT / PH_CDP

   ทำไมต้องใช้เบราว์เซอร์: assets/site.css เขียนทับตัวเองตอนท้ายไฟล์ (บล็อก build/site-extra.css
   ต่อหลัง design/v2/v2.css) และ placeholder ที่ไม่โดน selector ไหนเลยจะได้ "สีเริ่มต้นของ UA"
   ซึ่งไม่มีอยู่ในไฟล์ CSS เลย — grep กฎแรกที่เจอจึงได้ตัวเลขผิดทั้งสองทาง
   ค่าที่เชื่อได้มีทางเดียวคือ getComputedStyle(el, '::placeholder') บนหน้าที่ render จริง

   ด่านนี้ไม่ได้รับรายชื่อหน้ามาจากใคร: สแกนไฟล์ที่ส่งมอบหาช่องกรอกที่มี placeholder เอง
   แล้วบังคับว่าจำนวนช่องที่ "วัดได้" ต้องเท่ากับจำนวนช่องที่ "มีอยู่" — หน้าฟอร์มใหม่
   ที่เพิ่มวันหน้าจะถูกวัดเองโดยไม่ต้องแก้ไฟล์นี้ */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startGate } from './cdp-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN = 4.5;                    /* WCAG 2.1 AA · 1.4.3 ข้อความขนาดปกติ */

/* process.execPath ไม่ใช่ 'node' จาก PATH (ต้องเป็น node ตัวเดียวกับที่รันด่านนี้) และต้องมีเพดาน
   — กฎข้อ 1 ของ tools/cdp-gate.mjs คือ "ทุกการรอมีเพดาน" แต่บรรทัดนี้อยู่ก่อนตัวร่วมถูกเรียก
   และทุกเคสของ tools/test-ports.mjs ตั้ง SKIP_BUILD=1 ⇒ ไม่มีด่านไหนเดินผ่าน (รีวิว AIO-47 C6) */
if (!process.env.SKIP_BUILD) {
  const r = spawnSync(process.execPath, ['build/build.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) {
    console.error('✗ build/build.mjs ล้ม — วัดไฟล์ที่ส่งมอบต่อไม่ได้' +
      (r.error ? ` (${r.error.message})` : '') + '\n' + (r.stderr || r.stdout || ''));
    process.exit(1);
  }
}

/* ---------- 1. หาช่องกรอกที่มี placeholder จากไฟล์ที่ส่งมอบ ----------
   `design/` เป็นไฟล์เสนอแบบของ Visual ไม่ใช่เว็บที่ส่งมอบ · ไม่นับ */
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'docs',
  '.paperclip-repositories', '.claude']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
}
/* นับเฉพาะ <input>/<textarea> ที่มีแอตทริบิวต์ placeholder — ช่องที่ไม่มีก็ไม่มีข้อความให้วัด */
const PH_TAG = /<(input|textarea)\b[^>]*\bplaceholder="[^"]*"[^>]*>/g;
const found = [];
for (const f of walk(ROOT)) {
  const html = fs.readFileSync(f, 'utf8');
  const hits = html.match(PH_TAG) || [];
  if (hits.length) found.push({ url: '/' + path.relative(ROOT, f).replace(/index\.html$/, ''), n: hits.length });
}
found.sort((a, b) => a.url.localeCompare(b.url));
const wantFields = found.reduce((a, p) => a + p.n, 0);

/* ---------- 2. เบราว์เซอร์ ----------
   การยกเซิร์ฟเวอร์/เบราว์เซอร์ เพดานเวลา และการเก็บกวาด อยู่ที่ tools/cdp-gate.mjs
   (ไฟล์นี้กับ tools/test-continue.mjs เคยมีโค้ดก้อนนั้นคนละสำเนา แล้วแก้ไม่สมมาตร — AIO-45 C2)
   ค่าตั้งต้นขอพอร์ตว่างจาก OS เอง · ตั้งทับได้ด้วย PH_PORT / PH_CDP */
const { BASE, evaluate, until, cleanup } = await startGate({
  envPorts: ['PH_PORT', 'PH_CDP'], profilePrefix: 'lakorn-ph-',
});
const go = p => until(p, "document.readyState === 'complete'");

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------- 3. ตัวตรวจในหน้า ----------
   สีพื้นหลังจริงของช่องกรอกไม่ได้อยู่ที่ตัวมันเองเสมอ (.search-box input ตั้ง background:none
   แล้วสีมาจากกล่องแม่) จึงไต่ขึ้นไปหาชั้นแรกที่ทึบ แล้วผสมชั้นที่โปร่งทั้งหมดลงมาตามลำดับ
   — ถ้าไม่ทำ จะได้ "rgba(0,0,0,0)" แล้วคำนวณคอนทราสต์จากสีดำสนิทซึ่งไม่ใช่สิ่งที่คนเห็น */
const PROBE = `(function () {
  function rgb(s) {
    var m = String(s).match(/-?[\\d.]+/g) || [];
    return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m.length > 3 ? +m[3] : 1 };
  }
  function over(fg, bg) {   /* ผสม fg (โปร่ง) ลงบน bg (ทึบ) */
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1
    };
  }
  function bgOf(el) {
    var stack = [];
    for (var n = el; n; n = n.parentElement) {
      var c = rgb(getComputedStyle(n).backgroundColor);
      if (c.a === 0) continue;
      stack.push(c);
      if (c.a === 1) break;
    }
    if (!stack.length || stack[stack.length - 1].a !== 1) stack.push({ r: 0, g: 0, b: 0, a: 1 });
    var out = stack.pop();
    while (stack.length) out = over(stack.pop(), out);
    return out;
  }
  return Array.prototype.slice.call(document.querySelectorAll('input[placeholder], textarea[placeholder]'))
    .map(function (el) {
      var ph = getComputedStyle(el, '::placeholder');
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder'),
        box: (el.parentElement || {}).className || '',
        color: ph.color,
        fg: rgb(ph.color),
        bg: bgOf(el),
        /* placeholder มีข้อความจริงให้คนอ่าน = ช่องยังว่าง */
        showing: !el.value
      };
    });
})()`;

const chan = c => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const lum = c => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

try {
  console.log(`บั๊ก 4 · คอนทราสต์ placeholder ทุกช่องกรอก (เกณฑ์ ${MIN}:1 · WCAG 2.1 AA 1.4.3) ที่ ${BASE}`);
  console.log(`  ℹ สแกนไฟล์ที่ส่งมอบแล้วพบช่องที่มี placeholder ${wantFields} ช่อง ใน ${found.length} หน้า`);

  const rows = [];
  for (const p of found) {
    await go(p.url);
    const got = await evaluate(PROBE);
    check(`${p.url} · วัดช่องกรอกได้ครบตามที่มีใน HTML (${got.length}/${p.n})`,
      got.length === p.n, `HTML มี ${p.n} · วัดได้ ${got.length}`);
    for (const f of got) rows.push({ ...f, url: p.url, cr: ratio(f.fg, f.bg) });
  }

  check(`วัดครบทุกช่องในเว็บที่ส่งมอบ (${rows.length}/${wantFields})`, rows.length === wantFields,
    `สแกนเจอ ${wantFields} · วัดได้ ${rows.length}`);

  console.log('');
  for (const r of rows) {
    const okRow = r.cr >= MIN;
    console.log(`  ${okRow ? '✓' : '✗'} ${r.url} ${r.tag}#${r.id || '-'} · `
      + `${hex(r.fg)} บน ${hex(r.bg)} = ${r.cr.toFixed(2)}:1 · placeholder "${r.placeholder}"`);
    if (okRow) pass++; else fail++;
  }

  /* ช่องที่ไม่โดน selector ไหนเลยจะได้สีเริ่มต้นของ UA ซึ่งไม่อยู่ในไฟล์ CSS
     ด่านนี้จับไว้ตรง ๆ เพื่อให้สาเหตุอ่านออกจากผลการรัน ไม่ใช่เห็นแค่ตัวเลขตก */
  const ua = rows.filter(r => hex(r.fg) === '#757575');
  console.log('');
  check('ไม่มีช่องไหนที่ยังใช้สี placeholder เริ่มต้นของเบราว์เซอร์ (#757575 = 3.73:1 บน --surface-2)',
    ua.length === 0, ua.map(r => `${r.url} ${r.tag}#${r.id}`).join(' / '));
  /* ทุกช่องต้องได้สีเดียวกัน — สองช่องคนละสีคือกฎที่ครอบไม่ทั่ว กำลังจะหลุดอีกจุดวันหน้า */
  const colors = [...new Set(rows.map(r => hex(r.fg)))];
  check(`ทุกช่องใช้สี placeholder ชุดเดียวกัน (${colors.join(', ')})`, colors.length === 1, colors.join(', '));

  const worst = rows.reduce((a, r) => (r.cr < a.cr ? r : a), rows[0]);
  console.log(`\nต่ำสุด ${worst.cr.toFixed(2)}:1 ที่ ${worst.url} (${worst.tag}#${worst.id || '-'})`);
  console.log(`ผล: ผ่าน ${pass} · ตก ${fail}`);
  await cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  await cleanup(1);
}
