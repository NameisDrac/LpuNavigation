#!/usr/bin/env node
/* Usage: node tools/finalize-domain.js https://your-real-domain.example
   Adds canonical + og:url, makes og/twitter image URLs absolute, writes sitemap.xml and the robots.txt Sitemap line. */
const fs = require('fs'), path = require('path');
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(base)) { console.error('Provide your HTTPS origin, e.g. https://example.netlify.app'); process.exit(1); }
const site = path.join(__dirname, '..', 'site');
let html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
html = html.replace(/<link rel="canonical"[^>]*>\n?/g, '').replace(/<meta property="og:url"[^>]*>\n?/g, '');
html = html.replace(/content="(?:https:\/\/[^"]*)?assets\/og-image\.jpg"/g, `content="${base}/assets/og-image.jpg"`);
html = html.replace('<link rel="icon" href="icons/favicon.svg"', `<link rel="canonical" href="${base}/">\n<meta property="og:url" content="${base}/">\n<link rel="icon" href="icons/favicon.svg"`);
fs.writeFileSync(path.join(site, 'index.html'), html);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
let robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8').replace(/^Sitemap:.*\n?/gm, '');
fs.writeFileSync(path.join(site, 'robots.txt'), robots.trimEnd() + `\nSitemap: ${base}/sitemap.xml\n`);
console.log('Updated index.html, sitemap.xml, robots.txt for', base, '— now re-run `node tools/build.js` so the service-worker cache version refreshes.');
