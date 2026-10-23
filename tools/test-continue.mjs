/* ทดสอบ "ดูต่อจากรายการค้างล่าสุด" ด้วยเบราว์เซอร์จริง — AIO-22 AC-2
   รัน:  node tools/test-continue.mjs
   ต้องมี Chromium ของ playwright ในเครื่อง (สคริปต์นี้ยก tools/serve.mjs + เบราว์เซอร์ให้เอง)

   ไล่ทุกบูลเล็ตของ AC-2 ด้วยพฤติกรรมจริง ข้อไหนตกจะ exit 1 พร้อมบอกว่าข้อไหน
   ค่าตั้งต้นขอพอร์ตว่างจาก OS เอง · ตั้งทับได้ด้วย AC2_PORT / AC2_CDP
   การยกเซิร์ฟเวอร์/เบราว์เซอร์ เพดานเวลา และการเก็บกวาด อยู่ที่ tools/cdp-gate.mjs
   (ไฟล์นี้กับ tools/test-contrast.mjs เคยมีโค้ดก้อนนั้นคนละสำเนา แล้วแก้ไม่สมมาตร — AIO-45 C2) */
import { startGate } from './cdp-gate.mjs';

const { BASE, send, evaluate, until, cleanup, sleep } = await startGate({
  envPorts: ['AC2_PORT', 'AC2_CDP'], profilePrefix: 'lakorn-ac2-',
});
const go = p => until(p, "document.readyState === 'complete' && !!window.LakornProgress");
/* เปิดหน้าโดยรอแค่ readyState — ห้ามรอ window.LakornProgress
   บล็อก "ค่าเสียรูปใน localStorage" (AIO-34) ต้องวัดได้ว่า LakornProgress หายไปหรือไม่
   ถ้ารอตัวแปรนั้นก่อน การถอยการแก้ออกจะกลายเป็น "ตัวทดสอบล้ม" แทนที่จะเป็น "ข้อนั้นแดง"
   (assets/app.js เป็น <script> ท้าย body แบบบล็อก ⇒ complete = สคริปต์รันจบแล้วแน่) */
const goRaw = p => until(p, "document.readyState === 'complete'");

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

  /* ================ AIO-34 · ค่าเสียรูปใน localStorage (บั๊ก 1–3 ของ QA) ================
     ยัดค่าเสียรูปลง storage จริง แล้ววัดจาก "หน้าที่ render จริง" ไม่ใช่จากซอร์ส
     ทุกข้อในบล็อกนี้ต้องแดงเมื่อถอยการแก้ที่ build/app.src.js ออก (ดูตารางมิวเทชันในใบงาน) */
  const putRaw = (key, raw) => evaluate(
    `localStorage.setItem('lakorn.' + ${JSON.stringify(key)}, ${JSON.stringify(raw)}), true`);
  const reset = async () => { await go('/'); await evaluate('localStorage.clear()'); };

  /* ---- บั๊ก 1 · สเกลาร์ ----
     `cont[slug] = …` บนสตริงโยน TypeError ใน strict mode → initWatch ล้ม
     → IIFE ไม่ถึงบรรทัด window.LakornProgress = Progress → JS ของหน้าตายทั้งหน้า */
  await reset();
  await putRaw('cont', '"พัง"');
  await putRaw('done', '"พัง"');
  await goRaw('/watch/ceo-cold/ep-5/');
  check('บั๊ก 1 · lakorn.cont/done เป็นสเกลาร์ → JS หน้ารับชมยังทำงาน (LakornProgress ไม่หายทั้งก้อน)',
    await evaluate('!!window.LakornProgress'),
    'LakornProgress = ' + await evaluate('typeof window.LakornProgress'));
  check('บั๊ก 1 · เพลเยอร์ยังเดินได้หลังเจอค่าเสียรูป (เวลาเริ่มที่ 0:00 ไม่ใช่หน้าค้าง)',
    await evaluate(`(document.getElementById('tNow')||{}).textContent`) === '0:00');
  const afterScalar = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'null')`);
  check('บั๊ก 1 · ค่าเสียรูปถูกเขียนทับด้วยคลังจริง ไม่ใช่ throw (ของดีทับของเสียได้)',
    !!afterScalar && typeof afterScalar === 'object' && !Array.isArray(afterScalar)
      && !!afterScalar['ceo-cold'] && afterScalar['ceo-cold'].ep === 5,
    JSON.stringify(afterScalar));

  /* ---- บั๊ก 2 · อาร์เรย์ ----
     ไม่โยน แต่ JSON.stringify ทิ้งคีย์ที่เป็นชื่อ ⇒ บันทึกแล้วหายทุกครั้งอย่างเงียบ ๆ */
  await reset();
  await putRaw('cont', '[1,2,3]');
  await goRaw('/watch/ceo-cold/ep-5/');
  check('บั๊ก 2 · lakorn.cont เป็นอาร์เรย์ → JS หน้ารับชมยังทำงาน',
    await evaluate('!!window.LakornProgress'));
  const afterArray = await evaluate(`JSON.parse(localStorage.getItem('lakorn.cont')||'null')`);
  check('บั๊ก 2 · บันทึกแล้วได้ object จริง ไม่ใช่อาร์เรย์ที่คีย์หายไป',
    !!afterArray && !Array.isArray(afterArray) && !!afterArray['ceo-cold'],
    JSON.stringify(afterArray));
  await goRaw('/library/?tab=continue');
  check('บั๊ก 2 · หน้าคลังเห็นรายการค้างนั้นจริง (ความคืบหน้าไม่หายเงียบ ๆ)',
    await evaluate(`document.querySelectorAll('#libPanel .controw').length === 1`),
    'แถว = ' + await evaluate(`document.querySelectorAll('#libPanel .controw').length`));

  /* ---- บั๊ก 3 · sec/dur/ep ที่ไม่ใช่ตัวเลข ----
     `e.sec || 0` ปล่อย 'abc' ผ่านไปหาร ⇒ "ดูไปแล้ว NaN%" และ style="width:NaN%"
     ค่าที่คาดหวังคำนวณใหม่ในเบราว์เซอร์จาก window.LAKORN ไม่ได้เอามาจากโค้ดที่กำลังตรวจ */
  await reset();
  await putRaw('cont', JSON.stringify({
    'ceo-cold': { ep: 3, sec: 'abc', dur: 200, ts: 3000 },
    'house-13': { ep: '2', sec: '50', dur: '200', ts: 2000 },
    'mirror-bride': { ep: 2, sec: 30, dur: 'เสีย', ts: 1000 },
  }));
  await goRaw('/library/?tab=continue');
  check('บั๊ก 3 · lakorn.cont ที่ sec/dur/ep เสียรูป → หน้าคลังยังทำงาน',
    await evaluate('!!window.LakornProgress'));
  const rows34 = await evaluate(`(function () {
    var ser = {}; (window.LAKORN.series || []).forEach(function (s) { ser[s.slug] = s; });
    function secs(x) { var p = String(x).split(':'); return (+p[0]) * 60 + (+p[1]); }
    return Array.prototype.slice.call(document.querySelectorAll('#libPanel .controw')).map(function (a) {
      var slug = (a.getAttribute('href').match(/watch\\/([^\\/]+)\\//) || [])[1];
      var s = ser[slug], fill = a.querySelector('.pbar i');
      /* dur ที่ควรได้: ค่าที่ใช้ได้จาก storage ถ้ามี ไม่งั้นความยาวตอนนั้นจากคลัง */
      var raw = JSON.parse(localStorage.getItem('lakorn.cont') || '{}')[slug] || {};
      var ep = Math.min(Math.max(Math.round(Number(raw.ep)) || 1, 1), s.eps);
      var d = Math.round(Number(raw.dur));
      if (!(d > 0)) d = secs(s.episodes[ep - 1][1]);
      var sc = Math.round(Number(raw.sec));
      if (!isFinite(sc) || sc < 0) sc = 0;
      return {
        slug: slug, text: a.querySelector('.st').textContent.trim(),
        bar: fill ? fill.style.width : null,
        aria: a.querySelector('.pbar').getAttribute('aria-valuenow'),
        wantEp: ep, wantPct: Math.max(0, Math.min(100, Math.round(sc / d * 100)))
      };
    });
  })()`);
  check('บั๊ก 3 · ไม่มีคำว่า NaN เหลือบนหน้าคลังเลย',
    rows34.length === 3 && !/NaN/.test(rows34.map(r => r.text + r.bar + r.aria).join(' ')),
    JSON.stringify(rows34));
  const bad34 = rows34.filter(r => !(r.text.indexOf('EP.' + r.wantEp + '/') === 0
    && r.text.indexOf('ดูไปแล้ว ' + r.wantPct + '%') > -1
    && r.bar === r.wantPct + '%' && +r.aria === r.wantPct));
  check('บั๊ก 3 · ทุกแถวแสดงเปอร์เซ็นต์/เลขตอนที่คำนวณจาก sec,dur,ep ที่หนีบเป็นตัวเลขแล้ว',
    rows34.length === 3 && bad34.length === 0, JSON.stringify(bad34.length ? bad34 : rows34));
  /* dur ที่ใช้ไม่ได้ ('เสีย') ต้องถอยไปใช้ความยาวตอนจากคลัง ไม่ใช่กลายเป็น 0 หรือ NaN */
  const mb = rows34.find(r => r.slug === 'mirror-bride');
  check('บั๊ก 3 · dur ที่ใช้ไม่ได้ → ถอยไปใช้ความยาวตอนจากคลัง แถบจึงมีความกว้างที่คิดได้',
    !!mb && /^\d+%$/.test(mb.bar) && mb.bar !== '0%', JSON.stringify(mb));

  /* ep ที่ไม่ใช่ตัวเลขเคยไหลตรงเข้าป้ายปุ่ม ("ดูต่อ EP.abc") เพราะ resumeLabel ต่อสตริงดิบ */
  await reset();
  await putRaw('cont', JSON.stringify({ 'ceo-cold': { ep: 'abc', sec: 10, dur: 200, ts: 5000 } }));
  await goRaw('/series/ceo-cold/');
  const lbl34 = await evaluate(`(document.querySelector('[data-resume-label]')||{}).textContent`);
  check('บั๊ก 3 · ep ที่ไม่ใช่ตัวเลข → ป้ายปุ่มไม่โชว์ "EP.abc"',
    lbl34 === 'ดูต่อ EP.1', 'ป้าย = ' + JSON.stringify(lbl34));
  check('บั๊ก 3 · ลิงก์ดูต่อยังชี้ตอนที่มีจริง',
    /\/watch\/ceo-cold\/ep-1\//.test(await evaluate(`document.querySelector('[data-resume]').getAttribute('href')`)),
    await evaluate(`document.querySelector('[data-resume]').getAttribute('href')`));

  /* ประวัติเก็บ ep ไว้อีกที่หนึ่ง — รายการที่เป็น null ทำให้ x.slug โยนตั้งแต่ใน pushHistory */
  await reset();
  await putRaw('history', JSON.stringify([{ slug: 'ceo-cold', ep: 'abc', ts: 9000 }, null, 'พัง']));
  await goRaw('/library/?tab=history');
  const hist34 = await evaluate(`Array.prototype.slice.call(
    document.querySelectorAll('#libPanel .ep-row')).map(function (a) {
      return { href: a.getAttribute('href'), text: a.textContent.replace(/\\s+/g, ' ').trim() };
    })`);
  check('บั๊ก 3 · ประวัติที่ ep เสียรูป/มีรายการ null → หน้าคลังยังทำงาน',
    await evaluate('!!window.LakornProgress'));
  check('บั๊ก 3 · ประวัติไม่โชว์ "EP.abc" และลิงก์ชี้ตอนที่มีจริง',
    hist34.length === 1 && /EP\.1\b/.test(hist34[0].text) && /\/watch\/ceo-cold\/ep-1\//.test(hist34[0].href),
    JSON.stringify(hist34));

  /* ---- ล้างข้อมูลแล้วต้องกลับไปหน้าว่าง ไม่พัง ---- */
  await go('/');
  await evaluate('localStorage.clear()');
  await go('/library/?tab=continue');
  check('ล้าง localStorage อีกครั้ง → กลับไปหน้าว่าง ไม่พัง',
    await evaluate(`/ยังไม่มีเรื่องที่ดูค้าง/.test(document.getElementById('libPanel').textContent)`));

  console.log(`\nผล: ผ่าน ${pass} · ตก ${fail}`);
  await cleanup(fail ? 1 : 0);
} catch (e) {
  console.error('ทดสอบล้ม: ' + e.message);
  await cleanup(1);
}
