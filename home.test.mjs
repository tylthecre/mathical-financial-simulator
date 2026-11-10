import assert from "node:assert/strict";
import { test } from "node:test";
import "./engine.js";
import "./format.js";

const params = {
  ...Mathical.defaults,
  initial: 0,
  salary: 10000,
  housing: 0,
  living: 0,
  leisure: 0,
  annual: 0,
  inflation: 0,
  growth: 0,
  rate: 0,
  years: 2,
};
const outcome = (p) =>
  MathicalFormat.goalOutcome(Mathical.simulate(p).reached, p.years, 2026);

test("Главная отвечает годом достижения цели", () => {
  assert.equal(
    outcome({ ...params, goal: 120000 }),
    "Цель будет достигнута в 2027 году.",
  );
});
test("Главная сообщает, если цель не достигнута за выбранный срок", () => {
  assert.equal(
    outcome({ ...params, goal: 300000 }),
    "За 2 года цель не достигается.",
  );
});
test("Главная отдельно обрабатывает цель, достигнутую на старте", () => {
  assert.equal(
    outcome({ ...params, initial: 120000, goal: 120000 }),
    "Цель уже достигнута на старте плана.",
  );
});
