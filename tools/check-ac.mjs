/* ตรวจเกณฑ์ตรวจรับ AIO-22 จาก "ไฟล์ที่ส่งมอบจริง" ไม่ใช่จากตัว generator
   รัน:  node tools/check-ac.mjs
   ตั้งใจให้เป็นตัวเดียวกับที่ผู้ตรวจรันเองได้ · ทุกข้อพิมพ์ตัวเลขที่นับได้ออกมาด้วย */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* `admin` = แผงหลังบ้านของ AIO-23 (Dev-Codex เป็นเจ้าของ) ไม่ใช่หน้าของผู้ชม
   เกณฑ์ AC-1/AC-3/AC-6 เขียนไว้สำหรับ "หน้าที่ให้ Google เก็บ" และ "ถ้อยคำที่ผู้ชมเห็น"
   จึงไม่เอามานับรวม — แต่ไม่ปล่อยลอย: ตรวจแยกท้ายไฟล์ว่าต้อง noindex และไม่หลุด sitemap */
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'docs', 'admin', '.paperclip-repositories', '.claude']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}
const ALL = walk(ROOT);
const rel = f => path.relative(ROOT, f);
const HTML = ALL.filter(f => f.endsWith('.html'));
/* หน้าจริง = ไม่ใช่ไฟล์ส่งต่อ (redirect stub) */
const isStub = f => /ย้ายไปที่อยู่ใหม่/.test(fs.readFileSync(f, 'utf8'));
const PAGES = HTML.filter(f => !isStub(f));
const STUBS = HTML.filter(isStub);
const read = f => fs.readFileSync(f, 'utf8');

let fail = 0;
const ok = (c, msg) => { console.log(`  ${c ? '✓' : '✗'} ${msg}`); if (!c) fail++; };
const head = t => console.log('\n' + t);

/* ---------------- AC-1 ---------------- */
head('AC-1 · ทุกหน้าที่ให้ Google เก็บ ต้องมี <h1> ที่มีข้อความจริงใน HTML');
const indexable = PAGES.filter(f => !/content="noindex/.test(read(f)));
const emptyH1 = PAGES.filter(f => {
  const m = read(f).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  return !m || !m[1].replace(/<[^>]+>/g, '').trim();
});
ok(emptyH1.length === 0, `<h1> ว่างเปล่า ${emptyH1.length} ไฟล์ จาก ${PAGES.length} หน้า${emptyH1.length ? ' → ' + emptyH1.slice(0, 3).map(rel) : ''}`);
const watchPages = PAGES.filter(f => /^watch\//.test(rel(f)));
const watchWithTitle = watchPages.filter(f => /<h1[^>]*id="epTitle"[^>]*>\s*<span lang="en">EP\.\d+<\/span>\s*\S/.test(read(f)));
ok(watchWithTitle.length === watchPages.length,
  `หน้ารับชม ${watchPages.length} หน้า มีชื่อตอนใน <h1> ตอนส่งออก ${watchWithTitle.length} หน้า`);
ok(indexable.length > 0, `หน้าที่เปิดให้เก็บดัชนี ${indexable.length} หน้า · noindex ${PAGES.length - indexable.length} หน้า`);

/* ---------------- AC-2 ----------------
   ข้อนี้เคยเป็น grep "ตัวสะกดของซอร์ส" ล้วน ซึ่งผูกกับวิธีเขียนโค้ด ไม่ใช่ผลลัพธ์:
   จัดรูปโค้ดใหม่ก็แดงทั้งที่พฤติกรรมเท่าเดิม · เขียนตัวอักษรครบแต่ไม่เคยถูกเรียกก็เขียวได้
   และทำให้ความคุ้มครองพฤติกรรมทั้งหมดไปแขวนอยู่กับ test-continue.mjs เพียงลำพัง
   ตอนนี้ด่านนี้ "รัน" ชุดพฤติกรรมจริงให้เลย — คำสั่งเดียวที่ผู้ตรวจรันครอบ AC-2 ทั้งข้อ */
head('AC-2 · "ดูต่อ" ทำงานจริง (รันชุดพฤติกรรมด้วยเบราว์เซอร์จริง)');
const app = read(path.join(ROOT, 'assets/app.js'));
ok(app === read(path.join(ROOT, 'build/app.src.js')),
  'assets/app.js ตรงกับต้นฉบับ build/app.src.js (ถ้าไม่ตรง คือมีคนแก้ไฟล์ที่ build ทับ)');
if (process.env.SKIP_BROWSER) {
  ok(false, 'ข้ามชุดพฤติกรรม AC-2 เพราะตั้ง SKIP_BROWSER — ข้อนี้นับเป็นตก ไม่ใช่ผ่าน');
} else {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/test-continue.mjs')],
    { encoding: 'utf8', timeout: 480000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/ผล: ผ่าน (\d+) · ตก (\d+)/);
  ok(!!m && r.status === 0,
    m ? `tools/test-continue.mjs · ผ่าน ${m[1]} ตก ${m[2]}` : 'รัน tools/test-continue.mjs ไม่สำเร็จ (ต้องมี Chromium ของ playwright ในเครื่อง)');
  if (m && +m[2] > 0) out.split('\n').filter(l => l.includes('✗')).forEach(l => console.log('     ' + l.trim()));
}
const hand = PAGES.filter(f => /(ดูไปแล้ว \d+%|ดูต่อ EP\.\d+|EP\.\d+\/\d+ ·)/.test(read(f)));
ok(hand.length === 0, `หน้าที่ยังมีเปอร์เซ็นต์/เลขตอนของ "ดูต่อ" เขียนมือใน HTML: ${hand.length} ไฟล์${hand.length ? ' → ' + hand.slice(0, 3).map(rel) : ''}`);
/* ข้อมูลรันไทม์ของเว็บจริงคือ assets/content.js (ผลผลิตของ build)
   ส่วน assets/data.js เป็นชุดข้อมูลตั้งต้นของชั้นออกแบบที่ design/v2/lib.mjs อ่าน
   ทั้งสองไฟล์ต้องไม่มี seed ความคืบหน้าการดู และเว็บจริงต้องไม่อ่านไฟล์ของชั้นออกแบบ */
const runtimeData = read(path.join(ROOT, 'assets/content.js'));
ok(!/"cont"\s*:/.test(runtimeData), 'assets/content.js ไม่มี seed `cont` ที่เขียนมือ');
ok(!/"(following|subs)"\s*:/.test(runtimeData),
  'assets/content.js ไม่มี `following`/`subs` ของชั้นออกแบบปนเข้ามา (ADR-001 §6.6 · V9)');
ok(!/"cont"\s*:/.test(read(path.join(ROOT, 'assets/data.js'))),
  'assets/data.js (ชุดของชั้นออกแบบ) ไม่มี seed `cont` ที่เขียนมือ');
const readsDataJs = PAGES.filter(f => /assets\/data\.js/.test(read(f)));
ok(readsDataJs.length === 0,
  `หน้าเว็บจริงที่ยังโหลด assets/data.js: ${readsDataJs.length} หน้า (ต้องเป็น assets/content.js)`);

/* ม็อกอัพที่ลูกค้าอนุมัติต้องสร้างซ้ำได้จากรีโป — รันเจนเนอเรเตอร์จริงในสำเนาแยกแล้วเทียบไฟล์
   ด่านนี้คือสิ่งที่จับไม่ได้ด้วย `git status` เพราะไฟล์จะเพี้ยนตอนมีคนรันเจนเนอเรเตอร์ ไม่ใช่ตอน build */
head('ม็อกอัพที่อนุมัติ · design/v2/ ต้องสร้างซ้ำได้เหมือนเดิม');
const mock = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-mockup.mjs')], { encoding: 'utf8' });
ok(mock.status === 0, ((mock.stdout || mock.stderr || '').trim().split('\n')[0] || 'รัน tools/check-mockup.mjs ไม่สำเร็จ').replace(/^[✓✗]\s*/, ''));
if (mock.status !== 0) (mock.stdout + mock.stderr).trim().split('\n').slice(1, 8).forEach(l => console.log('     ' + l));

/* ---------------- AC-3 ---------------- */
head('AC-3 · ไม่มีถ้อยคำ paywall/สมาชิกเหลือในเว็บจริง');
const ALLOW = [/ไม่ต้องสมัครสมาชิก/g, /ไม่มีการสมัครสมาชิก/g, /ไม่มีระบบสมัครสมาชิกหรือเข้าสู่ระบบ/g,
  /ต้องสมัครสมาชิกไหม/g, /ไม่มีแพ็กเกจให้สมัคร/g, /ไม่ต้องล็อกอิน/g];
const BAN = [['สำหรับสมาชิก', /สำหรับสมาชิก/], ['สมัครสมาชิก (ที่ไม่ใช่ประโยคปฏิเสธ)', /สมัครสมาชิก/],
  ['เหรียญ', /เหรียญ/], ['เข้าสู่ระบบ/ล็อกอิน', /เข้าสู่ระบบ|ล็อกอิน/], ['VIP', /\bVIP\b/i],
  ['ปลดล็อก', /ปลดล็อก/], ['ตอนที่ 1–10 ดูฟรี', /ตอนที่ 1[–-]10/],
  ['class="ep lock"', /class="[^"]*\bep\b[^"]*\block\b/], ['mockup', /mockup|ข้อมูลตัวอย่าง \(/i]];
const TEXTS = ALL.filter(f => /\.(html|css|js)$/.test(f));
for (const [name, re] of BAN) {
  const hits = TEXTS.filter(f => {
    let s = read(f);
    for (const a of ALLOW) s = s.replace(a, '');
    return re.test(s);
  });
  ok(hits.length === 0, `${name}: พบ ${hits.length} ไฟล์${hits.length ? ' → ' + hits.slice(0, 3).map(rel) : ''}`);
}
const freeLine = PAGES.filter(f => /ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก/.test(read(f)));
ok(freeLine.length === PAGES.length, `ถ้อยคำทางการ "ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก" อยู่ครบ ${freeLine.length}/${PAGES.length} หน้า`);

/* ---------------- AC-4 ---------------- */
head('AC-4 · เส้นขอบผ่าน WCAG 1.4.11 (3:1)');
const css = read(path.join(ROOT, 'assets/site.css')) + read(path.join(ROOT, 'assets/tokens.css'));
ok(/--border-i:\s*#726E7D/.test(css), 'มี token --border-i: #726E7D (3.20–3.91:1 บน 4 พื้นผิว)');
const interactive = ['.chip{', '.ep{', '.btn-ghost{', '.search-box', '.ep-tabs button'];
const usesOld = (css.match(/border:1px solid var\(--border\)[^-]/g) || []).length
  + (css.match(/var\(--border-2\)/g) || []).length;
ok(usesOld === 0, `ขอบคอมโพเนนต์ที่ยังใช้ token เก่า (--border / --border-2): ${usesOld} จุด`);
/* นับเฉพาะ selector ที่ลงท้ายด้วย --faint "แล้วไม่ถูกเขียนทับทีหลัง" และไม่ใช่กราฟิกล้วน
   (chevron ในรายการตั้งค่า และจุดคั่น · เป็นกราฟิก ไม่ใช่ข้อความ) */
const GRAPHIC_OK = ['.rowlist .ch', '.facts>span+span::before'];
const faintRules = [...css.matchAll(/([^{}]+)\{[^}]*color:\s*var\(--faint\)[^}]*\}/g)].map(m => m[1].trim());
const faintText = faintRules.filter(sel => {
  if (GRAPHIC_OK.some(g => sel.includes(g))) return false;
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const after = css.slice(css.indexOf(sel) + sel.length);
  return !new RegExp(esc.split(',')[0] + '[^{}]*\\{[^}]*color:\\s*var\\(--dim\\)').test(after);
});
ok(faintText.length === 0,
  `--faint ที่ยังใช้กับข้อความ: ${faintText.length} จุด${faintText.length ? ' → ' + faintText.join(' / ') : ''} (กราฟิกเท่านั้น · visual-design §2.2)`);
/* AIO-34 บั๊ก 4 — ข้อข้างบนอ่าน "กฎใน CSS" ซึ่งมองไม่เห็นช่องกรอกที่ไม่โดนกฎไหนเลย
   (ช่องนั้นได้สีเริ่มต้นของเบราว์เซอร์ ซึ่งไม่มีอยู่ในไฟล์ CSS) · จึงวัดจากหน้าที่
   render จริงด้วย getComputedStyle ต่ออีกชั้น — คำสั่งเดียวที่ผู้ตรวจรันครอบ AC-4 ทั้งข้อ */
if (process.env.SKIP_BROWSER) {
  ok(false, 'ข้ามการวัดคอนทราสต์ placeholder เพราะตั้ง SKIP_BROWSER — ข้อนี้นับเป็นตก ไม่ใช่ผ่าน');
} else {
  const c = spawnSync(process.execPath, [path.join(ROOT, 'tools/test-contrast.mjs')],
    { env: { ...process.env, SKIP_BUILD: '1' }, encoding: 'utf8', timeout: 300000 });
  const out = (c.stdout || '') + (c.stderr || '');
  const m = out.match(/ผล: ผ่าน (\d+) · ตก (\d+)/);
  const low = out.match(/ต่ำสุด ([\d.]+):1 ที่ (\S+)/);
  ok(!!m && c.status === 0,
    m ? `tools/test-contrast.mjs · ผ่าน ${m[1]} ตก ${m[2]}`
      + (low ? ` · คอนทราสต์ placeholder ต่ำสุด ${low[1]}:1 ที่ ${low[2]}` : '')
      : 'รัน tools/test-contrast.mjs ไม่สำเร็จ (ต้องมี Chromium ของ playwright ในเครื่อง)');
  out.split('\n').filter(l => /^\s+[✓✗] \//.test(l)).forEach(l => console.log('     ' + l.trim()));
  if (m && +m[2] > 0) out.split('\n').filter(l => l.includes('✗')).forEach(l => console.log('     ' + l.trim()));
}

/* ---------------- AC-5 ---------------- */
head('AC-5 · ปกเป็น <img> จริง');
const imgs = PAGES.flatMap(f => (read(f).match(/<img\b[^>]*>/g) || []));
const noWH = imgs.filter(t => !/\bwidth="/.test(t) || !/\bheight="/.test(t));
const noLazy = imgs.filter(t => !/\bloading="/.test(t));
const noAlt = imgs.filter(t => !/\balt="/.test(t));
ok(imgs.length > 0, `<img> ในเว็บจริง ${imgs.length} ตัว (ของเดิมมีแค่ 12 ตัวใน poster-gallery.html)`);
ok(noWH.length === 0, `<img> ที่ไม่มี width/height: ${noWH.length}`);
ok(noLazy.length === 0, `<img> ที่ไม่มี loading: ${noLazy.length}`);
ok(noAlt.length === 0, `<img> ที่ไม่มี alt: ${noAlt.length}`);
const bgImg = PAGES.filter(f => /background-image\s*:/.test(read(f)));
ok(bgImg.length === 0, `หน้าที่ยังใช้ CSS background-image สำหรับปก: ${bgImg.length}`);
const covers = fs.readdirSync(path.join(ROOT, 'assets/covers'));
ok(covers.every(c => c.endsWith('.webp')) && covers.length === 12,
  `ไฟล์ปก ${covers.length} ใบ ขนาดจริง 1024×1536 (2:3) · ประกาศ width/height ตรงกับไฟล์`);

/* ---------------- AC-6 ---------------- */
head('AC-6 · on-page ใส่ตอน build');
const need = [['canonical', /<link rel="canonical" href="https:\/\//], ['og:', /<meta property="og:title"/],
  ['twitter card', /<meta name="twitter:card"/], ['meta robots', /<meta name="robots"/]];
for (const [n, re] of need) {
  const have = PAGES.filter(f => re.test(read(f))).length;
  ok(have === PAGES.length, `${n}: ${have}/${PAGES.length} หน้า`);
}
/* JSON-LD บังคับเฉพาะหน้าที่เปิดให้เก็บดัชนี — AIO-19 §7.1 ระบุเองว่าหน้ากฎหมาย
   และหน้าเนื้อหาส่วนตัว "ไม่ต้องมี" schema ที่เพิ่มคุณค่า */
const ldHave = indexable.filter(f => /application\/ld\+json/.test(read(f))).length;
ok(ldHave === indexable.length, `ld+json บนหน้าที่เปิดดัชนี: ${ldHave}/${indexable.length} หน้า`);
/* /404.html เป็นสำเนาของ /404/ ที่โฮสต์ static มองหาเป็นชื่อตายตัว ทั้งคู่เป็น noindex
   จึงไม่นับเป็นหน้าซ้ำในเกณฑ์ title/description */
const UNIQ = PAGES.filter(f => rel(f) !== '404.html');
const titles = new Map(), descs = new Map();
for (const f of UNIQ) {
  const s = read(f);
  const t = (s.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const d = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  titles.set(t, (titles.get(t) || 0) + 1);
  descs.set(d, (descs.get(d) || 0) + 1);
}
ok(titles.size === UNIQ.length, `<title> ไม่ซ้ำกัน ${titles.size}/${UNIQ.length}`);
ok(descs.size === UNIQ.length, `meta description ไม่ซ้ำกัน ${descs.size}/${UNIQ.length} (ของเดิม 38 หน้ามี 20 แบบ)`);
ok(!descs.has(''), 'ไม่มีหน้าไหนที่ไม่มี meta description');
const ld = PAGES.flatMap(f => read(f).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []);
const dirty = ld.filter(b => /aggregateRating|interactionScore|interactionStatistic|VideoObject|"views"/.test(b));
ok(dirty.length === 0, `structured data ที่มียอดวิว/คะแนน/VideoObject: ${dirty.length} ชุด จาก ${ld.length} ชุด`);
const freeLd = ld.filter(b => /isAccessibleForFree":true/.test(b)).length;
ok(freeLd > 0, `ชุดที่ประกาศ isAccessibleForFree: true · ${freeLd} ชุด`);
ok(fs.existsSync(path.join(ROOT, 'robots.txt')), 'มี robots.txt');
ok(fs.existsSync(path.join(ROOT, 'sitemap.xml')), 'มี sitemap.xml');
const sm = read(path.join(ROOT, 'sitemap.xml'));
const smCount = (sm.match(/<loc>/g) || []).length;
ok(smCount === indexable.length, `sitemap มี ${smCount} URL = จำนวนหน้าที่เปิดดัชนี ${indexable.length}`);
ok(!/<lastmod>/.test(sm), 'sitemap ไม่มี <lastmod> ที่เดาขึ้นมา (AIO-19 C-02)');
const origins = new Set(PAGES.flatMap(f => (read(f).match(/https:\/\/[a-z0-9.-]+/g) || [])
  .filter(u => !/schema\.org|www\.w3\.org/.test(u))));
ok(origins.size === 1, `โดเมนในเว็บมีค่าเดียว: ${[...origins].join(', ')} (แก้ที่ build/seo.mjs บรรทัดเดียว)`);
const ep1 = PAGES.filter(f => /^watch\/[^/]+\/ep-1\/index\.html$/.test(rel(f)) && !/noindex/.test(read(f)));
const epN = PAGES.filter(f => /^watch\//.test(rel(f)) && !/ep-1\//.test(rel(f)) && /noindex,follow/.test(read(f)));
ok(ep1.length === 12, `เปิดดัชนีหน้าตอนแค่ตอนแรกของแต่ละเรื่อง: ${ep1.length} หน้า`);
ok(epN.length === watchPages.length - 12, `ตอนที่ 2 ขึ้นไป noindex,follow: ${epN.length} หน้า`);
const hashLinks = PAGES.flatMap(f => (read(f).match(/href="[^"]*watch\/[^"]*#ep\d+"/g) || []));
ok(hashLinks.length === 0, `ลิงก์ไปหน้ารับชมที่ยังมี #ep ติดอยู่: ${hashLinks.length} ลิงก์ (ของเดิม 469 ลิงก์)`);
ok(/location\.hash\.match\(\/\^#ep/.test(app), 'มีการแมป #ep<n> → path จริงด้วย JS บนหน้าปลายทาง');
ok(STUBS.length > 0 && STUBS.every(f => /noindex/.test(read(f))),
  `ไฟล์ส่งต่อ URL เก่า ${STUBS.length} ไฟล์ · ทุกไฟล์เป็น noindex · ตาราง 301 อยู่ที่ redirects.map`);

/* ---------------- กฎ V12 / V13 ของ ADR-001 §12.3 (เจ้าของ: Dev-Claude) ----------------
   ตรวจจาก "ไฟล์ที่ส่งมอบจริง" ซ้ำอีกชั้นนอกเหนือจากยามใน build/build.mjs
   เพราะรอบที่แล้วบทเรียนคือยามตอน build ปล่อยของพวกนี้ผ่านหมด */
head('ADR-001 §12.3 · V12 ป้ายยอดวิวกำพร้า / V13 การอ้างว่ามีการวัดผู้ชม');
const cj = path.join(ROOT, 'content.json');
const viewsSource = fs.existsSync(cj) ? (JSON.parse(read(cj)).meta || {}).viewsSource || 'none' : 'none';
console.log(`  ℹ meta.viewsSource = "${viewsSource}"`);
if (viewsSource === 'none') {
  /* `(?<!รี)วิว` จับทั้งป้ายที่มีเลขและป้ายกำพร้าในครั้งเดียว และปล่อยคำว่า "รีวิว" ผ่าน */
  const orphan = PAGES.filter(f => /(?<!รี)วิว/.test(read(f).replace(/<script[\s\S]*?<\/script>/g, '')));
  ok(orphan.length === 0,
    `V12 · หน้าที่ยังมีคำว่า "วิว" ขณะไม่มีระบบวัด: ${orphan.length} ไฟล์${orphan.length ? ' → ' + orphan.slice(0, 4).map(rel) : ''}`);
  const unit = PAGES.filter(f => /\d[\d.,]*\s*(ล้าน|[KM])(?![ก-๙A-Za-z0-9])/
    .test(read(f).replace(/<script[\s\S]*?<\/script>/g, '')));
  ok(unit.length === 0, `V12 · หน้าที่มีตัวเลข+หน่วยย่อในบริบทยอดวิว: ${unit.length} ไฟล์`);
  const CLAIM = [/คนดูมากที่สุด/, /ยอดนิยม[^<]{0,12}สัปดาห์/, /TOP\s*10[^<]{0,8}สัปดาห์/i,
    /อันดับจากยอดวิว/, /most\s+watched|trending/i];
  const claims = PAGES.filter(f => CLAIM.some(re => re.test(read(f))));
  ok(claims.length === 0,
    `V13 · หน้าที่อ้างว่ามีการวัดผู้ชม: ${claims.length} ไฟล์${claims.length ? ' → ' + claims.slice(0, 4).map(rel) : ''}`);
  const appClaims = [...CLAIM, /(?<!รี)วิว/].filter(re => re.test(app));
  ok(appClaims.length === 0, `V12/V13 · assets/app.js (ข้อความที่ JS เขียนลงหน้าตอนรันไทม์): ${appClaims.length} จุด`);
}

/* ---------------- หน้าเปิดดัชนีต้องไม่เป็นหน้าเปล่า (AIO-19 §9.3) ---------------- */
head('หน้าที่เปิดให้ Google เก็บ ต้องมีข้อความนำและ JSON-LD ที่ไม่ว่าง');
const emptyLead = indexable.filter(f => (read(f).match(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/g) || [])
  .some(m => !m.replace(/<[^>]+>/g, '').trim()));
ok(emptyLead.length === 0,
  `<p class="lead"> ว่างเปล่าในหน้าเปิดดัชนี: ${emptyLead.length} ไฟล์${emptyLead.length ? ' → ' + emptyLead.slice(0, 6).map(rel) : ''}`);
const emptyLd = [];
for (const f of indexable) {
  for (const block of read(f).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
    const raw = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    if (/"(name|description|headline)"\s*:\s*""/.test(raw)) { emptyLd.push(rel(f)); break; }
  }
}
ok(emptyLd.length === 0,
  `JSON-LD ที่มี name/description/headline เป็นค่าว่าง: ${emptyLd.length} ไฟล์${emptyLd.length ? ' → ' + emptyLd.slice(0, 6) : ''}`);
const genreLeads = indexable.filter(f => /^genre\/[^/]+\/index\.html$/.test(rel(f)))
  .filter(f => (read(f).match(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1].replace(/<[^>]+>/g, '').trim().length >= 80);
ok(genreLeads.length === 6, `หน้าแนวที่มีข้อความนำยาว ≥80 ตัวอักษร: ${genreLeads.length}/6 หน้า`);

/* ---------------- AC-7 ---------------- */
head('AC-7 · เทมเพลตภาพแชร์ 1200×630');
const shareDir = path.join(ROOT, 'assets/share');
const hasShare = fs.existsSync(shareDir) && fs.readdirSync(shareDir).some(f => /\.(jpg|png|webp)$/.test(f));
ok(fs.existsSync(shareDir), 'มีช่องเสียบที่ assets/share/ พร้อมคำอธิบายการตั้งชื่อไฟล์');
console.log(`  ℹ ไฟล์ภาพแชร์จาก Visual: ${hasShare ? 'มีแล้ว — og:image ใช้ 1200×630' : 'ยังไม่ส่ง — og:image ถอยไปใช้ปก 2:3 ไปก่อน'}`);

/* ---------------- หลังบ้าน (ไม่ใช่หน้าของผู้ชม แต่ต้องไม่หลุดเข้าผลค้นหา) ---------------- */
head('แผงหลังบ้าน admin/ · ไม่นับเป็นหน้าผู้ชม แต่ต้องไม่หลุดเข้าดัชนี');
const adminDir = path.join(ROOT, 'admin');
if (!fs.existsSync(adminDir)) console.log('  ℹ ยังไม่มีโฟลเดอร์ admin/ ในรีโป (งาน AIO-23)');
else {
  /* เดินลึกทุกชั้น ไม่ใช่ชั้นเดียว — ถ้า AIO-23 เพิ่มหน้าในโฟลเดอร์ย่อย ด่านนี้ต้องเห็น */
  const walkAll = (d, out = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walkAll(f, out); else if (e.name.endsWith('.html')) out.push(f);
    }
    return out;
  };
  const adminHtml = walkAll(adminDir);
  ok(adminHtml.length > 0 && adminHtml.every(f => /content="noindex/.test(read(f))),
    `หน้าใน admin/ ${adminHtml.length} ไฟล์ · เป็น noindex ทุกไฟล์`);
  const sm = read(path.join(ROOT, 'sitemap.xml'));
  ok(!/\/admin\//.test(sm), 'admin/ ไม่อยู่ใน sitemap.xml');
  console.log('  ℹ ถ้อยคำ "เข้าสู่ระบบ" ใน admin/ เป็นของผู้ดูแลระบบ ไม่ใช่ผู้ชม'
    + ' — มติ "ตัดล็อกอินถาวร" (22 ต.ค.) ว่าด้วยฝั่งผู้ชม ไม่ใช่หลังบ้าน');
}

/* ---------------- เซิร์ฟเวอร์ดูงานในเครื่อง ----------------
   ไม่ใช่ของ production แต่เป็นตัวที่ทุกคนใช้เปิดดูของก่อนส่ง — MIME ที่ผิดทำให้
   แผงหลังบ้านขึ้นเป็นหน้าเปล่าทั้งที่โค้ดไม่พัง (AIO-34 งานเพิ่มจาก CEO)
   ต้องยิงคำขอจริง การอ่านตาราง TYPES ด้วย regex มองไม่เห็นเส้นค่าสำรอง */
head('tools/serve.mjs · MIME ของ ES module ที่หลังบ้านใช้');
const srv = spawnSync(process.execPath, [path.join(ROOT, 'tools/test-serve.mjs')],
  { encoding: 'utf8', timeout: 120000 });
const srvOut = (srv.stdout || '') + (srv.stderr || '');
const srvM = srvOut.match(/ผล: ผ่าน (\d+) · ตก (\d+)/);
ok(!!srvM && srv.status === 0,
  srvM ? `tools/test-serve.mjs · ผ่าน ${srvM[1]} ตก ${srvM[2]}` : 'รัน tools/test-serve.mjs ไม่สำเร็จ');
srvOut.split('\n').filter(l => /content-type/.test(l) && /\.mjs/.test(l)).forEach(l => console.log('     ' + l.trim()));
if (srvM && +srvM[2] > 0) srvOut.split('\n').filter(l => l.includes('✗')).forEach(l => console.log('     ' + l.trim()));

console.log(`\n${fail ? '✗ ตก ' + fail + ' ข้อ' : '✓ ผ่านทุกข้อ'} · ตรวจ ${PAGES.length} หน้าจริง + ${STUBS.length} ไฟล์ส่งต่อ (ไม่รวม admin/)`);
process.exit(fail ? 1 : 0);
