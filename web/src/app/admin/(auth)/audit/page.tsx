import { prisma } from "@/lib/db";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: 300 });
  return (
    <>
      <h1>ประวัติการแก้</h1>
      <p className="sub">ใครทำอะไรเมื่อไร — 300 รายการล่าสุด</p>
      <div className="card">
        <table><thead><tr><th>เวลา</th><th>ใคร</th><th>การกระทำ</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td className="num">{l.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td><td>{l.userName || "—"}</td><td><code>{l.action}</code></td><td>{l.target}</td><td className="muted">{l.detail}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
