from pathlib import Path
import importlib.util, struct, zipfile, subprocess, shutil, hashlib, argparse

OUT=Path(__file__).resolve().parent
APP_VERSION='19.5.4'
VERSION_CODE=58
EXPECTED_SIGNER='84d4a0dd47064b819444131bf344d2d5c8b6e791a22652de593ce474497a7018'
spec=importlib.util.spec_from_file_location('base_v5',OUT/'base_v5.py')
base=importlib.util.module_from_spec(spec); spec.loader.exec_module(base)

RES_STRING_POOL_TYPE=0x0001
RES_TABLE_TYPE=0x0002
RES_TABLE_PACKAGE_TYPE=0x0200
RES_TABLE_TYPE_TYPE=0x0201
RES_TABLE_TYPE_SPEC_TYPE=0x0202
UTF8_FLAG=0x100
TYPE_STRING=0x03
TYPE_REFERENCE=0x01
ICON_RES_ID=0x7f010000

def utf16_units(s): return len(s.encode('utf-16-le'))//2
def enc_len(n): return bytes([n]) if n<0x80 else bytes([0x80|(n>>8),n&0xff])
def string_pool(strings):
    offsets=[]; data=bytearray()
    for s in strings:
        offsets.append(len(data)); b=s.encode('utf-8'); data += enc_len(utf16_units(s))+enc_len(len(b))+b+b'\0'
    while len(data)%4:data.append(0)
    header_size=28; strings_start=header_size+4*len(offsets); size=strings_start+len(data)
    out=bytearray(struct.pack('<HHI',RES_STRING_POOL_TYPE,header_size,size)); out+=struct.pack('<IIIII',len(strings),0,UTF8_FLAG,strings_start,0)
    for o in offsets: out+=struct.pack('<I',o)
    out+=data; return bytes(out)

def build_resources_arsc():
    global_pool=string_pool(['res/drawable/icon.png']); type_pool=string_pool(['drawable']); key_pool=string_pool(['icon'])
    type_spec=struct.pack('<HHIBBHI',RES_TABLE_TYPE_SPEC_TYPE,16,20,1,0,0,1)+struct.pack('<I',0)
    config=struct.pack('<I',28)+b'\0'*24; header_size=48; entries_start=52
    entry=struct.pack('<HHI',8,0,0)+struct.pack('<HBBI',8,0,TYPE_STRING,0); type_size=entries_start+len(entry)
    type_chunk=bytearray(struct.pack('<HHI',RES_TABLE_TYPE_TYPE,header_size,type_size)); type_chunk+=struct.pack('<BBHII',1,0,0,1,entries_start); type_chunk+=config; type_chunk+=struct.pack('<I',0); type_chunk+=entry
    pkg_header_size=288; type_strings_off=pkg_header_size; key_strings_off=type_strings_off+len(type_pool); pkg_size=pkg_header_size+len(type_pool)+len(key_pool)+len(type_spec)+len(type_chunk)
    name='com.beanstersips.v11'.encode('utf-16-le'); name_field=(name+b'\0\0')[:256].ljust(256,b'\0')
    pkg=bytearray(struct.pack('<HHI',RES_TABLE_PACKAGE_TYPE,pkg_header_size,pkg_size)); pkg+=struct.pack('<I',0x7f)+name_field; pkg+=struct.pack('<IIIII',type_strings_off,1,key_strings_off,1,0)
    assert len(pkg)==pkg_header_size
    pkg+=type_pool+key_pool+type_spec+type_chunk
    table_size=12+len(global_pool)+len(pkg); return struct.pack('<HHII',RES_TABLE_TYPE,12,table_size,1)+global_pool+pkg

base.RID.update({'icon':0x01010002,'roundIcon':0x0101052c,'versionCode':0x0101021b,'versionName':0x0101021c,'extractNativeLibs':0x010104ea})
class V5Axml(base.Axml):
    def build_manifest(self):
        self.s('android'); self.s(base.ANDROID_URI)
        for x in ['manifest','uses-sdk','uses-permission','application','activity','intent-filter','action','category']: self.s(x)
        self.s('package'); self.s('com.beanstersips.v11'); self.s('鼠鼠今天喝了啥'); self.s(APP_VERSION); self.s('com.sipsqueak.v7.MainActivity')
        for perm in ['android.permission.INTERNET','android.permission.VIBRATE','android.permission.POST_NOTIFICATIONS']: self.s(perm)
        self.s('android.intent.action.MAIN'); self.s('android.intent.category.LAUNCHER')
        for n in base.RID: self.attr_name(n)
        body=[self.ns(True)]
        body.append(self.start('manifest',[(base.NO_INDEX,self.s('package'),self.s('com.beanstersips.v11'),base.TYPE_STRING,self.s('com.beanstersips.v11')),self.attr('versionCode',VERSION_CODE,'int'),self.attr('versionName',APP_VERSION)]))
        body.append(self.start('uses-sdk',[self.attr('minSdkVersion',29,'int'),self.attr('targetSdkVersion',29,'int')])); body.append(self.end('uses-sdk'))
        for perm in ['android.permission.INTERNET','android.permission.VIBRATE','android.permission.POST_NOTIFICATIONS']:
            body.append(self.start('uses-permission',[self.attr('name',perm)])); body.append(self.end('uses-permission'))
        icon_attr=(self.s(base.ANDROID_URI),self.attr_name('icon'),base.NO_INDEX,TYPE_REFERENCE,ICON_RES_ID)
        round_attr=(self.s(base.ANDROID_URI),self.attr_name('roundIcon'),base.NO_INDEX,TYPE_REFERENCE,ICON_RES_ID)
        body.append(self.start('application',[self.attr('label','鼠鼠今天喝了啥'),self.attr('extractNativeLibs',True,'bool'),icon_attr,round_attr]))
        body.append(self.start('activity',[self.attr('name','com.sipsqueak.v7.MainActivity'),self.attr('exported',True,'bool'),icon_attr,round_attr]))
        body.append(self.start('intent-filter'))
        body.append(self.start('action',[self.attr('name','android.intent.action.MAIN')])); body.append(self.end('action'))
        body.append(self.start('category',[self.attr('name','android.intent.category.LAUNCHER')])); body.append(self.end('category'))
        body.append(self.end('intent-filter')); body.append(self.end('activity')); body.append(self.end('application')); body.append(self.end('manifest')); body.append(self.ns(False))
        sp=self.string_pool(); rm=self.resource_map(); content=sp+rm+b''.join(body); return struct.pack('<HHI',base.RES_XML_TYPE,8,8+len(content))+content

def ensure_key(path=None):
    ks=Path(path) if path else OUT/'beanster-v11.keystore'
    if not ks.exists():
        raise FileNotFoundError('Original Beanster signing keystore is required; refusing to create a replacement key.')
    cert=subprocess.run(['keytool','-exportcert','-keystore',str(ks),'-storepass','beanster-v11',
                         '-alias','sipsqueak'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
    if hashlib.sha256(cert).hexdigest()!=EXPECTED_SIGNER:
        raise ValueError('Signing certificate does not match the verified V17.1 certificate; refusing to sign.')
    return ks

def store_aligned(zf, name, data, align=4):
    # resources.arsc must be stored and 4-byte aligned or Android ignores the resource table and shows the default icon.
    data=bytes(data)
    info=zipfile.ZipInfo(filename=name, date_time=(2026,1,1,0,0,0))
    info.compress_type=zipfile.ZIP_STORED
    info.file_size=len(data)
    info.CRC=zipfile.crc32(data)&0xffffffff
    offset=zf.fp.tell()
    pad=(align-((offset+30+len(name.encode('utf-8')))%align))%align
    info.extra=b'\x00'*pad
    zf.writestr(info, data)

def find_exe(root, name):
    root=Path(root)
    if not root.exists(): return None
    for p in root.rglob(name):
        if p.is_file(): return p
    return None

def build_launcher_bitmaps(res):
    from PIL import Image
    # The supplied launcher tile. Scale it as-is; do not redraw or recolor it.
    src=Image.open(OUT/'launcher_icon.png').convert('RGBA')
    brown=src.getpixel((src.width//2, int(src.height*0.12)))[:3]
    legacy={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
    foreground={'mdpi':108,'hdpi':162,'xhdpi':216,'xxhdpi':324,'xxxhdpi':432}
    for density,size in legacy.items():
        folder=res/f'mipmap-{density}'
        folder.mkdir(parents=True,exist_ok=True)
        icon=src.resize((size,size),Image.Resampling.LANCZOS)
        icon.save(folder/'ic_launcher.png')
        icon.save(folder/'ic_launcher_round.png')
    for density,size in foreground.items():
        folder=res/f'mipmap-{density}'
        folder.mkdir(parents=True,exist_ok=True)
        src.resize((size,size),Image.Resampling.LANCZOS).save(folder/'ic_launcher_foreground.png')
    (res/'values').mkdir(parents=True,exist_ok=True)
    (res/'values'/'colors.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">#{brown[0]:02X}{brown[1]:02X}{brown[2]:02X}</color>\n'
        '</resources>\n',encoding='utf-8')
    xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    anydpi=res/'mipmap-anydpi-v26'
    anydpi.mkdir(parents=True,exist_ok=True)
    (anydpi/'ic_launcher.xml').write_text(xml,encoding='utf-8')
    (anydpi/'ic_launcher_round.xml').write_text(xml,encoding='utf-8')

def link_android_resources():
    import os
    sdk=Path(os.environ.get('BEANSTER_SDK', OUT.parent/'.build-tools'/'android-sdk'))
    aapt2=find_exe(sdk,'aapt2.exe')
    jar=find_exe(sdk,'android.jar')
    if not aapt2 or not jar:
        raise FileNotFoundError('aapt2 and android.jar are required to compile the launcher mipmaps. Set BEANSTER_SDK.')
    res=OUT/'android'/'res'
    build_launcher_bitmaps(res)
    manifest_src=OUT/'android'/'AndroidManifest.xml'
    manifest_src.parent.mkdir(parents=True,exist_ok=True)
    manifest_src.write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.beanstersips.v11"
    android:versionCode="{VERSION_CODE}"
    android:versionName="{APP_VERSION}">
    <uses-sdk android:minSdkVersion="29" android:targetSdkVersion="29"/>
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <application android:label="鼠鼠今天喝了啥" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:extractNativeLibs="true">
        <activity android:name="com.sipsqueak.v7.MainActivity" android:exported="true" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
''',encoding='utf-8')
    compiled=OUT/'android'/'compiled.zip'
    linked=OUT/'android'/'linked.apk'
    if compiled.exists(): compiled.unlink()
    if linked.exists(): linked.unlink()
    subprocess.run([str(aapt2),'compile','--dir',str(res),'-o',str(compiled)],check=True)
    subprocess.run([str(aapt2),'link','-o',str(linked),'-I',str(jar),'--manifest',str(manifest_src),
                    '--min-sdk-version','29','--target-sdk-version','29','--auto-add-overlay',str(compiled)],check=True)
    with zipfile.ZipFile(linked) as z:
        files={n:z.read(n) for n in z.namelist() if n.startswith('res/') and not n.endswith('/')}
        return z.read('AndroidManifest.xml'), z.read('resources.arsc'), files

def main():
    parser=argparse.ArgumentParser(description='Build Beanster Sips with the current UI and local art assets.')
    parser.add_argument('--unsigned',action='store_true',help='Build an unsigned validation artifact; cannot install over the existing app.')
    parser.add_argument('--keystore',help='Path to the ORIGINAL Beanster signing keystore.')
    parser.add_argument('--apksig',help='Official Google apksig JAR, for Android v1/v2/v3 signing.')
    parser.add_argument('--java',default='java',help='Java 17+ executable with source launcher support.')
    args=parser.parse_args()
    ks=None if args.unsigned else Path(args.keystore) if args.apksig and args.keystore else ensure_key(args.keystore)
    import json
    for name,digest in {**json.loads((OUT/'vision/checksums.json').read_text()),**json.loads((OUT/'ocr/paddle/checksums.json').read_text())}.items():
        if hashlib.sha256((OUT/name).read_bytes()).hexdigest()!=digest:raise ValueError('Unexpected vision dependency: '+name)
    html=(OUT/'index_v5.html').read_text(encoding='utf-8')
    for script in ['app_v5.js','ui_upgrade.js','production_scene.js','art/production-v2/asset_manifest.js']:
        if f'src="{script}"' not in html: raise ValueError(f'Entrypoint must reference current {script}')
    dex=base.make_dex(); manifest,arsc,res_files=link_android_resources()
    from tools.build_native_reader import build as build_reader
    reader_dex=build_reader()
    (OUT/'AndroidManifest.xml').write_bytes(manifest); (OUT/'classes.dex').write_bytes(dex); (OUT/'resources.arsc').write_bytes(arsc); (OUT/'index_packed.html').write_text(html,encoding='utf-8')
    aar=OUT/'tesseract-android-5.5.0.aar'
    expected='5928f0f271057dc303fce71f013900031635a3f7739782ce4df76726bfd032d4'
    if not aar.exists(): raise FileNotFoundError('tesseract-android-5.5.0.aar is required')
    if hashlib.sha256(aar.read_bytes()).hexdigest()!=expected: raise ValueError('Unexpected Tesseract Android AAR hash')
    unsigned=OUT/f'Beanster-Sips-V{APP_VERSION}-unsigned.apk'
    with zipfile.ZipFile(unsigned,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        z.writestr('AndroidManifest.xml',manifest); z.writestr('classes.dex',dex); store_aligned(z,'resources.arsc',arsc)
        for name,data in sorted(res_files.items()): z.writestr(name,data)
        z.write(reader_dex,'classes2.dex')
        z.write(OUT/'icon.png','assets/icon.png',compress_type=zipfile.ZIP_STORED)
        for mascot in sorted((OUT/'mascots').glob('*.png')):
            z.write(mascot,'assets/mascots/'+mascot.name,compress_type=zipfile.ZIP_STORED)
        for name in ['app_v5.js','ui_upgrade.js','ui_upgrade.css','ocr_reader.js','motion.js','data_integrity.js','navigation.js','companion.js','local_vision.js','dashboard.js','recognition_flow.js','production_scene.js','scene_life.js','hamster_world.js','coffee_room.js','coffee_room.css','coffee_pages.js','seated_clips.js','seated_motion.js']:
            z.write(OUT/name,'assets/'+name)
        for asset in sorted((OUT/'art/coffee-room').glob('*.png')):
            z.write(asset,'assets/art/coffee-room/'+asset.name,compress_type=zipfile.ZIP_STORED)
        prod=OUT/'art'/'production-v2'
        z.write(prod/'asset_manifest.js','assets/art/production-v2/asset_manifest.js')
        for group in ['characters','cups','effects','scene','storage','ui']:
            for asset in sorted((prod/group).glob('*.png')):
                z.write(asset,'assets/art/production-v2/'+group+'/'+asset.name,compress_type=zipfile.ZIP_STORED)
        art_root=OUT/'art'/'upgrade-v1'
        # Runtime formats only. Do not ship source atlases, QA previews or GIF duplicates.
        art_files=sorted((art_root/'png').rglob('*@2x.png'))+sorted((art_root/'webp').glob('*.webp'))
        art_files+=[art_root/'manifest.js']
        art_files+=sorted((art_root/'frames').glob('character_*/*.png'))+sorted((art_root/'frames').glob('portrait_*/*.png'))
        if not art_files: raise FileNotFoundError('Upgrade art assets are missing')
        for asset in art_files:
            z.write(asset,'assets/art/upgrade-v1/'+asset.relative_to(art_root).as_posix(),compress_type=zipfile.ZIP_STORED)
        # Chinese OCR data is bundled locally and copied to app-private storage on first recognition.
        ocr=OUT/'ocr'/'chi_sim.traineddata'
        if not ocr.exists(): raise FileNotFoundError('ocr/chi_sim.traineddata is required')
        z.write(ocr,'assets/ocr/chi_sim.traineddata',compress_type=zipfile.ZIP_STORED)
        selftest=OUT/'ocr'/'selftest.png'
        if not selftest.exists(): raise FileNotFoundError('ocr/selftest.png is required')
        z.write(selftest,'assets/ocr/selftest.png',compress_type=zipfile.ZIP_STORED)
        # Native runtime comes directly from the verified official Tesseract Android AAR.
        with zipfile.ZipFile(aar,'r') as az:
            for n in az.namelist():
                if n.startswith('jni/arm64-v8a/') and n.endswith('.so'):
                    z.writestr('lib/arm64-v8a/'+Path(n).name,az.read(n),compress_type=zipfile.ZIP_DEFLATED)
        for asset in (OUT/'vision').iterdir():
            if asset.is_file():z.write(asset,'assets/vision/'+asset.name)
        for aar in list((OUT/'vendor/vision').glob('*.aar'))+list((OUT/'vendor/ocr').glob('*.aar')):
            with zipfile.ZipFile(aar) as az:
                for name in az.namelist():
                    if name.startswith('jni/arm64-v8a/') and name.endswith('.so'):
                        z.writestr('lib/arm64-v8a/'+Path(name).name,az.read(name))
        for asset in (OUT/'ocr/paddle').iterdir():
            if asset.is_file():z.write(asset,'assets/ocr/paddle/'+asset.name)
        z.writestr('assets/index.html',html.encode('utf-8'))
    final=unsigned
    if not args.unsigned:
        final=OUT/f'Beanster-Sips-V{APP_VERSION}.apk'
        if args.apksig:
            subprocess.run([args.java,'--class-path',str(Path(args.apksig).resolve()),
                            str(OUT/'tools'/'SignBeanster.java'),str(ks),str(unsigned),str(final)],check=True)
        else:
            shutil.copy2(unsigned,final)
            subprocess.run(['jarsigner','-keystore',str(ks),'-storepass','beanster-v11','-keypass','beanster-v11','-sigalg','SHA256withRSA','-digestalg','SHA-256',str(final),'sipsqueak'],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            subprocess.run(['jarsigner','-verify',str(final)],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    print('manifest',len(manifest),'dex',len(dex),'arsc',len(arsc),'apk',final.stat().st_size)
    print('sha256',hashlib.sha256(final.read_bytes()).hexdigest()); print(final)
if __name__=='__main__': main()
