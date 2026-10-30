(()=>{
const $=id=>document.getElementById(id);let project=null,assets=[],transcript=null,transcriptReview=null,brief=null,story=null,timelinePlan=null,selectedAssetSHA256=null,storyScenes=[],storyManualEdits=[];
let projectEpoch=0;
const clone=x=>JSON.parse(JSON.stringify(x));
const staleMessage='تم تجاهل نتيجة تخص المشروع السابق.';
const assertCurrent=epoch=>{if(epoch!==projectEpoch)throw Error(staleMessage)};
const status=(msg,kind='')=>{if(msg===staleMessage)return;$('status').textContent=msg;$('status').className='status '+kind};
const urlToken=typeof location!=='undefined'?new URLSearchParams(location.search||'').get('token'):null;
const call=async(url,body)=>{const epoch=projectEpoch;const headers={...(urlToken?{'x-dev-token':urlToken}:{}),...(body===undefined?{}:{'content-type':'application/json'})};const options=body===undefined?(urlToken?{headers}:{}):{method:'POST',headers,body:JSON.stringify(body)};let r,d;try{r=await fetch(url,options);d=await r.json()}catch(error){assertCurrent(epoch);throw error}assertCurrent(epoch);if(!r.ok)throw Error(d.error??`فشل الطلب (${r.status})`);return d};
const id=()=>{if(!project)throw Error('انتظر تحميل المشروع المختار.');return project.id};
const storyFields=['summaryAr','summaryEn','titleAr','titleEn','narrAr','narrEn','visualAr','visualEn','captionAr','captionEn','wordStart','wordEnd','sceneIdInput','narrativePurpose','sceneBasis','sceneEvidenceIds','sceneStartSeconds','sceneEndSeconds','authoredAr','authoredEn','shotKind','shotSourceStatus','motionRecipe','transitionKind','soundRole','sceneConfidence','missingAssetsInput'];
const rightsFields=['platform','sourceUrl','rights','evidence'];
const fieldDefault=key=>key==='rights'?'unknown':key==='wordStart'||key==='wordEnd'?'1':key==='sceneIdInput'?'scene-1':key==='narrativePurpose'?'hook':key==='sceneBasis'?'observed':key==='sceneStartSeconds'?'0':key==='shotKind'?'talking-head':key==='shotSourceStatus'?'verified-project-asset':key==='motionRecipe'?'source-focus':key==='transitionKind'?'cut':key==='soundRole'?'no-music':key==='sceneConfidence'?'0.9':'';
const formDrafts=new Map();
const draftVersions=new Map();
const draftKey=()=>`reel-studio:media-review-story:v1:${project.id}:${selectedAssetSHA256??'none'}`;
const parseCsv=raw=>String(raw??'').split(',').map(s=>s.trim()).filter(Boolean);

function defaultEvidenceIds(){
 const fromInput=parseCsv($('sceneEvidenceIds').value);
 if(fromInput.length)return fromInput;
 const briefObj=brief?.record??brief;
 const validEv=(briefObj?.evidence??[]).filter(e=>e?.id&&e.kind!=='unknown');
 return validEv.length?[validEv[0].id]:['goal'];
}

function findSourceAsset(){
 const targetSha=transcript?.sourceSHA256??selectedAssetSHA256;
 return (targetSha&&assets.find(a=>a.kind==='source'&&a.sha256===targetSha))??assets.find(a=>a.kind==='source'&&/native-cfr|Prepared source/i.test(a.name??''))??assets.find(a=>a.kind==='source')??null;
}

function populateFormFromScene(sc){
 if(!sc)return;
 $('sceneIdInput').value=sc.id??'scene-1';
 $('narrativePurpose').value=sc.narrativePurpose??'hook';
 $('sceneBasis').value=sc.basis??'observed';
 $('sceneEvidenceIds').value=(sc.evidenceIds??[]).join(', ');
 $('sceneStartSeconds').value=String(sc.startSeconds??0);
 $('sceneEndSeconds').value=sc.endSeconds!=null?String(sc.endSeconds):'';
 $('titleAr').value=sc.title?.ar??'';
 $('titleEn').value=sc.title?.en??'';
 $('narrAr').value=sc.spokenSource?.translation?.ar??sc.narration?.ar??'';
 $('narrEn').value=sc.spokenSource?.translation?.en??sc.narration?.en??'';
 $('authoredAr').value=sc.authoredScript?.ar??'';
 $('authoredEn').value=sc.authoredScript?.en??'';
 $('visualAr').value=sc.visualProposal?.ar??'';
 $('visualEn').value=sc.visualProposal?.en??'';
 $('captionAr').value=sc.caption?.ar??'';
 $('captionEn').value=sc.caption?.en??'';
 $('shotKind').value=sc.shot?.kind??'talking-head';
 $('shotSourceStatus').value=sc.shot?.sourceStatus??'verified-project-asset';
 $('motionRecipe').value=sc.suggestedMotion?.motionRecipe??'source-focus';
 $('transitionKind').value=sc.suggestedMotion?.transition??'cut';
 $('soundRole').value=sc.soundProposal?.musicPolicy??'no-music';
 $('sceneConfidence').value=String(sc.confidence??0.9);
 $('bRollNeeded').checked=sc.bRoll?.needed===true;
 $('missingAssetsInput').value=(sc.missingAssets??[]).join(', ');
 const ref=sc.sourceRefs?.[0];
 if(ref){$('wordStart').value=String((ref.wordStartIndex??0)+1);$('wordEnd').value=String(ref.wordEndIndex??1);}
 updateSelection();
}

function renderStoryScenes(){
 const box=$('storyScenesList');box.replaceChildren();
 if(!storyScenes.length){box.textContent='القائمة تحتوي مشهد النموذج الحالي عند الحفظ، أو أضف مشاهد متعددة (Hook → Point → CTA).';return;}
 for(const sc of storyScenes){
  const row=document.createElement('div');row.className='scene-item';
  const quote=sc.spokenSource?.originalText??sc.sourceRefs?.[0]?.quote??'بدون اقتباس مصدر (مشهد إبداعي)';
  const authored=sc.authoredScript?.ar??'';
  const cap=sc.caption?.ar??'';
  row.textContent=`[${sc.id}] (${sc.narrativePurpose??'point'} · ${sc.basis}) ${sc.startSeconds}s → ${sc.endSeconds}s (${sc.durationSeconds??(sc.endSeconds-sc.startSeconds)}s) | الأصلي: «${quote.trim()}» | المقترح: «${authored}» | الكابشن: «${cap}» | الأدلة: ${(sc.evidenceIds??[]).join(',')||'—'}`;
  const editBtn=document.createElement('button');editBtn.textContent='تعديل هذا المشهد';
  editBtn.onclick=()=>{populateFormFromScene(sc);$('pointEditTargetId').value=sc.id;status(`تم تحميل المشهد ${sc.id} في النموذج للتعديل.`);};
  const delBtn=document.createElement('button');delBtn.textContent='حذف';
  delBtn.onclick=()=>{storyScenes=storyScenes.filter(x=>x.id!==sc.id);renderStoryScenes();persistStory();};
  row.append(editBtn,delBtn);box.append(row);
 }
}

function restoreSavedStory(){
 if(!project)return;
 try{const key=draftKey(),raw=localStorage.getItem(key);if(draftVersions.has(key)&&draftVersions.get(key)!==raw&&formDrafts.has(project.id)){status('المسودة اتغيرت في صفحة تانية؛ نصك الحالي محفوظ في الصفحة فقط.','bad');return;}draftVersions.set(key,raw);if(!raw)return;
 const saved=JSON.parse(raw);if(saved.version!==1||!saved.fields||typeof saved.fields!=='object')return;
 for(const field of storyFields)if(typeof saved.fields[field]==='string')$(field).value=saved.fields[field];
 if(typeof saved.bRollNeeded==='boolean')$('bRollNeeded').checked=saved.bRollNeeded;
 if(Array.isArray(saved.scenes)){storyScenes=saved.scenes;renderStoryScenes();}
 if(Array.isArray(saved.manualEdits))storyManualEdits=saved.manualEdits;
 }catch{status('تعذر استرجاع المسودة المحلية؛ الحقول الحالية لم تتغير.','bad');}
}
function persistStory(){
 if(!project)return;
 rememberForm();
 try{const key=draftKey(),current=localStorage.getItem(key);
 if(!draftVersions.has(key)||current!==draftVersions.get(key)){status('المسودة اتغيرت في صفحة تانية. احتفظ بنصك الحالي قبل إعادة فتح المشروع؛ لم نستبدل النسخة الأخرى.','bad');return;}
 const raw=JSON.stringify({version:1,fields:Object.fromEntries(storyFields.map(field=>[field,$(field).value])),bRollNeeded:$('bRollNeeded').checked,scenes:storyScenes,manualEdits:storyManualEdits});
 localStorage.setItem(key,raw);draftVersions.set(key,raw);
 }catch{status('تعذر حفظ المسودة في المتصفح. احتفظ بنصك قبل قفل الصفحة.','bad');}
}

function rememberForm(){if(!project)return;formDrafts.set(project.id,{source:selectedAssetSHA256,story:Object.fromEntries(storyFields.map(key=>[key,$(key).value])),bRollNeeded:$('bRollNeeded').checked,scenes:clone(storyScenes),manualEdits:clone(storyManualEdits),rights:Object.fromEntries(rightsFields.map(key=>[key,$(key).value])),externalConsent:$('externalConsent').checked,publishConsent:$('publishConsent').checked});}
function resetProjectView(){
 assets=[];selectedAssetSHA256=null;transcript=null;transcriptReview=null;brief=null;story=null;timelinePlan=null;storyScenes=[];storyManualEdits=[];setProject(null);
 for(const key of ['assets','transcript','selectedWords','rightsStatus','storyStatus','timelinePlanResult','storyScenesList','pointEditResult','directorReviewResult'])$(key).replaceChildren();
 $('runDirectorReview').disabled=false;
 for(const key of [...storyFields,...rightsFields])$(key).value=fieldDefault(key);
 $('wordStart').removeAttribute('max');$('wordEnd').removeAttribute('max');
 $('bRollNeeded').checked=false;$('externalConsent').checked=false;$('publishConsent').checked=false;
 $('executeTimelinePlan').disabled=true;$('openTimelineEditor').hidden=true;$('openTimelineEditor').removeAttribute('href');
}
function restoreForm(){const draft=formDrafts.get(project?.id);if(!draft||draft.source!==selectedAssetSHA256)return;for(const key of storyFields)if(draft.story[key]!==undefined)$(key).value=draft.story[key];$('bRollNeeded').checked=Boolean(draft.bRollNeeded);if(Array.isArray(draft.scenes)){storyScenes=clone(draft.scenes);renderStoryScenes();}if(Array.isArray(draft.manualEdits))storyManualEdits=clone(draft.manualEdits);if(draft.source===selectedAssetSHA256){for(const key of rightsFields)$(key).value=draft.rights[key];$('externalConsent').checked=draft.externalConsent;$('publishConsent').checked=draft.publishConsent;}}
function setProject(p){project=p;$('projectInfo').textContent=p?`${p.name} · ${p.id} · ${p.assets?.length??0} ملفات · ${p.prepared?'مجهز':'غير مجهز'}`:'اختر مشروعًا.';}
async function list(){const data=await call('/api/projects');const select=$('project'),previous=select.value;select.replaceChildren();for(const p of data.projects){const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — ${p.id}`;select.append(o);}const requested=typeof location!=='undefined'?new URLSearchParams(location.search||'').get('project'):null;if(data.projects.some(p=>p.id===previous))select.value=previous;else if(data.projects.some(p=>p.id===requested))select.value=requested;else if(data.projects.some(p=>p.id==='app-1793272332186-8ec6b9'))select.value='app-1793272332186-8ec6b9';else if(data.projects.length)select.selectedIndex=0;await choose();if(project?.id==='app-1793272332186-8ec6b9'&&typeof location!=='undefined'){await loadTranscript().catch(()=>{});await $('loadStory').onclick().catch(()=>{});await $('makeTimelinePlan').onclick().catch(()=>{});try{const ed=await call('/api/phase3/editor',{id:project.id});if(ed?.url){$('openTimelineEditor').href=ed.url;$('openTimelineEditor').hidden=false;}}catch{}}}
async function choose(){rememberForm();projectEpoch++;const selected=$('project').value;resetProjectView();status('جارٍ تحميل المشروع المختار…');if(!selected){setProject(null);assets=[];$('assets').textContent='لا توجد مشاريع بعد.';return;}const data=await call('/api/projects');const p=data.projects.find(x=>x.id===selected);if(!p){status('المشروع المختار غير موجود.','bad');return;}const provenance=await call(`/api/assets/provenance?id=${encodeURIComponent(selected)}`);setProject(p);assets=provenance.assets;$('assets').replaceChildren();for(const a of assets){const div=document.createElement('p');div.innerHTML='';div.textContent=`${a.kind==='source'?'الأصل':a.kind==='reference'?'مرجع':'صورة'}: ${a.name} · SHA-256 ${a.sha256} · الحقوق: ${a.provenance?.rights?.status??'غير معروفة'}`;if(a.kind==='source'){div.tabIndex=0;div.setAttribute('role','button');div.onclick=()=>selectAsset(a);$('assets').append(div);}}const source=findSourceAsset();if(source)selectAsset(source);else $('assets').append('لا يوجد فيديو أصلي.');status('اتفتح المشروع المختار؛ افتح تفريغه وقصته للمراجعة.');restoreSavedStory();restoreForm();renderStoryScenes();}
function selectAsset(a){selectedAssetSHA256=a.sha256;$('assets').querySelectorAll('[role=button]').forEach(n=>n.style.outline='');const node=[...$('assets').querySelectorAll('[role=button]')].find(n=>n.textContent.includes(a.name));if(node)node.style.outline='2px solid #f5b94c';$('platform').value=a.provenance?.source?.platform??'local_upload';$('sourceUrl').value=a.provenance?.source?.url??'';const rights=a.provenance?.rights?.status??'unknown';$('rights').value=rights;$('evidence').value=a.provenance?.rights?.evidence?.reference??'';$('externalConsent').checked=a.provenance?.consent?.externalAI===true;$('publishConsent').checked=a.provenance?.consent?.publish===true;$('rightsStatus').textContent=`الملف المختار: ${a.name} · ${a.sha256}`;}
async function refreshProject(){if(!id())return;const d=await call('/api/projects');setProject(d.projects.find(p=>p.id===id())??null);const x=await call(`/api/assets/provenance?id=${encodeURIComponent(id())}`);assets=x.assets;}
$('reload').onclick=()=>list().catch(e=>status(e.message,'bad'));$('project').onchange=()=>choose().catch(e=>status(e.message,'bad'));
$('create').onclick=async()=>{try{const file=$('sourceFile').files[0];if(!file)throw Error('اختر فيديو أو ملف WAV أولًا.');const p=await call('/api/create',{name:$('newName').value,style:'section-deck'});const r=await fetch(`/api/upload?id=${encodeURIComponent(p.id)}&kind=source&name=${encodeURIComponent(file.name)}`,{method:'POST',body:file});const a=await r.json();if(!r.ok)throw Error(a.error??'تعذر رفع الملف.');await list();$('project').value=p.id;await choose();status(`أُنشئ المشروع ورُفع الأصل محليًا. SHA-256: ${a.sha256}. لم يُرسل أي ملف للخارج.`,'ok');}catch(e){status(e.message,'bad');}};
$('saveRights').onclick=async()=>{try{const a=assets.find(x=>x.kind==='source'&&x.sha256===selectedAssetSHA256);if(!a)throw Error('اختر الأصل المطلوب قبل حفظ الحقوق.');const choice=$('rights').value;const rightsEvidence=choice==='unknown'?null:{kind:choice==='owned_by_user'?'user_attestation':choice==='licensed'?'license_record':choice==='permission_granted'?'permission_record':'public_domain_reference',reference:$('evidence').value.trim()};const result=await call('/api/assets/provenance',{id:id(),assetSha256:a.sha256,source:{platform:$('platform').value||'unknown',url:$('sourceUrl').value||null},rights:{status:choice,evidence:rightsEvidence},consent:{externalAI:$('externalConsent').checked,publish:$('publishConsent').checked}});$('rightsStatus').textContent=`حُفظ السجل. حالة الحقوق: ${result.provenance.rights.status}. المشاركة الخارجية والنشر لا يحدثان من هذه الشاشة.`;await refreshProject();status('حُفظت بيانات المصدر والحقوق محليًا.','ok');}catch(e){status(e.message,'bad');}};
function drawTranscript(){const box=$('transcript');box.replaceChildren();if(!transcript){box.textContent='لا توجد مسودة تفريغ محملة.';return;}const review=transcriptReview;const badge=document.createElement('p');badge.textContent=`${transcript.language??'لغة غير محددة'} · ${transcript.words?.length??0} كلمة · ${review&&!review.stale?`قرار بشري: ${review.review?.decision}`:'غير معتمد'}`;box.append(badge);const table=document.createElement('table'),head=document.createElement('tr');for(const s of ['#','الكلمة','بداية ms','نهاية ms','تنبيه الثقة']){const th=document.createElement('th');th.textContent=s;head.append(th);}table.append(head);for(const [i,w] of (transcript.words??[]).entries()){const tr=document.createElement('tr');for(const value of [i+1,w.text,w.startMs,w.endMs,w.warning??(w.confidence!=null&&w.confidence<0.6?'ثقة منخفضة':'')]){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td);}table.append(tr);}box.append(table);$('wordEnd').max=String(transcript.words?.length??1);$('wordStart').max=String(transcript.words?.length??1);updateSelection();}
function updateSelection(){if(!transcript)return;const words=transcript.words??[],start=Math.max(1,Number($('wordStart').value)||1),end=Math.min(words.length,Math.max(start,Number($('wordEnd').value)||start));$('selectedWords').textContent=words.slice(start-1,end).map(w=>w.text).join('')||'اختر نطاق كلمات من التفريغ.';}
async function loadTranscript(){const selected=id(),epoch=projectEpoch;const draft=await call(`/api/transcript/latest?id=${encodeURIComponent(selected)}`);assertCurrent(epoch);const review=await call(`/api/transcript/review?id=${encodeURIComponent(selected)}`);assertCurrent(epoch);transcript=draft;transcriptReview=review;drawTranscript();}
$('wordStart').oninput=updateSelection;$('wordEnd').oninput=updateSelection;
$('transcribe').onclick=async()=>{const epoch=projectEpoch;try{if(!project?.prepared)throw Error('جهّز المشروع من الصفحة الرئيسية قبل طلب التفريغ.');const rawDuration=$('durationSeconds').value.trim(),durationSeconds=rawDuration===''?undefined:Number(rawDuration);if(durationSeconds!==undefined&&(!Number.isInteger(durationSeconds)||durationSeconds<1||durationSeconds>1800))throw Error('أدخل مدة بين 1 و1800 ثانية، أو اتركها فارغة للفيديو كاملًا.');const d=await call('/api/transcript/draft',{id:id(),language:$('language').value,...(durationSeconds===undefined?{}:{durationSeconds})});if(!d.id)throw Error('لم يُرجع الخادم رقم مهمة للتفريغ.');for(let attempt=0;attempt<180;attempt++){await new Promise(resolve=>setTimeout(resolve,1000));assertCurrent(epoch);const job=await call(`/api/job?id=${encodeURIComponent(d.id)}`);if(job.status==='done'){await loadTranscript();status('اكتمل التفريغ المحلي. راجع الكلمات والتوقيت قبل اعتماده.');return;}if(job.status==='failed')throw Error(job.error??'فشلت مهمة التفريغ.');status(`التفريغ المحلي قيد العمل: ${job.status??'جارٍ'} (${attempt+1} ثانية).`);}throw Error('التفريغ ما زال جاريًا؛ اضغط فتح آخر تفريغ بعد قليل.');}catch(e){status(e.message,'bad');}};
$('loadTranscript').onclick=()=>loadTranscript().then(()=>status('عُرض التفريغ للمراجعة. راجع كل كلمة وتوقيت قبل تسجيل قرارك.')).catch(e=>status(e.message,'bad'));
async function decideTranscript(decision){try{if(!transcript)await loadTranscript();if(!confirm(decision==='accepted'?'هل راجعت الكلمات والتوقيت يدويًا وتريد اعتماد هذا التفريغ؟':'هل تريد تسجيل رفض التفريغ؟'))return;transcriptReview=await call('/api/transcript/review',{id:id(),expectedDraftSHA256:transcriptReview.draftSHA256,sourceSHA256:transcript.sourceSHA256,decision,reviewedByHuman:true});drawTranscript();status(`سُجل القرار البشري: ${decision}.`,'ok');}catch(e){status(e.message,'bad');}}
$('acceptTranscript').onclick=()=>decideTranscript('accepted');$('rejectTranscript').onclick=()=>decideTranscript('rejected');

function buildSceneFromForm(defaultEndSeconds){
 if(!transcript||!transcriptReview||transcriptReview.stale||transcriptReview.review?.decision!=='accepted')throw Error('اعتمد التفريغ بعد مراجعته أولًا.');
 const source=findSourceAsset();if(!source)throw Error('المشروع لا يحتوي فيديو أصليًا.');
 const basis=$('sceneBasis').value||'observed';
 const startSeconds=Number($('sceneStartSeconds').value||0);
 const endRaw=$('sceneEndSeconds').value.trim();
 const endSeconds=endRaw!==''?Number(endRaw):Number(defaultEndSeconds);
 if(!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds)||endSeconds<=startSeconds)throw Error('توقيت بداية ونهاية المشهد غير صالح.');
 const durationSeconds=Number((endSeconds-startSeconds).toFixed(3));
 const narr={ar:$('narrAr').value,en:$('narrEn').value};
 const authored={ar:$('authoredAr').value.trim()||narr.ar,en:$('authoredEn').value.trim()||narr.en};
 const words=transcript.words??[];
 let sourceRefs=[],spokenSource=null;
 if(basis!=='creative'||($('wordStart').value!==''&&$('wordEnd').value!==''&&Number($('wordStart').value)>0)){
  const start=Math.max(1,Number($('wordStart').value)||1),end=Math.min(words.length,Number($('wordEnd').value)||start);
  if(start>end||!words.length)throw Error('نطاق الكلمات غير صالح.');
  const selected=words.slice(start-1,end),quote=selected.map(w=>w.text).join('');
  sourceRefs=[{sourceSHA256:source.sha256,transcriptSHA256:transcriptReview.draftSHA256??transcriptReview.review?.expectedDraftSHA256,wordStartIndex:start-1,wordEndIndex:end,startMs:selected[0].startMs,endMs:selected.at(-1).endMs,quote}];
  spokenSource={originalText:quote,originalLanguage:['ar','en','mixed'].includes(transcript.language)?transcript.language:'ar',translation:narr};
 }
 const bRollNeeded=$('bRollNeeded').checked;
 const missingList=parseCsv($('missingAssetsInput').value);
 const shotStatus=$('shotSourceStatus').value||'verified-project-asset';
 return {
  id:($('sceneIdInput').value||'scene-1').trim(),
  narrativePurpose:$('narrativePurpose').value||'hook',
  startSeconds,
  endSeconds,
  durationSeconds,
  title:{ar:$('titleAr').value,en:$('titleEn').value},
  narration:narr,
  spokenSource,
  authoredScript:authored,
  shot:{kind:$('shotKind').value||'talking-head',sourceStatus:shotStatus,assetRef:shotStatus==='synthetic-placeholder'?null:(source.name??'source.mp4')},
  visualProposal:{ar:$('visualAr').value,en:$('visualEn').value},
  caption:{ar:$('captionAr').value,en:$('captionEn').value},
  captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},
  suggestedMotion:{transition:$('transitionKind').value||'cut',motionRecipe:$('motionRecipe').value||'source-focus'},
  soundProposal:{musicPolicy:$('soundRole').value||'no-music',preserveOriginalVoice:true},
  bRoll:{needed:bRollNeeded,description:bRollNeeded?{ar:$('visualAr').value,en:$('visualEn').value}:null},
  sourceRefs,
  basis,
  evidenceIds:defaultEvidenceIds(),
  confidence:Math.min(1,Math.max(0,Number($('sceneConfidence').value)||0.9)),
  missingAssets:shotStatus==='missing-asset'&&!missingList.length?['missing-visual-asset']:missingList,
  unknowns:[],
 };
}

function upsertCurrentScene(){
 const briefObj=brief?.record??brief;
 const fallbackEnd=Number(briefObj?.durationSeconds)||10;
 const sc=buildSceneFromForm(fallbackEnd);
 const idx=storyScenes.findIndex(x=>x.id===sc.id);
 if(idx>=0)storyScenes[idx]=sc;else storyScenes.push(sc);
 storyScenes.sort((a,b)=>a.startSeconds-b.startSeconds);
 renderStoryScenes();
 persistStory();
 return sc;
}

function seedFiveSceneReal(){
 if(!transcript||!transcriptReview||transcriptReview.stale||transcriptReview.review?.decision!=='accepted')throw Error('اعتمد التفريغ بعد مراجعته أولًا.');
 const source=findSourceAsset();if(!source)throw Error('المشروع لا يحتوي فيديو أصليًا.');
 const briefObj=brief?.record??brief;
 const totalDuration=Number(briefObj?.durationSeconds)||Number(transcript.sourceDurationSeconds)||42.5;
 const words=transcript.words??[];
 const defaultEv=defaultEvidenceIds();
 const tHash=transcriptReview.draftSHA256??transcriptReview.review?.draftSHA256??transcriptReview.review?.expectedDraftSHA256;
 const sliceRef=(sIdx,eIdx)=>{const sel=words.slice(sIdx,eIdx),q=sel.map(w=>w.text).join('');return {ref:{sourceSHA256:source.sha256,transcriptSHA256:tHash,wordStartIndex:sIdx,wordEndIndex:eIdx,startMs:sel[0].startMs,endMs:sel.at(-1).endMs,quote:q},quote:q};};
 const sampleSentences=["مرحبًا! اسمي دايفيد سامر عرنوق.","عمري 22 سنة.","خلقت بولاية نيويورك، وصارلي ساكن بتكساس من وقت عمري 6 سنين.","درست علوم الكومبيوتر بجامعة يو تي دالاس، واتخرجت بـ2016.","وبعد ما تخرجت، توظفت بشركة هندسة كومبيوتر.","هواياتي الرياضة وعزف البيانو وألعاب الفيديو.","أول لغة اللي تعلّمت أحكيها هي اللغة العربية.","وكمان تعلّمت الكتابة والقراءة.","عندي أخ واحد أصغر مني، كمان بيحكي عربي.","وأهلي أصلهن من الشام.","وبحب أشكر الكل لهالفرصة."];
 const isDavid=totalDuration===42.5&&words.length===sampleSentences.length&&words.every((w,i)=>w.text.trim()===sampleSentences[i]);
 if(!isDavid)throw Error('القالب المحفوظ خاص بعينة دايفيد فقط؛ ابنِ مشاهد هذا المصدر من كلامه أو استخدم القالب العام وراجع النص.');
 const ranges=isDavid?[[0,2,0,4],[2,5,4,18],[5,8,18,32.5],[8,10,32.5,38.5],[10,11,38.5,totalDuration]]:(()=>{const n=words.length,p1=Math.max(1,Math.floor(n*0.18)),p2=Math.max(p1+1,Math.floor(n*0.45)),p3=Math.max(p2+1,Math.floor(n*0.72)),p4=Math.max(p3+1,n-1),d=totalDuration;return [[0,p1,0,Number((d*0.1).toFixed(2))],[p1,p2,Number((d*0.1).toFixed(2)),Number((d*0.42).toFixed(2))],[p2,p3,Number((d*0.42).toFixed(2)),Number((d*0.76).toFixed(2))],[p3,p4,Number((d*0.76).toFixed(2)),Number((d*0.9).toFixed(2))],[p4,n,Number((d*0.9).toFixed(2)),d]];})();
 const s1=sliceRef(ranges[0][0],ranges[0][1]),s2=sliceRef(ranges[1][0],ranges[1][1]),s3=sliceRef(ranges[2][0],ranges[2][1]),s4=sliceRef(ranges[3][0],ranges[3][1]),s5=sliceRef(ranges[4][0],ranges[4][1]);
  if(!$('summaryAr').value.trim())$('summaryAr').value='قصة تعريفية موثقة من 5 مشاهد (Hook → Context → Point → Proof → CTA) لشاب أمريكي من أصل شامي يتحدث عن نشأته ودراسته لعلوم الكومبيوتر وتمسكه باللغة العربية نطقًا وكتابةً.';
  if(!$('summaryEn').value.trim())$('summaryEn').value='Five-scene source-linked bilingual story (Hook → Context → Point → Proof → CTA) featuring David Samer Arnouk discussing his US upbringing, CS degree at UT Dallas, and preserving Arabic as his first spoken and written language.';
  storyScenes=[
   {id:'scene-1',narrativePurpose:'hook',startSeconds:ranges[0][2],endSeconds:ranges[0][3],durationSeconds:Number((ranges[0][3]-ranges[0][2]).toFixed(2)),title:{ar:'خطاف التعريف الشخصي باللهجة الشامية',en:'Personal Hook in Levantine Arabic'},narration:{ar:'مرحبًا! اسمي دايفيد سامر عرنوق. عمري 22 سنة.',en:'Hi! My name is David Samer Arnouk. I am 22 years old.'},spokenSource:{originalText:s1.quote,originalLanguage:'ar',translation:{ar:'مرحبًا! اسمي دايفيد سامر عرنوق. عمري 22 سنة.',en:'Hi! My name is David Samer Arnouk. I am 22 years old.'}},authoredScript:{ar:'شاب أمريكي من أصل شامي يبدأ قصته بلغته الأم بطلاقة منذ الثانية الأولى',en:'A 22-year-old Syrian-American opens his story fluently in his heritage language'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'native-cfr.mp4'},visualProposal:{ar:'متحدث مباشر أمام الكاميرا مع تركيز بصري هادئ على الوجه (Source Focus)',en:'Direct speaker on camera with subtle source-focus framing'},caption:{ar:'مرحبًا! اسمي دايفيد سامر عرنوق. عمري 22 سنة.',en:'Hi! My name is David Samer Arnouk. I am 22 years old.'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'source-focus'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[s1.ref],basis:'observed',evidenceIds:defaultEv,confidence:0.98,missingAssets:[],unknowns:[]},
   {id:'scene-2',narrativePurpose:'context',startSeconds:ranges[1][2],endSeconds:ranges[1][3],durationSeconds:Number((ranges[1][3]-ranges[1][2]).toFixed(2)),title:{ar:'النشأة في أمريكا ودراسة علوم الكومبيوتر',en:'US Upbringing & Computer Science Degree'},narration:{ar:'خلقت بولاية نيويورك، وصارلي ساكن بتكساس من وقت عمري 6 سنين. درست علوم الكومبيوتر بجامعة يو تي دالاس، واتخرجت بـ2016. وبعد ما تخرجت، توظفت بشركة هندسة كومبيوتر.',en:'Born in New York and living in Texas since age 6. I studied computer science at UT Dallas, graduated in 2016, and after graduating worked at a computer engineering company.'},spokenSource:{originalText:s2.quote,originalLanguage:'ar',translation:{ar:'خلقت بولاية نيويورك، وصارلي ساكن بتكساس من وقت عمري 6 سنين. درست علوم الكومبيوتر بجامعة يو تي دالاس، واتخرجت بـ2016. وبعد ما تخرجت، توظفت بشركة هندسة كومبيوتر.',en:'Born in New York and living in Texas since age 6. I studied computer science at UT Dallas, graduated in 2016, and after graduating worked at a computer engineering company.'}},authoredScript:{ar:'من نيويورك إلى تكساس: تخرّج من جامعة UT Dallas في علوم الكومبيوتر عام 2016 وبدأ مسيرته المهنية في هندسة الحاسوب',en:'From New York to Texas: UT Dallas CS graduate (2016) building a computer engineering career'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'native-cfr.mp4'},visualProposal:{ar:'إبراز محطات العمر والتخرج (6 سنين ← تخرج 2016) مع بطاقة عداد رقمي',en:'Highlight age and graduation milestones (Age 6 → 2016 Grad) with metric counter'},caption:{ar:'درست علوم الكومبيوتر بجامعة يو تي دالاس، واتخرجت بـ2016.',en:'I studied computer science at UT Dallas, and graduated in 2016.'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'metric-count'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:true,description:{ar:'بطاقة موقع (نيويورك ← تكساس) وشارة تخرج UT Dallas 2016',en:'Location badge (NY → Texas) and UT Dallas 2016 graduation callout'}},sourceRefs:[s2.ref],basis:'observed',evidenceIds:defaultEv,confidence:0.95,missingAssets:['ut-dallas-campus-broll-optional'],unknowns:[]},
   {id:'scene-3',narrativePurpose:'point',startSeconds:ranges[2][2],endSeconds:ranges[2][3],durationSeconds:Number((ranges[2][3]-ranges[2][2]).toFixed(2)),title:{ar:'الفكرة المحورية: العربية هي اللغة الأولى نطقًا وكتابةً',en:'Core Point: Arabic First — Spoken, Read, and Written'},narration:{ar:'هواياتي الرياضة وعزف البيانو وألعاب الفيديو. أول لغة اللي تعلّمت أحكيها هي اللغة العربية. وكمان تعلّمت الكتابة والقراءة.',en:'My hobbies are sports, playing piano, and video games. The first language I learned to speak is Arabic. And I also learned writing and reading.'},spokenSource:{originalText:s3.quote,originalLanguage:'ar',translation:{ar:'هواياتي الرياضة وعزف البيانو وألعاب الفيديو. أول لغة اللي تعلّمت أحكيها هي اللغة العربية. وكمان تعلّمت الكتابة والقراءة.',en:'My hobbies are sports, playing piano, and video games. The first language I learned to speak is Arabic. And I also learned writing and reading.'}},authoredScript:{ar:'رغم نشأته الكاملة في أمريكا، كانت العربية أول لغة نطق بها وتعلّم قراءتها وكتابتها إلى جانب شغفه بالبيانو والرياضة',en:'Despite growing up in the US, Arabic was his very first spoken, read, and written language alongside piano and sports'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'native-cfr.mp4'},visualProposal:{ar:'إبراز جملة «أول لغة اللي تعلّمت أحكيها هي اللغة العربية» كتصريح بصري واضح',en:'Highlight the core statement: The first language I learned to speak is Arabic'},caption:{ar:'أول لغة اللي تعلّمت أحكيها هي اللغة العربية.',en:'The first language I learned to speak is Arabic.'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'statement'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[s3.ref],basis:'observed',evidenceIds:defaultEv,confidence:0.96,missingAssets:[],unknowns:[]},
   {id:'scene-4',narrativePurpose:'proof',startSeconds:ranges[3][2],endSeconds:ranges[3][3],durationSeconds:Number((ranges[3][3]-ranges[3][2]).toFixed(2)),title:{ar:'البرهان العائلي: الجذور الشامية واستمرار اللغة في البيت',en:'Family Proof: Al-Sham Roots & Shared Heritage at Home'},narration:{ar:'عندي أخ واحد أصغر مني، كمان بيحكي عربي. وأهلي أصلهن من الشام.',en:'I have one younger brother, he also speaks Arabic. And my family is originally from Al-Sham.'},spokenSource:{originalText:s4.quote,originalLanguage:'ar',translation:{ar:'عندي أخ واحد أصغر مني، كمان بيحكي عربي. وأهلي أصلهن من الشام.',en:'I have one younger brother, he also speaks Arabic. And my family is originally from Al-Sham.'}},authoredScript:{ar:'السر في البيت: جذور العائلة من الشام جعلت العربية لغة حية يتحدثها حتى الأخ الأصغر',en:'The secret is at home: Al-Sham roots kept Arabic alive across brothers in the diaspora'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'native-cfr.mp4'},visualProposal:{ar:'مقارنة بصرية هادئة تبرز تواصل الجيلين بالعربية في البيت',en:'Visual callout showing heritage continuity across siblings'},caption:{ar:'عندي أخ واحد أصغر مني، كمان بيحكي عربي. وأهلي أصلهن من الشام.',en:'I have one younger brother, he also speaks Arabic. And my family is originally from Al-Sham.'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'source-focus'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[s4.ref],basis:'observed',evidenceIds:defaultEv,confidence:0.95,missingAssets:[],unknowns:[]},
   {id:'scene-5',narrativePurpose:'cta',startSeconds:ranges[4][2],endSeconds:ranges[4][3],durationSeconds:Number((ranges[4][3]-ranges[4][2]).toFixed(2)),title:{ar:'خاتمة الشكر باللهجة الشامية',en:'Closing Gratitude in Levantine Arabic'},narration:{ar:'وبحب أشكر الكل لهالفرصة.',en:'And I would like to thank everyone for this opportunity.'},spokenSource:{originalText:s5.quote,originalLanguage:'ar',translation:{ar:'وبحب أشكر الكل لهالفرصة.',en:'And I would like to thank everyone for this opportunity.'}},authoredScript:{ar:'ختام دافئ بشكر المتابعين — اقتراح تفاعل إضافي منفصل عن كلام المتحدث',en:'Warm closing gratitude — separate editorial engagement note'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'native-cfr.mp4'},visualProposal:{ar:'لقطة الختام مع إبراز عبارة الشكر المنطوقة حرفيًا',en:'Closing shot highlighting the verbatim spoken gratitude phrase'},caption:{ar:'وبحب أشكر الكل لهالفرصة.',en:'And I would like to thank everyone for this opportunity.'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'clip-wipe',motionRecipe:'statement'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[s5.ref],basis:'observed',evidenceIds:defaultEv,confidence:0.97,missingAssets:[],unknowns:[]},
  ];
 populateFormFromScene(storyScenes[0]);
 renderStoryScenes();
 persistStory();
}

function seedThreeScenes(){
 if($('storyTaskTemplate')?.value==='five-scene-story')return seedFiveSceneReal();
 if(!transcript||!transcriptReview||transcriptReview.stale||transcriptReview.review?.decision!=='accepted')throw Error('اعتمد التفريغ بعد مراجعته أولًا.');
 const source=findSourceAsset();if(!source)throw Error('المشروع لا يحتوي فيديو أصليًا.');
 const briefObj=brief?.record??brief;
 const totalDuration=Number(briefObj?.durationSeconds)||12;
 const t1=Number((totalDuration*0.33).toFixed(2)),t2=Number((totalDuration*0.75).toFixed(2));
 const words=transcript.words??[];if(!words.length)throw Error('لا توجد كلمات في التفريغ.');
 const mid=Math.max(1,Math.floor(words.length/2));
 const w1=words.slice(0,mid),w2=words.slice(mid);
 const q1=w1.map(w=>w.text).join(''),q2=(w2.length?w2:w1).map(w=>w.text).join('');
 const defaultEv=defaultEvidenceIds();
 const tHash=transcriptReview.draftSHA256??transcriptReview.review?.expectedDraftSHA256;
 storyScenes=[
  {id:'scene-1',narrativePurpose:'hook',startSeconds:0,endSeconds:t1,durationSeconds:t1,title:{ar:$('titleAr').value||'خطاف البداية',en:$('titleEn').value||'Opening Hook'},narration:{ar:$('narrAr').value||q1.trim(),en:$('narrEn').value||'Opening spoken hook'},spokenSource:{originalText:q1,originalLanguage:'ar',translation:{ar:$('narrAr').value||q1.trim(),en:$('narrEn').value||'Opening spoken hook'}},authoredScript:{ar:$('authoredAr').value||$('captionAr').value||'خطاف سريع يشد الانتباه من أول ثانية',en:$('authoredEn').value||$('captionEn').value||'Fast hook that grabs attention immediately'},shot:{kind:'talking-head',sourceStatus:'verified-project-asset',assetRef:source.name??'source.mp4'},visualProposal:{ar:$('visualAr').value||'متحدث مباشر مع تقريب خفيف',en:$('visualEn').value||'Direct speaker with subtle zoom'},caption:{ar:$('captionAr').value||q1.trim(),en:$('captionEn').value||'Hook caption'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'source-focus'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[{sourceSHA256:source.sha256,transcriptSHA256:tHash,wordStartIndex:0,wordEndIndex:mid,startMs:w1[0].startMs,endMs:w1.at(-1).endMs,quote:q1}],basis:'observed',evidenceIds:defaultEv,confidence:0.94,missingAssets:[],unknowns:[]},
  {id:'scene-2',narrativePurpose:'point',startSeconds:t1,endSeconds:t2,durationSeconds:Number((t2-t1).toFixed(2)),title:{ar:'الفكرة الأساسية والدليل',en:'Core Point & Proof'},narration:{ar:q2.trim(),en:'Core spoken explanation'},spokenSource:{originalText:q2,originalLanguage:'ar',translation:{ar:q2.trim(),en:'Core spoken explanation'}},authoredScript:{ar:'توضيح عملي مباشر للفكرة مع إبراز الكلمات المفتاحية',en:'Direct practical explanation highlighting key terms'},shot:{kind:'screen-capture',sourceStatus:'verified-project-asset',assetRef:source.name??'source.mp4'},visualProposal:{ar:'لقطة شرح مع إبراز بصري للنص',en:'Explanation shot with visual text highlight'},caption:{ar:q2.trim(),en:'Core message'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'cut',motionRecipe:'statement'},soundProposal:{musicPolicy:'optional-bed',preserveOriginalVoice:true},bRoll:{needed:true,description:{ar:'لقطة شاشة توضيحية مساندة',en:'Supporting screen recording B-roll'}},sourceRefs:[{sourceSHA256:source.sha256,transcriptSHA256:tHash,wordStartIndex:w2.length?mid:0,wordEndIndex:words.length,startMs:(w2.length?w2:w1)[0].startMs,endMs:(w2.length?w2:w1).at(-1).endMs,quote:q2}],basis:'observed',evidenceIds:defaultEv,confidence:0.9,missingAssets:[],unknowns:[]},
  {id:'scene-3',narrativePurpose:'cta',startSeconds:t2,endSeconds:totalDuration,durationSeconds:Number((totalDuration-t2).toFixed(2)),title:{ar:'الخاتمة ودعوة التفاعل',en:'Closing & Call to Action'},narration:{ar:'احفظ الريل وشاركنا رأيك في التعليقات',en:'Save this reel and share your thoughts below'},spokenSource:null,authoredScript:{ar:'احفظ الريل وشاركنا رأيك في التعليقات',en:'Save this reel and share your thoughts below'},shot:{kind:'motion-card',sourceStatus:'synthetic-placeholder',assetRef:null},visualProposal:{ar:'بطاقة ختامية متحركة بهوية الحساب',en:'Animated closing card with brand identity'},caption:{ar:'احفظ الريل الآن',en:'Save this reel now'},captionDirection:{ar:'rtl',en:'ltr',active:'bilingual'},suggestedMotion:{transition:'clip-wipe',motionRecipe:'statement'},soundProposal:{musicPolicy:'no-music',preserveOriginalVoice:true},bRoll:{needed:false,description:null},sourceRefs:[],basis:'creative',evidenceIds:defaultEv,confidence:0.88,missingAssets:[],unknowns:[]},
 ];
 populateFormFromScene(storyScenes[0]);
 renderStoryScenes();
 persistStory();
}

function applyPointEdit(){
 const targetId=($('pointEditTargetId').value||'scene-1').trim();
 const field=$('pointEditField').value||'caption';
 const ar=($('pointEditAr').value||'').trim(),en=($('pointEditEn').value||'').trim();
 if(!ar||!en)throw Error('أدخل النص الجديد بالعربية والإنجليزية لتطبيق التعديل الموضعي.');
 if(!storyScenes.length)upsertCurrentScene();
 const idx=storyScenes.findIndex(x=>x.id===targetId);
 if(idx<0)throw Error(`المشهد ${targetId} غير موجود في القائمة.`);
 const current=clone(storyScenes[idx]);
 current[field]={ar,en};
 storyScenes[idx]=current;
 storyManualEdits=[...storyManualEdits,{editId:`edit-${storyManualEdits.length+1}`,sceneId:targetId,instruction:($('pointEditReason').value||'تعديل موضعي من المراجع').trim(),changedFields:[field],editedAt:new Date().toISOString()}];
 if(($('sceneIdInput').value||'scene-1').trim()===targetId)populateFormFromScene(current);
 renderStoryScenes();
 persistStory();
 $('pointEditResult').textContent=`تم تحديث الحقل (${field}) في المشهد (${targetId}) فقط دون المساس بباقي المشاهد (${storyScenes.length} مشاهد).`;
 return current;
}

$('upsertSceneBtn').onclick=()=>{try{const sc=upsertCurrentScene();status(`تم حفظ المشهد ${sc.id} في قائمة المشاهد (${storyScenes.length} مشاهد).`,'ok');}catch(e){status(e.message,'bad');}};
$('newSceneBtn').onclick=()=>{try{const nextNum=storyScenes.length+1;const prevEnd=storyScenes.at(-1)?.endSeconds??Number($('sceneEndSeconds').value||0);const briefObj=brief?.record??brief;const total=Number(briefObj?.durationSeconds)||Math.max(prevEnd+4,10);$('sceneIdInput').value=`scene-${nextNum}`;$('narrativePurpose').value=nextNum===2?'point':nextNum>=3?'cta':'hook';$('sceneStartSeconds').value=String(prevEnd);$('sceneEndSeconds').value=String(total);status(`جاهز لإدخال بيانات المشهد ${$('sceneIdInput').value} (${prevEnd}s → ${total}s).`);}catch(e){status(e.message,'bad');}};
$('seedThreeScenesBtn').onclick=()=>{try{seedThreeScenes();status('تم توليد قالب المشاهد مع فصل الكلام الأصلي عن النص المقترح.','ok');}catch(e){status(e.message,'bad');}};
if($('seedFiveSceneRealBtn'))$('seedFiveSceneRealBtn').onclick=()=>{try{seedFiveSceneReal();status('تم بناء 5 مشاهد مفصلة (Hook → Context → Point → Proof → CTA) مرتبطة بالتفريغ الكامل.','ok');}catch(e){status(e.message,'bad');}};
$('applyPointEditBtn').onclick=()=>{try{applyPointEdit();status('طُبّق التعديل الموضعي على المشهد المحدد دون إعادة توليد اللوحة.','ok');}catch(e){status(e.message,'bad');}};

function collectStory(){
 if(!transcript||!transcriptReview||transcriptReview.stale||transcriptReview.review?.decision!=='accepted')throw Error('اعتمد التفريغ بعد مراجعته أولًا.');
 const briefObj=brief?.record??brief;
 const duration=Number(briefObj?.durationSeconds);
 if(!Number.isFinite(duration)||duration<=0)throw Error('احفظ موجز المرحلة 1 بمدة واضحة من الصفحة الرئيسية أولًا.');
 const scenes=storyScenes.length?clone(storyScenes):[buildSceneFromForm(duration)];
 return {version:3,language:'mixed',durationSeconds:duration,summary:{ar:$('summaryAr').value,en:$('summaryEn').value},styleReferences:[],scenes,manualEdits:clone(storyManualEdits),reviewOnly:true,approved:false,executionAllowed:false};
}
async function prerequisites(){brief=await call(`/api/analysis/brief?id=${encodeURIComponent(id())}`);if(!brief.record)throw Error('احفظ موجز المرحلة 1 واقبله أولًا من الصفحة الرئيسية.');const accepted=await call(`/api/analysis/storyboard/review?id=${encodeURIComponent(id())}`);if(!accepted.review||accepted.stale||accepted.review.decision!=='accepted-for-next-stage')throw Error('سجّل قبول لوحة المرحلة 1 للمراجعة التالية من الصفحة الرئيسية أولًا.');}
$('saveStory').onclick=async()=>{try{await prerequisites();const storyboard=collectStory();story=await call('/api/analysis/source-storyboard',{id:id(),storyboard});$('storyStatus').textContent=JSON.stringify(story,null,2);status('حُفظت القصة للمراجعة فقط؛ لم يبدأ أي مونتاج.','ok');}catch(e){status(e.message,'bad');}}
$('loadStory').onclick=async()=>{try{if(!id())throw Error('اختر مشروعًا.');const d=await call(`/api/analysis/source-storyboard?id=${encodeURIComponent(id())}`);story=d;if(!story.record)throw Error(`لا توجد قصة محفوظة بعد. متطلبات ناقصة: ${(d.blockedBy??[]).join(', ')}`);const sb=d.record.storyboard;if(sb?.summary){$('summaryAr').value=sb.summary.ar??'';$('summaryEn').value=sb.summary.en??'';}if(Array.isArray(sb?.scenes)&&sb.scenes.length){storyScenes=clone(sb.scenes);storyManualEdits=clone(sb.manualEdits??[]);populateFormFromScene(storyScenes[0]);renderStoryScenes();}$('storyStatus').textContent=JSON.stringify(d,null,2);status(d.stale?'القصة قديمة؛ راجع المصدر والتفريغ قبل استخدامها.':'فُتحت القصة المحفوظة للمراجعة.');}catch(e){status(e.message,'bad');}}

$('runDirectorReview').onclick=async()=>{
 const epoch=projectEpoch;const button=$('runDirectorReview');
 try{const projectId=id();button.disabled=true;$('directorReviewResult').textContent='جارٍ فحص القصة المحفوظة والمصدر…';
  const result=await call('/api/analysis/director-review?id='+encodeURIComponent(projectId));assertCurrent(epoch);
  const box=$('directorReviewResult');box.replaceChildren();
  const add=(tag,text,parent=box)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
  add('p','مراجعة مساعدة للقصة المحفوظة: '+result.review.summary.scenes+' مشاهد · '+result.review.summary.error+' أخطاء · '+result.review.summary.warning+' تنبيهات. لم يتم تعديل الفيديو أو تسجيل موافقة.');
  if(!result.prerequisitesReady)add('p','متبقي قبل التنفيذ: '+result.blockedBy.map(x=>({brief_storyboard_not_accepted_or_stale:'مراجعة لوحة المرحلة الأولى',transcript_not_human_verified_or_stale:'مراجعة التفريغ الحالي',transcript_source_not_in_project:'تحديد المصدر الصحيح'}[x]??'مراجعة متطلبات المصدر')).join('، '));
  const motionLabel=x=>({'statement':'عنوان بسيط','source-focus':'تركيز على المادة','metric-count':'عداد رقم','data-bars':'أعمدة مقارنة','none':'بدون حركة'}[x]??x);
  for(const scene of result.review.scenes){const card=add('article','');add('h4','المشهد '+scene.sceneId+' · '+scene.startSeconds+'–'+scene.endSeconds+' ثانية',card);
   add('p','الحركة الحالية: '+motionLabel(scene.motion.current)+' · المقترحة: '+motionLabel(scene.motion.recommended),card);
   add('p','المادة: '+({present:'ملف المصدر موجود ومتحقق',unchecked:'تحتاج تحققًا',none:'لا توجد مادة إضافية', 'listed-missing':'مادة ناقصة مسجلة','claimed-missing':'الملف المشار إليه غير موجود'}[scene.assetState]??scene.assetState),card);
   add('p',scene.captionTimingMethod==='transcript-word-index'?'تقسيم الكابشن مرتبط بتوقيت كلمات مطابق.':scene.captionTimingMethod==='transcript-phrase-boundaries'?'تقسيم الكابشن مضبوط على حدود جمل التفريغ؛ لا يوجد ادعاء توقيت لكل كلمة.':'صفحات الكابشن مقترحة فقط؛ تحتاج ضبط توقيت الكلمات قبل التطبيق.',card);
   for(const page of scene.captionPages){const timing=Number.isFinite(page.startMs)?' · '+(page.startMs/1000).toFixed(3)+'–'+(page.endMs/1000).toFixed(3)+' ثانية':' · توقيت غير مثبت';add('p','صفحة '+(page.index+1)+timing+': '+page.lines.join(' / '),card);}
   if(scene.numericEvidence?.length)add('p','الأرقام المنطوقة: '+scene.numericEvidence.join('، ')+'؛ يلزم مراجعة معناها قبل رسم عداد أو مقارنة.',card);
   for(const issue of result.review.issues.filter(i=>i.sceneId===scene.sceneId))add('p',issue.message.ar,card);
  }
  if(result.handoff){add('h4','جاهزية تسليم المشاهد للتايملاين');add('p','خطة التسليم اجتازت فحص الحقول والتوقيت المحلي. دي خطة للمراجعة؛ الحركة والكابشن ما اتطبقوش تلقائيًا.');for(const check of result.handoff.checks)add('p',check.sceneId+' · '+check.pages+' صفحات · '+(check.timingReady?'توقيت الصفحات محدد':'التوقيت يحتاج ضبط')+' · '+(check.motionRequiresChange?'الحركة تحتاج تصحيحًا':'لا يوجد تنبيه بيانات للحركة'));for(const asset of result.handoff.unresolvedAssetRequests)add('p','طلب مادة لم يتم توفيرها: '+asset.sceneId+' · '+asset.description);}
  const timelineButton=add('button','فحص ربط التايملاين والعداد');const timelineStatus=add('p','');
  timelineButton.onclick=async()=>{try{timelineButton.disabled=true;const preview=await call('/api/analysis/timeline-preview?id='+encodeURIComponent(projectId));assertCurrent(epoch);const info=preview.receipt;timelineStatus.textContent='فُحص ربط '+info.markers.length+' مشاهد و'+info.captionCues+' مقاطع كابشن و'+info.existingLayersPreserved+' طبقات محفوظة. '+(preview.metricAlreadyPresent?(preview.placementChecked?'العداد موجود بالفعل ومكانه اجتاز فحص عينات الوجه؛ لم نضف نسخة مكررة.':'العداد موجود؛ موضعه يحتاج مراجعة.'):info.motion?'العداد من كلام المتحدث، ومكانه اجتاز فحص عينات الوجه.':'العداد لم يضف: '+(preview.metricBlocked??'لا توجد عبارة عمر واضحة مناسبة.'))+' لم يتغير المحرر؛ دي خطة معاينة مستقلة.';}catch(e){status(e.message,'bad');}finally{if(epoch===projectEpoch)timelineButton.disabled=false;}};
  add('h4','مصادر القواعد والملفات');
  for(const ref of result.references){const row=add('p',ref.id+' · '+(ref.filesVerified?'بصمات الملفات مطابقة':'ملفات المرجع تحتاج مراجعة')+' · ');const a=document.createElement('a');a.href=ref.repo;a.textContent='المستودع';a.target='_blank';a.rel='noopener noreferrer';row.append(a);for(const [index,file] of ref.files.entries()){const button=add('button','افتح '+file.file.split('/').at(-1),row);button.onclick=async()=>{try{const content=await call('/api/analysis/director-reference?id='+encodeURIComponent(ref.id)+'&index='+index);assertCurrent(epoch);let pre=row.querySelector?.('pre');if(!pre)pre=add('pre','',row);pre.textContent=content.content;}catch(e){status(e.message,'bad');}};}}
  status('اكتملت مراجعة المخرج للقصة المحفوظة. راجع التنبيهات قبل تعديل المسودة.','ok');
 }catch(e){if(epoch===projectEpoch)$('directorReviewResult').textContent=e.message;status(e.message,'bad');}finally{if(epoch===projectEpoch)button.disabled=false;}
};

$('reviewStory').onclick=async()=>{try{if(!story)await $('loadStory').onclick();if(!story?.record)throw Error('احفظ القصة وافتحها قبل تسجيل القرار.');if(!confirm('هل راجعت النسختين العربية والإنجليزية ومصدر المشهد وتوقيته؟'))return;const d=await call('/api/analysis/source-storyboard/review',{id:id(),decision:$('storyDecision').value,reviewedByHuman:true});$('storyStatus').textContent=JSON.stringify(d,null,2);status('سُجل قرار المراجعة البشري؛ هذا لا يشغّل المونتاج.','ok');}catch(e){status(e.message,'bad');}};
$('makeTimelinePlan').onclick=async()=>{const epoch=projectEpoch;try{if(!id())throw Error('اختر مشروعًا.');timelinePlan=await call('/api/phase3/storyboard-plan',{id:id(),language:$('timelineLanguage').value});$('timelinePlanResult').textContent=timelinePlan.operations.map(x=>x.label).concat(timelinePlan.unsupported.map(x=>'سيبقى يدويًا: '+x)).join('\n')+`\n\nمسودة: ${timelinePlan.workspace} · التنفيذ مسموح بعد موافقتك الصريحة فقط.`;$('executeTimelinePlan').disabled=false;status('أنشئت خطة عناوين للمراجعة. لم يُعدّل المحرر بعد.');}catch(e){if(epoch!==projectEpoch)return;timelinePlan=null;$('executeTimelinePlan').disabled=true;status(e.message,'bad');}};
$('executeTimelinePlan').onclick=async()=>{const epoch=projectEpoch;try{if(!timelinePlan||!id())throw Error('أنشئ الخطة وراجعها أولًا.');if(!confirm('هل توافق على إضافة عناوين الخطة إلى مسودة المرحلة الثالثة؟ الملف الأصلي سيبقى كما هو.'))return;const started=await call('/api/phase3/execute',{id:id(),prompt:timelinePlan.prompt,revision:timelinePlan.revision,approved:true});let done=null;for(let i=0;i<300;i++){await new Promise(resolve=>setTimeout(resolve,500));assertCurrent(epoch);done=await call(`/api/job?id=${encodeURIComponent(started.id)}`);status(`تطبيق الخطة في المسودة: ${done.status}`);if(done.status==='failed')throw Error(done.error??'فشل تنفيذ المسودة.');if(done.status==='done')break;}if(done?.status!=='done')throw Error('العملية ما زالت جارية؛ افتح التطبيق بعد قليل.');const editor=await call('/api/phase3/editor',{id:id()});$('openTimelineEditor').href=editor.url;$('openTimelineEditor').hidden=false;$('timelinePlanResult').textContent+=`\n\nتم الحفظ في مسودة مستقلة. العمليات: ${done.result.operations.map(x=>x.label).join('، ')}. لم يتغير الأصل.`;status('حُفظت العناوين في مسودة المرحلة الثالثة. افتح المحرر لمعاينة المسارات وحفظها.','ok');}catch(e){status(e.message,'bad');}};
for(const field of storyFields){const previous=$(field).oninput;$(field).oninput=()=>{previous?.();persistStory();};}
$('bRollNeeded').onchange=()=>persistStory();
list().catch(e=>status(e.message,'bad'));
})();
