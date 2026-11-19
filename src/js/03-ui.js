/* Site chrome: theme, fresher mode, drawer, scroll helpers, privacy banner, global search, report form, PWA */
(function () {
  'use strict';
  const LPU = window.LPU, $ = LPU.$, el = LPU.el, store = LPU.store;
  const EMAIL = 'devreddy0423@gmail.com';
  const root = document.documentElement;

  /* theme */
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

  /* fresher mode */
  function initFresher() {
    const set = (on) => { document.body.classList.toggle('fresher', on); $('fresherToggle').checked = on; };
    set(store.get('lpu-fresher-v1', false) === true);
    $('fresherToggle').addEventListener('change', (e) => { set(e.target.checked); store.set('lpu-fresher-v1', e.target.checked); LPU.toast(e.target.checked ? 'Fresher mode on' : 'Fresher mode off', 'success'); if (LPU.refreshDirectory) LPU.refreshDirectory(); });
  }

  /* drawer */
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

  /* scroll progress, back-to-top, logo */
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

  /* privacy banner + dialogs */
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
    // hide the floating contact button while the contact form / footer is on screen so it never covers controls
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

  /* global site search: places + help articles */
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

  /* report form — opens the user's email client; never pretends to submit */
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

  /* PWA: service worker, install prompt, update toast */
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
