// รายการไฟล์ที่แผง admin เสิร์ฟให้เบราว์เซอร์ — ใช้ร่วมกันระหว่าง serve.mjs (โหมดไฟล์) และ broker.mjs
// เป็น allowlist ตายตัว: ไม่เดินโฟลเดอร์ ไม่เสิร์ฟของนอกรายการ (build/ ci/ docs/ ไม่เคยถึงเบราว์เซอร์)
export const PUBLIC_FILES = new Set([
  '/admin/index.html', '/admin/editor.mjs', '/admin/broker-client.mjs', '/admin/covers.mjs',
  '/admin/validate.mjs', '/admin/style.css', '/content.json',
]);
export const COVER_PATH_RE = /^\/assets\/covers(?:-wide)?\/[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/;
export const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};
export const CSP = "default-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export const resolvePublic = (pathname) => {
  const p = pathname === '/admin/' || pathname === '/admin' ? '/admin/index.html' : pathname;
  return PUBLIC_FILES.has(p) || COVER_PATH_RE.test(p) ? p : null;
};
