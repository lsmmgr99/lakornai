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

  /* ---- คีย์บอร์ดตาม UX §7.4 ต้องยังเลื่อนเวลาได้หลังกดปุ่มเล่น (โฟกัสอยู่ที่ปุ่ม) ----
     ยามที่กันไม่ให้แย่ง Space/Enter จากปุ่ม ต้องไม่กินลูกศรไปด้วย */
  await evaluate(`document.getElementById('playBtn').focus()`);
  const tBefore = await evaluate(`document.getElementById('tNow').textContent`);
  await evaluate(`document.getElementById('playBtn').dispatchEvent(
    new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true})), true`);
  const tAfter = await evaluate(`document.getElementById('tNow').textContent`);
  check('กดลูกศร → ขณะโฟกัสอยู่ที่ปุ่มเล่น ยังเลื่อนเวลาได้ (UX §7.4)',
    tAfter !== tBefore, `${tBefore} → ${tAfter}`);

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

  /* ---- กดแล้วต้องต่อจากตอนและตำแหน่งเดิม ----
     ยืนยันกับ "วินาทีที่บันทึกไว้จริง" ไม่ใช่แค่ว่าไม่ใช่ 0:00
     ข้อที่ยืนยันแค่ !== '0:00' จะผ่านเหมือนกันถ้าโค้ดต่อที่ 0:01 หรือต่อผิดตอน
     ซึ่งลูกค้าเขียนเองว่า "ต่อจากตอนและตำแหน่งเดิม" — ด่านนี้ต้องจับการถอยหลังได้ */
  const href = rail[1].href;                       /* ceo-cold */
  check('ลิงก์ดูต่อชี้ไปตอนเดิมพร้อมตำแหน่ง (?t=)', /watch\/ceo-cold\/ep-7\/\?t=\d+/.test(href), href);
  const tParam = +(href.match(/\?t=(\d+)/) || [])[1];
  /* เทียบกับค่าที่อยู่ใน localStorage ตอนหน้านี้ถูก render ไม่ใช่ค่าที่จำไว้ก่อนหน้า */
  const live = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['ceo-cold']`);
  check('เลขใน ?t= ตรงกับวินาทีที่บันทึกไว้จริง (lakorn.cont.sec)',
    tParam === Math.round(live.sec), `?t=${tParam} · sec ที่บันทึก = ${live && live.sec}`);
  await go('/' + href.replace(/^\//, ''));
  const resumed = await evaluate(`document.getElementById('tNow').textContent`);
  const want = Math.floor(tParam / 60) + ':' + String(tParam % 60).padStart(2, '0');
  check('เปิดลิงก์แล้วเวลาเริ่มที่ตำแหน่งเดิมตรงวินาที (ไม่ใช่แค่ไม่ใช่ 0:00)',
    resumed === want, `tNow = ${resumed} · ควรเป็น ${want} (จาก ?t=${tParam})`);
  check('ตอนที่เปิดคือตอนเดิม ไม่ใช่ต้นเรื่อง',
    await evaluate(`document.body.dataset.ep`) === '7', 'ep = ' + await evaluate(`document.body.dataset.ep`));


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

  /* ---- การ์ดตอนถัดไป: โฟกัสต้องไม่หลุดตอนนับถอยหลัง ----
     UX §6.26 ให้ปุ่ม "ยกเลิก" เป็นทางออกจากการเด้งอัตโนมัติ
     ถ้าการ์ด re-render ทุกวินาที โหนดปุ่มถูกสร้างใหม่ โฟกัสเด้งไป BODY → กดด้วยคีย์บอร์ดไม่ทัน */
  await evaluate(`document.getElementById('nuCancel').focus()`);
  await sleep(1300);
  check('โฟกัสยังอยู่ที่ปุ่ม "ยกเลิก" หลังนับถอยหลังเดินไป 1 วินาที',
    await evaluate(`document.activeElement && document.activeElement.id`) === 'nuCancel',
    'activeElement = ' + await evaluate(`document.activeElement && (document.activeElement.id || document.activeElement.tagName)`));
  check('ตัวเลขนับถอยหลังยังเดินอยู่จริง (ไม่ได้หยุดเพราะเลิก re-render)',
    +(await evaluate(`(document.getElementById('nuLeft')||{}).textContent`)) < 5,
    'nuLeft = ' + await evaluate(`(document.getElementById('nuLeft')||{}).textContent`));
  /* กดปุ่มด้วยคีย์บอร์ดจริง (Enter บนปุ่มที่โฟกัสอยู่) ต้องเก็บการ์ดได้ */
  for (const type of ['keyDown', 'char', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  }
  await sleep(300);
  check('กด Enter บนปุ่ม "ยกเลิก" ที่โฟกัสอยู่ แล้วการ์ดถูกเก็บจริง',
    await evaluate(`document.getElementById('nextUp').hidden === true`));

  /* ---- ยามหลังดูจบตอน: ลูกศรต้องไม่ดึงจุดค้างถอยกลับไปตอนที่ดูจบแล้ว ----
     นี่คือข้อถดถอยของบั๊กที่รีวิวด่าน 1 จับได้ (ชุด 27 ข้อเดิมไม่มีข้อไหนแตะสภาพหลังดูจบ) */
  const keyArrow = k => evaluate(
    `document.body.focus(), document.dispatchEvent(new KeyboardEvent('keydown',{key:'${k}',bubbles:true,cancelable:true})), true`);
  await keyArrow('ArrowLeft');
  await keyArrow('ArrowLeft');
  const afterArrow = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['durian-revenge']`);
  check('ดูจบตอน → กดลูกศร ← แล้วจุดค้างยังอยู่ที่ตอนถัดไป (EP.4) ไม่ถอยกลับ EP.3',
    afterArrow && afterArrow.ep === 4, JSON.stringify(afterArrow));

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

  /* ---- ยามหลังดูจบเรื่อง: ต้องไม่มีทางหลุดออกจาก "ดูจบแล้ว" ด้วยการกดปุ่มเดียว ----
     รีวิวด่าน 1 วัดได้ว่ากด → หนึ่งครั้งบนการ์ดจบเรื่อง ทำให้ done ว่างและ cont กลับมาเป็น 99%
     การ์ดจบเรื่องโฟกัสลิงก์ให้เองตอนเปิด ลูกศรคือปุ่มที่คนใช้สำรวจการ์ดนี้ตามปกติ */
  check('การ์ดจบเรื่องโฟกัสลิงก์แรกให้เอง (เส้นทางที่ลูกศรถูกกดจริง)',
    await evaluate(`!!document.activeElement && document.activeElement.classList.contains('ec-next')`));
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowRight']) {
    await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'${k}',bubbles:true,cancelable:true})), true`);
  }
  await keyArrow('ArrowRight');     /* และกรณีโฟกัสหลุดไป BODY แล้วกดลูกศร */
  await keyArrow('ArrowLeft');
  const cont2 = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'{}')`);
  const done2 = await evaluate(`JSON.parse(localStorage.getItem('lakorn.done')||'{}')`);
  check('ดูจบเรื่อง → กดลูกศรซ้ำ ๆ แล้วยังอยู่ใน "ดูจบแล้ว"', !!done2['house-13'], JSON.stringify(Object.keys(done2)));
  check('ดูจบเรื่อง → กดลูกศรซ้ำ ๆ แล้วไม่ถูกดึงกลับเข้ารายการค้าง', !cont2['house-13'], JSON.stringify(cont2['house-13']));
  /* ออกจากหน้าแล้วสภาพต้องยังเดิม (pagehide → flush) */
  await go('/library/?tab=done');
  check('ออกจากหน้าหลังดูจบเรื่อง → แท็บ "ดูจบแล้ว" ยังมีเรื่องนั้น ไม่ถูกเขียนทับตอนออกจากหน้า',
    await evaluate(`!!JSON.parse(localStorage.getItem('lakorn.done')||'{}')['house-13']
      && !JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['house-13']`));
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

  /* ---- แท็บติดตามและประวัติ ---- */
  await go('/series/mirror-bride/');
  await evaluate(`document.querySelector('[data-follow]').click()`);
  await go('/library/?tab=following');
  check('กดติดตามแล้วโผล่ในแท็บ "ติดตาม"',
    await evaluate(`/เจ้าสาวในกระจก/.test(document.getElementById('libPanel').textContent)`));
  await go('/library/?tab=history');
  check('แท็บ "ประวัติ" มีรายการที่เพิ่งดู',
    await evaluate(`document.querySelectorAll('#libPanel .ep-row').length > 0`),
    String(await evaluate(`document.querySelectorAll('#libPanel .ep-row').length`)));
  await go('/');
  check('หน้าแรกโชว์ชั้น "ติดตามไว้" เมื่อมีเรื่องที่ติดตาม',
    await evaluate(`!document.getElementById('followSec').hidden
      && document.querySelectorAll('#followRail .card').length === 1`));

  /* ---- ?t= ที่เกินความยาวตอน ต้องถูกปฏิเสธ ไม่ใช่หนีบเป็นวินาทีสุดท้าย ----
     วันนี้ผู้ใช้ยังเจอเองไม่ได้ (เพราะ ?t= สร้างจาก dur ชุดเดียวกัน)
     แต่วันที่มีไฟล์วิดีโอจริงแล้วความยาวตอนเปลี่ยน ลิงก์ที่คนแชร์ไว้จะเข้าเส้นนี้ทั้งหมด */
  await go('/');
  await evaluate('localStorage.clear()');
  await go('/watch/house-13/ep-1/?t=999999');
  const over = await evaluate(`({ tNow: document.getElementById('tNow').textContent,
    cont: JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['house-13'] })`);
  check('?t= ที่เกินความยาวตอน ไม่ทำให้ตอนนั้นกลายเป็น "ดูไปแล้ว 99%" โดยไม่ได้ดู',
    over.tNow === '0:00' && over.cont && over.cont.sec === 0, JSON.stringify(over));
  await go('/watch/house-13/ep-1/?t=abc');
  check('?t= ที่ไม่ใช่ตัวเลข → เริ่มที่ 0:00', await evaluate(`document.getElementById('tNow').textContent`) === '0:00');
  await go('/watch/house-13/ep-1/?t=-50');
  check('?t= ติดลบ → เริ่มที่ 0:00', await evaluate(`document.getElementById('tNow').textContent`) === '0:00');

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
