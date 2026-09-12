// Diagnostic: run the actual application's preprocessing on the COMPLETE supplied image.
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/private');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const page=await browser.newPage();page.on('dialog',d=>d.dismiss());await page.goto('file:///'+path.join(root,'index_v5.html').replaceAll('\\','/'));
const input=process.argv[2];if(!input)throw Error('Provide original input path');
const uri='data:image/png;base64,'+fs.readFileSync(input).toString('base64');
const result=await page.evaluate(async uri=>{const im=new Image();im.src=uri;await im.decode();const regions=Reader.regions(im),intent=analyzeMediaIntent(im),blobs=[];
 for(const [i,r] of regions.entries()){const rect={...r,h:r.h*.66};const blob=await prepareSmartOcrImage(null,'label',im,rect);const data=await blobToDataUrl(blob);blobs.push({name:'region-'+i,data,rect})}
 return {width:im.width,height:im.height,regions,intent,blobs};},uri);
for(const b of result.blobs){fs.writeFileSync(path.join(out,b.name+'.png'),Buffer.from(b.data.split(',')[1],'base64'));delete b.data}
fs.writeFileSync(path.join(out,'input-regions.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
