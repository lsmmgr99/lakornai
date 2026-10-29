/* กลุ่ม B1 — รายละเอียดเรื่อง (พอร์ตจาก build/pages-watch.mjs buildSeries · ux-spec §2.3) */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, coverSlot } from "@/lib/content";
import { pageMetadata, seriesTitle, seriesDesc, tvSeriesLd, breadcrumbLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, Crumbs, Section, FreeAllBar, SampleNote, JsonLd } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { AiBadge, Poster, Card } from "@/components/Cards";
import { Rail } from "@/components/client/Rail";
import { FollowButton, ShareButton, ResumeLink } from "@/components/client/Buttons";
import { EpGrid } from "@/components/client/EpGrid";

type Params = Promise<{ slug: string }>;

export const dynamicParams = true;
export async function generateStaticParams() {
  const c = await getCatalog();
  return c.series.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCatalog();
  const s = c.by[slug];
  if (!s) return {};
  return pageMetadata({
    url: U.series(s.slug),
    title: seriesTitle(s),
    desc: seriesDesc(s),
    og: { type: "video.tv_show", title: `${s.title} — ละครสั้น AI ${s.eps} ตอน ดูฟรีทุกตอน`, image: coverSlot(s), imageAlt: `ปก ${s.title}` },
  });
}

export default async function SeriesPage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = await getCatalog();
  const s = c.by[slug];
  if (!s) notFound();
  const g0 = s.genres[0];
  /* แถว chip ของหน้าเรื่อง = หมวด + "แท็กที่เปิดแล้วและครอบเรื่องนี้" (AIO-33) */
  const tags = c.openTagsOf(s);
  const avatarStyle = { "--c1": s.c1, "--c2": s.c2 } as React.CSSProperties;

  return (
    <Shell c={c}>
      <JsonLd data={[tvSeriesLd(c, s), breadcrumbLd(c, [["หน้าแรก", U.home], [c.genreLabel(g0), U.genre(g0)], [s.title, U.series(s.slug)]])]} />
      <Crumbs items={[["หน้าแรก", U.home], [c.genreLabel(g0), U.genre(g0)], [s.title, null]]} />
      <div className="two-col">
        <div className="sd-cover"><Poster s={s} c={c} badges={<AiBadge />} showViews={false} lazy={false} alt={`ปก ${s.title} — ละครสั้น AI ${c.genreLabel(g0)}`} /></div>
        <div>
          <h1 className="h1-series">{s.title}</h1>
          <div className="facts">
            <span>{s.genres.map(c.genreLabel).join(" · ")}</span>
            <span className="num">{s.eps} ตอน</span>
            <span>{s.status}</span>
            {/* ไม่มีระบบวัดผู้ชม = ไม่มีบรรทัดยอดวิวเลย (ADR-001 §12.2 C1 · V12) */}
            {c.hasViews && s.views != null && <span className="views"><Icon name="eye" cls="sm" /><span className="num">{s.views}</span> วิว</span>}
          </div>
          <div className="btn-row">
            <ResumeLink slug={s.slug} cls="btn btn-accent btn-main" />
            <FollowButton slug={s.slug} cls="btn btn-ghost" withText title={s.title} />
            <ShareButton label="แชร์เรื่องนี้" />
          </div>
          <FreeAllBar c={c} />
          <p className="hook-lead">{s.hook}</p>
          <p className="syn">{s.synopsis}</p>
          <div className="chips">
            {s.genres.map((g) => <Link key={g} className="chip" href={U.genre(g)}>{c.genreLabel(g)}</Link>)}
            {tags.map((t) => <Link key={t.slug} className="chip" href={U.tag(t.slug)}>{t.chip}</Link>)}
          </div>
          <Section title="เลือกตอน">
            <EpGrid slug={s.slug} eps={s.eps} episodes={s.episodes.map((e) => ({ n: e.n, title: e.title, mmss: e.mmss }))} />
          </Section>
          <Section title="ตัวละคร">
            <div className="castrow">
              {s.cast.map((name) => {
                const inner = <><span className="avatar" style={avatarStyle} aria-hidden="true">{name[0]}</span><span>{name}</span></>;
                return c.hasCastPage(name)
                  ? <Link key={name} href={U.cast(name)}>{inner}</Link>
                  : <span key={name} className="castone">{inner}</span>;
              })}
            </div>
          </Section>
          <Section title="เรื่องที่คล้ายกัน">
            <Rail>{c.similar(s).map((x) => <Card key={x.slug} s={x} c={c} />)}</Rail>
          </Section>
          {/* หมายเหตุผูกกับ viewsSource ไม่เขียนตายไว้ (ADR-001 §12.2 C4) */}
          {c.hasViews && <SampleNote>ยอดวิวเป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง</SampleNote>}
        </div>
      </div>
    </Shell>
  );
}
