(function () {
  "use strict";
  const S = MStore,
    U = MUI,
    data = S.state.inflationInfo;
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
    const previousRate = S.state.params.inflation,
      previousSource = data.source;
    S.state.params.inflation = Math.round(rate * 100) / 100;
    data.source = source;
    if (!U.save("Значение добавлено в план")) {
      S.state.params.inflation = previousRate;
      data.source = previousSource;
    }
    current();
  }
  U.$("#manual-rate").value = S.state.params.inflation;
  U.$("#use-manual").onclick = () => {
    const input = U.$("#manual-rate");
    if (input.value === "" || !input.reportValidity()) return;
    apply(Number(input.value), "manual");
  };
  U.$("#use-official").onclick = () => apply(6.35, "official");
  current();
})();
