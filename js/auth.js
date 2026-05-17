// عبد سيف — Auth UI (sign in / sign up + account panel)
import { el } from './utils.js';
import { icon } from './icons.js';
import { t, getLang } from './i18n.js';
import { modal, toast, input, field } from './ui.js';
import { configureCloud, clearCloudConfig, getCloudState, signIn, signUp, signOut, pullAndMerge, pushAllLocal, onCloudChange } from './cloud.js';

const L=(a,e)=>(getLang()==='ar'?a:e);

export function openCloudConfigModal(onDone){
  const urlI=input({placeholder:'https://xxxx.supabase.co'}), keyI=input({placeholder:'anon key'});
  const m=modal({title:L('إعداد المزامنة السحابية','Cloud sync setup'),body:el('div',{class:'col gap-12'},el('p',{class:'text-sm text-muted'},L('أدخل بيانات مشروع Supabase. Settings → API.','Enter Supabase credentials from Settings → API.')),field('Supabase URL',urlI),field('Anon/Publishable Key',keyI)),footer:[el('button',{class:'btn',onClick:()=>m.close()},t('cancel')),el('button',{class:'btn btn--primary',onClick:()=>{try{configureCloud({url:urlI.value.trim(),anonKey:keyI.value.trim()});toast(L('تم حفظ الإعدادات','Saved'),'success');m.close();onDone&&onDone();}catch(e){toast(e.message,'error');}}},t('save'))]});
}

export function openAuthModal({initialMode='signin',onDone}={}){
  let mode=initialMode;
  const emailI=input({type:'email',placeholder:L('بريدك','email')}), passI=input({type:'password',placeholder:L('كلمة السر','password')});
  const errEl=el('div',{class:'text-sm',style:{color:'var(--danger)',minHeight:'20px'}});
  const submitBtn=el('button',{class:'btn btn--primary btn--block'});
  const switchBtn=el('button',{class:'btn btn--ghost btn--block'});
  const bodyEl=el('div',{class:'col gap-12'});
  const render=()=>{bodyEl.innerHTML='';submitBtn.textContent=mode==='signin'?L('دخول','Sign in'):L('إنشاء حساب','Sign up');switchBtn.textContent=mode==='signin'?L('إنشاء حساب جديد','Create account'):L('عندي حساب','I have an account');bodyEl.append(field(L('البريد','Email'),emailI),field(L('كلمة السر','Password'),passI),errEl,submitBtn,switchBtn);};
  switchBtn.onclick=()=>{mode=mode==='signin'?'signup':'signin';render();};
  submitBtn.onclick=async()=>{errEl.textContent='';const email=emailI.value.trim(),pass=passI.value;if(!email||!pass){errEl.textContent=L('عبّي كل الحقول','Fill all fields');return;}submitBtn.disabled=true;submitBtn.textContent=L('جاري...','Working...');try{if(mode==='signin')await signIn(email,pass);else{const d=await signUp(email,pass);if(!d?.access_token){toast(L('تحقق من بريدك','Check email to confirm'),'info',6000);}else await pushAllLocal().catch(()=>{});}toast(L('أهلاً!','Welcome!'),'success');m.close();onDone&&onDone();}catch(e){errEl.textContent=e.message;}finally{submitBtn.disabled=false;render();}};
  const m=modal({title:el('span',{},mode==='signin'?L('تسجيل الدخول','Sign in'):L('إنشاء حساب','Create account')),body:bodyEl,footer:null});render();setTimeout(()=>emailI.focus(),100);
}

export function buildAccountPanel(rerender){
  const panel=el('div',{class:'glass panel'});const cs=getCloudState();
  panel.appendChild(el('h3',{class:'panel__title',style:{marginBottom:'14px'}},[el('span',{html:icon('users')}),el('span',{},L('الحساب والمزامنة','Account & sync'))]));
  const dot=c=>el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',display:'inline-block',background:c,marginInlineEnd:'8px'}});
  const sr=el('div',{class:'col gap-8',style:{marginBottom:'14px'}});
  if(!cs.configured){sr.append(el('div',{class:'row align-center'},dot('#888'),el('span',{},L('السحابة غير مُعدّة','Cloud not configured'))),el('button',{class:'btn btn--primary',onClick:()=>openCloudConfigModal(rerender)},L('إعداد المزامنة','Set up sync')));}
  else if(!cs.signedIn){sr.append(el('div',{class:'row align-center'},dot('#f5a524'),el('span',{},L('جاهز — سجل دخول','Ready — sign in'))),el('div',{class:'row gap-8 flex-wrap'},el('button',{class:'btn btn--primary',onClick:()=>openAuthModal({initialMode:'signin',onDone:rerender})},L('دخول','Sign in')),el('button',{class:'btn',onClick:()=>openAuthModal({initialMode:'signup',onDone:rerender})},L('حساب جديد','Sign up')),el('button',{class:'btn btn--ghost',onClick:()=>{clearCloudConfig();rerender&&rerender();}},L('تغيير','Change'))));}
  else{sr.append(el('div',{class:'row align-center'},dot('#22c55e'),el('span',{},L('متصل ومتزامن','Signed in & syncing'))),el('div',{class:'text-sm text-muted'},cs.user.email||cs.user.id),cs.lastSync?el('div',{class:'text-sm text-muted'},L('آخر مزامنة: ','Last sync: ')+new Date(cs.lastSync).toLocaleString()):null,el('div',{class:'row gap-8 flex-wrap',style:{marginTop:'8px'}},el('button',{class:'btn',onClick:async()=>{try{const{applied}=await pullAndMerge();toast(L(`مزامنة (${applied})`,'Synced'),'success');rerender&&rerender();}catch(e){toast(e.message,'error');}}},L('مزامنة الآن','Sync now')),el('button',{class:'btn',onClick:async()=>{try{const n=await pushAllLocal();toast(L(`رُفع ${n}`,'Uploaded'),'success');}catch(e){toast(e.message,'error');}}},L('رفع الكل','Upload all')),el('button',{class:'btn btn--danger',onClick:async()=>{await signOut();toast(L('تم الخروج','Signed out'));rerender&&rerender();}},L('خروج','Sign out'))));}
  panel.appendChild(sr);return panel;
}
