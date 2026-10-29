"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSeries } from "@/lib/admin/actions";
import { len } from "@/lib/admin/validate";
import { Msg } from "./Msg";

interface Ep { n: number; title: string; durationSec: number; videoUrl: string | null }
export interface SeriesInitial {
  slug: string; title: string; hook: string; synopsis: string; status: "ongoing" | "ended"; releaseDay: string | null;
  orientation: "vertical" | "horizontal" | ""; genres: string[]; tropes: string[]; cast: string[]; themeC1: string | null; themeC2: string | null; published: boolean; episodes: Ep[];
}
const EMPTY: SeriesInitial = { slug: "", title: "", hook: "", synopsis: "", status: "ongoing", releaseDay: "daily", orientation: "", genres: [], tropes: [], cast: [], themeC1: "#2a2140", themeC2: "#7a5a2c", published: false, episodes: [{ n: 1, title: "ตอนที่ 1", durationSec: 120, videoUrl: null }] };
const DAYS: [string, string][] = [["daily", "ออกทุกวัน"], ["mon", "ทุกจันทร์"], ["tue", "ทุกอังคาร"], ["wed", "ทุกพุธ"], ["thu", "ทุกพฤหัสบดี"], ["fri", "ทุกศุกร์"], ["sat", "ทุกเสาร์"], ["sun", "ทุกอาทิตย์"]];
const mmss = (s: number) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");
const parseMmss = (v: string) => { const m = v.trim().match(/^(\d{1,2}):([0-5]\d)$/); if (m) return Number(m[1]) * 60 + Number(m[2]); return /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN; };

function Counter({ value, max, min = 0 }: { value: string; max: number; min?: number }) {
  const n = len(value);
  return <div className={`counter${n > max || n < min ? " bad" : ""}`}>{n}/{max}{min ? ` (ต่ำสุด ${min})` : ""}</div>;
}

export function SeriesForm({ id = null, initial = EMPTY, genres, tropes }: { id?: number | null; initial?: SeriesInitial; genres: { slug: string; label: string }[]; tropes: { slug: string; label: string }[] }) {
  const [state, action, pending] = useActionState(saveSeries.bind(null, id), null);
  const router = useRouter();
  const [f, setF] = useState<SeriesInitial>(initial);
  const [eps, setEps] = useState<Ep[]>(initial.episodes);
  const [durText, setDurText] = useState<string[]>(initial.episodes.map((e) => mmss(e.durationSec)));
  useEffect(() => {
    if (state?.ok && state.data?.id) {
      if (!id) router.replace(`/admin/series/${state.data.id}/`);
      else router.refresh();
    }
  }, [state, id, router]);
  const set = <K extends keyof SeriesInitial>(k: K, v: SeriesInitial[K]) => setF((o) => ({ ...o, [k]: v }));
  const toggle = (k: "genres" | "tropes", slug: string) => set(k, f[k].includes(slug) ? f[k].filter((x) => x !== slug) : [...f[k], slug]);
  const renumber = (list: Ep[]) => list.map((e, i) => ({ ...e, n: i + 1 }));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= eps.length) return; const a = [...eps]; [a[i], a[j]] = [a[j], a[i]]; setEps(renumber(a)); const t = [...durText]; [t[i], t[j]] = [t[j], t[i]]; setDurText(t); };
  const dupCount = new Map<string, number>();
  for (const e of eps) dupCount.set(e.title, (dupCount.get(e.title) || 0) + 1);

  return (
    <form action={action}>
      <input type="hidden" name="episodes" value={JSON.stringify(eps)} />
      <div className="card">
        <div className="grid2">
          <label><span>รหัสเรื่อง (URL: /series/รหัส/) — a–z 0–9 ขีดกลาง {id ? "· เปลี่ยนได้เฉพาะร่าง" : ""}</span>
            <input name="slug" value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} readOnly={!!id && initial.published} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="เช่น moonlight-heir" /></label>
          <label><span>ชื่อเรื่อง</span><input name="title" value={f.title} onChange={(e) => set("title", e.target.value)} required /><Counter value={f.title} max={80} min={1} /></label>
        </div>
        <label><span>ประโยคโปรย (1–90 ตัวอักษร · ห้ามลงท้ายด้วยจุด · ใช้ในคำอธิบายหน้าเว็บสำหรับ Google)</span><input name="hook" value={f.hook} onChange={(e) => set("hook", e.target.value)} required /><Counter value={f.hook} max={90} min={1} /></label>
        <label><span>เรื่องย่อ (80–600 ตัวอักษร · ต้องไม่ซ้ำกับประโยคโปรย · แสดงบนหน้าเรื่องและ structured data)</span><textarea name="synopsis" value={f.synopsis} onChange={(e) => set("synopsis", e.target.value)} required /><Counter value={f.synopsis} max={600} min={80} /></label>
        <div className="grid2">
          <fieldset><legend>ทิศของวิดีโอ (บังคับ — เลือกกล่องเพลเยอร์ทั้งเรื่อง)</legend>
            <label className="inline"><input type="radio" name="orientation" value="vertical" checked={f.orientation === "vertical"} onChange={() => set("orientation", "vertical")} required /> แนวตั้ง 9:16</label>
            <label className="inline"><input type="radio" name="orientation" value="horizontal" checked={f.orientation === "horizontal"} onChange={() => set("orientation", "horizontal")} /> แนวนอน 16:9 (ต้องมีภาพกว้าง)</label>
          </fieldset>
          <div>
            <label><span>สถานะ</span>
              <select name="status" value={f.status} onChange={(e) => set("status", e.target.value as "ongoing" | "ended")}><option value="ongoing">ยังออกตอนอยู่</option><option value="ended">จบแล้ว</option></select></label>
            {f.status === "ongoing" && <label><span>วันออกตอน</span><select name="releaseDay" value={f.releaseDay || "daily"} onChange={(e) => set("releaseDay", e.target.value)}>{DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}
          </div>
        </div>
        <fieldset><legend>แนว (เลือกอย่างน้อย 1 · ตัวแรกที่เลือกคือแนวหลักในหน้าเว็บ)</legend>
          {genres.map((g) => <label key={g.slug} className="inline"><input type="checkbox" name="genres" value={g.slug} checked={f.genres.includes(g.slug)} onChange={() => toggle("genres", g.slug)} /> {g.label}</label>)}
        </fieldset>
        <fieldset><legend>แท็ก</legend>
          {tropes.map((t) => <label key={t.slug} className="inline"><input type="checkbox" name="tropes" value={t.slug} checked={f.tropes.includes(t.slug)} onChange={() => toggle("tropes", t.slug)} /> {t.label}</label>)}
        </fieldset>
        <div className="grid2">
          <label><span>นักแสดง/ตัวละคร (คั่นด้วยจุลภาค · ชื่อที่อยู่ ≥2 เรื่องจะมีหน้าตัวละครของตัวเอง)</span><input name="cast" value={f.cast.join(", ")} onChange={(e) => set("cast", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
          <label><span>สีธีมของเรื่อง (ไล่สีพื้นหลังปก/อวตาร)</span>
            <span className="row"><input type="color" name="themeC1" value={f.themeC1 || "#2a2140"} onChange={(e) => set("themeC1", e.target.value)} /><input type="color" name="themeC2" value={f.themeC2 || "#7a5a2c"} onChange={(e) => set("themeC2", e.target.value)} /></span></label>
        </div>
      </div>

      <h2>ตอน ({eps.length})</h2>
      <div className="card">
        <table>
          <thead><tr><th>ตอน</th><th>ชื่อตอน</th><th style={{ width: 110 }}>ความยาว (น:วว)</th><th>URL วิดีโอ (ว่าง = ยังไม่มีคลิป)</th><th style={{ width: 110 }}>ซ้ำ</th><th style={{ width: 150 }}></th></tr></thead>
          <tbody>
            {eps.map((e, i) => {
              const bad = !(e.durationSec >= 30 && e.durationSec <= 600) || !e.title.trim() || len(e.title) > 80;
              const dup = dupCount.get(e.title) || 0;
              return (
                <tr key={i} className={bad ? "bad" : ""}>
                  <td className="num">{e.n}</td>
                  <td><input value={e.title} aria-label={`ชื่อตอน ${e.n}`} onChange={(ev) => setEps(eps.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} /></td>
                  <td><input value={durText[i] ?? ""} aria-label={`ความยาวตอน ${e.n}`} placeholder="2:30" onChange={(ev) => { const t = [...durText]; t[i] = ev.target.value; setDurText(t); setEps(eps.map((x, j) => (j === i ? { ...x, durationSec: parseMmss(ev.target.value) } : x))); }} /></td>
                  <td><input value={e.videoUrl || ""} placeholder="https://…/ep1.mp4" onChange={(ev) => setEps(eps.map((x, j) => (j === i ? { ...x, videoUrl: ev.target.value || null } : x)))} /></td>
                  <td className="muted">{dup > 1 ? `ซ้ำ ${dup} ครั้ง` : "—"}</td>
                  <td>
                    <button type="button" className="btn sm" title="เลื่อนขึ้น" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>{" "}
                    <button type="button" className="btn sm" title="เลื่อนลง" disabled={i === eps.length - 1} onClick={() => move(i, 1)}>↓</button>{" "}
                    <button type="button" className="btn sm danger" title="ลบตอน" disabled={eps.length === 1} onClick={() => { setEps(renumber(eps.filter((_, j) => j !== i))); setDurText(durText.filter((_, j) => j !== i)); }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="ep-tools">
          <button type="button" className="btn" onClick={() => { setEps([...eps, { n: eps.length + 1, title: `ตอนที่ ${eps.length + 1}`, durationSec: 120, videoUrl: null }]); setDurText([...durText, "2:00"]); }}>+ เพิ่มตอน</button>
          <button type="button" className="btn" onClick={() => { const n = Number(prompt("เพิ่มทีเดียวกี่ตอน?", "10")); if (!n || n < 1 || n > 200) return; const add = Array.from({ length: n }, (_, k) => ({ n: eps.length + k + 1, title: `ตอนที่ ${eps.length + k + 1}`, durationSec: 120, videoUrl: null })); setEps([...eps, ...add]); setDurText([...durText, ...add.map(() => "2:00")]); }}>+ เพิ่มหลายตอน</button>
        </div>
      </div>

      <div className="sticky-actions">
        <label className="inline" style={{ margin: 0 }}><input type="checkbox" name="published" checked={f.published} onChange={(e) => set("published", e.target.checked)} /> เผยแพร่บนเว็บ (ต้องมีปกและผ่านการตรวจครบ)</label>
        <span style={{ flex: 1 }} />
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : f.published ? "บันทึกและเผยแพร่" : "บันทึกร่าง"}</button>
      </div>
      <Msg state={state} />
    </form>
  );
}
