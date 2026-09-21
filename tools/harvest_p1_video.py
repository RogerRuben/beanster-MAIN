"""Extract video frames, chroma-key mint, register to idle/cleanup pivots, pack scene props."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np, json, hashlib, shutil
import imageio.v2 as iio

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'production-v2'
VID=Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0af9f-1576-7fb3-80a1-7de6f3b96803')
IMG=VID/'images'
RES=Image.Resampling.NEAREST
GREEN=np.array([0,232,160], dtype=np.int16)

def key_green(im, tol=48):
    a=np.array(im.convert('RGB'), dtype=np.int16)
    d=np.abs(a-GREEN).sum(axis=2)
    rgba=np.array(im.convert('RGBA'))
    rgba[:,:,3]=np.where(d<=tol, 0, 255).astype('uint8')
    # also flood near-green from edges
    h,w=d.shape
    from collections import deque
    vis=np.zeros((h,w), bool)
    q=deque()
    for x in range(w):
        q.append((0,x)); q.append((h-1,x))
    for y in range(h):
        q.append((y,0)); q.append((y,w-1))
    while q:
        y,x=q.popleft()
        if x<0 or y<0 or x>=w or y>=h or vis[y,x] or d[y,x]>tol+12:
            continue
        vis[y,x]=True
        rgba[y,x,3]=0
        q.extend(((y-1,x),(y+1,x),(y,x-1),(y,x+1)))
    return Image.fromarray(rgba)

def erode(im, size=3):
    a=im.getchannel('A').filter(ImageFilter.MinFilter(size))
    im=im.copy(); im.putalpha(a); return im

def key_color(im, rgb, light=False, thresh=18):
    a=np.array(im.convert('RGBA'))
    pix=a[:,:,:3].astype(np.int16)
    if light:
        mask=pix.min(axis=2)>=thresh
    else:
        mask=np.abs(pix-np.array(rgb,np.int16)).sum(axis=2)<=thresh
    from collections import deque
    h,w=mask.shape
    vis=np.zeros((h,w), bool)
    q=deque()
    for x in range(w):
        q.append((0,x)); q.append((h-1,x))
    for y in range(h):
        q.append((y,0)); q.append((y,w-1))
    while q:
        y,x=q.popleft()
        if x<0 or y<0 or x>=w or y>=h or vis[y,x] or not mask[y,x]:
            continue
        vis[y,x]=True
        a[y,x,3]=0
        q.extend(((y-1,x),(y+1,x),(y,x-1),(y,x+1)))
    return Image.fromarray(a)

def place(im, size, baseline, center_x=256, height=300):
    im=erode(im.convert('RGBA'))
    box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    if not box:
        raise ValueError('empty')
    im=im.crop(box)
    scale=min(height/im.height, (size[0]-40)/im.width)
    im=im.resize((max(1,round(im.width*scale)), max(1,round(im.height*scale))), RES)
    canvas=Image.new('RGBA', size)
    x=center_x-im.width//2
    y=baseline-im.height
    canvas.alpha_composite(im, (x, y))
    return canvas

def save(assets, id, im, group, pivot, z, **extra):
    path=OUT/group/f'{id}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGBA').save(path)
    assets[id]={'file':path.relative_to(OUT).as_posix(),'canvas':list(im.size),'pivotX':pivot[0],'pivotY':pivot[1],'zIndex':z,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra}
    return im

def extract(mp4, every=8):
    r=iio.get_reader(mp4)
    frames=[]
    for i, frame in enumerate(r):
        if i%every==0:
            frames.append(Image.fromarray(frame))
    r.close()
    return frames

def contact(frames, path, keyed=False):
    n=len(frames); cols=min(6,n); rows=(n+cols-1)//cols
    sheet=Image.new('RGB', (cols*180, rows*200), '#efe4d4')
    d=ImageDraw.Draw(sheet)
    for i,im in enumerate(frames):
        im=im.convert('RGBA')
        if keyed:
            im=key_green(im)
        im.thumbnail((160,160), RES)
        x=i%cols*180+10; y=i//cols*200+8
        bg=Image.new('RGBA', im.size, (239,228,212,255)); bg.alpha_composite(im)
        sheet.paste(bg.convert('RGB'), (x,y))
        d.text((x,y+164), str(i), fill='#472e20')
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)

def pick(frames, idxs):
    return [frames[min(i, len(frames)-1)] for i in idxs]

def main():
    qa=OUT/'qa'
    sleep_raw=extract(VID/'videos'/'1.mp4', 8)
    clap_raw=extract(VID/'videos'/'2.mp4', 8)
    wipe_raw=extract(VID/'videos'/'3.mp4', 8)
    contact(sleep_raw, qa/'video-sleep.png')
    contact(clap_raw, qa/'video-clap.png')
    contact(wipe_raw, qa/'video-wipe.png')
    print('sleep', len(sleep_raw), 'clap', len(clap_raw), 'wipe', len(wipe_raw))

    # Prefer the middle of each clip where motion actually happens; skip identical tails.
    sleep_idx=[0,2,4,6,8,10,12,14]
    clap_idx=[1,3,5,7,9,11,13,15]
    wipe_idx=[0,3,4,5,6,7,8,0]
    assets={}

    sleep_ids=[]
    for i, im in enumerate(pick(sleep_raw, sleep_idx), 1):
        keyed=key_green(im)
        canvas=place(keyed, (512,512), 448, 256, height=305)
        sid=f'hamster_sleep_{i:02d}'
        sleep_ids.append(sid)
        save(assets, sid, canvas, 'characters', [256,448], 40, tableContact=[256,448], containsCup=False, source='video sleep')
    shutil.copy2(OUT/'characters'/f'{sleep_ids[0]}.png', OUT/'characters'/'hamster_sleep_base.png')
    save(assets, 'hamster_sleep_base', Image.open(OUT/'characters'/'hamster_sleep_base.png'), 'characters', [256,448], 40, tableContact=[256,448], containsCup=False, source='video sleep rest')

    clap_ids=[]
    for i, im in enumerate(pick(clap_raw, clap_idx), 1):
        keyed=key_green(im)
        canvas=place(keyed, (512,512), 472, 256, height=379)
        cid=f'hamster_clap_{i:02d}'
        clap_ids.append(cid)
        save(assets, cid, canvas, 'characters', [256,472], 40, containsCup=False, bodyCenter=[256,300], source='video clap')

    wipe_ids=[]
    for i, im in enumerate(pick(wipe_raw, wipe_idx), 1):
        keyed=key_green(im)
        canvas=place(keyed, (512,512), 472, 256, height=379)
        wid=f'hamster_wipe_{i:02d}'
        wipe_ids.append(wid)
        save(assets, wid, canvas, 'characters', [256,472], 40, containsCup=False, bodyCenter=[256,300], source='video wipe')

    # Scene: furnished room, night, ivy, rug, chalkboard
    day=Image.open(IMG/'15.jpg').convert('RGBA').resize((768,1024), RES)
    night=Image.open(IMG/'19.jpg').convert('RGBA').resize((768,1024), RES)
    save(assets, 'scene_room_day', day, 'scene', [384,1024], 0, source='corner-v191 + ref cafe')
    save(assets, 'scene_room_night', night, 'scene', [384,1024], 0, source='night edit of furnished room')

    ivy=key_color(Image.open(IMG/'18.jpg'), (0,0,0), thresh=24)
    ivy_box=ivy.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    ivy=ivy.crop(ivy_box).resize((280,420), RES)
    ivy_c=Image.new('RGBA', (320,480)); ivy_c.alpha_composite(ivy, (20,0))
    save(assets, 'ivy_hanging', ivy_c, 'scene', [160,0], 80, overlay='foreground cascade')

    rug=key_color(Image.open(IMG/'17.jpg'), (255,255,255), light=True, thresh=230)
    rb=rug.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    rug=rug.crop(rb).resize((640,280), RES)
    oval=Image.new('L', (640,280), 0)
    ImageDraw.Draw(oval).ellipse((8,8,631,271), fill=255)
    rug.putalpha(ImageChops.multiply(rug.getchannel('A'), oval))
    save(assets, 'floor_rug', rug, 'scene', [320,140], 15)

    board=key_color(Image.open(IMG/'16.jpg'), (255,255,255), light=True, thresh=235)
    bb=board.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
    board=board.crop(bb).resize((160,210), RES)
    board_c=Image.new('RGBA', (180,240)); board_c.alpha_composite(board, (10,10))
    save(assets, 'chalkboard', board_c, 'scene', [90,240], 18)

    manifest=json.loads((OUT/'asset_manifest.json').read_text('utf-8'))
    manifest['assets'].update(assets)
    calm=['hamster_idle_base','hamster_idle_01','hamster_idle_base','hamster_idle_05']*3+['hamster_idle_base','hamster_idle_base']
    manifest['animations']['idle']={'frames':calm[:16],'fps':8,'loop':False,'play':'entry-or-click','rest':'hamster_idle_base'}
    manifest['animations']['sleep']={'frames':sleep_ids,'fps':8,'loop':False,'play':'night-entry-or-click','rest':sleep_ids[0]}
    manifest['animations']['clap']={'frames':clap_ids+['hamster_cleanup_12'],'fps':10,'loop':False,'play':'after-cleanup'}
    manifest['animations']['wipe']={'frames':wipe_ids+['hamster_cleanup_12'],'fps':10,'loop':False,'play':'after-cleanup-when-tired'}
    manifest['scene']['room']={'day':'scene_room_day','night':'scene_room_night'}
    manifest['scene']['chair']={'position':[338,702],'scale':0.58}
    manifest['scene']['cleanup']={'position':[508,932],'scale':0.66,'walk':False,'seated':False}
    manifest['status']='p1-motion-stabilized-scene-depth'
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), 'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest, ensure_ascii=False)+';', 'utf-8')

    for name, ids in [('sleep', sleep_ids),('clap', clap_ids),('wipe', wipe_ids)]:
        contact([Image.open(OUT/'characters'/f'{i}.png') for i in ids], qa/f'{name}-registered.png', keyed=False)
    print('packed', len(assets), 'idle frames', len(manifest['animations']['idle']['frames']))

if __name__=='__main__':
    main()
