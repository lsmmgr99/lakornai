import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, faqLd } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, JsonLd } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { Faq } from "@/components/client/Faq";
import { FAQS } from "./faqs";

/* G3 ช่วยเหลือ */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.help,
    title: "ช่วยเหลือ AiLakorn — คำถามที่พบบ่อยเรื่องการดู",
    desc: "คำถามที่พบบ่อยของ AiLakorn ต้องสมัครสมาชิกไหม ดูต่อจากที่ค้างไว้ยังไง ตอนใหม่ออกเมื่อไหร่ และทำไมคลังของฉันถึงอยู่แค่ในเครื่องนี้",
  });
}

export default async function HelpPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} narrow>
      <JsonLd data={faqLd(FAQS)} />
      <PageHead h1="ช่วยเหลือ" sub="คำถามที่คนถามบ่อยที่สุด" />
      <Faq items={FAQS} />
      <div className="panel center">
        <h3>ยังไม่เจอคำตอบ</h3>
        <p>ส่งคำถามมาที่ทีมงาน เราตอบภายใน 2 วันทำการ</p>
        <Link className="btn btn-accent" href={U.contact}><Icon name="mail" cls="sm" /> ติดต่อเรา</Link>
      </div>
    </Shell>
  );
}
