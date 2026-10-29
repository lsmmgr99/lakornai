import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd, breadcrumbLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section, JsonLd } from "@/components/Layout";
import { GenreBento } from "@/components/GenreBento";
import { Icon } from "@/components/Icon";

/* A6 ฮับเลือกดู — ทางเข้ารวมของทุกหมวด แท็ก และดัชนี */
const TOP10_LABEL = "TOP 10 ในคลัง";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.browse,
    title: "เลือกดูละครสั้น AI — ทุกหมวด แท็ก และดัชนี · AiLakorn",
    desc: "ทางเข้ารวมของคลัง AiLakorn เลือกจาก 6 แนวหลัก แท็กเรื่อง อันดับยอดนิยม ตอนใหม่ล่าสุด ตารางออกตอน และดัชนี ก–ฮ ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก",
  });
}

export default async function BrowsePage() {
  const c = await getCatalog();
  const entries: [string, string, string, string][] = [
    ["chart", TOP10_LABEL, c.rankBasisText, U.popular],
    ["sparkle", "ตอนใหม่ล่าสุด", "ตอนที่เพิ่งปล่อย", U.newEp],
    ["calendar", "ตารางออกตอน", "เรื่องไหนออกวันไหน", U.schedule],
    ["list", "ดัชนี ก–ฮ / A–Z", `ทุกเรื่องในคลัง ${c.series.length} เรื่อง`, U.az],
  ];
  return (
    <Shell c={c} active="browse">
      <JsonLd data={[
        collectionLd(c, { url: U.browse, name: "เลือกดู", description: "ทางเข้ารวมของทุกหมวดและดัชนีในคลัง", items: c.series }),
        breadcrumbLd(c, [["หน้าแรก", U.home], ["เลือกดู", U.browse]]),
      ]} />
      <PageHead h1="เลือกดู" sub="ทางเข้ารวมของทุกหมวด แท็ก และดัชนีในคลัง" />
      <Section title="6 แนวหลัก"><GenreBento c={c} /></Section>
      {c.openTags.length > 0 && (
        <Section title="แท็กที่เปิดแล้ว" sub="เปิดเฉพาะแท็กที่มีเรื่อง 3 เรื่องขึ้นไป และไม่ซ้ำกับหมวดที่มีอยู่แล้ว — แท็กจะเพิ่มขึ้นตามคลัง">
          <div className="chip-row">
            {c.openTags.map((t) => <Link key={t.slug} className="chip" href={U.tag(t.slug)}>{t.chip}<span className="n num">{t.items.length}</span></Link>)}
          </div>
        </Section>
      )}
      <Section title="ทางเข้าอื่น">
        <div className="rowlist">
          {entries.map(([i, t, s, u]) => (
            <Link key={u} href={u}><span className="ic"><Icon name={i} /></span><span>{t}<span className="sub">{s}</span></span><span className="ch"><Icon name="right" cls="sm" /></span></Link>
          ))}
        </div>
      </Section>
    </Shell>
  );
}
