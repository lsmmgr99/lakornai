"use client";
/* เพลเยอร์หน้ารับชม — พอร์ตจาก build/app.src.js §9 initWatch (AC-2 หัวใจ: จำตอนที่ดูค้าง)
   - ไม่มีไฟล์วิดีโอ (videoUrl = null) ⇒ เดินเวลาแบบจำลองที่ 6 เท่า เหมือนเว็บรุ่น static
   - มีไฟล์วิดีโอ ⇒ <video> จริง และอ่านความคืบหน้าจาก timeupdate/ended แทนตัวจับเวลา
   - การบันทึกความคืบหน้า (คีย์/รูปข้อมูลใน localStorage) เหมือนเดิมทุกจุด:
     เขียนทันทีที่เปิดตอน · throttle 2 ชั้น (≥5 วิของเนื้อหา และ ≥1 วิจริง) · เขียนตอนออกจากหน้า
     ดูจบตอน → จุดค้างเลื่อนไปต้นตอนถัดไป · ดูจบเรื่อง → ย้ายไป "ดูจบแล้ว" */
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Progress, getSettings, fmt } from "@/lib/progress";
import { U } from "@/lib/urls";
import { Icon } from "../Icon";
import { Rail } from "./Rail";
import { FollowButton, ShareButton } from "./Buttons";
import { PosterCardLite } from "./HomeBits";
import { toast } from "./toast";
import { useCatalogLite, coverSlotLite, type SeriesLiteFull } from "./CatalogContext";

export interface PlayerProps {
  slug: string;
  ep: number;
  title: string;
  epTitle: string;
  mmss: string;
  /** ความยาวตอน (วินาที) จากฐานข้อมูล */
  dur: number;
  orientation: "vertical" | "horizontal";
  nextHref: string;
  seriesHref: string;
  videoUrl: string | null;
  /** ปก (CoverImg เรนเดอร์จากเซิร์ฟเวอร์) — ใช้เป็นเฟรมแรกเมื่อไม่มีวิดีโอ */
  cover: ReactNode;
  /** ปกสำหรับ poster ของ <video> */
  posterUrl: string;
}

interface NextUpState { auto: boolean; left: number }
interface EndCardState { nextS: SeriesLiteFull; similar: SeriesLiteFull[] }

const COUNTDOWN = 5;
const VIDEO_STYLE: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

export function Player(p: PlayerProps) {
  const { slug, ep, nextHref, seriesHref, videoUrl } = p;
  const lite = useCatalogLite();
  const s = lite.by[slug];

  const [t, setT] = useState(0);
  const [dur, setDur] = useState(p.dur);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [nextUp, setNextUp] = useState<NextUpState | null>(null);
  const [endCard, setEndCard] = useState<EndCardState | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barWrapRef = useRef<HTMLDivElement | null>(null);
  const endCardRef = useRef<HTMLDivElement | null>(null);
  /* สถานะที่ตัวจัดการเหตุการณ์ต้องอ่าน/เขียนแบบ mutable (ไม่ผ่านรอบ render) */
  const m = useRef({ t: 0, dur: p.dur, timer: null as ReturnType<typeof setInterval> | null, tick: null as ReturnType<typeof setInterval> | null,
    lastWrite: 0, lastWriteSec: -99, ended: false, epDone: false, playing: false, muted: true });
  /* คำสั่งที่ปุ่ม/คีย์บอร์ดเรียก — เติมจาก effect ตอน mount */
  const api = useRef<{ toggle: () => void; seek: (sec: number) => void; mute: () => void; cancelNext: () => void }>({ toggle: () => {}, seek: () => {}, mute: () => {}, cancelNext: () => {} });

  useEffect(() => {
    if (!s) return;
    const st = m.current;
    const by = lite.by;
    const video = videoRef.current;

    /* 9.1 — แมปลิงก์เก่าแบบ #ep<n> มาที่ path จริง (fragment ไม่ถูกส่งไปกับ HTTP request → ทำที่หน้าปลายทาง) */
    const hash = location.hash.match(/^#ep(\d+)$/);
    if (hash) {
      const want = Math.min(Math.max(+hash[1], 1), s.eps);
      if (want !== ep) { location.replace(U.watch(slug, want)); return; }
      history.replaceState(null, "", location.pathname + location.search);
    }

    /* 9.2 — กลับมาต่อจากตำแหน่งเดิม: ?t=<วินาที> จากลิงก์ "ดูต่อ" · ไม่มีก็ใช้ค่าที่บันทึกไว้ของตอนนี้
       ค่าที่เกินความยาวตอน = ลิงก์หมดอายุ ปฏิเสธทิ้ง (ไม่หนีบเป็น dur-1 ไม่งั้นกลายเป็น "ดูไปแล้ว 99%") */
    const qs = new URLSearchParams(location.search);
    const fromQuery = parseInt(qs.get("t") || "", 10);
    const saved = Progress.get(by, slug);
    const wanted = !isNaN(fromQuery) && fromQuery > 0 && fromQuery < st.dur ? fromQuery : 0;
    if (wanted) st.t = wanted;
    else if (saved && saved.ep === ep && saved.sec > 2 && saved.sec < st.dur - 2) st.t = saved.sec;
    if (st.t > 0) toast("ดูต่อจากนาทีที่ " + fmt(st.t));

    const paint = () => { setT(st.t); setDur(st.dur); };

    /* 9.3 — เขียนความคืบหน้ากลับ localStorage · ยาม epDone อยู่ที่นี่ที่เดียว */
    const persist = (force: boolean) => {
      if (st.epDone) return;
      const now = Date.now();
      if (!force && (now - st.lastWrite < 1000 || Math.abs(st.t - st.lastWriteSec) < 5)) return;
      st.lastWrite = now; st.lastWriteSec = st.t;
      Progress.set(by, slug, ep, st.t, st.dur);
    };

    const setPlay = (on: boolean) => { st.playing = on; setPlaying(on); };

    const stop = () => {
      if (st.timer) { clearInterval(st.timer); st.timer = null; }
      if (video) video.pause();
      setPlay(false);
      persist(true);
      paint();
    };

    /* UX §6.26 — การ์ดตอนถัดไป นับถอยหลัง 5 วินาที (region + aria-live ไม่ใช่ dialog) */
    const showNextUp = () => {
      if (!nextHref || !s.episodes[ep]) return;
      const auto = getSettings().autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let left = COUNTDOWN;
      setNextUp({ auto, left });
      if (st.tick) clearInterval(st.tick);
      st.tick = auto ? setInterval(() => {
        left -= 1;
        if (left <= 0) { if (st.tick) clearInterval(st.tick); st.tick = null; location.href = nextHref; return; }
        setNextUp({ auto, left });
      }, 1000) : null;
    };

    /* UX §6.25 — การ์ดจบเรื่อง (dialog) · ห้ามเป็นทางตาย */
    const showEndCard = () => {
      let pool = lite.series.filter((x) => x.slug !== slug && x.genres.some((g) => s.genres.includes(g)));
      if (!pool.length) pool = lite.series.filter((x) => x.slug !== slug);
      if (!pool.length) return;
      const dn = Progress.done();
      const unseen = pool.filter((x) => !dn[x.slug]);
      const nextS = unseen[0] || pool[0];
      const similar = pool.filter((x) => x.slug !== nextS.slug).slice(0, 6);
      setEndCard({ nextS, similar });
    };

    /* 9.4 — ดูจบตอน */
    const finishEpisode = () => {
      if (st.timer) { clearInterval(st.timer); st.timer = null; }
      setPlay(false);
      st.ended = true; st.epDone = true;
      paint();
      if (ep < s.eps) {
        /* จุดที่ควรดูต่อคือ "ต้นตอนถัดไป" — รายการค้างอัปเดตเองทันที */
        Progress.set(by, slug, ep + 1, 0, s.episodes[ep].durationSec);
        showNextUp();
      } else {
        Progress.finish(slug);       /* ดูจบเรื่อง → ออกจากรายการค้าง ไปที่ "ดูจบแล้ว" */
        showEndCard();
      }
    };

    const play = () => {
      if (st.ended) return;
      setPlay(true);
      persist(true);
      if (video) {
        video.play().catch(() => { setPlay(false); });
      } else {
        st.timer = setInterval(() => {
          st.t += 1;
          if (st.t >= st.dur) { st.t = st.dur; finishEpisode(); return; }
          persist(false);
          paint();
        }, 1000 / 6);    /* จำลองการเล่นที่ 6 เท่า — ยังไม่มีไฟล์วิดีโอจริงในระบบ */
      }
      paint();
    };

    /* เลื่อนเวลา = "ตั้งใจดูตอนนี้ (ซ้ำ)" จึงปลดธง ended/epDone แล้วเขียนกลับได้ */
    const seek = (sec: number) => {
      st.t = Math.max(0, Math.min(st.dur - 1, Math.round(sec)));
      st.ended = false; st.epDone = false;
      if (st.tick) { clearInterval(st.tick); st.tick = null; }
      setNextUp(null);
      if (video) video.currentTime = st.t;
      persist(true); paint();
    };

    api.current = {
      toggle: () => { if (st.playing) stop(); else play(); },
      seek,
      mute: () => { st.muted = !st.muted; if (video) video.muted = st.muted; setMuted(st.muted); },
      cancelNext: () => { if (st.tick) { clearInterval(st.tick); st.tick = null; } setNextUp(null); },
    };

    /* <video> จริง: ความยาว/เวลาจากไฟล์ แทนตัวจับเวลา */
    const onMeta = () => {
      if (!video) return;
      if (Number.isFinite(video.duration) && video.duration > 0) st.dur = Math.round(video.duration);
      if (st.t > 0 && st.t < st.dur) video.currentTime = st.t;
      paint();
    };
    const onTime = () => {
      if (!video || st.ended) return;
      st.t = Math.floor(video.currentTime);
      persist(false); paint();
    };
    const onEnded = () => { st.t = st.dur; finishEpisode(); };
    const onPause = () => { if (st.playing && !st.ended) stop(); };
    const onPlay = () => { if (!st.playing) setPlay(true); };
    if (video) {
      video.muted = true;
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("timeupdate", onTime);
      video.addEventListener("ended", onEnded);
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);
      if (video.readyState >= 1) onMeta();
    }

    /* คีย์บอร์ด (UX §7.4) */
    const onKey = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tgt = ev.target as HTMLElement | null;
      const hit = (sel: string) => !!(tgt && tgt.closest && tgt.closest(sel));
      if (/input|textarea|select/i.test(tgt?.tagName || "") || hit("input, textarea, select, [contenteditable]")) return;
      const k = ev.key.toLowerCase();
      /* Space บนปุ่ม/ลิงก์ที่โฟกัสอยู่เป็นของตัวมันเอง ห้ามแย่ง (ปุ่ม "ยกเลิก" ต้องกดด้วยคีย์บอร์ดได้) */
      if (k === " " && hit("button, a[href]")) return;
      /* ตอนนี้ดูจบแล้ว → ลูกศรเป็นปุ่มสำรวจการ์ด ไม่ใช่ปุ่มเลื่อนเวลา */
      if (st.ended && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) return;
      if (k === " " || k === "k") { ev.preventDefault(); api.current.toggle(); }
      else if (ev.key === "ArrowRight") { st.t = Math.min(st.dur - 1, st.t + 5); if (video) video.currentTime = st.t; persist(true); paint(); }
      else if (ev.key === "ArrowLeft") { st.t = Math.max(0, st.t - 5); if (video) video.currentTime = st.t; persist(true); paint(); }
      else if (k === "n" && nextHref) location.href = nextHref;
      else if (k === "m") api.current.mute();
    };
    document.addEventListener("keydown", onKey);

    /* เขียนกลับเมื่อออกจากหน้า — กันกรณีปิดแท็บกลางคัน */
    const flush = () => persist(true);
    const onVis = () => { if (document.visibilityState === "hidden") { if (st.playing) stop(); else flush(); } };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);

    /* บันทึกทันทีที่เปิดตอน — "เปลี่ยนตอน" คือจุดที่ต้องเขียนกลับตามโจทย์ */
    Progress.set(by, slug, ep, st.t, st.dur);
    paint();

    return () => {
      if (st.timer) clearInterval(st.timer);
      if (st.tick) clearInterval(st.tick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      if (video) {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("play", onPlay);
      }
    };
  }, [s, lite, slug, ep, nextHref]);

  /* การ์ดจบเรื่องเปิด → โฟกัสลิงก์แรก · Escape กลับหน้าเรื่อง */
  useEffect(() => {
    if (!endCard) return;
    const el = endCardRef.current; if (!el) return;
    el.querySelector<HTMLElement>(".ec-next")?.focus();
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") location.href = seriesHref || U.series(slug); };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [endCard, seriesHref, slug]);

  const onBarClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    /* ตอนการ์ดจบเรื่องเปิดอยู่ คลิกที่ลอดมาถึงแถบเวลาไม่ใช่เจตนาของผู้ใช้ */
    if (endCard) return;
    const el = barWrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    api.current.seek(((ev.clientX - r.left) / r.width) * m.current.dur);
  };

  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
  const nx = s?.episodes[ep];
  const nextThumb = s ? coverSlotLite(s, "poster") : null;

  return (
    <div className={`player${playing ? " playing" : ""}`} id="player" data-orientation={p.orientation} data-dur={p.dur} data-next={nextHref} data-series={seriesHref}>
      {videoUrl ? (
        <video ref={videoRef} src={videoUrl} poster={p.posterUrl} playsInline preload="metadata" muted style={VIDEO_STYLE} />
      ) : p.cover}
      <div className="vig" />
      <div className="ptop">
        <Link className="rnd" href={seriesHref} aria-label="กลับไปหน้าเรื่อง"><Icon name="left" /></Link>
        <span className="ti"><b>{p.title}</b><span className="num" lang="en">EP.{ep} · {p.epTitle}</span></span>
      </div>
      <button type="button" className="bigplay" id="playBtn" aria-label={playing ? "หยุดชั่วคราว" : "เล่น"} onClick={() => api.current.toggle()}><Icon name="playf" cls="lg" /></button>
      <div className="pstack">
        <div className="pfoot">
          {/* ไม่มีช่องซับไตเติลในสัญญาข้อมูล · `.ptext` คงไว้เป็นช่องยืดของ flex ให้แถวล่างวางตัวเหมือนแบบที่อนุมัติ */}
          <div className="ptext" />
          <div className="side">
            <button type="button" className={`b${muted ? " on" : ""}`} id="muteBtn" aria-label={muted ? "เปิดเสียง (ตอนนี้ปิดเสียงอยู่)" : "ปิดเสียง (ตอนนี้เปิดเสียงอยู่)"} onClick={() => api.current.mute()}><Icon name="mute" /></button>
            <span className="lb">{muted ? "ปิดเสียง" : "เปิดเสียง"}</span>
            <FollowButton slug={slug} cls="b" label="ติดตามเรื่องนี้" title={p.title} />
            <a className="b" href="#epGrid" aria-label="เลือกตอน"><Icon name="list" /></a>
            <ShareButton cls="b" label="แชร์ตอนนี้" />
          </div>
        </div>
        <div>
          <div ref={barWrapRef} className="bar" id="barWrap" role="progressbar" aria-label="ความคืบหน้าในตอนนี้" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} onClick={onBarClick}><i id="bar" style={{ width: `${pct}%` }} /></div>
          <div className="times"><span className="num" id="tNow">{fmt(t)}</span><span className="num" id="tDur">{dur === p.dur ? p.mmss : fmt(dur)}</span></div>
        </div>
      </div>
      {/* aria-atomic=false: ประกาศการ์ดครั้งเดียวตอนโผล่ ตัวเลขนับถอยหลังอยู่ในวง aria-hidden จึงไม่ถูกประกาศซ้ำทุกวินาที */}
      <section className="nextup" id="nextUp" role="region" aria-live="polite" aria-atomic="false" hidden={!nextUp}
        aria-label={nextUp ? `ตอนถัดไป EP.${ep + 1}${nextUp.auto ? ` เริ่มใน ${COUNTDOWN} วินาที` : ""}` : undefined}>
        {nextUp && nx && nextThumb && (
          <>
            <div className="nh">
              {nextUp.auto && <span className="ring" id="nuRing" style={{ "--p": `${((COUNTDOWN - nextUp.left) / COUNTDOWN) * 100}%` } as CSSProperties} aria-hidden="true"><b className="num" id="nuLeft">{nextUp.left}</b></span>}
              <span className="thumb"><img src={nextThumb.url} width={nextThumb.w} height={nextThumb.h} alt="" loading="lazy" decoding="async" /></span>
              <span className="nt"><b className="num">ตอนถัดไป · EP.{ep + 1}</b><span>{nx.title} · {nx.mmss} นาที</span></span>
            </div>
            <div className="na">
              <Link className="btn btn-accent" href={nextHref}>เล่นเลย</Link>
              <button type="button" className="btn btn-ghost" id="nuCancel" onClick={() => api.current.cancelNext()}>{nextUp.auto ? "ยกเลิก" : "ปิด"}</button>
            </div>
          </>
        )}
      </section>
      <div ref={endCardRef} className="endcard" id="endCard" role="dialog" aria-modal="true" aria-labelledby="ec-h" hidden={!endCard}>
        {endCard && s && (() => {
          const nt = coverSlotLite(endCard.nextS, "poster");
          return (
            <div className="in">
              <div className="ec-top">
                <span className="seal" aria-hidden="true"><Icon name="checkc" cls="lg" /></span>
                <h3 id="ec-h">ดูจบแล้วทั้ง {s.eps} ตอน</h3>
                <p>{s.title} — เรื่องนี้ย้ายไปอยู่ในแท็บ “ดูจบแล้ว” ของคลังคุณแล้ว</p>
              </div>
              <Link className="ec-next" href={U.watch(endCard.nextS.slug, 1)}>
                <span className="thumb"><img src={nt.url} width={nt.w} height={nt.h} alt="" loading="lazy" decoding="async" /></span>
                <span className="et"><span>ดูเรื่องถัดไป</span><b>{endCard.nextS.title}</b></span>
                <Icon name="playf" />
              </Link>
              <div className="ec-sec">
                <FollowButton slug={slug} cls="btn btn-ghost" withText title={s.title} />
                <ShareButton cls="btn btn-ghost">แชร์</ShareButton>
              </div>
              {endCard.similar.length > 0 && (
                <>
                  <div className="ec-hr" />
                  <div className="ec-rail">
                    <h4>เรื่องที่คล้ายกัน</h4>
                    <Rail>{endCard.similar.map((x) => <PosterCardLite key={x.slug} s={x} />)}</Rail>
                  </div>
                </>
              )}
              <Link className="ec-again" href={U.watch(slug, 1)}>ดูตั้งแต่ EP.1 อีกครั้ง</Link>
              <Link className="ec-again" href={seriesHref || U.series(slug)}>กลับไปหน้าเรื่อง</Link>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
