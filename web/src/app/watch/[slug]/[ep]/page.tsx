/* กลุ่ม B2 — หน้ารับชม (พอร์ตจาก build/pages-watch.mjs buildWatch · ux-spec §2.3)
   URL คงเดิม /watch/<slug>/ep-<n>/ — Next ไม่รองรับ segment แบบผสม `ep-[n]` จึงรับทั้งก้อนเป็น [ep]
   แล้วแกะเลขตอนจาก "ep-<n>" เอง · รูปอื่น (เช่น /watch/x/24/) = 404
   หมายเหตุความซื่อสัตย์: ถ้าตอนนั้นยังไม่มีไฟล์วิดีโอ เพลเยอร์เป็นตัวจำลองเวลา — บอกไว้ตรง ๆ ใต้เพลเยอร์
   แต่ "การบันทึกความคืบหน้า" ที่อยู่บนมันเป็นของจริงทั้งหมด (AC-2) */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, coverSlot } from "@/lib/content";
import { pageMetadata, watchTitle, watchDesc, tvEpisodeLd, breadcrumbLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Header, BottomNav, Footer, Crumbs, Section, FreeAllBar, JsonLd } from "@/components/Layout";
import { CoverImg } from "@/components/CoverImg";
import { Icon } from "@/components/Icon";
import { EpGrid } from "@/components/client/EpGrid";
import { Player } from "@/components/client/Player";

type Params = Promise<{ slug: string; ep: string }>;

export const dynamicParams = true;
export async function generateStaticParams() {
  const c = await getCatalog();
  return c.series.flatMap((s) => s.episodes.map((e) => ({ slug: s.slug, ep: `ep-${e.n}` })));
}

/* segment ต้องเป็น "ep-<เลขตอนที่มีอยู่จริง>" — อย่างอื่น 404 */
const epNum = (raw: string, eps: number) => {
  const m = /^ep-(\d+)$/.exec(raw);
  const n = m ? +m[1] : 0;
  return n >= 1 && n <= eps ? n : null;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, ep: raw } = await params;
  const c = await getCatalog();
  const s = c.by[slug];
  const n = s ? epNum(raw, s.eps) : null;
  if (!s || !n) return {};
  const e = s.episodes[n - 1];
  return pageMetadata({
    url: U.watch(s.slug, n),
    title: watchTitle(s, n),
    desc: watchDesc(s, n),
    /* AIO-19 S1b — เปิดดัชนีเฉพาะตอนที่ 1 ของแต่ละเรื่อง · ตอน 2 ขึ้นไป noindex,follow */
    noindex: n !== 1,
    og: { type: "video.episode", title: `${s.title} EP.${n} ${e.title}`, image: coverSlot(s), imageAlt: `ปก ${s.title}` },
  });
}

export default async function WatchPage({ params }: { params: Params }) {
  const { slug, ep: raw } = await params;
  const c = await getCatalog();
  const s = c.by[slug];
  if (!s) notFound();
  const n = epNum(raw, s.eps);
  if (!n) notFound();
  const e = s.episodes[n - 1];
  const prev = n > 1 ? n - 1 : null;
  const next = n < s.eps ? n + 1 : null;
  const g0 = s.genres[0];
  const seriesHref = U.series(s.slug);
  const episodes = s.episodes.map((x) => ({ n: x.n, title: x.title, mmss: x.mmss }));

  return (
    <>
      <JsonLd data={[
        tvEpisodeLd(c, s, n),
        breadcrumbLd(c, [["หน้าแรก", U.home], [c.genreLabel(g0), U.genre(g0)], [s.title, seriesHref], [`EP.${n}`, U.watch(s.slug, n)]]),
      ]} />
      <Header back={[s.title, seriesHref]} />
      <main id="main" className="page watch-page"><div className="wrap">
        <div className="watch-col">
          <div>
            {/* ทิศถูก "เขียนลงบนกล่องเพลเยอร์" จากข้อมูล ไม่ใช่ให้ JS/CSS เดาตอนรัน (ADR-001 §13.7 D7)
                โปสเตอร์ในกล่องขอทรง `auto` = ตามทิศของเรื่อง: ภาพนี้คือเฟรมแรกแทนวิดีโอ */}
            <Player
              key={`${s.slug}-${n}`}
              slug={s.slug}
              ep={n}
              title={s.title}
              epTitle={e.title}
              mmss={e.mmss}
              dur={e.durationSec}
              orientation={s.orientation}
              nextHref={next ? U.watch(s.slug, next) : ""}
              seriesHref={seriesHref}
              videoUrl={e.videoUrl}
              posterUrl={coverSlot(s, "auto").url}
              cover={<CoverImg s={s} shape="auto" lazy={false} sizes="(min-width:960px) 720px, 100vw" />}
            />
            {!e.videoUrl && (
              <p className="note-ex player-note"><Icon name="info" cls="sm" /><span>ยังไม่มีไฟล์วิดีโอในระบบ — ตัวเล่นนี้เดินเวลาแบบจำลองเพื่อให้ทดสอบการจำตอนที่ดูค้างได้จริง</span></p>
            )}
          </div>
          <div>
            <Crumbs items={[["หน้าแรก", U.home], [c.genreLabel(g0), U.genre(g0)], [s.title, seriesHref], [`EP.${n}`, null]]} />
            <h1 className="h1-series" id="epTitle"><span lang="en">EP.{n}</span> {e.title}</h1>
            <div className="facts">
              <span className="num">ตอนที่ {n} จาก {s.eps}</span>
              <span>{e.mmss} นาที</span>
              <span>{s.genres.map(c.genreLabel).join(" · ")}</span>
            </div>
            <div className="ep-nav">
              {prev && <Link className="btn btn-ghost btn-md" href={U.watch(s.slug, prev)} rel="prev"><Icon name="left" cls="sm" /> EP.{prev}</Link>}
              {next
                ? <Link className="btn btn-accent btn-md" href={U.watch(s.slug, next)} rel="next">EP.{next} {s.episodes[next - 1].title} <Icon name="right" cls="sm" /></Link>
                : <Link className="btn btn-accent btn-md" href={seriesHref}><Icon name="checkc" cls="sm" /> ตอนสุดท้ายของเรื่องนี้</Link>}
            </div>
            <FreeAllBar c={c} />
            <Section title="เลือกตอน">
              <EpGrid key={`${s.slug}-${n}`} slug={s.slug} eps={s.eps} episodes={episodes} current={n} />
            </Section>
            <Section title="เกี่ยวกับเรื่องนี้">
              <p className="syn">{s.synopsis}</p>
              <Link className="btn btn-ghost btn-md" href={seriesHref}>ดูรายละเอียดเรื่องทั้งหมด <Icon name="right" cls="sm" /></Link>
            </Section>
          </div>
        </div>
      </div><Footer c={c} /></main>
      <BottomNav />
    </>
  );
}
