/* ด่าน MIME ของ tools/serve.mjs — ยิงคำขอจริงเข้าเซิร์ฟเวอร์ที่รันอยู่ ไม่ได้ grep ตาราง TYPES
   รัน:  node tools/test-serve.mjs
         SV_PORT=4299 node tools/test-serve.mjs      (ตั้งพอร์ตทับเมื่อรันขนานกับ run อื่น)

   ทำไมต้องยิงจริง: อาการของบั๊กนี้ไม่ได้อยู่ในไฟล์ไหนเลย — ไฟล์ .mjs ที่ไม่มีในตาราง TYPES
   ตกไปใช้ค่าสำรอง application/octet-stream แล้วเบราว์เซอร์ปฏิเสธรันตามกฎ MIME ของ ES module
   แผงหลังบ้านจึงขึ้นเป็นหน้าเปล่าทั้งที่ของไม่พัง · การอ่านไฟล์ serve.mjs ด้วย regex
   มองไม่เห็นเส้นค่าสำรองนี้ ต้องอ่านจาก content-type ที่ส่งออกมาจริง

   ด่านนี้ไม่ได้รับรายชื่อไฟล์มาจากใคร: ไล่กราฟโมดูลเองแบบที่เบราว์เซอร์ทำ —
   <script src> ในทุกหน้าที่ส่งมอบ แล้วตาม import ต่อไปทีละชั้นจนครบ
   ไฟล์โมดูลที่เพิ่มวันหน้าจะถูกยิงเองโดยไม่ต้องแก้ไฟล์นี้ */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 1. หาพอร์ตว่าง ----------
   run อื่นใน workspace เดียวกันอาจถือพอร์ตอยู่ · ขอ OS เลือกให้แล้วปล่อยคืนก่อนส่งให้ serve.mjs */
async function freePort() {
  if (process.env.SV_PORT) return +process.env.SV_PORT;
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;

/* ---------- 2. จุดเริ่มของกราฟโมดูล: <script src> ในหน้าที่ส่งมอบ ----------
   design/ เป็นไฟล์เสนอแบบของ Visual ไม่ใช่เว็บที่ส่งมอบ · build/ tools/ ci/ ไม่มีหน้าให้เบราว์เซอร์เปิด */
const SKIP = new Set(['.git', 'design', 'node_modules', 'build', 'tools', 'ci', 'docs',
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
const urlOf = f => '/' + path.relative(ROOT, f).split(path.sep).join('/');
const SCRIPT_SRC = /<script\b[^>]*\bsrc="([^"]+)"/g;
const seeds = new Map();           /* url → หน้าที่อ้างถึง (ไว้บอกที่มาตอนตก) */
for (const f of walk(ROOT)) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(SCRIPT_SRC)) {
    const src = m[1];
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) continue;   /* ของนอก ไม่ใช่ของเรา */
    const abs = new URL(src, BASE + urlOf(f)).pathname;
    if (!seeds.has(abs)) seeds.set(abs, urlOf(f));
  }
}

/* admin/ มีไฟล์ .mjs ทั้งของเบราว์เซอร์และของฝั่ง node ปนกัน · รายชื่อ "ของเบราว์เซอร์"
   ที่เชื่อได้คือ allowlist ของ admin/serve.mjs เอง (ด่านความปลอดภัยที่ Security ตรวจผ่านแล้ว)
   อ่านมาใช้เป็นจุดเริ่มเพิ่ม เผื่อไฟล์ที่ยังไม่มีหน้าไหนอ้าง — ไม่แก้ไฟล์นั้น แค่อ่าน */
const adminSrv = fs.readFileSync(path.join(ROOT, 'admin/serve.mjs'), 'utf8');
for (const m of adminSrv.matchAll(/'(\/[^']*\.mjs)'/g)) {
  if (!seeds.has(m[1])) seeds.set(m[1], 'allowlist ของ admin/serve.mjs');
}

/* ---------- 3. เซิร์ฟเวอร์ ---------- */
const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const stop = c => { try { server.kill('SIGTERM'); } catch { /* ตายไปแล้ว */ } process.exit(c); };
let up = false;
for (let i = 0; i < 80; i++) {
  try { await fetch(BASE + '/404/'); up = true; break; } catch { await sleep(125); }
}
if (!up) { console.error(`✗ เปิด tools/serve.mjs ที่พอร์ต ${PORT} ไม่ได้`); stop(1); }

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------- 4. ไล่กราฟโมดูลแบบที่เบราว์เซอร์ทำ ----------
   import/export ... from '...' ที่เป็นสตริงคงที่เท่านั้น (dynamic import ด้วยตัวแปรไล่ตามไม่ได้) */
const SPEC = /(?:^|[\s;}])(?:import|export)\b[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g;
const got = new Map();             /* url → { status, type, from } */
const queue = [...seeds.entries()].map(([u, from]) => ({ u, from }));
while (queue.length) {
  const { u, from } = queue.shift();
  if (got.has(u)) continue;
  const r = await fetch(BASE + u);
  const type = r.headers.get('content-type') || '';
  const body = await r.text();
  got.set(u, { status: r.status, type, from });
  if (!/\.(mjs|js)$/.test(u)) continue;
  for (const m of body.matchAll(SPEC)) {
    const spec = m[1] || m[2];
    if (!spec || !/^[./]/.test(spec)) continue;                 /* bare specifier ไม่ใช่ไฟล์ในเว็บ */
    const next = new URL(spec, BASE + u).pathname;
    if (!got.has(next)) queue.push({ u: next, from: u });
  }
}

const mjs = [...got.entries()].filter(([u]) => u.endsWith('.mjs'));
const js = [...got.entries()].filter(([u]) => u.endsWith('.js'));

console.log(`ด่าน MIME ของ tools/serve.mjs ที่ ${BASE} — ยิงจริง ${got.size} คำขอ`
  + ` (จุดเริ่ม ${seeds.size} จาก <script src> + โมดูลในหลังบ้าน)`);
console.log('');

/* ถ้ากราฟไม่มี .mjs เลย ด่านนี้จะผ่านโดยไม่ได้ตรวจอะไร — บังคับให้ตกไว้ก่อน */
check(`กราฟโมดูลมีไฟล์ .mjs ให้ตรวจจริง (${mjs.length} ไฟล์)`, mjs.length > 0,
  'ไม่พบไฟล์ .mjs ที่เบราว์เซอร์จะร้องขอ — ด่านนี้จะกลายเป็นด่านเปล่า');

for (const [u, r] of mjs) {
  const okType = /^text\/javascript\b/.test(r.type);
  check(`${u} · ${r.status} · content-type ${r.type || '(ว่าง)'}`, r.status === 200 && okType,
    `ต้องเป็น 200 + ขึ้นต้นด้วย text/javascript · อ้างถึงจาก ${r.from}`);
}

/* เส้นค่าสำรองที่เป็นต้นเหตุ: ไฟล์ไหนก็ตามในกราฟที่หลุดไปเป็น octet-stream คือนามสกุลที่หายจากตาราง */
const octet = [...got.entries()].filter(([, r]) => /octet-stream/.test(r.type));
check('ไม่มีไฟล์ไหนในกราฟที่หลุดไปใช้ค่าสำรอง application/octet-stream',
  octet.length === 0, octet.map(([u, r]) => `${u} (จาก ${r.from})`).join(' / '));

const broken = [...got.entries()].filter(([, r]) => r.status !== 200);
check('ทุกไฟล์ในกราฟโมดูลตอบ 200 (import ไม่หลุดเป็น 404)',
  broken.length === 0, broken.map(([u, r]) => `${u} → ${r.status}`).join(' / '));

/* ---------- 5. นามสกุลอื่นต้องไม่ถดถอยตามไปด้วย ---------- */
const EXPECT = [['/assets/app.js', 'text/javascript'], ['/assets/site.css', 'text/css'],
  ['/admin/', 'text/html'], ['/content.json', 'application/json'], ['/sitemap.xml', 'application/xml'],
  ['/robots.txt', 'text/plain']];
for (const [u, want] of EXPECT) {
  const r = await fetch(BASE + u);
  const type = r.headers.get('content-type') || '';
  check(`${u} · content-type ${type || '(ว่าง)'}`, r.status === 200 && type.startsWith(want),
    `ต้องเป็น 200 + ขึ้นต้นด้วย ${want}`);
}
for (const [u, r] of js) {
  check(`${u} · ${r.status} · content-type ${r.type || '(ว่าง)'}`,
    r.status === 200 && /^text\/javascript\b/.test(r.type), `อ้างถึงจาก ${r.from}`);
}

console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
stop(fail ? 1 : 0);
