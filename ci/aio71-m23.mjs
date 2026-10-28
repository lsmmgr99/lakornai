/* มิวเทชัน M23 ฉบับวัดด้วยเครื่อง — "กฎ V19 รับ/ปฏิเสธมาร์กอัปของฟีดถูกต้องไหม" ที่ระดับ
   **build จริง** ไม่ใช่ระดับฟังก์ชัน (ระดับฟังก์ชันอยู่ที่ ci/feed-media-window.test.mjs)

   รัน: node ci/aio71-m23.mjs [<คอมมิต>...]        (ค่าตั้งต้น = HEAD)
   ทำอะไร: สำหรับแต่ละคอมมิต `git archive` ลง /tmp (ตรึงต้นไม้ · ไม่แตะรีโป) แล้วต่อแต่ละทิศ
     1) ตั้งเรื่องท้ายคลังเป็น `horizontal` + ใส่ fixture ภาพกว้าง 2640×1200 ให้ทุกเรื่อง
        (VP8L ที่หัวไฟล์ประกาศขนาดจริง ⇒ ผ่าน V15/V16 โดยไม่ต้องมีเบราว์เซอร์)
     2) แพตช์ **renderer** ของฟีดให้พ่นมาร์กอัปแบบที่ทิศนั้นต้องการ
     3) รัน `node build/build.mjs` แล้วตัดสินด้วย `verdict()` ข้างล่าง — **ป้ายของกฎ** (ปฏิเสธ /
        รับ / ตัดสินไม่ได้ / ไม่ทำงาน) ไม่ใช่แค่ exit code
   แล้วพิมพ์ตารางเทียบทุกคอมมิต + JSON ⇒ เลขในรายงานถูก **สร้าง** ไม่ใช่พิมพ์มือ
   (บทเรียนของรีโปนี้: ตัวเลขที่พิมพ์ซ้ำสองที่เลื่อนออกจากกันได้ในวันเดียว)

   ทำไมต้องวัดที่ build จริงด้วย: รอบ AIO-71 วัด M23 ห้าทิศแล้วเขียวทั้งห้า ขณะที่ตัวตัดสิน
   รับโครงที่ไม่มีใน DOM และปฏิเสธโครงที่มีจริง (Reviewer-Codex R1/R2) ⇒ ทิศที่วัดต้องครอบ
   "ของที่อยู่ในที่ที่เบราว์เซอร์ไม่อ่านเป็นอิลิเมนต์" ไม่ใช่แค่ "มี/ไม่มี"

   และทำไมสคริปต์นี้ **ไม่ใช่** ด่านของรูปมาร์กอัป: มันต้อง build ทั้งเว็บ 18 ครั้งต่อคอมมิต
   ⇒ ไม่อยู่ใน `node --test ci/*.test.mjs` · ด่านของรูปมาร์กอัปที่รันทุกครั้งคือ
   ci/feed-media-window.test.mjs (เฉลยจาก Chrome) และเกณฑ์ของสคริปต์นี้เองมีเทสต์ของตัวเองที่
   ci/aio71-m23-verdict.test.mjs (รีวิวรอบที่ห้าโจมตีเกณฑ์เดิมได้สำเร็จทั้งสองฝั่ง) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* ที่เก็บ git ที่ใช้ `git archive` — แยกจาก ROOT เพราะใบงานสั่งให้ "ตรึงคอมมิตก่อนตรวจ" ⇒ ตัว
   สคริปต์เองมักถูกรันจาก **สำเนาที่ตรึงแล้ว** ซึ่งไม่มี .git (Reviewer-Claude ก7 ข้อย่อยที่สาม:
   `fatal: not a git repository`) ⇒ ชี้ที่เก็บด้วย M23_GIT_DIR ได้ */
const GIT_DIR = process.env.M23_GIT_DIR || path.join(ROOT, '.git');
const TWO = '<div class="mwin"><div class="clip"></div></div>';
/* โครงครบสามชั้นที่ยืนได้ด้วยตัวเอง — ใช้กับทิศ "อยู่ในที่ที่เบราว์เซอร์ไม่อ่านเป็นอิลิเมนต์"
   ต้องเป็นโครงครบ ไม่ใช่สองชั้นที่ฝากปู่ไว้กับกล่องจริง ไม่งั้นโซ่ขาดที่ตัวครอบเองและทิศนั้น
   แดงด้วยเหตุผลที่ไม่ใช่สิ่งที่กำลังวัด (วัดแล้ว: ของเดิมแดงทั้งที่รอยยังเปิด) */
const FULL = `<div class="player full">${TWO}</div>`;
const ANCHOR = 'data-orientation="${first.orientation}">';

/* ทิศที่วัด · `want` = ผลที่ **ถูก** (เทียบกับที่เบราว์เซอร์เห็น ไม่ใช่กับที่ regex เห็น)
   ค่าของ `want` เป็น **สิ่งที่กฎทำ** ไม่ใช่สถานะออกของ build:
     'ปฏิเสธ'       — กฎรันแล้วล้ม พร้อมข้อความของกฎเอง
     'รับ'          — กฎรันแล้วผ่าน (บรรทัด `✓ กฎ V19:` ที่ build พิมพ์)
     'ตัดสินไม่ได้'  — มาร์กอัปอยู่นอกไวยากรณ์ที่ตัวแกะโมเดล ⇒ ล้มพร้อมบอกว่าตัดสินไม่ได้
     'ไม่ทำงาน'     — เงื่อนไขของกฎไม่เข้า (ไม่มีเรื่องแนวนอน) ⇒ build ผ่านโดยกฎไม่พูดอะไร
   ของเดิมเทียบแต่ `status === 0 ? 'ผ่าน' : 'ล้ม'` ⇒ **ความล้มด้วยเหตุอื่นนับเป็นการจับของกฎ**
   (Reviewer-Codex R7 แทน build ของแปดทิศลบด้วย throw ที่ไม่เกี่ยวกับ V19 แล้วยังได้ 11/11 ·
   Reviewer-Claude ก7 วัดทิศปลอมที่ renderer พังเลยแล้วได้ 12/12) */
export const CASES = [
  { id: 'ไม่มีสองชั้น (รีโปวันนี้)', inject: '', want: 'ปฏิเสธ' },
  { id: 'ซ้อนกันจริง', inject: TWO, want: 'รับ' },
  { id: 'พี่น้องกัน ไม่ซ้อน', inject: '<div class="mwin"></div><div class="clip"></div>', want: 'ปฏิเสธ' },
  { id: 'ในคอมเมนต์ + ในสตริงของ <script>', inject: `<!-- ${FULL} --><script>var h="${FULL.replace(/"/g, "'")}";</script>`, want: 'ปฏิเสธ' },
  { id: 'ใน <template>', inject: `<template>${FULL}</template>`, want: 'ปฏิเสธ' },
  { id: 'ใน <textarea>', inject: `<textarea>${FULL}</textarea>`, want: 'ปฏิเสธ' },
  { id: 'ใน <noscript>', inject: `<noscript>${FULL}</noscript>`, want: 'ปฏิเสธ' },
  { id: 'คลาสเป็นข้อความในค่าแอตทริบิวต์', inject: `<div title=' class="player full"'>${TWO}</div>`, want: 'ปฏิเสธ' },
  { id: '<div/> คั่น (HTML ไม่ถือเป็นแท็กปิด)', inject: '<div class="mwin"><div/><div class="clip"></div></div>', want: 'ปฏิเสธ' },
  { id: 'class ไม่ใส่ quote (HTML ถูกต้อง)', inject: '<div class=mwin><div class=clip></div></div>', want: 'รับ' },
  /* ---- หกทิศของรีวิวรอบที่ห้า (ของเดิมตอบผิดทั้งหกที่ระดับ build · Reviewer-Codex R1) ---- */
  { id: 'ใน <iframe> (fallback content)', inject: `<iframe>${FULL}</iframe>`, want: 'ปฏิเสธ' },
  { id: 'หลัง <plaintext>', inject: `<plaintext>${FULL}`, want: 'ปฏิเสธ' },
  { id: 'svg ที่ปิดตัวเองคั่นกลาง', inject: '<svg class="mwin"/><div class="clip"></div>', want: 'ปฏิเสธ' },
  { id: '<!--> นำหน้าโครงจริง', inject: `<!-->${TWO}`, want: 'รับ' },
  { id: 'entity ในค่า class (mw&#105;n)', inject: '<div class="mw&#105;n"><div class="clip"></div></div>', want: 'รับ' },
  { id: '<svg class=mwin> ครอบ (breakout) ⇒ นอกขอบเขต', inject: '<svg class="mwin"><div class="clip"></div></svg>', want: 'ตัดสินไม่ได้' },
  { id: '<table class=mwin> ครอบ ⇒ นอกขอบเขต', inject: '<table class="mwin"><div class="clip"></div></table>', want: 'ตัดสินไม่ได้' },
  { id: 'ไม่มีเรื่องแนวนอนเลย (กฎไม่ทำงาน)', inject: '', horizontal: false, want: 'ไม่ทำงาน' },
];

/* เกณฑ์ตัดสินของทิศหนึ่ง — แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพื่อให้ **ตัวเกณฑ์เองถูกทดสอบได้**
   (ci/aio71-m23-verdict.test.mjs โจมตีมันด้วยเอาต์พุตของ build ที่ล้มด้วยเหตุอื่น) */
export function verdict({ status, out }) {
  const line = re => (out.split('\n').find(l => re.test(l)) || '').trim();
  const cantTell = line(/ตัดสินกฎ V19 ไม่ได้/);
  if (cantTell) return { got: status === 0 ? 'ไม่สอดคล้อง' : 'ตัดสินไม่ได้', mark: cantTell };
  const refused = line(/กล่องสื่อสองชั้นตามกฎ AIO-59|กฎ V19: หาหน้า/);
  if (refused) return { got: status === 0 ? 'ไม่สอดคล้อง' : 'ปฏิเสธ', mark: refused };
  const accepted = line(/^✓ กฎ V19:/);
  if (accepted) return { got: status === 0 ? 'รับ' : 'ไม่สอดคล้อง', mark: accepted };
  /* ไม่มีป้ายของกฎเลย: ถ้า build ผ่าน = กฎไม่ทำงาน (เงื่อนไขไม่เข้า) · ถ้า build ล้ม =
     ล้มด้วยเหตุอื่น ซึ่ง **ห้ามนับเป็นการจับของกฎ** */
  return { got: status === 0 ? 'ไม่ทำงาน' : 'ล้มด้วยเหตุอื่น', mark: '' };
}

const mkWide = (w, h) => {
  const bits = [];
  const push = (v, n) => { for (let i = 0; i < n; i++) bits.push((v >> i) & 1); };
  push(0x2f, 8); push(w - 1, 14); push(h - 1, 14); push(0, 1); push(0, 3);
  while (bits.length % 8) bits.push(0);
  const body = Buffer.alloc(bits.length / 8 + 64);
  for (let i = 0; i < bits.length; i++) body[i >> 3] |= bits[i] << (i & 7);
  const len = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const chunk = Buffer.concat([Buffer.from('VP8L'), len(body.length), body]);
  return Buffer.concat([Buffer.from('RIFF'), len(4 + chunk.length), Buffer.from('WEBP'), chunk]);
};

const run = (commit, c) => {
  /* ชื่อโฟลเดอร์ติด pid — ด่าน lifecycle เทียบ /tmp/<prefix>-* ทั้งเครื่อง ⇒ ชื่อที่ชนกับ
     run อื่นทำให้ด่านของคนอื่นแดงด้วยของเรา (บทเรียนเดิม) */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `m23-${process.pid}-`));
  try {
    const tar = spawnSync('bash', ['-c',
      `git --git-dir=${GIT_DIR} archive ${commit} | tar -x -C ${dir}`], { encoding: 'utf8' });
    if (tar.status !== 0) throw new Error(`git archive ${commit} ล้ม: ${tar.stderr}`);
    const cj = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
    if (c.horizontal !== false) {
      const wide = mkWide(2640, 1200);
      fs.mkdirSync(path.join(dir, 'assets/covers-wide'), { recursive: true });
      for (const s of cj.series) {
        fs.writeFileSync(path.join(dir, `assets/covers-wide/${s.slug}.webp`), wide);
        s.coverWide = `assets/covers-wide/${s.slug}.webp`;
      }
      cj.series[cj.series.length - 1].orientation = 'horizontal';
      fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify(cj, null, 2) + '\n');
    }
    if (c.inject) {
      const rel = 'build/pages-discovery.mjs';
      const src = fs.readFileSync(path.join(dir, rel), 'utf8');
      if (!src.includes(ANCHOR)) throw new Error(`หาจุดแพตช์ใน ${rel} ไม่เจอ — ย้ายจุดแพตช์ ไม่ใช่ลบทิศ`);
      fs.writeFileSync(path.join(dir, rel), src.replace(ANCHOR, `${ANCHOR}\n          ${c.inject}`));
    }
    const b = spawnSync('node', ['build/build.mjs'], { cwd: dir, encoding: 'utf8' });
    const out = `${b.stdout || ''}\n${b.stderr || ''}`;
    const v = verdict({ status: b.status, out });
    return { got: v.got, exit: b.status, v19: v.mark.slice(0, 150) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/* ---------- ตัวขับ ---------- */
/* ทำงานเฉพาะเมื่อถูกเรียกเป็นสคริปต์ · ที่ต้องมีด่านนี้เพราะ ci/aio71-m23-verdict.test.mjs
   `import` ไฟล์นี้เพื่อทดสอบ `verdict()` และ `CASES` ⇒ ถ้าตัวขับรันตอน import เทสต์จะไป build
   ทั้งเว็บ 18 ครั้ง */
const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (!invokedDirectly) {
  /* ไม่มีผลข้างเคียงใด ๆ ตอน import */
} else {
const commits = process.argv.slice(2);
if (!commits.length) commits.push('HEAD');
const results = {};
for (const commit of commits) {
  results[commit] = CASES.map(c => ({ id: c.id, want: c.want, ...run(commit, c) }));
}
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - [...s].length));
console.log(pad('ทิศที่วัด', 46) + pad('ที่ถูก', 14) + commits.map(c => pad(c.slice(0, 9), 16)).join(''));
for (let i = 0; i < CASES.length; i++) {
  console.log(pad(CASES[i].id, 46) + pad(CASES[i].want, 14)
    + commits.map(c => pad(results[c][i].got + (results[c][i].got === CASES[i].want ? '' : ' ✗'), 16)).join(''));
}
for (const c of commits) {
  const bad = results[c].filter(r => r.got !== r.want);
  console.log(`\n${c}: ตรงกับที่ถูก ${results[c].length - bad.length}/${results[c].length}`
    + (bad.length ? ` · ที่ไม่ตรง: ${bad.map(b => b.id).join(' · ')}` : ''));
}
if (process.env.M23_JSON) fs.writeFileSync(process.env.M23_JSON, JSON.stringify(results, null, 2) + '\n');
/* ออกไม่ศูนย์ตามผลของ **คอมมิตสุดท้าย** = ตัวที่กำลังถูกวัด · คอมมิตก่อนหน้าคือฐานเทียบที่
   *ควร* ไม่ตรง (นั่นคือทั้งหมดที่มิวเทชันนี้มีไว้แสดง) ⇒ ของเดิมมี `&& commits.length === 1`
   ซึ่งทำให้รูปสองคอมมิตที่ใบงานสั่งเอง **คืน 0 เสมอ** แม้ตัวที่วัดจะไม่ตรง (Reviewer-Claude ก7) */
const last = commits[commits.length - 1];
const lastBad = results[last].filter(r => r.got !== r.want);
if (lastBad.length) {
  console.error(`\n✗ ${last} (ตัวที่กำลังวัด) ไม่ตรง ${lastBad.length} ทิศ ⇒ ออกด้วยสถานะ 1`);
}
process.exit(lastBad.length ? 1 : 0);
}
