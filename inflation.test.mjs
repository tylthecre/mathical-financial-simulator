import {test} from 'node:test';
import assert from 'node:assert/strict';
import './js/inflation-calc.js';
const {calculate} = globalThis.MathicalInflation;
const rows = [{name:'Молоко 1 л',old:'100',current:'110'},{name:'Хлеб 1 шт.',old:'100',current:'110'}];
test('Корзина: одинаковый набор за год даёт рост 10%', () => { const r=calculate('2025-09','2026-09',rows); assert.ok(Math.abs(r.annual-10)<1e-9); assert.equal(r.months,12); });
test('Рост за шесть месяцев пересчитывается в сложный годовой темп', () => { const r=calculate('2026-01','2026-07',rows); assert.ok(Math.abs(r.annual-21)<1e-9); });
test('Неполная корзина и некорректные месяцы не дают оценку', () => { assert.ok(calculate('2026-01','2026-02',[rows[0]]).error); assert.ok(calculate('2026-13','2027-01',rows).error); assert.ok(calculate('2026-02','2026-01',rows).error); assert.ok(calculate('2026-01','2026-02',[rows[0],{name:'Хлеб',old:'',current:'1'}]).error); });
