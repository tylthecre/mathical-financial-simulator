/* План, варианты и настройки сохраняются одной записью localStorage. */
(function (root) {
  "use strict";
  const M = root.Mathical;
  const KEY = "mathical-v1",
    SKEY = "mathical-settings",
    TKEY = "mathical-theme";
  const SCENARIOS = ["base", "optimistic", "stress"];
  const DEFAULT_SETTINGS = {
    theme: "system",
    mode: "real",
    animations: true,
    band: true,
    accessible: false,
  };
  const decisions = { none: "Без изменений", save: "Экономия 10%" };
  const outcomes = {
    base: "Базовый",
    optimistic: "Благоприятный",
    stress: "Стрессовый",
  };
  const state = {};
  let storageOK = true;

  const isRecord = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      storageOK = false;
      return null;
    }
  };

  function cleanSettings(value) {
    const settings = { ...DEFAULT_SETTINGS, ...(isRecord(value) ? value : {}) };
    return {
      theme: ["system", "light", "dark"].includes(settings.theme)
        ? settings.theme
        : "system",
      mode: ["real", "nominal"].includes(settings.mode)
        ? settings.mode
        : "real",
      animations: settings.animations !== false,
      band: settings.band !== false,
      accessible: settings.accessible === true,
    };
  }

  function cleanSaved(list) {
    return Array.isArray(list)
      ? list
          .filter((item) => item && isRecord(item.params))
          .slice(0, 3)
          .map((item) => ({
            params: M.normalize(item.params),
            scenario: SCENARIOS.includes(item.scenario)
              ? item.scenario
              : "base",
          }))
      : [];
  }

  function cleanData(data, settings) {
    const params = M.normalize(isRecord(data.params) ? data.params : {});
    const config = cleanSettings(settings);
    const view = isRecord(data.view) ? data.view : {};
    return {
      params,
      saved: cleanSaved(data.saved),
      settings: config,
      view: {
        mode: ["real", "nominal"].includes(view.mode) ? view.mode : config.mode,
        scenario: SCENARIOS.includes(view.scenario) ? view.scenario : "base",
      },
      inflationInfo: {
        source: ["manual", "official", "personal"].includes(
          data.inflationInfo?.source,
        )
          ? data.inflationInfo.source
          : "manual",
      },
    };
  }

  function load() {
    storageOK = true;
    const stored = read(KEY),
      data = isRecord(stored) ? stored : {};
    // До объединения записи тема и настройки хранились отдельно.
    const oldSettings = data.settings === undefined ? read(SKEY) : null;
    const settings = isRecord(data.settings)
      ? data.settings
      : isRecord(oldSettings)
        ? { ...oldSettings }
        : {};
    if (!settings.theme) {
      try {
        const legacyTheme = localStorage.getItem(TKEY);
        if (legacyTheme === "light" || legacyTheme === "dark")
          settings.theme = legacyTheme;
      } catch {
        storageOK = false;
      }
    }
    Object.assign(state, cleanData(data, settings));
  }

  function snapshot() {
    return {
      params: state.params,
      saved: state.saved,
      settings: state.settings,
      view: state.view,
      inflationInfo: state.inflationInfo,
    };
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot()));
      storageOK = true;
      return true;
    } catch {
      storageOK = false;
      return false;
    }
  }

  function exportData() {
    return JSON.stringify(
      { app: "mathical", version: 1, ...snapshot() },
      null,
      2,
    );
  }

  function importData(text) {
    const data = JSON.parse(text);
    if (!isRecord(data) || data.app !== "mathical")
      throw new Error("Это не файл Mathical");
    const previous = { ...state };
    Object.assign(state, cleanData(data, data.settings ?? state.settings));
    if (persist()) return true;
    Object.assign(state, previous);
    return false;
  }

  function resetAll() {
    let removed = true;
    for (const key of [KEY, SKEY, TKEY]) {
      try {
        localStorage.removeItem(key);
      } catch {
        removed = false;
      }
    }
    load();
    if (!removed) storageOK = false;
    return removed;
  }

  root.MStore = {
    state,
    load,
    persist,
    exportData,
    importData,
    resetAll,
    decisions,
    outcomes,
    startYear: new Date().getFullYear(),
    ok: () => storageOK,
  };
})(globalThis);
