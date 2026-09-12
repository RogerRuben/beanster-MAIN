/* V18.1 import policies: stable IDs, local edits win, and original media is independent. */
const hasStoredFull=media=>typeof media==='string'?!!media:!!(media?.original||media?.full);
recordFingerprint=function(r){return [Math.floor(Number(r.ts)/60000),compactReadKey(r.productName||r.type),String(r.brand||'').trim().toLowerCase(),Number(r.size)||0].join('|')};
importUniqueRecords=function(arr){const out=[],seenId=new Set(),legacy=new Set();let dupes=0,invalid=0;
  for(const r of arr){if(!r||typeof r!=='object'||Array.isArray(r)||!Number.isFinite(Number(r.ts))||Number(r.ts)<=0){invalid++;continue}
    const id=r.id?String(r.id):'',fp=recordFingerprint(r);if(id?seenId.has(id):legacy.has(fp)){dupes++;continue}
    if(id)seenId.add(id);else legacy.add(fp);out.push({...r,id,ts:Number(r.ts)})}
  return {records:out,dupes,invalid};
};
const integrityRestore=restoreBackup;
analyzeImport=function(arr){const unique=importUniqueRecords(arr),byId=new Map(records.filter(r=>r.id).map(r=>[String(r.id),r]));let fresh=0,conflicts=0;
  for(const r of unique.records){const old=r.id?byId.get(String(r.id)):records.find(x=>recordFingerprint(x)===recordFingerprint(r));old?conflicts++:fresh++}
  const dates=unique.records.map(r=>r.ts).sort((a,b)=>a-b);return {unique:unique.records,dupes:unique.dupes,invalid:unique.invalid,fresh,conflicts,range:dates.length?`${localKey(new Date(dates[0]))} ～ ${localKey(new Date(dates.at(-1)))}`:'无有效记录'};
};
restoreBackup=function(file){if(file&&(/^image\//.test(file.type)||!(/\.(json|beanster)$/i.test(file.name))))return notify('请选择 .beanster 完整备份或 .json 记录文件',true);integrityRestore(file)};
applyImport=async function(mode){
  if(!pendingImport||!['append','merge'].includes(mode)||applyImport.busy)return;
  applyImport.busy=true;const pending=pendingImport;
  try{makeRestorePoint('导入前');saveImportSnapshot();
    const pack=pending.obj||{},incoming=pending.stats.unique,merged=records.map(r=>({...r})),jobs=[];
    const byId=new Map(merged.filter(r=>r.id).map(r=>[String(r.id),r]));
    let added=0,updated=0,restored=0;
    for(const raw of incoming){
      const old=(raw.id?byId.get(String(raw.id)):merged.find(r=>recordFingerprint(r)===recordFingerprint(raw)))||null;
      if(old&&mode==='append')continue;
      let record=old;
      if(old){
        // Old backups without edit timestamps must never overwrite a user's later edits.
        if(Number(raw.updatedAt)>Number(old.updatedAt)&&Number(old.updatedAt)>0){
          const media={id:old.id,photoId:old.photoId,photoPreview:old.photoPreview,nativePhotoPath:old.nativePhotoPath,sourceId:old.sourceId,sourcePreview:old.sourcePreview};
          Object.assign(old,normalizeImportedRecord(raw,old),media);updated++;
        }
      }else{record=normalizeImportedRecord(raw,{});record.id=raw.id||'import-'+Date.now()+'-'+Math.random().toString(16).slice(2);
        record.photoId='';record.sourceId='';record.nativePhotoPath='';merged.push(record);byId.set(String(record.id),record);added++}
      jobs.push({record,photo:pack.photos?.[raw.id],source:pack.sources?.[raw.id]});
    }
    for(const {record,photo,source} of jobs){
      const localPhoto=record.photoId?await getPhoto(record.photoId).catch(()=>null):null;
      if(photo?.data&&!record.nativePhotoPath&&!hasStoredFull(localPhoto)){
        const media=await restoredMediaFromDataUrl(photo.data,'',photo.quality||'restored',photo.display||'');
        await putPhoto(record.id,media);record.photoId=record.id;record.photoPreview=media.preview;record.photoMime=photo.mime||'image/jpeg';restored++;
      }
      const localSource=record.sourceId?await getPhoto(record.sourceId).catch(()=>null):null;
      if(source?.data&&!hasStoredFull(localSource)){
        const media=await restoredMediaFromDataUrl(source.data,'','info-source',source.display||'');
        const id=record.id+':source';await putPhoto(id,media);record.sourceId=id;record.sourcePreview=media.preview;record.sourceMime=source.mime||'image/jpeg';
      }
    }
    records=merged.sort((a,b)=>b.ts-a.ts);
    readMemory={...(pack.readMemory||{}),...readMemory};localStorage.setItem(READMEMKEY,JSON.stringify(readMemory));
    if($('importSettings')?.checked){if(pack.settings)settings={...settings,...pack.settings};if(Array.isArray(pack.templates))templates=pack.templates}
    persist();renderAll();closeImportPreview();notify(`已新增 ${added} 条，更新 ${updated} 条，恢复 ${restored} 张原图`);
  }catch(error){notify('导入没有完成，原有记录仍保留，请检查存储空间后重试',true)}finally{applyImport.busy=false}
};
const integrityPreview=showImportPreview;
showImportPreview=function(){integrityPreview();const note=document.querySelector('.import-preview-note');if(note)note.textContent='仅追加不会修改已有记录。合并时保留本地修改，并补回缺失原图；只有带有更晚修改时间的记录才会更新。不同编号的两杯记录不会自动删除。';const action=document.querySelector('.import-action.primary');if(action)action.textContent='合并记录与缺失原图'};
const integritySource=makeSourceAttachment;
makeSourceAttachment=function(im,file,raw){return {...integritySource(im,file,raw),full:raw,qualityMode:'original-info-source'}};
const integrityViewSource=viewInfoSource;
viewInfoSource=async function(id){await integrityViewSource(id);const r=records.find(r=>r.id===id);if(r?.sourceId)viewerPhotoId=r.sourceId};

// No unsupported decimal-precision claims about a brand's proprietary recipe.
estimateFor=function(type,size,brand='',shots=null){
  const c=CATALOG[type]||CATALOG['普通黑咖啡'],volume=Number(size)||c.base;
  const count=shots===null||shots===''?Number(c.shots)||0:Math.max(0,Number(shots)||0);
  const espresso=['浓缩','美式','加浓美式','拿铁','生椰拿铁','卡布奇诺','澳白','摩卡','Dirty'].includes(type);
  const sizeRatio=clamp(volume/c.base,.25,3),shotRatio=espresso?count/Math.max(1,c.shots||1):sizeRatio;
  let caf=c.caf*shotRatio,low=(c.low||c.caf*.6)*shotRatio,high=(c.high||c.caf*1.5)*shotRatio,source=espresso?`配方估算 · ${count} 份浓缩`:'按容量估算';
  // Explicitly confirmed personal entries form a local brand + type + size reference.
  const reference=brand?records.filter(r=>r.brand===brand&&r.type===type&&!r.estimated&&r.caffeine>0&&Number(r.size)===volume&&Number(r.shots)===count).sort((a,b)=>(b.updatedAt||b.ts)-(a.updatedAt||a.ts))[0]:null;
  if(reference){caf=Number(reference.caffeine);low=caf*.8;high=caf*1.2;source='参考你确认过的同品牌同规格记录'}
  const strength=Number(settings.estimateStrength)||1;
  return {caf:Math.round(caf*strength),low:Math.round(low*strength),high:Math.round(high*strength),cal:Math.round(c.cal*(c.color==='milk'||c.color==='foam'||c.color==='mocha'?sizeRatio:Math.max(1,shotRatio))),source};
};
