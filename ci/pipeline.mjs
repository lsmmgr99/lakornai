/* ลำดับขั้นของ CI เขียนไว้ที่เดียว — เจ้าของ: DevOps (AIO-30)
   .github/workflows/content-ci.yml และ ci/rehearse.mjs ต้องใช้ลำดับเดียวกันนี้
   ci/pipeline.test.mjs บังคับว่าทั้งสองที่ตรงกัน ถ้าใครแก้ที่เดียวแล้วลืมอีกที่ เทสต์ล้ม
   เหตุผล: ถ้า "วิธีตรวจซ้ำในเครื่อง" กับ "สิ่งที่ CI ทำจริง" ไม่ตรงกัน README ก็โกหกทันที */

export const STEPS = [
  {
    name: 'ทดสอบตัวด่านเอง',
    argv: ['--test', 'ci/views-gate.test.mjs', 'ci/pipeline.test.mjs'],
    why: 'ด่านที่พังเองจะปล่อยของผิดผ่านเงียบ ๆ จึงตรวจด่านก่อนตรวจงาน',
  },
  {
    name: 'ตรวจข้อมูล V1–V10 ก่อน build',
    argv: ['admin/check.mjs', '.'],
    why: 'ADR-001 §9.1/§9.2 — รอบใน CI เป็นตัวตัดสิน ข้ามไม่ได้ · ผิด = ไม่ build ต่อ',
  },
  {
    name: 'build HTML static',
    argv: ['build/build.mjs'],
    why: 'ADR-001 §9.2 — CI เป็นคนรัน rebuild ไม่ใช่คน',
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

/* คำสั่งที่เขียนใน YAML และใน README ต้องสะกดแบบนี้ตรงตัว */
export const command = (step) => `node ${step.argv.join(' ')}`;
