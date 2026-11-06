(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  root.dataset.input = 'pointer';
  document.addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, {capture: true, passive: true});
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) root.dataset.input = 'keyboard';
  }, true);

  const animations = new WeakMap();
  const instant = () => reduced.matches || root.dataset.input === 'keyboard';
  function setPopover(element, trigger, open) {
    if (trigger.getAttribute('aria-expanded') === String(open) && !animations.has(element)) return;
    const hidden = element.hidden;
    const style = hidden ? null : getComputedStyle(element);
    const from = {opacity: hidden ? 0 : style.opacity, transform: hidden ? 'translateY(-4px) scale(.98)' : style.transform};
    animations.get(element)?.cancel();
    animations.delete(element);
    trigger.setAttribute('aria-expanded', String(open));
    element.inert = !open;
    element.style.pointerEvents = open ? '' : 'none';
    if (instant() || !element.animate) { element.hidden = !open; return; }
    element.hidden = false;
    const animation = element.animate([from, {opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-3px) scale(.985)'}], {
      duration: open ? 160 : 100, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'both'
    });
    animations.set(element, animation);
    animation.finished.then(() => {
      if (animations.get(element) !== animation) return;
      element.hidden = !open;
      animation.cancel();
      animations.delete(element);
    }).catch(() => {}); // A second interaction deliberately interrupts the first.
  }
  function transitionList(container, mutate) {
    if (!container || instant()) {
      container?.querySelectorAll('.btc-archive-list > li').forEach(row => animations.get(row)?.cancel());
      mutate(); return;
    }
    const rows = [...container.querySelectorAll('.btc-archive-list > li')];
    const previous = new Map(rows.filter(row => !row.hidden && row.getClientRects().length).map(row => [row, row.getBoundingClientRect()]));
    mutate();
    let visible = 0;
    for (const row of rows) {
      animations.get(row)?.cancel();
      if (row.hidden || !row.getClientRects().length) continue;
      const rect = row.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || visible++ >= 12) continue;
      const before = previous.get(row);
      const wasVisible = before && before.bottom >= 0 && before.top <= innerHeight;
      const offset = wasVisible ? Math.max(-24, Math.min(24, before.top - rect.top)) : 5;
      if (wasVisible && Math.abs(offset) < 1) continue;
      const animation = row.animate([
        {opacity: wasVisible ? 1 : .45, transform: `translateY(${offset}px)`},
        {opacity: 1, transform: 'none'}
      ], {duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)'});
      animations.set(row, animation);
      animation.finished.then(() => { if (animations.get(row) === animation) animations.delete(row); }).catch(() => {});
    }
  }
  const feedback = new Set();
  function respond(element, frames, options = {}) {
    if (!element || instant() || !element.animate) return;
    animations.get(element)?.cancel();
    const animation = element.animate(frames, {duration: 220, easing: 'cubic-bezier(.22,1,.36,1)', ...options});
    animations.set(element, animation);
    feedback.add(animation);
    animation.finished.then(() => { if (animations.get(element) === animation) animations.delete(element); }).catch(() => {}).finally(() => feedback.delete(animation));
    return animation;
  }
  function mountDetails() {
    document.querySelectorAll('.reading-toc details').forEach(details => {
      const summary = details.querySelector('summary');
      let task;
      let desired = details.open;
      summary.addEventListener('click', event => {
        if (instant()) {
          task?.cancel(); task = null;
          details.style.removeProperty('overflow');
          return;
        }
        event.preventDefault();
        const from = details.getBoundingClientRect().height;
        desired = task ? !desired : !details.open;
        task?.cancel();
        details.open = true;
        const to = desired ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
        details.style.overflow = 'hidden';
        const animation = respond(details, [{height: from + 'px'}, {height: to + 'px'}], {duration: 240});
        task = animation;
        animation.finished.then(() => {
          if (task !== animation) return;
          details.open = desired;
          details.style.removeProperty('overflow');
          task = null;
        }).catch(() => {});
      });
    });
    document.addEventListener('tabs:click', event => respond(event.target, [{opacity: .55, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}]));
    document.addEventListener('studio:copy-result', event => respond(event.target.closest('.copy-btn'), [{transform: 'scale(1)'}, {transform: 'scale(1.08)'}, {transform: 'scale(1)'}]));
    document.addEventListener('click', event => {
      const control = event.target.closest('.arch-reset,.arch-levels button,.arch-map-picker button');
      if (!control) return;
      const result = control.closest('.arch-lab')?.querySelector('.arch-result') || control.closest('.arch-map')?.querySelector('.arch-map-note');
      respond(result, [{opacity: .5}, {opacity: 1}], {duration: 220});
    });
    document.addEventListener('change', event => {
      const lab = event.target.closest('.arch-lab');
      if (lab) respond(lab.querySelector('.arch-result'), [{opacity: .5}, {opacity: 1}], {duration: 220});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDetails, {once: true});
  else mountDetails();
  window.StudioMotion = {instant, setPopover, transitionList, respond};
  reduced.addEventListener('change', () => {
    if (reduced.matches) feedback.forEach(animation => animation.finish());
    if (reduced.matches) document.querySelectorAll('.btc-archive-list > li').forEach(row => animations.get(row)?.cancel());
    document.querySelectorAll('.btc-orrery-menu-pop').forEach(element => {
      animations.get(element)?.finish();
    });
  });
  // Backgrounds are embedded in the shared stylesheet and ready at first paint.
})();
