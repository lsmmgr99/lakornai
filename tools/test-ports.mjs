/* ด่านกันการถอย: พอร์ตชนหรือลูกตายกลางทางแล้วต้อง "แดงเร็วพร้อมบอกสาเหตุจริง + ไม่เหลือลูกค้าง"
   ไม่ใช่ค้างเงียบ และห้ามเขียวจากเซิร์ฟเวอร์/เบราว์เซอร์ของ run อื่น — AIO-42
   รัน:  node tools/test-ports.mjs
   เวลาจริงขึ้นกับภาระของกล่อง — วัดได้ 2:42 ตอนว่าง ถึงราว 6 นาทีตอนมีหลาย run พร้อมกัน
   (ตัวเลขนี้เคยไม่ตรงกันสามที่: หัวไฟล์ · README · ผลวัดของรีวิว ⇒ เขียนเป็นช่วงพร้อมเงื่อนไข)

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
   และมีเคสท้ายไฟล์บังคับไว้ว่าห้ามแตกสำเนาส่วนนี้กลับไปไว้ในด่าน (รีวิว AIO-45 C2 · AIO-46 R4)

   เคสที่ต้องผูกจังหวะให้แน่นอน (handshake ของ ws · เพดานรวมของหน้า · ws ปิดขณะลูกยังอยู่ ·
   serve ตายระหว่างคำสั่งสุดท้าย) ฉีดจากข้างนอกแล้วได้ช่องเวลาแคบระดับ ms ⇒ เขียวแบบ flaky
   ซึ่งแย่กว่าไม่มีเคส · เคสกลุ่มนั้นจึงเรียก tools/cdp-gate.mjs ตรง ๆ ในลูกของตัวเอง
   แล้วแทน WebSocket / ลดค่าใน T เพื่อบังคับจังหวะ (รีวิว AIO-48 C5 เสนอวิธี · AIO-47 §2.5
   ค้านเรื่อง flaky — ทางนี้ตอบทั้งสองฝั่ง: ผูกจังหวะได้แน่นอน ไม่ต้องแข่งกับเวลารันหน้า) */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
/* โปรไฟล์ chrome ของด่าน — ทางออกทุกทางต้องเก็บ ไม่ใช่แค่ไม่เหลือกระบวนการ (ราว 29 MB ต่อตัว) */
const PROFILE_RE = /^lakorn-(ac2|ph)-/;
const profiles = () => new Set(fs.readdirSync(os.tmpdir()).filter(e => PROFILE_RE.test(e)));
/* เคสที่เรียกตัวร่วมตรง ๆ ในลูกของตัวเอง — ต้องเป็น URL สัมบูรณ์ เพราะลูกรันด้วย -e ไม่มีไฟล์ต้นทาง */
const GATE = JSON.stringify(pathToFileURL(path.join(ROOT, 'tools/cdp-gate.mjs')).href);
const fixture = body => `import { startGate, T, tree } from ${GATE};\nimport fs from 'node:fs';\n${body}`;
const AC2 = `{ envPorts: ['AC2_PORT', 'AC2_CDP'], profilePrefix: 'lakorn-ac2-' }`;

const STARTED = Date.now();         /* ตัวกวาดท้ายไฟล์แตะได้แค่โปรไฟล์ที่เกิดหลังเวลานี้ */
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
   ctx.chrome() / ctx.serve() = ลูกของด่านตัวนั้นเอง (ไม่ใช่ของ run อื่น)
   ห้ามเลือกด้วย "บรรทัดคำสั่งมีคำว่า chrome": ชื่อโฟลเดอร์ที่รันอยู่ก็นับด้วย ⇒ ฉีดผิดตัว
   (เจอจริงตอนรันมิวเทชันในสำเนาชื่อ /tmp/mut/M13-both-chrome-death: ไปฆ่า serve.mjs
   แล้วเคสไปยืนยันเหตุผิดเรื่อง) ⇒ chrome เลือกจากชื่อกระบวนการ · serve เลือกจากพาธเต็มของไฟล์ */
async function runGate({ file, src, name, env: gateEnv }, env, deadlineMs, watch) {
  const t0 = Date.now();
  const childEnv = { ...process.env };
  for (const k of PORT_ENV) delete childEnv[k];
  const before = profiles();
  const argv = src ? ['--input-type=module', '-e', src] : [path.join(ROOT, 'tools', file)];
  const child = spawn(process.execPath, argv,
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
  const SERVE = path.join(ROOT, 'tools/serve.mjs');
  const ctx = {
    pid: child.pid,                      /* ตัวด่านเอง — เคสสัญญาณต้องยิง pid ตัวนี้ ไม่ใช่ -pid */
    get out() { return out; },
    chrome: () => kids(child.pid).find(p => comm(p) === 'chrome'),
    serve: () => kids(child.pid).find(p => cmd(p).includes(SERVE)),
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
  /* โปรไฟล์ที่โผล่ใหม่ระหว่างเคสนี้แล้วยังอยู่ = ด่านออกโดยไม่เก็บกวาด (ไม่มีข้อไหนเคยตรวจเรื่องนี้) */
  const leftProfiles = [...profiles()].filter(p => !before.has(p));
  return { file: file || name, code, out, timedOut,
    ms: Date.now() - t0, left: leftInfo, seen: seen.size, leftProfiles };
}

/* maxMs: เพดานของ "เวลาที่ยอมให้ใช้ก่อนแดง" ที่แคบกว่าเพดานฆ่า — ใช้กับเคสที่เหตุจริง
   อ่านได้ทันทีจาก stderr ของลูก ถ้าไม่ตรวจเวลา การถอยกลับไปรอครบ 20 วินาทีจะยังเขียว */
function expectRed(name, r, deadlineMs, want, maxMs) {
  const hit = !want || (want instanceof RegExp ? want.test(r.out) : r.out.includes(want));
  check(`${r.file} · ${name} → แดงเองใน ${(r.ms / 1000).toFixed(1)} วินาที พร้อมเหตุจริง (เพดาน ${deadlineMs / 1000})`,
    !r.timedOut && r.code !== 0 && hit,
    r.timedOut ? `ค้าง — ถูกฆ่าเมื่อครบเพดาน · ผลที่พิมพ์ออกมา ${JSON.stringify(r.out.slice(-200))}`
      : `exit=${r.code} · ${JSON.stringify(r.out.slice(-200))}`);
  if (maxMs) {
    check(`${r.file} · ${name} → แดงภายใน ${maxMs / 1000} วินาที (ไม่ใช่รอครบเพดานแล้วเดาเหตุ)`,
      r.ms <= maxMs, `ใช้เวลา ${(r.ms / 1000).toFixed(1)} วินาที`);
  }
  /* ลูกที่ค้างถือพอร์ตคืออาการที่ตั๋วนี้ถูกเปิดด้วย ⇒ ทางแดงทุกทางต้องไม่ทิ้งอะไรไว้
     (รีวิว AIO-45 C3 วัดได้ว่าทางแดงเร็วทิ้ง chrome ทั้งต้นไว้พร้อมพอร์ต CDP) */
  check(`${r.file} · ${name} → ไม่เหลือ serve.mjs/chrome ค้างหลังด่านจบ (เคยเห็นลูกหลาน ${r.seen} ตัว)`,
    r.left.length === 0, r.left.join(' '));
  check(`${r.file} · ${name} → ไม่เหลือโปรไฟล์ chrome ค้างใน ${os.tmpdir()}`,
    r.leftProfiles.length === 0, r.leftProfiles.join(' '));
}
/* เคสที่เรียกตัวร่วมตรง ๆ: วัด "หยุดรอที่ N ms" ที่ลูกพิมพ์เอง ไม่ใช่เวลารวมของกระบวนการ
   (เวลารวมมี chrome startup ปนอยู่ ⇒ เพดานต้องหลวมจนไม่กัด) */
function expectStop(title, r, want, maxStopMs) {
  const m = /หยุดรอที่ (\d+) ms/.exec(r.out);
  check(`${title} → หยุดรอเองใน ${m ? m[1] : '?'} ms (ไม่เกิน ${maxStopMs})`,
    !r.timedOut && !!m && +m[1] <= maxStopMs, JSON.stringify(r.out.slice(-220)));
  check(`${title} → บอกเหตุจริง`, want.test(r.out), JSON.stringify(r.out.slice(-220)));
  check(`${title} → ไม่เหลือลูก/โปรไฟล์ค้าง (เคยเห็นลูกหลาน ${r.seen} ตัว)`,
    r.left.length === 0 && r.leftProfiles.length === 0, [...r.left, ...r.leftProfiles].join(' '));
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
  check(`${r.file} · จบปกติแล้วไม่เหลือโปรไฟล์ chrome ค้าง`, r.leftProfiles.length === 0, r.leftProfiles.join(' '));
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
/* เคสนี้ก่อนแก้ค้าง 70 วินาทีโดยไม่พิมพ์อะไรเลย — fetch ใน wsUrl() ไม่มี timeout
   แล้วรอบถัดมาแดงถูกแต่ช้าและชี้ผิดทาง: รอครบ 20 วินาทีแล้วบอกว่า "ไม่ได้บรรทัด DevTools"
   ทั้งที่ chrome พิมพ์ "bind() failed: Address already in use" + บรรทัด DevTools ที่ [::1]
   ให้ใน ~200 ms (รีวิว AIO-47 C2) ⇒ ตรวจเวลาด้วย ไม่ใช่ตรวจแต่ว่าแดง */
await caseOf('พอร์ต CDP ถูกถือไว้โดยเซิร์ฟเวอร์ที่รับ connection แต่ไม่ตอบ', async () => {
  const s = await silentPort();
  try {
    for (const g of GATES) {
      expectRed(`${g.cdp} ชี้ไปพอร์ตที่ถูกถือ`,
        await runGate(g, { [g.cdp]: String(s.port) }, 45000), 45000,
        /chrome bind 127\.0\.0\.1:\d+ ไม่ได้|bind\(\) failed/, 10000);
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
      expectRed(`${g.cdp} ชี้ไป chrome ของคนอื่น`, r, 45000,
        /chrome bind 127\.0\.0\.1:\d+ ไม่ได้|bind\(\) failed/, 10000);
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
/* ฆ่า "แม่ตัวเดียว" ไม่ใช่ killTree: ถ้าเทสต์ฆ่าลูกหลานให้ก่อน เทสต์ก็ไปทำงานที่ตัวเอง
   กำลังอ้างว่าทดสอบ แล้วการเก็บกวาดของด่านจะไม่ถูกวัดเลย (รีวิว AIO-48 C2) */
await caseOf('chrome ถูกฆ่ากลางทาง (จำลอง OOM-kill ในกล่องที่รันหลาย run พร้อมกัน)', async () => {
  for (const g of MID) {
    let killed = 0;
    const r = await runGate(g, {}, 20000, ctx => {
      if (killed || !ctx.out.includes('✓')) return;          /* รอให้ CDP ทำงานแล้วจริงก่อน */
      const p = ctx.chrome();
      if (p) { try { process.kill(p, 'SIGKILL'); killed = p; } catch { /* ตายแล้ว */ } }
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
      const p = ctx.serve();
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
      const p = ctx.chrome();
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
   ของเดิมรับข้อความ "CDP ไม่ตอบคำสั่ง" เฉย ๆ ซึ่งผ่านได้ทั้งสองจังหวะ — ทั้งตอนค้างที่
   Page.navigate (อยู่นอกลูป ไม่มีใครกลืน) และตอนค้างใน evaluate ของลูป (จังหวะที่ต้องวัด)
   ⇒ มิวเทชัน "ถอดป้าย fatal" จะกัดเฉพาะรอบที่การฉีดตกในลูป = อาศัยโชค (รีวิว AIO-47 C4)
   ⇒ บังคับให้ข้อความต้องระบุคำสั่งที่ค้างเป็น Runtime.evaluate · ถ้ารอบนั้นได้ Page.navigate
   ให้ลองใหม่ (แพตเทิร์นเดียวกับ foreignServer) · ครบ 3 ครั้งยังไม่ตกในลูป = ตกพร้อมเหตุ */
await caseOf('chrome ถูก SIGSTOP ขณะด่านกำลังรอหน้าแรก (ลูปรอหน้าห้ามกลืน timeout แล้วส่งซ้ำ)', async () => {
  const WANT = /CDP ไม่ตอบคำสั่ง Runtime\.evaluate/;
  for (const g of MID) {
    let r = null, stopped = 0, tries = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      stopped = 0; tries = attempt + 1;
      r = await runGate(g, {}, 75000, ctx => {
        if (stopped || !/เบราว์เซอร์จริงที่/.test(ctx.out) || ctx.out.includes('✓')) return;
        const p = ctx.chrome();
        if (p) { try { process.kill(p, 'SIGSTOP'); stopped = p; } catch { /* ตายแล้ว */ } }
      });
      if (WANT.test(r.out)) break;
    }
    check(`${r.file} · หยุด chrome ได้ก่อนข้อแรกผ่าน (คือขณะรอหน้าแรก)`, stopped > 0, `pid=${stopped}`);
    expectRed(`CDP เงียบขณะรอหน้าแรก (ฉีดตกในลูปที่ครั้งที่ ${tries})`, r, 75000, WANT);
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
      const p = ctx.chrome();
      if (p) { try { process.kill(p, 'SIGKILL'); killed = p; } catch { /* ตายแล้ว */ } }
    });
    check(`${r.file} · ฆ่า chrome ได้ก่อนข้อแรกผ่านจริง`, killed > 0, `pid=${killed}`);
    expectRed('chrome ตายตอนเริ่มต้น CDP', r, 45000, /CDP|chrome/);
  }
});

/* ---------- 9. สัญญาณที่จับได้ ยิงที่ "ตัวด่าน" ตัวเดียว (รีวิว AIO-47 C1 · AIO-48 C5) ----------
   ทางนี้มีคนเดินจริงและอยู่ในรีโปนี้เอง: tools/check-ac.mjs ครอบด่านลูกด้วย spawnSync + timeout
   ซึ่ง killSignal ค่าตั้งต้นของ node คือ SIGTERM · และคนที่กด Ctrl-C ก็เดินทางเดียวกัน
   ต้องยิง pid ตัวเดียว ห้ามยิง -pid: ยิงทั้งกลุ่มลูกก็ตายเองโดยไม่ต้องพึ่ง cleanup()
   ⇒ เคสจะเขียวทั้งที่ถอด handler ออกแล้ว (วัดมาแล้ว: ถอด handler → เหลือลูกค้าง 13 ตัว) */
await caseOf('ตัวด่านได้รับสัญญาณที่จับได้ (SIGTERM/SIGINT/SIGHUP) กลางการวัด', async () => {
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    let sent = 0;
    const r = await runGate(MID[0], {}, 40000, ctx => {
      /* เงื่อนไขที่ตรวจได้แน่นอน ไม่มีช่องเวลา: ลูกครบสองตัวแล้วและข้อแรกผ่านแล้ว */
      if (sent || !ctx.out.includes('✓') || !ctx.chrome() || !ctx.serve()) return;
      try { process.kill(ctx.pid, sig); sent = 1; } catch { /* ตายแล้ว */ }
    });
    check(`${r.file} · ยิง ${sig} ให้ตัวด่านตอนลูกครบแล้วจริง`, sent === 1);
    check(`${r.file} · ${sig} → ด่านออกด้วยโค้ด ไม่ใช่ตายด้วยสัญญาณ (handler ทำงาน) ใน ${(r.ms / 1000).toFixed(1)} วินาที`,
      typeof r.code === 'number' && r.code !== 0, `exit=${r.code}`);
    check(`${r.file} · ${sig} → ไม่เหลือ serve.mjs/chrome ค้าง (เคยเห็นลูกหลาน ${r.seen} ตัว)`,
      r.left.length === 0, r.left.join(' '));
    check(`${r.file} · ${sig} → ไม่เหลือโปรไฟล์ chrome ค้าง`, r.leftProfiles.length === 0, r.leftProfiles.join(' '));
  }
});

/* ---------- 10. เบราว์เซอร์แม่ตายขณะลูกหลานปิดตัวเองไม่ได้ (รีวิว AIO-48 C2) ----------
   ลูกหลานที่ยังวิ่งได้ chrome ปิดตัวเองเป็น ⇒ เคส 5 ไม่ได้วัดการเก็บกวาดจริง
   เคสที่วัดได้คือลูกหลานที่ "ปิดตัวเองไม่ได้" แล้วถูก reparent ไปใต้ pid 1 ตอนแม่ตาย
   วัดบน 6ba4a75 ได้ว่าเหลือ 11 กระบวนการสถานะ T ค้างอยู่หลังด่านจบ */
await caseOf('chrome แม่ถูกฆ่าขณะลูกหลานถูก SIGSTOP ไว้ (ลูกหลานถูก reparent ไป pid 1)', async () => {
  let hit = 0;
  const r = await runGate(MID[0], {}, 40000, ctx => {
    if (hit || !ctx.out.includes('✓')) return;
    const p = ctx.chrome();
    if (!p) return;
    const desc = tree(p).filter(x => x !== p);
    if (desc.length < 2) return;                 /* รอให้ต้นของ chrome ขึ้นครบก่อน */
    for (const q of desc) { try { process.kill(q, 'SIGSTOP'); } catch { /* ตายแล้ว */ } }
    try { process.kill(p, 'SIGKILL'); hit = desc.length; } catch { /* ตายแล้ว */ }
  });
  check(`${r.file} · หยุดลูกหลานแล้วฆ่าแม่ได้จริง`, hit >= 2, `ลูกหลานที่หยุดไว้ ${hit} ตัว`);
  expectRed('chrome แม่ตาย ลูกหลานปิดตัวเองไม่ได้', r, 40000, /CDP|chrome/);
});

/* ---------- 11–14. เคสที่ต้องผูกจังหวะแน่นอน: เรียกตัวร่วมตรง ๆ ในลูกของตัวเอง ----------
   ทั้งสี่เคสนี้คือมิวเทชันที่รอบก่อน "ไม่กัด" แล้วรายงานไว้ตรง ๆ ว่าไม่กัด
   ฝั่ง Codex ว่าควรกัดทั้งหมด (AIO-48 C5) ฝั่ง Claude ค้านว่าฉีดจากข้างนอกจะ flaky (AIO-47 §2.5)
   ทางนี้ไม่ฉีดจากข้างนอก: แทน WebSocket / ลดค่าใน T ในลูกตัวเอง ⇒ จังหวะแน่นอน ไม่แข่งกับเวลารันหน้า */

/* 11. handshake ของ WebSocket ไม่เสร็จ — TCP เปิดแต่ไม่มีใครตอบ upgrade */
await caseOf('handshake ของ WebSocket CDP ไม่เสร็จ (T.WS_OPEN ต้องเป็นเพดานจริง)', async () => {
  const src = fixture(`
T.WS_OPEN = 1500;
const t0 = Date.now();
globalThis.WebSocket = class { constructor() { /* ไม่ยิง onopen/onerror/onclose เลย */ } send() {} close() {} };
process.on('exit', () => console.log('หยุดรอที่ ' + (Date.now() - t0) + ' ms'));
await startGate(${AC2});
console.log('ไม่ควรมาถึงบรรทัดนี้');
`);
  const r = await runGate({ src, name: 'cdp-gate · handshake', env: {} }, {}, 40000);
  expectStop('handshake ไม่เสร็จ', r, /handshake ของ WebSocket CDP ไม่เสร็จ/, 4000);
});

/* 12. เพดานรวมของหน้า — คำตอบที่ช้ากว่า T.PAGE ต้องไม่ยืดเวลารวมออกไปอีกเท่า T.SEND */
await caseOf('T.PAGE เป็นเพดานรวมจริง (รวมคำสั่งที่กำลังรออยู่ · รีวิว AIO-48 C4)', async () => {
  const src = fixture(`
T.PAGE = 2000;
const g = await startGate(${AC2});
const t0 = Date.now();
try { await g.until('/', 'new Promise(r => setTimeout(function () { r(false); }, 9000))'); console.log('ไม่ควรสำเร็จ'); }
catch (e) { console.log('หยุดรอที่ ' + (Date.now() - t0) + ' ms · ' + e.message); }
await g.cleanup(1);
`);
  const r = await runGate({ src, name: 'cdp-gate · เพดานหน้า', env: {} }, {}, 60000);
  expectStop('คำตอบช้ากว่าเพดานของหน้า', r, /โหลดหน้าไม่เสร็จใน 2 วินาที/, 3500);
});

/* 13. ws ปิดขณะลูกทั้งสองยังมีชีวิต — สมบัติที่มีแต่ wsDie ถือคนเดียว
   (alive() ช่วยไม่ได้เพราะลูกยังอยู่ ⇒ ถ้าไม่มี wsDie จะต้องรอครบ T.SEND) */
await caseOf('ws ปิดกลางคำสั่งขณะลูกยังมีชีวิต (wsDie ต้อง reject ตัวที่ค้างทันที)', async () => {
  const src = fixture(`
T.SEND = 25000;
const Real = globalThis.WebSocket;
let n = 0;
globalThis.WebSocket = function (url) {
  const real = new Real(url), self = { กลืนแล้ว: false };
  self.send = d => {
    if (++n === 5) { self.กลืนแล้ว = true; setTimeout(() => self.onclose && self.onclose({}), 50); return; }
    real.send(d);
  };
  self.close = () => { try { real.close(); } catch {} };
  real.onopen = e => self.onopen && self.onopen(e);
  real.onmessage = e => { if (!self.กลืนแล้ว) self.onmessage && self.onmessage(e); };
  real.onclose = e => { if (!self.กลืนแล้ว) self.onclose && self.onclose(e); };
  real.onerror = e => self.onerror && self.onerror(e);
  return self;
};
const g = await startGate(${AC2});
const t0 = Date.now();
try { await g.evaluate('1 + 1'); console.log('ไม่ควรสำเร็จ'); }
catch (e) { console.log('หยุดรอที่ ' + (Date.now() - t0) + ' ms · ' + e.message); }
await g.cleanup(1);
`);
  const r = await runGate({ src, name: 'cdp-gate · ws ปิด', env: {} }, {}, 60000);
  expectStop('ws ปิดขณะลูกยังอยู่', r, /ปิดการเชื่อมต่อ CDP กลางทาง/, 3000);
});

/* 14. serve.mjs ตาย "ระหว่างคำสั่งที่กำลังรอ" แล้วคำตอบมาถึงทีหลัง (รีวิว AIO-48 C3)
   เช็กก่อนคำสั่งเดียวไม่พอ — วัดบน 6ba4a75 ได้ว่าด่านรับค่าที่วัดจากเซิร์ฟเวอร์ที่ตายแล้วไปใช้ */
await caseOf('serve.mjs ตายระหว่างคำสั่งที่กำลังรอ (ห้ามรับคำตอบที่มาถึงทีหลังไปใช้)', async () => {
  const src = fixture(`
const g = await startGate(${AC2});
const cmdline = p => { try { return fs.readFileSync('/proc/' + p + '/cmdline', 'utf8').replace(/\\0/g, ' '); } catch { return ''; } };
const serve = tree(process.pid).find(p => cmdline(p).includes('tools/serve.mjs'));
const t0 = Date.now();
setTimeout(() => { try { process.kill(serve, 'SIGKILL'); } catch {} }, 100);
try {
  const v = await g.evaluate('new Promise(r => setTimeout(function () { r("ค่าที่วัดได้"); }, 700))');
  console.log('รับค่า ' + JSON.stringify(v) + ' ไปใช้ ทั้งที่ serve.mjs ตายไปแล้ว');
} catch (e) { console.log('หยุดรอที่ ' + (Date.now() - t0) + ' ms · ' + e.message); }
await g.cleanup(1);
`);
  const r = await runGate({ src, name: 'cdp-gate · serve ตายกลางคำสั่ง', env: {} }, {}, 60000);
  expectStop('serve ตายกลางคำสั่ง', r, /serve\.mjs ตายกลางทาง/, 3000);
  check('cdp-gate · ไม่รับค่าที่วัดจากเซิร์ฟเวอร์ที่ตายแล้วไปใช้',
    !/รับค่า /.test(r.out), JSON.stringify(r.out.slice(-200)));
});

/* ---------- 15. ห้ามแตกสำเนาตัวร่วมกลับไปไว้ในด่าน ----------
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
    /* สองสตริงข้างบนหลบได้ด้วยการต่อสตริง ('--remote-debugging-' + 'port') ⇒ แตกสำเนากลับไปเงียบ ๆ
       ตรวจทางบวกแทน: "ไฟล์ด่านต้องไม่ยกกระบวนการเองเลย" เป็นสมบัติที่ต่อสตริงหลบไม่ได้
       (spawnSync ของ build ใน test-contrast ไม่เข้าข่าย — แพตเทิร์นจับ spawn( ตัวเดียว · AIO-47 C9) */
    check(`${g.file} · ไม่เรียก spawn( เอง (สมบัติที่หลบด้วยการต่อสตริงไม่ได้)`,
      !/\bspawn\s*\(/.test(src), 'พบ spawn( ในไฟล์ด่าน');
  }
});

/* โปรไฟล์ที่ค้างอยู่จากการฉีดความล้มเหลว (ทาง SIGKILL ไม่มีใครได้เก็บกวาด) — ราว 29 MB ต่อตัว
   ห้ามลบด้วยเกณฑ์ "เก่ากว่า N นาที": workspace นี้แชร์กัน โปรไฟล์ที่ run อื่นกำลังใช้จะถูกลบทิ้ง
   ⇒ สองเงื่อนไขพร้อมกัน: (ก) เกิดหลังไฟล์นี้เริ่มรัน = เป็นของลูกของรันนี้เท่านั้น
   (ข) ไม่มีกระบวนการไหนในเครื่องอ้างถึงอยู่แล้ว
   ข้อ (ก) จำเป็นเพราะ "ไม่พบใน snapshot" ไม่ได้แปลว่าไม่มีเจ้าของ — ช่วงตั้งแต่ mkdtemp
   ถึงก่อน spawn chrome ยังไม่มีใครอ้างถึง ถ้า TMPDIR ใช้ร่วมกันก็ลบของคนอื่นได้ (รีวิว AIO-48) */
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
  try { if (fs.statSync(f).birthtimeMs < STARTED) continue; } catch { continue; }
  try { fs.rmSync(f, { recursive: true, force: true }); swept++; } catch { /* ของคนอื่น ไม่มีสิทธิ์ */ }
}
console.log(`\nเก็บโปรไฟล์ chrome ที่ไม่มีใครใช้แล้ว ${swept} ตัว`);
console.log(`ผล: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
