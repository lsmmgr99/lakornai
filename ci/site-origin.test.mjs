/* เทสต์ของ SITE_ORIGIN ที่ตั้งทับได้จาก env — AIO-36 · เจ้าของ: DevOps
   รัน: node --test ci/site-origin.test.mjs

   ทำไมเทสต์นี้อยู่ใน ci/ ไม่ใช่ build/: มันเป็นเทสต์ของ "เส้นทางขึ้นทดสอบ" ไม่ใช่ของเนื้อหาเว็บ
   และ build/ เป็นของทีม Dev ซึ่งงาน AIO-34/AIO-35 ถืออยู่

   build จริงถูกรันในโฟลเดอร์ชั่วคราวทุกครั้ง เพราะ build/build.mjs เขียนหน้าเว็บทับที่รากรีโป
   และ workspace นี้ถูกใช้ร่วมกับ run อื่น — วิธีเดียวกับ ci/rehearse.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeOrigin, DEFAULT_SITE_ORIGIN, SITE_ORIGIN, PUBLISHED, isPublished, robotsTxt } from '../build/seo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- ตัวทำ origin ให้เป็นรูปเดียว ---------------- */

test('ไม่ส่ง env = ค่าตั้งต้นเดิม ไม่เปลี่ยน', () => {
  assert.equal(DEFAULT_SITE_ORIGIN, 'https://ailakorn.com');
  for (const v of [undefined, null, '', '   ']) assert.equal(normalizeOrigin(v), 'https://ailakorn.com');
  /* กระบวนการที่รันเทสต์นี้ไม่ได้ตั้ง env ไว้ ค่าที่โมดูลคิดได้จึงต้องเท่าค่าตั้งต้น */
  if (!process.env.SITE_ORIGIN) assert.equal(SITE_ORIGIN, DEFAULT_SITE_ORIGIN);
});

test('origin ที่มี path ต่อท้ายถูกเก็บไว้ และ / ปิดท้ายถูกตัด — ห้ามเกิด // ซ้อน', () => {
  assert.equal(normalizeOrigin('https://lsmmgr99.github.io/lakornai'), 'https://lsmmgr99.github.io/lakornai');
  assert.equal(normalizeOrigin('https://lsmmgr99.github.io/lakornai/'), 'https://lsmmgr99.github.io/lakornai');
  assert.equal(normalizeOrigin('https://lsmmgr99.github.io/lakornai///'), 'https://lsmmgr99.github.io/lakornai');
  assert.equal(normalizeOrigin('https://lsmmgr99.github.io//lakornai//th/'), 'https://lsmmgr99.github.io/lakornai/th');
  assert.equal(normalizeOrigin('https://ailakorn.com/'), 'https://ailakorn.com');
  assert.equal(normalizeOrigin('http://127.0.0.1:8080/'), 'http://127.0.0.1:8080');
  assert.equal(normalizeOrigin('  https://ailakorn.com  '), 'https://ailakorn.com');
});

test('ค่าที่ใช้ไม่ได้ต้องล้มตอน build ไม่ใช่ปล่อย URL เพี้ยนไปทั้งเว็บ', () => {
  for (const bad of ['ailakorn.com', '/lakornai', 'ftp://ailakorn.com', 'https://ailakorn.com/?x=1',
    'https://ailakorn.com/#a', 'https://user:pw@ailakorn.com']) {
    assert.throws(() => normalizeOrigin(bad), /SITE_ORIGIN/, `ควรล้มกับ ${bad}`);
  }
});

/* ---------------- รอบทดสอบต้องยังปิดดัชนี (ข้อ 4 ของ AIO-36) ---------------- */

test('ไม่ส่ง SITE_PUBLISHED = ยังไม่เผยแพร่ และ robots.txt ปิดดัชนีทั้งเว็บ', () => {
  assert.equal(isPublished(undefined), false);
  assert.equal(isPublished(''), false);
  assert.equal(isPublished('0'), false);
  assert.equal(isPublished('false'), false);
  for (const on of ['1', 'true', 'TRUE', 'yes', ' on ']) assert.equal(isPublished(on), true, on);
  if (!process.env.SITE_PUBLISHED) assert.equal(PUBLISHED, false, 'ค่าตั้งต้นต้องเป็น false — เปิดได้ด้วย env เท่านั้น (ADR-001 §14)');
  const r = robotsTxt(false);
  assert.match(r, /^Disallow: \/$/m);
  assert.doesNotMatch(r, /^Allow: \//m);
  assert.doesNotMatch(r, /Sitemap:/, 'ยังไม่เผยแพร่ จึงไม่ควรชี้ sitemap ให้บอต');
  const live = robotsTxt(true);
  assert.match(live, /^Allow: \/$/m);
  assert.doesNotMatch(live, /^Disallow: \/$/m);
  assert.match(live, /^Sitemap: https:\/\/.+\/sitemap\.xml$/m);
  for (const priv of ['/library/', '/settings/', '/notifications/', '/welcome/']) assert.match(live, new RegExp(`^Disallow: ${priv}$`, 'm'));
});

/* ---------------- build จริงทั้งเว็บ แล้ววัดผลจากไฟล์ที่เขียนออกมา ---------------- */

/* build ต้องการแค่เท่านี้ — ไม่คัดลอก design/v2 ทั้งก้อน (57 MB ส่วนใหญ่เป็นภาพชุดทดสอบ)
   รายการนี้มาจากจุดที่ build/build.mjs อ่านของ Visual จริง: build/build.mjs:210-224 */
const NEEDS = ['build', 'assets', 'content.json', 'design/v2/fonts', 'design/v2/tokens.css', 'design/v2/v2.css'];
function buildIn(siteOrigin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aio36-origin-'));
  for (const name of NEEDS) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.cpSync(path.join(root, name), path.join(dir, name), { recursive: true });
  }
  const env = { ...process.env };
  if (siteOrigin === null) delete env.SITE_ORIGIN; else env.SITE_ORIGIN = siteOrigin;
  const r = spawnSync(process.execPath, [path.join(dir, 'build/build.mjs')], { encoding: 'utf8', env });
  assert.equal(r.status, 0, `build ล้ม:\n${r.stdout}${r.stderr}`);
  return dir;
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const locsIn = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const urlsIn = (text) => [...text.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m => m[0]);
const walkHtml = (dir, base = '') => fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walkHtml(dir, base ? `${base}/${e.name}` : e.name)
    : e.name.endsWith('.html') ? [base ? `${base}/${e.name}` : e.name] : []);

test('ไม่ส่ง env แล้ว URL ทุกตัวที่ build เขียนออกมายังเป็นโดเมนเดิม', () => {
  const dir = buildIn(null);
  const home = read(dir, 'index.html');
  assert.match(home, /<link rel="canonical" href="https:\/\/ailakorn\.com\/">/);
  assert.match(home, /<meta property="og:url" content="https:\/\/ailakorn\.com\/">/);
  /* เทียบกับไฟล์ที่อยู่ในรีโปจริง: ชุด URL สัมบูรณ์ต้องเหมือนกันทุกตัว */
  assert.deepEqual([...new Set(urlsIn(home))].sort(), [...new Set(urlsIn(read(root, 'index.html')))].sort());
  const hosts = new Set(locsIn(read(dir, 'sitemap.xml')).map(u => new URL(u).origin));
  assert.deepEqual([...hosts], ['https://ailakorn.com']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ส่ง SITE_ORIGIN ที่มี path ต่อท้าย: canonical/og/sitemap/JSON-LD ถูกทั้งชุด และไม่มี // ซ้อน', () => {
  const O = 'https://lsmmgr99.github.io/lakornai';
  const dir = buildIn(`${O}/`);   /* ส่งมาแบบมี / ปิดท้าย เพื่อพิสูจน์ว่าไม่เกิด // */

  const home = read(dir, 'index.html');
  assert.match(home, new RegExp(`<link rel="canonical" href="${O}/">`));
  assert.match(home, new RegExp(`<meta property="og:url" content="${O}/">`));
  assert.match(home, new RegExp(`<meta property="og:image" content="${O}/assets/`));
  assert.match(home, new RegExp(`<meta name="twitter:image" content="${O}/assets/`));
  assert.match(home, new RegExp(`"@id":"${O}/#website"`));
  assert.match(home, new RegExp(`"urlTemplate":"${O}/search/\\?q=`));

  const slug = JSON.parse(read(root, 'content.json')).series[0].slug;
  const series = read(dir, `series/${slug}/index.html`);
  assert.match(series, new RegExp(`<link rel="canonical" href="${O}/series/${slug}/">`));
  assert.match(series, new RegExp(`"@id":"${O}/series/${slug}/#series"`));
  const watch = read(dir, `watch/${slug}/ep-1/index.html`);
  assert.match(watch, new RegExp(`"@id":"${O}/watch/${slug}/ep-1/#episode"`));
  assert.match(watch, new RegExp(`"@id":"${O}/series/${slug}/#series"`));

  const sitemap = read(dir, 'sitemap.xml');
  assert.match(sitemap, new RegExp(`<loc>${O}/</loc>`));
  const locs = locsIn(sitemap);
  assert.ok(locs.length > 40, `คาดว่า sitemap มี <loc> หลายสิบรายการ ได้ ${locs.length}`);
  assert.ok(locs.every(u => u.startsWith(`${O}/`)), 'ทุก <loc> ต้องขึ้นต้นด้วย origin ที่ส่งมา');

  /* redirect stub ก็ใช้ค่าเดียวกัน (build/build.mjs ต่อ SITE_ORIGIN ตรง ๆ) */
  assert.match(read(dir, 'search.html'), new RegExp(`<link rel="canonical" href="${O}/search/">`));

  /* ไล่ทุกไฟล์ที่ build เขียนออกมา: ห้ามมี // หลังชื่อโฮสต์แม้จุดเดียว */
  const files = [...walkHtml(dir).filter(f => !f.startsWith('build/')), 'sitemap.xml', 'robots.txt'];
  assert.ok(files.length > 400, `คาดว่ามีไฟล์ให้ตรวจมากกว่า 400 ได้ ${files.length}`);
  const bad = [];
  for (const rel of files) {
    for (const u of urlsIn(read(dir, rel))) {
      if (/\/\//.test(u.replace(/^https?:\/\//, ''))) bad.push(`${rel}: ${u}`);
      if (u.startsWith('https://ailakorn.com')) bad.push(`${rel}: ยังเหลือโดเมนเดิม ${u}`);
    }
  }
  assert.deepEqual(bad.slice(0, 10), [], `พบ URL เพี้ยน ${bad.length} จุด`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ลิงก์ในหน้าเป็น relative ทั้งหมด — เสิร์ฟใต้ path ย่อยได้ไม่พัง', () => {
  /* ข้อเท็จจริงนี้คือเหตุที่ URL ทดสอบแบบ https://<user>.github.io/<repo>/ ใช้ได้
     ถ้าวันหนึ่งมีคนเปลี่ยนไปใช้ href="/..." ลิงก์จะพังทันทีบน path ย่อย เทสต์นี้จะแดงก่อน */
  const home = read(root, 'index.html');
  const hrefs = [...home.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  const rooted = hrefs.filter(h => h.startsWith('/'));
  assert.deepEqual(rooted, [], 'พบลิงก์ที่อ้างจากรากโดเมน');
});
