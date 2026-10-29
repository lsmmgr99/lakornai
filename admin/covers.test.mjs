import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectCover,exportArchive,coverSlots,sniffImage,MAX_COVER_BYTES,MAX_WIDE_BYTES} from './covers.mjs';
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
test('derive path from slug, kind and actual bytes',()=>{
 assert.deepEqual(inspectCover(png,'new-series'),{path:'assets/covers/new-series.png',type:'image/png',kind:'poster'});
 assert.deepEqual(inspectCover(png,'new-series','wide'),{path:'assets/covers-wide/new-series.png',type:'image/png',kind:'wide'});
 assert.equal(inspectCover(Uint8Array.of(255,216,255,224),'s').type,'image/jpeg');
 const webp=new Uint8Array(20);webp.set(Buffer.from('RIFF'));webp.set(Buffer.from('WEBPVP8 '),8);
 assert.equal(inspectCover(webp,'s').type,'image/webp');
 assert.equal(sniffImage(Uint8Array.from(Buffer.from('<svg/>'))),null);
});
test('reject unsafe paths, invalid signatures, empty and oversized uploads per kind',()=>{
 for(const slug of ['../x','a/b','A','a.png','']) assert.throws(()=>inspectCover(png,slug));
 for(const bytes of [new Uint8Array(),new Uint8Array(MAX_COVER_BYTES+1),Uint8Array.from(Buffer.from('<svg/>')),png.slice(0,8)])assert.throws(()=>inspectCover(bytes,'s'));
 const big=new Uint8Array(MAX_WIDE_BYTES+1);big.set(png);
 assert.throws(()=>inspectCover(big,'s','wide'),/300 KB/);
 assert.ok(inspectCover(big,'s').path.startsWith('assets/covers/'),'ปก 2:3 ยอมถึง 1 MB');
 assert.throws(()=>inspectCover(png,'s','banner'));
});
test('coverSlots lists both covers when present',()=>{
 assert.deepEqual(coverSlots({cover:'assets/covers/a.webp'}),[['poster','assets/covers/a.webp']]);
 assert.deepEqual(coverSlots({cover:'assets/covers/a.webp',coverWide:'assets/covers-wide/a.webp'}),[['poster','assets/covers/a.webp'],['wide','assets/covers-wide/a.webp']]);
 assert.deepEqual(coverSlots({cover:'assets/covers/a.webp',coverWide:null}),[['poster','assets/covers/a.webp']]);
});
test('tar is extractable with JSON, poster and wide covers, and only referenced files',async()=>{
 const content={series:[{slug:'s',cover:'assets/covers/s.png',coverWide:'assets/covers-wide/s.png'}]};
 const covers=new Map([['assets/covers/s.png',{bytes:png}],['assets/covers-wide/s.png',{bytes:png}],['assets/covers/unused.png',{bytes:png}]]);
 const dir=mkdtempSync(join(tmpdir(),'admin-cover-test-'));
 try{
  const file=join(dir,'bundle.tar');writeFileSync(file,new Uint8Array(await exportArchive(content,covers).arrayBuffer()));
  assert.deepEqual(execFileSync('tar',['-tf',file],{encoding:'utf8'}).trim().split('\n'),['content.json','assets/covers/s.png','assets/covers-wide/s.png']);
  execFileSync('tar',['-xf',file,'-C',dir]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'content.json'))),content);
  assert.deepEqual(new Uint8Array(readFileSync(join(dir,'assets/covers-wide/s.png'))),png);
  content.series[0].slug='other';assert.throws(()=>exportArchive(content,covers));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
