import {FONT_FAMILIES,MONO_FONT} from './font-manifest.mjs';

function contains(ranges,point) {
  let lo=0,hi=ranges.length-1;
  while(lo<=hi){const mid=(lo+hi)>>1,[start,end]=ranges[mid];if(point<start)hi=mid-1;else if(point>end)lo=mid+1;else return true;}
  return false;
}
export function fontTier(text,face) {
  let result='latin';
  for(const character of new Set(text)){
    const point=character.codePointAt(0);
    if(!contains(face.coverage.full,point)||contains(face.coverage.latin,point))continue;
    if(!contains(face.coverage.common,point))return 'full';
    result='common';
  }
  return result;
}
export function fontPlan(tokens,source,settings,{warmup=false}={}) {
  const family=FONT_FAMILIES[settings.font==='serif'?'serif':'sans'];
  let mono=false,boldText='',bold=false;
  function walk(tokens,inBold=false){
    for(const token of tokens||[]){
      const strong=inBold||token.type==='strong'||token.type==='heading';
      if(strong&&typeof token.text==='string'){bold=true;boldText+=token.text;}
      if(token.type==='code'||token.type==='codespan')mono=true;
      walk(token.tokens,strong);walk(token.items,strong);
      if(Array.isArray(token.header))for(const cell of token.header){bold=true;boldText+=cell.text||'';walk(cell.tokens,true);}
      for(const row of token.rows||[])for(const cell of row)walk(cell.tokens,strong);
    }
  }
  walk(tokens);
  const choose=(text,face)=>{let tier=fontTier(text,face);if(warmup&&tier==='full')tier='common';return face[tier];};
  return {regular:choose(source+(settings.header||''),family.regular),bold:bold?choose(boldText,family.bold):null,mono:mono?MONO_FONT:null};
}
