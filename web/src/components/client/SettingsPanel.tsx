"use client";
/* หน้าตั้งค่า — สวิตช์/ปุ่มล้างข้อมูล ผูกกับ localStorage (เหมือน app.src.js §15 ของรุ่น static)
   HTML ที่ส่งออกคือค่าตั้งต้น · หลัง mount อ่านค่าจริงจากเครื่อง */
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, getSettings, setSetting, read, save, subscribe, wipe, type Settings } from "@/lib/progress";
import { toast } from "./toast";

const LB: Record<keyof Settings, string> = { autoplay: "เล่นตอนถัดไปอัตโนมัติ", sound: "เล่นเสียงอัตโนมัติ", subs: "เปิดซับไตเติลเสมอ", notify: "แจ้งเตือนตอนใหม่" };

export function SettingSwitch({ k }: { k: keyof Settings }) {
  const [on, setOn] = useState<boolean>(DEFAULT_SETTINGS[k]);
  useEffect(() => { const calc = () => setOn(getSettings()[k]); calc(); return subscribe(calc); }, [k]);
  const click = () => {
    const now = !getSettings()[k];
    setSetting(k, now);
    setOn(now);
    toast("บันทึกการตั้งค่าแล้ว");
  };
  return (
    <button type="button" className={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} data-setting={k} onClick={click}>
      <span className="sr">{LB[k]}</span>
    </button>
  );
}

const histText = () => {
  const n = read<unknown[]>("history", []).length;
  return n ? `${n} รายการ · เก็บในเครื่องนี้เท่านั้น` : "ยังไม่มีประวัติ · เก็บในเครื่องนี้เท่านั้น";
};
export function HistCount() {
  const [t, setT] = useState("เก็บในเครื่องนี้เท่านั้น");
  useEffect(() => { const calc = () => setT(histText()); calc(); return subscribe(calc); }, []);
  return <span className="sub" id="histCount">{t}</span>;
}

export function ClearHistoryButton() {
  const click = () => {
    if (!confirm("ล้างประวัติการดูในเครื่องนี้?")) return;
    save("history", []); toast("ล้างประวัติแล้ว");
  };
  return <button type="button" className="btn btn-ghost btn-sm" id="clearHistory" onClick={click}>ล้างประวัติ</button>;
}

export function ClearAllButton() {
  const click = () => {
    if (!confirm("ล้างคลังทั้งหมดในเครื่องนี้? ย้อนกลับไม่ได้ และไม่มีบัญชีให้กู้คืน")) return;
    wipe();
    toast("ล้างข้อมูลทั้งหมดแล้ว");
    setTimeout(() => location.reload(), 800);
  };
  return <button type="button" className="btn btn-danger btn-sm" id="clearAll" onClick={click}>ล้างข้อมูล</button>;
}
