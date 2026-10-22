/* จัด build artifact ของเว็บ static — ปลายทางของ ADR-001 §9.1 คือ "artifact ที่พร้อม" เท่านั้น
   เจ้าของ: DevOps (AIO-30) · สคริปต์นี้ไม่ publish ไม่ deploy ไม่แตะเซิร์ฟเวอร์ ไม่ต้องมีเครือข่าย
   รัน:  node ci/stage-artifact.mjs [root] [ปลายทาง]      (ค่าตั้งต้นปลายทาง = <root>/_artifact)

   หน้าที่: คัดเฉพาะไฟล์ที่ผู้ชมต้องได้ แล้ว "พิสูจน์" ว่าของที่ไม่ใช่ของผู้ชมไม่ติดไปด้วย
   เหตุที่ต้องพิสูจน์: แผง admin กับ broker อยู่ในรีโปเดียวกับเว็บ ถ้าหลุดเข้า artifact
   มันจะกลายเป็นหน้าเว็บสาธารณะพร้อมปลายทาง API — ด่านนี้ทำให้พลาดแบบนั้นไม่เงียบ */
import fs from 'node:fs';
import path from 'node:path';
import { siteFiles, EXCLUDE_DIRS, REQUIRED_IN_ARTIFACT } from './site-files.mjs';

const root = path.resolve(process.argv[2] || '.');
const dest = path.resolve(process.argv[3] || path.join(root, '_artifact'));

if (dest === root) { console.error('✗ ปลายทางต้องไม่ใช่ root ของรีโป'); process.exit(1); }
fs.rmSync(dest, { recursive: true, force: true });

const files = siteFiles(root, {});
const errors = [];

for (const rel of files) {
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, rel), target);
}

/* ---------- ยามกันของหลุด: ตรวจจากไฟล์ที่คัดลอกแล้วจริง ไม่ใช่จากความตั้งใจของ allowlist ---------- */
const staged = siteFiles(dest, {});

for (const rel of staged) {
  const top = rel.split('/')[0];
  if (EXCLUDE_DIRS.has(top)) errors.push(`${rel}: โฟลเดอร์ที่ไม่ใช่ของผู้ชมหลุดเข้า artifact`);
  /* โค้ดฝั่งเซิร์ฟเวอร์/เครื่องมือเป็น .mjs ทั้งหมดในรีโปนี้ · รันไทม์ของเว็บเป็น assets/app.js */
  if (rel.endsWith('.mjs')) errors.push(`${rel}: ไฟล์ .mjs ไม่ควรอยู่ใน artifact ของเว็บ static`);
  if (/(^|\/)\.env|\.pem$|id_rsa|\.key$/.test(rel)) errors.push(`${rel}: ไฟล์ที่ชื่อเข้าข่าย credential — หยุดก่อน`);
}
for (const need of REQUIRED_IN_ARTIFACT) {
  if (!fs.existsSync(path.join(dest, need))) errors.push(`ขาด ${need} — build ไม่ครบ`);
}

const html = staged.filter(f => f.endsWith('.html'));
/* build วันที่ 23 ต.ค. 2026 ออก 460 หน้า · ตั้งพื้นไว้กันกรณี build เงียบ ๆ ออกไม่ครบ
   ไม่ตั้งเป็นเลขตรงตัวเพราะจำนวนหน้าโตตามจำนวนตอนที่ทีมเพิ่ม ซึ่งเป็นเรื่องปกติ */
if (html.length < 400) errors.push(`มีไฟล์ HTML แค่ ${html.length} ไฟล์ (คาดไว้อย่างน้อย 400) — build อาจไม่ครบ`);

if (errors.length) {
  console.error('✗ artifact ไม่ผ่านการตรวจ ' + errors.length + ' ข้อ\n  - ' + errors.slice(0, 30).join('\n  - '));
  fs.rmSync(dest, { recursive: true, force: true });
  process.exit(1);
}

const bytes = staged.reduce((a, f) => a + fs.statSync(path.join(dest, f)).size, 0);
console.log(`✓ artifact พร้อม: ${dest}`);
console.log(`  ${staged.length} ไฟล์ (HTML ${html.length}) · ${(bytes / 1048576).toFixed(1)} MB · ไม่มี admin/ build/ ci/ design/ docs/ tools/ และไม่มี .mjs`);
console.log('  นี่คือปลายทางของ ADR-001 §9.1 — การนำขึ้น staging/production เป็นงานแยกที่มีประตูอนุมัติของตัวเอง');
