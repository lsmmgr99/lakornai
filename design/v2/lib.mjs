/* LakornAI v2 mockup — shared helpers (build-time only, ไม่ใช่โค้ด production) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(DIR, '../..');

/* ---------- โหลดข้อมูลจริงจาก assets/data.js (อ่านอย่างเดียว) ---------- */
const src = fs.readFileSync(path.join(ROOT, 'assets/data.js'), 'utf8');
const win = {};
new Function('window', src)(win);
export const D = win.LAKORN;

export const genreLabel = s => (D.genres.find(g => g.slug === s) || {}).label || s;
export const by = slug => D.series.find(s => s.slug === slug);

/* ---------- ฟิลด์ที่ data.js ยังไม่มี — ตัวเลขตัวอย่างสำหรับม็อกอัพ ----------
   UX 8.2 ระบุให้ Dev เพิ่ม views / tropes[] / releaseDay / freeEps / coinPerEp
   ที่นี่คำนวณแบบคงที่ (deterministic) เพื่อให้ภาพทุกใบมีตัวเลขเดียวกัน
   และทุกหน้าที่โชว์ตัวเลขเหล่านี้ต้องมีหมายเหตุ "ตัวเลขตัวอย่าง" ---------- */
const VIEWS = {
  'ceo-cold': '12.4M', 'durian-revenge': '8.9M', 'billion-widow': '7.2M', 'villainess-reborn': '6.8M',
  'ayutthaya-love': '5.1M', 'undercover-tycoon': '4.7M', 'heir-returns': '3.9M', 'mirror-bride': '3.4M',
  'one-night-bangkok': '2.8M', 'mangosteen-heart': '2.3M', 'house-13': '1.9M', 'seedless-longan': '1.4M',
};
export const views = s => VIEWS[s.slug] || '1.0M';

/* trope = แท็กชั้นที่สอง (UX 1.2 ค) — โชว์เฉพาะที่มี ≥3 เรื่อง
   ⚠️ แมปจาก hook เอง ยังรอฝ่ายคอนเทนต์ยืนยัน (UX 8.3 ข้อ 1) */
export const TROPES = [
  { slug: 'revenge-karma', label: 'แก้แค้นสาสม', items: ['durian-revenge', 'billion-widow', 'undercover-tycoon', 'heir-returns'] },
  { slug: 'hidden-identity', label: 'ซ่อนตัวตน', items: ['undercover-tycoon', 'heir-returns', 'one-night-bangkok'] },
  { slug: 'reborn', label: 'ข้ามภพ-ย้อนเวลา', items: ['ayutthaya-love', 'villainess-reborn', 'mirror-bride'] },
];
export const tropesOf = slug => TROPES.filter(t => t.items.includes(slug));

/* rev.2 — คำสั่งเจ้าของงาน 22 ต.ค. (UX §1.0): ดูฟรีทุกตอน ไม่มีชั้นเงิน/บัญชี
   ค่าคงที่ FREE_EPS / COIN_PER_EP / BALANCE ของ rev.1 ถูกถอดออก ไม่มีอะไรอ้างอิงแล้ว */

const DAY = { 'ตอนใหม่ทุกวัน': 'ทุกวัน', 'ตอนใหม่ทุกศุกร์': 'ศุกร์', 'ตอนใหม่ทุกเสาร์': 'เสาร์', 'ตอนใหม่ทุกอังคาร': 'อังคาร' };
export const releaseDay = s => DAY[s.status] || null;

export const cover = s => `../../assets/covers/${s.slug}.webp`;

/* ---------- ไอคอน (inline SVG · stroke 1.8) ---------- */
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/>',
  feed: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  library: '<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>',
  heart: '<path d="M12 20.3S3.8 15.2 3.8 9.6A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8.2 2.2c0 5.6-8.2 10.7-8.2 10.7z"/>',
  heartf: '<path d="M12 20.3S3.8 15.2 3.8 9.6A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8.2 2.2c0 5.6-8.2 10.7-8.2 10.7z" fill="currentColor"/>',
  share: '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.4 10.8 7.2-3.9M8.4 13.2l7.2 3.9"/>',
  list: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.6"/><path d="M8 10V7.4a4 4 0 0 1 8 0V10"/>',
  unlock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.6"/><path d="M8 10V7.4a4 4 0 0 1 7.6-1.7"/>',
  play: '<path d="M8 5.2 19 12 8 18.8z"/>',
  playf: '<path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/>',
  pause: '<rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/>',
  mute: '<path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z"/><path d="m16 9.5 4.5 5M20.5 9.5 16 14.5"/>',
  sound: '<path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.8 6.4a8 8 0 0 1 0 11.2"/>',
  cc: '<rect x="2.6" y="5" width="18.8" height="14" rx="3"/><path d="M10 10.2a2.6 2.6 0 1 0 0 3.6M17 10.2a2.6 2.6 0 1 0 0 3.6"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M10.4 19.5a2 2 0 0 0 3.2 0"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-2.6 1v.2a2 2 0 1 1-4 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0-1-2.6H3.8a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 2.6-1V3.8a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 2.6 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0 1 2.6h.2a2 2 0 1 1 0 4h-.1a1.5 1.5 0 0 0-1.4.9z"/>',
  coin: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6v8.8M14.6 9.6a3 3 0 0 0-2.6-1.2c-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.8.9 2.8 2.1-1.2 2-2.8 2a3.2 3.2 0 0 1-2.8-1.3"/>',
  wallet: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5A2.5 2.5 0 0 1 20 7.5v1"/><rect x="3.5" y="7.5" width="17" height="12" rx="2.6"/><circle cx="16.4" cy="13.5" r="1.3" fill="currentColor" stroke="none"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4.2" rx="1.4"/><path d="M5.2 12.7v6.2a1.6 1.6 0 0 0 1.6 1.6h10.4a1.6 1.6 0 0 0 1.6-1.6v-6.2M12 8.5v12"/><path d="M12 8.5S10.6 3.5 8.2 3.5a2.4 2.4 0 0 0 0 5M12 8.5s1.4-5 3.8-5a2.4 2.4 0 0 1 0 5"/>',
  card: '<rect x="2.6" y="5.5" width="18.8" height="13" rx="2.6"/><path d="M2.6 10h18.8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  xc: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  alert: '<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  wifioff: '<path d="M2 3.5 21.5 21"/><path d="M5 11.5a11 11 0 0 1 3.2-2M2 8a16 16 0 0 1 4-2.7M18.6 11.2A11 11 0 0 0 12.6 8.6M22 8a16 16 0 0 0-5.4-3.3"/><path d="M8.6 15a6 6 0 0 1 2.1-1.2M12 19.5h.01"/>',
  refresh: '<path d="M20.5 11a8.5 8.5 0 1 0-.7 4.5"/><path d="M20.5 5v6h-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
  sparkle: '<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9z"/><path d="M18.6 16.4 19.4 18.6 21.6 19.4 19.4 20.2 18.6 22.4 17.8 20.2 15.6 19.4 17.8 18.6z"/>',
  filter: '<path d="M3.5 6h17M6.5 12h11M10 18h4"/>',
  dots: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  up: '<path d="m5 15 7-7 7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  arrowr: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.2 1.9"/>',
  star: '<path d="m12 3.8 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9z"/>',
  trash: '<path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2A1.8 1.8 0 0 0 9.2 21h5.6a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  logout: '<path d="M14.5 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v2"/><path d="M9.5 12H21M17.5 8.5l3.5 3.5-3.5 3.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.7v.3M12 17h.01"/>',
  shield: '<path d="M12 3 20 6v6c0 4.6-3.3 8-8 9.5C8 20 4.6 16.6 4.6 12V6z"/>',
  file: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M8.5 13h7M8.5 17h5"/>',
  mail: '<rect x="2.8" y="5" width="18.4" height="14" rx="2.6"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.6 18.4h2.8"/>',
  max: '<path d="M8.5 3.5h-5v5M15.5 3.5h5v5M15.5 20.5h5v-5M8.5 20.5h-5v-5"/>',
  cookie: '<circle cx="12" cy="12" r="8.6"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};
export const ic = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

/* ---------- โครงหน้า ---------- */
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* UX §2.2 — bottom nav 4 ช่อง · ช่อง "บัญชี" ของ rev.1 ถอดออกตามคำสั่ง §1.0
   ทางไปแจ้งเตือน/ตั้งค่าบนมือถือ ย้ายขึ้นไอคอน header ขวา */
const NAV = [
  { k: 'home', label: 'หน้าแรก', icon: 'home' },
  { k: 'feed', label: 'ฟีด', icon: 'feed' },
  { k: 'search', label: 'ค้นหา', icon: 'search' },
  { k: 'library', label: 'คลังของฉัน', icon: 'library' },
];

export function bottomNav(active) {
  return `<nav class="bottom" aria-label="เมนูหลัก"><div class="in">${NAV.map(n => `
    <a href="#"${n.k === active ? ' aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span></a>`).join('')}</div></nav>`;
}

/* UX §2.2 / §6.20 — มุมขวาเหลือ 3 ไอคอน [🔍][🔔][⚙] ขนาด 44×44
   ไม่มีปุ่มเหรียญ ไม่มี avatar ไม่มีปุ่มเข้าสู่ระบบ (คำสั่ง §1.0)
   notif = จุดสีบนกระดิ่งเมื่อมีตอนใหม่ของเรื่องที่ติดตาม · ไม่ใส่เลข */
export function header({ active = '', back = null, notif = true } = {}) {
  const links = [['home', 'หน้าแรก'], ['feed', 'ฟีด'], ['browse', 'หมวด'], ['new', 'ตอนใหม่'], ['popular', 'ยอดนิยม'], ['library', 'คลังของฉัน']];
  return `<header class="top"><div class="wrap">
    ${back
      ? `<button class="icon-btn" style="margin:0" aria-label="ย้อนกลับ">${ic('left')}</button>
         <b style="font-family:var(--display);font-weight:600;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${esc(back)}</b>`
      : `<a class="logo" href="#"><b lang="en">Lakorn</b><i lang="en">AI</i></a>`}
    <nav class="topnav" aria-label="เมนูบนสุด">${links.map(([k, l]) =>
      `<a href="#"${k === active ? ' aria-current="page"' : ''}>${l}${k === 'browse' ? ic('down', 'sm') : ''}</a>`).join('')}</nav>
    <div class="spacer"></div>
    <button class="icon-btn" aria-label="ค้นหา">${ic('search')}</button>
    <button class="icon-btn" style="margin-left:4px;position:relative" aria-label="แจ้งเตือน${notif ? ' · มีรายการที่ยังไม่อ่าน' : ''}">${ic('bell')}${
      notif ? '<i class="ndot"></i>' : ''}</button>
    <button class="icon-btn" style="margin-left:4px" aria-label="ตั้งค่า">${ic('settings')}</button>
  </div></header>`;
}

/* UX §2.2 — คอลัมน์ "บัญชี" ของ rev.1 ถูกแทนด้วย "ของฉัน"
   และลิงก์ "เงื่อนไขสมาชิก" หายไปจากคอลัมน์ข้อกำหนด (คำสั่ง §1.0)
   เพิ่มบรรทัดจุดยืน 1 บรรทัดเหนือลิขสิทธิ์ · บรรทัด mockup ต้องอยู่ทุกหน้า ห้ามถอด */
export function footer() {
  const col = (h, items) => `<div><h4>${h}</h4><nav>${items.map(i => `<a href="#">${i}</a>`).join('')}</nav></div>`;
  return `<footer class="foot"><div class="wrap"><div class="cols">
    ${col('เลือกดู', [...D.genres.map(g => g.label), 'ดัชนี ก–ฮ / A–Z', 'ตารางออกตอน'])}
    ${col('ของฉัน', ['คลังของฉัน', 'แจ้งเตือน', 'ตั้งค่า'])}
    ${col('เกี่ยวกับ', ['เกี่ยวกับเรา', 'เบื้องหลังการสร้างด้วย AI', 'ติดต่อ', 'ช่วยเหลือ'])}
    ${col('ข้อกำหนด', ['ข้อตกลงการใช้', 'นโยบายความเป็นส่วนตัว', 'นโยบายคุกกี้'])}
  </div>
  <div class="stance">${ic('playf', 'sm')}<span>ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก</span></div>
  <div class="btm">© LakornAI · lakornai.tv · ข้อมูลในหน้านี้เป็นข้อมูลตัวอย่าง (mockup)</div></div></footer>`;
}

/* ---------- การ์ด ---------- */
/* UX §6.1 — ป้าย 🔒 ถูกลบตามคำสั่ง §1.0 และ "ไม่เอาป้าย ดูฟรี มาแทนทุกใบ"
   (ทุกใบฟรี → ป้ายที่ติดทุกใบคือ noise) · ป้ายดูฟรีใช้เฉพาะ hero และบล็อกโปรโมตฟีด */
export function poster(s, { badges = [], rank = null, showViews = true } = {}) {
  return `<div class="poster" style="--c1:${s.c1};--c2:${s.c2}" role="img" aria-label="ปก ${esc(s.title)}">
    <img src="${cover(s)}" alt="" loading="lazy">
    ${showViews ? '<div class="scrim"></div>' : ''}
    <div class="tl">${badges.map(b => b).join('')}</div>
    ${showViews ? `<div class="bl"><span class="views">${ic('eye', 'sm')}<span class="num">${views(s)}</span></span></div>` : ''}
  </div>`;
}

export const aiBadge = `<span class="tag tag-ai">AI</span>`;
export const newBadge = `<span class="tag tag-new">ใหม่</span>`;
export const hotBadge = `<span class="tag tag-new">มาแรง</span>`;
export const doneBadge = `<span class="tag tag-done">จบแล้ว</span>`;
export const freeBadge = `<span class="tag tag-free">ดูฟรีทุกตอน</span>`;

export function card(s, opt = {}) {
  const badges = opt.badges || [aiBadge, ...(s.status === 'ตอนใหม่ทุกวัน' ? [newBadge] : [])];
  return `<a class="card ${opt.cls || ''}" href="#">
    ${poster(s, { ...opt, badges })}
    <div class="t">${esc(s.title)}</div>
    <div class="m">${s.genres.map(genreLabel)[0]} · ${s.eps} ตอน</div>
    ${opt.hook ? `<div class="hook">${esc(s.hook)}</div>` : ''}
  </a>`;
}

export function rankCard(s, n) {
  return `<a class="card rankcard${n <= 3 ? ' top3' : ''}" href="#" aria-label="อันดับ ${n} ${esc(s.title)}">
    <span class="pw">${poster(s, { badges: [aiBadge] })}<span class="rk num" aria-hidden="true">${n}</span></span>
    <div class="t">${esc(s.title)}</div>
    <div class="m">${views(s)} วิว · ${s.eps} ตอน</div>
  </a>`;
}

export function contCard(s, ep, pct) {
  return `<a class="cont" href="#"><div class="thumb">
      <img src="${cover(s)}" alt="" style="object-position:center 28%">
      <span class="play"><i>${ic('playf')}</i></span>
      <span class="more" aria-label="ตัวเลือกเพิ่มเติม">${ic('dots', 'sm')}</span>
      <span class="ep num">EP.${ep}</span>
      <span class="pbar"><i style="width:${pct}%"></i></span>
    </div>
    <div class="t">${esc(s.title)}</div>
    <div class="m num">EP.${ep}/${s.eps} · ดูไปแล้ว ${pct}%</div></a>`;
}

/* UX §6.8 — สถานะ "ล็อก" ถูกถอดออก เหลือ ใหม่ / ดูแล้ว / กำลังดู */
export function epRow(s, n, { isNew = false, done = false, cur = false } = {}) {
  const e = s.episodes[n - 1] || ['ตอนใหม่', '2:00', true];
  return `<a class="ep-row" href="#">
    <span class="th"><img src="${cover(s)}" alt="" style="object-position:center 25%"></span>
    <span class="bd">
      <span class="h"><b class="num">EP.${n}</b>${isNew ? newBadge : ''}${done ? `<span class="tag tag-done">ดูแล้ว</span>` : ''}${cur ? `<span class="tag tag-free">กำลังดู</span>` : ''}
        <span style="font-size:var(--t-sub);color:var(--fg-2)">${esc(e[0])}</span></span>
      <span class="st">${esc(s.title)} · ${e[1]} นาที · ${s.genres.map(genreLabel).join(' · ')}</span>
    </span>
    <span class="r">${ic('right', 'sm')}</span></a>`;
}

/* ---------- ตารางตอน ---------- */
/* UX §6.9 — 3 สถานะ: ยังไม่ดู / ดูแล้ว / กำลังดู · ทุกช่องกดได้ ไม่มีช่อง disabled */
export function epGrid(s, { current = null, watchedTo = 0, from = 1, to = 20 } = {}) {
  let out = '';
  for (let n = from; n <= Math.min(to, s.eps); n++) {
    const cls = n === current ? 'cur' : (n <= watchedTo ? 'done' : '');
    const aria = `ตอนที่ ${n} ${esc((s.episodes[n - 1] || [''])[0])}${
      cls === 'done' ? ' · ดูแล้ว' : cls === 'cur' ? ' · กำลังดู' : ' · ยังไม่ได้ดู'}`;
    out += `<a class="ep ${cls}" href="#" aria-label="${aria}"><span class="num">${n}</span></a>`;
  }
  return `<div class="eps">${out}</div>`;
}

export function epTabs(s, active = 0) {
  const spans = [];
  for (let i = 0; i < s.eps; i += 20) spans.push([i + 1, Math.min(i + 20, s.eps)]);
  return `<div class="ep-tabs" role="tablist" aria-label="ช่วงตอน">${spans.map(([a, b], i) =>
    `<button role="tab" aria-selected="${i === active}" class="num">${a}-${b}</button>`).join('')}</div>`;
}

/* legend เหลือ 2 รายการ — ช่องที่ไม่ติดสีคือ "ยังไม่ได้ดู" ซึ่งเป็นค่าเริ่มต้น ไม่ต้องอธิบาย */
export const legend = `<div class="legend">
  <i class="d">ดูแล้ว</i><i class="c">กำลังดู</i></div>`;

/* ---------- หมายเหตุ ----------
   UX §6.15: ไม่มีแถบ "ไม่ตัดเงินจริง" (mockBar) อีกแล้ว เพราะไม่มีระบบเงินให้ต้องปฏิเสธ
   เหลือ (ก) บรรทัดฟุตเตอร์ mockup ทุกหน้า และ (ข) หมายเหตุ "ตัวเลขตัวอย่าง" ใต้ยอดวิว */
export const sampleNote = t => `<p class="note-ex">${ic('info', 'sm')}<span>${t}</span></p>`;

/* บรรทัดข้อมูลถาวร (UX §5.6) — แทนแถบ [เข้าสู่ระบบเพื่อซิงก์] ของ rev.1
   ไม่มีปุ่ม ไม่มีลิงก์ ไม่ใช่การขาย แต่ข้อเท็จจริงที่ต้องบอกยังอยู่ */
export const localNote = (t = 'ข้อมูลคลังอยู่ในเครื่องนี้เท่านั้น — ถ้าล้างข้อมูลเบราว์เซอร์ รายการจะหาย') =>
  `<div class="perm neutral"><span class="ic">${ic('info', 'sm')}</span><span>${t}</span></div>`;

/* แถบจุดยืน (UX §4.2 B1) — ข้อความบังคับบนหน้ารายละเอียดเรื่อง */
export const freeAllBar = `<div class="perm"><span class="ic">${ic('playf', 'sm')}</span>
  <span><b>ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก</b></span></div>`;

/* ---------- empty / error / skeleton ---------- */
export const empty = (icon, h, p, btn) => `<div class="empty">
  <div class="ill">${ic(icon, 'lg')}</div><h3>${h}</h3><p>${p}</p>
  ${btn ? `<a class="btn btn-ghost btn-md" href="#">${btn}</a>` : ''}</div>`;
export const errorBox = (h = 'โหลดข้อมูลไม่ได้', p = 'การเชื่อมต่อขัดข้อง ลองใหม่อีกครั้ง') => `<div class="errorbox">
  <div class="ill">${ic('alert')}</div><h3 style="font-size:var(--t-h2);font-weight:600">${h}</h3>
  <p style="color:var(--muted);font-size:var(--t-sub)">${p}</p>
  <button class="btn btn-ghost btn-md">${ic('refresh', 'sm')} ลองใหม่</button></div>`;
export const skelCard = () => `<div class="skelcard"><div class="skel p"></div><div class="skel l w90"></div><div class="skel l w45"></div></div>`;
export const skelCont = () => `<div class="skelcard"><div class="skel c"></div><div class="skel l w90"></div><div class="skel l w45"></div></div>`;
export const skelRow = () => `<div class="skelrow"><div class="skel th"></div><div style="flex:1;display:grid;gap:8px"><div class="skel l w45"></div><div class="skel l w90"></div></div></div>`;

/* ---------- หน้าเปล่า ---------- */
export function page({ title, body, bodyClass = '', desc = '' }) {
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} · LakornAI v2 (ม็อกอัพเสนอแบบ)</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="v2.css">
</head><body class="${bodyClass}">
<a class="skip" href="#main">ข้ามไปเนื้อหาหลัก</a>
${body}
</body></html>`;
}

export function write(name, html) {
  fs.writeFileSync(path.join(DIR, name), html);
}
