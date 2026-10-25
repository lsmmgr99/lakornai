/* เทสต์ของ **ตัวด่านเอง** ไม่ใช่ของเว็บ — วงจรชีวิตและความเป็นเจ้าของพอร์ตของ tools/test-layout.mjs
   รัน: node --test ci/*.test.mjs   (คำสั่งเดียวกับที่ docs/publish-test.md §2 บันทึกไว้)

   ทำไมต้องมี (AIO-66 P1-1/P2-1 · AIO-67 P2-1/P2-3 — สองฝั่งรีวิวทำซ้ำได้ตรงกัน):
     (1) ด่านเคย **วัดเว็บของ run อื่น** แล้วรายงานตัวเลขว่าเป็นของต้นไม้ที่กำลังตรวจ — ทั้งทิศ
         "แดงผิด" และทิศที่อันตรายกว่าคือ "เขียวผิด" (ต้นไม้ของเราพัง + ของเขาดี)
     (2) ทางออกตอนเริ่ม (ONLY สะกดผิด · ไม่พบม็อกอัพ · build ล้ม) ทิ้ง `/tmp/lkn-*` ไว้สอง
         โฟลเดอร์ต่อการรันหนึ่งครั้ง เพราะทรัพยากรถูกสร้างก่อนตัวเก็บกวาดถูกติดตั้ง
   ทั้งสองข้อเป็นชนิด "ด่านรายงานผิดโดยไม่มีใครรู้" ⇒ ต้องมีเทสต์ถาวร ไม่ใช่มิวเทชันที่ต้องทำมือ

   ข้อจำกัดที่รู้ตัว: เครื่องนี้แชร์กับ run อื่นที่รันด่านเดียวกันได้ ⇒ การนับโฟลเดอร์ชั่วคราว
   เทียบก่อน/หลัง มีโอกาสเห็นของคนอื่นโผล่มาระหว่างนั้น · ลดด้วยการรอให้เซ็ตส่วนต่างว่างลง
   ก่อนตัดสิน และนับเฉพาะชื่อที่ "ไม่มีก่อนเริ่ม" เท่านั้น */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(ROOT, 'tools/test-layout.mjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* รากที่ด่านเลือกใช้ — ลอกตรรกะเดียวกันเพื่อให้มองที่เดียวกับที่มันเขียนจริง */
const TMP_ROOTS = [...new Set(['/tmp', os.tmpdir()])];
const tmpDirs = () => new Set(TMP_ROOTS.flatMap(b => {
  try { return fs.readdirSync(b).filter(n => n.startsWith('lkn-')).map(n => path.join(b, n)); } catch { return []; }
}));
async function leftovers(before) {
  for (let i = 0; i < 20; i++) {
    const extra = [...tmpDirs()].filter(d => !before.has(d) && fs.existsSync(d));
    if (!extra.length) return [];
    await sleep(150);
  }
  return [...tmpDirs()].filter(d => !before.has(d) && fs.existsSync(d));
}

function runGate(env, { timeout = 120000 } = {}) {
  return new Promise(res => {
    const p = spawn(process.execPath, [GATE], { cwd: ROOT, env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), timeout);
    p.on('close', code => { clearTimeout(t); res({ code, out }); });
  });
}

const freePort = () => new Promise(res => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

test('ทางออกตอนเริ่ม (ONLY สะกดผิด) ออก 1 และไม่ทิ้งไฟล์ชั่วคราวไว้เลย', async () => {
  const before = tmpDirs();
  const { code, out } = await runGate({ ONLY: 'shapes', SKIP_BUILD: '1' }, { timeout: 30000 });
  assert.equal(code, 1, out.slice(-400));
  assert.match(out, /ONLY=shapes ไม่รู้จัก/);
  assert.deepEqual(await leftovers(before), [], 'เหลือโฟลเดอร์ชั่วคราวค้าง — ทรัพยากรถูกสร้างก่อนตัวเก็บกวาดอีกแล้ว');
});

test('พอร์ตของ run อื่นถือไว้ = ด่านออกก่อนพิมพ์ตัวเลขใด ๆ (ไม่วัดเว็บผิดตัวแล้วเขียว)', async () => {
  const port = await freePort();
  /* "run อื่น" ตัวจริง: เซิร์ฟเวอร์ตัวเดียวกับที่ด่านใช้ ถือพอร์ตไว้ก่อน ⇒ ลูกของด่านผูกไม่ได้ */
  const decoy = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(port)],
    { cwd: ROOT, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/content.json`)).ok) break; } catch { /* ยังไม่ขึ้น */ }
      await sleep(100);
    }
    const before = tmpDirs();
    const { code, out } = await runGate({ ONLY: 'bento', SKIP_BUILD: '1', LAY_PORT: String(port) },
      { timeout: 90000 });
    assert.notEqual(code, 0, out.slice(-600));
    assert.match(out, /ไม่ยืนยันได้ว่าพอร์ต/, out.slice(-600));
    /* ข้อที่สำคัญที่สุดของเทสต์นี้: ต้องไม่มีบรรทัดผลลัพธ์เลย — เลขที่วัดจากต้นไม้ของคนอื่น
       แย่กว่าไม่มีเลข เพราะทุกคน (รวมคนเขียนด่าน) จะเลิกตรวจด้วยมือ */
    assert.doesNotMatch(out, /ผล: ผ่าน/, 'ด่านพิมพ์ตัวเลขออกมาทั้งที่ยังไม่พิสูจน์เจ้าของพอร์ต');
    assert.deepEqual(await leftovers(before), []);
  } finally {
    decoy.kill('SIGKILL');
  }
});

test('SIGTERM กลางทาง = เก็บเซิร์ฟเวอร์/chrome/ไฟล์ชั่วคราวครบ', async () => {
  const before = tmpDirs();
  const p = spawn(process.execPath, [GATE], {
    cwd: ROOT, env: { ...process.env, ONLY: 'bento', SKIP_BUILD: '1' },
  });
  let out = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { out += d; });
  /* รอจนด่าน **สร้างทรัพยากรแล้วจริงและกำลังวัดอยู่** ก่อนตัด — ตัดตอนเพิ่ง mkdtemp ไม่ได้ทดสอบ
     จังหวะที่อันตรายจริง ซึ่งคือตอน chrome เปิดหน้าอยู่ (ลูกหลานของมันกำลังเขียนลงโปรไฟล์) */
  let created = [];
  for (let i = 0; i < 900 && !(created.length >= 2 && /ส่วน/.test(out)); i++) {
    created = [...tmpDirs()].filter(d => !before.has(d));
    await sleep(100);
  }
  assert.ok(created.length >= 1, 'ด่านไม่สร้างไฟล์ชั่วคราวเลยภายใน 90 วินาที — เทสต์นี้วัดอะไรไม่ได้');
  assert.match(out, /ส่วน/, 'ด่านยังไม่เริ่มวัดภายใน 90 วินาที ⇒ ยังไม่ถึงจังหวะที่เทสต์นี้ต้องการตัด');
  const code = await new Promise(res => {
    p.on('close', c => res(c));
    p.kill('SIGTERM');
    setTimeout(() => p.kill('SIGKILL'), 20000);
  });
  assert.equal(code, 130, `ออกด้วยรหัสอื่น (${code}) ⇒ ไม่ได้เดินผ่านตัวเก็บกวาด · ${out.slice(-300)}`);
  assert.deepEqual(await leftovers(before), []);
});
