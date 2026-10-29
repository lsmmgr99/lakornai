/* ยืนยันตัวตนของหลังบ้าน — JWT (HS256) ใน cookie httpOnly · ไม่มี session ในฐานข้อมูล
   ผู้ชมไม่มีบัญชี (ADR-001 §5) — ระบบนี้ใช้กับทีมงานเท่านั้น */
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const COOKIE = "ailakorn_admin";
const TTL_SEC = 12 * 3600;
export type Role = "admin" | "editor";
export interface SessionUser { id: number; email: string; name: string; role: Role }

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET ยังไม่ตั้ง (อย่างน้อย 16 ตัวอักษร) — ดู web/.env.example");
  return new TextEncoder().encode(s);
}

export async function createSession(u: SessionUser) {
  const token = await new SignJWT({ email: u.email, name: u.name, role: u.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(u.id)).setIssuedAt().setExpirationTime(`${TTL_SEC}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_SEC });
}
export async function destroySession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    if (!id) return null;
    /* ตรวจกับฐานข้อมูลทุกครั้ง — ปิดบัญชีแล้วต้องหลุดทันที ไม่รอ token หมดอายุ */
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || !u.active) return null;
    return { id: u.id, email: u.email, name: u.name, role: u.role as Role };
  } catch { return null; }
}
export async function requireUser(role?: Role): Promise<SessionUser> {
  const u = await getSession();
  if (!u) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  if (role === "admin" && u.role !== "admin") throw new Error("ต้องเป็นผู้ดูแลระบบ");
  return u;
}

/* กันเดารหัสผ่าน: ต่อ IP + อีเมล 10 ครั้ง/15 นาที (ในหน่วยความจำของโปรเซส) */
const attempts = new Map<string, { n: number; until: number }>();
export async function loginThrottleKey(email: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return `${ip}|${email.toLowerCase()}`;
}
export function throttled(key: string) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() > a.until) { attempts.delete(key); return false; }
  return a.n >= 10;
}
export function noteFailure(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() > a.until) attempts.set(key, { n: 1, until: Date.now() + 15 * 60000 });
  else a.n++;
}
export const clearFailures = (key: string) => attempts.delete(key);

export async function verifyPassword(email: string, password: string) {
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!u || !u.active) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  return ok ? u : null;
}
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
