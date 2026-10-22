import DOMPurify from 'dompurify';
import katex from 'katex';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import {convertDelimiters, createMarkdown, escapeHtml, normalizeSettings, defaults} from './core.mjs';
import {MARKDOWN_EXAMPLE, LATEX_EXAMPLE} from './examples.mjs';

for (const [name, language] of Object.entries({cpp,python,javascript,json,bash,css,xml})) hljs.registerLanguage(name,language);
const parser = createMarkdown((text, display) => {
  try { return katex.renderToString(text, {displayMode:display, throwOnError:true, trust:false, strict:'ignore', output:'htmlAndMathml', maxExpand:1000}); }
  catch (error) { return `<${display?'div':'span'} class="math-error" title="${escapeHtml(error.message)}">${escapeHtml(text)}</${display?'div':'span'}>`; }
});
parser.use({renderer:{code({text,lang}) {
  const language = (lang || '').split(/\s/)[0];
  const highlighted = hljs.getLanguage(language) ? hljs.highlight(text, {language,ignoreIllegals:true}).value : escapeHtml(text);
  return `<pre><code class="hljs language-${escapeHtml(language || 'text')}">${highlighted}</code></pre>`;
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
  const source = query('#tool-source');
  const kind = root.dataset.mezeTool;
  const storageKey = `meze.tools.${kind}.v1`;
  const saved = storageRead(storageKey);
  let settings = normalizeSettings(saved?.settings);
  if (settings.font === 'custom') settings.font = 'sans';
  let direction = saved?.direction === 'bracket' ? 'bracket' : 'dollar';
  let statusTimer, inputTimer, worker, pdfUrl, pdfSnapshot, pendingPdf, customFont;
  let nextJob = 0;
  let activeJob = null;
  let viewerUrl,viewerVersion=0,disposePdfViewer;
  let previousReplacement = null;
  const status = query('[data-status]');

  function notify(message, error = false, persistent = false) {
    clearTimeout(statusTimer);
    status.hidden = false; status.dataset.kind = error ? 'error' : 'info'; status.textContent = message;
    if (!persistent) statusTimer = setTimeout(() => status.hidden = true, error ? 9000 : 4200);
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({source:source.value,direction,settings,includeDisplay:query('#include-display')?.checked,protectCode:query('#protect-code')?.checked}));
      if (query('[data-draft-state]')) query('[data-draft-state]').textContent = '草稿已保存在本机';
    } catch {
      if (query('[data-draft-state]')) query('[data-draft-state]').textContent = '草稿较大，请下载 .md 保存';
    }
  }
  function updateCount() { query('[data-source-count]').textContent = `${source.value.length.toLocaleString()} 字符`; }
  function markPdfStale() {
    const stale = query('.pdf-stale');
    if (stale) stale.hidden = !pdfSnapshot || (pdfSnapshot.source === source.value && pdfSnapshot.settings === JSON.stringify(settings));
  }
  function updateConversion() {
    const {text,stats} = convertDelimiters(source.value,direction,query('#include-display').checked,query('#protect-code').checked);
    query('#tool-result').value = text;
    query('[data-conversion-stats]').textContent = `已转换 ${stats.inline} 处行内公式、${stats.display} 处块级公式${stats.unclosed ? `；${stats.unclosed} 处未闭合公式已保留` : ''}`;
    persist();
  }
  function updateMarkdown() {
    try {
      const html = parser.parse(source.value);
      query('#markdown-preview').innerHTML = DOMPurify.sanitize(html, {USE_PROFILES:{html:true,mathMl:true}, ADD_ATTR:['target'], FORBID_TAGS:['style','script','iframe','object','embed','form']});
      query('#markdown-preview').querySelectorAll('a').forEach(anchor => {anchor.target='_blank';anchor.rel='noopener noreferrer';});
      query('#markdown-preview').querySelectorAll('input').forEach(input => input.disabled=true);
      query('#markdown-preview').querySelectorAll('img').forEach(image => { image.loading='lazy';image.referrerPolicy='no-referrer'; });
      const errors = query('#markdown-preview').querySelectorAll('.math-error').length;
      root.dataset.mathErrors = errors;
    } catch (error) { notify(`预览失败：${error.message}`,true); }
    markPdfStale(); persist();
  }
  function handleInput(immediate = false) {
    updateCount(); markPdfStale(); clearTimeout(inputTimer);
    if (kind === 'latex' && !query('#auto-convert').checked) { persist(); return; }
    if (immediate) kind === 'latex' ? updateConversion() : updateMarkdown();
    else inputTimer = setTimeout(() => kind === 'latex' ? updateConversion() : updateMarkdown(),180);
  }
  function replaceSource(value) { previousReplacement=source.value;source.value=value;handleInput(true); }

  source.value = typeof saved?.source === 'string' ? saved.source : (kind==='latex' ? LATEX_EXAMPLE : MARKDOWN_EXAMPLE).replaceAll('\\u0060','`');
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
    }
    query('#document-name').value=settings.filename;
    query('.custom-font-control').hidden=settings.font!=='custom';
  }
  function setView(view) {
    for (const tab of root.querySelectorAll('[data-view]')) {
      const current=tab.dataset.view===view;tab.classList.toggle('is-active',current);tab.setAttribute('aria-selected',String(current));tab.tabIndex=current?0:-1;
    }
    query('#markdown-preview').hidden=view!=='markdown';query('#pdf-preview').hidden=view!=='pdf';
    query('.pane-heading [data-action="refresh-pdf"]').hidden=view!=='pdf';
    if(view==='pdf'&&pdfUrl)showPdfPreview().catch(error=>notify(error.message,true));
  }
  async function showPdfPreview(){
    if(!pdfUrl||viewerUrl===pdfUrl)return;
    const url=pdfUrl,current=++viewerVersion;viewerUrl=url;
    const host=query('.pdf-pages');host.hidden=false;query('.pdf-placeholder').hidden=true;
    const module=await import(new URL('./pdf-viewer.js',import.meta.url).href);
    const bytes=await(await fetch(url)).arrayBuffer();
    if(!root.isConnected||current!==viewerVersion)return;
    disposePdfViewer?.();
    const dispose=await module.mountPdfViewer(host,bytes);
    if(current!==viewerVersion||!root.isConnected)dispose();else disposePdfViewer=dispose;
  }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./pdf-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data}) => {
      if (data.id!==activeJob?.id) return;
      if (data.type==='progress') notify(data.message,false,true);
      if (data.type==='result') {activeJob.resolve(data);activeJob=null;}
      if (data.type==='error') {activeJob.reject(new Error(data.message));activeJob=null;}
    };
    worker.onerror=event => {console.error('PDF worker:',event.message,event.filename,event.lineno);activeJob?.reject(new Error(`PDF 引擎未能启动：${event.message||'请刷新页面后重试'}`));activeJob=null;worker?.terminate();worker=null;};
    return worker;
  }
  async function generatePdf() {
    if (!source.value.trim()) throw new Error('先写一点内容，再生成 PDF。');
    if (settings.font==='custom' && !customFont) {
      query('#pdf-settings').hidden=false;query('[data-action="settings"]').setAttribute('aria-expanded','true');
      throw new Error('请先导入 .ttf 或 .otf 字体文件，或改用内置字体。');
    }
    const snapshot={source:source.value,settings:JSON.stringify(settings)};
    if (pdfSnapshot && pdfSnapshot.source===snapshot.source && pdfSnapshot.settings===snapshot.settings && pdfUrl) return {url:pdfUrl};
    if (pendingPdf) return pendingPdf;
    pendingPdf=(async () => {
      const engine=getWorker();
      const result=await new Promise((resolve,reject) => {
        const id=++nextJob;activeJob={id,resolve,reject};
        engine.postMessage({id,source:snapshot.source,settings:{...settings},customFont});
      });
      if (!root.isConnected) return null;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl=URL.createObjectURL(new Blob([result.buffer],{type:'application/pdf'}));pdfSnapshot=snapshot;
      query('.pdf-placeholder').hidden=true;markPdfStale();
      if(!query('#pdf-preview').hidden)showPdfPreview().catch(error=>notify(error.message,true));
      root.dataset.pdfPages=result.pages;root.dataset.pdfWarnings=JSON.stringify(result.warnings);
      notify(`PDF 已生成，共 ${result.pages} 页${result.warnings.length?'。'+result.warnings.join('；'):''}`,result.warnings.length>0);
      return {url:pdfUrl,warnings:result.warnings};
    })();
    try {return await pendingPdf;} finally {pendingPdf=null;}
  }
  async function runPdf(download=false) {
    const buttons=root.querySelectorAll('[data-action="download-pdf"],[data-action="generate-pdf"],[data-action="refresh-pdf"]');
    buttons.forEach(button=>button.disabled=true);root.setAttribute('aria-busy','true');notify('正在准备 PDF…',false,true);
    const name=safeFilename(settings.filename);
    try {
      const result=await generatePdf();if (!result) return;
      if (download) {
        const anchor=Object.assign(document.createElement('a'),{href:result.url,download:name+'.pdf'});
        document.body.append(anchor);anchor.click();anchor.remove();
        if (!result.warnings?.length) notify('PDF 已准备好，正在下载');
      } else setView('pdf');
      if (pdfSnapshot) markPdfStale();
    } catch (error) {notify(error.message,true);}
    finally {buttons.forEach(button=>button.disabled=false);root.removeAttribute('aria-busy');}
  }

  on(root,'click',event => {
    const directionButton=event.target.closest('[data-direction]');
    if (directionButton) {direction=directionButton.dataset.direction;for (const button of root.querySelectorAll('[data-direction]')) {const current=button===directionButton;button.classList.toggle('is-active',current);button.setAttribute('aria-pressed',String(current));}updateConversion();return;}
    const viewButton=event.target.closest('[data-view]');
    if (viewButton) {setView(viewButton.dataset.view);return;}
    const action=event.target.closest('[data-action]')?.dataset.action;
    if (action==='example') {replaceSource((kind==='latex'?LATEX_EXAMPLE:MARKDOWN_EXAMPLE).replaceAll('\\u0060','`'));notify('已载入示例');}
    if (action==='clear') {replaceSource('');source.focus();}
    if (action==='import') query('[data-file-input]').click();
    if (action==='insert-image') query('[data-image-input]').click();
    if (action==='copy') copyResult();
    if (action==='download-text') saveMarkdown();
    if (action==='convert') updateConversion();
    if (action==='use-result') {replaceSource(query('#tool-result').value);notify('结果已用作输入，可以切换转换方向');}
    if (action==='settings') {const panel=query('#pdf-settings');panel.hidden=!panel.hidden;query('[data-action="settings"]').setAttribute('aria-expanded',String(!panel.hidden));}
    if (action==='reset-settings') {const name=settings.filename;settings={...defaults,filename:name};customFont=null;syncSettingsUI();persist();markPdfStale();notify('已恢复默认排版');}
    if (action==='download-pdf') runPdf(true);
    if (action==='generate-pdf'||action==='refresh-pdf') runPdf(false);
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
    if(typeof saved?.includeDisplay==='boolean')query('#include-display').checked=saved.includeDisplay;
    if(typeof saved?.protectCode==='boolean')query('#protect-code').checked=saved.protectCode;
    for(const input of root.querySelectorAll('.conversion-options input'))on(input,'change',()=>handleInput(true));
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
      customFont=new Uint8Array(await file.arrayBuffer());pdfSnapshot=null;query('[data-font-name]').textContent=file.name;notify('自定义字体已载入');markPdfStale();
    });
    on(query('.preview-tabs'),'keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const view=query('[data-view="markdown"]').getAttribute('aria-selected')==='true'?'pdf':'markdown';setView(view);query(`[data-view="${view}"]`).focus();});
  }
  handleInput(true);
  disposeCurrent=()=>{persist();controller.abort();clearTimeout(statusTimer);clearTimeout(inputTimer);worker?.terminate();viewerVersion++;disposePdfViewer?.();if(pdfUrl)URL.revokeObjectURL(pdfUrl);};
}

document.addEventListener('pjax:complete',()=>{if(!document.querySelector('[data-meze-tool]')){disposeCurrent?.();disposeCurrent=null;}else mountTools();});
