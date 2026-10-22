/* generator ของเว็บจริง LakornAI v2 — AIO-22
   รัน:  node build/build.mjs      (จาก root ของ repo)
   เขียนออกเป็นไฟล์เว็บจริงที่ราก · ไม่แตะไฟล์ใด ๆ ใต้ design/v2/ (Visual เป็นเจ้าของ) */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SERIES, U, OPEN_TAGS, CAST_PAGES, D } from './content.mjs';
import { PAGES } from './ui.mjs';
import { robotsTxt, sitemapXml, PUBLISHED, SITE_ORIGIN, shareMisses } from './seo.mjs';
import * as A from './pages-discovery.mjs';
import * as B from './pages-watch.mjs';
import * as C from './pages-content.mjs';

const R = p => path.join(ROOT, p);
const write = (rel, data) => {
  const f = R(rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};

/* ============================ 1. สร้างทุกหน้า ============================ */
A.buildHome(); A.buildFeed(); A.buildSearch(); A.buildBrowse();
A.buildGenres(); A.buildTags(); A.buildPopular(); A.buildNew();
A.buildSchedule(); A.buildAZ(); A.buildCast();
B.buildSeries(); B.buildWatch();
C.buildLibrary(); C.buildSettings(); C.buildNotifications();
C.buildWelcome(); C.buildSystem(); C.buildContent();

/* ============================ 2. ยามกันพลาดตอน build ============================
   AIO-19 §9.4 เตือนว่าเทมเพลตเดียวทำ 418 หน้า "ถ้าลืมส่งพารามิเตอร์ จะได้ 418 หน้า title เดียวกัน"
   จึงบังคับตรวจตรงนี้ ถ้าไม่ผ่าน build ล้มทันที ไม่เขียนไฟล์ */
const errors = [];
const warns = [];
const seenTitle = new Map();
const seenDesc = new Map();
const seenOut = new Set();

/* ถ้อยคำที่ห้ามเหลือในเว็บจริงแม้จุดเดียว (AC-3 / AC-6) ---------------------
   ตัดถ้อยคำปฏิเสธเชิงบวกที่ลูกค้าอนุมัติออกก่อนตรวจ ไม่งั้นจะจับคำว่า
   "ไม่ต้องสมัครสมาชิก" ซึ่งเป็นถ้อยคำทางการ */
const ALLOWED = [
  /ไม่ต้องสมัครสมาชิก/g, /ไม่มีการสมัครสมาชิก/g, /ไม่มีระบบสมัครสมาชิกหรือเข้าสู่ระบบ/g,
  /ต้องสมัครสมาชิกไหม/g, /ไม่มีแพ็กเกจให้สมัคร/g,
  /ไม่ต้องล็อกอิน/g, /ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน/g,
];
const BANNED = [
  [/สำหรับสมาชิก/, 'คำว่า "สำหรับสมาชิก"'],
  [/สมัครสมาชิก/, 'คำว่า "สมัครสมาชิก" ที่ไม่ใช่ถ้อยคำปฏิเสธเชิงบวก'],
  [/เข้าสู่ระบบ|ล็อกอิน|login/i, 'คำชวนล็อกอิน'],
  [/เหรียญ/, 'คำว่า "เหรียญ"'],
  [/\bVIP\b/i, 'คำว่า VIP'],
  [/paywall/i, 'คำว่า paywall'],
  [/ปลดล็อก/, 'คำว่า "ปลดล็อก"'],
  [/ตอนที่ 1[–-]10/, 'ข้อความ "ตอนที่ 1–10 …ดูฟรี"'],
  [/class="[^"]*\bep\b[^"]*\block\b/, 'คลาส ep lock'],
  [/mockup|ข้อมูลตัวอย่าง \(/i, 'คำว่า mockup ในเว็บจริง'],
];
/* ห้ามหลุดเข้า structured data (AC-6) */
const BANNED_LD = [
  [/aggregateRating|ratingValue/, 'คะแนนรีวิวใน structured data'],
  [/interactionStatistic|"views"/, 'ยอดวิวใน structured data'],
  [/"@type"\s*:\s*"VideoObject"/, 'VideoObject ทั้งที่ยังไม่มีไฟล์วิดีโอ'],
  [/datePublished|uploadDate/, 'วันเผยแพร่ที่ไม่มีข้อมูลจริง'],
];

for (const p of PAGES) {
  if (seenOut.has(p.out)) errors.push(`เขียนไฟล์ซ้ำ: ${p.out}`);
  seenOut.add(p.out);

  if (!p.title) errors.push(`${p.out}: ไม่มี <title>`);
  if (!p.desc) errors.push(`${p.out}: ไม่มี meta description`);
  if (seenTitle.has(p.title)) errors.push(`title ซ้ำ: "${p.title}"\n    ${seenTitle.get(p.title)}\n    ${p.out}`);
  else seenTitle.set(p.title, p.out);
  if (seenDesc.has(p.desc)) errors.push(`description ซ้ำ:\n    ${seenDesc.get(p.desc)}\n    ${p.out}`);
  else seenDesc.set(p.desc, p.out);
  if (p.title.length > 60) warns.push(`title ยาว ${p.title.length} ตัวอักษร: ${p.out}`);
  if (p.desc.length > 160) warns.push(`description ยาว ${p.desc.length} ตัวอักษร: ${p.out}`);

  /* AC-1 — ทุกหน้าต้องมี <h1> ที่มีข้อความจริงใน HTML */
  const h1s = p.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g) || [];
  if (h1s.length !== 1) errors.push(`${p.out}: มี <h1> ${h1s.length} ตัว (ต้องมี 1)`);
  else {
    const text = h1s[0].replace(/<[^>]+>/g, '').trim();
    if (!text) errors.push(`${p.out}: <h1> ว่างเปล่าใน HTML`);
  }

  /* AC-6 — canonical / og / ld+json ครบทุกหน้า */
  for (const [re, what] of [
    [/<link rel="canonical" href="https?:\/\//, 'canonical'],
    [/<meta property="og:title"/, 'og:title'],
    [/<meta property="og:image"/, 'og:image'],
    [/<meta name="twitter:card"/, 'twitter card'],
    [/<meta name="robots"/, 'meta robots'],
  ]) if (!re.test(p.html)) errors.push(`${p.out}: ไม่มี ${what}`);

  /* AC-5 — <img> ทุกตัวต้องมี width/height/alt/loading */
  for (const tag of p.html.match(/<img\b[^>]*>/g) || []) {
    if (!/\bwidth="/.test(tag) || !/\bheight="/.test(tag)) errors.push(`${p.out}: <img> ไม่มี width/height — ${tag.slice(0, 90)}`);
    if (!/\balt="/.test(tag)) errors.push(`${p.out}: <img> ไม่มี alt — ${tag.slice(0, 90)}`);
    if (!/\bloading="/.test(tag)) errors.push(`${p.out}: <img> ไม่มี loading — ${tag.slice(0, 90)}`);
  }
  if (/background-image\s*:/.test(p.html)) errors.push(`${p.out}: ยังมี background-image สำหรับปก`);

  /* AC-3 — ถ้อยคำต้องห้าม */
  let scrub = p.html;
  for (const a of ALLOWED) scrub = scrub.replace(a, '');
  for (const [re, what] of BANNED) {
    const m = scrub.match(re);
    if (m) errors.push(`${p.out}: พบ${what} → "${m[0]}"`);
  }

  /* structured data */
  for (const block of p.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
    for (const [re, what] of BANNED_LD) if (re.test(block)) errors.push(`${p.out}: ${what}`);
    try { JSON.parse(block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); }
    catch (e) { errors.push(`${p.out}: JSON-LD parse ไม่ผ่าน — ${e.message}`); }
  }
}

/* AC-2 — ไม่มีเลขตอน/เปอร์เซ็นต์ความคืบหน้าที่เขียนมืออยู่ใน HTML ที่ส่งออก
   (หน้าแรก/คลัง/ออฟไลน์ ต้อง render จาก localStorage เท่านั้น) */
for (const p of PAGES) {
  if (!/(^|\/)(index\.html)$/.test(p.out) && !/^(library|offline)\//.test(p.out)) continue;
  if (!/id="contRail"|id="libPanel"/.test(p.html)) continue;
  const slice = p.html.match(/id="(?:contRail|libPanel)"[\s\S]*?<\/section>|id="libPanel"[\s\S]*?<\/div>\s*<\/div>/);
  if (slice && /ดูไปแล้ว\s*\d+%|width:\s*\d+%/.test(slice[0])) {
    errors.push(`${p.out}: บล็อก "ดูต่อ" ยังมีเปอร์เซ็นต์ที่เขียนมือใน HTML`);
  }
}

if (errors.length) {
  console.error('✗ build ไม่ผ่าน ' + errors.length + ' ข้อ\n  - ' + errors.slice(0, 40).join('\n  - '));
  if (errors.length > 40) console.error(`  … และอีก ${errors.length - 40} ข้อ`);
  process.exit(1);
}

/* ============================ 3. เขียนไฟล์หน้าเว็บ ============================ */
for (const p of PAGES) write(p.out, p.html);
/* สำเนา 404 ที่รากด้วย — โฮสต์ static ส่วนใหญ่มองหา /404.html */
write('404.html', fs.readFileSync(R('404/index.html'), 'utf8')
  .replace(/(href|src)="\.\.\//g, '$1="'));

/* ============================ 4. assets ============================ */
const DV2 = R('design/v2');

/* 4.1 ฟอนต์ */
fs.mkdirSync(R('assets/fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(DV2, 'fonts'))) {
  fs.copyFileSync(path.join(DV2, 'fonts', f), R(`assets/fonts/${f}`));
}

/* 4.2 tokens.css — คัดลอกตรงจากของ Visual (ค่า --border-i ผ่าน WCAG 1.4.11 แล้ว · AC-4) */
write('assets/tokens.css',
  '/* สร้างจาก design/v2/tokens.css โดย build/build.mjs — อย่าแก้ไฟล์นี้ตรง ๆ */\n'
  + fs.readFileSync(path.join(DV2, 'tokens.css'), 'utf8'));

/* 4.3 site.css = v2.css ของ Visual (ถอดบล็อกที่ตายแล้ว) + ส่วนเพิ่มของเว็บจริง */
const v2 = fs.readFileSync(path.join(DV2, 'v2.css'), 'utf8').split('\n');
function cutBetween(lines, startRe, endRe) {
  const a = lines.findIndex(l => startRe.test(l));
  if (a < 0) return lines;
  const b = lines.findIndex((l, i) => i > a && endRe.test(l));
  return b < 0 ? lines.slice(0, a) : [...lines.slice(0, a), ...lines.slice(b)];
}
/* บล็อก 25 (แผงราคา/VIP) และ 26 (เช็กอิน/ภารกิจ) เป็นซาก CSS ของชั้นเงินใน rev.1
   ไม่มี HTML ไหนใช้แล้ว และห้ามหลุดเข้าเว็บจริง */
let css = cutBetween(v2, /===== 25\. แผง\/กริดราคา/, /===== 27\. ตาราง A–Z/);
css = cutBetween(css, /===== 29\. styleguide helpers/, /===== 30\./);
/* คอมเมนต์ของ Visual บางบรรทัดอ้างถึงของที่ถูกลบ (".ep.lock", "ปุ่มเหรียญ") เพื่อเตือน dev
   มีประโยชน์ในไฟล์เสนอแบบ แต่ในเว็บจริงคือถ้อยคำต้องห้ามที่ค้างอยู่ — ถอดออกตอนคัดลอก */
const DEAD_WORD = /\.ep\.lock|เหรียญ|coin-btn|paywall|สมาชิก|\bVIP\b/;
css = css.join('\n').replace(/\/\*[\s\S]*?\*\//g, c => (DEAD_WORD.test(c) ? '' : c)).split('\n');
write('assets/site.css',
  '/* สร้างโดย build/build.mjs จาก design/v2/v2.css + build/site-extra.css — อย่าแก้ไฟล์นี้ตรง ๆ */\n'
  + css.join('\n') + '\n\n' + fs.readFileSync(R('build/site-extra.css'), 'utf8'));

/* 4.4 favicon */
write('assets/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0E0D12"/>` +
  `<path d="M12 9.5 23 16l-11 6.5z" fill="#F5C451"/></svg>\n`);

/* 4.5 app.js — โค้ดรันไทม์ของเว็บจริง (ดูต่อ/ติดตาม/เพลเยอร์/คลัง) */
fs.copyFileSync(R('build/app.src.js'), R('assets/app.js'));

/* ============================ 5. robots + sitemap ============================ */
write('robots.txt', robotsTxt());

const sitemapUrls = PAGES
  .filter(p => !/noindex/.test(p.robots))
  .map(p => p.url)
  .sort((a, b) => a.length - b.length || a.localeCompare(b));
write('sitemap.xml', sitemapXml(sitemapUrls));

/* ============================ 6. ลิงก์เก่า → ลิงก์ใหม่ ============================
   เว็บยังไม่เคยเผยแพร่ จึงไม่มีน้ำหนักอันดับให้รักษา (AIO-19 §9.2)
   ไฟล์ชุดนี้มีไว้กัน 404 ของลิงก์ที่ทีมส่งกันเองช่วง demo และ "แมป #ep<n> ด้วย JS"
   ตามที่โจทย์ AC-6 สั่ง — เพราะ fragment ไม่ถูกส่งไปกับ HTTP request
   เมื่อมีเซิร์ฟเวอร์จริง ให้ตั้ง 301 ตาม redirects.map แล้วลบไฟล์ stub ได้ */
/* หมายเหตุ: ไม่มี /index.html ในตารางนี้ เพราะบนโฮสต์ static มันคือไฟล์เดียวกับ /
   ถ้าใส่ไว้ stub จะไปทับหน้าแรกจริง */
const REDIRECTS = [
  ['/search.html', U.search],
  ['/new.html', U.newEp],
  ['/popular.html', U.popular],
  ['/about.html', U.about],
  ['/contact.html', U.contact],
  ['/continue.html', U.library + '?tab=continue'],
  ['/following.html', U.library + '?tab=following'],
  ['/poster-gallery.html', U.behind],
  ...D.genres.map(g => [`/genre-${g.slug}.html`, U.genre(g.slug)]),
  ...SERIES.map(s => [`/series/${s.slug}.html`, U.series(s.slug)]),
  ...SERIES.map(s => [`/watch/${s.slug}.html`, U.watch(s.slug, 1)]),
];

function stub(from, to) {
  const depth = from.replace(/^\//, '').split('/').length - 1;
  const up = depth ? '../'.repeat(depth) : '';
  const rel = to === '/' ? (up || './') : up + to.replace(/^\//, '');
  const isWatch = /^\/watch\/[^/]+\.html$/.test(from);
  const slug = isWatch ? from.replace(/^\/watch\/|\.html$/g, '') : '';
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<title>ย้ายไปที่อยู่ใหม่ · LakornAI</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE_ORIGIN}${to}">
<meta http-equiv="refresh" content="0;url=${rel}">
<script>(function(){var t=${JSON.stringify(rel)};${isWatch
  ? `var m=location.hash.match(/^#ep(\\d+)$/);if(m){t=${JSON.stringify(up)}+'watch/${slug}/ep-'+(+m[1])+'/';}`
  : ''}location.replace(t);})();</script>
</head><body><p>หน้านี้ย้ายไปที่ <a href="${rel}">${to}</a> แล้ว</p></body></html>
`;
}
for (const [from, to] of REDIRECTS) {
  const out = from.replace(/^\//, '');
  /* ยามกันพลาด: stub ต้องไม่ไปทับหน้าจริงที่เพิ่งสร้าง */
  if (seenOut.has(out)) { console.error(`✗ redirect stub ทับหน้าจริง: ${out}`); process.exit(1); }
  write(out, stub(from, to));
}
write('redirects.map',
  '# LakornAI — ตาราง 301 สำหรับตั้งค่าที่เซิร์ฟเวอร์ (ยังไม่ deploy)\n'
  + '# รูปแบบ: <เดิม> <ปลายทาง> 301\n'
  + '# หมายเหตุ: /watch/<slug>.html#ep<n> แมปด้วย 301 ไม่ได้ เพราะ fragment ไม่ถูกส่งไปกับ request\n'
  + '#          ต้องให้หน้าปลายทางอ่าน location.hash เอง — ทำไว้แล้วใน assets/app.js และในไฟล์ stub\n'
  + REDIRECTS.map(([a, b]) => `${a} ${b} 301`).join('\n') + '\n');

/* ============================ 7. สรุป ============================ */
const idx = PAGES.filter(p => !/noindex/.test(p.robots)).length;
console.log(`✓ สร้าง ${PAGES.length} หน้า (เปิดดัชนี ${idx} · noindex ${PAGES.length - idx})`);
console.log(`  เรื่อง ${SERIES.length} · ตอน ${SERIES.reduce((a, s) => a + s.eps, 0)} · แนว ${D.genres.length} · แท็กที่เปิด ${OPEN_TAGS.length} · หน้าตัวละคร ${CAST_PAGES.length}`);
console.log(`  sitemap ${sitemapUrls.length} URL · redirect stub ${REDIRECTS.length} ไฟล์ · robots.txt = ${PUBLISHED ? 'Allow' : 'Disallow ทั้งเว็บ (ยังไม่เผยแพร่)'}`);
if (shareMisses.size) {
  console.log(`  ⚠ ยังไม่มีภาพแชร์ 1200×630 — og:image ถอยไปใช้ปก 2:3 ไปก่อน (AC-7)`);
  console.log(`    วางไฟล์ลง assets/share/ ตามชื่อใน build/seo.mjs แล้ว build ใหม่ ไม่ต้องแก้โค้ด`);
}
if (warns.length) console.log(`  ⚠ คำเตือน ${warns.length} ข้อ:\n    - ` + warns.slice(0, 12).join('\n    - '));
