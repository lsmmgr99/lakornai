/* กฎข้อมูลของเรื่อง (สัญญา ADR-001 §6/§13 ย้ายมาเป็น zod) — ชั้นเดียว ใช้ทั้งฟอร์มและ server action
   ข้อความผิดพลาดเป็นภาษาคน ชี้ช่องที่ต้องแก้ · การ "เผยแพร่" ต้องผ่านครบทุกข้อ ส่วน "บันทึกร่าง" ผ่อนได้บางข้อ */
import { z } from "zod";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DAYS = ["daily", "mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const len = (s: string) => [...s].length;

export const episodeSchema = z.object({
  n: z.number().int().min(1),
  title: z.string().trim().min(1, "ต้องมีชื่อตอน").refine((v) => len(v) <= 80, "ชื่อตอนยาวเกิน 80 ตัวอักษร"),
  durationSec: z.number().int().min(30, "ความยาวตอนต้องอย่างน้อย 0:30").max(600, "ความยาวตอนต้องไม่เกิน 10:00"),
  videoUrl: z.string().trim().max(500).refine((v) => !v || /^https?:\/\/\S+$/.test(v) || v.startsWith("/"), "URL วิดีโอไม่ถูกต้อง").nullable().optional(),
});

export const seriesSchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, "รหัสเรื่องใช้ได้เฉพาะ a–z 0–9 และขีดกลาง เช่น moonlight-heir").max(60),
  title: z.string().trim().min(1, "ต้องมีชื่อเรื่อง").refine((v) => len(v) <= 80, "ชื่อเรื่องยาวเกิน 80 ตัวอักษร"),
  hook: z.string().trim().min(1, "ต้องมีประโยคโปรย").refine((v) => len(v) <= 90, "ประโยคโปรยยาวเกิน 90 ตัวอักษร").refine((v) => !v.endsWith("."), "ประโยคโปรยห้ามลงท้ายด้วยจุด"),
  synopsis: z.string().trim().refine((v) => len(v) >= 80, "เรื่องย่อต้องยาวอย่างน้อย 80 ตัวอักษร").refine((v) => len(v) <= 600, "เรื่องย่อยาวเกิน 600 ตัวอักษร"),
  status: z.enum(["ongoing", "ended"]),
  releaseDay: z.enum(DAYS).nullable(),
  orientation: z.enum(["vertical", "horizontal"], { message: "ต้องเลือกทิศของวิดีโอ (แนวตั้ง/แนวนอน)" }),
  genres: z.array(z.string().regex(SLUG_RE)).min(1, "ต้องเลือกแนวอย่างน้อย 1 แนว"),
  tropes: z.array(z.string().regex(SLUG_RE)),
  cast: z.array(z.string().trim().min(1).max(100)).max(30),
  themeC1: z.string().regex(/^#[0-9a-f]{6}$/i, "สีต้องเป็นรหัส #rrggbb").nullable(),
  themeC2: z.string().regex(/^#[0-9a-f]{6}$/i, "สีต้องเป็นรหัส #rrggbb").nullable(),
  views: z.number().int().min(0).nullable(),
  published: z.boolean(),
  episodes: z.array(episodeSchema).min(1, "ต้องมีอย่างน้อย 1 ตอน"),
}).superRefine((s, ctx) => {
  if (s.status === "ended" && s.releaseDay !== null) ctx.addIssue({ code: "custom", path: ["releaseDay"], message: "เรื่องที่จบแล้วต้องไม่มีวันออกตอน" });
  if (s.status === "ongoing" && !s.releaseDay) ctx.addIssue({ code: "custom", path: ["releaseDay"], message: "เรื่องที่ยังออกตอนต้องระบุวันออกตอน" });
  if (s.hook && (s.synopsis.includes(s.hook) || s.synopsis.startsWith([...s.hook].slice(0, 30).join("")))) ctx.addIssue({ code: "custom", path: ["synopsis"], message: "เรื่องย่อต้องไม่ซ้ำหรือเริ่มด้วยประโยคโปรย (เขียนให้ต่างกัน)" });
  s.episodes.forEach((e, i) => { if (e.n !== i + 1) ctx.addIssue({ code: "custom", path: ["episodes", i, "n"], message: `เลขตอนต้องเรียง 1..${s.episodes.length}` }); });
});
export type SeriesInput = z.infer<typeof seriesSchema>;

/* ข้อที่ต้องครบ "ก่อนเผยแพร่" (ต้องรู้ว่ามีไฟล์ปกไหม จึงตรวจแยกจาก schema) */
export function publishBlockers(s: SeriesInput, files: { cover: string | null; coverWide: string | null }, registry: { genres: Set<string>; tropes: Set<string> }) {
  const out: string[] = [];
  if (!files.cover) out.push("ยังไม่มีปก 2:3 — อัปโหลดปกก่อนเผยแพร่");
  if (s.orientation === "horizontal" && !files.coverWide) out.push("เรื่องแนวนอนต้องมีภาพกว้าง 2640×1200");
  for (const g of s.genres) if (!registry.genres.has(g)) out.push(`ไม่มีแนว "${g}" ในทะเบียน`);
  for (const t of s.tropes) if (!registry.tropes.has(t)) out.push(`ไม่มีแท็ก "${t}" ในทะเบียน`);
  return out;
}

export const taxonomySchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, "slug ใช้ได้เฉพาะ a–z 0–9 และขีดกลาง").max(40),
  label: z.string().trim().min(1, "ต้องมีชื่อ").max(100),
  intro: z.string().trim().max(1000).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDesc: z.string().trim().max(170).optional(),
});
export const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(60),
  siteOrigin: z.string().trim().url("ต้องเป็น URL เต็ม เช่น https://ailakorn.com").refine((v) => /^https?:\/\//.test(v) && !/[?#]/.test(v), "ต้องเป็น http(s) และไม่มี ?/#"),
  indexing: z.boolean(),
  freeLine: z.string().trim().min(1).max(120),
});
export const userSchema = z.object({
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(120),
  name: z.string().trim().min(1, "ต้องมีชื่อ").max(80),
  role: z.enum(["admin", "editor"]),
  password: z.string().min(10, "รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร").max(200).optional().or(z.literal("")),
});
export const passwordSchema = z.string().min(10, "รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร").max(200);

/* zod error → รายการข้อความ "ช่อง: ปัญหา" */
export function issues(err: z.ZodError): string[] {
  const FIELD: Record<string, string> = { slug: "รหัสเรื่อง", title: "ชื่อเรื่อง", hook: "ประโยคโปรย", synopsis: "เรื่องย่อ", status: "สถานะ", releaseDay: "วันออกตอน", orientation: "ทิศของวิดีโอ", genres: "แนว", tropes: "แท็ก", cast: "นักแสดง", themeC1: "สีธีม", themeC2: "สีธีม", episodes: "ตอน", email: "อีเมล", name: "ชื่อ", role: "สิทธิ์", password: "รหัสผ่าน", siteOrigin: "URL ของเว็บ", siteName: "ชื่อเว็บ", label: "ชื่อ" };
  return err.issues.map((i) => {
    const p = i.path;
    let where = FIELD[String(p[0])] || String(p[0] ?? "");
    if (p[0] === "episodes" && typeof p[1] === "number") where = `ตอน ${p[1] + 1}` + (p[2] ? ` › ${{ title: "ชื่อตอน", durationSec: "ความยาว", videoUrl: "วิดีโอ", n: "ลำดับ" }[String(p[2])] || String(p[2])}` : "");
    return `${where}: ${i.message}`;
  });
}
