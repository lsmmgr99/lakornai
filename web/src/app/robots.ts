import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/content";

/* ปิดดัชนีเป็นค่าตั้งต้น (รอบทดสอบ) · เปิดจากหน้าตั้งค่าของหลังบ้าน ไม่ต้อง deploy ใหม่ */
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { settings } = await getCatalog();
  if (!settings.indexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/library/", "/settings/", "/notifications/", "/welcome/", "/admin/", "/api/", "/offline/", "/404/"] },
    sitemap: `${settings.siteOrigin}/sitemap.xml`,
    host: settings.siteOrigin,
  };
}
