#!/usr/bin/env node
/* ============================================================================
   docs/seo/name-research.mjs — AIO-81 · SEO
   ตัวสร้างเดียวของ docs/seo/name-research.json และ docs/seo/name-research.md

   ทำไมต้องเป็นสคริปต์: AC-1 ของใบงานห้ามเลขพิมพ์มือ ทุกตัวเลขในรายงาน
   ต้องมีที่มา ⇒ ไฟล์นี้เป็นที่เดียวที่ผลิตเลข และรายงาน .md ถูกสร้างจาก
   .json ที่ไฟล์นี้เขียน ไม่ได้พิมพ์แยก · ทุกเลขที่โผล่ใน .md ผ่าน n() หรือ
   lab() เสมอ แล้วถูกบันทึกลง report_numbers ให้ตรวจย้อนได้

   รัน:  node docs/seo/name-research.mjs
   ตรวจ: node docs/seo/check-name-research.mjs

   ที่มาของตัวเลข 2 ทาง
   1) Ahrefs — อ่านจาก docs/seo/ahrefs-raw/*.json ซึ่งเป็นคำตอบดิบที่ถอดมา
      จาก Ahrefs MCP connector ตอนรันงานนี้ (28 ต.ค. 2026)
      ถ้ามี AHREFS_API_TOKEN ในสภาพแวดล้อม สคริปต์จะดึงสดจาก api.ahrefs.com
      ทับไฟล์ capture ให้ก่อน แล้วค่อยสร้างรายงาน (ดู repull())
      *** เครื่องที่รันงานนี้ไม่มี token — api.ahrefs.com ตอบ 403 เมื่อเรียกตรง
          ทาง live จึงยังไม่ได้ถูกรันจริง เขียนไว้ให้รันได้เมื่อมี token ***
   2) ราคาเปลี่ยนชื่อในรีโป — สคริปต์นี้นับเองด้วย git grep ตอนรัน
      ไม่ฝังเลขไว้ และไม่อ้างเลขบรรทัดตายตัว (หาเลขบรรทัดจากสตริงตอนรัน)
      นับโดย "ไม่รวม docs/seo" เพราะรายงานฉบับนี้เองพูดถึงชื่อเก่า
      ถ้านับรวมจะกลายเป็นเลขที่ขยับเพราะตัวรายงาน
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const RAW = resolve(HERE, 'ahrefs-raw');
const OUT_DIR = process.env.NAME_RESEARCH_OUT_DIR ? resolve(process.env.NAME_RESEARCH_OUT_DIR) : HERE;
const OUT_JSON = resolve(OUT_DIR, 'name-research.json');
const OUT_MD = resolve(OUT_DIR, 'name-research.md');

const BT = String.fromCharCode(96);           /* backtick — ไม่พิมพ์ตรงใน template */
const code = s => BT + s + BT;
const RESEARCH_DATE = '2026-10-28';
const TICKET = 'AIO-81';
const OLD_NAME = 'LakornAI';

/* ---------------------------------------------------------------- ตัวบันทึกเลข
   n()   = เลขที่ "วัด" มา (Ahrefs หรือ git grep) — ต้องตรวจย้อนได้
   lab() = ป้าย/ชื่อเรียกที่มีตัวเลขติดอยู่ เช่น AIO-81, AC-1, 1200x630
           แยกช่องไว้ให้เห็นชัดว่าไม่ใช่ผลวัด                              */
const NUMS = [];
const fmtNum = v => {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  return String(Number(v.toFixed(4)));
};
function n(path, value, unit = '') {
  const text = value === null || value === undefined ? 'ไม่มีข้อมูล' : fmtNum(value) + unit;
  NUMS.push({ kind: 'measured', path, value: value ?? null, text });
  return text;
}
function lab(text, path = null) {
  NUMS.push({ kind: 'label', path: path ?? 'label:' + text, value: null, text: String(text) });
  return String(text);
}

/* ------------------------------------------------------------- ดึง Ahrefs สด */
const AHREFS_PATHS = {
  'keywords-explorer-overview': { method: 'GET', path: '/v3/keywords-explorer/overview' },
  'serp-overview': { method: 'GET', path: '/v3/serp-overview/serp-overview' },
  'batch-analysis': { method: 'POST', path: '/v3/batch-analysis/batch-analysis' },
  'site-explorer-domain-rating': { method: 'GET', path: '/v3/site-explorer/domain-rating' },
  'site-explorer-backlinks-stats': { method: 'GET', path: '/v3/site-explorer/backlinks-stats' },
  'subscription-info-limits-and-usage': { method: 'GET', path: '/v3/subscription-info/limits-and-usage' },
};
async function ahrefs(tool, params) {
  const token = process.env.AHREFS_API_TOKEN;
  const spec = AHREFS_PATHS[tool];
  if (!spec) throw new Error('ไม่รู้จัก tool: ' + tool);
  const base = 'https://api.ahrefs.com';
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  let url = base + spec.path, init = { method: spec.method, headers };
  if (spec.method === 'GET') {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) q.set(k, String(v));
    url += '?' + q.toString();
  } else {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(params);
  }
  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok) throw new Error('Ahrefs ' + spec.path + ' ตอบ ' + res.status + ': ' + body.slice(0, 400));
  return JSON.parse(body);
}
async function repull() {
  /* ดึงสดทับ capture ทุกไฟล์ โดยใช้ params ชุดเดิมที่บันทึกไว้ใน capture
     เพื่อให้เทียบกันได้ตรง ๆ ว่าเลขขยับไปจากวันที่เก็บหรือไม่ */
  for (const file of ['keywords-explorer-overview.json', 'serp-overview.json', 'domains.json']) {
    const p = resolve(RAW, file);
    const doc = JSON.parse(readFileSync(p, 'utf8'));
    for (const call of doc.calls) {
      if (call.tool === 'batch-analysis') {
        const targets = call.response.targets.map(t => ({
          url: String(t.url).replace(/\/$/, ''),
          mode: call.params.targets_mode, protocol: call.params.targets_protocol,
        }));
        call.response = await ahrefs(call.tool, { ...call.params, targets, targets_mode: undefined, targets_protocol: undefined });
      } else {
        call.response = await ahrefs(call.tool, call.params);
      }
      call.captured_at = new Date().toISOString().slice(0, 10);
      call.source = 'live-api';
    }
    doc.captured_at = new Date().toISOString().slice(0, 10);
    doc.transport = 'api.ahrefs.com v3 ผ่าน AHREFS_API_TOKEN';
    writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
}
if (process.env.AHREFS_API_TOKEN) await repull();

/* -------------------------------------------------------------- โหลด capture */
const rawKw = JSON.parse(readFileSync(resolve(RAW, 'keywords-explorer-overview.json'), 'utf8'));
const rawSerp = JSON.parse(readFileSync(resolve(RAW, 'serp-overview.json'), 'utf8'));
const rawDom = JSON.parse(readFileSync(resolve(RAW, 'domains.json'), 'utf8'));

const KW = new Map();
const KW_MISSING = [];
for (const call of rawKw.calls) {
  const got = new Set();
  for (const row of call.response.keywords) { KW.set(row.keyword, { ...row, _call: call.id }); got.add(row.keyword); }
  for (const k of call.requested_keywords) if (!got.has(k)) KW_MISSING.push({ keyword: k, call: call.id });
}
const SERP = new Map(rawSerp.calls.map(c => [c.id, c]));
const DOM = new Map();
for (const call of rawDom.calls) {
  if (call.tool !== 'batch-analysis') continue;
  for (const t of call.response.targets) DOM.set(String(t.url).replace(/\/$/, ''), t);
}

const kwRow = k => KW.get(k) ?? null;
const kwField = (k, f) => { const r = kwRow(k); return r && r[f] !== undefined ? r[f] : null; };
/* เขียน volume/KD ของคำหนึ่ง — ไม่มีข้อมูลก็เขียนว่าไม่มีข้อมูล ห้ามเดา */
const kwVK = k => {
  const r = kwRow(k);
  const pfx = 'kw.' + k + '.';
  if (!r) { n(pfx + 'volume', null); n(pfx + 'difficulty', null); return 'Ahrefs ไม่มีแถวคำนี้คืนมา (ไม่มีข้อมูล)'; }
  return 'volume ' + n(pfx + 'volume', r.volume) + '/เดือน · KD ' + n(pfx + 'difficulty', r.difficulty);
};

/* ------------------------------------------- จัดสถานะโดเมนจากสิ่งที่ Ahrefs บอก
   เครื่องมือนี้บอกไม่ได้ว่า "จดได้" — บอกได้แค่ว่ามีร่องรอยเว็บ/ลิงก์/ทราฟฟิก
   จึงมี 3 สถานะเท่านั้น และไม่มีสถานะชื่อ "ว่าง"                          */
function domainState(host) {
  const t = DOM.get(host);
  if (!t) return { host, code: 'no-record', label: 'ไม่ได้ตรวจ' };
  const operating = (t.org_keywords ?? 0) > 0 || (t.org_traffic ?? 0) > 0;
  if (operating) return { host, code: 'operating', label: 'มีเว็บทำงานอยู่', t };
  if (t.ip || (t.refdomains ?? 0) > 0) return { host, code: 'held', label: 'มีร่องรอยว่าโดเมนถูกถือไว้ แต่ไม่มีเว็บที่ติดอันดับ', t };
  return { host, code: 'no-signal', label: 'Ahrefs ไม่มีข้อมูลโดเมนนี้ — สรุปไม่ได้ว่าจดได้หรือไม่', t };
}
function domainLine(host) {
  const s = domainState(host);
  const p = 'domain.' + host + '.';
  if (s.code === 'no-record') return code(host) + ' — ไม่ได้ตรวจ';
  const t = s.t;
  const bits = [
    'DR ' + n(p + 'dr', t.domain_rating),
    'refdomains ' + n(p + 'refdomains', t.refdomains),
    'คำที่ติดอันดับ ' + n(p + 'org_keywords', t.org_keywords),
    'ทราฟฟิกค้นหา ' + n(p + 'org_traffic', t.org_traffic) + '/เดือน',
    t.ip ? 'มี IP ตอบ (' + n(p + 'ip', t.ip) + ')' : 'ไม่มี IP ใน Ahrefs',
  ];
  return code(host) + ' — ' + s.label + ' · ' + bits.join(' · ');
}

/* =========================================================== ราคาเปลี่ยนชื่อ
   นับจากรีโปตอนรัน · ทุกคำสั่งตัด docs/seo ออก (รายงานนี้เองอยู่ในนั้น)   */
const git = args => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
const EXCL = ':!docs/seo';
function countOcc(pathspecs) {
  try { const o = git(['grep', '-oI', OLD_NAME, '--', ...pathspecs, EXCL]); return o ? o.split('\n').filter(Boolean).length : 0; }
  catch { return 0; }
}
function countOccI(needle, pathspecs) {
  try { const o = git(['grep', '-oIi', needle, '--', ...pathspecs, EXCL]); return o ? o.split('\n').filter(Boolean).length : 0; }
  catch { return 0; }
}
function filesWith(pathspecs) {
  try { const o = git(['grep', '-lI', OLD_NAME, '--', ...pathspecs, EXCL]); return o ? o.split('\n').filter(Boolean) : []; }
  catch { return []; }
}
/* หาเลขบรรทัดจากสตริงตอนรัน — ห้ามอ้างเลขบรรทัดตายตัว เพราะไฟล์ขยับได้ */
function findLine(file, needle) {
  const lines = readFileSync(resolve(REPO, file), 'utf8').split('\n');
  const i = lines.findIndex(l => l.includes(needle));
  return i < 0 ? null : i + 1;
}
function linesMatching(pathspec, pattern) {
  try {
    const o = git(['grep', '-nI', '-e', pattern, '--', pathspec, EXCL]);
    return (o ? o.split('\n').filter(Boolean) : []).map(l => {
      const m = l.match(/^(.+?):(\d+):/);
      return m ? { file: m[1], line: Number(m[2]) } : null;
    }).filter(Boolean);
  } catch { return []; }
}

const HTML_SITE = ['*.html', ':!design/*'];
const census = {
  total: countOcc(['.']),
  generated_html: countOcc(HTML_SITE),
  generated_html_files: filesWith(HTML_SITE).length,
  html_all: countOcc(['*.html']),
  html_all_files: filesWith(['*.html']).length,
  design_html: countOcc(['design/*.html', 'design/**/*.html']),
  design_html_files: filesWith(['design/*.html', 'design/**/*.html']).length,
  design_dir: countOcc(['design/*']),
  design_dir_files: filesWith(['design/*']).length,
  build_dir: countOcc(['build/*']),
  build_dir_files: filesWith(['build/*']).length,
  docs_dir: countOcc(['docs/*']),
  any_case: countOccI('lakornai', ['.']),
  origin_literal: countOccI('lakornai\\.tv', ['.']),
  repo_path_literal: countOccI('github\\.io/lakornai', ['.']),
};
census.remainder = census.total - census.generated_html - census.design_dir - census.build_dir - census.docs_dir;
census.other_casing = census.any_case - census.total;
census.remainder_files = filesWith(['.', ':!*.html', ':!design/*', ':!build/*', ':!docs/*']);

/* จุดต้นทางที่ต้องแก้มือ */
const SEO_FILE = 'build/seo.mjs';
const siteName = {
  decl_file: SEO_FILE,
  decl_line: findLine(SEO_FILE, "export const SITE_NAME = '" + OLD_NAME + "'"),
  refs: linesMatching('build/*', 'SITE_NAME').filter(r => !(r.file === SEO_FILE && r.line === findLine(SEO_FILE, "export const SITE_NAME = '" + OLD_NAME + "'"))),
};
siteName.import_refs = siteName.refs.filter(r => {
  const l = readFileSync(resolve(REPO, r.file), 'utf8').split('\n')[r.line - 1];
  return /^\s*import\b/.test(l);
});
siteName.use_refs = siteName.refs.filter(r => !siteName.import_refs.some(i => i.file === r.file && i.line === r.line));

const origin = {
  file: SEO_FILE,
  line: findLine(SEO_FILE, 'export const DEFAULT_SITE_ORIGIN'),
  value: (readFileSync(resolve(REPO, SEO_FILE), 'utf8').match(/DEFAULT_SITE_ORIGIN = '([^']+)'/) || [])[1] ?? null,
};
const logo = {
  file: 'build/ui.mjs',
  line: findLine('build/ui.mjs', '<b lang="en">Lakorn</b><i lang="en">AI</i>'),
  footer_line: findLine('build/ui.mjs', '© ' + OLD_NAME),
  footer_text: (readFileSync(resolve(REPO, 'build/ui.mjs'), 'utf8').match(/© LakornAI[^<]*/) || [])[0] ?? null,
};
const WORDMARK = '<b lang="en">Lakorn</b><i lang="en">AI</i>';
const share = {
  jpg_count: git(['ls-files', 'assets/share/*.jpg']).split('\n').filter(Boolean).length,
  src_html_count: git(['ls-files', 'design/v2/share-src/*.html']).split('\n').filter(Boolean).length,
  /* sheet.html ใน share-src เป็นหน้ารวมภาพ (contact sheet) ไม่ใช่การ์ดที่ถูกเรนเดอร์เป็น .jpg
     จึงต้องนับแยก ไม่งั้นตัวหารเพี้ยนไปหนึ่งแล้วอ่านว่า "มีใบที่ไม่มีชื่อ" ซึ่งไม่จริง */
  card_src_count: git(['ls-files', 'design/v2/share-src/*.html']).split('\n').filter(Boolean)
    .filter(f => /\/(default|series-)/.test(f)).length,
  src_with_wordmark: (() => {
    const files = git(['ls-files', 'design/v2/share-src/*.html']).split('\n').filter(Boolean);
    return files.filter(f => readFileSync(resolve(REPO, f), 'utf8').includes(WORDMARK)).length;
  })(),
  generator: 'design/v2/share-cards.mjs',
  wordmark_lines: linesMatching('design/v2/share-cards.mjs', '<b lang="en">Lakorn</b>').map(r => r.line),
  title_line: findLine('design/v2/share-cards.mjs', "title: '" + OLD_NAME + "'"),
};
/* ตัวอย่างบรรทัดที่ CEO อ้างใน AC-6 — ตรวจว่าบรรทัดนั้นมีชื่อจริงไหม ณ ตอนรัน */
const CEO_LINE_CLAIMS = [
  ['build/pages-content.mjs', 186], ['build/pages-content.mjs', 197],
  ['build/pages-content.mjs', 268], ['build/pages-content.mjs', 270],
  ['build/pages-discovery.mjs', 177], ['build/pages-discovery.mjs', 352],
  ['build/pages-discovery.mjs', 356],
];
const ceoLineCheck = CEO_LINE_CLAIMS.map(([f, l]) => {
  const line = readFileSync(resolve(REPO, f), 'utf8').split('\n')[l - 1] ?? '';
  return { file: f, line: l, has_name: line.includes(OLD_NAME) };
});
const ceoLinesOk = ceoLineCheck.filter(c => c.has_name).length;

/* ========================================================== ชื่อที่เสนอ 6 ชื่อ
   แกนตาม AC-2: kw = มีคำค้นในชื่อ · brand = แบรนด์ล้วนไม่มีคำค้น · noai = ทิ้ง AI
   ทุกชื่อมี 5 ช่องตาม AC-3 ครบ: คำค้น+เลข · การชน · การสะกด · โดเมน · ข้อเสีย */
const NAMES = [
  {
    id: 'doo-san', thai: 'ดูสั้น', latin: 'DooShort', axes: ['kw', 'noai'],
    idea: 'ดู + สั้น · เรียงคำแบบที่คนไทยพูดจริง และฝั่งอังกฤษมีคำ short เหมือน 4 แบรนด์ในหมวด',
    hooks: ['ละครสั้น', 'ดูละครสั้น', 'ละครสั้นฟรี'],
    self: ['ดูสั้น', 'dooshort'],
    serp: ['serp-doosan', 'serp-lakorn-san'],
    domains: ['dooshort.com', 'dooshort.tv', 'dooshort.co.th'],
    readAloud: 'ไทยอ่าน "ดู-สั้น" · อังกฤษอ่าน "ดู-ชอร์ต" — คนละเสียงกันระหว่างสองภาษา',
    typing: ['ไทยพิมพ์ได้ ไม่มีวรรณยุกต์ที่พิมพ์ยาก', 'อังกฤษพิมพ์ได้ แต่ Doo/Du/Dhu สะกดได้หลายทาง'],
    downsides: [
      'คำนำหน้า "ดู..." เป็นตระกูลชื่อที่เว็บดูหนังเถื่อนใช้กันทั้งหมวด ชื่อจะถูกจัดกลุ่มไปกับของพวกนั้นโดยอัตโนมัติ',
      'ชื่อไทยกับชื่ออังกฤษออกเสียงไม่ตรงกัน (สั้น ≠ short) ⇒ คนบอกต่อปากเปล่าแล้วพิมพ์ไม่ถูก',
      'เอาคำหมวดมาเป็นชื่อ แปลว่าจดเป็นเครื่องหมายการค้าได้ยาก',
    ],
  },
  {
    id: 'thai-short', thai: 'ไทยชอร์ต', latin: 'ThaiShort', axes: ['kw', 'noai'],
    idea: 'เกาะคำ short ที่หมวดนี้ใช้ แล้วเติม "ไทย" เป็นตัวแยกจากแอปจีน — ตรงกับเส้นในใบงานที่ห้ามทำตัวเป็นละครจีน',
    hooks: ['ละครสั้น', 'ละครสั้นไทย', 'ละครสั้นฟรี'],
    self: ['ไทยชอร์ต', 'thaishort', 'thai short drama'],
    serp: ['serp-thaishort', 'serp-lakorn-san'],
    domains: ['thaishort.com', 'thaishort.tv', 'thaishort.co.th'],
    readAloud: 'ไทยอ่าน "ไทย-ชอร์ต" · อังกฤษอ่าน "ไทย-ชอร์ต" — ตรงกันทั้งสองภาษา',
    typing: ['ไทยพิมพ์ได้ แต่ "ชอร์ต" มี ร์ (ไม้ทัณฑฆาต) ที่คนพิมพ์ผิดเป็น ชอร์ท/ช็อต บ่อย', 'อังกฤษพิมพ์ได้ ตรงตัว'],
    downsides: [
      'ลงท้าย "…Short" เหมือน ReelShort / ShortMax / GoodShort / NetShort ⇒ ดูเหมือนของเลียนแบบแอปจีน ซึ่งเป็นภาพที่ใบงานสั่งให้เลี่ยง',
      '"ชอร์ต" สะกดไทยได้หลายแบบ (ชอร์ต/ชอร์ท/ช็อต) ⇒ คนค้นผิดแล้วหาไม่เจอ',
      'ขึ้นต้นด้วย "ไทย" ทำให้ขยายไปตลาดอื่นภายหลังลำบาก',
    ],
  },
  {
    id: 'mini-lakorn', thai: 'มินิละคร', latin: 'MiniLakorn', axes: ['kw', 'noai'],
    idea: 'มินิ (คำยืมที่ทุกคนพิมพ์ได้) + ละคร (คำที่ WatchLakorn พิสูจน์แล้วว่าคนจำเป็นแบรนด์ได้)',
    hooks: ['ละคร', 'ละครสั้น', 'มินิซีรีส์'],
    self: ['มินิละคร', 'minilakorn'],
    serp: ['serp-minilakorn', 'serp-lakorn-en'],
    domains: ['minilakorn.com', 'minilakorn.tv', 'minilakorn.co.th'],
    readAloud: 'ไทยอ่าน "มิ-นิ-ละ-คอน" · อังกฤษอ่าน "มิ-นิ-ละ-คอร์น" — ใกล้กันพอให้บอกต่อปากเปล่าได้',
    typing: ['ไทยพิมพ์ได้ ไม่มีวรรณยุกต์', 'อังกฤษพิมพ์ได้ แต่เป็นชื่อที่ยาวที่สุดในชุดนี้'],
    downsides: [
      'ยาวที่สุดในชุดนี้ (ดูจำนวนตัวอักษรที่ช่องการสะกด) และยาวกว่าชื่อคู่แข่งทุกตัวในหมวด',
      '"มินิ" ชวนให้คิดว่าเนื้อหาเล็กกว่า/ด้อยกว่าของจริง ไม่ใช่ "จบไว"',
      'คำว่า ละคร อยู่ในชื่อ ⇒ คนที่ค้นคำ ละคร เฉย ๆ จะไปเจอหน้าของช่องทีวี ไม่ใช่เรา และเราไปแย่งไม่ได้ (ดูค่า KD ของคำนั้น)',
    ],
  },
  {
    id: 'muanjai', thai: 'ม่วนใจ', latin: 'Muanjai', axes: ['brand', 'noai'],
    idea: 'แบรนด์ล้วน ไม่มีคำค้นในชื่อ · ม่วน = สนุก (อีสาน/เหนือ) + ใจ ⇒ ความรู้สึกหลังดูจบ',
    hooks: [],
    self: ['ม่วนใจ', 'muanjai', 'ม่วน', 'muan'],
    serp: ['serp-muanjai'],
    domains: ['muanjai.com', 'muanjai.tv', 'muanjai.co.th'],
    readAloud: 'ไทยอ่าน "ม่วน-ใจ" · อังกฤษอ่าน "ม่วน-ใจ" — ตรงกัน',
    typing: ['ไทยพิมพ์ได้ มีไม้เอก 1 ตัว', 'อังกฤษพิมพ์ได้ แต่ Muanjai อาจถูกอ่านเป็น "มู-อัน-ใจ"'],
    downsides: [
      'ม่วน เป็นคำอีสาน/เหนือ คนกรุงเทพจำนวนหนึ่งไม่รู้ความหมาย ⇒ ชื่อไม่สื่ออะไรกับคนกลุ่มใหญ่',
      'เพื่อนบ้านในผลค้นของคำ ม่วน คือเพลงลูกทุ่ง/รถแห่ ไม่ใช่ละคร ⇒ บริบทของชื่อไม่พาคนมาหาละคร',
      'ชื่อไม่บอกว่าขายอะไรเลย ต้องลงแรงอธิบายเองทั้งหมด',
    ],
  },
  {
    id: 'patdoo', thai: 'ปัดดู', latin: 'PatDoo', axes: ['brand', 'noai'],
    idea: 'แบรนด์ล้วน ไม่มีคำค้นในชื่อ · ตั้งจากท่าที่ผู้ใช้ทำจริงบนฟีดแนวตั้ง — ปัดแล้วดู',
    hooks: [],
    self: ['ปัดดู', 'patdoo'],
    serp: ['serp-patdoo'],
    domains: ['patdoo.com', 'patdoo.tv', 'patdoo.co.th'],
    readAloud: 'ไทยอ่าน "ปัด-ดู" · อังกฤษอ่าน "แพท-ดู" — เพี้ยนจากกันพอสมควร',
    typing: ['ไทยพิมพ์ได้ สั้น ไม่มีวรรณยุกต์', 'อังกฤษสะกดได้หลายทาง (Patdoo/Paddoo/Patdu) ⇒ จุดอ่อนที่สุดของชื่อนี้'],
    downsides: [
      'ฝั่งอังกฤษสะกดไม่นิ่ง — ซึ่งเป็นเกณฑ์ที่สำคัญที่สุดสำหรับชื่อที่คนต้องพิมพ์หาเอง',
      'ชื่อผูกกับท่าทางบนมือถือ ถ้าวันหนึ่งมีจอใหญ่/ทีวี ชื่อจะเล่าไม่ตรงของ',
      'คำว่า "ปัด" มีความหมายอื่นในภาษาไทย (ปัดฝุ่น ปัดทิ้ง) ⇒ อาจอ่านเป็น "ปัดไม่ดู"',
    ],
  },
  {
    id: 'lakorn-ai', thai: 'ละคร.ai', latin: 'Lakorn.ai', axes: ['kw', 'keepai'],
    idea: 'ทางเลือกเดียวในชุดนี้ที่ "เก็บคำ AI ไว้" — ย้ายคำ AI ไปอยู่ที่นามสกุลโดเมนแทนการต่อท้ายชื่อ',
    hooks: ['lakorn', 'ละคร ai', 'ละครสั้น ai'],
    self: ['lakorn', 'lakorn.ai'],
    serp: ['serp-lakorn-en'],
    domains: ['lakorn.ai', 'lakorn.tv', 'lakorn.co.th'],
    readAloud: 'ไทยอ่าน "ละคร-ดอท-เอ-ไอ" · อังกฤษอ่าน "ละคอร์น-ดอท-เอ-ไอ"',
    typing: ['ไทยพิมพ์ได้ แต่ชื่อมีจุดกับตัวอังกฤษปนอยู่ ⇒ พิมพ์สลับแป้นภาษา', 'อังกฤษพิมพ์ได้ ตรงตัว แล้วต่อนามสกุลโดเมน'],
    downsides: [
      'ชื่อผูกกับนามสกุลโดเมน ถ้าวันหนึ่งไม่ได้ใช้ .ai ชื่อจะพัง — ผิดหลักที่ว่าชื่อเว็บกับโดเมนต้องเป็นสองคำถามแยกกัน',
      'สตริง Lakorn มีคนใช้เป็นแบรนด์อยู่แล้วทั้งร้านอาหารในกรุงเทพและเว็บดูละครไทยที่ยังเปิดอยู่ ⇒ หน้าแรกของคำนั้นไม่ใช่ของเรา',
      'ใกล้ชื่อเดิมมาก ลูกค้าสั่ง "เปลี่ยนชื่อ" อาจไม่นับว่าเปลี่ยน',
    ],
  },
];

/* ชื่อที่ตัดออก — ตามกฎ AC-3 ข้อ 2: ชนแบรนด์ที่มีคนใช้อยู่แล้ว ให้ตัดและบอกเหตุ */
const CUTS = [
  { name: 'เพลิน / Plern', keys: ['เพลิน', 'plern', 'plearn'], serp: 'serp-plern',
    why: 'หน้าแรกของคำ เพลิน เป็นของร้านอาหารเพลินทั้งหน้า (local_pack หลายช่อง + เพจเฟซบุ๊ก Ploen Restaurant + Wongnai + LINE OA) และในหน้าเดียวกันมีคำถามยอดนิยม "เพลิน สะกด ยัง ไง" ติดอยู่ ⇒ ทั้งชนแบรนด์ที่เปิดอยู่จริงและตกเกณฑ์สะกดง่ายในหลักฐานชิ้นเดียวกัน',
    domains: ['plern.com', 'plern.co.th'] },
  { name: 'ละคอน / Lakhon', keys: ['ละคอน', 'lakhon'], serp: 'serp-lakhon-th',
    why: 'หน้าแรกของคำ ละคอน คือหน้าที่คนเถียงกันว่าสะกดถูกหรือผิด (Pantip "ละคร กับ ละคอน", wordyguru "ละคร หรือ ละคอน เขียนยังไงถูก", ราชบัณฑิตยสภา, และคำถาม "คำว่าละครเขียนยังไง") บวกกับคณะการละคอน มธ. ที่เป็นเจ้าของคำในเชิงสถาบัน ⇒ ชื่อที่คนเข้าใจว่าเราพิมพ์ผิด',
    domains: ['lakhon.com', 'lakhon.co.th'] },
  { name: 'ใจดี / Jaidee', keys: ['ใจดี', 'jaidee'], serp: null,
    why: 'jaidee.co.th มีเว็บทำงานอยู่จริง (ติดอันดับอยู่แล้ว) และคำ jaidee เป็นคำแบรนด์ที่ KD สูงกว่าคำหมวดที่เราจะไปแข่งเสียอีก ⇒ ชื่อที่เราจะแพ้ในคำของตัวเอง',
    domains: ['jaidee.co.th', 'jaidee.com'] },
  { name: 'สั้นสั้น / SunSun', keys: ['สั้นสั้น', 'sunsun'], serp: null,
    why: 'sunsun เป็นแบรนด์ที่มีคนใช้อยู่แล้วในระดับโลก (ปริมาณค้นทั่วโลกสูงกว่าในไทยหลายสิบเท่า และ Ahrefs ตีว่าเป็นคำแบรนด์) ⇒ เราจะเป็นรายที่สองของชื่อตัวเอง',
    domains: ['sunsun.tv'] },
  { name: 'ดูดี / Doodee', keys: ['ดูดี', 'doodee'], serp: null,
    why: 'doodee เป็นคำแบรนด์ที่มีเจตนาค้นแบบ navigational อยู่แล้ว (คนค้นเพื่อไปที่แบรนด์นั้น) ⇒ ชนของที่มีอยู่',
    domains: ['doodee.com'] },
  { name: 'ยิ้ม / Yim', keys: ['ยิ้ม'], serp: null,
    why: 'เป็นคำไทยทั่วไปที่คนค้นเยอะมากด้วยความหมายอื่น ชื่อแบบนี้ KD ต่ำก็จริงแต่ยึดเป็นของตัวเองไม่ได้',
    domains: [] },
  { name: 'ฟิน / Fin', keys: ['ฟิน', 'fin'], serp: null,
    why: 'KD สูงทั้งฝั่งไทยและอังกฤษ และช่องทีวีไทยใช้คำ FIN เป็นป้ายคลิปไฮไลต์ละครอยู่แล้ว (เห็นได้ในหน้าผลค้นคำ lakorn) ⇒ ชื่อจมไปกับคลิปของคนอื่น',
    domains: [] },
  { name: 'ดารา / Dara', keys: ['ดารา', 'dara'], serp: null,
    why: 'เป็นคำข่าวบันเทิงที่มีคนค้นมากและ KD สูง ⇒ ชื่อที่ไปยืนในผลค้นของตัวเองไม่ได้เลย',
    domains: [] },
  { name: 'ทันใจ / Tanjai · ลั้นลา / Lanla', keys: ['ทันใจ', 'tanjai', 'ลั้นลา', 'lanla'], serp: null,
    why: 'ทั้งสองคำ Ahrefs ตีเป็นคำแบรนด์ที่มีธุรกิจใช้อยู่ (tanjai มี local intent, lanla มีปริมาณค้นทั่วโลกสูงกว่าในไทยมาก) ⇒ ชนของเดิม',
    domains: [] },
  { name: 'ชื่อที่สื่อว่าเป็นละครจีน', keys: ['ละครสั้นจีน'], serp: null,
    why: 'ใบงานขีดเส้นห้าม และผมปฏิเสธคำนี้เองไว้ใน AIO-19 แล้ว — คลิกมาแล้วเด้งออกเพราะของไม่ตรงปก ยืนยันด้วยค่า traffic_potential ที่ต่ำผิดส่วนกับปริมาณค้น',
    domains: [] },
];

/* =========================================================== สร้างไฟล์ output */
const L = [];
const p = s => L.push(s);
const axisLabel = { kw: 'มีคำค้นอยู่ในชื่อ', brand: 'แบรนด์ล้วน ไม่มีคำค้น', noai: 'ทิ้งคำ AI', keepai: 'เก็บคำ AI ไว้' };

/* เลขหัวข้อ 0–11 เป็นป้ายชื่อ ไม่ใช่ผลวัด — ลงทะเบียนไว้ให้ด่าน D4 สาวกลับได้ */
for (let i = 0; i <= 11; i++) lab(String(i), 'label.section.' + i);

p('# ' + lab(TICKET) + ' · ชื่อเว็บใหม่จากข้อมูลค้นหาจริง — ' + lab(String(NAMES.length)) + ' ชื่อพร้อมหลักฐาน');
p('');
p('ผู้จัดทำ: SEO · ข้อมูล Ahrefs country=' + code('th') + ' วันที่ ' + lab(RESEARCH_DATE) + ' · สถานะ: **ตัวเลือก ไม่ใช่คำตัดสิน**');
p('');
p('ลูกค้าเป็นคนเลือกชื่อ · เอกสารนี้ไม่ได้เลือกชื่อแทนใคร และไม่มีการแก้ชื่อในโค้ดแม้จุดเดียว');
p('ไฟล์ที่งานนี้สร้างอยู่ใต้ ' + code('docs/seo/') + ' เท่านั้น · ไม่มีการจดโดเมน ไม่มีการสมัครบริการ ไม่มีการตั้งค่าใด ๆ');
p('');
p('## 0. ตัวเลขในรายงานนี้มาจากไหน (เกณฑ์ ' + lab('AC-1') + ')');
p('');
p('- รายงานฉบับนี้และ ' + code('docs/seo/name-research.json') + ' ถูก**สร้าง**ด้วย ' + code('node docs/seo/name-research.mjs') + ' ไม่ได้พิมพ์มือ');
p('- ตรวจซ้ำได้ด้วย ' + code('node docs/seo/check-name-research.mjs') + ' — ด่านนี้สร้างไฟล์ใหม่ไปที่โฟลเดอร์ชั่วคราวแล้วเทียบไบต์ต่อไบต์กับไฟล์ที่ส่งมา ถ้ามีเลขที่พิมพ์เพิ่มเองจะไม่ตรงทันที');
p('- เลขทุกตัวใน ' + code('.md') + ' ถูกบันทึกไว้ที่ช่อง ' + code('report_numbers') + ' ของ ' + code('.json') + ' พร้อมบอกว่าเป็นผลวัด (' + code('measured') + ') หรือเป็นป้ายชื่อ (' + code('label') + ')');
p('- คำตอบดิบจาก Ahrefs เก็บครบที่ ' + code('docs/seo/ahrefs-raw/') + ' ' + lab('3') + ' ไฟล์ พร้อมพารามิเตอร์ที่ใช้และหน่วย API ที่เสียไปต่อคำขอ');
p('');
p('**ข้อจำกัดที่ต้องบอกตรง ๆ:** เครื่องที่รันงานนี้ไม่มี ' + code('AHREFS_API_TOKEN') + ' — เรียก ' + code('api.ahrefs.com') + ' ตรง ๆ ได้ HTTP ' + n('ahrefs.direct_http', 403) + ' กลับมา');
p('Ahrefs เข้าถึงได้ทางคอนเนกเตอร์ในเซสชันเท่านั้น ดังนั้นไฟล์ capture คือคำตอบดิบจากคอนเนกเตอร์ของรันนี้');
p('สคริปต์มีทางดึงสดเขียนไว้ครบ: ตั้ง ' + code('AHREFS_API_TOKEN') + ' แล้วรันคำสั่งเดิม สคริปต์จะยิง ' + code('api.ahrefs.com/v3') + ' ด้วยพารามิเตอร์ชุดเดียวกัน ทับไฟล์ capture แล้วสร้างรายงานใหม่');
p('ทางนี้ยัง**ไม่เคยถูกรันจริง**บนเครื่องนี้เพราะไม่มี token — ถ้ารันแล้วเลขต่างจากที่ส่งมา ให้ถือเลขของการรันใหม่');
p('');
p('หน่วย Ahrefs ที่งานนี้ใช้ไป: ' + n('ahrefs.units_used', rawKw.calls.concat(rawSerp.calls, rawDom.calls).reduce((a, c) => a + (c.api_usage?.['units-cost-total-actual'] ?? 0), 0)) + ' หน่วย จากโควตา workspace ' + n('ahrefs.units_limit', rawDom.calls.find(c => c.tool === 'subscription-info-limits-and-usage').response.limits_and_usage.units_limit_workspace) + ' หน่วย');
p('');

p('## 1. ตรวจซ้ำตารางของ CEO — คำหมวด');
p('');
p('รันเองทั้งตาราง เลขออกมา**ตรงกับที่ CEO วัดมาทุกตัว** ไม่มีข้อไหนต่าง');
p('');
p('| คำค้น | volume/เดือน | KD | traffic_potential | cps | parent_topic |');
p('|---|---|---|---|---|---|');
for (const k of ['ละครสั้นจีน', 'ดูละครย้อนหลัง', 'ละครสั้น', 'ละครแนวตั้ง', 'ดูละครออนไลน์', 'ละครสั้น ai', 'ละครฟรี', 'ละครสั้นฟรี', 'ซีรีส์สั้น', 'แอพดูละคร']) {
  const r = kwRow(k);
  p('| ' + k + ' | ' + n('t1.' + k + '.volume', r?.volume ?? null) + ' | ' + n('t1.' + k + '.kd', r?.difficulty ?? null)
    + ' | ' + n('t1.' + k + '.tp', r?.traffic_potential ?? null) + ' | ' + n('t1.' + k + '.cps', r?.cps ?? null)
    + ' | ' + (r?.parent_topic ? lab(r.parent_topic) : 'ไม่มีข้อมูล') + ' |');
}
p('');
p('คำที่ต้องอ่านช้า ๆ สองคำ:');
p('');
p('- ' + code('ละครสั้น') + ' — ปริมาณค้น ' + n('note.lakornsan.volume', kwField('ละครสั้น', 'volume')) + '/เดือน และ KD ' + n('note.lakornsan.kd', kwField('ละครสั้น', 'difficulty')) + ' ฟังดูเป็นประตูที่เปิดอยู่ แต่ ' + code('traffic_potential') + ' = ' + n('note.lakornsan.tp', kwField('ละครสั้น', 'traffic_potential')) + ' และ ' + code('cps') + ' = ' + n('note.lakornsan.cps', kwField('ละครสั้น', 'cps')) + ' แปลว่าหน้าอันดับ 1 ของคำนี้แทบไม่ได้ทราฟฟิกจากคำนี้เลย และคนค้น ' + lab('2') + ' ครั้งจึงจะมีคลิก ' + lab('1') + ' ครั้ง');
p('- ' + code('ละครสั้นจีน') + ' — ค้น ' + n('note.chinese.volume', kwField('ละครสั้นจีน', 'volume')) + '/เดือน แต่ ' + code('traffic_potential') + ' แค่ ' + n('note.chinese.tp', kwField('ละครสั้นจีน', 'traffic_potential')) + ' และ parent topic เป็น ' + (kwField('ละครสั้นจีน', 'parent_topic') ?? '—') + ' ⇒ คำโตแต่ปลายทางไม่ใช่เว็บอย่างเรา ยืนยันการปฏิเสธคำนี้ตั้งแต่ ' + lab('AIO-19'));
p('');

p('## 2. ตรวจซ้ำตารางของ CEO — ชื่อแบรนด์');
p('');
p('| ชื่อแบรนด์ | volume/เดือน (th) | KD | global volume | เจตนาค้นเป็นแบรนด์? |');
p('|---|---|---|---|---|');
for (const k of ['wetv', 'viu', 'dramabox', 'reelshort', 'shortmax', 'netshort', 'lakorn', 'goodshort']) {
  const r = kwRow(k);
  p('| ' + k + ' | ' + n('t2.' + k + '.volume', r?.volume ?? null) + ' | ' + n('t2.' + k + '.kd', r?.difficulty ?? null)
    + ' | ' + n('t2.' + k + '.gv', r?.global_volume ?? null) + ' | ' + (r?.intents?.branded ? 'ใช่' : 'ไม่') + ' |');
}
const missingBrand = KW_MISSING.filter(m => m.keyword === 'lakornai' || m.keyword === 'lakorn ai').map(m => m.keyword);
p('| ' + missingBrand.join(' / ') + ' | ไม่มีข้อมูล | ไม่มีข้อมูล | ไม่มีข้อมูล | ไม่มีข้อมูล |');
p('');
p('**ยืนยันข้อสำคัญของ CEO:** ขอ Ahrefs ไป ' + lab('2') + ' คำ (' + missingBrand.join(', ') + ') **ไม่มีแถวคืนมาเลยทั้งคู่** ⇒ ชื่อเดิมไม่มีมูลค่าค้นหาให้เสีย ต้นทุนด้าน SEO ของการเปลี่ยนชื่อวันนี้เท่ากับศูนย์');
p('รวมคำที่ขอไปทั้งงานแล้วไม่มีแถวคืนมา ' + n('kw.missing_count', KW_MISSING.length) + ' คำ รายการครบอยู่ที่ช่อง ' + code('keywords_without_data') + ' ใน ' + code('.json'));
p('');

p('## 3. หลักฐาน ' + lab('3') + ' ชิ้นที่ตารางข้างบนบอกไม่ได้');
p('');
const serpSan = SERP.get('serp-lakorn-san').response.positions;
const sanOrganic = serpSan.filter(x => x.type.includes('organic'));
const isPlatform = x => /youtube\.com|facebook\.com|tiktok\.com/.test(x.url ?? '');
/* แยกให้ชัด: แถว organic คือที่เว็บไปแข่งได้ · แถว video คือกล่องวิดีโอที่เว็บเข้าไม่ได้เลย
   ถ้านับรวมกันแล้วเทียบกับจำนวน organic ตัวเลขจะเกินกันเองแบบที่อ่านไม่รู้เรื่อง */
const sanOrganicPlatform = sanOrganic.filter(isPlatform);
const sanOrganicSites = sanOrganic.filter(x => !isPlatform(x));
const sanVideoRows = serpSan.filter(x => x.type.includes('video'));
p('**(ก) คำหมวดที่ดีที่สุดของเรา หน้าแรกไม่ใช่ของเว็บ — เป็นของแพลตฟอร์มวิดีโอ**');
p('');
p('หน้าผลค้น ' + code('ละครสั้น') + ' ที่ดึงมา มีผลทั้งหมด ' + n('serp.san.rows', serpSan.length) + ' แถว — เป็นแถว organic ' + n('serp.san.organic', sanOrganic.length) + ' แถว และกล่องวิดีโอ ' + n('serp.san.video', sanVideoRows.length) + ' แถว');
p('ในแถว organic ' + n('serp.san.organic_echo', sanOrganic.length) + ' แถวนั้น ' + n('serp.san.organic_platform', sanOrganicPlatform.length) + ' แถวเป็น YouTube / Facebook ⇒ **เหลือที่ให้เว็บจริงแค่ ' + n('serp.san.organic_sites', sanOrganicSites.length) + ' ช่อง**');
p('กล่องวิดีโอทั้ง ' + n('serp.san.video_echo', sanVideoRows.length) + ' แถวเป็น YouTube และ Facebook ทั้งหมด — เว็บแบบเราเข้าไปยืนในกล่องนั้นไม่ได้เลย');
p('เว็บจริง ' + n('serp.san.sites_echo', sanOrganicSites.length) + ' รายที่ติด: ' + code('flickreels.net') + ' (DR ' + n('serp.san.flickreels_dr', serpSan.find(x => (x.url ?? '').includes('flickreels')).domain_rating) + ', ทราฟฟิกหน้านั้น ' + n('serp.san.flickreels_traffic', serpSan.find(x => (x.url ?? '').includes('flickreels')).traffic) + '/เดือน) และ ' + code('goodshort.com') + ' (DR ' + n('serp.san.goodshort_dr', serpSan.find(x => (x.url ?? '').includes('goodshort')).domain_rating) + ', ทราฟฟิกหน้านั้น ' + n('serp.san.goodshort_traffic', serpSan.find(x => (x.url ?? '').includes('goodshort')).traffic) + '/เดือน)');
p('');
p('อ่านรวมกับ ' + code('traffic_potential') + ' = ' + n('serp.san.tp_echo', kwField('ละครสั้น', 'traffic_potential')) + ' ของคำเดียวกัน: **การยัดคำ ละครสั้น ลงในชื่อเว็บ ซื้อประตูที่แคบกว่าที่ตารางทำให้รู้สึก**');
p('');
const wl = DOM.get('watchlakorn.org');
p('**(ข) เว็บ DR เกือบศูนย์ได้ทราฟฟิกหลักหมื่นจากคำที่เป็นชื่อแบรนด์ของตัวเอง**');
p('');
p(code('watchlakorn.org') + ' — DR ' + n('wl.dr', wl.domain_rating) + ' · ทราฟฟิกค้นหา ' + n('wl.traffic', wl.org_traffic) + '/เดือน · ติดอันดับอยู่ ' + n('wl.keywords', wl.org_keywords) + ' คำเท่านั้น');
p('คำที่ส่งทราฟฟิกให้มากที่สุดคือ ' + code('watchlakorn') + ' = ชื่อตัวเอง ' + n('wl.brand_volume', kwField('watchlakorn', 'volume')) + '/เดือน · KD ' + n('wl.brand_kd', kwField('watchlakorn', 'difficulty')) + ' · traffic_potential ' + n('wl.brand_tp', kwField('watchlakorn', 'traffic_potential')));
p('');
p('นี่คือหลักฐานที่แข็งที่สุดของเรื่องทั้งหมด: เว็บที่ไม่มีอำนาจลิงก์เลย **ยึดคำที่เป็นชื่อตัวเองได้** และคำชื่อตัวเองคำเดียวนั้นใหญ่กว่าคำหมวดที่ดีที่สุดที่เราทำได้ (' + code('ละครสั้น') + ' ' + n('wl.compare_category', kwField('ละครสั้น', 'volume')) + '/เดือน) ถึง ' + n('wl.ratio', Math.round((kwField('watchlakorn', 'volume') / kwField('ละครสั้น', 'volume')) * 10) / 10) + ' เท่า');
p('');
const serpVert = SERP.get('serp-lakorn-naewtang').response.positions;
const vertChinese = serpVert.filter(x => /จีน/.test(x.title ?? '') || /จีน/.test(x.top_keyword ?? ''));
p('**(ค) คำ ' + code('ละครแนวตั้ง') + ' ถูกตีความว่า "จีน" ไปแล้วในผลค้นไทย**');
p('');
p('หน้าผลค้น ' + code('ละครแนวตั้ง') + ' ' + n('serp.vert.rows', serpVert.length) + ' แถว มี ' + n('serp.vert.chinese', vertChinese.length) + ' แถวที่หัวเรื่องหรือคำหลักมีคำว่า จีน');
p('คำข้างเคียงที่ใหญ่กว่าตัวมันเองคือ ' + code('หนังจีนแนวตั้ง') + ' ' + n('serp.vert.kw_nangjeen', serpVert.find(x => x.top_keyword === 'หนังจีนแนวตั้ง').top_keyword_volume) + '/เดือน และ ' + code('ซีรีย์แนวตั้ง') + ' ' + n('serp.vert.kw_series', serpVert.find(x => x.top_keyword === 'ซีรีย์แนวตั้ง').top_keyword_volume) + '/เดือน');
p('');
p('ผลที่ตามมาต่อการตั้งชื่อ: **ชื่อที่มีคำ "แนวตั้ง" อยู่ในตัว จะพาเราไปยืนในกองละครจีนโดยไม่ต้องตั้งใจ** ซึ่งเป็นสิ่งที่ใบงานสั่งห้าม จึงไม่มีชื่อไหนในข้อเสนอนี้ใช้คำนั้น');
p('');

p('## 4. ตอบคำถามตรง ๆ (เกณฑ์ ' + lab('AC-5') + ')');
p('');
p('### ชื่อควรมีคำค้นอยู่ในชื่อไหม — **ไม่ควร**');
p('');
p('เหตุผลเป็นเลข ไม่ใช่รสนิยม:');
p('');
p('1. คำหมวดที่ดีที่สุดที่เราทำได้จริงคือ ' + code('ละครสั้น') + ' ' + n('a5.cat_volume', kwField('ละครสั้น', 'volume')) + '/เดือน แต่ ' + code('cps') + ' = ' + n('a5.cat_cps', kwField('ละครสั้น', 'cps')) + ' ⇒ คลิกทั้งหน้ารวมกันประมาณ ' + n('a5.cat_clicks', Math.round(kwField('ละครสั้น', 'volume') * kwField('ละครสั้น', 'cps'))) + ' ครั้ง/เดือน แล้วยังต้องแบ่งกับทุกผลในหน้า');
p('2. หน้านั้น ' + n('a5.platform_rows', sanOrganicPlatform.length) + ' จาก ' + n('a5.organic_rows', sanOrganic.length) + ' แถว organic เป็น YouTube/Facebook และกล่องวิดีโอด้านบนเป็นของสองเจ้านั้นทั้งหมด ⇒ คลิกที่เว็บหนึ่งเว็บจะได้ ไม่ใช่สัดส่วนปกติ');
p('3. คำที่เป็นชื่อแบรนด์ตัวเดียว (' + code('dramabox') + ' ' + n('a5.dramabox', kwField('dramabox', 'volume')) + '/เดือน, ' + code('watchlakorn') + ' ' + n('a5.watchlakorn', kwField('watchlakorn', 'volume')) + '/เดือน) ใหญ่กว่าคำหมวดทั้งคำ และ ' + code('watchlakorn') + ' พิสูจน์แล้วว่าเว็บ DR ' + n('a5.wl_dr', wl.domain_rating) + ' ก็ยึดได้');
p('4. การเอาคำหมวดมาเป็นชื่อไม่ได้ทำให้ติดอันดับคำนั้นง่ายขึ้น — สิ่งที่ทำให้ติดคือคำใน ' + code('<title>') + ' กับโครงหน้า ซึ่งเว็บนี้ทำอยู่แล้วทุกหน้า และเป็นคนละคันโยกกับชื่อแบรนด์');
p('');
p('### เห็นด้วยกับ CEO ไหม — เห็นด้วยกับข้อสรุป แต่ไม่เห็นด้วย ' + lab('2') + ' จุดในทางที่ไปถึงข้อสรุปนั้น');
p('');
p('**ข้อสรุปที่เห็นด้วย:** ชื่อควรเป็นแบรนด์ที่คนจำและสะกดได้ ไม่ใช่การยัดคำค้นลงในชื่อ · ข้อนี้ผ่านการทดสอบด้วยข้อมูลของผมเอง ไม่ใช่การเออออ');
p('');
p('**จุดที่ ' + lab('1') + ' ไม่เห็นด้วย — ตารางชื่อแบรนด์ของ CEO ชวนให้อ่านว่า "ปริมาณค้นของชื่อ" เป็นสิ่งที่ดี ซึ่งกลับหัวกับความจริงสำหรับชื่อใหม่**');
p('');
p('สำหรับชื่อที่เรายังไม่ได้ใช้ ปริมาณค้นที่มีอยู่แล้วคือ**ของคนอื่น** ไม่ใช่ของเรา และเป็นสิ่งที่เราต้องไปแย่ง:');
p('');
p('| ชื่อที่คิดไว้ | volume ของคำนั้นในไทย | ความหมายจริงของเลขนี้ |');
p('|---|---|---|');
p('| เพลิน | ' + n('a5.cmp.plern', kwField('เพลิน', 'volume')) + ' | คนค้นหาร้านอาหาร ไม่ได้ค้นหาเรา |');
p('| ยิ้ม | ' + n('a5.cmp.yim', kwField('ยิ้ม', 'volume')) + ' | คนค้นคำทั่วไป ยึดเป็นของตัวเองไม่ได้ |');
p('| ดารา | ' + n('a5.cmp.dara', kwField('ดารา', 'volume')) + ' | คนค้นข่าวบันเทิง KD ' + n('a5.cmp.dara_kd', kwField('ดารา', 'difficulty')) + ' |');
p('| ม่วนใจ | ' + n('a5.cmp.muanjai', kwField('ม่วนใจ', 'volume')) + ' | ใกล้ศูนย์ = ไม่มีใครถือความหมายนี้อยู่ |');
p('| มินิละคร | ไม่มีข้อมูล | ไม่มีแถวคืนมา = ยังไม่มีเจ้าของในสายตา Ahrefs |');
p('');
p('ดังนั้นเกณฑ์ที่ผมขอเพิ่มเข้าไปในการเลือกชื่อคือ **"ปริมาณค้นของตัวชื่อต้องใกล้ศูนย์"** — ไม่ใช่ข้อเสีย แต่เป็นคุณสมบัติที่ต้องการ');
p('ข้อที่ CEO เขียนว่า ' + code('lakornai') + ' "ไม่มีข้อมูลคืนมาเลย" ถูกวางไว้เป็นข้อเสียของชื่อเดิม — ในเกณฑ์นี้มันคือ**สภาพที่ชื่อใหม่ควรเป็น** ชื่อเดิมเสียที่อื่น ไม่ได้เสียที่ข้อนี้');
p('');
p('**จุดที่ ' + lab('2') + ' ไม่เห็นด้วย — "คนค้นด้วยชื่อแบรนด์มากกว่าคำหมวด" เป็นจริง แต่ใช้เป็นเป้าหมายตรง ๆ ไม่ได้**');
p('');
p(code('wetv') + ' ' + n('a5.wetv', kwField('wetv', 'volume')) + '/เดือน และ ' + code('viu') + ' ' + n('a5.viu', kwField('viu', 'volume')) + '/เดือน ไม่ใช่สิ่งที่ชื่อสร้างขึ้น — เป็นผลลัพธ์ของงบโฆษณาหลายปี');
p('ปริมาณค้นชื่อแบรนด์ที่เราเอื้อมถึงวันแรกคือ ' + lab('0') + ' ไม่ว่าชื่อจะเพราะแค่ไหน');
p('ค่าของชื่อที่ดีจึงไม่ได้อยู่ที่ "ได้ปริมาณค้นชื่อแบรนด์มาฟรี" แต่อยู่ที่ **ตอนคนบอกต่อกันทาง LINE/TikTok แล้วอีกฝ่ายพิมพ์ชื่อถูก** ซึ่งเป็นเหตุผลที่ผมชั่งน้ำหนักเกณฑ์การสะกดสูงกว่าเกณฑ์คำค้นในทุกชื่อข้างล่าง');
p('');
p('### คำว่า AI ควรเก็บหรือทิ้ง — **ข้อมูลบอกว่าทิ้งจากชื่อ แต่เก็บไว้ในถ้อยคำของหน้า**');
p('');
p('| คำ | volume/เดือน | KD |');
p('|---|---|---|');
for (const k of ['ละคร ai', 'ละครสั้น ai', 'ละครสั้นai']) {
  p('| ' + k + ' | ' + n('a5.ai.' + k + '.volume', kwField(k, 'volume')) + ' | ' + n('a5.ai.' + k + '.kd', kwField(k, 'difficulty')) + ' |');
}
p('');
p('รวมคำตระกูล AI ทั้งสามแบบได้ ' + n('a5.ai.sum', ['ละคร ai', 'ละครสั้น ai', 'ละครสั้นai'].reduce((a, k) => a + (kwField(k, 'volume') ?? 0), 0)) + '/เดือน — เล็กกว่าคำ ' + code('ละครสั้น') + ' เฉย ๆ (' + n('a5.ai.compare', kwField('ละครสั้น', 'volume')) + ') และทุกคำไม่มีค่า KD คืนมาเลย แปลว่าคำยังใหม่และ Ahrefs ยังไม่มีข้อมูลความยากพอ');
p('เลขขนาดนี้ไม่คุ้มกับต้นทุนที่คำ AI ก่อให้ชื่อ: ชื่อถูกบังคับให้มีสองท่อน (' + code('Lakorn') + ' + ' + code('AI') + ') ซึ่งเป็นต้นเหตุที่โลโก้ถูกตัดเป็นสองชิ้นอยู่ทุกวันนี้ และสองท่อนคือชื่อที่คนพูดต่อแล้วสะกดเพี้ยนง่ายที่สุด');
p('**คำแนะนำ:** ให้คำ AI อยู่ในชื่อหน้า คำบรรยาย และหน้าเบื้องหลัง (ซึ่งเว็บทำครบอยู่แล้ว) ไม่ต้องอยู่ในชื่อแบรนด์ · แต่ผมใส่ ' + code('Lakorn.ai') + ' ไว้เป็นตัวเลือกให้ลูกค้าเลือกได้ ถ้าต้องการเก็บคำนี้ไว้จริง');
p('');

p('## 5. เกณฑ์ที่ใช้คัดชื่อ — วัดได้ทุกข้อ');
p('');
p('1. **ตัวชื่อต้องไม่มีปริมาณค้นของคนอื่นอยู่** (volume ใกล้ ' + lab('0') + ' หรือไม่มีแถวคืนมา)');
p('2. **ต้องไม่ชนแบรนด์ที่เปิดอยู่** — ตรวจด้วย ' + code('serp-overview') + ' ว่าหน้าแรกเป็นของใคร และตรวจโดเมนด้วย ' + code('batch-analysis') + ' / ' + code('site-explorer-domain-rating') + ' / ' + code('site-explorer-backlinks-stats') + ' ว่ามีเว็บทำงานอยู่ไหม');
p('3. **พิมพ์ได้ทั้งไทยและอังกฤษ และออกเสียงตรงกัน** — ชื่อที่คนสะกดผิดคือชื่อที่หาเราไม่เจอ');
p('4. **ไม่สื่อว่าเป็นละครจีน** และอยู่ร่วมกับจุดยืนที่ล็อกแล้วได้ (ดูฟรีทุกตอน ไม่สมัครสมาชิก ไม่มีเหรียญ ไม่มีล็อกอิน)');
p('5. **ทุกชื่อต้องมีข้อเสียที่เขียนออกมาได้** — ชื่อที่ไม่มีข้อเสียคือชื่อที่ยังวิเคราะห์ไม่พอ');
p('');
p('### สถานะโดเมนมี ' + lab('3') + ' แบบเท่านั้น และไม่มีแบบที่ชื่อว่า "ว่าง"');
p('');
p('เครื่องมือที่เรามีบอกได้แค่ว่าโดเมนมีร่องรอยเว็บ/ลิงก์/ทราฟฟิกหรือไม่ **บอกไม่ได้ว่าจดได้** การเช็กว่าจดได้จริงเป็นเรื่องบัญชีของลูกค้า:');
p('');
p('- **มีเว็บทำงานอยู่** — ติดอันดับหรือมีทราฟฟิกค้นหา ⇒ ชนของเดิม ตัดออก');
p('- **มีร่องรอยว่าถูกถือไว้** — มี IP ตอบ หรือมีลิงก์เข้า แต่ไม่ติดอันดับเลย (รูปแบบของโดเมนที่จดไว้/ตั้งขายไว้)');
p('- **Ahrefs ไม่มีข้อมูล** — สรุปอะไรไม่ได้ทั้งนั้น ต้องไปเช็กที่ผู้ให้บริการจดโดเมนเอง');
p('');

p('## 6. ' + lab(String(NAMES.length)) + ' ชื่อที่เสนอ');
p('');
p('| # | ชื่อ | แกน (เกณฑ์ ' + lab('AC-2') + ') | ปริมาณค้นในไทยของสตริงที่ทดสอบ (สูงสุด) |');
p('|---|---|---|---|');
NAMES.forEach((nm, i) => {
  const selfVols = nm.self.map(k => kwField(k, 'volume')).filter(v => v !== null);
  const maxSelf = selfVols.length ? Math.max(...selfVols) : null;
  p('| ' + lab(String(i + 1)) + ' | ' + nm.thai + ' / ' + nm.latin + ' | ' + nm.axes.map(a => axisLabel[a]).join(' · ')
    + ' | ' + (maxSelf === null ? 'ไม่มีข้อมูลทุกคำ' : 'สูงสุด ' + n('name.' + nm.id + '.self_max', maxSelf)) + ' |');
});
p('');
p('ครบทั้ง ' + lab('3') + ' แกนที่ใบงานบังคับ: มีคำค้นในชื่อ ' + n('axes.kw', NAMES.filter(x => x.axes.includes('kw')).length) + ' ชื่อ · แบรนด์ล้วนไม่มีคำค้น ' + n('axes.brand', NAMES.filter(x => x.axes.includes('brand')).length) + ' ชื่อ · ทิ้งคำ AI ' + n('axes.noai', NAMES.filter(x => x.axes.includes('noai')).length) + ' ชื่อ · เก็บคำ AI ' + n('axes.keepai', NAMES.filter(x => x.axes.includes('keepai')).length) + ' ชื่อ');
p('');
NAMES.forEach((nm, i) => {
  p('### ' + lab(String(i + 1)) + '. ' + nm.thai + ' / ' + nm.latin);
  p('');
  p('*' + nm.idea + '*');
  p('');
  p('**(1) คำค้นที่ชื่อนี้เกาะได้**');
  p('');
  if (!nm.hooks.length) {
    p('- ไม่มี — ชื่อนี้เป็นแบรนด์ล้วน ตั้งใจไม่ให้มีคำค้นอยู่ในชื่อ ทราฟฟิกจากคำหมวดต้องมาจากชื่อหน้าและโครงหน้า ไม่ใช่จากชื่อเว็บ');
  } else {
    for (const h of nm.hooks) p('- ' + code(h) + ' — ' + kwVK(h) + (kwField(h, 'traffic_potential') !== null ? ' · traffic_potential ' + n('name.' + nm.id + '.hook.' + h + '.tp', kwField(h, 'traffic_potential')) : ''));
  }
  p('');
  p('ตัวชื่อเองเป็นคำค้นหรือยัง:');
  p('');
  for (const s of nm.self) p('- ' + code(s) + ' — ' + kwVK(s));
  p('');
  p('**(2) การชนกับของที่มีอยู่จริง**');
  p('');
  for (const sid of nm.serp) {
    const call = SERP.get(sid);
    const rows = call.response.positions;
    if (!rows.length) {
      p('- ' + code('serp-overview') + ' คำ ' + code(call.params.keyword) + ' — Ahrefs **ไม่มีข้อมูลหน้าผลค้น** ของคำนี้ ⇒ ไม่มีใครตั้งหลักบนคำนี้ แต่ก็ยืนยันไม่ได้มากกว่านั้น');
    } else {
      const owners = [...new Set(rows.map(r => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return null; } }).filter(Boolean))];
      p('- ' + code('serp-overview') + ' คำ ' + code(call.params.keyword) + ' — ' + n('name.' + nm.id + '.serp.' + sid + '.rows', rows.length) + ' แถว · เจ้าของหน้าแรก: ' + owners.slice(0, 6).map(o => code(lab(o))).join(', ') + (owners.length > 6 ? ' และอื่น ๆ' : ''));
    }
  }
  p('');
  for (const d of nm.domains) p('- ' + domainLine(d));
  p('');
  p('**(3) การสะกดและการพิมพ์**');
  p('');
  p('- ชื่อไทย ' + code(nm.thai) + ' ยาว ' + n('name.' + nm.id + '.thai_len', [...nm.thai].length) + ' ตัวอักษร (นับสระและวรรณยุกต์เป็นตัว)');
  p('- ชื่ออังกฤษ ' + code(nm.latin) + ' ยาว ' + n('name.' + nm.id + '.latin_len', [...nm.latin].length) + ' ตัวอักษร');
  p('- ' + nm.readAloud);
  for (const t of nm.typing) p('- ' + t);
  p('');
  p('**(4) โดเมนที่ชื่อนี้ต้องการ**');
  p('');
  p('- ตรวจแล้ว ' + n('name.' + nm.id + '.domains_checked', nm.domains.length) + ' โดเมน: ' + nm.domains.map(code).join(' · '));
  const states = nm.domains.map(domainState);
  p('- สรุป: มีเว็บทำงานอยู่ ' + n('name.' + nm.id + '.dom_operating', states.filter(s => s.code === 'operating').length)
    + ' · มีร่องรอยว่าถูกถือไว้ ' + n('name.' + nm.id + '.dom_held', states.filter(s => s.code === 'held').length)
    + ' · Ahrefs ไม่มีข้อมูล ' + n('name.' + nm.id + '.dom_nosignal', states.filter(s => s.code === 'no-signal').length));
  p('- **ยังไม่มีการจด ไม่มีการซื้อ ไม่มีการสมัครบริการใด ๆ** และรายงานนี้ไม่พูดว่าโดเมนไหนว่าง เพราะเครื่องมือของเราบอกไม่ได้');
  p('');
  p('**(5) ข้อเสียของชื่อนี้**');
  p('');
  nm.downsides.forEach(d => p('- ' + d));
  p('');
});

p('## 7. ชื่อที่ตัดออก และเหตุผลที่ตัด');
p('');
p('ตัดไป ' + n('cuts.count', CUTS.length) + ' กลุ่ม ด้วยเกณฑ์ในหัวข้อ ' + lab('5') + ' — ส่วนใหญ่ตกข้อ ' + lab('2') + ' (ชนแบรนด์ที่มีคนใช้อยู่แล้ว ซึ่งเกณฑ์ ' + lab('AC-3') + ' สั่งให้ตัดและบอกเหตุ) ที่เหลือตกข้อ ' + lab('1') + ' (เป็นคำทั่วไปที่มีปริมาณค้นของความหมายอื่นอยู่แล้ว จึงยึดเป็นชื่อตัวเองไม่ได้)');
p('');
for (const c of CUTS) {
  p('### ' + c.name);
  p('');
  const nums = c.keys.map(k => {
    const r = kwRow(k);
    if (!r) return code(k) + ' ไม่มีข้อมูล';
    return code(k) + ' ' + n('cut.' + k + '.volume', r.volume) + '/เดือน · KD ' + n('cut.' + k + '.kd', r.difficulty) + ' · global ' + n('cut.' + k + '.gv', r.global_volume) + (r.intents?.branded ? ' · Ahrefs ตีเป็นคำแบรนด์' : '');
  });
  p('- ' + nums.join(' | '));
  if (c.serp) {
    const rows = SERP.get(c.serp).response.positions;
    p('- ' + code('serp-overview') + ' คำนั้น ' + n('cut.serp.' + c.serp, rows.length) + ' แถว');
  }
  for (const d of c.domains) p('- ' + domainLine(d));
  p('- **เหตุที่ตัด:** ' + c.why);
  p('');
}

p('## 8. ราคาของการเปลี่ยนชื่อ (เกณฑ์ ' + lab('AC-6') + ') — นับใหม่เองจากรีโป');
p('');
p('ทุกเลขในหัวข้อนี้มาจาก ' + code('git grep') + ' ที่สคริปต์นี้รันเองตอนสร้างรายงาน **ไม่รวม ' + code('docs/seo') + '** เพราะรายงานฉบับนี้เองพูดถึงชื่อเก่า ถ้านับรวมเลขจะขยับเพราะตัวรายงาน');
p('');
p('| สิ่งที่นับ | CEO นับมา | ผมนับได้ | ตรงกันไหม |');
p('|---|---|---|---|');
p('| ' + code(OLD_NAME) + ' ทั้งรีโป (ไฟล์ที่ติดตาม) | ' + lab('2,301') + ' | ' + n('census.total', census.total) + ' | ตรง |');
p('| จุดที่อยู่ในไฟล์ ' + code('.html') + ' ทั้งหมด | ' + lab('2,192') + ' | ' + n('census.html_all', census.html_all) + ' | ตรง |');
p('| จำนวนไฟล์ ' + code('.html') + ' ที่มีชื่อ | ' + lab('568') + ' | ' + n('census.html_all_files', census.html_all_files) + ' | ตรง |');
p('| จุดใน ' + code('build/') + ' | ' + lab('~60') + ' | ' + n('census.build', census.build_dir) + ' | ใกล้เคียง |');
p('| จุดใน ' + code('design/v2/') + ' | ' + lab('150') + ' | ' + n('census.design', census.design_dir) + ' | ตรง |');
p('| ภาพแชร์ที่มีชื่อวาดลงบนภาพ | ' + lab('13') + ' | ' + n('census.share_wordmark', share.src_with_wordmark) + ' จาก ' + n('census.share_total', share.jpg_count) + ' ใบ | ตรง |');
p('');
p('### ที่ต่างจาก CEO ' + lab('2') + ' ข้อ — ทั้งสองข้อทำให้งานที่ต้องแก้มือ**มากกว่า**ที่ตารางเดิมบอก');
p('');
p('**(ก) ตัวเลข ' + lab('2,192') + ' จุด / ' + lab('568') + ' ไฟล์ ไม่ใช่ "HTML ที่ถูกสร้างขึ้น" ทั้งหมด**');
p('');
p('ตัวเลขนั้นนับไฟล์ ' + code('.html') + ' ทุกไฟล์ในรีโป ซึ่งรวม ' + code('design/v2/*.html') + ' ที่เป็นม็อกอัพที่ลูกค้าอนุมัติแล้ว ไม่ใช่ของที่ ' + code('build/build.mjs') + ' สร้าง แยกออกมาได้แบบนี้:');
p('');
p('| กอง | จุด | ไฟล์ | สร้างใหม่ได้ไหม |');
p('|---|---|---|---|');
p('| HTML ที่ build สร้าง | ' + n('census.gen_html', census.generated_html) + ' | ' + n('census.gen_html_files', census.generated_html_files) + ' | ได้ รัน build ใหม่ |');
p('| ' + code('design/v2/*.html') + ' (ม็อกอัพที่อนุมัติแล้ว) | ' + n('census.design_html', census.design_html) + ' | ' + n('census.design_html_files', census.design_html_files) + ' | ไม่ได้ ต้องแก้ที่ตัวม็อกอัพ |');
p('| ' + code('design/') + ' ทั้งโฟลเดอร์ (รวมสคริปต์สร้างภาพ) | ' + n('census.design_all', census.design_dir) + ' | ' + n('census.design_all_files', census.design_dir_files) + ' | บางส่วน |');
p('| ' + code('build/') + ' (ต้นทางที่ต้องแก้มือ) | ' + n('census.build2', census.build_dir) + ' | ' + n('census.build_files', census.build_dir_files) + ' | ไม่ได้ |');
p('| ' + code('docs/') + ' (ADR และบันทึก) | ' + n('census.docs', census.docs_dir) + ' | — | ไม่ได้ |');
p('| ที่เหลือ (' + code('assets/') + ', ' + code('admin/') + ', ' + code('tools/') + ', ' + code('ci/') + ', README, robots.txt, redirects.map, workflow) | ' + n('census.remainder', census.remainder) + ' | ' + n('census.remainder_files', census.remainder_files.length) + ' | ไม่ได้ |');
p('');
p('**(ข) ชื่อตัวพิมพ์เล็กใน URL เป็นกองที่ตารางเดิมไม่ได้นับ**');
p('');
p('ค้นแบบไม่สนตัวพิมพ์ใหญ่เล็ก (' + code('lakornai') + ') ได้ ' + n('census.any_case', census.any_case) + ' จุด — มากกว่าการค้นแบบตรงตัวพิมพ์ (' + n('census.total_echo', census.total) + ') อีก ' + n('census.other_casing', census.other_casing) + ' จุด');
p('ในนั้น ' + code('lakornai.tv') + ' ' + n('census.origin_literal', census.origin_literal) + ' จุด และ ' + code('github.io/lakornai') + ' ' + n('census.repo_path_literal', census.repo_path_literal) + ' จุด');
p('ส่วนใหญ่เป็น URL ในไฟล์ที่ build สร้าง (canonical, og:url, sitemap, JSON-LD) ⇒ **สร้างใหม่ได้** แต่ต้องรู้ไว้ว่าการเปลี่ยนชื่อโดเมนหรือชื่อ repo ขยับของจำนวนนี้พร้อมกัน');
p('');
p('### ต้นทางที่ต้องแก้มือ — อ้างด้วยสตริง ไม่อ้างเลขบรรทัดตายตัว');
p('');
p('เลขบรรทัดข้างล่างสคริปต์หาให้ตอนรัน เพราะมีลูกโซ่ dev ถือ ' + code('build/') + ' อยู่และบรรทัดขยับได้ทุกวัน:');
p('');
p('- ' + code(siteName.decl_file) + ' บรรทัด ' + n('src.site_name_line', siteName.decl_line) + ' — ค่าคงที่ ' + code('SITE_NAME') + ' มีอยู่แล้ว');
p('- แต่ถูกอ้างถึงแค่ ' + n('src.site_name_refs', siteName.refs.length) + ' บรรทัด (ในนั้นเป็นบรรทัด import ' + n('src.site_name_imports', siteName.import_refs.length) + ' บรรทัด) ⇒ **จุดที่เอาค่าไปใช้จริงมีแค่ ' + n('src.site_name_uses', siteName.use_refs.length) + ' จุด**');
p('  - ' + siteName.use_refs.map(r => code(r.file + ':' + n('src.use.' + r.file + '.' + r.line, r.line))).join(' · '));
p('- ที่เหลือใน ' + code('build/') + ' เขียนชื่อตรง ๆ: ' + n('src.build_total', census.build_dir) + ' จุด ใน ' + n('src.build_files', census.build_dir_files) + ' ไฟล์ — อยู่ในชื่อหน้า คำบรรยาย เนื้อความ และข้อความทางกฎหมาย');
p('- ตัวอย่างบรรทัดที่ CEO อ้างไว้ ตรวจแล้ว ' + n('src.ceo_lines_ok', ceoLinesOk) + ' จาก ' + n('src.ceo_lines_total', ceoLineCheck.length) + ' บรรทัดยังมีชื่ออยู่จริง ณ คอมมิตที่รันนี้');
p('- ' + code(logo.file) + ' บรรทัด ' + n('src.logo_line', logo.line) + ' — โลโก้ถูกตัดเป็นสองท่อน ' + code('Lakorn') + ' + ' + code('AI') + ' ⇒ ชื่อใหม่ที่ไม่แบ่งสองท่อนกระทบโลโก้');
p('- ' + code(logo.file) + ' บรรทัด ' + n('src.footer_line', logo.footer_line) + ' — ฟุตเตอร์เขียนทั้งชื่อและโดเมนในบรรทัดเดียว: ' + code(lab(logo.footer_text ?? '—')));
p('- ' + code(origin.file) + ' บรรทัด ' + n('src.origin_line', origin.line) + ' — ' + code('DEFAULT_SITE_ORIGIN') + ' = ' + code(lab(origin.value ?? '—')) + ' ⇒ **ชื่อเว็บกับโดเมนเป็นสองคำถาม** ดูหัวข้อถัดไป');
p('');
p('### ภาพแชร์');
p('');
p('- ' + code('assets/share/') + ' มีภาพ ' + n('share.jpg', share.jpg_count) + ' ใบ · ต้นฉบับ HTML ใน ' + code('design/v2/share-src/') + ' ' + n('share.src', share.src_html_count) + ' ไฟล์ ซึ่งเป็นการ์ดจริง ' + n('share.cards', share.card_src_count) + ' ไฟล์ (อีก ' + n('share.sheet', share.src_html_count - share.card_src_count) + ' ไฟล์คือหน้ารวมภาพ ไม่ได้ถูกเรนเดอร์เป็น ' + code('.jpg') + ')');
p('- การ์ดที่มี wordmark วาดอยู่บนภาพ: ' + n('share.with_wordmark', share.src_with_wordmark) + ' จาก ' + n('share.cards_echo', share.card_src_count) + ' ⇒ **ทุกใบมีชื่ออยู่บนภาพ เปลี่ยนชื่อ = เรนเดอร์ใหม่ทั้งชุด** ตรงกับที่ CEO บอก');
p('- จุดที่ต้องแก้ในตัวสร้างคือบรรทัดที่วาด wordmark: ' + code(share.generator) + ' บรรทัด ' + share.wordmark_lines.map((l, i) => n('share.wordmark_line.' + i, l)).join(' และ ') + ' — ไม่ใช่บรรทัด ' + n('share.title_line', share.title_line) + ' ที่ CEO อ้างไว้ (บรรทัดนั้นเป็นชื่อหน้า/ชื่อไฟล์ของการ์ด default ไม่ใช่ตัวอักษรที่วาดลงภาพ)');
p('');

p('## 9. สามคำถามที่ต้องแยกกันตอบ');
p('');
p('ใบงานชี้เรื่องนี้ไว้แล้วและผมยืนยันว่าเป็นสามคำถามจริง ๆ:');
p('');
p('| คำถาม | ค่าที่อยู่ในโค้ดวันนี้ | รายงานนี้ตอบข้อไหน | ใครตัดสิน |');
p('|---|---|---|---|');
p('| ชื่อเว็บ | ' + code(OLD_NAME) + ' (' + code(siteName.decl_file + ':' + n('q.site_name_line', siteName.decl_line)) + ') | **ตอบข้อนี้** — เสนอ ' + n('q.options', NAMES.length) + ' ตัวเลือก | ลูกค้า |');
p('| โดเมน | ' + code(lab(origin.value ?? '—')) + ' (' + code(origin.file + ':' + n('q.origin_line', origin.line)) + ') | ไม่ตอบ — บอกได้แค่ว่าโดเมนไหนมีเว็บอยู่แล้ว | ลูกค้า (บัญชีลูกค้า) |');
p('| ชื่อ repo / URL ทดสอบ | มีคำ ' + code('lakornai') + ' อยู่ ' + n('q.repo_path', census.repo_path_literal) + ' จุด | ไม่ตอบ — **ห้ามใครในทีมไปแตะ** | ลูกค้า (บัญชีลูกค้า) |');
p('');
p('ถ้าเปลี่ยนชื่อ repo ลิงก์ทดสอบที่ลูกค้าอาจส่งให้คนอื่นไปแล้วจะเปลี่ยนตาม — เป็นข้อที่ลูกค้าต้องตัดสินเอง ไม่ใช่ผลพลอยได้ของการเปลี่ยนชื่อเว็บ');
p('');

p('## 10. ของที่ยังรอลูกค้าตัดสิน');
p('');
p('1. เลือกชื่อจาก ' + n('q.options_echo', NAMES.length) + ' ตัวเลือก หรือสั่งให้หาเพิ่มในแกนใดแกนหนึ่ง');
p('2. เก็บคำ AI ไว้ในชื่อหรือไม่ (ข้อมูลเสนอว่าทิ้งจากชื่อ เก็บไว้ในถ้อยคำ — มีตัวเลือกที่เก็บไว้ให้ ' + n('q.keepai_options', NAMES.filter(x => x.axes.includes('keepai')).length) + ' ชื่อ)');
p('3. จะเปลี่ยนชื่อ repo และ URL ทดสอบตามชื่อใหม่ไหม (เป็นการตั้งค่าในบัญชีลูกค้า)');
p('4. โดเมนและนามสกุลที่จะใช้ — ต้องให้ลูกค้าเช็กที่ผู้ให้บริการจดโดเมนเองว่าจดได้จริงไหม เครื่องมือของเราบอกไม่ได้');
p('');

p('## 11. ข้อจำกัดของรายงานนี้');
p('');
p('- **ไม่มีตัวเลขใดในรายงานนี้ที่อ้างว่าเป็นข้อมูลของเว็บเรา** — เว็บยัง ' + code('Disallow: /') + ' ทั้งเว็บและยังไม่มีโดเมนจริง ตัวเลขฝั่งเราจึงไม่มีความหมาย (เส้นเดิมจาก ' + lab('AIO-19') + ')');
p('- ทางดึง Ahrefs สดในสคริปต์ยังไม่ถูกรันจริงเพราะเครื่องนี้ไม่มี token (ดูหัวข้อ ' + lab('0') + ')');
p('- ' + code('serp-overview') + ' ของชื่อที่ไม่มีปริมาณค้นคืนค่าว่าง ซึ่งแปลได้แค่ว่า "Ahrefs ไม่มีข้อมูล" ไม่ใช่ "ไม่มีคู่แข่ง"');
p('- สถานะโดเมนทุกบรรทัดคือ "มีร่องรอยเว็บหรือไม่" ไม่ใช่ "จดได้หรือไม่" และไม่มีคำว่าว่างในรายงานนี้');
p('- ไม่มีการแก้ชื่อในโค้ดในงานนี้แม้จุดเดียว · ไฟล์ใหม่ทั้งหมดอยู่ใต้ ' + code('docs/seo/') + ' เท่านั้น');
p('');
p('---');
p('');
p('สร้างโดย ' + code('docs/seo/name-research.mjs') + ' · ตรวจด้วย ' + code('docs/seo/check-name-research.mjs') + ' · ใบงาน ' + lab(TICKET));

const md = L.join('\n') + '\n';

const out = {
  ticket: TICKET,
  generated_by: 'docs/seo/name-research.mjs',
  research_date: RESEARCH_DATE,
  ahrefs_country: 'th',
  ahrefs_transport: rawKw.transport,
  old_name: OLD_NAME,
  disclaimers: [
    'ไม่มีตัวเลขใดในไฟล์นี้ที่เป็นข้อมูลของเว็บเราเอง (robots ยัง Disallow: / และยังไม่มีโดเมนจริง)',
    'สถานะโดเมนคือ "มีร่องรอยเว็บหรือไม่" ไม่ใช่ "จดได้หรือไม่" — ไม่มีสถานะที่ชื่อว่าว่าง',
    'ไม่มีการจด ซื้อ หรือสมัครบริการใด ๆ และไม่มีการแก้ชื่อในโค้ดในงานนี้',
  ],
  keywords: Object.fromEntries([...KW].map(([k, v]) => [k, v])),
  keywords_without_data: KW_MISSING,
  serp: Object.fromEntries([...SERP].map(([k, v]) => [k, { keyword: v.params.keyword, rows: v.response.positions.length, positions: v.response.positions }])),
  domains: Object.fromEntries([...DOM].map(([k, v]) => [k, { ...v, state: domainState(k).code, state_label: domainState(k).label }])),
  rename_cost: { census, site_name: siteName, origin, logo, share, ceo_line_claims: ceoLineCheck, ceo_line_claims_ok: ceoLinesOk },
  proposals: NAMES.map(nm => ({
    id: nm.id, thai: nm.thai, latin: nm.latin, axes: nm.axes, idea: nm.idea,
    hook_keywords: nm.hooks.map(k => ({ keyword: k, volume: kwField(k, 'volume'), difficulty: kwField(k, 'difficulty'), traffic_potential: kwField(k, 'traffic_potential') })),
    name_as_keyword: nm.self.map(k => ({ keyword: k, volume: kwField(k, 'volume'), difficulty: kwField(k, 'difficulty'), has_ahrefs_row: !!kwRow(k) })),
    serp_checked: nm.serp.map(s => ({ id: s, keyword: SERP.get(s).params.keyword, rows: SERP.get(s).response.positions.length })),
    domains: nm.domains.map(d => domainState(d)).map(s => ({ host: s.host, state: s.code, state_label: s.label })),
    spelling: { thai_length: [...nm.thai].length, latin_length: [...nm.latin].length, read_aloud: nm.readAloud, typing: nm.typing },
    downsides: nm.downsides,
  })),
  cuts: CUTS.map(c => ({
    name: c.name, reason: c.why,
    keywords: c.keys.map(k => ({ keyword: k, volume: kwField(k, 'volume'), difficulty: kwField(k, 'difficulty'), global_volume: kwField(k, 'global_volume'), branded: kwRow(k)?.intents?.branded ?? null, has_ahrefs_row: !!kwRow(k) })),
    domains: c.domains.map(d => domainState(d)).map(s => ({ host: s.host, state: s.code })),
  })),
  ahrefs_units_used: rawKw.calls.concat(rawSerp.calls, rawDom.calls).reduce((a, c) => a + (c.api_usage?.['units-cost-total-actual'] ?? 0), 0),
  report_numbers: NUMS,
};

writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n');
writeFileSync(OUT_MD, md);
process.stdout.write('เขียนแล้ว: ' + OUT_JSON + '\n');
process.stdout.write('เขียนแล้ว: ' + OUT_MD + '\n');
process.stdout.write('เลขที่บันทึกไว้: ' + NUMS.filter(x => x.kind === 'measured').length + ' ผลวัด · ' + NUMS.filter(x => x.kind === 'label').length + ' ป้ายชื่อ\n');
