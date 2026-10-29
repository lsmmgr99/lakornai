/* ขนาดภาพปกที่สร้างไว้ล่วงหน้า (ไม่ย่อสดบนเซิร์ฟเวอร์ — เครื่องโปรดักชันมี 1 CPU การย่อ/แปลงสดใช้เวลา 1–2 วินาทีต่อรูป)
   ไฟล์ต้นฉบับ  /media/covers/<slug>[-hash].webp (1024×1536) · /media/covers-wide/<slug>[-hash].webp (2640×1200)
   ไฟล์ย่อย     <ต้นฉบับ>-w<กว้าง>.webp  — สร้างตอนอัปโหลด/seed (cover-variants.ts) และเสิร์ฟเป็นไฟล์นิ่ง (nginx + Cloudflare cache ได้เพราะมีนามสกุล)
   ใช้ร่วมกันทั้ง server และ client (ไม่มี import ของ node) */
export const POSTER_WIDTHS = [96, 160, 260, 414, 640, 828, 1024] as const;
export const WIDE_WIDTHS = [414, 640, 828, 1080, 1440, 1920, 2640] as const;

export type CoverKind = "poster" | "wide";
const KIND_RE = /^\/media\/(covers|covers-wide)\/[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g|avif)$/;

export function coverKind(url: string): CoverKind | null {
  const m = KIND_RE.exec(url);
  return m ? (m[1] === "covers" ? "poster" : "wide") : null;
}
export const widthsFor = (kind: CoverKind): readonly number[] => (kind === "poster" ? POSTER_WIDTHS : WIDE_WIDTHS);

/** URL ของไฟล์ย่อยที่เล็กที่สุดซึ่งกว้าง ≥ width (ถ้าขอเกินสุดให้ไฟล์ใหญ่สุด) · URL ที่ไม่ใช่ปกส่งคืนตามเดิม */
export function variantUrl(url: string, width: number): string {
  const kind = coverKind(url);
  if (!kind) return url;
  const ws = widthsFor(kind);
  const w = ws.find((x) => x >= width) ?? ws[ws.length - 1];
  return `${url.replace(/\.[a-z]+$/, "")}-w${w}.webp`;
}
/** srcset ครบทุกขนาดของปกนั้น (ใช้กับ <source> ของภาพกว้าง) */
export function variantSrcSet(url: string): string | undefined {
  const kind = coverKind(url);
  if (!kind) return undefined;
  const base = url.replace(/\.[a-z]+$/, "");
  return widthsFor(kind).map((w) => `${base}-w${w}.webp ${w}w`).join(", ");
}
