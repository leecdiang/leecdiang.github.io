#!/usr/bin/env python3
"""Reproduce the article's analytical figures. No benchmark data or network access.

Visual constants reuse the author's GEMM_Languages_to_Architecture_Blog renderer.
PNG figures use its paper palette; inline SVGs use the existing blog theme tokens.
Run with Python 3, NumPy and Matplotlib. All sizes in formulas are bytes.
"""
from pathlib import Path
import csv
import json
import re
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, FancyArrowPatch

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
OUT = ASSET / "images"
DATA = ASSET / "data"
SVG = ROOT / "source/_visuals/inference"
for p in (OUT, DATA, SVG):
    p.mkdir(parents=True, exist_ok=True)

BLUE, GREEN, AMBER = "#2e6489", "#258875", "#cb8f3b"
GREY, NAVY, GRID, LIGHT = "#7c8993", "#23374b", "#dde6eb", "#eaf0f3"
RED = "#b54f52"
plt.rcParams.update({
    "figure.facecolor": "white", "axes.facecolor": "white", "savefig.facecolor": "white",
    "font.family": "DejaVu Sans", "font.size": 11, "axes.titlesize": 14,
    "axes.labelsize": 12, "axes.labelcolor": NAVY, "text.color": NAVY,
    "xtick.color": NAVY, "ytick.color": NAVY, "axes.edgecolor": GRID,
    "svg.fonttype": "none", "pdf.fonttype": 42, "axes.titleweight": "medium",
    "axes.spines.top": False, "axes.spines.right": False,
})
manifest = []

def csvout(name, header, rows):
    with (DATA / name).open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)

def save(fig, stem, description, provenance="Analytical illustration, not a benchmark."):
    fig.savefig(OUT / (stem + ".png"), dpi=200, bbox_inches="tight", pad_inches=.22)
    original = OUT / (stem + ".svg")
    fig.savefig(original, bbox_inches="tight", pad_inches=.22)
    s = original.read_text()
    s = re.sub(r'<\?xml[^>]*>\s*', "", s)
    s = re.sub(r'<!DOCTYPE[\s\S]*?>\s*', "", s)
    s = re.sub(r"<metadata>[\s\S]*?</metadata>", "", s)
    for old, new in {
        "#ffffff": "var(--surface-card)",
        BLUE: "var(--chart-blue)", GREEN: "var(--chart-teal)",
        AMBER: "var(--chart-amber)", RED: "var(--chart-red)",
        GREY: "var(--text-muted)", NAVY: "var(--text-primary)",
        GRID: "var(--divider)", LIGHT: "var(--surface-soft)",
        "#000000": "var(--text-primary)",
    }.items():
        s = s.replace(old, new)
    ids = re.findall(r'\bid="([^"]+)"', s)
    for old in ids:
        s = s.replace('id="' + old + '"', 'id="' + stem + "-" + old + '"')
        s = s.replace("url(#" + old + ")", "url(#" + stem + "-" + old + ")")
        s = s.replace('href="#' + old + '"', 'href="#' + stem + "-" + old + '"')
    s = s.replace("<svg ", '<svg role="img" aria-label="' + description + '" ', 1)
    s = re.sub(r">\s+<", "><", s)
    (SVG / (stem + ".svg")).write_text(s, encoding="utf-8")
    manifest.append({"id": stem, "description": description,
                     "type": "analytical" if "Analytical" in provenance else "schematic",
                     "provenance": provenance, "data_directory": "../data",
                     "png": "images/" + stem + ".png",
                     "svg": "source/_visuals/inference/" + stem + ".svg"})
    plt.close(fig)

def foot(fig, text):
    fig.text(.09, .025, text, fontsize=9.2, color=GREY, va="bottom")

def grid(ax):
    ax.grid(axis="both", color=GRID, lw=.7, zorder=0)
    ax.set_axisbelow(True)

def node(ax, xy, w, h, title, detail="", color=BLUE):
    x,y = xy
    ax.add_patch(FancyBboxPatch((x,y), w,h, boxstyle="round,pad=0.02,rounding_size=0.08",
                               fc=LIGHT, ec=color, lw=1.35))
    ax.text(x+w/2, y+h*.65 if detail else y+h/2, title, ha="center", va="center",
            fontsize=12, color=NAVY, weight="medium")
    if detail:
        ax.text(x+w/2, y+h*.28, detail, ha="center", va="center", fontsize=9.8, color=GREY)

def arrow(ax, start, end, color=GREY, style="-|>", rad=0):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle=style, mutation_scale=12,
                                lw=1.5, color=color,
                                connectionstyle="arc3,rad="+str(rad)))

# 01: A request has one prefill and a dependent decode loop.
fig,ax=plt.subplots(figsize=(11.6,6.0))
ax.set(xlim=(0,11.6),ylim=(0,6));ax.axis("off")
ax.text(.2,5.65,"A request: known prompt tokens, then dependent output tokens",fontsize=15)
node(ax,(.3,3.85),2.1,1.0,"Chat template","text + roles + tool schema")
node(ax,(3.0,3.85),2.1,1.0,"Tokenizer","a sequence of token IDs")
node(ax,(5.7,3.85),2.5,1.0,"Prefill","all prompt positions")
node(ax,(8.8,3.85),2.3,1.0,"First token","sample from final logits",GREEN)
for a,b in [((2.4,4.35),(3,4.35)),((5.1,4.35),(5.7,4.35)),((8.2,4.35),(8.8,4.35))]:
    arrow(ax,a,b)
node(ax,(5.7,1.5),2.5,1.15,"Decode one token","query cached K/V; run FFN")
node(ax,(8.8,1.5),2.3,1.15,"Next token","sample / check stop",GREEN)
node(ax,(2.5,1.5),2.3,1.15,"KV cache","per layer, per sequence",AMBER)
arrow(ax,(6.95,3.85),(4.1,2.65),AMBER)
ax.text(4.75,3.18,"store prompt K/V",fontsize=10,color=GREY,ha="center")
arrow(ax,(9.95,3.85),(7.7,2.65))
arrow(ax,(4.8,2.07),(5.7,2.07),AMBER,style="<->")
arrow(ax,(8.2,2.07),(8.8,2.07))
arrow(ax,(9.65,1.5),(7.3,1.5),GREEN,rad=-.55)
ax.text(8.55,.57,"feed sampled token into the next step",ha="center",fontsize=10,color=GREY)
ax.text(.3,.15,"Schematic for decoder-only autoregressive inference. The first output token comes from prefill logits.",
        fontsize=9.3,color=GREY)
save(fig,"fig01_request","自回归请求流程：提示预填充产生首个输出 token，随后逐 token 解码并复用 KV Cache。",
     "Mechanism schematic; not a timing trace.")

# 02: How many distinct experts does a batch touch?
b = np.arange(1,65)
experts, topk = 64, 8
touched = experts * (1 - (1-topk/experts)**b)
fig,ax=plt.subplots(figsize=(10.2,5.8))
ax.plot(b,touched,color=BLUE,lw=2.7,label="Expected distinct experts")
ax.axhline(experts,color=GREY,ls=":",lw=1.4,label="All 64 experts")
for x in [1,8,16,32]:
    y=float(touched[x-1]);ax.plot(x,y,"o",color=BLUE,ms=6)
    ax.annotate(f"B={x}: {y:.1f}",(x,y),xytext=(7,-19 if x>1 else 8),
                textcoords="offset points",fontsize=10)
ax.set(xlabel="Tokens routed in one batch, B",ylabel="Distinct experts touched",
       xlim=(0,65),ylim=(0,70))
ax.set_title("MoE: sparse per token, increasingly broad across a batch",loc="left",pad=15)
grid(ax);ax.legend(frameon=False,loc="lower right")
foot(fig,"One MoE layer: E=64 routed experts, k=8; independent tokens, uniform choices within each token.\n"
         "E[touched] = E × [1 − (1 − k/E)^B]. Real routers are neither uniform nor independent.")
fig.tight_layout(rect=[0,.105,1,1])
save(fig,"fig02_moe_coverage","均匀独立路由假设下，64 个专家中每 token 选择 8 个，批量增加会扩大专家覆盖范围。")
csvout("moe_coverage.csv",["batch_tokens","expected_distinct_experts"],zip(b,touched))

# 03: KV cache grows with actual cached length, not only the advertised maximum.
contexts=np.array([1024,2048,4096,8192,16384,32768,65536])
fig,ax=plt.subplots(figsize=(10.2,5.9))
rows=[]
for hk,label,c,ls,marker in [(32,"MHA: 32 KV heads",BLUE,"-","o"),
                            (8,"GQA: 8 KV heads",GREEN,"--","s"),
                            (1,"MQA: 1 KV head",AMBER,":","^")]:
    gib=2*32*contexts*hk*128*2/(2**30)
    ax.plot(contexts,gib,color=c,ls=ls,marker=marker,lw=2.3,ms=6,label=label)
    rows += [(int(s),hk,float(m)) for s,m in zip(contexts,gib)]
ax.set_xscale("log",base=2);ax.set_yscale("log",base=2)
ax.set_xticks(contexts,["1k","2k","4k","8k","16k","32k","64k"])
ax.set_yticks([.015625,.0625,.25,1,4,16,32],["1/64","1/16","1/4","1","4","16","32"])
ax.set(xlabel="Cached context length S [tokens; k = 1024]",ylabel="KV cache per sequence [GiB]")
grid(ax);ax.legend(frameon=False,loc="upper left")
ax.set_title("KV cache: fewer KV heads reduce storage",loc="left",pad=15)
foot(fig,"Formula only: L=32 layers, head dimension=128, K and V both BF16 (2 bytes), B=1.\n"
         "Excludes allocator overhead, padding and runtime buffers. Does not describe MLA or recurrent state.")
fig.tight_layout(rect=[0,.105,1,1])
save(fig,"fig03_kv_memory","32 层、128 维、BF16 条件下，MHA、GQA、MQA 每序列 KV 内存随上下文长度变化。")
csvout("kv_memory.csv",["context_tokens","kv_heads","kv_gib_per_sequence"],rows)

# 04: Roofline of large linear operators; not a prediction for the entire model.
I=np.geomspace(.25,1024,600);bw=600;peak=80
fig,ax=plt.subplots(figsize=(10.2,5.9))
ax.plot(I,np.minimum(peak,bw*I/1000),color=BLUE,lw=3,label="Roofline for assumed hardware")
ax.axhline(peak,color=GREY,ls=":",lw=1.1)
ax.axvline(peak*1000/bw,color=GREY,ls=":",lw=1.1)
for x,label in [(4,"B=1"),(32,"B=8"),(128,"B=32"),(512,"B=128")]:
    y=min(peak,bw*x/1000);ax.scatter([x],[y],s=48,color=GREEN,zorder=4)
    ax.annotate(label,(x,y),xytext=(6,-19),textcoords="offset points",fontsize=10)
ax.text(3,65,"80 TFLOP/s assumed compute ceiling",color=GREY,fontsize=10)
ax.set(xscale="log",yscale="log",xlabel="Operational intensity I [FLOP / byte]",
       ylabel="Linear-operator performance [TFLOP/s]",xlim=(.5,1024),ylim=(.2,140))
grid(ax);ax.set_title("Roofline: batching can reuse each weight for more tokens",loc="left",pad=15)
foot(fig,"Illustration: effective bandwidth 600 GB/s; effective compute 80 TFLOP/s.\n"
         "Markers use I ≈ 2B/b, b=0.5 byte/weight. KV traffic, activation traffic and dequantization are omitted.")
fig.tight_layout(rect=[0,.105,1,1])
save(fig,"fig04_roofline","假设有效带宽 600 GB/s、有效算力 80 TFLOP/s，线性层权重复用使算术强度随批量增加。")
csvout("roofline.csv",["intensity_flop_per_byte","performance_tflop_s"],zip(I,np.minimum(peak,bw*I/1000)))

# 05: Aggregate throughput and per-sequence decode speed are different quantities.
b=np.arange(1,129,dtype=float);rows=[]
fig,axes=plt.subplots(1,2,figsize=(12.1,5.6))
for S,label,c,ls in [(128,"128-token context",BLUE,"-"),(2048,"2k-token context",GREEN,"--"),
                     (16384,"16k-token context",AMBER,":")]:
    kv=2*32*S*8*128*2
    mem=(4e9+b*kv)/600e9
    comp=b*16e9/80e12
    step=np.maximum(mem,comp)+.0002
    agg=b/step;each=1/step
    axes[0].plot(b,agg,color=c,ls=ls,lw=2.4,label=label)
    axes[1].plot(b,each,color=c,ls=ls,lw=2.4,label=label)
    rows += [(int(B),S,float(t),float(a),float(e)) for B,t,a,e in zip(b,step,agg,each)]
for ax in axes:
    ax.set_xlabel("Active decode sequences B");grid(ax);ax.set_xlim(1,128)
axes[0].set_ylabel("Aggregate output throughput [tokens/s]")
axes[1].set_ylabel("Output rate per sequence [tokens/s]")
axes[0].set_title("More outputs per step",loc="left")
axes[1].set_title("A longer step for each user",loc="left")
axes[1].legend(frameon=False,fontsize=9.2,loc="upper right")
foot(fig,"Toy model: W=4 GB; linear work=16 GFLOP/token; L=32, Hkv=8, dh=128, BF16 KV. Capacity is unconstrained.\n"
         "tstep = max[(W + B·KV)/600 GB/s, B·16 GFLOP / 80 TFLOP/s] + 0.2 ms. Attention FLOPs and queueing omitted.")
fig.tight_layout(rect=[0,.13,1,1])
save(fig,"fig05_batching","同一简化模型下，总输出吞吐随批量增加，而每条序列的解码速率下降；长上下文进一步增加 KV 读取。")
csvout("batching.csv",["batch_sequences","context_tokens","step_seconds","aggregate_tps","per_sequence_tps"],rows)

# 06: A speculative block is useful only if saved target steps cover its costs.
alpha=np.linspace(0,1,101);rows=[]
fig,ax=plt.subplots(figsize=(10.2,5.9))
for k,c,ls in [(2,BLUE,"-"),(4,GREEN,"--"),(8,AMBER,":"),(12,RED,"-.")]:
    emitted=sum(alpha**j for j in range(k+1))
    ratio=emitted/(1+.12*k)
    ax.plot(alpha,ratio,lw=2.3,color=c,ls=ls,label=f"K={k} draft tokens")
    rows += [(float(a),k,float(e),float(s)) for a,e,s in zip(alpha,emitted,ratio)]
ax.axhline(1,color=GREY,lw=1.2,ls="--")
ax.set(xlabel="Conditional acceptance probability α [toy constant]",ylabel="Predicted speedup over baseline",
       xlim=(0,1),ylim=(0,5.8))
ax.set_title("Speculation: a longer draft is not automatically a faster draft",loc="left",pad=15)
grid(ax);ax.legend(frameon=False,loc="upper left")
foot(fig,"Analytical example: baseline target step 10 ms; draft 0.8 ms/token; verification 10 + 0.4K ms.\n"
         "Expected committed tokens = 1 + α + … + α^K; no EOS, constant conditional acceptance, serial draft + verify.")
fig.tight_layout(rect=[0,.105,1,1])
save(fig,"fig06_speculation","固定条件接受率和显式草稿与验证成本下，投机块长度与收益关系；曲线不是实测加速。")
csvout("speculation.csv",["conditional_acceptance","draft_length","expected_committed_tokens","speedup"],rows)

# 07: Transfer budgets use bits/s on the wire and bytes in a cache.
S=np.array([1024,2048,4096,8192,16384,32768,65536]);rows=[]
fig,ax=plt.subplots(figsize=(10.2,5.9))
for rate,c,ls in [(100,AMBER,":"),(200,GREEN,"--"),(400,BLUE,"-")]:
    size=2*32*S*8*128*2
    ms=size/(rate*1e9/8)*1000
    ax.plot(S,ms,color=c,ls=ls,marker="o",ms=5,lw=2.3,label=f"{rate} Gb/s link")
    rows += [(int(s),rate,int(v),float(t)) for s,v,t in zip(S,size,ms)]
ax.set_xscale("log",base=2);ax.set_yscale("log",base=2)
ax.set_xticks(S,["1k","2k","4k","8k","16k","32k","64k"])
ax.set(xlabel="Cached context length S [tokens; k = 1024]",ylabel="Ideal one-way KV transfer [ms]")
grid(ax);ax.legend(frameon=False,loc="upper left")
ax.set_title("Prefill / decode transfer: the KV cache is a real network payload",loc="left",pad=15)
foot(fig,"Wire-rate lower bound for one sequence: L=32, Hkv=8, dh=128, BF16 K/V. 32k context = 4 GiB.\n"
         "Excludes protocol overhead, competing traffic, source/destination copies, cache format conversion and queueing.")
fig.tight_layout(rect=[0,.105,1,1])
save(fig,"fig07_kv_transfer","同一 GQA 模型的 KV 交接，在 100、200、400 Gb/s 链路下的单向线速传输下界。")
csvout("kv_transfer.csv",["context_tokens","link_gbit_s","kv_bytes","ideal_transfer_ms"],rows)

# 08: Distinguish replica, tensor, pipeline and expert partitioning.
fig,axes=plt.subplots(2,2,figsize=(12.0,8.1))
for ax in axes.flat:
    ax.set(xlim=(0,6),ylim=(0,4));ax.axis("off")
ax=axes[0,0];ax.text(.1,3.65,"Data parallelism: different requests",fontsize=13,weight="medium")
node(ax,(.25,2),1.45,.8,"Request A",color=BLUE)
node(ax,(.25,.55),1.45,.8,"Request B",color=GREEN)
node(ax,(2.5,2),3,.8,"Complete model replica 1")
node(ax,(2.5,.55),3,.8,"Complete model replica 2",color=GREEN)
arrow(ax,(1.7,2.4),(2.5,2.4));arrow(ax,(1.7,.95),(2.5,.95))
ax=axes[0,1];ax.text(.1,3.65,"Tensor parallelism: split an operator",fontsize=13,weight="medium")
for x,t in [(0.3,"W shard 1"),(3.2,"W shard 2")]:node(ax,(x,2.0),2.4,.8,t)
node(ax,(1.55,.45),2.5,.8,"Collective result",color=AMBER)
arrow(ax,(1.5,2),(2.5,1.25));arrow(ax,(4.4,2),(3.1,1.25))
ax.text(3,3.1,"same token batch",ha="center",fontsize=10,color=GREY)
ax=axes[1,0];ax.text(.1,3.65,"Pipeline parallelism: split layers",fontsize=13,weight="medium")
node(ax,(.25,1.75),2.4,1,"GPU 0","layers 0 ... 15")
node(ax,(3.3,1.75),2.4,1,"GPU 1","layers 16 ... 31",GREEN)
arrow(ax,(2.65,2.25),(3.3,2.25))
ax.text(3,.7,"Independent microbatches can occupy different stages.\nOne token still follows its layer dependencies.",
        fontsize=10,color=GREY,ha="center")
ax=axes[1,1];ax.text(.1,3.65,"Expert parallelism: route activations",fontsize=13,weight="medium")
node(ax,(.15,1.6),1.45,.9,"Router")
node(ax,(2.05,2.4),1.75,.65,"Experts A",color=GREEN)
node(ax,(2.05,.7),1.75,.65,"Experts B",color=AMBER)
node(ax,(4.35,1.6),1.45,.9,"Combine")
for a,b in [((1.6,2.2),(2.05,2.7)),((1.6,1.9),(2.05,1.02)),
             ((3.8,2.7),(4.35,2.2)),((3.8,1.02),(4.35,1.9))]:arrow(ax,a,b)
fig.text(.06,.02,"Mechanism schematic. These dimensions can be combined; their communication patterns and capacity costs differ.",
         fontsize=10,color=GREY)
fig.tight_layout(rect=[0,.05,1,1],w_pad=2,h_pad=2)
save(fig,"fig08_parallelism","数据、张量、流水线和专家并行分割不同对象，通信与容量代价不同。",
     "Mechanism schematic; not a physical topology.")

# 09: A harness controls many model calls and tool actions.
fig,ax=plt.subplots(figsize=(11.6,5.7));ax.axis("off");ax.set(xlim=(0,11.6),ylim=(0,5.7))
ax.text(.2,5.35,"An agent task spans model calls, tools and persistent state",fontsize=15)
node(ax,(.3,3.4),2.7,1.0,"Agent harness","state / tools / context / checks")
node(ax,(4.1,3.4),2.7,1.0,"Inference server","queue / cache / scheduler")
node(ax,(8,3.4),3.0,1.0,"Device runtime","kernels / memory / collectives")
arrow(ax,(3,3.9),(4.1,3.9));arrow(ax,(6.8,3.9),(8,3.9))
arrow(ax,(8,3.45),(3,3.45),GREEN,rad=-.25)
ax.text(5.35,2.5,"tokens or a structured tool call",ha="center",color=GREY,fontsize=10)
node(ax,(.3,.75),2.7,1.0,"Tools / environment","search / shell / code / files",AMBER)
node(ax,(4.1,.75),2.7,1.0,"Task result","tests / success / cost",GREEN)
arrow(ax,(1.1,3.4),(1.1,1.75),AMBER);arrow(ax,(2.2,1.75),(2.2,3.4),AMBER)
arrow(ax,(3,1.25),(4.1,1.25),GREEN)
ax.text(8.9,1.25,"Token speed is one term\nin end-to-end task time.",
        ha="center",va="center",fontsize=12,color=GREY)
ax.text(.3,.17,"Schematic. Multiple calls and branches may overlap; the longest dependency path sets completion time.",
        fontsize=9.5,color=GREY)
save(fig,"fig09_harness","Agent harness 管理状态、工具和任务验收；推理服务器调度模型请求，设备运行时执行算子。",
     "Mechanism schematic; no measured durations.")

# 10: IO-aware attention, independently drawn from the mechanism, not paper artwork.
fig,ax=plt.subplots(figsize=(11.8,7.0))
ax.set(xlim=(0,11.8),ylim=(0,7));ax.axis("off")
ax.text(.25,6.65,"Prefill attention IO: avoid materializing the large intermediate matrix",fontsize=15)
ax.text(.25,5.95,"Materialized intermediates",fontsize=12.5,color=BLUE,weight="medium")
node(ax,(.35,4.35),2.2,1.15,"Q, K, V","read from HBM")
node(ax,(3.15,4.35),2.35,1.15,"Scores / softmax","large N × N arrays",AMBER)
node(ax,(6.1,4.35),2.15,1.15,"Read back","form weighted V",AMBER)
node(ax,(8.85,4.35),2.25,1.15,"Output","write to HBM",GREEN)
for a,b in [((2.55,4.92),(3.15,4.92)),((5.5,4.92),(6.1,4.92)),((8.25,4.92),(8.85,4.92))]:
    arrow(ax,a,b)
ax.text(5.65,3.92,"HBM writes + reads of intermediate attention matrices",ha="center",fontsize=10.5,color=GREY)
ax.axhline(3.45,xmin=.025,xmax=.95,color=GRID,lw=1.0)
ax.text(.25,2.95,"Tiled attention with online softmax",fontsize=12.5,color=GREEN,weight="medium")
node(ax,(.35,1.15),2.2,1.2,"Q, K, V tiles","read as needed")
node(ax,(3.15,1.05),4.95,1.4,"On-chip tile computation","update running softmax statistics + output",GREEN)
node(ax,(8.85,1.15),2.25,1.2,"Output","write to HBM",GREEN)
arrow(ax,(2.55,1.75),(3.15,1.75));arrow(ax,(8.1,1.75),(8.85,1.75))
arrow(ax,(6.8,1.05),(4.5,1.05),GREEN,rad=-.45)
ax.text(.35,.19,"N prompt positions. Not to scale; Q/K/V traffic and other costs remain. Based on the FlashAttention mechanism.",
        fontsize=9.6,color=GREY)
save(fig,"fig10_attention_io","Attention 访存示意：显式存取大注意力矩阵，与分块、在线 softmax 的片上处理进行对照。",
     "Original mechanism schematic based on FlashAttention (arXiv:2205.14135); no reproduced paper artwork.")

# 11: Separate logical block order, block table, and physical slots.
fig,ax=plt.subplots(figsize=(11.8,7.4))
ax.set(xlim=(0,11.8),ylim=(0,7.4));ax.axis("off")
ax.text(.25,7.05,"Paged KV: logical order does not require contiguous storage",fontsize=15)
ax.text(.35,6.4,"Logical blocks",fontsize=12.5,weight="medium")
ax.text(4.3,6.4,"Block table",fontsize=12.5,weight="medium")
ax.text(7.8,6.4,"Physical KV slots",fontsize=12.5,weight="medium")
for label,y,color,count in [("Request A",4.45,BLUE,3),("Request B",2.35,GREEN,2)]:
    ax.text(.35,y+1.1,label,fontsize=12,color=color,weight="medium")
    for j in range(count):
        x=.35+j*.91
        ax.add_patch(FancyBboxPatch((x,y),.78,.8,boxstyle="round,pad=.02,rounding_size=.05",fc=LIGHT,ec=color,lw=1.4))
        ax.text(x+.39,y+.4,str(j),ha="center",va="center",fontsize=12,color=color)
    arrow(ax,(3.2,y+.4),(4.0,y+.4),color)
node(ax,(4.05,4.35),2.5,1.0,"A: 0→5, 1→1, 2→7","logical → physical",BLUE)
node(ax,(4.05,2.25),2.5,1.0,"B: 0→3, 1→0","logical → physical",GREEN)
arrow(ax,(6.55,4.85),(7.4,4.85),BLUE)
arrow(ax,(6.55,2.75),(7.4,2.75),GREEN)
owners={0:("B1",GREEN),1:("A1",BLUE),3:("B0",GREEN),5:("A0",BLUE),7:("A2",BLUE)}
for i in range(8):
    row,col=divmod(i,2);x=7.65+col*1.75;y=5.1-row*1.12
    label,color=owners.get(i,("free",GREY))
    ax.add_patch(FancyBboxPatch((x,y),1.5,.9,boxstyle="round,pad=.02,rounding_size=.05",fc=LIGHT,ec=color,lw=1.4))
    ax.text(x+.75,y+.62,f"slot {i}",ha="center",va="center",fontsize=10,color=GREY)
    ax.text(x+.75,y+.27,label,ha="center",va="center",fontsize=11.5,color=color,weight="medium")
ax.text(.35,.87,"A grows → allocate a free slot → append its slot ID to A's block table",fontsize=11.3,color=NAVY)
ax.text(.35,.25,"Illustration of block mapping only. Real implementations also manage block sizes, sharing, metadata and reclamation.",
        fontsize=9.6,color=GREY)
save(fig,"fig11_paged_kv","Paged KV 的逻辑块、块表与非连续物理块示意；两条请求按需使用空闲块。",
     "Original mechanism schematic based on PagedAttention (arXiv:2309.06180); no reproduced paper artwork.")

(DATA/"figure_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"figures":len(manifest),"png_directory":str(OUT),"theme_svg_directory":str(SVG)},ensure_ascii=False))
