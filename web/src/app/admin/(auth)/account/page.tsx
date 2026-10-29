import { PasswordForm } from "@/components/admin/PasswordForm";

export default function AccountPage() {
  return (
    <>
      <h1>บัญชีของฉัน</h1>
      <p className="sub">เปลี่ยนรหัสผ่านของคุณเอง — ถ้าลืมรหัส ให้ผู้ดูแลระบบตั้งใหม่ให้ที่หน้า &quot;ผู้ใช้&quot;</p>
      <PasswordForm />
    </>
  );
}
