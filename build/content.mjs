/* ชั้นข้อมูลของ generator ตัวจริง — อ่าน assets/data.js แหล่งเดียว (AIO-22)
   เมื่อ ADR ของ CTO (AIO-21) ล็อก schema ของ content.json แล้ว
   ให้เปลี่ยนเฉพาะฟังก์ชัน load() ข้างล่าง ส่วนที่เหลือของเว็บไม่ต้องแก้ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(DIR, '..');

function load() {
  const win = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'assets/data.js'), 'utf8'))(win);
  return win.LAKORN;
}
export const D = load();

export const SERIES = D.series;
export const BY = Object.fromEntries(SERIES.map(s => [s.slug, s]));
export const genreLabel = slug => (D.genres.find(g => g.slug === slug) || {}).label || slug;
export const genreOf = slug => D.genres.find(g => g.slug === slug);
export const seriesOfGenre = g => SERIES.filter(s => s.genres.includes(g));
export const tropeOf = slug => D.tropes.find(t => t.slug === slug);
export const tropesOf = s => (s.tropes || []).map(tropeOf).filter(Boolean);

/* ---------- แท็ก trope ที่ "เปิดเป็นหน้าได้" ----------
   เกณฑ์ 2 ข้อ ไม่ใช่ข้อเดียว:
   1) UX §2.1 — ต้องมี ≥3 เรื่อง ไม่งั้นได้หน้าโหลงเหลง
   2) SEO AIO-19 §9.1 — ถ้าชุดเรื่องซ้อนกับหมวดใดเกิน 80% จะเป็นหน้าซ้ำ ห้ามเปิด
   ผลวันนี้ (คลัง 12 เรื่อง): `แก้แค้น` และ `ละครผลไม้` ตกข้อ 2 (ซ้อนหมวด 100%)
   เหลือ 2 แท็กที่ผ่านทั้งสองข้อ · Research AIO-20 ยืนยันตัวเลขทุกตัวแล้ว
   แท็กที่เหลือเก็บไว้ในข้อมูล จะโผล่เป็นหน้าเองเมื่อคลังโตพอ ไม่ต้องแก้โค้ด */
export const TAG_MIN_ITEMS = 3;
export const TAG_MAX_GENRE_OVERLAP = 0.8;
function genreOverlap(items) {
  let worst = 0;
  for (const g of D.genres) {
    const set = new Set(seriesOfGenre(g.slug).map(s => s.slug));
    const hit = items.filter(k => set.has(k)).length;
    worst = Math.max(worst, hit / items.length);
  }
  return worst;
}
export const OPEN_TAGS = D.tropes.filter(t =>
  t.items.length >= TAG_MIN_ITEMS && genreOverlap(t.items) <= TAG_MAX_GENRE_OVERLAP);
export const isOpenTag = slug => OPEN_TAGS.some(t => t.slug === slug);

/* ---------- อันดับยอดนิยม ----------
   ยังไม่มีระบบวัดผลจริง — เรียงจาก views ที่เก็บในข้อมูล (ตัวเลขตัวอย่าง)
   โชว์ในหน้าได้ แต่ห้ามส่งเข้า structured data (AIO-19 C-02 · มติลูกค้า 22 ต.ค.) */
export function viewsNum(s) {
  const m = String(s.views).match(/^([\d.]+)\s*(ล้าน|K)?$/);
  if (!m) return 0;
  return parseFloat(m[1]) * (m[2] === 'ล้าน' ? 1e6 : m[2] === 'K' ? 1e3 : 1);
}
export const TOP10 = [...SERIES].sort((a, b) => viewsNum(b) - viewsNum(a)).slice(0, 10);

/* ---------- เวลา ---------- */
export const epSecs = dur => { const p = String(dur).split(':'); return (+p[0]) * 60 + (+p[1]); };
export const iso8601 = dur => { const s = epSecs(dur); return `PT${Math.floor(s / 60)}M${s % 60}S`; };

/* ---------- วันออกตอน ---------- */
const DAY = { 'ตอนใหม่ทุกวัน': 'ทุกวัน', 'ตอนใหม่ทุกศุกร์': 'ศุกร์', 'ตอนใหม่ทุกเสาร์': 'เสาร์', 'ตอนใหม่ทุกอังคาร': 'อังคาร' };
export const releaseDay = s => DAY[s.status] || null;

/* ---------- เรื่องที่คล้ายกัน ---------- */
export function similar(s, n = 6) {
  const score = x => x.genres.filter(g => s.genres.includes(g)).length * 10
    + (x.tropes || []).filter(t => (s.tropes || []).includes(t)).length;
  return SERIES.filter(x => x.slug !== s.slug)
    .map(x => [x, score(x)])
    .sort((a, b) => b[1] - a[1] || viewsNum(b[0]) - viewsNum(a[0]))
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
