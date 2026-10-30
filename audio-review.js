const $=id=>document.getElementById(id);
let selected=null,transcriptReqSeq=0;
async function api(route,data){
 const result=await fetch(route,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),value=await result.json();if(!result.ok)throw Error(value.error??'تعذّر الطلب المحلي.');return value;
}
let audioProjectSequence=0;
async function loadAudioProjects(){
 const ticket=++audioProjectSequence,control=$('audioProject'),previous=selected?.id;control.disabled=true;$('refreshAudioProjects').disabled=true;$('pageStatus').textContent='جارٍ تحميل المشاريع المحلية…';
 try{const data=await api('/api/projects');if(ticket!==audioProjectSequence)return;const projects=data.projects??[];control.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=projects.length?'اختار مشروعًا للمقارنة':'لا توجد مشاريع مستوردة؛ استخدم التجربة الصناعية';control.append(placeholder);for(const project of projects){const option=document.createElement('option');option.value=project.id;option.textContent=project.name||'مشروع محلي';control.append(option);}const current=projects.find(p=>p.id===previous);selected=current??null;control.value=current?.id??'';transcriptReqSeq++;control.onchange=()=>{selected=projects.find(p=>p.id===control.value)??null;transcriptReqSeq++;$('selectedProject').textContent=selected?'المشروع الحالي: '+selected.name:'تقدر تبدأ بتجربة الضوضاء الصناعية من غير اختيار مشروع.';};$('selectedProject').textContent=selected?'المشروع الحالي: '+selected.name:'تقدر تبدأ بتجربة الضوضاء الصناعية من غير اختيار مشروع.';$('pageStatus').textContent='المشاريع جاهزة. اختار مشروعًا أو ابدأ بالتجربة الصناعية.';document.dispatchEvent(new Event('change'));
 }catch{if(ticket===audioProjectSequence)$('pageStatus').textContent='تعذّر تحميل المشاريع. ارجع للاستوديو وافتح الجلسة الحالية، ثم جرّب تاني.';}
 finally{if(ticket===audioProjectSequence){control.disabled=false;$('refreshAudioProjects').disabled=false;}}
}
$('refreshAudioProjects').onclick=loadAudioProjects;
let soundContext=null;
$('completionSound').onclick=async()=>{
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');soundContext??=new Audio();await soundContext.resume();const oscillator=soundContext.createOscillator(),gain=soundContext.createGain(),now=soundContext.currentTime;oscillator.type='sine';oscillator.frequency.setValueAtTime(784,now);oscillator.frequency.setValueAtTime(1046.5,now+.16);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.12,now+.02);gain.gain.linearRampToValueAtTime(0,now+.4);oscillator.connect(gain);gain.connect(soundContext.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+.42);$('pageStatus').textContent='اتشغّل طلب صوت الإشعار. سماعه بيعتمد على صوت الجهاز والمتصفح.';}
 catch{$('pageStatus').textContent='المتصفح لم يسمح بالصوت. صوت إشعار نهاية الشغل بيتجرّب محليًا من الجهاز.';}
};
loadAudioProjects();
