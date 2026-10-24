import test from 'node:test';
import assert from 'node:assert/strict';
import {convertDelimiters,createMarkdown,normalizeSettings} from '../src/core.mjs';

const convert=(source,direction='dollar',display=true,protect=true)=>convertDelimiters(source,direction,display,protect).text;
const cases=[
  ['行内转美元',String.raw`中文 \(a+b\) 结束`,'dollar',String.raw`中文 $a+b$ 结束`],
  ['美元转括号',String.raw`中文 $a+b$ 结束`,'bracket',String.raw`中文 \(a+b\) 结束`],
  ['保留已有目标格式',String.raw`$a$ 与 \(b\)`,'dollar','$a$ 与 $b$'],
  ['保留已有括号格式',String.raw`$a$ 与 \(b\)`,'bracket',String.raw`\(a\) 与 \(b\)`],
  ['相邻公式不会拼成块级分隔符',String.raw`\(a\)\(b\)`,'dollar','$a$ $b$'],
  ['保留转义美元',String.raw`价格 \$5，公式 $x$`,'bracket',String.raw`价格 \$5，公式 \(x\)`],
  ['不将价格跨配',String.raw`价格 $5 和 $10，公式 $x$`,'bracket',String.raw`价格 $5 和 $10，公式 \(x\)`],
  ['保留转义括号',String.raw`\\(literal\\) 与 \(x\)`,'dollar',String.raw`\\(literal\\) 与 $x$`],
  ['公式里的转义美元',String.raw`\(\text{cost }\$5\)`,'dollar',String.raw`$\text{cost }\$5$`],
  ['未闭合括号',String.raw`前文 \(x+y`,'dollar',String.raw`前文 \(x+y`],
  ['未闭合美元',String.raw`前文 $x+y`,'bracket',String.raw`前文 $x+y`],
  ['不跨空段匹配',String.raw`\(x`+'\n\n'+String.raw`y\)`,'dollar',String.raw`\(x`+'\n\n'+String.raw`y\)`],
  ['不转换行内代码','`\\(x\\)` 与 \\(y\\)','dollar','`\\(x\\)` 与 $y$'],
  ['长反引号行内代码','`` ` \\(x\\) ` `` 与 \\(y\\)','dollar','`` ` \\(x\\) ` `` 与 $y$'],
  ['跳过围栏代码','```tex\n\\(x\\)\n```\n\\(y\\)','dollar','```tex\n\\(x\\)\n```\n$y$'],
  ['跳过波浪线代码','~~~tex\n$x$\n~~~\n$y$','bracket','~~~tex\n$x$\n~~~\n\\(y\\)'],
  ['跳过缩进代码','    \\(x\\)\n\n\\(y\\)','dollar','    \\(x\\)\n\n$y$'],
  ['跳过引用中的围栏','> ```\n> \\(x\\)\n> ```\n\n\\(y\\)','dollar','> ```\n> \\(x\\)\n> ```\n\n$y$'],
  ['跳过未闭合围栏','```\n\\(x\\)','dollar','```\n\\(x\\)'],
  ['缩进代码中的围栏不吞掉后续段落','    ```\n    \\(code\\)\n\n\\(text\\)','dollar','    ```\n    \\(code\\)\n\n$text$'],
  ['跳过列表代码','- 示例 `\\(x\\)`\n- 公式 \\(y\\)','dollar','- 示例 `\\(x\\)`\n- 公式 $y$'],
  ['重复表格代码','| A | B |\n|---|---|\n| `$x$` | `$x$` |\n\n$y$','bracket','| A | B |\n|---|---|\n| `$x$` | `$x$` |\n\n\\(y\\)'],
  ['HTML 代码','<code>\\(x\\)</code> 和 \\(y\\)','dollar','<code>\\(x\\)</code> 和 $y$'],
  ['块级到美元',String.raw`\[x+y\]`,'dollar','$$\nx+y\n$$'],
  ['块级到括号','$$\nx+y\n$$','bracket','\\[\nx+y\n\\]'],
];
for(const [name,source,direction,expected] of cases)test(name,()=>assert.equal(convert(source,direction),expected));
test('可关闭块级转换',()=>assert.equal(convert(String.raw`\(a\) \[b\]`,'dollar',false),String.raw`$a$ \[b\]`));
test('可关闭代码保护',()=>assert.equal(convert('`\\(a\\)`','dollar',true,false),'`$a$`'));
test('转换为同一目标幂等',()=>{
  const text=String.raw`# 公式 \(x_i\)，$y$，\[z\]`;
  for(const direction of ['dollar','bracket'])assert.equal(convert(convert(text,direction),direction),convert(text,direction));
});
test('独立行内公式双向往返',()=>{
  for(const body of ['x+y',String.raw`\frac{a}{b}`,String.raw`\text{中文}`,String.raw`\sum_{i=1}^n i`]){
    const input=String.raw`前文 \(`+body+String.raw`\) 后文`;
    assert.equal(convert(convert(input),'bracket'),input);
  }
});
test('四种公式进入同一个 Markdown 语法树',()=>{
  const parser=createMarkdown((text,display)=>`<span data-display="${display}">${text}</span>`);
  const html=parser.parse(String.raw`$a$ 与 \(b\)`+'\n\n$$\nc\n$$\n\n\\[\nd\n\\]');
  assert.equal((html.match(/data-display=/g)||[]).length,4);
  assert.equal((html.match(/data-display="true"/g)||[]).length,2);
});
test('代码里的公式不参与渲染',()=>{
  const parser=createMarkdown(()=>'<MATH>');
  const html=parser.parse('`$x$`\n\n```tex\n\\(y\\)\n```');assert(!html.includes('<MATH>'));
});
test('行内分页符说明仍为一个代码片段',()=>{
  const parser=createMarkdown();
  assert.match(parser.parse('输入 `<!-- pagebreak -->` 即可。'),/<code>&lt;!-- pagebreak --&gt;<\/code>/);
});
test('真正的分页符只在独立行识别',()=>{
  const tokens=createMarkdown().lexer('前一页\n\n<!-- pagebreak -->\n\n后一页');
  assert.equal(tokens.filter(t=>t.type==='pageBreak').length,1);
});
test('原始 HTML 按文本显示',()=>{
  const html=createMarkdown().parse('<img src=x onerror=alert(1)>');assert(!html.includes('<img'));assert(html.includes('&lt;img'));
});
test('配置边界不会产生无效数值',()=>{
  const value=normalizeSettings({fontSize:-100,lineHeight:'bad',paper:'INVALID',marginLeft:1000});
  assert.equal(value.fontSize,8);assert.equal(value.lineHeight,1.65);assert.equal(value.paper,'A4');assert.equal(value.marginLeft,50);
});

test('PDF 行间距保留 0 到 1 之间的小数，越界数值仍有限制',()=>{
  for(const lineHeight of [0,.05,.5,.8,.95,1])assert.equal(normalizeSettings({lineHeight}).lineHeight,lineHeight);
  assert.equal(normalizeSettings({lineHeight:-.1}).lineHeight,0);
  assert.equal(normalizeSettings({lineHeight:10}).lineHeight,3);
});

test('所有级别标题支持居中属性，属性不作为正文或公式输出',()=>{
  const parser=createMarkdown(text=>`<span class="math">${text}</span>`);
  for(let depth=1;depth<=6;depth++){
    for(const attribute of ['{align=center}','{align="center"}',"{align='CENTER'}"]){
      const source='#'.repeat(depth)+' 标题 **强调** \\(x+y\\) '+attribute;
      const tokens=parser.lexer(source),heading=tokens[0],html=parser.parser(tokens);
      assert.equal(heading.align,'center');assert(!heading.text.includes(attribute));
      assert.match(html,new RegExp(`<h${depth} style="text-align: center;">`));
      assert(html.includes('<strong>强调</strong>'));assert(html.includes('<span class="math">x+y</span>'));assert(!html.includes(attribute));
    }
  }
});

test('普通标题、标题内代码、引用链接和不支持的属性保持原有语义',()=>{
  const parser=createMarkdown();
  assert.equal(parser.parse('# 普通标题'),'<h1>普通标题</h1>\n');
  assert.match(parser.parse('# `{align=center}`'),/<h1><code>\{align=center\}<\/code><\/h1>/);
  assert(!parser.parse('# 标题 {align="center" onclick="alert(1)"}').includes('style='));
  assert.match(parser.parse('# [标题][target] {align=center}\n\n[target]: https://example.com'),/<h1 style="text-align: center;"><a href="https:\/\/example.com">标题<\/a><\/h1>/);
  assert.match(parser.parse('标题 {align=center}\n===\n'),/<h1 style="text-align: center;">标题<\/h1>/);
});
