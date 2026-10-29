"use client";
/* รายการแจ้งเตือน = เรื่องที่ติดตามไว้ในเครื่องนี้ (เหมือน app.src.js §16 ของรุ่น static)
   HTML ที่ส่งออกคือสถานะว่าง "ยังไม่มีการแจ้งเตือน" · หลัง mount: ไม่มีเรื่องติดตาม ⇒ สถานะว่าง 'following' */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Follows, subscribe } from "@/lib/progress";
import { U } from "@/lib/urls";
import { Empty } from "../Layout";
import { useCatalogLite, coverSlotLite } from "./CatalogContext";

export function Notifications() {
  const lite = useCatalogLite();
  const [f, setF] = useState<string[] | null>(null);
  useEffect(() => { const calc = () => setF(Follows.list().filter((k) => lite.by[k])); calc(); return subscribe(calc); }, [lite]);

  let body: React.ReactNode;
  if (f === null) {
    body = <Empty icon="bell" h="ยังไม่มีการแจ้งเตือน" p="เมื่อเรื่องที่คุณติดตามปล่อยตอนใหม่ เราจะแจ้งที่นี่" btn={["ไปติดตามเรื่องที่ชอบ", U.popular]} />;
  } else if (!f.length) {
    body = <Empty icon="heart" h="ยังไม่ได้ติดตามเรื่องไหน" p="กดหัวใจที่เรื่องไหนก็ได้ แล้วเราจะเตือนเมื่อมีตอนใหม่" btn={["ดู TOP 10 ในคลัง", U.popular]} />;
  } else {
    body = (
      <div className="list">
        {f.map((k) => {
          const s = lite.by[k];
          const isNew = !s.ended;
          const slot = coverSlotLite(s, "poster");
          return (
            <Link className={`notif${isNew ? " unread" : ""}`} key={k} href={U.watch(s.slug, s.eps)}>
              <span className="th"><img src={slot.url} width={slot.w} height={slot.h} alt="" loading="lazy" decoding="async" /></span>
              <span className="bd">
                <b>{isNew ? `EP.${s.eps} ออกแล้ว` : `เรื่องนี้จบแล้ว ครบ ${s.eps} ตอน`}</b>
                <p>{s.title} · {s.episodes[s.eps - 1]?.title || ""}</p>
              </span>
              <span className="tm">{s.status}</span>
            </Link>
          );
        })}
      </div>
    );
  }
  return <div id="notifList">{body}</div>;
}
