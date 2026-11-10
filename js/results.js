(function () {
  "use strict";
  const M = Mathical,
    S = MStore,
    U = MUI,
    { money, yearsLabel, durationLabel, pct } = MathicalFormat;
  const { outcomes, startYear } = S,
    view = S.state.view;
  let params = S.state.params,
    result;

  function updateChartYear() {
    const year = Number(U.$("#chart-year").value),
      row = result.rows[year];
    const value = view.mode === "real" ? row.real : row.balance;
    U.text("chart-readout", startYear + year + " год: " + money(value, false));
    U.$$("#capital-chart [data-year]").forEach((el) =>
      el.classList.toggle("current", Number(el.dataset.year) === year),
    );
  }
  U.$("#chart-year").addEventListener("input", updateChartYear);
  U.$("#capital-chart").addEventListener("click", (e) => {
    const dot = e.target.closest("[data-year]");
    if (dot) {
      U.$("#chart-year").value = dot.dataset.year;
      updateChartYear();
    }
  });

  function render() {
    params = M.normalize(params);
    S.state.params = params;
    const { scenario, mode } = view;
    result = M.simulate(params, scenario);
    const dist = M.distribution(params),
      { loan, spending, free } = M.budget(params);
    const capital = mode === "real" ? result.final.real : result.final.balance;

    U.text("r-years", yearsLabel(params.years));
    U.text(
      "r-lead",
      outcomes[scenario] +
        " сценарий. К концу " +
        (startYear + params.years) +
        " года капитал составит " +
        money(capital, false) +
        (mode === "real" ? " в сегодняшних рублях." : " в будущих рублях."),
    );
    U.countUp(U.$("#final-capital"), capital, money, 1500);
    U.text(
      "capital-subtitle",
      outcomes[scenario] +
        " сценарий · конец " +
        (startYear + params.years) +
        " года",
    );
    U.text(
      "chart-unit",
      mode === "real" ? "Покупательная способность" : "Номинальные суммы",
    );
    U.drawChart(
      U.$("#capital-chart"),
      MathicalChart(result.rows, {
        years: params.years,
        mode,
        startYear,
        bands: dist.bands,
        goal: params.goal,
        showBand: scenario === "base" && S.state.settings.band,
      }),
    );
    U.$("#chart-band-legend").hidden = !(
      scenario === "base" && S.state.settings.band
    );
    U.text(
      "chart-goal-note",
      U.$("#capital-chart svg").dataset.goalStatus || "",
    );
    const slider = U.$("#chart-year");
    slider.max = params.years;
    slider.value = params.years;
    updateChartYear();

    /* Бюджет */
    const share = (n, t) => pct(t ? (n / t) * 100 : 0);
    const cats = [
      ["Накопления", Math.max(0, free), "saving"],
      ["Жильё", spending.housing, "housing"],
      ["Еда и быт", spending.living, "living"],
      ["Досуг", spending.leisure, "leisure"],
      ...(loan.principal > 0 ? [["Кредит", loan.payment, "loan"]] : []),
    ];
    const total = cats.reduce((s, x) => s + x[1], 0);
    U.$("#allocation").innerHTML =
      '<div class="budget-bar" aria-hidden="true">' +
      cats
        .map(
          ([, v, c], i) =>
            '<span class="budget-' +
            c +
            '" style="width:' +
            (total ? (v / total) * 100 : 0) +
            "%;animation-delay:" +
            i * 0.12 +
            's"></span>',
        )
        .join("") +
      "</div>" +
      '<div class="budget-legend">' +
      cats
        .map(
          ([n, v, c]) =>
            '<div><span><i class="budget-key budget-' +
            c +
            '"></i>' +
            n +
            "</span><strong>" +
            share(v, total) +
            " · " +
            money(v) +
            "</strong></div>",
        )
        .join("") +
      "</div>";
    U.text(
      "budget-note",
      free < 0
        ? "Дефицит: " + money(-free, false) + "/мес. Доли показаны от расходов."
        : "В расходах учтена 1/12 годовых платежей" +
            (params.oneTime
              ? " · разовая трата " +
                money(params.oneTime, false) +
                " учтена в первый месяц прогноза"
              : "") +
            ".",
    );

    /* Цель */
    U.text("goal-title", params.goalName);
    U.text("goal-amount", money(params.goal, false) + " в сегодняшних ценах");
    const goal = M.goalPlan(params),
      monthly = Math.max(0, Math.ceil(goal.monthly - 1e-7));
    U.countUp(
      U.$("#goal-monthly"),
      monthly,
      (n) => money(n, false) + "/мес.",
      1200,
    );
    const cmp =
      monthly === 0
        ? "К сроку достаточно начальных накоплений."
        : free < 0
          ? "Сейчас расходы превышают доход."
          : monthly > free
            ? "Не хватает " +
              money(Math.ceil(monthly - free), false) +
              "/мес. к остатку на старте плана."
            : "Остатка на старте плана хватает на этот взнос.";
    U.text("goal-compare", "Срок: " + durationLabel(goal.months) + ". " + cmp);
    const progress = Math.max(
      0,
      Math.min(100, (result.final.real / params.goal) * 100),
    );
    const bar = U.$("#goal-progress");
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = progress + "%";
    }, 120);
    let gr =
      result.reached !== null
        ? result.reached === 0
          ? "Общего капитала уже достаточно для цели"
          : "Общий капитал впервые достигнет стоимости цели в " +
            (startYear + result.reached)
        : "Весь капитал: " +
          Math.round(progress) +
          "% стоимости цели к " +
          (startYear + params.years);
    if (result.reached !== null && result.final.real < params.goal)
      gr =
        "Общий капитал достигал стоимости цели ранее, но к концу прогноза его недостаточно";
    if (goal.months < 12)
      gr =
        "График показывает общий капитал по годам; срок цели — " +
        durationLabel(goal.months) +
        ".";
    U.text("goal-result", gr);

    /* Диапазон */
    U.text("p10", money(dist.low));
    U.text("p50", money(dist.median));
    U.text("p90", money(dist.high));

    /* Здоровье */
    const health = M.financialHealth(params);
    U.text("health-free", money(free, false) + "/мес.");
    U.text(
      "health-rate",
      params.salary <= 0
        ? "Нет дохода"
        : free < 0
          ? "Нет сбережений"
          : pct((free / params.salary) * 100),
    );
    U.text("health-essential", money(health.essential, false) + "/мес.");
    U.text(
      "health-reserve",
      health.reserveMonths === null
        ? "Укажи расходы"
        : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(
            health.reserveMonths,
          ) + " мес.",
    );
    const hn =
      params.essentialOther > 0
        ? "На старте плана: жильё, указанная часть остальных расходов" +
          (loan.principal > 0 ? " и кредит" : "") +
          ". Без будущих доходов и инфляции."
        : params.housing > 0 || loan.principal > 0
          ? "В расчёте: " +
            (params.housing > 0 ? "жильё" : "") +
            (params.housing > 0 && loan.principal > 0 ? " и " : "") +
            (loan.principal > 0 ? "кредит" : "") +
            ". Другие обязательные расходы можно указать в плане."
          : "Укажи обязательные расходы в плане, чтобы рассчитать запас.";
    U.text(
      "health-note",
      hn + (params.oneTime > 0 ? " Разовая трата вычтена из накоплений." : ""),
    );

    /* Кредит */
    U.$("#loan-empty").hidden = loan.principal > 0;
    U.$("#loan-metrics").hidden = loan.principal <= 0;
    U.$("#loan-note").hidden = loan.principal <= 0;
    if (loan.principal > 0) {
      U.text("loan-payment", money(loan.payment, false));
      U.text("loan-overpayment", money(loan.overpayment, false));
      U.text(
        "loan-ratio",
        params.salary > 0
          ? pct((loan.payment / params.salary) * 100)
          : "Нет дохода",
      );
    }

    /* Состояние элементов управления */
    U.$$("#years [data-years]").forEach((b) => {
      const on = Number(b.dataset.years) === params.years;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", String(on));
    });
    U.$$("#money-mode [data-mode]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.mode === mode),
    );
    U.$("#scenario").value = scenario;
    U.reveal();
  }

  function saveView() {
    U.save();
    render();
  }
  U.$$("#years [data-years]").forEach(
    (b) =>
      (b.onclick = () => {
        params.years = Number(b.dataset.years);
        saveView();
      }),
  );
  U.$$("#money-mode [data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        view.mode = b.dataset.mode;
        saveView();
      }),
  );
  U.$("#scenario").onchange = (e) => {
    view.scenario = e.target.value;
    saveView();
  };
  render();
})();
