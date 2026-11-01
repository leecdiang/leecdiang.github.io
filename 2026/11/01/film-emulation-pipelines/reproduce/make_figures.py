#!/usr/bin/env python3
"""Rebuild report figures from included source data.

Usage: python make_figures.py --font /path/to/NotoSansCJKsc-Regular.otf
Dependencies: Python 3, numpy, matplotlib. No network is used.
Photographs in assets/ are attributed source images and are not generated here.
"""
from pathlib import Path
import argparse, csv, json, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

parser=argparse.ArgumentParser()
parser.add_argument('--font')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'; DATA=ROOT/'data'
OUT.mkdir(exist_ok=True); DATA.mkdir(exist_ok=True)
if args.font:
    font_manager.fontManager.addfont(args.font)
    plt.rcParams['font.family']=font_manager.FontProperties(fname=args.font).get_name()
plt.rcParams.update({'font.size':11,'axes.titlesize':13,'axes.labelsize':11,
 'figure.facecolor':'#faf8f2','axes.facecolor':'#faf8f2','text.color':'#223338',
 'axes.labelcolor':'#223338','axes.edgecolor':'#889597','xtick.color':'#52666a',
 'ytick.color':'#52666a','axes.spines.top':False,'axes.spines.right':False,
 'axes.unicode_minus':False,'savefig.facecolor':'#faf8f2','legend.frameon':False})
TEAL='#287f84'; RUST='#b95739'; GOLD='#a98735'; GRAY='#647477'
COLORS=['#b64b41','#408969','#477fa6']

def save(fig,name):
    fig.savefig(OUT/name,dpi=190,bbox_inches='tight',pad_inches=.22)
    plt.close(fig)

def table(name,fields,rows):
    with (DATA/name).open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f);w.writerow(fields);w.writerows(rows)

# 1. A categorical route map: no product score is implied.
fig,ax=plt.subplots(figsize=(13,7.2));ax.set_xlim(0,13);ax.set_ylim(0,7.2);ax.axis('off')
fig.suptitle('先确定输入，再讨论胶片风格',fontsize=22,x=.065,ha='left',y=.98)
ax.text(.1,6.7,'不同路线控制管线的不同部分；方框表示功能位置，不表示画质等级。',fontsize=11,color=GRAY)
xs=[.1,3.4,6.7,10.0]; w=2.9; h=1.45
rows=[
 (4.75,['单帧 Bayer RAW\n传感器采样','RAW 显影\n白平衡 / 去马赛克','材质与色彩\n曲线 / 颗粒 / 光晕','输出\nSDR / HDR / 色域'],TEAL),
 (2.65,['多帧 RAW 采集\n曝光策略 / 时间采样','对齐融合与显影\nProRAW / Indigo','重新渲染或胶片风格\n可与上游组合','输出\nJPEG / HEIF 成片'],RUST),
 (.55,['已渲染照片\nJPEG / HEIF / TIFF','输入解释与基础校正\n色彩空间 / 现有影调','预设 / Profile / LUT\n插件或图层效果','输出\n尺寸 / 颗粒尺度 / 压缩'],GOLD)]
for y,labels,c in rows:
    for j,label in enumerate(labels):
        ax.add_patch(FancyBboxPatch((xs[j],y),w,h,boxstyle='round,pad=0.02,rounding_size=0.10',
                      facecolor='#ffffff',edgecolor=c,linewidth=1.7))
        ax.text(xs[j]+w/2,y+h/2,label,ha='center',va='center',fontsize=11,linespacing=1.65)
        if j<3: ax.add_patch(FancyArrowPatch((xs[j]+w+.06,y+h/2),(xs[j+1]-.08,y+h/2),
                             arrowstyle='-|>',mutation_scale=14,color=c,lw=1.7))
ax.text(.1,.08,'说明：原始或融合 DNG 在上游保留；风格成片另行导出。DNG 后缀本身不代表未经处理。',fontsize=10,color=GRAY)
save(fig,'fig01_pipeline_routes.png')

# 2. Actual manufacturer table, including censored sheet-film observations.
sizes=['4 × 6','8 × 10','16 × 20']; x=np.arange(3)
film135=[37,59,89]; film120=[25,37,59]
rows=[]
for fmt,vals,mags in [('135_24x36mm',film135,[4.4,8.8,17.8]),('120_6x6cm',film120,[2.6,4.4,8.8])]:
    for s,v,m in zip(sizes,vals,mags):rows.append([fmt,s,v,'=',m,'Kodak E-4050 (2016), p.3'])
for s,v,rel,m in zip(sizes,[25,25,36],['<','<','='],[1.2,2,4]):
    rows.append(['sheet_4x5inch',s,v,rel,m,'Kodak E-4050 (2016), p.3'])
table('kodak_portra400_print_grain_index.csv',['negative_format','print_size_inches','pgi_value','relation','magnification','source'],rows)
fig,ax=plt.subplots(figsize=(10.5,6.5))
for label,vals,c in [('135：24 × 36 mm',film135,TEAL),('120：6 × 6 cm',film120,RUST)]:
    ax.plot(x,vals,marker='o',markersize=9,lw=2.5,color=c,label=label)
    for xx,yy in zip(x,vals):ax.annotate(str(yy),(xx,yy),xytext=(0,11),textcoords='offset points',ha='center',color=c,fontsize=12)
ax.axhline(25,color=GRAY,ls='--',lw=1.2)
ax.text(2.08,25,'约可见阈值 25',va='center',fontsize=10,color=GRAY)
ax.set_xticks(x,sizes);ax.set_xlim(-.13,2.6);ax.set_ylim(16,102)
ax.set_ylabel('Print Grain Index（感知指标）');ax.set_xlabel('照片尺寸（英寸），固定观察距离 14 英寸')
ax.grid(axis='y',alpha=.16);ax.legend(loc='upper left')
fig.suptitle('同一款 Portra 400，颗粒观感随画幅与放大改变',fontsize=19,y=.98)
fig.text(.08,.015,'真实数据：Kodak E-4050（2016），第 3 页。PGI 不是 RMS 颗粒度，也不是颗粒数量。\n4 × 5 英寸底片的 <25 / <25 / 36 作为删失数据保留在 CSV 与正文表格中，未按 25 强行作图。',fontsize=9,color=GRAY)
fig.subplots_adjust(bottom=.19,top=.88,right=.87)
save(fig,'fig02_kodak_grain_data.png')

# 3. Plot processed, licensed profile data, preserving nulls as gaps.
fig,axes=plt.subplots(2,2,figsize=(12.5,9.4))
profile_rows=[]
for row,(name,label) in enumerate([('kodak_portra_400','Portra 400 负片'),('kodak_portra_endura','Portra Endura 相纸')]):
    doc=json.loads((DATA/(name+'.json')).read_text())
    d=doc['data']; wavelength=np.array(d['wavelengths'],dtype=float)
    sensitivities=np.array(d['log_sensitivity'],dtype=float)
    exposure=np.array(d['log_exposure'],dtype=float)
    density=np.array(d['density_curves'],dtype=float)
    for k,(ch,col) in enumerate(zip(['R 感色层','G 感色层','B 感色层'],COLORS)):
        axes[row,0].plot(wavelength,sensitivities[:,k],c=col,lw=1.8,label=ch)
        axes[row,1].plot(exposure,density[:,k],c=col,lw=1.8,label=ch)
    axes[row,0].set_title(label+'｜模型光谱灵敏度',loc='left')
    axes[row,1].set_title(label+'｜模型密度曲线',loc='left')
    axes[row,0].set_xlabel('波长（nm）');axes[row,0].set_ylabel('log10 相对灵敏度（模型标度）')
    axes[row,1].set_xlabel('log10 曝光（各材料独立模型标度）');axes[row,1].set_ylabel('模型染料层密度')
    axes[row,0].set_xlim(380,780);axes[row,1].set_xlim(-3,4)
    for ax in axes[row]:ax.grid(alpha=.15);ax.legend(loc='best',fontsize=9)
    for wl,ss in zip(wavelength,sensitivities):
        profile_rows.append([name,'spectral',wl,*[v if np.isfinite(v) else '' for v in ss]])
    for xx,dd in zip(exposure,density):profile_rows.append([name,'density',xx,*dd])
table('spektrafilm_profile_curves.csv',['profile','curve_type','x','R','G','B'],profile_rows)
fig.suptitle('物理模型需要描述材料如何感光，以及曝光如何形成密度',fontsize=20,y=.99)
fig.text(.06,.02,'数据：Andrea Volpato / spektrafilm，profile v0.3.2，commit 3bb2c2d（CC BY-SA 4.0）。本图为重新绘制的处理后模型数据。\n曲线经过项目数字化、解混与拟合；不是本报告实测，也不是厂家未经处理的原始曲线。两种材料的标度与测量条件不同，勿直接比较绝对感光度。',fontsize=9,color=GRAY)
fig.subplots_adjust(hspace=.42,wspace=.26,top=.89,bottom=.14)
save(fig,'fig03_spectral_and_density_models.png')

# 4. Noise calculations; assumptions are explicit and are not an app benchmark.
ns=np.array([1,2,4,8,16,32]); independent=1/np.sqrt(ns)
correlated=np.sqrt((1+(ns-1)*.1)/ns)
table('ideal_burst_noise.csv',['frames','sigma_ratio_independent','snr_gain_factor','snr_gain_db','sigma_ratio_rho_0p1'],
      [[int(n),float(a),float(1/a),float(20*math.log10(1/a)),float(b)] for n,a,b in zip(ns,independent,correlated)])
fig,ax=plt.subplots(figsize=(10.5,6.5))
ax.plot(ns,independent,'o-',lw=2.6,color=TEAL,label='独立噪声：σ / √N')
ax.plot(ns,correlated,'s--',lw=2.1,color=RUST,label='假设任意两帧的噪声相关 ρ = 0.1')
ax.set_xscale('log',base=2);ax.set_xticks(ns,[str(n) for n in ns]);ax.set_ylim(0,1.08)
ax.set_xlabel('合并帧数 N');ax.set_ylabel('平均后噪声标准差 / 单帧标准差')
ax.grid(alpha=.17);ax.legend(loc='upper right')
ax.annotate('32 帧：0.177 倍噪声\nSNR 提高 5.66 倍',xy=(32,independent[-1]),xytext=(4.4,.18),
            arrowprops={'arrowstyle':'->','color':TEAL},fontsize=11,color=TEAL)
fig.suptitle('多帧可以降低噪声；收益依赖时间预算与噪声独立性',fontsize=19,y=.98)
fig.text(.08,.018,'公式计算，非产品实测。假设每帧相同信号、相同曝光与噪声方差，正确配准后等权平均。\n增加帧数也增加总采样时间；不代表在固定总曝光下凭空获得同等收益，也不是动态范围实测值。ρ=0.1 仅为示意。',fontsize=9,color=GRAY)
fig.subplots_adjust(bottom=.19,top=.88)
save(fig,'fig04_burst_noise_theory.png')

# 5. A synthetic pipeline-order example, no real photograph is altered.
xx=np.geomspace(1/128,8,600)
T=lambda z:z/(1+z)
early=T(2*xx);late=np.minimum(1,2*T(xx))
table('pipeline_order_example.csv',['scene_linear_input','tone_after_1EV_gain','display_brightness_times2_clipped'],zip(xx,early,late))
fig,ax=plt.subplots(figsize=(10.5,6.5))
ax.plot(xx,early,lw=2.6,color=TEAL,label='先提高线性曝光：T(2x)')
ax.plot(xx,late,lw=2.5,color=RUST,label='先渲染后乘亮度：min[1, 2T(x)]')
ax.axvline(.18,c=GRAY,ls=':',lw=1)
ax.scatter([.18,.18],[T(.36),2*T(.18)],c=[TEAL,RUST],s=50,zorder=4)
ax.annotate('18% 灰输入：\n0.265 与 0.305',(.18,.30),(.027,.58),arrowprops={'arrowstyle':'->','color':GRAY},fontsize=11)
ax.set_xscale('log',base=2);ax.set_ylim(0,1.05)
ax.set_xlabel('场景线性输入 x（对数坐标）');ax.set_ylabel('渲染输出（归一化）')
ax.grid(alpha=.17);ax.legend(loc='lower right')
fig.suptitle('调整顺序会改变结果：曝光与影调映射不能随意互换',fontsize=19,y=.98)
fig.text(.08,.02,'可复算机制示例：T(x)=x/(1+x)。它是一条教学用肩部曲线，不代表任何产品或具体胶片。\n后乘亮度的路径在 x≥1 时截白；前置线性曝光仍保留高光数值差别。',fontsize=9,color=GRAY)
fig.subplots_adjust(bottom=.18,top=.88)
save(fig,'fig05_processing_order.png')

# 6. Exact LUT storage arithmetic, excluding text format / caches / shaper tables.
grids=[17,33,65,129];nodes=[n**3 for n in grids];mib=[n*3*4/(1024**2) for n in nodes]
table('lut_grid_storage.csv',['grid_axis_size','rgb_nodes','float32_rgb_bytes','MiB'],[[g,n,n*12,m] for g,n,m in zip(grids,nodes,mib)])
fig,ax=plt.subplots(figsize=(10.5,6.1))
bars=ax.bar([str(g)+'³' for g in grids],mib,color=[TEAL,TEAL,RUST,RUST],width=.55)
ax.set_yscale('log');ax.set_ylim(.025,90);ax.set_ylabel('RGB float32 表的理论存储量（MiB，对数轴）')
ax.set_xlabel('3D LUT 网格');ax.grid(axis='y',alpha=.15)
for b,n,m in zip(bars,nodes,mib):
    ax.text(b.get_x()+b.get_width()/2,m*1.20,f'{m:.3f} MiB\n{n:,} 个节点',ha='center',fontsize=10)
fig.suptitle('更密的 LUT 提高颜色采样密度，仍不会增加空间感知能力',fontsize=19,y=.98)
fig.text(.08,.018,'精确计算：节点数 n³；存储量 n³ × 3 通道 × 4 字节。未含文本 .cube、shaper、缓存及元数据。\n表格精度与模型准确性是不同问题；所有网格都只按输入 RGB 查表。',fontsize=9,color=GRAY)
fig.subplots_adjust(bottom=.20,top=.86)
save(fig,'fig06_lut_storage.png')
print('Wrote 6 figures and 5 CSV data files.')
