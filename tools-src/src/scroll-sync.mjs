import {interpolate,monotonicPoints} from './source-map.mjs';

export function mountScrollSync(root,signal) {
  const source=root.querySelector('#tool-source'),result=root.querySelector('#tool-result'),preview=root.querySelector('#markdown-preview');
  const on=(element,event,callback,options={})=>element?.addEventListener(event,callback,{...options,signal:options.signal||signal});
  const mirrors=new Map(),suppressed=new Map(),models=new Map();
  let conversion=[],pdf=null,pdfController,dirty=true,frame=0,leader=source;

  function visible(element){return element&&element.clientWidth>0&&element.clientHeight>0&&!element.closest('[hidden]');}
  function participants(){return [source,result,preview,pdf?.source===source.value?pdf.viewer.scroll:null].filter(visible);}
  function positionMap(points){
    const forward=monotonicPoints(points);
    return {forward,reverse:monotonicPoints(forward,'top','offset')};
  }
  function textareaMap(element,extra=[]) {
    let mirror=mirrors.get(element);
    if(!mirror){mirror=document.createElement('div');mirror.className='tool-scroll-mirror';mirror.setAttribute('aria-hidden','true');root.append(mirror);mirrors.set(element,mirror);}
    const style=getComputedStyle(element);
    for(const property of ['font','fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','tabSize','wordBreak','overflowWrap','textIndent','textAlign'])mirror.style[property]=style[property];
    mirror.style.width=`${element.clientWidth}px`;
    mirror.textContent=element.value+'\u200b';
    const text=mirror.firstChild,range=document.createRange(),origin=mirror.getBoundingClientRect().top;
    const length=element.value.length,offsets=new Set([0,length,...extra.map(offset=>Math.max(0,Math.min(length,Math.round(offset))))]);
    const step=Math.max(32,Math.ceil(length/6000));
    for(let offset=0;offset<length;offset+=step)offsets.add(offset);
    for(const match of element.value.matchAll(/\n/g))offsets.add(match.index+1);
    const topAt=offset=>{range.setStart(text,offset);range.setEnd(text,Math.min(offset+1,text.length));return range.getBoundingClientRect().top-origin;};
    const points=[];let previous;
    for(const offset of [...offsets].sort((a,b)=>a-b)){
      const top=topAt(offset);
      // Locate wrap boundaries, including long paragraphs with no source newline.
      if(previous&&top>previous.top+Number.parseFloat(style.lineHeight)*.5){
        let start=previous.offset;
        while(start<offset){
          const threshold=topAt(start)+Number.parseFloat(style.lineHeight)*.5;
          if(top<threshold)break;
          let lo=start,hi=offset;
          while(hi-lo>1){const mid=(lo+hi)>>1;if(topAt(mid)<threshold)lo=mid;else hi=mid;}
          points.push({offset:hi,top:topAt(hi)});start=hi;
        }
      }
      points.push({offset,top});previous={offset,top};
    }
    return positionMap(points);
  }
  function markdownMap() {
    const bounds=preview.getBoundingClientRect(),points=[];
    for(const element of preview.querySelectorAll('[data-source-start]')){
      const rect=element.getBoundingClientRect();if(!rect.width&&!rect.height)continue;
      const top=rect.top-bounds.top+preview.scrollTop;
      points.push({offset:Number(element.dataset.sourceStart),top});
      points.push({offset:Number(element.dataset.sourceEnd),top:top+rect.height});
    }
    return positionMap(points);
  }
  function pdfMap() {
    const sizes=new Map(),points=[];
    for(const point of pdf.anchors){
      const page=pdf.viewer.pages[point.page-1];if(!page)continue;
      if(!sizes.has(point.page))sizes.set(point.page,{top:page.offsetTop,height:page.clientHeight});
      const size=sizes.get(point.page);
      points.push({offset:point.offset,top:size.top+point.y/pdf.viewer.pageHeight*size.height});
    }
    return positionMap(points);
  }
  function rebuild() {
    models.clear();
    const elements=participants();
    const extra=[...root.querySelectorAll('#markdown-preview [data-source-start]')].flatMap(element=>[Number(element.dataset.sourceStart),Number(element.dataset.sourceEnd)]);
    if(pdf?.source===source.value)extra.push(...pdf.anchors.map(point=>point.offset));
    const sourceModel=textareaMap(source,extra);models.set(source,sourceModel);
    if(result&&visible(result)){
      const pairs=monotonicPoints(conversion,'output','source');
      const model=textareaMap(result,conversion.map(point=>point.output));
      models.set(result,positionMap(model.forward.map(point=>({offset:interpolate(pairs,point.offset,'output','source'),top:point.top}))));
    }
    if(elements.includes(preview))models.set(preview,markdownMap());
    if(pdf&&elements.includes(pdf.viewer.scroll))models.set(pdf.viewer.scroll,pdfMap());
    dirty=false;
  }
  function synchronize() {
    frame=0;if(signal.aborted||!root.isConnected||!visible(source))return;
    if(dirty)rebuild();
    const elements=participants();if(!elements.includes(leader))leader=source;
    const model=models.get(leader);if(!model?.reverse.length)return;
    const maximum=Math.max(0,leader.scrollHeight-leader.clientHeight);
    if(maximum<1)return;
    const atStart=leader.scrollTop<1,atEnd=leader.scrollTop>=maximum-1;
    const offset=interpolate(model.reverse,leader.scrollTop,'top','offset');
    for(const element of elements){
      if(element===leader)continue;
      const target=models.get(element);if(!target?.forward.length)continue;
      const limit=Math.max(0,element.scrollHeight-element.clientHeight);
      const top=atStart?0:atEnd?limit:Math.max(0,Math.min(limit,interpolate(target.forward,offset)));
      if(Math.abs(element.scrollTop-top)>.5){element.scrollTop=top;suppressed.set(element,element.scrollTop);}
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(synchronize);}
  function refresh(){dirty=true;schedule();}
  function attach(element,eventSignal=signal) {
    if(!element)return;
    on(element,'scroll',()=>{
      const expected=suppressed.get(element);suppressed.delete(element);
      if(expected!==undefined&&Math.abs(expected-element.scrollTop)<1)return;
      leader=element;schedule();
    },{passive:true,signal:eventSignal});
    for(const event of ['wheel','pointerdown','touchstart','keydown'])on(element,event,()=>{suppressed.delete(element);leader=element;},{passive:true,signal:eventSignal});
    observer.observe(element);
  }
  const observer=new ResizeObserver(refresh);
  for(const element of [source,result,preview])attach(element);
  observer.observe(root);
  on(root,'load',refresh,{capture:true});
  on(document.fonts,'loadingdone',refresh);
  signal.addEventListener('abort',()=>{cancelAnimationFrame(frame);pdfController?.abort();observer.disconnect();mirrors.forEach(mirror=>mirror.remove());},{once:true});
  return {
    refresh,
    setConversion(mapping){conversion=mapping;leader=source;refresh();},
    setPdf(viewer,anchors,sourceSnapshot){if(pdf)observer.unobserve(pdf.viewer.scroll);pdfController?.abort();pdfController=new AbortController();pdf={viewer,anchors,source:sourceSnapshot};attach(viewer.scroll,pdfController.signal);leader=source;refresh();},
    clearPdf(){if(pdf)observer.unobserve(pdf.viewer.scroll);pdfController?.abort();pdf=null;refresh();},
    align(){leader=source;refresh();},
  };
}
