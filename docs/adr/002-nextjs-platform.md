# ADR-002: ย้ายทั้งเว็บ + CMS + หลังบ้าน ไป Next.js (เน้น SEO)

| | |
|---|---|
| **สถานะ** | Accepted — 29 ต.ค. 2026 (คำสั่งลูกค้า: "ทำด้วย Next.js ทั้งหมด ทั้ง CMS และหลังบ้าน โดยเน้น SEO") |
| **แทนที่** | ADR-001 ทางเลือก A (Git-as-CMS + static generator) — ADR-001 §6 (สัญญาข้อมูล) และกฎ V1–V19 **ยังเป็นเกณฑ์** ย้ายมาเป็น zod + ด่านทดสอบ |
| **โค้ด** | `web/` (Next.js 16 · React 19 · TypeScript · Prisma/SQLite · sharp) |

## 1. ทำไมเปลี่ยน
ADR-001 เลือก Git-as-CMS เพราะต้นทุนศูนย์และไม่มีเซิร์ฟเวอร์ แต่หลังบ้านที่ได้ต้องให้ทีมเปิดโปรเซส broker บนเครื่องตัวเองและต้องมี GitHub App — ไม่ใช่ "พร้อมใช้งานจริง" ในความหมายของลูกค้า
ลูกค้าตัดสินใจให้ระบบทั้งหมดเป็นแอปเดียว มีหลังบ้านที่เข้าใช้ด้วย URL + รหัสผ่าน และเน้นคุณภาพ SEO สูงสุด ⇒ เลือก Next.js (ทางเลือก C ของ ADR-001 §4.3 ที่เคยเลื่อนไว้)

## 2. สถาปัตยกรรม
- **แอปเดียว** รัน Node (pm2/Docker) หลัง nginx · หน้าบ้านเป็น SSG/ISR (HTML มีเนื้อหาจริง) · หลังบ้านเป็น server components + server actions
- **ฐานข้อมูล**: SQLite ไฟล์เดียว (`data/ailakorn.db`) ผ่าน Prisma — เปลี่ยนเป็น PostgreSQL ได้ด้วยการแก้ provider/URL · ตาราง: Setting · Genre · Trope · Series · Episode · User · AuditLog
- **ไฟล์ภาพ**: `data/uploads/` เสิร์ฟที่ `/media/…` · อัปโหลดถูกแปลงเป็น WebP ขนาดตามสัญญา (ปก 1024×1536 · ภาพกว้าง 2640×1200 ≤300 KB) · ชื่อไฟล์มี hash (cache ยาวได้)
- **ความสดของหน้า**: ทุกหน้าอ่านผ่าน `getCatalog()` ที่ cache ด้วย tag `content` · ทุก server action ที่เปลี่ยนข้อมูลเรียก `revalidateTag` + `revalidatePath('/', 'layout')` ⇒ ผู้ชมเห็นของใหม่ทันทีโดยไม่ build
- **Auth หลังบ้าน**: อีเมล/รหัสผ่าน (bcrypt) · session JWT ใน cookie httpOnly · บทบาท admin/editor · ปิดบัญชีมีผลทันที · audit log ทุกการแก้ · ผู้ชมยังไม่มีบัญชี (ADR-001 §5 ไม่เปลี่ยน)
- **URL**: เหมือนเว็บรุ่น static ทุกเส้น (trailing slash) + 301 จากลิงก์รุ่นเก่า `.html` ⇒ ไม่เสียน้ำหนักค้นหาตอนย้าย

## 3. SEO ที่บังคับไว้ในโค้ด (ไม่ใช่แค่แนวทาง)
title ≤60 / description ≤160 ไม่ซ้ำ · h1 เดียว · canonical · OG/Twitter · JSON-LD (WebSite+SearchAction, TVSeries/TVEpisode, CollectionPage, BreadcrumbList, FAQPage) · sitemap/robots จากฐานข้อมูล · noindex หน้าส่วนตัวและตอน ≥2 · ไม่มี VideoObject/คะแนน/ยอดวิวที่ไม่มีข้อมูล (V12/V13) · img มี width/height/alt/loading · ถ้อยคำต้องห้าม (สมัครสมาชิก/ล็อกอิน/VIP …) — ทั้งหมดตรวจด้วย `web/tests/site-check.mts` กับเซิร์ฟเวอร์จริง

## 4. สิ่งที่ยังไม่ทำ / งานต่อ
- ยังไม่มีไฟล์วิดีโอจริง: ตอนมีช่อง `videoUrl` แล้ว เพลเยอร์เล่น `<video>` เมื่อมีค่า ไม่มี = เดินเวลาจำลองเหมือนเดิม
- ยอดวิว: `Setting.viewsSource = none` คงไว้ (ADR-001 §7) — ต้องมีระบบวัดจริงก่อนเปิด
- ดูตัวอย่างร่าง (preview ก่อนเผยแพร่) ยังไม่มี — ร่างไม่แสดงบนเว็บจนกว่าจะเผยแพร่
- ฟอร์มติดต่อยังไม่ส่งอีเมล (เหมือนรุ่นเดิม)
- เว็บรุ่น static (รากรีโป + CI → GitHub Pages) ยังอยู่ใช้เป็นชุดอ้างอิง/สำรองจนกว่า Next จะขึ้นโดเมนจริง จากนั้นค่อยถอด

## 5. การย้ายขึ้นโปรดักชัน
ดู `web/README.md` (pm2 + nginx หรือ Docker) · ตั้ง `SITE_ORIGIN=https://ailakorn.com` และ `AUTH_SECRET` · ชี้ DNS ของ ailakorn.com มาที่ VPS · เปิด "ให้ Google เก็บดัชนี" ในหน้าตั้งค่าหลังบ้านเมื่อพร้อม
