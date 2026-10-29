import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/content";
import { pageMetadata, breadcrumbLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, Crumbs, SampleNote, JsonLd } from "@/components/Layout";
import { Card } from "@/components/Cards";

export const dynamicParams = true;

/* B6 ตัวละคร — หนึ่งหน้าต่อชื่อที่ปรากฏ ≥2 เรื่อง · พารามิเตอร์ใน URL เป็นชื่อไทยแบบ encode ⇒ decode ก่อนหา */
const decode = (raw: string) => { try { return decodeURIComponent(raw); } catch { return raw; } };

export async function generateStaticParams() {
  const c = await getCatalog();
  /* คืนชื่อจริง — Next encode ลง URL เอง */
  return c.castPages.map((p) => ({ name: p.name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const name = decode((await params).name);
  const c = await getCatalog();
  const p = c.castPages.find((x) => x.name === name);
  if (!p) return {};
  return pageMetadata({
    url: U.cast(p.name),
    title: `${p.name} — ตัวละครในละครสั้น AI ${p.items.length} เรื่อง · AiLakorn`,
    desc: `${p.name} เป็นตัวละครใน ${p.items.map((s) => s.title).join(" · ")} ละครสั้น AI ภาษาไทยของ AiLakorn ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
  });
}

export default async function CastPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decode((await params).name);
  const c = await getCatalog();
  const p = c.castPages.find((x) => x.name === name);
  if (!p) notFound();
  return (
    <Shell c={c}>
      <JsonLd data={breadcrumbLd(c, [["หน้าแรก", U.home], ["ตัวละคร", U.az], [p.name, U.cast(p.name)]])} />
      <Crumbs items={[["หน้าแรก", U.home], ["ตัวละคร", U.az], [p.name, null]]} />
      <div className="cast-head">
        <span className="avatar" aria-hidden="true">{p.name[0]}</span>
        <div><h1>{p.name}</h1><p>ปรากฏใน {p.items.length} เรื่อง</p></div>
      </div>
      <div className="grid">{p.items.map((s) => <Card key={s.slug} s={s} c={c} hook />)}</div>
      <SampleNote>หน้านี้ใช้ avatar ตัวอักษร เพราะข้อมูลตัวละครเก็บเป็นชื่อล้วน ยังไม่มีรูปประกอบตัวละคร</SampleNote>
    </Shell>
  );
}
