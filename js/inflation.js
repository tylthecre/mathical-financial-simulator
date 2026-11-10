import * as S from "./store.js";
import * as U from "./ui.js";
const officialRate = 6.35;
U.text("official-rate", officialRate.toLocaleString("ru-RU") + "%");
U.text("price-index", (100 + officialRate).toLocaleString("ru-RU") + "%");
const data = S.state.inflationInfo;
function current() {
  const labels = {
    manual: "своё значение",
    official: "официальный показатель",
    personal: "ранее сохранённое значение",
  };
  U.text(
    "current-inflation",
    S.state.params.inflation.toLocaleString("ru-RU") +
      "% в год · " +
      labels[data.source],
  );
}
function apply(rate, source) {
  S.state.params.inflation = Math.round(rate * 100) / 100;
  data.source = source;
  if (S.persist()) {
    current();
    U.toast("Значение добавлено в план");
  } else U.toast("Браузер запретил сохранение");
}
U.$("#manual-rate").value = S.state.params.inflation;
U.$("#use-manual").onclick = () => {
  const input = U.$("#manual-rate");
  if (input.value === "" || !input.reportValidity()) return;
  apply(Number(input.value), "manual");
};
U.$("#use-official").onclick = () => apply(officialRate, "official");
current();
