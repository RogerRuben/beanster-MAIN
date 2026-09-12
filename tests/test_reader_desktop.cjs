// Real full-input preprocessing + actual desktop OCR + form application; explicitly NOT Android device acceptance.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFile}=require('child_process');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/private');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const page=await browser.newPage();let calls=0;
await page.exposeFunction('desktopRead',(base64,w,h,psm)=>new Promise((resolve,reject)=>{
 const file=path.join(out,'transferred-'+(++calls)+'.pgm');fs.writeFileSync(file,Buffer.concat([Buffer.from(`P5\n${w} ${h}\n255\n`),Buffer.from(base64,'base64')]));
 execFile('D:/anaconda/python.exe',[path.join(root,'tools/desktop_ocr.py'),file,String(psm)],{encoding:'utf8'},(err,stdout)=>err?reject(err):resolve(JSON.parse(stdout)));
}));
await page.addInitScript(()=>{let pixels=[],count=0,results={};window.prompt=(url)=>{const u=new URL(url);
 if(u.host==='ocrcapabilities')return 'native-async-1';if(u.host==='ocrbegin'){pixels=[];count=0;return '0'}
 if(u.host==='ocrchunk'){const b=atob(u.searchParams.get('data'));pixels.push(b);count+=b.length;return String(count)}
 if(u.host==='ocrfinish'){const [id,w,h,psm]=u.searchParams.get('meta').split(',');results[id]={status:'pending'};
  window.desktopRead(btoa(pixels.join('')),+w,+h,+psm).then(r=>{results[id]={status:'done',...r}}).catch(e=>{results[id]={status:'error',error:String(e)}});return 'pending'}
 if(u.host==='ocrpoll')return JSON.stringify(results[u.searchParams.get('id')]||{status:'missing'});if(u.host==='ocrcancel'){delete results[u.searchParams.get('id')];return 'cancelled'}return ''};});
await page.goto('file:///'+path.join(root,'index_v5.html').replaceAll('\\','/'));await page.evaluate(()=>{openAdd();settings.systemNotifications=false});
const file=process.argv[2];if(!file)throw Error('Provide full source image');
await page.locator('#fGallery').setInputFiles(file);
await page.waitForFunction(()=>$('fProductName').value==='埃塞瑰夏拿铁',{},{timeout:15000});
assert.equal(await page.locator('#fType').inputValue(),'拿铁');assert.equal(calls,1);
const trace=await page.evaluate(()=>Reader.trace);fs.writeFileSync(path.join(out,'desktop-full-input-result.json'),JSON.stringify({scope:'desktop diagnostic, not device verification',passed:true,calls,trace},null,2));
console.log('PASS: complete supplied screenshot → application detection → actual transferred gray pixels → desktop Tesseract → 埃塞瑰夏拿铁 / 拿铁 (one attempt)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
