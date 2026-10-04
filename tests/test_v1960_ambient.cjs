const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&ProductionScene.images.hamster_sleep_01&&ProductionScene.images.hamster_stand_idle);
const report=await page.evaluate(()=>{
  SceneLife.useNativeTimers=false;SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;
  SceneLife.visit=null;SceneLife.lastAmbient='tableIdle';SceneLife.rand=()=>0;
  const picked=SceneLife.chooseAmbient();
  const same=SceneLife.chooseAmbient();
  const before=JSON.stringify(records);
  const homes=[];
  for(const name of ['tableIdle','chairSit','cabinetLook','floorRest']){
    SceneLife.queue=[];SceneLife.clock=0;SceneLife.visit=name;SceneLife.lastAmbient=null;
    HamsterWorld.trace=[];HamsterWorld.samples=[];
    HamsterDirector.boot();
    const anchor=HamsterDirector.worldAnchor(name);
    SceneLife.pump(6000);
    const stay=HamsterWorld.samples.filter(s=>s.mode==='seated');
    let moved=0;
    for(const s of stay)moved=Math.max(moved,Math.hypot(s.x-anchor.x,s.y-anchor.y));
    const walked=HamsterWorld.samples.some(s=>String(s.sprite).startsWith('hamster_walk_')||s.mode==='roaming');
    let calls=0,snap=null;
    HamsterDirector.requestCleanup([{id:'old-'+name,type:'拿铁',productName:'拿铁',ts:Date.now()-86400000}],()=>{calls++;snap={phase:HamsterDirector.phase,lock:SceneLife.strong,x:HamsterDirector.pose.x,y:HamsterDirector.pose.y,onRoute:HamsterDirector.onRoute}});
    for(let i=0;i<40&&!calls;i++)SceneLife.pump(200);
    SceneLife.pump(400);
    homes.push({name,calls,moved:+moved.toFixed(2),walked,onRoute:HamsterDirector.onRoute,back:HamsterDirector.ambientName,x:+HamsterDirector.pose.x.toFixed(1),y:+HamsterDirector.pose.y.toFixed(1),ax:+anchor.x.toFixed(1),ay:+anchor.y.toFixed(1),snap});
  }
  ProductionScene.previewDesk=4;
  ProductionScene.paint();
  const preview=ProductionScene.deskRows().length;
  ProductionScene.previewDesk=null;
  return {picked,same,records:JSON.stringify(records)===before,preview,homes,weights:Object.entries(HamsterDirector.scenePosePresets).map(([id,row])=>[id,row.weight,row.behavior])};
});
assert.equal(report.picked,'chairSit');
assert.equal(report.same,'chairSit');
assert.equal(report.records,true);
assert.equal(report.preview,4);
assert.deepEqual(report.weights,[['tableIdle',40,'table'],['chairSit',25,'chair'],['cabinetLook',20,'cabinet'],['floorRest',15,'floor']]);
for(const row of report.homes){
  assert.equal(row.calls,1,JSON.stringify(row));
  assert.equal(row.walked,false,JSON.stringify(row));
  assert.ok(row.moved<1,JSON.stringify(row));
  assert.equal(row.snap.lock,false,JSON.stringify(row));
  assert.equal(row.snap.onRoute,false,JSON.stringify(row));
  assert.ok(Math.hypot(row.snap.x-390,row.snap.y-772)<8,JSON.stringify(row));
  assert.equal(row.back,'tableIdle',JSON.stringify(row));
  assert.ok(Math.hypot(row.x-390,row.y-772)<8,JSON.stringify(row));
  assert.equal(row.onRoute,false,JSON.stringify(row));
}
console.log('PASS poses',JSON.stringify(report.homes));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
