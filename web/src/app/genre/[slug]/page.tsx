import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, type Genre } from "@/lib/content";
import { pageMetadata, collectionLd, breadcrumbLd, fit, SITE_NAME } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Crumbs, Empty, JsonLd } from "@/components/Layout";
import { Card } from "@/components/Cards";

export const dynamicParams = true;

/* A4 หน้าแนว — [title, description, h1, lead] ต่อหนึ่งแนว
   title/description คัดลอกจาก onpage-audit (AIO-19) §5.1 ตรงตัว · genre-western แก้ title/h1 ให้ตรงกับ anchor ในเว็บตาม S8
   ค่าจากฐานข้อมูล (g.seoTitle / g.seoDesc / g.intro) ทับค่าในตารางนี้เมื่อมี (เหมือน genreLead ของ generator) */
const GENRE_SEO: Record<string, [string, string, string, string]> = {
  vertical: ["ละครแนวตั้ง — ละครสั้น AI ดูฟรีทุกตอน · AiLakorn",
    "รวมละครแนวตั้ง AI ภาษาไทย ดูจบตอนละ 1–3 นาที บนมือถือแนวตั้ง ฟรีทุกตอน ไม่ต้องสมัครสมาชิก เลือกจากละครสั้นแนวตั้งที่เรียงตอนครบทุกเรื่อง",
    "ละครแนวตั้ง",
    "ละครแนวตั้งคือละครที่ถ่ายและตัดมาให้ดูบนมือถือโดยเฉพาะ จอเต็มแนวตั้ง ตอนละไม่เกิน 3 นาที และจบความทุกตอน ในคลังของ AiLakorn หมวดนี้เป็นหมวดที่ใหญ่ที่สุด รวมทั้งเรื่องออฟฟิศอย่างประธานเย็นชากับเลขาตัวแสบ ไปจนถึงเรื่องข้ามภพอย่างข้ามภพมาเป็นนางร้าย ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก"],
  fruit: ["ละครผลไม้ AI — ดราม่าผลไม้ ดูฟรีทุกตอน · AiLakorn",
    "ละครสั้น AI ที่ตัวละครเป็นผลไม้ไทย รัก หักหลัง ชิงสวน ทุเรียน มังคุด ลำไย ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 3 เรื่อง เรียงตอนครบ",
    "ละครผลไม้ AI",
    "ละครผลไม้ AI เป็นแนวที่ AiLakorn สร้างขึ้นเอง ตัวละครทุกตัวเป็นผลไม้ไทยที่มีชื่อ มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น ตั้งแต่ทุเรียนที่ถูกโค่นทิ้งกลางสวน ลำไยลูกเดียวที่ไม่มีเมล็ด ไปจนถึงมังคุดที่ตกหลุมรักคนบ้านศัตรู เป็นหมวดที่ดูจบง่ายที่สุดในคลังและเป็นหมวดที่คนจำเราได้"],
  western: ["ละครฝรั่ง — ละครสั้น AI พากย์ไทย ดูฟรีทุกตอน · AiLakorn",
    "ละครสั้น AI สไตล์ฝรั่ง พากย์ไทยและมีซับไทย ทายาท มาเฟีย รักข้ามชนชั้น ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบตั้งแต่ตอนแรกถึงตอนจบ",
    "ละครฝรั่ง — ละครสั้น AI พากย์ไทย",
    "ละครฝรั่งของ AiLakorn คือเรื่องที่ตัวละครและฉากเป็นสากล แต่บทและการพากย์เป็นไทยทั้งหมด หมวดนี้รวมเรื่องทายาทตระกูลดัง มาเฟีย และรักข้ามชนชั้น ที่เดินเรื่องเร็วแบบละครสั้น ไม่ต้องรอตอนยาว ดูฟรีทุกตอนตั้งแต่ตอนแรกถึงตอนจบ"],
  horror: ["ละครสยองขวัญ AI — ผี บ้านร้าง คำสาป ดูฟรี · AiLakorn",
    "ละครสั้นสยองขวัญ AI ภาษาไทย ผี บ้านร้าง คำสาป ดูจบไวตอนละไม่กี่นาที ฟรีทุกตอน ไม่ต้องสมัครสมาชิก แนะนำให้ดูตอนกลางคืนแบบมีเพื่อน",
    "ละครสยองขวัญ AI",
    "ละครสยองขวัญของเราเล่นกับความกลัวแบบไทย ๆ ที่คนไทยรู้จักดี ผีที่สิงอยู่ในของ บ้านเช่าราคาถูกผิดปกติ และซอยที่ไม่มีเลขบ้าน ตอนสั้นทำให้ความกลัวมาเร็วและไม่ยืดเยื้อ เหมาะกับการดูกลางคืนแบบรวดเดียวจบ ทุกตอนดูฟรี ไม่ต้องสมัครสมาชิก"],
  timetravel: ["ละครย้อนเวลา AI — ข้ามภพ เกิดใหม่ ดูฟรีทุกตอน · AiLakorn",
    "ละครสั้น AI แนวย้อนเวลา ข้ามภพ เกิดใหม่ แก้ไขอดีตให้รักครั้งนี้ไม่พัง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบ ดูต่อจากตอนที่ค้างไว้ได้",
    "ละครย้อนเวลา AI",
    "ละครย้อนเวลาและข้ามภพคือหมวดที่ตัวละครได้โอกาสครั้งที่สอง ไม่ว่าจะเป็นนักโบราณคดีที่ตื่นมาในปี พ.ศ. 2310 หรือคนอ่านนิยายที่ตื่นมาเป็นนางร้ายซึ่งรู้ล่วงหน้าว่าตัวเองจะตายตอนไหน หมวดนี้เดินเรื่องด้วยคำถามเดียวคือ รู้อนาคตแล้วจะเปลี่ยนมันได้ไหม"],
  revenge: ["ละครแก้แค้น AI — ทวงคืนทุกอย่าง ดูฟรีทุกตอน · AiLakorn",
    "ละครสั้น AI แนวแก้แค้น ถูกหักหลังจนหมดตัวแล้วกลับมาทวงคืนทุกอย่าง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 4 เรื่อง เรียงตอนครบทุกเรื่อง",
    "ละครแก้แค้น AI",
    "ละครแก้แค้นคือหมวดที่คนดูละครสั้นไทยค้นหามากที่สุด สูตรของมันตรงไปตรงมา ถูกหักหลังจนหมดตัว หายไปพักหนึ่ง แล้วกลับมาทวงคืนทีละอย่าง ในคลังของเรามีทั้งแบบสวนผลไม้ แบบออฟฟิศ และแบบตระกูลมหาเศรษฐี ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก"],
};

/* ถ้อยคำของแนว: ฐานข้อมูลทับตาราง · แนวใหม่ที่ไม่มีทั้งคู่ได้ค่าสำรองที่ไม่ว่าง (generator รุ่น static ล้ม build แทน) */
function genreSeo(g: Genre, count: number) {
  const row = GENRE_SEO[g.slug];
  const h1 = row?.[2] || g.label;
  return {
    h1,
    title: g.seoTitle || row?.[0] || fit(60, `${g.label} — ละครสั้น AI ดูฟรีทุกตอน · ${SITE_NAME}`, `${g.label} — ละครสั้น AI · ${SITE_NAME}`),
    desc: g.seoDesc || row?.[1] || `รวมละครสั้น AI ภาษาไทยแนว${g.label} ${count} เรื่อง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบทุกเรื่อง`,
    lead: g.intro || row?.[3] || `รวมละครสั้น AI แนว${g.label} ${count} เรื่องในคลังของ ${SITE_NAME} ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก`,
  };
}

export async function generateStaticParams() {
  const c = await getCatalog();
  return c.genres.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCatalog();
  const g = c.genres.find((x) => x.slug === slug);
  if (!g) return {};
  const { title, desc } = genreSeo(g, c.seriesOfGenre(slug).length);
  return pageMetadata({ url: U.genre(slug), title, desc });
}

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCatalog();
  const g = c.genres.find((x) => x.slug === slug);
  if (!g) notFound();
  const items = c.seriesOfGenre(slug);
  const { h1, lead } = genreSeo(g, items.length);
  return (
    <Shell c={c} active="browse">
      <JsonLd data={[
        collectionLd(c, { url: U.genre(slug), name: h1, description: lead, items }),
        breadcrumbLd(c, [["หน้าแรก", U.home], ["เลือกดู", U.browse], [g.label, U.genre(slug)]]),
      ]} />
      <Crumbs items={[["หน้าแรก", U.home], ["เลือกดู", U.browse], [g.label, null]]} />
      <PageHead h1={h1} />
      <p className="lead">{lead}</p>
      {c.openTags.length > 0 && (
        <div className="chips"><span className="chips-lb">แท็ก</span>
          {c.openTags.map((t) => <Link key={t.slug} className="chip" href={U.tag(t.slug)}>{t.chip}<span className="n num">{t.items.length}</span></Link>)}
        </div>
      )}
      <p className="res-count"><b className="num">{items.length}</b> เรื่อง</p>
      {items.length
        ? <div className="grid">{items.map((s) => <Card key={s.slug} s={s} c={c} hook />)}</div>
        : <Empty icon="grid" h="แนวนี้ยังไม่มีเรื่อง" p="เรากำลังสร้างเรื่องใหม่ในแนวนี้อยู่ ระหว่างนี้ลองดูแนวที่ใกล้เคียงกัน" btn={["ดูทุกแนว", U.browse]} />}
    </Shell>
  );
}
