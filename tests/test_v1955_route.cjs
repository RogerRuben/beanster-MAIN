const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const marks=[[0,'seat'],[1400,'behind'],[4300,'front'],[5800,'front'],[7300,'front'],[16600,'seat']];
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage();
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&ProductionScene.images.hamster_seat_exit_01);
const live=await page.evaluate(marks=>{
  SceneLife.hold();
  SceneLife.strong=false;
  SceneLife.useNativeTimers=false;
  SceneLife.queue=[];SceneLife.clock=0;
  HamsterWorld.auto=true;
  HamsterDirector.boot();
  SceneLife.queue=[];SceneLife.clock=0;
  HamsterDirector.stopMotion();
  HamsterDirector.onRoute=true;
  HamsterDirector.roamT=0;
  HamsterDirector.phase='roam';
  HamsterDirector.showRoam();
  const bad=[];
  for(let ms=0;ms<=HamsterDirector.roamEnd();ms+=100){
    const p=HamsterDirector.poseAt(ms);
    if(p.depth==='front'&&p.y<900)bad.push(ms+' front y '+p.y);
    if(p.depth==='behind'&&p.y>=900)bad.push(ms+' behind y '+p.y);
  }
  const out=[];
  let prev=0;
  for(const [ms,depth] of marks){
    SceneLife.pump(ms-prev);
    prev=ms;
    const p=HamsterDirector.pose;
    const want=HamsterDirector.poseAt(ms);
    out.push({ms,depth:p.depth,want:want.depth,x:Math.round(p.x),y:Math.round(p.y),match:Math.hypot(p.x-want.x,p.y-want.y)<1&&p.depth===depth});
  }
  return {bad,out,end:HamsterDirector.roamEnd()};
},marks);
assert.deepEqual(live.bad,[]);
assert.equal(live.end,16600);
for(const row of live.out)assert.ok(row.match,JSON.stringify(row));
const again=await page.evaluate(()=>HamsterDirector.poseAt(5800));
assert.equal(again.depth,'front');
assert.ok(again.y>=935&&again.y<=950,again.y);
console.log('PASS V19.5.6 route',live.out.map(r=>r.ms+':'+r.depth+'@'+r.x+','+r.y).join(' '));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
