import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { NotFoundBody, NOT_FOUND_SEO } from "./NotFoundBody";

/* F1 /404/ — หน้าคงที่ (เช่น ให้ nginx/CDN ชี้มา) · noindex */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(NOT_FOUND_SEO);
}

export default async function NotFound404Page() {
  const c = await getCatalog();
  return <NotFoundBody c={c} />;
}
