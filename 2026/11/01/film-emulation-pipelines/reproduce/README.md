# 图表复算说明

运行环境需要 Python 3、NumPy、Matplotlib；图中文字使用支持中文的字体。
请在完整资料包目录结构下运行，脚本会读取 `../data` 并写入 `../assets`。

```bash
python3 reproduce/make_figures.py --font /absolute/path/NotoSansCJKsc-Regular.otf
```

没有指定字体时，脚本使用 Matplotlib 默认字体，可能无法显示中文，因此建议明确指定 `--font`。字体文件不随包分发。

六张图分别为：管线分类、Kodak PGI、spektrafilm材料曲线、理想多帧噪声、处理顺序、LUT存储。
其中三张是公式计算，一张是技术位置整理，两张来自明确标注的厂家/开放模型数据。
运行图表脚本不会下载或重新渲染任何产品照片，也不是应用性能测试。

## 数据口径

- SNR 为信号与噪声标准差之比，dB采用 `20 log10(SNR倍数)`；固定每帧曝光，不固定总时间。
- 相关噪声示例假设任意两帧相关系数均为0.1；不是对某个产品的测量。
- PGI的`<25`保留为范围值；PGI不是比例量表。
- 材料曲线是项目处理后的Profile，非本报告实测；各材料标度独立。
- LUT内存是每节点3个float32的理论值，不含额外实现开销，不等于速度。

来源编号对应正文和 `data/sources.csv`。Profile衍生图表遵循所附CC BY-SA 4.0许可和署名。
