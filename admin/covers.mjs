// ขอบเขตการรับไฟล์ภาพระดับไบต์ — ใช้ร่วมกันทั้งเบราว์เซอร์และ broker
// ไม่เชื่อชื่อไฟล์ที่ผู้ใช้ส่งมา: ชื่อปลายทางคำนวณจาก slug + ชนิดไฟล์ที่อ่านได้จาก magic bytes (ADR-001 §12.1 B8)
//
// ปกมีสองใบต่อเรื่อง (ADR-001 §13.4):
//   poster = assets/covers/<slug>.<ext>       ปก 2:3 · ≤ 1 MB
//   wide   = assets/covers-wide/<slug>.<ext>  ภาพกว้าง 2640×1200 · ≤ 300 KB (ขนาดจริงวัดที่ชั้นถัดไป)
export const MAX_COVER_BYTES = 1_000_000;
export const MAX_WIDE_BYTES = 300 * 1024;
export const WIDE_W = 2640, WIDE_H = 1200;
export const KINDS = {
  poster: { dir: 'assets/covers', max: MAX_COVER_BYTES, label: 'ปก 2:3' },
  wide: { dir: 'assets/covers-wide', max: MAX_WIDE_BYTES, label: 'ภาพกว้าง 2640×1200' },
};
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* ชนิดไฟล์จากหัวไฟล์จริง · คืน null ถ้าไม่ใช่ PNG/JPEG/WebP */
export function sniffImage(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) return null;
  const has = (offset, expected) => expected.every((v, i) => bytes[offset + i] === v);
  if (has(0, [137, 80, 78, 71, 13, 10, 26, 10]) && bytes.length >= 24 && has(12, [73, 72, 68, 82])) return 'png';
  if (has(0, [255, 216, 255]) && bytes.length >= 4) return 'jpg';
  if (bytes.length >= 20 && has(0, [82, 73, 70, 70]) && has(8, [87, 69, 66, 80]) && has(12, [86, 80, 56])) return 'webp';
  return null;
}

export function inspectCover(bytes, slug, kind = 'poster') {
  const spec = KINDS[kind];
  if (!spec) throw Error('ชนิดของปกไม่ถูกต้อง');
  if (!SLUG_RE.test(slug)) throw Error('รหัสเรื่องไม่ถูกต้อง');
  if (!(bytes instanceof Uint8Array) || !bytes.length) throw Error('ไฟล์ว่าง');
  if (bytes.length > spec.max) throw Error(`${spec.label}ต้องมีขนาดไม่เกิน ${Math.round(spec.max / 1024)} KB`);
  const ext = sniffImage(bytes);
  if (!ext) throw Error('รับเฉพาะข้อมูลภาพ PNG, JPEG หรือ WebP');
  return { path: `${spec.dir}/${slug}.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, kind };
}

/* เรื่องหนึ่งอ้างปกได้สองพาธ — คืนรายการ [kind, path] ที่มีค่า */
export function coverSlots(series) {
  const out = [['poster', series.cover]];
  if (series.coverWide) out.push(['wide', series.coverWide]);
  return out.filter(([, p]) => typeof p === 'string' && p);
}

// ustar แบบพกพา: ดาวน์โหลดครั้งเดียวได้ JSON พร้อมปกใหม่ทุกใบที่ร่างอ้างถึง
export function exportArchive(content, covers) {
  const encoder = new TextEncoder();
  const parts = [];
  const entries = [['content.json', encoder.encode(JSON.stringify(content, null, 2) + '\n')]];
  for (const s of content.series) {
    for (const [kind, path] of coverSlots(s)) {
      const cover = covers.get(path);
      if (!cover) continue;
      const checked = inspectCover(cover.bytes, s.slug, kind);
      if (checked.path !== path) throw Error('พาธปกไม่ตรงกับข้อมูลภาพ');
      entries.push([checked.path, cover.bytes]);
    }
  }
  for (const [name, bytes] of entries) {
    const header = new Uint8Array(512);
    const put = (offset, text) => header.set(encoder.encode(text), offset);
    const octal = (n, size) => n.toString(8).padStart(size - 1, '0') + '\0';
    put(0, name); put(100, octal(0o644, 8)); put(108, octal(0, 8)); put(116, octal(0, 8));
    put(124, octal(bytes.length, 12)); put(136, octal(0, 12)); put(148, '        ');
    put(156, '0'); put(257, 'ustar\0'); put(263, '00');
    put(148, header.reduce((sum, b) => sum + b, 0).toString(8).padStart(6, '0') + '\0 ');
    parts.push(header, bytes, new Uint8Array((512 - bytes.length % 512) % 512));
  }
  parts.push(new Uint8Array(1024));
  return new Blob(parts, { type: 'application/x-tar' });
}
