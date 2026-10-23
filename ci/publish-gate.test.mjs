/* เทสต์ของด่าน ci/publish-gate.mjs — AIO-36 · เจ้าของ: DevOps
   รัน: node --test ci/publish-gate.test.mjs

   ครึ่งแรกตรวจกฎจากรายชื่อไฟล์ล้วน · ครึ่งหลังเป็น **มิวเทชันเทสต์ของจริง**:
   จัดชุดไฟล์ในโฟลเดอร์ชั่วคราว แล้วแอบใส่ของต้องห้ามเข้าไป ด่านต้องแดง
   ถ้ามิวเทชันเทสต์ไม่แดง ด่านนั้นใช้ไม่ได้ และนี่คือเหตุที่ยามเดิมต้องถูกเปลี่ยน
   (ยามเดิมอ่านรายชื่อจาก siteFiles ซึ่งกรองโฟลเดอร์ต้องห้ามออกไปก่อน จึงมองไม่เห็นของที่หลุด) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditFileSet, auditNoindex, allFiles, FORBIDDEN_SEGMENTS } from './publish-gate.mjs';
import { siteFiles, REQUIRED_IN_ARTIFACT, skipDir, skipFile } from './site-files.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const GATE = path.join(here, 'publish-gate.mjs');
const STAGE = path.join(here, 'stage-artifact.mjs');

/* ชุดไฟล์ที่ถือว่า "สะอาด" ใช้เป็นฐานของทุกมิวเทชัน */
const clean = () => [...REQUIRED_IN_ARTIFACT, 'browse/index.html', 'assets/covers/a.jpg', 'redirects.map'];
const errs = (files, opt) => auditFileSet(files, opt).errors;
const run = (args) => spawnSync(process.execPath, args, { encoding: 'utf8' });

/* ---------------- กฎจากรายชื่อไฟล์ ---------------- */

test('ชุดที่สะอาดต้องผ่าน — ด่านที่แดงกับทุกอย่างก็ไม่ต่างจากไม่มีด่าน', () => {
  assert.deepEqual(errs(clean()), []);
});

test('ไฟล์ใต้โฟลเดอร์ต้องห้ามแม้ไฟล์เดียวต้องแดง ทุกชื่อในรายการ', () => {
  for (const seg of FORBIDDEN_SEGMENTS) {
    const e = errs([...clean(), `${seg}/index.html`]);
    assert.ok(e.some(x => x.includes(`${seg}/index.html`)), `${seg}/ หลุดด่าน`);
  }
});

test('ตรวจทุกชั้นของพาธ ไม่ใช่แค่ชั้นบนสุด', () => {
  const e = errs([...clean(), 'series/house-13/admin/index.html']);
  assert.ok(e.some(x => x.includes('series/house-13/admin/index.html')), 'admin/ ที่ซ้อนลึกต้องแดงด้วย');
});

test('ไฟล์ *.test.mjs ต้องแดง และบอกสาเหตุว่าเป็นไฟล์เทสต์', () => {
  const e = errs([...clean(), 'assets/views-gate.test.mjs']);
  assert.ok(e.some(x => x.includes('views-gate.test.mjs') && x.includes('เทสต์')), e.join(' | '));
});

test('.mjs ทั่วไป · .env · ไฟล์ที่ชื่อเข้าข่ายกุญแจ · content.json ต้องแดง', () => {
  for (const f of ['assets/tool.mjs', '.env', 'assets/.env.local', 'deploy.key', 'keys/id_rsa', 'content.json']) {
    assert.ok(errs([...clean(), f]).some(x => x.startsWith(f)), `${f} หลุดด่าน`);
  }
});

test('โฟลเดอร์/ไฟล์ที่ขึ้นต้นด้วยจุดต้องแดง — ของเครื่องมือทั้งนั้น', () => {
  /* ของจริงที่เจอตอนรันด่านนี้ครั้งแรก: .claude/settings.local.json ติดเข้าชุดที่ส่งขึ้น */
  for (const f of ['.claude/settings.local.json', '.vscode/settings.json', '.DS_Store', 'assets/.DS_Store']) {
    assert.ok(errs([...clean(), f]).some(x => x.startsWith(f)), `${f} หลุดด่าน`);
  }
  assert.deepEqual(errs([...clean(), '.well-known/security.txt']), [], '.well-known/ เป็นพาธมาตรฐาน ต้องผ่าน');
  assert.deepEqual(errs(clean()), [], '.nojekyll ต้องไม่ถูกจับเอง');
});

test('ไฟล์ .md ต้องไม่อยู่ในชุดที่ส่งขึ้น — เป็นบันทึกภายใน', () => {
  const e = errs([...clean(), 'assets/share/README.md']);
  assert.ok(e.some(x => x.startsWith('assets/share/README.md')), e.join(' | '));
});

test('ตัวคัดไฟล์ก็ต้องไม่หยิบของพวกนั้นมาตั้งแต่ต้น (ci/site-files.mjs)', () => {
  assert.ok(skipDir('.claude') && skipDir('admin') && skipDir('docs'));
  assert.ok(!skipDir('.well-known') && !skipDir('assets') && !skipDir('series'));
  assert.ok(skipFile('assets/share/README.md') && skipFile('.claude/x.json') === false, 'กฎไฟล์ดูที่ชื่อไฟล์ ส่วนโฟลเดอร์เป็นหน้าที่ skipDir');
  assert.ok(skipFile('assets/.DS_Store') && skipFile('content.json') && skipFile('tools/x.mjs'));
  assert.ok(!skipFile('.nojekyll') && !skipFile('index.html') && !skipFile('assets/app.js'));
});

test('ขาดไฟล์ใน REQUIRED_IN_ARTIFACT ต้องแดง และบอกชื่อไฟล์ที่ขาด', () => {
  for (const need of REQUIRED_IN_ARTIFACT) {
    const e = errs(clean().filter(f => f !== need));
    assert.ok(e.some(x => x.includes(`ขาด ${need}`)), `ขาด ${need} แล้วด่านไม่แดง`);
  }
});

test('.nojekyll อยู่ในรายการไฟล์ที่ต้องมี', () => {
  assert.ok(REQUIRED_IN_ARTIFACT.includes('.nojekyll'));
});

test('symlink ในชุดต้องแดง — โฮสต์อาจเสิร์ฟของนอกชุดตามลิงก์', () => {
  assert.ok(errs(clean(), { links: ['assets/x'] }).some(x => x.includes('symlink')));
});

test('robots.txt ของรอบทดสอบต้องปิดดัชนีทั้งเว็บ', () => {
  assert.deepEqual(auditNoindex('User-agent: *\nDisallow: /\n').errors, []);
  assert.ok(auditNoindex('User-agent: *\nAllow: /\nDisallow: /library/\n').errors.length > 0);
  assert.ok(auditNoindex('# ว่าง\n').errors.length > 0);
});

/* ---------------- มิวเทชันเทสต์ของจริง: ทำชุดไฟล์ แล้วแอบใส่ของต้องห้าม ----------------
   รีโปจำลองมีไฟล์ครบตามที่ ci/stage-artifact.mjs ต้องการ (รวมพื้น HTML 400 หน้า)
   จึงรันสคริปต์จริงทั้งตัวได้ โดยไม่ต้อง build เว็บจริงและไม่แตะรีโปที่ใช้ทำงาน */
function fakeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aio36-gate-'));
  const put = (rel, body = '<!doctype html><title>x</title>') => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  for (const need of REQUIRED_IN_ARTIFACT) put(need, need === 'robots.txt' ? 'User-agent: *\nDisallow: /\n' : '');
  put('index.html'); put('404.html');
  for (let i = 0; i < 400; i++) put(`p/${i}.html`);
  /* ของทีมที่อยู่ในรีโปเดียวกันและต้องไม่ติดไปกับชุด */
  put('admin/index.html', '<title>แผงหลังบ้าน</title>');
  put('ci/x.mjs', '//'); put('content.json', '{}');
  /* ของเครื่องมือและบันทึกภายในที่ซ่อนลึกกว่าชั้นราก — ต้องไม่ติดไปกับชุด */
  put('.claude/settings.local.json', '{}'); put('assets/share/README.md', '# ภายใน');
  return dir;
}

test('มิวเทชัน: แอบใส่ admin/index.html เข้าชุดที่ส่งขึ้นแล้ว → ด่านต้องแดง', () => {
  const src = fakeRepo();
  const dest = path.join(src, '_artifact');

  const ok = run([STAGE, src, dest]);
  assert.equal(ok.status, 0, `ชุดที่สะอาดควรผ่านก่อน:\n${ok.stdout}${ok.stderr}`);
  assert.equal(run([GATE, dest]).status, 0, 'ด่านเดี่ยวต้องผ่านกับชุดที่สะอาด');
  /* ของเครื่องมือ/บันทึกภายในต้องไม่ถูกคัดลอกมาตั้งแต่ต้น */
  assert.ok(!fs.existsSync(path.join(dest, '.claude')), '.claude/ ต้องไม่ถูกคัดลอกเข้าชุด');
  assert.ok(!fs.existsSync(path.join(dest, 'assets/share/README.md')), 'README ภายในต้องไม่ถูกคัดลอกเข้าชุด');
  assert.ok(fs.existsSync(path.join(dest, '.nojekyll')), '.nojekyll ต้องอยู่ในชุด');

  fs.mkdirSync(path.join(dest, 'admin'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'admin/index.html'), '<title>แผงหลังบ้าน</title>');

  const red = run([GATE, dest]);
  assert.equal(red.status, 1, 'ด่านต้องแดงเมื่อมี admin/index.html ในชุด');
  assert.match(red.stderr, /admin\/index\.html/);

  /* เหตุที่ยามเดิมมองไม่เห็น: รายชื่อที่ siteFiles คืนมาไม่มีไฟล์นี้ตั้งแต่ต้น */
  assert.ok(!siteFiles(dest, {}).includes('admin/index.html'), 'siteFiles กรอง admin/ ที่รากออก — ใช้ตรวจของที่หลุดไม่ได้');
  assert.ok(allFiles(dest).files.includes('admin/index.html'), 'allFiles ต้องเห็นไฟล์ที่หลุดเข้าชุด');
  fs.rmSync(src, { recursive: true, force: true });
});

test('มิวเทชัน: ของต้องห้ามที่ "รอด" ตัวคัดไฟล์ → ci/stage-artifact.mjs ต้องล้มและไม่เหลือ artifact', () => {
  /* สองชื่อนี้ตัวคัดไฟล์ไม่ได้กรอง (EXCLUDE_FILES ดูเฉพาะชั้นราก · .key ไม่ใช่กฎของตัวคัด)
     มันจึงถูกคัดลอกเข้าชุดจริง และเป็นหน้าที่ของยามหลังคัดลอกที่จะจับ — ถ้ายามตาบอด เทสต์นี้แดง */
  const src = fakeRepo();
  const dest = path.join(src, '_artifact');
  fs.writeFileSync(path.join(src, 'assets/deploy.key'), 'ค่าสมมุติ');
  fs.mkdirSync(path.join(src, 'series/house-13'), { recursive: true });
  fs.writeFileSync(path.join(src, 'series/house-13/content.json'), '{}');

  const r = run([STAGE, src, dest]);
  assert.equal(r.status, 1, `ต้องล้ม แต่ได้ exit ${r.status}\n${r.stdout}`);
  assert.match(r.stderr, /assets\/deploy\.key/);
  assert.match(r.stderr, /series\/house-13\/content\.json/);
  assert.ok(!fs.existsSync(dest), 'เมื่อไม่ผ่าน ต้องไม่เหลือโฟลเดอร์ชุดไฟล์ไว้ให้ใครเผลอหยิบไปขึ้น');
  fs.rmSync(src, { recursive: true, force: true });
});

test('ตัวคัดไฟล์ตัด admin/ ที่ซ้อนลึกและ *.test.mjs ออกก่อนถึงยาม — ชุดที่ได้ต้องไม่มีทั้งคู่', () => {
  const src = fakeRepo();
  const dest = path.join(src, '_artifact');
  fs.mkdirSync(path.join(src, 'series/house-13/admin'), { recursive: true });
  fs.writeFileSync(path.join(src, 'series/house-13/admin/index.html'), '<title>แผง</title>');
  fs.writeFileSync(path.join(src, 'assets/sneak.test.mjs'), '//');

  const r = run([STAGE, src, dest]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  const got = allFiles(dest).files;
  assert.ok(!got.some(f => f.includes('/admin/')), 'admin/ ที่ซ้อนลึกต้องไม่เข้าชุด');
  assert.ok(!got.some(f => f.endsWith('.test.mjs')), 'ไฟล์เทสต์ต้องไม่เข้าชุด');
  assert.equal(run([GATE, dest]).status, 0);
  fs.rmSync(src, { recursive: true, force: true });
});

test('มิวเทชัน: ลบ .nojekyll ออกจากต้นทาง → ทั้ง stage-artifact และด่านเดี่ยวต้องแดง', () => {
  const src = fakeRepo();
  const dest = path.join(src, '_artifact');
  fs.rmSync(path.join(src, '.nojekyll'));

  const r = run([STAGE, src, dest]);
  assert.equal(r.status, 1, 'ขาด .nojekyll ต้องล้ม');
  assert.match(r.stderr, /ขาด \.nojekyll/);
  fs.rmSync(src, { recursive: true, force: true });
});

test('--expect-noindex: robots.txt ที่เปิดดัชนีต้องแดง เฉพาะเมื่อสั่งธงนี้', () => {
  const src = fakeRepo();
  const dest = path.join(src, '_artifact');
  assert.equal(run([STAGE, src, dest]).status, 0);
  fs.writeFileSync(path.join(dest, 'robots.txt'), 'User-agent: *\nAllow: /\n');

  assert.equal(run([GATE, dest]).status, 0, 'ไม่ใส่ธง = ไม่บังคับ (วันเปิดตัวจริงต้องผ่านได้)');
  const red = run([GATE, dest, '--expect-noindex']);
  assert.equal(red.status, 1);
  assert.match(red.stderr, /robots\.txt/);
  fs.rmSync(src, { recursive: true, force: true });
});

test('--plan บอกชุดที่จะขึ้นได้โดยไม่ต้องจัด artifact และไม่เขียนอะไรลงต้นทาง', () => {
  const src = fakeRepo();
  const before = allFiles(src).files.length;
  const r = run([GATE, '--plan', src]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ชุดไฟล์ที่ "จะ" ส่งขึ้น/);
  assert.match(r.stdout, /✓ admin\//);
  assert.equal(allFiles(src).files.length, before, 'โหมด --plan ต้องไม่สร้างไฟล์ใด');
  fs.rmSync(src, { recursive: true, force: true });
});

/* ---------------- ด่านนี้ต้องไม่กลายเป็นเส้นทาง deploy ---------------- */

/* ตรวจเฉพาะไฟล์ที่ "รันจริง" ไม่รวมไฟล์เทสต์นี้ — ไฟล์เทสต์ต้องเขียนรูปคำสั่งต้องห้ามไว้เองเพื่อตรวจ
   ถ้าเอามันมาตรวจตัวเอง ด่านจะแดงเพราะตัวด่าน ไม่ใช่เพราะของจริงผิด (บทเรียนเดียวกับ AIO-34) */
test('ไฟล์ของด่านไม่มีคำสั่งที่เท่ากับการเอาของขึ้นเซิร์ฟเวอร์', () => {
  for (const f of [GATE, STAGE]) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of [/\bssh\b|\bscp\b|\brsync\b/, /git\s+push/, /\bcurl\b|\bfetch\(/, /gh-pages|deploy-pages/]) {
      assert.doesNotMatch(src, re, `${path.relative(root, f)} มีคำสั่งเกินขอบเขต: ${re}`);
    }
  }
});
