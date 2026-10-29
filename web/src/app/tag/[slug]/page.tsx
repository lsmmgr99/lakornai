import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, type Catalog, type OpenTag } from "@/lib/content";
import { pageMetadata, collectionLd, breadcrumbLd, fit } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Crumbs, Empty, JsonLd } from "@/components/Layout";
import { Card } from "@/components/Cards";

export const dynamicParams = true;

/* A5 หน้าแท็ก — กฎตัดเดียวกับ onpage-audit §5.2: เลือกแบบแรกที่ยังไม่เกินเกณฑ์ความยาว
   facet ที่ไม่ใช่ trope ใช้เทมเพลตคำโปรยคนละแบบ (CEO 23 ต.ค. 2026 · AIO-34) */
function tagSeo(c: Catalog, t: OpenTag) {
  const items = t.items.map((k) => c.by[k]).filter(Boolean);
  const names = items.map((s) => s.title);
  /* ประโยคนำยังใช้ `label` ⇒ เลขเกณฑ์ (≤20 / ≥45) ยังอยู่ในเนื้อหน้าตามคำตัดสินของ CEO */
  const intro = `แท็ก “${t.label}” เป็นชั้นที่สองซ้อนบน 6 แนวหลัก รวม ${items.length} ${t.lead} `
    + `ได้แก่ ${names.join(" · ")} — ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`;
  const title = fit(60,
    `${t.label} — ละครสั้น AI ${items.length} เรื่อง ดูฟรี · AiLakorn`,
    `${t.label} — ละครสั้น AI ${items.length} เรื่อง · AiLakorn`);
  const desc = t.kind === "trope"
    ? fit(160,
        `รวมละครสั้น AI ภาษาไทยแท็ก ${t.label} ${items.length} เรื่อง ${names.join(" ")} ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
        `รวมละครสั้น AI ภาษาไทยแท็ก ${t.label} ${items.length} เรื่อง ${names.join(" ")} ดูฟรีทุกตอน`)
    : fit(160,
        `${t.lead} — ละครสั้น AI ${items.length} เรื่อง ${names.join(" ")} ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
        `${t.lead} — ละครสั้น AI ${items.length} เรื่อง ${names.join(" ")} ดูฟรีทุกตอน`,
        `${t.lead} — ละครสั้น AI ${items.length} เรื่อง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`);
  return { items, intro, title, desc };
}

export async function generateStaticParams() {
  const c = await getCatalog();
  return c.openTags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCatalog();
  const t = c.openTags.find((x) => x.slug === slug);
  if (!t) return {};
  const { title, desc } = tagSeo(c, t);
  return pageMetadata({ url: U.tag(slug), title, desc });
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCatalog();
  const t = c.openTags.find((x) => x.slug === slug);
  if (!t) notFound();
  const { items, intro } = tagSeo(c, t);
  return (
    <Shell c={c} active="browse">
      <JsonLd data={[
        collectionLd(c, { url: U.tag(slug), name: t.label, description: intro, items }),
        breadcrumbLd(c, [["หน้าแรก", U.home], ["เลือกดู", U.browse], [t.label, U.tag(slug)]]),
      ]} />
      <Crumbs items={[["หน้าแรก", U.home], ["เลือกดู", U.browse], [t.label, null]]} />
      <PageHead h1={`แท็ก: ${t.label}`} />
      <p className="lead">{intro}</p>
      <p className="res-count"><b className="num">{items.length}</b> เรื่อง</p>
      {items.length
        ? <div className="grid">{items.map((s) => <Card key={s.slug} s={s} c={c} hook />)}</div>
        : <Empty icon="grid" h="แนวนี้ยังไม่มีเรื่อง" p="เรากำลังสร้างเรื่องใหม่ในแนวนี้อยู่ ระหว่างนี้ลองดูแนวที่ใกล้เคียงกัน" btn={["ดูทุกแนว", U.browse]} />}
    </Shell>
  );
}
