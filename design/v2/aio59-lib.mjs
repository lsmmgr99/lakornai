/* ============================================================================
   AIO-59 · ของกลางของสามสคริปต์: ตัววัด (aio59-map) · ตัวถ่ายภาพ (aio59-frames) · ด่าน (check-aio59)
   UX-Designer · 25 ต.ค. 2026

   ทำไมเป็นไฟล์เดียว: ทั้งสามตัวต้อง "แพตช์หน้าฟีดให้เป็นเรื่องแนวนอน" ด้วยวิธีเดียวกันเป๊ะ
   ถ้าก๊อปแพตช์ไปวางสามที่ วันที่แก้ที่เดียวแล้วอีกสองที่ไม่ตาม = ตัวเลขในเอกสารกับภาพที่
   ลูกค้าอนุมัติจะเป็นของคนละแบบ โดยไม่มีด่านไหนฟ้อง

   วัดจาก "เว็บจริงที่ build ออกมา" (http://127.0.0.1:<port>/feed/) ไม่ใช่จากม็อกอัพใน design/v2/
   เพราะเครื่องเรือนของฟีดที่เป็นโจทย์ของใบงานนี้ถูกวางโดย build/pages-discovery.mjs
   และความสูงกล่องจริงหัก header sticky 58px ซึ่งม็อกอัพไม่มี (ดูคอมเมนต์ `.stage .player.full`)
   ========================================================================== */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';

export const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
export const PROPOSAL_CSS = path.join(DIR, 'aio59-feed-wide.css');

/* 7 ขนาดจอ = ชุดเดียวกับเกณฑ์ฟอลด์ A/B/C ของ AIO-38 เป๊ะ (tools/test-layout.mjs ค่าคงที่
   FOLD_VIEWPORTS) · ไม่พิมพ์ชุดใหม่เอง เพราะใบงานสั่ง "ชุดเดิม" และชุดนั้นมีเจ้าของอยู่แล้ว
   dpr/mobile: มือถือต้อง mobile:true ไม่งั้นสกรอลล์บาร์กิน 15px แล้วเลขไม่ตรงกับที่ลูกค้าวัดเอง */
export const VIEWPORTS = [
  { tag: '1920x1080', w: 1920, h: 1080, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1920×1080' },
  { tag: '1440x900', w: 1440, h: 900, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1440×900' },
  { tag: '1366x768', w: 1366, h: 768, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1366×768' },
  { tag: '1280x800', w: 1280, h: 800, dpr: 1.5, mobile: false, label: 'เดสก์ท็อป 1280×800' },
  { tag: '820x1180', w: 820, h: 1180, dpr: 2, mobile: true, label: 'แท็บเล็ต 820×1180' },
  { tag: '768x1024', w: 768, h: 1024, dpr: 2, mobile: true, label: 'แท็บเล็ต 768×1024' },
  { tag: '390x844', w: 390, h: 844, dpr: 2, mobile: true, label: 'มือถือ 390×844' },
];

/* เรื่องที่ใช้ทำภาพ/วัด — ต้องเป็นเรื่องเดียวกันทั้งใบแนวตั้งและใบแนวนอน ไม่งั้นลูกค้าเทียบ
   "ทรงกล่อง" ไม่ได้ เพราะภาพคนละเรื่องกันดึงสายตาไปที่เนื้อหา · durian-revenge = เรื่องแรกของฟีด
   (build/pages-discovery.mjs ฝัง slug เรื่องแรกไว้ที่กล่อง #feedPlayer) ⇒ ไม่ต้องกดลูกศรก่อนถ่าย */
export const DEMO_SLUG = 'durian-revenge';
export const WIDE_SRC = `/design/v2/wide-out/${DEMO_SLUG}.webp`;
/* ปก 2:3 ของเรื่องเดียวกัน — เป็นภาพที่กล่องสื่อใช้จริงวันนี้ตามกฎ M2 (ดูเอกสาร §กฎภาพ)
   เพราะแผ่นกว้างของ AIO-56 เว้นครึ่งซ้ายเป็นพื้นเบลอไว้ให้ตัวหนังสือของฮีโร่ โดยตั้งใจ */
export const POSTER_SRC = `/assets/covers/${DEMO_SLUG}.webp`;

/* ---------------------------------------------------------------------------
   แพตช์ = สิ่งที่เสนอให้ Dev ทำจริง เขียนเป็นสคริปต์ที่รันในหน้าเว็บ ไม่มีไฟล์ไหนถูกเขียนทับ
   สองส่วน และมีแค่สองส่วน:
     1. CSS — เนื้อไฟล์ design/v2/aio59-feed-wide.css ทั้งไฟล์ ใส่เป็น <style> ท้าย <head>
        (ของจริง Dev เอาบล็อกนี้ต่อท้ายส่วน "--- ฟีด ---" ของ design/v2/v2.css แล้ว
         build/build.mjs:225 พา CSS เข้า assets/site.css ให้เอง — ไม่มีใครแก้ assets/ ตรง ๆ)
     2. โครง DOM — เปลี่ยน <img> ลูกตรงของ .player.full เป็นสองชั้น (ฉากหลัง + กล่องสื่อ)
        แล้วติดคลาส wide ที่กล่อง · เครื่องเรือนทั้งสามชิ้นไม่ถูกแตะแม้บรรทัดเดียว
   --------------------------------------------------------------------------- */
export const patchScript = (css, opt = {}) => `(() => {
  /* pos = null โดยตั้งใจ: ถ้าตั้งค่าตั้งต้นเป็น '50% 50%' มันจะกลายเป็น inline style
     ที่ชนะกฎ .clip-poster ในไฟล์ CSS ที่เสนอ แล้วภาพที่ถ่ายจะไม่ใช่สิ่งที่กฎทำจริง */
  const OPT = ${JSON.stringify({ src: WIDE_SRC, pos: null, poster: false, ...opt })};
  const box = document.querySelector('.player.full');
  if (!box) throw new Error('ไม่พบ .player.full');
  if (!document.getElementById('aio59css')) {
    const st = document.createElement('style');
    st.id = 'aio59css';
    st.textContent = ${JSON.stringify(css)};
    document.head.appendChild(st);
  }
  const old = box.querySelector(':scope > img');
  if (!old) throw new Error('ไม่พบ <img> ลูกตรงของ .player.full (โครงเปลี่ยนไปแล้ว — แพตช์นี้ต้องตามไปแก้)');
  const src = OPT.src;
  /* ฉากหลัง: ไฟล์เดียวกับกล่องสื่อ ⇒ เบราว์เซอร์โหลดครั้งเดียว ไม่มีไบต์เพิ่ม
     aria-hidden + alt ว่าง ⇒ โปรแกรมอ่านหน้าจอยังเห็นภาพเดียว ไม่ใช่สองภาพซ้อน */
  const bg = document.createElement('div');
  bg.className = 'bgfill';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<img alt="" src="' + src + '">';
  /* กล่องสื่อ: .mwin = หน้าต่างสื่อ (กรอบหักที่จองไว้หัว-ท้าย) · .clip = กล่องทรงคลิป */
  const win = document.createElement('div');
  win.className = 'mwin';
  win.innerHTML = '<div class="clip"><img alt="" src="' + src + '"></div>';
  const cimg = win.querySelector('img');
  cimg.alt = old.alt || '';
  /* clip-poster = กรณีที่ build ถอยไปใช้ปก 2:3 เพราะยังไม่มีแผ่นกว้างที่ผ่านกฎ M2 */
  if (OPT.poster) win.querySelector('.clip').classList.add('clip-poster');
  /* จุดยึดภาพในกล่อง: ค่าตั้งต้น 50% 50% · เปลี่ยนได้เพื่อถ่ายใบเทียบว่าถ้าองค์ประกอบของไฟล์
     ไม่ได้อยู่กลางแผ่น ภาพในกล่องจะออกมาเป็นอย่างไร (ดู §องค์ประกอบของไฟล์ ในเอกสาร) */
  if (OPT.pos) cimg.style.objectPosition = OPT.pos;
  const vig = box.querySelector('.vig');
  box.insertBefore(bg, box.firstChild);
  box.insertBefore(win, vig ? vig.nextSibling : box.firstChild);
  old.remove();
  /* เครื่องหมายทิศ = data-orientation ของ Dev (AIO-57) ไม่ใช่คลาสคู่ขนานที่ตั้งใหม่ */
  box.dataset.orientation = 'horizontal';
  return { ok: true, src };
})()`;

/* ทางเลือก (ข) ของใบงาน: "เต็มจอครอปเหมือนวันนี้" — เอาไฟล์แนวนอนใส่กรอบเดิมตรง ๆ
   ไม่ใส่ CSS ใหม่เลย · มีไว้เพื่อให้ตารางเทียบและภาพให้ลูกค้าเห็นว่าทางนี้เสียอะไร */
export const cropScript = (wideSrc = WIDE_SRC) => `(() => {
  const img = document.querySelector('.player.full > img');
  if (!img) throw new Error('ไม่พบ <img> ลูกตรงของ .player.full');
  img.removeAttribute('width'); img.removeAttribute('height');
  img.src = ${JSON.stringify(wideSrc)};
  return { ok: true };
})()`;

/* ทางเลือก (ก2) ที่ CTO อ้างใน ADR-001 §13.7 D8 ข้อ 1: 16:9 ในกรอบเดิมแบบ contain
   = "เหลือภาพจริงราว 32% ของความสูงจอ ที่เหลือเป็นดำ" · วัดให้เห็นว่าเลขนั้นถูก */
export const containScript = (wideSrc = WIDE_SRC) => `(() => {
  const img = document.querySelector('.player.full > img');
  if (!img) throw new Error('ไม่พบ <img> ลูกตรงของ .player.full');
  img.removeAttribute('width'); img.removeAttribute('height');
  img.src = ${JSON.stringify(wideSrc)};
  img.style.objectFit = 'contain';
  return { ok: true };
})()`;

/* ---------------------------------------------------------------------------
   ตัววัด: คืนกรอบของทุกชิ้นที่ใบงานถาม + ขนาดภาพที่ "เห็นจริง" หลัง object-fit
   สูตรภาพที่เห็นจริง (cover): กล่องกว้างกว่าไฟล์ ⇒ เต็มกว้าง ตัดสูง · แคบกว่า ⇒ เต็มสูง ตัดกว้าง
   (contain กลับด้าน) — คิดจาก naturalWidth/Height ของไฟล์ที่ใส่จริง ไม่ใช่จากค่าที่เขียนไว้ใน CSS
   --------------------------------------------------------------------------- */
export const MEASURE = `(() => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }; };
  const box = document.querySelector('.player.full');
  const clip = box.querySelector('.clip');
  const media = clip || box;
  const img = media.querySelector('img') || box.querySelector(':scope > img');
  const vis = (() => {
    if (!img || !img.naturalWidth) return null;
    const b = media.getBoundingClientRect();
    const arBox = b.width / b.height, arImg = img.naturalWidth / img.naturalHeight;
    const fit = getComputedStyle(img).objectFit;
    let w, h;
    if (fit === 'contain') {
      if (arBox > arImg) { h = b.height; w = h * arImg; } else { w = b.width; h = w / arImg; }
    } else { w = b.width; h = b.height; }
    /* เห็นเนื้อภาพกี่ % ของไฟล์ (cover ตัดทิ้ง · contain ไม่ตัด) */
    const seen = fit === 'contain' ? 1 : (arBox > arImg ? arImg / arBox : arBox / arImg);
    return { w: +w.toFixed(1), h: +h.toFixed(1), seen: +seen.toFixed(4), fit,
             natW: img.naturalWidth, natH: img.naturalHeight, src: img.currentSrc || img.src };
  })();
  const btn = sel => [...box.querySelectorAll(sel)].map(r);
  const navEl = document.querySelector('.bottom');
  const navFixed = navEl && getComputedStyle(navEl).position === 'fixed';
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    frame: r(box), ptop: r(box.querySelector('.ptop')), pos: r(document.getElementById('feedPos')),
    pstack: r(box.querySelector('.pstack')), ptext: r(box.querySelector('.ptext')),
    bar: r(box.querySelector('.bar')), side: r(box.querySelector('.side')),
    clip: r(clip), bgfill: r(box.querySelector('.bgfill')),
    sideBtns: btn('.side .b'), arrows: btn('.feed-arrows .rnd'), topBtns: btn('.ptop .rnd'),
    cta: btn('.btn-row .btn'),
    nav: navFixed ? r(navEl) : null,
    header: r(document.querySelector('header.top')),
    headerFixed: (() => { const hd = document.querySelector('header.top');
      return hd ? getComputedStyle(hd).position : null; })(),
    vis,
  };
})()`;

/* ---------- พอร์ตที่ OS เลือกให้ ----------
   workspace นี้แชร์กับ run อื่น · พอร์ตคงที่ชนแล้ว chrome จะไปขึ้นที่ [::1] แต่ยังพิมพ์บรรทัด
   DevTools ออกมาเหมือนสำเร็จ (บทเรียน AIO-45) ⇒ ขอพอร์ตว่างจาก OS ทุกครั้ง */
export function freePort(envName) {
  if (envName && process.env[envName]) return Promise.resolve(+process.env[envName]);
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- เปิดเซิร์ฟเวอร์ของ run นี้ แล้วพิสูจน์ว่าพอร์ตเป็นของเราจริง ----------
   "มีใครตอบ HTTP ที่พอร์ตนี้" ไม่ใช่หลักฐาน — ไฟล์ของ run อื่นก็ทำให้ด่านเขียวได้
   หลักฐานที่ใช้: ลูกของเราต้องยังมีชีวิต และต้องเสิร์ฟไฟล์ที่เราเพิ่งเขียนลงดิสก์เองได้ */
export async function serveRepo() {
  const port = await freePort('AIO59_PORT');
  const stamp = `aio59-${process.pid}-${Date.now()}`;
  const probe = path.join(ROOT, `.aio59-probe-${process.pid}.txt`);
  fs.writeFileSync(probe, stamp);
  const srv = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
  let dead = null;
  srv.on('exit', c => { dead = c; });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; i < 80; i++) {
      if (dead !== null) throw new Error(`tools/serve.mjs ตายตอนเริ่ม (exit ${dead})`);
      try {
        const r = await fetch(`${base}/${path.basename(probe)}`);
        if (r.ok && (await r.text()) === stamp) {
          const f = await fetch(`${base}/feed/`);
          if (f.ok) return { base, port, stop: () => { srv.kill('SIGTERM'); fs.rmSync(probe, { force: true }); } };
        }
      } catch { /* ยังไม่ขึ้น */ }
      await sleep(100);
    }
    throw new Error(`เซิร์ฟเวอร์ที่พอร์ต ${port} ไม่ใช่ของ run นี้ หรือไม่ขึ้นใน 8 วินาที`);
  } catch (e) {
    srv.kill('SIGTERM'); fs.rmSync(probe, { force: true });
    throw e;
  }
}

/* ---------- chrome + CDP ---------- */
export async function openChrome() {
  const port = await freePort('AIO59_CDP');
  const chrome = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dbus', '--hide-scrollbars',
    '--disable-lcd-text', '--force-color-profile=srgb', '--font-render-hinting=none',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*', 'about:blank',
  ], { stdio: 'ignore' });

  let ws = null;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) { ws = j.webSocketDebuggerUrl; break; }
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  if (!ws) { chrome.kill('SIGKILL'); throw new Error(`เชื่อม chrome ที่พอร์ต ${port} ไม่ได้`); }

  const sock = new WebSocket(ws);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let id = 0; const pending = new Map();
  sock.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej });
    sock.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description
        || r.exceptionDetails.text || 'สคริปต์ในหน้าเว็บโยน error');
    }
    return r.result.value;
  };
  return {
    send, evaluate,
    async viewport(vp) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: vp.mobile,
        screenWidth: vp.w, screenHeight: vp.h,
      });
    },
    async goto(url) {
      await send('Page.navigate', { url });
      /* พร้อม = DOM เสร็จ + ฟอนต์โหลดจบ + ภาพในกล่องฟีดถอดรหัสแล้ว
         ไม่ใช้ [...document.images].every(complete): รูป lazy ของแถวอื่นไม่มีวันครบในกรอบจอเดียว
         และ fonts.status ยังเป็น 'loading' ตอน readyState เป็น complete แล้ว (บทเรียน AIO-45) */
      for (let i = 0; i < 120; i++) {
        const ready = await evaluate(`(() => {
          if (document.readyState !== 'complete') return false;
          if (document.fonts.status !== 'loaded') return false;
          const box = document.querySelector('.player.full');
          if (!box) return false;
          return [...box.querySelectorAll('img')].every(im => im.complete && im.naturalWidth > 0);
        })()`);
        if (ready === true) break;
        await sleep(80);
      }
      await sleep(140);
    },
    async settle() {
      for (let i = 0; i < 120; i++) {
        const ready = await evaluate(`[...document.querySelectorAll('.player.full img')]
          .every(im => im.complete && im.naturalWidth > 0) && document.fonts.status === 'loaded'`);
        if (ready === true) break;
        await sleep(80);
      }
      await sleep(140);
    },
    async shot({ jpeg = false } = {}) {
      /* กรอบจอเดียวเสมอ — ไม่ตั้ง captureBeyondViewport และไม่ยืด viewport ตามความสูงหน้า
         นี่คือข้อที่ใบงานสั่งย้ำ: ภาพเลื่อนทั้งหน้าคือวิธีที่ทำให้บั๊กฮีโร่หลุดไปสามรอบ */
      const r = jpeg
        ? await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
        : await send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: false });
      return Buffer.from(r.data, 'base64');
    },
    close() { try { sock.close(); } catch { /* ปิดไปแล้ว */ } chrome.kill('SIGTERM'); },
  };
}

export const readProposalCss = () => {
  if (!fs.existsSync(PROPOSAL_CSS)) throw new Error(`ไม่พบ ${PROPOSAL_CSS}`);
  return fs.readFileSync(PROPOSAL_CSS, 'utf8');
};

export const pct = (a, b) => +(a / b * 100).toFixed(1);
