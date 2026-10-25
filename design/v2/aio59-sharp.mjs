/* AIO-59 · วัด "ย่านคม" ของแผ่นกว้าง 11:5 ทั้งชุด — ทำให้เลขในเอกสารเป็นของที่รันซ้ำได้
   UX-Designer · 25 ต.ค. 2026

   ทำไมมีไฟล์นี้: §5 ของ AIO-59-FEED-ORIENTATION.md เคยเขียนย่านคมไว้ที่ 0.54–0.91 และ
   ข้อสังเกตท้าย check-aio59.mjs เขียนไว้ที่ 0.55–0.91 — ต่างกันหนึ่งขั้นปัด เพราะทั้งคู่เป็น
   ข้อความที่พิมพ์มือจากการวัดครั้งเดียวที่ไม่ได้เก็บวิธีไว้ · เลขนี้คือเลขที่ส่งถึง CTO เป็นเหตุผล
   ของกฎ M1/M2 ⇒ ต้องวัดได้ซ้ำ ไม่ใช่จำไว้ในย่อหน้า

   นิยามที่ใช้ (ตั้งไว้ตรงนี้ให้ใครก็เถียงกับนิยามได้ ไม่ต้องเถียงกับตัวเลข)
   ------------------------------------------------------------------
   1. ถอดรหัสไฟล์ลงแคนวาสขนาดจริง (2640×1200) อ่านความสว่าง Rec.709 ต่อพิกเซล
   2. พลังงานความถี่สูงของคอลัมน์ x = ค่าเฉลี่ยของ |L(x+1,y) - L(x-1,y)| ทุกแถว y
      (ผลต่างกลาง — จับ "ขอบ" ซึ่งพื้นเบลอไม่มี)
   3. เกลี่ยด้วยหน้าต่าง 2% ของความกว้าง กันเส้นเดี่ยว ๆ ทำให้ย่านขยายเกินจริง
   4. "ย่านคม" = ช่วงต่อเนื่องที่ยาวที่สุดซึ่งพลังงาน >= 25% ของคอลัมน์ที่สูงสุดของไฟล์นั้น
      (เกณฑ์สัมพัทธ์ ⇒ ไฟล์มืด/สว่างเทียบกันได้)
   5. ศูนย์ถ่วง = ผลรวมถ่วงน้ำหนัก x ด้วยพลังงานทั้งภาพ

   รัน: node design/v2/aio59-sharp.mjs   → พิมพ์ตาราง + เขียน design/v2/aio59-sharp.json
*/
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './lib.mjs';
import { serveRepo, openChrome } from './aio59-lib.mjs';

const WIDE_DIR = path.join(DIR, 'wide-out');
const OUT = path.join(DIR, 'aio59-sharp.json');

/* กรอบที่กล่องสื่อ 16:9 เหลือไว้จากไฟล์ 11:5 — ตัดข้างละ (1 - (16/9)/(11/5)) / 2 */
const KEEP = (16 / 9) / (11 / 5);
const CUT_SIDE = (1 - KEEP) / 2;

/* สคริปต์ที่รันในหน้าเว็บ · ห้ามมี backtick ข้างใน (ตัวนี้ถูกส่งเป็น template literal) */
const probe = url => `(async () => {
  const im = new Image();
  im.decoding = 'sync';
  im.src = ${JSON.stringify(url)};
  await im.decode();
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = new OffscreenCanvas(w, h);
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0);
  const d = cx.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  }
  const raw = new Float64Array(w);
  for (let x = 1; x < w - 1; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) s += Math.abs(L[y * w + x + 1] - L[y * w + x - 1]);
    raw[x] = s / h;
  }
  const win = Math.max(1, Math.round(w * 0.02));
  const sm = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -win; k <= win; k++) {
      const j = x + k;
      if (j >= 0 && j < w) { s += raw[j]; n++; }
    }
    sm[x] = s / n;
  }
  let max = 0;
  for (let x = 0; x < w; x++) if (sm[x] > max) max = sm[x];
  const th = max * 0.25;
  let best = null, cur = null;
  for (let x = 0; x < w; x++) {
    if (sm[x] >= th) { if (!cur) cur = { a: x, b: x }; else cur.b = x; }
    else if (cur) { if (!best || cur.b - cur.a > best.b - best.a) best = cur; cur = null; }
  }
  if (cur && (!best || cur.b - cur.a > best.b - best.a)) best = cur;
  let tot = 0, wsum = 0;
  for (let x = 0; x < w; x++) { tot += sm[x]; wsum += sm[x] * x; }
  return { w, h, a: best ? best.a / w : null, b: best ? (best.b + 1) / w : null, c: wsum / tot / w };
})()`;

const r3 = v => +v.toFixed(3);

const main = async () => {
  const files = fs.readdirSync(WIDE_DIR).filter(f => f.endsWith('.webp')).sort();
  if (!files.length) throw new Error(`ไม่พบไฟล์ .webp ใน ${WIDE_DIR}`);
  const srv = await serveRepo();
  const br = await openChrome();
  const rows = [];
  try {
    await br.goto(`${srv.base}/feed/`); /* ต้องมีหน้าจริงก่อน ไม่งั้น about:blank ไม่มี origin ให้โหลดภาพ */
    for (const f of files) {
      const v = await br.evaluate(probe(`${srv.base}/design/v2/wide-out/${f}`));
      if (v.a === null) throw new Error(`หาย่านคมใน ${f} ไม่ได้`);
      rows.push({ file: f, w: v.w, h: v.h, a: r3(v.a), b: r3(v.b), c: r3(v.c) });
    }
  } finally {
    br.close(); srv.stop();
  }

  const mins = rows.map(r => r.a), maxs = rows.map(r => r.b), cs = rows.map(r => r.c);
  const band = { aMin: Math.min(...mins), aMax: Math.max(...mins), bMin: Math.min(...maxs), bMax: Math.max(...maxs), cMin: Math.min(...cs), cMax: Math.max(...cs) };

  /* ย่านคมที่ยังอยู่รอดในกล่อง 16:9 (ตัดข้างละ CUT_SIDE) และสัดส่วนที่ "สิ่งที่เห็น" เป็นของคม */
  const vis = { a: CUT_SIDE, b: 1 - CUT_SIDE };
  const overlap = (a, b) => Math.max(0, Math.min(b, vis.b) - Math.max(a, vis.a));
  const sharpShare = rows.map(r => +(overlap(r.a, r.b) / (vis.b - vis.a) * 100).toFixed(1));

  console.log(`\nAIO-59 · ย่านคมของแผ่นกว้าง ${rows.length} ใบ · เกณฑ์ 25% ของคอลัมน์สูงสุด เกลี่ย 2%`);
  console.log('| ไฟล์ | ขนาด | ย่านคม (ส่วนของความกว้าง) | ศูนย์ถ่วง | ส่วนที่คมใน 16:9 |');
  console.log('|---|---|---|---|---|');
  rows.forEach((r, i) => console.log(`| ${r.file} | ${r.w}×${r.h} | ${r.a}–${r.b} | ${r.c} | ${sharpShare[i]}% |`));
  console.log(`\nขอบซ้ายของย่านคม: ${band.aMin}–${band.aMax} · ขอบขวา: ${band.bMin}–${band.bMax} · ศูนย์ถ่วง: ${band.cMin}–${band.cMax}`);
  console.log(`กล่อง 16:9 เห็นไฟล์ช่วง ${r3(vis.a)}–${r3(vis.b)} (ตัดข้างละ ${(CUT_SIDE * 100).toFixed(1)}%)`);
  console.log(`ส่วนที่เห็นในกล่องซึ่งเป็นย่านคม: ${Math.min(...sharpShare)}–${Math.max(...sharpShare)}%\n`);

  fs.writeFileSync(OUT, JSON.stringify({
    at: new Date().toISOString().slice(0, 10),
    method: 'central-difference luminance energy per column · smooth 2% · band >= 25% of max',
    cutSidePct: +(CUT_SIDE * 100).toFixed(1),
    band, rows, sharpShareIn169: sharpShare,
  }, null, 2) + '\n');
  console.log(`เขียน ${path.relative(process.cwd(), OUT)} แล้ว`);
};

main().catch(e => { console.error(`ล้มเหลว: ${e.message}`); process.exit(1); });
