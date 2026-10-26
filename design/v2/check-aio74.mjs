/* ============================================================================
   AIO-74 · ด่านของเอกสาร — ทุกข้อที่ AIO-74-HERO-WIDTH.md อ้าง ต้องถูกวัดซ้ำที่นี่
   UX-Designer · 26 ต.ค. 2026

   รัน:  node design/v2/check-aio74.mjs
         AIO74_TREE=/tmp/aio74-pin-<pid> node design/v2/check-aio74.mjs

   ด่านนี้ **วัดสดทุกข้อ** ไม่ใช่อ่านเลขจาก aio74-measured.json มาพิมพ์ซ้ำ
   (ไฟล์ผลวัดถูกใช้เพื่อ "ตรวจความสด" อย่างเดียว: ถ้ากฎใน v2.css ขยับหลังวัด ด่านนี้แดง)

   สิ่งที่พิสูจน์
     1  เกณฑ์ที่เสนอ (กล่องสื่อกว้างเท่าการ์ด ±1px · สูง min(1.5×กว้างการ์ด, 56vh) ±1px)
        เขียวบนแบบวันนี้ ครบ 12 ขนาดจอ · ทุกสไลด์ ไม่ใช่ใบแรกใบเดียว
     2  **เกณฑ์กัดจริง**: ย้อนกฎกลับเป็นแบบก่อน AIO-74 แล้วเกณฑ์ต้องแดงทุกจอมือถือ
        (ถ้าไม่แดง เกณฑ์นี้เป็นด่านที่ผ่านเพราะไม่มีวัตถุ ไม่ใช่เพราะของถูก)
     3  มติ F4 (เพดาน 56vh) ไม่ถูกถอน — ความสูงกล่องเท่าของเดิมทุกจอ ±1px
     4  ไม่มีการล้นแนวนอนที่จอไหนเลย
     5  สัญญาณเบรกพอยต์ใหม่ที่ด่านของ Dev ใช้แทนได้ (`.hero .body` right) สลับที่ 720px จริง
        และสัญญาณเก่า (กล่องประกาศสัดส่วนที่จอแคบ) ตายไปแล้วจริง ⇒ ต้องเปลี่ยน ไม่ใช่ลืม
     6  จุดยึดภาพเป็นค่าเดียวทั้งเว็บ และหน้าต่างครอปที่จอคับสุดยังไม่กินหัวตัวละคร
     7  ขอบเขต: `.hero` อยู่ที่หน้าเดียวของเว็บที่ส่งมอบ + สองม็อกอัพ · และใบนี้ไม่แตะไฟล์ของทีมอื่น
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';
import {
  VIEWPORTS, MOBILE_SWEEP, patchScript, MEASURE, serveTree, openChrome, go,
  covers, heroRule, OUT, TREE,
} from './aio74-lib.mjs';

const MOCKUP = '/design/v2/home.html';
/* เกณฑ์ที่ใบงานข้อ 5 ขอ — เขียนเป็นฟังก์ชันตัวเดียว ให้ Dev ยกไปฝังได้ตรง ๆ
   "กล่องสื่อของฮีโร่ต้องกว้างเท่าการ์ดที่มันอยู่ (±1px) ทุกจอ ทุกสไลด์"
   + ข้อคู่ที่มาแทนการเทียบสัดส่วนของเดิม: "สูงเท่า min(1.5 × ความกว้างการ์ด, 56vh) ±1px" */
const TOL = 1;
const widthOk = s => Math.abs(s.box.w - s.card.w) <= TOL;
/* ข้อความสูงเป็นกฎของ **สาขามือถือ** (<720px) เท่านั้น — สาขาเดสก์ท็อปมีกฎของตัวเอง
   (min(440px|480px, 56vh)) ที่ไม่ได้เปลี่ยนในใบนี้ และมีด่านของ Dev คุมอยู่แล้ว */
const heightOk = (s, vh) => Math.abs(s.box.h - Math.min(1.5 * s.card.w, 0.56 * vh)) <= TOL;

const vps = [...VIEWPORTS];
for (const vp of MOBILE_SWEEP) if (!vps.some(v => v.tag === vp.tag)) vps.push(vp);

let pass = 0, fail = 0, deferred = 0;
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};
/* ของที่ "ยังไม่ถึงคิว" ต้องอยู่คนละช่องกับของที่ผ่าน — ห้ามบวกเข้าช่องผ่าน (บทเรียน AIO-66) */
const defer = (label, detail = '') => {
  deferred++; console.log(`  ⏸ ${label}${detail ? `\n      ${detail}` : ''}`);
};

/* ---------- 0 · ความสดของเอกสาร/ผลวัด ---------- */
console.log('\n0 · ความสดของไฟล์');
const ruleNow = heroRule(path.join(DIR, 'v2.css'));
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
check('มีไฟล์ผลวัด design/v2/aio74-measured.json', !!data, 'รัน aio74-map.mjs ก่อน');
check(`ผลวัดเป็นของกฎ .hero .bg ตัวปัจจุบัน (${ruleNow})`,
  !!data && data.mockup.rule === ruleNow,
  data ? `ผลวัดเป็นของกฎ: ${data.mockup.rule}` : '');
const doc = path.join(DIR, 'AIO-74-HERO-WIDTH.md');
check('มีเอกสารคำตัดสิน design/v2/AIO-74-HERO-WIDTH.md', fs.existsSync(doc));

/* กฎในแบบกับกฎในเว็บจริง: วันนี้ต้องต่างกัน (แบบล้ำหน้าไปรอ Dev) — รายงานเป็นช่อง "รอ"
   ไม่ใช่ช่องผ่าน · วันที่ Dev ลงของ ข้อนี้จะกลายเป็นเขียวเอง */
const siteRule = heroRule(path.join(ROOT, 'assets/site.css'));
if (siteRule === ruleNow) check('เว็บจริงรับกฎใหม่แล้ว (assets/site.css ตรงกับแบบ)', true);
else defer('เว็บจริงยังเป็นกฎเก่า — รอ Dev ลงของตามใบงานต่อ',
  `แบบ   : ${ruleNow}\n      เว็บจริง: ${siteRule}`);

/* ใบนี้ขีดเส้นว่าแตะได้เฉพาะ design/v2/** */
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(l => l.slice(3).trim()).filter(Boolean);
const outside = dirty.filter(f => f && !f.startsWith('design/v2/'));
check(`ไม่มีไฟล์นอก design/v2/ ถูกแก้ในใบนี้ (${dirty.length} ไฟล์ที่ขยับ)`,
  outside.length === 0, outside.join(' '));

/* ---------- 1–6 · วัดสดในเบราว์เซอร์ ---------- */
const srv = await serveTree(ROOT);
const page = await openChrome();
try {
  console.log('\n1 · เกณฑ์ที่เสนอ บนแบบวันนี้ (12 ขนาดจอ × ทุกสไลด์)');
  const now = [];
  for (const vp of vps) {
    await page.viewport(vp);
    await go(page, `${srv.base}${MOCKUP}`);
    now.push({ vp, m: await page.evaluate(MEASURE) });
  }
  const badW = [], badH = [], ovf = [], slideDiff = [];
  for (const { vp, m } of now) {
    for (const s of m.slides) {
      if (!widthOk(s)) badW.push(`${vp.tag} ${s.id || 'slide'} กล่อง ${s.box.w} vs การ์ด ${s.card.w}`);
      if (vp.w < 720 && !heightOk(s, m.vh)) {
        badH.push(`${vp.tag} ${s.id || 'slide'} สูง ${s.box.h} vs ที่กฎขอ `
          + `${Math.min(1.5 * s.card.w, 0.56 * m.vh).toFixed(1)}`);
      }
    }
    if (m.overflowX) ovf.push(`${vp.tag} scrollWidth ${m.scrollW} > ${m.vw}`);
    const w0 = m.slides[0].box.w;
    if (m.slides.some(s => Math.abs(s.box.w - w0) > TOL)) slideDiff.push(vp.tag);
  }
  check(`ก · กล่องสื่อกว้างเท่าการ์ด ±${TOL}px ทุกจอ ทุกสไลด์ `
    + `(${now.reduce((a, b) => a + b.m.slides.length, 0)} กล่อง)`, badW.length === 0, badW.slice(0, 4).join(' · '));
  check(`ข · (สาขามือถือ <720px) กล่องสื่อสูงเท่า min(1.5×ความกว้างการ์ด, 56vh) ±${TOL}px `
    + `ทุกจอ ทุกสไลด์ (${now.filter(x => x.vp.w < 720).length} จอ)`,
  badH.length === 0, badH.slice(0, 4).join(' · '));
  check('ค · ทุกสไลด์ในคารูเซลกว้างเท่ากัน', slideDiff.length === 0, slideDiff.join(' '));
  check('ง · ไม่มีการล้นแนวนอนที่จอใดเลย', ovf.length === 0, ovf.join(' · '));

  console.log('\n2 · เกณฑ์กัดจริงไหม — ย้อนกฎกลับเป็นแบบก่อน AIO-74');
  const old = [];
  for (const vp of vps) {
    await page.viewport(vp);
    await go(page, `${srv.base}${MOCKUP}`);
    await page.evaluate(patchScript('preFix'));
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    old.push({ vp, m: await page.evaluate(MEASURE) });
  }
  const mobileOld = old.filter(x => x.vp.w < 720);
  const caught = mobileOld.filter(x => !widthOk(x.m.slides[0]));
  check(`เกณฑ์ข้อ ก จับบั๊กเดิมได้ทุกจอมือถือ (${caught.length}/${mobileOld.length} จอ)`,
    caught.length === mobileOld.length,
    mobileOld.filter(x => widthOk(x.m.slides[0])).map(x => x.vp.tag).join(' '));
  const deskOld = old.filter(x => x.vp.w >= 720);
  check(`และไม่แดงผิดตัวที่จอเดสก์ท็อป/แท็บเล็ต (${deskOld.length} จอ ไม่ได้รับผลจากกฎเก่า)`,
    deskOld.every(x => widthOk(x.m.slides[0])),
    deskOld.filter(x => !widthOk(x.m.slides[0])).map(x => x.vp.tag).join(' '));
  const gaps = mobileOld.map(x => `${x.vp.tag} ${x.m.slides[0].gapR}px `
    + `(${(x.m.slides[0].gapR / x.m.slides[0].card.w * 100).toFixed(1)}%)`);
  console.log(`      แถบว่างของกฎเก่าที่วัดได้: ${gaps.join(' · ')}`);

  console.log('\n3 · มติ F4 (เพดาน 56vh) ไม่ถูกถอน');
  const moved = [];
  for (let i = 0; i < vps.length; i++) {
    const a = now[i].m.slides[0], b = old[i].m.slides[0];
    if (Math.abs(a.box.h - b.box.h) > TOL) moved.push(`${vps[i].tag} ${b.box.h} → ${a.box.h}`);
  }
  check(`ความสูงกล่องเท่าของเดิมทุกจอ ±${TOL}px (12 จอ)`, moved.length === 0, moved.join(' · '));
  const over85 = now.filter(x => x.m.leadBottom / x.m.vh > 0.85)
    .map(x => `${x.vp.tag} ${(x.m.leadBottom / x.m.vh * 100).toFixed(1)}%`);
  const over85old = old.filter(x => x.m.leadBottom / x.m.vh > 0.85).map(x => x.vp.tag);
  check(`ขอบล่างบล็อกนำ (เกณฑ์ A1 ≤85%) ไม่แย่ลงกว่าของเดิม — ของเดิมเกิน ${over85old.length} จอ`,
    over85.length <= over85old.length, `ของใหม่เกินที่: ${over85.join(' · ') || 'ไม่มี'}`);

  console.log('\n5 · สัญญาณเบรกพอยต์ที่ด่านของ Dev ต้องเปลี่ยนไปใช้');
  const arAt = async w => {
    await page.viewport({ w, h: 900, dpr: 1, mobile: false });
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    return page.evaluate(`(() => { const e = document.querySelector('.hero .bg');
      return e ? getComputedStyle(e).aspectRatio : null; })()`);
  };
  const bodyRightAt = async w => {
    await page.viewport({ w, h: 900, dpr: 1, mobile: false });
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    return page.evaluate(`(() => { const e = document.querySelector('.hero .body');
      return e ? getComputedStyle(e).right : null; })()`);
  };
  await go(page, `${srv.base}${MOCKUP}`);
  check('สัญญาณเก่า (กล่องประกาศสัดส่วนที่จอแคบ) ตายแล้วจริง — ที่ 320px ได้ auto',
    (await arAt(320)) === 'auto', `ได้ ${await arAt(320)}`);
  const lo0 = await bodyRightAt(320), hi0 = await bodyRightAt(1920);
  check('สัญญาณใหม่ใช้ค้นหาได้: `.hero .body` right = 0px ที่ 320px และ ≠0px ที่ 1920px',
    lo0 === '0px' && hi0 !== '0px', `320→${lo0} · 1920→${hi0}`);
  let lo = 320, hi = 1920;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((await bodyRightAt(mid)) === '0px') lo = mid; else hi = mid;
  }
  check(`จุดที่สัญญาณใหม่สลับ = 720px (วัดได้ ${hi}px) — เท่าเบรกพอยต์ที่แบบประกาศ`, hi === 720,
    `ถ้าค่าไม่ใช่ 720 แปลว่าเบรกพอยต์ของฮีโร่ขยับ ไม่ใช่ด่านผิด`);

  console.log('\n6 · จุดยึดภาพและหน้าต่างครอป');
  const pos = new Set();
  for (const vp of vps) {
    await page.viewport(vp);
    await go(page, `${srv.base}${MOCKUP}`);
    const m = await page.evaluate(MEASURE);
    if (m.slides[0].vis) pos.add(m.slides[0].vis.objectPosition);
  }
  check(`object-position เป็นค่าเดียวทุกจอ (${[...pos].join(' / ')})`, pos.size === 1);
  /* จอที่ครอปลึกที่สุด: เลือกจากที่วัดได้ ไม่ใช่พิมพ์ชื่อจอไว้ */
  const deepest = now.filter(x => x.vp.w < 720 && x.m.slides[0].vis)
    .sort((a, b) => (b.m.slides[0].vis.cutTop + b.m.slides[0].vis.cutBottom)
      - (a.m.slides[0].vis.cutTop + a.m.slides[0].vis.cutBottom))[0];
  const dv = deepest.m.slides[0].vis;
  check(`ที่จอครอปลึกสุด (${deepest.vp.tag} · ตัดรวม ${(dv.cutTop + dv.cutBottom).toFixed(1)}%) `
    + `ตัดด้านบนไม่เกิน 6% ของไฟล์ (ได้ ${dv.cutTop}%)`, dv.cutTop <= 6,
    'ปกทั้ง 12 ใบวางหน้าตัวละครไว้ค่อนบน — ตัดบนเกินนี้เริ่มกินหัว (ดูแผ่นเทียบ 12 ใบ)');
  const cv = covers(TREE);
  check(`ปกในคลังครบ 12 ใบ และทุกใบเป็น 1024×1536 (ตรวจจากผลวัด ${data ? data.crops.length : 0} เคส)`,
    cv.length === 12 && !!data && data.crops.length > 0
      && data.crops.every(c => c.nat && c.nat[0] === 1024 && c.nat[1] === 1536),
    cv.join(' '));

  console.log('\n7 · ขอบเขตของคอมโพเนนต์');
  /* ตัดโฟลเดอร์ที่ขึ้นต้นด้วยจุดออก: workspace นี้มีสำเนารีโปของ run อื่นอยู่ใต้
     .paperclip-repositories/ ซึ่งไม่ใช่ของที่เราส่งมอบ แต่ grep เห็นเป็น index.html เหมือนกัน */
  const htmls = execFileSync('bash', ['-c',
    `grep -rl 'class="hero\\|hero-track\\|hero-sec' --include=*.html --exclude-dir='.*' ${ROOT} | sed 's#${ROOT}/##'`],
  { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const built = htmls.filter(f => !f.startsWith('design/'));
  const mocks = htmls.filter(f => f.startsWith('design/'));
  check(`เว็บที่ส่งมอบใช้ .hero ที่หน้าเดียว (${built.join(' ') || 'ไม่พบ'})`,
    built.length === 1 && built[0] === 'index.html', built.join(' '));
  check(`ม็อกอัพที่ได้รับผลจากกฎนี้ = ${mocks.length} ไฟล์ (${mocks.join(' ')})`, mocks.length >= 1);
} finally {
  page.close();
  srv.stop();
}

console.log(`\nสรุป: ผ่าน ${pass} · ตก ${fail} · รอ ${deferred}`);
if (fail) process.exit(1);
