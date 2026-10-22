/* กลุ่ม A — การค้นพบ: หน้าแรก ฟีด ค้นหา ฮับ แนว แท็ก ยอดนิยม ตอนใหม่ ตาราง A–Z ตัวละคร */
import {
  D, U, SERIES, BY, TOP10, OPEN_TAGS, CAST, genreLabel, genreOf,
  seriesOfGenre, similar, isDaily, isAiring, tropesOf, isOpenTag, CAST_PAGES,
} from './content.mjs';
import {
  definePage, shell, pageHead, crumbs, rail, section, poster, card, rankCard, epRow,
  coverImg, ic, esc, footer, empty, sampleNote, freeBadge, aiBadge, newBadge, doneBadge,
  localNote, FREE_LINE,
} from './ui.mjs';
import { collectionLd, websiteLd, breadcrumb, shareImage, coverUrl } from './seo.mjs';

const wrap = inner => `<main id="main" class="page"><div class="wrap">${inner}</div></main>`;
const wrapF = (L, inner) => `<main id="main" class="page"><div class="wrap">${inner}</div>${footer(L)}</main>`;

/* ============================ A1 หน้าแรก ============================ */
export function buildHome() {
  const heroes = TOP10.slice(0, 3);

  const body = L => {
    const hero = `<section class="sec hero-sec" aria-label="เรื่องเด่นประจำสัปดาห์">
      <div class="hero-track" id="heroTrack">${heroes.map((s, i) => `
        <article class="hero" id="hero-${i + 1}">
          <span class="bg">${coverImg(L, s, { lazy: i > 0 })}</span>
          <div class="body">
            <span class="kick">${ic('sparkle', 'sm')} เรื่องเด่นประจำสัปดาห์</span>
            <h2><a href="${L(U.series(s.slug))}">${esc(s.title)}</a></h2>
            <div class="facts">${aiBadge}${freeBadge}<b class="num">${s.eps} ตอน</b>
              <span>${s.genres.map(genreLabel).join(' · ')}</span><span>${esc(s.status)}</span></div>
            <p class="hk">${esc(s.hook)}</p>
            <div class="btn-row">
              <a class="btn btn-accent" href="${L(U.watch(s.slug, 1))}" data-resume="${s.slug}">${ic('playf', 'sm')} <span data-resume-label>เริ่มดู EP.1</span></a>
              <button class="icon-btn" data-follow="${s.slug}" aria-pressed="false" aria-label="ติดตาม ${esc(s.title)}">${ic('heart')}</button>
              <button class="icon-btn" data-share aria-label="แชร์ ${esc(s.title)}">${ic('share')}</button>
            </div>
          </div>
        </article>`).join('')}</div>
      <div class="dots" role="tablist" aria-label="เลือกเรื่องเด่น">${heroes.map((s, i) =>
        `<button role="tab" aria-selected="${i === 0}" aria-label="${esc(s.title)}" data-hero="${i}"></button>`).join('')}</div>
    </section>`;

    /* AC-2 · แถบ "ดูต่อจากที่ค้างไว้"
       HTML ที่ส่งออกคือสถานะว่าง เพราะเซิร์ฟเวอร์ไม่รู้จักผู้ใช้
       assets/app.js เติมรายการจริงจาก localStorage แล้วเรียงล่าสุดอยู่บนสุด
       — ไม่มีเลขตอนหรือเปอร์เซ็นต์ที่เขียนมืออยู่ในไฟล์นี้แม้จุดเดียว */
    const cont = `<section class="sec" id="contSec"><div class="sec-h"><h2>ดูต่อจากที่ค้างไว้</h2>
      <a class="more" href="${L(U.library)}?tab=continue">ทั้งหมด ${ic('right', 'sm')}</a></div>
      <div id="contRail" data-empty-cta="${L(U.feed)}">
        ${empty(L, 'playf', 'ยังไม่มีเรื่องที่ดูค้าง',
          'กดดูสักตอน แล้วเว็บจะจำตอนและเวลาที่ค้างไว้ให้เอง — เก็บในเครื่องนี้เท่านั้น',
          ['เริ่มเลื่อนดูฟีด', U.feed])}
      </div></section>`;

    const feedBlock = `<section class="sec" aria-label="ฟีดแนวตั้ง">
      <div class="bento">
        <a class="btile feedtile" href="${L(U.feed)}">
          <span class="reelstrip" aria-hidden="true">${['ceo-cold', 'villainess-reborn', 'one-night-bangkok']
            .map(k => `<span>${coverImg(L, BY[k])}</span>`).join('')}</span>
          <h3>ฟีดแนวตั้ง</h3>
          <p>ปัดขึ้นดูเรื่องถัดไป ไม่ต้องเลือกเอง — ทุกคลิปในฟีด<b class="free-c"> ดูฟรี ไม่ต้องสมัคร</b></p>
          <span class="btn btn-accent">${ic('feed', 'sm')} เริ่มเลื่อนดู</span>
        </a>
        <button class="btile" id="randomBtn">
          <h3>สุ่มเรื่องให้ฉัน</h3>
          <p>กดครั้งเดียว ได้เรื่องที่ยังไม่เคยดู พร้อมเล่นตอนแรกทันที</p>
          <span class="btn btn-ghost">${ic('sparkle', 'sm')} สุ่มเลย</span>
        </button>
      </div></section>`;

    const top = section('TOP 10 สัปดาห์นี้',
      rail(L, TOP10.map((s, i) => rankCard(L, s, i + 1)).join('')) +
      sampleNote('ยอดวิวและอันดับเป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง'),
      { more: ['ดูอันดับทั้งหมด', U.popular], L });

    /* ตอนใหม่ล่าสุด — ตอนล่าสุดของ 6 เรื่องที่ออกตอนใหม่ */
    const fresh = SERIES.filter(s => s.status !== 'จบแล้ว').slice(0, 6);
    const newest = section('ตอนใหม่ล่าสุด',
      `<div class="chips" role="group" aria-label="กรองตามแนว" id="homeChips">
        <button class="chip" aria-pressed="true" data-filter="all">ทั้งหมด</button>
        ${D.genres.map(g => `<button class="chip" aria-pressed="false" data-filter="${g.slug}">${g.label}</button>`).join('')}
      </div>
      <div class="list two" id="newList">${fresh.map(s => epRow(L, s, s.eps, { isNew: true })).join('')}</div>
      <p class="empty-inline" id="newEmpty" hidden>ไม่มีตอนใหม่ในแนวนี้</p>`,
      { more: ['ทั้งหมด', U.newEp], L });

    const byGenre = section('เลือกตามแนว',
      `<div class="genre-bento">${D.genres.map(g => {
        const items = seriesOfGenre(g.slug);
        return `<a class="gtile" href="${L(U.genre(g.slug))}">${coverImg(L, items[0])}
          <span>${g.label}</span><span class="cnt num">${items.length} เรื่อง</span></a>`;
      }).join('')}</div>
      ${OPEN_TAGS.length ? `<div class="chips" style="margin-top:var(--s4)">
        <span class="chips-lb">แท็ก</span>
        ${OPEN_TAGS.map(t => `<a class="chip" href="${L(U.tag(t.slug))}">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}
      </div>` : ''}`);

    const follows = `<section class="sec" id="followSec" hidden><div class="sec-h"><h2>ติดตามไว้</h2>
      <a class="more" href="${L(U.library)}?tab=following">ทั้งหมด ${ic('right', 'sm')}</a></div>
      <div id="followRail"></div></section>`;

    const aiBlock = `<section class="sec"><div class="btile flat">
      <h3>${ic('sparkle', 'sm')} ทุกเรื่องสร้างด้วย AI</h3>
      <p>ปก บท และตัวละครทั้งหมดของ LakornAI สร้างด้วยปัญญาประดิษฐ์ โดยทีมงานคนไทยเป็นผู้กำกับทิศทาง</p>
      <a class="btn btn-ghost" href="${L(U.behind)}">ดูเบื้องหลังการสร้าง ${ic('right', 'sm')}</a>
    </div></section>`;

    const intro = `<div class="intro"><h1>ละครสั้น AI ภาษาไทย ดูต่อได้ทุกตอน</h1>
      <p>12 เรื่องไทยที่สร้างด้วย AI ตอนละไม่เกิน 3 นาที — <b class="free-c">${FREE_LINE}</b></p></div>`;

    return shell(L, {
      nav: 'home', active: 'home',
      main: wrapF(L, intro + hero + cont + feedBlock + top + newest + byGenre + follows + aiBlock),
    });
  };

  definePage({
    out: 'index.html', url: U.home, page: 'home',
    title: 'ละครสั้น AI ภาษาไทย ดูฟรีทุกตอน · LakornAI',
    desc: 'ดูละครสั้น AI ภาษาไทย 12 เรื่อง 418 ตอน ฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบทุกเรื่อง จำตอนที่ดูค้างไว้ให้ กดดูต่อได้ทันทีบนมือถือ',
    og: { image: shareImage({}) },
    jsonLd: [websiteLd()],
    body,
  });
}

/* ============================ A2 ฟีดแนวตั้ง ============================ */
export function buildFeed() {
  const body = L => {
    const first = TOP10[0];
    const main = `<main id="main" class="stage">
      <h1 class="sr">ฟีดแนวตั้ง — ละครสั้น AI ดูทีละเรื่อง</h1>
      <div class="feed-desktop">
        <div class="player full" id="feedPlayer" data-slug="${first.slug}">
          ${coverImg(L, first, { lazy: false })}
          <div class="vig"></div>
          <div class="ptop">
            <a class="rnd" href="${L(U.home)}" aria-label="กลับหน้าแรก">${ic('left')}</a>
            <span class="ti"><b>ฟีดแนวตั้ง</b><span id="feedPos">เรื่องที่ 1 จาก ${SERIES.length}</span></span>
            <a class="rnd" href="${L(U.settings)}" aria-label="ตั้งค่าการเล่น">${ic('settings')}</a>
          </div>
          <div class="pstack">
            <div class="pfoot"><div class="ptext">
              <p class="sub-t" id="feedSub"></p>
              <div class="pbody">
                <h2 id="feedTitle">${esc(first.title)} <span class="num" lang="en">EP.1</span></h2>
                <p class="hk" id="feedHook">${esc(first.hook)}</p>
                <div class="btn-row">
                  <a class="btn btn-accent btn-md" id="feedAll" href="${L(U.series(first.slug))}">ดูทั้งเรื่อง ${ic('right', 'sm')}</a>
                  <span class="tag tag-free">${ic('playf', 'sm')} ดูฟรีทุกตอน</span>
                </div></div>
            </div>
            <div class="side">
              <button class="b on" id="feedMute" aria-label="เปิดเสียง (ตอนนี้ปิดเสียงอยู่)">${ic('mute')}</button>
              <span class="lb">ปิดเสียง</span>
              <button class="b" data-follow="${first.slug}" aria-pressed="false" aria-label="ติดตามเรื่องนี้" id="feedFollow">${ic('heart')}</button>
              <a class="b" id="feedEps" href="${L(U.series(first.slug))}#epGrid" aria-label="เลือกตอน">${ic('list')}</a>
              <button class="b" id="feedShare" aria-label="แชร์">${ic('share')}</button>
            </div></div>
            <div><div class="bar"><i style="width:0%"></i></div></div>
          </div>
          <div class="feed-arrows">
            <button class="rnd" id="feedPrev" aria-label="เรื่องก่อนหน้า">${ic('up')}</button>
            <button class="rnd" id="feedNext" aria-label="เรื่องถัดไป">${ic('down')}</button>
          </div>
        </div>
        <aside class="feed-side" id="feedSide"></aside>
      </div>
      <p class="sr" id="feedLive" aria-live="polite"></p>
    </main>`;
    return shell(L, { nav: 'feed', active: 'feed', main });
  };
  definePage({
    out: 'feed/index.html', url: U.feed, page: 'feed', bodyClass: 'stage',
    title: 'ฟีดแนวตั้ง — ละครสั้น AI ปัดดูทีละเรื่อง · LakornAI',
    desc: 'ปัดขึ้นดูละครสั้น AI ภาษาไทยทีละเรื่อง ไม่ต้องเลือกเอง เริ่มจากตอนแรกของทุกเรื่อง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เจอเรื่องที่ชอบแล้วกดดูทั้งเรื่องต่อได้ทันที',
    jsonLd: [collectionLd({
      url: U.feed, name: 'ฟีดแนวตั้ง',
      description: 'ตอนแรกของทุกเรื่องในคลัง เรียงให้ปัดดูต่อเนื่อง', items: SERIES,
    })],
    body,
  });
}

/* ============================ A3 ค้นหา ============================ */
export function buildSearch() {
  const popular = ['ทุเรียน', 'ประธาน', 'ย้อนเวลา', 'ผี', 'แก้แค้น', 'นางร้าย', 'มาเฟีย'];
  const body = L => {
    const main = wrapF(L, `${pageHead('ค้นหาละครสั้น AI')}
      <div class="search-head">
        <div class="search-box"><span class="ic">${ic('search')}</span>
          <input id="q" type="search" placeholder="ค้นหาชื่อเรื่อง ตัวละคร หรือแนว" aria-label="ค้นหาละคร" autocomplete="off">
        </div>
        <div class="chips" id="searchChips" role="group" aria-label="กรองตามแนว">
          <button class="chip" aria-pressed="true" data-filter="all">ทั้งหมด</button>
          ${D.genres.map(g => `<button class="chip" aria-pressed="false" data-filter="${g.slug}">${g.label}</button>`).join('')}
        </div>
      </div>
      <section class="sec" id="recentWrap"><div class="sec-h"><h2>คำค้นยอดนิยม</h2></div>
        <div class="chip-row">${popular.map(p => `<button class="chip" data-q="${p}">${p}</button>`).join('')}</div>
      </section>
      <p class="res-count" id="resCount">ทุกเรื่องในคลัง ${SERIES.length} เรื่อง</p>
      <div class="grid" id="results">${SERIES.map(s => card(L, s, { hook: true })).join('')}</div>
      <div id="noRes" hidden>${empty(L, 'search', 'ไม่พบเรื่องที่ตรงกับคำค้น',
        'ลองคำอื่น หรือเลือกจากแนวด้านบน — คลังของเรามี 12 เรื่อง', ['ดูทุกเรื่องในคลัง', U.az])}</div>`);
    return shell(L, { nav: 'search', active: 'search', main });
  };
  definePage({
    out: 'search/index.html', url: U.search, page: 'search',
    title: 'ค้นหาละครสั้น AI — ตามชื่อเรื่อง ตัวละคร แนว · LakornAI',
    desc: 'ค้นหาละครสั้น AI ภาษาไทยจากชื่อเรื่อง ชื่อตัวละคร หรือกรองตาม 6 แนว ละครแนวตั้ง ผลไม้ ฝรั่ง สยองขวัญ ย้อนเวลา แก้แค้น ทุกเรื่องดูฟรีทุกตอน',
    jsonLd: [collectionLd({
      url: U.search, name: 'ค้นหาละครสั้น AI',
      description: 'ทุกเรื่องในคลัง LakornAI', items: SERIES,
    })],
    body,
  });
}

/* ============================ A6 ฮับเลือกดู ============================ */
export function buildBrowse() {
  const entries = [
    ['chart', 'TOP 10 สัปดาห์นี้', 'อันดับจากยอดวิวสะสม', U.popular],
    ['sparkle', 'ตอนใหม่ล่าสุด', 'ตอนที่เพิ่งปล่อย', U.newEp],
    ['calendar', 'ตารางออกตอน', 'เรื่องไหนออกวันไหน', U.schedule],
    ['list', 'ดัชนี ก–ฮ / A–Z', `ทุกเรื่องในคลัง ${SERIES.length} เรื่อง`, U.az],
  ];
  const body = L => shell(L, {
    active: 'browse',
    main: wrapF(L, `${pageHead('เลือกดู', 'ทางเข้ารวมของทุกหมวด แท็ก และดัชนีในคลัง')}
      ${section('6 แนวหลัก', `<div class="genre-bento">${D.genres.map(g => {
        const items = seriesOfGenre(g.slug);
        return `<a class="gtile" href="${L(U.genre(g.slug))}">${coverImg(L, items[0])}
          <span>${g.label}</span><span class="cnt num">${items.length} เรื่อง</span></a>`;
      }).join('')}</div>`)}
      ${OPEN_TAGS.length
        ? section('แท็กที่เปิดแล้ว',
            `<div class="chip-row">${OPEN_TAGS.map(t =>
              `<a class="chip" href="${L(U.tag(t.slug))}">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}</div>`,
            { sub: 'เปิดเฉพาะแท็กที่มีเรื่อง 3 เรื่องขึ้นไป และไม่ซ้ำกับหมวดที่มีอยู่แล้ว — แท็กจะเพิ่มขึ้นตามคลัง' })
        : ''}
      ${section('ทางเข้าอื่น', `<div class="rowlist">${entries.map(([i, t, s, u]) =>
        `<a href="${L(u)}"><span class="ic">${ic(i)}</span><span>${t}<span class="sub">${s}</span></span><span class="ch">${ic('right', 'sm')}</span></a>`).join('')}</div>`)}`),
  });
  definePage({
    out: 'browse/index.html', url: U.browse,
    title: 'เลือกดูละครสั้น AI — ทุกหมวด แท็ก และดัชนี · LakornAI',
    desc: 'ทางเข้ารวมของคลัง LakornAI เลือกจาก 6 แนวหลัก แท็กเรื่อง อันดับยอดนิยม ตอนใหม่ล่าสุด ตารางออกตอน และดัชนี ก–ฮ ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
    jsonLd: [
      collectionLd({ url: U.browse, name: 'เลือกดู', description: 'ทางเข้ารวมของทุกหมวดและดัชนีในคลัง', items: SERIES }),
      breadcrumb([['หน้าแรก', U.home], ['เลือกดู', U.browse]]),
    ],
    body,
  });
}

/* ============================ A4 หน้าแนว ============================ */
/* title/description คัดลอกจาก onpage-audit (AIO-19) §5.1 ตรงตัว
   genre-western แก้ title/h1 ให้ตรงกับ anchor ในเว็บตาม S8 */
const GENRE_SEO = {
  vertical: ['ละครแนวตั้ง — ละครสั้น AI ดูฟรีทุกตอน · LakornAI',
    'รวมละครแนวตั้ง AI ภาษาไทย ดูจบตอนละ 1–3 นาที บนมือถือแนวตั้ง ฟรีทุกตอน ไม่ต้องสมัครสมาชิก เลือกจากละครสั้นแนวตั้งที่เรียงตอนครบทุกเรื่อง',
    'ละครแนวตั้ง'],
  fruit: ['ละครผลไม้ AI — ดราม่าผลไม้ ดูฟรีทุกตอน · LakornAI',
    'ละครสั้น AI ที่ตัวละครเป็นผลไม้ไทย รัก หักหลัง ชิงสวน ทุเรียน มังคุด ลำไย ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 3 เรื่อง เรียงตอนครบ',
    'ละครผลไม้ AI'],
  western: ['ละครฝรั่ง — ละครสั้น AI พากย์ไทย ดูฟรีทุกตอน · LakornAI',
    'ละครสั้น AI สไตล์ฝรั่ง พากย์ไทยและมีซับไทย ทายาท มาเฟีย รักข้ามชนชั้น ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบตั้งแต่ตอนแรกถึงตอนจบ',
    'ละครฝรั่ง — ละครสั้น AI พากย์ไทย'],
  horror: ['ละครสยองขวัญ AI — ผี บ้านร้าง คำสาป ดูฟรี · LakornAI',
    'ละครสั้นสยองขวัญ AI ภาษาไทย ผี บ้านร้าง คำสาป ดูจบไวตอนละไม่กี่นาที ฟรีทุกตอน ไม่ต้องสมัครสมาชิก แนะนำให้ดูตอนกลางคืนแบบมีเพื่อน',
    'ละครสยองขวัญ AI'],
  timetravel: ['ละครย้อนเวลา AI — ข้ามภพ เกิดใหม่ ดูฟรีทุกตอน · LakornAI',
    'ละครสั้น AI แนวย้อนเวลา ข้ามภพ เกิดใหม่ แก้ไขอดีตให้รักครั้งนี้ไม่พัง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบ ดูต่อจากตอนที่ค้างไว้ได้',
    'ละครย้อนเวลา AI'],
  revenge: ['ละครแก้แค้น AI — ทวงคืนทุกอย่าง ดูฟรีทุกตอน · LakornAI',
    'ละครสั้น AI แนวแก้แค้น ถูกหักหลังจนหมดตัวแล้วกลับมาทวงคืนทุกอย่าง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 4 เรื่อง เรียงตอนครบทุกเรื่อง',
    'ละครแก้แค้น AI'],
};

function catalogBody(L, { h1, intro, items, crumbItems, tagChips = false }) {
  return wrapF(L, `${crumbs(L, crumbItems)}
    ${pageHead(h1)}
    <p class="lead">${esc(intro)}</p>
    ${tagChips && OPEN_TAGS.length ? `<div class="chips"><span class="chips-lb">แท็ก</span>
      ${OPEN_TAGS.map(t => `<a class="chip" href="${L(U.tag(t.slug))}">${t.label}<span class="n num">${t.items.length}</span></a>`).join('')}</div>` : ''}
    <p class="res-count"><b class="num">${items.length}</b> เรื่อง</p>
    ${items.length
      ? `<div class="grid">${items.map(s => card(L, s, { hook: true })).join('')}</div>`
      : empty(L, 'grid', 'แนวนี้ยังไม่มีเรื่อง', 'เรากำลังสร้างเรื่องใหม่ในแนวนี้อยู่ ระหว่างนี้ลองดูแนวที่ใกล้เคียงกัน', ['ดูทุกแนว', U.browse])}`);
}

export function buildGenres() {
  for (const g of D.genres) {
    const items = seriesOfGenre(g.slug);
    const [title, desc, h1] = GENRE_SEO[g.slug];
    definePage({
      out: `genre/${g.slug}/index.html`, url: U.genre(g.slug),
      title, desc,
      jsonLd: [
        collectionLd({ url: U.genre(g.slug), name: h1, description: g.intro, items }),
        breadcrumb([['หน้าแรก', U.home], ['เลือกดู', U.browse], [g.label, U.genre(g.slug)]]),
      ],
      body: L => shell(L, {
        active: 'browse',
        main: catalogBody(L, {
          h1, intro: g.intro, items, tagChips: true,
          crumbItems: [['หน้าแรก', U.home], ['เลือกดู', U.browse], [g.label, null]],
        }),
      }),
    });
  }
}

/* ============================ A5 หน้าแท็ก ============================ */
export function buildTags() {
  for (const t of OPEN_TAGS) {
    const items = t.items.map(k => BY[k]);
    const intro = `แท็ก “${t.label}” เป็นชั้นที่สองซ้อนบน 6 แนวหลัก รวม ${items.length} เรื่องที่เล่าปมเดียวกันแม้จะอยู่คนละแนว `
      + `ได้แก่ ${items.map(s => s.title).join(' · ')} — ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`;
    /* กฎตัดเดียวกับ onpage-audit §5.2 — ยาวเกินเกณฑ์ให้ตัดวรรคท้ายออกก่อน */
    let title = `${t.label} — ละครสั้น AI ${items.length} เรื่อง ดูฟรี · LakornAI`;
    if (title.length > 60) title = `${t.label} — ละครสั้น AI ${items.length} เรื่อง · LakornAI`;
    let desc = `รวมละครสั้น AI ภาษาไทยแท็ก ${t.label} ${items.length} เรื่อง ${items.map(s => s.title).join(' ')} ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`;
    if (desc.length > 160) desc = `รวมละครสั้น AI ภาษาไทยแท็ก ${t.label} ${items.length} เรื่อง ${items.map(s => s.title).join(' ')} ดูฟรีทุกตอน`;
    definePage({
      out: `tag/${t.slug}/index.html`, url: U.tag(t.slug),
      title, desc,
      jsonLd: [
        collectionLd({ url: U.tag(t.slug), name: t.label, description: intro, items }),
        breadcrumb([['หน้าแรก', U.home], ['เลือกดู', U.browse], [t.label, U.tag(t.slug)]]),
      ],
      body: L => shell(L, {
        active: 'browse',
        main: catalogBody(L, {
          h1: `แท็ก: ${t.label}`, intro, items,
          crumbItems: [['หน้าแรก', U.home], ['เลือกดู', U.browse], [t.label, null]],
        }),
      }),
    });
  }
}

/* ============================ A7 ยอดนิยม ============================ */
export function buildPopular() {
  const top3 = TOP10.slice(0, 3), rest = TOP10.slice(3);
  definePage({
    out: 'popular/index.html', url: U.popular,
    title: 'ละครสั้น AI ยอดนิยมสัปดาห์นี้ TOP 10 · LakornAI',
    desc: 'อันดับละครสั้น AI ภาษาไทยที่คนดูมากที่สุดในสัปดาห์นี้ 10 อันดับ พร้อมจำนวนตอนและสถานะออกตอน ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
    jsonLd: [collectionLd({ url: U.popular, name: 'ยอดนิยม TOP 10', description: 'อันดับละครสั้น AI ที่คนดูมากที่สุด', items: TOP10 })],
    body: L => shell(L, {
      active: 'popular',
      main: wrapF(L, `${pageHead('ยอดนิยม TOP 10', 'อันดับจากยอดวิวสะสมในคลัง')}
        <div class="top3row">${top3.map((s, i) => rankCard(L, s, i + 1)).join('')}</div>
        ${sampleNote('ยอดวิวทุกตัวเลขในหน้านี้เป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง')}
        ${section('อันดับ 4–10', `<div class="list">${rest.map((s, i) => `<a class="ep-row" href="${L(U.series(s.slug))}">
          <span class="rkn num">${i + 4}</span>
          <span class="th">${coverImg(L, s)}</span>
          <span class="bd"><span class="h"><b class="tt">${esc(s.title)}</b>${s.status === 'จบแล้ว' ? doneBadge : newBadge}</span>
            <span class="st">${esc(s.views)} วิว · ${s.eps} ตอน · ${s.genres.map(genreLabel).join(' · ')}</span></span>
          <span class="r">${ic('right', 'sm')}</span></a>`).join('')}</div>`)}`),
    }),
  });
}

/* ============================ A8 ตอนใหม่ ============================ */
export function buildNew() {
  const airing = SERIES.filter(s => s.status !== 'จบแล้ว');
  definePage({
    out: 'new/index.html', url: U.newEp,
    title: 'ตอนใหม่ล่าสุด — ละครสั้น AI อัปเดตทุกวัน · LakornAI',
    desc: 'ตอนใหม่ของละครสั้น AI ภาษาไทยที่เพิ่งลง เรียงจากใหม่สุด กรองตามแนวได้ ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก กดเข้าดูได้ทันทีไม่ต้องรอ',
    jsonLd: [collectionLd({
      url: U.newEp, name: 'ตอนใหม่ล่าสุด',
      description: 'ตอนล่าสุดของทุกเรื่องที่ยังออกตอนอยู่', items: airing,
    })],
    body: L => shell(L, {
      active: 'new',
      main: wrapF(L, `${pageHead('ตอนใหม่ล่าสุด', 'ตอนล่าสุดของทุกเรื่องที่ยังออกตอนอยู่')}
        <div class="chips" id="homeChips" role="group" aria-label="กรองตามแนว">
          <button class="chip" aria-pressed="true" data-filter="all">ทั้งหมด</button>
          ${D.genres.map(g => `<button class="chip" aria-pressed="false" data-filter="${g.slug}">${g.label}</button>`).join('')}</div>
        <div class="list two" id="newList">${airing.map(s => epRow(L, s, s.eps, { isNew: true })).join('')}</div>
        <p class="empty-inline" id="newEmpty" hidden>ไม่มีตอนใหม่ในแนวนี้</p>
        ${section('เรื่องที่จบแล้ว ดูรวดเดียวจบ',
          `<div class="grid">${SERIES.filter(s => s.status === 'จบแล้ว').map(s => card(L, s)).join('')}</div>`)}`),
    }),
  });
}

/* ============================ A9 ตารางออกตอน ============================ */
export function buildSchedule() {
  const daily = SERIES.filter(isDaily);
  const weekly = SERIES.filter(s => isAiring(s) && !isDaily(s));
  definePage({
    out: 'schedule/index.html', url: U.schedule,
    title: 'ตารางออกตอน — ละครสั้น AI เรื่องไหนออกวันไหน · LakornAI',
    desc: 'ตารางออกตอนของละครสั้น AI ภาษาไทยทุกเรื่องในคลัง เรื่องไหนปล่อยตอนใหม่ทุกวัน เรื่องไหนรายสัปดาห์และกี่โมง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
    jsonLd: [collectionLd({
      url: U.schedule, name: 'ตารางออกตอน',
      description: 'รอบปล่อยตอนใหม่ของทุกเรื่องในคลัง', items: [...daily, ...weekly],
    })],
    body: L => shell(L, {
      active: 'browse',
      main: wrapF(L, `${pageHead('ตารางออกตอน', 'เรื่องไหนปล่อยตอนใหม่วันไหน เวลาเท่าไร')}
        ${section('ออกทุกวัน', `<div class="list">${daily.map(s => `<a class="ep-row" href="${L(U.series(s.slug))}">
            <span class="th">${coverImg(L, s)}</span>
            <span class="bd"><span class="h"><b class="tt">${esc(s.title)}</b>${newBadge}</span>
              <span class="st">${esc(s.airtime)} · ${s.eps} ตอน · ${s.genres.map(genreLabel).join(' · ')}</span></span>
            <span class="r">${ic('right', 'sm')}</span></a>`).join('')}</div>`,
          { sub: `${daily.length} เรื่องที่ปล่อยตอนใหม่ทุกวัน` })}
        ${section('ออกรายสัปดาห์', `<div class="list">${weekly.map(s => `<a class="ep-row" href="${L(U.series(s.slug))}">
            <span class="th">${coverImg(L, s)}</span>
            <span class="bd"><span class="h"><b class="tt">${esc(s.title)}</b></span>
              <span class="st">${esc(s.airtime)} · ${s.eps} ตอน · ${s.genres.map(genreLabel).join(' · ')}</span></span>
            <span class="r">${ic('right', 'sm')}</span></a>`).join('')}</div>`)}
        ${section('จบแล้ว ไม่มีตอนใหม่',
          `<div class="grid">${SERIES.filter(s => !isAiring(s)).map(s => card(L, s)).join('')}</div>`)}`),
    }),
  });
}

/* ============================ A10 ดัชนี ============================ */
export function buildAZ() {
  const sorted = [...SERIES].sort((a, b) => a.title.localeCompare(b.title, 'th'));
  definePage({
    out: 'az/index.html', url: U.az,
    title: 'ดัชนีละครสั้น AI ทุกเรื่อง ก–ฮ / A–Z · LakornAI',
    desc: `รายชื่อละครสั้น AI ภาษาไทยทั้ง ${SERIES.length} เรื่องในคลัง LakornAI เรียงตามตัวอักษร พร้อมแนว จำนวนตอน และสถานะออกตอน ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
    jsonLd: [collectionLd({ url: U.az, name: 'ดัชนีทุกเรื่อง', description: 'รายชื่อทุกเรื่องในคลัง', items: sorted })],
    body: L => shell(L, {
      active: 'browse',
      main: wrapF(L, `${pageHead('ดัชนีทุกเรื่อง', `รายชื่อแบบแบนของทั้ง ${SERIES.length} เรื่อง`)}
        <div class="flatlist">${sorted.map(s => `<a href="${L(U.series(s.slug))}">
          <span class="th2">${coverImg(L, s)}</span>
          <span class="t">${esc(s.title)}</span>
          <span class="m">${s.genres.map(genreLabel).join(' · ')} · ${s.eps} ตอน · ${esc(s.status)}</span>
          ${ic('right', 'sm')}</a>`).join('')}</div>`),
    }),
  });
}

/* ============================ B6 ตัวละคร ============================ */
export function buildCast() {
  for (const c of CAST_PAGES) {
    definePage({
      /* ชื่อโฟลเดอร์ใช้ชื่อจริง (ไทย) · URL เป็นรูป encode — เซิร์ฟเวอร์ decode แล้วหาเจอ */
      out: `cast/${c.name}/index.html`, url: U.cast(c.name),
      title: `${c.name} — ตัวละครในละครสั้น AI ${c.items.length} เรื่อง · LakornAI`,
      desc: `${c.name} เป็นตัวละครใน ${c.items.map(s => s.title).join(' · ')} ละครสั้น AI ภาษาไทยของ LakornAI ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
      jsonLd: [breadcrumb([['หน้าแรก', U.home], ['ตัวละคร', U.az], [c.name, U.cast(c.name)]])],
      body: L => shell(L, {
        main: wrapF(L, `${crumbs(L, [['หน้าแรก', U.home], ['ตัวละคร', U.az], [c.name, null]])}
          <div class="cast-head">
            <span class="avatar" aria-hidden="true">${esc(c.name[0])}</span>
            <div><h1>${esc(c.name)}</h1><p>ปรากฏใน ${c.items.length} เรื่อง</p></div></div>
          <div class="grid">${c.items.map(s => card(L, s, { hook: true })).join('')}</div>
          ${sampleNote('หน้านี้ใช้ avatar ตัวอักษร เพราะข้อมูลตัวละครเก็บเป็นชื่อล้วน ยังไม่มีรูปประกอบตัวละคร')}`),
      }),
    });
  }
}
