/* Mathical — прозрачная учебная модель. Без внешних запросов. */
(function (root) {
  'use strict';
  const defaults = { salary: 100000, housing: 25000, living: 20000, leisure: 10000, annual: 0, oneTime: 0, essentialOther: 0, initial: 200000, growth: 6, inflation: 5, rate: 7, years: 15, goal: 3000000, goalName: 'Первый взнос на квартиру', decision: 'none' };
  const bounds = { salary: [0,10000000], housing: [0,10000000], living: [0,10000000], leisure: [0,10000000], annual: [0,120000000], oneTime: [0,1000000000], essentialOther: [0,1000000000], initial: [0,1000000000], growth: [-20,30], inflation: [0,30], rate: [-20,30], years: [1,50], goal: [1,1000000000] };
  function normalize(input) {
    const p = { ...defaults, ...input };
    delete p.profession; // Drop obsolete presets from previously saved plans.
    for (const [key,[min,max]] of Object.entries(bounds)) { const n = Number(p[key]); p[key] = Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : defaults[key]; }
    p.annualItems = Array.isArray(p.annualItems) ? p.annualItems.slice(0,50).filter(x => x && typeof x === 'object').map(x => ({name:String(x.name || '').slice(0,80), amount:Math.min(120000000,Math.max(0,Number(x.amount) || 0))})) : [];
    const otherSpending = p.living + p.leisure + (p.annual + p.annualItems.reduce((sum,x)=>sum+x.amount,0)) / 12;
    p.essentialOther = Math.min(p.essentialOther, otherSpending);
    p.years = Math.round(p.years);
    p.goalName = String(p.goalName || defaults.goalName).slice(0,80);
    if (!['none','save','education','car'].includes(p.decision)) p.decision = 'none';
    return p;
  }
  function financialHealth(input) {
    const p = normalize(input);
    const factor = p.decision === 'save' ? .9 : 1;
    const essential = (p.housing + p.essentialOther) * factor;
    const available = Math.max(0, p.initial - p.oneTime);
    return {essential, available, reserveMonths: essential > 0 ? available / essential : null};
  }
  function random(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function simulate(input, scenario = 'base', seed = 42) {
    const p = normalize(input), rng = random(seed);
    let balance = p.initial, prices = 1, salary = p.salary, spending = p.housing + p.living + p.leisure + (p.annual + p.annualItems.reduce((sum,x)=>sum+x.amount,0)) / 12;
    const rows = [{year:0,balance,real:balance,prices,goal:p.goal,income:0,expenses:0,interest:0,event:''}];
    let reached = balance >= p.goal ? 0 : null;
    for (let year = 1; year <= p.years; year++) {
      let inf = p.inflation, growth = p.growth, rate = p.rate, lost = 0;
      if (scenario === 'optimistic') { inf = Math.max(0,inf-1.5); growth += 1; rate += 2; }
      if (scenario === 'stress') { inf += 2; growth -= 1; rate -= 3; if (year === 4) lost = 3; }
      if (scenario === 'random') { inf = Math.max(0,inf+(rng()-.5)*4); growth += (rng()-.5)*2; rate += (rng()-.5)*12; lost = rng() < .08 ? 2 : 0; }
      const monthlyRate = Math.pow(1+rate/100,1/12)-1;
      const monthlyInflation = Math.pow(1+inf/100,1/12);
      let income = 0, expenses = 0, interest = 0, event = lost ? `${lost} мес. без дохода` : '';
      for (let month=1;month<=12;month++) {
        // Salary is indexed at each year end; spending and target grow monthly.
        prices *= monthlyInflation;
        const pay = month <= lost ? 0 : salary * (p.decision === 'education' && year >= 3 ? 1.15 : 1);
        let cost = spending * prices * (p.decision === 'save' ? .9 : 1);
        if (year === 1 && month === 1) cost += p.oneTime;
        if (p.decision === 'education' && year === 2 && month === 1) { cost += 120000*prices; event = 'Обучение: 120 тыс. ₽ в начальных ценах'; }
        if (p.decision === 'car' && year >= 3) { cost += 8000*prices; if (year === 3 && month === 1) { cost += 900000*prices; event = 'Покупка автомобиля'; } }
        const earned = Math.max(0,balance)*monthlyRate;
        balance += earned + pay - cost;
        income += pay; expenses += cost; interest += earned;
      }
      salary *= 1+growth/100;
      rows.push({year,balance,real:balance/prices,prices,goal:p.goal*prices,income,expenses,interest,event});
      if (reached === null && balance >= p.goal*prices) reached = year;
    }
    return {rows,reached,final:rows.at(-1)};
  }
  function distribution(input, count=160) {
    const runs = Array.from({length:count},(_,i)=>simulate(input,'random',71+i*997));
    const values = runs.map(r=>r.final.real).sort((a,b)=>a-b);
    const q = n => values[Math.floor((values.length-1)*n)];
    return {low:q(.1),median:q(.5),high:q(.9),success:runs.filter(r=>r.final.real>=normalize(input).goal).length/count,count};
  }
  root.Mathical = {defaults,bounds,normalize,financialHealth,simulate,distribution};
})(globalThis);
