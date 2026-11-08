# 复现数值与图表

这里的曲线全部来自公式；没有将厂商峰值规格转换成设备跑分，也没有硬件实测数据。

## 生成图表

从素材包根目录执行：

```bash
python3 -m pip install -r source/_posts/llm-inference-from-token-to-cluster/reproduce/requirements.txt
python3 source/_posts/llm-inference-from-token-to-cluster/reproduce/make_figures.py
```

已使用 Python 3.12.14、NumPy 2.3.5、Matplotlib 3.10.8 运行。Matplotlib 自带 DejaVu Sans 用于图内英文标注；中文解释保留在正文图注。无需 GPU 或联网。

脚本生成 11 幅 PNG、11 幅普通 SVG、11 幅站点主题 SVG，以及 6 个 CSV。前两种写入同级 `images/`，CSV 写入 `data/`，主题 SVG 写入包根的 `source/_visuals/inference/`。

图形文件名是稳定标识，不代表正文最终图号。最终排序包含厂商图片与论文原图，见正文。

## 六组数值数据

| 文件 | 含义 | 主要边界 |
| --- | --- | --- |
| `moe_coverage.csv` | 某个假想 MoE 层的批量专家覆盖期望 | 均匀路由、token 之间独立；不是具体模型配置 |
| `kv_memory.csv` | MHA/GQA/MQA 的原始 KV 容量 | 普通全注意力，不套用于 MLA 的压缩布局 |
| `roofline.csv` | 假设带宽、算力下的线性算子上限 | 省略 KV、激活与反量化流量 |
| `batching.csv` | 每步时长、总吞吐和每序列速率 | 不施加容量上限；未计 attention FLOPs 与排队 |
| `speculation.csv` | 给定接受率与验证成本的投机加速比 | 恒定条件接受率、无提前结束、串行草稿与验证 |
| `kv_transfer.csv` | KV 经单条链路的理想传输预算 | 100% 标称带宽用于载荷，不是 TTFT 预测 |

`data/assumptions.json` 汇总单位与假设。交互页面使用相同的 batch 与 KV 公式；它独立包含必要的 JavaScript，不需要读取外部 JSON。

## 复现论文原图裁切（可选）

安装 `PyMuPDF` 后运行 `extract_paper_figures.py`。脚本读取 `data/image_sources.json` 中的固定论文版本、页码与裁切坐标，核验 PDF 的 SHA-256，按 3 倍比例渲染。网络下载的 PDF 只在内存中使用。两张图的原文标签和 caption 未改，署名与 CC BY 4.0 许可见 `ASSET_CREDITS.md`。

硬件图保留厂商下载文件的原始字节；下载页面、图片 URL、尺寸、日期与 SHA-256 也记录在 `data/image_sources.json`。它们没有开放许可的统一推定。
