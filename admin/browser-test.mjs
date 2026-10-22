import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const PORT = 4191, CDP = 9445;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(ROOT, 'admin/serve.mjs'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dbus',
  `--remote-debugging-port=${CDP}`, '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });

function cleanup(code) { try { server.kill('SIGTERM'); } catch {} try { chrome.kill('SIGTERM'); } catch {} process.exit(code); }

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
 await evaluate(`const input=document.querySelector('#editor table input');input.value='ชื่อที่แก้ในเบราว์เซอร์';input.dispatchEvent(new Event('input'));Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='ตรวจชื่อซ้ำอีกครั้ง').click();`);
 if(await evaluate("document.querySelector('#editor table input').value")!=='ชื่อที่แก้ในเบราว์เซอร์')throw Error('Edit lost');
 await evaluate(`(async()=>{
   const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
   const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
   const transfer=new DataTransfer();transfer.items.add(new File([blob],'untrusted-name.txt',{type:'text/plain'}));
   const input=document.querySelector('#cover-upload');input.files=transfer.files;await input.onchange();
 })()`);
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('เก็บปกในร่างแล้ว'))throw Error('Cover not accepted');
 await evaluate("document.querySelector('#export').onclick()");
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('มีปกใหม่ในร่าง'))throw Error('JSON-only export must explain pending cover');
 await evaluate(`window.exportedBlob=null;URL.createObjectURL=b=>{window.exportedBlob=b;return 'blob:test'};HTMLAnchorElement.prototype.click=function(){};document.querySelector('#export-bundle').click()`);
 for(let i=0;i<50;i++){if(await evaluate('!!window.exportedBlob'))break;await sleep(100);}
 const exported=await evaluate('window.exportedBlob.text()');
 if(!exported.includes('ชื่อที่แก้ในเบราว์เซอร์')||!exported.includes('assets/covers/durian-revenge.png'))throw Error('Bundle missing edited title or cover');
 await evaluate(`(async()=>{const t=new DataTransfer();t.items.add(new File(['<svg/>'],'fake.png',{type:'image/png'}));const input=document.querySelector('#cover-upload');input.files=t.files;await input.onchange();})()`);
 if(!(await evaluate("document.querySelector('#message').textContent")).includes('รับเฉพาะข้อมูลภาพ'))throw Error('Spoofed image accepted');
 console.log('PASS browser: table edit, image decode, spoof rejection, JSON guard, bundled title and cover');
 cleanup(0);
}catch(e){console.error(e);cleanup(1);}
