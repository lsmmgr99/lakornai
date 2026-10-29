"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Follows, Progress, subscribe } from "@/lib/progress";
import { U } from "@/lib/urls";
import { Icon } from "../Icon";
import { Rail } from "./Rail";
import { useCatalogLite, coverSlotLite, type SeriesLiteFull } from "./CatalogContext";

/* ---------- การ์ด/แถวที่สร้างจากข้อมูลในเครื่องผู้ชม (เหมือน app.src.js ของรุ่น static) ---------- */
export function ContCard({ s, ep, pct }: { s: SeriesLiteFull; ep: number; pct: number }) {
  const lite = useCatalogLite();
  const slot = coverSlotLite(s, "auto");
  return (
    <Link className="cont" href={Progress.resumeHref(lite.by, s.slug)}>
      <span className="thumb">
        <img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" style={{ objectPosition: "center 28%" }} />
        <span className="play"><i><Icon name="playf" /></i></span>
        <span className="ep num">EP.{ep}</span>
        <span className="pbar"><i style={{ width: `${pct}%` }} /></span>
      </span>
      <span className="t">{s.title}</span>
      <span className="m num">EP.{ep}/{s.eps} · ดูไปแล้ว {pct}%</span>
    </Link>
  );
}
export function PosterCardLite({ s, badge }: { s: SeriesLiteFull; badge?: ReactNode }) {
  const lite = useCatalogLite();
  const slot = coverSlotLite(s, "poster");
  return (
    <Link className="card" href={U.series(s.slug)}>
      <span className="poster" style={{ "--c1": s.c1, "--c2": s.c2 } as React.CSSProperties}>
        <img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" />
        {badge && <span className="tl">{badge}</span>}
      </span>
      <span className="t">{s.title}</span>
      <span className="m">{lite.genreLabel[s.genres[0]] || ""} · {s.eps} ตอน</span>
    </Link>
  );
}

/* แถบ "ดูต่อจากที่ค้างไว้" — HTML ที่ส่งออกคือสถานะว่าง · เติมจาก localStorage หลัง mount
   ไม่มีรายการ = ซ่อนทั้ง section (AIO-38 F1) ยกเว้นหน้าออฟไลน์ที่ให้โชว์สถานะว่าง */
export function ContinueRail({ emptyState, keepEmpty = false, title = "ดูต่อจากที่ค้างไว้", sub, moreLink = true }: { emptyState: ReactNode; keepEmpty?: boolean; title?: string; sub?: string; moreLink?: boolean }) {
  const lite = useCatalogLite();
  const [list, setList] = useState<ReturnType<typeof Progress.list> | null>(null);
  useEffect(() => { const calc = () => setList(Progress.list(lite.by)); calc(); return subscribe(calc); }, [lite]);
  const empty = !list || list.length === 0;
  if (empty && !keepEmpty) return <section className="sec" id="contSec" hidden />;
  return (
    <section className="sec" id="contSec">
      <div className="sec-h"><h2>{title}</h2>{moreLink && <Link className="more" href={`${U.library}?tab=continue`}>ทั้งหมด <Icon name="right" cls="sm" /></Link>}</div>
      {sub && <p className="sec-sub">{sub}</p>}
      <div id="contRail">
        {empty ? emptyState : <Rail wide>{list!.map((it) => <ContCard key={it.s.slug} s={it.s as SeriesLiteFull} ep={it.ep} pct={it.pct} />)}</Rail>}
      </div>
    </section>
  );
}

export function FollowRail() {
  const lite = useCatalogLite();
  const [f, setF] = useState<string[]>([]);
  useEffect(() => { const calc = () => setF(Follows.list().filter((k) => lite.by[k])); calc(); return subscribe(calc); }, [lite]);
  if (!f.length) return <section className="sec" id="followSec" hidden />;
  return (
    <section className="sec" id="followSec">
      <div className="sec-h"><h2>ติดตามไว้</h2><Link className="more" href={`${U.library}?tab=following`}>ทั้งหมด <Icon name="right" cls="sm" /></Link></div>
      <div id="followRail"><Rail>{f.map((k) => <PosterCardLite key={k} s={lite.by[k]} />)}</Rail></div>
    </section>
  );
}

export function RandomButton() {
  const lite = useCatalogLite();
  const click = () => {
    const dn = Progress.done(), cont = Progress.all();
    let pool = lite.series.filter((s) => !dn[s.slug] && !cont[s.slug]);
    if (!pool.length) pool = lite.series;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) location.href = U.watch(pick.slug, 1);
  };
  return (
    <button type="button" className="btile" id="randomBtn" onClick={click}>
      <h3>สุ่มเรื่องให้ฉัน</h3>
      <p>กดครั้งเดียว ได้เรื่องที่ยังไม่เคยดู พร้อมเล่นตอนแรกทันที</p>
      <span className="btn btn-ghost"><Icon name="sparkle" cls="sm" /> สุ่มเลย</span>
    </button>
  );
}

/* ฮีโร่ 3 เรื่อง: scroll-snap + จุดเลือก */
export function HeroDots({ titles }: { titles: string[] }) {
  const [i, setI] = useState(0);
  const trackRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const track = document.getElementById("heroTrack"); trackRef.current = track;
    if (!track) return;
    const on = () => setI(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    track.addEventListener("scroll", on, { passive: true });
    return () => track.removeEventListener("scroll", on);
  }, []);
  const go = (n: number) => trackRef.current?.scrollTo({ left: trackRef.current.clientWidth * n, behavior: "smooth" });
  return (
    <div className="dots" role="tablist" aria-label="เลือกเรื่องเด่น">
      {titles.map((t, n) => <button key={n} type="button" role="tab" aria-selected={i === n} aria-label={t} data-hero={n} onClick={() => go(n)} />)}
    </div>
  );
}

/* ชิปกรองแนวของรายการ "ตอนใหม่ล่าสุด" — กรอง .ep-row ด้วย data-genres (ลิงก์ยังอยู่ครบใน HTML เพื่อ SEO) */
export function GenreFilterChips({ genres, listId = "newList", emptyId = "newEmpty" }: { genres: { slug: string; label: string }[]; listId?: string; emptyId?: string }) {
  const [g, setG] = useState("all");
  useEffect(() => {
    const list = document.getElementById(listId); if (!list) return;
    let shown = 0;
    list.querySelectorAll<HTMLElement>(".ep-row").forEach((r) => { const ok = g === "all" || (r.dataset.genres || "").split(" ").includes(g); r.hidden = !ok; if (ok) shown++; });
    const em = document.getElementById(emptyId); if (em) em.hidden = shown > 0;
  }, [g, listId, emptyId]);
  return (
    <div className="chips" role="group" aria-label="กรองตามแนว" id="homeChips">
      <button type="button" className="chip" aria-pressed={g === "all"} data-filter="all" onClick={() => setG("all")}>ทั้งหมด</button>
      {genres.map((x) => <button key={x.slug} type="button" className="chip" aria-pressed={g === x.slug} data-filter={x.slug} onClick={() => setG(x.slug)}>{x.label}</button>)}
    </div>
  );
}
