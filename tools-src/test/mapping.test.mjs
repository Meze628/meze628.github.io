import test from 'node:test';
import assert from 'node:assert/strict';
import {convertDelimiters,createMarkdown} from '../src/core.mjs';
import {indexSource,interpolate,monotonicPoints} from '../src/source-map.mjs';
import {codeSpans,highlightCode} from '../src/syntax.mjs';

test('分隔符转换的映射对齐公式正文及原文末尾',()=>{
  for(const direction of ['dollar','bracket']){
    const source=String.raw`前文 \[x+y\] 中间 \(a+b\) 后文 $c+d$ 末尾`;
    const result=convertDelimiters(source,direction),map=monotonicPoints(result.mapping,'source','output');
    for(const content of ['x+y','a+b','c+d','末尾'])assert.equal(interpolate(map,source.indexOf(content),'source','output'),result.text.indexOf(content));
    assert.equal(interpolate(map,source.length,'source','output'),result.text.length);
    for(let i=1;i<map.length;i++)assert(map[i].source>map[i-1].source&&map[i].output>=map[i-1].output);
  }
});
test('同一块级公式增加换行后仍保留后续各段的位置',()=>{
  const source='第一段\n\n\\[x\\]\n\n第三段\n\n\\[y\\]\n\n末段';
  const result=convertDelimiters(source),points=monotonicPoints(result.mapping,'source','output');
  for(const text of ['第一段','第三段','末段'])assert.equal(interpolate(points,source.indexOf(text),'source','output'),result.text.indexOf(text));
});
test('Markdown 重复段落、嵌套列表、引用和表格定位到各自源码',()=>{
  const source='# 标题\n\n重复段落。\n\n重复段落。\n\n> 引用文字\n>\n> - 引用列表\n\n- 第一项\n  - 嵌套项\n\n| 列一 | 列二 |\n|---|---|\n| 单元甲 | 单元乙 |\n';
  const tokens=indexSource(createMarkdown().lexer(source),source),paragraphs=tokens.filter(token=>token.type==='paragraph');
  assert.equal(paragraphs[0].sourceStart,source.indexOf('重复段落。'));
  assert.equal(paragraphs[1].sourceStart,source.lastIndexOf('重复段落。'));
  const visit=tokens=>{for(const token of tokens||[]){assert(token.sourceStart>=0&&token.sourceEnd>=token.sourceStart&&token.sourceEnd<=source.length);visit(token.tokens);visit(token.items);}};
  visit(tokens);
  const table=tokens.find(token=>token.type==='table');
  assert.equal(table.rows[0][1].sourceStart,source.indexOf('单元乙'));
});
test('渲染结果携带正文、列表、公式的源码锚点',()=>{
  const parser=createMarkdown(text=>`<span>${text}</span>`),source='# 标题\n\n段落 **强调**。\n\n- 一项\n\n$$\nx+y\n$$\n';
  const html=parser.parser(indexSource(parser.lexer(source),source));
  assert.match(html,/<h1 data-source-start="0"/);
  assert.match(html,/<p data-source-start=/);
  assert.match(html,/<li data-source-start=/);
  assert.match(html,/<span data-source-start="\d+" data-source-end="\d+">x\+y<\/span>/);
});
test('内容锚点按段落插值，跨高度不同的代码段保持对应',()=>{
  const points=monotonicPoints([{offset:0,top:0},{offset:100,top:400},{offset:200,top:450},{offset:300,top:1300}]);
  assert.equal(interpolate(points,150),425);
  assert.equal(interpolate(points,425,'top','offset'),150);
  assert.equal(interpolate(points,-1),0);
  assert.equal(interpolate(points,999),1300);
});
for(const language of ['cpp','c++','c','python','javascript','typescript','json','bash','css','html','java','csharp','go','rust','sql','yaml','latex','markdown','unknown','']){
  test(`高亮不丢失 ${language||'未指定语言'} 代码的字符`,()=>{
    const text='// 中文 & <tag> "quoted" \'text\'\nconst answer = 42;\n\tprint("你好😀");\n';
    const spans=codeSpans(text,language);
    assert.equal(spans.map(span=>span.text).join(''),text);
    assert.equal(spans.at(-1).end,text.length);
    for(const span of spans)assert.equal(text.slice(span.start,span.end),span.text);
  });
}
test('PDF 代码高亮包含关键字、数字、字符串和注释的颜色',()=>{
  const spans=codeSpans('// note\nint main(){ return 42; }\nconst char* s="hello";','cpp');
  assert(new Set(spans.map(span=>span.color)).size>=4);
  assert.match(highlightCode('int n = 42;','cpp'),/hljs-(?:type|keyword)/);
});
