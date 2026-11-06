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
  window.StudioMotion = {instant, setPopover};
  reduced.addEventListener('change', () => {
    document.querySelectorAll('.btc-orrery-menu-pop').forEach(element => {
      animations.get(element)?.finish();
    });
  });
  function prepareArtwork() {
    // The mobile homepage uses the portrait itself; avoid downloading hidden art.
    if (document.body.classList.contains('studio-home') && innerWidth <= 700) return;
    const mode = root.dataset.color === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('.ambient-art--' + mode + ' img').forEach(img => {
      if (img.hasAttribute('src')) return;
      const ready = () => {
        if (img.naturalWidth) img.parentElement.classList.add('is-ready');
      };
      img.addEventListener('load', ready, {once: true});
      const source = img.parentElement.querySelector('source[data-srcset]');
      if (source) source.srcset = source.dataset.srcset;
      img.src = img.dataset.ambientSrc;
      if (img.complete) ready();
    });
  }
  window.addEventListener('studio:theme', prepareArtwork);
  matchMedia('(max-width: 700px)').addEventListener('change', prepareArtwork);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareArtwork, {once: true});
  else prepareArtwork();
})();
