"""Deterministic extraction, canvas normalization and layer splitting of approved art.
No generative drawing here: all painted pixels originate in user or ImageGen PNGs.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, shutil
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/production-v2'
RES=Image.Resampling.NEAREST
assets={}
def save(id,im,group,pivot=None,z=0,**extra):
    im=im.convert('RGBA'); path=OUT/group/(id+'.png');path.parent.mkdir(parents=True,exist_ok=True);im.save(path)
    assets[id]={'file':path.relative_to(OUT).as_posix(),'canvas':list(im.size),'pivotX':(pivot or [im.width//2,im.height])[0],'pivotY':(pivot or [im.width//2,im.height])[1],'zIndex':z,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra}
    return im
def normalized(im,size=(256,256),height=184,baseline=224):
    im=im.convert('RGBA');box=im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    if not box:raise ValueError('Empty asset')
    im=im.crop(box);scale=min(height/im.height,(size[0]-32)/im.width)
    im=im.resize((round(im.width*scale),round(im.height*scale)),RES)
    canvas=Image.new('RGBA',size);canvas.alpha_composite(im,((size[0]-im.width)//2,baseline-im.height));return canvas

def build():
    # Original frames retain their authored pose; align the same hand/table baseline.
    clips=json.loads((ROOT/'seated_clips.js').read_text().split('=',1)[1].rstrip(';\n'))
    anchors=[[[185,513],[540,514],[891,516],[1248,515],[190,950],[541,950],[892,950],[1248,950]],[[126,397],[372,397],[598,398],[844,400],[1085,398],[1315,399]]]
    ims=[Image.open(ROOT/'art/coffee-room'/f).convert('RGBA') for f in ['seated-expressions-user.png','seated-actions-user.png']]
    idle=[]
    for n,(sheet,frame) in enumerate([(0,i) for i in range(8)]+[(1,i) for i in range(6)]+[(0,2),(0,0)]):
        src=ims[sheet]; mask=Image.new('L',src.size);d=ImageDraw.Draw(mask)
        for y,x,w in clips[sheet][frame]:d.line((x,y,x+w-1,y),fill=255)
        rgba=np.array(src);rgba[:,:,3]=np.minimum(rgba[:,:,3],np.array(mask));im=Image.fromarray(rgba)
        box=mask.getbbox();im=im.crop(box);scale=.96 if sheet==0 else 1.44
        im=im.resize((round(im.width*scale),round(im.height*scale)),RES)
        ax,ay=anchors[sheet][frame];canvas=Image.new('RGBA',(512,512));canvas.alpha_composite(im,(round(256-(ax-box[0])*scale),round(448-(ay-box[1])*scale)))
        id='hamster_idle_base' if n==0 else f'hamster_idle_{n:02d}';idle.append(id)
        save(id,canvas,'characters',[256,448],40,tableContact=[256,448],source=f'user atlas {sheet}, frame {frame}',containsCup=False)
    cleanup=[]
    for n in range(1,13):
        id=f'hamster_cleanup_{n:02d}';p=OUT/'source'/(id+'.png')
        if not p.exists():continue
        im=normalized(Image.open(p),(512,512),380,472)
        aa=np.array(im.getchannel('A'));feet=np.where(aa[450:473]>32)[1]
        dx=round(256-(int(feet.min())+int(feet.max()))/2) if len(feet) else 0
        stable=Image.new('RGBA',(512,512));stable.alpha_composite(im,(dx,0));im=stable;cleanup.append(id)
        anchors=[[254,348],[252,371],[200,388],[173,371],[185,396],[245,348],[245,337],[296,331],[288,365],[307,395],[311,395],[254,354]]
        ax,ay=anchors[n-1];ax+=dx
        phase=['table','table','table','grasp','grasp','hand','hand','carry','carry','lower','release','complete'][n-1]
        save(id,im,'characters',[256,472],40,containsCup=False,bodyCenter=[256,300],cupAnchorX=ax,cupAnchorY=ay,cupAnchorKind=phase,cupAttached=n in [4,6,7,8,9,10],anchorSpace='asset-pixels',registrationOffsetX=dx)
    # Nine approved coffee sprites, exported as actual individual PNG files.
    src=Image.open(ROOT/'art/coffee-room/drinks.png').convert('RGBA');w,h=src.size
    names=['latte','americano','cold_brew','flat_white','mocha','coconut_latte','matcha','pour_over','takeaway']
    for i,name in enumerate(names):
        im=src.crop((round(i%3*w/3),round(i//3*h/3),round((i%3+1)*w/3),round((i//3+1)*h/3)))
        save('cup_'+name,normalized(im),'cups',[128,224],50,bottomCenter=[128,224],hot=name not in ['cold_brew','coconut_latte','matcha'])
    for name in ['cappuccino','dirty','espresso']:
        p=OUT/'source'/('cup_'+name+'.png')
        if p.exists():save('cup_'+name,normalized(Image.open(p)),'cups',[128,224],50,bottomCenter=[128,224],hot=name!='dirty')
    # Split one original table, ensuring an exact reconstructable union.
    table=Image.open(ROOT/'art/coffee-room/table.png').convert('RGBA').resize((1024,342),RES)
    back=table.copy();front=table.copy();a=np.array(table);yy,xx=np.indices(a.shape[:2]);boundary=190+76*np.sqrt(np.maximum(0,1-((xx-512)/510)**2));frontmask=yy>=boundary
    ab=a.copy();af=a.copy();ab[frontmask,3]=0;af[~frontmask,3]=0
    save('table_back',Image.fromarray(ab),'scene',[512,280],30);save('table_front',Image.fromarray(af),'scene',[512,280],60)
    shelf=Image.open(ROOT/'art/coffee-room/shelf.png').convert('RGBA').resize((1024,342),RES)
    save('storage_empty',shelf,'storage',[512,300],10)
    a=np.array(shelf);a[0:270,36:988,3]=0
    save('storage_front_mask',Image.fromarray(a),'storage',[512,300],60)
    for id,size,pivot,z in [('scene_background',(768,1024),(384,1024),0),('window_day',(320,400),(160,400),5),('window_night',(320,400),(160,400),5),('lamp',(180,280),(90,0),15),('plant',(240,320),(120,296),20),('chair',(280,360),(140,336),25)]:
        p=OUT/'source'/(id+'.png')
        if not p.exists():continue
        im=Image.open(p).convert('RGBA')
        if id=='scene_background':im=im.resize(size,RES)
        else:im=normalized(im,size,size[1]-32,size[1]-16)
        save(id,im,'scene',pivot,z)
    # Preserve the original window frame pixel-for-pixel, replacing only the glass.
    dayp=OUT/'source/window_day.png';nightp=OUT/'source/window_night.png'
    if dayp.exists() and nightp.exists():
        day=Image.open(dayp).convert('RGBA');night=Image.open(nightp).convert('RGBA').resize(day.size,RES)
        for box in [(313,224,940,632),(314,700,940,1028)]:day.paste(night.crop(box),box)
        save('window_night',normalized(day,(320,400),368,384),'scene',[160,400],5,geometry='same day frame; pane-only replacement')
    p=OUT/'source/storage_box.png'
    if p.exists():
        im=normalized(Image.open(p),(512,512),400,472);save('box_open',im,'storage',[256,472],45)
        a=np.array(im);lid=a.copy();body=a.copy();front=a.copy()
        lid[263:,:,3]=0;body[:263,:,3]=0;front[:376,:,3]=0;body[376:,:,3]=0
        save('box_lid',Image.fromarray(lid),'storage',[256,263],42,hinge=[256,263])
        save('box_body',Image.fromarray(body),'storage',[256,472],44,receiveAnchor=[256,358])
        save('box_front',Image.fromarray(front),'storage',[256,472],60)
        closedp=OUT/'source/box_closed_source.png'
        if closedp.exists():
            original=Image.open(p).convert('RGBA');box=original.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
            closed=Image.open(closedp).convert('RGBA').resize(original.size,RES).crop(box)
            scale=min(400/(box[3]-box[1]),480/(box[2]-box[0]));closed=closed.resize((round(closed.width*scale),round(closed.height*scale)),RES)
            layer=Image.new('RGBA',(512,512));layer.alpha_composite(closed,((512-closed.width)//2,472-closed.height))
            al=np.array(layer);al[376:,:,3]=0;save('box_lid_closed',Image.fromarray(al),'storage',[256,263],59)
            layer=Image.fromarray(al);layer.alpha_composite(Image.fromarray(front));save('box_closed',layer,'storage',[256,472],45)
        # Intermediate lid angle, still separate from body/front and an entering cup.
        srcq=np.float32([[75,72],[437,72],[427,263],[85,263]])
        dstq=np.float32([[72,181],[440,181],[427,263],[85,263]])
        matrix=[];values=[]
        for (x,y),(u,v) in zip(dstq,srcq):
            matrix.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);values.extend([u,v])
        coeff=np.linalg.solve(np.array(matrix),np.array(values))
        mid=np.array(Image.fromarray(lid).transform((512,512),Image.Transform.PERSPECTIVE,coeff,RES))
        save('box_lid_opening',Image.fromarray(mid),'storage',[256,263],42)
        middle=Image.fromarray(mid);middle.alpha_composite(Image.fromarray(body));middle.alpha_composite(Image.fromarray(front));save('box_opening',middle,'storage',[256,472],45)
        save('box_receiving',im,'storage',[256,472],45,receiveAnchor=[256,358],note='Cup is a separate live record sprite between body and front')
        save('box_close',middle,'storage',[256,472],45,note='Reverse transition to box_closed')
    # Pixel-native UI primitives (no text baked in) and independent contact shadows.
    for name,w,h in [('small',32,10),('medium',40,12)]:
        im=Image.new('RGBA',(64,24));d=ImageDraw.Draw(im);d.ellipse(((64-w)//2,(24-h)//2,(64+w)//2,(24+h)//2),fill=(65,37,20,55));save('cup_shadow_'+name,im.resize((256,96),RES),'scene',[128,48],48)
    for name,source in [('steam','deco_steam'),('sparkle','deco_sparkles'),('heart','deco_hearts')]:
        src=Image.open(ROOT/'art/upgrade-v1/png/decorations'/(source+'@2x.png')).convert('RGBA')
        for f in range(5):
            im=normalized(src,(256,256),120+f*8,212-f*12);a=np.array(im);a[:,:,3]=(a[:,:,3].astype(float)*[.25,.7,1,.65,.2][f]).astype('uint8');save(f'fx_{name}_{f+1:02d}',Image.fromarray(a),'effects',[128,224],70)
    for name in ['home','record','collection','monthly','settings']:
        icon=Image.new('RGBA',(32,32));d=ImageDraw.Draw(icon);ink='#70472e'
        if name=='home':
            d.line([(5,15),(16,5),(27,15)],fill=ink,width=3);d.rectangle((8,15,24,27),outline=ink,width=3);d.rectangle((14,20,18,27),fill=ink)
        elif name=='collection':
            d.rectangle((5,5,27,27),outline=ink,width=3)
            for y in [13,22]:d.line((6,y,26,y),fill=ink,width=2)
            for x,y in [(9,8),(20,8),(9,17),(20,17)]:d.rectangle((x,y,x+3,y+4),fill=ink)
        else:
            source={'record':'note','monthly':'monthly','settings':'settings'}[name]
            icon=normalized(Image.open(ROOT/'art/upgrade-v1/png/icons'/f'icon_{source}@2x.png'),(64,64),44,54).resize((32,32),RES)
        for state in ['default','selected','pressed','disabled']:
            tile=Image.new('RGBA',(40,40));td=ImageDraw.Draw(tile)
            if state in ['selected','pressed']:td.rounded_rectangle((1,1,38,38),radius=5,fill='#e8cfad' if state=='selected' else '#cead87',outline='#8b593a',width=2)
            tile.alpha_composite(icon,(4,5 if state=='pressed' else 4))
            if state=='disabled':a=np.array(tile);a[:,:,3]=(a[:,:,3]*.35).astype('uint8');tile=Image.fromarray(a)
            save(f'nav_{name}_{state}',tile.resize((120,120),RES),'ui',[60,60],100)
    for name in ['record','collection','more']:
        for state in ['normal','pressed','disabled']:
            im=Image.new('RGBA',(160,40));d=ImageDraw.Draw(im)
            fill={'normal':'#805135','pressed':'#5f3825','disabled':'#c7b8a7'}[state]
            if name!='record' and state=='normal':fill='#f7ecdb'
            d.rounded_rectangle((2,2,157,37),radius=10,fill=fill,outline='#805135',width=2)
            save(f'button_{name}_{state}',im.resize((640,160),RES),'ui',[320,80],100,textBaked=False)
    for name,color in [('normal','#795033'),('near_limit','#c08535'),('over_limit','#aa4839')]:
        im=Image.new('RGBA',(128,160));d=ImageDraw.Draw(im);d.rounded_rectangle((17,10,105,145),radius=25,outline=color,width=4);save('gauge_'+name,im.resize((256,320),RES),'ui',[128,290],20,textBaked=False)
    im=Image.new('RGBA',(128,160));d=ImageDraw.Draw(im);d.rounded_rectangle((23,16,99,139),radius=20,fill='white');save('gauge_fill_mask',im.resize((256,320),RES),'ui',[128,290],15)
    im=Image.new('RGBA',(128,160));d=ImageDraw.Draw(im)
    for y in [39,67,95,123]:d.line((89,y,97,y),fill='#bd9875',width=2)
    save('gauge_ticks',im.resize((256,320),RES),'ui',[128,290],21)
    plank=Image.open(OUT/'storage/box_front.png').crop((75,390,435,464)).resize((320,80),RES)
    for state in ['normal','new_item','highlight']:
        im=Image.new('RGBA',(352,112));im.alpha_composite(plank,(16,16))
        if state=='new_item':ImageDraw.Draw(im).ellipse((320,10,340,30),fill='#b64c30',outline='#ffe6b4',width=3)
        save('entrance_'+state,im,'storage',[176,56],65,textBaked=False)
    im=Image.new('RGBA',(88,28));d=ImageDraw.Draw(im)
    for i,alpha in [(0,20),(1,40),(2,75)]:d.rounded_rectangle((i,i,87-i,27-i),radius=4,outline=(255,193,64,alpha),width=1)
    save('entrance_glow',im.resize((352,112),RES),'storage',[176,56],66)
    animations={'idle':{'frames':idle,'fps':8,'loop':False,'play':'entry-or-click','rest':'hamster_idle_base'},'cleanup':{'frames':[f'hamster_cleanup_{n:02d}' for n in [1,2,3,5,4,6,7,8,9,10,11,12]],'fps':8,'loop':False,'cupBinding':'cup bottomCenter -> cupAnchor; draw cup over character; release into box before front mask'},'quickTransfer':{'frames':[f'hamster_cleanup_{n:02d}' for n in [4,6,9,11,12]],'fps':10,'loop':False},'box':{'frames':['box_closed','box_opening','box_open','box_receiving','box_close','box_closed'],'fps':6,'loop':False}}
    for name in ['steam','sparkle','heart']:animations[name]={'frames':[f'fx_{name}_{i:02d}' for i in range(1,6)],'fps':10,'loop':name=='steam','play':'only while global animation player owns scene'}
    manifest={'schemaVersion':2,'status':'asset-validation-passed-app-integration-pending','units':'pixels','coordinateSystem':{'origin':'top-left','x':'right','y':'down','anchorFormula':'world = spritePosition + (anchor - pivot) * scale'},'assets':assets,'animations':animations,'table':{'canvas':[1024,342],'maxVisibleCups':4,'overflow':'more-button','slots':{'1':[[512,184]],'2':[[360,186],[664,186]],'3':[[280,178],[512,206],[744,178]],'4':[[232,176],[418,208],[606,208],[792,176]]},'cupDisplayScale':0.62},'storage':{'canvas':[1024,342],'slots':[[180,275],[402,275],[624,275],[846,275]],'cupDisplayScale':.72,'repeatRows':True,'records':'one-slot-per-record-id; never merge drinks'},'layers':['scene_background','window_day/window_night','lamp','plant','chair','table_back','hamster','cup_shadow','cup','table_front'],'integration':{'save':'record persists immediately; visual collection is never a separate inventory','cleanup':'snapshot previous visible desk IDs only; exclude today and backdated additions; consume once; skip cancels animation only','maxSimultaneousAnimations':1,'reducedMotion':'show rest and completed state immediately'}}
    manifest['scene']={'canvas':[768,1024],'table':{'position':[384,830],'scale':.66},'idle':{'position':[390,714],'scale':.72},'storageBox':{'position':[620,925],'scale':.4},'recordAppears':{'effect':'sparkle','durationMs':350},'recordDeletes':{'scale':[1,0],'opacity':[1,0],'durationMs':180}}
    manifest['box']={'layerOrder':['box_lid','box_body','liveCup','box_front'],'receiveAnchor':[256,358],'states':{'closed':['box_lid_closed','box_front'],'opening':['box_lid_opening','box_body','box_front'],'open':['box_lid','box_body','box_front'],'receiving':['box_lid','box_body','liveCup','box_front'],'close':['box_lid_opening','box_body','box_front']}}
    manifest['ui']={'navigationStates':['default','selected','pressed','disabled'],'buttonStates':['normal','pressed','disabled'],'labels':'live text, not baked','gauge':{'outline':'gauge_normal','fillMask':'gauge_fill_mask','ticks':'gauge_ticks','states':{'normal':[0,.8],'near_limit':[.8,1],'over_limit':[1,None]},'fill':'clip dynamic coffee color to fill mask; 0..1 ratio, bottom up'}}
    manifest['entrance']={'normal':['entrance_normal'],'new_item':['entrance_new_item'],'highlight':['entrance_highlight','entrance_glow'],'text':'收藏室','textBaked':False}
    (OUT/'asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
    (OUT/'asset_manifest.js').write_text('window.BEANSTER_ASSETS='+json.dumps(manifest,ensure_ascii=False)+';','utf-8')
    for group,ids in [('cleanup',cleanup),('idle',idle),('cups',[i for i in assets if i.startswith('cup_')])]:
        qa=Image.new('RGB',(1024,((len(ids)+3)//4)*280),'#efe4d4');d=ImageDraw.Draw(qa)
        for i,id in enumerate(ids):
            im=Image.open(OUT/assets[id]['file']);im.thumbnail((240,240),RES);x=i%4*256;y=i//4*280;qa.paste(im,(x+(256-im.width)//2,y),im);d.text((x+6,y+250),id,fill='#472e20')
        qa.save(OUT/'qa'/(group+'.png'))
    print(f'Built {len(assets)} assets')
if __name__=='__main__':build()
