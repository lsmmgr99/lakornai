import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
// รันโมดูลฝั่งเบราว์เซอร์ใน vm โดยถอด import/export ออก และฉีด coverSlots ให้ตรงกับ covers.mjs
const {coverSlots}=await import('./covers.mjs');
const source=(await readFile(new URL('./broker-client.mjs',import.meta.url),'utf8')).replace(/^import .*$/m,'').replace('export async function','async function');
function harness({fetchData,ask=()=>false,heartbeatStatus=()=>200,onCommit=()=>{}}){
  const buttons=Object.fromEntries(['login','save','logout','publish'].map(k=>[k,{disabled:true,hidden:false}]));
  const timers=[];const intervals=[];let cleared=0;
  const context={structuredClone,btoa,coverSlots,Date,
    document:{getElementById:id=>buttons[id],addEventListener(){},visibilityState:'visible'},window:{addEventListener(){}},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){cleared++;},
    confirm:ask,
    fetch:async(url,opts)=>{const route=url.split('/').at(-1);const body=opts?.body?JSON.parse(opts.body):{};if(route==='commit'||route==='publish')onCommit(route,body);const status=route==='heartbeat'?heartbeatStatus():200;const data=await fetchData(route,body);return {ok:status===200&&!data?.__fail,status:data?.__fail?data.__fail:status,json:async()=>data};}};
  vm.createContext(context);vm.runInContext(source,context);
  return {buttons,timers,intervals,context,get cleared(){return cleared;}};
}
const base={session:{csrf:'csrf',tab:'t',loginEnabled:true,publishBranch:'main',siteUrl:'https://site.test/'},login:{userCode:'AB-CD',verificationUri:'https://github.com/login/device',interval:5},poll:{canWrite:true,user:{login:'ed'}}};

test('declining remote content keeps local edits; save goes to draft with publish head when no draft exists',async()=>{
 const submitted=[];const states=[];const draft={generatedAt:'old',series:[]};let loaded=false;
 const h=harness({fetchData:route=>({...base,load:{publish:{head:'pub-head',content:{x:1},files:[]},draft:null,canWrite:true,user:{login:'ed'}},commit:{sha:'draft-sha',branch:'admin-drafts/content',published:false}})[route]||{},ask:()=>false,onCommit:(r,b)=>submitted.push([r,b])});
 await h.context.connectBroker({getDraft:()=>({content:draft,covers:new Map()}),loadDraft:()=>{loaded=true;},message(){},onState:s=>states.push(s)});
 assert.equal(h.buttons.login.disabled,false);
 await h.buttons.login.onclick();assert.ok(states.some(s=>s.device?.code==='AB-CD'),'ต้องแสดงรหัส device');
 await h.timers.at(-1).fn();
 assert.equal(loaded,false,'ผู้ใช้ปฏิเสธ → ไม่ทับร่างในหน้า');assert.equal(h.buttons.save.disabled,false);assert.equal(h.buttons.publish.disabled,false);
 await h.buttons.save.onclick();
 assert.equal(submitted[0][0],'commit');assert.equal(submitted[0][1].head,'pub-head','ยังไม่มีร่างบน GitHub → ใช้ head ของ branch เผยแพร่เป็นฐาน');assert.equal(submitted[0][1].content.series.length,0);
 await h.buttons.save.onclick();assert.equal(submitted[1][1].head,'draft-sha','ครั้งถัดไปใช้ head ของร่างที่เพิ่งบันทึก');
});

test('accepting the pending draft loads it; publish uses publish head, then watches CI status until success',async()=>{
 const submitted=[];const states=[];const messages=[];const loaded=[];let statusCalls=0;
 const remote={publish:{head:'pub-head',content:{tag:'live',series:[]},files:['assets/covers/a.webp']},draft:{head:'draft-head',content:{tag:'draft',series:[]},files:[]},canWrite:true,user:{login:'ed'}};
 const h=harness({fetchData:route=>{if(route==='status'){statusCalls++;return {runs:statusCalls<2?[{status:'in_progress',url:'u'}]:[{status:'completed',conclusion:'success',url:'u'}],siteUrl:'https://site.test/'};}return ({...base,load:remote,publish:{sha:'a'.repeat(40),branch:'main',published:true,siteUrl:'https://site.test/'}})[route]||{};},ask:()=>true,onCommit:(r,b)=>submitted.push([r,b])});
 await h.context.connectBroker({getDraft:()=>({content:{tag:'draft',series:[]},covers:new Map()}),loadDraft:(c,extra)=>loaded.push([c,extra]),message:m=>messages.push(m),onState:s=>states.push(s)});
 await h.buttons.login.onclick();await h.timers.at(-1).fn();
 assert.equal(JSON.stringify(loaded[0]),JSON.stringify([{tag:'draft',series:[]},{files:[]}]),'ตกลง = โหลดร่างค้าง');
 await h.buttons.publish.onclick();
 assert.equal(submitted[0][0],'publish');assert.equal(submitted[0][1].head,'pub-head');
 await h.timers.at(-1).fn();assert.ok(states.some(s=>s.deploy?.status==='in_progress'));
 await h.timers.at(-1).fn();const done=states.find(s=>s.deploy?.status==='completed');assert.equal(done.deploy.conclusion,'success');
 assert.match(messages.at(-1),/เผยแพร่สำเร็จ.*https:\/\/site\.test\//);
});

test('covers of both kinds are uploaded with slug and kind; failed save leaves pending covers alone',async()=>{
 const submitted=[];let saved;let fail=false;
 const cover={bytes:new Uint8Array([255,216,255,0])},wide={bytes:new Uint8Array([82,73,70,70])};
 const covers=new Map([['assets/covers/a.jpg',cover],['assets/covers-wide/a.webp',wide],['assets/covers/unused.jpg',cover]]);
 const draft={series:[{slug:'a',cover:'assets/covers/a.jpg',coverWide:'assets/covers-wide/a.webp'}]};
 const h=harness({fetchData:route=>route==='commit'?(fail?{__fail:502,error:'failed'}:{sha:'new',branch:'d'}):({...base,load:{publish:{head:'old',content:{},files:[]},draft:null,canWrite:true}})[route]||{},ask:()=>false,onCommit:(r,b)=>submitted.push(b)});
 await h.context.connectBroker({getDraft:()=>({content:draft,covers}),loadDraft(){},message(){},onSaved:s=>saved=s});
 await h.buttons.login.onclick();await h.timers.at(-1).fn();
 await h.buttons.save.onclick();
 assert.deepEqual(submitted[0].covers.map(c=>[c.slug,c.kind]),[['a','poster'],['a','wide']]);
 assert.equal(submitted[0].covers[0].base64,btoa(String.fromCharCode(255,216,255,0)));
 assert.ok(saved.covers.has('assets/covers-wide/a.webp'));assert.equal(saved.covers.has('assets/covers/unused.jpg'),false,'ปกที่ไม่มีเรื่องอ้างไม่ถูกนับว่าบันทึกแล้ว');
 saved=undefined;fail=true;await h.buttons.save.onclick();assert.equal(saved,undefined);assert.equal(h.buttons.save.disabled,false,'ล้มแล้วยังกดซ้ำได้');
});

test('read-only account cannot save or publish; heartbeat 403 locks the panel; no GitHub App disables login',async()=>{
 let hb=200;
 const h=harness({fetchData:route=>({...base,poll:{canWrite:false,user:{login:'ro'}},load:{publish:{head:'h',content:{},files:[]},draft:null,canWrite:false,user:{login:'ro'}}})[route]||{},ask:()=>true,heartbeatStatus:()=>hb});
 const states=[];await h.context.connectBroker({getDraft:()=>{throw Error('unexpected');},loadDraft(){},message(){},onState:s=>states.push(s)});
 await h.buttons.login.onclick();await h.timers.at(-1).fn();
 assert.equal(h.buttons.save.disabled,true);assert.equal(h.buttons.publish.disabled,true);assert.equal(states.at(-1).canWrite,false);
 hb=409;await h.intervals[0]();assert.equal(h.cleared,0);
 hb=403;await h.intervals[0]();assert.ok(h.cleared>0);assert.ok(states.some(s=>s.mode==='expired'));
 const noApp=harness({fetchData:route=>route==='session'?{...base.session,loginEnabled:false}:{}});
 const msgs=[];await noApp.context.connectBroker({getDraft(){},loadDraft(){},message:m=>msgs.push(m)});
 assert.equal(noApp.buttons.login.disabled,true);assert.match(msgs[0],/GitHub App/);
});
