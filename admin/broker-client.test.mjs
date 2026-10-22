import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile(new URL('./broker-client.mjs',import.meta.url),'utf8')).replace('export async function','async function');
test('declining remote draft retains edits and saves with remote head; transient heartbeat recovers',async()=>{
 const buttons=Object.fromEntries(['login','save','logout'].map(k=>[k,{disabled:true}]));
 let poll,beat,cleared=false,loaded=false,heartbeatStatus=200,submitted;
 const draft={generatedAt:'old',series:[]};
 const context={structuredClone,document:{getElementById:id=>buttons[id],addEventListener(){}},window:{addEventListener(){}},confirm:()=>false,
 setTimeout:fn=>{poll=fn;},clearTimeout(){},setInterval:fn=>{beat=fn;return 1;},clearInterval(){cleared=true;},
 fetch:async(url,opts)=>{const route=url.split('/').at(-1);const data={session:{csrf:'csrf'},login:{interval:5},poll:{canWrite:true},load:{head:'remote-head',content:{},canWrite:true},commit:{sha:'new',branch:'draft'}};if(route==='commit')submitted=JSON.parse(opts.body);const status=route==='heartbeat'?heartbeatStatus:200;return {ok:status===200,status,json:async()=>data[route]||{error:'error'}};},
 };
 vm.createContext(context);vm.runInContext(source,context);
 await context.connectBroker({getDraft:()=>({content:draft,covers:new Map()}),loadDraft:()=>{loaded=true;},message(){}});
 await buttons.login.onclick();await poll();assert.equal(loaded,false);assert.equal(buttons.save.disabled,false);
 await buttons.save.onclick();assert.equal(submitted.head,'remote-head');assert.equal(submitted.content.series.length,0);
 heartbeatStatus=409;await beat();assert.equal(cleared,false);assert.equal(buttons.save.disabled,false);
 heartbeatStatus=200;await beat();assert.equal(cleared,false);
 heartbeatStatus=403;await beat();assert.equal(cleared,true);assert.equal(buttons.save.disabled,true);
});

for(const canWrite of [true,false])test(`accepting remote draft loads exact content; canWrite=${canWrite}`,async()=>{
 const buttons=Object.fromEntries(['login','save','logout'].map(k=>[k,{disabled:true}]));
 const remote={head:'remote-head',content:{generatedAt:'remote',series:[{title:'กขค'}]},canWrite};
 let poll;const loaded=[];
 const context={structuredClone,document:{getElementById:id=>buttons[id],addEventListener(){}},window:{addEventListener(){}},confirm:()=>true,
 setTimeout:fn=>{poll=fn;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},
 fetch:async url=>({ok:true,json:async()=>({session:{csrf:'csrf'},login:{interval:5},poll:{canWrite},load:remote}[url.split('/').at(-1)])})};
 vm.createContext(context);vm.runInContext(source,context);
 await context.connectBroker({getDraft:()=>{throw Error('unexpected save');},loadDraft:content=>loaded.push(content),message(){}});
 await buttons.login.onclick();await poll();
 assert.equal(loaded.length,1);assert.deepEqual(loaded[0],remote.content);
 assert.equal(buttons.save.disabled,!canWrite);
});

test('save acknowledges only its snapshot after success and preserves concurrent cover edits',async()=>{
 const buttons=Object.fromEntries(['login','save','logout'].map(k=>[k,{disabled:true}]));
 let poll,release,saved,fail=false,submitted;
 const cover={bytes:new Uint8Array([255,216,255,0])},replacement={bytes:new Uint8Array([255,216,255,1])};
 const covers=new Map([['a.jpg',cover],['unused.jpg',cover]]),draft={series:[{slug:'a',cover:'a.jpg',title:'before'}]};
 const context={structuredClone,btoa,document:{getElementById:id=>buttons[id],addEventListener(){}},window:{addEventListener(){}},confirm:()=>false,
 setTimeout:fn=>{poll=fn;},clearTimeout(){},setInterval(){},clearInterval(){},
 fetch:async(url,opts)=>{const route=url.split('/').at(-1);if(route==='commit'){submitted=JSON.parse(opts.body);await new Promise(r=>release=r);return {ok:!fail,status:502,json:async()=>fail?{error:'failed'}:{sha:'new'}};}return {ok:true,json:async()=>({session:{csrf:'csrf'},login:{interval:5},poll:{},load:{head:'old',canWrite:true}}[route])};}};
 vm.createContext(context);vm.runInContext(source,context);
 await context.connectBroker({getDraft:()=>({content:draft,covers}),loadDraft(){},message(){},onSaved:s=>saved=s});
 await buttons.login.onclick();await poll();
 const pending=buttons.save.onclick();draft.series[0].title='after';covers.set('a.jpg',replacement);release();await pending;
 assert.equal(submitted.content.series[0].title,'before');assert.equal(saved.covers.get('a.jpg'),cover);assert.equal(saved.covers.has('unused.jpg'),false);assert.equal(covers.get('a.jpg'),replacement);
 saved=undefined;fail=true;const failed=buttons.save.onclick();release();await failed;assert.equal(saved,undefined);
});
