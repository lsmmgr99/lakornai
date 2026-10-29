import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead } from "@/components/Layout";
import { Notifications } from "@/components/client/Notifications";

/* D2 แจ้งเตือน — หน้าส่วนตัว ⇒ noindex */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.notifications,
    title: "การแจ้งเตือนตอนใหม่ของเรื่องที่ติดตาม · AiLakorn",
    desc: "ตอนใหม่ของเรื่องที่คุณกดติดตามไว้ รวมอยู่ที่นี่ รายการอ่านจากรายการติดตามในเบราว์เซอร์เครื่องนี้ ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน",
    noindex: true,
  });
}

export default async function NotificationsPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} back={["การแจ้งเตือน", U.home]} narrow>
      <PageHead h1="การแจ้งเตือน" />
      <Notifications />
    </Shell>
  );
}
