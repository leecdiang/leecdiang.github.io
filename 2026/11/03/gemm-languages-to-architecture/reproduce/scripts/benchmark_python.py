"""FP64 matrix multiplication: Python scalar loop vs NumPy BLAS.

Usage:
    OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 OMP_NUM_THREADS=1 \
      VECLIB_MAXIMUM_THREADS=1 python scripts/benchmark_python.py
"""

import time
import statistics
import argparse
import json
import os
import platform
import sys
from contextlib import redirect_stdout
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("--n", type=int, default=128)
parser.add_argument("--repeats", type=int, default=5)
args = parser.parse_args()
N = args.n
if N < 1 or not 1 <= args.repeats <= 100:
    parser.error("N must be positive and repeats must be in [1,100]")
rng = np.random.default_rng(42)
A = rng.standard_normal((N, N)).astype(np.float64)
B = rng.standard_normal((N, N)).astype(np.float64)


def python_loop():
    C = np.zeros_like(A)
    for i in range(N):
        for j in range(N):
            acc = 0.0
            for k in range(N):
                acc += A[i, k] * B[k, j]
            C[i, j] = acc
    return C


def numpy_blas():
    return A @ B


def benchmark(fn, repeat):
    fn()
    samples = []
    for _ in range(repeat):
        t0 = time.perf_counter()
        fn()
        samples.append(time.perf_counter() - t0)
    return [sample * 1e3 for sample in samples]


if __name__ == '__main__':
    np.testing.assert_allclose(python_loop(), numpy_blas(), rtol=1e-10, atol=1e-10)
    thread_variables = ['OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS']
    print(json.dumps({'python': platform.python_version(), 'platform': platform.platform(), 'numpy': np.__version__, 'threads': {key: os.environ.get(key, 'not set') for key in thread_variables}}), file=sys.stderr)
    with redirect_stdout(sys.stderr):
        np.show_config()
    for name, fn in [('Python loop', python_loop), ('NumPy @', numpy_blas)]:
        samples = benchmark(fn, args.repeats)
        median = statistics.median(samples)
        q25, q75 = np.percentile(samples, [25, 75], method='linear')
        error = float(np.max(np.abs(fn() - numpy_blas())))
        print(json.dumps({'name': name, 'N': N, 'repeats': args.repeats,
            'samples_ms': samples, 'median_ms': median, 'iqr_ms': float(q75-q25),
            'min_ms': min(samples), 'max_ms': max(samples), 'best_ms': min(samples),
            'median_gflops': 2*N**3/median/1e6, 'max_abs_diff': error}))
