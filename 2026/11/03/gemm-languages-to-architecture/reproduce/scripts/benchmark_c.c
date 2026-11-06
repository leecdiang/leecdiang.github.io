// Compare i-j-k, i-k-j and blocked GEMM, row-major FP64 matrices.
// Example:
//   cc -O3 -march=native -std=c11 -D_POSIX_C_SOURCE=200809L \
//      scripts/benchmark_c.c -lm -o bench_c && ./bench_c
// Benchmarks and checks printed at runtime; nothing is hard-coded.
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifndef BENCH_CFLAGS
#define BENCH_CFLAGS "not recorded; define BENCH_CFLAGS when compiling"
#endif
static int repeats = 5;

static double seconds(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

static void matmul_ijk(int n, const double *restrict a, const double *restrict b,
                       double *restrict c) {
    for (int i = 0; i < n; ++i)
        for (int j = 0; j < n; ++j) {
            double sum = 0.0;
            for (int k = 0; k < n; ++k) sum += a[i*n+k] * b[k*n+j];
            c[i*n+j] = sum;
        }
}

static void matmul_ikj(int n, const double *restrict a, const double *restrict b,
                       double *restrict c) {
    memset(c, 0, (size_t)n*n*sizeof(double));
    for (int i = 0; i < n; ++i)
        for (int k = 0; k < n; ++k) {
            const double aik = a[i*n+k];
            for (int j = 0; j < n; ++j) c[i*n+j] += aik*b[k*n+j];
        }
}

static void matmul_blocked(int n, int t, const double *restrict a,
                           const double *restrict b, double *restrict c) {
    memset(c, 0, (size_t)n*n*sizeof(double));
    // Supports any n; a tail block may be smaller than t.
    for (int ii=0; ii<n; ii+=t)
        for (int kk=0; kk<n; kk+=t)
            for (int jj=0; jj<n; jj+=t)
                for (int i=ii; i<n && i<ii+t; ++i)
                    for (int k=kk; k<n && k<kk+t; ++k) {
                        double aik=a[i*n+k];
                        for (int j=jj; j<n && j<jj+t; ++j)
                            c[i*n+j] += aik*b[k*n+j];
                    }
}

static int compare_double(const void *a, const void *b) {
    double x=*(const double*)a, y=*(const double*)b;
    return (x>y)-(x<y);
}
// Linear interpolation at (count-1)*q, also used by the Python example.
static double quantile(const double *sorted, int count, double q) {
    double position=(count-1)*q;
    int low=(int)position, high=low+1<count?low+1:low;
    return sorted[low]+(sorted[high]-sorted[low])*(position-low);
}
static int benchmark(const char *name, int n,
                      void (*impl)(int,const double*,const double*,double*),
                      const double *a, const double *b, double *c,
                      const double *reference) {
    impl(n,a,b,c); // warm-up excluded from samples
    double samples[100], sorted[100];
    for (int r=0; r<repeats; ++r) {
        double begin=seconds();
        impl(n,a,b,c);
        samples[r]=sorted[r]=(seconds()-begin)*1e3;
    }
    qsort(sorted,repeats,sizeof(double),compare_double);
    double median=quantile(sorted,repeats,.5);
    double iqr=quantile(sorted,repeats,.75)-quantile(sorted,repeats,.25);
    double max_error=0.0;
    for (size_t i=0; i<(size_t)n*n; ++i) {
        double error=fabs(c[i]-reference[i]);
        if (!isfinite(error)) return 1;
        if (error>max_error) max_error=error;
    }
    printf("{\"name\":\"%s\",\"N\":%d,\"repeats\":%d,\"samples_ms\":[",name,n,repeats);
    for(int r=0;r<repeats;++r) printf("%s%.12g",r?",":"",samples[r]);
    printf("],\"median_ms\":%.12g,\"iqr_ms\":%.12g,\"min_ms\":%.12g,\"max_ms\":%.12g,\"best_ms\":%.12g,\"median_gflops\":%.12g,\"max_abs_diff\":%.12g}\n",
        median,iqr,sorted[0],sorted[repeats-1],sorted[0],2.0*n*n*n/median/1e6,max_error);
    return max_error>1e-10;
}

static int tile = 32;
static void blocked_wrapper(int n, const double *a,const double *b,double *c) {
    matmul_blocked(n,tile,a,b,c);
}

int main(int argc,char **argv) {
    int n = argc>1 ? atoi(argv[1]) : 256;
    if (n<1 || n>4096) { fprintf(stderr,"Expected N in [1,4096]\n"); return 2; }
    repeats=argc>2?atoi(argv[2]):5;
    if(repeats<1 || repeats>100){fprintf(stderr,"Expected repeats in [1,100]\n");return 2;}
    fprintf(stderr,"compiler=%s\nflags=%s\nthreads=1\nBLAS=none\n",__VERSION__,BENCH_CFLAGS);
    size_t len=(size_t)n*n;
    double *a=malloc(len*sizeof(double)),*b=malloc(len*sizeof(double));
    double *c=malloc(len*sizeof(double)),*reference=malloc(len*sizeof(double));
    if (!a || !b || !c || !reference) { fprintf(stderr,"Allocation failure\n"); return 1; }
    for (size_t p=0; p<len; ++p) {
        a[p] = ((double)((p*17u)%223u)-111.0)/223.0;
        b[p] = ((double)((p*37u)%241u)-120.0)/241.0;
    }
    matmul_ijk(n,a,b,reference);
    int failed=benchmark("ijk",n,matmul_ijk,a,b,c,reference);
    failed |= benchmark("ikj",n,matmul_ikj,a,b,c,reference);
    failed |= benchmark("blocked T32",n,blocked_wrapper,a,b,c,reference);
    free(a);free(b);free(c);free(reference);
    return failed?1:0;
}
