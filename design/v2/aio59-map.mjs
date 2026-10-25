/* ============================================================================
   AIO-59 ข้อ 3 · ตารางตัวเลขที่วัดได้ ครบ 7 ขนาดจอ
   UX-Designer · 25 ต.ค. 2026

   รัน:  node design/v2/aio59-map.mjs
         AIO59_PORT=… AIO59_CDP=… node design/v2/aio59-map.mjs   → กำหนดพอร์ตเองถ้าชนกับ run อื่น

   ของที่เขียนออก
     design/v2/aio59-measured.json              ตัวเลขดิบทุกตัว (ให้ด่านและเอกสารอ่านต่อ)
     design/v2/AIO-59-FEED-ORIENTATION.md       แทนที่เนื้อในบล็อก <!-- MEASURED:BEGIN/END -->

   วัดจากเว็บจริงที่ build ออกมาแล้ว (feed/index.html ในรีโป) ไม่ใช่จากม็อกอัพและไม่ใช่จากการอ่าน CSS
   ⚠️ สคริปต์นี้ **ไม่** รัน build/build.mjs — workspace นี้แชร์กับ run อื่นที่กำลังแก้ build/
      ⇒ วัดไฟล์ที่คอมมิตไว้ตามสภาพ และบันทึก sha ของ feed/index.html ลง json ให้ตรวจย้อนได้
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DIR, ROOT } from './lib.mjs';
import {
  VIEWPORTS, MEASURE, DEMO_SLUG, WIDE_SRC, POSTER_SRC,
  serveRepo, openChrome, patchScript, cropScript, containScript, readProposalCss, pct,
} from './aio59-lib.mjs';

const OUT_JSON = path.join(DIR, 'aio59-measured.json');
const DOC = path.join(DIR, 'AIO-59-FEED-ORIENTATION.md');
const ROUND = n => +n.toFixed(1);

/* ปุ่มที่ผู้ชมกดได้ในกล่องฟีด — เอามาจาก DOM ไม่ใช่รายชื่อที่เขียนมือ
   (2 ปุ่มหัวกล่อง + 4 ปุ่มแถวขวา + 2 ลูกศร + CTA "ดูทั้งเรื่อง" = 9 ชิ้นวันนี้) */
const BTN_KEYS = ['topBtns', 'sideBtns', 'arrows', 'cta'];
const buttons = m => BTN_KEYS.flatMap(k => (m[k] || []).map(r => ({ k, r })));

/* "เหนือฟอลด์" ของหน้าที่เลื่อนไม่ได้ = อยู่ในกรอบจอทั้งชิ้น และไม่มุดใต้ของที่ลอยทับ
   (header sticky ด้านบน · แถบเมนูล่างที่ position:fixed บนมือถือ/แท็บเล็ต) */
/* ⚠️ `.bottom` (แถบเมนูล่าง) ยังมี position:fixed บนเดสก์ท็อปทั้งที่ display:none ⇒ กรอบเป็น 0×0
   ถ้าเชื่อ position เพียว ๆ ขอบล่างจะกลายเป็น y=0 แล้วด่านจะฟ้องว่าปุ่มทุกชิ้นตกฟอลด์ทั้งที่ไม่จริง
   ⇒ นับเป็นของที่ลอยทับเฉพาะเมื่อมันสูงจริง */
function foldReport(m) {
  const topEdge = m.headerFixed === 'sticky' && m.header ? m.header.bottom : 0;
  const botEdge = m.nav && m.nav.h > 0 ? m.nav.top : m.vh;
  const bad = buttons(m).filter(({ r }) =>
    r.top < topEdge - 0.5 || r.bottom > botEdge + 0.5 || r.left < -0.5 || r.right > m.vw + 0.5);
  return { total: buttons(m).length, bad: bad.map(b => ({ k: b.k, r: b.r })), topEdge, botEdge };
}

/* วัดความสว่างจริงจากภาพที่เรนเดอร์ออกมา (ไม่ใช่จากค่าใน CSS)
   วิธี: ถ่ายกรอบจอเดียว → ส่ง data: URL กลับเข้าหน้าเว็บ → canvas → getImageData
   data: URL ไม่ทำให้ canvas tainted ⇒ อ่านพิกเซลได้จริง */
async function luminance(br, regions, dpr) {
  const png = await br.shot();
  const b64 = png.toString('base64');
  return br.evaluate(`(async () => {
    const im = new Image();
    im.src = 'data:image/png;base64,' + ${JSON.stringify(b64)};
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    c.getContext('2d').drawImage(im, 0, 0);
    const ctx = c.getContext('2d');
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const out = {};
    for (const [name, rc] of Object.entries(${JSON.stringify(regions)})) {
      const x = Math.max(0, Math.round(rc.x * ${dpr})), y = Math.max(0, Math.round(rc.y * ${dpr}));
      const w = Math.min(c.width - x, Math.round(rc.w * ${dpr})), h = Math.min(c.height - y, Math.round(rc.h * ${dpr}));
      if (w <= 0 || h <= 0) { out[name] = null; continue; }
      const d = ctx.getImageData(x, y, w, h).data;
      let sum = 0, max = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const Y = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
        sum += Y; if (Y > max) max = Y; n++;
      }
      out[name] = { mean: +(sum / n).toFixed(4), max: +max.toFixed(4), px: n };
    }
    return out;
  })()`);
}

const srv = await serveRepo();
const br = await openChrome();
const css = readProposalCss();
const rows = [];
let stories = null;

try {
  for (const vp of VIEWPORTS) {
    await br.viewport(vp);

    /* ---- ก. เรื่องแนวตั้ง = สภาพวันนี้ (ไม่แพตช์อะไรเลย) ---- */
    await br.goto(`${srv.base}/feed/`);
    const tall = await br.evaluate(MEASURE);

    /* ---- ข. ความสูงแคปชันของทั้ง 12 เรื่อง — ที่จองก้นกล่องจะถูกหรือผิดอยู่ที่เลขนี้ ---- */
    const stack = await br.evaluate(`(() => {
      const out = [];
      const pos = document.getElementById('feedPos');
      const total = +(pos.textContent.match(/จาก (\\d+)/) || [0, 0])[1];
      for (let i = 0; i < total; i++) {
        const b = document.querySelector('.pstack').getBoundingClientRect();
        out.push({ t: document.getElementById('feedTitle').textContent.trim(),
                   h: +b.height.toFixed(1), top: +b.top.toFixed(1) });
        document.getElementById('feedNext').click();
      }
      return out;
    })()`);
    if (!stories) stories = stack.length;

    /* ---- ค. ทางเลือก (ข) ของใบงาน: เอาไฟล์แนวนอนใส่กรอบเดิม ครอปเต็มจอเหมือนวันนี้ ---- */
    await br.goto(`${srv.base}/feed/`);
    await br.evaluate(cropScript());
    await br.settle();
    const crop = await br.evaluate(MEASURE);

    /* ---- ง. ตัวเลขที่ CTO อ้างใน ADR-001 §13.7 D8: 16:9 ในกรอบเดิมแบบ contain ---- */
    await br.goto(`${srv.base}/feed/`);
    await br.evaluate(containScript());
    await br.settle();
    const contain = await br.evaluate(MEASURE);

    /* ---- จ. กฎเดียวกัน แต่ใส่แผ่นกว้าง 11:5 ของ AIO-56 ลงกล่อง (ให้เห็นว่าทำไมกฎ M2 ต้องมี) ---- */
    await br.goto(`${srv.base}/feed/`);
    await br.evaluate(patchScript(css, { src: WIDE_SRC }));
    await br.settle();
    const plate = await br.evaluate(MEASURE);

    /* ---- ฉ. ข้อเสนอของใบงานนี้ (ภาพในกล่องตามกฎ M2 = ปก 2:3 ของเรื่องเดียวกัน) ---- */
    await br.goto(`${srv.base}/feed/`);
    const beforePatch = await br.evaluate(MEASURE);
    await br.evaluate(patchScript(css, { src: POSTER_SRC, poster: true }));
    await br.settle();
    const wide = await br.evaluate(MEASURE);

    /* ความสว่างจริง รอบที่ 1: กล่องสื่อ กับ ฉากหลังช่วงเหนือกล่อง (ไม่มีเครื่องเรือนอยู่ในสองย่านนี้) */
    const REG = {
      clip: { x: wide.clip.x, y: wide.clip.y, w: wide.clip.w, h: wide.clip.h },
      behindRail: { x: wide.side.x, y: wide.side.y, w: wide.side.w, h: wide.side.h },
      behindCaption: { x: wide.ptext.x, y: wide.ptext.y, w: wide.ptext.w, h: wide.ptext.h },
      bandAboveClip: { x: wide.frame.x, y: wide.ptop.bottom + 4, w: wide.frame.w,
        h: Math.max(8, wide.clip.y - wide.ptop.bottom - 8) },
    };
    const lum = await luminance(br, REG, vp.dpr);
    /* รอบที่ 2: ซ่อนเครื่องเรือนแล้ววัดย่านเดิมอีกครั้ง — ไม่งั้น "ความสว่างของฉากหลังหลังแคปชัน"
       จะรวมพิกเซลของตัวหนังสือขาวเข้าไปด้วย แล้วเลขคอนทราสต์ที่คิดจากมันก็ไม่มีความหมาย
       visibility:hidden ไม่ใช่ display:none ⇒ ผังไม่ขยับ ย่านที่วัดจึงเป็นย่านเดียวกันเป๊ะ */
    await br.evaluate(`(() => { const st = document.createElement('style');
      st.id = 'aio59hide';
      st.textContent = '.player .ptop,.player .pstack,.player .feed-arrows{visibility:hidden}';
      document.head.appendChild(st); return true; })()`);
    const lumBare = await luminance(br, REG, vp.dpr);
    await br.evaluate(`(() => { document.getElementById('aio59hide').remove(); return true; })()`);
    lum.behindRail = lumBare.behindRail;
    lum.behindCaption = lumBare.behindCaption;

    /* กรอบเครื่องเรือนต้องเท่ากันทุกค่า ก่อน/หลัง — นี่คือข้อ 5 ของใบงาน วัดเป็นตัวเลข ไม่ใช่คำพูด */
    const FURNITURE = ['frame', 'ptop', 'pos', 'pstack', 'ptext', 'bar', 'side'];
    const moved = FURNITURE.filter(k => JSON.stringify(beforePatch[k]) !== JSON.stringify(wide[k]));
    const btnMoved = BTN_KEYS.filter(k => JSON.stringify(beforePatch[k]) !== JSON.stringify(wide[k]));

    /* ขอบล่างกล่องสื่อผ่ากลางปุ่มไหน (กฎ R4) — ปุ่มที่ถูกเส้นตัดผ่านตัวมันเอง */
    const bisected = buttons(wide).filter(({ r }) =>
      wide.clip.bottom > r.top + 0.5 && wide.clip.bottom < r.bottom - 0.5);

    rows.push({
      vp, stack: { max: Math.max(...stack.map(s => s.h)), min: Math.min(...stack.map(s => s.h)),
        n: stack.length, titles: new Set(stack.map(s => s.t)).size },
      tall: { frame: tall.frame, vis: tall.vis, fold: foldReport(tall) },
      crop: { vis: crop.vis, fold: foldReport(crop) },
      contain: { vis: contain.vis },
      plate: { clip: plate.clip, vis: plate.vis },
      bisected: bisected.map(b => b.k),
      wide: {
        frame: wide.frame, clip: wide.clip, vis: wide.vis, fold: foldReport(wide),
        gapTop: ROUND(wide.clip.top - wide.ptop.bottom),
        gapBot: ROUND(wide.pstack.top - wide.clip.bottom),
        moved, btnMoved, lum,
      },
    });
    process.stdout.write(`\r วัดแล้ว ${rows.length}/${VIEWPORTS.length} (${vp.tag})`.padEnd(60));
  }
} finally {
  br.close();
  srv.stop();
}
console.log('');

/* ======================= ตารางสำหรับเอกสาร ======================= */
const yn = b => (b ? 'ใช่' : '**ไม่**');
const t1 = [
  '**ตาราง 1 · ข้อเสนอ (เรื่องแนวนอน) ครบ 7 ขนาดจอ** — ทุกค่าหน่วยเป็น CSS px',
  '',
  '| จอ | กรอบฟีด | กล่องสื่อ 16:9 | ภาพจริง % ของความสูงจอ | ภาพจริง % ของพื้นที่จอ | ฉากหลัง % ของกรอบ | พื้นที่ดำ | ช่องหายใจ บน/ล่าง | ปุ่มเหนือฟอลด์ |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => {
    const { clip, frame, fold } = r.wide;
    const picArea = clip.w * clip.h, scr = r.vp.w * r.vp.h;
    const back = pct(frame.w * frame.h - picArea, frame.w * frame.h);
    return `| ${r.vp.label} | ${frame.w}×${frame.h} | ${clip.w}×${clip.h} | **${pct(clip.h, r.vp.h)}%**`
      + ` | ${pct(picArea, scr)}% | ${back}% | **0%** (เบลอจากภาพเดียวกัน)`
      + ` | ${r.wide.gapTop}/${r.wide.gapBot} | ${fold.bad.length === 0 ? `ครบ ${fold.total}/${fold.total}` : `**ตก ${fold.bad.length}**`} |`;
  }),
].join('\n');

const t2 = [
  '**ตาราง 2 · เทียบทุกทางที่พิจารณา** — ค่าที่มือถือ 390×844 และเดสก์ท็อป 1440×900',
  '',
  '> "เห็นเนื้อไฟล์" = สัดส่วนของไฟล์ต้นทางที่ไม่ถูก `object-fit:cover` ตัดทิ้ง',
  '> "ภาพคมเต็มกรอบ" = ในกล่องสื่อไม่มีย่านที่เป็นพื้นเบลอของไฟล์เอง (ตัดสินจากภาพที่แนบมา ไม่ใช่จากค่า CSS)',
  '',
  '| ทาง | ไฟล์ในกล่อง | ภาพจริง % ของความสูงจอ | เห็นเนื้อไฟล์ | ภาพคมเต็มกรอบ | พื้นที่ดำ % ของกรอบ | เครื่องเรือนย้ายไหม |',
  '|---|---|---|---|---|---|---|',
  ...['390x844', '1440x900'].flatMap(tag => {
    const r = rows.find(x => x.vp.tag === tag);
    const scrH = r.vp.h, fh = r.wide.frame.h;
    return [
      `| **(ค) ข้อเสนอนี้** · ${tag} | ปก 2:3 | **${pct(r.wide.clip.h, scrH)}%** | ${(r.wide.vis.seen * 100).toFixed(1)}% (ตัดบน-ล่าง) | **ใช่** | 0% | **ไม่ย้าย** |`,
      `| (ค′) กฎเดียวกัน แต่ใส่แผ่นกว้าง 11:5 · ${tag} | coverWide | ${pct(r.plate.clip.h, scrH)}% | ${(r.plate.vis.seen * 100).toFixed(1)}% (ตัดข้างละ 9.6%) | **ไม่** — ซ้าย 44% เป็นพื้นเบลอของแผ่น | 0% | ไม่ย้าย |`,
      `| (ข) เต็มจอครอปเหมือนวันนี้ · ${tag} | coverWide | ${pct(fh, scrH)}% | **${(r.crop.vis.seen * 100).toFixed(1)}%** | ไม่ | 0% | ไม่ย้าย |`,
      `| (ก2) 11:5 ในกรอบเดิมแบบ contain ปล่อยดำ · ${tag} | coverWide | ${pct(r.contain.vis.h, scrH)}% | 100% | ไม่ | **${pct(fh - r.contain.vis.h, fh)}%** | ไม่ย้าย |`,
      `| เรื่องแนวตั้งวันนี้ (ของอ้างอิง) · ${tag} | ปก 2:3 | ${pct(fh, scrH)}% | ${(r.tall.vis.seen * 100).toFixed(1)}% | ใช่ | 0% | — |`,
    ];
  }),
].join('\n');

const t3 = [
  '**ตาราง 3 · ข้อ 5 ของใบงาน: สลับแนวตั้ง↔แนวนอนแล้วอะไรขยับ** — วัดกรอบ (x/y/w/h) ก่อนและหลัง',
  '',
  '| จอ | กรอบฟีด · ตัวนับ · แคปชัน · แถบปุ่มขวา · แถบความคืบหน้า | ปุ่มทั้ง 9 ชิ้น | ความสูงแคปชันของ 12 เรื่อง | ขอบล่างภาพผ่ากลางปุ่มไหม |',
  '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.vp.label} | ${r.wide.moved.length === 0 ? '**ไม่ขยับเลยแม้ค่าเดียว**' : '**ขยับ: ' + r.wide.moved.join(', ') + '**'}`
    + ` | ${r.wide.btnMoved.length === 0 ? '**ไม่ขยับ**' : '**ขยับ: ' + r.wide.btnMoved.join(', ') + '**'}`
    + ` | ${r.stack.min === r.stack.max ? `${r.stack.max}px เท่ากันทั้ง ${r.stack.n} เรื่อง` : `${r.stack.min}–${r.stack.max}px`}`
    + ` | ${r.bisected.length === 0 ? '**ไม่ผ่าเลยสักปุ่ม**' : '**ผ่า: ' + r.bisected.join(', ') + '**'} |`),
].join('\n');

const t4 = [
  '**ตาราง 4 · ความสว่างที่วัดจากภาพที่เรนเดอร์จริง** (relative luminance 0–1 · อ่านพิกเซลจากภาพถ่ายกรอบจอเดียว)',
  '',
  '> ย่าน "ฉากหลังหลัง…" วัดรอบที่สองโดยซ่อนเครื่องเรือนด้วย `visibility:hidden` ⇒ เป็นความสว่างของ',
  '> **ฉากหลังล้วน** ไม่ใช่ค่าที่ปนพิกเซลตัวหนังสือขาว · คอนทราสต์คิดจากพิกเซล **สว่างที่สุด** ในย่าน',
  '> (กรณีแย่สุด) เทียบตัวอักษรขาว ไม่ใช่จากค่าเฉลี่ย',
  '',
  '| จอ | กล่องสื่อ | ฉากหลังเหนือกล่อง | ฉากหลังหลังแถบปุ่มขวา (เฉลี่ย/สว่างสุด) | ฉากหลังหลังแคปชัน (เฉลี่ย/สว่างสุด) | กล่องสว่างกว่าฉากหลัง | ตัวขาวบนแคปชัน (แย่สุด) | ไอคอนขาวบนแถบปุ่ม (แย่สุด) |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map(r => {
    const L = r.wide.lum;
    const ratio = L.clip && L.bandAboveClip && L.bandAboveClip.mean > 0
      ? (L.clip.mean / L.bandAboveClip.mean).toFixed(1) + '×' : '—';
    const cr = x => (x ? (1.05 / (x.max + 0.05)).toFixed(1) + ':1' : '—');
    const two = x => (x ? `${x.mean} / ${x.max}` : '—');
    return `| ${r.vp.label} | ${L.clip.mean} | ${L.bandAboveClip ? L.bandAboveClip.mean : '—'}`
      + ` | ${two(L.behindRail)} | ${two(L.behindCaption)}`
      + ` | **${ratio}** | ${cr(L.behindCaption)} | ${cr(L.behindRail)} |`;
  }),
].join('\n');

const feedSha = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(ROOT, 'feed/index.html'))).digest('hex').slice(0, 12);

const block = [
  `> วัดเมื่อ 25 ต.ค. 2026 ด้วย \`node design/v2/aio59-map.mjs\` · เป้าหมายคือ \`/feed/\` ของเว็บจริง`,
  `> (\`feed/index.html\` sha256 \`${feedSha}…\`) · เรื่องที่ใช้ \`${DEMO_SLUG}\``,
  `> ภาพในกล่องสื่อของข้อเสนอ = \`${POSTER_SRC}\` ตามกฎ M1/M2 (§5) · แถว (ค′) ใช้ \`${WIDE_SRC}\``,
  `> ไม่มีเรื่องแนวนอนในคลังวันนี้ (12/12 แนวตั้ง) ⇒ ทุกใบ "แนวนอน" คือเรื่องเดิมที่ถูกแพตช์ให้เป็นแนวนอน`,
  `> ตอนวัด/ตอนถ่าย เพื่อให้เทียบทรงกล่องกันได้ตรง ๆ โดยไม่มีไฟล์ไหนในรีโปถูกเขียนทับ`,
  '',
  t1, '', t2, '', t3, '', t4,
].join('\n');

fs.writeFileSync(OUT_JSON, JSON.stringify({
  at: '2026-10-25', feedSha, demo: DEMO_SLUG, wideSrc: WIDE_SRC, stories, rows,
}, null, 2) + '\n');

if (fs.existsSync(DOC)) {
  const md = fs.readFileSync(DOC, 'utf8');
  const next = md.replace(/<!-- MEASURED:BEGIN -->[\s\S]*?<!-- MEASURED:END -->/,
    `<!-- MEASURED:BEGIN -->\n${block}\n<!-- MEASURED:END -->`);
  if (next === md && !md.includes('<!-- MEASURED:BEGIN -->')) {
    console.log('⚠️ ไม่พบบล็อก MEASURED ในเอกสาร — เขียนลง json เท่านั้น');
  } else fs.writeFileSync(DOC, next);
}

console.log(block);
console.log(`\nเขียนแล้ว: ${path.relative(ROOT, OUT_JSON)}`
  + (fs.existsSync(DOC) ? ` และบล็อก MEASURED ใน ${path.relative(ROOT, DOC)}` : ''));
