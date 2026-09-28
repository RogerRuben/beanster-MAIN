const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterWorld&&ProductionScene.images.hamster_stand_idle&&ProductionScene.images.hamster_walk_right_01);
const life=await page.evaluate(()=>{
  const before=JSON.stringify(records);
  SceneLife.hold();
  SceneLife.strong=false;SceneLife.hamsterPlaying=false;
  SceneLife.useNativeTimers=false;
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.played=[];
  SceneLife.rand=()=>0;
  HamsterWorld.auto=true;HamsterWorld.trace=[];HamsterWorld.samples=[];
  SceneLife.visit='windowSeat';SceneLife.lastAmbient=null;
  HamsterWorld.boot(true);
  SceneLife.pump(8000);
  const order=['seated','roaming','seated'];
  let at=0;
  for(const mode of HamsterWorld.trace){if(mode===order[at])at++;if(at===order.length)break}
  let jump=0;
  for(let i=1;i<HamsterWorld.samples.length;i++){
    const a=HamsterWorld.samples[i-1],b=HamsterWorld.samples[i];
    if(a.mode==='seated'||b.mode==='seated')continue;
    jump=Math.max(jump,Math.hypot(a.x-b.x,a.y-b.y));
  }
  const off=HamsterWorld.samples.filter(s=>s.x<40||s.x>740||s.y<520||s.y>1000);
  const front=HamsterWorld.samples.filter(s=>s.y>=970);
  const frontBad=front.filter(s=>!s.inFront);
  const tableCut=HamsterWorld.samples.filter(s=>s.x>140&&s.x<630&&s.y>810&&s.y<856&&s.inFront);
  const atWindow=HamsterWorld.samples.some(s=>s.y<700&&s.x>260&&s.x<360);
  return {order:at===order.length,trace:HamsterWorld.trace,jump,off:off.length,front:front.length,frontBad:frontBad.length,tableCut:tableCut.length,atWindow,records:JSON.stringify(records)===before,sprites:[...new Set(HamsterWorld.samples.map(s=>s.sprite))]};
});
assert.equal(life.order,true,life.trace.join('>'));
assert.ok(life.jump<30,'jump '+life.jump);
assert.equal(life.off,0);
assert.equal(life.atWindow,true,life.trace.join('>'));
assert.equal(life.frontBad,0);
assert.equal(life.tableCut,0);
assert.equal(life.records,true);
assert.ok(life.sprites.some(id=>String(id).startsWith('hamster_walk_')));

const cleanup=await page.evaluate(()=>{
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;SceneLife.rand=()=>0;
  HamsterWorld.trace=[];HamsterWorld.samples=[];
  SceneLife.visit='windowSeat';SceneLife.lastAmbient=null;
  HamsterWorld.boot(true);
  SceneLife.pump(8000);
  const during=HamsterWorld.mode;
  let ran=false,near=999,ritual=false;
  ProductionScene.cleanup([],()=>{ran=true});
  for(let i=0;i<40;i++){
    SceneLife.pump(500);
    const seat=BEANSTER_ASSETS.scene.tableContact;
    near=Math.min(near,Math.hypot(HamsterDirector.pose.x-seat.x,HamsterDirector.pose.y-seat.y));
    if(HamsterDirector.phase==='ritual'||HamsterDirector.phase==='ending')ritual=true;
  }
  return {during,mode:HamsterWorld.mode,ran,near,ritual,x:HamsterWorld.x,y:HamsterWorld.y,state:ProductionScene.interactionState};
});
assert.equal(cleanup.during,'seated');
assert.equal(cleanup.ran,true,JSON.stringify(cleanup));
assert.equal(cleanup.ritual,true,JSON.stringify(cleanup));
assert.ok(cleanup.near<30,JSON.stringify(cleanup));
assert.equal(cleanup.state,'idle');

await page.emulateMedia({reducedMotion:'reduce'});
const quiet=await page.evaluate(()=>{
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;
  HamsterWorld.trace=[];HamsterWorld.auto=true;
  HamsterWorld.boot(true);
  SceneLife.pump(180000);
  return HamsterWorld.trace.filter(m=>m==='roaming').length;
});
assert.equal(quiet,0);
fs.mkdirSync(path.resolve(__dirname,'../qa/v1953'),{recursive:true});
await page.emulateMedia({reducedMotion:'no-preference'});
const poses=[[22000,'roam-1.png'],[2500,'roam-2.png'],[4000,'roam-3.png']];
await page.evaluate(()=>{
  SceneLife.hold();SceneLife.strong=false;SceneLife.hamsterPlaying=false;
  SceneLife.useNativeTimers=false;SceneLife.queue=[];SceneLife.clock=0;SceneLife.rand=()=>0;
  HamsterWorld.auto=true;HamsterWorld.boot(true);
});
for(const [ms,file] of poses){
  const pose=await page.evaluate(step=>{SceneLife.pump(step);return {mode:HamsterWorld.mode,sprite:HamsterWorld.sprite,x:Math.round(HamsterWorld.x),y:Math.round(HamsterWorld.y)}},ms);
  await page.locator('[data-scene]').screenshot({path:path.resolve(__dirname,'../qa/v1953/'+file)});
  console.log(file,pose.mode,pose.sprite,pose.x,pose.y);
}
console.log('PASS V19.5.3 roaming',life.trace.join('>'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
