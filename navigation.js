/* Android system Back and visible close buttons share the same layer policy. */
const AppNav={serial:0,baseline:'',
  mark(el){if(el){el.dataset.navOrder=String(++this.serial);el.style.zIndex=String(1000+this.serial)}},
  snapshot(){return JSON.stringify({fields:[...$('addModal').querySelectorAll('input,select,textarea')].filter(x=>x.type!=='file').map(x=>[x.id,x.value,x.checked]),rating:currentRating,photo:draftPhoto?.preview||draftPhoto?.thumb||'',source:draftSourceAttachment?.data||draftSourceAttachment?.preview||'',keep:draftKeepSource})},
  layers(){return [...document.querySelectorAll('.u-overlay,.import-preview-backdrop,.data-report-backdrop,#addModal.show,#photoViewer.show')].filter(x=>x.isConnected&&x.getClientRects().length).sort((a,b)=>Number(a.dataset.navOrder||0)-Number(b.dataset.navOrder||0))},
  requestClose(){
    if(UI.saving)return;
    if(this.baseline&&this.snapshot()!==this.baseline){
      UI.overlay('uUnsaved','保留这杯记录？',`<div class="u-unsaved"><p>这杯还有未保存的内容。</p><button class="primary" onclick="UI.closeOverlay('uUnsaved')">继续编辑</button><button class="u-text-btn" onclick="AppNav.discard()">放弃修改并返回</button></div>`,'u-small-overlay');return;
    }
    this.discard();
  },
  discard(){UI.closeOverlay('uUnsaved');this.baseline='';navCloseAdd();},
  back(){
    const top=this.layers().at(-1);
    if(top){
      if(top.id==='addModal')this.requestClose();
      else if(top.id==='photoViewer')closePhotoViewer();
      else if(top.id==='orderPasteBackdrop')closeOrderPaste();
      else if(top.id==='importPreview')closeImportPreview();
      else if(top.classList.contains('u-overlay'))UI.closeOverlay(top.id);
      else top.remove();
      return true;
    }
    if(document.querySelector('.page.active')?.id!=='today'){UI.go('today');return true}
    return false;
  }
};
// evaluateJavascript in the native Activity resolves this window entry point.
window.AppNav=AppNav;
const navOverlay=UI.overlay;UI.overlay=function(...args){const el=navOverlay(...args);AppNav.mark(el);return el};
const navOpenAdd=openAdd;openAdd=function(...args){navOpenAdd(...args);AppNav.mark($('addModal'));AppNav.baseline=AppNav.snapshot();};
const navEdit=editRecord;editRecord=async function(...args){await navEdit(...args);AppNav.mark($('addModal'));AppNav.baseline=AppNav.snapshot();};
const navCloseAdd=closeAdd;closeAdd=function(){if(UI.saving){AppNav.baseline='';navCloseAdd()}else AppNav.requestClose()};
const navPhoto=viewPhoto;viewPhoto=async function(...args){await navPhoto(...args);AppNav.mark($('photoViewer'))};
const navSource=viewInfoSource;viewInfoSource=async function(...args){await navSource(...args);AppNav.mark($('photoViewer'))};
new MutationObserver(()=>{for(const el of AppNav.layers())if(!el.dataset.navOrder)AppNav.mark(el)}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();AppNav.back()}},true);
