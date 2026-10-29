/* SEO ของหน้าบ้าน — metadata ของ Next + structured data · กฎเดิมของเว็บ static ยังอยู่ครบ:
   canonical/og/twitter ทุกหน้า · title ≤60 · description ≤160 · ห้าม VideoObject เมื่อไม่มีคลิป
   · ห้ามยอดวิว/คะแนนใน JSON-LD ขณะ viewsSource = none · หน้าส่วนตัว noindex */
import type { Metadata } from "next";
import { getCatalog, coverSlot, iso8601, type Series, type Catalog } from "./content";
import { U } from "./urls";

export const SITE_NAME = "AiLakorn";
export const DEFAULT_OG = { url: "/og-default.jpg", w: 1200, h: 630 };

export interface PageSeo {
  url: string;
  title: string;
  desc: string;
  noindex?: boolean;
  og?: { type?: "website" | "video.tv_show" | "video.episode"; title?: string; description?: string; image?: { url: string; w: number; h: number }; imageAlt?: string };
}

export function fit(max: number, ...variants: string[]) {
  return variants.find((v) => v.length <= max) || variants[variants.length - 1];
}

export async function pageMetadata(p: PageSeo): Promise<Metadata> {
  const { settings } = await getCatalog();
  const origin = settings.siteOrigin;
  const abs = (u: string) => origin + u;
  const img = p.og?.image || DEFAULT_OG;
  const robots = p.noindex ? { index: false, follow: true } : { index: true, follow: true };
  return {
    metadataBase: new URL(origin),
    title: p.title,
    description: p.desc,
    alternates: { canonical: abs(p.url) },
    robots,
    openGraph: {
      type: p.og?.type === "video.episode" ? "video.episode" : p.og?.type === "video.tv_show" ? "video.tv_show" : "website",
      siteName: settings.siteName,
      locale: "th_TH",
      url: abs(p.url),
      title: p.og?.title || p.title,
      description: p.og?.description || p.desc,
      images: [{ url: abs(img.url), width: img.w, height: img.h, alt: p.og?.imageAlt || p.title }],
    },
    twitter: { card: "summary_large_image", title: p.og?.title || p.title, description: p.og?.description || p.desc, images: [abs(img.url)] },
  };
}

/* ---------- JSON-LD ---------- */
type Ld = Record<string, unknown>;
export function ldOrg(c: Catalog): Ld {
  return { "@type": "Organization", name: c.settings.siteName, url: c.settings.siteOrigin + "/" };
}
export function breadcrumbLd(c: Catalog, items: [string, string][]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: c.settings.siteOrigin + url })),
  };
}
export function websiteLd(c: Catalog): Ld {
  const abs = (u: string) => c.settings.siteOrigin + u;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/") + "#website",
    url: abs("/"),
    name: c.settings.siteName,
    inLanguage: "th",
    publisher: ldOrg(c),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: abs("/search/?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}
export function tvSeriesLd(c: Catalog, s: Series): Ld {
  const abs = (u: string) => c.settings.siteOrigin + u;
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "@id": abs(U.series(s.slug)) + "#series",
    url: abs(U.series(s.slug)),
    name: s.title,
    inLanguage: "th",
    description: s.synopsis,
    abstract: s.hook,
    image: abs(coverSlot(s).url),
    genre: s.genres.map(c.genreLabel),
    numberOfEpisodes: s.eps,
    numberOfSeasons: 1,
    isAccessibleForFree: true,
    character: s.cast.map((name) => ({ "@type": "Person", name })),
    containsSeason: { "@type": "TVSeason", "@id": abs(U.series(s.slug)) + "#season-1", seasonNumber: 1, numberOfEpisodes: s.eps },
    productionCompany: ldOrg(c),
    publisher: ldOrg(c),
  };
}
export function tvEpisodeLd(c: Catalog, s: Series, n: number): Ld {
  const abs = (u: string) => c.settings.siteOrigin + u;
  const e = s.episodes[n - 1];
  return {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    "@id": abs(U.watch(s.slug, n)) + "#episode",
    url: abs(U.watch(s.slug, n)),
    name: e.title,
    alternateName: `EP.${n} ${e.title}`,
    episodeNumber: n,
    inLanguage: "th",
    timeRequired: iso8601(e.durationSec),
    image: abs(coverSlot(s).url),
    isAccessibleForFree: true,
    partOfSeries: { "@type": "TVSeries", "@id": abs(U.series(s.slug)) + "#series", name: s.title, url: abs(U.series(s.slug)), numberOfEpisodes: s.eps },
    partOfSeason: { "@type": "TVSeason", "@id": abs(U.series(s.slug)) + "#season-1", seasonNumber: 1 },
    publisher: ldOrg(c),
  };
}
export function collectionLd(c: Catalog, { url, name, description, items }: { url: string; name: string; description: string; items: Series[] }): Ld {
  const abs = (u: string) => c.settings.siteOrigin + u;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": abs(url) + "#page",
    url: abs(url),
    name, description, inLanguage: "th",
    isPartOf: { "@type": "WebSite", "@id": abs("/") + "#website" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((s, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "TVSeries", "@id": abs(U.series(s.slug)) + "#series", name: s.title, url: abs(U.series(s.slug)), image: abs(coverSlot(s).url), numberOfEpisodes: s.eps, isAccessibleForFree: true },
      })),
    },
  };
}
export function faqLd(items: [string, string][]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/* ---------- title/description ของหน้าเรื่อง/ตอน (กฎตัดของ onpage-audit §5.2/§5.3) ---------- */
export function seriesTitle(s: Series) {
  return fit(60, `${s.title} — ละครสั้น AI ${s.eps} ตอน ดูฟรี · ${SITE_NAME}`, `${s.title} — ละครสั้น AI ${s.eps} ตอน · ${SITE_NAME}`);
}
export function seriesDesc(s: Series) {
  return fit(160,
    `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ${s.status} ฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
    `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ${s.status} ฟรีทุกตอน`,
    `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ฟรีทุกตอน`);
}
export function watchTitle(s: Series, n: number) {
  const e = s.episodes[n - 1];
  return fit(60, `${s.title} EP.${n} ${e.title} · ${SITE_NAME}`, `${s.title} EP.${n} ${e.title}`);
}
export function watchDesc(s: Series, n: number) {
  const e = s.episodes[n - 1];
  return `ดู ${s.title} ตอนที่ ${n} ${e.title} (${e.mmss} นาที) ละครสั้น AI ภาษาไทย ฟรีทุกตอน ไม่ต้องสมัครสมาชิก ดูจบแล้วกดตอนถัดไปได้ทันที`;
}
