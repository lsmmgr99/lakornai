import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section, SampleNote, JsonLd } from "@/components/Layout";
import { RankCard, SeriesRow, DoneBadge, NewBadge } from "@/components/Cards";

/* A7 ยอดนิยม — ถ้อยคำสามจุดที่ Google เห็น (title · description · JSON-LD) ต้องบอกเกณฑ์ที่ใช้จริง
   ไม่ใช่ "คนดูมากที่สุดในสัปดาห์นี้" ซึ่งเป็นการอ้างการวัดที่ไม่มีอยู่ (V13) */
const TOP10_LABEL = "TOP 10 ในคลัง";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getCatalog();
  return pageMetadata({
    url: U.popular,
    title: `${TOP10_LABEL} ละครสั้น AI ดูฟรีทุกตอน · AiLakorn`,
    desc: c.hasViews
      ? "อันดับละครสั้น AI ภาษาไทย 10 อันดับจากยอดวิวสะสมในคลัง พร้อมจำนวนตอนและสถานะออกตอน ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก"
      : `สิบเรื่องแรกของคลังละครสั้น AI ภาษาไทย ${c.rankBasisText} ยังไม่ได้ต่อระบบวัดจำนวนผู้ชม ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
  });
}

export default async function PopularPage() {
  const c = await getCatalog();
  const top3 = c.top10.slice(0, 3), rest = c.top10.slice(3);
  return (
    <Shell c={c} active="popular">
      <JsonLd data={collectionLd(c, {
        url: U.popular, name: `ยอดนิยม ${TOP10_LABEL}`,
        description: `สิบเรื่องแรกของคลังละครสั้น AI ภาษาไทย ${c.rankBasisText}`, items: c.top10,
      })} />
      <PageHead h1={`ยอดนิยม ${TOP10_LABEL}`} sub={c.rankBasisText} />
      <div className="top3row">{top3.map((s, i) => <RankCard key={s.slug} s={s} c={c} n={i + 1} />)}</div>
      <SampleNote>{c.hasViews ? "ยอดวิวและอันดับเป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง" : `ยังไม่ได้ต่อระบบวัดจำนวนผู้ชม — ลำดับในหน้านี้${c.rankBasisText}`}</SampleNote>
      <Section title="อันดับ 4–10">
        <div className="list">
          {rest.map((s, i) => (
            <SeriesRow key={s.slug} s={s} c={c} rank={i + 4} badge={s.ended ? <DoneBadge /> : <NewBadge />}
              meta={`${c.hasViews && s.views != null ? `${s.views} วิว · ` : ""}${s.eps} ตอน · ${s.genres.map(c.genreLabel).join(" · ")}`} />
          ))}
        </div>
      </Section>
    </Shell>
  );
}
