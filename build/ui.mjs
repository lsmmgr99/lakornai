/* โครงหน้า + คอมโพเนนต์ร่วมของเว็บจริง (AIO-22)
   ย้ายมาจาก design/v2/lib.mjs ของ Visual แล้วเปลี่ยน 4 อย่างให้เป็นเว็บจริง:
   1. ลิงก์ทุกตัวเป็น URL จริง (ของเดิมเป็น href="#" ทั้งหมด)
   2. ปกเป็น <img> จริงพร้อม width/height/loading — ไม่มี background-image (AC-5)
   3. head ใส่ canonical / og / JSON-LD ตอน build (AC-6)
   4. ไม่มีบรรทัด "ข้อมูลตัวอย่าง (mockup)" ในฟุตเตอร์ และไม่มีถ้อยคำ paywall ที่ใดเลย (AC-3)
   ห้ามแก้ไฟล์ใต้ design/v2/ — ไฟล์นี้คือสำเนาที่แยกชีวิตแล้ว */
import fs from 'node:fs';
import path from 'node:path';
import {
  D, U, SERIES, genreLabel, tropesOf, isOpenTag, releaseDay,
} from './content.mjs';
import { headTags, esc, FREE_LINE, coverUrl, COVER_W, COVER_H } from './seo.mjs';
import { ROOT } from './content.mjs';

export { esc, FREE_LINE };

/* ---------- ลิงก์แบบ relative ----------
   ใช้ relative ไม่ใช่ absolute เพื่อให้เปิดจากโฟลเดอร์ไหนก็ยังหาไฟล์เจอ
   depth = ความลึกของโฟลเดอร์ที่ไฟล์นั้นอยู่ (index.html ที่ราก = 0) */
export function mkLink(depth) {
  const up = depth === 0 ? '' : '../'.repeat(depth);
  return u => {
    if (/^(https?:|mailto:|#)/.test(u)) return u;
    if (u === '/') return up || './';
    return up + u.replace(/^\//, '');
  };
}

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
  play: '<path d="M8 5.2 19 12 8 18.8z"/>',
  playf: '<path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/>',
  pause: '<rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/>',
  mute: '<path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z"/><path d="m16 9.5 4.5 5M20.5 9.5 16 14.5"/>',
  sound: '<path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.8 6.4a8 8 0 0 1 0 11.2"/>',
  cc: '<rect x="2.6" y="5" width="18.8" height="14" rx="3"/><path d="M10 10.2a2.6 2.6 0 1 0 0 3.6M17 10.2a2.6 2.6 0 1 0 0 3.6"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M10.4 19.5a2 2 0 0 0 3.2 0"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-2.6 1v.2a2 2 0 1 1-4 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0-1-2.6H3.8a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 2.6-1V3.8a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 2.6 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0 1 2.6h.2a2 2 0 1 1 0 4h-.1a1.5 1.5 0 0 0-1.4.9z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
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
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.2 1.9"/>',
  trash: '<path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2A1.8 1.8 0 0 0 9.2 21h5.6a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.7v.3M12 17h.01"/>',
  shield: '<path d="M12 3 20 6v6c0 4.6-3.3 8-8 9.5C8 20 4.6 16.6 4.6 12V6z"/>',
  file: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M8.5 13h7M8.5 17h5"/>',
  mail: '<rect x="2.8" y="5" width="18.4" height="14" rx="2.6"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  max: '<path d="M8.5 3.5h-5v5M15.5 3.5h5v5M15.5 20.5h5v-5M8.5 20.5h-5v-5"/>',
  cookie: '<circle cx="12" cy="12" r="8.6"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};
export const ic = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

/* ---------- ปก: <img> จริงเสมอ (AC-5) ----------
   ไฟล์จริง 1024×1536 (2:3) · ประกาศ width/height ตามไฟล์จริง กัน CLS
   ห้ามครอปเป็น 3:4 — CSS บังคับ aspect-ratio ไว้ที่ --ar-poster */
export function coverImg(L, s, { lazy = true, cls = '', alt = null } = {}) {
  return `<img class="${cls}" src="${L(coverUrl(s))}" width="${COVER_W}" height="${COVER_H}"`
    + ` alt="${alt === null ? '' : esc(alt)}"${alt === null ? ' aria-hidden="true"' : ''}`
    + ` loading="${lazy ? 'lazy' : 'eager'}" decoding="async"${lazy ? '' : ' fetchpriority="high"'}>`;
}

export const aiBadge = `<span class="tag tag-ai">AI</span>`;
export const newBadge = `<span class="tag tag-new">ใหม่</span>`;
export const doneBadge = `<span class="tag tag-done">จบแล้ว</span>`;
export const freeBadge = `<span class="tag tag-free">ดูฟรีทุกตอน</span>`;

export function poster(L, s, { badges = [], showViews = true, lazy = true, alt = null } = {}) {
  return `<span class="poster" style="--c1:${s.c1};--c2:${s.c2}">
    ${coverImg(L, s, { lazy, alt })}
    ${showViews ? '<span class="scrim"></span>' : ''}
    ${badges.length ? `<span class="tl">${badges.join('')}</span>` : ''}
    ${showViews ? `<span class="bl"><span class="views">${ic('eye', 'sm')}<span class="num">${esc(s.views)}</span></span></span>` : ''}
  </span>`;
}

export function card(L, s, opt = {}) {
  const badges = opt.badges || [aiBadge, ...(s.status === 'ตอนใหม่ทุกวัน' ? [newBadge] : [])];
  return `<a class="card ${opt.cls || ''}" href="${L(U.series(s.slug))}">
    ${poster(L, s, { ...opt, badges })}
    <span class="t">${esc(s.title)}</span>
    <span class="m">${genreLabel(s.genres[0])} · ${s.eps} ตอน</span>
    ${opt.hook ? `<span class="hook">${esc(s.hook)}</span>` : ''}
  </a>`;
}

export function rankCard(L, s, n) {
  return `<a class="card rankcard${n <= 3 ? ' top3' : ''}" href="${L(U.series(s.slug))}" aria-label="อันดับ ${n} ${esc(s.title)}">
    <span class="pw">${poster(L, s, { badges: [aiBadge] })}<span class="rk num" aria-hidden="true">${n}</span></span>
    <span class="t">${esc(s.title)}</span>
    <span class="m">${esc(s.views)} วิว · ${s.eps} ตอน</span>
  </a>`;
}

/* แถวตอน — ทั้งแถวเป็นลิงก์จริงไปหน้าตอน */
export function epRow(L, s, n, { isNew = false, done = false, cur = false } = {}) {
  const e = s.episodes[n - 1] || ['', ''];
  return `<a class="ep-row" href="${L(U.watch(s.slug, n))}" data-genres="${s.genres.join(' ')}">
    <span class="th">${coverImg(L, s)}</span>
    <span class="bd">
      <span class="h"><b class="num" lang="en">EP.${n}</b>${isNew ? newBadge : ''}${done ? `<span class="tag tag-done">ดูแล้ว</span>` : ''}${cur ? `<span class="tag tag-free">กำลังดู</span>` : ''}
        <span class="et">${esc(e[0])}</span></span>
      <span class="st">${esc(s.title)} · ${e[1]} นาที · ${s.genres.map(genreLabel).join(' · ')}</span>
    </span>
    <span class="r">${ic('right', 'sm')}</span></a>`;
}

/* ตารางตอน — ลิงก์จริงครบทุกตอนใน HTML (แก้ AIO-19 F-04)
   3 สถานะ: ยังไม่ดู / ดูแล้ว / กำลังดู · ทุกช่องกดได้ ไม่มีช่องล็อก
   สถานะ "ดูแล้ว/กำลังดู" ที่เห็นจริงเติมโดย JS จาก localStorage ตอนโหลด
   (HTML ส่งออกไม่รู้จักผู้ใช้ จึงไม่เดาสถานะให้ใคร) */
export function epGrid(L, s, { current = null } = {}) {
  let out = '';
  for (let n = 1; n <= s.eps; n++) {
    const e = s.episodes[n - 1];
    const cls = n === current ? 'ep cur' : 'ep';
    out += `<a class="${cls}" href="${L(U.watch(s.slug, n))}" data-n="${n}"`
      + ` title="EP.${n} ${esc(e[0])} · ${e[1]} นาที"`
      + ` aria-label="ตอนที่ ${n} ${esc(e[0])}"${n === current ? ' aria-current="page"' : ''}>`
      + `<span class="num">${n}</span></a>`;
  }
  return `<div class="eps" id="epGrid" data-slug="${s.slug}">${out}</div>`;
}

export function epTabs(s) {
  const spans = [];
  for (let i = 0; i < s.eps; i += 20) spans.push([i + 1, Math.min(i + 20, s.eps)]);
  if (spans.length < 2) return '';
  return `<div class="ep-tabs" role="tablist" aria-label="ช่วงตอน">${spans.map(([a, b], i) =>
    `<button class="num" role="tab" data-range="${a}-${b}" aria-selected="${i === 0}" lang="en">${a}–${b}</button>`).join('')}</div>`;
}

export const legend = `<div class="legend"><i class="d">ดูแล้ว</i><i class="c">กำลังดู</i></div>`;

/* ---------- หมายเหตุ ---------- */
export const sampleNote = t => `<p class="note-ex">${ic('info', 'sm')}<span>${t}</span></p>`;
export const localNote = (t = 'ข้อมูลคลังอยู่ในเครื่องนี้เท่านั้น — ถ้าล้างข้อมูลเบราว์เซอร์ รายการจะหาย') =>
  `<div class="perm neutral"><span class="ic">${ic('info', 'sm')}</span><span>${t}</span></div>`;
export const freeAllBar = `<div class="perm"><span class="ic">${ic('playf', 'sm')}</span>
  <span><b>${FREE_LINE}</b></span></div>`;

export const empty = (L, icon, h, p, btn) => `<div class="empty">
  <div class="ill">${ic(icon, 'lg')}</div><h3>${h}</h3><p>${p}</p>
  ${btn ? `<a class="btn btn-ghost btn-md" href="${L(btn[1])}">${btn[0]}</a>` : ''}</div>`;

/* ---------- header / nav / footer ---------- */
const NAV = [
  { k: 'home', label: 'หน้าแรก', icon: 'home', url: U.home },
  { k: 'feed', label: 'ฟีด', icon: 'feed', url: U.feed },
  { k: 'search', label: 'ค้นหา', icon: 'search', url: U.search },
  { k: 'library', label: 'คลังของฉัน', icon: 'library', url: U.library },
];

export function bottomNav(L, active) {
  return `<nav class="bottom" aria-label="เมนูหลัก"><div class="in">${NAV.map(n => `
    <a href="${L(n.url)}"${n.k === active ? ' aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span></a>`).join('')}</div></nav>`;
}

export function header(L, { active = '', back = null } = {}) {
  const links = [['home', 'หน้าแรก', U.home], ['feed', 'ฟีด', U.feed], ['browse', 'หมวด', U.browse],
    ['new', 'ตอนใหม่', U.newEp], ['popular', 'ยอดนิยม', U.popular], ['library', 'คลังของฉัน', U.library]];
  return `<header class="top"><div class="wrap">
    ${back
      ? `<a class="icon-btn" style="margin:0" href="${L(back[1])}" aria-label="ย้อนกลับไป ${esc(back[0])}">${ic('left')}</a>
         <b class="htitle">${esc(back[0])}</b>`
      : `<a class="logo" href="${L(U.home)}" aria-label="LakornAI หน้าแรก"><b lang="en">Lakorn</b><i lang="en">AI</i></a>`}
    <nav class="topnav" aria-label="เมนูบนสุด">${links.map(([k, l, u]) =>
      `<a href="${L(u)}"${k === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <div class="spacer"></div>
    <a class="icon-btn" href="${L(U.search)}" aria-label="ค้นหา">${ic('search')}</a>
    <a class="icon-btn" style="margin-left:4px;position:relative" href="${L(U.notifications)}" aria-label="แจ้งเตือน" id="bellBtn">${ic('bell')}</a>
    <a class="icon-btn" style="margin-left:4px" href="${L(U.settings)}" aria-label="ตั้งค่า">${ic('settings')}</a>
  </div></header>`;
}

/* ฟุตเตอร์ต้องอยู่ใน HTML ที่ส่งออก ไม่ใช่สร้างด้วย JS (AIO-19 §9.4)
   ไม่มีบรรทัด "ข้อมูลตัวอย่าง (mockup)" แล้ว — เว็บจริง (AC-6) */
export function footer(L) {
  const col = (h, items) => `<div><h4>${h}</h4><nav aria-label="${h}">${items.map(([t, u]) =>
    `<a href="${L(u)}">${t}</a>`).join('')}</nav></div>`;
  return `<footer class="foot"><div class="wrap"><div class="cols">
    ${col('เลือกดู', [
      ...D.genres.map(g => [g.label, U.genre(g.slug)]),
      ['ดัชนี ก–ฮ / A–Z', U.az], ['ตารางออกตอน', U.schedule],
    ])}
    ${col('ของฉัน', [['คลังของฉัน', U.library], ['แจ้งเตือน', U.notifications], ['ตั้งค่า', U.settings]])}
    ${col('เกี่ยวกับ', [['เกี่ยวกับเรา', U.about], ['เบื้องหลังการสร้างด้วย AI', U.behind],
      ['ติดต่อ', U.contact], ['ช่วยเหลือ', U.help]])}
    ${col('ข้อกำหนด', [['ข้อตกลงการใช้', U.legal('terms')], ['นโยบายความเป็นส่วนตัว', U.legal('privacy')],
      ['นโยบายคุกกี้', U.legal('cookies')]])}
  </div>
  <div class="stance">${ic('playf', 'sm')}<span>${FREE_LINE}</span></div>
  <div class="btm">© LakornAI · lakornai.tv</div></div></footer>`;
}

/* ---------- โครงหน้า ---------- */
export const PAGES = [];

/* out  = path ของไฟล์ที่เขียน เช่น 'watch/ceo-cold/ep-3/index.html'
   url  = URL สะอาดที่ใช้กับ canonical/sitemap เช่น '/watch/ceo-cold/ep-3/' */
export function definePage({ out, url, title, desc, robots, og, jsonLd = [], body, bodyClass = '', page: pageName = '', slug = '', ep = '' }) {
  const depth = out.split('/').length - 1;
  const L = mkLink(depth);
  const rel = depth === 0 ? '' : '../'.repeat(depth);
  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${headTags({ url, title, desc, robots, og, jsonLd, rel })}
<link rel="stylesheet" href="${rel}assets/tokens.css">
<link rel="stylesheet" href="${rel}assets/site.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''} data-root="${rel}"${pageName ? ` data-page="${pageName}"` : ''}${slug ? ` data-slug="${slug}"` : ''}${ep ? ` data-ep="${ep}"` : ''}>
<a class="skip" href="#main">ข้ามไปเนื้อหาหลัก</a>
${typeof body === 'function' ? body(L) : body}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="${rel}assets/data.js"></script>
<script src="${rel}assets/app.js"></script>
</body>
</html>
`;
  PAGES.push({ out, url, title, desc, robots: robots || 'index,follow', html });
  return html;
}

/* helper ที่ทุกหน้าใช้ประกอบร่าง */
export function shell(L, { nav = '', active = '', back = null, main }) {
  return `${header(L, { active, back })}
${main}
${bottomNav(L, nav)}`;
}

export function pageHead(h1, sub = '') {
  return `<div class="page-head"><h1>${esc(h1)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
}

export function crumbs(L, items) {
  return `<nav class="crumbs" aria-label="เส้นทาง">${items.map((it, i) =>
    (i ? '<span aria-hidden="true">›</span>' : '') +
    (it[1] ? `<a href="${L(it[1])}">${esc(it[0])}</a>` : `<span>${esc(it[0])}</span>`)).join('')}</nav>`;
}

export function rail(L, inner, { wide = false } = {}) {
  return `<div class="rail-wrap">
    <button class="rail-btn prev" aria-label="เลื่อนซ้าย" disabled>${ic('left')}</button>
    <button class="rail-btn next" aria-label="เลื่อนขวา">${ic('right')}</button>
    <div class="rail${wide ? ' wide' : ''}">${inner}</div></div>`;
}

export function section(title, inner, { more = null, sub = '', L = null } = {}) {
  return `<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2>
    ${more && L ? `<a class="more" href="${L(more[1])}">${more[0]} ${ic('right', 'sm')}</a>` : ''}</div>
    ${sub ? `<p class="sec-sub">${sub}</p>` : ''}${inner}</section>`;
}
