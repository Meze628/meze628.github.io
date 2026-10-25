import {FONT_FAMILIES,MONO_FONT} from './font-manifest.mjs';

export function contains(ranges,point) {
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
  let mono=false,boldText='',bold=false,math=false;
  function walk(tokens,inBold=false){
    for(const token of tokens||[]){
      const strong=inBold||token.type==='strong'||token.type==='heading';
      if(strong&&typeof token.text==='string'){bold=true;boldText+=token.text;}
      if(token.type==='code'||token.type==='codespan')mono=true;
      if(token.type==='mathInline'||token.type==='mathBlock')math=true;
      walk(token.tokens,strong);walk(token.items,strong);
      if(Array.isArray(token.header))for(const cell of token.header){bold=true;boldText+=cell.text||'';walk(cell.tokens,true);}
      for(const row of token.rows||[])for(const cell of row)walk(cell.tokens,strong);
    }
  }
  walk(tokens);
  const frontMatter=tokens[0]?.type==='frontMatter'?tokens[0]:null;
  const visibleSource=frontMatter?frontMatter.tokens.map(token=>token.text).join('\n')+source.slice(frontMatter.raw.length):source;
  const choose=(text,face,isBold=false)=>{
    let tier=fontTier(text,face);
    if(tier==='full'&&!warmup)return [face.full];
    const points=[...new Set(text)].map(character=>character.codePointAt(0));
    const primary=tier==='latin'||isBold?face.latin:face.core;
    const needed=points.filter(point=>contains(face.coverage.common,point)&&!contains(primary.coverage,point));
    return [primary,...face.shards.filter(shard=>needed.some(point=>contains(shard.coverage,point)))];
  };
  const local=['custom','yahei'].includes(settings.font);
  return {regular:local?[]:choose(visibleSource+(settings.header||''),family.regular),bold:local||!bold?[]:choose(boldText,family.bold,true),mono:mono?MONO_FONT:null,math};
}
export const fontFiles=plan=>[...plan.regular,...plan.bold,plan.mono].filter(Boolean);
