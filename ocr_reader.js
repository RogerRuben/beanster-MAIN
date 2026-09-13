/* V18.1 offline reader orchestration. The native engine is exclusively asynchronous. */
const Reader={generation:0,activeId:'',deadline:0,trace:[],lastNative:null,
  pause:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  log(event,data={}){this.trace.push({event,at:performance.now(),...data});this.trace=this.trace.slice(-40)},
  check(generation){if(generation!==this.generation)throw new Error('reader-cancelled');if(this.deadline&&performance.now()>this.deadline)throw new Error('reader-timeout')},
  cancel(){this.generation++;if(this.activeId)prompt('sipsqueak://ocrcancel?id='+this.activeId,'');this.activeId='';this.deadline=0;},
  async image(file){const url=URL.createObjectURL(file),im=new Image();try{await new Promise((res,rej)=>{im.onload=res;im.onerror=rej;im.src=url});return im}finally{URL.revokeObjectURL(url)}},
  regions(im){
    const scale=Math.min(1,640/Math.max(im.width,im.height)),w=Math.round(im.width*scale),h=Math.round(im.height*scale);
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),gray=new Uint8Array(w*h),queue=new Int32Array(w*h),found=[];
    for(let i=0;i<mask.length;i++){const r=data[i*4],g=data[i*4+1],b=data[i*4+2],max=Math.max(r,g,b),min=Math.min(r,g,b);gray[i]=Math.round(.2126*r+.7152*g+.0722*b);mask[i]=gray[i]>120&&(max-min)/Math.max(max,1)<.22?1:0}
    for(let start=0;start<mask.length;start++){
      if(!mask[start]||seen[start])continue;let head=0,tail=0,minX=w,minY=h,maxX=0,maxY=0;queue[tail++]=start;seen[start]=1;
      while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        for(const j of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!seen[j]&&mask[j]){seen[j]=1;queue[tail++]=j}}
      const rw=maxX-minX+1,rh=maxY-minY+1,area=rw*rh,ratio=rw/rh;
      if(area<w*h*.008||area>w*h*.38||rw>w*.8||rw<24||rh<28||ratio<.23||ratio>2.8||tail/area<.38)continue;
      let ink=0,rows=0;for(let y=minY;y<=maxY;y++){let n=0;for(let x=minX;x<=maxX;x++)if(gray[y*w+x]<105){ink++;n++}if(n>rw*.08)rows++}
      const density=ink/area;if(density<.02||density>.48||rows<4)continue;
      const mx=rw*.07,my=rh*.045,x=Math.max(0,minX-mx)/w,y=Math.max(0,minY-my)/h;
      found.push({x,y,w:Math.min(1-x,(rw+2*mx)/w),h:Math.min(1-y,(rh+2*my)/h),score:density*3+Math.min(1,rows/rh)*1.5+Math.min(.4,area/(w*h)*4)});
    }
    return found.sort((a,b)=>b.score-a.score).slice(0,3);
  }
};
findLabelRegion=function(im){return Reader.regions(im)[0]||null};
prepareSmartOcrImage=async function(file,kind='document',sourceImg=null,forcedRect=null,variant='primary'){
  const im=sourceImg||await Reader.image(file),documentKind=['document','order','receipt','menu'].includes(kind);
  let rect=documentKind?{x:0,y:0,w:1,h:1}:forcedRect||findLabelRegion(im)||{x:0,y:0,w:1,h:1};
  if(variant==='wide')rect=expandedRect(rect,.08,.08);
  const sx=Math.round(rect.x*im.width),sy=Math.round(rect.y*im.height),sw=Math.min(im.width-sx,Math.round(rect.w*im.width)),sh=Math.min(im.height-sy,Math.round(rect.h*im.height));
  const factor=Math.min((documentKind?1200:900)/sw,1800/sh,3),pad=20,c=document.createElement('canvas');c.width=Math.round(sw*factor)+pad*2;c.height=Math.round(sh*factor)+pad*2;
  const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,sx,sy,sw,sh,pad,pad,c.width-2*pad,c.height-2*pad);
  Reader.log('crop',{kind,rect,width:c.width,height:c.height});
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
};
nativeOcrTransfer=async function(g,psm,step=3000,generation=Reader.generation){
  Reader.check(generation);
  if(prompt('sipsqueak://ocrcapabilities','')!=='native-async-1')throw new Error('reader-unavailable');
  const deadline=Reader.deadline||performance.now()+8000;
  const check=()=>{if(generation!==Reader.generation)throw new Error('reader-cancelled');if(performance.now()>deadline)throw new Error('reader-timeout')};
  if(prompt('sipsqueak://ocrbegin','')!=='0')throw new Error('reader-transfer-begin');
  let expected=0;
  for(let i=0;i<g.data.length;i+=step){check();const part=g.data.subarray(i,i+step);expected+=part.length;
    if(Number(prompt('sipsqueak://ocrchunk?data='+encodeURIComponent(bytesChunkB64(part)),''))!==expected)throw new Error('reader-transfer-chunk');
    if(i%(step*8)===0)await Reader.pause(0);
  }
  check();const id='r'+Date.now().toString(36)+'_'+generation;Reader.activeId=id;
  const status=prompt('sipsqueak://ocrfinish?meta='+encodeURIComponent([id,g.w,g.h,psm].join(',')),'');
  if(status!=='pending'){Reader.activeId='';throw new Error('reader-'+status)}
  try{while(true){check();await Reader.pause(50);check();const result=JSON.parse(prompt('sipsqueak://ocrpoll?id='+id,'')||'{}');
    if(result.status==='done'){Reader.lastNative=result;Reader.log('native',{...result,psm});return result.text||''}
    if(result.status!=='pending')throw new Error('reader-'+(result.error||result.status));
  }}finally{prompt('sipsqueak://ocrcancel?id='+id,'');if(Reader.activeId===id)Reader.activeId=''}
};
nativeRecognizeBlob=async function(blob,psm=6,generation=Reader.generation){Reader.check(generation);const g=await blobToGrayPixels(blob);Reader.check(generation);const text=await nativeOcrTransfer(g,psm,3000,generation);Reader.check(generation);orderOcrState='ready';return text};
const readerParse=parseOrderText;
parseOrderText=function(text){const original=String(text||'');const r=readerParse(original.split(/[\r\n]+/).filter(line=>!(/蛋糕|饼干|面包|汉堡|咖啡豆|吸管|咖啡机|咖啡杯|键盘|手机壳/.test(line))).join('\n'));r.text=original;
  if(r.productName&&(/蛋糕|饼干|面包|汉堡|咖啡豆|吸管|咖啡机|咖啡杯|键盘|手机壳/.test(r.productName)||(!canonicalTypeForName(r.productName,'')&&!/^[\u4e00-\u9fffA-Za-z ]{0,16}咖啡$/.test(r.productName))))r.productName='';
  if(!r.productName)r.type='';return r};
const readerApply=applyTextResult;
applyTextResult=function(r,kind){if(!r?.productName)return;readerApply(r,kind==='document'?classifyTextSource(r.text):kind)};
setOrderProgress=function(p,msg='正在读取…'){const el=$('recognition');if(!el)return;el.innerHTML=`<div class="rec-title">${esc(msg)}</div><div class="ocr-progress" style="--ocr:${Math.round(clamp(p,0,1)*100)}%"><i></i></div><div class="order-actions"><button onclick="Reader.cancel();document.getElementById('recognition').innerHTML='<div class=rec-title>已停止读取，可以直接填写。</div>'">停止读取</button></div>`;el.classList.add('show')};
ocrSmartSource=async function(file,kindHint='',sourceImg=null,forcedRect=null){
  Reader.cancel();const generation=Reader.generation;Reader.trace=[];Reader.deadline=performance.now()+8000;orderLastText='';
  const initialName=$('fProductName').value,initialType=$('fType').value;
  try{
    const im=sourceImg||await Reader.image(file),kind=kindHint||'document',label=['label','package'].includes(kind),regions=forcedRect?[forcedRect]:Reader.regions(im);
    Reader.check(generation);
    Reader.log('input',{width:im.width,height:im.height,kind,regions});
    const rect=regions[0]||{x:0,y:0,w:1,h:1};
    // The upper part of a detected physical label includes product/options but excludes most QR/footer clutter.
    const attempts=label?[{rect:{...rect,h:rect.h*.66},psm:6},{rect,psm:11}]:[{rect:null,psm:11},{rect:null,psm:6}];
    const candidates=[];let best=null;
    for(let i=0;i<attempts.length;i++){
      if(generation!==Reader.generation)throw new Error('reader-cancelled');
      if(i&&performance.now()+1200>Reader.deadline)break;
      setOrderProgress(.15+i*.4,label?'正在看杯贴…':'正在读文字…');
      const attempt=attempts[i],blob=await prepareSmartOcrImage(file,kind,im,attempt.rect);
      Reader.check(generation);
      const text=await nativeRecognizeBlob(blob,attempt.psm,generation);Reader.check(generation);if(text)candidates.push(text);
      const chosen=bestOcrCandidate(candidates);best={text:chosen.text,kind:kind==='document'?classifyTextSource(chosen.text):kind,result:parseOrderText(chosen.text)};
      if(best.result.productName)break;
    }
    if(generation!==Reader.generation)return null;
    orderLastText=best?.text||'';
    if(best?.result.productName&&$('fProductName').value===initialName&&$('fType').value===initialType)applyTextResult(best.result,best.kind);
    else if(best?.result.productName)notify('已读到饮品，保留了你正在修改的内容');
    if(!best?.result.productName){$('recognition').innerHTML=ocrAssistHtml(orderLastText,'没有读到明确的饮品名称');$('recognition').classList.add('show')}
    return best;
  }catch(error){
    Reader.log('error',{message:error.message});if(generation!==Reader.generation)return null;
    orderOcrState=error.message==='reader-timeout'?'timeout':'failed';
    $('recognition').innerHTML=`<div class="order-card"><b>${error.message==='reader-timeout'?'这次读取时间较长':error.message==='reader-busy'?'上一张图片还在结束读取':'这次没有读清'}</b><span>可以直接填写，或稍后重新读取。</span><div class="order-actions"><button onclick="showOrderTextPaste()">输入文字</button></div></div>`;$('recognition').classList.add('show');return null;
  }finally{if(generation===Reader.generation)Reader.deadline=0}
};
smartMediaChanged=async function(e){
  const file=e.target.files?.[0];if(!file)return;Reader.cancel();const generation=Reader.generation;orderLastFile=file;orderLastText='';
  try{const raw=await blobToDataUrl(file),im=await Reader.image(file);if(generation!==Reader.generation)return;
    const regions=Reader.regions(im),intent=analyzeMediaIntent(im),screen=intent.screen&&!regions.some(r=>r.w<.5&&r.h<.65);
    $('photoBox').classList.add('has-photo');$('photoBox').innerHTML=`<img src="${raw}" alt="待记录图片">`;
    draftSourceAttachment=null;draftKeepSource=false;
    if(screen){draftPhoto=null;draftSourceAttachment=makeSourceAttachment(im,file,raw);draftKeepSource=true;draftSmartKind='document';}
    else{draftPhoto=makePhotoVersions(im,file,raw);draftPhoto.nativePath='';if(settings.photoQuality!=='compressed')draftPhoto._rawOriginal=raw;draftSourceKind='photo';draftSmartKind='photo';}
    // Never infer a drink category from color or texture when no readable product is present.
    const pending=ocrSmartSource(file,screen?'document':'label',im),readGeneration=Reader.generation;
    const got=await pending;
    if(!screen&&readGeneration===Reader.generation&&!got?.result?.productName&&typeof LocalVision!=='undefined')await LocalVision.offer(im,readGeneration);
  }catch(error){notify('无法读取这张图片',true)}
};
$('fCamera').onchange=smartMediaChanged;$('fGallery').onchange=smartMediaChanged;
const readerCloseAdd=closeAdd;closeAdd=function(){Reader.cancel();readerCloseAdd()};
ensureOrderOcr=async function(){return false}; // Capabilities are probed only when the user requests a read.
readCurrentImageText=async function(mode='auto'){
  if(!orderLastFile)return notify('请先选择图片',true);
  let rect=null;if(mode==='wide'){const last=[...Reader.trace].reverse().find(x=>x.event==='crop');if(last)rect=expandedRect(last.rect,.10,.10)}
  return ocrSmartSource(orderLastFile,mode==='document'?'document':'label',null,rect);
};
