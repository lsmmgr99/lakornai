import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {github} from './github.mjs';
import {validate} from './validate.mjs';
import {inspectCover} from './covers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const nonce=()=>randomBytes(32).toString('hex');
const fail=(status)=>{throw Object.assign(Error('Request rejected'),{status});};
export function checkConfig(c){
  if(!/^[A-Za-z0-9_-]+$/.test(c.clientId||'')||!/^[-A-Za-z0-9]+$/.test(c.owner||'')||!/^[-A-Za-z0-9_.]+$/.test(c.repo||''))throw Error('App/repository configuration required');
  if(!/^admin-drafts\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.branch||'')||!Array.isArray(c.publishBranches)||!c.publishBranches.length||c.publishBranches.includes(c.branch))throw Error('Explicit non-publish draft branch required');
}
export function createBroker(config,{provider,now=Date.now}={}){
  checkConfig(config);provider??=github(config);
  const sessions=new Map();
  const sweep=setInterval(()=>{for(const [id,s]of sessions)if(now()-s.seen>300000||now()>s.expires)sessions.delete(id);},10000);sweep.unref();
  const server=http.createServer(async(req,res)=>{
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(body));};
    try{
      const host=`127.0.0.1:${server.address().port}`,origin=`http://${host}`;
      if(req.headers.host!==host||(req.headers.origin&&req.headers.origin!==origin))fail(403);
      const p=req.url;
      if(!p.startsWith('/api/')){
        if(!['GET','HEAD'].includes(req.method))fail(405);
        if(req.headers['sec-fetch-site']==='cross-site')fail(403);
        const name=p==='/admin/'?'/admin/index.html':p;
        const files=['/admin/index.html','/admin/editor.mjs','/admin/broker-client.mjs','/admin/covers.mjs','/admin/validate.mjs','/admin/style.css','/content.json'];
        if(!files.includes(name)&&!/^\/assets\/covers\/[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/.test(name))fail(404);
        const file=await realpath(path.join(root,name));if(!file.startsWith(root))fail(404);
        const bytes=await readFile(file);const ext=path.extname(file);
        res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:bytes);return;
      }
      // API uses POST even for reads, so Origin is always present in browsers.
      if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json')fail(403);
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>18000000)fail(413);chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}catch{fail(400);}
      let id=req.headers.cookie?.split(/;\s*/).find(x=>x.startsWith('lakorn_session='))?.slice(15),s=sessions.get(id);
      if(s&&(now()-s.seen>300000||now()>s.expires)){sessions.delete(id);s=null;}
      if(p==='/api/session'){
        if(!s){if(sessions.size>=32)fail(429);id=nonce();s={csrf:nonce(),seen:now(),expires:now()+8*3600000};sessions.set(id,s);}
        res.setHeader('Set-Cookie',`lakorn_session=${id}; HttpOnly; SameSite=Strict; Path=/`);
        send(200,{csrf:s.csrf,branch:config.branch});return;
      }
      if(!s||req.headers['x-csrf-token']!==s.csrf)fail(403);
      s.seen=now();
        if(p==='/api/logout'){sessions.delete(id);res.setHeader('Set-Cookie','lakorn_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(200,{});return;}
        if(p==='/api/heartbeat'){send(200,{});return;}
      if(s.busy)fail(409);s.busy=true;
      try{
        if(p==='/api/login'){
          delete s.token;delete s.device;
          const d=await provider.start();
          if(!d.device_code||!d.user_code||!Number.isFinite(d.expires_in)||!Number.isFinite(d.interval))fail(502);
          s.device={code:d.device_code,expires:now()+d.expires_in*1000,interval:Math.max(5,d.interval)*1000,next:now()+Math.max(5,d.interval)*1000};
          send(200,{userCode:d.user_code,verificationUri:'https://github.com/login/device',interval:s.device.interval});return;
        }
        if(p==='/api/poll'){
          const d=s.device;if(!d||now()>=d.expires){delete s.device;fail(401);}if(now()<d.next){send(200,{pending:true,interval:d.next-now()});return;}
          d.next=now()+d.interval;const result=await provider.poll(d.code);
          if(result.error){if(['authorization_pending','slow_down'].includes(result.error)){if(result.error==='slow_down')d.interval+=5000;d.next=now()+d.interval;send(200,{pending:true,interval:d.interval});return;}delete s.device;fail(401);}
          delete s.device;if(!result.access_token?.startsWith('ghu_'))fail(502);
          s.token=result.access_token;s.expires=Math.min(s.expires,now()+(result.expires_in||28800)*1000);
          const canWrite=await provider.permission(s.token);send(200,{canWrite});return;
        }
        if(!s.token)fail(401);
        if(p==='/api/load'){const snapshot=await provider.snapshot(s.token);send(200,{head:snapshot.head,content:snapshot.content,canWrite:await provider.permission(s.token)});return;}
        if(p==='/api/commit'){
          if(!await provider.permission(s.token))fail(403);
          if(!body||Object.keys(body).some(k=>!['head','content','covers'].includes(k))||validate(body.content).length||!Array.isArray(body.covers))fail(400);
          const snapshot=await provider.snapshot(s.token);if(body.head!==snapshot.head)fail(409);
          const files=new Map();
          for(const cover of body.covers){
            if(typeof cover.base64!=='string'||cover.base64.length>1333336||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(cover.base64))fail(400);
            const bytes=Buffer.from(cover.base64,'base64');let checked;try{checked=inspectCover(bytes,cover.slug);}catch{fail(400);}
            if(!body.content.series.some(x=>x.slug===cover.slug&&x.cover===checked.path)||files.has(checked.path))fail(400);files.set(checked.path,bytes);
          }
          const existing=new Set(snapshot.entries.filter(e=>e.type==='blob'&&e.mode==='100644').map(e=>e.path));
          if(validate(body.content,{coverExists:p=>files.has(p)||existing.has(p)}).length)fail(400);
          if(body.content.meta.viewsSource!=='none')fail(400);
          files.set('content.json',Buffer.from(JSON.stringify(body.content,null,2)+'\n'));
          const sha=await provider.commit(s.token,snapshot,files);send(200,{sha,branch:config.branch});return;
        }
        fail(404);
      }finally{s.busy=false;}
    }catch(e){send(e.status||502,{error:e.status===409?'ข้อมูลเปลี่ยนหรือคำขอก่อนหน้ายังทำงาน กรุณาโหลดใหม่':'คำขอไม่สำเร็จ กรุณาตรวจการตั้งค่าหรือเข้าสู่ระบบใหม่'});}
  });
  server.on('close',()=>{sessions.clear();clearInterval(sweep);});
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const config={clientId:process.env.LAKORN_APP_CLIENT_ID,owner:process.env.LAKORN_REPO_OWNER,repo:process.env.LAKORN_REPO_NAME,branch:process.env.LAKORN_DRAFT_BRANCH,publishBranches:process.env.LAKORN_PUBLISH_BRANCHES?.split(',')};
  createBroker(config).listen(4190,'127.0.0.1',()=>console.log('LakornAI broker: http://127.0.0.1:4190/admin/'));
}
