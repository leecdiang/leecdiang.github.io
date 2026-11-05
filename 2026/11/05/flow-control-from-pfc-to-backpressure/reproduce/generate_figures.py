#!/usr/bin/env python3
"""Regenerate all original diagrams and theoretical CSVs. Python 3.10+, stdlib only.

Run from anywhere; paths resolve relative to this script. SVGs inherit the blog's
existing theme variables. No external images, fonts, or measured results are used.
"""
from __future__ import annotations
import csv
import html
import json
from pathlib import Path
from typing import Iterable

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = ROOT / 'source' / '_visuals' / 'flow-control'
OUT.mkdir(parents=True, exist_ok=True)
BLUE, TEAL, AMBER, RED = ('--chart-blue', '--chart-teal', '--chart-amber', '--chart-red')
INK, SUB, MUTED, DIV = '--text-primary', '--text-secondary', '--text-muted', '--divider'
metadata: list[dict] = []

def esc(s: object) -> str:
    return html.escape(str(s), quote=True)

def var(c: str) -> str:
    return f'var({c})' if c.startswith('--') else c

class Diagram:
    def __init__(self, name: str, title: str, subtitle: str, h: int = 480):
        self.name, self.title, self.h = name, title, h
        self.p: list[str] = []
        defs = ''.join(f'<marker id="fc-{name}-{k}" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L8 4L0 8Z" fill="{var(c)}"/></marker>' for k,c in [('b',BLUE),('t',TEAL),('a',AMBER),('r',RED),('s',SUB)])
        self.p.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 {h}" role="img" aria-label="{esc(title+"。"+subtitle)}" font-family="system-ui, -apple-system, Segoe UI, Noto Sans CJK SC, sans-serif"><title>{esc(title)}</title><desc>{esc(subtitle)}</desc><defs>{defs}</defs>')
        self.text(30, 40, title, 26, weight=650)
        self.text(30, 73, subtitle, 17, SUB)
    def text(self, x: float, y: float, s: str, size: float=20, color: str=INK, anchor: str='start', weight: int=400):
        self.p.append(f'<text x="{x:g}" y="{y:g}" font-size="{size:g}" fill="{var(color)}" text-anchor="{anchor}" font-weight="{weight}">{esc(s)}</text>')
    def lines(self, x: float, y: float, lines: Iterable[str], size: float=20, color: str=INK, anchor: str='start', gap: float=29, weight:int=400):
        for i,s in enumerate(lines): self.text(x,y+i*gap,s,size,color,anchor,weight)
    def rect(self,x,y,w,h,fill='--surface-soft',stroke=DIV,rx=12,sw=1.5,opacity=None):
        op = f' fill-opacity="{opacity}"' if opacity is not None else ''
        self.p.append(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" fill="{var(fill)}" stroke="{var(stroke)}" stroke-width="{sw}"{op}/>')
    def line(self,x1,y1,x2,y2,color=SUB,sw=2,dash=''):
        ds=f' stroke-dasharray="{dash}"' if dash else ''
        self.p.append(f'<path d="M{x1:g} {y1:g}L{x2:g} {y2:g}" fill="none" stroke="{var(color)}" stroke-width="{sw}"{ds}/>')
    def path(self, d, color=SUB, sw=2, dash='', arrow=False):
        k={BLUE:'b',TEAL:'t',AMBER:'a',RED:'r',SUB:'s'}.get(color,'s')
        ar=f' marker-end="url(#fc-{self.name}-{k})"' if arrow else ''
        ds=f' stroke-dasharray="{dash}"' if dash else ''
        self.p.append(f'<path d="{d}" fill="none" stroke="{var(color)}" stroke-width="{sw}" stroke-linejoin="round"{ds}{ar}/>')
    def arrow(self,x1,y1,x2,y2,color=BLUE,dash=''):
        self.path(f'M{x1:g} {y1:g}L{x2:g} {y2:g}',color,2.4,dash,True)
    def circle(self,x,y,r=5,color=BLUE):
        self.p.append(f'<circle cx="{x:g}" cy="{y:g}" r="{r}" fill="{var(color)}"/>')
    def box(self,x,y,w,h,title,body=(),color=BLUE):
        self.rect(x,y,w,h,stroke=color)
        self.text(x+w/2,y+34,title,21,color,'middle',600)
        self.lines(x+w/2,y+65,body,18,SUB,'middle',26)
    def save(self):
        self.p.append('</svg>')
        s=''.join(self.p)
        assert len(s.encode()) < 200000, self.name
        (OUT/f'{self.name}.svg').write_text(s, encoding='utf-8')
        metadata.append({'file':f'{self.name}.svg','title':self.title,'viewBox':f'0 0 900 {self.h}','type':'theoretical' if self.name in ['fig04_headroom_theory','fig09_credit_window'] else 'schematic'})

# 1. Scope of control: local interfaces, adjacent links, end-to-end feedback.
d=Diagram('fig01_scope','流控沿整条路径分布','控制范围不同：片内接口、相邻链路、端到端。',480)
for x,w,t,b in [(30,125,'主机 A',['内存 / 软件']),(200,135,'NIC A',['DMA / 队列','ready / valid']),(380,140,'交换机',['共享缓冲','调度 / 标记']),(565,135,'NIC B',['DMA / 队列','ready / valid']),(745,125,'主机 B',['内存 / 软件'])]:
    d.box(x,110,w,140,t,b)
for a,b in [(155,200),(335,380),(520,565),(700,745)]: d.arrow(a+4,172,b-6,172)
d.lines(177,277,['PCIe','credit'],18,BLUE,'middle',24); d.lines(723,277,['PCIe','credit'],18,BLUE,'middle',24)
d.path('M450 254V308H267V257',AMBER,2.4,arrow=True)
d.text(360,295,'PFC / PAUSE',17,AMBER,'middle')
d.path('M632 254V355H480V254',AMBER,2.4,arrow=True)
d.text(545,342,'PFC / PAUSE',17,AMBER,'middle')
d.text(450,391,'链路级暂停：相邻设备之间，每一跳分别处理',19,SUB,'middle')
d.arrow(808,439,92,439,BLUE); d.text(450,427,'端到端：TCP 窗口 / RDMA 资源反馈 / 拥塞控制',19,BLUE,'middle')
d.save()

# 2. Pause all priorities vs a single PFC priority.
d=Diagram('fig02_pause_pfc','PAUSE 与 PFC：暂停粒度的差别','请求从 B 返回 A；影响的是 A → B 的相应数据发送。',480)
for row,label,y in [(0,'PAUSE',160),(1,'PFC',290)]:
    d.text(30,y+35,label,24,INK,weight=650)
    for i in range(8):
        x=170+i*86
        stop=(row==0 or i==3)
        c=RED if stop else TEAL
        d.rect(x,y,72,78,stroke=c,fill=c,opacity=.09)
        d.text(x+36,y+29,f'P{i}',20,c,'middle',600)
        d.text(x+36,y+59,'停' if stop else '可发',19,c,'middle')
d.text(170,139,'同一条输出链路上的 8 个优先级',19,SUB)
d.text(170,264,'示例仅暂停 P3；其他优先级仍可发送',19,SUB)
d.rect(170,393,674,50,stroke=AMBER)
d.text(507,425,'P3 可以包含多个 QP：它们会一起受暂停影响',20,AMBER,'middle')
d.save()

# 3. Stop delay timeline and buffer thresholds.
d=Diagram('fig03_stop_delay','暂停请求发出后，仍需接住在途数据','停止生效不是瞬时事件；headroom 保护的正是这段空窗。',580)
d.text(185,120,'发送端 A',21,BLUE,'middle',600);d.text(610,120,'接收端 B',21,TEAL,'middle',600)
d.arrow(185,140,185,390,SUB);d.arrow(610,140,610,390,SUB)
d.text(65,175,'时间',18,SUB)
d.circle(610,166,5,RED);d.text(633,172,'XOFF 触发',19,RED)
d.arrow(602,172,193,240,AMBER);d.text(386,180,'暂停请求向上游传递',19,AMBER,'middle')
d.lines(45,250,['接收请求','响应暂停'],18,SUB,gap=26)
for y in [155,190,225]: d.arrow(193,y,602,y+125,BLUE)
d.text(375,365,'先前发出的数据仍在抵达',18,BLUE,'middle')
d.circle(610,352,5,RED);d.text(633,359,'最后一批抵达',19,RED)
d.line(790,166,790,352,RED,2); d.line(780,166,800,166,RED);d.line(780,352,800,352,RED)
d.text(806,264,'Tstop',19,RED)
d.text(30,439,'缓冲占用',20,INK,weight=600)
d.rect(160,418,630,54,rx=5)
d.rect(160,418,400,54,fill=BLUE,stroke=BLUE,rx=4,opacity=.14)
d.rect(560,418,230,54,fill=AMBER,stroke=AMBER,rx=4,opacity=.15)
d.text(360,452,'已占用 / 常规缓冲',19,BLUE,'middle');d.text(675,452,'headroom',20,AMBER,'middle')
d.line(430,409,430,481,TEAL);d.line(560,409,560,481,RED);d.text(430,510,'XON',18,TEAL,'middle');d.text(560,510,'XOFF',18,RED,'middle');d.text(790,510,'容量边界',18,SUB,'middle')
d.text(450,550,'阈值与分区仅为逻辑示意；不代表某款交换机的物理内存布局。',17,SUB,'middle')
d.save()

# 4. Theoretical headroom curves and CSV.
head=[]
for rate in [100,200,400,800]:
    for k in range(81):
        t=k*.05; b=rate*1e9/8*t*1e-6
        head.append({'rate_gbps':rate,'stop_delay_us':round(t,2),'headroom_bytes':round(b,6),'headroom_kib':round(b/1024,8)})
with (HERE/'headroom_theory.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(head[0]));w.writeheader();w.writerows(head)
d=Diagram('fig04_headroom_theory','反馈越慢，预留空间越大','理论计算：H = R × T；不排空，不含额外裕量。',565)
x0,y0,pw,ph=90,455,620,330
X=lambda t:x0+t/4*pw
Y=lambda h:y0-h/400*ph
for v in [0,100,200,300,400]:
    d.line(x0,Y(v),x0+pw,Y(v),DIV,1);d.text(73,Y(v)+6,str(v),18,SUB,'end')
for t in [0,1,2,3,4]:
    d.line(X(t),125,X(t),455,DIV,1);d.text(X(t),483,str(t),18,SUB,'middle')
d.line(x0,125,x0,455,SUB);d.line(x0,455,710,455,SUB)
d.text(90,110,'所需缓冲 / KiB',19,SUB);d.text(400,522,'停止生效时间 T / μs',20,SUB,'middle')
for r,c,dash in [(100,TEAL,'2 5'),(200,AMBER,'8 5'),(400,BLUE,''),(800,RED,'12 4 2 4')]:
    d.path(f'M{X(0)} {Y(0)}L{X(4)} {Y(r*4*125/1024)}',c,3,dash)
    d.text(735,Y(r*4*125/1024)+6,f'{r} Gb/s',19,c)
h=400*2*125/1024
d.circle(X(2),Y(h),6,BLUE);d.path(f'M{X(2)} {Y(h)-8}V{Y(h)-69}H{X(2)+175}',BLUE,1.5)
d.text(X(2)+10,Y(h)-82,'2 μs → 97.7 KiB',19,BLUE,weight=600)
d.save()

# 5. Victim flow and backpressure propagation.
d=Diagram('fig05_hol','同一优先级的业务，可能一起被按下暂停','A 的目的方向拥塞；B 的目的方向空闲，但共享上游暂停边界。',570)
d.box(30,143,170,155,'上游发送者',['流 A → 目的 A','流 B → 目的 B','两者均用 P3'])
d.box(345,163,190,115,'交换机',['按目的地转发'])
d.box(680,115,185,90,'目的 A',['输出拥塞'],RED)
d.box(680,270,185,90,'目的 B',['输出空闲'],TEAL)
d.arrow(205,201,338,201,BLUE);d.text(270,187,'共享 P3',18,SUB,'middle')
d.arrow(338,252,205,252,AMBER);d.text(270,283,'PFC：停 P3',18,AMBER,'middle')
d.path('M535 192H605V160H673',RED,2.4,arrow=True)
d.path('M535 249H605V315H673',TEAL,2.4,arrow=True)
d.text(575,145,'流 A',18,RED);d.text(575,348,'流 B 也被上游暂停',18,TEAL,'middle')
d.line(30,398,870,398,DIV)
d.text(30,434,'拥塞可能继续向上游传播',21,INK,weight=600)
for x,t in [(65,'更上游'),(355,'上游队列'),(645,'拥塞处')]:d.rect(x,460,170,62,stroke=AMBER);d.text(x+85,498,t,20,AMBER,'middle')
d.arrow(640,490,530,490,AMBER);d.arrow(350,490,240,490,AMBER)
d.text(450,552,'队列各自积压，各自生成新的暂停请求；并非原帧被逐跳转发。',17,SUB,'middle')
d.save()

# 6. DCQCN sequence.
d=Diagram('fig06_dcqcn','ECN → CNP → 源端调速','拥塞标记、反馈消息、控制算法，是三个不同环节。',570)
for x,t,sub,c in [(140,'发送端 RP','Reaction Point',BLUE),(450,'交换机 CP','Congestion Point',AMBER),(760,'接收端 NP','Notification Point',TEAL)]:
    d.text(x,122,t,22,c,'middle',600);d.text(x,149,sub,17,SUB,'middle');d.line(x,167,x,495,DIV,2,'6 6')
d.arrow(148,207,442,238,BLUE);d.text(290,199,'① 发送 RoCEv2 数据',18,BLUE,'middle')
d.rect(362,248,176,54,stroke=AMBER);d.text(450,281,'② 拥塞时标 CE',18,AMBER,'middle')
d.arrow(458,315,752,345,TEAL);d.text(620,306,'③ 带标记的数据继续前进',18,TEAL,'middle')
d.arrow(752,385,148,430,RED);d.text(445,384,'④ 接收端返回 CNP（可限制反馈频率）',19,RED,'middle')
d.rect(42,449,196,57,stroke=BLUE);d.text(140,484,'⑤ 更新发送速率',19,BLUE,'middle')
d.text(450,547,'PFC 不在这条端到端反馈链里；它可以作为独立的逐跳保护机制同时运行。',17,SUB,'middle')
d.save()

# 7. Signals comparison.
d=Diagram('fig07_signals','拥塞控制可以观察不同信号','比较观测路径与实现条件，不给算法排性能名次。',520)
cols=[30,170,460,675,870]
for x,t in zip(cols[:-1],['机制','主要信号','反馈到源端','需要处理的条件']): d.text(x+8,128,t,19,SUB,weight=600)
rows=[('DCQCN',['ECN / CE 标记'],['接收端 CNP'],['标记与反馈时延'],BLUE),('QCN',['二层拥塞通知'],['拥塞点通知源端'],['域内端点支持'],AMBER),('TIMELY',['RTT 及其变化'],['时延测量反馈'],['测时精度与噪声'],TEAL),('HPCC',['带内遥测 INT'],['更细的负载信息'],['设备与报文支持'],RED)]
for i,(name,signal,feedback,cost,c) in enumerate(rows):
    y=151+i*81;d.rect(30,y,840,67,stroke=DIV,rx=9)
    d.text(44,y+41,name,20,c,weight=650)
    d.lines(178,y+41,signal,19);d.lines(468,y+41,feedback,19);d.lines(683,y+41,cost,18,SUB)
d.text(30,504,'更丰富的信息不等于零延迟；采集、传输和执行控制仍然需要时间。',18,SUB)
d.save()

# 8. Credit ledger.
d=Diagram('fig08_credit_ledger','Credit：先承诺空间，再允许数据前进','教学模型：8 个等大槽位，5 个占用；初始无在途数据，账本已同步。',520)
d.box(30,140,230,130,'发送端账本',['可用 credit = 3','发送一个，扣减一个'],BLUE)
d.text(570,125,'接收端：8 个槽位',22,INK,'middle',600)
for i in range(8):
    x=350+i*63;c=BLUE if i<5 else TEAL
    d.rect(x,148,52,78,stroke=c,fill=c,opacity=.11)
    d.text(x+26,181,str(i+1),19,c,'middle');d.text(x+26,210,'占' if i<5 else '空',18,c,'middle')
d.arrow(268,254,842,254,BLUE);d.text(555,286,'数据向右：消耗已经获得的许可',19,BLUE,'middle')
d.arrow(840,337,268,337,TEAL);d.text(555,371,'额度向左：释放资源并反馈可用额度',19,TEAL,'middle')
d.rect(30,414,840,67,stroke=AMBER);d.lines(450,442,['已发出但未到达的数据，也必须占用已承诺的空间。','反馈尚未到达时，“实际空闲”不等于“发送端可用 credit”。'],18,AMBER,'middle',26)
d.save()

# 9. Credit window and round trip delay.
credits=[]
for i in range(1,161):
    t=i*.05; raw=128*1024*8/(t*1e-6)/1e9
    credits.append({'credit_bytes':131072,'return_delay_us':round(t,2),'link_gbps':400,'credit_limit_gbps':round(raw,9),'upper_bound_gbps':round(min(400,raw),9)})
with (HERE/'credit_window_theory.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(credits[0]));w.writeheader();w.writerows(credits)
d=Diagram('fig09_credit_window','额度充足，才可能覆盖反馈往返','理论上界：R ≤ min(C, Bcredit / Treturn)；Bcredit = 128 KiB。',550)
x0,y0,pw,ph=90,445,700,310
X=lambda t:x0+t/8*pw
Y=lambda r:y0-r/450*ph
for r in [0,100,200,300,400]:
    d.line(90,Y(r),790,Y(r),DIV,1);d.text(72,Y(r)+6,str(r),18,SUB,'end')
for t in [0,2,4,6,8]:
    d.line(X(t),135,X(t),445,DIV,1);d.text(X(t),473,str(t),18,SUB,'middle')
d.line(90,135,90,445,SUB);d.line(90,445,790,445,SUB)
d.text(90,112,'发送速率上界 / Gb/s',19,SUB);d.text(440,516,'额度循环时间 Treturn / μs',20,SUB,'middle')
d.line(90,Y(400),790,Y(400),AMBER,2,'9 5');d.text(794,Y(400)+6,'400G',17,AMBER)
pts=' '.join(('M' if i==0 else 'L')+f'{X(row["return_delay_us"]):.3f} {Y(row["upper_bound_gbps"]):.3f}' for i,row in enumerate(credits))
d.path(pts,BLUE,3)
for t,r,label,offx,offy in [(2,400,'2 μs：仍受链路限速',25,53),(4,262.144,'4 μs：262.1 Gb/s',30,-23)]:
    d.circle(X(t),Y(r),6,BLUE);d.text(X(t)+offx,Y(r)+offy,label,19,BLUE)
d.save()

# 10. Valid/ready sampling table.
d=Diagram('fig10_ready_valid','握手发生在同时为高的采样沿','每列为一个时钟上升沿看到的值；不是连续模拟波形。',540)
start,cw=225,120
for i in range(5):
    x=start+i*cw
    if i in [1,2]:d.rect(x-9,116,116,342,fill=AMBER,stroke=AMBER,opacity=.07)
    d.text(x+47,146,f'沿 {i+1}',20,SUB,'middle')
rows=[('TVALID',[1,1,1,1,1]),('TREADY',[1,0,0,1,1]),('TDATA',['A','B','B','B','C']),('实际传输',['A','—','—','B','C'])]
for j,(name,vals) in enumerate(rows):
    y=206+j*73
    d.text(38,y,name,20,INK,weight=600)
    d.line(210,y+23,832,y+23,DIV)
    for i,v in enumerate(vals):d.text(start+i*cw+47,y,str(v),24,AMBER if i in [1,2] else BLUE,'middle',600)
d.path('M345 463V477H681V463',AMBER,2)
d.text(513,512,'B 必须保持，直到沿 4 完成握手',20,AMBER,'middle')
d.save()

# 11. TCP vs receive WQE.
d=Diagram('fig11_receiver_resources','接收端资源不足，也有不同的含义','TCP 的字节窗口，与 RC RDMA 的接收 WQE，不是同一个资源。',540)
d.rect(30,116,400,378,stroke=BLUE);d.rect(470,116,400,378,stroke=TEAL)
d.text(230,152,'TCP：两道窗口约束',22,BLUE,'middle',600)
for y,name,val,w,c in [(197,'rwnd',64,75,BLUE),(272,'cwnd',256,300,TEAL)]:
    d.text(55,y,name,20,INK);d.rect(75,y+15,300,25,rx=3);d.rect(75,y+15,w,25,rx=3,fill=c,stroke=c,opacity=.25);d.text(390,y+35,f'{val}',17,c,'end')
d.lines(230,365,['单位：KiB','有效窗口 = min(64, 256) = 64','已在途 48，新增余量 16'],18,SUB,'middle',32)
d.text(670,152,'RC RDMA：接收 WQE',22,TEAL,'middle',600)
d.box(510,180,320,82,'SEND / WRITE with Immediate',[],TEAL)
d.arrow(670,270,670,305,TEAL)
d.rect(535,311,270,62,stroke=AMBER);d.text(670,349,'没有可用 Receive WQE',18,AMBER,'middle')
d.arrow(670,381,670,410,AMBER)
d.text(670,444,'RNR NAK → 等待 / 重试',20,TEAL,'middle')
d.text(670,477,'并不代表交换网络拥塞',18,SUB,'middle')
d.save()

# 12. Tokens vs receiver credits + scheduling.
d=Diagram('fig12_tokens','同样是额度，增加的原因不同','看计数器的更新规则，比看寄存器名字更有用。',545)
d.box(30,122,390,150,'Token Bucket',['随时间按速率 r 补充','发送消耗预算；桶容量 B 允许突发','不需要接收方先释放空间'],BLUE)
d.box(480,122,390,150,'接收 Buffer Credit',['接收方拥有并承诺空间','发送消耗许可；释放后更新额度','不能只靠本地定时器创造空间'],TEAL)
d.text(450,324,'发送还要同时满足多种条件',22,INK,'middle',600)
for x,w,title,body in [(30,185,'队列调度',['当前选谁？']),(285,250,'速率 / 额度资格',['现在允许发多少？']),(605,265,'链路发送条件',['是否被 PFC 暂停？'])]: d.box(x,356,w,105,title,body)
d.arrow(222,408,277,408);d.arrow(542,408,598,408)
d.text(450,511,'这些是逻辑条件；具体实现可以合并、重排或使用联合仲裁。',18,SUB,'middle')
d.save()

# 13. Composed NIC control scopes.
d=Diagram('fig13_composition','一张网卡，同时跨过多层控制边界','数据向前走；不同反馈在自己的作用范围内返回。',650)
for x,w,title,lines,color in [(30,245,'发送端 NIC',['主机互连 / DMA','发送队列与调度','shaper / 速率控制','MAC / PHY'],BLUE),(345,210,'交换网络',['分类与排队','调度 / 缓冲监测','ECN 标记','链路级暂停'],AMBER),(625,245,'接收端 NIC',['MAC / PHY','接收缓冲与传输','DMA / 主机互连','Receive WQE 状态'],TEAL)]:
    d.rect(x,125,w,238,stroke=color);d.text(x+w/2,161,title,22,color,'middle',600);d.lines(x+w/2,207,lines,19,SUB,'middle',36)
d.arrow(282,231,338,231,BLUE);d.arrow(562,231,618,231,BLUE)
d.path('M345 322H290V390H175V370',AMBER,2.4,'7 5',True)
d.path('M625 322H580V390H450V370',AMBER,2.4,'7 5',True)
d.text(315,416,'PFC：相邻设备之间，按优先级暂停',19,AMBER,'middle')
d.arrow(748,471,153,471,RED,'8 5');d.text(450,458,'CNP：端到端拥塞反馈 → 更新发送速率',19,RED,'middle')
d.rect(30,512,395,95,stroke=BLUE);d.lines(227,545,['NIC 内部：ready/valid / credit','主机互连：PCIe credit'],19,BLUE,'middle',32)
d.rect(475,512,395,95,stroke=TEAL);d.lines(672,545,['接收资源：Receive WQE / 应用额度','反馈不等同于交换机拥塞'],19,TEAL,'middle',32)
d.save()

(HERE/'figure_manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Generated {len(metadata)} SVGs in {OUT}')
print('Generated headroom_theory.csv and credit_window_theory.csv')
