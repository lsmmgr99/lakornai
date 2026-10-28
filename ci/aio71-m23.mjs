/* มิวเทชัน M23 ฉบับวัดด้วยเครื่อง — "กฎ V19 รับ/ปฏิเสธมาร์กอัปของฟีดถูกต้องไหม" ที่ระดับ
   **build จริง** ไม่ใช่ระดับฟังก์ชัน (ระดับฟังก์ชันอยู่ที่ ci/feed-media-window.test.mjs)

   รัน: node ci/aio71-m23.mjs [<คอมมิต>...]        (ค่าตั้งต้น = HEAD)
   ทำอะไร: สำหรับแต่ละคอมมิต `git archive` ลง /tmp (ตรึงต้นไม้ · ไม่แตะรีโป) แล้วต่อแต่ละทิศ
     1) ตั้งเรื่องท้ายคลังเป็น `horizontal` + ใส่ fixture ภาพกว้าง 2640×1200 ให้ทุกเรื่อง
        (VP8L ที่หัวไฟล์ประกาศขนาดจริง ⇒ ผ่าน V15/V16 โดยไม่ต้องมีเบราว์เซอร์)
     2) แพตช์ **renderer** ของฟีดให้พ่นมาร์กอัปแบบที่ทิศนั้นต้องการ
     3) รัน `node build/build.mjs` แล้วบันทึก exit code + บรรทัดที่มีคำว่า "กฎ V19"
   แล้วพิมพ์ตารางเทียบทุกคอมมิต + JSON ⇒ เลขในรายงานถูก **สร้าง** ไม่ใช่พิมพ์มือ
   (บทเรียนของรีโปนี้: ตัวเลขที่พิมพ์ซ้ำสองที่เลื่อนออกจากกันได้ในวันเดียว)

   ทำไมต้องวัดที่ build จริงด้วย: รอบ AIO-71 วัด M23 ห้าทิศแล้วเขียวทั้งห้า ขณะที่ตัวตัดสิน
   รับโครงที่ไม่มีใน DOM และปฏิเสธโครงที่มีจริง (Reviewer-Codex R1/R2) ⇒ ทิศที่วัดต้องครอบ
   "ของที่อยู่ในที่ที่เบราว์เซอร์ไม่อ่านเป็นอิลิเมนต์" ไม่ใช่แค่ "มี/ไม่มี" */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TWO = '<div class="mwin"><div class="clip"></div></div>';
/* โครงครบสามชั้นที่ยืนได้ด้วยตัวเอง — ใช้กับทิศ "อยู่ในที่ที่เบราว์เซอร์ไม่อ่านเป็นอิลิเมนต์"
   ต้องเป็นโครงครบ ไม่ใช่สองชั้นที่ฝากปู่ไว้กับกล่องจริง ไม่งั้นโซ่ขาดที่ตัวครอบเองและทิศนั้น
   แดงด้วยเหตุผลที่ไม่ใช่สิ่งที่กำลังวัด (วัดแล้ว: ของเดิมแดงทั้งที่รอยยังเปิด) */
const FULL = `<div class="player full">${TWO}</div>`;
const ANCHOR = 'data-orientation="${first.orientation}">';

/* ทิศที่วัด · `want` = ผลที่ **ถูก** (เทียบกับที่เบราว์เซอร์เห็น ไม่ใช่กับที่ regex เห็น) */
const CASES = [
  { id: 'ไม่มีสองชั้น (รีโปวันนี้)', inject: '', want: 'ล้ม' },
  { id: 'ซ้อนกันจริง', inject: TWO, want: 'ผ่าน' },
  { id: 'พี่น้องกัน ไม่ซ้อน', inject: '<div class="mwin"></div><div class="clip"></div>', want: 'ล้ม' },
  { id: 'ในคอมเมนต์ + ในสตริงของ <script>', inject: `<!-- ${FULL} --><script>var h="${FULL.replace(/"/g, "'")}";</script>`, want: 'ล้ม' },
  { id: 'ใน <template>', inject: `<template>${FULL}</template>`, want: 'ล้ม' },
  { id: 'ใน <textarea>', inject: `<textarea>${FULL}</textarea>`, want: 'ล้ม' },
  { id: 'ใน <noscript>', inject: `<noscript>${FULL}</noscript>`, want: 'ล้ม' },
  { id: 'คลาสเป็นข้อความในค่าแอตทริบิวต์', inject: `<div title=' class="player full"'>${TWO}</div>`, want: 'ล้ม' },
  { id: '<div/> คั่น (HTML ไม่ถือเป็นแท็กปิด)', inject: '<div class="mwin"><div/><div class="clip"></div></div>', want: 'ล้ม' },
  { id: 'class ไม่ใส่ quote (HTML ถูกต้อง)', inject: '<div class=mwin><div class=clip></div></div>', want: 'ผ่าน' },
  { id: 'ไม่มีเรื่องแนวนอนเลย (กฎไม่ทำงาน)', inject: '', horizontal: false, want: 'ผ่าน' },
];

const commits = process.argv.slice(2);
if (!commits.length) commits.push('HEAD');

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
      `git -C ${ROOT} archive ${commit} | tar -x -C ${dir}`], { encoding: 'utf8' });
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
    const v19 = out.split('\n').find(l => /กฎ V19|กล่องสื่อสองชั้น/.test(l)) || '';
    return { got: b.status === 0 ? 'ผ่าน' : 'ล้ม', exit: b.status, v19: v19.trim().slice(0, 150) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const results = {};
for (const commit of commits) {
  results[commit] = CASES.map(c => ({ id: c.id, want: c.want, ...run(commit, c) }));
}
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - [...s].length));
console.log(pad('ทิศที่วัด', 44) + pad('ที่ถูก', 8) + commits.map(c => pad(c.slice(0, 9), 11)).join(''));
for (let i = 0; i < CASES.length; i++) {
  console.log(pad(CASES[i].id, 44) + pad(CASES[i].want, 8)
    + commits.map(c => pad(results[c][i].got + (results[c][i].got === CASES[i].want ? '' : ' ✗'), 11)).join(''));
}
for (const c of commits) {
  const bad = results[c].filter(r => r.got !== r.want);
  console.log(`\n${c}: ตรงกับที่ถูก ${results[c].length - bad.length}/${results[c].length}`
    + (bad.length ? ` · ที่ไม่ตรง: ${bad.map(b => b.id).join(' · ')}` : ''));
}
if (process.env.M23_JSON) fs.writeFileSync(process.env.M23_JSON, JSON.stringify(results, null, 2) + '\n');
process.exit(commits.some(c => results[c].some(r => r.got !== r.want)) && commits.length === 1 ? 1 : 0);
