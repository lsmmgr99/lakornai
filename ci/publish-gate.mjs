/* ด่านพิสูจน์ "ชุดไฟล์ที่ส่งขึ้น" — AIO-36 · เจ้าของ: DevOps
   ไม่ push ไม่ publish ไม่ deploy ไม่ต้องมีเครือข่าย · อ่านไฟล์ในดิสก์เท่านั้น

   รัน:
     node ci/publish-gate.mjs _artifact                  ตรวจชุดไฟล์ที่จัดไว้แล้วจริง
     node ci/publish-gate.mjs --plan .                   ดูว่าชุดที่ "จะ" ขึ้นมีอะไร โดยไม่ต้องจัด artifact
     node ci/publish-gate.mjs _artifact --expect-noindex  บังคับว่า robots.txt ต้องปิดดัชนีทั้งเว็บ (รอบทดสอบ)

   เหตุที่ต้องมีด่านนี้แยกจาก ci/stage-artifact.mjs:
   ยามเดิมที่ stage-artifact.mjs อ่านรายชื่อไฟล์จาก siteFiles(dest) ซึ่ง "กรอง" โฟลเดอร์ต้องห้ามที่ราก
   ออกไปก่อนแล้ว (ci/site-files.mjs:34) → ถ้า admin/ หลุดเข้าชุดจริง มันจะไม่อยู่ในรายชื่อที่ยามอ่าน
   ยามนั้นจึงไม่มีทางเห็น ด่านนี้เดินไฟล์ "ดิบ" ไม่กรองอะไรทั้งนั้น แล้วตัดสินจากสิ่งที่อยู่ในชุดจริง
   มิวเทชันเทสต์ที่ ci/publish-gate.test.mjs พิสูจน์ทั้งสองข้อนั้นไว้ */
import fs from 'node:fs';
import path from 'node:path';
import { siteFiles, REQUIRED_IN_ARTIFACT, DOT_DIRS_KEEP, DOT_FILES_KEEP } from './site-files.mjs';

/* ชื่อโฟลเดอร์ที่ห้ามอยู่ในชุดไฟล์ที่ส่งขึ้น — ตรวจ "ทุกชั้นของพาธ" ไม่ใช่แค่ชั้นบนสุด
   เหตุผลของแต่ละชื่อ: admin = แผงแก้เนื้อหา (client-side ล้วน เปิดได้จากเบราว์เซอร์ทุกคน)
   build/ci/tools = ซอร์สและเครื่องมือ · design = ม็อกอัพ · docs = เอกสารภายใน · .github = workflow */
export const FORBIDDEN_SEGMENTS = new Set([
  '.git', '.github', '.paperclip-repositories', 'node_modules',
  'admin', 'build', 'ci', 'design', 'docs', 'tools',
]);

/* กฎระดับไฟล์ · ใช้กฎแรกที่ตรง เพื่อให้ข้อความบอกสาเหตุที่เจาะจงที่สุด */
export const FORBIDDEN_FILES = [
  [/(^|\/)[^/]*\.test\.mjs$/, 'ไฟล์เทสต์ของด่าน ไม่ใช่ของผู้ชม'],
  [/\.mjs$/, 'โค้ดเครื่องมือ/ฝั่งเซิร์ฟเวอร์ (.mjs) ไม่ควรอยู่ในเว็บ static'],
  [/(^|\/)\.env/, 'ไฟล์ตั้งค่าที่มักเก็บ credential'],
  [/\.pem$|\.key$|(^|\/)id_(rsa|ed25519)/, 'ชื่อไฟล์เข้าข่ายกุญแจ — หยุดก่อน'],
  [/(^|\/)content\.json$/, 'ไฟล์ข้อมูลต้นทางของทีม เว็บอ่าน assets/data.js'],
  [/(^|\/)\.git(ignore|modules|attributes)$/, 'ไฟล์ของ git ไม่ใช่ของเว็บ'],
  [/\.md$/, 'บันทึกภายในของทีม (เช่น assets/share/README.md) ไม่ใช่หน้าที่ผู้ชมต้องเปิดได้'],
];

/* เดินไฟล์ทั้งหมดแบบดิบ: ไม่กรองชื่อใด ๆ ออก เพราะหน้าที่ของด่านคือ "เห็นของที่ไม่ควรมี"
   symlink ไม่ถูกเดินตาม แต่ถูกรายงานเป็นข้อผิดพลาด เพราะโฮสต์ static อาจเสิร์ฟของนอกชุดตามลิงก์ */
export function allFiles(root) {
  const files = [];
  const links = [];
  const walk = (rel) => {
    const abs = rel ? path.join(root, rel) : root;
    for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) links.push(child);
      else if (e.isDirectory()) walk(child);
      else if (e.isFile()) files.push(child);
    }
  };
  walk('');
  return { files, links };
}

/* ตัดสินจากรายชื่อไฟล์ล้วน — ไม่แตะดิสก์ จึงทดสอบด้วยรายชื่อสมมุติได้ตรง ๆ */
export function auditFileSet(files, { links = [], required = REQUIRED_IN_ARTIFACT } = {}) {
  const errors = [];
  const have = new Set(files);

  for (const rel of files) {
    const dirs = rel.split('/');
    const base = dirs.pop();
    const seg = dirs.find(s => FORBIDDEN_SEGMENTS.has(s));
    const dotDir = dirs.find(s => s.startsWith('.') && !DOT_DIRS_KEEP.has(s));
    if (seg) errors.push(`${rel}: อยู่ใต้โฟลเดอร์ต้องห้าม "${seg}/" — ของทีม ไม่ใช่ของผู้ชม`);
    else if (dotDir) errors.push(`${rel}: อยู่ใต้โฟลเดอร์ "${dotDir}/" ซึ่งเป็นของเครื่องมือ ไม่ใช่ของเว็บ`);
    const rule = FORBIDDEN_FILES.find(([re]) => re.test(rel));
    if (rule) errors.push(`${rel}: ${rule[1]}`);
    else if (base.startsWith('.') && !DOT_FILES_KEEP.has(base)) {
      errors.push(`${rel}: ไฟล์ที่ขึ้นต้นด้วยจุดไม่เข้าชุด ยกเว้น ${[...DOT_FILES_KEEP].join(' ')}`);
    }
  }
  for (const rel of links) errors.push(`${rel}: เป็น symlink — ชุดไฟล์ที่ส่งขึ้นต้องเป็นไฟล์จริงทั้งหมด`);
  for (const need of required) {
    if (!have.has(need)) errors.push(`ขาด ${need} — ชุดไฟล์ไม่ครบ ไม่ใช่ชุดที่ใช้ขึ้นได้`);
  }
  return { errors };
}

/* robots.txt ของรอบทดสอบต้องปิดดัชนีทั้งเว็บ (build/seo.mjs PUBLISHED = false)
   แยกเป็นธงเพราะวันเปิดตัวจริงกฎนี้ต้องกลับด้าน และนั่นเป็นการตัดสินใจของลูกค้า ไม่ใช่ของด่าน */
export function auditNoindex(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const errors = [];
  if (!lines.some(l => /^user-agent:\s*\*$/i.test(l))) errors.push('robots.txt: ไม่มีบล็อก "User-agent: *"');
  if (!lines.some(l => /^disallow:\s*\/$/i.test(l))) errors.push('robots.txt: ต้องมี "Disallow: /" ตลอดรอบทดสอบ');
  for (const l of lines) if (/^allow:\s*\/$/i.test(l)) errors.push('robots.txt: พบ "Allow: /" — รอบทดสอบต้องยังปิดดัชนี');
  return { errors };
}

/* ---------- CLI ---------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const plan = argv.includes('--plan');
  const expectNoindex = argv.includes('--expect-noindex');
  const target = path.resolve(argv.find(a => !a.startsWith('--')) || (plan ? '.' : '_artifact'));

  if (!fs.existsSync(target)) {
    console.error(`✗ ไม่พบ ${target}`);
    console.error(plan ? '  --plan ต้องชี้ไปที่รากรีโป' : '  จัดชุดไฟล์ก่อนด้วย: node ci/stage-artifact.mjs . _artifact');
    process.exit(1);
  }

  /* --plan = "ชุดที่จะขึ้น" ตามที่ ci/site-files.mjs คัด (ยังไม่ได้คัดลอกจริง)
     โหมดปกติ = "ชุดที่ขึ้นจริง" เดินไฟล์ดิบในโฟลเดอร์ปลายทาง ไม่เชื่อ allowlist ของใคร */
  const { files, links } = plan ? { files: siteFiles(target, {}), links: [] } : allFiles(target);
  const { errors } = auditFileSet(files, { links });

  const robotsPath = path.join(target, 'robots.txt');
  if (expectNoindex) {
    if (!fs.existsSync(robotsPath)) errors.push('ขาด robots.txt — ตรวจ --expect-noindex ไม่ได้');
    else errors.push(...auditNoindex(fs.readFileSync(robotsPath, 'utf8')).errors);
  }

  const label = plan ? 'ชุดไฟล์ที่ "จะ" ส่งขึ้น (วางแผนจาก ci/site-files.mjs)' : 'ชุดไฟล์ที่ส่งขึ้นจริง (เดินไฟล์ดิบ)';
  console.log(`${label}\n  ${target}\n`);

  /* มีอะไร */
  const byExt = new Map();
  let bytes = 0;
  for (const rel of files) {
    const ext = path.extname(rel) || '(ไม่มีนามสกุล)';
    byExt.set(ext, (byExt.get(ext) || 0) + 1);
    bytes += fs.statSync(path.join(target, rel)).size;
  }
  const tops = [...new Set(files.map(f => (f.includes('/') ? f.split('/')[0] + '/' : f)))];
  console.log(`มี: ${files.length} ไฟล์ · ${(bytes / 1048576).toFixed(1)} MB`);
  console.log('  ตามนามสกุล: ' + [...byExt].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(' · '));
  console.log(`  ที่ราก ${tops.length} รายการ: ${tops.join(' ')}`);
  console.log('  ไฟล์ที่ต้องมีครบทุกตัว: ' + REQUIRED_IN_ARTIFACT.map(r => (files.includes(r) ? `✓ ${r}` : `✗ ${r}`)).join(' · '));

  /* ไม่มีอะไร — ไล่ยืนยันทีละชื่อ ไม่ใช่สรุปรวบ */
  const hit = (seg) => files.filter(f => f.split('/').slice(0, -1).includes(seg));
  console.log('\nไม่มี:');
  for (const seg of [...FORBIDDEN_SEGMENTS].sort()) {
    const n = hit(seg).length;
    console.log(`  ${n ? '✗' : '✓'} ${seg}/${n ? ` — พบ ${n} ไฟล์` : ''}`);
  }
  for (const [re, why] of FORBIDDEN_FILES) {
    const n = files.filter(f => re.test(f)).length;
    console.log(`  ${n ? '✗' : '✓'} ${re.source}${n ? ` — พบ ${n} ไฟล์ (${why})` : ''}`);
  }
  const dots = files.filter(f => f.split('/').some((s, i, a) =>
    s.startsWith('.') && !(i === a.length - 1 ? DOT_FILES_KEEP : DOT_DIRS_KEEP).has(s)));
  console.log(`  ${dots.length ? '✗' : '✓'} โฟลเดอร์/ไฟล์ที่ขึ้นต้นด้วยจุด (ยกเว้น ${[...DOT_DIRS_KEEP, ...DOT_FILES_KEEP].join(' ')})`
    + `${dots.length ? ` — พบ ${dots.length} ไฟล์: ${dots.slice(0, 5).join(' ')}` : ''}`);
  if (fs.existsSync(robotsPath)) {
    const ok = auditNoindex(fs.readFileSync(robotsPath, 'utf8')).errors.length === 0;
    console.log(`\nrobots.txt: ${ok ? 'ปิดดัชนีทั้งเว็บ (Disallow: /) — ตรงกับรอบทดสอบ' : 'เปิดให้เก็บดัชนีบางส่วน — ไม่ใช่ค่าของรอบทดสอบ'}`
      + `${expectNoindex ? ' · บังคับด้วย --expect-noindex' : ' · ไม่ได้บังคับ (ใส่ --expect-noindex ถ้าต้องการ)'}`);
  }

  if (errors.length) {
    console.error(`\n✗ ด่านไม่ผ่าน ${errors.length} ข้อ\n  - ` + errors.slice(0, 40).join('\n  - '));
    if (errors.length > 40) console.error(`  … และอีก ${errors.length - 40} ข้อ`);
    process.exit(1);
  }
  console.log('\n✓ ผ่าน — ชุดนี้ไม่มีโฟลเดอร์/ไฟล์ต้องห้าม และมีไฟล์ที่ต้องมีครบ');
  console.log('  ด่านนี้ไม่ publish ไม่ deploy · การนำขึ้นเป็นขั้นแยกที่มีประตูอนุมัติของตัวเอง (docs/publish-test.md)');
}
