/* บังคับว่า workflow ที่รันจริงกับลำดับขั้นใน ci/pipeline.mjs (และใน README) ตรงกัน
   รัน: node --test ci/pipeline.test.mjs
   เหตุที่ต้องมี: ขอบเขตของงานนี้คือ "ไม่ deploy ไม่ publish" และ "ด่านอยู่ก่อน artifact"
   สองข้อนั้นอยู่ในไฟล์ YAML ที่แก้ง่ายและไม่มีใครรันได้ในเครื่อง เทสต์นี้คือด่านของมัน */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, command } from './pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wfPath = path.join(root, '.github/workflows/content-ci.yml');
const yml = fs.readFileSync(wfPath, 'utf8');
const runs = [...yml.matchAll(/^\s+run: (.+)$/gm)].map(m => m[1].trim());
const branches = JSON.parse(fs.readFileSync(path.join(root, 'ci/publish-branches.json'), 'utf8'));

test('ขั้นใน workflow เรียงตรงกับ ci/pipeline.mjs ทุกขั้น', () => {
  assert.deepEqual(runs, STEPS.map(command));
});

test('ทุก argv ใน STEPS ชี้ไปที่ไฟล์ที่มีอยู่จริง', () => {
  for (const step of STEPS) {
    for (const a of step.argv) {
      if (a.startsWith('--') || a === '.' || a === '_artifact') continue;
      /* glob ของ node --test ถูกกางเป็นชื่อไฟล์ตรงแล้วใน STEPS */
      assert.ok(fs.existsSync(path.join(root, a)), `ไม่พบไฟล์ ${a} ที่ STEPS อ้าง`);
    }
  }
});

test('ขั้นจัด artifact ต้องเป็นขั้นสุดท้าย — ด่านทุกด่านอยู่ก่อนมัน', () => {
  const i = STEPS.findIndex(s => s.argv[0] === 'ci/stage-artifact.mjs');
  assert.equal(i, STEPS.length - 1, 'ถ้า artifact ไม่ใช่ขั้นท้าย ข้อมูลผิดอาจได้ artifact ออกไป');
  for (const rule of ['admin/check.mjs', 'ci/views-gate.mjs']) {
    assert.ok(STEPS.slice(0, i).some(s => s.argv[0] === rule), `ขั้น ${rule} ต้องอยู่ก่อน artifact`);
  }
});

test('ตรวจ V1–V10 ต้องอยู่ก่อน build และ V11–V13 ต้องอยู่หลัง build', () => {
  const at = (pred) => STEPS.findIndex(pred);
  const build = at(s => s.argv[0] === 'build/build.mjs');
  const pre = at(s => s.argv[0] === 'admin/check.mjs' && !s.argv.includes('--html'));
  const v11 = at(s => s.argv[0] === 'admin/check.mjs' && s.argv.includes('--html'));
  const v12 = at(s => s.argv[0] === 'ci/views-gate.mjs');
  assert.ok(pre >= 0 && build > pre, 'V1–V10 ต้องอยู่ก่อน build');
  assert.ok(v11 > build, 'V11 ต้องอยู่หลัง build');
  assert.ok(v12 > build, 'V12–V13 ต้องอยู่หลัง build');
});

test('workflow ปลุกด้วย commit ที่แตะ content.json และปก', () => {
  assert.match(yml, /- 'content\.json'/);
  assert.match(yml, /- 'assets\/covers\/\*\*'/);
});

test('workflow ไม่มีสิทธิ์เขียน และไม่มีขั้น deploy/publish', () => {
  assert.match(yml, /permissions:\s*\n\s*contents: read\s*\n/, 'ต้องประกาศ permissions: contents: read เท่านั้น');
  assert.doesNotMatch(yml, /contents:\s*write|id-token:|pages:\s*write|packages:\s*write/);
  /* ชื่อ action/คำสั่งที่เท่ากับการเอาของขึ้นเซิร์ฟเวอร์หรือเผยแพร่ — ขอบเขต AIO-30 ห้ามไว้ */
  for (const re of [
    /deploy-pages|configure-pages|upload-pages-artifact/i,
    /\bgh-pages\b/i,
    /\bssh\b|\bscp\b|\brsync\b/i,
    /\bnetlify\b|\bvercel\b|\bwrangler\b|\bfirebase\b|aws\s+s3/i,
    /git\s+push/i,
  ]) assert.doesNotMatch(yml, re, `พบคำสั่งที่เกินขอบเขต: ${re}`);
});

test('artifact ถูกเก็บ ไม่ถูก publish', () => {
  assert.match(yml, /uses: actions\/upload-artifact@v4/);
  assert.match(yml, /if-no-files-found: error/, 'artifact ว่างต้องถือเป็นความล้ม ไม่ใช่ผ่าน');
  assert.match(yml, /path: _artifact/);
});

test('checkout ไม่เก็บ credential ไว้ในเครื่องรัน', () => {
  assert.match(yml, /persist-credentials: false/);
});

/* ---------- B9: branch ของเส้นทางเผยแพร่ กับ branch ที่ broker เขียนได้ ---------- */

test('branch ที่ publish ใช้ ถูกประกาศไว้ และ broker ถูกห้ามเขียนลง branch นั้น (B9)', () => {
  assert.deepEqual(branches.publish, ['main']);
  for (const b of branches.publish) assert.ok(branches.brokerForbidden.includes(b), `${b} ต้องอยู่ใน brokerForbidden`);
  assert.ok(branches.brokerDraftPrefix.endsWith('/'), 'prefix ของ branch ร่างต้องลงท้ายด้วย /');
  assert.ok(!branches.publish.some(b => b.startsWith(branches.brokerDraftPrefix)), 'branch ร่างต้องไม่ทับ branch ที่ publish ใช้');
  assert.equal(branches.autoDeploy, false, 'ไม่มี auto deploy จาก CI นี้');
});

test('README ของ ci/ บอกวิธีตรวจซ้ำด้วยคำสั่งที่มีอยู่จริง', () => {
  const readme = fs.readFileSync(path.join(root, 'ci/README.md'), 'utf8');
  assert.match(readme, /node ci\/rehearse\.mjs/);
  for (const step of STEPS) assert.ok(readme.includes(command(step)), `README ขาดคำสั่ง: ${command(step)}`);
  assert.ok(readme.includes(branches.publish[0]) && readme.includes(branches.brokerDraftPrefix), 'README ต้องระบุ branch publish และ prefix ของ branch ร่าง');
});
