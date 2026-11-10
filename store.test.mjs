import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";

function fixture(initial = {}) {
  const records = new Map(Object.entries(initial));
  let failWrite = false,
    failRemove = false;
  const context = createContext({
    localStorage: {
      getItem: (key) => records.get(key) ?? null,
      setItem(key, value) {
        if (failWrite) throw new Error("Storage is full");
        records.set(key, value);
      },
      removeItem(key) {
        if (failRemove) throw new Error("Storage is blocked");
        records.delete(key);
      },
    },
  });
  for (const file of ["engine.js", "js/store.js"]) {
    runInContext(readFileSync(new URL(file, import.meta.url), "utf8"), context);
  }
  const store = context.MStore;
  store.load();
  return {
    store,
    records,
    failWrites: () => {
      failWrite = true;
    },
    failRemovals: () => {
      failRemove = true;
    },
  };
}

test("План и настройки сохраняются одной записью и восстанавливаются вместе", () => {
  const { store, records } = fixture();
  store.state.params.salary = 200000;
  store.state.settings.theme = "dark";
  assert.equal(store.persist(), true);
  assert.equal(records.size, 1);
  store.load();
  assert.equal(store.state.params.salary, 200000);
  assert.equal(store.state.settings.theme, "dark");
});

test("Ошибка записи не изменяет прежние сохранённые данные", () => {
  const { store, records, failWrites } = fixture();
  store.persist();
  const previous = records.get("mathical-v1");
  failWrites();
  store.state.params.salary = 200000;
  assert.equal(store.persist(), false);
  assert.equal(store.ok(), false);
  assert.equal(records.get("mathical-v1"), previous);
  store.load();
  assert.equal(store.state.params.salary, 100000);
});

test("Настройки прежней версии переносятся без потери темы и плана", () => {
  const { store } = fixture({
    "mathical-v1": JSON.stringify({ params: { salary: 123456 }, saved: [] }),
    "mathical-settings": JSON.stringify({ theme: "light", accessible: true }),
  });
  assert.equal(store.state.params.salary, 123456);
  assert.equal(store.state.settings.theme, "light");
  assert.equal(store.state.settings.accessible, true);
  store.persist();
  store.load();
  assert.equal(store.state.settings.theme, "light");
});

test("Некорректная старая запись настроек не ломает загрузку темы", () => {
  const { store } = fixture({
    "mathical-settings": "1",
    "mathical-theme": "dark",
  });
  assert.equal(store.state.settings.theme, "dark");
});

test("Неудачный импорт оставляет прежний план и настройки", () => {
  const { store, failWrites } = fixture();
  store.state.settings.theme = "dark";
  store.persist();
  const previous = store.exportData();
  failWrites();
  assert.equal(
    store.importData(
      JSON.stringify({
        app: "mathical",
        version: 1,
        params: { salary: 777777 },
        settings: { theme: "light" },
      }),
    ),
    false,
  );
  assert.equal(store.exportData(), previous);
});

test("Импорт игнорирует удалённые поля и нормализует неподдерживаемые решения", () => {
  const { store } = fixture();
  const data = {
    app: "mathical",
    version: 1,
    params: { decision: "retired" },
    saved: [{ params: { decision: "retired" }, scenario: "stress" }],
    monthly: { "2026-10": { income: 90000 } },
    inflationInfo: {
      source: "personal",
      from: "2026-09",
      to: "2026-10",
      rows: [{ name: "Хлеб", old: "50", current: "55" }],
    },
  };
  assert.equal(store.importData(JSON.stringify(data)), true);
  const exported = JSON.parse(store.exportData());
  assert.equal(exported.params.decision, "none");
  assert.equal(exported.saved[0].params.decision, "none");
  assert.equal(Object.hasOwn(store.state, "monthly"), false);
  assert.equal(Object.hasOwn(exported, "monthly"), false);
  assert.deepEqual(exported.inflationInfo, { source: "personal" });
});
test("Повреждённый JSON и неподходящий файл не подменяют текущий план", () => {
  const { store } = fixture({ "mathical-v1": "broken json" });
  assert.equal(store.state.params.salary, 100000);
  const previous = store.exportData();
  assert.throws(() => store.importData("{"));
  assert.throws(() => store.importData('{"app":"another-app"}'));
  assert.equal(store.exportData(), previous);
});

test("Ошибка удаления возвращается вызывающему коду и сохраняет доступ к данным", () => {
  const { store, failRemovals } = fixture();
  store.state.params.salary = 765432;
  store.persist();
  failRemovals();
  assert.equal(store.resetAll(), false);
  assert.equal(store.ok(), false);
  assert.equal(store.state.params.salary, 765432);
});
