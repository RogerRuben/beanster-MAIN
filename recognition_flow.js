/* V18.4: one owner for OCR evidence, suggestions and cancellation. */
const DrinkEvidence={
  noise:/蛋糕|饼干|面包|汉堡|咖啡豆|吸管|咖啡机|咖啡杯|杯具|键盘|手机|广告|优惠|招聘|小程序|门店|电话|地址|订单|配送|发票|推荐|教程|制作方法|没喝|没有|未喝|不喝|不含|添加|去记录|记录成功|智能|常喝|快速添加/,
  normalize(raw){return String(raw||'').normalize('NFKC').replace(/\s+/g,' ').replace(/[（(]杯[）)]/g,'').replace(/\s*(大杯|中杯|小杯|超大杯|杯)\s*$/,'').replace(/^[*×x]\s*\d+\s*/i,'').trim()},
  fix(raw){return this.normalize(raw).replace(/拿[鈇跌佚迭钠衲]/g,'拿铁').replace(/生揶/g,'生椰').replace(/澳自/g,'澳白').replace(/美戎/g,'美式')},
  candidates(lines){
    const names=[...new Set([...BUILTIN_PRODUCT_NAMES,...Object.keys(CATALOG)])].filter(n=>!this.noise.test(n));
    const out=[];
    for(const item of lines){
      const raw=this.normalize(item.text),s=this.fix(raw),confidence=Number(item.confidence)||0;
      if(confidence<.60||!s||s.length>32||this.noise.test(s)||/^\d|[¥￥]|\d+\s*(mg|毫克)/i.test(s))continue;
      let name='',corrected=s!==raw,partial=false;
      const exact=names.find(n=>n.toLowerCase()===s.toLowerCase());
      if(exact)name=exact;
      else {
        const anchor=s.match(/拿铁|美式|卡布奇诺|摩卡|馥芮白|澳白|冷萃|手冲|浓缩咖啡|黑咖啡|latte|americano|espresso|dirty/i);
        if(anchor){
          const near=names.map(n=>({n,d:editDistance(s,n)})).filter(x=>x.d<=1&&Math.max(s.length,x.n.length)>=4).sort((a,b)=>a.d-b.d);
          if(near.length===1){name=near[0].n;corrected=true;}
          else {name=anchor[0];partial=s.toLowerCase()!==name.toLowerCase();}
        }
      }
      if(!name||!canonicalTypeForName(name,''))continue;
      out.push({name,raw,confidence,corrected,partial,exact:!!exact&&!corrected});
    }
    out.sort((a,b)=>(Number(b.exact)-Number(a.exact))||b.confidence-a.confidence);
    const seen=new Set();return out.filter(x=>!seen.has(x.name)&&seen.add(x.name)).slice(0,3);
  },
  decide(lines){const candidates=this.candidates(lines),top=candidates[0];return {status:!top?'none':candidates.length===1&&top.exact&&top.confidence>=.92?'exact':'candidate',candidates}},
};
// Legacy helpers can no longer offer arbitrary OCR lines or fuzzy-complete unknown names.
repairReadProduct=function(raw){return DrinkEvidence.fix(raw)};
ocrAnyLineCandidates=function(){return []};
ocrLineCandidates=function(text){return DrinkEvidence.candidates(String(text||'').split(/\r?\n/).map(text=>({text,confidence:.8}))).map(x=>({line:x.name,score:x.confidence}))};
parseOrderText=function(text){const r=readerParse(text),d=DrinkEvidence.decide(String(text||'').split(/\r?\n/).map(text=>({text,confidence:.8})));r.productName=d.candidates[0]?.name||'';r.type=r.productName?canonicalTypeForName(r.productName,''):'';return r};
const Recognition={generation:-1,state:'idle',candidates:[],editVersion:0,startVersion:0,kind:'label',metadata:null,snapshot:'',
  fields(){return JSON.stringify(['fProductName','fType','fBrand','fSize','fShots','fCaf','fPrice'].map(id=>$(id)?.value))},
  current(g){return g===Reader.generation&&g===this.generation},
  untouched(){return this.editVersion===this.startVersion&&this.fields()===this.snapshot},
  actions(){return '<div class="order-actions"><button onclick="startTapLabel()">框选杯贴</button><button onclick="showOrderTextPaste()">手动输入</button></div>'},
  show(g,html){if(!this.current(g))return;if($('uPhotoDetails'))$('uPhotoDetails').open=true;$('recognition').innerHTML=html;$('recognition').classList.add('show')},
  progress(g,text){this.show(g,`<div class="rec-title">${esc(text)}</div><div class="estimate-note">杯贴文字优先，读不清时再看饮品外观。</div><div class="order-actions"><button onclick="Recognition.stop()">停止识别</button></div>`)},
  stop(){Reader.cancel();this.state='stopped';$('recognition').innerHTML='<div class="rec-title">已停止识别</div><div class="estimate-note">可以直接填写饮品。</div>'},
  choose(index){const item=this.candidates[index];if(!item||!['candidate','exact'].includes(this.state))return;
    if(!this.untouched()){notify('已保留你修改的内容，请重新识别或手动填写');return;}
    this.apply(item,this.generation,true);
  },
  apply(item,g,confirmed=false){
    if(!this.current(g)||!this.untouched())return;
    const r={...(this.metadata||{}),text:'',productName:item.name,type:canonicalTypeForName(item.name,'')};
    readerApply(r,this.kind);draftProductSource=confirmed?'label-confirmed':'label';draftReadKey=item.raw;draftReadText='';
    this.state='exact';this.snapshot=this.fields();this.show(g,`<div class="order-card"><b>杯贴${confirmed?'已确认':'识别'}：${esc(item.name)}</b><span>${confirmed?'已按你的选择填写。':'已读取饮品名称。'}咖啡因按配方估算，可继续修改。</span>${this.actions()}</div>`);
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
    for(const region of attempts){
      if(region===null&&rect&&performance.now()>Reader.deadline-5000)break;
      const blob=await prepareSmartOcrImage(file,kind,im,region);Reader.check(g);Reader.lastNative=null;
      text=await nativeRecognizeBlob(blob,6,g);Reader.check(g);
      const lines=Reader.lastNative?.lines||String(text||'').split(/\r?\n/).map(text=>({text,confidence:.75}));
      decision=DrinkEvidence.decide(lines);
      if(decision.status==='exact'&&$('fProductName').value.trim()&&$('fProductName').value.trim()!==decision.candidates[0].name)decision.status='candidate';
      if(decision.status!=='none')break;
    }
    if(!Recognition.current(g))return null;
    Recognition.state=decision.status;Recognition.candidates=decision.candidates;
    // Metadata is extracted only from confident lines; raw OCR is never exposed in the UI.
    const safeLines=(Reader.lastNative?.lines||[]).filter(l=>l.confidence>=.92).map(l=>l.text).join('\n');
    Recognition.metadata={brand:detectOrderBrand(safeLines),size:extractOrderSize(safeLines),temp:/少冰|去冰|冰/.test(safeLines)?'冰':/热/.test(safeLines)?'热':''};
    if(!Recognition.untouched()){Recognition.show(g,'<div class="rec-title">已保留你修改的内容</div>');return {result:{},decision};}
    if(decision.status==='exact')Recognition.apply(decision.candidates[0],g);
    else if(decision.status==='candidate')Recognition.show(g,`<div class="order-card"><b>杯贴可能是以下饮品</b><span>部分文字未读清，请确认后填写。</span><div class="rec-grid">${decision.candidates.map((c,i)=>`<button class="rec-option" onclick="Recognition.choose(${i})"><b>${esc(c.name)}</b><span>${c.partial?'仅识别到品类':c.corrected?'已纠正疑似错字':'待确认'}</span></button>`).join('')}</div>${Recognition.actions()}</div>`);
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
