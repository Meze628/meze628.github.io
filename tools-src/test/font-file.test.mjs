import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFont,checkEmbedding} from '../src/font-file.mjs';
const regular=new Uint8Array(readFileSync(new URL('../../static/tools-assets/fonts-pdf/code-regular.ttf',import.meta.url)));

test('读取真实字体名称与嵌入许可',()=>{
  const face=inspectFont(regular);assert.equal(face.name,'MezeCodeRegular');assert.equal(face.collection,false);checkEmbedding(face);
});
test('支持字体集合中绝对偏移的字体表',()=>{
  const data=new Uint8Array(20+regular.length),view=new DataView(data.buffer);
  data.set([116,116,99,102]);view.setUint32(4,0x10000);view.setUint32(8,1);view.setUint32(12,20);data.set(regular,20);
  const tables=view.getUint16(24);for(let i=0;i<tables;i++){const at=20+12+i*16+8;view.setUint32(at,view.getUint32(at)+20);}
  const face=inspectFont(data);assert.equal(face.name,'MezeCodeRegular');assert.equal(face.collection,true);
});
test('拒绝损坏字体及不支持的嵌入方式',()=>{
  assert.throws(()=>inspectFont(new Uint8Array(8)),/无法读取字体/);
  assert.throws(()=>checkEmbedding({fsType:2}),/不允许嵌入/);
  assert.throws(()=>checkEmbedding({fsType:0x108}),/子集/);
  checkEmbedding({fsType:8});checkEmbedding({fsType:0});
});
