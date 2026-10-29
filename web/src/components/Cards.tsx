import Link from "next/link";
import type { ReactNode } from "react";
import type { Catalog, Series } from "@/lib/content";
import { U } from "@/lib/urls";
import { CoverImg } from "./CoverImg";
import { Icon } from "./Icon";

export const AiBadge = () => <span className="tag tag-ai">AI</span>;
export const NewBadge = () => <span className="tag tag-new">ใหม่</span>;
export const DoneBadge = () => <span className="tag tag-done">จบแล้ว</span>;
export const FreeBadge = () => <span className="tag tag-free">ดูฟรีทุกตอน</span>;

/* ป้ายยอดวิวแสดงเฉพาะเมื่อมีระบบวัดจริง (ADR-001 §12.2 C1 · V12) — ไม่มี = ไม่มีป้าย */
export function Poster({ s, c, badges, showViews = true, lazy = true, alt = null, sizes }: { s: Series; c: Catalog; badges?: ReactNode; showViews?: boolean; lazy?: boolean; alt?: string | null; sizes?: string }) {
  const hasViews = showViews && c.hasViews && s.views != null;
  return (
    <span className="poster" style={{ "--c1": s.c1, "--c2": s.c2 } as React.CSSProperties}>
      <CoverImg s={s} lazy={lazy} alt={alt} sizes={sizes} />
      {showViews && <span className="scrim" />}
      {badges && <span className="tl">{badges}</span>}
      {hasViews && <span className="bl"><span className="views"><Icon name="eye" cls="sm" /><span className="num">{s.views}</span></span></span>}
    </span>
  );
}

export function Card({ s, c, cls = "", hook = false, badges, showViews, lazy, alt, sizes }: { s: Series; c: Catalog; cls?: string; hook?: boolean; badges?: ReactNode; showViews?: boolean; lazy?: boolean; alt?: string | null; sizes?: string }) {
  const b = badges === undefined ? (<><AiBadge />{c.isDaily(s) && <NewBadge />}</>) : badges;
  return (
    <Link className={`card ${cls}`.trim()} href={U.series(s.slug)}>
      <Poster s={s} c={c} badges={b} showViews={showViews} lazy={lazy} alt={alt} sizes={sizes} />
      <span className="t">{s.title}</span>
      <span className="m">{c.genreLabel(s.genres[0])} · {s.eps} ตอน</span>
      {hook && <span className="hook">{s.hook}</span>}
    </Link>
  );
}

export function RankCard({ s, c, n }: { s: Series; c: Catalog; n: number }) {
  return (
    <Link className={`card rankcard${n <= 3 ? " top3" : ""}`} href={U.series(s.slug)} aria-label={`อันดับ ${n} ${s.title}`}>
      <span className="pw"><Poster s={s} c={c} badges={<AiBadge />} /><span className="rk num" aria-hidden="true">{n}</span></span>
      <span className="t">{s.title}</span>
      <span className="m">{c.hasViews && s.views != null ? `${s.views} วิว · ` : ""}{s.eps} ตอน</span>
    </Link>
  );
}

/* แถวตอน — ทั้งแถวเป็นลิงก์จริงไปหน้าตอน · data-genres ให้ตัวกรองแนวฝั่งเบราว์เซอร์ */
export function EpRow({ s, c, n, isNew = false }: { s: Series; c: Catalog; n: number; isNew?: boolean }) {
  const e = s.episodes[n - 1];
  return (
    <Link className="ep-row" href={U.watch(s.slug, n)} data-genres={s.genres.join(" ")}>
      <span className="th"><CoverImg s={s} sizes="76px" /></span>
      <span className="bd">
        <span className="h"><b className="num" lang="en">EP.{n}</b>{isNew && <NewBadge />}<span className="et">{e?.title}</span></span>
        <span className="st">{s.title} · {e?.mmss} นาที · {s.genres.map(c.genreLabel).join(" · ")}</span>
      </span>
      <span className="r"><Icon name="right" cls="sm" /></span>
    </Link>
  );
}

export function SeriesRow({ s, c, badge, rank, meta }: { s: Series; c: Catalog; badge?: ReactNode; rank?: number; meta: string }) {
  return (
    <Link className="ep-row" href={U.series(s.slug)}>
      {rank !== undefined && <span className="rkn num">{rank}</span>}
      <span className="th"><CoverImg s={s} sizes="76px" /></span>
      <span className="bd"><span className="h"><b className="tt">{s.title}</b>{badge}</span><span className="st">{meta}</span></span>
      <span className="r"><Icon name="right" cls="sm" /></span>
    </Link>
  );
}
