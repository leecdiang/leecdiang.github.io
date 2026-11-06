(() => {
  const picker = document.getElementById('color-mode');
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';

  // Keep the existing orrery's media-query palette in sync with manual selection.
  const orreryMedia=[];
  const seenMedia=new WeakSet();
  function collectMedia(rules){
    for(const rule of rules){
      if(rule.media && /prefers-color-scheme/.test(rule.media.mediaText) && !seenMedia.has(rule)) {seenMedia.add(rule);orreryMedia.push([rule,rule.media.mediaText]);}
      if(rule.cssRules)collectMedia(rule.cssRules);
    }
  }
  function refreshOrreryStyles(){
    for(const sheet of document.styleSheets){
      if(sheet.href && new URL(sheet.href).pathname==='/css/orrery.css')collectMedia(sheet.cssRules);
    }
    applyTheme();
  }
  window.StudioTheme={refreshOrreryStyles};
  function applyTheme() {
    const mode=preference==='system'?(mq.matches?'dark':'light'):preference;
    document.documentElement.dataset.color=mode;
    document.documentElement.dataset.themePreference=preference;
    const label=window.StudioLanguage.t(mode==='dark'?'切换到浅色主题':'切换到深色主题');
    picker.setAttribute('aria-label',label);
    picker.title=label;
    for(const [rule,query] of orreryMedia)rule.media.mediaText=query.replace(/\(prefers-color-scheme:\s*(light|dark)\)/g,(_,scheme)=>scheme===mode?'(min-width: 0px)':'(max-width: -1px)');
    document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || (mode==='dark'?'#0c121b':'#ffffff');
    window.dispatchEvent(new Event('studio:theme'));
  }
  let themeTransitionTimer;
  picker.addEventListener('click',()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){clearTimeout(themeTransitionTimer);document.documentElement.dataset.themeChanging='';themeTransitionTimer=setTimeout(()=>delete document.documentElement.dataset.themeChanging,240)}preference=document.documentElement.dataset.color==='dark'?'light':'dark';applyTheme()});
  // Manual toggles belong to this visible page, never to a stored preference.
  function followSystem() {
    clearTimeout(themeTransitionTimer);
    delete document.documentElement.dataset.themeChanging;
    preference='system';
    applyTheme();
  }
  mq.addEventListener('change',followSystem);
  window.addEventListener('pageshow',event=>{if(event.persisted)followSystem()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')followSystem()});
  window.addEventListener('studio:language',applyTheme);
  refreshOrreryStyles();
  // A local-only visual comparison. The source photograph is never modified.
  if (['127.0.0.1','localhost'].includes(location.hostname) && new URLSearchParams(location.search).get('portrait')==='mono') document.documentElement.classList.add('portrait-mono');
  document.addEventListener('DOMContentLoaded',()=>{
    if(window.NexT?.utils){
      NexT.utils.wrapTableWithBox();
      NexT.utils.registerCodeblock();
      NexT.utils.registerTabsTag();
      NexT.utils.registerVideoIframe();
      if(window.CONFIG?.exturl)NexT.utils.registerExtURL();
    }
    document.querySelectorAll('.post-body .arch-plot-wrap,.post-body .table-container,.post-body mjx-container[display="true"]').forEach(view=>{
      const update=()=>{const scrollable=view.scrollWidth>view.clientWidth+1;view.tabIndex=scrollable?0:-1;if(view.classList.contains('arch-plot-wrap'))view.closest('.v-figure').dataset.scrollable=String(scrollable);};
      update();
      if(window.ResizeObserver)new ResizeObserver(update).observe(view);
    });
    document.querySelectorAll('img[data-src]').forEach(img=>{img.loading='lazy';img.decoding='async';if(img.dataset.srcset)img.srcset=img.dataset.srcset;img.src=img.dataset.src;});
    const copyStatus = document.createElement('span');
    copyStatus.className = 'sr-only';
    copyStatus.setAttribute('role', 'status');
    copyStatus.dataset.siteDynamic = '';
    document.body.append(copyStatus);
    let copyMessage = '';
    function labelCopyButtons() {
      document.querySelectorAll('.copy-btn').forEach(button => button.setAttribute('aria-label', window.StudioLanguage.t('复制代码')));
      copyStatus.textContent = window.StudioLanguage.t(copyMessage);
    }
    labelCopyButtons();
    window.addEventListener('studio:language', labelCopyButtons);
    document.addEventListener('studio:copy-result', event => {
      copyMessage = event.detail.success ? '代码已复制' : '复制失败，请手动选择代码复制。';
      copyStatus.textContent = window.StudioLanguage.t(copyMessage);
    });
    const toc=document.querySelector('.reading-toc details');
    if(toc){if(!toc.querySelector('.toc-scroll a'))toc.parentElement.hidden=true;else toc.open=innerWidth>=1100;}
    const heading = document.querySelector('.btc-archive-heading');
    if (heading) {
      const form = document.createElement('form');
      form.className = 'archive-search';
      form.setAttribute('role', 'search');
      form.innerHTML = '<label for="archive-query">查找文章</label><div class="archive-search-field"><input id="archive-query" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="例如：芯片、摄影、2026…"><button type="button" class="archive-reset" hidden>清除筛选</button></div><output data-site-dynamic aria-live="polite" aria-atomic="true"></output>';
      heading.append(form);
      window.StudioLanguage.apply(form);
      const empty = document.createElement('div');
      empty.className = 'archive-empty';
      empty.hidden = true;
      empty.innerHTML = '<p>没有匹配文章，可更换关键词或清除筛选。</p><button type="button">清除筛选</button>';
      document.querySelector('.archive-categories')?.after(empty);
      window.StudioLanguage.apply(empty);
      const input = form.querySelector('input');
      const reset = form.querySelector('button');
      const output = form.querySelector('output');
      const categoryNav = document.querySelector('.archive-categories');
      const buttons = [...document.querySelectorAll('.archive-categories button')];
      const groups = [...document.querySelectorAll('.btc-archive-year')];
      const items = [...document.querySelectorAll('.btc-archive-list li')].map(row => ({
        row,
        section: row.dataset.section,
        search: window.StudioLanguage.searchTerms(row.textContent + ' ' + row.querySelector('time').dateTime + ' ' + (buttons.find(button => button.dataset.section === row.dataset.section)?.textContent || '')).toLowerCase()
      }));
      let selected = 'all';
      function readURL() {
        const params = new URLSearchParams(location.search);
        selected = buttons.some(button => button.dataset.section === params.get('category')) ? params.get('category') : 'all';
        input.value = params.get('q') || '';
      }
      function filterArticles(historyMode) {
        const query = input.value.trim().toLowerCase();
        let count = 0;
        for (const item of items) {
          item.row.hidden = !(item.search.includes(query) && (selected === 'all' || item.section === selected));
          if (!item.row.hidden) count++;
        }
        for (const group of groups) {
          const visible = [...group.querySelectorAll('li')].filter(row => !row.hidden).length;
          group.hidden = !visible;
          group.querySelector('h2 span').dataset.siteDynamic='';
          group.querySelector('h2 span').textContent = window.StudioLanguage.t(visible + ' 篇');
        }
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.section === selected)));
        reset.hidden = !query && selected === 'all';
        output.textContent = window.StudioLanguage.t('找到 ' + count + ' 篇文章');
        empty.hidden = count !== 0;
        if (historyMode) {
          const url = new URL(location.href);
          if (selected === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', selected);
          if (query) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
          if (url.href !== location.href) history[historyMode + 'State'](null, '', url);
        }
      }
      form.addEventListener('submit', event => event.preventDefault());
      input.addEventListener('input', () => filterArticles('replace'));
      buttons.forEach(button => button.addEventListener('click', () => {
        const mutate=()=>{selected=button.dataset.section;filterArticles('push')};
        if(window.StudioMotion)window.StudioMotion.transitionList(document.querySelector('.btc-archive-index'),mutate);else mutate();
      }));
      reset.addEventListener('click', () => {
        const mutate=()=>{input.value='';selected='all';filterArticles('push')};
        if(window.StudioMotion)window.StudioMotion.transitionList(document.querySelector('.btc-archive-index'),mutate);else mutate();
        input.focus();
      });
      empty.querySelector('button').addEventListener('click', () => reset.click());
      window.addEventListener('studio:language',()=>filterArticles());
      window.addEventListener('popstate', () => { readURL(); filterArticles(); });
      if (categoryNav) categoryNav.hidden = false;
      readURL();
      filterArticles();
    }
    const readingToc = document.querySelector('.reading-toc');
    if (readingToc) {
      const links = [...readingToc.querySelectorAll('.toc-scroll a')];
      const targets = new Map();
      for (const link of links) {
        try {
          const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
          if (target) targets.set(target, link);
        } catch {}
      }
      function markCurrent(link) {
        for (const item of links) {
          if (item === link) item.setAttribute('aria-current', 'location');
          else item.removeAttribute('aria-current');
        }
      }
      trackSection([...targets.keys()], target => markCurrent(targets.get(target)));
      readingToc.addEventListener('click', event => {
        const link = event.target.closest('a');
        if (!link) return;
        if (links.includes(link)) markCurrent(link);
        if (innerWidth < 1100) {
          readingToc.querySelector('details').open = false;
          try {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) { target.tabIndex = -1; target.focus({preventScroll: true}); }
          } catch {}
        }
      });
    }
    const sectionNav = document.querySelector('.about-section-nav');
    if (sectionNav) {
      const links = [...sectionNav.querySelectorAll('a')];
      const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);
      trackSection(sections, section => {
        links.forEach(link => {
          if (link.hash === '#' + section.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }
  });

  // Cache geometry when layout changes, not on every scroll frame.
  function trackSection(sections, mark) {
    if (!sections.length) return;
    let pending = false;
    let current;
    let positions=[];
    let dirty=true;
    function update() {
      pending = false;
      if(dirty){positions=sections.map(section=>section.getBoundingClientRect().top+scrollY);dirty=false;}
      const line = scrollY + Math.min(160, innerHeight * .22);
      let lo=0,hi=positions.length;
      while(lo<hi){const mid=(lo+hi)>>>1;if(positions[mid]<=line)lo=mid+1;else hi=mid;}
      let next=sections[Math.max(0,lo-1)];
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) next = sections.at(-1);
      if (next !== current) { current = next; mark(next); }
    }
    function schedule() {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', schedule, {passive: true});
    function invalidate(){dirty=true;schedule();}
    window.addEventListener('resize', invalidate);
    window.addEventListener('load', invalidate, {once: true});
    document.addEventListener('load', invalidate, true);
    document.addEventListener('tabs:click', invalidate);
    if(window.ResizeObserver){const observer=new ResizeObserver(invalidate);observer.observe(document.getElementById('main-content'));}
    if (document.fonts) document.fonts.ready.then(invalidate);
    schedule();
  }
})();
