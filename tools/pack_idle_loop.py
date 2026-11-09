"""Seated idle frames copied from the table pose. A blink never repaints the lenses pale, and the head is not shifted."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "art" / "production-v2" / "characters"
SRC = CHAR / "hamster_pose_table_idle.png"
# Long rest, then one short blink, then rest again. 4800+260+220+200+220+260+360+360+420 = 7100
BLINK = [0, 0, 1, 2, 1, 0, 0, 0, 0]
DURATIONS = [4800, 260, 220, 200, 220, 260, 360, 360, 420]


def lenses(base):
    rgb = base[:, :, :3].astype(int)
    alpha = base[:, :, 3] > 40
    dark = alpha & (rgb.max(2) < 80)
    found = []
    for x0, x1 in ((188, 262), (262, 348)):
        region = np.zeros(dark.shape, bool)
        region[128:188, x0:x1] = True
        mask = dark & region
        ys, xs = np.where(mask)
        if len(xs) < 30:
            continue
        found.append(mask)
    return found


def blink(frame, masks, amount):
    if amount <= 0:
        return frame
    out = frame.copy()
    lid = np.array([92, 48, 24], np.float32)
    for mask in masks:
        ys, xs = np.where(mask)
        y0, y1 = int(ys.min()), int(ys.max())
        height = max(1, y1 - y0)
        if amount == 1:
            top, bot = y0 + int(height * 0.42), y0 + int(height * 0.62)
        else:
            top, bot = y0 + int(height * 0.28), y0 + int(height * 0.78)
        rows = (np.arange(out.shape[0]) >= top) & (np.arange(out.shape[0]) < bot)
        band = mask.copy()
        band[~rows] = False
        src = out[band, :3].astype(np.float32)
        mixed = src * 0.45 + lid * 0.55
        out[band, :3] = np.clip(mixed, 0, 255).astype(np.uint8)
        # Keep a dark lens core so the sunglasses stay brown-black.
        core_rows = (np.arange(out.shape[0]) >= (top + bot) // 2 - 1) & (np.arange(out.shape[0]) <= (top + bot) // 2 + 1)
        core = mask.copy()
        core[~core_rows] = False
        out[core, :3] = (28, 16, 10)
    return out


def repair_floor_ear():
    path = CHAR / "hamster_pose_floor_breath.png"
    im = np.array(Image.open(path).convert("RGBA"))
    alpha = im[:, :, 3] > 40
    fill = np.array([232, 140, 42, 255], np.uint8)
    edge = np.array([48, 22, 12, 255], np.uint8)
    yy, xx = np.ogrid[: im.shape[0], : im.shape[1]]
    cx, cy, rx, ry = 196, 248, 32, 30
    norm = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    zone = np.zeros(alpha.shape, bool)
    zone[218:278, 160:232] = True
    add = zone & (norm <= 1) & ~alpha
    im[add] = fill
    im[zone & (norm <= 1) & (norm >= 0.78) & add] = edge
    Image.fromarray(im).save(path)
    return path


def main():
    base = np.array(Image.open(SRC).convert("RGBA"))
    masks = lenses(base)
    if len(masks) != 2:
        raise SystemExit(f"expected two lenses, found {len(masks)}")
    manifest_path = ROOT / "art" / "production-v2" / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ids = []
    for i, (eye, ms) in enumerate(zip(BLINK, DURATIONS), start=1):
        frame = blink(base.copy(), masks, eye)
        if eye == 0 and not np.array_equal(frame, base):
            raise SystemExit(f"open frame {i} changed the base pose")
        # Sunglasses stay dark: lens pixels must not become pale.
        if eye:
            rgb = frame[:, :, :3].astype(int)
            pale = masks[0] & (rgb.max(2) > 170)
            if pale.mean() > 0.25:
                raise SystemExit(f"frame {i} washed out the sunglasses")
        name = f"hamster_pose_idle_{i:02d}"
        path = CHAR / f"{name}.png"
        Image.fromarray(frame).save(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        manifest["assets"][name]["sha256"] = digest
        ids.append(name)
        print(name, "blink", eye, "ms", ms)
    ear = repair_floor_ear()
    manifest["assets"]["hamster_pose_floor_breath"]["sha256"] = hashlib.sha256(ear.read_bytes()).hexdigest()
    manifest["animations"]["seatedIdle"]["durationsMs"] = DURATIONS
    manifest["animations"]["seatedIdle"]["totalMs"] = sum(DURATIONS)
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    manifest_path.write_text(text, encoding="utf-8")
    js = ROOT / "art" / "production-v2" / "asset_manifest.js"
    js.write_text("window.BEANSTER_ASSETS=" + json.dumps(manifest, ensure_ascii=False) + ";", encoding="utf-8")
    print("total", sum(DURATIONS))


if __name__ == "__main__":
    main()
