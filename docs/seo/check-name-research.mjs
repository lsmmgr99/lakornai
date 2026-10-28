#!/usr/bin/env node
/* ============================================================================
   docs/seo/check-name-research.mjs — AIO-81 · SEO
   ด่านตรวจของ AC-1: "ตัวเลขทุกตัวต้องถูกสร้าง ไม่ใช่พิมพ์มือ"

   ตรวจ 4 ด่าน แยกกันคนละเหตุผล — ด่านใดแดง ออก exit code 1
   D1  สร้างใหม่แล้วได้ไฟล์เดิมเป๊ะ   → พิสูจน์ว่า .md/.json ถูกสร้าง ไม่ได้พิมพ์
   D2  เลขราคาเปลี่ยนชื่อนับใหม่ได้เท่าเดิม (นับเองด้วย git grep ของด่านนี้
       ไม่เรียกฟังก์ชันของตัวสร้าง) → กัน "ค่าคาดหวังมาจากของที่กำลังตรวจ"
   D3  เลข Ahrefs ทุกตัวใน .json ต้องสาวกลับไปเจอใน ahrefs-raw/ ได้
   D4  เลขทุกตัวที่โผล่ใน .md ต้องอยู่ใน report_numbers ของ .json

   รัน: node docs/seo/check-name-research.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const RAW = resolve(HERE, 'ahrefs-raw');
const OLD_NAME = 'LakornAI';
const EXCL = ':!docs/seo';

const fails = [];
const oks = [];
const ok = m => oks.push(m);
const fail = m => fails.push(m);

/* ---------------------------------------------------------------- D1 สร้างซ้ำ
   ชื่อโฟลเดอร์ชั่วคราวติด pid ไว้ ไม่งั้นรันพร้อมกันหลายรันจะชนกันเอง */
const tmp = mkdtempSync(resolve(tmpdir(), 'aio81-namecheck-' + process.pid + '-'));
try {
  execFileSync(process.execPath, [resolve(HERE, 'name-research.mjs')], {
    cwd: REPO, encoding: 'utf8',
    env: { ...process.env, NAME_RESEARCH_OUT_DIR: tmp, AHREFS_API_TOKEN: '' },
  });
  for (const f of ['name-research.json', 'name-research.md']) {
    const a = readFileSync(resolve(HERE, f));
    const b = readFileSync(resolve(tmp, f));
    if (a.equals(b)) ok('D1 ' + f + ' สร้างใหม่ได้ไบต์ต่อไบต์เท่าเดิม');
    else fail('D1 ' + f + ' สร้างใหม่แล้วไม่ตรงกับไฟล์ที่ส่งมา — มีของที่ถูกแก้มือหลังสร้าง');
  }
} catch (e) {
  fail('D1 รันตัวสร้างไม่ผ่าน: ' + String(e.message).slice(0, 300));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const out = JSON.parse(readFileSync(resolve(HERE, 'name-research.json'), 'utf8'));
const md = readFileSync(resolve(HERE, 'name-research.md'), 'utf8');

/* ------------------------------------------------- D2 นับราคาเปลี่ยนชื่อใหม่เอง */
const git = args => { try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch { return ''; } };
const occ = (...ps) => { const o = git(['grep', '-oI', OLD_NAME, '--', ...ps, EXCL]); return o ? o.split('\n').filter(Boolean).length : 0; };
const occI = (needle, ...ps) => { const o = git(['grep', '-oIi', needle, '--', ...ps, EXCL]); return o ? o.split('\n').filter(Boolean).length : 0; };
const files = (...ps) => { const o = git(['grep', '-lI', OLD_NAME, '--', ...ps, EXCL]); return o ? o.split('\n').filter(Boolean).length : 0; };

const c = out.rename_cost.census;
const recount = {
  total: occ('.'),
  html_all: occ('*.html'),
  html_all_files: files('*.html'),
  generated_html: occ('*.html', ':!design/*'),
  generated_html_files: files('*.html', ':!design/*'),
  design_dir: occ('design/*'),
  build_dir: occ('build/*'),
  build_dir_files: files('build/*'),
  docs_dir: occ('docs/*'),
  any_case: occI('lakornai', '.'),
  origin_literal: occI('lakornai\\.tv', '.'),
  repo_path_literal: occI('github\\.io/lakornai', '.'),
  non_html: occ('.', ':!*.html'),
  build_mjs: occ('build/*.mjs'),
  design_mjs: occ('design/**/*.mjs'),
  assets_dir: occ('assets/*', ':!*.html'),
  admin_dir: occ('admin/*', ':!*.html'),
  admin_dir_all: occ('admin/*'),
  tools_dir: occ('tools/*', ':!*.html'),
  ci_dir: occ('ci/*', ':!*.html'),
  loose: occ('.', ':!*.html', ':!build/*', ':!design/*', ':!docs/*', ':!assets/*', ':!admin/*', ':!tools/*', ':!ci/*'),
  generated_html_ceo_pathspec: occ('*.html', ':!design/**'),
};
for (const [k, v] of Object.entries(recount)) {
  if (c[k] === v) ok('D2 ' + k + ' = ' + v + ' นับใหม่ได้เท่าเดิม');
  else fail('D2 ' + k + ': รายงานบอก ' + c[k] + ' แต่นับใหม่ได้ ' + v);
}
/* ถังย่อยต้องรวมกันได้เท่าถังรวม — ถ้าไม่เท่า แปลว่าแบ่งกองซ้อนกันหรือตกหล่น */
const sum = c.generated_html + c.design_dir + c.build_dir + c.docs_dir + c.remainder;
if (sum === c.total) ok('D2 ถังย่อยรวมกันได้ ' + sum + ' เท่ากับถังรวม');
else fail('D2 ถังย่อยรวมกันได้ ' + sum + ' แต่ถังรวมคือ ' + c.total + ' — การแบ่งกองไม่ครบหรือซ้อนกัน');
if (c.html_all === c.generated_html + c.design_html) ok('D2 html ทั้งหมด = html ที่ build สร้าง + html ของม็อกอัพ');
else fail('D2 html ทั้งหมด (' + c.html_all + ') ≠ build (' + c.generated_html + ') + design (' + c.design_html + ')');
/* กองย่อยฝั่งไฟล์ต้นทางต้องรวมได้เท่ายอด non_html — ตารางที่ส่งให้ CEO ไล่งานใช้ตัวนี้ */
const nonHtmlParts = c.build_dir + c.design_non_html + c.docs_dir + c.assets_dir + c.admin_dir + c.tools_dir + c.ci_dir + c.loose;
if (nonHtmlParts === c.non_html) ok('D2 กองย่อยไฟล์ต้นทางรวมได้ ' + nonHtmlParts + ' เท่ากับยอด non_html');
else fail('D2 กองย่อยไฟล์ต้นทางรวมได้ ' + nonHtmlParts + ' แต่ยอด non_html คือ ' + c.non_html + ' — ตารางที่ส่งให้ CEO ไล่งานมีรูรั่ว');
if (c.generated_html_ceo_pathspec === c.generated_html) ok('D2 pathspec สองแบบ (:!design/* กับ :!design/**) ได้เลขเดียวกัน');
else fail('D2 pathspec สองแบบได้เลขไม่เท่ากัน: ' + c.generated_html + ' กับ ' + c.generated_html_ceo_pathspec);
/* เลขคณิตที่รายงานตีพิมพ์ต้องบวกกันได้จริง — ส่วนประกอบของผลต่างต้องเท่าผลต่าง
   ไม่งั้นรายงานอธิบายผลต่างด้วยเหตุที่อธิบายไม่ครบ แล้วไม่มีใครเห็น */
const numAt = path => out.report_numbers.find(x => x.path === path)?.value ?? null;
const [dAdmin, dUnlisted, dNet, dSub] = ['ceo.delta_admin', 'ceo.delta_unlisted', 'ceo.delta_net', 'ceo.sub_delta'].map(numAt);
if (dAdmin !== null && dAdmin + dUnlisted === dNet && dNet === dSub) ok('D2 ส่วนประกอบของผลต่าง (' + dAdmin + ' + ' + dUnlisted + ') เท่าผลต่างที่ตีพิมพ์ ' + dNet);
else fail('D2 ส่วนประกอบของผลต่างบวกไม่ลงตัว: ' + dAdmin + ' + ' + dUnlisted + ' ≠ ' + dNet + ' หรือไม่เท่า sub_delta ' + dSub);

/* ยอดนับต้องไม่ขยับเพราะตัวรายงานเอง: รัน 2 รอบติดกันต้องได้ไฟล์เดียวกัน (ด่าน D1 คุมอยู่)
   จึงไม่มีช่อง self_reference ให้ตรวจอีก — เลขที่ไม่มีจุดนิ่งถูกถอนออกจากรายงานแล้ว */

/* เลขบรรทัดที่รายงานอ้าง ต้องมีสตริงนั้นอยู่จริงบนบรรทัดนั้น ณ ตอนตรวจ */
const lineHas = (file, line, needle) => {
  const l = readFileSync(resolve(REPO, file), 'utf8').split('\n')[line - 1] ?? '';
  return l.includes(needle);
};
const lineClaims = [
  [out.rename_cost.site_name.decl_file, out.rename_cost.site_name.decl_line, "export const SITE_NAME = '" + OLD_NAME + "'"],
  [out.rename_cost.origin.file, out.rename_cost.origin.line, 'export const DEFAULT_SITE_ORIGIN'],
  [out.rename_cost.logo.file, out.rename_cost.logo.line, '<i lang="en">AI</i>'],
  [out.rename_cost.logo.file, out.rename_cost.logo.footer_line, '© ' + OLD_NAME],
  [out.rename_cost.share.generator, out.rename_cost.share.title_line, "title: '" + OLD_NAME + "'"],
];
const lineCount = (file, needle) =>
  readFileSync(resolve(REPO, file), 'utf8').split('\n').filter(l => l.includes(needle)).length;
for (const [f, l, needle] of lineClaims) {
  if (!l || !lineHas(f, l, needle)) { fail('D2 ' + f + ':' + l + ' ไม่มี ' + needle + ' แล้ว — เลขบรรทัดในรายงานเน่า'); continue; }
  /* สตริงที่ใช้หาบรรทัดต้องมีที่เดียวในไฟล์ ไม่งั้นการอ้างอิงเลื่อนไปเกาะของอื่นได้
     โดยไม่มีใครเห็น (เคสที่เคยทำให้คอมเมนต์ชี้ผิดพร้อมกันหลายจุด) */
  const cnt = lineCount(f, needle);
  if (cnt === 1) ok('D2 ' + f + ':' + l + ' มี ' + needle + ' อยู่จริง และมีที่เดียวในไฟล์');
  else fail('D2 ' + f + ' มีสตริง ' + needle + ' อยู่ ' + cnt + ' บรรทัด — การอ้างบรรทัดกำกวม');
}

/* --------------------------------------------- D3 เลข Ahrefs ต้องสาวกลับได้ */
const rawFiles = ['keywords-explorer-overview.json', 'serp-overview.json', 'domains.json'];
for (const f of rawFiles) if (!existsSync(resolve(RAW, f))) fail('D3 ไม่มีไฟล์ capture: ' + f);
const rawKw = JSON.parse(readFileSync(resolve(RAW, 'keywords-explorer-overview.json'), 'utf8'));
const rawSerp = JSON.parse(readFileSync(resolve(RAW, 'serp-overview.json'), 'utf8'));
const rawDom = JSON.parse(readFileSync(resolve(RAW, 'domains.json'), 'utf8'));

let kwChecked = 0;
for (const [k, row] of Object.entries(out.keywords)) {
  let found = null;
  for (const call of rawKw.calls) for (const r of call.response.keywords) if (r.keyword === k) found = r;
  if (!found) { fail('D3 คำ ' + k + ' อยู่ใน .json แต่ไม่มีใน capture'); continue; }
  for (const field of ['volume', 'difficulty', 'traffic_potential', 'global_volume', 'cps']) {
    if (found[field] === undefined) continue;
    if (row[field] !== found[field]) fail('D3 คำ ' + k + ' ช่อง ' + field + ': .json = ' + row[field] + ' แต่ capture = ' + found[field]);
  }
  kwChecked++;
}
ok('D3 คำค้น ' + kwChecked + ' คำ ตรงกับ capture ทุกช่อง');

/* คำที่ขอไปแล้วไม่มีแถวคืนมา ต้องถูกบันทึกว่าไม่มีข้อมูล และต้องไม่มีเลขแทน */
const requested = new Set(), returned = new Set();
for (const call of rawKw.calls) {
  for (const k of call.requested_keywords) requested.add(k);
  for (const r of call.response.keywords) returned.add(r.keyword);
}
const trulyMissing = [...requested].filter(k => !returned.has(k)).sort();
const reportedMissing = out.keywords_without_data.map(m => m.keyword).sort();
if (JSON.stringify(trulyMissing) === JSON.stringify(reportedMissing)) ok('D3 คำที่ไม่มีข้อมูล ' + trulyMissing.length + ' คำ ตรงกับ capture');
else fail('D3 รายการคำที่ไม่มีข้อมูลไม่ตรง: capture ' + trulyMissing.length + ' คำ แต่รายงานบอก ' + reportedMissing.length + ' คำ');
for (const k of trulyMissing) if (out.keywords[k]) fail('D3 คำ ' + k + ' ไม่มีข้อมูลใน Ahrefs แต่มีแถวตัวเลขใน .json');

let domChecked = 0;
for (const [host, row] of Object.entries(out.domains)) {
  let found = null;
  for (const call of rawDom.calls) if (call.tool === 'batch-analysis') for (const t of call.response.targets) if (String(t.url).replace(/\/$/, '') === host) found = t;
  if (!found) { fail('D3 โดเมน ' + host + ' อยู่ใน .json แต่ไม่มีใน capture'); continue; }
  for (const field of ['domain_rating', 'refdomains', 'backlinks', 'org_traffic', 'org_keywords', 'ip']) {
    if (row[field] !== found[field]) fail('D3 โดเมน ' + host + ' ช่อง ' + field + ' ไม่ตรง capture');
  }
  domChecked++;
}
ok('D3 โดเมน ' + domChecked + ' รายการ ตรงกับ capture ทุกช่อง');

for (const [id, s] of Object.entries(out.serp)) {
  const call = rawSerp.calls.find(x => x.id === id);
  if (!call) { fail('D3 serp ' + id + ' ไม่มีใน capture'); continue; }
  if (call.response.positions.length !== s.rows) fail('D3 serp ' + id + ' จำนวนแถวไม่ตรง capture');
}
ok('D3 หน้าผลค้น ' + Object.keys(out.serp).length + ' คำ จำนวนแถวตรงกับ capture');

/* ห้ามเขียนว่าโดเมนว่าง — เครื่องมือบอกไม่ได้ */
for (const bad of ['โดเมนว่าง', 'ว่างอยู่', 'available']) {
  if (md.includes(bad)) fail('D3 รายงานมีคำ "' + bad + '" ซึ่งเครื่องมือของเราพิสูจน์ไม่ได้');
}
ok('D3 รายงานไม่มีคำที่อ้างว่าโดเมนว่าง');

/* ---------------------------------------- D4 เลขใน .md ต้องมีที่มาใน .json */
const tokens = s => {
  const out = new Set();
  for (const m of String(s).matchAll(/[0-9][0-9,.]*/g)) {
    const t = m[0].replace(/[.,]+$/, '');
    if (t) out.add(t);
  }
  return out;
};
const allowed = new Set();
for (const e of out.report_numbers) for (const t of tokens(e.text)) allowed.add(t);
const missingTokens = [...tokens(md)].filter(t => !allowed.has(t));
if (!missingTokens.length) ok('D4 เลขทุกตัวใน .md (' + tokens(md).size + ' ค่าไม่ซ้ำ) มีที่มาใน report_numbers');
else fail('D4 เลขใน .md ที่ไม่มีที่มาใน .json: ' + missingTokens.slice(0, 25).join(', ') + (missingTokens.length > 25 ? ' …' : ''));

const measured = out.report_numbers.filter(x => x.kind === 'measured').length;
const labels = out.report_numbers.filter(x => x.kind === 'label').length;
ok('D4 report_numbers: ผลวัด ' + measured + ' ค่า · ป้ายชื่อ ' + labels + ' ค่า');

/* ----------------------------------------------- เกณฑ์รูปร่างของข้อเสนอ (AC-2/3) */
const props = out.proposals;
if (props.length >= 5 && props.length <= 7) ok('AC-2 เสนอ ' + props.length + ' ชื่อ (อยู่ในช่วง 6±1)');
else fail('AC-2 เสนอ ' + props.length + ' ชื่อ — ต้องอยู่ในช่วง 6±1');
for (const axis of ['kw', 'brand', 'noai']) {
  const k = props.filter(p => p.axes.includes(axis)).length;
  if (k >= 1) ok('AC-2 แกน ' + axis + ' มี ' + k + ' ชื่อ');
  else fail('AC-2 แกน ' + axis + ' ไม่มีชื่อเลย');
}
for (const p of props) {
  const miss = [];
  if (!p.name_as_keyword.length) miss.push('ช่อง 1 คำค้น/ปริมาณ');
  if (!p.serp_checked.length) miss.push('ช่อง 2 การชน (serp)');
  if (!p.domains.length) miss.push('ช่อง 2/4 โดเมน');
  if (!p.spelling || !p.spelling.read_aloud || !p.spelling.typing?.length) miss.push('ช่อง 3 การสะกด');
  if (!p.downsides.length) miss.push('ช่อง 5 ข้อเสีย');
  if (miss.length) fail('AC-3 ชื่อ ' + p.latin + ' ขาด: ' + miss.join(', '));
}
if (!fails.some(f => f.startsWith('AC-3'))) ok('AC-3 ทุกชื่อมีครบทั้ง 5 ช่อง');
/* ชื่อที่โดเมนหลักมีเว็บทำงานอยู่ ต้องไม่อยู่ในข้อเสนอ — ต้องถูกตัด */
for (const p of props) {
  const operating = p.domains.filter(d => d.state === 'operating');
  if (operating.length) fail('AC-3 ชื่อ ' + p.latin + ' มีโดเมนที่มีเว็บทำงานอยู่: ' + operating.map(d => d.host).join(', '));
}
if (out.cuts.length >= 1) ok('AC-3 มีรายการชื่อที่ตัดออกพร้อมเหตุผล ' + out.cuts.length + ' กลุ่ม');
else fail('AC-3 ไม่มีรายการชื่อที่ตัดออก');

/* ------------------------------------------------------------------- สรุปผล */
for (const m of oks) process.stdout.write('ok   ' + m + '\n');
for (const m of fails) process.stdout.write('FAIL ' + m + '\n');
process.stdout.write('\n' + (fails.length ? 'แดง ' + fails.length + ' ข้อ จาก ' + (oks.length + fails.length) : 'เขียวทั้งหมด ' + oks.length + ' ข้อ') + '\n');
process.exit(fails.length ? 1 : 0);
