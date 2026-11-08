(function () {
  'use strict';
  const S = MStore, U = MUI, cfg = () => S.state.settings;

  function sync() {
    const st = cfg();
    U.$$('#s-theme button').forEach(b => b.classList.toggle('selected', b.dataset.v === st.theme));
    U.$$('#s-mode button').forEach(b => b.classList.toggle('selected', b.dataset.v === st.mode));
    U.$('#s-anim').setAttribute('aria-checked', String(st.animations));
    U.$('#s-band').setAttribute('aria-checked', String(st.band));
    U.text('s-storage', S.ok() ? 'Данные хранятся только в этом браузере и никуда не отправляются.' : 'Браузер запретил хранение — настройки и план не сохранятся после закрытия страницы.');
  }
  function change(key, value, message) {
    cfg()[key] = value;
    if (key === 'mode') S.state.view.mode = value;
    S.persist();
    U.applyTheme();
    sync();
    U.toast(message || 'Сохранено');
  }
  U.$$('#s-theme button').forEach(b => b.onclick = () => change('theme', b.dataset.v));
  U.$$('#s-mode button').forEach(b => b.onclick = () => change('mode', b.dataset.v));
  U.$('#s-anim').onclick = () => change('animations', !cfg().animations, cfg().animations ? 'Анимации выключены' : 'Анимации включены');
  U.$('#s-band').onclick = () => change('band', !cfg().band);

  U.$('#s-export').onclick = () => {
    U.download(new Blob([S.exportData()], {type: 'application/json'}), 'mathical-data.json');
    U.toast('Файл с данными подготовлен');
  };
  U.$('#s-import').onclick = () => U.$('#s-file').click();
  U.$('#s-file').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { S.importData(String(reader.result)); U.applyTheme(); sync(); U.toast('Данные загружены'); }
      catch { U.toast('Не удалось прочитать файл. Нужен файл, скачанный из Mathical.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const wipe = U.$('#s-wipe');
  let armed = 0;
  wipe.onclick = () => {
    if (!armed) {
      wipe.textContent = 'Точно удалить?';
      armed = setTimeout(() => { armed = 0; wipe.textContent = 'Удалить всё'; }, 4000);
      return;
    }
    clearTimeout(armed); armed = 0;
    S.resetAll();
    U.applyTheme(); sync();
    wipe.textContent = 'Удалить всё';
    U.toast('Все данные удалены');
  };
  sync();
})();
