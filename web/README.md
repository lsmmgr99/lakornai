# AiLakorn — เว็บ + หลังบ้าน (Next.js)

เว็บผู้ชม (ละครสั้น AI ดูฟรี) และระบบจัดการเนื้อหา (CMS) อยู่ในแอป Next.js เดียวกัน · ข้อมูลอยู่ใน SQLite (Prisma) · ปกที่อัปโหลดเก็บในโฟลเดอร์ `data/uploads/`
แก้ในหลังบ้านแล้ว **หน้าเว็บอัปเดตทันที** (on-demand revalidation) ไม่ต้อง build/deploy ใหม่

```
/            หน้าบ้าน (SSG + ISR · URL เหมือนเว็บรุ่น static ทุกเส้น)
/admin/      หลังบ้าน (เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน · ผู้ดูแลระบบ / ผู้แก้เนื้อหา)
/media/…     ปกที่อัปโหลด (เสิร์ฟจาก UPLOAD_DIR · cache 1 ปี · ชื่อไฟล์มี hash)
/sitemap.xml /robots.txt  สร้างจากฐานข้อมูล (เปิด/ปิดดัชนีได้จากหน้าตั้งค่า)
```

## เริ่มพัฒนา (ต้องมี Node 22+)

```sh
cd web
cp .env.example .env            # ตั้ง AUTH_SECRET (openssl rand -hex 32) และ ADMIN_PASSWORD
npm ci
npx prisma generate && npx prisma db push
npm run db:seed                 # นำเข้า content.json เดิม (12 เรื่อง 418 ตอน + ปก) และสร้างผู้ดูแลคนแรก
npm run dev                     # http://localhost:3000  ·  หลังบ้าน http://localhost:3000/admin/
```

## ทดสอบ

```sh
npm run typecheck && npm run lint
npm run build                               # ต้องผ่าน (prerender ทุกหน้า + generateStaticParams)
BASE=http://127.0.0.1:3000 npx tsx tests/site-check.mts   # ด่าน SEO ทุกหน้า: title/description ไม่ซ้ำ ≤60/≤160 · h1 เดียว · canonical/og · img ครบ · ไม่มีถ้อยคำต้องห้าม · V12/V13 · JSON-LD · 404/redirect
BASE=http://127.0.0.1:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npx tsx tests/admin-e2e.mts   # หลังบ้านครบวงในเบราว์เซอร์จริง (ต้องมี Chromium · CHROME=/path)
```

## Deploy บน VPS (pm2 + nginx)

```sh
# ครั้งแรก
git clone <repo> && cd lakornai/web
cp .env.example .env && nano .env           # AUTH_SECRET, SITE_ORIGIN=https://ailakorn.com, ADMIN_EMAIL/ADMIN_PASSWORD
npm ci && npx prisma generate && npx prisma db push && npm run db:seed && npm run build
npm i -g pm2 && pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
# nginx: คัดลอก deploy/nginx.conf ไป /etc/nginx/sites-available/ailakorn → symlink → certbot --nginx -d ailakorn.com -d www.ailakorn.com
# อัปเดตโค้ด
git pull && npm ci && npx prisma db push && npm run build && pm2 reload ailakorn
```

หรือ Docker: `docker build -t ailakorn . && docker run -d --name ailakorn -p 3000:3000 -v ailakorn-data:/app/data --env-file .env ailakorn`

**Backup** = ไฟล์ `data/ailakorn.db` + โฟลเดอร์ `data/uploads/` (คัดลอกสองอย่างนี้ไปที่อื่นเป็นประจำ เช่น cron + rclone)

## หลังบ้านทำอะไรได้

| หน้า | ทำอะไร |
|---|---|
| แดชบอร์ด | จำนวนเรื่อง/ตอน · สถานะดัชนี · สิ่งที่ยังขาด (ไม่มีปก) · ประวัติการแก้ล่าสุด |
| เรื่องและตอน | เพิ่ม/แก้/ลบเรื่อง · ตอน (ชื่อ ความยาว URL วิดีโอ เพิ่ม/ลบ/เลื่อน) · ทิศวิดีโอ · แนว/แท็ก · นักแสดง · สีธีม · อัปโหลดปก 2:3 และภาพกว้าง (ระบบย่อ/แปลง WebP และตรวจสัดส่วนให้) · เผยแพร่/ร่าง |
| แนวและแท็ก | ทะเบียนแนว (พร้อม title/description/ข้อความนำสำหรับ SEO ของหน้าแนว) และแท็ก |
| ตั้งค่าเว็บ / SEO | ชื่อเว็บ · URL ของเว็บ (canonical/og/sitemap) · เปิด/ปิดให้ Google เก็บดัชนี (robots.txt) |
| ผู้ใช้ | เพิ่ม/แก้/ปิดบัญชี · สิทธิ์ admin/editor |
| ประวัติการแก้ | audit log ใครทำอะไรเมื่อไร |

กฎข้อมูลที่หลังบ้านบังคับ (เหมือนสัญญา ADR-001 เดิม): ชื่อเรื่อง ≤80 · ประโยคโปรย ≤90 ไม่ลงท้ายด้วยจุด · เรื่องย่อ 80–600 และไม่ซ้ำประโยคโปรย · เลือกแนว ≥1 · ทิศวิดีโอบังคับ · เรื่องแนวนอนต้องมีภาพกว้าง · ตอน 0:30–10:00 · ต้องมีปกก่อนเผยแพร่ · เปลี่ยน slug ของเรื่องที่เผยแพร่แล้วไม่ได้ (URL = SEO)

## SEO ที่ทำไว้

- HTML มีเนื้อหาจริงทุกหน้า (SSG/ISR) · URL เดิมทุกเส้น (`/series/<slug>/`, `/watch/<slug>/ep-<n>/` …) + 301 จากลิงก์รุ่นเก่า (.html)
- `<title>`/description เฉพาะหน้า · canonical · Open Graph (video.tv_show / video.episode) · Twitter card · `lang="th"` · `og:locale th_TH`
- JSON-LD: WebSite+SearchAction · TVSeries/TVSeason/TVEpisode · CollectionPage/ItemList · BreadcrumbList · FAQPage · AboutPage/ContactPage · ไม่มี VideoObject/คะแนน/ยอดวิวที่ไม่มีข้อมูลจริง
- sitemap.xml (lastmod จากเวลาแก้จริง) · robots.txt สลับได้จากหลังบ้าน · หน้าส่วนตัวและตอน ≥2 เป็น noindex (จนกว่าจะมีชื่อตอน/คำบรรยายเฉพาะตัว)
- รูปผ่าน next/image (srcset · AVIF/WebP · width/height กัน CLS · lazy · ภาพฮีโร่ preload) · ฟอนต์ไทย subset ในเครื่อง · ไม่มีสคริปต์บุคคลที่สาม
- ด่านอัตโนมัติ `tests/site-check.mts` ตรวจทุกหน้าตามกฎข้างบนทุกครั้งที่ต้องการ

## โครงสร้างโค้ด

```
prisma/schema.prisma      ตาราง: Setting Genre Trope Series Episode User AuditLog · prisma/seed.ts นำเข้า content.json เดิม
src/lib/content.ts        ชั้นข้อมูลหน้าบ้าน (cache tag "content") + ค่าที่คิดจากข้อมูล (TOP10 แท็กที่เปิด ปกไทล์แนว เรื่องคล้ายกัน หน้าตัวละคร)
src/lib/seo.ts            metadata + JSON-LD + กฎตัด title/description
src/lib/progress.ts       ดูต่อ/ติดตาม/ประวัติ ใน localStorage ของผู้ชม (คีย์เดิมของเว็บรุ่น static)
src/lib/auth.ts           session JWT ใน cookie httpOnly · bcrypt · กันเดารหัสผ่าน
src/lib/admin/            validate.ts (zod · กฎสัญญา) · images.ts (sharp) · actions.ts (server actions ทุกอัน)
src/app/(หน้าผู้ชม)       page.tsx feed search browse genre tag popular new schedule az cast series watch library settings notifications welcome offline 404 about contact help legal behind-the-ai
src/app/admin/            login + (auth)/ แดชบอร์ด series taxonomy settings users account audit
src/components/           Layout (Shell/Header/Footer) · Cards · CoverImg · client/ (Player EpGrid Feed Search Library …) · admin/
src/styles/               tokens.css + site.css ของ Visual (คัดลอกมาทั้งชุด) + next.css ส่วนเพิ่มเล็กน้อย
```
