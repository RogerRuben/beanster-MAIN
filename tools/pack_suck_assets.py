"""Pack hamster table button + suction vortex frames."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import numpy as np, json, hashlib
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'production-v2'
RAW=Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0af9f-1576-7fb3-80a1-7de6f3b96803\images')
RES=Image.Resampling.NEAREST

def key_edges(im, light=True, thresh=210):
    a=np.array(im.convert('RGBA'))
    h,w=a.shape[:2]
    vis=np.zeros((h,w), bool)
    q=deque()
    def seed(y,x):
        pix=a[y,x,:3]
        if light: return int(pix.min())>=thresh
        return int(pix.max())<=18
    for x in range(w):
        q.append((0,x)); q.append((h-1,x))
    for y in range(h):
        q.append((y,0)); q.append((y,w-1))
    while q:
        y,x=q.popleft()
        if x<0 or y<0 or x>=w or y>=h or vis[y,x] or not seed(y,x):
            continue
        vis[y,x]=True
        a[y,x,3]=0
        q.extend(((y-1,x),(y+1,x),(y,x-1),(y,x+1)))
    return Image.fromarray(a)

def save(assets, id, im, group, pivot, z, **extra):
    path=OUT/group/f'{id}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGBA').save(path)
    assets[id]={'file':path.relative_to(OUT).as_posix(),'canvas':list(im.size),'pivotX':pivot[0],'pivotY':pivot[1],'zIndex':z,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra}

def fit(im, size, baseline=None):
    im=im.convert('RGBA')
    box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    im=im.crop(box)
    scale=min((size[0]-16)/im.width,(size[1]-16)/im.height)
    im=im.resize((max(1,round(im.width*scale)), max(1,round(im.height*scale))), RES)
    canvas=Image.new('RGBA', size)
    x=(size[0]-im.width)//2
    y=size[1]-im.height-8 if baseline is None else baseline-im.height
    canvas.alpha_composite(im,(x,max(0,y)))
    return canvas

def swirl_frames(src):
    src=src.convert('RGBA')
    frames=[]
    for i in range(6):
        ang=-i*28
        sc=0.55+i*0.09
        im=src.rotate(ang, resample=Image.Resampling.NEAREST, expand=True)
        w=max(1,round(256*sc)); h=max(1,round(256*sc))
        im=im.resize((w,h), RES)
        canvas=Image.new('RGBA',(256,256))
        canvas.alpha_composite(im,((256-w)//2,(256-h)//2))
        a=np.array(canvas)
        fade=0.45+i*0.1 if i<5 else 0.35
        a[:,:,3]=(a[:,:,3].astype(float)*min(1,fade)).astype('uint8')
        frames.append(Image.fromarray(a))
    return frames

def main():
    assets={}
    up=key_edges(Image.open(RAW/'22.jpg'), True, 220)
    dn=key_edges(Image.open(RAW/'20.jpg'), True, 220)
    vortex=key_edges(Image.open(RAW/'21.jpg'), True, 232)
    save(assets,'btn_hamster_up',fit(up,(256,256)),'ui',[128,200],35,role='table gadget idle')
    save(assets,'btn_hamster_down',fit(dn,(256,256)),'ui',[128,200],35,role='table gadget pressed')
    for i,im in enumerate(swirl_frames(vortex),1):
        save(assets,f'fx_suck_{i:02d}',im,'effects',[128,128],80,role='suction cover')
    manifest=json.loads((OUT/'asset_manifest.json').read_text('utf-8'))
    manifest['assets'].update(assets)
    manifest['animations']['suck']={'frames':[f'fx_suck_{i:02d}' for i in range(1,7)],'fps':12,'loop':True,'play':'while-cups-vacuum'}
    manifest['scene']['button']={'up':'btn_hamster_up','down':'btn_hamster_down','position':[468,772],'scale':0.28}
    manifest['scene']['cleanup']={'mode':'vacuum','seated':True,'walk':False}
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest,ensure_ascii=False)+';','utf-8')
    print('packed',list(assets))

if __name__=='__main__':
    main()
