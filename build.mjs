import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('index.html')
 .replace('<link rel="stylesheet" href="styles.css?v=goalcredit2">',()=>`<style>${read('styles.css')}</style>`)
 .replace('<script src="engine.js?v=goalcredit2"></script>',()=>`<script>${read('engine.js')}</script>`)
 .replace('<script src="format.js?v=goalcredit2"></script>',()=>`<script>${read('format.js')}</script>`)
 .replace('<script src="chart.js?v=goalcredit2"></script>',()=>`<script>${read('chart.js')}</script>`)
 .replace('<script src="app.js?v=goalcredit2"></script>',()=>`<script>${read('app.js')}</script>`);
writeFileSync(new URL('Mathical.html',import.meta.url),html,'utf8');
console.log('Built standalone Mathical HTML.');
