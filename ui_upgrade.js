/* Beanster Sips V18 — presentation layer over the existing V17.7 data/OCR core. */
const UI = (() => {
  const ROOT = 'art/upgrade-v1/';
  const categories = {character_coffee:'characters',character_burger:'characters',character_first_cup:'characters',character_goal:'characters',character_idle:'characters',character_monthly:'characters',empty_rest:'empty-states',empty_no_coffee:'empty-states',empty_first_record:'empty-states',sticker_recorded:'stickers',sticker_sleep:'stickers',sticker_good:'stickers'};
  const legacy = {openAdd, editRecord, closeAdd, saveRecord, renderSettings, renderPhotos, applyCatalog, renderWhatIf};
  let reportTab='overview', dayKey='', pickerKind='', saving=false, lastFocus=null;
  const arg = x => esc(JSON.stringify(String(x)));
  const path = (id, animated=false) => {
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const category=categories[id] || (id.startsWith('character_')?'characters':id.startsWith('icon_')?'icons':id.startsWith('drink_')?'drinks':id.startsWith('cup_')?'cups':id.startsWith('stamp_')?'stamps':id.startsWith('achievement_')?'achievements':id.startsWith('locked_')?'locked':id.startsWith('portrait_')?'portraits':'decorations');
    return ROOT+`png/${category}/${id}@2x.png`;
  };
  const art=(id,cls='',animated=false,label='')=>`<img class="u-art ${cls}" src="${path(id)}" ${animated?`data-motion="${id}" role="button" tabindex="0" aria-label="${esc(label||'仓鼠表情')}，点击播放一次"`:''} alt="${esc(label)}" decoding="async">`;
  const icon=(id)=>art('icon_'+id,'u-icon');
  const arrow=(left=false)=>`<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="${left?'m14 5-7 7 7 7':'m10 5 7 7-7 7'}"/></svg>`;
  const drinkId=type=>({'拿铁':'latte','生椰拿铁':'coconut_latte','美式':'americano','卡布奇诺':'cappuccino','摩卡':'mocha','冷萃':'cold_brew','手冲':'pour_over','Dirty':'coconut_latte','澳白':'latte'}[type]||'americano');
  const metric=(image,value,label)=>`<div>${icon(image)}<b>${value}</b><span>${label}</span></div>`;
  const section=(title,more='')=>`<div class="u-section"><h2>${title}</h2>${more}</div>`;
  const dateLabel=key=>{const d=new Date(key+'T12:00:00');return `${d.getMonth()+1}月${d.getDate()}日`};
  const noteFor=key=>String(settings.dayNotes?.[key]||'');

  function today(){
    const now=new Date(),key=localKey(now),rs=dayRecords(key).sort((a,b)=>b.ts-a.ts),caf=sum(rs,'caffeine'),limit=Math.max(1,Number(settings.dailyLimit)||400),rem=Math.max(0,limit-caf),over=caf>limit;
    const state=hamsterState(rs.length,caf),progress=clamp(caf/limit,0,1),hero=/^character_/.test(settings.homeCharacter||'')&&window.BEANSTER_ART?.assets.some(a=>a.id===settings.homeCharacter)?settings.homeCharacter:over?'character_late_night':rs.length>=3?'character_goal':rs.length?'character_burger':'character_coffee';
    const title=over?'今天先休息一下':state.title,sub=over?'已超过你设置的日上限':state.sub;
    $('todayContent').innerHTML=`<div class="u-date"><b>${now.getMonth()+1}月${now.getDate()}日 <span>星期${'日一二三四五六'[now.getDay()]}</span></b><button onclick="UI.go('settings')">日上限 ${Math.round(limit)} mg</button></div>
      <div class="u-hero ${over?'is-over':''}"><div class="u-gauge" role="img" aria-label="今日摄入 ${Math.round(caf)} 毫克，日上限 ${Math.round(limit)} 毫克"><svg viewBox="0 0 220 220"><defs><linearGradient id="coffeeRing" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#e1a76e"/><stop offset="1" stop-color="#70442e"/></linearGradient></defs><circle class="u-ring-track" cx="110" cy="110" r="91" pathLength="100"/><circle class="u-ring-fill" cx="110" cy="110" r="91" pathLength="100" stroke-dasharray="${progress*76} 100"/></svg><div class="u-gauge-copy"><strong>${Math.round(caf)}</strong><b>mg</b><span>${over?'已超过上限':'日上限剩余'}</span><em>${Math.round(over?caf-limit:rem)} <small>mg</small></em></div></div>${art(hero,'u-home-mascot',true,'咖啡仓鼠')}</div>
      <div class="u-metrics">${metric('cups',rs.length,'今日杯数')}${metric('calories',Math.round(sum(rs,'calories')),'kcal')}${metric('cost',money(sum(rs,'price')),'今日花费')}${metric('achievement',calcStreak(),'连续天数')}</div>
      <button class="u-achievement-teaser" onclick="UI.achievements()">${art(over?'empty_rest':rs.length?'character_first_cup':'character_idle')}<span><b>${title}</b><small>${sub}</small></span>${arrow()}</button>
      <button class="primary u-record-cta" onclick="openAdd()"><span class="u-plus">＋</span>记录一杯</button>
      <div class="u-shortcuts"><button onclick="openSmartAdd('camera')">${icon('camera')}拍照识别</button><button onclick="openSmartAdd('gallery')">${icon('note')}相册 / 杯贴</button><button onclick="UI.achievements()">${icon('achievement')}我的成就</button><button onclick="Motion.gallery()">${icon('more')}鼠鼠表情</button></div>
      ${section('今天的咖啡',`<span>${rs.length} 杯</span>`)}<div class="u-card">${entries(rs,true)}</div>
      ${templatesTodayHtml()}<details class="u-details u-home-more"><summary>睡眠与本月预算 ${arrow()}</summary>${dynamicBudgetHtml()}<div class="u-card u-budget"><span>本月花费 / 预算</span><b>${money(sum(monthRecords(),'price'))} / ${money(settings.monthlyBudget)}</b></div></details>
      <button class="u-text-btn" onclick="Motion.gallery()">查看全部鼠鼠表情 →</button>`;
    hydratePhotos($('todayContent'));
  }

  function entries(rs,compact=false){
    if(!rs.length)return `<div class="u-empty">${art('empty_no_coffee')}<b>还没有咖啡记录</b><span>让第一杯，成为今天的小仪式。</span><button class="u-text-btn" onclick="openAdd()">＋ 记录一杯</button></div>`;
    return rs.map(r=>{const hasPhoto=r.photoId||r.photoPreview||r.nativePhotoPath,id=arg(r.id),name=recordDisplayName(r);return `<article class="u-entry">
      ${hasPhoto?`<button class="u-thumb-btn" onclick="viewPhoto(${arg(r.photoId||r.id)},${arg(name)})" aria-label="查看咖啡照片"><img class="u-thumb" src="${esc(nativeFileUrl(r.nativePhotoPath)||r.photoPreview||'')}" data-photo="${esc(r.photoId||r.id)}" alt="咖啡照片"></button>`:art('drink_'+drinkId(r.type),'u-drink-thumb')}
      <div class="u-entry-copy"><b>${esc(name)}</b><span>${esc(r.brand||'自选咖啡')}${r.size?' · '+r.size+' ml':''}</span><small>${fmtTs(r.ts)} · ${Math.round(r.caffeine||0)} mg${!compact?' · '+Math.round(r.calories||0)+' kcal':''}</small>${!compact&&r.note?`<p>${esc(r.note)}</p>`:''}${r.sourceId?`<button class="u-text-btn" onclick="viewInfoSource(${id})">查看${esc(sourceLabel(r.infoSourceKind)||'信息图片')}</button>`:''}</div>
      <div class="u-entry-end"><b>${money(r.price)}</b><button class="u-more" aria-label="操作 ${esc(name)}" onclick="UI.recordMenu(${id})">⋮</button></div></article>`}).join('');
  }

  function overlay(id,title,body,cls=''){
    document.getElementById(id)?.remove();lastFocus=document.activeElement;
    const root=document.createElement('div');root.id=id;root.className='u-overlay '+cls;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);
    root.innerHTML=`<div class="u-overlay-sheet"><div class="u-overlay-head"><button aria-label="关闭" onclick="UI.closeOverlay('${id}')">${arrow(true)}</button><h2>${title}</h2><span></span></div>${body}</div>`;
    root.addEventListener('click',e=>{if(e.target===root)closeOverlay(id)});document.body.append(root);document.body.classList.add('u-modal-open');root.querySelector('button')?.focus();return root;
  }
  function closeOverlay(id){document.getElementById(id)?.remove();if(id==='uDay')dayKey='';if(!document.querySelector('.u-overlay')&&!$('addModal').classList.contains('show'))document.body.classList.remove('u-modal-open');if(lastFocus?.isConnected)lastFocus.focus()}
  function go(id){document.querySelector(`.nav [data-page="${id}"]`)?.click()}
  function recordMenu(id){const r=records.find(x=>x.id===id);if(!r)return;overlay('uActions','这杯咖啡',`<div class="u-actions-menu"><b>${esc(recordDisplayName(r))}</b><button onclick="UI.closeOverlay('uActions');editRecord(${arg(id)})">${icon('edit')}编辑记录</button>${r.photoId||r.photoPreview||r.nativePhotoPath?`<button onclick="UI.closeOverlay('uActions');viewPhoto(${arg(r.photoId||id)},${arg(recordDisplayName(r))})">${icon('camera')}查看照片</button>`:''}<button class="danger" onclick="UI.closeOverlay('uActions');delRecord(${arg(id)})">${icon('delete')}删除记录</button></div>`,'u-small-overlay')}

  const brandNames=()=>[...new Set([...Array.from($('fBrand').options).map(o=>o.value),...(settings.customBrands||[]),...records.map(r=>r.brand),...templates.map(t=>t.brand)].filter(Boolean))];
  const brandMark=name=>{const lower=name.toLowerCase();let mark='☕',color='#806248';if(/星巴克|starbucks/.test(lower)){mark='STAR<br>BUCKS';color='#146d4e'}else if(/瑞幸|luckin/.test(lower)){mark='luckin';color='#253e77'}else if(/manner/.test(lower)){mark='MANNER';color='#736150'}else if(/costa/.test(lower)){mark='COSTA';color='#8e293d'}else if(/arabica/.test(lower)){mark='%';color='#272523'}else if(/tims/.test(lower)){mark='Tims';color='#b9332b'}else mark=esc(name.slice(0,3));return `<span class="u-brand-mark" style="--brand:${color}">${mark}</span>`};
  function ensureBrand(name){if(name&&!Array.from($('fBrand').options).some(o=>o.value===name))$('fBrand').add(new Option(name,name))}
  function ensureBrands(){brandNames().forEach(ensureBrand)}
  function formSetup(){
    const sheet=$('addModal').querySelector('.sheet'),fields={};
    for(const id of ['fProductName','fType','fTemp','fSize','fShots','fPrice','fCaf','fCal','fBrand','fStore','fDate','fTime','fScene','fNote'])fields[id]=$(id).closest('.field');
    const parts={photo:$('photoBox'),photoActions:sheet.querySelector('.photo-actions'),recognition:$('recognition'),presets:$('presets'),template:sheet.querySelector('.template-save-btn'),whatIf:$('whatIf'),pro:$('proFields'),rating:$('rating').closest('.field')};
    const modalTitle=$('modalTitle'),modalSub=$('modalSub'),saveText=$('saveBtnText');
    sheet.replaceChildren();sheet.classList.add('u-add-sheet');
    sheet.innerHTML=`<div class="u-form-head"><button class="u-close" onclick="closeAdd()" aria-label="关闭记录表单">×</button><div id="uTitleSlot"></div><button class="u-save" id="uSave" onclick="saveRecord()"></button></div><div class="u-form-body"><div id="uModalSubSlot" hidden></div><div class="u-form-section"><h3>喝了什么？</h3><div id="uDrinkChoices" class="u-choices"></div></div><div class="u-form-section"><h3>品牌</h3><div id="uBrandChoices" class="u-choices"></div></div><div class="u-form-section"><h3>杯型</h3><div id="uCupChoices" class="u-choices"></div><div class="u-form-caption" id="uSizeCaption"></div></div><div class="u-form-section u-optional"><h3>添加信息 <span>（可选）</span></h3><div id="uBasicFields"></div></div><details class="u-details" id="uPhotoDetails"><summary>${icon('camera')}照片、订单与杯贴 ${arrow()}</summary><div id="uPhotoSlot"></div></details><details class="u-details" id="uExtraDetails"><summary>${icon('note')}日期、口味与更多信息 ${arrow()}</summary><div class="formgrid" id="uExtraFields"></div><div id="uExtraSlots"></div></details><div id="uWhatIfSlot"></div><div class="u-form-foot">每一杯，都值得被记住。</div></div>`;
    $('uTitleSlot').append(modalTitle);$('uModalSubSlot').append(modalSub);$('uSave').append(saveText);
    for(const id of ['fCaf','fPrice','fNote','fProductName'])$('uBasicFields').append(fields[id]);
    for(const id of ['fType','fBrand','fSize','fDate','fTime','fTemp','fShots','fCal','fStore','fScene'])$('uExtraFields').append(fields[id]);
    fields.fCaf.classList.add('u-caf-field');fields.fNote.classList.add('u-note-field');fields.fProductName.classList.add('u-product-field');
    fields.fPrice.querySelector('label').textContent='花费';fields.fCaf.querySelector('label').textContent='咖啡因含量';fields.fProductName.querySelector('label').textContent='饮品名称';
    $('fNote').placeholder='例如：少冰 / 少糖 / 风味';$('fNote').rows=1;
    $('uPhotoSlot').append(parts.photoActions,parts.photo,parts.recognition);
    $('uExtraSlots').append(parts.presets,parts.template,parts.rating,parts.pro);$('uWhatIfSlot').append(parts.whatIf);
    for(const id of ['fSize','fShots','fCaf','fCal','fPrice'])$(id).min=0;
    $('fSize').min=1;
    for(const name of settings.customBrands||[])ensureBrand(name);
    sheet.addEventListener('change',syncForm);sheet.addEventListener('input',e=>{if(['fSize','fBrand','fType'].includes(e.target.id))syncForm()});
    $('fCamera').addEventListener('change',()=>{$('uPhotoDetails').open=true});$('fGallery').addEventListener('change',()=>{$('uPhotoDetails').open=true});
  }
  function syncForm(){
    if(!$('uDrinkChoices'))return;
    const type=$('fType').value,brand=$('fBrand').value,size=Number($('fSize').value);
    $('uDrinkChoices').innerHTML=['拿铁','美式','冷萃'].map(t=>`<button class="u-choice ${type===t?'selected':''}" aria-pressed="${type===t}" onclick="UI.chooseType(${arg(t)})">${art('drink_'+drinkId(t))}<span>${t}</span></button>`).join('')+`<button class="u-choice ${!['拿铁','美式','冷萃'].includes(type)?'selected':''}" onclick="UI.picker('type')">${icon('more')}<span>${!['拿铁','美式','冷萃'].includes(type)?esc(type):'其他'}</span></button>`;
    const choices=['星巴克','瑞幸咖啡','Manner'];
    $('uBrandChoices').innerHTML=choices.map((b,i)=>`<button class="u-choice ${brand===b?'selected':''}" aria-pressed="${brand===b}" onclick="UI.chooseBrand(${arg(b)})">${brandMark(b)}<span>${['Starbucks','瑞幸','Manner'][i]}</span></button>`).join('')+`<button class="u-choice ${brand&&!choices.includes(brand)?'selected':''}" onclick="UI.picker('brand')">${icon('more')}<span>${brand&&!choices.includes(brand)?esc(brand):'其他'}</span></button>`;
    $('uCupChoices').innerHTML=[[250,'small','小杯'],[350,'medium','中杯'],[450,'large','大杯'],[600,'extra_large','超大杯']].map(([ml,id,label])=>`<button class="u-choice ${size===ml?'selected':''}" aria-pressed="${size===ml}" onclick="UI.chooseSize(${ml})">${art('cup_'+id)}<span>${label}</span></button>`).join('');
    $('uSizeCaption').textContent=`${size||0} ml · ${dateLabel($('fDate').value||localKey(new Date()))} ${$('fTime').value}`;
  }
  function chooseType(type){$('fType').value=type;$('fType').onchange();syncForm();closeOverlay('uPicker')}
  function chooseBrand(name){ensureBrand(name);$('fBrand').value=name;recalcEstimate();syncForm();closeOverlay('uPicker')}
  function chooseSize(size){$('fSize').value=size;recalcEstimate();syncForm()}
  function picker(kind){pickerKind=kind;overlay('uPicker',kind==='brand'?'选择品牌':'选择饮品',`<div class="u-picker-body"><div class="u-search"><input id="uPickerSearch" placeholder="${kind==='brand'?'搜索品牌':'搜索饮品'}" oninput="UI.filterPicker()" aria-label="搜索"></div><div class="u-picker-grid" id="uPickerGrid"></div>${kind==='brand'?`<form class="u-custom-brand" onsubmit="event.preventDefault();UI.addBrand()"><label for="uNewBrand">自定义品牌</label><div><input id="uNewBrand" maxlength="40" placeholder="输入品牌名称"><button type="submit">＋ 添加</button></div></form>`:''}</div>`);filterPicker()}
  function filterPicker(){const q=$('uPickerSearch').value.trim().toLowerCase(),values=(pickerKind==='brand'?brandNames():Object.keys(CATALOG)).filter(x=>x.toLowerCase().includes(q));$('uPickerGrid').innerHTML=values.map(name=>`<button class="u-choice" onclick="UI.${pickerKind==='brand'?'chooseBrand':'chooseType'}(${arg(name)})">${pickerKind==='brand'?brandMark(name):art('drink_'+drinkId(name))}<span>${esc(name)}</span></button>`).join('')||'<p class="muted">没有找到，试试其他关键词。</p>'}
  function addBrand(){const name=$('uNewBrand').value.trim();if(!name)return $('uNewBrand').focus();settings.customBrands=[...new Set([...(settings.customBrands||[]),name])];persist();chooseBrand(name)}

  // Reports, calendar and achievement functions follow below.
  return {path,art,icon,arg,section,metric,arrow,dateLabel,noteFor,legacy,today,entries,overlay,closeOverlay,go,recordMenu,formSetup,syncForm,chooseType,chooseBrand,chooseSize,picker,filterPicker,addBrand,ensureBrands,
    get reportTab(){return reportTab},set reportTab(value){reportTab=value},get dayKey(){return dayKey},set dayKey(value){dayKey=value},get saving(){return saving},set saving(value){saving=value}};
})();

Object.assign(UI, (()=>{
  const {art,icon,arg,section,metric,arrow,dateLabel}=UI;
  const palette=['#754831','#a67555','#d3a17c','#ddc9b5','#98a186','#b18c73'];
  const countBy=(rs,key)=>{const counts={};rs.forEach(r=>{const value=String(r[key]||'未填写');counts[value]=(counts[value]||0)+1});return Object.entries(counts).sort((a,b)=>b[1]-a[1])};
  function monthNav(){const ref=monthRef();return `<div class="u-month-nav"><button onclick="UI.month(-1)" aria-label="上个月">${arrow(true)}</button><h1>${ref.getFullYear()} 年 ${ref.getMonth()+1} 月</h1><button onclick="UI.month(1)" aria-label="下个月" ${analysisMonthOffset>=0?'disabled':''}>${arrow()}</button></div>`}
  function month(delta){analysisMonthOffset=Math.min(0,analysisMonthOffset+delta);selectedAnalysisDay='';renderAnalysis()}
  function tab(value){UI.reportTab=value;renderAnalysis()}
  function dailyChart(rs,ref){
    const days=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate(),values=Array.from({length:days},(_,i)=>sum(rs.filter(r=>new Date(r.ts).getDate()===i+1),'caffeine')),limit=Math.max(1,Number(settings.dailyLimit)||400),max=Math.ceil(Math.max(limit,...values,100)/100)*100;
    const W=326,H=157,left=26,bottom=135,plotH=108,step=(W-left-4)/days,y=v=>bottom-v/max*plotH;
    const lines=[0,max/2,max].map(v=>`<line x1="${left}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#ece2d6"/><text x="1" y="${y(v)+3}">${Math.round(v)}</text>`).join('');
    return `<div class="u-card u-daily-chart"><div class="u-chart-title"><h3>每日摄入 <small>（mg）</small></h3><span><i></i>咖啡因 <em></em>日上限</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ref.getMonth()+1}月每日咖啡因摄入，日上限${limit}毫克">${lines}<line x1="${left}" x2="${W}" y1="${y(limit)}" y2="${y(limit)}" stroke="#cda17b" stroke-dasharray="3 3"/>${values.map((v,i)=>`<rect x="${left+i*step+step*.15}" y="${y(v)}" width="${step*.56}" height="${v?Math.max(1,bottom-y(v)):0}" rx="1.7" fill="${v>limit?'#b16143':i%3===1?'#c99b79':'#926248'}"><title>${i+1}日：${Math.round(v)} mg</title></rect>${[0,7,14,21,days-1].includes(i)?`<text x="${left+i*step}" y="154" text-anchor="${i===days-1?'end':'start'}">${ref.getMonth()+1}/${i+1}</text>`:''}`).join('')}</svg>${rs.length?'':'<p class="u-chart-empty">记录第一杯后，这里会显示摄入趋势。</p>'}</div>`;
  }
  function calendar(ref){const year=ref.getFullYear(),mon=ref.getMonth(),offset=(new Date(year,mon,1).getDay()+6)%7,days=new Date(year,mon+1,0).getDate(),todayKey=localKey(new Date());let cells='<span></span>'.repeat(offset);for(let n=1;n<=days;n++){const key=localKey(new Date(year,mon,n)),rs=dayRecords(key),over=sum(rs,'caffeine')>settings.dailyLimit;cells+=`<button class="u-calendar-day ${key===todayKey?'is-today':''}" aria-label="${mon+1}月${n}日，${rs.length}杯${over?'，超过日上限':''}" onclick="UI.openDay('${key}')"><span>${n}</span>${rs.length?art(over||rs.length>3?'stamp_over':'stamp_'+rs.length):''}</button>`}return section('咖啡月历','<span>点击日期查看记录</span>')+`<div class="u-card u-calendar"><div class="u-weekdays">${'一二三四五六日'.split('').map(x=>`<span>${x}</span>`).join('')}</div><div class="u-calendar-grid">${cells}</div></div>`}
  function distribution(rs,key,title){
    const groups=countBy(rs,key),total=rs.length;let position=0;
    const shown=groups.length>5?[...groups.slice(0,4),['其他',groups.slice(4).reduce((s,x)=>s+x[1],0)]]:groups;
    const stops=shown.map(([_,count],i)=>{const start=position;position+=count/(total||1)*100;return `${palette[i]} ${start}% ${position}%`}).join(',');
    return `<div class="u-card u-distribution"><h3>${title}</h3>${total?`<div class="u-donut-row"><div class="u-donut" style="background:conic-gradient(${stops})" role="img" aria-label="${esc(shown.map(([n,c])=>n+' '+c+'杯').join('，'))}"><span><b>${total}</b><small>杯</small></span></div><div class="u-legend">${shown.map(([name,count],i)=>`<div><i style="background:${palette[i]}"></i><span>${esc(name)}</span><b>${Math.round(count/total*100)}%</b></div>`).join('')}</div></div>`:'<div class="u-empty compact">记录之后，慢慢发现你的偏好。</div>'}</div>`;
  }
  function timeChart(rs){const buckets=[['0–6',0,6],['6–9',6,9],['9–12',9,12],['12–15',12,15],['15–18',15,18],['18–21',18,21],['21–24',21,24]],counts=buckets.map(([_,a,b])=>rs.filter(r=>{const h=new Date(r.ts).getHours();return h>=a&&h<b}).length),max=Math.max(1,...counts);return `<div class="u-card"><h3>咖啡饮用时段分布</h3><div class="u-time-chart">${buckets.map(([label],i)=>`<div><span>${counts[i]}</span><i style="height:${counts[i]/max*118}px"></i><small>${label}</small></div>`).join('')}</div></div>`}
  function analysis(){
    const ref=monthRef(),rs=monthRecords(ref),days=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate(),elapsed=analysisMonthOffset===0?new Date().getDate():days,prev=monthRecords(new Date(ref.getFullYear(),ref.getMonth()-1,1)).filter(r=>new Date(r.ts).getDate()<=elapsed),delta=rs.length-prev.length;
    const stats=`<div class="u-month-stats"><div><span>本月喝了</span><b>${rs.length}</b><small>杯 · ${delta===0?'与上月'+(analysisMonthOffset===0?'同期':'')+'持平':`比上月${analysisMonthOffset===0?'同期':''}${delta>0?'多':'少'} ${Math.abs(delta)} 杯 ${delta>0?'↗':'↘'}`}</small></div><div><span>平均每天</span><b>${(rs.length/Math.max(1,elapsed)).toFixed(1)}</b><small>杯</small></div><div><span>咖啡因总量</span><b>${Math.round(sum(rs,'caffeine'))}</b><small>mg</small></div><div><span>本月花费</span><b>${money(sum(rs,'price'))}</b><small>${uniqueDays(rs).length} 天有记录</small></div></div>`;
    let content='';
    if(UI.reportTab==='overview')content=stats+dailyChart(rs,ref)+calendar(ref)+`<button class="u-achievement-teaser" onclick="UI.achievements()">${art('achievement_first_cup')}<span><b>我的成就</b><small>把每一杯，收集成小小勋章</small></span>${arrow()}</button><details class="u-details"><summary>咖啡故事与更多洞察 ${arrow()}</summary>${monthlyStoryHtml(rs,ref)}${coffeeProfileHtml()}${storeStatsHtml()}${passportHtml()}</details>`;
    else if(UI.reportTab==='type')content=distribution(rs,'type','品类分布')+`<div class="u-card"><h3>这个月的口味</h3>${rankHtml(Object.fromEntries(countBy(rs,'type')),n=>n+' 杯')}</div>`;
    else if(UI.reportTab==='brand')content=distribution(rs,'brand','品牌分布')+`<div class="u-card"><h3>最常去的品牌</h3>${rankHtml(Object.fromEntries(countBy(rs,'brand')),n=>n+' 杯')}</div>`+storeStatsHtml();
    else content=timeChart(rs)+distribution(rs,'type','品类分布')+`<div class="u-card u-report-note">${art('character_monthly')}<p>这些图表来自你在本月留下的记录。<br>慢慢找到自己的咖啡节奏。</p></div>`;
    $('analysisContent').innerHTML=monthNav()+`<div class="u-report-tabs" role="tablist" aria-label="月报维度">${[['overview','总览'],['type','品类'],['brand','品牌'],['time','时间']].map(([id,name])=>`<button role="tab" aria-selected="${UI.reportTab===id}" class="${UI.reportTab===id?'active':''}" onclick="UI.tab('${id}')">${name}</button>`).join('')}</div>`+content;
    if(UI.dayKey&&$('uDay'))renderDay();
    if($('uAchievements'))renderAchievements();
  }
  function openDay(key){UI.dayKey=key;selectedAnalysisDay=key;UI.overlay('uDay','日历详情','<div id="uDayContent"></div>','u-full-overlay');renderDay()}
  function renderDay(){const key=UI.dayKey,d=new Date(key+'T12:00:00'),rs=dayRecords(key).sort((a,b)=>a.ts-b.ts),week=Array.from({length:7},(_,i)=>{const n=new Date(d);n.setDate(n.getDate()+i-3);return n});$('uDayContent').innerHTML=`<div class="u-month-nav"><button onclick="UI.shiftDay(-7)" aria-label="前七天">${arrow(true)}</button><h2>${d.getFullYear()} 年 ${d.getMonth()+1} 月</h2><button onclick="UI.shiftDay(7)" aria-label="后七天">${arrow()}</button></div><div class="u-day-strip">${week.map(n=>`<button class="${localKey(n)===key?'selected':''}" onclick="UI.selectDay('${localKey(n)}')"><span>${'日一二三四五六'[n.getDay()]}</span><b>${n.getDate()}</b></button>`).join('')}</div><div class="u-day-title"><h2>${dateLabel(key)}</h2><span>共 ${rs.length} 杯 · ${Math.round(sum(rs,'caffeine'))} mg</span></div><div class="u-timeline">${rs.length?rs.map(r=>`<div class="u-timeline-item"><time>${pad(new Date(r.ts).getHours())}:${pad(new Date(r.ts).getMinutes())}</time>${entriesHtml([r],true)}</div>`).join(''):`<div class="u-empty">${art('empty_first_record')}<b>这一天还没有记录</b><span>补记一杯，也能留下回忆。</span></div>`}</div><button class="u-day-add" onclick="UI.addOnDay('${key}')">＋ 记录一杯</button><div class="u-metrics">${metric('cups',rs.length,'杯数')}${metric('calories',Math.round(sum(rs,'calories')),'kcal')}${metric('cost',money(sum(rs,'price')),'花费')}${metric('caffeine',Math.round(sum(rs,'caffeine')),'咖啡因 mg')}</div><div class="u-day-note"><label for="uDayNote">这一天的小记</label><textarea id="uDayNote" placeholder="添加备注…" maxlength="2000" onchange="UI.saveDayNote()">${esc(UI.noteFor(key))}</textarea><button onclick="UI.saveDayNote()">保存备注 ${icon('edit')}</button></div><details class="u-details"><summary>这一天的咖啡因曲线 ${arrow()}</summary>${metabolismReportHtml(rs,key)}</details>`;hydratePhotos($('uDayContent'))}
  function selectDay(key){if($('uDayNote'))saveDayNote(false);UI.dayKey=key;selectedAnalysisDay=key;renderDay()}
  function shiftDay(delta){const d=new Date(UI.dayKey+'T12:00:00');d.setDate(d.getDate()+delta);selectDay(localKey(d))}
  function saveDayNote(show=true){if(!$('uDayNote')||!UI.dayKey)return;settings.dayNotes={...(settings.dayNotes||{}),[UI.dayKey]:$('uDayNote').value.trim()};persist();if(show)notify('当日备注已保存')}
  function addOnDay(key){openAdd();$('fDate').value=key;renderWhatIf();UI.syncForm()}

  function achievementList(){
    const rs=records.slice().sort((a,b)=>a.ts-b.ts),days=new Map(),months=new Map(),types=new Set(),brands=new Set();let bestStreak=0,streak=0,lastDay='',photos=0;
    const defs=[
      ['first','第一杯到位','记录第一杯咖啡','first_cup',s=>s.n>=1],
      ['week','连续记录 7 天','连续 7 天留下咖啡记录','week',s=>s.streak>=7],
      ['month','月报达人','单月累计记录 20 天','month',s=>s.monthDays>=20],
      ['expert','咖啡因达人','尝试 5 种咖啡','expert',s=>s.types>=5],
      ['night','夜猫记录者','记录一杯 20 点后的咖啡','night',s=>s.hour>=20],
      ['morning','早起打卡','记录一杯 9 点前的咖啡','morning',s=>s.hour<9],
      ['streak30','连续 30 天','连续 30 天留下咖啡记录','week',s=>s.streak>=30],
      ['cups10','十杯小记','累计记录 10 杯','cups10',s=>s.n>=10],
      ['cups30','三十杯回忆','累计记录 30 杯','cups30',s=>s.n>=30],
      ['cups50','五十杯收藏','累计记录 50 杯','expert',s=>s.n>=50],
      ['cups100','百杯纪念','累计记录 100 杯','month',s=>s.n>=100],
      ['cups365','365 杯故事','累计记录 365 杯','month',s=>s.n>=365],
      ['types3','口味探索','尝试 3 种咖啡','expert',s=>s.types>=3],
      ['types8','风味收藏家','尝试 8 种咖啡','expert',s=>s.types>=8],
      ['brands3','品牌漫游','记录 3 个品牌','morning',s=>s.brands>=3],
      ['brands5','城市咖啡地图','记录 5 个品牌','morning',s=>s.brands>=5],
      ['photo1','第一张照片','用照片记下一杯','photo1',s=>s.photos>=1],
      ['photo10','照片日记','累计 10 条带照片的记录','photo10',s=>s.photos>=10],
      ['pour','手冲时光','记录一杯手冲','expert',s=>s.type==='手冲'],
      ['cold','冷萃初体验','记录一杯冷萃','expert',s=>s.type==='冷萃'],
      ['decaf','轻松一杯','记录一杯低因咖啡','night',s=>s.type==='低因咖啡'],
      ['latte','奶咖时刻','记录一杯拿铁','week',s=>s.type==='拿铁'],
      ['months6','半年咖啡故事','在 6 个不同月份留下记录','month',s=>s.months>=6],
      ['months12','四季相伴','在 12 个不同月份留下记录','month',s=>s.months>=12]
    ].map(([id,title,desc,badge,test])=>({id,title,desc,badge,test,at:null}));
    rs.forEach((r,i)=>{const d=new Date(r.ts),key=localKey(d),mon=key.slice(0,7);if(key!==lastDay){const prev=new Date(d);prev.setDate(prev.getDate()-1);streak=localKey(prev)===lastDay?streak+1:1;bestStreak=Math.max(bestStreak,streak);lastDay=key}days.set(key,true);if(!months.has(mon))months.set(mon,new Set());months.get(mon).add(key);types.add(r.type);if(r.brand)brands.add(r.brand);if(r.photoId||r.photoPreview||r.nativePhotoPath)photos++;const s={n:i+1,streak:bestStreak,monthDays:months.get(mon).size,types:types.size,brands:brands.size,photos,type:r.type,hour:d.getHours(),months:months.size};defs.forEach(a=>{if(!a.at&&a.test(s))a.at=r.ts})});return defs;
  }
  function achievements(){UI.overlay('uAchievements','我的成就','<div id="uAchievementContent"></div>');renderAchievements()}
  function renderAchievements(){const defs=achievementList();$('uAchievementContent').innerHTML=`<div class="u-achievement-intro">${art(defs.some(a=>a.at)?'character_goal':'character_first_cup','',true)}<div><b>把日常，收集成光。</b><span>已解锁 ${defs.filter(a=>a.at).length} / ${defs.length}</span></div></div><div class="u-achievement-grid">${defs.map(a=>`<button class="u-badge ${a.at?'unlocked':'locked'}" onclick="UI.achievementDetail('${a.id}')">${art('achievement_'+a.badge)}<b>${a.title}</b><span>${a.at?localKey(new Date(a.at)).replaceAll('-','.'):'尚未解锁'}</span></button>`).join('')}</div>`}
  function achievementDetail(id){const a=achievementList().find(x=>x.id===id);if(!a)return;UI.overlay('uBadgeDetail',a.title,`<div class="u-badge-detail ${a.at?'':'locked'}">${art('achievement_'+a.badge)}<h3>${a.title}</h3><p>${a.desc}</p><span>${a.at?'解锁于 '+dateLabel(localKey(new Date(a.at))):'慢慢记录，等待点亮。'}</span></div>`,'u-small-overlay')}
  return {analysis,month,tab,dailyChart,distribution,timeChart,openDay,renderDay,selectDay,shiftDay,saveDayNote,addOnDay,achievementList,achievements,renderAchievements,achievementDetail};
})());

// Keep the established fields and their listeners; replace only presentation.
UI.formSetup();
renderToday=UI.today;
entriesHtml=UI.entries;
renderAnalysis=UI.analysis;
openAdd=function(){UI.ensureBrands();UI.legacy.openAdd();$('modalTitle').textContent='记录一杯';$('saveBtnText').textContent='保存';$('uPhotoDetails').open=false;$('uExtraDetails').open=false;$('addModal').querySelector('.sheet').scrollTop=0;document.body.classList.add('u-modal-open');UI.syncForm()};
editRecord=async function(id){const r=records.find(x=>x.id===id);if(r?.brand)UI.chooseBrand(r.brand);await UI.legacy.editRecord(id);$('modalTitle').textContent='编辑这杯';$('saveBtnText').textContent='保存';$('uPhotoDetails').open=!!(r?.photoId||r?.photoPreview||r?.nativePhotoPath||r?.sourceId);UI.syncForm()};
closeAdd=function(){UI.legacy.closeAdd();if(!document.querySelector('.u-overlay'))document.body.classList.remove('u-modal-open')};
applyCatalog=function(...args){UI.legacy.applyCatalog(...args);UI.syncForm()};
renderWhatIf=function(){UI.legacy.renderWhatIf();UI.syncForm()};
saveRecord=async function(){if(UI.saving)return;const ts=new Date($('fDate').value+'T'+($('fTime').value||'12:00')+':00').getTime();if(!Number.isFinite(ts))return notify('请填写有效的日期和时间',true);for(const id of ['fSize','fShots','fCaf','fCal','fPrice']){if(!$(id).checkValidity()){ $('uExtraDetails').open=true;$(id).reportValidity();return }}UI.saving=true;$('uSave').disabled=true;try{await UI.legacy.saveRecord()}finally{UI.saving=false;$('uSave').disabled=false}};
renderSettings=function(){UI.legacy.renderSettings();$('settingsContent').insertAdjacentHTML('afterbegin',`<button class="u-achievement-teaser" onclick="UI.achievements()">${UI.art('achievement_month')}<span><b>我的成就</b><small>每一杯，都有自己的纪念</small></span>${UI.arrow()}</button>`);$('settingsContent').querySelector('.about span').textContent='Beanster Sips · V18.3.1'};
renderPhotos=async function(){await UI.legacy.renderPhotos();if(!records.some(r=>r.photoId||r.photoPreview||r.nativePhotoPath))$('photoContent').innerHTML=`<div class="u-empty u-photo-empty">${UI.art('empty_no_coffee')}<b>把咖啡时光，留在这里。</b><span>记录时添加照片，慢慢积攒你的咖啡相册。</span><button class="primary" onclick="openSmartAdd('camera')">${UI.icon('camera')}拍下第一杯</button></div>`};
const oldSmartAdd=openSmartAdd;
openSmartAdd=function(which){oldSmartAdd(which);$('uPhotoDetails').open=true};
document.body.dataset.page='today';
document.querySelectorAll('.nav button').forEach(button=>button.addEventListener('click',()=>{document.body.dataset.page=button.dataset.page}));
document.addEventListener('keydown',e=>{
  const dialogs=[...document.querySelectorAll('.u-overlay')],dialog=dialogs.at(-1),formOpen=$('addModal').classList.contains('show'),legacyDialog=[...document.querySelectorAll('.import-preview-backdrop,.data-report-backdrop')].at(-1);
  const top=legacyDialog||($('photoViewer').classList.contains('show')?$('photoViewer'):formOpen&&!['uPicker','uActions','uBadgeDetail'].includes(dialog?.id)?$('addModal'):dialog);
  if(e.key==='Escape'){if(top?.id==='photoViewer')closePhotoViewer();else if(top?.id==='orderPasteBackdrop')closeOrderPaste();else if(top?.id==='importPreview')closeImportPreview();else if(top?.id==='addModal')closeAdd();else if(top?.classList.contains('u-overlay'))UI.closeOverlay(top.id)}
  if(e.key==='Tab'&&top){const nodes=[...top.querySelectorAll('button:not(:disabled),input,textarea,select,a[href]')].filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
});
renderAll();
