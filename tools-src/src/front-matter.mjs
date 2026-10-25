import {parseDocument,isMap,stringify} from 'yaml';

const scalar=value=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value)?String(value).replace(/\s+/g,' ').trim():'';
const terms=value=>[...new Set((Array.isArray(value)?value:[value]).map(scalar).filter(Boolean))];

// Only the document prefix is eligible. Markdown fences and later horizontal
// rules never pass through this parser, and incomplete/invalid YAML stays text.
export function readFrontMatter(source){
  const opening=source.match(/^\uFEFF?---[\t ]*\r?\n/);
  if(!opening)return null;
  const rest=source.slice(opening[0].length),closing=/^---[\t ]*(?:\r?\n|$)/m.exec(rest);
  if(!closing||closing.index>262144)return null;
  const yaml=rest.slice(0,closing.index),offset=opening[0].length;
  let document,values;
  try{
    document=parseDocument(yaml,{schema:'core',version:'1.2',stringKeys:true,uniqueKeys:true,prettyErrors:false});
    if(document.errors.length||document.warnings.length||!isMap(document.contents))return null;
    values=document.toJS({mapAsMap:true,maxAliasCount:50});
  }catch{return null;}
  const raw=source.slice(0,offset+closing.index+closing[0].length),tokens=[];
  const metadata={title:scalar(values.get('title')),description:scalar(values.get('description')),date:scalar(values.get('date')),categories:terms(values.get('categories')),tags:terms(values.get('tags'))};
  function field(key,text,role=key){
    if(!text)return;
    const node=document.get(key,true),range=node?.range||[0,yaml.length];
    const sourceRange=[offset+range[0],offset+range[1]];
    tokens.push({type:role==='title'?'heading':'paragraph',depth:1,role,text,sourceRange,tokens:[{type:'text',text,literal:true,sourceRange}]});
  }
  field('title',metadata.title);
  field('description',metadata.description);
  for(const [key,value] of values){
    if(key==='title'&&metadata.title||key==='description'&&metadata.description)continue;
    if(key==='date'&&metadata.date)field(key,metadata.date);
    else if(['categories','tags'].includes(key)&&terms(value).length&&(Array.isArray(value)?value:[value]).every(item=>scalar(item))){
      field(key,(key==='categories'?'分类：':'标签：')+terms(value).join('、'));
    }else field(key,`${key}: ${stringify(value,{collectionStyle:'flow',lineWidth:0}).trim()}`,'extra');
  }
  return {type:'frontMatter',raw,metadata,tokens};
}
