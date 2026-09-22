/* QA consumer of the exact manifest. Demonstration data is intentionally isolated. */
const M=window.BEANSTER_ASSETS,images={},scene=document.getElementById('scene'),inspect=document.getElementById('inspect'),shelf=document.getElementById('shelf');
let records=[],serial=0,selected=null,night=false,showAnchors=true,raf=0,token=0,ritual=null,consumed=false,hamsterId='hamster_idle_base',fxId=null,interactionState='idle';
const types=Object.keys(M.assets).filter(id=>id.startsWith('cup_')&&!id.includes('shadow'));
function sprite(ctx,id,x,y,scale=1){const a=M.assets[id],im=images[id];if(!a||!im)return;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x-a.pivotX*scale,y-a.pivotY*scale,a.canvas[0]*scale,a.canvas[1]*scale)}
function spriteBox(ctx,id){const a=M.assets[id],im=images[id],o=CleanupMotion.boxOrigin(M);if(!a||!im)return;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,o.x,o.y,a.canvas[0]*o.scale,a.canvas[1]*o.scale)}
function drawTop(ctx,id,x,y,w){const a=M.assets[id];if(!a)return;sprite(ctx,id,x+a.pivotX*w/a.canvas[0],y+a.pivotY*w/a.canvas[0],w/a.canvas[0])}
function halt(){++token;cancelAnimationFrame(raf);raf=0}
function stop(){halt();ritual=null;hamsterId='hamster_idle_base';fxId=null;interactionState='idle';draw()}
function skipToComplete(){
  halt();consumed=true;ritual=null;hamsterId='hamster_idle_base';fxId=null;interactionState='idle';draw();
  document.getElementById('stats').textContent='收杯完成；记录早已保存在收藏室，今天的新杯未收走。';
}
function resetQA(){halt();consumed=false;ritual=null;hamsterId='hamster_idle_base';fxId=null;interactionState='idle';draw()}
function play(name,paint,finish){halt();const t=token,a=M.animations[name],start=performance.now();if(!a||matchMedia('(prefers-reduced-motion: reduce)').matches){finish?.();return}function step(now){if(t!==token)return;let f=Math.floor((now-start)*a.fps/1000);if(f>=a.frames.length){raf=0;finish?.();return}paint(a.frames[f],f);raf=requestAnimationFrame(step)}raf=requestAnimationFrame(step)}
function desk(){return records.filter(r=>r.day==='today')}
function tableCupPosition(index,n){return CleanupMotion.tableCup(M,index,n)}
function roomId(){const s=M.scene.room;return night?(s&&s.night)||'scene_room_night':(s&&s.day)||'scene_room_day'}
function bakedRoom(){return !!M.assets[roomId()]}
function drawIvy(c){if(!bakedRoom()&&M.assets.ivy_hanging)sprite(c,'ivy_hanging',640,8,.85)}
function cupOf(r){return r.cup&&M.assets[r.cup]?r.cup:'cup_latte'}
function drawStorage(c,snap){
  snap.layers.forEach(id=>{
    if(id==='liveCup'){
      snap.cups.forEach(cup=>{if(!cup.flying||cup.gone)return;sprite(c,cupOf(cup.row),cup.p[0],cup.p[1],cup.s)});
      if(snap.swirl){const swirl=M.animations.suck;if(swirl){const fi=Math.floor(snap.elapsed/1000*swirl.fps)%swirl.frames.length;sprite(c,swirl.frames[fi],snap.mouth[0],snap.mouth[1],.26)}}
    }else spriteBox(c,id);
  });
  if(snap.archiveText){c.save();c.fillStyle='#fff1cf';c.font='700 18px system-ui';c.textAlign='center';c.fillText(snap.archiveText,snap.pose.x,snap.pose.y+18);c.restore()}
}
function drawIdle(id='hamster_idle_base'){
  hamsterId=id;
  const c=scene.getContext('2d'),idle=M.scene.idle,ch=M.scene.chair||{},tw=CleanupMotion.tablePose(M),btn=M.scene.button||{};
  c.clearRect(0,0,768,1024);
  if(bakedRoom())drawTop(c,roomId(),0,0,768);else{drawTop(c,'scene_background',0,0,768);drawTop(c,night?'window_night':'window_day',35,140,285);drawTop(c,'lamp',350,40,125);drawTop(c,'plant',18,540,160);drawTop(c,'plant',610,530,130);if(M.assets.chalkboard)sprite(c,'chalkboard',118,790,.78)}
  sprite(c,'chair',ch.position?ch.position[0]:338,ch.position?ch.position[1]:702,ch.scale||.58);
  sprite(c,'table_back',tw.x,tw.y,tw.scale);sprite(c,id,idle.position[0],idle.position[1],idle.scale);
  const cups=desk().slice(0,CleanupMotion.MAX_VISIBLE);
  cups.forEach((r,i)=>{const [x,y]=tableCupPosition(i,cups.length);sprite(c,'cup_shadow_medium',x,y+2,.4);sprite(c,cupOf(r),x,y,.4)});
  (M.scene.dressing||[]).forEach(p=>sprite(c,p.id,p.position[0],p.position[1],p.scale));
  sprite(c,btn.up||'btn_hamster_up',btn.position?btn.position[0]:548,btn.position?btn.position[1]:778,btn.scale||.28);
  sprite(c,'table_front',tw.x,tw.y,tw.scale);
  drawIvy(c);
  sprite(c,'entrance_normal',597,255,.55);
  c.font='700 20px system-ui';c.fillStyle='#fff1cf';c.textAlign='center';c.fillText('收藏室 →',597,262);c.textAlign='left';
  c.fillStyle='#634027';if(desk().length>4)c.fillText('更多 · +'+(desk().length-4),550,881);
  document.getElementById('stats').textContent=`桌面 ${desk().length} 杯 · 展示 ${cups.length} 杯 · 收藏 ${records.length} 条独立记录`;
  drawShelf();
}
function draw(id){drawIdle(id||hamsterId||'hamster_idle_base')}
function drawShelf(){let c=shelf.getContext('2d');c.clearRect(0,0,1024,684);for(let row=0;row<2;row++){drawTop(c,'storage_empty',0,row*342,1024);records.slice(row*4,row*4+4).forEach((r,i)=>sprite(c,cupOf(r),M.storage.slots[i][0],row*342+M.storage.slots[i][1],.72));drawTop(c,'storage_front_mask',0,row*342,1024)}}
function inspectFrame(id){const c=inspect.getContext('2d'),a=M.assets[id];if(!a)return;c.clearRect(0,0,768,640);sprite(c,id,384,550,1);if(a.cupAnchorX!=null){let x=384+a.cupAnchorX-a.pivotX,y=550+a.cupAnchorY-a.pivotY;if(a.cupAttached)sprite(c,'cup_latte',x,y,.48);if(showAnchors){c.strokeStyle='#50e2cc';c.lineWidth=2;c.beginPath();c.moveTo(x-18,y);c.lineTo(x+18,y);c.moveTo(x,y-18);c.lineTo(x,y+18);c.stroke();c.fillStyle='#fff';c.font='18px system-ui';c.fillText(a.cupAnchorKind+' '+a.cupAnchorX+','+a.cupAnchorY,x+22,y)}}if(showAnchors){c.strokeStyle='#f2b96e';c.beginPath();c.moveTo(30,550);c.lineTo(730,550);c.stroke()}document.getElementById('details').textContent=JSON.stringify({id,canvas:a.canvas,pivot:[a.pivotX,a.pivotY],cupAnchor:a.cupAnchorX==null?null:[a.cupAnchorX,a.cupAnchorY],phase:a.cupAnchorKind},null,2)}
function setCount(n){stop();records=Array.from({length:n},()=>({id:++serial,cup:types[(serial-1)%types.length],day:'today'}));consumed=false;draw()}
function drawCleanup(elapsed,rows,hid){
  const vis=CleanupMotion.visibleRows(rows);
  const origins=vis.map((_,i)=>tableCupPosition(i,vis.length));
  const snap=CleanupMotion.snapshot(M,elapsed,rows,origins);
  const c=scene.getContext('2d'),idle=M.scene.idle,ch=M.scene.chair||{},tw=CleanupMotion.tablePose(M),btn=M.scene.button||{};
  const hamster=hid||snap.hamster.id;
  c.clearRect(0,0,768,1024);
  if(bakedRoom())drawTop(c,roomId(),0,0,768);
  else if(M.assets.chalkboard)sprite(c,'chalkboard',118,790,.78);
  sprite(c,'chair',ch.position?ch.position[0]:338,ch.position?ch.position[1]:702,ch.scale||.58);
  sprite(c,'table_back',tw.x,tw.y,tw.scale);
  if(!snap.hamster.pressed)sprite(c,hamster,idle.position[0],idle.position[1],idle.scale);
  snap.cups.forEach(cup=>{if(cup.gone||cup.flying)return;sprite(c,'cup_shadow_medium',cup.p[0],cup.p[1]+2,.4);sprite(c,cupOf(cup.row),cup.p[0],cup.p[1],cup.s)});
  (M.scene.dressing||[]).forEach(p=>sprite(c,p.id,p.position[0],p.position[1],p.scale));
  sprite(c,snap.buttonDown?btn.down||'btn_hamster_down':btn.up||'btn_hamster_up',btn.position?btn.position[0]:548,(btn.position?btn.position[1]:778)+(snap.buttonDown?6:0),btn.scale||.28);
  if(snap.hamster.pressed)sprite(c,hamster,idle.position[0],idle.position[1],idle.scale);
  sprite(c,'table_front',tw.x,tw.y,tw.scale);
  drawIvy(c);
  sprite(c,'entrance_normal',597,255,.55);
  c.fillStyle='#fff1cf';c.font='700 20px system-ui';c.textAlign='center';c.fillText('收藏室 →',597,262);c.textAlign='left';
  if(CleanupMotion.boxVisible(snap.elapsed,snap.sched))drawStorage(c,snap);
  if(fxId)sprite(c,fxId,idle.position[0]+90,idle.position[1]-80,.55);
  inspectFrame(hamster);
  return snap;
}
function finishPreviewCleanup(){
  ritual=null;hamsterId='hamster_idle_base';fxId=null;interactionState='idle';draw();
  document.getElementById('stats').textContent='收杯完成；记录早已保存在收藏室，今天的新杯未收走。';
}
function cleanup(){
  if(interactionState==='cleanup'||interactionState==='ending')return;
  if(consumed)return;
  const yesterday=records.filter(r=>r.day==='yesterday');
  consumed=true;
  halt();
  interactionState='cleanup';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finishPreviewCleanup();return}
  const sched=CleanupMotion.schedule(M,yesterday),t=token,t0=performance.now();
  ritual=yesterday.map(r=>r.id);
  function step(now){
    if(t!==token)return;
    const elapsed=now-t0;
    drawCleanup(elapsed,yesterday);
    if(elapsed>=sched.reactionAt){
      interactionState='ending';
      const name=CleanupMotion.reactionName(M,yesterday);
      if(name==='question'){
        play('question',id=>{fxId=id;drawCleanup(1e9,yesterday,'hamster_idle_base')},finishPreviewCleanup);
      }else{
        play(name,id=>{fxId=null;drawCleanup(1e9,yesterday,id)},finishPreviewCleanup);
      }
      return;
    }
    raf=requestAnimationFrame(step);
  }
  raf=requestAnimationFrame(step);
}
document.getElementById('add').onclick=()=>{stop();records.push({id:++serial,cup:types[(serial-1)%types.length],day:'today'});draw()};
document.getElementById('night').onclick=()=>{night=!night;if(interactionState==='idle')draw()};
document.getElementById('skip').onclick=skipToComplete;
document.getElementById('reset').onclick=resetQA;
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>setCount(+b.dataset.count));
/* QA-only: this preview fabricates a yesterday snapshot and one today latte. CoffeeRoom.checkDay never injects a drink. */
document.getElementById('collect').onclick=()=>{if(!records.some(r=>r.day==='yesterday')){if(records.length){records.forEach(r=>r.day='yesterday');records.push({id:++serial,cup:'cup_latte',day:'today'})}consumed=false}cleanup()};
document.getElementById('play').onclick=()=>{if(interactionState!=='idle')return;play(document.getElementById('animation').value,inspectFrame,()=>inspectFrame(M.animations[document.getElementById('animation').value].frames[0]))};
document.getElementById('anchors').onclick=()=>{showAnchors=!showAnchors;inspectFrame(M.animations[document.getElementById('animation').value].frames[0])};
scene.onclick=e=>{if(interactionState!=='idle')return;let r=scene.getBoundingClientRect(),x=(e.clientX-r.left)*768/r.width,y=(e.clientY-r.top)*1024/r.height;let found=desk().slice(0,4).find((r,i)=>{let p=tableCupPosition(i,Math.min(4,desk().length));return Math.abs(x-p[0])<50&&y<p[1]+10&&y>p[1]-95});if(found)select(found);else play('idle',id=>draw(id),()=>draw())};
function select(r){selected=r.id;document.getElementById('recordInfo').textContent=`记录 #${r.id} · ${r.cup} · ${r.day}（同款保持独立）`}
shelf.onclick=e=>{let b=shelf.getBoundingClientRect(),x=(e.clientX-b.left)*1024/b.width,y=(e.clientY-b.top)*684/b.height,row=Math.floor(y/342),col=M.storage.slots.findIndex(p=>Math.abs(x-p[0])<90);let r=records[row*4+col];if(col>=0&&r)select(r)};
document.getElementById('delete').onclick=()=>{stop();records=records.filter(r=>r.id!==selected);selected=null;draw()};
document.getElementById('dark').onclick=()=>document.getElementById('gallery').classList.toggle('dark');
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
Promise.all(Object.entries(M.assets).map(([id,a])=>new Promise((resolve,reject)=>{let im=new Image;im.onload=()=>{images[id]=im;resolve()};im.onerror=()=>reject(Error(a.file));im.src=a.file}))).then(()=>{setCount(4);inspectFrame('hamster_cleanup_06');document.getElementById('gallery').innerHTML=Object.entries(M.assets).map(([id,a])=>`<div class="tile"><img loading="lazy" src="${a.file}" alt="${id}">${id}<br>${a.canvas.join(' × ')}</div>`).join('');window.assetQA={ready:true,desk,records:()=>records,play,stop,setCount,cleanup,consumed:()=>consumed,playing:()=>raf!==0,motion:CleanupMotion,interaction:()=>interactionState,skipToComplete,resetQA};play('idle',id=>draw(id),()=>draw())}).catch(e=>document.getElementById('stats').textContent='素材加载失败：'+e.message);
