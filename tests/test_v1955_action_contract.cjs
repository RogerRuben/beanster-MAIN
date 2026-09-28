const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage();
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.HamsterDirector&&window.BEANSTER_ASSETS.assets.hamster_seat_exit_01);
const report=await page.evaluate(()=>{
  const D=HamsterDirector,A=D.ACTIONS;
  const expect={
    blink:1400,lookCup:2300,smile:2200,glad:2500,nod:2200,lookUser:2200,
    seatExit:1400,seatEnter:1400,walkLeft:800,walkRight:800,lookAround:2000,
    clap:1500,wipe:1800,steam:2500,condensation:2000,sparkle:1300
  };
  const bad=[];
  for(const [name,ms] of Object.entries(expect)){
    const action=A[name];
    if(!action){bad.push(name+':missing');continue}
    if(action.frames.length!==action.durations.length)bad.push(name+':len');
    if(action.durations.reduce((s,n)=>s+n,0)!==ms)bad.push(name+':total');
    if(action.frames.some(id=>!BEANSTER_ASSETS.assets[id]&&!String(id).startsWith('fx_')))bad.push(name+':asset');
  }
  if(A.seatExit.frames[0]!=='hamster_seat_exit_01'||A.seatExit.frames.at(-1)!=='hamster_seat_exit_04')bad.push('exit:ends');
  if(A.seatEnter.frames[0]!=='hamster_seat_enter_01'||A.seatEnter.frames.at(-1)!=='hamster_seat_enter_04')bad.push('enter:ends');
  if(A.wipe.frames.join()!==['hamster_idle_base','hamster_seated_wipe_start','hamster_seated_wipe_01','hamster_seated_wipe_hold','hamster_seated_wipe_release','hamster_idle_base'].join())bad.push('wipe:order');
  if(A.wipe.frames.includes('hamster_seated_glad_01'))bad.push('wipe:glad');
  const scene=400+D.total('blink')+D.total('lookCup')+D.total('smile')+D.roamEnd()+D.total('steam')+1500+D.total('wipe');
  return {bad,depart:D.departMs(),repeat:D.repeatMs(),roam:D.roamEnd(),scene,clicks:D.CLICKS.join()};
});
assert.deepEqual(report.bad,[]);
assert.equal(report.depart,17700);
assert.equal(report.roam,17600);
assert.equal(report.repeat,59900);
assert.ok(report.scene>=25000&&report.scene<=35000,report.scene);
assert.equal(report.clicks,'glad,nod,lookUser,glasses');
const saved=await page.evaluate(()=>{
  settings.dashboardMascotMode='custom';
  settings.dashboardMascotId='character_takeaway';
  persist();
  return Dashboard.companionId();
});
assert.equal(saved,'character_takeaway');
page.on('pageerror',e=>console.log('PAGE',e.message));
await page.reload({waitUntil:'load',timeout:60000});
const again=await page.evaluate(()=>({url:location.href,dash:typeof Dashboard,id:typeof Dashboard==='undefined'?null:Dashboard.companionId(),mode:typeof settings==='undefined'?null:settings.dashboardMascotMode}));
console.log('reload',JSON.stringify(again));
assert.equal(again.id,'character_takeaway');
console.log('PASS V19.5.5 action contract',report.scene);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
