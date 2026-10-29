import http from 'node:http';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBroker,checkConfig,loadConfig} from './broker.mjs';
import {github,isWritablePath} from './github.mjs';
const config={clientId:'Iv1_public',owner:'company',repo:'lakorn',branch:'admin-drafts/content',publishBranch:'main',publishBranches:['main'],siteUrl:'https://example.test/'};
const content=JSON.parse(await readFile(new URL('../content.json',import.meta.url)));
// WebP 2640×1200 ที่ถูกต้องตามหัวไฟล์ (VP8L) ใช้ทดสอบภาพกว้าง — สร้างจาก imgsize ตามสเปก RIFF/VP8L
function wideWebp(w=2640,h=1200){
  const payload=Buffer.alloc(5);payload[0]=0x2f;const bits=(w-1)|((h-1)<<14);payload.writeUInt32LE(bits>>>0,1);payload[4]=(payload[4]&0x0f)|0;
  const chunk=Buffer.concat([Buffer.from('VP8L'),Buffer.from([payload.length,0,0,0]),payload,Buffer.alloc(payload.length%2)]);
  const riff=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),chunk]);riff.writeUInt32LE(riff.length-8,4);return riff;
}
function mockProvider(state){
  // ต้นไม้ไฟล์แยกตาม branch: sha ของ blob = พาธ (พอสำหรับ mock) · bytes เก็บไว้ให้ blob() ดึง
  state.trees??={main:new Set(content.series.map(s=>s.cover))};state.bytes??=new Map();
  const entries=branch=>{state.trees[branch]??=new Set(state.trees.main);return [...state.trees[branch]].map(p=>({path:p,type:'blob',mode:'100644',sha:'blob:'+p}));};
  return {
    start:async()=>({device_code:'PRIVATE_DEVICE',user_code:'ABCD-EFGH',expires_in:900,interval:5}),
    poll:async()=>{state.polls++;return {access_token:'ghu_PRIVATE',expires_in:3600};},
    permission:async()=>state.write,
    user:async()=>({login:'editor',name:'Editor'}),
    branchExists:async(token,branch)=>state.heads[branch]||null,
    createBranch:async(token,branch,sha)=>{state.created.push(branch);state.heads[branch]=sha;state.trees[branch]=new Set(state.trees.main);return sha;},
    snapshot:async(token,branch)=>{if(!state.heads[branch])throw Error('missing');const e=entries(branch);return {branch,head:state.heads[branch],tree:'tree',content,entries:e,files:e.map(x=>x.path)};},
    blob:async(token,sha)=>{assert.match(sha,/^blob:/);const b=state.bytes.get(sha.slice(5));if(!b)throw Error('no blob');return b;},
    commit:async(token,snapshot,files,opts)=>{assert.equal(token,'ghu_PRIVATE');state.received={branch:snapshot.branch,files,message:opts?.message};state.commits++;if(state.hold)await state.hold;for(const [p,b] of files){if(p!=='content.json'){state.trees[snapshot.branch].add(p);state.bytes.set(p,b);}}state.heads[snapshot.branch]='new-'+state.commits;return state.heads[snapshot.branch];},
    runs:async(token,branch,sha)=>[{name:'content-ci',status:'completed',conclusion:'success',url:'https://ci.test/1',sha}],
  };
}
test('configuration fails closed',()=>{
  for(const branch of ['main','../main','admin-drafts/a/b',''])assert.throws(()=>checkConfig({...config,branch}));
  assert.throws(()=>checkConfig({...config,publishBranches:[]}));
  assert.throws(()=>checkConfig({...config,publishBranches:[config.branch],publishBranch:config.branch}));
  assert.throws(()=>checkConfig({...config,publishBranch:'release'}),/publishBranch/);
  assert.throws(()=>checkConfig({...config,siteUrl:'http://insecure'}));
  assert.throws(()=>checkConfig({...config,clientId:'bad id'}));
  checkConfig({...config,clientId:''});
  const c=loadConfig({LAKORN_APP_CLIENT_ID:'Iv1_env'},new URL('./config.json',import.meta.url).pathname);
  assert.equal(c.clientId,'Iv1_env');assert.equal(c.owner,'lsmmgr99');assert.equal(c.publishBranch,'main');assert.deepEqual(c.publishBranches,['main']);checkConfig(c);
});
test('writable paths are exactly content.json, covers and covers-wide',()=>{
  for(const p of ['content.json','assets/covers/a-b.webp','assets/covers-wide/a-b.webp','assets/covers/x.png','assets/covers-wide/x.jpg'])assert.ok(isWritablePath(p),p);
  for(const p of ['build/x.js','.github/workflows/x','assets/app.js','assets/covers/../x.jpg','assets/covers-wide/../x.jpg','assets/covers/A.webp','assets/covers-wide/x.svg','content.json/x'])assert.ok(!isWritablePath(p),p);
});
test('HTTP trust boundary, device timing, permission, conflict, allowlist, draft + publish, status, logout',async t=>{
 let time=100000;const state={write:true,polls:0,commits:0,heads:{main:'old'},created:[]};
 const provider=mockProvider(state);
 const server=createBroker(config,{provider,now:()=>time});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;let cookie,csrf;
 async function call(route,body={},headers={}){return fetch(origin+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},body:JSON.stringify(body)});}
 assert.equal((await call('session',{}, {Origin:'http://evil.test'})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/session',{method:'POST',headers:{Host:'evil.test',Origin:origin,'Content-Type':'application/json'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);req.end('{}');}),403);
 assert.equal((await call('session',{}, {Origin:''})).status,403);
 const session=await call('session');cookie=session.headers.get('set-cookie').split(';')[0];assert.match(session.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);const firstTab=await session.json();csrf=firstTab.csrf;
 assert.equal(firstTab.loginEnabled,true);assert.equal(firstTab.publishBranch,'main');assert.equal(firstTab.siteUrl,'https://example.test/');
 const secondTab=await(await call('session')).json();
 assert.equal((await call('close-tab',{tab:secondTab.tab})).status,200);
 assert.equal((await call('heartbeat')).status,200);
 assert.equal((await call('close-tab',{tab:'invalid'})).status,403);
 assert.equal((await call('login',{}, {'X-CSRF-Token':'bad'})).status,403);
 assert.equal((await call('load')).status,401,'ก่อนล็อกอินต้องอ่านไม่ได้');
 const login=await (await call('login')).text();assert.ok(!login.includes('PRIVATE'));await call('poll');assert.equal(state.polls,0);time+=5000;
 const auth=await(await call('poll')).text();assert.ok(!auth.includes('PRIVATE'));assert.match(auth,/"canWrite":true/);assert.match(auth,/"login":"editor"/);
 // load: ยังไม่มี branch ร่าง → draft เป็น null
 const loaded=await(await call('load')).json();assert.equal(loaded.publish.head,'old');assert.equal(loaded.draft,null);assert.ok(loaded.publish.files.includes(content.series[0].cover));
 const body={head:'old',content,covers:[]};
 state.write=false;assert.equal((await call('commit',body)).status,403);assert.equal((await call('publish',body)).status,403);state.write=true;
 assert.equal((await call('commit',{...body,head:'stale'})).status,409);
 assert.equal((await call('commit',{...body,path:'.github/workflows/x'})).status,400);
 assert.equal((await call('commit',{...body,covers:[{slug:'../bad',base64:'/9j/AA=='}]})).status,400);
 // บันทึกร่างครั้งแรก: แตก branch ร่างจาก main แล้ว commit ลงร่าง — main ไม่ถูกแตะ
 const first=await(await call('commit',body)).json();assert.equal(state.commits,1);assert.deepEqual(state.created,['admin-drafts/content']);assert.equal(first.branch,'admin-drafts/content');assert.equal(first.published,false);assert.equal(state.heads.main,'old');assert.match(state.received.message,/ร่าง.*editor/);
 // ครั้งต่อไปต้องใช้ head ของร่าง ไม่ใช่ของ main
 assert.equal((await call('commit',body)).status,409);
 const draft=structuredClone(content),slug=draft.series[0].slug;
 draft.series[0].cover=`assets/covers/${slug}.jpg`;
 const upload={slug,base64:'/9j/AA=='};
 assert.equal((await call('commit',{head:first.sha,content:draft,covers:[upload]})).status,200);
 assert.deepEqual([...state.received.files.keys()],[draft.series[0].cover,'content.json']);
 assert.deepEqual(state.received.files.get(draft.series[0].cover),Buffer.from(upload.base64,'base64'));
 assert.deepEqual(JSON.parse(state.received.files.get('content.json')),draft);
 const head2=state.heads['admin-drafts/content'];
 for(const covers of [[upload,upload],[{...upload,slug:'missing-story'}],[{...upload,base64:'AAAA'}],[{...upload,kind:'banner'}]])assert.equal((await call('commit',{head:head2,content:draft,covers})).status,400);
 // ภาพกว้าง: ต้องอ้างใน coverWide · ขนาดต้อง 2640×1200 เป๊ะ
 const wideDraft=structuredClone(content);wideDraft.series[0].coverWide=`assets/covers-wide/${slug}.webp`;
 const wrongSize=await call('commit',{head:head2,content:wideDraft,covers:[{slug,kind:'wide',base64:wideWebp(1920,1080).toString('base64')}]});
 assert.equal(wrongSize.status,400);assert.match((await wrongSize.json()).error,/2640×1200/);
 assert.equal((await call('commit',{head:head2,content:wideDraft,covers:[{slug,kind:'wide',base64:wideWebp().toString('base64')}]})).status,200);
 assert.deepEqual([...state.received.files.keys()],[wideDraft.series[0].coverWide,'content.json']);
 const head3=state.heads['admin-drafts/content'];
 // ภาพกว้างที่ไม่มีไฟล์ส่งมาและไม่มีในรีโป → V15 ล้ม พร้อมเหตุผล (เรื่องที่สอง ซึ่งยังไม่เคยอัปโหลด)
 const noWide=structuredClone(content);noWide.series[1].coverWide=`assets/covers-wide/${noWide.series[1].slug}.webp`;
 const noFile=await call('commit',{head:head3,content:noWide,covers:[]});assert.equal(noFile.status,400);assert.match((await noFile.json()).error,/V15/);
 // แต่ภาพกว้างที่อัปโหลดไว้ในร่างแล้ว อ้างซ้ำได้โดยไม่ต้องส่งไบต์ใหม่
 assert.equal((await call('commit',{head:head3,content:wideDraft,covers:[]})).status,200);
 // เผยแพร่: ต้องใช้ head ของ main และ commit ลง main
 assert.equal((await call('publish',{head:head3,content,covers:[]})).status,409);
 const pub=await(await call('publish',{head:'old',content,covers:[]})).json();assert.equal(pub.branch,'main');assert.equal(pub.published,true);assert.equal(pub.siteUrl,'https://example.test/');assert.equal(state.received.branch,'main');assert.match(state.received.message,/เผยแพร่/);
 assert.deepEqual([...state.received.files.keys()],['content.json'],'ไม่มีปกใหม่ → commit เฉพาะ content.json');
 // เผยแพร่ร่างที่อ้างปกซึ่งอยู่แค่บน branch ร่าง → broker ดึงไบต์จากร่างมาติดใน commit เดียวกัน
 const carried=structuredClone(content);carried.series[0].cover=`assets/covers/${slug}.jpg`;carried.series[0].coverWide=`assets/covers-wide/${slug}.webp`;
 const pub2=await(await call('publish',{head:state.heads.main,content:carried,covers:[]})).json();assert.equal(pub2.branch,'main');
 assert.deepEqual([...state.received.files.keys()].sort(),[`assets/covers-wide/${slug}.webp`,`assets/covers/${slug}.jpg`,'content.json'].sort());
 assert.deepEqual(state.received.files.get(`assets/covers/${slug}.jpg`),Buffer.from(upload.base64,'base64'));
 // อ้างปกที่ไม่มีทั้งบน main และบนร่าง → 400 (V6) ไม่ใช่ commit แล้วให้ CI ล้ม
 const ghost=structuredClone(content);ghost.series[0].cover='assets/covers/ghost.webp';
 const ghostRes=await call('publish',{head:state.heads.main,content:ghost,covers:[]});assert.equal(ghostRes.status,400);assert.match((await ghostRes.json()).error,/V6/);
 // สถานะ CI ของ commit ที่เผยแพร่
 assert.equal((await call('status',{sha:'xyz'})).status,400);
 const st=await(await call('status',{sha:'a'.repeat(40)})).json();assert.equal(st.runs[0].conclusion,'success');assert.equal(st.siteUrl,'https://example.test/');
 // ข้อความไทยกลางคำขอต้องประกอบกลับถูก (body แยกเป็นสอง chunk)
 const thaiDraft=structuredClone(content);thaiDraft.series[0].title='กขค';
 const bytes=Buffer.from(JSON.stringify({head:state.heads['admin-drafts/content'],content:thaiDraft,covers:[]}));
 const split=bytes.indexOf(Buffer.from('กขค'))+1;
 const splitStatus=await new Promise((resolve,reject)=>{
  const req=http.request(origin+'/api/commit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length,Cookie:cookie,'X-CSRF-Token':csrf}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
  req.on('error',reject);req.write(bytes.subarray(0,split));setTimeout(()=>req.end(bytes.subarray(split)),50);
 });
 assert.equal(splitStatus,200);assert.equal(JSON.parse(state.received.files.get('content.json')).series[0].title,'กขค');
 // คำขอซ้อนระหว่าง commit ค้าง → 409 · heartbeat/logout ยังทำงาน
 const beforePending=state.commits;const current={head:state.heads['admin-drafts/content'],content,covers:[]};
 let release;state.hold=new Promise(r=>release=r);const pending=call('commit',current);
 while(state.commits<=beforePending)await new Promise(r=>setImmediate(r));
 try{assert.equal((await call('heartbeat')).status,200);
 assert.equal((await call('commit',current)).status,409);
 assert.equal((await call('logout')).status,200);
 }finally{release();}assert.equal((await pending).status,200);
 await call('logout');assert.equal((await call('load')).status,403);
 const fresh=await call('session');cookie=fresh.headers.get('set-cookie').split(';')[0];const tab=await fresh.json();csrf=tab.csrf;
 assert.equal((await call('close-tab',{tab:tab.tab})).status,200);assert.equal((await call('heartbeat')).status,403);
});
test('load exposes an existing draft that differs from the publish head',async t=>{
 let time=0;const state={write:true,polls:0,commits:0,heads:{main:'old','admin-drafts/content':'draft-head'},created:[]};
 const server=createBroker(config,{provider:mockProvider(state),now:()=>time});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;let cookie,csrf;
 const call=(route,body={})=>fetch(origin+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});
 const session=await call('session');cookie=session.headers.get('set-cookie').split(';')[0];csrf=(await session.json()).csrf;
 await call('login');time=5000;await call('poll');
 const loaded=await(await call('load')).json();assert.equal(loaded.draft.head,'draft-head');assert.equal(loaded.publish.head,'old');
 // บันทึกร่างต้องเทียบกับ head ของร่าง ไม่ใช่ของ main
 assert.equal((await call('commit',{head:'old',content,covers:[]})).status,409);
 assert.equal((await call('commit',{head:'draft-head',content,covers:[]})).status,200);assert.deepEqual(state.created,[]);
});
test('login is refused when no GitHub App is configured',async t=>{
 const server=createBroker({...config,clientId:''},{provider:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const session=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});const s=await session.json();assert.equal(s.loginEnabled,false);
 const r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:session.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':s.csrf},body:'{}'});
 assert.equal(r.status,400);assert.match((await r.json()).error,/clientId/);
});
test('provider commits onto the snapshot branch with force false and rejects paths outside the allowlist',async()=>{
 const calls=[];const mock=async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({sha:'abc'})};};
 const api=github(config,mock);
 await api.commit('ghu_TEST',{branch:'admin-drafts/content',head:'parent',tree:'base'},new Map([['content.json',Buffer.from('{}')]]),{message:'m'});
 let update=calls.at(-1);assert.equal(update.method,'PATCH');assert.match(update.url,/refs\/heads\/admin-drafts\/content$/);assert.deepEqual(JSON.parse(update.body),{sha:'abc',force:false});
 assert.deepEqual(JSON.parse(calls.at(-2).body).parents,['parent']);assert.equal(JSON.parse(calls.at(-2).body).message,'m');
 await api.commit('ghu_TEST',{branch:'main',head:'parent',tree:'base'},new Map([['assets/covers-wide/a.webp',Buffer.from('x')]]));
 update=calls.at(-1);assert.match(update.url,/refs\/heads\/main$/);
 for(const path of ['build/x.js','.github/workflows/x','assets/app.js','assets/covers/../x.jpg','assets/share/x.jpg']){const before=calls.length;await assert.rejects(api.commit('ghu_TEST',{branch:'main',head:'parent',tree:'base'},new Map([[path,Buffer.from('x')]])),/Invalid path/);assert.equal(calls.length,before);}
 // branchExists: 404 = ไม่มี ไม่ใช่ error
 const missing=github(config,async()=>({ok:false,status:404}));assert.equal(await missing.branchExists('t','admin-drafts/content'),null);
 const broken=github(config,async()=>({ok:false,status:500}));await assert.rejects(broken.branchExists('t','admin-drafts/content'),/500/);
});
test('slow_down, denied authorization and abandoned session expire without leaking provider data',async t=>{
 let time=0,answer={error:'slow_down'},polls=0;
 const provider={start:async()=>({device_code:'secret',user_code:'CODE',expires_in:900,interval:5}),poll:async()=>{polls++;return answer;}};
 const server=createBroker(config,{provider,now:()=>time});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;let cookie,csrf;
 const call=route=>fetch(origin+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{})},body:'{}'});
 const session=await call('session');cookie=session.headers.get('set-cookie').split(';')[0];csrf=(await session.json()).csrf;
 await call('login');time=5000;assert.equal((await(await call('poll')).json()).interval,10000);
 time=10000;await call('poll');assert.equal(polls,1);
 time=15000;answer={error:'access_denied',error_description:'secret'};const denied=await call('poll');assert.equal(denied.status,401);assert.ok(!(await denied.text()).includes('secret'));
 time=76000;assert.equal((await call('heartbeat')).status,200);
 time=376001;assert.equal((await call('heartbeat')).status,403);
});
test('oversize request drains body and preserves the keep-alive connection',async t=>{
 const server=createBroker(config,{provider:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const agent=new http.Agent({keepAlive:true,maxSockets:1});t.after(()=>{agent.destroy();server.close();});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const call=body=>new Promise((resolve,reject)=>{const req=http.request(origin+'/api/session',{agent,method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text,socket:req.socket}));});req.on('error',reject);req.end(body);});
 const rejected=await call(' '.repeat(18000001));assert.equal(rejected.status,413);assert.match(rejected.text,/18 MB/);
 const next=await call('{}');assert.equal(next.status,200);assert.equal(next.socket,rejected.socket);
 const session=JSON.parse(next.text);
 const closed=await fetch(origin+'/api/close-tab',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({tab:session.tab})});assert.equal(closed.status,403);
});
test('static allowlist serves the panel and covers only',async t=>{
 const server=createBroker(config,{provider:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const p of ['/admin/','/admin/index.html','/admin/editor.mjs','/content.json',`/${content.series[0].cover}`]){const r=await fetch(origin+p);assert.equal(r.status,200,p);assert.match(r.headers.get('content-security-policy'),/default-src 'self'/);}
 for(const p of ['/build/seo.mjs','/admin/broker.mjs','/admin/config.json','/admin/github.mjs','/.github/workflows/content-ci.yml','/assets/app.js','/assets/covers/../app.js']){assert.equal((await fetch(origin+p)).status,404,p);}
});
