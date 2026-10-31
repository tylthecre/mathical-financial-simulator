(function () {
  'use strict';
  const M = globalThis.Mathical, $ = s => document.querySelector(s);
  const decisions = {none:'Без изменений',save:'Экономия 10%',education:'Обучение',car:'Автомобиль'};
  const outcomes = {base:'Базовый',optimistic:'Благоприятный',stress:'Стрессовый'};
  const startYear = new Date().getFullYear();
  let params = {...M.defaults}, saved = [], mode = 'real', scenario = 'base', storageOK = true, result;
  try { const data=JSON.parse(localStorage.getItem('mathical-v1') || 'null'); if(data && typeof data==='object') { params=M.normalize(data.params); saved=Array.isArray(data.saved)?data.saved.slice(0,3).filter(x=>x && x.params).map(x=>({...x,params:M.normalize(x.params),scenario:['base','optimistic','stress'].includes(x.scenario)?x.scenario:'base'})):[]; } } catch {storageOK=false;}
  function persist(){try{localStorage.setItem('mathical-v1',JSON.stringify({params,saved}));storageOK=true;}catch{storageOK=false;} $('#storage-status').textContent=storageOK?'':'Браузер запретил хранение. Скачать расчёт можно в CSV.';}
  function money(n,compact=true){return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:compact?1:0,...(compact?{notation:'compact'}:{})}).format(n);}
  const pct=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n)+'%';
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
  function chart(rows) {
    const indices=Array.from({length:6},(_,i)=>Math.round(i*params.years/5));
    const points=indices.map(i=>rows[i]);
    const values=points.map(r=>r[mode==='real'?'real':'balance']);
    const max=Math.max(1,...values)*1.12, min=Math.min(0,...values)*1.15;
    const y=v=>225-(v-min)/(max-min)*205;
    const zero=y(0), width=390;
    const ticks=[min, (max+min)/2,max];
    const trackClips=points.map((_,i)=>`<clipPath id="capital-track-${i}"><rect x="${50+i*57}" y="${y(max)}" width="44" height="205" rx="22"/></clipPath>`).join('');
    let svg=`<svg viewBox="0 0 ${width} 255" role="img" aria-label="Капитал от ${startYear} до ${startYear+params.years}, ${mode==='real'?'в сегодняшних':'в будущих'} рублях"><title>Капитал по годам</title><defs><clipPath id="capital-plot-clip"><rect x="46" y="20" width="343" height="205"/></clipPath>${trackClips}</defs>`;
    ticks.forEach(v=>{svg+=`<line x1="46" y1="${y(v)}" x2="389" y2="${y(v)}" stroke="#ddd3a5" stroke-dasharray="3 4"/><text x="0" y="${y(v)+3}" font-size="12" fill="#807653">${money(v).replace(/₽/g,'')}</text>`;});
    svg+=`<line x1="46" y1="${zero}" x2="389" y2="${zero}" stroke="#9c926c"/>`;
    points.forEach((r,i)=>{const v=values[i],x=50+i*57, yy=y(v), h=v===0?0:Math.max(2,Math.abs(zero-yy)); svg+=`<g clip-path="url(#capital-plot-clip)"><rect x="${x}" y="${y(max)}" width="44" height="${205}" rx="22" fill="#e7ddb0"/><g clip-path="url(#capital-track-${i})"><rect x="${x}" y="${v>=0?zero-h:zero}" width="44" height="${h}" rx="${Math.min(22,h/2)}" fill="${v<0?'#d46485':'#ffb647'}"><title>${startYear+r.year}: ${money(v,false)}</title></rect></g></g><text x="${x+22}" y="249" text-anchor="middle" fill="#756d50" font-size="12">${startYear+r.year}</text>`;});
    svg+='</svg>'; $('#capital-chart').innerHTML=svg;
  }
  function renderSaved(){
    const box=$('#saved-list');box.replaceChildren();
    if(!saved.length){const el=document.createElement('div');el.className='empty-saved';el.textContent='Здесь появятся твои варианты будущего.';box.append(el);return;}
    saved.forEach((item,i)=>{const p=item.params,r=M.simulate(p,item.scenario);const row=document.createElement('div');row.className='saved-row';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=`${i+1}. ${decisions[p.decision]}`;const info=document.createElement('small');info.textContent=`${outcomes[item.scenario]} · ${p.years} лет · ${money(p.salary)}/мес.`;left.append(title,info);const val=document.createElement('b');val.textContent=money(r.final.real);const load=document.createElement('button');load.textContent='↗';load.title='Загрузить этот сценарий';load.setAttribute('aria-label',`Загрузить вариант ${i+1}`);load.onclick=()=>{params={...p};scenario=item.scenario;$('#scenario').value=scenario;render();toast('Параметры варианта загружены');};const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',`Удалить вариант ${i+1}`);del.onclick=()=>{saved.splice(i,1);renderSaved();persist();};row.append(left,val,load,del);box.append(row);});
  }
  function render(){
    params=M.normalize(params);result=M.simulate(params,scenario);
    const baseline=M.simulate({...params,decision:'none'},scenario),uncertain=M.distribution(params);
    const annualTotal=params.annual+params.annualItems.reduce((sum,x)=>sum+x.amount,0);
    const expense=params.housing+params.living+params.leisure+annualTotal/12, factor=params.decision==='save'?.9:1, spent=expense*factor, free=params.salary-spent;
    text('health-free',money(free,false)+'/мес.');
    text('health-rate',params.salary <= 0 ? 'Нет дохода' : free < 0 ? 'Нет сбережений' : pct(free/params.salary*100));
    const reserve=Math.max(0,params.initial-params.oneTime);
    text('health-reserve',params.housing > 0 ? new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(reserve/(params.housing*factor))+' мес.' : 'Укажи расходы на жильё');
    text('future-year',startYear+params.years+' ↗');
    text('income-metric',money(params.salary));text('expense-metric',money(spent));
    showCapital(mode==='real'?result.final.real:result.final.balance);text('capital-subtitle',`${outcomes[scenario]} сценарий · конец ${startYear+params.years} года`);text('chart-unit',mode==='real'?'Покупательная способность':'Номинальные суммы');chart(result.rows);
    const share=n=>pct(n/Math.max(params.salary,spent,1)*100);
    $('#allocation').innerHTML=`<div class="tile tile-saving"><b>${money(Math.max(0,free))}</b><span>остаётся на накопления · ${share(Math.max(0,free))}</span></div><div class="tile tile-housing"><b>${share(params.housing*factor)}</b><span>жильё</span></div><div class="tile-other"><div class="tile tile-living"><b>${share((params.living+annualTotal/12)*factor)}</b><span>еда, быт и годовые траты</span></div><div class="tile tile-leisure"><b>${share(params.leisure*factor)}</b><span>досуг</span></div></div>`;
    text('budget-note',free<0?`Дефицит: ${money(-free,false)}/мес. Расходы превышают доход; проценты показаны от расходов.`:`В расходах учтена 1/12 годовых платежей${params.oneTime ? ' · разовая трата '+money(params.oneTime,false)+' учтена в первый месяц прогноза' : ''}. Размеры блоков условные.`);
    text('goal-title',params.goalName);text('goal-amount',`${money(params.goal,false)} в сегодняшних ценах`);
    const progress=Math.max(0,Math.min(100,result.final.real/params.goal*100));$('#goal-progress').style.width=progress+'%';
    text('goal-result',result.reached!==null?result.reached===0?'Цель доступна уже сейчас':`Впервые доступна в ${startYear+result.reached}`:`${Math.round(progress)}% цели к ${startYear+params.years}`);
    if(result.reached!==null&&result.final.real<params.goal) text('goal-result',`Достигнута ранее, но к концу срока денег не хватает`);
    const delta=result.final.real-baseline.final.real;
    const desc={none:'',save:'Все регулярные расходы ниже на 10% с первого месяца.',education:'Оплата в начале 2-го года; зарплата выше на 15% с 3-го года. Эффект повышения задан как учебное допущение.',car:'Покупка в начале 3-го года, затем содержание. Цена автомобиля как актива не входит в капитал.'};
    text('decision-insight',`${desc[params.decision]}${params.decision==='none'?'':` Разница через ${params.years} лет: ${delta>=0?'+':''}${money(delta,false)} в сегодняшних рублях.`}`);
    text('p10',money(uncertain.low));text('p50',money(uncertain.median));text('p90',money(uncertain.high));text('probability',`Цель достигнута в ${Math.round(uncertain.success*100)}% учебных прогонов к концу срока. Не гарантия результата.`);
    $('#year-table').innerHTML=result.rows.map(r=>`<tr><td>${startYear+r.year}${r.event?' *':''}</td><td>${money(r.income,false)}</td><td>${money(r.expenses,false)}</td><td>${money(r.interest,false)}</td><td>${money(r.balance,false)}</td><td>${money(r.real,false)}</td></tr>${r.event?`<tr><td colspan="6" style="text-align:left;color:#c0ba95">* ${r.event}</td></tr>`:''}`).join('');
    document.querySelectorAll('[data-years]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.years)===params.years));
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));
    document.querySelectorAll('[data-decision]').forEach(b=>b.classList.toggle('active',b.dataset.decision===params.decision));
    renderSaved();persist();
  }
  function readAnnualItems(){return [...document.querySelectorAll('.annual-item')].map(row=>({name:row.querySelector('.annual-name').value.trim(),amount:Number(row.querySelector('.annual-amount').value)||0})).filter(x=>x.name || x.amount);}
  function addAnnualItem(item={name:'',amount:0}){const row=document.createElement('div');row.className='annual-item';const name=document.createElement('input');name.className='annual-name';name.placeholder='Название платежа';name.setAttribute('aria-label','Название годового платежа');name.maxLength=80;name.value=item.name;const amount=document.createElement('input');amount.className='annual-amount';amount.type='number';amount.min='0';amount.max='120000000';amount.step='1';amount.required=true;amount.setAttribute('aria-label','Сумма годового платежа');amount.value=item.amount;const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';remove.onclick=()=>{row.remove();editorBalance();};row.append(name,amount,remove);$('#annual-items-list').append(row);}
  $('#add-annual-item').onclick=()=>{if(document.querySelectorAll('.annual-item').length<50)addAnnualItem();};
  function editorBalance(){const f=$('#settings-form').elements;const free=Number(f.salary.value)-Number(f.housing.value)-Number(f.living.value)-Number(f.leisure.value)-(Number(f.annual.value)+readAnnualItems().reduce((sum,x)=>sum+x.amount,0))/12;text('editor-balance',(free>=0?'Остаётся ':'Не хватает ')+money(Math.abs(free),false)+'/мес.');}
  function editor(section){const form=$('#settings-form');for(const [key,val] of Object.entries(params)){const field=form.elements.namedItem(key);if(field)field.value=val;}$('#annual-items-list').replaceChildren();params.annualItems.forEach(addAnnualItem);$('.advanced-settings').open=false;editorBalance();$('#editor').showModal();$('#editor').scrollTop=0;if(section==='goals'){$('#goals-fields').scrollIntoView({block:'nearest'});form.elements.goalName.focus({preventScroll:true});}else{form.elements.salary.focus({preventScroll:true});}}
  $('#settings-form').addEventListener('input',editorBalance);
  $('#settings-form').addEventListener('invalid',e=>{const parent=e.target.closest('details');if(parent)parent.open=true;},true);
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.edit));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
  document.querySelectorAll('[data-years]').forEach(b=>b.onclick=()=>{params.years=Number(b.dataset.years);render();});
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

