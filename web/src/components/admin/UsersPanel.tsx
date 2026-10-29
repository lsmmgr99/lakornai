"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveUser, setUserActive } from "@/lib/admin/actions";
import { Msg } from "./Msg";

export interface UserRow { id: number; email: string; name: string; role: "admin" | "editor"; active: boolean; lastLoginAt: string | null }

function UserForm({ row, onDone }: { row: UserRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveUser.bind(null, row?.id ?? null), null);
  const router = useRouter();
  if (state?.ok) { router.refresh(); onDone(); }
  return (
    <form action={action} className="card" style={{ marginTop: 10 }}>
      <div className="grid2">
        <label><span>อีเมล (ใช้เข้าสู่ระบบ)</span><input name="email" type="email" defaultValue={row?.email || ""} required /></label>
        <label><span>ชื่อ</span><input name="name" defaultValue={row?.name || ""} required /></label>
        <label><span>สิทธิ์</span><select name="role" defaultValue={row?.role || "editor"}><option value="editor">ผู้แก้เนื้อหา</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
        <label><span>{row ? "รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)" : "รหัสผ่าน (≥10 ตัวอักษร)"}</span><input name="password" type="password" autoComplete="new-password" minLength={row ? undefined : 10} required={!row} /></label>
      </div>
      <Msg state={state} />
      <div className="row" style={{ marginTop: 12 }}><button className="btn primary sm" type="submit" disabled={pending}>บันทึก</button><button type="button" className="btn sm" onClick={onDone}>ยกเลิก</button></div>
    </form>
  );
}

export function UsersPanel({ meId, users }: { meId: number; users: UserRow[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="card">
      <table>
        <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>สิทธิ์</th><th>สถานะ</th><th>เข้าสู่ระบบล่าสุด</th><th></th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}{u.id === meId && <span className="muted"> (คุณ)</span>}</td><td>{u.email}</td><td>{u.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้แก้เนื้อหา"}</td>
            <td><span className={`pill ${u.active ? "on" : "warn"}`}>{u.active ? "ใช้งาน" : "ปิดบัญชี"}</span></td><td className="muted">{u.lastLoginAt || "—"}</td>
            <td className="list-actions">
              <button type="button" className="btn sm" onClick={() => setEditing(u.id)}>แก้ไข</button>{" "}
              {u.id !== meId && <button type="button" className="btn sm" disabled={pending} onClick={() => start(async () => { const r = await setUserActive(u.id, !u.active); if (!r.ok) setErr(r.errors.join(" ")); else { setErr(null); router.refresh(); } })}>{u.active ? "ปิดบัญชี" : "เปิดใช้"}</button>}
            </td>
          </tr>
        ))}</tbody>
      </table>
      {err && <div className="msg bad">{err}</div>}
      {editing === null ? <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => setEditing("new")}>+ เพิ่มผู้ใช้</button>
        : <UserForm row={editing === "new" ? null : users.find((u) => u.id === editing) || null} onDone={() => setEditing(null)} />}
    </div>
  );
}
