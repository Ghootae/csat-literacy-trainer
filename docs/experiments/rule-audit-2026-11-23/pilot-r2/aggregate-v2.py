# 시범 2회차 판정 원문을 표 v2 규칙으로 다시 센다(새 판정 없음). 실행: python3 pilot-r2/aggregate-v2.py (저장소 루트에서)
# v2: F3=F3+F3b 값 묶음(고름/안 고름 일치율 평균), F4b '2'+'3 이상'→'2 이상', F6 제외.
import json, re, glob, itertools, collections
P2='docs/experiments/rule-audit-2026-11-23/pilot-r2/'
KEY=json.load(open(P2+'KEY-r2.json'))
J=['J1','J2','J3']; pairs=list(itertools.combinations(J,2))
F3V=['정의·주장','조건·범위·예외','이유·인과','비교·귀속','개별 사실','애매']
def extract(text):
    dec=json.JSONDecoder(); out=[]; i=0
    while True:
        j=text.find('{',i)
        if j<0: break
        try:
            o,e=dec.raw_decode(text,j)
            if isinstance(o,dict) and 'packet_id' in o: out.append(o); i=e; continue
        except Exception: pass
        i=j+1
    return out
def ok(o):  # aggregate.py(v1)의 유효성 기준과 같은 사실 확인(원문이 v1 값 안에 있는지)만 한다
    return o.get('packet_id') in KEY and isinstance(o.get('options'),list) and [x.get('n') for x in o['options']]==[1,2,3,4,5]
data={}
for j in J:
    items={}
    for fn in sorted(glob.glob(P2+f'judges/{j}/raw*.txt')):
        for o in extract(open(fn).read()):
            if ok(o) and all(x.get('F4b') in ('1','2','3 이상') and x.get('F3') in F3V and x.get('F3b','') in F3V+[''] for x in o['options']): items[o['packet_id']]=o
    data[j]=items
assert all(len(data[j])==20 for j in J), [len(data[j]) for j in J]
def opt(j,p,n): return data[j][p]['options'][n-1]
def f3set(x): return {x['F3']}|({x['F3b']} if x.get('F3b') else set())
def val(j,p,n,f):
    x=opt(j,p,n)
    if f=='F3': return f3set(x)
    if f=='F4b': return {'1' if x['F4b']=='1' else '2 이상'}
    return {x[f]}
grp=lambda p:KEY[p]['group']
sets={'시범 11':[p for p in KEY if grp(p)=='시범'],'대조 9':[p for p in KEY if grp(p)!='시범'],'전체 20':list(KEY)}
def fmt(x): return '-' if x is None else f'{x:.3f}'
def verdict(r): return '-' if r is None else ('유지(≥0.75)' if r>=0.75 else ('정의 고침(0.60~0.75)' if r>=0.60 else '합치거나 뺌(<0.60)'))
def pair_mean(fn):
    res=[]
    for a,b in pairs:
        t=m=0
        for p in sets['전체 20'] if False else fn['pids']:
            for n in range(1,6):
                t+=1; m+=fn['eq'](a,b,p,n)
        res.append(m/t)
    return sum(res)/3,res
def agree_single(f,pids): return pair_mean({'pids':pids,'eq':lambda a,b,p,n:val(a,p,n,f)==val(b,p,n,f)})
def f3_vals_used(pids):
    return [v for v in F3V if any(v in val(j,p,n,'F3') for j in J for p in pids for n in range(1,6))]
def f3_agree(pids):  # 값마다 고름/안 고름 일치율(판정자 쌍 평균) → 값 평균. 전체 20에서 한 번이라도 쓰인 값만 평균에 넣는다
    per={}
    for v in F3V:
        per[v]=pair_mean({'pids':pids,'eq':lambda a,b,p,n,v=v:(v in val(a,p,n,'F3'))==(v in val(b,p,n,'F3'))})
    used=[v for v in F3V if v in f3_vals_used(sets['전체 20'])]
    return sum(per[v][0] for v in used)/len(used),per,used
def jaccard(pids):
    res=[]
    for a,b in pairs:
        s=[]
        for p in pids:
            for n in range(1,6):
                x,y=val(a,p,n,'F3'),val(b,p,n,'F3'); s.append(len(x&y)/len(x|y))
        res.append(sum(s)/len(s))
    return sum(res)/3
def valstats(f,pids):
    cnt=collections.defaultdict(lambda:[0,0,0,0]); total=0
    for p in pids:
        for n in range(1,6):
            total+=1; vals=[val(j,p,n,f) for j in J]
            for v in set().union(*vals):
                k=sum(v in s for s in vals); c=cnt[v]; c[0]+=1; c[1]+=k==3; c[2]+=k>=2; c[3]+=k
    return total,{v:dict(any=c[0],all3=c[1],ge2=c[2],share=c[3]/3/total) for v,c in cnt.items()}
R=[];W=R.append
W('# 시범 2회차 재집계 (표 v2, 새 판정 없음)\n')
W('- 측정만 적는다. 판정자 원문은 `pilot-r2/judges/`(표 v1로 받은 것) 그대로이고, 집계 방식만 표 v2로 바꿨다. 스크립트 `pilot-r2/aggregate-v2.py`. 대응표 `pilot-r2/KEY-r2.json`.')
W('- F3 = 판정자가 고른 F3과 F3b를 합친 값 묶음(1~2개). F4b = \'2\'와 \'3 이상\'을 \'2 이상\'으로 합침(값 1 / 2 이상). F6 = 집계에서 뺌.')
W('- **F3 평균 범위:** 값 6개(정의·주장 / 조건·범위·예외 / 이유·인과 / 비교·귀속 / 개별 사실 / 애매) 중 20문항 어디서든 한 번이라도 쓰인 값만 평균에 넣는다. 1회차(`pilot-r1/aggregate.py`)는 값 6개를 모두 평균에 넣었다.\n')
W('## 1. 칸별 일치율 (판정자 쌍 J1-J2 / J1-J3 / J2-J3 평균)\n')
W('| 칸 | 시범 11 | 대조 9 | 전체 20 | 쌍별(시범 11) | PLAN 2-2 판정(시범 11) | 2회차 v1 값(시범 11) | 1회차 v0 값 |\n|---|---|---|---|---|---|---|---|')
R1=json.load(open('docs/experiments/rule-audit-2026-11-23/pilot-r1/aggregate-out.json')); R2=json.load(open(P2+'aggregate-out.json'))
rate={}
r3={s:f3_agree(ps) for s,ps in sets.items()}
rate['F3']=r3['시범 11'][0]
W(f"| F3 (값 묶음, 값별 고름/안 고름 평균) | {fmt(r3['시범 11'][0])} | {fmt(r3['대조 9'][0])} | {fmt(r3['전체 20'][0])} | - | {verdict(rate['F3'])} | {fmt(R2['rates_pilot11']['F3'])} (주된 값 하나) | {fmt(R1['cell_rates']['F3'])} |")
W(f"| F3 자카드 평균(참고) | {fmt(jaccard(sets['시범 11']))} | {fmt(jaccard(sets['대조 9']))} | {fmt(jaccard(sets['전체 20']))} | - | (판정 안 함) | - | - |")
r4={s:agree_single('F4b',ps) for s,ps in sets.items()}; rate['F4b']=r4['시범 11'][0]
W(f"| F4b (1 / 2 이상) | {fmt(r4['시범 11'][0])} | {fmt(r4['대조 9'][0])} | {fmt(r4['전체 20'][0])} | "+' / '.join(fmt(x) for x in r4['시범 11'][1])+f" | {verdict(rate['F4b'])} | {fmt(R2['rates_pilot11']['F4b'])} (1 / 2 / 3 이상) | (새 칸) |")
W('\n- 같은 원문에서 v2 값 정의가 달라지지 않는 칸(F1·F2·F4·F5·F7)은 v1 보고(`REPORT-pilot-r2.md` 3절)와 같다: '+', '.join(f"{f} {R2['rates_pilot11'][f]:.3f}" for f in ['F1','F2','F4','F5','F7'])+' (시범 11).\n')
W('### F3 값별 고름/안 고름 일치율 (판정자 쌍 평균)\n'); W('| 값 | 시범 11 | 대조 9 | 전체 20 |\n|---|---|---|---|')
for v in F3V: W(f"| {v} | "+' | '.join(fmt(r3[s][1][v][0]) for s in sets)+' |')
W('')
W('## 2. 값별 일치 (시범 11 기준)\n')
W('- 한 명이라도 쓴 선지 중 셋 다 쓴 비율(셋 다), 둘 이상 쓴 비율(둘 이상). 점유 = 판정자 평균 사용 비율(F3은 한 선지가 값 2개면 둘 다 센다).\n')
rare=[]
for f in ['F3','F4b']:
    tot,st=valstats(f,sets['시범 11']); W(f'### {f} (선지 {tot})\n'); W('| 값 | 셋 다 | 둘 이상 | 점유 |\n|---|---|---|---|')
    for v,d in sorted(st.items(),key=lambda x:-x[1]['share']):
        W(f"| {v} | {d['all3']/d['any']:.2f} ({d['all3']}/{d['any']}) | {d['ge2']/d['any']:.2f} ({d['ge2']}/{d['any']}) | {d['share']:.2f} |")
        if d['share']<0.10 and d['all3']/d['any']<0.5: rare.append((f,v,d['all3'],d['any'],d['share']))
    W('')
W('### 드문 값(점유 10% 미만)이면서 셋 다 일치 0.5 미만 (시범 11, F3·F4b)\n')
if rare:
    W('| 칸 | 값 | 셋 다 / 한 명↑ | 점유 |\n|---|---|---|---|')
    for f,v,a,b,s in rare: W(f'| {f} | {v} | {a}/{b} | {s:.2f} |')
else: W('(없음)')
W('')
W('## 3. 판정 (시범 11 기준, PLAN 2-2)\n')
W('| 칸 | 시범 11 일치율 | 판정 |\n|---|---|---|')
W(f"| F3 | {fmt(rate['F3'])} | {verdict(rate['F3'])} |"); W(f"| F4b | {fmt(rate['F4b'])} | {verdict(rate['F4b'])} |")
W(f"\n- F3·F4b 둘 다 0.75 이상: {'예' if rate['F3']>=0.75 and rate['F4b']>=0.75 else '아니오'}. 0.75 미만 칸: {[f for f in ['F3','F4b'] if rate[f]<0.75] or '(없음)'}.\n")
# 대조 (5-1~5-9)
GR={'기출':[p for p in KEY if KEY[p]['source']=='기출'],
    '생성-비교(시범 생성 5 + 비교 3)':[p for p in KEY if KEY[p]['source']=='생성' and KEY[p]['group'] in('시범','비교')],
    '생성-문제':[p for p in KEY if KEY[p]['group']=='문제']}
W('## 4. 대조 (v1 보고 5절의 v2 값 판) — 선지별 다수값\n')
W('묶음: '+' / '.join(f'{g} {len(v)}문항' for g,v in GR.items())+'. 단일값 칸(F1·F2·F4·F5)은 판정자 둘 이상 같은 값, 없으면 \'갈림\'. F3·F4b는 v2 값이다. **F3**은 판정자 둘 이상이 값 묶음에 넣은 값마다 1씩 센다(한 선지가 값 둘이면 둘 다 1씩, 둘 이상 고른 값이 없으면 \'갈림\'이 1). 따라서 F3 표의 합계는 선지 수와 다를 수 있다(표 머리의 n은 선지 수, 퍼센트는 선지 수 대비). F4b는 1 / 2 이상 다수값.\n')
def maj(p,n,f):
    if f=='F3':
        vs=[v for v in F3V if sum(v in val(j,p,n,'F3') for j in J)>=2]; return vs or ['갈림']
    c=collections.Counter(next(iter(val(j,p,n,f))) for j in J).most_common(1)[0]; return [c[0] if c[1]>=2 else '갈림']
def dist(items,f,pred=None):
    c=collections.Counter(); tot=0
    for p in items:
        for n in range(1,6):
            if pred and not pred(p,n): continue
            tot+=1
            for v in maj(p,n,f): c[v]+=1
    return c,tot
def table(title,f,pred=None,order=None):
    W(f'### {title}\n'); res={g:dist(v,f,pred) for g,v in GR.items()}
    vals=sorted(set().union(*[set(c) for c,_ in res.values()]),key=lambda v:(order or []).index(v) if order and v in order else 99)
    W('| 값 | '+' | '.join(f'{g} (선지 n={res[g][1]})' for g in GR)+' |\n|---|'+'---|'*len(GR))
    for v in vals: W(f'| {v} | '+' | '.join(f"{res[g][0][v]} ({res[g][0][v]/res[g][1]:.0%})" if res[g][1] else '-' for g in GR)+' |')
    W('')
table('4-1. F2 값 분포(전체 선지)','F2')
jm=lambda p,n:maj(p,n,'F2')==['지문만']
table('4-2. F2=지문만 선지의 F3 값 분포','F3',jm,F3V)
table('4-3. F2=지문만 선지의 F4 분포','F4',jm)
table('4-4. F2=지문만 선지의 F4b 분포','F4b',jm)
fm=lambda p,n:maj(p,n,'F1')==['거짓']
table('4-5. 거짓 선지의 F3 값 분포','F3',fm,F3V)
table('4-6. 거짓 선지의 F4 분포','F4',fm)
table('4-7. 거짓 선지의 F5 분포','F5',fm)
W('### 4-8. 문항당 F2=지문만 선지 수(다수값 기준)\n'); W('| 묶음 | 문항 수 | 지문만 선지 합 | 문항당 평균 |\n|---|---|---|---|')
for g,v in GR.items():
    s=sum(1 for p in v for n in range(1,6) if jm(p,n)); W(f'| {g} | {len(v)} | {s} | {s/len(v):.2f} |')
W('\n### 4-9. F3에 정의·주장이 들어 있으면서 F4=내용 확인인 선지(다수값 기준)\n'); W('| 묶음 | 선지 수 | 문항당 평균 | 문항별(문항 키: 개수) |\n|---|---|---|---|')
for g,v in GR.items():
    per={p:sum(1 for n in range(1,6) if '정의·주장' in maj(p,n,'F3') and maj(p,n,'F4')==['내용 확인']) for p in v}
    W(f"| {g} | {sum(per.values())} | {sum(per.values())/len(v):.2f} | "+'; '.join(f"{KEY[p]['key']}: {c}" for p,c in per.items() if c)+' |')
W('')
open(P2+'REPORT-pilot-r2-v2.md','w').write('\n'.join(R)+'\n')
json.dump({'rates_pilot11':rate,'rates_all20':{'F3':r3['전체 20'][0],'F4b':r4['전체 20'][0]},'rates_contrast9':{'F3':r3['대조 9'][0],'F4b':r4['대조 9'][0]},'verdict':{f:verdict(v) for f,v in rate.items()},'rare_low_agree':rare},open(P2+'aggregate-v2-out.json','w'),ensure_ascii=False,indent=1)
print({f:round(v,3) for f,v in rate.items()}, rare)
