const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
await page.waitForFunction(()=>window.SceneLife&&ProductionScene.images.hamster_idle_base);
assert.deepEqual(await page.evaluate(()=>SceneLife.audit()),[]);
await page.evaluate(()=>{settings.homeSwipeHintSeen=false;records=[];renderToday()});
assert.match(await page.locator('#today .cc-page-mark').innerText(),/左右滑动/);
await page.locator('[data-scene]').click({position:{x:12,y:12}});
await page.waitForTimeout(80);
assert.equal(await page.evaluate(()=>document.querySelector('[data-scene]').dataset.playing||''),'');

const life=await page.evaluate(()=>{
  records=[{id:'life',ts:Date.now(),type:'拿铁',productName:'拿铁',caffeine:80}];
  settings.coffeeDesk={day:CoffeeRoom.today(),ids:['life']};
  settings.dailyLimit=400;
  renderToday();
  SceneLife.hold();
  SceneLife.useNativeTimers=false;
  SceneLife.queue=[];SceneLife.clock=0;SceneLife.played=[];SceneLife.recentHamster=[];SceneLife.recentCoffee=[];
  let n=0;const seq=[0.1,0.95,0.3,0.7,0.55,0.2,0.8,0.4,0.15,0.85];
  SceneLife.rand=()=>seq[n++%seq.length];
  SceneLife.wake();
  const ys=[];const orig=ProductionScene.sprite.bind(ProductionScene);
  ProductionScene.sprite=function(ctx,id,x,y,scale,alpha){if(String(id).startsWith('hamster_'))ys.push(y);return orig(ctx,id,x,y,scale,alpha)};
  SceneLife.pump(60000);
  ProductionScene.sprite=orig;
  const idleY=BEANSTER_ASSETS.scene.idle.position[1];
  const ham=SceneLife.played.filter(name=>!name.startsWith('cup:'));
  const cups=SceneLife.played.filter(name=>name.startsWith('cup:'));
  return {idleY,ys,ham,cups,delays:[SceneLife.roll('hamster',false),SceneLife.roll('coffee',false)]};
});
assert.ok(life.ham.length>=2,life.ham.join(','));
assert.ok(new Set(life.ham).size>=2,life.ham.join(','));
assert.ok(life.cups.length>=1,life.cups.join(','));
assert.notEqual(life.delays[0],life.delays[1]);
assert.ok(life.ys.length>=2);
assert.ok(life.ys.every(y=>y===life.idleY),life.ys.join(','));

await page.evaluate(()=>UI.go('dashboard'));
assert.equal(await page.locator('#dashboard .cc-data-heading h1').innerText(),'今天喝得刚刚好');
assert.equal(await page.locator('#dashboard .cc-data-heading span').innerText(),'看见今天的咖啡节奏');
assert.equal(await page.locator('#dashboardContent .cc-page-mark').innerText(),'○ ●');
await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
const gap=await page.evaluate(()=>{const btn=document.querySelector('.cc-data-collection').getBoundingClientRect();const nav=document.querySelector('.nav').getBoundingClientRect();return Math.round(nav.top-btn.bottom)});
assert.ok(gap>=8,'collection link is covered by the nav: '+gap);

const swap=await page.evaluate(async()=>{
  const seen=[];
  const orig=CoffeeRoom.showCollection.bind(CoffeeRoom);
  CoffeeRoom.showCollection=function(){seen.push({active:$('collection').classList.contains('active'),header:$('collectionContent').innerHTML.includes('咖啡收藏室'),page:document.body.dataset.page});return orig()};
  await CoffeeRoom.open();
  return {seen,active:$('collection').classList.contains('active'),blank:!document.body.innerText.trim()};
});
assert.equal(swap.seen[0].active,false);
assert.equal(swap.seen[0].header,true);
assert.equal(swap.seen[0].page,'dashboard');
assert.equal(swap.active,true);
assert.deepEqual(errors,[]);
fs.mkdirSync(path.resolve(__dirname,'../qa/v1952'),{recursive:true});
await page.evaluate(()=>UI.go('today'));
await page.locator('.cc-corner').screenshot({path:path.resolve(__dirname,'../qa/v1952/home.png')});
await page.evaluate(()=>UI.go('dashboard'));
await page.locator('#dashboard').screenshot({path:path.resolve(__dirname,'../qa/v1952/dashboard.png')});
console.log('PASS V19.5.2 collection swap, ambient life, dashboard clearance');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
