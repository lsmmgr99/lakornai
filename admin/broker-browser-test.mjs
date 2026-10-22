import {createBroker} from './broker.mjs';
import {readFile} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 4192, CDP = 9446;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const content=JSON.parse(await readFile(new URL('../content.json',import.meta.url)));
let commits=0;
const provider={start:async()=>({device_code:'mock',user_code:'MOCK',expires_in:900,interval:5}),poll:async()=>({access_token:'ghu_MOCK'}),permission:async()=>true,snapshot:async()=>({head:commits?'new':'old',content,entries:content.series.map(s=>({path:s.cover,type:'blob',mode:'100644'}))}),commit:async()=>{commits++;return 'new';}};
const server=createBroker({clientId:'public',owner:'company',repo:'repo',branch:'admin-drafts/content',publishBranches:['main']},{provider});
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
try {
 await send('Page.navigate',{url:BASE+'/admin/'});
 for(let i=0;i<80;i++){if(await evaluate("document.querySelectorAll('#editor table tr').length>1"))break;await sleep(100);}
 const count=await evaluate("document.querySelectorAll('#series option').length");
 if(count!==12)throw Error('Expected 12 series; got '+count);
 await evaluate("window.confirm=()=>false;document.querySelector('#login').click()");
 for(let i=0;i<100;i++){if(await evaluate("!document.querySelector('#save').disabled"))break;await sleep(100);}
 if(await evaluate("document.querySelector('#save').disabled"))throw Error('Login failed');
 const second=await send('Target.createTarget',{url:BASE+'/admin/'});
 await sleep(800);
 await send('Target.closeTarget',{targetId:second.targetId});await sleep(300);
 await evaluate("document.querySelector('#save').onclick()");
 if(commits!==1)throw Error('Closing second tab prevented commit');
 await evaluate("window.originalSynopsis=document.querySelector('textarea').value;document.querySelector('textarea').value='สั้นเกินไป';document.querySelector('textarea').dispatchEvent(new Event('input'));document.querySelector('#save').click()");
 await sleep(100);
 if(commits!==1||!(await evaluate("document.querySelector('#message').textContent")).includes('synopsis'))throw Error('Invalid draft did not show validation');
 await evaluate("document.querySelector('textarea').value=window.originalSynopsis;document.querySelector('textarea').dispatchEvent(new Event('input'))");
 await evaluate(`(async()=>{
   const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
   const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
   const transfer=new DataTransfer();transfer.items.add(new File([blob],'untrusted-name.txt',{type:'text/plain'}));
   const input=document.querySelector('#cover-upload');input.files=transfer.files;await input.onchange();
 })()`);
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('เก็บปกในร่างแล้ว'))throw Error('Cover not accepted');
 await evaluate("document.querySelector('#export').onclick()");
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('มีปกใหม่ในร่าง'))throw Error('JSON-only export must explain pending cover');
 await evaluate("document.querySelector('#save').onclick()");
 if(commits!==2)throw Error('Cover commit failed');
 if(await evaluate("document.querySelector('#editor').textContent.includes('มีปกใหม่ในร่าง:')"))throw Error('Pending cover was not cleared');
 const warned=await evaluate("(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})()");
 if(warned)throw Error('Saved cover still warns on exit');
 await evaluate("URL.createObjectURL=()=> 'blob:test';HTMLAnchorElement.prototype.click=function(){};document.querySelector('#export').onclick()");
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('ส่งออกร่างแล้ว'))throw Error('Saved cover blocks JSON export');
 console.log('PASS broker browser: two tabs, validation before save, cover commit clears pending state and allows JSON export');
 cleanup(0);
}catch(e){console.error(e);cleanup(1);}
