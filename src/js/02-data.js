/* Directory model + smart search. Reads CAMPUS_PLACES from data/places.js (never modified). */
(function () {
  'use strict';
  const LPU = window.LPU;
  const GROUPS = [
    { id: 'all', label: 'All' }, { id: 'academic', label: 'Academic' }, { id: 'hostel', label: 'Hostels' },
    { id: 'food', label: 'Food' }, { id: 'sports', label: 'Sports' }, { id: 'medical', label: 'Medical' }, { id: 'services', label: 'Services' }
  ];
  const SYN = {
    academic: 'academic block school department faculty college',
    hostel: 'hostel hostels residence dorm dormitory',
    food: 'food court mess canteen cafe restaurant eat dining',
    sports: 'sports sport ground field playground',
    medical: 'medical hospital health doctor clinic',
    services: 'service services facility office help'
  };
  const CAT_SYN = { 'Gate / parking': 'gate parking entry entrance', Library: 'library books study', 'Shop / service': 'shop store shopping' };

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function groupOf(cat) {
    switch (cat) {
      case 'Academic block': return 'academic';
      case 'Hostel': return 'hostel';
      case 'Cafe / restaurant': case 'Food & cafe': return 'food';
      case 'Sports / ground': case 'Sports ground': case 'Sports & recreation': return 'sports';
      case 'Medical': case 'Healthcare': return 'medical';
      default: return 'services';
    }
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let min = i;
      for (let j = 1; j <= b.length; j++) {
        const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        cur[j] = v; if (v < min) min = v;
      }
      if (min > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  LPU.hasCoords = (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng);

  function buildEntry(p) {
    const name = norm(p.name), group = groupOf(p.category);
    const tokens = name.split(' ').filter(Boolean);
    const extra = new Set();
    tokens.forEach((t) => { const m = t.match(/^([a-z]+)(\d+[a-z]?)$/); if (m) { extra.add(m[1]); extra.add(m[2]); } else { const m2 = t.match(/^(\d+)([a-z])$/); if (m2) extra.add(m2[1]); } });
    const bm = name.match(/block (\d+[a-z]?)/);
    if (bm) { extra.add('block' + bm[1]); extra.add('b' + bm[1]); }
    const syn = (SYN[group] + ' ' + norm(p.category) + ' ' + (CAT_SYN[p.category] || '')).split(' ').filter(Boolean);
    return { p, name, group, tokens, extra: [...extra], syn: [...new Set(syn)] };
  }

  function tokenScore(e, t) {
    let best = 0;
    const digits = /^\d+$/.test(t);
    for (const tok of e.tokens) {
      if (tok === t) return 10;
      if (tok.startsWith(t) && (t.length >= 2 || !digits)) best = Math.max(best, 7);
      else if (t.length >= 3 && tok.includes(t)) best = Math.max(best, 4);
    }
    for (const x of e.extra) { if (x === t) best = Math.max(best, 8); else if (t.length >= 3 && x.startsWith(t)) best = Math.max(best, 5); }
    if (best) return best;
    for (const s of e.syn) { if (s === t) best = Math.max(best, 3); else if (t.length >= 3 && s.startsWith(t)) best = Math.max(best, 2); }
    if (best) return best;
    if (t.length >= 4 && !/\d/.test(t)) {
      const max = t.length >= 7 ? 2 : 1;
      for (const tok of e.tokens.concat(e.syn)) {
        if (tok.length < 4) continue;
        if (lev(t, tok, max) <= max || (tok.length > t.length && lev(t, tok.slice(0, t.length), max) <= max)) best = Math.max(best, 2.5);
      }
    }
    return best;
  }

  const model = {
    GROUPS, norm, groupOf,
    osm: [], mapped: [], overrides: {},
    _entries: null,
    invalidate() { this._entries = null; },
    all() {
      const base = (typeof CAMPUS_PLACES !== 'undefined' ? CAMPUS_PLACES : []).slice();
      const manual = this.mapped.map((r) => ({
        id: r.id, name: r.name, category: r.category, description: `${r.status} · ${r.source}`,
        lat: r.center && r.center.lat, lng: r.center && r.center.lng, verified: r.status === 'verified',
        directionsEnabled: Boolean(r.center), source: r.source || 'Locally mapped location'
      }));
      const seen = new Set();
      return base.concat(this.osm, manual).filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
    },
    entries() { return this._entries || (this._entries = this.all().map(buildEntry)); },
    byId(id) { return this.all().find((p) => p.id === id) || null; },
    /* returns {results:[entry...], unmapped:[...], suggestions:[...]} */
    search(query, group) {
      const q = norm(query), ents = this.entries();
      const inGroup = (e) => !group || group === 'all' || e.group === group;
      const cmp = (a, b) => a.p.name.localeCompare(b.p.name, undefined, { numeric: true });
      if (!q) {
        return { results: ents.filter((e) => LPU.hasCoords(e.p) && inGroup(e)).sort(cmp), unmapped: [], suggestions: [] };
      }
      const toks = q.split(' ');
      const scored = [];
      for (const e of ents) {
        if (!inGroup(e)) continue;
        let total = 0, ok = true;
        for (const t of toks) { const s = tokenScore(e, t); if (!s) { ok = false; break; } total += s; }
        if (!ok) continue;
        if (e.name === q) total += 30; else if (e.name.startsWith(q)) total += 12;
        scored.push({ e, total });
      }
      scored.sort((a, b) => b.total - a.total || cmp(a.e, b.e));
      const results = scored.filter((s) => LPU.hasCoords(s.e.p)).map((s) => s.e);
      const unmapped = scored.filter((s) => !LPU.hasCoords(s.e.p)).map((s) => s.e);
      let suggestions = [];
      if (!results.length && !unmapped.length) {
        const first = toks.join('');
        suggestions = ents.filter((e) => LPU.hasCoords(e.p))
          .map((e) => ({ e, d: Math.min(...e.tokens.concat(e.name.replace(/ /g, '')).map((t) => lev(first.slice(0, Math.max(3, t.length)), t, 3))) }))
          .filter((x) => x.d <= 2).sort((a, b) => a.d - b.d).slice(0, 4).map((x) => x.e);
      }
      return { results, unmapped, suggestions };
    }
  };
  LPU.model = model;
})();
