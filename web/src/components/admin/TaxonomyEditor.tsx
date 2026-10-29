"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTaxonomy, deleteTaxonomy } from "@/lib/admin/actions";
import { Msg } from "./Msg";

export interface TaxRow { id: number; slug: string; label: string; intro: string | null; seoTitle: string | null; seoDesc: string | null; used: number }

function RowForm({ kind, row, onDone }: { kind: "genre" | "trope"; row: TaxRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveTaxonomy.bind(null, kind, row?.id ?? null), null);
  const router = useRouter();
  if (state?.ok) { router.refresh(); onDone(); }
  return (
    <form action={action} className="card" style={{ marginTop: 10 }}>
      <div className="grid2">
        <label><span>slug (ใช้ใน URL)</span><input name="slug" defaultValue={row?.slug || ""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
        <label><span>ชื่อที่แสดง</span><input name="label" defaultValue={row?.label || ""} required /></label>
      </div>
      {kind === "genre" && (
        <>
          <label><span>title ของหน้าแนว (≤60 ตัวอักษร · ว่าง = สร้างอัตโนมัติ)</span><input name="seoTitle" defaultValue={row?.seoTitle || ""} maxLength={70} /></label>
          <label><span>description ของหน้าแนว (≤160 ตัวอักษร · ว่าง = สร้างอัตโนมัติ)</span><input name="seoDesc" defaultValue={row?.seoDesc || ""} maxLength={170} /></label>
          <label><span>ข้อความนำบนหน้าแนว (ย่อหน้าแรก · สำคัญกับ SEO ของหน้าหมวด)</span><textarea name="intro" defaultValue={row?.intro || ""} /></label>
        </>
      )}
      <Msg state={state} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary sm" type="submit" disabled={pending}>บันทึก</button>
        <button className="btn sm" type="button" onClick={onDone}>ยกเลิก</button>
      </div>
    </form>
  );
}

export function TaxonomyEditor({ kind, rows }: { kind: "genre" | "trope"; rows: TaxRow[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="card">
      <table>
        <thead><tr><th>slug</th><th>ชื่อ</th><th>ใช้ใน</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><code>{r.slug}</code></td><td>{r.label}{kind === "genre" && !r.intro && <> <span className="pill warn">ยังไม่มีข้อความนำ</span></>}</td><td className="num">{r.used} เรื่อง</td>
              <td className="list-actions">
                <button type="button" className="btn sm" onClick={() => setEditing(r.id)}>แก้ไข</button>{" "}
                <a className="btn sm" href={`/${kind === "genre" ? "genre" : "tag"}/${r.slug}/`} target="_blank" rel="noopener">ดูหน้าเว็บ</a>{" "}
                <button type="button" className="btn sm danger" disabled={pending || r.used > 0} title={r.used ? "ยังถูกใช้อยู่" : ""} onClick={() => { if (!confirm(`ลบ "${r.label}"?`)) return; start(async () => { const x = await deleteTaxonomy(kind, r.id); if (!x.ok) setErr(x.errors.join(" ")); else { setErr(null); router.refresh(); } }); }}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {err && <div className="msg bad">{err}</div>}
      {editing === null ? <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => setEditing("new")}>+ เพิ่ม{kind === "genre" ? "แนว" : "แท็ก"}</button>
        : <RowForm kind={kind} row={editing === "new" ? null : rows.find((r) => r.id === editing) || null} onDone={() => setEditing(null)} />}
    </div>
  );
}
