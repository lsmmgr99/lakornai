/* ทดสอบด่าน V12–V13 · รัน: node --test ci/*.test.mjs
   เหตุที่ต้องมีชุดนี้: ด่านที่จับผิดเกินจริงจะถูกปิดทิ้งในอาทิตย์เดียว
   §12.3 ระบุชัดว่าอะไร "ไม่ได้ห้าม" — ข้อทดสอบครึ่งหลังคือการล็อกข้อยกเว้นพวกนั้นไว้ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanHtml } from './views-gate.mjs';

const scan = (body, viewsSource = 'none') =>
  scanHtml({ file: 't.html', viewsSource, html: `<!doctype html><html><head><title>หน้าทดสอบ</title></head><body>${body}</body></html>` });
const rules = (findings) => findings.map(f => f.rule).sort();

test('V12(ก) จับตัวเลขยอดวิวที่ฝังมาใน HTML', () => {
  assert.deepEqual(rules(scan('<span class="m">12.4M วิว · 60 ตอน</span>')), ['V12(ก)']);
  assert.deepEqual(rules(scan('<p>8.9 ล้าน วิว</p>')), ['V12(ก)']);
  assert.deepEqual(rules(scan('<p>1,204 views</p>')), ['V12(ก)']);
});

test('V12(ข) จับป้าย "วิว" กำพร้าที่เกิดจาก views: null', () => {
  const f = scan('<span class="m"> วิว · 24 ตอน</span>');
  assert.deepEqual(rules(f), ['V12(ข)']);
  assert.equal(f[0].line, 1);
});

test('V12 จับตัวเลขยอดวิวใน meta ที่ maskMarkup มองไม่เห็น', () => {
  const f = scanHtml({
    file: 't.html', viewsSource: 'none',
    html: '<html><head><title>ก</title><meta name="description" content="ดูแล้ว 12.4M วิว"></head><body></body></html>',
  });
  assert.deepEqual(rules(f), ['V12(ก)']);
  assert.match(f[0].what, /meta description/);
});

test('V13 จับถ้อยคำอ้างการวัดใน title / meta / JSON-LD / ข้อความนำ', () => {
  const html = '<html><head><title>ยอดนิยมสัปดาห์นี้ TOP 10</title>'
    + '<meta name="description" content="เรื่องที่คนดูมากที่สุด">'
    + '<script type="application/ld+json">{"description":"อันดับจากยอดวิวสะสม"}</script></head>'
    + '<body><div class="page-head"><h1>ยอดนิยม TOP 10</h1><p>อันดับจากยอดวิวสะสมในคลัง</p></div></body></html>';
  const f = scanHtml({ file: 't.html', viewsSource: 'none', html });
  assert.ok(f.length >= 4, `คาดว่าจับได้ ≥4 จุด ได้ ${f.length}`);
  assert.ok(f.every(x => x.rule === 'V13'), rules(f).join(','));
  for (const scope of ['<title>', 'meta description', 'JSON-LD', 'ข้อความนำ page-head']) {
    assert.ok(f.some(x => x.what.startsWith(scope)), `ไม่จับใน ${scope}`);
  }
});

test('V13 รายงานจุดละครั้ง ไม่นับซ้ำเมื่อวลีต้องห้ามทับกัน', () => {
  /* "ยอดนิยมสัปดาห์นี้" เข้าได้ทั้งแบบเจาะจงและแบบ "ยอดนิยม…สัปดาห์" */
  const f = scanHtml({ file: 't.html', viewsSource: 'none', html: '<html><head><title>ยอดนิยมสัปดาห์นี้</title></head><body></body></html>' });
  assert.equal(f.length, 1);
});

/* ---------- สิ่งที่ §12.3 บอกว่า "ไม่ได้ห้าม" — ด่านต้องไม่จับ ---------- */

test('ไม่จับคำว่า "ยอดนิยม" ที่เป็นป้ายเมนูหรือหัวข้อหมวด', () => {
  assert.deepEqual(scan('<a href="/popular/"><span>ยอดนิยม</span></a>'), []);
  assert.deepEqual(scan('<h2>ยอดนิยม TOP 10</h2>'), []);
});

test('ไม่จับการจัดลำดับหรือเลขอันดับ 1–10', () => {
  assert.deepEqual(scan('<span class="rkn num">4</span><b>ชื่อเรื่อง</b>'), []);
});

test('ไม่จับ URL /popular และไม่จับชื่อคลาส', () => {
  assert.deepEqual(scan('<a class="trending-card" href="/popular/index.html">ดูทั้งหมด</a>'), []);
});

test('ไม่จับคำว่า "ยอดวิว" ที่เป็นคำในประโยค เช่น คำชี้แจง', () => {
  assert.deepEqual(scan('<p>ยังไม่ได้ต่อระบบวัดยอดวิว จึงไม่แสดงตัวเลข</p>'), []);
});

test('ไม่จับคำอังกฤษที่มี views/วิว อยู่ข้างใน', () => {
  assert.deepEqual(scan('<p>preview reviews overviews</p>'), []);
});

test('ปิดด่านเมื่อ viewsSource = "analytics" ตาม §12.3', () => {
  assert.deepEqual(scan('<span>12.4M วิว</span><h1>ยอดนิยมสัปดาห์นี้</h1>', 'analytics'), []);
});

test('เลขบรรทัดที่รายงานตรงกับไฟล์จริง (ตรวจซ้ำได้)', () => {
  const html = '<html>\n<head>\n<title>ก</title>\n</head>\n<body>\n<span> วิว</span>\n</body>\n</html>';
  const f = scanHtml({ file: 't.html', viewsSource: 'none', html });
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 6);
});
