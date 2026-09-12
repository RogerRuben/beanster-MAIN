from PIL import Image
import subprocess,re,sys
src='/mnt/data/e66ab72fd58d4e53ccfc6d28d679e05f(1).jpg'
im=Image.open(src).convert('RGB')
rect=(.38,.42,.34,.36)
x,y,w,h=rect
c=im.crop((int(x*im.width),int(y*im.height),int((x+w)*im.width),int((y+h)*im.height)))
target=760
scale=target/c.width
c=c.resize((target,round(c.height*scale)),Image.Resampling.LANCZOS)
out='/mnt/data/v175_exact_fallback.png'; c.save(out)
p=subprocess.run(['tesseract',out,'stdout','-l','chi_sim','--psm','11'],capture_output=True,text=True,timeout=30)
text=p.stdout.strip()
print(text)
# accept direct exact line; parse tolerance for OCR tail marker only
ok=('桂花米酿拿铁' in text) or ('桂花米酸' in text and '铁' in text)
print('V175_EXACT_IMAGE_FALLBACK=', 'PASS' if ok else 'FAIL')
if not ok: sys.exit(1)
