# Test report — LPU Campus Navigator 3.0

Run date: 19 Nov 2026 · Tool: `python3 tests/run.py` (Playwright + headless Chromium 157, local static server).
**Result of automated run: 119/119 passed, 0 failed.** Raw output: `tests/results.json`.

## IMPORTANT: how the map was tested
The build sandbox has **no internet access**, so the real Leaflet library, OpenStreetMap tiles, the routing server and Overpass could not be loaded.
Tests therefore ran against `tests/leaflet-stub.js`, an API-compatible stand-in that *records* what the app asks the map to do
(markers created, route geometry drawn, view changes). This verifies the app's logic and data, but **not** real tile rendering, real marker
appearance, real Leaflet interactions (pinch zoom, popups) or real routing responses (OSRM replies were mocked in the shape the service returns).
Please run the "Manual checks" list below on a real phone before announcing the site.

## Passed (automated)
| Status | Test |
|---|---|
| PASS | Data: all 115 records identical to original (names, categories, coords, flags) |
| PASS | Data: places.js file byte-identical to uploaded original |
| PASS | Page loads with no console/page errors (stubbed Leaflet) |
| PASS | Map: 79 place markers created, every coordinate+name matches original |
| PASS | Map: OSM street tile URL used (no subdomains) |
| PASS | Search "block 34" finds Block 34 — CSE |
| PASS | Search "b34" finds Block 34 — CSE |
| PASS | Search "34" finds Block 34 — CSE |
| PASS | Search "libary" finds Central Library |
| PASS | Search "bh1" finds LPU Boys Hostel 1 — BH1 |
| PASS | Search "mess" finds South Central Mess |
| PASS | Search "food court" finds NK Food Court |
| PASS | Search "cricket" finds LPU Cricket Ground |
| PASS | Search "hospitl" finds Shri Baldev Raj Mittal Hospital |
| PASS | Search "cse" finds Block 34 — CSE |
| PASS | Search "girls" finds Girls Hostels — campus area reference |
| PASS | Search "parking" finds LPU Main Parking |
| PASS | Search "tenis" finds Lawn Tennis Court |
| PASS | Search "uni mall" finds Uni-Mall |
| PASS | Search "41" finds Block 41D |
| PASS | Search unmapped "block 12" shown as "not mapped yet" |
| PASS | Search no-result empty state |
| PASS | Search typo suggestion/tolerance (blok 34) |
| PASS | Category filter combines with search (sport + Hostels = none) |
| PASS | Category chip Food lists 4 food places |
| PASS | Clear search button resets input |
| PASS | Keyboard: Arrow+Enter selects destination |
| PASS | Keyboard: Escape clears search |
| PASS | Combobox ARIA wiring |
| PASS | Favourite saved and listed |
| PASS | Recent destination listed |
| PASS | Favourites + recents persist across reload (localStorage) |
| PASS | Popular place card selects destination |
| PASS | Destination dropdown selects + shows card |
| PASS | Show on map recentres at zoom 18 |
| PASS | OSM external link has coordinates + rel noopener |
| PASS | Dark/light toggle persists after reload |
| PASS | Fresher mode toggles body class and hides contributor tools |
| PASS | Fresher mode persists |
| PASS | Mobile menu opens (aria-expanded=true) |
| PASS | Mobile menu closes on Escape, focus returns |
| PASS | Menu link navigates and closes menu |
| PASS | FAQ expands |
| PASS | Back-to-top appears after scrolling |
| PASS | Scroll progress bar updates |
| PASS | Back-to-top returns to top |
| PASS | Logo click returns to top/home |
| PASS | Sticky header stays visible after scroll |
| PASS | Floating contact opens dialog with mailto link |
| PASS | Footer/contact email is clickable mailto |
| PASS | Global search returns help article |
| PASS | Global search returns places |
| PASS | Global search result selects the place |
| PASS | Privacy banner shown first visit |
| PASS | Privacy banner dismissed persists |
| PASS | Privacy details dialog opens |
| PASS | Form: empty submit shows errors + aria-invalid |
| PASS | Form: too-short message rejected |
| PASS | Form: confirmation dialog appears |
| PASS | Form: cancel leaves no success message |
| PASS | Form: success state honest (draft prepared, copy fallback) |
| PASS | Form: reset clears fields and messages |
| PASS | GPS: live position + accuracy displayed |
| PASS | GPS: user marker drawn at the mocked fix |
| PASS | GPS: re-centre button appears |
| PASS | GPS: re-centre moves map to user |
| PASS | GPS: stop removes live marker/state |
| PASS | Route: consent dialog names routing server before sending location |
| PASS | Route: cancel sends nothing / no route |
| PASS | Route: distance + walk time shown from service response |
| PASS | Route: line drawn from returned geometry |
| PASS | Route request uses real GPS start + Block 34 destination |
| PASS | Route: step list rendered |
| PASS | Route: Start button swaps to Stop |
| PASS | Navigation stop clears route UI + GPS |
| PASS | Route from campus reference needs no GPS (no live GPS, no second consent prompt) |
| PASS | Route failure: clear message, labelled straight-line estimate, no fake route |
| PASS | GPS permission denied handled (message, button reset) |
| PASS | GPS poor accuracy flagged as weak signal |
| PASS | Map load failure: error state with retry, no JS crash |
| PASS | Map failure: search/directory still works |
| PASS | Map failure: destination card still opens with OSM link |
| PASS | Storage blocked: app works, theme toggles in-session, warning shown |
| PASS | Layout 320px: no horizontal overflow |
| PASS | Layout 320px: no tiny touch targets (<34px tall) |
| PASS | Layout 360px: no horizontal overflow |
| PASS | Layout 360px: no tiny touch targets (<34px tall) |
| PASS | Layout 375px: no horizontal overflow |
| PASS | Layout 375px: no tiny touch targets (<34px tall) |
| PASS | Layout 390px: no horizontal overflow |
| PASS | Layout 390px: no tiny touch targets (<34px tall) |
| PASS | Layout 430px: no horizontal overflow |
| PASS | Layout 430px: no tiny touch targets (<34px tall) |
| PASS | Layout 768px: no horizontal overflow |
| PASS | Layout 768px: no tiny touch targets (<34px tall) |
| PASS | Layout 1024px: no horizontal overflow |
| PASS | Layout 1024px: no tiny touch targets (<34px tall) |
| PASS | Layout 1366px: no horizontal overflow |
| PASS | Layout 1366px: no tiny touch targets (<34px tall) |
| PASS | Layout 1920px: no horizontal overflow |
| PASS | Layout 1920px: no tiny touch targets (<34px tall) |
| PASS | Internal anchors all resolve |
| PASS | External links use rel=noopener |
| PASS | No failed same-origin requests (missing images/assets) |
| PASS | Meta: title, description, og:image, manifest, icons present |
| PASS | Semantics: one h1, main landmark, html lang |
| PASS | All form controls have labels |
| PASS | All images have alt attribute |
| PASS | 404.html renders |
| PASS | offline.html lists 79 places with geo: links |
| PASS | Asset served: manifest.webmanifest |
| PASS | Asset served: robots.txt |
| PASS | Asset served: sw.js |
| PASS | Asset served: icons/icon-192.png |
| PASS | Asset served: icons/icon-maskable-512.png |
| PASS | Asset served: assets/og-image.jpg |
| PASS | Manifest valid (name, start_url, 3 icons incl. maskable) |
| PASS | PWA: service worker registers |
| PASS | PWA: app shell + place list load offline |

## Failed
None in the final run. Bugs found and fixed *during* testing: places data not read (global `const`), privacy banner covering the back-to-top button,
floating Contact button covering the form's submit button, privacy dialog opening behind an open menu, page reloading itself on first service-worker
activation, and a horizontal-overflow bug on phones (grid min-content).

## Not tested (could not be, or not yet)
- Real Leaflet + OSM/Esri tiles, real Overpass loading, **real OSRM routing** (all stubbed/mocked; see above).
- Real GPS hardware, walking accuracy, battery use. (Browser geolocation was mocked via Playwright: success, denied, weak accuracy.)
- iOS Safari / real iPhone, Android Chrome, Firefox, Samsung Internet. Only Chromium was used; phone sizes were emulated by viewport only.
- Lighthouse scores (not installed, offline). No score is claimed. Run Lighthouse in Chrome DevTools after deploying.
- Automated accessibility audit (axe/WAVE) and measured colour-contrast ratios. Checked structurally only: labels, alt attributes, landmarks, ARIA wiring, focus return, touch-target sizes. Screen-reader testing was not done.
- Contributor tools (map picking, boundary drawing, GeoJSON/CSV export, OSM import) — ported, syntax-checked, **not exercised end to end**.
- PWA install prompt UI, iOS "Add to Home Screen", update toast on a real new version.
- HTTPS, security headers and CSP on a live host (local test used plain HTTP on 127.0.0.1). The CSP in `site/_headers` is untested against real Leaflet; if the map is blank after deploying, check the browser console for CSP violations first.
- Custom 404 on a real host (the local Python server returns its own 404; `404.html` itself renders).
- External links beyond the OpenStreetMap link format (no network).

## External dependencies
See `docs/DEPENDENCIES.md`.

## Known limitations
- Every campus pin is an owner-supplied reference point, **not field-verified**; the UI says so. 36 directory entries (e.g. Blocks 2–13, 16, 17, 19–24, 29, 30, 40–50, Hostel Reception, Student Help, Uni-Hospital) still have no coordinates and are shown as "not mapped yet".
- Routing uses a free community OSRM server; it can be slow, rate-limited or down, and has no knowledge of campus-only paths or indoor routes. The app shows an honest error and a clearly labelled straight-line estimate when it fails.
- "Route progress" is approximate (straight-line distance covered), not turn-by-turn tracking. There is no voice guidance.
- Offline: page + place list work; map tiles, routes and OSM data do not.
- JS/CSS minification is conservative (comments/whitespace only) because no minifier could be installed offline.
- `leaflet.draw` (loaded only when a contributor presses "Draw campus boundary") is loaded without an SRI hash; the hash could not be computed offline.

## Manual checks to run on a real phone (about 15 minutes)
1. Open the deployed HTTPS URL on Android Chrome and iPhone Safari: map tiles appear, pins tap open, pinch-zoom works.
2. Tap "Use my location" outdoors: permission prompt, green dot, accuracy circle. Deny permission once and confirm the message.
3. Search "Block 34", start navigation: confirm the consent prompt, blue route line appears, distance/time are sensible.
4. Walk 30–50 m: route refreshes and progress moves; stop navigation.
5. Toggle dark mode and Fresher mode, reload: both remembered.
6. Install the app (Android: Install; iPhone: Share → Add to Home Screen). Turn on airplane mode and re-open: place list loads.
7. Run Lighthouse (mobile) and fix anything it flags that is specific to your host.
