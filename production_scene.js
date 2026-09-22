/* Layered coffee-room renderer. Coordinates come only from BEANSTER_ASSETS. */
if(!window.CleanupMotion){
window.CleanupMotion=(function(){
  const MAX_VISIBLE=4;
  const DEFAULTS={lookMs:120,pressMs:140,releaseMs:80,openingMs:200,openHoldMs:100,cupMs:460,staggerMs:200,waitCloseMs:100,closingMs:200,closedHoldMs:100,archiveFlashMs:700};
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
    const releaseAt=pressAt+T.pressMs;
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
    return a?Math.round(a.frames.length/a.fps*1000):320;
  }
  function totalMs(M,rows){
    const s=schedule(M,rows);
    return s.reactionAt+reactionMs(M,rows);
  }
  // Closed box appears with the lid opening and leaves after the closed hold.
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
}
const ProductionScene={
  images:{},ready:null,canvas:null,hamster:null,fx:null,paintRitual:null,mounted:new WeakSet(),bobTok:0,_bob:0,interactionState:'idle',
  M(){return window.BEANSTER_ASSETS},
  cupId(r){const n=String(r.productName||'')+' '+String(r.type||'')+' '+String(r.cup||'');return /抹茶/.test(n)?'cup_matcha':/生椰|轻椰|椰乳|椰拿铁/.test(n)?'cup_coconut_latte':/摩卡|巧克力/.test(n)?'cup_mocha':/澳白|馥芮白|flat white/i.test(n)?'cup_flat_white':/冷萃|冰美式/.test(n)?'cup_cold_brew':/手冲/.test(n)?'cup_pour_over':/卡布|cappuccino/i.test(n)?'cup_cappuccino':/dirty/i.test(n)?'cup_dirty':/浓缩|espresso/i.test(n)?'cup_espresso':/拿铁|latte/i.test(n)?'cup_latte':/美式|黑咖|americano/i.test(n)?'cup_americano':/外带|takeaway/i.test(n)?'cup_takeaway':r.cup&&String(r.cup).startsWith('cup_')?r.cup:'cup_latte'},
  night(){const h=new Date().getHours();return h<6||h>=20},
  sleepy(){const h=new Date().getHours();return h<6||h>=22},
  restId(){return 'hamster_idle_base'},
  load(){return this.ready||(this.ready=Promise.all(Object.entries(this.M().assets).map(([id,a])=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{this.images[id]=im;res()};im.onerror=()=>rej(Error(a.file));im.src='art/production-v2/'+a.file}))))},
  sprite(ctx,id,x,y,scale=1,alpha=1){const a=this.M().assets[id],im=this.images[id];if(!a||!im)return;ctx.imageSmoothingEnabled=false;const prev=ctx.globalAlpha;if(alpha<1)ctx.globalAlpha=prev*alpha;ctx.drawImage(im,x-a.pivotX*scale,y-a.pivotY*scale,a.canvas[0]*scale,a.canvas[1]*scale);ctx.globalAlpha=prev},
  spriteBox(ctx,id){const a=this.M().assets[id],im=this.images[id],o=CleanupMotion.boxOrigin(this.M());if(!a||!im)return;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,o.x,o.y,a.canvas[0]*o.scale,a.canvas[1]*o.scale)},
  drawTop(ctx,id,x,y,w){const a=this.M().assets[id];if(!a)return;this.sprite(ctx,id,x+a.pivotX*w/a.canvas[0],y+a.pivotY*w/a.canvas[0],w/a.canvas[0])},
  tableCup(i,n){return CleanupMotion.tableCup(this.M(),i,n)},
  hot(id){return this.M().assets[id]?.hot!==false&&!/cold_brew|coconut_latte|matcha|dirty/.test(id)},
  roomId(){const s=this.M().scene.room;return this.night()?(s&&s.night)||'scene_room_night':(s&&s.day)||'scene_room_day'},
  bakedRoom(){return !!this.M().assets[this.roomId()]},
  drawRoom(c){
    if(this.bakedRoom()){this.drawTop(c,this.roomId(),0,0,768);return}
    this.drawTop(c,'scene_background',0,0,768);this.drawTop(c,this.night()?'window_night':'window_day',35,140,285);this.drawTop(c,'lamp',350,40,125);this.drawTop(c,'plant',18,540,160);this.drawTop(c,'plant',610,530,130);
    if(this.M().assets.chalkboard)this.sprite(c,'chalkboard',118,790,.78);
  },
  drawSeat(c){const ch=this.M().scene.chair||{},x=ch.position?ch.position[0]:338,y=ch.position?ch.position[1]:702,s=ch.scale||.58;this.sprite(c,'chair',x,y,s)},
  tableWorld(){return CleanupMotion.tablePose(this.M())},
  btn(){const b=this.M().scene.button||{};return {x:b.position?b.position[0]:548,y:b.position?b.position[1]:778,scale:b.scale||.28,up:b.up||'btn_hamster_up',down:b.down||'btn_hamster_down'}},
  drawButton(c,pressed){const b=this.btn();this.sprite(c,pressed?b.down:b.up,b.x,b.y+(pressed?6:0),b.scale)},
  drawDressing(c){(this.M().scene.dressing||[]).forEach(p=>{if(this.M().assets[p.id])this.sprite(c,p.id,p.position[0],p.position[1],p.scale)})},
  signPose(){return {id:'entrance_normal',x:597,y:255,scale:.55}},
  signRect(){const p=this.signPose(),a=this.M().assets[p.id]||{pivotX:176,pivotY:56,canvas:[352,112]};const w=a.canvas[0]*p.scale,h=a.canvas[1]*p.scale;return {x:p.x-a.pivotX*p.scale,y:p.y-a.pivotY*p.scale,w,h}},
  drawSign(c,glow){const p=this.signPose();this.sprite(c,p.id,p.x,p.y,p.scale);c.save();c.fillStyle=glow?'#fff8dc':'#fff1cf';c.font='700 20px system-ui';c.textAlign='center';c.fillText('收藏室 →',p.x,p.y+7);c.restore()},
  drawIvy(c){if(!this.bakedRoom()&&this.M().assets.ivy_hanging)this.sprite(c,'ivy_hanging',640,8,.85)},
  drawStorage(c,snap,cupSprite){
    snap.layers.forEach(id=>{
      if(id==='liveCup'){
        snap.cups.forEach(cup=>{
          if(!cup.flying||cup.gone)return;
          this.sprite(c,cupSprite(cup.row),cup.p[0],cup.p[1],cup.s);
        });
        if(snap.swirl){
          const swirl=this.M().animations.suck;
          if(swirl){
            const fi=Math.floor(snap.elapsed/1000*swirl.fps)%swirl.frames.length;
            this.sprite(c,swirl.frames[fi],snap.mouth[0],snap.mouth[1],.26);
          }
        }
      }else this.spriteBox(c,id);
    });
    if(snap.archiveText){
      const pose=snap.pose;
      c.save();c.fillStyle='#fff1cf';c.font='700 18px system-ui';c.textAlign='center';
      c.fillText(snap.archiveText,pose.x,pose.y+18);c.restore();
    }
  },
  paint(id){
    const canvas=this.canvas||document.querySelector('[data-scene]');if(!canvas)return;this.canvas=canvas;
    const c=canvas.getContext('2d');c.clearRect(0,0,768,1024);
    if(this.paintRitual){this.paintRitual(c);this.place();return}
    this.drawRoom(c);this.drawSeat(c);
    const tw=this.tableWorld();this.sprite(c,'table_back',tw.x,tw.y,tw.scale);
    const hid=id||this.hamster||this.restId(), idle=this.M().scene.idle;
    this.sprite(c,hid,idle.position[0],idle.position[1],idle.scale);
    const cups=typeof CoffeeRoom!=='undefined'?CoffeeRoom.desk().slice(0,CleanupMotion.MAX_VISIBLE):[],cs=.4;
    cups.forEach((r,i)=>{const [x,y]=this.tableCup(i,cups.length),cid=this.cupId(r),pulse=window.SceneLife?.cupScale(i)||1;this.sprite(c,'cup_shadow_medium',x,y+2,cs);this.sprite(c,cid,x,y,cs*pulse);const fx=window.SceneLife?.fxAt(i);if(fx)this.sprite(c,fx,x,y-36,.32)});
    this.drawDressing(c);this.drawButton(c,false);
    this.sprite(c,'table_front',tw.x,tw.y,tw.scale);
    this.drawIvy(c);
    this.drawSign(c,false);
    if(window.SceneLife?.zzz){const z=this.M().animations.zzz;if(z)this.sprite(c,z.frames[Math.floor(this.nowZzz())%z.frames.length],idle.position[0]+70,idle.position[1]-120,.5)}
    if(!cups.length&&this.fx&&String(this.fx).startsWith('fx_question'))this.sprite(c,this.fx,idle.position[0]+90,idle.position[1]-80,.55);
    this.place();
  },
  place(){
    const canvas=this.canvas;if(!canvas?.parentElement)return;
    const cups=typeof CoffeeRoom!=='undefined'?CoffeeRoom.desk().slice(0,CleanupMotion.MAX_VISIBLE):[],n=cups.length,cs=.4;
    canvas.parentElement.querySelectorAll('.cc-desk-cup').forEach((btn,i)=>{if(i>=n)return;const [x,y]=this.tableCup(i,n),w=256*cs,h=256*cs;btn.style.left=((x-128*cs)/768*100).toFixed(2)+'%';btn.style.top=((y-224*cs)/1024*100).toFixed(2)+'%';btn.style.width=(w/768*100).toFixed(2)+'%';btn.style.height=(h/1024*100).toFixed(2)+'%'});
    const sign=canvas.parentElement.querySelector('.cc-room-sign');
    if(sign){const r=this.signRect();sign.style.left=((r.x+r.w/2)/768*100).toFixed(2)+'%';sign.style.top=((r.y+r.h/2)/1024*100).toFixed(2)+'%';sign.style.width=(r.w/768*100).toFixed(2)+'%';sign.style.height=(r.h/1024*100).toFixed(2)+'%'}
    const hamster=canvas.parentElement.querySelector('.cc-hamster-hit');
    if(hamster&&window.SceneLife){const r=SceneLife.spriteRect('hamster_idle_base');const x=r.x+r.w*.18,y=r.y,w=r.w*.64,h=r.h*.62;hamster.style.left=(x/768*100).toFixed(2)+'%';hamster.style.top=(y/1024*100).toFixed(2)+'%';hamster.style.width=(w/768*100).toFixed(2)+'%';hamster.style.height=(h/1024*100).toFixed(2)+'%'}
    const gadget=canvas.parentElement.querySelector('.cc-collect-hit');
    if(gadget){const b=this.btn(),a=this.M().assets[b.up];if(a){const w=a.canvas[0]*b.scale,h=a.canvas[1]*b.scale,x=b.x-a.pivotX*b.scale,y=b.y-a.pivotY*b.scale;gadget.style.left=((x+w/2)/768*100).toFixed(2)+'%';gadget.style.top=((y+h/2)/1024*100).toFixed(2)+'%';gadget.style.width=(w/768*100).toFixed(2)+'%';gadget.style.height=(h/1024*100).toFixed(2)+'%'}}
  },
  nowZzz(){return (performance.now()/140)|0},
  rest(){this.interactionState='idle';this.paintRitual=null;this.fx=null;this.hamster=this.restId();this._bob=0;this.bobTok++;this.canvas?.removeAttribute('data-playing');this.canvas&&(this.canvas.dataset.interaction='idle');this.paint();window.SceneLife?.wake()},
  play(name,onframe,done){
    this.bobTok++;Motion.stop();
    const canvas=this.canvas||document.querySelector('[data-scene]');if(!canvas){done?.();return}
    if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){done?.();this.rest();return}
    const a=this.M().animations[name];if(!a){done?.();return}
    const t=Motion.token,start=performance.now();Motion.active=canvas;canvas.dataset.playing='true';canvas.dataset.expression=name;canvas.dataset.frame='0';
    const step=now=>{
      if(t!==Motion.token)return;
      if(!canvas.isConnected||document.hidden){Motion.stop();return}
      const u=(now-start)*a.fps/1000;
      if(u>=a.frames.length){this.paintRitual=null;Motion.stop();done?.();return}
      const f=Math.min(Math.floor(u),a.frames.length-1),progress=u/a.frames.length;
      canvas.dataset.frame=String(f);onframe(a.frames[f],f,progress);Motion.raf=requestAnimationFrame(step);
    };
    Motion.raf=requestAnimationFrame(step);
  },
  nudge(){
    if(this.interactionState!=='idle')return;
    this.load().then(()=>{
      if(this.interactionState!=='idle')return;
      if(typeof CoffeeRoom!=='undefined'&&CoffeeRoom.ritual)return;
      const empty=typeof CoffeeRoom!=='undefined'&&!CoffeeRoom.desk().length;
      const name=this.sleepy()?'sleep':'idle';
      const fxName=this.sleepy()?'zzz':empty?'question':CoffeeRoom.desk().some(r=>!this.hot(this.cupId(r)))?'condensation':'steam';
      this.play(name,id=>{this.hamster=id;const fx=this.M().animations[fxName];this.fx=fx?fx.frames[Math.min(Number(this.canvas.dataset.frame)||0,fx.frames.length-1)]:null;this.paint(id)},()=>this.rest());
    });
  },
  drawCleanup(c,elapsed,rows,hamsterId){
    const vis=CleanupMotion.visibleRows(rows);
    const origins=vis.map((_,i)=>this.tableCup(i,vis.length));
    const snap=CleanupMotion.snapshot(this.M(),elapsed,rows,origins);
    const idle=this.M().scene.idle,tw=this.tableWorld();
    const hid=hamsterId||snap.hamster.id;
    this.drawRoom(c);this.drawSeat(c);this.sprite(c,'table_back',tw.x,tw.y,tw.scale);
    if(!snap.hamster.pressed)this.sprite(c,hid,idle.position[0],idle.position[1],idle.scale);
    snap.cups.forEach(cup=>{
      if(cup.gone||cup.flying)return;
      this.sprite(c,'cup_shadow_medium',cup.p[0],cup.p[1]+2,.4);
      this.sprite(c,this.cupId(cup.row),cup.p[0],cup.p[1],cup.s);
    });
    this.drawDressing(c);this.drawButton(c,snap.buttonDown);
    if(snap.hamster.pressed)this.sprite(c,hid,idle.position[0],idle.position[1],idle.scale);
    this.sprite(c,'table_front',tw.x,tw.y,tw.scale);
    this.drawIvy(c);
    this.drawSign(c,snap.phase!=='closed');
    if(CleanupMotion.boxVisible(snap.elapsed,snap.sched))this.drawStorage(c,snap,r=>this.cupId(r));
    if(this.fx&&String(this.fx).startsWith('fx_question'))this.sprite(c,this.fx,idle.position[0]+90,idle.position[1]-80,.55);
  },
  startReaction(rows,done){
    this.interactionState='ending';
    const name=CleanupMotion.reactionName(this.M(),rows);
    const canvas=this.canvas;
    if(canvas){canvas.dataset.expression=name;canvas.dataset.interaction='ending'}
    this.paintRitual=c=>this.drawCleanup(c,1e9,rows,this.hamster);
    const finish=()=>{this.paintRitual=null;this.interactionState='idle';done?.()};
    if(name==='question'){
      this.play('question',id=>{this.fx=id;this.hamster='hamster_idle_base';this.paintRitual=c=>this.drawCleanup(c,1e9,rows,'hamster_idle_base');this.paint()},finish);
      return;
    }
    this.play(name,id=>{this.fx=null;this.hamster=id;this.paintRitual=c=>this.drawCleanup(c,1e9,rows,id);this.paint()},finish);
  },
  skipToComplete(done){
    this.bobTok++;Motion.stop();
    this.paintRitual=null;this.fx=null;this.hamster=this.restId();
    this.interactionState='idle';
    this.canvas?.removeAttribute('data-playing');
    if(this.canvas)this.canvas.dataset.interaction='idle';
    this.paint();window.SceneLife?.wake();done?.();
  },
  cleanup(rows,done){
    const cups=(rows||[]).slice();
    window.SceneLife?.hold();
    this.bobTok++;Motion.stop();
    const canvas=this.canvas||document.querySelector('[data-scene]');if(!canvas){done?.();return}
    this.interactionState='cleanup';
    if(canvas)canvas.dataset.interaction='cleanup';
    if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){done?.();this.rest();return}
    const sched=CleanupMotion.schedule(this.M(),cups);
    const t=Motion.token,t0=performance.now();Motion.active=canvas;canvas.dataset.playing='true';canvas.dataset.expression='cleanup';
    const step=now=>{
      if(t!==Motion.token)return;
      if(!canvas.isConnected||document.hidden){Motion.stop();return}
      const elapsed=now-t0;
      canvas.dataset.frame=String(Math.floor(elapsed/80));
      canvas.dataset.box=CleanupMotion.boxPhase(elapsed,sched);
      if(elapsed>=sched.reactionAt){this.startReaction(cups,done);return}
      this.paintRitual=c=>this.drawCleanup(c,elapsed,cups);this.paint();
      Motion.raf=requestAnimationFrame(step);
    };
    Motion.raf=requestAnimationFrame(step);
  },
  mount(){
    document.querySelectorAll('canvas[data-scene]').forEach(canvas=>{
      if(this.mounted.has(canvas)){this.canvas=canvas;this.paint();return}
      this.mounted.add(canvas);this.canvas=canvas;this.place();
      this.load().then(()=>{if(!canvas.isConnected)return;if(typeof CoffeeRoom!=='undefined'&&CoffeeRoom.ritual)return;if(!canvas.dataset.playing)this.rest()}).catch(()=>{canvas.setAttribute('aria-label','咖啡角素材暂时无法加载')});
    });
  }
};
const prodPlay=Motion.play.bind(Motion),prodStop=Motion.stop.bind(Motion);
Motion.play=function(el){return el?.hasAttribute('data-scene')?undefined:prodPlay(el)};
Motion.stop=function(){prodStop()};
new MutationObserver(()=>ProductionScene.mount()).observe(document.body,{childList:true,subtree:true});
addEventListener('resize',()=>ProductionScene.place());
ProductionScene.mount();
window.ProductionScene=ProductionScene;
