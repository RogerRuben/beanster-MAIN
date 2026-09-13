/* One global one-shot player. Resting art is always a transparent static PNG. */
const Motion={active:null,token:0,scope:null,raf:0,
  asset:id=>window.BEANSTER_ART.assets.find(a=>a.id===id),
  stop(){this.token++;cancelAnimationFrame(this.raf);if(this.active?.isConnected)this.active.src=UI.path(this.active.dataset.motion);this.active?.removeAttribute('data-playing');this.active=null},
  async play(img){
    this.stop();if(!img?.isConnected||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const asset=this.asset(img.dataset.motion);if(!asset?.animation?.type.startsWith('generated-'))return;
    const token=this.token,frames=asset.animation.frames.map(p=>'art/upgrade-v1/'+p);
    try{await Promise.all(frames.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src=src})))}catch(e){return}
    if(token!==this.token||!img.isConnected)return;
    this.active=img;img.dataset.playing='true';const durations=asset.animation.durationsMs,total=durations.reduce((a,b)=>a+b,0),start=performance.now();let last=-1;
    const step=now=>{if(token!==this.token)return;if(!img.isConnected||document.hidden||now-start>=total){this.stop();return}
      let elapsed=now-start,i=0;while(i<durations.length-1&&elapsed>=durations[i])elapsed-=durations[i++];if(i!==last){img.src=frames[i];last=i}this.raf=requestAnimationFrame(step)};
    this.raf=requestAnimationFrame(step);
  },
  sync(){
    const overlay=[...document.querySelectorAll('.u-overlay')].at(-1),form=$('addModal').classList.contains('show')?$('addModal'):null;
    const scope=overlay||form||document.querySelector('.page.active'),key=scope?.id;
    if(key!==this.scope){this.stop();this.scope=key;const first=key==='today'&&typeof Companion!=='undefined'&&Companion.feedback?document.querySelector('.u-companion-avatar'):scope?.querySelector('[data-motion]');if(first)this.play(first)}
    else if(this.active&&!this.active.isConnected)this.stop();
  },
  gallery(){const assets=window.BEANSTER_ART.assets.filter(a=>['characters','portraits'].includes(a.category));
    UI.overlay('uExpressions','鼠鼠表情',`<p class="u-motion-hint">点一下，播放一次。选一只鼠鼠陪你记录。</p><div class="u-expression-grid">${assets.map(a=>`<article>${UI.art(a.id,'',true,a.label)}<b>${esc(a.label)}</b>${a.category==='characters'?`<button class="u-text-btn" onclick="Motion.choose('${a.id}')">${settings.homeCharacter===a.id?'已在首页':'放到首页'}</button>`:'<span>点击播放</span>'}</article>`).join('')}</div><button class="u-text-btn" onclick="Motion.choose('')">首页按记录自动选择</button>`);
  },
  choose(id){settings.homeCharacter=id;persist();renderToday();notify(id?'已换好首页鼠鼠':'已恢复自动选择');UI.closeOverlay('uExpressions')}
};
document.addEventListener('click',e=>{const img=e.target.closest('[data-motion]');if(img){e.preventDefault();e.stopPropagation();Motion.play(img)}},true);
document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-motion]')){e.preventDefault();Motion.play(e.target)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)Motion.stop()});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>Motion.stop());
new MutationObserver(()=>Motion.sync()).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
Motion.sync();
