// ชั้นคุยกับ GitHub — token อยู่ในหน่วยความจำของผู้เรียก (broker) เท่านั้น ไม่เคยถูกเขียนลงดิสก์หรือ log
// พาธที่เขียนได้มีสามรูปแบบตายตัว (ADR-001 §12.1 B7 + §13.8): content.json · ปก 2:3 · ภาพกว้าง
export const WRITABLE_PATHS = [
  /^content\.json$/,
  /^assets\/covers\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpg|webp)$/,
  /^assets\/covers-wide\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpg|webp)$/,
];
export const isWritablePath = (p) => WRITABLE_PATHS.some(re => re.test(p));
const COVER_TREE_RE = /^assets\/covers(?:-wide)?\/[^/]+$/;

export function github(config, fetcher = fetch) {
  const repo = `/repos/${config.owner}/${config.repo}`;
  async function request(url, token, method = 'GET', body, { allow = [] } = {}) {
    const r = await fetcher(url, {
      method, redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      if (allow.includes(r.status)) return null;
      throw Object.assign(Error(`GitHub request failed (${r.status})`), { github: r.status });
    }
    return r.json();
  }
  const api = (token, p, method, body, opts) => request('https://api.github.com' + p, token, method, body, opts);
  const encodeBranch = b => b.split('/').map(encodeURIComponent).join('/');

  return {
    start: () => request('https://github.com/login/device/code', null, 'POST', { client_id: config.clientId, scope: '' }),
    poll: code => request('https://github.com/login/oauth/access_token', null, 'POST',
      { client_id: config.clientId, device_code: code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),

    /* ใครล็อกอินอยู่ — ใช้แสดงในแผงและเป็นร่องรอยว่า commit มาจากตัวจริงคนไหน */
    async user(token) {
      const u = await api(token, '/user');
      return { login: u.login, name: u.name || u.login };
    },

    /* B6: ปุ่มบันทึก/เผยแพร่เปิดได้ก็ต่อเมื่อบัญชีนั้นมีสิทธิ์ push จริง */
    async permission(token) {
      const r = await api(token, repo);
      if (r.default_branch === config.branch) throw Error('Draft target is the default branch');
      return r.permissions?.push === true;
    },

    async branchExists(token, branch) {
      const ref = await api(token, `${repo}/git/ref/heads/${encodeBranch(branch)}`, 'GET', undefined, { allow: [404] });
      return ref ? ref.object.sha : null;
    },

    /* ภาพรวมของ branch หนึ่ง ณ ขณะอ่าน — head/tree ใช้เป็นฐานของ commit ถัดไป (กัน lost update)
       files = พาธปกที่มีอยู่จริงใน branch นั้น ให้แผงตรวจ V6/V15 ได้โดยไม่ต้องมีไฟล์ในเครื่อง */
    async snapshot(token, branch = config.branch) {
      const ref = await api(token, `${repo}/git/ref/heads/${encodeBranch(branch)}`);
      const commit = await api(token, `${repo}/git/commits/${ref.object.sha}`);
      const tree = await api(token, `${repo}/git/trees/${commit.tree.sha}?recursive=1`);
      if (tree.truncated) throw Error('Tree too large');
      const file = await api(token, `${repo}/contents/content.json?ref=${ref.object.sha}`);
      const entries = tree.tree;
      return {
        branch, head: ref.object.sha, tree: commit.tree.sha, entries,
        files: entries.filter(e => e.type === 'blob' && COVER_TREE_RE.test(e.path)).map(e => e.path),
        content: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')),
      };
    },

    /* ไบต์ของไฟล์หนึ่งใน branch (ใช้ย้ายปกจาก branch ร่างไป branch เผยแพร่ตอนกดเผยแพร่) */
    async blob(token, sha) {
      const b = await api(token, `${repo}/git/blobs/${sha}`);
      if (b.encoding !== 'base64') throw Error('Unexpected blob encoding');
      return Buffer.from(b.content, 'base64');
    },

    async createBranch(token, branch, sha) {
      await api(token, `${repo}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha });
      return sha;
    },

    /* commit หนึ่งก้อนบน branch ของ snapshot · force:false — ถ้าใครเขียนแทรก GitHub จะปฏิเสธ ไม่ทับ */
    async commit(token, snapshot, files, { message = 'Update AiLakorn content' } = {}) {
      const tree = [];
      for (const [path, bytes] of files) {
        if (!isWritablePath(path)) throw Error('Invalid path');
        const blob = await api(token, `${repo}/git/blobs`, 'POST', { encoding: 'base64', content: Buffer.from(bytes).toString('base64') });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const next = await api(token, `${repo}/git/trees`, 'POST', { base_tree: snapshot.tree, tree });
      const commit = await api(token, `${repo}/git/commits`, 'POST', { message, tree: next.sha, parents: [snapshot.head] });
      await api(token, `${repo}/git/refs/heads/${encodeBranch(snapshot.branch || config.branch)}`, 'PATCH', { sha: commit.sha, force: false });
      return commit.sha;
    },

    /* สถานะ workflow ของ commit ที่เผยแพร่ — แผงใช้บอกว่า "กำลัง build / ขึ้นเว็บแล้ว / ล้ม" */
    async runs(token, branch, sha) {
      const r = await api(token, `${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`);
      return (r.workflow_runs || []).filter(w => !sha || w.head_sha === sha)
        .map(w => ({ name: w.name, status: w.status, conclusion: w.conclusion, url: w.html_url, sha: w.head_sha, updatedAt: w.updated_at }));
    },
  };
}
