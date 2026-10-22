/* ทดสอบ "ดูต่อจากรายการค้างล่าสุด" ด้วยเบราว์เซอร์จริง — AIO-22 AC-2
   รัน:  node tools/test-continue.mjs
   ต้องมี tools/serve.mjs ทำงานอยู่ (สคริปต์นี้เปิดให้เอง) และ Chromium ของ playwright ในเครื่อง

   ตรวจ 10 ข้อตามเกณฑ์ตรวจรับ ข้อไหนตกจะ exit 1 พร้อมบอกว่าข้อไหน */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
/* พอร์ตและโปรไฟล์เบราว์เซอร์ตั้งทับได้ — workspace นี้แชร์กับ run อื่น
   พอร์ตเดิมหรือโปรไฟล์ร่วมทำให้การรันค้าง (Reviewer-Codex เจอตอนรันขนานกัน) */
const PORT = +(process.env.AC2_PORT || 4188), CDP = +(process.env.AC2_CDP || 9444);
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-ac2-'));
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'],
  { stdio: 'ignore' });

function cleanup(code) {
  try { server.kill('SIGTERM'); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

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

/* อ่านเปอร์เซ็นต์ที่ "แสดงอยู่บนหน้า" (ข้อความ · ความกว้างแถบ · aria-valuenow)
   มาคู่กับค่าที่ "บันทึกไว้จริง" ใน lakorn.cont ของรายการเดียวกัน
   ค่าที่คาดหวังคำนวณจาก sec/dur ดิบใน storage ไม่ได้เอามาจากโค้ดเว็บ
   ⇒ ถ้าใครเปลี่ยนสูตรหรือใส่ค่าตายตัว สองฝั่งจะไม่ตรงกันทันที */
const pctProbe = (rowSel, textSel) => `(function () {
  var cont = JSON.parse(localStorage.getItem('lakorn.cont') || '{}');
  return Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(rowSel)})).map(function (a) {
    var slug = (a.getAttribute('href').match(/watch\\/([^\\/]+)\\//) || [])[1];
    var e = cont[slug] || null;
    var txt = (a.querySelector(${JSON.stringify(textSel)}) || {}).textContent || '';
    var fill = a.querySelector('.pbar i'), pbar = a.querySelector('.pbar');
    return {
      slug: slug, text: txt.trim(),
      shown: (txt.match(/ดูไปแล้ว (\\d+)%/) || [])[1],
      shownEp: (txt.match(/EP\\.(\\d+)\\//) || [])[1],
      bar: fill ? fill.style.width : null,
      aria: pbar ? pbar.getAttribute('aria-valuenow') : null,
      want: e ? Math.round(e.sec / e.dur * 100) : null,
      wantEp: e ? e.ep : null,
      sec: e && e.sec, dur: e && e.dur
    };
  });
})()`;

/* เงื่อนไขรับรองของ AC-2: "render จากค่าที่บันทึกไว้จริง ไม่มีเปอร์เซ็นต์ที่เขียนมือเหลือแม้จุดเดียว"
   ต้องตรวจสองชั้น — ตรงกับค่าจริงทุกใบ และสองใบที่ค่าต่างกันต้องแสดงต่างกัน
   (ข้อเดิมใช้ regex /ดูไปแล้ว \d+%/ ซึ่งค่าตายตัว 62% ก็ผ่าน — Reviewer-Codex วัดได้) */
function checkPct(where, rows) {
  const bad = rows.filter(r => !(r.want !== null
    && +r.shown === r.want
    && r.bar === r.want + '%'
    && (r.aria === null || +r.aria === r.want)
    && +r.shownEp === r.wantEp));
  check(`${where} · เปอร์เซ็นต์ ข้อความ และแถบความคืบหน้า ตรงกับ sec/dur ที่บันทึกไว้จริงทุกใบ`,
    rows.length >= 2 && bad.length === 0, JSON.stringify(bad.length ? bad : rows));
  const shown = rows.map(r => r.shown).filter(v => v !== undefined);
  check(`${where} · สองรายการที่ความคืบหน้าต่างกัน แสดงเปอร์เซ็นต์ต่างกันจริง (ค่าตายตัวผ่านไม่ได้)`,
    rows.length >= 2 && new Set(rows.map(r => r.want)).size === rows.length
      && new Set(shown).size === rows.length,
    JSON.stringify(rows.map(r => `${r.slug}: แสดง ${r.shown}% · จริง ${r.want}% (${r.sec}/${r.dur})`)));
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

  /* ---- ดูตอนหนึ่ง แล้วดูว่าบันทึก "เป็นช่วง ๆ ขณะเล่น" จริงไหม ----
     AC-2 สั่งสองอย่างแยกกัน: เขียนเมื่อเปลี่ยนตอน **และ** เขียนเป็นช่วง ๆ ขณะเล่น (throttle)
     ข้อเดิมคลิกหยุดก่อนอ่าน storage ซึ่ง stop() บังคับเขียนด้วย persist(true) อยู่แล้ว
     จึงกลบการหายไปของการบันทึกระหว่างเล่นทั้งก้อน — Reviewer-Codex ลบ persist(false)
     ใน timer ออกแล้วด่านยังผ่าน · รอบนี้อ่าน storage **ขณะยังเล่นอยู่**
     ไม่หยุด ไม่ seek ไม่เปลี่ยนหน้า ไม่ซ่อนหน้า และนับจำนวนการเขียนเพื่อคุม throttle */
  await go('/watch/ceo-cold/ep-7/');
  /* นับการเขียนที่ชั้น Storage ของเบราว์เซอร์ ไม่ใช่ที่โค้ดเว็บ — ครอบทุกเส้นทางที่เขียน lakorn.cont
     ติดตะขอหลังหน้าโหลดเสร็จ จึงไม่นับการเขียนครั้งแรกตอนเปิดตอน (บรรทัดสุดท้ายของ initWatch) */
  await evaluate(`(function () {
    window.__w = 0;
    var orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'lakorn.cont') window.__w++;
      return orig.call(this, k, v);
    };
    return true;
  })()`);
  const snap = () => evaluate(`({
    w: window.__w,
    playing: document.getElementById('player').classList.contains('playing'),
    e: JSON.parse(localStorage.getItem('lakorn.cont')||'{}')['ceo-cold']
  })`);
  const s0 = await snap();
  await evaluate(`document.getElementById('playBtn').click()`);
  const tPlay = Date.now();
  await sleep(1300);
  const s1 = await snap();                 /* อ่านขณะกำลังเล่น ไม่แตะอะไรเลย */
  await sleep(1800);
  const s2 = await snap();                 /* อ่านอีกครั้ง ยังเล่นอยู่เหมือนกัน */
  const played = (Date.now() - tPlay) / 1000;
  check('ยังเล่นอยู่จริงตอนอ่าน storage ทั้งสองครั้ง (ไม่ได้หยุด/seek/เปลี่ยนหน้า/ซ่อนหน้า)',
    s1.playing && s2.playing, `playing = ${s1.playing} / ${s2.playing}`);
  check('บันทึกเป็นช่วง ๆ ขณะเล่น · ค่าใน storage เดินหน้าตามเวลาโดยไม่ต้องกดหยุด',
    s1.e && s2.e && s1.e.sec > (s0.e ? s0.e.sec : 0) && s2.e.sec > s1.e.sec,
    `sec ${s0.e && s0.e.sec} → ${s1.e && s1.e.sec} → ${s2.e && s2.e.sec}`);
  check('การเขียนระหว่างเล่นเกิดหลายครั้ง ไม่ใช่ครั้งเดียวตอนกดเล่น',
    s2.w >= 2 && s2.w - s1.w >= 1,
    `เขียน ${s2.w} ครั้งตั้งแต่กดเล่น (ช่วงหลัง ${s2.w - s1.w} ครั้ง)`);
  check('throttle ยังคุมอยู่ · ไม่เขียนทุก tick (เพลเยอร์จำลองเดิน 6 tick/วินาที)',
    s2.w <= 2 * Math.ceil(played) + 1, `เขียน ${s2.w} ครั้งใน ${played.toFixed(1)} วินาที`);
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

  /* ยามเดียวกันเคยกลืนปุ่มลัด `k` ไปพร้อม Space ทั้งที่ไม่มีปุ่ม/ลิงก์ไหนใช้ `k` เอง
     ผล: คลิกปุ่มเล่นด้วยเมาส์ (โฟกัสค้างที่ปุ่ม) แล้วกด `k` จะไม่หยุดเล่น — ไม่สม่ำเสมอกับลูกศร */
  const kKey = `document.getElementById('playBtn').dispatchEvent(
    new KeyboardEvent('keydown',{key:'k',bubbles:true,cancelable:true}))`;
  await evaluate(`document.getElementById('playBtn').focus(); document.getElementById('playBtn').click()`);
  await sleep(600);
  await evaluate(kKey + ', true');                                  /* k = หยุด */
  await sleep(700);
  const kStopped = await evaluate(`document.getElementById('tNow').textContent`);
  await sleep(700);
  const kStill = await evaluate(`document.getElementById('tNow').textContent`);
  check('กด k ขณะโฟกัสอยู่ที่ปุ่มเล่น แล้วหยุดเล่นได้จริง (UX §7.4)',
    kStopped === kStill, `${kStopped} → ${kStill}`);
  await evaluate(kKey + ', true');                                  /* k = เล่นต่อ */
  await sleep(700);
  check('กด k อีกครั้ง แล้วกลับมาเล่นต่อ',
    (await evaluate(`document.getElementById('tNow').textContent`)) !== kStill);
  await evaluate(`document.getElementById('playBtn').click()`);     /* หยุด → บังคับเขียน */

  /* ไม่มีบรรทัดซับไตเติลในเว็บจริง — ไม่มีไฟล์วิดีโอและไม่มีช่องซับในสัญญาข้อมูล
     (ม็อกอัพใช้ประโยคตัวอย่างจาก assets/data.js ซึ่งเป็นของชั้นออกแบบ ห้ามไหลเข้าเว็บจริง) */
  check('หน้ารับชมไม่มีบรรทัดซับไตเติลสมมติ (ไม่มี #subLine และไม่มี .sub-t ที่มีข้อความ)',
    await evaluate(`document.getElementById('subLine') === null
      && Array.from(document.querySelectorAll('.sub-t')).every(n => !n.textContent.trim())`));

  /* ---- ดูอีกเรื่องให้มีสองรายการ แล้วตรวจลำดับ ---- */
  await go('/watch/durian-revenge/ep-3/');
  await evaluate(`document.getElementById('playBtn').click()`);
  await sleep(1800);
  /* วางตำแหน่งของเรื่องนี้ไว้ราว 70% ให้ต่างจากเรื่องแรก (ราว 10%) อย่างชัดเจน
     ด่านเปอร์เซ็นต์ข้างล่างจะเทียบสองค่านี้กับ storage ทีละใบ
     ค่าตายตัวค่าเดียวตรงกับสองเรื่องที่ความคืบหน้าต่างกันไม่ได้ */
  await evaluate(`(function(){
    var b = document.getElementById('barWrap'), r = b.getBoundingClientRect();
    b.dispatchEvent(new MouseEvent('click', {clientX: r.left + r.width * 0.7, clientY: r.top + 2, bubbles:true}));
    return true;
  })()`);
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
  check('การ์ดโชว์เลขตอนของเรื่องที่ค้างไว้จริง (EP.3/24)',
    rail[0] && /EP\.3\/24 · ดูไปแล้ว \d+%/.test(rail[0].text), rail[0] && rail[0].text);
  checkPct('หน้าแรก แถบดูต่อ', await evaluate(pctProbe('#contRail .cont', '.m')));

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
  /* หน้าคลังเป็นอีกเทมเพลตหนึ่ง (contRowHtml) มี aria-valuenow ด้วย — ต้องตรวจแยกจากหน้าแรก */
  checkPct('หน้าคลัง แท็บดูต่อ', await evaluate(pctProbe('#libPanel .controw', '.st')));

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
