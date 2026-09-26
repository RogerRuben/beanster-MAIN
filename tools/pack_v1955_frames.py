"""Install V19.5.5 seat-exit frames and the locked wipe sequence.

seat_exit_01 is the seated idle pixels. seat_exit_04 is the standing idle pixels.
The two middle frames are new poses. Wipe frames are rejected if a second body remains.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art' / 'production-v2'
CHAR = OUT / 'characters'
IMG = Path(r'C:\Users\HP\.grok\sessions\D%3A%5Cgrok_build%5Chammond\01a0c797-8436-7f32-8d24-cb1aceb603a3\images')
QA = ROOT / 'qa' / 'v1955' / 'wipe'
QA.mkdir(parents=True, exist_ok=True)

def key_bg(im):
    arr = np.array(im.convert('RGBA'))
    bg = arr[0, 0, :3].astype(int)
    dist = np.abs(arr[:, :, :3].astype(int) - bg).sum(axis=2)
    body = Image.fromarray(((dist >= 60).astype(np.uint8) * 255))
    keep = np.array(body.filter(ImageFilter.MaxFilter(7))) > 0
    arr[~keep, 3] = 0
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
        while stack:
            cy, cx = stack.pop()
            n += 1
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
    comps = components(arr[:, :, 3])
    if not comps:
        raise SystemExit(name + ' has no body')
    if len(comps) > 1 and comps[1] > max(800, int(comps[0] * 0.08)):
        raise SystemExit(f'{name} has a second body {comps[:4]}')
    return comps

def erase_magenta_rule(arr):
    for y in range(arr.shape[0]):
        opaque = arr[y, :, 3] > 20
        n = int(opaque.sum())
        if n < 200:
            continue
        r, g, b = arr[y, :, 0], arr[y, :, 1], arr[y, :, 2]
        purple = opaque & (r > 40) & (r < 160) & (g < 40) & (b < 120)
        if int(purple.sum()) > 180 and purple.sum() / n > 0.75:
            arr[y, purple, 3] = 0
    return arr

def shift(arr, dx, dy):
    out = np.zeros_like(arr)
    h, w = arr.shape[:2]
    x0, x1 = max(0, dx), min(w, w + dx)
    y0, y1 = max(0, dy), min(h, h + dy)
    out[y0:y1, x0:x1] = arr[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    return out

def fit_height(arr, ref, height=None):
    ref_a = np.array(ref.split()[-1])
    rys, rxs = np.where(ref_a > 40)
    target_h = height or int(rys.max() - rys.min() + 1)
    ys, xs = np.where(arr[:, :, 3] > 40)
    crop = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    scale = target_h / crop.shape[0]
    im = Image.fromarray(crop).resize((max(1, int(round(crop.shape[1] * scale))), target_h), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    x = int(round((rxs.min() + rxs.max()) / 2 - im.width / 2))
    y = int(rys.max() + 1 - im.height)
    canvas.paste(im, (x, y), im)
    return np.array(canvas)

def align(arr, ref):
    target = np.array(ref.split()[-1]) > 40
    best = None
    for dy in range(-20, 21, 2):
        for dx in range(-20, 21, 2):
            moved = shift(arr, dx, dy)
            inter = np.logical_and(moved[:, :, 3] > 40, target).sum()
            if best is None or inter > best[0]:
                best = (int(inter), dx, dy)
    return shift(arr, best[1], best[2]), best

def feet_lock(arr, height):
    ys, xs = np.where(arr[:, :, 3] > 40)
    crop = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    scale = height / crop.shape[0]
    im = Image.fromarray(crop).resize((max(1, int(round(crop.shape[1] * scale))), height), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    canvas.paste(im, (256 - im.width // 2, 448 - im.height), im)
    return np.array(canvas)

def save_png(name, arr):
    assert_one_body(arr, name)
    im = Image.fromarray(arr)
    path = CHAR / f'{name}.png'
    im.save(path)
    print(name, 'comps', components(arr[:, :, 3])[:3], 'sha', hashlib.sha256(path.read_bytes()).hexdigest()[:12])
    return im

def copy_png(src_name, dest_name):
    im = Image.open(CHAR / f'{src_name}.png').convert('RGBA')
    arr = np.array(im)
    save_png(dest_name, arr)
    return im

def checker(frames, path):
    cell = 220
    sheet = Image.new('RGB', (cell * len(frames), cell + 36), (24, 24, 24))
    px = sheet.load()
    for y in range(cell):
        for x in range(cell * len(frames)):
            px[x, y] = (214, 214, 214) if ((x // 14) + (y // 14)) % 2 == 0 else (148, 148, 148)
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(frames):
        thumb = im.resize((cell, cell), Image.Resampling.NEAREST)
        sheet.paste(thumb, (i * cell, 0), thumb)
        draw.text((i * cell + 8, cell + 8), label, fill='white')
    sheet.save(path)

def asset_entry(filename, blob, source, family):
    return {
        'file': filename,
        'canvas': [512, 512],
        'pivotX': 256,
        'pivotY': 448,
        'zIndex': 40,
        'sha256': hashlib.sha256(blob).hexdigest(),
        'tableContact': [256, 448],
        'source': source,
        'containsCup': False,
        'family': family,
    }

def main():
    idle = Image.open(CHAR / 'hamster_idle_base.png').convert('RGBA')
    stand = Image.open(CHAR / 'hamster_stand_idle.png').convert('RGBA')
    ys = np.where(np.array(stand.split()[-1]) > 40)[0]
    stand_h = int(ys.max() - ys.min()) + 1
    copy_png('hamster_idle_base', 'hamster_seat_exit_01')
    lean = erase_magenta_rule(key_bg(Image.open(IMG / '14.jpg')))
    lean = fit_height(lean, idle)
    lean, info = align(lean, idle)
    print('exit_02 overlap', info)
    save_png('hamster_seat_exit_02', lean)
    crouch = erase_magenta_rule(key_bg(Image.open(IMG / '15.jpg')))
    crouch = feet_lock(crouch, max(280, int(stand_h * 0.92)))
    save_png('hamster_seat_exit_03', crouch)
    copy_png('hamster_stand_idle', 'hamster_seat_exit_04')
    copy_png('hamster_seat_exit_04', 'hamster_seat_enter_01')
    copy_png('hamster_seat_exit_03', 'hamster_seat_enter_02')
    copy_png('hamster_seat_exit_02', 'hamster_seat_enter_03')
    copy_png('hamster_seat_exit_01', 'hamster_seat_enter_04')

    for name in ('hamster_seated_wipe_start', 'hamster_seated_wipe_01', 'hamster_seated_wipe_release'):
        arr = erase_magenta_rule(np.array(Image.open(CHAR / f'{name}.png').convert('RGBA')))
        save_png(name, arr)
    hold = erase_magenta_rule(key_bg(Image.open(IMG / '12.jpg')))
    hold = fit_height(hold, idle)
    hold, info = align(hold, idle)
    print('wipe_hold overlap', info)
    save_png('hamster_seated_wipe_hold', hold)

    names = [
        ('01 idle', 'hamster_idle_base'),
        ('02 start', 'hamster_seated_wipe_start'),
        ('03 contact', 'hamster_seated_wipe_01'),
        ('04 hold', 'hamster_seated_wipe_hold'),
        ('05 release', 'hamster_seated_wipe_release'),
    ]
    frames = []
    for label, name in names:
        im = Image.open(CHAR / f'{name}.png').convert('RGBA')
        assert_one_body(np.array(im), name)
        im.save(QA / f'{label[:2]}.png')
        frames.append((label, im))
    checker(frames, QA / 'contact-sheet.png')

    manifest_path = OUT / 'asset_manifest.json'
    data = json.loads(manifest_path.read_text(encoding='utf-8'))
    family = {
        'hamster_seat_exit_01': 'seated',
        'hamster_seat_exit_02': 'transition',
        'hamster_seat_exit_03': 'transition',
        'hamster_seat_exit_04': 'standing',
        'hamster_seat_enter_01': 'standing',
        'hamster_seat_enter_02': 'transition',
        'hamster_seat_enter_03': 'transition',
        'hamster_seat_enter_04': 'seated',
        'hamster_seated_wipe_hold': 'seated',
    }
    for name, fam in family.items():
        blob = (CHAR / f'{name}.png').read_bytes()
        data['assets'][name] = asset_entry(f'characters/{name}.png', blob, 'V19.5.5 locked transition', fam)
    for name in ('hamster_seated_wipe_start', 'hamster_seated_wipe_01', 'hamster_seated_wipe_release'):
        blob = (CHAR / f'{name}.png').read_bytes()
        data['assets'][name]['sha256'] = hashlib.sha256(blob).hexdigest()
    data['animations']['wipe'] = {
        'frames': [
            'hamster_idle_base',
            'hamster_seated_wipe_start',
            'hamster_seated_wipe_01',
            'hamster_seated_wipe_hold',
            'hamster_seated_wipe_release',
            'hamster_idle_base',
        ],
        'fps': 10,
        'loop': False,
        'play': 'after-cleanup-seated-when-busy',
        'pose': 'seated',
        'durationsMs': [220, 280, 420, 420, 280, 180],
    }
    data['animations']['clap']['durationsMs'] = [200, 250, 300, 300, 250, 200]
    data['scene']['roam'] = {
        'locked': True,
        'route': [[320, 910], [225, 935], [390, 955], [545, 930], [390, 955], [225, 935], [320, 910]],
        'scales': {'exit': 0.76, 'left': 0.79, 'middle': 0.80, 'right': 0.79, 'seat': 0.72},
        'points': {
            'seat': [390, 714],
            'exit': [320, 910],
            'floorLeft': [225, 935],
            'floorMid': [390, 955],
            'floorRight': [545, 930],
        },
        'tableFrontY': 856,
    }
    manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    js = 'window.BEANSTER_ASSETS=' + json.dumps(data, ensure_ascii=False, separators=(', ', ': ')) + ';'
    (OUT / 'asset_manifest.js').write_text(js, encoding='utf-8')
    print('manifest updated', 'wipe', sum(data['animations']['wipe']['durationsMs']))

if __name__ == '__main__':
    main()
