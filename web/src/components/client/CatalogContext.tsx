"use client";
/* ข้อมูลคลังฉบับย่อสำหรับฝั่งเบราว์เซอร์ (แทน assets/content.js ของเว็บรุ่น static)
   มีเฉพาะสิ่งที่ฟีเจอร์ฝั่งผู้ชมต้องใช้: ดูต่อ · ติดตาม · ค้นหา · ฟีด · สุ่มเรื่อง */
import { createContext, useContext, type ReactNode } from "react";

export interface SeriesLiteFull {
  slug: string; title: string; hook: string; synopsis: string; genres: string[]; cast: string[]; eps: number;
  status: string; ended: boolean; orientation: "vertical" | "horizontal"; c1: string; c2: string;
  cover: { url: string; w: number; h: number }; coverWide: { url: string; w: number; h: number } | null;
  episodes: { n: number; title: string; durationSec: number; mmss: string; videoUrl: string | null }[];
}
export interface CatalogLite {
  series: SeriesLiteFull[];
  by: Record<string, SeriesLiteFull>;
  genres: { slug: string; label: string }[];
  genreLabel: Record<string, string>;
  hasViews: boolean;
}
const Ctx = createContext<CatalogLite>({ series: [], by: {}, genres: [], genreLabel: {}, hasViews: false });

export function CatalogProvider({ series, genres, hasViews, children }: { series: SeriesLiteFull[]; genres: { slug: string; label: string }[]; hasViews: boolean; children: ReactNode }) {
  const value: CatalogLite = {
    series, genres, hasViews,
    by: Object.fromEntries(series.map((s) => [s.slug, s])),
    genreLabel: Object.fromEntries(genres.map((g) => [g.slug, g.label])),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCatalogLite = () => useContext(Ctx);

/* ตัวเลือกไฟล์ปกฝั่งเบราว์เซอร์ — กฎเดียวกับ coverSlot() ฝั่งเซิร์ฟเวอร์ (ADR-001 §13.5) */
export function coverSlotLite(s: SeriesLiteFull, shape: "poster" | "wide" | "auto" = "poster") {
  const wantWide = shape === "wide" || (shape === "auto" && s.orientation === "horizontal");
  if (wantWide && s.coverWide) return { ...s.coverWide, wide: true };
  return { ...s.cover, wide: false };
}
