# LPU Campus Navigator — Release 3.0
**DREAM BIG. FIND YOUR WAY.** · Independent student project, not an official Lovely Professional University service.

An upgrade of your existing project (same data, same identity), rebuilt mobile-first as a production-ready static website with PWA support.

## Run locally (no installs)
```
python3 -m http.server 8080 --directory site      # then open http://localhost:8080
```
(or VS Code "Live Server" on the `site` folder). Internet is needed for map tiles. Service worker and geolocation work on `localhost`.

## Project layout
```
site/            ← deploy this folder (built output)
  index.html  404.html  offline.html  manifest.webmanifest  sw.js  robots.txt  _headers
  css/  js/  data/places.js (your coordinates, untouched)  assets/  icons/
src/             readable sources (css, js modules, service worker)
tools/build.js   dependency-free build: src → site (node tools/build.js)
tools/finalize-domain.js   adds canonical/og:url/sitemap once you know your domain
tests/           Playwright test suite + results.json
docs/            TEST-REPORT, DATA-AUDIT, DEPENDENCIES, DEPLOYMENT
original-assets/ your original logo/photo files and original notes (not deployed)
```
`npm run build / serve / test` are available if you have Node (`test` needs `pip install playwright` + `playwright install chromium`).

## What's new
- **Mobile-first layout**: search first, then map, bottom-safe floating buttons, 44 px touch targets, drawer menu, safe-area support, no horizontal overflow from 320 px to 1920 px.
- **Smart search**: partial words, typos ("libary", "blok 34"), block numbers ("34", "b34"), hostel/food/sports/department names, category chips, keyboard (↑ ↓ Enter Esc), clear button, no-result suggestions, "not mapped yet" entries.
- **Navigation**: GPS marker + accuracy circle, weak/denied/unavailable GPS handling, destination marker, walking route from OSRM with distance/time, approximate progress, re-centre, start/stop, honest straight-line fallback when routing fails. Your location is sent only to the routing server and only after you confirm.
- **Personalisation**: dark/light (remembered, follows system by default), favourites, recents, Fresher mode, popular places; works even if the browser blocks storage.
- **PWA**: manifest, original icons, service worker, offline page with the saved place list, install button (and iOS instructions), "new version" update toast.
- **Site features**: global search (places + help), FAQ, scroll progress bar, back-to-top, sticky header, privacy notice, floating contact, confirmation dialogs, report form (opens your email app — it does **not** pretend to submit anything), custom 404, favicon set, Open Graph/meta tags.
- **Security/privacy**: no innerHTML with data (DOM building only), `rel=noopener`, CSP + security headers, no cookies/analytics/keys, Google Fonts removed.
- Your original **Campus Mapping Studio** is kept under "Contributor tools" (lazy-loaded, hidden in Fresher mode).

## Things you must know
- **Testing honesty**: see `docs/TEST-REPORT.md`. 119 automated checks pass, but the map ran against a stub Leaflet because the build environment had no internet; real-device and Lighthouse checks are listed as *not tested*.
- **Pins are unverified** (as in your original). 36 entries have no coordinates. `docs/DATA-AUDIT.md` lists duplicates/near-duplicates for you to review — nothing was changed.
- **Two OSM shortcuts from the old release were not ported** (auto-assigning coordinates to blocks from OSM names, click-footprint-to-assign) because they created unverified coordinates silently. Details in the data audit.
- **Logo**: the header still uses the LPU sunburst mark from your original files (derived from the official logo, which LPU states is copyrighted). Make sure you have permission before public launch, or swap `assets/lpu-sunburst-mark-*.webp`. The app icons, favicon and social image are original artwork, not the LPU logo.
- **Privacy of your own details**: the page publicly shows your name, section, faculty name and email (kept because your project asked for them). Remove or change them in `site/index.html` if you don't want that.
- **Last-updated date** in the page is set in `index.html` (`<time>` elements); update it when you publish changes.
- The routing server is a free community service with no guarantee. See `docs/DEPENDENCIES.md` for alternatives.

Deployment: `docs/DEPLOYMENT.md` (Netlify / Cloudflare Pages).
