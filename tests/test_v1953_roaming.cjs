const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterWorld&&ProductionScene.images.hamster_stand_idle&&ProductionScene.images.hamster_look_button);
const life=await page.evaluate(()=>{
  const before=JSON.stringify(records);
  SceneLife.hold();
  SceneLife.strong=false;SceneLife.hamsterPlaying=false;
  SceneLife.useNativeTimers=false;
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.played=[];
  SceneLife.rand=()=>0;
  HamsterWorld.auto=true;HamsterWorld.trace=[];HamsterWorld.samples=[];
  SceneLife.visit='chairSit';SceneLife.lastAmbient=null;
  HamsterWorld.boot(true);
  SceneLife.pump(8000);
  const anchor=HamsterDirector.worldAnchor('chairSit');
  let moved=0;
  for(const s of HamsterWorld.samples)moved=Math.max(moved,Math.hypot(s.x-anchor.x,s.y-anchor.y));
  const roaming=HamsterWorld.trace.filter(m=>m==='roaming'||m==='returning'||m==='standing-up');
  const walked=HamsterWorld.samples.some(s=>String(s.sprite).startsWith('hamster_walk_'));
  return {moved,roaming:roaming.length,walked,onRoute:HamsterDirector.onRoute,x:HamsterDirector.pose.x,y:HamsterDirector.pose.y,ax:anchor.x,ay:anchor.y,records:JSON.stringify(records)===before,sprite:HamsterDirector.pose.spriteId};
});
assert.ok(life.moved<1,'moved '+life.moved);
assert.equal(life.roaming,0);
assert.equal(life.walked,false);
assert.equal(life.onRoute,false);
assert.equal(life.records,true);
assert.ok(Math.hypot(life.x-life.ax,life.y-life.ay)<2,JSON.stringify(life));

const cleanup=await page.evaluate(()=>{
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;SceneLife.rand=()=>0;
  HamsterWorld.trace=[];HamsterWorld.samples=[];
  SceneLife.visit='chairSit';SceneLife.lastAmbient=null;
  HamsterWorld.boot(true);
  const during=HamsterWorld.mode;
  let ran=false,near=999,ritual=false,roaming=0;
  ProductionScene.cleanup([{id:'yesterday-cup',type:'拿铁',productName:'拿铁',ts:Date.now()-86400000}],()=>{ran=true});
  for(let i=0;i<40;i++){
    SceneLife.pump(500);
    const seat=BEANSTER_ASSETS.scene.tableContact;
    near=Math.min(near,Math.hypot(HamsterDirector.pose.x-seat.x,HamsterDirector.pose.y-seat.y));
    if(HamsterDirector.phase==='ritual'||HamsterDirector.phase==='ending')ritual=true;
    if(HamsterDirector.onRoute||HamsterDirector.mode==='roaming')roaming++;
  }
  const back=HamsterDirector.worldAnchor('chairSit');
  return {during,ran,near,ritual,roaming,state:ProductionScene.interactionState,x:HamsterDirector.pose.x,y:HamsterDirector.pose.y,bx:back.x,by:back.y,name:HamsterDirector.ambientName};
});
assert.equal(cleanup.during,'seated');
assert.equal(cleanup.ran,true,JSON.stringify(cleanup));
assert.equal(cleanup.ritual,true,JSON.stringify(cleanup));
assert.ok(cleanup.near<8,JSON.stringify(cleanup));
assert.equal(cleanup.roaming,0,JSON.stringify(cleanup));
assert.equal(cleanup.state,'idle');
assert.equal(cleanup.name,'tableIdle');
assert.ok(Math.hypot(cleanup.x-390,cleanup.y-772)<8,JSON.stringify(cleanup));

await page.emulateMedia({reducedMotion:'reduce'});
const quiet=await page.evaluate(()=>{
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;
  HamsterWorld.trace=[];HamsterWorld.auto=true;
  SceneLife.visit=null;SceneLife.lastAmbient=null;
  HamsterWorld.boot(true);
  SceneLife.pump(180000);
  return HamsterWorld.trace.filter(m=>m==='roaming').length;
});
assert.equal(quiet,0);
console.log('PASS fixed pose',JSON.stringify({life,cleanup,quiet}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
