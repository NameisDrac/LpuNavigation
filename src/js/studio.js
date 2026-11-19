/* Lazy-loaded: OpenStreetMap overlay loader + contributor mapping tools (ported from earlier releases).
   Storage keys are unchanged so existing browser data keeps working. */
(function () {
  'use strict';
  const LPU = window.LPU, $ = LPU.$, el = LPU.el, store = LPU.store, M = LPU.model, S = LPU.nav;
  const KEYS = { boundary: 'lpu-campus-boundary-v1', mapped: 'lpu-mapped-locations-v1', overrides: 'lpu-directory-coordinate-overrides-v1' };
  let osmBuildingLayer = null, osmPoiLayer = null, mappedLayer = null, boundaryLayer = null, drawnLayer = null, pendingLayer = null;
  let campusBoundary = store.get(KEYS.boundary, null);
  let picking = false, boundaryPicking = false, pendingCenter = null, pendingEntrance = null, pendingBoundary = null, osmLoaded = false;
  const round7 = (n) => Number(n.toFixed(7));

  function layers() {
    if (!S.map || osmBuildingLayer) return !!S.map;
    osmBuildingLayer = L.featureGroup().addTo(S.map); osmPoiLayer = L.featureGroup().addTo(S.map);
    mappedLayer = L.featureGroup().addTo(S.map); boundaryLayer = L.featureGroup().addTo(S.map); drawnLayer = L.featureGroup().addTo(S.map);
    if (campusBoundary) drawBoundary();
    return true;
  }
  const bStyle = { color: '#e87524', weight: 3, fillColor: '#e87524', fillOpacity: 0.06, dashArray: '8 5', interactive: false };
  function drawBoundary() { boundaryLayer.clearLayers(); if (campusBoundary) L.geoJSON(campusBoundary, { style: bStyle }).addTo(boundaryLayer); }

  /* geometry */
  function inRing(lat, lng, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi)) inside = !inside;
    }
    return inside;
  }
  function inPoly(lat, lng, poly) { return poly.length && inRing(lat, lng, poly[0]) && !poly.slice(1).some((r) => inRing(lat, lng, r)); }
  function insideCampus(lat, lng) {
    if (!campusBoundary) return false;
    if (campusBoundary.type === 'Polygon') return !!inPoly(lat, lng, campusBoundary.coordinates || []);
    if (campusBoundary.type === 'MultiPolygon') return campusBoundary.coordinates.some((p) => inPoly(lat, lng, p));
    return false;
  }

  /* OSM categories */
  function osmCategory(t) {
    const name = String(t.name || t['name:en'] || '').toLowerCase(), b = String(t.building || '').toLowerCase(), a = String(t.amenity || '').toLowerCase(), l = String(t.leisure || '').toLowerCase();
    if (b === 'dormitory' || a === 'dormitory' || /hostel|\bbh[- ]?\d|\bgh[- ]?\d/.test(name)) return 'Hostel';
    if (['pitch', 'stadium', 'sports_centre', 'track', 'sports_hall'].includes(l) || t.sport) return 'Sports ground';
    if (['restaurant', 'cafe', 'fast_food', 'food_court', 'canteen'].includes(a)) return 'Food & cafe';
    if (t.shop) return 'Shop / service';
    if (['hospital', 'clinic', 'pharmacy', 'doctors'].includes(a) || t.healthcare) return 'Healthcare';
    if (['bank', 'atm'].includes(a)) return 'Bank / ATM';
    if (a === 'library') return 'Library';
    if (['university', 'college', 'school'].includes(a) || ['university', 'college', 'school'].includes(b)) return 'Academic block';
    if (l || ['grass', 'recreation_ground', 'recreation'].includes(String(t.landuse || ''))) return 'Sports & recreation';
    if (a) return 'Facility · ' + a.replaceAll('_', ' ');
    if (b) return 'Building footprint';
    if (t.tourism) return 'Visitor facility';
    return 'Campus place';
  }
  function centerOf(e) {
    if (Number.isFinite(e.lat) && Number.isFinite(e.lon)) return [e.lat, e.lon];
    if (e.center && Number.isFinite(e.center.lat)) return [e.center.lat, e.center.lon];
    if (e.geometry && e.geometry.length) { const p = e.geometry; return [p.reduce((s, x) => s + x.lat, 0) / p.length, p.reduce((s, x) => s + x.lon, 0) / p.length]; }
    return null;
  }
  function popup(name, cat, lat, lon, tags) {
    const box = el('div', {}, [el('strong', { text: name }), el('div', { text: cat })]);
    ['building', 'amenity', 'shop', 'leisure', 'sport', 'cuisine', 'opening_hours', 'operator'].forEach((k) => { if (tags && tags[k]) box.append(el('div', {}, [el('b', { text: k.replaceAll('_', ' ') + ': ' }), String(tags[k])])); });
    box.append(el('small', { text: `${lat.toFixed(6)}, ${lon.toFixed(6)} · OpenStreetMap data, verify on site` }));
    return box;
  }

  LPU.applyOsmVisibility = function () {
    if (!S.map || !osmBuildingLayer) return;
    $('showBuildings').checked ? osmBuildingLayer.addTo(S.map) : S.map.removeLayer(osmBuildingLayer);
    $('showPois').checked ? osmPoiLayer.addTo(S.map) : S.map.removeLayer(osmPoiLayer);
  };

  LPU.loadOsm = async function () {
    const status = $('osmStatus'), btn = $('loadOsmBtn');
    if (!layers()) { status.textContent = 'The map is not available, so extra map data cannot be shown.'; return; }
    if (!navigator.onLine) { status.textContent = 'You are offline. Connect to the internet and try again.'; return; }
    btn.disabled = true; status.textContent = 'Requesting buildings, amenities, shops, food outlets and sports facilities…';
    const a = 'around:1800,31.2550,75.7050';
    const q = `[out:json][timeout:45];(nwr(${a})[building];nwr(${a})[amenity];nwr(${a})[shop];nwr(${a})[leisure];nwr(${a})[sport];nwr(${a})[landuse~"grass|recreation_ground|recreation"];nwr(${a})[healthcare];nwr(${a})[tourism];);out center tags geom;`;
    let data = null;
    for (const ep of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 50000);
      try {
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'data=' + encodeURIComponent(q), signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        data = await r.json(); break;
      } catch (e) { status.textContent = 'Trying another OpenStreetMap data server… (' + (e.name === 'AbortError' ? 'timed out' : e.message) + ')'; } finally { clearTimeout(t); }
    }
    btn.disabled = false;
    if (!data) { status.textContent = 'Could not load the extra map data. The map still works; try again later.'; LPU.toast('Could not load OpenStreetMap data', 'error'); return; }
    osmBuildingLayer.clearLayers(); osmPoiLayer.clearLayers(); M.osm = [];
    let nb = 0, np = 0, ub = 0, up = 0;
    for (const e of data.elements || []) {
      const tags = e.tags || {}, c = centerOf(e); if (!c) continue;
      const cat = osmCategory(tags); let name = tags.name || tags['name:en'];
      if (!name && tags.building) name = 'Unnamed campus building ' + ++ub;
      if (!name) name = `Unnamed ${cat.toLowerCase()} ${++up}`;
      const place = { id: `osm-${e.type}-${e.id}`, name, category: cat, description: 'OpenStreetMap feature; not verified by LPU.', lat: c[0], lng: c[1], verified: false, directionsEnabled: !!(campusBoundary && insideCampus(c[0], c[1])), source: `OpenStreetMap ${e.type}/${e.id}` };
      M.osm.push(place);
      const pop = popup(name, cat, c[0], c[1], tags);
      if (tags.building && e.geometry && e.geometry.length >= 3) { L.polygon(e.geometry.map((p) => [p.lat, p.lon]), { color: '#7c3aed', weight: 1.5, fillColor: '#8b5cf6', fillOpacity: 0.13 }).bindPopup(pop).addTo(osmBuildingLayer); nb++; }
      else { L.circleMarker(c, { radius: 5, color: '#fff', weight: 1.5, fillColor: '#0891b2', fillOpacity: 0.95 }).bindPopup(pop).addTo(osmPoiLayer); np++; }
    }
    osmLoaded = true; LPU.applyOsmVisibility();
    status.textContent = `Loaded ${nb} building outlines and ${np} places${campusBoundary ? '' : ' (not filtered to campus: draw the campus boundary in Contributor tools to filter)'}.`;
    if (campusBoundary) filterToCampus();
    LPU.refreshDirectory(); LPU.toast('Map data loaded', 'success');
  };
  function filterToCampus() {
    M.osm = M.osm.filter((p) => insideCampus(p.lat, p.lng));
    [osmBuildingLayer, osmPoiLayer].forEach((g) => g.eachLayer((l) => { const c = l.getBounds ? l.getBounds().getCenter() : l.getLatLng(); if (!insideCampus(c.lat, c.lng)) g.removeLayer(l); }));
    LPU.refreshDirectory();
  }

  /* ---------- contributor tools UI ---------- */
  function persistMapped() { store.set(KEYS.mapped, M.mapped); LPU.refreshDirectory(); }
  function renderPending() {
    if (!layers()) return;
    if (pendingLayer) S.map.removeLayer(pendingLayer); pendingLayer = L.layerGroup().addTo(S.map);
    if (pendingCenter) L.marker([pendingCenter.lat, pendingCenter.lng]).bindPopup('Draft building centre').addTo(pendingLayer);
    if (pendingEntrance) L.marker([pendingEntrance.lat, pendingEntrance.lng]).bindPopup('Draft entrance').addTo(pendingLayer);
    $('centerReadout').textContent = pendingCenter ? `${pendingCenter.lat}, ${pendingCenter.lng}` : 'Not set';
    $('entranceReadout').textContent = pendingEntrance ? `${pendingEntrance.lat}, ${pendingEntrance.lng}` : 'Not set';
  }
  function renderSaved() {
    if (!layers()) return; mappedLayer.clearLayers();
    const list = $('mappedList'); list.textContent = '';
    M.mapped.forEach((r, i) => {
      if (r.center) L.marker([r.center.lat, r.center.lng]).bindPopup(el('div', {}, [el('strong', { text: r.name }), el('div', { text: `${r.category} · ${r.status}` })])).addTo(mappedLayer);
      if (r.boundary) L.geoJSON(r.boundary, { style: { color: '#d97706', weight: 2, fillOpacity: 0.08 } }).addTo(mappedLayer);
      list.append(el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0' }, [el('span', { text: `${r.name} (${r.status})` }), el('button', { class: 'btn btn-sm', type: 'button', text: 'Remove', onclick: async () => { if (await LPU.confirm({ title: 'Remove saved location?', text: r.name + ' will be removed from this browser.', ok: 'Remove', danger: true })) { M.mapped.splice(i, 1); persistMapped(); renderSaved(); } } })]));
    });
    if (!M.mapped.length) list.append(el('small', { class: 'muted', text: 'No locations saved yet.' }));
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })); const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function buildUi() {
    const f = (label, node, id) => [el('label', { for: id, text: label }), node];
    const body = $('studioBody'); body.textContent = '';
    const cats = ['Academic block', 'Hostel', 'Library', 'Cafe / restaurant', 'Shop / service', 'Sports / ground', 'Medical', 'Bank / ATM', 'Gate / parking', 'Student facility', 'Other'];
    body.append(el('p', { class: 'muted', style: 'font-size:.88rem', text: 'Know a missing place? Pick its point on the map. Saved edits stay in this browser until you export them; they are not shared with other visitors.' }));
    body.append(...f('Location / building name', el('input', { id: 'mapName', type: 'text', maxlength: 120 }), 'mapName'));
    const cat = el('select', { id: 'mapCategory' }); cats.forEach((c) => cat.append(el('option', { text: c }))); body.append(...f('Category', cat, 'mapCategory'));
    const cap = el('select', { id: 'captureType' }, [el('option', { value: 'center', text: 'Building centre' }), el('option', { value: 'entrance', text: 'Main entrance' })]); body.append(...f('Next map click sets', cap, 'captureType'));
    body.append(el('div', { class: 'kv', style: 'margin-top:8px' }, ['Centre: ', el('b', { id: 'centerReadout', text: 'Not set' }), ' · Entrance: ', el('b', { id: 'entranceReadout', text: 'Not set' })]));
    body.append(...f('Evidence / source', el('input', { id: 'mapSource', type: 'text', placeholder: 'field visit, official directory…', maxlength: 200 }), 'mapSource'));
    body.append(el('label', { class: 'check' }, [el('input', { id: 'mapVerified', type: 'checkbox' }), 'I checked this on site / official source']));
    const row = (...b) => el('div', { class: 'btn-row' }, b);
    const btn = (id, text, cls, fn) => el('button', { id, type: 'button', class: 'btn ' + (cls || ''), text, onclick: fn });
    body.append(row(btn('startMappingBtn', 'Start map picking', 'btn-primary', () => { picking = !picking; $('startMappingBtn').textContent = picking ? 'Click the map…' : 'Start map picking'; $('mapperStatus').textContent = picking ? 'Click the map to set the ' + $('captureType').value + '.' : 'Picking cancelled.'; if (picking) $('map').scrollIntoView({ block: 'center' }); }), btn('saveMappedBtn', 'Save location', '', saveMapped)));
    body.append(row(btn('exportMappedBtn', 'Export GeoJSON', '', exportGeo), btn('exportCsvBtn', 'Export CSV', '', exportCsv)));
    body.append(row(btn('setBoundaryBtn', 'Draw campus boundary', '', drawBoundaryMode), btn('clearBoundaryBtn', 'Clear boundary', 'btn-outline', clearBoundary)));
    body.append(row(btn('importBtn', 'Import loaded OSM places inside boundary', '', importInside)));
    body.append(el('div', { class: 'status', id: 'boundaryStatus', role: 'status', text: campusBoundary ? 'Campus boundary saved in this browser.' : 'Campus boundary not set.' }));
    body.append(el('div', { class: 'status', id: 'mapperStatus', role: 'status', text: 'Ready.' }), el('div', { id: 'mappedList' }));
  }
  const say = (t) => ($('mapperStatus').textContent = t);
  function saveMapped() {
    const name = $('mapName').value.trim();
    if (!name) return say('Enter a location name first.');
    if (!pendingCenter && !pendingEntrance) return say('Capture a centre or entrance first.');
    const verified = $('mapVerified').checked && !!$('mapSource').value.trim();
    M.mapped.push({ id: 'field-' + Date.now(), name, category: $('mapCategory').value, center: pendingCenter, entrance: pendingEntrance, boundary: pendingBoundary, source: $('mapSource').value.trim() || 'Not supplied', status: verified ? 'verified' : 'needs verification', capturedAt: new Date().toISOString() });
    persistMapped(); pendingCenter = pendingEntrance = pendingBoundary = null; drawnLayer.clearLayers(); renderPending(); renderSaved();
    $('mapName').value = ''; $('mapSource').value = ''; $('mapVerified').checked = false;
    say(`Saved “${name}” in this browser. Export to back it up.`); LPU.toast('Location saved locally', 'success');
  }
  function exportGeo() {
    const features = M.mapped.map((r) => ({ type: 'Feature', geometry: r.boundary || (r.center ? { type: 'Point', coordinates: [r.center.lng, r.center.lat] } : null), properties: { id: r.id, name: r.name, category: r.category, center: r.center, entrance: r.entrance, source: r.source, verification_status: r.status, captured_at: r.capturedAt } })).filter((x) => x.geometry);
    download('lpu-campus-mapped-locations.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'application/geo+json');
  }
  function exportCsv() {
    const esc = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
    const rows = [['name', 'category', 'center_lat', 'center_lng', 'entrance_lat', 'entrance_lng', 'status', 'source']].concat(M.mapped.map((r) => [r.name, r.category, r.center && r.center.lat, r.center && r.center.lng, r.entrance && r.entrance.lat, r.entrance && r.entrance.lng, r.status, r.source]));
    download('lpu-campus-mapped-locations.csv', rows.map((r) => r.map(esc).join(',')).join('\n'), 'text/csv');
  }
  function loadDraw() {
    if (L.Control && L.Control.Draw) return Promise.resolve();
    return new Promise((res, rej) => {
      const css = el('link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css' });
      const js = el('script', { src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js', onload: res, onerror: () => rej(new Error('draw')) });
      document.head.append(css, js);
    });
  }
  let drawControl = null;
  async function drawBoundaryMode() {
    try { await loadDraw(); } catch (e) { return LPU.toast('Could not load the drawing tool.', 'error'); }
    if (!drawControl) {
      drawControl = new L.Control.Draw({ draw: { polygon: { allowIntersection: false, showArea: true }, rectangle: true, polyline: false, circle: false, circlemarker: false, marker: false }, edit: { featureGroup: drawnLayer, edit: true, remove: true } });
      S.map.addControl(drawControl);
      S.map.on(L.Draw.Event.CREATED, (ev) => {
        if (boundaryPicking) {
          campusBoundary = ev.layer.toGeoJSON().geometry; store.set(KEYS.boundary, campusBoundary); drawBoundary(); boundaryPicking = false;
          $('boundaryStatus').textContent = 'Campus boundary saved in this browser.'; if (osmLoaded) filterToCampus(); return;
        }
        drawnLayer.clearLayers(); drawnLayer.addLayer(ev.layer); pendingBoundary = ev.layer.toGeoJSON().geometry;
        const c = ev.layer.getBounds().getCenter(); pendingCenter = { lat: round7(c.lat), lng: round7(c.lng) }; renderPending(); say('Footprint drawn; centre estimated from its bounds.');
      });
    }
    boundaryPicking = true; $('boundaryStatus').textContent = 'Use the polygon tool on the map to trace the campus perimeter.';
  }
  async function clearBoundary() {
    if (!(await LPU.confirm({ title: 'Clear campus boundary?', text: 'The map will no longer be filtered to campus.', ok: 'Clear', danger: true }))) return;
    campusBoundary = null; store.remove(KEYS.boundary); boundaryLayer.clearLayers(); $('boundaryStatus').textContent = 'Boundary cleared.';
  }
  function importInside() {
    if (!campusBoundary) return say('Draw and save the campus boundary first.');
    let added = 0;
    M.osm.filter((p) => insideCampus(p.lat, p.lng)).forEach((p) => {
      if (M.mapped.some((r) => r.osmId === p.id)) return;
      M.mapped.push({ id: 'osm-import-' + p.id, osmId: p.id, name: p.name, category: p.category, center: { lat: round7(p.lat), lng: round7(p.lng) }, entrance: null, boundary: null, source: p.source, status: 'needs verification', capturedAt: new Date().toISOString() }); added++;
    });
    persistMapped(); renderSaved(); say(`Imported ${added} places (OSM centres; verify names and entrances).`);
  }

  LPU.studioReady = true;
  layers(); buildUi(); renderSaved(); renderPending();
  if (S.map) S.map.on('click', (ev) => {
    if (!picking) return;
    const pt = { lat: round7(ev.latlng.lat), lng: round7(ev.latlng.lng) };
    if ($('captureType').value === 'center') pendingCenter = pt; else pendingEntrance = pt;
    picking = false; $('startMappingBtn').textContent = 'Start map picking'; renderPending(); say('Point captured.');
  });
})();
