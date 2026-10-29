/* สร้างไฟล์ย่อยของปกทุกขนาดที่ยังขาดใน UPLOAD_DIR (รันครั้งเดียวหลังอัปเกรด หรือเมื่อคัดลอกไฟล์ปกเข้ามาเอง)
   รัน:  npm run images:variants          (เพิ่ม -- --force เพื่อสร้างใหม่ทั้งหมด) */
import path from "node:path";
import { generateAllVariants } from "../src/lib/cover-variants";

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");
const force = process.argv.includes("--force");
generateAllVariants(UPLOAD_DIR, { force, log: console.log }).then((r) => {
  console.log(`ต้นฉบับ ${r.masters} ไฟล์ · สร้างใหม่ ${r.made} ไฟล์ (${UPLOAD_DIR})`);
});
