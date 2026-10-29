import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "หลังบ้าน AiLakorn", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
