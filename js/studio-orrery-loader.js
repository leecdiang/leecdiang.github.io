(() => {
  function mount() {
    const stack = document.querySelector('.btc-link-stack');
    if (!stack || document.getElementById('studio-orrery-launch') || document.getElementById('btc-orrery-links-entry')) return;

    const launch = document.createElement('button');
    launch.type = 'button';
    launch.id = 'studio-orrery-launch';
    launch.className = 'btc-link-card btc-link-card--orrery';
    launch.dataset.siteDynamic = '';
    launch.setAttribute('translate', 'no');
    launch.setAttribute('aria-haspopup', 'dialog');
    launch.setAttribute('aria-describedby', 'studio-orrery-status');
    launch.innerHTML = '<span class="btc-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" focusable="false"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(-30 12 12)"/></svg></span><span class="btc-link-copy"><span class="btc-link-name"><span></span> <em>ORRERY</em></span><span class="btc-link-desc"></span></span><span class="btc-link-arrow" aria-hidden="true">↗</span>';

    const status = document.createElement('span');
    status.id = 'studio-orrery-status';
    status.className = 'sr-only';
    status.dataset.siteDynamic = '';
    status.setAttribute('translate', 'no');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    stack.append(launch, status);

    const title = launch.querySelector('.btc-link-name > span');
    const description = launch.querySelector('.btc-link-desc');
    const assets = new Map();
    const labels = {
      zh: {
        title: '实时天象仪',
        description: '太阳系 3D · 二十八宿 · 七政 · 黄道相位',
        open: '打开全屏 3D 天象仪',
        loading: '正在加载天象仪…',
        error: '加载失败，请检查网络后点击重试。',
        retry: '重新加载天象仪'
      },
      en: {
        title: 'Live Orrery',
        description: 'Solar system 3D · 28 mansions · Seven governors · Zodiac',
        open: 'Open full-screen 3D orrery',
        loading: 'Loading the orrery…',
        error: 'Could not load. Check your connection and click to retry.',
        retry: 'Retry loading the orrery'
      }
    };
    let state = 'idle';
    let clicked = false;

    function render() {
      const language = window.StudioLanguage?.language || document.documentElement.dataset.language;
      const text = labels[language === 'en' ? 'en' : 'zh'];
      const message = state === 'loading' ? text.loading : state === 'error' ? text.error : '';
      title.textContent = text.title;
      description.textContent = message || text.description;
      status.textContent = message;
      launch.setAttribute('aria-label', state === 'error' ? text.retry : state === 'loading' ? text.loading : text.open);
      launch.setAttribute('aria-busy', String(state === 'loading'));
      // Keep the focused button in the tab order while ignoring repeated activation.
      launch.setAttribute('aria-disabled', String(state === 'loading'));
    }

    function loadAsset(tag, url) {
      if (assets.has(url)) return assets.get(url);
      const element = document.createElement(tag);
      const pending = new Promise((resolve, reject) => {
        element.onload = () => resolve();
        element.onerror = () => reject(new Error('Could not load ' + url));
        if (tag === 'link') {
          element.rel = 'stylesheet';
          element.href = url;
          // Keep Studio's modal and motion overrides after the legacy stylesheet.
          const studioStyle = document.querySelector('link[data-studio-style]') || document.querySelector('link[rel="stylesheet"][href^="/assets/studio/"]');
          document.head.insertBefore(element, studioStyle);
        } else {
          element.src = url;
          element.async = true;
          document.head.appendChild(element);
        }
      }).catch(error => {
        element.remove();
        assets.delete(url);
        throw error;
      }).finally(() => {
        element.onload = element.onerror = null;
      });
      assets.set(url, pending);
      return pending;
    }

    async function load() {
      if (state === 'loading' || state === 'ready') return;
      state = 'loading';
      render();
      try {
        await Promise.all([
          loadAsset('link', '/css/orrery.css'),
          loadAsset('script', '/js/orrery-sky.js')
        ]);
        await window.StudioTheme.refreshOrreryStyles();
        await loadAsset('script', '/js/orrery.js?v=20261106-performance');

        const entry = document.getElementById('btc-orrery-links-entry');
        if (!entry) throw new Error('The orrery entry did not mount.');
        const deepLink = location.hash === '#orrery';
        const moveFocus = clicked || deepLink || document.activeElement === launch;
        state = 'ready';
        window.removeEventListener('studio:language', render);
        window.removeEventListener('hashchange', onHashChange);
        launch.replaceWith(entry);
        status.remove();
        // The engine records this real, persistent entry as its return-focus target.
        if (moveFocus) entry.focus({preventScroll: true});
        // Deep links are opened by the engine's existing timer, exactly once.
        if (clicked && !deepLink) entry.click();
      } catch (error) {
        state = 'error';
        render();
        console.error('[Studio] Orrery loading failed.', error);
      }
    }

    function onHashChange() {
      if (location.hash === '#orrery') load();
    }

    launch.addEventListener('click', () => {
      clicked = true;
      load();
    });
    window.addEventListener('studio:language', render);
    window.addEventListener('hashchange', onHashChange);
    render();
    onHashChange();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
