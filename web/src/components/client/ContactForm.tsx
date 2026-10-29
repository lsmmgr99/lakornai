"use client";
/* ฟอร์มติดต่อ — ตรวจช่องกรอกจริง แต่ยังไม่ได้ต่อระบบส่งอีเมล (เหมือน app.src.js §18 ของรุ่น static) */
import { useState, type FormEvent } from "react";
import { toast } from "./toast";

type Field = "name" | "email" | "msg";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ContactForm() {
  const [bad, setBad] = useState<Field[]>([]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const val = (k: Field) => String(fd.get(k) || "");
    const wrong: Field[] = (["name", "email", "msg"] as Field[]).filter((k) => !val(k).trim());
    if (val("email") && !EMAIL_RE.test(val("email")) && !wrong.includes("email")) wrong.push("email");
    setBad(wrong);
    if (wrong.length) {
      form.querySelector<HTMLElement>(`[name="${wrong[0]}"]`)?.focus();
      toast("กรุณาตรวจช่องที่ยังไม่ถูกต้อง");
      return;
    }
    toast("ตรวจข้อมูลครบแล้ว — ระบบส่งอีเมลยังไม่ได้ต่อในเวอร์ชันนี้");
  };
  const cls = (k: Field) => `field${bad.includes(k) ? " bad" : ""}`;
  const inv = (k: Field) => (bad.includes(k) ? true : undefined);
  return (
    <form id="contactForm" noValidate onSubmit={submit}>
      <label className={cls("name")}><span>ชื่อของคุณ</span><input name="name" required placeholder="ชื่อ-นามสกุล" aria-invalid={inv("name")} /></label>
      <label className={cls("email")}><span>อีเมล</span><input name="email" type="email" required placeholder="you@example.com" aria-invalid={inv("email")} /></label>
      <label className="field"><span>หัวข้อ</span><select name="topic" defaultValue="ปัญหาการใช้งาน">
        <option>ปัญหาการใช้งาน</option><option>แจ้งปัญหาการเล่นวิดีโอ</option><option>ร่วมงานกับเรา</option></select></label>
      <label className={cls("msg")}><span>ข้อความ</span><textarea name="msg" required placeholder="เล่าให้เราฟัง…" aria-invalid={inv("msg")} /></label>
      <button className="btn btn-accent btn-block" type="submit">ส่งข้อความ</button>
    </form>
  );
}
