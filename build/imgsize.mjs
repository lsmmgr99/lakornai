/* ขนาดจริงของไฟล์ภาพ อ่านจากหัวไฟล์ — ไม่มี dependency ภายนอก (AIO-57)

   ทำไมต้องมี: ADR-001 §13.4 ล็อก `coverWide` ไว้ที่ **2640×1200 เป๊ะ** เพราะ `width`/`height`
   ที่ `<img>` ประกาศมาจากค่าคงที่ในโค้ด ⇒ ไฟล์ที่ขนาดไม่ตรงจะพา CLS กลับมาเงียบ ๆ
   ทั้งที่โค้ดดูเหมือนประกาศขนาดไว้ครบ · กฎ V15 จึงต้องวัดของจริง ไม่ใช่เชื่อชื่อไฟล์

   ⚠️ ตัวนี้อ่าน "หัวไฟล์" ไม่ได้ถอดรหัสภาพ · คืน `null` เมื่ออ่านไม่ออก
      ผู้เรียกต้องตัดสินเองว่า `null` = ล้ม หรือ = ข้าม (V15 ถือว่าล้ม) */
import fs from 'node:fs';

/* WebP = RIFF: 'RIFF' <len> 'WEBP' แล้วตามด้วย chunk · ขนาดอยู่ที่ chunk แรกซึ่งมี 3 แบบ
     VP8   (lossy)     — sync code 9d 01 2a แล้ว 14 บิตกว้าง / 14 บิตสูง
     VP8L  (lossless)  — signature 0x2f แล้ว 14 บิตกว้าง-1 / 14 บิตสูง-1 อัดบิตเรียงกัน
     VP8X  (extended)  — flags 4 ไบต์ แล้ว 24 บิตกว้าง-1 / 24 บิตสูง-1 (ของ animated/alpha)
   ไฟล์ที่ cwebp ออกให้เป็น VP8L หรือ VP8X ขึ้นกับโหมด ⇒ ต้องรับทั้งสาม ไม่ใช่เดาแบบเดียว */
/* `size` = ขนาดไฟล์จริงบนดิสก์ ไม่ใช่ความยาวของบัฟเฟอร์ที่อ่านมา — ตัวเรียกอ่านแค่หัวไฟล์
   ⇒ ถ้าเทียบความยาวที่หัวประกาศกับ `b.length` ไฟล์ WebP ที่ใหญ่กว่าหน้าต่างจะถูกปฏิเสธทั้งที่ถูกต้อง */
function webpSize(b, size) {
  if (b.length < 20 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  /* ---------- ความยาวที่หัวไฟล์ประกาศ ต้องสอดคล้องกับไฟล์จริง (AIO-66 P2-2 · AIO-67 P2-2) ----------
     รอบก่อนตัวอ่านไม่แตะความยาวเลย (เทสต์ยังเขียนกำกับว่า "ไม่ถูกอ่าน จึงใส่ค่าใดก็ได้") ⇒ ไฟล์
     30 ไบต์ที่ทุกความยาวเป็นศูนย์ ผ่านกฎ V15 ด้วยขนาด 2640×1200 เป๊ะ · ของพวกนี้ไม่ใช่ภาพเลย
     RIFF: ฟิลด์ที่ไบต์ 4 = ขนาดไฟล์ − 8 ⇒ เล็กกว่า 12 เป็นไปไม่ได้ (ต้องมี 'WEBP' + chunk header)
     และถ้ามันใหญ่กว่าไฟล์จริง = ไฟล์ถูกตัดกลาง ⇒ ปฏิเสธ ไม่ใช่เดาจากไบต์ที่เหลือ */
  const riffLen = b.readUInt32LE(4);
  if (riffLen < 12 || riffLen + 8 > size) return null;
  const kind = b.toString('ascii', 12, 16);
  const chunkLen = b.readUInt32LE(16);        /* ความยาวของ chunk แรก (ไม่รวมหัว 8 ไบต์ของมันเอง) */
  /* chunk ต้องอยู่ในไฟล์จริงทั้งก้อน และต้องอยู่ในงบที่ RIFF ประกาศ — ไบต์ที่เลยปลายทั้งสอง
     ไม่ใช่ข้อมูลภาพ แม้ตำแหน่งของกว้าง/สูงจะพออ่านได้ */
  if (20 + chunkLen > size || 12 + 8 + chunkLen > riffLen + 8) return null;
  const has = n => b.length >= 20 + n;        /* ไบต์ของ payload ที่ต้องใช้ อยู่ในหน้าต่างที่อ่านมาจริง */
  if (kind === 'VP8 ') {
    /* keyframe header ของ VP8 สั้นสุด 10 ไบต์: 3 ไบต์ frame tag + sync code 3 + กว้าง/สูง 4 */
    if (chunkLen < 10 || !has(10)) return null;
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (kind === 'VP8L') {
    if (chunkLen < 5 || !has(5)) return null;
    if (b[20] !== 0x2f) return null;          /* ตรวจลายเซ็นก่อนอ่าน ไม่ใช่หลังอ่าน */
    const bits = b.readUInt32LE(21);          /* ข้าม 20 ไบต์หัว + 1 ไบต์ signature */
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') {
    /* สเปกล็อก VP8X ไว้ที่ **10 ไบต์เป๊ะ** (flags 1 + สงวน 3 + กว้าง-1 3 + สูง-1 3)
       ⇒ ความยาวอื่นคือไฟล์ที่ไม่ตามสเปก ไม่ใช่ไฟล์ที่เราควรรายงานขนาดให้ */
    if (chunkLen !== 10 || !has(10)) return null;
    return { w: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1, h: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1 };
  }
  return null;
}

/* PNG: IHDR เป็น chunk แรกเสมอตามสเปก ⇒ กว้าง/สูงอยู่ที่ไบต์ 16–23 แบบ big-endian
   ⚠️ ต้องตรวจว่า chunk แรก **ชื่อ IHDR จริง** ไม่ใช่เชื่อแค่ลายเซ็น 8 ไบต์ (AIO-64 R4):
      ไฟล์ที่ไม่ตามสเปกจะได้ "เลขขยะจากไบต์ 16–23" กลับไป ⇒ กฎ V15 รายงานขนาดที่ไม่มีอยู่จริง
      และถ้าไบต์นั้นบังเอิญเป็น 2640×1200 ก็จะ **รับไฟล์เสียเข้าระบบ** · คืน null ดีกว่าเดา */
function pngSize(b, size) {
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null;
  /* ---------- IHDR ต้องครบก้อน ไม่ใช่แค่ชื่อถูก (AIO-66 P2-2 · AIO-67 P2-2) ----------
     สเปกล็อกความยาว IHDR ไว้ที่ **13 ไบต์เป๊ะ** (กว้าง 4 · สูง 4 · bit depth/color type/
     compression/filter/interlace 1 ไบต์ละตัว) แล้วปิดด้วย CRC 4 ไบต์ ⇒ ไฟล์ 24 ไบต์ที่จบลง
     ตรงหลังกว้าง/สูงพอดี **ไม่ใช่ PNG** แต่รอบก่อนมันผ่านกฎ V15 ด้วยขนาดที่สัญญาต้องการเป๊ะ
     (ทั้งสองฝั่งรีวิวสร้างไฟล์แบบนี้ได้จริง · ฝั่ง Codex ทำให้ `node build/build.mjs` ออก 0)
     ⇒ ต้องมีไบต์ครบถึงท้าย CRC ของ IHDR ในไฟล์จริง = 8 + 4 + 4 + 13 + 4 = 33 ไบต์ */
  if (b.readUInt32BE(8) !== 13 || size < 33) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/* JPEG: ต้องเดินหา marker SOFn เพราะก่อนหน้านั้นมี EXIF/ICC ความยาวไม่แน่นอน
   ข้าม SOF4 (DHT) SOF8 (JPG สงวน) SOF12 (DAC) ตามสเปก — สามตัวนั้นไม่ใช่ frame header */
function jpegSize(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    /* ไบต์เติม 0xFF ก่อน marker เป็นของที่สเปกอนุญาต (JPEG B.1.1.2 "fill bytes")
       รอบแรกเคสนี้ทำให้ `m` เป็น 0xff แล้วไปอ่าน len จากไบต์ที่ไม่ใช่ความยาว ⇒ กระโดดผิดที่
       แล้วคืน null ⇒ **ปฏิเสธไฟล์ที่ถูกต้อง** พร้อมข้อความที่ชี้ผิดทาง (AIO-64 R4) */
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd9)) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

/* อ่านแค่ 64 KB แรกพอสำหรับ WebP/PNG (หัวไฟล์อยู่ต้นไฟล์เสมอ) แต่ **JPEG ไม่รับประกันแบบนั้น**:
   EXIF/ICC/thumbnail ที่นำหน้า SOF ใหญ่เกิน 64 KB ได้ง่าย ⇒ รอบแรกไฟล์แบบนั้นได้ `null`
   แล้ว V15 รายงานว่า "อ่านหัวไฟล์ไม่ออก" ทั้งที่ไฟล์ถูกต้อง (AIO-64 R4) · เข้าถึงได้จริงเพราะ
   regex พาธของ V15 อนุญาต `jpg|jpeg` ⇒ ถ้ารอบแรกไม่เจอและไฟล์ใหญ่กว่าหน้าต่าง ให้ขยายหน้าต่าง
   เพดาน 4 MB: ใหญ่กว่านั้นไม่ใช่ไฟล์ที่สัญญายอมรับอยู่แล้ว (coverWide ≤300 KB) */
const HEAD_BYTES = 65536;
const MAX_HEAD_BYTES = 4 * 1024 * 1024;
function readHead(fd, size, want) {
  const b = Buffer.alloc(Math.min(want, size));
  let off = 0;
  /* fs.readSync คืน "ที่อ่านได้จริง" ซึ่งน้อยกว่าที่ขอได้ตามสเปก — วนจนครบหรือจนไฟล์หมด */
  while (off < b.length) {
    const n = fs.readSync(fd, b, off, b.length - off, off);
    if (n <= 0) return b.subarray(0, off);
    off += n;
  }
  return b;
}
export function imageSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const b = readHead(fd, size, HEAD_BYTES);
    /* ขนาดศูนย์/ลบไม่ใช่ขนาดภาพ — และผู้เรียกเอาไปหาร (`dim.w / dim.h`) ⇒ คืน null ดีกว่าให้
       ตัวเลขที่ทำให้ด่านปลายทางหาร 0 แล้วรายงานสัดส่วน NaN/Infinity (AIO-66 P2-2 ท้ายข้อ) */
    const ok = r => (r && r.w > 0 && r.h > 0 ? r : null);
    const first = ok(webpSize(b, size)) || ok(pngSize(b, size)) || ok(jpegSize(b));
    if (first) return first;
    if (size > b.length && b.length >= 2 && b[0] === 0xff && b[1] === 0xd8) {
      return ok(jpegSize(readHead(fd, size, MAX_HEAD_BYTES)));
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
