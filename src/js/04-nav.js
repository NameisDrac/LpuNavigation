/* Directory UI, destination card, favourites/recents, Leaflet map, GPS and walking routes */
(function () {
  'use strict';
  const LPU = window.LPU, $ = LPU.$, el = LPU.el, M = LPU.model, store = LPU.store;
  const CENTER = [31.2559, 75.7033];
  const POPULAR = ['block-34', 'library', 'unimall', 'lpu-main-parking', 'block-31', 'block-32', 'mb-food-square', 'shri-baldev-raj-mittal-hospital', 'division-student-welfare', 'lpu-main-sports-field'];
  const ROUTE_URL = (s, d) => `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${s.lng},${s.lat};${d.lng},${d.lat}?overview=full&geometries=geojson&steps=true`;
  const K = { fav: 'lpu-favorites-v1', rec: 'lpu-recents-v1', consent: 'lpu-route-consent-v1' };

  const S = {
    map: null, markers: {}, destMarker: null, userMarker: null, accCircle: null, routeLayer: null, fallbackLayer: null,
    selected: null, group: 'all', activeIndex: -1, rows: [],
    watchId: null, gpsReasons: new Set(), pos: null,
    nav: null, routeReq: 0, routeBusy: false, tileErrors: 0
  };
  LPU.nav = S;

  /* ---------- favourites / recents ---------- */
  const favs = () => store.get(K.fav, []).filter((id) => M.byId(id));
  const recs = () => store.get(K.rec, []).filter((id) => M.byId(id));
  function toggleFav(id) {
    let f = store.get(K.fav, []);
    const had = f.includes(id);
    f = had ? f.filter((x) => x !== id) : [id].concat(f).slice(0, 50);
    store.set(K.fav, f);
    LPU.toast(had ? 'Removed from favourites' : 'Saved to favourites', 'success');
    renderSaved(); renderDest();
  }
  function addRecent(id) { store.set(K.rec, [id].concat(store.get(K.rec, []).filter((x) => x !== id)).slice(0, 8)); renderSaved(); }
  function renderSaved() {
    const fill = (ul, ids, emptyText) => {
      ul.textContent = '';
      if (!ids.length) { ul.append(el('li', { class: 'muted', text: emptyText, style: 'font-size:.85rem' })); return; }
      ids.forEach((id) => { const p = M.byId(id); ul.append(el('li', {}, [el('button', { type: 'button', onclick: () => select(id, { scroll: true }) }, [p.name, el('small', { text: p.category })])])); });
    };
    fill($('favList'), favs(), 'Tap ★ Save on any place to keep it here.');
    fill($('recentList'), recs(), 'Places you open will appear here.');
    const n = $('storageNote'); if (n) n.hidden = store.persistent;
  }

  /* ---------- search + directory list ---------- */
  function renderFilters() {
    const box = $('filterChips'); box.textContent = '';
    M.GROUPS.forEach((g) => box.append(el('button', { type: 'button', class: 'chip', 'aria-pressed': String(S.group === g.id), text: g.label, onclick: () => { S.group = g.id; renderFilters(); renderResults(); } })));
  }
  function statusTag(p) { return p.verified ? el('span', { class: 'tag ok', text: 'VERIFIED' }) : el('span', { class: 'tag', text: 'APPROX. PIN' }); }
  function renderResults() {
    const q = $('placeSearch').value;
    $('searchClear').hidden = !q;
    const r = M.search(q, S.group);
    const ul = $('searchResults'); ul.textContent = ''; S.rows = []; S.activeIndex = -1;
    $('placeSearch').removeAttribute('aria-activedescendant');
    const mk = (e, i, unmapped) => {
      const p = e.p;
      const li = el('li', { class: 'result' + (unmapped ? ' unmapped' : ''), role: 'option', id: 'opt-' + i, 'aria-selected': 'false', onclick: () => select(p.id, { scroll: true }) });
      li.append(el('strong', { text: p.name }));
      const meta = el('span', { class: 'meta' }, [p.category + ' ', unmapped ? el('span', { class: 'tag', text: 'NOT MAPPED YET' }) : statusTag(p)]);
      li.append(meta);
      if (!unmapped && !$('placeSearch').value && !document.body.classList.contains('fresher')) li.append(el('span', { class: 'coords', text: `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` }));
      S.rows.push({ li, id: p.id }); ul.append(li);
    };
    r.results.forEach((e, i) => mk(e, i, false));
    r.unmapped.forEach((e, i) => mk(e, r.results.length + i, true));
    const mapped = r.results.length, notMapped = r.unmapped.length;
    $('dirSummary').textContent = q || S.group !== 'all'
      ? `${mapped} mapped ${mapped === 1 ? 'match' : 'matches'}${notMapped ? ` · ${notMapped} listed without a location` : ''}`
      : `${mapped} mapped places. Some numbered blocks are listed but have no coordinates yet.`;
    if (!mapped && !notMapped) {
      const box = el('li', { class: 'empty', role: 'presentation' }, [el('strong', { text: 'No place found' }), el('span', { text: 'Check the spelling or try a block number, hostel, food or sports.' })]);
      if (r.suggestions.length) {
        box.append(el('div', { text: 'Did you mean:', style: 'margin-top:8px' }));
        const chips = el('div', { class: 'chips' });
        r.suggestions.forEach((e) => chips.append(el('button', { type: 'button', class: 'chip', text: e.p.name, onclick: () => { $('placeSearch').value = e.p.name; renderResults(); } })));
        box.append(chips);
      }
      ul.append(box);
    }
  }
  function setActive(i) {
    if (!S.rows.length) return;
    S.activeIndex = (i + S.rows.length) % S.rows.length;
    S.rows.forEach((r, idx) => r.li.setAttribute('aria-selected', String(idx === S.activeIndex)));
    const a = S.rows[S.activeIndex].li; $('placeSearch').setAttribute('aria-activedescendant', a.id);
    a.scrollIntoView({ block: 'nearest' });
  }
  function wireSearch() {
    const inp = $('placeSearch');
    inp.addEventListener('input', LPU.debounce(renderResults, 80));
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(S.activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(S.activeIndex < 0 ? S.rows.length - 1 : S.activeIndex - 1); }
      else if (e.key === 'Enter') { const r = S.rows[S.activeIndex >= 0 ? S.activeIndex : 0]; if (r) { e.preventDefault(); select(r.id, { scroll: true }); } }
      else if (e.key === 'Escape') { if (inp.value) { e.preventDefault(); inp.value = ''; renderResults(); } }
    });
    $('searchClear').addEventListener('click', () => { inp.value = ''; renderResults(); inp.focus(); });
  }
  function renderPopular() {
    const g = $('popularGrid'); g.textContent = '';
    POPULAR.map((id) => M.byId(id)).filter((p) => p && LPU.hasCoords(p)).forEach((p) => g.append(el('button', { type: 'button', class: 'quick-card', onclick: () => select(p.id, { scroll: true }) }, [p.name.split(' — ')[0], el('small', { text: p.category })])));
    [['Hostels', 'hostel'], ['Food', 'food'], ['Sports', 'sports'], ['Medical', 'medical']].forEach(([l, gid]) => g.append(el('button', { type: 'button', class: 'quick-card hide-fresher', onclick: () => { S.group = gid; $('placeSearch').value = ''; renderFilters(); renderResults(); $('searchCard').scrollIntoView({ behavior: LPU.reduceMotion() ? 'auto' : 'smooth' }); } }, ['All ' + l.toLowerCase(), el('small', { text: 'Filter the list' })])));
  }
  function fillDestinationSelect() {
    const sel = $('toPlace'), prev = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    const groups = {};
    M.all().filter(LPU.hasCoords).forEach((p) => { (groups[p.category] = groups[p.category] || []).push(p); });
    Object.keys(groups).sort().forEach((cat) => {
      const og = el('optgroup', { label: cat });
      groups[cat].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((p) => og.append(el('option', { value: p.id, text: p.name + (p.verified ? '' : ' (approx.)') })));
      sel.append(og);
    });
    if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }

  /* ---------- destination card ---------- */
  function renderDest() {
    const c = $('destCard'), p = S.selected;
    if (!p) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden'); c.textContent = '';
    const isFav = favs().includes(p.id), has = LPU.hasCoords(p);
    c.append(el('span', { class: 'eyebrow', text: 'Selected destination' }), el('h3', { text: p.name }));
    c.append(el('div', { class: 'dest-meta' }, [p.category + ' ', has ? statusTag(p) : el('span', { class: 'tag', text: 'NOT MAPPED YET' })]));
    if (!has) {
      c.append(el('div', { class: 'notice', text: 'This place is in the directory, but no coordinates have been added yet, so it cannot be shown on the map or routed to. Please report it with the form below if you know where it is.' }));
      c.append(el('div', { class: 'btn-row' }, [el('button', { class: 'btn', type: 'button', text: 'Report location', onclick: () => LPU.reportPlace(p.name) })]));
      return;
    }
    if (!p.verified) c.append(el('div', { class: 'notice', text: 'Approximate pin supplied by the project owner, not independently surveyed. Confirm the building and entrance with campus signs.' }));
    c.append(el('div', { class: 'kv', text: `Coordinates: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` }));
    const osm = el('a', { class: 'btn', href: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=19/${p.lat}/${p.lng}`, target: '_blank', rel: 'noopener noreferrer', text: 'Open in OpenStreetMap ↗' });
    c.append(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary wide', type: 'button', text: 'Get walking route', onclick: () => { $('toPlace').value = p.id; startNavigation(); } }),
      el('button', { class: 'btn', type: 'button', 'aria-pressed': String(isFav), text: isFav ? '★ Saved' : '☆ Save', onclick: () => toggleFav(p.id) }),
      el('button', { class: 'btn', type: 'button', text: 'Show on map', onclick: () => flyTo(p, true) }),
      osm,
      el('button', { class: 'btn btn-outline', type: 'button', text: 'Report a problem', onclick: () => LPU.reportPlace(p.name) })
    ]));
  }

  /* ---------- selection ---------- */
  function select(id, opts) {
    opts = opts || {};
    const p = M.byId(id); if (!p) return;
    S.selected = p;
    $('mapTitle').textContent = p.name;
    $('mapSubtitle').textContent = LPU.hasCoords(p) ? `${p.category} · ${p.verified ? 'verified location' : 'approximate pin'}` : `${p.category} · location needed`;
    if (LPU.hasCoords(p)) { addRecent(p.id); $('toPlace').value = p.id; setDestMarker(p); flyTo(p, false); }
    renderDest();
    S.rows.forEach((r) => r.li.setAttribute('aria-selected', String(r.id === id)));
    LPU.announce(`${p.name} selected`);
    if (opts.scroll && window.matchMedia('(max-width:1023px)').matches) $('map').closest('.map-card').scrollIntoView({ behavior: LPU.reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }
  LPU.selectPlace = select;
  function flyTo(p, scroll) {
    if (!S.map || !LPU.hasCoords(p)) return;
    S.map.setView([p.lat, p.lng], 18, { animate: !LPU.reduceMotion() });
    if (scroll && window.matchMedia('(max-width:1023px)').matches) $('map').closest('.map-card').scrollIntoView({ block: 'start', behavior: LPU.reduceMotion() ? 'auto' : 'smooth' });
  }
  function setDestMarker(p) {
    if (!S.map) return;
    if (S.destMarker) S.map.removeLayer(S.destMarker);
    S.destMarker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: '<span class="pin dest"><span></span></span>', iconSize: [22, 22], iconAnchor: [11, 22] }), keyboard: false, zIndexOffset: 1000, title: 'Destination: ' + p.name }).addTo(S.map);
  }

  /* ---------- map ---------- */
  function mapFailed(msg) {
    const st = $('mapState'); st.textContent = '';
    st.append(el('div', {}, [el('strong', { text: 'The map could not be loaded' }), el('p', { class: 'muted', text: msg }),
      el('div', { class: 'btn-row', style: 'justify-content:center' }, [el('button', { class: 'btn btn-primary', type: 'button', text: 'Try again', onclick: () => location.reload() })]),
      el('p', { class: 'muted', style: 'font-size:.85rem', text: 'You can still search places and open them in OpenStreetMap from the list.' })]));
    st.classList.remove('hidden'); $('locateBtn').disabled = true;
    LPU.mapFailed = true;
  }
  function initMap() {
    if (!window.L) { mapFailed('The mapping library (Leaflet) did not load. Check your connection.'); return; }
    try {
      const map = (S.map = L.map('map', { zoomControl: false, tap: true }).setView(CENTER, 15));
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>' });
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community' });
      street.on('load', () => $('mapState').classList.add('hidden'));
      street.on('tileerror', () => { if (++S.tileErrors === 6) LPU.toast('Some map tiles are not loading. Check your internet connection.', 'error'); });
      street.addTo(map);
      L.control.layers({ 'Street map': street, 'Satellite imagery': sat }, null, { collapsed: true }).addTo(map);
      setTimeout(() => $('mapState').classList.add('hidden'), 6000);
      const group = (S.markerLayer = L.layerGroup().addTo(map));
      M.all().filter(LPU.hasCoords).forEach((p) => addMarker(p, group));
      map.on('click', () => {});
      new ResizeObserver(() => map.invalidateSize()).observe($('map'));
    } catch (err) { console.error(err); mapFailed('Something went wrong while starting the map.'); }
  }
  function addMarker(p, group) {
    if (S.markers[p.id] || !S.map) return;
    const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: '<span class="pin"><span></span></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), title: p.name, alt: p.name, keyboard: true });
    const pop = el('div', {}, [el('strong', { text: p.name }), el('div', { text: p.category }), el('div', { class: 'muted', text: p.verified ? 'Verified location' : 'Approximate pin' })]);
    m.bindPopup(pop);
    m.on('click', () => select(p.id));
    m.addTo(group || S.markerLayer); S.markers[p.id] = m;
  }
  LPU.addMarker = addMarker;

  /* ---------- GPS ---------- */
  function gpsPill(text, cls) { const n = $('gpsStatus'); n.textContent = text; n.className = 'gps-pill ' + (cls || ''); }
  function gpsRequest(reason) {
    S.gpsReasons.add(reason);
    if (S.watchId !== null) return;
    if (!navigator.geolocation) { S.gpsReasons.delete(reason); gpsPill('GPS is not supported on this device', 'bad'); LPU.toast('This browser or device does not support location.', 'error'); return; }
    gpsPill('Waiting for permission…');
    S.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, timeout: 20000, maximumAge: 1500 });
    $('locateBtn').setAttribute('aria-pressed', 'true'); $('locateLabel').textContent = 'Stop my location';
  }
  function gpsRelease(reason) {
    S.gpsReasons.delete(reason);
    if (S.gpsReasons.size) return;
    if (S.watchId !== null) { navigator.geolocation.clearWatch(S.watchId); S.watchId = null; }
    if (S.userMarker && S.map) { S.map.removeLayer(S.userMarker); S.userMarker = null; }
    if (S.accCircle && S.map) { S.map.removeLayer(S.accCircle); S.accCircle = null; }
    S.pos = null; gpsPill('GPS off'); $('recenterBtn').classList.add('hidden');
    $('locateBtn').setAttribute('aria-pressed', 'false'); $('locateLabel').textContent = 'Use my location';
  }
  function onPos(position) {
    const first = !S.pos;
    S.pos = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, t: Date.now() };
    const acc = Math.round(S.pos.accuracy || 0);
    gpsPill(acc > 100 ? `Weak GPS signal · ±${acc} m` : `GPS live · ±${acc} m`, acc > 300 ? 'bad' : acc > 100 ? 'warn' : 'good');
    $('recenterBtn').classList.remove('hidden');
    if (S.map) {
      const pt = [S.pos.lat, S.pos.lng];
      if (!S.userMarker) S.userMarker = L.marker(pt, { icon: L.divIcon({ className: '', html: '<span class="me-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false, title: 'Your current GPS position', zIndexOffset: 900 }).addTo(S.map).bindPopup('Your current GPS position');
      else S.userMarker.setLatLng(pt);
      const r = Math.max(5, S.pos.accuracy || 10);
      if (!S.accCircle) S.accCircle = L.circle(pt, { radius: r, color: '#16a34a', weight: 1, fillOpacity: 0.08, interactive: false }).addTo(S.map); else { S.accCircle.setLatLng(pt); S.accCircle.setRadius(r); }
      if (first && !S.nav) S.map.setView(pt, 18, { animate: !LPU.reduceMotion() });
    }
    if (first && acc > 300) LPU.toast('Your GPS signal is weak. Move outdoors for a better position.', 'error');
    if (S.nav) onNavPos(first);
  }
  function onPosErr(err) {
    const msg = { 1: 'Location permission was denied. Allow location for this site in your browser settings, or choose “LPU campus area” as the start point.', 2: 'Your position is unavailable. Check that device location is turned on.', 3: 'Getting your position timed out. Try near a window or outdoors.' }[err.code] || 'Could not read your location.';
    gpsPill(err.code === 1 ? 'Location permission denied' : 'GPS unavailable', 'bad');
    LPU.toast(msg, 'error');
    if (err.code === 1 || !S.pos) { S.gpsReasons.clear(); if (S.watchId !== null) { navigator.geolocation.clearWatch(S.watchId); S.watchId = null; } $('locateBtn').setAttribute('aria-pressed', 'false'); $('locateLabel').textContent = 'Use my location'; if (S.nav) stopNavigation(true); setStatus(msg); }
  }

  /* ---------- routing / navigation ---------- */
  function setStatus(t) { $('routeStatus').textContent = t; }
  function clearRoute() {
    ['routeLayer', 'fallbackLayer'].forEach((k) => { if (S[k] && S.map) S.map.removeLayer(S[k]); S[k] = null; });
    $('routeSteps').textContent = ''; $('routeStats').classList.add('hidden'); $('progressWrap').classList.add('hidden');
  }
  async function fetchRoute(start, dest) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(ROUTE_URL(start, dest), { signal: ctl.signal });
      if (!res.ok) throw new Error('Walking route service is unavailable (HTTP ' + res.status + ').');
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('No mapped walking path was found between these points.');
      const r = data.routes[0];
      if (!r.geometry || !Array.isArray(r.geometry.coordinates)) throw new Error('The routing service returned an unreadable route.');
      return r;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The routing service took too long to respond.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  function drawRoute(route, fit) {
    if (!S.map) return;
    if (S.routeLayer) S.map.removeLayer(S.routeLayer);
    if (S.fallbackLayer) { S.map.removeLayer(S.fallbackLayer); S.fallbackLayer = null; }
    S.routeLayer = L.geoJSON(route.geometry, { style: { color: '#1769ff', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }, interactive: false }).addTo(S.map);
    if (fit) S.map.fitBounds(S.routeLayer.getBounds(), { padding: [42, 42], animate: !LPU.reduceMotion() });
  }
  function showRouteInfo(route, start, dest) {
    $('routeStats').classList.remove('hidden');
    $('statDist').textContent = LPU.fmtDist(route.distance); $('statTime').textContent = LPU.fmtTime(route.duration);
    const steps = (route.legs && route.legs[0] && route.legs[0].steps) || [];
    const ol = $('routeSteps'); ol.textContent = '';
    steps.filter((s) => s.distance > 0).slice(0, 12).forEach((s) => ol.append(el('li', { text: `${(s.maneuver && s.maneuver.type === 'arrive') ? 'Arrive' : (s.name || 'Continue along the path')} (${Math.round(s.distance)} m)` })));
    const acc = start.accuracy ? ` · GPS ±${Math.round(start.accuracy)} m` : '';
    setStatus(`Walking route: ${LPU.fmtDist(route.distance)}, about ${LPU.fmtTime(route.duration)}${acc}${dest.verified ? '' : ' · destination pin is approximate'}.`);
  }
  function straightLineFallback(start, dest, reason) {
    const d = LPU.haversine(start, dest);
    if (S.map) {
      if (S.fallbackLayer) S.map.removeLayer(S.fallbackLayer);
      S.fallbackLayer = L.polyline([[start.lat, start.lng], [dest.lat, dest.lng]], { color: '#667', weight: 3, dashArray: '6 8', interactive: false }).addTo(S.map);
      S.map.fitBounds(S.fallbackLayer.getBounds(), { padding: [42, 42] });
    }
    $('routeStats').classList.remove('hidden');
    $('statDist').textContent = '≈ ' + LPU.fmtDist(d); $('statTime').textContent = '≈ ' + LPU.fmtTime(d / 1.35);
    setStatus(`${reason} Showing only the straight-line distance (dashed line, not a walking path); the time assumes about 5 km/h.`);
  }
  async function computeRoute(fit) {
    const nav = S.nav; if (!nav || S.routeBusy) return;
    const start = nav.from === 'gps' ? S.pos : { lat: CENTER[0], lng: CENTER[1] };
    if (!start) return;
    S.routeBusy = true; nav.lastAt = Date.now(); nav.lastPos = { lat: start.lat, lng: start.lng };
    const id = ++S.routeReq;
    try {
      if (!navigator.onLine) throw new Error('You appear to be offline.');
      const route = await fetchRoute(start, nav.dest);
      if (id !== S.routeReq || !S.nav) return;
      drawRoute(route, fit); showRouteInfo(route, start, nav.dest); nav.hadRoute = true;
      if (!nav.d0) nav.d0 = LPU.haversine(start, nav.dest);
    } catch (e) {
      if (id === S.routeReq && S.nav) {
        if (S.routeLayer && S.map) { S.map.removeLayer(S.routeLayer); S.routeLayer = null; }
        straightLineFallback(start, nav.dest, (e.message || 'Route unavailable.') + ' ');
      }
    } finally { S.routeBusy = false; }
  }
  function onNavPos(first) {
    const nav = S.nav; if (!nav || nav.from !== 'gps') return;
    const dist = LPU.haversine(S.pos, nav.dest);
    if (nav.d0) { const pct = Math.max(0, Math.min(100, Math.round((1 - dist / nav.d0) * 100))); $('progressBar').style.width = pct + '%'; $('progressWrap').setAttribute('aria-valuenow', String(pct)); $('progressWrap').classList.remove('hidden'); }
    if (dist < 25 && !nav.arrived) { nav.arrived = true; setStatus(`You are within ${Math.round(dist)} m of ${nav.dest.name}. Confirm the entrance with campus signs.`); LPU.toast('You have arrived (approximately).', 'success'); LPU.announce('You have arrived'); return; }
    if (first) { computeRoute(true); return; }
    const moved = nav.lastPos ? LPU.haversine(nav.lastPos, S.pos) : 999;
    if (!nav.arrived && Date.now() - nav.lastAt > 8000 && moved > 15) computeRoute(false);
  }
  async function startNavigation() {
    const dest = M.byId($('toPlace').value);
    if (!dest) { setStatus('Choose a destination first.'); LPU.toast('Choose a destination first.', 'error'); return; }
    if (!LPU.hasCoords(dest)) { setStatus(dest.name + ' has no coordinates yet.'); return; }
    if (!S.map) { setStatus('The map is not available, so navigation cannot start. You can still open the place in OpenStreetMap.'); return; }
    const from = $('fromPlace').value === 'campus-center' ? 'campus' : 'gps';
    if (!store.get(K.consent, false)) {
      const ok = await LPU.confirm({ title: 'Send route request?', text: from === 'gps' ? 'To draw a walking route, your current coordinates and the destination are sent to routing.openstreetmap.de, a public community routing service. Your location is not sent anywhere else.' : 'To draw a walking route, the campus reference point and the destination coordinates are sent to routing.openstreetmap.de, a public community routing service.', ok: 'Continue', cancel: 'Cancel' });
      if (!ok) return; store.set(K.consent, true);
    }
    stopNavigation(true);
    S.selected = dest; setDestMarker(dest); renderDest(); addRecent(dest.id);
    S.nav = { dest, from, d0: 0, lastAt: 0, lastPos: null, arrived: false };
    $('routeBtn').hidden = true; $('stopBtn').hidden = false;
    if (from === 'gps') {
      setStatus('Finding your location…'); gpsRequest('nav');
      if (S.pos) onNavPos(true);
    } else { setStatus('Planning route…'); computeRoute(true); }
    LPU.announce('Navigation started to ' + dest.name);
    if (window.matchMedia('(max-width:1023px)').matches) $('map').closest('.map-card').scrollIntoView({ block: 'start', behavior: LPU.reduceMotion() ? 'auto' : 'smooth' });
  }
  function stopNavigation(silent) {
    const had = !!S.nav; S.nav = null; S.routeReq++;
    clearRoute(); $('routeBtn').hidden = false; $('stopBtn').hidden = true;
    gpsRelease('nav');
    if (had && !silent) { setStatus('Navigation stopped.'); LPU.toast('Navigation stopped'); LPU.announce('Navigation stopped'); }
  }
  LPU.stopNavigation = stopNavigation;

  function resetMap() {
    stopNavigation(true);
    if (S.map) S.map.setView(CENTER, 15);
    if (S.destMarker && S.map) { S.map.removeLayer(S.destMarker); S.destMarker = null; }
    S.selected = null; renderDest(); setStatus('Choose a destination to plan a route.');
    $('mapTitle').textContent = 'Campus map'; $('mapSubtitle').textContent = 'Choose a destination to see it here';
  }

  /* ---------- refresh hooks used by the studio / OSM loader ---------- */
  LPU.refreshDirectory = function () { M.invalidate(); renderResults(); fillDestinationSelect(); renderSaved(); };

  LPU.initNavigator = function () {
    renderFilters(); wireSearch(); renderPopular(); renderResults(); fillDestinationSelect(); renderSaved(); initMap();
    $('routeBtn').addEventListener('click', startNavigation);
    $('stopBtn').addEventListener('click', () => stopNavigation(false));
    $('resetMapBtn').addEventListener('click', resetMap);
    $('toPlace').addEventListener('change', (e) => { if (e.target.value) select(e.target.value); });
    $('locateBtn').addEventListener('click', () => { if (S.gpsReasons.has('locate')) gpsRelease('locate'); else gpsRequest('locate'); });
    $('recenterBtn').addEventListener('click', () => { if (S.pos && S.map) S.map.setView([S.pos.lat, S.pos.lng], Math.max(S.map.getZoom(), 17), { animate: !LPU.reduceMotion() }); });
    window.addEventListener('offline', () => LPU.toast('You are offline. Map tiles and routes need internet.', 'error'));
    window.addEventListener('online', () => LPU.toast('Back online.', 'success'));
  };
})();
