import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarkdown} from '../src/core.mjs';
import {FONT_FAMILIES} from '../src/font-manifest.mjs';
import {fontPlan,fontTier} from '../src/pdf-fonts.mjs';
import {MARKDOWN_EXAMPLE} from '../src/examples.mjs';
const parse=source=>createMarkdown().lexer(source);
test('默认示例不需要下载完整中文字体',()=>{
  const plan=fontPlan(parse(MARKDOWN_EXAMPLE),MARKDOWN_EXAMPLE,{font:'sans'});
  assert.match(plan.regular.file,/common\.woff2$/);assert.match(plan.bold.file,/common\.woff2$/);
  assert(plan.regular.bytes+plan.bold.bytes+plan.mono.bytes<3.1*1024*1024);
});
test('纯英文文稿只加载小型拉丁字库',()=>{
  const source='# Hello\n\nExample **bold** and `code`.\n',plan=fontPlan(parse(source),source,{font:'sans'});
  assert.match(plan.regular.file,/latin\.woff2$/);assert.match(plan.bold.file,/latin\.woff2$/);
  assert(plan.regular.bytes+plan.bold.bytes<120000);
});
test('没有加粗和代码时不加载额外字体',()=>{
  const source='一段普通正文。',plan=fontPlan(parse(source),source,{font:'sans'});
  assert.equal(plan.bold,null);assert.equal(plan.mono,null);
});

test('页眉也计入字体字符覆盖范围',()=>{
  const source='English body text.',plan=fontPlan(parse(source),source,{font:'sans',header:'中文页眉'});
  assert.match(plan.regular.file,/common\.woff2$/);
  const rare=fontPlan(parse(source),source,{font:'sans',header:'龘'});
  assert.match(rare.regular.file,/\.otf$/);
});
test('生僻字会使用完整字体，未支持的 emoji 不触发完整字体下载',()=>{
  const face=FONT_FAMILIES.sans.regular;
  assert.equal(fontTier('龘',face),'full');
  assert.equal(fontTier('😀',face),'latin');
});
test('后台准备不提前下载生僻字的完整字体',()=>{
  const source='# 龘',plan=fontPlan(parse(source),source,{font:'sans'},{warmup:true});
  assert.match(plan.regular.file,/common\.woff2$/);assert.match(plan.bold.file,/common\.woff2$/);
});
