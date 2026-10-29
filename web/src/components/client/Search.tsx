"use client";
/* ค้นหา (ส่วน 13 ของ app.src.js รุ่น static) — HTML จากเซิร์ฟเวอร์คือกริดทั้งคลัง (children)
   พอผู้ชมพิมพ์/เลือกแนว/มาพร้อม ?q= ฝั่งเบราว์เซอร์กรองแล้ววาดกริดของตัวเองแทน (การ์ดแบบ posterCardHtml) */
import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../Icon";
import { PosterCardLite } from "./HomeBits";
import { useCatalogLite } from "./CatalogContext";

const noopSubscribe = () => () => {};

export function Search({ genres, popular, noRes, children }: { genres: { slug: string; label: string }[]; popular: string[]; noRes: ReactNode; children: ReactNode }) {
  const lite = useCatalogLite();
  /* ?q= จาก URL — อ่านฝั่งเบราว์เซอร์เท่านั้น (เซิร์ฟเวอร์เห็นเป็นค่าว่าง ⇒ หน้ายัง static) */
  const urlQ = useSyncExternalStore(noopSubscribe, () => new URLSearchParams(location.search).get("q") || "", () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [genre, setGenre] = useState("all");
  const [touched, setTouched] = useState(false);
  const qRef = useRef<HTMLInputElement>(null);
  const term = typed ?? urlQ;
  const ran = touched || !!urlQ;
  const setTerm = (v: string) => { setTyped(v); setTouched(true); };

  const q = term.trim().toLowerCase();
  const list = useMemo(() => lite.series.filter((s) => {
    const hay = `${s.title} ${s.hook} ${s.synopsis} ${s.cast.join(" ")} ${s.genres.map((g) => lite.genreLabel[g]).join(" ")}`.toLowerCase();
    return (genre === "all" || s.genres.includes(genre)) && (!q || hay.includes(q));
  }), [lite, genre, q]);

  const filtered = q || genre !== "all";
  const pick = (g: string) => { setGenre(g); setTouched(true); };
  return (
    <>
      <div className="search-head">
        <div className="search-box"><span className="ic"><Icon name="search" /></span>
          <input ref={qRef} id="q" type="search" placeholder="ค้นหาชื่อเรื่อง ตัวละคร หรือแนว" aria-label="ค้นหาละคร" autoComplete="off"
            value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="chips" id="searchChips" role="group" aria-label="กรองตามแนว">
          <button type="button" className="chip" aria-pressed={genre === "all"} data-filter="all" onClick={() => pick("all")}>ทั้งหมด</button>
          {genres.map((g) => <button key={g.slug} type="button" className="chip" aria-pressed={genre === g.slug} data-filter={g.slug} onClick={() => pick(g.slug)}>{g.label}</button>)}
        </div>
      </div>
      <section className="sec" id="recentWrap" hidden={!!q}><div className="sec-h"><h2>คำค้นยอดนิยม</h2></div>
        <div className="chip-row">{popular.map((p) => (
          <button key={p} type="button" className="chip" data-q={p} onClick={() => { setTerm(p); qRef.current?.focus(); }}>{p}</button>
        ))}</div>
      </section>
      <p className="res-count" id="resCount">
        {filtered ? <>พบ <b className="num">{list.length}</b> เรื่อง</> : <>ทุกเรื่องในคลัง {lite.series.length} เรื่อง</>}
      </p>
      {ran
        ? <div className="grid">{list.map((s) => <PosterCardLite key={s.slug} s={s} />)}</div>
        : children}
      <div id="noRes" hidden={!ran || list.length > 0}>{noRes}</div>
    </>
  );
}
