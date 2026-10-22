/* หน้ากลุ่ม A (การค้นพบ) + B (เรื่องและการรับชม) + C (ไลบรารี) */
import {
  D, by, genreLabel, views, cover, ic, esc, TROPES, tropesOf, FREE_EPS, COIN_PER_EP, BALANCE,
  header, bottomNav, footer, page, write, poster, card, rankCard, contCard, epRow, epGrid, epTabs,
  legend, aiBadge, newBadge, hotBadge, doneBadge, mockBar, sampleNote, empty, errorBox,
  skelCard, skelCont, skelRow, releaseDay,
} from './lib.mjs';

const S = Object.fromEntries(D.series.map(s => [s.slug, s]));
const TOP10 = ['ceo-cold', 'durian-revenge', 'billion-widow', 'villainess-reborn', 'ayutthaya-love',
  'undercover-tycoon', 'heir-returns', 'mirror-bride', 'one-night-bangkok', 'mangosteen-heart'].map(k => S[k]);
const CONT = [['villainess-reborn', 12, 27], ['durian-revenge', 5, 62], ['ayutthaya-love', 21, 53], ['mirror-bride', 3, 18]];

/* ===================== A1 หน้าแรก ===================== */
function homeSections({ guest = false, emptyCont = false } = {}) {
  const hero = S['durian-revenge'];
  const contRail = emptyCont
    ? `<div class="rail-wrap"><div class="rail wide"><a class="cont" href="#" style="grid-column:span 1">
        <div class="thumb" style="display:grid;place-items:center;background:var(--surface);border:1px dashed var(--border-i)">
          <div style="text-align:center;padding:12px"><div style="color:var(--accent)">${ic('playf')}</div>
          <div style="font-size:var(--t-meta);color:var(--muted);margin-top:6px">ยังไม่มีเรื่องที่ดูค้าง</div></div></div>
        <div class="t">เริ่มจากฟีดแนวตั้ง</div><div class="m">ปัดดูทีละเรื่อง ไม่ต้องเลือก</div></a></div></div>`
    : `<div class="rail-wrap">
        <button class="rail-btn prev" aria-label="เลื่อนซ้าย" disabled>${ic('left')}</button>
        <button class="rail-btn next" aria-label="เลื่อนขวา">${ic('right')}</button>
        <div class="rail wide">${CONT.map(([k, e, p]) => contCard(S[k], e, p)).join('')}</div></div>`;

  return `
  ${guest ? `<div class="sec" style="margin-top:var(--s4)"><div class="perm">${ic('info', 'sm')}
      <span>ดูฟรีได้เลย 10 ตอนแรกของทุกเรื่อง — <b>เข้าสู่ระบบ</b>เมื่อต้องการปลดล็อกตอนต่อไปและซิงก์ข้ามเครื่อง</span>
      <a class="btn btn-accent btn-md" href="#" style="flex:none;margin-left:auto">เข้าสู่ระบบ</a></div></div>` : ''}

  <section class="sec" aria-label="เรื่องเด่น" style="margin-top:var(--s4)">
    <div class="hero"><div class="bg"><img src="${cover(hero)}" alt=""></div>
      <div class="body">
        <span class="kick">${ic('sparkle', 'sm')} เรื่องเด่นประจำสัปดาห์</span>
        <h2>${esc(hero.title)}</h2>
        <div class="facts"><span class="tag tag-ai">AI</span><b>${hero.eps} ตอน</b><span>·</span>
          <span>${hero.genres.map(genreLabel).join(' · ')}</span><span>·</span><span>${hero.status}</span></div>
        <p class="hk">${esc(hero.hook)}</p>
        <div class="btn-row">
          <a class="btn btn-accent" href="#">${ic('playf', 'sm')} ${guest ? 'เริ่มดู EP.1' : 'ดูต่อ EP.5'}</a>
          <button class="icon-btn" aria-label="ติดตาม">${ic('heart')}</button>
          <button class="icon-btn" aria-label="แชร์">${ic('share')}</button>
        </div>
      </div></div>
    <div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
  </section>

  ${guest ? '' : `<section class="sec"><div class="sec-h"><h2>ดูต่อจากที่ค้างไว้</h2>
    <a class="more" href="#">ทั้งหมด ${ic('right', 'sm')}</a></div>${contRail}</section>`}

  <section class="sec" aria-label="ฟีดแนวตั้ง">
    <div class="bento">
      <a class="btile feedtile" href="#">
        <span class="reelstrip" aria-hidden="true">
          <span><img src="${cover(S['ceo-cold'])}" alt=""></span>
          <span><img src="${cover(S['villainess-reborn'])}" alt=""></span>
          <span><img src="${cover(S['one-night-bangkok'])}" alt=""></span>
        </span>
        <h3>ฟีดแนวตั้ง</h3>
        <p>ปัดขึ้นดูเรื่องถัดไป ไม่ต้องเลือกเอง — ทุกคลิปในฟีด<b class="free-c"> ดูฟรี</b></p>
        <span class="btn btn-accent" style="align-self:flex-start">${ic('feed', 'sm')} เริ่มเลื่อนดู</span>
      </a>
      <a class="btile" href="#">
        <h3>สุ่มเรื่องให้ฉัน</h3>
        <p>กดครั้งเดียว ได้เรื่องที่ยังไม่เคยดู พร้อมเล่นตอนแรกทันที</p>
        <span class="btn btn-ghost" style="align-self:flex-start">${ic('sparkle', 'sm')} สุ่มเลย</span>
      </a>
    </div>
  </section>

  <section class="sec"><div class="sec-h"><h2>TOP 10 สัปดาห์นี้</h2>
      <a class="more" href="#">ดูอันดับทั้งหมด ${ic('right', 'sm')}</a></div>
    <div class="rail-wrap">
      <button class="rail-btn prev" aria-label="เลื่อนซ้าย" disabled>${ic('left')}</button>
      <button class="rail-btn next" aria-label="เลื่อนขวา">${ic('right')}</button>
      <div class="rail">${TOP10.map((s, i) => rankCard(s, i + 1)).join('')}</div></div>
    ${sampleNote('ยอดวิวและอันดับในภาพนี้เป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง')}
  </section>

  <section class="sec"><div class="sec-h"><h2>ตอนใหม่ล่าสุด</h2>
      <a class="more" href="#">ทั้งหมด ${ic('right', 'sm')}</a></div>
    <div class="chips" role="group" aria-label="กรองตามแนว">
      <button class="chip" aria-pressed="true">ทั้งหมด</button>
      ${D.genres.map(g => `<button class="chip" aria-pressed="false">${g.label}</button>`).join('')}
    </div>
    <div class="list two" style="margin-top:var(--s4)">
      ${epRow(S['durian-revenge'], 24, { isNew: true })}
      ${epRow(S['ayutthaya-love'], 19, { isNew: true, lock: true })}
      ${epRow(S['villainess-reborn'], 13, { lock: true })}
      ${epRow(S['mangosteen-heart'], 9, {})}
      ${epRow(S['undercover-tycoon'], 7, { cur: true })}
      ${epRow(S['one-night-bangkok'], 4, { done: true })}
    </div>
  </section>

  <section class="sec"><div class="sec-h"><h2>เลือกตามแนว</h2></div>
    <div class="genre-bento">${D.genres.map(g => {
      const items = D.series.filter(s => s.genres.includes(g.slug));
      return `<a class="gtile" href="#"><img src="${cover(items[0])}" alt="">
        <span>${g.label}</span><span class="cnt num">${items.length} เรื่อง</span></a>`;
    }).join('')}</div>
    <div class="chips" style="margin-top:var(--s4)">
      <span style="align-self:center;font-size:var(--t-meta);color:var(--dim);flex:none;padding-right:4px">แท็กยอดนิยม</span>
      ${TROPES.map(t => `<a class="chip" href="#">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}
    </div>
  </section>

  ${guest ? '' : `<section class="sec"><div class="sec-h"><h2>ติดตามไว้</h2>
    <a class="more" href="#">ทั้งหมด ${ic('right', 'sm')}</a></div>
    <div class="rail-wrap"><div class="rail">${['ceo-cold', 'billion-widow', 'house-13', 'seedless-longan', 'heir-returns', 'mirror-bride']
      .map(k => card(S[k], { hook: true })).join('')}</div></div></section>`}

  <section class="sec">
    <div class="btile" style="min-height:0;padding:var(--s6)">
      <h3>${ic('sparkle', 'sm')} ทุกเรื่องสร้างด้วย AI</h3>
      <p>ปก บท และตัวละครทั้งหมดของ LakornAI สร้างด้วยปัญญาประดิษฐ์ โดยทีมงานคนไทยเป็นผู้กำกับทิศทาง</p>
      <a class="btn btn-ghost" href="#" style="align-self:flex-start">ดูเบื้องหลังการสร้าง ${ic('right', 'sm')}</a>
    </div>
  </section>`;
}

export function buildHome() {
  const intro = `<div class="intro"><h1>ละครสั้นแนวตั้ง ดูจบได้ในหนึ่งคืน</h1>
    <p>12 เรื่องไทยที่สร้างด้วย AI ตอนละไม่เกิน 3 นาที เริ่มดูฟรี 10 ตอนแรกทุกเรื่อง</p></div>`;

  write('home.html', page({
    title: 'หน้าแรก',
    body: `${header({ active: 'home' })}<main id="main" class="page"><div class="wrap">${intro}${homeSections()}</div>${footer()}</main>${bottomNav('home')}`,
  }));

  write('home-guest.html', page({
    title: 'หน้าแรก (ยังไม่ล็อกอิน)',
    body: `${header({ active: 'home', guest: true })}<main id="main" class="page"><div class="wrap">${intro}${homeSections({ guest: true })}</div>${footer()}</main>${bottomNav('home', { notif: false })}`,
  }));

  write('home-empty.html', page({
    title: 'หน้าแรก (ยังไม่มีเรื่องที่ดูค้าง)',
    body: `${header({ active: 'home' })}<main id="main" class="page"><div class="wrap">${intro}${homeSections({ emptyCont: true })}</div>${footer()}</main>${bottomNav('home')}`,
  }));

  write('home-loading.html', page({
    title: 'หน้าแรก (กำลังโหลด)',
    body: `${header({ active: 'home' })}<main id="main" class="page"><div class="wrap">${intro}
      <div class="sec" style="margin-top:var(--s4)"><div class="skel" style="aspect-ratio:2/3;border-radius:var(--r-xl)"></div></div>
      <div class="sec"><div class="sec-h"><h2>ดูต่อจากที่ค้างไว้</h2></div>
        <div class="rail wide">${Array(3).fill(skelCont()).join('')}</div></div>
      <div class="sec"><div class="sec-h"><h2>TOP 10 สัปดาห์นี้</h2></div>
        <div class="rail">${Array(5).fill(skelCard()).join('')}</div></div>
      <div class="sec"><div class="sec-h"><h2>ตอนใหม่ล่าสุด</h2></div>
        <div class="list two">${Array(4).fill(skelRow()).join('')}</div></div>
    </div></main>${bottomNav('home')}`,
  }));
}

/* ===================== A2 ฟีดแนวตั้ง ===================== */
function feedScreen({ state = 'default' } = {}) {
  const s = S['durian-revenge'];
  const next = S['ceo-cold'];
  const nxt2 = S['villainess-reborn'];
  const sub = 'เขาไม่ได้มาคนเดียว';

  const sideBtns = `<div class="side">
      <button class="b on" aria-label="เปิดเสียง (ตอนนี้ปิดเสียงอยู่)">${ic('mute')}</button>
      <span class="lb">ปิดเสียง</span>
      <button class="b" aria-label="ติดตามเรื่องนี้">${ic('heart')}</button>
      <button class="b" aria-label="เลือกตอน">${ic('list')}</button>
      <button class="b" aria-label="แชร์">${ic('share')}</button>
      <button class="b" aria-label="เปิด/ปิดซับไตเติล">${ic('cc')}</button>
    </div>`;

  const body = `<div class="pstack">
      <div class="pfoot"><div class="ptext">
        <p class="sub-t">${sub}</p>
        <div class="pbody">
          <h2>${esc(s.title)} <span class="num" style="color:var(--accent)">EP.1</span></h2>
          <p class="hk">${esc(s.hook)}</p>
          <div class="btn-row" style="margin-top:var(--s3)">
            <a class="btn btn-accent btn-md" href="#">ดูทั้งเรื่อง ${ic('right', 'sm')}</a>
            <span class="tag tag-free" style="align-self:center">${ic('unlock', 'sm')} ตอนนี้ดูฟรี</span>
          </div></div>
      </div>${sideBtns}</div>
      <div>
        <div class="bar"><i style="width:34%"></i><span class="kn" style="left:calc(34% - 6px)"></span></div>
        <div class="times"><span class="num">0:38</span><span class="num">2:46</span></div>
      </div>
    </div>`;

  let overlay = '';
  if (state === 'coach') overlay = `<div class="coach"><div>
      <div class="ring">${ic('up', 'lg')}</div>
      <h3 style="font-size:var(--t-h1);font-weight:600">ปัดขึ้นเพื่อดูเรื่องถัดไป</h3>
      <p style="color:var(--fg-2);margin-top:8px;font-size:var(--t-sub);line-height:1.6">
        ปัดลงเพื่อย้อนกลับ · แตะที่จอเพื่อหยุดชั่วคราว<br>ทุกคลิปในฟีดดูฟรี ไม่ต้องใช้เหรียญ</p>
      <button class="btn btn-accent" style="margin-top:var(--s5)">เข้าใจแล้ว</button>
      <button class="btn btn-link" style="display:block;margin:4px auto 0">ไม่ต้องแสดงอีก</button>
    </div></div>`;
  if (state === 'error') overlay = `<div class="cdn"><div style="text-align:center;padding:var(--s6)">
      <div style="color:var(--danger)">${ic('alert', 'lg')}</div>
      <h3 style="font-size:var(--t-h2);font-weight:600;margin-top:10px">เล่นคลิปนี้ไม่ได้</h3>
      <p style="color:var(--muted);font-size:var(--t-sub);margin-top:6px">การเชื่อมต่อขัดข้อง</p>
      <div class="btn-row" style="justify-content:center;margin-top:var(--s4)">
        <button class="btn btn-accent btn-md">${ic('refresh', 'sm')} ลองใหม่</button>
        <button class="btn btn-ghost btn-md">ข้ามไปเรื่องถัดไป</button></div></div></div>`;
  if (state === 'loading') overlay = `<div class="cdn"><div style="text-align:center">
      <div class="btn" style="background:none;box-shadow:none"><span class="spin"></span></div>
      <p style="color:var(--fg-3);font-size:var(--t-sub);margin-top:6px">กำลังโหลด…</p></div></div>`;

  const phone = `<div class="player full">
      <img src="${cover(s)}" alt="" ${state === 'loading' ? 'style="filter:blur(14px) brightness(.7)"' : ''}>
      <div class="vig"></div>
      <div class="ptop">
        <button class="rnd" aria-label="ย้อนกลับ">${ic('left')}</button>
        <span class="ti"><b>ฟีดแนวตั้ง</b><span>เรื่องที่ 1 จาก 12</span></span>
        <button class="rnd" aria-label="ตั้งค่าการเล่น">${ic('settings')}</button>
      </div>
      ${body}
      ${overlay}
    </div>`;

  if (state === 'empty') {
    return `<main id="main" style="min-height:calc(100dvh - var(--navh));display:grid;place-items:center" class="stage">
      ${empty('checkc', 'ดูครบทุกเรื่องแล้ว', 'คุณปัดผ่านทั้ง 12 เรื่องในคลังแล้ว ลองดูจากอันดับยอดนิยม หรือเลือกตามแนวที่ชอบ', 'ดู TOP 10 สัปดาห์นี้')}
    </main>`;
  }

  return `<main id="main" class="stage">
    <div class="feed-desktop">${phone}</div>
  </main>`;
}

export function buildFeed() {
  const mk = (file, title, state) => write(file, page({
    title, bodyClass: 'stage',
    body: `<div class="only-desktop">${header({ active: 'feed' })}</div>${feedScreen({ state })}${bottomNav('feed')}
    <style>
      .only-desktop{display:none}
      @media (min-width:960px){
        .only-desktop{display:block}
        .stage .player.full{height:calc(100vh - 58px);max-width:none}
        .feed-desktop{display:grid;grid-template-columns:1fr 480px 420px 1fr;gap:var(--s6);align-items:center;
          height:calc(100vh - 58px);padding:0 var(--s6)}
        .feed-desktop .player.full{grid-column:2;height:min(820px,calc(100vh - 110px));border-radius:var(--r-xl);
          overflow:hidden;box-shadow:var(--e3)}
        .feed-desktop::after{content:"";grid-column:4}
        .feed-side{grid-column:3;display:block}
      }
      .feed-side{display:none}
    </style>`,
  }));
  mk('feed.html', 'ฟีดแนวตั้ง', 'default');
  mk('feed-coach.html', 'ฟีดแนวตั้ง — coach mark ครั้งแรก', 'coach');
  mk('feed-error.html', 'ฟีดแนวตั้ง — เล่นไม่ได้', 'error');
  mk('feed-loading.html', 'ฟีดแนวตั้ง — กำลังโหลด', 'loading');
  write('feed-empty.html', page({
    title: 'ฟีดแนวตั้ง — ดูครบแล้ว',
    body: `${header({ active: 'feed' })}${feedScreen({ state: 'empty' })}${bottomNav('feed')}`,
  }));
}

/* desktop feed: แผงข้อมูลขวา */
export function feedDesktopPanel() {
  const s = S['durian-revenge'];
  return `<aside class="feed-side">
    <h2 style="font-size:var(--t-h1);font-weight:600">${esc(s.title)}</h2>
    <div class="facts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;color:var(--fg-3);font-size:var(--t-meta)">
      <span class="tag tag-ai">AI</span><span>${s.eps} ตอน</span><span>·</span><span>${s.status}</span></div>
    <p style="color:var(--fg-2);margin-top:12px;line-height:1.6">${esc(s.hook)}</p>
  </aside>`;
}

/* ===================== A3 ค้นหา ===================== */
function searchPage({ state = 'default' } = {}) {
  const results = ['durian-revenge', 'billion-widow', 'undercover-tycoon', 'heir-returns', 'mangosteen-heart', 'villainess-reborn'].map(k => S[k]);
  const popular = ['ทุเรียน', 'ประธาน', 'ย้อนเวลา', 'ผี', 'แก้แค้น', 'นางร้าย', 'มาเฟีย'];
  const recent = ['ประธานเย็นชา', 'ทุเรียน', 'แม่ม่าย'];

  const filters = `<div class="side-filter">
    <div class="panel"><h3 style="font-size:var(--t-body)">ตัวกรอง</h3>
      <div style="margin-bottom:var(--s4)"><div style="font-size:var(--t-meta);color:var(--dim);margin-bottom:8px">แนว</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">${D.genres.map((g, i) =>
          `<button class="chip btn-sm" aria-pressed="${i === 5}" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">${g.label}</button>`).join('')}</div></div>
      <div style="margin-bottom:var(--s4)"><div style="font-size:var(--t-meta);color:var(--dim);margin-bottom:8px">สถานะ</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">จบแล้ว</button>
          <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">ยังฉายอยู่</button></div></div>
      <div style="margin-bottom:var(--s4)"><div style="font-size:var(--t-meta);color:var(--dim);margin-bottom:8px">ความยาว</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">ไม่เกิน 20 ตอน</button>
          <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">20–40 ตอน</button>
          <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">40 ตอนขึ้นไป</button></div></div>
      <div><div style="font-size:var(--t-meta);color:var(--dim);margin-bottom:8px">สิทธิ์การดู</div>
        <button class="chip btn-sm" aria-pressed="false" style="min-height:36px;padding:0 12px;font-size:var(--t-meta)">ดูฟรีได้ทั้งเรื่อง</button></div>
    </div></div>`;

  const head = `<div style="position:sticky;top:58px;z-index:10;background:var(--bg);padding:var(--s4) 0 var(--s3)">
      <div class="search-box"><span class="ic">${ic('search')}</span>
        <input value="${state === 'guest' || state === 'idle' ? '' : 'แก้แค้น'}" placeholder="ค้นหาชื่อเรื่อง ตัวละคร หรือแนว" aria-label="ค้นหา">
        ${state === 'guest' || state === 'idle' ? '' : `<button class="icon-btn" style="width:32px;height:32px;background:var(--surface-3)" aria-label="ล้าง">${ic('x', 'sm')}</button>`}
      </div>
      <div class="chips" style="margin-top:var(--s3)">
        <button class="chip" aria-pressed="false">${ic('filter', 'sm')} ตัวกรอง <span class="n num">1</span></button>
        ${D.genres.map((g, i) => `<button class="chip" aria-pressed="${i === 5}">${g.label}</button>`).join('')}
      </div></div>`;

  let main;
  if (state === 'empty') {
    main = empty('search', 'ไม่พบเรื่องที่ตรงกับ “ซอมบี้”',
      'ลองคำอื่น หรือเลือกจากคำค้นยอดนิยมด้านล่าง — คลังของเรามี 12 เรื่อง', 'ดูทุกเรื่องในคลัง') +
      `<div class="sec"><div class="sec-h"><h2>คำค้นยอดนิยม</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${popular.map(p => `<a class="chip" href="#">${p}</a>`).join('')}</div></div>`;
  } else if (state === 'guest' || state === 'idle') {
    main = `${state === 'guest' ? `<div class="sec" style="margin-top:var(--s2)"><p class="note-ex">${ic('info', 'sm')}
        <span>ยังไม่มีประวัติการค้นหาในเครื่องนี้ — ประวัติจะถูกเก็บไว้ในเครื่องเท่านั้น</span></p></div>` : `
      <section class="sec"><div class="sec-h"><h2>ค้นหาล่าสุด</h2><button class="more">ล้างทั้งหมด</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${recent.map(p =>
          `<a class="chip" href="#">${ic('clock', 'sm')} ${p}</a>`).join('')}</div></section>`}
      <section class="sec"><div class="sec-h"><h2>คำค้นยอดนิยม</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${popular.map(p => `<a class="chip" href="#">${p}</a>`).join('')}</div></section>
      <section class="sec"><div class="sec-h"><h2>กำลังมาแรง</h2></div>
        <div class="grid">${TOP10.slice(0, 6).map(s => card(s)).join('')}</div></section>`;
  } else {
    main = `<p style="color:var(--muted);font-size:var(--t-sub);margin:var(--s4) 0 var(--s3)">
        พบ <b class="num" style="color:var(--fg)">6</b> เรื่องสำหรับ “แก้แค้น”</p>
      <div class="grid">${results.map(s => card(s, { hook: true })).join('')}</div>`;
  }

  return `<main id="main" class="page"><div class="wrap">
    <div class="page-head" style="padding-bottom:0"><h1>ค้นหา</h1></div>
    ${head}
    <div class="with-side">${filters}<div class="main">${main}</div></div>
  </div>${footer()}</main>`;
}

export function buildSearch() {
  const mk = (f, t, state, guest = false) => write(f, page({
    title: t, body: `${header({ active: 'search', guest })}${searchPage({ state })}${bottomNav('search', { notif: !guest })}`,
  }));
  mk('search.html', 'ค้นหา — มีผลลัพธ์', 'default');
  mk('search-idle.html', 'ค้นหา — ยังไม่พิมพ์', 'idle');
  mk('search-empty.html', 'ค้นหา — ไม่พบผลลัพธ์', 'empty');
  mk('search-guest.html', 'ค้นหา — ยังไม่ล็อกอิน (ไม่มีประวัติ)', 'guest', true);
}

/* ===================== A4/A5 แนว + trope ===================== */
function catalogPage({ title, desc, items, crumb, isEmpty = false, tropeChips = false }) {
  return `<main id="main" class="page"><div class="wrap">
    <nav class="crumbs" aria-label="เส้นทาง"><a href="#">หน้าแรก</a><span>›</span><a href="#">เลือกดู</a><span>›</span><span>${esc(crumb)}</span></nav>
    <div class="page-head"><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>
    ${tropeChips ? `<div class="chips" style="margin-bottom:var(--s4)">
      <span style="align-self:center;font-size:var(--t-meta);color:var(--dim);flex:none;padding-right:4px">แท็ก</span>
      ${TROPES.map(t => `<a class="chip" href="#">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}</div>` : ''}
    <div class="chips" style="margin-bottom:var(--s5)">
      <span style="align-self:center;font-size:var(--t-meta);color:var(--dim);flex:none;padding-right:4px">เรียงตาม</span>
      <button class="chip" aria-pressed="true">ยอดนิยม</button>
      <button class="chip" aria-pressed="false">มาใหม่</button>
      <button class="chip" aria-pressed="false">จำนวนตอนมากสุด</button>
    </div>
    ${isEmpty
      ? empty('grid', 'แนวนี้ยังไม่มีเรื่อง', 'เรากำลังสร้างเรื่องใหม่ในแนวนี้อยู่ ระหว่างนี้ลองดูแนวที่ใกล้เคียงกัน', 'ดูทุกแนว')
      : `<p style="color:var(--muted);font-size:var(--t-sub);margin-bottom:var(--s4)">
            <b class="num" style="color:var(--fg)">${items.length}</b> เรื่องในแนวนี้</p>
         <div class="grid">${items.map(s => card(s, { hook: true })).join('')}</div>`}
  </div>${footer()}</main>`;
}

export function buildGenre() {
  const g = D.genres.find(x => x.slug === 'revenge');
  const items = D.series.filter(s => s.genres.includes('revenge'));
  write('genre.html', page({
    title: 'หน้าแนว — แก้แค้น',
    body: `${header({ active: 'browse' })}${catalogPage({
      title: 'ละครแนวแก้แค้น', crumb: g.label, items, tropeChips: true,
      desc: 'เรื่องที่เริ่มจากความอยุติธรรม แล้วจบที่การทวงคืนแบบสาสม — แนวที่คนดูละครสั้นไทยค้นหามากที่สุด',
    })}${bottomNav('')}`,
  }));
  write('genre-empty.html', page({
    title: 'หน้าแนว — ยังไม่มีเรื่อง',
    body: `${header({ active: 'browse' })}${catalogPage({
      title: 'ละครแนวตลกร้าย', crumb: 'ตลกร้าย', items: [], isEmpty: true,
      desc: 'แนวใหม่ที่กำลังเปิดในคลัง',
    })}${bottomNav('')}`,
  }));
  const t = TROPES[0];
  write('tag.html', page({
    title: 'หน้าแท็ก trope — แก้แค้นสาสม',
    body: `${header({ active: 'browse' })}${catalogPage({
      title: `แท็ก: ${t.label}`, crumb: t.label, items: t.items.map(k => S[k]),
      desc: 'แท็กเป็นชั้นที่สองซ้อนบน 6 แนวหลัก — เปิดเฉพาะแท็กที่มีเรื่อง 3 เรื่องขึ้นไป เพื่อไม่ให้เกิดหน้าว่าง',
    })}${bottomNav('')}`,
  }));
}

/* ===================== A6 ฮับเลือกดู ===================== */
export function buildBrowse() {
  const entries = [
    ['chart', 'TOP 10 สัปดาห์นี้', 'อันดับที่ขยับทุกวัน'],
    ['sparkle', 'ตอนใหม่ล่าสุด', 'ตอนที่เพิ่งปล่อยวันนี้'],
    ['calendar', 'ตารางออกตอน', 'เรื่องไหนออกวันไหน'],
    ['list', 'ดัชนี ก–ฮ / A–Z', 'ทุกเรื่องในคลัง 12 เรื่อง'],
  ];
  write('browse.html', page({
    title: 'ฮับเลือกดู',
    body: `${header({ active: 'browse' })}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>เลือกดู</h1><p>ทางเข้ารวมของทุกหมวด แท็ก และดัชนีในคลัง</p></div>
      <section class="sec" style="margin-top:0"><div class="sec-h"><h2>6 แนวหลัก</h2></div>
        <div class="genre-bento">${D.genres.map(g => {
          const items = D.series.filter(s => s.genres.includes(g.slug));
          return `<a class="gtile" href="#"><img src="${cover(items[0])}" alt="">
            <span>${g.label}</span><span class="cnt num">${items.length} เรื่อง</span></a>`;
        }).join('')}</div></section>
      <section class="sec"><div class="sec-h"><h2>แท็กที่เปิดแล้ว</h2></div>
        <p class="sec-sub">เปิดเฉพาะแท็กที่มีเรื่อง 3 เรื่องขึ้นไป — แท็กจะเพิ่มขึ้นตามคลัง ไม่ใช่ตามความอยาก</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap">${TROPES.map(t =>
          `<a class="chip" href="#">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}</div></section>
      <section class="sec"><div class="sec-h"><h2>ทางเข้าอื่น</h2></div>
        <div class="rowlist">${entries.map(([i, t, s]) =>
          `<a href="#"><span class="ic">${ic(i)}</span><span>${t}<span class="sub">${s}</span></span><span class="ch">${ic('right', 'sm')}</span></a>`).join('')}</div>
      </section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== A7 ยอดนิยม ===================== */
export function buildPopular() {
  const top3 = TOP10.slice(0, 3), rest = TOP10.slice(3);
  write('popular.html', page({
    title: 'ยอดนิยม TOP 10',
    body: `${header({ active: 'popular' })}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>ยอดนิยม</h1><p>อันดับจากยอดวิวสะสมในช่วงเวลาที่เลือก</p></div>
      <div class="chips" style="margin-bottom:var(--s5)">
        <button class="chip" aria-pressed="false">วันนี้</button>
        <button class="chip" aria-pressed="true">สัปดาห์นี้</button>
        <button class="chip" aria-pressed="false">ตลอดกาล</button></div>
      <div class="top3row">${top3.map((s, i) => rankCard(s, i + 1)).join('')}</div>
      ${sampleNote('ยอดวิวทุกตัวเลขในหน้านี้เป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง')}
      <section class="sec"><div class="sec-h"><h2>อันดับ 4–10</h2></div>
        <div class="list">${rest.map((s, i) => `<a class="ep-row" href="#">
          <span style="font-family:var(--display);font-weight:600;font-size:22px;color:var(--accent);width:28px;text-align:center;flex:none" class="num">${i + 4}</span>
          <span class="th"><img src="${cover(s)}" alt=""></span>
          <span class="bd"><span class="h"><b style="font-size:var(--t-body)">${esc(s.title)}</b>${s.status === 'จบแล้ว' ? doneBadge : newBadge}</span>
            <span class="st">${views(s)} วิว · ${s.eps} ตอน · ${s.genres.map(genreLabel).join(' · ')}</span></span>
          <span class="r">${ic('right', 'sm')}</span></a>`).join('')}</div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== A8 ตอนใหม่ ===================== */
export function buildNew() {
  const today = [['durian-revenge', 24], ['villainess-reborn', 13], ['ayutthaya-love', 19], ['undercover-tycoon', 7]];
  const yday = [['mangosteen-heart', 9], ['ceo-cold', 60], ['one-night-bangkok', 4]];
  const body = (isEmpty) => `<main id="main" class="page"><div class="wrap">
    <div class="page-head"><h1>ตอนใหม่ล่าสุด</h1><p>ตอนที่เพิ่งปล่อย เรียงตามวัน</p></div>
    <div class="chips" style="margin-bottom:var(--s3)">
      <button class="chip" aria-pressed="true">ทั้งหมด</button>
      ${D.genres.map(g => `<button class="chip" aria-pressed="false">${g.label}</button>`).join('')}</div>
    ${isEmpty
      ? empty('calendar', 'ยังไม่มีตอนใหม่ในช่วงนี้', 'ลองเลือกแนวอื่น หรือดูตารางออกตอนว่าเรื่องที่ติดตามจะมาวันไหน', 'ดูตารางออกตอน')
      : `<div class="day-h">วันนี้ · 23 ต.ค.</div>
         <div class="list two">${today.map(([k, n], i) => epRow(S[k], n, { isNew: true, lock: i === 2 })).join('')}</div>
         <div class="day-h">เมื่อวาน · 22 ต.ค.</div>
         <div class="list two">${yday.map(([k, n], i) => epRow(S[k], n, { lock: i === 1 })).join('')}</div>`}
  </div>${footer()}</main>`;
  write('new.html', page({ title: 'ตอนใหม่ล่าสุด', body: `${header({ active: 'new' })}${body(false)}${bottomNav('')}` }));
  write('new-empty.html', page({ title: 'ตอนใหม่ — ไม่มีตอนใหม่', body: `${header({ active: 'new' })}${body(true)}${bottomNav('')}` }));
}

/* ===================== A9 ตารางออกตอน ===================== */
export function buildSchedule() {
  const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const daily = D.series.filter(s => releaseDay(s) === 'ทุกวัน');
  write('schedule.html', page({
    title: 'ตารางออกตอน',
    body: `${header({ active: 'browse' })}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>ตารางออกตอน</h1><p>เรื่องไหนปล่อยตอนใหม่วันไหน — วันนี้คือวันพฤหัสบดี</p></div>
      <div class="daybar" role="tablist" aria-label="เลือกวัน">${days.map((d, i) =>
        `<button role="tab" aria-selected="${i === 3}" class="${i === 3 ? 'on' : ''}"><b>${d}</b><span class="num">${20 + i}</span></button>`).join('')}</div>
      <section class="sec"><div class="sec-h"><h2>พฤหัสบดี 23 ต.ค.</h2></div>
        <div class="list two">${[['ayutthaya-love', 19], ['one-night-bangkok', 4]].map(([k, n]) => epRow(S[k], n, { isNew: true })).join('')}</div></section>
      <section class="sec"><div class="sec-h"><h2>ออกทุกวัน</h2></div>
        <p class="sec-sub">${daily.length} เรื่องที่ปล่อยตอนใหม่ทุกวัน</p>
        <div class="grid">${daily.map(s => card(s)).join('')}</div></section>
      <section class="sec"><div class="sec-h"><h2>ออกรายสัปดาห์</h2></div>
        <div class="flatlist">${D.series.filter(s => releaseDay(s) && releaseDay(s) !== 'ทุกวัน').map(s =>
          `<a href="#"><span class="th" style="width:40px;aspect-ratio:2/3;border-radius:6px;overflow:hidden;flex:none">
            <img src="${cover(s)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
            <span class="t">${esc(s.title)}</span><span class="m">ทุกวัน${releaseDay(s)}</span>${ic('right', 'sm')}</a>`).join('')}</div></section>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== A10 ดัชนี ก–ฮ / A–Z ===================== */
export function buildAZ() {
  const letters = ['ทั้งหมด', 'ก', 'ข', 'ค', 'ง', 'จ', 'ช', 'ท', 'ธ', 'น', 'บ', 'ป', 'ม', 'ย', 'ล', 'ว', 'ส', 'ห', 'อ', 'A', 'O', 'T'];
  const sorted = [...D.series].sort((a, b) => a.title.localeCompare(b.title, 'th'));
  write('az.html', page({
    title: 'ดัชนี ก–ฮ / A–Z',
    body: `${header({ active: 'browse' })}<main id="main" class="page"><div class="wrap">
      <div class="page-head"><h1>ดัชนีทุกเรื่อง</h1><p>รายชื่อแบบแบนของทั้ง 12 เรื่อง — หาเร็วและให้ Google เก็บครบ</p></div>
      <div class="azbar" aria-label="เลือกตัวอักษร">${letters.map((l, i) =>
        `<button class="${i === 0 ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="flat2" style="margin-top:var(--s4)">
        ${[0, 1].map(col => `<div class="flatlist">${sorted.filter((_, i) => i % 2 === col).map(s =>
          `<a href="#"><span class="t">${esc(s.title)}</span>
            <span class="m">${s.genres.map(genreLabel)[0]} · ${s.eps} ตอน · ${s.status}</span>${ic('right', 'sm')}</a>`).join('')}</div>`).join('')}
      </div>
    </div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== B1 รายละเอียดเรื่อง ===================== */
function seriesPage(s, { guest = false, loading = false, current = 12, watchedTo = 11 } = {}) {
  const tr = tropesOf(s.slug);
  if (loading) {
    return `<main id="main" class="page"><div class="wrap">
      <nav class="crumbs"><a href="#">หน้าแรก</a><span>›</span><span class="skel l" style="width:120px;display:inline-block"></span></nav>
      <div class="two-col" style="margin-top:var(--s5)">
        <div class="skel" style="aspect-ratio:2/3;border-radius:var(--r-lg)"></div>
        <div style="display:grid;gap:12px">
          <div class="skel l" style="height:28px;width:70%"></div>
          <div class="skel l w45"></div><div class="skel" style="height:48px;border-radius:999px"></div>
          <div class="skel l w90"></div><div class="skel l w90"></div><div class="skel l w70"></div>
          <div class="eps" style="margin-top:12px">${Array(20).fill('<div class="skel" style="min-height:52px;border-radius:10px"></div>').join('')}</div>
        </div></div></div></main>`;
  }
  return `<main id="main" class="page"><div class="wrap">
    <nav class="crumbs" aria-label="เส้นทาง"><a href="#">หน้าแรก</a><span>›</span>
      <a href="#">${genreLabel(s.genres[0])}</a><span>›</span><span>${esc(s.title)}</span></nav>
    <div class="two-col" style="margin-top:var(--s5)">
      <div><div style="max-width:260px;margin:0 auto">${poster(s, { badges: ['<span class="tag tag-ai">AI</span>'], showViews: false })}</div></div>
      <div>
        <h1 style="font-size:var(--t-h1-series);line-height:var(--lh-h1s);font-weight:600">${esc(s.title)}</h1>
        <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:10px;color:var(--fg-3);font-size:var(--t-meta)">
          <span>${s.genres.map(genreLabel).join(' · ')}</span><span>·</span><span class="num">${s.eps} ตอน</span><span>·</span>
          <span>${s.status}</span><span>·</span><span class="num">${views(s)} วิว</span></div>
        <div class="btn-row" style="margin-top:var(--s4)">
          <a class="btn btn-accent" href="#" style="flex:1 1 auto;min-width:200px;max-width:320px">${ic('playf', 'sm')} ${guest ? 'เริ่มดู EP.1' : `ดูต่อ EP.${current}`}</a>
          <button class="btn btn-ghost" aria-pressed="${guest ? 'false' : 'true'}">${ic(guest ? 'heart' : 'heartf', 'sm')} ${guest ? 'ติดตาม' : 'ติดตามแล้ว'}</button>
          <button class="icon-btn" aria-label="แชร์" style="margin:0">${ic('share')}</button>
        </div>
        <div class="perm" style="margin-top:var(--s4)"><span class="ic">${ic('unlock', 'sm')}</span>
          <span><b>ตอน 1–${FREE_EPS} ดูฟรี</b> · ตอน ${FREE_EPS + 1} ขึ้นไปสำหรับสมาชิก หรือปลดล็อกทีละตอน ${COIN_PER_EP} เหรียญ</span></div>
        <p style="margin-top:var(--s5);font-size:var(--t-body);font-weight:500;color:var(--fg);line-height:1.5">${esc(s.hook)}</p>
        <p style="margin-top:var(--s3);color:var(--fg-2);font-size:var(--t-long);line-height:var(--lh-long);max-width:62ch">
          ${esc(s.hook)} เรื่องราวดำเนินไปใน ${s.eps} ตอนสั้น ตอนละไม่เกิน 3 นาที
          ติดตามการพลิกเกมของตัวละครที่ไม่มีใครคาดคิด และบทสรุปที่ทุกความลับถูกเปิดออกพร้อมกัน</p>
        <div class="chips" style="margin-top:var(--s4)">
          ${s.genres.map(g => `<a class="chip" href="#">${genreLabel(g)}</a>`).join('')}
          ${tr.map(t => `<a class="chip" href="#">${t.label}</a>`).join('')}</div>

        <section class="sec"><div class="sec-h"><h2>เลือกตอน</h2>
          <span class="more num" style="color:var(--muted)">${s.eps} ตอน</span></div>
          ${epTabs(s, 0)}
          ${epGrid(s, { current, watchedTo, from: 1, to: 20 })}
          ${legend}</section>

        <section class="sec"><div class="sec-h"><h2>ตัวละคร</h2></div>
          <div style="display:flex;gap:var(--s4);flex-wrap:wrap">${s.cast.map(c =>
            `<a href="#" style="display:grid;justify-items:center;gap:7px;width:76px;text-align:center">
              <span style="width:60px;height:60px;border-radius:50%;background:linear-gradient(150deg,${s.c2},${s.c1});
                border:1px solid var(--border-i);display:grid;place-items:center;font-family:var(--display);font-size:22px;color:#fff">${esc(c[0])}</span>
              <span style="font-size:var(--t-meta);color:var(--fg-2);line-height:1.3">${esc(c)}</span></a>`).join('')}</div></section>

        <section class="sec"><div class="sec-h"><h2>เรื่องที่คล้ายกัน</h2></div>
          <div class="rail-wrap"><div class="rail">${D.series.filter(x => x.slug !== s.slug && x.genres.some(g => s.genres.includes(g)))
            .slice(0, 6).map(x => card(x)).join('')}</div></div></section>
      </div></div>
  </div>${footer()}</main>`;
}

export function buildSeries() {
  const s = S['ceo-cold'];
  write('series.html', page({
    title: `${s.title} — รายละเอียดเรื่อง`,
    body: `${header({})}${seriesPage(s)}${bottomNav('')}`,
  }));
  write('series-guest.html', page({
    title: `${s.title} — ยังไม่ล็อกอิน`,
    body: `${header({ guest: true })}${seriesPage(s, { guest: true, current: 1, watchedTo: 0 })}${bottomNav('', { notif: false })}`,
  }));
  write('series-loading.html', page({
    title: `รายละเอียดเรื่อง — กำลังโหลด`,
    body: `${header({})}${seriesPage(s, { loading: true })}${bottomNav('')}`,
  }));
}

/* ===================== B2 หน้ารับชม + B3 ชีตตอน + B4 paywall ===================== */
function watchPlayer(s, ep, { state = 'playing', blur = false } = {}) {
  const e = s.episodes[ep - 1];
  return `<div class="player">
    <img src="${cover(s)}" alt="" ${blur ? 'style="filter:blur(18px) brightness(.55)"' : ''}>
    <div class="vig"></div>
    <div class="ptop">
      <button class="rnd" aria-label="ย้อนกลับ">${ic('left')}</button>
      <span class="ti"><b>${esc(s.title)}</b><span class="num">EP.${ep} · ${esc(e[0])}</span></span>
      <button class="rnd" aria-label="เต็มจอ">${ic('max')}</button>
    </div>
    ${state === 'loading' ? `<div class="cdn"><div style="text-align:center">
        <div class="btn" style="background:none;box-shadow:none"><span class="spin"></span></div>
        <p style="color:var(--fg-3);font-size:var(--t-sub);margin-top:4px">กำลังโหลดตอนนี้…</p></div></div>` : ''}
    ${state === 'error' ? `<div class="cdn"><div style="text-align:center;padding:var(--s5)">
        <div style="color:var(--danger)">${ic('alert', 'lg')}</div>
        <h3 style="font-size:var(--t-h2);font-weight:600;margin-top:8px">เล่นตอนนี้ไม่ได้</h3>
        <p style="color:var(--muted);font-size:var(--t-sub);margin-top:4px">การเชื่อมต่อขัดข้อง</p>
        <button class="btn btn-accent btn-md" style="margin-top:var(--s4)">${ic('refresh', 'sm')} ลองใหม่</button></div></div>` : ''}
    ${state === 'idle' ? `<div class="bigplay"><i>${ic('playf', 'lg')}</i></div>` : ''}
    <div class="pstack">
      <div class="pfoot"><div class="ptext">
        ${state === 'playing' ? `<p class="sub-t">${esc(D.subs[2])}</p>` : ''}
        ${state === 'preview' ? `<p class="sub-t" style="color:var(--accent);font-weight:600">
          ${ic('lock', 'sm')} พรีวิวฟรีครบ 30 วินาทีแล้ว</p>` : ''}
      </div>
      <div class="side">
        <button class="b on" aria-label="เปิดเสียง (ตอนนี้ปิดเสียงอยู่)">${ic('mute')}</button><span class="lb">ปิดเสียง</span>
        <button class="b" aria-label="ติดตามเรื่องนี้">${ic('heart')}</button>
        <button class="b" aria-label="เลือกตอน">${ic('list')}</button>
        <button class="b" aria-label="แชร์">${ic('share')}</button>
        <button class="b" aria-label="เปิด/ปิดซับไตเติล">${ic('cc')}</button>
      </div></div>
      <div>
        <div class="bar"><i style="width:${state === 'preview' ? 100 : 42}%"></i>
          <span class="kn" style="left:calc(${state === 'preview' ? 100 : 42}% - 6px)"></span></div>
        <div class="times"><span class="num">${state === 'preview' ? '0:30' : '1:12'}</span>
          <span class="num">${state === 'preview' ? 'พรีวิวฟรี 30 วินาที' : e[1]}</span></div>
      </div>
    </div>
  </div>`;
}

function watchBody(s, ep, playerHtml) {
  const e = s.episodes[ep - 1];
  return `<main id="main" class="page" style="padding-top:0">
    <div class="wrap" style="padding-top:var(--s4)">
      <div class="watch-col">
        <div>${playerHtml}</div>
        <div>
          <nav class="crumbs" style="padding-top:0"><a href="#">หน้าแรก</a><span>›</span><a href="#">${esc(s.title)}</a><span>›</span><span class="num">EP.${ep}</span></nav>
          <h1 style="font-size:var(--t-h1-series);font-weight:600;margin-top:var(--s3);line-height:1.3">${esc(e[0])}</h1>
          <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:9px;color:var(--fg-3);font-size:var(--t-meta);align-items:center">
            <span class="num">EP.${ep} จาก ${s.eps}</span><span>·</span><span>${e[1]} นาที</span><span>·</span>
            <span>${s.genres.map(genreLabel).join(' · ')}</span>${ep > FREE_EPS ? '<span class="tag tag-lock">ปลดล็อกแล้ว</span>' : '<span class="tag tag-free">ตอนฟรี</span>'}</div>
          <a class="ep-row" href="#" style="margin-top:var(--s4)">
            <span class="th"><img src="${cover(s)}" alt=""></span>
            <span class="bd"><span class="h"><b class="num">ตอนถัดไป · EP.${ep + 1}</b>${ep + 1 > FREE_EPS ? `<span class="tag tag-lock">${ic('lock', 'sm')} สมาชิก</span>` : ''}</span>
              <span class="st">${esc((s.episodes[ep] || [''])[0])}</span></span>
            <span class="r">${ic('playf', 'sm')}</span></a>
          <div class="perm" style="margin-top:var(--s4)"><span class="ic">${ic('unlock', 'sm')}</span>
            <span><b>ตอน 1–${FREE_EPS} ดูฟรี</b> · ตอน ${FREE_EPS + 1} ขึ้นไปใช้ ${COIN_PER_EP} เหรียญ หรือสมัคร VIP ดูไม่อั้น</span></div>
          <section class="sec"><div class="sec-h"><h2>เลือกตอน</h2>
            <span class="more num" style="color:var(--muted)">${s.eps} ตอน</span></div>
            ${epTabs(s, 0)}${epGrid(s, { current: ep, watchedTo: ep - 1 })}${legend}</section>
        </div>
      </div>
    </div>${footer()}</main>`;
}

export function buildWatch() {
  const s = S['ceo-cold'];
  write('watch.html', page({
    title: `${s.title} EP.12 — หน้ารับชม`,
    body: `${header({ back: esc(s.title) })}${watchBody(s, 12, watchPlayer(s, 12))}${bottomNav('')}`,
  }));
  write('watch-loading.html', page({
    title: 'หน้ารับชม — กำลังโหลด',
    body: `${header({ back: esc(s.title) })}${watchBody(s, 12, watchPlayer(s, 12, { state: 'loading', blur: true }))}${bottomNav('')}`,
  }));
  write('watch-error.html', page({
    title: 'หน้ารับชม — เล่นไม่ได้',
    body: `${header({ back: esc(s.title) })}${watchBody(s, 12, watchPlayer(s, 12, { state: 'error', blur: true }))}${bottomNav('')}`,
  }));

  /* B3 ชีตเลือกตอน */
  write('watch-episodes.html', page({
    title: 'ชีตเลือกตอนในเพลเยอร์',
    body: `${header({ back: esc(s.title) })}${watchBody(s, 12, watchPlayer(s, 12))}
      <div class="scrim"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-eps" style="max-height:74vh">
        <div class="grab"></div>
        <div class="sh"><h3 id="sh-eps">เลือกตอน</h3>
          <span class="tag tag-done num">${s.eps} ตอน</span>
          <button class="close" aria-label="ปิด">${ic('x')}</button></div>
        <div class="sb">${epTabs(s, 0)}${epGrid(s, { current: 12, watchedTo: 11 })}${legend}</div>
      </div>${bottomNav('')}`,
  }));

  /* B5 แลนดิ้งแชร์ตอน */
  write('share-landing.html', page({
    title: 'แลนดิ้งแชร์ตอน (มาจากโซเชียล)',
    body: `${header({ back: esc(s.title), guest: true })}
      <main id="main" class="page" style="padding-top:0"><div class="wrap" style="padding-top:var(--s4)">
        <div class="watch-col"><div>${watchPlayer(s, 3)}</div>
        <div>
          <div class="note-ex" style="margin-bottom:var(--s3)">${ic('share', 'sm')}<span>คุณเข้ามาจากลิงก์ที่มีคนแชร์ — เล่นให้ทันที ไม่มีหน้าต่างขัดจังหวะ</span></div>
          <h1 style="font-size:var(--t-h1-series);font-weight:600;line-height:1.3">${esc(s.episodes[2][0])}</h1>
          <p style="color:var(--muted);margin-top:8px;font-size:var(--t-sub)">${esc(s.title)} · EP.3 จาก ${s.eps} · ${s.episodes[2][1]} นาที</p>
          <div class="btn-row" style="margin-top:var(--s4)">
            <a class="btn btn-accent" href="#" style="flex:1">ดูทั้งเรื่อง ${s.eps} ตอน</a>
            <a class="btn btn-ghost" href="#">ดูเรื่องอื่น</a></div>
          <div class="perm" style="margin-top:var(--s4)"><span class="ic">${ic('unlock', 'sm')}</span>
            <span><b>ตอน 1–${FREE_EPS} ดูฟรี</b> ไม่ต้องสมัครสมาชิก</span></div>
          <section class="sec"><div class="sec-h"><h2>เรื่องที่คนดูต่อจากตอนนี้</h2></div>
            <div class="rail-wrap"><div class="rail">${TOP10.slice(0, 6).map(x => card(x)).join('')}</div></div></section>
        </div></div></div>${footer()}</main>${bottomNav('')}`,
  }));
}

/* ===================== B4 Paywall ===================== */
function paywall(state) {
  const s = S['ceo-cold'];
  const low = state === 'low';
  const guest = state === 'guest';
  const busy = state === 'busy';
  const err = state === 'error';
  const first = state === 'first';

  const bal = guest
    ? `<div class="bal">${ic('info', 'sm')} <span>เข้าสู่ระบบเพื่อดูยอดเหรียญของคุณ</span></div>`
    : `<div class="bal${low ? ' low' : ''}">${ic('coin', 'sm')}
        <span>คงเหลือ <b class="num">${low ? 45 : BALANCE.toLocaleString('en-US')}</b> เหรียญ${low ? ` · ขาดอีก ${COIN_PER_EP - 45 > 0 ? COIN_PER_EP - 45 : 0} เหรียญ` : ''}</span></div>`;

  const door1 = guest
    ? `<button class="door primary"><span class="dt"><b>เข้าสู่ระบบเพื่อปลดล็อก</b>
        <span>ใช้เบอร์มือถือ ไม่ต้องตั้งรหัสผ่าน</span></span><span class="price">${ic('right')}</span></button>`
    : low
      ? `<button class="door primary"><span class="dt"><b>เติมเหรียญแล้วปลดล็อก</b>
          <span>เหรียญไม่พอ · แพ็กเล็กสุด 100 เหรียญ ฿9</span></span><span class="price num">฿9</span></button>`
      : `<button class="door primary"${busy ? ' disabled' : ''}><span class="dt"><b>ปลดล็อกตอนนี้</b>
          <span>${busy ? 'กำลังยืนยัน…' : `ใช้ ${COIN_PER_EP} เหรียญ · ดูได้ตลอด`}</span></span>
          <span class="price num">${busy ? '<span class="spin" style="border-color:rgba(255,255,255,.25);border-top-color:var(--accent)"></span>' : COIN_PER_EP + ic('coin','sm')}</span></button>`;

  return `<div class="scrim"></div>
  <div class="sheet pw" role="dialog" aria-modal="true" aria-labelledby="pw-h">
    <div class="grab"></div>
    <div class="sh" style="padding-bottom:0"><span style="flex:1"></span><button class="close" aria-label="ปิด">${ic('x')}</button></div>
    <div class="sb">
      <div class="pwtop">
        <div class="lockbig">${ic('lock', 'lg')}</div>
        <h3 id="pw-h">${err ? 'ปลดล็อกไม่สำเร็จ' : `ตอนที่ 11 ต้องปลดล็อก`}</h3>
        <p class="sub">${err
          ? 'ระบบตัดเหรียญไม่สำเร็จ ยังไม่มีการหักเหรียญจากบัญชีของคุณ'
          : `${esc(s.title)} · ${esc(s.episodes[10][0])}<br>คุณดูพรีวิวฟรีครบ 30 วินาทีแล้ว`}</p>
        ${err ? '' : bal}
      </div>
      ${first ? `<div class="perm" style="margin-bottom:var(--s4)"><span class="ic">${ic('unlock', 'sm')}</span>
        <span><b>ตอน 1–10 ของทุกเรื่องดูฟรี</b> — ตอน 11 เป็นต้นไปใช้เหรียญหรือสมัคร VIP ครั้งเดียวดูได้ทุกเรื่อง</span></div>` : ''}
      ${err ? `<div class="errorbox" style="margin-bottom:var(--s4);padding:var(--s5)">
          <div class="ill">${ic('alert')}</div>
          <p style="color:var(--muted);font-size:var(--t-sub)">ลองใหม่อีกครั้ง หรือเลือกสมัคร VIP แทน</p>
          <button class="btn btn-accent btn-md">${ic('refresh', 'sm')} ลองใหม่</button></div>` : ''}
      <div class="door-wrap">${door1}</div>
      <div class="door-wrap"><span class="badge">คุ้มที่สุด</span>
        <button class="door door-vip"><span class="dt"><b>สมัคร VIP ดูไม่อั้น</b>
          <span>ทุกเรื่อง ทุกตอน ไม่ต้องนับเหรียญ</span></span><span class="price num">฿39<small style="font-size:13px;color:var(--muted)">/เดือน</small></span></button></div>
      <div class="hr-t"></div>
      <a class="third" href="#">${ic('gift', 'sm')} ดูโฆษณา 1 คลิป แลก 1 ตอน</a>
      <div style="margin-top:var(--s2)">${mockBar()}</div>
      ${sampleNote('ราคาและจำนวนเหรียญเป็นตัวเลขตัวอย่าง ยังไม่ผ่านการยืนยันจากฝ่ายราคา')}
    </div>
  </div>`;
}

export function buildPaywall() {
  const s = S['ceo-cold'];
  const base = watchBody(s, 11, watchPlayer(s, 11, { state: 'preview', blur: true }));
  const mk = (f, t, st) => write(f, page({
    title: t, body: `${header({ back: esc(s.title), guest: st === 'guest' })}${base}${paywall(st)}${bottomNav('')}`,
  }));
  mk('paywall-coins-ok.html', 'Paywall — เหรียญพอ', 'ok');
  mk('paywall-coins-low.html', 'Paywall — เหรียญไม่พอ', 'low');
  mk('paywall-guest.html', 'Paywall — ยังไม่ล็อกอิน', 'guest');
  mk('paywall-busy.html', 'Paywall — กำลังยืนยัน', 'busy');
  mk('paywall-error.html', 'Paywall — ปลดล็อกไม่สำเร็จ', 'error');
  mk('paywall-first.html', 'Paywall — แถบอธิบายครั้งแรก (E3)', 'first');
}

/* ===================== B6 ตัวละคร ===================== */
export function buildCast() {
  const name = 'ก้านยาว';
  const items = D.series.filter(s => s.cast.includes(name));
  const body = (isEmpty) => `<main id="main" class="page"><div class="wrap">
    <nav class="crumbs"><a href="#">หน้าแรก</a><span>›</span><a href="#">ตัวละคร</a><span>›</span><span>${name}</span></nav>
    <div style="display:flex;gap:var(--s4);align-items:center;margin:var(--s5) 0 var(--s4)">
      <span style="width:84px;height:84px;border-radius:50%;background:linear-gradient(150deg,#7a6a2c,#4F452A);
        border:1px solid var(--border-i);display:grid;place-items:center;font-family:var(--display);font-size:34px;color:#fff;flex:none">${name[0]}</span>
      <div><h1 style="font-size:var(--t-h1);font-weight:600">${name}</h1>
        <p style="color:var(--muted);font-size:var(--t-sub);margin-top:4px">
          ${isEmpty ? 'ยังไม่มีเรื่องที่ตัวละครนี้ปรากฏ' : `ปรากฏใน ${items.length} เรื่อง`}</p></div></div>
    ${isEmpty
      ? empty('user', 'ยังไม่มีเรื่องของตัวละครนี้', 'ตัวละครนี้ถูกอ้างถึงในเรื่องย่อ แต่ยังไม่มีเรื่องที่เผยแพร่', 'ดูตัวละครทั้งหมด')
      : `<div class="grid">${items.map(s => card(s, { hook: true })).join('')}</div>`}
    <p class="note-ex" style="margin-top:var(--s5)">${ic('info', 'sm')}
      <span>หน้านี้ใช้ avatar ตัวอักษรเพราะ <code>cast[]</code> ใน data.js เก็บเป็นชื่อล้วน ยังไม่มีรูปนักแสดง</span></p>
  </div>${footer()}</main>`;
  write('cast.html', page({ title: `ตัวละคร ${name}`, body: `${header({})}${body(false)}${bottomNav('')}` }));
  write('cast-empty.html', page({ title: 'ตัวละคร — ไม่มีเรื่อง', body: `${header({})}${body(true)}${bottomNav('')}` }));
}

/* ===================== C1 คลังของฉัน ===================== */
function libraryPage({ tab = 'continue', isEmpty = false, guest = false } = {}) {
  const tabs = [['continue', 'ดูต่อ'], ['following', 'ติดตาม'], ['done', 'ดูจบแล้ว'], ['history', 'ประวัติ']];
  const EMPTIES = {
    continue: ['playf', 'ยังไม่มีเรื่องที่ดูค้าง', 'เริ่มจากฟีดแนวตั้ง ปัดดูทีละเรื่องโดยไม่ต้องเลือกเอง', 'เริ่มเลื่อนดูฟีด'],
    following: ['heart', 'ยังไม่ได้ติดตามเรื่องไหน', 'กดหัวใจที่เรื่องไหนก็ได้ แล้วเราจะเตือนเมื่อมีตอนใหม่', 'ดู TOP 10 สัปดาห์นี้'],
    done: ['checkc', 'ยังไม่มีเรื่องที่ดูจบ', 'เรื่องที่ดูครบทุกตอนจะมาอยู่ตรงนี้ ไว้ย้อนดูอีกครั้ง', 'ดูเรื่องสั้นที่สุด 12 ตอน'],
    history: ['clock', 'ไม่มีประวัติการดู', 'ประวัติเก็บในเครื่องนี้เท่านั้น และลบได้ตลอดเวลา', null],
  };

  let content;
  if (isEmpty) {
    const [i, h, p, b] = EMPTIES[tab];
    content = empty(i, h, p, b) + (tab === 'history'
      ? `<div style="display:grid;place-items:center"><button class="btn btn-ghost btn-md is-disabled">${ic('trash', 'sm')} ล้างประวัติ</button></div>` : '');
  } else if (tab === 'continue') {
    const list = CONT.map(([k, ep, pct]) => {
      const s = S[k];
      return `<a class="ep-row" href="#" style="padding:var(--s3)">
        <span class="th" style="width:76px">
          <img src="${cover(s)}" alt="">${pct > 90 ? '<span style="position:absolute;inset:auto 0 0;background:var(--accent);color:var(--on-accent);font-size:13px;text-align:center;font-weight:600;padding:1px 0">ตอนสุดท้าย</span>' : ''}</span>
        <span class="bd"><span class="h"><b style="font-size:var(--t-body)">${esc(s.title)}</b></span>
          <span class="st num">EP.${ep}/${s.eps} · ดูไปแล้ว ${pct}%</span>
          <span style="display:block;height:4px;border-radius:2px;background:var(--line-2);margin-top:8px;max-width:200px">
            <span style="display:block;height:100%;width:${pct}%;border-radius:2px;background:var(--free)"></span></span></span>
        <span class="r" style="display:grid;gap:6px;justify-items:center">
          <span class="btn btn-sm btn-accent" style="min-height:36px">ดูต่อ</span>
          <span style="color:var(--faint)">${ic('dots', 'sm')}</span></span></a>`;
    }).join('');
    const grid = CONT.map(([k, ep, pct]) => {
      const s = S[k];
      return `<a class="card libcard" href="#">
        <div class="poster" style="--c1:${s.c1};--c2:${s.c2}" role="img" aria-label="ปก ${esc(s.title)}">
          <img src="${cover(s)}" alt="" loading="lazy"><div class="scrim"></div>
          <span class="epb num">EP.${ep}</span>
          <span class="pbar"><i style="width:${pct}%"></i></span></div>
        <div class="t">${esc(s.title)}</div>
        <div class="m num">EP.${ep}/${s.eps} · ${pct}%</div></a>`;
    }).join('');
    content = `<div class="lib-list">${list}</div><div class="lib-grid">${grid}</div>`;
  } else if (tab === 'following') {
    content = `<div class="grid">${(D.following || ['ceo-cold', 'billion-widow', 'house-13', 'seedless-longan', 'heir-returns', 'mirror-bride'])
      .map(k => S[k] || S['ceo-cold']).map(s => card(s, { badges: [`<span class="tag tag-new">EP.${s.eps} ใหม่</span>`] })).join('')}</div>`;
  } else if (tab === 'done') {
    content = `<div class="grid">${['seedless-longan', 'house-13'].map(k => card(S[k], { badges: [`<span class="tag tag-done">ดูจบแล้ว</span>`] })).join('')}</div>`;
  } else {
    content = `<div class="list">${[['ceo-cold', 12], ['durian-revenge', 5], ['one-night-bangkok', 4], ['mirror-bride', 3]]
      .map(([k, n]) => epRow(S[k], n, { done: true })).join('')}</div>`;
  }

  return `<main id="main" class="page"><div class="wrap">
    <div class="page-head"><h1>คลังของฉัน</h1></div>
    <div class="tabs" role="tablist" aria-label="แท็บคลังของฉัน">${tabs.map(([k, l]) =>
      `<button role="tab" aria-selected="${k === tab}">${l}</button>`).join('')}</div>
    ${guest ? `<div class="perm" style="margin-top:var(--s4);background:var(--accent-soft);border-color:var(--accent-line)">
      <span class="ic" style="color:var(--accent)">${ic('info', 'sm')}</span>
      <span>ข้อมูลนี้เก็บไว้<b style="color:var(--accent)">ในเครื่องนี้เท่านั้น</b> — เข้าสู่ระบบเพื่อซิงก์ข้ามเครื่อง</span>
      <a class="btn btn-accent btn-md" href="#" style="flex:none;margin-left:auto">เข้าสู่ระบบ</a></div>` : ''}
    <div style="margin-top:var(--s5)">${content}</div>
  </div>${footer()}</main>`;
}

export function buildLibrary() {
  const mk = (f, t, o) => write(f, page({
    title: t, body: `${header({ active: 'library', guest: !!o.guest })}${libraryPage(o)}${bottomNav('library', { notif: !o.guest })}`,
  }));
  mk('library.html', 'คลังของฉัน — ดูต่อ', { tab: 'continue' });
  mk('library-following.html', 'คลังของฉัน — ติดตาม', { tab: 'following' });
  mk('library-done.html', 'คลังของฉัน — ดูจบแล้ว', { tab: 'done' });
  mk('library-history.html', 'คลังของฉัน — ประวัติ', { tab: 'history' });
  mk('library-guest.html', 'คลังของฉัน — ยังไม่ล็อกอิน', { tab: 'continue', guest: true });
  mk('library-empty-continue.html', 'คลังของฉัน — ยังไม่มีเรื่องที่ดูค้าง', { tab: 'continue', isEmpty: true });
  mk('library-empty-following.html', 'คลังของฉัน — ยังไม่ติดตามเรื่องไหน', { tab: 'following', isEmpty: true });
  mk('library-empty-done.html', 'คลังของฉัน — ยังไม่มีเรื่องที่ดูจบ', { tab: 'done', isEmpty: true });
  mk('library-empty-history.html', 'คลังของฉัน — ไม่มีประวัติ', { tab: 'history', isEmpty: true });
}
