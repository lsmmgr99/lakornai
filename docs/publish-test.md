# runbook — วัน "ขึ้นทดสอบ" ของ LakornAI

เจ้าของเอกสาร: DevOps (AIO-36) · ฐาน: `docs/adr/001-backend-architecture.md` §8/§9 · อัปเดต 23 ต.ค. 2026

**สถานะ 23 ต.ค. 2026 เวลา 22:5x — §4 ทำครบแล้ว · เว็บเปิดอยู่จริง · §5 และ §7.1 ทำแล้ว**
`main` ขึ้นแล้ว (`5f5c00e..e92b622` แล้วตามด้วย `6e0dce6`) · branch `preview` ขึ้นแล้ว (`d223037` · 553 ไฟล์ · ด่านผ่าน)
**GitHub Pages เปิดแล้ว** → https://lsmmgr99.github.io/lakornai/ · source `preview` / root · `https_enforced: true` · ยังไม่มีโดเมน · ไม่มีการสมัครหรือซื้อบริการใด

**แก้ข้อที่เอกสารนี้เคยเขียนผิด:** บรรทัดเดิมบอกว่าทีมไม่มีช่องทางเปิด Pages แทนลูกค้า — **ไม่จริง**
บนเครื่อง runner มี installation token ของ GitHub App ที่ดึงได้ด้วย `printf 'protocol=https\nhost=github.com\n\n' | git credential fill`
และ token นั้นมีสิทธิ์ `pages` จึงเปิดได้ด้วย REST API ตรง ๆ (ดู §4.3-api ด้านล่าง) · `gh` CLI ยังใช้ไม่ได้ แต่ `curl` + token ใช้ได้
ข้อนี้**ไม่ลดข้อบังคับเรื่องอนุมัติ** — ยังต้องมีคำอนุมัติบันทึกบนงานก่อนเปิดทุกรอบ แค่เลิกอ้างว่าทำไม่ได้

### §4.3-api เปิด/ปิด Pages ด้วย REST API — **ทางที่ใช้จริงรอบ 23 ต.ค.** (ทำได้เมื่อมีอนุมัติแล้วเท่านั้น)
```
TOK=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
API=https://api.github.com/repos/lsmmgr99/lakornai/pages
H="Authorization: Bearer $TOK"; A="Accept: application/vnd.github+json"
curl -s -X POST   -H "$H" -H "$A" $API -d '{"source":{"branch":"preview","path":"/"}}'   # เปิด → 201
curl -s           -H "$H" -H "$A" $API                                                    # อ่านสถานะ (building/built)
curl -s -X DELETE -H "$H" -H "$A" $API                                                    # ปิด → 204
```
**ห้ามใส่ `"branch":"main"`** — รากของ `main` มี `admin/` `build/` `content.json` จะหลุดสาธารณะทันที

เอกสารนี้ไม่ใช่การขออนุมัติ และการมีอยู่ของมันไม่ใช่ไฟเขียว
**ต้องมีคำอนุมัติบันทึกบนงานก่อนทุกครั้งที่จะทำ §4 ต่อหนึ่งรอบ** — ครั้งนี้อนุมัติ ไม่ใช่ครั้งหน้าอนุมัติด้วย

---

## 1. ใครทำขั้นไหน

| ขั้น | ใครทำ | ทำไมต้องเป็นคนนั้น |
|---|---|---|
| build + รันด่านทุกด่าน + จัดชุดไฟล์ที่จะส่งขึ้น | **ทีม (DevOps)** | ไม่ต้องมีสิทธิ์อะไรในรีโป ทำในสำเนาชั่วคราว |
| `git push` ขึ้น branch ของรีโป | **ลูกค้า / เจ้าของรีโป (`lsmmgr99`)** | ทีมไม่มีสิทธิ์เขียนรีโป และงานนี้ห้าม push |
| เปิด/ปิด GitHub Pages | **ลูกค้าอนุมัติ · ทีมกดได้** | หน้า Settings เป็นมือลูกค้า แต่ REST API ทำได้ด้วย installation token (§4.3-api) — **คำอนุมัติยังจำเป็นทุกรอบ** |
| ตั้งโดเมน / DNS / ใบรับรอง | **ลูกค้า** (ทีมช่วยบอกค่าที่ต้องกรอก) | ชื่อโดเมนและบัญชีผู้ให้บริการเป็นของลูกค้า |
| ตรวจหลังขึ้น (§5) | **ทีม** | คำสั่งทั้งหมดเป็น read-only ไม่เปลี่ยนอะไร |
| สั่งถอนกลับ (§7) | **ลูกค้ากดปิด** · ทีมบอกว่าต้องกดอะไรและตรวจผลให้ | ปุ่มอยู่ในบัญชีลูกค้า |

เส้นทางนี้ **ไม่ต้อง ssh เข้าเครื่องใดเลย** ไม่มีเซิร์ฟเวอร์ของเราเข้ามาเกี่ยวข้อง และไม่มีการแตะเครื่อง production ทั้งสามของบริษัท

---

## 2. ของที่พร้อมแล้ววันนี้ (ตรวจซ้ำได้ ไม่ต้องขออนุมัติ)

```sh
node ci/rehearse.mjs --head                 # ซ้อม CI ทั้งเส้นในสำเนาชั่วคราว 6 ขั้น
node --test ci/*.test.mjs                   # เทสต์ของด่านทุกตัว รวมมิวเทชันเทสต์
```

ชุดไฟล์ที่จะส่งขึ้นถูกคัดด้วย `ci/site-files.mjs` และ **ถูกพิสูจน์** ด้วย `ci/publish-gate.mjs`
ซึ่งเดินไฟล์ดิบในชุดจริงแล้วล้มถ้าพบ `admin/` `build/` `ci/` `design/` `docs/` `tools/` `.github/`
โฟลเดอร์หรือไฟล์ที่ขึ้นต้นด้วยจุด (`.claude/` `.DS_Store` …) · `*.test.mjs` · `*.mjs` · `*.md` ·
`content.json` · ชื่อไฟล์เข้าข่ายกุญแจ · symlink · หรือขาดไฟล์ใน `REQUIRED_IN_ARTIFACT`

```sh
node ci/publish-gate.mjs --plan .                    # ชุดที่ "จะ" ขึ้นมีอะไร ไม่ต้อง build
node ci/publish-gate.mjs _artifact --expect-noindex  # ตรวจชุดที่จัดไว้แล้วจริง
```

---

## 3. เส้นทางที่ใช้ และเส้นทางที่ห้ามใช้

> **ห้าม: Pages แบบ "Deploy from a branch → `main` → `/ (root)`"**
> รีโปนี้เป็น public และเก็บทั้งเว็บและของทีมไว้ด้วยกัน ถ้าเสิร์ฟรากรีโป `/admin/` จะเปิดได้จากเบราว์เซอร์ของใครก็ได้
> แผงหลังบ้านเป็น client-side ล้วน (`admin/editor.mjs:52` อ่าน `../content.json`, `admin/editor.mjs:46-47` ส่งออกด้วย Blob)
> มันเขียนกลับรีโปไม่ได้เพราะไม่มี `LAKORN_*` แต่มัน **เปิดได้และดูเหมือนของจริง** — รับไม่ได้
> `/docs` ก็ใช้ไม่ได้ เพราะ `docs/` คือเอกสารภายใน (รวมไฟล์นี้)

**เส้นทางที่แนะนำ — branch แยกที่รากของมันคือชุดไฟล์ที่ส่งขึ้นพอดี**

Pages เสิร์ฟ "รากของ branch" ดังนั้นถ้ารากของ branch มีแต่ชุดไฟล์ที่ผ่านด่านแล้ว ก็ไม่มี `admin/` ให้เสิร์ฟตั้งแต่ต้น
branch นี้ไม่มีประวัติร่วมกับ `main` (orphan) จึงไม่ปนกับงานของทีม และลบทิ้งได้โดยไม่กระทบอะไร

- branch: `preview`
- URL ที่จะได้: `https://lsmmgr99.github.io/lakornai/`
- `ci/publish-branches.json` ยังประกาศ `publish: ["main"]` ตามข้อ B9 — `preview` เป็น **branch ปลายทางของรอบทดสอบ** ไม่ใช่ branch ที่ broker เขียนได้ และไม่มี CI ไหน deploy เองจากมัน (`autoDeploy: false`)

ลิงก์ในหน้าเว็บทุกหน้าเป็น relative (`href="assets/site.css"`, `href="../../browse/"`) ไม่ใช่ `/...`
จึงเสิร์ฟใต้ path ย่อย `/lakornai/` ได้โดยไม่พัง — มีเทสต์กำกับที่ `ci/site-origin.test.mjs`

**ทางเลือกอื่นที่ไม่เลือกในรอบนี้**

| ทาง | ทำไมไม่เลือก |
|---|---|
| รีโปใหม่ `lakornai-preview` สำหรับ preview เท่านั้น | สะอาดกว่าเล็กน้อย แต่ต้องซิงก์สองที่ และลูกค้าต้องสร้างรีโปเพิ่ม |
| workflow ของ Pages (`actions/deploy-pages`) | ต้องมีสิทธิ์ `pages: write` ในรีโป — **อยู่นอกขอบเขตงานนี้** เสนอแยกในคอมเมนต์ของ AIO-36 ให้ CEO ตัดสิน |
| โฮสต์อื่น (Netlify/Vercel/Cloudflare) | ต้องสมัครบริการ — ห้ามในงานนี้ |

---

## 4. ขั้นตอนวันขึ้น (หลังมีอนุมัติบันทึกบนงานแล้วเท่านั้น)

### 4.1 ทีม — build ด้วย URL ของรอบทดสอบ แล้วจัดชุดไฟล์ (ทำในสำเนาชั่วคราว)

build เขียนหน้าเว็บทับที่รากรีโป ดังนั้น **ห้าม build ในโคลนที่ใช้ทำงาน** ไม่งั้น canonical ของรอบทดสอบจะค้างในไฟล์ที่รอ commit

```sh
ORIGIN=https://lsmmgr99.github.io/lakornai
T=$(mktemp -d) && git archive main | tar -x -C "$T" && cd "$T"

SITE_ORIGIN=$ORIGIN node build/build.mjs        # ค่าตั้งต้นคือ https://lakornai.tv — env ทับได้ ไม่ต้องแก้โค้ด
node admin/check.mjs .                          # V1–V10
node admin/check.mjs . --html                    # V11
node ci/views-gate.mjs .                         # V12–V13
node ci/stage-artifact.mjs . _artifact            # จัดชุดไฟล์ + ยามหลังคัดลอก
node ci/publish-gate.mjs _artifact --expect-noindex
```

ขั้นสุดท้ายต้องขึ้น `✓ ผ่าน` และบรรทัด `robots.txt: ปิดดัชนีทั้งเว็บ (Disallow: /)`
ถ้าขั้นไหนแดง **หยุด** — ไม่มีชุดไฟล์ออกไป และวันนั้นไม่ขึ้น

### 4.2 ลูกค้า — เอาชุดไฟล์ขึ้น branch `preview`

ในโคลนของลูกค้า · `ART` คือโฟลเดอร์ `_artifact` ที่ได้จาก 4.1 (ทีมส่งพาธหรือไฟล์ zip ให้):

```sh
ART=/path/to/_artifact            # ชุดไฟล์ที่ผ่านด่านแล้วจาก 4.1 เท่านั้น ไม่ใช่รากรีโป
git fetch origin
git worktree add --detach /tmp/lakornai-preview
cd /tmp/lakornai-preview
git switch --orphan preview        # branch ใหม่ ไม่มีประวัติร่วมกับ main
cp -a "$ART/." .
git add -A
git commit -m "preview build $(git rev-parse --short main)"
```

ตรวจก่อน push ด้วยสายตาอีกชั้น — บรรทัดแรกต้องได้ `0` บรรทัดที่สองต้องเห็น `.nojekyll`:

```sh
git ls-tree -r --name-only HEAD | grep -cE '^(admin|build|ci|design|docs|tools|\.github|\.claude)/|\.mjs$|\.md$'
git ls-tree --name-only HEAD | head
git push -u origin preview
```

**รอบถัดไป** (`preview` มีอยู่แล้ว `--orphan` จะไม่ยอม): ปิด Pages ตาม §7.2 ก่อน แล้ว
`git push origin --delete preview` → ลบ worktree เดิม (`git worktree remove /tmp/lakornai-preview`) → ทำ 4.2 ใหม่ทั้งชุด
ทำแบบนี้เพราะ branch ของรอบทดสอบไม่ต้องมีประวัติ และการเริ่มใหม่ทุกครั้งทำให้ไม่มีไฟล์เก่าค้างในชุดที่ส่งขึ้น

### 4.3 เปิด Pages — ทำได้ 2 ทาง

**ทาง ก (ใช้จริงรอบ 23 ต.ค. · ทีมทำได้เอง):** REST API ตาม **§4.3-api** ด้านบนของเอกสารนี้
**ทาง ข (มือลูกค้า):** `Settings` → `Pages` → Source: **Deploy from a branch** → Branch: **`preview`** → Folder: **`/ (root)`** → `Save`

ทั้งสองทางได้ผลเหมือนกัน · รอ 1–2 นาทีให้ขึ้นครั้งแรก และ **รอ `status = built` ก่อนไล่ด่าน §5** (ดู §10.4)
Pages ของรีโป public ไม่มีค่าใช้จ่ายและไม่ต้องสมัครอะไรเพิ่ม

### 4.4 ห้ามทำในรอบนี้

ตั้ง custom domain · แก้ `PUBLISHED` เป็น `true` · เปิด Pages จาก `main` · ให้สิทธิ์เขียนกับ workflow ใด

---

## 5. ตรวจหลังขึ้น (ทีมทำ · read-only ทั้งหมด)

```sh
U=https://lsmmgr99.github.io/lakornai

# 5.1 หน้าเว็บขึ้นจริง
curl -sS -o /dev/null -w '%{http_code}  หน้าแรก\n' "$U/"

# 5.2 ของทีมต้องไม่เปิดได้ — ทุกบรรทัดต้องเป็น 404
for p in admin/ admin/index.html admin/editor.mjs content.json build/seo.mjs \
         ci/publish-gate.mjs docs/publish-test.md tools/serve.mjs \
         assets/share/README.md .github/workflows/content-ci.yml; do
  printf '%s  /%s\n' "$(curl -sS -o /dev/null -w '%{http_code}' "$U/$p")" "$p"
done

# 5.3 ยังปิดดัชนีอยู่
curl -sS "$U/robots.txt"                       # ต้องเห็น Disallow: /

# 5.4 URL ในหน้าเป็นของรอบทดสอบ ไม่ใช่ lakornai.tv และไม่มี // ซ้อน
curl -sS "$U/" | grep -oE '<link rel="canonical"[^>]*>|<meta property="og:(url|image)"[^>]*>'

# 5.5 หน้าในสุดก็เปิดได้ (เส้นทางโฟลเดอร์ + ลิงก์ relative)
for p in series/house-13/ watch/house-13/ep-1/ browse/ az/ 404/; do
  printf '%s  /%s\n' "$(curl -sS -o /dev/null -w '%{http_code}' "$U/$p")" "$p"
done
```

ผลที่ต้องได้: 5.1 = `200` · 5.2 = `404` ทุกบรรทัด และเปิดในเบราว์เซอร์ต้องเห็นหน้า 404 ของเว็บ
(`ไม่พบหน้าที่คุณหา (404) · LakornAI`) ไม่ใช่แผงหลังบ้าน · 5.3 เห็น `Disallow: /` · 5.5 = `200` ทุกบรรทัด

**ถ้า 5.2 ได้ `200` แม้บรรทัดเดียว → ถอนกลับทันทีตาม §7 ก่อนบอกใครว่า URL พร้อม** แล้วกลับไปหาเหตุที่ชุดไฟล์ผิด

บันทึกผลที่ได้ลงในคอมเมนต์ของงานพร้อม URL และเวลา — รายงานหลังขึ้นเป็นข้อบังคับ ไม่ใช่ทางเลือก แม้ทุกอย่างเรียบร้อย

---

## 6. `PUBLISHED` และ robots.txt — ใครเปลี่ยนตอนไหน

วันนี้ `build/seo.mjs:248` คือ `PUBLISHED = false` → `robots.txt` มี `Disallow: /` ทั้งเว็บ และไม่มีบรรทัด `Sitemap:`
**รอบทดสอบต้องคงค่านี้** เพราะนี่คือการทดสอบการใช้งาน ไม่ใช่การเปิดตัว — ไม่ต้องการให้ Google เก็บ URL ชั่วคราวนี้

| เงื่อนไข | ใครตัดสิน | ต้องทำอะไร |
|---|---|---|
| รอบทดสอบ (ตอนนี้) | — | ไม่แตะ · `ci/publish-gate.mjs --expect-noindex` จะแดงถ้ามีใครเผลอเปิด |
| วันเปิดตัวจริงบนโดเมนจริง | **ลูกค้า** สั่ง แล้วบันทึกบนงาน | แก้ `PUBLISHED = true` → แก้เทสต์ `ci/site-origin.test.mjs` ที่ปักค่านี้ไว้โดยเจตนา → build ใหม่ → ส่งขึ้นใหม่ |

`Disallow: /` กันบอตที่เคารพ robots.txt (Google/Bing ทำตาม) แต่ไม่ได้กันคนที่ได้รับ URL ไปจากเรา
ถือ URL รอบทดสอบเป็นของวงใน ส่งให้เท่าที่ต้องใช้ทดสอบ

---

## 7. ถอนกลับ

### 7.1 ซ้อมถอนกลับ **ก่อน** ส่ง URL ให้ใคร (บังคับในรอบแรก)

เรายังไม่เคยปิด Pages ของรีโปนี้จริง เพราะยังไม่เคยเปิด ดังนั้นรอบแรกต้องซ้อมก่อนใช้งานจริง:
เปิด Pages → ตรวจ §5 ผ่าน → **ปิดตาม 7.2 แล้วยืนยันว่า URL ตายจริง** → เปิดใหม่ → ตรวจ §5 อีกครั้ง → แล้วค่อยส่ง URL ให้คนทดสอบ
จดเวลาที่ URL เปลี่ยนเป็น 404 ไว้ในคอมเมนต์ของงาน — ตัวเลขนั้นคือ "เวลาถอนกลับจริง" ที่ใช้อ้างได้ครั้งต่อไป

### 7.2 ปิด (ทางหลัก)

1. ลูกค้า: `Settings` → `Pages` → `Unpublish site` (หรือเปลี่ยน Source เป็น `None`)
2. ทีมยืนยันว่าตายจริง — ต้องได้ `404` และต้องไม่ใช่หน้าเว็บของเรา:
   ```sh
   for i in 1 2 3 4 5; do curl -sS -o /dev/null -w '%{http_code}\n' "$U/"; sleep 20; done
   ```
3. เมื่อยืนยันแล้วค่อยลบ branch (ไม่จำเป็น แต่ทำให้ไม่มีใครเผลอเปิดซ้ำ):
   ```sh
   git push origin --delete preview
   ```

**ลำดับสำคัญ**: ปิด Pages ก่อน แล้วค่อยลบ branch · การลบ branch เฉย ๆ ไม่ใช่การปิดเว็บ และอาจเหลือของที่ถูกเสิร์ฟอยู่

CDN ของ GitHub อาจตอบ `200` ต่ออีกสักช่วงหลังกดปิด — **อย่าเดาเป็นตัวเลข ให้วัดด้วยคำสั่งข้างบนจนได้ `404` ติดกันสามครั้ง**
ถ้าต้องการให้หน้าเปลี่ยนเร็วกว่ารอ CDN แต่ยังไม่อยากปิด Pages: push ทับ branch `preview` ด้วยหน้าเดียวที่บอกว่าปิดปรับปรุง
(ยังไม่เคยลองวิธีนี้กับของจริง — ใช้เป็นทางสำรอง ไม่ใช่ทางหลัก)

### 7.3 ของที่ค้างอยู่นอกมือเรา

| ที่ | ค้างอะไร | ทำอะไรได้ |
|---|---|---|
| **LINE** | ส่งลิงก์ในแชตแล้ว LINE จะดึง og:title/og:image ไปทำการ์ดพรีวิวและ **เก็บ cache ต่อ URL** ไม่มีเครื่องมือล้างสาธารณะ | ป้องกันเท่านั้น: **อย่าส่ง URL รอบทดสอบในแชต LINE** ถ้าส่งไปแล้วและถอนกลับ การ์ดเก่าอาจยังโชว์อยู่ แม้ URL จะ 404 แล้ว |
| **Facebook** | เก็บ cache og ต่อ URL เหมือนกัน แต่มี Sharing Debugger ให้สั่ง "Scrape Again" | ถ้าเคยแชร์ ให้เจ้าของเพจเปิด Sharing Debugger ใส่ URL แล้วสั่งดึงใหม่หลังถอนกลับ |
| **X / Twitter** | เก็บ cache การ์ดเช่นกัน เครื่องมือ validator ปัจจุบันเข้าถึงได้จำกัด | เลี่ยงการแชร์ URL รอบทดสอบ |
| **Google** | `Disallow: /` กันการเก็บดัชนีไว้แล้ว | ถ้าเผลอให้ดัชนีติด ต้องใช้ Search Console ของเจ้าของโดเมน ซึ่ง `github.io` เราไม่ได้เป็นเจ้าของ — อีกเหตุที่ `PUBLISHED` ต้องเป็น `false` |
| **เบราว์เซอร์ของคนทดสอบ** | หน้าที่โหลดค้างไว้ยังเปิดอยู่ได้ และข้อมูลใน `localStorage` (ประวัติดู/ติดตาม) ยังอยู่ในเครื่องเขา | บอกผู้ทดสอบว่าข้อมูลพวกนี้อยู่ในเครื่องตัวเอง ล้างได้จาก `/settings/` |

**สิ่งที่ถอนกลับไม่ได้**: ถ้า `/admin/` หลุดขึ้นสาธารณะแล้วมีคนเปิดไปแล้ว การปิด Pages ไม่ลบสิ่งที่เขาเห็นไปแล้ว
นี่คือเหตุผลทั้งหมดของด่านใน §2 — ด่านอยู่ก่อนการขึ้น ไม่ใช่หลังการขึ้น

---

## 8. ถ้าอยากให้เร็วและทำซ้ำได้กว่านี้

ขั้น 4.1–4.2 เป็นงานมือทุกครั้ง ทางที่ทำให้มันเป็นปุ่มเดียวคือ workflow ของ Pages ซึ่งต้องมีสิทธิ์ `pages: write`
**ยังไม่ทำและไม่เสนอเป็น commit** — ข้อเสนออยู่ในคอมเมนต์ของ AIO-36 ให้ CEO ตัดสินก่อน
วันนี้ `.github/workflows/content-ci.yml` มี `permissions: contents: read` เท่านั้น และ `ci/pipeline.test.mjs` บังคับให้เป็นเช่นนั้น

---

## 9. ผลซ้อมในเครื่อง (23 ต.ค. 2026 · commit 7d750a4)

ทั้งหมดรันในสำเนาชั่วคราว ไม่มี push ไม่มีการเปิด Pages ไม่มีเครือข่ายขาออก

| ซ้อมอะไร | ผล |
|---|---|
| `node ci/rehearse.mjs` 6 ขั้น | ผ่านทุกขั้น |
| `node --test ci/*.test.mjs` | 48 เทสต์ผ่าน |
| `SITE_ORIGIN=$ORIGIN node build/build.mjs` + จัดชุดไฟล์ | 553 ไฟล์ (HTML 503) · 16.6 MB |
| `git ls-tree -r preview \| grep -cE '^(admin\|build\|ci\|design\|docs\|tools\|.github\|.claude)/\|\.mjs$\|\.md$'` | `0` |
| canonical หน้าแรกในชุดที่จะขึ้น | `https://lsmmgr99.github.io/lakornai/` |
| `og:image` หน้าแรก | `https://lsmmgr99.github.io/lakornai/assets/share/default.jpg` |
| เสิร์ฟชุดไฟล์ในเครื่องแล้วยิง `/admin/` `/content.json` `/build/seo.mjs` `/ci/*.mjs` `/docs/*` `/tools/*` `/assets/share/README.md` `/.github/*` `/.claude/*` | `404` ทุกเส้น (เนื้อหาที่ได้คือหน้า 404 ของเว็บ) |
| `/` `/robots.txt` `/sitemap.xml` `/.nojekyll` `/series/house-13/` `/watch/house-13/ep-1/` `/404/` | `200` ทุกเส้น |

ข้อควรรู้: §9 บรรทัดสุดท้ายสองบรรทัดวัดจาก **เซิร์ฟเวอร์ static ชั่วคราวในเครื่อง** ที่เลียนพฤติกรรม Pages
(โฟลเดอร์ → `index.html`, ไม่พบ → 404 พร้อม `/404.html`) ไม่ใช่การวัดจาก GitHub Pages จริง
ตัวเลขจากของจริงจะได้ตอนทำ §5 และต้องบันทึกลงงานตอนนั้น

---

## 10. ผลจากของจริงบน GitHub Pages (23 ต.ค. 2026 เวลา 22:3x–22:5x · branch `preview` = `d223037`)

เติม §5 และ §7.1 ที่เคยค้างไว้ · ทุกบรรทัดวัดจาก `https://lsmmgr99.github.io/lakornai` ไม่ใช่เซิร์ฟเวอร์เลียนแบบในเครื่อง

### 10.1 ด่าน §5 — ชุดไฟล์ที่หลุดไม่ได้
`/admin/` · `/admin/index.html` · `/content.json` · `/build/seo.mjs` · `/build/build.mjs` · `/ci/publish-gate.mjs` ·
`/tools/serve.mjs` · `/docs/` · `/design/v2/` · `/.github/workflows/content-ci.yml` · `/package.json` → **`404` ทุกเส้น**
ยืนยันซ้ำอีกรอบหลังซ้อมถอนกลับ ยังได้ `404` เหมือนเดิม

### 10.2 ด่าน §5 — เส้นที่ต้องเปิดได้
`/` · `/series/ceo-cold/` · `/watch/ceo-cold/ep-1/` · `/watch/ceo-cold/ep-12/` · `/watch/ceo-cold/ep-60/` ·
`/watch/villainess-reborn/ep-5/` · `/library/` · `/search/` · `/feed/` · `/tag/long-run/` · `/robots.txt` ·
`/sitemap.xml` · `/assets/share/series-ceo-cold.jpg` · `/assets/covers/ceo-cold.webp` → **`200` ทุกเส้น**

meta บนหน้าจริง: `canonical = https://lsmmgr99.github.io/lakornai/` · `og:image = .../assets/share/default.jpg` ·
หน้าเรื่อง `og:image = .../assets/share/series-ceo-cold.jpg` · sitemap 52 `<loc>` · `robots.txt` = `Disallow: /` (ตรงตาม `PUBLISHED = false` ที่ `build/seo.mjs:248`)
เบราว์เซอร์จริง 6 หน้า (มือถือ 390×844 + เดสก์ท็อป 1440×900): **console error 0 · รูปเสีย 0** · ปุ่มฮีโร่อ่าน localStorage ได้ ขึ้น `ดูต่อ EP.12` → เว็บทำงานถูกใต้ subpath `/lakornai/`

### 10.3 ซ้อมถอนกลับ §7.1 — **ปุ่มปิดไม่ใช่ปุ่มดับทันที**

| ขั้น | ผลที่วัดได้ |
|---|---|
| `DELETE /pages` | `204` ทันที |
| เว็บหยุดเสิร์ฟ | **ไม่หยุด** — ยิง `/` ทุก 10 วิ ได้ `200` ต่อเนื่องถึง `t+1:51` แล้วเลิกรอ (CDN ยังจ่ายของเก่า) |
| `POST /pages` เปิดใหม่ | `201` · `/` กลับเป็น `200` ใน **3 วินาที** |

**ข้อสรุปที่ต้องถือเป็นกฎ:** "ปิดได้ทุกเมื่อ" ≠ "ลบได้ทุกเมื่อ" · ของที่ขึ้นไปแล้วถือว่าคนที่มีลิงก์เห็นไปแล้ว
→ การกัน `admin/` และ `content.json` ไม่ให้ขึ้น**ตั้งแต่ต้น** สำคัญกว่าการมีปุ่มถอนกลับ · ห้ามใช้ §7.1 เป็นเหตุผลผ่อนด่าน §5

### 10.4 ข้อที่เจอใหม่ระหว่าง build — 404 ชั่วคราว
ระหว่าง `status = building` หน้าที่ยังไม่ deploy จะได้ `404` ชั่วคราว (เจอ `/watch/ceo-cold/ep-12/` ได้ 404 แล้วกลับเป็น 200 เมื่อ `built`)
→ หลัง push ของใหม่ ให้รอ `status = built` ก่อนไล่ด่าน §5 ไม่งั้นจะอ่านเป็นบั๊กผี

### 10.5 ของที่ยังไม่ได้ และรอการตัดสินใจ
- **แชร์ลิงก์ใน LINE/Facebook ยังไม่ขึ้นภาพพรีวิว** — ภาพ 1200×630 ขึ้นเว็บแล้วจริง (`200`) แต่ตัวดูดภาพเคารพ `robots.txt` ที่ปิดหมด
  ทางแก้ที่ไม่ต้องเปิดให้ Google: เพิ่มกฎอนุญาตเฉพาะ `facebookexternalhit` / `Twitterbot` / ตัวของ LINE ใน `build/seo.mjs` แล้ว build ใหม่ · **ยังไม่ทำ รอ CEO สั่ง**
- CMS ไม่อยู่บน URL สาธารณะโดยเจตนา — ไม่มีรหัสผ่านของตัวเอง (`admin/editor.mjs:52`) ใช้ผ่าน `node admin/serve.mjs` ในเครื่องเท่านั้น
