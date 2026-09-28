/* Single vacuum cleanup FSM. Production, preview, and inspect all read this. */
window.CleanupMotion=(function(){
  const MAX_VISIBLE=4;
  const DEFAULTS={lookMs:350,pressMs:300,holdMs:250,releaseMs:250,openingMs:450,openHoldMs:300,cupMs:650,staggerMs:250,waitCloseMs:300,closingMs:450,closedHoldMs:350,archiveFlashMs:700};
  function clamp01(t){return t<=0?0:t>=1?1:t}
  function ease(t){t=clamp01(t);return t*t*(3-2*t)}
  function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
  function timing(M){
    const src=(M.scene&&M.scene.cleanup&&M.scene.cleanup.timing)||{};
    const out={};
    for(const k in DEFAULTS){const n=Number(src[k]);out[k]=Number.isFinite(n)&&n>=0?n:DEFAULTS[k]}
    return out;
  }
  function boxPose(M){
    const b=(M.scene&&M.scene.storageBox)||{position:[560,955],scale:.38};
    return {x:b.position[0],y:b.position[1],scale:b.scale};
  }
  function boxPivot(M){
    const a=M.assets.box_closed||M.assets.box_body||{pivotX:256,pivotY:472};
    return {x:a.pivotX,y:a.pivotY};
  }
  function boxOrigin(M){
    const pose=boxPose(M),piv=boxPivot(M);
    return {x:pose.x-piv.x*pose.scale,y:pose.y-piv.y*pose.scale,scale:pose.scale,pose,piv};
  }
  function receiveAnchor(M){
    return (M.box&&M.box.receiveAnchor)||M.assets.box_body&&M.assets.box_body.receiveAnchor||[256,358];
  }
  function mouth(M){
    const pose=boxPose(M),piv=boxPivot(M),rec=receiveAnchor(M);
    return [pose.x+(rec[0]-piv.x)*pose.scale,pose.y+(rec[1]-piv.y)*pose.scale];
  }
  function drop(M){
    const pose=boxPose(M),piv=boxPivot(M),rec=receiveAnchor(M);
    return [pose.x+(rec[0]-piv.x)*pose.scale,pose.y+(rec[1]+42-piv.y)*pose.scale];
  }
  function tablePose(M){
    const t=(M.scene&&M.scene.table)||{position:[384,830],scale:.66};
    return {x:t.position[0],y:t.position[1],scale:t.scale};
  }
  function tableCup(M,i,n){
    const vis=Math.min(MAX_VISIBLE,Math.max(1,n||1));
    const slots=M.table.slots[String(vis)];
    const s=slots[Math.max(0,Math.min(i,slots.length-1))];
    const t=tablePose(M);
    const back=M.assets.table_back||{pivotX:512,pivotY:280};
    return [t.x+(s[0]-back.pivotX)*t.scale,t.y+(s[1]-back.pivotY)*t.scale];
  }
  function visibleRows(rows){return (rows||[]).slice(0,MAX_VISIBLE)}
  function hiddenCount(rows){return Math.max(0,(rows||[]).length-MAX_VISIBLE)}
  function hasAsset(M,id){return !!(M.assets&&M.assets[id])}
  function schedule(M,rows){
    const T=timing(M);
    const all=rows||[];
    const visible=visibleRows(all);
    const n=visible.length;
    const total=all.length;
    const pressAt=T.lookMs;
    const releaseAt=pressAt+T.pressMs+(T.holdMs||0);
    const openingAt=releaseAt+T.releaseMs;
    const openAt=openingAt+T.openingMs;
    const firstCupAt=openAt+T.openHoldMs;
    const cupStarts=[];
    for(let i=0;i<n;i++)cupStarts.push(firstCupAt+i*T.staggerMs);
    const lastCupEnd=n?cupStarts[n-1]+T.cupMs:firstCupAt;
    const closingAt=lastCupEnd+T.waitCloseMs;
    const closedAt=closingAt+T.closingMs;
    const reactionAt=closedAt+T.closedHoldMs;
    return {n,total,visible,hidden:hiddenCount(all),pressAt,releaseAt,openingAt,openAt,firstCupAt,cupStarts,lastCupEnd,closingAt,closedAt,reactionAt,cupMs:T.cupMs,openingMs:T.openingMs,closingMs:T.closingMs,pressMs:T.pressMs,lookMs:T.lookMs,archiveFlashMs:T.archiveFlashMs};
  }
  function boxPhase(elapsed,sched){
    if(elapsed<sched.openingAt)return 'closed';
    if(elapsed<sched.openAt)return 'opening';
    if(elapsed<sched.firstCupAt)return 'open';
    if(sched.n&&elapsed<sched.lastCupEnd)return 'receiving';
    if(elapsed<sched.closingAt)return 'wait_before_close';
    if(elapsed<sched.closedAt)return 'closing';
    return 'closed';
  }
  function boxStateKey(phase,elapsed,sched){
    if(phase==='opening'){
      const u=(elapsed-sched.openingAt)/Math.max(1,sched.openAt-sched.openingAt);
      return u<.5?'opening':'open';
    }
    if(phase==='wait_before_close')return 'open';
    if(phase==='closing'){
      const u=(elapsed-sched.closingAt)/Math.max(1,sched.closedAt-sched.closingAt);
      if(u<.22)return 'open';
      if(u<.5)return 'close';
      if(u<.8)return 'close_almost';
      return 'closed';
    }
    if(phase==='receiving')return 'receiving';
    if(phase==='open')return 'open';
    return 'closed';
  }
  function boxLayers(M,phase,elapsed,sched){
    const states=(M.box&&M.box.states)||{};
    const key=boxStateKey(phase,elapsed,sched);
    if(key==='close_almost'&&!(states.close_almost||[]).length) return states.close||['box_lid_opening','box_body','box_front'];
    return states[key]||(key==='closed'?['box_closed']:['box_lid','box_body','liveCup','box_front']);
  }
  function hamster(elapsed,sched,M){
    const c=(M.scene&&M.scene.cleanup)||{};
    const look=c.look||'hamster_look_button';
    const press=c.press||'hamster_press';
    const watch=c.watch||'hamster_watch';
    if(elapsed<sched.pressAt)return {id:hasAsset(M,look)?look:'hamster_idle_base',pressed:false,looking:true,watching:false};
    if(elapsed<sched.releaseAt)return {id:hasAsset(M,press)?press:'hamster_press',pressed:true,looking:false,watching:false};
    if(elapsed<sched.reactionAt)return {id:hasAsset(M,watch)?watch:'hamster_idle_base',pressed:false,looking:false,watching:true};
    return {id:'hamster_idle_base',pressed:false,looking:false,watching:false};
  }
  function cupMotion(elapsed,origin,i,sched,mouthPos,dropPos){
    if(i>=sched.n)return {p:origin,s:.4,t:0,gone:true,flying:false,hidden:true};
    const start=sched.cupStarts[i];
    if(elapsed<start)return {p:origin,s:.4,t:0,gone:false,flying:false};
    const t=ease((elapsed-start)/sched.cupMs);
    const mid=[origin[0]+(mouthPos[0]-origin[0])*.45,origin[1]+(mouthPos[1]-origin[1])*.4];
    let p;
    if(t<.7){
      const u=t/.7;
      p=u<.5?mix(origin,mid,u*2):mix(mid,mouthPos,(u-.5)*2);
    }else p=mix(mouthPos,dropPos,(t-.7)/.3);
    const s=t<.7?.4:.4*(1-(t-.7)/.3*.2);
    return {p,s,t,gone:t>=1,flying:t>0&&t<1};
  }
  function reactionName(M,rows){
    const total=Array.isArray(rows)?rows.length:Number(rows)||0;
    const map=(M.scene&&M.scene.cleanup&&M.scene.cleanup.ending)||{};
    if(total<=0)return map['0']||map.empty||'question';
    if(map[String(total)])return map[String(total)];
    if(total>=4)return map['4']||'wipe';
    return map['1']||map['2']||map['3']||'clap';
  }
  function reactionMs(M,rows){
    const a=M.animations&&M.animations[reactionName(M,rows)];
    if(!a)return 320;
    if(Array.isArray(a.durationsMs)&&a.durationsMs.length===a.frames.length)return a.durationsMs.reduce((sum,n)=>sum+n,0);
    return Math.round(a.frames.length/a.fps*1000);
  }
  function totalMs(M,rows){
    const s=schedule(M,rows);
    return s.reactionAt+reactionMs(M,rows);
  }
  function boxVisible(elapsed,sched){return elapsed>=sched.openingAt&&elapsed<sched.reactionAt}
  function snapshot(M,elapsed,rows,origins){
    const sched=schedule(M,rows);
    const phase=boxPhase(elapsed,sched);
    const mouthPos=mouth(M);
    const dropPos=drop(M);
    const cups=sched.visible.map((row,i)=>Object.assign({row,i},cupMotion(elapsed,origins[i]||mouthPos,i,sched,mouthPos,dropPos)));
    const flash=elapsed>=sched.closedAt&&elapsed<sched.closedAt+sched.archiveFlashMs&&sched.total>0;
    return {
      elapsed,sched,phase,
      stateKey:boxStateKey(phase,elapsed,sched),
      layers:boxLayers(M,phase,elapsed,sched),
      hamster:hamster(elapsed,sched,M),
      buttonDown:elapsed>=sched.pressAt&&elapsed<sched.releaseAt,
      swirl:phase==='receiving',
      pose:boxPose(M),
      mouth:mouthPos,
      cups,
      plusN:0,
      archiveFlash:flash,
      archiveText:flash?sched.total+' 杯已收藏':null,
      vacuumDone:elapsed>=sched.closedAt,
      react:elapsed>=sched.reactionAt
    };
  }
  return {MAX_VISIBLE,DEFAULTS,timing,boxPose,boxPivot,boxOrigin,mouth,drop,tablePose,tableCup,visibleRows,hiddenCount,schedule,boxPhase,boxStateKey,boxLayers,boxVisible,hamster,cupMotion,reactionName,reactionMs,totalMs,snapshot,ease,mix,clamp01};
})();
