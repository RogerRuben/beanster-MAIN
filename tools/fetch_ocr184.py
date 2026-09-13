"""Download pinned-source OCR dependencies; never sends user images."""
from pathlib import Path
import requests, tarfile, io, hashlib, json, yaml
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'ocr/paddle';dest.mkdir(parents=True,exist_ok=True)
expected=json.loads((dest/"checksums.json").read_text()) if (dest/"checksums.json").exists() else {}
checks={}
def fetch(url,path):
    if not path.exists():
        r=requests.get(url,timeout=180);r.raise_for_status();path.write_bytes(r.content)
    return path.read_bytes()
for kind in ['det','rec']:
    name=f'PP-OCRv5_mobile_{kind}_onnx_infer.tar'
    data=fetch('https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/'+name,ROOT.parent/'.build-tools'/name)
    with tarfile.open(fileobj=io.BytesIO(data)) as t:
        for m in t.getmembers():
            if m.isfile() and Path(m.name).name in ['inference.onnx','inference.yml']:
                p=dest/(kind+Path(m.name).suffix);p.write_bytes(t.extractfile(m).read())
                checks[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
chars=yaml.safe_load((dest/'rec.yml').read_text(encoding='utf-8'))['PostProcess']['character_dict']
p=dest/'keys.txt';p.write_bytes(('\n'.join(chars)+'\n').encode('utf-8'));checks['ocr/paddle/keys.txt']=hashlib.sha256(p.read_bytes()).hexdigest()
vendor=ROOT/'vendor/ocr';vendor.mkdir(exist_ok=True)
p=vendor/'onnxruntime-android-1.21.1.aar'
fetch('https://repo.maven.apache.org/maven2/com/microsoft/onnxruntime/onnxruntime-android/1.21.1/'+p.name,p)
checks[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
fetch('https://repo.maven.apache.org/maven2/com/microsoft/onnxruntime/onnxruntime/1.21.1/onnxruntime-1.21.1.jar',ROOT.parent/'.build-tools/onnxruntime-1.21.1.jar')
fetch('https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/main/LICENSE',dest/'LICENSE-PaddleOCR')
fetch('https://raw.githubusercontent.com/microsoft/onnxruntime/v1.21.1/LICENSE',vendor/'LICENSE-ONNXRuntime')
for name,digest in expected.items():
    if checks.get(name)!=digest:raise ValueError('Dependency checksum changed: '+name)
(dest/'checksums.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
