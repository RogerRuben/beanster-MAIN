const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&ProductionScene.images.hamster_sleep_01);
const report=await page.evaluate(async()=>{
  SceneLife.useNativeTimers=false;SceneLife.queue=[];SceneLife.clock=0;SceneLife.strong=false;
  SceneLife.visit=null;SceneLife.lastAmbient='windowSeat';SceneLife.rand=()=>0;
  const picked=SceneLife.chooseAmbient();
  const same=SceneLife.chooseAmbient();
  const before=JSON.stringify(records);
  const homes=[];
  for(const name of ['windowSeat','cabinetInspect','floorNap']){
    SceneLife.queue=[];SceneLife.clock=0;SceneLife.visit=name;SceneLife.lastAmbient=null;
    let calls=0,snap=null;
    HamsterDirector.boot();
    for(let i=0;i<80&&HamsterDirector.onRoute;i++)SceneLife.pump(200);
    HamsterDirector.requestCleanup([{id:'old-'+name,type:'拿铁',productName:'拿铁',ts:Date.now()-86400000}],()=>{calls++;snap={phase:HamsterDirector.phase,lock:SceneLife.strong,x:HamsterDirector.pose.x,y:HamsterDirector.pose.y}});
    for(let i=0;i<150&&!calls;i++)SceneLife.pump(200);
    homes.push(Object.assign({name,calls},snap));
  }
  ProductionScene.previewDesk=4;
  ProductionScene.paint();
  const preview=ProductionScene.deskRows().length;
  ProductionScene.previewDesk=null;
  return {picked,same,records:JSON.stringify(records)===before,preview,homes};
});
assert.equal(report.picked,'cabinetInspect');
assert.equal(report.same,'cabinetInspect');
assert.equal(report.records,true);
assert.equal(report.preview,4);
for(const row of report.homes){
  assert.equal(row.calls,1,JSON.stringify(row));
  assert.equal(row.lock,false,JSON.stringify(row));
  assert.ok(Math.hypot(row.x-390,row.y-772)<40,JSON.stringify(row));
}
console.log('PASS ambient',JSON.stringify(report.homes));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
