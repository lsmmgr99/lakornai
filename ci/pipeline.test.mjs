/* บังคับว่า workflow ที่รันจริงกับลำดับขั้นใน ci/pipeline.mjs (และใน README) ตรงกัน
   รัน: node --test ci/pipeline.test.mjs
   เหตุที่ต้องมี: ขอบเขตของสิทธิ์ ("job ตรวจ/build อ่านอย่างเดียว · job ส่งขึ้นมีสิทธิ์เขียนเฉพาะตัวมัน และวิ่งเฉพาะ main")
   กับลำดับ "ด่านอยู่ก่อน artifact · artifact อยู่ก่อนส่งขึ้น" อยู่ในไฟล์ YAML ที่แก้ง่ายและไม่มีใครรันได้ในเครื่อง
   เทสต์นี้คือด่านของมัน (ADR-001 §9 · §14) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, PUBLISH_STEPS, command } from './pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wfPath = path.join(root, '.github/workflows/content-ci.yml');
const yml = fs.readFileSync(wfPath, 'utf8');
const runs = [...yml.matchAll(/^\s+run: (.+)$/gm)].map(m => m[1].trim());
/* บรรทัดคอมเมนต์ (#) อธิบายสิทธิ์ได้ แต่ห้ามถูกนับเป็นการประกาศสิทธิ์ */
const code = yml.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const branches = JSON.parse(fs.readFileSync(path.join(root, 'ci/publish-branches.json'), 'utf8'));

/* แยก YAML เป็นสอง job ด้วยชื่อ job — พอสำหรับไฟล์นี้ ไม่ต้องมี parser */
const jobStart = name => yml.indexOf(`\n  ${name}:\n`);
const validateJob = yml.slice(jobStart('validate-build-artifact'), jobStart('publish-site'));
const publishJob = yml.slice(jobStart('publish-site'));
assert.ok(jobStart('validate-build-artifact') > 0 && jobStart('publish-site') > jobStart('validate-build-artifact'), 'ต้องมี job ทั้งสองเรียงตามนี้');

test('ขั้นใน workflow เรียงตรงกับ ci/pipeline.mjs ทุกขั้น — job ตรวจ/build แล้วตามด้วย job ส่งขึ้น', () => {
  assert.deepEqual(runs, [...STEPS, ...PUBLISH_STEPS].map(command));
  assert.deepEqual([...validateJob.matchAll(/^\s+run: (.+)$/gm)].map(m => m[1].trim()), STEPS.map(command));
  assert.deepEqual([...publishJob.matchAll(/^\s+run: (.+)$/gm)].map(m => m[1].trim()), PUBLISH_STEPS.map(command));
});

test('ทุก argv ใน STEPS/PUBLISH_STEPS ชี้ไปที่ไฟล์ที่มีอยู่จริง', () => {
  for (const step of [...STEPS, ...PUBLISH_STEPS]) {
    for (const a of step.argv) {
      if (a.startsWith('--') || a === '.' || a === '_artifact') continue;
      assert.ok(fs.existsSync(path.join(root, a)), `ไม่พบไฟล์ ${a} ที่ STEPS อ้าง`);
    }
  }
});

test('ขั้นจัด artifact ต้องเป็นขั้นสุดท้ายของ job ตรวจ/build — ด่านทุกด่านอยู่ก่อนมัน', () => {
  const i = STEPS.findIndex(s => s.argv[0] === 'ci/stage-artifact.mjs');
  assert.equal(i, STEPS.length - 1, 'ถ้า artifact ไม่ใช่ขั้นท้าย ข้อมูลผิดอาจได้ artifact ออกไป');
  for (const rule of ['admin/check.mjs', 'ci/views-gate.mjs']) {
    assert.ok(STEPS.slice(0, i).some(s => s.argv[0] === rule), `ขั้น ${rule} ต้องอยู่ก่อน artifact`);
  }
  assert.ok(!STEPS.some(s => s.argv[0] === 'ci/deploy-branch.mjs'), 'ขั้นส่งขึ้นต้องไม่อยู่ใน job ตรวจ/build');
  assert.ok(PUBLISH_STEPS.some(s => s.argv[0] === 'ci/deploy-branch.mjs'), 'job ส่งขึ้นต้องเรียก ci/deploy-branch.mjs');
  assert.ok(STEPS[0].argv.includes('ci/deploy-branch.test.mjs'), 'เทสต์ของขั้นส่งขึ้นต้องรันก่อนด่านอื่นด้วย');
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

test('workflow ปลุกด้วย commit ที่แตะ content.json และปกทั้งสองโฟลเดอร์', () => {
  assert.match(yml, /- 'content\.json'/);
  assert.match(yml, /- 'assets\/covers\/\*\*'/);
  assert.match(yml, /- 'assets\/covers-wide\/\*\*'/);
});

test('build อ่าน SITE_ORIGIN/SITE_PUBLISHED จาก repository variables และมีค่าตั้งต้นที่ปลอดภัย', () => {
  assert.match(validateJob, /SITE_ORIGIN: \$\{\{ vars\.SITE_ORIGIN \|\| 'https:\/\/lsmmgr99\.github\.io\/lakornai' \}\}/);
  assert.match(validateJob, /SITE_PUBLISHED: \$\{\{ vars\.SITE_PUBLISHED \|\| '0' \}\}/);
});

test('สิทธิ์: ค่าตั้งต้นอ่านอย่างเดียว · contents: write มีที่เดียวใน job publish-site · ไม่มีสิทธิ์ pages/id-token/packages', () => {
  assert.match(yml, /^permissions:\s*\n\s*contents: read\s*\n/m, 'ระดับ workflow ต้องประกาศ permissions: contents: read');
  assert.equal((code.match(/contents:\s*write/g) || []).length, 1, 'contents: write ต้องมีที่เดียว');
  assert.match(publishJob, /permissions:\s*\n\s*contents: write/);
  assert.doesNotMatch(validateJob.split('\n').filter(l => !/^\s*#/.test(l)).join('\n'), /contents:\s*write/);
  assert.doesNotMatch(code, /id-token:|pages:\s*write|packages:\s*write/);
});

test('job publish-site วิ่งเฉพาะ push ขึ้น main หลัง job ตรวจ/build ผ่าน และใช้ artifact ชุดเดียวกัน', () => {
  assert.match(publishJob, /needs: validate-build-artifact/);
  assert.match(publishJob, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(publishJob, /uses: actions\/download-artifact@v4/);
  assert.match(publishJob, /name: lakornai-static-\$\{\{ github\.sha \}\}/);
  assert.match(publishJob, /PAGES_BRANCH: preview/);
  assert.equal(branches.pagesBranch, 'preview');
  assert.match(publishJob, /PAGES_CNAME: \$\{\{ vars\.PAGES_CNAME \}\}/, 'CNAME มาจาก variable เท่านั้น ไม่ hard-code');
  assert.match(publishJob, /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(publishJob, /cancel-in-progress: false/, 'การส่งขึ้นห้ามยกเลิกกันเอง');
});

test('ไม่มีคำสั่ง deploy ทางอื่นแอบอยู่ใน YAML — ทางเดียวคือ ci/deploy-branch.mjs', () => {
  for (const re of [
    /deploy-pages|configure-pages|upload-pages-artifact/i,
    /\bgh-pages\b/i,
    /\bssh\b|\bscp\b|\brsync\b/i,
    /\bnetlify\b|\bvercel\b|\bwrangler\b|\bfirebase\b|aws\s+s3/i,
    /git\s+push/i,
  ]) assert.doesNotMatch(code, re, `พบคำสั่งที่เกินขอบเขต: ${re}`);
});

test('artifact ถูกเก็บจาก job แรกเสมอ (ไม่ว่าจะส่งขึ้นหรือไม่)', () => {
  assert.match(validateJob, /uses: actions\/upload-artifact@v4/);
  assert.match(validateJob, /if-no-files-found: error/, 'artifact ว่างต้องถือเป็นความล้ม ไม่ใช่ผ่าน');
  assert.match(validateJob, /path: _artifact/);
});

test('checkout ไม่เก็บ credential ไว้ในเครื่องรัน (ทั้งสอง job)', () => {
  assert.equal((yml.match(/persist-credentials: false/g) || []).length, 2);
});

/* ---------- branch ในเส้นทางเผยแพร่ (ADR-001 §12.1 B9 แก้โดย §14) ---------- */

test('ci/publish-branches.json: ต้นทาง main · ผลผลิต preview · broker ร่างใต้ admin-drafts/ เท่านั้น · เผยแพร่ได้เฉพาะ main', () => {
  assert.deepEqual(branches.publish, ['main']);
  assert.deepEqual(branches.brokerPublish, branches.publish, 'broker เผยแพร่ได้เฉพาะ branch ต้นทางที่ CI ตรวจ');
  assert.ok(branches.brokerDraftPrefix.endsWith('/'), 'prefix ของ branch ร่างต้องลงท้ายด้วย /');
  for (const b of [...branches.publish, branches.pagesBranch]) {
    assert.ok(branches.brokerDraftForbidden.includes(b), `${b} ต้องห้ามเป็น branch ร่าง`);
    assert.ok(!b.startsWith(branches.brokerDraftPrefix), `${b} ต้องไม่อยู่ใต้ prefix ร่าง`);
  }
  assert.ok(!branches.publish.includes(branches.pagesBranch), 'branch ผลผลิตต้องไม่ใช่ branch ต้นทาง');
  assert.equal(branches.autoDeploy, true, 'ADR-001 §14: CI ส่งขึ้น Pages เอง');
});

test('README ของ ci/ บอกวิธีตรวจซ้ำด้วยคำสั่งที่มีอยู่จริง และระบุ branch ครบ', () => {
  const readme = fs.readFileSync(path.join(root, 'ci/README.md'), 'utf8');
  assert.match(readme, /node ci\/rehearse\.mjs/);
  for (const step of [...STEPS, ...PUBLISH_STEPS]) assert.ok(readme.includes(command(step)), `README ขาดคำสั่ง: ${command(step)}`);
  for (const word of [branches.publish[0], branches.pagesBranch, branches.brokerDraftPrefix, 'PAGES_CNAME', 'SITE_ORIGIN', 'SITE_PUBLISHED']) {
    assert.ok(readme.includes(word), `README ต้องกล่าวถึง ${word}`);
  }
});
