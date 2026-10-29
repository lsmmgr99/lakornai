"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon";

/* แถวเลื่อนแนวนอน + ปุ่มซ้าย/ขวา · HTML ไม่มี JS ก็ยังเลื่อนได้ */
export function Rail({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const [prev, setPrev] = useState(true);
  const [next, setNext] = useState(false);
  useEffect(() => {
    const el = rail.current; if (!el) return;
    const sync = () => { setPrev(el.scrollLeft < 8); setNext(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8); };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync); ro.observe(el);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [children]);
  const by = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="rail-wrap">
      <button type="button" className="rail-btn prev" aria-label="เลื่อนซ้าย" disabled={prev} onClick={() => by(-1)}><Icon name="left" /></button>
      <button type="button" className="rail-btn next" aria-label="เลื่อนขวา" disabled={next} onClick={() => by(1)}><Icon name="right" /></button>
      <div ref={rail} className={`rail${wide ? " wide" : ""}`}>{children}</div>
    </div>
  );
}
