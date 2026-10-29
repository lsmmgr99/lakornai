# CI ของ AiLakorn — commit เนื้อหา → ตรวจ V1–V13 → build artifact → ส่งขึ้น GitHub Pages

เจ้าของ: DevOps (AIO-30) · ทำตาม `docs/adr/001-backend-architecture.md` §9, §12 และ **§14** (เผยแพร่อัตโนมัติ · 29 ต.ค. 2026)

**ขอบเขต:** CI ตรวจและ build ทุก branch/PR โดยไม่มีสิทธิ์เขียน · เฉพาะ **push ขึ้น `main`** ที่ผ่านด่านครบ
job `publish-site` จึงเอาชุดไฟล์เดียวกันนั้นส่งขึ้น branch **`preview`** ซึ่ง GitHub Pages เสิร์ฟอยู่
ไม่มีเซิร์ฟเวอร์ของเราเข้ามาเกี่ยว · ไม่ตั้ง DNS (เป็นของเจ้าของโดเมน) · ไม่สมัครบริการใด

---

## เส้นทางที่ CI เดิน

```
commit ที่แตะ content.json / assets/covers/** / assets/covers-wide/** / build / ci
        │
        ▼  job validate-build-artifact (ทุก branch · อ่านอย่างเดียว)
   เทสต์ด่าน  node --test ci/views-gate.test.mjs ci/pipeline.test.mjs ci/deploy-branch.test.mjs
   V1–V10     node admin/check.mjs .
   build      node build/build.mjs              ← SITE_ORIGIN / SITE_PUBLISHED จาก repository variables
   V11        node admin/check.mjs . --html
   V12–V13    node ci/views-gate.mjs .
   artifact   node ci/stage-artifact.mjs . _artifact   →  เก็บเป็น artifact ให้ดาวน์โหลด
        │
        ▼  job publish-site (เฉพาะ push ขึ้น main · needs: job แรกผ่าน · contents: write เฉพาะ job นี้)
   ส่งขึ้น     node ci/deploy-branch.mjs _artifact      →  force-push ชุดไฟล์ขึ้น branch `preview`
        │
        ▼
   GitHub Pages build จาก `preview` แล้วเสิร์ฟ (ราว 1 นาที)
```

ไฟล์ที่ประกอบกันเป็นเส้นนี้:

| ไฟล์ | หน้าที่ | เจ้าของ |
|---|---|---|
| `.github/workflows/content-ci.yml` | ตัวปลุก ลำดับขั้น และขอบเขตสิทธิ์ของสอง job | DevOps |
| `ci/pipeline.mjs` | ลำดับขั้นเขียนที่เดียว (`STEPS` + `PUBLISH_STEPS`) · YAML/README/ตัวซ้อมอ้างอันนี้ | DevOps |
| `ci/views-gate.mjs` | ด่าน **V12–V13** (§6.4 + §12.3) — กฎของ *ผลผลิต build* ไม่ใช่ของไฟล์ข้อมูล | DevOps |
| `ci/site-files.mjs` | ขอบเขตของ "ไฟล์ที่เป็นของเว็บ" — คัดทุกชั้นของพาธ ไม่ใช่แค่ชั้นราก | DevOps |
| `ci/stage-artifact.mjs` | คัดไฟล์ที่ผู้ชมต้องได้ แล้วเรียกด่านพิสูจน์ชุดไฟล์ทับอีกชั้น | DevOps |
| `ci/publish-gate.mjs` | **ด่านพิสูจน์ชุดไฟล์ที่ส่งขึ้น** (AIO-36) — เดินไฟล์ดิบในชุดจริง ใช้เดี่ยว ๆ ได้ | DevOps |
| `ci/deploy-branch.mjs` | **ขั้นส่งขึ้น** — ตรวจชุดไฟล์ซ้ำ เขียน CNAME (ถ้าสั่ง) แล้ว force-push orphan commit ขึ้น `preview` | DevOps |
| `ci/rehearse.mjs` | ซ้อมทุกขั้นในเครื่อง ในสำเนาชั่วคราว (ขั้นส่งขึ้นซ้อมแบบ `--dry-run`) | DevOps |
| `ci/publish-branches.json` | แหล่งความจริงเดียวของ branch ต้นทาง/ผลผลิต/ร่าง | DevOps |
| `admin/check.mjs` + `admin/validate.mjs` | ด่าน **V1–V11** — *ตัวตรวจร่วม* กับแผง admin ตาม §9.2 | Dev-Codex |
| `build/build.mjs` | ตัว build หน้าเว็บ static | Dev-Claude |

CI **ไม่มีตัวตรวจสำเนาของตัวเอง** สำหรับ V1–V11 — เรียก `admin/check.mjs` ตัวเดียวกับที่แผงใช้
เพื่อให้ "ที่แผงเตือน" กับ "ที่ CI ตัดสิน" ไม่มีทางให้คำตอบต่างกัน (§9.2)

---

## ตัวแปรที่ตั้งได้โดยไม่แก้โค้ด (Settings → Secrets and variables → Actions → **Variables**)

| ตัวแปร | ความหมาย | ไม่ตั้ง = |
|---|---|---|
| `SITE_ORIGIN` | origin ที่เว็บเสิร์ฟจริง ใช้กับ canonical · og:url · sitemap · JSON-LD เช่น `https://ailakorn.com` | `https://lsmmgr99.github.io/lakornai` |
| `SITE_PUBLISHED` | `1` = `robots.txt` เปิดให้เก็บดัชนีและชี้ sitemap | `0` = `Disallow: /` ทั้งเว็บ (รอบทดสอบ) |
| `PAGES_CNAME` | โดเมนที่ผูกกับ GitHub Pages เช่น `ailakorn.com` — CI เขียนไฟล์ `CNAME` ให้ · **ตั้งหลังชี้ DNS แล้วเท่านั้น** ไม่งั้นที่อยู่ github.io จะ redirect ไปโดเมนที่ยังไม่ตอบ | ไม่เขียน CNAME · เว็บอยู่ที่ github.io |

ลำดับวันย้ายไปโดเมนจริง: ชี้ DNS ของ `ailakorn.com` ไป GitHub Pages (A records `185.199.108.153` `.109.153` `.110.153` `.111.153` และ/หรือ `www` CNAME → `lsmmgr99.github.io`) → ตั้ง `PAGES_CNAME=ailakorn.com` และ `SITE_ORIGIN=https://ailakorn.com` → push อะไรก็ได้ที่แตะ `content.json`/`build/`/`ci/` หรือกด **Run workflow** → เปิด "Enforce HTTPS" ในหน้า Pages เมื่อใบรับรองออก → เมื่อพร้อมให้ Google เก็บจึงตั้ง `SITE_PUBLISHED=1`

---

## วิธีตรวจซ้ำ

### ทางที่สั้นที่สุด — ซ้อมทุกขั้นในครั้งเดียว

```sh
node ci/rehearse.mjs --head     # ตรวจของที่ commit แล้ว (เท่าที่ CI จะเห็นหลัง checkout)
node ci/rehearse.mjs            # ตรวจ working tree ตามที่เห็นอยู่ รวมการแก้ที่ยังไม่ commit
```

พิมพ์ทุกขั้นพร้อมผลผ่าน/ล้ม และถ้าล้มจะบอกพาธสำเนาชั่วคราวกับคำสั่งที่รันซ้ำขั้นนั้นเดี่ยว ๆ ได้
ขั้นส่งขึ้นถูกซ้อมด้วย `node ci/deploy-branch.mjs _artifact --dry-run` (สร้าง commit ในสำเนา ไม่ push)

สคริปต์นี้ **ทำงานในสำเนาชั่วคราวเสมอ** เพราะ `node build/build.mjs` เขียนหน้าเว็บทับที่รากรีโป

### ทางยาว — รันแต่ละขั้นด้วยมือ

ต้องทำในสำเนา ไม่ใช่ในรีโปที่ใช้ทำงาน (ขั้น build เขียนทับไฟล์หน้าเว็บ):

```sh
T=$(mktemp -d) && git archive HEAD | tar -x -C "$T" && cd "$T"
node --test ci/views-gate.test.mjs ci/pipeline.test.mjs ci/deploy-branch.test.mjs
node admin/check.mjs .
node build/build.mjs
node admin/check.mjs . --html
node ci/views-gate.mjs .
node ci/stage-artifact.mjs . _artifact
node ci/deploy-branch.mjs _artifact --dry-run
```

### ทดสอบตัวด่านเอง

```sh
node --test ci/*.test.mjs
```

`ci/pipeline.test.mjs` บังคับว่า YAML กับ `ci/pipeline.mjs` กับ README นี้ไม่หลุดจากกัน พร้อมยืนยันว่า
job ตรวจ/build ไม่มีสิทธิ์เขียน · `contents: write` มีที่เดียวใน job `publish-site` · job นั้นวิ่งเฉพาะ push ขึ้น `main`
และไม่มีทาง deploy อื่นแอบอยู่ · `ci/deploy-branch.test.mjs` ทดสอบขั้นส่งขึ้นกับ bare repo ในเครื่องจริง (ไม่ต้องมีเครือข่าย)

---

## V12–V13 ตรวจอะไร

บังคับเฉพาะเมื่อ `meta.viewsSource === "none"` ซึ่งเป็นค่าปัจจุบันใน `content.json`
ถ้าวันหนึ่งต่อระบบวัดจริงแล้วเปลี่ยนเป็น `"analytics"` ด่านนี้จะปิดตัวเอง (ตามเงื่อนไขปลดล็อก §7.2 ซึ่งมีประตูของมันเอง)

| กฎ | จับอะไร | ไม่จับอะไร |
|---|---|---|
| **V12(ก)** | ตัวเลขติดคำว่า `วิว`/`views` หรือมีหน่วยย่อ (`ล้าน` `K` `M`) ทั้งในเนื้อหน้า ใน `<title>` ใน meta และใน JSON-LD | — |
| **V12(ข)** | ป้าย `วิว` ที่ไม่มีตัวเลขนำหน้า — "ป้ายกำพร้า" ที่เกิดจาก `views: null` ตาม §12.2 C1 | คำว่า `ยอดวิว` ที่เป็นคำในประโยค · `preview`/`reviews` |
| **V13** | ถ้อยคำที่อ้างว่ามีการวัดผู้ชม ใน `<title>` · `meta description`/`og:*` · JSON-LD · หัวเรื่อง `h1`/`h2` · ข้อความนำ `.page-head` · คำโปรย `.sub` | คำว่า `ยอดนิยม` โดด ๆ · URL `/popular` · การจัดลำดับ · เลขอันดับ 1–10 |

รายงานทุกจุดเป็น `ไฟล์:บรรทัด` ของไฟล์ที่ build เขียนออกมา

---

## branch ในเส้นทางเผยแพร่

ประกาศไว้ใน `ci/publish-branches.json` ให้อ่านได้ทั้งคนและเครื่อง:

| | |
|---|---|
| branch ต้นทาง (content.json + โค้ด · CI ตรวจ/build) | **`main`** |
| branch ผลผลิตที่ GitHub Pages เสิร์ฟ | **`preview`** — CI force-push ทับทุกครั้งที่ `main` เปลี่ยน · **ห้ามใครแก้ด้วยมือ** |
| branch ร่างของแผง admin (ปุ่ม "บันทึกร่าง") | ขึ้นต้นด้วย **`admin-drafts/`** เท่านั้น — CI ตรวจให้แต่ไม่ส่งขึ้น |
| แผง admin เผยแพร่ (ปุ่ม "เผยแพร่ขึ้นเว็บ") | commit ตรงเข้า **`main`** → CI ตรวจ → build → ส่งขึ้น `preview` เอง (ADR-001 §14) |
| CI deploy เองไหม | **ใช่** — `autoDeploy: true` · เฉพาะ job `publish-site` มี `contents: write` และวิ่งเฉพาะ push ขึ้น `main` |

ข้อมูลผิดไม่มีทางถึงเว็บ: ด่านทุกด่านอยู่ใน job แรก ถ้าล้ม job ส่งขึ้นไม่เริ่ม และ `preview` ยังเป็นชุดก่อนหน้า
ย้อนกลับ = `git revert` commit บน `main` แล้ว CI ส่งของเดิมขึ้นให้เอง (ข้อได้เปรียบของ Git-as-CMS ตาม ADR-001 §9.2)

## เส้นส่งออกด้วยมือยังใช้ได้ (ADR-001 §12.1 ฉ)

แก้ในแผง → กด "ส่งออก content.json" → ผู้มีสิทธิ์เขียนรีโป commit ไฟล์นั้น (และปก) เข้า `main` → CI ตื่นเองจาก commit นั้น
เส้นนี้คงอยู่ถาวร และตอนนี้มันก็ขึ้นเว็บเองเหมือนกัน เพราะปลายทางคือ `main` เท่ากัน

## สิ่งที่ชุดไฟล์ที่ส่งขึ้นมีและไม่มี

มี: ไฟล์ `.html` ทุกหน้า (รวม redirect stub) · `assets/` · `robots.txt` · `sitemap.xml` · `redirects.map` · `.nojekyll` · `CNAME` (เฉพาะเมื่อตั้ง `PAGES_CNAME`)

ไม่มี: `admin/` (รวม broker และ `config.json`) · `build/` · `ci/` · `design/` · `docs/` · `tools/` · `.github/` ·
โฟลเดอร์/ไฟล์ที่ขึ้นต้นด้วยจุด ยกเว้น `.nojekyll` และ `.well-known/` · `content.json` · ไฟล์ `.mjs` ใด ๆ · ไฟล์ `.md` · symlink

`ci/stage-artifact.mjs` และ `ci/deploy-branch.mjs` ต่างเดินไฟล์ "ดิบ" ของชุดจริงด้วย `allFiles()` ของ `ci/publish-gate.mjs`
แล้วล้มถ้าพบของต้องห้าม — สองชั้นโดยเจตนา: ชั้นหลังไม่เชื่อว่าชั้นหน้าทำแล้ว

## ด่านพิสูจน์ชุดไฟล์ที่ส่งขึ้น (AIO-36)

```sh
node ci/publish-gate.mjs --plan .                    # ชุดที่ "จะ" ขึ้นมีอะไร โดยไม่ต้อง build
node ci/publish-gate.mjs _artifact                   # ตรวจชุดที่จัดไว้แล้วจริง (เดินไฟล์ดิบ)
node ci/publish-gate.mjs _artifact --expect-noindex  # บังคับ robots.txt ให้ยัง Disallow ทั้งเว็บ (รอบทดสอบ)
node --test ci/publish-gate.test.mjs                 # เทสต์ของด่าน รวมมิวเทชันเทสต์
```

## URL ของเว็บ: `SITE_ORIGIN`

`build/seo.mjs` อ่าน `SITE_ORIGIN` จาก env · ค่าตั้งต้นในโค้ดคือ `https://ailakorn.com` · CI ส่งค่าจาก repository variable และถอยไปใช้ที่อยู่ github.io เมื่อยังไม่ตั้ง

```sh
SITE_ORIGIN=https://lsmmgr99.github.io/lakornai node build/build.mjs
SITE_PUBLISHED=1 node build/build.mjs       # robots.txt แบบเปิดดัชนี
```

เทสต์: `node --test ci/site-origin.test.mjs` (build ทั้งเว็บในสำเนาชั่วคราว แล้ววัดจากไฟล์ที่เขียนออกมาจริง)

## ของที่ตั้งใจยังไม่ทำในชุดนี้

- ไม่ตั้ง branch protection / required status check — เป็นการตั้งค่าในหน้าเว็บของ GitHub ไม่ใช่ไฟล์ในรีโป ขอให้เจ้าของรีโปทำแยก (แนะนำ: ห้าม push ตรงเข้า `preview`)
- ไม่ pin action เป็น commit SHA (ใช้แท็ก `@v4`) — ทำได้และควรทำ แต่ต้องยืนยัน SHA กับของจริง จึงแยกเป็นงานต่างหาก
- ไม่สลับ Pages ไปแบบ "GitHub Actions source" — แบบ branch ใช้ได้กับการตั้งค่า Pages ที่เปิดอยู่แล้ว และไม่ต้องขอสิทธิ์ `pages: write`
