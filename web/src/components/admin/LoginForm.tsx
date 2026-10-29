"use client";
import { useActionState } from "react";
import { login } from "@/lib/admin/actions";
import { Msg } from "./Msg";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card">
      <label><span>อีเมล</span><input name="email" type="email" autoComplete="username" required autoFocus /></label>
      <label><span>รหัสผ่าน</span><input name="password" type="password" autoComplete="current-password" required /></label>
      <Msg state={state} />
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
      </div>
    </form>
  );
}
