import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
GlobalWorkerOptions.workerSrc=new URL('./pdfjs-worker.mjs',import.meta.url).href;

export async function mountPdfViewer(container,bytes){
  const abort=new AbortController();
  container.innerHTML='<div class="pdf-viewer-toolbar"><button type="button" class="tool-icon-button" data-page-prev aria-label="上一页">← 上一页</button><span data-page-label>正在载入…</span><button type="button" class="tool-icon-button" data-page-next aria-label="下一页">下一页 →</button><span class="pdf-fit-label">适应宽度</span></div><div class="pdf-canvas-scroll"><canvas class="pdf-page-canvas" role="img" aria-label="PDF 页面"></canvas><div class="pdf-rendering" role="status">正在渲染页面…</div></div>';
  const query=selector=>container.querySelector(selector);
  const canvas=query('canvas'),scroll=query('.pdf-canvas-scroll'),label=query('[data-page-label]'),loading=query('.pdf-rendering');
  const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,verbosity:0});
  const pdf=await task.promise;
  let pageNumber=1,renderTask,version=0,resizeTimer,lastWidth=0,destroyed=false;
  container.dataset.totalPages=pdf.numPages;
  async function render(){
    if(destroyed)return;
    const current=++version;renderTask?.cancel();
    label.textContent=`${pageNumber} / ${pdf.numPages}`;
    query('[data-page-prev]').disabled=pageNumber===1;query('[data-page-next]').disabled=pageNumber===pdf.numPages;
    loading.hidden=false;
    const page=await pdf.getPage(pageNumber);
    if(current!==version||destroyed)return;
    const original=page.getViewport({scale:1});
    const available=Math.max(100,scroll.clientWidth-28);
    const viewport=page.getViewport({scale:available/original.width});
    const ratio=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
    canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
    canvas.setAttribute('aria-label',`PDF 第 ${pageNumber} 页，共 ${pdf.numPages} 页`);
    const localTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});
    renderTask=localTask;
    try{await localTask.promise;}catch(error){if(error.name==='RenderingCancelledException')return;throw error;}
    if(current===version){loading.hidden=true;container.dataset.renderedPage=pageNumber;scroll.scrollTop=0;lastWidth=scroll.clientWidth;}
  }
  const showError=error=>{if(!destroyed){loading.hidden=false;loading.textContent='预览暂时无法显示，仍可直接下载 PDF。';console.error('PDF preview:',error);}};
  query('[data-page-prev]').addEventListener('click',()=>{if(pageNumber>1){pageNumber--;render().catch(showError);}},{signal:abort.signal});
  query('[data-page-next]').addEventListener('click',()=>{if(pageNumber<pdf.numPages){pageNumber++;render().catch(showError);}},{signal:abort.signal});
  const observer=new ResizeObserver(()=>{if(Math.abs(scroll.clientWidth-lastWidth)>2){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render().catch(showError),150);}});
  await render();observer.observe(scroll);
  return ()=>{destroyed=true;version++;abort.abort();observer.disconnect();clearTimeout(resizeTimer);renderTask?.cancel();task.destroy();container.innerHTML='';};
}
