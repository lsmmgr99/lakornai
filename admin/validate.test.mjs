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
for (const [name,change] of Object.entries({
  version:d=>d.version=2,
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
