const path=require('path'),fs=require('fs');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.resolve(__dirname,'../qa/v1957/frames');
fs.mkdirSync(dir,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&ProductionScene.images.hamster_walk_left_01);
const end=await page.evaluate(()=>{
  SceneLife.hold();SceneLife.strong=false;SceneLife.useNativeTimers=false;SceneLife.queue=[];SceneLife.clock=0;
  HamsterWorld.auto=true;HamsterDirector.boot();
  SceneLife.queue=[];SceneLife.clock=0;
  HamsterDirector.stopMotion();
  HamsterDirector.onRoute=true;HamsterDirector.roamT=0;HamsterDirector.showRoam();
  return HamsterDirector.roamEnd();
});
for(let ms=0;ms<=end;ms+=100){
  if(ms)await page.evaluate(()=>{SceneLife.pump(100);ProductionScene.paint()});
  const file=path.join(dir,String(ms).padStart(5,'0')+'.png');
  await page.locator('[data-scene]').screenshot({path:file,animations:'disabled'});
  if(ms%1000===0)console.log('frame',ms);
}
console.log('FRAMES',end);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
