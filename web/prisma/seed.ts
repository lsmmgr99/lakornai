/* seed ครั้งแรก: นำเข้า content.json ของเว็บรุ่น static (12 เรื่อง 418 ตอน) + คัดลอกปกเข้า UPLOAD_DIR
   + สร้างผู้ดูแลคนแรก · รันซ้ำได้ (upsert) ไม่ทับข้อมูลที่แก้ในหลังบ้านไปแล้ว (เรื่องที่มีอยู่จะถูกข้าม)
   รัน:  npm run db:seed        (ตั้ง ADMIN_EMAIL / ADMIN_PASSWORD ใน .env ก่อน หรือปล่อยให้สุ่มแล้วอ่านจากหน้าจอ) */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { generateCoverVariants } from "../src/lib/cover-variants";

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, "..");
const LEGACY = path.resolve(ROOT, "..");
const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || "./data/uploads");

const GENRE_SEO: Record<string, [string, string, string]> = {
  vertical: ["ละครแนวตั้ง — ละครสั้น AI ดูฟรีทุกตอน · AiLakorn", "รวมละครแนวตั้ง AI ภาษาไทย ดูจบตอนละ 1–3 นาที บนมือถือแนวตั้ง ฟรีทุกตอน ไม่ต้องสมัครสมาชิก เลือกจากละครสั้นแนวตั้งที่เรียงตอนครบทุกเรื่อง", "ละครแนวตั้งคือละครที่ถ่ายและตัดมาให้ดูบนมือถือโดยเฉพาะ จอเต็มแนวตั้ง ตอนละไม่เกิน 3 นาที และจบความทุกตอน ในคลังของ AiLakorn หมวดนี้เป็นหมวดที่ใหญ่ที่สุด รวมทั้งเรื่องออฟฟิศอย่างประธานเย็นชากับเลขาตัวแสบ ไปจนถึงเรื่องข้ามภพอย่างข้ามภพมาเป็นนางร้าย ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก"],
  fruit: ["ละครผลไม้ AI — ดราม่าผลไม้ ดูฟรีทุกตอน · AiLakorn", "ละครสั้น AI ที่ตัวละครเป็นผลไม้ไทย รัก หักหลัง ชิงสวน ทุเรียน มังคุด ลำไย ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 3 เรื่อง เรียงตอนครบ", "ละครผลไม้ AI เป็นแนวที่ AiLakorn สร้างขึ้นเอง ตัวละครทุกตัวเป็นผลไม้ไทยที่มีชื่อ มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น ตั้งแต่ทุเรียนที่ถูกโค่นทิ้งกลางสวน ลำไยลูกเดียวที่ไม่มีเมล็ด ไปจนถึงมังคุดที่ตกหลุมรักคนบ้านศัตรู เป็นหมวดที่ดูจบง่ายที่สุดในคลังและเป็นหมวดที่คนจำเราได้"],
  western: ["ละครฝรั่ง — ละครสั้น AI พากย์ไทย ดูฟรีทุกตอน · AiLakorn", "ละครสั้น AI สไตล์ฝรั่ง พากย์ไทยและมีซับไทย ทายาท มาเฟีย รักข้ามชนชั้น ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบตั้งแต่ตอนแรกถึงตอนจบ", "ละครฝรั่งของ AiLakorn คือเรื่องที่ตัวละครและฉากเป็นสากล แต่บทและการพากย์เป็นไทยทั้งหมด หมวดนี้รวมเรื่องทายาทตระกูลดัง มาเฟีย และรักข้ามชนชั้น ที่เดินเรื่องเร็วแบบละครสั้น ไม่ต้องรอตอนยาว ดูฟรีทุกตอนตั้งแต่ตอนแรกถึงตอนจบ"],
  horror: ["ละครสยองขวัญ AI — ผี บ้านร้าง คำสาป ดูฟรี · AiLakorn", "ละครสั้นสยองขวัญ AI ภาษาไทย ผี บ้านร้าง คำสาป ดูจบไวตอนละไม่กี่นาที ฟรีทุกตอน ไม่ต้องสมัครสมาชิก แนะนำให้ดูตอนกลางคืนแบบมีเพื่อน", "ละครสยองขวัญของเราเล่นกับความกลัวแบบไทย ๆ ที่คนไทยรู้จักดี ผีที่สิงอยู่ในของ บ้านเช่าราคาถูกผิดปกติ และซอยที่ไม่มีเลขบ้าน ตอนสั้นทำให้ความกลัวมาเร็วและไม่ยืดเยื้อ เหมาะกับการดูกลางคืนแบบรวดเดียวจบ ทุกตอนดูฟรี ไม่ต้องสมัครสมาชิก"],
  timetravel: ["ละครย้อนเวลา AI — ข้ามภพ เกิดใหม่ ดูฟรีทุกตอน · AiLakorn", "ละครสั้น AI แนวย้อนเวลา ข้ามภพ เกิดใหม่ แก้ไขอดีตให้รักครั้งนี้ไม่พัง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก เรียงตอนครบ ดูต่อจากตอนที่ค้างไว้ได้", "ละครย้อนเวลาและข้ามภพคือหมวดที่ตัวละครได้โอกาสครั้งที่สอง ไม่ว่าจะเป็นนักโบราณคดีที่ตื่นมาในปี พ.ศ. 2310 หรือคนอ่านนิยายที่ตื่นมาเป็นนางร้ายซึ่งรู้ล่วงหน้าว่าตัวเองจะตายตอนไหน หมวดนี้เดินเรื่องด้วยคำถามเดียวคือ รู้อนาคตแล้วจะเปลี่ยนมันได้ไหม"],
  revenge: ["ละครแก้แค้น AI — ทวงคืนทุกอย่าง ดูฟรีทุกตอน · AiLakorn", "ละครสั้น AI แนวแก้แค้น ถูกหักหลังจนหมดตัวแล้วกลับมาทวงคืนทุกอย่าง ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก มีให้ดู 4 เรื่อง เรียงตอนครบทุกเรื่อง", "ละครแก้แค้นคือหมวดที่คนดูละครสั้นไทยค้นหามากที่สุด สูตรของมันตรงไปตรงมา ถูกหักหลังจนหมดตัว หายไปพักหนึ่ง แล้วกลับมาทวงคืนทีละอย่าง ในคลังของเรามีทั้งแบบสวนผลไม้ แบบออฟฟิศ และแบบตระกูลมหาเศรษฐี ทุกเรื่องดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก"],
};

interface LegacySeries { slug: string; title: string; hook: string; synopsis: string; genres: string[]; tropes?: string[]; eps: number; status: string; releaseDay: string | null; cover?: string; coverWide?: string | null; orientation: string; cast?: string[]; theme?: { c1: string; c2: string }; episodes: { n: number; title: string; durationSec: number }[] }
interface LegacyContent { genres: { slug: string; label: string }[]; tropes: { slug: string; label: string }[]; series: LegacySeries[] }

async function importCover(rel: string | undefined, slug: string, kind: "covers" | "covers-wide"): Promise<{ path: string; w: number; h: number } | null> {
  const src = rel ? path.join(LEGACY, rel) : null;
  if (!src || !fs.existsSync(src)) return null;
  const ext = path.extname(src).toLowerCase().replace(".jpeg", ".jpg");
  const name = `${slug}${ext}`;
  const dir = path.join(UPLOAD_DIR, kind);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, name);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  const meta = await sharp(dest).metadata();
  await generateCoverVariants(dest, kind === "covers" ? "poster" : "wide");
  return { path: `${kind}/${name}`, w: meta.width || 0, h: meta.height || 0 };
}

async function main() {
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1, siteOrigin: process.env.SITE_ORIGIN || "https://ailakorn.com" } });

  const file = path.join(LEGACY, "content.json");
  if (fs.existsSync(file)) {
    const legacy = JSON.parse(fs.readFileSync(file, "utf8")) as LegacyContent;
    for (const [i, g] of legacy.genres.entries()) {
      const seo = GENRE_SEO[g.slug];
      await prisma.genre.upsert({ where: { slug: g.slug }, update: { label: g.label, sort: i }, create: { slug: g.slug, label: g.label, sort: i, seoTitle: seo?.[0], seoDesc: seo?.[1], intro: seo?.[2] } });
    }
    for (const [i, t] of legacy.tropes.entries()) {
      await prisma.trope.upsert({ where: { slug: t.slug }, update: { label: t.label, sort: i }, create: { slug: t.slug, label: t.label, sort: i } });
    }
    let imported = 0;
    for (const [i, s] of legacy.series.entries()) {
      if (await prisma.series.findUnique({ where: { slug: s.slug } })) continue;
      const cover = await importCover(s.cover || `assets/covers/${s.slug}.webp`, s.slug, "covers");
      const wide = await importCover(s.coverWide || undefined, s.slug, "covers-wide");
      await prisma.series.create({
        data: {
          slug: s.slug, title: s.title, hook: s.hook, synopsis: s.synopsis,
          status: s.status === "ended" ? "ended" : "ongoing",
          releaseDay: s.status === "ended" ? null : s.releaseDay || "daily",
          orientation: s.orientation,
          genres: JSON.stringify(s.genres), tropes: JSON.stringify(s.tropes || []), cast: JSON.stringify(s.cast || []),
          themeC1: s.theme?.c1, themeC2: s.theme?.c2,
          cover: cover?.path, coverW: cover?.w, coverH: cover?.h,
          coverWide: wide?.path, coverWideW: wide?.w, coverWideH: wide?.h,
          published: true, sort: i,
          episodes: { create: s.episodes.map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec })) },
        },
      });
      imported++;
    }
    console.log(`นำเข้าจาก content.json: ${imported} เรื่องใหม่ (ทั้งหมด ${legacy.series.length})`);
  } else {
    console.log("ไม่พบ ../content.json — ข้ามการนำเข้าเนื้อหาเดิม");
  }

  if (!(await prisma.user.count())) {
    const email = process.env.ADMIN_EMAIL || "admin@ailakorn.com";
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({ data: { email, name: "ผู้ดูแลระบบ", role: "admin", passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`สร้างผู้ดูแลคนแรก: ${email}`);
    if (!process.env.ADMIN_PASSWORD) console.log(`รหัสผ่านชั่วคราว (เปลี่ยนทันทีหลังเข้าสู่ระบบ): ${password}`);
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
