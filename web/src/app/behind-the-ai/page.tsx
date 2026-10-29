import type { Metadata } from "next";
import { getCatalog, coverSlot } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section, JsonLd } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { Card, AiBadge } from "@/components/Cards";

/* G7 เบื้องหลัง AI — หน้าเดียวที่ส่งลิงก์ครบทุกเรื่อง · ภาพใน JSON-LD มาจาก coverSlot (ADR-001 §13.5) */
export async function generateMetadata(): Promise<Metadata> {
  const c = await getCatalog();
  const n = c.series.length;
  return pageMetadata({
    url: U.behind,
    title: `เบื้องหลังการสร้างด้วย AI — ปกละคร ${n} เรื่อง · AiLakorn`,
    desc: `ดูเบื้องหลังการสร้างละครสั้น AI ของ AiLakorn ภาพปกทั้ง ${n} เรื่องพร้อมแนวทางที่ใช้สร้างจริง และขั้นตอนจากบทถึงตอนที่ได้ดู`,
  });
}

export default async function BehindPage() {
  const c = await getCatalog();
  const abs = (u: string) => c.settings.siteOrigin + u;
  const n = c.series.length;
  return (
    <Shell c={c}>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "CollectionPage", url: abs(U.behind),
        name: "เบื้องหลังการสร้างด้วย AI", inLanguage: "th",
        hasPart: c.series.map((s) => {
          const cs = coverSlot(s, "poster");
          return { "@type": "ImageObject", contentUrl: abs(cs.url), name: `ปก ${s.title}`, width: cs.w, height: cs.h };
        }),
      }} />
      <PageHead h1="เบื้องหลังการสร้างด้วย AI" sub={`ปกทั้ง ${n} ใบของเราสร้างด้วย AI จากคำสั่งภาษาไทย–อังกฤษที่ทีมเขียนเอง`} />
      <div className="bento">
        <div className="btile flat"><h3>เขียนโครงเรื่องแบบไทย</h3>
          <p>ทีมคนไทยวางพล็อต แก้แค้น ซ่อนตัวตน ข้ามภพ ให้จบใน 3 นาทีต่อตอน</p></div>
        <div className="btile flat"><h3>สร้างปกด้วย AI</h3>
          <p>เขียนคำสั่งระบุแสง มุมกล้อง และอารมณ์ แล้วคัดจากหลายร้อยภาพเหลือใบเดียว</p></div>
      </div>
      <Section title={`ปกทั้ง ${n} ใบ`}>
        <div className="grid">
          {c.series.map((s) => <Card key={s.slug} s={s} c={c} badges={<AiBadge />} showViews={false} alt={`ปก ${s.title} — ละครสั้น AI ${c.genreLabel(s.genres[0])}`} />)}
        </div>
      </Section>
      <div className="perm neutral"><span className="ic"><Icon name="sparkle" cls="sm" /></span>
        <span><b>ทุกภาพในเว็บนี้สร้างด้วย AI</b> ไม่มีการใช้ภาพถ่ายของบุคคลจริง และตัวละครทุกตัวเป็นตัวละครสมมติ</span></div>
    </Shell>
  );
}
