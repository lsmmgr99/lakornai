import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, JsonLd } from "@/components/Layout";
import { Icon } from "@/components/Icon";

/* G1 เกี่ยวกับเรา — ตัวเลขเรื่อง/ตอนคิดจากคลังจริง (ไม่เขียนมือ) */
export async function generateMetadata(): Promise<Metadata> {
  const c = await getCatalog();
  const eps = c.series.reduce((a, s) => a + s.eps, 0);
  return pageMetadata({
    url: U.about,
    title: "เกี่ยวกับ AiLakorn — ละครสั้น AI ไทย ดูฟรีทุกตอน",
    desc: `AiLakorn ทำละครสั้น AI ภาษาไทยต้นฉบับ ${c.series.length} เรื่อง ${eps} ตอน บทเขียนโดยคน ภาพและเสียงสร้างด้วย AI ดูฟรีทุกตอน ไม่มีค่าสมาชิก ไม่ต้องล็อกอิน`,
  });
}

export default async function AboutPage() {
  const c = await getCatalog();
  const abs = (u: string) => c.settings.siteOrigin + u;
  const eps = c.series.reduce((a, s) => a + s.eps, 0);
  const free = c.settings.freeLine;
  return (
    <Shell c={c} narrow>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "AboutPage", url: abs(U.about),
        name: "เกี่ยวกับ AiLakorn", inLanguage: "th",
        mainEntity: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
      }} />
      <PageHead h1="เกี่ยวกับ AiLakorn" sub={<>ละครสั้นแนวตั้งสัญชาติไทย ที่ปก บท และตัวละครทุกตัวสร้างด้วย AI — <strong>{free}</strong></>} />
      <div className="prose">
        <p>AiLakorn เกิดจากคำถามเดียว — ถ้าคนไทยดูละครสั้นวันละ 20 นาทีระหว่างเดินทาง เราจะทำละครที่<strong>เริ่มจากศูนย์แล้วจบในหนึ่งคืน</strong>ได้ไหม</p>
        <h2>{free}</h2>
        <p>นี่คือจุดยืนของเรา ไม่ใช่โปรโมชัน — ทุกเรื่องทุกตอนบน AiLakorn เปิดให้ดูได้ทันที <strong>ไม่มีตอนที่ล็อกไว้ ไม่มีแพ็กเกจให้สมัคร และไม่มีแบบฟอร์มให้กรอกก่อนกดเล่น</strong> เราเชื่อว่าสิ่งที่ทำให้คนกลับมาดูคือตอนถัดไปที่ดีพอ ไม่ใช่กำแพงที่ขัดจังหวะตอนกำลังสนุก</p>
        <h2>เราทำอะไร</h2>
        <p>เราเขียนโครงเรื่องแบบไทย ๆ ที่คนไทยอินจริง — แก้แค้น ซ่อนตัวตน ข้ามภพ — แล้วใช้ AI ช่วยสร้างบท ปก และตัวละคร โดยมีทีมงานคนไทยเป็นผู้กำกับทิศทางทุกขั้นตอน</p>
        <div className="stat-row">
          <div><b className="num">{c.series.length}</b><span>เรื่องในคลัง</span></div>
          <div><b className="num">{eps}</b><span>ตอนทั้งหมด</span></div>
          <div><b className="num">3</b><span>นาทีต่อตอน</span></div>
        </div>
        <h2>ทำไมต้องแนวตั้ง</h2>
        <p>เพราะมือถือคือจอหลักของคนไทย การถ่ายแนวตั้งไม่ใช่ข้อจำกัด แต่เป็นการเลือกภาษาภาพที่ตรงกับวิธีที่คนดูจริง ๆ</p>
        <h2>“ละครผลไม้ AI” คืออะไร</h2>
        <p>เป็นแนวที่เราสร้างเอง ไม่มีที่ไหนทำ — ตัวละครเป็นผลไม้ไทยที่มีชีวิต มีศักดิ์ศรี และมีเรื่องให้แค้นกันข้ามรุ่น เป็นแนวที่คนจำเราได้</p>
      </div>
      <Link className="btn btn-accent" href={U.behind}><Icon name="sparkle" cls="sm" /> ดูเบื้องหลังการสร้างด้วย AI</Link>
    </Shell>
  );
}
