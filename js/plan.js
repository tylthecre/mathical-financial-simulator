(function () {
  "use strict";
  const M = Mathical,
    S = MStore,
    U = MUI,
    { money } = MathicalFormat;
  const form = U.$("#plan-form"),
    f = form.elements,
    list = U.$("#annual-items-list");
  const num = (name) => Number(f[name].value) || 0;
  let decision = S.state.params.decision;

  function readParams() {
    const { goalMonthsPart, ...values } = Object.fromEntries(
      new FormData(form),
    );
    return M.normalize({
      ...S.state.params,
      ...values,
      decision,
      goalMonths: Number(values.goalYears) * 12 + Number(goalMonthsPart),
      annualItems: readItems(),
    });
  }

  function readItems() {
    return U.$$(".annual-item")
      .map((row) => ({
        name: row.querySelector(".annual-name").value.trim(),
        amount: Number(row.querySelector(".annual-amount").value) || 0,
      }))
      .filter((x) => x.name || x.amount);
  }
  function addItem(item = { name: "", amount: 0 }) {
    const row = document.createElement("div");
    row.className = "annual-item";
    const name = document.createElement("input");
    name.className = "annual-name";
    name.placeholder = "Название платежа";
    name.maxLength = 80;
    name.value = item.name;
    name.setAttribute("aria-label", "Название годового платежа");
    const amount = document.createElement("input");
    amount.className = "annual-amount";
    amount.type = "number";
    amount.min = "0";
    amount.max = "120000000";
    amount.step = "1";
    amount.required = true;
    amount.placeholder = "₽ в год";
    amount.value = item.amount || "";
    amount.setAttribute("aria-label", "Сумма годового платежа");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Удалить";
    remove.onclick = () => {
      row.remove();
      update();
    };
    row.append(name, amount, remove);
    list.append(row);
  }

  function update() {
    const annual =
      num("annual") + readItems().reduce((s, x) => s + x.amount, 0);
    const other = num("living") + num("leisure") + annual / 12;
    const err =
      num("essentialOther") > other + 1e-7
        ? "Сумма не может превышать остальные расходы в месяц: " +
          money(other, false) +
          "."
        : "";
    f.essentialOther.setCustomValidity(err);
    f.essentialOther.setAttribute("aria-invalid", String(Boolean(err)));
    U.$("#essential-error").textContent = err;
    U.$("#essential-error").hidden = !err;

    const goalDuration = num("goalYears") * 12 + num("goalMonthsPart");
    const durationError =
      goalDuration < 1
        ? "Укажи срок цели хотя бы 1 месяц."
        : goalDuration > 600
          ? "Срок цели не может превышать 50 лет."
          : "";
    f.goalMonthsPart.setCustomValidity(durationError);
    f.goalMonthsPart.setAttribute(
      "aria-invalid",
      String(Boolean(durationError)),
    );
    U.$("#goal-duration-error").textContent = durationError;
    U.$("#goal-duration-error").hidden = !durationError;

    const availableForGoal = Math.max(0, num("initial") - num("oneTime"));
    const goalError =
      f.goalInitial.value !== "" &&
      Number(f.goalInitial.value) > availableForGoal
        ? "Не больше доступных накоплений после разовой траты: " +
          money(availableForGoal, false) +
          "."
        : "";
    f.goalInitial.setCustomValidity(goalError);
    f.goalInitial.setAttribute("aria-invalid", String(Boolean(goalError)));
    U.$("#goal-initial-error").textContent = goalError;
    U.$("#goal-initial-error").hidden = !goalError;

    const { p, spent: expenses, free } = M.budget(readParams());
    const income = p.salary;
    U.countUp(U.$("#sum-free"), free, (n) => money(n, false), 450);
    U.text("sum-income", money(income, false));
    U.text("sum-expenses", money(expenses, false));
    const total = Math.max(income, expenses, 1);
    const eb = U.$("#mb-exp"),
      fb = U.$("#mb-free");
    eb.className = free < 0 ? "def" : "exp";
    eb.style.width = (Math.min(expenses, total) / total) * 100 + "%";
    fb.style.width = (Math.max(0, free) / total) * 100 + "%";
    const note =
      free < 0
        ? "Расходы больше дохода — накопления не растут."
        : free === 0
          ? "Весь доход уходит на расходы."
          : "Столько остаётся на накопления и цель.";
    U.text(
      "sum-note",
      note +
        (decision === "save"
          ? " Включена экономия 10% из раздела «Сравнение»."
          : ""),
    );
    U.$$("#years-quick button").forEach((b) =>
      b.classList.toggle(
        "selected",
        Number(b.dataset.years) === Number(f.years.value),
      ),
    );
  }

  function fill(params) {
    decision = params.decision;
    for (const [k, v] of Object.entries(params)) {
      const el = f.namedItem(k);
      if (el && "value" in el) el.value = v;
    }
    f.goalInitial.value = params.goalInitial == null ? "" : params.goalInitial;
    f.goalYears.value = Math.floor(params.goalMonths / 12);
    f.goalMonthsPart.value = params.goalMonths % 12;
    list.replaceChildren();
    params.annualItems.forEach(addItem);
    U.$("#credit-card").open = params.loanPrincipal > 0;
    U.$("#sum-free")._v = NaN;
    update();
  }

  form.addEventListener("input", update);
  form.addEventListener(
    "invalid",
    (e) => {
      const parent = e.target.closest("details");
      if (parent) parent.open = true;
      e.target.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    true,
  );
  U.$("#add-annual-item").onclick = () => {
    if (U.$$(".annual-item").length < 50) {
      addItem();
      update();
      const last = U.$$(".annual-name").pop();
      if (last) last.focus();
    }
  };
  U.$$("#years-quick button").forEach(
    (b) =>
      (b.onclick = () => {
        f.years.value = b.dataset.years;
        update();
      }),
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    update();
    if (!form.reportValidity()) return;
    const previous = {
      params: S.state.params,
      inflationInfo: S.state.inflationInfo,
    };
    S.state.params = readParams();
    if (Number(f.inflation.value) !== Number(previous.params.inflation)) {
      S.state.inflationInfo = { ...previous.inflationInfo, source: "manual" };
    }
    if (!U.save("План сохранён — смотрим результаты")) {
      Object.assign(S.state, previous);
      return;
    }
    setTimeout(() => U.go("results.html"), 650);
  });
  U.$("#plan-reset").onclick = () => {
    fill(M.normalize({}));
    U.toast(
      "Пример восстановлен. Нажми «Посмотреть результат», чтобы сохранить.",
    );
  };

  fill(S.state.params);
  if (location.hash === "#credit") {
    U.$("#credit-card").open = true;
    setTimeout(() => {
      U.$("#credit-card").scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      f.loanPrincipal.focus({ preventScroll: true });
    }, 500);
  }
})();
