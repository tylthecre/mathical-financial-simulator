(function () {
  "use strict";
  const M = Mathical,
    S = MStore,
    U = MUI,
    { money, yearsLabel, goalOutcome } = MathicalFormat;
  const d = M.budget(S.state.params),
    p = d.p;
  const res = M.simulate(p, "base"),
    dist = M.distribution(p);
  U.text("h-years", yearsLabel(p.years));
  U.text("h-goal-outcome", goalOutcome(res.reached, p.years, S.startYear));
  U.countUp(U.$("#h-capital"), res.final.real, money, 1500);
  U.drawChart(
    U.$("#h-chart"),
    MathicalChart(res.rows, {
      years: p.years,
      mode: "real",
      startYear: S.startYear,
      bands: dist.bands,
      goal: p.goal,
      showBand: S.state.settings.band,
    }),
  );
  U.countUp(U.$("#h-free"), d.free, (n) => money(n, false) + "/мес.", 1400);
  U.text("h-goal-name", p.goalName);
  U.text("h-goal", money(p.goal));
})();
