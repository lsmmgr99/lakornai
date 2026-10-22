import fs from 'node:fs';
import path from 'node:path';
import { validate } from './validate.mjs';
const root = path.resolve(process.argv[2] || '.');
const data = JSON.parse(fs.readFileSync(path.join(root,'content.json'),'utf8'));
const errors = validate(data, {coverExists: p => fs.existsSync(path.join(root,p))});
if (process.argv.includes('--html')) {
  const escape = x => x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  for (const s of data.series || []) {
    const file = path.join(root,'series',s.slug,'index.html');
    const html = fs.existsSync(file) ? fs.readFileSync(file,'utf8') : '';
    const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
    for (const value of [s.title,s.synopsis]) if (!body.includes(escape(value))) errors.push(`${s.slug}: V11 missing rendered content`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Content checks passed');
