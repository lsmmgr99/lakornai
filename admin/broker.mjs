// broker ของแผงจัดการ — โปรเซสบนเครื่องของคนแก้ข้อมูล (ADR-001 §12.1)
//   · แลก token ด้วย device flow แทนเบราว์เซอร์ (github.com ไม่เปิด CORS ให้จุดแลก token)
//   · token อยู่ในหน่วยความจำของโปรเซสนี้เท่านั้น (B4) · ปิดโปรเซส = session ตาย (B5)
//   · ผูก 127.0.0.1 · ตรวจ Host/Origin · CSRF ต่อ session (B1–B3)
//   · เขียนได้แค่ content.json กับปกตาม allowlist (B7) · ตรวจ magic bytes ของปก (B8)
//
// สองเส้นทางเขียน (คำสั่งลูกค้า 29 ต.ค. 2026 — ดู ADR-001 §14):
//   /api/commit  → branch ร่าง (admin-drafts/…)  เก็บงานค้าง ไม่กระทบเว็บ
//   /api/publish → branch เผยแพร่ (main)          CI ตรวจ → build → ส่งขึ้น GitHub Pages เอง
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { github } from './github.mjs';
import { validate } from './validate.mjs';
import { inspectCover, coverSlots, KINDS, WIDE_W, WIDE_H } from './covers.mjs';
import { resolvePublic, CONTENT_TYPES, CSP } from './static.mjs';
import { imageSize } from '../build/imgsize.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const nonce = () => randomBytes(32).toString('hex');
const fail = (status, message) => { throw Object.assign(Error(message || 'Request rejected'), { status, message }); };
const MAX_BODY = 18_000_000;
const SESSION_IDLE_MS = 300_000, SESSION_MAX_MS = 8 * 3_600_000;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function checkConfig(c) {
  if (c.clientId && !/^[A-Za-z0-9_.-]+$/.test(c.clientId)) throw Error('client id ของ GitHub App ไม่ถูกต้อง');
  if (!/^[-A-Za-z0-9]+$/.test(c.owner || '') || !/^[-A-Za-z0-9_.]+$/.test(c.repo || '')) throw Error('ต้องตั้ง owner/repo ของรีโป');
  if (!/^admin-drafts\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.branch || '')) throw Error('branch ร่างต้องขึ้นต้นด้วย admin-drafts/');
  if (!Array.isArray(c.publishBranches) || !c.publishBranches.length) throw Error('ต้องประกาศ publishBranches');
  if (c.publishBranches.includes(c.branch)) throw Error('branch ร่างต้องไม่ใช่ branch เผยแพร่');
  if (!/^[A-Za-z0-9_.-]+$/.test(c.publishBranch || '') || !c.publishBranches.includes(c.publishBranch)) throw Error('publishBranch ต้องอยู่ใน publishBranches');
  if (c.siteUrl !== undefined && c.siteUrl !== '' && !/^https:\/\/[^\s]+$/.test(c.siteUrl)) throw Error('siteUrl ต้องเป็น https URL');
}

/* ภาพกว้างต้อง 2640×1200 เป๊ะ (V15) — วัดจากหัวไฟล์ด้วยตัวเดียวกับ build เพื่อให้ "แผงเตือน" กับ "CI ตัดสิน" ตรงกัน */
function checkWideDimensions(bytes) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-wide-')), 'w.img');
  try {
    fs.writeFileSync(tmp, bytes);
    const dim = imageSize(tmp);
    if (!dim || dim.w !== WIDE_W || dim.h !== WIDE_H) {
      fail(400, `ภาพกว้างต้องมีขนาด ${WIDE_W}×${WIDE_H} พิกเซลเป๊ะ (ไฟล์ที่ส่งมา${dim ? `เป็น ${dim.w}×${dim.h}` : 'อ่านหัวไฟล์ไม่ออก'})`);
    }
  } finally { fs.rmSync(path.dirname(tmp), { recursive: true, force: true }); }
}

/* ตรวจ body ของ commit/publish แล้วคืน Map พาธ→ไบต์ ที่พร้อม commit · ล้มเป็น 400 พร้อมเหตุผลที่คนอ่านได้
   `fallback` = snapshot ของ branch ร่าง (ตอนเผยแพร่): ปกที่เคยบันทึกไว้ในร่างแต่ยังไม่อยู่บน branch เผยแพร่
   จะถูกดึงไบต์มาติดไปใน commit เดียวกัน — ไม่งั้นเผยแพร่แล้ว V6/V15 ล้มที่ CI ทั้งที่คนกดไม่ได้ทำอะไรผิด */
async function prepareFiles(body, snapshot, { fallback = null, fetchBlob = null } = {}) {
  if (!body || typeof body !== 'object' || Object.keys(body).some(k => !['head', 'content', 'covers'].includes(k))) fail(400, 'รูปแบบคำขอไม่ถูกต้อง');
  if (!Array.isArray(body.covers)) fail(400, 'รูปแบบคำขอไม่ถูกต้อง');
  const basic = validate(body.content);
  if (basic.length) fail(400, 'ข้อมูลยังไม่ผ่านการตรวจ: ' + basic.slice(0, 5).join(' · '));
  if (body.content.meta.viewsSource !== 'none') fail(400, 'ยังไม่มีระบบวัดยอดวิว meta.viewsSource ต้องเป็น none');
  const files = new Map();
  for (const cover of body.covers) {
    if (!cover || typeof cover.base64 !== 'string' || cover.base64.length > 1_400_000 || !BASE64_RE.test(cover.base64)) fail(400, 'ข้อมูลปกไม่ถูกต้อง');
    const kind = cover.kind || 'poster';
    if (!KINDS[kind]) fail(400, 'ชนิดของปกไม่ถูกต้อง');
    const bytes = Buffer.from(cover.base64, 'base64');
    let checked;
    try { checked = inspectCover(bytes, cover.slug, kind); } catch (e) { fail(400, e.message); }
    const field = kind === 'wide' ? 'coverWide' : 'cover';
    if (!body.content.series.some(x => x.slug === cover.slug && x[field] === checked.path)) fail(400, `ปก ${checked.path} ไม่ตรงกับเรื่องใดในร่าง`);
    if (files.has(checked.path)) fail(400, `ส่งปก ${checked.path} ซ้ำ`);
    if (kind === 'wide') checkWideDimensions(bytes);
    files.set(checked.path, bytes);
  }
  const blobs = entries => new Map(entries.filter(e => e.type === 'blob' && e.mode === '100644').map(e => [e.path, e.sha]));
  const existing = blobs(snapshot.entries);
  const spare = fallback ? blobs(fallback.entries) : new Map();
  const full = validate(body.content, { coverExists: p => files.has(p) || existing.has(p) || spare.has(p) });
  if (full.length) fail(400, 'ข้อมูลยังไม่ผ่านการตรวจ: ' + full.slice(0, 5).join(' · '));
  for (const s of body.content.series) {
    for (const [, p] of coverSlots(s)) {
      if (files.has(p) || existing.has(p) || !spare.has(p)) continue;
      if (!fetchBlob) fail(400, `ไม่พบไฟล์ ${p} บน branch เผยแพร่`);
      files.set(p, await fetchBlob(spare.get(p)));
    }
  }
  files.set('content.json', Buffer.from(JSON.stringify(body.content, null, 2) + '\n'));
  return files;
}

export function createBroker(config, { provider, now = Date.now } = {}) {
  checkConfig(config);
  provider ??= github(config);
  const sessions = new Map();
  const expired = s => now() - s.seen > SESSION_IDLE_MS || now() > s.expires;
  const sweep = setInterval(() => { for (const [id, s] of sessions) if (expired(s)) sessions.delete(id); }, 10000);
  sweep.unref();

  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(JSON.stringify(body)); };
    try {
      const host = `127.0.0.1:${server.address().port}`, origin = `http://${host}`;
      if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin)) fail(403);
      const p = req.url;

      /* ---------- ไฟล์ของแผง (GET เท่านั้น · allowlist ตายตัว) ---------- */
      if (!p.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) fail(405);
        if (req.headers['sec-fetch-site'] === 'cross-site') fail(403);
        const name = resolvePublic(new URL(p, origin).pathname);
        if (!name) fail(404);
        let file;
        try { file = await realpath(path.join(root, name)); } catch { fail(404); }
        if (!file.startsWith(root)) fail(404);
        const bytes = await readFile(file);
        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': CSP });
        res.end(req.method === 'HEAD' ? undefined : bytes);
        return;
      }

      /* ---------- API: POST + JSON เสมอ (Origin จึงมาด้วยทุกครั้งในเบราว์เซอร์) ---------- */
      if (req.method !== 'POST' || req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') fail(403);
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size <= MAX_BODY) chunks.push(chunk); }
      if (size > MAX_BODY) fail(413);
      let body; try { body = JSON.parse(Buffer.concat(chunks, size).toString('utf8')); } catch { fail(400); }

      let id = req.headers.cookie?.split(/;\s*/).find(x => x.startsWith('lakorn_session='))?.slice(15), s = sessions.get(id);
      if (s && expired(s)) { sessions.delete(id); s = null; }

      if (p === '/api/session') {
        if (!s) { if (sessions.size >= 32) fail(429); id = nonce(); s = { csrf: nonce(), seen: now(), expires: now() + SESSION_MAX_MS, tabs: new Set() }; sessions.set(id, s); }
        res.setHeader('Set-Cookie', `lakorn_session=${id}; HttpOnly; SameSite=Strict; Path=/`);
        if (s.tabs.size >= 64) fail(429);
        const tab = nonce(); s.tabs.add(tab);
        send(200, { csrf: s.csrf, tab, branch: config.branch, publishBranch: config.publishBranch, siteUrl: config.siteUrl || '', repo: `${config.owner}/${config.repo}`, loginEnabled: !!config.clientId, loggedIn: !!s.token, user: s.user || null });
        return;
      }
      if (!s || req.headers['x-csrf-token'] !== s.csrf) fail(403);
      s.seen = now();
      if (p === '/api/close-tab') { if (!s.tabs.delete(body.tab)) fail(403); if (!s.tabs.size) sessions.delete(id); send(200, {}); return; }
      if (p === '/api/logout') { sessions.delete(id); res.setHeader('Set-Cookie', 'lakorn_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); send(200, {}); return; }
      if (p === '/api/heartbeat') { send(200, {}); return; }
      if (s.busy) fail(409);
      s.busy = true;
      try {
        if (p === '/api/login') {
          if (!config.clientId) fail(400, 'ยังไม่ตั้งค่า clientId ของ GitHub App ใน admin/config.json');
          delete s.token; delete s.device; delete s.user;
          const d = await provider.start();
          if (!d.device_code || !d.user_code || !Number.isFinite(d.expires_in) || !Number.isFinite(d.interval)) fail(502);
          const interval = Math.max(5, d.interval) * 1000;
          s.device = { code: d.device_code, expires: now() + d.expires_in * 1000, interval, next: now() + interval };
          send(200, { userCode: d.user_code, verificationUri: 'https://github.com/login/device', interval });
          return;
        }
        if (p === '/api/poll') {
          const d = s.device; if (!d || now() >= d.expires) { delete s.device; fail(401); }
          if (now() < d.next) { send(200, { pending: true, interval: d.next - now() }); return; }
          d.next = now() + d.interval;
          const result = await provider.poll(d.code);
          if (result.error) {
            if (['authorization_pending', 'slow_down'].includes(result.error)) { if (result.error === 'slow_down') d.interval += 5000; d.next = now() + d.interval; send(200, { pending: true, interval: d.interval }); return; }
            delete s.device; fail(401);
          }
          delete s.device;
          if (!/^gh[uo]_/.test(result.access_token || '')) fail(502);
          s.token = result.access_token; s.expires = Math.min(s.expires, now() + (result.expires_in || 28800) * 1000);
          const canWrite = await provider.permission(s.token);
          s.user = provider.user ? await provider.user(s.token) : null;
          send(200, { canWrite, user: s.user });
          return;
        }
        if (!s.token) fail(401);

        if (p === '/api/load') {
          const publish = await provider.snapshot(s.token, config.publishBranch);
          const draftHead = await provider.branchExists(s.token, config.branch);
          const draft = draftHead && draftHead !== publish.head ? await provider.snapshot(s.token, config.branch) : null;
          send(200, {
            canWrite: await provider.permission(s.token), user: s.user,
            publish: { head: publish.head, content: publish.content, files: publish.files },
            draft: draft ? { head: draft.head, content: draft.content, files: draft.files } : null,
          });
          return;
        }
        if (p === '/api/commit' || p === '/api/publish') {
          if (!await provider.permission(s.token)) fail(403, 'บัญชีนี้ไม่มีสิทธิ์เขียนรีโป');
          const publishing = p === '/api/publish';
          let snapshot, fallback = null;
          if (publishing) {
            snapshot = await provider.snapshot(s.token, config.publishBranch);
            if (body.head !== snapshot.head) fail(409);
            const draftHead = await provider.branchExists(s.token, config.branch);
            if (draftHead && draftHead !== snapshot.head) fallback = await provider.snapshot(s.token, config.branch);
          } else {
            const exists = await provider.branchExists(s.token, config.branch);
            if (exists) {
              snapshot = await provider.snapshot(s.token, config.branch);
              if (body.head !== snapshot.head) fail(409);
            } else {
              /* ยังไม่มี branch ร่าง: แตกจาก branch เผยแพร่ ณ head ที่แผงถืออยู่ */
              const base = await provider.snapshot(s.token, config.publishBranch);
              if (body.head !== base.head) fail(409);
              await provider.createBranch(s.token, config.branch, base.head);
              snapshot = { ...base, branch: config.branch };
            }
          }
          const files = await prepareFiles(body, snapshot, { fallback, fetchBlob: sha => provider.blob(s.token, sha) });
          const who = s.user?.login ? ` โดย ${s.user.login}` : '';
          const message = publishing ? `เผยแพร่เนื้อหาจากแผงจัดการ AiLakorn${who}` : `บันทึกร่างเนื้อหาจากแผงจัดการ AiLakorn${who}`;
          const sha = await provider.commit(s.token, snapshot, files, { message });
          send(200, { sha, branch: snapshot.branch, published: publishing, siteUrl: config.siteUrl || '' });
          return;
        }
        if (p === '/api/status') {
          if (typeof body.sha !== 'string' || !/^[0-9a-f]{40}$/.test(body.sha)) fail(400);
          const runs = await provider.runs(s.token, config.publishBranch, body.sha);
          send(200, { runs, siteUrl: config.siteUrl || '' });
          return;
        }
        fail(404);
      } finally { s.busy = false; }
    } catch (e) {
      const status = e.status || 502;
      const message = e.message && e.status && e.message !== 'Request rejected' ? e.message
        : status === 413 ? 'ร่างและปกมีขนาดรวมเกิน 18 MB กรุณาลดจำนวนปกแล้วลองใหม่'
          : status === 409 ? 'ข้อมูลบน GitHub เปลี่ยนไปหรือคำขอก่อนหน้ายังทำงานอยู่ กรุณาโหลดใหม่'
            : status === 401 ? 'ยังไม่ได้เข้าสู่ระบบ หรือการเข้าสู่ระบบหมดอายุ'
              : e.github ? `GitHub ตอบกลับ ${e.github} — ตรวจสิทธิ์ของ GitHub App และการติดตั้งกับรีโปนี้`
                : 'คำขอไม่สำเร็จ กรุณาตรวจการตั้งค่าหรือเข้าสู่ระบบใหม่';
      send(status, { error: message });
    }
  });
  server.on('close', () => { sessions.clear(); clearInterval(sweep); });
  return server;
}

/* ---------- ตั้งค่า: admin/config.json เป็นหลัก · env ตั้งทับได้ ---------- */
export function loadConfig(env = process.env, file = path.join(root, 'admin/config.json')) {
  let json = {};
  if (fs.existsSync(file)) json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const publishBranch = env.LAKORN_PUBLISH_BRANCH || json.publishBranch || 'main';
  return {
    clientId: env.LAKORN_APP_CLIENT_ID ?? json.clientId ?? '',
    owner: env.LAKORN_REPO_OWNER || json.owner,
    repo: env.LAKORN_REPO_NAME || json.repo,
    branch: env.LAKORN_DRAFT_BRANCH || json.draftBranch || 'admin-drafts/content',
    publishBranch,
    publishBranches: (env.LAKORN_PUBLISH_BRANCHES?.split(',') || json.publishBranches || [publishBranch]).map(x => x.trim()),
    siteUrl: env.LAKORN_SITE_URL || json.siteUrl || '',
    port: Number(env.LAKORN_PORT || json.port || 4190),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  createBroker(config).listen(config.port, '127.0.0.1', () => {
    console.log(`แผงจัดการ AiLakorn: http://127.0.0.1:${config.port}/admin/`);
    console.log(config.clientId
      ? `  เข้าสู่ระบบด้วย GitHub App · ร่าง → ${config.branch} · เผยแพร่ → ${config.publishBranch} ของ ${config.owner}/${config.repo}`
      : '  ยังไม่ตั้ง clientId ใน admin/config.json — ใช้ได้เฉพาะโหมดส่งออกไฟล์ (ดู admin/README.md ขั้นที่ 1)');
  });
}
