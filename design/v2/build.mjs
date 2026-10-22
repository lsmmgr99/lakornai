/* สร้างไฟล์ม็อกอัพทั้งหมด + manifest + สคริปต์เรนเดอร์ภาพ
   รัน:  node design/v2/build.mjs      (จาก root ของ repo)
   ไฟล์ทุกไฟล์ที่เขียนออก อยู่ใต้ design/v2/ เท่านั้น */
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './lib.mjs';
import * as A from './pages-discovery.mjs';
import * as B from './pages-my.mjs';
import * as C from './pages-system.mjs';

/* ---------------- manifest: หน้าจอ → ไฟล์ → ภาพ ----------------
   tier มาจาก UX §4.1 · vp: both = 390×844 + 1440×900, m = มือถืออย่างเดียว
   full = เรนเดอร์ full-page เพิ่มด้วย (หน้าที่ยาวและต้องโชว์ทั้งหน้าในเด็ค) */
const M = [
  // A — การค้นพบ (10 หน้าจอ)
  ['A1', 'หน้าแรก', '', 'R1', 'home.html', 'both', { full: 'mobile,desktop', h: [3400, 3000] }],
  ['A1', 'หน้าแรก', 'ไม่มีเรื่องที่ดูค้าง (empty)', 'R1', 'home-empty.html', 'm'],
  ['A1', 'หน้าแรก', 'กำลังโหลด (skeleton)', 'R1', 'home-loading.html', 'both'],
  ['A2', 'ฟีดแนวตั้ง', '', 'R1', 'feed.html', 'both'],
  ['A2', 'ฟีดแนวตั้ง', 'ดูครบแล้ว (empty)', 'R1', 'feed-empty.html', 'm'],
  ['A2', 'ฟีดแนวตั้ง', 'เล่นไม่ได้ (error)', 'R1', 'feed-error.html', 'm'],
  ['A2', 'ฟีดแนวตั้ง', 'กำลังโหลด', 'R1', 'feed-loading.html', 'm'],
  ['A3', 'ค้นหา', 'มีผลลัพธ์', 'R1', 'search.html', 'both'],
  ['A3', 'ค้นหา', 'ยังไม่พิมพ์ (ประวัติ+คำค้นฮิต)', 'R1', 'search-idle.html', 'm'],
  ['A3', 'ค้นหา', 'ไม่พบผลลัพธ์ (empty)', 'R1', 'search-empty.html', 'm'],
  ['A4', 'หน้าแนว', '', 'R1', 'genre.html', 'both'],
  ['A4', 'หน้าแนว', 'แนวนี้ยังไม่มีเรื่อง (empty)', 'R1', 'genre-empty.html', 'm'],
  ['A5', 'หน้าแท็ก trope', '', 'R3', 'tag.html', 'm'],
  ['A6', 'ฮับเลือกดู', '', 'R2', 'browse.html', 'm', { full: 'mobile', h: [1900] }],
  ['A7', 'ยอดนิยม TOP 10', '', 'R1', 'popular.html', 'both', { full: 'mobile', h: [2000] }],
  ['A8', 'ตอนใหม่', '', 'R2', 'new.html', 'm'],
  ['A8', 'ตอนใหม่', 'ไม่มีตอนใหม่ (empty)', 'R2', 'new-empty.html', 'm'],
  ['A9', 'ตารางออกตอน', '', 'R2', 'schedule.html', 'm'],
  ['A9', 'ตารางออกตอน', 'วันนี้ไม่มีตอนใหม่ (empty)', 'R2', 'schedule-empty.html', 'm'],
  ['A10', 'ดัชนี ก–ฮ / A–Z', '', 'R2', 'az.html', 'm'],

  // B — เรื่องและการรับชม (5 หน้าจอ · B4 Paywall ถูกลบตามคำสั่ง UX §1.0 · คง ID B5/B6 ไม่เลื่อนเลข)
  ['B1', 'รายละเอียดเรื่อง', '', 'R1', 'series.html', 'both', { full: 'mobile,desktop', h: [2900, 2200] }],
  ['B1', 'รายละเอียดเรื่อง', 'กำลังโหลด (skeleton)', 'R1', 'series-loading.html', 'm'],
  ['B2', 'หน้ารับชม', '', 'R1', 'watch.html', 'both', { full: 'mobile', h: [2100] }],
  ['B2', 'หน้ารับชม', 'การ์ดตอนถัดไป · นับถอยหลัง 5 วินาที (§6.26)', 'R1', 'watch-next.html', 'm'],
  ['B2', 'หน้ารับชม', 'การ์ดจบเรื่อง (§6.25)', 'R1', 'watch-end.html', 'both'],
  ['B2', 'หน้ารับชม', 'กำลังโหลด', 'R1', 'watch-loading.html', 'm'],
  ['B2', 'หน้ารับชม', 'เล่นไม่ได้ (error)', 'R1', 'watch-error.html', 'm'],
  ['B3', 'ชีตเลือกตอนในเพลเยอร์', 'ทุกตอนกดได้ ไม่มีกุญแจ', 'R3', 'watch-episodes.html', 'm'],
  ['B5', 'แลนดิ้งแชร์ตอน', '', 'R3', 'share-landing.html', 'm'],
  ['B6', 'ตัวละคร/นักแสดง', '', 'R2', 'cast.html', 'm'],
  ['B6', 'ตัวละคร/นักแสดง', 'ไม่มีเรื่อง (empty)', 'R2', 'cast-empty.html', 'm'],

  // C — ไลบรารี (1 หน้าจอ)
  ['C1', 'คลังของฉัน', 'แท็บ ดูต่อ', 'R1', 'library.html', 'both'],
  ['C1', 'คลังของฉัน', 'แท็บ ติดตาม', 'R1', 'library-following.html', 'm'],
  ['C1', 'คลังของฉัน', 'แท็บ ดูจบแล้ว', 'R1', 'library-done.html', 'm'],
  ['C1', 'คลังของฉัน', 'แท็บ ประวัติ', 'R1', 'library-history.html', 'm'],
  ['C1', 'คลังของฉัน', 'กำลังโหลด (skeleton)', 'R1', 'library-loading.html', 'm'],
  ['C1', 'คลังของฉัน', 'empty 1/4 ดูต่อ', 'R1', 'library-empty-continue.html', 'm'],
  ['C1', 'คลังของฉัน', 'empty 2/4 ติดตาม', 'R1', 'library-empty-following.html', 'm'],
  ['C1', 'คลังของฉัน', 'empty 3/4 ดูจบแล้ว', 'R1', 'library-empty-done.html', 'm'],
  ['C1', 'คลังของฉัน', 'empty 4/4 ประวัติ', 'R1', 'library-empty-history.html', 'm'],

  // D — ของฉัน · ไม่ต้องมีบัญชี (2 หน้าจอ · D1–D9 เดิมถูกลบ · D10/D11 เลื่อนขึ้นเป็น D1/D2)
  ['D1', 'ตั้งค่า', '', 'R2', 'settings.html', 'm'],
  ['D2', 'ศูนย์แจ้งเตือน', '', 'R2', 'notifications.html', 'm'],
  ['D2', 'ศูนย์แจ้งเตือน', 'ยังไม่มีแจ้งเตือน (empty)', 'R2', 'notifications-empty.html', 'm'],

  // E — onboarding (2 หน้าจอ · E3 แถบอธิบาย paywall ถูกลบ)
  ['E1', 'เลือกแนวที่ชอบ', 'เลือกแล้ว 2', 'R1', 'welcome.html', 'both'],
  ['E1', 'เลือกแนวที่ชอบ', 'ยังไม่ได้เลือก (ปุ่ม disabled)', 'R1', 'welcome-empty.html', 'm'],
  ['E2', 'Coach mark ฟีด', '', 'R3', 'feed-coach.html', 'm'],

  // F — สถานะระบบ (3 หน้าจอ)
  ['F1', '404 ไม่พบหน้า', '', 'R2', '404.html', 'm'],
  ['F2', 'ออฟไลน์', '', 'R2', 'offline.html', 'm'],
  ['F2', 'ออฟไลน์', 'กำลังลองใหม่ (loading)', 'R2', 'offline-retry.html', 'm'],
  ['F3', 'แพตเทิร์นกลาง loading/empty/error', '', 'R3', 'patterns.html', 'both', { full: 'desktop', h: [2600] }],

  // G — คอนเทนต์และกฎหมาย (7 หน้าจอ · G6 เดิม "เงื่อนไขสมาชิก" ถูกลบ · คุกกี้/เบื้องหลัง AI เลื่อนขึ้นเป็น G6/G7)
  ['G1', 'เกี่ยวกับเรา', '', 'R2', 'about.html', 'm'],
  ['G2', 'ติดต่อ', '', 'R2', 'contact.html', 'm'],
  ['G2', 'ติดต่อ', 'ช่องไม่ถูกต้อง (error)', 'R2', 'contact-error.html', 'm'],
  ['G2', 'ติดต่อ', 'กำลังส่ง (loading)', 'R2', 'contact-busy.html', 'm'],
  ['G3', 'ช่วยเหลือ / FAQ', '', 'R2', 'help.html', 'm'],
  ['G4', 'ข้อตกลงการใช้', '', 'R2', 'legal-terms.html', 'm'],
  ['G5', 'นโยบายความเป็นส่วนตัว', '', 'R2', 'legal-privacy.html', 'm'],
  ['G6', 'นโยบายคุกกี้', '', 'R2', 'legal-cookies.html', 'm'],
  ['G7', 'เบื้องหลังการสร้างด้วย AI', '', 'R2', 'behind-the-ai.html', 'm'],
];

/* ระบบดีไซน์ — ไม่ใช่หน้าจอของผลิตภัณฑ์ จึงอยู่นอก manifest
   (manifest ต้องมี 30 รหัสหน้าจอตรงกับ UX Spec rev.2 §4.1 เป๊ะ) */
const EXTRA = [
  ['DS', 'Design system (token + component)', '', '—', 'styleguide.html', 'both', { full: 'desktop', h: [5200] }],
];

/* ---------------- สร้างหน้า ---------------- */
A.buildHome(); A.buildFeed(); A.buildSearch(); A.buildGenre(); A.buildBrowse();
A.buildPopular(); A.buildNew(); A.buildSchedule(); A.buildAZ();
A.buildSeries(); A.buildWatch(); A.buildCast(); A.buildLibrary();
B.buildSettings(); B.buildNotifications();
B.buildWelcome(); B.buildSystem(); B.buildContent();
C.buildStyleguide();

/* ---------------- manifest + shot list ----------------
   หมายเหตุ: headless chrome บังคับความกว้างหน้าต่างขั้นต่ำ 500px
   การใช้ --window-size=390 จึงได้เลย์เอาต์ 500px แล้วครอปเหลือ 390 (ผิด)
   เราจึงเรนเดอร์ผ่าน CDP (shoot.mjs) + Emulation.setDeviceMetricsOverride แทน */
const screens = [];
const shotList = [];

for (const [id, name, state, tier, file, vp, opt = {}] of [...M, ...EXTRA]) {
  const base = file.replace(/\.html$/, '');
  const shots = [];
  const add = (prefix, w, h, dpr, mobile, full = false) => {
    const out = `${prefix}-${base}.png`;
    shots.push(out);
    shotList.push({ file, out, w, h, dpr, mobile, full });
  };
  if (vp === 'both' || vp === 'm') add('mobile', 390, 844, 2, true);       // 780×1688 px
  if (vp === 'both' || vp === 'd') add('desktop', 1440, 900, 1.5, false);  // 2160×1350 px
  if (opt.full) {
    for (const k of opt.full.split(',')) {
      if (k === 'mobile') add('mobilefull', 390, 844, 1, true, true);
      else add('desktopfull', 1440, 900, 1, false, true);
    }
  }
  screens.push({ id, name, state, tier, file, shots });
}

/* manifest = 30 รหัสหน้าจอของผลิตภัณฑ์เท่านั้น (styleguide อยู่ใน EXTRA ไม่นับเป็นหน้าจอ)
   index.html ของเด็คโชว์ทั้ง manifest + styleguide */
const manifest = screens.filter(x => x.id !== 'DS');
const ids = [...new Set(manifest.map(x => x.id))];

C.buildIndex(screens);
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(DIR, 'shots.json'), JSON.stringify(shotList, null, 2));

/* ยามกันพลาด: UX Spec rev.2 §4.1 กำหนด 30 รหัสหน้าจอเป๊ะ */
if (ids.length !== 30) {
  console.error(`✗ manifest มี ${ids.length} รหัสหน้าจอ — rev.2 §4.1 กำหนด 30`);
  console.error(`  ที่มี: ${ids.join(' ')}`);
  process.exit(1);
}

const files = new Set(screens.map(m => m.file));
console.log(`สร้างหน้า ${files.size} ไฟล์ · ${ids.length} รหัสหน้าจอ · ${manifest.length} รายการในเช็กลิสต์ · ภาพที่จะเรนเดอร์ ${shotList.length} ใบ`);
