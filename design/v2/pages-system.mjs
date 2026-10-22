/* Styleguide: token + component sheet (ใช้เป็นหน้าอ้างอิงของ Dev และเป็นภาพในเด็ค) */
import { D, ic, esc, header, bottomNav, footer, page, write, card, poster, epGrid, epTabs, legend, mockBar, FREE_EPS, COIN_PER_EP } from './lib.mjs';

const S = Object.fromEntries(D.series.map(s => [s.slug, s]));

const sw = (name, hex, note) => `<div class="sw">
  <div class="chip-c" style="background:${hex}"></div>
  <div class="meta"><b>${name}</b><code>${hex}</code><div style="color:var(--dim);margin-top:3px">${note}</div></div></div>`;

export function buildStyleguide() {
  write('styleguide.html', page({
    title: 'Design system — LakornAI v2',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
    <div class="page-head" style="padding-top:var(--s7)">
      <span style="display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-size:var(--t-meta);font-weight:600">
        ${ic('sparkle', 'sm')} LakornAI v2 · ม่านทอง (Golden Curtain)</span>
      <h1 style="margin-top:8px">ระบบดีไซน์ที่ dev เอาไปใช้ได้ตรง ๆ</h1>
      <p>ทุกค่าในหน้านี้อยู่ใน <code>design/v2/tokens.css</code> คัดลอกไปวางใน <code>:root</code> ของ <code>assets/style.css</code> ได้ทันทีหลังอนุมัติ</p></div>

    <section class="sg-sec"><h2>1. สี — พื้นผิว</h2>
      <p>เก็บแรมป์เดิมทั้งหมดเพราะ UX วัด contrast ไว้แล้ว (AIO-16 §7.1) เพิ่มแค่ <code>--surface-3</code> สำหรับชีต/โมดัล</p>
      <div class="sg-grid">
        ${sw('--bg', '#0E0D12', 'พื้นเวที')}
        ${sw('--surface', '#17151D', 'การ์ด/แผง ชั้น 1')}
        ${sw('--surface-2', '#1C1A23', 'input · chip · ช่องตอน')}
        ${sw('--surface-3', '#23212C', 'ใหม่ — ชีต/โมดัล')}
        ${sw('--nav', '#141219', 'แถบนำทาง')}
      </div></section>

    <section class="sg-sec"><h2>2. สี — สัญญาณ</h2>
      <p>ระบบสองแกน: <b style="color:var(--accent)">ทอง = ของที่ต้องจ่าย/แบรนด์/โฟกัส</b> และ
        <b class="free-c">มรกต = ของที่ได้ฟรี/สำเร็จ/ความคืบหน้า</b> — ทำให้เรื่อง paywall อ่านออกจากสีได้โดยไม่ต้องอ่านตัวอักษร</p>
      <div class="sg-grid">
        ${sw('--accent', '#F5C451', 'ทอง · 11.89:1 บน bg')}
        ${sw('--accent-hi', '#FFD877', 'hover · 14.14:1')}
        ${sw('--accent-press', '#DCAD3D', 'กด · 9.30:1')}
        ${sw('--free', '#4FD6A6', 'ฟรี/สำเร็จ · 10.60:1')}
        ${sw('--hot', '#FF6F91', 'ใหม่/มาแรง · 7.31:1')}
        ${sw('--danger', '#FF7A6B', 'ผิดพลาด · 7.60:1')}
        ${sw('--border-i', '#726E7D', 'ขอบ UI · 3.91 / 3.65 / 3.47 / 3.20 ✅ 1.4.11')}
        ${sw('--line-2', '#2A2733', 'เส้นคั่นตกแต่งเท่านั้น')}
      </div>
      <div class="panel" style="margin-top:var(--s5)">
        <h3>ค่า contrast ที่วัดแล้วของสีใหม่ (WCAG 2.1 relative luminance)</h3>
        <div class="tbl"><table class="cmp" style="margin-top:var(--s3)">
          <thead><tr><th>token</th><th>bg<br>#0E0D12</th><th>surface<br>#17151D</th><th>surface-2<br>#1C1A23</th><th>surface-3<br>#23212C</th><th>ผล</th></tr></thead>
          <tbody>
            <tr><td><code>--border-i</code> #726E7D</td><td class="num">3.91</td><td class="num">3.65</td><td class="num">3.47</td><td class="num">3.20</td><td class="free-c">ผ่าน 3:1 ทุกพื้น</td></tr>
            <tr><td><code>--free</code> #4FD6A6</td><td class="num">10.60</td><td class="num">9.90</td><td class="num">9.42</td><td class="num">8.68</td><td class="free-c">AAA</td></tr>
            <tr><td><code>--hot</code> #FF6F91</td><td class="num">7.31</td><td class="num">6.83</td><td class="num">6.50</td><td class="num">5.99</td><td class="free-c">AAA (ข้อความปกติ)</td></tr>
            <tr><td><code>--accent-hi</code> #FFD877</td><td class="num">14.14</td><td class="num">13.21</td><td class="num">12.56</td><td class="num">11.57</td><td class="free-c">AAA</td></tr>
            <tr><td><code>--accent-press</code> #DCAD3D</td><td class="num">9.30</td><td class="num">8.69</td><td class="num">8.26</td><td class="num">7.61</td><td class="free-c">AAA</td></tr>
            <tr><td>ทอง #F5C451 + ตัวอักษร #141217</td><td class="num" colspan="4">11.43</td><td class="free-c">ปุ่มหลักปลอดภัย</td></tr>
            <tr><td><code>--surface-3</code> #23212C บน bg</td><td class="num" colspan="4">1.32</td><td class="dim">พื้นผิว ไม่อยู่ใต้ 1.4.11</td></tr>
          </tbody></table></div>
        <p class="note-ex" style="margin-top:var(--s3)">${ic('info', 'sm')}
          <span><code>--faint</code> #6F6B7C (3.75:1) ใช้กับกราฟิกเท่านั้น — <b>ห้ามใช้กับข้อความ</b> ตามกฎใน UX §7.1</span></p></div>
    </section>

    <section class="sg-sec"><h2>3. ตัวอักษร</h2>
      <p>Kanit (500/600) สำหรับหัวเรื่องและตัวเลข · IBM Plex Sans Thai (400/500/600) สำหรับเนื้อหา —
        <b>ไม่เพิ่มน้ำหนักใหม่</b> จากที่เว็บโหลดอยู่แล้ว ค่าทั้งหมดบังคับตาม UX §7.2</p>
      <div class="panel">
        ${[['hero h2', '30 / 36px', 1.25, 'var(--display)', 'ประธานเย็นชากับเลขาตัวแสบ', 30],
           ['h1 หน้า', '24 / 30px', 1.3, 'var(--display)', 'ยอดนิยมสัปดาห์นี้', 24],
           ['h1 เรื่อง', '28px', 1.25, 'var(--display)', 'ข้ามภพมาเป็นนางร้าย', 28],
           ['h2 section', '20px', 1.35, 'var(--display)', 'ตอนใหม่ล่าสุด', 20],
           ['เนื้อหา (ฐาน)', '17px', 1.6, 'var(--body)', 'เลขาคนใหม่ทำกาแฟหกใส่ประธาน 3 วันติด แต่เขาไม่ไล่เธอออก', 17],
           ['เนื้อหารอง', '15px', 1.55, 'var(--body)', 'ละครแนวตั้ง · 60 ตอน · จบแล้ว · 12.4M วิว', 15],
           ['ป้าย/เมตา (เล็กสุด)', '13px', 1.5, 'var(--body)', 'ตอน 1–10 ดูฟรี · ตอน 11 ขึ้นไปสำหรับสมาชิก', 13]]
          .map(([role, size, lh, fam, sample, px]) => `<div class="kv" style="align-items:flex-start;gap:var(--s5)">
            <span class="k" style="flex:none;width:150px"><b style="display:block;color:var(--fg-2)">${role}</b>
              <span class="num">${size} · lh ${lh}</span></span>
            <span style="flex:1;font-family:${fam};font-size:${px}px;line-height:${lh};color:var(--fg)">${sample}</span></div>`).join('')}
        <p class="note-ex" style="margin-top:var(--s4)">${ic('alert', 'sm')}
          <span>ฐาน 15→17px และ lh 1.5→1.6 ทำให้บล็อกข้อความสูงขึ้นรวม ~20% — ทุกการ์ดในม็อกอัพเผื่อพื้นที่ใต้ปกไว้แล้ว</span></p>
        <p class="note-ex">${ic('alert', 'sm')}
          <span><code>letter-spacing</code> ของบล็อกไทยต้องเป็น 0 เสมอ · ที่ใช้ค่าลบได้มีที่เดียวคือโลโก้ “Lakorn” ซึ่งเป็นละตินล้วน</span></p>
      </div></section>

    <section class="sg-sec"><h2>4. ระยะ · มุมโค้ง · ความสูง</h2>
      <div style="display:grid;gap:var(--s5);grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="panel"><h3>ระยะ (4pt)</h3>
          ${[4, 8, 12, 16, 20, 24, 32, 40, 56, 72].map((n, i) => `<div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:7px">
            <code style="width:42px;color:var(--muted);font-size:13px">--s${i + 1}</code>
            <span style="height:12px;width:${n}px;background:var(--accent);border-radius:3px"></span>
            <span class="num" style="color:var(--dim);font-size:var(--t-meta)">${n}px</span></div>`).join('')}</div>
        <div class="panel"><h3>มุมโค้ง</h3>
          <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
            ${[['xs', 8], ['sm', 10], ['md', 14], ['lg', 20], ['xl', 28]].map(([k, n]) => `<div style="text-align:center">
              <div style="width:62px;height:62px;background:var(--surface-2);border:1px solid var(--border-i);border-radius:${n}px"></div>
              <code style="font-size:13px;color:var(--dim);display:block;margin-top:6px">${k} ${n}</code></div>`).join('')}</div>
          <h3 style="margin-top:var(--s5)">ความสูง (elevation)</h3>
          <div style="display:flex;gap:var(--s4);flex-wrap:wrap;margin-top:var(--s3)">
            ${[['e1', 'var(--e1)', 'การ์ด'], ['e2', 'var(--e2)', 'hover · hero'], ['e3', 'var(--e3)', 'ชีต/โมดัล']].map(([k, v, n]) => `
              <div style="text-align:center"><div style="width:84px;height:56px;background:var(--surface);border-radius:var(--r-md);box-shadow:${v}"></div>
              <code style="font-size:13px;color:var(--dim);display:block;margin-top:8px">${k} · ${n}</code></div>`).join('')}</div>
          <p class="note-ex" style="margin-top:var(--s4)">${ic('info', 'sm')}
            <span>ทุกระดับมีเส้นสว่าง 1px ด้านในขอบบน (<code>inset</code>) — เป็นสิ่งที่ทำให้การ์ดบนพื้นดำไม่ “จม”</span></p></div>
      </div></section>

    <section class="sg-sec"><h2>5. Motion</h2>
      <div class="panel">
        <div class="kv"><span class="k">ease มาตรฐาน</span><span class="v"><code>cubic-bezier(.2,.7,.2,1)</code></span></div>
        <div class="kv"><span class="k">hover / กดปุ่ม</span><span class="v num">120ms</span></div>
        <div class="kv"><span class="k">เปลี่ยนสถานะ · การ์ดยกตัว</span><span class="v num">180ms</span></div>
        <div class="kv"><span class="k">เปิด dropdown · toast</span><span class="v num">240ms</span></div>
        <div class="kv"><span class="k">ชีตเลื่อนขึ้น</span><span class="v num">280ms</span></div>
        <p class="note-ex" style="margin-top:var(--s3)">${ic('info', 'sm')}
          <span><code>prefers-reduced-motion: reduce</code> → ทุกค่าเหลือ 1ms, carousel ไม่เลื่อนเอง, skeleton ใช้ pulse ไม่ใช่ gradient วิ่ง, ชีตใช้ fade</span></p></div></section>

    <section class="sg-sec"><h2>6. สัดส่วนภาพ — กฎเหล็ก</h2>
      <div style="display:grid;gap:var(--s4);grid-template-columns:repeat(3,1fr);max-width:620px">
        <div><div style="aspect-ratio:2/3;border-radius:var(--r-md);overflow:hidden"><img src="../../assets/covers/ceo-cold.webp" alt="" style="width:100%;height:100%;object-fit:cover"></div>
          <div style="margin-top:8px"><b style="font-size:var(--t-sub)">2 : 3</b>
            <div style="color:var(--muted);font-size:var(--t-meta);line-height:1.5">ปกทุกที่ในเว็บ — ตรงกับไฟล์จริง 1024×1536 ไม่ต้องสร้างใหม่</div></div></div>
        <div><div style="aspect-ratio:9/16;border-radius:var(--r-md);overflow:hidden"><img src="../../assets/covers/durian-revenge.webp" alt="" style="width:100%;height:100%;object-fit:cover"></div>
          <div style="margin-top:8px"><b style="font-size:var(--t-sub)">9 : 16</b>
            <div style="color:var(--muted);font-size:var(--t-meta);line-height:1.5">เพลเยอร์และฟีดเท่านั้น — ห้ามใช้กับการ์ดในกริด</div></div></div>
        <div><div style="aspect-ratio:16/9;border-radius:var(--r-md);overflow:hidden"><img src="../../assets/covers/villainess-reborn.webp" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center 28%"></div>
          <div style="margin-top:8px"><b style="font-size:var(--t-sub)">16 : 9</b>
            <div style="color:var(--muted);font-size:var(--t-meta);line-height:1.5">การ์ด “ดูต่อ” เท่านั้น เพราะต้องมีที่ให้แถบความคืบหน้า</div></div></div>
      </div>
      <p class="note-ex" style="margin-top:var(--s4)">${ic('alert', 'sm')}
        <span>คลาส <code>.v916</code> ที่เว็บปัจจุบันใช้อยู่ 22 ไฟล์ ต้องถอดออกจากทุกที่ที่ไม่ใช่เพลเยอร์/ฟีด (UX §1.2 ก)</span></p></section>

    <section class="sg-sec"><h2>7. ปุ่ม — ทุกสถานะ (6.17)</h2>
      <div class="panel">
        <div class="sg-label">ขนาด lg 48px · md 44px · sm 36px</div>
        <div class="sg-row"><button class="btn btn-accent">ปุ่มหลัก</button>
          <button class="btn">ปุ่มรอง</button>
          <button class="btn btn-ghost">ghost</button>
          <button class="btn btn-danger">อันตราย</button>
          <button class="btn btn-link">ลิงก์ข้อความ</button></div>
        <div class="sg-label">hover · กด · โฟกัส · ปิดใช้งาน · กำลังโหลด</div>
        <div class="sg-row">
          <button class="btn btn-accent" style="background:linear-gradient(170deg,#FFE6A3,var(--accent-hi) 50%,var(--accent))">hover</button>
          <button class="btn btn-accent" style="transform:translateY(1px);background:var(--accent-press)">กด</button>
          <button class="btn btn-accent is-focus">โฟกัส</button>
          <button class="btn btn-accent is-disabled">ปิดใช้งาน</button>
          <button class="btn btn-accent"><span class="spin"></span> กำลังบันทึก…</button></div>
        <div class="sg-row"><button class="btn btn-ghost">ghost</button>
          <button class="btn btn-ghost" style="border-color:var(--border-i-hover);background:rgba(255,255,255,.03)">hover</button>
          <button class="btn btn-ghost is-focus">โฟกัส</button>
          <button class="btn btn-ghost" aria-pressed="true">${ic('heartf', 'sm')} ติดตามแล้ว</button>
          <button class="btn btn-ghost is-disabled">ปิดใช้งาน</button></div>
        <div class="sg-row"><button class="btn btn-md btn-accent">md 44</button><button class="btn btn-sm btn-ghost">sm 36</button>
          <span class="note-ex" style="align-self:center">sm ใช้ได้เฉพาะปุ่มที่ไม่ใช่ปุ่มหลัก และต้องมีพื้นที่แตะรอบรวม ≥44px</span></div>
      </div></section>

    <section class="sg-sec"><h2>8. chip (6.6) · ฟอร์ม (6.21) — รวมสถานะโฟกัส</h2>
      <div style="display:grid;gap:var(--s4);grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="panel"><h3>chip</h3>
          <div class="sg-row"><button class="chip">ปกติ</button>
            <button class="chip" style="border-color:var(--border-i-hover)">hover</button>
            <button class="chip is-focus">โฟกัส</button>
            <button class="chip" aria-pressed="true">เลือกแล้ว</button>
            <button class="chip" disabled>ปิดใช้งาน</button></div>
          <p class="note-ex" style="margin-top:var(--s3)">${ic('check', 'sm')}
            <span>ขอบ chip ใช้ <code>--border-i</code> 3.47:1 บน surface-2 — เดิม <code>--border</code> อยู่ที่ 1.65:1 ซึ่งตก 1.4.11</span></p></div>
        <div class="panel"><h3>ช่องกรอก</h3>
          <label class="field"><span>ปกติ</span><input value="081 234 5678"></label>
          <label class="field"><span>โฟกัส</span><input class="is-focus" value="081 234 5678"></label>
          <label class="field bad"><span>ผิดพลาด</span><input value="08123" aria-invalid="true">
            <span class="err">${ic('alert', 'sm')} เบอร์มือถือไม่ถูกต้อง ต้องมี 10 หลัก</span></label>
          <label class="field"><span>ช่อง OTP 6 หลัก</span>
            <span class="otp"><i class="on">4</i><i class="on">8</i><i class="on">1</i><i class="caret"></i><i></i><i></i></span></label></div>
      </div></section>

    <section class="sg-sec"><h2>9. ช่องตอน (6.9) — 4 สถานะ + โฟกัส</h2>
      <div class="panel">
        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;align-items:center">
          <a class="ep" style="width:64px" href="#"><span class="num">12</span></a>
          <a class="ep done" style="width:64px" href="#"><span class="num">9</span></a>
          <a class="ep cur" style="width:64px" href="#"><span class="num">12</span></a>
          <a class="ep lock" style="width:64px" href="#"><span class="num">14</span><span class="lk">${ic('lock')}</span></a>
          <a class="ep is-focus" style="width:64px" href="#"><span class="num">15</span></a>
          <span class="note-ex" style="align-self:center">ยังไม่ดู · ดูแล้ว · กำลังดู · ล็อก · โฟกัส</span></div>
        ${legend}
        <p class="note-ex" style="margin-top:var(--s3)">${ic('alert', 'sm')}
          <span>ของเดิมใช้จุด 6px บอกสถานะล็อก — เล็กเกินกว่าจะสื่อความ เปลี่ยนเป็นไอคอนกุญแจ + ขอบประ และทุกช่องมี
          <code>aria-label</code> เต็ม เช่น “ตอนที่ 14 ประตูที่ห้ามเปิด · ล็อก ต้องปลดล็อก”</span></p>
        <div style="margin-top:var(--s4)">${epTabs(S['ceo-cold'], 0)}${epGrid(S['ceo-cold'], { current: 12, watchedTo: 11, from: 1, to: 20 })}</div>
      </div></section>

    <section class="sg-sec"><h2>10. การ์ดปก (6.1) — ป้ายซ้อนทุกแบบ</h2>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);max-width:860px">
        ${card(S['durian-revenge'], { badges: ['<span class="tag tag-ai">AI</span>', '<span class="tag tag-new">ใหม่</span>'] })}
        ${card(S['ceo-cold'], { badges: ['<span class="tag tag-ai">AI</span>', '<span class="tag tag-done">จบแล้ว</span>'] })}
        ${card(S['villainess-reborn'], { badges: ['<span class="tag tag-free">ดูฟรี 10 ตอน</span>'], lock: true })}
        <a class="card is-hover" href="#">${poster(S['billion-widow'], { badges: ['<span class="tag tag-new">มาแรง</span>'] })}
          <div class="t">${esc(S['billion-widow'].title)}</div><div class="m">แก้แค้น · 50 ตอน</div>
          <div class="hook">${esc(S['billion-widow'].hook)}</div></a>
      </div>
      <p class="note-ex" style="margin-top:var(--s3)">${ic('info', 'sm')}
        <span>ใบขวาสุดคือสถานะ hover — ยกขึ้น 4px เผย hook 1–2 บรรทัด และขอบทอง · บนมือถือไม่มี hover
        จึงห้ามซ่อนข้อมูลสำคัญไว้ใน hover (UX 6.7)</span></p></section>

    <section class="sg-sec"><h2>11. แถบสิทธิ์ · แถบ mock (6.15)</h2>
      <div style="display:grid;gap:var(--s3);max-width:720px">
        <div class="perm"><span class="ic">${ic('unlock', 'sm')}</span>
          <span><b>ตอน 1–${FREE_EPS} ดูฟรี</b> · ตอน ${FREE_EPS + 1} ขึ้นไปสำหรับสมาชิก หรือปลดล็อกทีละตอน ${COIN_PER_EP} เหรียญ</span></div>
        ${mockBar()}
        <p class="note-ex">${ic('info', 'sm')}<span>ตัวเลขยอดวิว ราคา และยอดเหรียญทุกจุดในม็อกอัพเป็นตัวเลขตัวอย่าง</span></p></div>
      <p class="note-ex" style="margin-top:var(--s4)">${ic('alert', 'sm')}
        <span>แถบ mock เป็น<b>ข้อบังคับ</b>บนทุกหน้ากลุ่ม D (D1–D9) และบนชีต paywall B4</span></p></section>

    <section class="sg-sec"><h2>12. โฟกัสริงบนพื้นสว่าง</h2>
      <p>ปกบางใบสว่างมาก วงโฟกัสทองเดี่ยว ๆ จะจมหาย จึงใช้ <code>outline 2px</code> + <code>box-shadow 0 0 0 4px rgba(14,13,18,.65)</code> เป็นวงนอกสีเข้มเสมอ</p>
      <div style="display:flex;gap:var(--s4);flex-wrap:wrap">
        <a class="card is-focus" href="#" style="width:150px">${poster(S['mangosteen-heart'], { badges: [] })}
          <div class="t">${esc(S['mangosteen-heart'].title)}</div></a>
        <a class="card is-focus" href="#" style="width:150px">${poster(S['seedless-longan'], { badges: [] })}
          <div class="t">${esc(S['seedless-longan'].title)}</div></a></div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ---------- ดัชนีม็อกอัพทั้งหมด ---------- */
export function buildIndex(screens) {
  const rows = screens.map(s => `<tr>
    <td class="num">${s.id}</td>
    <td><a href="${s.file}" style="color:var(--accent)">${esc(s.name)}</a></td>
    <td>${s.state ? esc(s.state) : '<span class="dim">default</span>'}</td>
    <td class="num">${s.tier}</td>
    <td class="num">${s.shots.join('<br>')}</td></tr>`).join('');
  write('index.html', page({
    title: 'ดัชนีม็อกอัพ LakornAI v2',
    body: `${header({})}<main id="main" class="page"><div class="wrap">
      <div class="page-head" style="padding-top:var(--s7)">
        <h1>ม็อกอัพ LakornAI v2 — ดัชนีหน้าจอทั้งหมด</h1>
        <p>เสนอแบบรอบที่ 1 · AIO-17 · 23 ต.ค. 2569 — ไฟล์ทั้งหมดอยู่ใต้ <code>design/v2/</code> และไม่แตะไฟล์ production เลย</p></div>
      <div class="btn-row" style="margin-bottom:var(--s5)">
        <a class="btn btn-accent" href="styleguide.html">ดู design system</a>
        <a class="btn btn-ghost" href="home.html">เปิดหน้าแรก</a>
        <a class="btn btn-ghost" href="patterns.html">แพตเทิร์นกลาง</a></div>
      <div class="panel"><div class="tbl"><table class="cmp" style="min-width:680px">
        <thead><tr><th>ID</th><th>หน้าจอ</th><th>สถานะ</th><th>Tier</th><th>ภาพที่เรนเดอร์</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}
