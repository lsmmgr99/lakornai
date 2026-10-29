/* ความคืบหน้าการดู · ติดตาม · ประวัติ · การตั้งค่า — ทั้งหมดอยู่ใน localStorage ของผู้ชม (ไม่มีบัญชี)
   สัญญาข้อมูลเหมือนเว็บรุ่น static ทุกคีย์ (lakorn.*) ⇒ ผู้ชมเดิมย้ายมาแล้วไม่เสียรายการค้าง
     lakorn.cont     { slug: {ep,sec,dur,ts} }   lakorn.done { slug: ts }   lakorn.follows [slug]
     lakorn.history  [ {slug,ep,ts} ] ≤60        lakorn.prefs [genre]       lakorn.set {autoplay,sound,subs,notify}
   ใช้ได้เฉพาะฝั่งเบราว์เซอร์ — คอมโพเนนต์ที่เรียกต้องเป็น "use client" และเรียกหลัง mount */
import { U } from "./urls";

export interface SeriesLite { slug: string; title: string; eps: number; episodes: { n: number; durationSec: number; title: string }[] }
export interface ContEntry { ep: number; sec: number; dur: number; ts: number }
export interface Settings { autoplay: boolean; sound: boolean; subs: boolean; notify: boolean }
export const DEFAULT_SETTINGS: Settings = { autoplay: true, sound: false, subs: true, notify: true };

const NS = "lakorn.";
const memory: Record<string, string> = {};
let canStore: boolean | null = null;
function storable() {
  if (canStore !== null) return canStore;
  try { localStorage.setItem(NS + "probe", "1"); localStorage.removeItem(NS + "probe"); canStore = true; } catch { canStore = false; }
  return canStore;
}
export function read<T>(key: string, dflt: T): T {
  if (typeof window === "undefined") return dflt;
  try {
    const raw = storable() ? localStorage.getItem(NS + key) : memory[key];
    if (raw == null) return dflt;
    const v = JSON.parse(raw);
    return v == null ? dflt : (v as T);
  } catch { return dflt; }
}
export function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  try { if (storable()) localStorage.setItem(NS + key, raw); else memory[key] = raw; } catch { memory[key] = raw; }
  window.dispatchEvent(new CustomEvent("lakorn:change", { detail: key }));
}
export function wipe() {
  try { if (storable()) Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
  for (const k of Object.keys(memory)) delete memory[k];
  window.dispatchEvent(new CustomEvent("lakorn:change", { detail: "*" }));
}
/* ฟัง event เมื่อข้อมูลเปลี่ยน (รวมแท็บอื่นผ่าน storage event) */
export function subscribe(fn: () => void) {
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith(NS)) fn(); };
  window.addEventListener("lakorn:change", fn);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener("lakorn:change", fn); window.removeEventListener("storage", onStorage); };
}

const dict = (key: string): Record<string, unknown> => { const v = read<unknown>(key, null); return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}; };
const arr = (key: string): unknown[] => { const v = read<unknown>(key, null); return Array.isArray(v) ? v : []; };
const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const epNum = (s: SeriesLite, v: unknown) => Math.min(Math.max(Math.round(num(v, 1)), 1), s.eps);
const durOf = (s: SeriesLite, v: unknown, ep: number) => { let d = Math.round(num(v, 0)); if (!(d > 0)) d = s.episodes[ep - 1]?.durationSec || 0; return Math.max(1, d); };

function entry(s: SeriesLite | undefined, raw: unknown): ContEntry | null {
  if (!s || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const ep = epNum(s, r.ep);
  return { ep, sec: Math.max(0, Math.round(num(r.sec, 0))), dur: durOf(s, r.dur, ep), ts: Math.max(0, Math.round(num(r.ts, 0))) };
}

export type SeriesIndex = Record<string, SeriesLite>;

export const Progress = {
  get(by: SeriesIndex, slug: string) { return entry(by[slug], dict("cont")[slug]); },
  set(by: SeriesIndex, slug: string, ep: number, sec: number, dur: number) {
    const s = by[slug]; if (!s) return;
    const cont = dict("cont");
    const n = epNum(s, ep);
    cont[slug] = { ep: n, sec: Math.max(0, Math.round(num(sec, 0))), dur: durOf(s, dur, n), ts: Date.now() };
    save("cont", cont);
    const dn = dict("done");
    if (dn[slug]) { delete dn[slug]; save("done", dn); }
    this.pushHistory(slug, n);
  },
  finish(slug: string) {
    const cont = dict("cont"); delete cont[slug]; save("cont", cont);
    const dn = dict("done"); dn[slug] = Date.now(); save("done", dn);
  },
  remove(slug: string) { const cont = dict("cont"); delete cont[slug]; save("cont", cont); },
  pushHistory(slug: string, ep: number) {
    let h = arr("history") as { slug?: unknown; ep?: unknown; ts?: unknown }[];
    h = h.filter((x) => !(x && x.slug === slug && num(x.ep, -1) === ep));
    h.unshift({ slug, ep, ts: Date.now() });
    save("history", h.slice(0, 60));
  },
  done(): Record<string, unknown> { return dict("done"); },
  all(): Record<string, unknown> { return dict("cont"); },
  list(by: SeriesIndex) {
    const cont = dict("cont"), dn = dict("done");
    const out: { s: SeriesLite; ep: number; sec: number; dur: number; ts: number; pct: number }[] = [];
    for (const slug of Object.keys(cont)) {
      if (dn[slug]) continue;
      const e = entry(by[slug], cont[slug]);
      if (!e) continue;
      out.push({ s: by[slug], ...e, pct: Math.max(0, Math.min(100, Math.round((e.sec / e.dur) * 100))) });
    }
    return out.sort((a, b) => b.ts - a.ts);
  },
  doneList(by: SeriesIndex) {
    const dn = dict("done");
    return Object.keys(dn).filter((k) => by[k]).map((k) => ({ s: by[k], ts: Math.max(0, Math.round(num(dn[k], 0))) })).sort((a, b) => b.ts - a.ts);
  },
  history(by: SeriesIndex) {
    return (arr("history") as { slug?: string; ep?: unknown; ts?: unknown }[])
      .map((x) => { const s = x && x.slug ? by[x.slug] : undefined; return s ? { s, ep: epNum(s, x.ep), ts: Math.max(0, Math.round(num(x.ts, 0))) } : null; })
      .filter((x): x is { s: SeriesLite; ep: number; ts: number } => !!x);
  },
  resumeHref(by: SeriesIndex, slug: string) {
    const e = this.get(by, slug);
    const ep = e ? e.ep : 1;
    const at = e && e.sec > 2 ? `?t=${e.sec}` : "";
    return U.watch(slug, ep) + at;
  },
  resumeLabel(by: SeriesIndex, slug: string) {
    const e = this.get(by, slug);
    return e ? `ดูต่อ EP.${e.ep}` : "เริ่มดู EP.1";
  },
};

export const Follows = {
  list(): string[] { return (arr("follows") as unknown[]).filter((x): x is string => typeof x === "string"); },
  has(slug: string) { return this.list().includes(slug); },
  toggle(slug: string): boolean {
    const f = this.list();
    const i = f.indexOf(slug);
    if (i > -1) f.splice(i, 1); else f.push(slug);
    save("follows", f);
    return i === -1;
  },
  toldLocal(): boolean { const t = read<boolean>("toldLocal", false); if (!t) save("toldLocal", true); return t; },
};

export function getSettings(): Settings {
  const s = read<Partial<Settings>>("set", {}) || {};
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) if (k in s) out[k] = !!s[k];
  return out;
}
export function setSetting(k: keyof Settings, v: boolean) { const s = getSettings(); s[k] = v; save("set", s); }
export const Prefs = {
  list(): string[] { return (arr("prefs") as unknown[]).filter((x): x is string => typeof x === "string"); },
  set(list: string[]) { save("prefs", list); },
};
export const fmt = (x: number) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
export function timeAgo(ts: number) {
  const d = Math.max(0, Date.now() - (ts || 0));
  const m = Math.floor(d / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const day = Math.floor(h / 24);
  return day === 1 ? "เมื่อวาน" : `${day} วันที่แล้ว`;
}
