(function initTransferFigures() {
  'use strict';
  const labels = {
    entry: ['库存记录', 'Stock ledger'],
    seen: ['已读到的申请', 'Requests so far'],
    prefix: ['已写下的记录', 'Output prefix'],
    choose: ['选择下一个数字', 'Choose the next digit'],
    prevEntry: ['上一笔', 'Previous entry'],
    nextEntry: ['下一笔', 'Next entry'],
    reset: ['复位', 'Reset'],
    prev: ['上一步', 'Back'],
    next: ['下一步', 'Step'],
    play: ['播放', 'Play'],
    pause: ['暂停', 'Pause'],
    replay: ['重播', 'Replay'],
    schedule: ['单层训练调度', 'Training a single layer'],
    angle: ['梯度夹角', 'Angle between gradients'],
    gCode: ['代码梯度', 'Code gradient'],
    gMath: ['数学梯度', 'Math gradient'],
    gUpdate: ['代码更新', 'Code update'],
    dot: ['梯度内积', 'Dot product'],
    delta: ['一阶 ΔL_math', 'First-order ΔL_math'],
  };
  const useEnglish = () => (window.StudioLanguage?.language || document.documentElement.dataset.language) === 'en';
  const t = (zh, en) => useEnglish() ? en : zh;
  const button = (key) => `<button type="button" data-action="${key}" data-ui="${key}"></button>`;
  const status = '<p class="tr-status" data-feedback role="status"></p>';
  const heading = (key) => `<div class="tr-head"><strong data-ui="${key}"></strong><span class="tr-counter" data-counter></span></div>`;

  function trace(panel) {
    const requests = [4, 5, 2];
    let remaining = 6;
    const ledger = requests.map(request => {
      if (request <= remaining) remaining -= request;
      return remaining;
    });
    let index = 0;
    let answer = null;
    panel.innerHTML = heading('entry') + `
      <div class="tr-field"><span data-ui="seen"></span><samp data-requests></samp></div>
      <div class="tr-field"><span data-ui="prefix"></span><samp><span data-prefix></span><b class="tr-blank">?</b></samp></div>
      <div class="tr-options" role="group" data-label="choose"><span data-ui="choose"></span>
      ${[0, 2, 5, 6].map(value => `<button type="button" data-answer="${value}">${value}</button>`).join('')}</div>
      ${status}<div class="tr-controls">${button('prevEntry')}${button('nextEntry')}${button('reset')}</div>`;
    const explanations = [
      ['6 件够发 4 件，记下 6 − 4 = 2。', 'Six units cover the request for four. Record 6 − 4 = 2.'],
      ['上一笔只剩 2 件，申请 5 件要整笔跳过，账上再记一个 2。', 'Two units remain. The request for five is skipped in full, so record another 2.'],
      ['跳过第二笔后仍有 2 件，正好满足最后一笔。记下 0。', 'Skipping the second request leaves exactly enough for the last one. Record 0.'],
    ];
    function render() {
      panel.querySelector('[data-counter]').textContent = `${index + 1} / ${requests.length}`;
      panel.querySelector('[data-requests]').textContent = requests.slice(0, index + 1).join(' → ');
      panel.querySelector('[data-prefix]').textContent = '[' + ledger.slice(0, index).map(value => value + ', ').join('');
      panel.querySelector('[data-action="prevEntry"]').disabled = index === 0;
      panel.querySelector('[data-action="nextEntry"]').disabled = index === requests.length - 1;
      panel.querySelectorAll('[data-answer]').forEach(option => {
        option.setAttribute('aria-pressed', String(answer === Number(option.dataset.answer)));
      });
      const feedback = panel.querySelector('[data-feedback]');
      if (answer === null) {
        feedback.textContent = t(`从 6 件起算，每笔须全额满足。处理第 ${index + 1} 笔后，记录里该填什么？`,
          `Start with six units and fill each request in full or skip it. What should entry ${index + 1} contain?`);
      } else {
        const verdict = answer === ledger[index] ? t('选对了。', 'Correct. ') : t(`这里应填 ${ledger[index]}。`, `This digit is ${ledger[index]}. `);
        feedback.textContent = verdict + t(...explanations[index]);
      }
    }
    panel.addEventListener('click', event => {
      const control = event.target.closest('button');
      if (!control) return;
      if (control.hasAttribute('data-answer')) {
        answer = Number(control.dataset.answer);
      } else {
        if (control.dataset.action === 'nextEntry') index = Math.min(index + 1, requests.length - 1);
        if (control.dataset.action === 'prevEntry') index = Math.max(index - 1, 0);
        if (control.dataset.action === 'reset') index = 0;
        answer = null;
      }
      render();
    });
    return render;
  }

  function schedule(panel) {
    const width = 4;
    const lane = (label) => `<div><b>${label}</b>${Array.from({length: width}, (_, i) => `<span>${i + 1}</span>`).join('')}</div>`;
    panel.innerHTML = heading('schedule') + `<div class="tr-lanes" aria-hidden="true">${lane('RNN')}${lane('Attention')}</div>
      ${status}<div class="tr-controls">${button('prev')}${button('next')}${button('play')}${button('reset')}</div>`;
    let step = 0;
    let timer = null;
    const stop = () => { window.clearInterval(timer); timer = null; };
    function render() {
      panel.querySelector('[data-counter]').textContent = `${step} / ${width}`;
      panel.querySelector('[data-action="prev"]').disabled = step === 0;
      panel.querySelector('[data-action="next"]').disabled = step === width;
      const play = panel.querySelector('[data-action="play"]');
      play.textContent = t(...labels[timer !== null ? 'pause' : step === width ? 'replay' : 'play']);
      panel.querySelectorAll('.tr-lanes > div').forEach((row, laneIndex) => {
        row.querySelectorAll('span').forEach((cell, index) => {
          cell.classList.toggle('tr-done', laneIndex === 0 ? index < step : step >= 1);
        });
      });
      const descriptions = [
        ['四个输入都已给定。每按一步，求出这一层中所有依赖都已满足的输出。这里一步代表一层依赖，不代表一个 GPU 周期。',
         'All four inputs are available. Each step evaluates every output whose dependencies are ready. A step is a dependency level, not a GPU cycle.'],
        ['RNN 算出位置 1。注意力的四行都可同时算出：第 4 行可读四个输入，第 1 行只能读第 1 个。',
         'The RNN finishes position 1. All four attention rows can finish together. Row 4 can read all four inputs, while row 1 can read only input 1.'],
        ['有了位置 1 的隐藏状态，RNN 才能算位置 2。注意力这一层的四行已经算完。',
         'With the hidden state from position 1, the RNN can compute position 2. All four attention rows are already complete.'],
        ['RNN 把位置 2 的状态传给位置 3，位置 4 还在等。',
         'The hidden state from position 2 reaches position 3. Position 4 must still wait.'],
        ['现在 RNN 也算出了位置 4。两边都完成了同一层的四个位置。',
         'The RNN now finishes position 4. Both sides have completed all four positions in this layer.'],
      ];
      panel.querySelector('[data-feedback]').textContent = t(...descriptions[step]);
    }
    panel.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.action;
      if (!action) return;
      const wasPlaying = timer !== null;
      stop();
      if (action === 'reset') step = 0;
      if (action === 'next') step = Math.min(width, step + 1);
      if (action === 'prev') step = Math.max(0, step - 1);
      if (action === 'play' && !wasPlaying) {
        if (step === width) step = 0;
        timer = window.setInterval(() => {
          step += 1;
          if (step === width) stop();
          render();
        }, 2200);
      }
      render();
    });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change', () => {
      if (motion.matches && timer !== null) { stop(); render(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && timer !== null) { stop(); render(); }
    });
    return render;
  }

  function gradients(panel) {
    panel.innerHTML = `<div class="tr-geometry">
      <svg class="tr-vector-plot" role="img" viewBox="0 0 300 177">
        <path d="M 30 135 A 120 120 0 0 1 270 135 M 150 135 V 15" class="tr-guide"/>
        <path d="M 20 135 H 280" class="tr-axis"/>
        <g class="tr-g-code"><path d="M 150 135 H 265"/><path class="tr-tip" d="m 260 128 10 7 -10 7z"/></g>
        <g class="tr-g-update"><path d="M 150 135 H 122"/><path class="tr-tip" d="m 127 130 -7 5 7 5z"/></g>
        <g class="tr-g-math" data-vector><path d="M 150 135 H 269"/><path d="m 261 130 9 5 -9 5"/></g>
        <circle cx="150" cy="135" r="3" class="tr-origin"/>
        <g class="tr-axis-text" text-anchor="middle"><text x="31" y="160">180°</text><text x="150" y="160">θ</text><text x="269" y="160">0°</text></g>
      </svg>
      <div class="tr-legend">
        <span><i class="tr-mark-code" aria-hidden="true"></i><span data-ui="gCode"></span><var>g<sub>code</sub></var></span>
        <span><i class="tr-mark-math" aria-hidden="true"></i><span data-ui="gMath"></span><var>g<sub>math</sub></var></span>
        <span><i class="tr-mark-update" aria-hidden="true">←</i><span data-ui="gUpdate"></span><var>−ηg<sub>code</sub></var></span>
      </div></div>
      <div class="tr-angle"><label for="tr-angle" data-ui="angle"></label><input id="tr-angle" type="range" min="0" max="180" step="1" value="60"><output for="tr-angle" data-angle></output></div>
      <div class="tr-controls">${[0, 90, 180].map(angle => `<button type="button" data-degrees="${angle}">${angle}°</button>`).join('')}<button type="button" data-degrees="60" data-ui="reset"></button></div>
      <div class="tr-metrics"><div><span data-ui="dot"></span><samp data-dot></samp></div>
      <div><span data-ui="delta"></span><samp data-delta></samp></div></div>${status}`;
    const input = panel.querySelector('input');
    const display = value => (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(3);
    function render() {
      const angle = Number(input.value);
      const dot = angle === 90 ? 0 : Math.cos(angle * Math.PI / 180);
      panel.querySelector('[data-vector]').setAttribute('transform', `rotate(${-angle} 150 135)`);
      panel.querySelector('svg').setAttribute('aria-label', t(`两个单位梯度夹角 ${angle} 度。短箭头沿代码梯度的反方向。`,
        `Two unit gradients at ${angle} degrees. The short update arrow points against the code gradient.`));
      panel.querySelector('[data-angle]').textContent = `${angle}°`;
      input.setAttribute('aria-valuetext', t(`${angle} 度`, `${angle} degrees`));
      panel.querySelector('[data-dot]').textContent = display(dot);
      panel.querySelector('[data-delta]').textContent = display(-0.25 * dot);
      let effect = t('两梯度正交。数学损失的一阶变化为零，高阶项仍可能使它改变。',
        'The gradients are orthogonal. The first-order change in math loss is zero. Higher-order terms may still contribute.');
      if (dot > 0) effect = t('内积为正。这一步代码更新沿着数学损失下降的方向有一个分量，局部预期出现正迁移。',
        'A positive dot product gives the code update a component along math descent. The local approximation predicts positive transfer.');
      if (dot < 0) effect = t('内积为负。这一步代码更新沿着数学损失上升的方向有一个分量，局部预期出现负迁移。',
        'A negative dot product gives the code update a component along math ascent. The local approximation predicts negative transfer.');
      panel.querySelector('[data-feedback]').textContent = effect;
    }
    input.addEventListener('input', render);
    panel.addEventListener('click', event => {
      const preset = event.target.closest('button[data-degrees]');
      if (preset) { input.value = preset.dataset.degrees; render(); }
    });
    return render;
  }

  const demos = {trace, schedule, gradients};
  document.querySelectorAll('[data-transfer-widget]').forEach(figure => {
    const mount = demos[figure.dataset.transferWidget];
    const fallback = figure.querySelector('[data-fallback]');
    if (!mount || !fallback || figure.dataset.transferReady) return;
    const panel = document.createElement('div');
    const draw = mount(panel);
    const update = () => {
      panel.lang = useEnglish() ? 'en' : 'zh-CN';
      panel.querySelectorAll('[data-ui]').forEach(el => { el.textContent = t(...labels[el.dataset.ui]); });
      panel.querySelectorAll('[data-label]').forEach(el => { el.setAttribute('aria-label', t(...labels[el.dataset.label])); });
      draw();
    };
    update();
    fallback.before(panel);
    fallback.hidden = true;
    figure.dataset.transferReady = 'true';
    window.addEventListener('studio:language', update);
  });
})();
