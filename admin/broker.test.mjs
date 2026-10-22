import http from 'node:http';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBroker,checkConfig} from './broker.mjs';
import {github} from './github.mjs';
const config={clientId:'Iv1_public',owner:'company',repo:'lakorn',branch:'admin-drafts/content',publishBranches:['main']};
const content=JSON.parse(await readFile(new URL('../content.json',import.meta.url)));
test('configuration fails closed for publish/default-like targets',()=>{for(const branch of ['main','../main','admin-drafts/a/b'])assert.throws(()=>checkConfig({...config,branch}));assert.throws(()=>checkConfig({...config,publishBranches:[]}));assert.throws(()=>checkConfig({...config,publishBranches:[config.branch]}));});
test('HTTP trust boundary, device timing, permission, conflict, allowlist, logout',async t=>{
 let time=100000,write=true,polls=0,commits=0,hold;
 let received;
 const provider={start:async()=>({device_code:'PRIVATE_DEVICE',user_code:'ABCD-EFGH',expires_in:900,interval:5}),poll:async()=>{polls++;return {access_token:'ghu_PRIVATE',expires_in:3600};},permission:async()=>write,snapshot:async()=>({head:'old',tree:'tree',content,entries:content.series.map(s=>({path:s.cover,type:'blob',mode:'100644'}))}),commit:async(token,snapshot,files)=>{assert.equal(token,'ghu_PRIVATE');received=files;commits++;if(hold)await hold;return 'new';}};
 const server=createBroker(config,{provider,now:()=>time});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;let cookie,csrf;
 async function call(route,body={},headers={}){return fetch(origin+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},body:JSON.stringify(body)});}
 assert.equal((await call('session',{}, {Origin:'http://evil.test'})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/session',{method:'POST',headers:{Host:'evil.test',Origin:origin,'Content-Type':'application/json'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);req.end('{}');}),403);
 assert.equal((await call('session',{}, {Origin:''})).status,403);
 const session=await call('session');cookie=session.headers.get('set-cookie').split(';')[0];assert.match(session.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);csrf=(await session.json()).csrf;
 assert.equal((await call('login',{}, {'X-CSRF-Token':'bad'})).status,403);
 const login=await (await call('login')).text();assert.ok(!login.includes('PRIVATE'));await call('poll');assert.equal(polls,0);time+=5000;
 const auth=await(await call('poll')).text();assert.ok(!auth.includes('PRIVATE'));assert.match(auth,/true/);
 const body={head:'old',content,covers:[]};write=false;assert.equal((await call('commit',body)).status,403);write=true;
 assert.equal((await call('commit',{...body,head:'stale'})).status,409);
 assert.equal((await call('commit',{...body,path:'.github/workflows/x'})).status,400);
 assert.equal((await call('commit',{...body,covers:[{slug:'../bad',base64:'/9j/AA=='}]})).status,400);
 assert.equal((await call('commit',body)).status,200);assert.equal(commits,1);
 const draft=structuredClone(content),slug=draft.series[0].slug;
 draft.series[0].cover=`assets/covers/${slug}.jpg`;
 const upload={slug,base64:'/9j/AA=='};
 assert.equal((await call('commit',{...body,content:draft,covers:[upload]})).status,200);
 assert.deepEqual([...received.keys()],[draft.series[0].cover,'content.json']);
 assert.deepEqual(received.get(draft.series[0].cover),Buffer.from(upload.base64,'base64'));
 assert.deepEqual(JSON.parse(received.get('content.json')),draft);
 for(const covers of [[upload,upload],[{...upload,slug:'missing-story'}],[{...upload,base64:'AAAA'}]])assert.equal((await call('commit',{...body,content:draft,covers})).status,400);
 let release;hold=new Promise(r=>release=r);const pending=call('commit',body);
 while(commits<3)await new Promise(r=>setImmediate(r));
 assert.equal((await call('heartbeat')).status,200);
 assert.equal((await call('commit',body)).status,409);
 assert.equal((await call('logout')).status,200);
 release();assert.equal((await pending).status,200);

 await call('logout');assert.equal((await call('load')).status,403);
});
test('provider only updates an existing draft ref with force false',async()=>{
 const calls=[];const mock=async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({sha:'abc'})};};
 const api=github(config,mock);await api.commit('ghu_TEST',{head:'parent',tree:'base'},new Map([['content.json',Buffer.from('{}')]]));
 const update=calls.at(-1);assert.equal(update.method,'PATCH');assert.match(update.url,/refs\/heads\/admin-drafts%2Fcontent$/);assert.deepEqual(JSON.parse(update.body),{sha:'abc',force:false});
 assert.deepEqual(JSON.parse(calls.at(-2).body).parents,['parent']);
 for(const path of ['build/x.js','.github/workflows/x','assets/app.js','assets/covers/../x.jpg']){const before=calls.length;await assert.rejects(api.commit('ghu_TEST',{head:'parent',tree:'base'},new Map([[path,Buffer.from('x')]])),/Invalid path/);assert.equal(calls.length,before);}
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
