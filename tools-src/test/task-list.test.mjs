import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarkdown} from '../src/core.mjs';
import {indexSource} from '../src/source-map.mjs';
import {setTaskChecked} from '../src/task-list.mjs';

function checkboxes(source){
  const result=[];
  function walk(tokens){for(const token of tokens||[]){if(token.type==='checkbox')result.push(token);walk(token.tokens);walk(token.items);}}
  walk(indexSource(createMarkdown().lexer(source),source));return result;
}
for(const source of [
  '- [ ] SAME\n- [x] SAME\n  - [X] CHILD\n',
  '> - [ ] SAME\n>\n> - [x] **SAME**\n>\n>   continued\n',
  '3. [ ] SAME\n4. [x] SAME\n',
  '- [ ] SAME\n\n- [x] SAME\n\n  continued\n',
  '---\ntitle: "[ ] Title"\n---\r\n\r\n- [ ] SAME\r\n- [x] SAME\r\n',
  '`[ ]`\n\n```md\n- [ ] SAME\n```\n\n- [ ] SAME\n- [x] SAME\n',
])test('切换解析得到的任务框只修改对应的一个状态字符：'+JSON.stringify(source.slice(0,28)),()=>{
  const boxes=checkboxes(source);assert(boxes.length>=2);
  for(let i=0;i<boxes.length;i++){
    const box=boxes[i];assert.match(source.slice(box.sourceStart,box.sourceEnd),/^\[[ xX]\]/);
    const next=setTaskChecked(source,box.sourceStart,!box.checked);
    assert.equal(next.length,source.length);assert.equal(next.slice(0,box.sourceStart+1),source.slice(0,box.sourceStart+1));assert.equal(next.slice(box.sourceStart+2),source.slice(box.sourceStart+2));
    const changed=checkboxes(next);assert.equal(changed.length,boxes.length);
    for(let j=0;j<boxes.length;j++)assert.equal(changed[j].checked,j===i?!boxes[j].checked:boxes[j].checked);
  }
});
test('非法或过期任务位置不改动源码，代码与普通方括号不生成可点任务框',()=>{
  for(const position of [-1,NaN,1.5,0,99])assert.equal(setTaskChecked('text [ ]',position,true),null);
  assert.deepEqual(checkboxes('`[ ]`\n\n```md\n- [ ] code\n```\n\n普通 [x] 文字。'),[]);
});
