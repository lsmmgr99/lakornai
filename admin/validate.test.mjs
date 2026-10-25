import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate } from './validate.mjs';
const source = JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));
const run = d => validate(d,{coverExists:fs.existsSync});
test('seed inventory and preserved episode titles', () => {
  assert.deepEqual(run(source), []);
  assert.equal(source.series.length,12);
  assert.equal(source.series.reduce((n,s)=>n+s.episodes.length,0),418);
  for (const s of source.series) for (const e of s.episodes) assert.deepEqual(Object.keys(e),['n','title','durationSec']);
});
// ADR-001 §13.3: the importer accepts v1 (legacy drafts must still open) but a v1 file
// must not carry v2-only fields, and a v2 file must carry orientation on every series.
test('importer accepts version 1 without the §13 fields',()=>{
  const d=structuredClone(source);d.version=1;
  for (const s of d.series) { delete s.orientation; delete s.coverWide; }
  assert.deepEqual(run(d),[]);
});
// V15 path rule: coverWide must live in assets/covers-wide/, not next to the 2:3 covers.
// This test used to be named "accepts coverWide when the file exists" while asserting a
// rejection — the name promised the positive path nobody actually covered (AIO-64 R3).
test('importer rejects coverWide that points outside assets/covers-wide/',()=>{
  const d=structuredClone(source);
  d.series[0].coverWide='assets/covers/'+d.series[0].slug+'.webp';
  assert.ok(run(d).length);
});
// The positive path of V15/V16, which no test reached before: a well-formed coverWide whose
// file exists must be accepted — on a vertical series (optional) and on a horizontal one
// (required by V16). Existence is stubbed because the repo has no wide covers yet (AIO-60),
// so this test states the contract instead of waiting for the asset.
test('importer accepts a well-formed coverWide whose file exists (V15/V16 positive path)',()=>{
  const wide='assets/covers-wide/'+source.series[0].slug+'.webp';
  const exists=p=>p===wide||fs.existsSync(new URL('../'+p,import.meta.url));
  for (const orientation of ['vertical','horizontal']) {
    const d=structuredClone(source);
    d.series[0].coverWide=wide;
    d.series[0].orientation=orientation;
    assert.deepEqual(validate(d,{coverExists:exists}),[],`orientation=${orientation}`);
  }
  // …and the same file missing from disk must still be rejected: the stub is what makes the
  // case positive, not a hole in V15.
  const d=structuredClone(source);
  d.series[0].coverWide=wide;
  assert.ok(run(d).length);
});
for (const [name,change] of Object.entries({
  version:d=>d.version=3,
  orientationMissing:d=>delete d.series[0].orientation,
  orientationCase:d=>d.series[0].orientation='Vertical',
  orientationUnknown:d=>d.series[0].orientation='portrait',
  orientationNull:d=>d.series[0].orientation=null,
  orientationOnV1:d=>d.version=1,
  horizontalWithoutWide:d=>d.series[0].orientation='horizontal',
  wideMissingFile:d=>d.series[0].coverWide='assets/covers-wide/missing.webp',
  wideTraversal:d=>d.series[0].coverWide='assets/covers-wide/../../content.json',
  duplicate:d=>d.series[1].slug=d.series[0].slug,
  registry:d=>d.series[0].genres=['missing'],
  numbering:d=>d.series[0].episodes[0].n=2,
  count:d=>d.series[0].eps++,
  schedule:d=>{d.series[0].status='ended';d.series[0].releaseDay='wed';},
  image:d=>d.series[0].cover='assets/covers/missing.webp',
  traversal:d=>d.series[0].cover='../content.json',
  synopsis:d=>d.series[0].synopsis=d.series[0].hook.repeat(3),
  extra:d=>d.series[0].episodes[0].locked=true,
  personal:d=>d.following=[],
  synthetic:d=>d.series[0].views=42,
  missingMeasurement:d=>d.meta.viewsSource='analytics',
  duration:d=>d.series[0].episodes[0].durationSec=0,
  nullRecord:d=>d.series[0]=null,
})) test(`reject ${name}`, () => { const d=structuredClone(source);change(d);assert.ok(run(d).length); });
test('accept all ongoing schedule days',()=>{
  for (const day of ['daily','mon','tue','wed','thu','fri','sat','sun']) {
    const d=structuredClone(source);d.series[0].status='ongoing';d.series[0].releaseDay=day;assert.deepEqual(run(d),[]);
  }
});
