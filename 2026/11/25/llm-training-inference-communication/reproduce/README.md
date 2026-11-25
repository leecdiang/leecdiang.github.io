# 图表复算

在博客源码根目录运行以下命令。生成器只用 Python 标准库，推荐 Python 3.9 或更新版本。

    python3 source/_posts/llm-training-inference-communication/reproduce/compute_figures.py

脚本重建图 1、5、6，并写出三个 CSV 文件。图 2–4 描绘正文中的依赖、矩阵分片与路由布局，图 7 根据下表中的 KV 模型绘制。

| 文件 | 变量及口径 |
| --- | --- |
| ring-cost.csv | 单 rank 输入字节数。8 rank，每轮 2 µs，单向 50 GB/s；启动、传输及合计用 µs。 |
| tp-inference.csv | 本步 token 行数、每次 AllReduce 的单 rank 输入字节数、一次前向的层内归约总数。模型为 32 层，隐藏宽度 4096，BF16。 |
| kv-transfer.csv | 提示 token 数、逻辑 KV 字节数、等效链路的十进制 Gb/s、序列化时间 ms。逻辑缓存是每 token 128 KiB。 |

图 4 的均匀矩阵四行均为 [1, 1, 1, 1]。热点矩阵的四行依次是 [1, 1, 1, 1]、[3, 1, 0, 0]、[3, 0, 1, 0]、[3, 0, 0, 1]。两组矩阵的行和均为 [4, 4, 4, 4]。将对角线置零再按列求和，得到远端接收量 [3, 3, 3, 3] 与 [9, 1, 1, 1]。
