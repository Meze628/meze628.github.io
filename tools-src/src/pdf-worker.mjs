import {PDFDocument} from 'pdfkit';
import {Buffer} from 'buffer';
import {createMarkdown,normalizeSettings} from './core.mjs';
import {codeSpans} from './syntax.mjs';
import {indexSource,monotonicPoints} from './source-map.mjs';
import {fontPlan,fontFiles,contains} from './pdf-fonts.mjs';
import {inspectFont,checkEmbedding} from './font-file.mjs';

const parser=createMarkdown();
const fontCache=new Map();
let mathModule,mathReady;
function loadMath(){
  if(!mathReady){let timeout;mathReady=Promise.race([import(new URL('./pdf-math.js',import.meta.url).href),new Promise((_,reject)=>timeout=setTimeout(()=>reject(new Error()),45000))]).then(module=>mathModule=module).catch(()=>{mathReady=null;throw new Error('公式组件未能加载，请检查连接后重试。');}).finally(()=>clearTimeout(timeout));}
  return mathReady;
}
const formula=(...args)=>mathModule.formula(...args);
const opening=/[（(《〈「『【〔\[]$/;
const closing=/^[，。！？；：、）》〉」』】〕\])…,.!?;:%‰]/;
const mm=value=>value*72/25.4;
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',copy:'©',reg:'®',mdash:'—',ndash:'–',hellip:'…'};
const decode=text=>String(text).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(raw,name)=>name[0]==='#'?String.fromCodePoint(name[1].toLowerCase()==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10)):(entities[name]??raw));
const graphemes=new Intl.Segmenter('zh-CN',{granularity:'grapheme'});
const codeFeatures={liga:false,calt:false,dlig:false};
const safeUrl=url=>/^(?:https?:|mailto:|#)/i.test(url||'');

async function loadFont(descriptor,listener) {
  const filename=descriptor.file;
  if(!fontCache.has(filename)){
    const entry={loaded:0,listeners:new Set()};
    fontCache.set(filename,entry);
    entry.promise=(async()=>{
      const controller=new AbortController();let timeout;
      const watch=()=>{clearTimeout(timeout);timeout=setTimeout(()=>controller.abort(new DOMException('Font download stalled','TimeoutError')),45000);};
      watch();
      try {
        const response=await fetch(new URL(`./fonts-pdf/${filename}`,import.meta.url),{signal:controller.signal});
        if(!response.ok)throw new Error('排版字体未能加载，请检查连接后重试。');
        let buffer;
        if(response.body?.getReader){
          const reader=response.body.getReader(),chunks=[];
          while(true){const {done,value}=await reader.read();if(done)break;watch();chunks.push(Buffer.from(value));entry.loaded+=value.byteLength;for(const callback of entry.listeners)callback();}
          buffer=Buffer.concat(chunks);
        }else buffer=Buffer.from(await response.arrayBuffer());
        entry.loaded=buffer.length;for(const callback of entry.listeners)callback();
        return buffer;
      }finally{clearTimeout(timeout);}
    })().catch(error=>{fontCache.delete(filename);throw new Error(error.name==='TimeoutError'?'字体下载超时，请检查连接后重试。':error.message);});
  }
  const entry=fontCache.get(filename);
  entry.listeners.add(listener);listener();
  try{return await entry.promise;}finally{entry.listeners.delete(listener);}
}
async function loadFonts(descriptors,progress) {
  const unique=[...new Map(descriptors.filter(Boolean).map(value=>[value.file,value])).values()];
  const total=unique.reduce((sum,value)=>sum+value.bytes,0);let reported=-Infinity;
  const report=()=>{
    if(!progress)return;
    const loaded=unique.reduce((sum,value)=>sum+Math.min(value.bytes,fontCache.get(value.file)?.loaded||0),0);
    if(performance.now()-reported<160&&loaded<total)return;reported=performance.now();
    progress(`正在加载排版字体（${(loaded/1048576).toFixed(2)} / ${(total/1048576).toFixed(2)} MB）…`);
  };
  const buffers=await Promise.all(unique.map(descriptor=>loadFont(descriptor,report)));
  return new Map(unique.map((descriptor,index)=>[descriptor.file,buffers[index]]));
}

async function createPdf(job,progress) {
  const settings=normalizeSettings(job.settings);
  const tokens=indexSource(parser.lexer(job.source),job.source),plan=fontPlan(tokens,job.source,settings);
  const [loaded]=await Promise.all([loadFonts(fontFiles(plan),progress),plan.math?loadMath():null]);
  const local=['custom','yahei'].includes(settings.font);
  const fontData=local?Buffer.from(job.customFont||[]):loaded.get(plan.regular[0].file);
  const monoData=plan.mono?loaded.get(plan.mono.file):null;
  // Register the named font before loading it. Loading the same bytes as the
  // constructor's default prevents PDFKit from caching the Body alias.
  const doc=new PDFDocument({font:null,autoFirstPage:false,bufferPages:true,compress:true,pdfVersion:'1.7',info:{Title:settings.title||tokens[0]?.metadata?.title||settings.filename,Author:'',Creator:"Meze's Blog · Markdown Tools"}});
  const chunks=[];
  const finished=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const regularFonts=[],boldFonts=[],fontChoice=new Map();
  try{
    const register=(descriptors,prefix,target)=>descriptors.forEach((descriptor,index)=>{const name=index?prefix+index:prefix;doc.registerFont(name,loaded.get(descriptor.file));target.push({name,coverage:descriptor.coverage});});
    if(local){
      const face=inspectFont(fontData,job.customFontName);checkEmbedding(face);doc.registerFont('Body',fontData,face.name);regularFonts.push({name:'Body'});
      if(job.customBoldFont){const data=Buffer.from(job.customBoldFont),bold=inspectFont(data,job.customBoldFontName);checkEmbedding(bold);doc.registerFont('BodyBold',data,bold.name);boldFonts.push({name:'BodyBold'});}
    }
    else {register(plan.regular,'Body',regularFonts);register(plan.bold,'BodyBold',boldFonts);}
    if(monoData)doc.registerFont('Mono',monoData);doc.font('Body');
  }
  catch(error){throw new Error('无法读取字体，请使用有效的 .ttf、.otf 或 .ttc 字体文件。');}
  const warnings=new Set();
  const missingGlyphs=new Set();
  const fontMetrics=new Map();
  const imageCache=new Map();
  const measureCache=new Map();
  const checkedGlyphs=new Map();
  const codeCache=new WeakMap();
  const sourceMap=[];
  const baseSize=settings.fontSize;
  const syntheticBold=local&&!boldFonts.length;
  function bodyFace(text,bold){
    const faces=bold&&boldFonts.length?boldFonts:regularFonts,key=(bold?'b':'r')+text;
    if(!fontChoice.has(key)){const points=[...text].map(character=>character.codePointAt(0));fontChoice.set(key,(faces.find(face=>!face.coverage||points.every(point=>contains(face.coverage,point)))||faces[0]).name);}
    return fontChoice.get(key);
  }
  let cursor=0,pageWidth=0,pageHeight=0,left=0,right=0,top=0,bottom=0,pageCount=0;
  function newPage(){
    doc.addPage({size:settings.paper,layout:settings.orientation,margin:0});pageCount++;
    pageWidth=doc.page.width;pageHeight=doc.page.height;left=mm(settings.marginLeft);right=pageWidth-mm(settings.marginRight);top=mm(settings.marginTop);bottom=pageHeight-mm(settings.marginBottom);cursor=top;
    if(pageCount===1||pageCount%5===0)progress(`正在排版，第 ${pageCount} 页…`);
  }
  function ensure(height){if(cursor+height>bottom+0.01&&cursor>top+0.01)newPage();}
  function anchor(offset,y=cursor){if(Number.isFinite(offset))sourceMap.push({offset,page:pageCount,y,top:(pageCount-1)*pageHeight+y});}
  function metric(font,size){
    if(!fontMetrics.has(font)){doc.font(font);fontMetrics.set(font,{ascender:doc._font.ascender/1000,descender:-doc._font.descender/1000});}
    const value=fontMetrics.get(font);return {above:value.ascender*size,below:value.descender*size};
  }
  function width(text,font,size){
    const key=JSON.stringify([font,size,text]);
    if(!measureCache.has(key)){doc.font(font).fontSize(size);measureCache.set(key,doc.widthOfString(text,{features:font==='Mono'?codeFeatures:undefined}));}
    return measureCache.get(key);
  }
  function textUnit(text,style={},span){
    const size=style.size||baseSize;
    const bodyFont=bodyFace(text,style.bold);
    let font=style.code?'Mono':bodyFont;
    if(style.code&&/[^\x00-\x7f]/.test(text))font=bodyFont;
    doc.font(font);
    if(!checkedGlyphs.has(font))checkedGlyphs.set(font,new Set());
    const checked=checkedGlyphs.get(font);
    for(const character of text){if(!checked.has(character)){checked.add(character);if(!/[\s\u200b\u200d\ufe0f]/.test(character)&&!doc._font.font.hasGlyphForCodePoint(character.codePointAt(0)))missingGlyphs.add(character);}}
    return {kind:'text',text,font,size,w:width(text,font,size),...metric(font,size),style,...span};
  }
  function unitsFromText(text,style,span){
    const units=[];let word='',wordStart=0;
    const range=(start,end)=>Number.isFinite(span?.sourceStart)?{sourceStart:span.sourceStart+(span.sourceEnd-span.sourceStart)*start/Math.max(1,text.length),sourceEnd:span.sourceStart+(span.sourceEnd-span.sourceStart)*end/Math.max(1,text.length)}:{};
    function flush(){if(word){units.push(textUnit(word,style,range(wordStart,wordStart+word.length)));word='';}}
    for(const {segment,index} of graphemes.segment(text)){
      if(/^[A-Za-z0-9_]+$/.test(segment)){if(!word)wordStart=index;word+=segment;}
      else{flush();units.push(textUnit(segment,style,range(index,index+segment.length)));}
    }
    flush();return units;
  }
  async function imageData(href){
    if(imageCache.has(href))return imageCache.get(href);
    const pending=(async()=>{
      if(!/^(https?:|data:image\/)/i.test(href))throw new Error('请使用嵌入图片或完整的图片网址');
      const response=await fetch(href,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('图片请求失败');
      const blob=await response.blob();
      if(blob.size>20*1024*1024)throw new Error('图片超过 20 MB');
      let bytes=Buffer.from(await blob.arrayBuffer());
      const png=bytes[0]===137&&bytes[1]===80,jpeg=bytes[0]===255&&bytes[1]===216;
      if(!png&&!jpeg){
        const bitmap=await createImageBitmap(blob);
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
        bytes=Buffer.from(await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
      }
      const opened=doc.openImage(bytes);return {bytes,width:opened.width,height:opened.height};
    })().catch(error=>{warnings.add('部分图片未能读取，请用“插入图片”嵌入后重试');return null;});
    imageCache.set(href,pending);return pending;
  }
  async function inline(tokens,style={}){
    const units=[];
    for(const token of tokens||[]){
      switch(token.type){
        case 'checkbox':break;
        case 'text': case 'escape':
          if(token.tokens)units.push(...await inline(token.tokens,style));
          else units.push(...unitsFromText((token.literal?token.text:decode(token.text)).replace(/\s*\n\s*/g,' '),style,token));
          break;
        case 'strong':units.push(...await inline(token.tokens,{...style,bold:true}));break;
        case 'em':units.push(...await inline(token.tokens,{...style,italic:true}));break;
        case 'del':units.push(...await inline(token.tokens,{...style,strike:true}));break;
        case 'link':units.push(...await inline(token.tokens,{...style,link:safeUrl(token.href)?token.href:null,color:'#bc4545'}));break;
        case 'codespan':units.push(...unitsFromText(decode(token.text),{...style,code:true,size:style.size?style.size*.9:baseSize*.9},token));break;
        case 'br':units.push({kind:'break'});break;
        case 'mathInline':case 'mathBlock':units.push({...formula(token.text,token.display,style.size||baseSize),sourceStart:token.sourceStart,sourceEnd:token.sourceEnd});break;
        case 'image':{
          const image=await imageData(token.href);
          if(image){const w=Math.min(image.width*.75,180),h=w/image.width*image.height;units.push({kind:'image',image,w,above:h,below:0,sourceStart:token.sourceStart,sourceEnd:token.sourceEnd});}
          else units.push(...unitsFromText(`[图片：${token.text||'未载入'}]`,{...style,color:'#777777'},token));
          break;
        }
        case 'html':units.push(...unitsFromText(decode(token.text.replace(/<br\s*\/?\s*>/gi,'\n')),{...style,color:'#555555'},token));break;
        default:if(token.text)units.push(...unitsFromText(decode(token.text),style,token));
      }
    }
    return units;
  }
  function wrap(units,available){
    const lines=[];let current=[],used=0;
    const push=()=>{while(current.at(-1)?.kind==='text'&&/^\s+$/.test(current.at(-1).text)&&!current.at(-1).style.code){used-=current.pop().w;}lines.push(current);current=[];used=0;};
    const queue=[...units];
    for(let index=0;index<queue.length;index++){
      let unit=queue[index];
      if(unit.kind==='break'){push();continue;}
      if(unit.w>available&&unit.kind==='text'&&[...unit.text].length>1){queue.splice(index,1,...[...graphemes.segment(unit.text)].map(value=>textUnit(value.segment,unit.style,Number.isFinite(unit.sourceStart)?{sourceStart:unit.sourceStart+(unit.sourceEnd-unit.sourceStart)*value.index/unit.text.length,sourceEnd:unit.sourceStart+(unit.sourceEnd-unit.sourceStart)*(value.index+value.segment.length)/unit.text.length}:undefined)));index--;continue;}
      if(unit.w>available&&['math','image'].includes(unit.kind)){
        const scale=available/unit.w;unit={...unit,w:available,above:unit.above*scale,below:unit.below*scale};
        if(unit.kind==='math')warnings.add('过宽公式已缩小以适应纸张');
      }
      if(!current.length&&unit.kind==='text'&&/^\s+$/.test(unit.text)&&!unit.style.code)continue;
      if(current.length&&used+unit.w>available+.01){
        const carry=[];
        if(closing.test(unit.text||'')&&current.length>1)carry.unshift(current.pop());
        while(current.length>1&&opening.test(current.at(-1).text||''))carry.unshift(current.pop());
        push();current=carry;used=carry.reduce((sum,value)=>sum+value.w,0);
        if(!current.length&&unit.kind==='text'&&/^\s+$/.test(unit.text)&&!unit.style.code)continue;
      }
      current.push(unit);used+=unit.w;
    }
    if(current.length)push();
    return lines.length?lines:[[]];
  }
  function lineMetrics(line,size=baseSize,code=false){
    const normal=metric(code?'Mono':'Body',size);
    const above=Math.max(normal.above,...line.map(unit=>unit.above));
    const below=Math.max(normal.below,...line.map(unit=>unit.below));
    const natural=above+below+size*.13,requested=size*(code?1.6:settings.lineHeight);
    const advance=code||line.some(unit=>['math','image'].includes(unit.kind))?Math.max(requested,natural):requested;
    return {above,below,height:Math.max(advance,natural),advance};
  }
  function drawFormula(unit,x,y){
    mathModule.drawFormula(doc,unit,x,y,warnings,bodyFace);
  }
  function drawLine(line,x,y,available,{size=baseSize,code=false,align='left',quote=false,quoteX=x-10,map=true}={}){
    const metrics=lineMetrics(line,size,code);
    if(map){anchor(line.find(unit=>Number.isFinite(unit.sourceStart))?.sourceStart,y);anchor(line.findLast(unit=>Number.isFinite(unit.sourceEnd))?.sourceEnd,y+metrics.advance);}
    const total=line.reduce((sum,unit)=>sum+unit.w,0);
    if(align==='center')x+=(available-total)/2;else if(align==='right')x+=available-total;
    const baseline=y+(metrics.height-metrics.above-metrics.below)/2+metrics.above;
    if(quote)doc.save().lineWidth(2).strokeColor('#d45d5d').moveTo(quoteX,y).lineTo(quoteX,y+metrics.height).stroke().restore();
    const runs=[];
    for(const unit of line){
      const previous=runs.at(-1);
      if(unit.kind==='text'&&previous?.kind==='text'&&unit.font===previous.font&&unit.size===previous.size&&['bold','italic','strike','link','color','code'].every(key=>unit.style[key]===previous.style[key])){previous.text+=unit.text;previous.w+=unit.w;}
      else runs.push({...unit});
    }
    for(const unit of runs){
      if(unit.kind==='text'){
        const style=unit.style;
        if(style.code&&!code)doc.save().roundedRect(x-1,baseline-unit.above-1,unit.w+2,unit.above+unit.below+2,2).fill('#f1f2f4').restore();
        doc.font(unit.font).fontSize(unit.size).fillColor(style.color||'#262a31');
        if(style.bold&&syntheticBold)doc.strokeColor(style.color||'#262a31').lineWidth(.18);
        doc.text(unit.text,x,baseline-unit.above,{lineBreak:false,textWidth:unit.w,features:unit.font==='Mono'?codeFeatures:undefined,oblique:style.italic?10:0,underline:Boolean(style.link),fill:true,stroke:Boolean(style.bold&&syntheticBold)});
        if(style.link)doc.link(x,baseline-unit.above,unit.w,unit.above+unit.below,style.link);
        if(style.strike)doc.save().lineWidth(.5).strokeColor(style.color||'#262a31').moveTo(x,baseline-unit.size*.3).lineTo(x+unit.w,baseline-unit.size*.3).stroke().restore();
      }else if(unit.kind==='math'){
        drawFormula(unit,x,baseline-unit.above);
      }else if(unit.kind==='image')doc.image(unit.image.bytes,x,baseline-unit.above,{width:unit.w,height:unit.above+unit.below});
      x+=unit.w;
    }
    return metrics.height;
  }
  function listMarkerWidth(prefix,task,size){
    return (prefix?Math.max(size*1.45,width(prefix,'Body',size)+5):0)+(task===null?0:size*1.35);
  }
  function drawListMarker(prefix,task,x,y,size,line=[]){
    const prefixWidth=listMarkerWidth(prefix,null,size);
    if(prefix)drawLine([textUnit(prefix,{size})],x,y,prefixWidth,{size});
    if(task===null)return;
    const side=size*.88,boxX=x+prefixWidth,boxY=y+(lineMetrics(line,size).height-side)/2;
    doc.save().lineWidth(Math.max(.65,size*.055)).roundedRect(boxX,boxY,side,side,side*.2);
    if(task)doc.fill('#3e4652');else doc.fillAndStroke('#f8f9fb','#aeb4bd');
    if(task)doc.lineWidth(Math.max(1,size*.105)).lineCap('round').lineJoin('round').strokeColor('#ffffff')
      .moveTo(boxX+side*.22,boxY+side*.5).lineTo(boxX+side*.43,boxY+side*.7).lineTo(boxX+side*.79,boxY+side*.3).stroke();
    doc.restore();
  }
  async function paragraph(tokens,{indent=0,prefix='',task=null,size=baseSize,bold=false,color,quote=false,align='left',after=settings.paragraphGap}={}){
    const prefixWidth=listMarkerWidth(prefix,task,size);
    const x=left+indent+prefixWidth;
    const available=right-x;
    if(available<size*1.5)throw new Error('可用行宽过小，请减小字号、列表缩进或左右页边距。');
    const lines=wrap(await inline(tokens,{size,bold,color}),available);
    for(let index=0;index<lines.length;index++){
      const {height,advance}=lineMetrics(lines[index],size);
      if(height>bottom-top)throw new Error('文字或行内公式过高，请增大纸张或减小字号、行距和页边距。');
      ensure(height);
      if(index===0&&prefixWidth)drawListMarker(prefix,task,left+indent,cursor,size,lines[index]);
      drawLine(lines[index],x,cursor,available,{size,quote,quoteX:left+indent-10,align});cursor+=index===0&&task!==null?Math.max(advance,size*.88):advance;
    }
    cursor+=after;
  }
  function codeLines(token,indent){
    if(!codeCache.has(token))codeCache.set(token,new Map());
    const cache=codeCache.get(token);if(cache.has(indent))return cache.get(indent);
    const raw=token.raw||'',body=raw.indexOf(token.text);
    const start=token.sourceStart+(body>=0?body:(raw.indexOf('\n')+1));
    const originalLines=[[]];
    for(const span of codeSpans(token.text,token.lang)){
      let offset=start+span.start;
      const parts=span.text.split('\n');
      for(let i=0;i<parts.length;i++){
        originalLines.at(-1).push(...unitsFromText(parts[i].replace(/\t/g,'    '),{size:settings.codeFontSize,code:true,color:span.color},{sourceStart:offset,sourceEnd:offset+parts[i].length}));
        offset+=parts[i].length+1;if(i<parts.length-1)originalLines.push([]);
      }
    }
    const result=originalLines.flatMap(line=>wrap(line,right-left-indent-20));
    cache.set(indent,result);return result;
  }
  function codeHeight(token,indent){return codeLines(token,indent).reduce((sum,line)=>sum+lineMetrics(line,settings.codeFontSize,true).height,0)+10;}
  async function codeBlock(token,indent){
    const size=settings.codeFontSize,x=left+indent,available=right-x-20;
    const totalHeight=codeHeight(token,indent);
    if(totalHeight<(bottom-top)*.65)ensure(totalHeight);
    cursor+=3;
    anchor(token.sourceStart);
    for(const line of codeLines(token,indent)){
        const height=lineMetrics(line,size,true).height;ensure(height);
        doc.save().rect(x,cursor,right-x,height+.2).fill('#f4f5f7').restore();
        drawLine(line,x+10,cursor,available,{size,code:true});cursor+=height;
    }
    anchor(token.sourceEnd);
    cursor+=settings.paragraphGap+7;
  }
  async function displayFormula(token,indent){
    let unit=formula(token.text,true,baseSize*1.05);
    const available=right-left-indent;
    const scale=Math.min(1,available/unit.w,(bottom-top-18)/(unit.above+unit.below));
    if(scale<1){unit={...unit,w:unit.w*scale,above:unit.above*scale,below:unit.below*scale};warnings.add('过宽公式已缩小以适应纸张');}
    const height=unit.above+unit.below+baseSize*.8;ensure(height);cursor+=baseSize*.35;
    anchor(token.sourceStart);
    drawFormula(unit,left+indent+(available-unit.w)/2,cursor);
    cursor+=unit.above+unit.below+baseSize*.45+settings.paragraphGap;
    anchor(token.sourceEnd);
  }
  async function imageBlock(token,indent){
    const image=await imageData(token.href);
    if(!image){await paragraph([{type:'text',text:`[图片：${token.text||'未载入'}]`}],{indent});return;}
    const available=right-left-indent;
    const scale=Math.min(.75,available/image.width,(bottom-top-20)/image.height);
    const width=image.width*scale,height=image.height*scale;
    ensure(height+10);anchor(token.sourceStart);doc.image(image.bytes,left+indent+(available-width)/2,cursor+4,{width,height});cursor+=height+10+settings.paragraphGap;anchor(token.sourceEnd);
  }
  async function table(token,indent){
    const available=right-left-indent,columns=token.header.length;
    const padding=6,size=baseSize*.9;
    if(available/columns-padding*2<size*1.1)throw new Error('表格列数较多，请使用横向纸张、较小字号或较小页边距。');
    const widths=Array(columns).fill(available/columns);
    const prepare=async(row,bold)=>Promise.all(row.map(async(cell,index)=>wrap(await inline(cell.tokens,{size,bold}),widths[index]-padding*2)));
    const header=await prepare(token.header,true);
    const rowMetrics=cells=>Array.from({length:Math.max(...cells.map(cell=>cell.length))},(_,index)=>{
      const metrics=cells.map(cell=>lineMetrics(cell[index]||[],size));
      return {height:Math.max(...metrics.map(value=>value.height)),advance:Math.max(...metrics.map(value=>value.advance))};
    });
    const stackHeight=metrics=>{let advance=0,height=0;for(const line of metrics){height=Math.max(height,advance+line.height);advance+=line.advance;}return Math.max(height,advance);};
    const headerHeight=stackHeight(rowMetrics(header))+padding*2;
    const repeatHeader=headerHeight<(bottom-top)*.35;
    let isHeader=false;
    const renderRow=async(cells,heading=false)=>{
      const metrics=rowMetrics(cells);let index=0;
      if(metrics.some(line=>line.height+padding*2>bottom-top))throw new Error('表格行高超过纸张可用区域，请减小字号、行距或页边距。');
      while(index<metrics.length){
        if(cursor+metrics[index].height+padding*2>bottom){newPage();if(!heading&&repeatHeader)await renderRow(header,true);}
        let count=0,height=padding*2,advance=0,extent=0;
        while(index+count<metrics.length){
          const line=metrics[index+count],nextExtent=Math.max(extent,advance+line.height),nextAdvance=advance+line.advance;
          const nextHeight=padding*2+Math.max(nextExtent,nextAdvance);
          if(cursor+nextHeight>bottom+.01)break;
          extent=nextExtent;advance=nextAdvance;height=nextHeight;count++;
        }
        if(!count){newPage();continue;}
        let x=left+indent;
        for(let column=0;column<columns;column++){
          doc.save().rect(x,cursor,widths[column],height).fillAndStroke(heading?'#f1f2f5':'#ffffff','#d9dce2').restore();
          let y=cursor+padding;
          for(let line=0;line<count;line++){
            drawLine(cells[column]?.[index+line]||[],x+padding,y,widths[column]-padding*2,{size,align:token.align[column]||'left',map:!heading&&column===0});y+=metrics[index+line].advance;
          }
          x+=widths[column];
        }
        cursor+=height;index+=count;
      }
    };
    ensure(Math.min(headerHeight+size*2.5,bottom-top));
    await renderRow(header,true);
    for(const row of token.rows)await renderRow(await prepare(row,false));
    cursor+=settings.paragraphGap+4;
  }
  async function blocks(tokens,indent=0,quote=false){
    for(let tokenIndex=0;tokenIndex<(tokens||[]).length;tokenIndex++){
      const token=tokens[tokenIndex];
      switch(token.type){
        case 'space':break;
        case 'frontMatter':{
          if(!token.tokens.length)break;
          anchor(token.sourceStart);
          const meta=[];
          for(const field of token.tokens){
            if(field.role==='title'){
              doc.outline.addItem(field.text);
              await paragraph(field.tokens,{size:baseSize*1.95*settings.headingScale,bold:true,after:baseSize*.45});
            }else if(field.role==='description')await paragraph(field.tokens,{color:'#656d78',after:baseSize*.6});
            else {
              if(meta.length)meta.push({type:'text',text:'  ·  ',literal:true});
              meta.push(...field.tokens);
            }
          }
          if(meta.length)await paragraph(meta,{size:baseSize*.8,color:'#7c818a',after:baseSize*.7});
          ensure(1);doc.save().lineWidth(.5).strokeColor('#d9dce2').moveTo(left,cursor).lineTo(right,cursor).stroke().restore();
          cursor+=baseSize*.8;anchor(token.sourceEnd);break;
        }
        case 'heading':{
          const size=baseSize*[1.95,1.55,1.27,1.12,1.04,1][token.depth-1]*settings.headingScale;
          const next=tokens.slice(tokenIndex+1).find(value=>value.type!=='space');
          const nextCodeHeight=next?.type==='code'?codeHeight(next,indent):0;
          const following=nextCodeHeight&&nextCodeHeight<(bottom-top)*.65?nextCodeHeight:baseSize*settings.lineHeight*1.5;
          cursor+=baseSize*.55;ensure(Math.min(size*1.55+following,bottom-top));
          doc.outline.addItem(decode(token.text).replace(/[*_`]/g,''));
          await paragraph(token.tokens,{indent,size,bold:true,quote,align:token.align||'left',after:baseSize*.6});break;
        }
        case 'paragraph':case 'text':{
          if(token.tokens?.length===1&&token.tokens[0].type==='image')await imageBlock(token.tokens[0],indent);
          else await paragraph(token.tokens||[{type:'text',text:token.text||''}],{indent,quote});break;
        }
        case 'mathBlock':await displayFormula(token,indent);break;
        case 'code':await codeBlock(token,indent);break;
        case 'blockquote':await blocks(token.tokens,Math.min(indent+14,(right-left)*.3),true);cursor+=4;break;
        case 'list':{
          let number=token.start||1;
          for(const item of token.items){
            const task=item.task?Boolean(item.checked):null,prefix=token.ordered?`${number++}.`:(item.task?'':'•');
            // Marked emits a separate checkbox token for compact task lists.
            const content=item.tokens.filter(value=>value.type!=='checkbox'),first=content[0];
            const childIndent=Math.min(indent+Math.max(baseSize*1.5,listMarkerWidth(prefix,task,baseSize)),(right-left)*.4);
            if(first&&['text','paragraph'].includes(first.type)){
              await paragraph(first.tokens||[{type:'text',text:first.text}],{indent,prefix,task,quote,after:Math.max(1,Math.min(3,settings.paragraphGap*.25))});await blocks(content.slice(1),childIndent,quote);
            }else{
              const metrics=lineMetrics([]);ensure(metrics.height);drawListMarker(prefix,task,left+indent,cursor,baseSize);
              if(content.length)await blocks(content,childIndent,quote);else cursor+=Math.max(metrics.advance,task!==null?baseSize*.88:0)+3;
            }
          }
          cursor+=settings.paragraphGap;break;
        }
        case 'table':await table(token,indent);break;
        case 'hr':ensure(14);doc.save().lineWidth(.5).strokeColor('#d9dce2').moveTo(left+indent,cursor+5).lineTo(right,cursor+5).stroke().restore();cursor+=14+settings.paragraphGap;break;
        case 'pageBreak':if(cursor>top+.01)newPage();break;
        case 'html':await paragraph([{type:'text',text:token.text||''}],{indent,quote});break;
        default:if(token.tokens)await blocks(token.tokens,indent,quote);else if(token.text)await paragraph([{type:'text',text:token.text}],{indent,quote});
      }
    }
  }
  newPage();
  if(right-left<baseSize*4||bottom-top<baseSize*4)throw new Error('纸张可用区域过小，请减小字号或页边距。');
  await blocks(tokens);
  anchor(job.source.length);
  if(missingGlyphs.size)warnings.add(`所选字体缺少字符：${[...missingGlyphs].slice(0,8).join('')}，请更换字体`);
  const pages=doc.bufferedPageRange();
  for(let page=0;page<pages.count;page++){
    doc.switchToPage(page);doc.font('Body').fontSize(8).fillColor('#7c818a');
    if(settings.pageNumbers){const label=`${page+1} / ${pages.count}`;doc.text(label,(pageWidth-width(label,'Body',8))/2,pageHeight-mm(settings.marginBottom)/2-4,{lineBreak:false});}
    if(settings.header){
      const units=unitsFromText(settings.header,{size:8,color:'#7c818a'});let total=units.reduce((sum,unit)=>sum+unit.w,0),trimmed=false;
      while(units.length&&total>right-left-8){total-=units.pop().w;trimmed=true;}
      if(trimmed)units.push(...unitsFromText('…',{size:8,color:'#7c818a'}));
      drawLine(units,left,mm(settings.marginTop)/2-8,right-left,{size:8,map:false});
    }
  }
  doc.end();const buffer=await finished;
  return {buffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),pages:pages.count,warnings:[...warnings],sourceMap:monotonicPoints(sourceMap),pageSize:{width:pageWidth,height:pageHeight}};
}

let queue=Promise.resolve();
self.onmessage=({data})=>{
  if(data.type==='warmup'){
    const settings=normalizeSettings(data.settings);
    if(!['custom','yahei'].includes(settings.font)){
      const plan=fontPlan(parser.lexer(data.source||''),data.source||'',settings,{warmup:true});
      loadFonts(fontFiles(plan)).catch(()=>{});if(plan.math)loadMath().catch(()=>{});
    }
    return;
  }
  queue=queue.then(async()=>{
    const progress=message=>self.postMessage({id:data.id,type:'progress',message});
    try{const result=await createPdf(data,progress);self.postMessage({id:data.id,type:'result',...result},[result.buffer]);}
    catch(error){self.postMessage({id:data.id,type:'error',message:error.message||'PDF 生成失败，请检查文稿后重试。'});}
  });
};
self.postMessage({type:'ready'});
