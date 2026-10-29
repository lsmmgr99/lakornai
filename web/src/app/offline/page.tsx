import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, Empty } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { ContinueRail } from "@/components/client/HomeBits";
import { RetryButton } from "@/components/client/RetryButton";

/* F2 ออฟไลน์ — noindex · แถบ "ดูต่อ" อ่านจากเครื่อง จึงเห็นได้แม้เน็ตหลุด (keepEmpty = โชว์สถานะว่างเสมอ) */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.offline,
    title: "อินเทอร์เน็ตหลุด — ลองเชื่อมต่อใหม่ · AiLakorn",
    desc: "ตอนนี้เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่ รายการเรื่องที่ดูค้างไว้ยังอ่านได้จากเบราว์เซอร์เครื่องนี้",
    noindex: true,
  });
}

export default async function OfflinePage() {
  const c = await getCatalog();
  return (
    <Shell c={c}>
      <div className="sys">
        <div className="sysico"><Icon name="wifioff" cls="lg" /></div>
        <h1>อินเทอร์เน็ตหลุด</h1>
        <p>ตรวจสอบการเชื่อมต่อแล้วลองใหม่ — เรื่องที่ดูค้างไว้ยังเปิดดูรายการได้จากเครื่องของคุณ</p>
        <RetryButton />
      </div>
      <ContinueRail sub="รายการนี้อ่านจากเครื่องของคุณ จึงยังเห็นได้แม้เน็ตหลุด" moreLink={false}         keepEmpty
        title="เรื่องที่ดูค้างไว้ (จากเครื่องนี้)"
        emptyState={<Empty icon="playf" h="ยังไม่มีเรื่องที่ดูค้าง" p="เมื่อกลับมาออนไลน์ ลองเริ่มดูสักตอนแล้วเว็บจะจำให้เอง" btn={["กลับหน้าแรก", U.home]} />}
      />
    </Shell>
  );
}
