from pathlib import Path
from urllib.parse import quote, urlparse, parse_qs
import base64, hashlib, subprocess, shutil


def roundtrip(raw: bytes, step: int):
    out=bytearray(); max_url=0; ack=0
    for i in range(0,len(raw),step):
        part=raw[i:i+step]
        b64=base64.b64encode(part).decode('ascii')
        url='sipsqueak://ocrchunk?data='+quote(b64,safe="~()*!.'-")
        max_url=max(max_url,len(url))
        parsed=parse_qs(urlparse(url).query,keep_blank_values=True)['data'][0]
        dec=base64.b64decode(parsed)
        out.extend(dec); ack += len(dec)
        assert ack == len(out)
    assert bytes(out)==raw
    return (len(raw)+step-1)//step,max_url

# Approximate a real V17.7 label grayscale payload.
w,h=648,837
raw=bytes((i*37+11)&255 for i in range(w*h))
for step in (3000,900):
    n,m=roundtrip(raw,step)
    print(f'TRANSPORT step={step} chunks={n} max_url={m} bytes={len(raw)} PASS')

root=Path(__file__).resolve().parents[1]
selftest=root/'ocr'/'selftest.png'
if selftest.exists() and shutil.which('tesseract'):
    p=subprocess.run(['tesseract',str(selftest),'stdout','-l','chi_sim','--psm','7'],capture_output=True,text=True,timeout=20)
    text=p.stdout.strip().replace(' ','')
    print('SELFTEST_OCR',repr(text))
    assert '拿铁' in text
    print('SELFTEST_OCR PASS')
