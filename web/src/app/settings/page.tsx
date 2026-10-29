import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCatalog } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { U } from "@/lib/urls";
import { Shell, PageHead, Section } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { SettingSwitch, HistCount, ClearHistoryButton, ClearAllButton } from "@/components/client/SettingsPanel";

/* D1 ตั้งค่า — หน้าส่วนตัว ⇒ noindex */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    url: U.settings,
    title: "ตั้งค่าการเล่นและข้อมูลในเครื่อง · AiLakorn",
    desc: "ตั้งค่าการเล่นตอนถัดไปอัตโนมัติ เสียง ซับไตเติล และการแจ้งเตือนของ AiLakorn รวมถึงล้างประวัติการดูและคลังที่เก็บอยู่ในเบราว์เซอร์เครื่องนี้",
    noindex: true,
  });
}

const Row = ({ label, sub, children }: { label: string; sub?: ReactNode; children: ReactNode }) => (
  <div className="r"><span className="rl">{label}{sub && <span className="sub">{sub}</span>}</span>{children}</div>
);

export default async function SettingsPage() {
  const c = await getCatalog();
  return (
    <Shell c={c} back={["ตั้งค่า", U.home]} narrow>
      <PageHead h1="ตั้งค่า" sub="บันทึกทันทีที่สลับ — ไม่มีปุ่มยืนยัน และไม่ต้องมีบัญชี" />
      <Section title="การเล่น">
        <div className="rowlist">
          <Row label="เล่นตอนถัดไปอัตโนมัติ" sub="นับถอยหลัง 5 วินาทีเมื่อดูจบตอน"><SettingSwitch k="autoplay" /></Row>
          <Row label="เล่นเสียงอัตโนมัติ" sub="ค่าเริ่มต้นคือปิดเสียง แตะที่จอเพื่อเปิด"><SettingSwitch k="sound" /></Row>
          <Row label="เปิดซับไตเติลเสมอ"><SettingSwitch k="subs" /></Row>
        </div>
      </Section>
      <Section title="การแจ้งเตือน">
        <div className="rowlist">
          <Row label="ตอนใหม่ของเรื่องที่ติดตาม" sub="อ่านจากรายการติดตามในเครื่องนี้"><SettingSwitch k="notify" /></Row>
        </div>
      </Section>
      <Section title="ภาษา">
        <div className="rowlist">
          <Row label="ภาษาของเว็บไซต์" sub="ตอนนี้มีเฉพาะภาษาไทย — โครงสร้าง URL เตรียมรองรับภาษาอื่นไว้แล้ว"><span className="rv">ไทย (เท่านั้น)</span></Row>
        </div>
      </Section>
      <Section title="ข้อมูลในเครื่องนี้">
        <div className="rowlist">
          <div className="r"><span className="rl">ประวัติการดู<HistCount /></span><ClearHistoryButton /></div>
          <div className="r"><span className="rl">คลังทั้งหมด<span className="sub">ดูต่อ ติดตาม ดูจบแล้ว ประวัติ และการตั้งค่า</span></span><ClearAllButton /></div>
        </div>
        <p className="note-ex"><Icon name="alert" cls="sm" /><span>การล้างข้อมูลย้อนกลับไม่ได้ และไม่มีบัญชีให้กู้คืน — จะถามยืนยัน 1 ชั้นก่อนลบ</span></p>
      </Section>
      <p className="ver">AiLakorn เวอร์ชัน 3.0</p>
    </Shell>
  );
}
