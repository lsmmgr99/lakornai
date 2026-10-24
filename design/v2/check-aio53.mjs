/* ด่านวัดของ AIO-53 — ไทล์ "เลือกตามแนว" แนวตั้ง 2:3 · ปกไม่ซ้ำ · F2/F4/F6 จาก AIO-38
   รัน:  node design/v2/check-aio53.mjs
         BEFORE=1 node design/v2/check-aio53.mjs    (พิมพ์ตารางเลขแต่ไม่ exit 1 — ใช้เก็บคอลัมน์ "ก่อน")

   ด่านนี้วัด "ม็อกอัพ" ไม่ใช่เว็บที่ส่งมอบ — design/v2/ คือของที่ Visual เป็นเจ้าของ
   เว็บจริงมีด่านของตัวเองที่ tools/test-layout.mjs ซึ่งเอาม็อกอัพนี้เป็นค่าอ้างอิง

   ทำไมต้องวัดด้วยเบราว์เซอร์ ไม่ grep CSS: ทั้งสามข้อที่ตรวจเป็นผลของการคำนวณเลย์เอาต์
   (aspect-ratio × ความกว้างคอลัมน์กริด · min() ที่ขึ้นกับ vh · min-height ที่สู้กับ padding)
   ค่าที่เชื่อได้มีทางเดียวคือ getBoundingClientRect() บนหน้าที่ render จริง
   และต้องวัดใน "กรอบจอเดียว" — ไม่ยืด viewport ตามความสูงหน้า ไม่งั้นเกณฑ์ "ไม่ต้องเลื่อน" ไม่มีความหมาย

   การยกเซิร์ฟเวอร์/เบราว์เซอร์ เพดานเวลา ความเป็นเจ้าของพอร์ต และการเก็บกวาด
   ใช้ตัวร่วม tools/cdp-gate.mjs (อ่านอย่างเดียว ไม่แก้) */
import { startGate } from '../../tools/cdp-gate.mjs';

/* ---------- เกณฑ์ ----------
   ทุกตัวเลขมาจากใบงาน AIO-53 (ข้อ 1–2, 5) และ AIO-38 (F2/F4/F6) ไม่ใช่จากของที่วัดได้ */
const AR = 2 / 3;              /* --ar-poster · design/v2/tokens.css:120 */
const AR_TOL = 0.02;           /* ข้อ 1 · ±2% */
const ROW_TOL = 1;             /* ข้อ 2 · "แถวเดียวและสูงเท่ากัน" เผื่อปัดเศษ 1px */
const TILES = 6;               /* 6 แนวหลัก · content.json genres */
const HERO_RATIO = 0.85;       /* F4 · ขอบล่างฮีโร่ต้องไม่เกิน 85% ของจอ (เกณฑ์เดิมของ AIO-37) */
const CRUMB_MIN = 44;          /* F6 · เท่าที่ระบบออกแบบตั้งเองที่ฟุตเตอร์ (v2.css:575) */

const BENTO_PAGES = ['/design/v2/home.html', '/design/v2/browse.html', '/design/v2/home-empty.html'];
const BENTO_VPS = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1366, h: 768 }, { w: 1280, h: 800 },
  { w: 820, h: 1180 }, { w: 768, h: 1024 }, { w: 390, h: 844 },
];
const HERO_VPS = [{ w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1366, h: 768 }, { w: 390, h: 844 }];
const WATCH_VPS = [{ w: 1440, h: 900 }, { w: 1366, h: 768 }, { w: 1280, h: 800 }];
/* หน้าที่มี .crumbs ทุกหน้า ถูกค้นเองตอนรัน ไม่ตรึงรายชื่อไว้ (หน้าใหม่จะถูกวัดเองวันหลัง) */
const CRUMB_VPS = [{ w: 1440, h: 900 }, { w: 390, h: 844 }];

const BEFORE = !!process.env.BEFORE;
const { send, evaluate, until, cleanup } = await startGate({
  envPorts: ['A53_PORT', 'A53_CDP'], profilePrefix: 'lakorn-a53-',
});

/* กรอบจอเดียว · dpr=1 ทุกจอเพราะเลย์เอาต์ไม่ขึ้นกับ dpr — สิ่งที่ต้องตรงเป๊ะคือ width/height
   mobile:true เมื่อจอแคบกว่า 720px เพราะมือถือจริงใช้สกรอลล์บาร์แบบลอยทับ ไม่กินความกว้าง
   (ถ้าปล่อยเป็น false จอ 390 จะเหลือพื้นที่ 375px ⇒ ไทล์ 106px ซึ่งไม่ใช่เลขที่เครื่องลูกค้าเห็น
   ส่วนเดสก์ท็อปปล่อยไว้ false ตามจริง: สกรอลล์บาร์แบบกินที่คือของที่มีอยู่จริงบนเดสก์ท็อป
   ⇒ ที่ 1280 จะได้ 195.5px ไม่ใช่ 198px และนั่นคือเลขที่ต้องผ่านเกณฑ์) */
async function viewport({ w, h }) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: w < 720, screenWidth: w, screenHeight: h });
}
/* รอฟอนต์ให้พร้อมจริงด้วย document.fonts.ready ไม่ใช่ fonts.status === 'loaded'
   (วัดแล้ว: ตอน readyState เป็น complete สถานะยังเป็น 'loading' ⇒ เงื่อนไขที่อ่าน status เฉย ๆ
   รอครบ 45 วินาทีแล้วแดงเทียม) · ความกว้างกล่องขึ้นกับการตัดบรรทัดของป้ายชื่อแนว ⇒ ฟอนต์ต้องมาก่อนวัด
   และ **ไม่** รอ [...document.images].every(i => i.complete): ปกในแถวล่างเป็น loading="lazy"
   ซึ่งจะไม่โหลดเลยจนกว่าจะเลื่อนถึง ⇒ เงื่อนไขนั้นเป็นเท็จตลอดกาลในกรอบจอเดียว (วัดแล้ว 8 ใบใน home.html) */
const READY = "document.fonts.ready.then(() => document.readyState === 'complete')";

let pass = 0; const fails = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

try {
  /* ================= 1. ไทล์ "เลือกตามแนว" (ข้อ 1–3) ================= */
  for (const page of BENTO_PAGES) {
    console.log(`\n── ${page} · ไทล์แนว`);
    await until(page, READY);
    for (const vp of BENTO_VPS) {
      await viewport(vp);
      const m = await evaluate(`(() => {
        const t = [...document.querySelectorAll('.genre-bento .gtile')].map(el => {
          const r = el.getBoundingClientRect();
          const img = el.querySelector('img');
          /* img.src (IDL) ไม่ใช่ currentSrc — currentSrc เป็น "" จนกว่ารูปจะโหลดจริง
             ⇒ ถ้าวันหน้ามีใครใส่ loading="lazy" ให้ไทล์ ข้อ "ปกไม่ซ้ำ" จะเทียบ ""==="" แล้วแดงเทียม */
          return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: Math.round(r.top),
                   src: img ? img.src.replace(/^.*\\//, '') : null };
        });
        return { t, ovf: document.documentElement.scrollWidth > window.innerWidth,
                 sw: document.documentElement.scrollWidth, iw: window.innerWidth,
                 blockH: Math.round((document.querySelector('.genre-bento')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height) };
      })()`);
      const tag = `${vp.w}×${vp.h}`;
      const sizes = m.t.map(x => `${x.w}×${x.h}`).join(' ');
      const ars = m.t.map(x => (x.w / x.h).toFixed(3)).join(' ');
      console.log(`    ${tag.padEnd(10)} ${m.t.length} ไทล์ · ${sizes} · ar ${ars} · ก้อนสูง ${m.blockH}px`);

      check(`${tag} · ครบ ${TILES} ไทล์`, m.t.length === TILES, `ได้ ${m.t.length}`);
      const bad = m.t.filter(x => !x.h || Math.abs(x.w / x.h - AR) / AR > AR_TOL);
      check(`${tag} · ไทล์ทุกใบสัดส่วน 2:3 ±2%`, bad.length === 0,
        bad.length ? bad.map(x => `${x.w}×${x.h}=ar ${(x.w / x.h).toFixed(3)}`).join(' ') : `ar ${(m.t[0].w / m.t[0].h).toFixed(3)}`);
      check(`${tag} · ไม่ล้นแนวนอน`, !m.ovf, `scrollWidth ${m.sw} vs innerWidth ${m.iw}`);
      if (vp.w >= 960) {
        const tops = m.t.map(x => x.top);
        const hs = m.t.map(x => x.h);
        check(`${tag} · แถวเดียว (≥960px)`, Math.max(...tops) - Math.min(...tops) <= ROW_TOL, `top ${tops.join('/')}`);
        check(`${tag} · สูงเท่ากันทุกใบ`, Math.max(...hs) - Math.min(...hs) <= ROW_TOL, `h ${hs.join('/')}`);
      }
      if (vp === BENTO_VPS[1]) {   /* ปกไม่ขึ้นกับจอ — ตรวจครั้งเดียวต่อหน้า */
        const srcs = m.t.map(x => x.src);
        check(`${page} · ปก ${TILES} ไทล์ไม่ซ้ำกันเลย`, new Set(srcs).size === srcs.length, srcs.join(' '));
      }
    }
  }

  /* ================= 2. F4 · ฮีโร่ ================= */
  console.log('\n── /design/v2/home.html · F4 ฮีโร่');
  await until('/design/v2/home.html', READY);
  for (const vp of HERO_VPS) {
    await viewport(vp);
    const m = await evaluate(`(() => {
      const el = document.querySelector('.hero'); if (!el) return null;
      const r = el.getBoundingClientRect();
      const bg = el.querySelector('.bg').getBoundingClientRect();
      return { h: Math.round(r.height), bottom: Math.round(r.bottom), bgH: Math.round(bg.height),
               vh: window.innerHeight };
    })()`);
    const tag = `${vp.w}×${vp.h}`;
    const pctRaw = m.bottom / m.vh * 100;
    console.log(`    ${tag.padEnd(10)} ฮีโร่สูง ${m.h}px (.bg ${m.bgH}px) · ขอบล่าง y=${m.bottom} = ${pctRaw.toFixed(1)}% ของจอ`);
    check(`${tag} · ขอบล่างฮีโร่ ≤ ${HERO_RATIO * 100}% ของจอ`, m.bottom <= Math.floor(vp.h * HERO_RATIO),
      `${m.bottom} / ${vp.h} = ${pctRaw.toFixed(1)}%`);
  }

  /* ================= 3. F2 · เพลเยอร์หน้ารับชม =================
     "ใช้งานได้ทั้งชิ้นโดยไม่ต้องเลื่อน" = กล่อง .player ทั้งกล่องอยู่ในกรอบจอแรก
     ไม่ใช่แค่ "สูงน้อยกว่าจอ" — ของเดิม 818px บนจอ 768px ยังมีหัวเว็บกินอีก 58px ข้างบน */
  console.log('\n── /design/v2/watch.html · F2 เพลเยอร์');
  await until('/design/v2/watch.html', READY);
  for (const vp of WATCH_VPS) {
    await viewport(vp);
    const m = await evaluate(`(() => {
      const el = document.querySelector('.player'); const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
               bottom: Math.round(r.bottom), vh: window.innerHeight };
    })()`);
    const tag = `${vp.w}×${vp.h}`;
    console.log(`    ${tag.padEnd(10)} เพลเยอร์ ${m.w}×${m.h} · y ${m.top}→${m.bottom} · จอสูง ${m.vh} · ar ${(m.w / m.h).toFixed(3)}`);
    check(`${tag} · เพลเยอร์อยู่ในจอแรกทั้งกล่อง`, m.top >= 0 && m.bottom <= m.vh,
      `y ${m.top}→${m.bottom} เทียบจอ 0→${m.vh}`);
    check(`${tag} · เพลเยอร์ยังเป็น 9:16`, Math.abs(m.w / m.h - 9 / 16) / (9 / 16) <= AR_TOL,
      `ar ${(m.w / m.h).toFixed(3)}`);
  }

  /* ================= 4. F6 · breadcrumb =================
     ไม่ตรึงรายชื่อหน้า: ถามเซิร์ฟเวอร์ว่าหน้าไหนมี .crumbs จากดัชนีของม็อกอัพเอง */
  console.log('\n── F6 breadcrumb (ทุกหน้าที่มี .crumbs)');
  const pages = await (async () => {
    await until('/design/v2/index.html', READY);
    return evaluate(`[...document.querySelectorAll('a[href$=".html"]')]
      .map(a => new URL(a.getAttribute('href'), location.href).pathname)
      .filter((v, i, a) => a.indexOf(v) === i).sort()`);
  })();
  let crumbPages = 0;
  for (const p of pages) {
    await until(p, READY);
    for (const vp of CRUMB_VPS) {
      await viewport(vp);
      const m = await evaluate(`[...document.querySelectorAll('.crumbs')]
        .map(el => Math.round(el.getBoundingClientRect().height))`);
      if (!m.length) break;
      if (vp === CRUMB_VPS[0]) { crumbPages++; console.log(`    ${p.replace('/design/v2/', '')} → ${m.join('/')}px`); }
      check(`${p.replace('/design/v2/', '')} @${vp.w} · .crumbs ≥ ${CRUMB_MIN}px`,
        m.every(h => h >= CRUMB_MIN), m.join('/') + 'px');
    }
  }
  check(`พบหน้าที่มี breadcrumb (กันกรณีกวาด 0 หน้าแล้วเขียว)`, crumbPages >= 10, `${crumbPages} หน้า`);

  console.log(`\n${fails.length ? '✗' : '✓'} ผ่าน ${pass} ข้อ · ไม่ผ่าน ${fails.length} ข้อ`);
  if (fails.length) { for (const f of fails) console.log(`   · ${f}`); }
  await cleanup();
  process.exit(fails.length && !BEFORE ? 1 : 0);
} catch (e) {
  console.error(`\n✗ ด่านรันไม่จบ: ${e.message}`);
  await cleanup();
  process.exit(BEFORE ? 0 : 2);
}
