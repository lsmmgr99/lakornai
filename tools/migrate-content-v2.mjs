/* เครื่องมือย้ายข้อมูลครั้งเดียว — assets/data.js รูปแบบ v1 → v2  (AIO-22)
   ⚠️ ปลายทางคือ assets/data.js = ชุดข้อมูลตั้งต้นของ "ชั้นออกแบบ" (design/v2/lib.mjs อ่าน)
      ไม่ใช่ข้อมูลรันไทม์ของเว็บจริง ซึ่งคือ assets/content.js ที่ build/build.mjs สร้างทุกครั้ง
   รัน:  node tools/migrate-content-v2.mjs
   เก็บไว้ในรีโปเพื่อให้ตรวจย้อนได้ว่าข้อมูลใหม่มาจากไหน ไม่ได้พิมพ์ขึ้นเอง

   สิ่งที่เปลี่ยน
   1. ตัดธงล็อกตอน (ค่าที่ 3 ของทุก episode) ออกทั้ง 418 ตอน  — AC-3
   2. ตัด seed `cont` ที่เขียนมือออกทั้งก้อน — ความคืบหน้าอ่าน/เขียนที่ localStorage เท่านั้น (AC-2)
      (`following` คงไว้เฉพาะเพื่อให้ generator ม็อกอัพของ Visual รันได้เท่าเดิม เว็บจริงไม่อ่าน)
   3. ดึง `synopsis` / `airtime` / `views` ของจริงจาก series/*.html เดิมเข้ามาเก็บในข้อมูล
   4. เพิ่ม `tropes[]` ต่อเรื่อง ตามผลยืนยันของ Research (AIO-20 §1/§4)
   5. เพิ่มคำอธิบายแนว (`intro`) ให้ 6 หมวด — ปิดช่องว่าง thin content ที่ SEO ชี้ (AIO-19 §9.3)
   6. ไม่ย้ายคะแนน `★ 9.2` มาด้วย — ไม่มีระบบรับคะแนนจริง (AIO-19 C-02)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = p => path.join(ROOT, p);

/* ---------- อ่านของเดิม ---------- */
const win = {};
new Function('window', fs.readFileSync(R('assets/data.js'), 'utf8'))(win);
const OLD = win.LAKORN;

/* ---------- ดึง synopsis / airtime / views จากหน้า series เดิม ----------
   หน้าเก่าถูกแทนที่ด้วย redirect stub ไปแล้วหลัง AIO-22 สคริปต์นี้จึงรับได้สองทาง:
   ถ้ายังอ่านจากไฟล์เก่าได้ก็ดึงจากไฟล์ · ถ้าไม่ได้ ใช้ค่าที่อยู่ใน data.js ปัจจุบัน
   (ทำให้รันซ้ำได้ตลอด และยังตรวจย้อนได้ว่าค่าตั้งต้นมาจากไหน) */
const extra = {};
for (const s0 of OLD.series) {
  if (s0.synopsis) extra[s0.slug] = { synopsis: s0.synopsis, airtime: s0.airtime, views: s0.views };
}
for (const f of fs.readdirSync(R('series')).filter(x => x.endsWith('.html'))) {
  const slug = f.replace(/\.html$/, '');
  const html = fs.readFileSync(R(`series/${f}`), 'utf8');
  if (!/<p class="syn">/.test(html)) continue;   // เป็น redirect stub ไม่ใช่หน้าเดิม
  const syn = (html.match(/<p class="syn">([\s\S]*?)<\/p>/) || [])[1] || '';
  const facts = (html.match(/<div class="facts">([\s\S]*?)<\/div>/) || [])[1] || '';
  const cells = facts.split(/<\/span>/).map(x => x.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  // cells = ["24 ตอน", "ตอนใหม่ทุกวัน", "ทุกวัน 20:00", "★ 9.2", "2.4 ล้าน วิว"]
  const airtime = cells.find(c => /\d{1,2}:\d{2}$/.test(c)) || '';
  const viewsCell = cells.find(c => c.endsWith(' วิว')) || '';
  extra[slug] = {
    synopsis: syn.replace(/\s+/g, ' ').trim(),
    airtime,
    views: viewsCell.replace(/\s*วิว$/, '').trim(),
  };
}

/* ---------- tropes: ผลยืนยันของ Research AIO-20 ----------
   ตารางแมปอยู่ใน AIO-20 §1 · จำนวนต่อแท็กตรวจซ้ำได้ที่ §4
   ชื่อแท็กใช้ตามที่ Research เสนอใน §3 (ตัดคำว่า "สาสม" ที่ไม่มีใครค้น) */
const TROPES = [
  { slug: 'revenge-karma', label: 'แก้แค้น', items: ['durian-revenge', 'billion-widow', 'undercover-tycoon', 'heir-returns'] },
  { slug: 'comeback', label: 'กลับมาเอาคืน', items: ['durian-revenge', 'undercover-tycoon', 'heir-returns', 'seedless-longan'] },
  { slug: 'inheritance', label: 'แย่งมรดก-ทายาทตระกูลดัง', items: ['billion-widow', 'heir-returns', 'one-night-bangkok'] },
  { slug: 'fruit-drama', label: 'ละครผลไม้', items: ['durian-revenge', 'seedless-longan', 'mangosteen-heart'] },
  { slug: 'hidden-identity', label: 'ซ่อนตัวตน', items: ['undercover-tycoon', 'one-night-bangkok'] },
  { slug: 'ghost', label: 'ผี', items: ['mirror-bride', 'house-13'] },
  { slug: 'cross-class-love', label: 'รักข้ามฐานะ', items: ['ceo-cold', 'one-night-bangkok'] },
  { slug: 'boss-secretary', label: 'ประธานเย็นชา-เจ้านายกับเลขา', items: ['ceo-cold'] },
  { slug: 'reborn-novel', label: 'ข้ามภพเข้าไปในนิยาย', items: ['villainess-reborn'] },
  { slug: 'period', label: 'ย้อนยุค', items: ['ayutthaya-love'] },
  { slug: 'forbidden-love', label: 'รักต้องห้าม-สองบ้านเป็นศัตรู', items: ['mangosteen-heart'] },
  { slug: 'bullied', label: 'ถูกแกล้ง-ถูกดูถูก', items: ['seedless-longan'] },
  { slug: 'murder-mystery', label: 'ปมฆาตกรรม', items: ['billion-widow'] },
];

/* ---------- คำอธิบายแนว ----------
   AIO-19 §9.3 ระบุว่าหน้าแนวไม่มีย่อหน้าอธิบายเลย = thin content โดยโครงสร้าง
   ข้อความด้านล่างเขียนจากข้อเท็จจริงในคลังจริง (จำนวนเรื่อง · ชื่อเรื่อง · hook)
   ⚠️ เป็นข้อความที่ dev เขียน รอฝ่ายคอนเทนต์ตรวจ */
const GENRE_INTRO = {
  vertical: 'ละครแนวตั้งคือละครที่ถ่ายและตัดมาให้ดูบนมือถือโดยเฉพาะ จอเต็มแนวตั้ง ตอนละไม่เกิน 3 นาที และจบความทุกตอน ในคลังของ LakornAI หมวดนี้เป็นหมวดที่ใหญ่ที่สุด รวมทั้งเรื่องออฟฟิศอย่างประธานเย็นชากับเลขาตัวแสบ ไปจนถึงเรื่องข้ามภพอย่างข้ามภพมาเป็นนางร้าย ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
  fruit: 'ละครผลไม้ AI เป็นแนวที่ LakornAI สร้างขึ้นเอง ตัวละครทุกตัวเป็นผลไม้ไทยที่มีชื่อ มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น ตั้งแต่ทุเรียนที่ถูกโค่นทิ้งกลางสวน ลำไยลูกเดียวที่ไม่มีเมล็ด ไปจนถึงมังคุดที่ตกหลุมรักคนบ้านศัตรู เป็นหมวดที่ดูจบง่ายที่สุดในคลังและเป็นหมวดที่คนจำเราได้',
  western: 'ละครฝรั่งของ LakornAI คือเรื่องที่ตัวละครและฉากเป็นสากล แต่บทและการพากย์เป็นไทยทั้งหมด หมวดนี้รวมเรื่องทายาทตระกูลดัง มาเฟีย และรักข้ามชนชั้น ที่เดินเรื่องเร็วแบบละครสั้น ไม่ต้องรอตอนยาว ดูฟรีทุกตอนตั้งแต่ตอนแรกถึงตอนจบ',
  horror: 'ละครสยองขวัญของเราเล่นกับความกลัวแบบไทย ๆ ที่คนไทยรู้จักดี ผีที่สิงอยู่ในของ บ้านเช่าราคาถูกผิดปกติ และซอยที่ไม่มีเลขบ้าน ตอนสั้นทำให้ความกลัวมาเร็วและไม่ยืดเยื้อ เหมาะกับการดูกลางคืนแบบรวดเดียวจบ ทุกตอนดูฟรี ไม่ต้องสมัครสมาชิก',
  timetravel: 'ละครย้อนเวลาและข้ามภพคือหมวดที่ตัวละครได้โอกาสครั้งที่สอง ไม่ว่าจะเป็นนักโบราณคดีที่ตื่นมาในปี พ.ศ. 2310 หรือคนอ่านนิยายที่ตื่นมาเป็นนางร้ายซึ่งรู้ล่วงหน้าว่าตัวเองจะตายตอนไหน หมวดนี้เดินเรื่องด้วยคำถามเดียวคือ รู้อนาคตแล้วจะเปลี่ยนมันได้ไหม',
  revenge: 'ละครแก้แค้นคือหมวดที่คนดูละครสั้นไทยค้นหามากที่สุด สูตรของมันตรงไปตรงมา ถูกหักหลังจนหมดตัว หายไปพักหนึ่ง แล้วกลับมาทวงคืนทีละอย่าง ในคลังของเรามีทั้งแบบสวนผลไม้ แบบออฟฟิศ และแบบตระกูลมหาเศรษฐี ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
};

/* ---------- ประกอบข้อมูลใหม่ ---------- */
const out = {
  genres: OLD.genres.map(g => ({ ...g, intro: GENRE_INTRO[g.slug] || g.intro || '' })),
  tropes: TROPES,
  subs: OLD.subs,
  /* ⚠️ ใช้โดย generator ม็อกอัพ design/v2/pages-discovery.mjs:826 เท่านั้น
     เว็บจริงไม่อ่านค่านี้เลย — รายการติดตามของผู้ใช้อยู่ที่ localStorage `lakorn.follows`
     คงไว้เพื่อให้ generator ของ Visual รันแล้วได้ผลเท่าเดิม (ห้ามแก้ไฟล์ใต้ design/v2/) */
  following: OLD.following || ['villainess-reborn', 'durian-revenge', 'ayutthaya-love', 'undercover-tycoon', 'mangosteen-heart'],
  series: OLD.series.map(s => ({
    slug: s.slug,
    title: s.title,
    genres: s.genres,
    tropes: TROPES.filter(t => t.items.includes(s.slug)).map(t => t.slug),
    eps: s.eps,
    status: s.status,
    airtime: extra[s.slug].airtime,
    views: extra[s.slug].views,
    c1: s.c1,
    c2: s.c2,
    cast: s.cast,
    hook: s.hook,
    synopsis: extra[s.slug].synopsis,
    /* ตัดค่าที่ 3 (ธงล็อก) ออก — เหลือ [ชื่อตอน, ความยาว] */
    episodes: s.episodes.map(e => [e[0], e[1]]),
  })),
};

/* ---------- ยามกันพลาด ---------- */
const errs = [];
if (out.series.length !== 12) errs.push(`series ${out.series.length} ≠ 12`);
const totalEps = out.series.reduce((a, s) => a + s.eps, 0);
if (totalEps !== 418) errs.push(`รวมตอน ${totalEps} ≠ 418`);
for (const s of out.series) {
  if (s.episodes.length !== s.eps) errs.push(`${s.slug}: episodes ${s.episodes.length} ≠ eps ${s.eps}`);
  if (s.episodes.some(e => e.length !== 2)) errs.push(`${s.slug}: ยังมี episode ที่ไม่ใช่ 2 ช่อง`);
  if (!s.synopsis) errs.push(`${s.slug}: ไม่มี synopsis`);
  if (!s.views) errs.push(`${s.slug}: ไม่มี views`);
}
for (const t of TROPES) for (const k of t.items) {
  if (!out.series.some(s => s.slug === k)) errs.push(`trope ${t.slug}: ไม่รู้จักเรื่อง ${k}`);
}
if (errs.length) { console.error('✗ ' + errs.join('\n✗ ')); process.exit(1); }

const head = `/* LakornAI — ข้อมูลคอนเทนต์ (v2)
   สร้างโดย tools/migrate-content-v2.mjs · AIO-22
   ไม่มีธงล็อกตอน ไม่มี seed ความคืบหน้าการดู — ความคืบหน้าทั้งหมดอ่าน/เขียนที่ localStorage
   ยอดวิว (views) เป็นตัวเลขตัวอย่าง โชว์ในหน้าได้ แต่ห้ามส่งเข้า structured data */
`;
fs.writeFileSync(R('assets/data.js'), head + 'window.LAKORN = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`✓ เขียน assets/data.js ใหม่ · ${out.series.length} เรื่อง · ${totalEps} ตอน · ${TROPES.length} แท็ก`);
