import { test } from "node:test";
import assert from "node:assert/strict";
import "./format.js";
import "./chart.js";
const rows = [
  { year: 0, real: 100, balance: 100, goal: 250 },
  { year: 1, real: 200, balance: 220, goal: 400 },
];
const bands = [
  { realLow: 90, realHigh: 110, nominalLow: 90, nominalHigh: 110 },
  { realLow: 180, realHigh: 220, nominalLow: 200, nominalHigh: 240 },
];
const make = (mode, showBand = true, goal = 250) =>
  globalThis.MathicalChart(rows, {
    years: 1,
    mode,
    startYear: 2026,
    bands,
    goal,
    showBand,
  });
test("Линия цели использует будущую стоимость в номинальном режиме", () => {
  const a = make("real"),
    b = make("nominal");
  const path = (s) =>
    s.match(/<path d="([^"]+)" clip-path="url\(#goal-clip\)"/)[1];
  assert.notEqual(path(a), path(b));
  assert.match(a, /Цель выше шкалы графика/);
});
test("Коридор отсутствует, если сценарий не базовый", () => {
  assert.match(make("real", true), /fill="#aa9cb9"/);
  assert.doesNotMatch(make("real", false), /fill="#aa9cb9"/);
});

const minimum = (svg) => Number(svg.match(/data-scale-min="([^"]+)"/)[1]);
test("Неотрицательные капитал, цель и диапазон дают нижнюю границу ровно ноль", () => {
  assert.equal(minimum(make("real")), 0);
  assert.doesNotMatch(make("real"), /<text[^>]*>-\d/);
});
test("При отрицательном капитале сохраняется прежний нижний запас", () => {
  const data = [{ ...rows[0], real: -50 }, rows[1]];
  const svg = MathicalChart(data, {
    years: 1,
    mode: "real",
    startYear: 2026,
    bands,
    goal: 150,
  });
  assert.equal(minimum(svg), -50 - (220 + 50) * 0.09);
});
test("Отрицательный видимый диапазон учитывается, скрытый не расширяет шкалу", () => {
  const negative = [{ ...bands[0], realLow: -50 }, bands[1]];
  const options = {
    years: 1,
    mode: "real",
    startYear: 2026,
    bands: negative,
    goal: 150,
  };
  assert.ok(minimum(MathicalChart(rows, options)) < -50);
  assert.equal(
    minimum(MathicalChart(rows, { ...options, showBand: false })),
    0,
  );
});
test("Отрицательная цель сохраняет прежний нижний запас", () => {
  assert.ok(minimum(make("real", true, -100)) < 0);
});
test("Подпись цели находится внутри горизонтальных границ графика и вне осей", () => {
  const svg = make("real", true, 150);
  const [, x, y, width, height] = svg
    .match(
      /data-label-x="([^"]+)" data-label-y="([^"]+)" data-label-width="([^"]+)" data-label-height="([^"]+)"/,
    )
    .map(Number);
  assert.ok(x >= 80 && x + width <= 373);
  assert.ok(y >= 2 && y + height <= 201);
  assert.match(svg, />Цель<\/text>/);
});
test("Цель вне шкалы имеет видимую подпись с направлением", () => {
  assert.match(make("real", true, 1000), />Цель выше шкалы ↑<\/text>/);
  assert.match(make("real", true, -1000), />Цель ниже шкалы ↓<\/text>/);
});
test("Частично видимая цель подписывается, совпадение линий не перекрывает капитал", () => {
  const partial = [
    { ...rows[0], goal: 500 },
    { ...rows[1], goal: 120 },
  ];
  const options = {
    years: 1,
    mode: "nominal",
    startYear: 2026,
    bands,
    goal: 120,
  };
  assert.match(MathicalChart(partial, options), /Часть линии цели/);
  assert.match(MathicalChart(partial, options), />Цель<\/text>/);
  const data = rows.map((row) => ({ ...row, real: 150 }));
  const svg = MathicalChart(data, { ...options, mode: "real", goal: 150 });
  const top = Number(svg.match(/data-label-y="([^"]+)"/)[1]);
  const capitalY = Number(
    svg.match(/class="capital-line" d="M[\d.]+ ([\d.]+)/)[1],
  );
  assert.ok(top + 18 < capitalY - 4 || top > capitalY + 4);
});
