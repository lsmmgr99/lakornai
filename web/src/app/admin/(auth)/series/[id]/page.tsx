import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { CoverUploader } from "@/components/admin/CoverUploader";
import { DeleteSeries } from "@/components/admin/DeleteSeries";

export default async function EditSeries({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.series.findFirst({ where: /^\d+$/.test(id) ? { id: Number(id) } : { slug: id }, include: { episodes: { orderBy: { n: "asc" } } } });
  if (!s) notFound();
  const [genres, tropes] = await Promise.all([prisma.genre.findMany({ orderBy: { sort: "asc" } }), prisma.trope.findMany({ orderBy: { sort: "asc" } })]);
  return (
    <>
      <div className="row between">
        <div><h1>{s.title}</h1><p className="sub">/{s.slug}/ · <span className={`pill ${s.published ? "on" : "off"}`}>{s.published ? "เผยแพร่อยู่" : "ร่าง"}</span> · แก้ล่าสุด {s.updatedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p></div>
        <a className="btn" href={`/series/${s.slug}/`} target="_blank" rel="noopener">ดูหน้าเว็บ ↗</a>
      </div>
      <h2>ปก</h2>
      <div className="grid2">
        <CoverUploader id={s.id} kind="poster" url={s.cover ? `/media/${s.cover}` : null} />
        <CoverUploader id={s.id} kind="wide" url={s.coverWide ? `/media/${s.coverWide}` : null} required={s.orientation === "horizontal"} />
      </div>
      <h2>ข้อมูลเรื่องและตอน</h2>
      <SeriesForm
        id={s.id}
        genres={genres.map((g) => ({ slug: g.slug, label: g.label }))}
        tropes={tropes.map((t) => ({ slug: t.slug, label: t.label }))}
        initial={{
          slug: s.slug, title: s.title, hook: s.hook, synopsis: s.synopsis, status: s.status as "ongoing" | "ended", releaseDay: s.releaseDay,
          orientation: s.orientation as "vertical" | "horizontal", genres: JSON.parse(s.genres), tropes: JSON.parse(s.tropes), cast: JSON.parse(s.cast),
          themeC1: s.themeC1, themeC2: s.themeC2, published: s.published,
          episodes: s.episodes.map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec, videoUrl: e.videoUrl })),
        }}
      />
      <div className="danger-zone">
        <h2 style={{ color: "var(--danger)" }}>ลบเรื่องนี้</h2>
        <p className="muted">ลบทั้งเรื่อง {s.episodes.length} ตอน และไฟล์ปก — ย้อนกลับไม่ได้ · ถ้าแค่ต้องการซ่อนจากเว็บ ให้ &quot;ยกเลิกเผยแพร่&quot; แทน</p>
        <DeleteSeries id={s.id} title={s.title} />
      </div>
    </>
  );
}
