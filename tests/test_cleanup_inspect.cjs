const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1100,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file:///'+path.resolve(__dirname,'../art/production-v2/cleanup-inspect.html').replaceAll('\\','/'));
await p.waitForFunction(()=>window.cleanupQA?.ready,{timeout:60000});
assert.equal(await p.evaluate(()=>BEANSTER_ASSETS.scene.cleanup.mode),'vacuum');
assert.equal(await p.evaluate(()=>BEANSTER_ASSETS.scene.cleanup.seated),true);
assert.ok(await p.evaluate(()=>BEANSTER_ASSETS.assets.btn_hamster_up&&BEANSTER_ASSETS.assets.btn_hamster_down&&BEANSTER_ASSETS.assets.fx_suck_01&&BEANSTER_ASSETS.assets.hamster_press&&BEANSTER_ASSETS.assets.hamster_seated_glad_01));
assert.ok(await p.evaluate(()=>(BEANSTER_ASSETS.scene.dressing||[]).length<=1));
assert.ok(await p.evaluate(()=>BEANSTER_ASSETS.animations.clap.pose==='seated'&&BEANSTER_ASSETS.animations.wipe.pose==='seated'));
assert.ok(await p.evaluate(()=>!BEANSTER_ASSETS.animations.clap.frames.includes('hamster_cleanup_12')));
assert.ok(await p.evaluate(()=>{const t=BEANSTER_ASSETS.scene.table,b=CleanupMotion.buttonPose(BEANSTER_ASSETS),cs=CleanupMotion.cupScale(BEANSTER_ASSETS),gap=90*cs+100*b.scale+8;return BEANSTER_ASSETS.table.slots['4'].every(([sx,sy])=>{const x=t.position[0]+(sx-512)*t.scale,y=t.position[1]+(sy-280)*t.scale;return Math.hypot(x-b.x,y-b.y)>gap})}));
assert.equal(await p.evaluate(()=>BEANSTER_ASSETS.scene.table.scale),0.46);
assert.equal(await p.evaluate(()=>BEANSTER_ASSETS.scene.tableContact.y),772);
assert.ok(await p.evaluate(()=>{
  const M=BEANSTER_ASSETS,seat=M.scene.idle,face=M.scene.deskSafe.hamsterFace,a=M.assets.hamster_idle_base,s=seat.scale,contact=a.contactY;
  const zone={x0:seat.position[0]+(face.x0-a.pivotX)*s,x1:seat.position[0]+(face.x1-a.pivotX)*s,y0:seat.position[1]+(face.y0-contact)*s,y1:seat.position[1]+(face.y1-contact)*s};
  const b=CleanupMotion.buttonPose(M),cs=CleanupMotion.cupScale(M),cupR=80*cs,btnR=90*b.scale+M.scene.deskSafe.buttonPad,t=M.scene.table;
  return ['1','2','3','4'].every(n=>M.table.slots[n].every(([sx,sy])=>{
    const x=t.position[0]+(sx-512)*t.scale,y=t.position[1]+(sy-280)*t.scale;
    const faceHit=x+cupR>zone.x0&&x-cupR<zone.x1&&y+cupR>zone.y0&&y-cupR<zone.y1;
    return !faceHit&&Math.hypot(x-b.x,y-b.y)>cupR+btnR;
  }));
}),'cup slots stay outside the hamster face and the collect button');
assert.deepEqual(await p.evaluate(()=>BEANSTER_ASSETS.assets.btn_hamster_up.canvas),await p.evaluate(()=>BEANSTER_ASSETS.assets.btn_hamster_down.canvas));
assert.equal(await p.evaluate(()=>BEANSTER_ASSETS.assets.btn_hamster_up.pivotX),await p.evaluate(()=>BEANSTER_ASSETS.assets.btn_hamster_down.pivotX));
const box=await p.evaluate(()=>BEANSTER_ASSETS.scene.storageBox);
assert.deepEqual(box.position,[560,955]);
assert.equal(box.scale,0.38);
assert.deepEqual(await p.evaluate(()=>cleanupQA.boxPose()),{x:560,y:955,scale:0.38});

const fsm=await p.evaluate(()=>{
  const M=BEANSTER_ASSETS,CM=CleanupMotion,rows=n=>Array.from({length:n},(_,i)=>({id:i,cup:'cup_latte'}));
  const out={};
  for(const n of [0,1,2,4,7]){
    const s=CM.schedule(M,rows(n));
    const phases={};
    for(const t of [0,s.pressAt+1,s.releaseAt+1,s.openingAt+1,s.openAt+1,s.firstCupAt+1,(s.lastCupEnd||0)-1,s.closingAt-1,s.closingAt+1,s.closedAt+1]){
      phases[Math.max(0,Math.round(t))]=CM.boxPhase(t,s);
    }
    const origins=CM.visibleRows(rows(n)).map((_,i)=>CM.tableCup(M,i,s.n));
    const mid=CM.snapshot(M,s.n?s.cupStarts[0]+s.cupMs*.5:s.openAt+1,rows(n),origins);
    const end=CM.snapshot(M,s.lastCupEnd,rows(n),origins);
    const closing=CM.snapshot(M,s.closingAt+100,rows(n),origins);
    const closed=CM.snapshot(M,s.closedAt,rows(n),origins);
    const opening=CM.snapshot(M,s.openingAt+40,rows(n),origins);
    const opened=CM.snapshot(M,s.openAt+10,rows(n),origins);
    out[n]={n:s.n,hidden:s.hidden,pressMs:s.releaseAt-s.pressAt,lastCupEnd:s.lastCupEnd,closingAt:s.closingAt,closedAt:s.closedAt,reactionAt:s.reactionAt,
      phaseAtLastCup:CM.boxPhase(s.lastCupEnd-1,s),
      phaseAtCloseStart:CM.boxPhase(s.closingAt,s),
      phaseAtClosed:CM.boxPhase(s.closedAt,s),
      flyingDuringClose:closing.cups.some(c=>c.flying&&!c.gone),
      goneAtLast:end.cups.filter(c=>c.gone).length,
      midMoved:mid.cups[0]?Math.hypot(mid.cups[0].p[0]-origins[0][0],mid.cups[0].p[1]-origins[0][1]):0,
      midY:mid.cups[0]?mid.cups[0].p[1]:0,
      originY:origins[0]?origins[0][1]:0,
      openingLayers:opening.layers,
      openLayers:opened.layers,
      closingLayers:closing.layers,
      closedLayers:closed.layers,
      pose:closed.pose,
      buttonWhileReceiving:s.n?CM.snapshot(M,s.firstCupAt+20,rows(n),origins).buttonDown:null,
      pressAt300:CM.snapshot(M,300,rows(n),origins).buttonDown,
      lookId:CM.snapshot(M,10,rows(n),origins).hamster.id,
      looking:CM.snapshot(M,10,rows(n),origins).hamster.looking,
      watchId:CM.snapshot(M,s.releaseAt+10,rows(n),origins).hamster.watching?CM.snapshot(M,s.releaseAt+10,rows(n),origins).hamster.id:null,
      flashMid:CM.snapshot(M,Math.max(0,s.closingAt-10),rows(n),origins).archiveFlash,
      flashClosed:CM.snapshot(M,s.closedAt+40,rows(n),origins).archiveFlash,
      flashText:CM.snapshot(M,s.closedAt+40,rows(n),origins).archiveText,
      plusMid:CM.snapshot(M,s.firstCupAt+10,rows(n),origins).plusN,
      closeAlmost:CM.snapshot(M,s.closingAt+s.closingMs*.65,rows(n),origins).stateKey,
      react:CM.reactionName(M,rows(n))};
  }
  const M0=JSON.parse(JSON.stringify(BEANSTER_ASSETS));
  M0.scene.cleanup.timing.lookMs=0;
  out.zeroLook=CleanupMotion.timing(M0).lookMs;
  const empty=CleanupMotion.schedule(BEANSTER_ASSETS,[]);
  out.emptyOpening=CleanupMotion.boxPhase(empty.openingAt+1,empty);
  out.emptyClosing=CleanupMotion.boxPhase(empty.closingAt+1,empty);
  return out;
});
assert.equal(fsm[7].n,4);assert.equal(fsm[7].hidden,3);
assert.equal(fsm[4].n,4);assert.equal(fsm[4].hidden,0);
assert.equal(fsm[1].n,1);assert.equal(fsm[0].n,0);
for(const n of [0,1,2,4,7]){
  assert.ok(fsm[n].lastCupEnd<=fsm[n].closingAt, n+' last cup must finish before closing');
  assert.ok(fsm[n].closingAt<fsm[n].closedAt);
  assert.equal(fsm[n].phaseAtClosed,'closed');
  assert.equal(fsm[n].flyingDuringClose,false, n+' cups must not fly while lid closes');
  assert.deepEqual(fsm[n].pose,{x:560,y:955,scale:0.38});
  assert.equal(fsm[n].pressMs,550);
  assert.equal(fsm[n].pressAt300,false,'press is a short tap, not the whole ritual');
  assert.ok(fsm[n].closedLayers.includes('box_lid_closed')||fsm[n].closedLayers.includes('box_closed')||fsm[n].closedLayers.includes('box_front'));
}
assert.equal(fsm[1].phaseAtLastCup,'receiving');
assert.equal(fsm[4].phaseAtLastCup,'receiving');
assert.equal(fsm[7].phaseAtLastCup,'receiving');
assert.equal(fsm[4].goneAtLast,4);
assert.ok(fsm[1].midMoved>20,'cups travel toward the box mouth');
assert.ok(fsm[1].midY>=fsm[1].originY-8,'cups leave along the table front, not through the hamster');
assert.ok(fsm[1].openingLayers.includes('box_lid_opening'));
assert.ok(fsm[1].openLayers.includes('box_lid'));
assert.ok(fsm[1].closingLayers.includes('box_lid_opening')||fsm[1].closingLayers.includes('box_almost')||fsm[1].closingLayers.includes('box_lid_closed'));
assert.ok(fsm[1].closedLayers.includes('box_lid_closed')||fsm[1].closedLayers.includes('box_closed'));
assert.equal(fsm[4].buttonWhileReceiving,false);
assert.ok(fsm[7].reactionAt>fsm[1].reactionAt,'more visible cups take longer');
assert.ok(fsm[7].lastCupEnd===fsm[4].lastCupEnd,'7 records still only animate 4 cups');
assert.equal(fsm[0].n,0);assert.equal(fsm.emptyOpening,'opening');assert.equal(fsm.emptyClosing,'closing');
assert.equal(fsm.zeroLook,0);
assert.equal(fsm[0].react,'question');assert.equal(fsm[1].react,'clap');assert.equal(fsm[7].react,'wipe');
assert.equal(fsm[7].plusMid,0);assert.equal(fsm[7].flashMid,false);assert.equal(fsm[7].flashClosed,true);
assert.equal(fsm[7].flashText,'7 杯已收藏');
assert.ok(fsm[1].looking);assert.ok(/look|table_idle|press_reach/.test(String(fsm[1].lookId)));
assert.ok(['hamster_watch','hamster_idle_base','hamster_pose_table_idle','hamster_pose_table_blink'].includes(fsm[1].watchId));
assert.equal(fsm[4].closeAlmost,'close_almost');

await p.locator('[data-count="4"]').click();
await p.evaluate(()=>cleanupQA.draw(cleanupQA.schedule().openingAt+80));
await p.locator('#scene').screenshot({path:path.resolve(__dirname,'../art/production-v2/qa/box-opening.png')});
await p.evaluate(()=>cleanupQA.draw(cleanupQA.schedule().firstCupAt+200));
await p.locator('#scene').screenshot({path:path.resolve(__dirname,'../art/production-v2/qa/box-receiving.png')});
await p.evaluate(()=>cleanupQA.draw(cleanupQA.schedule().closingAt+80));
await p.locator('#scene').screenshot({path:path.resolve(__dirname,'../art/production-v2/qa/box-closing.png')});
await p.evaluate(()=>cleanupQA.draw(cleanupQA.schedule().closedAt+20));
await p.locator('#scene').screenshot({path:path.resolve(__dirname,'../art/production-v2/qa/box-closed.png')});

await p.locator('[data-count="0"]').click();
await p.locator('#play').click();await p.waitForTimeout(200);
assert.equal(await p.evaluate(()=>cleanupQA.kind()),'cleanup');
await p.locator('#skip').click();
assert.equal(await p.evaluate(()=>cleanupQA.kind()),'done');
assert.equal(await p.evaluate(()=>cleanupQA.snapshot(cleanupQA.elapsed()).phase),'closed');
await p.locator('[data-count="7"]').click();
await p.locator('#play').click();await p.waitForTimeout(300);
assert.equal(await p.evaluate(()=>cleanupQA.kind()),'cleanup');
assert.equal(await p.evaluate(()=>cleanupQA.snapshot(cleanupQA.elapsed()).sched.n),4);
await p.locator('#skip').click();
assert.equal(await p.evaluate(()=>cleanupQA.kind()),'done');
assert.ok(await p.evaluate(()=>BEANSTER_ASSETS.assets.scene_room_day));
await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+8));
assert.deepEqual(errors,[]);
fs.mkdirSync(path.resolve(__dirname,'../art/production-v2/qa'),{recursive:true});
console.log('PASS box FSM: last-cup closes lid, 1/2/4/7 cups, unified storageBox, short press, no flying during close');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
