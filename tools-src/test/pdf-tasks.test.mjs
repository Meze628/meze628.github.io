import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename,join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {getDocument,OPS} from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const originalFetch=globalThis.fetch,originalSelf=globalThis.self;
let temporary,workerPath,worker,receive,nextId=0;
const jobs=new Map();
before(async()=>{
  temporary=await mkdtemp(join(tmpdir(),'meze-pdf-test-'));workerPath=join(temporary,'worker.mjs');
  const output=await build({entryPoints:[join(root,'src/pdf-worker.mjs')],absWorkingDir:root,bundle:true,format:'esm',target:'es2020',minify:true,write:false,legalComments:'none',outfile:workerPath,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
  await writeFile(workerPath,output.outputFiles[0].contents);
  globalThis.fetch=async(url,options)=>String(url).startsWith('file:')?new Response(await readFile(join(root,'../static/tools-assets/fonts-pdf',basename(new URL(url).pathname)))):originalFetch(url,options);
  worker=globalThis.self={postMessage(message){
    const job=jobs.get(message.id);if(!job)return;
    if(message.type==='result'){jobs.delete(message.id);job.resolve(message);}
    if(message.type==='error'){jobs.delete(message.id);job.reject(new Error(message.message));}
  }};
  await import(pathToFileURL(workerPath));
  receive=worker.onmessage;
});
after(async()=>{
  globalThis.fetch=originalFetch;
  if(originalSelf===undefined)delete globalThis.self;else globalThis.self=originalSelf;
  if(workerPath)await unlink(workerPath);if(temporary)await rmdir(temporary);
});

async function render(source,settings={}){
  const id=++nextId,pending=new Promise((resolve,reject)=>jobs.set(id,{resolve,reject}));
  globalThis.self=worker;receive({data:{id,source,settings}});
  const result=await pending;
  assert.deepEqual(result.warnings,[]);
  const pdf=await getDocument({data:new Uint8Array(result.buffer),isEvalSupported:false,useSystemFonts:false,verbosity:0}).promise;
  const pages=[];
  try{
    for(let number=1;number<=pdf.numPages;number++){
      const page=await pdf.getPage(number),operators=await page.getOperatorList(),paths=[];
      for(let i=0;i<operators.fnArray.length;i++)if(operators.fnArray[i]===OPS.constructPath){
        const [paint,segments,bounds]=operators.argsArray[i];
        if([OPS.stroke,OPS.fill,OPS.fillStroke].includes(paint)&&segments.length===1)paths.push({commands:[...segments[0]],bounds:[...bounds]});
      }
      const boxes=paths.filter(({commands,bounds:[x0,y0,x1,y1]})=>commands.at(-1)===4&&x1>x0&&Math.abs(x1-x0-(y1-y0))<.01);
      const checked=boxes.filter(box=>paths.some(path=>path.commands.length===9&&path.commands[0]===0&&path.commands[3]===1&&path.commands[6]===1&&path.bounds[0]>box.bounds[0]&&path.bounds[1]>box.bounds[1]&&path.bounds[2]<box.bounds[2]&&path.bounds[3]<box.bounds[3]));
      const items=(await page.getTextContent()).items.filter(item=>'str' in item),text=items.map(item=>item.str).join('');
      pages.push({boxes,checked,text,items,width:page.view[2],height:page.view[3]});
    }
    return pages;
  }finally{await pdf.destroy();}
}

const fixture='- [ ] OPEN\n- [x] DONE\n  - [ ] NESTED\n  - [X] UPPER\n- plain\n\n3. [x] ORDERED\n4. regular\n5. [ ] NEXT\n\nLiteral `[ ]` and `[x]`.\n';
for(const settings of [{font:'sans',fontSize:8},{font:'serif',fontSize:12},{font:'sans',fontSize:28}]){
  test(`PDF ${settings.font} ${settings.fontSize}pt 渲染空框和勾选框，保留嵌套、有序编号与代码原文`,async()=>{
    const pages=await render(fixture,settings),boxes=pages.flatMap(page=>page.boxes),text=pages.map(page=>page.text).join('').replace(/\s+/g,'');
    assert.equal(boxes.length,6);assert.equal(pages.reduce((sum,page)=>sum+page.checked.length,0),3);
    for(const box of boxes)assert(Math.abs(box.bounds[2]-box.bounds[0]-settings.fontSize*.88)<.01);
    for(const value of ['OPEN','DONE','NESTED','UPPER','plain','3.ORDERED','4.regular','5.NEXT','Literal[]and[x].'])assert(text.includes(value),value);
    assert(boxes.some(box=>box.bounds[0]>boxes[0].bounds[0]+settings.fontSize));
  });
}

test('松散任务列表、粗体、引用和续段不会丢失或重复方框',async()=>{
  const pages=await render('- [ ] OPEN\n\n- [x] **DONE**\n\n  continuation\n\n> - [ ] QUOTED\n>\n> - [X] FINISHED\n');
  assert.equal(pages.reduce((sum,page)=>sum+page.boxes.length,0),4);
  assert.equal(pages.reduce((sum,page)=>sum+page.checked.length,0),2);
  const text=pages.map(page=>page.text).join('');
  for(const value of ['OPEN','DONE','continuation','QUOTED','FINISHED'])assert(text.includes(value));
});

test('长任务跨页换行时，每项只绘制一个方框，并与首行处在同一页',async()=>{
  const source=Array.from({length:24},(_,i)=>`- [${i%2?'x':' '}] TASK-${String(i).padStart(2,'0')} ${'wrapped task content '.repeat(16)}END-${String(i).padStart(2,'0')}`).join('\n');
  const pages=await render(source,{paper:'A5',fontSize:18,lineHeight:1.4,marginTop:10,marginBottom:10});
  assert(pages.length>2);
  assert.equal(pages.reduce((sum,page)=>sum+page.boxes.length,0),24);
  assert.equal(pages.reduce((sum,page)=>sum+page.checked.length,0),12);
  for(const page of pages){
    assert.equal(page.boxes.length,(page.text.match(/TASK-\d{2}/g)||[]).length);
    for(const {bounds:[x0,y0,x1,y1]} of page.boxes){assert(x0>=28&&x1<page.width-28);assert(y0>=28&&y1<page.height-28);}
  }
  const text=pages.map(page=>page.text).join('');
  for(let i=0;i<24;i++)assert(text.includes(`END-${String(i).padStart(2,'0')}`));
});

test('小于一倍的行间距实际改变 PDF 行基线，零行距也能完成导出',async()=>{
  for(const lineHeight of [1,.95,.8,.5,0]){
    const pages=await render('LINEA  \nLINEB  \nLINEC',{fontSize:12,lineHeight,paragraphGap:0});
    assert.equal(pages.length,1);
    const lines=['LINEA','LINEB','LINEC'].map(text=>pages[0].items.find(item=>item.str===text));
    assert(lines.every(Boolean),JSON.stringify(pages[0].items));
    for(let i=1;i<lines.length;i++)assert(Math.abs(lines[i-1].transform[5]-lines[i].transform[5]-12*lineHeight)<.01);
  }
});

test('居中标题按正文可用宽度居中，普通标题和正文仍靠左',async()=>{
  for(const settings of [{},{marginLeft:10,marginRight:25}]){
    const [page]=await render('# CENTER {align=center}\n\n## SUBTITLE {align="center"}\n\n# DEFAULT\n\nBODY',settings);
    const left=(settings.marginLeft??20)*72/25.4,right=page.width-(settings.marginRight??20)*72/25.4;
    for(const text of ['CENTER','SUBTITLE']){
      const item=page.items.find(item=>item.str===text);assert(item);
      assert(Math.abs(item.transform[4]+item.width/2-(left+right)/2)<.05);
    }
    for(const text of ['DEFAULT','BODY'])assert(Math.abs(page.items.find(item=>item.str===text).transform[4]-left)<.05);
    assert(!page.text.includes('align='));
  }
});

test('小数及零行距的多行表格可以导出，单元格文字不丢失',async()=>{
  for(const lineHeight of [.8,0]){
    const pages=await render('| COL | B |\n|---|---|\n| FIRST '+('wrapped cell content '.repeat(12))+'SECOND THIRD | LAST |',{lineHeight});
    const text=pages.map(page=>page.text).join('');
    for(const value of ['COL','FIRST','SECOND','THIRD','LAST'])assert(text.includes(value));
  }
});
