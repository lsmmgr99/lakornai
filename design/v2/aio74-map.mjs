/* ============================================================================
   AIO-74 · ตัววัด — ตอบคำถามของใบงานด้วยค่าที่เบราว์เซอร์ให้มา ไม่ใช่เลขคณิตบนกระดาษ
   UX-Designer · 26 ต.ค. 2026

   รัน:  AIO74_TREE=/tmp/aio74-pin-<pid> node design/v2/aio74-map.mjs

   สามรอบวัด
     รอบ 1 · เว็บจริง (ทรีที่ปักไว้) — สภาพวันนี้ + สี่ข้อเสนอที่ฉีดเป็น <style>
             today · A1 (เต็มกว้าง คงคำประกาศ 2:3) · A2 (สำนวนเดสก์ท็อป ไม่ประกาศสัดส่วน)
             · A2v (A2 ฉบับไม่ใช้ container query) · B (ถอดเพดาน 56vh)
     รอบ 2 · ม็อกอัพ design/v2/home.html บน **ทรีที่ทำงานอยู่** โหลดสด ไม่ฉีดอะไรเลย
             ⇒ เลขของ "แบบ" มาจาก v2.css ที่เขียนไว้จริง ตั้งแต่เลย์เอาต์แรก ไม่ใช่จากของที่ฉีด
             (ก่อนผมแก้ไฟล์ รอบนี้ต้องออกมาเท่ากับ today = หลักฐานว่าแบบที่อนุมัติมีรูนี้ด้วย)
     รอบ 3 · การครอปปกจริงทั้ง 12 ใบ × object-position 5 ค่า บนทรงที่เสนอ

   ผลออกเป็น design/v2/aio74-measured.json — เอกสาร ด่าน และตัวถ่ายภาพอ่านไฟล์นี้
   ไม่มีใครพิมพ์เลขซ้ำด้วยมือ (บทเรียน "เลขที่รายงานต้องถูกสร้าง")
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, ROOT } from './lib.mjs';
import {
  VIEWPORTS, MOBILE_SWEEP, PATCH, patchScript, swapCover, MEASURE,
  serveTree, openChrome, go, covers, heroRule, TREE, OUT, pct,
} from './aio74-lib.mjs';

const STATES = ['today', 'A1', 'A2', 'Afinal', 'A2v', 'B'];
/* ค่า object-position ที่เอามาเทียบ: 50% 50% = ค่าของมือถือวันนี้ · center 22% = ค่าของเดสก์ท็อป
   วันนี้ (กฎ `.hero .bg img` สาขา ≥720px) · สามค่ากลางคือช่วงที่ตัดสินจากปกจริง 12 ใบ */
const OBJPOS = ['50% 50%', '50% 40%', '50% 35%', '50% 30%', 'center 22%'];
const MOCKUP = '/design/v2/home.html';

/* ทรีที่ปักด้วย `git archive` ไม่มี .git ⇒ รับ sha ทาง AIO74_SHA ได้
   (ไม่เดาเอง: ถ้าไม่ได้ส่งมาและทรีไม่ใช่ git ก็เขียนตรง ๆ ว่าไม่ทราบ) */
const headSha = t => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: t, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return process.env.AIO74_SHA || '(ไม่ทราบ — ทรีนี้ไม่มี .git และไม่ได้ส่ง AIO74_SHA)'; }
};

/* ขนาดจอทั้งหมดที่วัด: 7 ขนาดของ AIO-38 (ใบงานข้อ 3) + กวาดสาขามือถือที่เป็นต้นเหตุ */
const vps = [...VIEWPORTS];
for (const vp of MOBILE_SWEEP) if (!vps.some(v => v.tag === vp.tag)) vps.push(vp);

const out = {
  at: new Date().toISOString().slice(0, 10),
  site: { tree: TREE, sha: headSha(TREE), rule: heroRule(path.join(TREE, 'assets/site.css')) },
  mockup: { tree: ROOT, sha: headSha(ROOT), rule: heroRule(path.join(DIR, 'v2.css')) },
  patch: PATCH, objPosTried: OBJPOS,
  rows: [], mockupRows: [], crops: [], covers: covers(TREE),
};

const rowOf = (m, extra) => {
  const s0 = m.slides[0];
  return {
    ...extra,
    card: s0.card, box: s0.box, gapL: s0.gapL, gapR: s0.gapR,
    gapRpct: s0.card ? pct(s0.gapR, s0.card.w) : null,
    arBox: s0.arBox, cssAr: s0.cssAr, cssH: s0.cssH, cssMaxH: s0.cssMaxH, cssW: s0.cssW,
    display: s0.display,
    cut: s0.vis ? { top: s0.vis.cutTop, bottom: s0.vis.cutBottom,
                    left: s0.vis.cutLeft, right: s0.vis.cutRight, seen: s0.vis.seen } : null,
    objectPosition: s0.vis ? s0.vis.objectPosition : null,
    heroBottom: s0.card ? s0.card.bottom : null,
    heroBottomPct: s0.card ? pct(s0.card.bottom, m.vh) : null,
    leadBottom: m.leadBottom, leadPct: m.leadBottom ? pct(m.leadBottom, m.vh) : null,
    nextCard: m.nextCard, overflowX: m.overflowX, scrollW: m.scrollW, vw: m.vw, vh: m.vh,
    /* ทุกสไลด์ ไม่ใช่ใบแรกใบเดียว — ถ้าใบที่ 2/3 ไม่เหมือนใบแรก ต้องเห็นในไฟล์ */
    slides: m.slides.map(s => ({ id: s.id, box: s.box, gapR: s.gapR, arBox: s.arBox })),
  };
};

const site = await serveTree(TREE);
const work = TREE === ROOT ? site : await serveTree(ROOT);
const page = await openChrome();
try {
  /* ---------- รอบ 1 · เว็บจริง ---------- */
  for (const vp of vps) {
    await page.viewport(vp);
    for (const state of STATES) {
      /* นำทางใหม่ทุกสภาพ: กฎที่ฉีดต้องเจอหน้าที่เพิ่งจัดเลย์เอาต์เสร็จ ไม่ใช่หน้าที่ถูกฉีดซ้อนกันมา */
      await go(page, `${site.base}/`);
      await page.evaluate(patchScript(state));
      await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      out.rows.push(rowOf(await page.evaluate(MEASURE), {
        vp: vp.tag, label: vp.label, inSet7: VIEWPORTS.some(v => v.tag === vp.tag),
        mobileBranch: vp.w < 720, state,
      }));
      process.stdout.write(`\r  รอบ 1 ${out.rows.length}/${vps.length * STATES.length} `
        + `(${vp.tag} · ${state})`.padEnd(32));
    }
  }
  console.log('');

  /* ---------- รอบ 2 · ม็อกอัพโหลดสด ----------
     mockup = แบบตามไฟล์วันนี้ ไม่ฉีดอะไรเลย ⇒ เลขมาจาก v2.css ตั้งแต่เลย์เอาต์แรก
     preFix = แบบเดียวกันแต่ย้อนกฎมือถือกลับเป็นของก่อน AIO-74 ⇒ ได้ตาราง ก่อน/หลัง ของ
              "แบบ" ในรันเดียว ไม่ต้องก๊อปเลขจากรันก่อนมาวาง */
  for (const vp of vps) {
    await page.viewport(vp);
    for (const state of ['mockup', 'preFix']) {
      await go(page, `${work.base}${MOCKUP}`);
      if (state === 'preFix') {
        await page.evaluate(patchScript('preFix'));
        await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      }
      out.mockupRows.push(rowOf(await page.evaluate(MEASURE), {
        vp: vp.tag, label: vp.label, inSet7: VIEWPORTS.some(v => v.tag === vp.tag),
        mobileBranch: vp.w < 720, state,
      }));
    }
    process.stdout.write(`\r  รอบ 2 ${out.mockupRows.length}/${vps.length * 2} (${vp.tag})`.padEnd(32));
  }
  console.log('');

  /* ---------- รอบ 3 · ปกจริง 12 ใบ × object-position 5 ค่า ----------
     จอที่ใช้ = จอที่ "ครอปลึกที่สุด" ในชุดกวาด เลือกจากผลที่วัดมาในรอบ 1 ไม่ใช่เดาเอง
     + จอที่ลูกค้าใช้เป็นหลัก (390×844) ⇒ ตรวจทั้งกรณีคับสุดและกรณีที่ลูกค้าเห็น */
  const deepest = out.rows
    .filter(r => r.state === 'A2' && r.mobileBranch && r.cut)
    .sort((a, b) => (b.cut.top + b.cut.bottom) - (a.cut.top + a.cut.bottom))[0];
  const cropTags = [...new Set([deepest.vp, '390x844'])];
  out.cropViewports = cropTags.map(t => ({ tag: t,
    why: t === deepest.vp ? 'ครอปลึกที่สุดในชุดกวาด (เลือกจากผลรอบ 1)' : 'จอที่ลูกค้าใช้เป็นหลัก' }));
  for (const tag of cropTags) {
    const vp = vps.find(v => v.tag === tag);
    await page.viewport(vp);
    for (const op of OBJPOS) {
      /* โหลดครั้งเดียวต่อ (จอ × ค่า) แล้วสลับไฟล์ปก — ไม่ต้องนำทางใหม่ 12 ครั้ง
         ทรงกล่องไม่ขึ้นกับไฟล์ ⇒ สลับ src แล้ววัดใหม่ให้ผลเดียวกับโหลดใหม่ (ด่านตรวจข้อนี้) */
      await go(page, `${site.base}/`);
      await page.evaluate(patchScript('A2', op));
      for (const file of out.covers) {
        const sw = await page.evaluate(swapCover(file));
        await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
        const m = await page.evaluate(MEASURE);
        const v = m.slides[0].vis;
        out.crops.push({
          vp: tag, file, objPos: op, swapped: sw.src, nat: v ? [v.natW, v.natH] : null,
          box: m.slides[0].box, arBox: m.slides[0].arBox, win: v ? v.win : null,
          cutTop: v ? v.cutTop : null, cutBottom: v ? v.cutBottom : null,
          cutLeft: v ? v.cutLeft : null, cutRight: v ? v.cutRight : null,
          seen: v ? v.seen : null, objectPosition: v ? v.objectPosition : null,
        });
        process.stdout.write(`\r  รอบ 3 ${out.crops.length}/${cropTags.length * OBJPOS.length * out.covers.length} `
          + `(${tag} · ${op} · ${file})`.padEnd(52));
      }
    }
  }
  console.log('');
} finally {
  page.close();
  site.stop();
  if (work !== site) work.stop();
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

/* ---------- สรุปบนจอ: เฉพาะสิ่งที่ใบงานถาม ---------- */
const row = (tag, st) => out.rows.find(r => r.vp === tag && r.state === st);
console.log(`\nเว็บจริง ${out.site.tree} · ${out.site.sha.slice(0, 7)}`);
console.log(`ม็อกอัพ ${out.mockup.tree} · ${out.mockup.sha.slice(0, 7)} · กฎ: ${out.mockup.rule}`);
console.log(`เขียน ${OUT}\n`);
console.log('แถบว่างทางขวาของกล่องภาพฮีโร่ · วันนี้ → A2');
for (const r of out.rows.filter(x => x.state === 'today')) {
  const a = row(r.vp, 'A2');
  const mk = out.mockupRows.find(x => x.vp === r.vp && x.state === 'mockup');
  console.log(`  ${r.vp.padEnd(9)}${r.inSet7 ? '*' : ' '} การ์ด ${String(r.card.w).padStart(6)}`
    + ` · กล่อง ${String(r.box.w).padStart(6)}×${String(r.box.h).padEnd(6)}`
    + ` · ว่าง ${String(r.gapR).padStart(5)}px (${String(r.gapRpct).padStart(4)}%)`
    + ` → A2 ${String(a.box.w).padStart(6)}×${String(a.box.h).padEnd(6)}`
    + ` ว่าง ${String(a.gapR).padStart(4)}px · Δสูง ${(a.box.h - r.box.h).toFixed(1)}px`
    + ` · ม็อกอัพ ${String(mk.box.w).padStart(6)}×${String(mk.box.h).padEnd(6)} ว่าง ${mk.gapR}px`);
}
console.log('  * = อยู่ในชุด 7 ขนาดจอของ AIO-38');
