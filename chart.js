/* График капитала и диапазон учебных сценариев. */
(function(root){
  'use strict';
  const {money}=root.MathicalFormat;
  function chart(rows,{years,mode,startYear,bands,goal}){
    const real=mode==='real', val=r=>real?r.real:r.balance;
    const low=b=>real?b.realLow:b.nominalLow, high=b=>real?b.realHigh:b.nominalHigh;
    const values=rows.map(val), ext=[...values,...bands.flatMap(b=>[low(b),high(b)])];
    let max=Math.max(1,...ext),min=Math.min(0,...ext);const pad=(max-min)*.09||1;max+=pad;min-=pad;
    const x=i=>70+i*305/years, y=v=>205-(v-min)/(max-min)*180;
    const path=points=>points.map(([a,b],i)=>(i?'L':'M')+a.toFixed(2)+' '+b.toFixed(2)).join(' ');
    const line=path(values.map((v,i)=>[x(i),y(v)]));
    const band=path(bands.map((b,i)=>[x(i),y(high(b))]).concat(bands.map((b,i)=>[x(i),y(low(b))]).reverse()))+' Z';
    let svg=`<svg viewBox="0 0 390 235" role="img" aria-label="График капитала и диапазон учебных сценариев с ${startYear} по ${startYear+years} год"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#ffb647" stop-opacity=".38"/><stop offset="1" stop-color="#ffb647" stop-opacity="0"/></linearGradient></defs>`;
    [min,(min+max)/2,max].forEach(v=>{svg+=`<line x1="70" y1="${y(v)}" x2="375" y2="${y(v)}" stroke="#d4c99a" stroke-dasharray="3 4"/><text x="64" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#675e40">${money(v).replace(/₽/g,'')}</text>`;});
    svg+=`<path d="${band}" fill="#8c7be9" opacity=".18"/><path d="${line} L ${x(years)} ${y(0)} L ${x(0)} ${y(0)} Z" fill="url(#chart-fill)"/>`;
    if(real && goal>=min && goal<=max) svg+=`<line x1="70" y1="${y(goal)}" x2="375" y2="${y(goal)}" stroke="#a64f8b" stroke-dasharray="5 4"/><text x="373" y="${y(goal)-5}" text-anchor="end" font-size="11" fill="#853966">Цель</text>`;
    svg+=`<path class="capital-line" d="${line}" fill="none" stroke="#dc7916" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    rows.forEach((r,i)=>{svg+=`<circle data-year="${i}" cx="${x(i)}" cy="${y(val(r))}" r="4" fill="#a94f0d"><title>${startYear+i}: ${money(val(r),false)}</title></circle>`;});
    const count=Math.min(5,years+1);for(let i=0;i<count;i++){const n=Math.round(i*years/(count-1));svg+=`<text x="${x(n)}" y="228" text-anchor="middle" font-size="11" fill="#675e40">${startYear+n}</text>`;}
    return svg+'</svg>';
  }
  root.MathicalChart=chart;
})(globalThis);
