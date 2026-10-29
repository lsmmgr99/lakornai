import type { Metadata } from "next";
import { getCatalog, coverSlot } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Header, Footer, BottomNav, SampleNote } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { WelcomePicker, type PrefTile } from "@/components/client/Welcome";

/* E1 เลือกแนวที่ชอบ — หน้าส่วนตัว ⇒ noindex · main เป็น wrap narrow แบบกำหนดเอง (ไม่มี nav active) */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.welcome,
    title: "เลือกแนวละครสั้นที่ชอบ เพื่อให้เราแนะนำตรงใจ · AiLakorn",
    desc: "เลือกแนวละครสั้น AI ที่คุณชอบอย่างน้อย 1 แนว เพื่อให้หน้าแรกแนะนำเรื่องที่ตรงใจตั้งแต่ครั้งแรก เปลี่ยนภายหลังได้ที่ตั้งค่า ดูฟรีทุกตอน ไม่ต้องสมัครสมาชิก",
    noindex: true,
  });
}

export default async function WelcomePage() {
  const c = await getCatalog();
  const tiles: PrefTile[] = c.genres.map((g) => {
    const first = c.seriesOfGenre(g.slug)[0];
    const slot = first ? coverSlot(first, "poster") : null;
    return { slug: g.slug, label: g.label, img: slot ? { url: slot.url, w: slot.w, h: slot.h } : null };
  });
  return (
    <>
      <Header />
      <main id="main" className="page"><div className="wrap narrow">
        <div className="page-head center">
          <span className="bigico"><Icon name="sparkle" cls="lg" /></span>
          <h1>เลือกแนวที่ชอบ</h1>
          <p>เลือกอย่างน้อย 1 อย่าง เพื่อให้เราแนะนำเรื่องที่ตรงใจตั้งแต่หน้าแรก — เปลี่ยนภายหลังได้ที่ตั้งค่า</p>
        </div>
        <WelcomePicker tiles={tiles} />
        <div className="perm center"><Icon name="playf" cls="sm" /><span><b>{c.settings.freeLine}</b></span></div>
        <SampleNote>ตัวเลือกนี้เก็บในเครื่องนี้เท่านั้น</SampleNote>
      </div><Footer c={c} /></main>
      <BottomNav />
    </>
  );
}
