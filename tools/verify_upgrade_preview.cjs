const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.BEANSTER_PLAYWRIGHT || 'C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'../art/upgrade-v1');
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'preview.html')).href);
  await page.locator('.card').last().waitFor();
  const check=await page.evaluate(async()=>{
   const files=window.BEANSTER_ART.assets.flatMap(a=>[...Object.values(a.png),...(a.animation?[a.animation.gif,a.animation.webp,a.animation.spritesheet]:[])]);
   const bad=[];
   await Promise.all(files.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>{if(!i.naturalWidth)bad.push(src);resolve()};i.onerror=()=>{bad.push(src);resolve()};i.src=src})));
   return {assets:window.BEANSTER_ART.assets.length,files:files.length,broken:bad};
  });
  if(check.broken.length || errors.length)throw new Error(JSON.stringify({check,errors}));
  await page.screenshot({path:path.join(root,'preview-desktop.png')});
  await page.selectOption('#category','stickers');
  await page.click('[data-theme="dark"]');
  await page.selectOption('#format','gif');
  await page.screenshot({path:path.join(root,'preview-stickers-dark.png')});
  await page.selectOption('#category','portraits');
  await page.selectOption('#format','webp');
  await page.screenshot({path:path.join(root,'preview-expressions-dark.png')});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'preview-mobile.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw new Error('Mobile horizontal overflow');
  fs.writeFileSync(path.join(root,'browser-qa.json'),JSON.stringify({...check,pageErrors:errors,mobileOverflow:overflow},null,2));
  console.log(JSON.stringify(check));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
