/* ด่านกันการถอย: พอร์ตชนหรือลูกตายกลางทางแล้วต้อง "แดงเร็วพร้อมบอกสาเหตุจริง + ไม่เหลือลูกค้าง"
   ไม่ใช่ค้างเงียบ และห้ามเขียวจากเซิร์ฟเวอร์/เบราว์เซอร์ของ run อื่น — AIO-42
   รัน:  node tools/test-ports.mjs            (ใช้เวลาจริงราว 3–4 นาที · วัดแล้ว)

   ทำไมต้องแยกไฟล์: จำนวนข้อของ test-continue (66) / test-contrast (9) ถูกอ้างในใบงาน
   ห้ามเปลี่ยน · และถ้าไม่มีด่านนี้ ลบเพดานเวลา / หลักฐานความเป็นเจ้าของพอร์ต / การเก็บกวาด
   ออกวันนี้ ด่านทั้งชุดก็ยังเขียวหมด เพราะไม่มีใครรันตอน "พอร์ตถูกคนอื่นถือ" โดยอัตโนมัติ

   ทุกเคสยิงด่านจริงเป็นลูกใน process group ของตัวเอง ⇒ หมดเวลาแล้วฆ่าได้ทั้งกลุ่ม
   ไม่ทิ้ง chrome/serve.mjs ค้างถือพอร์ตให้รันถัดไปแดงต่อ (ห้ามใช้ pkill -f: แพตเทิร์น
   ตรงกับบรรทัดคำสั่งของเชลล์ตัวเองด้วย)

   เคสที่ "ฉีดความล้มเหลวได้จากข้างนอกตรงจังหวะ" ยิงด่านทั้งสองตัวเป็นคู่ (เคส 0–4 และ 8)
   ส่วนเคสที่ต้องฉีดกลางการวัด (5–7) ยิง test-continue.mjs ตัวเดียวโดยเจตนา:
   test-contrast.mjs ทั้งการรันจบใน 1.8 วินาที ช่องที่ "กลางการวัด" กว้างราว 100 ms
   ฉีดจากข้างนอกแล้วไม่ซ้ำรอยเดิม (วัดแล้ว: ฆ่า chrome ได้จริงแต่ด่านวัดจบไปก่อน จึงเขียว)
   ⇒ สิ่งที่ทำให้ยังกัดทั้งสองด่านคือโค้ดอยู่ไฟล์เดียวจริง ไม่ใช่สองสำเนาเหมือนก่อน
   และมีเคสท้ายไฟล์บังคับไว้ว่าห้ามแตกสำเนาส่วนนี้กลับไปไว้ในด่าน (รีวิว AIO-45 C2 · AIO-46 R4) */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tree } from './cdp-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT_ENV = ['AC2_PORT', 'AC2_CDP', 'PH_PORT', 'PH_CDP'];
/* ชื่อ env ของแต่ละด่าน: [พอร์ต HTTP, พอร์ต CDP, env เพิ่มเติม] */
const GATES = [
  { file: 'test-continue.mjs', http: 'AC2_PORT', cdp: 'AC2_CDP', env: {} },
  { file: 'test-contrast.mjs', http: 'PH_PORT', cdp: 'PH_CDP', env: { SKIP_BUILD: '1' } },
];
/* เคสที่ต้องฉีดกลางการวัดใช้ด่านที่ยาวพอให้จับจังหวะได้ — ดูเหตุผลด้านบน */
const MID = [GATES[0]];

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' · ' + detail : ''}`); }
}
/* เคสที่พังเอง (ยกตัวจำลองไม่ขึ้น · พอร์ตถูกแย่งกลางทาง) ต้องนับเป็น "ตก" พร้อมเหตุ
   ไม่ใช่ปล่อย throw หลุดออก top level แล้วไฟล์ตายทั้งไฟล์โดยไม่พิมพ์บรรทัดผล (รีวิว AIO-45 C9) */
async function caseOf(title, fn) {
  console.log('\n' + title);
  try { await fn(); }
  catch (e) { check(`${title} — เคสนี้รันไม่จบ`, false, e.message); }
}

/* ---------- อ่านสถานะกระบวนการจาก /proc ---------- */
function stat(pid) {
  try { return fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); } catch { return null; }
}
function living(pid) {               /* ยังอยู่จริง · ซอมบี้ไม่นับว่ายังอยู่ */
  const st = stat(pid);
  return !!st && st.slice(st.lastIndexOf(')') + 2).split(' ')[0] !== 'Z';
}
function kids(pid) {                 /* ลูกตรงของ pid */
  const out = [];
  for (const e of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(e)) continue;
    const st = stat(+e);
    if (st && +st.slice(st.lastIndexOf(')') + 2).split(' ')[1] === pid) out.push(+e);
  }
  return out;
}
const comm = pid => { try { return fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); } catch { return '?'; } };
const cmd = pid => { try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim(); } catch { return ''; } };
const killTree = (pid, sig) => { for (const p of tree(pid)) { try { process.kill(p, sig); } catch { /* ตายแล้ว */ } } };

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
async function freePort() {
  const s = await silentPort(); const p = s.port; s.close(); return p;
}

/* เซิร์ฟเวอร์ของ "คนอื่น" ที่ตอบปกติ — ใช้พิสูจน์ว่าด่านไม่ยอมเขียวจากพอร์ตที่ไม่ใช่ลูกของตัวเอง
   ขอพอร์ตแล้วปล่อยคืนก่อน spawn จึงมีช่องให้ run อื่นแย่งได้ ⇒ ลองใหม่ ไม่ใช่ล้มทั้งเคส */
async function foreignServer() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = await freePort();
    const p = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(port)],
      { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    for (let i = 0; i < 100 && !out.includes(`:${port}/`) && p.exitCode === null; i++) await sleep(50);
    if (out.includes(`:${port}/`)) return { port, close: () => killTree(p.pid, 'SIGKILL') };
    killTree(p.pid, 'SIGKILL');
  }
  throw new Error('ยกเซิร์ฟเวอร์ตัวจำลองของ "run อื่น" ไม่ขึ้นใน 3 ครั้ง');
}

/* เบราว์เซอร์ของ "คนอื่น" ที่เปิดพอร์ต CDP ไว้และตอบปกติ — ของเดิมถือว่า "มีใครตอบที่พอร์ต CDP"
   = ต่อติด ⇒ ด่านเกาะเบราว์เซอร์ของ run อื่นแล้วเขียวครบ 66 ข้อได้ (รีวิว AIO-45 C1) */
async function foreignChrome() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = await freePort();
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-foreign-'));
    const p = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
      `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-allow-origins=*', 'about:blank'],
      { stdio: 'ignore' });
    const close = () => { killTree(p.pid, 'SIGKILL'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
    for (let i = 0; i < 100; i++) {
      if (await answers(port)) return { port, close };
      if (p.exitCode !== null) break;
      await sleep(100);
    }
    close();
  }
  throw new Error('ยก chrome ตัวจำลองของ "run อื่น" ไม่ขึ้นใน 3 ครั้ง');
}
const answers = async port => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
    return r.ok;
  } catch { return false; }
};

/* ---------- ยิงด่านจริงแล้ววัดว่า "แดงเอง" หรือ "ถูกเราฆ่าเพราะค้าง" ---------- */
/* watch(ctx) ถูกเรียกซ้ำทุก 40 ms ระหว่างด่านทำงาน — ใช้ฉีดความล้มเหลวตรงจังหวะที่ต้องการ
   ctx.kid(re) = ลูกของด่านที่บรรทัดคำสั่งตรงแพตเทิร์น (chrome / serve.mjs ของด่านตัวนั้น ไม่ใช่ของ run อื่น) */
async function runGate({ file, env: gateEnv }, env, deadlineMs, watch) {
  const t0 = Date.now();
  const childEnv = { ...process.env };
  for (const k of PORT_ENV) delete childEnv[k];
  const child = spawn(process.execPath, [path.join(ROOT, 'tools', file)],
    { cwd: ROOT, env: { ...childEnv, ...gateEnv, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let out = '', timedOut = false, running = true;
  const seen = new Map();
  const timer = setTimeout(() => {
    timedOut = true;
    try { process.kill(-child.pid, 'SIGCONT'); } catch {}      /* เผื่อถูก SIGSTOP ไว้ */
    try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  }, deadlineMs);
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  const ctx = {
    get out() { return out; },
    kid: re => kids(child.pid).find(p => re.test(cmd(p))),
  };
  const watcher = (async () => {
    while (running) {
      /* จดลูกหลานทุกตัวที่เคยเห็น เพื่อตรวจทีหลังว่าด่านเก็บกวาดของตัวเองครบ */
      for (const p of kids(child.pid)) for (const q of tree(p)) if (!seen.has(q)) seen.set(q, `${comm(q)}`);
      if (watch) await watch(ctx);
      await sleep(40);
    }
  })();
  const code = await new Promise(r => child.on('exit', (c, s) => r(c === null ? `สัญญาณ ${s}` : c)));
  running = false; clearTimeout(timer);
  await watcher;
  /* หลักฐานว่าด่านเก็บกวาดลูกของตัวเองจริง — ให้เวลาเท่าเพดาน REAP ของ cdp-gate ก่อนตัดสิน */
  const by = Date.now() + 6000;
  let left = [...seen.keys()].filter(living);
  while (left.length && Date.now() < by) { await sleep(100); left = [...seen.keys()].filter(living); }
  const leftInfo = left.map(p => `${p}:${seen.get(p)}`);
  /* ตาข่ายกันพลาด: ถ้ายังเหลือจริง (คือมีคนถอยการเก็บกวาดออก) ห้ามทิ้งไว้ให้รันถัดไปแดงต่อ */
  try { process.kill(-child.pid, 'SIGCONT'); } catch {}
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  for (const p of left) killTree(p, 'SIGKILL');
  return { file, code, out, timedOut, ms: Date.now() - t0, left: leftInfo, seen: seen.size };
}

function expectRed(name, r, deadlineMs, want) {
  const hit = !want || (want instanceof RegExp ? want.test(r.out) : r.out.includes(want));
  check(`${r.file} · ${name} → แดงเองใน ${(r.ms / 1000).toFixed(1)} วินาที พร้อมเหตุจริง (เพดาน ${deadlineMs / 1000})`,
    !r.timedOut && r.code !== 0 && hit,
    r.timedOut ? `ค้าง — ถูกฆ่าเมื่อครบเพดาน · ผลที่พิมพ์ออกมา ${JSON.stringify(r.out.slice(-200))}`
      : `exit=${r.code} · ${JSON.stringify(r.out.slice(-200))}`);
  /* ลูกที่ค้างถือพอร์ตคืออาการที่ตั๋วนี้ถูกเปิดด้วย ⇒ ทางแดงทุกทางต้องไม่ทิ้งอะไรไว้
     (รีวิว AIO-45 C3 วัดได้ว่าทางแดงเร็วทิ้ง chrome ทั้งต้นไว้พร้อมพอร์ต CDP) */
  check(`${r.file} · ${name} → ไม่เหลือ serve.mjs/chrome ค้างหลังด่านจบ (เคยเห็นลูกหลาน ${r.seen} ตัว)`,
    r.left.length === 0, r.left.join(' '));
}
const notMisleading = r => check(`${r.file} · ข้อความแดงไม่ใช่ "โหลดหน้าไม่เสร็จ" ซึ่งชี้ผิดทาง`,
  !/โหลดหน้าไม่เสร็จ/.test(r.out), JSON.stringify(r.out.slice(-200)));

/* ---------- 0. ทางปกติ: ต้องผ่านและต้องไม่ทิ้งลูกไว้ ----------
   ตัววัด "ไม่เหลือลูกค้าง" ต้องพิสูจน์ตัวเองด้วยว่าไม่ได้เขียวเพราะไม่เคยเห็นลูกเลย
   ใช้ test-contrast เพราะสั้นที่สุด (test-continue ทางปกติถูกครอบด้วย check-ac อยู่แล้ว) */
await caseOf('ทางปกติ (ไม่ตั้ง env อะไรเลย)', async () => {
  const r = await runGate(GATES[1], {}, 90000);
  check(`${r.file} · ผ่านเองใน ${(r.ms / 1000).toFixed(1)} วินาที`,
    r.code === 0 && /ผล: ผ่าน \d+ · ตก 0/.test(r.out), `exit=${r.code} · ${JSON.stringify(r.out.slice(-160))}`);
  check(`${r.file} · เห็นลูกหลานของด่านจริง (ตัววัดการเก็บกวาดไม่ได้เขียวเพราะมองไม่เห็นอะไร)`,
    r.seen >= 2, `เห็น ${r.seen} ตัว`);
  check(`${r.file} · จบปกติแล้วไม่เหลือ serve.mjs/chrome ค้าง`, r.left.length === 0, r.left.join(' '));
});

/* ---------- 1. พอร์ต HTTP ถูกคนอื่นถือและเงียบ ---------- */
await caseOf('พอร์ต HTTP ถูกถือไว้โดยเซิร์ฟเวอร์ที่รับ connection แต่ไม่ตอบ', async () => {
  const s = await silentPort();
  try {
    for (const g of GATES) {
      expectRed(`${g.http} ชี้ไปพอร์ตที่ถูกถือ`,
        await runGate(g, { [g.http]: String(s.port) }, 20000), 20000, 'เปิด tools/serve.mjs');
    }
  } finally { s.close(); }
});

/* ---------- 2. พอร์ต CDP ถูกคนอื่นถือและเงียบ (รีวิว AIO-43 R1 · AIO-44 ข้อ 1) ---------- */
/* เคสนี้ก่อนแก้ค้าง 70 วินาทีโดยไม่พิมพ์อะไรเลย — fetch ใน wsUrl() ไม่มี timeout */
await caseOf('พอร์ต CDP ถูกถือไว้โดยเซิร์ฟเวอร์ที่รับ connection แต่ไม่ตอบ', async () => {
  const s = await silentPort();
  try {
    for (const g of GATES) {
      expectRed(`${g.cdp} ชี้ไปพอร์ตที่ถูกถือ`,
        await runGate(g, { [g.cdp]: String(s.port) }, 45000), 45000, 'พอร์ต CDP');
    }
  } finally { s.close(); }
});

/* ---------- 3. พอร์ต HTTP มีเซิร์ฟเวอร์ของคนอื่นตอบปกติ (รีวิว AIO-44 ข้อ 2) ---------- */
/* ต้องแดง: ถ้าเขียว = รับรองไฟล์ของ checkout อื่น ทั้งที่ลูกของรันนี้ไม่ได้พอร์ตเลย */
await caseOf('พอร์ต HTTP มีเซิร์ฟเวอร์ของ run อื่นตอบปกติอยู่ (ลูกของรันนี้ bind ไม่ได้)', async () => {
  const f = await foreignServer();
  try {
    for (const g of GATES) {
      expectRed(`${g.http} ชี้ไปเซิร์ฟเวอร์ของคนอื่น`,
        await runGate(g, { [g.http]: String(f.port) }, 20000), 20000, 'เปิด tools/serve.mjs');
    }
  } finally { f.close(); }
});

/* ---------- 4. พอร์ต CDP มี chrome ของคนอื่นตอบปกติ (รีวิว AIO-45 C1) ---------- */
/* ต้องแดง: ถ้าเขียว = วัดเว็บด้วยเบราว์เซอร์ของ run อื่น (คนละ checkout) แล้วรับรองผล */
await caseOf('พอร์ต CDP มี chrome ของ run อื่นตอบปกติอยู่ (chrome ของรันนี้ bind ไม่ได้)', async () => {
  const f = await foreignChrome();
  try {
    for (const g of GATES) {
      const r = await runGate(g, { [g.cdp]: String(f.port) }, 45000);
      expectRed(`${g.cdp} ชี้ไป chrome ของคนอื่น`, r, 45000, 'พอร์ต CDP');
      check(`${r.file} · chrome ของ run อื่นไม่ถูกแตะ (ด่านฆ่าแต่ลูกของตัวเอง)`,
        await answers(f.port), 'chrome ตัวจำลองไม่ตอบแล้วหลังด่านจบ — ด่านไปฆ่าของคนอื่น');
    }
  } finally { f.close(); }
});

/* ---------- 5. chrome ตายกลางทาง (รีวิว AIO-43 R2) ---------- */
/* ฆ่าเฉพาะ chrome ที่เป็นลูกของด่านที่เราเพิ่ง spawn เอง — ไม่แตะ chrome ของ run อื่นในกล่องนี้
   ก่อนแก้: ws ปิดแล้ว promise ใน pending ไม่ถูก settle ⇒ ค้างเงียบจนคนมาฆ่า */
/* เพดาน 20 วินาทีไม่ใช่เลขสวย ๆ: ด่านที่ยังมีการแก้ครบจะแดงใน ~3 วินาที (วัดแล้ว 2.7–3.1)
   เพราะรู้ว่า chrome ตายจาก 'exit' ของลูกตัวเอง · ถ้าถอด onclose/onerror → wsDie ออก
   จะเหลือทางเดียวคือรอ timeout ของคำสั่ง (30 วินาที) ⇒ เกินเพดานนี้แล้วด่านนี้แดง */
await caseOf('chrome ถูกฆ่ากลางทาง (จำลอง OOM-kill ในกล่องที่รันหลาย run พร้อมกัน)', async () => {
  for (const g of MID) {
    let killed = 0;
    const r = await runGate(g, {}, 20000, ctx => {
      if (killed || !ctx.out.includes('✓')) return;          /* รอให้ CDP ทำงานแล้วจริงก่อน */
      const p = ctx.kid(/chrome/);
      if (p) { killTree(p, 'SIGKILL'); killed = p; }
    });
    check(`${r.file} · ฆ่า chrome ของด่านได้จริง (ไม่ใช่เคสที่ด่านจบไปก่อน)`, killed > 0, `pid=${killed}`);
    expectRed('chrome ตายกลางทาง', r, 20000, /CDP|chrome ตายกลางทาง/);
    notMisleading(r);
  }
});

/* ---------- 6. serve.mjs ตายหลังพิมพ์บรรทัดพร้อม (รีวิว AIO-46 R2 · AIO-45 C5) ---------- */
/* บรรทัดพร้อมเป็นข้อมูล "ในอดีต": ลูกตายหลังจากนั้นแล้วมีคนเข้ามาแทนที่พอร์ตได้
   ⇒ ต้องเช็กตลอดอายุการรัน ไม่ใช่ครั้งเดียวตอนรอพร้อม · ก่อนแก้รายงานว่า "โหลดหน้าไม่เสร็จ" */
await caseOf('serve.mjs ตายกลางทางหลังพิมพ์บรรทัดพร้อมแล้ว', async () => {
  for (const g of MID) {
    let killed = 0;
    const r = await runGate(g, {}, 60000, ctx => {
      if (killed || !ctx.out.includes('✓')) return;
      const p = ctx.kid(/serve\.mjs/);
      if (p) { killTree(p, 'SIGKILL'); killed = p; }
    });
    check(`${r.file} · ฆ่า serve.mjs ของด่านได้จริง`, killed > 0, `pid=${killed}`);
    expectRed('serve.mjs ตายกลางทาง', r, 60000, 'serve.mjs ตายกลางทาง');
    notMisleading(r);
  }
});

/* ---------- 7. CDP เงียบโดยที่ socket ยังเปิดอยู่ (รีวิว AIO-46 R3/R4) ---------- */
/* SIGSTOP ตัวเบราว์เซอร์: TCP ไม่ปิด (ไม่มี FIN) แต่ไม่มีใครตอบคำสั่ง CDP อีก
   ⇒ onclose/onerror ไม่ทำงาน · ตัวที่ต้องกัดคือ timeout ของคำสั่ง + การห้ามลูปรอหน้ากลืน error
   ก่อนแก้: ลูปใน go() กลืนแล้วส่ง evaluate ใหม่ได้ 100 รอบ ≈ 50 นาที */
await caseOf('chrome ถูก SIGSTOP กลางทาง (socket เปิดอยู่แต่ CDP ไม่ตอบคำสั่ง)', async () => {
  for (const g of MID) {
    let stopped = 0;
    const r = await runGate(g, {}, 75000, ctx => {
      if (stopped || !ctx.out.includes('✓')) return;
      const p = ctx.kid(/chrome/);
      if (p) { try { process.kill(p, 'SIGSTOP'); stopped = p; } catch { /* ตายแล้ว */ } }
    });
    check(`${r.file} · หยุด chrome ของด่านได้จริง`, stopped > 0, `pid=${stopped}`);
    expectRed('CDP ไม่ตอบคำสั่งแต่ socket ยังเปิด', r, 75000, 'CDP ไม่ตอบคำสั่ง');
    notMisleading(r);
  }
});

/* ---------- 7ข. CDP เงียบ "ขณะอยู่ในลูปรอหน้า" โดยเฉพาะ ---------- */
/* เคส 7 หยุด chrome ตอนข้อแรกผ่านแล้ว ซึ่งคำสั่งถัดไปมักเป็น evaluate เดี่ยว ๆ (ไม่มีใครกลืน error)
   ⇒ วัดไม่ได้ว่าลูปรอหน้า "ไม่กลืน timeout แล้วส่งซ้ำ" จริงไหม (วัดแล้ว: ถอดป้าย fatal ออก
   เคส 7 ยังเขียว) · จังหวะที่การันตีว่าอยู่ในลูปคือทันทีหลังด่านพิมพ์หัวเรื่อง เพราะคำสั่งแรก
   หลังจากนั้นคือ go('/') = Page.navigate แล้วเข้าลูป evaluate
   สมบัติที่ยืนยันเป็นจริงทั้งสองจังหวะเมื่อการแก้ยังอยู่ (ทั้งตอนค้างที่ navigate และตอนค้างในลูป)
   ⇒ เคสนี้ไม่แดงมั่ว แต่จะจับการถอยได้เมื่อค้างตกในลูป (รีวิว AIO-46 R3) */
await caseOf('chrome ถูก SIGSTOP ขณะด่านกำลังรอหน้าแรก (ลูปรอหน้าห้ามกลืน timeout แล้วส่งซ้ำ)', async () => {
  for (const g of MID) {
    let stopped = 0;
    const r = await runGate(g, {}, 75000, ctx => {
      if (stopped || !/เบราว์เซอร์จริงที่/.test(ctx.out) || ctx.out.includes('✓')) return;
      const p = ctx.kid(/chrome/);
      if (p) { try { process.kill(p, 'SIGSTOP'); stopped = p; } catch { /* ตายแล้ว */ } }
    });
    check(`${r.file} · หยุด chrome ได้ก่อนข้อแรกผ่าน (คือขณะรอหน้าแรก)`, stopped > 0, `pid=${stopped}`);
    expectRed('CDP เงียบขณะรอหน้าแรก', r, 75000, 'CDP ไม่ตอบคำสั่ง');
    notMisleading(r);
  }
});

/* ---------- 8. chrome ตายตอนเริ่มต้น CDP ก่อนข้อแรกผ่าน (รีวิว AIO-46 R1) ---------- */
/* ของเดิมคำสั่งเริ่มต้น (Page.enable / Runtime.enable) อยู่นอก try ⇒ reject ตรงนั้นเป็น
   top-level rejection แล้ว node ออกโดยไม่เก็บกวาด ทิ้ง serve.mjs ถือพอร์ตไว้
   จับจังหวะด้วยการตั้งพอร์ต CDP เองแล้วรอให้พอร์ตนั้นตอบ = chrome ขึ้นแล้ว ด่านกำลังเริ่มต้น CDP */
await caseOf('chrome ตายตอนเริ่มต้น CDP (ก่อนข้อแรกผ่าน)', async () => {
  for (const g of GATES) {
    const port = await freePort();
    let killed = 0;
    const r = await runGate(g, { [g.cdp]: String(port) }, 45000, async ctx => {
      if (killed || ctx.out.includes('✓')) return;
      if (!await answers(port)) return;
      const p = ctx.kid(/chrome/);
      if (p) { killTree(p, 'SIGKILL'); killed = p; }
    });
    check(`${r.file} · ฆ่า chrome ได้ก่อนข้อแรกผ่านจริง`, killed > 0, `pid=${killed}`);
    expectRed('chrome ตายตอนเริ่มต้น CDP', r, 45000, /CDP|chrome/);
  }
});

/* ---------- 9. ห้ามแตกสำเนาตัวร่วมกลับไปไว้ในด่าน ----------
   ที่ทำให้เคส 5–7 (ยิงด่านตัวเดียว) ยังคุ้มครองทั้งสองด่านคือ "โค้ดก้อนนั้นมีสำเนาเดียว"
   ถ้าใครก๊อปกลับเข้าไปในด่านใดด่านหนึ่ง ความคุ้มครองนั้นหายไปเงียบ ๆ ⇒ บังคับไว้ที่นี่ */
/* ต้องตัดคอมเมนต์ออกก่อนตรวจ: คำอธิบายที่เอ่ยถึง tools/serve.mjs ไม่ใช่โค้ดที่ยกเซิร์ฟเวอร์
   ด่านที่นับคอมเมนต์เป็นกฎจริงคือด่านที่แดงแบบไม่มีบั๊ก (เจอมาแล้วที่ check-ac.mjs) */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
await caseOf('ด่านทั้งสองยังใช้ tools/cdp-gate.mjs ร่วมกัน (ไม่มีใครแตกสำเนากลับไป)', async () => {
  for (const g of GATES) {
    const src = code(fs.readFileSync(path.join(ROOT, 'tools', g.file), 'utf8'));
    check(`${g.file} · import ตัวร่วมจาก ./cdp-gate.mjs`,
      /import\s*\{[^}]*\bstartGate\b[^}]*\}\s*from\s*'\.\/cdp-gate\.mjs'/.test(src));
    check(`${g.file} · ไม่ได้ยก serve.mjs/chrome ขึ้นเอง (ถ้ายก ต้องย้ายเคส 5–7 มายิงไฟล์นี้ด้วย)`,
      !/remote-debugging-port|tools\/serve\.mjs/.test(src),
      'พบการยกเซิร์ฟเวอร์/เบราว์เซอร์เองในไฟล์ด่าน');
  }
});

/* โปรไฟล์ที่ค้างอยู่จากการฉีดความล้มเหลว (ทาง SIGKILL ไม่มีใครได้เก็บกวาด) — ราว 29 MB ต่อตัว
   ห้ามลบด้วยเกณฑ์ "เก่ากว่า N นาที": workspace นี้แชร์กัน โปรไฟล์ที่ run อื่นกำลังใช้จะถูกลบทิ้ง
   ⇒ ลบเฉพาะตัวที่ไม่มีกระบวนการไหนในเครื่องอ้างถึงอยู่แล้ว */
const inUse = new Set();
for (const e of fs.readdirSync('/proc')) {
  if (!/^\d+$/.test(e)) continue;
  const c = cmd(+e);
  const m = c.match(/--user-data-dir=(\S+)/);
  if (m) inUse.add(m[1]);
}
let swept = 0;
for (const e of fs.readdirSync(os.tmpdir())) {
  if (!/^lakorn-(ac2|ph|foreign)-/.test(e)) continue;
  const f = path.join(os.tmpdir(), e);
  if (inUse.has(f)) continue;
  try { fs.rmSync(f, { recursive: true, force: true }); swept++; } catch { /* ของคนอื่น ไม่มีสิทธิ์ */ }
}
console.log(`\nเก็บโปรไฟล์ chrome ที่ไม่มีใครใช้แล้ว ${swept} ตัว`);
console.log(`ผล: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
