// Shared browser/CI contract checks. Unknown fields are rejected at every level.
export function validate(d, { coverExists = () => true } = {}) {
  const errors = [];
  const check = (ok, path, rule) => { if (!ok) errors.push(`${path}: ${rule}`); };
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const shape = (x, keys, p) => { check(obj(x), p, 'object required'); if (obj(x)) for (const k of Object.keys(x)) check(keys.includes(k), `${p}.${k}`, 'unknown field'); };
  const str = (x, min, max) => typeof x === 'string' && x.trim().length >= min && [...x].length <= max;
  const arr = x => Array.isArray(x) ? x : [];
  const slug = x => typeof x === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(x);
  shape(d, ['version','generatedAt','meta','genres','tropes','series'], '$');
  if (!obj(d)) return errors;
  // V1 — the importer accepts both 1 and 2 so files exported before ADR-001 §13 still open.
  // Only build/ is strict (version 2 only): a build that does not know a series' orientation
  // has no option but to guess, and §13.2 forbids guessing. Export is always 2 (§13.3).
  const v2 = d.version === 2;
  check(d.version === 1 || v2, 'version', 'V1');
  check(typeof d.generatedAt === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(d.generatedAt) && Number.isFinite(Date.parse(d.generatedAt)), 'generatedAt', 'ISO timestamp required');
  shape(d.meta, ['viewsSource'], 'meta');
  check(['none','analytics'].includes(d.meta?.viewsSource), 'meta.viewsSource', 'V10');
  const registers = {};
  for (const key of ['genres','tropes']) {
    check(Array.isArray(d[key]), key, 'array required');
    registers[key] = new Set();
    for (const r of arr(d[key])) {
      shape(r, ['slug','label'], key);
      check(slug(r?.slug) && !registers[key].has(r?.slug), key, 'V2');
      check(str(r?.label, 1, 100), key, 'label required');
      registers[key].add(r?.slug);
    }
  }
  check(Array.isArray(d.series), 'series', 'array required');
  const seen = new Set();
  for (const [i,s] of arr(d.series).entries()) {
    const p = `series[${i}]`;
    shape(s, ['slug','title','hook','synopsis','genres','tropes','eps','status','releaseDay','cover','coverWide','orientation','views','cast','theme','episodes'], p);
    if (!obj(s)) continue;
    check(slug(s.slug) && !seen.has(s.slug), p, 'V2'); seen.add(s.slug);
    check(str(s.title, 1, 80), p+'.title', '1–80 characters');
    check(str(s.hook, 1, 90) && !s.hook.endsWith('.'), p+'.hook', '1–90 characters; no final period');
    check(str(s.synopsis, 80, 600), p+'.synopsis', '80–600 characters');
    if (typeof s.synopsis === 'string' && typeof s.hook === 'string' && s.hook) check(!s.synopsis.includes(s.hook) && !s.synopsis.startsWith([...s.hook].slice(0,30).join('')), p+'.synopsis', 'V7');
    for (const key of ['genres','tropes']) check(Array.isArray(s[key]) && (key !== 'genres' || s[key].length > 0) && s[key].every(x => registers[key].has(x)), p+'.'+key, 'V3');
    check(Number.isInteger(s.eps) && s.eps >= 1 && Array.isArray(s.episodes) && s.eps === s.episodes.length, p+'.eps', 'V4');
    check(s.status === 'ended' ? s.releaseDay === null : s.status === 'ongoing' && ['daily','mon','tue','wed','thu','fri','sat','sun'].includes(s.releaseDay), p+'.status', 'V5');
    check(typeof s.cover === 'string' && /^assets\/covers\/[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/.test(s.cover) && coverExists(s.cover), p+'.cover', 'V6');
    // V14/V15/V16 — only fire on version 2 files: a v1 file has neither field by definition,
    // and firing on it would make every legacy draft unopenable (the point of accepting v1).
    // Dimensions and byte ceiling of coverWide are build/'s job (build/content.mjs, rule V15):
    // the browser cannot read a file header, so the importer checks path + existence only.
    if (v2) {
      check(s.orientation === 'vertical' || s.orientation === 'horizontal', p+'.orientation', 'V14');
      if (s.coverWide !== undefined && s.coverWide !== null) {
        check(typeof s.coverWide === 'string' && /^assets\/covers-wide\/[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/.test(s.coverWide) && coverExists(s.coverWide), p+'.coverWide', 'V15');
      } else {
        check(s.orientation !== 'horizontal', p+'.coverWide', 'V16');
      }
    } else {
      check(s.orientation === undefined && s.coverWide === undefined, p+'.orientation', 'V1');
    }
    check(d.meta?.viewsSource === 'none' ? s.views === null : Number.isSafeInteger(s.views) && s.views >= 0, p+'.views', 'V10');
    if (s.cast !== undefined) check(Array.isArray(s.cast) && s.cast.every(x => str(x,1,100)), p+'.cast', 'array of names');
    if (s.theme !== undefined) { shape(s.theme, ['c1','c2'], p+'.theme'); check(['c1','c2'].every(k => /^#[0-9a-f]{6}$/i.test(s.theme?.[k])),p+'.theme','hex colors'); }
    for (const [j,e] of arr(s.episodes).entries()) {
      shape(e, ['n','title','durationSec'], p+'.episodes');
      check(e?.n === j+1, p+'.episodes', 'V4');
      check(str(e?.title,1,80), p+`.episodes[${j}].title`, '1–80 characters');
      check(Number.isInteger(e?.durationSec) && e.durationSec >= 30 && e.durationSec <= 600, p+'.episodes', 'duration 30–600');
    }
  }
  return errors;
}
