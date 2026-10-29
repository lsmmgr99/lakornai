import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin/");
  return (
    <div className="adm-main" style={{ gridColumn: "1 / -1" }}>
      <div className="login">
        <div className="brand">AiLakorn</div>
        <p className="sub">เข้าสู่ระบบหลังบ้าน — สำหรับทีมงานเท่านั้น</p>
        <LoginForm />
      </div>
    </div>
  );
}
