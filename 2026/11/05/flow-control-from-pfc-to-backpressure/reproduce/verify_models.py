#!/usr/bin/env python3
"""Verify the article's illustrative arithmetic and CSV formulas (stdlib only).
This is not RTL simulation, network simulation, or a hardware benchmark.
"""
from pathlib import Path
import csv,json,math
HERE=Path(__file__).resolve().parent

def close(a:float,b:float)->None:
    assert math.isclose(a,b,rel_tol=1e-8,abs_tol=1e-7),(a,b)

head=list(csv.DictReader((HERE/'headroom_theory.csv').open()))
credit=list(csv.DictReader((HERE/'credit_window_theory.csv').open()))
for row in head:
    expected=float(row['rate_gbps'])*1e9/8*float(row['stop_delay_us'])*1e-6
    close(float(row['headroom_bytes']),expected)
    close(float(row['headroom_kib']),expected/1024)
for row in credit:
    expected=float(row['credit_bytes'])*8/(float(row['return_delay_us'])*1e-6)/1e9
    close(float(row['credit_limit_gbps']),expected)
    close(float(row['upper_bound_gbps']),min(float(row['link_gbps']),expected))
close(400e9/8*2e-6,100000)
close(100000/1024,97.65625)
close((800e9-400e9)/8*10e-6,500000)
close(131072*8/4e-6/1e9,262.144)
close(131072*8/2e-6/1e9,524.288)
assert max(0,min(64,256)-48)==16
samples=[(1,1,'A'),(1,0,'B'),(1,0,'B'),(1,1,'B'),(1,1,'C')]
assert [data for valid,ready,data in samples if valid and ready]==['A','B','C']
for i,(valid,ready,data) in enumerate(samples[:-1]):
    if valid and not ready:assert samples[i+1][0]==1 and samples[i+1][2]==data
report={'scope':'illustrative arithmetic and table checks only','headroom_csv_rows':len(head),'credit_csv_rows':len(credit),'headroom_400g_2us_bytes':100000,'headroom_400g_2us_kib':97.65625,'credit_128kib_4us_gbps':262.144,'tcp_new_send_kib':16,'accepted_ready_valid_beats':['A','B','C'],'passed':True}
print(json.dumps(report,ensure_ascii=False,indent=2))
