import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, SampleNote, JsonLd } from "@/components/Layout";
import { ContactForm } from "@/components/client/ContactForm";

/* G2 ติดต่อ */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.contact,
    title: "ติดต่อทีมงาน AiLakorn — แจ้งปัญหา ติดต่องาน",
    desc: "ติดต่อทีมงาน AiLakorn แจ้งปัญหาการรับชม เสนอเรื่องใหม่ หรือติดต่อเรื่องงานร่วมกัน กรอกฟอร์มแล้วทีมงานจะตอบกลับทางอีเมล",
  });
}

export default async function ContactPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} narrow>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ContactPage", url: c.settings.siteOrigin + U.contact, name: "ติดต่อ AiLakorn", inLanguage: "th" }} />
      <PageHead h1="ติดต่อเรา" sub="มีคำถาม ติชม หรืออยากร่วมงาน ส่งมาได้เลย เราอ่านทุกข้อความ" />
      <ContactForm />
      <SampleNote>ฟอร์มนี้ตรวจความถูกต้องของช่องกรอกจริง แต่ยังไม่ได้ต่อระบบส่งอีเมล</SampleNote>
    </Shell>
  );
}
