"""Package generated transparent originals into app resolutions, retaining alpha."""
from pathlib import Path
import json, shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/upgrade-v1'
GENERATED=Path('C:/Users/HP/.codex/generated_images/01a09447-68b4-7233-a191-68cb65cf799c')
ITEMS=[('cups10','十杯小记','6ebf219d-47eb-4f95-bdb7-c9061a2345d8'),('cups30','三十杯回忆','12041fe2-1ecd-46ea-acd7-c4f1f93c383b'),('photo1','第一张照片','1f1ed871-555c-4517-bc4b-d90d562af2f1'),('photo10','照片日记','3de71876-249d-407d-b6bc-2640cf02c54a')]
manifest=json.loads((ART/'manifest.json').read_text(encoding='utf-8'))
for key,label,source in ITEMS:
    asset_id='achievement_'+key
    original=ART/'source-atlases/v182'/f'{asset_id}.png';original.parent.mkdir(exist_ok=True,parents=True)
    if not original.exists() or Image.open(original).mode != "RGBA":shutil.copy2(GENERATED/f'exec-{source}.png',original)
    im=Image.open(original).convert('RGBA')
    assert im.getchannel('A').getextrema()==(0,255), 'Generated badge must have real alpha'
    paths={}
    for scale in (1,2,3):
        rel=f'png/achievements/{asset_id}@{scale}x.png'
        im.resize((128*scale,128*scale),Image.Resampling.LANCZOS).save(ART/rel)
        paths[f'{scale}x']=rel
    manifest['assets']=[a for a in manifest['assets'] if a['id']!=asset_id]
    manifest['assets'].append(dict(id=asset_id,label=label,category='achievements',png=paths,logicalSize=[128,128],source={'atlas':original.relative_to(ART).as_posix()},alpha=True))
(ART/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ART/'manifest.js').write_text('window.BEANSTER_ART = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Packaged four independent transparent achievement badges.')
