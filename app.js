const STORAGE = 'payrise-planner-v1';
const euroFmt = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const numFmt = new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
let state = load() || {members:[], budget:0, distributionMode:'amount', scenarios:[]};
// Query within a freshly cloned template when a root is supplied; otherwise
// query the page. This keeps new member cards fully wired before insertion.
const $ = (selector, root = document) => root.querySelector(selector);
const round = n => Math.round((Number(n)||0)*100)/100;
function parse(value){ return Number(String(value||'').trim().replace(/\./g,'').replace(',','.')) || 0; }
function money(n){return euroFmt.format(round(n));} function pct(n){return numFmt.format(n)+' %';}
function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now()+Math.random().toString(16).slice(2);}
function nonNegative(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,round(n)):0;}
function cleanMembers(members,{ids=false,redistribute=false,budget=0,distributionMode='amount'}={}){
  const safeBudget=nonNegative(budget); let left=safeBudget;
  const cleaned=(Array.isArray(members)?members:[]).map(m=>({id:ids?(m?.id||uid()):m?.id,name:typeof m?.name==='string'?m.name:'Unnamed',salary:nonNegative(m?.salary),increase:nonNegative(m?.increase),locked:Boolean(m?.locked)}));
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
  return {members:cleanMembers(imported.members,{ids:true,redistribute:true,budget,distributionMode}),budget,distributionMode,scenarios:imported.scenarios.map(s=>{
    const scenarioBudget=nonNegative(s?.budget);
    return {savedAt:Number.isFinite(Number(s?.savedAt))?Number(s.savedAt):Date.now(),budget:scenarioBudget,distributionMode:s?.distributionMode==='percentage'?'percentage':'amount',members:cleanMembers(s?.members,{ids:true,budget:scenarioBudget})};
  })};
}
function active(){return state.members.filter(m=>!m.locked && m.salary>0);}
function allocated(){return round(state.members.reduce((a,m)=>a+m.increase,0));}
function remaining(){return Math.max(0,round(state.budget-allocated()));}
function applicableSalary(){return active().reduce((a,m)=>a+m.salary,0);}
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
function render(){
  const has=state.members.length>0, elig=applicableSalary();
  state.distributionMode=state.distributionMode==='percentage'?'percentage':'amount';
  $('#distributionMode').value=state.distributionMode;
  $('#budgetEuro').disabled=!has; $('#budgetPct').disabled=!has; $('#saveScenario').disabled=!has;
  if(document.activeElement!==$('#budgetEuro'))$('#budgetEuro').value=state.budget ? state.budget.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
  if(document.activeElement!==$('#budgetPct'))$('#budgetPct').value=elig ? (state.budget/elig*100).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) : '';
  $('#budgetHint').textContent=has ? `Based on ${money(elig)} of unlocked team salaries.` : 'Add team members to set your budget.';
  $('#memberHelp').textContent=state.distributionMode==='percentage' ? 'Unlocked people receive the same percentage increase. Changing a value locks that allocation automatically.' : 'Unlocked people share the remaining budget in equal euro amounts. Changing a value locks that allocation automatically.';
  $('#totalBudget').textContent=money(state.budget);$('#totalAllocated').textContent=money(allocated());$('#remaining').textContent=money(remaining());$('#eligibleSalary').textContent=money(elig);
  $('#emptyState').hidden=has; $('#members').innerHTML=''; const tpl=$('#memberTemplate');
  state.members.forEach(m=>{const el=tpl.content.firstElementChild.cloneNode(true);
    // An automatic allocation can be raised to the whole budget: its peers will be
    // redistributed after it becomes locked. A locked allocation cannot displace
    // another already locked allocation.
    // Only other locked allocations are committed. Automatic allocations will be
    // recalculated when this value is changed, including when this member was
    // already locked.
    const otherCommitted=state.members.filter(x=>x.id!==m.id && x.locked).reduce((a,x)=>a+x.increase,0);
    const maxEuro=round(Math.max(0,state.budget-otherCommitted));const maxPct=m.salary?maxEuro/m.salary*100:0;
    $('.name',el).value=m.name;$('.salary',el).value=m.salary?m.salary.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
    $('.increase-pct',el).value=(m.salary?m.increase/m.salary*100:0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});$('.increase-euro',el).value=m.increase.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});$('.new-salary-value',el).textContent=money(m.salary+m.increase);
    const slider=$('.slider',el);slider.max=Math.floor(maxPct*10)/10;slider.value=Math.min(slider.max,Math.round((m.salary?m.increase/m.salary*100:0)*10)/10);$('.slider-value',el).textContent=pct(m.salary?m.increase/m.salary*100:0); slider.disabled=!m.salary;
    const lock=$('.lock',el);lock.setAttribute('aria-pressed',m.locked);$('.lock-text',el).textContent=m.locked?'Locked':'Automatic';$('.lock-symbol',el).textContent=m.locked?'●':'⌁';
    $('.name',el).onchange=e=>{m.name=e.target.value||'Unnamed';save();render()};$('.salary',el).onchange=e=>{m.salary=Math.max(0,round(parse(e.target.value)));distribute();save();render()};
    lock.onclick=()=>{m.locked=!m.locked;distribute();save();render()};$('.remove',el).onclick=()=>{state.members=state.members.filter(x=>x.id!==m.id);distribute();save();render()};
    const manual=e=>{m.increase=round(Math.min(maxEuro,Math.max(0,e)));m.locked=true;distribute();save();render()};
    slider.oninput=e=>manual(m.salary*(Number(e.target.value)/100));$('.increase-pct',el).onchange=e=>manual(m.salary*parse(e.target.value)/100);$('.increase-euro',el).onchange=e=>manual(parse(e.target.value)); $('#members').append(el);
  });
  $('#scenarioEmpty').hidden=state.scenarios.length>0;$('#scenarios').innerHTML='';state.scenarios.forEach((s,index)=>renderScenario(s,index)); save();
}
function renderScenario(s,index){const el=$('#scenarioTemplate').content.firstElementChild.cloneNode(true);$('.scenario-title',el).textContent=`Scenario ${state.scenarios.length-index}`;$('.scenario-date',el).textContent=new Date(s.savedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});$('.scenario-totals',el).innerHTML=`<div><span>Budget</span><b>${money(s.budget)}</b></div><div><span>Allocated</span><b>${money(s.members.reduce((a,m)=>a+m.increase,0))}</b></div><div><span>Remaining</span><b>${money(Math.max(0,s.budget-s.members.reduce((a,m)=>a+m.increase,0)))}</b></div>`;$('.scenario-members',el).innerHTML=s.members.map(m=>`<div class="scenario-member"><b>${escapeHtml(m.name)}</b><span>${pct(m.salary?m.increase/m.salary*100:0)}</span><span>+ ${money(m.increase)}</span><span>${money(m.salary+m.increase)}</span></div>`).join('');$('.restore',el).onclick=()=>{state.members=structuredClone(s.members);state.budget=s.budget;state.distributionMode=s.distributionMode==='percentage'?'percentage':'amount';distribute();render()};$('.delete',el).onclick=()=>{state.scenarios.splice(index,1);render()};$('#scenarios').append(el)}
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function add(){state.members.push({id:uid(),name:'New team member',salary:0,increase:0,locked:false});distribute();render();setTimeout(()=>$('.members .name:last-of-type')?.focus(),0)}
$('#addMember').onclick=add;$('.add-empty').onclick=add;$('#budgetEuro').onchange=e=>setBudget(parse(e.target.value));$('#budgetPct').onchange=e=>setBudget(applicableSalary()*parse(e.target.value)/100);
$('#distributionMode').onchange=e=>{state.distributionMode=e.target.value==='percentage'?'percentage':'amount';distribute();render()};
$('#saveScenario').onclick=()=>{state.scenarios.unshift({savedAt:Date.now(),budget:state.budget,distributionMode:state.distributionMode,members:structuredClone(state.members)});render()};
$('#newPlan').onclick=()=>{if(confirm('Reset the current plan? Saved scenarios will be kept.')){state.members=[];state.budget=0;render()}};
$('#exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='payrise-planner-export.json';a.click();URL.revokeObjectURL(a.href)};
$('#importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const imported=JSON.parse(r.result);if(!Array.isArray(imported.members)||!Array.isArray(imported.scenarios))throw Error();state=normalizeImported(imported);render()}catch{alert('This file is not a valid export.')}};r.readAsText(f);e.target.value=''};
render();
