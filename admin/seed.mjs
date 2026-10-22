import fs from 'node:fs';
import vm from 'node:vm';
import { validate } from './validate.mjs';
const source = process.argv[2] || 'assets/data.js';
const target = process.argv[3] || 'content.json';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(source, 'utf8'), context, { timeout: 1000 });
const old = context.window.LAKORN;
const days = {'ตอนใหม่ทุกวัน':'daily','ตอนใหม่ทุกอังคาร':'tue','ตอนใหม่ทุกศุกร์':'fri','ตอนใหม่ทุกเสาร์':'sat','จบแล้ว':null};
const data = {
  version: 1, generatedAt: new Date().toISOString(), meta: { viewsSource: 'none' },
  genres: old.genres.map(({slug,label}) => ({slug,label})),
  tropes: old.tropes.map(({slug,label}) => ({slug,label})),
  series: old.series.map(s => {
    if (!(s.status in days)) throw Error(`Unknown status: ${s.status}`);
    return { slug:s.slug, title:s.title, hook:s.hook, synopsis:s.synopsis,
      genres:s.genres, tropes:s.tropes, eps:s.eps, status:s.status === 'จบแล้ว' ? 'ended':'ongoing',
      releaseDay:days[s.status], cover:s.cover || `assets/covers/${s.slug}.webp`, views:null,
      cast:s.cast, theme:{c1:s.c1,c2:s.c2}, episodes:s.episodes.map((e,i) => {
        if (!/^\d+:\d{2}$/.test(e[1]) || Number(e[1].split(':')[1]) >= 60) throw Error('Invalid duration');
        const [m,sec] = e[1].split(':').map(Number);
        return {n:i+1,title:e[0],durationSec:m*60+sec};
      }) };
  })
};
const errors = validate(data, {coverExists: fs.existsSync});
if (data.series.length !== 12 || data.series.reduce((n,s)=>n+s.episodes.length,0) !== 418 || data.genres.length !== 6) errors.push('Seed inventory mismatch');
if (errors.length) throw Error(errors.join('\n'));
fs.writeFileSync(target, JSON.stringify(data,null,2)+'\n', {flag:'wx'});
console.log('Seed: 12 series / 418 episodes / 6 genres');
