from pathlib import Path
import re, subprocess, sys

def normalize(s: str) -> str:
    s = s.replace('拿跌','拿铁').replace('拿佚','拿铁').replace('拿迭','拿铁')
    s = re.sub(r'[（(]?\s*[人]?\s*杯(?:[）)]|$)?\s*$', '', s)
    s = re.sub(r'[（(]\s*$', '', s)
    return s.strip()

def pick_product(text: str) -> str:
    best = ('', -999)
    for line in [x.strip() for x in text.splitlines() if x.strip()]:
        clean=normalize(line)
        score=0
        if re.search(r'拿铁|美式|摩卡|卡布|澳白|dirty|espresso|latte|americano|冷萃|手冲|生椰',clean,re.I): score += 19
        if re.search(r'咖啡|瑰夏|丝绒|厚乳',clean,re.I): score += 5
        if re.search(r'咖啡豆|配件|吸管|糖度|浓度|不额外加糖',clean,re.I): score -= 18
        if score > best[1]: best=(clean,score)
    return best[0]

root=Path(__file__).resolve().parents[1]
img=Path('/mnt/data/v17_label_crop_user.png')
if not img.exists():
    print('SKIP: acceptance image unavailable')
    raise SystemExit(0)
cmd=['tesseract',str(img),'stdout','-l','chi_sim+eng','--psm','6']
p=subprocess.run(cmd,capture_output=True,text=True,timeout=15)
text=p.stdout.strip()
product=pick_product(text)
print('TEXT:\n'+text)
print('PRODUCT:',product)
if '瑰夏' not in product or '拿铁' not in product:
    raise SystemExit('FAIL: expected 瑰夏拿铁 product line')
print('PASS')
