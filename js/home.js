import "./ui.js";
import { money } from "../format.js";

const form = document.querySelector("#quick-goal");
const result = document.querySelector("#contribution");
const detail = document.querySelector("#calculation");

function calculate() {
  const { target, saved, months } = form.elements;
  if (![target, saved, months].every((input) => input.validity.valid)) {
    result.value = "—";
    detail.textContent =
      "Укажи сумму цели, накопления и срок от 1 до 600 месяцев.";
    return;
  }
  const price = target.valueAsNumber;
  const savings = saved.valueAsNumber;
  const term = months.valueAsNumber;
  const remaining = Math.max(0, price - savings);
  const contribution = Math.ceil(remaining / term);
  result.value = money(contribution, false);
  if (remaining === 0) {
    detail.textContent = "На цель уже хватает.";
    return;
  }
  const sign = remaining % term === 0 ? "=" : "≈";
  detail.textContent = `(${money(price, false)} − ${money(savings, false)}) ÷ ${term} ${sign} ${result.value}`;
}
form.addEventListener("input", calculate);
form.addEventListener("submit", (event) => event.preventDefault());
calculate();
