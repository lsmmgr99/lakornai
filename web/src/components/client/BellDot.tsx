"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Follows, subscribe } from "@/lib/progress";
import { U } from "@/lib/urls";
import { Icon } from "../Icon";
import { useCatalogLite } from "./CatalogContext";

/* จุดแจ้งเตือนบนกระดิ่ง — มีเรื่องที่ติดตามและยังออกตอนอยู่ (อ่านจากเครื่องผู้ชม) */
export function BellDot() {
  const lite = useCatalogLite();
  const [dot, setDot] = useState(false);
  useEffect(() => {
    const calc = () => setDot(Follows.list().some((k) => lite.by[k] && !lite.by[k].ended));
    calc();
    return subscribe(calc);
  }, [lite]);
  return <Link className={`icon-btn${dot ? " dot" : ""}`} style={{ marginLeft: 4, position: "relative" }} href={U.notifications} aria-label="แจ้งเตือน" id="bellBtn"><Icon name="bell" /></Link>;
}
