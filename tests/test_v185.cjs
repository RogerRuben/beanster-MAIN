const fs=require('fs'),path=require('path'),assert=require('assert/strict'),cp=require('child_process');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'qa/private/ocr185'),out=path.join(root,'qa/v185');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file:///'+root.replaceAll('\\','/')+'/index_v5.html');
 const full=JSON.parse(fs.readFileSync(path.join(dir,'final.json'),'utf8')),detail=JSON.parse(fs.readFileSync(path.join(dir,'detail.json'),'utf8')),base=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json'),'utf8')),files=JSON.parse(fs.readFileSync(path.join(dir,'files.json'),'utf8'));
 const old=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','da46814:recognition_flow.js'],{cwd:root,encoding:'utf8'}).split('\n};')[0]+'\n};';
 const expected=['埃塞瑰夏美式','干姜美式','美式咖啡','美式黑咖','苹果C美式','轻椰茉莉拿铁','鲜萃黑咖深烘','黑巧风味美式','黑巧风味美式','黑巧风味美式'],results=[];
 for(let i=0;i<files.length;i++){
  const baseline=await page.evaluate(({old,lines})=>{const policy=eval('(()=>{'+old+';return DrinkEvidence})()');for(const ls of lines){const d=policy.decide(ls);if(d.candidates.length)return d.candidates[0].name}return ''},{old,lines:[base[i+'-crop']||[],base[i+'-full']||[]]});
  const image=fs.readFileSync(files[i]).toString('base64');
  const actual=await page.evaluate(async({image,attempts})=>{
    if($('addModal').classList.contains('show'))AppNav.discard();openAdd();$('fProductName').value='';let count=0,vision=0;
    LocalVision.infer=async()=>{vision++;return {top:[]}};
    nativeRecognizeBlob=async()=>{const crop=[...Reader.trace].reverse().find(x=>x.event==='crop');const isFull=crop.rect.x===0&&crop.rect.y===0&&crop.rect.w===1&&crop.rect.h===1;const key=count===0&&!isFull?'crop':isFull?'full':'detail';count++;const lines=attempts[key]||[];Reader.lastNative={lines};return lines.map(x=>x.text).join('\n')};
    const im=new Image();im.src='data:image/jpeg;base64,'+image;await im.decode();await ocrSmartSource(null,'label',im);
    const mode=Recognition.state,shown=Recognition.candidates.map(x=>x.name);if(mode==='candidate')Recognition.choose(0);
    return {name:$('fProductName').value,mode,shown,attempts:count,vision};
  },{image,attempts:{crop:full[i+'-crop'],full:full[i+'-full'],detail:detail[i+'-detail']}});
  assert.equal(actual.name,expected[i],path.basename(files[i]));assert.equal(actual.vision,0);results.push({image:path.basename(files[i]),expected:expected[i],before:baseline,after:actual.name,state:actual.mode,attempts:actual.attempts});
  if(i===5){await page.locator('#recognition').screenshot({path:path.join(out,'jasmine-full-name.png')});await page.evaluate(()=>Recognition.editName());await page.locator('#ocrCandidate0').fill('轻椰茉莉拿铁（少冰）');await page.getByRole('button',{name:'确认并填写',exact:true}).click();assert.equal(await page.locator('#fProductName').inputValue(),'轻椰茉莉拿铁(少冰)');await page.locator('#recognition').screenshot({path:path.join(out,'edited-name.png')});}
 }
 const variants=await page.evaluate(()=>['轻椰茉利拿铁','中/冰/鲜萃黑咖深烘','【热】黑巧风味美式','[自带杯]干姜美式','苹果C美式','轻椰茉莉拿铁'].map(text=>DrinkEvidence.decide([{text,confidence:.88}]).candidates[0]?.name));
 assert.deepEqual(variants,['轻椰茉利拿铁','鲜萃黑咖深烘','黑巧风味美式','干姜美式','苹果C美式','轻椰茉莉拿铁']);
 const negative=await page.evaluate(()=>['美式沙发','拿铁色口红','美式英语','我想喝拿铁','卡布奇诺蛋糕','拿铁杯垫'].map(text=>DrinkEvidence.decide([{text,confidence:.99}]).status));assert.ok(negative.every(x=>x==='none'));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,nativeEngine:'Production PaddleReader Java CPU, desktop runtime; UI consumes real model output. No filenames fed to model or rules.',cases:results,editableName:true},null,2));console.log(JSON.stringify(results,null,2));console.log('PASS 10 image cases and editable complete-name preservation');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
