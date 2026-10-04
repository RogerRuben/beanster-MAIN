/* Clock and request front for the coffee corner. HamsterDirector owns playback. */
const SceneLife={
  seq:0,queue:[],useNativeTimers:true,clock:0,
  hamsterTimer:0,coffeeTimer:0,frameTimer:0,
  hamsterPlaying:false,coffeePlaying:false,strong:false,
  recentHamster:[],recentCoffee:[],
  fxIndex:-1,fxFrame:null,pulses:{},zzz:null,played:[],
  queuedCup:null,
  base:'hamster_idle_base',
  rand:Math.random,
  fxDurations:{
    steam:[420,560,640,520,360],
    condensation:[320,420,520,420,320],
    sparkle:[200,260,340,280,220],
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
    const actions=window.HamsterDirector?.ACTIONS||{};
    const out={};
    for(const name of ['blink','lookCup','smile','glad','glasses','nod','lookUser','tap','lookButton']){
      const action=actions[name];
      if(action)out[name]={frames:action.frames,durationsMs:action.durations};
    }
    return out;
  },
  audit(){
    const bad=[];
    for(const [name,clip] of Object.entries(this.library())){
      const frames=clip.frames;
      if(frames[0]!==this.base||frames[frames.length-1]!==this.base)bad.push(name+':ends');
      if(!clip.durationsMs||clip.durationsMs.length!==frames.length)bad.push(name+':durations');
      const total=(clip.durationsMs||[]).reduce((s,n)=>s+n,0);
      const interactive=['glad','glasses','nod','lookUser','tap','smile','lookButton'].includes(name);
      if(total<(interactive?1800:1400))bad.push(name+':short');
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
  roll(kind){return kind==='hamster'?4000:22000},
  reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches},
  onToday(){return document.querySelector('.page.active')?.id==='today'},
  visit:null,lastAmbient:null,
  chooseAmbient(){
    if(this.visit)return this.visit;
    const presets=window.HamsterDirector?.scenePosePresets;
    const all=presets?Object.entries(presets).map(([name,row])=>[name,row.weight]):[['tableIdle',40],['chairSit',25],['cabinetLook',20],['floorRest',15]];
    const pool=all.filter(([name])=>name!==this.lastAmbient);
    const total=pool.reduce((sum,row)=>sum+row[1],0);
    let roll=Math.floor(this.rand()*total);
    let pick=pool[0][0];
    for(const [name,weight] of pool){roll-=weight;if(roll<0){pick=name;break}}
    this.visit=pick;
    return pick;
  },
  leaveAmbient(){
    if(this.visit)this.lastAmbient=this.visit;
    this.visit=null;
    window.HamsterDirector?.pause();
  },
  hold(){
    this.strong=true;
    this.hamsterPlaying=false;this.coffeePlaying=false;this.fxFrame=null;this.zzz=null;this.pulses={};this.queuedCup=null;
    window.HamsterDirector?.pause();
  },
  wake(){
    this.strong=false;
    this.hamsterPlaying=false;this.coffeePlaying=false;
    window.HamsterDirector?.resume();
  },
  fxAt(index){return window.HamsterDirector?.fxAt?.(index)||null},
  cupScale(){return 1},
  sceneLocked(){return !!document.querySelector('.cc-corner.cc-ritual-active')},
  pokeHamster(event){
    event?.preventDefault();event?.stopPropagation();
    if(this.strong||this.reduced()||this.sceneLocked())return;
    window.HamsterDirector?.click();
  },
  pokeButton(event){
    event?.preventDefault();event?.stopPropagation();
    if(this.strong||this.sceneLocked())return;
    const dir=window.HamsterDirector;
    if(!dir||dir.onRoute||dir.mode!=='seated')return;
    const preset=dir.ambientName&&dir.preset?.(dir.ambientName);
    if(preset&&preset.behavior!=='table')return;
    if(preset)dir.playAnchored('lookButton',()=>{dir.rank=20;dir.ambientLoop()});
    else dir.playAction('lookButton',()=>{dir.rank=20;if(dir.ambientName)dir.ambientLoop();else dir.stepLoop()});
  },
  pokeCup(event,id){
    event?.preventDefault();event?.stopPropagation();
    if(this.strong||this.sceneLocked())return;
    const buttons=[...event.currentTarget.parentElement.querySelectorAll('.cc-desk-cup')];
    const index=Math.max(0,buttons.indexOf(event.currentTarget));
    window.HamsterDirector?.playCoffee(true);
    clearTimeout(window.CoffeeRoom?.detailTimer);
    if(!window.CoffeeRoom)return;
    CoffeeRoom.detailTimer=setTimeout(()=>CoffeeRoom.detail(id),this.reduced()?0:420);
  },
  spriteRect(id){
    const scene=window.ProductionScene,pose=scene?.hamsterPose?.(id),a=window.BEANSTER_ASSETS.assets[pose?.id||id];
    if(pose&&a)return {x:pose.x-a.pivotX*pose.scale,y:pose.y-a.pivotY*pose.scale,w:a.canvas[0]*pose.scale,h:a.canvas[1]*pose.scale};
    const idle=window.BEANSTER_ASSETS.scene.idle,s=idle.scale;
    return {x:idle.position[0]-256*s,y:idle.position[1]-448*s,w:512*s,h:512*s};
  }
};
window.SceneLife=SceneLife;
