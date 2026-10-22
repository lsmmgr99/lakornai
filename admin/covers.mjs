// Shared byte-level upload boundary; never use a caller-supplied filename.
export const MAX_COVER_BYTES = 1_000_000;
export function inspectCover(bytes, slug) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw Error('รหัสเรื่องไม่ถูกต้อง');
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_COVER_BYTES) throw Error('ปกต้องมีขนาดไม่เกิน 1 MB');
  const has = (offset, expected) => expected.every((v,i) => bytes[offset+i] === v);
  let ext;
  if (has(0,[137,80,78,71,13,10,26,10]) && bytes.length >= 24 && has(12,[73,72,68,82])) ext='png';
  else if (has(0,[255,216,255]) && bytes.length >= 4) ext='jpg';
  else if (bytes.length >= 20 && has(0,[82,73,70,70]) && has(8,[87,69,66,80]) && has(12,[86,80,56])) ext='webp';
  else throw Error('รับเฉพาะข้อมูลภาพ PNG, JPEG หรือ WebP');
  return {path:`assets/covers/${slug}.${ext}`,type:`image/${ext==='jpg'?'jpeg':ext}`};
}

// Portable ustar archive: one download keeps JSON and its new covers together.
export function exportArchive(content, covers) {
  const encoder=new TextEncoder();
  const parts=[];
  const entries=[['content.json',encoder.encode(JSON.stringify(content,null,2)+'\n')]];
  for (const s of content.series) {
    const cover=covers.get(s.cover);
    if (cover) {
      const checked=inspectCover(cover.bytes,s.slug);
      if(checked.path!==s.cover)throw Error('พาธปกไม่ตรงกับข้อมูลภาพ');
      entries.push([checked.path,cover.bytes]);
    }
  }
  for(const [name,bytes] of entries){
    const header=new Uint8Array(512);
    const put=(offset,text)=>header.set(encoder.encode(text),offset);
    const octal=(n,size)=>n.toString(8).padStart(size-1,'0')+'\0';
    put(0,name);put(100,octal(0o644,8));put(108,octal(0,8));put(116,octal(0,8));
    put(124,octal(bytes.length,12));put(136,octal(0,12));put(148,'        ');
    put(156,'0');put(257,'ustar\0');put(263,'00');
    put(148,header.reduce((sum,b)=>sum+b,0).toString(8).padStart(6,'0')+'\0 ');
    parts.push(header,bytes,new Uint8Array((512-bytes.length%512)%512));
  }
  parts.push(new Uint8Array(1024));
  return new Blob(parts,{type:'application/x-tar'});
}
