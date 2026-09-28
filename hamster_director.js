/* Sole owner of coffee-corner motion. Other modules only send requests. */
const HamsterDirector={
  BASE:'hamster_idle_base',
  SEAT:{x:390,y:772,scale:0.50,depth:'seat'},
  BEHIND:{x:390,y:730,scale:0.40},
  BEHIND_LEFT:{x:240,y:760,scale:0.40},
  LIP:{x:240,y:960,scale:0.40},
  LEFT:{x:240,y:970,scale:0.40},
  MID:{x:390,y:970,scale:0.40},
  RIGHT:{x:520,y:970,scale:0.40},
  EXIT_MS:1400,
  ENTER_MS:1400,
  SEGS:[
    {kind:'walk',a:{x:390,y:730,scale:0.40},b:{x:240,y:760,scale:0.40},ms:1400,mode:'roaming',depth:'behind'},
    {kind:'walk',a:{x:240,y:760,scale:0.40},b:{x:240,y:960,scale:0.40},ms:1800,mode:'roaming',depth:'behind'},
    {kind:'walk',a:{x:240,y:970,scale:0.40},b:{x:390,y:970,scale:0.40},ms:1600,mode:'roaming',depth:'front'},
    {kind:'walk',a:{x:390,y:970,scale:0.40},b:{x:520,y:970,scale:0.40},ms:1600,mode:'roaming',depth:'front'},
    {kind:'look',at:{x:520,y:970,scale:0.40},ms:2000,mode:'returning',depth:'front'},
    {kind:'walk',a:{x:520,y:970,scale:0.40},b:{x:390,y:970,scale:0.40},ms:1600,mode:'returning',depth:'front'},
    {kind:'walk',a:{x:390,y:970,scale:0.40},b:{x:240,y:970,scale:0.40},ms:1600,mode:'returning',depth:'front'},
    {kind:'walk',a:{x:240,y:960,scale:0.40},b:{x:240,y:760,scale:0.40},ms:1800,mode:'returning',depth:'behind'},
    {kind:'walk',a:{x:240,y:760,scale:0.40},b:{x:390,y:730,scale:0.40},ms:1400,mode:'sitting-down',depth:'behind'}
  ],
  HOME_FIRST:[
    {kind:'idle',ms:4000},
    {kind:'action',name:'blink'},
    {kind:'idle',ms:6000},
    {kind:'action',name:'lookCup'},
    {kind:'idle',ms:4000},
    {kind:'roam'}
  ],
  HOME:[
    {kind:'idle',ms:12000},
    {kind:'action',name:'blink'},
    {kind:'idle',ms:14000},
    {kind:'action',name:'lookCup'},
    {kind:'idle',ms:14000},
    {kind:'action',name:'smile'},
    {kind:'idle',ms:14000},
    {kind:'roam'}
  ],
  CLICKS:['glad','nod','lookUser','glasses'],
  ACTIONS:{
    blink:{frames:['hamster_idle_base','hamster_idle_08','hamster_idle_base'],durations:[400,600,400]},
    lookCup:{frames:['hamster_idle_base','hamster_watch','hamster_idle_03','hamster_watch','hamster_idle_base'],durations:[380,520,500,520,380]},
    smile:{frames:['hamster_idle_base','hamster_idle_01','hamster_idle_05','hamster_idle_01','hamster_idle_base'],durations:[360,500,480,500,360]},
    glad:{frames:['hamster_idle_base','hamster_seated_glad_01','hamster_seated_glad_03','hamster_seated_glad_02','hamster_seated_glad_01','hamster_idle_base'],durations:[300,460,520,460,460,300]},
    nod:{frames:['hamster_idle_base','hamster_idle_08','hamster_idle_05','hamster_idle_08','hamster_idle_base'],durations:[360,500,480,500,360]},
    lookUser:{frames:['hamster_idle_base','hamster_look_button','hamster_watch','hamster_look_button','hamster_idle_base'],durations:[380,500,440,500,380]},
    glasses:{frames:['hamster_idle_base','hamster_seated_wipe_start','hamster_seated_wipe_01','hamster_seated_wipe_release','hamster_idle_base'],durations:[300,400,400,400,300]},
    lookButton:{frames:['hamster_idle_base','hamster_look_button','hamster_idle_base'],durations:[400,1000,400]},
    tap:{frames:['hamster_idle_base','hamster_press','hamster_idle_base'],durations:[400,1140,400]},
    seatExit:{frames:['hamster_seat_exit_01','hamster_seat_exit_02','hamster_seat_exit_03','hamster_seat_exit_04'],durations:[350,350,350,350]},
    seatEnter:{frames:['hamster_seat_enter_01','hamster_seat_enter_02','hamster_seat_enter_03','hamster_seat_enter_04'],durations:[350,350,350,350]},
    walkLeft:{frames:['hamster_walk_left_01','hamster_walk_left_02','hamster_walk_left_03','hamster_walk_left_04'],durations:[200,200,200,200]},
    walkRight:{frames:['hamster_walk_right_01','hamster_walk_right_02','hamster_walk_right_03','hamster_walk_right_04'],durations:[200,200,200,200]},
    lookAround:{frames:['hamster_stand_idle','hamster_stand_wave','hamster_stand_idle','hamster_stand_wave'],durations:[400,600,600,400]},
    wave:{frames:['hamster_stand_wave','hamster_stand_idle','hamster_stand_wave','hamster_stand_idle'],durations:[500,500,500,500]},
    clap:{frames:['hamster_idle_base','hamster_seated_glad_01','hamster_seated_glad_03','hamster_seated_glad_02','hamster_seated_glad_01','hamster_idle_base'],durations:[200,250,300,300,250,200]},
    wipe:{frames:['hamster_idle_base','hamster_seated_wipe_start','hamster_seated_wipe_01','hamster_seated_wipe_hold','hamster_seated_wipe_release','hamster_idle_base'],durations:[220,280,420,420,280,180]},
    steam:{frames:['fx_steam_01','fx_steam_02','fx_steam_03','fx_steam_04','fx_steam_05'],durations:[420,560,640,520,360]},
    condensation:{frames:['fx_condensation_01','fx_condensation_02','fx_condensation_03','fx_condensation_04','fx_condensation_05'],durations:[320,420,520,420,320]},
    sparkle:{frames:['fx_sparkle_01','fx_sparkle_02','fx_sparkle_03','fx_sparkle_04','fx_sparkle_05'],durations:[200,260,340,280,220]}
  },
  rank:20,phase:'boot',mode:'seated',check:false,paused:false,auto:true,
  loopIndex:0,clickIndex:0,coffeeIndex:0,stepToken:0,coffeeToken:0,
  timer:0,coffeeTimer:0,coffeeFrame:0,roamT:0,onRoute:false,
  pose:{spriteId:'hamster_idle_base',x:390,y:772,scale:0.50,inFront:false,depth:'seat',layer:'hamster'},
  fx:null,fxIndex:-1,cleanupRows:null,cleanupDone:null,ritualElapsed:0,forceEnding:null,
  roamEnd(){return this.EXIT_MS+this.SEGS.reduce((s,seg)=>s+seg.ms,0)+this.ENTER_MS},
  cycleMs(list){return list.reduce((s,step)=>s+(step.kind==='idle'?step.ms:step.name?this.total(step.name):0),0)},
  departMs(){return this.cycleMs(this.HOME_FIRST)},
  repeatMs(){return this.cycleMs(this.HOME)},
  total(name){return (this.ACTIONS[name]?.durations||[]).reduce((s,n)=>s+n,0)},
  frameAt(durations,t){
    let acc=0;
    for(let i=0;i<durations.length;i++){if(t<acc+durations[i])return i;acc+=durations[i]}
    return Math.max(0,durations.length-1);
  },
  lerp(a,b,u){u=Math.max(0,Math.min(1,u));return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,scale:a.scale+(b.scale-a.scale)*u}},
  depthFor(p){
    if(p.depth)return p.depth;
    const s=this.SEAT;
    if(Math.hypot(p.x-s.x,p.y-s.y)<24&&p.scale>=s.scale-0.06)return 'seat';
    return 'behind';
  },
  pack(p,sprite,mode,depth){
    depth=depth||this.depthFor(p);
    return {x:p.x,y:p.y,scale:p.scale,spriteId:sprite,mode,inFront:depth==='front',depth};
  },
  poseAt(ms){
    const end=this.roamEnd();
    ms=Math.max(0,Math.min(ms,end));
    if(ms<this.EXIT_MS){
      const p=this.lerp(this.SEAT,this.BEHIND,ms/this.EXIT_MS);
      const frame=this.frameAt(this.ACTIONS.seatExit.durations,ms);
      return this.pack(p,this.ACTIONS.seatExit.frames[frame],'standing-up',frame<2?'seat':'behind');
    }
    let t=ms-this.EXIT_MS;
    for(const seg of this.SEGS){
      if(t<seg.ms){
        if(seg.kind==='look')return this.pack(seg.at,this.ACTIONS.lookAround.frames[this.frameAt(this.ACTIONS.lookAround.durations,t)],seg.mode,seg.depth);
        const p=this.lerp(seg.a,seg.b,t/seg.ms);
        const dx=seg.b.x-seg.a.x;
        const frames=dx<0?this.ACTIONS.walkLeft.frames:this.ACTIONS.walkRight.frames;
        return this.pack(p,frames[Math.floor(t/200)%4],seg.mode,seg.depth);
      }
      t-=seg.ms;
    }
    const p=this.lerp(this.BEHIND,this.SEAT,Math.min(1,t/this.ENTER_MS));
    const seated=t>=this.ENTER_MS;
    const frame=this.frameAt(this.ACTIONS.seatEnter.durations,t);
    return this.pack(seated?this.SEAT:p,seated?this.BASE:this.ACTIONS.seatEnter.frames[frame],seated?'seated':'sitting-down',seated||frame>=2?'seat':'behind');
  },
  output(){return this.pose},
  atSeat(){return this.mode==='seated'&&Math.hypot(this.pose.x-this.SEAT.x,this.pose.y-this.SEAT.y)<12},
  setPose(spriteId,p,inFront,mode){
    const depth=this.depthFor(p);
    this.pose={spriteId,x:p.x,y:p.y,scale:p.scale,inFront:depth==='front',depth,layer:'hamster'};
    if(mode)this.mode=mode;
    this.syncWorld();
    window.ProductionScene?.paint();
  },
  placeSeat(){this.setPose(this.BASE,this.SEAT,false,'seated')},
  syncWorld(){
    const w=window.HamsterWorld;if(!w)return;
    w.mode=this.mode;w.x=this.pose.x;w.y=this.pose.y;w.scale=this.pose.scale;w.sprite=this.pose.spriteId;
    if(w.trace[w.trace.length-1]!==this.mode)w.trace.push(this.mode);
    w.samples.push({x:+this.pose.x.toFixed(2),y:+this.pose.y.toFixed(2),mode:this.mode,inFront:!!this.pose.inFront,sprite:this.pose.spriteId});
    if(w.samples.length>5000)w.samples.shift();
  },
  arm(ms,fn){
    window.SceneLife?.clear(this.timer);
    const token=++this.stepToken;
    this.timer=SceneLife.later(()=>{if(token!==this.stepToken)return;fn()},ms);
  },
  cutCoffee(){
    this.coffeePlaying=false;this.fx=null;
    window.SceneLife?.clear(this.coffeeFrame);
    if(window.SceneLife){SceneLife.fxFrame=null;SceneLife.fxIndex=-1;SceneLife.coffeePlaying=false;SceneLife.pulses={}}
  },
  stopMotion(){
    this.stepToken++;
    window.SceneLife?.clear(this.timer);
    this.timer=0;
    this.cutCoffee();
    this.onRoute=false;
  },
  applyManifest(){
    const M=window.BEANSTER_ASSETS;if(!M)return;
    const copy=(key)=>{const a=this.ACTIONS[key];if(!M.animations[key])return;M.animations[key].frames=a.frames.slice();M.animations[key].durationsMs=a.durations.slice()};
    copy('wipe');copy('clap');
    const idle=M.scene&&M.scene.idle;
    if(idle&&idle.position)this.SEAT={x:idle.position[0],y:idle.position[1],scale:idle.scale,depth:'seat'};
    const table=M.scene.table||{position:[384,799],scale:0.46};
    const lip=table.position[1]+(320-280)*table.scale;
    M.scene.roam=Object.assign({},M.scene.roam,{locked:true,route:[this.LEFT,this.MID,this.RIGHT].map(p=>[p.x,p.y]),tableFrontY:Math.round(lip),floorScale:0.40});
  },
  boot(){
    this.paused=false;this.check=false;this.rank=20;this.phase='idle';this.loopIndex=0;this.usedFirst=false;this.roamT=0;this.onRoute=false;
    this.cleanupRows=null;this.cleanupDone=null;this.forceEnding=null;
    const w=window.HamsterWorld;
    if(w){w.trace.length=0;w.samples.length=0;w.auto=w.auto!==false}
    this.auto=w?w.auto!==false:true;
    this.applyManifest();
    if(window.SceneLife){SceneLife.played=[];SceneLife.strong=false;SceneLife.fxDurations={steam:this.ACTIONS.steam.durations,condensation:this.ACTIONS.condensation.durations,sparkle:this.ACTIONS.sparkle.durations,shimmer:[340,420,400,320]}}
    this.stopMotion();
    this.placeSeat();
    if(!window.SceneLife?.onToday())return;
    this.stepLoop();
    this.scheduleCoffee();
  },
  pause(){this.paused=true;this.stopMotion();window.SceneLife?.clear(this.coffeeTimer);this.coffeeTimer=0;this.coffeeToken++},
  resume(){
    this.paused=false;
    if(this.check||this.onRoute||this.phase==='ritual'||this.phase==='ending'||this.phase==='return')return;
    if(this.timer)return;
    if(!window.SceneLife?.onToday())return;
    this.rank=20;this.stepLoop();
    if(!this.coffeeTimer)this.scheduleCoffee();
  },
  stepLoop(){
    if(this.check||this.paused||this.rank>=40)return;
    const list=this.usedFirst?this.HOME:this.HOME_FIRST;
    const step=list[this.loopIndex];
    this.loopIndex++;
    if(this.loopIndex>=list.length){this.loopIndex=0;this.usedFirst=true}
    if(step.kind==='idle')this.beginIdle(step.ms);
    else if(step.kind==='action')this.playAction(step.name,()=>this.stepLoop());
    else this.beginRoam(()=>this.stepLoop());
  },
  beginIdle(ms){
    this.phase='idle';this.rank=20;this.mode='seated';
    this.setPose(this.BASE,this.SEAT,false,'seated');
    this.mark('');
    this.arm(ms,()=>this.stepLoop());
  },
  playAction(name,done){
    const action=this.ACTIONS[name];
    if(!action){done&&done();return}
    this.cutCoffee();
    this.phase='action';this.actionName=name;
    window.SceneLife?.played&&SceneLife.played.push(name);
    this.mark(name);
    const seated=!String(name).startsWith('walk')&&name!=='lookAround'&&name!=='wave'&&name!=='seatExit'&&name!=='seatEnter';
    if(window.SceneLife?.reduced()){
      const last=action.frames[action.frames.length-1];
      if(seated)this.setPose(last,this.SEAT,false,'seated');
      this.arm(0,()=>{this.phase='idle';this.mark('');done&&done()});
      return;
    }
    let i=0;
    const step=()=>{
      const anchor=seated?this.SEAT:this.pose;
      if(seated)this.setPose(action.frames[i],this.SEAT,false,'seated');
      else this.setPose(action.frames[i],{x:anchor.x,y:anchor.y,scale:anchor.scale},this.pose.inFront);
      const hold=action.durations[i];
      i+=1;
      if(i<action.frames.length)this.arm(hold,step);
      else this.arm(hold,()=>{this.phase='idle';this.mark('');done&&done()});
    };
    step();
  },
  roamAllowed(){return (window.HamsterWorld?HamsterWorld.auto!==false:this.auto)&&!window.SceneLife?.reduced()},
  beginRoam(done){
    if(!this.roamAllowed()){this.arm(0,()=>done&&done());return}
    this.cutCoffee();
    this.onRoute=true;this.rank=30;this.phase='roam';this.roamT=0;this.roamDone=done;
    this.showRoam();
  },
  showRoam(){
    if(!this.onRoute)return;
    const end=this.roamEnd();
    const p=this.poseAt(Math.min(this.roamT,end));
    this.phase=p.mode==='seated'?'idle':'roam';
    this.setPose(p.spriteId,p,p.inFront,p.mode);
    if(this.roamT>=end){
      this.onRoute=false;this.rank=20;this.roamT=0;this.mark('');
      const done=this.roamDone;this.roamDone=null;
      if(this.afterRoute==='ritual'){this.afterRoute=null;this.beginRitual();return}
      done&&done();
      return;
    }
    this.arm(100,()=>{if(!this.onRoute)return;this.roamT+=100;this.showRoam()});
  },
  floorWave(){
    if(!this.onRoute)return;
    const resumeAt=this.roamT;
    this.onRoute=false;
    this.stepToken++;
    window.SceneLife?.clear(this.timer);
    this.phase='wave';this.rank=50;
    const p={x:this.pose.x,y:this.pose.y,scale:this.pose.scale};
    const frames=this.ACTIONS.wave.frames,durations=this.ACTIONS.wave.durations;
    let i=0;
    const step=()=>{
      this.setPose(frames[i],p,true,this.mode);
      const hold=durations[i];i+=1;
      if(i<frames.length)this.arm(hold,step);
      else this.arm(hold,()=>{this.rank=30;this.roamT=resumeAt;this.onRoute=true;this.showRoam()});
    };
    step();
  },
  click(){
    if(this.rank>=60||this.phase==='ritual'||this.phase==='ending'||this.phase==='return')return;
    if(this.onRoute||this.phase==='wave'||this.mode==='roaming'||this.mode==='returning'||this.mode==='standing-up'||this.mode==='sitting-down'){this.floorWave();return}
    const name=this.CLICKS[this.clickIndex%this.CLICKS.length];
    this.clickIndex++;
    this.rank=50;
    this.stepToken++;
    window.SceneLife?.clear(this.timer);
    this.playAction(name,()=>{this.rank=20;if(!this.check)this.stepLoop()});
  },
  requestCleanup(rows,done){
    this.rank=60;this.phase='return';
    this.cleanupRows=(rows||[]).slice();
    this.cleanupDone=done||null;
    this.stopMotion();
    window.SceneLife?.clear(this.coffeeTimer);this.coffeeTimer=0;
    if(window.SceneLife)SceneLife.strong=true;
    const scene=window.ProductionScene;
    if(scene){scene.interactionState='cleanup';if(scene.canvas)scene.canvas.dataset.interaction='cleanup'}
    this.enterThen='ritual';
    if(this.atSeat()||!this.roamT){this.placeSeat();this.beginRitual();return}
    if(this.roamT>=this.roamEnd()-this.ENTER_MS){this.onRoute=true;this.afterRoute='ritual';this.showRoam();return}
    if(this.roamT<this.EXIT_MS){this.unwindExit();return}
    this.mode='returning';
    this.tickBack();
  },
  unwindExit(){
    this.roamT=Math.max(0,this.roamT-100);
    const p=this.poseAt(this.roamT);
    this.phase='return';
    this.setPose(p.spriteId,p,p.inFront,'sitting-down');
    if(this.roamT<=0){this.placeSeat();this.beginRitual();return}
    this.arm(100,()=>this.unwindExit());
  },
  tickBack(){
    if(this.roamT<=this.EXIT_MS){this.beginSeatEnter();return}
    const prevX=this.pose.x;
    this.roamT-=100;
    const p=this.poseAt(this.roamT);
    const frames=p.x-prevX<0?this.ACTIONS.walkLeft.frames:this.ACTIONS.walkRight.frames;
    this.phase='return';
    this.setPose(frames[Math.floor(this.roamT/200)%4],p,p.y>=856,'returning');
    this.arm(100,()=>this.tickBack());
  },
  beginSeatEnter(){
    this.enterT=0;this.phase='enter';
    this.tickEnter();
  },
  tickEnter(){
    const p=this.lerp(this.BEHIND,this.SEAT,this.enterT/this.ENTER_MS);
    const sprite=this.ACTIONS.seatEnter.frames[this.frameAt(this.ACTIONS.seatEnter.durations,this.enterT)];
    const done=this.enterT>=this.ENTER_MS;
    this.setPose(done?this.BASE:sprite,done?this.SEAT:p,!done&&p.y>=856,done?'seated':'sitting-down');
    if(done){this.roamT=0;if(this.enterThen==='ritual'){this.enterThen=null;this.beginRitual()}else{this.phase='idle';this.check=false;this.placeSeat()}return}
    this.enterT+=100;
    this.arm(100,()=>this.tickEnter());
  },
  beginRitual(){
    this.phase='ritual';this.mode='seated';this.ritualElapsed=0;this.roamT=0;this.onRoute=false;
    this.placeSeat();
    this.tickRitual();
  },
  tickRitual(){
    const M=window.BEANSTER_ASSETS;
    const sched=window.CleanupMotion.schedule(M,this.cleanupRows||[]);
    if(this.ritualElapsed>=sched.reactionAt){
      const name=this.forceEnding||CleanupMotion.reactionName(M,this.cleanupRows||[]);
      this.forceEnding=null;
      this.phase='ending';
      this.ritualElapsed=1e9;
      this.playAction(this.ACTIONS[name]?name:'clap',()=>this.finishCleanup());
      return;
    }
    const h=CleanupMotion.hamster(this.ritualElapsed,sched,M);
    this.setPose(h.id,this.SEAT,false,'seated');
    this.ritualElapsed+=100;
    this.arm(100,()=>this.tickRitual());
  },
  cleanupView(){
    if(this.phase!=='ritual'&&this.phase!=='ending'&&this.phase!=='return'&&this.phase!=='enter')return null;
    if(this.phase==='return'||this.phase==='enter')return null;
    return {elapsed:this.ritualElapsed,rows:this.cleanupRows||[]};
  },
  finishCleanup(){
    this.rank=20;this.phase='idle';this.mode='seated';
    if(window.SceneLife)SceneLife.strong=false;
    const scene=window.ProductionScene;
    if(scene){scene.interactionState='idle';scene.paintRitual=null;if(scene.canvas){scene.canvas.dataset.interaction='idle';scene.canvas.removeAttribute('data-playing')}}
    this.placeSeat();
    const done=this.cleanupDone;this.cleanupDone=null;this.cleanupRows=null;
    if(done)done();
    if(!this.check){this.stepLoop();this.scheduleCoffee()}
  },
  cups(){return (window.CoffeeRoom?.desk?.()||[]).slice(0,window.CleanupMotion?.MAX_VISIBLE||4)},
  scheduleCoffee(){
    if(this.paused||window.SceneLife?.reduced())return;
    window.SceneLife?.clear(this.coffeeTimer);
    const token=++this.coffeeToken;
    this.coffeeTimer=SceneLife.later(()=>{if(token!==this.coffeeToken)return;this.onCoffee()},22000);
  },
  onCoffee(){
    if(this.phase==='idle'&&this.rank<=20&&!this.check)this.playCoffee(false,null);
    this.scheduleCoffee();
  },
  playCoffee(force,done){
    const cups=this.cups();
    const hot=!cups.length||window.ProductionScene?.hot?.(window.ProductionScene.cupId(cups[0]));
    const cycle=hot?['steam','sparkle']:['condensation','sparkle'];
    const name=cycle[this.coffeeIndex%cycle.length];
    this.coffeeIndex++;
    const action=this.ACTIONS[name];
    window.SceneLife?.played&&SceneLife.played.push('cup:'+name);
    if(!cups.length&&!force){done&&done();return}
    this.coffeePlaying=true;
    if(window.SceneLife){SceneLife.coffeePlaying=true;SceneLife.fxIndex=0}
    let i=0;
    const step=()=>{
      if(!this.coffeePlaying){done&&done();return}
      this.fx=action.frames[i];
      if(window.SceneLife)SceneLife.fxFrame=this.fx;
      window.ProductionScene?.paint();
      const hold=action.durations[i];i+=1;
      if(i<action.frames.length){
        window.SceneLife?.clear(this.coffeeFrame);
        this.coffeeFrame=SceneLife.later(step,hold);
      }else{
        this.cutCoffee();
        window.ProductionScene?.paint();
        done&&done();
      }
    };
    step();
  },
  playCoffeeNow(done){this.playCoffee(true,done)},
  fxAt(index){return this.coffeePlaying&&index===0?this.fx:null},
  mark(name){
    const canvas=window.ProductionScene?.canvas;if(!canvas)return;
    if(name){canvas.dataset.playing='true';canvas.dataset.expression=name}
    else canvas.removeAttribute('data-playing');
  },
  showHome(then){
    if(document.querySelector('.page.active')?.id!=='today'&&window.UI?.go)UI.go('today');
    this.arm(60,then);
  },
  playSolo(name){
    this.check=true;this.rank=20;this.stopMotion();
    const run=()=>{
      if(name==='fullRoam')this.beginRoam(()=>{this.check=false});
      else if(name==='fullCleanup'){this.forceEnding='wipe';this.requestCleanup(this.demoRows(),()=>{this.check=false})}
      else if(name==='walkLeft')this.playInPlace('walkLeft',this.LEFT);
      else if(name==='walkRight')this.playInPlace('walkRight',this.RIGHT);
      else if(name==='seatExit')this.beginExitOnly();
      else if(name==='seatEnter'){this.enterThen=null;this.setPose(this.ACTIONS.seatExit.frames[3],this.BEHIND,false,'standing-up');this.beginSeatEnter()}
      else if(name==='lookAround'){this.setPose(this.ACTIONS.lookAround.frames[0],this.RIGHT,true,'returning');this.playHeld('lookAround',this.RIGHT,true)}
      else this.playAction(name,()=>{});
    };
    this.showHome(run);
  },
  beginExitOnly(){
    this.onRoute=true;this.roamT=0;this.phase='roam';
    const step=()=>{
      const p=this.poseAt(Math.min(this.roamT,this.EXIT_MS));
      this.setPose(p.spriteId,p,p.inFront,p.mode);
      if(this.roamT>=this.EXIT_MS){this.onRoute=false;this.check=false;return}
      this.arm(100,()=>{this.roamT+=100;step()});
    };
    step();
  },
  playInPlace(name,where){
    this.setPose(this.ACTIONS[name].frames[0],where,true,'roaming');
    this.playHeld(name,where,true);
  },
  playHeld(name,where,front){
    const action=this.ACTIONS[name];let i=0;
    const step=()=>{
      this.setPose(action.frames[i],where,front,front?'roaming':'seated');
      const hold=action.durations[i];i+=1;
      if(i<action.frames.length)this.arm(hold,step);
    };
    step();
  },
  demoRows(){
    const cups=this.cups();
    return cups.length?cups:[{id:'scene-test',type:'拿铁',productName:'拿铁',temp:'热'}];
  },
  runFullScene(){
    this.check=true;this.rank=20;this.stopMotion();
    const steps=[
      {kind:'idle',ms:400},
      {kind:'action',name:'blink'},
      {kind:'action',name:'lookCup'},
      {kind:'action',name:'smile'},
      {kind:'roam'},
      {kind:'coffee'},
      {kind:'cleanup'}
    ];
    const next=()=>{
      const step=steps.shift();
      if(!step){this.check=false;this.rank=20;this.phase='idle';this.placeSeat();this.stepLoop();this.scheduleCoffee();return}
      if(step.kind==='idle'){this.phase='idle';this.placeSeat();this.arm(step.ms,next)}
      else if(step.kind==='action')this.playAction(step.name,next);
      else if(step.kind==='roam')this.beginRoam(next);
      else if(step.kind==='coffee')this.playCoffeeNow(next);
      else {this.forceEnding='wipe';this.requestCleanup(this.demoRows(),next)}
    };
    this.showHome(next);
  },
  fullSceneMs(){
    return 400+this.total('blink')+this.total('lookCup')+this.total('smile')+this.roamEnd()+this.total('steam')+3650+this.total('wipe');
  },
  mountCheck(){
    const host=document.getElementById('settingsContent');
    if(!host||host.querySelector('.u-action-check'))return;
    const buttons=[
      ['blink','眨眼'],['lookCup','看杯子'],['smile','微笑'],['seatExit','起身'],
      ['walkLeft','向左走'],['walkRight','向右走'],['lookAround','张望'],['seatEnter','坐下'],
      ['clap','鼓掌'],['wipe','擦汗'],['fullRoam','完整漫游'],['fullCleanup','完整收杯']
    ];
    host.insertAdjacentHTML('beforeend',`<div class="card u-action-check"><div class="section-title">动作检查</div><div class="u-action-grid">${buttons.map(([id,label])=>`<button type="button" onclick="HamsterDirector.playSolo('${id}')">${label}</button>`).join('')}<button type="button" class="wide" onclick="HamsterDirector.runFullScene()">完整剧情检查</button></div></div>`);
  }
};
window.HamsterDirector=HamsterDirector;
if(typeof renderSettings==='function'&&!renderSettings.actionCheck){
  const prev=renderSettings;
  renderSettings=function(){prev();HamsterDirector.mountCheck()};
  renderSettings.actionCheck=true;
}
if(window.HamsterWorld)HamsterDirector.auto=HamsterWorld.auto!==false;
if(document.querySelector('.page.active')?.id==='today')HamsterDirector.boot();
