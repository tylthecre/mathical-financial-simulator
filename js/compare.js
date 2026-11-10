import * as M from "../engine.js";
import { isArchived, simulateSaved } from "./archive.js";
import * as S from "./store.js";
import * as U from "./ui.js";
import { money, yearsLabel } from "../format.js";
const { decisions, outcomes, startYear } = S,
  view = S.state.view;
let params = S.state.params,
  saved = S.state.saved,
  result;

function variantCard(item, i) {
  const label = item.current ? "Сейчас" : "Вариант " + i;
  const archived = !item.current && isArchived(item.params.decision);
  const buttons = item.current
    ? '<button class="btn btn-dark btn-small" data-act="save" type="button">Сохранить вариант +</button>'
    : (archived
        ? ""
        : '<button class="btn btn-dark btn-small" data-act="load" data-i="' +
          (i - 1) +
          '" type="button">Загрузить</button>') +
      '<button class="btn btn-ghost btn-small" style="color:inherit;box-shadow:inset 0 0 0 1.5px #0003" data-act="del" data-i="' +
      (i - 1) +
      '" type="button" aria-label="Удалить вариант ' +
      i +
      '">Удалить</button>';
  return (
    '<div class="card variant hover-lift reveal' +
    (item.current ? " current lime" : "") +
    '" style="--d:' +
    i * 0.08 +
    's"><span class="badge">' +
    label +
    "</span><h3>" +
    (archived ? "Архивный вариант" : decisions[item.params.decision]) +
    "</h3>" +
    (archived
      ? "<small>Старый сценарий сохранён для просмотра; загрузка недоступна.</small>"
      : "") +
    "<small>" +
    outcomes[item.scenario] +
    " · " +
    yearsLabel(item.params.years) +
    " · " +
    money(item.params.salary) +
    "/мес.</small>" +
    '<div class="val">' +
    money(item.value) +
    '</div><div class="bar"><i data-w="' +
    item.pct +
    '"></i></div><div class="btn-row">' +
    buttons +
    "</div></div>"
  );
}

function renderVariants() {
  const items = [
    { current: true, params, scenario: view.scenario },
    ...saved.map((s) => ({ params: s.params, scenario: s.scenario })),
  ];
  items.forEach((it) => {
    it.value = simulateSaved(it.params, it.scenario).final.real;
  });
  const max = Math.max(1, ...items.map((i) => Math.max(0, i.value)));
  items.forEach((it) => {
    it.pct = Math.max(2, (Math.max(0, it.value) / max) * 100);
  });
  const empty = Math.max(0, 3 - saved.length);
  const box = U.$("#variants");
  box.innerHTML =
    items.map((it, i) => variantCard(it, i)).join("") +
    Array.from(
      { length: empty },
      (_, k) =>
        '<div class="slot reveal" style="--d:' +
        (items.length + k) * 0.08 +
        's">Свободное место.<br>Сохрани текущий план, чтобы сравнить его с другим решением.</div>',
    ).join("");
  U.reveal();
  setTimeout(
    () =>
      U.$$("#variants .bar > i").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      }),
    150,
  );
}

function renderDecision() {
  const { scenario } = view,
    base = M.simulate({ ...params, decision: "none" }, scenario);
  result = M.simulate(params, scenario);
  const delta = result.final.real - base.final.real;
  const desc = {
    none: "Базовый план без изменений. Выбери решение выше, чтобы увидеть его эффект.",
    save: "Регулярные расходы ниже на 10%; платёж по кредиту не меняется.",
  };
  U.$("#decision-insight").innerHTML =
    desc[params.decision] +
    (params.decision === "none"
      ? ""
      : " Разница через " +
        yearsLabel(params.years) +
        ": <b>" +
        (delta >= 0 ? "+" : "") +
        money(delta, false) +
        "</b> в сегодняшних рублях.");
  U.$$("[data-decision]").forEach((b) =>
    b.classList.toggle("active", b.dataset.decision === params.decision),
  );
  U.text(
    "table-sub",
    outcomes[scenario] +
      " сценарий · " +
      yearsLabel(params.years) +
      " · " +
      decisions[params.decision],
  );
  U.$("#year-table").innerHTML = result.rows
    .map(
      (r) =>
        "<tr><td>" +
        (startYear + r.year) +
        (r.event ? " *" : "") +
        "</td><td>" +
        money(r.income, false) +
        "</td><td>" +
        money(r.expenses, false) +
        "</td><td>" +
        money(r.interest, false) +
        "</td><td>" +
        money(r.balance, false) +
        "</td><td>" +
        money(r.real, false) +
        "</td></tr>" +
        (r.event
          ? '<tr><td class="ev" colspan="6">* ' + r.event + "</td></tr>"
          : ""),
    )
    .join("");
}

function render() {
  renderDecision();
  renderVariants();
}

U.$$("[data-decision]").forEach(
  (b) =>
    (b.onclick = () => {
      params = M.normalize({ ...params, decision: b.dataset.decision });
      S.state.params = params;
      S.persist();
      render();
    }),
);
U.$("#variants").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const i = Number(b.dataset.i);
  if (b.dataset.act === "save") {
    if (saved.length >= 3) {
      U.toast(
        "Можно сохранить три варианта. Удали один, чтобы добавить новый.",
      );
      return;
    }
    saved.push({ params: M.normalize(params), scenario: view.scenario });
    S.persist();
    render();
    U.toast("Вариант добавлен к сравнению");
  } else if (b.dataset.act === "load") {
    const item = saved[i];
    params = M.normalize(item.params);
    view.scenario = item.scenario;
    S.state.params = params;
    S.persist();
    render();
    U.toast("Параметры варианта загружены");
  } else if (b.dataset.act === "del") {
    saved.splice(i, 1);
    S.persist();
    renderVariants();
    U.toast("Вариант удалён");
  }
});

U.$("#export").onclick = () => {
  const quote = (s) => '"' + String(s).replaceAll('"', '""') + '"';
  const rows = [
    ["Mathical — учебный расчёт"],
    ["Сценарий", outcomes[view.scenario]],
    ["Решение", decisions[params.decision]],
    ["Цель", params.goalName, params.goal],
    ["Начальный год", startYear],
    ...Object.entries(params).filter(([, v]) => typeof v === "number"),
    [
      "Год",
      "Доход",
      "Расход",
      "Доход на капитал",
      "Капитал номинальный",
      "Капитал в сегодняшних рублях",
      "Цена цели",
      "Событие",
    ],
    ...result.rows.map((r) => [
      startYear + r.year,
      ...[r.income, r.expenses, r.interest, r.balance, r.real, r.goal].map(
        (n) => Math.round(n),
      ),
      r.event,
    ]),
  ];
  const blob = new Blob(
    ["\uFEFF" + rows.map((r) => r.map(quote).join(";")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  U.download(
    blob,
    "mathical-" + startYear + "-" + (startYear + params.years) + ".csv",
  );
  U.toast("Расчёт подготовлен для скачивания");
};
U.$("#share-image").onclick = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d"),
    capital = view.mode === "real" ? result.final.real : result.final.balance;
  ctx.fillStyle = "#10172d";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#f5bdd8";
  ctx.font = "700 48px Onest, sans-serif";
  ctx.fillText("mathical", 70, 90);
  ctx.fillStyle = "#fff3dc";
  ctx.font = "500 35px Onest, sans-serif";
  ctx.fillText("Мой финансовый план", 70, 190);
  ctx.font = "500 30px Onest, sans-serif";
  ctx.fillText("Через " + yearsLabel(params.years) + " мой капитал", 70, 280);
  ctx.fillStyle = "#afe6d1";
  ctx.font = "700 84px Onest, sans-serif";
  ctx.fillText(money(capital), 70, 385, 1060);
  ctx.fillStyle = "#d7dccc";
  ctx.font = "400 27px Onest, sans-serif";
  ctx.fillText(
    (view.mode === "real" ? "В сегодняшних рублях" : "В будущих рублях") +
      " · " +
      outcomes[view.scenario] +
      " сценарий",
    70,
    450,
    1060,
  );
  ctx.font = "400 23px Onest, sans-serif";
  ctx.fillText("Учебная модель, а не финансовый прогноз", 70, 550);
  canvas.toBlob((blob) => {
    if (!blob) {
      U.toast("Не удалось создать изображение");
      return;
    }
    U.download(blob, "mathical-plan.png");
    U.toast("Картинка подготовлена для скачивания");
  }, "image/png");
};
render();
