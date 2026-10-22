import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicFiles=new Set(['/admin/index.html','/admin/editor.mjs','/admin/validate.mjs','/admin/style.css','/content.json']);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname.replace(/^\/admin\/$/,'/admin/index.html');
  if(!['GET','HEAD'].includes(req.method)||(!publicFiles.has(p)&&!/^\/assets\/covers\/[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/.test(p))){res.writeHead(404).end();return;}
  const file=path.join(root,p);if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':types[path.extname(file)],'x-content-type-options':'nosniff','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
}).listen(Number(process.argv[2])||4190,'127.0.0.1',()=>console.log('Admin draft: http://127.0.0.1:4190/admin/'));
