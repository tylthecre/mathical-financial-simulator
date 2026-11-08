// Собирает автономные страницы в папку dist/: стили, скрипты и шрифт внутри каждого .html.
// Папку dist можно перенести целиком (например, на хостинг) — внешних файлов не нужно.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const font = readFileSync(new URL('Onest.ttf', import.meta.url)).toString('base64');
const pages = ['index', 'plan', 'results', 'compare', 'method', 'settings'];
const css = read('css/site.css').replace('url("../Onest.ttf")', () => `url(data:font/ttf;base64,${font})`);
mkdirSync(new URL('dist/', import.meta.url), {recursive: true});
for (const name of pages) {
  const html = read(`${name}.html`)
    .replace('<link rel="stylesheet" href="css/site.css">', () => `<style>${css}</style>`)
    .replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>${read(src)}</script>`);
  writeFileSync(new URL(`dist/${name}.html`, import.meta.url), html, 'utf8');
}
console.log(`Built ${pages.length} standalone pages in dist/.`);
