/* วัดเฉลยของ ci/html-tree-cases.mjs ซ้ำด้วย **Chrome จริง** แล้วเทียบสามทาง:
     Chrome (ของจริง)  ⇄  เลขที่บันทึกไว้ในไฟล์เคส  ⇄  คำตอบของ build/html-tree.mjs

   ทำไมเป็นสคริปต์แยก ไม่ใช่ `*.test.mjs`: มันต้องมีเบราว์เซอร์ และยิง Chrome 30 ครั้ง (~20 วิ)
   ⇒ ด่านเร็วที่รันทุกครั้งคือ ci/feed-media-window.test.mjs ซึ่งอ่าน **เลขที่สคริปต์นี้ยืนยัน**
   ไฟล์นี้คือตัวกันเลขในไฟล์เคสเน่า: ถ้าสเปกของเบราว์เซอร์เปลี่ยน หรือมีใครแก้เลขด้วยมือ
   เพื่อให้เทสต์เขียว สคริปต์นี้จะแดง

   รัน: node ci/html-tree-oracle.mjs            (ออก 1 ถ้ามีข้อไม่ตรง)
        CHROME=/path/to/chrome node ci/html-tree-oracle.mjs */
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseHtml, findDirectChain } from '../build/html-tree.mjs';
import { CHROME_CASES, CHAIN } from './html-tree-cases.mjs';

const CANDIDATES = [
  process.env.CHROME,
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const CHROME = CANDIDATES.find(p => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });
if (!CHROME) {
  console.error('✗ หา Chrome ไม่เจอ — ตั้ง CHROME=/path/to/chrome · สคริปต์นี้ต้องมีเบราว์เซอร์จริง '
    + 'เพราะเฉลยของเคสคือ "สิ่งที่เบราว์เซอร์เห็น" ไม่ใช่สิ่งที่ตัวแกะเห็น');
  process.exit(2);
}

/* ตัววัดอยู่ใน `<head>` และอ่านค่าหลัง DOMContentLoaded ⇒ เนื้อของ body ไม่มีทางกลืนมันทิ้ง
   (เคส `<plaintext>`/raw text ที่ไม่ปิด จะกลืนสคริปต์ที่ต่อท้าย) */
const SEL = CHAIN.map(c => '.' + c.join('.')).join(' > ');
const PROBE = `<script>document.addEventListener('DOMContentLoaded',function(){`
  + `document.documentElement.setAttribute('data-chain',document.querySelectorAll(${JSON.stringify(SEL)}).length)})</script>`;

const dir = fs.mkdtempSync(`${os.tmpdir()}/html-tree-oracle-${process.pid}-`);
let bad = 0;
console.log(`เฉลย: ${CHROME}\nselector: ${SEL}\n`);
for (const [n, c] of CHROME_CASES.entries()) {
  const f = `${dir}/c${n}.html`;
  fs.writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8">${PROBE}</head><body>${c.html}</body></html>`);
  const dom = execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu',
    '--virtual-time-budget=500', '--dump-dom', `file://${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const m = dom.match(/data-chain="(\d+)"/);
  const chrome = m ? Number(m[1]) : null;
  const root = parseHtml(c.html);
  const gate = findDirectChain(root, CHAIN) ? 1 : 0;
  const cav = root.caveats.length > 0;
  const problems = [];
  if (chrome === null) problems.push('วัดด้วย Chrome ไม่ได้');
  else if (chrome !== c.chain) problems.push(`Chrome ได้ ${chrome} แต่ไฟล์เคสบันทึก ${c.chain}`);
  if (gate !== c.chain) problems.push(`ตัวแกะได้ ${gate} แต่เฉลยคือ ${c.chain}`);
  if (cav !== c.caveat) problems.push(`caveat = ${cav} แต่ไฟล์เคสบันทึก ${c.caveat}`);
  if (problems.length) bad++;
  console.log(`${problems.length ? '✗' : '✓'} chrome=${chrome} ด่าน=${gate} caveat=${cav ? 'มี' : 'ไม่มี'}  ${c.name}`
    + (problems.length ? `\n    ${problems.join(' · ')}` : ''));
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(bad ? `\n✗ ไม่ตรง ${bad} จาก ${CHROME_CASES.length} เคส` : `\n✓ ตรงกันทั้งสามทาง ${CHROME_CASES.length} เคส`);
process.exit(bad ? 1 : 0);
