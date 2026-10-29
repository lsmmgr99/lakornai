"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPublished } from "@/lib/admin/actions";

export function PublishToggle({ id, published }: { id: number; published: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const click = () => {
    if (published && !confirm("ยกเลิกการเผยแพร่? หน้าเรื่องและหน้าตอนจะหายจากเว็บทันที (ข้อมูลยังอยู่)")) return;
    start(async () => {
      const r = await setPublished(id, !published);
      if (!r.ok) { setErr(r.errors.join(" · ")); return; }
      setErr(null); router.refresh();
    });
  };
  return (
    <>
      <button type="button" className={`btn sm${published ? "" : " primary"}`} disabled={pending} onClick={click}>{published ? "ยกเลิกเผยแพร่" : "เผยแพร่"}</button>
      {err && <div className="msg bad" style={{ marginTop: 6 }}>{err}</div>}
    </>
  );
}
