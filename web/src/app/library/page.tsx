import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead } from "@/components/Layout";
import { Library } from "@/components/client/Library";

/* C1 คลังของฉัน — เนื้อหาส่วนตัวอ่านจากเครื่องผู้ใช้ ⇒ noindex (AIO-19 C-04) */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.library,
    title: "คลังของฉัน — ดูต่อ ติดตาม ดูจบแล้ว · AiLakorn",
    desc: "ตอนที่ดูค้างไว้ เรื่องที่ติดตาม เรื่องที่ดูจบแล้ว และประวัติการดู รวมอยู่ที่เดียว ข้อมูลเก็บในเครื่องนี้ ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน",
    noindex: true,
  });
}

export default async function LibraryPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} nav="library" active="library">
      <PageHead h1="คลังของฉัน" />
      <Library />
    </Shell>
  );
}
