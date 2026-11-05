# 图表与理论算例复现

这里没有硬件实测数据，也没有从论文提取的性能曲线。13 幅 SVG 均为本篇原创图稿；其中两幅曲线来自明确假设下的算术计算，其他为机制示意。

## 运行

从压缩包根目录执行（Python 3.10+，仅使用标准库）：

```bash
python3 source/_posts/flow-control-from-pfc-to-backpressure/reproduce/generate_figures.py
python3 source/_posts/flow-control-from-pfc-to-backpressure/reproduce/verify_models.py
```

生成器按脚本位置解析根目录，不依赖当前工作目录。保留本包的 `source/` 层次即可。生成器覆盖本篇的 13 幅 SVG、两份 CSV 和 `figure_manifest.json`，不会修改全站样式。

## 数据口径

| 文件 | 内容与单位 | 明确不包含的因素 |
| --- | --- | --- |
| `headroom_theory.csv` | 100/200/400/800 Gb/s；停止延迟 0–4 μs；字节数为 R×T，另列 KiB。共 324 行数据。 | 暂停生效前的排空、额外实现裕量、共享池多输入叠加。输入视为连续固定字节速率，不模拟链路报文开销。 |
| `credit_window_theory.csv` | 总循环额度 131072 B；反馈循环 0.05–8 μs；400 Gb/s 链路；列出原始 B/T 上界与线速封顶后上界。共 160 行数据。 | 处理、调度、报文开销、信用协议的具体分块与状态机；不是实际设备的预测模型。 |

GB/Gb 使用十进制，KiB = 1024 B。CSV 的零延迟只出现在 `H=R×T` 模型中；`B/T` 模型没有 T=0 行。

`verify_models.py` 核对 CSV 每行公式、文章算例和 ready/valid 采样表。它没有编译 SystemVerilog、运行 RTL 仿真或验证实际硬件接口。

## 编辑与使用

修改 `generate_figures.py` 后重新生成，不要手改输出 SVG。SVG 使用博客现有主题变量，适合通过 `visual_svg` 内联；单独作为没有主题 CSS 的外部图片打开，颜色未必符合预期。阅读时优先打开包根目录的 `preview.html`。

`figure_manifest.json` 标出每幅图的标题、视口和示意/理论类别。图 4 与图 9 的曲线同时使用颜色、标签与线型；没有把文献的历史性能结果画成当前产品的性能结论。
