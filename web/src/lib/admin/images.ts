/* ประมวลผลปกที่อัปโหลด — ตรวจชนิดจากไบต์จริง (ไม่เชื่อชื่อไฟล์) · บังคับสัดส่วน · แปลงเป็น WebP
   poster: 2:3 (±2%) → ย่อ/ขยายเป็น 1024×1536 · ≤ 1 MB ก่อนแปลง
   wide:   11:5 (2640×1200 ±2%) → 2640×1200 · บีบให้ ≤ 300 KB (ภาพ LCP ของหน้าแรก · ADR-001 §13.4) */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "@/app/media/[...path]/route";
import { generateCoverVariants, removeCoverVariants } from "@/lib/cover-variants";

export type CoverKind = "poster" | "wide";
const SPEC = {
  poster: { dir: "covers", w: 1024, h: 1536, ratio: 2 / 3, maxIn: 1_000_000, maxOut: 400 * 1024, label: "ปก 2:3" },
  wide: { dir: "covers-wide", w: 2640, h: 1200, ratio: 2640 / 1200, maxIn: 4_000_000, maxOut: 300 * 1024, label: "ภาพกว้าง 2640×1200" },
} as const;

export async function processCover(bytes: Buffer, slug: string, kind: CoverKind): Promise<{ path: string; w: number; h: number; bytes: number }> {
  const spec = SPEC[kind];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("รหัสเรื่องไม่ถูกต้อง");
  if (!bytes.length) throw new Error("ไฟล์ว่าง");
  if (bytes.length > spec.maxIn) throw new Error(`${spec.label}ต้องมีขนาดไม่เกิน ${Math.round(spec.maxIn / 1024)} KB`);
  let meta;
  try { meta = await sharp(bytes).metadata(); } catch { throw new Error("อ่านไฟล์ภาพไม่ได้ — รับเฉพาะ PNG, JPEG, WebP"); }
  if (!meta.format || !["png", "jpeg", "webp"].includes(meta.format)) throw new Error("รับเฉพาะ PNG, JPEG หรือ WebP");
  if (!meta.width || !meta.height) throw new Error("อ่านขนาดภาพไม่ได้");
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - spec.ratio) / spec.ratio > 0.02) {
    throw new Error(`${spec.label}ต้องมีสัดส่วน ${kind === "poster" ? "2:3" : "2640×1200 (11:5)"} — ไฟล์นี้ ${meta.width}×${meta.height}`);
  }
  if (meta.width < spec.w * 0.5) throw new Error(`ภาพเล็กเกินไป (${meta.width}×${meta.height}) — ต้องกว้างอย่างน้อย ${Math.round(spec.w * 0.5)}px`);

  let quality = 82, out: Buffer | null = null;
  for (let i = 0; i < 6; i++) {
    out = await sharp(bytes).rotate().resize(spec.w, spec.h, { fit: "cover", position: "centre" }).webp({ quality, effort: 5 }).toBuffer();
    if (out.length <= spec.maxOut) break;
    quality -= 10;
  }
  if (!out || out.length > spec.maxOut) throw new Error(`บีบไฟล์ให้เล็กกว่า ${Math.round(spec.maxOut / 1024)} KB ไม่ได้ — ลองภาพที่รายละเอียดน้อยลง`);
  const hash = crypto.createHash("sha1").update(out).digest("hex").slice(0, 8);
  const rel = `${spec.dir}/${slug}-${hash}.webp`;
  const abs = path.join(UPLOAD_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, out);
  await generateCoverVariants(abs, kind, { force: true });   // ไฟล์ย่อยทุกขนาด (covers.ts) — หน้าเว็บใช้ไฟล์เหล่านี้ ไม่ย่อสด
  return { path: rel, w: spec.w, h: spec.h, bytes: out.length };
}

export function removeCoverFile(rel: string | null | undefined) {
  if (!rel || !/^(covers|covers-wide)\/[a-z0-9][a-z0-9-]*(?:-[0-9a-f]{6,12})?\.(webp|png|jpg|jpeg|avif)$/.test(rel)) return;
  const abs = path.join(UPLOAD_DIR, rel);
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch { /* ไม่สำคัญ */ }
  removeCoverVariants(abs);
}
