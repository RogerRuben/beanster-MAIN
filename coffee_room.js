/* Coffee room is a view of records, never a second inventory. */
const CoffeeRoom={
  query:'',limit:60,detailId:null,ritual:null,ritualTimer:0,
  day(ts){return localKey(new Date(ts))},
  today(){return this.day(Date.now())},
  valid(){return records.filter(r=>r&&Number.isFinite(Number(r.ts))).slice().sort((a,b)=>b.ts-a.ts||String(a.id).localeCompare(String(b.id)))},
  desk(){return this.valid().filter(r=>this.day(r.ts)===this.today())},
  arg(id){return esc(JSON.stringify(String(id)))},
  sprite(r){const n=String(r.productName||'')+' '+String(r.type||'');return /抹茶/.test(n)?6:/生椰|椰乳|椰拿铁/.test(n)?5:/摩卡|巧克力/.test(n)?4:/澳白|馥芮白|flat white/i.test(n)?3:/冷萃|冰美式/.test(n)?2:/手冲/.test(n)?7:/美式|黑咖|浓缩/.test(n)?1:/拿铁|卡布|latte|dirty/i.test(n)?0:8},
  cup(r,cls=''){const i=this.sprite(r);return `<span class="cc-cup ${cls}" style="--cup-x:${(i%3)*50}%;--cup-y:${Math.floor(i/3)*50}%" aria-hidden="true"></span>`},
  cupButton(r){return `<button class="cc-desk-cup" data-record-id="${esc(r.id)}" onclick="CoffeeRoom.detail(${this.arg(r.id)})" aria-label="查看 ${esc(recordDisplayName(r))}，${pad(new Date(r.ts).getHours())}:${pad(new Date(r.ts).getMinutes())}">${this.cup(r)}</button>`},
  hero(){if(/^character_/.test(settings.homeCharacter||'')&&settings.homeCharacter!=='character_burger'&&Motion.asset(settings.homeCharacter))return settings.homeCharacter;const h=new Date().getHours();return h<6||h>=22?'character_idle':this.desk().length?'character_coffee':'character_wave'},
  scene(){const rs=this.desk(),night=new Date().getHours()<6||new Date().getHours()>=20;
    return `<section class="cc-corner ${night?'cc-night':''}" aria-label="仓鼠咖啡角"><div class="cc-scene-heading"><span>仓鼠咖啡角</span><button class="cc-room-sign" onclick="CoffeeRoom.open()">收藏室 ↗</button></div><div class="cc-speech">${rs.length?'每一杯，都有自己的故事。':'桌子留好了，今天想喝什么？'}</div>${UI.art(this.hero(),'cc-hamster',true,'咖啡角仓鼠')}<img class="cc-table" src="art/coffee-room/table.png" alt=""><div class="cc-desk" aria-label="今天的咖啡">${rs.slice(0,4).map(r=>this.cupButton(r)).join('')}</div>${rs.length>4?`<button class="cc-more" onclick="CoffeeRoom.openToday()">更多 · 还有 ${rs.length-4} 杯 →</button>`:!rs.length?'<span class="cc-empty-desk">还没有放上今天的咖啡</span>':''}<div class="cc-ritual-slot"></div></section>`;
  },
  decorateHome(){const content=$('todayContent');if(!content)return;const hero=content.querySelector('.u-hero');if(!hero)return;
    // Keep every dashboard style available, but let the scene be the home focal point.
    hero.querySelector('.u-home-mascot')?.remove();hero.classList.add('u-no-mascot');
    const custom=$('uDashboardCustomize'),details=document.createElement('details');details.className='u-details cc-dashboard-details';details.innerHTML='<summary>咖啡因仪表盘 · 切换组件 '+UI.arrow()+'</summary>';hero.before(details);details.append(hero);if(custom)details.append(custom);
    const rs=this.desk(),caf=Math.round(sum(rs,'caffeine')),limit=Math.max(1,Number(settings.dailyLimit)||400);
    details.insertAdjacentHTML('beforebegin',this.scene()+`<div class="cc-caffeine"><span>今日咖啡因 <b>${caf}<small> mg</small></b></span><span>${caf>limit?'超过上限':'日上限剩余'} <b>${Math.abs(limit-caf)}<small> mg</small></b></span></div>`);
    content.querySelector('.u-achievement-teaser')?.remove();
    const metrics=content.querySelector('.u-metrics'),cta=content.querySelector('.u-record-cta');if(metrics)details.before(metrics);if(cta)details.before(cta);
    // Only a visible desk is remembered. Backdated additions never enter this snapshot.
    if(document.querySelector('.page.active')?.id==='today'&&!AppNav.layers().length)this.checkDay();
  },
  open(){this.query='';this.limit=60;UI.go('collection')},
  openToday(){this.query=this.today();this.limit=60;UI.go('collection')},
  search(value){this.query=value;this.limit=60;this.renderShelves()},
  matches(r){const q=this.query.trim().normalize('NFKC').toLowerCase();if(!q)return true;const d=new Date(r.ts),date=this.day(r.ts);const text=[recordDisplayName(r),r.brand,date,date.replaceAll('-','/'),`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,`${d.getMonth()+1}月${d.getDate()}日`].join(' ').normalize('NFKC').toLowerCase();return q.split(/\s+/).every(t=>text.includes(t))},
  render(){const host=$('collectionContent');if(!host)return;
    host.innerHTML=`<div class="cc-room-header"><div><span>BEANSTER MEMORIES</span><h1>咖啡收藏室</h1><p>一杯一格，收藏喝过的日常。</p></div><button class="cc-photo-link" onclick="CoffeeRoom.photos()">${UI.icon('camera')}照片</button></div><label class="cc-search"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input id="ccSearch" type="search" value="${esc(this.query)}" placeholder="搜索饮品、品牌或日期" aria-label="搜索饮品名、品牌或日期" oninput="CoffeeRoom.search(this.value)"></label><div id="ccShelves" aria-live="polite"></div>`;this.renderShelves();
  },
  renderShelves(){const host=$('ccShelves');if(!host)return;const all=this.valid(),filtered=all.filter(r=>this.matches(r)),shown=filtered.slice(0,this.limit),groups=new Map();shown.forEach(r=>{const key=this.day(r.ts);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)});
    if(!all.length){host.innerHTML=`<div class="cc-room-empty"><div class="cc-empty-scene">${UI.art('character_coffee')}</div><h2>这里，还等着你的第一杯</h2><p>记录一杯咖啡，就为它留下一格。<br>同款的每一次饮用，也值得单独收藏。</p><button class="primary" onclick="openAdd()">＋ 去记录一杯</button></div>`;return}
    host.innerHTML=`<div class="cc-room-count"><b>已收藏 ${all.length} 杯</b><span>${this.query?'找到 '+filtered.length+' 杯':'每次饮用，独立珍藏'}</span></div>${!filtered.length?'<div class="cc-no-results"><h2>没有找到这杯咖啡</h2><p>试试饮品名、品牌或 2026-09-16 这样的日期。</p><button class="u-text-btn" onclick="CoffeeRoom.query=\'\';CoffeeRoom.render()">清除搜索</button></div>':''}${[...groups].map(([date,rs])=>`<section class="cc-date-group"><h2>${esc(date)}<small>${all.filter(r=>this.day(r.ts)===date).length} 杯</small></h2>${Array.from({length:Math.ceil(rs.length/3)},(_,row)=>`<div class="cc-shelf">${rs.slice(row*3,row*3+3).map(r=>`<button class="cc-collection-cup" data-record-id="${esc(r.id)}" onclick="CoffeeRoom.detail(${this.arg(r.id)})" aria-label="${esc(recordDisplayName(r))}，${esc(r.brand||'未填品牌')}，${fmtTs(r.ts)}">${this.cup(r)}<b>${esc(recordDisplayName(r))}</b><small>${esc(r.brand||'自选咖啡')} · ${pad(new Date(r.ts).getHours())}:${pad(new Date(r.ts).getMinutes())}</small></button>`).join('')}</div>`).join('')}</section>`).join('')}${filtered.length>shown.length?`<button class="cc-load-more" onclick="CoffeeRoom.limit+=60;CoffeeRoom.renderShelves()">继续查看 · 还有 ${filtered.length-shown.length} 杯</button>`:''}<p class="cc-footer-note">收好每一杯，也收好每一天。</p>`;
  },
  detail(id){if(!records.some(r=>String(r.id)===String(id)))return;this.detailId=String(id);UI.overlay('ccDetail','这杯咖啡','<div id="ccDetailContent"></div>','cc-detail-overlay');this.renderDetail()},
  renderDetail(){const host=$('ccDetailContent');if(!host)return;const r=records.find(r=>String(r.id)===this.detailId);if(!r){UI.closeOverlay('ccDetail');this.detailId=null;return}const id=this.arg(r.id),rating=Math.max(0,Math.min(5,Number(r.rating)||0)),photo=!!(r.photoId||r.photoPreview||r.nativePhotoPath);
    host.innerHTML=`<div class="cc-detail-hero">${this.cup(r)}<span>这一杯的记忆</span><h1>${esc(recordDisplayName(r))}</h1><p>${esc(r.brand||'未填写品牌')}</p></div><dl class="cc-detail-fields"><div><dt>日期时间</dt><dd>${this.day(r.ts)} ${pad(new Date(r.ts).getHours())}:${pad(new Date(r.ts).getMinutes())}</dd></div><div><dt>容量</dt><dd>${Number(r.size)||0} ml</dd></div><div><dt>咖啡因</dt><dd>${Number(r.caffeine)||0} mg${r.estimated?' · 估算':''}</dd></div><div><dt>热量</dt><dd>${Number(r.calories)||0} kcal</dd></div><div><dt>价格</dt><dd>${money(r.price)}</dd></div><div><dt>评分</dt><dd aria-label="${rating?rating+' 星':'未评分'}">${rating?'★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating)):'未评分'}</dd></div></dl><section class="cc-note"><h2>这杯小记</h2><p>${esc(r.note||'还没有留下备注。')}</p></section><section class="cc-detail-photo"><h2>咖啡照片</h2>${photo?`<button onclick="viewPhoto(${this.arg(r.photoId||r.id)},${this.arg(recordDisplayName(r))})" aria-label="查看原始咖啡照片"><img data-photo="${esc(r.photoId||r.id)}" src="${esc(nativeFileUrl(r.nativePhotoPath)||r.photoPreview||'')}" alt="${esc(recordDisplayName(r))}的照片"></button>`:'<p>这杯还没有照片，可以在编辑中补上。</p>'}</section><div class="cc-detail-actions"><button class="danger" onclick="delRecord(${id})">${UI.icon('delete')}删除</button><button class="primary" onclick="editRecord(${id})">${UI.icon('edit')}编辑这杯</button></div>`;hydratePhotos(host);
  },
  photos(){document.querySelectorAll('.page,.nav button').forEach(n=>n.classList.remove('active'));$('photos').classList.add('active');document.body.dataset.page='photos';renderPhotos();scrollTo(0,0)},
  // Persist consumed day before animation, so skip, crash, or several missed days cannot replay it.
  transition(state,today,rs){const previous=state&&typeof state.day==='string'?state:null;const ids=new Set(previous?.ids||[]);return {old:previous&&previous.day<today?rs.filter(r=>ids.has(String(r.id))&&this.day(r.ts)<today):[],next:{day:today,ids:rs.filter(r=>this.day(r.ts)===today).map(r=>String(r.id))}}},
  checkDay(){const today=this.today(),state=settings.coffeeDesk,change=this.transition(state,today,this.valid());if(state?.day>today)return;const next=JSON.stringify(change.next);if(next!==JSON.stringify(state)){settings.coffeeDesk=change.next;persist()}if(change.old.length&&!this.ritual){this.ritual=change.old.slice(0,4).map(r=>({...r}));setTimeout(()=>this.startRitual(),0)}},
  startRitual(){const slot=document.querySelector('.cc-ritual-slot');if(!slot||!this.ritual)return;if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){this.finishRitual();return}slot.innerHTML=`<div class="cc-ritual" role="status"><div class="cc-ritual-copy"><b>把上次的咖啡，收进回忆</b><button onclick="CoffeeRoom.finishRitual()">跳过</button></div><div class="cc-packing-cups">${this.ritual.map(r=>this.cup(r)).join('')}</div><span class="cc-packing-destination">收藏室 ↗</span></div>`;Motion.effect(slot.firstElementChild,'cc-packing',1800);clearTimeout(this.ritualTimer);this.ritualTimer=setTimeout(()=>this.finishRitual(),1850)},
  finishRitual(){clearTimeout(this.ritualTimer);if(Motion.active?.classList.contains('cc-ritual'))Motion.stop();document.querySelectorAll('.cc-ritual').forEach(el=>el.remove());this.ritual=null},
  refresh(){this.render();this.renderDetail();if($('uDayContent'))UI.renderDay()}
};
const roomToday=renderToday;renderToday=function(){roomToday();CoffeeRoom.decorateHome()};
const roomRenderAll=renderAll;renderAll=function(){roomRenderAll();CoffeeRoom.refresh()};
// Save already persists the record. All room views read that same record immediately.
const roomPersist=persist;persist=function(){roomPersist();CoffeeRoom.renderShelves();CoffeeRoom.renderDetail()};
const roomGo=UI.go;UI.go=function(id){if(id==='photos')CoffeeRoom.photos();else roomGo(id)};
const roomSettings=renderSettings;renderSettings=function(){roomSettings();$('settingsContent').insertAdjacentHTML('afterbegin','<button class="u-achievement-teaser" onclick="CoffeeRoom.open()"><span><b>咖啡收藏室</b><small>每一杯都有自己的位置</small></span>'+UI.arrow()+'</button>');$('settingsContent').querySelector('.about span').textContent='Beanster Sips · V19.0'};
// Route existing record menus into the complete detail page.
UI.recordMenu=id=>CoffeeRoom.detail(id);
const roomGallery=Motion.gallery;Motion.gallery=function(){roomGallery.call(this);const burger=document.querySelector('.u-expression-grid [data-motion=character_burger]')?.closest('article');const button=burger?.querySelector('button');if(button){button.disabled=true;button.textContent='仅在表情册欣赏'}};
document.addEventListener('toggle',e=>{if(e.target.matches?.('.cc-dashboard-details')&&!e.target.open&&e.target.contains(Motion.active))Motion.stop()},true);
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>CoffeeRoom.finishRitual(),true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)CoffeeRoom.finishRitual();else if(document.querySelector('.page.active')?.id==='today'){renderToday();Motion.sync()}});
// Also refresh a home left open across midnight, without a recurring background job.
setInterval(()=>{if(!document.hidden&&document.querySelector('.page.active')?.id==='today'&&settings.coffeeDesk?.day!==CoffeeRoom.today()&&!AppNav.layers().length){renderToday();Motion.sync()}},30000);
renderAll();Motion.scope=null;Motion.sync();
