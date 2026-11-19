/* TEST-ONLY Leaflet stand-in (the sandbox has no internet, so real Leaflet cannot be loaded).
   It records every call so tests can verify what the app asked the map to do. It does NOT render tiles. */
(function () {
  const rec = (window.__L = { markers: [], geojson: [], polylines: [], circles: [], views: [], removed: 0, tileLayers: [] });
  const chain = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : () => chain()) });
  class Layer { constructor(o) { this.o = o || {}; this.h = {}; } addTo(m) { this.map = m; return this; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } bindPopup(c) { this.popup = c; return this; } openPopup() { return this; } getBounds() { return { getCenter: () => ({ lat: 0, lng: 0 }) }; } setLatLng(ll) { this.ll = ll; if (this.kind === 'user') rec.user = ll; return this; } setRadius() { return this; } }
  window.L = {
    map(id, o) { const m = { zoom: 15, on() { return m; }, setView(c, z) { rec.views.push([c, z]); m.zoom = z || m.zoom; return m; }, fitBounds() { rec.fit = (rec.fit || 0) + 1; return m; }, getZoom() { return m.zoom; }, invalidateSize() {}, addControl() {}, removeLayer() { rec.removed++; }, addLayer() {} }; return m; },
    control: { zoom: () => ({ addTo() {} }), layers: () => ({ addTo() {} }) },
    tileLayer(url) { const t = new Layer(); rec.tileLayers.push(url); t.addTo = function (m) { setTimeout(() => (t.h.load || []).forEach((f) => f()), 30); return t; }; return t; },
    layerGroup() { return new Layer(); }, featureGroup() { const l = new Layer(); l.clearLayers = () => {}; l.eachLayer = () => {}; return l; },
    divIcon: (o) => o,
    marker(ll, o) { const m = new Layer(o); m.ll = ll; m.kind = o && o.icon && /me-dot/.test(o.icon.html || '') ? 'user' : (o && o.icon && /dest/.test(o.icon.html || '') ? 'dest' : 'place'); rec.markers.push({ ll, title: o && o.title, kind: m.kind }); if (m.kind === 'user') rec.user = ll; return m; },
    geoJSON(g, o) { const l = new Layer(o); rec.geojson.push(g); return l; },
    circle(ll) { rec.circles.push(ll); return new Layer(); }, circleMarker() { return new Layer(); }, polygon() { return new Layer(); },
    polyline(pts, o) { rec.polylines.push(pts); const l = new Layer(o); l.getBounds = () => ({}); return l; },
    Control: {}
  };
})();
