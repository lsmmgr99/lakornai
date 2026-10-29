"use client";
import { useState, useTransition } from "react";
import { deleteSeries } from "@/lib/admin/actions";

export function DeleteSeries({ id, title }: { id: number; title: string }) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="row">
      <input style={{ maxWidth: 320 }} placeholder={`พิมพ์ชื่อเรื่อง "${title}" เพื่อยืนยัน`} value={typed} onChange={(e) => setTyped(e.target.value)} />
      <button type="button" className="btn danger" disabled={typed.trim() !== title || pending} onClick={() => start(async () => { const r = await deleteSeries(id); if (r && !r.ok) setErr(r.errors.join(" · ")); })}>ลบถาวร</button>
      {err && <div className="msg bad">{err}</div>}
    </div>
  );
}
