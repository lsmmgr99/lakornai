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
function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);          /* ข้าม 20 ไบต์หัว + 1 ไบต์ signature */
    if (b[20] !== 0x2f) return null;
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') {
    return { w: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1, h: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1 };
  }
  return null;
}

/* PNG: IHDR เป็น chunk แรกเสมอตามสเปก ⇒ กว้าง/สูงอยู่ที่ไบต์ 16–23 แบบ big-endian */
function pngSize(b) {
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
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

/* อ่านแค่ 64 KB แรกพอ — หัวไฟล์ของทั้งสามรูปแบบอยู่ต้นไฟล์ และไฟล์ปกกว้างมี MB ได้ */
export function imageSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(Math.min(65536, fs.fstatSync(fd).size));
    fs.readSync(fd, b, 0, b.length, 0);
    return webpSize(b) || pngSize(b) || jpegSize(b);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
