import {validate} from './validate.mjs';
import {inspectCover,exportArchive,MAX_COVER_BYTES} from './covers.mjs';
const covers=new Map();
let data;
let selected=0;
const $=id=>document.getElementById(id);
const message=text=>$('message').textContent=text;
function element(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function field(parent,label,value,change,multiline=false){const l=element('label',label);const input=element(multiline?'textarea':'input');input.value=value??'';input.oninput=()=>change(input.value);l.append(input);parent.append(l);return input;}
function render(){
  const select=$('series');select.replaceChildren();
  data.series.forEach((s,i)=>{const o=element('option',s.title);o.value=i;select.append(o);});select.value=selected;
  const root=$('editor');root.replaceChildren();const s=data.series[selected];if(!s)return;
  field(root,'รหัสเรื่อง (เปลี่ยนไม่ได้หลังสร้าง)',s.slug,()=>{}).disabled=true;
  for(const [k,label] of Object.entries({title:'ชื่อเรื่อง',hook:'ประโยคโปรย',synopsis:'เรื่องย่อ',cover:'พาธไฟล์ปก'}))field(root,label,s[k],v=>s[k]=v,k==='synopsis');
  const upload=element('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.id='cover-upload';
  const uploadLabel=element('label','เลือกปกใหม่ (PNG / JPEG / WebP ไม่เกิน 1 MB)');uploadLabel.append(upload);root.append(uploadLabel);
  upload.onchange=async()=>{try{
    const file=upload.files[0];if(!file)return;
    if(file.size>MAX_COVER_BYTES)throw Error('ปกต้องมีขนาดไม่เกิน 1 MB');
    const bytes=new Uint8Array(await file.arrayBuffer());const checked=inspectCover(bytes,s.slug);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:checked.type}));bitmap.close();
    covers.set(checked.path,{bytes,type:checked.type});s.cover=checked.path;render();
    message('เก็บปกในร่างแล้ว กดส่งออกชุดข้อมูลพร้อมปกเพื่อดาวน์โหลด');
  }catch(e){message(e.message);}};
  if(covers.has(s.cover))root.append(element('p','มีปกใหม่ในร่าง: '+s.cover));
  for(const [k,label] of [['genres','แนว'],['tropes','แท็ก']]){
    const group=element('fieldset');group.append(element('legend',label));
    for(const item of data[k]){const l=element('label',item.label);const c=element('input');c.type='checkbox';c.checked=s[k].includes(item.slug);c.onchange=()=>{s[k]=c.checked?[...s[k],item.slug]:s[k].filter(x=>x!==item.slug);};l.prepend(c);group.append(l);}root.append(group);
  }
  const schedule=element('select');for(const [value,label] of [[ 'ended','จบแล้ว'],['daily','ทุกวัน'],['mon','จันทร์'],['tue','อังคาร'],['wed','พุธ'],['thu','พฤหัสบดี'],['fri','ศุกร์'],['sat','เสาร์'],['sun','อาทิตย์']]){const o=element('option',label);o.value=value;schedule.append(o);}schedule.value=s.releaseDay||'ended';schedule.onchange=()=>{s.status=schedule.value==='ended'?'ended':'ongoing';s.releaseDay=s.status==='ended'?null:schedule.value;};const l=element('label','กำหนดออกตอน');l.append(schedule);root.append(l);
  root.append(element('p','ยอดวิว: ยังไม่มีระบบวัด'));
  const counts=new Map();for(const series of data.series)for(const e of series.episodes)counts.set(e.title,(counts.get(e.title)||0)+1);
  const table=element('table');const header=element('tr');for(const x of ['ตอน','ชื่อตอน','วินาที','ชื่อซ้ำทั้งคลัง'])header.append(element('th',x));table.append(header);
  for(const e of s.episodes){const row=element('tr');row.append(element('td',String(e.n)));for(const k of ['title','durationSec']){const td=element('td');const input=element('input');input.value=e[k];input.setAttribute('aria-label',`${k} ตอน ${e.n}`);if(k==='durationSec')input.type='number';input.oninput=()=>{e[k]=k==='title'?input.value:Number(input.value);};td.append(input);row.append(td);}const n=counts.get(e.title);const status=element('td',n>1?`${n} ครั้ง`:'ไม่ซ้ำ');if(n>1)status.className='duplicate';row.append(status);table.append(row);}root.append(table);
  const refresh=element('button','ตรวจชื่อซ้ำอีกครั้ง');refresh.onclick=render;root.append(refresh);
  const add=element('button','เพิ่มตอน');add.onclick=()=>{s.episodes.push({n:s.episodes.length+1,title:'ตอนใหม่',durationSec:90});s.eps=s.episodes.length;render();};root.append(add);
  const del=element('button','ลบเรื่องนี้');del.onclick=()=>{if(confirm(`ลบเรื่อง ${s.title} จากร่าง?`)){data.series.splice(selected,1);selected=0;render();}};root.append(del);
}
$('series').onchange=()=>{selected=Number($('series').value);render();};
$('add').onclick=()=>{if(!data)return;const slug=prompt('รหัสเรื่องใหม่ เช่น new-series');if(!slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||data.series.some(s=>s.slug===slug)){message('รหัสไม่ถูกต้องหรือซ้ำ');return;}data.series.push({slug,title:'เรื่องใหม่',hook:'',synopsis:'',genres:[],tropes:[],eps:1,status:'ongoing',releaseDay:'daily',cover:`assets/covers/${slug}.webp`,views:null,episodes:[{n:1,title:'ตอนแรก',durationSec:90}]});selected=data.series.length-1;render();};
$('import').onchange=async e=>{try{const candidate=JSON.parse(await e.target.files[0].text());const errors=validate(candidate);if(errors.length)throw Error(errors.join('\n'));if(covers.size&&!confirm('เปิดร่างใหม่และล้างปกที่ยังไม่ได้ส่งออก?'))return;covers.clear();data=candidate;selected=0;render();message('เปิดร่างแล้ว');}catch(e){message(e.message);}};
async function exportDraft(bundle=false){if(!data)return;data.generatedAt=new Date().toISOString();const errors=validate(data);for(const s of data.series){if(covers.has(s.cover))continue;try{const r=await fetch('/'+s.cover,{method:'HEAD'});if(!r.ok)errors.push(`${s.slug}: ไม่พบปก`);}catch{errors.push(`${s.slug}: ตรวจปกไม่ได้`);}}if(errors.length){message(errors.join('\n'));return;}if(!bundle&&data.series.some(s=>covers.has(s.cover))){message('มีปกใหม่ในร่าง กรุณาส่งออกชุดข้อมูลพร้อมปก');return;}
const blob=bundle?exportArchive(data,covers):new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
const url=URL.createObjectURL(blob);const a=element('a');a.href=url;a.download=bundle?'lakorn-content.tar':'content.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('ส่งออกร่างแล้ว ยังไม่ได้บันทึกเข้ารีโป');}
$('export').onclick=()=>exportDraft();
$('export-bundle').onclick=()=>exportDraft(true);
window.addEventListener('beforeunload',e=>{if(covers.size){e.preventDefault();e.returnValue='';}});

try{const response=await fetch('../content.json');if(!response.ok)throw Error('โหลดข้อมูลไม่สำเร็จ');data=await response.json();const errors=validate(data);if(errors.length)throw Error(errors.join('\n'));render();}catch(e){message(e.message);}
