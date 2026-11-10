import { simulate } from "../engine.js";

const adjustments = {
  education(year, month, prices, pay) {
    return {
      extraPay: year >= 3 ? pay * 0.15 : 0,
      extraCost: year === 2 && month === 1 ? 120000 * prices : 0,
    };
  },
  car(year, month, prices) {
    const purchase = year === 3 && month === 1 ? 900000 : 0;
    return {
      extraPay: 0,
      extraCost: year >= 3 ? (8000 + purchase) * prices : 0,
    };
  },
};

export function isArchived(decision) {
  return Object.hasOwn(adjustments, decision);
}

// Старые сохранения не содержат результата, только параметры расчёта.
export function simulateSaved(params, scenario) {
  const adjustment = isArchived(params.decision)
    ? adjustments[params.decision]
    : undefined;
  return simulate(params, scenario, 42, adjustment);
}
