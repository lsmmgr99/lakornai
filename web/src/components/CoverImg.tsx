import Image from "next/image";
import { coverSlot, type Series, type Shape } from "@/lib/content";
import { variantSrcSet } from "@/lib/covers";

const AVIF = "image/avif";

/* ปกทุกใบในเว็บไหลผ่านตัวนี้ (ADR-001 §13.5): ที่วางบอก "ทรง" ไม่ใช่ชื่อไฟล์
   ใช้ next/image (loader เอง → ไฟล์ย่อยที่สร้างไว้ล่วงหน้า · covers.ts) ⇒ srcset + width/height จริงของไฟล์ (กัน CLS) · lazy เป็นค่าตั้งต้น
   ห่อด้วย <picture> เสมอเมื่อเป็นปก: <source type="image/avif"> ก่อน (เล็กกว่า ~40%) แล้ว <img> WebP เป็น fallback
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
  const avif = variantSrcSet(slot.url, "avif");
  const wide = wideMedia ? coverSlot(s, "wide") : null;
  const useWide = !!wide && wide.wide;
  const img = (
    <Image
      className={cls || undefined}
      src={slot.url}
      width={slot.w}
      height={slot.h}
      alt={alt === null ? "" : alt}
      aria-hidden={alt === null ? true : undefined}
      loading={lazy ? "lazy" : "eager"}
      priority={!lazy && !avif && !useWide}   /* ถ้าห่อ <picture> จะใส่ preload เอง (ด้านล่าง) ให้ตรงกับไฟล์ที่เบราว์เซอร์เลือกจริง */
      fetchPriority={lazy ? undefined : "high"}
      sizes={sizes}
      style={position ? { objectPosition: position } : undefined}
    />
  );
  if (!avif && !useWide) return img;
  /* preload ของภาพ LCP: next/image ใส่ให้เฉพาะ <img> (WebP) ซึ่งไม่ตรงกับ <source> AVIF/ภาพกว้าง ⇒ โหลดซ้ำสองไฟล์
     จึงใส่ <link rel=preload> เอง (React 19 ย้ายขึ้น <head> ให้) พร้อม media/type ให้ตรงกับที่ <picture> เลือก · ค่า type กันเบราว์เซอร์ที่ไม่รู้จัก AVIF */
  const notWide = useWide ? `not all and ${wideMedia}` : undefined;
  const preload = lazy ? null : (
    <>
      {useWide && <link rel="preload" as="image" fetchPriority="high" type={AVIF} media={wideMedia!} imageSrcSet={variantSrcSet(wide.url, "avif")} imageSizes={sizes} />}
      {avif && <link rel="preload" as="image" fetchPriority="high" type={AVIF} media={notWide} imageSrcSet={avif} imageSizes={sizes} />}
    </>
  );
  return (
    <picture>
      {preload}
      {useWide && variantSrcSet(wide.url, "avif") && <source media={wideMedia!} type={AVIF} srcSet={variantSrcSet(wide.url, "avif")} sizes={sizes} width={wide.w} height={wide.h} />}
      {useWide && <source media={wideMedia!} srcSet={variantSrcSet(wide.url) || wide.url} sizes={sizes} width={wide.w} height={wide.h} />}
      {avif && <source type={AVIF} srcSet={avif} sizes={sizes} width={slot.w} height={slot.h} />}
      {img}
    </picture>
  );
}
