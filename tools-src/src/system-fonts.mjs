import {inspectFont,checkEmbedding} from './font-file.mjs';

export const YAHEI_NAMES=Object.freeze([
  'MicrosoftYaHei','MicrosoftYaHei-Regular','MicrosoftYaHeiRegular','MicrosoftYaHei-Bold','MicrosoftYaHeiBold',
  'MicrosoftYaHeiUI','MicrosoftYaHeiUI-Regular','MicrosoftYaHeiUIRegular','MicrosoftYaHeiUI-Bold','MicrosoftYaHeiUIBold',
]);

export async function readInstalledYahei(queryLocalFonts) {
  if(typeof queryLocalFonts!=='function')throw new Error('自动读取微软雅黑需使用电脑版 Chrome 或 Edge。');
  // Call within the selecting click, before any storage work can consume activation.
  const fonts=await queryLocalFonts({postscriptNames:[...YAHEI_NAMES]});
  const bold=font=>/bold|粗体|粗體/i.test((font.postscriptName||'')+' '+(font.style||''));
  const ui=font=>/yaheiui/i.test((font.postscriptName||'').replace(/[\s_-]/g,''));
  const candidates=fonts.filter(font=>YAHEI_NAMES.includes(font.postscriptName));
  const regular=candidates.filter(font=>!bold(font)).sort((a,b)=>Number(ui(a))-Number(ui(b))||YAHEI_NAMES.indexOf(a.postscriptName)-YAHEI_NAMES.indexOf(b.postscriptName))[0];
  if(!regular)throw new Error('系统中未找到微软雅黑，请确认电脑已安装该字体。');
  const strong=candidates.find(font=>bold(font)&&ui(font)===ui(regular));
  async function load(font,isBold){
    const blob=await font.blob();
    if(blob.size>40*1024*1024)throw new Error('系统字体超过 40 MB，无法载入。');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    // FontData's Windows alias can differ from the English name used by PDFKit.
    const face=inspectFont(bytes,`MicrosoftYaHei${ui(font)?'UI':''}${isBold?'-Bold':''}`);
    checkEmbedding(face);return {bytes,name:face.name};
  }
  const [normal,heavy]=await Promise.all([load(regular,false),strong?load(strong,true):null]);
  return {source:'system',regular:normal.bytes,regularName:normal.name,bold:heavy?.bytes,boldName:heavy?.name};
}

export function createFontCache(indexedDB) {
  function open(){
    return new Promise((resolve,reject)=>{
      if(!indexedDB){reject(new Error('Font cache unavailable'));return;}
      let expired=false;
      const request=indexedDB.open('meze.tools.local-fonts',1);
      const timer=setTimeout(()=>{expired=true;reject(new Error('Font cache timed out'));},2500);
      request.onupgradeneeded=()=>request.result.createObjectStore('fonts');
      request.onblocked=()=>{clearTimeout(timer);expired=true;reject(new Error('Font cache blocked'));};
      request.onerror=()=>{clearTimeout(timer);reject(request.error);};
      request.onsuccess=()=>{clearTimeout(timer);if(expired)request.result.close();else resolve(request.result);};
    });
  }
  async function access(mode,operation){
    const database=await open();
    try{return await new Promise((resolve,reject)=>{
      const transaction=database.transaction('fonts',mode),request=operation(transaction.objectStore('fonts'));
      const timer=setTimeout(()=>{transaction.abort();reject(new Error('Font cache timed out'));},2500);
      transaction.oncomplete=()=>{clearTimeout(timer);resolve(request.result);};
      transaction.onabort=transaction.onerror=()=>{clearTimeout(timer);reject(transaction.error||new Error('Font cache failed'));};
    });}finally{database.close();}
  }
  return {
    read:()=>access('readonly',store=>store.get('yahei')),
    write:font=>access('readwrite',store=>store.put({...font,version:1},'yahei')),
    clear:()=>access('readwrite',store=>store.delete('yahei')),
  };
}

export async function restoreCachedYahei(cache,queryPermission) {
  const record=await cache.read();
  if(!record||record.version!==1||!record.regular)return null;
  if(record.source==='system'){
    let granted=false;
    try{granted=(await queryPermission?.({name:'local-fonts'}))?.state==='granted';}catch{}
    if(!granted){await cache.clear();return null;}
  }else if(record.source!=='file')return null;
  return record;
}
