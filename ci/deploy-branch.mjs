/* ส่งชุดไฟล์ที่ผ่านด่านครบแล้วขึ้น branch ที่ GitHub Pages ใช้เสิร์ฟ — ขั้นสุดท้ายของเส้นทางเผยแพร่
   เจ้าของ: DevOps · เปิดใช้ตามคำสั่งลูกค้า 29 ต.ค. 2026 (ADR-001 §14) — ก่อนหน้านี้ CI จบที่ artifact

   รัน (ใน CI หลัง download-artifact):   node ci/deploy-branch.mjs _artifact
   ซ้อมในเครื่องโดยไม่ push:              node ci/deploy-branch.mjs _artifact --dry-run

   env ที่อ่าน
     GITHUB_REPOSITORY  owner/repo (CI ตั้งให้)          GITHUB_TOKEN  token ของ workflow (สิทธิ์ contents: write เฉพาะ job นี้)
     GITHUB_SHA         commit ต้นทาง ใช้ในข้อความ commit  PAGES_BRANCH  branch ปลายทาง (ค่าตั้งต้น ci/publish-branches.json → pagesBranch)
     PAGES_CNAME        ถ้าตั้ง = เขียนไฟล์ CNAME ให้ GitHub Pages ผูกโดเมนนั้น · ไม่ตั้ง = ไม่เขียน (เว็บอยู่ที่ *.github.io ต่อไป)
     DEPLOY_REMOTE      ทับ URL ของ remote (เทสต์ใช้ชี้ bare repo ในเครื่อง · ไม่ต้องมี token)

   สิ่งที่สคริปต์นี้ "ไม่" ทำ: ไม่ build · ไม่ข้ามด่าน (ตรวจชุดไฟล์ซ้ำด้วย publish-gate ก่อน push ทุกครั้ง)
   · ไม่แตะ branch ที่เป็นต้นทาง (main) หรือ branch ร่างของ broker · ไม่ตั้ง DNS · ไม่ปริ้นต์ token */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { allFiles, auditFileSet } from './publish-gate.mjs';
import { REQUIRED_IN_ARTIFACT } from './site-files.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const BRANCHES = JSON.parse(fs.readFileSync(path.join(here, 'publish-branches.json'), 'utf8'));

/* ชื่อโดเมนสำหรับไฟล์ CNAME — รับทั้ง "ailakorn.com" และ "https://ailakorn.com/" แล้วคืนเฉพาะ host
   ปฏิเสธ *.github.io เพราะนั่นคือที่อยู่ตั้งต้นของ Pages อยู่แล้ว ใส่เป็น CNAME จะทำให้วนลูป */
export function cnameFor(value) {
  if (value == null || !String(value).trim()) return null;
  const host = String(value).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '');
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) throw new Error(`PAGES_CNAME ไม่ใช่ชื่อโดเมนที่ใช้ได้: ${JSON.stringify(value)}`);
  if (host.endsWith('.github.io')) throw new Error('PAGES_CNAME ต้องเป็นโดเมนของเราเอง ไม่ใช่ *.github.io');
  return host;
}

/* branch ปลายทางต้องเป็น branch ของ Pages เท่านั้น — ห้ามเป็น main (ต้นทาง) หรือ branch ร่าง */
export function checkTargetBranch(branch) {
  if (!/^[A-Za-z0-9_.\/-]+$/.test(branch) || branch.includes('..')) throw new Error(`ชื่อ branch ไม่ถูกต้อง: ${branch}`);
  if (BRANCHES.publish.includes(branch)) throw new Error(`ห้ามส่งชุดไฟล์ทับ branch ต้นทาง "${branch}" — มันคือที่เก็บ content.json และโค้ด`);
  if (branch.startsWith(BRANCHES.brokerDraftPrefix)) throw new Error(`ห้ามใช้ branch ร่างของ broker (${BRANCHES.brokerDraftPrefix}*) เป็นปลายทาง Pages`);
  if (branch !== BRANCHES.pagesBranch) throw new Error(`branch ปลายทางต้องเป็น "${BRANCHES.pagesBranch}" ตาม ci/publish-branches.json (ได้ "${branch}")`);
  return branch;
}

/* ตรวจชุดไฟล์ซ้ำ (ไม่เชื่อว่าขั้นก่อนหน้าทำแล้ว) แล้วเติม CNAME ถ้าสั่ง · คืนสรุป */
export function prepareSite(dir, { cname = null } = {}) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`ไม่พบโฟลเดอร์ชุดไฟล์ ${dir}`);
  const { files, links } = allFiles(dir);
  const { errors } = auditFileSet(files.filter(f => f !== 'CNAME'), { links, required: REQUIRED_IN_ARTIFACT });
  if (errors.length) throw new Error(`ชุดไฟล์ไม่ผ่านด่านก่อนส่งขึ้น ${errors.length} ข้อ\n  - ` + errors.slice(0, 20).join('\n  - '));
  const cnamePath = path.join(dir, 'CNAME');
  if (cname) fs.writeFileSync(cnamePath, cname + '\n');
  else if (fs.existsSync(cnamePath)) fs.rmSync(cnamePath);
  return { files: cname ? [...files.filter(f => f !== 'CNAME'), 'CNAME'] : files.filter(f => f !== 'CNAME'), cname };
}

/* commit เดียวแบบไม่มีประวัติ (orphan) แล้ว force-push — branch นี้เป็น "ผลผลิต" ไม่ใช่ที่เก็บงาน
   ประวัติที่มีค่าอยู่ที่ main (content.json + build) ซึ่ง artifact ทุกชุด reproduce ได้จากตรงนั้น */
export function pushSite(dir, { remote, branch, message, token = null, dryRun = false }) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lakorn-deploy-'));
  try {
    fs.cpSync(dir, work, { recursive: true });
    const git = (args, extraEnv = {}) => execFileSync('git', args, {
      cwd: work, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'ailakorn-ci', GIT_AUTHOR_EMAIL: 'ci@users.noreply.github.com', GIT_COMMITTER_NAME: 'ailakorn-ci', GIT_COMMITTER_EMAIL: 'ci@users.noreply.github.com', ...extraEnv },
    }).toString();
    git(['init', '-q', '-b', branch]);
    git(['add', '-A']);
    git(['commit', '-q', '-m', message]);
    const sha = git(['rev-parse', 'HEAD']).trim();
    if (dryRun) return { sha, pushed: false };
    /* token ผ่าน env ของ git (ไม่อยู่ใน argv) — ถ้า push ล้ม ข้อความ error จึงไม่มี token ติดมา */
    const auth = token ? {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
    } : {};
    try {
      git(['push', '--force', '-q', remote, `HEAD:refs/heads/${branch}`], auth);
    } catch (e) {
      const text = `${e.stderr || ''}${e.stdout || ''}`.replace(/x-access-token:[^@\s]+@/g, 'x-access-token:***@');
      throw new Error(`git push ไป ${branch} ล้ม: ${text.trim().split('\n').slice(-3).join(' | ') || e.message.split('\n')[0]}`);
    }
    return { sha, pushed: true };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

/* ---------- CLI ---------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const dir = path.resolve(argv.find(a => !a.startsWith('--')) || '_artifact');
  const env = process.env;
  try {
    const branch = checkTargetBranch(env.PAGES_BRANCH || BRANCHES.pagesBranch);
    const cname = cnameFor(env.PAGES_CNAME);
    const repo = env.GITHUB_REPOSITORY || '';
    const remote = env.DEPLOY_REMOTE || (repo && `https://github.com/${repo}.git`);
    if (!dryRun && !remote) throw new Error('ต้องมี GITHUB_REPOSITORY (หรือ DEPLOY_REMOTE) เพื่อรู้ว่าจะ push ไปไหน');
    if (!dryRun && !env.DEPLOY_REMOTE && !env.GITHUB_TOKEN) throw new Error('ต้องมี GITHUB_TOKEN สำหรับ push ไป GitHub');
    const { files } = prepareSite(dir, { cname });
    const source = (env.GITHUB_SHA || 'local').slice(0, 7);
    const message = `publish ${source} → ${branch} (${new Date().toISOString()})${cname ? ` · CNAME ${cname}` : ''}`;
    console.log(`ชุดไฟล์ ${dir}: ${files.length} ไฟล์ · CNAME ${cname || '— (ไม่ตั้ง ใช้ที่อยู่ *.github.io)'}`);
    const r = pushSite(dir, { remote, branch, message, token: env.GITHUB_TOKEN || null, dryRun });
    if (r.pushed) console.log(`✓ ส่งขึ้น ${branch} แล้ว (${r.sha.slice(0, 7)}) — GitHub Pages จะ build และเสิร์ฟภายในราว 1 นาที`);
    else console.log(`✓ dry-run: commit ${r.sha.slice(0, 7)} พร้อม push ไป ${branch} (ไม่ได้ push)`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
