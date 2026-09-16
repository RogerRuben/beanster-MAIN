/* Two circular top-level pages. Forms and detail layers keep normal Back semantics. */
const CoffeePages={
  gesture:null,suppressClickUntil:0,
  current(){return document.querySelector('.page.active')?.id},
  eligible(){return ['today','dashboard'].includes(this.current())&&!AppNav.layers().length&&!CoffeeRoom.ritual},
  flip(direction=1){if(!this.eligible())return false;const target=this.current()==='today'?'dashboard':'today';Motion.stop();UI.go(target);requestAnimationFrame(()=>{if(this.current()===target&&!AppNav.layers().length)Motion.effect($(target),direction>0?'cc-enter-right':'cc-enter-left',220)});return true},
  start(e){this.gesture=null;if(!this.eligible()||e.touches.length!==1||e.target.closest('input,textarea,select,[contenteditable=true],.nav'))return;const t=e.touches[0];this.gesture={x:t.clientX,y:t.clientY,time:performance.now(),page:this.current(),horizontal:false}},
  move(e){const g=this.gesture;if(!g)return;if(e.touches.length!==1||!this.eligible()||g.page!==this.current()){this.gesture=null;return}const t=e.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;if(!g.horizontal&&Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){this.gesture=null;return}if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(dy)*1.5){g.horizontal=true;e.preventDefault()}},
  end(e){const g=this.gesture;this.gesture=null;if(!g||!g.horizontal||e.changedTouches.length!==1||g.page!==this.current())return;const t=e.changedTouches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;this.suppressClickUntil=performance.now()+400;if(Math.abs(dx)>=64&&Math.abs(dx)>Math.abs(dy)*1.5&&performance.now()-g.time<1200)this.flip(Math.sign(dx))}
};
document.addEventListener('touchstart',e=>CoffeePages.start(e),{passive:true});
document.addEventListener('touchmove',e=>CoffeePages.move(e),{passive:false});
document.addEventListener('touchend',e=>CoffeePages.end(e),{passive:true});
document.addEventListener('touchcancel',()=>{CoffeePages.gesture=null},{passive:true});
document.addEventListener('click',e=>{if(e.isTrusted&&performance.now()<CoffeePages.suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
// Android's edge-back gesture reaches this existing native bridge instead of a DOM swipe.
const coffeePageBack=AppNav.back.bind(AppNav);
AppNav.back=function(){if(!AppNav.layers().length&&['today','dashboard'].includes(CoffeePages.current()))CoffeeRoom.finishRitual();if(CoffeePages.eligible())return CoffeePages.flip(1);return coffeePageBack()};
