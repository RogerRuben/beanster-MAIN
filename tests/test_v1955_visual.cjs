const assert=require('assert/strict'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const shots=[[0,'route_00_seated'],[1400,'route_01_behind'],[4300,'route_02_left'],[5800,'route_03_mid'],[7300,'route_04_right'],[16600,'route_06_seated']];
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&ProductionScene.images.hamster_walk_right_01);
const dir=path.resolve(__dirname,'../qa/v1956');
fs.mkdirSync(dir,{recursive:true});
await page.evaluate(()=>{
  SceneLife.hold();SceneLife.strong=false;SceneLife.useNativeTimers=false;SceneLife.queue=[];SceneLife.clock=0;
  HamsterWorld.auto=true;HamsterDirector.boot();
  SceneLife.queue=[];SceneLife.clock=0;
  HamsterDirector.stopMotion();
  HamsterDirector.onRoute=true;HamsterDirector.roamT=0;HamsterDirector.showRoam();
});
let prev=0;const hashes=[];
for(const [ms,name] of shots){
  await page.evaluate(step=>{SceneLife.pump(step);ProductionScene.paint()},ms-prev);
  prev=ms;
  const file=path.join(dir,name+'.png');
  await page.locator('[data-scene]').screenshot({path:file,animations:'disabled'});
  hashes.push(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  console.log(name,await page.evaluate(()=>({mode:HamsterDirector.mode,sprite:HamsterDirector.pose.spriteId,x:Math.round(HamsterDirector.pose.x),y:Math.round(HamsterDirector.pose.y),layers:document.querySelector('[data-scene]').dataset.hamsterLayers})));
}
for(let i=1;i<hashes.length;i++)assert.notEqual(hashes[i],hashes[i-1],shots[i][1]+' matches '+shots[i-1][1]);
assert.equal(hashes[0],hashes.at(-1));
for(const name of ['blink','lookCup','smile','clap','wipe']){
  await page.evaluate(action=>{
    SceneLife.queue=[];SceneLife.clock=0;HamsterDirector.check=true;HamsterDirector.stopMotion();
    HamsterDirector.playAction(action,()=>{});
    SceneLife.pump(Math.floor(HamsterDirector.total(action)/2));
    ProductionScene.paint();
  },name);
  await page.locator('[data-scene]').screenshot({path:path.join(dir,'action_'+name+'.png'),animations:'disabled'});
  const layers=await page.evaluate(()=>document.querySelector('[data-scene]').dataset.hamsterLayers);
  assert.equal(layers,'1',name);
}
console.log('PASS V19.5.6 visual',hashes.length);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
