"""Pack remaining P1 sprites into production-v2 without rewriting approved v2 art."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, numpy as np
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'production-v2'
RAW=Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0af9f-1576-7fb3-80a1-7de6f3b96803\images')
RES=Image.Resampling.NEAREST

def key_edges(im, thresh=14, light=False):
    a=np.array(im.convert('RGBA'))
    h,w=a.shape[:2]
    vis=np.zeros((h,w), dtype=bool)
    q=deque()
    def seed(y,x):
        pix=a[y,x,:3]
        if light:
            return int(pix.min())>=thresh
        return int(pix.max())<=thresh
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

def normalized(im, size=(512,512), height=380, baseline=472):
    im=im.convert('RGBA')
    box=im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    if not box:
        raise ValueError('empty')
    im=im.crop(box)
    scale=min(height/im.height, (size[0]-24)/im.width)
    im=im.resize((max(1, round(im.width*scale)), max(1, round(im.height*scale))), RES)
    canvas=Image.new('RGBA', size)
    canvas.alpha_composite(im, ((size[0]-im.width)//2, baseline-im.height))
    return canvas

def foot_center(im, y0=450, y1=473, target=256):
    aa=np.array(im.getchannel('A'))
    feet=np.where(aa[y0:y1]>32)[1]
    if not len(feet):
        return im, 0
    dx=round(target-(int(feet.min())+int(feet.max()))/2)
    out=Image.new('RGBA', im.size)
    out.alpha_composite(im, (dx, 0))
    return out, dx

def save(assets, id, im, group, pivot, z, **extra):
    path=OUT/group/f'{id}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGBA').save(path)
    assets[id]={'file':path.relative_to(OUT).as_posix(),'canvas':list(im.size),'pivotX':pivot[0],'pivotY':pivot[1],'zIndex':z,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra}
    return im

Z_GLYPH=["11111","00010","00100","01000","11111"]
def stamp_glyph(draw, x, y, s, glyph, fill, outline):
    for gy, row in enumerate(glyph):
        for gx, ch in enumerate(row):
            if ch!='1': continue
            draw.rectangle((x+gx*s, y+gy*s, x+(gx+1)*s, y+(gy+1)*s), fill=outline)
            draw.rectangle((x+gx*s+1, y+gy*s+1, x+(gx+1)*s-1, y+(gy+1)*s-1), fill=fill)

def make_zzz():
    frames=[]
    for i in range(5):
        im=Image.new('RGBA', (256,256))
        d=ImageDraw.Draw(im)
        rise=i*12
        alpha=70+i*35 if i<4 else 110
        fill=(255, 236, 186, min(255, alpha))
        outline=(96, 58, 32, min(255, alpha+50))
        marks=[(40, 168-rise, 4),(88, 128-rise, 6),(148, 78-rise, 8)]
        for n, (ox, oy, s) in enumerate(marks):
            if n>i: continue
            stamp_glyph(d, ox, oy, s, Z_GLYPH, fill, outline)
        frames.append(im)
    return frames

def make_question():
    frames=[]
    glyph=[
        '01110',
        '10001',
        '00001',
        '00010',
        '00100',
        '00100',
        '00000',
        '00100',
    ]
    for i in range(5):
        im=Image.new('RGBA', (256,256))
        d=ImageDraw.Draw(im)
        s=5+i
        x,y=128-2*s, 90-i*6
        fill=(255, 244, 214, 80+i*30)
        outline=(112, 64, 36, 200)
        for gy, row in enumerate(glyph):
            for gx, ch in enumerate(row):
                if ch=='1':
                    d.rectangle((x+gx*s, y+gy*s, x+(gx+1)*s-1, y+(gy+1)*s-1), fill=outline)
                    d.rectangle((x+gx*s+1, y+gy*s+1, x+(gx+1)*s-2, y+(gy+1)*s-2), fill=fill)
        frames.append(im)
    return frames

def fx_sequence(src, kind):
    src=src.convert('RGBA')
    box=src.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    src=src.crop(box)
    frames=[]
    for i in range(5):
        canvas=Image.new('RGBA', (256,256))
        h=90+i*10
        im=src.resize((max(1, round(src.width*h/src.height)), h), RES)
        a=np.array(im)
        fade=[.25,.7,1,.65,.2][i]
        a[:,:,3]=(a[:,:,3].astype(float)*fade).astype('uint8')
        im=Image.fromarray(a)
        if kind=='sweat':
            canvas.alpha_composite(im, ((256-im.width)//2, 40+i*18))
        elif kind=='condensation':
            canvas.alpha_composite(im, ((256-im.width)//2, 70-i*4))
        else:
            canvas.alpha_composite(im, ((256-im.width)//2, 224-im.height-i*8))
        frames.append(canvas)
    return frames

def build():
    assets={}
    src_dir=OUT/'source'
    src_dir.mkdir(exist_ok=True)

    def take(jpg, png, light=False, thresh=16):
        dest=src_dir/png
        if dest.exists() and not (RAW/jpg).exists():
            return Image.open(dest).convert('RGBA')
        im=key_edges(Image.open(RAW/jpg), 210 if light else thresh, light=light)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest)
        return im
    sleep_map={'01':'4.jpg','02':'8.jpg','03':'13.jpg'}
    sleep_ids=[]
    for n, name in sleep_map.items():
        im=take(name, f'hamster_sleep_{n}.png')
        if n=='03':
            a=np.array(im)
            a[850:,:,3]=0
            im=Image.fromarray(a)
        raw=src_dir/f'hamster_sleep_{n}.png'
        im.save(raw)
        canvas=normalized(im, (512,512), 360, 448)
        sid='hamster_sleep_'+n
        sleep_ids.append(sid)
        save(assets, sid, canvas, 'characters', [256,448], 40, tableContact=[256,448], containsCup=False, source='p1 sleep pose')
    save(assets, 'hamster_sleep_base', Image.open(OUT/'characters/hamster_sleep_01.png'), 'characters', [256,448], 40, tableContact=[256,448], containsCup=False, source='p1 sleep rest')

    clap_map={'01':'6.jpg','02':'14.jpg','03':'10.jpg'}
    clap_ids=[]
    for n, name in clap_map.items():
        im=take(name, f'hamster_clap_{n}.png')
        im.save(src_dir/f'hamster_clap_{n}.png')
        canvas=normalized(im, (512,512), 380, 472)
        canvas, dx=foot_center(canvas)
        cid='hamster_clap_'+n
        clap_ids.append(cid)
        save(assets, cid, canvas, 'characters', [256,472], 40, containsCup=False, bodyCenter=[256,300], source='p1 clap ending', registrationOffsetX=dx)

    wipe_map={'01':'5.jpg','02':'9.jpg','03':'12.jpg'}
    wipe_ids=[]
    for n, name in wipe_map.items():
        im=take(name, f'hamster_wipe_{n}.png')
        im.save(src_dir/f'hamster_wipe_{n}.png')
        canvas=normalized(im, (512,512), 380, 472)
        canvas, dx=foot_center(canvas)
        wid='hamster_wipe_'+n
        wipe_ids.append(wid)
        save(assets, wid, canvas, 'characters', [256,472], 40, containsCup=False, bodyCenter=[256,300], source='p1 wipe ending', registrationOffsetX=dx)

    paws=take('11.jpg','paw_front.png')
    pa=np.array(paws); pa[780:,:,3]=0; pa[:580,:,3]=0
    paws=Image.fromarray(pa)
    paws.save(src_dir/'paw_front.png')
    box=paws.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    paws=paws.crop(box).resize((180,90), RES)
    paw_canvas=Image.new('RGBA', (256,256))
    paw_canvas.alpha_composite(paws, (38, 70))
    save(assets, 'paw_front', paw_canvas, 'characters', [128, 110], 55, overlay='draw after attached cup', source='p1 finger occlusion')

    cond=take('2.jpg','fx_condensation_source.png', light=True)
    sweat=take('1.jpg','fx_sweat_source.png', light=True)
    for i, im in enumerate(fx_sequence(cond, 'condensation'), 1):
        save(assets, f'fx_condensation_{i:02d}', im, 'effects', [128,224], 70)
    for i, im in enumerate(fx_sequence(sweat, 'sweat'), 1):
        save(assets, f'fx_sweat_{i:02d}', im, 'effects', [128,224], 70)
    for i, im in enumerate(make_zzz(), 1):
        save(assets, f'fx_zzz_{i:02d}', im, 'effects', [128,224], 72)
    for i, im in enumerate(make_question(), 1):
        save(assets, f'fx_question_{i:02d}', im, 'effects', [128,224], 72)

    manifest=json.loads((OUT/'asset_manifest.json').read_text('utf-8'))
    manifest['assets'].update(assets)
    manifest['animations']['sleep']={'frames':['hamster_sleep_01','hamster_sleep_02','hamster_sleep_03','hamster_sleep_02','hamster_sleep_01','hamster_sleep_03','hamster_sleep_02','hamster_sleep_01'],'fps':6,'loop':False,'play':'night-entry-or-click','rest':'hamster_sleep_01'}
    manifest['animations']['clap']={'frames':['hamster_clap_01','hamster_clap_02','hamster_clap_03','hamster_clap_02','hamster_clap_03','hamster_clap_02','hamster_clap_01','hamster_cleanup_12'],'fps':8,'loop':False,'play':'after-cleanup'}
    manifest['animations']['wipe']={'frames':['hamster_wipe_01','hamster_wipe_02','hamster_wipe_01','hamster_wipe_03','hamster_wipe_01','hamster_wipe_03','hamster_cleanup_12'],'fps':8,'loop':False,'play':'after-cleanup-when-tired'}
    for name in ['zzz','condensation','sweat','question']:
        manifest['animations'][name]={'frames':[f'fx_{name}_{i:02d}' for i in range(1,6)],'fps':8,'loop':False,'play':'with owning character animation'}
    manifest['status']='p1-complete-app-integration'
    manifest['p1']={'sleep':'independent seated sleep with knitted blanket','zzz':'overlay sequence','clap':'cleanup ending','wipe':'tired ending','fingerOcclusion':'paw_front drawn after attached cup','fx':['condensation','sweat','question']}
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), 'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest, ensure_ascii=False)+';', 'utf-8')
    print(f'Packed {len(assets)} P1 assets')

if __name__=='__main__':
    build()
