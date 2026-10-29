"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCover, removeCover } from "@/lib/admin/actions";
import { Msg } from "./Msg";

const SPEC = {
  poster: { label: "ปก 2:3", hint: "สัดส่วน 2:3 · PNG/JPEG/WebP ≤ 1 MB · ระบบย่อเป็น 1024×1536 WebP ให้เอง", cls: "poster" },
  wide: { label: "ภาพกว้าง 2640×1200", hint: "สัดส่วน 11:5 (2640×1200) · ≤ 4 MB · ระบบบีบเป็น WebP ≤ 300 KB ให้เอง · ใช้กับฮีโร่/การ์ดทรงกว้าง", cls: "wide" },
};
export function CoverUploader({ id, kind, url, required = false }: { id: number; kind: "poster" | "wide"; url: string | null; required?: boolean }) {
  const [state, action, pending] = useActionState(uploadCover.bind(null, id, kind), null);
  const [removing, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const spec = SPEC[kind];
  const shown = state?.ok && state.data?.url ? state.data.url : preview || url;
  return (
    <div className="cover-box">
      <b>{spec.label}</b>{required && <span className="pill warn" style={{ marginLeft: 8 }}>บังคับสำหรับแนวนอน</span>}
      <div className="muted">{spec.hint}</div>
      <div className={`frame ${spec.cls}`}>{shown ? <img src={shown} alt="" /> : <span>{kind === "wide" ? "ยังไม่มีภาพกว้าง (เรื่องแนวตั้งไม่บังคับ)" : "ยังไม่มีปก"}</span>}</div>
      {url && <small>{url}</small>}
      <form action={action} onSubmit={() => setPreview(null)} className="row" style={{ marginTop: 8 }}>
        <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required style={{ maxWidth: 300 }}
          onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        <button className="btn primary sm" type="submit" disabled={pending}>{pending ? "กำลังอัปโหลด…" : url ? "เปลี่ยนไฟล์" : "อัปโหลด"}</button>
        {url && <button type="button" className="btn sm danger" disabled={removing} onClick={() => { if (!confirm("เอาภาพนี้ออก?")) return; start(async () => { await removeCover(id, kind); router.refresh(); }); }}>เอาออก</button>}
      </form>
      <Msg state={state} />
    </div>
  );
}
