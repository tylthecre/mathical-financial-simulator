(function () {
  'use strict';
  const S = MStore, U = MUI, I = MathicalInflation, data = S.state.inflationInfo;
  const list = U.$('#basket-list'), from = U.$('#basket-from'), to = U.$('#basket-to'), personal = U.$('#use-personal');
  from.value = data.from; to.value = data.to;
  function row(item = {}) {
    const el = document.createElement('div'); el.className = 'basket-row';
    function input(label, type, value) {
      const box = document.createElement('label'); box.className = 'field';
      const caption = document.createElement('span'); caption.className = 'lbl'; caption.textContent = label;
      const wrap = document.createElement('span'); wrap.className = 'input-wrap';
      const field = document.createElement('input'); field.type = type; field.value = value || ''; field.setAttribute('aria-label', label);
      if (type === 'number') { field.min = '0.01'; field.max = '1000000000'; field.step = '0.01'; field.inputMode = 'decimal'; }
      else {field.maxLength = 80; field.placeholder = 'Например, молоко 1 л';}
      wrap.append(field); box.append(caption, wrap); return box;
    }
    el.append(input('Товар и единица', 'text', item.name), input('Цена в первый месяц, ₽', 'number', item.old), input('Цена во второй месяц, ₽', 'number', item.current));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-ghost btn-small'; remove.textContent = 'Удалить'; remove.setAttribute('aria-label', 'Удалить товар');
    remove.onclick = () => { el.remove(); update(); }; el.append(remove); list.append(el);
  }
  function rows() { return [...list.querySelectorAll('.basket-row')].map(el => { const f = el.querySelectorAll('input'); return {name:f[0].value, old:f[1].value, current:f[2].value}; }); }
  function current() { const labels = {manual:'своё значение', official:'официальный показатель', personal:'личная оценка'}; U.text('current-inflation', S.state.params.inflation.toLocaleString('ru-RU') + '% в год · ' + labels[data.source]); }
  function update() {
    data.from = from.value; data.to = to.value; data.rows = rows();
    const result = I.calculate(data.from, data.to, data.rows);
    if (result.error) { U.text('basket-result', result.error); personal.disabled = true; }
    else {
      const pct = n => n.toLocaleString('ru-RU', {maximumFractionDigits:2}) + '%';
      U.text('basket-result', 'За ' + result.months + ' мес.: ' + pct(result.period) + '. В годовом пересчёте: ' + pct(result.annual) + '.');
      personal.disabled = result.annual < 0 || result.annual > 30;
    }
    if (!S.persist()) U.text('basket-result', 'Браузер не сохраняет данные. Корзина будет потеряна после закрытия страницы.');
  }
  function apply(rate, source) { S.state.params.inflation = Math.round(rate * 100) / 100; data.source = source; if (S.persist()) {current(); U.toast('Значение добавлено в план');} else U.toast('Браузер запретил сохранение'); }
  (data.rows.length ? data.rows : [{},{}]).forEach(row);
  U.$('#add-basket').onclick = () => { if (list.children.length < 50) { row(); update(); } };
  list.addEventListener('input', update); from.addEventListener('input', update); to.addEventListener('input', update);
  U.$('#manual-rate').value = S.state.params.inflation;
  U.$('#use-manual').onclick = () => { const input = U.$('#manual-rate'); if (input.value === '' || !input.reportValidity()) return; apply(Number(input.value), 'manual'); };
  U.$('#use-official').onclick = () => apply(6.35, 'official');
  personal.onclick = () => { const r = I.calculate(from.value, to.value, rows()); if (!r.error && r.annual >= 0 && r.annual <= 30) apply(r.annual, 'personal'); };
  current(); update();
})();
