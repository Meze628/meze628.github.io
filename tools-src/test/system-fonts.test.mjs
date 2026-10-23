import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {readInstalledYahei,createFontCache,restoreCachedYahei,YAHEI_NAMES} from '../src/system-fonts.mjs';

const bytes=new Uint8Array(readFileSync(new URL('../../static/tools-assets/fonts-pdf/code-regular.ttf',import.meta.url)));
const font=(postscriptName,style='Regular')=>({postscriptName,style,blob:async()=>new Blob([bytes])});

test('选择时同步请求系统字体，不等待缓存或额外按钮',async()=>{
  let requested=false;
  const pending=readInstalledYahei(options=>{requested=true;assert.deepEqual(options.postscriptNames,[...YAHEI_NAMES]);return Promise.resolve([font('MicrosoftYaHei'),font('MicrosoftYaHei-Bold','Bold')]);});
  assert.equal(requested,true);
  const result=await pending;
  assert.deepEqual(result.regular,bytes);assert.deepEqual(result.bold,bytes);assert.equal(result.source,'system');
});

test('兼容 Windows 的 Regular/Bold 别名，并采用字体文件中的实际名称',async()=>{
  const result=await readInstalledYahei(async()=>[font('MicrosoftYaHeiRegular'),font('MicrosoftYaHeiBold','Bold')]);
  assert.equal(result.regularName,'MezeCodeRegular');assert.equal(result.boldName,'MezeCodeRegular');
});

test('优先使用经典微软雅黑，缺少对应粗体时保留常规字体',async()=>{
  let uiRead=false;
  const uiFont={...font('MicrosoftYaHeiUI'),blob:async()=>{uiRead=true;return new Blob([bytes]);}};
  const result=await readInstalledYahei(async()=>[uiFont,font('MicrosoftYaHeiUIBold','Bold'),font('MicrosoftYaHei')]);
  assert.equal(uiRead,false);assert.equal(result.bold,undefined);
});

test('没有权限、不支持接口和未安装字体会给出明确结果',async()=>{
  const denied=new DOMException('Denied','NotAllowedError');
  await assert.rejects(()=>readInstalledYahei(async()=>{throw denied;}),error=>error===denied);
  await assert.rejects(()=>readInstalledYahei(undefined),/电脑版 Chrome 或 Edge/);
  await assert.rejects(()=>readInstalledYahei(async()=>[]),/未找到微软雅黑/);
});

test('拒绝超大系统字体，避免继续读取其二进制内容',async()=>{
  await assert.rejects(()=>readInstalledYahei(async()=>[{...font('MicrosoftYaHei'),blob:async()=>({size:41*1024*1024,arrayBuffer(){throw new Error('Should not read');}})}]),/超过 40 MB/);
});

test('字体缓存持久化字节和字重，清除后不可恢复',async()=>{
  const cache=createFontCache(new IDBFactory());
  assert.equal(await cache.read(),undefined);
  await cache.write({source:'system',regular:bytes,regularName:'MezeCodeRegular',bold:bytes,boldName:'MezeCodeRegular'});
  const stored=await cache.read();assert.equal(stored.version,1);assert.deepEqual(stored.regular,bytes);assert.deepEqual(stored.bold,bytes);
  await cache.clear();assert.equal(await cache.read(),undefined);
});

test('已授权时直接恢复，刷新无需重新读取系统文件',async()=>{
  const cache=createFontCache(new IDBFactory());await cache.write({source:'system',regular:bytes});
  const restored=await restoreCachedYahei(cache,async descriptor=>{assert.equal(descriptor.name,'local-fonts');return {state:'granted'};});
  assert.deepEqual(restored.regular,bytes);
});

test('撤销授权或无法确认权限时不继续使用缓存',async()=>{
  for(const state of ['denied','prompt','unknown']){
    const cache=createFontCache(new IDBFactory());await cache.write({source:'system',regular:bytes});
    assert.equal(await restoreCachedYahei(cache,async()=>({state})),null);
    assert.equal(await cache.read(),undefined);
  }
});

test('用户曾主动导入的字体可恢复，不要求系统字体接口授权',async()=>{
  const cache=createFontCache(new IDBFactory());await cache.write({source:'file',regular:bytes});
  const stored=await restoreCachedYahei(cache,async()=>{throw new Error('Permission should not be queried');});
  assert.deepEqual(stored.regular,bytes);
});
