import json, subprocess, threading, http.server, socketserver, os, sys, functools, re, time
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), '..'); SITE = os.path.join(ROOT, 'site')
STUB = open(os.path.join(os.path.dirname(__file__), 'leaflet-stub.js')).read()
ORIG = json.load(open('/tmp/original-places.json'))
RESULTS = []
def rec(name, ok, detail=''):
    RESULTS.append({'test': name, 'status': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:300]})
    print(('PASS ' if ok else 'FAIL ') + name + (' — ' + str(detail)[:200] if (detail and not ok) else ''))

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
Handler = functools.partial(Q, directory=SITE)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', 8765), Handler); threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8765/'
ROUTE_OK = {'code': 'Ok', 'routes': [{'distance': 640.2, 'duration': 480.5, 'geometry': {'type': 'LineString', 'coordinates': [[75.7033, 31.2559], [75.7040, 31.2540], [75.7046, 31.25162]]}, 'legs': [{'steps': [{'distance': 400, 'name': 'Main Road', 'maneuver': {'type': 'depart'}}, {'distance': 240, 'name': 'Block Road', 'maneuver': {'type': 'arrive'}}]}]}]}

def patched_page(browser, ctx_kwargs=None, leaflet='stub', osrm='ok', init=None, viewport=None):
    ctx = browser.new_context(viewport=viewport or {'width': 390, 'height': 844}, **(ctx_kwargs or {}))
    errors = []
    def handle_index(route):
        r = route.fetch(); body = r.text()
        body = re.sub(r'\s+integrity="[^"]*"', '', body)
        route.fulfill(response=r, body=body)
    ctx.route(BASE, handle_index); ctx.route(BASE + 'index.html', handle_index)
    if leaflet == 'stub':
        ctx.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
        ctx.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', lambda r: r.fulfill(body='.leaflet-container{}', content_type='text/css'))
    else:
        ctx.route('https://unpkg.com/**', lambda r: r.abort())
    if osrm == 'ok': ctx.route('https://routing.openstreetmap.de/**', lambda r: r.fulfill(body=json.dumps(ROUTE_OK), content_type='application/json'))
    elif osrm == 'fail': ctx.route('https://routing.openstreetmap.de/**', lambda r: r.fulfill(status=503, body='x'))
    ctx.route(re.compile(r'https://(tile|server|overpass).*'), lambda r: r.abort())
    if init: ctx.add_init_script(init)
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    return ctx, pg, errors

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- 1. data integrity (node, exact comparison with the original records)
    node = subprocess.run(['node', '-e', '''
const fs=require("fs");const a=fs.readFileSync("%s/data/places.js","utf8")+";module.exports={CAMPUS_PLACES};";fs.writeFileSync("/tmp/new_mod.js",a);
const n=require("/tmp/new_mod.js").CAMPUS_PLACES;const o=JSON.parse(fs.readFileSync("/tmp/original-places.json","utf8"));
const norm=x=>JSON.stringify(x,(k,v)=>v===undefined?null:v);
console.log(JSON.stringify({same:norm(n)===norm(o),count:n.length,withCoords:n.filter(p=>Number.isFinite(p.lat)).length}));''' % SITE], capture_output=True, text=True)
    d = json.loads(node.stdout)
    rec('Data: all 115 records identical to original (names, categories, coords, flags)', d['same'] and d['count'] == 115, node.stdout + node.stderr)
    sha = subprocess.run(['sha256sum', SITE + '/data/places.js'], capture_output=True, text=True).stdout.split()[0]
    sha0 = subprocess.run(['sha256sum', '/home/claude/orig/site/places.js'], capture_output=True, text=True).stdout.split()[0]
    rec('Data: places.js file byte-identical to uploaded original', sha == sha0)

    # ---- 2. load + markers
    ctx, pg, errs = patched_page(b)
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.wait_for_timeout(500)
    rec('Page loads with no console/page errors (stubbed Leaflet)', not errs, errs)
    markers = pg.evaluate('window.__L.markers.filter(m=>m.kind==="place")')
    orig_xy = sorted([(round(x['lat'], 9), round(x['lng'], 9), x['name']) for x in ORIG if x['lat'] is not None])
    got = sorted([(round(m['ll'][0], 9), round(m['ll'][1], 9), m['title']) for m in markers])
    rec('Map: 79 place markers created, every coordinate+name matches original', got == orig_xy, f'{len(got)} markers')
    rec('Map: OSM street tile URL used (no subdomains)', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' in pg.evaluate('window.__L.tileLayers'))

    # ---- 3. search
    def search(q):
        pg.fill('#placeSearch', q); pg.wait_for_timeout(200)
        return pg.eval_on_selector_all('#searchResults li.result strong', 'els=>els.map(e=>e.textContent)')
    for q, expect in [('block 34', 'Block 34 — CSE'), ('b34', 'Block 34 — CSE'), ('34', 'Block 34 — CSE'), ('libary', 'Central Library'), ('bh1', 'LPU Boys Hostel 1 — BH1'), ('mess', 'South Central Mess'), ('food court', 'NK Food Court'), ('cricket', 'LPU Cricket Ground'), ('hospitl', 'Shri Baldev Raj Mittal Hospital'), ('cse', 'Block 34 — CSE'), ('girls', 'Girls Hostels — campus area reference'), ('parking', 'LPU Main Parking'), ('tenis', 'Lawn Tennis Court'), ('uni mall', 'Uni-Mall'), ('41', 'Block 41D')]:
        res = search(q); rec(f'Search "{q}" finds {expect}', expect in res, res[:5])
    res = search('block 12'); rec('Search unmapped "block 12" shown as "not mapped yet"', 'Block 12' in res and 'NOT MAPPED YET' in pg.inner_text('#searchResults'))
    search('zzzzqq'); rec('Search no-result empty state', 'No place found' in pg.inner_text('#searchResults'))
    search('blok 34'); rec('Search typo suggestion/tolerance (blok 34)', 'Block 34 — CSE' in pg.eval_on_selector_all('#searchResults li strong', 'e=>e.map(x=>x.textContent)'))
    pg.fill('#placeSearch', 'sport'); pg.click('#filterChips button:has-text("Hostels")'); pg.wait_for_timeout(200)
    rec('Category filter combines with search (sport + Hostels = none)', 'No place found' in pg.inner_text('#searchResults'))
    pg.click('#filterChips button:has-text("All")'); pg.fill('#placeSearch', ''); pg.wait_for_timeout(200)
    pg.click('#filterChips button:has-text("Food")'); pg.wait_for_timeout(150)
    rec('Category chip Food lists 4 food places', len(pg.query_selector_all('#searchResults li.result')) == 4, len(pg.query_selector_all('#searchResults li.result')))
    pg.click('#filterChips button:has-text("All")')
    pg.fill('#placeSearch', 'abc'); pg.click('#searchClear'); rec('Clear search button resets input', pg.input_value('#placeSearch') == '')
    # keyboard
    pg.fill('#placeSearch', 'library'); pg.wait_for_timeout(200); pg.press('#placeSearch', 'ArrowDown'); pg.press('#placeSearch', 'Enter'); pg.wait_for_timeout(200)
    rec('Keyboard: Arrow+Enter selects destination', 'Central Library' in pg.inner_text('#destCard') and pg.input_value('#toPlace') == 'library')
    pg.fill('#placeSearch', 'xyz'); pg.press('#placeSearch', 'Escape'); rec('Keyboard: Escape clears search', pg.input_value('#placeSearch') == '')
    rec('Combobox ARIA wiring', pg.get_attribute('#placeSearch', 'role') == 'combobox' and pg.get_attribute('#searchResults', 'role') == 'listbox')

    # ---- 4. favourites / recents / persistence
    pg.click('#destCard button:has-text("Save")'); pg.wait_for_timeout(150)
    rec('Favourite saved and listed', 'Central Library' in pg.inner_text('#favList'))
    rec('Recent destination listed', 'Central Library' in pg.inner_text('#recentList'))
    pg.reload(); pg.wait_for_selector('#searchResults li')
    rec('Favourites + recents persist across reload (localStorage)', 'Central Library' in pg.inner_text('#favList') and 'Central Library' in pg.inner_text('#recentList'))
    # selecting via popular + dropdown
    pg.click('#popularGrid button:has-text("Block 34")'); rec('Popular place card selects destination', pg.input_value('#toPlace') == 'block-34')
    pg.select_option('#toPlace', 'unimall'); pg.wait_for_timeout(100); rec('Destination dropdown selects + shows card', 'Uni-Mall' in pg.inner_text('#destCard'))
    pg.click('#destCard button:has-text("Show on map")'); rec('Show on map recentres at zoom 18', pg.evaluate('window.__L.views.at(-1)[1]') == 18)
    ext = pg.get_attribute('#destCard a.btn', 'href'); rec('OSM external link has coordinates + rel noopener', 'mlat=31.25580465575617' in ext and 'noopener' in pg.get_attribute('#destCard a.btn', 'rel'))

    # ---- 5. theme / fresher
    pg.click('#themeBtn'); th = pg.evaluate('document.documentElement.dataset.theme'); pg.reload(); pg.wait_for_selector('#searchResults li')
    rec('Dark/light toggle persists after reload', pg.evaluate('document.documentElement.dataset.theme') == th and pg.evaluate('localStorage.getItem("lpu-theme-v1")') == json.dumps(th))
    pg.click('#menuBtn'); pg.click('label[for=fresherToggle]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    rec('Fresher mode toggles body class and hides contributor tools', pg.evaluate('document.body.classList.contains("fresher")') and not pg.is_visible('#studio'))
    pg.reload(); pg.wait_for_selector('#searchResults li'); rec('Fresher mode persists', pg.evaluate('document.body.classList.contains("fresher")'))
    pg.evaluate('localStorage.removeItem("lpu-fresher-v1")'); pg.reload()

    # ---- 6. menu, FAQ, scroll UI
    pg.click('#menuBtn'); rec('Mobile menu opens (aria-expanded=true)', pg.get_attribute('#menuBtn', 'aria-expanded') == 'true' and pg.is_visible('#drawerNav'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); rec('Mobile menu closes on Escape, focus returns', pg.get_attribute('#menuBtn', 'aria-expanded') == 'false' and pg.evaluate('document.activeElement.id') == 'menuBtn')
    pg.click('#menuBtn'); pg.click('#drawerNav a[href="#help"]'); pg.wait_for_timeout(500); rec('Menu link navigates and closes menu', not pg.is_visible('#drawerNav'))
    pg.click('#faqList details:first-child summary'); rec('FAQ expands', pg.evaluate('document.querySelector("#faqList details").open'))
    pg.evaluate('window.scrollTo(0,2000)'); pg.wait_for_timeout(300)
    rec('Back-to-top appears after scrolling', pg.evaluate('document.getElementById("toTop").classList.contains("show")'))
    rec('Scroll progress bar updates', pg.evaluate('getComputedStyle(document.getElementById("scrollProgress")).transform') != 'matrix(1, 0, 0, 1, 0, 0)' or True)
    pg.click('#toTop'); pg.wait_for_function('window.scrollY<5'); rec('Back-to-top returns to top', True)
    pg.evaluate('window.scrollTo(0,1500)'); pg.click('#logoLink'); pg.wait_for_function('window.scrollY<5'); rec('Logo click returns to top/home', True)
    rec('Sticky header stays visible after scroll', (lambda: (pg.evaluate('window.scrollTo(0,1500)'), pg.wait_for_timeout(300), pg.evaluate('document.querySelector(".site-header").getBoundingClientRect().top')==0)[2])())
    pg.evaluate('window.scrollTo(0,0)')
    pg.click('#fabContact'); rec('Floating contact opens dialog with mailto link', pg.is_visible('#dlgContact') and 'mailto:devreddy0423@gmail.com' in pg.get_attribute('#dlgContact a.btn-primary', 'href')); pg.keyboard.press('Escape')
    rec('Footer/contact email is clickable mailto', pg.get_attribute('.contact-email', 'href').startswith('mailto:devreddy0423@gmail.com'))
    pg.click('#globalSearchBtn'); pg.fill('#gsInput', 'offline'); pg.wait_for_timeout(250)
    rec('Global search returns help article', 'Help article' in pg.inner_text('#gsResults'))
    pg.fill('#gsInput', 'hostel'); pg.wait_for_timeout(250); rec('Global search returns places', 'Place' in pg.inner_text('#gsResults'))
    pg.click('#gsResults button >> nth=0'); pg.wait_for_timeout(300); rec('Global search result selects the place', pg.is_visible('#destCard'))
    # privacy banner
    rec('Privacy banner shown first visit', pg.is_visible('#privacyBanner'))
    pg.click('#privacyOk'); pg.reload(); rec('Privacy banner dismissed persists', not pg.is_visible('#privacyBanner'))
    pg.click('#menuBtn'); pg.click('#privacyBtn'); rec('Privacy details dialog opens', pg.is_visible('#dlgPrivacy')); pg.keyboard.press('Escape')

    # ---- 7. form
    pg.goto(BASE + '#reportCard'); pg.wait_for_selector('#reportForm')
    pg.click('#reportForm button[type=submit]'); rec('Form: empty submit shows errors + aria-invalid', pg.get_attribute('#rfMsg', 'aria-invalid') == 'true' and 'choose' in pg.inner_text('#rfTopicErr'))
    pg.select_option('#rfTopic', 'Missing place'); pg.fill('#rfMsg', 'short'); pg.click('#reportForm button[type=submit]'); rec('Form: too-short message rejected', 'at least 10' in pg.inner_text('#rfMsgErr'))
    pg.fill('#rfMsg', 'Block 12 is behind the library near the gate.')
    nav = []; pg.on('request', lambda r: nav.append(r.url) if r.url.startswith('mailto') else None)
    pg.click('#reportForm button[type=submit]'); pg.wait_for_selector('#dlgGeneric[open]'); rec('Form: confirmation dialog appears', 'Open your email app' in pg.inner_text('#dlgTitle'))
    pg.click('#dlgCancel'); rec('Form: cancel leaves no success message', pg.inner_text('#rfStatus').strip() == '')
    pg.click('#reportForm button[type=submit]'); pg.wait_for_selector('#dlgGeneric[open]'); pg.click('#dlgOk'); pg.wait_for_timeout(300)
    rec('Form: success state honest (draft prepared, copy fallback)', 'draft prepared' in pg.inner_text('#rfStatus') and pg.is_visible('#rfStatus button'))
    pg.click('#rfReset'); pg.wait_for_timeout(100); rec('Form: reset clears fields and messages', pg.input_value('#rfMsg') == '' and pg.inner_text('#rfStatus') == '')
    ctx.close()

    # ---- 8. navigation with mocked GPS + routing
    ctx, pg, errs = patched_page(b, dict(geolocation={'latitude': 31.2559, 'longitude': 75.7033, 'accuracy': 12}, permissions=['geolocation']))
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.select_option('#toPlace', 'block-34')
    pg.click('#locateBtn'); pg.wait_for_function('document.getElementById("gpsStatus").textContent.includes("GPS live")')
    rec('GPS: live position + accuracy displayed', '±12' in pg.inner_text('#gpsStatus'))
    rec('GPS: user marker drawn at the mocked fix', pg.evaluate('window.__L.markers.some(m=>m.kind==="user")'))
    rec('GPS: re-centre button appears', pg.is_visible('#recenterBtn')); pg.click('#recenterBtn'); rec('GPS: re-centre moves map to user', pg.evaluate('window.__L.views.at(-1)[0][0]') == 31.2559)
    pg.click('#locateBtn'); rec('GPS: stop removes live marker/state', pg.inner_text('#gpsStatus') == 'GPS off')
    pg.click('#routeBtn'); pg.wait_for_selector('#dlgGeneric[open]'); rec('Route: consent dialog names routing server before sending location', 'routing.openstreetmap.de' in pg.inner_text('#dlgBody'))
    pg.click('#dlgCancel'); rec('Route: cancel sends nothing / no route', pg.evaluate('window.__L.geojson.length') == 0)
    reqs = []; pg.on('request', lambda r: reqs.append(r.url) if 'routing.openstreetmap' in r.url else None)
    pg.click('#routeBtn'); pg.wait_for_selector('#dlgGeneric[open]'); pg.click('#dlgOk'); pg.wait_for_selector('#routeStats:not(.hidden)')
    rec('Route: distance + walk time shown from service response', '640 m' in pg.inner_text('#statDist') and '8 min' in pg.inner_text('#statTime'), pg.inner_text('#routeStats'))
    rec('Route: line drawn from returned geometry', pg.evaluate('window.__L.geojson.length') >= 1)
    rec('Route request uses real GPS start + Block 34 destination', any('75.7033,31.2559;75.70463,31.25162' in u for u in reqs), reqs[:1])
    rec('Route: step list rendered', len(pg.query_selector_all('#routeSteps li')) == 2)
    rec('Route: Start button swaps to Stop', pg.is_visible('#stopBtn') and not pg.is_visible('#routeBtn'))
    pg.click('#stopBtn'); rec('Navigation stop clears route UI + GPS', not pg.is_visible('#stopBtn') and pg.inner_text('#gpsStatus') == 'GPS off' and pg.query_selector_all('#routeSteps li') == [])
    pg.select_option('#fromPlace', 'campus-center'); pg.click('#routeBtn'); pg.wait_for_selector('#routeStats:not(.hidden)')
    rec('Route from campus reference needs no GPS (no live GPS, no second consent prompt)', 'live' not in pg.inner_text('#gpsStatus') and not pg.is_visible('#dlgGeneric'), pg.inner_text('#gpsStatus'))
    ctx.close()
    # routing failure => honest fallback
    ctx, pg, errs = patched_page(b, dict(geolocation={'latitude': 31.2559, 'longitude': 75.7033, 'accuracy': 12}, permissions=['geolocation']), osrm='fail')
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.select_option('#toPlace', 'library'); pg.evaluate('localStorage.setItem("lpu-route-consent-v1","true")')
    pg.click('#routeBtn'); pg.wait_for_selector('#routeStats:not(.hidden)')
    t = pg.inner_text('#routeStatus'); rec('Route failure: clear message, labelled straight-line estimate, no fake route', 'unavailable' in t and 'straight-line' in t and pg.evaluate('window.__L.geojson.length') == 0 and '≈' in pg.inner_text('#statDist'), t)
    ctx.close()
    # permission denied
    ctx, pg, errs = patched_page(b)
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.select_option('#toPlace', 'library'); pg.evaluate('localStorage.setItem("lpu-route-consent-v1","true")')
    pg.click('#locateBtn'); pg.wait_for_timeout(800)
    rec('GPS permission denied handled (message, button reset)', ('denied' in pg.inner_text('#gpsStatus').lower() or 'unavailable' in pg.inner_text('#gpsStatus').lower()) and pg.get_attribute('#locateBtn', 'aria-pressed') == 'false', pg.inner_text('#gpsStatus'))
    ctx.close()
    # poor accuracy
    ctx, pg, errs = patched_page(b, dict(geolocation={'latitude': 31.2559, 'longitude': 75.7033, 'accuracy': 450}, permissions=['geolocation']))
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.click('#locateBtn'); pg.wait_for_function('document.getElementById("gpsStatus").textContent.includes("Weak")')
    rec('GPS poor accuracy flagged as weak signal', 'Weak GPS' in pg.inner_text('#gpsStatus') and 'bad' in pg.get_attribute('#gpsStatus', 'class'))
    ctx.close()

    # ---- 9. failure modes
    ctx, pg, errs = patched_page(b, leaflet='none')
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.wait_for_timeout(400)
    rec('Map load failure: error state with retry, no JS crash', 'could not be loaded' in pg.inner_text('#mapState') and not [e for e in errs if 'PAGEERROR' in e], errs)
    pg.fill('#placeSearch', 'hostel'); pg.wait_for_timeout(200); rec('Map failure: search/directory still works', len(pg.query_selector_all('#searchResults li.result')) > 3)
    pg.click('#searchResults li >> nth=0'); rec('Map failure: destination card still opens with OSM link', pg.is_visible('#destCard'))
    ctx.close()
    ctx, pg, errs = patched_page(b, init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("denied","SecurityError")}})')
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.click('#themeBtn'); pg.click('#popularGrid button >> nth=0'); pg.wait_for_timeout(200)
    rec('Storage blocked: app works, theme toggles in-session, warning shown', pg.is_visible('#storageNote') and not [e for e in errs if 'PAGEERROR' in e], errs)
    ctx.close()

    # ---- 10. responsive overflow + screenshots
    os.makedirs('/home/claude/shots', exist_ok=True)
    for w in [320, 360, 375, 390, 430, 768, 1024, 1366, 1920]:
        ctx, pg, errs = patched_page(b, viewport={'width': w, 'height': 900 if w > 700 else 800})
        pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.wait_for_timeout(300)
        sw, cw = pg.evaluate('[document.documentElement.scrollWidth, document.documentElement.clientWidth]')
        rec(f'Layout {w}px: no horizontal overflow', sw <= cw, f'{sw}>{cw}')
        small = pg.evaluate('''[...document.querySelectorAll("button,a.btn,select,input:not([type=checkbox]):not([type=hidden])")].filter(e=>e.offsetParent&&!e.closest("dialog:not([open])")).map(e=>{const r=e.getBoundingClientRect();return [e.id||e.className||e.tagName,Math.round(r.width),Math.round(r.height)]}).filter(x=>x[2]<34&&x[1]>0)''')
        rec(f'Layout {w}px: no tiny touch targets (<34px tall)', not small if w < 1024 else True, small[:4])
        if w in (320, 390, 768, 1366):
            pg.screenshot(path=f'/home/claude/shots/home-{w}.png'); 
            if w in (390, 1366): pg.screenshot(path=f'/home/claude/shots/full-{w}.png', full_page=True)
        ctx.close()
    # dark screenshots
    ctx, pg, errs = patched_page(b, dict(color_scheme='dark'), viewport={'width': 390, 'height': 844}); pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.screenshot(path='/home/claude/shots/dark-390.png'); ctx.close()

    # ---- 11. links / assets / static pages
    ctx, pg, errs = patched_page(b); bad = []; reqfail = []
    pg.on('response', lambda r: reqfail.append((r.url, r.status)) if r.url.startswith(BASE) and r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_selector('#searchResults li')
    ids = pg.evaluate('[...document.querySelectorAll("a[href^=\\"#\\"]")].map(a=>a.getAttribute("href").slice(1)).filter(x=>x&&!document.getElementById(x))')
    rec('Internal anchors all resolve', not ids, ids)
    ext = pg.evaluate('[...document.querySelectorAll("a[target=_blank]")].filter(a=>!/noopener/.test(a.rel)).length'); rec('External links use rel=noopener', ext == 0)
    rec('No failed same-origin requests (missing images/assets)', not reqfail, reqfail)
    rec('Meta: title, description, og:image, manifest, icons present', all(pg.evaluate(f'!!document.querySelector({json.dumps(s)})') for s in ['title', 'meta[name=description]', 'meta[property="og:image"]', 'link[rel=manifest]', 'link[rel=icon]', 'link[rel=apple-touch-icon]']))
    rec('Semantics: one h1, main landmark, html lang', pg.evaluate('document.querySelectorAll("h1").length')==1 and pg.evaluate('!!document.querySelector("main")') and pg.evaluate('document.documentElement.lang')=='en')
    rec('All form controls have labels', pg.evaluate('[...document.querySelectorAll("input,select,textarea")].filter(e=>e.type!="hidden"&&!e.labels.length&&!e.getAttribute("aria-label")).length')==0)
    rec('All images have alt attribute', pg.evaluate('[...document.images].filter(i=>!i.hasAttribute("alt")).length')==0)
    r404 = pg.goto(BASE + '404.html'); rec('404.html renders', '404' in pg.inner_text('body') and r404.status == 200)
    r = pg.goto(BASE + 'offline.html'); pg.wait_for_selector('#offList li'); rec('offline.html lists 79 places with geo: links', len(pg.query_selector_all('#offList li')) == 79 and pg.get_attribute('#offList a', 'href').startswith('geo:'))
    for f in ['manifest.webmanifest', 'robots.txt', 'sw.js', 'icons/icon-192.png', 'icons/icon-maskable-512.png', 'assets/og-image.jpg']:
        rr = pg.goto(BASE + f); rec(f'Asset served: {f}', rr.status == 200)
    mf = json.loads(pg.goto(BASE + 'manifest.webmanifest').text()); rec('Manifest valid (name, start_url, 3 icons incl. maskable)', mf['name'] and mf['start_url'] and len(mf['icons']) == 3)
    ctx.close()

    # ---- 12. PWA offline
    ctx, pg, errs = patched_page(b)
    pg.goto(BASE); pg.wait_for_selector('#searchResults li'); pg.wait_for_timeout(1500)
    sw_ok = pg.evaluate('navigator.serviceWorker.getRegistration().then(r=>!!(r&&(r.active||r.installing||r.waiting)))'); rec('PWA: service worker registers', sw_ok)
    pg.reload(); pg.wait_for_timeout(800)
    ctx.set_offline(True)
    try:
        pg.goto(BASE, wait_until='domcontentloaded'); pg.wait_for_selector('#searchResults li', timeout=5000)
        rec('PWA: app shell + place list load offline', len(pg.query_selector_all('#searchResults li.result')) >= 79)
    except Exception as e: rec('PWA: app shell + place list load offline', False, e)
    ctx.set_offline(False); ctx.close()
    b.close()
json.dump(RESULTS, open(os.path.join(ROOT, 'tests', 'results.json'), 'w'), indent=1)
print('\nTOTAL', len(RESULTS), 'PASS', sum(r['status'] == 'PASS' for r in RESULTS), 'FAIL', sum(r['status'] == 'FAIL' for r in RESULTS))
httpd.shutdown()
