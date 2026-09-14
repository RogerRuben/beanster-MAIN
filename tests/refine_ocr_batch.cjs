const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]);
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{const p=await b.newPage();await p.goto('file:///'+root.replaceAll('\\','/')+'/index_v5.html');const files=JSON.parse(fs.readFileSync(path.join(dir,'files.json'),'utf8')),inputs=JSON.parse(fs.readFileSync(path.join(dir,'inputs.json'),'utf8')),spec=[],data={};
 for(const row of fs.readFileSync(path.join(dir,'final.tsv'),'utf8').trim().split('\n')){const [id,score,text,box]=row.split('\t');(data[id]??=[]).push({text:Buffer.from(text,'base64').toString('utf8'),confidence:Number(score),box:JSON.parse(box)})}
 for(let i=0;i<files.length;i++){
  const source=fs.readFileSync(files[i]).toString('base64'),input=inputs.find(x=>x.id===i+'-full');
  const r=await p.evaluate(async ({source,input,lines})=>{Reader.trace=[{...input,event:'crop',width:input.w,height:input.h,rect:{x:0,y:0,w:1,h:1}}];const rect=Recognition.detailRegion(lines);if(!rect)return null;const im=new Image();im.src='data:image/jpeg;base64,'+source;await im.decode();const g=await blobToGrayPixels(await prepareSmartOcrImage(null,'label',im,rect));return {w:g.w,h:g.h,pixels:bytesChunkB64(g.data),rect}},{source,input,lines:data[i+'-full']||[]});
  if(r){const file=path.join(dir,i+'-detail.gray');fs.writeFileSync(file,Buffer.from(r.pixels,'base64'));spec.push([i+'-detail',r.w,r.h,file].join('\t'));console.log(i,JSON.stringify(r.rect));}
 }
 fs.writeFileSync(path.join(dir,'detail-spec.tsv'),spec.join('\n'));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
