---
layout: homepage
description: "Beyond the Clock is LEEcDiang's personal archive on microelectronics, computer architecture, digital tools, and visual narratives."
date: 2026-06-04 00:00:00
comments: false
---

<div class="btc-home">

<!-- ==================== ARCHIVE SECTIONS ==================== -->
<section class="btc-section btc-section--first">
  <h2 class="btc-section-title">Sections</h2>

  <div class="btc-archive-grid">
    <a href="/categories/Silicon-Circuits/" class="btc-archive-card">
      <div class="arc-num">01</div>
      <h3 class="arc-name">Silicon Systems</h3>
      <p class="arc-tagline">Microelectronics · Digital IC · Architecture</p>
      <p class="arc-desc">关于数字集成电路、CPU/GPU 架构、软硬件协同与硅基系统思考的长期记录。</p>
    </a>
    <a href="/categories/Digital-Anatomy/" class="btc-archive-card">
      <div class="arc-num">02</div>
      <h3 class="arc-name">Digital Anatomy</h3>
      <p class="arc-tagline">Tools · Data · Devices · Workflow</p>
      <p class="arc-desc">个人项目、数据处理管线、设备配置、效率工具与工作流。</p>
    </a>
    <a href="/categories/Visual-Narrative/" class="btc-archive-card">
      <div class="arc-num">03</div>
      <h3 class="arc-name">Visual Narrative</h3>
      <p class="arc-tagline">Photography · Design · Observations</p>
      <p class="arc-desc">摄影、设计、旅行见闻与视觉观察。</p>
    </a>
  </div>
</section>

<!-- ==================== FEATURED WORK ==================== -->
<section class="btc-section">
  <h2 class="btc-section-title">Featured Work</h2>
  <p class="btc-section-desc">Selected notes from silicon, tools, and visual systems.</p>

  <div class="btc-cards">
    <a href="/2026/04/05/Apple-Health-Pro/" class="btc-card">
      <span class="btc-card-kicker">Digital-Anatomy</span>
      <h3 class="btc-card-title">Apple Health Pro</h3>
      <p class="btc-card-desc">将 Apple Health 导出的 XML 数据转换为可分析的 CSV 格式，打通个人健康数据到 AI 训练的最后一步。</p>
      <span class="btc-card-date">2026-04</span>
    </a>
    <a href="/series/ai-interconnect/" class="btc-card">
      <span class="btc-card-kicker">AI–INFRASTRUCTURE</span>
      <h3 class="btc-card-title">智算互联</h3>
      <p class="btc-card-desc">从通信墙、可靠性重构到智算网卡芯片实现，理解 AI 集群中数据移动的底层博弈。</p>
      <span class="btc-card-date">2026–07</span>
    </a>
    <a href="/2026/06/11/not-an-agent-but-a-workflow/" class="btc-card">
      <span class="btc-card-kicker">Digital-Anatomy</span>
      <h3 class="btc-card-title">我搭的不是 Agent,而是一套工作方式</h3>
      <p class="btc-card-desc">关于 Main Agent、Code Lab、evidence 链、审批流,以及如何让一个不完美的模型参与长期任务。</p>
      <span class="btc-card-date">2026-06</span>
    </a>
  </div>
</section>

<!-- ==================== CURRENT FOCUS ==================== -->
<section class="btc-section">
  <h2 class="btc-section-title">Current Focus</h2>

  <p class="btc-focus-text">
    Currently building a personal archive around:<br>
    <strong>microelectronics, architecture, data tools, and visual systems.</strong>
  </p>

  <ul class="btc-focus-list">
    <li>Digital IC front-end learning</li>
    <li>CPU / GPU architecture notes</li>
    <li>Apple Health Pro data parser</li>
    <li>Personal blog system refinement</li>
    <li>Photography and visual archive</li>
  </ul>
</section>

<!-- ==================== ABOUT STRIP ==================== -->
<section class="btc-section btc-about">
  <p>
    <strong>LEEcDiang</strong><br>
    Microelectronics Student<br>
    Silicon Systems · Digital Tools · Visual Notes
  </p>
  <a href="/about/" class="btc-btn btc-btn-outline">More about me →</a>
</section>

</div>

<script>
(function() {
  var container = document.querySelector('.btc-cards');
  if (!container) return;
  var cards = Array.from(container.children);
  cards.sort(function(a, b) {
    var dateA = (a.querySelector('.btc-card-date') || {}).textContent || '';
    var dateB = (b.querySelector('.btc-card-date') || {}).textContent || '';
    var numA = parseInt(dateA.replace(/[\s–-]/g, ''), 10) || 0;
    var numB = parseInt(dateB.replace(/[\s–-]/g, ''), 10) || 0;
    return numB - numA;
  });
  cards.forEach(function(card) { container.appendChild(card); });
})();
</script>
