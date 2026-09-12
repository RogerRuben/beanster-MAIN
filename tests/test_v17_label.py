from pathlib import Path
import argparse, re, subprocess
p=argparse.ArgumentParser()
p.add_argument('image', type=Path)
p.add_argument('--must', nargs='+', default=['瑰夏','拿铁'])
a=p.parse_args()
texts=[]
for psm in (6,11):
    r=subprocess.run(['tesseract',str(a.image),'stdout','-l','chi_sim','--psm',str(psm)],capture_output=True,text=True,timeout=30)
    texts.append(r.stdout.strip())
text='\n'.join(texts)
for x in a.must:
    if x not in text: raise SystemExit(f'FAIL: missing {x!r}')
print('PASS')
