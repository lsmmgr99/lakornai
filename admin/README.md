# แผงจัดการเนื้อหา AiLakorn (หลังบ้าน)

แผงนี้คือ "หลังบ้าน" ของเว็บตามสถาปัตยกรรม **Git-as-CMS** (ADR-001 §4): ไม่มีฐานข้อมูลและไม่มีเซิร์ฟเวอร์เปิดค้าง
แหล่งความจริงคือไฟล์ `content.json` ในรีโป GitHub · แก้ในแผง → commit → CI ตรวจ → build → ส่งขึ้นเว็บเอง
ประวัติการแก้ ใครแก้อะไรเมื่อไร และการย้อนกลับ ได้จาก git โดยไม่ต้องสร้างอะไรเพิ่ม

```
เบราว์เซอร์ (admin/)  ⇄  broker บนเครื่องเดียวกัน (node admin/broker.mjs)  ⇄  GitHub API
                              │ token อยู่ในหน่วยความจำของ broker เท่านั้น
   บันทึกร่าง  → branch admin-drafts/content   (ยังไม่ขึ้นเว็บ · เก็บงานค้าง)
   เผยแพร่     → branch main                   → CI (V1–V13 + build) → force-push `preview` → GitHub Pages
```

## ใช้งานประจำวัน

```sh
node admin/broker.mjs          # เปิด http://127.0.0.1:4190/admin/
```

1. กด **เข้าสู่ระบบ GitHub** → แผงแสดงรหัส 8 ตัว → เปิด github.com/login/device กรอกรหัส → กลับมาแผงจะต่อให้เอง
2. แผงถามว่าจะโหลด **ร่างที่ค้างอยู่** (ถ้ามี) หรือ **ข้อมูลที่เผยแพร่อยู่** — เลือกอย่างใดอย่างหนึ่ง
3. แก้เรื่อง/ตอน/ปก — รายการ "สิ่งที่ต้องแก้" ด้านล่างอัปเดตทันที กดชื่อเรื่องในรายการเพื่อกระโดดไปแก้
4. **บันทึกร่าง** = เก็บไว้บน GitHub (branch ร่าง) ยังไม่กระทบเว็บ · ปิดเครื่องแล้วมาเปิดต่อวันหลังได้
5. **เผยแพร่ขึ้นเว็บ** = commit เข้า `main` → แผงแสดงสถานะ "รอ CI… / กำลัง build… / ขึ้นเว็บแล้ว ✓" (ราว 2–4 นาที)

ปุ่มทั้งสองเปิดให้กดเฉพาะเมื่อ (ก) เข้าสู่ระบบแล้ว (ข) บัญชีนั้นมีสิทธิ์ push รีโปจริง และ (ค) ข้อมูลผ่านการตรวจครบ — ตัวตรวจคือ `admin/validate.mjs` ตัวเดียวกับที่ CI ใช้ จึงไม่มีกรณี "แผงให้ผ่านแต่ CI ล้ม" จากข้อมูล

ไม่มี GitHub App หรือไม่ได้ล็อกอิน ยังใช้ **ส่งออก content.json / ส่งออกพร้อมปก (.tar)** แล้วให้คนที่มีสิทธิ์ commit เข้า `main` เองได้เสมอ (ADR-001 §12.1 ฉ) — ปลายทางเดียวกัน จึงขึ้นเว็บเองเหมือนกัน

## สิ่งที่แก้ได้ในแผง (ครบตามสัญญาข้อมูล version 2)

| ส่วน | ฟิลด์ | กฎที่แผงบังคับ |
|---|---|---|
| ข้อมูลเรื่อง | ชื่อเรื่อง · ประโยคโปรย · เรื่องย่อ | 1–80 · 1–90 ไม่ลงท้ายด้วยจุด · 80–600 และไม่ซ้ำประโยคโปรย (V7) |
| ทิศของวิดีโอ | `orientation` แนวตั้ง/แนวนอน | **ต้องเลือก** ไม่มีค่าตั้งต้น (V14) · แนวนอนต้องมีภาพกว้าง (V16) |
| จัดหมวด | แนว (≥1) · แท็ก · สถานะ/วันออกตอน · นักแสดง · สีธีม | V3 · V5 |
| ปก 2:3 | อัปโหลด PNG/JPEG/WebP ≤ 1 MB | ตรวจ magic bytes ไม่เชื่อชื่อไฟล์ · ชื่อปลายทาง = `assets/covers/<slug>.<ext>` (V6) |
| ภาพกว้าง | อัปโหลด ≤ 300 KB | ต้อง **2640×1200 เป๊ะ** วัดทั้งในเบราว์เซอร์และใน broker · `assets/covers-wide/<slug>.<ext>` (V15) |
| ตอน | ชื่อตอน · ความยาว (พิมพ์ `น:วว`) · เพิ่ม/ลบ/เลื่อนลำดับ | 0:30–10:00 · เลขตอนเรียงใหม่อัตโนมัติ (V4) · เตือนชื่อตอนซ้ำทั้งคลัง |
| เรื่องใหม่ / ลบเรื่อง | รหัสเรื่อง (เปลี่ยนไม่ได้) + ชื่อ + ทิศ | ลบแล้วหน้าเรื่อง/หน้าตอนบนเว็บหายเมื่อเผยแพร่ |

ยอดวิวยังปิดอยู่ (`meta.viewsSource = none`) ตาม ADR-001 §7 — แผงไม่มีช่องให้กรอก

---

## ขั้นที่ 1 (ทำครั้งเดียว): สร้าง GitHub App สำหรับล็อกอิน — เจ้าของรีโปทำ 5 นาที

การล็อกอินใช้ **device flow ของ GitHub App** (ADR-001 §12.1 ลำดับ 1): ไม่มี secret อยู่บนเครื่องใคร มีแค่ `client_id` ซึ่งเป็นค่าสาธารณะ
สิทธิ์ของ token จำกัดแค่รีโปนี้ และผูกกับตัวตนของคนที่ล็อกอิน (commit author = คนนั้น)

1. เปิด **https://github.com/settings/apps/new** (บัญชี `lsmmgr99` ซึ่งเป็นเจ้าของรีโป)
2. กรอก
   - GitHub App name: `AiLakorn Admin` (ชื่ออะไรก็ได้ที่ยังว่าง)
   - Homepage URL: `https://github.com/lsmmgr99/lakornai`
   - **ติ๊ก "Enable Device Flow"** (อยู่ใต้หัวข้อ Identifying and authorizing users)
   - Webhook: **เอาติ๊ก Active ออก** (ไม่ใช้)
   - Repository permissions → **Contents: Read and write** (อย่างอื่นปล่อย No access · Metadata เป็น Read-only อัตโนมัติ)
   - Where can this GitHub App be installed? → **Only on this account**
3. กด **Create GitHub App** → หน้าถัดไปจะเห็น **Client ID** (รูปแบบ `Iv1.xxxxxxxxxxxxxxxx` หรือ `Iv23li…`) — คัดลอกไว้
   *ไม่ต้องกด Generate client secret และไม่ต้องสร้าง private key* — device flow ไม่ใช้
4. เมนูซ้าย **Install App** → เลือกบัญชี `lsmmgr99` → **Only select repositories** → เลือก `lakornai` → Install
5. วาง Client ID ลง `admin/config.json`:
   ```json
   "clientId": "Iv1.xxxxxxxxxxxxxxxx"
   ```
   (commit ไฟล์นี้ได้ — Client ID ไม่ใช่ความลับ · **ห้ามใส่ client secret / token / PAT ในไฟล์นี้หรือที่ใดในรีโป**)
6. รัน `node admin/broker.mjs` แล้วลองเข้าสู่ระบบ

ใครล็อกอินได้: ทุกคนที่ GitHub ให้สิทธิ์ push รีโปนี้ (เจ้าของ หรือ collaborator ที่ชวนไว้) — ถอนสิทธิ์ที่รีโปจุดเดียวแล้วแผงปิดให้คนนั้นทันที (B6)

## ขั้นที่ 2: ตัวแปรของ CI (ทำครั้งเดียว · ดู `ci/README.md`)

| ตัวแปร | ตอนนี้ | วันย้ายไปโดเมนจริง |
|---|---|---|
| `SITE_ORIGIN` | ไม่ตั้ง → `https://lsmmgr99.github.io/lakornai` | `https://ailakorn.com` |
| `PAGES_CNAME` | ไม่ตั้ง | `ailakorn.com` — **หลัง** ชี้ DNS แล้ว |
| `SITE_PUBLISHED` | ไม่ตั้ง → robots ปิดดัชนี | `1` เมื่อพร้อมให้ Google เก็บ |

ตั้งที่ GitHub → Settings → Secrets and variables → Actions → Variables

---

## ตั้งค่า (admin/config.json)

```json
{
  "clientId": "",                       // Client ID ของ GitHub App (ค่าสาธารณะ) · ว่าง = ปุ่มล็อกอินปิด ใช้ได้แค่ส่งออกไฟล์
  "owner": "lsmmgr99", "repo": "lakornai",
  "draftBranch": "admin-drafts/content", // ปุ่ม "บันทึกร่าง" เขียนที่นี่ · สร้างเองถ้ายังไม่มี · ต้องขึ้นต้น admin-drafts/
  "publishBranch": "main",              // ปุ่ม "เผยแพร่" เขียนที่นี่ · CI ตรวจ/build/ส่งขึ้นเว็บเอง
  "siteUrl": "https://lsmmgr99.github.io/lakornai/", // ลิงก์ที่แผงแสดงเมื่อขึ้นเว็บแล้ว
  "port": 4190
}
```

env ตั้งทับได้ทุกค่า: `LAKORN_APP_CLIENT_ID` `LAKORN_REPO_OWNER` `LAKORN_REPO_NAME` `LAKORN_DRAFT_BRANCH` `LAKORN_PUBLISH_BRANCH` `LAKORN_SITE_URL` `LAKORN_PORT`

## ขอบเขตความปลอดภัยของ broker (ADR-001 §12.1 ค — ยังครบทุกข้อ)

- ผูก `127.0.0.1` เท่านั้น · ตรวจ `Host`/`Origin` ทุกคำขอ · CSRF token ต่อ session (B1–B3)
- token ของ GitHub อยู่ในหน่วยความจำของ broker ไม่เขียนดิสก์ ไม่ลง log ไม่ส่งเบราว์เซอร์ · ปิดโปรเซส = session ตาย (B4–B5)
- เปิดปุ่มเขียนก็ต่อเมื่อ GitHub ยืนยันว่าบัญชีมีสิทธิ์ push (B6)
- เขียนได้แค่ `content.json` · `assets/covers/<slug>.<ext>` · `assets/covers-wide/<slug>.<ext>` — allowlist ตายตัว ไม่ใช่ prefix (B7 + §13.8) · ห้าม force push ห้ามลบ branch
- ปกตรวจ magic bytes · ภาพกว้างวัดขนาดจริงด้วย `build/imgsize.mjs` ตัวเดียวกับ CI (B8)
- branch ร่างต้องไม่ใช่ branch เผยแพร่ · การเผยแพร่เข้า `main` เป็นเส้นแยกที่ต้องกดยืนยัน และผ่าน CI ทุกด่านก่อนถึงเว็บ (B9 ฉบับแก้ §14)
- ไม่มี credential ของเครื่องมือภายใน (harness) เกี่ยวข้อง · ไม่มีรหัสผ่านร่วม

## ทดสอบ

```sh
node --test admin/*.test.mjs        # broker · provider · client · ตัวตรวจ · ปก (ไม่ต้องมีเครือข่าย)
node admin/browser-test.mjs         # แผงในเบราว์เซอร์จริง โหมดไฟล์ (ต้องมี Chromium · CHROME=/path ตั้งทับได้)
node admin/broker-browser-test.mjs  # แผง + broker กับ GitHub จำลอง: ล็อกอิน · บันทึกร่าง · เผยแพร่ · สถานะ CI
node admin/check.mjs                # V1–V10 ของ content.json ที่ราก (CI รันตัวนี้)
node admin/reproduce.mjs            # แก้ชื่อตอนในสำเนา → build → ตรวจ HTML (ไม่แตะไฟล์ในรีโป)
```

## ถ้าเกิดปัญหา

| อาการ | สาเหตุ/ทางแก้ |
|---|---|
| ปุ่มเข้าสู่ระบบเป็นสีจาง | `clientId` ใน `admin/config.json` ยังว่าง — ทำขั้นที่ 1 |
| "GitHub ตอบกลับ 404/403" ตอนโหลด/บันทึก | App ยังไม่ได้ **Install** กับรีโป `lakornai` หรือ permission Contents ไม่ใช่ Read and write |
| "บัญชีนี้ไม่มีสิทธิ์เขียนรีโป" | บัญชีที่ล็อกอินไม่ใช่ collaborator ที่มีสิทธิ์ push — เชิญที่ Settings → Collaborators |
| 409 "ข้อมูลบน GitHub เปลี่ยนไป" | มีคน commit แทรก — ออกจากระบบแล้วล็อกอินใหม่เพื่อโหลดข้อมูลล่าสุด (ส่งออกร่างไว้ก่อนถ้ากลัวหาย) |
| เผยแพร่แล้วแต่ "CI ล้ม" | เปิดลิงก์ run ที่แผงให้ — ส่วนมากเป็นด่าน V12–V13/ตัว build ซึ่งเป็นเรื่องโค้ด ไม่ใช่ข้อมูล · เว็บยังเป็นของเดิม ไม่เสียหาย |
| ขึ้นเว็บแล้วแต่หน้าเว็บยังเก่า | GitHub Pages ใช้เวลาราว 1 นาทีหลัง `preview` เปลี่ยน · ลอง reload แบบข้ามแคช |
