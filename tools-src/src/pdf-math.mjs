import SVGtoPDF from 'svg-to-pdfkit';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor=liteAdaptor();
RegisterHTMLHandler(adaptor);
const mathDocument=mathjax.document('',{
  InputJax:new TeX({packages:AllPackages.filter(name=>!['html','require','autoload','noerrors','noundefined'].includes(name)),formatError:(_,error)=>{throw error;}}),
  OutputJax:new SVG({fontCache:'none'}),
});
const cache=new Map();
export function formula(text,display,size) {
  const key=JSON.stringify([text,display]);
  if(!cache.has(key)){
    try{
      mathDocument.inputJax[0].parseOptions.tags.reset();
      const result=mathDocument.convert(text,{display,em:1000,ex:442,containerWidth:80000});
      const svgNode=adaptor.firstChild(result);
      const svg=adaptor.outerHTML(svgNode).replace(/currentColor/g,'#20242b');
      if(/data-mjx-error|<merror/.test(svg))throw new Error('公式包含不支持的命令');
      const box=(svg.match(/viewBox="([^"]+)"/)?.[1]||'0 0 1000 1000').split(/\s+/).map(Number);
      cache.set(key,{svg,box});if(cache.size>1000)cache.delete(cache.keys().next().value);
    }catch(error){throw new Error(`公式无法导出：${text.slice(0,70)}（${error.message}）`);}
  }
  const {svg,box}=cache.get(key);
  return {kind:'math',svg,w:box[2]/1000*size,above:Math.max(0,-box[1])/1000*size,below:Math.max(0,box[1]+box[3])/1000*size,size};
}
export function drawFormula(doc,unit,x,y,warnings,bodyFace) {
  const svg=unit.svg.replace(/\bwidth="[^"]*"/,`width="${unit.w}"`).replace(/\bheight="[^"]*"/,`height="${unit.above+unit.below}"`).replace(/<text\b([^>]*)>([^<]*)<\/text>/g,(_,attributes,text)=>{
    const spans=(text.match(/&[^;]+;|[^]/gu)||[]).map(character=>{
      const match=character.match(/^&#(x[0-9a-f]+|[0-9]+);$/i);
      const decoded=match?String.fromCodePoint(match[1][0].toLowerCase()==='x'?parseInt(match[1].slice(1),16):parseInt(match[1],10)):character[0]==='&'?' ':character;
      return `<tspan font-family="${bodyFace(decoded,false)}">${character}</tspan>`;
    }).join('');return `<text${attributes}>${spans}</text>`;
  });
  SVGtoPDF(doc,svg,x,y,{width:unit.w,height:unit.above+unit.below,assumePt:true,fontCallback:family=>/^Body\d*$/.test(family)?family:'Body',warningCallback:message=>{if(/unsupported|not found/i.test(message))warnings.add('部分公式样式未被 PDF 引擎支持');}});
}
