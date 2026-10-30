(()=>{
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const card=node('section');card.id='deepFilterTools';card.className='card';
 const demo=node('button','جرّب تنقية ضوضاء صناعية'),prepare=node('button','جهّز مقارنة صوت المشروع قبل وبعد'),status=node('p','معاينة صوت مستقلة للمراجعة؛ صوت الفيديو لا يتغيّر.'),preview=node('div');status.setAttribute('role','status');
 card.append(node('h2','تنقية الصوت التجريبية'),node('p','DeepFilterNet · التنقية ممكن تؤثر على الكلام والسكتات. اسمع المقارنة وراجع الكلمات والنهاية؛ انخفاض الضوضاء وحده لا يثبت تحسّن الكلام.'),demo,prepare,status,preview);$('stage1RealReview').before(card);
 let sequence=0,contextProject=null,contextVersion=null;
 const dirty=()=>['textDirty','timingDirty'].some(k=>$('transcriptResult')?.dataset?.[k]==='true')||$('captionTranslation')?.dataset?.translationDirty==='true';
 function display(result,id){
  if(result.tool!=='deepfilternet'||result.applied!==false||result.humanQualityApproved!==false||!result.revision)throw Error('Invalid audio proof.');
  preview.replaceChildren();
  for(const [kind,label]of[['before','قبل التنقية'],['after','بعد التنقية — للمراجعة فقط']]){const audio=node('audio');audio.controls=true;audio.preload='metadata';audio.setAttribute('aria-label',label);audio.src='/api/tools/deepfilternet/preview-file?'+new URLSearchParams({revision:result.revision,kind,...(id?{id}:{})});preview.append(node('p',label),audio);}
 }
 async function start(synthetic){
  if(!synthetic&&(!selected||dirty())){status.textContent='اختار مشروعًا واحفظ تعديلات النص والتوقيت والترجمة الأول.';return;}
  const ticket=++sequence,id=synthetic?null:selected.id,version=transcriptReqSeq;contextProject=id;contextVersion=version;demo.disabled=true;prepare.disabled=true;clearAudio();status.textContent='جارٍ تجهيز المقارنة محليًا؛ صوت الفيديو محفوظ…';
  const current=()=>ticket===sequence&&(synthetic||selected?.id===id&&transcriptReqSeq===version&&!dirty());
  try{
   let result;
   if(synthetic)result=await api('/api/tools/deepfilternet/demo',{});
   else{const context=await api('/api/tools/deepfilternet/preview-context?id='+encodeURIComponent(id));if(!current())return;result=await api('/api/tools/deepfilternet/preview',{id,expectedManifestSHA256:context.expectedManifestSHA256,expectedSourceSHA256:context.expectedSourceSHA256});}
   if(!current())return;
   if(synthetic&&(result.syntheticOnly!==true||result.ownerContentUsed!==false))throw Error('Invalid synthetic result.');display(result,id);
   status.textContent=synthetic?'اكتملت تجربة الضوضاء الصناعية. ده فحص تشغيل؛ مش اعتماد لجودة الكلام.':'المقارنة جاهزة. اتأكد بالسماع من الكلمات والنهاية؛ لم نستبدل صوت الفيديو أو نعتمد النتيجة.';
  }catch{if(ticket===sequence)status.textContent='تعذّر تجهيز المقارنة. تأكد من المصدر، وحدّ المعاينة دقيقتين، ثم أعد فتح المشروع.';}
  finally{if(ticket===sequence){demo.disabled=false;prepare.disabled=false;if(!current())status.textContent='اتغيّر المشروع أو المسودة؛ جهّز المقارنة للنسخة الحالية من جديد.';}}
 }
 demo.onclick=()=>start(true);prepare.onclick=()=>start(false);
 function clearAudio(){for(const child of preview.children){if(child.tagName==='AUDIO'){child.pause();child.removeAttribute('src');child.load();}}preview.replaceChildren();}
 function selectionChanged(){
  if(contextProject!==null&&(selected?.id!==contextProject||transcriptReqSeq!==contextVersion)){sequence++;contextProject=null;contextVersion=null;clearAudio();demo.disabled=false;prepare.disabled=false;status.textContent='اتغيّر المشروع أو المسودة؛ جهّز المقارنة للنسخة الحالية من جديد.';}
 }
 document.addEventListener('click',selectionChanged);document.addEventListener('change',selectionChanged);
})();
