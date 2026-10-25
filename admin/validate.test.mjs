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
test('importer accepts coverWide when the file exists',()=>{
  const d=structuredClone(source);
  d.series[0].coverWide='assets/covers/'+d.series[0].slug+'.webp';   // path rule must reject this
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
