#!/usr/bin/env python3
"""Generate theme-aware SVG from the article's checked-in data. Python stdlib only.
Run from any directory. Does not edit prose or photographs.
"""
from pathlib import Path
import re,csv,math,html
root=Path(__file__).resolve().parents[4]
data=Path(__file__).resolve().parents[1]/'data'
out=root/'source/_visuals/film'
out.mkdir(parents=True,exist_ok=True)
def rows(n):return list(csv.DictReader((data/n).open()))
def text(x,y,t,size=15,cls='v-ink',anchor='start'):
 return f'<text x="{x}" y="{y}" font-size="{size}" class="{cls}" text-anchor="{anchor}">{html.escape(str(t))}</text>'
def svg(body,h=420):return f'<svg viewBox="0 0 800 {h}" role="img" xmlns="http://www.w3.org/2000/svg">{body}</svg>'
def panel(title,series,xrange,yrange,xticks,yticks,xlabel,ylabel,logx=False):
 b=text(28,32,title,20)+text(74,64,ylabel,13,'v-sub');X=lambda x:74+( (math.log2(x)-math.log2(xrange[0]))/(math.log2(xrange[1])-math.log2(xrange[0])) if logx else (x-xrange[0])/(xrange[1]-xrange[0]))*680;Y=lambda y:320-(y-yrange[0])/(yrange[1]-yrange[0])*230
 for y in yticks:
  b+=f'<path d="M74 {Y(y):.2f}H754" class="v-grid" fill="none"/>'+text(62,round(Y(y)+5,2),f'{y:g}',12,'v-muted','end')
 for x,label in xticks:b+=text(round(X(x),2),343,label,13,'v-sub','middle')
 b+=text(414,370,xlabel,13,'v-sub','middle')
 for j,(label,pts,col) in enumerate(series):
  d='';gap=True
  for x,y in pts:
   if y is None or not math.isfinite(y):gap=True;continue
   if not xrange[0]<=x<=xrange[1]:gap=True;continue
   d+=('M' if gap else 'L')+f'{X(x):.2f},{Y(y):.2f} ';gap=False
  b+=f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2.6"/>'
  if len(pts)<10:
   for x,y in pts:b+=f'<circle cx="{X(x):.2f}" cy="{Y(y):.2f}" r="4" fill="{col}"/>'
  b+=f'<path d="M{80+j*235} 397h24" stroke="{col}" stroke-width="3"/>'+text(110+j*235,402,label,12,'v-sub')
 return svg(b)
colors=['var(--accent)','#b98245','#d27372']
figs={}
b=text(28,34,'先确定输入，再讨论胶片风格',22)
labels=[['单帧 Bayer RAW|传感器采样','RAW 显影|白平衡 / 去马赛克','材质与色彩|曲线 / 颗粒 / 光晕','输出|SDR / HDR / 色域'],['多帧 RAW 采集|曝光 / 时间采样','融合与显影|ProRAW / Indigo','重新渲染与风格|可与上游组合','输出|JPEG / HEIF'],['已渲染照片|JPEG / HEIF / TIFF','输入解释与校正|色彩空间 / 影调','颜色与空间效果|预设 / LUT / 插件','输出|尺寸 / 颗粒 / 压缩']]
for i,row in enumerate(labels):
 for j,label in enumerate(row):
  x=24+j*195;y=70+i*105
  b+=f'<rect x="{x}" y="{y}" width="174" height="80" rx="12" fill="var(--surface-card)" stroke="{colors[i]}"/>'
  a,c=label.split('|');b+=text(x+87,y+31,a,15,'v-ink','middle')+text(x+87,y+56,c,12,'v-sub','middle')
  if j<3:b+=text(x+184,y+46,'→',18,'v-sub','middle')
b+=text(28,405,'原始 / 融合 DNG 在上游保留，风格成片另行导出；DNG 后缀不保证未经处理。',13,'v-sub')
figs['fig01_pipeline_routes']=svg(b,430)
r=rows('ideal_burst_noise.csv');figs['fig04_burst_noise_theory']=panel('多帧平均：独立噪声与相关噪声',[(lab,[(float(a['frames']),float(a[key])) for a in r],c) for lab,key,c in [('独立噪声','sigma_ratio_independent',colors[0]),('相关系数 ρ = 0.1','sigma_ratio_rho_0p1',colors[1])]],(1,32),(0,1.05),[(n,str(n)) for n in [1,2,4,8,16,32]],[0,.25,.5,.75,1],'合并帧数 N（对数轴）','噪声标准差 / 单帧标准差',True)
figs['fig02_kodak_grain_data']=panel('Portra 400：画幅、放大与颗粒观感',[(lab,list(zip([0,1,2],vals)),c) for lab,vals,c in [('135 · 24×36 mm',[37,59,89],colors[0]),('120 · 6×6 cm',[25,37,59],colors[1])]],(0,2),(0,100),[(0,'4×6'),(1,'8×10'),(2,'16×20')],[0,25,50,75,100],'印相尺寸（英寸） · 观看距离 14 英寸','Print Grain Index（感知指标）')
r=rows('pipeline_order_example.csv');figs['fig05_processing_order']=panel('处理顺序：先曝光，还是先映射？',[(lab,[(float(a['scene_linear_input']),float(a[key])) for a in r],c) for lab,key,c in [('T(2x)','tone_after_1EV_gain',colors[0]),('min[1, 2T(x)]','display_brightness_times2_clipped',colors[1])]],(1/128,8),(0,1.05),[(v,str(v)) for v in [1/128,1/32,1/8,.5,2,8]],[0,.25,.5,.75,1],'场景线性输入 x（对数轴）','渲染输出（归一化）',True)
b=text(28,32,'LUT 网格与理论存储量',22)+text(28,62,'RGB float32 · n³ × 3 通道 × 4 字节',14,'v-sub')
for i,r in enumerate(rows('lut_grid_storage.csv')):
 y=100+i*73;m=float(r['MiB']);b+=text(28,y+10,r['grid_axis_size']+'³',18)+f'<rect x="100" y="{y-12}" width="{max(2,m/25*405):.2f}" height="27" rx="3" fill="var(--accent)"/>'+text(530,y+5,f'{m:.3f} MiB',17)+text(530,y+26,f"{int(r['rgb_nodes']):,} 个节点",12,'v-sub')
b+=text(100,413,'条形长度采用线性比例 · 不含 .cube 文本、shaper、缓存和元数据',12,'v-sub');figs['fig06_lut_storage']=svg(b,435)
r=rows('spektrafilm_profile_curves.csv');parts=[]
for prof,label in [('kodak_portra_400','Portra 400 负片'),('kodak_portra_endura','Portra Endura 相纸')]:
 for typ in ['spectral','density']:
  rr=[a for a in r if a['profile']==prof and a['curve_type']==typ];ss=[(ch+' 感色层',[(float(a['x']),float(a[ch]) if a[ch] else None) for a in rr],c) for ch,c in zip('RGB',['#d27372','#57a18e','var(--accent)'])];vals=[y for _,pts,_ in ss for x,y in pts if y is not None];lo=math.floor(min(vals));hi=math.ceil(max(vals));spect=typ=='spectral'
  parts.append(panel(label+(' · 光谱灵敏度' if spect else ' · 密度曲线'),ss,(380,780) if spect else (-3,4),(lo,hi),[(x,str(x)) for x in ([380,480,580,680,780] if spect else [-3,-2,-1,0,1,2,3,4])],list(range(lo,hi+1)),'波长（nm）' if spect else 'log₁₀ 曝光（各材料独立标度）','log₁₀ 相对灵敏度' if spect else '模型染料层密度'))
figs['fig03_spectral_and_density_models']=''.join(parts)

for key, content in figs.items():
 for i, graphic in enumerate(re.findall(r'<svg.*?</svg>', content)):
  label=re.search(r'<text[^>]*>(.*?)</text>',graphic)[1]
  graphic=graphic.replace('role="img"','role="img" aria-label="'+label+'"',1)
  for color, token in [('var(--accent)','--chart-blue'),('#b98245','--chart-amber'),('#d27372','--chart-red'),('#57a18e','--chart-teal')]:
   graphic=graphic.replace(color,'var('+token+')')
  # Match line and legend patterns. RGB channels also keep explicit labels.
  for token,dash in [('--chart-amber','8 4'),('--chart-red','3 3'),('--chart-teal','10 3 2 3')]:
   graphic=re.sub(r'(<path\b[^>]*stroke="var\('+token+r'\)"[^>]*)(/>)',lambda m:m[1]+' stroke-dasharray="'+dash+'"'+m[2],graphic)
  name=key+(('-'+str(i+1)) if key=='fig03_spectral_and_density_models' else '')
  (out/(name+'.svg')).write_text(graphic+'\n')
print('Generated 9 theme-aware SVG panels in',out)
