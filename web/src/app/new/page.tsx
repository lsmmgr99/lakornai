import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section, JsonLd } from "@/components/Layout";
import { Card, EpRow } from "@/components/Cards";
import { GenreFilterChips } from "@/components/client/HomeBits";

/* A8 ตอนใหม่ — ตอนล่าสุดของทุกเรื่องที่ยังออกตอนอยู่ · ชิปกรองแนวซ่อน/โชว์แถวฝั่งเบราว์เซอร์ (ลิงก์ยังอยู่ครบใน HTML) */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.newEp,
    title: "ตอนใหม่ล่าสุด — ละครสั้น AI อัปเดตทุกวัน · AiLakorn",
    desc: "ตอนใหม่ของละครสั้น AI ภาษาไทยที่เพิ่งลง เรียงจากใหม่สุด กรองตามแนวได้ ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก กดเข้าดูได้ทันทีไม่ต้องรอ",
  });
}

export default async function NewPage() {
  const c = await getCatalog();
  const airing = c.series.filter((s) => !s.ended);
  const ended = c.series.filter((s) => s.ended);
  return (
    <Shell c={c} active="new">
      <JsonLd data={collectionLd(c, { url: U.newEp, name: "ตอนใหม่ล่าสุด", description: "ตอนล่าสุดของทุกเรื่องที่ยังออกตอนอยู่", items: airing })} />
      <PageHead h1="ตอนใหม่ล่าสุด" sub="ตอนล่าสุดของทุกเรื่องที่ยังออกตอนอยู่" />
      <GenreFilterChips genres={c.genres.map((g) => ({ slug: g.slug, label: g.label }))} />
      <div className="list two" id="newList">{airing.map((s) => <EpRow key={s.slug} s={s} c={c} n={s.eps} isNew />)}</div>
      <p className="empty-inline" id="newEmpty" hidden>ไม่มีตอนใหม่ในแนวนี้</p>
      <Section title="เรื่องที่จบแล้ว ดูรวดเดียวจบ">
        <div className="grid">{ended.map((s) => <Card key={s.slug} s={s} c={c} />)}</div>
      </Section>
    </Shell>
  );
}
