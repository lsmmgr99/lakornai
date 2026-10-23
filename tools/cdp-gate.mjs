/* ตัวร่วมของด่านที่ต้องวัดด้วยเบราว์เซอร์จริง — ยก tools/serve.mjs + chrome + CDP ขึ้นมาให้
   ใช้โดย tools/test-continue.mjs และ tools/test-contrast.mjs · ด่านกันการถอย: tools/test-ports.mjs

   ทำไมต้องเป็นไฟล์เดียว: โค้ดก้อนนี้เคยถูกก๊อปไว้สองที่ แล้วรีวิวรอบ 2 จับได้ว่าการแก้
   "chrome ตายกลางทาง" ลงครบทั้งสองไฟล์จริง แต่ด่านกันถอยยิงแค่ไฟล์เดียว (AIO-45 C2)
   ⇒ ความไม่สมมาตรเป็นของที่เกิดขึ้นเองเมื่อมีสองสำเนา · รวมเป็นตัวเดียวแล้วแก้ทีเดียวจบ

   กฎที่ทุกเส้นทางต้องรักษา (ทุกข้อมาจากอาการที่วัดได้จริง ไม่ใช่การเผื่อไว้):
   1. ไม่มีการรอแบบไม่มีกำหนด — ทุกการรอมีเพดานและบอกสาเหตุจริงเมื่อครบ
   2. พอร์ตที่ใช้ต้องเป็นของลูกที่รันนี้ยกขึ้นเองเท่านั้น — "มีใครตอบที่พอร์ตนั้น" ไม่ใช่หลักฐาน
      (workspace นี้แชร์กับ run อื่น · เขียวจากไฟล์ของ checkout อื่นคือการรับรองของที่ไม่ได้ตรวจ)
   3. ออกทางไหนก็ต้องไม่เหลือลูกค้างถือพอร์ต — รวมทางที่ promise ไหนก็ตาม reject แบบไม่มีใครรับ
      (ลูกที่ค้างคือต้นเหตุที่ทำให้ "รันถัดไป" แดงแบบไม่มีบั๊ก — ตั๋ว AIO-42 ถูกเปิดด้วยอาการนี้) */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ลูกหลานทั้งต้นของ pid (ลึกสุดก่อน) — อ่านจาก /proc ไม่ใช้ pgrep
   (`pgrep -f` แพตเทิร์นตรงกับบรรทัดคำสั่งของเชลล์ตัวเองด้วย แล้วฆ่าตัวเอง) */
export function tree(pid, depth = 0) {
  const out = [];
  if (depth > 6) return out;
  for (const e of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(e)) continue;
    try {
      const st = fs.readFileSync(`/proc/${e}/stat`, 'utf8');
      if (+st.slice(st.lastIndexOf(')') + 2).split(' ')[1] === pid) out.push(...tree(+e, depth + 1), +e);
    } catch { /* ตายไปแล้วระหว่างอ่าน */ }
  }
  out.push(pid);
  return out;
}

/* เพดานของแต่ละชั้น — ตั้งชื่อไว้ให้ด่าน tools/test-ports.mjs อ้างถึงได้ */
export const T = {
  SERVE_UP: 10000,     /* รอบรรทัดพร้อมจาก serve.mjs ของเราเอง */
  CHROME_UP: 20000,    /* รอบรรทัด DevTools listening จาก chrome ของเราเอง */
  WS_OPEN: 10000,      /* handshake ของ WebSocket */
  SEND: 30000,         /* คำสั่ง CDP หนึ่งคำสั่ง */
  PAGE: 45000,         /* เพดานรวมของการรอหนึ่งหน้า */
  REAP: 3000,          /* รอยืนยันว่าลูกตายจริงก่อนยก SIGKILL */
};

/* พอร์ต — workspace นี้แชร์กับ run อื่น · พอร์ตตายตัวทำให้ด่านค้างเมื่อมีคนถืออยู่ (AIO-42)
   ⇒ ขอพอร์ตว่างจาก OS เป็นค่าตั้งต้น · ตั้งทับด้วย env ได้เหมือนเดิม
   ขอทีเดียวทุกตัวแล้วค่อยปล่อยคืนพร้อมกัน: ถ้าปล่อยทีละตัว OS คืนเลขเดิมซ้ำได้
   แล้ว serve.mjs กับ chrome จะไปชนกันเอง */
async function freePorts(envNames) {
  const held = [], ports = [];
  for (const name of envNames) {
    if (process.env[name]) { ports.push(+process.env[name]); continue; }
    const s = await new Promise((res, rej) => {
      const srv = net.createServer();
      srv.once('error', rej);
      srv.listen(0, '127.0.0.1', () => res(srv));
    });
    held.push(s); ports.push(s.address().port);
  }
  await Promise.all(held.map(s => new Promise(r => s.close(r))));
  return ports;
}

/* ยกเซิร์ฟเวอร์ + เบราว์เซอร์ + ต่อ CDP ให้พร้อมใช้ · ล้มตรงไหนก็เก็บกวาดแล้ว exit 1 เอง
   envPorts: [ชื่อ env ของพอร์ต HTTP, ชื่อ env ของพอร์ต CDP] */
export async function startGate({ envPorts, profilePrefix }) {
  const [httpEnv, cdpEnv] = envPorts;
  const [PORT, CDP] = await freePorts(envPorts);
  const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), profilePrefix));
  const BASE = `http://127.0.0.1:${PORT}`;

  /* ---------- เก็บกวาด: ตั้งก่อนยกลูกตัวแรก ---------- */
  const kids = [];
  let exiting = false;
  /* ทางสุดท้ายที่ทำงานแน่ไม่ว่าจะออกด้วยอะไร (รวม process.exit จากที่อื่น)
     ต้องเป็นงาน sync ทั้งหมด — ใน 'exit' ไม่มีรอบ event loop เหลือให้ await แล้ว
     ต้องไล่ฆ่าลูกหลานทั้งต้น: chrome มี renderer/zygote เป็นลูกของมันอีกชั้น
     ฆ่าแค่ pid ของเบราว์เซอร์จะเหลือลูกไปอยู่ใต้ pid 1 (รีวิว AIO-45 C3/C9)
     ไม่ยิงทั้ง process group: ลูกอยู่กลุ่มเดียวกับตัวด่านโดยเจตนา (ด่าน tools/test-ports.mjs
     และ check-ac ต้องเก็บกวาดทั้งตระกูลได้ด้วย kill(-pid) ตอนตัวด่านค้าง)
     ⇒ ยิงกลุ่มตัวเองก็เท่ากับฆ่าตัวเองกลางการเก็บกวาด */
  const reapSync = () => {
    for (const k of kids) for (const p of tree(k.pid)) { try { process.kill(p, 'SIGKILL'); } catch { /* ตายแล้ว */ } }
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* ไม่มีแล้ว */ }
  };
  process.on('exit', reapSync);

  async function cleanup(code) {
    if (exiting) return new Promise(() => {});   /* กันเรียกซ้ำจากทางอื่นที่กำลังล้มพร้อมกัน */
    exiting = true;
    for (const k of kids) { try { process.kill(k.pid, 'SIGTERM'); } catch { /* ตายแล้ว */ } }
    /* รอยืนยันว่าตายจริงก่อนไป — SIGTERM แล้ว exit ทันทีทำให้ chrome ที่เพิ่งขึ้น 0.4 วินาที
       รอดไปถือพอร์ต CDP ต่อ (รีวิว AIO-45 C3 วัดได้) */
    const until = Date.now() + T.REAP;
    while (kids.some(k => k.alive()) && Date.now() < until) await sleep(25);
    reapSync();
    process.exit(code);
  }

  const die = e => {
    if (exiting) return;
    console.error('ทดสอบล้ม: ' + (e?.message || e));
    cleanup(1);
  };
  /* ทุกทางที่โปรแกรมจบต้องผ่าน cleanup() — ของเดิมมีคำสั่งเริ่มต้น CDP อยู่นอก try
     การ reject ตรงนั้นจึงกลายเป็น top-level rejection แล้ว node ออกโดยไม่เก็บกวาด
     ทิ้ง serve.mjs ถือพอร์ตไว้ (รีวิว AIO-46 R1 วัดได้) · ดักที่ระดับ process จึงครอบทุกบรรทัด
     รวมบรรทัดที่ใครจะเพิ่มวันหลังด้วย ไม่ใช่แค่ที่เรานึกออกวันนี้ */
  process.on('unhandledRejection', die);
  process.on('uncaughtException', die);
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => cleanup(1));

  const track = child => {
    const k = { pid: child.pid, child, code: null, alive: () => k.code === null };
    child.on('exit', (c, sig) => { k.code = c === null ? `สัญญาณ ${sig}` : c; });
    kids.push(k);
    return k;
  };

  /* ---------- 1. เซิร์ฟเวอร์ของเราเอง ---------- */
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)],
    { stdio: ['ignore', 'pipe', 'ignore'] });
  const srv = track(server);
  /* หลักฐานว่าพอร์ตเป็นของลูกตัวนี้จริง = บรรทัดที่ tools/serve.mjs:41 พิมพ์หลัง listen สำเร็จ
     ของเดิมถือว่า "มีใครตอบ HTTP ที่พอร์ตนั้น" = พร้อม ⇒ เซิร์ฟเวอร์ของ run อื่น (คนละ checkout)
     ทำให้ด่านเขียวจากไฟล์ของคนอื่นได้ ทั้งที่ลูกของเราไม่ได้พอร์ตเลย (รีวิว AIO-44 ข้อ 2)
     ต่อสตริงสะสมก่อนเทียบ: บรรทัดพร้อมมาแยก chunk ได้ */
  let ready = false, serverOut = '';
  server.stdout.on('data', d => {
    serverOut += d;
    if (serverOut.includes(`http://127.0.0.1:${PORT}/`)) ready = true;
  });
  const upBy = Date.now() + T.SERVE_UP;
  while (!ready && srv.alive() && Date.now() < upBy) await sleep(25);
  if (!ready) {
    console.error(`✗ เปิด tools/serve.mjs ที่พอร์ต ${PORT} ไม่ได้` +
      (srv.alive()
        ? ` (หมดเวลา ${T.SERVE_UP / 1000} วินาที — ไม่ได้บรรทัดพร้อมจาก serve.mjs ของรันนี้)`
        : ` (serve.mjs ออกด้วยโค้ด ${srv.code} — น่าจะมีคนถือพอร์ตอยู่ · ตั้ง ${httpEnv} เลือกเองได้)`));
    await cleanup(1);
  }

  /* ---------- 2. เบราว์เซอร์ของเราเอง ---------- */
  /* หลักฐานความเป็นเจ้าของพอร์ต CDP = บรรทัดที่ chrome ลูกตัวนี้พิมพ์ออก stderr ของมันเอง
       DevTools listening on ws://127.0.0.1:<พอร์ต>/devtools/browser/<guid>
     ของเดิมถาม `/json/new` ที่พอร์ตนั้นแทน ซึ่งใครก็ตอบได้ — วัดแล้วว่า chrome ของ run อื่น
     ทำให้ด่านเขียวครบ 66 ข้อโดยที่ chrome ของเรา bind ไม่ได้เลย (รีวิว AIO-45 C1)
     บรรทัดนี้ยังพา ws URL ที่มี guid ของเบราว์เซอร์ตัวนั้นมาด้วย ⇒ ถ้าพอร์ตถูกคนอื่นแย่งไป
     ระหว่างทาง handshake จะไม่ผ่านเพราะ guid ไม่ใช่ของมัน · และตัดลูปถาม HTTP ทิ้งได้ทั้งก้อน
     หมายเหตุ: stderr ของ chrome ในกล่องนี้มี noise ของ dbus/GLib เยอะ จึงสะสมสตริงแล้วค่อย match */
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const chr = track(chrome);
  let chromeErr = '';
  chrome.stderr.on('data', d => { chromeErr += d; });
  const WS_RE = new RegExp(`DevTools listening on (ws://127\\.0\\.0\\.1:${CDP}/devtools/browser/\\S+)`);
  const cdpBy = Date.now() + T.CHROME_UP;
  let found = null;
  while (!(found = chromeErr.match(WS_RE)) && chr.alive() && Date.now() < cdpBy) await sleep(25);
  if (!found) {
    /* เก็บโค้ดตอนออกของ chrome ไว้บอกเหตุจริง — ของเดิมไม่เก็บ เคส "chrome ตายตอน 115 ms"
       จึงต้องรอครบเพดานแล้วรายงานว่าต่อไม่ติด ซึ่งชี้ผิดทาง (รีวิว AIO-45 C7) */
    console.error(`✗ chrome ไม่ได้เปิดพอร์ต CDP ${CDP} ให้รันนี้` +
      (chr.alive()
        ? ` (หมดเวลา ${T.CHROME_UP / 1000} วินาที — ไม่ได้บรรทัด DevTools listening จาก chrome ของรันนี้` +
          ` · ถ้าตั้ง ${cdpEnv} ทับ อาจมีคนถือพอร์ตนั้นอยู่)`
        : ` (chrome ออกด้วยโค้ด ${chr.code})`));
    await cleanup(1);
  }

  /* ---------- 3. ต่อ CDP ---------- */
  let ws, wsDead = null;
  let id = 0; const pending = new Map();
  /* chrome ตายกลางทางเกิดขึ้นจริงในกล่องนี้ (หลาย run ขนานกัน · OOM-kill) ⇒ ws ปิด
     ถ้าไม่ reject ตัวที่ค้างอยู่ใน pending ด่านจะค้างเงียบจนคนมาฆ่า (รีวิว AIO-43 R2) */
  function wsDie(msg) {
    wsDead = wsDead || Object.assign(new Error(msg), { fatal: true });
    for (const { rej } of pending.values()) rej(wsDead);
    pending.clear();
  }
  try {
    ws = new WebSocket(found[1]);
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`handshake ของ WebSocket CDP ไม่เสร็จใน ${T.WS_OPEN / 1000} วินาที`)), T.WS_OPEN);
      const done = fn => (...a) => { clearTimeout(t); fn(...a); };
      ws.onopen = done(res);
      ws.onerror = done(() => rej(new Error('WebSocket ของ CDP ล้มตอนเปิด')));
      ws.onclose = done(() => rej(new Error('chrome ปิดการเชื่อมต่อ CDP ก่อนเริ่มใช้งาน')));
    });
  } catch (e) {
    console.error('ทดสอบล้ม: ' + (e.message || e));
    await cleanup(1);
  }
  ws.onclose = () => wsDie('chrome ปิดการเชื่อมต่อ CDP กลางทาง');
  ws.onerror = () => wsDie('การเชื่อมต่อ CDP ล้มกลางทาง');
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  /* คำสั่งที่ไม่ได้คำตอบต้องหมดอายุ และต้องติดป้าย fatal ไปด้วย:
     "CDP เงียบ" ไม่ใช่ error ชั่วคราวตอนหน้ากำลังเปลี่ยน ⇒ ลูปรอหน้าห้ามกลืนแล้วส่งคำสั่งใหม่
     ของเดิมกลืน จึงวนได้ 100 รอบ × 30 วินาที ≈ 50 นาทีแล้วรายงานว่า "โหลดหน้าไม่เสร็จ"
     ซึ่งกลบเหตุจริง (รีวิว AIO-46 R3 · AIO-45 C2) */
  const raw = (method, params = {}, sessionId) => new Promise((res, rej) => {
    if (wsDead) { rej(wsDead); return; }
    const i = ++id;
    const t = setTimeout(() => {
      if (pending.delete(i)) {
        rej(Object.assign(new Error(`CDP ไม่ตอบคำสั่ง ${method} ใน ${T.SEND / 1000} วินาที`), { fatal: true }));
      }
    }, T.SEND);
    pending.set(i, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
    try { ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); }
    catch (e) { clearTimeout(t); pending.delete(i); rej(e); }
  });

  /* ws ที่ได้มาเป็นของ "ตัวเบราว์เซอร์" ไม่ใช่ของแท็บ ⇒ เปิดแท็บแล้วเกาะด้วย flatten
     (ของเดิมได้ ws ของแท็บมาจาก `/json/new` ซึ่งเป็นทาง HTTP ที่พิสูจน์เจ้าของไม่ได้) */
  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params = {}) => raw(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js error');
    return r.result.value;
  }

  /* ลูกที่ตายกลางทางต้องหยุดการรันทันทีพร้อมเหตุจริง — ของเดิมอ่าน serverExit ครั้งเดียว
     ตอนรอพร้อม หลังจากนั้นไม่มีใครดูอีก ⇒ serve.mjs ตายหลังพิมพ์บรรทัดพร้อมแล้ว
     ด่านไปรายงานว่า "โหลดหน้าไม่เสร็จ" ซึ่งชี้ไปที่หน้าเว็บทั้งที่ของจริงคือเซิร์ฟเวอร์ตาย
     (รีวิว AIO-45 C5 · AIO-46 R2 — เคสจริงคือมีคนเข้ามาแทนที่พอร์ตนั้นต่อแล้วด่านเขียวจากของคนอื่น) */
  function alive() {
    if (wsDead) throw wsDead;
    if (!srv.alive()) throw Object.assign(new Error(`serve.mjs ตายกลางทาง (โค้ด ${srv.code})`), { fatal: true });
    if (!chr.alive()) throw Object.assign(new Error(`chrome ตายกลางทาง (โค้ด ${chr.code})`), { fatal: true });
  }

  /* เปิดหน้าแล้วรอจนเงื่อนไขที่ส่งมาเป็นจริง · expr ต่างกันไปตามด่าน
     (test-continue มีข้อที่ต้องวัดว่า window.LakornProgress หายไปหรือไม่ จึงรอแค่ readyState ได้) */
  async function until(p, expr) {
    await send('Page.navigate', { url: BASE + p });
    const by = Date.now() + T.PAGE;
    while (Date.now() < by) {
      alive();
      /* กลืน error ได้เฉพาะตอนหน้ากำลังเปลี่ยน (context ถูกทิ้ง) — ตัวที่ติดป้าย fatal ห้ามกลืน */
      try { if (await evaluate(expr)) return; }
      catch (e) { if (e.fatal) throw e; }
      await sleep(60);
    }
    throw new Error(`โหลดหน้าไม่เสร็จใน ${T.PAGE / 1000} วินาที: ${p}`);
  }

  return { PORT, CDP, BASE, send, evaluate, until, cleanup, sleep };
}
