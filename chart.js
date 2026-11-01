/* Построение SVG-графика капитала. */
(function(root){
  'use strict';
  const {money}=root.MathicalFormat;
  function chart(rows, {years, mode, startYear}) {
    const count=Math.min(6,years+1);
    const indices=Array.from({length:count},(_,i)=>Math.round(i*years/(count-1)));
    const barX=i=>86+i*261/(count-1);
    const points=indices.map(i=>rows[i]);
    const values=points.map(r=>r[mode==='real'?'real':'balance']);
    const max=Math.max(1,...values)*1.12, min=Math.min(0,...values)*1.15;
    const y=v=>225-(v-min)/(max-min)*205;
    const zero=y(0), width=390;
    const ticks=[min, (max+min)/2,max];
    const trackClips=points.map((_,i)=>`<clipPath id="capital-track-${i}"><rect x="${barX(i)}" y="${y(max)}" width="38" height="205" rx="19"/></clipPath>`).join('');
    let svg=`<svg viewBox="0 0 ${width} 255" role="img" aria-label="Капитал от ${startYear} до ${startYear+years}, ${mode==='real'?'в сегодняшних':'в будущих'} рублях"><title>Капитал по годам</title><defs><clipPath id="capital-plot-clip"><rect x="82" y="20" width="307" height="205"/></clipPath>${trackClips}</defs>`;
    ticks.forEach(v=>{svg+=`<line x1="82" y1="${y(v)}" x2="389" y2="${y(v)}" stroke="#ddd3a5" stroke-dasharray="3 4"/><text x="75" y="${y(v)+3}" text-anchor="end" font-size="12" fill="#807653">${money(v).replace(/₽/g,'')}</text>`;});
    svg+=`<line x1="82" y1="${zero}" x2="389" y2="${zero}" stroke="#9c926c"/>`;
    points.forEach((r,i)=>{const v=values[i],x=barX(i), yy=y(v), h=v===0?0:Math.max(2,Math.abs(zero-yy)); svg+=`<g clip-path="url(#capital-plot-clip)"><rect x="${x}" y="${y(max)}" width="38" height="${205}" rx="19" fill="#e7ddb0"/><g clip-path="url(#capital-track-${i})"><rect x="${x}" y="${v>=0?zero-h:zero}" width="38" height="${h}" rx="${Math.min(19,h/2)}" fill="${v<0?'#d46485':'#ffb647'}"><title>${startYear+r.year}: ${money(v,false)}</title></rect></g></g><text x="${x+19}" y="249" text-anchor="middle" fill="#756d50" font-size="12">${startYear+r.year}</text>`;});
    svg+='</svg>'; return svg;
  }
  root.MathicalChart=chart;
})(globalThis);
