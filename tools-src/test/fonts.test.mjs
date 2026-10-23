import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarkdown} from '../src/core.mjs';
import {FONT_FAMILIES} from '../src/font-manifest.mjs';
import {fontPlan,fontTier,fontFiles,contains} from '../src/pdf-fonts.mjs';
import {MARKDOWN_EXAMPLE} from '../src/examples.mjs';
const parse=source=>createMarkdown().lexer(source);
test('默认示例不需要下载完整中文字体',()=>{
  const plan=fontPlan(parse(MARKDOWN_EXAMPLE),MARKDOWN_EXAMPLE,{font:'sans'});
  assert(!fontFiles(plan).some(face=>face.file.endsWith('.otf')));
  assert(fontFiles(plan).reduce((sum,face)=>sum+face.bytes,0)<750000);
  assert.equal(plan.math,true);
});
test('纯英文文稿只加载小型拉丁字库',()=>{
  const source='# Hello\n\nExample **bold** and `code`.\n',plan=fontPlan(parse(source),source,{font:'sans'});
  assert.match(plan.regular[0].file,/latin\.woff2$/);assert.match(plan.bold[0].file,/latin\.woff2$/);
  assert(fontFiles(plan).reduce((sum,face)=>sum+face.bytes,0)<150000);
});
test('没有加粗和代码时不加载额外字体',()=>{
  const source='一段普通正文。',plan=fontPlan(parse(source),source,{font:'sans'});
  assert.deepEqual(plan.bold,[]);assert.equal(plan.mono,null);
});

test('页眉也计入字体字符覆盖范围',()=>{
  const source='English body text.',plan=fontPlan(parse(source),source,{font:'sans',header:'中文页眉'});
  assert(plan.regular.some(face=>contains(face.coverage,'文'.codePointAt(0))));
  const rare=fontPlan(parse(source),source,{font:'sans',header:'龘'});
  assert.match(rare.regular[0].file,/\.otf$/);
});
test('生僻字会使用完整字体，未支持的 emoji 不触发完整字体下载',()=>{
  const face=FONT_FAMILIES.sans.regular;
  assert.equal(fontTier('龘',face),'full');
  assert.equal(fontTier('😀',face),'latin');
});
test('后台准备不提前下载生僻字的完整字体',()=>{
  const source='# 龘',plan=fontPlan(parse(source),source,{font:'sans'},{warmup:true});
  assert(!fontFiles(plan).some(face=>face.file.endsWith('.otf')));
});

test('分片覆盖所有实际使用的常用字，代码与普通文本中的公式标记不会触发公式资源',()=>{
  const source='## 标题\n\n缩进、篱笆和换行。\n\n```cpp\n// $x$\n```';
  const plan=fontPlan(parse(source),source,{font:'sans'});
  for(const character of source){const point=character.codePointAt(0);if(contains(FONT_FAMILIES.sans.regular.coverage.common,point))assert(plan.regular.some(face=>contains(face.coverage,point)),character);}
  assert.equal(plan.math,false);
});

test('本机微软雅黑与自定义字体不下载内置正文字体',()=>{
  const source='# 中文标题\n\n```cpp\n123456\n```';
  for(const font of ['yahei','custom']){
    const plan=fontPlan(parse(source),source,{font});
    assert.deepEqual(plan.regular,[]);assert.deepEqual(plan.bold,[]);
    assert.deepEqual(fontFiles(plan),[plan.mono]);assert(plan.mono.bytes<30000);
  }
});
