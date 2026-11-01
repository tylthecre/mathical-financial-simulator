/* Форматирование значений для интерфейса. */
(function(root){
  'use strict';
  function money(n,compact=true){return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:compact?1:0,...(compact?{notation:'compact'}:{})}).format(n);}
  const yearsLabel=n=>n+' '+({one:'год',few:'года',many:'лет',other:'лет'}[new Intl.PluralRules('ru-RU').select(n)]);
  const pct=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n)+'%';
  root.MathicalFormat={money,yearsLabel,pct};
})(globalThis);
