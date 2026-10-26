/* ============================================================================
   AIO-74 · ของกลางของสามสคริปต์: ตัววัด (aio74-map) · ตัวถ่ายภาพ (aio74-frames) · ด่าน (check-aio74)
   UX-Designer · 26 ต.ค. 2026

   โจทย์: บนมือถือ กล่องภาพฮีโร่ (`.hero .bg`) แคบกว่าการ์ดที่มันอยู่ 8.9–12.6%
   เพราะกฎสาขามือถือเขียน `aspect-ratio` + `max-height` คู่กันบนกล่องที่ความกว้างเป็น auto
   ⇒ ตามกฎ CSS Sizing เพดานความสูงถูกส่งผ่านสัดส่วนไปเป็นเพดานความกว้าง
   (กฎ `.hero .bg` สาขา <720px ใน design/v2/v2.css — อ้างด้วยชื่อ selector เพราะเลขบรรทัดเลื่อน)

   ทำไมไฟล์เดียว: ทั้งสามตัวต้อง "ฉีดกฎที่เสนอ" ด้วยสคริปต์เดียวกันเป๊ะ ถ้าก๊อปไปวางสามที่
   วันที่แก้ที่เดียวแล้วอีกสองที่ไม่ตาม = ตัวเลขในเอกสาร ภาพที่ลูกค้าอนุมัติ และด่าน
   จะเป็นของคนละแบบโดยไม่มีใครฟ้อง (บทเรียนเดียวกับ aio59-lib.mjs)

   วัดจากเว็บจริงที่ build ออกมา (`/` = index.html) ไม่ใช่ม็อกอัพใน design/v2/
   เพราะลูกค้าเห็นบั๊กจาก URL จริง และเลขในใบงานเป็นเลขของเว็บจริง · กฎ CSS ของสองที่
   เหมือนกันบรรทัดต่อบรรทัดอยู่แล้ว (ตรวจซ้ำด้วย check-aio74.mjs ข้อแรก)

   ไม่มีสคริปต์ไหนในชุดนี้เขียนทับไฟล์ในรีโป — กฎที่เสนอถูกฉีดเป็น <style> ในหน้าเว็บ
   ========================================================================== */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';
/* ยืมตัวเปิด chrome/CDP ของ AIO-59 มาใช้ซ้ำ (ไฟล์ของ UX เอง) — ที่นั่นแก้บทเรียน
   fonts.ready/lazy-images/พอร์ตชนไว้แล้ว ไม่ก๊อปโค้ดนั้นมาวางใหม่ */
export { openChrome } from './aio59-lib.mjs';

export const pct = (a, b) => +(a / b * 100).toFixed(1);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- ชุดขนาดจอ ----------
   ชุดที่ 1 = 7 ขนาดของ AIO-38 เป๊ะ (ใบงานข้อ 3 สั่ง "ชุดเดิม") · ชุดนี้มีเจ้าของอยู่แล้วที่
   ค่าคงที่ FOLD_VIEWPORTS ใน tools/test-layout.mjs ⇒ ไม่พิมพ์ชุดใหม่เอง
   dpr/mobile: จอมือถือ/แท็บเล็ตต้อง mobile:true ไม่งั้นสกรอลล์บาร์กิน 15px
   แล้วเลขไม่ตรงกับที่ลูกค้าวัดเอง (บทเรียน AIO-45) */
export const VIEWPORTS = [
  { tag: '1920x1080', w: 1920, h: 1080, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1920×1080' },
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1440×900' },
  { tag: '1366x768', w: 1366, h: 768, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1366×768' },
  { tag: '1280x800', w: 1280, h: 800, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1280×800' },
  { tag: '820x1180', w: 820, h: 1180, dpr: 2, mobile: true, label: 'แท็บเล็ต 820×1180' },
  { tag: '768x1024', w: 768, h: 1024, dpr: 2, mobile: true, label: 'แท็บเล็ต 768×1024' },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true, label: 'มือถือ 390×844' },
];

/* ชุดที่ 2 = กวาดสาขามือถือ (<720px) ซึ่งเป็นสาขาที่มีบั๊ก · ชุด 7 ขนาดของ AIO-38 แตะสาขานี้
   ขนาดเดียว (390×844) ⇒ ถ้าวัดแค่ชุดนั้น จะไม่เห็นว่าการครอปลึกเท่าไรที่จอ "เตี้ย"
   410 ตัวสุดท้ายไม่ใช่รุ่นมือถือจริง แต่เป็น **จอแคบสุดที่เว็บประกาศรองรับ** (ตรวจค่าจริงที่
   ด่านข้อ "จอแคบสุดในชุดกวาด" — ค่านี้ไม่ใช่ตัวเลขที่พิมพ์ลอย ๆ) */
export const MOBILE_SWEEP = [
  { tag: '430x932', w: 430, h: 932, dpr: 3, mobile: true, label: 'มือถือ 430×932 (iPhone Pro Max)' },
  { tag: '412x915', w: 412, h: 915, dpr: 2.625, mobile: true, label: 'มือถือ 412×915 (Pixel)' },
  { tag: '390x844', w: 390, h: 844, dpr: 3, mobile: true, label: 'มือถือ 390×844 (iPhone)' },
  { tag: '360x800', w: 360, h: 800, dpr: 3, mobile: true, label: 'มือถือ 360×800 (Android กลาง)' },
  { tag: '360x640', w: 360, h: 640, dpr: 2, mobile: true, label: 'มือถือ 360×640 (Android เตี้ย)' },
  { tag: '320x568', w: 320, h: 568, dpr: 2, mobile: true, label: 'มือถือ 320×568 (จอเล็กสุด)' },
];

/* ---------- สภาพที่วัด ----------
   today  เว็บวันนี้ — ของที่ลูกค้าเห็น
   A1     ทางที่ CEO ทดลองมา: ให้กล่องกว้างเต็มการ์ด โดยคงคำประกาศ aspect-ratio:2/3 ไว้
          ⇒ เรขาคณิตถูก แต่ "ทรงที่ประกาศ" กับ "ทรงของกล่องจริง" ไม่ตรงกันอีกต่อไป
          (ข้อนี้มีด่านของ Dev ค้ำอยู่ — ดู §ผลต่อด่าน ในเอกสาร)
   A2     ทางที่ผมเสนอ: เขียนด้วยสำนวนเดียวกับสาขาเดสก์ท็อป — ไม่ประกาศสัดส่วน ตั้งความสูงตรง ๆ
          ความสูง = min(1.5 × ความกว้างการ์ด, 56vh) ด้วยหน่วย cqw ⇒ เรขาคณิตเท่ากับ A1 เป๊ะ
          แต่ไม่มีสัดส่วนให้ส่งผ่าน และไม่มีคำประกาศที่กล่องทำไม่ได้
   A2v    A2 ฉบับไม่ใช้ container query — เผื่อกรณีที่ Dev ไม่อยากตั้ง container บน .hero
          (ผูกกับรางน้ำของหน้าแทน: 100vw − รางน้ำสองข้าง) · วัดไว้เทียบว่าเท่ากันไหม
   B      ถอดเพดาน 56vh ออกจากสาขามือถือ = กลับไป 2:3 เต็มใบ (ทางเลือก B ของใบงาน)
   --------------------------------------------------------------------------- */
export const PATCH = {
  today: '',
  A1: '@media (max-width:719.98px){.hero .bg{width:100%}}',
  A2: '@media (max-width:719.98px){'
    + '.hero{container-type:inline-size}'
    + '.hero .bg{aspect-ratio:auto;height:min(calc(150cqw),56vh)}}',
  /* Afinal = ของที่แบบประกาศจริงหลัง AIO-74: A2 + จุดยึดภาพค่าเดียวกับเดสก์ท็อป
     ⇒ ตัวเลขทุกช่องในเอกสารมาจากสภาพเดียวกับที่ Dev จะลงของจริง */
  Afinal: '@media (max-width:719.98px){'
    + '.hero{container-type:inline-size}'
    + '.hero .bg{aspect-ratio:auto;height:min(calc(150cqw),56vh)}'
    + '.hero .bg img{object-position:center 22%}}',
  A2v: '@media (max-width:719.98px){'
    + '.hero .bg{aspect-ratio:auto;'
    + 'height:min(calc((100vw - var(--gutter-l) - var(--gutter-r))*1.5),56vh)}}',
  B: '@media (max-width:719.98px){.hero .bg{max-height:none}}',
  /* ย้อนกฎกลับเป็น "แบบก่อน AIO-74" — ใช้กับม็อกอัพที่แก้แล้ว เพื่อให้ตาราง ก่อน/หลัง ของ
     **แบบ** ถูกสร้างในรันเดียวกัน ไม่ใช่ก๊อปเลขของรันก่อนมาวาง */
  preFix: '@media (max-width:719.98px){'
    + '.hero{container-type:normal}'
    + '.hero .bg{aspect-ratio:var(--ar-poster);max-height:56vh;height:auto}'
    + '.hero .bg img{object-position:50% 50%}}',
};

/* ฉีดกฎที่เสนอเป็น <style> ท้าย <head> + ตั้ง object-position ของมือถือได้ตามต้องการ
   objPos = null โดยตั้งใจ: ถ้าใส่ '50% 50%' เป็นค่าตั้งต้น มันจะกลายเป็นกฎที่ชนะของเดิม
   แล้วภาพที่ถ่ายจะไม่ใช่สิ่งที่ CSS วันนี้ทำจริง (บทเรียนเดียวกับ aio59-lib) */
export const patchScript = (state, objPos = null) => {
  if (!(state in PATCH)) throw new Error(`ไม่รู้จักสภาพ "${state}" — มีแค่ ${Object.keys(PATCH).join(' ')}`);
  return `(() => {
  const css = ${JSON.stringify(PATCH[state])};
  let st = document.getElementById('aio74css');
  if (!st) { st = document.createElement('style'); st.id = 'aio74css'; document.head.appendChild(st); }
  st.textContent = css + ${JSON.stringify(objPos
    ? `@media (max-width:719.98px){.hero .bg img{object-position:${objPos}}}` : '')};
  return { state: ${JSON.stringify(state)}, bytes: st.textContent.length };
})()`;
};

/* เปลี่ยนปกของฮีโร่ทุกใบเป็นไฟล์ที่ระบุ — ใช้ตรวจการครอปกับปกจริงทั้ง 12 ใบ (ใบงานข้อ 2)
   ต้องถอด <source>/srcset ด้วย ไม่งั้นเบราว์เซอร์ยังเลือกไฟล์เดิมจากชุดที่ประกาศไว้
   (วันนี้ฮีโร่ของเว็บจริงเป็น <img> เปล่า แต่กฎ `.hero .bg picture` มีอยู่ในไฟล์ ⇒ รับทั้งสองโครง) */
export const swapCover = file => `(async () => {
  const src = '/assets/covers/' + ${JSON.stringify(file)};
  const imgs = [...document.querySelectorAll('.hero .bg img')];
  if (!imgs.length) throw new Error('ไม่พบ .hero .bg img');
  for (const im of imgs) {
    const pic = im.closest('picture');
    if (pic) pic.querySelectorAll('source').forEach(s => s.remove());
    im.removeAttribute('srcset'); im.removeAttribute('sizes');
    /* lazy + อยู่นอกกรอบจอ = ไบต์ไม่มาถึง แล้ว decode() ค้าง ⇒ บังคับ eager ก่อนเปลี่ยน src */
    im.loading = 'eager';
    im.src = src;
  }
  await Promise.all(imgs.map(im => im.decode().catch(() => {})));
  const got = (imgs[0].currentSrc || imgs[0].src).replace(location.origin, '');
  if (got !== src) throw new Error('สลับปกไม่สำเร็จ: ขอ ' + src + ' แต่เบราว์เซอร์โหลด ' + got);
  return { file: ${JSON.stringify(file)}, src: got, nat: [imgs[0].naturalWidth, imgs[0].naturalHeight] };
})()`;

/* ---------- ตัววัด ----------
   วัดด้วย getBoundingClientRect ของกล่องจริง ไม่ใช่ getComputedStyle: ค่าที่ computed style
   รายงานคือ "ค่าที่เขียนไว้" ซึ่งในบั๊กตระกูลนี้ยังสวยอยู่ทั้งที่กล่องจริงหด (AIO-37 · AIO-53)
   นับทุกสไลด์ในคารูเซล ไม่ใช่ใบแรกใบเดียว — ถ้าใบที่ 2/3 ต่างจากใบแรก ต้องเห็น
   --------------------------------------------------------------------------- */
export const MEASURE = `(() => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
    return { w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1),
             left: +b.left.toFixed(1), right: +b.right.toFixed(1) }; };
  const heroes = [...document.querySelectorAll('.hero')];
  if (!heroes.length) throw new Error('ไม่พบ .hero ในหน้า');
  const slides = heroes.map(h => {
    const bg = h.querySelector('.bg');
    const img = bg && bg.querySelector('img');
    const cs = bg ? getComputedStyle(bg) : null;
    const card = r(h), box = r(bg);
    /* ภาพที่ "เห็นจริง" หลัง object-fit:cover + หน้าต่างของไฟล์ที่รอดเข้ามาในกล่อง
       คิดจาก naturalWidth/Height ของไฟล์ที่โหลดสำเร็จ ไม่ใช่จากค่าที่เขียนไว้ใน CSS */
    const vis = (() => {
      if (!img || !img.naturalWidth || !box) return null;
      const arBox = box.w / box.h, arImg = img.naturalWidth / img.naturalHeight;
      const ics = getComputedStyle(img);
      const op = ics.objectPosition.split(' ');
      const frac = (v, i) => { /* '50%' | '22%' | '12px' → สัดส่วน 0..1 ของระยะที่เหลือ */
        if (v.endsWith('%')) return parseFloat(v) / 100;
        return i === 0 ? parseFloat(v) / Math.max(box.w, 1) : parseFloat(v) / Math.max(box.h, 1);
      };
      const fx = frac(op[0] || '50%', 0), fy = frac(op[1] || op[0] || '50%', 1);
      /* cover: ด้านที่ "แน่นกว่า" เต็มกล่อง อีกด้านถูกตัด */
      let sw, sh;   /* หน้าต่างของไฟล์ที่เห็น หน่วยพิกเซลของไฟล์ */
      if (arBox > arImg) { sw = img.naturalWidth; sh = sw / arBox; }
      else { sh = img.naturalHeight; sw = sh * arBox; }
      const sx = (img.naturalWidth - sw) * fx, sy = (img.naturalHeight - sh) * fy;
      return {
        natW: img.naturalWidth, natH: img.naturalHeight,
        arImg: +arImg.toFixed(4), objectFit: ics.objectFit, objectPosition: ics.objectPosition,
        win: [Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh)],
        cutTop: +(sy / img.naturalHeight * 100).toFixed(2),
        cutBottom: +((img.naturalHeight - sy - sh) / img.naturalHeight * 100).toFixed(2),
        cutLeft: +(sx / img.naturalWidth * 100).toFixed(2),
        cutRight: +((img.naturalWidth - sx - sw) / img.naturalWidth * 100).toFixed(2),
        seen: +((sw * sh) / (img.naturalWidth * img.naturalHeight)).toFixed(4),
        src: (img.currentSrc || img.src).replace(location.origin, ''),
      };
    })();
    return {
      id: h.id || null, card, box,
      /* ช่องว่างที่ลูกค้าเห็น = การ์ดกว้างกว่ากล่องภาพเท่าไร วัดทีละข้าง */
      gapL: card && box ? +(box.left - card.left).toFixed(1) : null,
      gapR: card && box ? +(card.right - box.right).toFixed(1) : null,
      arBox: box && box.h ? +(box.w / box.h).toFixed(4) : null,
      cssAr: cs ? cs.aspectRatio : null, cssH: cs ? cs.height : null,
      cssMaxH: cs ? cs.maxHeight : null, cssW: cs ? cs.width : null,
      display: cs ? cs.display : null,
      vis,
    };
  });
  /* แถวถัดไปบนจอแรก = เกณฑ์ A2 ของ AIO-38 (การ์ดเรื่องจริงต้องโผล่ ≥80px)
     หยิบการ์ดใบแรกของแถวหลังฮีโร่ ไม่ใช่กล่องใด ๆ ที่โผล่มา */
  const lead = document.querySelector('.hero-sec') || heroes[0].closest('section');
  const after = (() => {
    if (!lead) return null;
    const cards = [...document.querySelectorAll('.rail .card, .rail .btile, .card')]
      .filter(c => c.getBoundingClientRect().top >= lead.getBoundingClientRect().bottom - 1);
    if (!cards.length) return null;
    const b = cards[0].getBoundingClientRect();
    return { top: +b.top.toFixed(1), h: +b.height.toFixed(1),
             visible: +Math.max(0, Math.min(b.bottom, innerHeight) - b.top).toFixed(1) };
  })();
  return {
    vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
    scrollW: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > innerWidth,
    leadBottom: lead ? +lead.getBoundingClientRect().bottom.toFixed(1) : null,
    nextCard: after, slides,
  };
})()`;

/* ---------- พอร์ตที่ OS เลือกให้ ----------
   workspace แชร์กับ run อื่น · พอร์ตคงที่ชนแล้ว chrome จะไปขึ้นที่ [::1] แต่ยังพิมพ์บรรทัด
   DevTools ออกมาเหมือนสำเร็จ (บทเรียน AIO-45) ⇒ ขอพอร์ตว่างจาก OS ทุกครั้ง */
export function freePort(envName) {
  if (envName && process.env[envName]) return Promise.resolve(+process.env[envName]);
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

/* ---------- เซิร์ฟเวอร์ของ run นี้ บนทรีที่เลือก ----------
   ทรีตั้งต้นเป็นเวิร์กสเปซ แต่เวิร์กสเปซถูก run อื่นแก้ตลอด ⇒ รายงานใช้ทรีที่ปักด้วย
   `git archive <sha>` (AIO74_TREE) เพื่อให้เลขซ้ำได้
   "มีใครตอบ HTTP ที่พอร์ตนี้" ไม่ใช่หลักฐานว่าพอร์ตเป็นของเรา — หลักฐานที่ใช้คือ
   ลูกของเราต้องยังมีชีวิต และต้องเสิร์ฟไฟล์ที่เราเพิ่งเขียนลงทรีนั้นเองได้
   (ไฟล์ตรวจมี pid ในชื่อ ไม่งั้น run อื่นที่ทำแบบเดียวกันจะกวนกัน) */
export async function serveTree(tree = TREE) {
  const port = await freePort('AIO74_PORT');
  const stamp = `aio74-${process.pid}-${Date.now()}`;
  const probe = path.join(tree, `.aio74-probe-${process.pid}.txt`);
  fs.writeFileSync(probe, stamp);
  const srv = spawn(process.execPath, [path.join(tree, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
  let dead = null;
  srv.on('exit', c => { dead = c; });
  const base = `http://127.0.0.1:${port}`;
  const stop = () => { srv.kill('SIGTERM'); fs.rmSync(probe, { force: true }); };
  try {
    for (let i = 0; i < 80; i++) {
      if (dead !== null) throw new Error(`tools/serve.mjs ตายตอนเริ่ม (exit ${dead})`);
      try {
        const res = await fetch(`${base}/${path.basename(probe)}`);
        if (res.ok && (await res.text()) === stamp) {
          const home = await fetch(`${base}/`);
          if (home.ok) return { base, port, tree, stop };
        }
      } catch { /* ยังไม่ขึ้น */ }
      await sleep(100);
    }
    throw new Error(`เซิร์ฟเวอร์ที่พอร์ต ${port} ไม่ใช่ของ run นี้ หรือไม่ขึ้นใน 8 วินาที`);
  } catch (e) { stop(); throw e; }
}

export const TREE = process.env.AIO74_TREE || ROOT;
export const OUT = path.join(DIR, 'aio74-measured.json');
export const SHOTS = path.join(DIR, 'shots');
/* ปกทั้ง 12 ใบ — อ่านจากคลังของทรีที่วัด ไม่พิมพ์รายชื่อไว้ในสคริปต์
   (เพิ่มเรื่องที่ 13 แล้วด่าน/เอกสารต้องเห็นเอง) */
export const covers = (tree = TREE) =>
  fs.readdirSync(path.join(tree, 'assets/covers')).filter(f => f.endsWith('.webp')).sort();

/* โหลดหน้า + รอให้พร้อมจริง: DOM เสร็จ + ฟอนต์โหลดจบ + ภาพในฮีโร่ที่ "อยู่ในกรอบจอ" ถอดรหัสแล้ว
   ไม่ใช้ [...document.images].every(complete) และไม่ใช้ .hero .bg img ทุกใบ:
   สไลด์ใบที่ 2/3 ของคารูเซลเป็น loading="lazy" และอยู่นอกกรอบจอ ⇒ ที่ 1920×1080 ใบที่ 3
   ค้างที่ complete=false ตลอด (วัดเอง 26 ต.ค.) แล้วด่านรายงานว่า "โหลดหน้าไม่เสร็จ"
   ซึ่งชี้ผิดทาง · เรขาคณิตของใบที่ไม่ได้โหลดภาพยังวัดได้ปกติ (กล่องไม่ขึ้นกับไบต์ของไฟล์)
   แต่ทุกตัวเลขที่พึ่ง naturalWidth ถูกคิดจากใบที่ผ่านด่านนี้เท่านั้น */
export const HERO_READY = `(() => {
  if (document.readyState !== 'complete') return false;
  if (document.fonts.status !== 'loaded') return false;
  const inView = el => { const b = el.getBoundingClientRect();
    return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight; };
  const bgs = [...document.querySelectorAll('.hero .bg img')];
  if (!bgs.length) return false;
  const need = bgs.filter(inView);
  return (need.length ? need : [bgs[0]]).every(im => im.complete && im.naturalWidth > 0);
})()`;

export async function ready(page) {
  for (let i = 0; i < 150; i++) {
    if (await page.evaluate(HERO_READY) === true) return true;
    await sleep(80);
  }
  throw new Error('หน้าที่มีฮีโร่ยังไม่พร้อมใน 12 วินาที (ฟอนต์/ภาพฮีโร่ยังไม่จบ)');
}

/* นำทาง + รอด้วยด่านพร้อมของ "หน้าที่มีฮีโร่" · ไม่ใช้ goto ของ aio59-lib เพราะตัวนั้น
   รอ `.player.full` ของหน้าฟีด ⇒ ที่หน้าแรกมันหมดเวลา 10 วินาทีทุกครั้งที่นำทาง */
export async function go(page, url) {
  await page.send('Page.navigate', { url });
  await ready(page);
  /* สองเฟรมหลังพร้อม: ให้เลย์เอาต์/สคริปต์คารูเซลนิ่งก่อนอ่านกรอบ */
  await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  return true;
}

/* กฎ `.hero .bg` ของสาขามือถือ ตามที่เขียนอยู่ในไฟล์จริง — ใช้ติดป้ายให้ตัวเลขของม็อกอัพว่า
   เป็นของแบบฉบับไหน (ไม่ใช่เลขลอยที่ไม่รู้ว่ามาจาก CSS ชุดใด) */
export function heroRule(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = /^\.hero \.bg\{[^}]*\}/m.exec(src);
  return m ? m[0] : '(ไม่พบกฎ .hero .bg ตัวฐานใน ' + path.basename(file) + ')';
}
export { sleep };
