"""Validate that the APK ships the exact UI source and runtime-only art assets."""
from pathlib import Path
import json
import zipfile
import sys

ROOT=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'Beanster-Sips-V19.5.7-unsigned.apk') as z:
    assert z.testzip() is None
    names=set(z.namelist())
    for name in ['app_v5.js','ui_upgrade.js','ui_upgrade.css','ocr_reader.js','motion.js','data_integrity.js','navigation.js','companion.js','local_vision.js','dashboard.js','recognition_flow.js','production_scene.js','scene_life.js','hamster_world.js','hamster_director.js','coffee_room.js','coffee_room.css','coffee_pages.js','seated_clips.js','seated_motion.js']:
        assert z.read('assets/'+name)==(ROOT/name).read_bytes(), name
    html=z.read('assets/index.html').decode('utf-8')
    assert html==(ROOT/'index_v5.html').read_text(encoding='utf-8')
    assert 'src="app_v5.js"' in html and 'src="ui_upgrade.js"' in html
    manifest=json.loads((ROOT/'art/upgrade-v1/manifest.json').read_text(encoding='utf-8'))
    for asset in manifest['assets']:
        assert 'assets/art/upgrade-v1/'+asset['png']['2x'] in names, asset['id']
        if 'animation' in asset:
            assert 'assets/art/upgrade-v1/'+asset['animation']['webp'] in names, asset['id']
            path=asset['animation']['webp']
            assert z.read('assets/art/upgrade-v1/'+path)==(ROOT/'art/upgrade-v1'/path).read_bytes(), asset['id']
        if asset['category']=='characters':
            assert asset['animation']['type']=='generated-character-frames', asset['id']
        if asset['category'] in ['characters','portraits']:
            for frame in asset['animation']['frames']:
                assert z.read('assets/art/upgrade-v1/'+frame)==(ROOT/'art/upgrade-v1'/frame).read_bytes()
    assert not any('source-atlases' in n or '/qa/' in n or '@3x' in n for n in names)
    for lib in ['libleptonica.so','libtesseract.so','libtesseract_jni.so']:
        assert 'lib/arm64-v8a/'+lib in names, lib
    assert 'assets/ocr/chi_sim.traineddata' in names
    for name in ['mobilenet_v1_224_quant.tflite','labels.txt']:
        assert z.read('assets/vision/'+name)==(ROOT/'vision'/name).read_bytes()
    assert b'Lorg/tensorflow/lite/Interpreter;' in z.read('classes2.dex')
    with zipfile.ZipFile(ROOT/'vendor/vision/tensorflow-lite-2.16.1.aar') as aar:
        assert z.read('lib/arm64-v8a/libtensorflowlite_jni.so')==aar.read('jni/arm64-v8a/libtensorflowlite_jni.so')
    for name in ['det.onnx','rec.onnx','keys.txt']:
        assert z.read('assets/ocr/paddle/'+name)==(ROOT/'ocr/paddle'/name).read_bytes()
    assert b'Lai/onnxruntime/OrtSession;' in z.read('classes2.dex')
    assert b'Lcom/beanster/bridge/PaddleReader;' in z.read('classes2.dex')
    with zipfile.ZipFile(ROOT/'vendor/ocr/onnxruntime-android-1.21.1.aar') as aar:
        for name in aar.namelist():
            if name.startswith('jni/arm64-v8a/') and name.endswith('.so'):
                assert z.read('lib/arm64-v8a/'+Path(name).name)==aar.read(name)
    for name in ['corner.png','corner-v191.png','hamster-seated-v192.png','drinks.png','table.png','shelf.png','seated-actions-user.png','seated-expressions-user.png']:
        assert z.read('assets/art/coffee-room/'+name)==(ROOT/'art/coffee-room'/name).read_bytes()
    assert 'src="coffee_room.js"' in html and 'href="coffee_room.css"' in html and 'src="production_scene.js"' in html and 'src="scene_life.js"' in html and 'src="hamster_world.js"' in html and 'src="hamster_director.js"' in html
    binary_manifest=z.read('AndroidManifest.xml')
    def has_text(blob, text):
        return text.encode('utf-8') in blob or text.encode('utf-16-le') in blob
    assert has_text(binary_manifest,'com.beanstersips.v11') and has_text(binary_manifest,'19.5.7')
    assert any(n.startswith('res/mipmap-anydpi-v26/ic_launcher') for n in names)
    arsc=z.getinfo('resources.arsc')
    assert arsc.compress_type==zipfile.ZIP_STORED, 'resources.arsc must be stored so the launcher can read the icon'
    data_off=arsc.header_offset+30+len(arsc.filename.encode('utf-8'))+len(arsc.extra)
    assert data_off%4==0, data_off
    prod=json.loads((ROOT/'art/production-v2/asset_manifest.json').read_text(encoding='utf-8'))
    assert 'assets/art/production-v2/asset_manifest.js' in names
    for id,asset in prod['assets'].items():
        assert 'assets/art/production-v2/'+asset['file'] in names, id
    assert not any('production-v2/source' in n or 'production-v2/qa' in n for n in names)
    assert z.read('classes2.dex')==(ROOT/'native-build/classes.dex').read_bytes()
    print(f'PASS: APK entrypoint, {len(manifest["assets"])} PNG assets, animation assets, native OCR and package identity.')
