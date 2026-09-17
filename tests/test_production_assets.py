from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
import numpy as np
R=Path(__file__).resolve().parents[1];P=R/'art/production-v2';m=json.loads((P/'asset_manifest.json').read_text('utf-8'))
for id,a in m['assets'].items():
    p=P/a['file'];im=Image.open(p);assert list(im.size)==a['canvas'],id
    assert im.mode=='RGBA',id
    assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],id
    assert im.getchannel('A').getbbox(),id
    if id not in ['scene_background','storage_empty']:assert im.getchannel('A').getextrema()[0]==0,id
    assert 0<=a['pivotX']<=im.width and 0<=a['pivotY']<=im.height,id
    if id.startswith('hamster_cleanup'):
        assert a['containsCup'] is False
        assert a['canvas']==[512,512] and [a['pivotX'],a['pivotY']]==[256,472]
        assert 0<a['cupAnchorX']<512 and 0<a['cupAnchorY']<512
        pixels=np.array(im.getchannel('A'));feet=np.where(pixels[450:473]>32)[1]
        assert abs((int(feet.min())+int(feet.max()))/2-256)<=1,id
    if id.startswith('cup_') and 'shadow' not in id:
        assert a['canvas']==[256,256] and a['bottomCenter']==[128,224]
        assert im.getchannel('A').getbbox()[3]==224,id
for a in m['animations'].values():
    assert a['fps']>0 and all(f in m['assets'] for f in a['frames'])
assert len(m['animations']['cleanup']['frames'])==12
assert len(m['animations']['idle']['frames'])==16
assert len([i for i in m['assets'] if i.startswith('cup_') and 'shadow' not in i])==12
assert [len(m['table']['slots'][str(n)]) for n in range(1,5)]==[1,2,3,4]
table=Image.open(P/'scene/table_back.png');table.alpha_composite(Image.open(P/'scene/table_front.png'))
expected=Image.open(R/'art/coffee-room/table.png').convert('RGBA').resize((1024,342),Image.Resampling.NEAREST)
assert np.array_equal(np.array(table),np.array(expected)),'table layers must reconstruct exactly'
box=Image.open(P/'storage/box_lid.png');box.alpha_composite(Image.open(P/'storage/box_body.png'));box.alpha_composite(Image.open(P/'storage/box_front.png'))
assert np.array_equal(np.array(box),np.array(Image.open(P/'storage/box_open.png'))),'box layers must reconstruct exactly'
qa=Image.new('RGB',(1280,960),'#ded0b9');d=ImageDraw.Draw(qa);cup=Image.open(P/'cups/cup_latte.png').resize((128,128),Image.Resampling.NEAREST)
for i,id in enumerate(m['animations']['cleanup']['frames']):
    a=m['assets'][id];im=Image.open(P/a['file'])
    if a['cupAttached']:im.alpha_composite(cup,(a['cupAnchorX']-64,a['cupAnchorY']-112))
    im=im.resize((288,288),Image.Resampling.NEAREST);x=i%4*320;y=i//4*320;qa.paste(im,(x+16,y),im)
    cx=x+16+a['cupAnchorX']*288/512;cy=y+a['cupAnchorY']*288/512;d.line((cx-8,cy,cx+8,cy),fill='red',width=2);d.line((cx,cy-8,cx,cy+8),fill='red',width=2);d.text((x+16,y+290),f"{id}: {a['cupAnchorKind']} ({a['cupAnchorX']},{a['cupAnchorY']})",fill='black')
qa.save(P/'qa/cup-anchor-calibration.png')
print(f"PASS {len(m['assets'])} assets: RGBA/hash/canvas/pivots; 12 independent cups; stable feet; 12+16 frame sequences; exact table/box reconstruction.")
