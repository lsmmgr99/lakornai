import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectCover,exportArchive,MAX_COVER_BYTES} from './covers.mjs';
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
test('derive path from slug and actual bytes',()=>{
 assert.deepEqual(inspectCover(png,'new-series'),{path:'assets/covers/new-series.png',type:'image/png'});
 assert.equal(inspectCover(Uint8Array.of(255,216,255,224),'s').type,'image/jpeg');
 const webp=new Uint8Array(20);webp.set(Buffer.from('RIFF'));webp.set(Buffer.from('WEBPVP8 '),8);
 assert.equal(inspectCover(webp,'s').type,'image/webp');
});
test('reject unsafe paths, invalid signatures, empty and oversized uploads',()=>{
 for(const slug of ['../x','a/b','A','a.png','']) assert.throws(()=>inspectCover(png,slug));
 for(const bytes of [new Uint8Array(),new Uint8Array(MAX_COVER_BYTES+1),Uint8Array.from(Buffer.from('<svg/>')),png.slice(0,8)])assert.throws(()=>inspectCover(bytes,'s'));
});
test('tar is extractable with JSON and only referenced covers',async()=>{
 const content={series:[{slug:'s',cover:'assets/covers/s.png'}]};
 const covers=new Map([['assets/covers/s.png',{bytes:png}],['assets/covers/unused.png',{bytes:png}]]);
 const dir=mkdtempSync(join(tmpdir(),'admin-cover-test-'));
 try{
  const file=join(dir,'bundle.tar');writeFileSync(file,new Uint8Array(await exportArchive(content,covers).arrayBuffer()));
  assert.deepEqual(execFileSync('tar',['-tf',file],{encoding:'utf8'}).trim().split('\n'),['content.json','assets/covers/s.png']);
  execFileSync('tar',['-xf',file,'-C',dir]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'content.json'))),content);
  assert.deepEqual(new Uint8Array(readFileSync(join(dir,'assets/covers/s.png'))),png);
  content.series[0].slug='other';assert.throws(()=>exportArchive(content,covers));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
