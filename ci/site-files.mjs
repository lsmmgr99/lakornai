/* ขอบเขตของ "ไฟล์เว็บที่ส่งออก" — ใช้ร่วมกันระหว่างด่านตรวจหลัง build และตัวจัด artifact
   เจ้าของ: DevOps (AIO-30) · ไม่แตะ build/ admin/ tools/ ซึ่งเป็นของฝ่ายอื่น */
import fs from 'node:fs';
import path from 'node:path';

/* โฟลเดอร์ที่ไม่ใช่ของผู้ชม: ซอร์ส เครื่องมือ เอกสาร แผงแอดมิน และม็อกอัพของ Visual
   admin/ ถูกแยกออกจากหน้าผู้ชมแล้วใน commit 453efab — ด่านนี้ทำให้มันแยกต่อไปโดยอัตโนมัติ */
export const EXCLUDE_DIRS = new Set([
  '.git', '.github', '.paperclip-repositories', 'node_modules',
  'admin', 'build', 'ci', 'design', 'docs', 'tools',
]);

/* ไฟล์ที่รากซึ่งเป็นของทีม ไม่ใช่ของเว็บ · content.json เป็นแหล่งข้อมูลต้นทาง
   เว็บอ่าน assets/data.js ที่ build สร้างให้ ไม่ได้อ่าน content.json ตอนรัน */
export const EXCLUDE_FILES = new Set([
  '.gitignore', 'README.md', 'README-POSTERS.txt',
  'POSTER-PROMPTS.txt', 'POSTER-PROMPTS-EXACT.json', 'content.json',
]);

/* ไฟล์ที่ไม่ใช่ของผู้ชม "ในทุกชั้น" ไม่ใช่แค่ที่ราก (AIO-36)
   .md = บันทึกภายในของทีม — เช่น assets/share/README.md ที่เขียนพาธภายในและคำสั่งของทีมไว้
   ไฟล์นั้นถูกส่งขึ้นไปด้วยมาตลอดทั้งที่ไม่ควร และเจ้าของไฟล์คืองาน AIO-32/AIO-34 จึงไม่ลบ แค่ไม่ส่งขึ้น */
export const EXCLUDE_FILE_RE = [
  /\.md$/,
  /\.mjs$/,
];

/* โฟลเดอร์/ไฟล์ที่ขึ้นต้นด้วยจุดเป็นของเครื่องมือเกือบทั้งหมด (.git .github .claude .vscode …)
   จึงตัดทั้งชั้นเป็นค่าตั้งต้น แล้วเปิดเฉพาะชื่อที่เว็บต้องใช้จริง
   .well-known/ = พาธมาตรฐานที่โฮสต์/ใบรับรองใช้ · .nojekyll = ปิด Jekyll ของ GitHub Pages */
export const DOT_DIRS_KEEP = new Set(['.well-known']);
export const DOT_FILES_KEEP = new Set(['.nojekyll']);

/* ข้ามโฟลเดอร์นี้ไหม — ใช้ได้ทุกชั้นของพาธ */
export const skipDir = (name) => EXCLUDE_DIRS.has(name) || (name.startsWith('.') && !DOT_DIRS_KEEP.has(name));

/* ข้ามไฟล์นี้ไหม — rel = พาธสัมพัทธ์กับ root, atRoot บอกว่าอยู่ชั้นบนสุดหรือไม่ */
export function skipFile(rel) {
  const name = rel.split('/').pop();
  if (!rel.includes('/') && EXCLUDE_FILES.has(name)) return true;
  if (name.startsWith('.') && !DOT_FILES_KEEP.has(name)) return true;
  return EXCLUDE_FILE_RE.some(re => re.test(name));
}

/* ไฟล์ที่ต้องมีใน artifact ทุกครั้ง ถ้าขาดคือ build ไม่ครบ ไม่ใช่ artifact ที่ใช้ได้
   .nojekyll = ไฟล์ว่างที่สั่งโฮสต์แบบ GitHub Pages ให้เสิร์ฟไฟล์ตามที่เป็น ไม่เอาไปเข้า Jekyll
   ไซต์นี้ build เองทั้งหมด (AIO-36) · ไม่มีพาธที่ขึ้นต้นด้วย _ อยู่แล้ว แต่ปิดไว้ให้ชัดดีกว่าเดา */
export const REQUIRED_IN_ARTIFACT = [
  'index.html', '404.html', 'robots.txt', 'sitemap.xml', '.nojekyll',
  'assets/site.css', 'assets/tokens.css', 'assets/app.js', 'assets/data.js',
];

/* เดินไฟล์ทั้งหมดที่ถือว่าเป็นของเว็บ คืนพาธสัมพัทธ์กับ root เรียงแล้ว
   การคัดทำ "ทุกชั้น" ไม่ใช่เฉพาะชั้นบนสุด — ของทีมที่ซ้อนอยู่ลึก ๆ ก็ต้องไม่ติดไปกับชุดที่ส่งขึ้น (AIO-36)
   symlink ไม่ถูกเดินตามและไม่เข้าชุด · ด่าน ci/publish-gate.mjs เป็นตัวรายงานถ้าเจอในชุดที่ส่งขึ้นจริง */
export function siteFiles(root, { ext = null } = {}) {
  const out = [];
  const walk = (rel) => {
    const abs = rel ? path.join(root, rel) : root;
    for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (skipDir(e.name)) continue;
        walk(child);
      } else if (e.isFile()) {
        if (skipFile(child)) continue;
        if (ext && !e.name.endsWith(ext)) continue;
        out.push(child);
      }
    }
  };
  walk('');
  return out;
}
