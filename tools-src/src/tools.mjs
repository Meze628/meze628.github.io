import DOMPurify from 'dompurify';
import katex from 'katex';
import {convertDelimiters, createMarkdown, escapeHtml, normalizeSettings, defaults} from './core.mjs';
import {MARKDOWN_EXAMPLE, LATEX_EXAMPLE} from './examples.mjs';
import {mountSelectFields} from './select-field.mjs';
import {highlightCode} from './syntax.mjs';
import {indexSource,sourceAttributes} from './source-map.mjs';
import {mountScrollSync} from './scroll-sync.mjs';
import {inspectFont,checkEmbedding} from './font-file.mjs';

const parser = createMarkdown((text, display) => {
  try { return katex.renderToString(text, {displayMode:display, throwOnError:true, trust:false, strict:'ignore', output:'htmlAndMathml', maxExpand:1000}); }
  catch (error) { return `<${display?'div':'span'} class="math-error" title="${escapeHtml(error.message)}">${escapeHtml(text)}</${display?'div':'span'}>`; }
});
parser.use({renderer:{code(token) {
  const {text,lang}=token,language = (lang || '').split(/\s/)[0];
  return `<pre${sourceAttributes(token)}><code class="hljs language-${escapeHtml(language || 'text')}">${highlightCode(text,language)}</code></pre>`;
}}});

let disposeCurrent = null;
function storageRead(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), {href:url,download:name});
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const safeFilename = name => (name || 'Markdown 文稿').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/,'').slice(0,100) || 'Markdown 文稿';

export function mountTools() {
  const root = document.querySelector('[data-meze-tool]');
  if (!root || root.dataset.initialized) return;
  disposeCurrent?.();
  root.dataset.initialized = 'true';
  const controller = new AbortController();
  const signal = controller.signal;
  const on = (target,event,callback) => target?.addEventListener(event,callback,{signal});
  const query = selector => root.querySelector(selector);
  const selectFields = mountSelectFields(root, signal);
  const source = query('#tool-source');
  const scrollSync = mountScrollSync(root,signal);
  const kind = root.dataset.mezeTool;
  const storageKey = `meze.tools.${kind}.v1`;
  const saved = storageRead(storageKey);
  let settings = normalizeSettings(saved?.settings);
  if (settings.font === 'custom') settings.font = 'sans';
  let direction = saved?.direction === 'bracket' ? 'bracket' : 'dollar';
  let statusTimer, inputTimer, worker, workerReady=false, engineTimer, warmupTimer, pdfUrl, pdfSnapshot, pendingPdf, customFont;
  let customFontName,customBoldFont,customBoldFontName,localFontMode;
  let nextJob = 0;
  let activeJob = null;
  let viewerUrl,viewerVersion=0,disposePdfViewer,pdfSourceMap=[],viewerModule;
  let previousReplacement = null;
  let fullscreen = false, previousScroll = 0;
  let inertElements = [];
  const status = query('[data-status]');

  function notify(message, error = false, persistent = false) {
    clearTimeout(statusTimer);
    status.hidden = false; status.dataset.kind = error ? 'error' : 'info'; status.textContent = message;
    if (!persistent) statusTimer = setTimeout(() => status.hidden = true, error ? 9000 : 4200);
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({source:source.value,direction,settings,protectCode:query('#protect-code')?.checked}));
    } catch {}
  }
  function updateCount() { query('[data-source-count]').textContent = `${source.value.length.toLocaleString()} 字符`; }
  function markPdfStale() {
    const stale = query('.pdf-stale');
    if (stale) stale.hidden = !pdfSnapshot || (pdfSnapshot.source === source.value && pdfSnapshot.settings === JSON.stringify(settings));
  }
  function updateConversion() {
    const {text,mapping} = convertDelimiters(source.value,direction,true,query('#protect-code').checked);
    query('#tool-result').value = text;
    scrollSync.setConversion(mapping);
    persist();
  }
  function updateMarkdown() {
    try {
      const html = parser.parser(indexSource(parser.lexer(source.value),source.value));
      query('#markdown-preview').innerHTML = DOMPurify.sanitize(html, {USE_PROFILES:{html:true,mathMl:true}, ADD_ATTR:['target'], FORBID_TAGS:['style','script','iframe','object','embed','form']});
      query('#markdown-preview').querySelectorAll('a').forEach(anchor => {anchor.target='_blank';anchor.rel='noopener noreferrer';});
      query('#markdown-preview').querySelectorAll('input').forEach(input => input.disabled=true);
      query('#markdown-preview').querySelectorAll('img').forEach(image => { image.loading='lazy';image.referrerPolicy='no-referrer'; });
      const errors = query('#markdown-preview').querySelectorAll('.math-error').length;
      root.dataset.mathErrors = errors;
      scrollSync.refresh();
    } catch (error) { notify(`预览失败：${error.message}`,true); }
    markPdfStale(); persist();
  }
  function handleInput(immediate = false) {
    updateCount(); markPdfStale(); clearTimeout(inputTimer);
    if (immediate) kind === 'latex' ? updateConversion() : updateMarkdown();
    else inputTimer = setTimeout(() => kind === 'latex' ? updateConversion() : updateMarkdown(),180);
  }
  function replaceSource(value) { previousReplacement=source.value;source.value=value;handleInput(true); }

  function setFullscreen(enabled) {
    if (enabled === fullscreen) return;
    selectFields.close();
    fullscreen = enabled;
    if (enabled) {
      previousScroll = window.scrollY;
      for (let node = root; node.parentElement && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node) {inertElements.push([sibling,sibling.inert]);sibling.inert = true;}
        }
      }
      root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    } else {
      for (const [element,inert] of inertElements) element.inert = inert;
      inertElements = [];
      root.removeAttribute('role');root.removeAttribute('aria-modal');
    }
    root.classList.toggle('is-fullscreen',enabled);
    scrollSync.refresh();
    document.body.classList.toggle('tools-editing',enabled);
    const button = query('[data-action="fullscreen"]');
    button.setAttribute('aria-pressed',String(enabled));
    button.title = enabled ? '退出全屏（Esc）' : '全屏编辑（Esc 退出）';
    query('[data-fullscreen-label]').textContent = enabled ? '退出全屏' : '全屏编辑';
    query('[data-fullscreen-enter]').hidden = enabled;query('[data-fullscreen-exit]').hidden = !enabled;
    if (enabled) source.focus({preventScroll:true});
    else {if (root.isConnected) button.focus({preventScroll:true});window.scrollTo(0,previousScroll);}
  }
  on(document,'keydown',event => {
    if (!fullscreen) return;
    if (event.key === 'Escape') {event.preventDefault();setFullscreen(false);return;}
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    const controls = [...root.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = controls[0],last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  });
  on(window,'pagehide',()=>setFullscreen(false));

  if(!root.dataset.bootstrapped)source.value = typeof saved?.source === 'string' ? saved.source : (kind==='latex' ? LATEX_EXAMPLE : MARKDOWN_EXAMPLE).replaceAll('\\u0060','`');
  on(source,'input',() => handleInput());
  on(source,'keydown',event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start=source.selectionStart,end=source.selectionEnd;
      if (start === end && !event.shiftKey) source.setRangeText('    ',start,end,'end');
      else {
        const lineStart=source.value.lastIndexOf('\n',start-1)+1;
        const text=source.value.slice(lineStart,end);
        const replacement=event.shiftKey?text.replace(/^(?: {1,4}|\t)/gm,''):text.replace(/^/gm,'    ');
        source.setRangeText(replacement,lineStart,end,'select');
      }
      handleInput(true);
    }
    if ((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='s') {event.preventDefault();saveMarkdown();}
    if ((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='z' && previousReplacement !== null && source.selectionStart===0 && source.selectionEnd===0) {
      event.preventDefault();source.value=previousReplacement;previousReplacement=null;handleInput(true);
    }
  });
  function saveMarkdown() {
    downloadBlob(new Blob([kind==='latex'?query('#tool-result').value:source.value],{type:'text/markdown;charset=utf-8'}),`${safeFilename(settings.filename)}${kind==='latex'?'-转换结果':''}.md`);
  }
  async function copyResult() {
    const result=query('#tool-result');
    try {await navigator.clipboard.writeText(result.value);}
    catch { result.focus();result.select();if (!document.execCommand('copy')) {notify('请选中结果并手动复制。',true);return;} }
    notify('转换结果已复制');
  }
  function syncSettingsUI() {
    for (const input of root.querySelectorAll('[data-setting]')) {
      const value=settings[input.dataset.setting];
      if (input.type==='checkbox') input.checked=value; else input.value=value;
      if (input.type==='number') {
        const field = input.closest('.tool-number-field');
        if (field) {field.querySelector('[data-step="-1"]').disabled=Number(value)<=Number(input.min);field.querySelector('[data-step="1"]').disabled=Number(value)>=Number(input.max);}
      }
    }
    selectFields.sync();
    query('#document-name').value=settings.filename;
    query('.custom-font-control').hidden=settings.font!=='custom';
    query('.yahei-font-control').hidden=settings.font!=='yahei';
    root.style.setProperty('--tools-code-size',settings.codeFontSize+'pt');
    root.dataset.pdfFont=settings.font;
  }
  function setView(view) {
    for (const tab of root.querySelectorAll('[data-view]')) {
      const current=tab.dataset.view===view;tab.classList.toggle('is-active',current);tab.setAttribute('aria-selected',String(current));tab.tabIndex=current?0:-1;
    }
    query('#markdown-preview').hidden=view!=='markdown';query('#pdf-preview').hidden=view!=='pdf';
    query('.pane-heading [data-action="refresh-pdf"]').hidden=view!=='pdf';
    if(view==='pdf'&&pdfUrl)showPdfPreview().catch(error=>notify(error.message,true));
    scrollSync.align();
  }
  function preparePdfViewer(){
    return viewerModule||=import(new URL('./pdf-viewer.js',import.meta.url).href).catch(error=>{viewerModule=null;throw error;});
  }
  async function showPdfPreview(){
    if(!pdfUrl||viewerUrl===pdfUrl)return;
    const url=pdfUrl,current=++viewerVersion;viewerUrl=url;
    const host=query('.pdf-pages');host.hidden=false;query('.pdf-placeholder').hidden=true;
    try {
      const module=await preparePdfViewer();
      const bytes=await(await fetch(url)).arrayBuffer();
      if(!root.isConnected||current!==viewerVersion)return;
      disposePdfViewer?.();disposePdfViewer=null;
      const viewer=await module.mountPdfViewer(host,bytes);
      if(current!==viewerVersion||!root.isConnected)viewer.dispose();
      else {disposePdfViewer=viewer.dispose;scrollSync.setPdf(viewer,pdfSourceMap,pdfSnapshot.source);}
    } catch (error) {if(current===viewerVersion)viewerUrl=null;throw error;}
  }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./pdf-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data}) => {
      if(data.type==='ready'){workerReady=true;clearTimeout(engineTimer);return;}
      if (data.id!==activeJob?.id) return;
      if (data.type==='progress') notify(data.message,false,true);
      if (data.type==='result') {activeJob.resolve(data);activeJob=null;}
      if (data.type==='error') {activeJob.reject(new Error(data.message));activeJob=null;}
    };
    worker.onerror=event => {console.error('PDF worker:',event.message,event.filename,event.lineno);clearTimeout(engineTimer);activeJob?.reject(new Error(`PDF 引擎未能启动：${event.message||'请刷新页面后重试'}`));activeJob=null;worker?.terminate();worker=null;workerReady=false;};
    return worker;
  }
  async function generatePdf() {
    if (!source.value.trim()) throw new Error('先写一点内容，再生成 PDF。');
    if (['custom','yahei'].includes(settings.font) && (!customFont||localFontMode!==settings.font)) {
      query('#pdf-settings').hidden=false;query('[data-action="settings"]').setAttribute('aria-expanded','true');
      throw new Error(settings.font==='yahei'?'请先读取本机微软雅黑，或选择微软雅黑字体文件。':'请先导入 .ttf、.otf 或 .ttc 字体文件，或改用内置字体。');
    }
    const snapshot={source:source.value,settings:JSON.stringify(settings)};
    if (pdfSnapshot && pdfSnapshot.source===snapshot.source && pdfSnapshot.settings===snapshot.settings && pdfUrl) return {url:pdfUrl,cached:true};
    if (pendingPdf) return pendingPdf;
    pendingPdf=(async () => {
      const started=performance.now();
      const engine=getWorker();
      if(!workerReady){
        notify('正在加载 PDF 引擎…',false,true);
        clearTimeout(engineTimer);engineTimer=setTimeout(()=>{if(!workerReady){activeJob?.reject(new Error('PDF 引擎加载超时，请检查连接后重试。'));activeJob=null;worker?.terminate();worker=null;}},45000);
      }
      const result=await new Promise((resolve,reject) => {
        const id=++nextJob;activeJob={id,resolve,reject};
        const local=['custom','yahei'].includes(settings.font);
        engine.postMessage({id,source:snapshot.source,settings:{...settings},customFont:local?customFont:undefined,customFontName:local?customFontName:undefined,customBoldFont:local?customBoldFont:undefined,customBoldFontName:local?customBoldFontName:undefined});
      });
      if (!root.isConnected) return null;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      scrollSync.clearPdf();pdfSourceMap=result.sourceMap||[];
      pdfUrl=URL.createObjectURL(new Blob([result.buffer],{type:'application/pdf'}));pdfSnapshot=snapshot;
      query('.pdf-placeholder').hidden=true;markPdfStale();
      if(!query('#pdf-preview').hidden)showPdfPreview().catch(error=>notify(error.message,true));
      root.dataset.pdfPages=result.pages;root.dataset.pdfWarnings=JSON.stringify(result.warnings);
      root.dataset.pdfDurationMs=String(Math.round(performance.now()-started));
      notify(`PDF 已生成，共 ${result.pages} 页${result.warnings.length?'。'+result.warnings.join('；'):''}`,result.warnings.length>0);
      return {url:pdfUrl,warnings:result.warnings};
    })();
    try {return await pendingPdf;} finally {pendingPdf=null;}
  }
  async function runPdf(download=false) {
    const buttons=root.querySelectorAll('[data-action="download-pdf"],[data-action="generate-pdf"],[data-action="refresh-pdf"]');
    buttons.forEach(button=>button.disabled=true);root.setAttribute('aria-busy','true');notify('正在准备 PDF…',false,true);
    if(!download)preparePdfViewer().catch(()=>{});
    const name=safeFilename(settings.filename);
    try {
      const result=await generatePdf();if (!result) return;
      if (download) {
        const anchor=Object.assign(document.createElement('a'),{href:result.url,download:name+'.pdf'});
        document.body.append(anchor);anchor.click();anchor.remove();
        if (!result.warnings?.length) notify('PDF 已准备好，正在下载');
      } else {setView('pdf');if(result.cached)notify('PDF 预览已更新');}
      if (pdfSnapshot) markPdfStale();
    } catch (error) {notify(error.message,true);}
    finally {buttons.forEach(button=>button.disabled=false);root.removeAttribute('aria-busy');}
  }

  async function openNativePdf() {
    try {
      const result=await generatePdf();
      if (!result||!root.isConnected)return;
      const frame=document.createElement('iframe');
      frame.title='PDF 打印预览';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;';
      frame.src=result.url;
      const cleanup=()=>frame.remove();
      frame.addEventListener('load',()=>{
        try{frame.contentWindow.addEventListener('afterprint',cleanup,{once:true});frame.contentWindow.focus();frame.contentWindow.print();}
        catch{cleanup();notify('浏览器未能调起 PDF 打印预览，请下载 PDF 后打印。',true);}
      },{once:true});
      on(window,'pagehide',cleanup);document.body.append(frame);
    } catch(error) {notify(error.message,true);}
  }

  function acceptLocalFont(bytes,mode,name,boldBytes,boldName) {
    const face=inspectFont(bytes,name);checkEmbedding(face);
    if(boldBytes)checkEmbedding(inspectFont(boldBytes,boldName));
    customFont=bytes;customFontName=face.name;customBoldFont=boldBytes;customBoldFontName=boldName;localFontMode=mode;
    pdfSnapshot=null;markPdfStale();
  }
  async function readYahei() {
    if(!window.queryLocalFonts){query('#yahei-font-file').click();return;}
    try {
      const fonts=await window.queryLocalFonts({postscriptNames:['MicrosoftYaHei','MicrosoftYaHei-Bold']});
      const regular=fonts.find(font=>font.postscriptName==='MicrosoftYaHei'),bold=fonts.find(font=>font.postscriptName==='MicrosoftYaHei-Bold');
      if(!regular)throw new Error('未找到本机微软雅黑，请选择字体文件。');
      const bytes=new Uint8Array(await(await regular.blob()).arrayBuffer());
      const boldBytes=bold?new Uint8Array(await(await bold.blob()).arrayBuffer()):undefined;
      acceptLocalFont(bytes,'yahei',regular.postscriptName,boldBytes,bold?.postscriptName);
      query('[data-yahei-font-name]').textContent='微软雅黑已载入';notify('微软雅黑已载入');
    }catch(error){notify(error.name==='NotAllowedError'?'未获得本机字体访问权限，可改用“选择字体文件”。':error.message,true);}
  }

  on(root,'click',event => {
    const stepButton=event.target.closest('[data-step]');
    if (stepButton) {
      event.preventDefault();
      const input=stepButton.closest('.tool-number-field').querySelector('input');
      input.stepUp(Number(stepButton.dataset.step));input.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    const directionButton=event.target.closest('[data-direction]');
    if (directionButton) {direction=directionButton.dataset.direction;for (const button of root.querySelectorAll('[data-direction]')) {const current=button===directionButton;button.classList.toggle('is-active',current);button.setAttribute('aria-pressed',String(current));}updateConversion();return;}
    const viewButton=event.target.closest('[data-view]');
    if (viewButton) {setView(viewButton.dataset.view);if(viewButton.dataset.view==='pdf'&&!pdfUrl)runPdf(false);return;}
    const action=event.target.closest('[data-action]')?.dataset.action;
    if (action==='example') {replaceSource((kind==='latex'?LATEX_EXAMPLE:MARKDOWN_EXAMPLE).replaceAll('\\u0060','`'));notify('已载入示例');}
    if (action==='clear') {replaceSource('');source.focus();}
    if (action==='import') query('[data-file-input]').click();
    if (action==='insert-image') query('[data-image-input]').click();
    if (action==='copy') copyResult();
    if (action==='download-text') saveMarkdown();
    if (action==='fullscreen') setFullscreen(!fullscreen);
    if (action==='settings') {selectFields.close();const panel=query('#pdf-settings');panel.hidden=!panel.hidden;query('[data-action="settings"]').setAttribute('aria-expanded',String(!panel.hidden));}
    if (action==='reset-settings') {const name=settings.filename;settings={...defaults,filename:name};customFont=null;syncSettingsUI();persist();markPdfStale();notify('已恢复默认排版');}
    if (action==='download-pdf') runPdf(true);
    if (action==='generate-pdf'||action==='refresh-pdf') {if(action==='refresh-pdf')viewerUrl=null;runPdf(false);}
    if (action==='open-pdf') openNativePdf();
    if (action==='read-yahei') readYahei();
    if (action==='import-yahei') query('#yahei-font-file').click();
  });
  on(query('[data-file-input]'),'change',async event => {
    const file=event.target.files[0];if (!file) return;
    if (file.size>20*1024*1024) {notify('文稿超过 20 MB，请拆分后导入。',true);return;}
    const text=(await file.text()).replace(/^\uFEFF/,'');replaceSource(text);
    settings.filename=file.name.replace(/\.(?:md|markdown|txt)$/i,'');
    if (kind==='markdown') syncSettingsUI();persist();notify(`已导入 ${file.name}`);event.target.value='';
  });
  async function insertImage(file) {
    if (!/^image\//.test(file.type)) throw new Error('请选择图片文件。');
    if (file.size>20*1024*1024) throw new Error('图片超过 20 MB，请缩小后再导入。');
    const image=await createImageBitmap(file);
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    canvas.getContext('2d').drawImage(image,0,0);image.close();
    const uri=canvas.toDataURL('image/png');
    source.setRangeText(`\n![${file.name.replace(/[\[\]]/g,'')}](${uri})\n`,source.selectionStart,source.selectionEnd,'end');handleInput(true);notify('图片已嵌入文稿，导出 PDF 时可直接使用');
  }
  on(query('[data-image-input]'),'change',async event => {const file=event.target.files[0];if(file)try{await insertImage(file);}catch(error){notify(error.message,true);}event.target.value='';});
  on(root,'dragover',event => {if(event.dataTransfer.types.includes('Files'))event.preventDefault();});
  on(root,'drop',async event => {
    const file=event.dataTransfer.files[0];if(!file)return;event.preventDefault();
    try {
      if(file.type.startsWith('image/')&&kind==='markdown') await insertImage(file);
      else if(/\.(md|markdown|txt)$/i.test(file.name)) {replaceSource((await file.text()).replace(/^\uFEFF/,''));notify(`已导入 ${file.name}`);}
      else notify('请拖入 Markdown、文本或图片文件。',true);
    } catch(error) {notify(error.message,true);}
  });
  if (kind==='latex') {
    if(typeof saved?.protectCode==='boolean')query('#protect-code').checked=saved.protectCode;
    on(query('#protect-code'),'change',()=>handleInput(true));
    for(const button of root.querySelectorAll('[data-direction]')){const current=button.dataset.direction===direction;button.classList.toggle('is-active',current);button.setAttribute('aria-pressed',String(current));}
  } else {
    syncSettingsUI();
    for(const input of root.querySelectorAll('[data-setting]'))on(input,'change',()=>{
      settings=normalizeSettings({...settings,[input.dataset.setting]:input.type==='checkbox'?input.checked:input.value});syncSettingsUI();markPdfStale();persist();
    });
    on(query('#document-name'),'input',event=>{settings.filename=event.target.value;markPdfStale();persist();});
    on(query('#custom-font-file'),'change',async event=>{
      const file=event.target.files[0];if(!file)return;
      if(file.size>40*1024*1024){notify('字体文件超过 40 MB，请选择较小的字体。',true);return;}
      try{acceptLocalFont(new Uint8Array(await file.arrayBuffer()),'custom');query('[data-font-name]').textContent=file.name;notify('自定义字体已载入');}
      catch(error){notify(error.message,true);}finally{event.target.value='';}
    });
    on(query('#yahei-font-file'),'change',async event=>{
      try{
        const faces=await Promise.all([...event.target.files].map(async file=>{
          if(file.size>40*1024*1024)throw new Error('字体文件超过 40 MB，请选择较小的字体。');
          const bytes=new Uint8Array(await file.arrayBuffer());return {bytes,face:inspectFont(bytes,'MicrosoftYaHei')};
        }));
        if(!faces.length)return;
        const regular=faces.find(value=>/^MicrosoftYaHei(?:UI)?$/.test(value.face.name)),bold=faces.find(value=>/^MicrosoftYaHei(?:UI)?-Bold$/.test(value.face.name));
        if(!regular)throw new Error('请选择微软雅黑的常规字体文件，例如 msyh.ttc。');
        acceptLocalFont(regular.bytes,'yahei',regular.face.name,bold?.bytes,bold?.face.name);
        query('[data-yahei-font-name]').textContent='微软雅黑已载入';notify('微软雅黑已载入');
      }catch(error){notify(error.message,true);}finally{event.target.value='';}
    });
    on(query('.preview-tabs'),'keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const view=query('[data-view="markdown"]').getAttribute('aria-selected')==='true'?'pdf':'markdown';setView(view);query(`[data-view="${view}"]`).focus();});
  }
  handleInput(true);
  if(kind==='markdown')warmupTimer=setTimeout(()=>{if(root.isConnected&&!signal.aborted)getWorker().postMessage({type:'warmup',source:source.value.slice(0,50000),settings});},1200);
  disposeCurrent=()=>{selectFields.close();setFullscreen(false);persist();controller.abort();clearTimeout(statusTimer);clearTimeout(inputTimer);clearTimeout(engineTimer);clearTimeout(warmupTimer);worker?.terminate();viewerVersion++;disposePdfViewer?.();if(pdfUrl)URL.revokeObjectURL(pdfUrl);};
}

document.addEventListener('pjax:complete',()=>{if(!document.querySelector('[data-meze-tool]')){disposeCurrent?.();disposeCurrent=null;}else mountTools();});
