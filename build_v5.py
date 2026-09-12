from pathlib import Path
import importlib.util, struct, zipfile, subprocess, shutil, hashlib

OUT=Path(__file__).resolve().parent
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

base.RID.update({'icon':0x01010002,'versionCode':0x0101021b,'versionName':0x0101021c})
class V5Axml(base.Axml):
    def build_manifest(self):
        self.s('android'); self.s(base.ANDROID_URI)
        for x in ['manifest','uses-sdk','uses-permission','application','activity','intent-filter','action','category']: self.s(x)
        self.s('package'); self.s('com.beanstersips.v11'); self.s('鼠鼠今天喝了啥'); self.s('17.1'); self.s('com.sipsqueak.v7.MainActivity')
        for perm in ['android.permission.INTERNET','android.permission.VIBRATE','android.permission.POST_NOTIFICATIONS']: self.s(perm)
        self.s('android.intent.action.MAIN'); self.s('android.intent.category.LAUNCHER')
        for n in base.RID: self.attr_name(n)
        body=[self.ns(True)]
        body.append(self.start('manifest',[(base.NO_INDEX,self.s('package'),self.s('com.beanstersips.v11'),base.TYPE_STRING,self.s('com.beanstersips.v11')),self.attr('versionCode',34,'int'),self.attr('versionName','17.1')]))
        body.append(self.start('uses-sdk',[self.attr('minSdkVersion',29,'int'),self.attr('targetSdkVersion',29,'int')])); body.append(self.end('uses-sdk'))
        for perm in ['android.permission.INTERNET','android.permission.VIBRATE','android.permission.POST_NOTIFICATIONS']:
            body.append(self.start('uses-permission',[self.attr('name',perm)])); body.append(self.end('uses-permission'))
        icon_attr=(self.s(base.ANDROID_URI),self.attr_name('icon'),base.NO_INDEX,TYPE_REFERENCE,ICON_RES_ID)
        body.append(self.start('application',[self.attr('label','鼠鼠今天喝了啥'),icon_attr]))
        body.append(self.start('activity',[self.attr('name','com.sipsqueak.v7.MainActivity'),self.attr('exported',True,'bool')]))
        body.append(self.start('intent-filter'))
        body.append(self.start('action',[self.attr('name','android.intent.action.MAIN')])); body.append(self.end('action'))
        body.append(self.start('category',[self.attr('name','android.intent.category.LAUNCHER')])); body.append(self.end('category'))
        body.append(self.end('intent-filter')); body.append(self.end('activity')); body.append(self.end('application')); body.append(self.end('manifest')); body.append(self.ns(False))
        sp=self.string_pool(); rm=self.resource_map(); content=sp+rm+b''.join(body); return struct.pack('<HHI',base.RES_XML_TYPE,8,8+len(content))+content

def ensure_key():
    ks=OUT/'beanster-v11.keystore'
    if not ks.exists():
        raise FileNotFoundError('Original Beanster signing keystore is required; refusing to create a replacement key.')
    return ks

def main():
    js=(OUT/'app_v5.js').read_text(encoding='utf-8'); html=(OUT/'index_v5.html').read_text(encoding='utf-8')
    # Ensure the packaged HTML contains the latest patched script, not stale V4 code.
    start=html.find('<script>'); end=html.rfind('</script>')
    if start>=0 and end>start:
        html=html[:start+8]+'\n'+js+'\n'+html[end:]
    manifest=V5Axml().build_manifest(); dex=base.make_dex(); arsc=build_resources_arsc()
    (OUT/'AndroidManifest.xml').write_bytes(manifest); (OUT/'classes.dex').write_bytes(dex); (OUT/'resources.arsc').write_bytes(arsc); (OUT/'index_packed.html').write_text(html,encoding='utf-8')
    unsigned=OUT/'Beanster-Sips-V17.1-unsigned.apk'
    with zipfile.ZipFile(unsigned,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        z.writestr('AndroidManifest.xml',manifest); z.writestr('classes.dex',dex); z.writestr('resources.arsc',arsc)
        z.write(OUT/'icon.png','res/drawable/icon.png',compress_type=zipfile.ZIP_STORED); z.write(OUT/'icon.png','assets/icon.png',compress_type=zipfile.ZIP_STORED)
        for mascot in sorted((OUT/'mascots').glob('*.png')):
            z.write(mascot,'assets/mascots/'+mascot.name,compress_type=zipfile.ZIP_STORED)
        # V16 keeps the main Chinese reading data inside the APK in uncompressed form for faster startup.
        for name in ('chi_sim.traineddata','chi_sim.traineddata.gz','eng.traineddata.gz','tesseract.min.js','worker.min.js'):
            ocr=OUT/'ocr'/name
            if ocr.exists(): z.write(ocr,'assets/ocr/'+name,compress_type=zipfile.ZIP_STORED)
        z.writestr('assets/index.html',html.encode('utf-8'))
    final=OUT/'Beanster-Sips-V17.1.apk'; shutil.copy2(unsigned,final); ks=ensure_key()
    subprocess.run(['jarsigner','-keystore',str(ks),'-storepass','beanster-v11','-keypass','beanster-v11','-sigalg','SHA256withRSA','-digestalg','SHA-256',str(final),'sipsqueak'],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    print('manifest',len(manifest),'dex',len(dex),'arsc',len(arsc),'apk',final.stat().st_size)
    print('sha256',hashlib.sha256(final.read_bytes()).hexdigest()); print(final)
if __name__=='__main__': main()
