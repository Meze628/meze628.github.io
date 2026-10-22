import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import latex from 'highlight.js/lib/languages/latex';
import markdown from 'highlight.js/lib/languages/markdown';
import {escapeHtml} from './core.mjs';

for(const [name,language] of Object.entries({cpp,python,javascript,typescript,json,bash,css,xml,java,csharp,go,rust,sql,yaml,latex,markdown}))hljs.registerLanguage(name,language);
const colors={comment:'#6a737d',quote:'#6a737d',keyword:'#9c36b5',selector:'#9c36b5',literal:'#9c36b5',built_in:'#b05a00',type:'#0b7285',number:'#b05a00',symbol:'#b05a00',string:'#16754b',regexp:'#16754b',title:'#245da8',function:'#245da8',class:'#245da8',attr:'#8c5c0a',attribute:'#8c5c0a',meta:'#a23f39',tag:'#a23f39',name:'#a23f39',variable:'#8c5c0a',section:'#245da8',addition:'#16754b',deletion:'#a23f39'};
const decode=text=>text.replace(/&(amp|lt|gt|quot|#x27|#39);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"','#x27':"'",'#39':"'"}[name]));

export function highlightCode(text,language='') {
  const name=language.trim().split(/\s+/)[0].toLowerCase();
  if(!name||!hljs.getLanguage(name))return escapeHtml(text);
  try{return hljs.highlight(text,{language:name,ignoreIllegals:true}).value;}
  catch{return escapeHtml(text);}
}

// Highlight.js emits escaped text and nested span tags. Keep the token colors
// in a worker without parsing arbitrary HTML or requiring a DOM.
export function codeSpans(text,language='') {
  const html=highlightCode(text,language),stack=[],spans=[];let offset=0;
  for(const match of html.matchAll(/<span class="([^"]*)">|<\/span>|([^<]+)/g)){
    if(match[1]!==undefined){
      let color;
      for(const name of match[1].split(/\s+/))color=colors[name.replace(/^hljs-/,'').split('-')[0]]||color;
      stack.push(color||stack.at(-1));
    }else if(match[0]==='</span>')stack.pop();
    else{
      const value=decode(match[2]),color=stack.at(-1)||'#262a31';
      const previous=spans.at(-1);
      if(previous?.color===color){previous.text+=value;previous.end+=value.length;}
      else spans.push({text:value,color,start:offset,end:offset+value.length});
      offset+=value.length;
    }
  }
  return spans;
}
