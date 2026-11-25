(() => {
  'use strict';

  const termToggle = document.getElementById('rdma-term-toggle');
  const extraTerms = document.getElementById('rdma-term-extra');
  if (termToggle && extraTerms && !termToggle.hasAttribute('data-rdma-term-ready')) {
    function showExtraTerms(open) {
      extraTerms.hidden = !open;
      termToggle.setAttribute('aria-expanded', String(open));
      termToggle.textContent = open ? '收起其余术语' : '展开其余术语';
    }
    showExtraTerms(false);
    termToggle.hidden = false;
    termToggle.setAttribute('data-rdma-term-ready', '');
    termToggle.addEventListener('click', () => showExtraTerms(extraTerms.hidden));
  }

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
    return local('A 应用提交 ' + verb + ' WR', text, ['am', 'an'], { sq: verb + ' WR 已提交' });
  }

  function complete(verb, receive) {
    const changes = { sq: 'WR 已完成', aCq: '已取 WC · ' + verb };
    if (receive) {
      changes.bCq = '已取 WC · RECV · 4 KiB';
      return local('两端各自轮询 CQ',
        '两端的 RNIC 分别写入 CQE。B 应用轮询 CQ，取得 RECV WC，得知 RX7 已收到 4 KiB。A 应用在自己的 CQ 上取得成功的 SEND WC 后，就可以复用 TX。',
        ['am', 'bm'], changes);
    }
    return local('A 应用轮询 CQ',
      verb === 'WRITE'
        ? 'A 端 RNIC 写入 CQE，A 应用轮询 CQ 得到成功的 WRITE WC，便可复用 TX。若 B 应用需要知道何时处理 slot3，双方还得约定通知方式。'
        : 'A 端 RNIC 写入 CQE，A 应用轮询 CQ 得到成功的 WC，便可读取本地结果。B 端不消耗接收 WQE，也不为此写 CQE。',
      ['am'], changes);
  }

  const readLocalTx = transfer('A 端 RNIC 读取 TX',
    'A 端 RNIC 处理发送 WQE，按 SGE 发起 DMA 读。TX 中的 4 KiB 载荷经 PCIe 进入 RNIC。', 'a', 'forward', 'data');

  function pushStages(send) {
    const verb = send ? 'SEND' : 'WRITE';
    return [
      local(verb + ' 的起点', send
        ? 'A 的 TX 有 4 KiB 待发数据。B 应用已预投接收 WR，用 RX7 存放这条消息。'
        : 'A 有 4 KiB 待写数据，也已拿到 B 端 slot3 的远端地址和 rkey。两端已注册本次用到的内存。', ['am', 'bm']),
      post(verb, send
        ? 'A 应用在 SEND WR 中填入本地 TX 和长度 4 KiB。接收地址由 B 应用预投的 WR 指定。'
        : 'A 应用在 WRITE WR 中填入本地 TX、长度及 B 端 slot3 的地址和 rkey。B 应用无须为这次 WRITE 预投接收 WR。'),
      readLocalTx,
      transfer('4 KiB 数据从 A 发往 B', send
        ? 'B 端 RNIC 按目的 QPN 找到 QP，再从 RQ 取一条接收 WQE。RX7 的地址就在这条 WQE 里。'
        : 'WRITE 请求携带 slot3 的远端地址、rkey 和数据。B 端 RNIC 校验远端写权限和地址范围，定位到 slot3。',
        'wire', 'forward', 'data', send ? { rq: '接收 WQE 已匹配 · RX7' } : {}),
      transfer(send ? 'B 端 RNIC 写入 RX7' : 'B 端 RNIC 写入 slot3', send
        ? 'B 端 RNIC 经 PCIe 把载荷写进 RX7。即使消息分成多个包，整条消息也只消耗一条接收 WQE。'
        : 'B 端 RNIC 经 PCIe 把数据写进 slot3。普通 WRITE 不会让 B 端产生接收 CQE。',
        'b', 'forward', 'data', send ? { bMem: 'RX7 · 4 KiB 已到', rq: '接收 WQE 已消耗' } : { bMem: 'slot3 · 已写入 4 KiB' }),
      complete(verb, send)
    ];
  }

  const writeImmediateStages = [
    local('WRITE_WITH_IMM 的起点',
      'A 已拿到 slot3 的地址和 rkey。B 应用预投了一条 wr_id 为 7 的接收 WR，用它来收通知。', ['am', 'bm']),
    post('WRITE_WITH_IMM', 'A 应用在 WR 中指定本地 TX、远端 slot3，并填入 32 位立即数 3。两端约定用这个数标识 slot3。'),
    readLocalTx,
    transfer('载荷与立即数随同一条请求到达 B',
      '4 KiB 是应用载荷，立即数 3 在传输头中。用多个包传这条写请求时，最后一包携带立即数。',
      'wire', 'forward', 'data'),
    transfer('载荷按远端地址写入 slot3',
      'B 端 RNIC 校验远端写权限和地址范围，经 PCIe 把 4 KiB 写入 slot3。接收 WR 只用来收通知，无需为这 4 KiB 提供缓冲区。',
      'b', 'forward', 'data', { bMem: 'slot3 · 已写入 4 KiB' }),
    transfer('B 端 RNIC 向 CQ 写入 CQE',
      'B 端 RNIC 消耗一条接收 WQE，经 PCIe 将 CQE 写入主存中的 CQ。B 应用此时还没有轮询。',
      'b', 'forward', 'control', { rq: '接收 WQE 已消耗 · wr_id 7', bCq: 'CQE 已写入 · 待轮询' }),
    local('B 读立即数，A 可复用 TX',
      'B 应用轮询 CQ 得到 WC。wr_id 7 来自 B 预投的接收 WR，立即数 3 由 A 填写。B 据此读取 slot3。A 独立轮询自己的 CQ，取得成功的 WRITE WC 后就能复用 TX。',
      ['am', 'bm'], { sq: 'WR 已完成', aCq: '已取 WC · WRITE', bCq: '已取 WC · RECV_RDMA_WITH_IMM · wr_id 7 · imm 3' })
  ];

  const readStages = [
    local('READ 的起点', 'B 的 slot3 存着 4 KiB。A 已获得它的远端地址与 rkey，并准备了本地目标缓冲区 DST。', ['am', 'bm']),
    post('READ', 'A 应用在 READ WR 中指定远端源 slot3、本地目的 DST 和长度。'),
    transfer('A 向 B 请求读 slot3', 'READ 请求沿网络发往 B，带远端地址、rkey 和长度。4 KiB 内容此时还在 B 的内存中。', 'wire', 'forward', 'control'),
    transfer('B 端 RNIC 读取 slot3', 'B 端 RNIC 检查远端读权限和地址范围，再发起 DMA 读。4 KiB 载荷从 B 主存经 PCIe 进入 RNIC。', 'b', 'back', 'data'),
    transfer('4 KiB 数据从 B 返回 A', 'READ 响应沿反方向返回。发起请求的是 A，发送这 4 KiB 载荷的是 B。', 'wire', 'back', 'data'),
    transfer('A 端 RNIC 把响应写入 DST', 'A 端 RNIC 找到这条 READ WQE 指定的 DST，经 PCIe 把返回的数据写进去。', 'a', 'back', 'data', { aMem: 'DST · 4 KiB 已到' }),
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
      post(verb, 'A 应用在 WR 中填入 B 端计数器的远端地址、rkey、' + request + '，以及本地接收旧值的地址。'),
      transfer('A 把原子请求发往 B', '请求携带' + request + '。B 端 RNIC 检查远端原子访问权限，定位到目标 64 位字。', 'wire', 'forward', 'control'),
      local('B 端执行原子操作', apply + ' 图上标出这个 64 位字的变化，具体怎样访问内存由硬件实现决定。', ['bn', 'bm'], { bMem: 'counter = ' + after }),
      transfer('B 向 A 返回旧值 41', '响应中的 8 字节是操作前读到的值。' + (variant === 'miss' ? 'CAS 比较未命中时也返回 41。' : 'B 端存放的值此时为 ' + after + '。'), 'wire', 'back', 'data'),
      transfer('A 端 RNIC 写入旧值', '返回值通过 A 端 PCIe 写入本地结果缓冲区，B 的计数器保持当前值。', 'a', 'back', 'data', { aMem: 'result = 41' }),
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
      initial: { aMem: 'TX · 4 KiB', bMem: 'RX7 · 空', rq: '接收 WR 已投递 · RX7', bCq: '等待接收 CQE' },
      stages: pushStages(true)
    },
    write: { request: writeRequest, initial: { aMem: 'TX · 4 KiB', bMem: 'slot3 · 待写' }, stages: pushStages(false) },
    writeImm: {
      request: { ...writeRequest, opcode: 'IBV_WR_RDMA_WRITE_WITH_IMM', receive: '1 条 · wr_id 为 7，用于接收通知', extraLabel: 'A 的立即数', extra: '3（32 位，双方约定为槽号）' },
      initial: { aMem: 'TX · 4 KiB', bMem: 'slot3 · 待写', rq: '接收 WR 已投递 · wr_id 7', bCq: '等待接收 CQE' },
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
    const state = { sq: 'WR 尚未提交', aCq: '尚无本次 CQE', rq: '本次未使用', bCq: '本次无 CQE', ...activeMode.initial };
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
