import assert from 'node:assert/strict';
import {test} from 'node:test';
import './engine.js';
const {simulate,distribution,normalize,defaults}=globalThis.Mathical;
const plain={...defaults,salary:100000,housing:25000,living:15000,leisure:10000,initial:200000,rate:0,growth:0,inflation:0,years:10};
test('Нулевые ставки: точный бюджет за 120 месяцев',()=>assert.equal(simulate(plain).final.balance,6200000));
test('Эффективная годовая ставка соответствует сложному проценту',()=>{const r=simulate({...plain,salary:0,housing:0,living:0,leisure:0,rate:10});assert.ok(Math.abs(r.final.balance-200000*1.1**10)<.01);});
test('Инфляция уменьшает реальную стоимость неизменного капитала',()=>{const r=simulate({...plain,salary:0,housing:0,living:0,leisure:0,inflation:5});assert.ok(Math.abs(r.final.real-200000/1.05**10)<.01);});
test('Дефицит не исчезает и не получает доходность как вклад',()=>{const r=simulate({...plain,salary:0,initial:0,rate:7});assert.equal(r.final.balance,-6000000);});
test('Экономия даёт ровно 10% исходных расходов при нулевых ставках',()=>assert.equal(simulate({...plain,decision:'save'}).final.balance-simulate(plain).final.balance,600000));
test('Обучение: оплата во втором году, надбавка с третьего',()=>{const r=simulate({...plain,decision:'education'});assert.equal(r.rows[1].expenses,600000);assert.equal(r.rows[2].expenses,720000);assert.ok(Math.abs(r.rows[3].income-1380000)<.01);});
test('Автомобиль: разовая цена и 8 лет содержания',()=>assert.equal(simulate(plain).final.balance-simulate({...plain,decision:'car'}).final.balance,900000+8000*12*8));
test('Цель может быть доступна сразу, позже или не достигаться',()=>{assert.equal(simulate({...plain,goal:100000}).reached,0);assert.equal(simulate({...plain,goal:800000}).reached,1);assert.equal(simulate({...plain,goal:1000000000}).reached,null);});
test('Стрессовый сценарий хуже, благоприятный лучше базового',()=>{const b=simulate(defaults).final.real;assert.ok(simulate(defaults,'stress').final.real<b);assert.ok(simulate(defaults,'optimistic').final.real>b);});
test('Случайные прогоны воспроизводимы, перцентили упорядочены',()=>{const a=distribution(defaults);assert.deepEqual(a,distribution(defaults));assert.ok(a.low<=a.median&&a.median<=a.high);assert.ok(a.success>=0&&a.success<=1);});
test('Длины горизонтов и конечность результатов в крайних случаях',()=>{for(const years of [10,15,20])for(const salary of [0,10000000]){const r=simulate({...defaults,years,salary,inflation:30,rate:-20});assert.equal(r.rows.length,years+1);assert.ok(r.rows.every(v=>Number.isFinite(v.real)));}});
test('Повреждённые данные нормализуются',()=>{const p=normalize({salary:NaN,years:999,goal:-1,decision:'invalid'});assert.equal(p.salary,defaults.salary);assert.equal(p.years,20);assert.equal(p.goal,1);assert.equal(p.decision,'none');});
test('Месячный взнос и доходность дают ожидаемый сложный процент',()=>{const p={...plain,initial:1000,salary:1000,housing:500,living:0,leisure:0,rate:12};const row=simulate(p).rows[1];const monthlyRate=1.12**(1/12)-1;const expected=1000*1.12+500*(1.12-1)/monthlyRate;assert.ok(Math.abs(row.balance-expected)<.01);assert.equal(row.income,12000);assert.equal(row.expenses,6000);assert.ok(Math.abs(row.interest-(expected-1000-6000))<.01);});
test('Инфляция индексирует расходы и цель каждый месяц',()=>{const p={...plain,initial:10000000,salary:0,housing:10000,living:0,leisure:0,inflation:12,goal:100000,rate:0};const row=simulate(p).rows[1];const monthlyIndex=1.12**(1/12);const expectedExpenses=10000*Array.from({length:12},(_,i)=>monthlyIndex**(i+1)).reduce((a,b)=>a+b,0);assert.ok(Math.abs(row.expenses-expectedExpenses)<.01);assert.ok(Math.abs(row.prices-1.12)<1e-10);assert.ok(Math.abs(row.goal-112000)<1e-8);});
test('Доход индексируется после завершения года',()=>{const p={...plain,initial:0,salary:100000,housing:0,living:0,leisure:0,growth:10};const r=simulate(p).rows;assert.equal(r[1].income,1200000);assert.ok(Math.abs(r[2].income-1320000)<.01);assert.ok(Math.abs(r[3].income-1452000)<.01);});
test('Цель сравнивается с накоплениями, приведёнными к будущим ценам',()=>{const p={...plain,initial:0,salary:10000,housing:0,living:0,leisure:0,inflation:12,goal:110000};const r=simulate(p);assert.ok(Math.abs(r.rows[1].balance-120000)<.01);assert.ok(Math.abs(r.rows[1].goal-123200)<.01);assert.equal(r.reached,2);});

test('Годовые платежи распределяются по месяцам, разовая трата учитывается один раз',()=>{
  const r=simulate({...plain,salary:0,housing:0,living:0,leisure:0,initial:0,annual:12000,oneTime:5000,years:10});
  assert.equal(r.rows[1].expenses,17000);
  assert.equal(r.rows[2].expenses,12000);
  assert.equal(r.final.balance,-125000);
});
test('Старые сохранённые параметры получают нулевые новые расходы',()=>{
  const p=normalize(plain);
  assert.equal(p.annual,0);
  assert.equal(p.oneTime,0);
});
