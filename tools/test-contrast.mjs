/* วัดคอนทราสต์ของ placeholder "ทุกช่องกรอกในเว็บที่ส่งมอบ" ด้วยเบราว์เซอร์จริง — AIO-34 บั๊ก 4
   รัน:  node tools/test-contrast.mjs
         SKIP_BUILD=1 node tools/test-contrast.mjs     (ตรวจไฟล์ที่มีอยู่ตามสภาพ)
   ค่าตั้งต้นขอพอร์ตว่างจาก OS เอง · ตั้งทับได้ด้วย PH_PORT / PH_CDP

   ทำไมต้องใช้เบราว์เซอร์: assets/site.css เขียนทับตัวเองตอนท้ายไฟล์ (บล็อก build/site-extra.css
   ต่อหลัง design/v2/v2.css) และ placeholder ที่ไม่โดน selector ไหนเลยจะได้ "สีเริ่มต้นของ UA"
   ซึ่งไม่มีอยู่ในไฟล์ CSS เลย — grep กฎแรกที่เจอจึงได้ตัวเลขผิดทั้งสองทาง
   ค่าที่เชื่อได้มีทางเดียวคือ getComputedStyle(el, '::placeholder') บนหน้าที่ render จริง

   ด่านนี้ไม่ได้รับรายชื่อหน้ามาจากใคร: สแกนไฟล์ที่ส่งมอบหาช่องกรอกที่มี placeholder เอง
   แล้วบังคับว่าจำนวนช่องที่ "วัดได้" ต้องเท่ากับจำนวนช่องที่ "มีอยู่" — หน้าฟอร์มใหม่
   ที่เพิ่มวันหน้าจะถูกวัดเองโดยไม่ต้องแก้ไฟล์นี้ */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
/* พอร์ต — workspace นี้แชร์กับ run อื่น · พอร์ตตายตัวทำให้ด่านค้างเมื่อมีคนถืออยู่ (AIO-42)
   ⇒ ขอพอร์ตว่างจาก OS เป็นค่าตั้งต้น · ตั้งทับด้วย PH_PORT / PH_CDP ได้เหมือนเดิม
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
const [PORT, CDP] = await freePorts(['PH_PORT', 'PH_CDP']);
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-ph-'));
const BASE = `http://127.0.0.1:${PORT}`;
const MIN = 4.5;                    /* WCAG 2.1 AA · 1.4.3 ข้อความขนาดปกติ */
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!process.env.SKIP_BUILD) {
  const r = spawnSync('node', ['build/build.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('✗ build/build.mjs ล้ม — วัดไฟล์ที่ส่งมอบต่อไม่ได้\n' + (r.stderr || r.stdout));
    process.exit(1);
  }
}

/* ---------- 1. หาช่องกรอกที่มี placeholder จากไฟล์ที่ส่งมอบ ----------
   `design/` เป็นไฟล์เสนอแบบของ Visual ไม่ใช่เว็บที่ส่งมอบ · ไม่นับ */
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'docs',
  '.paperclip-repositories', '.claude']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
}
/* นับเฉพาะ <input>/<textarea> ที่มีแอตทริบิวต์ placeholder — ช่องที่ไม่มีก็ไม่มีข้อความให้วัด */
const PH_TAG = /<(input|textarea)\b[^>]*\bplaceholder="[^"]*"[^>]*>/g;
const found = [];
for (const f of walk(ROOT)) {
  const html = fs.readFileSync(f, 'utf8');
  const hits = html.match(PH_TAG) || [];
  if (hits.length) found.push({ url: '/' + path.relative(ROOT, f).replace(/index\.html$/, ''), n: hits.length });
}
found.sort((a, b) => a.url.localeCompare(b.url));
const wantFields = found.reduce((a, p) => a + p.n, 0);

/* ---------- 2. เบราว์เซอร์ ---------- */
const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)],
  { stdio: ['ignore', 'pipe', 'ignore'] });
/* เก็บโค้ดตอนออกไว้บอกสาเหตุตอนแดง (ทางที่เจอบ่อยคือ listen ไม่ติดเพราะพอร์ตถูกถือ
   แต่ tools/serve.mjs:38 อ่านไฟล์ในตัวจัดการ request โดยไม่มี try ⇒ ตายกลางทางก็ได้) */
let serverExit = null;
server.on('exit', code => { serverExit = code === null ? -1 : code; });
/* หลักฐานว่าพอร์ตเป็นของลูกตัวนี้จริง = บรรทัดที่ tools/serve.mjs:40 พิมพ์หลัง listen สำเร็จ
   ของเดิมถือว่า "มีใครตอบ HTTP ที่พอร์ตนั้น" = พร้อม ⇒ เซิร์ฟเวอร์ของ run อื่น (คนละ checkout)
   ทำให้ด่านเขียวจากไฟล์ของคนอื่นได้ ทั้งที่ลูกของเราไม่ได้พอร์ตเลย (รีวิว AIO-44 ข้อ 2 · AIO-43 N3) */
let ready = false, serverOut = '';
server.stdout.on('data', d => {
  serverOut += d;
  if (serverOut.includes(`http://127.0.0.1:${PORT}/`)) ready = true;
});
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'],
  { stdio: 'ignore' });

function cleanup(code) {
  try { server.kill('SIGTERM'); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

/* รอให้ serve.mjs ของเราขึ้นจริงก่อนเปิดหน้า — ถ้ามีคนถือพอร์ตนั้นอยู่ serve.mjs จะตายทันที
   แล้ว Page.navigate จะค้างไม่มีกำหนด (เซิร์ฟเวอร์ของคนอื่นรับ connection แต่ไม่ตอบ) — AIO-42
   ⇒ แดงเร็วพร้อมบอกสาเหตุ ดีกว่าค้างยาว
   เงื่อนไขพร้อมคือ "ลูกของเราพิมพ์บรรทัดพร้อม" ไม่ใช่ "พอร์ตนั้นมีใครตอบ" · ด่าน: tools/test-ports.mjs */
const upBy = Date.now() + 10000;
while (!ready && serverExit === null && Date.now() < upBy) await sleep(50);
if (!ready) {
  console.error(`✗ เปิด tools/serve.mjs ที่พอร์ต ${PORT} ไม่ได้` +
    (serverExit === null
      ? ' (หมดเวลา 10 วินาที — ไม่ได้บรรทัดพร้อมจาก serve.mjs ของรันนี้)'
      : ` (serve.mjs ออกด้วยโค้ด ${serverExit} — น่าจะมีคนถือพอร์ตอยู่ · ตั้ง PH_PORT เลือกเองได้)`));
  cleanup(1);
}

/* ทุก fetch ต้องมี timeout: พอร์ต CDP ที่ "รับ connection แต่ไม่ตอบ" ทำให้ค้างไม่มีกำหนด
   เหมือนพอร์ต HTTP เป๊ะ ๆ (รีวิว AIO-43 R1 · AIO-44 ข้อ 1 — ทำซ้ำได้ด้วย PH_CDP ชี้ไปพอร์ตแบบนั้น)
   และต้องมีเพดานรวมด้วย: นับแต่จำนวนรอบไม่ได้จำกัดเวลาของแต่ละรอบ */
const CDP_WAIT_MS = 20000;
async function wsUrl() {
  const until = Date.now() + CDP_WAIT_MS;
  while (Date.now() < until) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`,
        { method: 'PUT', signal: AbortSignal.timeout(1000) });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error(`เชื่อมต่อ chrome ที่พอร์ต ${CDP} ไม่ได้ใน ${CDP_WAIT_MS / 1000} วินาที` +
    ' (ถ้าตั้ง PH_CDP ทับ อาจมีคนถือพอร์ตนั้นอยู่)');
}

/* ต่อ CDP ไม่ติดต้องเก็บกวาดด้วย — ปล่อย chrome/serve ค้างไว้คือไปถือพอร์ตให้รันถัดไปแดงต่อ */
let ws, wsDead = null;
try {
  ws = new WebSocket(await wsUrl());
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('ต่อ WebSocket ของ CDP ไม่ติดใน 10 วินาที')), 10000);
    const done = fn => (...a) => { clearTimeout(t); fn(...a); };
    ws.onopen = done(res);
    ws.onerror = done(() => rej(new Error('WebSocket ของ CDP ล้มตอนเปิด')));
    ws.onclose = done(() => rej(new Error('chrome ปิดการเชื่อมต่อ CDP ก่อนเริ่มใช้งาน')));
  });
} catch (e) {
  console.error('ทดสอบล้ม: ' + (e.message || e));
  cleanup(1);
}
let id = 0; const pending = new Map();
/* chrome ตายกลางทางเกิดขึ้นจริงในกล่องนี้ (หลาย run ขนานกัน · OOM-kill) ⇒ ws ปิด
   ของเดิมไม่มี onclose/timeout ⇒ promise ใน pending ไม่ถูก settle ตลอดกาล ด่านค้างเงียบ
   แล้ว check-ac.mjs นับเป็น "ตก" ตอนหมดเวลา 480 วิ — อาการเดียวกับที่ AIO-42 ถูกเปิด (รีวิว AIO-43 R2) */
function wsDie(msg) {
  wsDead = wsDead || new Error(msg);
  for (const { rej } of pending.values()) rej(wsDead);
  pending.clear();
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
const SEND_TIMEOUT_MS = 30000;
const send = (method, params = {}) => new Promise((res, rej) => {
  if (wsDead) { rej(wsDead); return; }
  const i = ++id;
  const t = setTimeout(() => {
    if (pending.delete(i)) rej(new Error(`CDP ไม่ตอบคำสั่ง ${method} ใน ${SEND_TIMEOUT_MS / 1000} วินาที`));
  }, SEND_TIMEOUT_MS);
  pending.set(i, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); }
  catch (e) { clearTimeout(t); pending.delete(i); rej(e); }
});
await send('Page.enable'); await send('Runtime.enable');

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js error');
  return r.result.value;
}
async function go(p) {
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 100; i++) {
    /* ลูปนี้กลืน error โดยเจตนา (หน้ากำลังเปลี่ยน) — แต่ถ้า ws ตายไปแล้วต้องโยนสาเหตุจริงออก
       ไม่ใช่วน 100 รอบแล้วบอกว่า "โหลดหน้าไม่เสร็จ" ซึ่งชี้ผิดทาง */
    try { if (await evaluate("document.readyState === 'complete'")) return; }
    catch (e) { if (wsDead) throw e; }
    await sleep(60);
  }
  throw new Error('โหลดหน้าไม่เสร็จ: ' + p);
}

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------- 3. ตัวตรวจในหน้า ----------
   สีพื้นหลังจริงของช่องกรอกไม่ได้อยู่ที่ตัวมันเองเสมอ (.search-box input ตั้ง background:none
   แล้วสีมาจากกล่องแม่) จึงไต่ขึ้นไปหาชั้นแรกที่ทึบ แล้วผสมชั้นที่โปร่งทั้งหมดลงมาตามลำดับ
   — ถ้าไม่ทำ จะได้ "rgba(0,0,0,0)" แล้วคำนวณคอนทราสต์จากสีดำสนิทซึ่งไม่ใช่สิ่งที่คนเห็น */
const PROBE = `(function () {
  function rgb(s) {
    var m = String(s).match(/-?[\\d.]+/g) || [];
    return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m.length > 3 ? +m[3] : 1 };
  }
  function over(fg, bg) {   /* ผสม fg (โปร่ง) ลงบน bg (ทึบ) */
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1
    };
  }
  function bgOf(el) {
    var stack = [];
    for (var n = el; n; n = n.parentElement) {
      var c = rgb(getComputedStyle(n).backgroundColor);
      if (c.a === 0) continue;
      stack.push(c);
      if (c.a === 1) break;
    }
    if (!stack.length || stack[stack.length - 1].a !== 1) stack.push({ r: 0, g: 0, b: 0, a: 1 });
    var out = stack.pop();
    while (stack.length) out = over(stack.pop(), out);
    return out;
  }
  return Array.prototype.slice.call(document.querySelectorAll('input[placeholder], textarea[placeholder]'))
    .map(function (el) {
      var ph = getComputedStyle(el, '::placeholder');
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder'),
        box: (el.parentElement || {}).className || '',
        color: ph.color,
        fg: rgb(ph.color),
        bg: bgOf(el),
        /* placeholder มีข้อความจริงให้คนอ่าน = ช่องยังว่าง */
        showing: !el.value
      };
    });
})()`;

const chan = c => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const lum = c => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

try {
  console.log(`บั๊ก 4 · คอนทราสต์ placeholder ทุกช่องกรอก (เกณฑ์ ${MIN}:1 · WCAG 2.1 AA 1.4.3) ที่ ${BASE}`);
  console.log(`  ℹ สแกนไฟล์ที่ส่งมอบแล้วพบช่องที่มี placeholder ${wantFields} ช่อง ใน ${found.length} หน้า`);

  const rows = [];
  for (const p of found) {
    await go(p.url);
    const got = await evaluate(PROBE);
    check(`${p.url} · วัดช่องกรอกได้ครบตามที่มีใน HTML (${got.length}/${p.n})`,
      got.length === p.n, `HTML มี ${p.n} · วัดได้ ${got.length}`);
    for (const f of got) rows.push({ ...f, url: p.url, cr: ratio(f.fg, f.bg) });
  }

  check(`วัดครบทุกช่องในเว็บที่ส่งมอบ (${rows.length}/${wantFields})`, rows.length === wantFields,
    `สแกนเจอ ${wantFields} · วัดได้ ${rows.length}`);

  console.log('');
  for (const r of rows) {
    const okRow = r.cr >= MIN;
    console.log(`  ${okRow ? '✓' : '✗'} ${r.url} ${r.tag}#${r.id || '-'} · `
      + `${hex(r.fg)} บน ${hex(r.bg)} = ${r.cr.toFixed(2)}:1 · placeholder "${r.placeholder}"`);
    if (okRow) pass++; else fail++;
  }

  /* ช่องที่ไม่โดน selector ไหนเลยจะได้สีเริ่มต้นของ UA ซึ่งไม่อยู่ในไฟล์ CSS
     ด่านนี้จับไว้ตรง ๆ เพื่อให้สาเหตุอ่านออกจากผลการรัน ไม่ใช่เห็นแค่ตัวเลขตก */
  const ua = rows.filter(r => hex(r.fg) === '#757575');
  console.log('');
  check('ไม่มีช่องไหนที่ยังใช้สี placeholder เริ่มต้นของเบราว์เซอร์ (#757575 = 3.73:1 บน --surface-2)',
    ua.length === 0, ua.map(r => `${r.url} ${r.tag}#${r.id}`).join(' / '));
  /* ทุกช่องต้องได้สีเดียวกัน — สองช่องคนละสีคือกฎที่ครอบไม่ทั่ว กำลังจะหลุดอีกจุดวันหน้า */
  const colors = [...new Set(rows.map(r => hex(r.fg)))];
  check(`ทุกช่องใช้สี placeholder ชุดเดียวกัน (${colors.join(', ')})`, colors.length === 1, colors.join(', '));

  const worst = rows.reduce((a, r) => (r.cr < a.cr ? r : a), rows[0]);
  console.log(`\nต่ำสุด ${worst.cr.toFixed(2)}:1 ที่ ${worst.url} (${worst.tag}#${worst.id || '-'})`);
  console.log(`ผล: ผ่าน ${pass} · ตก ${fail}`);
  cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  cleanup(1);
}
