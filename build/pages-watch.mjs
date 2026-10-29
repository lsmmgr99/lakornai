/* กลุ่ม B — รายละเอียดเรื่อง (12 หน้า) + หน้ารับชม (418 หน้า)
   เทมเพลตเดียวต่อกลุ่ม ตาม ux-spec §2.3 */
import {
  U, SERIES, genreLabel, similar, openTagsOf, D, epSecs, hasCastPage, HAS_VIEWS,
} from './content.mjs';
import {
  definePage, shell, pageHead, crumbs, rail, section, poster, card, epGrid, epTabs,
  legend, coverImg, ic, esc, footer, freeAllBar, sampleNote, aiBadge, newBadge, doneBadge,
} from './ui.mjs';
import { tvSeriesLd, tvEpisodeLd, breadcrumb, shareImage } from './seo.mjs';

const wrapF = (L, inner) => `<main id="main" class="page"><div class="wrap">${inner}</div>${footer(L)}</main>`;

/* ---------- กฎตัด title ของ onpage-audit §5.2 ---------- */
function seriesTitle(s) {
  let t = `${s.title} — ละครสั้น AI ${s.eps} ตอน ดูฟรี · AiLakorn`;
  if (t.length > 60) t = `${s.title} — ละครสั้น AI ${s.eps} ตอน · AiLakorn`;
  return t;
}
function seriesDesc(s) {
  let d = `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ${s.status} ฟรีทุกตอน ไม่ต้องสมัครสมาชิก`;
  if (d.length > 160) d = `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ${s.status} ฟรีทุกตอน`;
  if (d.length > 160) d = `${s.hook} · ดู ${s.title} ละครสั้น AI ภาษาไทยครบ ${s.eps} ตอน ฟรีทุกตอน`;
  return d;
}
/* กฎตัดของ §5.3 — ห้ามตัด EP.{n} เพราะเป็นสิ่งเดียวที่ทำให้ 418 title ไม่ซ้ำกัน */
function watchTitle(s, n, e) {
  let t = `${s.title} EP.${n} ${e[0]} · AiLakorn`;
  if (t.length > 60) t = `${s.title} EP.${n} ${e[0]}`;
  return t;
}
function watchDesc(s, n, e) {
  return `ดู ${s.title} ตอนที่ ${n} ${e[0]} (${e[1]} นาที) ละครสั้น AI ภาษาไทย ฟรีทุกตอน ไม่ต้องสมัครสมาชิก ดูจบแล้วกดตอนถัดไปได้ทันที`;
}

/* ============================ B1 รายละเอียดเรื่อง ============================ */
export function buildSeries() {
  for (const s of SERIES) {
    const g0 = s.genres[0];
    /* แถว chip ของหน้าเรื่อง = หมวด + "แท็กที่เปิดแล้วและครอบเรื่องนี้"
       เดิมเป็น trope ล้วน · AIO-33 ทำให้รวม facet สถานะ/ความยาวด้วย (ชุดเดียวกับแถวหน้าแรก) */
    const tags = openTagsOf(s);
    definePage({
      out: `series/${s.slug}/index.html`, url: U.series(s.slug), page: 'series', slug: s.slug,
      title: seriesTitle(s),
      desc: seriesDesc(s),
      og: { type: 'video.tv_show', title: `${s.title} — ละครสั้น AI ${s.eps} ตอน ดูฟรีทุกตอน`, image: shareImage({ series: s }), imageAlt: `ปก ${s.title}` },
      jsonLd: [
        tvSeriesLd(s),
        breadcrumb([['หน้าแรก', U.home], [genreLabel(g0), U.genre(g0)], [s.title, U.series(s.slug)]]),
      ],
      body: L => shell(L, {
        main: wrapF(L, `${crumbs(L, [['หน้าแรก', U.home], [genreLabel(g0), U.genre(g0)], [s.title, null]])}
        <div class="two-col">
          <div class="sd-cover">${poster(L, s, { badges: [aiBadge], showViews: false, lazy: false, alt: `ปก ${s.title} — ละครสั้น AI ${genreLabel(g0)}` })}</div>
          <div>
            <h1 class="h1-series">${esc(s.title)}</h1>
            <div class="facts">
              <span>${s.genres.map(genreLabel).join(' · ')}</span>
              <span class="num">${s.eps} ตอน</span>
              <span>${esc(s.status)}</span>
              ${/* ไม่มีระบบวัดผู้ชม = ไม่มีบรรทัดยอดวิวเลย (ADR-001 §12.2 C1 · V12) */ ''}
              ${HAS_VIEWS && s.views != null
                ? `<span class="views">${ic('eye', 'sm')}<span class="num">${esc(s.views)}</span> วิว</span>` : ''}
            </div>
            <div class="btn-row">
              <a class="btn btn-accent btn-main" href="${L(U.watch(s.slug, 1))}" data-resume="${s.slug}">${ic('playf', 'sm')} <span data-resume-label>เริ่มดู EP.1</span></a>
              <button class="btn btn-ghost" data-follow="${s.slug}" aria-pressed="false">${ic('heart', 'sm')} <em>ติดตาม</em></button>
              <button class="icon-btn" data-share aria-label="แชร์เรื่องนี้">${ic('share')}</button>
            </div>
            ${freeAllBar}
            <p class="hook-lead">${esc(s.hook)}</p>
            <p class="syn">${esc(s.synopsis)}</p>
            <div class="chips">
              ${s.genres.map(g => `<a class="chip" href="${L(U.genre(g))}">${genreLabel(g)}</a>`).join('')}
              ${tags.map(t => `<a class="chip" href="${L(U.tag(t.slug))}">${t.chip}</a>`).join('')}
            </div>
            ${section('เลือกตอน', `${epTabs(s)}${epGrid(L, s)}${legend}`)}
            ${section('ตัวละคร', `<div class="castrow">${s.cast.map(c => {
              const inner = `<span class="avatar" style="--c1:${s.c1};--c2:${s.c2}" aria-hidden="true">${esc(c[0])}</span><span>${esc(c)}</span>`;
              return hasCastPage(c) ? `<a href="${L(U.cast(c))}">${inner}</a>` : `<span class="castone">${inner}</span>`;
            }).join('')}</div>`)}
            ${section('เรื่องที่คล้ายกัน', rail(L, similar(s).map(x => card(L, x)).join('')))}
            ${/* หมายเหตุผูกกับ viewsSource ไม่เขียนตายไว้ (ADR-001 §12.2 C4)
                 — ไม่มียอดวิวบนหน้าแล้ว หมายเหตุที่พูดถึงยอดวิวจึงไม่มีสิ่งอ้างอิง */ ''}
            ${HAS_VIEWS ? sampleNote('ยอดวิวเป็นตัวเลขตัวอย่าง ยังไม่ได้ต่อระบบวัดผลจริง') : ''}
          </div>
        </div>`),
      }),
    });
  }
}

/* ============================ B2 หน้ารับชม ============================ */
/* หมายเหตุความซื่อสัตย์: รีโปยังไม่มีไฟล์วิดีโอ (visual-design §9 ข้อ 5)
   เพลเยอร์จึงเป็นตัวจำลองเวลา — บอกไว้ตรง ๆ ใต้เพลเยอร์
   แต่ "การบันทึกความคืบหน้า" ที่อยู่บนมันเป็นของจริงทั้งหมด (AC-2) */
export function buildWatch() {
  for (const s of SERIES) {
    for (let n = 1; n <= s.eps; n++) {
      const e = s.episodes[n - 1];
      const prev = n > 1 ? n - 1 : null;
      const next = n < s.eps ? n + 1 : null;
      const g0 = s.genres[0];

      definePage({
        out: `watch/${s.slug}/ep-${n}/index.html`,
        url: U.watch(s.slug, n),
        page: 'watch', slug: s.slug, ep: String(n),
        /* AIO-19 S1b — เปิดดัชนีเฉพาะตอนที่ 1 ของแต่ละเรื่อง (12 หน้า)
           ตอน 2 ขึ้นไป noindex,follow จนกว่าจะมีชื่อตอนที่ไม่ซ้ำและคำบรรยายตอนจริง
           เหตุผล: ชื่อตอนทั้งเว็บมีแค่ 32 ชื่อที่ไม่ซ้ำกันจาก 418 ตอน (AIO-19 F-08/C-05) */
        robots: n === 1 ? 'index,follow' : 'noindex,follow',
        title: watchTitle(s, n, e),
        desc: watchDesc(s, n, e),
        og: {
          type: 'video.episode',
          title: `${s.title} EP.${n} ${e[0]}`,
          image: shareImage({ series: s, ep: n }),
          imageAlt: `ปก ${s.title}`,
        },
        jsonLd: [
          tvEpisodeLd(s, n),
          breadcrumb([['หน้าแรก', U.home], [genreLabel(g0), U.genre(g0)],
            [s.title, U.series(s.slug)], [`EP.${n}`, U.watch(s.slug, n)]]),
        ],
        body: L => shell(L, {
          back: [s.title, U.series(s.slug)],
          main: `<main id="main" class="page watch-page"><div class="wrap">
            <div class="watch-col">
              <div>
                ${/* ทิศถูก "เขียนลงบนกล่องเพลเยอร์โดย build" ไม่ใช่ให้ JS วัดภาพแล้วเดาตอนรัน
                     และไม่ใช่ให้ CSS เดาจากขนาดจอ (ADR-001 §13.7 D7 ข้อ 1)
                     โปสเตอร์ในกล่องนี้ขอทรง `auto` = ตามทิศของเรื่อง ไม่ใช่ตามช่อง: ภาพนี้คือ
                     เฟรมแรกแทนวิดีโอ ถ้ากรอบเป็น 16:9 แต่ภาพเป็น 2:3 ผู้ชมจะเห็นภาพครอป
                     เต็มจอก่อนวิดีโอขึ้น · กฎ aspect-ratio ของกล่องอยู่ที่ build/site-extra.css */ ''}<div class="player" id="player"
                     data-orientation="${s.orientation}"
                     data-dur="${epSecs(e[1])}"
                     data-next="${next ? L(U.watch(s.slug, next)) : ''}"
                     data-series="${L(U.series(s.slug))}">
                  ${coverImg(L, s, { lazy: false, shape: 'auto' })}
                  <div class="vig"></div>
                  <div class="ptop">
                    <a class="rnd" href="${L(U.series(s.slug))}" aria-label="กลับไปหน้าเรื่อง">${ic('left')}</a>
                    <span class="ti"><b>${esc(s.title)}</b><span class="num" lang="en">EP.${n} · ${esc(e[0])}</span></span>
                  </div>
                  <button class="bigplay" id="playBtn" aria-label="เล่น">${ic('playf', 'lg')}</button>
                  <div class="pstack">
                    <div class="pfoot">
                      ${/* ไม่มีช่องซับไตเติลในสัญญา §6 และยังไม่มีไฟล์วิดีโอ จึงไม่มีบรรทัดซับ
                           (ม็อกอัพใช้ประโยคตัวอย่างจาก assets/data.js ซึ่งเป็นของชั้นออกแบบ)
                           `.ptext` คงไว้เป็นช่องยืดของ flex ให้แถวล่างวางตัวเหมือนแบบที่อนุมัติ */ ''}
                      <div class="ptext"></div>
                      <div class="side">
                        <button class="b on" id="muteBtn" aria-label="เปิดเสียง (ตอนนี้ปิดเสียงอยู่)">${ic('mute')}</button>
                        <span class="lb">ปิดเสียง</span>
                        <button class="b" data-follow="${s.slug}" aria-pressed="false" aria-label="ติดตามเรื่องนี้">${ic('heart')}</button>
                        <a class="b" href="#epGrid" aria-label="เลือกตอน">${ic('list')}</a>
                        <button class="b" data-share aria-label="แชร์ตอนนี้">${ic('share')}</button>
                      </div>
                    </div>
                    <div>
                      <div class="bar" id="barWrap" role="progressbar" aria-label="ความคืบหน้าในตอนนี้"
                           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="bar"></i></div>
                      <div class="times"><span class="num" id="tNow">0:00</span><span class="num" id="tDur">${e[1]}</span></div>
                    </div>
                  </div>
                  <!-- aria-atomic=false: ประกาศการ์ดครั้งเดียวตอนโผล่ ตัวเลขนับถอยหลังอยู่ในวง
                       aria-hidden จึงไม่ถูกประกาศซ้ำทุกวินาที (ดู showNextUp ใน app.src.js) -->
                  <section class="nextup" id="nextUp" role="region" aria-live="polite" aria-atomic="false" hidden></section>
                  <div class="endcard" id="endCard" role="dialog" aria-modal="true" aria-labelledby="ec-h" hidden></div>
                </div>
                <p class="note-ex player-note">${ic('info', 'sm')}<span>ยังไม่มีไฟล์วิดีโอในระบบ — ตัวเล่นนี้เดินเวลาแบบจำลองเพื่อให้ทดสอบการจำตอนที่ดูค้างได้จริง</span></p>
              </div>
              <div>
                ${crumbs(L, [['หน้าแรก', U.home], [genreLabel(g0), U.genre(g0)], [s.title, U.series(s.slug)], [`EP.${n}`, null]])}
                <h1 class="h1-series" id="epTitle"><span lang="en">EP.${n}</span> ${esc(e[0])}</h1>
                <div class="facts">
                  <span class="num">ตอนที่ ${n} จาก ${s.eps}</span>
                  <span>${e[1]} นาที</span>
                  <span>${s.genres.map(genreLabel).join(' · ')}</span>
                </div>
                <div class="ep-nav">
                  ${prev ? `<a class="btn btn-ghost btn-md" href="${L(U.watch(s.slug, prev))}" rel="prev">${ic('left', 'sm')} EP.${prev}</a>` : ''}
                  ${next ? `<a class="btn btn-accent btn-md" href="${L(U.watch(s.slug, next))}" rel="next">EP.${next} ${esc(s.episodes[next - 1][0])} ${ic('right', 'sm')}</a>`
                         : `<a class="btn btn-accent btn-md" href="${L(U.series(s.slug))}">${ic('checkc', 'sm')} ตอนสุดท้ายของเรื่องนี้</a>`}
                </div>
                ${freeAllBar}
                ${section('เลือกตอน', `${epTabs(s)}${epGrid(L, s, { current: n })}${legend}`)}
                ${section('เกี่ยวกับเรื่องนี้',
                  `<p class="syn">${esc(s.synopsis)}</p>
                   <a class="btn btn-ghost btn-md" href="${L(U.series(s.slug))}">ดูรายละเอียดเรื่องทั้งหมด ${ic('right', 'sm')}</a>`)}
              </div>
            </div>
          </div>${footer(L)}</main>`,
        }),
      });
    }
  }
}
