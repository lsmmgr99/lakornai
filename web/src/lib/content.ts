/* ชั้นข้อมูลของหน้าบ้าน — อ่านจากฐานข้อมูลครั้งเดียวต่อรอบ cache (tag "content")
   หลังบ้านกด "เผยแพร่"/บันทึก → revalidateTag("content") → ทุกหน้าสร้างใหม่จากข้อมูลล่าสุด
   รูปข้อมูลที่คืนให้หน้าเว็บตั้งใจให้เหมือนตัว generator รุ่น static (build/content.mjs) เพื่อย้าย
   เทมเพลตมาได้ตรง ๆ และกฎ SEO/ถ้อยคำ (V12/V13 · ไม่มีค่าเดาใด ๆ) ยังเหมือนเดิม */
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "./db";
import { U } from "./urls";

export const CONTENT_TAG = "content";
export const COVER_W = 1024, COVER_H = 1536;
export const COVER_WIDE_W = 2640, COVER_WIDE_H = 1200;

export type Orientation = "vertical" | "horizontal";
export type Day = "daily" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAYS: Day[] = ["daily", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_TH: Record<Day, string> = { daily: "ทุกวัน", mon: "จันทร์", tue: "อังคาร", wed: "พุธ", thu: "พฤหัสบดี", fri: "ศุกร์", sat: "เสาร์", sun: "อาทิตย์" };
export const cadenceTH = (day: Day) => (day === "daily" ? "ทุกวัน" : "ทุก" + DAY_TH[day]);
export const dayLabel = (day: Day) => DAY_TH[day];

export interface Episode {
  n: number;
  title: string;
  durationSec: number;
  /** "m:ss" */
  mmss: string;
  videoUrl: string | null;
}
export interface CoverFile { url: string; w: number; h: number }
export interface Series {
  id: number;
  slug: string;
  title: string;
  hook: string;
  synopsis: string;
  genres: string[];
  tropes: string[];
  cast: string[];
  eps: number;
  /** null = จบแล้ว */
  day: Day | null;
  /** ข้อความสถานะ เช่น "ตอนใหม่ทุกวัน" / "จบแล้ว" */
  status: string;
  airtime: string;
  ended: boolean;
  orientation: Orientation;
  cover: CoverFile;
  coverWide: CoverFile | null;
  c1: string;
  c2: string;
  views: number | null;
  episodes: Episode[];
  updatedAt: string;
}
export interface Genre { slug: string; label: string; intro: string | null; seoTitle: string | null; seoDesc: string | null }
export interface Trope { slug: string; label: string; items: string[] }
export interface SiteSettings { siteName: string; siteOrigin: string; indexing: boolean; viewsSource: string; freeLine: string }
export interface Content {
  settings: SiteSettings;
  genres: Genre[];
  tropes: Trope[];
  series: Series[];
}

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
export const iso8601 = (sec: number) => `PT${Math.floor(sec / 60)}M${sec % 60}S`;
const parseList = (s: string | null | undefined): string[] => {
  try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
};

/* ปกตกหล่น = ใช้ภาพกันพื้นที่ (ไม่ปล่อยให้ <img> ว่าง) — หลังบ้านบังคับให้มีปกก่อนเผยแพร่อยู่แล้ว */
const PLACEHOLDER: CoverFile = { url: "/placeholder-cover.svg", w: COVER_W, h: COVER_H };

async function loadContent(): Promise<Content> {
  const [setting, genres, tropes, series] = await Promise.all([
    prisma.setting.findUnique({ where: { id: 1 } }),
    prisma.genre.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
    prisma.trope.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
    prisma.series.findMany({
      where: { published: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      include: { episodes: { orderBy: { n: "asc" } } },
    }),
  ]);
  const settings: SiteSettings = {
    siteName: setting?.siteName || "AiLakorn",
    siteOrigin: (setting?.siteOrigin || process.env.SITE_ORIGIN || "https://ailakorn.com").replace(/\/+$/, ""),
    indexing: setting?.indexing ?? false,
    viewsSource: setting?.viewsSource || "none",
    freeLine: setting?.freeLine || "ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก",
  };
  const out: Series[] = series
    .filter((s) => s.episodes.length > 0 && (s.orientation === "vertical" || s.orientation === "horizontal"))
    .map((s) => {
      const ended = s.status === "ended";
      const day = ended ? null : (DAYS.includes(s.releaseDay as Day) ? (s.releaseDay as Day) : "daily");
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        hook: s.hook,
        synopsis: s.synopsis,
        genres: parseList(s.genres),
        tropes: parseList(s.tropes),
        cast: parseList(s.cast),
        eps: s.episodes.length,
        day,
        ended,
        status: day ? "ตอนใหม่" + cadenceTH(day) : "จบแล้ว",
        airtime: day ? cadenceTH(day) : "",
        orientation: s.orientation as Orientation,
        cover: s.cover ? { url: U.media(s.cover), w: s.coverW || COVER_W, h: s.coverH || COVER_H } : PLACEHOLDER,
        coverWide: s.coverWide ? { url: U.media(s.coverWide), w: s.coverWideW || COVER_WIDE_W, h: s.coverWideH || COVER_WIDE_H } : null,
        c1: s.themeC1 || "#2a2733",
        c2: s.themeC2 || "#4a4556",
        views: settings.viewsSource === "none" ? null : s.views,
        episodes: s.episodes.map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec, mmss: mmss(e.durationSec), videoUrl: e.videoUrl })),
        updatedAt: s.updatedAt.toISOString(),
      };
    });
  return {
    settings,
    genres: genres.map((g) => ({ slug: g.slug, label: g.label, intro: g.intro, seoTitle: g.seoTitle, seoDesc: g.seoDesc })),
    tropes: tropes.map((t) => ({ slug: t.slug, label: t.label, items: out.filter((s) => s.tropes.includes(t.slug)).map((s) => s.slug) })),
    series: out,
  };
}

const cached = unstable_cache(loadContent, ["content-v1"], { tags: [CONTENT_TAG] });
/* React cache ซ้อนอีกชั้น: ภายในหนึ่ง request ทุกคอมโพเนนต์ได้อ็อบเจกต์เดียวกัน */
export const getContent = cache(() => cached());

/* ---------- ค่าที่คิดจากข้อมูล (เหมือน build/content.mjs) ---------- */
export interface Catalog extends Content {
  by: Record<string, Series>;
  hasViews: boolean;
  genreLabel: (slug: string) => string;
  seriesOfGenre: (slug: string) => Series[];
  top10: Series[];
  rankBasisText: string;
  openTags: OpenTag[];
  openTagsOf: (s: Series) => OpenTag[];
  genreCover: Map<string, Series>;
  castPages: { name: string; items: Series[] }[];
  hasCastPage: (name: string) => boolean;
  similar: (s: Series, n?: number) => Series[];
  isDaily: (s: Series) => boolean;
  isAiring: (s: Series) => boolean;
}
export interface OpenTag { slug: string; kind: "trope" | "status" | "length"; label: string; chip: string; lead: string; items: string[] }

const TAG_MIN_ITEMS = 3;
const TAG_MAX_GENRE_OVERLAP = 0.8;
const SHORT_EPS = 20, LONG_EPS = 45;
const TROPE_LEAD = "เรื่องที่เล่าปมเดียวกันแม้จะอยู่คนละแนว";
const FACETS = [
  { slug: "ended", kind: "status" as const, label: "จบแล้ว", chip: "จบแล้ว", lead: "เรื่องที่ปล่อยตอนครบแล้ว ดูจบได้เลยไม่ต้องรอตอนใหม่", match: (s: Series) => s.day === null },
  { slug: "daily", kind: "status" as const, label: "ออกตอนใหม่ทุกวัน", chip: "ออกตอนใหม่ทุกวัน", lead: "เรื่องที่ยังปล่อยตอนใหม่ทุกวัน", match: (s: Series) => s.day === "daily" },
  { slug: "quick-watch", kind: "length" as const, label: `ดูจบไว ≤${SHORT_EPS} ตอน`, chip: "ดูจบไว", lead: `เรื่องที่มีไม่เกิน ${SHORT_EPS} ตอน`, match: (s: Series) => s.eps <= SHORT_EPS },
  { slug: "long-run", kind: "length" as const, label: `เรื่องยาว ≥${LONG_EPS} ตอน`, chip: "เรื่องยาว", lead: `เรื่องที่มี ${LONG_EPS} ตอนขึ้นไป`, match: (s: Series) => s.eps >= LONG_EPS },
];

function computeOpenTags(d: Content): OpenTag[] {
  const genreSlugs = new Set(d.genres.map((g) => g.slug));
  const candidates: OpenTag[] = [
    ...d.tropes.map((t) => ({ slug: t.slug, kind: "trope" as const, label: t.label, chip: t.label, lead: TROPE_LEAD, items: t.items })),
    ...FACETS.map((f) => ({ slug: f.slug, kind: f.kind, label: f.label, chip: f.chip, lead: f.lead, items: d.series.filter(f.match).map((s) => s.slug) })),
  ].filter((c) => !genreSlugs.has(c.slug));
  const overlap = (items: string[]) => {
    let worst = 0;
    for (const g of d.genres) {
      const set = new Set(d.series.filter((s) => s.genres.includes(g.slug)).map((s) => s.slug));
      worst = Math.max(worst, items.filter((k) => set.has(k)).length / items.length);
    }
    return worst;
  };
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return c.items.length >= TAG_MIN_ITEMS && overlap(c.items) <= TAG_MAX_GENRE_OVERLAP;
  });
}

/* จับคู่แนว ↔ ปกไม่ซ้ำกัน (Kuhn) — เหมือน genreCovers() ของ generator */
function genreCovers(d: Content, by: Record<string, Series>): Map<string, Series> {
  const cand = new Map(d.genres.map((g) => [g.slug, d.series.filter((s) => s.genres.includes(g.slug))]));
  const order = d.genres.map((g, i) => [g.slug, i] as const)
    .sort((a, b) => cand.get(a[0])!.length - cand.get(b[0])!.length || a[1] - b[1]).map((x) => x[0]);
  const owner = new Map<string, string>();
  const claim = (gs: string, seen: Set<string>): boolean => {
    for (const s of cand.get(gs) || []) {
      if (seen.has(s.slug)) continue;
      seen.add(s.slug);
      if (!owner.has(s.slug) || claim(owner.get(s.slug)!, seen)) { owner.set(s.slug, gs); return true; }
    }
    return false;
  };
  for (const gs of order) claim(gs, new Set());
  const pick = new Map<string, Series>();
  for (const [sSlug, gSlug] of owner) pick.set(gSlug, by[sSlug]);
  for (const g of d.genres) if (!pick.has(g.slug)) { const first = (cand.get(g.slug) || [])[0]; if (first) pick.set(g.slug, first); }
  return pick;
}

export const getCatalog = cache(async (): Promise<Catalog> => {
  const d = await getContent();
  const by = Object.fromEntries(d.series.map((s) => [s.slug, s]));
  const hasViews = d.settings.viewsSource !== "none";
  const byRank = hasViews
    ? (a: Series, b: Series) => (b.views || 0) - (a.views || 0) || a.slug.localeCompare(b.slug)
    : (a: Series, b: Series) => b.eps - a.eps || a.slug.localeCompare(b.slug);
  const top10 = [...d.series].sort(byRank).slice(0, 10);
  const openTags = computeOpenTags(d);
  const castMap = new Map<string, Series[]>();
  for (const s of d.series) for (const c of s.cast) { if (!castMap.has(c)) castMap.set(c, []); castMap.get(c)!.push(s); }
  const castPages = [...castMap.entries()].map(([name, items]) => ({ name, items })).filter((c) => c.items.length >= 2);
  const genreLabel = (slug: string) => d.genres.find((g) => g.slug === slug)?.label || slug;
  return {
    ...d,
    by,
    hasViews,
    genreLabel,
    seriesOfGenre: (g) => d.series.filter((s) => s.genres.includes(g)),
    top10,
    rankBasisText: hasViews ? "เรียงตามยอดวิวสะสมในคลัง" : "เรียงตามจำนวนตอนจากมากไปน้อย",
    openTags,
    openTagsOf: (s) => openTags.filter((t) => t.items.includes(s.slug)),
    genreCover: genreCovers(d, by),
    castPages,
    hasCastPage: (name) => castPages.some((c) => c.name === name),
    similar: (s, n = 6) => {
      const score = (x: Series) => x.genres.filter((g) => s.genres.includes(g)).length * 10 + x.tropes.filter((t) => s.tropes.includes(t)).length;
      return d.series.filter((x) => x.slug !== s.slug).map((x) => [x, score(x)] as const)
        .sort((a, b) => b[1] - a[1] || (b[0].views || 0) - (a[0].views || 0) || a[0].slug.localeCompare(b[0].slug))
        .slice(0, n).map((x) => x[0]);
    },
    isDaily: (s) => s.day === "daily",
    isAiring: (s) => !!s.day,
  };
});

/* ---------- ตัวเลือกไฟล์ปก (ADR-001 §13.5): ที่วางประกาศ "ทรง" ไม่ใช่ชื่อฟิลด์ ---------- */
export type Shape = "poster" | "wide" | "auto";
export function coverSlot(s: Series, shape: Shape = "poster"): CoverFile & { wide: boolean } {
  const wantWide = shape === "wide" || (shape === "auto" && s.orientation === "horizontal");
  if (wantWide && s.coverWide) return { ...s.coverWide, wide: true };
  return { ...s.cover, wide: false };
}
