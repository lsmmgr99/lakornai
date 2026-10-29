"use client";
/* toast กลาง: คอมโพเนนต์ไหนก็เรียก toast("…") ได้ · <Toast/> ใน layout เป็นคนแสดง */
export function toast(msg: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lakorn:toast", { detail: msg }));
}
