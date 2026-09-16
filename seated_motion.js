/* Original user atlases are sampled directly; each frame shares a chest/paw anchor. */
const SeatedMotion={
  images:[],mounted:new WeakSet(),
  anchors:[[[185,513],[540,514],[891,516],[1248,515],[190,950],[541,950],[892,950],[1248,950]],[[126,397],[372,397],[598,398],[844,400],[1085,398],[1315,399],[121,706],[347,705],[578,706],[820,706],[1071,705],[1320,706],[124,1022],[362,1015],[592,1024],[838,1024],[1086,1023],[1328,1024]]],
  sequences:{idle:{sheet:0,frames:[0,1,2,3,4,5,6,7,0],duration:170},wave:{sheet:1,frames:[0,1,2,3,4,5,0],duration:170},point:{sheet:1,frames:[6,7,8,9,10,11,6],duration:180},toast:{sheet:1,frames:[12,13,14,15,16,17,12],duration:200}},
  load(){return this.ready||(this.ready=Promise.all(['seated-expressions-user.png','seated-actions-user.png'].map(file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='art/coffee-room/'+file}))).then(images=>{this.images=images}))},
  draw(canvas,sheet,index){if(!canvas?.isConnected||!this.images[sheet])return;const anchor=this.anchors[sheet][index],scale=sheet?1.95:1.3,ctx=canvas.getContext('2d');ctx.clearRect(0,0,640,560);ctx.imageSmoothingEnabled=false;ctx.save();ctx.setTransform(scale,0,0,scale,320-anchor[0]*scale,520-anchor[1]*scale);const clip=new Path2D();for(const [y,x,width] of window.SEATED_CLIPS[sheet][index])clip.rect(x,y,width,1);ctx.clip(clip);ctx.drawImage(this.images[sheet],0,0);ctx.restore();canvas.dataset.frame=sheet+':'+index},
  rest(canvas){this.draw(canvas,0,0)},
  mount(){document.querySelectorAll('canvas[data-seated]').forEach(canvas=>{if(this.mounted.has(canvas))return;this.mounted.add(canvas);this.load().then(()=>{if(!canvas.dataset.playing)this.rest(canvas)}).catch(()=>{canvas.setAttribute('aria-label','仓鼠表情暂时无法加载')})})},
  async play(canvas,kind='wave'){Motion.stop();if(!canvas?.isConnected)return;const token=Motion.token;try{await this.load()}catch{return}if(token!==Motion.token||!canvas.isConnected)return;if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){this.rest(canvas);return}const sequence=this.sequences[kind]||this.sequences.wave,start=performance.now();Motion.active=canvas;canvas.dataset.playing='true';canvas.dataset.expression=kind;let last=-1;const tick=now=>{if(token!==Motion.token)return;if(!canvas.isConnected||document.hidden||now-start>=sequence.frames.length*sequence.duration){Motion.stop();return}const index=Math.floor((now-start)/sequence.duration);if(index!==last){this.draw(canvas,sequence.sheet,sequence.frames[index]);last=index}Motion.raf=requestAnimationFrame(tick)};Motion.raf=requestAnimationFrame(tick)},
  click(canvas){const choices=['idle','point','toast','wave'],i=Number(canvas.dataset.cycle)||0;canvas.dataset.cycle=String(i+1);this.play(canvas,choices[i%choices.length])}
};
const seatedPlay=Motion.play.bind(Motion),seatedStop=Motion.stop.bind(Motion);
Motion.play=function(el){return el?.hasAttribute('data-seated')?SeatedMotion.play(el):seatedPlay(el)};
Motion.stop=function(){const el=this.active;seatedStop();if(el?.hasAttribute('data-seated'))SeatedMotion.rest(el)};
document.addEventListener('click',e=>{const el=e.target.closest('[data-seated]');if(el){e.preventDefault();SeatedMotion.click(el)}},true);
document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-seated]')){e.preventDefault();SeatedMotion.click(e.target)}});
new MutationObserver(()=>SeatedMotion.mount()).observe(document.body,{childList:true,subtree:true});
SeatedMotion.mount();Motion.scope=null;Motion.sync();
