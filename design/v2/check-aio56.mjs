/* ============================================================================
   AIO-56 · ด่านตรวจของที่ส่งมอบ — ภาพกว้าง 13 ใบ + ม็อกอัพคู่ ก่อน/หลัง
   Visual-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/check-aio56.mjs
         SKIP_REPRO=1 node design/v2/check-aio56.mjs   → ข้ามข้อ 4 (สร้างซ้ำ) ตอนไล่แก้งาน

   ด่านนี้ตรวจ "ของที่ส่งมอบ" ไม่ใช่ "โค้ดที่เขียนไว้" — ทุกข้อวัดจากไฟล์จริงบนดิสก์
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DIR, ROOT, D } from './lib.mjs';

const OUTDIR = path.join(DIR, 'wide-out');
const SRCDIR = path.join(DIR, 'wide-src');
const SHOTS = path.join(DIR, 'shots');
const W = 2640, H = 1200;                /* ADR-001 §13.4 D4: 2640×1200 (11:5) เป๊ะ */
const MAX_BYTES = 300 * 1024;            /* ADR-001 §13.4 D4: ≤300 KB */
const SAFE = 0.121;

let fail = 0, pass = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}${detail ? ' — ' + detail : ''}`); }
};

/* ---- อ่านขนาดจากหัวไฟล์ WebP เอง ไม่พึ่งไลบรารีภายนอก ----
   รองรับทั้งสามชนิดของคอนเทนเนอร์ RIFF/WEBP: VP8 (lossy) · VP8L (lossless) · VP8X (extended) */
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tag = buf.toString('ascii', 12, 16);
  if (tag === 'VP8 ') {
    /* 20..22 = signature 0x9d 0x01 0x2a แล้วตามด้วย w,h แบบ 14 บิตใน 16 บิต little-endian */
    if (!(buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a)) return null;
    return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (tag === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
  }
  if (tag === 'VP8X') {
    const rd24 = o => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
    return [rd24(24) + 1, rd24(27) + 1];
  }
  return null;
}

const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/* ====================== 1. ครบ 13 ใบ และชื่อตรงกับคลัง ====================== */
console.log('\n1. ไฟล์ครบและชื่อตรงกับ assets/data.js');
const expected = ['default', ...D.series.map(s => s.slug)];
const have = fs.existsSync(OUTDIR)
  ? fs.readdirSync(OUTDIR).filter(f => f.endsWith('.webp')).map(f => f.replace(/\.webp$/, '')).sort()
  : [];
ok(have.length === 13, `มี 13 ใบ (เจอ ${have.length})`);
for (const name of expected) {
  ok(have.includes(name), `มี ${name}.webp`);
}
const extra = have.filter(h => !expected.includes(h));
ok(extra.length === 0, 'ไม่มีไฟล์เกินมาจากคลัง', extra.join(', '));

/* ====================== 2. ขนาดเป๊ะ และน้ำหนักไฟล์ ====================== */
console.log(`\n2. ทุกใบเป็น ${W}×${H} (11:5) เป๊ะ และ ≤ ${MAX_BYTES / 1024} KB`);
console.log('   (ขนาดต้องเป๊ะเพราะ build ส่ง width/height ไปกับ <img> — ADR-001 §13.4)');
for (const name of expected) {
  const p = path.join(OUTDIR, `${name}.webp`);
  if (!fs.existsSync(p)) { fail++; console.log(`  ✗ ${name}.webp ไม่มีไฟล์`); continue; }
  const buf = fs.readFileSync(p);
  const size = webpSize(buf);
  ok(size && size[0] === W && size[1] === H,
    `${name}.webp = ${W}×${H}`, size ? `ได้ ${size[0]}×${size[1]}` : 'อ่านหัวไฟล์ WebP ไม่ออก');
  ok(buf.length <= MAX_BYTES, `${name}.webp ≤ 300 KB`, `${(buf.length / 1024).toFixed(0)} KB`);
}

/* ====================== 3. ไม่มีตัวอักษรบนภาพ ======================
   ใบงานห้ามยอดวิว / ดาว / คำว่า mockup บนภาพ · แผ่นนี้เลือกทางที่แรงกว่าคือห้ามมีตัวอักษรเลย
   ตรวจที่ HTML ต้นทาง เพราะภาพที่ออกมามีแค่สิ่งที่อยู่ใน HTML นั้น */
console.log('\n3. HTML ต้นทางไม่มีข้อความที่จะถูกวาดลงภาพ');
for (const name of expected) {
  const p = path.join(SRCDIR, `${name}.html`);
  if (!fs.existsSync(p)) { fail++; console.log(`  ✗ ${name}.html ไม่มีไฟล์`); continue; }
  const visible = fs.readFileSync(p, 'utf8')
    .replace(/<head>[\s\S]*?<\/head>/g, '')
    .replace(/<[^>]*>/g, '').trim();
  ok(visible === '', `${name}.html ไม่มีตัวอักษรที่มองเห็น`, visible.slice(0, 40));
}

/* ====================== 4. สร้างซ้ำได้เหมือนเดิมทุกไบต์ ======================
   เกณฑ์เดียวกับ AIO-32: ภาพต้องมาจากสคริปต์ ไม่ใช่ของทำมือ
   พิสูจน์ด้วยการรันสคริปต์ซ้ำแล้วเทียบ sha256 ไม่ใช่ด้วยการอ่านโค้ดแล้วเชื่อ */
console.log('\n4. รันสคริปต์ซ้ำแล้วได้ไฟล์เดิมทุกไบต์');
if (process.env.SKIP_REPRO) {
  console.log('  — ข้าม (SKIP_REPRO)');
} else {
  const before = Object.fromEntries(expected
    .filter(n => fs.existsSync(path.join(OUTDIR, `${n}.webp`)))
    .map(n => [n, sha(path.join(OUTDIR, `${n}.webp`))]));
  try {
    execFileSync('node', [path.join(DIR, 'covers-wide.mjs')], {
      cwd: ROOT, stdio: 'pipe',
      env: { ...process.env, WIDE_PORT: process.env.WIDE_PORT || '9354' },
    });
  } catch (e) {
    fail++; console.log(`  ✗ รัน covers-wide.mjs ซ้ำไม่สำเร็จ — ${e.message.split('\n')[0]}`);
  }
  for (const [n, h] of Object.entries(before)) {
    ok(sha(path.join(OUTDIR, `${n}.webp`)) === h, `${n}.webp เหมือนเดิมทุกไบต์`);
  }
}

/* ====================== 5. ลุคม่านทองไม่ขยับ ======================
   ห้ามตั้งสีใหม่: ค่าสีที่มองเห็นทุกค่าต้องมาจากโทเคน หรือจากคู่สี c1/c2 ใน assets/data.js
   ⇒ ใน CSS ของตัวสร้างต้องไม่มีเลขสีดิบ (#rrggbb / rgb() / hsl()) ยกเว้น #000 ที่เป็นค่าความทึบของ mask */
console.log('\n5. --accent ไม่ขยับ และตัวสร้างไม่ตั้งสีใหม่');
const tokens = fs.readFileSync(path.join(DIR, 'tokens.css'), 'utf8');
ok(/--accent:\s*#F5C451/i.test(tokens), 'design/v2/tokens.css ยังเป็น --accent:#F5C451');
const gen = fs.readFileSync(path.join(DIR, 'covers-wide.mjs'), 'utf8');
const cssBlock = (gen.match(/const CSS = `([\s\S]*?)\n`;/) || [, ''])[1];
const rawColors = (cssBlock.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi) || [])
  .filter(c => c.toLowerCase() !== '#000');
ok(rawColors.length === 0, 'CSS ของแผ่นไม่มีเลขสีดิบนอกจาก #000 ของ mask', rawColors.join(', '));

/* ====================== 6. ม็อกอัพคู่ ก่อน/หลัง ครบ ====================== */
console.log('\n6. ม็อกอัพกรอบจอเดียวครบคู่');
const FRAMES = ['1440x900', '1366x768', '390x844', '768x1024', 'cont-1440x900', 'cont-390x844'];
for (const tag of FRAMES) {
  for (const mode of ['before', 'after']) {
    ok(fs.existsSync(path.join(SHOTS, `aio56-${tag}-${mode}.png`)), `aio56-${tag}-${mode}.png`);
  }
}

/* ====================== 7. มือถือต้องไม่เปลี่ยนแม้พิกเซลเดียว ======================
   ข้อนี้คือคำสัญญาที่ให้ลูกค้าไว้: ฮีโร่มือถือเป็น 2:3 ไม่ครอป และข้อเสนอนี้ไม่แตะมันเลย
   พิสูจน์ด้วยการเทียบไฟล์ภาพ ไม่ใช่ด้วยการอ่านเงื่อนไข media query แล้วเชื่อ */
console.log('\n7. ฮีโร่มือถือ: ภาพ "ก่อน" กับ "หลัง" ต้องเหมือนกันทุกไบต์');
const mb = path.join(SHOTS, 'aio56-390x844-before.png');
const ma = path.join(SHOTS, 'aio56-390x844-after.png');
if (fs.existsSync(mb) && fs.existsSync(ma)) {
  ok(sha(mb) === sha(ma), 'aio56-390x844 before === after');
} else { fail++; console.log('  ✗ ไม่มีไฟล์ม็อกอัพมือถือให้เทียบ'); }

/* ====================== สรุป ====================== */
console.log(`\nกรอบปลอดภัยที่ตัวสร้างบังคับ: เว้นขอบด้านละ ${(SAFE * 100).toFixed(1)}% ⇒ กลางแผ่น ${Math.round(W * (1 - 2 * SAFE))}×${Math.round(H * (1 - 2 * SAFE))} px`);
console.log(`\n${fail ? '✗' : '✓'} ผ่าน ${pass} ข้อ · ไม่ผ่าน ${fail} ข้อ`);
process.exit(fail ? 1 : 0);
