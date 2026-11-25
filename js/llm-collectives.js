(() => {
  'use strict';

  const demo = document.getElementById('llm-collectives');
  if (!demo || demo.dataset.ready) return;
  const input = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16]
  ];
  const count = input.length;
  const modes = {
    allgather: '每张卡提供左边的一个数。按 rank 的顺序，把这四个数拼到每张卡上。',
    allreduce: '每张卡提供一行。四行按位置相加，每张卡都拿到四个和。',
    reducescatter: '四行按位置相加，第一个和交给 rank 0，第二个交给 rank 1，依此类推。',
    alltoall: '每行的四个格子写着四张目标卡要收的数，从 rank 0 排到 rank 3。'
  };
  const inputBody = demo.querySelector('[data-collectives-input] tbody');
  const outputBody = demo.querySelector('[data-collectives-output] tbody');
  const controls = demo.querySelector('[data-collectives-controls]');
  const buttons = Array.from(demo.querySelectorAll('[data-collectives-op]'));
  const previous = demo.querySelector('[data-collectives-action="prev"]');
  const next = demo.querySelector('[data-collectives-action="next"]');
  const play = demo.querySelector('[data-collectives-action="play"]');
  const counter = demo.querySelector('[data-collectives-step]');
  const explanation = demo.querySelector('[data-collectives-status]');

  let operation = 'allgather';
  let step = 0;
  let timer = null;

  function writeTable(body, rows, focus) {
    const fragment = document.createDocumentFragment();

    rows.forEach((values, rank) => {
      const row = document.createElement('tr');
      const label = document.createElement('th');
      label.scope = 'row';
      label.textContent = 'r' + rank;
      label.setAttribute('aria-label', 'rank ' + rank);
      row.append(label);

      values.forEach((value, column) => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '·';
        if (value === null) cell.setAttribute('aria-label', '待填入');
        if (focus(rank, column)) cell.dataset.collectivesFocus = '';
        row.append(cell);
      });
      fragment.append(row);
    });
    body.replaceChildren(fragment);
  }

  function readColumn(column) {
    return input.map(row => row[column]);
  }

  function describe(mode, index) {
    if (index < 0) return modes[mode];

    const position = index + 1;
    const column = readColumn(index);
    const sum = column.reduce((a, b) => a + b, 0);
    if (mode === 'allgather') {
      return 'rank ' + index + ' 的 ' + input[index][0] +
        ' 填到每张卡的第 ' + position + ' 格。';
    }
    if (mode === 'alltoall') {
      return '第 ' + position + ' 列都发给 rank ' + index +
        '。按来源 rank 排好，收到 ' + column.join('、') + '。';
    }
    const destination = mode === 'allreduce'
      ? '每张卡的第 ' + position + ' 格'
      : ' rank ' + index;
    return column.join(' + ') + ' = ' + sum + '，结果交给' + destination + '。';
  }

  function render() {
    const gather = operation === 'allgather';
    const scatter = operation === 'reducescatter';
    const toAll = operation === 'alltoall';
    const writesRow = scatter || toAll;
    const current = step - 1;
    const columns = scatter ? 1 : count;
    const inputRows = gather ? input.map(row => row.slice(0, 1)) : input;

    const output = input.map((_, rank) =>
      Array.from({ length: columns }, (_, column) => {
        const index = writesRow ? rank : column;
        if (index >= step) return null;
        if (gather) return input[index][0];
        if (toAll) return input[column][rank];
        return readColumn(index).reduce((a, b) => a + b, 0);
      })
    );

    demo.dataset.collectivesMode = operation;
    writeTable(inputBody, inputRows, (rank, column) => (gather ? rank : column) === current);
    writeTable(outputBody, output, (rank, column) => (writesRow ? rank : column) === current);

    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.collectivesOp === operation));
    });
    previous.setAttribute('aria-disabled', String(step === 0));
    next.setAttribute('aria-disabled', String(step === count));
    counter.textContent = step + ' / ' + count;
    play.textContent = timer !== null ? '暂停' : step === count ? '重播' : '播放';
    explanation.textContent = describe(operation, current);
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    stop();
    operation = button.dataset.collectivesOp;
    step = 0;
    render();
  }));

  previous.addEventListener('click', () => {
    if (step === 0) return;
    stop();
    step -= 1;
    render();
  });

  next.addEventListener('click', () => {
    if (step === count) return;
    stop();
    step += 1;
    render();
  });

  play.addEventListener('click', () => {
    if (timer !== null) {
      stop();
      render();
      return;
    }
    if (step === count) step = 0;
    timer = window.setInterval(() => {
      step += 1;
      if (step === count) stop();
      render();
    }, 1450);
    render();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || timer === null) return;
    stop();
    render();
  });

  demo.dataset.ready = 'true';
  controls.hidden = false;
  render();
})();
