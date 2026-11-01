import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const font=readFileSync(new URL('Onest.ttf',import.meta.url)).toString('base64');
const html=read('index.html')
 .replace('<link rel="stylesheet" href="styles.css?v=polish2">',()=>`<style>${read('styles.css').replace('url("Onest.ttf")',`url(data:font/ttf;base64,${font})`)}</style>`)
 .replace('<script src="engine.js?v=polish2"></script>',()=>`<script>${read('engine.js')}</script>`)
 .replace('<script src="format.js?v=polish2"></script>',()=>`<script>${read('format.js')}</script>`)
 .replace('<script src="chart.js?v=polish2"></script>',()=>`<script>${read('chart.js')}</script>`)
 .replace('<script src="app.js?v=polish2"></script>',()=>`<script>${read('app.js')}</script>`);
writeFileSync(new URL('Mathical.html',import.meta.url),html,'utf8');
console.log('Built standalone Mathical HTML.');
