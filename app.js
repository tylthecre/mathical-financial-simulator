(function () {
  'use strict';
  const M = globalThis.Mathical, $ = s => document.querySelector(s);
  const decisions = {none:'Без изменений',save:'Экономия 10%',education:'Обучение',car:'Автомобиль'};
  const outcomes = {base:'Базовый',optimistic:'Благоприятный',stress:'Стрессовый'};
  const startYear = new Date().getFullYear();
  let params = {...M.defaults}, saved = [], mode = 'real', scenario = 'base', storageOK = true, result;
  try { const data=JSON.parse(localStorage.getItem('mathical-v1') || 'null'); if(data && typeof data==='object') { params=M.normalize(data.params); saved=Array.isArray(data.saved)?data.saved.slice(0,3).filter(x=>x && x.params).map(x=>({...x,params:M.normalize(x.params),scenario:['base','optimistic','stress'].includes(x.scenario)?x.scenario:'base'})):[]; } } catch {storageOK=false;}
  function persist(){try{localStorage.setItem('mathical-v1',JSON.stringify({params,saved}));storageOK=true;}catch{storageOK=false;} $('#storage-status').textContent=storageOK?'':'Браузер запретил хранение. Скачать расчёт можно в CSV.';}
  const {money,yearsLabel,pct}=globalThis.MathicalFormat;
  const makeChart=globalThis.MathicalChart;
  function text(id,value){$('#'+id).textContent=value;}
  let firstCapitalRender = true, capitalFrame = 0;
  function showCapital(value) {
    if (capitalFrame) cancelAnimationFrame(capitalFrame);
    text('final-capital', money(value));
    const animate = firstCapitalRender && Number.isFinite(value) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    firstCapitalRender = false;
    if (!animate) return;
    let start = null;
    const tick = time => {
      if (start === null) start = time;
      const progress = Math.min(1, (time - start) / 1800);
      text('final-capital', money(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) capitalFrame = requestAnimationFrame(tick);
      else capitalFrame = 0;
    };
    capitalFrame = requestAnimationFrame(tick);
  }
  function toast(message){text('toast',message);$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
  function renderSaved(){
    const box=$('#saved-list');box.replaceChildren();
    if(!saved.length){const el=document.createElement('div');el.className='empty-saved';el.textContent='Здесь появятся твои варианты будущего.';box.append(el);return;}
    saved.forEach((item,i)=>{const p=item.params,r=M.simulate(p,item.scenario);const row=document.createElement('div');row.className='saved-row';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=`${i+1}. ${decisions[p.decision]}`;const info=document.createElement('small');info.textContent=`${outcomes[item.scenario]} · ${yearsLabel(p.years)} · ${money(p.salary)}/мес.`;left.append(title,info);const val=document.createElement('b');val.textContent=money(r.final.real);const load=document.createElement('button');load.textContent='↗';load.title='Загрузить этот сценарий';load.setAttribute('aria-label',`Загрузить вариант ${i+1}`);load.onclick=()=>{params={...p};scenario=item.scenario;$('#scenario').value=scenario;render();toast('Параметры варианта загружены');};const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',`Удалить вариант ${i+1}`);del.onclick=()=>{saved.splice(i,1);renderSaved();persist();};row.append(left,val,load,del);box.append(row);});
  }
  function updateChartYear(){const year=Number($('#chart-year').value),row=result.rows[year],value=mode==='real'?row.real:row.balance; text('chart-readout',`${startYear+year} год: ${money(value,false)}`);const marker=$('#capital-chart [data-year="'+year+'"]');document.querySelectorAll('#capital-chart [data-year]').forEach(el=>el.classList.remove('current'));if(marker)marker.classList.add('current');}
  $('#chart-year').addEventListener('input',updateChartYear);
  $('#capital-chart').addEventListener('click',e=>{const dot=e.target.closest('[data-year]');if(dot){$('#chart-year').value=dot.dataset.year;updateChartYear();}});
  function render(){
    params=M.normalize(params);result=M.simulate(params,scenario);
    const baseline=M.simulate({...params,decision:'none'},scenario),uncertain=M.distribution(params);
    const annualTotal=params.annual+params.annualItems.reduce((sum,x)=>sum+x.amount,0);
    const loan=M.loanTerms(params);
    const expense=params.housing+params.living+params.leisure+annualTotal/12, factor=params.decision==='save'?.9:1, spent=expense*factor+loan.payment, free=params.salary-spent;
    text('health-free',money(free,false)+'/мес.');
    text('health-rate',params.salary <= 0 ? 'Нет дохода' : free < 0 ? 'Нет сбережений' : pct(free/params.salary*100));
    const health=M.financialHealth(params);
    text('health-essential',money(health.essential,false)+'/мес.');
    text('health-reserve',health.reserveMonths === null ? 'Укажи расходы' : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(health.reserveMonths)+' мес.');
    const healthNote=params.essentialOther > 0 ? 'На старте плана: жильё, указанная часть остальных расходов'+(loan.principal>0?' и кредит':'')+'. Без будущих доходов и инфляции.' : (params.housing>0 || loan.principal>0) ? 'В расчёте: '+(params.housing>0?'жильё':'')+(params.housing>0 && loan.principal>0?' и ':'')+(loan.principal>0?'кредит':'')+'. Другие обязательные расходы можно указать в бюджете.' : 'Укажи обязательные расходы в бюджете, чтобы рассчитать запас.';
    text('health-note',healthNote+(params.oneTime>0?' Разовая трата вычтена из накоплений.':''));
    text('future-year',startYear+params.years+' ↗');
    text('income-metric',money(params.salary));text('expense-metric',money(spent));
    showCapital(mode==='real'?result.final.real:result.final.balance);text('capital-subtitle',`${outcomes[scenario]} сценарий · конец ${startYear+params.years} года`);text('chart-unit',mode==='real'?'Покупательная способность':'Номинальные суммы');$('#capital-chart').innerHTML=makeChart(result.rows,{years:params.years,mode,startYear,bands:uncertain.bands,goal:params.goal}); const chartYear=$('#chart-year');chartYear.max=params.years;chartYear.value=params.years;updateChartYear();
    const share=n=>pct(n/Math.max(params.salary,spent,1)*100);
    const categories=[['Накопления',Math.max(0,free),'saving'],['Жильё',params.housing*factor,'housing'],['Еда и быт',(params.living+annualTotal/12)*factor,'living'],['Досуг',params.leisure*factor,'leisure'],...(loan.principal>0?[['Кредит',loan.payment,'loan']]:[])];
    const total=categories.reduce((sum,x)=>sum+x[1],0);
    $('#allocation').innerHTML=`<div class="budget-bar" aria-hidden="true">${categories.map(([name,value,color])=>`<span class="budget-${color}" style="width:${total?value/total*100:0}%"></span>`).join('')}</div><div class="budget-legend">${categories.map(([name,value,color])=>`<div><span><i class="budget-key budget-${color}"></i>${name}</span><strong>${pct(total?value/total*100:0)}</strong></div>`).join('')}</div>`;
    text('budget-note',free<0?`Дефицит: ${money(-free,false)}/мес. Доли показаны от расходов.`:`В расходах учтена 1/12 годовых платежей${params.oneTime ? ' · разовая трата '+money(params.oneTime,false)+' учтена в первый месяц прогноза' : ''}.`);
    $('#loan-empty').hidden=loan.principal>0;
    $('#loan-metrics').hidden=loan.principal<=0;
    $('#loan-note').hidden=loan.principal<=0;
    if(loan.principal>0){text('loan-payment',money(loan.payment,false));text('loan-overpayment',money(loan.overpayment,false));text('loan-ratio',params.salary>0?pct(loan.payment/params.salary*100):'Нет дохода');}
    text('goal-title',params.goalName);text('goal-amount',`${money(params.goal,false)} в сегодняшних ценах`);
    const goal=M.goalPlan(params), monthly=Math.max(0,Math.ceil(goal.monthly-1e-7));
    text('goal-monthly',money(monthly,false)+'/мес.');
    const comparison=monthly===0?'К сроку достаточно начальных накоплений.':free<0?'Сейчас расходы превышают доход.':monthly>free?'Не хватает '+money(Math.ceil(monthly-free),false)+'/мес. к остатку на старте плана.':'Остатка на старте плана хватает на этот взнос.';
    text('goal-compare',`Срок: ${yearsLabel(params.goalYears)}. ${comparison}`);
    const progress=Math.max(0,Math.min(100,result.final.real/params.goal*100));$('#goal-progress').style.width=progress+'%';
    text('goal-result',result.reached!==null?result.reached===0?'Цель доступна уже сейчас':`Впервые доступна в ${startYear+result.reached}`:`${Math.round(progress)}% цели к ${startYear+params.years}`);
    if(result.reached!==null&&result.final.real<params.goal) text('goal-result',`Достигнута ранее, но к концу срока денег не хватает`);
    const delta=result.final.real-baseline.final.real;
    const desc={none:'',save:'Регулярные расходы ниже на 10%; платёж по кредиту не меняется.',education:'Оплата в начале 2-го года; зарплата выше на 15% с 3-го года. Эффект повышения задан как учебное допущение.',car:'Покупка в начале 3-го года, затем содержание. Цена автомобиля как актива не входит в капитал.'};
    text('decision-insight',`${desc[params.decision]}${params.decision==='none'?'':` Разница через ${yearsLabel(params.years)}: ${delta>=0?'+':''}${money(delta,false)} в сегодняшних рублях.`}`);
    text('p10',money(uncertain.low));text('p50',money(uncertain.median));text('p90',money(uncertain.high));text('probability',`Цель достигнута в ${Math.round(uncertain.success*100)}% учебных прогонов к концу срока. Не гарантия результата.`);
    $('#year-table').innerHTML=result.rows.map(r=>`<tr><td>${startYear+r.year}${r.event?' *':''}</td><td>${money(r.income,false)}</td><td>${money(r.expenses,false)}</td><td>${money(r.interest,false)}</td><td>${money(r.balance,false)}</td><td>${money(r.real,false)}</td></tr>${r.event?`<tr><td colspan="6" style="text-align:left;color:#c0ba95">* ${r.event}</td></tr>`:''}`).join('');
    document.querySelectorAll('[data-years]').forEach(b=>{const selected=Number(b.dataset.years)===params.years;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    $('#custom-years').value=params.years;
    text('custom-years-unit',yearsLabel(params.years).split(' ')[1]);
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));
    document.querySelectorAll('[data-decision]').forEach(b=>b.classList.toggle('active',b.dataset.decision===params.decision));
    renderSaved();persist();
  }
  function readAnnualItems(){return [...document.querySelectorAll('.annual-item')].map(row=>({name:row.querySelector('.annual-name').value.trim(),amount:Number(row.querySelector('.annual-amount').value)||0})).filter(x=>x.name || x.amount);}
  function addAnnualItem(item={name:'',amount:0}){const row=document.createElement('div');row.className='annual-item';const name=document.createElement('input');name.className='annual-name';name.placeholder='Название платежа';name.setAttribute('aria-label','Название годового платежа');name.maxLength=80;name.value=item.name;const amount=document.createElement('input');amount.className='annual-amount';amount.type='number';amount.min='0';amount.max='120000000';amount.step='1';amount.required=true;amount.setAttribute('aria-label','Сумма годового платежа');amount.value=item.amount;const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';remove.onclick=()=>{row.remove();editorBalance();};row.append(name,amount,remove);$('#annual-items-list').append(row);}
  $('#add-annual-item').onclick=()=>{if(document.querySelectorAll('.annual-item').length<50)addAnnualItem();};
  function editorBalance(){
    const f=$('#settings-form').elements;
    const annual=Number(f.annual.value)+readAnnualItems().reduce((sum,x)=>sum+x.amount,0);
    const other=Number(f.living.value)+Number(f.leisure.value)+annual/12;
    const essential=f.essentialOther;
    const error=Number(essential.value)>other+1e-7 ? 'Сумма не может превышать остальные расходы в месяц: '+money(other,false)+'.' : '';
    essential.setCustomValidity(error);
    essential.setAttribute('aria-invalid',String(Boolean(error)));
    $('#essential-error').textContent=error;
    $('#essential-error').hidden=!error;
    const loan=M.loanTerms({loanPrincipal:f.loanPrincipal.value,loanRate:f.loanRate.value,loanMonths:f.loanMonths.value});
    const free=Number(f.salary.value)-Number(f.housing.value)-other-loan.payment;
    text('editor-balance',(free>=0?'Остаётся ':'Не хватает ')+money(Math.abs(free),false)+'/мес.');
  }
  function editor(section){const form=$('#settings-form');for(const [key,val] of Object.entries(params)){const field=form.elements.namedItem(key);if(field)field.value=val;}$('#annual-items-list').replaceChildren();params.annualItems.forEach(addAnnualItem);document.querySelectorAll('#editor .advanced-settings').forEach(d=>d.open=false);editorBalance();$('#editor').showModal();$('#editor').scrollTop=0;if(section==='goals'){$('#goals-fields').scrollIntoView({block:'nearest'});form.elements.goalName.focus({preventScroll:true});}else if(section==='credit'){$('#credit-settings').open=true;$('#credit-settings').scrollIntoView({block:'center'});form.elements.loanPrincipal.focus({preventScroll:true});}else{form.elements.salary.focus({preventScroll:true});}}
  $('#settings-form').addEventListener('input',editorBalance);
  $('#settings-form').addEventListener('invalid',e=>{const parent=e.target.closest('details');if(parent)parent.open=true;e.target.scrollIntoView({block:'center'});},true);
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.edit));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
  document.querySelectorAll('[data-years]').forEach(b=>b.onclick=()=>{params.years=Number(b.dataset.years);render();});
  const customYears=$('#custom-years');
  customYears.addEventListener('change',()=>{const raw=customYears.value;if(raw===''){customYears.value=params.years;return;}const n=Number(raw);if(!Number.isFinite(n)){customYears.value=params.years;return;}params.years=Math.max(1,Math.min(50,Math.round(n)));render();if(n!==params.years)toast('Укажи срок от 1 до 50 лет');});
  customYears.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();customYears.blur();}});
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render();});
  document.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>{params.decision=b.dataset.decision;render();});
  $('#scenario').onchange=e=>{scenario=e.target.value;render();};
  $('#settings-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));params=M.normalize({...params,...data,annualItems:readAnnualItems()});$('#editor').close();render();toast('Твоя финансовая траектория обновлена');};
  $('#method-button').onclick=()=>$('#method').showModal();
  function save(){if(saved.length>=3){toast('Можно сохранить три варианта. Удали один, чтобы добавить новый.');return;}saved.push({params:{...params},scenario});renderSaved();persist();toast('Вариант добавлен к сравнению');}
  $('#save-bottom').onclick=save;
  $('#reset').onclick=()=>{params={...M.defaults};mode='real';scenario='base';$('#scenario').value='base';render();toast('Начальные параметры восстановлены');};
  $('#export').onclick=()=>{const quote=s=>'"'+String(s).replaceAll('"','""')+'"';const rows=[['Mathical — учебный расчёт'],['Сценарий',outcomes[scenario]],['Решение',decisions[params.decision]],['Цель',params.goalName,params.goal],['Начальный год',startYear],...Object.entries(params).filter(([k])=>typeof params[k]==='number'),['Год','Доход','Расход','Доход на капитал','Капитал номинальный','Капитал в сегодняшних рублях','Цена цели','Событие'],...result.rows.map(r=>[startYear+r.year,...[r.income,r.expenses,r.interest,r.balance,r.real,r.goal].map(n=>Math.round(n)),r.event])];const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`mathical-${startYear}-${startYear+params.years}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Расчёт подготовлен для скачивания');};
  render();
})();

