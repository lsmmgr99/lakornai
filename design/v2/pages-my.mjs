/* หน้ากลุ่ม D (ของฉัน — ไม่ต้องมีบัญชี), E (onboarding), F (สถานะระบบ), G (คอนเทนต์/กฎหมาย)
   rev.2 — 9 หน้าของชั้นเงิน/บัญชี (เข้าสู่ระบบ / OTP / โปรไฟล์ / กระเป๋าเหรียญ / เติมเหรียญ /
   VIP / ชำระเงิน / ผลการชำระ / รับเหรียญฟรี) ถูกลบตามคำสั่ง UX §1.0
   กลุ่ม D เหลือ 2 หน้า: D1 ตั้งค่า (เดิม D10) · D2 แจ้งเตือน (เดิม D11) */
import {
  D, cover, ic, esc, TROPES,
  header, bottomNav, footer, page, write, card, epRow,
  empty, errorBox, skelCard, skelRow, poster,
} from './lib.mjs';

const S = Object.fromEntries(D.series.map(s => [s.slug, s]));

/* ไม่มีช่อง "บัญชี" ใน bottom nav แล้ว → หน้ากลุ่มนี้ไม่ไฮไลต์ช่องไหน */
function dpage({ title, back, body, nav = '', cta = null }) {
  return page({
    title,
    body: `${header({ back, active: nav })}
      <main id="main" class="page">${body}</main>
      ${cta ? `<div class="sticky-cta">${cta}</div>` : ''}
      ${bottomNav(nav)}`,
  });
}

/* ===================== D1 ตั้งค่า (เดิม D10) — UX §5.7 ===================== */
export function buildSettings() {
  const row = (label, sub, ctrl) => `<div class="r"><span style="flex:1">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span>${ctrl}</div>`;
  write('settings.html', dpage({
    title: 'ตั้งค่า', back: 'ตั้งค่า',
    body: `<div class="wrap" style="max-width:640px">
      <div class="page-head"><h1>ตั้งค่า</h1><p>บันทึกทันทีที่สลับ — ไม่มีปุ่มยืนยัน และไม่ต้องมีบัญชี</p></div>
      <section class="sec" style="margin-top:var(--s2)"><div class="sec-h"><h2>การเล่น</h2></div>
        <div class="rowlist">
          ${row('เล่นตอนถัดไปอัตโนมัติ', 'นับถอยหลัง 5 วินาทีเมื่อดูจบตอน', '<span class="switch on"></span>')}
          ${row('เล่นเสียงอัตโนมัติ', 'ค่าเริ่มต้นคือปิดเสียง แตะที่จอเพื่อเปิด', '<span class="switch"></span>')}
          ${row('ขนาดตัวอักษรซับไตเติล', 'ใหญ่', `<span style="color:var(--muted);font-size:var(--t-sub)">ใหญ่ ${ic('right', 'sm')}</span>`)}
          ${row('คุณภาพวิดีโอ', 'อัตโนมัติตามความเร็วเน็ต', `<span style="color:var(--muted);font-size:var(--t-sub)">อัตโนมัติ ${ic('right', 'sm')}</span>`)}
          ${row('เปิดซับไตเติลเสมอ', null, '<span class="switch on"></span>')}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>การแจ้งเตือน</h2></div>
        <div class="rowlist">
          ${row('ตอนใหม่ของเรื่องที่ติดตาม', 'อ่านจากรายการติดตามในเครื่องนี้', '<span class="switch on"></span>')}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>ภาษา</h2></div>
        <div class="rowlist">
          ${row('ภาษาของเว็บไซต์', 'ตอนนี้มีเฉพาะภาษาไทย — โครงสร้าง URL เตรียมรองรับภาษาอื่นไว้แล้ว',
            `<span style="color:var(--faint);font-size:var(--t-sub)">ไทย (เท่านั้น)</span>`)}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>ข้อมูลในเครื่องนี้</h2></div>
        <div class="rowlist">
          <div class="r"><span style="flex:1">ประวัติการดู<span class="sub">24 เรื่อง · เก็บในเครื่องนี้เท่านั้น</span></span>
            <button class="btn btn-ghost btn-sm">ล้างประวัติ</button></div>
          <div class="r"><span style="flex:1">คลังทั้งหมด<span class="sub">ดูต่อ ติดตาม ดูจบแล้ว ประวัติ และแนวที่เลือกไว้</span></span>
            <button class="btn btn-danger btn-sm">ล้างข้อมูล</button></div>
        </div>
        <p class="note-ex" style="margin-top:var(--s3)">${ic('alert', 'sm')}
          <span>การล้างข้อมูลย้อนกลับไม่ได้ และไม่มีบัญชีให้กู้คืน — จะถามยืนยัน 1 ชั้นก่อนลบ</span></p>
      </section>
      <p style="text-align:center;color:var(--faint);font-size:var(--t-meta);margin-top:var(--s6)">
        AiLakorn เวอร์ชัน 2.0 · ม็อกอัพเสนอแบบ · 23 ต.ค. 2569</p>
    </div>${footer()}`,
  }));
}

/* ===================== D2 ศูนย์แจ้งเตือน (เดิม D11) — UX §5.7 ===================== */
export function buildNotifications() {
  const items = [
    ['durian-revenge', 'EP.24 ออกแล้ว', 'ทุเรียนทวงแค้น · ตอน “ข้อตกลงหนึ่งคืน”', '12 นาทีที่แล้ว', true],
    ['villainess-reborn', 'EP.13 ออกแล้ว', 'ข้ามภพมาเป็นนางร้าย · ตอน “หลักฐานชิ้นที่สอง”', '2 ชั่วโมงที่แล้ว', true],
    ['ayutthaya-love', 'EP.19 ออกแล้ว', 'ย้อนรอยรักกรุงศรี · ตอน “คำสาบานใต้ต้นโพธิ์”', '5 ชั่วโมงที่แล้ว', true],
    ['ceo-cold', 'ดูค้างไว้ที่ EP.12', 'ประธานเย็นชากับเลขาตัวแสบ · กลับมาดูต่อได้เลย', 'เมื่อวาน', false],
    ['mirror-bride', 'EP.18 ออกแล้ว (ตอนจบ)', 'เจ้าสาวในกระจก · เรื่องนี้จบแล้ว', '2 วันที่แล้ว', false],
  ];
  const body = isEmpty => `<div class="wrap" style="max-width:760px">
    <div class="page-head" style="display:flex;align-items:flex-end;justify-content:space-between;gap:var(--s3)">
      <h1>การแจ้งเตือน</h1>
      ${isEmpty ? '' : `<button class="btn btn-link">ทำเครื่องหมายอ่านทั้งหมด</button>`}</div>
    ${isEmpty
      ? empty('bell', 'ยังไม่มีการแจ้งเตือน', 'เมื่อเรื่องที่คุณติดตามปล่อยตอนใหม่ เราจะแจ้งที่นี่', 'ไปติดตามเรื่องที่ชอบ')
      : `<div class="day-h">วันนี้</div>
         <div class="list">${items.slice(0, 3).map(([k, t, p, tm, un]) => notif(k, t, p, tm, un)).join('')}</div>
         <div class="day-h">ก่อนหน้านี้</div>
         <div class="list">${items.slice(3).map(([k, t, p, tm, un]) => notif(k, t, p, tm, un)).join('')}</div>`}
  </div>${footer()}`;
  function notif(k, t, p, tm, unread) {
    const s = S[k];
    return `<a class="notif${unread ? ' unread' : ''}" href="#">
      <span class="th"><img src="${cover(s)}" alt=""></span>
      <span class="bd"><b>${t}</b><p>${p}</p></span>
      <span class="tm">${tm}</span></a>`;
  }
  write('notifications.html', dpage({ title: 'ศูนย์แจ้งเตือน', back: 'การแจ้งเตือน', body: body(false) }));
  write('notifications-empty.html', dpage({ title: 'ศูนย์แจ้งเตือน — ว่าง', back: 'การแจ้งเตือน', body: body(true) }));
}

/* ===================== E1 เลือกแนวที่ชอบ ===================== */
export function buildWelcome() {
  const picks = [...D.genres.map(g => [g.label, D.series.filter(s => s.genres.includes(g.slug))[0]]),
    ...TROPES.map(t => [t.label, S[t.items[0]]])];
  write('welcome.html', page({
    title: 'เลือกแนวที่ชอบ (onboarding)',
    body: `${header()}
      <main id="main" class="page"><div class="wrap" style="max-width:720px">
        <div class="page-head" style="text-align:center;padding-top:var(--s7)">
          <span style="display:inline-flex;color:var(--accent);margin-bottom:var(--s3)">${ic('sparkle', 'lg')}</span>
          <h1>เลือกแนวที่ชอบ</h1>
          <p style="margin-inline:auto">เลือกอย่างน้อย 1 อย่าง เพื่อให้เราแนะนำเรื่องที่ตรงใจตั้งแต่หน้าแรก — เปลี่ยนภายหลังได้ที่ตั้งค่า</p></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s3)">
          ${picks.map(([label, s], i) => `<button class="gtile" style="min-height:112px;${i < 2 ? 'outline:2px solid var(--accent);outline-offset:2px' : ''}">
            <img src="${cover(s)}" alt="">
            <span>${label}</span>
            ${i < 2 ? `<span class="cnt" style="color:var(--accent)">${ic('checkc', 'sm')}</span>` : ''}</button>`).join('')}</div>
        <div class="btn-row" style="margin-top:var(--s6);justify-content:center">
          <button class="btn btn-ghost">ข้ามไปก่อน</button>
          <button class="btn btn-accent" style="flex:1;max-width:280px">เริ่มดูเลย (เลือกแล้ว 2)</button></div>
        <div class="perm" style="margin-top:var(--s5);justify-content:center"><span class="ic">${ic('playf', 'sm')}</span>
          <span><b>ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก</b></span></div>
        <p class="note-ex" style="justify-content:center;margin-top:var(--s3)">${ic('info', 'sm')}
          <span>ตัวเลือกนี้เก็บในเครื่องนี้เท่านั้น</span></p>
      </div></main>`,
  }));
  write('welcome-empty.html', page({
    title: 'เลือกแนวที่ชอบ — ยังไม่ได้เลือก',
    body: `${header()}
      <main id="main" class="page"><div class="wrap" style="max-width:720px">
        <div class="page-head" style="text-align:center;padding-top:var(--s7)">
          <span style="display:inline-flex;color:var(--accent);margin-bottom:var(--s3)">${ic('sparkle', 'lg')}</span>
          <h1>เลือกแนวที่ชอบ</h1>
          <p style="margin-inline:auto">เลือกอย่างน้อย 1 อย่าง เพื่อให้เราแนะนำเรื่องที่ตรงใจตั้งแต่หน้าแรก</p></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s3)">
          ${picks.map(([label, s]) => `<button class="gtile" style="min-height:112px"><img src="${cover(s)}" alt=""><span>${label}</span></button>`).join('')}</div>
        <div class="btn-row" style="margin-top:var(--s6);justify-content:center">
          <button class="btn btn-ghost">ข้ามไปก่อน</button>
          <button class="btn btn-accent is-disabled" style="flex:1;max-width:280px">เริ่มดูเลย</button></div>
      </div></main>`,
  }));
}

/* ===================== F1 404 / F2 ออฟไลน์ / F3 แพตเทิร์น error ===================== */
export function buildSystem() {
  write('404.html', page({
    title: '404 ไม่พบหน้า',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div style="text-align:center;padding:var(--s9) 0 var(--s6)">
        <div style="font-family:var(--display);font-size:86px;font-weight:600;line-height:1;
          background:linear-gradient(180deg,var(--gold-1),var(--gold-3));-webkit-background-clip:text;background-clip:text;color:transparent" lang="en">404</div>
        <h1 style="font-size:var(--t-h1);font-weight:600;margin-top:var(--s3)">ไม่พบหน้าที่คุณหา</h1>
        <p style="color:var(--muted);margin-top:10px;font-size:var(--t-sub);line-height:var(--lh-sub);max-width:40ch;margin-inline:auto">
          ลิงก์อาจหมดอายุ หรือเรื่องนี้ถูกย้ายไปแล้ว ลองเริ่มจากหน้าแรกหรือค้นหาชื่อเรื่องดู</p>
        <div class="btn-row" style="justify-content:center;margin-top:var(--s5)">
          <a class="btn btn-accent" href="#">กลับหน้าแรก</a>
          <a class="btn btn-ghost" href="#">${ic('search', 'sm')} ค้นหา</a></div></div>
      <section class="sec"><div class="sec-h"><h2>เรื่องยอดนิยมตอนนี้</h2></div>
        <div class="rail-wrap"><div class="rail">${['ceo-cold', 'durian-revenge', 'billion-widow', 'villainess-reborn', 'ayutthaya-love', 'heir-returns']
          .map(k => card(S[k])).join('')}</div></div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));

  write('offline.html', page({
    title: 'ออฟไลน์',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div style="text-align:center;padding:var(--s9) 0 var(--s5)">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line-2);
          display:grid;place-items:center;color:var(--dim);margin:0 auto var(--s4)">${ic('wifioff', 'lg')}</div>
        <h1 style="font-size:var(--t-h1);font-weight:600">อินเทอร์เน็ตหลุด</h1>
        <p style="color:var(--muted);margin-top:10px;font-size:var(--t-sub);line-height:var(--lh-sub);max-width:38ch;margin-inline:auto">
          ตรวจสอบการเชื่อมต่อแล้วลองใหม่ — เรื่องที่ดูค้างไว้ยังเปิดดูรายการได้จากเครื่องของคุณ</p>
        <button class="btn btn-accent" style="margin-top:var(--s5)">${ic('refresh', 'sm')} ลองใหม่</button></div>
      <section class="sec"><div class="sec-h"><h2>เรื่องที่ดูค้างไว้ (จากเครื่องนี้)</h2></div>
        <div class="list">${[['villainess-reborn', 12], ['durian-revenge', 5], ['ayutthaya-love', 21]]
          .map(([k, n]) => epRow(S[k], n, { cur: true })).join('')}</div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));

  /* F2 state "กำลังลองใหม่" (UX §4.2) */
  write('offline-retry.html', page({
    title: 'ออฟไลน์ — กำลังลองใหม่',
    body: `${header()}<main id="main" class="page"><div class="wrap">
      <div style="text-align:center;padding:var(--s9) 0 var(--s5)">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line-2);
          display:grid;place-items:center;color:var(--accent);margin:0 auto var(--s4)"><span class="spin" style="width:30px;height:30px"></span></div>
        <h1 style="font-size:var(--t-h1);font-weight:600">กำลังเชื่อมต่ออีกครั้ง…</h1>
        <p style="color:var(--muted);margin-top:10px;font-size:var(--t-sub);line-height:var(--lh-sub);max-width:38ch;margin-inline:auto">
          ถ้ายังไม่ติดภายใน 10 วินาที เราจะหยุดลองแล้วให้คุณกดเองอีกครั้ง</p>
        <button class="btn btn-accent" style="margin-top:var(--s5)" disabled>
          <span class="spin"></span> กำลังลองใหม่…</button></div>
      <section class="sec"><div class="sec-h"><h2>เรื่องที่ดูค้างไว้ (จากเครื่องนี้)</h2></div>
        <p class="sec-sub">รายการนี้อ่านจากเครื่องของคุณ จึงยังเห็นได้แม้เน็ตหลุด</p>
        <div class="list">${[['villainess-reborn', 12], ['durian-revenge', 5], ['ayutthaya-love', 21]]
          .map(([k, n]) => epRow(S[k], n, { cur: true })).join('')}</div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));

  /* F3 + 6.14 แพตเทิร์นกลาง */
  write('patterns.html', page({
    title: 'แพตเทิร์นกลาง — loading / empty / error',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>แพตเทิร์นกลาง: โหลด / ว่าง / ผิดพลาด</h1>
        <p>UX 6.14 — ออกแบบครั้งเดียว ใช้กับ 60 ช่องสถานะที่เหลือทั้งเว็บ</p></div>

      <section class="sec"><div class="sec-h"><h2>1. Skeleton 4 แบบ</h2></div>
        <p class="sec-sub">ใช้ <code>pulse opacity</code> ไม่ใช่ gradient วิ่ง เพื่อให้เคารพ <code>prefers-reduced-motion</code></p>
        <div style="display:grid;gap:var(--s5);grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <div><div class="note-ex" style="margin-bottom:10px">การ์ด 2:3</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)">${skelCard()}${skelCard()}</div></div>
          <div><div class="note-ex" style="margin-bottom:10px">การ์ดดูต่อ 16:9</div>
            <div class="skelcard"><div class="skel c"></div><div class="skel l w90"></div><div class="skel l w45"></div></div></div>
          <div><div class="note-ex" style="margin-bottom:10px">แถวตอน</div>
            <div style="display:grid;gap:10px">${skelRow()}${skelRow()}</div></div>
          <div><div class="note-ex" style="margin-bottom:10px">บล็อกข้อความ</div>
            <div style="display:grid;gap:10px"><div class="skel l" style="height:22px;width:60%"></div>
              <div class="skel l w90"></div><div class="skel l w90"></div><div class="skel l w70"></div></div></div>
        </div></section>

      <section class="sec"><div class="sec-h"><h2>2. Empty — ต้องมีปุ่มพาไปต่อเสมอ</h2></div>
        <p class="sec-sub">ไอคอน + หัวข้อ + 1 ประโยค + ปุ่ม — ห้ามเป็นทางตัน</p>
        <div style="display:grid;gap:var(--s4);grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
          <div class="panel">${empty('playf', 'ยังไม่มีเรื่องที่ดูค้าง', 'เริ่มจากฟีดแนวตั้ง ปัดดูทีละเรื่อง', 'เริ่มเลื่อนดูฟีด')}</div>
          <div class="panel">${empty('search', 'ไม่พบเรื่องที่ตรงกับคำค้น', 'ลองคำอื่น หรือเลือกจากคำค้นยอดนิยม', 'ดูทุกเรื่องในคลัง')}</div>
          <div class="panel">${empty('bell', 'ยังไม่มีการแจ้งเตือน', 'เมื่อเรื่องที่ติดตามปล่อยตอนใหม่ เราจะแจ้งที่นี่', 'ไปติดตามเรื่องที่ชอบ')}</div>
        </div></section>

      <section class="sec"><div class="sec-h"><h2>3. Error ในหน้า</h2></div>
        <p class="sec-sub">ไอคอน + “โหลดไม่ได้” + ปุ่มลองใหม่ · ใช้ซ้ำได้ทุกบล็อกที่โหลดข้อมูล</p>
        <div style="display:grid;gap:var(--s4);grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
          ${errorBox()}
          ${errorBox('เล่นตอนนี้ไม่ได้', 'ไฟล์วิดีโอขัดข้อง ลองใหม่หรือข้ามไปตอนถัดไป')}
        </div></section>

      <section class="sec"><div class="sec-h"><h2>4. Toast</h2></div>
        <div style="position:relative;height:120px;border:1px dashed var(--line-2);border-radius:var(--r-lg);background:var(--surface)">
          <div class="toast" style="position:absolute;bottom:20px">
            <span class="ic">${ic('checkc', 'sm')}</span><span>ติดตาม “ทุเรียนทวงแค้น” แล้ว</span>
            <button>เลิกทำ</button></div></div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== G1–G7 (rev.2: G6 เดิม "เงื่อนไขสมาชิก" ถูกลบ · คุกกี้/เบื้องหลัง AI เลื่อนขึ้นเป็น G6/G7) ===================== */
export function buildContent() {
  /* G1 เกี่ยวกับเรา */
  write('about.html', page({
    title: 'เกี่ยวกับเรา',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>เกี่ยวกับ AiLakorn</h1>
        <p>ละครสั้นแนวตั้งสัญชาติไทย ที่ปก บท และตัวละครทุกตัวสร้างด้วย AI — <strong>ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก</strong></p></div>
      <div class="prose">
        <p>AiLakorn เกิดจากคำถามเดียว — ถ้าคนไทยดูละครสั้นวันละ 20 นาทีระหว่างเดินทาง เราจะทำละครที่<strong>เริ่มจากศูนย์แล้วจบในหนึ่งคืน</strong>ได้ไหม</p>
        <h2>ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก</h2>
        <p>นี่คือจุดยืนของเรา ไม่ใช่โปรโมชัน — ทุกเรื่องทุกตอนบน AiLakorn เปิดให้ดูได้ทันที <strong>ไม่มีตอนที่ล็อกไว้ ไม่มีเหรียญให้เติม ไม่มีแพ็กเกจให้สมัคร และไม่มีแบบฟอร์มให้กรอกก่อนกดเล่น</strong> เราเชื่อว่าสิ่งที่ทำให้คนกลับมาดูคือตอนถัดไปที่ดีพอ ไม่ใช่กำแพงที่ขัดจังหวะตอนกำลังสนุก</p>
        <h2>เราทำอะไร</h2>
        <p>เราเขียนโครงเรื่องแบบไทย ๆ ที่คนไทยอินจริง — แก้แค้น ซ่อนตัวตน ข้ามภพ — แล้วใช้ AI ช่วยสร้างบท ปก และตัวละคร โดยมีทีมงานคนไทยเป็นผู้กำกับทิศทางทุกขั้นตอน</p>
        <div class="stat-row">
          <div><b class="num">12</b><span>เรื่องในคลัง</span></div>
          <div><b class="num">418</b><span>ตอนทั้งหมด</span></div>
          <div><b class="num">3</b><span>นาทีต่อตอน</span></div></div>
        <h2>ทำไมต้องแนวตั้ง</h2>
        <p>เพราะมือถือคือจอหลักของคนไทย การถ่ายแนวตั้งไม่ใช่ข้อจำกัด แต่เป็นการเลือกภาษาภาพที่ตรงกับวิธีที่คนดูจริง ๆ</p>
        <h2>“ละครผลไม้ AI” คืออะไร</h2>
        <p>เป็นแนวที่เราสร้างเอง ไม่มีที่ไหนทำ — ตัวละครเป็นผลไม้ไทยที่มีชีวิต มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น เป็นแนวที่คนจำเราได้</p>
      </div>
      <a class="btn btn-accent" href="#" style="margin-top:var(--s5)">${ic('sparkle', 'sm')} ดูเบื้องหลังการสร้างด้วย AI</a>
    </div>${footer()}</main>${bottomNav('')}`,
  }));

  /* G2 ติดต่อ */
  const contact = (state) => `<div class="wrap" style="max-width:620px">
    <div class="page-head"><h1>ติดต่อเรา</h1><p>มีคำถาม ติชม หรืออยากร่วมงาน ส่งมาได้เลย เราอ่านทุกข้อความ</p></div>
    ${state === 'sent' ? `<div class="perm" style="margin-bottom:var(--s5)"><span class="ic">${ic('checkc', 'sm')}</span>
      <span><b>ส่งข้อความแล้ว</b> — เราจะตอบกลับภายใน 2 วันทำการ (ตัวอย่าง: ยังไม่มีการส่งจริง)</span></div>` : ''}
    <label class="field"><span>ชื่อของคุณ</span><input value="${state === 'bad' ? '' : 'กานต์ ศรีสุข'}" placeholder="ชื่อ-นามสกุล"></label>
    <label class="field${state === 'bad' ? ' bad' : ''}"><span>อีเมล</span>
      <input type="email" value="${state === 'bad' ? 'kan@' : 'kan@example.com'}" placeholder="you@example.com" ${state === 'bad' ? 'aria-invalid="true"' : ''}>
      ${state === 'bad' ? `<span class="err">${ic('alert', 'sm')} รูปแบบอีเมลไม่ถูกต้อง</span>` : ''}</label>
    <label class="field"><span>หัวข้อ</span><select><option>ปัญหาการใช้งาน</option><option>แจ้งปัญหาการเล่นวิดีโอ</option><option>ร่วมงานกับเรา</option></select></label>
    <label class="field"><span>ข้อความ</span><textarea placeholder="เล่าให้เราฟัง…">${state === 'bad' ? '' : 'อยากให้มีแนวตลกร้ายเพิ่มครับ'}</textarea></label>
    <button class="btn btn-accent btn-block"${state === 'busy' ? ' disabled' : ''}>
      ${state === 'busy' ? '<span class="spin"></span> กำลังส่ง…' : 'ส่งข้อความ'}</button>
    <p class="note-ex" style="margin-top:var(--s4)">${ic('info', 'sm')}
      <span>ฟอร์มนี้ตรวจความถูกต้องจริง แต่ยังไม่ได้ต่อระบบส่งอีเมล</span></p>
  </div>${footer()}`;
  write('contact.html', page({ title: 'ติดต่อเรา', body: `${header({})}<main id="main" class="page">${contact('default')}</main>${bottomNav('')}` }));
  write('contact-error.html', page({ title: 'ติดต่อเรา — ช่องไม่ถูกต้อง', body: `${header({})}<main id="main" class="page">${contact('bad')}</main>${bottomNav('')}` }));
  write('contact-busy.html', page({ title: 'ติดต่อเรา — กำลังส่ง', body: `${header({})}<main id="main" class="page">${contact('busy')}</main>${bottomNav('')}` }));

  /* G3 ช่วยเหลือ */
  const faqs = [
    ['ต้องสมัครสมาชิกไหม เสียเงินไหม',
      'ไม่ต้อง และไม่เสีย — ทุกเรื่องทุกตอนดูฟรี ไม่มีการสมัครสมาชิก ไม่มีการเติมเงิน และไม่มีตอนที่ล็อกไว้ กดเล่นได้ทันทีตั้งแต่ตอนแรกถึงตอนจบ', true],
    ['ดูต่อจากที่ค้างไว้ได้ยังไง',
      'เว็บจำตอนและเวลาที่คุณดูค้างไว้ให้เองในเครื่องนี้ กลับมาที่หน้าแรกหรือ “คลังของฉัน” แท็บ “ดูต่อ” แล้วกดเล่นต่อได้เลย', false],
    ['ตอนใหม่ออกเมื่อไหร่',
      'แต่ละเรื่องมีรอบปล่อยตอนของตัวเอง ดูได้ที่หน้า “ตารางออกตอน” และถ้ากดติดตามไว้ เราจะแจ้งที่กระดิ่งเมื่อมีตอนใหม่', false],
    ['คลังของฉันหายไปทำไม',
      'เพราะไม่มีระบบบัญชี คลังจึงเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ เปลี่ยนเครื่อง หรือเปิดในโหมดส่วนตัว รายการจะไม่ตามไปด้วย', false],
    ['ย้ายคลังไปเครื่องอื่นได้ไหม',
      'ยังไม่ได้ในเวอร์ชันนี้ — การซิงก์ข้ามเครื่องต้องมีบัญชีผู้ใช้ ซึ่งเราเลือกที่จะไม่มี เพื่อให้เริ่มดูได้ทันทีโดยไม่ต้องกรอกอะไร', false],
    ['วิดีโอเล่นไม่ได้ ทำยังไง',
      'ลองรีเฟรชหน้า ตั้งคุณภาพเป็นอัตโนมัติ หรือเช็กการเชื่อมต่อ ถ้ายังไม่ได้แจ้งเราที่หน้าติดต่อ', false],
  ];
  write('help.html', page({
    title: 'ช่วยเหลือ / คำถามที่พบบ่อย',
    body: `${header({})}<main id="main" class="page"><div class="wrap" style="max-width:800px">
      <div class="page-head"><h1>ช่วยเหลือ</h1><p>คำถามที่คนถามบ่อยที่สุด เรียงตามหมวด</p></div>
      <div class="search-box" style="margin-bottom:var(--s5)"><span class="ic">${ic('search')}</span>
        <input placeholder="ค้นหาในคำถามที่พบบ่อย" aria-label="ค้นหาในคำถาม"></div>
      <div class="chips" style="margin-bottom:var(--s4)">
        <button class="chip" aria-pressed="true">ทั้งหมด</button>
        <button class="chip" aria-pressed="false">การดู</button>
        <button class="chip" aria-pressed="false">คลังในเครื่องนี้</button>
        <button class="chip" aria-pressed="false">ปัญหาเทคนิค</button></div>
      ${faqs.map(([q, a, open]) => `<div class="acc${open ? ' open' : ''}">
        <button class="q" aria-expanded="${open}">${q}<span class="ch">${ic('down', 'sm')}</span></button>
        ${open ? `<div class="a">${a}</div>` : ''}</div>`).join('')}
      <div class="panel" style="margin-top:var(--s6);text-align:center">
        <h3>ยังไม่เจอคำตอบ</h3>
        <p style="color:var(--muted);font-size:var(--t-sub);margin-bottom:var(--s4)">ส่งคำถามมาที่ทีมงาน เราตอบภายใน 2 วันทำการ</p>
        <a class="btn btn-accent" href="#">${ic('mail', 'sm')} ติดต่อเรา</a></div>
    </div>${footer()}</main>${bottomNav('')}`,
  }));

  /* G4–G6 หน้ากฎหมาย (เทมเพลตเดียว) */
  const legal = (title, icon, sections) => page({
    title,
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <nav class="crumbs"><a href="#">หน้าแรก</a><span>›</span><a href="#">ข้อกำหนด</a><span>›</span><span>${title}</span></nav>
      <div class="page-head"><h1>${ic(icon, 'sm')} ${title}</h1><p>ปรับปรุงล่าสุด 23 ตุลาคม 2569</p></div>
      <div class="with-side">
        <div class="side-filter"><div class="toc" style="position:sticky;top:76px">
          <div style="font-size:var(--t-meta);color:var(--dim);margin-bottom:6px">สารบัญ</div>
          ${sections.map((s, i) => `<a href="#">${i + 1}. ${s[0]}</a>`).join('')}</div></div>
        <div class="main"><div class="prose">
          ${sections.map((s, i) => `<h2>${i + 1}. ${s[0]}</h2>${s[1].map(p => `<p>${p}</p>`).join('')}`).join('')}
          <div class="note-mock" style="margin-top:var(--s6)">${ic('info', 'sm')}
            <span><b>ข้อความตัวอย่าง</b> — เนื้อหาในหน้ากฎหมายชุดนี้เป็นตัวอย่างสำหรับการนำเสนอแบบเท่านั้น ต้องให้ฝ่ายกฎหมายตรวจก่อนใช้งานจริง</span></div>
        </div></div></div>
    </div>${footer()}</main>${bottomNav('')}`,
  });
  write('legal-terms.html', legal('ข้อตกลงการใช้บริการ', 'file', [
    ['การยอมรับข้อตกลง', ['การเข้าใช้ AiLakorn ถือว่าคุณยอมรับข้อตกลงฉบับนี้ หากไม่ยอมรับ กรุณาหยุดใช้บริการ']],
    ['การใช้งานโดยไม่ต้องลงทะเบียน', ['บริการนี้เปิดให้ดูได้ทุกตอนโดยไม่ต้องลงทะเบียนและไม่มีค่าใช้จ่าย เราไม่มีระบบบัญชีผู้ใช้ ความคืบหน้าการดูจึงผูกกับเบราว์เซอร์ที่คุณใช้']],
    ['เนื้อหาและลิขสิทธิ์', ['เนื้อหาทั้งหมดรวมถึงปกและบทที่สร้างด้วย AI เป็นของ AiLakorn ห้ามทำซ้ำหรือเผยแพร่ต่อโดยไม่ได้รับอนุญาต']],
    ['การใช้งานที่ห้าม', ['ห้ามดาวน์โหลด บันทึกหน้าจอเพื่อเผยแพร่ต่อ หรือใช้เครื่องมืออัตโนมัติดึงเนื้อหา']],
    ['การเปลี่ยนแปลงข้อตกลง', ['เราอาจปรับปรุงข้อตกลงนี้ และจะแจ้งให้ทราบผ่านหน้านี้อย่างน้อย 7 วันก่อนมีผล']],
  ]));
  write('legal-privacy.html', legal('นโยบายความเป็นส่วนตัว', 'shield', [
    ['เราไม่มีบัญชีผู้ใช้', ['AiLakorn ไม่มีระบบสมัครสมาชิกหรือเข้าสู่ระบบ เราจึงไม่เก็บชื่อ เบอร์มือถือ อีเมล หรือวิธีการชำระเงินของคุณเลย เพราะไม่มีขั้นตอนไหนที่ต้องใช้']],
    ['ข้อมูลที่มี อยู่ในเครื่องของคุณ', ['ประวัติการดู รายการติดตาม แนวที่เลือกไว้ และการตั้งค่า ถูกเก็บใน localStorage ของเบราว์เซอร์คุณเท่านั้น ไม่ถูกส่งมาที่เซิร์ฟเวอร์ของเรา และไม่ซิงก์ข้ามเครื่อง']],
    ['ผลที่ตามมาที่คุณควรรู้', ['เพราะข้อมูลอยู่ในเครื่อง ถ้าคุณล้างข้อมูลเบราว์เซอร์ เปลี่ยนเครื่อง หรือใช้โหมดส่วนตัว คลังของคุณจะหายและกู้คืนไม่ได้ — เราไม่มีสำเนาไว้ให้']],
    ['การลบข้อมูล', ['คุณลบได้เองทั้งหมดที่หน้าตั้งค่า โดยไม่ต้องติดต่อเรา และไม่ต้องรอการอนุมัติ']],
    ['การเปิดเผยต่อบุคคลที่สาม', ['เราไม่ขายข้อมูลส่วนบุคคล และในเวอร์ชันนี้ไม่มีสคริปต์วิเคราะห์หรือโฆษณาจากบุคคลที่สาม']],
  ]));
  write('legal-cookies.html', legal('นโยบายคุกกี้', 'cookie', [
    ['คุกกี้คืออะไร', ['ไฟล์ข้อมูลเล็ก ๆ ที่เบราว์เซอร์เก็บไว้เพื่อให้เว็บจำการตั้งค่าของคุณได้']],
    ['คุกกี้ที่เราใช้', ['เฉพาะคุกกี้ที่จำเป็นต่อการจำการตั้งค่าการเล่นของคุณ — ไม่มีคุกกี้สำหรับระบุตัวตนหรือการล็อกอิน เพราะเว็บนี้ไม่มีบัญชีผู้ใช้']],
    ['คุกกี้วิเคราะห์', ['ในเวอร์ชันนี้ยังไม่มีการใช้คุกกี้วิเคราะห์หรือโฆษณาจากบุคคลที่สาม']],
    ['การจัดการคุกกี้', ['คุณปิดคุกกี้ได้จากการตั้งค่าเบราว์เซอร์ แต่บางฟีเจอร์เช่นการจำตอนที่ดูค้างจะไม่ทำงาน']],
  ]));

  /* G7 เบื้องหลัง AI */
  write('behind-the-ai.html', page({
    title: 'เบื้องหลังการสร้างด้วย AI',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>${ic('sparkle', 'sm')} เบื้องหลังการสร้างด้วย AI</h1>
        <p>ปกทั้ง 12 ใบของเราสร้างด้วย AI จาก prompt ภาษาไทย–อังกฤษที่ทีมเขียนเอง นี่คือของจริงทุกบรรทัด</p></div>
      <div class="bento" style="margin-bottom:var(--s6)">
        ${[['เขียนโครงเรื่องแบบไทย', 'ทีมคนไทยวางพล็อต แก้แค้น ซ่อนตัวตน ข้ามภพ ให้จบใน 3 นาทีต่อตอน'],
           ['สร้างปกด้วย AI', 'เขียน prompt ระบุแสง มุมกล้อง และอารมณ์ แล้วคัดจากหลายร้อยภาพเหลือใบเดียว']]
          .map(([h, p]) => `<div class="btile" style="min-height:0"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
      <section class="sec" style="margin-top:0"><div class="sec-h"><h2>ปกทั้ง 12 ใบ + prompt ที่ใช้</h2></div>
        <p class="sec-sub">แตะที่ปกเพื่อดู prompt เต็มที่ใช้สร้างภาพนั้น</p>
        <div class="grid" style="grid-template-columns:repeat(2,1fr)">
          ${D.series.map(s => `<a class="card" href="#">
            ${poster(s, { badges: ['<span class="tag tag-ai">AI</span>'], showViews: false })}
            <div class="t">${esc(s.title)}</div>
            <div class="m">ดู prompt ที่ใช้ ${ic('right', 'sm')}</div></a>`).join('')}</div></section>
      <div class="note-mock" style="margin-top:var(--s6)">${ic('sparkle', 'sm')}
        <span><b>ทุกภาพในเว็บนี้สร้างด้วย AI</b> ไม่มีการใช้ภาพถ่ายของบุคคลจริง และตัวละครทุกตัวเป็นตัวละครสมมติ</span></div>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}
