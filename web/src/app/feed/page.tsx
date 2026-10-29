import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Header, BottomNav, Empty, JsonLd } from "@/components/Layout";
import { Feed } from "@/components/client/Feed";

/* A2 ฟีดแนวตั้ง — ADR-001 §13.7 D8 ฉบับกลับทาง (AIO-58): ฟีดมีทุกเรื่อง ห้ามมีตัวกรองทิศที่ใดในเส้นทางนี้
   เรื่องแรกที่ฟีดเปิด = top10[0] ตรง ๆ ไม่ว่าทิศไหน · ฝั่งเบราว์เซอร์ (Feed.tsx) เขียน data-orientation ทับทุกครั้งที่สลับเรื่อง */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.feed,
    title: "ฟีดแนวตั้ง — ละครสั้น AI ปัดดูทีละเรื่อง · AiLakorn",
    desc: "ปัดขึ้นดูละครสั้น AI ภาษาไทยทีละเรื่อง ไม่ต้องเลือกเอง เริ่มจากตอนแรกของทุกเรื่อง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เจอเรื่องที่ชอบแล้วกดดูทั้งเรื่องต่อได้ทันที",
  });
}

export default async function FeedPage() {
  const c = await getCatalog();
  const first = c.top10[0];
  return (
    <div className="stage">
      <Header active="feed" />
      <main id="main" className="stage">
        <JsonLd data={collectionLd(c, {
          url: U.feed, name: "ฟีดแนวตั้ง",
          /* รายชื่อใน structured data = ทั้งคลัง เพราะฟีดพาไปได้ทุกเรื่อง */
          description: "ตอนแรกของทุกเรื่องในคลัง เรียงให้ปัดดูต่อเนื่อง", items: c.series,
        })} />
        <h1 className="sr">ฟีดแนวตั้ง — ละครสั้น AI ดูทีละเรื่อง</h1>
        {first
          ? <Feed firstSlug={first.slug} />
          : <div className="wrap"><Empty icon="feed" h="คลังยังไม่มีเรื่อง" p="ฟีดจะเริ่มเล่นทันทีเมื่อมีเรื่องแรกในคลัง" btn={["กลับหน้าแรก", U.home]} /></div>}
      </main>
      <BottomNav active="feed" />
    </div>
  );
}
