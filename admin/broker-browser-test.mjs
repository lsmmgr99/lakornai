// ทดสอบแผง + broker ในเบราว์เซอร์จริง ด้วย provider จำลอง: ล็อกอิน device flow · สองแท็บ · บันทึกร่าง · เผยแพร่ · สถานะ CI
import {createBroker} from './broker.mjs';
import {readFile} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 4192, CDP = 9446;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const content=JSON.parse(await readFile(new URL('../content.json',import.meta.url)));
const heads={main:'old'};const commits=[];let statusPolls=0;
const trees={main:new Set(content.series.map(s=>s.cover))};const bytes=new Map();
const entries=b=>[...trees[b]].map(p=>({path:p,type:'blob',mode:'100644',sha:'blob:'+p}));
const provider={
  start:async()=>({device_code:'mock',user_code:'MOCK-CODE',expires_in:900,interval:1}),
  poll:async()=>({access_token:'ghu_MOCK'}),permission:async()=>true,user:async()=>({login:'tester',name:'Tester'}),
  branchExists:async(t,b)=>heads[b]||null,createBranch:async(t,b,sha)=>{heads[b]=sha;trees[b]=new Set(trees.main);},
  snapshot:async(t,b)=>({branch:b,head:heads[b],tree:'tree',content,entries:entries(b),files:[...trees[b]]}),
  blob:async(t,sha)=>bytes.get(sha.slice(5)),
  commit:async(t,snapshot,files,opts)=>{commits.push({branch:snapshot.branch,files:[...files.keys()],message:opts.message});for(const [p,b] of files)if(p!=='content.json'){trees[snapshot.branch].add(p);bytes.set(p,b);}heads[snapshot.branch]=String(commits.length).padStart(40,'0');return heads[snapshot.branch];},
  runs:async(t,b,sha)=>{statusPolls++;return [{name:'content-ci',status:statusPolls<2?'in_progress':'completed',conclusion:statusPolls<2?null:'success',url:'https://ci.test/run',sha}];},
};
const server=createBroker({clientId:'public',owner:'company',repo:'repo',branch:'admin-drafts/content',publishBranch:'main',publishBranches:['main'],siteUrl:'https://site.test/'},{provider});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });

function cleanup(code) { try { server.close(); } catch {} try { chrome.kill('SIGTERM'); } catch {} process.exit(code); }

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' });
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* ยังไม่ขึ้น */ }
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ chrome ไม่ได้');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Page.enable'); await send('Runtime.enable');

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js error');
  return r.result.value;
}
const msg = () => evaluate("document.querySelector('#message').textContent");
const waitFor = async (expr, what, tries = 100) => { for (let i = 0; i < tries; i++) { if (await evaluate(expr)) return; await sleep(100); } throw Error('Timeout waiting for ' + what); };
try {
 await send('Page.navigate',{url:BASE+'/admin/'});
 await waitFor("document.querySelectorAll('#editor table tr').length>1",'editor');
 if(await evaluate("document.querySelectorAll('#series button').length")!==12)throw Error('Expected 12 series');
 await waitFor("!document.querySelector('#login').disabled",'login enabled');
 // ล็อกอิน: ต้องเห็นรหัส device · ปฏิเสธการโหลดจาก GitHub (เก็บร่างในหน้า)
 await evaluate("window.confirm=()=>false;document.querySelector('#login').click()");
 await waitFor("!document.querySelector('#device').hidden && document.querySelector('#device-code').textContent==='MOCK-CODE'",'device code');
 await waitFor("!document.querySelector('#save').disabled",'save enabled after login');
 if(!(await evaluate("document.querySelector('#user').textContent")).includes('tester'))throw Error('User not shown');
 if(!(await evaluate("document.querySelector('#device').hidden")))throw Error('Device box must hide after login');
 // แท็บที่สองเปิดแล้วปิด ไม่ทำให้ session ของแท็บแรกตาย
 const second=await send('Target.createTarget',{url:BASE+'/admin/'});
 await sleep(800);
 await send('Target.closeTarget',{targetId:second.targetId});await sleep(300);
 await evaluate("document.querySelector('#save').onclick()");
 if(commits.length!==1||commits[0].branch!=='admin-drafts/content')throw Error('Draft save failed: '+JSON.stringify(commits));
 if(heads.main!=='old')throw Error('Draft save must not touch main');
 // ร่างที่ตกเกณฑ์ต้องไม่ถูกส่ง และต้องบอกจุดที่ผิด
 await evaluate("window.originalSynopsis=document.querySelector('textarea').value;document.querySelector('textarea').value='สั้นเกินไป';document.querySelector('textarea').dispatchEvent(new Event('input'));document.querySelector('#save').click()");
 await sleep(100);
 if(commits.length!==1||!(await msg()).includes('จุดที่ต้องแก้'))throw Error('Invalid draft did not show validation: '+await msg());
 if(!(await evaluate("document.querySelector('#problems ul').textContent")).includes('เรื่องย่อ'))throw Error('Problem list must name the field');
 await evaluate("document.querySelector('textarea').value=window.originalSynopsis;document.querySelector('textarea').dispatchEvent(new Event('input'))");
 // อัปโหลดปกแล้วบันทึกร่าง → ปกไปกับ commit และสถานะ pending หาย
 await evaluate(`(async()=>{
   const canvas=document.createElement('canvas');canvas.width=2;canvas.height=3;
   const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
   const transfer=new DataTransfer();transfer.items.add(new File([blob],'untrusted-name.txt',{type:'text/plain'}));
   const input=document.querySelector('#cover-upload');input.files=transfer.files;await input.onchange();
 })()`);
 if(!(await msg()).includes('เก็บปก 2:3ในร่างแล้ว'))throw Error('Cover not accepted: '+await msg());
 await evaluate("document.querySelector('#export').onclick()");
 if(!(await msg()).includes('มีปกใหม่ในร่าง'))throw Error('JSON-only export must explain pending cover');
 await evaluate("document.querySelector('#save').onclick()");
 if(commits.length!==2||!commits[1].files.includes('assets/covers/durian-revenge.png'))throw Error('Cover commit failed: '+JSON.stringify(commits));
 if(await evaluate("!!document.querySelector('.cover .pending')"))throw Error('Pending cover was not cleared');
 const warned=await evaluate("(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})()");
 if(warned)throw Error('Saved draft still warns on exit');
 // เผยแพร่: confirm → commit ลง main → ตามสถานะ CI จนขึ้นเว็บ
 await evaluate("window.confirm=()=>true;document.querySelector('#publish').click()");
 for(let i=0;i<50&&commits.length<3;i++)await sleep(100);
 if(commits.length!==3||commits[2].branch!=='main'||!/เผยแพร่/.test(commits[2].message))throw Error('Publish commit failed: '+JSON.stringify(commits));
 if(!commits[2].files.includes('assets/covers/durian-revenge.png'))throw Error('Publish must carry the cover saved on the draft branch: '+JSON.stringify(commits[2]));
 await waitFor("document.querySelector('#status').textContent.length>0",'deploy status shown');
 if(!/รอ CI|CI กำลัง|ขึ้นเว็บแล้ว/.test(await evaluate("document.querySelector('#status').textContent")))throw Error('Unexpected deploy status: '+await evaluate("document.querySelector('#status').textContent"));
 await waitFor("document.querySelector('#status').textContent.includes('ขึ้นเว็บแล้ว')",'deploy success',400);
 if(statusPolls<2)throw Error('Status must have been polled until completion');
 if(!(await msg()).includes('https://site.test/'))throw Error('Success message must link the site: '+await msg());
 await evaluate("URL.createObjectURL=()=> 'blob:test';HTMLAnchorElement.prototype.click=function(){};document.querySelector('#export').onclick()");
 if(!(await msg()).includes('ส่งออกร่างแล้ว'))throw Error('Saved cover blocks JSON export');
 console.log('PASS broker browser: device login, two tabs, validation before save, cover commit, publish to main, CI status to success');
 cleanup(0);
}catch(e){console.error(e);cleanup(1);}
