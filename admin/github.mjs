// Provider credentials never leave this module's caller-owned in-memory session.
export function github(config, fetcher=fetch) {
  const repo=`/repos/${config.owner}/${config.repo}`;
  async function request(url, token, method='GET', body) {
    const r=await fetcher(url,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2026-03-10'}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(!r.ok)throw Error(`GitHub request failed (${r.status})`);
    return r.json();
  }
  const api=(token,p,method,body)=>request('https://api.github.com'+p,token,method,body);
  return {
    start:()=>request('https://github.com/login/device/code',null,'POST',{client_id:config.clientId}),
    poll:code=>request('https://github.com/login/oauth/access_token',null,'POST',{client_id:config.clientId,device_code:code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}),
    async permission(token){
      const r=await api(token,repo);
      if(r.default_branch===config.branch)throw Error('Target is default branch');
      return r.permissions?.push===true;
    },
    async snapshot(token){
      const ref=await api(token,`${repo}/git/ref/heads/${encodeURIComponent(config.branch)}`);
      const commit=await api(token,`${repo}/git/commits/${ref.object.sha}`);
      const tree=await api(token,`${repo}/git/trees/${commit.tree.sha}?recursive=1`);
      if(tree.truncated)throw Error('Tree too large');
      const file=await api(token,`${repo}/contents/content.json?ref=${ref.object.sha}`);
      return {head:ref.object.sha,tree:commit.tree.sha,entries:tree.tree,content:JSON.parse(Buffer.from(file.content,'base64').toString('utf8'))};
    },
    async commit(token,snapshot,files){
      const tree=[];
      for(const [path,bytes] of files){
        if(path!=='content.json'&&!/^assets\/covers\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpg|webp)$/.test(path))throw Error('Invalid path');
        const blob=await api(token,`${repo}/git/blobs`,'POST',{encoding:'base64',content:Buffer.from(bytes).toString('base64')});
        tree.push({path,mode:'100644',type:'blob',sha:blob.sha});
      }
      const next=await api(token,`${repo}/git/trees`,'POST',{base_tree:snapshot.tree,tree});
      const commit=await api(token,`${repo}/git/commits`,'POST',{message:'Update AiLakorn content draft',tree:next.sha,parents:[snapshot.head]});
      await api(token,`${repo}/git/refs/heads/${encodeURIComponent(config.branch)}`,'PATCH',{sha:commit.sha,force:false});
      return commit.sha;
    }
  };
}
