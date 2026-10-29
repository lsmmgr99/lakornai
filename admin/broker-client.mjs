// ฝั่งเบราว์เซอร์ที่คุยกับ broker บนเครื่องเดียวกัน — ไม่เคยเห็น token ของ GitHub (ADR-001 §12.1 B4)
// สองปุ่มเขียน: #save → /api/commit (branch ร่าง) · #publish → /api/publish (branch เผยแพร่ → CI → เว็บ)
import { coverSlots } from './covers.mjs';

const toBase64 = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function connectBroker({ getDraft, loadDraft, message, onSaved = () => {}, onState = () => {}, ask = q => confirm(q) }) {
  const $ = id => document.getElementById(id);
  const login = $('login'), logout = $('logout'), save = $('save'), publish = $('publish');
  let csrf, tab, info = {}, active = true, timer, statusTimer, canWrite = false;
  const heads = { publish: null, draft: null };

  async function api(route, body = {}) {
    const r = await fetch('/api/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(body) });
    const result = await r.json();
    if (!r.ok) throw Object.assign(Error(result.error || 'คำขอไม่สำเร็จ'), { status: r.status });
    return result;
  }
  const setWrite = (on) => { canWrite = on; save.disabled = !on || !active; publish.disabled = !on || !active; };

  try { info = await api('session'); csrf = info.csrf; tab = info.tab; } catch { onState({ mode: 'offline' }); return; }
  onState({ mode: 'connected', info });
  if (info.loginEnabled) login.disabled = false;
  else message('ยังไม่ตั้งค่า GitHub App ใน admin/config.json — แก้และส่งออกไฟล์ได้ แต่ปุ่มบันทึก/เผยแพร่ยังใช้ไม่ได้ (ดู admin/README.md ขั้นที่ 1)');

  const beat = () => active && api('heartbeat').catch(e => {
    if (e.status === 403) { active = false; setWrite(false); clearInterval(heartbeat); clearTimeout(timer); onState({ mode: 'expired' }); message('หมดเวลาการเชื่อมต่อ กรุณาส่งออกร่างไว้ก่อน แล้วโหลดหน้าใหม่เพื่อเข้าสู่ระบบอีกครั้ง'); }
    else message('เชื่อมต่อ broker ไม่สำเร็จ จะลองใหม่อัตโนมัติ');
  });
  let heartbeat = setInterval(beat, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') beat(); });
  window.addEventListener('pagehide', () => { clearInterval(heartbeat); clearTimeout(timer); clearTimeout(statusTimer); fetch('/api/close-tab', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ tab }) }).catch(() => {}); });
  window.addEventListener('pageshow', async e => {
    if (!e.persisted) return;
    try { info = await api('session'); csrf = info.csrf; tab = info.tab; active = true; setWrite(false); login.disabled = !info.loginEnabled; heartbeat = setInterval(beat, 20000); message('กลับมาเปิดแผงแล้ว กรุณาเข้าสู่ระบบก่อนบันทึก ร่างยังอยู่ครบ'); } catch (err) { message(err.message); }
  });

  async function loadRemote() {
    const remote = await api('load');
    heads.publish = remote.publish.head; heads.draft = remote.draft?.head ?? null;
    let use = remote.publish;
    if (remote.draft && ask('มีร่างที่บันทึกไว้ค้างอยู่บน GitHub (ยังไม่เผยแพร่)\n\nตกลง = โหลดร่างนั้นมาแก้ต่อ\nยกเลิก = โหลดข้อมูลที่เผยแพร่อยู่บนเว็บตอนนี้')) use = remote.draft;
    else if (!remote.draft && !ask('โหลดข้อมูลล่าสุดจาก GitHub มาแทนร่างในหน้านี้หรือไม่?\n(ยกเลิก = เก็บร่างในหน้าไว้ แล้วบันทึกทับข้อมูลบน GitHub ได้)')) use = null;
    if (use) loadDraft(use.content, { files: use.files });
    setWrite(remote.canWrite);
    onState({ mode: 'authed', user: remote.user, canWrite: remote.canWrite });
    message(remote.canWrite ? `เชื่อมต่อ GitHub แล้ว (${remote.user?.login || ''}) — บันทึกร่างได้ และเผยแพร่ขึ้นเว็บได้` : 'บัญชีนี้ไม่มีสิทธิ์เขียนรีโป ยังแก้และส่งออกร่างได้ แต่บันทึก/เผยแพร่ไม่ได้');
  }

  login.onclick = async () => {
    try {
      setWrite(false); login.disabled = true;
      const d = await api('login');
      onState({ device: { code: d.userCode, url: d.verificationUri } });
      message(`เปิด ${d.verificationUri} แล้วกรอกรหัส ${d.userCode}`);
      async function poll() {
        try {
          const result = await api('poll');
          if (result.pending) { timer = setTimeout(poll, result.interval); return; }
          onState({ device: null });
          logout.hidden = false; login.hidden = true;
          await loadRemote();
        } catch (e) { onState({ device: null }); login.disabled = false; message(e.message); }
      }
      timer = setTimeout(poll, d.interval);
    } catch (e) { login.disabled = false; message(e.message); }
  };

  logout.onclick = async () => {
    active = false; clearTimeout(timer); clearTimeout(statusTimer); setWrite(false);
    try { await api('logout'); message('ออกจากระบบแล้ว ส่งออกร่างได้ตามปกติ โหลดหน้าใหม่เพื่อเข้าสู่ระบบอีกครั้ง'); } catch (e) { message(e.message); }
    login.disabled = true; logout.hidden = true; login.hidden = false; clearInterval(heartbeat);
    onState({ mode: 'connected', user: null });
  };

  async function write(route) {
    const draft = getDraft();
    const content = structuredClone(draft.content), covers = new Map(draft.covers);
    content.generatedAt = new Date().toISOString();
    const uploads = [];
    for (const s of content.series) for (const [kind, p] of coverSlots(s)) { const c = covers.get(p); if (c) uploads.push({ slug: s.slug, kind, base64: toBase64(c.bytes) }); }
    const head = route === 'publish' ? heads.publish : (heads.draft ?? heads.publish);
    const result = await api(route, { head, content, covers: uploads });
    if (route === 'publish') heads.publish = result.sha; else heads.draft = result.sha;
    onSaved({ content, covers: new Map([...covers].filter(([p]) => content.series.some(s => coverSlots(s).some(([, q]) => q === p)))) });
    return result;
  }

  save.onclick = async () => {
    save.disabled = true; publish.disabled = true;
    try { const r = await write('commit'); onState({ saved: r }); message(`บันทึกร่าง ${r.sha.slice(0, 7)} ลง ${r.branch} แล้ว — ยังไม่ขึ้นเว็บ กด "เผยแพร่ขึ้นเว็บ" เมื่อพร้อม`); }
    catch (e) { message(e.message); }
    finally { setWrite(canWrite); }
  };

  publish.onclick = async () => {
    if (!ask('เผยแพร่เนื้อหานี้ขึ้นเว็บจริง?\n\nระบบจะ commit เข้า branch เผยแพร่ แล้ว CI ตรวจ → build → ส่งขึ้นเว็บเอง (ประมาณ 2–4 นาที)')) return;
    save.disabled = true; publish.disabled = true;
    try {
      const r = await write('publish');
      onState({ published: r, deploy: { status: 'queued' } });
      message(`เผยแพร่ commit ${r.sha.slice(0, 7)} เข้า ${r.branch} แล้ว — กำลังรอ CI build และส่งขึ้นเว็บ…`);
      watch(r.sha);
    } catch (e) { message(e.message); }
    finally { setWrite(canWrite); }
  };

  /* ตามสถานะ workflow ของ commit ที่เผยแพร่ จนจบหรือครบ 15 นาที */
  function watch(sha, started = Date.now()) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(async () => {
      try {
        const { runs, siteUrl } = await api('status', { sha });
        const run = runs[0];
        if (!run) { onState({ deploy: { status: 'queued' } }); }
        else if (run.status !== 'completed') { onState({ deploy: { status: run.status, url: run.url } }); }
        else {
          onState({ deploy: { status: 'completed', conclusion: run.conclusion, url: run.url, siteUrl } });
          message(run.conclusion === 'success'
            ? `เผยแพร่สำเร็จ — เว็บจะอัปเดตภายในประมาณ 1 นาที${siteUrl ? ` ที่ ${siteUrl}` : ''}`
            : `CI ไม่ผ่าน (${run.conclusion}) — เว็บยังเป็นของเดิม ดูรายละเอียดที่ ${run.url}`);
          return;
        }
        if (Date.now() - started < 15 * 60000) watch(sha, started);
        else message('รอ CI นานเกิน 15 นาที — ตรวจที่แท็บ Actions ของรีโปโดยตรง');
      } catch (e) { if (e.status !== 403) watch(sha, started); }
    }, 12000);
  }
}
