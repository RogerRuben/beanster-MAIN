"""Key, register, and install V19.5.3 roam / wipe frames. Rejects a second body."""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art' / 'production-v2'
CHAR = OUT / 'characters'
SRC = Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0c797-8436-7f32-8d24-cb1aceb603a3\images')
QA = ROOT / 'qa' / 'v1953'
QA.mkdir(parents=True, exist_ok=True)

SEATED = {
    'hamster_seated_wipe_start': '2.jpg',
    'hamster_seated_wipe_release': '8.jpg',
}
BODY = {
    'hamster_stand_idle': '3.jpg',
    'hamster_walk_right_01': '5.jpg',
    'hamster_walk_right_02': '10.jpg',
    'hamster_walk_right_03': '4.jpg',
    'hamster_walk_right_04': '7.jpg',
    'hamster_stand_wave': '6.jpg',
}

def key_magenta(im):
    arr = np.array(im.convert('RGBA'))
    bg = arr[2, 2, :3].astype(int)
    dist = np.abs(arr[:,:,:3].astype(int) - bg).sum(axis=2)
    arr[dist < 110, 3] = 0
    return arr

def drop_rules(arr):
    dark = (arr[:,:,0] < 45) & (arr[:,:,1] < 45) & (arr[:,:,2] < 45) & (arr[:,:,3] > 20)
    seen = np.zeros(dark.shape, dtype=bool)
    h, w = dark.shape
    ys, xs = np.where(dark)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        cells = []
        while stack:
            cy, cx = stack.pop()
            cells.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx] or not dark[ny, nx]:
                        continue
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        yy = [c[0] for c in cells]
        xx = [c[1] for c in cells]
        if max(xx) - min(xx) >= 90 and max(yy) - min(yy) <= 8:
            for cy, cx in cells:
                arr[cy, cx, 3] = 0
    return arr

def components(alpha, thresh=40):
    mask = alpha > thresh
    seen = np.zeros(mask.shape, dtype=bool)
    h, w = mask.shape
    comps = []
    ys, xs = np.where(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        n = 0
        minx = maxx = x
        miny = maxy = y
        while stack:
            cy, cx = stack.pop()
            n += 1
            if cx < minx: minx = cx
            if cx > maxx: maxx = cx
            if cy < miny: miny = cy
            if cy > maxy: maxy = cy
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx] or not mask[ny, nx]:
                        continue
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if n > 40:
            comps.append(n)
    comps.sort(reverse=True)
    return comps

def assert_one_body(arr, name):
    comps = components(arr[:,:,3])
    if not comps:
        raise SystemExit(name + ' has no body')
    if len(comps) > 1 and comps[1] > max(800, comps[0] * 0.08):
        raise SystemExit(f'{name} has a second body {comps[:4]}')
    return comps

def shift(arr, dx, dy):
    out = np.zeros_like(arr)
    h, w = arr.shape[:2]
    x0, x1 = max(0, dx), min(w, w + dx)
    y0, y1 = max(0, dy), min(h, h + dy)
    out[y0:y1, x0:x1] = arr[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    return out

def fit_seated(arr, ref):
    ref_a = np.array(ref.split()[-1])
    rys, rxs = np.where(ref_a > 40)
    target_h = int(rys.max() - rys.min() + 1)
    ys, xs = np.where(arr[:,:,3] > 40)
    crop = arr[ys.min():ys.max()+1, xs.min():xs.max()+1]
    scale = target_h / crop.shape[0]
    im = Image.fromarray(crop).resize((max(1, int(round(crop.shape[1] * scale))), target_h), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    x = int(round((rxs.min() + rxs.max()) / 2 - im.width / 2))
    y = int(rys.max() + 1 - im.height)
    canvas.paste(im, (x, y), im)
    return np.array(canvas)

def erase_table_line(arr):
    body = arr[:,:,3] > 40
    orange = body & (arr[:,:,0] > 150) & (arr[:,:,1] > 80) & (arr[:,:,2] < 140)
    ys, xs = np.where(orange)
    if len(xs) == 0:
        return arr
    left, right = int(xs.min()), int(xs.max())
    dark = (arr[:,:,0] < 50) & (arr[:,:,1] < 50) & (arr[:,:,2] < 50) & (arr[:,:,3] > 20)
    for y in range(arr.shape[0]):
        row = np.where(dark[y])[0]
        if len(row) < 25:
            continue
        if int(row.min()) < left - 6 or int(row.max()) > right + 6:
            arr[y, dark[y], 3] = 0
    return arr

def erase_magenta_rule(arr):
    for y in range(arr.shape[0]):
        opaque = arr[y, :, 3] > 20
        n = int(opaque.sum())
        if n < 200:
            continue
        r, g, b = arr[y, :, 0], arr[y, :, 1], arr[y, :, 2]
        purple = opaque & (r > 40) & (r < 130) & (g < 30) & (b < 80)
        if int(purple.sum()) > 200 and purple.sum() / n > 0.8:
            arr[y, purple, 3] = 0
    return arr

def align_seated(arr, ref):
    arr = erase_magenta_rule(erase_table_line(fit_seated(arr, ref)))
    target = np.array(ref.split()[-1]) > 40
    best = None
    for dy in range(-24, 25, 2):
        for dx in range(-24, 25, 2):
            moved = shift(arr, dx, dy)
            mask = moved[:,:,3] > 40
            inter = np.logical_and(mask, target).sum()
            if best is None or inter > best[0]:
                best = (int(inter), dx, dy)
    return shift(arr, best[1], best[2]), best

def normalize_body(arr, height=340):
    alpha = arr[:,:,3]
    ys, xs = np.where(alpha > 40)
    if len(xs) == 0:
        raise SystemExit('empty body')
    crop = arr[ys.min():ys.max()+1, xs.min():xs.max()+1]
    scale = height / crop.shape[0]
    im = Image.fromarray(crop).resize((max(1, int(crop.shape[1] * scale)), height), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    x = 256 - im.width // 2
    y = 448 - im.height
    canvas.paste(im, (x, y), im)
    return np.array(canvas)

def checker(images, path):
    cell = 180
    sheet = Image.new('RGB', (cell * len(images), cell + 28), (30, 30, 30))
    px = sheet.load()
    for y in range(cell):
        for x in range(cell * len(images)):
            if ((x // 12) + (y // 12)) % 2 == 0:
                px[x, y] = (214, 214, 214)
            else:
                px[x, y] = (148, 148, 148)
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(images):
        thumb = im.resize((cell, cell), Image.Resampling.NEAREST)
        sheet.paste(thumb, (i * cell, 0), thumb)
        draw.text((i * cell + 4, cell + 6), name.replace('hamster_', '')[:22], fill='white')
    sheet.save(path)

def save_png(name, arr):
    im = Image.fromarray(arr)
    assert_one_body(arr, name)
    path = CHAR / f'{name}.png'
    im.save(path)
    return im

def mirror(arr):
    return np.array(Image.fromarray(arr).transpose(Image.Transpose.FLIP_LEFT_RIGHT))

def main():
    idle = Image.open(CHAR / 'hamster_idle_base.png').convert('RGBA')
    made = []
    for name, src in SEATED.items():
        arr = drop_rules(key_magenta(Image.open(SRC / src)))
        arr, info = align_seated(arr, idle)
        print(name, 'align overlap', info[0], 'shift', info[1], info[2], 'comps', components(arr[:,:,3])[:3])
        made.append((name, save_png(name, arr)))
    bodies = {}
    for name, src in BODY.items():
        arr = normalize_body(drop_rules(key_magenta(Image.open(SRC / src))))
        print(name, 'comps', components(arr[:,:,3])[:3])
        bodies[name] = arr
        made.append((name, save_png(name, arr)))
    walk = [bodies[f'hamster_walk_right_0{i}'] for i in range(1, 5)]
    for i in range(4):
        delta = np.abs(walk[i].astype(int) - walk[(i + 1) % 4].astype(int)).mean()
        print('walk delta', i, round(float(delta), 2))
        if delta < 2:
            raise SystemExit('walk frames are too similar to be a cycle')
    for i in range(1, 5):
        name = f'hamster_walk_left_0{i}'
        made.append((name, save_png(name, mirror(bodies[f'hamster_walk_right_0{i}']))))
    stale = CHAR / 'hamster_stand_up.png'
    if stale.exists():
        stale.unlink()
    manifest = json.loads((OUT / 'asset_manifest.json').read_text(encoding='utf-8'))
    manifest['assets'].pop('hamster_stand_up', None)
    template = manifest['assets']['hamster_idle_base']
    for name, im in made:
        raw = (CHAR / f'{name}.png').read_bytes()
        entry = dict(template)
        entry.update({
            'file': f'characters/{name}.png',
            'canvas': [512, 512],
            'pivotX': 256,
            'pivotY': 448,
            'zIndex': 40,
            'sha256': hashlib.sha256(raw).hexdigest(),
            'tableContact': [256, 448],
            'source': 'V19.5.3 keyed from the seated hamster, feet or paws locked to 256,448',
            'containsCup': False,
        })
        manifest['assets'][name] = entry
    manifest['animations']['clap']['durationsMs'] = [200, 240, 280, 320, 240, 180]
    manifest['animations']['wipe']['frames'] = [
        'hamster_idle_base', 'hamster_seated_wipe_start', 'hamster_seated_wipe_01',
        'hamster_seated_wipe_01', 'hamster_seated_wipe_release', 'hamster_seated_glad_01',
        'hamster_idle_base']
    manifest['animations']['wipe']['durationsMs'] = [180, 240, 280, 340, 260, 200, 180]
    manifest['animations']['walk'] = {
        'frames': [f'hamster_walk_right_0{i}' for i in range(1, 5)] + [f'hamster_walk_left_0{i}' for i in range(1, 5)],
        'fps': 8,
        'durationsMs': [180] * 8,
        'loop': True,
        'pose': 'roaming',
    }
    manifest['scene']['roam'] = {
        'points': {'seat': [390, 714], 'chairSide': [300, 800], 'floorLeft': [220, 910], 'floorMid': [400, 948], 'floorRight': [520, 912]},
        'scaleAt': [714, 948],
        'scaleSpan': [0.72, 0.8],
        'tableFrontY': 856,
        'firstDelay': [20000, 30000],
        'interval': [45000, 90000],
    }
    (OUT / 'asset_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'asset_manifest.js').write_text('window.BEANSTER_ASSETS=' + json.dumps(manifest, ensure_ascii=False) + ';', encoding='utf-8')
    seated_names = ['hamster_idle_base', 'hamster_seated_wipe_start', 'hamster_seated_wipe_01', 'hamster_seated_wipe_02', 'hamster_seated_wipe_release', 'hamster_seated_glad_01']
    checker([(n, Image.open(CHAR / f'{n}.png')) for n in seated_names], QA / 'wipe-checker.png')
    checker([(n, Image.open(CHAR / f'{n}.png')) for n in ['hamster_stand_idle', 'hamster_stand_wave'] + [f'hamster_walk_right_0{i}' for i in range(1, 5)]], QA / 'roam-poses.png')
    print('packed', len(made), 'frames')

if __name__ == '__main__':
    main()
