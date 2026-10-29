import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, websiteLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, Section, Empty, SampleNote, JsonLd } from "@/components/Layout";
import { CoverImg } from "@/components/CoverImg";
import { Icon } from "@/components/Icon";
import { AiBadge, FreeBadge, RankCard, EpRow } from "@/components/Cards";
import { Rail } from "@/components/client/Rail";
import { FollowButton, ShareButton, ResumeLink } from "@/components/client/Buttons";
import { ContinueRail, FollowRail, RandomButton, HeroDots, GenreFilterChips } from "@/components/client/HomeBits";
import { GenreBento } from "@/components/GenreBento";

export const HERO_WIDE_MEDIA = "(min-width:720px)";
const REEL_SLUGS = ["ceo-cold", "villainess-reborn", "one-night-bangkok"];

export async function generateMetadata(): Promise<Metadata> {
  const c = await getCatalog();
  const eps = c.series.reduce((a, s) => a + s.eps, 0);
  return pageMetadata({
    url: U.home,
    title: "ละครสั้น AI ภาษาไทย ดูฟรีทุกตอน · AiLakorn",
    desc: `ดูละครสั้น AI ภาษาไทย ${c.series.length} เรื่อง ${eps} ตอน ฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบทุกเรื่อง จำตอนที่ดูค้างไว้ให้ กดดูต่อได้ทันทีบนมือถือ`,
  });
}

export default async function Home() {
  const c = await getCatalog();
  const heroes = c.top10.slice(0, 3);
  const fresh = c.series.filter((s) => !s.ended).slice(0, 6);
  const reels = REEL_SLUGS.map((k) => c.by[k]).filter(Boolean).slice(0, 3);
  const reelFallback = reels.length ? reels : c.series.slice(0, 3);
  return (
    <Shell c={c} nav="home" active="home">
      <JsonLd data={websiteLd(c)} />
      <div className="intro">
        <h1>ละครสั้น AI ภาษาไทย ดูต่อได้ทุกตอน</h1>
        <p>{c.series.length} เรื่องไทยที่สร้างด้วย AI ตอนละไม่เกิน 3 นาที — <b className="free-c">{c.settings.freeLine}</b></p>
      </div>

      <section className="sec hero-sec" aria-label="เรื่องเด่นประจำสัปดาห์">
        <div className="hero-track" id="heroTrack">
          {heroes.map((s, i) => (
            <article className="hero" id={`hero-${i + 1}`} key={s.slug}>
              <div className="bg"><CoverImg s={s} lazy={i > 0} wideMedia={HERO_WIDE_MEDIA} sizes="(min-width:1280px) 1248px, 100vw" /></div>
              <div className="body">
                <span className="kick"><Icon name="sparkle" cls="sm" /> เรื่องเด่นประจำสัปดาห์</span>
                <h2><Link href={U.series(s.slug)}>{s.title}</Link></h2>
                <div className="facts"><AiBadge /><FreeBadge /><b className="num">{s.eps} ตอน</b><span>{s.genres.map(c.genreLabel).join(" · ")}</span><span>{s.status}</span></div>
                <p className="hk">{s.hook}</p>
                <div className="btn-row">
                  <ResumeLink slug={s.slug} />
                  <FollowButton slug={s.slug} title={s.title} />
                  <ShareButton label={`แชร์ ${s.title}`} />
                </div>
              </div>
            </article>
          ))}
        </div>
        <HeroDots titles={heroes.map((s) => s.title)} />
      </section>

      <ContinueRail emptyState={<Empty icon="playf" h="ยังไม่มีเรื่องที่ดูค้าง" p="กดดูสักตอน แล้วเว็บจะจำตอนและเวลาที่ค้างไว้ให้เอง — เก็บในเครื่องนี้เท่านั้น" btn={["เริ่มเลื่อนดูฟีด", U.feed]} />} />

      <section className="sec" aria-label="ฟีดแนวตั้ง">
        <div className="bento">
          <Link className="btile feedtile" href={U.feed}>
            <span className="reelstrip" aria-hidden="true">{reelFallback.map((s) => <span key={s.slug}><CoverImg s={s} sizes="120px" /></span>)}</span>
            <h3>ฟีดแนวตั้ง</h3>
            <p>ปัดขึ้นดูเรื่องถัดไป ไม่ต้องเลือกเอง — ทุกคลิปในฟีด<b className="free-c"> ดูฟรี ไม่ต้องสมัคร</b></p>
            <span className="btn btn-accent"><Icon name="feed" cls="sm" /> เริ่มเลื่อนดู</span>
          </Link>
          <RandomButton />
        </div>
      </section>

      <Section title="TOP 10 ในคลัง" more={["ดูอันดับทั้งหมด", U.popular]}>
        <Rail>{c.top10.map((s, i) => <RankCard key={s.slug} s={s} c={c} n={i + 1} />)}</Rail>
        <SampleNote>{c.hasViews ? "ยอดวิวและอันดับเป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง" : `ยังไม่ได้ต่อระบบวัดจำนวนผู้ชม — ลำดับในหน้านี้${c.rankBasisText}`}</SampleNote>
      </Section>

      <Section title="ตอนใหม่ล่าสุด" more={["ทั้งหมด", U.newEp]}>
        <GenreFilterChips genres={c.genres} />
        <div className="list two" id="newList">{fresh.map((s) => <EpRow key={s.slug} s={s} c={c} n={s.eps} isNew />)}</div>
        <p className="empty-inline" id="newEmpty" hidden>ไม่มีตอนใหม่ในแนวนี้</p>
      </Section>

      <Section title="เลือกตามแนว">
        <GenreBento c={c} />
        {c.openTags.length > 0 && (
          <div className="chips" style={{ marginTop: "var(--s4)" }}>
            <span className="chips-lb">แท็ก</span>
            {c.openTags.map((t) => <Link key={t.slug} className="chip" href={U.tag(t.slug)}>{t.chip}<span className="n num">{t.items.length}</span></Link>)}
          </div>
        )}
      </Section>

      <FollowRail />

      <section className="sec"><div className="btile flat">
        <h3><Icon name="sparkle" cls="sm" /> ทุกเรื่องสร้างด้วย AI</h3>
        <p>ปก บท และตัวละครทั้งหมดของ {c.settings.siteName} สร้างด้วยปัญญาประดิษฐ์ โดยทีมงานคนไทยเป็นผู้กำกับทิศทาง</p>
        <Link className="btn btn-ghost" href={U.behind}>ดูเบื้องหลังการสร้าง <Icon name="right" cls="sm" /></Link>
      </div></section>
    </Shell>
  );
}
