/* จัด build artifact ของเว็บ static — ปลายทางของ ADR-001 §9.1 คือ "artifact ที่พร้อม" เท่านั้น
   เจ้าของ: DevOps (AIO-30) · สคริปต์นี้ไม่ publish ไม่ deploy ไม่แตะเซิร์ฟเวอร์ ไม่ต้องมีเครือข่าย
   รัน:  node ci/stage-artifact.mjs [root] [ปลายทาง]      (ค่าตั้งต้นปลายทาง = <root>/_artifact)

   หน้าที่: คัดเฉพาะไฟล์ที่ผู้ชมต้องได้ แล้ว "พิสูจน์" ว่าของที่ไม่ใช่ของผู้ชมไม่ติดไปด้วย
   เหตุที่ต้องพิสูจน์: แผง admin กับ broker อยู่ในรีโปเดียวกับเว็บ ถ้าหลุดเข้า artifact
   มันจะกลายเป็นหน้าเว็บสาธารณะพร้อมปลายทาง API — ด่านนี้ทำให้พลาดแบบนั้นไม่เงียบ */
import fs from 'node:fs';
import path from 'node:path';
import { siteFiles, REQUIRED_IN_ARTIFACT } from './site-files.mjs';
import { allFiles, auditFileSet } from './publish-gate.mjs';

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

/* ---------- ยามกันของหลุด: ตรวจจากไฟล์ที่คัดลอกแล้วจริง ไม่ใช่จากความตั้งใจของ allowlist ----------
   เดินไฟล์ "ดิบ" ด้วย allFiles ไม่ใช่ siteFiles — siteFiles กรองโฟลเดอร์ต้องห้ามที่รากออกก่อนแล้ว
   (ci/site-files.mjs:34) ถ้าใช้มันอ่านรายชื่อ ของที่หลุดเข้ามาจะไม่อยู่ในรายชื่อที่ยามเห็น = ยามตาบอด
   กฎทั้งชุดอยู่ที่ ci/publish-gate.mjs ที่เดียว และมีมิวเทชันเทสต์กำกับที่ ci/publish-gate.test.mjs */
const staged = allFiles(dest);
errors.push(...auditFileSet(staged.files, { links: staged.links, required: REQUIRED_IN_ARTIFACT }).errors);

const html = staged.files.filter(f => f.endsWith('.html'));
/* build วันที่ 23 ต.ค. 2026 ออก 460 หน้า · ตั้งพื้นไว้กันกรณี build เงียบ ๆ ออกไม่ครบ
   ไม่ตั้งเป็นเลขตรงตัวเพราะจำนวนหน้าโตตามจำนวนตอนที่ทีมเพิ่ม ซึ่งเป็นเรื่องปกติ */
if (html.length < 400) errors.push(`มีไฟล์ HTML แค่ ${html.length} ไฟล์ (คาดไว้อย่างน้อย 400) — build อาจไม่ครบ`);

if (errors.length) {
  console.error('✗ artifact ไม่ผ่านการตรวจ ' + errors.length + ' ข้อ\n  - ' + errors.slice(0, 30).join('\n  - '));
  fs.rmSync(dest, { recursive: true, force: true });
  process.exit(1);
}

const bytes = staged.files.reduce((a, f) => a + fs.statSync(path.join(dest, f)).size, 0);
console.log(`✓ artifact พร้อม: ${dest}`);
console.log(`  ${staged.files.length} ไฟล์ (HTML ${html.length}) · ${(bytes / 1048576).toFixed(1)} MB · ไม่มี admin/ build/ ci/ design/ docs/ tools/ และไม่มี .mjs`);
console.log(`  ดูชุดไฟล์ทั้งชุดและตรวจซ้ำแยกได้ที่:  node ci/publish-gate.mjs ${path.relative(root, dest) || dest}`);
console.log('  นี่คือปลายทางของ ADR-001 §9.1 — การนำขึ้น staging/production เป็นงานแยกที่มีประตูอนุมัติของตัวเอง');
