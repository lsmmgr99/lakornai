import { prisma } from "@/lib/db";
import { SeriesForm } from "@/components/admin/SeriesForm";

export default async function NewSeries() {
  const [genres, tropes] = await Promise.all([prisma.genre.findMany({ orderBy: { sort: "asc" } }), prisma.trope.findMany({ orderBy: { sort: "asc" } })]);
  return (
    <>
      <h1>เพิ่มเรื่องใหม่</h1>
      <p className="sub">บันทึกเป็นร่างก่อน แล้วค่อยอัปโหลดปกและกดเผยแพร่ — เรื่องจะยังไม่แสดงบนเว็บจนกว่าจะเผยแพร่</p>
      <SeriesForm genres={genres.map((g) => ({ slug: g.slug, label: g.label }))} tropes={tropes.map((t) => ({ slug: t.slug, label: t.label }))} />
    </>
  );
}
