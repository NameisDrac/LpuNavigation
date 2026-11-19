# Deployment

The deployable folder is **`site/`** (already built). No server code. Needs HTTPS in production — both hosts below give it automatically.

## Before you publish
1. Decide whether you want the student name, section, faculty and email on the public page (see README "Privacy of your own details"). Edit `site/index.html` (section `#about`) and `src/` is not involved.
2. If you edited anything in `src/`, run `node tools/build.js` (needs Node 18+, no installs).

## Netlify (drag and drop)
1. Go to https://app.netlify.com/drop, sign in, drag the **`site`** folder in.
2. Open the https URL Netlify gives you. Optional: rename the site or add a custom domain under Domain management.
3. Netlify reads `site/_headers` (security headers + caching) and serves `404.html` automatically.
4. Once the final domain is known run:
   `node tools/finalize-domain.js https://YOUR-DOMAIN` then `node tools/build.js`, and re-deploy. This adds the canonical URL, `og:url`, absolute Open Graph image URL, `sitemap.xml` and the robots.txt sitemap line. (No domain is invented anywhere in the project.)

## Cloudflare Pages
1. Workers & Pages → Create → Pages → Upload assets (or connect a Git repo).
2. Project name of your choice; for Git, set **Build command: none**, **Output directory: `site`**.
3. `_headers` and `404.html` are honoured. HTTPS is automatic.

## HTTPS notes
- Geolocation only works on HTTPS pages (and `localhost`). Hosts above enable HTTPS and redirect HTTP automatically.
- `Strict-Transport-Security` is sent by `_headers`; only keep it once you are sure the domain should be HTTPS-only (it always should be).
- On `http://localhost` there is no padlock — that is normal and not a fault.
- Do not upload `docs/`, `tests/`, `src/` or `original-assets/` to the host unless you want them public; publish `site/` only.

## After deploying
Run the manual checks at the bottom of `docs/TEST-REPORT.md`, then run Lighthouse in Chrome DevTools (mobile).
If the map is blank, open the browser console: a Content-Security-Policy message means `_headers` needs the blocked host added to `script-src` / `img-src` / `connect-src`.
