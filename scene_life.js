/* Seated ambient life for the coffee corner. Where the hamster stands is HamsterWorld. */
const SceneLife={
  seq:0,queue:[],useNativeTimers:true,clock:0,
  hamsterTimer:0,coffeeTimer:0,frameTimer:0,
  hamsterPlaying:false,coffeePlaying:false,strong:false,
  recentHamster:[],recentCoffee:[],
  hamsterStartedAt:0,coffeeStartedAt:0,
  queuedCup:null,fxIndex:-1,fxFrame:null,pulses:{},zzz:null,
  played:[],
  base:'hamster_idle_base',
  rand:Math.random,
  fxDurations:{
    steam:[420,520,640,520,400],
    condensation:[320,400,460,400,320],
    sparkle:[220,280,320,280,220],
    shimmer:[340,420,400,320]
  },
  now(){return this.useNativeTimers?performance.now():this.clock},
  later(fn,ms){
    const token=++this.seq,at=this.now()+ms;
    const rec={token,at,fn};
    this.queue.push(rec);
    if(this.useNativeTimers)rec.native=setTimeout(()=>{this.queue=this.queue.filter(x=>x.token!==token);fn()},ms);
    return token;
  },
  clear(token){
    const rec=this.queue.find(x=>x.token===token);
    if(rec?.native)clearTimeout(rec.native);
    this.queue=this.queue.filter(x=>x.token!==token);
  },
  pump(ms){
    const end=this.now()+ms;
    for(let guard=0;guard<8000;guard++){
      const due=this.queue.filter(x=>x.at<=end).sort((a,b)=>a.at-b.at||a.token-b.token)[0];
      if(!due)break;
      this.queue=this.queue.filter(x=>x!==due);
      this.clock=due.at;
      due.fn();
    }
    this.clock=end;
  },
  library(){
    const b=this.base;
    const clip=(frames,durationsMs)=>({frames,durationsMs});
    return {
      blink:clip([b,'hamster_idle_08',b],[420,700,480]),
      glance:clip([b,'hamster_look_button','hamster_idle_04','hamster_look_button',b],[320,480,620,480,360]),
      lookCup:clip([b,'hamster_watch','hamster_idle_03','hamster_watch',b],[340,560,700,520,380]),
      smile:clip([b,'hamster_idle_01','hamster_idle_05','hamster_idle_01',b],[360,520,680,520,400]),
      tilt:clip([b,'hamster_idle_03','hamster_idle_06','hamster_idle_03',b],[340,500,640,500,380]),
      slowBlink:clip([b,'hamster_sleep_02',b],[480,860,520]),
      drowsy:clip([b,'hamster_sleep_01','hamster_sleep_02','hamster_sleep_01',b],[360,520,680,520,400]),
      lookDown:clip([b,'hamster_sleep_03','hamster_sleep_04','hamster_sleep_03',b],[360,540,700,540,420]),
      zzz:clip([b,'hamster_sleep_02','hamster_sleep_03','hamster_sleep_02',b],[380,560,720,560,400]),
      glad:clip([b,'hamster_seated_glad_01','hamster_seated_glad_03','hamster_seated_glad_02','hamster_seated_glad_01',b],[320,480,640,720,560,400]),
      glasses:clip([b,'hamster_seated_wipe_start','hamster_seated_wipe_release','hamster_seated_glad_01',b],[360,640,720,560,420]),
      nod:clip([b,'hamster_idle_08','hamster_idle_05','hamster_idle_08',b],[360,520,680,520,420]),
      lookUser:clip([b,'hamster_look_button','hamster_watch','hamster_look_button',b],[380,620,760,620,440]),
      tap:clip([b,'hamster_press',b],[420,900,620]),
      lookButton:clip([b,'hamster_look_button',b],[400,860,560])
    };
  },
  audit(){
    const bad=[];
    for(const [name,clip] of Object.entries(this.library())){
      const frames=clip.frames;
      if(frames[0]!==this.base||frames[frames.length-1]!==this.base)bad.push(name+':ends');
      if(!clip.durationsMs||clip.durationsMs.length!==frames.length)bad.push(name+':durations');
      const total=(clip.durationsMs||[]).reduce((s,n)=>s+n,0);
      const interactive=this.interactivePool().includes(name)||name==='lookButton';
      if(total<(interactive?1800:1500))bad.push(name+':short');
      for(const id of frames){
        if(!String(id).startsWith('hamster_'))continue;
        const a=window.BEANSTER_ASSETS?.assets[id];
        if(!a||a.canvas[0]!==512||a.canvas[1]!==512||a.pivotX!==256||a.pivotY!==448||a.tableContact?.[0]!==256||a.tableContact?.[1]!==448)bad.push(name+':'+id);
      }
    }
    for(const [name,dur] of Object.entries(this.fxDurations)){
      const total=dur.reduce((s,n)=>s+n,0);
      const min=name==='steam'?2000:name==='condensation'?1500:name==='sparkle'?1000:900;
      if(total<min)bad.push(name+':short');
    }
    return bad;
  },
  pool(kind){
    const night=window.ProductionScene?.night();
    if(kind==='hamster')return night?['slowBlink','drowsy','lookDown','zzz']:['blink','glance','lookCup','smile','tilt'];
    return ['steam','condensation','sparkle'];
  },
  interactivePool(){return ['glad','glasses','nod','lookUser','tap','smile']},
  roll(kind,night){
    const span=kind==='hamster'?(night?[12000,24000]:[7000,15000]):[14000,30000];
    return Math.round(span[0]+this.rand()*(span[1]-span[0]));
  },
  pick(pool,recent){
    const ban=new Set((recent||[]).slice(0,2));
    let choices=pool.filter(name=>!ban.has(name));
    if(!choices.length)choices=pool.slice();
    return choices[Math.floor(this.rand()*choices.length)%choices.length];
  },
  reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches},
  onToday(){return document.querySelector('.page.active')?.id==='today'},
  canAmbient(){return this.onToday()&&!this.strong&&!document.hidden&&!this.reduced()&&window.ProductionScene?.interactionState!=='cleanup'&&window.ProductionScene?.interactionState!=='ending'&&(!window.HamsterWorld||HamsterWorld.allowsAmbient())},
  stagger(otherAt,otherPlaying){
    if(otherPlaying||(otherAt&&this.now()-otherAt<800))return Math.round(800+this.rand()*700);
    return 0;
  },
  scheduleHamster(){
    this.clear(this.hamsterTimer);
    if(!this.canAmbient())return;
    this.hamsterTimer=this.later(()=>this.fireHamster(),this.roll('hamster',window.ProductionScene.night()));
  },
  scheduleCoffee(){
    this.clear(this.coffeeTimer);
    if(!this.canAmbient())return;
    this.coffeeTimer=this.later(()=>this.fireCoffee(),this.roll('coffee',false));
  },
  pauseLower(){
    this.clear(this.hamsterTimer);this.clear(this.coffeeTimer);this.clear(this.frameTimer);
    this.hamsterPlaying=false;this.coffeePlaying=false;this.fxFrame=null;this.zzz=null;this.pulses={};
    window.ProductionScene?.paint();
  },
  fireHamster(){
    if(!this.canAmbient()||this.hamsterPlaying){this.scheduleHamster();return}
    const wait=this.stagger(this.coffeeStartedAt,this.coffeePlaying);
    if(wait){this.hamsterTimer=this.later(()=>this.fireHamster(),wait);return}
    const name=this.pick(this.pool('hamster'),this.recentHamster);
    this.recentHamster=[name,...this.recentHamster].slice(0,2);
    this.hamsterStartedAt=this.now();
    this.playClip(name,{interactive:false});
  },
  fireCoffee(){
    if(!this.canAmbient()){this.scheduleCoffee();return}
    if(this.coffeePlaying)return;
    const wait=this.stagger(this.hamsterStartedAt,this.hamsterPlaying);
    if(wait){this.coffeeTimer=this.later(()=>this.fireCoffee(),wait);return}
    const cups=this.cups();
    if(!cups.length){this.scheduleCoffee();return}
    const index=Math.floor(this.rand()*cups.length)%cups.length;
    this.playCoffee(index,false);
  },
  cups(){return (window.CoffeeRoom?.desk()||[]).slice(0,window.CleanupMotion?.MAX_VISIBLE||4)},
  hold(){
    this.strong=true;
    this.clear(this.hamsterTimer);this.clear(this.coffeeTimer);this.clear(this.frameTimer);
    this.hamsterPlaying=false;this.coffeePlaying=false;this.fxFrame=null;this.zzz=null;this.pulses={};this.queuedCup=null;
    window.HamsterWorld?.onStrong();
  },
  wake(){
    this.strong=false;
    this.hamsterPlaying=false;this.coffeePlaying=false;
    const world=window.HamsterWorld;
    if(world&&world.mode!=='seated')return;
    world?.ensure();
    if(!this.onToday()||this.reduced())return;
    this.scheduleHamster();this.scheduleCoffee();
  },
  resumeAmbient(){
    if(!this.canAmbient())return;
    this.scheduleHamster();this.scheduleCoffee();
  },
  playClip(name,opts={}){
    const clip=this.library()[name];
    if(!clip||this.strong)return false;
    if(window.HamsterWorld&&!HamsterWorld.allowsAmbient())return false;
    if(this.hamsterPlaying&&opts.interactive)return false;
    this.clear(this.frameTimer);
    window.HamsterWorld?.clearSchedule();
    this.coffeePlaying=false;this.fxFrame=null;this.pulses={};
    this.hamsterPlaying=true;this.zzz=name==='zzz';
    this.played.push(name);
    const canvas=window.ProductionScene?.canvas;
    if(canvas){canvas.dataset.playing='true';canvas.dataset.expression=name;canvas.dataset.interaction=opts.interactive?'interactive':'ambient'}
    const frames=clip.frames,durations=clip.durationsMs;
    if(this.reduced()){this.applyHamster(frames[frames.length-1]);this.finishHamster();return true}
    let i=0;
    const step=()=>{
      if(!this.hamsterPlaying||this.strong)return;
      this.applyHamster(frames[i]);
      const hold=durations[i]||200;
      i+=1;
      if(i<frames.length)this.frameTimer=this.later(step,hold);
      else this.frameTimer=this.later(()=>this.finishHamster(),hold);
    };
    step();
    return true;
  },
  applyHamster(id){
    const scene=window.ProductionScene;
    if(!scene||(window.HamsterWorld&&!HamsterWorld.allowsAmbient()))return;
    scene.hamster=id;
    scene._bob=0;
    scene.paint(id);
  },
  finishHamster(){
    this.hamsterPlaying=false;this.zzz=null;this.clear(this.frameTimer);
    const scene=window.ProductionScene;
    if(scene?.canvas){scene.canvas.removeAttribute('data-playing');scene.canvas.dataset.interaction='idle'}
    if(scene&&(!window.HamsterWorld||HamsterWorld.allowsAmbient())){scene.hamster=scene.restId();scene._bob=0;scene.paint(scene.hamster)}
    const queued=this.queuedCup;this.queuedCup=null;
    if(queued&&!this.strong)this.startCup(queued.index,queued.id,true);
    else if(!this.strong){this.scheduleHamster();window.HamsterWorld?.schedule(false)}
  },
  playCoffee(index,interactive){
    if(this.strong)return false;
    if(window.HamsterWorld&&!HamsterWorld.allowsAmbient()&&!interactive)return false;
    if(this.coffeePlaying&&interactive)return false;
    if(this.hamsterPlaying&&!interactive)return false;
    const cups=this.cups();
    if(!cups.length)return false;
    const hot=window.ProductionScene.hot(window.ProductionScene.cupId(cups[index]));
    const choices=interactive?(hot?['steam','sparkle','shimmer']:['condensation','sparkle']):[(hot?'steam':'condensation'),'sparkle'];
    const name=this.pick(choices,this.recentCoffee);
    this.recentCoffee=[name,...this.recentCoffee].slice(0,2);
    this.coffeeStartedAt=this.now();
    this.clear(this.frameTimer);
    this.coffeePlaying=true;this.fxIndex=index;this.played.push('cup:'+name);
    const frames=name==='shimmer'?[null,null,null,null]:(window.BEANSTER_ASSETS.animations[name]?.frames||[]);
    const durations=this.fxDurations[name]||frames.map(()=>180);
    if(this.reduced()||!frames.length&&name!=='shimmer'){this.finishCoffee();return true}
    let i=0;
    const step=()=>{
      if(!this.coffeePlaying||this.strong)return;
      this.fxFrame=frames[i]||null;
      this.pulses={};if(interactive||name==='shimmer')this.pulses[index]=1+((i%2)?.02:.008);
      window.ProductionScene.paint();
      const hold=durations[Math.min(i,durations.length-1)]||180;
      i+=1;
      if(i<Math.max(frames.length,name==='shimmer'?durations.length:0))this.frameTimer=this.later(step,hold);
      else this.finishCoffee();
    };
    step();
    return true;
  },
  finishCoffee(){
    this.coffeePlaying=false;this.fxFrame=null;this.fxIndex=-1;this.pulses={};
    window.ProductionScene?.paint();
    if(!this.strong&&!this.hamsterPlaying)this.scheduleCoffee();
  },
  fxAt(index){return this.coffeePlaying&&index===this.fxIndex?this.fxFrame:null},
  cupScale(index){return this.pulses[index]||1},
  pokeHamster(event){
    event.preventDefault();event.stopPropagation();
    if(this.strong)return;
    if(window.HamsterWorld&&HamsterWorld.mode!=='seated'){HamsterWorld.greet();return}
    if(this.reduced()){this.finishHamster();return}
    if(this.hamsterPlaying)return;
    const name=this.pick(this.interactivePool(),this.recentHamster);
    this.recentHamster=[name,...this.recentHamster].slice(0,2);
    this.hamsterStartedAt=this.now();
    this.clear(this.hamsterTimer);
    this.playClip(name,{interactive:true});
  },
  pokeButton(event){
    event.preventDefault();event.stopPropagation();
    if(this.strong||this.hamsterPlaying)return;
    if(window.HamsterWorld&&!HamsterWorld.allowsAmbient())return;
    this.clear(this.hamsterTimer);
    this.playClip('lookButton',{interactive:true});
  },
  pokeCup(event,id){
    event.preventDefault();event.stopPropagation();
    const buttons=[...event.currentTarget.parentElement.querySelectorAll('.cc-desk-cup')];
    const index=Math.max(0,buttons.indexOf(event.currentTarget));
    if(this.strong)return;
    if(this.hamsterPlaying){this.queuedCup={index,id};return}
    if(this.coffeePlaying)return;
    this.startCup(index,id,true);
  },
  startCup(index,id,interactive){
    this.playCoffee(index,interactive);
    clearTimeout(window.CoffeeRoom?.detailTimer);
    if(!window.CoffeeRoom)return;
    const delay=this.reduced()?0:420;
    CoffeeRoom.detailTimer=setTimeout(()=>CoffeeRoom.detail(id),delay);
  },
  spriteRect(id){
    const scene=window.ProductionScene,pose=scene?.hamsterPose?.(id),a=window.BEANSTER_ASSETS.assets[pose?.id||id];
    if(pose&&a)return {x:pose.x-a.pivotX*pose.scale,y:pose.y-a.pivotY*pose.scale,w:a.canvas[0]*pose.scale,h:a.canvas[1]*pose.scale};
    const idle=window.BEANSTER_ASSETS.scene.idle,s=idle.scale;
    return {x:idle.position[0]-a.pivotX*s,y:idle.position[1]-a.pivotY*s,w:a.canvas[0]*s,h:a.canvas[1]*s};
  }
};
window.SceneLife=SceneLife;
if(window.ProductionScene?.canvas)SceneLife.wake();
