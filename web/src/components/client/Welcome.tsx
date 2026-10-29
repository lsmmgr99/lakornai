"use client";
/* onboarding เลือกแนวที่ชอบ — เก็บใน localStorage (prefs/onboarded) เหมือน app.src.js §17 ของรุ่น static */
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Prefs, save, subscribe } from "@/lib/progress";
import { U } from "@/lib/urls";

export interface PrefTile { slug: string; label: string; img: { url: string; w: number; h: number } | null }

export function WelcomePicker({ tiles }: { tiles: PrefTile[] }) {
  /* รายการที่เลือกอ่านจาก localStorage (snapshot เป็นสตริงเพื่อให้เทียบค่าได้) · ฝั่งเซิร์ฟเวอร์ = ว่าง */
  const raw = useSyncExternalStore(subscribe, () => JSON.stringify(Prefs.list()), () => "[]");
  const picked = JSON.parse(raw) as string[];

  const toggle = (k: string) => {
    const next = picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k];
    Prefs.set(next);
  };
  const go = (ev: React.MouseEvent) => {
    if (!picked.length) { ev.preventDefault(); return; }
    save("onboarded", true);
  };
  const none = picked.length === 0;
  return (
    <>
      <div className="pickgrid" id="prefGrid">
        {tiles.map((g) => (
          <button type="button" key={g.slug} className="gtile" data-pref={g.slug} aria-pressed={picked.includes(g.slug)} onClick={() => toggle(g.slug)}>
            {g.img && <img src={g.img.url} width={g.img.w} height={g.img.h} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
            <span>{g.label}</span>
          </button>
        ))}
      </div>
      <div className="btn-row center">
        <Link className="btn btn-ghost" href={U.home}>ข้ามไปก่อน</Link>
        <Link className={`btn btn-accent${none ? " is-disabled" : ""}`} id="prefGo" href={U.home} aria-disabled={none} onClick={go}>
          {none ? "เริ่มดูเลย" : `เริ่มดูเลย (เลือกแล้ว ${picked.length})`}
        </Link>
      </div>
    </>
  );
}
