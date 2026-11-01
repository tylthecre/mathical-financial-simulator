import {test} from 'node:test';
import assert from 'node:assert/strict';
import './format.js';
import './chart.js';
const rows=[{year:0,real:100,balance:100,goal:250},{year:1,real:200,balance:220,goal:400}];
const bands=[{realLow:90,realHigh:110,nominalLow:90,nominalHigh:110},{realLow:180,realHigh:220,nominalLow:200,nominalHigh:240}];
const make=(mode,showBand=true,goal=250)=>globalThis.MathicalChart(rows,{years:1,mode,startYear:2026,bands,goal,showBand});
test('Линия цели использует будущую стоимость в номинальном режиме',()=>{
  const a=make('real'), b=make('nominal');
  const path=s=>s.match(/<path d="([^"]+)" clip-path="url\(#goal-clip\)"/)[1];
  assert.notEqual(path(a),path(b));
  assert.match(a,/Цель выше шкалы графика/);
});
test('Коридор отсутствует, если сценарий не базовый',()=>{
  assert.match(make('real',true),/fill="#8c7be9"/);
  assert.doesNotMatch(make('real',false),/fill="#8c7be9"/);
});
