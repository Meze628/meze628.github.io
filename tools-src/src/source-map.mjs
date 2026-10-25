export function indexSource(tokens,source) {
  function walk(items,start,end) {
    let cursor=start;
    for(const token of items||[]){
      const raw=token.raw??token.text??'';
      let position=raw?source.indexOf(raw,cursor):cursor;
      let finish=position+raw.length;
      if(token.sourceRange){
        [position,finish]=token.sourceRange;
      }else if(position<cursor||finish>end){
        const lines=raw.split('\n').map(line=>line.replace(/^\s*(?:>\s*)*(?:(?:[-+*]|\d+[.)])\s+)?/,'').trim()).filter(Boolean);
        position=lines.length?source.indexOf(lines[0],cursor):cursor;
        if(position<cursor||position>=end)position=cursor;
        const last=lines.length>1?source.indexOf(lines.at(-1),position+lines[0].length):position;
        finish=last>=position?last+(lines.at(-1)?.length||raw.length):position+raw.length;
      }
      token.sourceStart=Math.max(start,Math.min(position,end));
      token.sourceEnd=Math.max(token.sourceStart,Math.min(finish,end));
      if(token.tokens)walk(token.tokens,token.sourceStart,token.sourceEnd);
      if(token.items)walk(token.items,token.sourceStart,token.sourceEnd);
      let cellCursor=token.sourceStart;
      for(const row of [token.header,...(token.rows||[])].filter(Array.isArray)){
        for(const cell of row)cellCursor=walk([cell],cellCursor,token.sourceEnd);
      }
      cursor=token.sourceEnd;
    }
    return cursor;
  }
  walk(tokens,0,source.length);
  return tokens;
}

export function sourceAttributes(token) {
  return Number.isFinite(token.sourceStart)?` data-source-start="${token.sourceStart}" data-source-end="${token.sourceEnd}"`:'';
}

export function mappedHtml(html,token) {
  const attributes=sourceAttributes(token);
  if(!attributes)return html;
  if(/^\s*<[a-z][\w-]*(?:\s|>)/i.test(html))return html.replace(/^(\s*<[a-z][\w-]*)/i,`$1${attributes}`);
  return `<div${attributes}>${html}</div>`;
}

// Points must be monotonic in both coordinate systems. Equal input positions
// use the first point, so blank lines and block gaps interpolate consistently.
export function monotonicPoints(points,x='offset',y='top') {
  const result=[];
  for(const point of [...points].filter(p=>Number.isFinite(p[x])&&Number.isFinite(p[y])).sort((a,b)=>a[x]-b[x]||a[y]-b[y])){
    const previous=result.at(-1);
    if(previous&&point[x]===previous[x])continue;
    result.push({...point,[y]:Math.max(previous?.[y]??-Infinity,point[y])});
  }
  return result;
}

export function interpolate(points,value,x='offset',y='top') {
  if(!points.length)return 0;
  if(value<=points[0][x])return points[0][y];
  if(value>=points.at(-1)[x])return points.at(-1)[y];
  let lo=0,hi=points.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid][x]<=value)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],span=b[x]-a[x];
  return a[y]+(b[y]-a[y])*(span?(value-a[x])/span:0);
}
