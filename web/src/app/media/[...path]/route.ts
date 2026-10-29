/* เสิร์ฟไฟล์ที่อัปโหลดจากหลังบ้าน (UPLOAD_DIR) — ปก 2:3 และภาพกว้าง
   allowlist ชื่อไฟล์เข้มงวด: covers/<slug>[-hash].<ext> · covers-wide/<slug>[-hash].<ext> เท่านั้น (ไม่มี path traversal) */
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");
const SAFE = /^(covers|covers-wide)\/[a-z0-9][a-z0-9-]*(?:-[0-9a-f]{6,12})?\.(webp|png|jpg|jpeg|avif)$/;
const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", avif: "image/avif" };

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  if (!SAFE.test(rel)) return new NextResponse("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, rel);
  if (!fs.existsSync(file)) return new NextResponse("Not found", { status: 404 });
  const stat = fs.statSync(file);
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304 });
  const ext = rel.split(".").pop()!;
  return new NextResponse(fs.readFileSync(file), {
    headers: {
      "Content-Type": TYPES[ext],
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": stat.mtime.toUTCString(),
      ETag: etag,
    },
  });
}
