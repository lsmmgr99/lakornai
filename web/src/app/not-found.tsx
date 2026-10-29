import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { NotFoundBody, NOT_FOUND_SEO } from "./404/NotFoundBody";

/* ตัวจัดการ 404 ของ Next (สถานะ 404 จริง) — มาร์กอัปเดียวกับ /404/ */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(NOT_FOUND_SEO);
}

export default async function NotFound() {
  const c = await getCatalog();
  return <NotFoundBody c={c} />;
}
