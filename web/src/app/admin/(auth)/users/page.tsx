import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { UsersPanel } from "@/components/admin/UsersPanel";

export default async function UsersPage() {
  const me = await getSession();
  if (me?.role !== "admin") redirect("/admin/");
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  return (
    <>
      <h1>ผู้ใช้หลังบ้าน</h1>
      <p className="sub">ผู้ดูแลระบบ = ทุกอย่างรวมตั้งค่าและผู้ใช้ · ผู้แก้เนื้อหา = เรื่อง/ตอน/ปก/แนว/แท็ก · ปิดบัญชีแล้วหลุดจากระบบทันที</p>
      <UsersPanel meId={me.id} users={users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role as "admin" | "editor", active: u.active, lastLoginAt: u.lastLoginAt?.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) || null }))} />
    </>
  );
}
