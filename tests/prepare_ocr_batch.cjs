const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]);
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{const p=await b.newPage();await p.goto('file:///'+root.replaceAll('\\','/')+'/index_v5.html');const files=JSON.parse(fs.readFileSync(path.join(dir,'files.json'),'utf8')),spec=[],metadata=[];
 for(let i=0;i<files.length;i++){
  const data=fs.readFileSync(files[i]).toString('base64');
  const results=await p.evaluate(async data=>{const im=new Image();im.src='data:image/jpeg;base64,'+data;await im.decode();const rect=Reader.regions(im)[0]||null,out=[];for(const [name,r] of [['crop',rect],['full',null]]){const blob=await prepareSmartOcrImage(null,'label',im,r),g=await blobToGrayPixels(blob);out.push({name,rect:r,w:g.w,h:g.h,pixels:bytesChunkB64(g.data)})}return out},data);
  for(const r of results){const id=i+'-'+r.name,file=path.join(dir,id+'.gray');fs.writeFileSync(file,Buffer.from(r.pixels,'base64'));spec.push([id,r.w,r.h,file].join('\t'));metadata.push({id,file:files[i],rect:r.rect,w:r.w,h:r.h})}
 }
 fs.writeFileSync(path.join(dir,'spec.tsv'),spec.join('\n'));fs.writeFileSync(path.join(dir,'inputs.json'),JSON.stringify(metadata,null,2));console.log('Prepared '+spec.length+' production crops');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
