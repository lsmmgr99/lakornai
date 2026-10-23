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

/* ตาราง pid ทั้งเครื่องจากการกวาด /proc รอบเดียว — ppid สำหรับไล่ต้น และ starttime
   สำหรับยืนยันว่า "pid นี้ยังเป็นกระบวนการตัวเดิม" ก่อนยิงสัญญาณ
   (กล่องนี้ spawn chrome ถี่และแชร์กับ run อื่น ⇒ pid ถูกรีไซเคิลได้ · รีวิว AIO-47 C8)
   ทำรอบเดียวแล้วส่งตารางต่อ: ของเดิมเรียกซ้ำทุกชั้นของต้น = กวาด /proc 13 รอบต่อการเรียกหนึ่งครั้ง
   ซึ่งแพงเกินจะเรียกเป็นระยะ และระยะคือสิ่งที่ข้อ "ลูกหลานถูก reparent" ต้องใช้ (รีวิว AIO-48 C2) */
export function procTable() {
  const kidsOf = new Map(), born = new Map();
  for (const e of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(e)) continue;
    try {
      const st = fs.readFileSync(`/proc/${e}/stat`, 'utf8');
      const f = st.slice(st.lastIndexOf(')') + 2).split(' ');   /* f[0] = state (ฟิลด์ 3) */
      const pid = +e, ppid = +f[1];
      born.set(pid, f[19]);                                     /* starttime = ฟิลด์ 22 */
      if (!kidsOf.has(ppid)) kidsOf.set(ppid, []);
      kidsOf.get(ppid).push(pid);
    } catch { /* ตายไปแล้วระหว่างอ่าน */ }
  }
  return { kidsOf, born };
}

/* ลูกหลานทั้งต้นของ pid (ลึกสุดก่อน) — อ่านจาก /proc ไม่ใช้ pgrep
   (`pgrep -f` แพตเทิร์นตรงกับบรรทัดคำสั่งของเชลล์ตัวเองด้วย แล้วฆ่าตัวเอง)
   ไม่ตัดความลึก: ต้นของ chrome ลึก 3 ชั้นในกล่องนี้ แต่ตัวเลขตายตัวทำให้พลาดชั้นที่ลึกกว่าเงียบ ๆ
   กัน pid ซ้ำด้วย seen — ของเดิมดัน pid เดิมเข้าสองครั้ง (วัดได้: ลูกหลาน 11 ตัวรายงานเป็น 22) */
export function tree(pid, t = procTable()) {
  const out = [], seen = new Set();
  const walk = p => {
    if (seen.has(p)) return;
    seen.add(p);
    for (const c of t.kidsOf.get(p) || []) walk(c);
    out.push(p);
  };
  walk(pid);
  return out;
}

/* เพดานของแต่ละชั้น — ตั้งชื่อไว้ให้ด่าน tools/test-ports.mjs อ้างถึงได้ */
export const T = {
  SERVE_UP: 10000,     /* รอบรรทัดพร้อมจาก serve.mjs ของเราเอง */
  CHROME_UP: 20000,    /* รอบรรทัด DevTools listening จาก chrome ของเราเอง */
  WS_OPEN: 10000,      /* handshake ของ WebSocket */
  SEND: 30000,         /* คำสั่ง CDP หนึ่งคำสั่ง */
  PAGE: 45000,         /* เพดานรวมของการรอหนึ่งหน้า — รวมคำสั่งที่กำลังรออยู่ด้วย */
  REAP: 3000,          /* รอยืนยันว่าลูกตายจริงก่อนยก SIGKILL */
  CENSUS: 200,         /* จดลูกหลานทุกกี่มิลลิวินาที (ต้องจดก่อนแม่ตาย ไม่ใช่ตอนเก็บกวาด) */
};

/* ท้ายสุดของบันทึกไว้ใส่ข้อความแดง — เหตุจริงอยู่ท้ายล็อกเสมอ และล็อกเต็มยาวเกินจะพิมพ์ */
const tail = (buf, n = 3) => {
  const lines = buf.split('\n').map(l => l.trim()).filter(Boolean).slice(-n);
  return lines.length ? ` · ท้ายล็อก: ${lines.join(' / ')}` : '';
};

/* พอร์ต — workspace นี้แชร์กับ run อื่น · พอร์ตตายตัวทำให้ด่านค้างเมื่อมีคนถืออยู่ (AIO-42)
   ⇒ ขอพอร์ตว่างจาก OS เป็นค่าตั้งต้น · ตั้งทับด้วย env ได้เหมือนเดิม
   ขอทีเดียวทุกตัวแล้วค่อยปล่อยคืนพร้อมกัน: ถ้าปล่อยทีละตัว OS คืนเลขเดิมซ้ำได้
   แล้ว serve.mjs กับ chrome จะไปชนกันเอง */
async function freePorts(envNames) {
  const held = [], ports = [];
  for (const name of envNames) {
    if (process.env[name]) {
      /* ค่าที่ตั้งมาผิดต้องบอกว่า "ค่าที่คุณตั้ง" ไม่ใช่ไปโทษว่ามีคนถือพอร์ตอยู่
         ของเดิม AC2_PORT=abc ได้ข้อความ "เปิด serve.mjs ที่พอร์ต NaN ไม่ได้ (น่าจะมีคนถือพอร์ต)"
         และ AC2_CDP=0 รอครบ 20 วินาทีก่อนโทษ run อื่น (รีวิว AIO-47 C7) */
      const n = Number(process.env[name]);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        console.error(`✗ ค่า ${name}=${JSON.stringify(process.env[name])} ไม่ใช่เลขพอร์ตที่ใช้ได้ (1–65535)`);
        process.exit(1);
      }
      ports.push(n); continue;
    }
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
  /* ทะเบียนลูกหลาน: pid → starttime ที่เห็นครั้งแรก
     ทำไมต้องจดเป็นระยะ ไม่ใช่ไล่ต้นตอนเก็บกวาด: ถ้าเบราว์เซอร์แม่ตายก่อน (OOM-kill หรือถูกฆ่า)
     renderer/zygote จะไปอยู่ใต้ pid 1 ทันที ⇒ ไล่จาก pid ของแม่ตอนนั้นไม่พบใครเลย
     วัดได้: SIGSTOP ลูกหลานแล้ว SIGKILL แม่ → เหลือ 11 กระบวนการสถานะ T ค้างหลังด่านจบ
     (รีวิว AIO-48 C2) · ลูกที่ยังวิ่งได้ chrome ปิดตัวเองเป็น แต่ลูกที่ปิดตัวเองไม่ได้คือเคสที่เหลือค้าง
     starttime กันยิงผิดตัวเมื่อ pid ถูกรีไซเคิล (รีวิว AIO-47 C8) */
  const known = new Map();
  const census = () => {
    const t = procTable();
    for (const k of kids) for (const p of tree(k.pid, t)) if (!known.has(p)) known.set(p, t.born.get(p));
  };
  const poll = setInterval(census, T.CENSUS);
  poll.unref();
  /* ยังเป็นกระบวนการตัวเดิมที่เราจดไว้จริงไหม — ใช้ทั้งก่อนยิงและตอนยืนยันว่าตายแล้ว */
  const stillOurs = (p, t) => known.get(p) !== undefined && t.born.get(p) === known.get(p);
  /* ทางสุดท้ายที่ทำงานแน่ไม่ว่าจะออกด้วยอะไร (รวม process.exit จากที่อื่น)
     ต้องเป็นงาน sync ทั้งหมด — ใน 'exit' ไม่มีรอบ event loop เหลือให้ await แล้ว
     ต้องไล่ฆ่าลูกหลานทั้งต้น: chrome มี renderer/zygote เป็นลูกของมันอีกชั้น
     ฆ่าแค่ pid ของเบราว์เซอร์จะเหลือลูกไปอยู่ใต้ pid 1 (รีวิว AIO-45 C3/C9)
     ไม่ยิงทั้ง process group: ลูกอยู่กลุ่มเดียวกับตัวด่านโดยเจตนา (ด่าน tools/test-ports.mjs
     และ check-ac ต้องเก็บกวาดทั้งตระกูลได้ด้วย kill(-pid) ตอนตัวด่านค้าง)
     ⇒ ยิงกลุ่มตัวเองก็เท่ากับฆ่าตัวเองกลางการเก็บกวาด */
  const killKnown = () => {
    census();
    const t = procTable();
    for (const p of known.keys()) {
      if (!stillOurs(p, t)) continue;          /* ตายแล้ว หรือเป็นกระบวนการอื่นที่มาใช้ pid นี้ต่อ */
      try { process.kill(p, 'SIGCONT'); } catch { /* ตายแล้ว */ }   /* ตัวที่ถูก SIGSTOP ต้องปลุกก่อนจะได้ตายจริง */
      try { process.kill(p, 'SIGKILL'); } catch { /* ตายแล้ว */ }
    }
  };
  const reapSync = () => {
    killKnown();
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* ไม่มีแล้ว */ }
  };
  process.on('exit', reapSync);

  /* เรียกซ้ำจะได้ promise ที่ไม่ settle ตลอดไปโดยเจตนา: ผู้เรียกรายที่สองกำลังล้มพร้อมกัน
     และ process.exit() ของรายแรกคือสิ่งที่จะจบโปรแกรม ⇒ ผู้เรียกจะไม่ได้กลับมาอีก */
  async function cleanup(code) {
    if (exiting) return new Promise(() => {});
    exiting = true;
    census();
    for (const k of kids) { try { process.kill(k.pid, 'SIGTERM'); } catch { /* ตายแล้ว */ } }
    /* รอยืนยันว่าตายจริงก่อนไป — SIGTERM แล้ว exit ทันทีทำให้ chrome ที่เพิ่งขึ้น 0.4 วินาที
       รอดไปถือพอร์ต CDP ต่อ (รีวิว AIO-45 C3 วัดได้) */
    const by = Date.now() + T.REAP;
    while (kids.some(k => k.alive()) && Date.now() < by) await sleep(25);
    killKnown();
    /* แล้วยืนยันว่า "ลูกหลานทั้งทะเบียน" ตายจริงก่อนลบโปรไฟล์ — ไม่ใช่แค่ลูกตรงสองตัว
       (ลบโปรไฟล์ขณะยังมีคนใช้ = chrome ที่ยังไม่ตายไปเขียนไฟล์ในโฟลเดอร์ที่หายแล้ว) */
    const gone = Date.now() + T.REAP;
    while (Date.now() < gone) {
      const t = procTable();
      if (![...known.keys()].some(p => stillOurs(p, t))) break;
      await sleep(25);
    }
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
  /* stderr ต้องเป็น 'pipe' ไม่ใช่ 'ignore': tools/serve.mjs ตอบ 500 แทนล้มทั้งตัวเมื่ออ่านไฟล์ไม่ได้
     แล้วเขียนเหตุไว้ที่ stderr — ถ้าโยนทิ้ง เหตุนั้นไปไม่ถึงใคร และอาการที่คนอ่านผลเห็น
     จะกลายเป็น "โหลดหน้าไม่เสร็จ" ซึ่งชี้ไปที่หน้าเว็บทั้งที่ของจริงคือเซิร์ฟเวอร์ตอบ 500
     (รีวิว AIO-47 C3 วัดได้: "! /%E0%A4%A → URI malformed" ถูก 'ignore' ทิ้ง) */
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  const srv = track(server);
  let serverErr = '';
  server.stderr.on('data', d => { serverErr = (serverErr + d).slice(-4096); });
  const serveTail = () => (serverErr ? ` · serve.mjs${tail(serverErr)}` : '');
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
        : ` (serve.mjs ออกด้วยโค้ด ${srv.code} — น่าจะมีคนถือพอร์ตอยู่ · ตั้ง ${httpEnv} เลือกเองได้)`) +
      serveTail());
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
  chrome.stderr.on('data', d => { chromeErr = (chromeErr + d).slice(-16384); });
  /* ต้องรอ "บรรทัดครบ" (มี \n ปิดท้าย) ก่อนเชื่อ URL — `\S+` รับ guid ที่ขาดกลางได้ทันที
     ถ้า chunk แบ่งตรงกลาง guid พอดี ด่านจะไปต่อ ws ด้วย URL ที่ยังไม่ครบ แล้วแดงเทียม
     ทั้งที่เบราว์เซอร์ปกติดี (รีวิว AIO-48 C1 ทำซ้ำได้ · วัดซ้ำที่ระดับ regex แล้วจริง)
     และต้องไม่ตรึง host ไว้ในแพตเทิร์น: ถ้าตรึง เคสพอร์ตถูกคนอื่นถือจะกลายเป็น "ไม่ได้บรรทัด
     DevTools" (เท็จ — ได้ แต่ chrome ไป bind [::1] แทน) แล้วรอครบ 20 วินาทีก่อนบอกเหตุที่ผิด
     ⇒ รับทุก host แล้วตัดสินทีหลัง · ห้ามยอมใช้ host อื่น (รีวิว AIO-47 C2) */
  const WS_LINE = /DevTools listening on (ws:\/\/\S+)\r?\n/;
  const MINE = `ws://127.0.0.1:${CDP}/devtools/browser/`;
  const cdpBy = Date.now() + T.CHROME_UP;
  let found = null;
  while (!(found = chromeErr.match(WS_LINE)) && chr.alive() && Date.now() < cdpBy) await sleep(25);
  if (found && !found[1].startsWith(MINE)) {
    /* chrome พิมพ์ทุกอย่างที่ต้องรู้ใน ~60 ms: "bind() failed: Address already in use (98)"
       แล้วไปขึ้นที่ [::1] ⇒ แดงทันทีพร้อมเหตุจริง ไม่ใช่รอครบเพดานแล้วเดา */
    console.error(`✗ chrome bind 127.0.0.1:${CDP} ไม่ได้ (พอร์ตถูกถืออยู่) · ไปขึ้นที่ ${found[1].split('/devtools')[0]} แทน` +
      ` ⇒ พอร์ต CDP นั้นไม่ใช่ของรันนี้ · ตั้ง ${cdpEnv} เลือกเองได้` + tail(chromeErr, 2));
    await cleanup(1);
  }
  if (!found) {
    /* เก็บโค้ดตอนออกของ chrome ไว้บอกเหตุจริง — ของเดิมไม่เก็บ เคส "chrome ตายตอน 115 ms"
       จึงต้องรอครบเพดานแล้วรายงานว่าต่อไม่ติด ซึ่งชี้ผิดทาง (รีวิว AIO-45 C7) */
    console.error(`✗ chrome ไม่ได้เปิดพอร์ต CDP ${CDP} ให้รันนี้` +
      (chr.alive()
        ? ` (หมดเวลา ${T.CHROME_UP / 1000} วินาที — ไม่ได้บรรทัด DevTools listening จาก chrome ของรันนี้` +
          ` · ถ้าตั้ง ${cdpEnv} ทับ อาจมีคนถือพอร์ตนั้นอยู่)`
        : ` (chrome ออกด้วยโค้ด ${chr.code})`) + tail(chromeErr, 2));
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
  /* deadline: เวลาที่ "การรอหนึ่งหน้า" หมดอายุ — ส่งต่อเข้ามาเพื่อให้ T.PAGE เป็นเพดานรวมจริง
     ของเดิมนาฬิกาของลูปกับของคำสั่งแยกกัน ⇒ เข้า evaluate ก่อนครบ PAGE เสี้ยววินาที
     ยังรอต่อได้อีกเท่า T.SEND ⇒ เพดานจริงคือ PAGE + SEND ไม่ใช่ตัวเลขที่ชื่อบอก
     (รีวิว AIO-48 C4 · AIO-47 §2.4 ชี้เลข 75 วินาทีไว้ตรงกัน) */
  const rawSend = (method, params, sessionId, deadline) => new Promise((res, rej) => {
    if (wsDead) { rej(wsDead); return; }
    const i = ++id;
    const ms = Math.max(1, Math.min(T.SEND, (deadline ?? Infinity) - Date.now()));
    const capped = ms < T.SEND;
    const t = setTimeout(() => {
      if (pending.delete(i)) {
        rej(Object.assign(new Error(`CDP ไม่ตอบคำสั่ง ${method} ใน ${(ms / 1000).toFixed(1)} วินาที`),
          { fatal: true, pageDeadline: capped }));
      }
    }, ms);
    pending.set(i, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
    try { ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); }
    catch (e) { clearTimeout(t); pending.delete(i); rej(e); }
  });
  /* เช็กลูกทั้ง "ก่อน" และ "หลัง" ทุกคำสั่ง — ไม่ใช่แค่ก่อน evaluate
     ก่อนเดียวไม่พอ: ลูกตายระหว่างคำสั่งที่กำลังรอ แล้วคำตอบเดินทางมาถึงทีหลัง ด่านก็รับไปใช้
     วัดได้บน 6ba4a75: ฆ่า serve.mjs ที่ 100 ms แล้ว evaluate ที่ตอบที่ 600 ms ยังคืนค่าสำเร็จ
     ⇒ ข้อกำหนด "serve ตายกลางรันต้องแดง" ยังไม่จริง (รีวิว AIO-48 C3)
     และวางที่ raw() ไม่ใช่ที่ evaluate() เพื่อให้ครอบคำสั่งที่ใครจะเพิ่มวันหลังด้วย (AIO-47 §2.3) */
  const raw = async (method, params = {}, sessionId, deadline) => {
    alive();
    const r = await rawSend(method, params, sessionId, deadline);
    alive();
    return r;
  };

  /* ws ที่ได้มาเป็นของ "ตัวเบราว์เซอร์" ไม่ใช่ของแท็บ ⇒ เปิดแท็บแล้วเกาะด้วย flatten
     (ของเดิมได้ ws ของแท็บมาจาก `/json/new` ซึ่งเป็นทาง HTTP ที่พิสูจน์เจ้าของไม่ได้) */
  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params = {}, deadline) => raw(method, params, sessionId, deadline);
  await send('Page.enable');
  await send('Runtime.enable');

  async function evaluate(expr, deadline) {
    const r = await send('Runtime.evaluate',
      { expression: expr, returnByValue: true, awaitPromise: true }, deadline);
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
    const by = Date.now() + T.PAGE;      /* นาฬิกาเริ่มก่อน navigate ⇒ รวมเวลาของ navigate ด้วย */
    let last = null;
    /* ข้อความแดงต้องพา "เหตุล่าสุดที่เจอระหว่างรอ" ไปด้วย — error ที่ลูปกลืนไว้คือเหตุจริง
       ของเดิมกลืนแล้วทิ้ง คนอ่านได้แต่ "โหลดหน้าไม่เสร็จ" ซึ่งเป็นอาการ ไม่ใช่เหตุ (AIO-48 C4) */
    const fail = () => new Error(`โหลดหน้าไม่เสร็จใน ${T.PAGE / 1000} วินาที: ${p}` +
      (last ? ` · เหตุล่าสุดระหว่างรอ: ${last.message}` : '') + serveTail());
    try { await send('Page.navigate', { url: BASE + p }, by); }
    catch (e) { throw e.pageDeadline ? fail() : e; }
    while (Date.now() < by) {
      /* กลืน error ได้เฉพาะตอนหน้ากำลังเปลี่ยน (context ถูกทิ้ง) — ตัวที่ติดป้าย fatal ห้ามกลืน */
      try { if (await evaluate(expr, by)) return; }
      catch (e) {
        if (e.pageDeadline) throw fail();
        if (e.fatal) throw e;
        /* SyntaxError คือนิพจน์ของด่านเองเขียนผิด = ผิดถาวร ส่งซ้ำอีกกี่รอบก็เท่าเดิม
           ปล่อยให้กลืนคือรอครบเพดานแล้วรายงานอาการที่ไม่เกี่ยวกับเหตุ */
        if (/SyntaxError/.test(e.message)) throw Object.assign(e, { fatal: true });
        last = e;
      }
      await sleep(60);
    }
    throw fail();
  }

  return { PORT, CDP, BASE, send, evaluate, until, cleanup, sleep };
}
