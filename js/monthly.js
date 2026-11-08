(function () {
  'use strict';
  const S = MStore, U = MUI, form = U.$('#monthly-form'), month = U.$('#monthly-month');
  const names = ['income', 'housing', 'living', 'leisure', 'other', 'unexpected'];
  const money = MathicalFormat.money;
  let current, dirty = false;
  function selectView(monthly) {
    U.$('#ordinary-plan').hidden = monthly; U.$('#monthly-view').hidden = !monthly;
    U.text('plan-lead', monthly ? 'Укажи доходы и расходы за месяц и сравни остаток с взносом на цель.' : 'Заполни поля — справа сразу видно, сколько остаётся в месяц. Когда будет готово, нажми «Применить».');
    for (const [id, active] of [['show-plan', !monthly], ['show-monthly', monthly]]) {
      const button = U.$('#' + id); button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
    }
  }
  U.$('#show-plan').onclick = () => selectView(false);
  U.$('#show-monthly').onclick = () => { selectView(true); totals(); };
  U.$('#monthly-goal-edit').onclick = () => { selectView(false); U.$('#plan-goal').scrollIntoView({block: 'center', behavior: 'smooth'}); document.querySelector('[name=goalName]').focus({preventScroll: true}); };
  function totals() {
    const values = Object.fromEntries(names.map(name => [name, Number(form.elements[name].value) || 0]));
    const expenses = values.housing + values.living + values.leisure + values.other + values.unexpected;
    const balance = values.income - expenses;
    U.text('monthly-label', balance < 0 ? 'Дефицит за месяц' : 'Остаток за месяц');
    U.text('monthly-balance', money(Math.abs(balance), false));
    U.text('monthly-income', money(values.income, false)); U.text('monthly-expenses', money(expenses, false));
    const params = S.state.params, payment = Math.max(0, Math.ceil(Mathical.goalPlan(params).monthly - 1e-7));
    U.text('monthly-goal-title', params.goalName);
    U.text('monthly-goal-payment', money(payment, false) + '/мес.');
    const hasData = Boolean(S.state.monthly[month.value]) || names.some(name => form.elements[name].value !== '');
    let message;
    if (!hasData) message = 'Введи доход и расходы за месяц, чтобы сравнить остаток с взносом.';
    else if (names.some(name => !form.elements[name].validity.valid)) message = 'Проверь суммы за месяц, чтобы сравнить их с взносом.';
    else if (payment === 0) message = 'К сроку достаточно уже имеющихся накоплений.';
    else if (balance < 0) message = 'Расходы превышают доход. На взнос в этом месяце остатка нет.';
    else if (balance < payment) message = 'До нужного взноса не хватает ' + money(Math.ceil(payment - balance), false) + '.';
    else message = 'В этом месяце остатка хватает на взнос.';
    U.text('monthly-goal-result', message);
  }
  function load() {
    current = month.value; dirty = false;
    const row = S.state.monthly[current];
    for (const name of names) form.elements[name].value = row ? row[name] : '';
    totals(); U.text('monthly-status', row ? 'Сохранённые данные загружены.' : 'За этот месяц записей пока нет.');
  }
  const now = new Date(); month.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  month.addEventListener('change', () => {
    if (dirty && !confirm('Изменения за текущий месяц не сохранены. Перейти к другому месяцу?')) { month.value = current; return; }
    load();
  });
  form.addEventListener('input', e => { if (e.target === month) return; dirty = true; totals(); U.text('monthly-status', 'Изменения ещё не сохранены.'); });
  form.addEventListener('submit', e => {
    e.preventDefault(); if (!form.reportValidity()) return;
    const previous = S.state.monthly[current];
    S.state.monthly[current] = Object.fromEntries(names.map(name => [name, Number(form.elements[name].value) || 0]));
    if (!S.persist()) {
      if (previous) S.state.monthly[current] = previous; else delete S.state.monthly[current];
      U.text('monthly-status', 'Не удалось сохранить данные в браузере.'); return;
    }
    dirty = false; U.text('monthly-status', 'Месяц сохранён в этом браузере.');
  });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load();
})();
