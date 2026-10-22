/* ทดสอบ "ดูต่อจากรายการค้างล่าสุด" ด้วยเบราว์เซอร์จริง — AIO-22 AC-2
   รัน:  node tools/test-continue.mjs
   ต้องมี tools/serve.mjs ทำงานอยู่ (สคริปต์นี้เปิดให้เอง) และ Chromium ของ playwright ในเครื่อง

   ตรวจ 10 ข้อตามเกณฑ์ตรวจรับ ข้อไหนตกจะ exit 1 พร้อมบอกว่าข้อไหน */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 4188, CDP = 9444;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });

function cleanup(code) { try { server.kill('SIGTERM'); } catch {} try { chrome.kill('SIGTERM'); } catch {} process.exit(code); }

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ chrome ไม่ได้');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
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
    try { if (await evaluate("document.readyState === 'complete' && !!window.LakornProgress")) return; } catch {}
    await sleep(60);
  }
  throw new Error('โหลดหน้าไม่เสร็จ: ' + p);
}

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

try {
  console.log('AC-2 · ทดสอบด้วยเบราว์เซอร์จริงที่ ' + BASE);

  /* ---- เริ่มจากเครื่องเปล่า ---- */
  await go('/');
  await evaluate('localStorage.clear()');
  await go('/');
  check('ล้าง localStorage แล้วหน้าแรกโชว์สถานะว่าง ไม่พัง',
    await evaluate(`document.querySelector('#contRail .empty') !== null`));
  await go('/library/?tab=continue');
  check('คลัง → แท็บดูต่อ โชว์หน้าว่างที่ออกแบบไว้',
    await evaluate(`/ยังไม่มีเรื่องที่ดูค้าง/.test(document.querySelector('#libPanel').textContent)`));

  /* ---- ดูตอนหนึ่ง แล้วดูว่าบันทึกจริงไหม ---- */
  await go('/watch/ceo-cold/ep-7/');
  await evaluate(`document.getElementById('playBtn').click()`);
  await sleep(2500);                       /* เพลเยอร์จำลองเดิน 6 เท่า = ~15 วินาทีของเนื้อหา */
  await evaluate(`document.getElementById('playBtn').click()`);  /* หยุด → บังคับเขียน */
  const e1 = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['ceo-cold']`);
  check('เล่นแล้วเขียน lakorn.cont กลับ localStorage', !!e1, JSON.stringify(e1));
  check('บันทึก "เลขตอน" ถูกต้อง (ep = 7)', e1 && e1.ep === 7, 'ได้ ' + (e1 && e1.ep));
  check('บันทึก "ตำแหน่งในตอน" เดินจริง (sec > 5)', e1 && e1.sec > 5, 'sec = ' + (e1 && e1.sec));

  /* ---- ดูอีกเรื่องให้มีสองรายการ แล้วตรวจลำดับ ---- */
  await go('/watch/durian-revenge/ep-3/');
  await evaluate(`document.getElementById('playBtn').click()`);
  await sleep(1800);
  await evaluate(`document.getElementById('playBtn').click()`);

  /* ---- แท็บใหม่: ค่าต้องยังอยู่ ---- */
  await go('/');
  const rail = await evaluate(`
    Array.from(document.querySelectorAll('#contRail .cont')).map(a => ({
      href: a.getAttribute('href'),
      text: a.querySelector('.m').textContent.trim()
    }))`);
  check('เปิดหน้าใหม่แล้วค่ายังอยู่ · แถบดูต่อ render จากค่าที่บันทึกจริง', rail.length === 2, JSON.stringify(rail));
  check('เรียงล่าสุดอยู่บนสุด (durian-revenge ที่ดูทีหลังอยู่ใบแรก)',
    rail[0] && /durian-revenge/.test(rail[0].href), rail[0] && rail[0].href);
  check('การ์ดโชว์ตอนและเปอร์เซ็นต์จากค่าจริง ไม่ใช่ค่าตายตัว',
    rail[0] && /EP\.3\/24 · ดูไปแล้ว \d+%/.test(rail[0].text), rail[0] && rail[0].text);

  /* ---- กดแล้วต้องต่อจากตอนและตำแหน่งเดิม ---- */
  const href = rail[1].href;                       /* ceo-cold */
  check('ลิงก์ดูต่อชี้ไปตอนเดิมพร้อมตำแหน่ง (?t=)', /watch\/ceo-cold\/ep-7\/\?t=\d+/.test(href), href);
  await go('/' + href.replace(/^\//, ''));
  const resumed = await evaluate(`document.getElementById('tNow').textContent`);
  check('เปิดลิงก์แล้วเวลาเริ่มที่ตำแหน่งเดิม ไม่ใช่ 0:00', resumed !== '0:00', 'tNow = ' + resumed);

  /* ---- หน้าคลังอ่านค่าเดียวกัน ---- */
  await go('/library/?tab=continue');
  const libRows = await evaluate(`Array.from(document.querySelectorAll('#libPanel .controw')).map(a=>a.getAttribute('href'))`);
  /* เพิ่งเปิด ceo-cold ไปเมื่อกี้ → ceo-cold ต้องเป็นรายการล่าสุด = อยู่บนสุด */
  check('หน้าคลัง แท็บดูต่อ render จากค่าเดียวกันและเรียงล่าสุดก่อน',
    libRows.length === 2 && /ceo-cold/.test(libRows[0]), JSON.stringify(libRows));

  /* ---- ดูจบตอน: รายการต้องขยับไปตอนถัดไปเอง ---- */
  await go('/watch/durian-revenge/ep-3/');
  /* เร่งจบตอน: กดที่ปลายแถบเวลาแล้วกดเล่น ปล่อยให้เดินจนจบ */
  await evaluate(`
    (function(){
      var b = document.getElementById('barWrap'), r = b.getBoundingClientRect();
      b.dispatchEvent(new MouseEvent('click', {clientX: r.right - 1, clientY: r.top + 2, bubbles:true}));
      document.getElementById('playBtn').click();
      return true;
    })()`);
  await sleep(1500);
  const afterEp = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['durian-revenge']`);
  check('ดูจบตอน → รายการค้างขยับไปตอนถัดไปเอง (EP.4)', afterEp && afterEp.ep === 4, JSON.stringify(afterEp));
  check('การ์ดตอนถัดไปโผล่พร้อมนับถอยหลัง',
    await evaluate(`!document.getElementById('nextUp').hidden && /ตอนถัดไป/.test(document.getElementById('nextUp').textContent)`));

  /* ---- ดูจบเรื่อง: ต้องออกจากรายการค้าง ไปโผล่ที่ "ดูจบแล้ว" ---- */
  await go('/watch/house-13/ep-12/');
  await evaluate(`
    (function(){
      var b = document.getElementById('barWrap'), r = b.getBoundingClientRect();
      b.dispatchEvent(new MouseEvent('click', {clientX: r.right - 1, clientY: r.top + 2, bubbles:true}));
      document.getElementById('playBtn').click();
      return true;
    })()`);
  await sleep(1500);
  const cont = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')`);
  const done = await evaluate(`JSON.parse(localStorage.getItem('lakorn.done')||'{}')`);
  check('ดูจบเรื่อง → ออกจากรายการค้าง', !cont['house-13'], JSON.stringify(Object.keys(cont)));
  check('ดูจบเรื่อง → ไปโผล่ที่ "ดูจบแล้ว"', !!done['house-13'], JSON.stringify(Object.keys(done)));
  check('การ์ดจบเรื่องโผล่และมีปุ่มพาไปต่อ (ห้ามเป็นทางตาย)',
    await evaluate(`!document.getElementById('endCard').hidden && !!document.querySelector('#endCard .ec-next')`));
  await go('/library/?tab=done');
  check('แท็บ "ดูจบแล้ว" ในคลังมีเรื่องนั้นจริง',
    await evaluate(`/บ้านเลขที่ 13/.test(document.getElementById('libPanel').textContent)`));

  /* ---- ตารางตอน: แท็บช่วงตอนซ่อนได้จริง และสถานะมาจากข้อมูลในเครื่อง ---- */
  await go('/series/ceo-cold/');
  const grid = await evaluate(`JSON.stringify({
    total: document.querySelectorAll('#epGrid .ep').length,
    shown: [...document.querySelectorAll('#epGrid .ep')].filter(a=>!a.hidden).length,
    tab: (document.querySelector('.ep-tabs [aria-selected=true]')||{}).textContent,
    cur: (document.querySelector('#epGrid .ep.cur')||{}).textContent,
    done: document.querySelectorAll('#epGrid .ep.done').length
  })`);
  const g = JSON.parse(grid);
  check('แท็บช่วงตอนซ่อนตอนนอกช่วงได้จริง', g.total === 60 && g.shown === 20, grid);
  check('หน้าเรื่องติดสถานะ "กำลังดู" จากค่าที่บันทึกไว้', g.cur === '7', 'cur = ' + g.cur);
  check('แท็บเริ่มที่ช่วงที่มีตอนกำลังดู', g.tab === '1–20', 'tab = ' + g.tab);
  check('ตอนก่อนหน้าแสดงเป็น "ดูแล้ว"', g.done === 6, 'done = ' + g.done);

  /* ---- ลิงก์เก่าแบบ #ep ต้องเด้งไป path จริง ---- */
  await send('Page.navigate', { url: BASE + '/watch/ceo-cold/ep-1/#ep9' });
  await sleep(900);
  const landed = await evaluate(`location.pathname`);
  check('ลิงก์เก่า #ep9 ถูกแมปไป /ep-9/ ด้วย JS บนหน้าปลายทาง',
    landed === '/watch/ceo-cold/ep-9/', landed);
  await send('Page.navigate', { url: BASE + '/watch/ceo-cold.html#ep5' });
  await sleep(900);
  check('ลิงก์เก่า watch/<slug>.html#ep5 ถูกส่งต่อไป /ep-5/',
    await evaluate(`location.pathname`) === '/watch/ceo-cold/ep-5/', await evaluate(`location.pathname`));

  /* ---- ล้างข้อมูลแล้วต้องกลับไปหน้าว่าง ไม่พัง ---- */
  await go('/');
  await evaluate('localStorage.clear()');
  await go('/library/?tab=continue');
  check('ล้าง localStorage อีกครั้ง → กลับไปหน้าว่าง ไม่พัง',
    await evaluate(`/ยังไม่มีเรื่องที่ดูค้าง/.test(document.getElementById('libPanel').textContent)`));

  console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
  cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  cleanup(1);
}
