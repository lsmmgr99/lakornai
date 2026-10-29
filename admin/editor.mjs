// แผงจัดการเนื้อหา AiLakorn — แก้ content.json ตามสัญญา ADR-001 §6/§13 แล้วส่งต่อให้ broker หรือส่งออกไฟล์
// ตัวตรวจคือ validate.mjs ตัวเดียวกับที่ CI ใช้ (§9.2) — สิ่งที่แผงเตือนคือสิ่งที่ CI จะล้ม
import { connectBroker } from './broker-client.mjs';
import { validate } from './validate.mjs';
import { inspectCover, exportArchive, coverSlots, KINDS, WIDE_W, WIDE_H } from './covers.mjs';

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e[k] = v;
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...children.filter(c => c !== null && c !== undefined));
  return e;
};
const message = text => { $('message').textContent = text; };

/* ---------- สถานะของแผง ---------- */
let data = null;              // content.json ที่กำลังแก้
let selected = 0;             // index ของเรื่องที่เปิดอยู่
const covers = new Map();     // พาธ → {bytes,type,kind} ปกใหม่ที่ยังไม่ได้ commit
const knownFiles = new Set(); // พาธปกที่มีอยู่จริง (ในรีโป/บนดิสก์) ให้ V6/V15 ตรวจได้
let dirty = false;
const DAYS = [['ended', 'จบแล้ว'], ['daily', 'ออกทุกวัน'], ['mon', 'ทุกจันทร์'], ['tue', 'ทุกอังคาร'], ['wed', 'ทุกพุธ'], ['thu', 'ทุกพฤหัสบดี'], ['fri', 'ทุกศุกร์'], ['sat', 'ทุกเสาร์'], ['sun', 'ทุกอาทิตย์']];

/* ---------- แปลผลตรวจเป็นภาษาคน ---------- */
const RULE_TH = {
  V1: 'เวอร์ชันไฟล์ไม่ถูกต้อง (ต้องเป็น 2)', V2: 'รหัสเรื่องซ้ำหรือไม่ถูกต้อง', V3: 'แนว/แท็กไม่อยู่ในรายการ หรือยังไม่เลือกแนวเลย',
  V4: 'ลำดับตอนหรือจำนวนตอนไม่ตรงกัน', V5: 'สถานะกับวันออกตอนไม่สอดคล้องกัน', V6: 'ยังไม่มีไฟล์ปก 2:3 — อัปโหลดปกก่อน',
  V7: 'เรื่องย่อต้องไม่ซ้ำหรือเริ่มด้วยประโยคโปรย', V10: 'ยอดวิวต้องว่าง (ยังไม่มีระบบวัด)', V14: 'ต้องเลือกทิศของวิดีโอ (แนวตั้ง/แนวนอน)',
  V15: 'ภาพกว้างไม่ถูกต้องหรือยังไม่มีไฟล์', V16: 'เรื่องแนวนอนต้องมีภาพกว้าง 2640×1200',
  '1–80 characters': 'ต้องมี 1–80 ตัวอักษร', '1–90 characters; no final period': 'ต้องมี 1–90 ตัวอักษร และห้ามลงท้ายด้วยจุด',
  '80–600 characters': 'ต้องยาว 80–600 ตัวอักษร', 'duration 30–600': 'ความยาวตอนต้องอยู่ระหว่าง 0:30 ถึง 10:00',
  'unknown field': 'มีฟิลด์ที่สัญญาไม่รู้จัก', 'label required': 'ต้องมีชื่อ', 'object required': 'ข้อมูลเสียหาย', 'array required': 'ข้อมูลเสียหาย',
  'ISO timestamp required': 'เวลาไม่ถูกต้อง', 'hex colors': 'สีต้องเป็นรหัส #rrggbb', 'array of names': 'รายชื่อนักแสดงต้องเป็นข้อความ',
};
const FIELD_TH = { title: 'ชื่อเรื่อง', hook: 'ประโยคโปรย', synopsis: 'เรื่องย่อ', genres: 'แนว', tropes: 'แท็ก', eps: 'จำนวนตอน', status: 'สถานะ/วันออกตอน', cover: 'ปก 2:3', coverWide: 'ภาพกว้าง', orientation: 'ทิศของวิดีโอ', views: 'ยอดวิว', cast: 'นักแสดง', theme: 'สีธีม', episodes: 'รายการตอน' };
function humanize(err) {
  const i = err.indexOf(': ');
  const where = err.slice(0, i), rule = err.slice(i + 2);
  const m = where.match(/^series\[(\d+)\](.*)$/);
  let place = where === '$' ? 'ไฟล์' : where, index = null;
  if (m) {
    index = Number(m[1]);
    const s = data?.series[index];
    place = `«${s?.title?.trim() || s?.slug || `เรื่องที่ ${index + 1}`}»`;
    const ep = m[2].match(/^\.episodes(?:\[(\d+)\])?(?:\.(\w+))?/);
    if (ep) place += ep[1] !== undefined ? ` › ตอน ${Number(ep[1]) + 1}${ep[2] ? ' › ' + (FIELD_TH[ep[2]] || ep[2]) : ''}` : ' › รายการตอน';
    else { const f = m[2].match(/^\.(\w+)/); if (f) place += ' › ' + (FIELD_TH[f[1]] || f[1]); }
  }
  return { index, text: `${place}: ${RULE_TH[rule] || rule}` };
}
const coverExists = p => covers.has(p) || knownFiles.has(p);
const problems = () => (data ? validate(data, { coverExists }) : ['$: ยังไม่ได้โหลดข้อมูล']);

function renderProblems() {
  const errors = problems();
  const box = $('problems'), list = box.querySelector('ul');
  list.replaceChildren();
  for (const e of errors.slice(0, 60)) {
    const h = humanize(e);
    const li = el('li', { text: h.text });
    if (h.index !== null && h.index !== selected) li.append(el('button', { text: 'ไปที่เรื่องนี้', onclick: () => { selected = h.index; render(); } }));
    list.append(li);
  }
  if (errors.length > 60) list.append(el('li', { class: 'muted', text: `…และอีก ${errors.length - 60} ข้อ` }));
  box.hidden = !errors.length;
  for (const b of $('series').querySelectorAll('button')) b.classList.toggle('err', errors.some(e => e.startsWith(`series[${b.dataset.index}]`)));
  return errors;
}
const touch = () => { dirty = true; renderProblems(); };

/* ---------- รายการเรื่องด้านซ้าย ---------- */
function renderList() {
  const nav = $('series'); nav.replaceChildren();
  const q = $('filter').value.trim().toLowerCase();
  data.series.forEach((s, i) => {
    if (q && !`${s.title} ${s.slug}`.toLowerCase().includes(q)) return;
    const b = el('button', { type: 'button', class: i === selected ? 'on' : '', 'data-index': i, onclick: () => { selected = i; render(); } },
      el('span', { text: s.title || s.slug }),
      el('span', { class: 'meta', text: `${s.episodes.length} ตอน · ${s.status === 'ended' ? 'จบ' : 'ออกอยู่'}` }));
    nav.append(b);
  });
}

/* ---------- ฟอร์มของเรื่องที่เลือก ---------- */
function textField(label, value, onChange, { multiline = false, max, min = 0, hint } = {}) {
  const input = el(multiline ? 'textarea' : 'input', { maxlength: max ? max + 20 : undefined });
  input.value = value ?? '';
  const counter = el('div', { class: 'counter' });
  const update = () => { if (!max) return; const n = [...input.value].length; counter.textContent = `${n}/${max}${min ? ` (ต่ำสุด ${min})` : ''}`; counter.classList.toggle('bad', n > max || n < min); };
  input.oninput = () => { onChange(input.value); update(); touch(); };
  update();
  return el('label', {}, el('span', { class: 'lbl', text: label + (hint ? ` — ${hint}` : '') }), input, max ? counter : null);
}
const mmss = sec => Number.isInteger(sec) && sec >= 0 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '';
const parseMmss = v => { const m = v.trim().match(/^(\d{1,2}):([0-5]\d)$/); return m ? Number(m[1]) * 60 + Number(m[2]) : (/^\d+$/.test(v.trim()) ? Number(v.trim()) : -1); };

function coverBox(s, kind) {
  const field = kind === 'wide' ? 'coverWide' : 'cover';
  const spec = KINDS[kind];
  const p = s[field];
  const frame = el('div', { class: `frame ${kind}` });
  const pending = covers.get(p);
  if (pending) frame.append(el('img', { src: URL.createObjectURL(new Blob([pending.bytes], { type: pending.type })), alt: '' }));
  else if (p && knownFiles.has(p)) frame.append(el('img', { src: '/' + p, alt: '' }));
  else frame.append(el('div', { class: 'none', text: kind === 'wide' ? 'ยังไม่มีภาพกว้าง (เรื่องแนวตั้งไม่บังคับ)' : 'ยังไม่มีไฟล์ปก' }));
  const upload = el('input', { type: 'file', id: kind === 'wide' ? 'wide-upload' : 'cover-upload', accept: 'image/png,image/jpeg,image/webp' });
  upload.onchange = async () => {
    try {
      const file = upload.files[0]; if (!file) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const checked = inspectCover(bytes, s.slug, kind);
      const bitmap = await createImageBitmap(new Blob([bytes], { type: checked.type }));
      const { width, height } = bitmap; bitmap.close();
      if (kind === 'wide' && (width !== WIDE_W || height !== WIDE_H)) throw Error(`ภาพกว้างต้องมีขนาด ${WIDE_W}×${WIDE_H} พิกเซลเป๊ะ (ไฟล์นี้ ${width}×${height})`);
      if (kind === 'poster' && Math.abs(width / height - 2 / 3) > 0.02) message(`คำเตือน: ปกนี้สัดส่วน ${width}×${height} ไม่ใช่ 2:3 จะถูกครอปเมื่อแสดง`);
      else message(`เก็บ${spec.label}ในร่างแล้ว — กด "บันทึกร่าง" / "เผยแพร่" หรือ "ส่งออกพร้อมปก" เพื่อนำไฟล์ออกไป`);
      if (s[field] && s[field] !== checked.path) covers.delete(s[field]);
      covers.set(checked.path, { bytes, type: checked.type, kind });
      s[field] = checked.path;
      touch(); render();
    } catch (e) { message(e.message); }
  };
  const box = el('div', { class: 'cover' },
    el('strong', { text: spec.label }),
    el('div', { class: 'muted', text: kind === 'wide' ? `ขนาด ${WIDE_W}×${WIDE_H} · ไม่เกิน 300 KB · ใช้กับฮีโร่/การ์ดทรงกว้าง` : 'สัดส่วน 2:3 · ไม่เกิน 1 MB · PNG/JPEG/WebP' }),
    frame,
    el('div', { class: 'path', text: p || '—' }),
    pending ? el('div', { class: 'pending', text: 'มีไฟล์ใหม่ในร่าง ยังไม่ได้บันทึก' }) : null,
    el('label', { class: 'btn', text: pending || p ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์' }, upload));
  if (kind === 'wide' && p) box.append(el('button', { type: 'button', text: 'เอาภาพกว้างออก', onclick: () => { covers.delete(p); delete s.coverWide; touch(); render(); } }));
  return box;
}

function renderEditor() {
  const root = $('editor'); root.replaceChildren();
  const s = data.series[selected];
  if (!s) { root.append(el('p', { class: 'muted', text: 'ยังไม่มีเรื่อง — กด "เพิ่มเรื่องใหม่"' })); return; }

  root.append(el('h2', { text: s.title || s.slug }), el('div', { class: 'muted', text: `รหัสเรื่อง: ${s.slug} · URL /series/${s.slug}/` }));

  root.append(el('h3', { text: 'ข้อมูลเรื่อง' }));
  root.append(textField('ชื่อเรื่อง', s.title, v => s.title = v, { max: 80, min: 1 }));
  root.append(textField('ประโยคโปรย', s.hook, v => s.hook = v, { max: 90, min: 1, hint: 'ห้ามลงท้ายด้วยจุด' }));
  root.append(textField('เรื่องย่อ', s.synopsis, v => s.synopsis = v, { multiline: true, max: 600, min: 80, hint: 'ต้องไม่ซ้ำกับประโยคโปรย' }));

  const grid = el('div', { class: 'grid2' });
  const orient = el('fieldset', {}, el('legend', { text: 'ทิศของวิดีโอ (บังคับ)' }));
  for (const [v, l] of [['vertical', 'แนวตั้ง 9:16'], ['horizontal', 'แนวนอน 16:9 (ต้องมีภาพกว้าง)']]) {
    const r = el('input', { type: 'radio', name: 'orientation', value: v });
    r.checked = s.orientation === v;
    r.onchange = () => { s.orientation = v; touch(); render(); };
    orient.append(el('label', { class: 'inline' }, r, document.createTextNode(l)));
  }
  grid.append(orient);
  const sched = el('select');
  for (const [v, l] of DAYS) sched.append(el('option', { value: v, text: l }));
  sched.value = s.status === 'ended' ? 'ended' : (s.releaseDay || 'daily');
  sched.onchange = () => { s.status = sched.value === 'ended' ? 'ended' : 'ongoing'; s.releaseDay = s.status === 'ended' ? null : sched.value; touch(); renderList(); };
  grid.append(el('label', {}, el('span', { class: 'lbl', text: 'สถานะ / วันออกตอน' }), sched));
  root.append(grid);

  for (const [k, label] of [['genres', 'แนว (เลือกอย่างน้อย 1)'], ['tropes', 'แท็ก']]) {
    const group = el('fieldset', {}, el('legend', { text: label }));
    for (const item of data[k]) {
      const c = el('input', { type: 'checkbox' }); c.checked = s[k].includes(item.slug);
      c.onchange = () => { s[k] = c.checked ? [...s[k], item.slug] : s[k].filter(x => x !== item.slug); touch(); };
      group.append(el('label', { class: 'inline' }, c, document.createTextNode(item.label)));
    }
    root.append(group);
  }

  const extra = el('div', { class: 'grid2' });
  extra.append(textField('นักแสดง/ตัวละคร (คั่นด้วยจุลภาค)', (s.cast || []).join(', '), v => { const list = v.split(',').map(x => x.trim()).filter(Boolean); if (list.length) s.cast = list; else delete s.cast; }));
  const theme = el('div', {}, el('span', { class: 'lbl', text: 'สีธีมของเรื่อง' }));
  for (const k of ['c1', 'c2']) {
    const c = el('input', { type: 'color' }); c.value = s.theme?.[k] || (k === 'c1' ? '#2a2140' : '#7a5a2c');
    c.oninput = () => { s.theme ??= { c1: '#2a2140', c2: '#7a5a2c' }; s.theme[k] = c.value.toLowerCase(); touch(); };
    theme.append(c, document.createTextNode(' '));
  }
  extra.append(el('label', {}, theme));
  root.append(extra);

  root.append(el('h3', { text: 'ปก' }));
  root.append(el('div', { class: 'covers' }, coverBox(s, 'poster'), coverBox(s, 'wide')));

  root.append(el('h3', { text: `ตอน (${s.episodes.length})` }));
  const counts = new Map();
  for (const series of data.series) for (const e of series.episodes) counts.set(e.title, (counts.get(e.title) || 0) + 1);
  const table = el('table', {}, el('tr', {}, ...['ตอน', 'ชื่อตอน', 'ความยาว (น:วว)', 'ชื่อซ้ำทั้งคลัง', ''].map(t => el('th', { text: t }))));
  const renumber = () => { s.episodes.forEach((e, i) => e.n = i + 1); s.eps = s.episodes.length; };
  s.episodes.forEach((e, i) => {
    const title = el('input', { 'aria-label': `ชื่อตอน ${e.n}` }); title.value = e.title;
    title.oninput = () => { e.title = title.value; touch(); };
    const dur = el('input', { 'aria-label': `ความยาวตอน ${e.n}`, placeholder: '2:30' }); dur.value = mmss(e.durationSec);
    dur.oninput = () => { e.durationSec = parseMmss(dur.value); row.classList.toggle('bad', !(e.durationSec >= 30 && e.durationSec <= 600)); touch(); };
    const n = counts.get(e.title);
    const row = el('tr', { class: e.durationSec >= 30 && e.durationSec <= 600 ? '' : 'bad' },
      el('td', { class: 'n', text: String(e.n) }), el('td', {}, title), el('td', { class: 'dur' }, dur),
      el('td', { class: 'dup' + (n > 1 ? ' duplicate' : ''), text: n > 1 ? `ซ้ำ ${n} ครั้ง` : 'ไม่ซ้ำ' }),
      el('td', { class: 'act' },
        el('button', { type: 'button', title: 'เลื่อนขึ้น', text: '↑', disabled: i === 0, onclick: () => { [s.episodes[i - 1], s.episodes[i]] = [s.episodes[i], s.episodes[i - 1]]; renumber(); touch(); render(); } }),
        el('button', { type: 'button', title: 'เลื่อนลง', text: '↓', disabled: i === s.episodes.length - 1, onclick: () => { [s.episodes[i + 1], s.episodes[i]] = [s.episodes[i], s.episodes[i + 1]]; renumber(); touch(); render(); } }),
        el('button', { type: 'button', class: 'danger', title: 'ลบตอน', text: '✕', disabled: s.episodes.length === 1, onclick: () => { s.episodes.splice(i, 1); renumber(); touch(); render(); } })));
    table.append(row);
  });
  root.append(table);
  root.append(el('div', { class: 'ep-tools' },
    el('button', { type: 'button', text: '+ เพิ่มตอน', onclick: () => { s.episodes.push({ n: s.episodes.length + 1, title: `ตอนที่ ${s.episodes.length + 1}`, durationSec: 120 }); renumber(); touch(); render(); } }),
    el('button', { type: 'button', text: 'ตรวจชื่อซ้ำอีกครั้ง', onclick: render })));

  root.append(el('div', { class: 'danger-zone' },
    el('button', { type: 'button', class: 'danger', text: 'ลบเรื่องนี้ออกจากคลัง', onclick: () => {
      if (!confirm(`ลบเรื่อง «${s.title}» ทั้ง ${s.episodes.length} ตอนออกจากร่าง?\n(มีผลเมื่อบันทึก/เผยแพร่ · หน้าเรื่องและหน้าตอนบนเว็บจะหายไป)`)) return;
      for (const [, p] of coverSlots(s)) covers.delete(p);
      data.series.splice(selected, 1); selected = Math.max(0, selected - 1); touch(); render();
    } })));
}

function render() {
  if (!data) return;
  renderList(); renderEditor(); renderProblems();
}

/* ---------- โหลดข้อมูล ---------- */
async function probeFiles(content) {
  /* โหมดไฟล์/ออฟไลน์: ถามเซิร์ฟเวอร์ว่าไฟล์ปกมีจริงไหม (HEAD) · โหมด GitHub ใช้รายการจาก snapshot แทน */
  await Promise.all(content.series.flatMap(s => coverSlots(s).map(async ([, p]) => {
    try { if ((await fetch('/' + p, { method: 'HEAD' })).ok) knownFiles.add(p); } catch { /* ไม่มี */ }
  })));
}
function adopt(content, { files } = {}) {
  const errors = validate(content);
  if (errors.filter(e => !/: V6$|: V15$/.test(e)).length) throw Error('ไฟล์นี้ไม่ตรงสัญญาข้อมูล:\n' + errors.slice(0, 8).join('\n'));
  data = content; covers.clear(); selected = 0; dirty = false;
  if (files) { knownFiles.clear(); for (const f of files) knownFiles.add(f); }
  render();
}

$('filter').oninput = renderList;
$('add').onclick = () => { $('new-series').hidden = false; $('new-series').querySelector('[name=slug]').focus(); };
$('new-cancel').onclick = () => { $('new-series').hidden = true; $('new-series').reset(); };
$('new-series').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const slug = f.get('slug').trim(), title = f.get('title').trim(), orientation = f.get('orientation');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || data.series.some(s => s.slug === slug)) { message('รหัสเรื่องไม่ถูกต้องหรือซ้ำกับที่มีอยู่'); return; }
  if (!orientation) { message('ต้องเลือกทิศของวิดีโอ'); return; }
  data.series.push({ slug, title, hook: '', synopsis: '', genres: [], tropes: [], eps: 1, status: 'ongoing', releaseDay: 'daily', cover: `assets/covers/${slug}.webp`, orientation, views: null, theme: { c1: '#2a2140', c2: '#7a5a2c' }, episodes: [{ n: 1, title: 'ตอนที่ 1', durationSec: 120 }] });
  selected = data.series.length - 1; e.target.reset(); e.target.hidden = true; touch(); render();
  message(`สร้างเรื่อง ${slug} แล้ว — กรอกประโยคโปรย เรื่องย่อ เลือกแนว และอัปโหลดปกให้ครบก่อนบันทึก`);
};
$('import').onchange = async e => {
  try {
    const candidate = JSON.parse(await e.target.files[0].text());
    if (covers.size && !confirm('เปิดร่างใหม่และล้างปกที่ยังไม่ได้ส่งออก?')) return;
    adopt(candidate); await probeFiles(candidate); render(); message('เปิดร่างแล้ว');
  } catch (err) { message(err.message); } finally { e.target.value = ''; }
};
$('check').onclick = () => { const errors = renderProblems(); message(errors.length ? `พบ ${errors.length} จุดที่ต้องแก้ (ดูรายการด้านล่าง)` : 'ผ่านการตรวจทุกข้อ ✓ พร้อมบันทึก/เผยแพร่'); };

async function exportDraft(bundle = false) {
  if (!data) return;
  data.generatedAt = new Date().toISOString();
  const errors = renderProblems();
  if (errors.length) { message(`ยังส่งออกไม่ได้ — พบ ${errors.length} จุดที่ต้องแก้`); return; }
  if (!bundle && data.series.some(s => coverSlots(s).some(([, p]) => covers.has(p)))) { message('มีปกใหม่ในร่าง กรุณาใช้ "ส่งออกพร้อมปก (.tar)" เพื่อให้ไฟล์ปกไปด้วย'); return; }
  const blob = bundle ? exportArchive(data, covers) : new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: bundle ? 'lakorn-content.tar' : 'content.json' }); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message('ส่งออกร่างแล้ว — ไฟล์นี้ยังไม่ได้บันทึกเข้ารีโป ผู้มีสิทธิ์ต้อง commit เอง (หรือใช้ปุ่มบันทึก/เผยแพร่เมื่อเข้าสู่ระบบแล้ว)');
}
$('export').onclick = () => exportDraft();
$('export-bundle').onclick = () => exportDraft(true);
window.addEventListener('beforeunload', e => { if (covers.size || dirty) { e.preventDefault(); e.returnValue = ''; } });

try {
  const response = await fetch('/content.json');
  if (!response.ok) throw Error('โหลด content.json ไม่สำเร็จ');
  const content = await response.json();
  await probeFiles(content);
  adopt(content);
} catch (e) { message(e.message); }

/* ---------- เชื่อมกับ broker ---------- */
const conn = $('conn'), status = $('status');
connectBroker({
  getDraft: () => { const errors = renderProblems(); if (errors.length) throw Error(`ยังบันทึกไม่ได้ — พบ ${errors.length} จุดที่ต้องแก้ (ดูรายการด้านล่าง)`); return { content: data, covers }; },
  loadDraft: (remote, extra) => { adopt(remote, extra); },
  onSaved: ({ content, covers: saved }) => {
    for (const [p, c] of saved) { knownFiles.add(p); if (covers.get(p) === c) covers.delete(p); }
    dirty = JSON.stringify(content) !== JSON.stringify({ ...data, generatedAt: content.generatedAt });
    render();
  },
  onState: st => {
    if (st.mode === 'offline') { conn.textContent = 'โหมดไฟล์ (ไม่มี broker)'; conn.className = 'pill off'; }
    if (st.mode === 'connected') { conn.textContent = st.info?.loginEnabled === false ? 'broker พร้อม · ยังไม่ตั้ง GitHub App' : 'broker พร้อม · ยังไม่เข้าสู่ระบบ'; conn.className = 'pill'; $('user').textContent = ''; }
    if (st.mode === 'authed') { conn.textContent = st.canWrite ? 'เชื่อม GitHub แล้ว · เขียนได้' : 'เชื่อม GitHub แล้ว · อ่านอย่างเดียว'; conn.className = 'pill on'; $('user').textContent = st.user ? `@${st.user.login}` : ''; }
    if (st.mode === 'expired') { conn.textContent = 'หมดเวลา — โหลดหน้าใหม่'; conn.className = 'pill off'; }
    if ('device' in st) { $('device').hidden = !st.device; if (st.device) $('device-code').textContent = st.device.code; }
    if (st.saved) { dirty = false; }
    if (st.deploy) {
      const d = st.deploy;
      status.className = 'status ' + (d.status === 'completed' ? (d.conclusion === 'success' ? 'ok' : 'bad') : 'busy');
      status.textContent = d.status === 'queued' ? 'รอ CI เริ่มทำงาน…' : d.status === 'in_progress' ? 'CI กำลังตรวจและ build…' : d.status === 'completed' ? (d.conclusion === 'success' ? 'ขึ้นเว็บแล้ว ✓' : 'CI ล้ม — เว็บยังเป็นของเดิม') : d.status;
      if (d.status === 'completed') { dirty = false; }
    }
  },
  message,
});
