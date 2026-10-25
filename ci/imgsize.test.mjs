/* เทสต์ของตัวอ่านหัวไฟล์ภาพ `build/imgsize.mjs` — ตัวที่กฎ **V15** พึ่งอยู่
   รัน: node --test ci/*.test.mjs   (คำสั่งเดียวกับที่ docs/publish-test.md §2 บันทึกไว้)

   ทำไมอยู่ใน ci/ ทั้งที่โมดูลอยู่ใน build/: `node --test ci/*.test.mjs` คือคำสั่งที่เอกสารประกาศว่า
   "เทสต์ของด่านทุกตัว" และ V15 เป็นด่านที่ล้ม build ได้ ⇒ เทสต์ของมันต้องอยู่ในชุดที่คนรันจริง
   ไม่ใช่ไฟล์ที่ต้องจำว่าต้องรันเพิ่ม

   ทำไมต้องมี (AIO-64 R4 + AIO-63 ข้อ 3 — สองฝั่งรีวิวจับตรงกัน): ก่อนหน้านี้ไม่มีเทสต์เลย และ
   มีรอยจริงสองข้อที่วัดได้ด้วยบัฟเฟอร์ไม่กี่สิบไบต์ — ทั้งคู่ทำให้ V15 รายงานผิดในทางที่อันตราย:
     (1) PNG ที่ chunk แรกไม่ใช่ IHDR เคยคืน "เลขขยะจากไบต์ 16–23" แทน null
     (2) JPEG ที่มีไบต์เติม 0xFF (สเปกอนุญาต) เคยถูกปฏิเสธทั้งที่ถูกต้อง
   fixtures ที่นี่เป็น **หัวไฟล์ที่ประกอบเอง** ไม่ใช่ไฟล์ในรีโป ⇒ เทสต์ไม่ขยับตามข้อมูลจริง
   (เคสที่อ่านไฟล์จริงมีไว้ข้อเดียว เพื่อกันกรณี "ถูกทุกอย่างยกเว้นของจริง") */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from '../build/imgsize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-imgsize-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });
let n = 0;
const sizeOf = buf => {
  const f = path.join(TMP, `fx-${++n}.bin`);
  fs.writeFileSync(f, buf);
  return imageSize(f);
};

const W = 2640, H = 1200;           /* ขนาดของ coverWide ตามสัญญา §13.4 — ใช้เป็นค่าทดสอบ */

/* ---------- WebP ทั้งสามแบบ ----------
   RIFF <len> WEBP <fourcc> <len> … — **ความยาวทั้งสองตัวถูกอ่านแล้ว** ตั้งแต่ AIO-66/67 P2-2
   (ก่อนหน้านี้ไม่ถูกอ่านเลย ⇒ ไฟล์ 30 ไบต์ที่ความยาวเป็นศูนย์ผ่านกฎ V15 ด้วยขนาดที่สัญญาต้องการ)
   ⇒ helper นี้คำนวณความยาวให้ถูกตามสเปก และเคสลบข้างล่างเป็นตัวที่จงใจทำให้ความยาวผิด */
const riff = (fourcc, payload, { riffLen = null, chunkLen = null } = {}) => Buffer.concat([
  Buffer.from('RIFF'), u32le(riffLen == null ? 4 + 8 + payload.length : riffLen), Buffer.from('WEBP'),
  Buffer.from(fourcc), u32le(chunkLen == null ? payload.length : chunkLen), payload,
]);
function u32le(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; }
/* VP8X ตามสเปกยาว **10 ไบต์เป๊ะ**: flags 1 + สงวน 3 + (กว้าง−1) 3 + (สูง−1) 3 */
const vp8xPayload = (w, h) => {
  const p = Buffer.alloc(10);
  p.writeUIntLE(w - 1, 4, 3); p.writeUIntLE(h - 1, 7, 3);
  return p;
};

test('WebP VP8 (lossy) อ่านกว้าง/สูงถูก', () => {
  const p = Buffer.alloc(20);
  p[3] = 0x9d; p[4] = 0x01; p[5] = 0x2a;        /* sync code อยู่ที่ไบต์ 23–25 ของไฟล์ */
  p.writeUInt16LE(W & 0x3fff, 6); p.writeUInt16LE(H & 0x3fff, 8);
  assert.deepEqual(sizeOf(riff('VP8 ', p)), { w: W, h: H });
});

test('WebP VP8L (lossless) อ่านกว้าง/สูงถูก', () => {
  const p = Buffer.alloc(20);
  p[0] = 0x2f;                                   /* signature ที่ไบต์ 20 ของไฟล์ */
  p.writeUInt32LE(((W - 1) & 0x3fff) | (((H - 1) & 0x3fff) << 14), 1);
  assert.deepEqual(sizeOf(riff('VP8L', p)), { w: W, h: H });
});

test('WebP VP8X (extended) อ่านกว้าง/สูงถูก', () => {
  assert.deepEqual(sizeOf(riff('VP8X', vp8xPayload(W, H))), { w: W, h: H });
});

test('WebP ที่ลายเซ็น VP8L ไม่ถูก = null ไม่ใช่เลขเดา', () => {
  const p = Buffer.alloc(20);
  p[0] = 0x00;
  p.writeUInt32LE(((W - 1) & 0x3fff) | (((H - 1) & 0x3fff) << 14), 1);
  assert.equal(sizeOf(riff('VP8L', p)), null);
});

/* ---------- เคสลบของความยาวที่หัวไฟล์ประกาศ (AIO-66 P2-2 · AIO-67 P2-2) ----------
   ทั้งสามข้อนี้คือไฟล์ที่ **เคยผ่านกฎ V15 ด้วยขนาด 2640×1200 เป๊ะ** ทั้งที่ไม่มีข้อมูลภาพเลย
   มิวเทชันที่ต้องทำให้ชุดนี้แดง: ถอดบรรทัด `if (chunkLen !== 10 || !has(10)) return null;`
   หรือบรรทัด `if (riffLen < 12 || riffLen + 8 > size) return null;` ออกจาก build/imgsize.mjs */
test('WebP VP8X ที่ความยาว chunk ไม่ใช่ 10 ต้องได้ null — สเปกล็อกไว้ 10 ไบต์เป๊ะ', () => {
  const p = vp8xPayload(W, H);
  assert.equal(sizeOf(riff('VP8X', p, { chunkLen: 0 })), null, 'chunkLen=0');
  assert.equal(sizeOf(riff('VP8X', Buffer.concat([p, Buffer.alloc(10)]))), null, 'chunkLen=20');
});

test('WebP ที่ความยาว RIFF โกหก (ไฟล์ถูกตัดกลาง) ต้องได้ null', () => {
  const p = vp8xPayload(W, H);
  /* หัวบอกว่ายังมีอีก 10 KB ตามมา แต่ไฟล์จบแล้ว — คือไฟล์ที่ถูกตัดกลางของจริง */
  assert.equal(sizeOf(riff('VP8X', p, { riffLen: 10 * 1024 })), null, 'RIFF ใหญ่กว่าไฟล์');
  assert.equal(sizeOf(riff('VP8X', p, { riffLen: 0 })), null, 'RIFF = 0 (ไฟล์ปลอมของฝั่ง Codex)');
});

test('WebP ที่ chunk เลยปลายไฟล์ ต้องได้ null', () => {
  assert.equal(sizeOf(riff('VP8X', vp8xPayload(W, H), { chunkLen: 10, riffLen: 12 })), null);
});

/* ---------- PNG ----------
   **fixture ของเคสบวกต้องเป็นไฟล์ที่ถูกโครงสร้างจริง** ไม่ใช่หัวไฟล์ 24 ไบต์ที่จบลงตรงหลัง
   กว้าง/สูง (ของเดิมเป็นแบบนั้น ⇒ เคสบวกกำลัง **ล็อกพฤติกรรมผิดไว้** ตามที่ฝั่ง Codex ชี้)
   ⇒ ประกอบ chunk ให้ครบตามสเปกพร้อม CRC32 ที่คำนวณจริง: IHDR(13) + IDAT + IEND
   (ตัวอ่านไม่ตรวจ CRC และไม่ควรตรวจ — แต่ fixture ที่เครื่องมือจริงจะไม่เคยออกให้ ก็ไม่ใช่
    หลักฐานว่า "ไฟล์ปกติอ่านออก") */
const PNG_SIG = Buffer.from('89504e470d0a1a0a', 'hex');
const CRC_TAB = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TAB[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])));
  return Buffer.concat([head, data, crc]);
};
const ihdrData = (w, h) => {
  const d = Buffer.alloc(13);
  d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4);
  d[8] = 8; d[9] = 6;                 /* bit depth 8 · color type 6 (RGBA) */
  return d;
};
const png = (w, h, { type = 'IHDR', len = null, cut = 0 } = {}) => {
  const d = ihdrData(w, h);
  const parts = [PNG_SIG, chunk(type, d), chunk('IDAT', Buffer.alloc(16)), chunk('IEND', Buffer.alloc(0))];
  if (len != null) parts[1].writeUInt32BE(len, 0);   /* โกหกความยาวโดยไม่แตะข้อมูล */
  const all = Buffer.concat(parts);
  return cut ? all.subarray(0, cut) : all;
};
test('PNG ปกติ (IHDR ครบ 13 ไบต์ + IDAT + IEND + CRC จริง) อ่านกว้าง/สูงถูก', () => {
  assert.deepEqual(sizeOf(png(W, H)), { w: W, h: H });
});
test('PNG ที่ chunk แรกไม่ใช่ IHDR ต้องได้ null — ไม่ใช่เลขขยะจากไบต์ 16–23 (AIO-64 R4)', () => {
  /* ของจริงที่เคยได้: {w:999,h:777} ⇒ V15 รายงานขนาดที่ไม่มีอยู่จริง และถ้าไบต์นั้นบังเอิญ
     เป็น 2640×1200 ก็จะรับไฟล์ที่ไม่ตามสเปกเข้าระบบ */
  assert.equal(sizeOf(png(999, 777, { type: 'eXIf' })), null);
});
test('PNG ที่สั้นกว่าหัวไฟล์ = null', () => {
  assert.equal(sizeOf(PNG_SIG), null);
});
/* ---------- เคสลบของ IHDR (AIO-66 P2-2 · AIO-67 P2-2) ----------
   มิวเทชันที่ต้องทำให้ชุดนี้แดง: ถอด `if (b.readUInt32BE(8) !== 13 || size < 33) return null;` */
test('PNG ที่ความยาว IHDR ไม่ใช่ 13 ต้องได้ null — สเปกล็อกไว้ 13 ไบต์เป๊ะ', () => {
  for (const len of [0, 12, 14, 0x7fffffff]) {
    assert.equal(sizeOf(png(W, H, { len })), null, `len=${len}`);
  }
});
test('PNG ที่จบลงตรงหลังกว้าง/สูง (24 ไบต์) ต้องได้ null — ไฟล์ปลอมของทั้งสองฝั่งรีวิว', () => {
  /* ไฟล์นี้คือตัวที่ฝั่ง Codex ใช้ทำให้ `node build/build.mjs` ออก 0 ทั้งที่ไม่มี IHDR ครบ */
  assert.equal(sizeOf(png(W, H, { cut: 24 })), null, '24 ไบต์');
  assert.equal(sizeOf(png(W, H, { cut: 32 })), null, '32 ไบต์ (ขาด CRC ของ IHDR ไปหนึ่งไบต์)');
  assert.deepEqual(sizeOf(png(W, H, { cut: 33 })), { w: W, h: H }, '33 ไบต์ = IHDR ครบก้อนพอดี');
});
test('ขนาดศูนย์ไม่ใช่ขนาดภาพ — ต้องได้ null ไม่ใช่ {w:0,h:0} ที่ปลายทางเอาไปหาร', () => {
  assert.equal(sizeOf(png(0, 0)), null);
  assert.equal(sizeOf(png(W, 0)), null);
});

/* ---------- JPEG ---------- */
const jpegWith = ({ fill = 0, pad = 0 } = {}) => {
  const parts = [Buffer.from([0xff, 0xd8])];
  /* APP1 นำหน้า SOF (EXIF/thumbnail) · ความยาวของหนึ่ง segment เป็น 16 บิต ⇒ ของจริงที่ใหญ่
     กว่านั้นมาเป็นหลาย segment ต่อกัน ซึ่งเป็นรูปแบบเดียวกับที่ทำให้ SOF หลุดพ้น 64 KB แรก */
  for (let left = pad; left > 0;) {
    const chunk = Math.min(left, 60000);
    const seg = Buffer.alloc(2 + 2 + chunk);
    seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(2 + chunk, 2);
    parts.push(seg);
    left -= chunk;
  }
  if (fill) parts.push(Buffer.alloc(fill, 0xff)); /* fill bytes ที่สเปกอนุญาตก่อน marker */
  const sof = Buffer.alloc(2 + 2 + 6 + 4);
  sof[0] = 0xff; sof[1] = 0xc0; sof.writeUInt16BE(8 + 3, 2); sof[4] = 8;
  sof.writeUInt16BE(H, 5); sof.writeUInt16BE(W, 7);
  parts.push(sof, Buffer.alloc(16));             /* ท้ายไฟล์: ให้ลูปมีไบต์พอเดินถึง SOF */
  return Buffer.concat(parts);
};
test('JPEG ปกติอ่านกว้าง/สูงถูก', () => {
  assert.deepEqual(sizeOf(jpegWith()), { w: W, h: H });
});
test('JPEG ที่มีไบต์เติม 0xFF ก่อน marker ต้องอ่านออก — สเปกอนุญาต (AIO-64 R4)', () => {
  for (const fill of [1, 2, 5]) {
    assert.deepEqual(sizeOf(jpegWith({ fill })), { w: W, h: H }, `fill=${fill}`);
  }
});
test('JPEG ที่ SOF อยู่เลย 64 KB แรก ต้องยังอ่านออก (EXIF/ICC ก้อนใหญ่ — AIO-64 R4)', () => {
  assert.deepEqual(sizeOf(jpegWith({ pad: 100 * 1024 })), { w: W, h: H });
});
test('ไฟล์ที่ไม่ใช่ภาพเลย = null', () => {
  assert.equal(sizeOf(Buffer.from('ไม่ใช่ภาพ'.repeat(10))), null);
  assert.equal(imageSize(path.join(TMP, 'ไม่มีไฟล์นี้.webp')), null);
});

/* ---------- ของจริงในรีโป: กันกรณี "fixture ถูกหมดแต่ไฟล์จริงอ่านไม่ออก" ----------
   ไม่ฝังขนาดไว้ในเทสต์ — เทียบกับค่าคงที่ของสัญญาที่ build ใช้จริง */
test('อ่านปกจริงในรีโปได้ครบทุกใบ และได้ 2:3 ตามสัญญา §13.4', async () => {
  const { SERIES } = await import('../build/content.mjs');
  for (const s of SERIES) {
    const dim = imageSize(path.join(ROOT, s.cover));
    assert.ok(dim, `อ่านขนาด ${s.cover} ไม่ออก`);
    assert.equal(+(dim.w / dim.h).toFixed(4), +(2 / 3).toFixed(4), `${s.cover} ไม่ใช่ 2:3`);
  }
});
