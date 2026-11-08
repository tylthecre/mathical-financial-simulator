(function (root) {
  'use strict';
  function month(s) {
    const m = /^(\d{4})-(\d{2})$/.exec(s || '');
    if (!m || +m[2] < 1 || +m[2] > 12) return null;
    return +m[1] * 12 + +m[2] - 1;
  }
  function calculate(from, to, rows) {
    const a = month(from), b = month(to);
    if (a === null || b === null || b <= a) return {error: 'Укажи два месяца: второй должен быть позже первого.'};
    const used = rows.filter(r => String(r.name || '').trim() || String(r.old ?? '').trim() || String(r.current ?? '').trim());
    if (used.length < 2) return {error: 'Недостаточно данных: добавь минимум два товара с ценами за оба месяца.'};
    if (used.some(r => !String(r.name || '').trim() || !String(r.old ?? '').trim() || !String(r.current ?? '').trim() || !Number.isFinite(+r.old) || !Number.isFinite(+r.current) || +r.old <= 0 || +r.current <= 0 || +r.old > 1000000000 || +r.current > 1000000000)) return {error: 'Для каждой позиции укажи название и обе цены больше нуля.'};
    const old = used.reduce((s, r) => s + +r.old, 0), current = used.reduce((s, r) => s + +r.current, 0);
    const period = (current / old - 1) * 100;
    const annual = (Math.pow(current / old, 12 / (b - a)) - 1) * 100;
    if (!Number.isFinite(annual)) return {error: 'Не удалось рассчитать оценку: проверь цены и период.'};
    return {period, annual, months: b - a, count: used.length};
  }
  root.MathicalInflation = {calculate};
  if (typeof module !== 'undefined') module.exports = root.MathicalInflation;
})(globalThis);
