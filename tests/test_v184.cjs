const assert=require('assert/strict'),fs=require('fs'),path=require('path'),cp=require('child_process');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/v184');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file:///'+path.join(root,'index_v5.html').replaceAll('\\','/'));
 await page.evaluate(()=>{Motion.stop();openAdd();window.savedOCR=nativeRecognizeBlob;window.savedVision=LocalVision.infer;window.calls=0;LocalVision.infer=async()=>{calls++;return {top:[{label:'coffee mug',score:.8}]}};window.fixture=document.createElement('canvas');fixture.width=240;fixture.height=320;fixture.getContext('2d').fillRect(0,0,240,320);window.makeFixture=async()=>{const im=new Image();im.src=fixture.toDataURL();await im.decode();return im};window.mockLines=ls=>{nativeRecognizeBlob=async()=>{Reader.lastNative={lines:ls};return ls.map(x=>x.text).join('\n')}}});
 const d=await page.evaluate(()=>({
  exact:DrinkEvidence.decide([{text:'生椰拿铁',confidence:.99}]),
  corrected:DrinkEvidence.decide([{text:'生椰拿鈇',confidence:.9}]),
  partial:DrinkEvidence.decide([{text:'??拿铁',confidence:.9}]),
  negative:['咖啡机','咖啡豆','卡布奇诺蛋糕','招聘咖啡师','添加拿铁','推荐拿铁','机械键盘','订单169'].map(text=>DrinkEvidence.decide([{text,confidence:.99}]).status),
  low:DrinkEvidence.decide([{text:'拿铁',confidence:.3}]).status,
  multi:DrinkEvidence.decide([{text:'拿铁',confidence:.99},{text:'美式',confidence:.99}]).status
 }));assert.equal(d.exact.status,'exact');assert.equal(d.corrected.status,'candidate');assert.equal(d.corrected.candidates[0].name,'生椰拿铁');assert.equal(d.partial.status,'candidate');assert.ok(d.negative.every(x=>x==='none'));assert.equal(d.low,'none');assert.equal(d.multi,'candidate');checks.push('evidence gates: exact, correction, partial, non-drink, low confidence, ambiguous names');
 await page.evaluate(async()=>{mockLines([{text:'生椰拿铁',confidence:.99},{text:'电话123456',confidence:.99}]);await ocrSmartSource(null,'label',await makeFixture())});assert.equal(await page.locator('#fProductName').inputValue(),'生椰拿铁');assert.equal(await page.evaluate(()=>calls),0);assert.ok(!(await page.locator('#recognition').innerText()).includes('123456'));checks.push('exact OCR wins without visual inference or irrelevant text');
 await page.locator('#recognition').screenshot({path:path.join(out,'exact.png')});
 await page.evaluate(async()=>{$('fProductName').value='';mockLines([{text:'生椰拿鈇',confidence:.9}]);await ocrSmartSource(null,'label',await makeFixture())});assert.equal(await page.locator('#fProductName').inputValue(),'');assert.equal(await page.evaluate(()=>calls),0);assert.ok((await page.locator('#recognition').innerText()).includes('已纠正'),JSON.stringify(await page.evaluate(()=>({html:$('recognition').innerHTML,trace:Reader.trace,snapshot:Recognition.snapshot,now:Recognition.fields()}))));await page.locator('#recognition').screenshot({path:path.join(out,'corrected.png')});await page.evaluate(()=>Recognition.choose(0));assert.equal(await page.locator('#fProductName').inputValue(),'生椰拿铁');checks.push('correction is shown cleanly and requires confirmation');
 await page.evaluate(async()=>{$('fProductName').value='';mockLines([{text:'机械键盘订单169',confidence:.99}]);await ocrSmartSource(null,'label',await makeFixture())});assert.equal(await page.evaluate(()=>calls),1);const visualText=await page.locator('#recognition').innerText();assert.ok(visualText.includes('外观可能'));assert.ok(!visualText.includes('机械键盘'));assert.ok(visualText.includes('手动选择'));await page.locator('#recognition').screenshot({path:path.join(out,'visual.png')});checks.push('OCR miss uses one visual fallback with honest manual category choices');
 await page.evaluate(async()=>{mockLines([{text:'机械键盘',confidence:.99}]);await ocrSmartSource(null,'document',await makeFixture())});assert.equal(await page.evaluate(()=>calls),1);assert.ok(!(await page.locator('#recognition').innerText()).includes('机械键盘'));checks.push('documents do not trigger photo classification');
 const retained=await page.evaluate(async()=>{nativeRecognizeBlob=async()=>{await Reader.pause(70);Reader.lastNative={lines:[{text:'拿铁',confidence:.99}]};return '拿铁'};const im=await makeFixture();const task=ocrSmartSource(null,'label',im);setTimeout(()=>{$('fProductName').value='自己填写'},20);await task;return $('fProductName').value});assert.equal(retained,'自己填写');checks.push('late exact result cannot overwrite programmatic or manual edits');
 await page.evaluate(async()=>{const im=await makeFixture();const task=ocrSmartSource(null,'label',im);setTimeout(()=>Recognition.stop(),20);await task});assert.ok((await page.locator('#recognition').innerText()).includes('已停止'));checks.push('stop cancels both result paths');
 await page.evaluate(()=>{orderLastText='原始无关乱码';showOrderTextPaste()});assert.equal(await page.locator('#orderPasteText').inputValue(),'');await page.evaluate(()=>closeOrderPaste());checks.push('manual text entry never exposes raw OCR');
 // Optional real Java/native engine test: prepared pixel chunks from the actual WebView adapter.
 if(process.argv[2]){
  const priv=path.join(root,'qa/private/ocr184');fs.mkdirSync(priv,{recursive:true});let chunks=[],result={status:'pending'},child;
  page.on('dialog',async dialog=>{try{const u=new URL(dialog.message());let answer='';
   if(u.hostname==='ocrcapabilities')answer='native-async-1';
   else if(u.hostname==='ocrbegin'){chunks=[];answer='0'}
   else if(u.hostname==='ocrchunk'){chunks.push(Buffer.from(u.searchParams.get('data'),'base64'));answer=String(chunks.reduce((n,c)=>n+c.length,0))}
   else if(u.hostname==='ocrfinish'){
    const file=path.join(priv,'transferred.gray');fs.writeFileSync(file,Buffer.concat(chunks));result={status:'pending'};
    child=cp.execFile('C:/Program Files/JetBrains/PyCharm 2026.1.2/jbr/bin/java.exe',['-Dstdout.encoding=UTF-8','-Dfile.encoding=UTF-8','--class-path','native-build;D:/pycodes/hammster_coffee/.build-tools/onnxruntime-1.21.1.jar','tests/NativeOcrHarness.java',root,file,u.searchParams.get('meta')],{cwd:root,encoding:'utf8',timeout:30000},(err,stdout,stderr)=>{try{result=JSON.parse(stdout.trim());fs.writeFileSync(path.join(priv,'native-result.json'),JSON.stringify(result,null,2));}catch(e){result={status:'error',error:err?.message||stderr}}});answer='pending';
   }else if(u.hostname==='ocrpoll')answer=JSON.stringify(result);else if(u.hostname==='ocrcancel')answer='cancelled';
   await dialog.accept(answer);
  }catch(e){await dialog.dismiss()}});
  // Host-side dialog RPCs and Java source compilation are not Android inference latency.
  await page.evaluate(()=>{nativeRecognizeBlob=async(...args)=>{Reader.deadline=performance.now()+60000;return savedOCR(...args)};LocalVision.infer=savedVision;$('fProductName').value=''});
  const img=fs.readFileSync(process.argv[2]).toString('base64');
  await page.evaluate(async data=>{const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();await ocrSmartSource(null,'document',im)},img);
  assert.equal(result.status,'done');assert.ok(result.engine.includes('PP-OCRv5'));assert.ok(result.lines.some(l=>l.text.includes('拿铁')));assert.ok((await page.locator('#recognition').evaluate(el=>el.innerText+' '+[...el.querySelectorAll('input')].map(x=>x.value).join(' '))).includes('拿铁'));checks.push('real transferred pixels -> NativeReader async -> PP-OCRv5 -> filtered UI (desktop native harness, not Android runtime)');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks},null,2));console.log('PASS '+checks.length+' V18.4 groups');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
