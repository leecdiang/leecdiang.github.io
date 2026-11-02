/* Native scrolling works without JS; enhance focus and hints only when needed. */
(() => {
  const mounted = new WeakSet();
  function mount() {
    document.querySelectorAll('.v-chart-viewport').forEach(view => {
      if (mounted.has(view)) return;
      mounted.add(view);
      const update = () => {
        const scrollable = view.scrollWidth > view.clientWidth + 1;
        view.closest('.v-figure').dataset.scrollable = String(scrollable);
        view.tabIndex = scrollable ? 0 : -1;
      };
      update();
      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => {
          if (!view.isConnected) { observer.disconnect(); return; }
          update();
        });
        observer.observe(view);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  document.addEventListener('pjax:success', mount);
})();
