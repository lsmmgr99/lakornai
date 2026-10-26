/* ============================================================================
   AIO-74 · ภาพหลักฐาน — ทุกใบเป็น "กรอบจอเดียว"
   UX-Designer · 26 ต.ค. 2026

   รัน:  AIO74_TREE=/tmp/aio74-pin-<pid> node design/v2/aio74-frames.mjs

   ของที่เขียนออก
     design/v2/shots/aio74-<ขนาด>-<before|after>.png   เว็บจริง สภาพวันนี้ / ทรงที่เสนอ
     design/v2/shots/aio74-sheet-<ขนาด>-<objpos>.png   แผ่นเทียบปกจริง 12 ใบ ต่อหนึ่งค่า object-position
     design/v2/shots-jpeg/<ชื่อเดียวกัน>.jpg            เด็คเบาสำหรับแนบบนบอร์ด (ลิมิต 10 MB)

   ทุกใบไม่ตั้ง captureBeyondViewport ไม่ยืด viewport ตามความสูงหน้า ไม่เลื่อนหน้า
   ใบงานสั่งย้ำข้อนี้: ภาพเลื่อนทั้งหน้าคือเหตุที่บั๊กฮีโร่หลุดถึงลูกค้ามาแล้วสามรอบ
   เพราะมันตอบไม่ได้เลยว่า "อะไรอยู่ในจอแรก" และ "ภาพกินที่เท่าไรของจอ"

   แผ่นเทียบปก: กล่องในแผ่นใช้ **สัดส่วนกล่องที่วัดได้จริง** จาก aio74-measured.json
   ไม่ใช่สัดส่วนที่พิมพ์มือ ⇒ ถ้าเรขาคณิตเปลี่ยน แผ่นเปลี่ยนตามเอง
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './lib.mjs';
import {
  VIEWPORTS, MOBILE_SWEEP, patchScript, serveTree, openChrome, go, TREE, OUT, sleep,
} from './aio74-lib.mjs';

const OUT_PNG = path.join(DIR, 'shots');
const OUT_JPG = path.join(DIR, 'shots-jpeg');
const STATE = process.env.AIO74_STATE || 'A2';      /* ทรงที่เสนอ */
const SHEET_POS = (process.env.AIO74_SHEET_POS || '50% 50%|50% 35%|center 22%').split('|');

const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const boxOf = (tag, state) => {
  const r = data.rows.find(x => x.vp === tag && x.state === state);
  if (!r) throw new Error(`ไม่มีผลวัดของ ${tag}/${state} ใน ${OUT} — รัน aio74-map.mjs ก่อน`);
  return r.box;
};

/* ใบเว็บจริง: ครบ 7 ขนาดของ AIO-38 ในทรงที่เสนอ + คู่ before/after ของจอมือถือทุกขนาดที่กวาด
   (จอเดสก์ท็อป/แท็บเล็ตไม่มี before/after เพราะไม่มีอะไรขยับ — พิสูจน์ด้วยตัวเลข ไม่ใช่ภาพซ้ำ) */
const FRAMES = [
  ...VIEWPORTS.map(vp => ({ vp, state: STATE, name: `aio74-${vp.tag}-after` })),
  ...MOBILE_SWEEP.map(vp => ({ vp, state: 'today', name: `aio74-${vp.tag}-before` })),
  ...MOBILE_SWEEP.filter(vp => !VIEWPORTS.some(v => v.tag === vp.tag))
    .map(vp => ({ vp, state: STATE, name: `aio74-${vp.tag}-after` })),
  /* ทาง B ที่ไม่เลือก — ลูกค้าต้องเห็นของที่ถูกปฏิเสธด้วย ไม่ใช่เห็นแต่ของที่เราเชียร์ */
  { vp: MOBILE_SWEEP.find(v => v.tag === '390x844'), state: 'B', name: 'aio74-390x844-wayB' },
  { vp: MOBILE_SWEEP.find(v => v.tag === '360x640'), state: 'B', name: 'aio74-360x640-wayB' },
];

/* ---------- แผ่นเทียบปกจริง 12 ใบ ----------
   จอที่ใช้ = จอเดียวกับที่ตัววัดเลือกไว้ใน aio74-measured.json (คับสุด + จอที่ลูกค้าใช้)
   ไม่ใส่ผ้าคลุมไล่สี (`.hero .bg::after`) ในแผ่นนี้โดยตั้งใจ: แผ่นนี้ตอบคำถามเดียว
   "หัวตัวละครโดนตัดไหม" ⇒ ถ้าคลุมด้วยไล่สี จะอ่านขอบล่างไม่ออก · ความอ่านออกของตัวหนังสือ
   ดูจากใบเว็บจริง (after) ซึ่งมีไล่สีและตัวหนังสือจริงทั้งหมด */
const sheetHtml = (tag, objPos, covers, box) => `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>AIO-74 · ${tag} · ${objPos}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b0a0e;color:#f4f2f7;
       font:14px/1.4 system-ui,-apple-system,"Noto Sans Thai",sans-serif;padding:14px 16px}
  h1{font-size:16px;margin:0 0 2px}
  p{margin:0 0 10px;color:#a7a2b3;font-size:12.5px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  figure{margin:0}
  .box{position:relative;aspect-ratio:${box.w} / ${box.h};overflow:hidden;border-radius:10px;background:#15131b}
  .box img{width:100%;height:100%;object-fit:cover;object-position:${objPos}}
  figcaption{font-size:11.5px;color:#a7a2b3;margin-top:4px;text-align:center}
</style></head><body>
<h1>AIO-74 · การครอปปกจริง 12 ใบ ที่จอ ${tag} · object-position: ${objPos}</h1>
<p>กล่อง ${box.w}×${box.h}px (สัดส่วน ${(box.w / box.h).toFixed(3)}) = ทรงที่วัดได้จากทางที่เสนอ ·
   ไฟล์ปกทุกใบ 1024×1536 · object-fit: cover · ไม่มีผ้าคลุมไล่สีในแผ่นนี้</p>
<div class="grid">
${covers.map(f => `  <figure><div class="box"><img src="/assets/covers/${f}" alt=""></div>
    <figcaption>${f.replace(/\.webp$/, '')}</figcaption></figure>`).join('\n')}
</div></body></html>`;

fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(OUT_JPG, { recursive: true });

const srv = await serveTree(TREE);
const page = await openChrome();
const wrote = [];
const save = async (name) => {
  const png = await page.shot();
  fs.writeFileSync(path.join(OUT_PNG, `${name}.png`), png);
  const jpg = await page.shot({ jpeg: true });
  fs.writeFileSync(path.join(OUT_JPG, `${name}.jpg`), jpg);
  wrote.push({ name, png: png.length, jpg: jpg.length });
  process.stdout.write(`\r  ${wrote.length} ใบ · ${name}`.padEnd(56));
};

/* ไฟล์แผ่นเทียบเขียนลงทรีที่เสิร์ฟ (มี pid ในชื่อ กัน run อื่นชนกัน) แล้วลบทิ้งเมื่อจบ */
const sheetFile = `.aio74-sheet-${process.pid}.html`;
const sheetPath = path.join(TREE, sheetFile);
try {
  /* ---------- ใบเว็บจริง ---------- */
  for (const job of FRAMES) {
    await page.viewport(job.vp);
    await go(page, `${srv.base}/`);
    await page.evaluate(patchScript(job.state));
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await sleep(120);
    await save(job.name);
  }

  /* ---------- แผ่นเทียบปก 12 ใบ ---------- */
  for (const cv of data.cropViewports) {
    const box = boxOf(cv.tag, STATE);
    for (const objPos of SHEET_POS) {
      fs.writeFileSync(sheetPath, sheetHtml(cv.tag, objPos, data.covers, box));
      /* แผ่นเทียบเป็นเครื่องมือวินิจฉัยของผม ไม่ใช่ภาพจำลองจอลูกค้า ⇒ ใช้กรอบจอกว้างพอให้
         เห็นหน้าตัวละครทั้ง 12 ใบในเฟรมเดียว แต่ยังเป็น "เฟรมเดียว" ไม่ใช่ภาพเลื่อนหน้า */
      await page.viewport({ w: 1480, h: 1180, dpr: 1, mobile: false });
      await page.send('Page.navigate', { url: `${srv.base}/${sheetFile}` });
      for (let i = 0; i < 150; i++) {
        const ok = await page.evaluate(`document.readyState === 'complete'
          && [...document.images].every(im => im.complete && im.naturalWidth > 0)
          && document.fonts.status === 'loaded'`);
        if (ok === true) break;
        await sleep(80);
      }
      await sleep(150);
      await save(`aio74-sheet-${cv.tag}-${objPos.replace(/[^0-9a-z]+/gi, '')}`);
    }
  }
  console.log('');
} finally {
  fs.rmSync(sheetPath, { force: true });
  page.close();
  srv.stop();
}

const sum = k => wrote.reduce((a, b) => a + b[k], 0);
console.log(`\nเขียน ${wrote.length} ใบ × 2 สกุล`);
console.log(`  PNG ${OUT_PNG} รวม ${(sum('png') / 1e6).toFixed(1)} MB`);
console.log(`  JPG ${OUT_JPG} รวม ${(sum('jpg') / 1e6).toFixed(1)} MB (ลิมิตแนบบนบอร์ด 10 MB)`);
for (const w of wrote) console.log(`  ${w.name.padEnd(34)} ${(w.jpg / 1024).toFixed(0).padStart(5)} KB`);
