const assert=require('assert/strict'),path=require('path');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('file:///'+path.resolve(__dirname,'../index_v5.html').replaceAll('\\','/'));
 await page.evaluate(()=>{settings.systemNotifications=false;records=[];openAdd()});
 await page.evaluate(()=>saveRecord());
 assert.equal(await page.evaluate(()=>Companion.feedback),'portrait_excited');
 assert.ok(await page.locator('.u-save-sticker').count());
 for(let i=0;i<8;i++){assert.ok(await page.locator('[data-playing]').count()<=1);assert.ok(await page.evaluate(()=>document.querySelector('.u-save-sticker')?.getAnimations().filter(a=>a.playState==='running').length===0||!document.querySelector('.u-companion-avatar[data-playing]')));await page.waitForTimeout(40)}
 // A portrait click interrupts the sticker's CSS animation through the same stop lifecycle.
 await page.evaluate(async()=>{showIdleSaveSticker(1,false);await Motion.play(document.querySelector('.u-companion-avatar'))});
 assert.equal(await page.locator('.u-save-enter').count(),0);assert.equal(await page.locator('.u-companion-avatar[data-playing]').count(),1);
 // Cup animation and save feedback cancel each other in both directions.
 await page.evaluate(()=>{settings.dashboardStyle='cup';renderToday()});await page.waitForTimeout(50);
 await page.evaluate(()=>showIdleSaveSticker(3,false));assert.equal(await page.locator('.u-pouring').count(),0);
 await page.evaluate(()=>Motion.play(document.querySelector('[data-dashboard]')));assert.equal(await page.locator('.u-save-enter').count(),0);assert.equal(await page.locator('.u-pouring').count(),1);
 await page.evaluate(()=>{showIdleSaveSticker(3,false);Motion.stop()});assert.equal(await page.locator('.u-save-enter,[data-playing],.u-pouring').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>showIdleSaveSticker(1,false));assert.equal(await page.locator('.u-save-sticker').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS save feedback, portrait/cup interruption, stop and reduced motion');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
