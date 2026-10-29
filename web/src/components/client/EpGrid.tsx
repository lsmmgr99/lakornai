"use client";
/* ตารางตอน + แท็บช่วงตอน + คำอธิบายสี (พอร์ตจาก build/ui.mjs epGrid/epTabs/legend
   และ app.src.js §6 paintEpGrid / §7 bindEpTabs)
   - ลิงก์ทุกตอนถูกเรนเดอร์ฝั่งเซิร์ฟเวอร์ครบใน HTML (SEO · แก้ AIO-19 F-04)
   - สถานะ "ดูแล้ว / กำลังดู" เติมจาก localStorage หลัง mount และฟังการเปลี่ยนแปลง
     (HTML ที่ส่งออกไม่รู้จักผู้ใช้ จึงไม่เดาสถานะให้ใคร)
   - หน้ารับชมส่ง `current` มา = ตอนที่เปิดอยู่ (.cur ตรึงไว้) · หน้าเรื่องไม่ส่ง = ติด .cur จากค่าที่บันทึก */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Progress, subscribe } from "@/lib/progress";
import { U } from "@/lib/urls";
import { useCatalogLite } from "./CatalogContext";

export interface EpGridProps {
  slug: string;
  eps: number;
  episodes: { n: number; title: string; mmss: string }[];
  current?: number;
}

const PER_TAB = 20;
const rangesOf = (eps: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < eps; i += PER_TAB) out.push([i + 1, Math.min(i + PER_TAB, eps)]);
  return out;
};
const tabOf = (ranges: [number, number][], n: number) => {
  const i = ranges.findIndex(([a, b]) => n >= a && n <= b);
  return i < 0 ? 0 : i;
};

export const Legend = () => <div className="legend"><i className="d">ดูแล้ว</i><i className="c">กำลังดู</i></div>;

export function EpGrid({ slug, eps, episodes, current }: EpGridProps) {
  const lite = useCatalogLite();
  const ranges = rangesOf(eps);
  const hasTabs = ranges.length >= 2;
  const fixed = current != null;
  const [tab, setTab] = useState(() => tabOf(ranges, current ?? 1));
  /* สถานะจากเครื่องผู้ชม: null = ยังไม่อ่าน (SSR / ก่อน mount) */
  const [st, setSt] = useState<{ cur: number; watchedTo: number } | null>(null);

  useEffect(() => {
    let first = true;
    const calc = () => {
      const e = Progress.get(lite.by, slug);
      const dn = Progress.done()[slug];
      const cur = e ? e.ep : 0;
      const watchedTo = dn ? eps : Math.max(0, cur - 1);
      setSt({ cur, watchedTo });
      /* แท็บเริ่มต้น = ช่วงที่มีตอนที่เปิดอยู่ / ตอนที่บันทึกไว้ (bindEpTabs) — ตั้งครั้งเดียวตอน mount */
      if (first && !fixed && cur) setTab(tabOf(ranges, cur));
      first = false;
    };
    calc();
    return subscribe(calc);
  }, [lite, slug, eps, fixed]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = ranges[tab] || ranges[0];
  return (
    <>
      {hasTabs && (
        <div className="ep-tabs" role="tablist" aria-label="ช่วงตอน">
          {ranges.map(([a, b], i) => (
            <button key={a} type="button" className="num" role="tab" data-range={`${a}-${b}`} aria-selected={i === tab} lang="en" onClick={() => setTab(i)}>{a}–{b}</button>
          ))}
        </div>
      )}
      <div className="eps" id="epGrid" data-slug={slug}>
        {episodes.map((e) => {
          const n = e.n;
          const isCur = fixed ? n === current : !!st && n === st.cur;
          const done = !!st && n <= st.watchedTo && !isCur;
          const base = `ตอนที่ ${n} ${e.title}`;
          const label = st ? `${base} · ${isCur ? "กำลังดู" : done ? "ดูแล้ว" : "ยังไม่ได้ดู"}` : base;
          const cls = `ep${isCur ? " cur" : ""}${done ? " done" : ""}`;
          return (
            <Link
              key={n}
              className={cls}
              href={U.watch(slug, n)}
              data-n={n}
              title={`EP.${n} ${e.title} · ${e.mmss} นาที`}
              aria-label={label}
              aria-current={isCur && fixed ? "page" : undefined}
              hidden={hasTabs && (n < range[0] || n > range[1])}
            >
              <span className="num">{n}</span>
            </Link>
          );
        })}
      </div>
      <Legend />
    </>
  );
}
