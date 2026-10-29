"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Follows, Progress, subscribe } from "@/lib/progress";
import { Icon } from "../Icon";
import { toast } from "./toast";
import { useCatalogLite } from "./CatalogContext";

/* ปุ่มติดตาม — สถานะอยู่ในเครื่องผู้ชม · กดแล้วทุกปุ่มของเรื่องเดียวกันบนหน้าอัปเดตพร้อมกัน */
export function FollowButton({ slug, cls = "icon-btn", label, withText = false, title }: { slug: string; cls?: string; label?: string; withText?: boolean; title?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const calc = () => setOn(Follows.has(slug)); calc(); return subscribe(calc); }, [slug]);
  const click = () => {
    const now = Follows.toggle(slug);
    if (now) { const first = !Follows.toldLocal(); toast(`ติดตาม ${title || ""} แล้ว${first ? " · บันทึกไว้ในเครื่องนี้" : ""}`); }
    else toast(`เลิกติดตาม ${title || ""}`);
  };
  return (
    <button type="button" className={cls} data-follow={slug} aria-pressed={on} aria-label={label || (withText ? undefined : `ติดตาม ${title || ""}`)} onClick={click}>
      <Icon name="heart" cls={withText ? "sm" : ""} />{withText && <> <em>{on ? "ติดตามแล้ว" : "ติดตาม"}</em></>}
    </button>
  );
}

export function ShareButton({ cls = "icon-btn", label = "แชร์", children }: { cls?: string; label?: string; children?: ReactNode }) {
  const click = () => {
    const link = location.href.split("#")[0];
    if (navigator.share) { navigator.share({ url: link }).catch(() => {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast("คัดลอกลิงก์แล้ว"), () => toast(link));
    else toast(link);
  };
  return <button type="button" className={cls} data-share aria-label={label} onClick={click}>{children ?? <Icon name="share" />}</button>;
}

/* ปุ่มหลัก "เริ่มดู EP.1" ที่กลายเป็น "ดูต่อ EP.n" เมื่อเครื่องนี้มีรายการค้าง */
export function ResumeLink({ slug, cls = "btn btn-accent" }: { slug: string; cls?: string }) {
  const lite = useCatalogLite();
  const [state, setState] = useState<{ href: string; label: string }>({ href: `/watch/${slug}/ep-1/`, label: "เริ่มดู EP.1" });
  useEffect(() => {
    const calc = () => setState({ href: Progress.resumeHref(lite.by, slug), label: Progress.resumeLabel(lite.by, slug) });
    calc();
    return subscribe(calc);
  }, [slug, lite]);
  return <Link className={cls} href={state.href} data-resume={slug}><Icon name="playf" cls="sm" /> <span data-resume-label>{state.label}</span></Link>;
}
