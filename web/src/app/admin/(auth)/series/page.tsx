import Link from "next/link";
import { prisma } from "@/lib/db";
import { PublishToggle } from "@/components/admin/PublishToggle";

const DAY: Record<string, string> = { daily: "ทุกวัน", mon: "จันทร์", tue: "อังคาร", wed: "พุธ", thu: "พฤหัส", fri: "ศุกร์", sat: "เสาร์", sun: "อาทิตย์" };

export default async function SeriesList() {
  const list = await prisma.series.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], include: { _count: { select: { episodes: true } } } });
  const genres = await prisma.genre.findMany();
  const gl = Object.fromEntries(genres.map((g) => [g.slug, g.label]));
  return (
    <>
      <div className="row between"><div><h1>เรื่องและตอน</h1><p className="sub">{list.length} เรื่อง · กดชื่อเรื่องเพื่อแก้ไข</p></div>
        <Link className="btn primary" href="/admin/series/new/">+ เพิ่มเรื่องใหม่</Link></div>
      <div className="card">
        <table>
          <thead><tr><th></th><th>เรื่อง</th><th>แนว</th><th>ตอน</th><th>ออกตอน</th><th>ทิศ</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => {
              const g = (JSON.parse(s.genres) as string[]).map((k) => gl[k] || k).join(" · ");
              return (
                <tr key={s.id}>
                  <td><span className="thumb">{s.cover && <img src={`/media/${s.cover}`} alt="" width={44} height={66} loading="lazy" />}</span></td>
                  <td><Link href={`/admin/series/${s.slug}/`}><b>{s.title}</b></Link><br /><span className="muted">/{s.slug}/</span></td>
                  <td className="muted">{g}</td>
                  <td className="num">{s._count.episodes}</td>
                  <td className="muted">{s.status === "ended" ? "จบแล้ว" : DAY[s.releaseDay || "daily"]}</td>
                  <td className="muted">{s.orientation === "horizontal" ? "แนวนอน" : "แนวตั้ง"}</td>
                  <td><span className={`pill ${s.published ? "on" : "off"}`}>{s.published ? "เผยแพร่" : "ร่าง"}</span>{!s.cover && <> <span className="pill warn">ไม่มีปก</span></>}</td>
                  <td className="list-actions"><PublishToggle id={s.id} published={s.published} /> <a className="btn sm" href={`/series/${s.slug}/`} target="_blank" rel="noopener">ดูหน้าเว็บ</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
