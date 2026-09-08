const STORAGE = 'payrise-planner-v1';
const euroFmt = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const numFmt = new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
let state = load() || {members:[], budget:0, distributionMode:'amount', scenarios:[]};
let privacyMode=Boolean(state.budget||state.members?.some(member=>Number(member.salary)||Number(member.increase))||state.scenarios?.length);
const privacyMasks=new Map();
state.scenarios=Array.isArray(state.scenarios)?state.scenarios:[];
state.scenarios.forEach((scenario,index)=>{if(typeof scenario.name!=='string'||!scenario.name.trim())scenario.name=`Scenario ${state.scenarios.length-index}`});
// Query within a freshly cloned template when a root is supplied; otherwise
// query the page. This keeps new member cards fully wired before insertion.
const $ = (selector, root = document) => root.querySelector(selector);
const round = n => Math.round((Number(n)||0)*100)/100;
function parse(value){ return Number(String(value||'').trim().replace(/\./g,'').replace(',','.')) || 0; }
function scramble(value){const source=String(value);const numericKey=String(parse(source.replace(/[^\d,.-]/g,'')));const greek=[...'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'];const randomLetter=()=>greek[Math.floor(Math.random()*greek.length)];const digits=source.match(/\d/g)||[];const tokenCount=Math.max(digits.length<=7?digits.length:7,1);const tokens=privacyMasks.get(numericKey)||Array.from({length:tokenCount},randomLetter);privacyMasks.set(numericKey,tokens);if(digits.length<=7){let index=0;return source.replace(/\d/g,()=>tokens[index++%tokens.length]);}return `${tokens[0]}${tokens[1]}.${tokens[2]}${tokens[3]}${tokens[4]},${tokens[5]}${tokens[6]}${source.includes('€')?' €':''}`;}
function money(n){const value=euroFmt.format(round(n));return privacyMode?scramble(value):value;} function pct(n){return numFmt.format(n)+' %';}
function setAmountInput(input,value,{numeric=false,decimals=2}={}){const visible=Number(value||0).toLocaleString('de-DE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});if(privacyMode){input.type='text';input.readOnly=true;input.value=scramble(visible)}else{input.type=numeric?'number':'text';input.readOnly=false;input.value=numeric?String(round(value)):visible;}}
function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now()+Math.random().toString(16).slice(2);}
function nonNegative(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,round(n)):0;}
function cleanMembers(members,{ids=false,redistribute=false,budget=0,distributionMode='amount'}={}){
  const safeBudget=nonNegative(budget); let left=safeBudget;
  const cleaned=(Array.isArray(members)?members:[]).map(m=>({id:ids?(m?.id||uid()):m?.id,name:typeof m?.name==='string'?m.name:'Unnamed',salary:nonNegative(m?.salary),increase:nonNegative(m?.increase),locked:Boolean(m?.locked),included:m?.included!==false}));
  // Locks represent committed amounts, so retain them first. If a file exceeds
  // the budget, cap later values rather than showing an invalid total.
  [...cleaned.filter(m=>m.locked),...cleaned.filter(m=>!m.locked)].forEach(member=>{member.increase=round(Math.min(member.increase,left));left=round(left-member.increase)});
  if(redistribute){
    const fixed=cleaned.filter(m=>m.locked).reduce((sum,m)=>sum+m.increase,0);
    const open=cleaned.filter(m=>!m.locked && m.salary>0); const pool=round(Math.max(0,safeBudget-fixed));
    const salaryBasis=open.reduce((sum,m)=>sum+m.salary,0);
    open.forEach((m,i)=>{const share=distributionMode==='percentage'&&salaryBasis?pool*m.salary/salaryBasis:pool/open.length;m.increase=round(i===open.length-1?pool-open.slice(0,-1).reduce((sum,person)=>sum+person.increase,0):share)});
    cleaned.filter(m=>!m.locked && !m.salary).forEach(m=>m.increase=0);
  }
  return cleaned;
}
function normalizeImported(imported){
  const budget=nonNegative(imported.budget);
  const distributionMode=imported.distributionMode==='percentage'?'percentage':'amount';
  return {members:cleanMembers(imported.members,{ids:true,redistribute:true,budget,distributionMode}),budget,distributionMode,scenarios:imported.scenarios.map((s,index)=>{
    const scenarioBudget=nonNegative(s?.budget);
    return {name:typeof s?.name==='string'&&s.name.trim()?s.name:`Scenario ${imported.scenarios.length-index}`,savedAt:Number.isFinite(Number(s?.savedAt))?Number(s.savedAt):Date.now(),budget:scenarioBudget,distributionMode:s?.distributionMode==='percentage'?'percentage':'amount',members:cleanMembers(s?.members,{ids:true,budget:scenarioBudget})};
  })};
}
function active(){return state.members.filter(m=>!m.locked && m.salary>0);}
function allocated(){return round(state.members.reduce((a,m)=>a+m.increase,0));}
function remaining(){return Math.max(0,round(state.budget-allocated()));}
// Missing `included` is treated as true, preserving the expected default for
// plans saved before this checkbox was introduced.
function applicableSalary(){return state.members.filter(m=>m.included!==false&&m.salary>0).reduce((a,m)=>a+m.salary,0);}
function totalSalary(){return state.members.reduce((sum,m)=>sum+m.salary,0);}
function paintSlider(slider,increase,availableEuro){
  const scale=state.budget||1;
  slider.style.setProperty('--slider-value',`${Math.min(100,Math.max(0,increase/scale*100))}%`);
  slider.style.setProperty('--unavailable-start',`${Math.min(100,Math.max(0,availableEuro/scale*100))}%`);
}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state));}
function load(){try{return JSON.parse(localStorage.getItem(STORAGE));}catch{return null}}
function distribute(){
  const open=active(); const fixed=state.members.filter(m=>m.locked).reduce((a,m)=>a+m.increase,0);
  const pool=Math.max(0,round(state.budget-fixed));
  const salaryBasis=open.reduce((sum,m)=>sum+m.salary,0);
  open.forEach((m,i)=>{
    const share=state.distributionMode==='percentage' && salaryBasis ? pool*m.salary/salaryBasis : pool/open.length;
    m.increase=round(i===open.length-1 ? pool-open.slice(0,-1).reduce((sum,person)=>sum+person.increase,0) : share);
  });
}
function setBudget(value){state.budget=Math.max(0,round(value)); const fixed=state.members.filter(m=>m.locked).reduce((a,m)=>a+m.increase,0); if(fixed>state.budget){ // retain locks within cap, reduce last lock if needed
  let left=state.budget; state.members.filter(m=>m.locked).forEach(m=>{m.increase=round(Math.min(m.increase,left));left=round(left-m.increase)});
 } distribute(); render();}
function refreshLiveAllocations(activeField){
  const cards=[...document.querySelectorAll('.member-card')];
  state.members.forEach((m,index)=>{
    const card=cards[index]; if(!card)return;
    const percent=m.salary?m.increase/m.salary*100:0;
    const pctInput=$('.increase-pct',card), euroInput=$('.increase-euro',card), slider=$('.slider',card);
    if(pctInput!==activeField)pctInput.value=String(round(percent));
    if(euroInput!==activeField)setAmountInput(euroInput,m.increase,{numeric:true,decimals:2});
    slider.value=Math.min(Number(slider.max),Math.round(percent*10)/10);
    const availableEuro=round(Math.max(0,state.budget-state.members.filter(x=>x.id!==m.id&&x.locked).reduce((sum,x)=>sum+x.increase,0)));
    paintSlider(slider,m.increase,availableEuro);
    $('.slider-value',card).textContent=pct(percent);
    $('.new-salary-value',card).textContent=money(m.salary+m.increase);
    $('.lock',card).setAttribute('aria-pressed',m.locked);
    $('.lock-text',card).textContent=m.locked?'Fixed':'Auto split';
    $('.lock-symbol',card).textContent=m.locked?'●':'⌁';
    $('.lock',card).title=m.locked?'Fixed: excluded from automatic redistribution.':'Auto split: this person updates when the available budget changes.';
  });
  $('#totalAllocated').textContent=money(allocated());
  $('#remaining').textContent=money(remaining());
  $('#stickyRemaining').innerHTML=`Remaining <strong>${money(remaining())}</strong>`;
  updateStickyHeader();
}
function render(){
  const has=state.members.length>0, elig=applicableSalary();
  $('#privacyToggle').setAttribute('aria-pressed',privacyMode);$('#privacyToggle').textContent=privacyMode?'Show € amounts':'Hide € amounts';
  $('#privacyNotice').hidden=!privacyMode;$('#privacyNotice').textContent=privacyMode?'€ amounts hidden · Ctrl+Q to show':'€ amounts shown';
  state.distributionMode=state.distributionMode==='percentage'?'percentage':'amount';
  $('#distributionMode').value=state.distributionMode;
  $('#budgetEuro').disabled=!has; $('#budgetPct').disabled=!has; $('#saveScenario').disabled=!has;$('#stickyRemaining').hidden=!has;
  if(document.activeElement!==$('#budgetEuro')||privacyMode)setAmountInput($('#budgetEuro'),state.budget,{decimals:2});
  if(document.activeElement!==$('#budgetPct'))$('#budgetPct').value=elig ? (state.budget/elig*100).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) : '';
  $('#budgetHint').textContent=has ? `Enter either value; the other updates automatically. Percentage budget is based on ${money(elig)} of included team salaries.` : 'Add team members to set your budget.';
  $('#budgetProgress').textContent=has ? `${money(allocated())} of ${money(state.budget)} allocated (${state.budget?Math.round(allocated()/state.budget*100):0}%)` : '';
  $('#memberHelp').textContent=state.distributionMode==='percentage' ? 'People on Auto split receive the same percentage increase. Changing a value fixes that allocation automatically.' : 'People on Auto split share the remaining budget in equal euro amounts. Changing a value fixes that allocation automatically.';
  $('#totalBudget').textContent=money(state.budget);$('#totalAllocated').textContent=money(allocated());$('#remaining').textContent=money(remaining());$('#stickyRemaining').innerHTML=`Remaining <strong>${money(remaining())}</strong>`;$('#totalSalaries').textContent=money(totalSalary());
  $('#emptyState').hidden=has; $('#members').innerHTML=''; const tpl=$('#memberTemplate');
  state.members.forEach(m=>{const el=tpl.content.firstElementChild.cloneNode(true);
    // An automatic allocation can be raised to the whole budget: its peers will be
    // redistributed after it becomes locked. A locked allocation cannot displace
    // another already locked allocation.
    // Only other locked allocations are committed. Automatic allocations will be
    // recalculated when this value is changed, including when this member was
    // already locked.
    const otherCommitted=state.members.filter(x=>x.id!==m.id && x.locked).reduce((a,x)=>a+x.increase,0);
    const maxEuro=round(Math.max(0,state.budget-otherCommitted));
    // Keep the slider scale stable: its maximum always means this person
    // receiving the full team budget, irrespective of other locked values.
    const maxPct=m.salary?state.budget/m.salary*100:0;
    $('.name',el).value=m.name;setAmountInput($('.salary',el),m.salary,{decimals:2});$('.included',el).checked=m.included!==false;
    $('.increase-pct',el).value=String(round(m.salary?m.increase/m.salary*100:0));setAmountInput($('.increase-euro',el),m.increase,{numeric:true,decimals:2});$('.new-salary-value',el).textContent=money(m.salary+m.increase);
    const slider=$('.slider',el);slider.max=Math.floor(maxPct*10)/10;slider.value=Math.min(slider.max,Math.round((m.salary?m.increase/m.salary*100:0)*10)/10);paintSlider(slider,m.increase,maxEuro);$('.increase-pct',el).max=slider.max;$('.increase-euro',el).max=maxEuro;$('.slider-value',el).textContent=pct(m.salary?m.increase/m.salary*100:0); slider.disabled=!m.salary;
    const lock=$('.lock',el);lock.setAttribute('aria-pressed',m.locked);lock.title=m.locked?'Fixed: excluded from automatic redistribution.':'Auto split: this person updates when the available budget changes.';$('.lock-text',el).textContent=m.locked?'Fixed':'Auto split';$('.lock-symbol',el).textContent=m.locked?'●':'⌁';
    $('.name',el).onchange=e=>{m.name=e.target.value||'Unnamed';save();render()};$('.salary',el).onchange=e=>{m.salary=Math.max(0,round(parse(e.target.value)));distribute();save();render()};$('.included',el).onchange=e=>{m.included=e.target.checked;save();render()};
    lock.onclick=()=>{m.locked=!m.locked;distribute();save();render()};$('.remove',el).onclick=()=>{state.members=state.members.filter(x=>x.id!==m.id);distribute();save();render()};
    const manual=e=>{const currentMax=round(Math.max(0,state.budget-state.members.filter(x=>x.id!==m.id&&x.locked).reduce((sum,x)=>sum+x.increase,0)));m.increase=round(Math.min(currentMax,Math.max(0,e)));m.locked=true;distribute();save();render()};
    // During a drag, change only the visible values in this card. Redistribution
    // and rendering wait until `change` (release), so the range element is
    // never replaced or otherwise disturbed under the pointer.
    slider.oninput=e=>{
      const preview=round(Math.min(maxEuro,Math.max(0,m.salary*(Number(e.target.value)/100))));
      $('.slider-value',el).textContent=pct(m.salary?preview/m.salary*100:0);
      $('.increase-pct',el).value=String(round(m.salary?preview/m.salary*100:0));
      setAmountInput($('.increase-euro',el),preview,{numeric:true,decimals:2});
      $('.new-salary-value',el).textContent=money(m.salary+preview);
      paintSlider(slider,preview,maxEuro);
    };
    slider.onchange=e=>manual(m.salary*(Number(e.target.value)/100));
    // Number inputs use a dot as their browser decimal separator. Update the
    // allocation on every spinner step, without rebuilding the focused field.
    const liveManual=(field,value)=>{const currentMax=round(Math.max(0,state.budget-state.members.filter(x=>x.id!==m.id&&x.locked).reduce((sum,x)=>sum+x.increase,0)));const capped=round(Math.min(currentMax,Math.max(0,value)));m.increase=capped;m.locked=true;distribute();save();if(field.classList.contains('increase-pct')&&m.salary&&Math.abs(value-capped/m.salary*100)>0.00001)field.value=String(round(capped/m.salary*100));if(field.classList.contains('increase-euro')&&value!==capped)field.value=String(capped);refreshLiveAllocations(field)};
    $('.increase-pct',el).oninput=e=>liveManual(e.target,m.salary*(Number(e.target.value)||0)/100);$('.increase-euro',el).oninput=e=>liveManual(e.target,Number(e.target.value)||0); $('#members').append(el);
  });
  $('#scenarioEmpty').hidden=state.scenarios.length>0;$('#scenarios').innerHTML='';state.scenarios.forEach((s,index)=>renderScenario(s,index)); save();updateStickyHeader();
}
function renderScenario(s,index){const el=$('#scenarioTemplate').content.firstElementChild.cloneNode(true);$('.scenario-title',el).value=s.name;$('.scenario-title',el).onchange=e=>{s.name=e.target.value.trim()||s.name;save();render()};$('.scenario-date',el).textContent=new Date(s.savedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});$('.scenario-totals',el).innerHTML=`<div><span>Budget</span><b>${money(s.budget)}</b></div><div><span>Allocated</span><b>${money(s.members.reduce((a,m)=>a+m.increase,0))}</b></div><div><span>Remaining</span><b>${money(Math.max(0,s.budget-s.members.reduce((a,m)=>a+m.increase,0)))}</b></div>`;$('.scenario-members',el).innerHTML=s.members.map(m=>`<div class="scenario-member"><b>${escapeHtml(m.name)}</b><span>${pct(m.salary?m.increase/m.salary*100:0)}</span><span>+ ${money(m.increase)}</span><span>${money(m.salary+m.increase)}</span></div>`).join('');$('.restore',el).onclick=()=>{if(confirm('Restore this scenario? It will replace the current team allocations and budget.')){state.members=structuredClone(s.members);state.budget=s.budget;state.distributionMode=s.distributionMode==='percentage'?'percentage':'amount';distribute();render()}};$('.delete',el).onclick=()=>{state.scenarios.splice(index,1);render()};const drag=$('.scenario-drag',el);drag.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));el.classList.add('dragging')};drag.ondragend=()=>document.querySelectorAll('.scenario').forEach(card=>card.classList.remove('dragging','drop-before','drop-after'));el.ondragover=e=>{e.preventDefault();const before=e.clientY<el.getBoundingClientRect().top+el.offsetHeight/2;el.classList.toggle('drop-before',before);el.classList.toggle('drop-after',!before)};el.ondragleave=()=>el.classList.remove('drop-before','drop-after');el.ondrop=e=>{e.preventDefault();const source=Number(e.dataTransfer.getData('text/plain'));if(!Number.isInteger(source)||source===index)return;const before=e.clientY<el.getBoundingClientRect().top+el.offsetHeight/2;let destination=index+(before?0:1);const [moved]=state.scenarios.splice(source,1);if(source<destination)destination--;state.scenarios.splice(destination,0,moved);save();render()};$('#scenarios').append(el)}
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function add(){state.members.push({id:uid(),name:'New team member',salary:0,increase:0,locked:false,included:true});distribute();render();setTimeout(()=>$('.members .name:last-of-type')?.focus(),0)}
$('#addMember').onclick=add;$('.add-empty').onclick=add;$('#budgetEuro').onchange=e=>setBudget(parse(e.target.value));$('#budgetPct').onchange=e=>setBudget(applicableSalary()*parse(e.target.value)/100);
$('#distributionMode').onchange=e=>{state.distributionMode=e.target.value==='percentage'?'percentage':'amount';distribute();render()};
$('#saveScenario').onclick=()=>{state.scenarios.unshift({name:`Scenario ${state.scenarios.length+1}`,savedAt:Date.now(),budget:state.budget,distributionMode:state.distributionMode,members:structuredClone(state.members)});render()};
$('#newPlan').onclick=()=>{if(confirm('Reset allocations and fixed amounts? Team members, salaries, budget, and saved scenarios will be kept.')){state.members.forEach(member=>{member.increase=0;member.locked=false});distribute();render()}};
function togglePrivacy(){privacyMode=!privacyMode;$('#privacyToggle').setAttribute('aria-pressed',privacyMode);$('#privacyToggle').textContent=privacyMode?'Show € amounts':'Hide € amounts';render()}
$('#privacyToggle').onclick=togglePrivacy;window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='q'){e.preventDefault();togglePrivacy()}});
const hero=$('.hero');const budgetCard=$('.budget-card');const stickyThreshold=4;const updateStickyHeader=()=>{const sticky=window.scrollY>stickyThreshold;hero.classList.toggle('is-sticky',sticky);hero.classList.toggle('show-remaining',sticky&&remaining()>0&&budgetCard.getBoundingClientRect().bottom<=hero.getBoundingClientRect().bottom)};window.addEventListener('scroll',updateStickyHeader,{passive:true});updateStickyHeader();
$('#clearData').onclick=()=>{if(confirm('Permanently delete the current plan and every saved scenario from this browser? Export your data first if you may need it later.')){localStorage.removeItem(STORAGE);state={members:[],budget:0,distributionMode:'amount',scenarios:[]};render()}};
$('#exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='payrise-planner-export.json';a.click();URL.revokeObjectURL(a.href)};
$('#importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const imported=JSON.parse(r.result);if(!Array.isArray(imported.members)||!Array.isArray(imported.scenarios))throw Error();state=normalizeImported(imported);render()}catch{alert('This file is not a valid export.')}};r.readAsText(f);e.target.value=''};
render();
