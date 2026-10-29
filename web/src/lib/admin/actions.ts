"use server";
/* Server Actions ของหลังบ้าน — ทุกอันตรวจ session ก่อน · เขียนฐานข้อมูล · บันทึก audit · ล้าง cache ของหน้าบ้าน */
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { CONTENT_TAG } from "@/lib/content";
import { createSession, destroySession, getSession, requireUser, verifyPassword, hashPassword, loginThrottleKey, throttled, noteFailure, clearFailures, type SessionUser } from "@/lib/auth";
import { seriesSchema, taxonomySchema, settingsSchema, userSchema, passwordSchema, publishBlockers, issues, type SeriesInput } from "./validate";
import { processCover, removeCoverFile, type CoverKind } from "./images";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; errors: string[] };
const fail = (errors: string[] | string): ActionResult<never> => ({ ok: false, errors: Array.isArray(errors) ? errors : [errors] });

async function audit(u: SessionUser | null, action: string, target: string, detail?: string) {
  await prisma.auditLog.create({ data: { userId: u?.id, userName: u?.name, action, target, detail } });
}
/* ล้าง cache ทั้งเว็บ — เว็บเล็ก สร้างใหม่ตามคำขอถัดไปได้ทันที */
function refreshSite() {
  revalidateTag(CONTENT_TAG, "max");
  revalidatePath("/", "layout");
}

/* ---------- เข้าสู่ระบบ / ออก ---------- */
export async function login(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) return fail("กรอกอีเมลและรหัสผ่าน");
  const key = await loginThrottleKey(email);
  if (throttled(key)) return fail("ลองผิดหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่");
  const u = await verifyPassword(email, password);
  if (!u) { noteFailure(key); await audit(null, "login.failed", email); return fail("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); }
  clearFailures(key);
  await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  const su = { id: u.id, email: u.email, name: u.name, role: u.role as "admin" | "editor" };
  await createSession(su);
  await audit(su, "login", email);
  redirect("/admin/");
}
export async function logout() {
  const u = await getSession();
  await destroySession();
  if (u) await audit(u, "logout", u.email);
  redirect("/admin/login/");
}

/* ---------- เรื่อง ---------- */
function parseSeriesForm(form: FormData): SeriesInput | { errors: string[] } {
  const list = (k: string) => [...new Set(form.getAll(k).map(String).map((s) => s.trim()).filter(Boolean))];
  let episodes: unknown = [];
  try { episodes = JSON.parse(String(form.get("episodes") || "[]")); } catch { return { errors: ["ข้อมูลตอนเสียหาย"] }; }
  const status = String(form.get("status") || "ongoing");
  const raw = {
    slug: String(form.get("slug") || "").trim().toLowerCase(),
    title: String(form.get("title") || ""),
    hook: String(form.get("hook") || ""),
    synopsis: String(form.get("synopsis") || ""),
    status,
    releaseDay: status === "ended" ? null : (String(form.get("releaseDay") || "daily") || null),
    orientation: String(form.get("orientation") || ""),
    genres: list("genres"),
    tropes: list("tropes"),
    cast: String(form.get("cast") || "").split(",").map((s) => s.trim()).filter(Boolean),
    themeC1: String(form.get("themeC1") || "").toLowerCase() || null,
    themeC2: String(form.get("themeC2") || "").toLowerCase() || null,
    views: null,
    published: form.get("published") === "on",
    episodes: Array.isArray(episodes) ? episodes.map((e, i) => ({
      n: i + 1,
      title: String((e as Record<string, unknown>)?.title ?? ""),
      durationSec: Number((e as Record<string, unknown>)?.durationSec),
      videoUrl: String((e as Record<string, unknown>)?.videoUrl || "").trim() || null,
    })) : [],
  };
  const r = seriesSchema.safeParse(raw);
  if (!r.success) return { errors: issues(r.error) };
  return r.data;
}

export async function saveSeries(id: number | null, _prev: ActionResult<{ id: number }> | null, form: FormData): Promise<ActionResult<{ id: number }>> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const parsed = parseSeriesForm(form);
  if ("errors" in parsed) return fail(parsed.errors);
  const s = parsed;
  const [genres, tropes] = await Promise.all([prisma.genre.findMany(), prisma.trope.findMany()]);
  const registry = { genres: new Set(genres.map((g) => g.slug)), tropes: new Set(tropes.map((t) => t.slug)) };
  const existing = id ? await prisma.series.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("ไม่พบเรื่องนี้");
  const dup = await prisma.series.findUnique({ where: { slug: s.slug } });
  if (dup && dup.id !== id) return fail(`รหัสเรื่อง "${s.slug}" ถูกใช้แล้ว`);
  if (existing && existing.slug !== s.slug && existing.published) return fail("เปลี่ยนรหัสเรื่องของเรื่องที่เผยแพร่แล้วไม่ได้ (URL จะเปลี่ยนและลิงก์เดิมจะเสีย) — ยกเลิกการเผยแพร่ก่อนถ้าจำเป็นจริง");
  const files = { cover: existing?.cover ?? null, coverWide: existing?.coverWide ?? null };
  if (s.published) {
    const blockers = publishBlockers(s, files, registry);
    if (blockers.length) return fail(["ยังเผยแพร่ไม่ได้:", ...blockers]);
  }
  const data = {
    slug: s.slug, title: s.title, hook: s.hook, synopsis: s.synopsis, status: s.status, releaseDay: s.releaseDay,
    orientation: s.orientation, genres: JSON.stringify(s.genres), tropes: JSON.stringify(s.tropes), cast: JSON.stringify(s.cast),
    themeC1: s.themeC1, themeC2: s.themeC2, published: s.published,
  };
  let saved;
  if (existing) {
    saved = await prisma.$transaction(async (tx) => {
      await tx.episode.deleteMany({ where: { seriesId: existing.id } });
      return tx.series.update({ where: { id: existing.id }, data: { ...data, episodes: { create: s.episodes.map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec, videoUrl: e.videoUrl || null })) } } });
    });
  } else {
    const max = await prisma.series.aggregate({ _max: { sort: true } });
    saved = await prisma.series.create({ data: { ...data, sort: (max._max.sort ?? 0) + 1, episodes: { create: s.episodes.map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec, videoUrl: e.videoUrl || null })) } } });
  }
  await audit(u, existing ? "series.update" : "series.create", s.slug, `${s.title} · ${s.episodes.length} ตอน · ${s.published ? "เผยแพร่" : "ร่าง"}`);
  refreshSite();
  return { ok: true, data: { id: saved.id }, message: s.published ? "บันทึกและเผยแพร่แล้ว — หน้าเว็บอัปเดตทันที" : "บันทึกเป็นร่างแล้ว (ยังไม่แสดงบนเว็บ)" };
}

export async function deleteSeries(id: number): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const s = await prisma.series.findUnique({ where: { id } });
  if (!s) return fail("ไม่พบเรื่องนี้");
  await prisma.series.delete({ where: { id } });
  removeCoverFile(s.cover); removeCoverFile(s.coverWide);
  await audit(u, "series.delete", s.slug, s.title);
  refreshSite();
  redirect("/admin/series/");
}

export async function setPublished(id: number, published: boolean): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const s = await prisma.series.findUnique({ where: { id }, include: { episodes: true } });
  if (!s) return fail("ไม่พบเรื่องนี้");
  if (published) {
    const [genres, tropes] = await Promise.all([prisma.genre.findMany(), prisma.trope.findMany()]);
    const input = seriesSchema.safeParse({
      slug: s.slug, title: s.title, hook: s.hook, synopsis: s.synopsis, status: s.status, releaseDay: s.releaseDay, orientation: s.orientation,
      genres: JSON.parse(s.genres), tropes: JSON.parse(s.tropes), cast: JSON.parse(s.cast), themeC1: s.themeC1, themeC2: s.themeC2, views: null, published: true,
      episodes: s.episodes.sort((a, b) => a.n - b.n).map((e) => ({ n: e.n, title: e.title, durationSec: e.durationSec, videoUrl: e.videoUrl })),
    });
    if (!input.success) return fail(["ยังเผยแพร่ไม่ได้:", ...issues(input.error)]);
    const blockers = publishBlockers(input.data, { cover: s.cover, coverWide: s.coverWide }, { genres: new Set(genres.map((g) => g.slug)), tropes: new Set(tropes.map((t) => t.slug)) });
    if (blockers.length) return fail(["ยังเผยแพร่ไม่ได้:", ...blockers]);
  }
  await prisma.series.update({ where: { id }, data: { published } });
  await audit(u, published ? "series.publish" : "series.unpublish", s.slug, s.title);
  refreshSite();
  return { ok: true, message: published ? "เผยแพร่แล้ว" : "ยกเลิกการเผยแพร่แล้ว (ซ่อนจากเว็บ)" };
}

export async function reorderSeries(ids: number[]): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  await prisma.$transaction(ids.map((id, i) => prisma.series.update({ where: { id }, data: { sort: i } })));
  await audit(u, "series.reorder", "*", ids.join(","));
  refreshSite();
  return { ok: true };
}

/* ---------- ปก ---------- */
export async function uploadCover(id: number, kind: CoverKind, _prev: ActionResult<{ url: string }> | null, form: FormData): Promise<ActionResult<{ url: string }>> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const s = await prisma.series.findUnique({ where: { id } });
  if (!s) return fail("ไม่พบเรื่องนี้");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("ยังไม่ได้เลือกไฟล์");
  let r;
  try { r = await processCover(Buffer.from(await file.arrayBuffer()), s.slug, kind); } catch (e) { return fail((e as Error).message); }
  const old = kind === "poster" ? s.cover : s.coverWide;
  await prisma.series.update({ where: { id }, data: kind === "poster" ? { cover: r.path, coverW: r.w, coverH: r.h } : { coverWide: r.path, coverWideW: r.w, coverWideH: r.h } });
  if (old && old !== r.path) removeCoverFile(old);
  await audit(u, `cover.${kind}`, s.slug, `${r.path} · ${Math.round(r.bytes / 1024)} KB`);
  refreshSite();
  return { ok: true, data: { url: "/media/" + r.path }, message: `อัปโหลด${kind === "poster" ? "ปก" : "ภาพกว้าง"}แล้ว (${Math.round(r.bytes / 1024)} KB)` };
}
export async function removeCover(id: number, kind: CoverKind): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const s = await prisma.series.findUnique({ where: { id } });
  if (!s) return fail("ไม่พบเรื่องนี้");
  if (kind === "poster" && s.published) return fail("เรื่องที่เผยแพร่อยู่ต้องมีปก — ยกเลิกการเผยแพร่ก่อน");
  if (kind === "wide" && s.published && s.orientation === "horizontal") return fail("เรื่องแนวนอนที่เผยแพร่อยู่ต้องมีภาพกว้าง");
  const old = kind === "poster" ? s.cover : s.coverWide;
  await prisma.series.update({ where: { id }, data: kind === "poster" ? { cover: null, coverW: null, coverH: null } : { coverWide: null, coverWideW: null, coverWideH: null } });
  removeCoverFile(old);
  await audit(u, `cover.${kind}.remove`, s.slug);
  refreshSite();
  return { ok: true, message: "เอาภาพออกแล้ว" };
}

/* ---------- แนว / แท็ก ---------- */
export async function saveTaxonomy(kind: "genre" | "trope", id: number | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const r = taxonomySchema.safeParse({ slug: String(form.get("slug") || "").toLowerCase(), label: form.get("label"), intro: form.get("intro") ?? undefined, seoTitle: form.get("seoTitle") ?? undefined, seoDesc: form.get("seoDesc") ?? undefined });
  if (!r.success) return fail(issues(r.error));
  const d = r.data;
  if (kind === "genre") {
    const dup = await prisma.genre.findUnique({ where: { slug: d.slug } });
    if (dup && dup.id !== id) return fail(`slug "${d.slug}" ถูกใช้แล้ว`);
    const data = { slug: d.slug, label: d.label, intro: d.intro || null, seoTitle: d.seoTitle || null, seoDesc: d.seoDesc || null };
    if (id) await prisma.genre.update({ where: { id }, data }); else await prisma.genre.create({ data: { ...data, sort: await prisma.genre.count() } });
  } else {
    const dup = await prisma.trope.findUnique({ where: { slug: d.slug } });
    if (dup && dup.id !== id) return fail(`slug "${d.slug}" ถูกใช้แล้ว`);
    if (id) await prisma.trope.update({ where: { id }, data: { slug: d.slug, label: d.label } }); else await prisma.trope.create({ data: { slug: d.slug, label: d.label, sort: await prisma.trope.count() } });
  }
  await audit(u, `${kind}.${id ? "update" : "create"}`, d.slug, d.label);
  refreshSite();
  return { ok: true, message: "บันทึกแล้ว" };
}
export async function deleteTaxonomy(kind: "genre" | "trope", id: number): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const row = kind === "genre" ? await prisma.genre.findUnique({ where: { id } }) : await prisma.trope.findUnique({ where: { id } });
  if (!row) return fail("ไม่พบรายการ");
  const field = kind === "genre" ? "genres" : "tropes";
  const used = (await prisma.series.findMany({ select: { slug: true, [field]: true } })).filter((s) => (JSON.parse(String(s[field as keyof typeof s])) as string[]).includes(row.slug));
  if (used.length) return fail(`ลบไม่ได้ — ยังถูกใช้ใน ${used.length} เรื่อง: ${used.map((s) => s.slug).join(", ")}`);
  if (kind === "genre") await prisma.genre.delete({ where: { id } }); else await prisma.trope.delete({ where: { id } });
  await audit(u, `${kind}.delete`, row.slug, row.label);
  refreshSite();
  return { ok: true, message: "ลบแล้ว" };
}

/* ---------- ตั้งค่าเว็บ ---------- */
export async function saveSettings(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser("admin"); } catch (e) { return fail((e as Error).message); }
  const r = settingsSchema.safeParse({ siteName: form.get("siteName"), siteOrigin: String(form.get("siteOrigin") || "").replace(/\/+$/, ""), indexing: form.get("indexing") === "on", freeLine: form.get("freeLine") });
  if (!r.success) return fail(issues(r.error));
  await prisma.setting.upsert({ where: { id: 1 }, update: r.data, create: { id: 1, ...r.data } });
  await audit(u, "settings.update", "site", `${r.data.siteOrigin} · indexing=${r.data.indexing}`);
  refreshSite();
  return { ok: true, message: "บันทึกการตั้งค่าแล้ว — หน้าเว็บ robots/sitemap/canonical อัปเดตทันที" };
}

/* ---------- ผู้ใช้ ---------- */
export async function saveUser(id: number | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser("admin"); } catch (e) { return fail((e as Error).message); }
  const r = userSchema.safeParse({ email: String(form.get("email") || "").toLowerCase(), name: form.get("name"), role: form.get("role"), password: form.get("password") || "" });
  if (!r.success) return fail(issues(r.error));
  const d = r.data;
  const dup = await prisma.user.findUnique({ where: { email: d.email } });
  if (dup && dup.id !== id) return fail("อีเมลนี้มีบัญชีอยู่แล้ว");
  if (id) {
    if (id === u.id && d.role !== "admin") return fail("ลดสิทธิ์ของตัวเองไม่ได้");
    await prisma.user.update({ where: { id }, data: { email: d.email, name: d.name, role: d.role, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) } });
  } else {
    if (!d.password) return fail("ต้องตั้งรหัสผ่านให้ผู้ใช้ใหม่");
    await prisma.user.create({ data: { email: d.email, name: d.name, role: d.role, passwordHash: await hashPassword(d.password) } });
  }
  await audit(u, id ? "user.update" : "user.create", d.email, d.role);
  return { ok: true, message: "บันทึกผู้ใช้แล้ว" };
}
export async function setUserActive(id: number, active: boolean): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser("admin"); } catch (e) { return fail((e as Error).message); }
  if (id === u.id) return fail("ปิดบัญชีตัวเองไม่ได้");
  const t = await prisma.user.update({ where: { id }, data: { active } });
  await audit(u, active ? "user.enable" : "user.disable", t.email);
  return { ok: true, message: active ? "เปิดใช้บัญชีแล้ว" : "ปิดบัญชีแล้ว — เข้าสู่ระบบไม่ได้ทันที" };
}
export async function changePassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let u: SessionUser;
  try { u = await requireUser(); } catch (e) { return fail((e as Error).message); }
  const current = String(form.get("current") || ""), next = String(form.get("next") || ""), again = String(form.get("again") || "");
  if (!(await verifyPassword(u.email, current))) return fail("รหัสผ่านปัจจุบันไม่ถูกต้อง");
  const r = passwordSchema.safeParse(next);
  if (!r.success) return fail(issues(r.error));
  if (next !== again) return fail("รหัสผ่านใหม่สองช่องไม่ตรงกัน");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(u, "user.password", u.email);
  return { ok: true, message: "เปลี่ยนรหัสผ่านแล้ว" };
}
