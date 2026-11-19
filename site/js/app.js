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
(function () {
'use strict';
const LPU = window.LPU, $ = LPU.$, el = LPU.el, store = LPU.store;
const EMAIL = 'devreddy0423@gmail.com';
const root = document.documentElement;
function systemDark() { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(t) {
root.setAttribute('data-theme', t);
const dark = t === 'dark';
$('themeBtn').setAttribute('aria-pressed', String(dark));
$('themeBtn').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
$('themeToggle').checked = dark;
}
function initTheme() {
const saved = store.get('lpu-theme-v1', null);
applyTheme(saved === 'dark' || saved === 'light' ? saved : systemDark() ? 'dark' : 'light');
const flip = (dark) => { const t = dark ? 'dark' : 'light'; store.set('lpu-theme-v1', t); applyTheme(t); };
$('themeBtn').addEventListener('click', () => flip(root.getAttribute('data-theme') !== 'dark'));
$('themeToggle').addEventListener('change', (e) => flip(e.target.checked));
}
function initFresher() {
const set = (on) => { document.body.classList.toggle('fresher', on); $('fresherToggle').checked = on; };
set(store.get('lpu-fresher-v1', false) === true);
$('fresherToggle').addEventListener('change', (e) => { set(e.target.checked); store.set('lpu-fresher-v1', e.target.checked); LPU.toast(e.target.checked ? 'Fresher mode on' : 'Fresher mode off', 'success'); if (LPU.refreshDirectory) LPU.refreshDirectory(); });
}
function initDrawer() {
const d = $('drawer'), btn = $('menuBtn'); let lastFocus = null;
const open = () => { lastFocus = document.activeElement; d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('drawerClose').focus(); };
const close = () => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
btn.addEventListener('click', open); $('drawerClose').addEventListener('click', close); $('drawerScrim').addEventListener('click', close);
d.addEventListener('keydown', (e) => {
if (e.key === 'Escape') close();
if (e.key === 'Tab') { const f = [...d.querySelectorAll('a,button,input')].filter((x) => !x.hidden && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
});
d.addEventListener('click', (e) => { if (e.target.closest('#privacyBtn,#installBtn')) { lastFocus = null; close(); } });
d.querySelectorAll('a.nav-link').forEach((a) => a.addEventListener('click', () => { lastFocus = null; close(); }));
window.matchMedia('(min-width:1024px)').addEventListener('change', (e) => { if (e.matches && d.classList.contains('open')) close(); });
}
function initScroll() {
const bar = $('scrollProgress'), top = $('toTop'); let ticking = false;
const upd = () => {
const h = document.documentElement; const max = h.scrollHeight - h.clientHeight;
bar.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`;
top.classList.toggle('show', h.scrollTop > 600); ticking = false;
};
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
top.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: LPU.reduceMotion() ? 'auto' : 'smooth' }); $('logoLink').focus({ preventScroll: true }); });
$('logoLink').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: LPU.reduceMotion() ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname + location.search); if (LPU.resetView) LPU.resetView(); });
upd();
}
function initPrivacy() {
const b = $('privacyBanner');
const size = () => root.style.setProperty('--banner-h', b.offsetHeight + 'px');
if (!store.get('lpu-privacy-ack-v1', false)) { b.classList.remove('hidden'); document.body.classList.add('has-banner'); size(); window.addEventListener('resize', size); }
const ack = () => { store.set('lpu-privacy-ack-v1', true); b.classList.add('hidden'); document.body.classList.remove('has-banner'); };
$('privacyOk').addEventListener('click', ack);
const open = () => LPU.openDialog('dlgPrivacy');
['privacyMore', 'privacyBtn', 'privacyBtn2'].forEach((id) => $(id).addEventListener('click', open));
$('privClose').addEventListener('click', () => LPU.closeDialog('dlgPrivacy'));
$('fabContact').addEventListener('click', () => LPU.openDialog('dlgContact'));
if ('IntersectionObserver' in window) {
const live = new Set(), fab = $('fabContact');
const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))); fab.hidden = live.size > 0; });
['reportCard', 'contact'].forEach((id) => io.observe($(id))); io.observe(document.querySelector('.site-footer'));
}
$('ctClose').addEventListener('click', () => LPU.closeDialog('dlgContact'));
$('ctReport').addEventListener('click', () => LPU.closeDialog('dlgContact'));
$('ctCopy').addEventListener('click', () => copyText(EMAIL).then((ok) => LPU.toast(ok ? 'Email address copied' : 'Could not copy — select it manually: ' + EMAIL, ok ? 'success' : 'error')));
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
}
function copyText(t) {
if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, () => false);
return Promise.resolve(false);
}
function initGlobalSearch() {
const inp = $('gsInput'), out = $('gsResults');
const faqs = () => [...document.querySelectorAll('#faqList details.faq')].map((d) => ({ d, q: d.querySelector('summary').textContent, a: d.textContent }));
const render = () => {
out.textContent = '';
const q = LPU.model.norm(inp.value); if (!q) return;
const places = LPU.model.search(inp.value).results.slice(0, 6);
const words = q.split(' ');
const helps = faqs().filter((f) => words.every((w) => LPU.model.norm(f.a).includes(w))).slice(0, 4);
places.forEach((e) => out.append(el('li', {}, [el('button', { type: 'button', onclick: () => { LPU.closeDialog('dlgSearch'); LPU.selectPlace(e.p.id, { scroll: true }); } }, [e.p.name, el('small', { text: 'Place · ' + e.p.category })])])));
helps.forEach((f) => out.append(el('li', {}, [el('button', { type: 'button', onclick: () => { LPU.closeDialog('dlgSearch'); f.d.open = true; f.d.scrollIntoView({ block: 'center' }); f.d.querySelector('summary').focus(); } }, [f.q, el('small', { text: 'Help article' })])])));
if (!places.length && !helps.length) out.append(el('li', { class: 'empty', text: 'Nothing found. Try a block number, hostel or food.' }));
};
$('globalSearchBtn').addEventListener('click', () => { LPU.openDialog('dlgSearch'); inp.focus(); });
inp.addEventListener('input', LPU.debounce(render, 80)); $('gsClose').addEventListener('click', () => LPU.closeDialog('dlgSearch'));
}
LPU.reportPlace = function (name) {
$('rfPlace').value = name || ''; $('rfTopic').value = 'Wrong pin location';
$('reportCard').scrollIntoView({ behavior: LPU.reduceMotion() ? 'auto' : 'smooth' }); setTimeout(() => $('rfMsg').focus({ preventScroll: true }), 400);
};
function initForm() {
const f = $('reportForm'), msg = $('rfMsg'), topic = $('rfTopic');
const err = (field, errEl, text) => { errEl.textContent = text; field.setAttribute('aria-invalid', text ? 'true' : 'false'); if (text) field.setAttribute('aria-describedby', errEl.id); return !text; };
const validate = () => {
const a = err(topic, $('rfTopicErr'), topic.value ? '' : 'Please choose what this is about.');
const len = msg.value.trim().length;
const b = err(msg, $('rfMsgErr'), len < 10 ? 'Please write at least 10 characters.' : len > 1000 ? 'Please keep it under 1000 characters.' : '');
return a && b;
};
msg.addEventListener('input', () => { $('rfCount').textContent = `${msg.value.length} / 1000`; if (msg.getAttribute('aria-invalid') === 'true') validate(); });
topic.addEventListener('change', () => { if (topic.getAttribute('aria-invalid') === 'true') validate(); });
f.addEventListener('reset', () => { setTimeout(() => { $('rfCount').textContent = '0 / 1000'; ['rfTopicErr', 'rfMsgErr', 'rfStatus'].forEach((i) => ($(i).textContent = '')); [topic, msg].forEach((x) => x.removeAttribute('aria-invalid')); }, 0); });
f.addEventListener('submit', async (e) => {
e.preventDefault();
const st = $('rfStatus'); st.textContent = ''; st.className = 'form-summary';
if (!validate()) { st.className = 'form-summary notice err'; st.textContent = 'Please fix the highlighted fields.'; (topic.getAttribute('aria-invalid') === 'true' ? topic : msg).focus(); return; }
const ok = await LPU.confirm({ title: 'Open your email app?', text: `This opens your email app with a draft addressed to ${EMAIL}. Nothing is sent until you press Send there.`, ok: 'Open email app' });
if (!ok) return;
const body = `Topic: ${topic.value}\nPlace: ${$('rfPlace').value.trim() || '-'}\nFrom: ${$('rfName').value.trim() || '-'}\n\n${msg.value.trim()}\n\n(Prepared on the LPU Campus Navigator website)`;
const href = `mailto:${EMAIL}?subject=${encodeURIComponent('LPU Campus Navigator: ' + topic.value)}&body=${encodeURIComponent(body)}`;
st.className = 'form-summary notice ok'; st.textContent = '';
st.append(el('span', { text: 'Email draft prepared. If your email app did not open, copy the message and send it to ' + EMAIL + '. ' }),
el('button', { class: 'btn btn-sm', type: 'button', text: 'Copy message', onclick: () => copyText(body).then((c) => LPU.toast(c ? 'Message copied' : 'Could not copy automatically', c ? 'success' : 'error')) }));
LPU.toast('Email draft prepared', 'success');
window.location.href = href;
});
}
function initPwa() {
let deferred = null; const btn = $('installBtn');
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; btn.hidden = false; });
window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; LPU.toast('App installed', 'success'); });
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone();
if (isIos) btn.hidden = false;
btn.addEventListener('click', async () => {
if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; }
else if (isIos) LPU.openDialog('dlgIos');
});
$('iosClose').addEventListener('click', () => LPU.closeDialog('dlgIos'));
if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
let updating = false;
window.addEventListener('load', () => {
navigator.serviceWorker.register('sw.js').then((reg) => {
const notify = (w) => LPU.toast('A new version is available.', '', { label: 'Update', run: () => { updating = true; w.postMessage('SKIP_WAITING'); } });
if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w); }); });
}).catch(() => {});
let reloaded = false;
navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !updating) return; reloaded = true; location.reload(); });
});
}
LPU.initUi = function () { initTheme(); initFresher(); initDrawer(); initScroll(); initPrivacy(); initGlobalSearch(); initForm(); initPwa(); };
})();
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
(function () {
'use strict';
const LPU = window.LPU;
function start() {
const PLACES = typeof CAMPUS_PLACES !== 'undefined' ? CAMPUS_PLACES : null;
if (!PLACES) { document.getElementById('dirSummary').textContent = 'Campus data failed to load. Please reload.'; }
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