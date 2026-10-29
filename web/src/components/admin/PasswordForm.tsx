"use client";
import { useActionState } from "react";
import { changePassword } from "@/lib/admin/actions";
import { Msg } from "./Msg";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card" style={{ maxWidth: 520 }}>
      <label><span>รหัสผ่านปัจจุบัน</span><input name="current" type="password" autoComplete="current-password" required /></label>
      <label><span>รหัสผ่านใหม่ (≥10 ตัวอักษร)</span><input name="next" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label><span>ยืนยันรหัสผ่านใหม่</span><input name="again" type="password" autoComplete="new-password" minLength={10} required /></label>
      <Msg state={state} />
      <div className="row" style={{ marginTop: 16 }}><button className="btn primary" type="submit" disabled={pending}>เปลี่ยนรหัสผ่าน</button></div>
    </form>
  );
}
