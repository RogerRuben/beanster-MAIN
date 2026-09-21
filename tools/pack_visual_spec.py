"""Pack seated visual-spec assets: wood gadget button, reach-press, seated endings."""
from pathlib import Path
from PIL import Image
from collections import deque
import numpy as np, json, hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'production-v2'
RAW=Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0af9f-1576-7fb3-80a1-7de6f3b96803\images')
RES=Image.Resampling.NEAREST

def key_green(im, gmin=90, margin=28):
    a=np.array(im.convert('RGBA'))
    r,g,b=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    chroma=(g>=gmin)&(g>=r+margin)&(g>=b+margin)
    # also flood from edges through near-green / near-white
    vis=np.zeros(g.shape, bool)
    q=deque()
    h,w=g.shape
    def seed(y,x):
        if chroma[y,x]: return True
        pix=a[y,x,:3]
        if int(pix.min())>=232: return True
        return int(pix[1])>=80 and int(pix[1])>=int(pix[0])+12 and int(pix[1])>=int(pix[2])+12
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
    a[chroma,3]=0
    return Image.fromarray(a)

def largest_blob(im, thresh=32):
    a=np.array(im.convert('RGBA'))
    mask=a[:,:,3]>thresh
    h,w=mask.shape
    vis=np.zeros_like(mask)
    best=[]
    for y in range(h):
        for x in range(w):
            if not mask[y,x] or vis[y,x]: continue
            q=deque([(y,x)]); vis[y,x]=True; cells=[]
            while q:
                cy,cx=q.popleft(); cells.append((cy,cx))
                for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not vis[ny,nx]:
                        vis[ny,nx]=True; q.append((ny,nx))
            if len(cells)>len(best): best=cells
    keep=np.zeros_like(mask)
    for y,x in best: keep[y,x]=True
    a[~keep,3]=0
    return Image.fromarray(a)

def erode_alpha(im, n=1):
    a=np.array(im.convert('RGBA'))
    m=a[:,:,3]>32
    for _ in range(n):
        p=np.pad(m,1,constant_values=False)
        m=m & p[1:-1,:-2] & p[1:-1,2:] & p[:-2,1:-1] & p[2:,1:-1]
    a[~m,3]=0
    return Image.fromarray(a)

def strip_table_line(im):
    a=np.array(im.convert('RGBA'))
    h,w=a.shape[:2]
    r,g,b,al=a[:,:,0],a[:,:,1],a[:,:,2],a[:,:,3]
    brown=(al>32)&(r>70)&(r<170)&(g>40)&(g<130)&(b<90)&(r>g)&(g>=b)
    # only the lowest 8% of opaque rows
    rows=np.where(al.max(axis=1)>32)[0]
    if not len(rows): return im
    cut=rows.min()+int((rows.max()-rows.min())*0.92)
    brown[0:cut]=False
    a[brown,3]=0
    return Image.fromarray(a)

def drop_shadow(im):
    a=np.array(im.convert('RGBA'))
    r,g,b,al=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int),a[:,:,3]
    purple=(al>32)&(b>r+8)&(b>g-6)&(r<140)
    a[purple,3]=0
    return Image.fromarray(a)

def fit_btn(im, size=(256,256), pivot_y=210):
    im=erode_alpha(largest_blob(drop_shadow(key_green(im))),1)
    box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    im=im.crop(box)
    scale=min((size[0]-20)/im.width,(pivot_y-12)/im.height)
    im=im.resize((max(1,round(im.width*scale)), max(1,round(im.height*scale))), RES)
    canvas=Image.new('RGBA', size)
    x=(size[0]-im.width)//2
    y=pivot_y-im.height
    canvas.alpha_composite(im,(x,max(0,y)))
    return canvas

def depress_btn(up):
    """Darken the plunger. Geometry stays identical so up/down do not jump."""
    a=np.array(up.convert('RGBA'))
    r,g,b,al=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int),a[:,:,3]
    plunger=(al>32)&(r>140)&(g>50)&(b<120)&(r>g+10)
    a[plunger,0]=np.clip(a[plunger,0]-36,0,255).astype('uint8')
    a[plunger,1]=np.clip(a[plunger,1]-28,0,255).astype('uint8')
    a[plunger,2]=np.clip(a[plunger,2]-12,0,255).astype('uint8')
    return Image.fromarray(a)

def idle_metrics():
    idle=Image.open(OUT/'characters'/'hamster_idle_base.png')
    a=np.array(idle.getchannel('A'))
    box=Image.fromarray(a).getbbox()
    top,bot=box[1],box[3]
    band=a[top:top+int((bot-top)*0.38)]
    xs=np.where(band>32)[1]
    return {'height':bot-top,'bottom':bot,'head_cx':int((xs.min()+xs.max())/2) if len(xs) else 256}

def place_seated(im, metrics):
    im=strip_table_line(erode_alpha(largest_blob(key_green(im)),1))
    box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    im=im.crop(box)
    scale=metrics['height']/im.height
    im=im.resize((max(1,round(im.width*scale)), max(1,round(im.height*scale))), RES)
    aa=np.array(im.getchannel('A'))
    band=aa[0:int(aa.shape[0]*0.38)]
    xs=np.where(band>32)[1]
    head_cx=int((xs.min()+xs.max())/2) if len(xs) else im.width//2
    canvas=Image.new('RGBA',(512,512))
    x=metrics['head_cx']-head_cx
    y=metrics['bottom']-im.height
    canvas.alpha_composite(im,(x,y))
    a=np.array(canvas)
    al=a[:,:,3]
    rows=np.where(al.max(1)>32)[0]
    if len(rows):
        for y in range(int(rows.max()), int(rows.min()), -1):
            xs=np.where(al[y]>32)[0]
            if not len(xs): continue
            if a[y,xs,0].mean()<145 and a[y,xs,2].mean()<25:
                a[y,xs,3]=0
            else:
                break
    return Image.fromarray(a)

def save(assets, id, im, group, pivot, z, **extra):
    path=OUT/group/f'{id}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGBA').save(path)
    assets[id]={'file':path.relative_to(OUT).as_posix(),'canvas':list(im.size),'pivotX':pivot[0],'pivotY':pivot[1],'zIndex':z,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra}

def main():
    metrics=idle_metrics()
    assets={}
    up=fit_btn(Image.open(RAW/'28.jpg'))
    dn=depress_btn(up)
    save(assets,'btn_hamster_up',up,'ui',[128,210],36,role='table gadget idle')
    save(assets,'btn_hamster_down',dn,'ui',[128,210],36,role='table gadget pressed')
    seated={
        'hamster_press': '33.jpg',
        'hamster_seated_glad_01': '34.jpg',
        'hamster_seated_glad_02': '37.jpg',
        'hamster_seated_glad_03': '38.jpg',
        'hamster_seated_wipe_01': '32.jpg',
        'hamster_seated_wipe_02': '39.jpg',
    }
    for id, jpg in seated.items():
        canvas=place_seated(Image.open(RAW/jpg), metrics)
        save(assets,id,canvas,'characters',[256,448],40,tableContact=[256,448],containsCup=False,seated=True)
    manifest=json.loads((OUT/'asset_manifest.json').read_text('utf-8'))
    manifest['assets'].update(assets)
    manifest['animations']['clap']={
        'frames':['hamster_idle_base','hamster_seated_glad_01','hamster_seated_glad_03','hamster_seated_glad_02','hamster_seated_glad_01','hamster_idle_base'],
        'fps':10,'loop':False,'play':'after-cleanup-seated','pose':'seated'
    }
    manifest['animations']['wipe']={
        'frames':['hamster_idle_base','hamster_seated_wipe_01','hamster_seated_wipe_02','hamster_seated_wipe_01','hamster_seated_glad_01','hamster_idle_base'],
        'fps':10,'loop':False,'play':'after-cleanup-seated-when-busy','pose':'seated'
    }
    manifest['scene']['dressing']=[]
    manifest['scene']['button']={'up':'btn_hamster_up','down':'btn_hamster_down','position':[548,778],'scale':0.28}
    manifest['scene']['cleanup']['press']='hamster_press'
    manifest['scene']['cleanup']['ending']={'1':'clap','2':'clap','3':'clap','4':'wipe'}
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest,ensure_ascii=False)+';','utf-8')
    print('packed', list(assets))
    print('button canvas', assets['btn_hamster_up']['canvas'], assets['btn_hamster_down']['canvas'])

if __name__=='__main__':
    main()
