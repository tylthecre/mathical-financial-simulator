// Обновляет версии ресурсов и собирает автономные страницы в dist/.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const versioned = path => {
  const hash = createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex').slice(0, 12);
  return `${path}?v=${hash}`;
};
const font = readFileSync(new URL('Onest.ttf', import.meta.url)).toString('base64');
const pages = ['index', 'plan', 'results', 'compare', 'inflation', 'method', 'settings'];
const css = read('css/site.css').replace('url("../Onest.ttf")', () => `url(data:font/ttf;base64,${font})`);
mkdirSync(new URL('dist/', import.meta.url), {recursive: true});
for (const name of pages) {
  const path = new URL(`${name}.html`, import.meta.url);
  const source = read(`${name}.html`)
    .replace(/href="css\/site\.css(?:\?[^" ]*)?"/g, () => `href="${versioned('css/site.css')}"`)
    .replace(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g, (_, src) => `<script src="${versioned(src)}"></script>`);
  writeFileSync(path, source, 'utf8');
  const html = source
    .replace(/<link rel="stylesheet" href="css\/site\.css(?:\?[^" ]*)?">/, () => `<style>${css}</style>`)
    .replace(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g, (_, src) => `<script>${read(src)}</script>`);
  writeFileSync(new URL(`dist/${name}.html`, import.meta.url), html, 'utf8');
}
console.log(`Updated resource versions and built ${pages.length} standalone pages in dist/.`);
