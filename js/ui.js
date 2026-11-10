/* Общая оболочка: шапка, тема, переходы между страницами, анимации, уведомления. */
import * as S from "./store.js";
const doc = document;
S.load();
doc.documentElement.classList.add("js");
const mq = matchMedia("(prefers-color-scheme: light)"),
  rm = matchMedia("(prefers-reduced-motion: reduce)");
const animOn = () => S.state.settings.animations && !rm.matches;

function applyTheme() {
  const t = S.state.settings.theme,
    light = t === "system" ? mq.matches : t === "light";
  doc.body.classList.toggle("theme-light", light);
  doc.body.classList.toggle("accessible-mode", S.state.settings.accessible);
  const access = doc.getElementById("accessibility-toggle");
  if (access)
    access.setAttribute("aria-pressed", String(S.state.settings.accessible));
  doc.body.classList.toggle("no-anim", !animOn());
  const m = doc.querySelector("meta[name=theme-color]");
  if (m) m.content = light ? "#f8f7fc" : "#10172d";
}
mq.addEventListener("change", applyTheme);

const links = [
  ["index.html", "Главная"],
  ["plan.html", "План"],
  ["results.html", "Результаты"],
  ["compare.html", "Сравнение"],
  ["inflation.html", "Инфляция"],
  ["method.html", "Как считается"],
];
const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
const gear =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
const menu =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const logo =
  '<svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>';

doc.body.insertAdjacentHTML(
  "afterbegin",
  '<div class="bg" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<header class="site-header" id="site-header"><div class="nav"><a href="index.html" class="wordmark" aria-label="Mathical — главная">mathical' +
    logo +
    "</a>" +
    '<nav class="nav-links" id="nav-links" aria-label="Разделы сайта"><span class="nav-ind" id="nav-ind"></span>' +
    links
      .map(
        ([h, t]) =>
          '<a href="' +
          h +
          '"' +
          (h === here ? ' class="active" aria-current="page"' : "") +
          ">" +
          t +
          "</a>",
      )
      .join("") +
    "</nav>" +
    '<div class="nav-actions"><button class="icon-btn accessibility-toggle" id="accessibility-toggle" type="button" aria-label="Режим для слабовидящих" aria-pressed="false" title="Режим для слабовидящих">Аа</button><a class="icon-btn' +
    (here === "settings.html" ? " active" : "") +
    '" href="settings.html" aria-label="Настройки" title="Настройки">' +
    gear +
    "</a>" +
    '<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Меню" aria-expanded="false" aria-controls="nav-links">' +
    menu +
    "</button></div></div></header>" +
    '<div class="toast" id="toast" role="status"></div>',
);
applyTheme();
doc.getElementById("accessibility-toggle").onclick = () => {
  S.state.settings.accessible = !S.state.settings.accessible;
  const ok = S.persist();
  applyTheme();
  doc.dispatchEvent(new Event("mathical-accessibility-changed"));
  toast(
    ok
      ? S.state.settings.accessible
        ? "Режим для слабовидящих включён"
        : "Обычный вид включён"
      : "Не удалось сохранить настройку в браузере",
  );
};

const header = doc.getElementById("site-header"),
  ind = doc.getElementById("nav-ind"),
  navLinks = doc.getElementById("nav-links");
const active = navLinks.querySelector("a.active");
function place(el) {
  if (!el) {
    ind.style.opacity = 0;
    return;
  }
  ind.style.opacity = 1;
  ind.style.width = el.offsetWidth + "px";
  ind.style.transform = "translateX(" + el.offsetLeft + "px)";
}
navLinks
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("mouseenter", () => place(a)));
navLinks.addEventListener("mouseleave", () => place(active));
addEventListener("resize", () => place(active));
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => place(active));
place(active);
const menuBtn = doc.getElementById("menu-btn");
menuBtn.onclick = () => {
  const open = header.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
};
doc.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    header.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});

/* Подвал */
doc.addEventListener("DOMContentLoaded", () => {
  doc.body.insertAdjacentHTML(
    "beforeend",
    '<footer class="site-footer"><div class="foot"><span>mathical · учебная модель, а не финансовый прогноз</span><nav aria-label="Ссылки внизу">' +
      links.map(([h, t]) => '<a href="' + h + '">' + t + "</a>").join("") +
      '<a href="settings.html">Настройки</a></nav></div></footer>',
  );
  reveal();
});

/* Плавный уход со страницы */
doc.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (
    !a ||
    e.defaultPrevented ||
    e.button ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    a.target ||
    a.hasAttribute("download")
  )
    return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin && url.protocol !== "file:") return;
  if (url.protocol === "file:" && !/\.html$/i.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash) return;
  if (!animOn()) return;
  e.preventDefault();
  header.classList.remove("open");
  doc.body.classList.add("leaving");
  setTimeout(() => {
    location.href = a.href;
  }, 230);
});
addEventListener("pageshow", (e) => {
  if (e.persisted) doc.body.classList.remove("leaving");
});
function go(url) {
  if (!animOn()) {
    location.href = url;
    return;
  }
  doc.body.classList.add("leaving");
  setTimeout(() => {
    location.href = url;
  }, 230);
}

/* Появление блоков при прокрутке */
let io = null;
function reveal() {
  const items = [...doc.querySelectorAll(".reveal:not(.in)")];
  if (!items.length) return;
  if (!animOn() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  io =
    io ||
    new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" },
    );
  items.forEach((el) => io.observe(el));
}

/* Числа, плавно «набегающие» до значения */
function countUp(el, to, fmt = String, ms = 1100) {
  cancelAnimationFrame(el._raf);
  const from = Number.isFinite(el._v) ? el._v : 0;
  el._v = to;
  if (!animOn() || !Number.isFinite(to) || from === to) {
    el.textContent = fmt(to);
    return;
  }
  let t0 = null;
  const tick = (t) => {
    if (t0 === null) t0 = t;
    const k = Math.min(1, (t - t0) / ms),
      e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(tick);
    else el.textContent = fmt(to);
  };
  el._raf = requestAnimationFrame(tick);
}

/* График: вставка и «рисование» линии капитала */
function drawChart(box, svg) {
  box.innerHTML = svg;
  const line = box.querySelector(".capital-line");
  box.classList.remove("chart-in");
  if (!line || !animOn() || !line.getTotalLength) return;
  const len = line.getTotalLength();
  line.style.transition = "none";
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  line.getBoundingClientRect();
  line.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.3,.7,.2,1)";
  line.style.strokeDashoffset = 0;
  void box.offsetWidth;
  box.classList.add("chart-in");
}

let toastTimer = 0;
function toast(message) {
  const el = doc.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
function download(blob, name) {
  const a = doc.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const $ = (s, r = doc) => r.querySelector(s);
const $$ = (s, r = doc) => [...r.querySelectorAll(s)];
const text = (id, v) => {
  const el = doc.getElementById(id);
  if (el) el.textContent = v;
};

if (S.state.legacyDecisionRemoved)
  toast("Ранее выбранный сценарий больше недоступен. Включён обычный план.");

export {
  applyTheme,
  animOn,
  reveal,
  countUp,
  drawChart,
  toast,
  download,
  go,
  $,
  $$,
  text,
};
