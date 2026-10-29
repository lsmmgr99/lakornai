/* loader ของ next/image (next.config: images.loader = "custom") — ชี้ไปไฟล์ย่อยที่สร้างไว้ล่วงหน้าแทน /_next/image
   (ดูเหตุผลใน covers.ts) · รูปอื่นที่ไม่ใช่ปก (เช่น placeholder svg) ส่ง URL เดิม */
import { variantUrl } from "./covers";

export default function coverLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return variantUrl(src, width);
}
