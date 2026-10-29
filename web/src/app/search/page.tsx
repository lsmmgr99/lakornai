import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Empty, JsonLd } from "@/components/Layout";
import { Card } from "@/components/Cards";
import { Search } from "@/components/client/Search";

/* A3 ค้นหา — ผลลัพธ์ทั้งคลังอยู่ใน HTML (SEO) · ฝั่งเบราว์เซอร์กรองทับเมื่อพิมพ์/เลือกแนว
   `?q=` อ่านฝั่งเบราว์เซอร์เท่านั้น (หน้ายังเป็น static) */
const POPULAR = ["ทุเรียน", "ประธาน", "ย้อนเวลา", "ผี", "แก้แค้น", "นางร้าย", "มาเฟีย"];

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.search,
    title: "ค้นหาละครสั้น AI — ตามชื่อเรื่อง ตัวละคร แนว · AiLakorn",
    desc: "ค้นหาละครสั้น AI ภาษาไทยจากชื่อเรื่อง ชื่อตัวละคร หรือกรองตาม 6 แนว ละครแนวตั้ง ผลไม้ ฝรั่ง สยองขวัญ ย้อนเวลา แก้แค้น ทุกเรื่องดูฟรีทุกตอน",
  });
}

export default async function SearchPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} nav="search" active="search">
      <JsonLd data={collectionLd(c, { url: U.search, name: "ค้นหาละครสั้น AI", description: "ทุกเรื่องในคลัง AiLakorn", items: c.series })} />
      <PageHead h1="ค้นหาละครสั้น AI" />
      <Search
        genres={c.genres.map((g) => ({ slug: g.slug, label: g.label }))}
        popular={POPULAR}
        noRes={<Empty icon="search" h="ไม่พบเรื่องที่ตรงกับคำค้น" p={`ลองคำอื่น หรือเลือกจากแนวด้านบน — คลังของเรามี ${c.series.length} เรื่อง`} btn={["ดูทุกเรื่องในคลัง", U.az]} />}
      >
        <div className="grid" id="results">{c.series.map((s) => <Card key={s.slug} s={s} c={c} hook />)}</div>
      </Search>
    </Shell>
  );
}
