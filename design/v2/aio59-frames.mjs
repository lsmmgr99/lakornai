/* ============================================================================
   AIO-59 ข้อ 4 · ภาพม็อกอัพ "กรอบจอเดียว" สำหรับให้ลูกค้าอนุมัติ
   UX-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/aio59-frames.mjs
         AIO59_PORT=… AIO59_CDP=… node design/v2/aio59-frames.mjs   → เปลี่ยนพอร์ตถ้าชนกับ run อื่น

   ของที่เขียนออก
     design/v2/shots/aio59-<ขนาด>-<tall|wide|crop>.png      ต้นฉบับ
     design/v2/shots-jpeg/aio59-<ขนาด>-<tall|wide|crop>.jpg  เด็คเบาสำหรับแนบบนบอร์ด (ลิมิต 10 MB)

   ทุกใบเป็น **กรอบจอเดียว** — ไม่ตั้ง captureBeyondViewport ไม่ยืด viewport ตามความสูงหน้า
   ไม่เลื่อนหน้า · ใบงานสั่งย้ำข้อนี้: ภาพเลื่อนทั้งหน้าคือวิธีที่ทำให้บั๊กฮีโร่หลุดถึงลูกค้าสามรอบ
   เพราะมันตอบคำถาม "อะไรอยู่ในจอแรก / ภาพกินที่เท่าไรของจอ" ไม่ได้เลย

   ถ่ายจากเว็บจริงที่ build แล้ว (`/feed/`) ไม่ใช่จากม็อกอัพใน design/v2/feed.html
   เพราะม็อกอัพไม่มี header sticky 58px ที่เว็บจริงมี ⇒ ความสูงกล่องต่างกัน 58px
   และนั่นคือความต่างที่ทำให้ "ภาพกี่ % ของจอ" ในเอกสารกับของจริงไม่ตรงกัน

   สี่แบบ
     tall  = เรื่องแนวตั้ง สภาพวันนี้ ไม่แพตช์อะไรเลย        (ของอ้างอิง)
     wide  = เรื่องแนวนอนตามกฎที่เสนอ                       (**ของที่ขออนุมัติ**)
     crop  = เรื่องแนวนอนแบบ "เต็มจอครอปเหมือนวันนี้"        (ทางที่ไม่เลือก · มีไว้ให้เทียบ)
     plate = กฎเดียวกับ wide แต่ใส่แผ่นกว้าง 11:5 ของ AIO-56 (ให้เห็นว่าทำไมกฎภาพ M2 ถึงต้องมี)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { DIR, ROOT } from './lib.mjs';
import {
  MEASURE, DEMO_SLUG, WIDE_SRC, POSTER_SRC,
  serveRepo, openChrome, patchScript, cropScript, readProposalCss,
} from './aio59-lib.mjs';

const OUT_PNG = path.join(DIR, 'shots');
const OUT_JPG = path.join(DIR, 'shots-jpeg');

/* สี่ใบแรกคือชุดที่ใบงานสั่งขั้นต่ำ (390 · 1440 × แนวตั้ง/แนวนอน)
   สองใบ crop คือทางที่ไม่เลือก — ลูกค้าต้องเห็นของที่ถูกปฏิเสธด้วย ไม่ใช่เห็นแต่ของที่เราเชียร์
   768×1024 = กรณีที่ดีที่สุดในชุด 7 ขนาด (ภาพได้ 42.2% ของความสูงจอ)
   1366×768 = กรณีที่คับที่สุด (จอเตี้ยสุดในชุด · เป็นขนาดที่ภาพถูกย่อลง 6.5% ตามกฎช่องหายใจ) */
const M390 = { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true };
const D1440 = { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false };
const JOBS = [
  { ...M390, kind: 'tall' },
  { ...M390, kind: 'wide' },
  { ...D1440, kind: 'tall' },
  { ...D1440, kind: 'wide' },
  { ...M390, kind: 'crop' },
  { ...D1440, kind: 'crop' },
  { ...M390, kind: 'plate' },
  { ...D1440, kind: 'plate' },
  { tag: '768x1024', w: 768, h: 1024, dpr: 2, mobile: true, kind: 'wide' },
  { tag: '1366x768', w: 1366, h: 768, dpr: 1.5, mobile: false, kind: 'wide' },
];

fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(OUT_JPG, { recursive: true });

const css = readProposalCss();
const srv = await serveRepo();
const br = await openChrome();
let done = 0, fail = 0;
const log = [];

try {
  for (const j of JOBS) {
    const name = `aio59-${j.tag}-${j.kind}`;
    try {
      await br.viewport(j);
      await br.goto(`${srv.base}/feed/`);
      if (j.kind === 'wide') await br.evaluate(patchScript(css, { src: POSTER_SRC, poster: true }));
      if (j.kind === 'plate') await br.evaluate(patchScript(css, { src: WIDE_SRC }));
      if (j.kind === 'crop') await br.evaluate(cropScript());
      if (j.kind !== 'tall') await br.settle();

      /* กันภาพที่ "ดูเหมือนถ่ายได้" แต่กล่องยังว่าง — ถ้ากรอบหรือภาพไม่พร้อม ให้ล้มตรงนี้
         ดีกว่าส่งภาพเปล่าให้ลูกค้าอนุมัติ */
      const m = await br.evaluate(MEASURE);
      if (!m.frame || m.frame.h < 100) throw new Error(`กรอบฟีดสูง ${m.frame && m.frame.h}px`);
      if (!m.vis || !m.vis.natW) throw new Error('ภาพในกล่องยังไม่ถอดรหัส');
      const wantClip = j.kind === 'wide' || j.kind === 'plate';
      if (wantClip && !m.clip) throw new Error('แพตช์ติดแต่ไม่เกิดกล่อง .clip');
      if (!wantClip && m.clip) throw new Error('ใบนี้ไม่ควรมี .clip');

      fs.writeFileSync(path.join(OUT_PNG, `${name}.png`), await br.shot());
      fs.writeFileSync(path.join(OUT_JPG, `${name}.jpg`), await br.shot({ jpeg: true }));
      log.push({ name, frame: [m.frame.w, m.frame.h], clip: m.clip ? [m.clip.w, m.clip.h] : null,
        src: m.vis.src.replace(srv.base, '') });
      done++;
      process.stdout.write(`\r[${done}/${JOBS.length}] ${name}`.padEnd(70));
    } catch (e) {
      fail++;
      console.log(`\nถ่ายไม่สำเร็จ: ${name} — ${e.message}`);
    }
  }
} finally {
  br.close();
  srv.stop();
}

console.log(`\nเสร็จ: ${done} ใบ · ล้มเหลว ${fail} ใบ · เรื่องที่ใช้ ${DEMO_SLUG}`);
for (const l of log) {
  const png = fs.statSync(path.join(OUT_PNG, `${l.name}.png`)).size;
  const jpg = fs.statSync(path.join(OUT_JPG, `${l.name}.jpg`)).size;
  console.log(`  ${l.name}  กรอบ ${l.frame.join('×')}`
    + `  กล่องสื่อ ${l.clip ? l.clip.join('×') : '— (เต็มกรอบ)'}`
    + `  ${(png / 1024).toFixed(0)} KB / ${(jpg / 1024).toFixed(0)} KB  ${l.src}`);
}
console.log(`โฟลเดอร์: ${path.relative(ROOT, OUT_PNG)} และ ${path.relative(ROOT, OUT_JPG)}`);
process.exit(fail ? 1 : 0);
