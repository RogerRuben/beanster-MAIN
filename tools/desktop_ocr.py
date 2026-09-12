"""Diagnostic only: desktop Tesseract. APK runtime remains Android native Tesseract."""
from pathlib import Path
import sys,json,time
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'.build-tools/tesserocr-runtime'))
import tesserocr
from PIL import Image
def main():
    image=Image.open(sys.argv[1])
    started=time.perf_counter()
    with tesserocr.PyTessBaseAPI(path=str(Path(__file__).resolve().parents[1]/'ocr'),lang='chi_sim',psm=int(sys.argv[2])) as api:
        api.SetImage(image);text=api.GetUTF8Text()
    print(json.dumps(dict(text=text,elapsedMs=round((time.perf_counter()-started)*1000),engine=tesserocr.tesseract_version().splitlines()[0]),ensure_ascii=True))
if __name__=='__main__':main()
