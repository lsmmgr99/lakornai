/* หน้ากลุ่ม D (บัญชีและเงิน — UI-only mock), E (onboarding), F (สถานะระบบ), G (คอนเทนต์/กฎหมาย) */
import {
  D, genreLabel, cover, ic, esc, TROPES, FREE_EPS, COIN_PER_EP, BALANCE,
  header, bottomNav, footer, page, write, card, epRow,
  mockBar, sampleNote, empty, errorBox, skelCard, skelRow, poster,
} from './lib.mjs';

const S = Object.fromEntries(D.series.map(s => [s.slug, s]));
const nf = n => n.toLocaleString('en-US');

function dpage({ title, back, body, guest = false, nav = 'account', cta = null }) {
  return page({
    title,
    body: `${header({ back, guest, active: nav })}
      <main id="main" class="page">${body}</main>
      ${cta ? `<div class="sticky-cta">${cta}</div>` : ''}
      ${bottomNav(nav, { notif: !guest })}`,
  });
}

/* ===================== D1 เข้าสู่ระบบ ===================== */
function loginBody({ bad = false, busy = false } = {}) {
  return `<div class="wrap"><div class="auth-card">
    <div style="text-align:center;margin-bottom:var(--s6)">
      <span style="display:inline-flex;align-items:center;gap:7px;margin-bottom:var(--s4)">
        <b style="font-family:var(--display);font-weight:600;font-size:28px" lang="en">Lakorn</b>
        <i style="font-style:normal;font-family:var(--display);font-weight:600;font-size:15px;padding:5px 8px;border-radius:8px;
          background:linear-gradient(160deg,var(--vip-1),var(--vip-2) 55%,var(--vip-3));color:var(--on-accent)" lang="en">AI</i></span>
      <h1 style="font-size:var(--t-h1);font-weight:600;line-height:var(--lh-h1)">ดูฟรีได้เลย</h1>
      <p style="color:var(--muted);margin-top:8px;font-size:var(--t-sub);line-height:var(--lh-sub)">
        เข้าสู่ระบบเมื่อต้องการปลดล็อกตอน 11 ขึ้นไป<br>และซิงก์เรื่องที่ดูค้างข้ามเครื่อง</p>
    </div>
    <label class="field${bad ? ' bad' : ''}"><span>เบอร์มือถือ</span>
      <span class="pre"><span class="cc">+66</span>
        <input type="tel" inputmode="numeric" value="${bad ? '08123' : '081 234 5678'}" aria-describedby="ph-h"
          ${bad ? 'aria-invalid="true"' : ''}></span>
      ${bad
        ? `<span class="err">${ic('alert', 'sm')} เบอร์มือถือไม่ถูกต้อง ต้องมี 10 หลัก</span>`
        : `<span class="help" id="ph-h">เราจะส่งรหัส 6 หลักไปที่เบอร์นี้ ไม่มีการตั้งรหัสผ่าน</span>`}</label>
    <button class="btn btn-accent btn-block"${busy ? ' disabled' : ''}>
      ${busy ? '<span class="spin"></span> กำลังส่งรหัส…' : 'ขอรหัส OTP'}</button>
    <div style="display:flex;align-items:center;gap:var(--s3);margin:var(--s5) 0;color:var(--dim);font-size:var(--t-meta)">
      <span style="flex:1;height:1px;background:var(--line-2)"></span>หรือ<span style="flex:1;height:1px;background:var(--line-2)"></span></div>
    <div style="display:grid;gap:var(--s3)">
      <button class="btn btn-ghost btn-block">${ic('mail', 'sm')} ดำเนินการต่อด้วย Google</button>
      <button class="btn btn-ghost btn-block">${ic('phone', 'sm')} ดำเนินการต่อด้วย LINE</button></div>
    <p style="margin-top:var(--s5);color:var(--dim);font-size:var(--t-meta);line-height:1.6;text-align:center">
      การเข้าสู่ระบบถือว่าคุณยอมรับ <a href="#" style="color:var(--accent)">ข้อตกลงการใช้</a>
      และ <a href="#" style="color:var(--accent)">นโยบายความเป็นส่วนตัว</a></p>
    <div style="margin-top:var(--s5)">${mockBar('ปุ่มทุกปุ่มในหน้านี้เป็นตัวอย่าง ไม่มีการส่ง SMS จริง')}</div>
  </div></div>`;
}

export function buildLogin() {
  write('login.html', dpage({ title: 'เข้าสู่ระบบ', back: 'เข้าสู่ระบบ', guest: true, body: loginBody() }));
  write('login-error.html', dpage({ title: 'เข้าสู่ระบบ — เบอร์ไม่ถูกต้อง', back: 'เข้าสู่ระบบ', guest: true, body: loginBody({ bad: true }) }));
  write('login-busy.html', dpage({ title: 'เข้าสู่ระบบ — กำลังส่ง OTP', back: 'เข้าสู่ระบบ', guest: true, body: loginBody({ busy: true }) }));
}

/* ===================== D2 OTP ===================== */
function otpBody({ bad = false, busy = false } = {}) {
  const digits = bad ? ['9', '1', '4', '7', '2', '2'] : ['4', '8', '1', '', '', ''];
  return `<div class="wrap"><div class="auth-card">
    <h1 style="font-size:var(--t-h1);font-weight:600;text-align:center">ใส่รหัส 6 หลัก</h1>
    <p style="color:var(--muted);text-align:center;margin-top:8px;font-size:var(--t-sub)">
      ส่งรหัสไปที่ <b class="num" style="color:var(--fg)">08x-xxx-5678</b></p>
    <div class="otp${bad ? ' bad' : ''}" style="margin:var(--s6) 0" role="group" aria-label="รหัสยืนยัน 6 หลัก">
      ${digits.map((d, i) => `<i class="${d ? 'on' : ''}${!bad && i === 3 ? ' caret' : ''}" class="num">${d || ''}</i>`).join('')}</div>
    ${bad ? `<p class="err" style="justify-content:center;display:flex;align-items:center;gap:6px;color:var(--danger);
        font-size:var(--t-sub);margin-bottom:var(--s4)">${ic('alert', 'sm')} รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง</p>` : ''}
    <button class="btn btn-accent btn-block"${busy ? ' disabled' : ''}>
      ${busy ? '<span class="spin"></span> กำลังตรวจสอบ…' : 'ยืนยัน'}</button>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--s4)">
      <button class="btn btn-link">แก้เบอร์มือถือ</button>
      <span style="color:var(--dim);font-size:var(--t-sub)" class="num">ขอรหัสใหม่ใน 0:45</span></div>
    <div style="margin-top:var(--s6)">${mockBar('ในตัวอย่างนี้ใส่เลขอะไรก็ผ่าน')}</div>
  </div></div>`;
}

export function buildOtp() {
  write('otp.html', dpage({ title: 'ยืนยัน OTP', back: 'ยืนยันเบอร์มือถือ', guest: true, body: otpBody() }));
  write('otp-error.html', dpage({ title: 'ยืนยัน OTP — รหัสผิด', back: 'ยืนยันเบอร์มือถือ', guest: true, body: otpBody({ bad: true }) }));
  write('otp-busy.html', dpage({ title: 'ยืนยัน OTP — กำลังตรวจสอบ', back: 'ยืนยันเบอร์มือถือ', guest: true, body: otpBody({ busy: true }) }));
}

/* ===================== D3 โปรไฟล์ / บัญชี ===================== */
export function buildAccount() {
  const links = [
    ['star', 'แพ็กเกจสมาชิก', 'VIP รายเดือน · ต่ออายุ 20 พ.ย. 2569'],
    ['wallet', 'กระเป๋าเหรียญ', `คงเหลือ ${nf(BALANCE)} เหรียญ`],
    ['gift', 'รับเหรียญฟรี', 'เช็กอินวันนี้แล้ว · ภารกิจเหลือ 2 ข้อ'],
    ['bell', 'การแจ้งเตือน', 'ยังไม่อ่าน 3 รายการ'],
    ['settings', 'ตั้งค่า', 'การเล่น ซับ คุณภาพ'],
    ['help', 'ช่วยเหลือ', 'คำถามที่พบบ่อย'],
    ['logout', 'ออกจากระบบ', null],
  ];
  write('account.html', dpage({
    title: 'บัญชีของฉัน', back: null,
    body: `<div class="wrap">
      <div class="page-head"><h1>บัญชี</h1></div>
      <div class="panel" style="display:flex;align-items:center;gap:var(--s4)">
        <span class="avatar" style="width:60px;height:60px;font-size:24px">ก</span>
        <div style="flex:1;min-width:0"><b style="font-size:var(--t-body);font-weight:600">คุณกานต์</b>
          <div class="num" style="color:var(--muted);font-size:var(--t-sub);margin-top:2px">08x-xxx-5678</div></div>
        <span class="tag tag-vip">${ic('star', 'sm')} VIP</span></div>
      <div class="panel" style="display:grid;gap:var(--s3)">
        <div style="display:flex;align-items:center;gap:var(--s3)">
          <span style="color:var(--accent)">${ic('coin')}</span>
          <div style="flex:1"><b class="num" style="font-family:var(--display);font-size:24px;font-weight:600">${nf(BALANCE)}</b>
            <span style="color:var(--muted);font-size:var(--t-sub)"> เหรียญ</span></div>
          <a class="btn btn-accent btn-md" href="#">เติมเหรียญ</a></div>
        <div style="height:1px;background:var(--line)"></div>
        <div style="display:flex;align-items:center;gap:var(--s3)">
          <span style="color:var(--accent)">${ic('star')}</span>
          <div style="flex:1"><b style="font-weight:600">VIP รายเดือน</b>
            <div style="color:var(--muted);font-size:var(--t-meta);margin-top:2px">ใช้ได้ถึง 20 พ.ย. 2569</div></div>
          <a class="btn btn-ghost btn-md" href="#">จัดการ</a></div></div>
      <div class="rowlist" style="margin-top:var(--s4)">${links.map(([i, t, s]) =>
        `<a href="#"><span class="ic">${ic(i)}</span><span>${t}${s ? `<span class="sub">${s}</span>` : ''}</span>
          <span class="ch">${ic('right', 'sm')}</span></a>`).join('')}</div>
      <div style="margin-top:var(--s4)">${mockBar()}</div>
      <div style="margin-top:var(--s4);display:grid;place-items:center">
        <button class="btn btn-ghost btn-md">${ic('refresh', 'sm')} รีเซ็ตสถานะตัวอย่าง</button></div>
    </div>${footer()}`,
  }));

  write('account-guest.html', dpage({
    title: 'บัญชี — ยังไม่ล็อกอิน', guest: true,
    body: `<div class="wrap">
      <div class="page-head"><h1>บัญชี</h1></div>
      <div class="panel" style="text-align:center;padding:var(--s7) var(--s5)">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-soft);border:1px solid var(--accent-line);
          display:grid;place-items:center;color:var(--accent);margin:0 auto var(--s4)">${ic('user', 'lg')}</div>
        <h2 style="font-size:var(--t-h2);font-weight:600">ยังไม่ได้เข้าสู่ระบบ</h2>
        <p style="color:var(--muted);font-size:var(--t-sub);line-height:var(--lh-sub);margin-top:8px;max-width:34ch;margin-inline:auto">
          ดูฟรีได้ 10 ตอนแรกของทุกเรื่องโดยไม่ต้องสมัคร — เข้าสู่ระบบเมื่อต้องการปลดล็อกตอนต่อไป</p>
        <div class="btn-row" style="justify-content:center;margin-top:var(--s5)">
          <a class="btn btn-accent" href="#">เข้าสู่ระบบ / สมัคร</a></div></div>
      <div class="rowlist" style="margin-top:var(--s4)">
        ${[['star', 'ดูแพ็กเกจสมาชิก'], ['wallet', 'ดูราคาแพ็กเหรียญ'], ['settings', 'ตั้งค่า (เก็บในเครื่อง)'], ['help', 'ช่วยเหลือ']]
          .map(([i, t]) => `<a href="#"><span class="ic">${ic(i)}</span><span>${t}</span><span class="ch">${ic('right', 'sm')}</span></a>`).join('')}</div>
      <div style="margin-top:var(--s4)">${mockBar()}</div>
    </div>${footer()}`,
  }));
}

/* ===================== D4 กระเป๋าเหรียญ ===================== */
export function buildWallet() {
  const tx = [
    ['23 ต.ค. 2569 · 20:14', 'ปลดล็อก EP.12 · ประธานเย็นชากับเลขาตัวแสบ', -15],
    ['23 ต.ค. 2569 · 09:02', 'เช็กอินวันที่ 4', +20],
    ['22 ต.ค. 2569 · 21:40', 'ปลดล็อก EP.11 · ประธานเย็นชากับเลขาตัวแสบ', -15],
    ['21 ต.ค. 2569 · 18:25', 'เติมเหรียญ แพ็ก 300 เหรียญ', +300],
    ['20 ต.ค. 2569 · 12:10', 'ดูโฆษณาแลกเหรียญ', +10],
  ];
  const body = isEmpty => `<div class="wrap">
    <div class="page-head"><h1>กระเป๋าเหรียญ</h1></div>
    ${mockBar()}
    <div class="panel" style="margin-top:var(--s4);text-align:center">
      <div style="color:var(--muted);font-size:var(--t-sub)">ยอดคงเหลือ</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px">
        <span style="color:var(--accent)">${ic('coin', 'lg')}</span>
        <b class="num" style="font-family:var(--display);font-size:44px;font-weight:600;line-height:1">${isEmpty ? 0 : nf(BALANCE)}</b></div>
      <div class="btn-row" style="justify-content:center;margin-top:var(--s5)">
        <a class="btn btn-accent" href="#">${ic('plus', 'sm')} เติมเหรียญ</a>
        <a class="btn btn-ghost" href="#">${ic('gift', 'sm')} รับฟรี</a></div></div>
    <section class="sec"><div class="sec-h"><h2>ประวัติการใช้</h2></div>
      ${isEmpty
        ? empty('wallet', 'ยังไม่มีประวัติการใช้', 'เมื่อคุณเติมเหรียญหรือปลดล็อกตอน รายการจะมาแสดงตรงนี้', 'เติมเหรียญครั้งแรก')
        : `<div class="rowlist">${tx.map(([d, t, n]) => `<div class="r">
            <span style="flex:1;min-width:0"><span style="font-size:var(--t-sub)">${t}</span>
              <span class="sub num">${d}</span></span>
            <b class="num" style="color:${n > 0 ? 'var(--free)' : 'var(--fg-2)'};font-weight:600;flex:none">${n > 0 ? '+' : ''}${n}</b></div>`).join('')}</div>`}
    </section>
    ${sampleNote('ยอดเหรียญและทุกรายการเป็นข้อมูลตัวอย่าง ไม่มีการตัดเงินจริง')}
  </div>${footer()}`;
  write('wallet.html', dpage({ title: 'กระเป๋าเหรียญ', back: 'กระเป๋าเหรียญ', body: body(false) }));
  write('wallet-empty.html', dpage({ title: 'กระเป๋าเหรียญ — ยังไม่มีประวัติ', back: 'กระเป๋าเหรียญ', body: body(true) }));
}

/* ===================== D5 เติมเหรียญ ===================== */
export function buildTopup() {
  const packs = [[100, 9, 0], [300, 19, 0, 'ยอดนิยม'], [800, 49, 80], [2000, 119, 400]];
  write('topup.html', dpage({
    title: 'เติมเหรียญ', back: 'เติมเหรียญ',
    cta: `<a class="btn btn-accent btn-block" href="#">เติม 300 เหรียญ · ฿19 (ตัวอย่าง)</a>`,
    body: `<div class="wrap">
      <div class="page-head"><h1>เติมเหรียญ</h1><p>1 ตอน = ${COIN_PER_EP} เหรียญ · เหรียญไม่มีวันหมดอายุ</p></div>
      ${mockBar()}
      <div class="panel" style="margin-top:var(--s4);display:flex;align-items:center;gap:var(--s3)">
        <span style="color:var(--accent)">${ic('coin')}</span>
        <span style="color:var(--muted)">คงเหลือตอนนี้</span>
        <b class="num" style="margin-left:auto;font-size:var(--t-h2);font-family:var(--display);font-weight:600">${nf(BALANCE)}</b></div>
      <section class="sec"><div class="sec-h"><h2>เลือกแพ็ก</h2></div>
        <div class="packs">${packs.map(([c, p, bonus, tagx], i) => `<button class="pack${i === 1 ? ' on' : ''}">
          ${tagx ? `<span class="tagx">${tagx}</span>` : ''}
          <span class="c" aria-hidden="true">฿</span>
          <b class="num">${nf(c)}</b>
          <span style="font-size:var(--t-meta);color:var(--muted)">เหรียญ</span>
          ${bonus ? `<span class="bonus num">+${bonus} โบนัส</span>` : ''}
          <div class="price num">฿${p}</div></button>`).join('')}</div>
        ${sampleNote('ราคาและจำนวนเหรียญเป็นตัวเลขตัวอย่างจากสเปก UX (AIO-16 §1.5) ยังไม่ผ่านการยืนยันจากฝ่ายราคา')}</section>
      <section class="sec"><div class="sec-h"><h2>คุ้มกว่าถ้าสมัคร VIP</h2></div>
        <a class="ep-row" href="#" style="padding:var(--s4)">
          <span style="width:46px;height:46px;border-radius:12px;background:linear-gradient(160deg,var(--vip-1),var(--vip-3));
            display:grid;place-items:center;color:var(--on-accent);flex:none">${ic('star')}</span>
          <span class="bd"><span class="h"><b style="font-size:var(--t-body)">VIP ฿39/เดือน ดูไม่อั้นทุกเรื่อง</b></span>
            <span class="st">เทียบกับการปลดล็อกทีละตอน ${COIN_PER_EP} เหรียญ · คุ้มกว่าตั้งแต่ตอนที่ 13</span></span>
          <span class="r">${ic('right', 'sm')}</span></a></section>
    </div>${footer()}`,
  }));
}

/* ===================== D6 แพ็กเกจ VIP ===================== */
export function buildVip() {
  const plans = [
    ['รายวัน', 5, 'วัน', ['ดูไม่อั้น 24 ชั่วโมง', 'ไม่มีโฆษณา', 'ดูได้ทุกเรื่องในคลัง'], false],
    ['รายสัปดาห์', 19, 'สัปดาห์', ['ดูไม่อั้น 7 วัน', 'ไม่มีโฆษณา', 'ดาวน์โหลดดูออฟไลน์', '+100 เหรียญแถม'], false, 'ยอดนิยม'],
    ['รายเดือน', 39, 'เดือน', ['ดูไม่อั้น 30 วัน', 'ไม่มีโฆษณา', 'ดาวน์โหลดดูออฟไลน์', '+300 เหรียญแถม', 'ดูตอนใหม่ก่อนใคร 24 ชม.'], true, 'คุ้มที่สุด'],
  ];
  write('vip.html', dpage({
    title: 'แพ็กเกจสมาชิก VIP', back: 'แพ็กเกจสมาชิก',
    cta: `<a class="btn btn-accent btn-block" href="#">สมัคร VIP รายเดือน ฿39 (ตัวอย่าง)</a>`,
    body: `<div class="wrap">
      <div class="page-head"><h1>แพ็กเกจสมาชิก</h1><p>ดูได้ทุกเรื่อง ทุกตอน ไม่ต้องนับเหรียญ ยกเลิกได้ตลอดเวลา</p></div>
      ${mockBar()}
      <div class="vips" style="margin-top:var(--s5)">${plans.map(([name, price, per, feats, best, tagx]) => `
        <div class="vip${best ? ' best' : ''}">${tagx ? `<span class="tagx">${tagx}</span>` : ''}
          <div class="pl">${name}</div>
          <div class="pr num">฿${price}<small> / ${per}</small></div>
          <ul>${feats.map(f => `<li><span class="ic">${ic('check', 'sm')}</span><span>${f}</span></li>`).join('')}</ul>
          <button class="btn ${best ? 'btn-accent' : 'btn-ghost'} btn-block" style="margin-top:auto">สมัครแพ็กนี้</button></div>`).join('')}</div>
      ${sampleNote('ระดับราคา ฿5 / ฿19 / ฿39 เป็นตัวเลขตัวอย่างจากสเปก UX ยังไม่ผ่านการยืนยันจากฝ่ายราคา')}
      <section class="sec"><div class="sec-h"><h2>เทียบสิทธิ์</h2></div>
        <div class="panel"><div class="tbl"><table class="cmp">
          <thead><tr><th>สิทธิ์</th><th>ไม่สมัคร</th><th>เหรียญ</th><th>VIP</th></tr></thead>
          <tbody>
            <tr><td>ตอน 1–10 ทุกเรื่อง</td><td class="free-c">${ic('check', 'sm')}</td><td class="free-c">${ic('check', 'sm')}</td><td class="free-c">${ic('check', 'sm')}</td></tr>
            <tr><td>ตอน 11 ขึ้นไป</td><td style="color:var(--faint)">${ic('x', 'sm')}</td><td class="num">${COIN_PER_EP}/ตอน</td><td class="free-c">ไม่อั้น</td></tr>
            <tr><td>ฟีดแนวตั้ง</td><td class="free-c">${ic('check', 'sm')}</td><td class="free-c">${ic('check', 'sm')}</td><td class="free-c">${ic('check', 'sm')}</td></tr>
            <tr><td>โฆษณา</td><td>มี</td><td>มี</td><td class="free-c">ไม่มี</td></tr>
            <tr><td>ดูตอนใหม่ก่อนใคร</td><td style="color:var(--faint)">${ic('x', 'sm')}</td><td style="color:var(--faint)">${ic('x', 'sm')}</td><td class="free-c">24 ชม.</td></tr>
          </tbody></table></div></div></section>
    </div>${footer()}`,
  }));
}

/* ===================== D7 ยืนยันการชำระ ===================== */
export function buildCheckout() {
  const methods = [['phone', 'พร้อมเพย์ / QR', 'สแกนจ่ายผ่านแอปธนาคาร', true],
    ['wallet', 'TrueMoney Wallet', 'ตัดจากกระเป๋าทรูมันนี่', false],
    ['card', 'บัตรเครดิต / เดบิต', 'Visa · Mastercard · JCB', false],
    ['phone', 'ตัดผ่านค่ายมือถือ', 'AIS · TrueMove H · dtac', false]];
  const body = busy => `<div class="wrap">
    <div class="page-head"><h1>ยืนยันการชำระ</h1></div>
    <div class="note-mock" style="border-style:solid;background:rgba(245,196,81,.13)">
      ${ic('alert', 'sm')}<span><b>นี่คือหน้าตัวอย่าง</b> — กดยืนยันแล้ว<b> ไม่มีการตัดเงินจริง</b> และไม่มีการส่งข้อมูลไปที่ผู้ให้บริการชำระเงินใด ๆ</span></div>
    <div class="panel" style="margin-top:var(--s4)">
      <h3 style="font-size:var(--t-body)">สรุปรายการ</h3>
      <div class="kv"><span class="k">แพ็กเกจ</span><span class="v">VIP รายเดือน · 30 วัน</span></div>
      <div class="kv"><span class="k">เหรียญแถม</span><span class="v num free-c">+300 เหรียญ</span></div>
      <div class="kv"><span class="k">เริ่มใช้ได้</span><span class="v">ทันทีหลังยืนยัน</span></div>
      <div class="kv"><span class="k">ยอดรวม</span><span class="v num" style="font-size:var(--t-h2);color:var(--accent);font-family:var(--display)">฿39</span></div></div>
    <section class="sec"><div class="sec-h"><h2>เลือกวิธีชำระเงิน</h2></div>
      <div class="rowlist">${methods.map(([i, t, s, on]) => `<div class="r" style="gap:var(--s4)">
        <span class="ic">${ic(i)}</span>
        <span style="flex:1">${t}<span class="sub">${s}</span></span>
        <span style="width:22px;height:22px;border-radius:50%;border:2px solid ${on ? 'var(--accent)' : 'var(--border-i)'};
          display:grid;place-items:center;flex:none">${on ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--accent)"></span>' : ''}</span>
      </div>`).join('')}</div></section>
    <div style="margin-top:var(--s5)">
      <button class="btn btn-accent btn-block"${busy ? ' disabled' : ''}>
        ${busy ? '<span class="spin"></span> กำลังดำเนินการ…' : 'ยืนยัน (ตัวอย่าง)'}</button>
      <p class="note-ex" style="margin-top:var(--s3);justify-content:center">${ic('shield', 'sm')}
        <span>ไม่มีการเก็บข้อมูลบัตรหรือข้อมูลการชำระเงินใด ๆ ในตัวอย่างนี้</span></p></div>
  </div>${footer()}`;
  write('checkout.html', dpage({ title: 'ยืนยันการชำระ (ตัวอย่าง)', back: 'ยืนยันการชำระ', body: body(false) }));
  write('checkout-busy.html', dpage({ title: 'ยืนยันการชำระ — กำลังดำเนินการ', back: 'ยืนยันการชำระ', body: body(true) }));
}

/* ===================== D8 ผลการชำระ ===================== */
export function buildResult() {
  const body = ok => `<div class="wrap"><div class="auth-card" style="text-align:center">
    <div style="width:88px;height:88px;border-radius:50%;margin:var(--s7) auto var(--s4);display:grid;place-items:center;
      background:${ok ? 'var(--free-soft)' : 'var(--danger-soft)'};border:1px solid ${ok ? 'var(--free-line)' : 'rgba(255,122,107,.4)'};
      color:${ok ? 'var(--free)' : 'var(--danger)'}">${ic(ok ? 'checkc' : 'xc', 'lg')}</div>
    <h1 style="font-size:var(--t-h1);font-weight:600">${ok ? 'สมัคร VIP สำเร็จ' : 'ชำระเงินไม่สำเร็จ'}</h1>
    <p style="color:var(--muted);margin-top:10px;font-size:var(--t-sub);line-height:var(--lh-sub)">
      ${ok ? 'คุณดูได้ทุกเรื่องทุกตอนแล้ว และได้รับเหรียญแถม 300 เหรียญ' : 'ยังไม่มีการตัดเงิน ลองใหม่อีกครั้งหรือเลือกวิธีชำระอื่น'}</p>
    <div class="panel" style="margin-top:var(--s5);text-align:left">
      <div class="kv"><span class="k">รายการ</span><span class="v">VIP รายเดือน</span></div>
      <div class="kv"><span class="k">ยอด</span><span class="v num">฿39</span></div>
      <div class="kv"><span class="k">สถานะ</span>
        <span class="v" style="color:${ok ? 'var(--free)' : 'var(--danger)'}">${ok ? 'สำเร็จ (ตัวอย่าง)' : 'ไม่สำเร็จ (ตัวอย่าง)'}</span></div>
      ${ok ? `<div class="kv"><span class="k">ใช้ได้ถึง</span><span class="v">22 พ.ย. 2569</span></div>` : ''}</div>
    <div style="display:grid;gap:var(--s3);margin-top:var(--s5)">
      <a class="btn btn-accent btn-block" href="#">${ok ? 'กลับไปดูต่อ EP.11' : 'ลองชำระใหม่'}</a>
      <a class="btn btn-ghost btn-block" href="#">${ok ? 'ดูกระเป๋าเหรียญ' : 'เลือกวิธีชำระอื่น'}</a></div>
    <div style="margin-top:var(--s5)">${mockBar()}</div>
  </div></div>${footer()}`;
  write('result-success.html', dpage({ title: 'ผลการชำระ — สำเร็จ', back: 'ผลการชำระ', body: body(true) }));
  write('result-fail.html', dpage({ title: 'ผลการชำระ — ไม่สำเร็จ', back: 'ผลการชำระ', body: body(false) }));
}

/* ===================== D9 รับเหรียญฟรี ===================== */
export function buildEarn() {
  const days = [['จ', 5, 'done'], ['อ', 5, 'done'], ['พ', 10, 'done'], ['พฤ', 20, 'today'], ['ศ', 10, ''], ['ส', 15, ''], ['อา', 50, '']];
  const tasks = [['feed', 'ดูคลิปในฟีด 5 คลิป', '+10 เหรียญ', '3/5'],
    ['heart', 'ติดตาม 1 เรื่องใหม่', '+5 เหรียญ', null],
    ['share', 'แชร์ 1 ตอนให้เพื่อน', '+5 เหรียญ', null],
    ['gift', 'ดูโฆษณา 1 คลิป', '+10 เหรียญ', 'ครบแล้ววันนี้']];
  const body = isEmpty => `<div class="wrap">
    <div class="page-head"><h1>รับเหรียญฟรี</h1><p>ทำภารกิจง่าย ๆ แลกเหรียญไว้ปลดล็อกตอน</p></div>
    ${mockBar()}
    <section class="sec"><div class="sec-h"><h2>เช็กอิน 7 วัน</h2>
      <span class="more num" style="color:var(--muted)">วันที่ 4</span></div>
      <div class="checkin">${days.map(([d, n, st]) => `<div class="${st}">
        <span>${d}</span><b class="num">+${n}</b>${st === 'done' ? `<span style="display:block;margin-top:3px">${ic('check', 'sm')}</span>` : ''}</div>`).join('')}</div>
      <button class="btn btn-accent btn-block" style="margin-top:var(--s4)">รับ 20 เหรียญของวันนี้</button></section>
    <section class="sec"><div class="sec-h"><h2>ภารกิจวันนี้</h2></div>
      ${isEmpty
        ? empty('checkc', 'ภารกิจวันนี้ทำครบแล้ว', 'กลับมาใหม่พรุ่งนี้ 00:00 น. จะมีภารกิจชุดใหม่และเช็กอินวันที่ 5', 'ไปดูต่อ')
        : `<div class="rowlist">${tasks.map(([i, t, r, prog]) => `<div class="r">
            <span class="ic">${ic(i)}</span>
            <span style="flex:1">${t}<span class="sub">${r}${prog && prog !== 'ครบแล้ววันนี้' ? ` · ${prog}` : ''}</span></span>
            ${prog === 'ครบแล้ววันนี้'
              ? `<span class="tag tag-free">${ic('check', 'sm')} ครบแล้ว</span>`
              : `<button class="btn btn-ghost btn-sm">ไปทำ</button>`}</div>`).join('')}</div>`}
    </section>
    <section class="sec"><div class="sec-h"><h2>ชวนเพื่อน</h2></div>
      <div class="panel">
        <p style="color:var(--muted);font-size:var(--t-sub);line-height:1.6">ได้ 100 เหรียญต่อเพื่อน 1 คนที่สมัครด้วยโค้ดของคุณ</p>
        <div style="display:flex;gap:var(--s3);align-items:center;margin-top:var(--s4)">
          <span style="flex:1;min-height:52px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);
            border:1px dashed var(--border-i);background:var(--surface-2);font-family:var(--display);font-size:21px;
            letter-spacing:2px;font-weight:600" lang="en">LAKORN-K7F2</span>
          <button class="btn btn-ghost btn-md">${ic('copy', 'sm')} คัดลอก</button></div></div></section>
    ${sampleNote('จำนวนเหรียญทุกตัวเลขเป็นค่าตัวอย่าง ยังไม่ผ่านการยืนยันจากฝ่ายรายได้')}
  </div>${footer()}`;
  write('earn.html', dpage({ title: 'รับเหรียญฟรี', back: 'รับเหรียญฟรี', body: body(false) }));
  write('earn-empty.html', dpage({ title: 'รับเหรียญฟรี — ทำครบแล้ว', back: 'รับเหรียญฟรี', body: body(true) }));
}

/* ===================== D10 ตั้งค่า ===================== */
export function buildSettings() {
  const row = (label, sub, ctrl) => `<div class="r"><span style="flex:1">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span>${ctrl}</div>`;
  write('settings.html', dpage({
    title: 'ตั้งค่า', back: 'ตั้งค่า',
    body: `<div class="wrap" style="max-width:720px">
      <div class="page-head"><h1>ตั้งค่า</h1></div>
      <section class="sec" style="margin-top:var(--s2)"><div class="sec-h"><h2>การเล่น</h2></div>
        <div class="rowlist">
          ${row('เล่นตอนถัดไปอัตโนมัติ', 'เมื่อดูจบตอน', '<span class="switch on"></span>')}
          ${row('เล่นพรีวิวอัตโนมัติ', 'ปิดเสียงเสมอ', '<span class="switch on"></span>')}
          ${row('คุณภาพวิดีโอ', 'อัตโนมัติตามความเร็วเน็ต', `<span style="color:var(--muted);font-size:var(--t-sub)">อัตโนมัติ ${ic('right', 'sm')}</span>`)}
          ${row('ขนาดตัวอักษรซับไตเติล', 'ใหญ่', `<span style="color:var(--muted);font-size:var(--t-sub)">ใหญ่ ${ic('right', 'sm')}</span>`)}
          ${row('เปิดซับไตเติลเสมอ', null, '<span class="switch on"></span>')}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>การแจ้งเตือน</h2></div>
        <div class="rowlist">
          ${row('ตอนใหม่ของเรื่องที่ติดตาม', null, '<span class="switch on"></span>')}
          ${row('เตือนเช็กอินรับเหรียญ', 'ทุกวัน 19:00 น.', '<span class="switch"></span>')}
          ${row('โปรโมชันและข่าวสาร', null, '<span class="switch"></span>')}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>ภาษา</h2></div>
        <div class="rowlist">
          ${row('ภาษาของเว็บไซต์', 'ตอนนี้มีเฉพาะภาษาไทย — โครงสร้าง URL เตรียมรองรับภาษาอื่นไว้แล้ว',
            `<span style="color:var(--faint);font-size:var(--t-sub)">ไทย</span>`)}
        </div></section>
      <section class="sec"><div class="sec-h"><h2>ข้อมูล</h2></div>
        <div class="rowlist">
          <a href="#"><span class="ic">${ic('trash')}</span><span>ล้างประวัติการดู<span class="sub">ลบเฉพาะในเครื่องนี้</span></span><span class="ch">${ic('right', 'sm')}</span></a>
          <a href="#"><span class="ic">${ic('refresh')}</span><span>รีเซ็ตสถานะตัวอย่าง<span class="sub">คืนค่าเหรียญ ตอนที่ปลดล็อก และความคืบหน้าทั้งหมด</span></span><span class="ch">${ic('right', 'sm')}</span></a>
        </div></section>
      <div style="margin-top:var(--s5)">${mockBar()}</div>
      <p style="text-align:center;color:var(--faint);font-size:var(--t-meta);margin-top:var(--s5)">LakornAI v2 · ม็อกอัพเสนอแบบ · 23 ต.ค. 2569</p>
    </div>${footer()}`,
  }));
}

/* ===================== D11 ศูนย์แจ้งเตือน ===================== */
export function buildNotifications() {
  const items = [
    ['durian-revenge', 'EP.24 ออกแล้ว', 'ทุเรียนทวงแค้น · ตอน “ข้อตกลงหนึ่งคืน”', '12 นาทีที่แล้ว', true],
    ['villainess-reborn', 'EP.13 ออกแล้ว', 'ข้ามภพมาเป็นนางร้าย · ตอน “หลักฐานชิ้นที่สอง”', '2 ชั่วโมงที่แล้ว', true],
    ['ayutthaya-love', 'EP.19 ออกแล้ว', 'ย้อนรอยรักกรุงศรี · ตอนนี้สำหรับสมาชิก', '5 ชั่วโมงที่แล้ว', true],
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
    body: `${header({ guest: true })}
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
        <p class="note-ex" style="justify-content:center;margin-top:var(--s4)">${ic('info', 'sm')}
          <span>ตัวเลือกนี้เก็บในเครื่องนี้เท่านั้น ยังไม่ต้องสมัครสมาชิก</span></p>
      </div></main>`,
  }));
  write('welcome-empty.html', page({
    title: 'เลือกแนวที่ชอบ — ยังไม่ได้เลือก',
    body: `${header({ guest: true })}
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
          background:linear-gradient(180deg,var(--vip-1),var(--vip-3));-webkit-background-clip:text;background-clip:text;color:transparent" lang="en">404</div>
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

/* ===================== G1–G8 ===================== */
export function buildContent() {
  /* G1 เกี่ยวกับเรา */
  write('about.html', page({
    title: 'เกี่ยวกับเรา',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>เกี่ยวกับ LakornAI</h1>
        <p>ละครสั้นแนวตั้งสัญชาติไทย ที่ปก บท และตัวละครทุกตัวสร้างด้วย AI</p></div>
      <div class="prose">
        <p>LakornAI เกิดจากคำถามเดียว — ถ้าคนไทยดูละครสั้นวันละ 20 นาทีระหว่างเดินทาง เราจะทำละครที่<strong>เริ่มจากศูนย์แล้วจบในหนึ่งคืน</strong>ได้ไหม</p>
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
    <label class="field"><span>หัวข้อ</span><select><option>ปัญหาการใช้งาน</option><option>เรื่องเหรียญและสมาชิก</option><option>ร่วมงานกับเรา</option></select></label>
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
    ['ตอนไหนดูฟรีบ้าง', 'ทุกเรื่องดูฟรี 10 ตอนแรก ไม่ต้องสมัครสมาชิก ตอนที่ 11 เป็นต้นไปใช้เหรียญหรือสมัคร VIP', true],
    ['เหรียญ 1 ตอนใช้กี่เหรียญ', `ตอนละ ${COIN_PER_EP} เหรียญ ปลดล็อกแล้วดูซ้ำได้ตลอด ไม่มีวันหมดอายุ`, false],
    ['VIP ต่างจากการซื้อเหรียญยังไง', 'VIP ดูได้ทุกเรื่องทุกตอนไม่อั้นตามระยะเวลาที่สมัคร ส่วนเหรียญเป็นการซื้อเฉพาะตอน', false],
    ['ยกเลิก VIP ได้ไหม', 'ได้ทุกเมื่อ สิทธิ์ยังใช้ได้จนครบรอบที่จ่ายไว้', false],
    ['ดูที่ค้างไว้หายไปทำไม', 'ความคืบหน้าเก็บในเครื่อง ถ้าล้างข้อมูลเบราว์เซอร์จะหาย เข้าสู่ระบบเพื่อซิงก์ข้ามเครื่อง', false],
    ['วิดีโอเล่นไม่ได้ ทำยังไง', 'ลองรีเฟรชหน้า เปลี่ยนคุณภาพเป็นอัตโนมัติ หรือเช็กการเชื่อมต่อ ถ้ายังไม่ได้แจ้งเราที่หน้าติดต่อ', false],
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
        <button class="chip" aria-pressed="false">เหรียญ</button>
        <button class="chip" aria-pressed="false">สมาชิก</button>
        <button class="chip" aria-pressed="false">บัญชี</button>
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

  /* G4–G7 หน้ากฎหมาย (เทมเพลตเดียว) */
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
    ['การยอมรับข้อตกลง', ['การเข้าใช้ LakornAI ถือว่าคุณยอมรับข้อตกลงฉบับนี้ หากไม่ยอมรับ กรุณาหยุดใช้บริการ']],
    ['บัญชีผู้ใช้', ['การสมัครใช้เบอร์มือถือและรหัส OTP คุณต้องรับผิดชอบการรักษาความปลอดภัยของเบอร์ที่ผูกกับบัญชี']],
    ['เนื้อหาและลิขสิทธิ์', ['เนื้อหาทั้งหมดรวมถึงปกและบทที่สร้างด้วย AI เป็นของ LakornAI ห้ามทำซ้ำหรือเผยแพร่ต่อโดยไม่ได้รับอนุญาต']],
    ['การใช้งานที่ห้าม', ['ห้ามดาวน์โหลด บันทึกหน้าจอเพื่อเผยแพร่ต่อ หรือใช้เครื่องมืออัตโนมัติดึงเนื้อหา']],
    ['การเปลี่ยนแปลงข้อตกลง', ['เราอาจปรับปรุงข้อตกลงนี้ และจะแจ้งให้ทราบผ่านหน้านี้อย่างน้อย 7 วันก่อนมีผล']],
  ]));
  write('legal-privacy.html', legal('นโยบายความเป็นส่วนตัว', 'shield', [
    ['ข้อมูลที่เราเก็บ', ['เบอร์มือถือสำหรับยืนยันตัวตน ประวัติการดู และการตั้งค่าในเครื่อง']],
    ['วิธีที่เราใช้ข้อมูล', ['เพื่อจำตอนที่ดูค้างไว้ แนะนำเรื่องที่ตรงใจ และแจ้งเตือนตอนใหม่ของเรื่องที่ติดตาม']],
    ['การเก็บในเครื่อง', ['ความคืบหน้าการดูและรายการติดตามเก็บใน localStorage ของเบราว์เซอร์คุณ ลบได้ที่หน้าตั้งค่า']],
    ['การเปิดเผยต่อบุคคลที่สาม', ['เราไม่ขายข้อมูลส่วนบุคคล และเปิดเผยเฉพาะเมื่อกฎหมายกำหนด']],
    ['สิทธิ์ของคุณ', ['ขอดู แก้ไข หรือลบข้อมูลของคุณได้ที่หน้าติดต่อ']],
  ]));
  write('legal-membership.html', legal('เงื่อนไขสมาชิกและเหรียญ', 'star', [
    ['ระบบเหรียญ', [`เหรียญใช้ปลดล็อกตอนที่ ${FREE_EPS + 1} ขึ้นไป ตอนละ ${COIN_PER_EP} เหรียญ ปลดล็อกแล้วดูซ้ำได้ไม่จำกัด`]],
    ['แพ็กเกจ VIP', ['VIP ให้สิทธิ์ดูทุกเรื่องทุกตอนตามระยะเวลาที่สมัคร และไม่มีโฆษณา']],
    ['การต่ออายุ', ['VIP ไม่ต่ออายุอัตโนมัติในเวอร์ชันนี้ คุณต้องสมัครใหม่เมื่อครบกำหนด']],
    ['การคืนเงิน', ['เหรียญที่ใช้ปลดล็อกแล้วไม่สามารถคืนได้ กรณีระบบขัดข้องติดต่อทีมงานภายใน 7 วัน']],
    ['การเปลี่ยนแปลงราคา', ['ราคาที่แสดงอาจเปลี่ยนแปลงได้ โดยจะไม่กระทบรอบที่ชำระไปแล้ว']],
  ]));
  write('legal-cookies.html', legal('นโยบายคุกกี้', 'cookie', [
    ['คุกกี้คืออะไร', ['ไฟล์ข้อมูลเล็ก ๆ ที่เบราว์เซอร์เก็บไว้เพื่อให้เว็บจำการตั้งค่าของคุณได้']],
    ['คุกกี้ที่เราใช้', ['คุกกี้จำเป็นสำหรับการเข้าสู่ระบบ และคุกกี้สำหรับจำการตั้งค่าการเล่น']],
    ['คุกกี้วิเคราะห์', ['ในเวอร์ชันนี้ยังไม่มีการใช้คุกกี้วิเคราะห์หรือโฆษณาจากบุคคลที่สาม']],
    ['การจัดการคุกกี้', ['คุณปิดคุกกี้ได้จากการตั้งค่าเบราว์เซอร์ แต่บางฟีเจอร์เช่นการจำตอนที่ดูค้างจะไม่ทำงาน']],
  ]));

  /* G8 เบื้องหลัง AI */
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
