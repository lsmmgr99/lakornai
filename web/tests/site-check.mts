/* ด่าน SEO/คุณภาพของหน้าบ้าน — กฎชุดเดียวกับ generator รุ่น static (build/build.mjs) แต่ตรวจกับเซิร์ฟเวอร์จริง
   เดินทุก URL จาก sitemap.xml + หน้า noindex ที่รู้จัก แล้วตรวจ:
     200 · <title> ไม่ซ้ำ ≤60 · description ไม่ซ้ำ ≤160 · <h1> เดียว · canonical/og:image/twitter:card/meta robots
     · <img> ทุกตัวมี width/height/alt/loading · ไม่มีถ้อยคำต้องห้าม (สมัครสมาชิก/ล็อกอิน/VIP/เหรียญ/ปลดล็อก)
     · ไม่มีการอ้างยอดวิว (V12/V13) ขณะไม่มีระบบวัด · JSON-LD parse ได้ ไม่มี VideoObject/aggregateRating/views
     · หน้าที่ไม่มีจริง → 404 พร้อม noindex
   รัน:  BASE=http://127.0.0.1:3000 npx tsx tests/site-check.mts */
import fs from "node:fs";

const PORT_FILE = "/tmp/claude-0/-root-projects-lsm-lakornai/5b1a658c-e2aa-4c0e-bfd5-2d722adb46c8/scratchpad/port.txt";
const BASE = process.env.BASE || `http://127.0.0.1:${fs.existsSync(PORT_FILE) ? fs.readFileSync(PORT_FILE, "utf8").trim().split(" ")[1] : "3000"}`;
const PRIVATE = ["/library/", "/settings/", "/notifications/", "/welcome/", "/offline/", "/404/"];
const ALLOWED = [/ไม่ต้องสมัครสมาชิก/g, /ไม่มีการสมัครสมาชิก/g, /ไม่มีระบบสมัครสมาชิกหรือเข้าสู่ระบบ/g, /ต้องสมัครสมาชิกไหม/g, /ไม่มีแพ็กเกจให้สมัคร/g, /ไม่ต้องล็อกอิน/g, /ไม่ต้องสมัครสมาชิกและไม่ต้องล็อกอิน/g];
const BANNED: [RegExp, string][] = [[/สำหรับสมาชิก/, '"สำหรับสมาชิก"'], [/สมัครสมาชิก/, '"สมัครสมาชิก" ที่ไม่ใช่ถ้อยคำปฏิเสธ'], [/เข้าสู่ระบบ|ล็อกอิน|\blogin\b/i, "คำชวนล็อกอิน"], [/เหรียญ/, '"เหรียญ"'], [/\bVIP\b/i, "VIP"], [/paywall/i, "paywall"], [/ปลดล็อก/, '"ปลดล็อก"'], [/mockup/i, "mockup"]];
const BANNED_LD: [RegExp, string][] = [[/aggregateRating|ratingValue/, "คะแนนรีวิวใน structured data"], [/interactionStatistic|"views"/, "ยอดวิวใน structured data"], [/"@type"\s*:\s*"VideoObject"/, "VideoObject ทั้งที่ยังไม่มีไฟล์วิดีโอ"]];
const VIEWS_CLAIM: [RegExp, string][] = [[/(?<!รี)วิว/, 'คำว่า "วิว" (V12)'], [/\bviews?\b/i, "views (V12)"], [/\d[\d.,]*\s*(ล้าน|[KM])(?![ก-๙A-Za-z0-9])/, "ตัวเลข+หน่วยย่อ (V12)"]];
const MEASURE_CLAIM: [RegExp, string][] = [[/คนดูมากที่สุด/, '"คนดูมากที่สุด"'], [/ยอดนิยม[^<]{0,12}สัปดาห์/, '"ยอดนิยม…สัปดาห์"'], [/TOP\s*10[^<]{0,8}สัปดาห์/i, '"TOP 10 สัปดาห์นี้"'], [/อันดับจากยอดวิว/, '"อันดับจากยอดวิว"'], [/most\s+watched|trending/i, "most watched / trending"]];

const errors: string[] = [], warns: string[] = [];
const seenTitle = new Map<string, string>(), seenDesc = new Map<string, string>();
const attr = (tag: string, name: string) => { const m = tag.match(new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`)); return m ? (m[2] ?? m[3]) : null; };
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function check(url: string, { noindex }: { noindex: boolean }) {
  const r = await fetch(BASE + url, { headers: { accept: "text/html" } });
  const html = await r.text();
  /* /404/ เป็นหน้าสถานะ — Next ตอบ 404 ให้พาธนี้เอง ซึ่งถูกต้อง */
  if (r.status !== 200 && !(url === "/404/" && r.status === 404)) { errors.push(`${url}: HTTP ${r.status}`); return; }
  /* เอาเฉพาะ HTML ที่เบราว์เซอร์เห็น — ตัด <script> (payload ของ React ซ้ำข้อความ) ยกเว้น JSON-LD ซึ่งตรวจแยก */
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  const desc = decode(attr((html.match(/<meta name="description"[^>]*>/) || [""])[0], "content") || "");
  if (!title) errors.push(`${url}: ไม่มี <title>`);
  if (!desc) errors.push(`${url}: ไม่มี meta description`);
  if (seenTitle.has(title)) errors.push(`title ซ้ำ: "${title}" (${seenTitle.get(title)} · ${url})`); else seenTitle.set(title, url);
  if (seenDesc.has(desc)) errors.push(`description ซ้ำ: ${seenDesc.get(desc)} · ${url}`); else seenDesc.set(desc, url);
  if ([...title].length > 60) warns.push(`${url}: title ยาว ${[...title].length}`);
  if ([...desc].length > 160) warns.push(`${url}: description ยาว ${[...desc].length}`);
  const h1s = visible.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) || [];
  if (h1s.length !== 1) errors.push(`${url}: มี <h1> ${h1s.length} ตัว`);
  else if (!h1s[0].replace(/<[^>]+>/g, "").trim()) errors.push(`${url}: <h1> ว่าง`);
  for (const [re, what] of [[/<link rel="canonical" href="https?:\/\//, "canonical"], [/<meta property="og:title"/, "og:title"], [/<meta property="og:image"/, "og:image"], [/<meta name="twitter:card"/, "twitter:card"], [/<meta name="robots"/, "meta robots"]] as [RegExp, string][]) {
    if (!re.test(html)) errors.push(`${url}: ไม่มี ${what}`);
  }
  const robots = attr((html.match(/<meta name="robots"[^>]*>/) || [""])[0], "content") || "";
  if (noindex && !/noindex/.test(robots)) errors.push(`${url}: หน้าส่วนตัวต้อง noindex (ได้ "${robots}")`);
  if (!noindex && /noindex/.test(robots)) errors.push(`${url}: หน้าใน sitemap ต้องไม่ noindex`);
  for (const tag of visible.match(/<img\b[^>]*>/g) || []) {
    if (!/\bwidth="/.test(tag) || !/\bheight="/.test(tag)) errors.push(`${url}: <img> ไม่มี width/height — ${tag.slice(0, 80)}`);
    if (!/\balt="/.test(tag)) errors.push(`${url}: <img> ไม่มี alt — ${tag.slice(0, 80)}`);
    if (!/\bloading="/.test(tag)) errors.push(`${url}: <img> ไม่มี loading — ${tag.slice(0, 80)}`);
  }
  let scrub = visible; for (const a of ALLOWED) scrub = scrub.replace(a, "");
  for (const [re, what] of BANNED) { const m = scrub.match(re); if (m) errors.push(`${url}: พบ${what} → "${m[0]}"`); }
  for (const [re, what] of VIEWS_CLAIM) { const m = visible.replace(/PT\d+M\d+S/g, "").match(re); if (m) errors.push(`${url}: ${what} → "${m[0]}"`); }
  for (const [re, what] of MEASURE_CLAIM) { for (const t of [title, desc, visible]) { const m = t.match(re); if (m) { errors.push(`${url}: อ้างการวัดผู้ชม ${what} → "${m[0]}" (V13)`); break; } } }
  for (const raw of lds) {
    for (const [re, what] of BANNED_LD) if (re.test(raw)) errors.push(`${url}: ${what}`);
    try { JSON.parse(raw.replace(/\\u003c/g, "<")); } catch (e) { errors.push(`${url}: JSON-LD parse ไม่ผ่าน — ${(e as Error).message}`); }
  }
}

const sm = await (await fetch(BASE + "/sitemap.xml")).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (urls.length < 20) errors.push(`sitemap มีแค่ ${urls.length} URL`);
const robotsTxt = await (await fetch(BASE + "/robots.txt")).text();
console.log(`ตรวจ ${urls.length} URL จาก sitemap + ${PRIVATE.length} หน้าส่วนตัว · robots.txt: ${/Disallow: \/$/m.test(robotsTxt) ? "ปิดดัชนี" : "เปิดดัชนี"}`);
for (const u of urls) await check(u, { noindex: false });
for (const u of PRIVATE) await check(u, { noindex: true });
/* หน้าตอน 2+ ต้อง noindex และต้องตอบ 200 (ไม่อยู่ใน sitemap โดยเจตนา) */
const ep2 = urls.filter((u) => /\/watch\/[^/]+\/ep-1\/$/.test(u)).slice(0, 3).map((u) => u.replace("ep-1", "ep-2"));
for (const u of ep2) await check(u, { noindex: true });
for (const bad of ["/nope/", "/series/nope/", "/watch/nope/ep-1/", "/genre/nope/", "/tag/nope/", "/legal/nope/"]) {
  const r = await fetch(BASE + bad);
  const html = await r.text();
  if (r.status !== 404) errors.push(`${bad}: ต้อง 404 ได้ ${r.status}`);
  if (!/noindex/.test(html)) errors.push(`${bad}: หน้า 404 ต้อง noindex`);
}
for (const legacy of ["/search.html", "/genre-fruit.html", "/series/durian-revenge.html", "/watch/durian-revenge.html"]) {
  const r = await fetch(BASE + legacy, { redirect: "manual" });
  if (r.status !== 308 && r.status !== 301) errors.push(`${legacy}: ลิงก์รุ่นเก่าต้อง redirect ถาวร ได้ ${r.status}`);
}
if (warns.length) console.log(`⚠ ${warns.length} คำเตือน:\n  - ` + warns.slice(0, 20).join("\n  - "));
if (errors.length) { console.error(`✗ ไม่ผ่าน ${errors.length} ข้อ:\n  - ` + errors.slice(0, 60).join("\n  - ")); process.exit(1); }
console.log(`✓ ผ่านทุกข้อ — ${urls.length + PRIVATE.length + ep2.length} หน้า · title/description ไม่ซ้ำ · h1 เดียว · img ครบ · ไม่มีถ้อยคำต้องห้าม · JSON-LD ถูกต้อง · 404/redirect ถูกต้อง`);
