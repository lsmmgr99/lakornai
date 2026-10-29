import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section, JsonLd } from "@/components/Layout";
import { Card, SeriesRow, NewBadge } from "@/components/Cards";

/* A9 ตารางออกตอน — ออกทุกวัน / รายสัปดาห์ / จบแล้ว */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.schedule,
    title: "ตารางออกตอน — ละครสั้น AI เรื่องไหนออกวันไหน · AiLakorn",
    desc: "ตารางออกตอนของละครสั้น AI ภาษาไทยทุกเรื่องในคลัง เรื่องไหนปล่อยตอนใหม่ทุกวัน เรื่องไหนรายสัปดาห์และกี่โมง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก",
  });
}

export default async function SchedulePage() {
  const c = await getCatalog();
  const daily = c.series.filter(c.isDaily);
  const weekly = c.series.filter((s) => c.isAiring(s) && !c.isDaily(s));
  const ended = c.series.filter((s) => !c.isAiring(s));
  const meta = (s: (typeof c.series)[number]) => `${s.airtime} · ${s.eps} ตอน · ${s.genres.map(c.genreLabel).join(" · ")}`;
  return (
    <Shell c={c} active="browse">
      <JsonLd data={collectionLd(c, { url: U.schedule, name: "ตารางออกตอน", description: "รอบปล่อยตอนใหม่ของทุกเรื่องในคลัง", items: [...daily, ...weekly] })} />
      <PageHead h1="ตารางออกตอน" sub="เรื่องไหนปล่อยตอนใหม่วันไหน เวลาเท่าไร" />
      <Section title="ออกทุกวัน" sub={`${daily.length} เรื่องที่ปล่อยตอนใหม่ทุกวัน`}>
        <div className="list">{daily.map((s) => <SeriesRow key={s.slug} s={s} c={c} badge={<NewBadge />} meta={meta(s)} />)}</div>
      </Section>
      <Section title="ออกรายสัปดาห์">
        <div className="list">{weekly.map((s) => <SeriesRow key={s.slug} s={s} c={c} meta={meta(s)} />)}</div>
      </Section>
      <Section title="จบแล้ว ไม่มีตอนใหม่">
        <div className="grid">{ended.map((s) => <Card key={s.slug} s={s} c={c} />)}</div>
      </Section>
    </Shell>
  );
}
