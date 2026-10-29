"use client";
import { useActionState } from "react";
import { saveSettings } from "@/lib/admin/actions";
import { Msg } from "./Msg";

export function SettingsForm({ initial }: { initial: { siteName: string; siteOrigin: string; indexing: boolean; freeLine: string } }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="card">
      <label><span>ชื่อเว็บ (og:site_name · ชื่อผู้เผยแพร่ใน structured data)</span><input name="siteName" defaultValue={initial.siteName} required /></label>
      <label><span>URL ของเว็บจริง (ใช้ประกอบ canonical / og:url / sitemap) — ต้องตรงกับโดเมนที่ผู้ชมเปิด</span><input name="siteOrigin" defaultValue={initial.siteOrigin} placeholder="https://ailakorn.com" required /></label>
      <label><span>ประโยคจุดยืน (ฟุตเตอร์และแถบ &quot;ดูฟรี&quot;)</span><input name="freeLine" defaultValue={initial.freeLine} required /></label>
      <fieldset><legend>เครื่องมือค้นหา</legend>
        <label className="inline"><input type="checkbox" name="indexing" defaultChecked={initial.indexing} /> เปิดให้ Google เก็บดัชนี (robots.txt: Allow + ชี้ sitemap) — ปิดไว้ระหว่างทดสอบ เปิดเมื่อโดเมนจริงพร้อม</label>
      </fieldset>
      <Msg state={state} />
      <div className="row" style={{ marginTop: 16 }}><button className="btn primary" type="submit" disabled={pending}>บันทึก</button></div>
    </form>
  );
}
