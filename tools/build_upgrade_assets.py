"""Slice ImageGen production atlases, extract alpha, and assemble integration assets.

Requires Pillow with animated WebP support and numpy. No API calls.
Run from any directory: python tools/build_upgrade_assets.py
"""
from pathlib import Path
import json
import math
import hashlib
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'art' / 'upgrade-v1'
SOURCE = ROOT / 'source-atlases'
ASSETS = []
MASTER = {}
FRAME_SIZE = 256


def stabilize_character_frames(asset_id, frames):
    """Align a consistent cream face component, rather than props or swinging paws."""
    from collections import deque
    anchors=[]
    for frame in frames:
        a=np.array(frame);r,g,b=[a[:,:,i].astype(int) for i in range(3)]
        mask=(a[:,:,3]>180)&(r>170)&(g>155)&(b>95)&(r-b<115)&(r>=g)&(g>=b)
        mask[192:,:]=False
        if asset_id=='character_monthly':mask[:,:128]=False
        seen=np.zeros(mask.shape,bool);parts=[]
        for y,x in zip(*np.where(mask)):
            if seen[y,x]:continue
            seen[y,x]=True;q=deque([(int(x),int(y))]);points=[]
            while q:
                xx,yy=q.popleft();points.append((xx,yy))
                for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                    if 0<=nx<256 and 0<=ny<256 and mask[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=True;q.append((nx,ny))
            if len(points)>20:parts.append(points)
        face=max(parts,key=len)
        anchors.append(float(np.mean([p[0] for p in face])))
    target=float(np.median(anchors));out=[];offsets=[]
    for frame,anchor in zip(frames,anchors):
        dx=round(target-anchor);bbox=frame.getchannel('A').getbbox()
        dx=max(4-bbox[0],min(dx,252-bbox[2]))
        fixed=Image.new('RGBA',(256,256));fixed.alpha_composite(frame,(dx,0));out.append(fixed);offsets.append(dx)
    return out,dict(anchor='cream-face-component',xBefore=anchors,xAfter=[a+d for a,d in zip(anchors,offsets)],offsetsX=offsets)


def remove_background(image, kind):
    """Remove only the generated intermediate matte, preserving interior artwork."""
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[:, :, :3].astype(np.float32)
    if kind == 'magenta':
        excess = rgb[:, :, 2] - rgb[:, :, 1]
        keyed = (excess > 12) & (rgb[:, :, 0] - rgb[:, :, 1] > 12)
        alpha = np.ones(excess.shape, np.float32)
        alpha[keyed] = np.clip(1 - excess[keyed] / 255, 0, 1)
        alpha[keyed & (excess > 175)] = 0
        # Unmix the magenta matte at antialiased edges.
        rgb[keyed] = np.clip((rgb[keyed] - (1-alpha[keyed, None]) * np.array([255, 0, 255])) / np.maximum(alpha[keyed, None], .001), 0, 255)
        rgba[:, :, :3] = rgb.astype(np.uint8)
        rgba[:, :, 3] = np.minimum(rgba[:, :, 3], (alpha * 255).astype(np.uint8))
    else:
        neutral = (rgb.max(2) - rgb.min(2) < 27) & (rgb.min(2) > 110)
        mask = Image.fromarray(np.pad(neutral, 1, constant_values=True).astype(np.uint8)*255).copy()
        ImageDraw.floodfill(mask, (0,0), 128)
        background = np.array(mask)[1:-1,1:-1] == 128
        rgba[background, 3] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, 'RGBA')


def fit(image, size, margin=.08):
    bounds = image.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError('Empty extracted asset')
    image = image.crop(bounds)
    max_size = round(size * (1 - margin * 2))
    factor = min(max_size / image.width, max_size / image.height)
    image = image.resize((max(1, round(image.width * factor)), max(1, round(image.height * factor))), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', (size, size))
    result.alpha_composite(image, ((size - image.width)//2, (size - image.height)//2))
    return result


def write_png(image, path):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def add_asset(asset_id, label, group, image, origin):
    master = fit(image, 384)
    MASTER[asset_id] = master
    paths = {}
    for scale in (1, 2, 3):
        relative = f'png/{group}/{asset_id}@{scale}x.png'
        write_png(master.resize((128*scale, 128*scale), Image.Resampling.LANCZOS), relative)
        paths[f'{scale}x'] = relative
    ASSETS.append(dict(id=asset_id, label=label, category=group, png=paths,
                       logicalSize=[128, 128], source=origin, alpha=True))


CHARACTERS = [
    ('character_coffee', '手持咖啡', 'characters'),
    ('character_burger', '汉堡搭配', 'characters'),
    ('character_first_cup', '第一杯到位', 'characters'),
    ('character_recording', '记录中', 'characters'),
    ('character_late_night', '深夜加班', 'characters'),
    ('character_goal', '达成目标', 'characters'),
    ('character_takeaway', '外带出发', 'characters'),
    ('character_monthly', '月报统计', 'characters'),
    ('character_idle', '迷你待机', 'characters'),
    ('character_wave', '挥手招呼', 'characters'),
    ('portrait_happy', '开心', 'portraits'),
    ('portrait_calm', '平静', 'portraits'),
    ('portrait_sleepy', '困倦', 'portraits'),
    ('portrait_excited', '兴奋', 'portraits'),
]
BADGES = [
    ('stamp_1', '1 杯', 'stamps'), ('stamp_2', '2 杯', 'stamps'),
    ('stamp_3', '3 杯', 'stamps'), ('stamp_4plus', '4 杯以上', 'stamps'),
    ('stamp_over', '超标', 'stamps'),
    ('achievement_first_cup', '第一杯到位', 'achievements'),
    ('achievement_week', '连续记录 7 天', 'achievements'),
    ('achievement_month', '月报达人', 'achievements'),
    ('achievement_expert', '咖啡因达人', 'achievements'),
    ('achievement_night', '夜猫记录者', 'achievements'),
    ('achievement_morning', '早起打卡', 'achievements'),
    ('sticker_recorded', '已记录', 'stickers'), ('sticker_done', '完成！', 'stickers'),
    ('sticker_cheer', '加油！', 'stickers'), ('sticker_sleep', '睡眠友好', 'stickers'),
    ('sticker_good', '状态不错', 'stickers'), ('sticker_goal', '今日达标', 'stickers'),
    ('locked_week', '连续记录 7 天（未解锁）', 'locked'),
    ('locked_month', '月报达人（未解锁）', 'locked'),
    ('locked_expert', '咖啡因达人（未解锁）', 'locked'),
]
DRINKS = [
    ('drink_latte', '拿铁', 'drinks'), ('drink_americano', '美式', 'drinks'),
    ('drink_cold_brew', '冷萃', 'drinks'), ('drink_cappuccino', '卡布奇诺', 'drinks'),
    ('drink_mocha', '摩卡', 'drinks'), ('drink_coconut_latte', '生椰拿铁', 'drinks'),
    ('drink_iced_americano', '冰美式', 'drinks'), ('drink_pour_over', '手冲', 'drinks'),
    ('cup_small', '小杯', 'cups'), ('cup_medium', '中杯', 'cups'),
    ('cup_large', '大杯', 'cups'), ('cup_extra_large', '超大杯', 'cups'),
    ('cup_custom', '自定义容量', 'cups'),
    ('icon_caffeine', '咖啡因', 'icons'), ('icon_calories', '热量', 'icons'),
    ('icon_cost', '花费', 'icons'), ('icon_time', '时间', 'icons'),
    ('icon_brand', '品牌', 'icons'), ('icon_cups', '杯数', 'icons'),
    ('icon_sleep', '睡眠', 'icons'), ('icon_goal', '目标', 'icons'),
    ('icon_note', '备注', 'icons'), ('icon_camera', '拍照', 'icons'),
    ('icon_add', '添加记录', 'icons'), ('icon_edit', '编辑', 'icons'),
    ('icon_delete', '删除', 'icons'), ('icon_share', '分享', 'icons'),
    ('icon_filter', '筛选', 'icons'), ('icon_calendar', '日历', 'icons'),
    ('icon_monthly', '月报', 'icons'), ('icon_achievement', '成就', 'icons'),
    ('icon_settings', '设置', 'icons'), ('icon_back', '返回', 'icons'),
    ('icon_more', '更多', 'icons'), ('detail_beans', '咖啡豆组合', 'decorations'),
    ('detail_sparkles', '闪光组合', 'decorations'),
    ('empty_no_coffee', '还没喝咖啡', 'empty-states'),
    ('empty_goal', '今日已达标', 'empty-states'),
    ('empty_first_record', '去记录第一杯', 'empty-states'),
    ('empty_rest', '先休息一下', 'empty-states'),
    ('detail_paw', '橙色爪印', 'decorations'),
    ('detail_trend_arrows', '彩色上升箭头', 'decorations'),
]
DECORATIONS = [
    ('deco_bean_dark', '深烘豆', 'decorations'), ('deco_bean_medium', '中烘豆', 'decorations'),
    ('deco_bean_light', '浅烘豆', 'decorations'), ('deco_bean_green', '生豆', 'decorations'),
    ('deco_bean_pair', '双咖啡豆', 'decorations'), ('deco_steam', '咖啡热气', 'decorations'),
    ('deco_sparkles', '金色闪光', 'decorations'), ('deco_paw_orange', '橙色脚印', 'decorations'),
    ('deco_paw_beige', '米色脚印', 'decorations'), ('deco_stars', '三色星星', 'decorations'),
    ('deco_hearts', '三色爱心', 'decorations'), ('deco_glints', '十字亮点', 'decorations'),
    ('deco_leaves', '绿叶', 'decorations'), ('deco_flowers', '小雏菊', 'decorations'),
    ('deco_bow', '蝴蝶结', 'decorations'), ('deco_bunting', '彩旗', 'decorations'),
    ('deco_confetti', '彩纸', 'decorations'),
    ('label_add_cup', '加一杯', 'labels'), ('label_success', '记录成功', 'labels'),
    ('label_keep_going', '继续保持', 'labels'),
]


def clean_cut_edges(image):
    rgba = np.array(image)
    foreground = rgba[:, :, 3] > 32
    # Only remove small fragments connected to a cut boundary, never the subject.
    mask = Image.fromarray(np.pad(foreground, 1, constant_values=True).astype(np.uint8)*255).copy()
    ImageDraw.floodfill(mask, (0,0), 128)
    fragments = np.array(mask)[1:-1,1:-1] == 128
    if fragments.any():
        if fragments.sum() > foreground.sum() * .12:
            raise ValueError('Major artwork touches crop edge: adjust source crop')
        rgba[fragments] = 0
    return Image.fromarray(rgba)


def slice_atlas(name, entries, xs, ys, matte):
    source = Image.open(SOURCE / f'{name}.png')
    source = remove_background(source, matte)
    assert source.getchannel('A').getextrema()[0] == 0, 'Source matte was not removed'
    write_png(source, f'atlases/{name}-transparent.png')
    for idx, entry in enumerate(entries):
        row, col = divmod(idx, len(xs)-1)
        # Generated sheets have approximate grids; choose actual empty gutters.
        band = np.array(source.getchannel('A'))[ys[row]:ys[row+1]]
        counts = (band > 32).sum(axis=0)
        boundaries = [xs[0]]
        for nominal in xs[1:-1]:
            candidates = range(max(1, nominal-35), min(source.width-1, nominal+36))
            boundaries.append(min(candidates, key=lambda x: (counts[x-3:x+4].sum(), abs(x-nominal))))
        boundaries.append(xs[-1])
        box = (boundaries[col], ys[row], boundaries[col+1], ys[row+1])
        try:
            cutout = clean_cut_edges(source.crop(box))
        except ValueError as error:
            raise ValueError(f'{entry[0]} at {box}: {error}') from error
        add_asset(*entry, cutout, {'atlas': name, 'crop': list(box)})


def save_gif(frames, relative, durations):
    # One shared palette avoids frame-to-frame color flicker; index 255 is clear.
    palette_source = Image.new('RGB', (FRAME_SIZE * len(frames), FRAME_SIZE), '#332419')
    for idx, frame in enumerate(frames):
        palette_source.paste(frame.convert('RGB'), (idx*FRAME_SIZE, 0))
    palette = palette_source.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    out = []
    for frame in frames:
        pal = frame.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE)
        p = np.array(pal)
        p[np.array(frame.getchannel('A')) < 128] = 255
        result = Image.fromarray(p, 'P')
        result.putpalette((palette.getpalette()[:765] + [0, 0, 0]))
        result.info['transparency'] = 255
        out.append(result)
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    out[0].save(path, save_all=True, append_images=out[1:], loop=0,
                duration=durations, transparency=255, disposal=2, optimize=False)


def add_animation(asset_id, frames, durations, kind):
    # Remove obsolete numbered exports when a new animation has fewer frames.
    folder = ROOT / 'frames' / asset_id
    if folder.exists():
        for old in folder.glob('[0-9][0-9].png'):
            old.unlink()
    strip = Image.new('RGBA', (FRAME_SIZE * len(frames), FRAME_SIZE))
    for idx, frame in enumerate(frames):
        strip.alpha_composite(frame, (idx * FRAME_SIZE, 0))
        write_png(frame, f'frames/{asset_id}/{idx:02d}.png')
    strip_path = f'sprites/{asset_id}.png'
    write_png(strip, strip_path)
    gif_path = f'gif/{asset_id}.gif'
    save_gif(frames, gif_path, durations)
    webp_path = f'webp/{asset_id}.webp'
    (ROOT / 'webp').mkdir(exist_ok=True)
    frames[0].save(ROOT / webp_path, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, lossless=True, method=4)
    item = next(item for item in ASSETS if item['id'] == asset_id)
    item['animation'] = dict(gif=gif_path, webp=webp_path, spritesheet=strip_path,
                             frameSize=[FRAME_SIZE, FRAME_SIZE], frameCount=len(frames),
                             durationsMs=durations, loop=0, type=kind,
                             frames=[f'frames/{asset_id}/{i:02d}.png' for i in range(len(frames))])


def expressions():
    atlas = remove_background(Image.open(SOURCE / 'expressions.png'), 'magenta')
    write_png(atlas, 'atlases/expressions-transparent.png')
    for row, mood in enumerate(('happy', 'calm', 'sleepy', 'excited')):
        frames = []
        for col in range(6):
            crop = atlas.crop((col*256, row*256, (col+1)*256, (row+1)*256))
            # Same transform for every frame: preserve generated relative motion.
            crop = crop.resize((232,232), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (256,256))
            frame.alpha_composite(crop, (12,12))
            frames.append(frame)
        asset_id = f'portrait_{mood}'
        frames,alignment=stabilize_character_frames(asset_id,frames)
        next(item for item in ASSETS if item['id']==asset_id)['alignment']=alignment
        master = frames[0]
        MASTER[asset_id] = master.resize((384,384), Image.Resampling.LANCZOS)
        for scale in (1,2,3):
            write_png(master.resize((128*scale,128*scale), Image.Resampling.LANCZOS), f'png/portraits/{asset_id}@{scale}x.png')
        durations = [300,180,180,280,180,380] if mood != 'sleepy' else [400,300,380,500,300,500]
        add_animation(asset_id, frames, durations, 'generated-expression-frames')


def gentle_motion(item):
    # Intentional UI micro-animation: no claim that these are redrawn limb poses.
    base = fit(MASTER[item['id']], 240, margin=.06)
    frames = []
    for step in range(12):
        phase = step / 12 * math.tau
        dx = round(math.sin(phase) * (2 if item['category'] == 'characters' else 0))
        dy = round((1-math.cos(phase)) * -2)
        frame = Image.new('RGBA', (256,256))
        frame.alpha_composite(base, (8+dx,10+dy))
        frames.append(frame)
    add_animation(item['id'], frames, [100]*12, 'subtle-ui-float')


def character_actions():
    """Export actual articulated ImageGen poses, with one transform per row."""
    for sheet, entries in [('a', CHARACTERS[:5]), ('b', CHARACTERS[5:10])]:
        filename = f'character-actions-{sheet}.png'
        atlas = remove_background(Image.open(SOURCE / filename), 'magenta')
        write_png(atlas, f'atlases/character-actions-{sheet}-transparent.png')
        occupancy = (np.array(atlas.getchannel('A')) > 32).sum(axis=1)
        ys = [0]
        for boundary in range(1,5):
            nominal=round(boundary*atlas.height/5)
            ys.append(min(range(nominal-30,nominal+31), key=lambda y: (occupancy[y-2:y+3].sum(),abs(y-nominal))))
        ys.append(atlas.height)
        for row, (asset_id, _, _) in enumerate(entries):
            counts=(np.array(atlas.getchannel('A'))[ys[row]:ys[row+1]] > 32).sum(axis=0)
            xs=[0]
            for boundary in range(1,6):
                nominal=round(boundary*atlas.width/6)
                xs.append(min(range(nominal-20,nominal+21),key=lambda x:(counts[x-1:x+2].sum(),abs(x-nominal))))
            xs.append(atlas.width)
            # Exclude generation mistakes: missing coffee cup / missing pointer.
            columns = [0,1,2,3,5] if asset_id == 'character_coffee' else [0,1,2,4,5] if asset_id == 'character_monthly' else list(range(6))
            cuts = [clean_cut_edges(atlas.crop((xs[col], ys[row], xs[col+1], ys[row+1]))) for col in columns]
            bounds = [cut.getchannel('A').getbbox() for cut in cuts]
            union = (min(b[0] for b in bounds), min(b[1] for b in bounds),
                     max(b[2] for b in bounds), max(b[3] for b in bounds))
            factor = 224 / max(union[2]-union[0], union[3]-union[1])
            size = (round((union[2]-union[0])*factor), round((union[3]-union[1])*factor))
            frames = []
            for cut in cuts:
                frame = Image.new('RGBA', (256,256))
                frame.alpha_composite(cut.crop(union).resize(size, Image.Resampling.LANCZOS),
                                      ((256-size[0])//2, (256-size[1])//2))
                frames.append(frame)
            frames,alignment=stabilize_character_frames(asset_id,frames)
            MASTER[asset_id] = frames[0].resize((384,384), Image.Resampling.LANCZOS)
            item = next(item for item in ASSETS if item['id'] == asset_id)
            item['source'] = dict(atlas=filename, row=row, columns=columns)
            item['alignment']=alignment
            for scale in (1,2,3):
                write_png(frames[0].resize((128*scale,128*scale), Image.Resampling.LANCZOS), item['png'][f'{scale}x'])
            durations = [240]*len(frames)
            durations[0] = durations[-1] = 360
            add_animation(asset_id, frames, durations, 'generated-character-frames')


def overview():
    font_path = 'C:/Windows/Fonts/msyh.ttc'
    font = ImageFont.truetype(font_path, 18)
    small = ImageFont.truetype(font_path, 12)
    title_font = ImageFont.truetype(font_path, 34)
    cols, cell_w, cell_h = 8, 180, 184
    canvas = Image.new('RGB', (cols*cell_w+48, math.ceil(len(ASSETS)/cols)*cell_h+130), '#f8f0e5')
    draw = ImageDraw.Draw(canvas)
    draw.text((28,20), 'Beanster Sips · 升级资源包', fill='#432919', font=title_font)
    draw.text((30,70), '透明 PNG / GIF / WebP / Spritesheet  ·  点击 preview.html 查看动态与深浅背景', fill='#866047', font=font)
    for idx, item in enumerate(ASSETS):
        x = 24 + idx%cols*cell_w
        y = 112 + idx//cols*cell_h
        dark = idx%2 == 1
        draw.rounded_rectangle((x+4,y,x+cell_w-4,y+cell_h-8), radius=14, fill='#302b2b' if dark else '#fffdf9')
        tile = MASTER[item['id']].resize((132,132), Image.Resampling.LANCZOS)
        canvas.paste(tile,(x+24,y+2),tile)
        label = item['label'].replace('（未解锁）','· 锁定')
        draw.text((x+10,y+136),label,fill='#fff1dc' if dark else '#4b3023',font=font)
        draw.text((x+10,y+159),item['id'],fill='#c6ac91' if dark else '#94765d',font=small)
    canvas.save(ROOT/'contact-sheet.jpg', quality=94)


def validate():
    checks = []
    for item in ASSETS:
        path = ROOT/item['png']['2x']
        image = Image.open(path)
        a = np.array(image.getchannel('A'))
        assert image.mode == 'RGBA' and a.min()==0 and a.max()==255, item['id']
        assert not a[0].any() and not a[-1].any() and not a[:,0].any() and not a[:,-1].any(), item['id']
        result = dict(id=item['id'], alpha=True, clearBorder=True, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        if 'animation' in item:
            anim=item['animation']
            gif=Image.open(ROOT/anim['gif'])
            assert gif.n_frames > 1 and gif.info.get('loop')==0, item['id']
            distinct=set()
            for i in range(gif.n_frames):
                gif.seek(i)
                f=gif.convert('RGBA')
                alpha=np.array(f.getchannel('A'))
                assert alpha.min()==0 and not alpha[0].any(), item['id']
                distinct.add(hashlib.sha256(f.tobytes()).hexdigest())
            assert len(distinct)>1, item['id']
            result.update(gifFrames=gif.n_frames, distinctFrames=len(distinct), gifTransparent=True)
        checks.append(result)
    report=dict(assetCount=len(ASSETS), animationCount=sum('animation' in a for a in ASSETS),
                pngScales=[1,2,3], checks=checks,
                notes=['GIF uses binary transparency; use PNG frames or lossless WebP for soft alpha edges.',
                       'Ten characters and four portraits use generated sequential poses; stickers, empty states and labels use UI float motion.',
                       'Export scaling does not add detail beyond the source atlas.'])
    (ROOT/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"PASS: {len(ASSETS)} transparent assets; {report['animationCount']} transparent loop animations")


def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    slice_atlas('characters-keyed', CHARACTERS, [0,316,627,943,1254], [0,357,707,982,1254], 'magenta')
    slice_atlas('badges-keyed', BADGES, [0,282,560,842,1119,1402], [0,295,571,818,1122], 'magenta')
    slice_atlas('drinks', DRINKS, [0,194,388,582,776,970,1161], [0,213,439,608,768,930,1090,1355], 'magenta')
    slice_atlas('decorations', DECORATIONS, [0,280,560,841,1121,1402], [0,281,561,842,1122], 'magenta')
    expressions()
    character_actions()
    for item in ASSETS:
        if item['category'] in ('stickers','empty-states','labels'):
            gentle_motion(item)
    manifest=dict(name='Beanster Sips Upgrade Art', version=1, baseSize=128,
                  license='User-provided references, extracted/redrawn with built-in ImageGen.',
                  assets=ASSETS)
    data=json.dumps(manifest,ensure_ascii=False,indent=2)
    (ROOT/'manifest.json').write_text(data,encoding='utf-8')
    (ROOT/'manifest.js').write_text('window.BEANSTER_ART = '+data+';\n',encoding='utf-8')
    overview()
    validate()


if __name__ == '__main__':
    main()
