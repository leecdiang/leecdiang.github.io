# GEMM 示例

FP64、行主序。C 示例为单线程且不调用 BLAS，Python 同时包含标量循环与 NumPy BLAS。

两份脚本默认 5 次，预热不计时。JSONL 结果保存每次耗时（毫秒）以及 repeats、median_ms、iqr_ms、min_ms、max_ms、best_ms、median_gflops、max_abs_diff。IQR 使用排序后位置 (n−1)q 的线性插值。best_ms 为最小耗时，吞吐由中位耗时计算。矩阵初始化与正确性校验不计时；每次实现所需的结果数组初始化/分配计时。

```sh
python3 -m pip install -r requirements.txt
cc -O3 -march=native -std=c11 -D_POSIX_C_SOURCE=200809L \
  '-DBENCH_CFLAGS="-O3 -march=native -std=c11 -D_POSIX_C_SOURCE=200809L"' \
  scripts/benchmark_c.c -lm -o bench_c
./bench_c 128 5 > c-results.jsonl 2> c-environment.txt
OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 OMP_NUM_THREADS=1 \
VECLIB_MAXIMUM_THREADS=1 python3 scripts/benchmark_python.py --n 128 --repeats 5 \
  > python-results.jsonl 2> python-environment.txt
cc --version >> c-environment.txt
uname -a >> c-environment.txt
```

C 的第二个参数和 Python 的 --repeats 可调整重复次数（1–100）。C 参数 N=37 可检查非整块尺寸。Python 通过 assert_allclose 检查数值，C 校验不通过返回非零。跨机器、编译参数或 BLAS 环境的耗时不可直接混作语言优劣结论。
