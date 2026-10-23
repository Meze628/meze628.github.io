export function inspectFont(bytes,preferredName='') {
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const text=(offset,length)=>String.fromCharCode(...data.subarray(offset,offset+length));
  try {
    const collection=text(0,4)==='ttcf',count=collection?view.getUint32(8):1;
    if(!count||count>256)throw new Error();
    const faces=[];
    for(let index=0;index<count;index++){
      const start=collection?view.getUint32(12+index*4):0,tables=view.getUint16(start+4);let name='',fsType=0,nameRank=-1;
      if(!tables||tables>512)throw new Error();
      for(let i=0;i<tables;i++){
        const record=start+12+i*16,tag=text(record,4),offset=view.getUint32(record+8);
        if(tag==='OS/2')fsType=view.getUint16(offset+8);
        if(tag!=='name')continue;
        const records=view.getUint16(offset+2),strings=offset+view.getUint16(offset+4);
        for(let n=0;n<records;n++){
          const item=offset+6+n*12;
          if(view.getUint16(item+6)!==6)continue;
          const platform=view.getUint16(item),language=view.getUint16(item+4),length=view.getUint16(item+8),at=strings+view.getUint16(item+10);
          let value='';
          if(platform===0||platform===3){for(let k=0;k<length;k+=2)value+=String.fromCharCode(view.getUint16(at+k));}
          else value=text(at,length);
          const rank=value===preferredName?200:platform===3&&language===0x409?100:platform===0?60:platform===1?50:40;
          if(rank>nameRank){name=value;nameRank=rank;}
        }
      }
      if(name)faces.push({name,fsType,collection});
    }
    const result=faces.find(face=>face.name===preferredName)||faces[0];
    if(!result)throw new Error();
    return result;
  }catch{throw new Error('无法读取字体，请选择有效的 .ttf、.otf 或 .ttc 文件。');}
}
export function checkEmbedding(face) {
  const rights=face.fsType&0xf;
  if(rights===2)throw new Error('该字体不允许嵌入 PDF，请更换字体。');
  if(face.fsType&0x100)throw new Error('该字体不允许子集嵌入，请更换字体。');
  if(face.fsType&0x200)throw new Error('该字体仅允许位图嵌入，请更换字体。');
  if(rights===4)throw new Error('该字体仅允许受限的打印嵌入，请选择允许文档编辑嵌入的字体。');
}
