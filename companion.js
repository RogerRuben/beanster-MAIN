/* Time chooses a companion only on entry; actions temporarily choose a portrait. */
const Companion={entryHour:new Date().getHours(),feedback:'',timer:0,
  schedule(hour){return hour<6||hour>=22?{hero:'character_idle',portrait:'portrait_sleepy',label:'夜深了，慢慢休息'}:hour<9?{hero:'character_wave',portrait:'portrait_calm',label:'早上好，新的一天'}:hour<12?{hero:'character_coffee',portrait:'portrait_calm',label:'上午的咖啡时光'}:hour<14?{hero:'character_burger',portrait:'portrait_calm',label:'午间，放松一下'}:hour<18?{hero:'character_takeaway',portrait:'portrait_calm',label:'下午，换个好心情'}:{hero:'character_idle',portrait:'portrait_calm',label:'晚上好，回顾今天'}},
  enter(){this.entryHour=new Date().getHours()},
  hero(){return /^character_/.test(settings.homeCharacter||'')&&Motion.asset(settings.homeCharacter)?settings.homeCharacter:this.schedule(this.entryHour).hero},
  portrait(){return this.feedback||(/^portrait_/.test(settings.homePortrait||'')&&Motion.asset(settings.homePortrait)?settings.homePortrait:this.schedule(this.entryHour).portrait)},
  header(){const logo=document.querySelector('header .logo');logo.innerHTML=UI.art(this.portrait(),'u-companion-avatar',true,'陪伴表情');logo.setAttribute('aria-label',this.schedule(this.entryHour).label);logo.title=this.schedule(this.entryHour).label},
  react(id){clearTimeout(this.timer);this.feedback=id;Motion.stop();this.header();if(document.querySelector('.page.active')?.id==='today'&&!AppNav.layers().length)Motion.play(document.querySelector('.u-companion-avatar'));this.timer=setTimeout(()=>{this.feedback='';this.header()},4200)},
  choosePortrait(id){settings.homePortrait=id;persist();this.feedback='';this.header();UI.closeOverlay('uExpressions');notify(id?'已设置陪伴头像':'头像已跟随时段')},
  decorateForm(){if(!$('addModal').querySelector('.u-form-companion'))$('addModal').querySelector('.u-form-body').insertAdjacentHTML('afterbegin',`<div class="u-form-companion">${UI.art('character_recording','',true,'记录中的鼠鼠')}<span>把这一杯，记下来。</span></div>`)},
};
const companionToday=renderToday;renderToday=function(){companionToday();const im=document.querySelector('.u-home-mascot');if(im){im.dataset.motion=Companion.hero();im.src=UI.path(im.dataset.motion)}Companion.header()};
const companionAnalysis=renderAnalysis;renderAnalysis=function(){companionAnalysis();$('analysisContent').insertAdjacentHTML('afterbegin',`<div class="u-report-companion">${UI.art('character_monthly','',true,'月报统计鼠鼠')}<span>看看这个月留下的咖啡记忆</span></div>`)};
const companionOpen=openAdd;openAdd=function(...args){companionOpen(...args);Companion.decorateForm()};
const companionEdit=editRecord;editRecord=async function(...args){await companionEdit(...args);Companion.decorateForm()};
const companionSave=saveRecord;saveRecord=async function(...args){
  if(UI.saving)return;const before=new Set(UI.achievementList().filter(x=>x.at).map(x=>x.id)),old=JSON.stringify(records);
  await companionSave(...args);
  if(!$('addModal').classList.contains('show')&&JSON.stringify(records)!==old){const unlocked=UI.achievementList().some(x=>x.at&&!before.has(x.id));Companion.react(unlocked?'portrait_excited':'portrait_happy')}
};
// Saving feedback uses the header portrait; no delayed gauge/hero rerender.
triggerSaveFx=function(){saveFxUntil=0;saveFxCups=0};
const companionGallery=Motion.gallery;Motion.gallery=function(){companionGallery.call(this);const grid=document.querySelector('.u-expression-grid');for(const article of grid.children){const id=article.querySelector('[data-motion]')?.dataset.motion;if(id?.startsWith('portrait_'))article.insertAdjacentHTML('beforeend',`<button class="u-text-btn" onclick="Companion.choosePortrait('${id}')">${settings.homePortrait===id?'已设为头像':'设为陪伴头像'}</button>`)}grid.insertAdjacentHTML('afterend',`<p class="u-motion-hint">首页角色默认随时段更换；保存时开心，解锁成就时兴奋。每次只播放一个表情。</p><button class="u-text-btn" onclick="Companion.choosePortrait('')">头像跟随时段</button>`)};
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='today')Companion.enter()},true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.querySelector('.page.active')?.id==='today'&&!AppNav.layers().length){Companion.enter();renderToday();Motion.scope=null;Motion.sync()}});
renderToday();renderAnalysis();
Motion.scope=null;Motion.sync();
