import Link from "next/link";
import type { ReactNode } from "react";
import type { Catalog } from "@/lib/content";
import { U } from "@/lib/urls";
import { Icon } from "./Icon";
import { BellDot } from "./client/BellDot";

const NAV = [
  { k: "home", label: "หน้าแรก", icon: "home", url: U.home },
  { k: "feed", label: "ฟีด", icon: "feed", url: U.feed },
  { k: "search", label: "ค้นหา", icon: "search", url: U.search },
  { k: "library", label: "คลังของฉัน", icon: "library", url: U.library },
];
const TOP_LINKS: [string, string, string][] = [["home", "หน้าแรก", U.home], ["feed", "ฟีด", U.feed], ["browse", "หมวด", U.browse], ["new", "ตอนใหม่", U.newEp], ["popular", "ยอดนิยม", U.popular], ["library", "คลังของฉัน", U.library]];

export function Header({ active = "", back = null }: { active?: string; back?: [string, string] | null }) {
  return (
    <header className="top"><div className="wrap">
      {back ? (
        <>
          <Link className="icon-btn" style={{ margin: 0 }} href={back[1]} aria-label={`ย้อนกลับไป ${back[0]}`}><Icon name="left" /></Link>
          <b className="htitle">{back[0]}</b>
        </>
      ) : (
        <Link className="logo" href={U.home} aria-label="AiLakorn หน้าแรก"><i lang="en">AI</i><b lang="en">Lakorn</b></Link>
      )}
      <nav className="topnav" aria-label="เมนูบนสุด">
        {TOP_LINKS.map(([k, l, u]) => <Link key={k} href={u} aria-current={k === active ? "page" : undefined}>{l}</Link>)}
      </nav>
      <div className="spacer" />
      <Link className="icon-btn" href={U.search} aria-label="ค้นหา"><Icon name="search" /></Link>
      <BellDot />
      <Link className="icon-btn" style={{ marginLeft: 4 }} href={U.settings} aria-label="ตั้งค่า"><Icon name="settings" /></Link>
    </div></header>
  );
}

export function BottomNav({ active = "" }: { active?: string }) {
  return (
    <nav className="bottom" aria-label="เมนูหลัก"><div className="in">
      {NAV.map((n) => <Link key={n.k} href={n.url} aria-current={n.k === active ? "page" : undefined}><Icon name={n.icon} /><span>{n.label}</span></Link>)}
    </div></nav>
  );
}

function Col({ h, items }: { h: string; items: [string, string][] }) {
  return <div><h4>{h}</h4><nav aria-label={h}>{items.map(([t, u]) => <Link key={u} href={u}>{t}</Link>)}</nav></div>;
}
export function Footer({ c }: { c: Catalog }) {
  return (
    <footer className="foot"><div className="wrap"><div className="cols">
      <Col h="เลือกดู" items={[...c.genres.map((g) => [g.label, U.genre(g.slug)] as [string, string]), ["ดัชนี ก–ฮ / A–Z", U.az], ["ตารางออกตอน", U.schedule]]} />
      <Col h="ของฉัน" items={[["คลังของฉัน", U.library], ["แจ้งเตือน", U.notifications], ["ตั้งค่า", U.settings]]} />
      <Col h="เกี่ยวกับ" items={[["เกี่ยวกับเรา", U.about], ["เบื้องหลังการสร้างด้วย AI", U.behind], ["ติดต่อ", U.contact], ["ช่วยเหลือ", U.help]]} />
      <Col h="ข้อกำหนด" items={[["ข้อตกลงการใช้", U.legal("terms")], ["นโยบายความเป็นส่วนตัว", U.legal("privacy")], ["นโยบายคุกกี้", U.legal("cookies")]]} />
    </div>
    <div className="stance"><Icon name="playf" cls="sm" /><span>{c.settings.freeLine}</span></div>
    <div className="btm">© {c.settings.siteName} · {c.settings.siteOrigin.replace(/^https?:\/\//, "")}</div></div></footer>
  );
}

/* โครงหน้ามาตรฐาน: header + <main class="page"> + footer + bottom nav */
export function Shell({ c, nav = "", active = "", back = null, narrow = false, children, bodyClass }: { c: Catalog; nav?: string; active?: string; back?: [string, string] | null; narrow?: boolean; children: ReactNode; bodyClass?: string }) {
  return (
    <>
      <Header active={active} back={back} />
      <main id="main" className={`page ${bodyClass || ""}`.trim()}>
        <div className={`wrap${narrow ? " narrow" : ""}`}>{children}</div>
        <Footer c={c} />
      </main>
      <BottomNav active={nav} />
    </>
  );
}

export function PageHead({ h1, sub }: { h1: string; sub?: ReactNode }) {
  return <div className="page-head"><h1>{h1}</h1>{sub && <p>{sub}</p>}</div>;
}
export function Crumbs({ items }: { items: [string, string | null][] }) {
  return (
    <nav className="crumbs" aria-label="เส้นทาง">
      {items.map(([t, u], i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span aria-hidden="true">›</span>}
          {u ? <Link href={u}>{t}</Link> : <span>{t}</span>}
        </span>
      ))}
    </nav>
  );
}
export function Section({ title, children, more, sub, id, hidden }: { title: string; children: ReactNode; more?: [string, string]; sub?: ReactNode; id?: string; hidden?: boolean }) {
  return (
    <section className="sec" id={id} hidden={hidden}>
      <div className="sec-h"><h2>{title}</h2>{more && <Link className="more" href={more[1]}>{more[0]} <Icon name="right" cls="sm" /></Link>}</div>
      {sub && <p className="sec-sub">{sub}</p>}
      {children}
    </section>
  );
}
export function Empty({ icon, h, p, btn }: { icon: string; h: string; p: string; btn?: [string, string] }) {
  return (
    <div className="empty">
      <div className="ill"><Icon name={icon} cls="lg" /></div><h3>{h}</h3><p>{p}</p>
      {btn && <Link className="btn btn-ghost btn-md" href={btn[1]}>{btn[0]}</Link>}
    </div>
  );
}
export const SampleNote = ({ children }: { children: ReactNode }) => <p className="note-ex"><Icon name="info" cls="sm" /><span>{children}</span></p>;
export const LocalNote = ({ text = "ข้อมูลคลังอยู่ในเครื่องนี้เท่านั้น — ถ้าล้างข้อมูลเบราว์เซอร์ รายการจะหาย" }: { text?: string }) => (
  <div className="perm neutral"><span className="ic"><Icon name="info" cls="sm" /></span><span>{text}</span></div>
);
export const FreeAllBar = ({ c }: { c: Catalog }) => <div className="perm"><span className="ic"><Icon name="playf" cls="sm" /></span><span><b>{c.settings.freeLine}</b></span></div>;
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const list = Array.isArray(data) ? data : [data];
  return <>{list.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />)}</>;
}
