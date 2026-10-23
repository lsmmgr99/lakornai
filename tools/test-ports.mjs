/* ด่านกันการถอย: พอร์ตชนแล้วต้อง "แดงเร็วพร้อมบอกสาเหตุ" ไม่ใช่ค้างเงียบ
   และห้ามเขียวจากเซิร์ฟเวอร์ของ run อื่น — AIO-42 (ตามรีวิว AIO-43 R1/R2/R3 · AIO-44 ข้อ 1/2)
   รัน:  node tools/test-ports.mjs            (ใช้เวลาจริงราว 1 นาที · วัดแล้ว)

   ทำไมต้องแยกไฟล์: จำนวนข้อของ test-continue (66) / test-contrast (9) ถูกอ้างในใบงาน
   ห้ามเปลี่ยน · และถ้าไม่มีด่านนี้ ลบ AbortSignal / หลักฐาน ready / onclose ออกวันนี้
   ด่านทั้งชุดก็ยังเขียวหมด เพราะไม่มีใครรันตอน "พอร์ตถูกคนอื่นถือ" โดยอัตโนมัติ

   ทุกเคสยิงด่านจริงเป็นลูกใน process group ของตัวเอง ⇒ หมดเวลาแล้วฆ่าได้ทั้งกลุ่ม
   ไม่ทิ้ง chrome/serve.mjs ค้างถือพอร์ตให้รันถัดไปแดงต่อ (ห้ามใช้ pkill -f: แพตเทิร์น
   ตรงกับบรรทัดคำสั่งของเชลล์ตัวเองด้วย) */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT_ENV = ['AC2_PORT', 'AC2_CDP', 'PH_PORT', 'PH_CDP'];

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' · ' + detail : ''}`); }
}

/* ---------- ตัวจำลอง "พอร์ตที่ run อื่นถืออยู่" ---------- */
/* รับ connection แล้วเงียบ — คือเคสที่ทำให้ fetch/CDP ค้างไม่มีกำหนด ไม่ใช่เคส connection refused */
async function silentPort() {
  const socks = [];
  const srv = net.createServer(s => socks.push(s));
  await new Promise((res, rej) => { srv.once('error', rej); srv.listen(0, '127.0.0.1', res); });
  return {
    port: srv.address().port,
    close: () => { for (const s of socks) s.destroy(); srv.close(); },
  };
}

/* เซิร์ฟเวอร์ของ "คนอื่น" ที่ตอบปกติ — ใช้พิสูจน์ว่าด่านไม่ยอมเขียวจากพอร์ตที่ไม่ใช่ลูกของตัวเอง */
async function foreignServer() {
  const probe = await silentPort(); const port = probe.port; probe.close();
  const p = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(port)],
    { stdio: ['ignore', 'pipe', 'ignore'] });
  let out = '';
  p.stdout.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !out.includes(`:${port}/`); i++) await sleep(50);
  if (!out.includes(`:${port}/`)) { try { p.kill('SIGKILL'); } catch {} throw new Error('ยกเซิร์ฟเวอร์ตัวจำลองไม่ขึ้น'); }
  return { port, close: () => { try { p.kill('SIGTERM'); } catch {} } };
}

/* ---------- ยิงด่านจริงแล้ววัดว่า "แดงเอง" หรือ "ถูกเราฆ่าเพราะค้าง" ---------- */
function kids(pid) {                        /* ลูกตรงของ pid — อ่านจาก /proc ไม่ใช้ pgrep */
  const out = [];
  for (const e of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(e)) continue;
    try {
      const st = fs.readFileSync(`/proc/${e}/stat`, 'utf8');
      if (+st.slice(st.lastIndexOf(')') + 2).split(' ')[1] === pid) out.push(+e);
    } catch { /* ตายไปแล้วระหว่างอ่าน */ }
  }
  return out;
}
function comm(pid) {
  try { return fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); } catch { return ''; }
}

async function runGate(file, env, deadlineMs, onOut) {
  const t0 = Date.now();
  const childEnv = { ...process.env };
  for (const k of PORT_ENV) delete childEnv[k];
  const child = spawn(process.execPath, [path.join(ROOT, 'tools', file)],
    { cwd: ROOT, env: { ...childEnv, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let out = '', timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  }, deadlineMs);
  const take = d => { out += d; try { onOut?.(out, child); } catch {} };
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  const code = await new Promise(r => child.on('exit', (c, sig) => r(c === null ? `สัญญาณ ${sig}` : c)));
  clearTimeout(timer);
  return { code, out, timedOut, ms: Date.now() - t0 };
}

function expectRed(name, r, deadlineMs, want) {
  const ok = !r.timedOut && r.code !== 0 && (!want || r.out.includes(want));
  check(`${name} → แดงเองใน ${(r.ms / 1000).toFixed(1)} วินาที (เพดาน ${deadlineMs / 1000})`, ok,
    r.timedOut ? `ค้าง — ถูกฆ่าเมื่อครบเพดาน · ผลที่พิมพ์ออกมา ${JSON.stringify(r.out.slice(-160))}`
      : `exit=${r.code} · ${JSON.stringify(r.out.slice(-160))}`);
}

/* ---------- 1. พอร์ต HTTP ถูกคนอื่นถือและเงียบ ---------- */
console.log('\nพอร์ต HTTP ถูกถือไว้โดยเซิร์ฟเวอร์ที่รับ connection แต่ไม่ตอบ');
{
  const s = await silentPort();
  expectRed('test-continue · AC2_PORT ชี้ไปพอร์ตที่ถูกถือ',
    await runGate('test-continue.mjs', { AC2_PORT: String(s.port) }, 15000), 15000,
    'เปิด tools/serve.mjs');
  expectRed('test-contrast · PH_PORT ชี้ไปพอร์ตที่ถูกถือ',
    await runGate('test-contrast.mjs', { PH_PORT: String(s.port), SKIP_BUILD: '1' }, 15000), 15000,
    'เปิด tools/serve.mjs');
  s.close();
}

/* ---------- 2. พอร์ต CDP ถูกคนอื่นถือและเงียบ (รีวิว AIO-43 R1 · AIO-44 ข้อ 1) ---------- */
/* เคสนี้ก่อนแก้ค้าง 70 วินาทีโดยไม่พิมพ์อะไรเลย — fetch ใน wsUrl() ไม่มี timeout */
console.log('\nพอร์ต CDP ถูกถือไว้โดยเซิร์ฟเวอร์ที่รับ connection แต่ไม่ตอบ');
{
  const s = await silentPort();
  expectRed('test-continue · AC2_CDP ชี้ไปพอร์ตที่ถูกถือ',
    await runGate('test-continue.mjs', { AC2_CDP: String(s.port) }, 45000), 45000, 'เชื่อมต่อ chrome');
  expectRed('test-contrast · PH_CDP ชี้ไปพอร์ตที่ถูกถือ',
    await runGate('test-contrast.mjs', { PH_CDP: String(s.port), SKIP_BUILD: '1' }, 45000), 45000,
    'เชื่อมต่อ chrome');
  s.close();
}

/* ---------- 3. พอร์ตมีเซิร์ฟเวอร์ของคนอื่นตอบปกติ (รีวิว AIO-44 ข้อ 2 · AIO-43 N3) ---------- */
/* ต้องแดง: ถ้าเขียว = รับรองไฟล์ของ checkout อื่น ทั้งที่ลูกของรันนี้ไม่ได้พอร์ตเลย */
console.log('\nพอร์ตมีเซิร์ฟเวอร์ของ run อื่นตอบปกติอยู่ (ลูกของรันนี้ bind ไม่ได้)');
{
  const f = await foreignServer();
  expectRed('test-continue · AC2_PORT ชี้ไปเซิร์ฟเวอร์ของคนอื่น',
    await runGate('test-continue.mjs', { AC2_PORT: String(f.port) }, 15000), 15000,
    'เปิด tools/serve.mjs');
  expectRed('test-contrast · PH_PORT ชี้ไปเซิร์ฟเวอร์ของคนอื่น',
    await runGate('test-contrast.mjs', { PH_PORT: String(f.port), SKIP_BUILD: '1' }, 15000), 15000,
    'เปิด tools/serve.mjs');
  f.close();
}

/* ---------- 4. chrome ตายกลางทาง (รีวิว AIO-43 R2) ---------- */
/* ฆ่าเฉพาะ chrome ที่เป็นลูกของด่านที่เราเพิ่ง spawn เอง — ไม่แตะ chrome ของ run อื่นในกล่องนี้
   ก่อนแก้: ws ปิดแล้ว promise ใน pending ไม่ถูก settle ⇒ ค้างเงียบจนคนมาฆ่า */
console.log('\nchrome ถูกฆ่ากลางทาง (จำลอง OOM-kill ในกล่องที่รันหลาย run พร้อมกัน)');
{
  let killed = 0;
  const r = await runGate('test-continue.mjs', {}, 60000, (out, child) => {
    if (killed || !out.includes('✓')) return;        /* รอให้ CDP ทำงานแล้วจริงก่อน */
    for (const p of kids(child.pid)) if (comm(p) === 'chrome') { try { process.kill(p, 'SIGKILL'); killed = p; } catch {} }
  });
  check('ฆ่า chrome ของด่านได้จริง (ไม่ใช่เคสที่ด่านจบไปก่อน)', killed > 0, `pid=${killed}`);
  expectRed('test-continue · chrome ตายกลางทาง', r, 60000, 'ทดสอบล้ม');
  check('ข้อความแดงบอกสาเหตุจริง ไม่ใช่ "โหลดหน้าไม่เสร็จ"',
    /CDP/.test(r.out) && !/โหลดหน้าไม่เสร็จ/.test(r.out), JSON.stringify(r.out.slice(-200)));
}

console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
