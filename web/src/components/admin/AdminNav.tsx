"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string, "admin" | null][] = [
  ["/admin/", "แดชบอร์ด", null],
  ["/admin/series/", "เรื่องและตอน", null],
  ["/admin/taxonomy/", "แนวและแท็ก", null],
  ["/admin/settings/", "ตั้งค่าเว็บ / SEO", "admin"],
  ["/admin/users/", "ผู้ใช้", "admin"],
  ["/admin/audit/", "ประวัติการแก้", null],
  ["/admin/account/", "บัญชีของฉัน", null],
];
export function AdminNav({ role }: { role: "admin" | "editor" }) {
  const path = usePathname();
  const current = (href: string) => (href === "/admin/" ? path === "/admin" || path === "/admin/" : path.startsWith(href.replace(/\/$/, "")));
  return (
    <nav aria-label="เมนูหลังบ้าน">
      {ITEMS.filter(([, , need]) => !need || role === "admin").map(([href, label]) => (
        <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>{label}</Link>
      ))}
      <Link href="/" target="_blank" rel="noopener">เปิดหน้าเว็บ ↗</Link>
    </nav>
  );
}
