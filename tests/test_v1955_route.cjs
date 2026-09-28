const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const marks=[[0,'seat'],[1400,'behind'],[4600,'behind'],[4700,'front'],[6200,'front'],[7800,'front'],[17600,'seat']];
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
  let prev=null;
  for(let ms=0;ms<=HamsterDirector.roamEnd();ms+=100){
    const p=HamsterDirector.poseAt(ms);
    if(p.depth==='front'&&(p.y<970||p.x<230||p.x>530))bad.push(ms+' front '+Math.round(p.x)+','+Math.round(p.y));
    if(prev&&prev.depth!==p.depth&&(prev.depth==='front'||p.depth==='front')&&(p.x>260||p.y<960))bad.push(ms+' switch '+prev.depth+'>'+p.depth+' '+Math.round(p.x)+','+Math.round(p.y));
    prev=p;
  }
  const out=[];
  let clock=0;
  for(const [ms,depth] of marks){
    SceneLife.pump(ms-clock);
    clock=ms;
    const p=HamsterDirector.pose;
    const want=HamsterDirector.poseAt(ms);
    out.push({ms,depth:p.depth,want:want.depth,x:Math.round(p.x),y:Math.round(p.y),wx:Math.round(want.x),wy:Math.round(want.y),dx:Math.round(Math.hypot(p.x-want.x,p.y-want.y)),match:Math.round(Math.hypot(p.x-want.x,p.y-want.y))<8&&p.depth===want.depth});
  }
  return {bad,out,end:HamsterDirector.roamEnd()};
},marks);
assert.deepEqual(live.bad,[]);
assert.equal(live.end,17600);
for(const row of live.out)assert.ok(row.match,JSON.stringify(row));
const again=await page.evaluate(()=>HamsterDirector.poseAt(6200));
assert.equal(again.depth,'front');
assert.ok(Math.abs(again.x-390)<30&&again.y>=970,JSON.stringify(again));
const ritual=await page.evaluate(()=>{
  records=[{id:'old',ts:Date.now()-86400000,type:'拿铁',productName:'拿铁',caffeine:80}];
  settings.coffeeDesk={day:'2000-01-01',ids:['old']};
  renderToday();
  CoffeeRoom.ritual=[{id:'old',ts:Date.now()-86400000,type:'拿铁',productName:'拿铁'}];
  CoffeeRoom.startRitual();
  const corner=document.querySelector('.cc-corner');
  const banner=document.querySelector('.cc-ritual-banner');
  const empty=getComputedStyle(document.querySelector('.cc-empty-desk')).display;
  const hit=getComputedStyle(document.querySelector('.cc-collect-hit')).pointerEvents;
  const bannerInCorner=corner.contains(banner);
  return {active:corner.classList.contains('cc-ritual-active'),empty,hit,bannerInCorner,hidden:banner.hidden,text:banner.innerText.replace(/\s+/g,' ')};
});
assert.equal(ritual.active,true);
assert.equal(ritual.empty,'none');
assert.equal(ritual.hit,'none');
assert.equal(ritual.bannerInCorner,false);
assert.equal(ritual.hidden,false);
assert.match(ritual.text,/收进回忆/);
assert.doesNotMatch(ritual.text,/还没有放上今天的咖啡/);
console.log('PASS V19.5.7 route',live.out.map(r=>r.ms+':'+r.depth+'@'+r.x+','+r.y).join(' '));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
