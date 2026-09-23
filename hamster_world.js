/* Where the coffee-corner hamster is. SceneLife only plays seated expressions. */
const HamsterWorld={
  mode:'seated',auto:true,cleanupReturn:false,greeting:false,hurry:false,
  x:390,y:714,scale:0.72,facing:1,sprite:'hamster_idle_base',node:'seat',
  walked:0,path:[],pathIndex:0,timer:0,roamTimer:0,trace:[],samples:[],
  rand(){return window.SceneLife?SceneLife.rand():Math.random()},
  reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches},
  has(id){return !!window.BEANSTER_ASSETS?.assets?.[id]},
  cfg(){return window.BEANSTER_ASSETS?.scene?.roam||{}},
  points(){
    return this.cfg().points||{seat:[390,714],emerge:[320,910],floorLeft:[200,940],floorMid:[390,960],floorRight:[560,940]};
  },
  links(){return {seat:['chairSide'],chairSide:['seat','floorLeft'],floorLeft:['chairSide','floorMid'],floorMid:['floorLeft','floorRight'],floorRight:['floorMid']}},
  allowsAmbient(){return this.mode==='seated'&&!this.greeting&&!this.cleanupReturn},
  atSeat(){return this.mode==='seated'&&!this.greeting&&!this.cleanupReturn},
  inFront(){const line=this.cfg().tableFrontY||856;return this.y>=line},
  scaleFor(y){
    const at=this.cfg().scaleAt||[714,948],span=this.cfg().scaleSpan||[0.72,0.8];
    const t=Math.max(0,Math.min(1,(y-at[0])/((at[1]-at[0])||1)));
    return span[0]+(span[1]-span[0])*t;
  },
  placeAt(name){
    const p=this.points()[name]||this.points().seat;
    this.node=name;this.x=p[0];this.y=p[1];this.scale=name==='seat'?0.72:this.scaleFor(this.y);this.facing=1;
    if(name==='seat')this.sprite=window.ProductionScene?.restId?.()||'hamster_idle_base';
  },
  clearSchedule(){
    window.SceneLife?.clear(this.roamTimer);window.SceneLife?.clear(this.timer);
    this.roamTimer=0;this.timer=0;
  },
  onStrong(){this.clearSchedule()},
  boot(first){
    this.clearSchedule();
    this.greeting=false;this.cleanupReturn=false;this.hurry=false;this.started=false;
    this.mode='seated';this.tracePush('seated');this.placeAt('seat');
    this.ensure(!!first);
  },
  ensure(first){
    if(!this.auto||this.reduced()||!window.SceneLife?.onToday()||this.mode!=='seated'||this.roamTimer)return;
    this.schedule(first||!this.started);
  },
  schedule(first){
    window.SceneLife?.clear(this.roamTimer);
    if(!this.auto||this.reduced()||!window.SceneLife?.onToday()||!this.allowsAmbient())return;
    const span=first?(this.cfg().firstDelay||[20000,30000]):(this.cfg().interval||[45000,90000]);
    const delay=Math.round(span[0]+this.rand()*(span[1]-span[0]));
    this.started=true;
    this.roamTimer=SceneLife.later(()=>this.startRoam(),delay);
  },
  tracePush(mode){if(this.trace[this.trace.length-1]!==mode)this.trace.push(mode)},
  remember(){this.samples.push({x:+this.x.toFixed(2),y:+this.y.toFixed(2),mode:this.mode,inFront:this.inFront(),sprite:this.sprite});if(this.samples.length>5000)this.samples.shift()},
  paint(){this.remember();window.ProductionScene?.paint()},
  startRoam(){
    if(this.reduced()||!this.auto)return;
    if(!window.SceneLife?.onToday()||SceneLife.strong||SceneLife.hamsterPlaying){this.roamTimer=SceneLife.later(()=>this.startRoam(),1200);return}
    SceneLife.pauseLower();
    this.clearSchedule();
    const far=this.rand()<0.5?'floorMid':'floorRight';
    const out=['emerge','floorLeft','floorMid'].concat(far==='floorRight'?['floorRight']:[]);
    this.path=out.concat(this.wayBack(out[out.length-1]));
    this.pathIndex=0;this.walked=0;this.hurry=false;this._looked=false;
    const spot=this.points().emerge;
    this.x=spot[0];this.y=spot[1];this.scale=this.scaleFor(this.y);this.node='emerge';
    this.mode='standing-up';this.tracePush('standing-up');
    this.playFrames(['hamster_stand_idle','hamster_stand_idle'],[420,480],()=>{this.mode='roaming';this.tracePush('roaming');this.step()});
  },
  wayBack(node){
    const order=['floorRight','floorMid','floorLeft','emerge','seat'];
    const i=order.indexOf(node);
    return i<0?['chairSide','seat']:order.slice(i+1);
  },
  playFrames(frames,durations,done){
    const token=++this._play||1;this._play=token;
    let i=0;
    const show=()=>{
      if(this._play!==token||this.cleanupReturn&&this.mode!=='standing-up'&&this.mode!=='sitting-down')return;
      this.sprite=frames[Math.min(i,frames.length-1)];
      this.paint();
      const hold=durations[Math.min(i,durations.length-1)]||240;
      i+=1;
      if(i<frames.length)this.timer=SceneLife.later(show,hold);
      else this.timer=SceneLife.later(()=>{if(this._play===token)done()},hold);
    };
    show();
  },
  step(){
    if(this.greeting)return;
    if(this.mode!=='roaming'&&this.mode!=='returning')return;
    const speed=this.hurry?220:110;
    let left=speed*0.1;
    let dxSum=0;
    while(left>0.01&&this.pathIndex<this.path.length){
      const name=this.path[this.pathIndex];
      const target=this.points()[name];
      const dx=target[0]-this.x,dy=target[1]-this.y,dist=Math.hypot(dx,dy)||0.0001;
      const hop=Math.min(left,dist);
      this.x+=dx/dist*hop;this.y+=dy/dist*hop;this.walked+=hop;left-=hop;dxSum+=dx;
      if(hop>=dist-0.01){
        this.node=name;this.pathIndex+=1;this.x=target[0];this.y=target[1];
        const far=this.path.includes('floorRight')?'floorRight':'floorMid';
        if(!this.hurry&&!this._looked&&name===far){
          this._looked=true;
          if(Math.abs(dxSum)>0.5)this.facing=dxSum>0?1:-1;
          this.scale=this.scaleFor(this.y);
          this.lookAround(()=>this.step());
          return;
        }
      }
    }
    if(Math.abs(dxSum)>0.5)this.facing=dxSum>0?1:-1;
    this.scale=this.scaleFor(this.y);
    const frames=this.facing<0?this.walkFrames('left'):this.walkFrames('right');
    this.sprite=frames[Math.floor(this.walked/22)%frames.length];
    if(this.pathIndex>=this.path.length){this.sit();return}
    this.paint();
    this.timer=SceneLife.later(()=>this.step(),100);
  },
  walkFrames(side){
    const ids=[1,2,3,4].map(n=>'hamster_walk_'+side+'_0'+n).filter(id=>this.has(id));
    return ids.length?ids:['hamster_stand_idle'];
  },
  lookAround(done){
    this.facing=1;
    const frames=this.has('hamster_look_around')?['hamster_stand_idle','hamster_look_around','hamster_stand_idle']:['hamster_stand_idle','hamster_stand_wave','hamster_stand_idle'];
    this.playFrames(frames,[420,780,460],()=>{
      this.mode='returning';this.tracePush('returning');
      done();
    });
  },
  sit(done){
    this.mode='sitting-down';this.tracePush('sitting-down');
    this.placeAt('seat');
    const frames=this.has('hamster_stand_up')?['hamster_stand_idle','hamster_stand_up','hamster_idle_base']:['hamster_stand_idle','hamster_idle_base'];
    const durations=frames.length===3?[280,360,320]:[360,320];
    const cleaning=!!this.onSeated;
    this.playFrames(frames,durations,()=>{
      this.mode='seated';this.tracePush('seated');this.sprite='hamster_idle_base';this.hurry=false;this._looked=false;
      this.paint();
      const after=this.onSeated;this.onSeated=null;this.cleanupReturn=false;
      if(after)after();
      else window.SceneLife?.resumeAmbient?.();
      if(!cleaning)this.schedule(false);
    });
  },
  greet(){
    if(this.cleanupReturn||this.reduced()||this.greeting||(this.mode!=='roaming'&&this.mode!=='returning'))return;
    this.greeting=true;
    window.SceneLife?.clear(this.timer);
    this.facing=1;
    const frames=this.has('hamster_stand_wave')?['hamster_stand_wave','hamster_stand_idle','hamster_stand_wave']:['hamster_stand_idle'];
    this.playFrames(frames,[320,360,340],()=>{
      this.greeting=false;
      if(this.mode==='roaming'||this.mode==='returning')this.step();
    });
  },
  noteRecord(){
    if(this.cleanupReturn||(this.mode!=='roaming'&&this.mode!=='returning'))return;
    window.SceneLife?.clear(this.timer);
    this.timer=SceneLife.later(()=>{if(!this.greeting)this.step()},600);
  },
  returnForCleanup(done){
    this.greeting=false;this._play=(this._play||0)+1;
    window.SceneLife?.hold();
    if(this.mode==='seated'){done();return}
    this.cleanupReturn=true;this.hurry=true;this._looked=true;this.onSeated=done;
    const seat=this.points().seat;
    if(Math.hypot(this.x-seat[0],this.y-seat[1])<28){this.sit();return}
    this.path=this.node==='seat'?['seat']:this.wayBack(this.node);
    this.pathIndex=0;
    this.mode='returning';this.tracePush('returning');
    if(!this.path.length){this.sit();return}
    this.step();
  }
};
window.HamsterWorld=HamsterWorld;
if(typeof saveRecord==='function'&&!saveRecord.roamWrapped){
  const inner=saveRecord;
  saveRecord=async function(){const n=records.length;const out=await inner.apply(this,arguments);if(records.length>n)HamsterWorld.noteRecord();return out};
  saveRecord.roamWrapped=true;
}
if(window.SceneLife&&document.querySelector('.page.active')?.id==='today')HamsterWorld.boot(true);
