/* Utilities: DOM helpers, safe storage, geo maths, toasts, dialogs */
(function () {
  'use strict';
  const LPU = (window.LPU = window.LPU || {});
  const $ = (id) => document.getElementById(id);
  LPU.$ = $;
  LPU.el = function (tag, props, children) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    (children || []).forEach((c) => n.append(c));
    return n;
  };
  LPU.reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* localStorage that never throws; falls back to memory */
  LPU.store = (function () {
    let ok = false; const mem = {};
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); ok = true; } catch (e) { ok = false; }
    return {
      persistent: ok,
      get(key, def) {
        try {
          const raw = ok ? localStorage.getItem(key) : mem[key];
          return raw == null ? def : JSON.parse(raw);
        } catch (e) { return def; }
      },
      set(key, val) {
        const s = JSON.stringify(val);
        try { if (ok) localStorage.setItem(key, s); else mem[key] = s; return true; }
        catch (e) { mem[key] = s; return false; }
      },
      remove(key) { try { if (ok) localStorage.removeItem(key); } catch (e) {} delete mem[key]; }
    };
  })();

  LPU.haversine = function (a, b) {
    const R = 6371008.8, t = (x) => (x * Math.PI) / 180;
    const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  LPU.fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);
  LPU.fmtTime = (s) => {
    const min = Math.max(1, Math.round(s / 60));
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
  };
  LPU.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  LPU.announce = (msg) => { const n = $('srStatus'); if (n) { n.textContent = ''; setTimeout(() => (n.textContent = msg), 30); } };

  LPU.toast = function (msg, type, action) {
    const box = $('toasts'); if (!box) return;
    const t = LPU.el('div', { class: 'toast ' + (type || ''), role: type === 'error' ? 'alert' : 'status' }, [LPU.el('span', { text: msg })]);
    let timer;
    const close = () => { clearTimeout(timer); t.remove(); };
    if (action) t.append(LPU.el('button', { type: 'button', text: action.label, onclick: () => { action.run(); close(); } }));
    box.append(t);
    if (!action) timer = setTimeout(close, type === 'error' ? 7000 : 4000);
    else t.append(LPU.el('button', { type: 'button', 'aria-label': 'Dismiss', text: '×', onclick: close }));
    return close;
  };

  /* Promise-based confirm using native <dialog>; falls back to window.confirm */
  LPU.confirm = function (opts) {
    const d = $('dlgGeneric');
    if (!d || typeof d.showModal !== 'function') return Promise.resolve(window.confirm((opts.title || '') + '\n' + (opts.text || '')));
    $('dlgTitle').textContent = opts.title || 'Please confirm';
    const body = $('dlgBody'); body.textContent = ''; body.append(LPU.el('p', { text: opts.text || '' }));
    $('dlgOk').textContent = opts.ok || 'OK';
    $('dlgOk').className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
    $('dlgCancel').textContent = opts.cancel || 'Cancel';
    return new Promise((resolve) => {
      const done = (v) => { d.removeEventListener('close', onClose); $('dlgOk').onclick = $('dlgCancel').onclick = null; if (d.open) d.close(); resolve(v); };
      const onClose = () => done(false);
      $('dlgOk').onclick = () => done(true);
      $('dlgCancel').onclick = () => done(false);
      d.addEventListener('close', onClose);
      d.showModal();
    });
  };
  LPU.openDialog = (id) => { const d = $(id); if (d && d.showModal && !d.open) d.showModal(); };
  LPU.closeDialog = (id) => { const d = $(id); if (d && d.open) d.close(); };
})();
