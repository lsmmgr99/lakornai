import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, collectionLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, JsonLd } from "@/components/Layout";
import { CoverImg } from "@/components/CoverImg";
import { Icon } from "@/components/Icon";

/* A10 ดัชนี — รายชื่อแบบแบนของทุกเรื่อง เรียงตามตัวอักษรไทย */
export async function generateMetadata(): Promise<Metadata> {
  const c = await getCatalog();
  return pageMetadata({
    url: U.az,
    title: "ดัชนีละครสั้น AI ทุกเรื่อง ก–ฮ / A–Z · AiLakorn",
    desc: `รายชื่อละครสั้น AI ภาษาไทยทั้ง ${c.series.length} เรื่องในคลัง AiLakorn เรียงตามตัวอักษร พร้อมแนว จำนวนตอน และสถานะออกตอน ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
  });
}

export default async function AzPage() {
  const c = await getCatalog();
  const sorted = [...c.series].sort((a, b) => a.title.localeCompare(b.title, "th"));
  return (
    <Shell c={c} active="browse">
      <JsonLd data={collectionLd(c, { url: U.az, name: "ดัชนีทุกเรื่อง", description: "รายชื่อทุกเรื่องในคลัง", items: sorted })} />
      <PageHead h1="ดัชนีทุกเรื่อง" sub={`รายชื่อแบบแบนของทั้ง ${c.series.length} เรื่อง`} />
      <div className="flatlist">
        {sorted.map((s) => (
          <Link key={s.slug} href={U.series(s.slug)}>
            <span className="th2"><CoverImg s={s} sizes="34px" /></span>
            <span className="t">{s.title}</span>
            <span className="m">{s.genres.map(c.genreLabel).join(" · ")} · {s.eps} ตอน · {s.status}</span>
            <Icon name="right" cls="sm" />
          </Link>
        ))}
      </div>
    </Shell>
  );
}
