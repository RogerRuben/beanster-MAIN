import os, struct, hashlib, zlib, zipfile, textwrap, json, html
from dataclasses import dataclass
from pathlib import Path

OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

# --------------------- helpers ---------------------
def align(n, a=4): return (n + a - 1) & ~(a - 1)
def uleb(n):
    out=bytearray()
    while True:
        b=n & 0x7f; n >>= 7
        if n: out.append(b|0x80)
        else: out.append(b); return bytes(out)

def utf16_units(s): return len(s.encode('utf-16-le'))//2

def mutf8_data(s):
    # Our strings contain no U+0000 / unpaired surrogate; standard UTF-8 is valid MUTF-8 here.
    return uleb(utf16_units(s)) + s.encode('utf-8') + b'\x00'

# --------------------- binary Android XML ---------------------
RES_XML_TYPE=0x0003; RES_STRING_POOL_TYPE=0x0001; RES_XML_RESOURCE_MAP_TYPE=0x0180
RES_XML_START_NAMESPACE_TYPE=0x0100; RES_XML_END_NAMESPACE_TYPE=0x0101
RES_XML_START_ELEMENT_TYPE=0x0102; RES_XML_END_ELEMENT_TYPE=0x0103
TYPE_STRING=0x03; TYPE_INT_DEC=0x10; TYPE_INT_BOOLEAN=0x12
NO_INDEX=0xffffffff
ANDROID_URI='http://schemas.android.com/apk/res/android'

# Framework attribute IDs used below.
RID={
    'label':0x01010001,
    'name':0x01010003,
    'exported':0x01010010,
    'minSdkVersion':0x0101020c,
    'targetSdkVersion':0x01010270,
}

class Axml:
    def __init__(self):
        self.strings=[]; self.sidx={}; self.rmap={}
    def s(self, x):
        if x not in self.sidx:
            self.sidx[x]=len(self.strings); self.strings.append(x)
        return self.sidx[x]
    def attr_name(self, name):
        i=self.s(name); self.rmap[i]=RID[name]; return i
    def string_pool(self):
        offsets=[]; data=bytearray()
        for s in self.strings:
            offsets.append(len(data)); b=s.encode('utf-8')
            u16=utf16_units(s); u8=len(b)
            def enc_len(n):
                return bytes([n]) if n<0x80 else bytes([0x80|(n>>8), n&0xff])
            data += enc_len(u16)+enc_len(u8)+b+b'\x00'
        while len(data)%4: data.append(0)
        hdrsize=28; strings_start=hdrsize+4*len(offsets); size=strings_start+len(data)
        out=bytearray(struct.pack('<HHI',RES_STRING_POOL_TYPE,hdrsize,size))
        out += struct.pack('<IIIII',len(offsets),0,0x100,strings_start,0)
        for o in offsets: out += struct.pack('<I',o)
        out += data
        return bytes(out)
    def resource_map(self):
        if not self.rmap: return b''
        n=max(self.rmap)+1; arr=[0]*n
        for i,v in self.rmap.items(): arr[i]=v
        size=8+4*n
        return struct.pack('<HHI',RES_XML_RESOURCE_MAP_TYPE,8,size)+b''.join(struct.pack('<I',x) for x in arr)
    def node_header(self, typ, size, line=1):
        return struct.pack('<HHIII',typ,16,size,line,NO_INDEX)
    def ns(self, start=True):
        typ=RES_XML_START_NAMESPACE_TYPE if start else RES_XML_END_NAMESPACE_TYPE
        return self.node_header(typ,24)+struct.pack('<II',self.s('android'),self.s(ANDROID_URI))
    def attr(self, name, value, kind='string', android=True):
        ns=self.s(ANDROID_URI) if android else NO_INDEX
        ni=self.attr_name(name) if android else self.s(name)
        if kind=='string':
            vi=self.s(value); raw=vi; dtype=TYPE_STRING; data=vi
        elif kind=='int':
            raw=NO_INDEX; dtype=TYPE_INT_DEC; data=int(value)&0xffffffff
        elif kind=='bool':
            raw=NO_INDEX; dtype=TYPE_INT_BOOLEAN; data=0xffffffff if value else 0
        else: raise ValueError(kind)
        return (ns,ni,raw,dtype,data)
    def start(self,name,attrs=()):
        attrs=list(attrs); size=36+20*len(attrs)
        out=bytearray(self.node_header(RES_XML_START_ELEMENT_TYPE,size))
        out += struct.pack('<IIHHHHHH',NO_INDEX,self.s(name),20,20,len(attrs),0,0,0)
        for ns,ni,raw,dtype,data in attrs:
            out += struct.pack('<IIIHBBI',ns,ni,raw,8,0,dtype,data)
        return bytes(out)
    def end(self,name):
        return self.node_header(RES_XML_END_ELEMENT_TYPE,24)+struct.pack('<II',NO_INDEX,self.s(name))
    def build_manifest(self):
        # Pre-intern every string/resource name before emitting the string pool.
        self.s('android'); self.s(ANDROID_URI)
        for x in ['manifest','uses-sdk','uses-permission','application','activity','intent-filter','action','category']:
            self.s(x)
        self.s('package'); self.s('com.coffeelog.v3'); self.s('咖啡记')
        self.s('com.coffeelog.v3.MainActivity')
        self.s('android.permission.VIBRATE')
        self.s('android.intent.action.MAIN'); self.s('android.intent.category.LAUNCHER')
        for n in RID: self.attr_name(n)

        body=[]
        body.append(self.ns(True))
        body.append(self.start('manifest',[(NO_INDEX,self.s('package'),self.s('com.coffeelog.v3'),TYPE_STRING,self.s('com.coffeelog.v3'))]))
        body.append(self.start('uses-sdk',[self.attr('minSdkVersion',23,'int'),self.attr('targetSdkVersion',25,'int')]))
        body.append(self.end('uses-sdk'))
        body.append(self.start('uses-permission',[self.attr('name','android.permission.VIBRATE')]))
        body.append(self.end('uses-permission'))
        body.append(self.start('uses-permission',[self.attr('name','android.permission.POST_NOTIFICATIONS')]))
        body.append(self.end('uses-permission'))
        body.append(self.start('application',[self.attr('label','咖啡记')]))
        body.append(self.start('activity',[self.attr('name','com.coffeelog.v3.MainActivity'),self.attr('exported',True,'bool')]))
        body.append(self.start('intent-filter'))
        body.append(self.start('action',[self.attr('name','android.intent.action.MAIN')]))
        body.append(self.end('action'))
        body.append(self.start('category',[self.attr('name','android.intent.category.LAUNCHER')]))
        body.append(self.end('category'))
        body.append(self.end('intent-filter'))
        body.append(self.end('activity'))
        body.append(self.end('application'))
        body.append(self.end('manifest'))
        body.append(self.ns(False))

        sp=self.string_pool(); rm=self.resource_map(); content=sp+rm+b''.join(body)
        return struct.pack('<HHI',RES_XML_TYPE,8,8+len(content))+content

# --------------------- DEX builder ---------------------
ACC_PUBLIC=0x1; ACC_PRIVATE=0x2; ACC_PROTECTED=0x4; ACC_STATIC=0x8; ACC_FINAL=0x10
ACC_SUPER=0x20; ACC_NATIVE=0x100; ACC_CONSTRUCTOR=0x10000

@dataclass(frozen=True)
class Proto:
    ret:str; params:tuple
@dataclass(frozen=True)
class FieldRef:
    cls:str; name:str; typ:str
@dataclass(frozen=True)
class MethodRef:
    cls:str; name:str; proto:Proto

class Pool:
    def __init__(self):
        self.strings=set(); self.types=set(); self.protos=set(); self.fields=set(); self.methods=set()
    def st(self,s): self.strings.add(s); return s
    def ty(self,t): self.types.add(t); self.strings.add(t); return t
    def proto(self,ret,params=()):
        self.ty(ret); [self.ty(x) for x in params]
        p=Proto(ret,tuple(params)); self.protos.add(p)
        short=''.join(self.shorty(x) for x in (ret,)+tuple(params)); self.st(short)
        return p
    @staticmethod
    def shorty(t): return 'L' if t.startswith('L') or t.startswith('[') else t
    def field(self,c,n,t):
        self.ty(c); self.ty(t); self.st(n); f=FieldRef(c,n,t); self.fields.add(f); return f
    def method(self,c,n,ret,params=()):
        self.ty(c); self.st(n); p=self.proto(ret,params); m=MethodRef(c,n,p); self.methods.add(m); return m
    def finalize(self):
        # Strings must be UTF-16 lexicographically sorted. All used chars are BMP; Python order is equivalent here.
        self.strings_sorted=sorted(self.strings)
        self.si={s:i for i,s in enumerate(self.strings_sorted)}
        self.types_sorted=sorted(self.types,key=lambda t:self.si[t])
        self.ti={t:i for i,t in enumerate(self.types_sorted)}
        self.protos_sorted=sorted(self.protos,key=lambda p:(self.ti[p.ret],tuple(self.ti[x] for x in p.params)))
        self.pi={p:i for i,p in enumerate(self.protos_sorted)}
        self.fields_sorted=sorted(self.fields,key=lambda f:(self.ti[f.cls],self.si[f.name],self.ti[f.typ]))
        self.fi={f:i for i,f in enumerate(self.fields_sorted)}
        self.methods_sorted=sorted(self.methods,key=lambda m:(self.ti[m.cls],self.si[m.name],self.pi[m.proto]))
        self.mi={m:i for i,m in enumerate(self.methods_sorted)}

class InsnAssembler:
    OP={'return-void':0x0e,'return':0x0f,'return-object':0x11,'move/from16':0x02,'move-object/from16':0x08,'move-result':0x0a,'move-result-wide':0x0b,'move-result-object':0x0c,
        'const/4':0x12,'const/16':0x13,'const':0x14,'const-wide/16':0x16,'const-string':0x1a,'check-cast':0x1f,'array-length':0x21,'new-instance':0x22,'new-array':0x23,
        'cmp-long':0x31,'if-ne':0x33,'if-eqz':0x38,'if-lez':0x3d,'goto/16':0x29,'aput-object':0x4d,'iget-object':0x54,'iput-object':0x5b,'sget-object':0x62,
        'invoke-virtual':0x6e,'invoke-super':0x6f,'invoke-direct':0x70,'invoke-static':0x71,'invoke-interface':0x72,'invoke-virtual/range':0x74,'mul-int':0x90}
    def __init__(self,pool): self.p=pool
    def length(self,x):
        op=x[0]
        if op=='label': return 0
        if op in ('return-void','return','return-object','move-result','move-result-wide','move-result-object','const/4','array-length'): return 1
        if op in ('move/from16','move-object/from16','const/16','const-wide/16','cmp-long','const-string','check-cast','new-instance','new-array','if-ne','if-eqz','if-lez','goto/16','iget-object','iput-object','sget-object','mul-int'): return 2
        if op=='const': return 3
        if op=='aput-object': return 2
        if op.startswith('invoke-'): return 3
        raise KeyError(op)
    def assemble(self,items):
        labels={}; off=0
        for x in items:
            if x[0]=='label': labels[x[1]]=off
            else: off+=self.length(x)
        out=[]; off=0; max_out=0
        for x in items:
            op=x[0]
            if op=='label': continue
            code=self.OP[op]
            if op=='return-void': words=[code]
            elif op in ('return','return-object','move-result','move-result-wide','move-result-object'):
                a=x[1]; words=[code | (a<<8)]
            elif op in ('move/from16','move-object/from16'):
                a,b=x[1],x[2]; words=[code|(a<<8),b&0xffff]
            elif op=='array-length':
                a,b=x[1],x[2]; words=[code|(a<<8)|(b<<12)]
            elif op=='const/4':
                a,lit=x[1],x[2]; words=[code | (a<<8) | ((lit & 0xf)<<12)]
            elif op in ('const/16','const-wide/16'):
                a,lit=x[1],x[2]; words=[code|(a<<8),lit&0xffff]
            elif op=='cmp-long':
                a,b,c=x[1],x[2],x[3]; words=[code|(a<<8),b|(c<<8)]
            elif op=='mul-int':
                a,b,c=x[1],x[2],x[3]; words=[code|(a<<8),b|(c<<8)]
            elif op=='const':
                a,lit=x[1],x[2]; words=[code|(a<<8),lit&0xffff,(lit>>16)&0xffff]
            elif op=='const-string':
                a,s=x[1],x[2]; idx=self.p.si[s]
                if idx>0xffff: raise ValueError('jumbo needed')
                words=[code|(a<<8),idx]
            elif op in ('new-instance','check-cast'):
                a,t=x[1],x[2]; words=[code|(a<<8),self.p.ti[t]]
            elif op=='new-array':
                a,b,t=x[1],x[2],x[3]; words=[code|(a<<8)|(b<<12),self.p.ti[t]]
            elif op=='sget-object':
                a,f=x[1],x[2]; words=[code|(a<<8),self.p.fi[f]]
            elif op=='aput-object':
                a,b,c=x[1],x[2],x[3]; words=[code|(a<<8),b|(c<<8)]
            elif op in ('iget-object','iput-object'):
                a,b,f=x[1],x[2],x[3]; words=[code|(a<<8)|(b<<12),self.p.fi[f]]
            elif op=='if-ne':
                a,b,label=x[1],x[2],x[3]; d=labels[label]-off
                words=[code|(a<<8)|(b<<12),d&0xffff]
            elif op in ('if-eqz','if-lez'):
                a,label=x[1],x[2]; d=labels[label]-off
                words=[code|(a<<8),d&0xffff]
            elif op=='goto/16':
                label=x[1]; d=labels[label]-off; words=[code,d&0xffff]
            elif op=='invoke-virtual/range':
                start,count,m=x[1],x[2],x[3]; max_out=max(max_out,count); words=[code|(count<<8),self.p.mi[m],start&0xffff]
            elif op.startswith('invoke-'):
                regs,m=x[1],x[2]; max_out=max(max_out,len(regs)); cnt=len(regs)
                if cnt>5 or any(r>15 for r in regs): raise ValueError((op,regs))
                rr=list(regs)+[0]*5; c,d,e,f,g=rr[:5]
                words=[code | (g<<8) | (cnt<<12), self.p.mi[m], c | (d<<4) | (e<<8) | (f<<12)]
            else: raise KeyError(op)
            out.extend(words); off+=len(words)
        return out,max_out

@dataclass
class MethodDef:
    ref:MethodRef; access:int; registers:int; ins_size:int; items:list
@dataclass
class ClassDef:
    typ:str; super_typ:str; access:int; direct:list; virtual:list; fields:list

class DexBuilder:
    def __init__(self): self.p=Pool(); self.classes=[]
    def add_class(self,c): self.classes.append(c); self.p.ty(c.typ); self.p.ty(c.super_typ)
    def build(self):
        p=self.p; p.finalize(); asm=InsnAssembler(p)
        # Fixed sections offsets.
        header_size=0x70
        string_ids_off=header_size
        type_ids_off=string_ids_off+4*len(p.strings_sorted)
        proto_ids_off=type_ids_off+4*len(p.types_sorted)
        field_ids_off=proto_ids_off+12*len(p.protos_sorted)
        method_ids_off=field_ids_off+8*len(p.fields_sorted)
        class_defs_off=method_ids_off+8*len(p.methods_sorted)
        data_off=align(class_defs_off+32*len(self.classes),4)
        data=bytearray(); data_positions={}
        def data_abs(): return data_off+len(data)
        def pad(a=4):
            while len(data)%a: data.append(0)
        # string_data first
        string_data_offs=[]; first_string_off=None
        for s in p.strings_sorted:
            if first_string_off is None: first_string_off=data_abs()
            string_data_offs.append(data_abs()); data.extend(mutf8_data(s))
        # type lists for protos; deduplicate by parameter tuple
        typelist_off={}; first_tl=None
        for pr in p.protos_sorted:
            if not pr.params: continue
            key=pr.params
            if key in typelist_off: continue
            pad(4)
            if first_tl is None: first_tl=data_abs()
            typelist_off[key]=data_abs(); data.extend(struct.pack('<I',len(key)))
            for t in key: data.extend(struct.pack('<H',p.ti[t]))
            pad(4)
        # Assemble code items now; store absolute offsets per method.
        code_off={}; first_code=None
        all_mdefs=[]
        for c in self.classes: all_mdefs += c.direct+c.virtual
        coded_mdefs=[md for md in all_mdefs if md.items is not None]
        # Deterministic by method index
        coded_mdefs.sort(key=lambda md:p.mi[md.ref])
        for md in coded_mdefs:
            pad(4)
            if first_code is None: first_code=data_abs()
            code_off[md.ref]=data_abs()
            words,outs=asm.assemble(md.items)
            data.extend(struct.pack('<HHHHII',md.registers,md.ins_size,max(outs,0),0,0,len(words)))
            for w in words: data.extend(struct.pack('<H',w))
        # class_data items
        class_data_off={}; first_cd=None
        for c in sorted(self.classes,key=lambda c:p.ti[c.typ]):
            if first_cd is None: first_cd=data_abs()
            class_data_off[c.typ]=data_abs()
            # No static fields; instance fields sorted by field idx, encoded deltas
            flds=sorted(c.fields,key=lambda fa:p.fi[fa[0]])
            dirs=sorted(c.direct,key=lambda md:p.mi[md.ref]); virs=sorted(c.virtual,key=lambda md:p.mi[md.ref])
            data.extend(uleb(0)); data.extend(uleb(len(flds))); data.extend(uleb(len(dirs))); data.extend(uleb(len(virs)))
            prev=0
            for f,acc in flds:
                idx=p.fi[f]; data.extend(uleb(idx-prev)); data.extend(uleb(acc)); prev=idx
            prev=0
            for md in dirs:
                idx=p.mi[md.ref]; data.extend(uleb(idx-prev)); data.extend(uleb(md.access)); data.extend(uleb(code_off.get(md.ref,0))); prev=idx
            prev=0
            for md in virs:
                idx=p.mi[md.ref]; data.extend(uleb(idx-prev)); data.extend(uleb(md.access)); data.extend(uleb(code_off.get(md.ref,0))); prev=idx
        # map list at end, 4-aligned
        pad(4); map_off=data_abs()
        maps=[(0x0000,1,0)]
        if p.strings_sorted: maps.append((0x0001,len(p.strings_sorted),string_ids_off))
        if p.types_sorted: maps.append((0x0002,len(p.types_sorted),type_ids_off))
        if p.protos_sorted: maps.append((0x0003,len(p.protos_sorted),proto_ids_off))
        if p.fields_sorted: maps.append((0x0004,len(p.fields_sorted),field_ids_off))
        if p.methods_sorted: maps.append((0x0005,len(p.methods_sorted),method_ids_off))
        if self.classes: maps.append((0x0006,len(self.classes),class_defs_off))
        if typelist_off: maps.append((0x1001,len(typelist_off),first_tl))
        if coded_mdefs: maps.append((0x2001,len(coded_mdefs),first_code))
        if p.strings_sorted: maps.append((0x2002,len(p.strings_sorted),first_string_off))
        if self.classes: maps.append((0x2000,len(self.classes),first_cd))
        maps.append((0x1000,1,map_off))
        maps.sort(key=lambda x:x[2])
        data.extend(struct.pack('<I',len(maps)))
        for typ,size,off in maps: data.extend(struct.pack('<HHII',typ,0,size,off))

        # tables
        string_ids=b''.join(struct.pack('<I',o) for o in string_data_offs)
        type_ids=b''.join(struct.pack('<I',p.si[t]) for t in p.types_sorted)
        proto_ids=bytearray()
        for pr in p.protos_sorted:
            short=''.join(p.shorty(x) for x in (pr.ret,)+pr.params)
            proto_ids += struct.pack('<III',p.si[short],p.ti[pr.ret],typelist_off.get(pr.params,0))
        field_ids=bytearray()
        for f in p.fields_sorted: field_ids += struct.pack('<HHI',p.ti[f.cls],p.ti[f.typ],p.si[f.name])
        method_ids=bytearray()
        for m in p.methods_sorted: method_ids += struct.pack('<HHI',p.ti[m.cls],p.pi[m.proto],p.si[m.name])
        class_defs=bytearray()
        for c in sorted(self.classes,key=lambda c:p.ti[c.typ]):
            class_defs += struct.pack('<IIIIIIII',p.ti[c.typ],c.access,p.ti[c.super_typ],0,NO_INDEX,0,class_data_off[c.typ],0)
        pre=string_ids+type_ids+bytes(proto_ids)+bytes(field_ids)+bytes(method_ids)+bytes(class_defs)
        if len(pre)+header_size < data_off: pre += b'\x00'*(data_off-header_size-len(pre))
        file_size=header_size+len(pre)+len(data)
        data_size=file_size-data_off
        header=bytearray(b'dex\n035\x00'+b'\x00'*24)
        header += struct.pack('<IIIIIIIIIIIIIIIIIIII',
            file_size,header_size,0x12345678,0,0,map_off,
            len(p.strings_sorted),string_ids_off,
            len(p.types_sorted),type_ids_off,
            len(p.protos_sorted),proto_ids_off,
            len(p.fields_sorted),field_ids_off,
            len(p.methods_sorted),method_ids_off,
            len(self.classes),class_defs_off,
            data_size,data_off)
        assert len(header)==0x70
        dex=bytearray(header+pre+data)
        sig=hashlib.sha1(dex[32:]).digest(); dex[12:32]=sig
        chk=zlib.adler32(dex[12:])&0xffffffff; dex[8:12]=struct.pack('<I',chk)
        return bytes(dex)

# symbolic instruction helpers
def L(name): return ('label',name)
def I(op,*a): return (op,)+a

def make_dex():
    d=DexBuilder(); p=d.p
    # descriptors
    MA='Lcom/sipsqueak/v7/MainActivity;'; CH='Lcom/sipsqueak/v7/CoffeeChrome;'; CL='Lcom/sipsqueak/v7/CoffeeClient;'
    ACT='Landroid/app/Activity;'; BUNDLE='Landroid/os/Bundle;'; WV='Landroid/webkit/WebView;'; WS='Landroid/webkit/WebSettings;'
    VIEW='Landroid/view/View;'; CTX='Landroid/content/Context;'; INTENT='Landroid/content/Intent;'; URI='Landroid/net/Uri;'
    CR='Landroid/content/ContentResolver;'; OS='Ljava/io/OutputStream;'; STR='Ljava/lang/String;'; OBJ='Ljava/lang/Object;'; CS='Ljava/lang/CharSequence;'
    TOAST='Landroid/widget/Toast;'; NOTIF='Landroid/app/Notification;'; NB='Landroid/app/Notification$Builder;'; NM='Landroid/app/NotificationManager;'
    WVC='Landroid/webkit/WebViewClient;'; WCC='Landroid/webkit/WebChromeClient;'; FCP='Landroid/webkit/WebChromeClient$FileChooserParams;'; VC='Landroid/webkit/ValueCallback;'; JPR='Landroid/webkit/JsPromptResult;'
    CV='Landroid/content/ContentValues;'; PAR='Landroid/os/Parcelable;'; CLIP='Landroid/content/ClipData;'; MSM='Landroid/provider/MediaStore$Images$Media;'; B64='Landroid/util/Base64;'; BAOS='Ljava/io/ByteArrayOutputStream;'; AM='Landroid/content/res/AssetManager;'; SYS='Ljava/lang/System;'; INTEGER='Ljava/lang/Integer;'; TJNI='Ldev/ffmpegkit/tesseract/TesseractJNI;'; FILE='Ljava/io/File;'; FOS='Ljava/io/FileOutputStream;'; FIS='Ljava/io/FileInputStream;'; IS='Ljava/io/InputStream;'; UUID='Ljava/util/UUID;'
    URIARR='[Landroid/net/Uri;'; BYTEARR='[B'; STRARR='[Ljava/lang/String;'; INTARR='[I'
    READER='Lcom/beanster/bridge/NativeReader;'
    r_start=p.method(READER,'start',STR,(OBJ,BYTEARR,STR))
    r_poll=p.method(READER,'poll',STR,(STR,))
    r_cancel=p.method(READER,'cancel',STR,(STR,))
    r_caps=p.method(READER,'capabilities',STR,())
    f_webview=p.field(MA,'webView',WV)
    m_back=p.method(MA,'onBackPressed','V',())
    x_evaluate=p.method(WV,'evaluateJavascript','V',(STR,VC))
    x_background=p.method(ACT,'moveTaskToBack','Z',('Z',))
    back_script="if(!window.AppNav||!AppNav.back()){prompt('sipsqueak://background','')}"
    p.st(back_script);p.st('background')
    f_ocr_image=p.field(MA,'pendingOcrImage',BAOS)
    # Fields
    f_upload=p.field(MA,'upload',VC); f_pending=p.field(MA,'pendingData',STR); f_camera=p.field(MA,'cameraUri',URI); f_image=p.field(MA,'pendingImage',BAOS); f_lastpath=p.field(MA,'lastPhotoPath',STR); f_exportpath=p.field(MA,'exportPhotoPath',STR); f_keeporiginal=p.field(MA,'keepOriginalPhoto',STR)
    f_ch_act=p.field(CH,'activity',MA); f_cl_act=p.field(CL,'activity',MA); f_external=p.field(MSM,'EXTERNAL_CONTENT_URI',URI)
    # Own method refs
    m_ma_init=p.method(MA,'<init>','V',())
    m_oncreate=p.method(MA,'onCreate','V',(BUNDLE,))
    m_export=p.method(MA,'beginExport','V',(STR,STR,STR))
    m_exportimg=p.method(MA,'beginImageExport','V',(STR,STR))
    m_notify=p.method(MA,'showNotify','V',(STR,STR))
    m_result=p.method(MA,'onActivityResult','V',('I','I',INTENT))
    m_perm=p.method(MA,'onRequestPermissionsResult','V',('I',STRARR,INTARR))
    m_launch=p.method(MA,'launchCamera','V',())
    m_copyphoto=p.method(MA,'copyPhotoToPrivate',STR,(URI,))
    m_restorephoto=p.method(MA,'savePendingPhotoToPrivate',STR,(STR,))
    m_exportpath=p.method(MA,'beginPathImageExport','V',(STR,STR,STR))
    m_ocr=p.method(MA,'ocrRecognize',STR,(BYTEARR,'I','I','I'))
    m_ch_init=p.method(CH,'<init>','V',(MA,))
    m_ch_file=p.method(CH,'onShowFileChooser','Z',(WV,VC,FCP)); m_ch_prompt=p.method(CH,'onJsPrompt','Z',(WV,STR,STR,STR,JPR))
    m_cl_init=p.method(CL,'<init>','V',(MA,))
    m_cl_url=p.method(CL,'shouldOverrideUrlLoading','Z',(WV,STR))
    # external refs
    x_act_init=p.method(ACT,'<init>','V',())
    x_oncreate=p.method(ACT,'onCreate','V',(BUNDLE,))
    x_reqwin=p.method(ACT,'requestWindowFeature','Z',('I',))
    x_setcv=p.method(ACT,'setContentView','V',(VIEW,))
    x_start=p.method(ACT,'startActivityForResult','V',(INTENT,'I'))
    x_checkperm=p.method(ACT,'checkSelfPermission','I',(STR,)); x_reqperm=p.method(ACT,'requestPermissions','V',(STRARR,'I')); x_superperm=p.method(ACT,'onRequestPermissionsResult','V',('I',STRARR,INTARR))
    x_wv_init=p.method(WV,'<init>','V',(CTX,))
    x_getset=p.method(WV,'getSettings',WS,())
    x_setjs=p.method(WS,'setJavaScriptEnabled','V',('Z',)); x_setdom=p.method(WS,'setDomStorageEnabled','V',('Z',)); x_setfile=p.method(WS,'setAllowFileAccess','V',('Z',)); x_setcontent=p.method(WS,'setAllowContentAccess','V',('Z',))
    x_universal=p.method(WS,'setAllowUniversalAccessFromFileURLs','V',('Z',)); x_fileurls=p.method(WS,'setAllowFileAccessFromFileURLs','V',('Z',))
    x_setclient=p.method(WV,'setWebViewClient','V',(WVC,)); x_setchrome=p.method(WV,'setWebChromeClient','V',(WCC,)); x_load=p.method(WV,'loadUrl','V',(STR,))
    x_int_init=p.method(INTENT,'<init>','V',(STR,)); x_addcat=p.method(INTENT,'addCategory',INTENT,(STR,)); x_settype=p.method(INTENT,'setType',INTENT,(STR,))
    x_putextra_str=p.method(INTENT,'putExtra',INTENT,(STR,STR)); x_putextra_par=p.method(INTENT,'putExtra',INTENT,(STR,PAR)); x_addflags=p.method(INTENT,'addFlags',INTENT,('I',)); x_setclip=p.method(INTENT,'setClipData',INTENT,(CLIP,)); x_getdata=p.method(INTENT,'getData',URI,()); x_clipraw=p.method(CLIP,'newRawUri',CLIP,('Ljava/lang/CharSequence;',URI))
    x_getcr=p.method(CTX,'getContentResolver',CR,()); x_openos=p.method(CR,'openOutputStream',OS,(URI,)); x_openis=p.method(CR,'openInputStream',IS,(URI,)); x_insert=p.method(CR,'insert',URI,(URI,CV)); x_getfiles=p.method(CTX,'getFilesDir',FILE,()); x_getassets=p.method(CTX,'getAssets',AM,()); x_assetopen=p.method(AM,'open',IS,(STR,))
    x_getbytes=p.method(STR,'getBytes',BYTEARR,(STR,)); x_write=p.method(OS,'write','V',(BYTEARR,)); x_write3=p.method(OS,'write','V',(BYTEARR,'I','I')); x_close=p.method(OS,'close','V',()); x_read=p.method(IS,'read','I',(BYTEARR,)); x_closeis=p.method(IS,'close','V',())
    x_file_init=p.method(FILE,'<init>','V',(FILE,STR)); x_file_init_path=p.method(FILE,'<init>','V',(STR,)); x_mkdirs=p.method(FILE,'mkdirs','Z',()); x_exists=p.method(FILE,'exists','Z',()); x_abspath=p.method(FILE,'getAbsolutePath',STR,()); x_fos_init=p.method(FOS,'<init>','V',(FILE,)); x_fis_init=p.method(FIS,'<init>','V',(FILE,)); x_uuid=p.method(UUID,'randomUUID',UUID,()); x_uuidstr=p.method(UUID,'toString',STR,());
    x_cv_init=p.method(CV,'<init>','V',()); x_cv_put=p.method(CV,'put','V',(STR,STR)); x_b64=p.method(B64,'decode',BYTEARR,(STR,'I')); x_baos_init=p.method(BAOS,'<init>','V',()); x_baos_write=p.method(BAOS,'write','V',(BYTEARR,)); x_baos_size=p.method(BAOS,'size','I',()); x_baos_writeto=p.method(BAOS,'writeTo','V',(OS,)); x_baos_toarray=p.method(BAOS,'toByteArray',BYTEARR,()); x_baos_close=p.method(BAOS,'close','V',()); x_prompt_confirm=p.method(JPR,'confirm','V',(STR,)); x_parseint=p.method(INTEGER,'parseInt','I',(STR,)); x_intstr=p.method(INTEGER,'toString',STR,('I',)); x_loadlib=p.method(SYS,'loadLibrary','V',(STR,)); x_obj_init=p.method(OBJ,'<init>','V',())
    x_toast=p.method(TOAST,'makeText',TOAST,(CTX,CS,'I')); x_show=p.method(TOAST,'show','V',())
    x_getsys=p.method(CTX,'getSystemService',OBJ,(STR,)); x_nb_init=p.method(NB,'<init>','V',(CTX,)); x_nicon=p.method(NB,'setSmallIcon',NB,('I',)); x_ntitle=p.method(NB,'setContentTitle',NB,(CS,)); x_ntext=p.method(NB,'setContentText',NB,(CS,)); x_nauto=p.method(NB,'setAutoCancel',NB,('Z',)); x_nbuild=p.method(NB,'build',NOTIF,()); x_nnotify=p.method(NM,'notify','V',('I',NOTIF))
    x_wcc_init=p.method(WCC,'<init>','V',()); x_capture=p.method(FCP,'isCaptureEnabled','Z',()); x_createchooser=p.method(FCP,'createIntent',INTENT,()); x_parse=p.method(FCP,'parseResult',URIARR,('I',INTENT)); x_receive=p.method(VC,'onReceiveValue','V',(OBJ,))
    t_init_ctor=p.method(TJNI,'<init>','V',())
    t_native_init=p.method(TJNI,'nativeInit','J',(STR,STR,'I'))
    t_set_psm=p.method(TJNI,'nativeSetPageSegMode','V',('J','I'))
    t_set_image=p.method(TJNI,'nativeSetImage','V',('J',BYTEARR,'I','I','I','I'))
    t_get_text=p.method(TJNI,'nativeGetUTF8Text',STR,('J',))
    t_get_conf=p.method(TJNI,'nativeGetMeanConfidence','I',('J',))
    t_get_words=p.method(TJNI,'nativeGetWords',STR,('J',))
    t_end=p.method(TJNI,'nativeEnd','V',('J',))
    t_version=p.method(TJNI,'nativeGetVersion',STR,())
    x_wvc_init=p.method(WVC,'<init>','V',()); x_uriparse=p.method(URI,'parse',URI,(STR,)); x_scheme=p.method(URI,'getScheme',STR,()); x_host=p.method(URI,'getHost',STR,()); x_query=p.method(URI,'getQueryParameter',STR,(STR,)); x_equals=p.method(STR,'equals','Z',(OBJ,)); x_concat=p.method(STR,'concat',STR,(STR,))
    # String constants
    for s in ['ocrcapabilities','ocrpoll','ocrcancel','meta','id']:p.st(s)
    for s in ['file:///android_asset/index.html','android.intent.action.CREATE_DOCUMENT','android.intent.action.OPEN_DOCUMENT','android.intent.category.OPENABLE','android.intent.extra.TITLE','UTF-8','导出成功','文件已保存','coffeelog','export','exportimage','exportimagebegin','exportimagechunk','exportimagefinish','sipsqueak','imagebegin','imagechunk','imagefinish','restorefinish','','data','mime','name','android.media.action.IMAGE_CAPTURE','android.permission.CAMERA','output','_display_name','CoffeeLog_capture.jpg','SipSqueak_capture.jpg','mime_type','image/jpeg','image/*','Beanster Sips','notification','notify','title','body','photos','.img','file://','preparephoto','photopath','keep','savepath','path','1','ocrbegin','ocrchunk','ocrfinish','w','h','psm','tesseract','tesseract173','tesseract174','tesseract176','tessdata','chi_sim.traineddata','ocr/chi_sim.traineddata','c++_shared','leptonica','tesseract_jni','chi_sim','__BEANSTER_OCR_INIT_FAILED__','__BEANSTER_OCR_BUFFER_FAILED__','__BEANSTER_OCR_CHUNK_FAILED__','0']:
        p.st(s)
    # MainActivity constructor
    md_init=MethodDef(m_ma_init,ACC_PUBLIC|ACC_CONSTRUCTOR,1,1,[I('invoke-direct',[0],x_act_init),I('return-void')])
    # onCreate: regs 6, params v4=this v5=bundle
    oncreate=[
        I('invoke-super',[4,5],x_oncreate), I('const/4',2,1), I('invoke-virtual',[4,2],x_reqwin),
        I('new-instance',0,WV), I('invoke-direct',[0,4],x_wv_init), I('iput-object',0,4,f_webview), I('invoke-virtual',[4,0],x_setcv),
        I('invoke-virtual',[0],x_getset), I('move-result-object',1), I('const/4',2,1),
        I('invoke-virtual',[1,2],x_setjs),I('invoke-virtual',[1,2],x_setdom),I('invoke-virtual',[1,2],x_setfile),I('invoke-virtual',[1,2],x_setcontent),I('invoke-virtual',[1,2],x_universal),I('invoke-virtual',[1,2],x_fileurls),
        I('new-instance',1,CL),I('invoke-direct',[1,4],m_cl_init),I('invoke-virtual',[0,1],x_setclient),
        I('new-instance',1,CH),I('invoke-direct',[1,4],m_ch_init),I('invoke-virtual',[0,1],x_setchrome),
        I('const-string',1,'file:///android_asset/index.html'),I('invoke-virtual',[0,1],x_load),I('return-void')]
    md_back=MethodDef(m_back,ACC_PUBLIC,4,1,[I('iget-object',0,3,f_webview),I('if-eqz',0,'back_exit'),I('const-string',1,back_script),I('const/4',2,0),I('invoke-virtual',[0,1,2],x_evaluate),I('return-void'),L('back_exit'),I('const/4',0,1),I('invoke-virtual',[3,0],x_background),I('return-void')])
    md_oncreate=MethodDef(m_oncreate,ACC_PROTECTED,6,2,oncreate)
    # beginExport: regs7 params v3=this v4=data v5=mime v6=name
    be=[I('iput-object',4,3,f_pending),I('new-instance',0,INTENT),I('const-string',1,'android.intent.action.CREATE_DOCUMENT'),I('invoke-direct',[0,1],x_int_init),
        I('const-string',1,'android.intent.category.OPENABLE'),I('invoke-virtual',[0,1],x_addcat),I('invoke-virtual',[0,5],x_settype),
        I('const-string',1,'android.intent.extra.TITLE'),I('invoke-virtual',[0,1,6],x_putextra_str),I('const/16',1,43),I('invoke-virtual',[3,0,1],x_start),I('return-void')]
    md_export=MethodDef(m_export,ACC_PUBLIC,7,4,be)
    # beginImageExport: image bytes are accumulated natively by the JS prompt bridge; this method only opens the system save panel.
    # regs5 params v2=this v3=name v4=mime
    bi=[I('new-instance',0,INTENT),I('const-string',1,'android.intent.action.CREATE_DOCUMENT'),I('invoke-direct',[0,1],x_int_init),
        I('const-string',1,'android.intent.category.OPENABLE'),I('invoke-virtual',[0,1],x_addcat),I('invoke-virtual',[0,4],x_settype),
        I('const-string',1,'android.intent.extra.TITLE'),I('invoke-virtual',[0,1,3],x_putextra_str),I('const/16',1,45),I('invoke-virtual',[2,0,1],x_start),I('return-void')]
    md_exportimg=MethodDef(m_exportimg,ACC_PUBLIC,5,3,bi)
    # launchCamera: create a full-resolution MediaStore target and open the OEM system camera. regs6 params v5=this
    lc=[I('new-instance',0,CV),I('invoke-direct',[0],x_cv_init),I('const-string',1,'_display_name'),I('const-string',2,'SipSqueak_capture.jpg'),I('invoke-virtual',[0,1,2],x_cv_put),
        I('const-string',1,'mime_type'),I('const-string',2,'image/jpeg'),I('invoke-virtual',[0,1,2],x_cv_put),I('invoke-virtual',[5],x_getcr),I('move-result-object',1),I('sget-object',2,f_external),
        I('invoke-virtual',[1,2,0],x_insert),I('move-result-object',0),I('if-eqz',0,'launch_fail'),I('iput-object',0,5,f_camera),
        I('new-instance',1,INTENT),I('const-string',2,'android.media.action.IMAGE_CAPTURE'),I('invoke-direct',[1,2],x_int_init),I('const-string',2,'output'),I('invoke-virtual',[1,2,0],x_putextra_par),
        I('const/4',2,3),I('invoke-virtual',[1,2],x_addflags),I('const/16',2,44),I('invoke-virtual',[5,1,2],x_start),I('return-void'),
        L('launch_fail'),I('iget-object',0,5,f_upload),I('if-eqz',0,'launch_end'),I('const/4',1,0),I('invoke-interface',[0,1],x_receive),I('iput-object',1,5,f_upload),L('launch_end'),I('return-void')]
    md_launch=MethodDef(m_launch,ACC_PUBLIC,6,1,lc)
    # copyPhotoToPrivate(Uri): keep an exact byte-for-byte copy in app private storage.
    # regs10 params v8=this,v9=src
    cp=[I('invoke-virtual',[8],x_getfiles),I('move-result-object',0),I('new-instance',1,FILE),I('const-string',2,'photos'),I('invoke-direct',[1,0,2],x_file_init),I('invoke-virtual',[1],x_mkdirs),
        I('invoke-static',[],x_uuid),I('move-result-object',2),I('invoke-virtual',[2],x_uuidstr),I('move-result-object',2),I('const-string',3,'.img'),I('invoke-virtual',[2,3],x_concat),I('move-result-object',2),I('new-instance',3,FILE),I('invoke-direct',[3,1,2],x_file_init),
        I('invoke-virtual',[8],x_getcr),I('move-result-object',4),I('invoke-virtual',[4,9],x_openis),I('move-result-object',5),I('if-eqz',5,'cp_fail'),I('new-instance',6,FOS),I('invoke-direct',[6,3],x_fos_init),
        I('const/16',7,8192),I('new-array',7,7,BYTEARR),L('cp_loop'),I('invoke-virtual',[5,7],x_read),I('move-result',0),I('if-lez',0,'cp_done'),I('const/4',1,0),I('invoke-virtual',[6,7,1,0],x_write3),I('goto/16','cp_loop'),
        L('cp_done'),I('invoke-virtual',[5],x_closeis),I('invoke-virtual',[6],x_close),I('invoke-virtual',[3],x_abspath),I('move-result-object',0),I('return-object',0),
        L('cp_fail'),I('const-string',0,''),I('return-object',0)]
    md_copyphoto=MethodDef(m_copyphoto,ACC_PUBLIC,10,2,cp)
    # savePendingPhotoToPrivate(name): persist bytes received through imagebegin/imagechunk into app-private photos.
    # regs8 params v6=this,v7=name
    rp=[I('invoke-virtual',[6],x_getfiles),I('move-result-object',0),I('new-instance',1,FILE),I('const-string',2,'photos'),I('invoke-direct',[1,0,2],x_file_init),I('invoke-virtual',[1],x_mkdirs),
        I('new-instance',2,FILE),I('invoke-direct',[2,1,7],x_file_init),I('iget-object',3,6,f_image),I('if-eqz',3,'rp_fail'),I('new-instance',4,FOS),I('invoke-direct',[4,2],x_fos_init),
        I('invoke-virtual',[3,4],x_baos_writeto),I('invoke-virtual',[4],x_close),I('invoke-virtual',[3],x_baos_close),I('const/4',5,0),I('iput-object',5,6,f_image),I('invoke-virtual',[2],x_abspath),I('move-result-object',0),I('return-object',0),
        L('rp_fail'),I('const-string',0,''),I('return-object',0)]
    md_restorephoto=MethodDef(m_restorephoto,ACC_PUBLIC,8,2,rp)
    # beginPathImageExport(path,name,mime): remember the private original and open SAF save panel.
    # regs6 params v2=this,v3=path,v4=name,v5=mime
    bp=[I('iput-object',3,2,f_exportpath),I('new-instance',0,INTENT),I('const-string',1,'android.intent.action.CREATE_DOCUMENT'),I('invoke-direct',[0,1],x_int_init),I('const-string',1,'android.intent.category.OPENABLE'),I('invoke-virtual',[0,1],x_addcat),I('invoke-virtual',[0,5],x_settype),I('const-string',1,'android.intent.extra.TITLE'),I('invoke-virtual',[0,1,4],x_putextra_str),I('const/16',1,46),I('invoke-virtual',[2,0,1],x_start),I('return-void')]
    md_exportpath=MethodDef(m_exportpath,ACC_PUBLIC,6,4,bp)
    # Native OCR bridge. Parameters: grayscale bytes, width, height, page segmentation mode.
    # regs16 params v11=this,v12=bytes,v13=w,v14=h,v15=psm
    oc=[
        # Verify grayscale buffer length equals width*height before JNI.
        I('array-length',6,12),I('mul-int',7,13,14),I('if-ne',6,7,'ocr_buffer_failed'),
        # Ensure app-private tessdata exists.
        I('invoke-virtual',[11],x_getfiles),I('move-result-object',0),I('new-instance',1,FILE),I('const-string',2,'tesseract176'),I('invoke-direct',[1,0,2],x_file_init),I('invoke-virtual',[1],x_mkdirs),
        I('new-instance',2,FILE),I('const-string',3,'tessdata'),I('invoke-direct',[2,1,3],x_file_init),I('invoke-virtual',[2],x_mkdirs),
        I('new-instance',3,FILE),I('const-string',4,'chi_sim.traineddata'),I('invoke-direct',[3,2,4],x_file_init),I('invoke-virtual',[3],x_exists),I('move-result',4),I('if-ne',4,4,'ocr_after_copy'),
        # The previous if-ne is intentionally replaced below after construction; placeholder kept structurally simple.
    ]
    # Replace the impossible self-compare with an if-eqz/goto pair.
    oc=oc[:-1]+[I('if-eqz',4,'ocr_copy'),I('goto/16','ocr_after_copy'),
        L('ocr_copy'),I('invoke-virtual',[11],x_getassets),I('move-result-object',4),I('const-string',5,'ocr/chi_sim.traineddata'),I('invoke-virtual',[4,5],x_assetopen),I('move-result-object',4),
        I('new-instance',5,FOS),I('invoke-direct',[5,3],x_fos_init),I('const/16',6,8192),I('new-array',6,6,BYTEARR),
        L('ocr_copy_loop'),I('invoke-virtual',[4,6],x_read),I('move-result',7),I('if-lez',7,'ocr_copy_done'),I('const/4',8,0),I('invoke-virtual',[5,6,8,7],x_write3),I('goto/16','ocr_copy_loop'),
        L('ocr_copy_done'),I('invoke-virtual',[4],x_closeis),I('invoke-virtual',[5],x_close),
        L('ocr_after_copy'),
        # Tesseract 5.5.0 native Init expects the tessdata directory itself.
        I('invoke-virtual',[2],x_abspath),I('move-result-object',0),
        I('const-string',1,'leptonica'),I('invoke-static',[1],x_loadlib),
        I('const-string',1,'tesseract'),I('invoke-static',[1],x_loadlib),
        I('const-string',1,'tesseract_jni'),I('invoke-static',[1],x_loadlib),
        I('new-instance',7,TJNI),I('invoke-direct',[7],t_init_ctor),I('const-string',1,'chi_sim'),I('const/4',2,3),
        I('invoke-virtual',[7,0,1,2],t_native_init),I('move-result-wide',8),I('const-wide/16',4,0),I('cmp-long',6,8,4),I('if-eqz',6,'ocr_init_failed'),
        I('invoke-virtual',[7,8,9,15],t_set_psm),
        # Arrange nativeSetImage receiver + wide handle + args contiguously in v7..v14.
        I('move-object/from16',10,12),I('move/from16',11,13),I('move/from16',12,14),I('const/4',13,1),I('move/from16',14,11),
        I('invoke-virtual/range',7,8,t_set_image),
        I('invoke-virtual',[7,8,9],t_get_text),I('move-result-object',0),I('invoke-virtual',[7,8,9],t_end),I('return-object',0),
        L('ocr_init_failed'),I('const-string',0,'__BEANSTER_OCR_INIT_FAILED__'),I('return-object',0),
        L('ocr_buffer_failed'),I('const-string',0,'__BEANSTER_OCR_BUFFER_FAILED__'),I('return-object',0)
    ]
    md_ocr=MethodDef(m_ocr,ACC_PUBLIC,16,5,oc)
    # runtime permission callback: after CAMERA is granted, resume the pending camera capture.
    pr=[I('invoke-super',[4,5,6,7],x_superperm),I('const/16',0,61),I('if-ne',5,0,'perm_end'),I('const-string',0,'android.permission.CAMERA'),I('invoke-virtual',[4,0],x_checkperm),I('move-result',0),
        I('const/4',1,0),I('if-ne',0,1,'perm_denied'),I('iget-object',0,4,f_upload),I('if-eqz',0,'perm_end'),I('invoke-virtual',[4],m_launch),I('goto/16','perm_end'),
        L('perm_denied'),I('iget-object',0,4,f_upload),I('if-eqz',0,'perm_end'),I('const/4',1,0),I('invoke-interface',[0,1],x_receive),I('iput-object',1,4,f_upload),L('perm_end'),I('return-void')]
    md_perm=MethodDef(m_perm,ACC_PUBLIC,8,4,pr)
    # onActivityResult: regs9 params v5=this,v6=req,v7=result,v8=intent
    rr=[
        # system gallery/document picker
        I('const/16',0,42),I('if-ne',6,0,'check_camera'),I('iget-object',0,5,f_upload),I('if-eqz',0,'end'),
        I('iget-object',2,5,f_keeporiginal),I('if-eqz',2,'gallery_callback'),I('const-string',3,'1'),I('invoke-virtual',[2,3],x_equals),I('move-result',3),I('if-eqz',3,'gallery_callback'),I('if-eqz',8,'gallery_callback'),I('invoke-virtual',[8],x_getdata),I('move-result-object',2),I('if-eqz',2,'gallery_callback'),I('invoke-virtual',[5,2],m_copyphoto),I('move-result-object',3),I('iput-object',3,5,f_lastpath),
        L('gallery_callback'),I('invoke-static',[7,8],x_parse),I('move-result-object',1),I('invoke-interface',[0,1],x_receive),I('const/4',1,0),I('iput-object',1,5,f_upload),I('iput-object',1,5,f_keeporiginal),I('goto/16','end'),
        # system camera wrote full-resolution image directly into MediaStore via EXTRA_OUTPUT
        L('check_camera'),I('const/16',0,44),I('if-ne',6,0,'check_export'),I('iget-object',0,5,f_upload),I('if-eqz',0,'end'),
        I('iget-object',1,5,f_camera),I('if-eqz',1,'camera_cancel'),I('iget-object',2,5,f_keeporiginal),I('if-eqz',2,'camera_callback'),I('const-string',3,'1'),I('invoke-virtual',[2,3],x_equals),I('move-result',3),I('if-eqz',3,'camera_callback'),I('invoke-virtual',[5,1],m_copyphoto),I('move-result-object',3),I('iput-object',3,5,f_lastpath),
        L('camera_callback'),I('const/4',2,1),I('new-array',2,2,URIARR),I('const/4',3,0),I('aput-object',1,2,3),I('invoke-interface',[0,2],x_receive),
        I('const/4',1,0),I('iput-object',1,5,f_upload),I('iput-object',1,5,f_camera),I('iput-object',1,5,f_keeporiginal),I('goto/16','end'),
        L('camera_cancel'),I('iget-object',0,5,f_upload),I('const/4',1,0),I('invoke-interface',[0,1],x_receive),I('iput-object',1,5,f_upload),I('iput-object',1,5,f_camera),I('goto/16','end'),
        # CSV/JSON document writer
        L('check_export'),I('const/16',0,43),I('if-ne',6,0,'check_image_export'),I('const/4',0,-1),I('if-ne',7,0,'end'),I('if-eqz',8,'end'),
        I('invoke-virtual',[8],x_getdata),I('move-result-object',0),I('if-eqz',0,'end'),I('invoke-virtual',[5],x_getcr),I('move-result-object',1),
        I('invoke-virtual',[1,0],x_openos),I('move-result-object',2),I('if-eqz',2,'end'),I('iget-object',3,5,f_pending),I('if-eqz',3,'end'),
        I('const-string',4,'UTF-8'),I('invoke-virtual',[3,4],x_getbytes),I('move-result-object',3),I('invoke-virtual',[2,3],x_write),I('invoke-virtual',[2],x_close),
        I('const-string',0,'导出成功'),I('const/4',1,0),I('invoke-static',[5,0,1],x_toast),I('move-result-object',0),I('invoke-virtual',[0],x_show),I('goto/16','end'),
        # high-res image export: prompt bridge has already decoded chunks into a native ByteArrayOutputStream.
        L('check_image_export'),I('const/16',0,45),I('if-ne',6,0,'check_path_export'),I('const/4',0,-1),I('if-ne',7,0,'end'),I('if-eqz',8,'end'),
        I('invoke-virtual',[8],x_getdata),I('move-result-object',0),I('if-eqz',0,'end'),I('invoke-virtual',[5],x_getcr),I('move-result-object',1),I('invoke-virtual',[1,0],x_openos),I('move-result-object',2),I('if-eqz',2,'end'),
        I('iget-object',3,5,f_image),I('if-eqz',3,'end'),I('invoke-virtual',[3,2],x_baos_writeto),I('invoke-virtual',[2],x_close),I('invoke-virtual',[3],x_baos_close),I('const/4',3,0),I('iput-object',3,5,f_image),
        I('const-string',0,'文件已保存'),I('const/4',1,0),I('invoke-static',[5,0,1],x_toast),I('move-result-object',0),I('invoke-virtual',[0],x_show),I('goto/16','end'),
        L('check_path_export'),I('const/16',0,46),I('if-ne',6,0,'end'),I('const/4',0,-1),I('if-ne',7,0,'end'),I('if-eqz',8,'end'),I('invoke-virtual',[8],x_getdata),I('move-result-object',0),I('if-eqz',0,'end'),I('iget-object',3,5,f_exportpath),I('if-eqz',3,'end'),I('new-instance',4,FILE),I('invoke-direct',[4,3],x_file_init_path),I('new-instance',3,FIS),I('invoke-direct',[3,4],x_fis_init),I('invoke-virtual',[5],x_getcr),I('move-result-object',1),I('invoke-virtual',[1,0],x_openos),I('move-result-object',2),I('if-eqz',2,'end'),I('const/16',4,8192),I('new-array',4,4,BYTEARR),L('path_copy_loop'),I('invoke-virtual',[3,4],x_read),I('move-result',0),I('if-lez',0,'path_copy_done'),I('const/4',1,0),I('invoke-virtual',[2,4,1,0],x_write3),I('goto/16','path_copy_loop'),L('path_copy_done'),I('invoke-virtual',[3],x_closeis),I('invoke-virtual',[2],x_close),I('const/4',3,0),I('iput-object',3,5,f_exportpath),I('const-string',0,'文件已保存'),I('const/4',1,0),I('invoke-static',[5,0,1],x_toast),I('move-result-object',0),I('invoke-virtual',[0],x_show),
        L('end'),I('return-void')]
    md_result=MethodDef(m_result,ACC_PROTECTED,9,4,rr)
    # Native notification
    sn=[I('const-string',0,'notification'),I('invoke-virtual',[4,0],x_getsys),I('move-result-object',0),I('if-eqz',0,'nend'),I('check-cast',0,NM),
        I('new-instance',1,NB),I('invoke-direct',[1,4],x_nb_init),I('const',2,17301659),I('invoke-virtual',[1,2],x_nicon),
        I('invoke-virtual',[1,5],x_ntitle),I('invoke-virtual',[1,6],x_ntext),I('const/4',2,1),I('invoke-virtual',[1,2],x_nauto),
        I('invoke-virtual',[1],x_nbuild),I('move-result-object',1),I('const/16',2,3001),I('invoke-virtual',[0,2,1],x_nnotify),L('nend'),I('return-void')]
    md_notify=MethodDef(m_notify,ACC_PUBLIC,7,3,sn)
    c_ma=ClassDef(MA,ACT,ACC_PUBLIC|ACC_SUPER,[md_init],[md_back,md_oncreate,md_export,md_exportimg,md_launch,md_copyphoto,md_restorephoto,md_exportpath,md_ocr,md_result,md_perm,md_notify],[(f_upload,ACC_PUBLIC),(f_pending,ACC_PUBLIC),(f_camera,ACC_PUBLIC),(f_image,ACC_PUBLIC),(f_lastpath,ACC_PUBLIC),(f_exportpath,ACC_PUBLIC),(f_keeporiginal,ACC_PUBLIC)])
    c_ma.fields.append((f_ocr_image,ACC_PUBLIC))
    c_ma.fields.append((f_webview,ACC_PUBLIC))
    d.add_class(c_ma)
    # CoffeeChrome: capture input -> actual system camera with MediaStore EXTRA_OUTPUT; normal input -> system document/photo picker
    ch_init=[I('invoke-direct',[0],x_wcc_init),I('iput-object',1,0,f_ch_act),I('return-void')]
    md_ch_init=MethodDef(m_ch_init,ACC_PUBLIC|ACC_CONSTRUCTOR,2,2,ch_init)
    # regs6 params v2=this,v3=wv,v4=callback,v5=params
    ch_file=[I('iget-object',0,2,f_ch_act),I('iput-object',4,0,f_upload),I('invoke-virtual',[5],x_capture),I('move-result',1),I('if-eqz',1,'picker'),
        I('invoke-virtual',[0],m_launch),I('const/4',0,1),I('return',0),
        L('picker'),I('invoke-virtual',[5],x_createchooser),I('move-result-object',1),I('const/16',3,42),I('invoke-virtual',[0,1,3],x_start),I('const/4',0,1),I('return',0)]
    md_ch_file=MethodDef(m_ch_file,ACC_PUBLIC,6,4,ch_file)
    # Reliable image-save bridge. JS calls prompt() synchronously so every base64 chunk reaches native code in order.
    # regs12 params v6=this,v7=wv,v8=url,v9=message,v10=default,v11=result
    jp=[I('invoke-static',[9],x_uriparse),I('move-result-object',0),I('invoke-virtual',[0],x_scheme),I('move-result-object',1),I('const-string',2,'sipsqueak'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_false'),
        I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'background'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_reader'),I('iget-object',4,6,f_ch_act),I('const/4',2,1),I('invoke-virtual',[4,2],x_background),I('goto/16','jp_confirm'),L('jp_reader'),
        # Native OCR begin/chunk/finish. OCR chunks use the URI query path (same proven bridge as image backup),
        # and every chunk returns the exact native cumulative byte count as an ACK.
        I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrbegin'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_ocrchunk'),
        I('iget-object',4,6,f_ch_act),I('new-instance',2,BAOS),I('invoke-direct',[2],x_baos_init),I('iput-object',2,4,f_ocr_image),I('const-string',3,'0'),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrchunk'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrchunk'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_ocrfinish'),
        I('const-string',3,'data'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('iget-object',4,6,f_ch_act),I('iget-object',2,4,f_ocr_image),I('if-eqz',2,'jp_ocrchunk_fail'),I('if-eqz',1,'jp_ocrchunk_fail'),I('const/4',3,0),I('invoke-static',[1,3],x_b64),I('move-result-object',1),I('if-eqz',1,'jp_ocrchunk_fail'),I('invoke-virtual',[2,1],x_baos_write),I('invoke-virtual',[2],x_baos_size),I('move-result',3),I('invoke-static',[3],x_intstr),I('move-result-object',3),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrchunk_fail'),I('const-string',3,'__BEANSTER_OCR_CHUNK_FAILED__'),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrfinish'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrfinish'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_ocrcaps'),
        I('const-string',3,'meta'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),
        I('iget-object',4,6,f_ch_act),I('iget-object',5,4,f_ocr_image),I('if-eqz',5,'jp_confirm'),I('invoke-virtual',[5],x_baos_toarray),I('move-result-object',5),
        I('const/4',2,0),I('iput-object',2,4,f_ocr_image),I('invoke-static',[4,5,1],r_start),I('move-result-object',5),I('invoke-virtual',[11,5],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrcaps'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrcapabilities'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_ocrpoll'),
        I('invoke-static',[],r_caps),I('move-result-object',3),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrpoll'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrpoll'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_ocrcancel'),
        I('const-string',3,'id'),I('invoke-virtual',[0,3],x_query),I('move-result-object',3),I('invoke-static',[3],r_poll),I('move-result-object',3),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_ocrcancel'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'ocrcancel'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_imagebegin'),
        I('const-string',3,'id'),I('invoke-virtual',[0,3],x_query),I('move-result-object',3),I('invoke-static',[3],r_cancel),I('move-result-object',3),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_imagebegin'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'imagebegin'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_chunk'),
        I('iget-object',4,6,f_ch_act),I('new-instance',2,BAOS),I('invoke-direct',[2],x_baos_init),I('iput-object',2,4,f_image),I('const-string',3,''),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_chunk'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'imagechunk'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_finish'),
        I('const-string',3,'data'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('iget-object',4,6,f_ch_act),I('iget-object',2,4,f_image),I('if-eqz',2,'jp_confirm'),I('if-eqz',1,'jp_confirm'),I('const/4',3,0),I('invoke-static',[1,3],x_b64),I('move-result-object',1),I('invoke-virtual',[2,1],x_baos_write),I('goto/16','jp_confirm'),
        L('jp_finish'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'imagefinish'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_restorefinish'),
        I('const-string',3,'name'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('const-string',3,'mime'),I('invoke-virtual',[0,3],x_query),I('move-result-object',2),I('iget-object',4,6,f_ch_act),I('invoke-virtual',[4,1,2],m_exportimg),I('goto/16','jp_confirm'),
        L('jp_restorefinish'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'restorefinish'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_prepare'),
        I('const-string',3,'name'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('iget-object',4,6,f_ch_act),I('invoke-virtual',[4,1],m_restorephoto),I('move-result-object',3),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_prepare'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'preparephoto'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_photopath'),I('const-string',3,'keep'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('iget-object',4,6,f_ch_act),I('iput-object',1,4,f_keeporiginal),I('const/4',2,0),I('iput-object',2,4,f_lastpath),I('goto/16','jp_confirm'),
        L('jp_photopath'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'photopath'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_savepath'),I('iget-object',4,6,f_ch_act),I('iget-object',3,4,f_lastpath),I('if-eqz',3,'jp_confirm'),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_savepath'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'savepath'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'jp_false'),I('const-string',3,'path'),I('invoke-virtual',[0,3],x_query),I('move-result-object',1),I('const-string',3,'name'),I('invoke-virtual',[0,3],x_query),I('move-result-object',2),I('const-string',3,'mime'),I('invoke-virtual',[0,3],x_query),I('move-result-object',3),I('iget-object',4,6,f_ch_act),I('invoke-virtual',[4,1,2,3],m_exportpath),I('goto/16','jp_confirm'),
        L('jp_confirm'),I('const-string',3,''),I('invoke-virtual',[11,3],x_prompt_confirm),I('const/4',0,1),I('return',0),
        L('jp_false'),I('const/4',0,0),I('return',0)]
    md_ch_prompt=MethodDef(m_ch_prompt,ACC_PUBLIC,12,6,jp)
    d.add_class(ClassDef(CH,WCC,ACC_PUBLIC|ACC_SUPER,[md_ch_init],[md_ch_file,md_ch_prompt],[(f_ch_act,ACC_PUBLIC)]))
    # CoffeeClient custom bridges
    cl_init=[I('invoke-direct',[0],x_wvc_init),I('iput-object',1,0,f_cl_act),I('return-void')]
    md_cl_init=MethodDef(m_cl_init,ACC_PUBLIC|ACC_CONSTRUCTOR,2,2,cl_init)
    # regs9 params v6=this,v7=wv,v8=url; locals v0-v5
    # Image export uses a chunked custom-scheme bridge so multi-megabyte JPEGs are not placed in one URL.
    cu=[I('invoke-static',[8],x_uriparse),I('move-result-object',0),I('invoke-virtual',[0],x_scheme),I('move-result-object',1),I('const-string',2,'coffeelog'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'false'),
        I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'export'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_exportimagebegin'),
        I('const-string',4,'data'),I('invoke-virtual',[0,4],x_query),I('move-result-object',1),I('const-string',4,'mime'),I('invoke-virtual',[0,4],x_query),I('move-result-object',2),I('const-string',4,'name'),I('invoke-virtual',[0,4],x_query),I('move-result-object',3),
        I('iget-object',4,6,f_cl_act),I('invoke-virtual',[4,1,2,3],m_export),I('const/4',0,1),I('return',0),
        # reset the native string accumulator
        L('check_exportimagebegin'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'exportimagebegin'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_exportimagechunk'),
        I('iget-object',4,6,f_cl_act),I('const-string',1,''),I('iput-object',1,4,f_pending),I('const/4',0,1),I('return',0),
        # append one base64 chunk
        L('check_exportimagechunk'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'exportimagechunk'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_exportimagefinish'),
        I('const-string',4,'data'),I('invoke-virtual',[0,4],x_query),I('move-result-object',1),I('if-eqz',1,'true_return'),I('iget-object',4,6,f_cl_act),I('iget-object',2,4,f_pending),I('if-eqz',2,'chunk_first'),
        I('invoke-virtual',[2,1],x_concat),I('move-result-object',2),I('iput-object',2,4,f_pending),I('goto/16','true_return'),
        L('chunk_first'),I('iput-object',1,4,f_pending),I('goto/16','true_return'),
        # open the Android system save panel only after every chunk has arrived
        L('check_exportimagefinish'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'exportimagefinish'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_exportimage'),
        I('const-string',4,'name'),I('invoke-virtual',[0,4],x_query),I('move-result-object',2),I('iget-object',4,6,f_cl_act),I('iget-object',1,4,f_pending),I('if-eqz',1,'true_return'),I('invoke-virtual',[4,1,2],m_exportimg),I('const/4',0,1),I('return',0),
        # legacy one-shot image export kept for old packaged pages
        L('check_exportimage'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'exportimage'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_savepath'),
        I('const-string',4,'data'),I('invoke-virtual',[0,4],x_query),I('move-result-object',1),I('const-string',4,'name'),I('invoke-virtual',[0,4],x_query),I('move-result-object',2),I('iget-object',4,6,f_cl_act),I('invoke-virtual',[4,1,2],m_exportimg),I('const/4',0,1),I('return',0),
        L('check_savepath'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'savepath'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'check_notify'),
        I('const-string',4,'path'),I('invoke-virtual',[0,4],x_query),I('move-result-object',1),I('const-string',4,'name'),I('invoke-virtual',[0,4],x_query),I('move-result-object',2),I('const-string',4,'mime'),I('invoke-virtual',[0,4],x_query),I('move-result-object',3),I('iget-object',4,6,f_cl_act),I('invoke-virtual',[4,1,2,3],m_exportpath),I('const/4',0,1),I('return',0),
        L('check_notify'),I('invoke-virtual',[0],x_host),I('move-result-object',1),I('const-string',2,'notify'),I('invoke-virtual',[2,1],x_equals),I('move-result',1),I('if-eqz',1,'false'),
        I('const-string',4,'title'),I('invoke-virtual',[0,4],x_query),I('move-result-object',1),I('const-string',4,'body'),I('invoke-virtual',[0,4],x_query),I('move-result-object',2),I('iget-object',4,6,f_cl_act),I('invoke-virtual',[4,1,2],m_notify),I('const/4',0,1),I('return',0),
        L('true_return'),I('const/4',0,1),I('return',0),
        L('false'),I('const/4',0,0),I('return',0)]
    md_cl_url=MethodDef(m_cl_url,ACC_PUBLIC,9,3,cu)
    d.add_class(ClassDef(CL,WVC,ACC_PUBLIC|ACC_SUPER,[md_cl_init],[md_cl_url],[(f_cl_act,ACC_PUBLIC)]))
    # Minimal Java declaration matching the official AAR JNI symbol names. This avoids dragging Kotlin/coroutines into the custom APK.
    md_t_ctor=MethodDef(t_init_ctor,ACC_PUBLIC|ACC_CONSTRUCTOR,1,1,[I('invoke-direct',[0],x_obj_init),I('return-void')])
    native_acc=ACC_PUBLIC|ACC_FINAL|ACC_NATIVE
    native_methods=[
        MethodDef(t_native_init,native_acc,0,0,None),MethodDef(t_set_psm,native_acc,0,0,None),MethodDef(t_set_image,native_acc,0,0,None),
        MethodDef(t_get_text,native_acc,0,0,None),MethodDef(t_get_conf,native_acc,0,0,None),MethodDef(t_get_words,native_acc,0,0,None),
        MethodDef(t_end,native_acc,0,0,None),MethodDef(t_version,native_acc,0,0,None)
    ]
    d.add_class(ClassDef(TJNI,OBJ,ACC_PUBLIC|ACC_FINAL|ACC_SUPER,[md_t_ctor],native_methods,[]))
    return d.build()
