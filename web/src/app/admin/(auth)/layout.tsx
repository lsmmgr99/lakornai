import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { logout } from "@/lib/admin/actions";

/* ประตูของทุกหน้าหลังบ้าน (ยกเว้น /admin/login) — ไม่มี session = เด้งไปหน้าเข้าสู่ระบบ */
export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/admin/login/");
  return (
    <>
      <aside className="adm-side">
        <div className="brand">AiLakorn<small>หลังบ้าน · จัดการเนื้อหา</small></div>
        <AdminNav role={user.role} />
        <div className="who"><b>{user.name}</b>{user.email} · {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้แก้เนื้อหา"}
          <form action={logout} style={{ marginTop: 8 }}><button className="btn sm" type="submit">ออกจากระบบ</button></form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </>
  );
}
