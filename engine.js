/* Mathical — прозрачная учебная модель. Без внешних запросов. */
(function (root) {
  "use strict";
  const defaults = {
    salary: 100000,
    housing: 25000,
    living: 20000,
    leisure: 10000,
    annual: 0,
    oneTime: 0,
    essentialOther: 0,
    initial: 200000,
    growth: 6,
    inflation: 5,
    rate: 7,
    years: 15,
    goal: 3000000,
    goalYears: 5,
    loanPrincipal: 0,
    loanRate: 0,
    loanMonths: 12,
    goalName: "Первый взнос на квартиру",
    decision: "none",
  };
  const bounds = {
    salary: [0, 10000000],
    housing: [0, 10000000],
    living: [0, 10000000],
    leisure: [0, 10000000],
    annual: [0, 120000000],
    oneTime: [0, 1000000000],
    essentialOther: [0, 1000000000],
    initial: [0, 1000000000],
    growth: [-20, 30],
    inflation: [0, 30],
    rate: [-20, 30],
    years: [1, 50],
    goal: [1, 1000000000],
    goalYears: [1, 50],
    loanPrincipal: [0, 1000000000],
    loanRate: [0, 100],
    loanMonths: [1, 600],
  };
  function normalize(input) {
    const p = { ...defaults, ...input };
    delete p.profession; // Drop obsolete presets from previously saved plans.
    for (const [key, [min, max]] of Object.entries(bounds)) {
      const n = Number(p[key]);
      p[key] = Number.isFinite(n)
        ? Math.min(max, Math.max(min, n))
        : defaults[key];
    }
    // Пустое значение сохраняет прежний расчёт: все накопления после разовой траты.
    const allocation = p.goalInitial;
    const available = Math.max(0, p.initial - p.oneTime);
    p.goalInitial =
      allocation === null ||
      allocation === undefined ||
      allocation === "" ||
      !Number.isFinite(Number(allocation))
        ? null
        : Math.min(available, Math.max(0, Number(allocation)));
    p.annualItems = Array.isArray(p.annualItems)
      ? p.annualItems
          .slice(0, 50)
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            name: String(x.name || "").slice(0, 80),
            amount: Math.min(120000000, Math.max(0, Number(x.amount) || 0)),
          }))
      : [];
    const otherSpending =
      p.living +
      p.leisure +
      (p.annual + p.annualItems.reduce((sum, x) => sum + x.amount, 0)) / 12;
    p.essentialOther = Math.min(p.essentialOther, otherSpending);
    p.years = Math.round(p.years);
    // Старые планы хранят срок в годах, новые — точное число месяцев.
    const rawGoalMonths = input && input.goalMonths;
    const hasGoalMonths =
      rawGoalMonths !== undefined &&
      rawGoalMonths !== null &&
      rawGoalMonths !== "" &&
      Number.isFinite(Number(rawGoalMonths));
    p.goalMonths = hasGoalMonths
      ? Math.min(600, Math.max(1, Math.round(Number(rawGoalMonths))))
      : Math.round(p.goalYears) * 12;
    p.goalYears = p.goalMonths / 12;
    p.loanMonths = Math.round(p.loanMonths);
    p.goalName = String(p.goalName || defaults.goalName).slice(0, 80);
    if (!["none", "save"].includes(p.decision)) p.decision = "none";
    return p;
  }
  // Аннуитет: равный ежемесячный платёж, годовая ставка / 12.
  function loanTerms(input) {
    const p = normalize(input),
      principal = p.loanPrincipal,
      months = p.loanMonths;
    const rate = p.loanRate / 1200;
    const payment =
      principal === 0
        ? 0
        : rate === 0
          ? principal / months
          : (principal * rate) / -Math.expm1(-months * Math.log1p(rate));
    return {
      principal,
      months,
      payment,
      total: payment * months,
      overpayment: Math.max(0, payment * months - principal),
    };
  }
  // Бюджет на старте плана; кредит не уменьшается при экономии.
  function budget(input) {
    const p = normalize(input);
    const annualTotal =
      p.annual + p.annualItems.reduce((sum, item) => sum + item.amount, 0);
    const factor = p.decision === "save" ? 0.9 : 1;
    const loan = loanTerms(p);
    const spending = {
      housing: p.housing * factor,
      living: (p.living + annualTotal / 12) * factor,
      leisure: p.leisure * factor,
    };
    const spent =
      spending.housing + spending.living + spending.leisure + loan.payment;
    return { p, loan, spending, spent, free: p.salary - spent };
  }
  // Фиксированный номинальный взнос в конце месяца для цели на выбранный срок.
  function goalPlan(input) {
    const p = normalize(input),
      months = p.goalMonths;
    const target = p.goal * Math.pow(1 + p.inflation / 100, months / 12);
    const monthlyRate = Math.pow(1 + p.rate / 100, 1 / 12) - 1;
    const starting =
      p.goalInitial === null ? p.initial - p.oneTime : p.goalInitial;
    function projected(contribution) {
      let balance = starting;
      for (let i = 0; i < months; i++)
        balance += Math.max(0, balance) * monthlyRate + contribution;
      return balance;
    }
    if (projected(0) >= target) return { monthly: 0, target, months };
    let low = 0,
      high = Math.max(1, target / months);
    while (projected(high) < target) high *= 2;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (projected(mid) >= target) high = mid;
      else low = mid;
    }
    return { monthly: high, target, months };
  }
  function financialHealth(input) {
    const p = normalize(input);
    const factor = p.decision === "save" ? 0.9 : 1;
    const essential =
      (p.housing + p.essentialOther) * factor + loanTerms(p).payment;
    const available = Math.max(0, p.initial - p.oneTime);
    return {
      essential,
      available,
      reserveMonths: essential > 0 ? available / essential : null,
    };
  }
  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function simulate(input, scenario = "base", seed = 42) {
    const { p, loan, spending: categories } = budget(input),
      rng = random(seed);
    const spending =
      categories.housing + categories.living + categories.leisure;
    let balance = p.initial,
      prices = 1,
      salary = p.salary;
    const rows = [
      {
        year: 0,
        balance,
        real: balance,
        prices,
        goal: p.goal,
        income: 0,
        expenses: 0,
        interest: 0,
        event: "",
      },
    ];
    let reached = balance >= p.goal ? 0 : null;
    for (let year = 1; year <= p.years; year++) {
      let inf = p.inflation,
        growth = p.growth,
        rate = p.rate,
        lost = 0;
      if (scenario === "optimistic") {
        inf = Math.max(0, inf - 1.5);
        growth += 1;
        rate += 2;
      }
      if (scenario === "stress") {
        inf += 2;
        growth -= 1;
        rate -= 3;
        if (year === 4) lost = 3;
      }
      if (scenario === "random") {
        inf = Math.max(0, inf + (rng() - 0.5) * 4);
        growth += (rng() - 0.5) * 2;
        rate += (rng() - 0.5) * 12;
        lost = rng() < 0.08 ? 2 : 0;
      }
      const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
      const monthlyInflation = Math.pow(1 + inf / 100, 1 / 12);
      let income = 0,
        expenses = 0,
        interest = 0;
      const event = lost ? `${lost} мес. без дохода` : "";
      for (let month = 1; month <= 12; month++) {
        // Salary is indexed at each year end; spending and target grow monthly.
        prices *= monthlyInflation;
        const pay = month <= lost ? 0 : salary;
        let cost = spending * prices;
        if ((year - 1) * 12 + month <= loan.months) cost += loan.payment;
        if (year === 1 && month === 1) cost += p.oneTime;
        const earned = Math.max(0, balance) * monthlyRate;
        balance += earned + pay - cost;
        income += pay;
        expenses += cost;
        interest += earned;
      }
      salary *= 1 + growth / 100;
      rows.push({
        year,
        balance,
        real: balance / prices,
        prices,
        goal: p.goal * prices,
        income,
        expenses,
        interest,
        event,
      });
      if (reached === null && balance >= p.goal * prices) reached = year;
    }
    return { rows, reached, final: rows.at(-1) };
  }
  function distribution(input) {
    const count = 160;
    const runs = Array.from({ length: count }, (_, i) =>
      simulate(input, "random", 71 + i * 997),
    );
    const values = runs.map((r) => r.final.real).sort((a, b) => a - b);
    const at = (sorted, fraction) =>
      sorted[Math.floor((sorted.length - 1) * fraction)];
    const bands = runs[0].rows.map((_, year) => {
      const real = runs.map((r) => r.rows[year].real).sort((a, b) => a - b);
      const nominal = runs
        .map((r) => r.rows[year].balance)
        .sort((a, b) => a - b);
      return {
        realLow: at(real, 0.1),
        realHigh: at(real, 0.9),
        nominalLow: at(nominal, 0.1),
        nominalHigh: at(nominal, 0.9),
      };
    });
    return {
      low: at(values, 0.1),
      median: at(values, 0.5),
      high: at(values, 0.9),
      bands,
    };
  }
  root.Mathical = {
    defaults,
    normalize,
    loanTerms,
    budget,
    goalPlan,
    financialHealth,
    simulate,
    distribution,
  };
})(globalThis);
