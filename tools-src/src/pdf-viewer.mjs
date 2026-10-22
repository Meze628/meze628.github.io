import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
GlobalWorkerOptions.workerSrc=new URL('./pdfjs-worker.mjs',import.meta.url).href;

export async function mountPdfViewer(container,bytes) {
  const shell=document.createElement('div');
  shell.className='pdf-continuous-viewer';
  shell.innerHTML='<div class="pdf-viewer-toolbar"><span data-page-label>正在载入…</span><button type="button" class="tool-button tool-button-small" data-action="open-pdf" title="打开原 PDF 并打印"><svg class="tool-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-14-2h.01M10 7h.01"/></svg>预览窗口 PDF</button></div><div class="pdf-canvas-scroll" role="region" aria-label="PDF 连续预览" tabindex="0"></div>';
  container.replaceChildren(shell);
  const scroll=shell.querySelector('.pdf-canvas-scroll'),label=shell.querySelector('[data-page-label]');
  const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,verbosity:0});
  let pdf,visibilityObserver,resizeObserver,resizeTimer,activeTask;
  let destroyed=false,busy=false,generation=0,width=0;
  const pages=[];

  function release(record) {
    if(record.rendering)return;
    record.width=0;record.canvas.width=0;record.canvas.height=0;
    record.element.dataset.rendered='false';
    record.page?.cleanup();
  }
  function dispose() {
    if(destroyed)return;
    destroyed=true;generation++;clearTimeout(resizeTimer);
    visibilityObserver?.disconnect();resizeObserver?.disconnect();activeTask?.cancel();
    task.destroy().catch(()=>{});shell.remove();
  }
  async function render(record) {
    const version=generation,targetWidth=width;
    record.rendering=true;
    try {
      record.page=await pdf.getPage(record.number);
      if(destroyed||version!==generation||!record.near)return;
      const original=record.page.getViewport({scale:1});
      record.element.style.aspectRatio=original.width+'/'+original.height;
      const viewport=record.page.getViewport({scale:targetWidth/original.width});
      const ratio=Math.min(2,window.devicePixelRatio||1);
      record.canvas.width=Math.ceil(viewport.width*ratio);record.canvas.height=Math.ceil(viewport.height*ratio);
      const renderTask=record.page.render({canvasContext:record.canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});
      activeTask=renderTask;
      await renderTask.promise;
      if(!destroyed&&version===generation&&record.near) {
        record.width=targetWidth;record.element.dataset.rendered='true';
      }
    } catch(error) {
      if(error.name!=='RenderingCancelledException'&&!destroyed) {
        record.failed=true;record.element.querySelector('.pdf-page-loading').textContent='此页预览失败，请更新预览重试。';
        console.error('PDF preview:',error);
      }
    } finally {
      record.rendering=false;activeTask=null;
      if(!record.near||destroyed)release(record);
    }
  }
  function pump() {
    if(busy||destroyed||!shell.isConnected)return;
    const record=pages.find(page=>page.near&&!page.failed&&page.width!==width);
    if(!record)return;
    busy=true;
    render(record).finally(()=>{busy=false;pump();});
  }

  try {
    pdf=await task.promise;
    if(!shell.isConnected){dispose();return dispose;}
    const first=await pdf.getPage(1),original=first.getViewport({scale:1});
    container.dataset.totalPages=pdf.numPages;
    label.textContent='共 '+pdf.numPages+' 页';
    width=Math.max(100,scroll.clientWidth-36);
    const fragment=document.createDocumentFragment();
    for(let number=1;number<=pdf.numPages;number++) {
      const element=document.createElement('div');
      element.className='pdf-page';element.style.aspectRatio=original.width+'/'+original.height;
      element.dataset.page=number;element.dataset.rendered='false';
      const canvas=document.createElement('canvas');
      canvas.className='pdf-page-canvas';canvas.width=0;canvas.height=0;canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','PDF 第 '+number+' 页，共 '+pdf.numPages+' 页');
      const loading=document.createElement('span');
      loading.className='pdf-page-loading';loading.textContent='第 '+number+' 页';
      element.append(canvas,loading);fragment.append(element);
      pages.push({number,element,canvas,width:0,near:number===1,rendering:false,failed:false,page:number===1?first:null});
    }
    scroll.append(fragment);
    await render(pages[0]);
    if(destroyed||!shell.isConnected){dispose();return dispose;}
    visibilityObserver=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        const record=pages[Number(entry.target.dataset.page)-1];
        record.near=entry.isIntersecting;
        if(!record.near)release(record);
      }
      pump();
    },{root:scroll,rootMargin:'600px 0px'});
    pages.forEach(page=>visibilityObserver.observe(page.element));
    resizeObserver=new ResizeObserver(()=>{
      const nextWidth=Math.max(100,scroll.clientWidth-36);
      if(Math.abs(nextWidth-width)<2)return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        width=nextWidth;generation++;activeTask?.cancel();
        pages.forEach(page=>{page.width=0;page.failed=false;});
        pump();
      },120);
    });
    resizeObserver.observe(scroll);
    return dispose;
  } catch(error) {dispose();throw error;}
}
