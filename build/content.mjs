/* ชั้นข้อมูลของ generator ตัวจริง (AIO-22)
   แหล่งความจริงคือ `content.json` ที่ราก (ADR-001 §6) · ถ้ายังไม่มีไฟล์นั้น
   ถอยไปอ่าน `assets/data.js` ซึ่งเป็นชุดข้อมูลตัวอย่างของชั้นออกแบบ (ดู fromDataJs)

   ⚠️ `assets/data.js` เป็นของชั้นออกแบบ ไม่ใช่ข้อมูลรันไทม์ของเว็บจริง
      `design/v2/lib.mjs:10` อ่านไฟล์นี้เพื่อสร้างม็อกอัพที่ลูกค้าอนุมัติ
      build จึง **ห้ามเขียนทับไฟล์นี้** — ข้อมูลรันไทม์ของเว็บจริงไปอยู่ที่ assets/content.js
      (ด่านตรวจ: tools/check-mockup.mjs รันเจนเนอเรเตอร์ของม็อกอัพในสำเนาแยกแล้วเทียบไฟล์) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(DIR, '..');

/* ---------- ADR-001 §6: content.json ----------
   หลังบ้าน (AIO-23) เป็นคนผลิตไฟล์นี้ หน้าบ้านเป็นคนบริโภค
   วันนี้ยังไม่มีไฟล์ → ถอยไปอ่าน assets/data.js ตามที่โจทย์สั่ง ("ไม่ต้องรอ schema")
   วันที่ไฟล์มา ให้วางที่ราก แล้ว build ใหม่ — ไม่ต้องแก้หน้าใดเลย */
const KNOWN_VERSIONS = [1];

/* วันออกตอนเก็บเป็น enum ของสัญญา (ADR-001 §6.3.1) ทุกชั้นภายใน — ฟิลด์ `day`
   ข้อความไทยเป็น "ผลลัพธ์ปลายทาง" เท่านั้น ห้ามถอดวันกลับจากข้อความ
   (เส้นทาง ข้อมูล → ข้อความ → ถอดกลับเป็นข้อมูล คือต้นเหตุที่ ADR §6.3.1 เตือนไว้:
    วันที่ตารางถอดกลับขาดคีย์ เรื่องจะหลุดไปอยู่ใต้ "จบแล้ว" เงียบ ๆ โดยไม่มี error) */
/* ชื่อวันล้วน ใช้จัดกลุ่มในหน้าตารางออกตอน */
const DAY_TH = { daily: 'ทุกวัน', mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ', thu: 'พฤหัสบดี', fri: 'ศุกร์', sat: 'เสาร์', sun: 'อาทิตย์' };
/* วลีรอบปล่อยตอน — `daily` คือ "ทุกวัน" อยู่แล้ว ห้ามเติม "ทุก" ซ้ำเป็น "ทุกทุกวัน" */
const cadenceTH = day => (day === 'daily' ? 'ทุกวัน' : 'ทุก' + DAY_TH[day]);
const statusText = day => (day ? 'ตอนใหม่' + cadenceTH(day) : 'จบแล้ว');
const airtimeText = day => (day ? cadenceTH(day) : '');
const DAY_ENUM = Object.fromEntries(Object.keys(DAY_TH).map(k => [cadenceTH(k), k]));

/* enum → ฟิลด์ที่ทุกหน้าใช้ · ค่าที่ไม่รู้จักต้องล้ม build ไม่ใช่กลายเป็น null เงียบ ๆ */
function dayOf(slug, releaseDay, ended) {
  if (ended) return null;
  if (!releaseDay || !DAY_TH[releaseDay]) {
    throw new Error(`${slug}: releaseDay = ${JSON.stringify(releaseDay)} ไม่อยู่ในชุดที่รู้จัก `
      + `(${Object.keys(DAY_TH).join(',')}) — เรื่องที่ยังออกตอนต้องระบุวัน (ADR-001 §6.3.1)`);
  }
  return releaseDay;
}
const mmss = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
/* ยอดวิวเป็นจำนวนเต็มในสัญญา (§6.3) — แปลงเป็นข้อความไทยที่ปลายทางเท่านั้น
   `null` ต้องคืน `null` ไม่ใช่สตริงว่าง: สตริงว่างคือป้ายกำพร้าที่ C1 ห้าม */
const thViews = n => n == null ? null
  : (n >= 1e6 ? (n / 1e6).toFixed(1) + ' ล้าน' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));

/* ---------- ฟิลด์บังคับ vs ฟิลด์ที่ไม่บังคับ ----------
   รีวิวด่าน 1 รอบ 2 ชี้ถูกว่า `dayOf()` ล้มดังแล้ว แต่ `intro`/`subs`/`views` ยังใช้ `||`
   กลบเงียบ ๆ จนกลายเป็นช่องว่างในหน้าที่เปิดให้ Google เก็บ · จึงแยกให้ชัดตรงนี้:

   บังคับ (หายแล้ว build ล้มพร้อมชื่อเรื่องและชื่อฟิลด์)
     slug · title · hook · synopsis · genres · eps · episodes[] · releaseDay/status
   ไม่บังคับจริง (หายแล้ว "ไม่ render ส่วนนั้นเลย" ไม่ใช่ render เป็นช่องว่าง)
     views  → `null` ⇒ ไม่มีบรรทัด/ป้ายยอดวิวในหน้าใดเลย (ADR-001 §12.2 C1 · กฎ V12)
     tropes → `[]`   ⇒ ไม่มีชิปแท็ก (ADR-001 §6.5 ข้อ 2)
     cover  → ถอยไปใช้พาธตามแบบแผน
   ไม่อยู่ในสัญญาและไม่อยู่ในรูปข้อมูลของเว็บจริงเลย
     subs · following · cont — ดู §6.6/V9 และหมายเหตุที่ท้ายไฟล์นี้ */
const REQUIRED_SERIES = ['slug', 'title', 'hook', 'synopsis', 'genres', 'eps', 'episodes'];
function requireFields(s) {
  for (const k of REQUIRED_SERIES) {
    const v = s[k];
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    if (empty) {
      throw new Error(`${s.slug || '(ไม่มี slug)'}: ขาดฟิลด์บังคับ "${k}" `
        + `(= ${JSON.stringify(v)}) — ฟิลด์นี้ถูกใช้ในหน้าที่เปิดให้ Google เก็บ `
        + `จึงห้ามกลายเป็นค่าว่างเงียบ ๆ (ADR-001 §6.3)`);
    }
  }
  if (s.eps !== s.episodes.length) {
    throw new Error(`${s.slug}: eps = ${s.eps} แต่ episodes มี ${s.episodes.length} รายการ — `
      + `สองค่านี้ต้องตรงกัน (สมมติฐานของ assets/app.js ที่รีวิวด่าน 1 ชี้ไว้)`);
  }
}

/* V10 ฝั่ง build: `meta.viewsSource` กับฟิลด์ `views` ต้องตรงกันเสมอ
   แยกจากกันได้คือช่องที่ "เลขตัวอย่าง" จะเล็ดลอดเข้ามาเป็นคำกล่าวอ้าง (ADR-001 §12.2 ข A5) */
function checkViewsSource(src, series) {
  const withViews = series.filter(s => s.views != null).length;
  if (src === 'none' && withViews) {
    throw new Error(`meta.viewsSource = "none" แต่มี views ที่ไม่ใช่ null ${withViews} เรื่อง — `
      + `ขัดกฎ V10 (ADR-001 §6.4)`);
  }
  if (src !== 'none' && withViews !== series.length) {
    throw new Error(`meta.viewsSource = ${JSON.stringify(src)} แต่มี views ครบแค่ `
      + `${withViews}/${series.length} เรื่อง — ขัดกฎ V10 ต้องครบทุกเรื่องใน commit เดียวกัน`);
  }
}

function fromContentJson(j) {
  if (!KNOWN_VERSIONS.includes(j.version)) {
    throw new Error(`content.json version ${j.version} — generator นี้รู้จักแค่ ${KNOWN_VERSIONS.join(',')} (ADR-001 กฎ V1)`);
  }
  const viewsSource = (j.meta || {}).viewsSource || 'none';
  checkViewsSource(viewsSource, j.series);
  return {
    viewsSource,
    /* `intro` ไม่อยู่ในสัญญา §6 — ข้อความนำของหน้าแนวเป็นคอนเทนต์ของ generator
       (อยู่ชุดเดียวกับ title/description/h1 ที่ GENRE_SEO) · ถ้าวันหน้าสัญญาเพิ่มฟิลด์นี้
       ค่าจาก content.json จะทับค่าในโค้ดให้เอง · `null` = "ยังไม่มีจากข้อมูล" ไม่ใช่ "ว่าง" */
    genres: j.genres.map(g => ({ ...g, intro: g.intro || null })),
    tropes: (j.tropes || []).map(t => ({
      ...t,
      items: t.items || j.series.filter(s => (s.tropes || []).includes(t.slug)).map(s => s.slug),
    })),
    series: j.series.map(s => {
      requireFields(s);
      const day = dayOf(s.slug, s.releaseDay, s.status === 'ended');
      return {
      slug: s.slug, title: s.title, genres: s.genres, tropes: s.tropes || [], eps: s.eps,
      day: day, status: statusText(day), airtime: airtimeText(day),
      views: thViews(s.views),
      c1: (s.theme || {}).c1 || '#2a2733', c2: (s.theme || {}).c2 || '#4a4556',
      cast: s.cast || [], hook: s.hook, synopsis: s.synopsis,
      cover: s.cover || `assets/covers/${s.slug}.webp`,
      episodes: s.episodes.map(e => [e.title, mmss(e.durationSec)]),
      };
    }),
  };
}

/* ชั้นแปลงของเก่า: assets/data.js เก็บวันออกตอนเป็นข้อความไทยอยู่แล้ว
   จุดนี้เป็นที่เดียวที่อ่านข้อความแล้วได้ enum กลับ และถ้าอ่านไม่ออกต้องล้ม ไม่ใช่เงียบ

   ไฟล์นี้เป็น "ชุดข้อมูลตัวอย่างของชั้นออกแบบ" (design/v2/lib.mjs อ่านมันอยู่)
   จึงมีของที่ห้ามไหลเข้าเว็บจริง 3 อย่าง — ตัดทิ้งที่นี่ทางเดียว ไม่ให้เลือกได้:
     views (สตริงไทยตัวอย่าง) → ตัด · ADR-001 §7.1 ห้ามเอาเลขตัวอย่างมาเป็นคำกล่าวอ้าง
                                 และ §12.2 ค ชี้ชัดว่า data.js คือแหล่งที่จะเล็ดลอดเข้ามา
     following / cont          → ตัด · §6.6 + กฎ V9 (ของผู้ใช้อยู่ที่ localStorage)
     subs (ซับไตเติลสมมติ)     → ตัด · ยังไม่มีไฟล์วิดีโอและไม่มีไฟล์ซับในสัญญา */
function fromDataJs(d) {
  const series = d.series.map(s => {
    requireFields(s);
    const ended = s.status === 'จบแล้ว';
    const th = String(s.status).replace(/^ตอนใหม่/, '');
    const day = ended ? null : DAY_ENUM[th];
    if (!ended && !day) {
      throw new Error(`${s.slug}: assets/data.js มี status = ${JSON.stringify(s.status)} `
        + `ซึ่งถอดวันออกตอนไม่ได้ — ต้องเป็น "จบแล้ว" หรือ "ตอนใหม่ทุก<วัน>"`);
    }
    return { ...s, day: day, status: statusText(day), airtime: airtimeText(day), views: null };
  });
  return {
    viewsSource: 'none',
    genres: d.genres.map(g => ({ slug: g.slug, label: g.label, intro: g.intro || null })),
    tropes: d.tropes || [],
    series,
  };
}

function load() {
  const cj = path.join(ROOT, 'content.json');
  if (fs.existsSync(cj)) return fromContentJson(JSON.parse(fs.readFileSync(cj, 'utf8')));
  const win = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'assets/data.js'), 'utf8'))(win);
  return fromDataJs(win.LAKORN);
}
export const D = load();
/* ที่มาของยอดวิว — ทุกหน้าที่คิดจะโชว์ยอดวิวต้องถามค่านี้ ไม่ใช่เดาจาก `s.views` ว่าง
   `'none'` = ยังไม่มีระบบวัด ⇒ ห้ามแสดงยอดวิว ห้ามอ้างว่าอันดับมาจากการวัด (V12/V13) */
export const VIEWS_SOURCE = D.viewsSource;
export const HAS_VIEWS = VIEWS_SOURCE !== 'none';

export const SERIES = D.series;
export const BY = Object.fromEntries(SERIES.map(s => [s.slug, s]));
export const genreLabel = slug => (D.genres.find(g => g.slug === slug) || {}).label || slug;
export const genreOf = slug => D.genres.find(g => g.slug === slug);
export const seriesOfGenre = g => SERIES.filter(s => s.genres.includes(g));
export const tropeOf = slug => D.tropes.find(t => t.slug === slug);
export const tropesOf = s => (s.tropes || []).map(tropeOf).filter(Boolean);

/* ---------- ปกของไทล์ "เลือกตามแนว" (AIO-54 เฟส 2) ----------
   ของเดิมหยิบ `seriesOfGenre(g)[0]` ตรง ๆ ⇒ `durian-revenge` เป็นเรื่องแรกของทั้ง `fruit`
   และ `revenge` ⇒ ไทล์ "ละครผลไม้ AI" กับ "แก้แค้น" ได้ปกใบเดียวกัน · ตอนไทล์เป็นแถบนอน
   ที่หรี่รูปไว้ 55% แทบไม่มีใครเห็น แต่ไทล์แนวตั้ง 2:3 ที่ความสว่าง 80% มันคือปกเต็มใบ

   นี่คือการจับคู่สองฝั่ง (แนว ↔ เรื่อง) ที่ต้องการคู่มากที่สุด ⇒ Kuhn (เส้นทางสลับ)
   ไม่ใช่ greedy · greedy ล้มกับชุดข้อมูลนี้จริง: ถ้า `fruit` ยึด durian-revenge ไปก่อน
   `revenge` จะเจอว่าถูกจองแล้วและต้องยอมซ้ำ — Kuhn ย้อนไปบอก `fruit` ให้เปลี่ยนไปใช้
   ปกใบอื่นแล้วปล่อย durian-revenge ให้ `revenge`
   อัลกอริทึม ลำดับการเลือก และผลลัพธ์ ตรงกับ design/v2/lib.mjs:46-80 ของ Visual (AIO-53)
   ⇒ ม็อกอัพกับเว็บจริงได้ปกชุดเดียวกัน ไม่ใช่สองชุดที่เผอิญดูคล้ายกัน
   ไม่มีรายชื่อเรื่องฝังตาย ไม่สุ่ม ไม่ขึ้นกับเวลา ⇒ เพิ่มเรื่องที่ 13 หรือแนวที่ 7 แล้วยังถูก */
export function genreCovers() {
  const cand = new Map(D.genres.map(g => [g.slug, seriesOfGenre(g.slug)]));
  /* แนวที่มีตัวเลือกน้อยสุดเลือกก่อน แล้วตัดเสมอด้วยลำดับในข้อมูล (ไม่ใช่ตามตัวอักษร) */
  const order = D.genres.map((g, i) => [g.slug, i])
    .sort((a, b) => cand.get(a[0]).length - cand.get(b[0]).length || a[1] - b[1])
    .map(x => x[0]);
  const owner = new Map();                 /* slug เรื่อง → slug แนวที่ถือปกใบนั้น */
  /* seen = เรื่องที่สายการค้นนี้แตะแล้ว — กันวนไม่จบเมื่อสองแนวสลับกันไปมา */
  const claim = (gs, seen) => {
    for (const s of cand.get(gs)) {
      if (seen.has(s.slug)) continue;
      seen.add(s.slug);
      /* อ่านเจ้าของเดิมก่อนทับ: ให้เจ้าของเดิมไปหาปกใบอื่นให้ได้ก่อน แล้วจึงยึดใบนี้ */
      if (!owner.has(s.slug) || claim(owner.get(s.slug), seen)) { owner.set(s.slug, gs); return true; }
    }
    return false;
  };
  for (const gs of order) claim(gs, new Set());
  const pick = new Map();
  for (const [sSlug, gSlug] of owner) pick.set(gSlug, BY[sSlug]);
  /* เหลือแนวที่จับคู่ไม่ได้ได้ในกรณีเดียว: คลังมีเรื่องน้อยกว่าจำนวนแนว
     กรณีนั้นไทล์ว่างแย่กว่าปกซ้ำ ⇒ ถอยไปใช้เรื่องแรกของแนว (วันนี้ไม่มีแนวไหนเข้าเคสนี้)
     ด่าน tools/test-layout.mjs ส่วน 5 จับ "ปกซ้ำ" เสมอ จึงจะเห็นทันทีถ้าวันหน้าเข้าเคสนี้ */
  for (const g of D.genres) if (!pick.has(g.slug)) pick.set(g.slug, cand.get(g.slug)[0] || null);
  return pick;
}
/* คิดครั้งเดียวต่อ build — ฟังก์ชันไม่สุ่ม เรียกซ้ำก็ได้ผลเดิม แต่สองที่ที่ใช้ต้องไม่หลุดจากกัน */
export const GENRE_COVER = genreCovers();

/* ---------- แท็ก (facet) ที่ "เปิดเป็นหน้าได้" ----------
   เกณฑ์ 2 ข้อ ไม่ใช่ข้อเดียว:
   1) UX §2.1 — ต้องมี ≥3 เรื่อง ไม่งั้นได้หน้าโหลงเหลง
   2) SEO AIO-19 §9.1 — ถ้าชุดเรื่องซ้อนกับหมวดใดเกิน 80% จะเป็นหน้าซ้ำ ห้ามเปิด
   ผลวันนี้ (คลัง 12 เรื่อง): `แก้แค้น` และ `ละครผลไม้` ตกข้อ 2 (ซ้อนหมวด 100%)
   ⇒ trope ล้วนผ่านแค่ 2 ตัว ตั้งแถว chip ไม่ได้ (AIO-20 ยืนยันตัวเลขทุกตัวแล้ว)
   แท็กที่ตกเก็บไว้ในข้อมูล จะโผล่เป็นหน้าเองเมื่อคลังโตพอ ไม่ต้องแก้โค้ด

   ค่าคงที่สองตัวข้างล่างคือด่าน · AIO-33 เติม facet เข้าด่านเดิมโดยไม่ลดเกณฑ์
   (ลด TAG_MIN_ITEMS หรือดัน TAG_MAX_GENRE_OVERLAP ขึ้น = รื้อด่าน ไม่ใช่เพิ่มแท็ก) */
export const TAG_MIN_ITEMS = 3;
export const TAG_MAX_GENRE_OVERLAP = 0.8;

/* ---------- facet ที่ไม่ใช่ trope — ประกาศที่เดียวตรงนี้ (AIO-33) ----------
   ลูกค้าเลือกทาง (ข) "chip ผสม" เมื่อ 23 ต.ค. 2026 หลัง Research AIO-20 ชี้ว่า
   trope ล้วนไม่พอตั้งแถว · ชั้นที่สองซ้อนบนหมวดจึงไม่ได้มีแค่ปมเรื่อง
   แต่รวม "สถานะออกตอน" กับ "ความยาว" ซึ่งเป็นสองเกณฑ์ที่คนเลือกเรื่องในคลังใช้จริง
   และไม่ใช่การพูดซ้ำกับหมวด (ต่างจาก `แก้แค้น`/`ละครผลไม้` ที่ซ้อนหมวดเต็ม 100%)

   ⚠️ แต่ละตัวบอกได้แค่ "เรื่องไหนเข้าข่าย" (match) เท่านั้น
      จำนวนเรื่อง · overlap · จะได้เปิดหน้าไหม — คำนวณจาก content.json ตอน build ทุกตัว
      ห้ามเขียนรายชื่อเรื่องลงไฟล์นี้ วันหน้าเพิ่มเรื่องที่ 13 แถว chip ต้องขยับเอง
      และ facet ใหม่ต้องผ่านด่าน 2 ข้อข้างบน "ด้วยค่าคงที่เดิม" ไม่ใช่ลดเกณฑ์ลงมารับ
   ⚠️ ถ้อยคำของป้าย (label/chip/lead) เป็นงานเขียนเนื้อหา ลูกค้าเป็นผู้รับหรือแก้
      ห้ามเติมคำโฆษณาที่ไม่มีตัวเลขรองรับ ("ฮิตที่สุด"/"ห้ามพลาด") ลงมาที่นี่

   ---- ป้ายมีสองแบบ ไม่ใช่แบบเดียว (คำตัดสินของ CEO 23 ต.ค. 2026 · AIO-34) ----
   `chip`  ป้ายบน chip — **ไม่มีเลขเกณฑ์** เพราะข้าง chip มีป้ายจำนวนเรื่องอยู่แล้ว
           สองเลขติดกันอ่านเป็น "ดูจบไว ≤20 ตอน 3" ซึ่งซ้อนกันเกิน
   `label` ป้ายเต็ม — **ต้องมีเลขเกณฑ์** ใช้ที่ <h1>/<title>/breadcrumb/JSON-LD name
           และในประโยคนำของหน้าแท็ก · เลขเกณฑ์ห้ามหายไปจากหน้า
   แท็กที่เป็น trope ไม่มีเลขอยู่แล้ว จึงใช้ค่าเดียวกันทั้งสองช่อง (ดู computeOpenTags) */
const SHORT_EPS = 20;
const LONG_EPS = 45;
/* ส่วนขยายในประโยคนำของหน้าแท็ก — "…รวม <N> <lead> ได้แก่ …" */
const TROPE_LEAD = 'เรื่องที่เล่าปมเดียวกันแม้จะอยู่คนละแนว';
export const FACETS = [
  /* `day === null` ⇔ `status === "ended"` ตามสัญญา §6.3.1 (ดู dayOf) — อ่าน enum ไม่อ่านข้อความไทย */
  { slug: 'ended', kind: 'status', label: 'จบแล้ว', chip: 'จบแล้ว',
    lead: 'เรื่องที่ปล่อยตอนครบแล้ว ดูจบได้เลยไม่ต้องรอตอนใหม่',
    match: s => s.day === null },
  { slug: 'daily', kind: 'status', label: 'ออกตอนใหม่ทุกวัน', chip: 'ออกตอนใหม่ทุกวัน',
    lead: 'เรื่องที่ยังปล่อยตอนใหม่ทุกวัน',
    match: s => s.day === 'daily' },
  { slug: 'quick-watch', kind: 'length', label: `ดูจบไว ≤${SHORT_EPS} ตอน`, chip: 'ดูจบไว',
    lead: `เรื่องที่มีไม่เกิน ${SHORT_EPS} ตอน`,
    match: s => s.eps <= SHORT_EPS },
  { slug: 'long-run', kind: 'length', label: `เรื่องยาว ≥${LONG_EPS} ตอน`, chip: 'เรื่องยาว',
    lead: `เรื่องที่มี ${LONG_EPS} ตอนขึ้นไป`,
    match: s => s.eps >= LONG_EPS },
];

function genreOverlap(d, items) {
  let worst = 0;
  for (const g of d.genres) {
    const set = new Set(d.series.filter(s => s.genres.includes(g.slug)).map(s => s.slug));
    const hit = items.filter(k => set.has(k)).length;
    worst = Math.max(worst, hit / items.length);
  }
  return worst;
}

/* ด่านเดียวกันสำหรับ trope และ facet — รับชั้นข้อมูลเข้ามาเป็นพารามิเตอร์
   เพื่อให้ tools/test-tags.mjs ป้อนคลังสมมติเข้ามาพิสูจน์ได้ว่า "คำนวณ" จริง ไม่ใช่ท่องรายชื่อ */
export function computeOpenTags(d) {
  const candidates = [
    /* trope ไม่มีเลขเกณฑ์ในป้าย ⇒ chip กับ label เป็นข้อความเดียวกัน */
    ...(d.tropes || []).map(t => ({
      slug: t.slug, kind: 'trope', label: t.label, chip: t.label, lead: TROPE_LEAD, items: t.items,
    })),
    ...FACETS.map(f => ({
      slug: f.slug, kind: f.kind, label: f.label, chip: f.chip || f.label, lead: f.lead,
      items: d.series.filter(f.match).map(s => s.slug),
    })),
  ];
  const genreSlugs = new Set(d.genres.map(g => g.slug));
  const seen = new Set();
  for (const c of candidates) {
    /* slug ชนกันแปลว่าสอง facet จะเขียนหน้า /tag/<slug>/ ทับกัน — ต้องล้ม build ไม่ใช่เงียบ */
    if (seen.has(c.slug)) throw new Error(`แท็ก/facet slug ซ้ำ: "${c.slug}" — /tag/${c.slug}/ มีเจ้าของได้ตัวเดียว`);
    seen.add(c.slug);
    if (genreSlugs.has(c.slug)) {
      throw new Error(`facet slug "${c.slug}" ชนกับ slug ของหมวด — chip จะพูดซ้ำกับหมวด `
        + `ซึ่งเป็นสิ่งที่ด่าน overlap มีไว้กัน (AIO-19 §9.1)`);
    }
  }
  return candidates.filter(c =>
    c.items.length >= TAG_MIN_ITEMS && genreOverlap(d, c.items) <= TAG_MAX_GENRE_OVERLAP);
}

export const OPEN_TAGS = computeOpenTags(D);
export const isOpenTag = slug => OPEN_TAGS.some(t => t.slug === slug);
/* แท็กที่เปิดแล้วและครอบเรื่องนี้ — ใช้กับแถว chip ในหน้าเรื่อง (เดิมเป็น trope ล้วน) */
export const openTagsOf = s => OPEN_TAGS.filter(t => t.items.includes(s.slug));

/* ---------- อันดับในหน้า /popular ----------
   ADR-001 §12.2 C2: ขณะ `viewsSource === "none"` การจัดลำดับต้องมาจาก "เกณฑ์ที่ประกาศได้
   และตรวจย้อนได้จากข้อมูลจริง" ไม่ใช่ลำดับบรรทัดใน content.json ที่เผอิญเป็น
   (เดิมเรียงด้วย viewsNum ซึ่งคืน 0 ทุกเรื่องเมื่อไม่มีข้อมูล ⇒ sort เสถียร ⇒ ได้ลำดับไฟล์)
   เกณฑ์ที่ใช้แทน: จำนวนตอนมาก→น้อย แล้วตัดเสมอด้วย slug — ทั้งสองค่ามาจากข้อมูลจริง
   และหน้าต้องเขียนบอกเกณฑ์นี้ตรง ๆ (ดู RANK_BASIS_TEXT ที่หน้า /popular ใช้) */
export function viewsNum(s) {
  const m = String(s.views).match(/^([\d.]+)\s*(ล้าน|K)?$/);
  if (!m) return 0;
  return parseFloat(m[1]) * (m[2] === 'ล้าน' ? 1e6 : m[2] === 'K' ? 1e3 : 1);
}
export const RANK_BASIS = HAS_VIEWS ? 'views' : 'eps';
export const RANK_BASIS_TEXT = HAS_VIEWS
  ? 'เรียงตามยอดวิวสะสมในคลัง'
  : 'เรียงตามจำนวนตอนจากมากไปน้อย';
const byRank = HAS_VIEWS
  ? (a, b) => viewsNum(b) - viewsNum(a) || a.slug.localeCompare(b.slug)
  : (a, b) => b.eps - a.eps || a.slug.localeCompare(b.slug);
export const TOP10 = [...SERIES].sort(byRank).slice(0, 10);

/* ---------- เวลา ---------- */
export const epSecs = dur => { const p = String(dur).split(':'); return (+p[0]) * 60 + (+p[1]); };
export const iso8601 = dur => { const s = epSecs(dur); return `PT${Math.floor(s / 60)}M${s % 60}S`; };

/* ---------- วันออกตอน ----------
   อ่านจากฟิลด์ `day` (enum ของสัญญา) ไม่ใช่ถอดจากข้อความ status อีกแล้ว
   ครบทั้ง 8 ค่าโดยอัตโนมัติ — เพิ่มวันใหม่ในสัญญาแล้วไม่ต้องแก้ตารางที่นี่ */
export const releaseDay = s => (s.day ? DAY_TH[s.day] : null);
export const isDaily = s => s.day === 'daily';
export const isAiring = s => !!s.day;

/* ---------- เรื่องที่คล้ายกัน ---------- */
export function similar(s, n = 6) {
  const score = x => x.genres.filter(g => s.genres.includes(g)).length * 10
    + (x.tropes || []).filter(t => (s.tropes || []).includes(t)).length;
  return SERIES.filter(x => x.slug !== s.slug)
    .map(x => [x, score(x)])
    /* ตัดเสมอด้วย slug ปิดท้าย — ไม่งั้นเมื่อไม่มี views ลำดับจะกลายเป็นลำดับบรรทัดในไฟล์ */
    .sort((a, b) => b[1] - a[1] || viewsNum(b[0]) - viewsNum(a[0]) || a[0].slug.localeCompare(b[0].slug))
    .slice(0, n).map(x => x[0]);
}

/* ---------- URL (ค่าเดียวที่ความจริงอยู่) ---------- */
export const U = {
  home: '/',
  feed: '/feed/',
  search: '/search/',
  browse: '/browse/',
  newEp: '/new/',
  popular: '/popular/',
  schedule: '/schedule/',
  az: '/az/',
  library: '/library/',
  settings: '/settings/',
  notifications: '/notifications/',
  welcome: '/welcome/',
  about: '/about/',
  contact: '/contact/',
  help: '/help/',
  behind: '/behind-the-ai/',
  notFound: '/404/',
  offline: '/offline/',
  genre: g => `/genre/${g}/`,
  tag: t => `/tag/${t}/`,
  series: s => `/series/${s}/`,
  watch: (s, n) => `/watch/${s}/ep-${n}/`,
  cast: name => `/cast/${encodeURIComponent(name)}/`,
  legal: d => `/legal/${d}/`,
};

/* รายชื่อตัวละครที่มีหน้าของตัวเอง — ตัดชื่อที่ซ้ำข้ามเรื่องไม่ได้ออกไม่ได้
   เพราะ cast[] เป็นชื่อล้วน ไม่มี id · เปิดหน้าให้ทุกชื่อที่ไม่ซ้ำ */
export const CAST = (() => {
  const m = new Map();
  for (const s of SERIES) for (const c of s.cast) {
    if (!m.has(c)) m.set(c, []);
    m.get(c).push(s);
  }
  return [...m.entries()].map(([name, items]) => ({ name, items }));
})();

/* เปิดหน้าตัวละครเฉพาะชื่อที่อยู่ใน ≥2 เรื่อง — ชื่อที่อยู่เรื่องเดียวจะได้หน้าที่มีการ์ดใบเดียว
   ซึ่งเป็นหน้าบางที่ไม่ได้ให้อะไรเพิ่มจากหน้าเรื่อง (AIO-19 C-05 เหตุผลเดียวกับหน้าตอนซ้ำ) */
export const CAST_PAGES = CAST.filter(c => c.items.length >= 2);
export const hasCastPage = name => CAST_PAGES.some(c => c.name === name);
