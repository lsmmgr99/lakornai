"use client";
/* คลังของฉัน 4 แท็บ — ทุกแท็บอ่านจาก localStorage หลัง mount (เหมือน app.src.js §10 ของรุ่น static)
   HTML ที่ส่งออกคือสถานะว่างของแท็บ "ดูต่อ" · แท็บจาก ?tab= อ่านฝั่งเบราว์เซอร์เท่านั้น (หน้ายัง static) */
import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { Follows, Progress, save, subscribe, timeAgo } from "@/lib/progress";
import { U } from "@/lib/urls";
import { Empty, LocalNote } from "../Layout";
import { toast } from "./toast";
import { PosterCardLite } from "./HomeBits";
import { useCatalogLite, coverSlotLite, type SeriesLiteFull } from "./CatalogContext";

type Tab = "continue" | "following" | "done" | "history";
const TABS: [Tab, string][] = [["continue", "ดูต่อ"], ["following", "ติดตาม"], ["done", "ดูจบแล้ว"], ["history", "ประวัติ"]];
const EMPTIES: Record<Tab, { icon: string; h: string; p: string; btn: [string, string] }> = {
  continue: { icon: "playf", h: "ยังไม่มีเรื่องที่ดูค้าง", p: "กดดูสักตอน แล้วเว็บจะจำตอนและเวลาที่ค้างไว้ให้เอง — เก็บในเครื่องนี้เท่านั้น", btn: ["เริ่มเลื่อนดูฟีด", U.feed] },
  following: { icon: "heart", h: "ยังไม่ได้ติดตามเรื่องไหน", p: "กดหัวใจที่เรื่องไหนก็ได้ แล้วเราจะเตือนเมื่อมีตอนใหม่", btn: ["ดู TOP 10 ในคลัง", U.popular] },
  done: { icon: "checkc", h: "ยังไม่มีเรื่องที่ดูจบ", p: "เรื่องที่ดูครบทุกตอนจะมาอยู่ตรงนี้ ไว้ย้อนดูอีกครั้ง", btn: ["ดูเรื่องที่สั้นที่สุด", U.az] },
  history: { icon: "clock", h: "ไม่มีประวัติการดู", p: "ประวัติเก็บในเครื่องนี้เท่านั้น และลบได้ตลอดเวลา", btn: ["เริ่มจากหน้าแรก", U.home] },
};
const isTab = (t: string | null): t is Tab => TABS.some(([k]) => k === t);
const currentTab = (): Tab => { const t = new URLSearchParams(location.search).get("tab"); return isTab(t) ? t : "continue"; };

export function LibraryEmpty({ tab }: { tab: Tab }) {
  const e = EMPTIES[tab];
  return <Empty icon={e.icon} h={e.h} p={e.p} btn={e.btn} />;
}

/* แถวดูต่อ (มือถือ) — contRowHtml */
function ContRow({ s, ep, pct }: { s: SeriesLiteFull; ep: number; pct: number }) {
  const lite = useCatalogLite();
  const slot = coverSlotLite(s, "poster");
  return (
    <Link className="controw" href={Progress.resumeHref(lite.by, s.slug)}>
      <span className="th">
        <img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" />
        {ep === s.eps && <span className="last">ตอนสุดท้าย</span>}
      </span>
      <span className="bd">
        <b>{s.title}</b>
        <span className="st num">EP.{ep}/{s.eps} · ดูไปแล้ว {pct}% ของตอนนี้</span>
        <span className="pbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`EP.${ep} จาก ${s.eps} ตอน · ดูไปแล้ว ${pct}%`}>
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="go btn btn-sm btn-accent">ดูต่อ</span>
    </Link>
  );
}

/* การ์ดดูต่อ (เดสก์ท็อป) — libCardHtml */
function LibCard({ s, ep, pct }: { s: SeriesLiteFull; ep: number; pct: number }) {
  const lite = useCatalogLite();
  const slot = coverSlotLite(s, "poster");
  return (
    <Link className="card libcard" href={Progress.resumeHref(lite.by, s.slug)}>
      <span className="poster" style={{ "--c1": s.c1, "--c2": s.c2 } as React.CSSProperties}>
        <img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" />
        <span className="scrim" /><span className="epb num">EP.{ep}</span>
        <span className="pbar"><i style={{ width: `${pct}%` }} /></span>
      </span>
      <span className="t">{s.title}</span>
      <span className="m num">EP.{ep}/{s.eps} · {pct}%</span>
    </Link>
  );
}

/* แท็บปัจจุบันอ่านจาก URL (?tab=) — เปลี่ยนด้วย replaceState + แจ้งผู้ฟัง · popstate ก็แจ้งเช่นกัน */
const tabListeners = new Set<() => void>();
const subscribeTab = (fn: () => void) => {
  tabListeners.add(fn); window.addEventListener("popstate", fn);
  return () => { tabListeners.delete(fn); window.removeEventListener("popstate", fn); };
};
/* เวอร์ชันข้อมูลในเครื่อง — เพิ่มทุกครั้งที่ localStorage เปลี่ยน · ฝั่งเซิร์ฟเวอร์ = -1 (ยังไม่ mount) */
let dataVersion = 0;
const subscribeData = (fn: () => void) => subscribe(() => { dataVersion++; fn(); });

export function Library() {
  const lite = useCatalogLite();
  const tab = useSyncExternalStore(subscribeTab, currentTab, () => "continue" as Tab);
  const mounted = useSyncExternalStore(subscribeData, () => dataVersion, () => -1) >= 0;

  const pick = useCallback((k: Tab) => {
    const u = new URL(location.href);
    u.searchParams.set("tab", k);
    history.replaceState(null, "", u);
    tabListeners.forEach((fn) => fn());
  }, []);

  const clearHistory = () => {
    if (!confirm("ล้างประวัติการดูในเครื่องนี้?")) return;
    save("history", []); toast("ล้างประวัติแล้ว");
  };

  /* คำนวณเนื้อหาแท็บ — ก่อน mount ใช้สถานะว่างเสมอ (ตรงกับ HTML ฝั่งเซิร์ฟเวอร์) */
  let hasData = false;
  let body: React.ReactNode = null;
  if (mounted) {
    if (tab === "continue") {
      const list = Progress.list(lite.by);
      hasData = list.length > 0;
      if (hasData) body = (
        <>
          <div className="lib-list">{list.map((it) => <ContRow key={it.s.slug} s={lite.by[it.s.slug]} ep={it.ep} pct={it.pct} />)}</div>
          <div className="lib-grid">{list.map((it) => <LibCard key={it.s.slug} s={lite.by[it.s.slug]} ep={it.ep} pct={it.pct} />)}</div>
        </>
      );
    } else if (tab === "following") {
      const f = Follows.list().filter((k) => lite.by[k]);
      hasData = f.length > 0;
      if (hasData) body = <div className="grid">{f.map((k) => <PosterCardLite key={k} s={lite.by[k]} />)}</div>;
    } else if (tab === "done") {
      const dl = Progress.doneList(lite.by);
      hasData = dl.length > 0;
      if (hasData) body = <div className="grid">{dl.map((x) => <PosterCardLite key={x.s.slug} s={lite.by[x.s.slug]} badge={<span className="tag tag-done">ดูจบแล้ว</span>} />)}</div>;
    } else {
      const h = Progress.history(lite.by);
      hasData = h.length > 0;
      if (hasData) body = (
        <>
          <div className="list">
            {h.map((x) => {
              const s = lite.by[x.s.slug];
              const slot = coverSlotLite(s, "poster");
              return (
                <Link className="ep-row" key={`${s.slug}-${x.ep}-${x.ts}`} href={U.watch(s.slug, x.ep)}>
                  <span className="th"><img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" /></span>
                  <span className="bd">
                    <span className="h"><b className="num">EP.{x.ep}</b><span className="et">{s.episodes[x.ep - 1]?.title || ""}</span></span>
                    <span className="st">{s.title} · {timeAgo(x.ts)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="btn-row center" style={{ marginTop: "var(--s5)" }}>
            <button type="button" className="btn btn-ghost btn-md" id="clearHistory" onClick={clearHistory}>ล้างประวัติ</button>
          </div>
        </>
      );
    }
  }
  if (!hasData) body = <LibraryEmpty tab={tab} />;

  return (
    <>
      <div className="tabs" role="tablist" aria-label="แท็บคลังของฉัน" id="libTabs">
        {TABS.map(([k, l]) => (
          <button type="button" key={k} role="tab" id={`tab-${k}`} data-tab={k} aria-selected={tab === k} aria-controls="libPanel" onClick={() => pick(k)}>{l}</button>
        ))}
      </div>
      <div id="libNote" hidden={!hasData}><LocalNote /></div>
      <div id="libPanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>{body}</div>
    </>
  );
}
