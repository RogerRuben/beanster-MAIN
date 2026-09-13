"""Diagnostic only: same bundled model and RGB input, desktop TF is NOT APK validation."""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL']='3'
import sys,json
from pathlib import Path
import numpy as np
import tensorflow as tf
root=Path(__file__).resolve().parents[1]
interpreter=tf.lite.Interpreter(model_path=str(root/'vision/mobilenet_v1_224_quant.tflite'),num_threads=2)
interpreter.allocate_tensors();input_info=interpreter.get_input_details()[0];output_info=interpreter.get_output_details()[0]
assert tuple(input_info['shape'])==(1,224,224,3) and input_info['dtype']==np.uint8
assert tuple(output_info['shape'])==(1,1001) and output_info['dtype']==np.uint8
labels=(root/'vision/labels.txt').read_text(encoding='utf-8').splitlines()
def classify(file):
    rgb=np.frombuffer(Path(file).read_bytes(),dtype=np.uint8).reshape((1,224,224,3))
    interpreter.set_tensor(input_info['index'],rgb);interpreter.invoke()
    scale,zero=output_info['quantization'];scores=(interpreter.get_tensor(output_info['index'])[0].astype(float)-zero)*scale
    return {'status':'done','engine':'Desktop diagnostic / MobileNet','top':[{'index':int(i),'label':labels[i],'score':float(scores[i])} for i in np.argsort(scores)[-5:][::-1]]}
if sys.argv[1]=='--server':
    print('{"ready":true}',flush=True)
    for line in sys.stdin:
        print(json.dumps(classify(json.loads(line))),flush=True)
else: print(json.dumps(classify(sys.argv[1])))
