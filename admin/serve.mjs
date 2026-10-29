// โหมดไฟล์ล้วน: เสิร์ฟแผงจากดิสก์ ไม่มี API ไม่มี GitHub — ใช้ตรวจแผงหรือส่งออกร่างโดยไม่ต้องตั้งค่าอะไร
// ใช้งานจริงให้รัน admin/broker.mjs ซึ่งเสิร์ฟไฟล์ชุดเดียวกันนี้บวก API เข้าสู่ระบบ/บันทึก/เผยแพร่
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePublic, CONTENT_TYPES, CSP } from './static.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4190;
http.createServer((req, res) => {
  const name = ['GET', 'HEAD'].includes(req.method) ? resolvePublic(new URL(req.url, 'http://localhost').pathname) : null;
  const file = name && path.join(root, name);
  if (!file || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store', 'content-security-policy': CSP });
  res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`แผงจัดการ (โหมดไฟล์ ไม่มี GitHub): http://127.0.0.1:${port}/admin/`));
