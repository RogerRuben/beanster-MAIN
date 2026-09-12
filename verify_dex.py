import struct,zipfile,sys
apk=sys.argv[1] if len(sys.argv)>1 else 'Beanster-Sips-V17.2.apk'
with zipfile.ZipFile(apk) as z:d=z.read('classes.dex')
U=lambda off,fmt: struct.unpack_from(fmt,d,off)
# header
(string_n,string_off,type_n,type_off,proto_n,proto_off,field_n,field_off,method_n,method_off,class_n,class_off)=U(0x38,'<IIIIIIIIIIII')

def read_uleb(off):
 v=0;s=0
 while 1:
  b=d[off];off+=1;v|=(b&0x7f)<<s
  if not b&0x80:return v,off
  s+=7

def str_at(idx):
 off=U(string_off+4*idx,'<I')[0];_,p=read_uleb(off);q=d.index(0,p);return d[p:q].decode('utf-8')
strings=[str_at(i) for i in range(string_n)]
types=[strings[U(type_off+4*i,'<I')[0]] for i in range(type_n)]
methods=[]
for i in range(method_n):
 ci,pi,ni=U(method_off+8*i,'<HHI');methods.append((types[ci],strings[ni]))
found=[]
prompt_calls=[]
for ci in range(class_n):
 vals=U(class_off+32*ci,'<IIIIIIII');typ=types[vals[0]];cd=vals[6]
 if not cd:continue
 p=cd; sf,p=read_uleb(p); inf,p=read_uleb(p); dm,p=read_uleb(p); vm,p=read_uleb(p)
 for _ in range(sf+inf):
  _,p=read_uleb(p);_,p=read_uleb(p)
 for bucket,n in [('direct',dm),('virtual',vm)]:
  prev=0
  for _ in range(n):
   delta,p=read_uleb(p);acc,p=read_uleb(p);code,p=read_uleb(p);idx=prev+delta;prev=idx
   cls,name=methods[idx]
   if cls=='Ldev/ffmpegkit/tesseract/TesseractJNI;' or name=='ocrRecognize':found.append((bucket,cls,name,hex(acc),code))
   if name=='onJsPrompt' and code:
    size=U(code+12,'<I')[0];words=U(code+16,'<'+'H'*size);pos=0
    one={0x0e,0x0f,0x11,0x0a,0x0b,0x0c,0x12,0x21}
    while pos<size:
     op=words[pos]&255
     if 0x6e<=op<=0x72 or op==0x74:
      prompt_calls.append(methods[words[pos+1]]);pos+=3
     elif op==0x14:pos+=3
     elif op in one:pos+=1
     else:pos+=2
print('DEX_METHODS')
for x in found:print(x)
required={'nativeInit','nativeSetPageSegMode','nativeSetImage','nativeGetUTF8Text','nativeEnd'}
native={x[2] for x in found if x[1]=='Ldev/ffmpegkit/tesseract/TesseractJNI;' and int(x[3],16)&0x100 and x[4]==0}
assert required<=native,(required-native)
assert any(x[2]=='ocrRecognize' and x[4]>0 for x in found)
print('DEX_NATIVE_BRIDGE=PASS')
with zipfile.ZipFile(apk) as z:
 if 'classes2.dex' in z.namelist():
  assert b'Lcom/beanster/bridge/NativeReader;' in z.read('classes2.dex')
  for method in ['start','poll','cancel','capabilities']:
   assert ('Lcom/beanster/bridge/NativeReader;',method) in prompt_calls,method
  assert not any(name=='ocrRecognize' for cls,name in prompt_calls),'UI callback still executes synchronous OCR'
  print('DEX_ASYNC_DISPATCH=PASS: real Chrome bridge calls classes2 NativeReader; no synchronous OCR invocation')
