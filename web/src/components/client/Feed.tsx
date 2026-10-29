"use client";
/* ฟีดแนวตั้ง (ส่วน 14 ของ app.src.js รุ่น static) — ชุดของฟีด = series ทั้งชุด ลำดับเดิม
   **ห้ามมีเงื่อนไข orientation ใด ๆ ในเส้นทางนี้** (ADR-001 §13.7 D8 ฉบับกลับทาง · มติลูกค้า 25 ต.ค. 2026)
   กฎกรอบเมื่อเรื่องเป็นแนวนอนเป็นของ UX (AIO-59) ไม่ใช่ที่นี่ — ที่นี่แค่ประกาศทิศลงบนกล่องให้วัดได้ */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { U } from "@/lib/urls";
import { Icon } from "../Icon";
import { FollowButton, ShareButton } from "./Buttons";
import { useCatalogLite, coverSlotLite } from "./CatalogContext";

export function Feed({ firstSlug }: { firstSlug: string }) {
  const lite = useCatalogLite();
  const list = lite.series;
  const start = Math.max(0, list.findIndex((x) => x.slug === firstSlug));
  const [i, setI] = useState(start);
  const [muted, setMuted] = useState(true);
  const [live, setLive] = useState("");
  const barRef = useRef<HTMLElement>(null);
  const s = list[i];

  const show = useCallback((n: number) => {
    if (!list.length) return;
    const k = (n + list.length) % list.length;
    setI(k);
    setLive(`เรื่องที่ ${k + 1} จาก ${list.length}: ${list[k].title}`);
  }, [list]);

  /* body.stage = พื้นหลังเวทีของฟีด (รุ่น static ใส่ class ที่ <body> ตอน build) */
  useEffect(() => {
    document.body.classList.add("stage");
    return () => document.body.classList.remove("stage");
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowDown" || ev.key === "PageDown") { ev.preventDefault(); show(i + 1); }
      if (ev.key === "ArrowUp" || ev.key === "PageUp") { ev.preventDefault(); show(i - 1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [i, show]);

  /* แถบความคืบหน้าจำลอง — เดินเร็ว 6 เท่า (ไม่มีไฟล์วิดีโอในสัญญา) · เริ่มใหม่ทุกครั้งที่สลับเรื่อง */
  useEffect(() => {
    const bar = barRef.current; if (!bar || !s) return;
    const dur = s.episodes[0]?.durationSec || 60;
    let t = 0;
    bar.style.width = "0%";
    const tick = setInterval(() => { t = (t + 1) % dur; bar.style.width = `${(t / dur) * 100}%`; }, 1000 / 6);
    return () => clearInterval(tick);
  }, [s]);

  if (!s) return null;
  /* ทรง auto เท่ากับฝั่งเซิร์ฟเวอร์ ⇒ เรื่องเดียวกันได้ไฟล์ใบเดียวกันทั้งตอน "เปิดหน้ามาเจอ" และ "ปัดมาเจอ" (§13.5) */
  const slot = coverSlotLite(s, "auto");
  return (
    <>
      <div className="feed-desktop">
        <div className="player full" id="feedPlayer" data-slug={s.slug} data-orientation={s.orientation}>
          <img src={slot.url} width={slot.w} height={slot.h} alt="" loading="eager" fetchPriority="high" decoding="async" />
          <div className="vig" />
          <div className="ptop">
            <Link className="rnd" href={U.home} aria-label="กลับหน้าแรก"><Icon name="left" /></Link>
            <span className="ti"><b>ฟีดแนวตั้ง</b><span id="feedPos">เรื่องที่ {i + 1} จาก {list.length}</span></span>
            <Link className="rnd" href={U.settings} aria-label="ตั้งค่าการเล่น"><Icon name="settings" /></Link>
          </div>
          <div className="pstack">
            <div className="pfoot"><div className="ptext">
              {/* ไม่มีบรรทัดซับไตเติล — เหตุผลเดียวกับหน้ารับชม (ไม่มีไฟล์วิดีโอ/ไม่มีซับในสัญญา) */}
              <div className="pbody">
                <h2 id="feedTitle">{s.title} <span className="num" lang="en">EP.1</span></h2>
                <p className="hk" id="feedHook">{s.hook}</p>
                <div className="btn-row">
                  <Link className="btn btn-accent btn-md" id="feedAll" href={U.series(s.slug)}>ดูทั้งเรื่อง <Icon name="right" cls="sm" /></Link>
                  <span className="tag tag-free"><Icon name="playf" cls="sm" /> ดูฟรีทุกตอน</span>
                </div></div>
            </div>
            <div className="side">
              <button type="button" className={`b${muted ? " on" : ""}`} id="feedMute"
                aria-label={muted ? "เปิดเสียง (ตอนนี้ปิดเสียงอยู่)" : "ปิดเสียง (ตอนนี้เปิดเสียงอยู่)"}
                onClick={() => setMuted((m) => !m)}><Icon name="mute" /></button>
              <span className="lb">{muted ? "ปิดเสียง" : "เปิดเสียง"}</span>
              <FollowButton slug={s.slug} cls="b" label="ติดตามเรื่องนี้" title={s.title} />
              <Link className="b" id="feedEps" href={`${U.series(s.slug)}#epGrid`} aria-label="เลือกตอน"><Icon name="list" /></Link>
              <ShareButton cls="b" label="แชร์" />
            </div></div>
            <div><div className="bar"><i ref={barRef} style={{ width: "0%" }} /></div></div>
          </div>
          <div className="feed-arrows">
            <button type="button" className="rnd" id="feedPrev" aria-label="เรื่องก่อนหน้า" onClick={() => show(i - 1)}><Icon name="up" /></button>
            <button type="button" className="rnd" id="feedNext" aria-label="เรื่องถัดไป" onClick={() => show(i + 1)}><Icon name="down" /></button>
          </div>
        </div>
        <aside className="feed-side" id="feedSide">
          <h2>{s.title}</h2>
          <div className="facts"><span className="tag tag-ai">AI</span><span>{s.eps} ตอน</span><span>{s.status}</span></div>
          <p>{s.hook}</p>
          <div className="btn-row" style={{ marginTop: "var(--s4)" }}>
            <Link className="btn btn-accent" href={U.watch(s.slug, 1)}>เริ่มดู EP.1</Link>
          </div>
        </aside>
      </div>
      <p className="sr" id="feedLive" aria-live="polite">{live}</p>
    </>
  );
}
