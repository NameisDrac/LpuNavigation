#!/usr/bin/env node
/* Dependency-free build: src/ -> site/. Conservative minification (comments + indentation + blank lines). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), src = path.join(root, 'src'), out = path.join(root, 'site');
const read = (p) => fs.readFileSync(p, 'utf8');
function minJs(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n');
}
function minCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/\n+/g, '').replace(/;}/g, '}').trim();
}
const order = ['01-util.js', '02-data.js', '03-ui.js', '04-nav.js', '06-main.js'];
const app = order.map((f) => minJs(read(path.join(src, 'js', f)))).join('\n');
fs.writeFileSync(path.join(out, 'js/app.js'), app);
fs.writeFileSync(path.join(out, 'js/studio.js'), minJs(read(path.join(src, 'js/studio.js'))));
fs.writeFileSync(path.join(out, 'js/offline.js'), minJs(read(path.join(src, 'js/offline.js'))));
fs.writeFileSync(path.join(out, 'css/styles.css'), minCss(read(path.join(src, 'css/styles.css'))));
const hash = crypto.createHash('sha256');
['js/app.js', 'js/studio.js', 'js/offline.js', 'css/styles.css', 'index.html', 'offline.html', '404.html', 'data/places.js', 'manifest.webmanifest'].forEach((f) => hash.update(fs.readFileSync(path.join(out, f))));
const version = hash.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(out, 'sw.js'), minJs(read(path.join(src, 'sw.js'))).replace('__VERSION__', version));
for (const f of ['js/app.js', 'js/studio.js', 'css/styles.css', 'sw.js']) console.log(f.padEnd(18), fs.statSync(path.join(out, f)).size, 'bytes');
console.log('service worker cache version', version);
