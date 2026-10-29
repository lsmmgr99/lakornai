"use client";
import type { ActionResult } from "@/lib/admin/actions";

/* กล่องข้อความผลลัพธ์ของ server action — สำเร็จ/ล้มพร้อมรายการข้อที่ต้องแก้ */
export function Msg({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok) return state.message ? <div className="msg ok" role="status">{state.message}</div> : null;
  return (
    <div className="msg bad" role="alert">
      {state.errors.length === 1 ? state.errors[0] : <><b>{state.errors[0].endsWith(":") ? state.errors[0] : "พบข้อที่ต้องแก้:"}</b><ul>{(state.errors[0].endsWith(":") ? state.errors.slice(1) : state.errors).map((e, i) => <li key={i}>{e}</li>)}</ul></>}
    </div>
  );
}
