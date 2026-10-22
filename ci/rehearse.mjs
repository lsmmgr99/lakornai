/* ซ้อม CI ในเครื่อง — รันลำดับเดียวกับ .github/workflows/content-ci.yml ทุกขั้น
   เจ้าของ: DevOps (AIO-30) · ไม่ push ไม่ publish ไม่ deploy ไม่ต้องมีเครือข่าย

   รัน:  node ci/rehearse.mjs              ตรวจไฟล์ใน working tree ตามที่เห็นอยู่
         node ci/rehearse.mjs --head       ตรวจไฟล์ที่ commit แล้วของ HEAD

   ทำงานในสำเนาชั่วคราวเสมอ เพราะ build/build.mjs เขียนหน้าเว็บทับที่รากรีโป
   workspace นี้ถูกใช้ร่วมกับ run อื่น (AIO-23/AIO-31) การ build ทับจึงไม่ปลอดภัย
   — วิธีเดียวกับที่ admin/reproduce.mjs ใช้ ต่างกันที่อันนี้ซ้อม "ทุกขั้นของ CI" ไม่ใช่แค่เส้นแก้ข้อมูล */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STEPS, command } from './pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromHead = process.argv.includes('--head');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-ci-rehearse-'));

/* เตรียมสำเนา: --head ใช้ของที่ commit แล้ว (เท่าที่ CI จะเห็นหลัง checkout)
   ค่าตั้งต้นใช้ working tree เพื่อให้ตรวจการแก้ที่ยังไม่ commit ได้ */
if (fromHead) {
  execFileSync('git', ['-C', root, 'archive', 'HEAD', '-o', path.join(temp, 'head.tar')]);
  execFileSync('tar', ['-xf', path.join(temp, 'head.tar'), '-C', temp]);
  fs.rmSync(path.join(temp, 'head.tar'));
} else {
  for (const name of fs.readdirSync(root)) {
    if (['.git', '.paperclip-repositories', 'node_modules', '_artifact'].includes(name)) continue;
    fs.cpSync(path.join(root, name), path.join(temp, name), { recursive: true });
  }
}

const label = fromHead
  ? `HEAD = ${execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD']).toString().trim()}`
  : 'working tree';
console.log(`ซ้อม CI จาก ${label}\nสำเนาชั่วคราว: ${temp}\n`);

const results = [];
let failed = null;
for (const [i, step] of STEPS.entries()) {
  const line = `[${i + 1}/${STEPS.length}] ${step.name}`;
  console.log(`${line}\n       $ ${command(step)}`);
  const started = Date.now();
  const r = spawnSync(process.execPath, step.argv, { cwd: temp, stdio: 'inherit' });
  const ms = Date.now() - started;
  const ok = r.status === 0;
  results.push({ step, ok, ms });
  console.log(ok ? `       ✓ ผ่าน (${ms} ms)\n` : `       ✗ ล้ม (exit ${r.status})\n`);
  if (!ok) { failed = step; break; }
}

console.log('— สรุป —');
for (const [i, r] of results.entries()) console.log(`  ${r.ok ? '✓' : '✗'} ${i + 1}. ${r.step.name}`);
for (const step of STEPS.slice(results.length)) console.log(`  · ${STEPS.indexOf(step) + 1}. ${step.name} (ไม่ได้รัน เพราะขั้นก่อนล้ม)`);

if (failed) {
  console.log(`\nCI จะล้มที่ขั้น "${failed.name}" และ**ไม่มี artifact ออกไป** — ตรงตาม ADR-001 §9.2`);
  console.log(`ตรวจซ้ำขั้นนั้นเดี่ยว ๆ ได้ที่:  cd ${temp} && ${command(failed)}`);
  process.exit(1);
}

console.log(`\nทุกขั้นผ่าน · artifact อยู่ที่ ${path.join(temp, '_artifact')}`);
console.log('ไม่มีการ publish/deploy จากสคริปต์นี้ และ CI ก็ไม่มี — ปลายทางคือ artifact ตาม ADR-001 §8/§9.1');
