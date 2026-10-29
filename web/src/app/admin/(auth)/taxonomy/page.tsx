import { prisma } from "@/lib/db";
import { TaxonomyEditor } from "@/components/admin/TaxonomyEditor";

export default async function Taxonomy() {
  const [genres, tropes, series] = await Promise.all([
    prisma.genre.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
    prisma.trope.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
    prisma.series.findMany({ select: { genres: true, tropes: true } }),
  ]);
  const count = (field: "genres" | "tropes", slug: string) => series.filter((s) => (JSON.parse(s[field]) as string[]).includes(slug)).length;
  return (
    <>
      <h1>แนวและแท็ก</h1>
      <p className="sub">แนว = หมวดหลัก (มีหน้า /genre/… ของตัวเอง พร้อม title/description/ข้อความนำสำหรับ SEO) · แท็ก = ปมเรื่องชั้นที่สอง (เปิดหน้า /tag/… อัตโนมัติเมื่อมี ≥3 เรื่องและไม่ซ้อนกับแนวเกิน 80%)</p>
      <h2>แนว</h2>
      <TaxonomyEditor kind="genre" rows={genres.map((g) => ({ id: g.id, slug: g.slug, label: g.label, intro: g.intro, seoTitle: g.seoTitle, seoDesc: g.seoDesc, used: count("genres", g.slug) }))} />
      <h2>แท็ก</h2>
      <TaxonomyEditor kind="trope" rows={tropes.map((t) => ({ id: t.id, slug: t.slug, label: t.label, intro: null, seoTitle: null, seoDesc: null, used: count("tropes", t.slug) }))} />
    </>
  );
}
