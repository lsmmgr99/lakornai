# แผงจัดการเนื้อหา — สถานะระหว่างพัฒนา

ทำแล้ว: seed ตาม ADR-001, ตัวตรวจข้อมูล, แผงร่างแก้เรื่อง/ตารางตอนหลายรายการ,
ตรวจชื่อซ้ำทั้งคลัง, ส่งออก JSON, ทดสอบ static rebuild แบบไม่แตะไฟล์หน้าบ้านร่วม

มี implementation OAuth/commit ผ่าน broker พร้อม mock tests; ยังไม่พร้อมใช้งานจริงจนผ่าน live validation, รีวิว และ CI อัตโนมัติ
ADR-001 §12 เลือก broker ในเครื่องสำหรับ OAuth และเลื่อนระบบวัดวิวออกจากงานนี้
เส้นส่งออกใช้ได้ถาวรโดยไม่ต้องเข้าสู่ระบบ ส่วน broker ต้องรอ GitHub App ของบริษัทเพื่อทดลองจริง
โหมดร่างนี้ไม่มีสิทธิ์เขียนรีโป และไม่ใช่การเข้าสู่ระบบแอดมินฉบับส่งมอบ

ใช้ Node.js 24 ไม่ต้องติดตั้ง dependency:

```sh
node admin/serve.mjs
# เปิด http://127.0.0.1:4190/admin/
node --test admin/*.test.mjs
node admin/browser-test.mjs # ต้องมี Chromium ตามพาธในไฟล์
node admin/check.mjs
node admin/reproduce.mjs
```

ในแผง เลือกเรื่อง แก้ชื่อตอนหลายแถว กดตรวจชื่อซ้ำอีกครั้ง แล้วส่งออก content.json
ปุ่มส่งออกตรวจฟิลด์และการมีไฟล์ปก ไฟล์ดาวน์โหลดเป็นร่าง ยังไม่ได้ commit
สามารถเปิดร่างกลับมาแก้ต่อได้ ห้ามเปลี่ยน slug ของเรื่องเดิม
แผงยังไม่มี autosave: ส่งออกก่อนปิดหน้าเพื่อเก็บการแก้ไข

`reproduce.mjs` สร้างสำเนาชั่วคราว แก้ชื่อตอนแรก แล้วตรวจข้อมูล/build/ตรวจ HTML
พิมพ์พาธ output ให้เปิดดูได้ ไม่เขียนทับ HTML ใน workspace และไม่ deploy
CI ในอนาคตต้องรัน check ก่อน build และ `check.mjs . --html` หลัง build
V8/V9 ใช้ allowlist ทุกระดับเพื่อปฏิเสธฟิลด์นอกสัญญาทั้งหมด

สร้าง seed ใหม่โดยระบุไฟล์ปลายทางที่ยังไม่มี:

```sh
node admin/seed.mjs assets/data.js /tmp/lakorn-seed.json
```

seed อ่านเฉพาะฟิลด์สัญญา ใช้เรื่องย่อ/แท็กที่มีใน assets/data.js ล่าสุด
จำนวนเริ่มต้น 12 เรื่อง / 418 ตอน / 6 แนว / 13 แท็ก ทิ้งช่อง tuple ที่สาม
ทิ้งยอดวิวตัวอย่างทั้งหมดเป็น null และ viewsSource=none
เรื่องย่อที่นำมาใช้ผ่านข้อกำหนดเชิงรูปแบบแล้ว แต่ยังต้องให้ผู้ดูแลตรวจเนื้อหา

ประตูส่งมอบยังอยู่: Reviewer-Claude และ Reviewer-Codex ให้ความเห็นแยกกัน,
QA ตรวจพฤติกรรม, Security เซ็นรับ auth/upload และ CTO ตัดสินก่อน merge
ไม่มีการ deploy หรือจัดซื้อจากชุดคำสั่งนี้

## ปกและเส้นส่งออกถาวร

เลือกปกในเรื่องที่ต้องการ: รับ PNG/JPEG/WebP ไม่เกิน 1,000,000 ไบต์
ตรวจ magic bytes และให้เบราว์เซอร์ถอดรหัสภาพก่อนรับ ไม่ใช้ชื่อไฟล์ต้นฉบับ
ชื่อปลายทางมาจาก slug ของเรื่อง ปกอยู่ในหน่วยความจำจนปิดหน้า
เมื่อมีปกใหม่ ต้องใช้ “ส่งออกชุดข้อมูลพร้อมปก” เพื่อได้ `lakorn-content.tar`
ซึ่งมี `content.json` และเฉพาะปกใหม่ที่ร่างอ้างถึง ไม่มีคำสั่งเขียนรีโปในแผง
การเปิด JSON ใหม่จะล้างปกในหน่วยความจำหลังยืนยัน ต้องเลือกปกใหม่อีกครั้ง

ผู้มีสิทธิ์เขียนรีโปแตกไฟล์ในโฟลเดอร์พัก ตรวจ diff แล้วคัดลอก JSON และปกไปรีโป
รัน `node admin/check.mjs` และ `node admin/reproduce.mjs` ก่อน commit ทั้งคู่พร้อมกัน
อย่าแตก archive ที่มาจากแหล่งอื่นทับรีโปโดยไม่ตรวจรายการไฟล์ก่อน
เส้นทางนี้ไม่ต้องมี OAuth และคงอยู่แม้เพิ่ม broker แล้ว
CI ยังต้องให้ DevOps เชื่อม commit → ตรวจ V1–V13 → build artifact ตาม ADR §9

## Broker ในเครื่อง (AIO-31 — รอ live validation และ review)

ใช้ GitHub App ของบริษัท เปิด Device flow และติดตั้งแบบ Selected repositories เฉพาะรีโปนี้
ให้ Contents: read/write (Metadata: read เป็นสิทธิ์พื้นฐานของ GitHub) ไม่ใช้ OAuth App/PAT
เจ้าของต้องยืนยัน App permissions และ branch publish ทั้งหมดก่อนทดสอบจริง
สร้าง branch ร่างที่มี content.json และปกไว้แล้ว โดยชื่อขึ้นต้น `admin-drafts/`
ตัว broker ไม่สร้าง branch ไม่ merge ไม่ deploy และไม่รับ path/branch จากหน้าเว็บ

```sh
LAKORN_APP_CLIENT_ID=Iv1_PUBLIC_ID \
LAKORN_REPO_OWNER=COMPANY LAKORN_REPO_NAME=REPO \
LAKORN_DRAFT_BRANCH=admin-drafts/content LAKORN_PUBLISH_BRANCHES=main \
node admin/broker.mjs
```

เปิด http://127.0.0.1:4190/admin/ กดเข้าสู่ระบบ แล้วเปิด github.com/login/device
ใส่ user code ด้วยตนเอง จากนั้นเลือกโหลดข้อมูล branch ร่างหรือเก็บร่างในหน้าไว้ก่อนบันทึก
ปุ่มบันทึกเปิดหลังตรวจ permissions.push และตรวจซ้ำก่อนเขียน
commit สร้าง blobs/tree/commit รวม JSON และปกในครั้งเดียว อัปเดต ref ด้วย force:false
หากหัว branch เปลี่ยน จะปฏิเสธร่างเก่า ให้ส่งออกเก็บไว้แล้วโหลดข้อมูลล่าสุดก่อนปรับใหม่
ไม่มีการรีเฟรช provider token: หมดอายุให้เข้าสู่ระบบใหม่

Session เป็นคุกกี้ HttpOnly/SameSite=Strict ไม่มีวันหมดอายุถาวร
หน้าเว็บส่ง heartbeat ทุก 20 วินาทีและเมื่อกลับมาเปิดแท็บ; pagehide แจ้งปิดเฉพาะแท็บนั้น (session ใช้ร่วมกัน); เมื่อแท็บสุดท้ายปิดจะล้าง session และถ้าขาด heartbeat เกิน 5 นาที
broker จะล้าง session (รวมกรณี browser crash) อายุสูงสุด 8 ชั่วโมงหรือเท่า token หากสั้นกว่า
ปิดโปรเซสจะล้างทั้งหมด ไม่มี token/device code/refresh token เข้าดิสก์หรือส่งกลับ browser
โปรเซสไม่อ่าน PAPERCLIP_GITHUB_* หรือ credential ของ harness
API รับ POST JSON พร้อม Origin ตรงเท่านั้น ทุกคำขอหลัง bootstrap ต้องมี CSRF ต่อ session
static navigation ไม่ส่ง Origin ตามปกติ จึงตรวจ Host และปฏิเสธ cross-site fetch metadata;
ถ้ามี Origin จะต้องตรงเสมอ ไม่มี CORS และไม่เปิดไฟล์นอก allowlist

เอกสารที่ตรวจ 23 ต.ค. 2026:
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- https://docs.github.com/en/rest/git/refs#update-a-reference

ผลที่ทดสอบจริง: mock HTTP trust boundary/CSRF, permissions.push, stale head,
provider path allowlist (รวม .github/, build/, assets/*.js), unknown request fields, force:false, device polling/slow_down/denial/session expiry;
unit validation/cover/tar; Chromium offline export; admin/check.mjs
ยังไม่ทดสอบจริง: App installation, user consent, read-only user, token revocation,
device flow กับ App จริง,
GitHub commit attribution, concurrent remote updates, และ CI branch publish
ต้องผ่าน Reviewer-Claude/Reviewer-Codex อิสระ + QA + Security ก่อน merge
หากรีวิวขัดกันให้ CTO ตัดสิน ไม่ถือว่า mock tests เป็น live sign-off

รอบแก้ review: mock commit ปก+JSON ผ่าน /api/commit, ปฏิเสธปกซ้ำ/slug ที่ไม่มี/ไบต์ผิด,
heartbeat/logout ระหว่าง commit และ busy 409; client test แบบจำลอง DOM ตรวจการไม่โหลดทับร่าง
แล้วยังบันทึกด้วย remote head และแยก heartbeat 409 จาก session 403
ผลรอบก่อน 25/25 ผ่าน; Chromium ทดสอบเฉพาะเส้นส่งออก offline ไม่ใช่ OAuth จริง

รอบแก้ QA Q1–Q4: ลงทะเบียนแท็บแยกกันและปิดเฉพาะแท็บด้วย CSRF; logout โดยผู้ใช้ยังล้างทุกแท็บ
กรณี crash/ส่ง close-tab ไม่ถึง ใช้ idle timeout 5 นาทีเดิม; กลับจาก bfcache ลงทะเบียนใหม่และให้ login ก่อน save
คำขอ commit ที่เริ่มแล้วอาจจบหลังปิดแท็บ/logout ต้องให้ Security ยืนยัน B5 เช่นเดิม
validate ก่อน save แจ้งฟิลด์ที่ผิด; เมื่อ commit สำเร็จล้างเฉพาะปกใน snapshot ที่ยังไม่ถูกแก้ระหว่างรอ
จำ path ปกที่บันทึกสำเร็จไว้สำหรับ JSON export แม้ checkout ในเครื่องยังไม่มีไฟล์จาก branch ร่าง
body เกิน 18,000,000 ไบต์ถูกอ่านทิ้งจนจบโดยไม่สะสมเพิ่ม แล้วตอบ 413 พร้อมข้อความขนาด ไม่ทำลาย keep-alive
`node admin/broker-browser-test.mjs` ใช้ Chromium + provider จำลอง ตรวจสองแท็บ/validation/ปกหลัง save/JSON export
QA เคยยืนยัน hidden-tab throttling 420 วินาทีบน cd29402 แล้ว; รอบนี้ไม่ได้วัด 420 วินาทีซ้ำ
ตรวจ GitHub Docs URL ข้างต้นอีกครั้ง: หัวข้อ device flow ระบุ HTTP 200 พร้อม error ระหว่างรอ user code ชัดเจน
จึงปิดข้อสงสัยสมมติฐาน status ด้วยเอกสารได้ แต่ยังไม่ใช่ live OAuth sign-off

ผลตรวจรอบนี้: node --test admin/*.test.mjs ผ่าน 29/29, admin/check.mjs ผ่าน,
Chromium offline export และ broker-browser-test ผ่าน; git diff --check ผ่าน
