(() => {
  'use strict';

  const root = document.getElementById('rdma-operation-path');
  if (!root || root.hasAttribute('data-rdma-ready')) return;

  const opButtons = [...root.querySelectorAll('[data-op]')];
  const moveButtons = [...root.querySelectorAll('[data-move]')];
  const [previous, next, play] = ['prev', 'next', 'play'].map(name => root.querySelector('[data-move="' + name + '"]'));
  const atomicControls = root.querySelector('[data-atomic-controls]');
  const variantSelect = atomicControls.querySelector('select');
  const writeControls = root.querySelector('[data-write-controls]');
  const writeSelect = writeControls.querySelector('select');
  const requestFields = [...root.querySelectorAll('[data-wr-field]')];
  const extraRequestField = root.querySelector('[data-wr-extra]');
  const extraRequestLabel = root.querySelector('[data-wr-extra-label]');
  const fields = [...root.querySelectorAll('[data-field]')];
  const memoryA = root.querySelector('[data-memory-label="a"]');
  const memoryB = root.querySelector('[data-memory-label="b"]');
  const nodes = [...root.querySelectorAll('[data-node]')];
  const edges = [...root.querySelectorAll('[data-edge]')];
  const counter = root.querySelector('[data-counter]');
  const currentTitle = root.querySelector('[data-event-title]');
  const explanation = root.querySelector('[data-event-text]');

  const links = { a: ['am', 'an'], wire: ['an', 'bn'], b: ['bn', 'bm'] };

  function local(title, text, active, changes = {}) {
    return { title, text, active, changes, kind: 'local' };
  }

  function transfer(title, text, edge, direction, kind, changes = {}) {
    return { title, text, active: links[edge], changes, edge, direction, kind };
  }

  function post(verb, text) {
    return local('A 提交 ' + verb, text, ['am', 'an'], { sq: verb + ' 已提交' });
  }

  function complete(verb, receive) {
    const changes = { sq: '本次请求已完成', aCq: verb + ' 完成' };
    if (receive) {
      changes.bCq = 'RECV 完成 · 4 KiB';
      return local('两端各有一条完成记录',
        'B 可以从接收完成得知 RX7 已收到 4 KiB。A 的发送完成允许它复用 TX。两端各自轮询 CQ，图中合并显示最终状态。',
        ['am', 'bm'], changes);
    }
    return local('A 取得完成记录',
      verb === 'WRITE'
        ? 'A 取得本次 WRITE 的成功完成，可以复用 TX。若 B 的应用要据此处理 slot3，还需双方约定通知方式。'
        : 'A 取得本次操作的成功完成，现在可以使用本地结果。B 的接收队列和完成队列都没有参与这次请求。',
      ['am'], changes);
  }

  const readLocalTx = transfer('A 网卡取出 TX 的内容',
    'A 的网卡以 TX 为源发起 DMA 读。这一步跨 PCIe 的载荷是 4 KiB。', 'a', 'forward', 'data');

  function pushStages(send) {
    const verb = send ? 'SEND' : 'WRITE';
    return [
      local(verb + ' 的起点', send
        ? 'A 有 4 KiB 待发数据。B 已提前投递一条接收请求，指定 RX7 用来存放这条消息。'
        : 'A 有 4 KiB 待写数据，也已拿到 B 端 slot3 的远端地址和 rkey。两端已注册本次用到的内存。', ['am', 'bm']),
      post(verb, send
        ? 'A 在 SQ 上提交请求，指定本地源缓冲区 TX 和长度 4 KiB。接收缓冲区的地址由 B 自己决定。'
        : 'A 在 SQ 上提交请求，填入本地 TX、长度，以及 B 的 slot3 地址和 rkey。B 无须为这次 WRITE 投递接收请求。'),
      readLocalTx,
      transfer('4 KiB 数据从 A 发往 B', send
        ? 'B 网卡按目标 QP 匹配一条已投递的接收请求，从中得到 RX7。A 发出的 SEND 消息里没有 RX7 的地址。'
        : 'WRITE 请求携带 slot3 的远端地址、rkey 和数据。B 网卡校验远端写权限、地址范围，定位到 slot3。',
        'wire', 'forward', 'data', send ? { rq: 'RX7 已匹配' } : {}),
      transfer(send ? 'B 网卡写入 RX7' : 'B 网卡写入 slot3', send
        ? '有效载荷经 B 端 PCIe 写入 RX7。该接收请求供这一条消息使用，即便消息在链路上分成了多个包。'
        : 'B 网卡通过 PCIe 把数据直接写进 slot3。普通 WRITE 完成后，B 端没有对应的接收完成记录。',
        'b', 'forward', 'data', send ? { bMem: 'RX7 · 4 KiB 已到', rq: 'RX7 已消耗' } : { bMem: 'slot3 · 已写入 4 KiB' }),
      complete(verb, send)
    ];
  }

  const writeImmediateStages = [
    local('带立即数的写从哪里开始',
      'A 已拿到 slot3 的地址和 rkey。B 另投了一条接收请求，标识为 7，留给到达通知使用。', ['am', 'bm']),
    post('WRITE_WITH_IMM', '同一个 WR 给出了本地 TX、远端 slot3 和 32 位立即数 3。这里双方约定 3 表示编号为 3 的槽。'),
    readLocalTx,
    transfer('载荷与立即数随同一条请求到达 B',
      '4 KiB 是应用载荷，立即数 3 在传输头中。用多个包传这条写请求时，最后一包携带立即数。',
      'wire', 'forward', 'data'),
    transfer('载荷按远端地址写入 slot3',
      'B 校验远端写权限和地址范围，RNIC 经 PCIe 把 4 KiB 写到 slot3。B 预投的接收请求无需为这 4 KiB 提供缓冲区。',
      'b', 'forward', 'data', { bMem: 'slot3 · 已写入 4 KiB' }),
    transfer('B 的网卡将完成项写入主机 CQ',
      'B 消耗一条接收 WQE。网卡经 PCIe 把硬件完成项（CQE）写入 B 的 CQ，应用稍后可以轮询。',
      'b', 'forward', 'control', { rq: 'wr_id 7 · 已消耗', bCq: '硬件已写 CQE · 待轮询' }),
    local('B 取通知，A 回收源缓冲区',
      'B 轮询 CQ，provider 返回工作完成记录（WC）。其中 wr_id 7 对应 B 预投的接收请求，立即数 3 由 A 给出。B 去 slot3 取数据，A 可在本端成功完成后复用 TX。两端独立轮询。',
      ['am', 'bm'], { sq: '本次请求已完成', aCq: 'WRITE 完成', bCq: 'WC · RECV_RDMA_WITH_IMM · wr_id 7 · imm 3' })
  ];

  const readStages = [
    local('READ 的起点', 'B 的 slot3 存着 4 KiB。A 已获得它的远端地址与 rkey，并准备了本地目标缓冲区 DST。', ['am', 'bm']),
    post('READ', 'A 在 WR 中指定远端源 slot3、本地目的 DST 和长度。收到的数据稍后会写到 DST。'),
    transfer('A 向 B 请求读 slot3', 'READ 请求沿网络发往 B，带远端地址、rkey 和长度。4 KiB 内容此时还在 B 的内存中。', 'wire', 'forward', 'control'),
    transfer('B 网卡读取 slot3', 'B 网卡检查读权限和范围，再发起本地 DMA 读。4 KiB 载荷从 B 主机内存经 PCIe 进入 B 网卡。', 'b', 'back', 'data'),
    transfer('4 KiB 数据从 B 返回 A', 'READ 响应沿反方向返回。发起请求的是 A，发送这 4 KiB 载荷的是 B。', 'wire', 'back', 'data'),
    transfer('A 网卡把响应写入 DST', 'A 网卡根据自己的 READ 请求找到 DST，通过 PCIe 把返回的数据放进去。', 'a', 'back', 'data', { aMem: 'DST · 4 KiB 已到' }),
    complete('READ', false)
  ];

  const variants = {
    faa: { verb: 'FETCH_ADD', request: '加数 1', apply: 'B 将 41 加一，目标变成 42。', after: 42 },
    hit: { verb: 'CMP_SWAP', request: '比较值 41 和新值 99', apply: 'B 读到的 41 与比较值相同，目标改为 99。', after: 99 },
    miss: { verb: 'CMP_SWAP', request: '比较值 40 和新值 99', apply: 'B 读到 41，与比较值 40 不同，目标仍为 41。', after: 41 }
  };

  function atomicStages(variant) {
    const { verb, request, apply, after } = variants[variant];
    return [
      local('ATOMIC 的起点', 'B 端有一个按 8 字节对齐的 64 位计数器，初值 41。A 为返回的旧值预留了 8 字节。', ['am', 'bm']),
      post(verb, 'A 填入 B 端计数器的远端地址、rkey、' + request + '，以及本地接收旧值的地址。'),
      transfer('A 把原子请求发往 B', '请求携带' + request + '。B 网卡检查远端原子访问权限，识别目标 64 位字。', 'wire', 'forward', 'control'),
      local('B 端执行原子操作', apply + ' 图上标出这个 64 位字的变化，具体怎样访问内存由硬件实现决定。', ['bn', 'bm'], { bMem: 'counter = ' + after }),
      transfer('B 向 A 返回旧值 41', '响应中的 8 字节是操作前读到的值。' + (variant === 'miss' ? 'CAS 比较未命中时也返回 41。' : 'B 端存放的值此时为 ' + after + '。'), 'wire', 'back', 'data'),
      transfer('A 网卡写入旧值', '返回值通过 A 端 PCIe 写入本地结果缓冲区，B 的计数器保持当前值。', 'a', 'back', 'data', { aMem: 'result = 41' }),
      complete(verb, false)
    ];
  }

  const writeRequest = {
    opcode: 'IBV_WR_RDMA_WRITE', local: '源 TX · 4 KiB · lkey(TX)',
    remote: '目标 slot3 的地址 + rkey', access: 'slot3 的 MR 授权 REMOTE_WRITE', receive: '0 条'
  };
  const payloadBuffers = {
    send: ['TX', 'RX7'], write: ['TX', 'slot3'], read: ['DST', 'slot3'], atomic: ['result', 'counter']
  };
  const modes = {
    send: {
      request: { opcode: 'IBV_WR_SEND', local: '源 TX · 4 KiB · lkey(TX)', remote: '使用已连接 QP，无远端地址和 rkey', access: 'RX7 允许本地 RNIC 写入', receive: '1 条 · 指定载荷缓冲区 RX7' },
      initial: { aMem: 'TX · 4 KiB', bMem: 'RX7 · 空', rq: 'RX7 已投递', bCq: '等待接收完成' },
      stages: pushStages(true)
    },
    write: { request: writeRequest, initial: { aMem: 'TX · 4 KiB', bMem: 'slot3 · 待写' }, stages: pushStages(false) },
    writeImm: {
      request: { ...writeRequest, opcode: 'IBV_WR_RDMA_WRITE_WITH_IMM', receive: '1 条 · 标识为 7，用于接收通知', extraLabel: 'A 的立即数', extra: '3（32 位，双方约定为槽号）' },
      initial: { aMem: 'TX · 4 KiB', bMem: 'slot3 · 待写', rq: 'wr_id 7 · 已投递', bCq: '等待接收完成' },
      stages: writeImmediateStages
    },
    read: {
      request: { opcode: 'IBV_WR_RDMA_READ', local: '目的 DST · 4 KiB · lkey(DST)', remote: '源 slot3 的地址 + rkey', access: 'slot3 的 MR 授权 REMOTE_READ', receive: '0 条' },
      initial: { aMem: 'DST · 空', bMem: 'slot3 · 4 KiB' }, stages: readStages
    },
    atomic: {
      request: { local: '旧值写回 result · 8 B · lkey(result)', remote: '8 字节对齐的 counter 地址 + rkey', access: 'counter 的 MR 授权 REMOTE_ATOMIC', receive: '0 条', extraLabel: 'A 的操作数' },
      initial: { aMem: 'result · 空', bMem: 'counter = 41' }
    }
  };

  let mode = 'send';
  let index = 0;
  let timer = null;
  let activeMode = modes.send;
  let stages = activeMode.stages;

  function refreshButtonLabels() {
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === stages.length - 1));
    play.textContent = timer !== null ? '暂停' : index === stages.length - 1 ? '重播' : '播放';
  }

  function render() {
    const event = stages[index];
    const state = { sq: '尚未提交', aCq: '尚无本次完成', rq: '本次未使用', bCq: '本次无完成记录', ...activeMode.initial };
    for (let i = 1; i <= index; i += 1) Object.assign(state, stages[i].changes);

    const [bufferA, bufferB] = payloadBuffers[mode];
    const onA = index === 1 ? 'SQ' : event.changes.aCq ? 'CQ' : bufferA;
    const onB = event.changes.bCq ? 'CQ' : bufferB;
    memoryA.textContent = 'DRAM · ' + onA;
    memoryB.textContent = 'DRAM · ' + onB;
    root.dataset.eventKind = event.kind;
    counter.textContent = index + ' / ' + (stages.length - 1);
    currentTitle.textContent = event.title;
    explanation.textContent = event.text;
    nodes.forEach(node => node.toggleAttribute('data-current', event.active.includes(node.dataset.node)));
    edges.forEach(edge => {
      if (edge.dataset.edge === event.edge) edge.dataset.direction = event.direction;
      else edge.removeAttribute('data-direction');
    });
    fields.forEach(field => {
      const key = field.dataset.field;
      field.textContent = state[key];
      field.toggleAttribute('data-changed', Object.prototype.hasOwnProperty.call(event.changes, key));
    });
    opButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.op === mode)));
    atomicControls.hidden = mode !== 'atomic';
    writeControls.hidden = mode !== 'write';
    refreshButtonLabels();
  }

  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function selectMode(name) {
    stop();
    mode = name;
    index = 0;
    activeMode = name === 'write' && writeSelect.value === 'imm' ? modes.writeImm : modes[name];
    let request = activeMode.request;
    if (name === 'atomic') {
      const variant = variants[variantSelect.value];
      stages = atomicStages(variantSelect.value);
      request = { ...request, opcode: variantSelect.value === 'faa' ? 'IBV_WR_ATOMIC_FETCH_AND_ADD' : 'IBV_WR_ATOMIC_CMP_AND_SWP', extra: variant.request };
    } else {
      stages = activeMode.stages;
    }
    requestFields.forEach(field => { field.textContent = request[field.dataset.wrField] || ''; });
    extraRequestField.hidden = !request.extra;
    extraRequestLabel.textContent = request.extraLabel || '';
    render();
  }

  function advance() {
    if (!root.isConnected || document.hidden) {
      stop();
      refreshButtonLabels();
      return;
    }
    index = Math.min(index + 1, stages.length - 1);
    if (index === stages.length - 1) stop();
    render();
  }

  opButtons.forEach(button => button.addEventListener('click', () => selectMode(button.dataset.op)));
  variantSelect.addEventListener('change', () => selectMode('atomic'));
  writeSelect.addEventListener('change', () => selectMode('write'));
  moveButtons.forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    const action = button.dataset.move;
    if (action === 'play') {
      if (timer === null) {
        if (index === stages.length - 1) index = 0;
        timer = window.setInterval(advance, 2300);
      } else stop();
    } else {
      stop();
      index += action === 'next' ? 1 : -1;
    }
    render();
  }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timer !== null) {
      stop();
      refreshButtonLabels();
    }
  });

  selectMode('send');
  root.setAttribute('data-rdma-ready', '');
  root.querySelector('[data-rdma-controls]').hidden = false;
})();
