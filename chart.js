/* График капитала и диапазон учебных сценариев. */
(function (root) {
  "use strict";
  const { money } = root.MathicalFormat;

  function intersects(box, points) {
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1],
        [x2, y2] = points[i];
      const left = Math.max(box.x - 4, x1),
        right = Math.min(box.x + box.width + 4, x2);
      if (left > right) continue;
      const at = (x) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      if (
        Math.max(at(left), at(right)) >= box.y - 4 &&
        Math.min(at(left), at(right)) <= box.y + box.height + 4
      )
        return true;
    }
    return false;
  }

  function goalAnnotation(goalPoints, capitalPoints, status) {
    const width = 40,
      height = 18;
    const label = (box, text, leader = "") =>
      `<g class="goal-annotation" data-label-x="${box.x}" data-label-y="${box.y}" data-label-width="${box.width}" data-label-height="${box.height}">${leader}<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="3" fill="var(--cream, #f5f1e8)"/><text x="${box.x + 5}" y="${box.y + 13}" font-size="11" fill="#795267">${text}</text></g>`;
    const candidates = [];
    // Берём середины видимых отрезков: подпись работает и при выходе части цели за шкалу.
    for (let i = 1; i < goalPoints.length; i++) {
      const [x1, y1] = goalPoints[i - 1],
        [x2, y2] = goalPoints[i];
      let start = 0,
        end = 1;
      if (y1 === y2) {
        if (y1 < 25 || y1 > 205) continue;
      } else {
        const a = (25 - y1) / (y2 - y1),
          b = (205 - y1) / (y2 - y1);
        start = Math.max(0, Math.min(a, b));
        end = Math.min(1, Math.max(a, b));
      }
      if (start > end) continue;
      const t = (start + end) / 2;
      candidates.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    }
    for (const [x, y] of candidates)
      for (const offset of [-24, 6]) {
        const box = {
          x: Math.max(80, Math.min(369 - width, x - width / 2)),
          y: y + offset,
          width,
          height,
        };
        if (box.y < 31 || box.y + height > 201) continue;
        if (!intersects(box, capitalPoints) && !intersects(box, goalPoints))
          return label(box, "Цель");
      }
    // Если линии совпали или цель вне шкалы, используем отдельную полосу над графиком.
    if (!candidates.length)
      return label(
        { x: 205, y: 2, width: 168, height },
        status.includes("ниже") ? "Цель ниже шкалы ↓" : "Цель выше шкалы ↑",
      );
    const [x, y] = candidates[0],
      bx = Math.max(80, Math.min(329, x - width / 2));
    return label(
      { x: bx, y: 2, width, height },
      "Цель",
      `<path d="M ${bx + width / 2} 20 L ${x} ${y}" fill="none" stroke="#90657a" stroke-width="1" stroke-dasharray="2 3"/>`,
    );
  }
  function chart(
    rows,
    { years, mode, startYear, bands, goal, showBand = true },
  ) {
    const real = mode === "real",
      val = (r) => (real ? r.real : r.balance);
    const low = (b) => (real ? b.realLow : b.nominalLow),
      high = (b) => (real ? b.realHigh : b.nominalHigh);
    const goalValues = rows.map((r) => (real ? goal : r.goal));
    const values = rows.map(val),
      ext = [
        ...values,
        ...(showBand ? bands.flatMap((b) => [low(b), high(b)]) : []),
      ];
    let max = Math.max(1, ...ext),
      min = Math.min(0, ...ext);
    const pad = (max - min) * 0.09 || 1;
    max += pad;
    if ([...ext, ...goalValues].some((value) => value < 0)) min -= pad;
    const x = (i) => 70 + (i * 305) / years,
      y = (v) => 205 - ((v - min) / (max - min)) * 180;
    const path = (points) =>
      points
        .map(([a, b], i) => (i ? "L" : "M") + a.toFixed(2) + " " + b.toFixed(2))
        .join(" ");
    const capitalPoints = values.map((v, i) => [x(i), y(v)]);
    const goalPoints = goalValues.map((v, i) => [x(i), y(v)]);
    const line = path(capitalPoints);
    const band =
      path(
        bands
          .map((b, i) => [x(i), y(high(b))])
          .concat(bands.map((b, i) => [x(i), y(low(b))]).reverse()),
      ) + " Z";
    let svg = `<svg viewBox="0 0 390 235" role="img" aria-label="График капитала и диапазон учебных сценариев с ${startYear} по ${startYear + years} год"><defs><clipPath id="goal-clip"><rect x="70" y="25" width="305" height="180"/></clipPath><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#ffccad" stop-opacity=".38"/><stop offset="1" stop-color="#ffccad" stop-opacity="0"/></linearGradient></defs>`;
    [min, (min + max) / 2, max].forEach((v) => {
      svg += `<line x1="70" y1="${y(v)}" x2="375" y2="${y(v)}" stroke="#d4c99a" stroke-dasharray="3 4"/><text x="64" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#675e40">${money(v).replace(/₽/g, "")}</text>`;
    });
    if (showBand) svg += `<path d="${band}" fill="#aa9cb9" opacity=".18"/>`;
    svg += `<path d="${line} L ${x(years)} ${y(0)} L ${x(0)} ${y(0)} Z" fill="url(#chart-fill)"/>`;
    const goalPath = path(goalValues.map((v, i) => [x(i), y(v)]));
    svg += `<path d="${goalPath}" clip-path="url(#goal-clip)" fill="none" stroke="#90657a" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    svg += `<path class="capital-line" d="${line}" fill="none" stroke="#a9694d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    rows.forEach((r, i) => {
      svg += `<circle data-year="${i}" cx="${x(i)}" cy="${y(val(r))}" r="4" fill="#87513c"><title>${startYear + i}: ${money(val(r), false)}</title></circle>`;
    });
    const count = Math.min(5, years + 1);
    for (let i = 0; i < count; i++) {
      const n = Math.round((i * years) / (count - 1));
      svg += `<text x="${x(n)}" y="228" text-anchor="middle" font-size="11" fill="#675e40">${startYear + n}</text>`;
    }
    const below = goalValues.every((v) => v < min),
      above = goalValues.every((v) => v > max),
      partial = goalValues.some((v) => v < min || v > max);
    const status = above
      ? "Цель выше шкалы графика."
      : below
        ? "Цель ниже шкалы графика."
        : partial
          ? "Часть линии цели находится за пределами шкалы."
          : "";
    svg += goalAnnotation(goalPoints, capitalPoints, status);
    return (
      svg.replace(
        "<svg ",
        `<svg data-scale-min="${min}" data-scale-max="${max}" data-goal-status="${status}" `,
      ) + "</svg>"
    );
  }
  root.MathicalChart = chart;
})(globalThis);
