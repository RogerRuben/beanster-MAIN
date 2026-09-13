/* Visual recognition is bundled/native; suggestions never silently overwrite text. */
const LocalVision={active:'',last:null,
  cancel(){if(this.active)prompt('sipsqueak://visioncancel?id='+this.active,'');this.active=''},
  pixels(im){const c=document.createElement('canvas');c.width=c.height=224;const x=c.getContext('2d',{willReadFrequently:true}),side=Math.min(im.width,im.height);x.drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,224,224);const rgba=x.getImageData(0,0,224,224).data,rgb=new Uint8Array(224*224*3);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2]}return rgb},
  async infer(im,generation=Reader.generation){
    const deadline=performance.now()+6000,check=()=>{if(generation!==Reader.generation)throw Error('vision-cancelled');if(performance.now()>deadline)throw Error('vision-timeout')};check();
    if(prompt('sipsqueak://visioncapabilities','')!=='native-vision-1')throw Error('vision-unavailable');
    const rgb=this.pixels(im);if(prompt('sipsqueak://visionbegin','')!=='0')throw Error('vision-transfer');
    for(let i=0;i<rgb.length;i+=3000){check();const part=rgb.subarray(i,i+3000);if(Number(prompt('sipsqueak://visionchunk?data='+encodeURIComponent(bytesChunkB64(part)),''))!==i+part.length)throw Error('vision-transfer');if(i%24000===0)await Reader.pause(0)}
    check();const id='v'+Date.now().toString(36)+'_'+generation;this.active=id;
    const status=prompt('sipsqueak://visionfinish?meta='+id,'');if(status!=='pending'){this.active='';throw Error('vision-'+status)}
    try{while(true){check();await Reader.pause(40);check();const r=JSON.parse(prompt('sipsqueak://visionpoll?id='+id,'')||'{}');if(r.status==='done'){this.last=r;Reader.log('vision',r);return r}if(r.status!=='pending')throw Error('vision-failed')}}
    finally{prompt('sipsqueak://visioncancel?id='+id,'');if(this.active===id)this.active=''}
  },
  evidence(result){const top=result?.top||[],drink=top.filter(x=>['coffee mug','coffeepot','espresso','cup'].includes(x.label)),positive=Math.max(0,...drink.map(x=>x.score)),negative=Math.max(0,...top.filter(x=>/keyboard|laptop|computer|cellular telephone|monitor|book|menu|packet/.test(x.label)).map(x=>x.score));return positive>=.16&&positive>negative*1.3},
  async offer(im,generation){
    const initialName=$('fProductName').value,initialType=$('fType').value;
    setOrderProgress(.2,'正在看饮品外观…');
    try{const r=await this.infer(im,generation);if(generation!==Reader.generation)return;
      if($('fProductName').value!==initialName||$('fType').value!==initialType)return;
      const good=this.evidence(r);visionModelState='ready';
      const candidates=good?analyzeCoffeeImage(im).candidates.slice(0,3):[];
      $('recognition').innerHTML=good?`<div class="rec-title">识别到杯具或咖啡，确认一下类型</div><div class="rec-grid">${candidates.map(c=>`<button class="rec-option" onclick="LocalVision.choose('${c.type}')"><b>${esc(c.type)}</b><span>外观建议</span></button>`).join('')}</div><div class="estimate-note">外观无法确认具体配方、品牌和咖啡因含量。点选后仍可修改；有杯贴时优先读文字。</div>`:`<div class="rec-title">暂时无法从外观确认饮品</div><div class="estimate-note">可以直接选择类型，或再读一次杯贴。已填写的内容会保留。</div>`;
      $('recognition').insertAdjacentHTML('beforeend',`<div class="order-actions"><button onclick="readCurrentImageText()">读取杯贴</button><button onclick="showOrderTextPaste()">输入文字</button></div>`);$('recognition').classList.add('show');
    }catch(e){if(generation!==Reader.generation)return;Reader.log('vision-error',{message:e.message});$('recognition').innerHTML='<div class="rec-title">这次没有看清饮品</div><div class="estimate-note">已保留图片和填写内容，可以直接选择类型或读取杯贴。</div>';$('recognition').classList.add('show')}
  },
  choose(type){if(!CATALOG[type])return;if($('fProductName').value.trim()){UI.overlay('uVisionConfirm','使用外观建议？',`<div class="u-unsaved"><p>这会替换当前饮品名称，改为“${esc(type)}”。</p><button class="primary" onclick="LocalVision.apply('${type}')">使用建议</button><button class="u-text-btn" onclick="UI.closeOverlay('uVisionConfirm')">保留当前内容</button></div>`,'u-small-overlay')}else this.apply(type)},
  apply(type){UI.closeOverlay('uVisionConfirm');selectRecognized(type,0);draftProductSource='visual-suggestion';draftConfidence=0;},
  async request(){if(!orderLastFile)return notify('请先选择饮品照片',true);Reader.cancel();const generation=Reader.generation;try{const im=await Reader.image(orderLastFile);if(generation===Reader.generation)await this.offer(im,generation)}catch(e){if(generation===Reader.generation)notify('无法读取图片',true)}}
};
const visionCancel=Reader.cancel.bind(Reader);Reader.cancel=function(){LocalVision.cancel();visionCancel()};
document.querySelector('.photo-actions')?.insertAdjacentHTML('afterend','<button class="u-text-btn u-native-vision-action" onclick="LocalVision.request()">看饮品外观</button>');
