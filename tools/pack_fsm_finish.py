"""Pack look/watch seated poses and almost-closed box composite. Does not rebuild buttons."""
from pathlib import Path
import importlib.util, json, hashlib
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'production-v2'
RAW=Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0af9f-1576-7fb3-80a1-7de6f3b96803\images')
spec=importlib.util.spec_from_file_location('pack_visual_spec', ROOT/'tools'/'pack_visual_spec.py')
P=importlib.util.module_from_spec(spec); spec.loader.exec_module(P)

def strip_red_button(im):
    a=np.array(im.convert('RGBA'))
    r,g,b,al=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int),a[:,:,3]
    red=(al>32)&(r>140)&(g<100)&(b<100)
    a[red,3]=0
    h=a.shape[0]
    gray=(al>32)&(np.abs(r-g)<30)&(np.abs(g-b)<30)&(r<150)&(r>35)
    gray[:int(h*0.62)]=False
    a[gray,3]=0
    return Image.fromarray(a)

def place_box_composite(im):
    closed=Image.open(OUT/'storage'/'box_closed.png')
    cb=closed.getchannel('A').getbbox()
    im=P.erode_alpha(P.largest_blob(P.key_green(im)),1)
    box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    im=im.crop(box)
    tw,th=cb[2]-cb[0],cb[3]-cb[1]
    scale=min(tw/im.width, th/im.height)
    im=im.resize((max(1,round(im.width*scale)), max(1,round(im.height*scale))), P.RES)
    canvas=Image.new('RGBA',(512,512))
    x=cb[0]+(tw-im.width)//2
    y=cb[3]-im.height
    canvas.alpha_composite(im,(x,y))
    return canvas

def main():
    metrics=P.idle_metrics()
    assets={}
    look=P.place_seated(strip_red_button(P.key_green(Image.open(RAW/'41.jpg'))), metrics)
    watch=P.place_seated(Image.open(RAW/'42.jpg'), metrics)
    almost=place_box_composite(Image.open(RAW/'40.jpg'))
    P.save(assets,'hamster_look_button',look,'characters',[256,448],40,tableContact=[256,448],containsCup=False,seated=True)
    P.save(assets,'hamster_watch',watch,'characters',[256,448],40,tableContact=[256,448],containsCup=False,seated=True)
    P.save(assets,'box_almost',almost,'storage',[256,472],45,note='Nearly-closed composite for closing in-between')
    manifest=json.loads((OUT/'asset_manifest.json').read_text('utf-8'))
    manifest['assets'].update(assets)
    cleanup=manifest['scene']['cleanup']
    cleanup['look']='hamster_look_button'
    cleanup['watch']='hamster_watch'
    cleanup['press']='hamster_press'
    ending=cleanup.get('ending') or {}
    ending['0']='question'
    ending['1']='clap'; ending['2']='clap'; ending['3']='clap'; ending['4']='wipe'
    cleanup['ending']=ending
    manifest['box']['states']['close_almost']=['box_almost']
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest,ensure_ascii=False)+';','utf-8')
    print('packed', list(assets))

if __name__=='__main__':
    main()
