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

/* ไฟล์ที่ต้องมีใน artifact ทุกครั้ง ถ้าขาดคือ build ไม่ครบ ไม่ใช่ artifact ที่ใช้ได้ */
export const REQUIRED_IN_ARTIFACT = [
  'index.html', '404.html', 'robots.txt', 'sitemap.xml',
  'assets/site.css', 'assets/tokens.css', 'assets/app.js', 'assets/data.js',
];

/* เดินไฟล์ทั้งหมดที่ถือว่าเป็นของเว็บ คืนพาธสัมพัทธ์กับ root เรียงแล้ว */
export function siteFiles(root, { ext = null } = {}) {
  const out = [];
  const walk = (rel) => {
    const abs = rel ? path.join(root, rel) : root;
    for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!rel && EXCLUDE_DIRS.has(e.name)) continue;
        walk(child);
      } else if (e.isFile()) {
        if (!rel && EXCLUDE_FILES.has(e.name)) continue;
        if (ext && !e.name.endsWith(ext)) continue;
        out.push(child);
      }
    }
  };
  walk('');
  return out;
}
