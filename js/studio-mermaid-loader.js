/* global NexT */
(() => {
  const selector = 'pre > .mermaid';
  const engineURL = '/js/third-party/mermaid.min.js';
  const bootstrapURL = '/js/third-party/tags/mermaid.js?v=20261106-performance';
  let pending = null;
  let observer;
  let diagrams = [];
  let notice;
  let errorText;
  let retry;
  let checkPending = false;

  function updateNotice() {
    if (!notice) return;
    const english = (window.StudioLanguage?.language || document.documentElement.dataset.language) === 'en';
    errorText.textContent = english ? 'The diagram could not load. Its source remains readable. ' : '图表加载失败，源码仍可阅读。';
    retry.textContent = english ? 'Retry' : '重试';
  }

  function showError(target, error) {
    if (!notice) {
      notice = document.createElement('p');
      notice.dataset.siteDynamic = '';
      notice.setAttribute('translate', 'no');
      notice.setAttribute('role', 'status');
      errorText = document.createElement('span');
      retry = document.createElement('button');
      retry.type = 'button';
      retry.addEventListener('click', () => load(target));
      notice.append(errorText, retry);
    }
    target.after(notice);
    updateNotice();
    console.error('[Studio] Mermaid loading failed.', error);
  }

  async function getScript(url, id, condition) {
    try {
      await NexT.utils.getScript(url, {condition, async: true, attributes: {id}});
    } catch (error) {
      document.getElementById(id)?.remove();
      throw error;
    }
  }

  function load(target) {
    if (pending) return pending;
    pending = Promise.resolve().then(async () => {
      await getScript(engineURL, 'studio-mermaid-engine', !!window.mermaid?.run);
      if (!window.mermaid?.run) throw new Error('The Mermaid engine is unavailable.');
      if (!NexT.renderMermaidDiagrams) {
        // A slow bootstrap must not let the engine's window-load hook render early.
        window.mermaid.initialize({startOnLoad: false});
      }
      await getScript(bootstrapURL, 'studio-mermaid-bootstrap', !!NexT.renderMermaidDiagrams);
      if (!NexT.renderMermaidDiagrams) throw new Error('The Mermaid bootstrap is unavailable.');
      notice?.remove();
      // A dedicated hook leaves MathJax's page:loaded lifecycle untouched.
      document.dispatchEvent(new Event('studio:mermaid-ready'));
    }).catch(error => showError(target, error)).finally(() => {
      pending = null;
    });
    return pending;
  }

  function visible(target) {
    return target.isConnected && target.getClientRects().length > 0;
  }

  function checkNearViewport() {
    checkPending = false;
    const target = diagrams.find(diagram => {
      if (!visible(diagram)) return false;
      const rect = diagram.getBoundingClientRect();
      return rect.bottom >= -700 && rect.top <= innerHeight + 700 && rect.right > 0 && rect.left < innerWidth;
    });
    if (target) load(target);
  }

  function scheduleCheck() {
    if (!checkPending) {
      checkPending = true;
      requestAnimationFrame(checkNearViewport);
    }
  }

  function onReveal(event) {
    if (event.type === 'toggle' && !event.target.open) return;
    const target = diagrams.find(diagram => visible(diagram) && event.target.contains(diagram));
    if (target) load(target);
  }

  function onHashChange() {
    if (!location.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    let diagram = diagrams.find(element => target.contains(element) || element.contains(target));
    // Markdown section anchors usually live on a heading immediately before content.
    const heading = target.closest('h1,h2,h3,h4,h5,h6');
    if (!diagram && heading) {
      for (let sibling = heading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (/^H[1-6]$/.test(sibling.tagName) && sibling.tagName <= heading.tagName) break;
        diagram = diagrams.find(element => sibling.contains(element));
        if (diagram) break;
      }
    }
    if (diagram?.isConnected) load(diagram);
    scheduleCheck();
  }

  function observe() {
    diagrams = [...document.querySelectorAll(selector)].map(element => element.parentElement);
    observer?.disconnect();
    if (!diagrams.length) return;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.isIntersecting && visible(item.target));
        if (entry) load(entry.target);
      }, {rootMargin: '700px 0px', threshold: 0});
      diagrams.forEach(diagram => observer.observe(diagram));
    } else {
      scheduleCheck();
    }
    onHashChange();
  }

  document.addEventListener('tabs:click', onReveal);
  document.addEventListener('toggle', onReveal, true);
  document.addEventListener('page:loaded', observe);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('studio:language', updateNotice);
  if (!('IntersectionObserver' in window)) {
    window.addEventListener('scroll', scheduleCheck, {passive: true});
    window.addEventListener('resize', scheduleCheck);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, {once: true});
  else observe();
})();
