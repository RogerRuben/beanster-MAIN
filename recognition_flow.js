/* V18.4: one owner for OCR evidence, suggestions and cancellation. */
const DrinkEvidence={
  noise:/蛋糕|饼干|面包|汉堡|咖啡豆|吸管|咖啡机|咖啡杯|杯具|键盘|手机|广告|优惠|招聘|小程序|门店|电话|地址|订单|配送|发票|推荐|教程|制作方法|没喝|没有|未喝|不喝|不含|添加|去记录|记录成功|智能|常喝|快速添加|沙发|家具|英语|装修|地毯|衣服|外套|口红|色号|风格|杯垫|香薰|壁纸|滤纸|想喝|喜欢|好喝/,
  normalize(raw){return String(raw||'').normalize('NFKC').replace(/\s+/g,' ').replace(/[（(]杯[）)]/g,'').replace(/^\[(?:自带杯|自提|外带|外送)\]\s*/,'').replace(/^(?:超大|大|中|小)\s*[【\[(](?:冰|热|温)[】\])]\s*/,'').replace(/^(?:(?:超大|大|中|小|冰|热|温)\s*[\/|]\s*)+/,'').replace(/^[【\[(](?:冰|热|温)[】\])]\s*/,'').replace(/^[\/|]\s*/,'').replace(/\s*(超大杯|大杯|中杯|小杯|杯)\s*$/,'').replace(/^[*×x]\s*\d+\s*/i,'').trim()},
  fix(raw){return this.normalize(raw).replace(/拿[鈇跌佚迭钠衲]/g,'拿铁').replace(/生揶/g,'生椰').replace(/澳自/g,'澳白').replace(/美戎/g,'美式')},
  category(name){return canonicalTypeForName(name,'')||(/黑咖(?:啡)?/.test(name)?'普通黑咖啡':'')},
  candidates(lines){
    const names=[...new Set([...BUILTIN_PRODUCT_NAMES,...Object.keys(CATALOG)])].filter(n=>!this.noise.test(n));
    const out=[];
    for(const item of lines){
      const raw=this.normalize(item.text),name=this.fix(raw),confidence=Number(item.confidence)||0;
      if(confidence<.60||!name||name.length>32||this.noise.test(name)||/^\d|[¥￥]|\d+\s*(mg|毫克)/i.test(name))continue;
      const type=this.category(name);
      if(!type||!/拿铁|美式|卡布奇诺|摩卡|馥芮白|澳白|冷萃|手冲|浓缩|黑咖|低因咖啡|latte|americano|espresso|dirty/i.test(name))continue;
      // The category is metadata, never a replacement for the recognized product name.
      const partial=/[?？�]/.test(name),corrected=name!==raw,known=names.some(n=>n.toLowerCase()===name.toLowerCase());
      const complete=!partial&&/^[\u3400-\u9fffA-Za-z0-9 ·()%-]+$/.test(name);
      out.push({name,raw,type,confidence,corrected,partial,exact:!corrected&&complete&&(known||confidence>=.97)});
    }
    out.sort((a,b)=>b.confidence-a.confidence||b.name.length-a.name.length);
    const seen=new Set();return out.filter(x=>!seen.has(x.name)&&seen.add(x.name)).filter(x=>!out.some(y=>y!==x&&y.type===x.type&&((y.name.includes(x.name)&&y.name.length>x.name.length&&y.confidence>=x.confidence-.12)||(!/[\u3400-\u9fff]/.test(x.name)&&/[\u3400-\u9fff]/.test(y.name)&&y.confidence>=x.confidence)))).slice(0,3);
  },
  decide(lines){const candidates=this.candidates(lines),top=candidates[0];return {status:!top?'none':candidates.length===1&&top.exact&&top.confidence>=.92?'exact':'candidate',candidates}},
};
// Legacy helpers can no longer offer arbitrary OCR lines or fuzzy-complete unknown names.
repairReadProduct=function(raw){return DrinkEvidence.fix(raw)};
ocrAnyLineCandidates=function(){return []};
ocrLineCandidates=function(text){return DrinkEvidence.candidates(String(text||'').split(/\r?\n/).map(text=>({text,confidence:.8}))).map(x=>({line:x.name,score:x.confidence}))};
parseOrderText=function(text){const r=readerParse(text),d=DrinkEvidence.decide(String(text||'').split(/\r?\n/).map(text=>({text,confidence:.8})));r.productName=d.candidates[0]?.name||'';r.type=r.productName?DrinkEvidence.category(r.productName):'';return r};
const Recognition={generation:-1,state:'idle',candidates:[],editVersion:0,startVersion:0,kind:'label',metadata:null,snapshot:'',
  fields(){return JSON.stringify(['fProductName','fType','fBrand','fSize','fShots','fCaf','fPrice'].map(id=>$(id)?.value))},
  current(g){return g===Reader.generation&&g===this.generation},
  untouched(){return this.editVersion===this.startVersion&&this.fields()===this.snapshot},
  actions(){return '<div class="order-actions"><button onclick="startTapLabel()">框选杯贴</button><button onclick="showOrderTextPaste()">手动输入</button></div>'},
  candidateHtml(){return `<div class="order-card"><b>读到以下饮品名称</b><span>已保留完整名称；个别字不对，可以直接修改。</span><div class="ocr-name-candidates">${this.candidates.map((c,i)=>`<div class="ocr-name-candidate"><label for="ocrCandidate${i}">${c.partial?'名称可能不完整':c.corrected?'已纠正疑似错字，请核对':'请核对商品名称'}</label><input id="ocrCandidate${i}" maxlength="60" value="${esc(c.name)}" aria-label="饮品名称 ${i+1}"><button onclick="Recognition.choose(${i})">确认并填写</button></div>`).join('')}</div>${this.actions()}</div>`},
  editName(){if(!this.current(this.generation))return;this.snapshot=this.fields();this.startVersion=this.editVersion;this.candidates=[{name:$('fProductName').value,raw:$('fProductName').value,type:$('fType').value,confidence:0}];this.state='candidate';this.show(this.generation,this.candidateHtml())},
  detailRegion(lines){
    const crop=[...Reader.trace].reverse().find(x=>x.event==='crop');if(!crop)return null;
    const line=lines.filter(x=>x.box?.length===8&&x.confidence>=.7&&/风味|拿铁|美式|黑咖|闪购|自提|外带|Delivery/i.test(x.text)).sort((a,b)=>b.confidence-a.confidence)[0];
    if(!line)return null;
    const b=line.box,xs=[b[0],b[2],b[4],b[6]],ys=[b[1],b[3],b[5],b[7]],font=Math.hypot(b[6]-b[0],b[7]-b[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),rw=right-left;
    const r=crop.rect||{x:0,y:0,w:1,h:1},pw=crop.width-32,ph=crop.height-32;
    const x=Math.max(0,r.x+(left-rw*.6-16)/pw*r.w),y=Math.max(0,r.y+(top-font*2-16)/ph*r.h);
    const x2=Math.min(1,r.x+(right+rw*.6-16)/pw*r.w),y2=Math.min(1,r.y+(bottom+font*5-16)/ph*r.h);
    return x2>x&&y2>y?{x,y,w:x2-x,h:y2-y}:null;
  },
  show(g,html){if(!this.current(g))return;if($('uPhotoDetails'))$('uPhotoDetails').open=true;$('recognition').innerHTML=html;$('recognition').classList.add('show')},
  progress(g,text){this.show(g,`<div class="rec-title">${esc(text)}</div><div class="estimate-note">杯贴文字优先，读不清时再看饮品外观。</div><div class="order-actions"><button onclick="Recognition.stop()">停止识别</button></div>`)},
  stop(){Reader.cancel();this.state='stopped';$('recognition').innerHTML='<div class="rec-title">已停止识别</div><div class="estimate-note">可以直接填写饮品。</div>'},
  choose(index){const item=this.candidates[index];if(!item||!['candidate','exact'].includes(this.state))return;
    if(!this.untouched()){notify('已保留你修改的内容，请重新识别或手动填写');return;}
    const input=$('ocrCandidate'+index);const edited=input?input.value.trim():item.name;if(!edited||edited.length>60)return notify('请填写饮品名称（最多 60 字）',true);
    this.apply({...item,name:edited,type:DrinkEvidence.category(edited)||item.type},this.generation,true);
  },
  apply(item,g,confirmed=false){
    if(!this.current(g)||!this.untouched())return;
    const r={...(this.metadata||{}),text:'',productName:item.name,type:item.type||DrinkEvidence.category(item.name)};
    readerApply(r,this.kind);draftProductSource=confirmed?'label-confirmed':'label';draftReadKey=item.raw;draftReadText='';
    this.state='exact';this.snapshot=this.fields();this.show(g,`<div class="order-card"><b>杯贴${confirmed?'已确认':'识别'}：${esc(item.name)}</b><span>${confirmed?'已按你的选择填写。':'已读取饮品名称。'}咖啡因按配方估算，可继续修改。</span><div class="order-actions"><button onclick="Recognition.editName()">修改名称</button></div>${this.actions()}</div>`);
  },
  async visual(im,g){
    if(!this.current(g)||['exact','candidate'].includes(this.state)||!this.untouched())return;
    this.state='visual';this.progress(g,'杯贴没有读清，正在看饮品外观…');
    try{
      const result=await LocalVision.infer(im,g);
      if(!this.current(g)||!this.untouched())return;
      const good=LocalVision.evidence(result);
      // Generic ImageNet evidence cannot identify the recipe inside an opaque cup.
      const espresso=(result.top||[]).find(x=>x.label==='espresso'&&x.score>=.5);
      this.show(g,good?`<div class="order-card"><b>外观可能是${espresso?'浓缩咖啡':'咖啡或杯装饮品'}</b><span>没有读到可靠杯贴，外观无法确认具体配方。请选一下饮品类型。</span><div class="rec-grid">${['拿铁','美式','冷萃'].map(t=>`<button class="rec-option" onclick="LocalVision.choose('${t}')"><b>${t}</b><span>手动选择</span></button>`).join('')}</div>${this.actions()}</div>`:`<div class="order-card"><b>暂时无法确认饮品</b><span>可以框选杯贴再读，或直接填写名称。</span>${this.actions()}</div>`);
    }catch(e){if(this.current(g)&&this.untouched())this.show(g,`<div class="order-card"><b>这次没有看清饮品</b><span>可以框选杯贴或手动填写。</span>${this.actions()}</div>`)}
  }
};
document.addEventListener('input',e=>{if(e.target.closest('#addBackdrop')||/^f[A-Z]/.test(e.target.id||''))Recognition.editVersion++},true);
document.addEventListener('change',e=>{if(/^f[A-Z]/.test(e.target.id||'')&&!['fCamera','fGallery'].includes(e.target.id))Recognition.editVersion++},true);

// Use a complete padded label rather than truncating its upper 66 percent.
prepareSmartOcrImage=async function(file,kind='label',sourceImg=null,forcedRect=null){
  const im=sourceImg||await Reader.image(file),rect=forcedRect||{x:0,y:0,w:1,h:1};
  const x=Math.max(0,Math.min(.999,rect.x)),y=Math.max(0,Math.min(.999,rect.y));
  const sw=Math.max(1,Math.min(1-x,rect.w)*im.width),sh=Math.max(1,Math.min(1-y,rect.h)*im.height);
  const scale=Math.min(1600/Math.max(sw,sh),2),pad=16,c=document.createElement('canvas');c.width=Math.round(sw*scale)+pad*2;c.height=Math.round(sh*scale)+pad*2;
  const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,x*im.width,y*im.height,sw,sh,pad,pad,c.width-2*pad,c.height-2*pad);
  Reader.log('crop',{kind,rect,width:c.width,height:c.height});return new Promise(r=>c.toBlob(r,'image/png'));
};
ocrSmartSource=async function(file,kind='label',sourceImg=null,forcedRect=null){
  Reader.cancel();const g=Reader.generation;Reader.lastNative=null;Reader.trace=[];Reader.deadline=performance.now()+26000;
  Recognition.generation=g;Recognition.state='ocr';Recognition.startVersion=Recognition.editVersion;Recognition.snapshot=Recognition.fields();Recognition.candidates=[];Recognition.kind=kind;Recognition.metadata=null;orderLastText='';
  let im=sourceImg;
  try{
    Recognition.progress(g,'正在读取杯贴文字…');im=im||await Reader.image(file);Reader.check(g);
    // Region search is only a crop hint. Text detection and rotated line crops run natively.
    const rect=forcedRect||(!['document','order','menu','receipt'].includes(kind)?Reader.regions(im)[0]:null);
    const attempts=rect?[rect,null]:[null];let decision={status:'none',candidates:[]},text='';
    for(let attemptIndex=0;attemptIndex<attempts.length;attemptIndex++){
      const region=attempts[attemptIndex];
      if(region===null&&rect&&performance.now()>Reader.deadline-5000)break;
      const blob=await prepareSmartOcrImage(file,kind,im,region);Reader.check(g);Reader.lastNative=null;
      text=await nativeRecognizeBlob(blob,6,g);Reader.check(g);
      const lines=Reader.lastNative?.lines||String(text||'').split(/\r?\n/).map(text=>({text,confidence:.75}));
      decision=DrinkEvidence.decide(lines);
      if(decision.status==='exact'&&$('fProductName').value.trim()&&$('fProductName').value.trim()!==decision.candidates[0].name)decision.status='candidate';
      if(decision.status!=='none')break;
      if(region===null&&attempts.length<3){const detail=Recognition.detailRegion(lines);if(detail)attempts.push(detail);}
    }
    if(!Recognition.current(g))return null;
    Recognition.state=decision.status;Recognition.candidates=decision.candidates;
    // Metadata is extracted only from confident lines; raw OCR is never exposed in the UI.
    const safeLines=(Reader.lastNative?.lines||[]).filter(l=>l.confidence>=.92).map(l=>l.text).join('\n');
    Recognition.metadata={brand:detectOrderBrand(safeLines),size:extractOrderSize(safeLines),temp:/少冰|去冰|冰/.test(safeLines)?'冰':/热/.test(safeLines)?'热':''};
    if(!Recognition.untouched()){Recognition.show(g,'<div class="rec-title">已保留你修改的内容</div>');return {result:{},decision};}
    if(decision.status==='exact')Recognition.apply(decision.candidates[0],g);
    else if(decision.status==='candidate')Recognition.show(g,Recognition.candidateHtml());
    else if(!['document','order','menu','receipt'].includes(kind)){Reader.deadline=0;await Recognition.visual(im,g);}
    else Recognition.show(g,`<div class="order-card"><b>没有找到可靠的饮品名称</b><span>请框选商品名称或手动输入。</span>${Recognition.actions()}</div>`);
    return {result:{productName:decision.candidates[0]?.name||''},decision};
  }catch(e){
    Reader.log('error',{message:e.message});if(!Recognition.current(g))return null;
    Recognition.state='none';Reader.deadline=0;
    if(im&&!['document','order','menu','receipt'].includes(kind))await Recognition.visual(im,g);
    else Recognition.show(g,`<div class="order-card"><b>这次没有读清饮品名称</b>${Recognition.actions()}</div>`);
    return null;
  }finally{if(Recognition.current(g)){Reader.deadline=0;orderLastText=''}}
};
LocalVision.offer=async function(im,g){return Recognition.visual(im,g)};
LocalVision.request=async function(){if(!orderLastFile)return notify('请先选择图片',true);return ocrSmartSource(orderLastFile,'label')};
document.querySelector('.u-native-vision-action')?.remove();
readCurrentImageText=async function(mode='auto'){if(!orderLastFile)return notify('请先选择图片',true);return ocrSmartSource(orderLastFile,mode==='document'?'document':'label')};
readLabelRect=async function(rect){clearLabelSelection();return ocrSmartSource(orderLastFile,'label',null,rect)};
ocrAssistHtml=function(){return '<div class="order-card"><b>没有找到可靠的饮品名称</b>'+Recognition.actions()+'</div>'};
useOcrLine=function(encoded){const d=DrinkEvidence.decide([{text:decodeURIComponent(encoded),confidence:.8}]);if(!d.candidates.length)return;Recognition.candidates=d.candidates;Recognition.state='candidate';Recognition.choose(0)};
const cleanPaste=showOrderTextPaste;showOrderTextPaste=function(){orderLastText='';cleanPaste();document.querySelector('#orderPasteBackdrop b')?.replaceChildren(document.createTextNode('输入饮品名称'));};
