import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function SettingsPage() {
  const u = await getSession();
  if (u?.role !== "admin") redirect("/admin/");
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  return (
    <>
      <h1>ตั้งค่าเว็บ / SEO</h1>
      <p className="sub">ค่าทั้งหมดมีผลทันทีกับ canonical · Open Graph · sitemap.xml · robots.txt ไม่ต้อง deploy ใหม่</p>
      <SettingsForm initial={{ siteName: s?.siteName || "AiLakorn", siteOrigin: s?.siteOrigin || "", indexing: s?.indexing ?? false, freeLine: s?.freeLine || "" }} />
    </>
  );
}
