    (() => {
      'use strict';
      const $ = (id) => document.getElementById(id);
      const root = document.documentElement;
      const query = new URLSearchParams(window.location.search);
      const config = window.__INFERENCE_LAB_CONFIG__ || {};
      const TABS = ['batch', 'memory'];
      const THEMES = ['system', 'light', 'dark'];
      const GIB = 2 ** 30;
      const fixed = Object.freeze({ layers: 32, kvHeads: 8, headDim: 128, kvBytes: 2,
        weightBytes: 4e9, linearFlops: 16e9, bandwidth: 600e9, compute: 80e12, overhead: .0002 });
      let activeTab = 'batch';
      let activeTheme = 'system';
      let batchState = { batch: 16, context: 2048 };
      let resizeFrame = 0;
      let lastWidth = 0;
      let lastReportedHeight = 0;
      let lastReportedTab = '';
      const announceTimers = {};

      function format(value, decimals = 1) {
        if (Math.abs(value) >= 1e7) return value.toExponential(3);
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
      }
      function giB(value) {
        return value > 0 && value < .001 ? '< 0.001' : format(value, 3);
      }
      function metric(id, value, decimals, trimZeros = false) {
        $(id).textContent = trimZeros && Math.abs(value) < 1e7
          ? new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value)
          : format(value, decimals);
        $(id).dataset.value = String(value);
      }
      function announce(id, message) {
        clearTimeout(announceTimers[id]);
        announceTimers[id] = setTimeout(() => { $(id).textContent = message; }, 180);
      }
      function validNumber(id, min, max = Infinity, integer = false) {
        const el = $(id);
        const value = el.valueAsNumber;
        const valid = Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
        el.setAttribute('aria-invalid', String(!valid));
        return valid ? value : null;
      }
      function setError(kind, text) {
        const error = $(kind + '-error');
        error.hidden = !text;
        error.textContent = text;
        $(kind + '-output').hidden = Boolean(text);
        if (text) announce(kind + '-live', '结果暂未更新。' + text);
        scheduleLayout();
      }

      // Same batching equation and SI units as make_figures.py.
      function batchEstimate(batch, context) {
        const kvBytes = 2 * fixed.layers * context * fixed.kvHeads * fixed.headDim * fixed.kvBytes;
        const readSeconds = (fixed.weightBytes + batch * kvBytes) / fixed.bandwidth;
        const computeSeconds = batch * fixed.linearFlops / fixed.compute;
        const stepSeconds = Math.max(readSeconds, computeSeconds) + fixed.overhead;
        return { kvBytes, readSeconds, computeSeconds, stepSeconds,
          aggregate: batch / stepSeconds, perSequence: 1 / stepSeconds };
      }
      function updateBatch() {
        const batch = validNumber('batch-count', 1, 128, true);
        if (batch === null) { setError('batch', '请将活跃序列 B 填为 1–128 的整数。'); return; }
        const context = Number($('batch-context').value);
        $('batch-range').value = String(batch);
        batchState = { batch, context };
        setError('batch', '');
        const result = batchEstimate(batch, context);
        const baseline = batchEstimate(1, context);
        metric('step-value', result.stepSeconds * 1000, 2);
        metric('aggregate-value', result.aggregate, 1);
        metric('per-sequence-value', result.perSequence, 1);
        $('read-time').textContent = format(result.readSeconds * 1000, 2) + ' ms';
        $('compute-time').textContent = format(result.computeSeconds * 1000, 2) + ' ms';
        $('batch-kv').textContent = giB(batch * result.kvBytes / GIB) + ' GiB';
        $('batch-kv').dataset.value = String(batch * result.kvBytes / GIB);
        const limiting = result.readSeconds >= result.computeSeconds ? '权重与 KV 的读取项较大' : '线性层的计算项较大';
        $('batch-reading').textContent = `当前 B = ${batch}，S = ${format(context, 0)}。${limiting}。与 B = 1 相比，总吞吐为 ${format(result.aggregate / baseline.aggregate, 2)} 倍；每序列速率从 ${format(baseline.perSequence, 1)} 变为 ${format(result.perSequence, 1)} tokens/s。`;
        $('batch-plot-note').textContent = `横轴：活跃序列 B；竖线与圆点：当前 B = ${batch}。两条曲线都固定 S = ${format(context, 0)}。`;
        $('batch-table-caption').textContent = `固定 S = ${format(context, 0)}；当前行标注“当前”，数值按同一公式计算。`;
        const points = [...new Set([1, 2, 4, 8, 16, 32, 64, 128, batch])].sort((a, b) => a - b);
        $('batch-table-body').replaceChildren(...points.map((b) => {
          const r = batchEstimate(b, context);
          const tr = document.createElement('tr');
          if (b === batch) tr.setAttribute('aria-current', 'true');
          [String(b) + (b === batch ? ' · 当前' : ''), format(r.stepSeconds * 1000, 2), format(r.aggregate, 1), format(r.perSequence, 1)].forEach((value, i) => {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) cell.scope = 'row';
            cell.textContent = value;
            tr.appendChild(cell);
          });
          return tr;
        }));
        drawBatchCharts();
        announce('batch-live', `B 为 ${batch}，缓存长度 ${context}。单步 ${format(result.stepSeconds * 1000, 2)} 毫秒，总吞吐 ${format(result.aggregate, 1)} tokens 每秒，每序列 ${format(result.perSequence, 1)} tokens 每秒。`);
      }

      function svgElement(tag, attrs = {}, text = null) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
        if (text !== null) el.textContent = text;
        return el;
      }
      function plotTicks(maximum) {
        const rough = maximum * 1.04 / 5;
        const power = 10 ** Math.floor(Math.log10(rough));
        const ratio = rough / power;
        const step = ([1, 2, 2.5, 5, 10].find((v) => v >= ratio) || 10) * power;
        const top = Math.ceil(maximum * 1.04 / step) * step;
        return { step, top };
      }
      function drawPlot(id, property, color, dashed, title) {
        const svg = $(id);
        const rect = svg.getBoundingClientRect();
        const width = Math.max(220, Math.round(rect.width || 420));
        const height = Math.round(rect.height || 220);
        const left = 43, right = 13, top = 13, bottom = 35;
        const plotW = width - left - right, plotH = height - top - bottom;
        const rows = Array.from({ length: 128 }, (_, i) => ({ b: i + 1, value: batchEstimate(i + 1, batchState.context)[property] }));
        const { step, top: yMax } = plotTicks(Math.max(...rows.map((r) => r.value)));
        const x = (b) => left + (b - 1) / 127 * plotW;
        const y = (value) => top + plotH * (1 - value / yMax);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const nodes = [
          svgElement('title', { id: id + '-title' }, title),
          svgElement('desc', { id: id + '-desc' }, `固定上下文 ${batchState.context} tokens，活跃序列从 1 到 128；当前 B 为 ${batchState.batch}。当前值 ${format(rows[batchState.batch - 1].value, 1)} tokens 每秒。下方可展开数值表。`)
        ];
        for (let value = 0; value <= yMax + step * .01; value += step) {
          nodes.push(svgElement('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), class: 'inf-grid' }));
          const label = value >= 1000 ? format(value / 1000, value % 1000 === 0 ? 0 : 1) + 'k' : format(value, Number.isInteger(value) ? 0 : 1);
          nodes.push(svgElement('text', { x: left - 7, y: y(value) + 3.5, 'text-anchor': 'end' }, label));
        }
        nodes.push(svgElement('line', { x1: left, x2: width - right, y1: y(0), y2: y(0), class: 'inf-axis' }));
        [1, 32, 64, 96, 128].forEach((value, i) => {
          nodes.push(svgElement('line', { x1: x(value), x2: x(value), y1: y(0), y2: y(0) + 4, class: 'inf-axis' }));
          nodes.push(svgElement('text', { x: x(value), y: y(0) + 17, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle' }, String(value)));
        });
        nodes.push(svgElement('text', { x: left + plotW / 2, y: height - 3, 'text-anchor': 'middle' }, '活跃序列 B'));
        const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.b).toFixed(2)},${y(r.value).toFixed(2)}`).join(' ');
        nodes.push(svgElement('path', { d: path, fill: 'none', stroke: `var(${color})`, 'stroke-width': 2.4, 'stroke-linejoin': 'round', ...(dashed ? { 'stroke-dasharray': '5 3' } : {}) }));
        const selected = rows[batchState.batch - 1];
        nodes.push(svgElement('line', { x1: x(selected.b), x2: x(selected.b), y1: top, y2: y(0), stroke: 'var(--chart-amber)', 'stroke-dasharray': '3 4', 'stroke-width': 1.2 }));
        nodes.push(svgElement('circle', { cx: x(selected.b), cy: y(selected.value), r: 4.2, stroke: 'var(--chart-amber)', fill: 'var(--surface-card)', 'stroke-width': 2 }));
        svg.replaceChildren(...nodes);
      }
      function drawBatchCharts() {
        if (activeTab !== 'batch' || $('batch-output').hidden) return;
        drawPlot('aggregate-chart', 'aggregate', '--chart-blue', false, '总输出吞吐随活跃序列数变化');
        drawPlot('per-sequence-chart', 'perSequence', '--chart-teal', true, '每序列输出速率随活跃序列数变化');
      }

      function updateMemory() {
        const batch = validNumber('memory-batch', 1, 32, true);
        const available = validNumber('available-memory', 0);
        const reserve = validNumber('reserve-memory', 0);
        const errors = [];
        if (batch === null) errors.push('缓存序列数 B 应为 1–32 的整数。');
        if (available === null) errors.push('可分配内存应为 0 或正数，单位 GiB。');
        if (reserve === null) errors.push('额外余量应为 0 或正数，单位 GiB。');
        if (errors.length) { setError('memory', errors.join('')); return; }
        setError('memory', '');
        $('memory-batch-range').value = String(batch);
        const parameters = Number($('weight-parameters').value);
        const weightBits = Number($('weight-bits').value);
        const heads = Number($('kv-heads').value);
        const kvBits = Number($('kv-bits').value);
        const context = Number($('memory-context').value);
        const weight = parameters * 1e9 * weightBits / 8 / GIB;
        const kv = 2 * fixed.layers * batch * context * heads * fixed.headDim * kvBits / 8 / GIB;
        const total = weight + kv + reserve;
        if (!Number.isFinite(total)) { setError('memory', '输入超出可计算的数值范围，请减小额外余量。'); return; }
        const remainder = available - total;
        const over = remainder < 0;
        metric('weight-value', weight, 3, true);
        metric('kv-value', kv, 3, true);
        metric('reserve-value', reserve, 3, true);
        const scale = Math.max(total, available);
        $('weight-segment').style.width = (weight / scale * 100) + '%';
        $('kv-segment').style.width = (kv / scale * 100) + '%';
        $('reserve-segment').style.width = (reserve / scale * 100) + '%';
        $('budget-marker').style.left = (available / scale * 100) + '%';
        $('memory-status').dataset.state = over ? 'over' : 'within';
        $('memory-status').dataset.remainder = String(remainder);
        const difference = giB(Math.abs(remainder));
        $('memory-verdict').textContent = over ? `超过预算 · 还差 ${difference} GiB` : `未超过预算 · 剩余 ${difference} GiB`;
        $('memory-total').textContent = `权重 + KV + 余量共 ${giB(total)} GiB；输入预算为 ${giB(available)} GiB。`;
        $('memory-total').dataset.value = String(total);
        $('memory-context-reading').textContent = `每条序列的 KV 为 ${giB(kv / batch)} GiB，共 ${batch} 条。` + (over ? '按这些输入，原始数据与预留余量已超出预算。' : '此处通过的是容量算术，实际能否运行仍取决于模型与后端。');
        $('memory-meter-caption').textContent = over
          ? `柱长按总需求 ${giB(total)} GiB 缩放；虚线位置为 ${giB(available)} GiB 预算，虚线右侧超出预算。`
          : `柱长按 ${giB(available)} GiB 预算缩放；空白部分是剩余容量。`;
        announce('memory-live', `权重 ${giB(weight)} GiB，KV ${giB(kv)} GiB，余量 ${giB(reserve)} GiB。${$('memory-verdict').textContent}。`);
      }

      function chooseTab(tab, focus = false) {
        activeTab = TABS.includes(tab) ? tab : 'batch';
        TABS.forEach((name) => {
          const selected = name === activeTab;
          $('tab-' + name).setAttribute('aria-selected', String(selected));
          $('tab-' + name).tabIndex = selected ? 0 : -1;
          $('panel-' + name).hidden = !selected;
        });
        if (focus) $('tab-' + activeTab).focus();
        drawBatchCharts();
        scheduleLayout();
      }
      function chooseTheme(theme) {
        activeTheme = THEMES.includes(theme) ? theme : 'system';
        root.dataset.theme = activeTheme;
        const name = { system: '跟随系统', light: '浅色', dark: '深色' }[activeTheme];
        $('theme-toggle').textContent = '主题：' + name;
        $('theme-toggle').setAttribute('aria-label', `切换主题，当前${name}；按下依次切换跟随系统、浅色、深色`);
        scheduleLayout();
      }
      function reportHeight() {
        if (window.parent === window) return;
        const height = Math.ceil(document.body.getBoundingClientRect().height);
        if (height === lastReportedHeight && activeTab === lastReportedTab) return;
        lastReportedHeight = height;
        lastReportedTab = activeTab;
        let target = '*';
        try { if (document.referrer) target = new URL(document.referrer).origin; } catch (_) {}
        if (target === 'null') target = '*';
        window.parent.postMessage({ type: 'inference-lab-height', height, tab: activeTab }, target);
      }
      function scheduleLayout() {
        if (resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = 0;
          const width = document.body.getBoundingClientRect().width;
          if (width !== lastWidth) { lastWidth = width; drawBatchCharts(); }
          reportHeight();
        });
      }

      $('batch-range').addEventListener('input', () => { $('batch-count').value = $('batch-range').value; updateBatch(); });
      $('batch-count').addEventListener('input', updateBatch);
      $('batch-context').addEventListener('change', updateBatch);
      $('memory-batch-range').addEventListener('input', () => { $('memory-batch').value = $('memory-batch-range').value; updateMemory(); });
      ['memory-batch', 'available-memory', 'reserve-memory'].forEach((id) => $(id).addEventListener('input', updateMemory));
      ['weight-parameters', 'weight-bits', 'kv-heads', 'kv-bits', 'memory-context'].forEach((id) => $(id).addEventListener('change', updateMemory));
      TABS.forEach((name) => {
        $('tab-' + name).addEventListener('click', () => chooseTab(name));
        $('tab-' + name).addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'batch' : event.key === 'End' ? 'memory' : TABS[(TABS.indexOf(activeTab) + 1) % TABS.length];
          chooseTab(next, true);
        });
      });
      $('theme-toggle').addEventListener('click', () => chooseTheme(THEMES[(THEMES.indexOf(activeTheme) + 1) % THEMES.length]));
      window.addEventListener('message', (event) => {
        if (event.source !== window.parent || window.parent === window || !event.data || event.data.type !== 'inference-theme') return;
        if (THEMES.includes(event.data.theme)) chooseTheme(event.data.theme);
      });
      window.addEventListener('resize', scheduleLayout);
      if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe(document.body);
      document.querySelectorAll('details').forEach((el) => el.addEventListener('toggle', scheduleLayout));

      root.classList.add('inf-ready');
      $('batch-controls').disabled = false;
      $('memory-controls').disabled = false;
      $('theme-toggle').disabled = false;
      const initialTab = TABS.includes(config.tab) ? config.tab : query.get('tab') || root.dataset.initialTab || document.body.dataset.initialTab;
      const initialTheme = THEMES.includes(config.theme) ? config.theme : query.get('theme');
      chooseTheme(initialTheme);
      chooseTab(initialTab);
      updateBatch();
      updateMemory();
      scheduleLayout();
    })();
