/* global NexT, CONFIG, mermaid */

function isDarkMermaidContext() {
  const rootStyle = getComputedStyle(document.documentElement);
  const textColor = rootStyle.getPropertyValue('--text-primary').trim().toLowerCase();

  // Safari can report the page as light to JavaScript while its CSS media
  // query has already applied the dark palette. The resolved theme variable
  // reflects the page that is actually being painted.
  return textColor === '#f2f6fa' || textColor === 'rgb(242, 246, 250)' ||
    rootStyle.colorScheme.includes('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyMermaidColors() {
  const isDark = isDarkMermaidContext();
  const palette = isDark ? {
    clusterFill  : '#0c2233',
    clusterStroke: '#bedef3',
    nodeFill     : '#244d6a',
    nodeStroke   : '#abd9f5',
    labelFill    : '#f2f7fb',
    clusterLabel : '#cfe4f0',
    edgeLabelFill: '#162d3e',
    lineColor    : '#9acbf0'
  } : {
    clusterFill  : '#d7ebf6',
    clusterStroke: '#a4c7dc',
    nodeFill     : '#eff6fa',
    nodeStroke   : '#4f8fc3',
    labelFill    : '#18212b',
    clusterLabel : '#18212b',
    edgeLabelFill: '#e7f3f9',
    lineColor    : '#4f8fc3'
  };

  const setStyles = (selector, styles) => {
    document.querySelectorAll(`.post-body .mermaid svg ${selector}`).forEach(element => {
      Object.entries(styles).forEach(([property, value]) => {
        element.style.setProperty(property, value, 'important');
      });
    });
  };

  // Mermaid writes some SVG fills itself. Safari gives those declarations
  // precedence over the page stylesheet, so enforce the rendered palette here.
  setStyles('.cluster rect', {
    fill: palette.clusterFill,
    stroke: palette.clusterStroke
  });
  setStyles('.node rect, .node polygon, .node circle, .node ellipse', {
    fill: palette.nodeFill,
    stroke: palette.nodeStroke
  });
  setStyles('.edgeLabel rect', { fill: palette.edgeLabelFill });
  setStyles('.flowchart-link', { stroke: palette.lineColor });
  setStyles('.marker, .marker path', {
    fill: palette.lineColor,
    stroke: palette.lineColor
  });
  setStyles('.nodeLabel, .nodeLabel p, .nodeLabel span, .edgeLabel, .edgeLabel p, text', {
    color: palette.labelFill,
    fill: palette.labelFill
  });
  setStyles('.cluster-label, .cluster-label text, .cluster-label span', {
    color: palette.clusterLabel,
    fill: palette.clusterLabel
  });
}

document.addEventListener('page:loaded', async () => {
  const mermaidElements = document.querySelectorAll('pre > .mermaid');
  if (mermaidElements.length) {
    if (!window.mermaid) {
      console.error('[NexT] Mermaid library is unavailable.');
      return;
    }
    mermaidElements.forEach(element => {
      const box = document.createElement('div');
      box.className = 'code-container';
      const newElement = document.createElement('div');
      newElement.innerHTML = element.innerHTML;
      newElement.className = 'mermaid';
      box.appendChild(newElement);
      if (CONFIG.codeblock.copy_button.enable) {
        NexT.utils.registerCopyButton(box, box, element.textContent);
      }
      const parent = element.parentNode;
      parent.parentNode.replaceChild(box, parent);
    });
    const isDark = isDarkMermaidContext();
    const themeVariables = isDark ? {
      primaryColor      : '#244d6a',
      primaryTextColor  : '#f2f7fb',
      primaryBorderColor: '#abd9f5',
      secondaryColor    : '#162d3e',
      tertiaryColor     : '#0c2233',
      lineColor         : '#9acbf0',
      textColor         : '#f2f7fb',
      mainBkg           : '#244d6a',
      nodeBorder        : '#abd9f5',
      clusterBkg        : '#0c2233',
      clusterBorder     : '#bedef3',
      edgeLabelBackground: '#162d3e',
      fontFamily        : '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
    } : {
      primaryColor      : '#eff6fa',
      primaryTextColor  : '#18212b',
      primaryBorderColor: '#4f8fc3',
      secondaryColor    : '#dfeef6',
      tertiaryColor     : '#d7ebf6',
      lineColor         : '#4f8fc3',
      textColor         : '#18212b',
      mainBkg           : '#eff6fa',
      nodeBorder        : '#4f8fc3',
      clusterBkg        : '#d7ebf6',
      clusterBorder     : '#a4c7dc',
      edgeLabelBackground: '#e7f3f9',
      fontFamily        : '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
    };

    mermaid.initialize({
      theme    : isDark ? CONFIG.mermaid.theme.dark : CONFIG.mermaid.theme.light,
      themeVariables,
      logLevel : 4,
      flowchart: { curve: 'linear' },
      gantt    : { axisFormat: '%m/%d/%Y' },
      sequence : { actorMargin: 50 }
    });
    await mermaid.run();
    applyMermaidColors();

    // Mermaid's SVG mutations can be committed after its promise resolves in
    // Safari. A frame-later pass keeps the palette stable without affecting
    // diagram geometry or the Mermaid backend contract.
    requestAnimationFrame(applyMermaidColors);
    window.setTimeout(applyMermaidColors, 80);
  }
});

// Safari restores pages from its back-forward cache without rerunning the
// initial page hook. Reapply the colors to the restored SVG in that case.
window.addEventListener('pageshow', applyMermaidColors);
