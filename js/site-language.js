/* UI translations only. Article content, titles, excerpts and TOC headings are excluded. */
(() => {
  const pairs = [
    ['查看研究图大图','View full-size research figure'],['查看大图 ↗','Enlarge ↗'],
    ['ASV 附录散点图：直接增益与生成视图增益','ASV appendix scatter plot: direct gain versus generated-view gain'],
    ['直接增益与生成视图增益','Direct gain vs. generated-view gain'],
    ['HeteroSpec 方法图：参考约束、独立归约与局部执行分组','HeteroSpec method: reference requirements, independent reductions and local execution groups'],
    ['保持参考数值行为的并行执行','Reference-compatible parallel execution'],
    ['Apple Health 导出数据转换工具，将 ZIP / XML 转为分类 CSV，支持来源与日期筛选、设备名隐藏及大文件分卷。','A cross-platform tool that converts Apple Health ZIP / XML exports into categorized CSV files, with source and date filters, device-name masking and large-file splitting.'],
    ['欢迎','歡迎'],['继续阅读 »','Read more »'],['数码剖面','Digital Anatomy'],['探索逻辑起点 ➔','Explore circuits ➔'],['我的帧空间 ➔','View photography ➔'],['深度解构报告 ➔','View technology reports ➔'],['暂无解构报告，实验室设备正在调试中...','No reports yet.'],['暂无影像记录，静请期待。','No photographs yet.'],['从逻辑门到硅基架构：我的硬核探索路线图 正在流片中...','Notes on logic gates and silicon architecture are in progress.'],['返回首页','Back Home'],['最新文章','Latest article'],['页面未找到','Page not found'],['页面恢复入口','Page recovery links'],['这个地址没有对应页面。可以回首页，或到文章列表继续查找。','There is no page at this address. Visit the homepage or browse the article archive.'],['浏览全部文章','Browse all articles'],['查看大图 ↗','View full size ↗'],['本文作者:','Author:'],['本文链接:','Permalink:'],['版权声明:','License:'],['本博客所有文章除特别声明外，均采用','Unless otherwise stated, articles on this blog are licensed under'],['许可协议。转载请注明出处！','Please credit the source when republishing.'],
    ['跳到正文','Skip to content'],['LEEcDiang 首页','LEEcDiang home'],['主导航','Main navigation'],['首页入口','Homepage navigation'],
    ['你好，我是',"Hi, I’m"],['在电子科技大学学习微电子，','I study microelectronics at UESTC,'],['也用照片和文字，记录生活。','and document life through photos and writing.'],
    ['暖色餐厅里的童年照片，坐在餐桌前看向镜头','A childhood photograph at a restaurant table'],
    ['访客位置','Visitor locations'],['查看访客位置统计（在新窗口打开）','View visitor statistics (opens in a new tab)'],['访客来源的世界地图','World map of visitor locations'],
    ['关于','About'],['文章','Writing'],['文章列表','Articles'],['摄影','Photography'],['摄影画廊','Photography'],['链接','Links'],['邮箱 ↗','Email ↗'],['邮箱','Email'],
    ['分类','Categories'],['标签','Tags'],['标签','tags'],['全部','All'],['技术与研究','Technology & research'],['日常与实践','Everyday & practice'],['影像与旅行','Photography & travel'],['其他','Other'],
    ['硅与电路','Silicon & Circuits'],['日常剖面','Everyday Anatomy'],['影像叙事','Visual Narrative'],['AI 基础设施','AI Infrastructure'],['AI 研究','AI Research'],['计算机体系结构','Computer architecture'],
    ['所有分类 ↗','All categories ↗'],['按分类浏览文章 ↗','Browse by category ↗'],['按主题筛选文章','Filter articles by topic'],['查找文章','Search articles'],['清除筛选','Clear filters'],['没有匹配文章，可更换关键词或清除筛选。','No articles found. Try another keyword or clear the filters.'],
    ['← 文章','← Articles'],['文章导航','Article navigation'],['文章目录','On this page'],['回到文章开头 ↑','Back to top ↑'],['LEEcDiang 的头像','LEEcDiang’s avatar'],['复制代码','Copy code'],['代码已复制','Code copied'],['复制失败，请手动选择代码复制。','Copy failed. Select and copy the code manually.'],['外部文章','External article'],['上一页','Previous'],['下一页','Next'],
    ['个人资料','Profile'],['雪地里戴着墨镜的 LEEcDiang','LEEcDiang wearing sunglasses in the snow'],['电子科技大学','University of Electronic Science and Technology of China'],['微电子科学与工程','Microelectronics Science and Engineering'],['关于页目录','About page navigation'],['教育','Education'],['经历','Experience'],['研究','Research'],['项目','Projects'],['关于网站','About this site'],
    ['电子科技大学校徽','UESTC crest'],['微电子科学与工程 · 本科','B.Eng. in Microelectronics Science and Engineering'],['关注数字 IC 前端设计、CPU / GPU 体系结构，以及连接芯片与软件工具的系统。','My interests include digital IC front-end design, CPU / GPU architecture, and systems connecting chips with software tools.'],
    ['沐创 MUCSE 标志','MUCSE logo'],['无锡沐创集成电路设计有限公司','Wuxi Micro Innovation Integrated Circuit Design Co., Ltd.'],['2026.06 至今','Jun 2026 – Present'],['IC 硬件实习生','IC Hardware Intern'],['参与 400G RDMA 网卡的 RTL 开发、数据通路调试与板级验证。','Contributing to RTL development, datapath debugging and board-level validation for a 400G RDMA NIC.'],
    ['电子科技大学 Fury 方程式车队','UESTC Fury Formula Student Electric Team'],['机械与悬架开发、电气集成','Mechanical / suspension development and electrical integration'],['参与悬架设计、运动学仿真、赛车制造与测试，以及 PCB / STM32 集成。','Worked on suspension design, kinematic simulation, fabrication, vehicle testing and PCB / STM32 integration.'],['Fury 名称，待补官方标志','Fury name; official logo pending'],
    ['尘摄影工作室','Ash Studio'],['社长','President'],['组织摄影团队与校园影像项目，负责拍摄协作与团队管理。','Led the photography team and campus media projects, coordinating shoots and team activities.'],['Ash Studio 名称，待补官方标志','Ash Studio name; official logo pending'],
    ['共同第一作者 · Poster','Co-first author · Poster'],['研究同一个智能体步骤在不同评估通道下，为什么会得到方向相反的奖励判断。','Studying why the same agent step can receive reward judgments with opposite signs across evaluation channels.'],['阅读研究介绍','Research overview'],['研究量化语言模型并行执行的数值一致性，以及 CUDA / Vulkan 上执行布局与完整服务开销的关系。','Studying numerical compatibility in parallel execution of quantized language models, and execution layouts and complete-service cost on CUDA / Vulkan.'],
    ['面向 Apple Silicon 的 macOS 遥测与持续负载测试工具，记录温度、功耗、频率与 CPU / GPU 负载变化。','A macOS telemetry and sustained-load testing tool for Apple Silicon, tracking temperature, power, frequency and CPU / GPU load.'],['开发记录','Development notes'],['macOS / Swift / 触控板手势','macOS / Swift / Trackpad gestures'],['用触控板边缘手势调节音量与亮度，结合触觉反馈，并通过手势状态机减少误触。','Adjust volume and brightness with trackpad edge gestures, haptic feedback and a gesture state machine that reduces accidental input.'],
    ['在数字系统里，时钟定义节奏、顺序与同步。这个网站记录时钟两侧的事：电路与计算、日常工具，以及摄影和旅行。','In digital systems, clocks define timing, order and synchronization. This site covers both sides of that clock: circuits and computing, everyday tools, photography and travel.'],
    ['一些同行的人，和一些值得反复拜访的地方。','People I follow, and places I return to.'],['朋友的网站','Friends’ websites'],['唐浩天的博客',"Tang Haotian’s blog"],['启发我搭建个人博客的人。','The person who inspired me to start a blog.'],['慕尼黑方脸的博客',"Munich Fanglian’s blog"],['全欧洲最能串的人。','An unrivalled troll, anywhere in Europe.'],['用数据看市场，也记录研究过程。','Exploring markets through data and documenting the research.'],['资料与工具','Resources & tools'],['物种保护状况与评估资料','Species conservation status and assessments'],['AI 加速器规格对照','Compare AI accelerator specifications'],['欢迎交换链接：','For link exchanges:'],
    ['按分类浏览文章：硅与电路、日常剖面、影像叙事。','Browse articles grouped by category: Silicon & Circuits, Everyday Anatomy, Visual Narrative — tracing systems inside and beyond the clock.'],
    ['按标签浏览文章：芯片设计、分布式训练、RDMA、AI 基础设施、摄影等。','Explore articles by topic tag — silicon design, distributed training, RDMA, AI infrastructure, photography, and more.'],
    ['切换到浅色主题','Switch to light theme'],['切换到深色主题','Switch to dark theme'],['切换深浅色主题','Toggle color theme'],
    ['个人博客','Personal blog'],['以太网','Ethernet'],['分布式训练','Distributed training'],['动力性能','Vehicle performance'],['发动机','Engines'],['可编程网络','Programmable networks'],['可靠性','Reliability'],['国产芯片','Chinese chips'],['宝丽来','Polaroid'],['容错','Fault tolerance'],['工作流','Workflows'],['工程分析','Engineering analysis'],['工程实践','Engineering practice'],['开源','Open source'],['思考','Reflections'],['性能优化','Performance optimization'],['扩容','Capacity upgrades'],['拥塞控制','Congestion control'],['指令集','Instruction sets'],['振动与噪声','Vibration & noise'],['摩托车','Motorcycles'],['数据中心网络','Data center networks'],['数据处理','Data processing'],['旅行','Travel'],['智算网络','AI computing networks'],['智能网卡','Smart NICs'],['架构','Architecture'],['沐创','MUCSE'],['硬盘扩容','SSD upgrades'],['私有 API','Private APIs'],['网络拓扑','Network topology'],['网络流控','Network flow control'],['胶片','Film'],['胶片模拟','Film emulation'],['芯片设计','Chip design'],['苹果健康','Apple Health'],['西北','Northwest China'],['触控板','Trackpads'],['计算摄影','Computational photography'],['集合通信','Collective communication'],['青甘大环线','Qinghai–Gansu loop'],['项目复盘','Project retrospectives'],['AI集群','AI clusters']
  ];
  const dictionary = new Map();
  for (const [zh,en] of pairs) { dictionary.set(zh,{zh,en}); dictionary.set(en,{zh,en}); }
  let language = document.documentElement.dataset.language || 'zh';
  let manual = false;
  try { manual = ['zh','en'].includes(localStorage.getItem('leecdiang-language')); } catch {}
  const records = new WeakMap();
  const attributes = new WeakMap();
  const excluded = 'script,style,noscript,[translate="no"],[data-site-dynamic],article[itemtype="http://schema.org/Article"] .post-body,article[itemtype="http://schema.org/Article"] .post-title,article[itemtype="http://schema.org/Article"] .post-description,.post-link,.archive-copy,.cat-list-link,.cat-list-desc,.toc-scroll,.post-nav,.post-eof,.photo-series-item,.home-latest-title,.posts-collapse .post-title,#btc-orrery-modal,#btc-orrery-links-entry';
  function t(text) {
    const key=text.trim();
    const pair=dictionary.get(key);
    if(pair)return text.replace(key,pair[language]);
    if(key.startsWith('Category: '))return (language==='zh'?'分类：':'Category: ')+t(key.slice(10));
    if(key.startsWith('Tag: '))return (language==='zh'?'标签：':'Tag: ')+t(key.slice(5));
    if(key.startsWith('# '))return '# '+t(key.slice(2));
    if(key.startsWith('More in '))return language==='zh'?'更多'+t(key.slice(8))+'文章':key;
    let m;
    if((m=key.match(/^(\d+) 篇文章$/)))return language==='en'?`${m[1]} articles`:key;
    if((m=key.match(/^(\d+) 篇$/)))return language==='en'?`${m[1]} articles`:key;
    if((m=key.match(/^找到 (\d+) 篇文章$/)))return language==='en'?`${m[1]} articles found`:key;
    if((m=key.match(/^(\d+) 组作品$/)))return language==='en'?`${m[1]} photo series`:key;
    if((m=key.match(/^(\d+) (categories|tags) in total$/)))return language==='zh'?`共 ${m[1]} 个${m[2]==='categories'?'分类':'标签'}`:key;
    if((m=key.match(/^([\d.]+) 发布$/)))return language==='en'?`Published ${m[1]}`:key;
    if((m=key.match(/^(\d{4})年(\d{2})月(\d{2})日$/)))return language==='en'?`${m[1]}-${m[2]}-${m[3]}`:key;
    return text;
  }
  function translateNode(node) {
    const value=node.nodeValue;
    let entry=records.get(node);
    if(!entry || value!==entry.last)entry={original:value};
    entry.last=t(entry.original);
    if(value!==entry.last)node.nodeValue=entry.last;
    records.set(node,entry);
  }
  function translateAttributes(el) {
    if(el.id==='language-mode'||el.id==='color-mode')return;
    const saved=attributes.get(el)||{};
    for(const key of ['aria-label','title','placeholder','alt'])if(el.hasAttribute(key)){
      const value=el.getAttribute(key);if(!saved[key]||value!==saved[key].last)saved[key]={original:value};
      saved[key].last=t(saved[key].original);
      if(value!==saved[key].last)el.setAttribute(key,saved[key].last);
    }
    attributes.set(el,saved);
  }
  function apply(root=document.body) {
    if(!root)return;
    // TreeWalker does not filter its root; also respect excluded ancestors of a partial root.
    if(root.nodeType!==1||!root.closest(excluded)){
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>{
        if(n.nodeType===1)return n.matches(excluded)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
        return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
      }});
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(node.nodeType===3)translateNode(node);
        else if(node.hasAttribute('aria-label')||node.hasAttribute('title')||node.hasAttribute('placeholder')||node.hasAttribute('alt'))translateAttributes(node);
      }
    }
    const button=document.getElementById('language-mode');
    if(button){
      const text=language==='zh'?'EN':'中';
      if(button.textContent!==text)button.textContent=text;
      const label=language==='zh'?'Switch to English':'切换为中文';
      for(const [key,value] of [['title',label],['aria-label',label],['lang',language==='zh'?'en':'zh-CN']])if(button.getAttribute(key)!==value)button.setAttribute(key,value);
    }
    if(!document.querySelector('main.post')){
      const title=originalTitle.split(' | ').map(t).join(' | ');
      if(document.title!==title)document.title=title;
    }
  }
  const originalTitle=document.title;
  function set(lang,persist=true){
    language=lang==='en'?'en':'zh';
    if(persist){manual=true;try{localStorage.setItem('leecdiang-language',language)}catch{}}
    if(document.documentElement.dataset.language!==language)document.documentElement.dataset.language=language;
    const htmlLang=language==='zh'?'zh-CN':'en';
    if(document.documentElement.lang!==htmlLang)document.documentElement.lang=htmlLang;
    apply();window.dispatchEvent(new CustomEvent('studio:language',{detail:{language}}));
  }
  window.StudioLanguage={get language(){return language},t,set,apply,searchTerms(text){let terms=text;for(const [zh,en] of pairs)if(text.includes(zh)||text.includes(en))terms+=' '+zh+' '+en;return terms}};
  window.addEventListener('storage',e=>{if(e.key==='leecdiang-language'){manual=['zh','en'].includes(e.newValue);set(manual?e.newValue:(/^zh\b/i.test(navigator.language)?'zh':'en'),false)}});
  window.addEventListener('languagechange',()=>{if(!manual)set(/^zh\b/i.test(navigator.language)?'zh':'en',false)});
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('language-mode')?.addEventListener('click',()=>set(language==='zh'?'en':'zh'));apply();});
})();
