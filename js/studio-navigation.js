/* Keep native documents and their lifecycle; animate only the hand-off. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const documents = new Map();
  const resources = new Map();
  const entryKey = 'studio-route-entry';
  let turn = 0;
  let departure;
  let hoverTimer;
  const main = () => document.getElementById('main-content');
  const instant = () => reduced.matches || root.dataset.input === 'keyboard';

  function destination(anchor) {
    if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-transition') || (anchor.target && anchor.target !== '_self')) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (!url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) return;
    return url;
  }
  function preload(href, as) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || resources.has(url.href)) return resources.get(url.href);
    if ([...document.querySelectorAll('link[rel="stylesheet"],script[src]')].some(el => (el.href || el.src) === url.href)) return Promise.resolve();
    const promise = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = as; link.href = url.href;
      link.onload = link.onerror = () => { link.onload = link.onerror = null; resolve(); };
      document.head.append(link);
    });
    resources.set(url.href, promise);
    return promise;
  }
  function warm(url) {
    const key = url.pathname + url.search;
    if (documents.has(key)) return documents.get(key);
    if (documents.size >= 16) documents.delete(documents.keys().next().value);
    const promise = fetch(url.href, {credentials: 'same-origin'}).then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return false;
      const html = await response.text();
      if (!html.includes('studio-site')) return false;
      // A template is inert: examining a head never downloads body images/media.
      const template = document.createElement('template');
      template.innerHTML = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
      const jobs = [...template.content.querySelectorAll('link[rel="stylesheet"]')].map(el => preload(el.getAttribute('href'), 'style'));
      for (const script of template.content.querySelectorAll('script[src^="/assets/studio/"]')) jobs.push(preload(script.getAttribute('src'), 'script'));
      await Promise.all(jobs);
      return true;
    }).catch(() => { documents.delete(key); return false; });
    documents.set(key, promise);
    return promise;
  }
  function canSpeculate() {
    const connection = navigator.connection;
    return !connection || (!connection.saveData && !/^(slow-2g|2g|3g)$/.test(connection.effectiveType));
  }
  function approach(event) {
    const anchor = event.target.closest?.('a[href]');
    const url = destination(anchor);
    clearTimeout(hoverTimer);
    if (!url || !canSpeculate() || anchor.contains(event.relatedTarget)) return;
    hoverTimer = setTimeout(() => warm(url), event.type === 'focusin' ? 0 : 90);
  }
  document.addEventListener('pointerover', approach, {passive: true});
  document.addEventListener('focusin', approach);
  document.addEventListener('pointerout', event => {
    if (event.target.closest?.('a[href]') && !event.target.closest('a[href]').contains(event.relatedTarget)) clearTimeout(hoverTimer);
  }, {passive: true});

  function reset() {
    turn++;
    departure?.cancel(); departure = null;
    delete root.dataset.routeLeaving;
    delete root.dataset.routePending;
    delete root.dataset.routeEnter;
  }
  document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = destination(event.target.closest?.('a[href]'));
    if (!url || instant() || !main()?.animate) return;
    event.preventDefault();
    clearTimeout(hoverTimer);
    const current = ++turn;
    departure?.cancel(); departure = null;
    delete root.dataset.routeLeaving;
    root.dataset.routePending = '';
    // Keep the current content visible while warming the next document's head.
    const prepared = await Promise.race([warm(url), new Promise(resolve => setTimeout(() => resolve(false), 900))]);
    if (current !== turn) return;
    delete root.dataset.routePending;
    if (prepared && !instant()) {
      root.dataset.routeLeaving = '';
      departure = main().animate([
        {opacity: 1, transform: 'none'},
        {opacity: 0, transform: 'translate3d(0,-9px,0)'}
      ], {duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards'});
      try { await departure.finished; } catch { return; }
      if (current !== turn) return;
    }
    if (!instant()) {
      try { sessionStorage.setItem(entryKey, JSON.stringify({path: url.pathname + url.search, at: Date.now()})); } catch {}
    }
    location.assign(url.href);
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    reset();
    if (!instant()) window.StudioMotion?.respond(main(), [{opacity: .4, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 260});
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (root.hasAttribute('data-route-pending') || root.hasAttribute('data-route-leaving'))) reset();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) departure?.finish();
  });
  function finishEntry() {
    const node = main();
    if (!node || !root.hasAttribute('data-route-enter')) return;
    const animation = node.getAnimations().find(item => item.animationName === 'studio-content-enter');
    if (animation) animation.finished.catch(() => {}).then(() => delete root.dataset.routeEnter);
    else delete root.dataset.routeEnter;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finishEntry, {once: true});
  else finishEntry();
})();
