"""Analyze alpha components into runtime clipping geometry; never edit the user PNGs."""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np,json
root=Path(__file__).resolve().parents[1]
extras={1:[13,14],2:[1,3],3:[2,5],4:[4,11],8:[21,24],9:[23,26],10:[22,25],14:[29,33,34,44],15:[27,28,31,32,45],16:[30,35,37,40]}
result=[]
for sheet,file in enumerate(['seated-expressions-user.png','seated-actions-user.png']):
 a=np.array(Image.open(root/'art/coffee-room'/file));labels,n=ndimage.label(a[:,:,3]>100);objs=ndimage.find_objects(labels)
 main=[(i+1,o) for i,o in enumerate(objs) if o and o[1].stop-o[1].start>80 and o[0].stop-o[0].start>80]
 main.sort(key=lambda p:(round((p[1][0].stop-(400 if sheet else 516))/(310 if sheet else 435)),p[1][1].start))
 assert len(main)==(18 if sheet else 8)
 distance,indices=ndimage.distance_transform_edt(labels==0,return_indices=True);nearest=labels[tuple(indices)]
 frames=[]
 for frame,(label,_) in enumerate(main):
  chosen=[label]+(extras.get(frame,[]) if sheet else [])
  mask=np.isin(nearest,chosen)&(distance<=3)&(a[:,:,3]>0)
  runs=[]
  for y in np.where(mask.any(axis=1))[0]:
   change=np.diff(np.r_[False,mask[y],False].astype(int));starts=np.where(change==1)[0];ends=np.where(change==-1)[0]
   runs.extend([[int(y),int(x),int(end-x)] for x,end in zip(starts,ends)])
  frames.append(runs)
 result.append(frames)
(root/'seated_clips.js').write_text('/* Alpha-derived runtime clip paths; source PNGs unchanged. */\nwindow.SEATED_CLIPS='+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
print('clip frames',list(map(len,result)))
