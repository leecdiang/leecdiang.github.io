/* Article-local iframe sizing and theme bridge. No network or storage access. */
(() => {
  'use strict';
  const key = '__btcInferenceArticleBridge';
  if (window[key]) { window[key].mount(); return; }
  const mounted = new WeakSet();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const frames = () => [...document.querySelectorAll('iframe[data-inference-lab]')];
  function theme() {
    const value = document.documentElement.dataset.theme;
    return value === 'light' || value === 'dark' ? value : media.matches ? 'dark' : 'light';
  }
  function send(frame) {
    frame.contentWindow?.postMessage({ type: 'inference-theme', theme: theme() }, '*');
  }
  function sync() { frames().forEach(send); }
  function mount() {
    frames().forEach(frame => {
      if (!mounted.has(frame)) {
        mounted.add(frame);
        frame.addEventListener('load', () => send(frame));
      }
      send(frame);
    });
  }
  window.addEventListener('message', event => {
    const frame = frames().find(item => item.contentWindow === event.source);
    if (!frame || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'inference-lab-height') {
      const measured = Number(event.data.height);
      if (!Number.isFinite(measured) || measured < 1 || measured > 20000) return;
      const height = String(Math.max(240, Math.ceil(measured) + 2));
      if (frame.getAttribute('height') !== height) frame.setAttribute('height', height);
      send(frame);
    } else if (event.data.type === 'inference-lab-ready') send(frame);
  });
  media.addEventListener('change', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
  document.addEventListener('pjax:success', mount);
  window[key] = { mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
