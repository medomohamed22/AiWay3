const $=s=>document.querySelector(s),chat=$('#chat'),promptEl=$('#prompt'),sendBtn=$('#sendBtn'),preview=$('#preview'),jumpBottom=$('#jumpBottom');
const STORE='aiway_chats_v4',MODEL_KEY='aiway_model_v4',COINS_KEY='aiway_coins_v1',PI_USER_KEY='aiway_pi_username';
const MAX_FILE_BYTES=8*1024*1024,MAX_FILES=6,ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/csv']);
const icon=(brand)=>({
 openai:`<svg class="brand-icon" viewBox="0 0 24 24"><path d="M12 3a4.5 4.5 0 0 1 4.3 3.2A4.5 4.5 0 0 1 19 13.9a4.5 4.5 0 0 1-6.9 5.3A4.5 4.5 0 0 1 4.7 16 4.5 4.5 0 0 1 5 8.1 4.5 4.5 0 0 1 12 3Z"/><path d="m8.2 8.4 7.6 4.4M8.2 15.6l7.6-4.4M12 7.4v9.2"/></svg>`,
 anthropic:`<svg class="brand-icon" viewBox="0 0 24 24"><path d="m5 19 7-14 7 14M8.2 13h7.6"/></svg>`,
 google:`<svg class="brand-icon google-mark" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 8.7 11.4H12v-4h12c.1.5.1 1 .1 1.6A12 12 0 1 1 12 0c3.2 0 5.9 1.2 8 3.1l-2.8 2.8A7.5 7.5 0 0 0 12 3Z"/></svg>`,
 deepseek:`<svg class="brand-icon" viewBox="0 0 24 24"><path d="M4 13c2.5-5.7 8.6-7.7 16-4.7-1.5 6.8-6.8 10.6-13.6 8.8L4 20v-7Z"/><circle cx="15.5" cy="10.5" r="1"/><path d="M8 15c2 .7 4.2.6 6.2-.4"/></svg>`
}[brand]);
const MODELS=[
 {id:'openai/gpt-5.6-sol',name:'GPT-5.6 Sol',brand:'openai',company:'OpenAI',cost:4},
 {id:'anthropic/claude-fable-5',name:'Claude Fable 5',brand:'anthropic',company:'Anthropic',cost:5},
 {id:'google/gemini-3.5-flash',name:'Gemini 3.5 Flash',brand:'google',company:'Google',cost:2},
 {id:'deepseek/deepseek-chat',name:'DeepSeek V3',brand:'deepseek',company:'DeepSeek',cost:1}
];
let activeId=null,pending=[],generating=false,controller=null,userPinnedToBottom=true,currentModel=MODELS.find(m=>m.id===localStorage.getItem(MODEL_KEY))||MODELS[2];
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),chats=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return[]}},save=v=>localStorage.setItem(STORE,JSON.stringify(v));
const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const coins=()=>Number(localStorage.getItem(COINS_KEY)??10);function setCoins(v){v=Math.max(0,Math.floor(v));localStorage.setItem(COINS_KEY,String(v));$('#coinsCount').textContent=v;$('#modalCoins').textContent=v}
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2200)}
function md(s=''){const b=[];s=s.replace(/```([\w+-]*)\n?([\s\S]*?)```/g,(_,l,c)=>{const k=`@@${b.length}@@`;b.push(`<div class="code"><div class="code-head"><span>${esc(l||'code')}</span><button class="copyCode">نسخ</button></div><pre><code>${esc(c.trim())}</code></pre></div>`);return k});let o=esc(s).replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`\n]+)`/g,'<code class="inline">$1</code>');let h='',list='';for(const line of o.split('\n')){let m=line.match(/^\s*[-*] (.+)$/);if(m){if(list!=='ul'){if(list)h+=`</${list}>`;h+='<ul>';list='ul'}h+=`<li>${m[1]}</li>`;continue}m=line.match(/^\s*\d+\. (.+)$/);if(m){if(list!=='ol'){if(list)h+=`</${list}>`;h+='<ol>';list='ol'}h+=`<li>${m[1]}</li>`;continue}if(list){h+=`</${list}>`;list=''}if(!line.trim())continue;h+=/^<h/.test(line)?line:`<p>${line}</p>`}if(list)h+=`</${list}>`;b.forEach((x,i)=>h=h.replace(`@@${i}@@`,x));return h}
function getActive(){return chats().find(c=>c.id===activeId)}function ensure(){if(getActive())return;const a=chats(),c={id:uid(),title:'محادثة جديدة',time:Date.now(),messages:[]};a.push(c);save(a);activeId=c.id}function mutate(fn){const a=chats(),i=a.findIndex(c=>c.id===activeId);if(i<0)return;fn(a[i]);a[i].time=Date.now();save(a);renderHistory()}function format(t){return new Intl.DateTimeFormat('ar-EG',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t))}
function renderModelPicker(){const menu=$('#modelMenu');menu.innerHTML=MODELS.map(m=>`<button class="model-option ${m.id===currentModel.id?'active':''}" data-model="${m.id}" role="option"><span class="model-brand">${icon(m.brand)}</span><span class="model-copy"><b>${m.name}</b><small>${m.company} • ${m.cost} كوين للمحاولة</small></span><span class="check">✓</span></button>`).join('');$('#selectedModelIcon').innerHTML=icon(currentModel.brand);$('#selectedModelName').textContent=currentModel.name;$('#costNote').textContent=`تكلفة المحاولة بالنموذج الحالي: ${currentModel.cost} كوين`;menu.querySelectorAll('[data-model]').forEach(btn=>btn.onclick=()=>{currentModel=MODELS.find(m=>m.id===btn.dataset.model);localStorage.setItem(MODEL_KEY,currentModel.id);renderModelPicker();closeModelMenu()})}
function closeModelMenu(){$('#modelMenu').classList.remove('open');$('#modelTrigger').setAttribute('aria-expanded','false')}
function welcome(){chat.innerHTML=`<div class="welcome"><div class="welcome-inner"><div class="orb">✦</div><h1>أهلًا بك في AiWay</h1><p>اختر النموذج المناسب وابدأ المحادثة.</p><div class="quick"><button data-q="لخّص لي هذا الموضوع: ">تلخيص</button><button data-q="اكتب لي كود احترافي لـ ">برمجة</button><button data-q="اشرح لي ببساطة: ">شرح مبسط</button></div></div></div>`;chat.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{promptEl.value=b.dataset.q;promptEl.focus()});updateJump()}
const copyButton=()=>`<button class="copy-message" data-copy aria-label="نسخ الرسالة"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>نسخ</span></button>`;
function bindMessage(e,m){e.querySelector('[data-copy]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(m.text);toast('تم النسخ')});e.querySelectorAll('.copyCode').forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.closest('.code').querySelector('code').innerText);toast('تم نسخ الكود')})}
function renderMessage(m,stream=false){const e=document.createElement('article');e.className=`message ${m.role==='user'?'user':'assistant'}`;const at=(m.files||[]).map(f=>f.type.startsWith('image/')?`<img src="${f.data}" alt="${esc(f.name)}">`:`<span class="file-chip">📄 ${esc(f.name)}</span>`).join('');e.innerHTML=`<div class="avatar">${m.role==='user'?'أنت':'AI'}</div><div class="bubble"><div class="meta">${m.role==='user'?'أنت':esc(m.modelName||currentModel.name)} • ${format(m.time)}</div>${at?`<div class="attachments">${at}</div>`:''}<div class="content">${stream?'<p>جاري بدء الرد…</p>':md(m.text)}</div>${stream?'':`<div class="msg-actions">${copyButton()}</div>`}</div>`;chat.appendChild(e);bindMessage(e,m);return e}
function render(){const c=getActive();if(!c?.messages.length)return welcome();chat.innerHTML='';c.messages.forEach(m=>renderMessage(m));requestAnimationFrame(()=>scrollBottom(false))}
function renderHistory(){const q=$('#historySearch').value.trim().toLowerCase();let a=chats().sort((x,y)=>y.time-x.time);if(q)a=a.filter(c=>(c.title+' '+c.messages.map(m=>m.text).join(' ')).toLowerCase().includes(q));$('#history').innerHTML='';a.forEach(c=>{const r=document.createElement('div');r.className='hist';r.innerHTML=`<button class="hist-main ${c.id===activeId?'active':''}"><div class="hist-title">${esc(c.title)}</div><div class="hist-date">${format(c.time)}</div></button><button class="hist-del" title="حذف"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg></button>`;r.querySelector('.hist-main').onclick=()=>{activeId=c.id;render();renderHistory();closeSide()};r.querySelector('.hist-del').onclick=()=>{if(!confirm('حذف المحادثة؟'))return;const z=chats().filter(x=>x.id!==c.id);save(z);if(activeId===c.id)activeId=z[0]?.id||null;ensure();render();renderHistory()};$('#history').appendChild(r)})}
function renderPreview(){preview.innerHTML='';pending.forEach((f,i)=>{const d=document.createElement('div');d.className='preview-item';d.innerHTML=`${f.type.startsWith('image/')?`<img src="${f.data}">`:'<div class="file-preview-icon">PDF</div>'}<span>${esc(f.name)}</span><button>×</button>`;d.querySelector('button').onclick=()=>{pending.splice(i,1);renderPreview()};preview.appendChild(d)})}
async function readFiles(files){for(const f of [...files].slice(0,MAX_FILES-pending.length)){if(!ALLOWED.has(f.type)){toast(`نوع غير مدعوم: ${f.name}`);continue}if(f.size>MAX_FILE_BYTES){toast(`الملف أكبر من 8MB: ${f.name}`);continue}if(['text/plain','text/csv'].includes(f.type)){pending.push({name:f.name,type:'text/plain',text:(await f.text()).slice(0,100000)})}else{const data=await new Promise((r,j)=>{const x=new FileReader;x.onload=()=>r(x.result);x.onerror=j;x.readAsDataURL(f)});pending.push({name:f.name,type:f.type,data})}}renderPreview()}
function serialize(ms){return ms.map(m=>({role:m.role,text:m.text+(m.files||[]).filter(f=>f.type==='text/plain').map(f=>`\n\n--- محتوى الملف ${f.name} ---\n${f.text||''}`).join(''),files:(m.files||[]).filter(f=>f.type!=='text/plain')}))}
function nearBottom(){return chat.scrollHeight-chat.scrollTop-chat.clientHeight<110}function updateJump(){userPinnedToBottom=nearBottom();jumpBottom.classList.toggle('show',!userPinnedToBottom&&chat.scrollHeight>chat.clientHeight+100)}function scrollBottom(smooth=true){chat.scrollTo({top:chat.scrollHeight,behavior:smooth?'smooth':'auto'});userPinnedToBottom=true;updateJump()}
async function generate(cost){
  generating=true;
  sendBtn.classList.add('stop');
  sendBtn.querySelector('span').textContent='إيقاف';
  controller=new AbortController();
  const draft={id:uid(),role:'assistant',text:'',time:Date.now(),modelName:currentModel.name};
  const e=renderMessage(draft,true),content=e.querySelector('.content');
  let full='',buf='',frameId=0,finished=false;
  const paint=()=>{
    frameId=0;
    if(finished)return;
    content.innerHTML=md(full)+'<span class="stream-caret" aria-hidden="true"></span>';
    if(userPinnedToBottom)scrollBottom(false);else updateJump();
  };
  try{
    const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model:currentModel.id,messages:serialize(getActive().messages)})});
    if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||`خطأ ${res.status}`)}
    const rd=res.body.getReader(),dec=new TextDecoder();
    while(true){
      const{done,value}=await rd.read();
      if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split(/\r?\n/);buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data:'))continue;
        const raw=line.slice(5).trim();
        if(!raw||raw==='[DONE]')continue;
        try{
          const j=JSON.parse(raw),t=j.choices?.[0]?.delta?.content;
          if(typeof t==='string'){
            full+=t;
            if(!frameId)frameId=requestAnimationFrame(paint);
          }
        }catch{}
      }
    }
    if(!full)throw new Error('لم يصل رد نصي من النموذج.');
    finished=true;
    if(frameId)cancelAnimationFrame(frameId);
    draft.text=full;
    mutate(c=>c.messages.push(draft));
    content.innerHTML=md(full);
    e.querySelector('.bubble').insertAdjacentHTML('beforeend',`<div class="msg-actions">${copyButton()}</div>`);
    bindMessage(e,draft);
  }catch(err){
    finished=true;
    if(frameId)cancelAnimationFrame(frameId);
    setCoins(coins()+cost);
    if(err.name==='AbortError')e.remove();
    else content.innerHTML=`<p style="color:var(--danger)">${esc(err.message)}</p>`;
  }finally{
    generating=false;controller=null;
    sendBtn.classList.remove('stop');
    sendBtn.querySelector('span').textContent='إرسال';
    updateJump();
  }
}
async function send(){if(generating){controller?.abort();return}if(!promptEl.value.trim()&&!pending.length)return;if(coins()<currentModel.cost){openModal('coinsModal');toast('الرصيد غير كافٍ لهذا النموذج');return}ensure();const cost=currentModel.cost;const text=promptEl.value.trim()||'حلّل الملفات المرفقة.';const m={id:uid(),role:'user',text,files:[...pending],time:Date.now()};mutate(c=>{c.messages.push(m);if(c.messages.length===1)c.title=text.slice(0,45)});setCoins(coins()-cost);promptEl.value='';promptEl.style.height='auto';pending=[];renderPreview();render();userPinnedToBottom=true;await generate(cost)}
function openModal(id){closeSide();document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));const modal=$('#'+id);if(!modal)return;document.body.appendChild(modal);modal.classList.add('open');$('#overlay').classList.add('show');document.body.classList.add('modal-open');requestAnimationFrame(()=>modal.querySelector('button, [tabindex], input')?.focus())}function closeModal(){document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));$('#overlay').classList.remove('show');document.body.classList.remove('modal-open')}function closeSide(){$('#sidebar').classList.remove('open');$('#drawerOverlay').classList.remove('show')}
function renderCosts(){$('#costList').innerHTML=MODELS.map(m=>`<div class="cost-row"><span class="model-brand">${icon(m.brand)}</span><span>${m.name}</span><b>${m.cost} كوين</b></div>`).join('')}
function setPiUser(user={}){
  const clean=String(user.username||'').trim();
  const wallet=String(user.walletAddress||user.wallet_address||'').trim();
  const scopes=Array.isArray(user.scopes)?user.scopes:[];
  if(clean)localStorage.setItem(PI_USER_KEY,clean);else localStorage.removeItem(PI_USER_KEY);
  if(user.uid)localStorage.setItem('aiway_pi_uid',String(user.uid));
  if(wallet)localStorage.setItem('aiway_pi_wallet',wallet);
  localStorage.setItem('aiway_pi_scopes',JSON.stringify(scopes));
  const label=$('#loginLabel');
  label.textContent=clean||'دخول';
  $('#loginBtn').classList.toggle('signed-in',Boolean(clean));
  $('#loginBtn').title=clean?`مسجل باسم ${clean}`:'تسجيل الدخول بحساب Pi';
  $('#piAccountCard').hidden=!clean;
  $('#piAccountName').textContent=clean?`@${clean}`:'—';
  $('#piWalletAddress').textContent=wallet||'عنوان المحفظة غير متاح؛ وافق على الصلاحية من Pi Browser';
  $('#piPaymentsStatus').textContent=`صلاحية المدفوعات: ${scopes.includes('payments')?'مفعلة':'غير مفعلة'}`;
}

let piInitialized=false,loginBusy=false,piAuth=null;
function waitForPi(timeout=8000){
  return new Promise((resolve,reject)=>{
    if(window.Pi)return resolve(window.Pi);
    const started=Date.now();
    const timer=setInterval(()=>{
      if(window.Pi){clearInterval(timer);resolve(window.Pi)}
      else if(Date.now()-started>=timeout){clearInterval(timer);reject(new Error('تعذر تحميل Pi SDK. افتح الموقع داخل Pi Browser وحدّث الصفحة.'))}
    },100);
  });
}
async function initPi(){
  const Pi=await waitForPi();
  if(!piInitialized){Pi.init({version:'2.0',sandbox:false});piInitialized=true}
  return Pi;
}
async function verifyPiToken(accessToken){
  const response=await fetch('/api/pi-me',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({accessToken})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'تعذر التحقق من حساب Pi');
  return data;
}
async function paymentRequest(action,paymentId,txid){
  const response=await fetch('/api/pi-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,paymentId,txid})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'تعذر تنفيذ عملية Pi');
  return data;
}
async function completeIncompletePayment(payment){
  if(payment?.identifier&&payment?.transaction?.txid){
    const completed=await paymentRequest('complete',payment.identifier,payment.transaction.txid);
    creditCompletedPayment(completed);
    toast('تم استكمال دفعة Pi المعلقة');
  }
}
function creditCompletedPayment(payment){
  if(!payment?.status?.developer_completed||!payment?.status?.transaction_verified)return false;
  const credit=Number(payment.metadata?.credit),allowed=new Set([25,70,160]);
  if(!allowed.has(credit))return false;
  const receiptKey=`aiway_pi_payment_${payment.identifier}`;
  if(!localStorage.getItem(receiptKey)){setCoins(coins()+credit);localStorage.setItem(receiptKey,'1')}
  return true;
}
async function authenticatePi(Pi){
  const auth=await Pi.authenticate(['username','payments','wallet_address'],completeIncompletePayment);
  if(!auth?.accessToken)throw new Error('لم يصل رمز الدخول من Pi.');
  const verified=await verifyPiToken(auth.accessToken);
  piAuth={...auth,user:{...auth.user,...verified,walletAddress:auth.user?.wallet_address||verified.walletAddress||''}};
  sessionStorage.setItem('aiway_pi_access_token',auth.accessToken);
  setPiUser(piAuth.user);
  return piAuth;
}
async function loginWithPi(){
  if(loginBusy)return;
  loginBusy=true;
  const btn=$('#loginBtn'),oldLabel=$('#loginLabel').textContent;
  btn.disabled=true;$('#loginLabel').textContent='جاري الدخول…';
  try{
    const Pi=await initPi();
    const auth=await authenticatePi(Pi);
    toast(`أهلًا ${auth.user.username}`);
  }catch(error){
    console.error('Pi login error',error);
    const message=String(error?.message||'تعذر تسجيل الدخول بحساب Pi');
    toast(message==='Authentication failed'
      ? 'راجع توثيق النطاق ورابط التطبيق داخل Pi Developer Portal.'
      : message);
  }finally{
    loginBusy=false;btn.disabled=false;
    if(!localStorage.getItem(PI_USER_KEY))$('#loginLabel').textContent=oldLabel==='جاري الدخول…'?'دخول':oldLabel;
  }
}
async function buyWithPi(button){
  if(button.disabled)return;
  button.disabled=true;
  try{
    const Pi=await initPi();
    if(!piAuth)await authenticatePi(Pi);
    const amount=Number(button.dataset.pi),credit=Number(button.dataset.add),orderId=uid();
    await new Promise((resolve,reject)=>Pi.createPayment({amount,memo:`شراء ${credit} كوين من AiWay`,metadata:{orderId,credit}}, {
      onReadyForServerApproval:paymentId=>paymentRequest('approve',paymentId).catch(error=>{
        console.error('Pi approval failed; SDK may retry',error);toast('تعذر اعتماد الدفعة، تجري إعادة المحاولة…');
      }),
      onReadyForServerCompletion:(paymentId,txid)=>paymentRequest('complete',paymentId,txid).then(payment=>{
        if(!creditCompletedPayment(payment))return reject(new Error('لم يتم التحقق من دفعة Pi.'));
        resolve();
      }).catch(error=>{console.error('Pi completion failed; SDK may retry',error)}),
      onCancel:()=>reject(new Error('تم إلغاء الدفع.')),
      onError:error=>reject(error)
    }));
    closeModal();toast('تم الدفع وإضافة الكوينز بنجاح');
  }catch(error){console.error(error);toast(error?.message||'تعذر إتمام الدفع عبر Pi')}
  finally{button.disabled=false}
}
chat.addEventListener('scroll',updateJump,{passive:true});jumpBottom.onclick=()=>scrollBottom(true);$('#modelTrigger').onclick=e=>{e.stopPropagation();const open=$('#modelMenu').classList.toggle('open');$('#modelTrigger').setAttribute('aria-expanded',String(open))};document.addEventListener('click',closeModelMenu);$('#modelPicker').onclick=e=>e.stopPropagation();$('#coinsBtn').onclick=()=>openModal('coinsModal');$('#loginBtn').onclick=loginWithPi;$('#menuBtn').onclick=()=>{$('#sidebar').classList.add('open');$('#drawerOverlay').classList.add('show')};$('#closeSide').onclick=closeSide;$('#drawerOverlay').onclick=closeSide;$('#overlay').onclick=closeModal;document.querySelectorAll('.closeModal').forEach(b=>b.onclick=closeModal);document.querySelectorAll('.package').forEach(b=>b.onclick=()=>buyWithPi(b));$('#newChat').onclick=()=>{activeId=null;ensure();render();renderHistory();closeSide()};$('#historySearch').oninput=renderHistory;sendBtn.onclick=send;promptEl.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};promptEl.oninput=()=>{promptEl.style.height='auto';promptEl.style.height=Math.min(promptEl.scrollHeight,130)+'px'};$('#fileBtn').onclick=()=>$('#fileInput').click();$('#cameraBtn').onclick=()=>$('#cameraInput').click();$('#fileInput').onchange=e=>{readFiles(e.target.files);e.target.value=''};$('#cameraInput').onchange=e=>{readFiles(e.target.files);e.target.value=''};
setPiUser({username:localStorage.getItem(PI_USER_KEY)||'',uid:localStorage.getItem('aiway_pi_uid')||'',walletAddress:localStorage.getItem('aiway_pi_wallet')||'',scopes:JSON.parse(localStorage.getItem('aiway_pi_scopes')||'[]')});
initPi().catch(()=>{});
if(localStorage.getItem(COINS_KEY)===null)localStorage.setItem(COINS_KEY,'10');setCoins(coins());renderModelPicker();renderCosts();const all=chats();activeId=all.sort((a,b)=>b.time-a.time)[0]?.id||null;ensure();renderHistory();render();
