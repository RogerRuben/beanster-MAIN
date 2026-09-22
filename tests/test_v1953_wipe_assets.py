"""Wipe frames stay one hamster on a transparent 512 canvas."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'art' / 'production-v2'
m = json.loads((P / 'asset_manifest.json').read_text(encoding='utf-8'))
frames = []
for fid in dict.fromkeys(m['animations']['wipe']['frames']):
    if fid == 'hamster_idle_base':
        continue
    frames.append(fid)
assert 'hamster_seated_wipe_start' in frames and 'hamster_seated_wipe_release' in frames

def components(alpha):
    mask = alpha > 40
    seen = np.zeros(mask.shape, dtype=bool)
    found = []
    h, w = mask.shape
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
            found.append(n)
    return sorted(found, reverse=True)

sheet_frames = ['hamster_idle_base', *frames]
cell = 180
sheet = Image.new('RGB', (cell * len(sheet_frames), cell), (40, 40, 40))
px = sheet.load()
for y in range(cell):
    for x in range(sheet.size[0]):
        px[x, y] = (214, 214, 214) if ((x // 12) + (y // 12)) % 2 == 0 else (148, 148, 148)
for i, fid in enumerate(sheet_frames):
    asset = m['assets'][fid]
    im = Image.open(P / asset['file']).convert('RGBA')
    assert im.size == (512, 512), fid
    assert im.getchannel('A').getextrema()[0] == 0, fid
    assert [asset['pivotX'], asset['pivotY']] == [256, 448], fid
    alpha = np.array(im.getchannel('A'))
    comps = components(alpha)
    assert comps and (len(comps) == 1 or comps[1] < max(800, comps[0] * 0.08)), (fid, comps)
    # a wide dim rule under the paws reads as a second edge
    rgb = np.array(im)
    for y in range(512):
        opaque = rgb[y, :, 3] > 20
        n = int(opaque.sum())
        if n < 200:
            continue
        r, g, b = rgb[y, :, 0], rgb[y, :, 1], rgb[y, :, 2]
        purple = opaque & (r > 40) & (r < 130) & (g < 30) & (b < 80)
        assert not (int(purple.sum()) > 200 and purple.sum() / n > 0.8), fid
    thumb = im.resize((cell, cell), Image.Resampling.NEAREST)
    sheet.paste(thumb, (i * cell, 0), thumb)
qa = ROOT / 'qa' / 'v1953'
qa.mkdir(parents=True, exist_ok=True)
sheet.save(qa / 'wipe-checker.png')
print('PASS wipe assets', frames)
