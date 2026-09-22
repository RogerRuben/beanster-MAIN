const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage();
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.SceneLife&&window.BEANSTER_ASSETS);
const report=await page.evaluate(()=>{
  const bad=SceneLife.audit();
  const lib=SceneLife.library();
  const totals={};
  for(const [name,clip] of Object.entries(lib))totals[name]=clip.durationsMs.reduce((s,n)=>s+n,0);
  const fx={};
  for(const [name,dur] of Object.entries(SceneLife.fxDurations))fx[name]=dur.reduce((s,n)=>s+n,0);
  const wipe=BEANSTER_ASSETS.animations.wipe;
  const clap=BEANSTER_ASSETS.animations.clap;
  return {bad,totals,fx,wipe:wipe.durationsMs.reduce((s,n)=>s+n,0),clap:clap.durationsMs.reduce((s,n)=>s+n,0),wipeFrames:wipe.frames};
});
assert.deepEqual(report.bad,[]);
for(const [name,total] of Object.entries(report.totals)){
  const interactive=['glad','glasses','nod','lookUser','tap','smile','lookButton'].includes(name);
  assert.ok(total>=(interactive?1000:800),name+' '+total);
}
assert.ok(report.fx.steam>=1200&&report.fx.condensation>=900&&report.fx.sparkle>=700);
assert.ok(report.wipe>=1200,report.wipe);
assert.ok(report.clap>=1100,report.clap);
assert.equal(await page.evaluate(()=>{settings.dashboardMascotMode='custom';settings.dashboardMascotId='character_takeaway';records=[{id:'cap',ts:Date.now(),type:'拿铁',productName:'拿铁',caffeine:500}];settings.dailyLimit=400;return Dashboard.companionId()}),'character_takeaway');
assert.equal(await page.evaluate(()=>{settings.dashboardMascotMode='auto';return Dashboard.companionId()}),'character_late_night');
assert.equal(report.wipeFrames[0],'hamster_idle_base');
assert.equal(report.wipeFrames.at(-1),'hamster_idle_base');
await page.evaluate(()=>Dashboard.open());
await page.locator('#uDashboard').screenshot({path:path.resolve(__dirname,'../qa/v1953/dashboard-mascot.png')});
assert.match(await page.locator('#uDashboard').innerText(),/自动跟随状态/);
assert.match(await page.locator('#uDashboard').innerText(),/挥手招呼/);
console.log('PASS V19.5.3 motion timing',report.wipe,report.clap);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
