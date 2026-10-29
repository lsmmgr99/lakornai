/* กลุ่ม C (คลังของฉัน) · D (ของฉัน) · E (onboarding) · F (สถานะระบบ) · G (คอนเทนต์/กฎหมาย) */
import { D, U, SERIES, TOP10, genreLabel, seriesOfGenre, OPEN_TAGS } from './content.mjs';
import {
  definePage, shell, pageHead, crumbs, rail, section, card, poster, coverImg,
  ic, esc, footer, empty, localNote, sampleNote, freeAllBar, FREE_LINE,
} from './ui.mjs';
import { breadcrumb, faqLd, SITE_NAME, abs, coverSlot } from './seo.mjs';

const wrapF = (L, inner, cls = '') => `<main id="main" class="page"><div class="wrap${cls ? ' ' + cls : ''}">${inner}</div>${footer(L)}</main>`;

/* ============================ C1 คลังของฉัน ============================ */
/* AC-2 · ทุกแท็บอ่านจาก localStorage ตอนรันไทม์
   HTML ที่ส่งออกคือสถานะว่างของแท็บ "ดูต่อ" ซึ่งเป็นความจริงของเบราว์เซอร์ที่ยังไม่มีข้อมูล
   ไม่มีเลขตอนหรือเปอร์เซ็นต์ที่เขียนมืออยู่ในไฟล์นี้ */
export function buildLibrary() {
  const tabs = [['continue', 'ดูต่อ'], ['following', 'ติดตาม'], ['done', 'ดูจบแล้ว'], ['history', 'ประวัติ']];
  definePage({
    out: 'library/index.html', url: U.library, page: 'library',
    robots: 'noindex,follow',   /* เนื้อหาส่วนตัวอ่านจากเครื่องผู้ใช้ — AIO-19 C-04 */
    title: 'คลังของฉัน — ดูต่อ ติดตาม ดูจบแล้ว · AiLakorn',
    desc: 'ตอนที่ดูค้างไว้ เรื่องที่ติดตาม เรื่องที่ดูจบแล้ว และประวัติการดู รวมอยู่ที่เดียว ข้อมูลเก็บในเครื่องนี้ ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน',
    body: L => shell(L, {
      nav: 'library', active: 'library',
      main: wrapF(L, `${pageHead('คลังของฉัน')}
        <div class="tabs" role="tablist" aria-label="แท็บคลังของฉัน" id="libTabs">
          ${tabs.map(([k, l], i) => `<button role="tab" id="tab-${k}" data-tab="${k}"
            aria-selected="${i === 0}" aria-controls="libPanel">${l}</button>`).join('')}
        </div>
        <div id="libNote" hidden>${localNote()}</div>
        <div id="libPanel" role="tabpanel" aria-labelledby="tab-continue">
          ${empty(L, 'playf', 'ยังไม่มีเรื่องที่ดูค้าง',
            'กดดูสักตอน แล้วเว็บจะจำตอนและเวลาที่ค้างไว้ให้เอง — เก็บในเครื่องนี้เท่านั้น',
            ['เริ่มเลื่อนดูฟีด', U.feed])}
        </div>`),
    }),
  });
}

/* ============================ D1 ตั้งค่า ============================ */
export function buildSettings() {
  const row = (label, sub, ctrl) => `<div class="r"><span class="rl">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span>${ctrl}</div>`;
  const sw = (key, on) => `<button class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-setting="${key}"><span class="sr">${label(key)}</span></button>`;
  const LB = { autoplay: 'เล่นตอนถัดไปอัตโนมัติ', sound: 'เล่นเสียงอัตโนมัติ', subs: 'เปิดซับไตเติลเสมอ', notify: 'แจ้งเตือนตอนใหม่' };
  function label(k) { return LB[k] || k; }

  definePage({
    out: 'settings/index.html', url: U.settings, page: 'settings',
    robots: 'noindex,follow',
    title: 'ตั้งค่าการเล่นและข้อมูลในเครื่อง · AiLakorn',
    desc: 'ตั้งค่าการเล่นตอนถัดไปอัตโนมัติ เสียง ซับไตเติล และการแจ้งเตือนของ AiLakorn รวมถึงล้างประวัติการดูและคลังที่เก็บอยู่ในเบราว์เซอร์เครื่องนี้',
    body: L => shell(L, {
      back: ['ตั้งค่า', U.home],
      main: wrapF(L, `${pageHead('ตั้งค่า', 'บันทึกทันทีที่สลับ — ไม่มีปุ่มยืนยัน และไม่ต้องมีบัญชี')}
        ${section('การเล่น', `<div class="rowlist">
          ${row('เล่นตอนถัดไปอัตโนมัติ', 'นับถอยหลัง 5 วินาทีเมื่อดูจบตอน', sw('autoplay', true))}
          ${row('เล่นเสียงอัตโนมัติ', 'ค่าเริ่มต้นคือปิดเสียง แตะที่จอเพื่อเปิด', sw('sound', false))}
          ${row('เปิดซับไตเติลเสมอ', null, sw('subs', true))}
        </div>`)}
        ${section('การแจ้งเตือน', `<div class="rowlist">
          ${row('ตอนใหม่ของเรื่องที่ติดตาม', 'อ่านจากรายการติดตามในเครื่องนี้', sw('notify', true))}
        </div>`)}
        ${section('ภาษา', `<div class="rowlist">
          ${row('ภาษาของเว็บไซต์', 'ตอนนี้มีเฉพาะภาษาไทย — โครงสร้าง URL เตรียมรองรับภาษาอื่นไว้แล้ว',
            '<span class="rv">ไทย (เท่านั้น)</span>')}
        </div>`)}
        ${section('ข้อมูลในเครื่องนี้', `<div class="rowlist">
          <div class="r"><span class="rl">ประวัติการดู<span class="sub" id="histCount">เก็บในเครื่องนี้เท่านั้น</span></span>
            <button class="btn btn-ghost btn-sm" id="clearHistory">ล้างประวัติ</button></div>
          <div class="r"><span class="rl">คลังทั้งหมด<span class="sub">ดูต่อ ติดตาม ดูจบแล้ว ประวัติ และการตั้งค่า</span></span>
            <button class="btn btn-danger btn-sm" id="clearAll">ล้างข้อมูล</button></div>
        </div>
        <p class="note-ex">${ic('alert', 'sm')}<span>การล้างข้อมูลย้อนกลับไม่ได้ และไม่มีบัญชีให้กู้คืน — จะถามยืนยัน 1 ชั้นก่อนลบ</span></p>`)}
        <p class="ver">AiLakorn เวอร์ชัน 2.0</p>`, 'narrow'),
    }),
  });
}

/* ============================ D2 แจ้งเตือน ============================ */
export function buildNotifications() {
  definePage({
    out: 'notifications/index.html', url: U.notifications, page: 'notifications',
    robots: 'noindex,follow',
    title: 'การแจ้งเตือนตอนใหม่ของเรื่องที่ติดตาม · AiLakorn',
    desc: 'ตอนใหม่ของเรื่องที่คุณกดติดตามไว้ รวมอยู่ที่นี่ รายการอ่านจากรายการติดตามในเบราว์เซอร์เครื่องนี้ ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน',
    body: L => shell(L, {
      back: ['การแจ้งเตือน', U.home],
      main: wrapF(L, `${pageHead('การแจ้งเตือน')}
        <div id="notifList">
          ${empty(L, 'bell', 'ยังไม่มีการแจ้งเตือน',
            'เมื่อเรื่องที่คุณติดตามปล่อยตอนใหม่ เราจะแจ้งที่นี่', ['ไปติดตามเรื่องที่ชอบ', U.popular])}
        </div>`, 'narrow'),
    }),
  });
}

/* ============================ E1 เลือกแนวที่ชอบ ============================ */
export function buildWelcome() {
  definePage({
    out: 'welcome/index.html', url: U.welcome, page: 'welcome',
    robots: 'noindex,follow',
    title: 'เลือกแนวละครสั้นที่ชอบ เพื่อให้เราแนะนำตรงใจ · AiLakorn',
    desc: 'เลือกแนวละครสั้น AI ที่คุณชอบอย่างน้อย 1 แนว เพื่อให้หน้าแรกแนะนำเรื่องที่ตรงใจตั้งแต่ครั้งแรก เปลี่ยนภายหลังได้ที่ตั้งค่า ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก',
    body: L => shell(L, {
      main: `<main id="main" class="page"><div class="wrap narrow">
        <div class="page-head center">
          <span class="bigico">${ic('sparkle', 'lg')}</span>
          <h1>เลือกแนวที่ชอบ</h1>
          <p>เลือกอย่างน้อย 1 อย่าง เพื่อให้เราแนะนำเรื่องที่ตรงใจตั้งแต่หน้าแรก — เปลี่ยนภายหลังได้ที่ตั้งค่า</p></div>
        <div class="pickgrid" id="prefGrid">
          ${D.genres.map(g => {
            const items = seriesOfGenre(g.slug);
            return `<button class="gtile" data-pref="${g.slug}" aria-pressed="false">${coverImg(L, items[0])}
              <span>${g.label}</span></button>`;
          }).join('')}
        </div>
        <div class="btn-row center">
          <a class="btn btn-ghost" href="${L(U.home)}">ข้ามไปก่อน</a>
          <a class="btn btn-accent is-disabled" id="prefGo" href="${L(U.home)}" aria-disabled="true">เริ่มดูเลย</a>
        </div>
        <div class="perm center">${ic('playf', 'sm')}<span><b>${FREE_LINE}</b></span></div>
        ${sampleNote('ตัวเลือกนี้เก็บในเครื่องนี้เท่านั้น')}
      </div>${footer(L)}</main>`,
    }),
  });
}

/* ============================ F1 404 / F2 ออฟไลน์ ============================ */
export function buildSystem() {
  definePage({
    out: '404/index.html', url: U.notFound,
    robots: 'noindex,follow',
    title: 'ไม่พบหน้าที่คุณหา (404) · AiLakorn',
    desc: 'ไม่พบหน้าที่คุณเปิด ลิงก์อาจหมดอายุหรือถูกย้าย เริ่มใหม่จากหน้าแรก ค้นหาชื่อเรื่อง หรือเลือกจากเรื่องยอดนิยมของ AiLakorn',
    body: L => shell(L, {
      main: wrapF(L, `<div class="sys">
        <div class="big404" lang="en" aria-hidden="true">404</div>
        <h1>ไม่พบหน้าที่คุณหา</h1>
        <p>ลิงก์อาจหมดอายุ หรือเรื่องนี้ถูกย้ายไปแล้ว ลองเริ่มจากหน้าแรกหรือค้นหาชื่อเรื่องดู</p>
        <div class="btn-row center">
          <a class="btn btn-accent" href="${L(U.home)}">กลับหน้าแรก</a>
          <a class="btn btn-ghost" href="${L(U.search)}">${ic('search', 'sm')} ค้นหา</a></div></div>
        ${section('เรื่องยอดนิยมตอนนี้', rail(L, TOP10.slice(0, 6).map(s => card(L, s)).join('')))}`),
    }),
  });

  definePage({
    out: 'offline/index.html', url: U.offline,
    robots: 'noindex,follow',
    title: 'อินเทอร์เน็ตหลุด — ลองเชื่อมต่อใหม่ · AiLakorn',
    desc: 'ตอนนี้เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่ รายการเรื่องที่ดูค้างไว้ยังอ่านได้จากเบราว์เซอร์เครื่องนี้',
    body: L => shell(L, {
      main: wrapF(L, `<div class="sys">
        <div class="sysico">${ic('wifioff', 'lg')}</div>
        <h1>อินเทอร์เน็ตหลุด</h1>
        <p>ตรวจสอบการเชื่อมต่อแล้วลองใหม่ — เรื่องที่ดูค้างไว้ยังเปิดดูรายการได้จากเครื่องของคุณ</p>
        <button class="btn btn-accent" id="retryBtn">${ic('refresh', 'sm')} ลองใหม่</button></div>
        <section class="sec"><div class="sec-h"><h2>เรื่องที่ดูค้างไว้ (จากเครื่องนี้)</h2></div>
          <p class="sec-sub">รายการนี้อ่านจากเครื่องของคุณ จึงยังเห็นได้แม้เน็ตหลุด</p>
          <div id="contRail" data-empty-cta="${L(U.home)}">
            ${empty(L, 'playf', 'ยังไม่มีเรื่องที่ดูค้าง', 'เมื่อกลับมาออนไลน์ ลองเริ่มดูสักตอนแล้วเว็บจะจำให้เอง', ['กลับหน้าแรก', U.home])}
          </div></section>`),
    }),
  });
}

/* ============================ G1–G7 ============================ */
const FAQS = [
  ['ต้องสมัครสมาชิกไหม เสียเงินไหม',
    'ไม่ต้อง และไม่เสีย — ทุกเรื่องทุกตอนดูฟรี ไม่มีการสมัครสมาชิก ไม่มีการเติมเงิน และไม่มีตอนที่ล็อกไว้ กดเล่นได้ทันทีตั้งแต่ตอนแรกถึงตอนจบ'],
  ['ดูต่อจากที่ค้างไว้ได้ยังไง',
    'เว็บจำตอนและเวลาที่คุณดูค้างไว้ให้เองในเครื่องนี้ กลับมาที่หน้าแรกหรือหน้าคลังของฉัน แท็บ “ดูต่อ” แล้วกดเล่นต่อจากจุดเดิมได้เลย'],
  ['ตอนใหม่ออกเมื่อไหร่',
    'แต่ละเรื่องมีรอบปล่อยตอนของตัวเอง ดูได้ที่หน้าตารางออกตอน และถ้ากดติดตามไว้ เราจะแจ้งที่หน้าการแจ้งเตือนเมื่อมีตอนใหม่'],
  ['คลังของฉันหายไปทำไม',
    'เพราะไม่มีระบบบัญชี คลังจึงเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ เปลี่ยนเครื่อง หรือเปิดในโหมดส่วนตัว รายการจะไม่ตามไปด้วย'],
  ['ย้ายคลังไปเครื่องอื่นได้ไหม',
    'ยังไม่ได้ในเวอร์ชันนี้ — การซิงก์ข้ามเครื่องต้องมีบัญชีผู้ใช้ ซึ่งเราเลือกที่จะไม่มี เพื่อให้เริ่มดูได้ทันทีโดยไม่ต้องกรอกอะไร'],
  ['วิดีโอเล่นไม่ได้ ทำยังไง',
    'ลองรีเฟรชหน้า เช็กการเชื่อมต่อ หรือเปิดด้วยเบราว์เซอร์อื่น ถ้ายังไม่ได้แจ้งเราที่หน้าติดต่อ'],
];

export function buildContent() {
  /* G1 เกี่ยวกับเรา */
  definePage({
    out: 'about/index.html', url: U.about,
    title: 'เกี่ยวกับ AiLakorn — ละครสั้น AI ไทย ดูฟรีทุกตอน',
    desc: 'AiLakorn ทำละครสั้น AI ภาษาไทยต้นฉบับ 12 เรื่อง 418 ตอน บทเขียนโดยคน ภาพและเสียงสร้างด้วย AI ดูฟรีทุกตอน ไม่มีค่าสมาชิก ไม่ต้องล็อกอิน',
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'AboutPage', url: abs(U.about),
      name: 'เกี่ยวกับ AiLakorn', inLanguage: 'th',
      mainEntity: { '@type': 'Organization', name: SITE_NAME, url: abs('/') },
    }],
    body: L => shell(L, {
      main: wrapF(L, `${pageHead('เกี่ยวกับ AiLakorn',
        `ละครสั้นแนวตั้งสัญชาติไทย ที่ปก บท และตัวละครทุกตัวสร้างด้วย AI — <strong>${FREE_LINE}</strong>`)}
        <div class="prose">
          <p>AiLakorn เกิดจากคำถามเดียว — ถ้าคนไทยดูละครสั้นวันละ 20 นาทีระหว่างเดินทาง เราจะทำละครที่<strong>เริ่มจากศูนย์แล้วจบในหนึ่งคืน</strong>ได้ไหม</p>
          <h2>${FREE_LINE}</h2>
          <p>นี่คือจุดยืนของเรา ไม่ใช่โปรโมชัน — ทุกเรื่องทุกตอนบน AiLakorn เปิดให้ดูได้ทันที <strong>ไม่มีตอนที่ล็อกไว้ ไม่มีแพ็กเกจให้สมัคร และไม่มีแบบฟอร์มให้กรอกก่อนกดเล่น</strong> เราเชื่อว่าสิ่งที่ทำให้คนกลับมาดูคือตอนถัดไปที่ดีพอ ไม่ใช่กำแพงที่ขัดจังหวะตอนกำลังสนุก</p>
          <h2>เราทำอะไร</h2>
          <p>เราเขียนโครงเรื่องแบบไทย ๆ ที่คนไทยอินจริง — แก้แค้น ซ่อนตัวตน ข้ามภพ — แล้วใช้ AI ช่วยสร้างบท ปก และตัวละคร โดยมีทีมงานคนไทยเป็นผู้กำกับทิศทางทุกขั้นตอน</p>
          <div class="stat-row">
            <div><b class="num">${SERIES.length}</b><span>เรื่องในคลัง</span></div>
            <div><b class="num">${SERIES.reduce((a, s) => a + s.eps, 0)}</b><span>ตอนทั้งหมด</span></div>
            <div><b class="num">3</b><span>นาทีต่อตอน</span></div></div>
          <h2>ทำไมต้องแนวตั้ง</h2>
          <p>เพราะมือถือคือจอหลักของคนไทย การถ่ายแนวตั้งไม่ใช่ข้อจำกัด แต่เป็นการเลือกภาษาภาพที่ตรงกับวิธีที่คนดูจริง ๆ</p>
          <h2>“ละครผลไม้ AI” คืออะไร</h2>
          <p>เป็นแนวที่เราสร้างเอง ไม่มีที่ไหนทำ — ตัวละครเป็นผลไม้ไทยที่มีชีวิต มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น เป็นแนวที่คนจำเราได้</p>
        </div>
        <a class="btn btn-accent" href="${L(U.behind)}">${ic('sparkle', 'sm')} ดูเบื้องหลังการสร้างด้วย AI</a>`, 'narrow'),
    }),
  });

  /* G2 ติดต่อ */
  definePage({
    out: 'contact/index.html', url: U.contact, page: 'contact',
    title: 'ติดต่อทีมงาน AiLakorn — แจ้งปัญหา ติดต่องาน',
    desc: 'ติดต่อทีมงาน AiLakorn แจ้งปัญหาการรับชม เสนอเรื่องใหม่ หรือติดต่อเรื่องงานร่วมกัน กรอกฟอร์มแล้วทีมงานจะตอบกลับทางอีเมล',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'ContactPage', url: abs(U.contact), name: 'ติดต่อ AiLakorn', inLanguage: 'th' }],
    body: L => shell(L, {
      main: wrapF(L, `${pageHead('ติดต่อเรา', 'มีคำถาม ติชม หรืออยากร่วมงาน ส่งมาได้เลย เราอ่านทุกข้อความ')}
        <form id="contactForm" novalidate>
          <label class="field"><span>ชื่อของคุณ</span><input name="name" required placeholder="ชื่อ-นามสกุล"></label>
          <label class="field"><span>อีเมล</span><input name="email" type="email" required placeholder="you@example.com"></label>
          <label class="field"><span>หัวข้อ</span><select name="topic">
            <option>ปัญหาการใช้งาน</option><option>แจ้งปัญหาการเล่นวิดีโอ</option><option>ร่วมงานกับเรา</option></select></label>
          <label class="field"><span>ข้อความ</span><textarea name="msg" required placeholder="เล่าให้เราฟัง…"></textarea></label>
          <button class="btn btn-accent btn-block" type="submit">ส่งข้อความ</button>
        </form>
        ${sampleNote('ฟอร์มนี้ตรวจความถูกต้องของช่องกรอกจริง แต่ยังไม่ได้ต่อระบบส่งอีเมล')}`, 'narrow'),
    }),
  });

  /* G3 ช่วยเหลือ */
  definePage({
    out: 'help/index.html', url: U.help,
    title: 'ช่วยเหลือ AiLakorn — คำถามที่พบบ่อยเรื่องการดู',
    desc: 'คำถามที่พบบ่อยของ AiLakorn ต้องสมัครสมาชิกไหม ดูต่อจากที่ค้างไว้ยังไง ตอนใหม่ออกเมื่อไหร่ และทำไมคลังของฉันถึงอยู่แค่ในเครื่องนี้',
    jsonLd: [faqLd(FAQS)],
    body: L => shell(L, {
      main: wrapF(L, `${pageHead('ช่วยเหลือ', 'คำถามที่คนถามบ่อยที่สุด')}
        ${FAQS.map(([q, a], i) => `<div class="acc${i === 0 ? ' open' : ''}">
          <button class="q" aria-expanded="${i === 0}" aria-controls="faq-${i}">${esc(q)}<span class="ch">${ic('down', 'sm')}</span></button>
          <div class="a" id="faq-${i}"${i === 0 ? '' : ' hidden'}>${esc(a)}</div></div>`).join('')}
        <div class="panel center">
          <h3>ยังไม่เจอคำตอบ</h3>
          <p>ส่งคำถามมาที่ทีมงาน เราตอบภายใน 2 วันทำการ</p>
          <a class="btn btn-accent" href="${L(U.contact)}">${ic('mail', 'sm')} ติดต่อเรา</a></div>`, 'narrow'),
    }),
  });

  /* G4–G6 หน้ากฎหมาย */
  const legal = (slug, title, icon, desc, sections) => definePage({
    out: `legal/${slug}/index.html`, url: U.legal(slug),
    title: `${title} · AiLakorn`, desc,
    jsonLd: [breadcrumb([['หน้าแรก', U.home], ['ข้อกำหนด', U.legal(slug)], [title, U.legal(slug)]])],
    body: L => shell(L, {
      main: wrapF(L, `${crumbs(L, [['หน้าแรก', U.home], [title, null]])}
        ${pageHead(title, 'ปรับปรุงล่าสุด 23 ตุลาคม 2569')}
        <div class="prose">${sections.map(([h, ps], i) =>
          `<h2 id="s${i + 1}">${i + 1}. ${esc(h)}</h2>${ps.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}</div>`, 'narrow'),
    }),
  });

  legal('terms', 'ข้อตกลงการใช้บริการ', 'file',
    'ข้อตกลงการใช้บริการ AiLakorn การใช้งานโดยไม่ต้องลงทะเบียน สิทธิ์ในเนื้อหาที่สร้างด้วย AI และการใช้งานที่ห้าม', [
    ['การยอมรับข้อตกลง', ['การเข้าใช้ AiLakorn ถือว่าคุณยอมรับข้อตกลงฉบับนี้ หากไม่ยอมรับ กรุณาหยุดใช้บริการ']],
    ['การใช้งานโดยไม่ต้องลงทะเบียน', ['บริการนี้เปิดให้ดูได้ทุกตอนโดยไม่ต้องลงทะเบียนและไม่มีค่าใช้จ่าย เราไม่มีระบบบัญชีผู้ใช้ ความคืบหน้าการดูจึงผูกกับเบราว์เซอร์ที่คุณใช้']],
    ['เนื้อหาและลิขสิทธิ์', ['เนื้อหาทั้งหมดรวมถึงปกและบทที่สร้างด้วย AI เป็นของ AiLakorn ห้ามทำซ้ำหรือเผยแพร่ต่อโดยไม่ได้รับอนุญาต']],
    ['การใช้งานที่ห้าม', ['ห้ามดาวน์โหลด บันทึกหน้าจอเพื่อเผยแพร่ต่อ หรือใช้เครื่องมืออัตโนมัติดึงเนื้อหา']],
    ['การเปลี่ยนแปลงข้อตกลง', ['เราอาจปรับปรุงข้อตกลงนี้ และจะแจ้งให้ทราบผ่านหน้านี้อย่างน้อย 7 วันก่อนมีผล']],
  ]);
  legal('privacy', 'นโยบายความเป็นส่วนตัว', 'shield',
    'AiLakorn ไม่มีระบบบัญชีผู้ใช้ จึงไม่เก็บชื่อ อีเมล หรือเบอร์มือถือ ประวัติการดูและคลังของคุณอยู่ใน localStorage ของเบราว์เซอร์เครื่องคุณเท่านั้น', [
    ['เราไม่มีบัญชีผู้ใช้', ['AiLakorn ไม่มีระบบสมัครสมาชิกหรือเข้าสู่ระบบ เราจึงไม่เก็บชื่อ เบอร์มือถือ อีเมล หรือวิธีการชำระเงินของคุณเลย เพราะไม่มีขั้นตอนไหนที่ต้องใช้']],
    ['ข้อมูลที่มี อยู่ในเครื่องของคุณ', ['ประวัติการดู ความคืบหน้าของแต่ละตอน รายการติดตาม แนวที่เลือกไว้ และการตั้งค่า ถูกเก็บใน localStorage ของเบราว์เซอร์คุณเท่านั้น ไม่ถูกส่งมาที่เซิร์ฟเวอร์ของเรา และไม่ซิงก์ข้ามเครื่อง']],
    ['ผลที่ตามมาที่คุณควรรู้', ['เพราะข้อมูลอยู่ในเครื่อง ถ้าคุณล้างข้อมูลเบราว์เซอร์ เปลี่ยนเครื่อง หรือใช้โหมดส่วนตัว คลังของคุณจะหายและกู้คืนไม่ได้ — เราไม่มีสำเนาไว้ให้']],
    ['การลบข้อมูล', ['คุณลบได้เองทั้งหมดที่หน้าตั้งค่า โดยไม่ต้องติดต่อเรา และไม่ต้องรอการอนุมัติ']],
    ['การเปิดเผยต่อบุคคลที่สาม', ['เราไม่ขายข้อมูลส่วนบุคคล และในเวอร์ชันนี้ไม่มีสคริปต์วิเคราะห์หรือโฆษณาจากบุคคลที่สาม']],
  ]);
  legal('cookies', 'นโยบายคุกกี้', 'cookie',
    'AiLakorn ใช้เฉพาะที่เก็บข้อมูลในเบราว์เซอร์เพื่อจำการตั้งค่าการเล่นและตอนที่ดูค้างไว้ ไม่มีคุกกี้ระบุตัวตน ไม่มีคุกกี้โฆษณา', [
    ['คุกกี้คืออะไร', ['ไฟล์ข้อมูลเล็ก ๆ ที่เบราว์เซอร์เก็บไว้เพื่อให้เว็บจำการตั้งค่าของคุณได้']],
    ['เราใช้อะไรบ้าง', ['เว็บนี้ไม่ได้ตั้งคุกกี้เพื่อระบุตัวตนเลย ใช้เพียง localStorage ของเบราว์เซอร์เพื่อจำการตั้งค่าการเล่น ตอนที่ดูค้างไว้ และรายการติดตาม ซึ่งไม่ถูกส่งออกจากเครื่องคุณ']],
    ['คุกกี้วิเคราะห์', ['ในเวอร์ชันนี้ยังไม่มีการใช้คุกกี้วิเคราะห์หรือโฆษณาจากบุคคลที่สาม']],
    ['การจัดการ', ['คุณล้างได้เองจากหน้าตั้งค่าของเรา หรือจากการตั้งค่าเบราว์เซอร์ แต่ถ้าล้างแล้ว การจำตอนที่ดูค้างจะหายไปด้วย']],
  ]);

  /* G7 เบื้องหลัง AI — หน้าเดียวที่ส่งลิงก์ครบทั้ง 12 เรื่อง */
  definePage({
    out: 'behind-the-ai/index.html', url: U.behind,
    title: 'เบื้องหลังการสร้างด้วย AI — ปกละคร 12 เรื่อง · AiLakorn',
    desc: 'ดูเบื้องหลังการสร้างละครสั้น AI ของ AiLakorn ภาพปกทั้ง 12 เรื่องพร้อมแนวทางที่ใช้สร้างจริง และขั้นตอนจากบทถึงตอนที่ได้ดู',
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs(U.behind),
      name: 'เบื้องหลังการสร้างด้วย AI', inLanguage: 'th',
      /* ที่วางนี้เคยประกอบพาธปกเอง (`/assets/covers/${slug}.webp`) + ฝังขนาด 1024×1536 ไว้ตรง ๆ
         ซึ่งขัดหลักของ ADR-001 §13.5 ("ที่วางประกาศทรงที่ต้องการ ไม่ใช่ประกาศไฟล์") และสัญญา
         §13.4 อนุญาตให้ `cover` ชี้ไฟล์ชื่ออะไรก็ได้ใน assets/covers/ ⇒ เรื่องที่ชื่อไฟล์ปก
         ไม่เท่ากับ slug จะส่ง contentUrl ที่ไม่มีไฟล์จริงเข้า structured data แบบเงียบ ๆ
         (ไม่มีด่านใดจับ — ด่านวัดกล่องที่ render ไม่ได้อ่าน JSON-LD · ปิดช่องนี้ด้วยข้อ
          "พาธภาพใน JSON-LD ต้องมีไฟล์จริง" ในส่วน 6 ของ tools/test-layout.mjs)
         ค่าที่ส่งออกวันนี้ไม่ขยับแม้ไบต์เดียว: 12/12 เรื่องมีปกตามแบบแผนและเป็น 1024×1536 */
      hasPart: SERIES.map(s => {
        const cs = coverSlot(s, 'poster');
        return {
          '@type': 'ImageObject',
          contentUrl: abs(cs.url),
          name: `ปก ${s.title}`, width: cs.w, height: cs.h,
        };
      }),
    }],
    body: L => shell(L, {
      main: wrapF(L, `${pageHead('เบื้องหลังการสร้างด้วย AI',
        'ปกทั้ง 12 ใบของเราสร้างด้วย AI จากคำสั่งภาษาไทย–อังกฤษที่ทีมเขียนเอง')}
        <div class="bento">
          <div class="btile flat"><h3>เขียนโครงเรื่องแบบไทย</h3>
            <p>ทีมคนไทยวางพล็อต แก้แค้น ซ่อนตัวตน ข้ามภพ ให้จบใน 3 นาทีต่อตอน</p></div>
          <div class="btile flat"><h3>สร้างปกด้วย AI</h3>
            <p>เขียนคำสั่งระบุแสง มุมกล้อง และอารมณ์ แล้วคัดจากหลายร้อยภาพเหลือใบเดียว</p></div>
        </div>
        ${section('ปกทั้ง 12 ใบ',
          `<div class="grid">${SERIES.map(s => `<a class="card" href="${L(U.series(s.slug))}">
            ${poster(L, s, { badges: ['<span class="tag tag-ai">AI</span>'], showViews: false, alt: `ปก ${s.title} — ละครสั้น AI ${genreLabel(s.genres[0])}` })}
            <span class="t">${esc(s.title)}</span>
            <span class="m">${genreLabel(s.genres[0])} · ${s.eps} ตอน</span></a>`).join('')}</div>`)}
        <div class="perm neutral"><span class="ic">${ic('sparkle', 'sm')}</span>
          <span><b>ทุกภาพในเว็บนี้สร้างด้วย AI</b> ไม่มีการใช้ภาพถ่ายของบุคคลจริง และตัวละครทุกตัวเป็นตัวละครสมมติ</span></div>`),
    }),
  });
}
