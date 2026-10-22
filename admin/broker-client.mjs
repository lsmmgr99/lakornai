export async function connectBroker({getDraft,loadDraft,message}) {
  let csrf,head,timer;
  const login=document.getElementById('login'),save=document.getElementById('save'),logout=document.getElementById('logout');
  async function api(route,body={}){const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error);return result;}
  try{const session=await api('session');csrf=session.csrf;login.disabled=false;}catch{return;}
  const heartbeat=setInterval(()=>api('heartbeat').catch(()=>{save.disabled=true;clearInterval(heartbeat);message('หมดเวลาการเชื่อมต่อ กรุณาโหลดหน้าใหม่ ส่งออกร่างก่อนโหลดใหม่');}),20000);
  window.addEventListener('pagehide',()=>{clearInterval(heartbeat);clearTimeout(timer);fetch('/api/logout',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:'{}'}).catch(()=>{});});
  login.onclick=async()=>{try{
    save.disabled=true;login.disabled=true;const d=await api('login');
    message(`เปิด ${d.verificationUri} และใส่รหัส ${d.userCode}`);
    async function poll(){try{const result=await api('poll');if(result.pending){timer=setTimeout(poll,result.interval);return;}
      logout.disabled=false;login.disabled=false;
      if(!confirm('เข้าสู่ระบบแล้ว โหลดข้อมูลจาก branch ร่างแทนร่างในหน้าหรือไม่? กรุณาส่งออกร่างเดิมก่อนหากยังไม่ได้เก็บ'))return;
      const remote=await api('load');loadDraft(remote.content);head=remote.head;save.disabled=!remote.canWrite;
      message(remote.canWrite?'โหลด branch ร่างแล้ว บันทึกได้โดยยังไม่เผยแพร่':'บัญชีนี้ไม่มีสิทธิ์เขียนรีโป ยังแก้และส่งออกร่างได้');
    }catch(e){login.disabled=false;message(e.message);}}
    timer=setTimeout(poll,d.interval);
  }catch(e){login.disabled=false;message(e.message);}};
  logout.onclick=async()=>{clearTimeout(timer);save.disabled=true;try{await api('logout');message('ออกจากระบบแล้ว ส่งออกร่างได้ตามปกติ โหลดหน้าใหม่เพื่อเข้าสู่ระบบอีกครั้ง');}catch(e){message(e.message);}login.disabled=true;logout.disabled=true;clearInterval(heartbeat);};
  save.onclick=async()=>{save.disabled=true;try{
    const {content,covers}=getDraft();content.generatedAt=new Date().toISOString();
    const uploads=[];for(const s of content.series){const c=covers.get(s.cover);if(c){let binary='';for(const b of c.bytes)binary+=String.fromCharCode(b);uploads.push({slug:s.slug,base64:btoa(binary)});}}
    const result=await api('commit',{head,content,covers:uploads});head=result.sha;message(`บันทึก ${result.sha} ใน ${result.branch} แล้ว ยังไม่ได้เผยแพร่`);
  }catch(e){message(e.message);}finally{save.disabled=false;}};
}
