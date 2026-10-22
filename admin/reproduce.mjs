// Build only inside an isolated temporary copy; never rewrite shared frontend files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lakorn-content-'));
for(const name of ['build','assets','design','admin','content.json'])fs.cpSync(path.join(root,name),path.join(temp,name),{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(temp,'content.json')));
const title='ชื่อทดสอบเส้นทางเผยแพร่';
data.series[0].episodes[0].title=title;
fs.writeFileSync(path.join(temp,'content.json'),JSON.stringify(data,null,2));
for(const args of [['admin/check.mjs'],['build/build.mjs'],['admin/check.mjs','.', '--html']])execFileSync(process.execPath,args,{cwd:temp,stdio:'inherit'});
const output=path.join(temp,'watch',data.series[0].slug,'ep-1','index.html');
if(!fs.readFileSync(output,'utf8').includes(title))throw Error('Edited title absent from HTML');
console.log(`PASS: edited JSON → build → HTML\n${output}`);
