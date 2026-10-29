"use client";
/* หีบคำถาม-คำตอบ .acc — ข้อแรกเปิดไว้ · เนื้อหาคำตอบอยู่ใน HTML ครบทุกข้อ (SEO) แค่ซ่อน/แสดง */
import { useState } from "react";
import { Icon } from "../Icon";

export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<boolean[]>(() => items.map((_, i) => i === 0));
  const toggle = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));
  return (
    <>
      {items.map(([q, a], i) => (
        <div className={`acc${open[i] ? " open" : ""}`} key={i}>
          <button type="button" className="q" aria-expanded={open[i]} aria-controls={`faq-${i}`} onClick={() => toggle(i)}>{q}<span className="ch"><Icon name="down" cls="sm" /></span></button>
          <div className="a" id={`faq-${i}`} hidden={!open[i]}>{a}</div>
        </div>
      ))}
    </>
  );
}
