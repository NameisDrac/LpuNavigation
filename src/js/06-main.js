(function () {
  'use strict';
  const LPU = window.LPU;
  function start() {
    const PLACES = typeof CAMPUS_PLACES !== 'undefined' ? CAMPUS_PLACES : null;
    if (!PLACES) { document.getElementById('dirSummary').textContent = 'Campus data failed to load. Please reload.'; }
    // restore overrides saved by the contributor tools (same keys as earlier releases)
    LPU.model.overrides = LPU.store.get('lpu-directory-coordinate-overrides-v1', {}) || {};
    (PLACES || []).forEach((p) => {
      const s = LPU.model.overrides[p.id];
      if (!LPU.hasCoords(p) && s && Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
        p.lat = s.lat; p.lng = s.lng; p.verified = false; p.directionsEnabled = true;
        p.source = s.source || 'User-assigned from an OpenStreetMap footprint; verify on site.';
      }
    });
    LPU.model.mapped = LPU.store.get('lpu-mapped-locations-v1', []) || [];
    LPU.initUi();
    LPU.initNavigator();
    // lazy-load contributor tools / OSM loader only when needed
    let loading = null;
    LPU.loadStudio = function () {
      if (window.LPU.studioReady) return Promise.resolve();
      if (loading) return loading;
      loading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/studio.js'; s.onload = res; s.onerror = () => { loading = null; rej(new Error('Could not load tools')); }; document.head.append(s); });
      return loading;
    };
    document.getElementById('studioDetails').addEventListener('toggle', function () { if (this.open) LPU.loadStudio().catch(() => LPU.toast('Contributor tools could not be loaded. Check your connection.', 'error')); });
    document.getElementById('loadOsmBtn').addEventListener('click', () => LPU.loadStudio().then(() => LPU.loadOsm()).catch(() => LPU.toast('Could not load the map data tools.', 'error')));
    ['showBuildings', 'showPois'].forEach((id) => document.getElementById(id).addEventListener('change', () => { if (LPU.applyOsmVisibility) LPU.applyOsmVisibility(); }));
    LPU.resetView = () => {};
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
