import Link from "next/link";
import type { Catalog } from "@/lib/content";
import { U } from "@/lib/urls";
import { Shell, Section } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Cards";
import { Rail } from "@/components/client/Rail";

/* F1 มาร์กอัปหน้า 404 — ใช้ร่วมกันระหว่าง /404/ (หน้าคงที่สำหรับเซิร์ฟเวอร์ชี้มา) และ not-found.tsx ของ Next */
export const NOT_FOUND_SEO = {
  url: U.notFound,
  title: "ไม่พบหน้าที่คุณหา (404) · AiLakorn",
  desc: "ไม่พบหน้าที่คุณเปิด ลิงก์อาจหมดอายุหรือถูกย้าย เริ่มใหม่จากหน้าแรก ค้นหาชื่อเรื่อง หรือเลือกจากเรื่องยอดนิยมของ AiLakorn",
  noindex: true,
};

export function NotFoundBody({ c }: { c: Catalog }) {
  return (
    <Shell c={c}>
      <div className="sys">
        <div className="big404" lang="en" aria-hidden="true">404</div>
        <h1>ไม่พบหน้าที่คุณหา</h1>
        <p>ลิงก์อาจหมดอายุ หรือเรื่องนี้ถูกย้ายไปแล้ว ลองเริ่มจากหน้าแรกหรือค้นหาชื่อเรื่องดู</p>
        <div className="btn-row center">
          <Link className="btn btn-accent" href={U.home}>กลับหน้าแรก</Link>
          <Link className="btn btn-ghost" href={U.search}><Icon name="search" cls="sm" /> ค้นหา</Link>
        </div>
      </div>
      <Section title="เรื่องยอดนิยมตอนนี้">
        <Rail>{c.top10.slice(0, 6).map((s) => <Card key={s.slug} s={s} c={c} />)}</Rail>
      </Section>
    </Shell>
  );
}
