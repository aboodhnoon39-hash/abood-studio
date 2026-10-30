(()=>{
 const card=document.createElement('section');card.className='card';card.id='stage1RealReview';
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 card.append(node('h2','مراجعة المرحلة الأولى — التسجيل الحقيقي'),node('p','نفس المرحلة الأولى. هذه اقتراحات مراجعة محلية؛ الكلام والمعنى غير معتمدين، والفيديو لا يتغيّر من هذه الشاشة.'));
 const open=node('button','افتح مرشحات المرحلة الأولى'),language=node('select');language.setAttribute('aria-label','لغة مرشح المراجعة');
 for(const [value,label] of [['ar','عربي'],['en','English'],['mixed','عربي + English']]){const o=node('option',label);o.value=value;language.append(o);}language.value='ar';language.disabled=true;
 const message=node('p','اختر مشروعًا وافتح المرشحات المحفوظة.'),content=node('div');message.setAttribute('role','status');card.append(open,language,message,content);$('analysisBriefCard').before(card);
 let state=null,projectID=null,selectionVersion=null,sequence=0;
 const stillSelected=()=>selected?.id===projectID&&transcriptReqSeq===selectionVersion;
 function render(){
  content.replaceChildren();if(!stillSelected()){message.textContent='اتغيّر المشروع أو التفريغ؛ افتح المرشحات من جديد.';return;}
  if(!state.available){message.textContent='لا توجد مرشحات مراجعة محفوظة لهذا المشروع.';return;}
  const variant=state.variants.find(v=>v.language===language.value);
  if(!variant?.valid||variant.stale){message.textContent='المرشح قديم أو غير صالح؛ راجع المصدر والنص والنسخة المحفوظة قبل استخدامه.';return;}
  message.textContent='مرشح للمراجعة فقط · '+state.sourceDuration+' ثانية · '+state.transcriptWords+' كلمة · لا اعتماد أو تنفيذ.';
  content.append(node('p',variant.storyboard.summary));
  for(const scene of variant.storyboard.scenes){const box=node('div');box.className='card';box.dir='auto';box.append(node('h3',scene.startSeconds+'–'+scene.endSeconds+' ثانية'),node('p',scene.editorialIntent),node('p',scene.visualProposal),node('p','استنتاج من مسودة غير معتمدة؛ يحتاج سماعًا ومراجعة.'));content.append(box);}
  content.append(node('h3','المعلومات التي لم تُحسم'));
  const arabicUnknown={'Creative brief field not specified: message':'الرسالة الأساسية لم تتحدد.','Creative brief field not specified: tone':'نبرة الفيديو لم تتحدد.','Creative brief field not specified: dialect':'اللهجة أو أسلوب الكلام لم يتحدد.','Creative brief field not specified: callToAction':'الطلب من المشاهد في النهاية لم يتحدد.','Actual wording, names and semantic scene boundaries remain unaccepted; ASR timing validity is not audio acceptance.':'الكلام الفعلي والأسماء وحدود المشاهد لسه محتاجة مراجعة بالسماع؛ سلامة التوقيت مش اعتماد للكلام.'};
  const list=node('ul');for(const item of variant.brief.evidence.filter(e=>e.kind==='unknown'))list.append(node('li',language.value==='ar'?(arabicUnknown[item.statement]??item.statement):item.statement));content.append(list);
 }
 open.onclick=async()=>{
  if(!selected){message.textContent='اختر مشروعًا أولًا.';return;}
  const id=selected.id,version=transcriptReqSeq,ticket=++sequence;content.replaceChildren();language.disabled=true;open.disabled=true;message.textContent='جارٍ التحقق من المصدر وبصمات المرشحات…';
  try{const result=await api('/api/analysis/real-review?id='+encodeURIComponent(id));if(ticket!==sequence)return;if(selected?.id!==id||transcriptReqSeq!==version){message.textContent='اتغيّر المشروع أو التفريغ؛ افتح المرشحات من جديد.';return;}state=result;projectID=id;selectionVersion=version;language.disabled=!result.available;render();}
  catch{if(ticket===sequence)message.textContent='تعذّر التحقق من مرشحات هذا المشروع؛ راجع المصدر والملفات المحفوظة.';}
  finally{if(ticket===sequence)open.disabled=false;}
 };
 language.onchange=render;
 document.addEventListener('click',()=>{if(projectID!==null&&!stillSelected()){content.replaceChildren();language.disabled=true;message.textContent='اتغيّر المشروع أو التفريغ؛ افتح المرشحات من جديد.';}});
})();
