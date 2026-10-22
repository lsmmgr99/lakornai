# LakornAI v2 — ม็อกอัพเสนอแบบ (AIO-17)

เอกสารนี้อธิบายว่าไฟล์ในโฟลเดอร์นี้คืออะไรและสร้างใหม่ได้อย่างไร

> ⚠️ **ทุกไฟล์ในโฟลเดอร์นี้เป็นข้อเสนอแบบ ยังไม่ใช่การเปลี่ยนเว็บจริง**
> ไม่มีไฟล์ production (`index.html`, `assets/**`, `series/**`, `watch/**`, หน้า HTML เดิมทั้งหมด)
> ถูกแก้ ลบ หรือแตะต้องแม้แต่ไฟล์เดียว ม็อกอัพอ่านข้อมูลจาก `../../assets/data.js`
> และปกจาก `../../assets/covers/*.webp` แบบอ่านอย่างเดียว

## โครงไฟล์

| ไฟล์ | คืออะไร |
|---|---|
| `tokens.css` | **design token ทั้งหมด** — คัดลอกไปวางใน `:root` ของ `assets/style.css` ได้ตรง ๆ หลังอนุมัติ |
| `v2.css` | สไตล์คอมโพเนนต์ของม็อกอัพ (ไม่ทับ `assets/style.css`) |
| `fonts/` | ซับเซ็ต Kanit 500/600 + IBM Plex Sans Thai 400/500/600 (ไทย+ละติน) เก็บไว้ในเครื่องเพื่อให้เรนเดอร์ได้แบบออฟไลน์ |
| `lib.mjs` | ตัวช่วยตอน build: โหลด `data.js`, ไอคอน SVG, คอมโพเนนต์ที่ใช้ซ้ำ |
| `pages-discovery.mjs` | หน้ากลุ่ม A (ค้นพบ) · B (เรื่อง/รับชม) · C (ไลบรารี) |
| `pages-account.mjs` | หน้ากลุ่ม D (บัญชีและเงิน) · E (onboarding) · F (สถานะระบบ) · G (คอนเทนต์/กฎหมาย) |
| `pages-system.mjs` | หน้า design system + หน้าดัชนี |
| `build.mjs` | สร้างไฟล์ HTML ทุกหน้า + `manifest.json` + `shots.json` |
| `shoot.mjs` | เรนเดอร์ PNG ทุกหน้าจอผ่าน Chrome DevTools Protocol |
| `index.html` | **เริ่มดูที่นี่** — ดัชนีหน้าจอทั้งหมดพร้อมลิงก์ |
| `styleguide.html` | ระบบดีไซน์: สี ตัวอักษร ระยะ เงา motion และคอมโพเนนต์ทุกสถานะ |
| `shots/` | ภาพ PNG ที่เรนเดอร์แล้ว ตั้งชื่อ `{viewport}-{screen}[-{state}].png` |

## สร้างใหม่

```bash
node design/v2/build.mjs    # สร้าง HTML ทุกหน้า
node design/v2/shoot.mjs    # เรนเดอร์ PNG ทุกใบลง design/v2/shots/
node design/v2/shoot.mjs home   # เรนเดอร์เฉพาะไฟล์ที่ชื่อมีคำว่า home
```

## ทำไมไม่ใช้ `chrome --screenshot` ตรง ๆ

headless chrome บังคับความกว้างหน้าต่างขั้นต่ำ **500px** — สั่ง `--window-size=390,844`
แล้วจะได้เลย์เอาต์ที่จัดวางด้วยความกว้าง 500px แล้วครอปเหลือ 390 ซึ่ง **ไม่ใช่ภาพมือถือจริง**
และคอนเทนต์ขอบขวาจะหาย `shoot.mjs` จึงต่อผ่าน CDP แล้วใช้
`Emulation.setDeviceMetricsOverride` เพื่อบังคับ viewport ให้ตรงเป๊ะ
(มือถือ 390×844 @2x · เดสก์ท็อป 1440×900 @1.5x · full-page @1x)

## ขนาดภาพที่เรนเดอร์

| prefix | viewport | device pixel ratio | ขนาดไฟล์จริง |
|---|---|---|---|
| `mobile-` | 390 × 844 | 2 | 780 × 1688 |
| `desktop-` | 1440 × 900 | 1.5 | 2160 × 1350 |
| `mobilefull-` | 390 × ความสูงทั้งหน้า | 1 | ตามเนื้อหา |
| `desktopfull-` | 1440 × ความสูงทั้งหน้า | 1 | ตามเนื้อหา |
