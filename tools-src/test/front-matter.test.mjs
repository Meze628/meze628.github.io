import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarkdown} from '../src/core.mjs';
import {readFrontMatter} from '../src/front-matter.mjs';
import {indexSource} from '../src/source-map.mjs';
import {fontPlan,contains} from '../src/pdf-fonts.mjs';

export const frontMatter='---\ntitle: 计数题\ndescription: 计数题\ndate: 2026-02-27T14:18:15+08:00\nmath: true\nweight: 1\ncategories:\n  - 记录（OI与数学）\ntags:\n  - 组合数学\n---\n';

test('博客头部显示标题、简介、完整日期、分类、标签和配置字段',()=>{
  const parser=createMarkdown(),source=frontMatter+'\n正文内容。',tokens=parser.lexer(source),html=parser.parser(tokens);
  assert.equal(tokens[0].type,'frontMatter');assert.equal(tokens[1].type,'space');
  assert.match(html,/<h1 class="md-front-matter-title">计数题<\/h1>/);
  assert.match(html,/<p class="md-front-matter-description">计数题<\/p>/);
  for(const text of ['2026-02-27T14:18:15+08:00','分类：记录（OI与数学）','标签：组合数学','math: true','weight: 1','正文内容。'])assert(html.includes(text),text);
  assert(!html.includes('<hr'));assert(!html.includes('title:'));assert.equal(parser.parse(source),html);
});

test('带 BOM、CRLF、注释、引号和多行简介的 YAML 可以解析',()=>{
  const source='\uFEFF---\r\ntitle: "冒号: 标题" # 注释\r\ndescription: >-\r\n  第一行\r\n  第二行\r\ntags: [组合数学, "a: b"]\r\n---\r\n正文';
  const front=readFrontMatter(source),html=createMarkdown().parse(source);
  assert.equal(front.metadata.title,'冒号: 标题');assert.equal(front.metadata.description,'第一行 第二行');
  assert.deepEqual(front.metadata.tags,['组合数学','a: b']);assert(html.includes('正文'));
});

test('没有正文的头部、只有配置的头部、空值与额外嵌套字段都完整显示',()=>{
  for(const source of ['---\nmath: true\nweight: 1\n---','---\nauthor: Meze\ndraft: false\nempty: null\nblank: ""\ncustom: {level: 2, list: [a, b]}\n---']){
    const html=createMarkdown().parse(source);
    assert(html.includes('md-front-matter'));assert(!html.includes('<hr'));
    const token=readFrontMatter(source);
    for(const [key] of Object.entries({...(source.includes('author')?{author:1,draft:1,empty:1,blank:1,custom:1}:{math:1,weight:1})}))assert(html.includes(key+':'),key);
    assert(token.tokens.length>=2);
  }
});

test('标题和简介按纯文字显示，HTML 和 Markdown 不会变成可执行内容',()=>{
  const source='---\ntitle: \'<img src=x onerror=alert(1)> &amp; **标题**\'\ndescription: \'[点击](javascript:alert(1))\'\ncustom: \'<script>alert(1)</script>\'\n---\n';
  const html=createMarkdown().parse(source);
  assert(!html.includes('<img'));assert(!html.includes('<script'));assert(!html.includes('<a '));assert(!html.includes('<strong>'));
  assert(html.includes('&lt;img'));assert(html.includes('&amp;amp; **标题**'));
});

test('围栏代码、中途的分隔线、引用和列表不被识别为文章头部',()=>{
  const parser=createMarkdown();
  for(const source of ['```yaml\n'+frontMatter+'```','正文\n\n'+frontMatter,'> '+frontMatter.replaceAll('\n','\n> '),'- 示例\n\n'+frontMatter.split('\n').map(line=>'  '+line).join('\n')]){
    assert.equal(readFrontMatter(source),null);
    assert(!parser.parse(source).includes('md-front-matter'));
  }
  assert.match(parser.parse('```yaml\n'+frontMatter+'```'),/language-yaml/);
});

test('未闭合、非法、重复字段或非映射 YAML 保留为普通 Markdown',()=>{
  for(const source of ['---\ntitle: 输入中','---\ntitle: [broken\n---\n正文','---\ntitle: A\ntitle: B\n---\n正文','---\n一段普通文字\n---\n正文','---\n- a\n- b\n---\n正文','---\n---\n正文']){
    assert.equal(readFrontMatter(source),null);
    const html=createMarkdown().parse(source);
    assert(!html.includes('md-front-matter'));assert(html.includes(source.includes('正文')?'正文':'输入中'));
  }
});

test('YAML 未知标签和过量别名不展开，正常别名可以显示',()=>{
  assert.equal(readFrontMatter('---\ntitle: !unsafe value\n---\n'),null);
  const excessive='---\na: &a [one, two]\nb: &b ['+Array(15).fill('*a').join(', ')+']\nc: ['+Array(15).fill('*b').join(', ')+']\n---\n';
  assert.equal(readFrontMatter(excessive),null);
  const html=createMarkdown().parse('---\ntitle: &name 标题\ndescription: *name\n---\n');
  assert.match(html,/md-front-matter-description">标题/);
});

test('反复预览不会沿用上篇头部，Markdown 行内解析不吞掉 YAML',()=>{
  const parser=createMarkdown();
  assert(parser.parse(frontMatter).includes('math: true'));
  assert.equal(parser.parse('# 普通标题'),'<h1>普通标题</h1>\n');
  assert(!parser.parseInline('---\ntitle: A\n---').includes('md-front-matter'));
});

test('元信息及重复的正文定位到各自源码，CRLF 不偏移后面的任务框',()=>{
  for(const source of [frontMatter,frontMatter.replaceAll('\n','\r\n')].map(header=>header+'\n计数题\n\n- [ ] 计数题\n')){
    const parser=createMarkdown(),tokens=indexSource(parser.lexer(source),source),front=tokens[0],paragraph=tokens.find(t=>t.type==='paragraph'),list=tokens.find(t=>t.type==='list');
    assert.equal(front.sourceStart,0);assert.equal(front.sourceEnd,front.raw.length);
    assert.equal(source.slice(front.tokens[0].sourceStart,front.tokens[0].sourceEnd),'计数题');
    assert.equal(paragraph.sourceStart,source.indexOf('计数题',front.raw.length));
    assert.equal(list.items[0].tokens[0].sourceStart,source.indexOf('[ ]',front.raw.length));
    assert.match(parser.parser(tokens),new RegExp(`<header data-source-start="0" data-source-end="${front.raw.length}"`));
  }
});

test('元信息标题使用粗体字库，生成的分类标签也计入字体覆盖；math 字段不触发公式组件',()=>{
  const parser=createMarkdown(),source='---\ntitle: 中文标题\nmath: true\ncategories: [English]\ntags: [test]\n---\nBody.';
  const plan=fontPlan(parser.lexer(source),source,{font:'sans'});
  for(const character of '中文标题')assert(plan.bold.some(face=>contains(face.coverage,character.codePointAt(0))));
  for(const character of '分类标签')assert(plan.regular.some(face=>contains(face.coverage,character.codePointAt(0))));
  assert.equal(plan.math,false);assert.equal(plan.mono,null);
});
