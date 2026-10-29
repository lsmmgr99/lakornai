/* ลำดับขั้นของ CI เขียนไว้ที่เดียว — เจ้าของ: DevOps (AIO-30)
   .github/workflows/content-ci.yml และ ci/rehearse.mjs ต้องใช้ลำดับเดียวกันนี้
   ci/pipeline.test.mjs บังคับว่าทั้งสองที่ตรงกัน ถ้าใครแก้ที่เดียวแล้วลืมอีกที่ เทสต์ล้ม
   เหตุผล: ถ้า "วิธีตรวจซ้ำในเครื่อง" กับ "สิ่งที่ CI ทำจริง" ไม่ตรงกัน README ก็โกหกทันที */

/* job แรก: ตรวจ → build → ตรวจ → artifact · รันทุก branch และทุก PR · ไม่มีสิทธิ์เขียน */
export const STEPS = [
  {
    name: 'ทดสอบตัวด่านเอง',
    argv: ['--test', 'ci/views-gate.test.mjs', 'ci/pipeline.test.mjs', 'ci/deploy-branch.test.mjs'],
    why: 'ด่านที่พังเองจะปล่อยของผิดผ่านเงียบ ๆ จึงตรวจด่านก่อนตรวจงาน — รวมขั้นส่งขึ้นด้วย เพราะมันคือด่านสุดท้าย',
  },
  {
    name: 'ตรวจข้อมูล V1–V10 ก่อน build',
    argv: ['admin/check.mjs', '.'],
    why: 'ADR-001 §9.1/§9.2 — รอบใน CI เป็นตัวตัดสิน ข้ามไม่ได้ · ผิด = ไม่ build ต่อ',
  },
  {
    name: 'build HTML static',
    argv: ['build/build.mjs'],
    why: 'ADR-001 §9.2 — CI เป็นคนรัน rebuild ไม่ใช่คน · SITE_ORIGIN/SITE_PUBLISHED มาจาก repository variables',
  },
  {
    name: 'ตรวจ V11 หลัง build (ปิด JS แล้วต้องอ่านเนื้อหาได้)',
    argv: ['admin/check.mjs', '.', '--html'],
    why: 'ADR-001 §6.4 V11 + §6.8 — ตรวจ title/synopsis ในไฟล์ที่ build เขียนลงดิสก์จริง',
  },
  {
    name: 'ตรวจ V12–V13 หลัง build',
    argv: ['ci/views-gate.mjs', '.'],
    why: 'ADR-001 §6.4 V12–V13 + §12.3 — เทียบกับ meta.viewsSource ของไฟล์ที่ใช้ build รอบนั้น',
  },
  {
    name: 'จัด build artifact',
    argv: ['ci/stage-artifact.mjs', '.', '_artifact'],
    why: 'ADR-001 §9.1 จบที่ artifact · ขั้นนี้อยู่หลังด่านทุกด่าน ข้อมูลผิดจึงไม่มี artifact ออกไป',
  },
];

/* job ที่สอง (publish-site): วิ่งเฉพาะ push ขึ้น main หลัง job แรกผ่าน · มีสิทธิ์ contents: write เฉพาะ job นี้
   ADR-001 §14 — ลูกค้าสั่ง 29 ต.ค. 2026 ให้ปิดวงจร "แก้ในแผง → เว็บอัปเดตเอง" · ci/rehearse.mjs ซ้อมขั้นนี้แบบ --dry-run */
export const PUBLISH_STEPS = [
  {
    name: 'ส่งชุดไฟล์ขึ้น branch ของ GitHub Pages',
    argv: ['ci/deploy-branch.mjs', '_artifact'],
    why: 'ชุดที่ผ่านด่านครบแล้วเท่านั้นถึงจะถูกส่งขึ้น · สคริปต์ตรวจชุดไฟล์ซ้ำด้วย publish-gate ก่อน push ทุกครั้ง',
  },
];

/* คำสั่งที่เขียนใน YAML และใน README ต้องสะกดแบบนี้ตรงตัว */
export const command = (step) => `node ${step.argv.join(' ')}`;
