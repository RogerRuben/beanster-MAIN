"""Build a 2.5s seated idle: nine frames, body pixels locked, head sways and blinks."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "art" / "production-v2" / "characters"
SRC = CHAR / "hamster_pose_table_idle.png"
OUT_DIR = ROOT / "qa" / "idle-loop"
NECK = 230
# Nine shifts close the circle: the step from the last frame back to the first matches the first step.
SHIFTS = [0, 8, 12, 10, 4, -4, -10, -12, -8]
# 0 open, 1 squint, 2 closed. Blink sits on the way through center.
BLINK = [0, 0, 0, 1, 2, 2, 1, 0, 0]
# 400+310+310+250+180+180+250+310+310 = 2500
DURATIONS = [400, 310, 310, 250, 180, 180, 250, 310, 310]


def lenses(base):
    rgb = base[:, :, :3].astype(int)
    alpha = base[:, :, 3] > 40
    dark = alpha & (rgb.max(2) < 70)
    boxes = []
    for x0, x1 in ((188, 262), (262, 348)):
        region = np.zeros(dark.shape, bool)
        region[128:188, x0:x1] = True
        mask = dark & region
        ys, xs = np.where(mask)
        if len(xs) < 30:
            continue
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), mask))
    return boxes


def fur_color(base):
    rgb = base[:, :, :3]
    alpha = base[:, :, 3] > 40
    band = np.zeros(alpha.shape, bool)
    band[112:126, 200:320] = True
    pick = band & alpha & (rgb.max(2) > 120)
    if not pick.any():
        return np.array([232, 164, 96], np.uint8)
    return np.median(rgb[pick], axis=0).astype(np.uint8)


def shift_head(base, dx):
    out = base.copy()
    head = base[:NECK]
    out[:NECK] = 0
    if dx >= 0:
        out[:NECK, dx:] = head[:, : base.shape[1] - dx]
    elif dx < 0:
        out[:NECK, : base.shape[1] + dx] = head[:, -dx:]
    y0 = NECK - 16
    hole = (out[y0:NECK, :, 3] < 20) & (base[y0:NECK, :, 3] > 40)
    out[y0:NECK][hole] = base[y0:NECK][hole]
    alpha = out[:, :, 3] > 40
    for x in range(out.shape[1]):
        col = alpha[:, x]
        for y in range(NECK - 28, NECK):
            if col[y]:
                continue
            up = np.where(col[y - 10:y])[0]
            down = np.where(col[y + 1:y + 11])[0]
            if len(up) == 0 or len(down) == 0:
                continue
            c1 = out[y - 10 + up[-1], x].astype(np.int16)
            c2 = out[y + 1 + down[0], x].astype(np.int16)
            out[y, x] = ((c1 + c2) // 2).astype(np.uint8)
            out[y, x, 3] = 255
            col[y] = True
    out[NECK:] = base[NECK:]
    return out


def blink(frame, boxes, color, amount):
    if amount <= 0:
        return frame
    out = frame.copy()
    lid = np.array([214, 126, 64], np.uint8)
    slit = np.array([42, 24, 16], np.uint8)
    for x0, y0, x1, y1, mask in boxes:
        padded = np.pad(mask, 1, constant_values=False)
        rim = np.zeros(mask.shape, bool)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                rim |= mask & ~padded[1 + dy:mask.shape[0] + 1 + dy, 1 + dx:mask.shape[1] + 1 + dx]
        interior = mask & ~rim
        height = max(1, y1 - y0)
        top = int(y0 + height * (0.18 if amount >= 1 else 0.42))
        bot = int(y0 + height * (0.86 if amount >= 1 else 0.72))
        rows = (np.arange(out.shape[0]) >= top) & (np.arange(out.shape[0]) < bot)
        paint = interior.copy()
        paint[~rows] = False
        out[paint, :3] = lid
        mid = (y0 + y1) // 2
        slit_rows = (np.arange(out.shape[0]) >= mid - (2 if amount >= 1 else 1)) & (np.arange(out.shape[0]) <= mid + 1)
        slit_mask = interior.copy()
        slit_mask[~slit_rows] = False
        out[slit_mask, :3] = slit
    return out


def main():
    base = np.array(Image.open(SRC).convert("RGBA"))
    color = fur_color(base)
    found = lenses(base)
    if len(found) != 2:
        raise SystemExit(f"expected two lenses, found {len(found)}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / "art" / "production-v2" / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ids = []
    for i, (dx, eye, ms) in enumerate(zip(SHIFTS, BLINK, DURATIONS), start=1):
        frame = shift_head(base, dx)
        # Lenses moved with the head, so rebuild the mask on this frame.
        moved = lenses(frame) if eye else found
        if eye and len(moved) == 2:
            frame = blink(frame, moved, color, 0.45 if eye == 1 else 1)
        if not np.array_equal(frame[NECK:], base[NECK:]):
            raise SystemExit(f"frame {i} moved the body")
        name = f"hamster_pose_idle_{i:02d}"
        path = CHAR / f"{name}.png"
        Image.fromarray(frame).save(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        manifest["assets"][name] = {
            "file": f"characters/{name}.png",
            "canvas": [512, 512],
            "pivotX": 256,
            "pivotY": 448,
            "zIndex": 40,
            "sha256": digest,
            "tableContact": [256, 321],
            "source": "2.5s seated idle, body locked to hamster_pose_table_idle",
            "containsCup": False,
            "contactY": 321,
        }
        ids.append(name)
        print(name, "shift", dx, "blink", eye, "ms", ms, digest[:12])
    if sum(DURATIONS) != 2500:
        raise SystemExit(f"duration {sum(DURATIONS)}")
    manifest.setdefault("animations", {})
    manifest["animations"]["seatedIdle"] = {
        "frames": ids,
        "fps": 4,
        "durationsMs": DURATIONS,
        "loop": True,
        "pose": "seated",
        "totalMs": 2500,
    }
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    manifest_path.write_text(text, encoding="utf-8")
    js = ROOT / "art" / "production-v2" / "asset_manifest.js"
    js.write_text("window.BEANSTER_ASSETS=" + json.dumps(manifest, ensure_ascii=False) + ";", encoding="utf-8")
    print("frames", len(ids), "total", sum(DURATIONS))


if __name__ == "__main__":
    main()
