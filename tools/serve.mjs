/* เซิร์ฟเวอร์ static ตัวเล็กสำหรับเปิดดูเว็บในเครื่อง (ไม่ใช่ของ production ไม่ deploy)
   รัน:  node tools/serve.mjs            → http://127.0.0.1:4173
         node tools/serve.mjs 5000       → เปลี่ยนพอร์ต

   ทำไมต้องมี: URL ของเว็บจริงเป็นโฟลเดอร์ (/series/ceo-cold/) ไม่ใช่ .html
   เปิดด้วย file:// จะได้รายการไฟล์แทนหน้าเว็บ · ตัวนี้ map โฟลเดอร์ → index.html ให้ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 4173;
/* .mjs ต้องอยู่ในตารางนี้: เบราว์เซอร์ปฏิเสธรัน <script type="module"> ที่ MIME ไม่ใช่ JS
   ถ้าตกไปใช้ค่าสำรอง application/octet-stream แผงหลังบ้าน /admin/ จะขึ้นเป็นหน้าเปล่า
   ทั้งที่ไฟล์ไม่ได้พัง · ด่าน: tools/test-serve.mjs */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.map': 'application/json',
};

/* ตัวจัดการคำขอต้องไม่โยนออกไปข้างนอก: workspace นี้แชร์กับ run อื่น ไฟล์ถูกเขียนทับได้
   ระหว่าง existsSync กับ readFileSync ⇒ ของเดิมเซิร์ฟเวอร์ตายทั้งตัวกลางการรันด่าน
   แล้วด่านไปรายงานว่า "โหลดหน้าไม่เสร็จ" ซึ่งชี้ผิดทาง (รีวิว AIO-45 C5)
   ⇒ ตอบ 500 พร้อมเหตุไว้ในล็อก ดีกว่าล้มทั้งเซิร์ฟเวอร์ */
http.createServer((req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch { /* ไปต่อ */ }
    if (!fs.existsSync(f)) {
      const nf = path.join(ROOT, '404/index.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'ไม่พบหน้านี้');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  } catch (e) {
    console.error(`! ${req.url} → ${e.message}`);
    try { res.writeHead(500, { 'content-type': TYPES['.txt'] }).end('server error: ' + e.message); } catch { /* ส่งหัวไปแล้ว */ }
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`LakornAI · http://127.0.0.1:${PORT}/`);
});
