/* ทดสอบหลังบ้านครบวงในเบราว์เซอร์จริง (Chromium ผ่าน CDP · ไม่ต้องมี Playwright) — ใช้เรื่องทดสอบของตัวเอง ไม่แตะข้อมูลจริง:
   เข้าสู่ระบบ → สร้างเรื่องร่าง → เผยแพร่ต้องถูกปฏิเสธเพราะไม่มีปก → อัปโหลดปก 2:3 → เผยแพร่ → หน้าเว็บผู้ชม/sitemap มีเรื่องนี้ทันที
   → แก้ชื่อแล้วหน้าเว็บเปลี่ยน → กฎข้อมูลฟ้องช่อง → ภาพกว้างสัดส่วนผิดถูกปฏิเสธ → สลับการเก็บดัชนีแล้ว robots.txt เปลี่ยน (คืนค่า)
   → ลบเรื่องทดสอบ → หน้าเว็บ 404 → ออกจากระบบแล้วหน้า admin ถูกกั้น
   รัน:  BASE=http://127.0.0.1:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npx tsx tests/admin-e2e.mts
   (ถ้าไม่ตั้ง BASE จะอ่านพอร์ตจากไฟล์ port.txt ของ dev server ใน scratchpad) */
import fs from "node:fs";
import { spawn } from "node:child_process";

const CHROME = process.env.CHROME || "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const PORT_FILE = "/tmp/claude-0/-root-projects-lsm-lakornai/5b1a658c-e2aa-4c0e-bfd5-2d722adb46c8/scratchpad/port.txt";
const BASE = process.env.BASE || `http://127.0.0.1:${fs.existsSync(PORT_FILE) ? fs.readFileSync(PORT_FILE, "utf8").trim().split(" ")[1] : "3000"}`;
const EMAIL = process.env.ADMIN_EMAIL || "admin@ailakorn.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe-2026";
const SLUG = "e2e-test-" + Math.random().toString(36).slice(2, 7);
const TITLE = "เรื่องทดสอบอัตโนมัติ";
const CDP = 9460 + Math.floor(Math.random() * 100);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dbus", `--remote-debugging-port=${CDP}`, "--remote-allow-origins=*", "about:blank"], { stdio: "ignore" });
const cleanup = (code: number) => { try { chrome.kill("SIGTERM"); } catch { /* */ } process.exit(code); };

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: "PUT" }); const j = (await r.json()) as { webSocketDebuggerUrl?: string }; if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch { /* รอ */ }
    await sleep(250);
  }
  throw new Error("เชื่อมต่อ chrome ไม่ได้");
}
const ws = new WebSocket(await wsUrl());
await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error("ws")); });
let id = 0; const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();
ws.onmessage = (ev) => { const m = JSON.parse(String(ev.data)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id)!; pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method: string, params: Record<string, unknown> = {}) => new Promise<unknown>((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
async function evaluate<T = unknown>(expression: string): Promise<T> {
  const r = (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as { exceptionDetails?: { exception?: { description?: string } }; result: { value: T } };
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "js error");
  return r.result.value;
}
const go = async (path: string) => { await send("Page.navigate", { url: BASE + path }); await sleep(600); await waitFor("document.readyState==='complete'", "load"); };
async function waitFor(expr: string, what: string, tries = 100) { for (let i = 0; i < tries; i++) { try { if (await evaluate<boolean>(expr)) return; } catch { /* หน้ากำลังเปลี่ยน */ } await sleep(150); } throw new Error("Timeout: " + what); }
const setInput = (sel: string, value: string) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});const setter=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
const click = (sel: string) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)throw new Error('ไม่พบ '+${JSON.stringify(sel)});el.click();return true})()`);
const submitMain = () => click(".adm-main form button[type=submit]");
const submitSeries = () => click(".sticky-actions button[type=submit]");
const fetchText = async (path: string) => { const r = await fetch(BASE + path, { cache: "no-store" }); return { status: r.status, body: await r.text() }; };
const step = (s: string) => console.log("•", s);
/* รอให้ server action ทำงานจบ: ปุ่ม submit ในขอบเขตจะ disabled ระหว่าง pending แล้วกลับมา · ค่อยอ่าน .msg ตัวสุดท้าย */
async function expectMsg(what: string, ok: boolean, scope = ".adm-main") {
  const busy = `[...document.querySelectorAll('${scope} button[type=submit]')].some(b=>b.disabled)`;
  for (let i = 0; i < 100; i++) { if (await evaluate<boolean>(busy)) break; await sleep(30); }
  await waitFor(`!(${busy})`, what + " (settle)", 400);
  await sleep(150);
  const msgs = await evaluate<{ ok: boolean; text: string }[]>(`[...document.querySelectorAll('${scope} .msg')].map(x=>({ok:x.classList.contains('ok'),text:x.textContent}))`);
  const last = msgs[msgs.length - 1];
  if (!last) throw new Error(`${what}: ไม่มีข้อความตอบกลับ`);
  if (last.ok !== ok) throw new Error(`${what}: คาดว่า ${ok ? "สำเร็จ" : "ถูกปฏิเสธ"} แต่ได้ "${last.text}"`);
  return last.text;
}
const canvasUpload = (w: number, h: number, inputIndex: number) => evaluate(`(async()=>{const c=document.createElement('canvas');c.width=${w};c.height=${h};const g=c.getContext('2d');g.fillStyle='#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');g.fillRect(0,0,${w},${h});g.fillStyle='#fc5';g.fillRect(${w * 0.13},${h * 0.13},${w * 0.74},${h * 0.74});const blob=await new Promise(r=>c.toBlob(r,'image/png'));const t=new DataTransfer();t.items.add(new File([blob],'fake-name.txt',{type:'text/plain'}));const input=document.querySelectorAll('.cover-box input[type=file]')[${inputIndex}];input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}));input.closest('form').requestSubmit();})()`);

try {
  step("เข้าสู่ระบบ");
  await go("/admin/login/");
  await waitFor("!!document.querySelector('input[name=email]')", "login form");
  await setInput("input[name=email]", EMAIL); await setInput("input[name=password]", PASSWORD);
  await submitMain();
  await waitFor("location.pathname==='/admin/' || location.pathname==='/admin'", "redirect to dashboard", 200);
  await waitFor("document.querySelector('h1')?.textContent==='แดชบอร์ด'", "dashboard h1");

  step("สร้างเรื่องทดสอบเป็นร่าง");
  await go("/admin/series/new/");
  await waitFor("!!document.querySelector('input[name=slug]')", "new form");
  await setInput("input[name=slug]", SLUG);
  await setInput("input[name=title]", TITLE);
  await setInput("input[name=hook]", "ประโยคโปรยของเรื่องทดสอบที่สร้างโดยสคริปต์");
  await setInput("textarea[name=synopsis]", "เรื่องย่อของเรื่องทดสอบอัตโนมัติ ยาวพอที่จะผ่านเกณฑ์แปดสิบตัวอักษร เล่าถึงสคริปต์ที่ตรวจว่าหลังบ้านทำงานครบวงจรตั้งแต่สร้างจนลบ");
  await click("input[name=orientation][value=vertical]");
  await click("input[name=genres]");
  await setInput("input[name=cast]", "ตัวละครทดสอบหนึ่ง, ตัวละครทดสอบสอง");
  await submitSeries();
  /* สำเร็จ = เด้งไปหน้าแก้ไขของเรื่องใหม่ทันที (ไม่มีข้อความค้างให้อ่าน) */
  await waitFor(`location.pathname.startsWith('/admin/series/') && !location.pathname.includes('/new')`, "redirect to edit page (create failed?)", 200);
  await waitFor("!!document.querySelector('.cover-box')", "edit page");
  if ((await fetchText(`/series/${SLUG}/`)).status !== 404) throw new Error("ร่างต้องยังไม่แสดงบนเว็บ");

  step("เผยแพร่โดยไม่มีปกต้องถูกปฏิเสธ");
  await click("input[name=published]");
  await submitSeries();
  const refused = await expectMsg("เผยแพร่โดยไม่มีปก", false);
  if (!refused.includes("ปก")) throw new Error("ข้อความต้องบอกว่าขาดปก: " + refused);

  step("อัปโหลดปก 2:3 (PNG 600×900 จาก canvas ชื่อไฟล์ปลอม) → แปลงเป็น WebP และเสิร์ฟได้");
  await canvasUpload(600, 900, 0);
  await expectMsg("อัปโหลดปก", true, ".cover-box");
  await evaluate("location.reload()"); await sleep(800); await waitFor("!!document.querySelector('.cover-box small')", "cover path shown");
  const coverUrl = await evaluate<string>("document.querySelector('.cover-box small').textContent");
  const img = await fetch(BASE + coverUrl);
  if (img.status !== 200 || img.headers.get("content-type") !== "image/webp") throw new Error("ไฟล์ปกเสิร์ฟไม่ได้: " + coverUrl);

  step("เผยแพร่ → หน้าเว็บผู้ชมและ sitemap มีเรื่องนี้ทันที");
  await click("input[name=published]");
  await submitSeries();
  await expectMsg("เผยแพร่", true);
  const live = await fetchText(`/series/${SLUG}/`);
  if (live.status !== 200 || !live.body.includes(TITLE)) throw new Error("หน้าเรื่องไม่ขึ้นหลังเผยแพร่");
  if (!live.body.includes(coverUrl)) throw new Error("หน้าเรื่องไม่ชี้ปกที่อัปโหลด");
  if (!(await fetchText("/sitemap.xml")).body.includes(`/series/${SLUG}/`)) throw new Error("sitemap ไม่มีเรื่องใหม่");
  if ((await fetchText(`/watch/${SLUG}/ep-1/`)).status !== 200) throw new Error("หน้าตอนไม่ขึ้น");

  step("แก้ชื่อเรื่อง → หน้าเว็บเปลี่ยนทันที");
  await setInput("input[name=title]", TITLE + " (แก้แล้ว)");
  await submitSeries();
  await expectMsg("แก้ชื่อ", true);
  if (!(await fetchText(`/series/${SLUG}/`)).body.includes(TITLE + " (แก้แล้ว)")) throw new Error("หน้าเรื่องไม่อัปเดตหลังแก้ (revalidate ไม่ทำงาน)");
  const genresOnPage = (await fetchText(`/series/${SLUG}/`)).body.match(/class="facts"[\s\S]*?<\/div>/)?.[0] || "";
  if ((genresOnPage.match(/·/g) || []).length > 4) throw new Error("แนวซ้ำบนหน้าเรื่อง (บั๊กส่งค่าซ้ำ)");

  step("กฎข้อมูล: เรื่องย่อสั้นต้องถูกปฏิเสธพร้อมบอกช่อง");
  const origSyn = await evaluate<string>("document.querySelector('textarea[name=synopsis]').value");
  await setInput("textarea[name=synopsis]", "สั้นเกินไป");
  await submitSeries();
  const bad = await expectMsg("เรื่องย่อสั้น", false);
  if (!bad.includes("เรื่องย่อ")) throw new Error("ข้อความผิดพลาดไม่ระบุช่องเรื่องย่อ: " + bad);
  await setInput("textarea[name=synopsis]", origSyn);

  step("ภาพกว้างที่สัดส่วนผิดต้องถูกปฏิเสธ");
  await canvasUpload(600, 900, 1);
  const wideMsg = await expectMsg("ภาพกว้างสัดส่วนผิด", false, ".cover-box");
  if (!wideMsg.includes("สัดส่วน")) throw new Error("ข้อความปฏิเสธภาพกว้างไม่ถูกต้อง: " + wideMsg);

  step("ตั้งค่า: สลับการเก็บดัชนี → robots.txt เปลี่ยนทันที แล้วคืนค่า");
  const robots0 = (await fetchText("/robots.txt")).body;
  await go("/admin/settings/");
  await waitFor("!!document.querySelector('input[name=indexing]')", "settings form");
  const was = await evaluate<boolean>("document.querySelector('input[name=indexing]').checked");
  await click("input[name=indexing]"); await submitMain();
  await expectMsg("บันทึกตั้งค่า", true);
  const robots1 = (await fetchText("/robots.txt")).body;
  if (robots0 === robots1) throw new Error("robots.txt ไม่เปลี่ยนหลังสลับการเก็บดัชนี");
  if (!was && !/Allow: \//.test(robots1)) throw new Error("เปิดดัชนีแล้วแต่ robots ไม่ Allow: " + robots1);
  await click("input[name=indexing]"); await submitMain();
  await expectMsg("คืนค่าตั้งค่า", true);
  if ((await fetchText("/robots.txt")).body !== robots0) throw new Error("robots.txt ไม่กลับเป็นค่าเดิม");

  step("ลบเรื่องทดสอบ → หน้าเว็บ 404 และหายจาก sitemap");
  await go(`/admin/series/${SLUG}/`);
  await waitFor("!!document.querySelector('.danger-zone input')", "delete box");
  await setInput(".danger-zone input", TITLE + " (แก้แล้ว)");
  await click(".danger-zone button.danger");
  await waitFor("location.pathname==='/admin/series/'", "redirect after delete", 200);
  if ((await fetchText(`/series/${SLUG}/`)).status !== 404) throw new Error("ลบแล้วแต่หน้าเรื่องยังอยู่");
  if ((await fetchText("/sitemap.xml")).body.includes(`/series/${SLUG}/`)) throw new Error("ลบแล้วแต่ sitemap ยังมี");
  if ((await fetch(BASE + coverUrl)).status !== 404) throw new Error("ลบแล้วแต่ไฟล์ปกยังอยู่");

  step("ออกจากระบบ → หน้า admin ต้องเด้งไปล็อกอิน");
  await click(".who form button");
  await waitFor("location.pathname.startsWith('/admin/login')", "logout redirect", 200);
  const gate = await fetch(BASE + "/admin/series/", { redirect: "manual" });
  if (gate.status !== 307 && gate.status !== 308) throw new Error("หน้า admin ไม่ได้ถูกกั้นหลังออกจากระบบ: " + gate.status);

  console.log(`PASS admin e2e (${SLUG}): login · create draft · publish gate · cover upload · publish+revalidate · edit · validation · wide rejection · indexing toggle · delete · logout gate`);
  cleanup(0);
} catch (e) {
  console.error("FAIL:", (e as Error).message, `(เรื่องทดสอบ ${SLUG} อาจค้างอยู่ — ลบได้จากหลังบ้าน)`);
  cleanup(1);
}
