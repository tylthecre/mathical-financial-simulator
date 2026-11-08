/* Общее хранилище: параметры плана, сохранённые варианты, настройки сайта. */
(function (root) {
  'use strict';
  const M = root.Mathical, KEY = 'mathical-v1', SKEY = 'mathical-settings', TKEY = 'mathical-theme';
  const SCEN = ['base', 'optimistic', 'stress'];
  const DEFAULT_SETTINGS = {theme: 'system', mode: 'real', animations: true, band: true};
  const decisions = {none: 'Без изменений', save: 'Экономия 10%', education: 'Обучение', car: 'Автомобиль'};
  const outcomes = {base: 'Базовый', optimistic: 'Благоприятный', stress: 'Стрессовый'};
  const startYear = new Date().getFullYear();
  let storageOK = true;
  const state = {};

  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { storageOK = false; return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { storageOK = false; return false; } };

  function cleanSettings(s) {
    const o = {...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {})};
    return {
      theme: ['system', 'light', 'dark'].includes(o.theme) ? o.theme : 'system',
      mode: ['real', 'nominal'].includes(o.mode) ? o.mode : 'real',
      animations: o.animations !== false,
      band: o.band !== false
    };
  }
  function cleanSaved(list) {
    return Array.isArray(list)
      ? list.slice(0, 3).filter(x => x && x.params && typeof x.params === 'object')
          .map(x => ({params: M.normalize(x.params), scenario: SCEN.includes(x.scenario) ? x.scenario : 'base'}))
      : [];
  }
  function cleanInflation(value) {
    const v = value && typeof value === 'object' ? value : {};
    const rows = Array.isArray(v.rows) ? v.rows.slice(0, 50).map(r => ({name: String(r?.name || '').slice(0, 80), old: String(r?.old ?? '').slice(0, 16), current: String(r?.current ?? '').slice(0, 16)})) : [];
    return {rows, from: /^\d{4}-\d{2}$/.test(v.from || '') ? v.from : '', to: /^\d{4}-\d{2}$/.test(v.to || '') ? v.to : '', source: ['manual','official','personal'].includes(v.source) ? v.source : 'manual'};
  }
  function cleanMonthly(value) {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [month, row] of Object.entries(value)) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !row || typeof row !== 'object') continue;
      out[month] = {};
      for (const key of ['income','housing','living','leisure','other']) {
        const n = Number(row[key]); out[month][key] = Number.isFinite(n) && n >= 0 && n <= 1000000000 ? n : 0;
      }
    }
    return out;
  }
  function load() {
    const data = read(KEY) || {}, s = read(SKEY) || {};
    let legacy = null;
    try { legacy = localStorage.getItem(TKEY); } catch {}
    if (!s.theme && (legacy === 'light' || legacy === 'dark')) s.theme = legacy;
    state.settings = cleanSettings(s);
    state.params = M.normalize(data.params && typeof data.params === 'object' ? data.params : {});
    state.saved = cleanSaved(data.saved);
    state.monthly = cleanMonthly(data.monthly);
    state.inflationInfo = cleanInflation(data.inflationInfo);
    const v = data.view && typeof data.view === 'object' ? data.view : {};
    state.view = {
      mode: ['real', 'nominal'].includes(v.mode) ? v.mode : state.settings.mode,
      scenario: SCEN.includes(v.scenario) ? v.scenario : 'base'
    };
  }
  function persist() {
    storageOK = true;
    write(KEY, {params: state.params, saved: state.saved, view: state.view, inflationInfo: state.inflationInfo, monthly: state.monthly});
    write(SKEY, state.settings);
    return storageOK;
  }
  /* Производные значения бюджета для текущих параметров. */
  function derive(input) {
    const p = M.normalize(input);
    const annualTotal = p.annual + p.annualItems.reduce((s, x) => s + x.amount, 0);
    const factor = p.decision === 'save' ? .9 : 1;
    const loan = M.loanTerms(p);
    const expense = p.housing + p.living + p.leisure + annualTotal / 12;
    const spent = expense * factor + loan.payment;
    return {p, annualTotal, factor, loan, expense, spent, free: p.salary - spent};
  }
  function exportData() {
    return JSON.stringify({app: 'mathical', version: 1, params: state.params, saved: state.saved, settings: state.settings, inflationInfo: state.inflationInfo, monthly: state.monthly}, null, 2);
  }
  function importData(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || data.app !== 'mathical') throw new Error('Это не файл Mathical');
    state.params = M.normalize(data.params && typeof data.params === 'object' ? data.params : {});
    state.saved = cleanSaved(data.saved);
    state.monthly = cleanMonthly(data.monthly);
    state.inflationInfo = cleanInflation(data.inflationInfo);
    if (data.settings) state.settings = cleanSettings(data.settings);
    state.view = {mode: state.settings.mode, scenario: 'base'};
    return persist();
  }
  function resetAll() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); localStorage.removeItem(TKEY); } catch {}
    load();
  }
  root.MStore = {state, load, persist, derive, exportData, importData, resetAll, cleanSettings, decisions, outcomes, startYear, ok: () => storageOK};
})(globalThis);
