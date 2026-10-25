/* เครื่องมือย้ายข้อมูลครั้งเดียว — content.json สัญญา version 1 → 2  (AIO-57 · ADR-001 §13.3)

   รัน:  node tools/migrate-content-orientation.mjs            → เขียนไฟล์
         node tools/migrate-content-orientation.mjs --check    → ตรวจหลักฐานเท่านั้น ไม่เขียน

   ⚠️ ชื่อไฟล์ต่างจาก tools/migrate-content-v2.mjs โดยเจตนา — ตัวนั้นย้าย **รูปแบบของ
      assets/data.js** ไม่ใช่ `version` ของสัญญา §6 (ADR-001 §13.3 ข้อ 1 สั่งไม่ให้ชื่อชนกัน)

   ทำไมต้องเก็บเครื่องมือไว้ในรีโป ไม่ใช่แก้ไฟล์ด้วยมือ:
   ค่าที่เติมคือ `"vertical"` ทั้ง 12 เรื่อง และ ADR-001 §13.2 ห้าม "ค่าตั้งต้น" โดยเด็ดขาด
   ⇒ ค่านี้จะชอบธรรมได้ก็ต่อเมื่อมันเป็น **ข้อเท็จจริงที่ตรวจได้** ไม่ใช่สิ่งที่ใครพิมพ์ลงไป
   ตัวนี้จึงตรวจหลักฐานสามข้อที่ CTO ยืนยันไว้ใน §13.3 ข้อ 2 ก่อนเขียนทุกครั้ง และล้มถ้าข้อใด
   ไม่จริง — วันหน้าใครสงสัยว่าเลขมาจากไหน รันซ้ำแล้วเห็นหลักฐานเดิมได้ ไม่ต้องเชื่อ commit

   หลักฐานสามข้อ:
     1. ปกของทุกเรื่องเป็น 1024×1536 (2:3) — วัดจากหัวไฟล์จริง ไม่ได้ดูจากชื่อไฟล์
     2. ยังไม่มีไฟล์วิดีโอในรีโปแม้ไฟล์เดียว (`<video` = 0 จุดนอก design/)
     3. ยังไม่มีเรื่องใดประกาศ `coverWide` (ภาพกว้างของ AIO-56 ยังไม่ผ่านการอนุมัติ)
   ข้อ 3 สำคัญเพราะมันหมายความว่า "ไม่มีเรื่องไหนถูกผลิตมาเป็นแนวนอนแล้ว" ⇒ ถ้าวันหน้า
   มีเรื่องแนวนอนจริง ตัวนี้จะล้ม และคนต้องมาเลือกทิศเอง ซึ่งเป็นพฤติกรรมที่ถูก */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from '../build/imgsize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = p => path.join(ROOT, p);
const CHECK_ONLY = process.argv.includes('--check');
const VALUE = 'vertical';
const POSTER_W = 1024, POSTER_H = 1536;

const raw = fs.readFileSync(R('content.json'), 'utf8');
const data = JSON.parse(raw);

const die = m => { console.error('✗ ' + m); process.exit(1); };

if (data.version === 2) {
  console.log('✓ content.json เป็น version 2 อยู่แล้ว — ไม่มีอะไรต้องย้าย');
  if (data.series.some(s => !s.orientation)) die('แต่ยังมีเรื่องที่ไม่มี orientation — ไฟล์ค้างกลางทาง');
  process.exit(0);
}
if (data.version !== 1) die(`content.json version ${data.version} — ตัวนี้ย้ายได้จาก 1 → 2 เท่านั้น`);
if (data.series.some(s => s.orientation !== undefined)) {
  die('มีเรื่องที่ประกาศ orientation ไว้แล้วทั้งที่ version ยังเป็น 1 — ไฟล์ไม่สอดคล้อง ตรวจด้วยมือก่อน');
}

/* ---------- หลักฐาน 1 · ปกทุกใบเป็น 2:3 ---------- */
const odd = [];
for (const s of data.series) {
  const rel = s.cover || `assets/covers/${s.slug}.webp`;
  const dim = imageSize(R(rel));
  if (!dim || dim.w !== POSTER_W || dim.h !== POSTER_H) {
    odd.push(`${s.slug} → ${rel} = ${dim ? `${dim.w}×${dim.h}` : 'อ่านไม่ออก'}`);
  }
}
if (odd.length) {
  die(`ปกไม่ใช่ ${POSTER_W}×${POSTER_H} ทุกใบ ⇒ หลักฐานข้อ 1 ไม่จริง เติม "${VALUE}" ให้เองไม่ได้\n    `
    + odd.join('\n    '));
}
console.log(`✓ หลักฐาน 1 · ปกทั้ง ${data.series.length} ใบเป็น ${POSTER_W}×${POSTER_H} (2:3)`);

/* ---------- หลักฐาน 2 · ไม่มีไฟล์วิดีโอในระบบ ----------
   นับ "ไฟล์วิดีโอ" จากนามสกุลจริงบนดิสก์ ไม่ใช่จากการ grep หาแท็ก <video> ในซอร์ส
   (แท็กในคอมเมนต์หรือในม็อกอัพของ Visual ไม่ได้แปลว่ามีของจริง — บทเรียน AIO-54
    เรื่องด่าน regex ที่นับคอมเมนต์เป็นของจริง) · design/ เป็นชั้นออกแบบ ไม่ใช่เว็บจริง */
const VIDEO_EXT = /\.(mp4|m4v|webm|mov|m3u8|mpd)$/i;
/* `.paperclip-repositories` = สำเนารีโปของ runtime ที่ run อื่นในเวิร์กสเปซเดียวกันทิ้งไว้ ·
   ถ้าไม่ตัด เครื่องมือจะล้มเพราะไฟล์ของคนอื่นพร้อมข้อความที่ชี้ผิดทาง (AIO-63 ข้อ 7) */
const SKIP = new Set(['.git', 'node_modules', 'design', '.paperclip-repositories']);
const videos = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name)); continue; }
    if (VIDEO_EXT.test(e.name)) videos.push(path.relative(ROOT, path.join(dir, e.name)));
  }
})(ROOT);
if (videos.length) {
  die(`มีไฟล์วิดีโอในรีโป ${videos.length} ไฟล์ ⇒ หลักฐานข้อ 2 ไม่จริง — ทิศของแต่ละเรื่อง`
    + ` ต้องมาจากไฟล์จริง ไม่ใช่จากค่าที่ตัวนี้เติม\n    ` + videos.slice(0, 10).join('\n    '));
}
console.log('✓ หลักฐาน 2 · ไม่มีไฟล์วิดีโอในรีโปแม้ไฟล์เดียว (นอก design/)');

/* ---------- หลักฐาน 3 · ยังไม่มีภาพกว้างที่เรื่องไหนอ้างถึง ---------- */
const wide = data.series.filter(s => s.coverWide);
if (wide.length) {
  die(`มี ${wide.length} เรื่องที่ประกาศ coverWide ไว้แล้ว ⇒ หลักฐานข้อ 3 ไม่จริง`);
}
console.log('✓ หลักฐาน 3 · ยังไม่มีเรื่องใดประกาศ coverWide');

if (CHECK_ONLY) { console.log('\n(--check) หลักฐานครบ · ไม่เขียนไฟล์'); process.exit(0); }

/* ---------- เขียน ----------
   แก้เป็น "ข้อความ" ไม่ใช่ JSON.stringify ทั้งไฟล์ใหม่ เพื่อให้ diff มีแค่บรรทัดที่เพิ่ม
   (stringify ใหม่จะจัดรูปทั้ง 56 KB แล้วรีวิวอ่านไม่ออกว่าอะไรเปลี่ยนจริง)
   ยึดบรรทัด `"cover": "…",` ของแต่ละเรื่องเป็นจุดแทรก — ทุกเรื่องมีฟิลด์นี้เสมอ (กฎ V6) */
const coverLine = /^(\s*)"cover": ("assets\/covers\/[^"]+"),$/gm;
let hits = 0;
let out = raw.replace(coverLine, (m, indent, val) => {
  hits++;
  return `${m}\n${indent}"orientation": ${JSON.stringify(VALUE)},`;
});
if (hits !== data.series.length) {
  die(`หาบรรทัด "cover" ได้ ${hits} จุด แต่มี ${data.series.length} เรื่อง — รูปแบบไฟล์ไม่ตรงที่คาด`
    + ` ห้ามเขียนทับโดยเดา`);
}
const verLine = /^(\s*)"version": 1,$/m;
if (!verLine.test(out)) die('หาบรรทัด "version": 1 ไม่เจอ — ห้ามเขียนทับโดยเดา');
out = out.replace(verLine, '$1"version": 2,');

/* ไฟล์ที่เขียนออกต้องยัง parse ได้ และต้องได้ค่าตามที่ตั้งใจครบทุกเรื่อง ก่อนแตะดิสก์ */
const after = JSON.parse(out);
if (after.version !== 2) die('เขียนแล้วแต่ version ไม่เป็น 2');
if (after.series.length !== data.series.length) die('จำนวนเรื่องเปลี่ยนหลังแก้ — ยกเลิก');
for (const [i, s] of after.series.entries()) {
  if (s.orientation !== VALUE) die(`series[${i}] (${s.slug}) ไม่ได้ orientation = "${VALUE}"`);
  if (JSON.stringify({ ...s, orientation: undefined }) !== JSON.stringify({ ...data.series[i], orientation: undefined })) {
    die(`series[${i}] (${s.slug}) มีฟิลด์อื่นเปลี่ยนไปด้วย — ตัวนี้ต้องเพิ่มฟิลด์เดียวเท่านั้น`);
  }
}
/* คีย์บนสุดอื่น ๆ (`genres` `tropes` `meta` `generatedAt`) ไม่ถูกเทียบเลยในรอบแรก (AIO-63 ข้อ 7)
   ⇒ เทียบทั้งไฟล์กับ "ไฟล์เดิมที่ฉีด orientation ตามตำแหน่งที่คาด" ครั้งเดียวจบ */
const expected = { ...data, version: 2, series: data.series.map(s => ({ ...s, orientation: VALUE })) };
if (JSON.stringify(after) !== JSON.stringify(expected)) {
  die('ไฟล์ที่จะเขียนต่างจาก "ไฟล์เดิม + orientation" ในจุดอื่นด้วย — ยกเลิก ห้ามเขียนทับโดยเดา');
}

fs.writeFileSync(R('content.json'), out);
console.log(`\n✓ เขียน content.json · version 1 → 2 · เติม orientation = "${VALUE}" ครบ ${hits} เรื่อง`);
console.log('  เว็บไม่เปลี่ยนแม้พิกเซลเดียวจากขั้นนี้: ทุกเรื่องเป็นแนวตั้ง ⇒ กล่องเพลเยอร์ยัง 9:16');
console.log('  ฟีดยังมีครบทุกเรื่อง · ยังไม่มีไฟล์ใน assets/covers-wide/ ⇒ ทุกที่วางถอยไปใช้ปก 2:3');
