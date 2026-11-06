/* global NexT, CONFIG, MathJax */

document.addEventListener('page:loaded', () => {
  if (!CONFIG.enableMath) return;

  if (typeof MathJax === 'undefined') {
    performance.mark("studio:math-request");
    window.MathJax = {
      startup: {
        pageReady: () => {
          performance.mark("studio:math-typeset-start");
          return MathJax.startup.defaultPageReady().then(() => {
            performance.mark("studio:math-ready");
            performance.measure("studio:math-typeset", "studio:math-typeset-start", "studio:math-ready");
            performance.measure("studio:math-total", "studio:math-request", "studio:math-ready");
            document.dispatchEvent(new Event("studio:math-ready"));
          });
        }
      },
      tex: {
        inlineMath: { '[+]': [['$', '$']] },
        tags      : CONFIG.mathjax.tags
      },
      options: {
        renderActions: {
          insertedScript: [200, () => {
            document.querySelectorAll('mjx-container').forEach(node => {
              const target = node.parentNode;
              if (target.nodeName.toLowerCase() === 'li') {
                target.parentNode.classList.add('has-jax');
              }
            });
          }, '', false]
        }
      }
    };
    NexT.utils.getScript(CONFIG.mathjax.js, {
      attributes: {
        defer: true
      }
    });
  } else {
    MathJax.startup.document.state(0);
    MathJax.typesetClear();
    MathJax.texReset();
    MathJax.typesetPromise();
  }
});
