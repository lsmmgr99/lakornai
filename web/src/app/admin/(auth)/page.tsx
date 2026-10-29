import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function Dashboard() {
  const [published, drafts, episodes, setting, logs, noCover, horizontalNoWide] = await Promise.all([
    prisma.series.count({ where: { published: true } }),
    prisma.series.count({ where: { published: false } }),
    prisma.episode.count(),
    prisma.setting.findUnique({ where: { id: 1 } }),
    prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: 12 }),
    prisma.series.findMany({ where: { cover: null }, select: { slug: true, title: true } }),
    prisma.series.findMany({ where: { orientation: "horizontal", coverWide: null }, select: { slug: true, title: true } }),
  ]);
  return (
    <>
      <h1>แดชบอร์ด</h1>
      <p className="sub">ภาพรวมของคลังและสถานะเว็บ — ทุกการบันทึกมีผลกับหน้าเว็บทันที</p>
      <div className="grid3">
        <div className="card stat"><b>{published}</b><span>เรื่องที่เผยแพร่อยู่</span></div>
        <div className="card stat"><b>{drafts}</b><span>ร่าง (ยังไม่แสดงบนเว็บ)</span></div>
        <div className="card stat"><b>{episodes}</b><span>ตอนทั้งหมดในคลัง</span></div>
      </div>
      <h2>สถานะเว็บ</h2>
      <div className="card">
        <div className="row between">
          <div>URL ของเว็บ: <code>{setting?.siteOrigin}</code></div>
          <span className={`pill ${setting?.indexing ? "on" : "off"}`}>{setting?.indexing ? "เปิดให้ Google เก็บดัชนีแล้ว" : "ยังปิดดัชนี (robots: Disallow ทั้งเว็บ)"}</span>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>เปลี่ยนได้ที่ <Link href="/admin/settings/">ตั้งค่าเว็บ / SEO</Link> · sitemap: <a href="/sitemap.xml" target="_blank" rel="noopener">/sitemap.xml</a> · robots: <a href="/robots.txt" target="_blank" rel="noopener">/robots.txt</a></p>
      </div>
      {(noCover.length > 0 || horizontalNoWide.length > 0) && (
        <>
          <h2>สิ่งที่ยังขาด</h2>
          <div className="card">
            {noCover.length > 0 && <p>ยังไม่มีปก: {noCover.map((s) => <Link key={s.slug} href={`/admin/series/${s.slug}/`} style={{ marginRight: 10 }}>{s.title}</Link>)}</p>}
            {horizontalNoWide.length > 0 && <p>เรื่องแนวนอนที่ยังไม่มีภาพกว้าง: {horizontalNoWide.map((s) => <Link key={s.slug} href={`/admin/series/${s.slug}/`} style={{ marginRight: 10 }}>{s.title}</Link>)}</p>}
          </div>
        </>
      )}
      <h2>การแก้ไขล่าสุด</h2>
      <div className="card">
        <table><thead><tr><th>เวลา</th><th>ใคร</th><th>ทำอะไร</th><th>กับ</th><th>รายละเอียด</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td className="num">{l.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td><td>{l.userName || "—"}</td><td><code>{l.action}</code></td><td>{l.target}</td><td className="muted">{l.detail}</td></tr>)}</tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0 }}><Link href="/admin/audit/">ดูทั้งหมด</Link></p>
      </div>
    </>
  );
}
