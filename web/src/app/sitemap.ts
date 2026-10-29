import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/content";
import { U } from "@/lib/urls";

/* sitemap = หน้าที่เปิดดัชนีเท่านั้น (เหมือนรุ่น static): หน้าหลัก · แนว · แท็ก · เรื่อง · ตอนแรกของแต่ละเรื่อง
   ตอน 2+ noindex จนกว่าจะมีชื่อตอน/คำบรรยายที่ไม่ซ้ำ (AIO-19 S1b) · ไม่มี lastmod ที่เดา — ใช้ updatedAt ของเรื่องจริง */
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getCatalog();
  const abs = (u: string) => c.settings.siteOrigin + u;
  const out: MetadataRoute.Sitemap = [
    { url: abs(U.home), changeFrequency: "daily", priority: 1 },
    ...[U.feed, U.search, U.browse, U.newEp, U.popular, U.schedule, U.az, U.about, U.contact, U.help, U.behind, U.legal("terms"), U.legal("privacy"), U.legal("cookies")]
      .map((u) => ({ url: abs(u), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...c.genres.map((g) => ({ url: abs(U.genre(g.slug)), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...c.openTags.map((t) => ({ url: abs(U.tag(t.slug)), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...c.castPages.map((p) => ({ url: abs(U.cast(p.name)), changeFrequency: "monthly" as const, priority: 0.3 })),
    ...c.series.flatMap((s) => [
      { url: abs(U.series(s.slug)), lastModified: new Date(s.updatedAt), changeFrequency: (s.ended ? "monthly" : "daily") as "monthly" | "daily", priority: 0.9 },
      { url: abs(U.watch(s.slug, 1)), lastModified: new Date(s.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 },
    ]),
  ];
  return out;
}
