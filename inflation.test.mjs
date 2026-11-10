import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("Изменение константы меняет показатель, ИПЦ, кнопку и значение, сохраняемое в план", () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, {});
    return elements.get(id);
  };
  const state = {
    params: { inflation: 5 },
    inflationInfo: { source: "manual" },
  };
  const data = {
    rate: 8.1,
    period: "Период",
    published: "Дата",
    rosstat: "https://rosstat.gov.ru/",
    centralBank: "https://www.cbr.ru/",
  };
  runInNewContext(
    readFileSync(new URL("js/inflation.js", import.meta.url), "utf8"),
    {
      MathicalInflation: data,
      MStore: { state },
      MUI: {
        $: (selector) => get(selector.slice(1)),
        text: (id, text) => {
          get(id).textContent = text;
        },
        save: () => true,
      },
    },
  );
  assert.equal(get("official-rate").textContent, "8,1%");
  assert.equal(get("official-index").textContent, "108,1%");
  assert.equal(get("use-official").textContent, "Использовать 8,1%");
  get("use-official").onclick();
  assert.equal(state.params.inflation, 8.1);
  assert.equal(state.inflationInfo.source, "official");
});
