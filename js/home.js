import "./ui.js";
import { money, monthsLabel } from "../format.js";

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
  const remaining = Math.max(0, target.valueAsNumber - saved.valueAsNumber);
  result.value = money(Math.ceil(remaining / months.valueAsNumber), false);
  detail.textContent =
    remaining === 0
      ? "На цель уже хватает."
      : money(remaining, false) +
        " осталось накопить за " +
        monthsLabel(months.valueAsNumber) +
        ".";
}
form.addEventListener("input", calculate);
form.addEventListener("submit", (event) => event.preventDefault());
calculate();
