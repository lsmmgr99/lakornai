"use client";
import { Icon } from "../Icon";

/* ปุ่ม "ลองใหม่" ของหน้าออฟไลน์ — โหลดหน้าซ้ำ */
export function RetryButton() {
  return <button type="button" className="btn btn-accent" id="retryBtn" onClick={() => location.reload()}><Icon name="refresh" cls="sm" /> ลองใหม่</button>;
}
