/* เทสต์ขั้นส่งขึ้น branch ของ Pages — ใช้ bare repo ในเครื่องเป็น remote จริง ไม่ต้องมีเครือข่าย ไม่ต้องมี token */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cnameFor, checkTargetBranch, prepareSite, pushSite, BRANCHES } from './deploy-branch.mjs';
import { REQUIRED_IN_ARTIFACT } from './site-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'ci/deploy-branch.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-deploy-test-'));
function fakeArtifact() {
  const dir = tmp();
  for (const f of REQUIRED_IN_ARTIFACT) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), f === '.nojekyll' ? '' : `<!-- ${f} -->\n`); }
  fs.mkdirSync(path.join(dir, 'series/x'), { recursive: true }); fs.writeFileSync(path.join(dir, 'series/x/index.html'), '<h1>x</h1>');
  return dir;
}
const bare = () => { const d = tmp(); execFileSync('git', ['init', '-q', '--bare', '-b', 'main', d]); return d; };
const lsBranch = (repo, branch) => { const r = spawnSync('git', ['--git-dir', repo, 'ls-tree', '-r', '--name-only', branch], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim().split('\n').filter(Boolean) : null; };
const show = (repo, branch, file) => execFileSync('git', ['--git-dir', repo, 'show', `${branch}:${file}`], { encoding: 'utf8' });
const run = (args, env) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: '', GITHUB_TOKEN: '', PAGES_CNAME: '', PAGES_BRANCH: '', DEPLOY_REMOTE: '', ...env } });

test('cnameFor รับโดเมนจริง ปฏิเสธของที่ไม่ใช่โดเมนและ github.io', () => {
  assert.equal(cnameFor(undefined), null);
  assert.equal(cnameFor('  '), null);
  assert.equal(cnameFor('ailakorn.com'), 'ailakorn.com');
  assert.equal(cnameFor('https://WWW.AiLakorn.com/path?x'), 'www.ailakorn.com');
  for (const bad of ['ailakorn', 'ai lakorn.com', '-bad.com', 'a..b.com', 'x.github.io', 'lsmmgr99.github.io/lakornai']) assert.throws(() => cnameFor(bad), bad);
});

test('branch ปลายทางต้องเป็น pagesBranch เท่านั้น — ไม่ใช่ main ไม่ใช่ branch ร่าง', () => {
  assert.equal(checkTargetBranch(BRANCHES.pagesBranch), BRANCHES.pagesBranch);
  for (const b of BRANCHES.publish) assert.throws(() => checkTargetBranch(b), /ต้นทาง/);
  assert.throws(() => checkTargetBranch(BRANCHES.brokerDraftPrefix + 'content'), /ร่าง/);
  assert.throws(() => checkTargetBranch('gh-pages'), /publish-branches/);
  assert.throws(() => checkTargetBranch('../x'));
});

test('prepareSite ตรวจชุดไฟล์ซ้ำ และเขียน/ลบ CNAME ตามที่สั่ง', () => {
  const dir = fakeArtifact();
  try {
    const a = prepareSite(dir, { cname: 'ailakorn.com' });
    assert.ok(a.files.includes('CNAME')); assert.equal(fs.readFileSync(path.join(dir, 'CNAME'), 'utf8'), 'ailakorn.com\n');
    const b = prepareSite(dir, {});
    assert.ok(!b.files.includes('CNAME')); assert.ok(!fs.existsSync(path.join(dir, 'CNAME')), 'ไม่สั่ง CNAME = ต้องไม่มีไฟล์ค้างจากรอบก่อน');
    fs.mkdirSync(path.join(dir, 'admin')); fs.writeFileSync(path.join(dir, 'admin/index.html'), 'x');
    assert.throws(() => prepareSite(dir, {}), /admin/);
    fs.rmSync(path.join(dir, 'admin'), { recursive: true });
    fs.rmSync(path.join(dir, 'robots.txt'));
    assert.throws(() => prepareSite(dir, {}), /robots\.txt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('pushSite: commit เดียว force-push ไป branch ที่สั่ง · รอบถัดไปทับของเดิม · dry-run ไม่ push', () => {
  const dir = fakeArtifact(), repo = bare();
  try {
    const dry = pushSite(dir, { remote: repo, branch: 'preview', message: 'dry', dryRun: true });
    assert.equal(dry.pushed, false); assert.equal(lsBranch(repo, 'preview'), null, 'dry-run ต้องไม่สร้าง branch');
    prepareSite(dir, { cname: 'ailakorn.com' });
    const first = pushSite(dir, { remote: repo, branch: 'preview', message: 'first' });
    assert.equal(first.pushed, true);
    const files = lsBranch(repo, 'preview');
    assert.ok(files.includes('index.html') && files.includes('.nojekyll') && files.includes('CNAME') && files.includes('series/x/index.html'));
    assert.equal(show(repo, 'preview', 'CNAME'), 'ailakorn.com\n');
    fs.writeFileSync(path.join(dir, 'index.html'), '<!-- v2 -->');
    prepareSite(dir, {});
    const second = pushSite(dir, { remote: repo, branch: 'preview', message: 'second' });
    assert.notEqual(second.sha, first.sha);
    assert.equal(show(repo, 'preview', 'index.html'), '<!-- v2 -->');
    assert.ok(!lsBranch(repo, 'preview').includes('CNAME'), 'เลิกตั้ง CNAME แล้วไฟล์ต้องหายจาก branch');
    assert.equal(execFileSync('git', ['--git-dir', repo, 'rev-list', '--count', 'preview'], { encoding: 'utf8' }).trim(), '1', 'orphan commit เดียว ไม่สะสมประวัติ');
    assert.equal(lsBranch(repo, 'main'), null, 'ห้ามแตะ branch อื่น');
    assert.ok(!fs.existsSync(path.join(dir, '.git')), 'ไม่ทิ้ง .git ไว้ในโฟลเดอร์ชุดไฟล์');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(repo, { recursive: true, force: true }); }
});

test('CLI: ล้มถ้า branch ผิด / CNAME ผิด / ชุดไฟล์มีของต้องห้าม · ผ่านเมื่อครบ', () => {
  const dir = fakeArtifact(), repo = bare();
  try {
    let r = run([dir], { DEPLOY_REMOTE: repo, PAGES_BRANCH: 'main' });
    assert.equal(r.status, 1); assert.match(r.stderr, /ต้นทาง/);
    r = run([dir], { DEPLOY_REMOTE: repo, PAGES_CNAME: 'not a domain' });
    assert.equal(r.status, 1); assert.match(r.stderr, /PAGES_CNAME/);
    r = run([dir], {});
    assert.equal(r.status, 1); assert.match(r.stderr, /GITHUB_REPOSITORY|DEPLOY_REMOTE/);
    r = run([dir, '--dry-run'], {});
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /dry-run/); assert.equal(lsBranch(repo, 'preview'), null);
    r = run([dir], { DEPLOY_REMOTE: repo, PAGES_CNAME: 'https://ailakorn.com/', GITHUB_SHA: 'abcdef1234567890' });
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /ส่งขึ้น preview/); assert.match(r.stdout, /CNAME ailakorn\.com/);
    assert.equal(show(repo, 'preview', 'CNAME'), 'ailakorn.com\n');
    assert.match(execFileSync('git', ['--git-dir', repo, 'log', '-1', '--format=%s', 'preview'], { encoding: 'utf8' }), /^publish abcdef1 → preview/);
    fs.mkdirSync(path.join(dir, 'build')); fs.writeFileSync(path.join(dir, 'build/seo.mjs'), 'x');
    r = run([dir], { DEPLOY_REMOTE: repo });
    assert.equal(r.status, 1); assert.match(r.stderr, /build/);
    assert.equal(show(repo, 'preview', 'CNAME'), 'ailakorn.com\n', 'ชุดที่ไม่ผ่านด่านต้องไม่ทับของที่เสิร์ฟอยู่');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(repo, { recursive: true, force: true }); }
});
