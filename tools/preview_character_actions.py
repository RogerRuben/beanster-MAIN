"""Build a reviewer contact sheet and looping preview from exported poses."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]/'art'/'upgrade-v1'
assets=[a for a in json.loads((root/'manifest.json').read_text(encoding='utf-8'))['assets'] if a['category']=='characters']
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
sheet=Image.new('RGB',(1152,10*208),'#f6eadb')
draw=ImageDraw.Draw(sheet)
for row,asset in enumerate(assets):
    draw.text((12,row*208+4),asset['label'],font=font,fill='#583521')
    for col,path in enumerate(asset['animation']['frames']):
        frame=Image.open(root/path).resize((176,176))
        sheet.paste(frame,(col*192+8,row*208+28),frame)
sheet.save(root/'character-actions-contact.jpg',quality=94)
preview=[]
for step in range(6):
    canvas=Image.new('RGB',(960,444),'#f6eadb')
    d=ImageDraw.Draw(canvas)
    for i,asset in enumerate(assets):
        paths=asset['animation']['frames']
        frame=Image.open(root/paths[min(step,len(paths)-1)]).resize((176,176))
        x,y=i%5*192,i//5*222
        canvas.paste(frame,(x+8,y+12),frame)
        d.text((x+12,y+192),asset['label'],font=font,fill='#583521')
    preview.append(canvas)
preview[0].save(root/'character-actions-preview.gif',save_all=True,append_images=preview[1:],duration=[360,240,240,240,240,360],loop=0)
print('Saved character animation QA previews')
