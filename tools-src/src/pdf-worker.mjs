import {PDFDocument} from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {Buffer} from 'buffer';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';
import {createMarkdown,normalizeSettings} from './core.mjs';

const adaptor=liteAdaptor();
RegisterHTMLHandler(adaptor);
const mathDocument=mathjax.document('',{
  InputJax:new TeX({packages:AllPackages.filter(name=>!['html','require','autoload','noerrors','noundefined'].includes(name)),formatError:(_,error)=>{throw error;}}),
  OutputJax:new SVG({fontCache:'none'}),
});
const parser=createMarkdown();
const fontCache=new Map();
const mathCache=new Map();
const opening=/[（(《〈「『【〔\[]$/;
const closing=/^[，。！？；：、）》〉」』】〕\])…,.!?;:%‰]/;
const mm=value=>value*72/25.4;
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',copy:'©',reg:'®',mdash:'—',ndash:'–',hellip:'…'};
const decode=text=>String(text).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(raw,name)=>name[0]==='#'?String.fromCodePoint(name[1].toLowerCase()==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10)):(entities[name]??raw));
const graphemes=new Intl.Segmenter('zh-CN',{granularity:'grapheme'});
const safeUrl=url=>/^(?:https?:|mailto:|#)/i.test(url||'');

async function loadFont(filename) {
  if(!fontCache.has(filename))fontCache.set(filename,(async()=>{
    const response=await fetch(new URL(`./fonts-pdf/${filename}`,import.meta.url));
    if(!response.ok)throw new Error('中文字体未能加载，请检查连接后重试。');
    return Buffer.from(await response.arrayBuffer());
  })().catch(error=>{fontCache.delete(filename);throw error;}));
  return fontCache.get(filename);
}

function formula(text,display,size) {
  const key=JSON.stringify([text,display]);
  if(!mathCache.has(key)){
    try{
      mathDocument.inputJax[0].parseOptions.tags.reset();
      const result=mathDocument.convert(text,{display,em:1000,ex:442,containerWidth:80000});
      const svgNode=adaptor.firstChild(result);
      let svg=adaptor.outerHTML(svgNode).replace(/currentColor/g,'#20242b');
      if(/data-mjx-error|<merror/.test(svg))throw new Error('公式包含不支持的命令');
      const box=(svg.match(/viewBox="([^"]+)"/)?.[1]||'0 0 1000 1000').split(/\s+/).map(Number);
      mathCache.set(key,{svg,box});
      if(mathCache.size>1000)mathCache.delete(mathCache.keys().next().value);
    }catch(error){throw new Error(`公式无法导出：${text.slice(0,70)}（${error.message}）`);}
  }
  const {svg,box}=mathCache.get(key);
  return {kind:'math',svg,w:box[2]/1000*size,above:Math.max(0,-box[1])/1000*size,below:Math.max(0,box[1]+box[3])/1000*size,size};
}

async function createPdf(job,progress) {
  const settings=normalizeSettings(job.settings);
  progress('正在加载所选字体…');
  const family=settings.font==='serif'?'NotoSerifSC':'NotoSansSC';
  const fontData=settings.font==='custom'?Buffer.from(job.customFont||[]):await loadFont(`${family}-Regular.otf`);
  const boldData=settings.font==='custom'?fontData:await loadFont(`${family}-Bold.otf`);
  const monoData=await loadFont('JetBrainsMono-Regular.ttf');
  const doc=new PDFDocument({font:fontData,autoFirstPage:false,bufferPages:true,compress:true,pdfVersion:'1.7',info:{Title:settings.title||settings.filename,Author:'',Creator:"Meze's Blog · Markdown Tools"}});
  const chunks=[];
  const finished=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  try{doc.registerFont('Body',fontData);doc.registerFont('BodyBold',boldData);doc.registerFont('Mono',monoData);doc.font('Body');}
  catch{throw new Error('无法读取字体，请使用有效的 .ttf / .otf 字体文件。');}
  const warnings=new Set();
  const missingGlyphs=new Set();
  const fontMetrics=new Map();
  const imageCache=new Map();
  const measureCache=new Map();
  const baseSize=settings.fontSize;
  let cursor=0,pageWidth=0,pageHeight=0,left=0,right=0,top=0,bottom=0,pageCount=0;
  function newPage(){
    doc.addPage({size:settings.paper,layout:settings.orientation,margin:0});pageCount++;
    pageWidth=doc.page.width;pageHeight=doc.page.height;left=mm(settings.marginLeft);right=pageWidth-mm(settings.marginRight);top=mm(settings.marginTop);bottom=pageHeight-mm(settings.marginBottom);cursor=top;
    if(pageCount===1||pageCount%5===0)progress(`正在排版，第 ${pageCount} 页…`);
  }
  function ensure(height){if(cursor+height>bottom+0.01&&cursor>top+0.01)newPage();}
  function metric(font,size){
    if(!fontMetrics.has(font)){doc.font(font);fontMetrics.set(font,{ascender:doc._font.ascender/1000,descender:-doc._font.descender/1000});}
    const value=fontMetrics.get(font);return {above:value.ascender*size,below:value.descender*size};
  }
  function width(text,font,size){
    const key=JSON.stringify([font,size,text]);
    if(!measureCache.has(key)){doc.font(font).fontSize(size);measureCache.set(key,doc.widthOfString(text));}
    return measureCache.get(key);
  }
  function textUnit(text,style={}){
    const size=style.size||baseSize;
    let font=style.code?'Mono':(style.bold?'BodyBold':'Body');
    if(style.code&&/[^\x00-\x7f]/.test(text))font=style.bold?'BodyBold':'Body';
    doc.font(font);
    for(const character of text){if(!/[\s\u200b\u200d\ufe0f]/.test(character)&&!doc._font.font.hasGlyphForCodePoint(character.codePointAt(0)))missingGlyphs.add(character);}
    return {kind:'text',text,font,size,w:width(text,font,size),...metric(font,size),style};
  }
  function unitsFromText(text,style){
    const units=[];let word='';
    function flush(){if(word){units.push(textUnit(word,style));word='';}}
    for(const {segment} of graphemes.segment(text)){
      if(/^[A-Za-z0-9_]+$/.test(segment))word+=segment;
      else{flush();units.push(textUnit(segment,style));}
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
        case 'text': case 'escape':
          if(token.tokens)units.push(...await inline(token.tokens,style));
          else units.push(...unitsFromText(decode(token.text).replace(/\s*\n\s*/g,' '),style));
          break;
        case 'strong':units.push(...await inline(token.tokens,{...style,bold:true}));break;
        case 'em':units.push(...await inline(token.tokens,{...style,italic:true}));break;
        case 'del':units.push(...await inline(token.tokens,{...style,strike:true}));break;
        case 'link':units.push(...await inline(token.tokens,{...style,link:safeUrl(token.href)?token.href:null,color:'#bc4545'}));break;
        case 'codespan':units.push(...unitsFromText(decode(token.text),{...style,code:true,size:style.size?style.size*.9:baseSize*.9}));break;
        case 'br':units.push({kind:'break'});break;
        case 'mathInline':case 'mathBlock':units.push(formula(token.text,token.display,style.size||baseSize));break;
        case 'image':{
          const image=await imageData(token.href);
          if(image){const w=Math.min(image.width*.75,180),h=w/image.width*image.height;units.push({kind:'image',image,w,above:h,below:0});}
          else units.push(...unitsFromText(`[图片：${token.text||'未载入'}]`,{...style,color:'#777777'}));
          break;
        }
        case 'html':units.push(...unitsFromText(decode(token.text.replace(/<br\s*\/?\s*>/gi,'\n')),{...style,color:'#555555'}));break;
        default:if(token.text)units.push(...unitsFromText(decode(token.text),style));
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
      if(unit.w>available&&unit.kind==='text'&&[...unit.text].length>1){queue.splice(index,1,...[...graphemes.segment(unit.text)].map(value=>textUnit(value.segment,unit.style)));index--;continue;}
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
    return {above,below,height:Math.max(size*(code?1.6:settings.lineHeight),above+below+size*.13)};
  }
  function drawFormula(unit,x,y){
    // SVG-to-PDFKit honors root dimensions before its viewport options. Convert ex
    // dimensions to the exact measured PDF size to keep inline baselines aligned.
    const svg=unit.svg.replace(/\bwidth="[^"]*"/,`width="${unit.w}"`).replace(/\bheight="[^"]*"/,`height="${unit.above+unit.below}"`);
    SVGtoPDF(doc,svg,x,y,{width:unit.w,height:unit.above+unit.below,assumePt:true,fontCallback:()=> 'Body',warningCallback:message=>{if(/unsupported|not found/i.test(message))warnings.add('部分公式样式未被 PDF 引擎支持');}});
  }
  function drawLine(line,x,y,available,{size=baseSize,code=false,align='left',quote=false}={}){
    const metrics=lineMetrics(line,size,code);
    const total=line.reduce((sum,unit)=>sum+unit.w,0);
    if(align==='center')x+=(available-total)/2;else if(align==='right')x+=available-total;
    const baseline=y+(metrics.height-metrics.above-metrics.below)/2+metrics.above;
    if(quote)doc.save().lineWidth(2).strokeColor('#d45d5d').moveTo(x-10,y).lineTo(x-10,y+metrics.height).stroke().restore();
    for(const unit of line){
      if(unit.kind==='text'){
        const style=unit.style;
        if(style.code&&!code)doc.save().roundedRect(x-1,baseline-unit.above-1,unit.w+2,unit.above+unit.below+2,2).fill('#f1f2f4').restore();
        doc.font(unit.font).fontSize(unit.size).fillColor(style.color||'#262a31');
        if(style.bold&&settings.font==='custom')doc.strokeColor(style.color||'#262a31').lineWidth(.18);
        doc.text(unit.text,x,baseline-unit.above,{lineBreak:false,oblique:style.italic?10:0,underline:Boolean(style.link),fill:true,stroke:Boolean(style.bold&&settings.font==='custom')});
        if(style.link)doc.link(x,baseline-unit.above,unit.w,unit.above+unit.below,style.link);
        if(style.strike)doc.save().lineWidth(.5).strokeColor(style.color||'#262a31').moveTo(x,baseline-unit.size*.3).lineTo(x+unit.w,baseline-unit.size*.3).stroke().restore();
      }else if(unit.kind==='math'){
        drawFormula(unit,x,baseline-unit.above);
      }else if(unit.kind==='image')doc.image(unit.image.bytes,x,baseline-unit.above,{width:unit.w,height:unit.above+unit.below});
      x+=unit.w;
    }
    return metrics.height;
  }
  async function paragraph(tokens,{indent=0,prefix='',size=baseSize,bold=false,quote=false,after=settings.paragraphGap}={}){
    const prefixWidth=prefix?Math.max(size*1.45,width(prefix,'Body',size)+5):0;
    const x=left+indent+prefixWidth;
    const available=right-x;
    if(available<size*1.5)throw new Error('可用行宽过小，请减小字号、列表缩进或左右页边距。');
    const lines=wrap(await inline(tokens,{size,bold}),available);
    for(let index=0;index<lines.length;index++){
      const height=lineMetrics(lines[index],size).height;
      if(height>bottom-top)throw new Error('文字或行内公式过高，请增大纸张或减小字号、行距和页边距。');
      ensure(height);
      if(index===0&&prefix)drawLine([textUnit(prefix,{size})],left+indent,cursor,prefixWidth,{size});
      drawLine(lines[index],x,cursor,available,{size,quote});cursor+=height;
    }
    cursor+=after;
  }
  function codeLines(token,indent){
    return token.text.replace(/\t/g,'    ').split('\n').flatMap(text=>wrap(unitsFromText(text,{size:settings.codeFontSize,code:true}),right-left-indent-20));
  }
  function codeHeight(token,indent){return codeLines(token,indent).reduce((sum,line)=>sum+lineMetrics(line,settings.codeFontSize,true).height,0)+(token.lang?settings.codeFontSize*2.1:0)+10;}
  async function codeBlock(token,indent){
    const size=settings.codeFontSize,x=left+indent,available=right-x-20;
    const totalHeight=codeHeight(token,indent);
    if(totalHeight<(bottom-top)*.65)ensure(totalHeight);
    cursor+=3;
    if(token.lang){ensure(size*2.1);doc.save().rect(x,cursor,right-x,size*2.1).fill('#f0f1f4').restore();drawLine([textUnit(token.lang.split(/\s/)[0],{size:8,color:'#777d85'})],x+10,cursor,right-x-20,{size:8});cursor+=size*2.1;}
    for(const line of codeLines(token,indent)){
        const height=lineMetrics(line,size,true).height;ensure(height);
        doc.save().rect(x,cursor,right-x,height+.2).fill('#f4f5f7').restore();
        drawLine(line,x+10,cursor,available,{size,code:true});cursor+=height;
    }
    cursor+=settings.paragraphGap+7;
  }
  async function displayFormula(token,indent){
    let unit=formula(token.text,true,baseSize*1.05);
    const available=right-left-indent;
    const scale=Math.min(1,available/unit.w,(bottom-top-18)/(unit.above+unit.below));
    if(scale<1){unit={...unit,w:unit.w*scale,above:unit.above*scale,below:unit.below*scale};warnings.add('过宽公式已缩小以适应纸张');}
    const height=unit.above+unit.below+baseSize*.8;ensure(height);cursor+=baseSize*.35;
    drawFormula(unit,left+indent+(available-unit.w)/2,cursor);
    cursor+=unit.above+unit.below+baseSize*.45+settings.paragraphGap;
  }
  async function imageBlock(token,indent){
    const image=await imageData(token.href);
    if(!image){await paragraph([{type:'text',text:`[图片：${token.text||'未载入'}]`}],{indent});return;}
    const available=right-left-indent;
    const scale=Math.min(.75,available/image.width,(bottom-top-20)/image.height);
    const width=image.width*scale,height=image.height*scale;
    ensure(height+10);doc.image(image.bytes,left+indent+(available-width)/2,cursor+4,{width,height});cursor+=height+10+settings.paragraphGap;
  }
  async function table(token,indent){
    const available=right-left-indent,columns=token.header.length;
    const padding=6,size=baseSize*.9;
    if(available/columns-padding*2<size*1.1)throw new Error('表格列数较多，请使用横向纸张、较小字号或较小页边距。');
    const widths=Array(columns).fill(available/columns);
    const prepare=async(row,bold)=>Promise.all(row.map(async(cell,index)=>wrap(await inline(cell.tokens,{size,bold}),widths[index]-padding*2)));
    const header=await prepare(token.header,true);
    const rowHeights=cells=>Array.from({length:Math.max(...cells.map(cell=>cell.length))},(_,index)=>Math.max(...cells.map(cell=>lineMetrics(cell[index]||[],size).height)));
    const headerHeight=rowHeights(header).reduce((sum,height)=>sum+height,0)+padding*2;
    const repeatHeader=headerHeight<(bottom-top)*.35;
    let isHeader=false;
    const renderRow=async(cells,heading=false)=>{
      const heights=rowHeights(cells);let index=0;
      if(heights.some(height=>height+padding*2>bottom-top))throw new Error('表格行高超过纸张可用区域，请减小字号、行距或页边距。');
      while(index<heights.length){
        if(cursor+heights[index]+padding*2>bottom){newPage();if(!heading&&repeatHeader)await renderRow(header,true);}
        let count=0,height=padding*2;
        while(index+count<heights.length&&cursor+height+heights[index+count]<=bottom+.01){height+=heights[index+count];count++;}
        if(!count){newPage();continue;}
        let x=left+indent;
        for(let column=0;column<columns;column++){
          doc.save().rect(x,cursor,widths[column],height).fillAndStroke(heading?'#f1f2f5':'#ffffff','#d9dce2').restore();
          let y=cursor+padding;
          for(let line=0;line<count;line++){
            drawLine(cells[column]?.[index+line]||[],x+padding,y,widths[column]-padding*2,{size,align:token.align[column]||'left'});y+=heights[index+line];
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
        case 'heading':{
          const size=baseSize*[1.95,1.55,1.27,1.12,1.04,1][token.depth-1]*settings.headingScale;
          const next=tokens.slice(tokenIndex+1).find(value=>value.type!=='space');
          const nextCodeHeight=next?.type==='code'?codeHeight(next,indent):0;
          const following=nextCodeHeight&&nextCodeHeight<(bottom-top)*.65?nextCodeHeight:baseSize*settings.lineHeight*1.5;
          cursor+=baseSize*.55;ensure(Math.min(size*1.55+following,bottom-top));
          doc.outline.addItem(decode(token.text).replace(/[*_`]/g,''));
          await paragraph(token.tokens,{indent,size,bold:true,quote,after:baseSize*.6});break;
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
            const prefix=item.task?(item.checked?'[x]':'[ ]'):(token.ordered?`${number++}.`:'•');
            const first=item.tokens[0];
            if(first&&['text','paragraph'].includes(first.type)){
              await paragraph(first.tokens||[{type:'text',text:first.text}],{indent,prefix,quote,after:3});await blocks(item.tokens.slice(1),Math.min(indent+baseSize*1.5,(right-left)*.4),quote);
            }else{ensure(baseSize*settings.lineHeight);drawLine([textUnit(prefix,{size:baseSize})],left+indent,cursor,baseSize*2);await blocks(item.tokens,Math.min(indent+baseSize*1.5,(right-left)*.4),quote);}
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
  await blocks(parser.lexer(job.source));
  if(missingGlyphs.size)warnings.add(`所选字体缺少字符：${[...missingGlyphs].slice(0,8).join('')}，请更换字体`);
  const pages=doc.bufferedPageRange();
  for(let page=0;page<pages.count;page++){
    doc.switchToPage(page);doc.font('Body').fontSize(8).fillColor('#7c818a');
    if(settings.pageNumbers){const label=`${page+1} / ${pages.count}`;doc.text(label,(pageWidth-width(label,'Body',8))/2,pageHeight-mm(settings.marginBottom)/2-4,{lineBreak:false});}
    if(settings.header){
      let header=settings.header;while(header.length&&width(header,'Body',8)>right-left)header=header.slice(0,-1);
      if(header!==settings.header)header=header.slice(0,-1)+'…';
      doc.text(header,left,mm(settings.marginTop)/2-4,{lineBreak:false});
    }
  }
  doc.end();const buffer=await finished;
  return {buffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),pages:pages.count,warnings:[...warnings]};
}

let queue=Promise.resolve();
self.onmessage=({data})=>{
  queue=queue.then(async()=>{
    const progress=message=>self.postMessage({id:data.id,type:'progress',message});
    try{const result=await createPdf(data,progress);self.postMessage({id:data.id,type:'result',...result},[result.buffer]);}
    catch(error){self.postMessage({id:data.id,type:'error',message:error.message||'PDF 生成失败，请检查文稿后重试。'});}
  });
};
