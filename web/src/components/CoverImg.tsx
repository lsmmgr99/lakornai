import Image from "next/image";
import { coverSlot, type Series, type Shape } from "@/lib/content";

/* ปกทุกใบในเว็บไหลผ่านตัวนี้ (ADR-001 §13.5): ที่วางบอก "ทรง" ไม่ใช่ชื่อไฟล์
   ใช้ next/image ⇒ ได้ srcset/avif/webp และ width/height จริงของไฟล์ (กัน CLS) · lazy เป็นค่าตั้งต้น
   `wideMedia` = ฮีโร่หน้าแรกที่ต้องการสองทรงพร้อมกัน (มือถือ 2:3 · เดสก์ท็อปกว้าง) ⇒ <picture> + <source media>
   ถ้าเรื่องนั้นยังไม่มีภาพกว้าง บล็อก <source> หายไปทั้งก้อน (ผลลัพธ์เหมือนไม่มี wideMedia) */
export interface CoverImgProps {
  s: Series;
  shape?: Shape;
  lazy?: boolean;
  cls?: string;
  alt?: string | null;
  sizes?: string;
  wideMedia?: string | null;
  position?: string;
}
export function CoverImg({ s, shape = "poster", lazy = true, cls = "", alt = null, sizes = "(min-width:960px) 220px, 45vw", wideMedia = null, position }: CoverImgProps) {
  const slot = coverSlot(s, shape);
  const img = (
    <Image
      className={cls || undefined}
      src={slot.url}
      width={slot.w}
      height={slot.h}
      alt={alt === null ? "" : alt}
      aria-hidden={alt === null ? true : undefined}
      loading={lazy ? "lazy" : "eager"}
      priority={!lazy}
      fetchPriority={lazy ? undefined : "high"}
      sizes={sizes}
      style={position ? { objectPosition: position } : undefined}
    />
  );
  if (!wideMedia) return img;
  const wide = coverSlot(s, "wide");
  if (!wide.wide) return img;
  return (
    <picture>
      <source media={wideMedia} srcSet={wide.url} width={wide.w} height={wide.h} />
      {img}
    </picture>
  );
}
