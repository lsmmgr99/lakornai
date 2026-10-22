/* ด่านตรวจ: ม็อกอัพที่ลูกค้าอนุมัติต้องสร้างซ้ำได้จากรีโปตลอด  (AIO-22)
   รัน:  node tools/check-mockup.mjs

   เหตุที่ต้องมีด่านนี้ ไม่ใช่คำสัญญา
   ---------------------------------
   `design/v2/lib.mjs:10` อ่าน `assets/data.js` เป็นข้อมูลตั้งต้นของม็อกอัพ
   รอบก่อน `build/build.mjs` เขียนทับไฟล์นั้นจาก `content.json` ซึ่งไม่มี `subs`/`following`
   ผลคือรันเจนเนอเรเตอร์ม็อกอัพซ้ำแล้วได้ `<p class="sub-t">undefined</p>` ใน 3 ไฟล์
   และ `library-following.html` หายไป 52 บรรทัด — "git status สะอาด" ตรวจเรื่องนี้ไม่เจอ
   เพราะไฟล์ยังไม่ถูกแตะ จนกว่าจะมีคนรันเจนเนอเรเตอร์

   วิธีตรวจ: สำเนา `design/` + `assets/data.js` ลงไดเรกทอรีชั่วคราว รันเจนเนอเรเตอร์ที่นั่น
   แล้วเทียบไบต์ต่อไบต์กับไฟล์ในรีโป · ไม่เขียนอะไรใต้ design/ ของจริงเลย (Visual เป็นเจ้าของ) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'design/v2');

if (!fs.existsSync(path.join(SRC, 'build.mjs'))) {
  console.error('✗ ไม่พบ design/v2/build.mjs');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lakornai-mockup-'));
try {
  fs.cpSync(path.join(ROOT, 'design'), path.join(tmp, 'design'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets/data.js'), path.join(tmp, 'assets/data.js'));

  const run = spawnSync(process.execPath, [path.join(tmp, 'design/v2/build.mjs')],
    { cwd: tmp, encoding: 'utf8' });
  if (run.status !== 0) {
    console.error('✗ เจนเนอเรเตอร์ม็อกอัพรันไม่ผ่านด้วย assets/data.js ชุดปัจจุบัน');
    console.error((run.stderr || run.stdout || '').trim().split('\n').slice(0, 15).join('\n'));
    process.exit(1);
  }

  /* เทียบทุกไฟล์ที่เจนเนอเรเตอร์ผลิต กับของที่อยู่ในรีโป */
  const walk = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name), base + e.name + '/') : [base + e.name]);

  const out = path.join(tmp, 'design/v2');
  const changed = [];
  const missing = [];
  for (const rel of walk(out)) {
    const a = path.join(SRC, rel);
    if (!fs.existsSync(a)) { missing.push(rel); continue; }
    if (!fs.readFileSync(a).equals(fs.readFileSync(path.join(out, rel)))) changed.push(rel);
  }

  if (changed.length || missing.length) {
    console.error('✗ ม็อกอัพที่ลูกค้าอนุมัติสร้างซ้ำไม่เหมือนเดิม');
    for (const f of changed) console.error(`  ต่างจากในรีโป : design/v2/${f}`);
    for (const f of missing) console.error(`  ไม่มีในรีโป   : design/v2/${f}`);
    console.error('\n  สาเหตุที่พบบ่อยที่สุด: มีใครเขียนทับ assets/data.js ซึ่งเป็นข้อมูลตั้งต้น');
    console.error('  ของชั้นออกแบบ · ข้อมูลรันไทม์ของเว็บจริงต้องไปที่ assets/content.js');
    process.exit(1);
  }
  console.log(`✓ ม็อกอัพสร้างซ้ำได้เหมือนเดิมทุกไฟล์ (${walk(out).length} ไฟล์ · 0 ไฟล์เปลี่ยน)`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
