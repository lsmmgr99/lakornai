export async function connectBroker({getDraft,loadDraft,message,onSaved=()=>{}}) {
  let csrf,tab,head,timer,active=true;
  const login=document.getElementById('login'),save=document.getElementById('save'),logout=document.getElementById('logout');
  async function api(route,body={}){const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Object.assign(Error(result.error),{status:r.status});return result;}
  try{const session=await api('session');csrf=session.csrf;tab=session.tab;login.disabled=false;}catch{return;}
  const beat=()=>active&&api('heartbeat').catch(e=>{if(e.status===403){active=false;save.disabled=true;clearInterval(heartbeat);clearTimeout(timer);message('หมดเวลาการเชื่อมต่อ กรุณาส่งออกร่างก่อนโหลดใหม่');}else message('เชื่อมต่อ broker ไม่สำเร็จ จะลองใหม่อัตโนมัติ');});
  let heartbeat=setInterval(beat,20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')beat();});
  window.addEventListener('pagehide',()=>{clearInterval(heartbeat);clearTimeout(timer);fetch('/api/close-tab',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({tab})}).catch(()=>{});});
  window.addEventListener('pageshow',async e=>{if(!e.persisted)return;try{const session=await api('session');csrf=session.csrf;tab=session.tab;active=true;save.disabled=true;login.disabled=false;heartbeat=setInterval(beat,20000);message('กลับมาเปิดแผงแล้ว กรุณาเข้าสู่ระบบก่อนบันทึก ร่างยังอยู่ครบ');}catch(e){message(e.message);}});
  login.onclick=async()=>{try{
    save.disabled=true;login.disabled=true;const d=await api('login');
    message(`เปิด ${d.verificationUri} และใส่รหัส ${d.userCode}`);
    async function poll(){try{const result=await api('poll');if(result.pending){timer=setTimeout(poll,result.interval);return;}
      logout.disabled=false;login.disabled=false;
      const remote=await api('load');head=remote.head;
      if(confirm('เข้าสู่ระบบแล้ว โหลดข้อมูลจาก branch ร่างแทนร่างในหน้าหรือไม่? กรุณาส่งออกร่างเดิมก่อนหากยังไม่ได้เก็บ'))loadDraft(remote.content);
      save.disabled=!remote.canWrite;
      message(remote.canWrite?'เชื่อมต่อ branch ร่างแล้ว บันทึกได้โดยยังไม่เผยแพร่':'บัญชีนี้ไม่มีสิทธิ์เขียนรีโป ยังแก้และส่งออกร่างได้');
    }catch(e){login.disabled=false;message(e.message);}}
    timer=setTimeout(poll,d.interval);
  }catch(e){login.disabled=false;message(e.message);}};
  logout.onclick=async()=>{active=false;clearTimeout(timer);save.disabled=true;try{await api('logout');message('ออกจากระบบแล้ว ส่งออกร่างได้ตามปกติ โหลดหน้าใหม่เพื่อเข้าสู่ระบบอีกครั้ง');}catch(e){message(e.message);}login.disabled=true;logout.disabled=true;clearInterval(heartbeat);};
  save.onclick=async()=>{save.disabled=true;try{
    const draft=getDraft();const content=structuredClone(draft.content),covers=new Map(draft.covers);content.generatedAt=new Date().toISOString();
    const uploads=[];for(const s of content.series){const c=covers.get(s.cover);if(c){let binary='';for(const b of c.bytes)binary+=String.fromCharCode(b);uploads.push({slug:s.slug,base64:btoa(binary)});}}
    const result=await api('commit',{head,content,covers:uploads});head=result.sha;onSaved({content,covers:new Map([...covers].filter(([path])=>content.series.some(s=>s.cover===path)))});message(`บันทึก ${result.sha} ใน ${result.branch} แล้ว ยังไม่ได้เผยแพร่`);
  }catch(e){message(e.message);}finally{save.disabled=!active;}};
}
