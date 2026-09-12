from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]/'qa'/'v18'
canvas=Image.new('RGB',(1680,978),'#eae1d5')
draw=ImageDraw.Draw(canvas)
title=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc',30)
label=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
draw.text((30,18),'Beanster Sips · V18.0',font=title,fill='#603c28')
draw.text((30,61),'升级界面预览 · 以下为测试数据',font=label,fill='#a38165')
for i,(name,caption) in enumerate([('home.png','01  今日'),('record.png','02  记录一杯'),('monthly.png','03  月报'),('calendar-detail.png','04  日历详情')]):
    x=24+i*414
    draw.text((x+3,103),caption,font=label,fill='#70482f')
    canvas.paste(Image.open(ROOT/name).convert('RGB'),(x,134))
canvas.save(ROOT/'upgrade-overview.png')
print(ROOT/'upgrade-overview.png')
