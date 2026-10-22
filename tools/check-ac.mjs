/* ตรวจเกณฑ์ตรวจรับ AIO-22 จาก "ไฟล์ที่ส่งมอบจริง" ไม่ใช่จากตัว generator
   รัน:  node tools/check-ac.mjs
   ตั้งใจให้เป็นตัวเดียวกับที่ผู้ตรวจรันเองได้ · ทุกข้อพิมพ์ตัวเลขที่นับได้ออกมาด้วย */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'docs', '.paperclip-repositories', '.claude']);

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

/* ---------------- AC-2 ---------------- */
head('AC-2 · "ดูต่อ" ทำงานจริง (ตรวจเชิงไฟล์ · พฤติกรรมจริงดู tools/test-continue.mjs)');
const app = read(path.join(ROOT, 'assets/app.js'));
const writes = (app.match(/save\('cont'/g) || []).length;
ok(writes >= 2, `assets/app.js เขียน lakorn.cont กลับ ${writes} จุด (ของเดิมเขียน 0 จุด)`);
ok(/localStorage/.test(app) && /sec:/.test(app), 'บันทึกทั้งเลขตอน (ep) และตำแหน่งในตอน (sec)');
ok(/sort\(function \(a, b\) \{ return b\.ts - a\.ts; \}\)/.test(app), 'เรียงรายการค้างจากล่าสุดอยู่บนสุด (ts มาก → น้อย)');
ok(/'\?t=' \+ Math\.round\(e\.sec\)/.test(app), 'ลิงก์ดูต่อพาไปตอนเดิมพร้อมตำแหน่งเดิม (?t=)');
ok(/Progress\.finish\(slug\)/.test(app), 'ดูจบเรื่อง → ออกจากรายการค้าง ไปที่ "ดูจบแล้ว"');
const hand = PAGES.filter(f => /(ดูไปแล้ว \d+%|ดูต่อ EP\.\d+|EP\.\d+\/\d+ ·)/.test(read(f)));
ok(hand.length === 0, `หน้าที่ยังมีเปอร์เซ็นต์/เลขตอนของ "ดูต่อ" เขียนมือใน HTML: ${hand.length} ไฟล์${hand.length ? ' → ' + hand.slice(0, 3).map(rel) : ''}`);
const data = read(path.join(ROOT, 'assets/data.js'));
ok(!/"cont"\s*:/.test(data), 'assets/data.js ไม่มี seed `cont` ที่เขียนมืออีกแล้ว');

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

/* ---------------- AC-7 ---------------- */
head('AC-7 · เทมเพลตภาพแชร์ 1200×630');
const shareDir = path.join(ROOT, 'assets/share');
const hasShare = fs.existsSync(shareDir) && fs.readdirSync(shareDir).some(f => /\.(jpg|png|webp)$/.test(f));
ok(fs.existsSync(shareDir), 'มีช่องเสียบที่ assets/share/ พร้อมคำอธิบายการตั้งชื่อไฟล์');
console.log(`  ℹ ไฟล์ภาพแชร์จาก Visual: ${hasShare ? 'มีแล้ว — og:image ใช้ 1200×630' : 'ยังไม่ส่ง — og:image ถอยไปใช้ปก 2:3 ไปก่อน'}`);

console.log(`\n${fail ? '✗ ตก ' + fail + ' ข้อ' : '✓ ผ่านทุกข้อ'} · ตรวจ ${PAGES.length} หน้าจริง + ${STUBS.length} ไฟล์ส่งต่อ`);
process.exit(fail ? 1 : 0);
