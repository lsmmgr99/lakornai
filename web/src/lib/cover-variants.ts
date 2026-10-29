/* สร้างไฟล์ย่อยของปกทุกขนาด (covers.ts) ด้วย sharp — เรียกจาก processCover (ตอนอัปโหลด), seed และ scripts/cover-variants.ts
   ไม่ทำซ้ำถ้ามีไฟล์อยู่แล้วและใหม่กว่าต้นฉบับ · เซิร์ฟเวอร์เท่านั้น */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { widthsFor, type CoverKind } from "./covers";

const VARIANT_RE = /-w\d{2,4}\.webp$/;
const MASTER_RE = /^[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g|avif)$/;
export const isVariantFile = (name: string) => VARIANT_RE.test(name);
export const kindOfDir = (dir: string): CoverKind | null => (dir === "covers" ? "poster" : dir === "covers-wide" ? "wide" : null);

/** สร้างไฟล์ย่อยของต้นฉบับหนึ่งไฟล์ · คืนจำนวนไฟล์ที่สร้างใหม่ */
export async function generateCoverVariants(masterAbs: string, kind: CoverKind, opts: { force?: boolean } = {}): Promise<number> {
  const base = masterAbs.replace(/\.[a-z]+$/, "");
  const src = fs.statSync(masterAbs);
  let made = 0;
  for (const w of widthsFor(kind)) {
    const out = `${base}-w${w}.webp`;
    if (!opts.force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= src.mtimeMs) continue;
    const buf = await sharp(masterAbs).resize({ width: w, withoutEnlargement: true }).webp({ quality: 75, effort: 4 }).toBuffer();
    fs.writeFileSync(out, buf);
    made++;
  }
  return made;
}

export function removeCoverVariants(masterAbs: string) {
  const dir = path.dirname(masterAbs), stem = path.basename(masterAbs).replace(/\.[a-z]+$/, "");
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(stem + "-w") && VARIANT_RE.test(f) && f.slice(stem.length).match(/^-w\d{2,4}\.webp$/)) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* ไม่สำคัญ */ }
    }
  }
}

/** ไล่ทั้ง UPLOAD_DIR สร้างไฟล์ย่อยที่ยังขาด · คืน {masters, made} */
export async function generateAllVariants(uploadDir: string, opts: { force?: boolean; log?: (s: string) => void } = {}): Promise<{ masters: number; made: number }> {
  let masters = 0, made = 0;
  for (const dir of ["covers", "covers-wide"] as const) {
    const abs = path.join(uploadDir, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).sort()) {
      if (!MASTER_RE.test(f) || isVariantFile(f)) continue;
      masters++;
      const n = await generateCoverVariants(path.join(abs, f), kindOfDir(dir)!, opts);
      made += n;
      if (n && opts.log) opts.log(`${dir}/${f}: สร้าง ${n} ขนาด`);
    }
  }
  return { masters, made };
}
