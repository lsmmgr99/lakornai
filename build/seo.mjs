/* on-page SEO ที่ใส่ "ตอน build" ทุกตัว — ไม่มีอะไรที่ตามแปะทีหลัง (AIO-22 AC-6)
   ฐานงาน: onpage-audit (AIO-19) · ux-spec §2.4 (AIO-16) */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, iso8601, genreLabel } from './content.mjs';

/* ============================================================
   โดเมน — ค่าคงที่ "ที่เดียวในโค้ด"
   โดเมนยังไม่ยืนยัน (AIO-19 คำถามข้อ 1) · เปลี่ยนโดเมน = แก้บรรทัดเดียวข้างล่าง
   แล้ว build ใหม่ · canonical / og:url / sitemap / JSON-LD @id ตามทันทีทั้งเว็บ
   ============================================================ */
export const SITE_ORIGIN = 'https://lakornai.tv';

export const SITE_NAME = 'LakornAI';
/* ถ้อยคำทางการที่ลูกค้าอนุมัติ — แก้ที่นี่ที่เดียว */
export const FREE_LINE = 'ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก';

export const abs = u => SITE_ORIGIN + u;

/* ============================================================
   AC-7 · ช่องเสียบเทมเพลตภาพแชร์ 1200×630
   Visual ยังไม่ส่ง (AIO-19 B-02 ยืนยันว่างานนี้ยังไม่มีคนทำ)
   วางไฟล์ชื่อตามด้านล่างลงใน assets/share/ แล้ว build ใหม่ — ไม่ต้องแก้โค้ด
     assets/share/default.jpg            → ใช้กับหน้าแม่ทุกหน้า
     assets/share/series-<slug>.jpg      → หน้าเรื่อง
     assets/share/ep-<slug>-<n>.jpg      → หน้าตอน (ถ้าทำรายตอน)
   ถ้ายังไม่มีไฟล์ ระบบถอยไปใช้ปก 2:3 ของเรื่องและเตือนตอน build
   ============================================================ */
const SHARE_DIR = path.join(ROOT, 'assets/share');
const shareFiles = new Set(fs.existsSync(SHARE_DIR) ? fs.readdirSync(SHARE_DIR) : []);
export const shareMisses = new Set();
function shareSlot(names, fallback) {
  for (const n of names) {
    for (const ext of ['jpg', 'png', 'webp']) {
      if (shareFiles.has(`${n}.${ext}`)) return { url: `/assets/share/${n}.${ext}`, w: 1200, h: 630 };
    }
  }
  shareMisses.add(names[names.length - 1]);
  return fallback;
}
export const coverUrl = s => '/' + (s.cover || `assets/covers/${s.slug}.webp`).replace(/^\//, '');
export const COVER_W = 1024, COVER_H = 1536;

export function shareImage({ series = null, ep = null } = {}) {
  const fb = series
    ? { url: coverUrl(series), w: COVER_W, h: COVER_H }
    : { url: '/assets/covers/durian-revenge.webp', w: COVER_W, h: COVER_H };
  if (series && ep) return shareSlot([`ep-${series.slug}-${ep}`, `series-${series.slug}`, 'default'], fb);
  if (series) return shareSlot([`series-${series.slug}`, 'default'], fb);
  return shareSlot(['default'], fb);
}

/* ============================================================
   <head>
   ============================================================ */
export const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function headTags({ url, title, desc, robots = 'index,follow', og = {}, jsonLd = [], rel = '' }) {
  const img = og.image || shareImage({});
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${abs(og.canonical || url)}">`,
    `<meta name="robots" content="${robots}">`,
    `<meta property="og:type" content="${og.type || 'website'}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="th_TH">`,
    `<meta property="og:url" content="${abs(url)}">`,
    `<meta property="og:title" content="${esc(og.title || title)}">`,
    `<meta property="og:description" content="${esc(og.description || desc)}">`,
    `<meta property="og:image" content="${abs(img.url)}">`,
    `<meta property="og:image:width" content="${img.w}">`,
    `<meta property="og:image:height" content="${img.h}">`,
    `<meta property="og:image:alt" content="${esc(og.imageAlt || title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(og.title || title)}">`,
    `<meta name="twitter:description" content="${esc(og.description || desc)}">`,
    `<meta name="twitter:image" content="${abs(img.url)}">`,
    `<meta name="theme-color" content="#0E0D12">`,
    `<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">`,
  ];
  for (const j of jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n');
}

/* ============================================================
   structured data
   ห้ามใส่: VideoObject (ไม่มีไฟล์วิดีโอ) · aggregateRating (ไม่มีระบบให้คะแนน)
            interactionStatistic/ยอดวิว (ตัวเลขตัวอย่าง) · datePublished (ไม่มีวันจริง)
   — AIO-19 C-01/C-02 และคำสั่งในโจทย์ AC-6
   ============================================================ */
const ORG = { '@type': 'Organization', name: SITE_NAME, url: abs('/') };

export function breadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({
      '@type': 'ListItem', position: i + 1, name, item: abs(url),
    })),
  };
}

export function tvSeriesLd(s) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    '@id': abs(`/series/${s.slug}/`) + '#series',
    url: abs(`/series/${s.slug}/`),
    name: s.title,
    inLanguage: 'th',
    description: s.synopsis,
    abstract: s.hook,
    image: abs(coverUrl(s)),
    genre: s.genres.map(genreLabel),
    numberOfEpisodes: s.eps,
    numberOfSeasons: 1,
    isAccessibleForFree: true,
    character: s.cast.map(c => ({ '@type': 'Person', name: c })),
    containsSeason: {
      '@type': 'TVSeason',
      '@id': abs(`/series/${s.slug}/`) + '#season-1',
      seasonNumber: 1,
      numberOfEpisodes: s.eps,
    },
    productionCompany: ORG,
    publisher: ORG,
  };
}

export function tvEpisodeLd(s, n) {
  const e = s.episodes[n - 1];
  return {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    '@id': abs(`/watch/${s.slug}/ep-${n}/`) + '#episode',
    url: abs(`/watch/${s.slug}/ep-${n}/`),
    name: e[0],
    alternateName: `EP.${n} ${e[0]}`,
    episodeNumber: n,
    inLanguage: 'th',
    timeRequired: iso8601(e[1]),
    image: abs(coverUrl(s)),
    isAccessibleForFree: true,
    partOfSeries: {
      '@type': 'TVSeries',
      '@id': abs(`/series/${s.slug}/`) + '#series',
      name: s.title,
      url: abs(`/series/${s.slug}/`),
      numberOfEpisodes: s.eps,
    },
    partOfSeason: {
      '@type': 'TVSeason',
      '@id': abs(`/series/${s.slug}/`) + '#season-1',
      seasonNumber: 1,
    },
    publisher: ORG,
  };
}

export function collectionLd({ url, name, description, items }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': abs(url) + '#page',
    url: abs(url),
    name, description, inLanguage: 'th',
    isPartOf: { '@type': 'WebSite', '@id': abs('/') + '#website' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'TVSeries',
          '@id': abs(`/series/${s.slug}/`) + '#series',
          name: s.title,
          url: abs(`/series/${s.slug}/`),
          image: abs(coverUrl(s)),
          numberOfEpisodes: s.eps,
          isAccessibleForFree: true,
        },
      })),
    },
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/') + '#website',
    url: abs('/'),
    name: SITE_NAME,
    inLanguage: 'th',
    publisher: ORG,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/search/?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function faqLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/* ============================================================
   robots.txt + sitemap.xml
   ============================================================ */
/* โดเมนยังไม่ยืนยันและเว็บยังไม่เผยแพร่ → ปิดการเก็บดัชนีไว้ก่อน (AIO-19 P1)
   วันเผยแพร่จริง: เปลี่ยน PUBLISHED เป็น true แล้ว build ใหม่ */
export const PUBLISHED = false;

export function robotsTxt() {
  if (!PUBLISHED) {
    return [
      '# LakornAI — ยังไม่เผยแพร่ ปิดการเก็บดัชนีไว้ทั้งเว็บ',
      '# วันขึ้นจริง: ตั้ง PUBLISHED = true ใน build/seo.mjs แล้ว build ใหม่',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /library/',
    'Disallow: /settings/',
    'Disallow: /notifications/',
    'Disallow: /welcome/',
    '',
    `Sitemap: ${abs('/sitemap.xml')}`,
    '',
  ].join('\n');
}

/* <lastmod> จงใจไม่ใส่ — ไม่มีวันเผยแพร่จริงในระบบ ใส่ค่าที่เดาแล้ว Google
   เลิกเชื่อ lastmod ทั้ง sitemap (AIO-19 C-02) */
export function sitemapXml(urls) {
  const body = urls.map(u => `  <url><loc>${abs(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
