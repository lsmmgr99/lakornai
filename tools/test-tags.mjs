/* ตรวจแถว chip แท็กผสม (AIO-33) + ถ้อยคำป้าย facet (AIO-34)
   11 หมวด 97 ข้อ (คลัง 12 เรื่อง · จำนวนข้อโตตามจำนวนหมวด/แท็ก)
   รัน:  node tools/test-tags.mjs          (รัน build ให้เองก่อนตรวจไฟล์ที่ส่งมอบ)
         SKIP_BUILD=1 node tools/test-tags.mjs   (ตรวจไฟล์ที่มีอยู่ตามสภาพ)

   เขียนแบบ "มิวเทชันเทสต์" ตามที่ Reviewer-Codex ทำกับ AC-2 คือต้องแดงเมื่อของปลอม:
     ลด TAG_MIN_ITEMS เป็น 2            → ข้อ 2/3 แดง (จำนวนแท็กเกิน 6)
     ดัน TAG_MAX_GENRE_OVERLAP เป็น 1   → ข้อ 4 แดง (revenge-karma/fruit-drama โผล่)
     hardcode รายชื่อเรื่องแทน match()  → ข้อ 6/7 แดง (คลังสมมติให้ผลเดิม) และข้อ 5 แดง
     ขยับเลขในป้ายไม่ขยับเกณฑ์ที่ตัดจริง → ข้อ 8 แดง
     chip กลับไปใช้ `label` (มีเลข)      → ข้อ 8/9 แดง 10 จุด
     ตัดเลขจาก `label` ด้วย (แก้ครึ่งเดียว) → ข้อ 2/5/9 แดง — เลขหายจากหน้าคือผิดคำสั่งเหมือนกัน
     facet ใช้เทมเพลตคำโปรยของ trope     → ข้อ 10 แดง 4 จุด
   ทุกข้อที่นับได้พิมพ์ตัวเลขออกมาด้วย — ผู้ตรวจอ่านแล้วเทียบกับตารางในใบงานได้ทันที */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  OPEN_TAGS, FACETS, TAG_MIN_ITEMS, TAG_MAX_GENRE_OVERLAP, computeOpenTags, openTagsOf, SERIES,
} from '../build/content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));

let fail = 0;
const ok = (c, msg) => { console.log(`  ${c ? '✓' : '✗'} ${msg}`); if (!c) fail++; };
const head = t => console.log('\n' + t);
const eqSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

if (!process.env.SKIP_BUILD) {
  const r = spawnSync('node', ['build/build.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('✗ build/build.mjs ล้ม — ตรวจไฟล์ที่ส่งมอบต่อไม่ได้\n' + (r.stderr || r.stdout));
    process.exit(1);
  }
}

/* ตารางในใบงาน AIO-33 เขียนลงไฟล์เทสต์ตรงตัว — ผลที่ต้องได้ ไม่ใช่ผลที่โค้ดคืนมา
   label/chip เป็นถ้อยคำที่ลูกค้าเป็นผู้รับหรือแก้ · แก้ถ้อยคำแล้วต้องมาแก้บรรทัดนี้ด้วย (จงใจ)

   `chip`  = ป้ายบน chip · ไม่มีเลขเกณฑ์ (คำตัดสินของ CEO 23 ต.ค. 2026 · AIO-34 ข้อ 1)
   `label` = ป้ายเต็ม · มีเลขเกณฑ์ ใช้ที่ h1/title/breadcrumb/JSON-LD และในประโยคนำ */
const WANT = [
  { slug: 'comeback', kind: 'trope', label: 'กลับมาเอาคืน', chip: 'กลับมาเอาคืน', n: 4 },
  { slug: 'inheritance', kind: 'trope', label: 'แย่งมรดก-ทายาทตระกูลดัง', chip: 'แย่งมรดก-ทายาทตระกูลดัง', n: 3 },
  { slug: 'ended', kind: 'status', label: 'จบแล้ว', chip: 'จบแล้ว', n: 4 },
  { slug: 'daily', kind: 'status', label: 'ออกตอนใหม่ทุกวัน', chip: 'ออกตอนใหม่ทุกวัน', n: 5 },
  { slug: 'quick-watch', kind: 'length', label: 'ดูจบไว ≤20 ตอน', chip: 'ดูจบไว', n: 3 },
  { slug: 'long-run', kind: 'length', label: 'เรื่องยาว ≥45 ตอน', chip: 'เรื่องยาว', n: 4 },
];
const CLOSED = ['revenge-karma', 'fruit-drama'];

/* ---------------- 1 · ด่านยังเป็นค่าเดิม ---------------- */
head('1 · facet ใหม่ต้องผ่าน "ด่านเดิม" ไม่ใช่ด่านที่ลดเกณฑ์ลงมารับ');
ok(TAG_MIN_ITEMS === 3, `TAG_MIN_ITEMS = ${TAG_MIN_ITEMS} (ต้องเป็น 3 — build/content.mjs:184)`);
ok(TAG_MAX_GENRE_OVERLAP === 0.8, `TAG_MAX_GENRE_OVERLAP = ${TAG_MAX_GENRE_OVERLAP} (ต้องเป็น 0.8)`);

/* ---------------- 2 · ได้ 6 แท็กเป๊ะ ---------------- */
head('2 · แถว chip ต้องได้ 6 แท็กเป๊ะตามตารางในใบงาน');
ok(OPEN_TAGS.length === WANT.length,
  `แท็กที่เปิด ${OPEN_TAGS.length} ตัว (ต้องเป็น ${WANT.length}) → ${OPEN_TAGS.map(t => t.slug).join(', ')}`);
ok(OPEN_TAGS.map(t => t.slug).join(',') === WANT.map(t => t.slug).join(','),
  `ลำดับ chip = ${OPEN_TAGS.map(t => t.slug).join(' · ')}`);
for (const w of WANT) {
  const t = OPEN_TAGS.find(x => x.slug === w.slug);
  ok(!!t && t.label === w.label && t.chip === w.chip && t.kind === w.kind && t.items.length === w.n,
    `${w.slug} — ป้ายเต็ม "${t ? t.label : '(ไม่มี)'}" · chip "${t ? t.chip : '-'}" · ชนิด ${t ? t.kind : '-'} `
    + `${t ? t.items.length : 0} เรื่อง (ต้องเป็น "${w.label}" / "${w.chip}" / ${w.kind} / ${w.n})`);
}

/* ---------------- 3 · สองตัวที่ต้องยังไม่ขึ้น ---------------- */
head('3 · revenge-karma / fruit-drama ต้องยังตกด่าน overlap (ซ้อนหมวด 100%)');
for (const slug of CLOSED) {
  ok(!OPEN_TAGS.some(t => t.slug === slug) && !exists(`tag/${slug}/index.html`),
    `${slug}: ไม่อยู่ในแถว chip และไม่มีหน้า tag/${slug}/`);
}

/* ---------------- 4 · สมาชิกมาจากข้อมูล ไม่ใช่รายชื่อในโค้ด ----------------
   คำนวณใหม่ในไฟล์นี้จาก content.json ดิบ ด้วยฟิลด์ตามสัญญา §6.3 ตรงตัว
   (status / releaseDay / eps / tropes) — คนละเส้นทางกับ build/content.mjs
   ถ้ามีใครเขียนรายชื่อเรื่องลงโค้ด ชุดจะไม่ตรงกันทันที
   หมายเหตุ §6.3.1: เรื่องที่ `status === "ended"` ไม่มีวันออกตอน จึงไม่เข้า `daily` */
head('4 · สมาชิกของทุก facet ต้องตรงกับที่คำนวณใหม่จาก content.json ดิบ');
const raw = JSON.parse(read('content.json'));
const slugsWhere = f => raw.series.filter(f).map(s => s.slug);
const INDEPENDENT = {
  comeback: slugsWhere(s => (s.tropes || []).includes('comeback')),
  inheritance: slugsWhere(s => (s.tropes || []).includes('inheritance')),
  ended: slugsWhere(s => s.status === 'ended'),
  daily: slugsWhere(s => s.status !== 'ended' && s.releaseDay === 'daily'),
  'quick-watch': slugsWhere(s => s.eps <= 20),
  'long-run': slugsWhere(s => s.eps >= 45),
};
for (const [slug, want] of Object.entries(INDEPENDENT)) {
  const got = (OPEN_TAGS.find(t => t.slug === slug) || { items: [] }).items;
  ok(eqSet(got, want), `${slug}: ${got.length} เรื่อง ตรงกับที่คำนวณใหม่ (${want.length}) → ${want.join(' ')}`);
}

/* ---------------- 5 · เลขในป้ายต้องเป็นเกณฑ์ที่ตัดจริง ----------------
   ป้าย "≤20 ตอน" ที่ตัดจริงที่ 25 คือป้ายโกหก — ผูกเลขในป้ายกับผลการตัดตรงนี้ */
head('5 · เลขในป้าย facet ความยาวต้องเท่ากับเกณฑ์ที่ตัดจริง');
for (const f of FACETS.filter(f => f.kind === 'length')) {
  const m = f.label.match(/([≤≥])(\d+)/);
  const t = OPEN_TAGS.find(x => x.slug === f.slug);
  if (!m || !t) { ok(false, `${f.slug}: อ่านเกณฑ์จากป้าย "${f.label}" ไม่ได้ หรือไม่มีในแถว chip`); continue; }
  const n = +m[2];
  const want = SERIES.filter(s => (m[1] === '≤' ? s.eps <= n : s.eps >= n)).map(s => s.slug);
  ok(eqSet(t.items, want), `${f.slug}: ป้ายบอก ${m[1]}${n} ตอน และตัดได้ ${t.items.length} เรื่องตรงกับเกณฑ์นั้น`);
}

/* ---------------- 6 · คลังสมมติ: ด่านทำงานบนข้อมูลที่ยังไม่เคยเห็น ----------------
   ผลที่คาดเขียนด้วยมือในไฟล์นี้ ไม่ได้ derive จากโค้ดที่กำลังตรวจ */
head('6 · คลังสมมติ — ด่านทั้งสองข้อต้องทำงานกับข้อมูลใหม่ (พิสูจน์ว่าคำนวณ ไม่ใช่ท่องจำ)');
const ser = (slug, genres, eps, day) => ({ slug, genres, tropes: [], eps, day });
const G3 = [{ slug: 'g1', label: 'จีหนึ่ง' }, { slug: 'g2', label: 'จีสอง' }, { slug: 'g3', label: 'จีสาม' }];

/* Z — daily 3 เรื่องกระจาย 3 หมวด (overlap 0.33) ⇒ เปิด · ended/long-run มี 2 เรื่อง ⇒ ตกข้อจำนวน
     trope `t-ok` 3 เรื่อง overlap 0.67 ⇒ เปิด · `t-small` 2 เรื่อง ⇒ ตก */
const Z = {
  genres: G3,
  tropes: [
    { slug: 't-ok', label: 'ปมที่ผ่าน', items: ['z1', 'z2', 'z4'] },
    { slug: 't-small', label: 'ปมที่เรื่องน้อย', items: ['z1', 'z2'] },
  ],
  series: [
    ser('z1', ['g1'], 12, 'daily'), ser('z2', ['g2'], 12, 'daily'), ser('z3', ['g3'], 12, 'daily'),
    ser('z4', ['g1'], 50, null), ser('z5', ['g2'], 50, null),
  ],
};
const z = computeOpenTags(Z);
ok(z.map(t => t.slug).join(',') === 't-ok,daily,quick-watch',
  `คลัง Z เปิด ${z.length} แท็ก → ${z.map(t => t.slug).join(', ')} (ต้องเป็น t-ok, daily, quick-watch)`);
ok(eqSet((z.find(t => t.slug === 'daily') || { items: [] }).items, ['z1', 'z2', 'z3']),
  'คลัง Z · daily = z1 z2 z3 (คำนวณจากคลังสมมติ ไม่ใช่จากคลังจริง)');
ok(eqSet((z.find(t => t.slug === 'quick-watch') || { items: [] }).items, ['z1', 'z2', 'z3']),
  'คลัง Z · quick-watch = z1 z2 z3 (เกณฑ์ ≤20 ตอน)');

/* Z2 = Z + เรื่องที่ 6 (จบแล้ว 60 ตอน) ⇒ ended กับ long-run ต้องขยับมาเปิดเองโดยไม่แก้โค้ด
   นี่คือเงื่อนไข "วันหน้าเพิ่มเรื่องที่ 13 แถวต้องขยับเอง" ในใบงาน */
const Z2 = { ...Z, series: [...Z.series, ser('z6', ['g3'], 60, null)] };
const z2 = computeOpenTags(Z2);
ok(z2.length === z.length + 2 && z2.some(t => t.slug === 'ended') && z2.some(t => t.slug === 'long-run'),
  `คลัง Z + 1 เรื่อง เปิดเพิ่มเป็น ${z2.length} แท็ก → ${z2.map(t => t.slug).join(', ')}`);
for (const slug of ['ended', 'long-run']) {
  ok(eqSet((z2.find(t => t.slug === slug) || { items: [] }).items, ['z4', 'z5', 'z6']),
    `คลัง Z2 · ${slug} = z4 z5 z6 (มีเรื่องที่เพิ่งเพิ่มอยู่ด้วย)`);
}

/* W — daily 3 เรื่องแต่อยู่หมวดเดียวกันทั้งหมด (overlap 1.00) ⇒ ต้องไม่เปิด
   จำนวนผ่านเกณฑ์แล้ว ข้อนี้จึงวัด "ด่าน overlap" ล้วน ๆ */
const W = {
  genres: [{ slug: 'g1', label: 'จีหนึ่ง' }, { slug: 'g2', label: 'จีสอง' }],
  tropes: [],
  series: [
    ser('w1', ['g1'], 12, 'daily'), ser('w2', ['g1'], 12, 'daily'), ser('w3', ['g1'], 12, 'daily'),
    ser('w4', ['g2'], 30, 'mon'),
  ],
};
ok(computeOpenTags(W).length === 0,
  `คลัง W · daily/quick-watch มี 3 เรื่องแต่ซ้อนหมวดเต็ม 1.00 ⇒ เปิด ${computeOpenTags(W).length} แท็ก (ต้องเป็น 0)`);

/* slug ชนกันต้องล้มดัง ไม่ใช่เขียนหน้า /tag/<slug>/ ทับกันเงียบ ๆ */
const threw = fn => { try { fn(); return false; } catch { return true; } };
ok(threw(() => computeOpenTags({ ...Z, tropes: [{ slug: 'daily', label: 'ชนกัน', items: ['z1', 'z2', 'z3'] }] })),
  'trope ที่ slug ชนกับ facet ⇒ ล้ม build');
ok(threw(() => computeOpenTags({ ...Z, genres: [...G3, { slug: 'ended', label: 'ชนกับหมวด' }] })),
  'facet ที่ slug ชนกับหมวด ⇒ ล้ม build');

/* ---------------- 7 · หน้าแท็ก 6 หน้าในไฟล์ที่ส่งมอบ ---------------- */
head('7 · หน้า /tag/<slug>/ ครบ 6 หน้า · h1 ไม่ว่างใน HTML · canonical + og · อยู่ใน sitemap');
const sitemap = read('sitemap.xml');
for (const w of WANT) {
  const p = `tag/${w.slug}/index.html`;
  if (!exists(p)) { ok(false, `${p}: ไม่มีไฟล์`); continue; }
  const html = read(p);
  const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  const h1 = m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
  const links = [...new Set((html.match(/href="\.\.\/\.\.\/series\/[a-z0-9-]+\/"/g) || []))].length;
  const cnt = (html.match(/res-count"><b class="num">(\d+)</) || [])[1];
  ok(!!h1, `tag/${w.slug}/ · h1 = "${h1}"`);
  ok(/<link rel="canonical" href="https?:\/\/[^"]*\/tag\//.test(html) && /<meta property="og:title"/.test(html)
    && /<meta property="og:image"/.test(html),
    `tag/${w.slug}/ · canonical + og:title + og:image ครบ`);
  ok(sitemap.includes(`/tag/${w.slug}/</loc>`), `tag/${w.slug}/ · อยู่ใน sitemap.xml`);
  /* ข้อ 6 ของใบงาน: ป้ายจำนวนข้าง chip ต้องเท่าจำนวนเรื่องที่อยู่ในหน้านั้นจริง */
  ok(+cnt === w.n && links === w.n,
    `tag/${w.slug}/ · ป้ายจำนวน ${w.n} = ที่เขียนบนหน้า ${cnt} = การ์ดเรื่องในหน้า ${links}`);
  /* ข้อ 8: facet ห้ามหลุดเข้า structured data เป็นคะแนนหรือยอดวิว */
  const ld = (html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join('');
  ok(!/aggregateRating|ratingValue|interactionStatistic|"views"/.test(ld),
    `tag/${w.slug}/ · structured data ไม่มีคะแนน/ยอดวิว (${ld.length} ตัวอักษร)`);
}

/* ---------------- 8 · แถว chip ครบทุกจุดที่มีอยู่เดิม ---------------- */
head('8 · แถว chip ต้องแสดงครบทุกจุดเดิม พร้อมป้ายจำนวนที่ตรงกับหน้าปลายทาง');
const chipRow = (html, up) => (html.match(new RegExp(`<a class="chip" href="${up}tag/([a-z0-9-]+)/">([^<]*)<span class="n num">(\\d+)</span>`, 'g')) || [])
  .map(s => s.match(new RegExp(`${up}tag/([a-z0-9-]+)/">([^<]*)<span class="n num">(\\d+)`)).slice(1, 4));
const rowOK = (p, up) => {
  if (!exists(p)) return ok(false, `${p}: ไม่มีไฟล์`);
  const row = chipRow(read(p), up);
  /* ป้ายบน chip ต้องเป็น `chip` ไม่ใช่ `label` — ไม่งั้นได้ "ดูจบไว ≤20 ตอน 3" ซ้อนเลขสองชุด */
  const good = row.length === WANT.length
    && row.every(([slug, label, n], i) => slug === WANT[i].slug && label === WANT[i].chip && +n === WANT[i].n);
  ok(good, `${p} · chip ${row.length} ตัว → ${row.map(([s, l, n]) => `${s}:"${l}":${n}`).join(' ') || '(ไม่มี)'}`);
};
rowOK('index.html', '');                      /* หน้าแรก — build/pages-discovery.mjs:102-104 */
rowOK('browse/index.html', '../');            /* หน้าเลือกดู — build/pages-discovery.mjs:247-248 */
for (const g of raw.genres) rowOK(`genre/${g.slug}/index.html`, '../../'); /* หน้าหมวด — :322-323 */

/* หน้าเรื่อง (build/pages-watch.mjs:76) ไม่มีป้ายจำนวน แต่ต้องเป็น "แท็กที่เปิดแล้วซึ่งครอบเรื่องนี้" ครบชุด
   และข้อความบน chip ต้องเป็นป้ายสั้น (`chip`) เหมือนทุกจุด ไม่ใช่ป้ายเต็มที่มีเลขเกณฑ์ */
let bad = [];
for (const s of SERIES) {
  const html = read(`series/${s.slug}/index.html`);
  const got = (html.match(/<a class="chip" href="\.\.\/\.\.\/tag\/([a-z0-9-]+)\/">([^<]*)</g) || [])
    .map(x => x.match(/tag\/([a-z0-9-]+)\/">([^<]*)</).slice(1, 3));
  const open = openTagsOf(s);
  const want = open.map(t => t.slug);
  const wantChip = open.map(t => t.chip);
  const fromItems = OPEN_TAGS.filter(t => t.items.includes(s.slug)).map(t => t.slug);
  if (got.map(x => x[0]).join(',') !== want.join(',')
    || got.map(x => x[1]).join(',') !== wantChip.join(',')
    || !eqSet(want, fromItems)) bad.push(`${s.slug}: ${got.map(x => `${x[0]}:"${x[1]}"`).join(' ')}`);
}
ok(bad.length === 0, `หน้าเรื่อง ${SERIES.length} หน้า · แถว chip ตรงกับแท็กที่ครอบเรื่องนั้น${bad.length ? ' → ' + bad.join(' | ') : ''}`);

/* ---------------- 9 · ถ้อยคำป้าย: chip ไม่มีเลข · h1/title/ประโยคนำยังมีเลข ----------------
   คำตัดสินของ CEO (AIO-34 ข้อ 1) มีสองครึ่ง ถ้าตรวจครึ่งเดียวจะเชียร์การแก้ที่ผิด:
   ตัดเลขจาก chip อย่างเดียวแล้วเลขหายจากหน้าไปด้วย = ผิดคำสั่งเหมือนกัน */
head('9 · chip ไม่มีเลขเกณฑ์ · แต่เลขเกณฑ์ยังอยู่ใน h1 / title / ประโยคนำ (CEO · AIO-34 ข้อ 1)');
const NUM_RE = /[≤≥]\s*\d+|\d+\s*ตอน/;
for (const w of WANT) {
  ok(!NUM_RE.test(w.chip), `${w.slug} · ป้าย chip "${w.chip}" ไม่มีเลขเกณฑ์`);
}
for (const w of WANT.filter(x => x.kind === 'length')) {
  const html = read(`tag/${w.slug}/index.html`);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
  const lead = (html.match(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
  const crit = w.label.match(/[≤≥]\d+ ตอน/)[0];
  ok(h1 === `แท็ก: ${w.label}`, `tag/${w.slug}/ · h1 = "${h1}" (ต้องเป็น "แท็ก: ${w.label}")`);
  ok(title.indexOf(w.label) === 0, `tag/${w.slug}/ · title ขึ้นต้นด้วยป้ายเต็ม → "${title}"`);
  ok(lead.includes(crit) && NUM_RE.test(lead),
    `tag/${w.slug}/ · ประโยคนำยังมีเกณฑ์ "${crit}" อยู่ในหน้า`);
}
/* และ chip ที่ส่งมอบจริงต้องไม่มีเลขเกณฑ์ปนอยู่เลยทุกจุด (นับจากไฟล์ ไม่ใช่จากตาราง) */
const chipPages = ['index.html', 'browse/index.html',
  ...raw.genres.map(g => `genre/${g.slug}/index.html`),
  ...WANT.map(w => `tag/${w.slug}/index.html`),
  ...SERIES.map(s => `series/${s.slug}/index.html`)];
const numInChip = [];
for (const p of chipPages) {
  for (const m of read(p).match(/<a class="chip" href="[^"]*tag\/[a-z0-9-]+\/">([^<]*)</g) || []) {
    const txt = m.match(/">([^<]*)<$/)[1];
    if (NUM_RE.test(txt)) numInChip.push(`${p}: "${txt}"`);
  }
}
ok(numInChip.length === 0,
  `chip ที่ยังมีเลขเกณฑ์ติดอยู่ใน ${chipPages.length} หน้า: ${numInChip.length} จุด${numInChip.length ? ' → ' + numInChip.slice(0, 4).join(' | ') : ''}`);

/* ---------------- 10 · คำโปรยของ facet ใช้เทมเพลตคนละแบบกับ trope ----------------
   CEO (AIO-34 ข้อ 2): เลิกใช้รูป "แท็ก <ป้าย> N เรื่อง" กับ facet เพราะอ่านเป็น
   "แท็ก จบแล้ว 4 เรื่อง" · ให้เอาประโยคนำของแท็กนั้นมาเป็นแกน และยังต้องไม่ซ้ำกันทุกหน้า */
head('10 · meta description ของ facet เอาประโยคนำมาเป็นแกน · trope ใช้รูปเดิม · ไม่ซ้ำกันทุกหน้า');
const descOf = p => (read(p).match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
for (const w of WANT) {
  const t = OPEN_TAGS.find(x => x.slug === w.slug);
  const d = descOf(`tag/${w.slug}/index.html`);
  if (w.kind === 'trope') {
    ok(d.indexOf(`รวมละครสั้น AI ภาษาไทยแท็ก ${w.label} ${w.n} เรื่อง`) === 0,
      `tag/${w.slug}/ (trope) · ยังใช้รูปเดิม → "${d.slice(0, 60)}…" (${d.length} ตัวอักษร)`);
  } else {
    ok(d.indexOf(t.lead) === 0 && !/^รวมละครสั้น AI ภาษาไทยแท็ก/.test(d) && !new RegExp(`แท็ก ${w.label} `).test(d),
      `tag/${w.slug}/ (facet) · ขึ้นต้นด้วยประโยคนำ "${t.lead}" และไม่มีรูป "แท็ก <ป้าย> N เรื่อง" แล้ว`);
  }
  ok(d.length <= 160 && d.length >= 70, `tag/${w.slug}/ · ความยาวคำโปรย ${d.length} ตัวอักษร (ต้อง 70–160)`);
}
/* ด่านเดิมของ QA: หน้าที่เปิดดัชนีทุกหน้ามีคำโปรยคนละแบบ — นับจากไฟล์ที่ส่งมอบทั้งเว็บ */
const idxPages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (['.git', 'design', 'node_modules', 'build', 'tools', 'docs', 'admin',
      '.paperclip-repositories', '.claude'].includes(e.name)) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith('.html') && rel !== '404.html'
      && !/content="noindex/.test(read(rel))) idxPages.push(rel);
  }
})('');
const descs = new Set(idxPages.map(descOf));
ok(descs.size === idxPages.length && !descs.has(''),
  `meta description ของหน้าที่เปิดดัชนี ไม่ซ้ำกัน ${descs.size}/${idxPages.length} หน้า (ด่านเดิม: 52 หน้า 52 แบบ)`);

/* ---------------- 11 · หน้าค้นหาไม่มีแถวแท็กเพิ่ม (CEO · AIO-34 ข้อ 3 "ปิด ไม่ต้องทำ") ---------------- */
head('11 · หน้าค้นหาต้องไม่มีแถวแท็กซ้อนเพิ่ม — มี chip หมวดอยู่แล้ว');
const searchHtml = read('search/index.html');
ok(!/href="[^"]*tag\/[a-z0-9-]+\/"/.test(searchHtml),
  `search/index.html · ลิงก์ไปหน้าแท็ก ${(searchHtml.match(/href="[^"]*tag\/[a-z0-9-]+\/"/g) || []).length} ลิงก์ (ต้องเป็น 0)`);
ok(/id="searchChips"/.test(searchHtml) && (searchHtml.match(/data-filter="/g) || []).length === raw.genres.length + 1,
  `search/index.html · ยังมี chip หมวดเดิมครบ ${(searchHtml.match(/data-filter="/g) || []).length} ตัว (6 หมวด + ทั้งหมด)`);

console.log(`\n${fail ? `✗ ไม่ผ่าน ${fail} ข้อ` : '✓ ผ่านทุกข้อ'}`);
process.exit(fail ? 1 : 0);
