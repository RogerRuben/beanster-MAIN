"""Build a portable resource ZIP and a four-expression animation preview."""
from pathlib import Path
import json
import zipfile
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / 'art' / 'upgrade-v1'
OUTPUT = PROJECT.parent / 'output'


def main():
    manifest = json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
    portraits = [a for a in manifest['assets'] if a['category']=='portraits']
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 20)
    small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 12)
    frames = []
    for t in range(0,2400,100):
        canvas=Image.new('RGB',(880,264),'#f4ecdf')
        draw=ImageDraw.Draw(canvas)
        for col, asset in enumerate(portraits):
            x=col*220
            dark=col%2==1
            draw.rounded_rectangle((x+5,5,x+215,259),radius=18,fill='#302929' if dark else '#fffaf2')
            anim=asset['animation']
            elapsed=t % sum(anim['durationsMs'])
            index=0
            while elapsed >= anim['durationsMs'][index]:
                elapsed-=anim['durationsMs'][index]
                index+=1
            frame=Image.open(ROOT/anim['frames'][index]).convert('RGBA').resize((192,192),Image.Resampling.LANCZOS)
            canvas.paste(frame,(x+14,10),frame)
            draw.text((x+88,207),asset['label'],font=font,fill='#f9eddb' if dark else '#593522')
            draw.text((x+47,237),'Beanster Sips / 6 frames',font=small,fill='#a68770')
        frames.append(canvas)
    frames[0].save(ROOT/'expression-preview.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=False)
    OUTPUT.mkdir(exist_ok=True)
    bundle=OUTPUT/'Beanster-Sips-Art-Upgrade-v1.zip'
    with zipfile.ZipFile(bundle,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for file in sorted(ROOT.rglob('*')):
            if file.is_file():
                z.write(file,'Beanster-Sips-Art-Upgrade-v1/'+file.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(bundle) as z:
        assert z.testzip() is None
        print(f'ZIP verified: {len(z.infolist())} files, {bundle.stat().st_size:,} bytes')
    print(bundle)


if __name__=='__main__':
    main()
